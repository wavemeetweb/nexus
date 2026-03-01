const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, maxHttpBufferSize: 5e7 });

// State (Volatile - clears on server restart. For 2026 production, use a simple Redis/JSON file)
const activeUsers = new Map(); // username -> socketId
const profiles = new Map();    // username -> {bio, social: {ig, x, github}}
const groups = new Map();      // groupId -> {name, admin, members: Set}

io.on('connection', (socket) => {
    socket.on('nexus-auth', (username) => {
        const slug = username.toLowerCase().trim();
        activeUsers.set(slug, socket.id);
        socket.username = slug;
        if (!profiles.has(slug)) profiles.set(slug, { bio: "New to Nexus", display: username, social: {} });
        socket.emit('auth-confirmed', { user: slug, profile: profiles.get(slug) });
    });

    // --- Profile & Friends ---
    socket.on('update-profile', (data) => profiles.set(socket.username, data));
    socket.on('get-profile', (target) => socket.emit('profile-data', { user: target, ...profiles.get(target) }));

    socket.on('friend-req-send', (to) => {
        const targetSid = activeUsers.get(to.toLowerCase());
        if (targetSid) io.to(targetSid).emit('friend-req-recv', { from: socket.username });
    });

    socket.on('friend-req-accept', (from) => {
        const targetSid = activeUsers.get(from.toLowerCase());
        if (targetSid) io.to(targetSid).emit('friend-req-confirmed', { user: socket.username });
    });

    // --- Groups ---
    socket.on('group-create', (data) => {
        const id = 'grp_' + Date.now();
        groups.set(id, { name: data.name, admin: socket.username, members: new Set([socket.username]) });
        socket.join(id);
        socket.emit('group-init', { id, name: data.name, admin: socket.username });
    });

    socket.on('group-msg', (p) => {
        const grp = groups.get(p.groupId);
        if (grp && grp.members.has(socket.username)) {
            io.to(p.groupId).emit('msg-in', { ...p, from: socket.username, type: 'group' });
        }
    });

    socket.on('group-manage', (p) => {
        const grp = groups.get(p.groupId);
        if (grp?.admin !== socket.username) return; // Only admin

        if (p.action === 'add') {
            grp.members.add(p.target);
            const tSid = activeUsers.get(p.target);
            if (tSid) {
                io.sockets.sockets.get(tSid).join(p.groupId);
                io.to(tSid).emit('group-init', { id: p.groupId, name: grp.name, admin: grp.admin });
            }
        } else if (p.action === 'remove') {
            grp.members.delete(p.target);
            const tSid = activeUsers.get(p.target);
            if (tSid) io.sockets.sockets.get(tSid).leave(p.groupId);
        } else if (p.action === 'delete') {
            io.to(p.groupId).emit('group-deleted', p.groupId);
            groups.delete(p.groupId);
        }
    });

    socket.on('disconnect', () => activeUsers.delete(socket.username));
});

server.listen(3000, () => console.log('Nexus Ultra live at http://localhost:3000'));
