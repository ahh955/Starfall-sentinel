// Void shards: the six enemy kinds, how they spawn at the arena's edge and
// how they spiral inward toward the star core. Each kind is a small object
// with its own shape, speed and temperament.

import { CORE, DART, MINI, PALETTE, SHARD, SPLITTER, TANK, VIEW, WAVES } from './config.js';
import { angleBetween, pointOnCircle } from './utils.js';

export const KIND_SHARD = 'shard';
export const KIND_DART = 'dart';
export const KIND_TANK = 'tank';
export const KIND_SPLITTER = 'splitter';
export const KIND_STINGER = 'stinger';
export const KIND_MINI = 'mini';

// Each kind's neon colour, shared by the renderer and the explosion particles.
const KIND_COLORS = {
  [KIND_STINGER]: '#aaff40',
  [KIND_SHARD]: PALETTE.shard,
  [KIND_DART]: PALETTE.dart,
  [KIND_TANK]: PALETTE.tank,
  [KIND_SPLITTER]: PALETTE.splitter,
  [KIND_MINI]: PALETTE.mini,
};

export function enemyColor(kind) {
  return KIND_COLORS[kind] || PALETTE.shard;
}

const STATS = {
  [KIND_STINGER]: { radius: 13, hp: 1, speed: 145, damage: 5, score: 95, spiral: 0 },
  [KIND_SHARD]: SHARD,
  [KIND_DART]: DART,
  [KIND_TANK]: TANK,
  [KIND_SPLITTER]: SPLITTER,
  [KIND_MINI]: MINI,
};

// Which kinds may appear in a wave, weighted so the basic shard stays common.
export function kindsForWave(wave) {
  const pool = [
    { kind: KIND_SHARD, weight: 10 },
  ];
  if (wave >= 3) pool.push({ kind: KIND_STINGER, weight: 4 });
  if (wave >= DART.firstWave) pool.push({ kind: KIND_DART, weight: 4 });
  if (wave >= TANK.firstWave) pool.push({ kind: KIND_TANK, weight: 2 });
  if (wave >= SPLITTER.firstWave) pool.push({ kind: KIND_SPLITTER, weight: 3 });
  return pool;
}

export function pickKind(rng, wave) {
  const pool = kindsForWave(wave);
  let total = 0;
  for (const entry of pool) total += entry.weight;
  let roll = rng.next() * total;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry.kind;
  }
  return KIND_SHARD;
}

// Spawn one enemy of `kind` just outside the arena, at a random edge angle.
// `wave` scales hp and speed so later waves stay dangerous.
export function spawnEnemy(enemies, rng, kind, wave) {
  const stats = STATS[kind];
  const angle = rng.next() * Math.PI * 2;
  // Spawn ring: beyond the farthest corner, so nothing pops in on screen.
  const spawnRadius = Math.hypot(VIEW.width, VIEW.height) / 2 + 60;
  const pos = pointOnCircle(CORE.x, CORE.y, spawnRadius, angle);
  const hpScale = 1 + (wave - 1) * WAVES.hpGrowth;
  const speedScale = 1 + (wave - 1) * WAVES.speedGrowth;
  enemies.push({
    kind,
    x: pos.x,
    y: pos.y,
    radius: stats.radius,
    hp: Math.max(1, Math.round(stats.hp * hpScale)),
    maxHp: Math.max(1, Math.round(stats.hp * hpScale)),
    speed: stats.speed * speedScale * rng.range(0.9, 1.1),
    damage: stats.damage,
    score: stats.score,
    spiral: stats.spiral * (rng.next() < 0.5 ? 1 : -1),
    // Jagged outline: each shard gets its own random vertices.
    vertices: kind === KIND_STINGER ? [{x:22,y:0},{x:-14,y:-13},{x:-5,y:0},{x:-14,y:13}] : shardVertices(rng, stats.radius),
    age: 0,
    spin: rng.range(-1.4, 1.4),
    rotation: rng.range(0, Math.PI * 2),
    flash: 0,
  });
}

function shardVertices(rng, radius) {
  const points = [];
  const count = rng.int(6, 8);
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    const r = radius * rng.range(0.72, 1.12);
    points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return points;
}

// Steer every enemy a step toward the core, with a sideways drift that turns
// the approach into a spiral. Returns the enemies that reached the core.
export function updateEnemies(enemies, dt) {
  const biters = [];
  for (const enemy of enemies) {
    const inward = angleBetween(enemy.x, enemy.y, CORE.x, CORE.y);
    // Tangential direction: perpendicular to the line toward the core.
    const side = inward + Math.PI / 2;
    enemy.age = (enemy.age || 0) + dt;
    const zigzag = enemy.kind === KIND_STINGER ? Math.sin(enemy.age * 9) * 1.15 : enemy.spiral;
    const vx = Math.cos(inward) * enemy.speed + Math.cos(side) * enemy.speed * zigzag;
    const vy = Math.sin(inward) * enemy.speed + Math.sin(side) * enemy.speed * zigzag;
    enemy.x += vx * dt;
    enemy.y += vy * dt;
    enemy.rotation = enemy.kind === KIND_STINGER ? inward : enemy.rotation + enemy.spin * dt;
    if (enemy.flash > 0) enemy.flash -= dt;
    const dist = Math.hypot(enemy.x - CORE.x, enemy.y - CORE.y);
    if (dist <= CORE.biteRadius) biters.push(enemy);
  }
  return biters;
}

// Remove one enemy from the list. A splitter leaves its children behind.
export function killEnemy(enemies, enemy, rng, wave) {
  const index = enemies.indexOf(enemy);
  if (index !== -1) enemies.splice(index, 1);
  if (enemy.kind === KIND_SPLITTER) {
    for (let i = 0; i < SPLITTER.children; i += 1) {
      const stats = MINI;
      const angle = rng.next() * Math.PI * 2;
      enemies.push({
        kind: KIND_MINI,
        x: enemy.x + Math.cos(angle) * 14,
        y: enemy.y + Math.sin(angle) * 14,
        radius: stats.radius,
        hp: stats.hp,
        maxHp: stats.hp,
        speed: stats.speed * (1 + (wave - 1) * WAVES.speedGrowth),
        damage: stats.damage,
        score: stats.score,
        spiral: stats.spiral * (rng.next() < 0.5 ? 1 : -1),
        vertices: shardVertices(rng, stats.radius),
        spin: rng.range(-2.5, 2.5),
        rotation: rng.range(0, Math.PI * 2),
        flash: 0,
      });
    }
  }
}

export function removeEnemy(enemies, enemy) {
  const index = enemies.indexOf(enemy);
  if (index !== -1) enemies.splice(index, 1);
}
