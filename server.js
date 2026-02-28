const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// State: username -> { socketId, displayName, friends, requests, blocked }
const users = new Map(); 
// State: groupId -> { name, members }
const groups = new Map();

io.on('connection', (socket) => {
    // --- AUTH ---
    socket.on('nexus-auth', (username) => {
        if (!username) return;
        const lowerName = username.toLowerCase().trim();
        if (!users.has(lowerName)) {
            users.set(lowerName, { socketId: socket.id, displayName: username, friends: new Set(), requests: new Set(), blocked: new Set() });
        } else {
            users.get(lowerName).socketId = socket.id;
        }
        socket.username = lowerName;
        const data = users.get(lowerName);
        socket.emit('auth-success', { 
            friends: Array.from(data.friends), 
            requests: Array.from(data.requests), 
            blocked: Array.from(data.blocked) 
        });
    });

    // --- SEARCH ---
    socket.on('find-user', (searchName) => {
        const target = searchName.toLowerCase().trim();
        const results = [];
        for (const [lowerName, userData] of users.entries()) {
            if (lowerName.includes(target) && lowerName !== socket.username) {
                results.push({ username: userData.displayName });
            }
        }
        socket.emit(results.length > 0 ? 'users-found' : 'users-not-found', results);
    });

    // --- MESSAGING ---
    socket.on('send-msg', ({ to, text }) => {
        const target = users.get(to.toLowerCase().trim());
        if (target) {
            io.to(target.socketId).emit('receive-msg', { from: users.get(socket.username).displayName, text });
            socket.emit('msg-delivered', { to, text });
        }
    });

    // --- GROUPS ---
    socket.on('create-group', (groupName) => {
        const gId = 'grp_' + Date.now();
        groups.set(gId, { name: groupName, members: new Set([socket.username]) });
        socket.join(gId);
        socket.emit('group-list-update', Array.from(groups).map(([id, g]) => ({ id, name: g.name })));
    });

    socket.on('send-group-msg', ({ groupId, text }) => {
        io.to(groupId).emit('receive-group-msg', { groupId, from: users.get(socket.username).displayName, text });
    });

    // --- CALLING (WebRTC Signaling) ---
    socket.on('call-offer', ({ to, offer }) => {
        const target = users.get(to.toLowerCase().trim());
        if (target) io.to(target.socketId).emit('call-offer', { from: users.get(socket.username).displayName, offer });
    });

    socket.on('call-answer', ({ to, answer }) => {
        const target = users.get(to.toLowerCase().trim());
        if (target) io.to(target.socketId).emit('call-answer', { answer });
    });

    socket.on('ice-candidate', ({ to, candidate }) => {
        const target = users.get(to.toLowerCase().trim());
        if (target) io.to(target.socketId).emit('ice-candidate', { candidate });
    });

    socket.on('disconnect', () => console.log("User Out"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Engine running on ${PORT}`));
