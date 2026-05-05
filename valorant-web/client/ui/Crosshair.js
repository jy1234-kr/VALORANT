class Crosshair {
  constructor(game) {
    this.game = game;
    this.style = game.settings.crosshairStyle || 'cross';
    this.color = game.settings.crosshairColor || '#00ff00';
    this.size = game.settings.crosshairSize || 4;
    
    this.element = document.getElementById('crosshair');
    this.dot = this.element?.querySelector('.crosshair-dot');
    this.lines = this.element?.querySelectorAll('.crosshair-line');
    
    // Dynamic expansion state
    this.expansion = 0;
    this.targetExpansion = 0;
    this.isMoving = false;
    this.lastMoveTime = 0;
    
    this.updateStyle();
  }
  
  updateStyle(settings) {
    if (settings) {
      this.style = settings.crosshairStyle || this.style;
      this.color = settings.crosshairColor || this.color;
      this.size = settings.crosshairSize || this.size;
    }
    
    if (!this.element) return;
    
    this.element.style.color = this.color;
    
    // Apply style type
    this.lines.forEach(line => {
      line.style.display = this.style === 'dot' ? 'none' : 'block';
    });
    
    if (this.dot) {
      this.dot.style.display = this.style === 'circle' ? 'none' : 'block';
      this.dot.style.width = `${this.size}px`;
      this.dot.style.height = `${this.size}px`;
    }
    
    // Update line sizes
    const lineSize = this.style === 'cross' ? this.size * 2 : this.size;
    const thickness = Math.max(1, Math.floor(this.size / 4));
    
    this.lines.forEach(line => {
      if (line.classList.contains('horizontal')) {
        line.style.width = `${lineSize}px`;
        line.style.height = `${thickness}px`;
      } else {
        line.style.width = `${thickness}px`;
        line.style.height = `${lineSize}px`;
      }
    });
    
    // Gap based on size
    const gap = this.size * 3;
    const horizontalLines = this.element.querySelectorAll('.crosshair-line.horizontal');
    const verticalLines = this.element.querySelectorAll('.crosshair-line.vertical');
    
    horizontalLines[0].style.left = `-${gap + lineSize/2}px`;
    horizontalLines[1].style.right = `-${gap + lineSize/2}px`;
    verticalLines[0].style.top = `-${gap + lineSize/2}px`;
    verticalLines[1].style.bottom = `-${gap + lineSize/2}px`;
  }
  
  update(dt, playerState) {
    // Calculate target expansion based on movement and shooting
    this.calculateTargetExpansion(playerState);
    
    // Smoothly interpolate expansion
    this.expansion += (this.targetExpansion - this.expansion) * 10 * dt;
    
    // Apply expansion to crosshair
    this.applyExpansion();
  }
  
  calculateTargetExpansion(playerState) {
    let expansion = 0;
    
    // Movement expansion
    if (playerState?.isMoving) {
      expansion += 0.3;
    }
    
    // Jump expansion
    if (playerState?.isInAir) {
      expansion += 0.4;
    }
    
    // Crouch reduction
    if (playerState?.isCrouching) {
      expansion -= 0.2;
    }
    
    // Shooting expansion
    if (playerState?.isShooting) {
      expansion += 0.5;
    }
    
    // ADS (aim down sights) - no spread
    if (playerState?.isAiming) {
      expansion = 0;
    }
    
    // Sniper scoped - hide crosshair or show dot only
    if (playerState?.isScoped) {
      expansion = -1; // Special value to hide
    }
    
    this.targetExpansion = Math.max(0, Math.min(1, expansion));
  }
  
  applyExpansion() {
    if (!this.element) return;
    
    if (this.expansion < 0) {
      // Scoped - hide crosshair
      this.element.style.opacity = '0';
      return;
    }
    
    this.element.style.opacity = '1';
    
    const baseGap = this.size * 3;
    const expandAmount = this.expansion * 10;
    
    const horizontalLines = this.element.querySelectorAll('.crosshair-line.horizontal');
    const verticalLines = this.element.querySelectorAll('.crosshair-line.vertical');
    
    horizontalLines[0].style.transform = `translateX(-${expandAmount}px) translateY(-50%)`;
    horizontalLines[1].style.transform = `translateX(${expandAmount}px) translateY(-50%)`;
    verticalLines[0].style.transform = `translateX(-50%) translateY(-${expandAmount}px)`;
    verticalLines[1].style.transform = `translateX(-50%) translateY(${expandAmount}px)`;
  }
  
  reset() {
    this.expansion = 0;
    this.targetExpansion = 0;
    this.applyExpansion();
  }
}

export { Crosshair };
