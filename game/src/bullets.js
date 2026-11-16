// Projectiles: the sentinel's bolts. They fly straight, live until they leave
// the arena, and die on impact. Collision with enemies is resolved in main.js,
// where the score and the particles live.

import { PLAYER, VIEW } from './config.js';

export function spawnBullet(bullets, { x, y, vx, vy, damage }) {
  bullets.push({
    x,
    y,
    vx,
    vy,
    damage,
    radius: PLAYER.bulletRadius,
    life: 1.6,
  });
}

export function updateBullets(bullets, dt) {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    const margin = 30;
    if (
      bullet.life <= 0 ||
      bullet.x < -margin ||
      bullet.x > VIEW.width + margin ||
      bullet.y < -margin ||
      bullet.y > VIEW.height + margin
    ) {
      bullets.splice(i, 1);
    }
  }
}

export function clearBullets(bullets) {
  bullets.length = 0;
}
