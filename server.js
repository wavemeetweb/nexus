const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" }, 
    maxHttpBufferSize: 5e7 // Increased to 50MB for audio/images
});

const users = new Map(); 
const groups = new Map();

const sync = (slug) => {
    const u = users.get(slug);
    if (!u || !u.socketId) return;
    const gList = Array.from(groups).filter(([id, g]) => g.members.has(slug)).map(([id, g]) => ({ id, name: g.name }));
    io.to(u.socketId).emit('ui-sync', {
        profile: { name: u.displayName, bio: u.bio, socials: u.socials, pic: u.pic },
        friends: Array.from(u.friends),
        pending: Array.from(u.pending),
        groups: gList
    });
};

io.on('connection', (socket) => {
    socket.on('nexus-auth', (username) => {
        const slug = username.toLowerCase().trim();
        if (!users.has(slug)) {
            users.set(slug, {
                socketId: socket.id, displayName: username,
                bio: "New here.", socials: { x: "", yt: "", ig: "" },
                friends: new Set(), pending: new Set(), pic: null
            });
        } else { users.get(slug).socketId = socket.id; }
        socket.username = slug;
        sync(slug);
    });

    socket.on('profile-update', (data) => {
        const u = users.get(socket.username);
        if (u) {
            Object.assign(u, { displayName: data.name, bio: data.bio, socials: data.socials, pic: data.pic });
            sync(socket.username);
            // Notify friends of the identity change
            u.friends.forEach(f => sync(f.toLowerCase()));
        }
    });

    socket.on('msg-out', (p) => {
        const u = users.get(socket.username);
        const data = { id: p.id || Date.now(), from: u.displayName, fromSlug: socket.username, text: p.text, audio: p.audio, pic: u.pic };
        if (p.type === 'group') io.to(p.to).emit('msg-in', { ...data, channel: p.to });
        else {
            const t = users.get(p.to.toLowerCase().trim());
            if (t) {
                io.to(t.socketId).emit('msg-in', data);
                socket.emit('msg-status', { id: data.id, status: 'delivered' });
            }
        }
    });

    // ... (Keep existing Typing, Signaling, and Group logic from previous version)
});

server.listen(process.env.PORT || 3000);
