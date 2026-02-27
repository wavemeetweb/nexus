const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// username -> { socketId, displayName, friends: Set, requests: Set, blocked: Set }
const users = new Map(); 

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
            const userData = users.get(lowerName);
            userData.socketId = socket.id;
            userData.displayName = username;
        }
        
        socket.username = lowerName;
        const data = users.get(lowerName);
        
        socket.emit('auth-success', {
            friends: Array.from(data.friends),
            requests: Array.from(data.requests),
            blocked: Array.from(data.blocked)
        });
        console.log(`✅ ${username} connected.`);
    });

    // --- SEARCH LISTENER ---
    socket.on('find-user', (searchName) => {
        const target = searchName.toLowerCase().trim();
        if (!target) return;

        const results = [];
        for (const [lowerName, userData] of users.entries()) {
            if (lowerName.includes(target) && lowerName !== socket.username) {
                if (!userData.blocked.has(socket.username)) {
                    results.push({ username: userData.displayName });
                }
            }
        }
        
        // --- THIS MUST MATCH INDEX.HTML ---
        if (results.length > 0) {
            socket.emit('users-found', results);
        } else {
            socket.emit('users-not-found');
        }
    });

    socket.on('send-friend-request', (targetName) => {
        const lowerTarget = targetName.toLowerCase().trim();
        const targetData = users.get(lowerTarget);
        const senderData = users.get(socket.username);

        if (targetData && senderData && !targetData.blocked.has(socket.username)) {
            targetData.requests.add(senderData.displayName);
            io.to(targetData.socketId).emit('incoming-request', { from: senderData.displayName });
        }
    });

    // ... (rest of the functions: accept-request, send-msg, block, unblock)
    socket.on('accept-request', (fromUser) => {
        const meData = users.get(socket.username);
        const friendData = users.get(fromUser.toLowerCase().trim());
        if (meData && friendData) {
            meData.requests.delete(fromUser);
            meData.friends.add(fromUser);
            friendData.friends.add(meData.displayName);
            socket.emit('auth-success', {friends: Array.from(meData.friends), requests: Array.from(meData.requests), blocked: Array.from(meData.blocked)});
            io.to(friendData.socketId).emit('friend-list-update', Array.from(friendData.friends));
        }
    });

    socket.on('send-msg', ({ to, text }) => {
        const targetData = users.get(to.toLowerCase().trim());
        const senderData = users.get(socket.username);
        if (targetData && senderData && !targetData.blocked.has(socket.username)) {
            io.to(targetData.socketId).emit('receive-msg', { from: senderData.displayName, text: text });
            socket.emit('msg-delivered', { to: to, text: text });
        }
    });
    
    socket.on('block-user', (targetName) => {
        const me = users.get(socket.username);
        const target = users.get(targetName.toLowerCase().trim());
        if (me && target) {
            me.friends.delete(targetName);
            me.requests.delete(targetName);
            me.blocked.add(targetName);
            target.friends.delete(me.displayName);
            socket.emit('auth-success', {friends: Array.from(me.friends), requests: Array.from(me.requests), blocked: Array.from(me.blocked)});
            io.to(target.socketId).emit('friend-list-update', Array.from(target.friends));
        }
    });

    socket.on('unblock-user', (targetName) => {
        const me = users.get(socket.username);
        if (me) {
            me.blocked.delete(targetName);
            socket.emit('auth-success', {friends: Array.from(me.friends), requests: Array.from(me.requests), blocked: Array.from(me.blocked)});
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Nexus Engine Running on ${PORT}`));
