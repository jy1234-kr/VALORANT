class ServerHitDetection {
  constructor(gameLoop) {
    this.gameLoop = gameLoop;
    this.positionHistory = new Map(); // socketId -> [{tick, pos}]
    this.maxHistoryTicks = 64; // Keep 1 second at 64 tick
  }

  storePosition(socketId, pos, tick) {
    if (!this.positionHistory.has(socketId)) {
      this.positionHistory.set(socketId, []);
    }
    
    const history = this.positionHistory.get(socketId);
    history.push({ tick, pos: { ...pos } });
    
    // Cleanup old entries
    while (history.length > this.maxHistoryTicks) {
      history.shift();
    }
  }

  rewindToTick(targetTick) {
    const rewoundPositions = new Map();
    
    this.positionHistory.forEach((history, socketId) => {
      // Find closest position to target tick
      let closest = history[0];
      let minDiff = Infinity;
      
      for (const entry of history) {
        const diff = Math.abs(entry.tick - targetTick);
        if (diff < minDiff) {
          minDiff = diff;
          closest = entry;
        }
      }
      
      if (closest) {
        rewoundPositions.set(socketId, closest.pos);
      }
    });
    
    return rewoundPositions;
  }

  performHitScan(shooter, input, rewoundPositions) {
    // Calculate ray from shooter's camera
    const rayOrigin = { 
      x: shooter.pos.x, 
      y: shooter.pos.y + 1.6, // Eye height
      z: shooter.pos.z 
    };
    
    const rayDir = {
      x: Math.cos(input.pitch) * Math.sin(input.yaw),
      y: Math.sin(input.pitch),
      z: Math.cos(input.pitch) * Math.cos(input.yaw)
    };
    
    // Check intersection with all enemy players
    let bestHit = null;
    let bestDist = Infinity;
    
    rewoundPositions.forEach((pos, victimId) => {
      const victim = this.gameLoop.room.players.get(victimId);
      if (!victim || victim.team === shooter.team || !victim.alive) return;
      
      // Simple sphere intersection (player hitbox)
      const hitDist = this.raySphereIntersection(rayOrigin, rayDir, pos, 0.5);
      
      if (hitDist !== null && hitDist.t < bestDist) {
        bestDist = hitDist.t;
        
        // Determine hit location for damage calculation
        const hitPoint = {
          x: rayOrigin.x + rayDir.x * hitDist.t,
          y: rayOrigin.y + rayDir.y * hitDist.t,
          z: rayOrigin.z + rayDir.z * hitDist.t
        };
        
        const headshot = Math.abs(hitPoint.y - (pos.y + 1.6)) < 0.3;
        const damage = this.calculateDamage(shooter.weapon, headshot);
        
        bestHit = {
          victim: victimId,
          damage,
          headshot,
          weapon: shooter.weapon,
          t: hitDist.t
        };
      }
    });
    
    return bestHit;
  }

  raySphereIntersection(origin, dir, center, radius) {
    const oc = {
      x: origin.x - center.x,
      y: origin.y - center.y,
      z: origin.z - center.z
    };
    
    const a = dir.x * dir.x + dir.y * dir.y + dir.z * dir.z;
    const b = 2 * (oc.x * dir.x + oc.y * dir.y + oc.z * dir.z);
    const c = oc.x * oc.x + oc.y * oc.y + oc.z * oc.z - radius * radius;
    
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;
    
    const sqrtDisc = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDisc) / (2 * a);
    const t2 = (-b + sqrtDisc) / (2 * a);
    
    if (t1 > 0) return { t: t1 };
    if (t2 > 0) return { t: t2 };
    
    return null;
  }

  calculateDamage(weaponKey, headshot) {
    const WEAPONS = require('../../client/weapons/WeaponData');
    const weapon = WEAPONS[weaponKey];
    
    if (!weapon) return 25; // Default damage
    
    if (headshot) {
      return weapon.dmg.head;
    }
    
    // Body shot - could add leg detection for reduced damage
    return weapon.dmg.body;
  }

  cleanup() {
    // Remove old position history periodically
    const currentTick = this.gameLoop.tickCount;
    const minTick = currentTick - this.maxHistoryTicks;
    
    this.positionHistory.forEach((history, socketId) => {
      while (history.length > 0 && history[0].tick < minTick) {
        history.shift();
      }
    });
  }
}

module.exports = ServerHitDetection;
