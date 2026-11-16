// Starfall Sentinel: the game loop and the state machine. Screens are menu,
// playing, upgrade, paused and gameover; this file moves between them, runs
// the fixed-timestep simulation, resolves collisions and keeps the score.
// The loop is started by startLoop; createGame only builds the state, so the
// screenshot poser can drive the same simulation headlessly, step by step.

import { CORE, PALETTE, STEP, VIEW } from './config.js';
import { makeRng } from './utils.js';
import { createInput, endFrame, wasPressed } from './input.js';
import {
  createAudio,
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
import { enemyColor, killEnemy, removeEnemy, updateEnemies } from './enemies.js';
import { clearParticles, coreBurst, createParticles, explosion, addFloater, hitSparks, updateParticles } from './particles.js';
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
    audio: createAudio(),
    screen: SCREEN_MENU,
    time: 0,
    score: 0,
    starlight: 0,
    coreHp: CORE.maxHp,
    best: loadBest(),
    player: createPlayer(),
    enemies: [],
    bullets: [],
    pickups: [],
    particles: createParticles(),
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
  game.score = 0;
  game.starlight = 0;
  game.coreHp = CORE.maxHp;
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

function resolveBulletHits(game) {
  const { bullets, enemies, particles, audio } = game;
  for (let b = bullets.length - 1; b >= 0; b -= 1) {
    const bullet = bullets[b];
    let hit = null;
    for (const enemy of enemies) {
      const dx = enemy.x - bullet.x;
      const dy = enemy.y - bullet.y;
      const reach = enemy.radius + bullet.radius;
      if (dx * dx + dy * dy <= reach * reach) {
        hit = enemy;
        break;
      }
    }
    if (!hit) continue;
    bullets.splice(b, 1);
    hit.hp -= bullet.damage;
    hit.flash = 0.09;
    if (hit.hp <= 0) {
      const big = hit.radius >= 24;
      explosion(particles, hit.x, hit.y, enemyColor(hit.kind), big);
      addFloater(particles, hit.x, hit.y, `+${hit.score}`, PALETTE.starlight);
      game.score += hit.score;
      game.destroyed += 1;
      dropStarlight(game.pickups, game.rng, hit.x, hit.y);
      playExplosion(audio, big);
      killEnemy(enemies, hit, game.rng, game.waves.wave);
    } else {
      hitSparks(particles, bullet.x, bullet.y, PALETTE.bullet);
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
    removeEnemy(enemies, enemy);
    break;
  }
}

function resolveCoreHits(game, biters) {
  for (const enemy of biters) {
    removeEnemy(game.enemies, enemy);
    game.coreHp -= enemy.damage;
    game.shake = Math.max(game.shake, 16);
    coreBurst(game.particles, enemy.x, enemy.y);
    addFloater(game.particles, CORE.x, CORE.y - CORE.radius - 24, `-${enemy.damage}`, PALETTE.danger);
    playCoreHit(game.audio);
  }
  if (game.coreHp <= 0) {
    game.coreHp = 0;
    coreBurst(game.particles, CORE.x, CORE.y);
    endRun(game);
  }
}

// One fixed simulation step. Pure game logic: no rendering, no clock.
export function stepGame(game, dt) {
  game.time += dt;
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 34);
  if (game.screen === SCREEN_PLAYING) {
    updatePlayer(game.player, game.input, dt, game.bullets, game.audio);
    updateBullets(game.bullets, dt);
    const biters = updateEnemies(game.enemies, dt);
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
      const state = updateWaves(game.waves, game.enemies, game.rng, dt);
      if (state === 'cleared') {
        game.upgradeChoices = rollUpgrades(game.rng, game.coreHp);
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
