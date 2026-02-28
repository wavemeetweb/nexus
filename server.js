const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, maxHttpBufferSize: 2e7 });

const users = new Map(); 
const groups = new Map();

const sync = (slug) => {
    const u = users.get(slug);
    if (!u || !u.socketId) return;
    const gList = Array.from(groups).filter(([id, g]) => g.members.has(slug)).map(([id, g]) => ({ id, name: g.name }));
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
                bio: "Establishing connection...", socials: { x: "", yt: "", ig: "" },
                friends: new Set(), pending: new Set(), blocked: new Set()
            });
        } else { users.get(slug).socketId = socket.id; }
        socket.username = slug;
        sync(slug);
    });

    // SETTINGS & PROFILE LOGIC
    socket.on('profile-update', (data) => {
        const u = users.get(socket.username);
        if (u) {
            u.displayName = data.name || u.displayName;
            u.bio = data.bio || u.bio;
            u.socials = data.socials;
            sync(socket.username);
        }
    });

    // CALLING LOGIC (Signaling)
    socket.on('call-init', ({ to, type, offer }) => {
        const target = users.get(to.toLowerCase().trim());
        if (target) io.to(target.socketId).emit('call-receive', { from: socket.username, type, offer });
    });

    socket.on('call-reply', ({ to, answer }) => {
        const target = users.get(to.toLowerCase().trim());
        if (target) io.to(target.socketId).emit('call-ready', { answer });
    });

    socket.on('ice-signal', ({ to, candidate }) => {
        const target = users.get(to.toLowerCase().trim());
        if (target) io.to(target.socketId).emit('ice-signal', { candidate });
    });

    // GROUP LOGIC
    socket.on('group-make', ({ name, members }) => {
        const gId = 'g_' + Date.now();
        const set = new Set([socket.username, ...members.map(m => m.toLowerCase().trim())]);
        groups.set(gId, { name, members: set });
        set.forEach(m => {
            const u = users.get(m);
            if (u && u.socketId) {
                const s = io.sockets.sockets.get(u.socketId);
                if (s) s.join(gId);
                sync(m);
            }
        });
    });

    // FRIEND REQUESTS & CHAT (Same as Zenith Edition)
    socket.on('req-send', (t) => {
        const ts = t.toLowerCase().trim();
        const target = users.get(ts);
        if (target && ts !== socket.username) {
            target.pending.add(users.get(socket.username).displayName);
            sync(ts);
        }
    });

    socket.on('req-accept', (name) => {
        const me = users.get(socket.username);
        const peer = users.get(name.toLowerCase().trim());
        if (me && peer) {
            me.pending.delete(name);
            me.friends.add(peer.displayName);
            peer.friends.add(me.displayName);
            sync(socket.username); sync(name.toLowerCase().trim());
        }
    });

    socket.on('msg-out', (p) => {
        const mId = 'm_' + Date.now();
        const data = { id: mId, from: socket.username, text: p.text, file: p.file };
        if (p.type === 'group') io.to(p.to).emit('msg-in', { ...data, channel: p.to });
        else {
            const target = users.get(p.to.toLowerCase().trim());
            if (target) io.to(target.socketId).emit('msg-in', data);
            socket.emit('msg-status', { id: mId, status: 'delivered' });
        }
    });

    socket.on('msg-read', ({ mId, toSlug }) => {
        const u = users.get(toSlug);
        if (u) io.to(u.socketId).emit('msg-status', { id: mId, status: 'read' });
    });
});

server.listen(process.env.PORT || 3000);
