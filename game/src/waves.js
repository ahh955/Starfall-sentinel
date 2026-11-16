// The wave director: builds each wave's spawn list, trickles the shards in
// over time, and reports when the arena is clear so the game can offer an
// upgrade. Waves grow in count, speed and variety as the run goes on.

import { WAVES } from './config.js';
import { pickKind, spawnEnemy } from './enemies.js';

export function createWaves() {
  return {
    wave: 0,
    queue: [],
    spawnTimer: 0,
    spawnGap: WAVES.baseSpawnGap,
    banner: 0,
    active: false,
  };
}

export function startWave(director, wave, rng) {
  director.wave = wave;
  director.queue = [];
  const count = WAVES.baseCount + (wave - 1) * WAVES.perWave;
  for (let i = 0; i < count; i += 1) director.queue.push(pickKind(rng, wave));
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
// pace. Returns 'cleared' when the queue is empty and no enemy is left alive.
export function updateWaves(director, enemies, rng, dt) {
  if (!director.active) return 'idle';
  if (director.banner > 0) director.banner -= dt;
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
