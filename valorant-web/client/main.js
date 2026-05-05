import * as THREE from 'three';
import { PlayerController } from './engine/PlayerController.js';
import { AudioSystem } from './engine/AudioSystem.js';
import { NetworkManager } from './network/NetworkManager.js';
import { HUD } from './ui/HUD.js';
import { BuyMenu } from './ui/BuyMenu.js';
import { AgentSelect } from './ui/AgentSelect.js';
import { Crosshair } from './ui/Crosshair.js';
import { WEAPONS } from './weapons/WeaponData.js';

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.playerController = null;
    this.audioSystem = null;
    this.networkManager = null;
    this.hud = null;
    this.buyMenu = null;
    this.agentSelect = null;
    this.crosshair = null;
    
    this.gameState = {
      phase: 'MENU', // MENU, LOBBY, AGENT_SELECT, BUY, ACTION, PLANTED, POST_ROUND
      players: [],
      localPlayerId: null,
      score: { atk: 0, def: 0 },
      round: 1,
      timer: 0,
      spikePlanted: false,
      spikeTimer: null
    };
    
    this.settings = this.loadSettings();
    this.entities = new Map();
    this.effects = [];
    
    this.init();
  }
  
  init() {
    this.setupThreeJS();
    this.setupEventListeners();
    this.createSystems();
    this.showScreen('main-menu');
    this.animate();
  }
  
  setupThreeJS() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0F1923);
    this.scene.fog = new THREE.Fog(0x0F1923, 20, 100);
    
    // Camera
    this.camera = new THREE.PerspectiveCamera(
      this.settings.fov || 90,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.6, 0);
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: this.canvas,
      antialias: this.settings.quality !== 'low'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = this.settings.quality === 'high';
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 50, 50);
    dirLight.castShadow = this.settings.quality === 'high';
    this.scene.add(dirLight);
    
    // Handle resize
    window.addEventListener('resize', () => this.onWindowResize());
  }
  
  createSystems() {
    this.playerController = new PlayerController(this);
    this.audioSystem = new AudioSystem(this.settings);
    this.networkManager = new NetworkManager(this);
    this.hud = new HUD(this);
    this.buyMenu = new BuyMenu(this);
    this.agentSelect = new AgentSelect(this);
    this.crosshair = new Crosshair(this);
  }
  
  setupEventListeners() {
    // Main menu buttons
    document.getElementById('play-btn')?.addEventListener('click', () => {
      this.showScreen('lobby-screen');
      this.networkManager.requestRoomList();
    });
    
    document.getElementById('settings-btn')?.addEventListener('click', () => {
      this.toggleSettings();
    });
    
    document.getElementById('back-to-menu')?.addEventListener('click', () => {
      this.showScreen('main-menu');
    });
    
    document.getElementById('create-room-btn')?.addEventListener('click', () => {
      document.getElementById('create-room-modal').classList.add('active');
    });
    
    document.getElementById('cancel-create-room')?.addEventListener('click', () => {
      document.getElementById('create-room-modal').classList.remove('active');
    });
    
    document.getElementById('confirm-create-room')?.addEventListener('click', () => {
      const roomName = document.getElementById('room-name-input').value;
      const map = document.getElementById('map-select').value;
      const maxPlayers = parseInt(document.getElementById('max-players-input').value);
      
      this.networkManager.createRoom(roomName, map, maxPlayers);
      document.getElementById('create-room-modal').classList.remove('active');
    });
    
    // Settings
    document.getElementById('save-settings')?.addEventListener('click', () => {
      this.saveSettings();
      this.toggleSettings();
    });
    
    // Settings sliders
    document.getElementById('sensitivity-slider')?.addEventListener('input', (e) => {
      document.getElementById('sensitivity-value').textContent = e.target.value;
    });
    
    document.getElementById('fov-slider')?.addEventListener('input', (e) => {
      document.getElementById('fov-value').textContent = e.target.value;
      if (this.camera) {
        this.camera.fov = parseFloat(e.target.value);
        this.camera.updateProjectionMatrix();
      }
    });
  }
  
  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId)?.classList.add('active');
  }
  
  toggleSettings() {
    document.getElementById('settings-menu')?.classList.toggle('hidden');
  }
  
  loadSettings() {
    const saved = localStorage.getItem('vw_settings');
    return saved ? JSON.parse(saved) : {
      sensitivity: 1.0,
      fov: 90,
      quality: 'medium',
      masterVol: 80,
      sfxVol: 100,
      voiceVol: 80,
      crosshairStyle: 'cross',
      crosshairColor: '#00ff00',
      crosshairSize: 4
    };
  }
  
  saveSettings() {
    const settings = {
      sensitivity: document.getElementById('sensitivity-slider')?.value || 1.0,
      fov: document.getElementById('fov-slider')?.value || 90,
      quality: document.getElementById('quality-select')?.value || 'medium',
      masterVol: document.getElementById('master-vol')?.value || 80,
      sfxVol: document.getElementById('sfx-vol')?.value || 100,
      voiceVol: document.getElementById('voice-vol')?.value || 80,
      crosshairStyle: document.getElementById('crosshair-style')?.value || 'cross',
      crosshairColor: document.getElementById('crosshair-color')?.value || '#00ff00',
      crosshairSize: document.getElementById('crosshair-size')?.value || 4
    };
    
    localStorage.setItem('vw_settings', JSON.stringify(settings));
    this.settings = settings;
    this.applySettings();
  }
  
  applySettings() {
    if (this.audioSystem) {
      this.audioSystem.updateSettings(this.settings);
    }
    if (this.crosshair) {
      this.crosshair.updateStyle(this.settings);
    }
  }
  
  onWindowResize() {
    if (!this.camera || !this.renderer) return;
    
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  enterGame() {
    this.showScreen('game-container');
    document.getElementById('hud')?.classList.remove('hidden');
    
    // Request pointer lock
    this.canvas.requestPointerLock = this.canvas.requestPointerLock || 
      this.canvas.mozRequestPointerLock;
    this.canvas.requestPointerLock();
  }
  
  exitPointerLock() {
    document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;
    document.exitPointerLock();
  }
  
  // Create test map (simple room)
  createTestMap() {
    // Floor
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: 0x2a2a2a,
      roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    
    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ 
      color: 0x3a3a3a,
      roughness: 0.7
    });
    
    const walls = [
      { pos: [0, 2.5, -50], size: [100, 5, 1] },
      { pos: [0, 2.5, 50], size: [100, 5, 1] },
      { pos: [-50, 2.5, 0], size: [1, 5, 100] },
      { pos: [50, 2.5, 0], size: [1, 5, 100] }
    ];
    
    walls.forEach(w => {
      const geo = new THREE.BoxGeometry(...w.size);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(...w.pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    });
    
    // Some cover objects
    for (let i = 0; i < 10; i++) {
      const boxGeo = new THREE.BoxGeometry(2, 2, 2);
      const box = new THREE.Mesh(boxGeo, wallMat);
      box.position.set(
        (Math.random() - 0.5) * 80,
        1,
        (Math.random() - 0.5) * 80
      );
      box.castShadow = true;
      box.receiveShadow = true;
      this.scene.add(box);
    }
  }
  
  animate() {
    requestAnimationFrame(() => this.animate());
    
    const dt = this.clock.getDelta();
    
    // Update systems
    if (this.playerController) {
      this.playerController.update(dt);
    }
    
    if (this.networkManager && this.networkManager.connected) {
      // Send input to server
      this.networkManager.sendInput();
    }
    
    // Render
    this.renderer.render(this.scene, this.camera);
  }
  
  // Process server snapshot
  processSnapshot(snapshot) {
    this.gameState.phase = snapshot.phase;
    this.gameState.score = snapshot.score;
    this.gameState.round = snapshot.round;
    this.gameState.timer = snapshot.timer;
    this.gameState.spikePlanted = snapshot.spikePlanted;
    this.gameState.spikeTimer = snapshot.spikeTimer;
    this.gameState.players = snapshot.players;
    
    // Update other player positions
    snapshot.players.forEach(p => {
      if (p.id !== this.gameState.localPlayerId) {
        this.updatePlayerEntity(p);
      }
    });
    
    // Update HUD
    this.hud.update(snapshot);
  }
  
  updatePlayerEntity(playerData) {
    let entity = this.entities.get(playerData.id);
    
    if (!entity && playerData.alive) {
      // Create new entity
      const geometry = new THREE.CapsuleGeometry(0.5, 1.8, 4, 8);
      const material = new THREE.MeshStandardMaterial({
        color: playerData.team === 'atk' ? 0xFF4655 : 0x4a9eff
      });
      entity = new THREE.Mesh(geometry, material);
      entity.castShadow = true;
      this.scene.add(entity);
      this.entities.set(playerData.id, entity);
    }
    
    if (entity) {
      if (playerData.alive) {
        entity.position.set(playerData.pos.x, playerData.pos.y + 0.9, playerData.pos.z);
        entity.rotation.y = playerData.yaw;
        entity.visible = true;
      } else {
        entity.visible = false;
      }
    }
  }
  
  removePlayerEntity(playerId) {
    const entity = this.entities.get(playerId);
    if (entity) {
      this.scene.remove(entity);
      this.entities.delete(playerId);
    }
  }
  
  clearAllEntities() {
    this.entities.forEach((entity, id) => {
      this.scene.remove(entity);
    });
    this.entities.clear();
  }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.game = new GameEngine();
});

export { GameEngine };
