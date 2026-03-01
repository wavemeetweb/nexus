const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" }, 
    maxHttpBufferSize: 1e8 // 100MB limit for high-quality documents/voice
});

const activeUsers = new Map(); 
const profiles = new Map();    

io.on('connection', (socket) => {
    socket.on('auth', (u) => {
        const user = u.toLowerCase().trim();
        activeUsers.set(user, socket.id);
        socket.username = user;
        // Default Profile
        if (!profiles.has(user)) {
            profiles.set(user, { display: u, bio: "Nexus Legend", fb: "", ig: "" });
        }
        socket.emit('ready', { profile: profiles.get(user) });
    });

    socket.on('update-profile', (data) => {
        profiles.set(socket.username, data);
        socket.emit('profile-updated', data);
    });

    socket.on('get-profile', (target) => {
        const p = profiles.get(target.toLowerCase());
        socket.emit('profile-data', { user: target, ...p });
    });

    socket.on('msg-send', (d) => {
        const msg = { ...d, from: socket.username, id: Date.now(), time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
        if (d.isGroup) io.to(d.to).emit('msg-recv', msg);
        else {
            const t = activeUsers.get(d.to.toLowerCase());
            if (t) io.to(t).emit('msg-recv', msg);
        }
    });

    // Signaling for Calls
    socket.on('call-request', (d) => {
        const t = activeUsers.get(d.to.toLowerCase());
        if (t) io.to(t).emit('call-made', { from: socket.username, type: d.type, offer: d.offer });
    });

    socket.on('disconnect', () => activeUsers.delete(socket.username));
});

server.listen(3000, () => console.log('Zenith Ultra Live: http://localhost:3000'));
