// The screenshot poses behind ?shot=start|play|upgrade|end&seed=N. Each pose
// plays the real game forward from a fresh run for a fixed stretch, steered
// by a small autopilot that drives the same input the player uses, so every
// frame is something a real game actually looks like. The run is seeded, so
// the same seed always stages the same frame (particles aside, which are
// cosmetic). The main loop then freezes the pose for the screenshot.

import { CORE, STEP, VIEW } from './config.js';
import { chooseUpgrade, startRun, stepGame } from './main.js';
import { SCREEN_OVER, SCREEN_PLAYING, SCREEN_UPGRADE } from './render.js';
import { rollUpgrades } from './upgrades.js';

const STEPS_PER_SECOND = 1 / STEP;

// Steer the ship toward a point by pressing the same keys a player would.
function steerToward(game, tx, ty) {
  const held = game.input.held;
  held.clear();
  const dx = tx - game.player.x;
  const dy = ty - game.player.y;
  if (dx > 14) held.add('KeyD');
  else if (dx < -14) held.add('KeyA');
  if (dy > 14) held.add('KeyS');
  else if (dy < -14) held.add('KeyW');
}

// Aim at the nearest living shard, or at the core when the arena is empty.
function aimAtNearestEnemy(game) {
  let best = null;
  let bestDist = Infinity;
  for (const enemy of game.enemies) {
    const d = (enemy.x - game.player.x) ** 2 + (enemy.y - game.player.y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = enemy;
    }
  }
  if (best) {
    game.input.mouseX = best.x;
    game.input.mouseY = best.y;
  } else {
    game.input.mouseX = CORE.x;
    game.input.mouseY = CORE.y;
  }
}

// The fighting autopilot: circle the core at a guard's distance, always
// aiming and firing at the closest shard. Good enough to clear early waves.
function fightingPilot(game, elapsed) {
  const orbitAngle = elapsed * 0.55;
  const guardX = CORE.x + Math.cos(orbitAngle) * 215;
  const guardY = CORE.y + Math.sin(orbitAngle) * 215;
  steerToward(game, guardX, guardY);
  aimAtNearestEnemy(game);
  game.input.mouseDown = true;
}

// The passive autopilot: park in a corner and never fire, so the shards reach
// the core and the run ends. Used for the game-over pose.
function passivePilot(game) {
  steerToward(game, 90, 90);
  game.input.mouseX = VIEW.width / 2;
  game.input.mouseY = VIEW.height / 2;
  game.input.mouseDown = false;
}

function runSteps(game, pilot, maxSeconds, stopWhen) {
  const maxSteps = Math.floor(maxSeconds * STEPS_PER_SECOND);
  for (let step = 0; step < maxSteps; step += 1) {
    const elapsed = step * STEP;
    if (game.screen === SCREEN_PLAYING) pilot(game, elapsed);
    else if (game.screen === SCREEN_UPGRADE) {
      // An upgrade screen mid-pose: take the first card and keep going.
      chooseUpgrade(game, 0);
    }
    stepGame(game, STEP);
    if (stopWhen && stopWhen(game, elapsed)) return true;
    if (game.screen === SCREEN_OVER) return true;
  }
  return false;
}

// How photogenic the current frame is: shards near the core count most,
// on-screen shards and flying bolts add a little. The play pose keeps the
// best-scoring frame of the wave, so the action is centred, not at an edge.
function frameScore(game) {
  let near = 0;
  let visible = 0;
  for (const enemy of game.enemies) {
    const d = Math.hypot(enemy.x - CORE.x, enemy.y - CORE.y);
    if (d < 430) near += 1;
    if (enemy.x > 40 && enemy.x < VIEW.width - 40 && enemy.y > 40 && enemy.y < VIEW.height - 40) visible += 1;
  }
  return near * 3 + visible + Math.min(game.bullets.length, 4);
}

// A plain-data copy of everything the simulation can change (the canvas,
// the input listeners and the audio context are not part of it).
function snapshotSim(game) {
  const copy = (value) => JSON.parse(JSON.stringify(value));
  return {
    time: game.time,
    score: game.score,
    starlight: game.starlight,
    coreHp: game.coreHp,
    destroyed: game.destroyed,
    shake: game.shake,
    screen: game.screen,
    player: copy(game.player),
    enemies: copy(game.enemies),
    bullets: copy(game.bullets),
    pickups: copy(game.pickups),
    particles: copy(game.particles),
    waves: copy(game.waves),
  };
}

function restoreSim(game, snap) {
  game.time = snap.time;
  game.score = snap.score;
  game.starlight = snap.starlight;
  game.coreHp = snap.coreHp;
  game.destroyed = snap.destroyed;
  game.shake = snap.shake;
  game.screen = snap.screen;
  game.player = snap.player;
  game.enemies = snap.enemies;
  game.bullets = snap.bullets;
  game.pickups = snap.pickups;
  game.particles = snap.particles;
  game.waves = snap.waves;
}

// Fight wave 1 to a clear and take the first upgrade, so a pose can start
// from a run that already has a score. Returns true when wave 2 began.
function clearFirstWave(game) {
  runSteps(game, fightingPilot, 150, (g) => g.screen === SCREEN_UPGRADE);
  if (game.screen !== SCREEN_UPGRADE) return false;
  chooseUpgrade(game, 0);
  return game.screen === SCREEN_PLAYING;
}

// Set the game to the named pose. Unknown names fall back to the title screen.
export function stageShot(name, game) {
  if (name === 'play') {
    startRun(game);
    // Mid-wave-2 is the busy frame: wave 1 is cleared, the scoreboard has
    // points on it, and the second wave's thirteen shards are pouring in.
    // The pose scans the wave in quarter-second slices and keeps the
    // best-scoring frame, so the action is centred, not at an edge.
    if (!clearFirstWave(game)) {
      runSteps(game, fightingPilot, 9, null);
      return;
    }
    let best = null;
    let bestScore = -1;
    const slice = Math.floor(0.25 * STEPS_PER_SECOND);
    for (let i = 0; i < 60; i += 1) {
      for (let s = 0; s < slice; s += 1) {
        if (game.screen === SCREEN_PLAYING) fightingPilot(game, game.time);
        else if (game.screen === SCREEN_UPGRADE) chooseUpgrade(game, 0);
        stepGame(game, STEP);
      }
      if (game.screen !== SCREEN_PLAYING) break;
      const score = frameScore(game);
      if (score > bestScore) {
        bestScore = score;
        best = snapshotSim(game);
      }
    }
    if (best) restoreSim(game, best);
    return;
  }
  if (name === 'upgrade') {
    startRun(game);
    runSteps(game, fightingPilot, 150, (g) => g.screen === SCREEN_UPGRADE);
    if (game.screen !== SCREEN_UPGRADE) {
      // Insurance: build the upgrade screen from the run's real state.
      game.enemies.length = 0;
      game.upgradeChoices = rollUpgrades(game.rng, game.coreHp);
      game.screen = SCREEN_UPGRADE;
    }
    return;
  }
  if (name === 'end') {
    startRun(game);
    // Earn a real score first: fight wave 1, then stand down and let the
    // later waves take the core, so the final score is a run's, not a zero.
    clearFirstWave(game);
    runSteps(game, passivePilot, 400, (g) => g.screen === SCREEN_OVER);
    if (game.screen !== SCREEN_OVER) {
      // Insurance: the core falls by decree, with the run's real score.
      game.coreHp = 0;
      game.screen = SCREEN_OVER;
      if (game.score > game.best) game.best = game.score;
    }
    return;
  }
  // 'start' and anything else: the title screen, a couple of seconds in so
  // the starfield has drifted and the decorative shards have spread out.
  game.time = 2.5;
}
