class AudioSystem {
  constructor(settings) {
    this.settings = settings;
    this.audioContext = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.voiceGain = null;
    
    this.initialized = false;
    this.weapons = {};
    
    this.init();
  }
  
  init() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Master gain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = (this.settings.masterVol || 80) / 100;
      this.masterGain.connect(this.audioContext.destination);
      
      // SFX gain
      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.gain.value = (this.settings.sfxVol || 100) / 100;
      this.sfxGain.connect(this.masterGain);
      
      // Voice gain
      this.voiceGain = this.audioContext.createGain();
      this.voiceGain.gain.value = (this.settings.voiceVol || 80) / 100;
      this.voiceGain.connect(this.masterGain);
      
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }
  
  updateSettings(settings) {
    this.settings = settings;
    if (this.masterGain) {
      this.masterGain.gain.value = (settings.masterVol || 80) / 100;
    }
    if (this.sfxGain) {
      this.sfxGain.gain.value = (settings.sfxVol || 100) / 100;
    }
    if (this.voiceGain) {
      this.voiceGain.gain.value = (settings.voiceVol || 80) / 100;
    }
  }
  
  // Weapon sounds using oscillators
  playGunshot(weaponType, position) {
    if (!this.initialized) return;
    
    const now = this.audioContext.currentTime;
    
    switch (weaponType) {
      case 'vandal':
        this.playVandalShot(now);
        break;
      case 'phantom':
        this.playPhantomShot(now);
        break;
      case 'operator':
        this.playOperatorShot(now);
        break;
      case 'classic':
        this.playClassicShot(now);
        break;
      default:
        this.playGenericShot(now);
    }
  }
  
  playVandalShot(time) {
    // Loud crack sound
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.15);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, time);
    filter.frequency.linearRampToValueAtTime(500, time + 0.1);
    
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.18);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(time);
    osc.stop(time + 0.2);
    
    // Add noise burst
    this.playNoiseBurst(time, 0.15, 0.3);
  }
  
  playPhantomShot(time) {
    // Suppressed thump
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.08);
    
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(time);
    osc.stop(time + 0.12);
    
    this.playNoiseBurst(time, 0.08, 0.2);
  }
  
  playOperatorShot(time) {
    // Deep boom with rumble
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(80, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.3);
    
    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(time);
    osc.stop(time + 0.45);
  }
  
  playClassicShot(time) {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, time);
    
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(time);
    osc.stop(time + 0.15);
  }
  
  playGenericShot(time) {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(50, time + 0.1);
    
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(time);
    osc.stop(time + 0.2);
  }
  
  playNoiseBurst(time, duration, volume) {
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;
    
    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
    
    noise.connect(gain);
    gain.connect(this.sfxGain);
    
    noise.start(time);
  }
  
  playFootstep(type) {
    if (!this.initialized) return;
    
    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    let freq = 250;
    let duration = 0.05;
    let volume = 0.2;
    
    if (type === 'run') {
      freq = 350;
      volume = 0.3;
    } else if (type === 'crouch') {
      freq = 150;
      volume = 0.1;
    }
    
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + duration);
  }
  
  playHitSound() {
    if (!this.initialized) return;
    
    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.2);
  }
  
  playKillSound() {
    if (!this.initialized) return;
    
    const now = this.audioContext.currentTime;
    
    // Positive ding sound
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.1);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.35);
  }
  
  playSpikeBeep(timeLeft) {
    if (!this.initialized) return;
    
    const now = this.audioContext.currentTime;
    const interval = Math.max(300, timeLeft * 44); // Lerp from 2000ms to 300ms
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.1);
    
    // Schedule next beep
    setTimeout(() => {
      if (timeLeft > 0) {
        this.playSpikeBeep(timeLeft - (2000 - interval) / 1000);
      }
    }, interval);
  }
  
  announce(text) {
    if (!this.initialized) return;
    
    // Use SpeechSynthesis for voice announcements
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = (this.settings.voiceVol || 80) / 100;
      
      speechSynthesis.speak(utterance);
    }
  }
  
  playMusic(type) {
    // Simplified music system using oscillators
    // In a real implementation, you'd use actual audio files
    if (!this.initialized) return;
    
    // Placeholder for music
  }
}

export { AudioSystem };
