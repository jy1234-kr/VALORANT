const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

// Room Manager
const RoomManager = require('./RoomManager');
const roomManager = new RoomManager(io);

// Socket connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join room
  socket.on('joinRoom', (data) => {
    const { roomId, playerName, agentId } = data;
    const result = roomManager.joinRoom(socket, roomId, playerName, agentId);
    if (result.success) {
      socket.emit('roomJoined', {
        roomId: result.room.id,
        playerId: socket.id,
        initialState: roomManager.getRoomState(result.room.id)
      });
    } else {
      socket.emit('error', { code: 'JOIN_FAILED', message: result.error });
    }
  });

  // Create room
  socket.on('createRoom', (data) => {
    const { roomName, map, maxPlayers } = data;
    const room = roomManager.createRoom(socket, roomName, map, maxPlayers);
    socket.emit('roomJoined', {
      roomId: room.id,
      playerId: socket.id,
      initialState: roomManager.getRoomState(room.id)
    });
  });

  // Select agent
  socket.on('selectAgent', (data) => {
    const { roomId, agentId } = data;
    roomManager.selectAgent(socket.id, roomId, agentId);
  });

  // Lock in agent
  socket.on('lockInAgent', (data) => {
    const { roomId } = data;
    roomManager.lockInAgent(socket.id, roomId);
  });

  // Game input
  socket.on('input', (data) => {
    const room = roomManager.getPlayerRoom(socket.id);
    if (room && room.gameLoop) {
      room.gameLoop.processInput(socket.id, data);
    }
  });

  // Chat message
  socket.on('chatMessage', (data) => {
    const { roomId, text } = data;
    const player = roomManager.getPlayer(socket.id);
    if (player && roomId) {
      io.to(roomId).emit('chatMessage', {
        playerId: socket.id,
        playerName: player.name,
        text
      });
    }
  });

  // Leave room
  socket.on('leaveRoom', () => {
    const room = roomManager.getPlayerRoom(socket.id);
    if (room) {
      roomManager.leaveRoom(socket.id, room.id);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    roomManager.handleDisconnect(socket.id);
  });
});

// Get room list
app.get('/api/rooms', (req, res) => {
  res.json(roomManager.getRoomList());
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, io, server };
