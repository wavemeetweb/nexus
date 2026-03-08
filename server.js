const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" },
    maxHttpBufferSize: 1e8 
});

app.use(express.static(__dirname));

const activeUsers = new Map();

io.on('connection', (socket) => {
    socket.on('auth', (userData) => {
        socket.username = userData.name;
        socket.uid = userData.uid;
        activeUsers.set(socket.id, { name: socket.username, uid: socket.uid });
        console.log(`User Authenticated: ${socket.username}`);
    });

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', socket.id);
    });

    // Classroom Features
    socket.on('send-chat', (data) => {
        io.to(data.roomId).emit('recv-chat', { from: socket.username, text: data.text });
    });

    socket.on('draw', (data) => {
        socket.to(data.roomId).emit('draw-remote', data);
    });

    socket.on('disconnect', () => {
        activeUsers.delete(socket.id);
        io.emit('user-disconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Zenith Classroom Live on ${PORT}`));
