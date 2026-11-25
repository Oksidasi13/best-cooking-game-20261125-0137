// main.js — one clear job: boot the game and run its loop.
// Wires the state, the kitchen, the renderer, the input and the sounds
// together; owns the screen flow (title -> playing -> paused / over) and
// the per-frame update order. No drawing and no station rules live here.

import { SoundEngine } from './audio.js';
import { VIEW_H, VIEW_W } from './config.js';
import { createInput } from './input.js';
import { applySetup, updateStations } from './kitchen.js';
import { draw } from './render.js';
import { createState, resetState, updateShift, updateToast } from './state.js';

const params = new URLSearchParams(window.location.search);
const state = createState(params.get('seed'));
const sound = new SoundEngine();
state.muted = false;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

let lastNow = performance.now();

function startGame() {
  resetState(state, state.seed);
  const setup = params.get('setup');
  if (setup) applySetup(state, setup);
  sound.ensure();
  sound.start();
}

function restart() {
  startGame();
}

function togglePause() {
  if (state.screen === 'playing') state.screen = 'paused';
  else if (state.screen === 'paused') state.screen = 'playing';
}

function toggleMute() {
  state.muted = !state.muted;
  sound.setMuted(state.muted);
}

createInput(canvas, state, sound, { startGame, restart, togglePause, toggleMute });

// Handle for automated playtests (read-only state inspection, harmless in play).
window.__dapur = { state, sound, startGame, restart };

function playEvent(tag) {
  if (!tag) return;
  sound.ensure();
  if (tag === 'done') sound.done();
  else if (tag === 'walkout') sound.walkout();
  else if (tag === 'tick') sound.tick();
  else if (tag === 'shift-end') {
    state.screen = 'over';
    sound.gameOver();
  }
}

function frame(now) {
  const dt = Math.min(0.1, (now - lastNow) / 1000);
  lastNow = now;
  if (state.screen === 'playing') {
    for (const event of updateShift(state, dt)) playEvent(event);
    if (state.screen === 'playing') {
      for (const event of updateStations(state, dt)) playEvent(event);
    }
    updateToast(state, dt);
  }
  draw(ctx, state, now);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
