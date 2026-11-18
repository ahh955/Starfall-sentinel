// Starfall Sentinel: the game loop and the state machine. Screens are menu,
// playing, upgrade, paused and gameover; this file moves between them, runs
// the fixed-timestep simulation, resolves collisions and keeps the score.
// The loop is started by startLoop; createGame only builds the state, so the
// screenshot poser can drive the same simulation headlessly, step by step.

import { CORE, PALETTE, STEP, VIEW } from './config.js';
import { BOSS } from './config.js';
import { makeRng } from './utils.js';
import { createInput, endFrame, wasPressed } from './input.js';
import {
  createAudio,
  playBoss,
  playCoreHit,
  playExplosion,
  playGameOver,
  playHit,
  playUpgrade,
  playWaveStart,
  toggleMute,
  unlockAudio,
} from './audio.js';
import { createPlayer, playerHit, resetPlayer } from './player.js';
import { updatePlayer } from './player.js';
import { clearBullets, updateBullets } from './bullets.js';
import { KIND_BOSS, enemyColor, killEnemy, removeEnemy, spawnBossMinions, updateEnemies } from './enemies.js';
import { clearParticles, coreBurst, createParticles, celebrationBurst, explosion, addFloater, hitSparks, updateParticles } from './particles.js';
import { clearPickups, dropStarlight, updatePickups } from './pickups.js';
import { createWaves, startWave, updateWaves } from './waves.js';
import { rollUpgrades } from './upgrades.js';
import {
  createStarfield,
  drawFrame,
  SCREEN_MENU,
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAYING,
  SCREEN_UPGRADE,
} from './render.js';
import { stageShot } from './shots.js';

const BEST_KEY = 'starfall-sentinel-best';

function loadBest() {
  try {
    const saved = window.localStorage.getItem(BEST_KEY);
    const value = saved === null ? 0 : parseInt(saved, 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function saveBest(best) {
  try {
    window.localStorage.setItem(BEST_KEY, String(best));
  } catch {
    // A browser that refuses storage still plays the game.
  }
}

export function createGame(canvas, seed) {
  const rng = makeRng(seed);
  const game = {
    canvas,
    ctx: canvas.getContext('2d'),
    rng,
    stars: createStarfield(makeRng(seed ^ 0x9e3779b9), 170),
    input: createInput(canvas),
    audio: createAudio(seed),
    screen: SCREEN_MENU,
    time: 0,
    score: 0,
    starlight: 0,
    coreHp: CORE.maxHp,
    // The core's ceiling; the Core Fortress upgrade raises it.
    coreMaxHp: CORE.maxHp,
    best: loadBest(),
    player: createPlayer(),
    enemies: [],
    bullets: [],
    pickups: [],
    particles: createParticles(seed),
    combo: 1, comboTimer: 0, novaUnlocked: false, novaReady: false,
    waves: createWaves(),
    upgradeChoices: [],
    buttons: [],
    shake: 0,
    destroyed: 0,
    // In shot mode the staged pose is frozen: the loop renders but never steps.
    frozen: false,
  };
  return game;
}

export function startRun(game) {
  game.combo = 1; game.comboTimer = 0;
  game.novaUnlocked = false; game.novaReady = false;
  game.score = 0;
  game.starlight = 0;
  game.coreHp = CORE.maxHp;
  game.coreMaxHp = CORE.maxHp;
  game.destroyed = 0;
  game.enemies.length = 0;
  clearBullets(game.bullets);
  clearPickups(game.pickups);
  clearParticles(game.particles);
  resetPlayer(game.player);
  game.waves = createWaves();
  game.shake = 0;
  game.screen = SCREEN_PLAYING;
  startWave(game.waves, 1, game.rng);
  playWaveStart(game.audio);
}

function endRun(game) {
  game.screen = SCREEN_OVER;
  if (game.score > game.best) {
    game.best = game.score;
    saveBest(game.best);
  }
  playGameOver(game.audio);
}

export function chooseUpgrade(game, index) {
  const upgrade = game.upgradeChoices[index];
  if (!upgrade) return;
  upgrade.apply(game.player, game);
  playUpgrade(game.audio);
  game.upgradeChoices = [];
  game.screen = SCREEN_PLAYING;
  startWave(game.waves, game.waves.wave + 1, game.rng);
  game.novaReady = game.novaUnlocked;
  playWaveStart(game.audio);
}

function toMenu(game) {
  game.screen = SCREEN_MENU;
  game.enemies.length = 0;
  clearBullets(game.bullets);
  clearPickups(game.pickups);
  clearParticles(game.particles);
  resetPlayer(game.player);
  game.waves = createWaves();
}

function hitTest(point, rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

function handleClicks(game) {
  for (const click of game.input.clicks) {
    unlockAudio(game.audio);
    for (const button of game.buttons) {
      if (!hitTest(click, button)) continue;
      if (button.id === 'start') startRun(game);
      else if (button.id === 'restart') startRun(game);
      else if (button.id === 'resume') game.screen = SCREEN_PLAYING;
      else if (button.id === 'menu') toMenu(game);
      else if (button.id.startsWith('upgrade-')) chooseUpgrade(game, Number(button.id.slice('upgrade-'.length)));
      break;
    }
  }
}

function handleKeys(game) {
  const input = game.input;
  if (wasPressed(input, 'KeyM')) toggleMute(game.audio);
  if (game.screen === SCREEN_MENU) {
    if (wasPressed(input, 'Enter') || wasPressed(input, 'Space')) {
      unlockAudio(game.audio);
      startRun(game);
    }
    return;
  }
  if (game.screen === SCREEN_PLAYING) {
    if (wasPressed(input, 'KeyQ')) activateNova(game);
    if (wasPressed(input, 'KeyP') || wasPressed(input, 'Escape')) game.screen = SCREEN_PAUSED;
    return;
  }
  if (game.screen === SCREEN_PAUSED) {
    if (wasPressed(input, 'KeyP') || wasPressed(input, 'Escape') || wasPressed(input, 'Enter')) {
      game.screen = SCREEN_PLAYING;
    }
    return;
  }
  if (game.screen === SCREEN_UPGRADE) {
    if (wasPressed(input, 'Digit1')) chooseUpgrade(game, 0);
    else if (wasPressed(input, 'Digit2')) chooseUpgrade(game, 1);
    else if (wasPressed(input, 'Digit3')) chooseUpgrade(game, 2);
    return;
  }
  if (game.screen === SCREEN_OVER) {
    if (wasPressed(input, 'Enter') || wasPressed(input, 'KeyR')) startRun(game);
  }
}

function awardKill(game, enemy) {
  game.combo = game.comboTimer > 0 ? Math.min(5, game.combo + 1) : 1;
  game.comboTimer = game.player.comboWindow || 2.5;
  const points = enemy.score * game.combo;
  game.score += points;
  game.destroyed += 1;
  addFloater(game.particles, enemy.x, enemy.y, `+${points} ×${game.combo}`, PALETTE.starlight);
}

// The Leviathan's death: a triple blast, a long shake and a shower of
// starlight, on top of the normal kill award.
function bossDown(game, enemy) {
  explosion(game.particles, enemy.x, enemy.y, PALETTE.boss, true);
  explosion(game.particles, enemy.x - 30, enemy.y + 20, '#ffd166', true);
  explosion(game.particles, enemy.x + 30, enemy.y - 20, '#ffffff', false);
  game.particles.flashes.push({ x: enemy.x, y: enemy.y, life: 0.8, maxLife: 0.8, radius: 320, color: PALETTE.boss });
  game.shake = 20;
  addFloater(game.particles, enemy.x, enemy.y - 70, 'LEVIATHAN DOWN', PALETTE.boss);
  for (let i = 0; i < 5; i += 1) {
    dropStarlight(game.pickups, game.rng, enemy.x, enemy.y, game.player.dropBonus);
  }
  playExplosion(game.audio, true);
}

function activateNova(game) {
  if (!game.novaUnlocked || !game.novaReady) return;
  game.novaReady = false;
  for (const enemy of game.enemies.slice()) {
    if (enemy.x < -enemy.radius || enemy.x > VIEW.width + enemy.radius || enemy.y < -enemy.radius || enemy.y > VIEW.height + enemy.radius) continue;
    // The Leviathan is too big to vaporise: the nova wounds it instead.
    if (enemy.kind === KIND_BOSS) {
      enemy.hp -= BOSS.novaDamage;
      enemy.flash = 0.15;
      explosion(game.particles, enemy.x, enemy.y, PALETTE.boss, true);
      if (enemy.hp <= 0) {
        awardKill(game, enemy);
        bossDown(game, enemy);
        removeEnemy(game.enemies, enemy);
      }
      continue;
    }
    awardKill(game, enemy);
    explosion(game.particles, enemy.x, enemy.y, enemyColor(enemy.kind), true);
    dropStarlight(game.pickups, game.rng, enemy.x, enemy.y, game.player.dropBonus);
    removeEnemy(game.enemies, enemy);
  }
  game.particles.flashes.push({ x: CORE.x, y: CORE.y, life: 0.6, maxLife: 0.6, radius: 850, color: '#90e0ef' });
  game.shake = 12;
  playExplosion(game.audio, true);
}

function resolveBulletHits(game) {
  const { bullets, enemies, particles, audio } = game;
  for (let b = bullets.length - 1; b >= 0; b -= 1) {
    const bullet = bullets[b];
    let hit = null;
    for (const enemy of enemies) {
      // A piercing bolt never bites the same enemy twice.
      if (bullet.hitIds.includes(enemy.id)) continue;
      const dx = enemy.x - bullet.x;
      const dy = enemy.y - bullet.y;
      const reach = enemy.radius + bullet.radius;
      if (dx * dx + dy * dy <= reach * reach) {
        hit = enemy;
        break;
      }
    }
    if (!hit) continue;
    bullet.hitIds.push(hit.id);
    hit.hp -= bullet.damage;
    hit.flash = 0.09;
    // A piercing bolt spends one pierce and keeps flying; any other bolt
    // is spent on the hit.
    if (bullet.pierce > 0) bullet.pierce -= 1;
    else bullets.splice(b, 1);
    if (hit.hp <= 0) {
      const big = hit.radius >= 24;
      explosion(particles, hit.x, hit.y, enemyColor(hit.kind), big);
      awardKill(game, hit);
      dropStarlight(game.pickups, game.rng, hit.x, hit.y, game.player.dropBonus);
      playExplosion(audio, big);
      if (hit.kind === KIND_BOSS) bossDown(game, hit);
      killEnemy(enemies, hit, game.rng, game.waves.wave);
    } else {
      hitSparks(particles, bullet.x, bullet.y, PALETTE.bullet);
      addFloater(particles, bullet.x, bullet.y - 12, `-${Math.round(bullet.damage)}`, '#ade8f4', 14);
      playHit(audio);
    }
  }
}

function resolvePlayerHits(game) {
  const { player, enemies, particles, audio } = game;
  if (player.invulnerable > 0) return;
  for (const enemy of enemies.slice()) {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const reach = enemy.radius + player.radius;
    if (dx * dx + dy * dy > reach * reach) continue;
    const shielded = playerHit(player, enemy);
    explosion(particles, enemy.x, enemy.y, PALETTE.player, false);
    addFloater(
      particles,
      player.x,
      player.y - 30,
      shielded ? 'SHIELD DOWN' : 'HULL HIT',
      shielded ? PALETTE.player : PALETTE.danger,
    );
    game.shake = Math.max(game.shake, 8);
    playExplosion(audio, false);
    // The Leviathan is not destroyed by ramming the ship; it ploughs on.
    if (enemy.kind !== KIND_BOSS) removeEnemy(enemies, enemy);
    break;
  }
}

function resolveCoreHits(game, biters) {
  for (const enemy of biters) {
    if (!game.enemies.includes(enemy)) continue;
    removeEnemy(game.enemies, enemy);
    game.coreHp -= enemy.damage;
    game.shake = Math.max(game.shake, 16);
    coreBurst(game.particles, enemy.x, enemy.y);
    // A red flash rings the core so the damage reads at a glance.
    game.particles.flashes.push({ x: CORE.x, y: CORE.y, life: 0.4, maxLife: 0.4, radius: 230, color: PALETTE.danger });
    addFloater(game.particles, CORE.x, CORE.y - CORE.radius - 24, `-${enemy.damage}`, PALETTE.danger);
    playCoreHit(game.audio);
  }
  if (game.coreHp <= 0) {
    game.coreHp = 0;
    coreBurst(game.particles, CORE.x, CORE.y);
    endRun(game);
  }
}

// Boss upkeep: every Leviathan sheds minis on a timer, capped so the arena
// never floods. The timer lives on the boss object, so the screenshot
// snapshot/restore already carries it.
function updateBosses(game) {
  for (const enemy of game.enemies) {
    if (enemy.kind !== KIND_BOSS) continue;
    enemy.spawnTimer = (enemy.spawnTimer ?? BOSS.spawnGap) - STEP;
    if (enemy.spawnTimer <= 0) {
      enemy.spawnTimer = BOSS.spawnGap;
      if (game.enemies.length < 24) {
        spawnBossMinions(game.enemies, game.rng, enemy, game.waves.wave);
      }
    }
  }
}

// One fixed simulation step. Pure game logic: no rendering, no clock.
export function stepGame(game, dt) {
  game.time += dt;
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 34);
  if (game.screen === SCREEN_PLAYING) {
    game.comboTimer = Math.max(0, game.comboTimer - dt);
    if (game.comboTimer === 0) game.combo = 1;
    updatePlayer(game.player, game.input, dt, game.bullets, game.audio);
    updateBullets(game.bullets, dt);
    const biters = updateEnemies(game.enemies, dt);
    updateBosses(game);
    resolveBulletHits(game);
    resolvePlayerHits(game);
    if (biters.length > 0) resolveCoreHits(game, biters);
    const gathered = updatePickups(game.pickups, game.player, dt, game.particles, game.audio);
    if (gathered > 0) {
      game.starlight += gathered;
      game.score += gathered * 10;
      addFloater(game.particles, game.player.x, game.player.y - 28, `+${gathered * 10}`, PALETTE.starlight);
    }
    updateParticles(game.particles, dt);
    if (game.screen === SCREEN_PLAYING) {
      const bossSpawned = game.waves.bossSpawned;
      const state = updateWaves(game.waves, game.enemies, game.rng, dt);
      if (!bossSpawned && game.waves.bossSpawned) playBoss(game.audio);
      if (state === 'cleared') {
        // The wave-clear celebration: a score bonus that grows with the
        // wave, a gold burst around the core, and the upgrade choice.
        const bonus = 25 * game.waves.wave;
        game.score += bonus;
        addFloater(game.particles, CORE.x, CORE.y - CORE.radius - 60, `WAVE BONUS +${bonus}`, PALETTE.starlight);
        celebrationBurst(game.particles, CORE.x, CORE.y);
        game.upgradeChoices = rollUpgrades(game.rng, game.coreHp, game.coreMaxHp);
        game.screen = SCREEN_UPGRADE;
        playWaveStart(game.audio);
      }
    }
  } else if (game.screen === SCREEN_MENU || game.screen === SCREEN_OVER || game.screen === SCREEN_UPGRADE) {
    updateParticles(game.particles, dt);
  }
}

function frame(game, now) {
  const dt = Math.min(0.1, (now - game.lastNow) / 1000 || 0);
  game.lastNow = now;
  if (!game.frozen) {
    handleKeys(game);
    handleClicks(game);
  }
  if (!game.frozen) {
    game.accumulator += dt;
    let steps = 0;
    while (game.accumulator >= STEP && steps < 5) {
      stepGame(game, STEP);
      game.accumulator -= STEP;
      steps += 1;
    }
    if (steps === 5) game.accumulator = 0;
  }
  drawFrame(game.ctx, game);
  endFrame(game.input);
  requestAnimationFrame((t) => frame(game, t));
}

export function startLoop(game) {
  game.accumulator = 0;
  game.lastNow = performance.now();
  requestAnimationFrame((t) => frame(game, t));
}

// Boot: build the game, stage a screenshot pose when ?shot= is present,
// then run the loop. A pose is staged synchronously at load so the frame is
// already there when the screenshot is taken.
function boot() {
  const icon = document.createElement('link');
  icon.rel = 'icon';
  icon.href = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="#ffd166" d="M16 0 20 12 32 16 20 20 16 32 12 20 0 16 12 12Z"/></svg>');
  document.head.append(icon);
  const canvas = document.getElementById('game');
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = Number(params.get('seed')) || 7;
  const game = createGame(canvas, seed);
  // Expose the game for debugging and for automated play-tests.
  window.starfall = game;
  if (shot) {
    stageShot(shot, game, seed);
    game.frozen = true;
  }
  drawFrame(game.ctx, game);
  startLoop(game);
}

boot();
