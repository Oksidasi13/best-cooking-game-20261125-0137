// config.js — tuning, ingredients, recipes and layout for Dapur Ngebul.
// One clear job: every number and name the rest of the game reads.

export const VIEW_W = 1280;
export const VIEW_H = 800;

export const SHIFT_SECONDS = 150;
export const MAX_CUSTOMERS = 3;
export const MAX_STRIKES = 3;
export const MAX_PLATES = 2;

export const CHOP_SECONDS = 2.5;
export const WOK_SECONDS = 4;
export const GRILL_SECONDS = 5;
export const BURN_SECONDS = 4; // seconds past done before a cooked item burns

export const SPAWN_FIRST = 2; // first customer arrives this many seconds in
export const SPAWN_START = 14; // seconds between customers at shift start
export const SPAWN_END = 8; // seconds between customers at shift end
export const PATIENCE_START = 42; // seconds of patience at shift start
export const PATIENCE_END = 30; // seconds of patience at shift end

export const TIP_MAX = 4; // biggest tip, in coins, for a full-patience serve
export const COMBO_STEP = 0.25; // +25% tip per serve in a row, capped below
export const COMBO_MAX = 2; // tip multiplier cap

// Ingredients the player picks from the counter. `chop` means the cutting
// board can chop it; `wokAddin` names the wok base it goes with.
export const INGREDIENTS = {
  nasi: { name: 'Nasi', color: '#fff3c4', dark: '#d9b64a', wokBase: true },
  mie: { name: 'Mie', color: '#ffd98a', dark: '#c98f2e', wokBase: true },
  ayam: { name: 'Ayam', color: '#ffb59e', dark: '#c96a4a', chop: true },
  telur: { name: 'Telur', color: '#fffbe8', dark: '#d8c27a', wokAddin: 'nasi' },
  sayur: { name: 'Sayur', color: '#9ed68a', dark: '#4d8a3c', chop: true, wokAddin: 'mie' },
  bumbu: { name: 'Bumbu', color: '#e8a04c', dark: '#9c5a16' },
};

export const INGREDIENT_ORDER = ['nasi', 'mie', 'ayam', 'telur', 'sayur', 'bumbu'];

// Chopped form of each choppable ingredient.
export const CHOPPED = { ayam: 'ayam-cincang', sayur: 'sayur-cincang' };
export const CHOPPED_NAME = { 'ayam-cincang': 'Ayam Cincang', 'sayur-cincang': 'Sayur Cincang' };

// Dishes the customers order. `make` tells the kitchen how it is built.
export const RECIPES = {
  'nasi-goreng': {
    name: 'Nasi Goreng', price: 8,
    make: { station: 'wok', base: 'nasi', addin: 'telur' },
  },
  'mie-goreng': {
    name: 'Mie Goreng', price: 8,
    make: { station: 'wok', base: 'mie', addin: 'sayur' },
  },
  'sate-ayam': {
    name: 'Sate Ayam', price: 10,
    make: { station: 'grill', chopped: 'ayam-cincang' },
  },
  'gado-gado': {
    name: 'Gado-Gado', price: 9,
    make: { station: 'plate', chopped: 'sayur-cincang', addin: 'bumbu' },
  },
};

export const RECIPE_ORDER = ['nasi-goreng', 'mie-goreng', 'sate-ayam', 'gado-gado'];

// Anything the hand or a station can hold: id -> display name.
export function itemName(id) {
  if (INGREDIENTS[id]) return INGREDIENTS[id].name;
  if (CHOPPED_NAME[id]) return CHOPPED_NAME[id];
  if (RECIPES[id]) return RECIPES[id].name;
  return id;
}

export function isDish(id) {
  return Boolean(RECIPES[id]);
}

export function isCookedDish(id) {
  return id === 'nasi-goreng' || id === 'mie-goreng' || id === 'sate-ayam';
}

// Layout: every clickable rectangle, in canvas coordinates.
export const LAYOUT = {
  hud: { x: 0, y: 0, w: VIEW_W, h: 66 },
  orders: { x: 16, y: 78, w: VIEW_W - 32, h: 128 },
  stations: { x: 16, y: 222, w: VIEW_W - 32, h: 252 },
  ingredients: { x: 16, y: 490, w: VIEW_W - 32, h: 148 },
  bottom: { x: 16, y: 654, w: VIEW_W - 32, h: 130 },
};

// Station boxes, left to right: board, wok, grill, plates, trash.
export const STATIONS = [
  { id: 'board', label: 'Talenan', hint: 'Cincang ayam / sayur' },
  { id: 'wok', label: 'Wajan', hint: 'Nasi/mie + isian, lalu masak' },
  { id: 'grill', label: 'Panggangan', hint: 'Panggang ayam cincang' },
  { id: 'plates', label: 'Meja Saji', hint: 'Rakit & sajikan hidangan' },
  { id: 'trash', label: 'Tong Sampah', hint: 'Buang isi tangan' },
];

export function stationRect(index) {
  const { x, y, w, h } = LAYOUT.stations;
  const gap = 12;
  const sw = (w - gap * (STATIONS.length - 1)) / STATIONS.length;
  return { x: x + index * (sw + gap), y, w: sw, h };
}

export function ingredientRect(index) {
  const { x, y, w, h } = LAYOUT.ingredients;
  const gap = 12;
  const iw = (w - gap * (INGREDIENT_ORDER.length - 1)) / INGREDIENT_ORDER.length;
  return { x: x + index * (iw + gap), y, w: iw, h };
}

export function customerRect(index) {
  const { x, y, w, h } = LAYOUT.orders;
  const gap = 16;
  const cw = (w - gap * (MAX_CUSTOMERS - 1)) / MAX_CUSTOMERS;
  return { x: x + index * (cw + gap), y, w: cw, h };
}

// Rank titles shown on the game-over screen by coins earned.
export function rankTitle(coins) {
  if (coins >= 150) return 'Master Dapur Ngebul';
  if (coins >= 110) return 'Koki Bintang Lima';
  if (coins >= 75) return 'Juru Masak Andal';
  if (coins >= 45) return 'Tukang Masak Rajin';
  if (coins >= 20) return 'Pembantu Dapur';
  return 'Magang Hari Pertama';
}

export const PALETTE = {
  bg: '#2b1a12',
  panel: '#fff6e3',
  panelDark: '#e8d5ae',
  ink: '#3a2415',
  accent: '#e4572e',
  accentDark: '#b23a17',
  gold: '#f2b705',
  green: '#4d8a3c',
  red: '#c0392b',
  wok: '#3d3d3d',
  board: '#d9a066',
  grill: '#5a4632',
  steel: '#c9ced6',
};
