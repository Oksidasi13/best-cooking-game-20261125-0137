// input.js — one clear job: turn mouse and keyboard input into game actions.
// Hit-tests the canvas (scaled to the page), routes clicks to the kitchen,
// the customers, the ingredient bins and the HUD buttons, and handles the
// shortcuts. It plays sounds through the sound engine it is given.

import {
  INGREDIENT_ORDER,
  MAX_CUSTOMERS,
  STATIONS,
  customerRect,
  ingredientRect,
  stationRect,
} from './config.js';
import { clickCustomerTicket, clickIngredient, clickStation } from './kitchen.js';
import { AGAIN_BUTTON, HUD_BUTTONS, START_BUTTON, plateSlotRects } from './render.js';

function inside(r, x, y) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function createInput(canvas, state, sound, actions) {
  let hover = { x: -1, y: -1 };

  function toCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function hoverIdAt(x, y) {
    if (state.screen === 'title') return inside(START_BUTTON, x, y) ? 'start' : null;
    if (state.screen === 'over') return inside(AGAIN_BUTTON, x, y) ? 'again' : null;
    if (state.screen !== 'playing') return null;
    for (const [id, b] of Object.entries(HUD_BUTTONS)) {
      if (inside(b, x, y)) return `button:${id}`;
    }
    for (let i = 0; i < MAX_CUSTOMERS; i++) {
      if (state.customers[i] && inside(customerRect(i), x, y)) return `customer:${i}`;
    }
    for (let i = 0; i < STATIONS.length; i++) {
      if (inside(stationRect(i), x, y)) return `station:${STATIONS[i].id}`;
    }
    for (let i = 0; i < INGREDIENT_ORDER.length; i++) {
      if (inside(ingredientRect(i), x, y)) return `ingredient:${INGREDIENT_ORDER[i]}`;
    }
    return null;
  }

  function play(tag) {
    if (!sound) return;
    sound.ensure();
    if (tag === 'pickup') sound.pickup();
    else if (tag === 'place') sound.place();
    else if (tag === 'chop') sound.chop();
    else if (tag === 'sizzle') sound.sizzle();
    else if (tag === 'done') sound.done();
    else if (tag === 'serve') sound.serve();
    else if (tag === 'error') sound.error();
    else if (tag === 'trash') sound.noise(0.15, 0.2, 500);
  }

  function onPointerDown(event) {
    sound.ensure();
    const { x, y } = toCanvas(event);
    if (state.screen === 'title') {
      if (inside(START_BUTTON, x, y)) actions.startGame();
      return;
    }
    if (state.screen === 'over') {
      if (inside(AGAIN_BUTTON, x, y)) actions.restart();
      return;
    }
    if (state.screen === 'paused') {
      actions.togglePause();
      return;
    }
    // playing
    for (const [id, b] of Object.entries(HUD_BUTTONS)) {
      if (inside(b, x, y)) {
        if (id === 'pause') actions.togglePause();
        if (id === 'mute') actions.toggleMute();
        if (id === 'restart') actions.restart();
        return;
      }
    }
    for (let i = 0; i < MAX_CUSTOMERS; i++) {
      if (state.customers[i] && inside(customerRect(i), x, y)) {
        play(clickCustomerTicket(state, i));
        return;
      }
    }
    for (let i = 0; i < STATIONS.length; i++) {
      const r = stationRect(i);
      if (inside(r, x, y)) {
        const id = STATIONS[i].id;
        if (id === 'plates') {
          const slots = plateSlotRects();
          const slot = slots.findIndex((s) => inside(s, x, y));
          play(clickStation(state, 'plates', slot === -1 ? 0 : slot));
        } else {
          play(clickStation(state, id));
        }
        return;
      }
    }
    for (let i = 0; i < INGREDIENT_ORDER.length; i++) {
      if (inside(ingredientRect(i), x, y)) {
        play(clickIngredient(state, INGREDIENT_ORDER[i]));
        return;
      }
    }
  }

  function onPointerMove(event) {
    const { x, y } = toCanvas(event);
    hover = { x, y };
    state.hoverId = hoverIdAt(x, y);
  }

  function onKeyDown(event) {
    const key = event.key.toLowerCase();
    if (key === 'm') {
      actions.toggleMute();
      return;
    }
    if (state.screen === 'title' && (key === 'enter' || key === ' ')) {
      event.preventDefault();
      actions.startGame();
      return;
    }
    if (state.screen === 'over' && (key === 'enter' || key === 'r')) {
      actions.restart();
      return;
    }
    if (key === 'p') {
      if (state.screen === 'playing' || state.screen === 'paused') actions.togglePause();
      return;
    }
    if (state.screen !== 'playing') return;
    const num = Number.parseInt(key, 10);
    if (num >= 1 && num <= INGREDIENT_ORDER.length) {
      sound.ensure();
      play(clickIngredient(state, INGREDIENT_ORDER[num - 1]));
      return;
    }
    if (key === 'escape' && state.hand) {
      sound.ensure();
      state.hand = null;
      play('trash');
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('keydown', onKeyDown);

  return {
    get hover() {
      return hover;
    },
  };
}
