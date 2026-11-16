// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot, so the frame is what a short game really looks like and
// the same seed always gives the same frame. The play pilot dodges and hunts
// well; the end pilot only chases lumens, so it is caught out once the waves
// thicken — the way a hurried player is.
import { FIELD, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 30;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** Steer the skiff: flee the nearest danger, chase the nearest lumen. */
function autopilot(state, fleeRadius) {
  const p = state.player;
  let fx = 0;
  let fy = 0;
  let nearestDanger = null;
  let nearestDangerDist = Infinity;
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < nearestDangerDist) {
      nearestDangerDist = d;
      nearestDanger = e;
    }
  }
  for (const o of state.orbs) {
    const d = Math.hypot(o.x - p.x, o.y - p.y);
    if (d < nearestDangerDist) {
      nearestDangerDist = d;
      nearestDanger = o;
    }
  }
  if (nearestDanger && nearestDangerDist < fleeRadius) {
    const d = nearestDangerDist || 1;
    fx += (p.x - nearestDanger.x) / d;
    fy += (p.y - nearestDanger.y) / d;
  }
  let lumen = null;
  let lumenDist = Infinity;
  for (const l of state.lumens) {
    const d = Math.hypot(l.x - p.x, l.y - p.y);
    if (d < lumenDist) {
      lumenDist = d;
      lumen = l;
    }
  }
  if (lumen && lumenDist < 320) {
    const d = lumenDist || 1;
    fx += (lumen.x - p.x) / d;
    fy += (lumen.y - p.y) / d;
  }
  if (fx === 0 && fy === 0) {
    fx = FIELD.width / 2 - p.x;
    fy = FIELD.height / 2 - p.y;
  }
  const len = Math.hypot(fx, fy) || 1;
  return { x: fx / len, y: fy / len };
}

function aimAt(state, error = 0) {
  const p = state.player;
  let target = null;
  let best = Infinity;
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < best) {
      best = d;
      target = e;
    }
  }
  if (!target) return { x: p.x + Math.cos(p.angle) * 100, y: p.y + Math.sin(p.angle) * 100 };
  if (error === 0) return { x: target.x, y: target.y };
  // A sloppy pilot: aim wide of the shard, so most shots miss and the swarm
  // closes in — the way a hurried player misses under pressure.
  const a = Math.atan2(target.y - p.y, target.x - p.x) + Math.PI / 2;
  return { x: target.x + Math.cos(a) * error, y: target.y + Math.sin(a) * error };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    // Title over a live-looking field: a few seconds of attract play.
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      const move = autopilot(world.state, 170);
      world.step(move, true, aimAt(world.state), true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const sloppy = name === 'end';
  // The play pilot keeps its distance; the end pilot only flinches when a
  // shard is nearly on top of it, so it is caught out once the waves thicken.
  const fleeRadius = sloppy ? 90 : 170;
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  // The play frame should show the fight at its busiest, not the lull after a
  // wave is cleared: keep the state with the most shards on screen.
  let bestCount = 0;
  let bestSnap = null;
  for (let index = 0; index < limit / STEP; index += 1) {
    const move = autopilot(world.state, fleeRadius);
    if (sloppy) {
      // A sloppy pilot: slow to react and wide of the mark.
      move.x *= 0.75;
      move.y *= 0.75;
    }
    world.step(move, true, aimAt(world.state, sloppy ? 90 : 0), false);
    if (!sloppy && world.state.time > 6 && world.state.enemies.length > bestCount) {
      bestCount = world.state.enemies.length;
      bestSnap = structuredClone(world.state);
    }
    if (world.state.over) break;
  }
  if (bestSnap) world.state = bestSnap;
  const over = world.state.over;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
