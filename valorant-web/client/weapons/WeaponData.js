// Complete weapon data for Valorant Web
// All weapons with accurate stats from the game

const WEAPONS = {
  // SIDEARMS
  classic: {
    name: 'Classic',
    type: 'sidearm',
    price: 0,
    magSize: 12,
    reserve: 36,
    fireRate: 6.75,
    dmg: { head: 78, body: 26, legs: 22 },
    reload: 1.75,
    auto: false,
    spread: 0.25,
    ads: 0.1,
    silenced: false,
    burstFire: true,
    burstCount: 3,
    burstDelay: 0.08
  },
  
  shorty: {
    name: 'Shorty',
    type: 'sidearm',
    price: 200,
    magSize: 2,
    reserve: 6,
    fireRate: 3.3,
    dmg: { head: 36, body: 12, legs: 10 },
    reload: 1.75,
    pellets: 15,
    spread: 0.65
  },
  
  frenzy: {
    name: 'Frenzy',
    type: 'sidearm',
    price: 450,
    magSize: 13,
    reserve: 39,
    fireRate: 13,
    dmg: { head: 78, body: 26, legs: 22 },
    reload: 1.6,
    auto: true,
    spread: 0.35
  },
  
  ghost: {
    name: 'Ghost',
    type: 'sidearm',
    price: 500,
    magSize: 15,
    reserve: 45,
    fireRate: 6.75,
    dmg: { head: 105, body: 30, legs: 25 },
    reload: 1.5,
    silenced: true,
    spread: 0.15
  },
  
  sheriff: {
    name: 'Sheriff',
    type: 'sidearm',
    price: 800,
    magSize: 6,
    reserve: 24,
    fireRate: 4,
    dmg: { head: 160, body: 55, legs: 46 },
    reload: 2.5,
    spread: 0.2,
    ads: 0.15
  },
  
  // SMGs
  stinger: {
    name: 'Stinger',
    type: 'smg',
    price: 1100,
    magSize: 20,
    reserve: 60,
    fireRate: 18,
    dmg: { head: 67, body: 27, legs: 23 },
    reload: 2.25,
    auto: true,
    spread: 0.3,
    ads: 0.15
  },
  
  spectre: {
    name: 'Spectre',
    type: 'smg',
    price: 1600,
    magSize: 30,
    reserve: 90,
    fireRate: 13.33,
    dmg: { head: 78, body: 26, legs: 22 },
    reload: 2.25,
    silenced: true,
    auto: true,
    spread: 0.2,
    ads: 0.1
  },
  
  // SHOTGUNS
  bucky: {
    name: 'Bucky',
    type: 'shotgun',
    price: 900,
    magSize: 5,
    reserve: 15,
    fireRate: 1.1,
    dmg: { head: 34, body: 34, legs: 29 },
    reload: 2.5,
    pellets: 15,
    spread: 0.4,
    altFire: true,
    altFireSpread: 0.2
  },
  
  judge: {
    name: 'Judge',
    type: 'shotgun',
    price: 1850,
    magSize: 7,
    reserve: 21,
    fireRate: 3.5,
    dmg: { head: 34, body: 34, legs: 29 },
    reload: 2.25,
    pellets: 12,
    auto: true,
    spread: 0.5
  },
  
  // RIFLES
  bulldog: {
    name: 'Bulldog',
    type: 'rifle',
    price: 2050,
    magSize: 24,
    reserve: 72,
    fireRate: 9.15,
    dmg: { head: 116, body: 35, legs: 30 },
    reload: 2.5,
    burstFire: true,
    burstCount: 3,
    spread: 0.25,
    ads: 0.1
  },
  
  guardian: {
    name: 'Guardian',
    type: 'rifle',
    price: 2250,
    magSize: 12,
    reserve: 36,
    fireRate: 5.25,
    dmg: { head: 195, body: 65, legs: 49 },
    reload: 2.5,
    semi: true,
    spread: 0.1,
    ads: 0.1
  },
  
  phantom: {
    name: 'Phantom',
    type: 'rifle',
    price: 2900,
    magSize: 30,
    reserve: 90,
    fireRate: 11,
    dmg: { head: 156, body: 39, legs: 33 },
    reload: 2.5,
    silenced: true,
    auto: true,
    spread: 0.2,
    falloff: { start: 15, end: 30, minDmgMult: 0.7 },
    ads: 0.1
  },
  
  vandal: {
    name: 'Vandal',
    type: 'rifle',
    price: 2900,
    magSize: 25,
    reserve: 75,
    fireRate: 9.75,
    dmg: { head: 160, body: 40, legs: 34 },
    reload: 2.5,
    auto: true,
    noFalloff: true,
    spread: 0.25,
    ads: 0.1
  },
  
  // SNIPERS
  marshal: {
    name: 'Marshal',
    type: 'sniper',
    price: 1100,
    magSize: 5,
    reserve: 20,
    fireRate: 1.5,
    dmg: { head: 202, body: 101, legs: 85 },
    reload: 2.5,
    boltAction: true,
    spread: 0.05,
    ads: 0.2,
    scopeZoom: 2.5
  },
  
  operator: {
    name: 'Operator',
    type: 'sniper',
    price: 4700,
    magSize: 5,
    reserve: 20,
    fireRate: 0.75,
    dmg: { head: 255, body: 150, legs: 127 },
    reload: 3.7,
    boltAction: true,
    spread: 0.03,
    ads: 0.3,
    scopeZoom: 5
  },
  
  // MACHINE GUNS
  ares: {
    name: 'Ares',
    type: 'lmg',
    price: 1600,
    magSize: 50,
    reserve: 100,
    fireRate: 13,
    dmg: { head: 72, body: 30, legs: 25 },
    reload: 3.25,
    spinUp: true,
    spinUpTime: 0.75,
    spread: 0.4,
    ads: 0.15
  },
  
  odin: {
    name: 'Odin',
    type: 'lmg',
    price: 3200,
    magSize: 100,
    reserve: 200,
    fireRate: 12,
    dmg: { head: 95, body: 38, legs: 32 },
    reload: 5.0,
    spinUp: true,
    spinUpTime: 1.0,
    spread: 0.35,
    ads: 0.15
  }
};

// Armor items
const ARMOR = {
  light_shield: {
    name: 'Light Shield',
    price: 400,
    armor: 25,
    maxArmor: 50
  },
  
  heavy_shield: {
    name: 'Heavy Shield',
    price: 1000,
    armor: 50,
    maxArmor: 100
  }
};

// Recoil patterns (simplified representation)
const RECOIL_PATTERNS = {
  vandal: {
    pattern: [
      { x: 0, y: -0.5 },   // First shot
      { x: 0.1, y: -0.8 }, // Second
      { x: 0.2, y: -1.0 }, // Third
      { x: 0.3, y: -1.2 }, // Fourth
      { x: 0.4, y: -1.3 }, // Fifth+
    ],
    recoveryTime: 0.4
  },
  
  phantom: {
    pattern: [
      { x: 0, y: -0.4 },
      { x: -0.1, y: -0.7 },
      { x: -0.2, y: -0.9 },
      { x: -0.25, y: -1.0 },
    ],
    recoveryTime: 0.35
  },
  
  bulldog: {
    pattern: [
      { x: -0.2, y: -0.6 },
      { x: 0, y: -0.8 },
      { x: 0.2, y: -1.0 },
    ],
    recoveryTime: 0.5
  },
  
  spectre: {
    pattern: [
      { x: -0.05, y: -0.3 },
      { x: -0.1, y: -0.5 },
      { x: -0.12, y: -0.6 },
    ],
    recoveryTime: 0.3
  },
  
  operator: {
    pattern: [
      { x: 0, y: -2.0 }, // Massive recoil on unscoped
    ],
    recoveryTime: 1.0
  }
};

// Export all as ES6 modules
export { WEAPONS, ARMOR, RECOIL_PATTERNS };
