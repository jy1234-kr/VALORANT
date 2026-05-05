class ServerRoundManager {
  constructor(room) {
    this.room = room;
    this.round = 1;
    this.score = { atk: 0, def: 0 };
    this.phase = 'BUY'; // BUY, ACTION, PLANTED, POST_ROUND
    this.timer = 30; // Buy phase duration
    this.spikePlanted = false;
    this.spikeTimer = null;
    this.spikeCarrier = null;
    this.buyPhaseDuration = 30;
    this.actionPhaseDuration = 100;
    this.spikePlantTime = 4.2;
    this.spikeDefuseTime = 7.0;
    this.spikeExplosionTime = 45;
    this.plantProgress = 0;
    this.defuseProgress = 0;
    this.isPlanting = false;
    this.isDefusing = false;
  }

  startBuyPhase() {
    this.phase = 'BUY';
    this.timer = this.buyPhaseDuration;
    
    // Reset player states for new round
    this.room.players.forEach((player, socketId) => {
      player.alive = true;
      player.hp = 100;
      player.armor = player.armor || 0;
      player.ammo = { clip: 12, reserve: 36 }; // Classic default
      player.weapon = player.weapon || 'classic';
      player.pos = this.getSpawnPosition(player.team);
      player.yaw = player.team === 'atk' ? 0 : Math.PI;
      player.pitch = 0;
      player.vel = { x: 0, y: 0, z: 0 };
      player.onGround = true;
      
      // Assign spike to random attacker on first round
      if (this.round === 1 && player.team === 'atk' && !this.spikeCarrier) {
        this.spikeCarrier = socketId;
        player.hasSpike = true;
      }
    });
    
    this.broadcastRoundStart();
  }

  startActionPhase() {
    this.phase = 'ACTION';
    this.timer = this.actionPhaseDuration;
    
    this.room.io.to(this.room.id).emit('roundStart', {
      round: this.round,
      attackers: this.getTeamPlayers('atk'),
      defenders: this.getTeamPlayers('def')
    });
  }

  update(dt) {
    if (this.phase === 'BUY') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.startActionPhase();
      }
    } else if (this.phase === 'ACTION') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.endRound('def', 'time');
      }
    } else if (this.phase === 'PLANTED') {
      this.spikeTimer -= dt;
      if (this.spikeTimer <= 0) {
        this.endRound('atk', 'explosion');
      }
    }
    
    // Update plant/defuse progress
    if (this.isPlanting) {
      this.plantProgress += dt;
      if (this.plantProgress >= this.spikePlantTime) {
        this.completePlant();
      }
    }
    
    if (this.isDefusing) {
      this.defuseProgress += dt;
      if (this.defuseProgress >= this.spikeDefuseTime) {
        this.completeDefuse();
      }
    }
  }

  handleInteract(player) {
    if (!player.alive) return;
    
    // Plant spike
    if (player.team === 'atk' && player.hasSpike && !this.spikePlanted) {
      if (this.isOnSite(player.pos, player.team)) {
        this.isPlanting = true;
        this.plantProgress = 0;
        
        this.room.io.to(this.room.id).emit('spikePlanting', {
          playerId: player.id,
          progress: 0
        });
      }
    }
    
    // Defuse spike
    if (player.team === 'def' && this.spikePlanted && !this.isDefusing) {
      const dist = this.distanceToSpike(player.pos);
      if (dist < 1.5) {
        this.isDefusing = true;
        this.defuseProgress = 0;
        
        this.room.io.to(this.room.id).emit('spikeDefusing', {
          playerId: player.id,
          progress: 0
        });
      }
    }
  }

  completePlant() {
    this.isPlanting = false;
    this.spikePlanted = true;
    this.phase = 'PLANTED';
    this.spikeTimer = this.spikeExplosionTime;
    
    const planter = this.room.players.get(this.spikeCarrier);
    if (planter) {
      planter.hasSpike = false;
      planter.credits += 300; // Plant bonus
    }
    
    this.room.io.to(this.room.id).emit('spikePlanted', {
      pos: planter?.pos || { x: 0, y: 0, z: 0 }
    });
    
    // Announce with speech synthesis on client
    this.room.io.to(this.room.id).emit('announce', {
      text: 'Spike has been planted'
    });
  }

  completeDefuse() {
    this.isDefusing = false;
    this.spikePlanted = false;
    this.spikeTimer = null;
    
    this.endRound('def', 'defused');
    
    this.room.io.to(this.room.id).emit('spikeDefused');
    this.room.io.to(this.room.id).emit('announce', {
      text: 'Spike has been defused'
    });
  }

  checkRoundEnd() {
    const atkAlive = this.getAliveCount('atk');
    const defAlive = this.getAliveCount('def');
    
    if (atkAlive === 0 && !this.spikePlanted) {
      this.endRound('def', 'elimination');
    } else if (defAlive === 0 && !this.spikePlanted) {
      this.endRound('atk', 'elimination');
    } else if (defAlive === 0 && this.spikePlanted) {
      // Attackers win if all defenders dead and spike planted
      // Wait for explosion or defuse interrupt (not possible if all dead)
    }
  }

  endRound(winningTeam, reason) {
    this.phase = 'POST_ROUND';
    
    // Update score
    if (winningTeam === 'atk') {
      this.score.atk++;
    } else {
      this.score.def++;
    }
    
    // Calculate economy rewards
    this.calculateEconomyRewards(winningTeam, reason);
    
    // Broadcast round end
    this.room.io.to(this.room.id).emit('roundEnd', {
      winner: winningTeam,
      reason,
      score: this.score,
      economy: this.getEconomySummary()
    });
    
    // Check match end
    if (this.score.atk >= 13 || this.score.def >= 13) {
      setTimeout(() => this.endMatch(), 5000);
    } else {
      // Start next round after delay
      setTimeout(() => this.startNextRound(), 7000);
    }
  }

  startNextRound() {
    this.round++;
    
    // Halftime swap at round 13
    if (this.round === 13) {
      this.swapTeams();
    }
    
    // Overtime at 12-12
    if (this.score.atk === 12 && this.score.def === 12) {
      this.score.atk = 0;
      this.score.def = 0;
      this.round = 1;
      // Overtime rules: 5000 credits each, sudden death
    }
    
    this.startBuyPhase();
  }

  swapTeams() {
    this.room.players.forEach((player) => {
      player.team = player.team === 'atk' ? 'def' : 'atk';
    });
  }

  calculateEconomyRewards(winningTeam, reason) {
    const lossBonusBase = 1900;
    const lossBonusIncrement = 500;
    const maxLossBonus = 2900;
    
    this.room.players.forEach((player, socketId) => {
      if (player.team === winningTeam) {
        player.credits += 3000; // Round win
      } else {
        // Loss bonus (stacks up to 3 times)
        const consecutiveLosses = 0; // Would track this
        const lossBonus = Math.min(
          lossBonusBase + (consecutiveLosses * lossBonusIncrement),
          maxLossBonus
        );
        player.credits += lossBonus;
      }
      
      // Kill rewards already applied in handleKill
    });
  }

  getEconomySummary() {
    return Array.from(this.room.players.values()).map(p => ({
      id: p.id,
      credits: p.credits
    }));
  }

  broadcastRoundStart() {
    const teamSide = this.room.players.size > 0 ? 
      (Array.from(this.room.players.values())[0].team === 'atk' ? 'ATTACK' : 'DEFEND') : 'ATTACK';
    
    this.room.io.to(this.room.id).emit('roundBanner', {
      text: teamSide
    });
  }

  getAliveCount(team) {
    let count = 0;
    this.room.players.forEach((player) => {
      if (player.team === team && player.alive) count++;
    });
    return count;
  }

  getTeamPlayers(team) {
    return Array.from(this.room.players.values())
      .filter(p => p.team === team)
      .map(p => p.id);
  }

  getSpawnPosition(team) {
    // Simplified spawn positions based on map
    // In a real implementation, this would use map-specific spawns
    if (team === 'atk') {
      return { x: -20, y: 0, z: 0 };
    } else {
      return { x: 20, y: 0, z: 0 };
    }
  }

  isOnSite(pos, team) {
    // Check if player is on their objective site
    // Simplified for now
    if (team === 'atk') {
      // Check A or B site on Bind
      const siteA = { x: 15, z: 15 };
      const siteB = { x: 15, z: -15 };
      const distA = Math.sqrt((pos.x - siteA.x)**2 + (pos.z - siteA.z)**2);
      const distB = Math.sqrt((pos.x - siteB.x)**2 + (pos.z - siteB.z)**2);
      return distA < 5 || distB < 5;
    }
    return false;
  }

  distanceToSpike(pos) {
    // Get spike position from last plant
    const spikePos = { x: 15, y: 0, z: 15 }; // Would store actual plant position
    return Math.sqrt((pos.x - spikePos.x)**2 + (pos.z - spikePos.z)**2);
  }

  endMatch() {
    const winner = this.score.atk >= 13 ? 'atk' : 'def';
    
    this.room.io.to(this.room.id).emit('matchEnd', {
      winner,
      finalScore: this.score,
      stats: this.getPlayerStats()
    });
    
    this.room.phase = 'MATCH_END';
    
    // Stop game loop
    if (this.room.gameLoop) {
      this.room.gameLoop.stop();
    }
  }

  getPlayerStats() {
    return Array.from(this.room.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      score: p.score,
      agentId: p.agentId
    }));
  }
}

module.exports = ServerRoundManager;
