const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const app = express();
app.use(express.static(__dirname));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, maxHttpBufferSize: 1e8 });

const activeUsers = new Map(); 
const profiles = new Map();    

io.on('connection', (socket) => {
    socket.on('auth', (u) => {
        const user = u.toLowerCase().trim();
        activeUsers.set(user, socket.id);
        socket.username = user;
        if (!profiles.has(user)) profiles.set(user, { display: u, bio: "Nexus Legend", fb: "", ig: "" });
        socket.emit('ready', { profile: profiles.get(user) });
    });
    socket.on('update-profile', (data) => { profiles.set(socket.username, data); });
    socket.on('get-profile', (target) => {
        const p = profiles.get(target.toLowerCase());
        socket.emit('profile-data', { user: target, ...p });
    });
    socket.on('msg-send', (d) => {
        const msg = { ...d, from: socket.username, id: Date.now() };
        const t = activeUsers.get(d.to.toLowerCase());
        if (t) io.to(t).emit('msg-recv', msg);
    });
});
server.listen(3000, () => console.log('Zenith Mobile-First: http://localhost:3000'));
