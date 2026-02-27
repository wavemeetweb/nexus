const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- EXTENDED DATA STORE ---
const users = new Map(); // username -> { socketId, friends: Set, requests: Set, blocked: Set }

io.on('connection', (socket) => {
    socket.on('nexus-auth', (username) => {
        if (!username) return;
        if (!users.has(username)) {
            users.set(username, { 
                socketId: socket.id, 
                friends: new Set(), 
                requests: new Set(),
                blocked: new Set() 
            });
        } else {
            users.get(username).socketId = socket.id;
        }
        socket.username = username;
        const data = users.get(username);
        socket.emit('auth-success', {
            friends: Array.from(data.friends),
            requests: Array.from(data.requests),
            blocked: Array.from(data.blocked)
        });
    });

    // --- BLOCKING LOGIC ---
    socket.on('block-user', (targetName) => {
        const me = users.get(socket.username);
        const target = users.get(targetName);

        if (me && target) {
            me.friends.delete(targetName);
            me.requests.delete(targetName);
            me.blocked.add(targetName);
            
            target.friends.delete(socket.username);

            socket.emit('auth-success', {
                friends: Array.from(me.friends),
                requests: Array.from(me.requests),
                blocked: Array.from(me.blocked)
            });
            io.to(target.socketId).emit('friend-list-update', Array.from(target.friends));
        }
    });

    socket.on('unblock-user', (targetName) => {
        const me = users.get(socket.username);
        if (me) {
            me.blocked.delete(targetName);
            socket.emit('auth-success', {
                friends: Array.from(me.friends),
                requests: Array.from(me.requests),
                blocked: Array.from(me.blocked)
            });
        }
    });

    // --- INTERCEPTED REQUESTS ---
    socket.on('send-friend-request', (targetName) => {
        const target = users.get(targetName);
        if (target) {
            // Check if requester is blocked by target
            if (target.blocked.has(socket.username)) {
                console.log(`${socket.username} is blocked by ${targetName}`);
                return; // Silently fail to prevent stalkers knowing they are blocked
            }
            target.requests.add(socket.username);
            io.to(target.socketId).emit('incoming-request', { from: socket.username });
        }
    });

    socket.on('find-user', (targetName) => {
        const me = users.get(socket.username);
        // Only show users who haven't blocked you
        if (users.has(targetName) && targetName !== socket.username) {
            const target = users.get(targetName);
            if (!target.blocked.has(socket.username)) {
                socket.emit('user-found', { username: targetName });
            }
        }
    });

    socket.on('accept-request', (fromUser) => {
        const me = users.get(socket.username);
        const friend = users.get(fromUser);
        if (me && friend) {
            me.requests.delete(fromUser);
            me.friends.add(fromUser);
            friend.friends.add(socket.username);
            socket.emit('friend-list-update', Array.from(me.friends));
            io.to(friend.socketId).emit('friend-list-update', Array.from(friend.friends));
        }
    });

    socket.on('send-msg', ({ to, text }) => {
        const target = users.get(to);
        if (target && !target.blocked.has(socket.username)) {
            io.to(target.socketId).emit('receive-msg', { from: socket.username, text });
            socket.emit('msg-delivered', { to, text });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Nexus System Online on ${PORT}`));
