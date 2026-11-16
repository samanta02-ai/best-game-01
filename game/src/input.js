// Keyboard and mouse state. Movement is read as a normalised axis every frame;
// confirm / pause / restart / mute are edge-triggered: the main loop drains
// them once per frame with take(), so a single press never fires twice.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_RESTART = 'restart';
export const ACTION_MUTE = 'mute';

const KEY_TO_ACTION = {
  Enter: ACTION_CONFIRM,
  Space: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  KeyR: ACTION_RESTART,
  KeyM: ACTION_MUTE,
};

export function createInput(canvas) {
  const keys = new Set();
  const queued = [];
  const mouse = { x: 0, y: 0, down: false };

  function trackMouse(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    const action = KEY_TO_ACTION[event.code];
    if (action) {
      queued.push(action);
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  canvas.addEventListener('mousemove', trackMouse);
  canvas.addEventListener('mousedown', (event) => {
    trackMouse(event);
    mouse.down = true;
    queued.push(ACTION_CONFIRM);
  });
  window.addEventListener('mouseup', () => {
    mouse.down = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  function axis() {
    let x = 0;
    let y = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const len = Math.hypot(x, y);
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  return {
    mouse,
    axis,
    /** True while the player holds fire: mouse button or Space. */
    get firing() {
      return mouse.down || keys.has('Space');
    },
    /** Drain the actions queued since the last frame. */
    takeActions() {
      const actions = queued.slice();
      queued.length = 0;
      return actions;
    },
  };
}
