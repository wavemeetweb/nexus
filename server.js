const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));

const activeUsers = new Map(); // socket.id -> profile
const bannedUIDs = new Set();

io.on('connection', (socket) => {
    // Basic Auth for everyone
    socket.on('auth-user', (profile) => {
        if (bannedUIDs.has(profile.uid)) {
            return socket.emit('kick-notice', "BANNED_GLOBALLY");
        }
        socket.profile = profile;
        activeUsers.set(socket.id, profile);
        // Alert Admin Panel
        io.emit('admin-refresh-list', Array.from(activeSessions()));
    });

    // Classroom Logic
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        socket.roomId = roomId;
        // First one in is host logic...
    });

    // SECRET ADMIN COMMANDS
    socket.on('execute-global-ban', ({ targetUid, secret }) => {
        if (secret === "VINAYAK_2026") {
            bannedUIDs.add(targetUid);
            io.emit('check-ban', targetUid); // Force kicks them everywhere
        }
    });

    socket.on('disconnect', () => {
        activeUsers.delete(socket.id);
        io.emit('admin-refresh-list', Array.from(activeSessions()));
    });
});

function activeSessions() {
    return Array.from(activeUsers.values());
}

server.listen(3000, () => console.log("Nexus Server Active"));
