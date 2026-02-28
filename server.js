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
    maxHttpBufferSize: 5e7 // 50MB
});

const users = new Map(); // slug -> userObject
const groups = new Map(); // gId -> groupObject

// UI Sync Engine
const sync = (slug) => {
    const u = users.get(slug);
    if (!u || !u.socketId) return;
    const gList = Array.from(groups).filter(([id, g]) => g.members.has(slug)).map(([id, g]) => ({ id, name: g.name }));
    io.to(u.socketId).emit('ui-sync', {
        profile: { name: u.displayName, bio: u.bio, pic: u.pic },
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
                bio: "New to Nexus.", friends: new Set(), pending: new Set(), pic: null
            });
        } else { users.get(slug).socketId = socket.id; }
        socket.username = slug;
        sync(slug);
    });

    socket.on('profile-update', (data) => {
        const u = users.get(socket.username);
        if (u) {
            u.displayName = data.name; u.bio = data.bio; u.pic = data.pic;
            sync(socket.username);
            u.friends.forEach(f => sync(f.toLowerCase()));
        }
    });

    socket.on('msg-out', (p) => {
        const u = users.get(socket.username);
        const data = { id: p.id || Date.now(), from: u.displayName, fromSlug: socket.username, text: p.text, audio: p.audio, file: p.file };
        if (p.type === 'group') io.to(p.to).emit('msg-in', { ...data, channel: p.to });
        else {
            const t = users.get(p.to.toLowerCase().trim());
            if (t) {
                io.to(t.socketId).emit('msg-in', data);
                socket.emit('msg-status', { id: data.id, status: 'delivered' });
            }
        }
    });

    socket.on('msg-read', ({ mId, toSlug }) => {
        const u = users.get(toSlug);
        if (u) io.to(u.socketId).emit('msg-status', { id: mId, status: 'read' });
    });

    socket.on('typing-start', ({ to, isGroup }) => {
        const sender = users.get(socket.username);
        if (isGroup) socket.to(to).emit('typing-in', { from: sender.displayName, channel: to, isGroup: true });
        else {
            const t = users.get(to.toLowerCase().trim());
            if(t) io.to(t.socketId).emit('typing-in', { from: sender.displayName, fromSlug: socket.username, isGroup: false });
        }
    });

    socket.on('req-send', (t) => {
        const ts = t.toLowerCase().trim();
        const target = users.get(ts);
        if (target && ts !== socket.username) {
            target.pending.add(users.get(socket.username).displayName);
            sync(ts);
            socket.emit('toast', `Request sent to ${target.displayName}`);
        } else { socket.emit('toast', "User not found."); }
    });

    socket.on('req-accept', (name) => {
        const me = users.get(socket.username), peer = users.get(name.toLowerCase().trim());
        if (me && peer) {
            me.pending.delete(name); me.friends.add(peer.displayName); peer.friends.add(me.displayName);
            sync(socket.username); sync(name.toLowerCase().trim());
        }
    });

    socket.on('group-make', ({ name, members }) => {
        const gId = 'g_' + Date.now();
        const set = new Set([socket.username, ...members.map(m => m.toLowerCase().trim())]);
        groups.set(gId, { name, members: set });
        set.forEach(m => {
            const u = users.get(m);
            if (u && u.socketId) { const s = io.sockets.sockets.get(u.socketId); if(s) s.join(gId); sync(m); }
        });
    });

    // WebRTC Signaling
    socket.on('call-init', (d) => {
        const t = users.get(d.to.toLowerCase().trim());
        if (t) io.to(t.socketId).emit('call-receive', { from: socket.username, type: d.type, offer: d.offer });
    });
    socket.on('call-reply', (d) => {
        const t = users.get(d.to.toLowerCase().trim());
        if (t) io.to(t.socketId).emit('call-ready', { answer: d.answer });
    });
    socket.on('ice-signal', (d) => {
        const t = users.get(d.to.toLowerCase().trim());
        if (t) io.to(t.socketId).emit('ice-signal', { candidate: d.candidate });
    });
});

server.listen(process.env.PORT || 3000);
