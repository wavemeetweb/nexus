const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, maxHttpBufferSize: 5e7 });

// In-memory state (resets on server restart - use a file-store for 2026 production)
const activeUsers = new Map(); // username -> socketId
const profiles = new Map();    // username -> {display, bio, social}
const groups = new Map();      // groupId -> {name, admin, members: Set}

io.on('connection', (socket) => {
    socket.on('nexus-auth', (username) => {
        const slug = username.toLowerCase().trim();
        activeUsers.set(slug, socket.id);
        socket.username = slug;
        if (!profiles.has(slug)) profiles.set(slug, { display: username, bio: "Nexus User", social: {} });
        socket.emit('auth-confirmed', { user: slug, profile: profiles.get(slug) });
    });

    // Profile & Friends
    socket.on('update-profile', (data) => profiles.set(socket.username, data));
    socket.on('get-profile', (target) => socket.emit('profile-data', { user: target, ...profiles.get(target) }));
    
    socket.on('friend-req-send', (to) => {
        const tSid = activeUsers.get(to.toLowerCase());
        if (tSid) io.to(tSid).emit('friend-req-recv', { from: socket.username });
    });

    socket.on('friend-req-accept', (from) => {
        const tSid = activeUsers.get(from.toLowerCase());
        if (tSid) io.to(tSid).emit('friend-req-confirmed', { user: socket.username });
    });

    // Groups
    socket.on('group-create', (data) => {
        const id = 'grp_' + Date.now();
        groups.set(id, { name: data.name, admin: socket.username, members: new Set([socket.username]) });
        socket.join(id);
        socket.emit('group-init', { id, name: data.name, admin: socket.username });
    });

    socket.on('group-msg', (p) => {
        const grp = groups.get(p.groupId);
        if (grp?.members.has(socket.username)) {
            io.to(p.groupId).emit('msg-in', { ...p, from: socket.username, type: 'group' });
        }
    });

    socket.on('group-manage', (p) => {
        const grp = groups.get(p.groupId);
        if (grp?.admin !== socket.username) return;
        if (p.action === 'add') {
            grp.members.add(p.target);
            const tSid = activeUsers.get(p.target);
            if (tSid) {
                io.sockets.sockets.get(tSid).join(p.groupId);
                io.to(tSid).emit('group-init', { id: p.groupId, name: grp.name, admin: grp.admin });
            }
        } else if (p.action === 'delete') {
            io.to(p.groupId).emit('group-deleted', p.groupId);
            groups.delete(p.groupId);
        }
    });

    // Message Deletion
    socket.on('msg-delete', (p) => {
        const { msgId, targetId, isGroup } = p;
        const isAdmin = isGroup && groups.get(targetId)?.admin === socket.username;
        const deleteData = { msgId, targetId, by: socket.username };

        if (isGroup) {
            io.to(targetId).emit('msg-deleted', deleteData);
        } else {
            const tSid = activeUsers.get(targetId.toLowerCase());
            if (tSid) io.to(tSid).emit('msg-deleted', deleteData);
            socket.emit('msg-deleted', deleteData);
        }
    });

    socket.on('disconnect', () => activeUsers.delete(socket.username));
});

server.listen(3000, () => console.log('Nexus Ultra running on http://localhost:3000'));
