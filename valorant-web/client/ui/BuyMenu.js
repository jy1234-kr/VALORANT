import { WEAPONS, ARMOR } from '../weapons/WeaponData.js';

class BuyMenu {
  constructor(game) {
    this.game = game;
    this.visible = false;
    this.currentCategory = 'rifles';
    this.cart = {
      primary: null,
      secondary: null,
      armor: null,
      abilities: []
    };
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Close button
    document.getElementById('close-buy-menu')?.addEventListener('click', () => {
      this.hide();
    });
    
    // Category buttons
    document.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchCategory(e.target.dataset.category);
      });
    });
  }
  
  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  show() {
    if (this.game.gameState.phase !== 'BUY') return;
    
    document.getElementById('buy-menu')?.classList.remove('hidden');
    this.visible = true;
    this.game.exitPointerLock();
    
    this.refreshDisplay();
  }
  
  hide() {
    document.getElementById('buy-menu')?.classList.add('hidden');
    this.visible = false;
    this.game.canvas.requestPointerLock();
  }
  
  switchCategory(category) {
    this.currentCategory = category;
    
    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
    
    this.renderWeapons();
  }
  
  refreshDisplay() {
    const player = this.getCurrentPlayer();
    if (!player) return;
    
    // Update credits display
    const creditsEl = document.getElementById('buy-credits-value');
    if (creditsEl) {
      creditsEl.textContent = (player.credits || 0).toLocaleString();
    }
    
    // Update loadout display
    this.updateLoadoutDisplay();
    
    // Render weapons for current category
    this.renderWeapons();
  }
  
  getCurrentPlayer() {
    return this.game.gameState.players?.find(
      p => p.id === this.game.gameState.localPlayerId
    );
  }
  
  renderWeapons() {
    const grid = document.getElementById('weapon-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    let items = [];
    
    switch (this.currentCategory) {
      case 'sidearms':
        items = Object.entries(WEAPONS).filter(([_, w]) => w.type === 'sidearm');
        break;
      case 'smgs':
        items = Object.entries(WEAPONS).filter(([_, w]) => w.type === 'smg');
        break;
      case 'shotguns':
        items = Object.entries(WEAPONS).filter(([_, w]) => w.type === 'shotgun');
        break;
      case 'rifles':
        items = Object.entries(WEAPONS).filter(([_, w]) => w.type === 'rifle');
        break;
      case 'snipers':
        items = Object.entries(WEAPONS).filter(([_, w]) => w.type === 'sniper');
        break;
      case 'lmgs':
        items = Object.entries(WEAPONS).filter(([_, w]) => w.type === 'lmg');
        break;
      case 'shields':
        items = Object.entries(ARMOR).map(([key, item]) => [key, { ...item, type: 'shield' }]);
        break;
      case 'abilities':
        // Would render agent abilities
        grid.innerHTML = '<div style="padding: 2rem; text-align: center;">Abilities unlocked during round</div>';
        return;
    }
    
    items.forEach(([key, weapon]) => {
      const card = this.createWeaponCard(key, weapon);
      grid.appendChild(card);
    });
  }
  
  createWeaponCard(key, weapon) {
    const card = document.createElement('div');
    card.className = 'weapon-card';
    
    const player = this.getCurrentPlayer();
    const canAfford = player && (player.credits >= weapon.price);
    const alreadyOwned = this.cart.primary === key || this.cart.secondary === key;
    
    if (alreadyOwned) {
      card.classList.add('owned');
    } else if (canAfford) {
      card.classList.add('affordable');
    } else {
      card.classList.add('too-expensive');
    }
    
    const isShield = weapon.type === 'shield';
    
    card.innerHTML = `
      <div class="weapon-silhouette">${isShield ? '🛡' : '🔫'}</div>
      <div class="weapon-name-small">${weapon.name}</div>
      <div class="weapon-price">${weapon.price} ¢</div>
      ${!isShield ? `
      <div class="weapon-stats">
        ❤ ${weapon.dmg.head} 💨 ${weapon.dmg.body} 🦵 ${weapon.dmg.legs}
      </div>
      <div class="weapon-stats">
        Mag ${weapon.magSize} · ${weapon.fireRate}/s
      </div>
      <div class="fire-rate-bar">
        <div class="fire-rate-fill" style="width: ${Math.min(100, weapon.fireRate * 5)}%"></div>
      </div>
      ` : ''}
      <button class="buy-weapon-btn" ${!canAfford || alreadyOwned ? 'disabled' : ''}>
        ${alreadyOwned ? 'OWNED' : 'PURCHASE'}
      </button>
    `;
    
    card.querySelector('.buy-weapon-btn')?.addEventListener('click', () => {
      this.purchaseWeapon(key, weapon);
    });
    
    return card;
  }
  
  purchaseWeapon(key, weapon) {
    const player = this.getCurrentPlayer();
    if (!player || player.credits < weapon.price) return;
    
    if (weapon.type === 'shield') {
      this.cart.armor = key;
    } else if (weapon.type === 'sidearm') {
      this.cart.secondary = key;
    } else {
      this.cart.primary = key;
    }
    
    // Send buy request to server
    this.game.networkManager.socket.emit('input', {
      seq: Date.now(),
      buyWeapon: key
    });
    
    this.refreshDisplay();
  }
  
  updateLoadoutDisplay() {
    const primaryEl = document.getElementById('loadout-primary');
    const secondaryEl = document.getElementById('loadout-secondary');
    const armorEl = document.getElementById('loadout-armor');
    const totalEl = document.getElementById('loadout-total');
    
    if (primaryEl) {
      primaryEl.textContent = this.cart.primary 
        ? WEAPONS[this.cart.primary]?.name || this.cart.primary 
        : 'CLASSIC';
    }
    
    if (secondaryEl) {
      secondaryEl.textContent = this.cart.secondary 
        ? WEAPONS[this.cart.secondary]?.name || this.cart.secondary 
        : '-';
    }
    
    if (armorEl) {
      armorEl.textContent = this.cart.armor 
        ? ARMOR[this.cart.armor]?.name || this.cart.armor 
        : 'NONE';
    }
    
    if (totalEl) {
      let total = 0;
      if (this.cart.primary) total += WEAPONS[this.cart.primary]?.price || 0;
      if (this.cart.secondary) total += WEAPONS[this.cart.secondary]?.price || 0;
      if (this.cart.armor) total += ARMOR[this.cart.armor]?.price || 0;
      totalEl.textContent = total.toLocaleString();
    }
  }
  
  getWeaponData(weaponKey) {
    return WEAPONS[weaponKey] || null;
  }
}

export { BuyMenu };
