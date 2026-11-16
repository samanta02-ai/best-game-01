// Lumen Drift — everything the player sees. Canvas 2D, one logical field
// (960x600) letterboxed into the window, device-pixel-ratio aware. Screens:
// title, play, paused, game over. The HUD shows score, best, wave, lives,
// combo and the timers of whatever power-up is running.
import { COLORS, ENEMY, FIELD, LUMEN } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const TWO_PI = Math.PI * 2;

function shipPath(ctx, x, y, angle, radius) {
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(angle) * radius * 1.5, y + Math.sin(angle) * radius * 1.5);
  ctx.lineTo(x + Math.cos(angle + 2.5) * radius, y + Math.sin(angle + 2.5) * radius);
  ctx.lineTo(x + Math.cos(angle + Math.PI) * radius * 0.7, y + Math.sin(angle + Math.PI) * radius * 0.7);
  ctx.lineTo(x + Math.cos(angle - 2.5) * radius, y + Math.sin(angle - 2.5) * radius);
  ctx.closePath();
}

function shardPath(ctx, kind, x, y, angle, radius) {
  ctx.beginPath();
  if (kind === 'chaser' || kind === 'mote') {
    for (let i = 0; i < 3; i += 1) {
      const a = angle + (i * TWO_PI) / 3;
      const px = x + Math.cos(a) * radius;
      const py = y + Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
  } else if (kind === 'weaver') {
    for (let i = 0; i < 4; i += 1) {
      const a = angle + (i * TWO_PI) / 4;
      const px = x + Math.cos(a) * radius;
      const py = y + Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
  } else {
    for (let i = 0; i < 6; i += 1) {
      const a = angle + (i * TWO_PI) / 6;
      const px = x + Math.cos(a) * radius;
      const py = y + Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
}

function glowDot(ctx, x, y, radius, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius * 3, 0, TWO_PI);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, ox: 0, oy: 0, w: 0, h: 0, dpr: 1 };

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    view.dpr = dpr;
    view.w = w;
    view.h = h;
    view.scale = Math.min(w / FIELD.width, h / FIELD.height);
    view.ox = (w - FIELD.width * view.scale) / 2;
    view.oy = (h - FIELD.height * view.scale) / 2;
  }

  function toField(clientX, clientY) {
    return {
      x: (clientX - view.ox) / view.scale,
      y: (clientY - view.oy) / view.scale,
    };
  }

  function drawBackground(state) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, COLORS.bgTop);
    g.addColorStop(1, COLORS.bgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= FIELD.width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, FIELD.height);
      ctx.stroke();
    }
    for (let y = 0; y <= FIELD.height; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(FIELD.width, y);
      ctx.stroke();
    }
    for (const s of state.stars) {
      const tw = 0.5 + 0.5 * Math.sin(state.time * s.speed + s.phase);
      ctx.globalAlpha = 0.35 + 0.55 * tw;
      ctx.fillStyle = COLORS.star;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawShip(state) {
    const p = state.player;
    const blink = p.invuln > 0 && Math.floor(state.time * 12) % 2 === 0;
    if (blink) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.shadowColor = COLORS.player;
    ctx.shadowBlur = 18;
    ctx.fillStyle = COLORS.player;
    shipPath(ctx, 0, 0, p.angle, p.radius);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.playerCore;
    shipPath(ctx, 0, 0, p.angle, p.radius * 0.55);
    ctx.fill();
    ctx.restore();
    if (p.shield > 0) {
      ctx.save();
      ctx.strokeStyle = COLORS.shield;
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(state.time * 6);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 10, 0, TWO_PI);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawEntities(state) {
    for (const l of state.lumens) {
      glowDot(ctx, l.x, l.y, LUMEN.radius, COLORS.lumen, 0.8);
      ctx.fillStyle = COLORS.lumen;
      ctx.beginPath();
      ctx.arc(l.x, l.y, 3.2, 0, TWO_PI);
      ctx.fill();
    }
    for (const pk of state.pickups) {
      const color = COLORS[pk.kind] ?? COLORS.lumen;
      const pulse = 1 + 0.15 * Math.sin(state.time * 5);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, 13 * pulse, 0, TWO_PI);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const letter = pk.kind === 'shield' ? 'S' : pk.kind === 'rapid' ? 'R' : pk.kind === 'spread' ? 'W' : '+';
      ctx.fillText(letter, pk.x, pk.y + 0.5);
      ctx.restore();
    }
    for (const e of state.enemies) {
      const def = ENEMY[e.kind];
      ctx.save();
      ctx.shadowColor = def.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = def.color;
      shardPath(ctx, e.kind, e.x, e.y, e.angle, e.radius);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.arc(e.x, e.y, Math.max(2.5, e.radius * 0.28), 0, TWO_PI);
      ctx.fill();
      ctx.restore();
      if (e.hp > 1) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(e.x - 12, e.y - e.radius - 10, 24 * (e.hp / def.hp), 3);
      }
    }
    for (const o of state.orbs) {
      const pulse = 1 + 0.25 * Math.sin(state.time * 10);
      glowDot(ctx, o.x, o.y, o.radius * pulse, COLORS.danger, 0.7);
      ctx.fillStyle = '#ff8a5c';
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.radius * 0.8, 0, TWO_PI);
      ctx.fill();
    }
    for (const b of state.bullets) {
      ctx.save();
      ctx.strokeStyle = COLORS.bullet;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.016, b.y - b.vy * 0.016);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    }
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, TWO_PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state, best) {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 8, 24, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, 46);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`SCORE ${state.score}`, 16, 24);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = COLORS.dim;
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, 200, 25);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`WAVE ${Math.max(1, state.wave)}`, FIELD.width / 2, 24);
    if (state.mult > 1) {
      ctx.fillStyle = COLORS.lumen;
      ctx.font = 'bold 17px system-ui, sans-serif';
      ctx.fillText(`COMBO x${state.mult}`, FIELD.width / 2, 42);
      ctx.fillStyle = 'rgba(255, 217, 77, 0.35)';
      ctx.fillRect(FIELD.width / 2 - 40, 48, 80 * (state.comboTimer / 3), 3);
    }
    // Lives as little ships, top right.
    ctx.textAlign = 'right';
    for (let i = 0; i < state.lives; i += 1) {
      ctx.save();
      ctx.translate(FIELD.width - 24 - i * 30, 24);
      ctx.fillStyle = COLORS.player;
      shipPath(ctx, 0, 0, -Math.PI / 2, 10);
      ctx.fill();
      ctx.restore();
    }
    // Power-up timers under the lives.
    const p = state.player;
    let row = 0;
    const timers = [];
    if (p.shield > 0) timers.push(['SHIELD', p.shield, 9, COLORS.shield]);
    if (p.rapid > 0) timers.push(['RAPID', p.rapid, 10, COLORS.rapid]);
    if (p.spread > 0) timers.push(['SPREAD', p.spread, 10, COLORS.spread]);
    for (const [label, left, total, color] of timers) {
      const y = 58 + row * 16;
      ctx.fillStyle = color;
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(label, FIELD.width - 58, y);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.fillRect(FIELD.width - 52, y - 4, 40, 6);
      ctx.fillStyle = color;
      ctx.fillRect(FIELD.width - 52, y - 4, 40 * (left / total), 6);
      row += 1;
    }
    ctx.restore();
  }

  function banner(state) {
    if (state.bannerTimer <= 0 || !state.banner) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, state.bannerTimer);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = COLORS.player;
    ctx.shadowBlur = 16;
    ctx.fillText(state.banner, FIELD.width / 2, 150);
    ctx.restore();
  }

  function overlay(title, lines, accent) {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 8, 24, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = accent;
    ctx.font = 'bold 58px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = accent;
    ctx.shadowBlur = 24;
    ctx.fillText(title, FIELD.width / 2, 218);
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.text;
    ctx.font = '19px system-ui, sans-serif';
    let y = 292;
    for (const line of lines) {
      ctx.fillText(line, FIELD.width / 2, y);
      y += 30;
    }
    ctx.restore();
  }

  function draw(state, screen, best) {
    resize();
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = '#05081a';
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);
    ctx.save();
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    ctx.beginPath();
    ctx.rect(0, 0, FIELD.width, FIELD.height);
    ctx.clip();
    drawBackground(state);
    drawEntities(state);
    if (screen !== SCREEN_TITLE) drawShip(state);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best);
    banner(state);
    ctx.restore();
    if (screen === SCREEN_TITLE) {
      overlay('LUMEN DRIFT', [
        'Pilot the skiff. Shatter the shards. Gather the light.',
        '',
        'WASD / arrows — fly      Mouse — aim      Hold click / Space — fire',
        'P — pause      M — mute      R — restart',
        '',
        'Survive the waves. Chain kills for combo. Grab S, R, W and hearts.',
        '',
        `BEST  ${best}`,
        'CLICK OR PRESS ENTER TO FLY',
      ], COLORS.player);
    } else if (screen === SCREEN_PAUSED) {
      overlay('PAUSED', ['Press P or Esc to keep flying.'], COLORS.dim);
    } else if (screen === SCREEN_OVER) {
      overlay('SIGNAL LOST', [
        `SCORE  ${state.score}`,
        `BEST  ${Math.max(best, state.score)}`,
        `WAVES CLEARED  ${Math.max(0, state.wave - 1)}`,
        '',
        'PRESS R OR CLICK TO FLY AGAIN',
      ], COLORS.danger);
    }
    ctx.restore();
  }

  return { draw, resize, toField, view };
}
