const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const users = new Map(); 

io.on('connection', (socket) => {
    socket.on('nexus-auth', (username) => {
        if (!username) return;
        const lowerName = username.toLowerCase().trim(); // Make it robust
        
        if (!users.has(lowerName)) {
            users.set(lowerName, { 
                socketId: socket.id, 
                displayName: username, // Keep original casing for display
                friends: new Set(), 
                requests: new Set(),
                blocked: new Set() 
            });
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
        console.log(`✅ ${username} is active.`);
    });

    socket.on('find-user', (searchName) => {
        const target = searchName.toLowerCase().trim();
        if (users.has(target) && target !== socket.username) {
            const userData = users.get(target);
            // Check if blocked
            if (!userData.blocked.has(socket.username)) {
                socket.emit('user-found', { username: userData.displayName });
            }
        } else {
            socket.emit('user-not-found');
        }
    });

    socket.on('send-friend-request', (targetName) => {
        const target = targetName.toLowerCase().trim();
        const targetData = users.get(target);
        if (targetData && !targetData.blocked.has(socket.username)) {
            targetData.requests.add(socket.username);
            io.to(targetData.socketId).emit('incoming-request', { from: socket.username });
        }
    });

    // ... (keep the rest of the previous logic for messages/accept/block)
    socket.on('accept-request', (fromUser) => {
        const me = users.get(socket.username);
        const friend = users.get(fromUser.toLowerCase());
        if (me && friend) {
            me.requests.delete(fromUser.toLowerCase());
            me.friends.add(fromUser.toLowerCase());
            friend.friends.add(socket.username);
            socket.emit('friend-list-update', Array.from(me.friends));
            io.to(friend.socketId).emit('friend-list-update', Array.from(friend.friends));
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Nexus Engine v2 Running on ${PORT}`));
