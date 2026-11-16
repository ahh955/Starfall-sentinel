// Keyboard and mouse state, in canvas pixels. The game reads this each frame;
// buttons are handled through a small click queue the state machine drains.

import { VIEW } from './config.js';

const MOVE_KEYS = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

export function createInput(canvas) {
  const input = {
    held: new Set(),
    // Keys pressed since the last frame (cleared by the game each step).
    pressed: new Set(),
    mouseX: VIEW.width / 2,
    mouseY: VIEW.height / 2 - 120,
    mouseDown: false,
    // Clicks waiting to be handled: { x, y } in canvas pixels.
    clicks: [],
  };

  function toCanvas(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * VIEW.width,
      y: ((clientY - rect.top) / rect.height) * VIEW.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
    if (!event.repeat) input.pressed.add(event.code);
    input.held.add(event.code);
  });
  window.addEventListener('keyup', (event) => {
    input.held.delete(event.code);
  });
  window.addEventListener('blur', () => {
    input.held.clear();
    input.mouseDown = false;
  });

  canvas.addEventListener('mousemove', (event) => {
    const p = toCanvas(event.clientX, event.clientY);
    input.mouseX = p.x;
    input.mouseY = p.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;
    const p = toCanvas(event.clientX, event.clientY);
    input.mouseX = p.x;
    input.mouseY = p.y;
    input.mouseDown = true;
    input.clicks.push({ x: p.x, y: p.y });
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) input.mouseDown = false;
  });
  // Keep the page from scrolling or selecting text while the game is played.
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return input;
}

// Normalised movement direction from the held keys: { x, y }, each in [-1, 1].
export function moveDirection(input) {
  let x = 0;
  let y = 0;
  for (const code of input.held) {
    const dir = MOVE_KEYS[code];
    if (dir === 'left') x -= 1;
    else if (dir === 'right') x += 1;
    else if (dir === 'up') y -= 1;
    else if (dir === 'down') y += 1;
  }
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.SQRT2;
    x *= inv;
    y *= inv;
  }
  return { x, y };
}

// True while the player wants to fire: left mouse held, or Space held.
export function isFiring(input) {
  return input.mouseDown || input.held.has('Space');
}

// True once for a key pressed since the last frame; the game clears `pressed`
// at the end of every step, so this fires a single time per physical press.
export function wasPressed(input, code) {
  return input.pressed.has(code);
}

export function endFrame(input) {
  input.pressed.clear();
  input.clicks.length = 0;
}
