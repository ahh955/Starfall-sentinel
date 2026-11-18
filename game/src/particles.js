// Particles and floating score text: the juice. Bursts on explosions, sparks
// on hits, a soft glow when starlight is collected. This file owns the data
// and the spawning; render.js draws them.

function random(particles) {
  particles.seed = (Math.imul(particles.seed, 1664525) + 1013904223) >>> 0;
  return particles.seed / 4294967296;
}

export function createParticles(seed = 7) {
  return {
    seed,
    flashes: [],
    sparks: [],
    floaters: [],
  };
}

export function addParticles(particles, x, y, { count, color, speed, life, size }) {
  for (let i = 0; i < count; i += 1) {
    const angle = random(particles) * Math.PI * 2;
    const v = speed * (0.3 + random(particles) * 0.7);
    particles.sparks.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: life * (0.6 + random(particles) * 0.7),
      maxLife: life,
      size: size * (0.6 + random(particles) * 0.8),
      color,
    });
  }
}

export function explosion(particles, x, y, color, big) {
  addParticles(particles, x, y, {
    count: big ? 54 : 30,
    color,
    speed: big ? 340 : 250,
    life: big ? 0.9 : 0.65,
    size: big ? 4.5 : 3.5,
  });
  particles.flashes.push({ x, y, life: 0.32, maxLife: 0.32, radius: big ? 95 : 65, color });
  addParticles(particles, x, y, { count: 10, color: '#ffd166', speed: 210, life: 0.55, size: 3 });
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

export function addFloater(particles, x, y, text, color, size) {
  particles.floaters.push({ x, y, text, color: color || '#eaf6ff', size: size || 18, life: 1.1, maxLife: 1.1 });
}

// The wave-clear celebration: a ring of gold sparks around the core.
export function celebrationBurst(particles, x, y) {
  addParticles(particles, x, y, { count: 42, color: '#ffd166', speed: 320, life: 0.9, size: 4 });
  addParticles(particles, x, y, { count: 14, color: '#ffffff', speed: 200, life: 0.6, size: 3 });
  particles.flashes.push({ x, y, life: 0.5, maxLife: 0.5, radius: 260, color: '#ffd166' });
}

export function updateParticles(particles, dt) {
  particles.flashes = particles.flashes.filter(f => (f.life -= dt) > 0);
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
  particles.flashes.length = 0;
  particles.sparks.length = 0;
  particles.floaters.length = 0;
}
