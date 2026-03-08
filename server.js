const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));

const rooms = new Map(); // roomId -> { teacher: name, students: [] }

io.on('connection', (socket) => {
    socket.on('join-class', ({ roomId, name, isTeacher }) => {
        socket.join(roomId);
        socket.username = name;
        socket.roomId = roomId;

        if (!rooms.has(roomId)) rooms.set(roomId, { teacher: null, students: [] });
        const room = rooms.get(roomId);
        
        if (isTeacher) room.teacher = socket.id;
        else room.students.push(socket.id);

        socket.to(roomId).emit('user-joined', { id: socket.id, name });
    });

    // Classroom Features
    socket.on('raise-hand', () => {
        const room = rooms.get(socket.roomId);
        if (room?.teacher) io.to(room.teacher).emit('student-raised-hand', { name: socket.username });
    });

    socket.on('draw-on-board', (data) => {
        socket.to(socket.roomId).emit('board-update', data);
    });

    socket.on('disconnect', () => {
        // Cleanup room logic here
    });
});

server.listen(3000, () => console.log('Classroom Server running on port 3000'));
