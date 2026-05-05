class ServerSpikeSystem {
  constructor(roundManager) {
    this.roundManager = roundManager;
    this.spikeState = 'NOT_PLANTED'; // NOT_PLANTED, PLANTING, PLANTED, DEFUSING, DEFUSED, EXPLODED
    this.spikePos = null;
    this.plantProgress = 0;
    this.defuseProgress = 0;
    this.plantTime = 4.2;
    this.defuseTime = 7.0;
    this.explosionTime = 45.0;
  }

  startPlant(player) {
    if (this.spikeState !== 'NOT_PLANTED') return false;
    if (!player.hasSpike) return false;
    
    this.spikeState = 'PLANTING';
    this.plantProgress = 0;
    this.spikePos = { ...player.pos };
    
    return true;
  }

  updatePlant(dt) {
    if (this.spikeState !== 'PLANTING') return;
    
    this.plantProgress += dt;
    
    if (this.plantProgress >= this.plantTime) {
      this.completePlant();
    }
  }

  completePlant() {
    this.spikeState = 'PLANTED';
    this.roundManager.spikePlanted = true;
    this.roundManager.spikeTimer = this.explosionTime;
    this.roundManager.phase = 'PLANTED';
    
    // Award plant bonus
    const planter = this.getPlanter();
    if (planter) {
      planter.credits += 300;
    }
  }

  startDefuse(player) {
    if (this.spikeState !== 'PLANTED') return false;
    if (player.team !== 'def') return false;
    
    const dist = this.distanceToSpike(player.pos);
    if (dist > 1.5) return false;
    
    this.spikeState = 'DEFUSING';
    this.defuseProgress = 0;
    
    return true;
  }

  updateDefuse(dt) {
    if (this.spikeState !== 'DEFUSING') return;
    
    this.defuseProgress += dt;
    
    if (this.defuseProgress >= this.defuseTime) {
      this.completeDefuse();
    }
  }

  completeDefuse() {
    this.spikeState = 'DEFUSED';
    this.roundManager.endRound('def', 'defused');
  }

  interruptPlant() {
    if (this.spikeState === 'PLANTING') {
      this.spikeState = 'NOT_PLANTED';
      this.plantProgress = 0;
    }
  }

  interruptDefuse() {
    if (this.spikeState === 'DEFUSING') {
      this.spikeState = 'PLANTED';
      this.defuseProgress = 0;
    }
  }

  distanceToSpike(pos) {
    if (!this.spikePos) return Infinity;
    
    return Math.sqrt(
      Math.pow(pos.x - this.spikePos.x, 2) +
      Math.pow(pos.z - this.spikePos.z, 2)
    );
  }

  getPlanter() {
    // Would track who started planting
    return null;
  }

  reset() {
    this.spikeState = 'NOT_PLANTED';
    this.spikePos = null;
    this.plantProgress = 0;
    this.defuseProgress = 0;
  }
}

module.exports = ServerSpikeSystem;
