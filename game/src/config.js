// Every tuning number for Starfall Sentinel lives here, so balancing the game
// means editing this one file. Positions are in canvas pixels; times in seconds.

export const VIEW = {
  width: 1280,
  height: 720,
};

// The fixed simulation step: the game logic advances in 1/60 s slices,
// whatever the display's frame rate. Both the live loop and the screenshot
// poser step the game in these units.
export const STEP = 1 / 60;

export const CORE = {
  // The star core sits at the middle of the arena.
  x: VIEW.width / 2,
  y: VIEW.height / 2,
  radius: 46,
  maxHp: 100,
  // Shards must cross this ring before they can bite the core.
  biteRadius: 62,
};

export const PLAYER = {
  radius: 16,
  speed: 300,
  // Seconds between shots at base fire rate.
  fireInterval: 0.16,
  bulletSpeed: 620,
  bulletDamage: 1,
  bulletRadius: 5,
  maxShield: 3,
  // Seconds of invulnerability after a hit, and seconds to regrow one shield pip.
  invulnerableTime: 1.2,
  shieldRegenTime: 7,
  // How far starlight is pulled toward the ship at base magnet strength.
  magnetRadius: 110,
};

export const SHARD = {
  // The basic void shard. Later waves scale its hp and speed up.
  radius: 17,
  hp: 3,
  speed: 52,
  damage: 8,
  score: 50,
  // Tangential drift that makes shards spiral instead of flying straight in.
  spiral: 0.55,
};

export const DART = {
  radius: 12,
  hp: 2,
  speed: 118,
  damage: 6,
  score: 80,
  spiral: 0.15,
  firstWave: 4,
};

export const TANK = {
  radius: 30,
  hp: 14,
  speed: 30,
  damage: 18,
  score: 150,
  spiral: 0.1,
  firstWave: 4,
};

export const SPLITTER = {
  radius: 22,
  hp: 6,
  speed: 44,
  damage: 10,
  score: 120,
  spiral: 0.4,
  firstWave: 5,
  // How many minis it breaks into when destroyed.
  children: 2,
};

export const MINI = {
  radius: 9,
  hp: 1,
  speed: 105,
  damage: 4,
  score: 30,
  spiral: 0.3,
};

export const WAVES = {
  // Shards in wave 1, then this many more each wave.
  baseCount: 9,
  perWave: 4,
  // Seconds between spawns at wave 1, shrinking a little each wave.
  baseSpawnGap: 1.15,
  minSpawnGap: 0.45,
  spawnGapStep: 0.06,
  // Per-wave multipliers for shard hp and speed.
  hpGrowth: 0.09,
  speedGrowth: 0.05,
  // Seconds of calm before the first shard of a wave appears.
  leadIn: 1.2,
  // Seconds the "WAVE N" banner stays up.
  bannerTime: 2.2,
};

export const PICKUP = {
  radius: 9,
  // Starlight a shard drops: 1 always, plus a chance of a bonus.
  bonusChance: 0.25,
  collectRadius: 26,
  // Seconds a drop lingers before it fades out.
  lifetime: 14,
};

export const PALETTE = {
  background: '#05060f',
  star: '#cfe6ff',
  core: '#ffd166',
  coreGlow: '#ff9f1c',
  player: '#4cc9f0',
  playerGlow: '#90e0ef',
  bullet: '#ade8f4',
  shard: '#f72585',
  dart: '#ff9f1c',
  tank: '#b5179e',
  splitter: '#7209b7',
  mini: '#ff5d8f',
  starlight: '#ffe066',
  text: '#eaf6ff',
  dimText: '#8fa8c8',
  danger: '#ff4d6d',
  heal: '#80ed99',
};
