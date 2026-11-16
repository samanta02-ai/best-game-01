// Lumen Drift — the simulation. A fixed-step world: the player drifts a skiff
// around an arena, shoots shards, gathers the lumens they drop, and survives
// waves that grow denser. Everything the renderer draws lives in `state`;
// every interesting moment is reported back as an event string so the main
// loop can play the matching sound.
import { COLORS, COMBO_MAX, COMBO_PER_LEVEL, COMBO_WINDOW, ENEMY, FIELD, LUMEN, ORB, PICKUP, PLAYER, STEP } from './config.js';

export const EVENT_SHOOT = 'shoot';
export const EVENT_BOOM = 'boom';
export const EVENT_BIG_BOOM = 'big-boom';
export const EVENT_PICKUP = 'pickup';
export const EVENT_HIT = 'hit';
export const EVENT_WAVE = 'wave';
export const EVENT_CLEAR = 'clear';
export const EVENT_OVER = 'over';

const TWO_PI = Math.PI * 2;

function edgeSpawn(random) {
  const side = random.int(4);
  const m = 30;
  if (side === 0) return { x: random.range(m, FIELD.width - m), y: -m };
  if (side === 1) return { x: FIELD.width + m, y: random.range(m, FIELD.height - m) };
  if (side === 2) return { x: random.range(m, FIELD.width - m), y: FIELD.height + m };
  return { x: -m, y: random.range(m, FIELD.height - m) };
}

function makeStars(random) {
  const stars = [];
  for (let i = 0; i < 90; i += 1) {
    stars.push({
      x: random.range(0, FIELD.width),
      y: random.range(0, FIELD.height),
      r: random.range(0.6, 2.1),
      phase: random.range(0, TWO_PI),
      speed: random.range(0.4, 1.4),
    });
  }
  return stars;
}

function burst(state, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * TWO_PI;
    const v = speed * (0.3 + Math.random() * 0.7);
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: 0.45 + Math.random() * 0.35,
      max: 0.8,
      r: 1.5 + Math.random() * 2.5,
      color,
    });
  }
}

function spawnEnemy(world, kind) {
  const def = ENEMY[kind];
  const at = edgeSpawn(world.random);
  const wave = world.state.wave;
  world.state.enemies.push({
    kind,
    x: at.x,
    y: at.y,
    vx: 0,
    vy: 0,
    angle: 0,
    radius: def.radius,
    hp: def.hp,
    speed: def.speed + (wave - 1) * 6,
    fireTimer: world.random.range(1.2, 2.6),
    wobble: world.random.range(0, TWO_PI),
  });
}

function wavePlan(wave, random) {
  // Wave N fields 6 + 4N shards; weavers join from wave 2, splitters from 3.
  const total = 6 + 4 * wave;
  const kinds = [];
  for (let i = 0; i < total; i += 1) {
    const roll = random.next();
    if (wave >= 3 && roll < 0.18) kinds.push('splitter');
    else if (wave >= 2 && roll < 0.42) kinds.push('weaver');
    else kinds.push('chaser');
  }
  return kinds;
}

function dropPickup(world, x, y) {
  const state = world.state;
  if (world.random.next() > PICKUP.chance) return;
  let kind;
  const roll = world.random.next();
  if (state.lives < PLAYER.lives && roll < PICKUP.heartChance) kind = 'heart';
  else if (roll < 0.36) kind = 'shield';
  else if (roll < 0.66) kind = 'rapid';
  else kind = 'spread';
  state.pickups.push({ kind, x, y, vy: PICKUP.fall, life: 9 });
}

function dropLumens(world, x, y, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = world.random.range(0, TWO_PI);
    const dist = world.random.range(4, 26);
    world.state.lumens.push({
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      vx: Math.cos(angle) * 60,
      vy: Math.sin(angle) * 60,
      life: 12,
    });
  }
}

function killEnemy(world, index, byBullet) {
  const state = world.state;
  const enemy = state.enemies[index];
  const def = ENEMY[enemy.kind];
  state.enemies.splice(index, 1);
  burst(state, enemy.x, enemy.y, def.color, enemy.kind === 'splitter' ? 22 : 14, 260);
  const gained = def.score * state.mult;
  state.score += gained;
  state.combo += 1;
  state.comboTimer = COMBO_WINDOW;
  const level = Math.min(COMBO_MAX, 1 + Math.floor(state.combo / COMBO_PER_LEVEL));
  if (level !== state.mult) state.mult = level;
  dropLumens(world, enemy.x, enemy.y, enemy.kind === 'weaver' ? 3 : enemy.kind === 'splitter' ? 2 : 1);
  dropPickup(world, enemy.x, enemy.y);
  if (enemy.kind === 'splitter') {
    for (let i = 0; i < 2; i += 1) {
      state.enemies.push({
        kind: 'mote',
        x: enemy.x + (i === 0 ? -14 : 14),
        y: enemy.y,
        vx: 0, vy: 0, angle: 0,
        radius: ENEMY.mote.radius,
        hp: 1,
        speed: ENEMY.mote.speed + (state.wave - 1) * 6,
        fireTimer: 0,
        wobble: world.random.range(0, TWO_PI),
      });
    }
  }
  return byBullet ? EVENT_BOOM : EVENT_BIG_BOOM;
}

function hurtPlayer(world) {
  const state = world.state;
  if (state.player.invuln > 0) return null;
  if (state.player.shield > 0) {
    state.player.shield = 0;
    state.player.invuln = 1.2;
    burst(state, state.player.x, state.player.y, COLORS.shield, 18, 300);
    return EVENT_HIT;
  }
  state.lives -= 1;
  state.combo = 0;
  state.mult = 1;
  state.player.invuln = PLAYER.invulnSeconds;
  state.shake = 14;
  burst(state, state.player.x, state.player.y, COLORS.player, 26, 340);
  if (state.lives <= 0) {
    state.over = true;
    return EVENT_OVER;
  }
  return EVENT_HIT;
}

export function createWorld(random) {
  const world = {
    random,
    state: null,
  };

  function freshState() {
    return {
      time: 0,
      score: 0,
      best: 0,
      combo: 0,
      comboTimer: 0,
      mult: 1,
      wave: 0,
      lives: PLAYER.lives,
      over: false,
      waveState: 'intro',
      waveTimer: 1.6,
      banner: '',
      bannerTimer: 0,
      shake: 0,
      stars: makeStars(random),
      player: {
        x: FIELD.width / 2,
        y: FIELD.height / 2,
        vx: 0, vy: 0,
        radius: PLAYER.radius,
        angle: -Math.PI / 2,
        invuln: 0,
        shield: 0,
        rapid: 0,
        spread: 0,
        fireTimer: 0,
      },
      bullets: [],
      orbs: [],
      enemies: [],
      lumens: [],
      pickups: [],
      particles: [],
      spawnQueue: [],
      spawnTimer: 0,
    };
  }

  function startWave(state, wave) {
    state.wave = wave;
    state.spawnQueue = wavePlan(wave, random);
    state.spawnTimer = 0.4;
    state.waveState = 'active';
    state.banner = `WAVE ${wave}`;
    state.bannerTimer = 2;
  }

  function stepEnemy(state, enemy, dt, events) {
    const p = state.player;
    const dx = p.x - enemy.x;
    const dy = p.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (enemy.kind === 'chaser' || enemy.kind === 'mote') {
      enemy.vx = (dx / dist) * enemy.speed;
      enemy.vy = (dy / dist) * enemy.speed;
      enemy.angle = Math.atan2(dy, dx);
    } else if (enemy.kind === 'weaver') {
      enemy.wobble += dt * 1.7;
      const orbit = 190;
      const tx = p.x + Math.cos(enemy.wobble) * orbit;
      const ty = p.y + Math.sin(enemy.wobble) * orbit;
      const ox = tx - enemy.x;
      const oy = ty - enemy.y;
      const od = Math.hypot(ox, oy) || 1;
      enemy.vx = (ox / od) * enemy.speed;
      enemy.vy = (oy / od) * enemy.speed;
      enemy.angle = Math.atan2(dy, dx);
      enemy.fireTimer -= dt;
      if (enemy.fireTimer <= 0 && dist < 520) {
        enemy.fireTimer = 2.3;
        state.orbs.push({
          x: enemy.x, y: enemy.y,
          vx: (dx / dist) * ORB.speed,
          vy: (dy / dist) * ORB.speed,
          radius: ORB.radius,
          life: 6,
        });
      }
    } else {
      // splitter: slow chase with a sideways sway.
      enemy.wobble += dt * 2.2;
      const sway = Math.cos(enemy.wobble) * 40;
      const nx = dx / dist;
      const ny = dy / dist;
      enemy.vx = nx * enemy.speed + -ny * sway;
      enemy.vy = ny * enemy.speed + nx * sway;
      enemy.angle = Math.atan2(dy, dx);
    }
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;
  }

  function step(state, move, firing, aim, god) {
    const events = [];
    const p = state.player;
    state.time += STEP;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - 40 * STEP);
    if (state.bannerTimer > 0) state.bannerTimer -= STEP;
    if (state.comboTimer > 0) {
      state.comboTimer -= STEP;
      if (state.comboTimer <= 0) {
        state.combo = 0;
        state.mult = 1;
      }
    }

    // Wave flow: intro counts down, active spawns and fights, clear pays out.
    if (state.waveState === 'intro') {
      state.waveTimer -= STEP;
      if (state.waveTimer <= 0) {
        startWave(state, state.wave + 1);
        events.push(EVENT_WAVE);
      }
    } else if (state.waveState === 'active') {
      if (state.spawnQueue.length > 0) {
        state.spawnTimer -= STEP;
        if (state.spawnTimer <= 0) {
          // Shards arrive in bursts, so the field stays busy instead of
          // trickling in one at a time and dying before the next arrives.
          const burst = Math.min(state.spawnQueue.length, 1 + Math.floor(state.wave / 2));
          for (let i = 0; i < burst; i += 1) spawnEnemy(world, state.spawnQueue.shift());
          state.spawnTimer = Math.max(0.5, 1.1 - state.wave * 0.05);
        }
      } else if (state.enemies.length === 0 && state.orbs.length === 0) {
        const bonus = 100 + 50 * state.wave;
        state.score += bonus;
        state.waveState = 'clear';
        state.waveTimer = 2.2;
        state.banner = `WAVE ${state.wave} CLEAR  +${bonus}`;
        state.bannerTimer = 2.2;
        events.push(EVENT_CLEAR);
      }
    } else if (state.waveState === 'clear') {
      state.waveTimer -= STEP;
      if (state.waveTimer <= 0) {
        state.waveState = 'intro';
        state.waveTimer = 1.2;
      }
    }

    // Player movement: acceleration with drag, clamped to the arena.
    p.vx += move.x * PLAYER.accel * STEP;
    p.vy += move.y * PLAYER.accel * STEP;
    const drag = Math.max(0, 1 - PLAYER.drag * STEP);
    p.vx *= drag;
    p.vy *= drag;
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > PLAYER.maxSpeed) {
      p.vx = (p.vx / speed) * PLAYER.maxSpeed;
      p.vy = (p.vy / speed) * PLAYER.maxSpeed;
    }
    p.x = Math.min(FIELD.width - p.radius, Math.max(p.radius, p.x + p.vx * STEP));
    p.y = Math.min(FIELD.height - p.radius, Math.max(p.radius, p.y + p.vy * STEP));
    p.angle = Math.atan2(aim.y - p.y, aim.x - p.x);
    if (speed > 60 && Math.random() < 0.5) {
      state.particles.push({
        x: p.x - Math.cos(p.angle) * 16,
        y: p.y - Math.sin(p.angle) * 16,
        vx: -p.vx * 0.15 + (Math.random() - 0.5) * 30,
        vy: -p.vy * 0.15 + (Math.random() - 0.5) * 30,
        life: 0.3, max: 0.3,
        r: 2 + Math.random() * 2,
        color: COLORS.player,
      });
    }
    if (p.invuln > 0) p.invuln -= STEP;
    if (p.shield > 0) p.shield -= STEP;
    if (p.rapid > 0) p.rapid -= STEP;
    if (p.spread > 0) p.spread -= STEP;

    // Firing: one stream, or three when spread is up.
    p.fireTimer -= STEP;
    if (firing && p.fireTimer <= 0 && !state.over) {
      p.fireTimer = p.rapid > 0 ? PLAYER.rapidInterval : PLAYER.fireInterval;
      const angles = p.spread > 0 ? [-0.16, 0, 0.16] : [0];
      for (const off of angles) {
        const a = p.angle + off;
        state.bullets.push({
          x: p.x + Math.cos(a) * 20,
          y: p.y + Math.sin(a) * 20,
          vx: Math.cos(a) * PLAYER.bulletSpeed,
          vy: Math.sin(a) * PLAYER.bulletSpeed,
          radius: PLAYER.bulletRadius,
          life: 1.1,
        });
      }
      events.push(EVENT_SHOOT);
    }

    // Bullets fly and hit shards.
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const b = state.bullets[i];
      b.x += b.vx * STEP;
      b.y += b.vy * STEP;
      b.life -= STEP;
      let dead = b.life <= 0 || b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20;
      if (!dead) {
        for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
          const e = state.enemies[j];
          const d = Math.hypot(e.x - b.x, e.y - b.y);
          if (d < e.radius + b.radius) {
            e.hp -= 1;
            dead = true;
            if (e.hp <= 0) events.push(killEnemy(world, j, true));
            else burst(state, b.x, b.y, ENEMY[e.kind].color, 4, 140);
            break;
          }
        }
      }
      if (dead) state.bullets.splice(i, 1);
    }

    // Shards move, and touch the player.
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const e = state.enemies[i];
      stepEnemy(state, e, STEP, events);
      if (!state.over && !god) {
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < e.radius + p.radius - 2) {
          const event = hurtPlayer(world);
          if (event) events.push(event);
          if (e.kind !== 'mote') {
            e.hp -= 1;
            if (e.hp <= 0) events.push(killEnemy(world, i, false));
          } else {
            state.enemies.splice(i, 1);
            burst(state, e.x, e.y, ENEMY.mote.color, 8, 200);
          }
        }
      }
    }

    // Enemy orbs drift and can hit the player.
    for (let i = state.orbs.length - 1; i >= 0; i -= 1) {
      const o = state.orbs[i];
      o.x += o.vx * STEP;
      o.y += o.vy * STEP;
      o.life -= STEP;
      let dead = o.life <= 0 || o.x < -20 || o.x > FIELD.width + 20 || o.y < -20 || o.y > FIELD.height + 20;
      if (!dead && !state.over && !god) {
        const d = Math.hypot(o.x - p.x, o.y - p.y);
        if (d < o.radius + p.radius - 2) {
          dead = true;
          const event = hurtPlayer(world);
          if (event) events.push(event);
        }
      }
      if (dead) state.orbs.splice(i, 1);
    }

    // Lumens drift, get magnetised, and pay out on pickup.
    for (let i = state.lumens.length - 1; i >= 0; i -= 1) {
      const l = state.lumens[i];
      const dx = p.x - l.x;
      const dy = p.y - l.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < LUMEN.magnet) {
        l.vx += (dx / d) * LUMEN.pull * STEP;
        l.vy += (dy / d) * LUMEN.pull * STEP;
      }
      l.vx *= Math.max(0, 1 - 2.4 * STEP);
      l.vy *= Math.max(0, 1 - 2.4 * STEP);
      l.x += l.vx * STEP;
      l.y += l.vy * STEP;
      l.life -= STEP;
      if (d < p.radius + LUMEN.radius + 4) {
        state.score += LUMEN.value * state.mult;
        state.combo += 1;
        state.comboTimer = COMBO_WINDOW;
        events.push(EVENT_PICKUP);
        state.lumens.splice(i, 1);
      } else if (l.life <= 0) {
        state.lumens.splice(i, 1);
      }
    }

    // Pickups drift down and apply on touch.
    for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
      const pk = state.pickups[i];
      pk.y += pk.vy * STEP;
      pk.life -= STEP;
      const d = Math.hypot(pk.x - p.x, pk.y - p.y);
      if (d < p.radius + PICKUP.radius) {
        if (pk.kind === 'shield') p.shield = PLAYER.shieldSeconds;
        else if (pk.kind === 'rapid') p.rapid = PLAYER.powerSeconds;
        else if (pk.kind === 'spread') p.spread = PLAYER.powerSeconds;
        else if (pk.kind === 'heart') state.lives = Math.min(PLAYER.lives, state.lives + 1);
        burst(state, pk.x, pk.y, COLORS[pk.kind] ?? COLORS.lumen, 10, 160);
        events.push(EVENT_PICKUP);
        state.pickups.splice(i, 1);
      } else if (pk.life <= 0 || pk.y > FIELD.height + 20) {
        state.pickups.splice(i, 1);
      }
    }

    // Particles fade.
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const pt = state.particles[i];
      pt.x += pt.vx * STEP;
      pt.y += pt.vy * STEP;
      pt.vx *= Math.max(0, 1 - 3 * STEP);
      pt.vy *= Math.max(0, 1 - 3 * STEP);
      pt.life -= STEP;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }

    return events;
  }

  world.state = freshState();
  world.reset = () => {
    world.state = freshState();
  };
  world.step = (move, firing, aim, god = false) => step(world.state, move, firing, aim, god);
  world.startWave = (wave) => startWave(world.state, wave);
  return world;
}
