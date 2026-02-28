/**
 * NEXUS CORE ENGINE v5.0 - THE ULTIMATE MATRIX
 * Features: Rich Profiles, Media Routing, Selective Groups, WebRTC, Multi-stage Relationships
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
    cors: { origin: "*" },
    maxHttpBufferSize: 2e7 // 20MB limit for media uploads (Photos/Videos/Audio)
});

// MEMORY DATA STORES
const users = new Map(); // slug -> { displayName, bio, socials, friends, pending, blocked, socketId }
const groups = new Map(); // gId -> { name, members: Set, owner }

const syncClientUI = (username) => {
    const slug = username.toLowerCase().trim();
    const user = users.get(slug);
    if (!user || !user.socketId) return;

    const userGroups = Array.from(groups).filter(([id, g]) => g.members.has(slug))
        .map(([id, g]) => ({ id, name: g.name }));

    io.to(user.socketId).emit('ui-state-update', {
        profile: { name: user.displayName, bio: user.bio, socials: user.socials },
        friends: Array.from(user.friends),
        pending: Array.from(user.pending),
        blocked: Array.from(user.blocked),
        groups: userGroups
    });
};

io.on('connection', (socket) => {
    console.log(`[SYS] Connection established: ${socket.id}`);

    // --- 1. AUTH & PROFILE INITIALIZATION ---
    socket.on('nexus-auth', (username) => {
        if (!username) return;
        const slug = username.toLowerCase().trim();
        
        if (!users.has(slug)) {
            users.set(slug, {
                socketId: socket.id,
                displayName: username,
                bio: "New to Nexus.",
                socials: { x: "", yt: "", ig: "" },
                friends: new Set(), pending: new Set(), blocked: new Set()
            });
        } else {
            users.get(slug).socketId = socket.id;
        }
        
        socket.username = slug;
        syncClientUI(slug);
    });

    // --- 2. PROFILE MANAGEMENT ---
    socket.on('profile-update', (data) => {
        const user = users.get(socket.username);
        if (user) {
            user.displayName = data.name || user.displayName;
            user.bio = data.bio || user.bio;
            user.socials = data.socials || user.socials;
            syncClientUI(socket.username);
        }
    });

    socket.on('profile-fetch', (targetName) => {
        const target = users.get(targetName.toLowerCase().trim());
        if (target) {
            socket.emit('profile-data-receive', {
                name: target.displayName, bio: target.bio, socials: target.socials
            });
        }
    });

    // --- 3. FRIEND SYSTEM & RELATIONSHIPS ---
    socket.on('friend-request-send', (targetName) => {
        const targetSlug = targetName.toLowerCase().trim();
        const targetData = users.get(targetSlug);
        if (!targetData) return socket.emit('notification', 'User not found.');
        if (targetSlug === socket.username) return;
        if (targetData.blocked.has(socket.username)) return;

        targetData.pending.add(users.get(socket.username).displayName);
        syncClientUI(targetSlug);
    });

    socket.on('friend-request-accept', (requesterName) => {
        const me = users.get(socket.username);
        const peerSlug = requesterName.toLowerCase().trim();
        const peer = users.get(peerSlug);

        if (me && peer) {
            me.pending.delete(requesterName);
            me.friends.add(peer.displayName);
            peer.friends.add(me.displayName);
            syncClientUI(socket.username);
            syncClientUI(peerSlug);
        }
    });

    socket.on('user-block', (name) => {
        const me = users.get(socket.username);
        const peerSlug = name.toLowerCase().trim();
        if (me) {
            me.friends.delete(name);
            me.blocked.add(name);
            syncClientUI(socket.username);
            const peer = users.get(peerSlug);
            if (peer) {
                peer.friends.delete(me.displayName);
                syncClientUI(peerSlug);
            }
        }
    });

    // --- 4. SELECTIVE GROUP CREATION ---
    socket.on('group-create', ({ name, members }) => {
        const gId = 'grp_' + Date.now();
        const memberSet = new Set([socket.username]);
        
        // Add invited friends
        members.forEach(m => memberSet.add(m.toLowerCase().trim()));
        groups.set(gId, { name, members: memberSet, owner: socket.username });
        
        // Force socket join for routing
        memberSet.forEach(mSlug => {
            const memberData = users.get(mSlug);
            if (memberData && memberData.socketId) {
                io.to(memberData.socketId).socketsJoin(gId);
                syncClientUI(mSlug);
            }
        });
    });

    // --- 5. MULTIMEDIA MESSAGING ---
    socket.on('message-outgoing', (payload) => {
        const sender = users.get(socket.username);
        const data = {
            from: sender.displayName,
            text: payload.text,
            file: payload.file, // Contains {name, type, data: base64}
            type: payload.type
        };

        if (payload.type === 'group') {
            io.to(payload.to).emit('message-incoming', { ...data, channel: payload.to });
        } else {
            const target = users.get(payload.to.toLowerCase().trim());
            if (target && !target.blocked.has(socket.username)) {
                io.to(target.socketId).emit('message-incoming', data);
            }
        }
    });

    // --- 6. WEBRTC SIGNALING ---
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

    socket.on('disconnect', () => console.log(`[SYS] User disconnected: ${socket.id}`));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Nexus V5 running on Port ${PORT}`));
