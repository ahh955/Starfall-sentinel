// Particles and floating score text: the juice. Bursts on explosions, sparks
// on hits, a soft glow when starlight is collected. This file owns the data
// and the spawning; render.js draws them.

export function createParticles() {
  return {
    sparks: [],
    floaters: [],
  };
}

export function addParticles(particles, x, y, { count, color, speed, life, size }) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    particles.sparks.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: life * (0.6 + Math.random() * 0.7),
      maxLife: life,
      size: size * (0.6 + Math.random() * 0.8),
      color,
    });
  }
}

export function explosion(particles, x, y, color, big) {
  addParticles(particles, x, y, {
    count: big ? 34 : 18,
    color,
    speed: big ? 260 : 190,
    life: big ? 0.7 : 0.45,
    size: big ? 4.5 : 3.5,
  });
  // A few white-hot embers at the heart of the blast.
  addParticles(particles, x, y, { count: 6, color: '#ffffff', speed: 120, life: 0.3, size: 2.5 });
}

export function hitSparks(particles, x, y, color) {
  addParticles(particles, x, y, { count: 5, color, speed: 150, life: 0.25, size: 2.5 });
}

export function collectBurst(particles, x, y) {
  addParticles(particles, x, y, { count: 8, color: '#ffe066', speed: 90, life: 0.4, size: 3 });
}

export function coreBurst(particles, x, y) {
  addParticles(particles, x, y, { count: 26, color: '#ff9f1c', speed: 220, life: 0.6, size: 4 });
  addParticles(particles, x, y, { count: 10, color: '#ff4d6d', speed: 150, life: 0.5, size: 3 });
}

export function addFloater(particles, x, y, text, color) {
  particles.floaters.push({ x, y, text, color: color || '#eaf6ff', life: 1.1, maxLife: 1.1 });
}

export function updateParticles(particles, dt) {
  const sparks = particles.sparks;
  for (let i = sparks.length - 1; i >= 0; i -= 1) {
    const p = sparks[i];
    p.life -= dt;
    if (p.life <= 0) {
      sparks.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 2.2 * dt;
    p.vy *= 1 - 2.2 * dt;
  }
  const floaters = particles.floaters;
  for (let i = floaters.length - 1; i >= 0; i -= 1) {
    const f = floaters[i];
    f.life -= dt;
    f.y -= 34 * dt;
    if (f.life <= 0) floaters.splice(i, 1);
  }
}

export function clearParticles(particles) {
  particles.sparks.length = 0;
  particles.floaters.length = 0;
}
