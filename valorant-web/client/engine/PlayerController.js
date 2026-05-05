import * as THREE from 'three';

class PlayerController {
  constructor(game) {
    this.game = game;
    this.camera = game.camera;
    
    // Movement state
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.isSprinting = false;
    this.isCrouching = false;
    this.isJumping = false;
    
    // Camera control
    this.yaw = 0;
    this.pitch = 0;
    this.sensitivity = game.settings.sensitivity || 1.0;
    
    // Velocity
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.onGround = true;
    
    // Input sequence for server
    this.inputSequence = 0;
    this.currentInput = null;
    
    // Weapon state
    this.isShooting = false;
    this.isReloading = false;
    this.isAiming = false;
    
    this.setupInputHandlers();
  }
  
  setupInputHandlers() {
    // Keyboard
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));
    
    // Mouse
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mousedown', (e) => this.onMouseDown(e));
    document.addEventListener('mouseup', (e) => this.onMouseUp(e));
    
    // Pointer lock
    document.addEventListener('pointerlockchange', () => {
      this.handlePointerLockChange();
    });
  }
  
  onKeyDown(event) {
    switch (event.code) {
      case 'KeyW':
        this.moveForward = true;
        break;
      case 'KeyS':
        this.moveBackward = true;
        break;
      case 'KeyA':
        this.moveLeft = true;
        break;
      case 'KeyD':
        this.moveRight = true;
        break;
      case 'ShiftLeft':
        this.isSprinting = true;
        break;
      case 'ControlLeft':
        this.isCrouching = true;
        break;
      case 'Space':
        if (this.onGround) {
          this.isJumping = true;
          this.velocity.y = 5.0;
          this.onGround = false;
        }
        break;
      case 'KeyR':
        this.reload();
        break;
      case 'KeyF':
        this.interact();
        break;
      case 'KeyB':
        this.toggleBuyMenu();
        break;
      case 'Escape':
        this.game.exitPointerLock();
        break;
      case 'Tab':
        event.preventDefault();
        this.toggleScoreboard();
        break;
      case 'Digit1':
        this.switchWeapon(0);
        break;
      case 'Digit2':
        this.switchWeapon(1);
        break;
      case 'KeyQ':
        this.useAbility('Q');
        break;
      case 'KeyE':
        this.useAbility('E');
        break;
      case 'KeyC':
        this.useAbility('C');
        break;
      case 'KeyX':
        this.useAbility('X');
        break;
    }
  }
  
  onKeyUp(event) {
    switch (event.code) {
      case 'KeyW':
        this.moveForward = false;
        break;
      case 'KeyS':
        this.moveBackward = false;
        break;
      case 'KeyA':
        this.moveLeft = false;
        break;
      case 'KeyD':
        this.moveRight = false;
        break;
      case 'ShiftLeft':
        this.isSprinting = false;
        break;
      case 'ControlLeft':
        this.isCrouching = false;
        break;
    }
  }
  
  onMouseMove(event) {
    if (document.pointerLockElement !== this.game.canvas) return;
    
    const sensitivity = this.sensitivity * 0.002;
    
    this.yaw -= event.movementX * sensitivity;
    this.pitch -= event.movementY * sensitivity;
    
    // Clamp pitch
    this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));
    
    // Update camera rotation
    this.updateCameraRotation();
  }
  
  onMouseDown(event) {
    if (document.pointerLockElement !== this.game.canvas) return;
    
    if (event.button === 0) { // Left click
      this.isShooting = true;
      if (this.game.networkManager?.connected) {
        this.startShooting();
      }
    } else if (event.button === 2) { // Right click
      this.isAiming = true;
      this.aimDownSights();
    }
  }
  
  onMouseUp(event) {
    if (event.button === 0) {
      this.isShooting = false;
      if (this.game.networkManager?.connected) {
        this.stopShooting();
      }
    } else if (event.button === 2) {
      this.isAiming = false;
      this.aimDownSights();
    }
  }
  
  handlePointerLockChange() {
    if (document.pointerLockElement === this.game.canvas) {
      // Pointer locked - game active
    } else {
      // Pointer unlocked - show menu or pause
    }
  }
  
  updateCameraRotation() {
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.setFromQuaternion(this.camera.quaternion);
    euler.y = this.yaw;
    euler.x = this.pitch;
    this.camera.quaternion.setFromEuler(euler);
  }
  
  update(dt) {
    if (!this.game.networkManager?.connected) {
      // Local movement (for testing without server)
      this.updateLocalMovement(dt);
    }
    
    // Build current input for server
    this.buildInput();
  }
  
  updateLocalMovement(dt) {
    const speed = this.isCrouching ? 2.5 : (this.isSprinting ? 7.0 : 5.5);
    
    // Get movement direction
    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();
    
    // Apply movement relative to camera direction
    const moveX = Math.sin(this.yaw) * this.direction.z + Math.cos(this.yaw) * this.direction.x;
    const moveZ = Math.cos(this.yaw) * this.direction.z - Math.sin(this.yaw) * this.direction.x;
    
    this.camera.position.x += moveX * speed * dt;
    this.camera.position.z += moveZ * speed * dt;
    
    // Gravity
    this.velocity.y -= 9.8 * dt;
    this.camera.position.y += this.velocity.y * dt;
    
    // Ground check
    if (this.camera.position.y < 1.6) {
      this.camera.position.y = 1.6;
      this.velocity.y = 0;
      this.onGround = true;
    }
  }
  
  buildInput() {
    // Calculate movement direction relative to view
    const moveDir = new THREE.Vector2();
    
    if (this.moveForward) moveDir.y += 1;
    if (this.moveBackward) moveDir.y -= 1;
    if (this.moveLeft) moveDir.x -= 1;
    if (this.moveRight) moveDir.x += 1;
    
    if (moveDir.length() > 1) {
      moveDir.normalize();
    }
    
    this.currentInput = {
      seq: this.inputSequence++,
      moveDir: { x: moveDir.x, y: moveDir.y },
      yaw: this.yaw,
      pitch: this.pitch,
      shoot: this.isShooting,
      aim: this.isAiming,
      jump: this.isJumping,
      crouch: this.isCrouching,
      reload: false,
      useAbility: null,
      interact: false
    };
    
    // Reset one-shot inputs
    this.isJumping = false;
  }
  
  startShooting() {
    if (this.currentInput) {
      this.currentInput.shoot = true;
    }
  }
  
  stopShooting() {
    if (this.currentInput) {
      this.currentInput.shoot = false;
    }
  }
  
  reload() {
    if (this.currentInput) {
      this.currentInput.reload = true;
    }
    this.isReloading = true;
    setTimeout(() => {
      this.isReloading = false;
    }, 2500);
  }
  
  interact() {
    if (this.currentInput) {
      this.currentInput.interact = true;
    }
  }
  
  useAbility(abilityKey) {
    if (this.currentInput) {
      this.currentInput.useAbility = abilityKey;
    }
  }
  
  toggleBuyMenu() {
    if (this.game.gameState.phase === 'BUY') {
      this.game.buyMenu.toggle();
    }
  }
  
  toggleScoreboard() {
    this.game.hud?.toggleScoreboard();
  }
  
  switchWeapon(slot) {
    // Would switch between primary/secondary weapons
  }
  
  aimDownSights() {
    const targetFOV = this.isAiming ? 40 : (this.game.settings.fov || 90);
    this.camera.fov = targetFOV;
    this.camera.updateProjectionMatrix();
  }
}

export { PlayerController };
