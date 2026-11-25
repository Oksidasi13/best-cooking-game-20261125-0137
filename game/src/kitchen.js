// kitchen.js — one clear job: what happens when the player clicks a station.
// Owns the cutting board, the wok, the grill, the plating counter and the
// trash: placing ingredients, cooking progress, burning, plating and serving.
// Every function returns a short event tag ('pickup', 'place', 'chop',
// 'sizzle', 'done', 'serve', 'error', 'trash') so the main loop can play
// the matching sound; the state module owns customers and the clock.

import {
  BURN_SECONDS,
  CHOPPED,
  CHOP_SECONDS,
  GRILL_SECONDS,
  INGREDIENTS,
  RECIPES,
  WOK_SECONDS,
  isCookedDish,
} from './config.js';
import { serveCustomer, setToast } from './state.js';

function handId(state) {
  return state.hand ? state.hand.id : null;
}

function takeHand(state) {
  const item = state.hand;
  state.hand = null;
  return item;
}

function giveHand(state, id) {
  state.hand = { id };
}

// --- cutting board -------------------------------------------------------

function clickBoard(state) {
  const held = handId(state);
  if (state.board) {
    const b = state.board;
    if (b.state === 'done' && !state.hand) {
      giveHand(state, CHOPPED[b.id]);
      state.board = null;
      return 'pickup';
    }
    if (b.state === 'chopping' && !state.hand) {
      // Take the raw ingredient back off the board.
      giveHand(state, b.id);
      state.board = null;
      return 'pickup';
    }
    setToast(state, 'Talenan sedang dipakai.');
    return 'error';
  }
  if (held && INGREDIENTS[held] && INGREDIENTS[held].chop) {
    takeHand(state);
    state.board = { id: held, state: 'chopping', t: 0, dur: CHOP_SECONDS };
    return 'chop';
  }
  if (held) {
    setToast(state, 'Yang bisa dicincang cuma ayam dan sayur.');
    return 'error';
  }
  setToast(state, 'Talenan kosong — ambil ayam atau sayur dulu.');
  return 'error';
}

// --- wok -----------------------------------------------------------------

function clickWok(state) {
  const held = handId(state);
  const wok = state.wok;
  if (wok && wok.state === 'burnt') {
    if (!state.hand) {
      setToast(state, 'Hangus! Wajan dibersihkan.');
      state.wok = null;
      return 'trash';
    }
    setToast(state, 'Tanganmu penuh — kosongkan dulu.');
    return 'error';
  }
  if (wok && wok.state === 'done' && !state.hand) {
    const dish = wokDish(wok);
    giveHand(state, dish);
    state.wok = null;
    return 'pickup';
  }
  if (wok && wok.state === 'cooking') {
    setToast(state, 'Masih dimasak — tunggu sampai matang.');
    return 'error';
  }
  if (wok && wok.state === 'need-addin') {
    const recipe = Object.values(RECIPES).find(
      (r) => r.make.station === 'wok' && r.make.base === wok.base,
    );
    if (held === recipe.make.addin) {
      takeHand(state);
      wok.addin = held;
      wok.state = 'cooking';
      wok.t = 0;
      wok.dur = WOK_SECONDS;
      return 'sizzle';
    }
    setToast(state, `Wajan ini butuh ${INGREDIENTS[recipe.make.addin].name}.`);
    return 'error';
  }
  // Wok empty: only a base (nasi / mie) starts a dish.
  if (!wok && held && INGREDIENTS[held] && INGREDIENTS[held].wokBase) {
    takeHand(state);
    state.wok = { base: held, addin: null, state: 'need-addin', t: 0, dur: 0 };
    return 'place';
  }
  if (!wok && held) {
    setToast(state, 'Wajan butuh nasi atau mie sebagai dasar.');
    return 'error';
  }
  setToast(state, 'Wajan kosong — ambil nasi atau mie dulu.');
  return 'error';
}

function wokDish(wok) {
  for (const [id, recipe] of Object.entries(RECIPES)) {
    if (
      recipe.make.station === 'wok' &&
      recipe.make.base === wok.base &&
      recipe.make.addin === wok.addin
    ) {
      return id;
    }
  }
  return null;
}

// --- grill ---------------------------------------------------------------

function clickGrill(state) {
  const held = handId(state);
  const grill = state.grill;
  if (grill && grill.state === 'burnt') {
    if (!state.hand) {
      setToast(state, 'Hangus! Panggangan dibersihkan.');
      state.grill = null;
      return 'trash';
    }
    setToast(state, 'Tanganmu penuh — kosongkan dulu.');
    return 'error';
  }
  if (grill && grill.state === 'done' && !state.hand) {
    giveHand(state, 'sate-ayam');
    state.grill = null;
    return 'pickup';
  }
  if (grill && grill.state === 'cooking') {
    setToast(state, 'Sate masih dipanggang — tunggu sebentar.');
    return 'error';
  }
  if (!grill && held === 'ayam-cincang') {
    takeHand(state);
    state.grill = { id: 'ayam-cincang', state: 'cooking', t: 0, dur: GRILL_SECONDS };
    return 'sizzle';
  }
  if (!grill && held) {
    setToast(state, 'Panggangan cuma untuk ayam cincang.');
    return 'error';
  }
  setToast(state, 'Panggangan kosong — cincang ayam dulu.');
  return 'error';
}

// --- plating counter -----------------------------------------------------

function plateAccepts(plate, held) {
  // An empty plate takes a finished dish or chopped veg; bumbu only finishes
  // a plate already holding chopped veg (gado-gado).
  if (!plate) return isCookedDish(held) || held === 'sayur-cincang';
  if (plate.kind === 'component' && plate.id === 'sayur-cincang' && held === 'bumbu') {
    return true; // gado-gado finishes on the plate
  }
  return false;
}

function clickPlates(state, slot) {
  const held = handId(state);
  const plate = state.plates[slot];
  if (plate && plate.kind === 'dish' && !state.hand) {
    giveHand(state, plate.id);
    state.plates[slot] = null;
    return 'pickup';
  }
  if (plate && plate.kind === 'component' && !state.hand) {
    giveHand(state, plate.id);
    state.plates[slot] = null;
    return 'pickup';
  }
  if (!held) {
    setToast(state, 'Tidak ada yang bisa diambil di sini.');
    return 'error';
  }
  if (!plateAccepts(plate, held)) {
    if (plate) setToast(state, 'Piring ini sudah terisi.');
    else setToast(state, 'Yang bisa ditaruh di piring: hidangan matang atau sayur cincang.');
    return 'error';
  }
  takeHand(state);
  if (!plate) {
    if (held === 'sayur-cincang') {
      state.plates[slot] = { kind: 'component', id: 'sayur-cincang' };
    } else {
      state.plates[slot] = { kind: 'dish', id: held };
    }
    return 'place';
  }
  // Sayur cincang + bumbu = gado-gado, ready to serve.
  state.plates[slot] = { kind: 'dish', id: 'gado-gado' };
  return 'done';
}

// --- trash ---------------------------------------------------------------

function clickTrash(state) {
  if (state.hand) {
    takeHand(state);
    return 'trash';
  }
  setToast(state, 'Tanganmu kosong — tidak ada yang dibuang.');
  return 'error';
}

// --- customers -----------------------------------------------------------

function clickCustomer(state, index) {
  const customer = state.customers[index];
  if (!customer) return 'error';
  const held = handId(state);
  if (!held) {
    setToast(state, `Pelanggan mau ${RECIPES[customer.dish].name}.`);
    return 'error';
  }
  if (held !== customer.dish) {
    customer.mood = 'angry';
    customer.moodT = 1.2;
    setToast(state, `Bukan itu! Dia mau ${RECIPES[customer.dish].name}.`);
    return 'error';
  }
  const result = serveCustomer(state, customer, held);
  if (result) {
    setToast(state, `Tersaji! +$${result.earned} ($${result.price} + tip $${result.tip})`);
    return 'serve';
  }
  return 'error';
}

// --- dispatch ------------------------------------------------------------

export function clickStation(state, stationId, slot = 0) {
  if (stationId === 'board') return clickBoard(state);
  if (stationId === 'wok') return clickWok(state);
  if (stationId === 'grill') return clickGrill(state);
  if (stationId === 'plates') return clickPlates(state, slot);
  if (stationId === 'trash') return clickTrash(state);
  return 'error';
}

export function clickIngredient(state, id) {
  if (state.hand) {
    setToast(state, 'Tanganmu penuh — sajikan atau buang dulu.');
    return 'error';
  }
  giveHand(state, id);
  return 'pickup';
}

export function clickCustomerTicket(state, index) {
  return clickCustomer(state, index);
}

// --- per-frame progress --------------------------------------------------

// Advance chopping / cooking / grilling. Returns events for sounds.
export function updateStations(state, dt) {
  const events = [];
  if (state.board && state.board.state === 'chopping') {
    state.board.t += dt;
    if (state.board.t >= state.board.dur) state.board.state = 'done';
  }
  if (state.wok && state.wok.state === 'cooking') {
    state.wok.t += dt;
    if (state.wok.t >= state.wok.dur && state.wok.state === 'cooking') {
      state.wok.state = 'done';
      state.wok.t = 0;
      events.push('done');
    }
  } else if (state.wok && state.wok.state === 'done') {
    state.wok.t += dt;
    if (state.wok.t >= BURN_SECONDS) {
      state.wok.state = 'burnt';
      setToast(state, 'Wajan hangus! Klik untuk membersihkan.');
    }
  }
  if (state.grill && state.grill.state === 'cooking') {
    state.grill.t += dt;
    if (state.grill.t >= state.grill.dur) {
      state.grill.state = 'done';
      state.grill.t = 0;
      events.push('done');
    }
  } else if (state.grill && state.grill.state === 'done') {
    state.grill.t += dt;
    if (state.grill.t >= BURN_SECONDS) {
      state.grill.state = 'burnt';
      setToast(state, 'Panggangan hangus! Klik untuk membersihkan.');
    }
  }
  return events;
}

// --- demo setups ---------------------------------------------------------
// ?setup=cover|cook|orders|serve starts the shift with a staged kitchen so
// screenshots show the game at its best. Pure game state, no special art.

export function applySetup(state, name) {
  if (name === 'cover') {
    state.timeLeft = 87;
    state.elapsed = 150 - 87;
    state.coins = 24;
    state.combo = 1;
    state.wok = { base: 'nasi', addin: 'telur', state: 'cooking', t: 2.4, dur: WOK_SECONDS };
    state.grill = { id: 'ayam-cincang', state: 'cooking', t: 3.1, dur: GRILL_SECONDS };
    state.plates[0] = { kind: 'dish', id: 'sate-ayam' };
    state.customers = [
      { uid: 1, dish: 'nasi-goreng', patience: 26, maxPatience: 42, skin: '#f2c79b', hair: '#2b2b2b', hat: 'cap', mood: 'waiting', moodT: 0 },
      { uid: 2, dish: 'mie-goreng', patience: 33, maxPatience: 42, skin: '#e8a87c', hair: '#5a3a1a', hat: null, mood: 'waiting', moodT: 0 },
    ];
    state.nextUid = 3;
    state.spawnIn = 6;
  } else if (name === 'cook') {
    state.timeLeft = 112;
    state.elapsed = 150 - 112;
    state.coins = 11;
    state.board = { id: 'ayam', state: 'chopping', t: 1.1, dur: CHOP_SECONDS };
    state.wok = { base: 'mie', addin: 'sayur', state: 'cooking', t: 1.8, dur: WOK_SECONDS };
    state.grill = { id: 'ayam-cincang', state: 'cooking', t: 4.2, dur: GRILL_SECONDS };
    state.customers = [
      { uid: 1, dish: 'sate-ayam', patience: 30, maxPatience: 42, skin: '#c98d64', hair: '#8a8a8a', hat: 'bandana', mood: 'waiting', moodT: 0 },
    ];
    state.nextUid = 2;
    state.spawnIn = 9;
  } else if (name === 'orders') {
    state.timeLeft = 121;
    state.elapsed = 150 - 121;
    state.coins = 5;
    state.customers = [
      { uid: 1, dish: 'nasi-goreng', patience: 38, maxPatience: 42, skin: '#f2c79b', hair: '#2b2b2b', hat: 'chef', mood: 'waiting', moodT: 0 },
      { uid: 2, dish: 'gado-gado', patience: 24, maxPatience: 42, skin: '#8d5a3b', hair: '#b23a17', hat: null, mood: 'waiting', moodT: 0 },
      { uid: 3, dish: 'sate-ayam', patience: 15, maxPatience: 42, skin: '#f7d7b0', hair: '#3a5a2b', hat: 'cap', mood: 'waiting', moodT: 0 },
    ];
    state.nextUid = 4;
    state.spawnIn = 8;
  } else if (name === 'serve') {
    state.timeLeft = 64;
    state.elapsed = 150 - 64;
    state.coins = 47;
    state.combo = 2;
    state.plates[0] = { kind: 'dish', id: 'sate-ayam' };
    state.plates[1] = { kind: 'dish', id: 'nasi-goreng' };
    state.hand = { id: 'sate-ayam' };
    state.customers = [
      { uid: 1, dish: 'sate-ayam', patience: 19, maxPatience: 42, skin: '#f2c79b', hair: '#2b2b2b', hat: 'bandana', mood: 'waiting', moodT: 0 },
      { uid: 2, dish: 'mie-goreng', patience: 35, maxPatience: 42, skin: '#e8a87c', hair: '#5a3a1a', hat: null, mood: 'waiting', moodT: 0 },
    ];
    state.nextUid = 3;
    state.spawnIn = 5;
  }
}
