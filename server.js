const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.static(__dirname));

const bannedUIDs = new Set();

io.on('connection', (socket) => {
    socket.on('auth-user', (profile) => {
        if (bannedUIDs.has(profile.uid)) return socket.emit('kick-notice');
        socket.profile = profile;
        broadcastToAdmin();
    });

    socket.on('join-room', (roomId) => {
        const clients = io.sockets.adapter.rooms.get(roomId)?.size || 0;
        if (clients >= 50) return socket.emit('error-msg', "Room Full (50/50)");
        socket.join(roomId);
        socket.roomId = roomId;
        socket.to(roomId).emit('user-connected', socket.id);
    });

    socket.on('execute-global-ban', (data) => {
        if (data.secret === "VINAYAK_SUPER_ADMIN_2026") {
            bannedUIDs.add(data.targetUid);
            io.emit('force-check-ban', data.targetUid);
        }
    });

    socket.on('disconnect', () => broadcastToAdmin());
});

function broadcastToAdmin() {
    const users = Array.from(io.sockets.sockets).map(([id, s]) => s.profile).filter(p => p);
    io.emit('admin-update-list', users);
}

server.listen(process.env.PORT || 3000);













































































































