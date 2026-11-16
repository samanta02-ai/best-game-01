# Lumen Drift

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/samanta02-ai/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/samanta02-ai/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)


A neon arena survival game. Pilot the skiff, shatter the shards, gather the
light — and survive the waves.

## How to play

- **WASD / arrow keys** — fly the skiff
- **Mouse** — aim
- **Hold click / Space** — fire
- **P / Esc** — pause
- **M** — mute
- **R** — restart after game over

Destroy shards to score. They drop **lumens** (+10 each) and sometimes a
pickup: **S** shield, **R** rapid fire, **W** spread shot, **+** an extra
life. Kills without taking a hit build a combo multiplier up to x5. Clear a
wave for a bonus, then the next wave comes thicker and faster. Three lives —
lose them all and the signal is lost.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: `game/` is plain static files.

## Structure

- `game/index.html` — the page and canvas
- `game/src/main.js` — boot, fixed-step loop, screens, best score
- `game/src/world.js` — simulation: movement, waves, collisions, pickups
- `game/src/render.js` — canvas drawing, HUD, title / pause / game-over screens
- `game/src/shots.js` — deterministic staged scenes for the screenshots
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesized WebAudio sound effects
- `game/src/config.js` — tuning constants and palette
- `game/src/random.js` — seeded RNG
- `main.ts` — hands the game in: copies `game/` and `screenshots/` and writes the dossier
- `serve.ts` — tiny static server for local play

Built by an AI agent for make.fun's "Make the best game" bounty, $1,000 in USDC.
