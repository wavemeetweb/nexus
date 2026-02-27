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
            // Update socket ID for reconnection
            users.get(lowerName).socketId = socket.id;
            users.get(lowerName).displayName = username; // Update display name
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

    // --- SECURE MESSAGE ROUTING ---
    socket.on('send-msg', ({ to, text }) => {
        const lowerTo = to.toLowerCase().trim();
        const targetData = users.get(lowerTo);
        const senderData = users.get(socket.username);

        if (targetData && senderData) {
            // 1. Check if recipient blocked sender
            if (targetData.blocked.has(socket.username)) {
                console.log(`🚫 Message blocked: ${socket.username} -> ${to}`);
                return;
            }

            // 2. Send to recipient
            io.to(targetData.socketId).emit('receive-msg', { 
                from: senderData.displayName, 
                text: text 
            });
            
            // 3. Confirm to sender
            socket.emit('msg-delivered', { to: to, text: text });
            console.log(`✉️ Message: ${socket.username} -> ${to}`);
        } else {
            console.log(`❌ Message failed: ${to} not found.`);
        }
    });

    // ... (keep blockUser, findUser, acceptRequest logic)
    socket.on('block-user', (targetName) => {
        const me = users.get(socket.username);
        const target = users.get(targetName.toLowerCase());
        if (me && target) {
            me.friends.delete(targetName.toLowerCase());
            me.requests.delete(targetName.toLowerCase());
            me.blocked.add(targetName.toLowerCase());
            target.friends.delete(socket.username);
            socket.emit('auth-success', {friends: Array.from(me.friends), requests: Array.from(me.requests), blocked: Array.from(me.blocked)});
            io.to(target.socketId).emit('friend-list-update', Array.from(target.friends));
        }
    });

    socket.on('unblock-user', (targetName) => {
        const me = users.get(socket.username);
        if (me) {
            me.blocked.delete(targetName.toLowerCase());
            socket.emit('auth-success', {friends: Array.from(me.friends), requests: Array.from(me.requests), blocked: Array.from(me.blocked)});
        }
    });

    socket.on('disconnect', () => console.log('❌ A user disconnected'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Nexus Engine Running on ${PORT}`));
