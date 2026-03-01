const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, maxHttpBufferSize: 1e8 });

const activeUsers = new Map(); // username -> socketId
const profiles = new Map();    // username -> data
const groups = new Map();      // id -> {name, admin, members: Set}

io.on('connection', (socket) => {
    socket.on('auth', (u) => {
        const user = u.toLowerCase().trim();
        activeUsers.set(user, socket.id);
        socket.username = user;
        if (!profiles.has(user)) profiles.set(user, { display: u, bio: "Nexus Legend", social: {} });
        socket.emit('ready', { profile: profiles.get(user) });
    });

    // Signaling for Video/Voice Calls
    socket.on('call-request', (d) => {
        const target = activeUsers.get(d.to.toLowerCase());
        if (target) io.to(target).emit('call-made', { from: socket.username, type: d.type, offer: d.offer });
    });
    socket.on('call-answer', (d) => {
        const target = activeUsers.get(d.to.toLowerCase());
        if (target) io.to(target).emit('call-answered', { from: socket.username, answer: d.answer });
    });
    socket.on('ice-candidate', (d) => {
        const target = activeUsers.get(d.to.toLowerCase());
        if (target) io.to(target).emit('ice-candidate', { from: socket.username, candidate: d.candidate });
    });

    // Advanced Group Management
    socket.on('grp-create', (d) => {
        const id = 'gid_' + Date.now();
        groups.set(id, { name: d.name, admin: socket.username, members: new Set([socket.username]) });
        socket.join(id);
        socket.emit('grp-update', { id, name: d.name, admin: socket.username, members: [socket.username] });
    });

    socket.on('grp-manage', (p) => {
        const g = groups.get(p.gid);
        if (!g || g.admin !== socket.username) return; // Admin check

        if (p.action === 'add') {
            g.members.add(p.target);
            const tSid = activeUsers.get(p.target.toLowerCase());
            if (tSid) {
                io.sockets.sockets.get(tSid).join(p.gid);
                io.to(tSid).emit('grp-update', { id: p.gid, name: g.name, admin: g.admin, members: [...g.members] });
            }
        } else if (p.action === 'kick') {
            g.members.delete(p.target);
            const tSid = activeUsers.get(p.target.toLowerCase());
            if (tSid) io.sockets.sockets.get(tSid).leave(p.gid);
        }
        io.to(p.gid).emit('grp-update', { id: p.gid, name: g.name, admin: g.admin, members: [...g.members] });
    });

    socket.on('msg-send', (d) => {
        const msg = { ...d, from: socket.username, id: Date.now() };
        if (d.isGroup) io.to(d.to).emit('msg-recv', msg);
        else {
            const t = activeUsers.get(d.to.toLowerCase());
            if (t) io.to(t).emit('msg-recv', msg);
        }
    });

    socket.on('disconnect', () => activeUsers.delete(socket.username));
});

server.listen(3000, () => console.log('Zenith Ultra: http://localhost:3000'));
