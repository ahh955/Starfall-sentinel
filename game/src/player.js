// The sentinel ship: movement, aiming, shooting and the shield that absorbs
// shard impacts. Upgrades mutate the ship's stats; this file only applies them.

import { CORE, PLAYER, VIEW } from './config.js';
import { angleBetween, clamp, distance } from './utils.js';
import { spawnBullet } from './bullets.js';
import { isFiring, moveDirection } from './input.js';
import { playShoot } from './audio.js';

export function createPlayer() {
  return {
    x: VIEW.width / 2,
    y: VIEW.height / 2 + 170,
    angle: -Math.PI / 2,
    radius: PLAYER.radius,
    // Upgradeable stats, all starting at their base values.
    speed: PLAYER.speed,
    fireInterval: PLAYER.fireInterval,
    bulletDamage: PLAYER.bulletDamage,
    bulletCount: 1,
    bulletSpeed: PLAYER.bulletSpeed,
    // How many extra enemies each bolt passes through (Piercing Rounds).
    pierce: 0,
    magnetRadius: PLAYER.magnetRadius,
    maxShield: PLAYER.maxShield,
    shield: PLAYER.maxShield,
    fireCooldown: 0,
    invulnerable: 0,
    shieldRegen: 0,
    // Seconds a kill chain stays alive; the Long Fuse upgrade lengthens it.
    comboWindow: 2.5,
    // Extra starlight per drop; the Scavenger upgrade raises it.
    dropBonus: 0,
    // Engine flare animation phase, for the renderer.
    thrust: 0,
    // Recent ship positions, newest last; the renderer draws them as a
    // fading engine trail. Each point is { x, y, life }.
    trail: [],
  };
}

export function resetPlayer(player) {
  const fresh = createPlayer();
  Object.assign(player, fresh);
}

export function updatePlayer(player, input, dt, bullets, audio) {
  const dir = moveDirection(input);
  player.x = clamp(player.x + dir.x * player.speed * dt, player.radius, VIEW.width - player.radius);
  player.y = clamp(player.y + dir.y * player.speed * dt, player.radius, VIEW.height - player.radius);
  player.thrust = dir.x !== 0 || dir.y !== 0 ? 1 : Math.max(0, player.thrust - dt * 6);

  // Leave a fading trail behind the ship while it moves.
  if (player.thrust > 0.1) {
    player.trail.push({ x: player.x, y: player.y, life: 0.35 });
    if (player.trail.length > 24) player.trail.shift();
  }
  for (let i = player.trail.length - 1; i >= 0; i -= 1) {
    player.trail[i].life -= dt;
    if (player.trail[i].life <= 0) player.trail.splice(i, 1);
  }

  // The ship always faces the mouse cursor.
  player.angle = angleBetween(player.x, player.y, input.mouseX, input.mouseY);

  if (player.invulnerable > 0) player.invulnerable -= dt;
  if (player.shield < player.maxShield) {
    player.shieldRegen += dt;
    if (player.shieldRegen >= PLAYER.shieldRegenTime) {
      player.shieldRegen = 0;
      player.shield += 1;
    }
  }

  player.fireCooldown -= dt;
  if (isFiring(input) && player.fireCooldown <= 0) {
    player.fireCooldown = player.fireInterval;
    fireVolley(player, bullets);
    playShoot(audio);
  }
}

// One volley: a spread of bullets fanning out from the nose of the ship.
function fireVolley(player, bullets) {
  const count = player.bulletCount;
  const spread = 0.14; // radians between neighbouring bullets
  const nose = player.radius + 6;
  for (let i = 0; i < count; i += 1) {
    const offset = (i - (count - 1) / 2) * spread;
    const angle = player.angle + offset;
    spawnBullet(bullets, {
      x: player.x + Math.cos(angle) * nose,
      y: player.y + Math.sin(angle) * nose,
      vx: Math.cos(angle) * player.bulletSpeed,
      vy: Math.sin(angle) * player.bulletSpeed,
      damage: player.bulletDamage,
      pierce: player.pierce,
    });
  }
}

// An enemy reached the ship. The enemy is destroyed either way; the shield
// absorbs the blow when it has a charge, otherwise the ship is knocked back
// and briefly invulnerable. Returns true when a shield charge was spent.
export function playerHit(player, enemy) {
  if (player.invulnerable > 0) return false;
  const spent = player.shield > 0;
  if (spent) player.shield -= 1;
  player.invulnerable = PLAYER.invulnerableTime;
  player.shieldRegen = 0;
  // Shove the ship away from the impact so it does not sit inside the next shard.
  const away = angleBetween(enemy.x, enemy.y, player.x, player.y);
  player.x = clamp(player.x + Math.cos(away) * 42, player.radius, VIEW.width - player.radius);
  player.y = clamp(player.y + Math.sin(away) * 42, player.radius, VIEW.height - player.radius);
  return spent;
}

export function playerNearCore(player) {
  return distance(player.x, player.y, CORE.x, CORE.y) < CORE.biteRadius + player.radius;
}
