// Base Agent class that all agents extend
class BaseAgent {
  constructor(agentId, name, role, color) {
    this.agentId = agentId;
    this.name = name;
    this.role = role; // duelist, initiator, controller, sentinel
    this.color = color;
    this.abilities = {
      C: null,
      Q: null,
      E: null,
      X: null
    };
  }
  
  setAbility(key, ability) {
    this.abilities[key] = ability;
  }
  
  executeAbility(key, game, player) {
    const ability = this.abilities[key];
    if (!ability) return false;
    
    // Check cooldown
    if (ability.cooldown > 0) return false;
    
    // Check charges
    if (ability.charges !== undefined && ability.charges <= 0) return false;
    
    // Check cost (for abilities that cost credits)
    if (ability.cost && player.credits < ability.cost) return false;
    
    // Execute the ability
    if (ability.execute) {
      ability.execute(game, player);
      
      // Deduct cost
      if (ability.cost) {
        player.credits -= ability.cost;
      }
      
      // Reduce charges
      if (ability.charges !== undefined) {
        ability.charges--;
      }
      
      // Set cooldown
      if (ability.cooldownTime) {
        ability.cooldown = ability.cooldownTime;
      }
      
      return true;
    }
    
    return false;
  }
  
  update(dt) {
    // Update ability cooldowns
    Object.values(this.abilities).forEach(ability => {
      if (ability && ability.cooldown > 0) {
        ability.cooldown -= dt;
      }
    });
  }
}

export { BaseAgent };
