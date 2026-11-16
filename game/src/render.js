// Every pixel the game draws: the starfield, the core, the ship, the shards,
// the HUD and all four screens. The game state is read-only here; this module
// never moves an entity, it only paints the frame and reports button rects.

import { CORE, PALETTE, VIEW } from './config.js';
import { enemyColor } from './enemies.js';
import { clamp, TAU } from './utils.js';

export const SCREEN_MENU = 'menu';
export const SCREEN_PLAYING = 'playing';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'gameover';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export function createStarfield(rng, count) {
  const stars = [];
  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: rng.next() * VIEW.width,
      y: rng.next() * VIEW.height,
      size: rng.range(0.6, 2.1),
      phase: rng.next() * TAU,
      speed: rng.range(0.6, 2.4),
      drift: rng.range(2, 9),
    });
  }
  return stars;
}

function text(ctx, str, x, y, size, color, weight, align) {
  ctx.font = `${weight || 600} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function glowText(ctx, str, x, y, size, color, weight) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 22;
  text(ctx, str, x, y, size, color, weight || 800);
  ctx.restore();
}

// One rounded rectangle, filled and stroked.
function panel(ctx, x, y, w, h, radius, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function button(ctx, game, id, x, y, w, h, label, accent) {
  const hovered =
    game.input.mouseX >= x && game.input.mouseX <= x + w && game.input.mouseY >= y && game.input.mouseY <= y + h;
  panel(
    ctx,
    x,
    y,
    w,
    h,
    12,
    hovered ? 'rgba(76, 201, 240, 0.22)' : 'rgba(10, 18, 38, 0.85)',
    hovered ? accent : 'rgba(143, 168, 200, 0.6)',
  );
  text(ctx, label, x + w / 2, y + h / 2 + 1, 22, hovered ? '#ffffff' : PALETTE.text, 700);
  game.buttons.push({ id, x, y, w, h });
}

function drawStarfield(ctx, stars, time) {
  ctx.fillStyle = PALETTE.background;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  for (const star of stars) {
    const twinkle = 0.55 + 0.45 * Math.sin(time * star.speed + star.phase);
    const y = (star.y + time * star.drift) % VIEW.height;
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = PALETTE.star;
    ctx.fillRect(star.x, y, star.size, star.size);
  }
  ctx.globalAlpha = 1;
}

function drawCore(ctx, game, time) {
  const hpFrac = clamp(game.coreHp / CORE.maxHp, 0, 1);
  const pulse = 1 + Math.sin(time * 2.2) * 0.04;
  const r = CORE.radius * pulse;
  if (hpFrac <= 0) {
    // The fallen core: a cold husk with one dying ember, so the game-over
    // screen reads as a loss instead of a star still burning bright.
    const ember = ctx.createRadialGradient(CORE.x, CORE.y, r * 0.2, CORE.x, CORE.y, r * 2.2);
    ember.addColorStop(0, 'rgba(255, 77, 109, 0.22)');
    ember.addColorStop(1, 'rgba(255, 77, 109, 0)');
    ctx.fillStyle = ember;
    ctx.beginPath();
    ctx.arc(CORE.x, CORE.y, r * 2.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#241016';
    ctx.beginPath();
    ctx.arc(CORE.x, CORE.y, r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#5c1a24';
    ctx.beginPath();
    ctx.arc(CORE.x, CORE.y, r * 0.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 120, 110, ${0.25 + 0.15 * Math.sin(time * 1.5)})`;
    ctx.beginPath();
    ctx.arc(CORE.x, CORE.y, r * 0.22, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(CORE.x, CORE.y, r + 14, 0, TAU);
    ctx.stroke();
    return;
  }
  // Halo.
  const halo = ctx.createRadialGradient(CORE.x, CORE.y, r * 0.4, CORE.x, CORE.y, r * 3.1);
  halo.addColorStop(0, 'rgba(255, 159, 28, 0.5)');
  halo.addColorStop(0.5, 'rgba(255, 159, 28, 0.12)');
  halo.addColorStop(1, 'rgba(255, 159, 28, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(CORE.x, CORE.y, r * 3.1, 0, TAU);
  ctx.fill();
  // The bite ring: shards must cross it to hurt the core.
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.25)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 14]);
  ctx.beginPath();
  ctx.arc(CORE.x, CORE.y, CORE.biteRadius, time * 0.1, time * 0.1 + TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  // Body: layered discs for a molten look.
  ctx.fillStyle = PALETTE.coreGlow;
  ctx.beginPath();
  ctx.arc(CORE.x, CORE.y, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = PALETTE.core;
  ctx.beginPath();
  ctx.arc(CORE.x, CORE.y, r * 0.72, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff8e1';
  ctx.beginPath();
  ctx.arc(CORE.x, CORE.y, r * 0.42, 0, TAU);
  ctx.fill();
  // HP ring around the core.
  const hpColor = hpFrac > 0.5 ? PALETTE.heal : hpFrac > 0.25 ? PALETTE.core : PALETTE.danger;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(CORE.x, CORE.y, r + 14, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = hpColor;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(CORE.x, CORE.y, r + 14, -Math.PI / 2, -Math.PI / 2 + hpFrac * TAU);
  ctx.stroke();
  // Orbiting sparks.
  for (let i = 0; i < 5; i += 1) {
    const a = time * 0.7 + (i / 5) * TAU;
    ctx.fillStyle = PALETTE.core;
    ctx.beginPath();
    ctx.arc(CORE.x + Math.cos(a) * (r + 26), CORE.y + Math.sin(a) * (r + 26), 3, 0, TAU);
    ctx.fill();
  }
}

function drawPlayerShip(ctx, player, time) {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  if (player.invulnerable > 0 && Math.floor(time * 14) % 2 === 0) ctx.globalAlpha = 0.45;
  // Engine flame.
  if (player.thrust > 0.1) {
    const flame = 14 + Math.sin(time * 32) * 4 + player.thrust * 6;
    ctx.fillStyle = 'rgba(255, 159, 28, 0.85)';
    ctx.beginPath();
    ctx.moveTo(-player.radius * 0.8, -6);
    ctx.lineTo(-player.radius * 0.8 - flame, 0);
    ctx.lineTo(-player.radius * 0.8, 6);
    ctx.closePath();
    ctx.fill();
  }
  // Hull: a swept dart.
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.moveTo(player.radius + 6, 0);
  ctx.lineTo(-player.radius * 0.7, -player.radius * 0.85);
  ctx.lineTo(-player.radius * 0.35, 0);
  ctx.lineTo(-player.radius * 0.7, player.radius * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.playerGlow;
  ctx.beginPath();
  ctx.moveTo(player.radius + 2, 0);
  ctx.lineTo(-player.radius * 0.3, -player.radius * 0.4);
  ctx.lineTo(-player.radius * 0.3, player.radius * 0.4);
  ctx.closePath();
  ctx.fill();
  // Cockpit.
  ctx.fillStyle = '#0a2540';
  ctx.beginPath();
  ctx.arc(player.radius * 0.25, 0, 4.5, 0, TAU);
  ctx.fill();
  ctx.restore();
  // Shield bubble while a charge is ready and the ship is invulnerable.
  if (player.invulnerable > 0) {
    ctx.strokeStyle = 'rgba(144, 224, 239, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 10, 0, TAU);
    ctx.stroke();
  }
}

function drawEnemy(ctx, enemy) {
  const color = enemyColor(enemy.kind);
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(enemy.rotation);
  // Outer glow silhouette.
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < enemy.vertices.length; i += 1) {
    const v = enemy.vertices[i];
    if (i === 0) ctx.moveTo(v.x * 1.35, v.y * 1.35);
    else ctx.lineTo(v.x * 1.35, v.y * 1.35);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  // Body.
  ctx.fillStyle = '#1a0b2e';
  ctx.beginPath();
  for (let i = 0; i < enemy.vertices.length; i += 1) {
    const v = enemy.vertices[i];
    if (i === 0) ctx.moveTo(v.x, v.y);
    else ctx.lineTo(v.x, v.y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = enemy.flash > 0 ? '#ffffff' : color;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Bright heart.
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, enemy.radius * 0.28, 0, TAU);
  ctx.fill();
  ctx.restore();
  // HP bar for tough enemies only, so the screen stays clean.
  if (enemy.maxHp >= 6 && enemy.hp < enemy.maxHp) {
    const w = enemy.radius * 1.8;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 12, w, 5);
    ctx.fillStyle = color;
    ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 12, w * (enemy.hp / enemy.maxHp), 5);
  }
}

function drawBullets(ctx, bullets) {
  for (const b of bullets) {
    // A short motion trail, so a volley reads as bolts, not dots.
    ctx.strokeStyle = 'rgba(173, 232, 244, 0.5)';
    ctx.lineWidth = b.radius * 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.035, b.y - b.vy * 0.035);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(173, 232, 244, 0.45)';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 2.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = PALETTE.bullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 0.45, 0, TAU);
    ctx.fill();
  }
}

function drawPickups(ctx, pickups, time) {
  for (const drop of pickups) {
    const blink = drop.life < 3 ? 0.4 + 0.6 * Math.abs(Math.sin(time * 8)) : 1;
    const s = drop.radius * (0.9 + 0.15 * Math.sin(time * 5 + drop.phase));
    ctx.globalAlpha = blink;
    ctx.save();
    ctx.translate(drop.x, drop.y);
    ctx.rotate(time * 2 + drop.phase);
    ctx.fillStyle = PALETTE.starlight;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.55, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.55, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fffbe6';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.45);
    ctx.lineTo(s * 0.25, 0);
    ctx.lineTo(0, s * 0.45);
    ctx.lineTo(-s * 0.25, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

function drawParticles(ctx, particles) {
  for (const p of particles.sparks) {
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of particles.floaters) {
    ctx.globalAlpha = clamp(f.life / f.maxLife, 0, 1);
    text(ctx, f.text, f.x, f.y, 18, f.color, 700);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, game) {
  // Score, top left.
  text(ctx, 'SCORE', 28, 26, 14, PALETTE.dimText, 700, 'left');
  text(ctx, String(game.score), 28, 52, 30, PALETTE.text, 800, 'left');
  // Starlight under the score.
  ctx.fillStyle = PALETTE.starlight;
  ctx.save();
  ctx.translate(36, 86);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-6, -6, 12, 12);
  ctx.restore();
  text(ctx, String(game.starlight), 52, 86, 22, PALETTE.starlight, 700, 'left');
  // Wave, top centre.
  text(ctx, `WAVE ${game.waves.wave}`, VIEW.width / 2, 30, 22, PALETTE.text, 800);
  const remaining = game.waves.queue.length + game.enemies.length;
  text(ctx, `${remaining} shards left`, VIEW.width / 2, 56, 15, PALETTE.dimText, 600);
  // Core HP, top right.
  text(ctx, 'CORE', VIEW.width - 28, 26, 14, PALETTE.dimText, 700, 'right');
  const barW = 190;
  const barX = VIEW.width - 28 - barW;
  const hpFrac = clamp(game.coreHp / CORE.maxHp, 0, 1);
  const hpColor = hpFrac > 0.5 ? PALETTE.heal : hpFrac > 0.25 ? PALETTE.core : PALETTE.danger;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(barX, 38, barW, 14);
  ctx.fillStyle = hpColor;
  ctx.fillRect(barX, 38, barW * hpFrac, 14);
  text(ctx, `${Math.ceil(game.coreHp)}`, VIEW.width - 28, 70, 18, hpColor, 700, 'right');
  // Shield pips under the core bar.
  text(ctx, 'SHIELD', VIEW.width - 28, 96, 14, PALETTE.dimText, 700, 'right');
  for (let i = 0; i < game.player.maxShield; i += 1) {
    const x = VIEW.width - 28 - i * 26;
    ctx.beginPath();
    ctx.arc(x - 8, 116, 8, 0, TAU);
    ctx.fillStyle = i < game.player.shield ? PALETTE.player : 'rgba(255, 255, 255, 0.12)';
    ctx.fill();
  }
  // Wave banner.
  if (game.waves.banner > 0) {
    const alpha = clamp(game.waves.banner / 0.6, 0, 1) * clamp((WAVES_BANNER_FADE - game.waves.banner) / 0.3 + 1, 0, 1);
    ctx.globalAlpha = clamp(alpha, 0, 1);
    glowText(ctx, `WAVE ${game.waves.wave}`, VIEW.width / 2, 150, 54, PALETTE.text);
    ctx.globalAlpha = 1;
  }
  // Low core warning: a pulsing red frame.
  if (game.coreHp <= 30 && game.coreHp > 0) {
    const pulse = 0.12 + 0.1 * Math.sin(game.time * 6);
    ctx.strokeStyle = `rgba(255, 77, 109, ${pulse + 0.25})`;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, VIEW.width - 6, VIEW.height - 6);
  }
}

const WAVES_BANNER_FADE = 2.2;

function drawMenu(ctx, game) {
  // Decorative shards drifting around the core behind the title.
  for (let i = 0; i < 6; i += 1) {
    const a = game.time * 0.12 + (i / 6) * TAU;
    const r = 250 + (i % 2) * 70;
    const x = CORE.x + Math.cos(a) * r;
    const y = CORE.y + Math.sin(a * 1.3) * r * 0.6;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(game.time * 0.4 + i);
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = i % 2 === 0 ? PALETTE.shard : PALETTE.dart;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let v = 0; v < 6; v += 1) {
      const va = (v / 6) * TAU;
      const vr = 16 + (v % 2) * 8;
      if (v === 0) ctx.moveTo(Math.cos(va) * vr, Math.sin(va) * vr);
      else ctx.lineTo(Math.cos(va) * vr, Math.sin(va) * vr);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // The core burns at the centre of the screen, so the title sits above it
  // and the instructions below it: nothing is ever drawn over the star.
  glowText(ctx, 'STARFALL', VIEW.width / 2, 128, 76, PALETTE.player);
  glowText(ctx, 'SENTINEL', VIEW.width / 2, 198, 76, PALETTE.core);
  text(ctx, 'Defend the star core from the void shards.', VIEW.width / 2, 256, 22, PALETTE.dimText, 500);
  const lines = [
    'WASD or arrow keys — fly    ·    Mouse — aim    ·    Hold click or Space — shoot',
    'Shards that reach the core damage it. Clear a wave to pick an upgrade.',
    'P or Esc — pause    ·    M — mute',
  ];
  lines.forEach((line, i) => {
    text(ctx, line, VIEW.width / 2, 478 + i * 28, 17, PALETTE.text, 500);
  });
  button(ctx, game, 'start', VIEW.width / 2 - 130, 556, 260, 54, 'START DEFENSE', PALETTE.player);
  if (game.best > 0) text(ctx, `Best score: ${game.best}`, VIEW.width / 2, 640, 18, PALETTE.starlight, 700);
  text(ctx, 'An original game by ahh955 · built for make.fun', VIEW.width / 2, 690, 14, PALETTE.dimText, 500);
}

function upgradeIcon(ctx, icon, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  if (icon === 'burst') {
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * size * 0.3, Math.sin(a) * size * 0.3);
      ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.28, 0, TAU);
    ctx.fill();
  } else if (icon === 'spread') {
    for (const a of [-0.5, 0, 0.5]) {
      ctx.beginPath();
      ctx.arc(Math.sin(a) * size * 0.8, -Math.cos(a) * size * 0.8, size * 0.22, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(0, 0);
    ctx.stroke();
  } else if (icon === 'bolt') {
    ctx.beginPath();
    ctx.moveTo(size * 0.25, -size);
    ctx.lineTo(-size * 0.45, size * 0.1);
    ctx.lineTo(size * 0.05, size * 0.1);
    ctx.lineTo(-size * 0.25, size);
    ctx.lineTo(size * 0.5, -size * 0.15);
    ctx.lineTo(0, -size * 0.15);
    ctx.closePath();
    ctx.fill();
  } else if (icon === 'wings') {
    ctx.beginPath();
    ctx.arc(-size * 0.45, 0, size * 0.55, Math.PI * 0.9, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(size * 0.45, 0, size * 0.55, Math.PI * 1.1, Math.PI * 2.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.22, 0, TAU);
    ctx.fill();
  } else if (icon === 'shield') {
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.8, -size * 0.5);
    ctx.lineTo(size * 0.8, size * 0.2);
    ctx.quadraticCurveTo(size * 0.8, size * 0.8, 0, size);
    ctx.quadraticCurveTo(-size * 0.8, size * 0.8, -size * 0.8, size * 0.2);
    ctx.lineTo(-size * 0.8, -size * 0.5);
    ctx.closePath();
    ctx.stroke();
  } else if (icon === 'magnet') {
    ctx.beginPath();
    ctx.arc(0, -size * 0.2, size * 0.7, Math.PI, 0, true);
    ctx.lineTo(size * 0.7, size * 0.6);
    ctx.lineTo(size * 0.35, size * 0.6);
    ctx.lineTo(size * 0.35, -size * 0.2);
    ctx.arc(0, -size * 0.2, size * 0.35, 0, Math.PI, true);
    ctx.lineTo(-size * 0.35, size * 0.6);
    ctx.lineTo(-size * 0.7, size * 0.6);
    ctx.closePath();
    ctx.stroke();
  } else if (icon === 'core') {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.55, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * size * 0.7, Math.sin(a) * size * 0.7);
      ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
      ctx.stroke();
    }
  } else {
    // nova
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.45, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.85, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function drawUpgradeScreen(ctx, game) {
  ctx.fillStyle = 'rgba(3, 4, 12, 0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  glowText(ctx, `WAVE ${game.waves.wave} CLEARED`, VIEW.width / 2, 110, 44, PALETTE.heal);
  text(ctx, 'Choose one upgrade', VIEW.width / 2, 162, 22, PALETTE.dimText, 500);
  const cardW = 280;
  const cardH = 300;
  const gap = 36;
  const totalW = cardW * 3 + gap * 2;
  const startX = (VIEW.width - totalW) / 2;
  const y = 210;
  game.upgradeChoices.forEach((upgrade, i) => {
    const x = startX + i * (cardW + gap);
    const hovered =
      game.input.mouseX >= x && game.input.mouseX <= x + cardW && game.input.mouseY >= y && game.input.mouseY <= y + cardH;
    panel(
      ctx,
      x,
      y,
      cardW,
      cardH,
      16,
      hovered ? '#16283f' : '#0c142c',
      hovered ? PALETTE.player : 'rgba(143, 168, 200, 0.45)',
    );
    upgradeIcon(ctx, upgrade.icon, x + cardW / 2, y + 78, 34, PALETTE.core);
    text(ctx, upgrade.name, x + cardW / 2, y + 158, 24, PALETTE.text, 700);
    // Wrap the description onto two lines at most.
    const words = upgrade.desc.split(' ');
    let line1 = '';
    let line2 = '';
    for (const word of words) {
      if ((line1 + word).length <= 20) line1 += (line1 ? ' ' : '') + word;
      else line2 += (line2 ? ' ' : '') + word;
    }
    text(ctx, line1, x + cardW / 2, y + 200, 17, PALETTE.dimText, 500);
    if (line2) text(ctx, line2, x + cardW / 2, y + 226, 17, PALETTE.dimText, 500);
    text(ctx, `Press ${i + 1}`, x + cardW / 2, y + cardH - 28, 15, PALETTE.dimText, 600);
    game.buttons.push({ id: `upgrade-${i}`, x, y, w: cardW, h: cardH });
  });
}

function drawPauseScreen(ctx, game) {
  ctx.fillStyle = 'rgba(3, 4, 12, 0.7)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  glowText(ctx, 'PAUSED', VIEW.width / 2, 220, 60, PALETTE.text);
  text(ctx, 'The void waits for no one. Well — just this once.', VIEW.width / 2, 286, 19, PALETTE.dimText, 500);
  button(ctx, game, 'resume', VIEW.width / 2 - 130, 340, 260, 54, 'RESUME', PALETTE.player);
  button(ctx, game, 'restart', VIEW.width / 2 - 130, 410, 260, 54, 'RESTART RUN', PALETTE.core);
  button(ctx, game, 'menu', VIEW.width / 2 - 130, 480, 260, 54, 'MAIN MENU', PALETTE.dimText);
}

function drawGameOverScreen(ctx, game) {
  ctx.fillStyle = 'rgba(10, 2, 10, 0.78)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  glowText(ctx, 'THE CORE HAS FALLEN', VIEW.width / 2, 150, 52, PALETTE.danger);
  text(ctx, 'The void swallows another star.', VIEW.width / 2, 206, 20, PALETTE.dimText, 500);
  const isBest = game.score >= game.best && game.score > 0;
  if (isBest) text(ctx, 'NEW BEST SCORE!', VIEW.width / 2, 256, 24, PALETTE.starlight, 800);
  text(ctx, 'FINAL SCORE', VIEW.width / 2, 306, 16, PALETTE.dimText, 700);
  text(ctx, String(game.score), VIEW.width / 2, 352, 64, PALETTE.text, 800);
  text(ctx, `Wave reached: ${game.waves.wave}    ·    Starlight: ${game.starlight}    ·    Best: ${game.best}`, VIEW.width / 2, 416, 20, PALETTE.dimText, 600);
  button(ctx, game, 'restart', VIEW.width / 2 - 130, 470, 260, 58, 'PLAY AGAIN', PALETTE.player);
  button(ctx, game, 'menu', VIEW.width / 2 - 130, 544, 260, 54, 'MAIN MENU', PALETTE.dimText);
}

// Paint one frame. `game.buttons` is rebuilt every frame with the clickable
// rects of the current screen, so main.js can route clicks without knowing
// where anything is drawn.
export function drawFrame(ctx, game) {
  game.buttons.length = 0;
  ctx.save();
  if (game.shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
  }
  drawStarfield(ctx, game.stars, game.time);
  drawCore(ctx, game, game.time);
  if (game.screen !== SCREEN_MENU) {
    drawPickups(ctx, game.pickups, game.time);
    for (const enemy of game.enemies) drawEnemy(ctx, enemy);
    drawBullets(ctx, game.bullets);
    if (game.screen !== SCREEN_OVER) drawPlayerShip(ctx, game.player, game.time);
    drawParticles(ctx, game.particles);
    drawHud(ctx, game);
  }
  ctx.restore();
  if (game.screen === SCREEN_MENU) drawMenu(ctx, game);
  else if (game.screen === SCREEN_UPGRADE) drawUpgradeScreen(ctx, game);
  else if (game.screen === SCREEN_PAUSED) drawPauseScreen(ctx, game);
  else if (game.screen === SCREEN_OVER) drawGameOverScreen(ctx, game);
}
