/**
 * Procedural pixel-art sprite engine.
 * All sprites are original creations — no copyrighted assets.
 * Renders 16×16 characters on offscreen canvases.
 */

const SPRITE_SIZE = 16;
const SCALE = 3; // render at 48×48

// Color palettes per character
const PALETTES = {
  // People
  dev:       { body: '#3b82f6', skin: '#f5c8a0', hair: '#4a3728', eye: '#222', shoe: '#333' },
  wizard:    { body: '#8b5cf6', skin: '#f5c8a0', hair: '#ccc',    eye: '#222', shoe: '#555' },
  spy:       { body: '#374151', skin: '#deb887', hair: '#222',    eye: '#222', shoe: '#111' },
  builder:   { body: '#f59e0b', skin: '#c8956a', hair: '#3a2a1a', eye: '#222', shoe: '#6b4226' },
  scientist: { body: '#eeeeee', skin: '#f0d0b0', hair: '#8b4513', eye: '#222', shoe: '#555' },
  astro:     { body: '#e5e7eb', skin: '#f5c8a0', hair: '#444',    eye: '#222', shoe: '#888' },
  hero:      { body: '#ef4444', skin: '#f5c8a0', hair: '#222',    eye: '#222', shoe: '#c00' },
  artist:    { body: '#ec4899', skin: '#deb887', hair: '#6b21a8', eye: '#222', shoe: '#a855f7' },
  // Animals
  cat:     { body: '#f59e0b', ear: '#d97706', eye: '#22c55e', nose: '#ec4899' },
  dog:     { body: '#92400e', ear: '#78350f', eye: '#222',    nose: '#111' },
  owl:     { body: '#78716c', ear: '#57534e', eye: '#facc15', nose: '#f59e0b' },
  fox:     { body: '#ea580c', ear: '#c2410c', eye: '#222',    nose: '#111', tip: '#fff' },
  bear:    { body: '#7c2d12', ear: '#78350f', eye: '#222',    nose: '#111' },
  penguin: { body: '#1e293b', ear: '#1e293b', eye: '#222',    nose: '#f59e0b', belly: '#fff' },
  eagle:   { body: '#78350f', ear: '#451a03', eye: '#facc15', nose: '#f59e0b' },
  dolphin: { body: '#3b82f6', ear: '#2563eb', eye: '#222',    nose: '#93c5fd' },
  // Creatures (monster-like, original designs)
  flamey:  { body: '#ef4444', accent: '#f59e0b', eye: '#fff',  pupil: '#222' },
  aquari:  { body: '#3b82f6', accent: '#93c5fd', eye: '#fff',  pupil: '#222' },
  leafor:  { body: '#22c55e', accent: '#86efac', eye: '#fff',  pupil: '#222' },
  sparky:  { body: '#facc15', accent: '#fef08a', eye: '#fff',  pupil: '#222' },
  shado:   { body: '#6b21a8', accent: '#a855f7', eye: '#ef4444', pupil: '#222' },
  dusty:   { body: '#92400e', accent: '#d97706', eye: '#fff',  pupil: '#222' },
  crystal: { body: '#06b6d4', accent: '#a5f3fc', eye: '#fff',  pupil: '#222' },
  drako:   { body: '#7c3aed', accent: '#c4b5fd', eye: '#f59e0b', pupil: '#222' },
};

// ── Drawing helpers ──

function setPixel(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function drawRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// ── Person sprite drawer ──

function drawPerson(ctx, frame, state, pal) {
  const walkOffset = state === 'walk' ? [0, -1, 0, -1][frame % 4] : [0, -0.5][frame % 2];
  const legFrame = state === 'walk' ? frame % 4 : 0;

  // Legs
  const legSpread = [0, 1, 0, -1][legFrame];
  drawRect(ctx, 5 + legSpread, 12, 2, 3, pal.shoe);
  drawRect(ctx, 9 - legSpread, 12, 2, 3, pal.shoe);

  // Body
  drawRect(ctx, 4, 7 + walkOffset, 8, 5, pal.body);

  // Head
  const headY = 2 + walkOffset;
  drawRect(ctx, 5, headY, 6, 5, pal.skin);

  // Hair
  drawRect(ctx, 5, headY, 6, 2, pal.hair);

  // Eyes
  setPixel(ctx, 6, headY + 2, pal.eye);
  setPixel(ctx, 9, headY + 2, pal.eye);

  // Arms
  const armSwing = state === 'walk' ? [0, -1, 0, 1][frame % 4] : 0;
  drawRect(ctx, 2, 8 + walkOffset + armSwing, 2, 4, pal.skin);
  drawRect(ctx, 12, 8 + walkOffset - armSwing, 2, 4, pal.skin);
}

// ── Animal sprite drawer ──

function drawAnimal(ctx, frame, state, pal, type) {
  const bob = state === 'walk' ? [0, -1, 0, -1][frame % 4] : [0, -0.5][frame % 2];
  const legFrame = state === 'walk' ? frame % 4 : 0;

  // Legs (4 legs for most)
  const spread = [0, 1, 0, -1][legFrame];
  if (type === 'penguin') {
    drawRect(ctx, 5, 13, 2, 2, pal.nose);
    drawRect(ctx, 9, 13, 2, 2, pal.nose);
  } else {
    drawRect(ctx, 3 + spread, 12, 2, 3, pal.body);
    drawRect(ctx, 7, 12, 2, 3, pal.body);
    drawRect(ctx, 11 - spread, 12, 2, 3, pal.body);
  }

  // Body
  const bodyY = 7 + bob;
  drawRect(ctx, 3, bodyY, 10, 5, pal.body);
  if (pal.belly) {
    drawRect(ctx, 5, bodyY + 1, 6, 3, pal.belly);
  }
  if (pal.tip && type === 'fox') {
    // Tail
    drawRect(ctx, 13, bodyY - 1, 2, 3, pal.body);
    setPixel(ctx, 14, bodyY + 1, pal.tip);
  }

  // Head
  const headY = 3 + bob;
  drawRect(ctx, 4, headY, 8, 4, pal.body);

  // Ears
  if (type === 'owl' || type === 'eagle') {
    setPixel(ctx, 4, headY - 1, pal.ear);
    setPixel(ctx, 11, headY - 1, pal.ear);
  } else if (type === 'penguin' || type === 'dolphin') {
    // No prominent ears
  } else {
    drawRect(ctx, 4, headY - 2, 2, 2, pal.ear);
    drawRect(ctx, 10, headY - 2, 2, 2, pal.ear);
  }

  // Eyes
  setPixel(ctx, 6, headY + 1, pal.eye);
  setPixel(ctx, 9, headY + 1, pal.eye);

  // Nose/beak
  setPixel(ctx, 7, headY + 2, pal.nose);
  setPixel(ctx, 8, headY + 2, pal.nose);
}

// ── Creature sprite drawer ──

function drawCreature(ctx, frame, state, pal, type) {
  const bob = state === 'walk' ? [0, -1, 0, -1][frame % 4] : [0, -1, 0, 1][frame % 4];
  const legFrame = state === 'walk' ? frame % 4 : 0;

  switch (type) {
    case 'flamey': // Fire creature — flickering flame top
      drawRect(ctx, 4, 9 + bob, 8, 5, pal.body);
      drawRect(ctx, 5, 5 + bob, 6, 5, pal.body);
      // Flame crown
      drawRect(ctx, 6, 2 + bob + (frame % 2), 4, 3, pal.accent);
      setPixel(ctx, 7, 1 + bob + (frame % 2), pal.accent);
      // Eyes
      setPixel(ctx, 6, 7 + bob, pal.eye);
      setPixel(ctx, 9, 7 + bob, pal.eye);
      setPixel(ctx, 6, 7 + bob, pal.pupil);
      setPixel(ctx, 9, 7 + bob, pal.pupil);
      // Feet
      drawRect(ctx, 4 + [0,1,0,-1][legFrame], 14, 3, 2, pal.body);
      drawRect(ctx, 9 - [0,1,0,-1][legFrame], 14, 3, 2, pal.body);
      break;

    case 'aquari': // Water blob creature
      drawRect(ctx, 3, 6 + bob, 10, 8, pal.body);
      drawRect(ctx, 5, 4 + bob, 6, 3, pal.body);
      drawRect(ctx, 4, 14, 3, 2, pal.accent);
      drawRect(ctx, 9, 14, 3, 2, pal.accent);
      // Droplet on head
      setPixel(ctx, 7, 2 + bob, pal.accent);
      drawRect(ctx, 6, 3 + bob, 3, 2, pal.accent);
      // Eyes
      setPixel(ctx, 5, 8 + bob, pal.eye);
      setPixel(ctx, 9, 8 + bob, pal.eye);
      break;

    case 'leafor': // Leaf/plant creature
      drawRect(ctx, 4, 7 + bob, 8, 7, pal.body);
      drawRect(ctx, 5, 5 + bob, 6, 3, pal.body);
      // Leaf on head
      drawRect(ctx, 6, 2 + bob, 4, 3, pal.accent);
      setPixel(ctx, 5, 3 + bob, pal.accent);
      // Eyes
      setPixel(ctx, 6, 8 + bob, pal.eye);
      setPixel(ctx, 9, 8 + bob, pal.eye);
      // Feet
      drawRect(ctx, 5 + [0,1,0,-1][legFrame], 14, 2, 2, pal.body);
      drawRect(ctx, 9 - [0,1,0,-1][legFrame], 14, 2, 2, pal.body);
      break;

    case 'sparky': // Electric creature
      drawRect(ctx, 4, 6 + bob, 8, 7, pal.body);
      drawRect(ctx, 5, 4 + bob, 6, 3, pal.body);
      // Lightning bolt ears
      drawRect(ctx, 3, 2 + bob, 2, 4, pal.accent);
      drawRect(ctx, 11, 2 + bob, 2, 4, pal.accent);
      // Cheeks
      setPixel(ctx, 5, 9 + bob, pal.accent);
      setPixel(ctx, 10, 9 + bob, pal.accent);
      // Eyes
      setPixel(ctx, 6, 7 + bob, pal.pupil);
      setPixel(ctx, 9, 7 + bob, pal.pupil);
      // Feet
      drawRect(ctx, 5, 13, 2, 2, pal.body);
      drawRect(ctx, 9, 13, 2, 2, pal.body);
      break;

    case 'shado': // Ghost/shadow creature
      drawRect(ctx, 4, 4 + bob, 8, 8, pal.body);
      drawRect(ctx, 3, 6 + bob, 10, 4, pal.body);
      // Wispy bottom
      drawRect(ctx, 4, 12 + bob, 2, 2 + (frame % 2), pal.accent);
      drawRect(ctx, 7, 12 + bob, 2, 3 - (frame % 2), pal.accent);
      drawRect(ctx, 10, 12 + bob, 2, 2 + (frame % 2), pal.accent);
      // Eyes (glowing)
      setPixel(ctx, 6, 7 + bob, pal.eye);
      setPixel(ctx, 9, 7 + bob, pal.eye);
      break;

    case 'dusty': // Rock/earth creature
      drawRect(ctx, 3, 7 + bob, 10, 7, pal.body);
      drawRect(ctx, 5, 5 + bob, 6, 3, pal.body);
      // Rocky bumps
      setPixel(ctx, 5, 4 + bob, pal.accent);
      setPixel(ctx, 8, 3 + bob, pal.accent);
      setPixel(ctx, 10, 5 + bob, pal.accent);
      // Eyes
      setPixel(ctx, 6, 8 + bob, pal.eye);
      setPixel(ctx, 9, 8 + bob, pal.eye);
      // Feet
      drawRect(ctx, 4, 14, 3, 2, pal.body);
      drawRect(ctx, 9, 14, 3, 2, pal.body);
      break;

    case 'crystal': // Ice/crystal creature
      drawRect(ctx, 4, 6 + bob, 8, 8, pal.body);
      drawRect(ctx, 5, 4 + bob, 6, 3, pal.body);
      // Crystal spikes
      drawRect(ctx, 5, 1 + bob, 2, 3, pal.accent);
      drawRect(ctx, 9, 2 + bob, 2, 2, pal.accent);
      // Eyes
      setPixel(ctx, 6, 8 + bob, pal.eye);
      setPixel(ctx, 9, 8 + bob, pal.eye);
      // Feet
      drawRect(ctx, 5, 14, 2, 2, pal.accent);
      drawRect(ctx, 9, 14, 2, 2, pal.accent);
      break;

    case 'drako': // Dragon-like creature
      drawRect(ctx, 4, 6 + bob, 8, 7, pal.body);
      drawRect(ctx, 5, 4 + bob, 6, 3, pal.body);
      // Horns
      drawRect(ctx, 4, 1 + bob, 2, 3, pal.accent);
      drawRect(ctx, 10, 1 + bob, 2, 3, pal.accent);
      // Tail
      drawRect(ctx, 12, 9 + bob, 3, 2, pal.body);
      setPixel(ctx, 14, 8 + bob, pal.accent);
      // Wings (tiny)
      drawRect(ctx, 1, 6 + bob, 3, 3, pal.accent);
      drawRect(ctx, 12, 6 + bob, 3, 3, pal.accent);
      // Eyes
      setPixel(ctx, 6, 6 + bob, pal.eye);
      setPixel(ctx, 9, 6 + bob, pal.eye);
      // Feet
      drawRect(ctx, 5 + [0,1,0,-1][legFrame], 13, 2, 2, pal.body);
      drawRect(ctx, 9 - [0,1,0,-1][legFrame], 13, 2, 2, pal.body);
      break;

    default:
      drawRect(ctx, 4, 4 + bob, 8, 10, pal.body);
      setPixel(ctx, 6, 7 + bob, pal.eye);
      setPixel(ctx, 9, 7 + bob, pal.eye);
  }
}

// ── Sprite cache and rendering ──

const _spriteCache = {};

function spriteKey(charId, frame, state, direction) {
  return `${charId}:${state}:${frame}:${direction}`;
}

/**
 * Renders a sprite to an offscreen canvas and returns it.
 * Results are cached for performance.
 */
function renderSprite(charId, frame, state, direction) {
  const key = spriteKey(charId, frame, state, direction);
  if (_spriteCache[key]) return _spriteCache[key];

  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_SIZE * SCALE;
  canvas.height = SPRITE_SIZE * SCALE;
  const ctx = canvas.getContext('2d');

  // Draw at 1:1 then scale
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = SPRITE_SIZE;
  tmpCanvas.height = SPRITE_SIZE;
  const tmpCtx = tmpCanvas.getContext('2d');
  tmpCtx.imageSmoothingEnabled = false;

  const pal = PALETTES[charId];
  if (!pal) {
    _spriteCache[key] = canvas;
    return canvas;
  }

  // Determine category
  const people = ['dev','wizard','spy','builder','scientist','astro','hero','artist'];
  const animals = ['cat','dog','owl','fox','bear','penguin','eagle','dolphin'];

  if (direction === 'left') {
    tmpCtx.translate(SPRITE_SIZE, 0);
    tmpCtx.scale(-1, 1);
  }

  if (people.includes(charId)) {
    drawPerson(tmpCtx, frame, state, pal);
  } else if (animals.includes(charId)) {
    drawAnimal(tmpCtx, frame, state, pal, charId);
  } else {
    drawCreature(tmpCtx, frame, state, pal, charId);
  }

  // Scale up with nearest-neighbor
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmpCanvas, 0, 0, SPRITE_SIZE, SPRITE_SIZE, 0, 0, SPRITE_SIZE * SCALE, SPRITE_SIZE * SCALE);

  _spriteCache[key] = canvas;
  return canvas;
}

// ── Theme definitions mapping to sprite IDs ──

const SPRITE_THEMES = {
  personas: {
    ids:   ['dev', 'wizard', 'spy', 'builder', 'scientist', 'astro', 'hero', 'artist'],
    names: ['Dev', 'Wizard', 'Spy', 'Builder', 'Scientist', 'Astro', 'Hero', 'Artist'],
  },
  criaturas: {
    ids:   ['flamey', 'aquari', 'leafor', 'sparky', 'shado', 'dusty', 'crystal', 'drako'],
    names: ['Flamey', 'Aquari', 'Leafor', 'Sparky', 'Shado', 'Dusty', 'Crystal', 'Drako'],
  },
  animales: {
    ids:   ['cat', 'dog', 'owl', 'fox', 'bear', 'penguin', 'eagle', 'dolphin'],
    names: ['Gato', 'Perro', 'Buho', 'Zorro', 'Oso', 'Pinguino', 'Aguila', 'Delfin'],
  },
};
