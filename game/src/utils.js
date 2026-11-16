// Small math helpers and a seeded random generator shared by the whole game.
// The seeded generator is what makes the screenshot poses reproducible: the same
// seed always deals the same waves, the same starfield and the same frame.

export const TAU = Math.PI * 2;

export function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function distance(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

export function angleBetween(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

// mulberry32: a tiny deterministic PRNG. `next()` returns a float in [0, 1).
export function makeRng(seed) {
  let state = seed >>> 0;
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    // Float in [low, high).
    range(low, high) {
      return low + this.next() * (high - low);
    },
    // Integer in [low, high] inclusive.
    int(low, high) {
      return low + Math.floor(this.next() * (high - low + 1));
    },
    // One element of an array, uniformly.
    pick(list) {
      return list[Math.floor(this.next() * list.length)];
    },
  };
}

// A point on a circle of the given radius around a centre, at the given angle.
export function pointOnCircle(cx, cy, radius, angle) {
  return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
}
