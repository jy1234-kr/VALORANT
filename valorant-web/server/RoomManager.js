const { v4: uuidv4 } = require('uuid');
const GameRoom = require('./GameRoom');

class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomId -> GameRoom
    this.playerRooms = new Map(); // socketId -> roomId
    this.players = new Map(); // socketId -> player info
  }

  createRoom(hostSocket, roomName, map, maxPlayers) {
    const roomId = uuidv4().substring(0, 8);
    const room = new GameRoom(roomId, roomName, map, maxPlayers, this.io);
    
    // Add host to room
    room.addPlayer(hostSocket.id, {
      id: hostSocket.id,
      name: 'Host',
      isHost: true,
      isBot: false
    });
    
    this.rooms.set(roomId, room);
    this.playerRooms.set(hostSocket.id, roomId);
    
    hostSocket.join(roomId);
    
    console.log(`Room created: ${roomId} by ${hostSocket.id}`);
    return room;
  }

  joinRoom(socket, roomId, playerName, agentId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }
    
    if (room.players.size >= room.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }
    
    if (room.phase !== 'WAITING' && room.phase !== 'AGENT_SELECT') {
      return { success: false, error: 'Game already in progress' };
    }
    
    // Add player to room
    room.addPlayer(socket.id, {
      id: socket.id,
      name: playerName,
      isHost: false,
      isBot: false
    });
    
    this.playerRooms.set(socket.id, roomId);
    socket.join(roomId);
    
    // Notify all players in room
    this.io.to(roomId).emit('playerJoined', {
      playerId: socket.id,
      playerName: playerName,
      roomState: this.getRoomState(roomId)
    });
    
    console.log(`Player ${socket.id} joined room ${roomId}`);
    return { success: true, room };
  }

  leaveRoom(socketId, roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    room.removePlayer(socketId);
    this.playerRooms.delete(socketId);
    
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.leave(roomId);
    }
    
    // If room is empty, delete it
    if (room.players.size === 0) {
      this.rooms.delete(roomId);
      console.log(`Room ${roomId} deleted (empty)`);
    } else {
      // Notify remaining players
      this.io.to(roomId).emit('playerLeft', {
        playerId: socketId,
        roomState: this.getRoomState(roomId)
      });
    }
  }

  selectAgent(socketId, roomId, agentId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    room.selectAgent(socketId, agentId);
    
    // Broadcast updated agent selections
    this.io.to(roomId).emit('agentSelected', {
      playerId: socketId,
      agentId,
      roomState: this.getRoomState(roomId)
    });
  }

  lockInAgent(socketId, roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    room.lockInAgent(socketId);
    
    // Check if all players have locked in
    if (room.allPlayersLockedIn()) {
      room.startGame();
    }
    
    this.io.to(roomId).emit('agentLocked', {
      playerId: socketId,
      roomState: this.getRoomState(roomId)
    });
  }

  handleDisconnect(socketId) {
    const roomId = this.playerRooms.get(socketId);
    if (roomId) {
      this.leaveRoom(socketId, roomId);
    }
    this.players.delete(socketId);
  }

  getPlayerRoom(socketId) {
    const roomId = this.playerRooms.get(socketId);
    return this.rooms.get(roomId);
  }

  getPlayer(socketId) {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return null;
    
    const room = this.rooms.get(roomId);
    return room?.players.get(socketId);
  }

  getRoomState(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    
    return {
      id: room.id,
      name: room.name,
      map: room.map,
      maxPlayers: room.maxPlayers,
      phase: room.phase,
      players: Array.from(room.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        isBot: p.isBot,
        agentId: p.agentId,
        agentLocked: p.agentLocked,
        team: p.team
      })),
      gameState: room.gameLoop?.getState() || null
    };
  }

  getRoomList() {
    return Array.from(this.rooms.values())
      .filter(room => room.phase === 'WAITING')
      .map(room => ({
        id: room.id,
        name: room.name,
        map: room.map,
        players: room.players.size,
        maxPlayers: room.maxPlayers,
        phase: room.phase
      }));
  }

  // Fill room with bots
  fillWithBots(roomId, botCount) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    for (let i = 0; i < botCount; i++) {
      const botId = `bot_${uuidv4().substring(0, 6)}`;
      room.addPlayer(botId, {
        id: botId,
        name: `Bot ${i + 1}`,
        isHost: false,
        isBot: true
      });
    }
  }
}

module.exports = RoomManager;
