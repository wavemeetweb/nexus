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
        blocked: Array.from(u.blocked),
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

    // RELATIONSHIP LOGIC
    socket.on('friend-request-send', (targetName) => {
        const targetSlug = targetName.toLowerCase().trim();
        const me = users.get(socket.username);
        const target = users.get(targetSlug);

        if (target && targetSlug !== socket.username && !target.blocked.has(me.displayName)) {
            target.pending.add(me.displayName);
            sync(targetSlug);
            socket.emit('sys-msg', `Request sent to ${target.displayName}`);
        } else {
            socket.emit('sys-msg', "User not found or blocked.");
        }
    });

    socket.on('friend-request-accept', (requesterName) => {
        const me = users.get(socket.username);
        const peerSlug = requesterName.toLowerCase().trim();
        const peer = users.get(peerSlug);
        if (me && peer) {
            me.pending.delete(requesterName);
            me.friends.add(peer.displayName);
            peer.friends.add(me.displayName);
            sync(socket.username);
            sync(peerSlug);
        }
    });

    socket.on('user-block', (targetName) => {
        const me = users.get(socket.username);
        const targetSlug = targetName.toLowerCase().trim();
        me.friends.delete(targetName);
        me.blocked.add(targetName);
        sync(socket.username);
        // Also remove me from their list
        const target = users.get(targetSlug);
        if(target) { target.friends.delete(me.displayName); sync(targetSlug); }
    });

    // MESSAGE LOGIC
    socket.on('msg-out', (payload) => {
        const sender = users.get(socket.username);
        const target = users.get(payload.to.toLowerCase().trim());
        if (target && target.blocked.has(sender.displayName)) return; // Blocked check

        const mId = 'm_' + Date.now();
        const data = { id: mId, from: sender.displayName, fromSlug: socket.username, text: payload.text, file: payload.file, type: payload.type };

        if (payload.type === 'group') {
            io.to(payload.to).emit('msg-in', { ...data, channel: payload.to });
        } else if (target) {
            io.to(target.socketId).emit('msg-in', data);
            socket.emit('msg-status', { id: mId, status: 'delivered' });
        }
    });

    socket.on('msg-seen', ({ mId, toSlug }) => {
        const sender = users.get(toSlug);
        if (sender) io.to(sender.socketId).emit('msg-status', { id: mId, status: 'read' });
    });
});

server.listen(process.env.PORT || 3000);
