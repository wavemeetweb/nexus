/**
 * NEXUS CORE ENGINE v4.0 - PRO
 * Handles: Persistent Groups, Multi-stage Relationships, and WebRTC
 */
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// MEMORY STORE (In production, replace with MongoDB/Redis)
const users = new Map(); // key: lowercase_name -> { displayName, socketId, friends, pending, blocked }
const groups = new Map(); // key: groupId -> { name, members: Set }

// --- CORE UTILITIES ---
const getInternalData = (username) => users.get(username.toLowerCase().trim());

const syncClientUI = (username) => {
    const user = getInternalData(username);
    if (!user || !user.socketId) return;

    // Filter groups where user is a member
    const userGroups = Array.from(groups).filter(([id, g]) => g.members.has(username.toLowerCase()))
        .map(([id, g]) => ({ id, name: g.name }));

    io.to(user.socketId).emit('ui-state-update', {
        friends: Array.from(user.friends),
        pending: Array.from(user.pending),
        blocked: Array.from(user.blocked),
        groups: userGroups
    });
};

io.on('connection', (socket) => {
    console.log(`Socket Connected: ${socket.id}`);

    // --- 1. AUTHENTICATION & IDENTITY ---
    socket.on('nexus-auth', (username) => {
        if (!username) return;
        const slug = username.toLowerCase().trim();
        
        if (!users.has(slug)) {
            users.set(slug, {
                socketId: socket.id,
                displayName: username,
                friends: new Set(),
                pending: new Set(),
                blocked: new Set()
            });
        } else {
            users.get(slug).socketId = socket.id;
        }
        
        socket.username = slug;
        syncClientUI(slug);
    });

    // --- 2. FRIEND REQUEST SYSTEM ---
    socket.on('friend-request-send', (targetName) => {
        const targetSlug = targetName.toLowerCase().trim();
        const targetData = users.get(targetSlug);
        
        if (!targetData) return socket.emit('error-msg', "User not found.");
        if (targetSlug === socket.username) return socket.emit('error-msg', "Can't add yourself.");
        if (targetData.blocked.has(socket.username)) return socket.emit('error-msg', "User unavailable.");

        // Add to target's pending list
        targetData.pending.add(users.get(socket.username).displayName);
        syncClientUI(targetSlug);
        socket.emit('success-msg', `Request sent to ${targetName}`);
    });

    socket.on('friend-request-accept', (requesterName) => {
        const me = users.get(socket.username);
        const peerSlug = requesterName.toLowerCase().trim();
        const peer = users.get(peerSlug);

        if (me && peer) {
            me.pending.delete(requesterName); // Use the Display Name stored in set
            me.friends.add(peer.displayName);
            peer.friends.add(me.displayName);
            
            syncClientUI(socket.username);
            syncClientUI(peerSlug);
        }
    });

    // --- 3. GROUP MANAGEMENT ---
    socket.on('group-create', (groupName) => {
        const gId = 'group_' + Math.random().toString(36).substr(2, 9);
        groups.set(gId, {
            name: groupName,
            members: new Set([socket.username])
        });
        socket.join(gId);
        syncClientUI(socket.username);
    });

    // --- 4. BLOCKING & RESTRICTION ---
    socket.on('user-block', (name) => {
        const me = users.get(socket.username);
        const targetSlug = name.toLowerCase().trim();
        if (me) {
            me.friends.delete(name);
            me.blocked.add(name);
            syncClientUI(socket.username);
            
            // Remove me from their friends too
            const peer = users.get(targetSlug);
            if (peer) {
                peer.friends.delete(me.displayName);
                syncClientUI(targetSlug);
            }
        }
    });

    // --- 5. UNIFIED MESSAGING ---
    socket.on('message-outgoing', ({ to, text, type }) => {
        const senderDisplay = users.get(socket.username).displayName;
        
        if (type === 'group') {
            io.to(to).emit('message-incoming', { from: senderDisplay, text, channel: to, type: 'group' });
        } else {
            const target = users.get(to.toLowerCase().trim());
            if (target && !target.blocked.has(socket.username)) {
                io.to(target.socketId).emit('message-incoming', { from: senderDisplay, text, type: 'dm' });
            }
        }
    });

    // --- 6. CALL SIGNALING ---
    socket.on('signal-offer', (data) => {
        const t = users.get(data.to.toLowerCase().trim());
        if (t) io.to(t.socketId).emit('signal-offer', { from: users.get(socket.username).displayName, offer: data.offer });
    });

    socket.on('signal-answer', (data) => {
        const t = users.get(data.to.toLowerCase().trim());
        if (t) io.to(t.socketId).emit('signal-answer', { answer: data.answer });
    });

    socket.on('signal-ice', (data) => {
        const t = users.get(data.to.toLowerCase().trim());
        if (t) io.to(t.socketId).emit('signal-ice', { candidate: data.candidate });
    });

    socket.on('disconnect', () => {
        console.log(`User ${socket.username} disconnected.`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`[CORE] Listening on Port ${PORT}`));
