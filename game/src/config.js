// Lumen Drift — tuning constants and palette. One place holds every number the
// game balances on, so a tuning pass touches this file and nothing else.
export const FIELD = { width: 960, height: 600 };
export const STEP = 1 / 60;
export const BEST_KEY = 'lumen-drift-best';

export const PLAYER = {
  radius: 14,
  accel: 2600,
  maxSpeed: 350,
  drag: 3.2,
  fireInterval: 0.13,
  rapidInterval: 0.075,
  bulletSpeed: 660,
  bulletRadius: 4,
  lives: 3,
  invulnSeconds: 2,
  shieldSeconds: 9,
  powerSeconds: 10,
};

// Enemy kinds: shape, speed, health, score and colour. Speeds grow a little
// with the wave; the base values here are wave 1.
export const ENEMY = {
  chaser: { kind: 'chaser', radius: 15, speed: 78, hp: 1, score: 50, color: '#ff4d6d' },
  weaver: { kind: 'weaver', radius: 16, speed: 62, hp: 2, score: 100, color: '#ffb020' },
  splitter: { kind: 'splitter', radius: 20, speed: 56, hp: 2, score: 80, color: '#b46bff' },
  mote: { kind: 'mote', radius: 9, speed: 165, hp: 1, score: 25, color: '#ff7ad9' },
};

export const ORB = { radius: 6, speed: 135 };
export const LUMEN = { radius: 5, magnet: 110, pull: 900, value: 10 };
export const PICKUP = { radius: 13, fall: 34, chance: 0.22, heartChance: 0.06 };

// Combo: every 8 kills without taking a hit raises the multiplier by one.
export const COMBO_WINDOW = 3;
export const COMBO_PER_LEVEL = 8;
export const COMBO_MAX = 5;

export const COLORS = {
  bgTop: '#0b1030',
  bgBottom: '#160a2e',
  grid: 'rgba(120, 140, 255, 0.07)',
  star: '#cdd7ff',
  player: '#4de8ff',
  playerCore: '#eafcff',
  bullet: '#aef4ff',
  lumen: '#ffd94d',
  shield: '#59d8ff',
  rapid: '#ff9f43',
  spread: '#7dff9e',
  heart: '#ff5d8f',
  text: '#eef2ff',
  dim: '#9aa7d8',
  danger: '#ff4d6d',
};
