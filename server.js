/**
 * NEXUS CORE ENGINE - Professional v3.0
 * Handles: WebRTC Signaling, Group State, and Relationship Logic
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
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingTimeout: 60000 
});

// GLOBAL STATE
const users = new Map(); // username -> { socketId, displayName, friends, pending, blocked }
const groups = new Map(); // groupId -> { name, members: Set, owner }

// HELPER: Broadcast Relationship Update
const syncUser = (username) => {
    const data = users.get(username.toLowerCase());
    if (data && data.socketId) {
        io.to(data.socketId).emit('sync-state', {
            friends: Array.from(data.friends),
            pending: Array.from(data.pending),
            blocked: Array.from(data.blocked),
            groups: getGroupsForUser(username)
        });
    }
};

const getGroupsForUser = (username) => {
    return Array.from(groups).filter(([id, g]) => g.members.has(username.toLowerCase()))
        .map(([id, g]) => ({ id, name: g.name }));
};

io.on('connection', (socket) => {
    console.log(`Connection established: ${socket.id}`);

    // --- AUTHENTICATION & INITIALIZATION ---
    socket.on('nexus-auth', (username) => {
        if (!username) return;
        const normalized = username.toLowerCase().trim();
        
        if (!users.has(normalized)) {
            users.set(normalized, { 
                socketId: socket.id, 
                displayName: username,
                friends: new Set(), 
                pending: new Set(),
                blocked: new Set() 
            });
        } else {
            users.get(normalized).socketId = socket.id;
        }
        
        socket.username = normalized;
        syncUser(normalized);
    });

    // --- SOCIAL & RELATIONSHIP SYSTEM ---
    socket.on('send-friend-request', (targetName) => {
        const target = targetName.toLowerCase().trim();
        const targetData = users.get(target);
        
        if (targetData && target !== socket.username && !targetData.blocked.has(socket.username)) {
            targetData.pending.add(socket.username);
            syncUser(target);
            socket.emit('notification', { type: 'success', text: `Request sent to ${targetName}` });
        } else {
            socket.emit('notification', { type: 'error', text: 'User not found or unavailable' });
        }
    });

    socket.on('accept-friend', (friend) => {
        const user = users.get(socket.username);
        const peer = users.get(friend.toLowerCase());
        if (user && peer) {
            user.pending.delete(friend.toLowerCase());
            user.friends.add(friend.toLowerCase());
            peer.friends.add(socket.username);
            syncUser(socket.username);
            syncUser(friend);
        }
    });

    socket.on('block-user', (target) => {
        const user = users.get(socket.username);
        if (user) {
            user.blocked.add(target.toLowerCase());
            user.friends.delete(target.toLowerCase());
            syncUser(socket.username);
        }
    });

    // --- GROUP SYSTEM ---
    socket.on('create-group', (groupName) => {
        const id = 'grp_' + Date.now();
        groups.set(id, { name: groupName, members: new Set([socket.username]), owner: socket.username });
        socket.join(id);
        syncUser(socket.username);
    });

    socket.on('join-group', (groupId) => {
        if (groups.has(groupId)) {
            groups.get(groupId).members.add(socket.username);
            socket.join(groupId);
            syncUser(socket.username);
        }
    });

    // --- MESSAGING (Private & Group) ---
    socket.on('send-msg', ({ to, text, isGroupMsg }) => {
        const fromName = users.get(socket.username).displayName;
        if (isGroupMsg) {
            io.to(to).emit('receive-msg', { from: fromName, text, groupId: to });
        } else {
            const target = users.get(to.toLowerCase());
            if (target && !target.blocked.has(socket.username)) {
                io.to(target.socketId).emit('receive-msg', { from: fromName, text });
            }
        }
    });

    // --- WEBRTC SIGNALING ENGINE ---
    socket.on('signal-offer', ({ to, offer }) => {
        const target = users.get(to.toLowerCase());
        if (target) io.to(target.socketId).emit('signal-offer', { from: socket.username, offer });
    });

    socket.on('signal-answer', ({ to, answer }) => {
        const target = users.get(to.toLowerCase());
        if (target) io.to(target.socketId).emit('signal-answer', { answer });
    });

    socket.on('signal-ice', ({ to, candidate }) => {
        const target = users.get(to.toLowerCase());
        if (target) io.to(target.socketId).emit('signal-ice', { candidate });
    });

    socket.on('disconnect', () => {
        console.log(`User ${socket.username} offline`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`[SYSTEM] Nexus Server running on Port ${PORT}`));
