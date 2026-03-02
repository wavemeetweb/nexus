const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, maxHttpBufferSize: 1e8 });

const activeUsers = new Map(); // username -> socketId
const groups = new Map();      // gid -> { name, admin, members: Set }

io.on('connection', (socket) => {
    socket.on('auth', (u) => {
        const user = u.toLowerCase().trim();
        activeUsers.set(user, socket.id);
        socket.username = user;
        socket.emit('ready');
    });

    // --- REAL GROUP LOGIC ---
    socket.on('create-group', (data) => {
        const gid = 'gid_' + Date.now();
        groups.set(gid, { name: data.name, admin: socket.username, members: new Set([socket.username]) });
        socket.join(gid);
        socket.emit('group-created', { gid, name: data.name, admin: socket.username });
    });

    socket.on('add-to-group', (data) => {
        const g = groups.get(data.gid);
        if (g && g.admin === socket.username) {
            g.members.add(data.target.toLowerCase());
            const targetSid = activeUsers.get(data.target.toLowerCase());
            if (targetSid) {
                io.sockets.sockets.get(targetSid).join(data.gid);
                io.to(targetSid).emit('added-to-group', { gid: data.gid, name: g.name, admin: g.admin });
            }
            io.to(data.gid).emit('group-sync', { gid: data.gid, members: Array.from(g.members) });
        }
    });

    // --- REAL DELETE LOGIC ---
    socket.on('delete-msg', (data) => {
        // data: { msgId, to, isGroup }
        if (data.isGroup) {
            io.to(data.to).emit('msg-deleted-global', { msgId: data.msgId });
        } else {
            const targetSid = activeUsers.get(data.to.toLowerCase());
            if (targetSid) io.to(targetSid).emit('msg-deleted-global', { msgId: data.msgId });
            socket.emit('msg-deleted-global', { msgId: data.msgId });
        }
    });

    socket.on('msg-send', (d) => {
        const msg = { ...d, from: socket.username, id: 'm_' + Date.now() };
        if (d.isGroup) io.to(d.to).emit('msg-recv', msg);
        else {
            const t = activeUsers.get(d.to.toLowerCase());
            if (t) io.to(t).emit('msg-recv', msg);
        }
    });

    socket.on('disconnect', () => activeUsers.delete(socket.username));
});

server.listen(3000, () => console.log('Zenith Real-Sync Active'));
