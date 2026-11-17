// The wave director: builds each wave's spawn list, trickles the shards in
// over time, and reports when the arena is clear so the game can offer an
// upgrade. Waves grow in count, speed and variety as the run goes on, and
// every boss wave (every WAVES.bossEvery waves) brings the Void Leviathan
// with a smaller escort instead of the full spawn queue.

import { WAVES } from './config.js';
import { pickKind, spawnBoss, spawnEnemy } from './enemies.js';

export function createWaves() {
  return {
    wave: 0,
    queue: [],
    spawnTimer: 0,
    spawnGap: WAVES.baseSpawnGap,
    banner: 0,
    active: false,
    // Boss-wave state. The boss spawns once the wave banner has faded, so
    // the "VOID LEVIATHAN" banner gets its own moment.
    bossWave: false,
    bossSpawned: false,
    bossBanner: 0,
  };
}

export function startWave(director, wave, rng) {
  director.wave = wave;
  director.queue = [];
  const bossWave = wave % WAVES.bossEvery === 0;
  director.bossWave = bossWave;
  director.bossSpawned = false;
  director.bossBanner = 0;
  const count = bossWave
    ? Math.max(4, Math.round((WAVES.baseCount + (wave - 1) * WAVES.perWave) * WAVES.bossEscortShare))
    : WAVES.baseCount + (wave - 1) * WAVES.perWave;
  for (let i = 0; i < count; i += 1) director.queue.push(pickKind(rng, wave));
  director.total = count;
  // Shuffle the queue so the heavies do not all arrive together.
  for (let i = director.queue.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.next() * (i + 1));
    const tmp = director.queue[i];
    director.queue[i] = director.queue[j];
    director.queue[j] = tmp;
  }
  director.spawnGap = Math.max(
    WAVES.minSpawnGap,
    WAVES.baseSpawnGap - (wave - 1) * WAVES.spawnGapStep,
  );
  director.spawnTimer = WAVES.leadIn;
  director.banner = WAVES.bannerTime;
  director.active = true;
}

// Advance the director one step. Spawns shards from the queue at the wave's
// pace, and the boss once, just after the wave banner fades. Returns
// 'cleared' when the queue is empty and no enemy is left alive.
export function updateWaves(director, enemies, rng, dt) {
  if (!director.active) return 'idle';
  if (director.banner > 0) director.banner -= dt;
  if (director.bossBanner > 0) director.bossBanner -= dt;
  if (director.bossWave && !director.bossSpawned && director.banner <= 0) {
    director.bossSpawned = true;
    director.bossBanner = WAVES.bannerTime;
    spawnBoss(enemies, rng, director.wave);
  }
  if (director.queue.length > 0) {
    director.spawnTimer -= dt;
    if (director.spawnTimer <= 0) {
      director.spawnTimer = director.spawnGap;
      const kind = director.queue.shift();
      spawnEnemy(enemies, rng, kind, director.wave);
    }
    return 'spawning';
  }
  if (enemies.length === 0) {
    director.active = false;
    return 'cleared';
  }
  return 'fighting';
}

export function waveRemaining(director, enemies) {
  return director.queue.length + enemies.length;
}
