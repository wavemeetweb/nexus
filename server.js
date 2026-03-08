const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);

// IMPORTANT: Enable CORS so your other Repo can talk to this one
const io = new Server(server, {
    cors: {
        origin: "*", // Change this to your Admin Render URL for better security later
        methods: ["GET", "POST"]
    }
});

const bannedUIDs = new Set();

io.on('connection', (socket) => {
    // Standard User Auth
    socket.on('auth-user', (profile) => {
        if (bannedUIDs.has(profile.uid)) {
            return socket.emit('kick-notice', "BANNED");
        }
        socket.profile = profile;
        // Send user list to anyone listening (including your Admin)
        io.emit('admin-update-list', Array.from(io.sockets.sockets).map(s => s.profile).filter(p => p));
    });

    // RECEIVE BAN COMMAND FROM ADMIN REPO
    socket.on('execute-global-ban', (data) => {
        if (data.secret === "VINAYAK_SUPER_ADMIN_2026") {
            bannedUIDs.add(data.targetUid);
            io.emit('check-ban', data.targetUid); 
            console.log(`Global Ban: ${data.targetUid}`);
        }
    });
});

server.listen(process.env.PORT || 3000);
