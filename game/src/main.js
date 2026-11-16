// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between four screens: title,
// play, paused and game over.
//
// ?seed=N fixes the spawn pattern. ?shot=start|play|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createWorld, EVENT_BIG_BOOM, EVENT_BOOM, EVENT_CLEAR, EVENT_HIT, EVENT_OVER, EVENT_PICKUP, EVENT_SHOOT, EVENT_WAVE } from './world.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit.
  }
}

function playEvents(events) {
  for (const event of events) {
    if (event === EVENT_SHOOT) audio.shoot();
    else if (event === EVENT_BOOM) audio.boom(false);
    else if (event === EVENT_BIG_BOOM) audio.boom(true);
    else if (event === EVENT_PICKUP) audio.pickup();
    else if (event === EVENT_HIT) audio.hit();
    else if (event === EVENT_WAVE) audio.wave();
    else if (event === EVENT_CLEAR) audio.wave();
    else if (event === EVENT_OVER) audio.over();
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.ensure();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Three lives. Survive the waves.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Game over. Score ${world.state.score}. Best ${best}. Press R to fly again.`);
  }

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    for (const action of input.takeActions()) {
      if (action === ACTION_MUTE) {
        const muted = audio.toggleMute();
        announce(muted ? 'Sound off.' : 'Sound on.');
      } else if (action === ACTION_PAUSE) {
        if (screen === SCREEN_PLAY) {
          screen = SCREEN_PAUSED;
          announce('Paused.');
        } else if (screen === SCREEN_PAUSED) {
          screen = SCREEN_PLAY;
          announce('Playing.');
        }
      } else if (action === ACTION_RESTART) {
        if (screen === SCREEN_OVER || screen === SCREEN_PAUSED) startGame();
      } else if (action === ACTION_CONFIRM) {
        audio.ensure();
        if (screen === SCREEN_TITLE) startGame();
        else if (screen === SCREEN_OVER) startGame();
      }
    }

    if (screen === SCREEN_PLAY) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const move = input.axis();
        const aim = renderer.toField(input.mouse.x, input.mouse.y);
        const events = world.step(move, input.firing, aim, false);
        playEvents(events);
        if (world.state.over) {
          endGame();
          break;
        }
      }
    } else if (screen === SCREEN_TITLE) {
      // Attract mode: the field plays itself behind the title.
      accumulator += elapsed;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const p = world.state.player;
        const move = { x: Math.cos(world.state.time * 0.7), y: Math.sin(world.state.time * 0.9) };
        const aim = { x: p.x + Math.cos(p.angle) * 100, y: p.y + Math.sin(p.angle) * 100 };
        world.step(move, true, aim, true);
        if (world.state.waveState === 'intro' && world.state.wave === 0) {
          // Keep the title field busy without ever ending the game.
        }
      }
    }
    renderer.draw(world.state, screen, best);
    requestAnimationFrame(frame);
  }

  announce('Lumen Drift. Press Enter or click to fly.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
