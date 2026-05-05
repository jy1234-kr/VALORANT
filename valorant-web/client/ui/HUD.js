class HUD {
  constructor(game) {
    this.game = game;
    this.scoreboardVisible = false;
    this.currentSnapshot = null;
  }
  
  update(snapshot) {
    this.currentSnapshot = snapshot;
    
    // Update score
    const atkScoreEl = document.getElementById('atk-score');
    const defScoreEl = document.getElementById('def-score');
    if (atkScoreEl && defScoreEl) {
      atkScoreEl.textContent = snapshot.score?.atk || 0;
      defScoreEl.textContent = snapshot.score?.def || 0;
    }
    
    // Update round number
    const roundEl = document.getElementById('round-number');
    if (roundEl) {
      roundEl.textContent = `Round ${snapshot.round || 1}`;
    }
    
    // Update timer
    const timerEl = document.getElementById('round-timer');
    if (timerEl) {
      const minutes = Math.floor(snapshot.timer / 60);
      const seconds = Math.floor(snapshot.timer % 60);
      timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      if (snapshot.timer < 30) {
        timerEl.classList.add('warning');
      } else {
        timerEl.classList.remove('warning');
      }
    }
    
    // Update spike status
    const spikeStatusEl = document.getElementById('spike-status');
    const spikeTimerEl = document.getElementById('spike-timer');
    if (spikeStatusEl && spikeTimerEl) {
      if (snapshot.spikePlanted) {
        spikeStatusEl.classList.remove('hidden');
        spikeTimerEl.classList.remove('hidden');
        spikeTimerEl.textContent = (snapshot.spikeTimer || 0).toFixed(1);
      } else {
        spikeStatusEl.classList.add('hidden');
        spikeTimerEl.classList.add('hidden');
      }
    }
    
    // Update team list
    this.updateTeamList(snapshot.players);
    
    // Update player stats
    this.updatePlayerStats(snapshot);
  }
  
  updateTeamList(players) {
    const atkList = document.getElementById('atk-team-list');
    if (!atkList) return;
    
    atkList.innerHTML = '';
    
    players.forEach(player => {
      const el = document.createElement('div');
      el.className = `team-player ${!player.alive ? 'dead' : ''}`;
      
      const hpPercent = (player.hp / 100) * 100;
      
      el.innerHTML = `
        <div class="agent-icon" style="background-color: ${this.getAgentColor(player.agentId)}"></div>
        <span class="player-name">${player.name}</span>
        <div class="hp-bar">
          <div class="hp-fill" style="width: ${hpPercent}%"></div>
        </div>
        <span class="hp-value">${player.hp}</span>
      `;
      
      atkList.appendChild(el);
    });
  }
  
  updatePlayerStats(snapshot) {
    const localPlayer = snapshot.players?.find(p => p.id === this.game.gameState.localPlayerId);
    if (!localPlayer) return;
    
    // Update health
    const healthFill = document.getElementById('health-fill');
    const healthText = document.getElementById('health-text');
    if (healthFill && healthText) {
      healthFill.style.width = `${(localPlayer.hp / 100) * 100}%`;
      healthText.textContent = localPlayer.hp;
    }
    
    // Update armor
    const armorValue = document.getElementById('armor-value');
    if (armorValue) {
      armorValue.textContent = localPlayer.armor || 0;
    }
    
    // Update credits
    const creditsDisplay = document.getElementById('credits-display');
    if (creditsDisplay) {
      creditsDisplay.textContent = `${(localPlayer.credits || 0).toLocaleString()} ¢`;
    }
    
    // Update ammo
    const ammoClip = document.getElementById('ammo-clip');
    const ammoReserve = document.getElementById('ammo-reserve');
    const ammoBarFill = document.getElementById('ammo-bar-fill');
    
    if (ammoClip && ammoReserve && ammoBarFill && localPlayer.ammo) {
      ammoClip.textContent = localPlayer.ammo.clip;
      ammoReserve.textContent = localPlayer.ammo.reserve;
      
      const weapon = this.game.buyMenu?.getWeaponData(localPlayer.weapon);
      if (weapon) {
        const percent = (localPlayer.ammo.clip / weapon.magSize) * 100;
        ammoBarFill.style.width = `${percent}%`;
      }
    }
    
    // Update weapon name
    const weaponName = document.getElementById('weapon-name');
    if (weaponName && localPlayer.weapon) {
      const weapon = this.game.buyMenu?.getWeaponData(localPlayer.weapon);
      weaponName.textContent = weapon?.name?.toUpperCase() || localPlayer.weapon.toUpperCase();
    }
    
    // Update abilities
    this.updateAbilities(localPlayer.abilities);
  }
  
  updateAbilities(abilities) {
    if (!abilities) return;
    
    ['C', 'Q', 'E', 'X'].forEach(key => {
      const costEl = document.getElementById(`ability-${key.toLowerCase()}-cost`);
      const cooldownEl = document.getElementById(`ability-${key.toLowerCase()}-cooldown`);
      
      if (costEl && abilities[key]) {
        if (abilities[key].ready) {
          costEl.textContent = 'READY';
          cooldownEl.style.height = '0%';
        } else if (abilities[key].charges !== undefined) {
          costEl.textContent = `×${abilities[key].charges}`;
        } else if (abilities[key].cost) {
          costEl.textContent = abilities[key].cost;
        }
      }
    });
  }
  
  addKillFeedEntry(killData) {
    const killFeed = document.getElementById('kill-feed');
    if (!killFeed) return;
    
    const entry = document.createElement('div');
    entry.className = 'kill-entry';
    if (killData.headshot) {
      entry.classList.add('headshot');
    }
    
    const killer = this.getPlayerName(killData.killer);
    const victim = this.getPlayerName(killData.victim);
    
    entry.innerHTML = `
      <span class="killer">${killer}</span>
      <span class="weapon-icon">🔫</span>
      <span class="victim">${victim}</span>
    `;
    
    killFeed.appendChild(entry);
    
    // Remove after 4 seconds
    setTimeout(() => {
      entry.classList.add('fade-out');
      setTimeout(() => entry.remove(), 500);
    }, 4000);
    
    // Keep only last 5 entries
    while (killFeed.children.length > 5) {
      killFeed.firstChild.remove();
    }
  }
  
  getPlayerName(playerId) {
    const player = this.currentSnapshot?.players?.find(p => p.id === playerId);
    return player ? player.name : 'Unknown';
  }
  
  getAgentColor(agentId) {
    const colors = {
      jett: '#5DBFFF',
      reyna: '#9D52B8',
      phoenix: '#F4A840',
      raze: '#E87336',
      yoru: '#2E5EC8',
      neon: '#00EAFF',
      iso: '#00D9F7',
      sova: '#41D9D4',
      breach: '#F58C38',
      skye: '#98D937',
      kayo: '#3C52B5',
      fade: '#8B52B5',
      gekko: '#60D952',
      brimstone: '#4052B5',
      viper: '#42B552',
      omen: '#5252B5',
      astra: '#B552A8',
      harbor: '#00A8D9',
      clove: '#A852D9',
      sage: '#52D9C8',
      cypher: '#D9C852',
      killjoy: '#D9A852',
      chamber: '#D97852',
      deadlock: '#529ED9',
      vyse: '#D9528B'
    };
    return colors[agentId] || '#888888';
  }
  
  showDamageNumber(damage, headshot) {
    const container = document.getElementById('damage-numbers');
    if (!container) return;
    
    const el = document.createElement('div');
    el.className = `damage-number ${headshot ? 'headshot' : 'body'}`;
    el.textContent = damage;
    
    // Position in center of screen (would be more accurate with world position)
    el.style.left = '50%';
    el.style.top = '50%';
    el.style.transform = 'translate(-50%, -50%)';
    
    container.appendChild(el);
    
    setTimeout(() => el.remove(), 800);
  }
  
  showBuyTimer(duration) {
    const buyTimer = document.getElementById('buy-timer');
    if (!buyTimer) return;
    
    let timeLeft = duration;
    buyTimer.textContent = `0:${timeLeft.toString().padStart(2, '0')}`;
    
    const interval = setInterval(() => {
      timeLeft--;
      buyTimer.textContent = `0:${timeLeft.toString().padStart(2, '0')}`;
      
      if (timeLeft <= 0) {
        clearInterval(interval);
      }
    }, 1000);
  }
  
  showSpikeStatus(planted) {
    const spikeStatus = document.getElementById('spike-status');
    const spikeTimer = document.getElementById('spike-timer');
    
    if (planted) {
      spikeStatus?.classList.remove('hidden');
      spikeTimer?.classList.remove('hidden');
    } else {
      spikeStatus?.classList.add('hidden');
      spikeTimer?.classList.add('hidden');
    }
  }
  
  showRoundBanner(text) {
    const banner = document.getElementById('round-banner');
    const bannerText = document.getElementById('round-banner-text');
    
    if (banner && bannerText) {
      bannerText.textContent = text;
      banner.classList.remove('hidden');
      
      setTimeout(() => {
        banner.classList.add('hidden');
      }, 3000);
    }
  }
  
  showRoundEnd(data) {
    const screen = document.getElementById('round-end-screen');
    const resultText = document.getElementById('round-end-result');
    const killsEl = document.getElementById('round-kills');
    const damageEl = document.getElementById('round-damage');
    const creditsEl = document.getElementById('round-credits');
    
    if (!screen) return;
    
    const isVictory = data.winner === (this.game.gameState.localPlayerTeam);
    resultText.textContent = isVictory ? 'VICTORY' : 'DEFEAT';
    resultText.className = isVictory ? 'victory' : 'defeat';
    
    // Would populate with actual stats
    killsEl.textContent = '0';
    damageEl.textContent = '0';
    creditsEl.textContent = '0';
    
    screen.classList.remove('hidden');
    
    setTimeout(() => {
      screen.classList.add('hidden');
    }, 5000);
  }
  
  showMatchEnd(data) {
    alert(`Match Over!\nWinner: ${data.winner}\nFinal Score: ${data.finalScore.atk} - ${data.finalScore.def}`);
    this.game.exitPointerLock();
    this.game.showScreen('main-menu');
  }
  
  toggleScoreboard() {
    this.scoreboardVisible = !this.scoreboardVisible;
    const scoreboard = document.getElementById('scoreboard');
    
    if (!scoreboard) return;
    
    if (this.scoreboardVisible) {
      scoreboard.classList.remove('hidden');
      this.updateScoreboardContent();
    } else {
      scoreboard.classList.add('hidden');
    }
  }
  
  updateScoreboardContent() {
    const atkBody = document.getElementById('scoreboard-atk-body');
    const defBody = document.getElementById('scoreboard-def-body');
    
    if (!atkBody || !defBody) return;
    
    atkBody.innerHTML = '';
    defBody.innerHTML = '';
    
    const players = this.currentSnapshot?.players || [];
    
    players.forEach(player => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${player.agentId || '???'}</td>
        <td>${player.name}</td>
        <td>${Math.floor(Math.random() * 300)}</td>
        <td>${player.kills || 0}</td>
        <td>${player.deaths || 0}</td>
        <td>${player.assists || 0}</td>
        <td>${Math.floor(Math.random() * 50)}%</td>
        <td>${(player.credits || 0).toLocaleString()}</td>
      `;
      
      if (player.team === 'atk') {
        atkBody.appendChild(row);
      } else {
        defBody.appendChild(row);
      }
    });
  }
  
  updateAmmo(ammo) {
    const ammoClip = document.getElementById('ammo-clip');
    const ammoReserve = document.getElementById('ammo-reserve');
    
    if (ammoClip) ammoClip.textContent = ammo.clip;
    if (ammoReserve) ammoReserve.textContent = ammo.reserve;
  }
}

export { HUD };
