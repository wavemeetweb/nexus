const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);

// CORS enabled for your separate Admin Repo
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.static(__dirname));

const bannedUIDs = new Set();
const rooms = new Map(); // Stores room data: { roomId: { users: [] } }

io.on('connection', (socket) => {
    
    socket.on('auth-user', (profile) => {
        if (bannedUIDs.has(profile.uid)) {
            return socket.emit('kick-notice', "BANNED");
        }
        socket.profile = profile;
        // Tell the Admin Repo a new user is online anywhere in the school
        io.emit('admin-global-update', { type: 'join', user: profile });
    });

    socket.on('join-room', (roomId) => {
        // Limit Check: Max 50 people per room
        const numClients = io.sockets.adapter.rooms.get(roomId)?.size || 0;
        if (numClients >= 50) {
            return socket.emit('error-msg', "Classroom is full (Max 50).");
        }

        socket.join(roomId);
        socket.roomId = roomId;

        // WebRTC Signaling: Tell others in the room a new peer has joined
        socket.to(roomId).emit('user-joined-webrtc', socket.id);
    });

    // FEATURE: Collaborative Whiteboard Sync
    socket.on('draw-data', (data) => {
        socket.to(socket.roomId).emit('draw-remote', data);
    });

    // FEATURE: Global Chat
    socket.on('send-msg', (msg) => {
        io.to(socket.roomId).emit('recv-msg', { 
            user: socket.profile.name, 
            text: msg 
        });
    });

    // MASTER ADMIN COMMAND: Global Ban
    socket.on('execute-global-ban', (data) => {
        if (data.secret === "VINAYAK_SUPER_ADMIN_2026") {
            bannedUIDs.add(data.targetUid);
            io.emit('force-check-ban', data.targetUid); 
            console.log(`[SENTINEL] User ${data.targetUid} banned globally.`);
        }
    });

    socket.on('disconnect', () => {
        if (socket.profile) {
            io.emit('admin-global-update', { type: 'leave', uid: socket.profile.uid });
        }
    });
});

server.listen(process.env.PORT || 3000, () => console.log("Nexus Engine: 50-Cap Ready"));
