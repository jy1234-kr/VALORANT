class AgentSelect {
  constructor(game) {
    this.game = game;
    this.selectedAgent = null;
    this.lockedIn = false;
    this.timeLeft = 60;
    this.agentData = this.getAgentData();
    
    this.setupEventListeners();
  }
  
  getAgentData() {
    return {
      jett: { name: 'Jett', role: 'Duelist', color: '#5DBFFF', abilities: { C: 'Cloudburst', Q: 'Updraft', E: 'Tailwind', X: 'Blade Storm' } },
      reyna: { name: 'Reyna', role: 'Duelist', color: '#9D52B8', abilities: { C: 'Leer', Q: 'Devour', E: 'Dismiss', X: 'Empress' } },
      phoenix: { name: 'Phoenix', role: 'Duelist', color: '#F4A840', abilities: { C: 'Curveball', Q: 'Blaze', E: 'Hot Hands', X: 'Run It Back' } },
      raze: { name: 'Raze', role: 'Duelist', color: '#E87336', abilities: { C: 'Boom Bot', Q: 'Blast Pack', E: 'Paint Shells', X: 'Showstopper' } },
      yoru: { name: 'Yoru', role: 'Duelist', color: '#2E5EC8', abilities: { C: 'Fakeout', Q: 'Gatecrash', E: 'Blindside', X: 'Dimensional Drift' } },
      neon: { name: 'Neon', role: 'Duelist', color: '#00EAFF', abilities: { C: 'Fast Lane', Q: 'Relay Bolt', E: 'High Gear', X: 'Overdrive' } },
      iso: { name: 'Iso', role: 'Duelist', color: '#00D9F7', abilities: { C: 'Contingency', Q: 'Undercut', E: 'Double Tap', X: 'Kill Contract' } },
      sova: { name: 'Sova', role: 'Initiator', color: '#41D9D4', abilities: { C: 'Shock Bolt', Q: 'Owl Drone', E: 'Recon Bolt', X: "Hunter's Fury" } },
      breach: { name: 'Breach', role: 'Initiator', color: '#F58C38', abilities: { C: 'Aftershock', Q: 'Flashpoint', E: 'Fault Line', X: 'Rolling Thunder' } },
      skye: { name: 'Skye', role: 'Initiator', color: '#98D937', abilities: { C: 'Regrowth', Q: 'Trailblazer', E: 'Guiding Light', X: 'Seekers' } },
      kayo: { name: 'KAY/O', role: 'Initiator', color: '#3C52B5', abilities: { C: 'FRAG/ment', Q: 'FLASH/drive', E: 'ZERO/point', X: 'NULL/cmd' } },
      fade: { name: 'Fade', role: 'Initiator', color: '#8B52B5', abilities: { C: 'Seize', Q: 'Haunt', E: 'Prowler', X: 'Nightfall' } },
      gekko: { name: 'Gekko', role: 'Initiator', color: '#60D952', abilities: { C: 'Wingman', Q: 'Dizzy', E: 'Mosh Pit', X: 'Thrash' } },
      brimstone: { name: 'Brimstone', role: 'Controller', color: '#4052B5', abilities: { C: 'Incendiary', Q: 'Sky Smoke', E: 'Stim Beacon', X: 'Orbital Strike' } },
      viper: { name: 'Viper', role: 'Controller', color: '#42B552', abilities: { C: 'Snake Bite', Q: 'Poison Cloud', E: 'Toxic Screen', X: "Viper's Pit" } },
      omen: { name: 'Omen', role: 'Controller', color: '#5252B5', abilities: { C: 'Shrouded Step', Q: 'Paranoia', E: 'Dark Cover', X: 'From the Shadows' } },
      astra: { name: 'Astra', role: 'Controller', color: '#B552A8', abilities: { C: 'Gravity Well', Q: 'Nova Pulse', E: 'Nebula', X: 'Cosmic Divide' } },
      harbor: { name: 'Harbor', role: 'Controller', color: '#00A8D9', abilities: { C: 'Cove', Q: 'High Tide', E: 'Cascade', X: 'Reckoning' } },
      clove: { name: 'Clove', role: 'Controller', color: '#A852D9', abilities: { C: 'Pick-Me-Up', Q: 'Meddle', E: 'Ruse', X: 'Not Dead Yet' } },
      sage: { name: 'Sage', role: 'Sentinel', color: '#52D9C8', abilities: { C: 'Barrier Orb', Q: 'Slow Orb', E: 'Healing Orb', X: 'Resurrection' } },
      cypher: { name: 'Cypher', role: 'Sentinel', color: '#D9C852', abilities: { C: 'Trapwire', Q: 'Cyber Cage', E: 'Spycam', X: 'Neural Theft' } },
      killjoy: { name: 'Killjoy', role: 'Sentinel', color: '#D9A852', abilities: { C: 'Nanoswarm', Q: 'Alarmbot', E: 'Turret', X: 'Lockdown' } },
      chamber: { name: 'Chamber', role: 'Sentinel', color: '#D97852', abilities: { C: 'Trademark', Q: 'Headhunter', E: 'Rendezvous', X: 'Tour de Force' } },
      deadlock: { name: 'Deadlock', role: 'Sentinel', color: '#529ED9', abilities: { C: 'Barrier Mesh', Q: 'Sonic Sensor', E: 'GravNet', X: 'Annihilation' } },
      vyse: { name: 'Vyse', role: 'Sentinel', color: '#D9528B', abilities: { C: 'Razorvine', Q: 'Arc Rose', E: 'Shear', X: 'Steel Garden' } }
    };
  }
  
  setupEventListeners() {
    // Lock in button
    document.getElementById('lock-in-btn')?.addEventListener('click', () => {
      this.lockIn();
    });
  }
  
  init(roomState) {
    this.renderAgentGrid();
    this.updateTeamDisplay(roomState.players);
    this.startTimer(60);
  }
  
  renderAgentGrid() {
    const grid = document.getElementById('agent-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    Object.entries(this.agentData).forEach(([key, agent]) => {
      const card = document.createElement('div');
      card.className = 'agent-card';
      card.dataset.agentId = key;
      
      card.innerHTML = `
        <div class="agent-initial" style="color: ${agent.color}">${agent.name[0]}</div>
        <div class="agent-name">${agent.name}</div>
      `;
      
      card.addEventListener('click', () => {
        this.selectAgent(key);
      });
      
      grid.appendChild(card);
    });
  }
  
  selectAgent(agentId) {
    if (this.lockedIn) return;
    
    this.selectedAgent = agentId;
    
    // Update visual selection
    document.querySelectorAll('.agent-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.agentId === agentId);
    });
    
    // Update preview
    this.updatePreview(agentId);
    
    // Enable lock in button
    const lockBtn = document.getElementById('lock-in-btn');
    if (lockBtn) {
      lockBtn.disabled = false;
    }
    
    // Send selection to server
    this.game.networkManager.selectAgent(agentId);
  }
  
  updatePreview(agentId) {
    const agent = this.agentData[agentId];
    if (!agent) return;
    
    document.getElementById('preview-name').textContent = agent.name;
    document.getElementById('preview-role').textContent = agent.role;
    document.getElementById('preview-c').textContent = agent.abilities.C;
    document.getElementById('preview-q').textContent = agent.abilities.Q;
    document.getElementById('preview-e').textContent = agent.abilities.E;
    document.getElementById('preview-x').textContent = agent.abilities.X;
  }
  
  updateTeamDisplay(players) {
    const atkContainer = document.getElementById('atk-team-agents');
    const defContainer = document.getElementById('def-team-agents');
    
    if (!atkContainer || !defContainer) return;
    
    atkContainer.innerHTML = '';
    defContainer.innerHTML = '';
    
    players.forEach(player => {
      const dot = document.createElement('div');
      dot.className = 'agent-dot';
      dot.style.backgroundColor = player.agentId ? this.agentData[player.agentId]?.color : '#333';
      dot.textContent = player.agentId ? this.agentData[player.agentId]?.name[0] : '?';
      
      if (player.team === 'atk') {
        atkContainer.appendChild(dot);
      } else {
        defContainer.appendChild(dot);
      }
    });
  }
  
  lockIn() {
    if (!this.selectedAgent || this.lockedIn) return;
    
    this.lockedIn = true;
    this.game.networkManager.lockInAgent();
    
    document.getElementById('lock-in-btn').textContent = 'LOCKED IN';
    document.getElementById('lock-in-btn').disabled = true;
  }
  
  startTimer(duration) {
    this.timeLeft = duration;
    const timerEl = document.getElementById('agent-timer');
    
    if (!timerEl) return;
    
    timerEl.textContent = this.timeLeft;
    
    const interval = setInterval(() => {
      this.timeLeft--;
      timerEl.textContent = this.timeLeft;
      
      if (this.timeLeft <= 10) {
        timerEl.style.color = '#ff0000';
      }
      
      if (this.timeLeft <= 0) {
        clearInterval(interval);
        // Auto-lock current selection or random
        if (!this.lockedIn && this.selectedAgent) {
          this.lockIn();
        }
      }
    }, 1000);
  }
  
  updateAgentSelection(data) {
    // Mark agent as taken for teammates
    const card = document.querySelector(`.agent-card[data-agent-id="${data.agentId}"]`);
    if (card) {
      card.classList.add('locked');
    }
  }
  
  markLocked(data) {
    // Player has locked in their agent
    console.log(`${data.playerId} locked in`);
  }
  
  startSelection(duration) {
    this.lockedIn = false;
    this.selectedAgent = null;
    document.getElementById('lock-in-btn').disabled = true;
    document.getElementById('lock-in-btn').textContent = 'LOCK IN';
    this.startTimer(duration);
  }
}

export { AgentSelect };
