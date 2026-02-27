const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Store connected users: { username: socketId }
const users = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Register user mapping
  socket.on('register', (username) => {
    users[username] = socket.id;
    console.log(`User registered: ${username} with ID: ${socket.id}`);
  });

  // Private message routing
  socket.on('private_message', ({ to, text, from }) => {
    const recipientSocketId = users[to];
    if (recipientSocketId) {
      // Send only to the recipient
      io.to(recipientSocketId).emit('private_message', { from, text });
      // Send back to the sender so they see it in their own chat window
      socket.emit('private_message', { from, text, isSender: true });
    }
  });

  socket.on('disconnect', () => {
    // Remove user on disconnect
    for (let username in users) {
      if (users[username] === socket.id) {
        delete users[username];
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
