const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());

// --- FIX FOR 'Cannot GET /' ---
// This tells Express to serve your index.html and folder files
app.use(express.static(__dirname)); 

const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" }, 
    maxHttpBufferSize: 5e7 // 50MB limit for files/voice
});

const activeUsers = new Map(); // username -> socketId

io.on('connection', (socket) => {
    socket.on('nexus-auth', (username) => {
        const slug = username.toLowerCase().trim();
        activeUsers.set(slug, socket.id);
        socket.username = slug;
        socket.emit('auth-confirmed', slug);
        console.log(`${slug} is online`);
    });

    socket.on('msg-out', (p) => {
        const data = { 
            id: p.id || Date.now().toString(), 
            from: socket.username, 
            text: p.text, 
            audio: p.audio, 
            file: p.file,
            timestamp: Date.now()
        };

        const targetSocket = activeUsers.get(p.to.toLowerCase().trim());
        if (targetSocket) {
            io.to(targetSocket).emit('msg-in', data);
            socket.emit('msg-status', { id: data.id, status: 'delivered' });
        }
    });

    // WebRTC Signaling for Calls
    socket.on('call-init', (d) => {
        const t = activeUsers.get(d.to.toLowerCase().trim());
        if (t) io.to(t).emit('call-receive', { from: socket.username, type: d.type, offer: d.offer });
    });
    socket.on('call-reply', (d) => {
        const t = activeUsers.get(d.to.toLowerCase().trim());
        if (t) io.to(t).emit('call-ready', { answer: d.answer });
    });
    socket.on('ice-signal', (d) => {
        const t = activeUsers.get(d.to.toLowerCase().trim());
        if (t) io.to(t).emit('ice-signal', { candidate: d.candidate });
    });

    socket.on('disconnect', () => {
        if (socket.username) activeUsers.delete(socket.username);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Nexus Router live at http://localhost:${PORT}`));
