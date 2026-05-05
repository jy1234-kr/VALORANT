import { io } from 'socket.io-client';

class NetworkManager {
  constructor(game) {
    this.game = game;
    this.socket = null;
    this.connected = false;
    this.roomId = null;
    this.playerId = null;
    
    // Client-side prediction
    this.inputBuffer = [];
    this.lastProcessedSeq = -1;
    
    // Entity interpolation
    this.snapshotBuffer = [];
    this.maxSnapshotBuffer = 5;
    
    this.connect();
  }
  
  connect() {
    const serverUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:3000' 
      : window.location.origin;
    
    this.socket = io(serverUrl, {
      transports: ['websocket'],
      upgrade: false
    });
    
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.connected = true;
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.connected = false;
    });
    
    this.socket.on('error', (data) => {
      console.error('Server error:', data);
      alert(`Error: ${data.message}`);
    });
    
    // Room events
    this.socket.on('roomJoined', (data) => {
      this.handleRoomJoined(data);
    });
    
    this.socket.on('playerJoined', (data) => {
      console.log('Player joined:', data.playerName);
    });
    
    this.socket.on('playerLeft', (data) => {
      console.log('Player left:', data.playerId);
      this.game.removePlayerEntity(data.playerId);
    });
    
    this.socket.on('roomList', (rooms) => {
      this.updateRoomList(rooms);
    });
    
    // Game state events
    this.socket.on('snapshot', (snapshot) => {
      this.processSnapshot(snapshot);
    });
    
    this.socket.on('agentSelectStart', (data) => {
      this.game.agentSelect.startSelection(data.duration);
    });
    
    this.socket.on('buyPhaseStart', (data) => {
      this.game.gameState.phase = 'BUY';
      this.game.hud.showBuyTimer(data.duration);
    });
    
    this.socket.on('actionPhaseStart', (data) => {
      this.game.gameState.phase = 'ACTION';
      this.game.enterGame();
    });
    
    this.socket.on('roundStart', (data) => {
      this.game.hud.showRoundBanner('ROUND START');
    });
    
    this.socket.on('roundEnd', (data) => {
      this.game.hud.showRoundEnd(data);
    });
    
    this.socket.on('roundBanner', (data) => {
      this.game.hud.showRoundBanner(data.text);
    });
    
    this.socket.on('matchEnd', (data) => {
      this.game.hud.showMatchEnd(data);
    });
    
    // Combat events
    this.socket.on('kill', (data) => {
      this.game.hud.addKillFeedEntry(data);
      this.game.audioSystem.playKillSound();
    });
    
    this.socket.on('playerDamaged', (data) => {
      this.game.hud.showDamageNumber(data.damage, data.headshot);
      if (data.victim === this.playerId) {
        this.game.audioSystem.playHitSound();
      }
    });
    
    this.socket.on('playerShot', (data) => {
      if (data.playerId !== this.playerId) {
        this.game.audioSystem.playGunshot(data.weapon, data.pos);
      }
    });
    
    this.socket.on('playerReloaded', (data) => {
      if (data.playerId === this.playerId) {
        this.game.hud.updateAmmo(data.ammo);
      }
    });
    
    // Spike events
    this.socket.on('spikePlanted', (data) => {
      this.game.gameState.spikePlanted = true;
      this.game.hud.showSpikeStatus(true);
      this.game.audioSystem.announce('Spike has been planted');
    });
    
    this.socket.on('spikeDefused', () => {
      this.game.gameState.spikePlanted = false;
      this.game.hud.showSpikeStatus(false);
    });
    
    this.socket.on('announce', (data) => {
      this.game.audioSystem.announce(data.text);
    });
    
    // Agent events
    this.socket.on('agentSelected', (data) => {
      this.game.agentSelect.updateAgentSelection(data);
    });
    
    this.socket.on('agentLocked', (data) => {
      this.game.agentSelect.markLocked(data);
    });
  }
  
  handleRoomJoined(data) {
    this.roomId = data.roomId;
    this.playerId = data.playerId;
    this.game.gameState.localPlayerId = data.playerId;
    
    console.log('Joined room:', data.roomId);
    
    // Show agent select screen
    this.game.showScreen('agent-select-screen');
    this.game.agentSelect.init(data.initialState);
  }
  
  requestRoomList() {
    if (!this.socket) return;
    
    fetch('/api/rooms')
      .then(res => res.json())
      .then(rooms => this.updateRoomList(rooms))
      .catch(err => console.error('Failed to get rooms:', err));
  }
  
  updateRoomList(rooms) {
    const container = document.getElementById('room-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    rooms.forEach(room => {
      const item = document.createElement('div');
      item.className = 'room-list-item';
      item.innerHTML = `
        <span>${room.name}</span>
        <span>${room.map}</span>
        <span>${room.players}/${room.maxPlayers}</span>
        <span>${room.phase}</span>
        <button class="join-btn" data-room-id="${room.id}">JOIN</button>
      `;
      
      item.querySelector('.join-btn').addEventListener('click', () => {
        this.joinRoom(room.id);
      });
      
      container.appendChild(item);
    });
  }
  
  createRoom(name, map, maxPlayers) {
    this.socket.emit('createRoom', {
      roomName: name,
      map: map,
      maxPlayers: maxPlayers
    });
  }
  
  joinRoom(roomId) {
    const playerName = prompt('Enter your name:') || 'Player';
    const agentId = 'jett'; // Default for now
    
    this.socket.emit('joinRoom', {
      roomId: roomId,
      playerName: playerName,
      agentId: agentId
    });
  }
  
  selectAgent(agentId) {
    this.socket.emit('selectAgent', {
      roomId: this.roomId,
      agentId: agentId
    });
  }
  
  lockInAgent() {
    this.socket.emit('lockInAgent', {
      roomId: this.roomId
    });
  }
  
  sendInput() {
    if (!this.connected || !this.game.playerController?.currentInput) return;
    
    const input = { ...this.game.playerController.currentInput };
    this.inputBuffer.push(input);
    
    // Keep buffer manageable
    if (this.inputBuffer.length > 128) {
      this.inputBuffer.shift();
    }
    
    this.socket.emit('input', input);
  }
  
  processSnapshot(snapshot) {
    // Add to snapshot buffer for interpolation
    this.snapshotBuffer.push(snapshot);
    if (this.snapshotBuffer.length > this.maxSnapshotBuffer) {
      this.snapshotBuffer.shift();
    }
    
    // Update last processed sequence
    if (snapshot.tick) {
      // Could use this for reconciliation
    }
    
    // Process game state
    this.game.processSnapshot(snapshot);
  }
  
  leaveRoom() {
    this.socket.emit('leaveRoom');
    this.roomId = null;
    this.playerId = null;
    this.game.showScreen('main-menu');
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export { NetworkManager };
