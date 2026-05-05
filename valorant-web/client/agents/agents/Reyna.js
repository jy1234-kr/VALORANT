import { BaseAgent } from '../AgentData.js';

class Reyna extends BaseAgent {
  constructor() {
    super('reyna', 'Reyna', 'Duelist', '#9D52B8');
    
    this.setAbility('C', {
      name: 'Leer',
      cost: 200,
      maxCharges: 2,
      charges: 2,
      cooldown: 0,
      duration: 3.0,
      description: 'Place eye that nearsights enemies looking at it',
      execute: (game, player) => {
        game.networkManager.socket.emit('useAbility', { ability: 'C' });
      }
    });
    
    this.setAbility('Q', {
      name: 'Devour',
      cost: 100,
      maxCharges: 4,
      charges: 4,
      cooldown: 0,
      duration: 3.0,
      description: 'Consume soul orb to heal',
      execute: (game, player) => {
        player.healing = true;
        setTimeout(() => { 
          player.hp = Math.min(100, player.hp + 50);
          player.healing = false;
        }, 3000);
      }
    });
    
    this.setAbility('E', {
      name: 'Dismiss',
      cost: 100,
      maxCharges: 4,
      charges: 4,
      cooldown: 0,
      duration: 1.5,
      description: 'Become intangible and invulnerable',
      execute: (game, player) => {
        player.invincible = true;
        player.invisible = true;
        setTimeout(() => {
          player.invincible = false;
          player.invisible = false;
        }, 1500);
      }
    });
    
    this.setAbility('X', {
      name: 'Empress',
      cost: 6,
      maxCharges: 1,
      charges: 1,
      cooldown: 0,
      duration: 15.0,
      description: 'Enhanced speed, instant equip/reload, auto soul orbs',
      execute: (game, player) => {
        player.empowered = true;
        player.fireRateBoost = 1.25;
        setTimeout(() => {
          player.empowered = false;
          player.fireRateBoost = 1.0;
        }, 15000);
      }
    });
  }
}

export { Reyna };
