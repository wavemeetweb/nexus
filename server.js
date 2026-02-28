const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// State Management
const users = new Map(); // username -> {socketId, displayName, friends, requests, blocked}
const groups = new Map(); // groupId -> {name, members: Set}

io.on('connection', (socket) => {
    socket.on('nexus-auth', (username) => {
        if (!username) return;
        const lowerName = username.toLowerCase().trim();
        
        if (!users.has(lowerName)) {
            users.set(lowerName, { 
                socketId: socket.id, 
                displayName: username,
                friends: new Set(), 
                requests: new Set(),
                blocked: new Set() 
            });
        } else {
            users.get(lowerName).socketId = socket.id;
            users.get(lowerName).displayName = username;
        }
        socket.username = lowerName;
        const data = users.get(lowerName);
        
        socket.emit('auth-success', {
            friends: Array.from(data.friends),
            requests: Array.from(data.requests),
            blocked: Array.from(data.blocked),
            groups: [] // Add group management here later
        });
    });

    // --- WEBRTC SIGNALING (For Voice/Video) ---
    socket.on('voice-video-offer', ({ to, offer }) => {
        const target = users.get(to.toLowerCase().trim());
        if (target) {
            io.to(target.socketId).emit('voice-video-offer', { from: socket.username, offer });
        }
    });

    socket.on('voice-video-answer', ({ to, answer }) => {
        const target = users.get(to.toLowerCase().trim());
        if (target) {
            io.to(target.socketId).emit('voice-video-answer', { from: socket.username, answer });
        }
    });

    socket.on('ice-candidate', ({ to, candidate }) => {
        const target = users.get(to.toLowerCase().trim());
        if (target) {
            io.to(target.socketId).emit('ice-candidate', { from: socket.username, candidate });
        }
    });

    // --- GROUP MESSAGING ---
    socket.on('create-group', (groupName) => {
        const groupId = 'group_' + Date.now();
        groups.set(groupId, { name: groupName, members: new Set([socket.username]) });
        socket.join(groupId);
        socket.emit('group-created', { groupId, name: groupName });
    });

    socket.on('send-group-msg', ({ groupId, text }) => {
        io.to(groupId).emit('receive-group-msg', { 
            groupId, 
            from: socket.username, 
            text 
        });
    });

    // ... (keep previous auth, block, find-user logic)
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Nexus Engine Running on ${PORT}`));
