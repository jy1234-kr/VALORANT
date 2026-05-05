import { BaseAgent } from '../AgentData.js';

class Jett extends BaseAgent {
  constructor() {
    super('jett', 'Jett', 'Duelist', '#5DBFFF');
    
    this.setAbility('C', {
      name: 'Cloudburst',
      cost: 200,
      maxCharges: 3,
      charges: 3,
      cooldown: 0,
      duration: 4.5,
      description: 'Throw smoke orb that curls to crosshair',
      execute: (game, player) => {
        // Create smoke effect at target location
        game.networkManager.socket.emit('useAbility', {
          ability: 'C',
          targetPos: player.pos
        });
      }
    });
    
    this.setAbility('Q', {
      name: 'Updraft',
      cost: 150,
      maxCharges: 2,
      charges: 2,
      cooldown: 0,
      duration: 0,
      description: 'Propel upward instantly',
      execute: (game, player) => {
        player.vel.y = 8.0;
        player.onGround = false;
      }
    });
    
    this.setAbility('E', {
      name: 'Tailwind',
      cost: 0,
      maxCharges: 2,
      charges: 2,
      cooldown: 0,
      rechargeOnKill: true,
      duration: 0.2,
      description: 'Dash in movement direction',
      execute: (game, player) => {
        // Dash forward
        const dashSpeed = 15.0;
        player.vel.x = Math.sin(player.yaw) * dashSpeed;
        player.vel.z = Math.cos(player.yaw) * dashSpeed;
        player.invincible = true;
        setTimeout(() => { player.invincible = false; }, 200);
      }
    });
    
    this.setAbility('X', {
      name: 'Blade Storm',
      cost: 7,
      maxCharges: 1,
      charges: 1,
      cooldown: 0,
      duration: 0,
      description: 'Equip throwing knives, kills refresh',
      execute: (game, player) => {
        player.equippedWeapon = 'knives';
        player.knivesRemaining = 5;
      }
    });
  }
}

export { Jett };
