const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" },
    maxHttpBufferSize: 1e8 // 100MB for Documents/Voice
});

app.use(express.static(__dirname));

const activeUsers = new Map(); // username -> socketId

io.on('connection', (socket) => {
    socket.on('auth', (u) => {
        socket.username = u.toLowerCase().trim();
        activeUsers.set(socket.username, socket.id);
        socket.emit('ready');
    });

    // --- GROUPS & ROOMS ---
    socket.on('join-group', (gid) => socket.join(gid));

    socket.on('msg-send', (d) => {
        const msg = { ...d, from: socket.username, id: 'm_' + Date.now() };
        if (d.isGroup) {
            io.to(d.to).emit('msg-recv', msg);
        } else {
            const target = activeUsers.get(d.to.toLowerCase());
            if (target) io.to(target).emit('msg-recv', msg);
        }
    });

    // --- GLOBAL DELETE ---
    socket.on('delete-msg', (data) => {
        const target = data.isGroup ? data.to : activeUsers.get(data.to.toLowerCase());
        if (target) io.to(target).emit('msg-deleted-global', { msgId: data.msgId });
        socket.emit('msg-deleted-global', { msgId: data.msgId });
    });

    // --- WEBRTC SIGNALING (CALLS) ---
    socket.on('call-request', (data) => {
        const target = activeUsers.get(data.to.toLowerCase());
        if (target) io.to(target).emit('incoming-call', { from: socket.username, type: data.type, offer: data.offer });
    });

    socket.on('call-answer', (data) => {
        const target = activeUsers.get(data.to.toLowerCase());
        if (target) io.to(target).emit('call-accepted', { answer: data.answer });
    });

    socket.on('disconnect', () => activeUsers.delete(socket.username));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Zenith Live on ${PORT}`));
