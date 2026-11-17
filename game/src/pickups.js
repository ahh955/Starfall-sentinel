// Starlight: the glowing drops shards leave behind. They drift, blink out
// after a while, and fly to the ship when it comes within magnet range.
// Collecting one raises the starlight count and adds a small score bonus.

import { PICKUP } from './config.js';
import { distance } from './utils.js';
import { collectBurst } from './particles.js';
import { playPickup } from './audio.js';

export function dropStarlight(pickups, rng, x, y, extra) {
  pickups.push(makeDrop(rng, x, y));
  if (rng.next() < PICKUP.bonusChance) {
    pickups.push(makeDrop(rng, x + rng.range(-18, 18), y + rng.range(-18, 18)));
  }
  // The Scavenger upgrade adds one guaranteed drop per kill per level.
  for (let i = 0; i < (extra || 0); i += 1) {
    pickups.push(makeDrop(rng, x + rng.range(-24, 24), y + rng.range(-24, 24)));
  }
}

function makeDrop(rng, x, y) {
  return {
    x,
    y,
    vx: (rng.next() - 0.5) * 40,
    vy: (rng.next() - 0.5) * 40,
    radius: PICKUP.radius,
    life: PICKUP.lifetime,
    // Twinkle phase, so drops shimmer at different rates.
    phase: rng.next() * Math.PI * 2,
  };
}

// Move drops, pull the near ones toward the ship, and collect the ones that
// reach it. Returns how many were collected this step.
export function updatePickups(pickups, player, dt, particles, audio) {
  let collected = 0;
  for (let i = pickups.length - 1; i >= 0; i -= 1) {
    const drop = pickups[i];
    drop.life -= dt;
    if (drop.life <= 0) {
      pickups.splice(i, 1);
      continue;
    }
    const d = distance(drop.x, drop.y, player.x, player.y);
    if (d < player.magnetRadius) {
      // Magnet pull grows stronger the closer the drop gets.
      const pull = 720 * (1 - d / (player.magnetRadius + 1)) + 160;
      drop.vx += ((player.x - drop.x) / (d || 1)) * pull * dt * 4;
      drop.vy += ((player.y - drop.y) / (d || 1)) * pull * dt * 4;
    }
    drop.vx *= 1 - 1.6 * dt;
    drop.vy *= 1 - 1.6 * dt;
    drop.x += drop.vx * dt;
    drop.y += drop.vy * dt;
    if (d < PICKUP.collectRadius + player.radius * 0.6) {
      pickups.splice(i, 1);
      collected += 1;
      collectBurst(particles, drop.x, drop.y);
      playPickup(audio);
    }
  }
  return collected;
}

export function clearPickups(pickups) {
  pickups.length = 0;
}
