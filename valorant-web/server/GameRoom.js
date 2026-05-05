const ServerGameLoop = require('./ServerGameLoop');
const ServerRoundManager = require('./ServerRoundManager');

class GameRoom {
  constructor(id, name, map, maxPlayers, io) {
    this.id = id;
    this.name = name;
    this.map = map;
    this.maxPlayers = maxPlayers;
    this.io = io;
    this.players = new Map(); // socketId -> player info
    this.phase = 'WAITING'; // WAITING, AGENT_SELECT, BUY, ACTION, PLANTED, POST_ROUND, MATCH_END
    this.gameLoop = null;
    this.roundManager = null;
    this.agentSelections = new Map(); // socketId -> agentId
    this.lockedInPlayers = new Set(); // socketIds of players who locked in
  }

  addPlayer(socketId, playerInfo) {
    this.players.set(socketId, {
      ...playerInfo,
      agentId: null,
      agentLocked: false,
      team: null,
      credits: 800, // Starting credits
      kills: 0,
      deaths: 0,
      assists: 0,
      score: 0
    });

    // Assign teams (simple split for now)
    this.assignTeams();
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    this.agentSelections.delete(socketId);
    this.lockedInPlayers.delete(socketId);
  }

  assignTeams() {
    const playerArray = Array.from(this.players.values());
    const atkCount = Math.ceil(playerArray.length / 2);
    
    playerArray.forEach((player, index) => {
      player.team = index < atkCount ? 'atk' : 'def';
      this.players.set(player.id, player);
    });
  }

  selectAgent(socketId, agentId) {
    const player = this.players.get(socketId);
    if (!player) return false;

    // Check if agent already taken by teammate
    const teammateAgents = new Set();
    this.players.forEach(p => {
      if (p.team === player.team && p.agentId) {
        teammateAgents.add(p.agentId);
      }
    });

    if (teammateAgents.has(agentId)) {
      return false; // Agent already taken by teammate
    }

    this.agentSelections.set(socketId, agentId);
    player.agentId = agentId;
    return true;
  }

  lockInAgent(socketId) {
    const player = this.players.get(socketId);
    if (!player || !player.agentId) return false;

    player.agentLocked = true;
    this.lockedInPlayers.add(socketId);
    return true;
  }

  allPlayersLockedIn() {
    if (this.players.size === 0) return false;
    
    for (const [socketId, player] of this.players) {
      if (!player.isBot && !player.agentLocked) {
        return false;
      }
    }
    return true;
  }

  startGame() {
    this.phase = 'AGENT_SELECT';
    
    // Start agent selection timer (60 seconds)
    setTimeout(() => {
      this.startBuyPhase();
    }, 60000);

    this.io.to(this.id).emit('agentSelectStart', {
      duration: 60,
      roomState: this.getRoomState()
    });
  }

  startBuyPhase() {
    this.phase = 'BUY';
    
    // Initialize game loop and round manager
    this.gameLoop = new ServerGameLoop(this);
    this.roundManager = new ServerRoundManager(this);
    
    // Start buy phase (30 seconds)
    this.roundManager.startBuyPhase();
    
    this.io.to(this.id).emit('buyPhaseStart', {
      duration: 30,
      roomState: this.getRoomState()
    });
  }

  startActionPhase() {
    this.phase = 'ACTION';
    this.roundManager.startActionPhase();
    
    this.io.to(this.id).emit('actionPhaseStart', {
      duration: 100,
      roomState: this.getRoomState()
    });
  }

  getRoomState() {
    return {
      id: this.id,
      name: this.name,
      map: this.map,
      maxPlayers: this.maxPlayers,
      phase: this.phase,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        isBot: p.isBot,
        agentId: p.agentId,
        agentLocked: p.agentLocked,
        team: p.team,
        credits: p.credits,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists
      }))
    };
  }
}

module.exports = GameRoom;
