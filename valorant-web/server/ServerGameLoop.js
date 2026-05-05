const WEAPONS = require('./weapons/WeaponData');

class ServerGameLoop {
  constructor(room) {
    this.room = room;
    this.tickRate = 64; // 64 ticks per second
    this.tickInterval = 1000 / this.tickRate;
    this.tickCount = 0;
    this.inputBuffer = new Map(); // socketId -> input queue
    this.positionHistory = new Map(); // socketId -> position history for lag compensation
    this.lastInputSeq = new Map(); // socketId -> last processed sequence number
    
    // Initialize input buffers for all players
    room.players.forEach((player, socketId) => {
      this.inputBuffer.set(socketId, []);
      this.positionHistory.set(socketId, []);
      this.lastInputSeq.set(socketId, -1);
    });
    
    // Start game loop
    this.running = true;
    this.loopId = setInterval(() => this.tick(), this.tickInterval);
  }

  processInput(socketId, input) {
    const player = this.room.players.get(socketId);
    if (!player || !player.alive) return;
    
    // Check sequence number to avoid processing old inputs
    if (input.seq <= this.lastInputSeq.get(socketId)) {
      return; // Already processed this or older input
    }
    
    this.lastInputSeq.set(socketId, input.seq);
    this.inputBuffer.get(socketId).push({
      ...input,
      receivedAt: Date.now(),
      tick: this.tickCount
    });
  }

  tick() {
    this.tickCount++;
    
    // Process all pending inputs
    this.processInputs();
    
    // Update bot AI
    this.updateBots();
    
    // Update physics (movement, collisions)
    this.updatePhysics();
    
    // Run hit detection
    this.runHitDetection();
    
    // Update game state (round timer, spike, economy)
    this.updateGameState();
    
    // Broadcast state snapshot to all clients
    this.broadcastState();
    
    // Clean up old position history (keep last 1 second = 64 ticks)
    this.cleanupPositionHistory();
  }

  processInputs() {
    this.room.players.forEach((player, socketId) => {
      const inputs = this.inputBuffer.get(socketId);
      if (inputs.length === 0) return;
      
      // Process oldest unprocessed input
      const input = inputs.shift();
      
      // Apply movement
      if (player.alive) {
        this.applyMovement(player, input);
      }
      
      // Handle shooting
      if (input.shoot && player.weapon) {
        this.handleShooting(player, input);
      }
      
      // Handle reload
      if (input.reload) {
        this.handleReload(player);
      }
      
      // Handle ability use
      if (input.useAbility) {
        this.handleAbility(player, input.useAbility);
      }
      
      // Handle interact (plant/defuse)
      if (input.interact) {
        this.handleInteract(player);
      }
      
      // Store position for lag compensation
      this.storePosition(socketId, player.pos);
    });
  }

  applyMovement(player, input) {
    const speed = player.crouch ? 2.5 : 5.5; // units per second
    const dt = this.tickInterval / 1000;
    
    // Apply movement direction
    if (input.moveDir) {
      const moveX = input.moveDir.x * speed * dt;
      const moveZ = input.moveDir.y * speed * dt;
      
      // Simple collision check would go here
      player.pos.x += moveX;
      player.pos.z += moveZ;
    }
    
    // Apply jump
    if (input.jump && player.onGround) {
      player.vel.y = 5.0;
      player.onGround = false;
    }
    
    // Apply gravity
    player.vel.y -= 9.8 * dt;
    player.pos.y += player.vel.y * dt;
    
    // Ground check
    if (player.pos.y <= 0) {
      player.pos.y = 0;
      player.vel.y = 0;
      player.onGround = true;
    }
    
    // Update yaw/pitch from input
    player.yaw = input.yaw;
    player.pitch = input.pitch;
  }

  handleShooting(player, input) {
    const weapon = WEAPONS[player.weapon];
    if (!weapon) return;
    
    // Check fire rate
    const now = Date.now();
    if (now - player.lastShot < 1000 / weapon.fireRate) return;
    
    // Check ammo
    if (player.ammo.clip <= 0) {
      this.handleReload(player);
      return;
    }
    
    player.lastShot = now;
    player.ammo.clip--;
    
    // Perform hit detection (lag compensated)
    const hitInfo = this.performHitScan(player, input);
    
    if (hitInfo) {
      this.applyDamage(hitInfo);
    }
    
    // Broadcast shot event
    this.room.io.to(this.room.id).emit('playerShot', {
      playerId: player.id,
      weapon: player.weapon,
      pos: player.pos,
      yaw: player.yaw,
      pitch: player.pitch,
      hitInfo
    });
  }

  performHitScan(player, input) {
    // Get rewound positions for lag compensation
    const rewindTick = input.tick;
    const rewoundPositions = this.getRewoundPositions(rewindTick);
    
    // Calculate ray from player's camera
    const rayOrigin = { ...player.pos, y: player.pos.y + 1.6 }; // Eye height
    const rayDir = this.getRayDirection(player.yaw, player.pitch);
    
    // Check intersection with all enemy players
    for (const [socketId, otherPlayer] of this.room.players) {
      if (otherPlayer.team === player.team || !otherPlayer.alive) continue;
      
      const pos = rewoundPositions.get(socketId) || otherPlayer.pos;
      
      // Simple sphere intersection check
      const dist = this.raySphereDistance(rayOrigin, rayDir, pos, 0.5);
      if (dist < 0.5) {
        // Calculate damage based on hit location
        const headshot = Math.abs(pos.y - rayOrigin.y) > 1.4;
        const damage = headshot ? weapon.dmg.head : weapon.dmg.body;
        
        return {
          victim: socketId,
          damage,
          headshot,
          weapon: player.weapon
        };
      }
    }
    
    return null;
  }

  applyDamage(hitInfo) {
    const victim = this.room.players.get(hitInfo.victim);
    if (!victim) return;
    
    // Apply damage to armor first
    let remainingDamage = hitInfo.damage;
    if (victim.armor > 0) {
      const armorDamage = Math.min(victim.armor, remainingDamage * 0.5);
      victim.armor -= armorDamage;
      remainingDamage -= armorDamage;
    }
    
    victim.hp -= remainingDamage;
    
    // Check for kill
    if (victim.hp <= 0) {
      victim.hp = 0;
      victim.alive = false;
      this.handleKill(hitInfo);
    }
    
    // Send damage event
    this.room.io.to(this.room.id).emit('playerDamaged', {
      victim: hitInfo.victim,
      damage: hitInfo.damage,
      headshot: hitInfo.headshot
    });
  }

  handleKill(hitInfo) {
    const killer = this.room.players.get(hitInfo.killer);
    const victim = this.room.players.get(hitInfo.victim);
    
    if (killer) {
      killer.kills++;
      killer.credits += 200; // Kill reward
    }
    
    if (victim) {
      victim.deaths++;
    }
    
    // Broadcast kill
    this.room.io.to(this.room.id).emit('kill', {
      killer: hitInfo.killer,
      victim: hitInfo.victim,
      weapon: hitInfo.weapon,
      headshot: hitInfo.headshot
    });
    
    // Check round end conditions
    this.room.roundManager.checkRoundEnd();
  }

  updateBots() {
    // Simple bot AI
    this.room.players.forEach((player, socketId) => {
      if (!player.isBot || !player.alive) return;
      
      // Find nearest enemy
      let nearestEnemy = null;
      let nearestDist = Infinity;
      
      this.room.players.forEach((other, otherId) => {
        if (other.team === player.team || !other.alive) return;
        
        const dx = other.pos.x - player.pos.x;
        const dz = other.pos.z - player.pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestEnemy = other;
        }
      });
      
      // Bot behavior based on state
      if (nearestEnemy && nearestDist < 20) {
        // Combat state - aim and shoot
        player.targetYaw = Math.atan2(
          nearestEnemy.pos.z - player.pos.z,
          nearestEnemy.pos.x - player.pos.x
        );
        player.yaw = player.targetYaw;
        
        // Shoot with some accuracy delay
        if (Math.random() < 0.02) {
          this.handleShooting(player, {
            yaw: player.yaw,
            pitch: 0,
            seq: this.tickCount
          });
        }
      } else {
        // Patrol state - move toward objective
        // Simplified for now
      }
    });
  }

  updatePhysics() {
    // Physics updates handled in processInputs
  }

  runHitDetection() {
    // Hit detection handled in handleShooting
  }

  updateGameState() {
    // Update round manager
    if (this.room.roundManager) {
      this.room.roundManager.update(this.tickInterval / 1000);
    }
  }

  broadcastState() {
    const state = this.getState();
    this.room.io.to(this.room.id).emit('snapshot', state);
  }

  getState() {
    return {
      tick: this.tickCount,
      phase: this.room.phase,
      timer: this.room.roundManager?.timer || 0,
      spikeTimer: this.room.roundManager?.spikeTimer || null,
      spikePlanted: this.room.roundManager?.spikePlanted || false,
      score: this.room.roundManager?.score || { atk: 0, def: 0 },
      round: this.room.roundManager?.round || 1,
      players: Array.from(this.room.players.values()).map(p => ({
        id: p.id,
        agentId: p.agentId,
        pos: p.pos || { x: 0, y: 0, z: 0 },
        yaw: p.yaw || 0,
        pitch: p.pitch || 0,
        hp: p.hp ?? 100,
        armor: p.armor ?? 0,
        alive: p.alive ?? true,
        weapon: p.weapon || 'classic',
        ammo: p.ammo || { clip: 12, reserve: 36 },
        credits: p.credits || 0,
        team: p.team,
        kills: p.kills || 0,
        deaths: p.deaths || 0
      }))
    };
  }

  storePosition(socketId, pos) {
    const history = this.positionHistory.get(socketId);
    history.push({
      tick: this.tickCount,
      pos: { ...pos }
    });
    
    // Keep only last 64 ticks (1 second)
    if (history.length > 64) {
      history.shift();
    }
  }

  getRewoundPositions(targetTick) {
    const positions = new Map();
    
    this.positionHistory.forEach((history, socketId) => {
      // Find closest position to target tick
      let closest = history[0];
      for (const entry of history) {
        if (Math.abs(entry.tick - targetTick) < Math.abs(closest.tick - targetTick)) {
          closest = entry;
        }
      }
      positions.set(socketId, closest?.pos || { x: 0, y: 0, z: 0 });
    });
    
    return positions;
  }

  cleanupPositionHistory() {
    const minTick = this.tickCount - 64;
    this.positionHistory.forEach((history, socketId) => {
      while (history.length > 0 && history[0].tick < minTick) {
        history.shift();
      }
    });
  }

  getRayDirection(yaw, pitch) {
    return {
      x: Math.cos(pitch) * Math.sin(yaw),
      y: Math.sin(pitch),
      z: Math.cos(pitch) * Math.cos(yaw)
    };
  }

  raySphereDistance(origin, dir, center, radius) {
    const oc = {
      x: origin.x - center.x,
      y: origin.y - center.y,
      z: origin.z - center.z
    };
    
    const a = dir.x * dir.x + dir.y * dir.y + dir.z * dir.z;
    const b = 2 * (oc.x * dir.x + oc.y * dir.y + oc.z * dir.z);
    const c = oc.x * oc.x + oc.y * oc.y + oc.z * oc.z - radius * radius;
    
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return Infinity;
    
    const t = (-b - Math.sqrt(discriminant)) / (2 * a);
    if (t < 0) return Infinity;
    
    const hitPoint = {
      x: origin.x + dir.x * t,
      y: origin.y + dir.y * t,
      z: origin.z + dir.z * t
    };
    
    const dx = hitPoint.x - center.x;
    const dy = hitPoint.y - center.y;
    const dz = hitPoint.z - center.z;
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  handleReload(player) {
    const weapon = WEAPONS[player.weapon];
    if (!weapon) return;
    
    if (player.isReloading) return;
    
    player.isReloading = true;
    
    setTimeout(() => {
      const needed = weapon.magSize - player.ammo.clip;
      const available = Math.min(needed, player.ammo.reserve);
      player.ammo.clip += available;
      player.ammo.reserve -= available;
      player.isReloading = false;
      
      this.room.io.to(this.room.id).emit('playerReloaded', {
        playerId: player.id,
        ammo: player.ammo
      });
    }, weapon.reload * 1000);
  }

  handleAbility(player, abilityKey) {
    // Ability handling would go here
    // For now, just acknowledge
    this.room.io.to(this.room.id).emit('abilityUsed', {
      playerId: player.id,
      ability: abilityKey
    });
  }

  handleInteract(player) {
    // Spike plant/defuse handling
    if (this.room.roundManager) {
      this.room.roundManager.handleInteract(player);
    }
  }

  stop() {
    this.running = false;
    clearInterval(this.loopId);
  }
}

module.exports = ServerGameLoop;
