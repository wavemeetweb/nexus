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
    maxHttpBufferSize: 2e7 // 20MB
});

const users = new Map(); 
const groups = new Map();

const syncClientUI = (username) => {
    const slug = username.toLowerCase().trim();
    const user = users.get(slug);
    if (!user || !user.socketId) return;

    const userGroups = Array.from(groups).filter(([id, g]) => g.members.has(slug))
        .map(([id, g]) => ({ id, name: g.name }));

    io.to(user.socketId).emit('ui-state-update', {
        profile: { name: user.displayName, bio: user.bio, socials: user.socials },
        friends: Array.from(user.friends),
        pending: Array.from(user.pending),
        blocked: Array.from(user.blocked),
        groups: userGroups
    });
};

io.on('connection', (socket) => {
    socket.on('nexus-auth', (username) => {
        if (!username) return;
        const slug = username.toLowerCase().trim();
        if (!users.has(slug)) {
            users.set(slug, {
                socketId: socket.id, displayName: username,
                bio: "New to Nexus.", socials: { x: "", yt: "", ig: "" },
                friends: new Set(), pending: new Set(), blocked: new Set()
            });
        } else { users.get(slug).socketId = socket.id; }
        socket.username = slug;
        syncClientUI(slug);
    });

    socket.on('message-outgoing', (payload) => {
        const sender = users.get(socket.username);
        const msgId = 'msg_' + Date.now();
        const data = { 
            id: msgId, from: sender.displayName, fromSlug: socket.username,
            text: payload.text, file: payload.file, type: payload.type 
        };

        if (payload.type === 'group') {
            io.to(payload.to).emit('message-incoming', { ...data, channel: payload.to });
        } else {
            const target = users.get(payload.to.toLowerCase().trim());
            if (target) {
                io.to(target.socketId).emit('message-incoming', data);
                // Sender gets "Delivered" immediately
                socket.emit('message-status', { id: msgId, status: 'delivered' });
            }
        }
    });

    socket.on('message-seen', ({ msgId, toSlug }) => {
        const sender = users.get(toSlug.toLowerCase().trim());
        if (sender) io.to(sender.socketId).emit('message-status', { id: msgId, status: 'read' });
    });

    socket.on('friend-request-accept', (requesterName) => {
        const me = users.get(socket.username);
        const peerSlug = requesterName.toLowerCase().trim();
        const peer = users.get(peerSlug);
        if (me && peer) {
            me.pending.delete(requesterName);
            me.friends.add(peer.displayName);
            peer.friends.add(me.displayName);
            syncClientUI(socket.username);
            syncClientUI(peerSlug);
        }
    });

    // ... Other logic for profile-update, group-create, signal-offer remains standard ...
    socket.on('profile-update', (data) => {
        const user = users.get(socket.username);
        if (user) { Object.assign(user, data); syncClientUI(socket.username); }
    });
    
    socket.on('group-create', ({ name, members }) => {
        const gId = 'grp_' + Date.now();
        const memberSet = new Set([socket.username, ...members.map(m => m.toLowerCase().trim())]);
        groups.set(gId, { name, members: memberSet });
        memberSet.forEach(m => {
            const u = users.get(m);
            if (u && u.socketId) { io.to(u.socketId).socketsJoin(gId); syncClientUI(m); }
        });
    });
});

server.listen(process.env.PORT || 3000, () => console.log("Nexus Ultimate Online"));
