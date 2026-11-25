// state.js — one clear job: the game's state and how it changes over time.
// Holds the shift timer, the customers and their patience, the score and
// the combo, and the spawn ramp. The kitchen module owns the stations;
// this module owns everything that ticks while the shift runs.

import {
  MAX_CUSTOMERS,
  MAX_STRIKES,
  PATIENCE_END,
  PATIENCE_START,
  RECIPES,
  RECIPE_ORDER,
  SHIFT_SECONDS,
  SPAWN_END,
  SPAWN_FIRST,
  SPAWN_START,
  TIP_MAX,
  COMBO_MAX,
  COMBO_STEP,
} from './config.js';
import { makeRng, pick, range } from './random.js';

const FACE_SKINS = ['#f2c79b', '#e8a87c', '#c98d64', '#8d5a3b', '#f7d7b0'];
const FACE_HAIR = ['#2b2b2b', '#5a3a1a', '#8a8a8a', '#b23a17', '#3a5a2b', '#e8b400'];
const FACE_HATS = [null, null, 'cap', 'cap', 'bandana', 'chef'];

export function createState(seedParam) {
  const rng = makeRng(seedParam);
  return {
    screen: 'title', // title | playing | paused | over
    seed: rng.seed,
    rng,
    elapsed: 0,
    timeLeft: SHIFT_SECONDS,
    coins: 0,
    served: 0,
    walkouts: 0,
    strikes: 0,
    combo: 0,
    bestCombo: 0,
    earned: 0,
    hand: null, // { id } — what the player is carrying, or null
    board: null, // { id, state: 'chopping'|'done', t, dur }
    wok: null, // { base, addin, state: 'need-addin'|'cooking'|'done'|'burnt', t, dur }
    grill: null, // { id, state: 'cooking'|'done'|'burnt', t, dur }
    plates: [null, null], // each: null | { kind: 'component'|'dish', id }
    customers: [], // { uid, dish, patience, maxPatience, skin, hair, hat, mood }
    spawnIn: SPAWN_FIRST,
    nextUid: 1,
    toast: '',
    toastT: 0,
    overReason: '',
    lastTickSecond: -1,
  };
}

export function resetState(state, seedParam) {
  const fresh = createState(seedParam ?? state.seed);
  Object.assign(state, fresh, { screen: 'playing' });
}

export function shiftProgress(state) {
  return Math.min(1, state.elapsed / SHIFT_SECONDS);
}

export function spawnInterval(state) {
  return SPAWN_START + (SPAWN_END - SPAWN_START) * shiftProgress(state);
}

export function patienceFor(state) {
  return PATIENCE_START + (PATIENCE_END - PATIENCE_START) * shiftProgress(state);
}

function makeCustomer(state) {
  const dish = pick(state.rng, RECIPE_ORDER);
  const maxPatience = patienceFor(state);
  return {
    uid: state.nextUid++,
    dish,
    patience: maxPatience,
    maxPatience,
    skin: pick(state.rng, FACE_SKINS),
    hair: pick(state.rng, FACE_HAIR),
    hat: pick(state.rng, FACE_HATS),
    mood: 'waiting',
    moodT: 0,
  };
}

export function spawnCustomer(state) {
  if (state.customers.length >= MAX_CUSTOMERS) return false;
  state.customers.push(makeCustomer(state));
  return true;
}

// Advance the shift clock, spawns and patience. Returns events the main
// loop turns into sounds: 'tick', 'walkout', 'shift-end'.
export function updateShift(state, dt) {
  const events = [];
  if (state.screen !== 'playing') return events;
  state.elapsed += dt;
  state.timeLeft = Math.max(0, SHIFT_SECONDS - state.elapsed);

  const whole = Math.ceil(state.timeLeft);
  if (state.timeLeft <= 10 && whole !== state.lastTickSecond) {
    state.lastTickSecond = whole;
    events.push('tick');
  }

  state.spawnIn -= dt;
  if (state.spawnIn <= 0) {
    if (spawnCustomer(state)) state.spawnIn = spawnInterval(state);
    else state.spawnIn = 2; // board full: check again soon
  }

  for (const c of state.customers) {
    c.patience -= dt;
    if (c.moodT > 0) c.moodT -= dt;
  }
  const left = [];
  for (const c of state.customers) {
    if (c.patience <= 0) {
      state.walkouts++;
      state.strikes++;
      state.combo = 0;
      events.push('walkout');
    } else {
      left.push(c);
    }
  }
  state.customers = left;

  if (state.strikes >= MAX_STRIKES) {
    state.overReason = 'Tiga pelanggan pergi kecewa — dapur ditutup lebih awal.';
    events.push('shift-end');
  } else if (state.timeLeft <= 0) {
    state.overReason = 'Shift selesai! Waktunya istirahat.';
    events.push('shift-end');
  }
  return events;
}

export function tipFor(state, customer) {
  const fraction = Math.max(0, customer.patience / customer.maxPatience);
  const mult = Math.min(COMBO_MAX, 1 + COMBO_STEP * state.combo);
  return Math.max(1, Math.round(TIP_MAX * fraction * mult));
}

export function serveCustomer(state, customer, dishId) {
  if (customer.dish !== dishId) return null;
  const recipe = RECIPES[dishId];
  const tip = tipFor(state, customer);
  const earned = recipe.price + tip;
  state.coins += earned;
  state.earned += earned;
  state.served++;
  state.combo++;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.customers = state.customers.filter((c) => c.uid !== customer.uid);
  state.hand = null;
  return { earned, tip, price: recipe.price };
}

export function setToast(state, text) {
  state.toast = text;
  state.toastT = 2.2;
}

export function updateToast(state, dt) {
  if (state.toastT > 0) state.toastT -= dt;
}
