const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const activeUsers = new Map();
const bannedList = new Set();

io.on('connection', (socket) => {
    socket.on('join-room', (data) => {
        if (bannedList.has(data.uid)) {
            return socket.emit('error', 'YOU_ARE_BANNED');
        }
        socket.join(data.roomId);
        activeUsers.set(socket.id, data);
        console.log(`${data.name} joined room ${data.roomId}`);
    });

    // LISTEN FOR COMMANDS FROM YOUR ADMIN SERVER
    socket.on('internal-admin-command', (command) => {
        if (command.type === 'BAN') {
            bannedList.add(command.targetUid);
            // Kick them out immediately if they are online
            io.emit('check-ban-status', command.targetUid);
        }
    });
});

server.listen(3000, () => console.log("Normal School Server: Port 3000"));
