const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, maxHttpBufferSize: 1e8 });

app.use(express.static(__dirname));

const activeUsers = new Map(); // username -> socketId
const groups = new Map();      // gid -> { name, admin, members: Set }

io.on('connection', (socket) => {
    socket.on('auth', (u) => {
        const user = u.toLowerCase().trim();
        activeUsers.set(user, socket.id);
        socket.username = user;
        socket.emit('ready');
    });

    // --- MESSAGING & GROUPS ---
    socket.on('msg-send', (d) => {
        const msg = { ...d, from: socket.username, id: 'm_' + Date.now(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        if (d.isGroup) {
            io.to(d.to).emit('msg-recv', msg);
        } else {
            const target = activeUsers.get(d.to.toLowerCase());
            if (target) io.to(target).emit('msg-recv', msg);
        }
    });

    socket.on('create-group', (data) => {
        const gid = 'gid_' + Date.now();
        groups.set(gid, { name: data.name, admin: socket.username, members: new Set([socket.username]) });
        socket.join(gid);
        socket.emit('group-created', { gid, name: data.name, admin: socket.username
