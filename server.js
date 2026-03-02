const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" }, 
    maxHttpBufferSize: 1e8 
});

app.use(express.static(__dirname));

const activeUsers = new Map();

io.on('connection', (socket) => {
    socket.on('auth', (u) => {
        socket.username = u.toLowerCase().trim();
        activeUsers.set(socket.username, socket.id);
        console.log(`${socket.username} is live.`);
    });

    socket.on('msg-send', (d) => {
        const msg = { ...d, from: socket.username, id: 'm_' + Date.now() };
        if (d.isGroup) {
            io.to(d.to).emit('msg-recv', msg);
        } else {
            const target = activeUsers.get(d.to.toLowerCase());
            if (target) io.to(target).emit('msg-recv', msg);
        }
    });

    // --- CALL SIGNALING ---
    socket.on('call-request', (data) => {
        const target = activeUsers.get(data.to.toLowerCase());
        if (target) io.to(target).emit('incoming-call', { from: socket.username, type: data.type, offer: data.offer });
    });

    socket.on('call-answer', (data) => {
        const target = activeUsers.get(data.to.toLowerCase());
        if (target) io.to(target).emit('call-accepted', { answer: data.answer });
    });

    // --- REAL END CALL LOGIC ---
    socket.on('end-call-signal', (data) => {
        const target = activeUsers.get(data.to.toLowerCase());
        if (target) io.to(target).emit('call-ended-by-peer');
    });

    socket.on('disconnect', () => activeUsers.delete(socket.username));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Zenith Server: Port ${PORT}`));
