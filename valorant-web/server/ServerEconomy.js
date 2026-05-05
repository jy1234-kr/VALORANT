class ServerEconomy {
  constructor() {
    this.roundWinCredits = 3000;
    this.lossBonusBase = 1900;
    this.lossBonusIncrement = 500;
    this.maxLossBonus = 2900;
    this.killReward = 200;
    this.plantBonus = 300;
    this.defuseBonus = 300;
    this.startingCredits = 800;
    
    this.consecutiveLosses = {
      atk: 0,
      def: 0
    };
  }

  calculateRoundRewards(winningTeam, players) {
    const rewards = [];
    
    players.forEach(player => {
      let reward = 0;
      
      if (player.team === winningTeam) {
        // Round win
        reward += this.roundWinCredits;
        this.consecutiveLosses[player.team] = 0;
      } else {
        // Loss bonus (stacks)
        this.consecutiveLosses[player.team]++;
        const lossBonus = Math.min(
          this.lossBonusBase + ((this.consecutiveLosses[player.team] - 1) * this.lossBonusIncrement),
          this.maxLossBonus
        );
        reward += lossBonus;
      }
      
      rewards.push({
        playerId: player.id,
        credits: reward
      });
    });
    
    return rewards;
  }

  applyKillReward(player) {
    return this.killReward;
  }

  applyPlantBonus(player) {
    return this.plantBonus;
  }

  applyDefuseBonus(player) {
    return this.defuseBonus;
  }

  getStartingCredits() {
    return this.startingCredits;
  }

  reset() {
    this.consecutiveLosses = { atk: 0, def: 0 };
  }

  halftimeReset() {
    // Reset loss bonuses at halftime
    this.reset();
  }

  overtimeSetup(players) {
    // Set all players to 5000 credits for overtime
    players.forEach(player => {
      player.credits = 5000;
    });
  }
}

module.exports = ServerEconomy;
