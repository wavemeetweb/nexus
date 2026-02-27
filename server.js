const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- DATA STORE (In-memory for "Real" feel during runtime) ---
const users = new Map(); // username -> { socketId, friends: [], requests: [] }

io.on('connection', (socket) => {
    
    // 1. REGISTER / LOGIN
    socket.on('nexus-auth', (username) => {
        if (!username) return;
        
        // If user doesn't exist in our memory, create them
        if (!users.has(username)) {
            users.set(username, { socketId: socket.id, friends: new Set(), requests: new Set() });
        } else {
            // Update socket ID for existing user
            const userData = users.get(username);
            userData.socketId = socket.id;
        }
        
        socket.username = username;
        
        // Send the user their specific data
        const data = users.get(username);
        socket.emit('auth-success', {
            friends: Array.from(data.friends),
            requests: Array.from(data.requests)
        });
    });

    // 2. SEARCH & ADD FRIEND
    socket.on('find-user', (targetName) => {
        if (users.has(targetName) && targetName !== socket.username) {
            socket.emit('user-found', { username: targetName });
        } else {
            socket.emit('user-not-found');
        }
    });

    socket.on('send-friend-request', (targetName) => {
        const target = users.get(targetName);
        if (target) {
            target.requests.add(socket.username);
            io.to(target.socketId).emit('incoming-request', { from: socket.username });
        }
    });

    // 3. ACCEPT REQUEST
    socket.on('accept-request', (fromUser) => {
        const me = users.get(socket.username);
        const friend = users.get(fromUser);

        if (me && friend) {
            me.requests.delete(fromUser);
            me.friends.add(fromUser);
            friend.friends.add(socket.username);

            // Notify both to update their UI
            socket.emit('friend-list-update', Array.from(me.friends));
            io.to(friend.socketId).emit('friend-list-update', Array.from(friend.friends));
        }
    });

    // 4. PRIVATE MESSAGING
    socket.on('send-msg', ({ to, text }) => {
        const target = users.get(to);
        if (target) {
            io.to(target.socketId).emit('receive-msg', { from: socket.username, text });
            socket.emit('msg-delivered', { to, text });
        }
    });

    socket.on('disconnect', () => {
        console.log(`${socket.username} disconnected`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Nexus Real-Time running on ${PORT}`));
