const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);

// Allow large files up to 50MB to pass through the router
const io = new Server(server, { cors: { origin: "*" }, maxHttpBufferSize: 5e7 });

// Map to keep track of who is currently online
const activeUsers = new Map(); // username -> socket.id

io.on('connection', (socket) => {
    
    // User comes online
    socket.on('nexus-auth', (username) => {
        const slug = username.toLowerCase().trim();
        activeUsers.set(slug, socket.id);
        socket.username = slug;
        socket.emit('auth-success', slug);
    });

    // Route Direct Messages and Group Messages
    socket.on('msg-out', (p) => {
        const data = { 
            id: p.id || Date.now().toString(), 
            from: socket.username, 
            text: p.text, 
            audio: p.audio, 
            file: p.file,
            timestamp: Date.now()
        };

        if (p.type === 'group') {
            // In a real app, the server would track group members. 
            // For this local version, we broadcast to the room.
            socket.to(p.to).emit('msg-in', { ...data, channel: p.to });
        } else {
            const targetSocket = activeUsers.get(p.to.toLowerCase().trim());
            if (targetSocket) {
                io.to(targetSocket).emit('msg-in', data);
                socket.emit('msg-status', { id: data.id, status: 'delivered' });
            }
        }
    });

    // Group Management (Join Socket Rooms)
    socket.on('join-group', (groupId) => {
        socket.join(groupId);
    });

    // WebRTC Calling (Pass-through signaling)
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
server.listen(PORT, () => console.log(`Zenith Router running on port ${PORT}`));
