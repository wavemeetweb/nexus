const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// State Management
const activeUsers = new Map(); // username -> socketId

io.on('connection', (socket) => {
    console.log('⚡ Connection established:', socket.id);

    // USER REGISTRATION
    socket.on('nexus-auth', (username) => {
        if (!username) return;
        activeUsers.set(username, socket.id);
        socket.username = username;
        // Broadcast online status to everyone
        io.emit('user-status-change', Array.from(activeUsers.keys()));
        console.log(`👤 ${username} is now online.`);
    });

    // PRIVATE MESSAGING
    socket.on('send-private-msg', ({ to, text, type = 'text', fileData = null }) => {
        const targetSocketId = activeUsers.get(to);
        const payload = {
            from: socket.username,
            text,
            type,
            fileData,
            timestamp: new Date().toISOString()
        };

        if (targetSocketId) {
            io.to(targetSocketId).emit('receive-private-msg', payload);
        }
        // Send back to sender for confirmation
        socket.emit('msg-sent-confirmation', payload);
    });

    // TYPING INDICATORS
    socket.on('typing-start', ({ to }) => {
        const target = activeUsers.get(to);
        if (target) io.to(target).emit('friend-typing', { from: socket.username });
    });

    // WEBRTC SIGNALING (The Video Engine)
    socket.on('call-user', ({ userToCall, signalData, from }) => {
        const target = activeUsers.get(userToCall);
        if (target) {
            io.to(target).emit('incoming-call', { signal: signalData, from });
        }
    });

    socket.on('answer-call', (data) => {
        const target = activeUsers.get(data.to);
        if (target) {
            io.to(target).emit('call-accepted', data.signal);
        }
    });

    // DISCONNECT
    socket.on('disconnect', () => {
        if (socket.username) {
            activeUsers.delete(socket.username);
            io.emit('user-status-change', Array.from(activeUsers.keys()));
            console.log(`❌ ${socket.username} went offline.`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`
    ======================================
    🚀 NEXUS PRO SERVER RUNNING
    🔗 Port: ${PORT}
    🏠 Environment: ${process.env.NODE_ENV || 'Development'}
    ======================================
    `);
});
