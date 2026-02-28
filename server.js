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
    maxHttpBufferSize: 2e7 // 20MB for high-res files
});

const users = new Map(); // slug -> userObject
const groups = new Map(); // gId -> groupObject

// The Sync Engine: Keeps UI updated across all devices
const sync = (slug) => {
    const u = users.get(slug);
    if (!u || !u.socketId) return;
    const gList = Array.from(groups)
        .filter(([id, g]) => g.members.has(slug))
        .map(([id, g]) => ({ id, name: g.name }));
    
    io.to(u.socketId).emit('ui-sync', {
        profile: { name: u.displayName, bio: u.bio, socials: u.socials },
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
                bio: "New to Nexus.", socials: { x: "", yt: "", ig: "" },
                friends: new Set(), pending: new Set()
            });
        } else { users.get(slug).socketId = socket.id; }
        socket.username = slug;
        sync(slug);
    });

    // Profile Logic
    socket.on('profile-update', (data) => {
        const u = users.get(socket.username);
        if (u) {
            u.displayName = data.name || u.displayName;
            u.bio = data.bio || u.bio;
            u.socials = data.socials || u.socials;
            sync(socket.username); 
        }
    });

    // Friendship Logic
    socket.on('req-send', (targetName) => {
        const ts = targetName.toLowerCase().trim();
        const target = users.get(ts);
        if (target && ts !== socket.username) {
            target.pending.add(users.get(socket.username).displayName);
            sync(ts);
        }
    });

    socket.on('req-accept', (name) => {
        const me = users.get(socket.username);
        const peerSlug = name.toLowerCase().trim();
        const peer = users.get(peerSlug);
        if (me && peer) {
            me.pending.delete(name);
            me.friends.add(peer.displayName);
            peer.friends.add(me.displayName);
            sync(socket.username); sync(peerSlug);
        }
    });

    // Group Logic
    socket.on('group-make', ({ name, members }) => {
        const gId = 'g_' + Date.now();
        const memberSlugs = [socket.username, ...members.map(m => m.toLowerCase().trim())];
        groups.set(gId, { name, members: new Set(memberSlugs) });
        memberSlugs.forEach(slug => {
            const u = users.get(slug);
            if (u && u.socketId) {
                const s = io.sockets.sockets.get(u.socketId);
                if (s) s.join(gId);
                sync(slug);
            }
        });
    });

    // Messaging Logic
    socket.on('msg-out', (payload) => {
        const sender = users.get(socket.username);
        const mId = 'm_' + Date.now();
        const data = { id: mId, from: sender.displayName, fromSlug: socket.username, text: payload.text, file: payload.file };

        if (payload.type === 'group') {
            io.to(payload.to).emit('msg-in', { ...data, channel: payload.to });
        } else {
            const target = users.get(payload.to.toLowerCase().trim());
            if (target) {
                io.to(target.socketId).emit('msg-in', data);
                socket.emit('msg-status', { id: mId, status: 'delivered' });
            }
        }
    });

    // WebRTC Signaling
    socket.on('call-init', (d) => {
        const target = users.get(d.to.toLowerCase().trim());
        if (target) io.to(target.socketId).emit('call-receive', { from: socket.username, type: d.type, offer: d.offer });
    });
    socket.on('call-reply', (d) => {
        const target = users.get(d.to.toLowerCase().trim());
        if (target) io.to(target.socketId).emit('call-ready', { answer: d.answer });
    });
    socket.on('ice-signal', (d) => {
        const target = users.get(d.to.toLowerCase().trim());
        if (target) io.to(target.socketId).emit('ice-signal', { candidate: d.candidate });
    });
});

server.listen(process.env.PORT || 3000, () => console.log("Zenith Active"));
