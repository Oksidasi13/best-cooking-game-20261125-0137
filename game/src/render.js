// render.js — one clear job: everything the player sees.
// Draws the kitchen, the order board, the stations, the ingredients, the
// HUD and the title / pause / game-over screens on one canvas. All art is
// drawn with canvas paths (no image files), so the game stays offline and
// self-contained. No game logic lives here — it only reads the state.

import {
  INGREDIENTS,
  INGREDIENT_ORDER,
  LAYOUT,
  MAX_STRIKES,
  PALETTE,
  RECIPES,
  SHIFT_SECONDS,
  STATIONS,
  VIEW_H,
  VIEW_W,
  customerRect,
  ingredientRect,
  itemName,
  rankTitle,
  stationRect,
} from './config.js';

const FONT = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif';

export const HUD_BUTTONS = {
  pause: { x: VIEW_W - 16 - 44 * 3 - 16, y: 11, w: 44, h: 44, label: 'II' },
  mute: { x: VIEW_W - 16 - 44 * 2 - 8, y: 11, w: 44, h: 44, label: '♪' },
  restart: { x: VIEW_W - 16 - 44, y: 11, w: 44, h: 44, label: '↺' },
};

export const START_BUTTON = { x: VIEW_W / 2 - 130, y: 590, w: 260, h: 72 };
export const AGAIN_BUTTON = { x: VIEW_W / 2 - 130, y: 600, w: 260, h: 72 };

export function plateSlotRects() {
  const r = stationRect(3);
  const cy = r.y + 118;
  return [
    { x: r.x + 18, y: cy - 58, w: 100, h: 116, cx: r.x + 68, cy },
    { x: r.x + r.w - 118, y: cy - 58, w: 100, h: 116, cx: r.x + r.w - 68, cy },
  ];
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, weight = '700', align = 'center') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function progressBar(ctx, x, y, w, h, frac, color, bg = 'rgba(0,0,0,0.25)') {
  rr(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  if (frac > 0) {
    rr(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function stationProgress(state, stationId) {
  if (stationId === 'board' && state.board) {
    return state.board.state === 'done' ? 1 : state.board.t / state.board.dur;
  }
  if (stationId === 'wok' && state.wok && state.wok.state === 'cooking') {
    return state.wok.t / state.wok.dur;
  }
  if (stationId === 'grill' && state.grill && state.grill.state === 'cooking') {
    return state.grill.t / state.grill.dur;
  }
  return null;
}

// --- food icons (all drawn, no images) ----------------------------------

export function drawFoodIcon(ctx, id, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  const s = r / 40; // scale: icons are drawn for r = 40
  ctx.scale(s, s);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(58,36,21,0.85)';
  switch (id) {
    case 'nasi': // bowl of white rice
      ctx.fillStyle = '#fff8e1';
      ctx.beginPath(); ctx.arc(0, -6, 20, Math.PI, 0); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e4572e';
      ctx.beginPath(); ctx.moveTo(-24, -4); ctx.lineTo(24, -4); ctx.lineTo(18, 18); ctx.lineTo(-18, 18); ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case 'mie': // noodle nest
      ctx.strokeStyle = '#c98f2e';
      ctx.lineWidth = 4;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(-22, i * 6);
        ctx.bezierCurveTo(-10, i * 6 - 8, 10, i * 6 + 8, 22, i * 6);
        ctx.stroke();
      }
      break;
    case 'ayam': // drumstick
      ctx.fillStyle = '#ffb59e';
      ctx.beginPath(); ctx.ellipse(4, 2, 18, 14, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#fff8e1';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-10, 12); ctx.lineTo(-22, 24); ctx.stroke();
      ctx.fillStyle = '#fff8e1';
      ctx.beginPath(); ctx.arc(-24, 26, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      break;
    case 'telur': // egg
      ctx.fillStyle = '#fffbe8';
      ctx.beginPath(); ctx.ellipse(0, 0, 22, 17, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f2b705';
      ctx.beginPath(); ctx.arc(2, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      break;
    case 'sayur': // leafy greens
      ctx.fillStyle = '#7cc46a';
      for (const [dx, dy, rot] of [[-10, 4, -0.6], [0, -8, 0], [10, 4, 0.6]]) {
        ctx.save();
        ctx.translate(dx, dy); ctx.rotate(rot);
        ctx.beginPath(); ctx.ellipse(0, 0, 9, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      break;
    case 'bumbu': // sauce bottle
      ctx.fillStyle = '#e8a04c';
      rr(ctx, -11, -14, 22, 34, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9c5a16';
      rr(ctx, -6, -24, 12, 12, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff6e3';
      ctx.font = '700 13px ' + FONT; ctx.textAlign = 'center';
      ctx.fillText('★', 0, 4);
      break;
    case 'ayam-cincang': // diced chicken cubes
      ctx.fillStyle = '#ff9d7e';
      for (const [dx, dy] of [[-12, -8], [8, -10], [-2, 8], [12, 10]]) {
        rr(ctx, dx - 8, dy - 8, 16, 16, 3); ctx.fill(); ctx.stroke();
      }
      break;
    case 'sayur-cincang': // shredded greens
      ctx.strokeStyle = '#4d8a3c';
      ctx.lineWidth = 5;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(-22, -14 + i * 7);
        ctx.lineTo(22, -10 + i * 7);
        ctx.stroke();
      }
      break;
    case 'nasi-goreng': // fried rice bowl with egg
      ctx.fillStyle = '#e4572e';
      ctx.beginPath(); ctx.moveTo(-26, -2); ctx.lineTo(26, -2); ctx.lineTo(19, 20); ctx.lineTo(-19, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f2a541';
      ctx.beginPath(); ctx.arc(0, -8, 20, Math.PI, 0); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fffbe8';
      ctx.beginPath(); ctx.arc(-8, -12, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7cc46a';
      ctx.fillRect(6, -18, 12, 4);
      break;
    case 'mie-goreng': // fried noodles with greens
      ctx.fillStyle = '#e4572e';
      ctx.beginPath(); ctx.moveTo(-26, -2); ctx.lineTo(26, -2); ctx.lineTo(19, 20); ctx.lineTo(-19, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#f2c14e';
      ctx.lineWidth = 4;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(-20, -6 + i * 6);
        ctx.bezierCurveTo(-8, -12 + i * 6, 8, 0 + i * 6, 20, -6 + i * 6); ctx.stroke();
      }
      ctx.fillStyle = '#7cc46a';
      ctx.fillRect(-14, -20, 10, 4); ctx.fillRect(4, -22, 10, 4);
      break;
    case 'sate-ayam': // two skewers
      ctx.strokeStyle = '#8a5a2b';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-24, -18); ctx.lineTo(24, 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-24, 18); ctx.lineTo(24, -18); ctx.stroke();
      ctx.fillStyle = '#a0662c';
      for (const [dx, dy] of [[-12, -8], [0, 0], [12, 8], [-12, 8], [0, 0], [12, -8]]) {
        rr(ctx, dx - 7, dy - 6, 14, 12, 3); ctx.fill(); ctx.stroke();
      }
      break;
    case 'gado-gado': // plate of veggies with peanut sauce
      ctx.fillStyle = '#fff6e3';
      ctx.beginPath(); ctx.ellipse(0, 4, 26, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7cc46a';
      ctx.beginPath(); ctx.arc(-10, -4, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(8, -6, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8a04c';
      ctx.beginPath(); ctx.ellipse(0, -2, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fffbe8';
      ctx.beginPath(); ctx.arc(0, -10, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      break;
    default:
      ctx.fillStyle = '#ccc';
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

function drawFace(ctx, c, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = c.skin;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(58,36,21,0.8)';
  ctx.stroke();
  if (c.hat === 'cap') {
    ctx.fillStyle = '#e4572e';
    ctx.beginPath(); ctx.arc(0, -r * 0.25, r * 0.95, Math.PI, 0); ctx.fill(); ctx.stroke();
    ctx.fillRect(-r * 0.95, -r * 0.35, r * 1.9, r * 0.22);
  } else if (c.hat === 'bandana') {
    ctx.fillStyle = '#4d8a3c';
    ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.95, Math.PI, 0); ctx.fill(); ctx.stroke();
  } else if (c.hat === 'chef') {
    ctx.fillStyle = '#fff6e3';
    ctx.beginPath(); ctx.arc(-r * 0.45, -r * 0.55, r * 0.42, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -r * 0.7, r * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(r * 0.45, -r * 0.55, r * 0.42, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else {
    ctx.fillStyle = c.hair;
    ctx.beginPath(); ctx.arc(0, -r * 0.3, r * 0.9, Math.PI, 0); ctx.fill();
  }
  const angry = c.mood === 'angry';
  ctx.fillStyle = '#2b1a12';
  ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.05, r * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.05, r * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2b1a12';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (angry) {
    ctx.moveTo(-r * 0.4, r * 0.45); ctx.lineTo(r * 0.4, r * 0.45);
    ctx.moveTo(-r * 0.55, -r * 0.3); ctx.lineTo(-r * 0.2, -r * 0.15);
    ctx.moveTo(r * 0.55, -r * 0.3); ctx.lineTo(r * 0.2, -r * 0.15);
  } else {
    ctx.arc(0, r * 0.2, r * 0.4, 0.15 * Math.PI, 0.85 * Math.PI);
  }
  ctx.stroke();
  ctx.restore();
}

// --- panels ---------------------------------------------------------------

function drawPanel(ctx, r, fill = PALETTE.panel, stroke = PALETTE.panelDark) {
  rr(ctx, r.x, r.y, r.w, r.h, 16);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function drawKitchenWall(ctx, now) {
  ctx.fillStyle = '#3a2418';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // warm tile wall
  ctx.fillStyle = '#4a2e1c';
  for (let y = 0; y < 210; y += 42) {
    for (let x = 0; x < VIEW_W; x += 84) {
      ctx.fillRect(x + ((y / 42) % 2) * 42, y, 80, 38);
    }
  }
  // hanging lamp glow
  const flicker = 0.92 + 0.08 * Math.sin(now / 700);
  const g = ctx.createRadialGradient(640, 90, 10, 640, 90, 420);
  g.addColorStop(0, `rgba(242,183,5,${0.16 * flicker})`);
  g.addColorStop(1, 'rgba(242,183,5,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, 420);
}

function drawHud(ctx, state) {
  const { x, y, w, h } = LAYOUT.hud;
  ctx.fillStyle = 'rgba(20,10,6,0.85)';
  ctx.fillRect(x, y, w, h);
  const mm = Math.floor(state.timeLeft / 60);
  const ss = Math.floor(state.timeLeft % 60);
  const low = state.timeLeft <= 15;
  text(ctx, `${mm}:${String(ss).padStart(2, '0')}`, 30, 34, 34, low ? '#ff6b4a' : '#fff6e3', '800', 'left');
  progressBar(ctx, 130, 24, 200, 18, state.timeLeft / SHIFT_SECONDS, low ? '#c0392b' : PALETTE.gold);
  text(ctx, 'WAKTU', 130, 52, 11, '#d8c9a8', '700', 'left');
  ctx.fillStyle = '#fff6e3';
  ctx.font = `800 30px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`$${state.coins}`, 480, 34);
  text(ctx, 'KOIN', 480, 56, 11, '#d8c9a8', '700');
  const mult = Math.min(2, 1 + 0.25 * state.combo);
  text(ctx, state.combo >= 2 ? `COMBO x${mult.toFixed(2).replace(/\.?0+$/, '')} (${state.combo})` : 'COMBO —', 640, 34, 20, state.combo >= 2 ? PALETTE.gold : '#9c8a6e');
  // strikes: three flames, lost ones grey
  for (let i = 0; i < MAX_STRIKES; i++) {
    const bx = 800 + i * 40;
    ctx.fillStyle = i < MAX_STRIKES - state.strikes ? '#e4572e' : 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(bx, 48);
    ctx.quadraticCurveTo(bx - 12, 30, bx, 14);
    ctx.quadraticCurveTo(bx + 12, 30, bx, 48);
    ctx.fill();
  }
  text(ctx, 'PELANGGAN PERGI', 800, 58, 10, '#d8c9a8', '700');
  for (const [id, b] of Object.entries(HUD_BUTTONS)) {
    const active = (id === 'mute' && state.muted) || (id === 'pause' && state.screen === 'paused');
    rr(ctx, b.x, b.y, b.w, b.h, 10);
    ctx.fillStyle = active ? PALETTE.gold : 'rgba(255,246,227,0.14)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,246,227,0.5)';
    ctx.stroke();
    text(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2 + 1, 20, active ? '#3a2415' : '#fff6e3');
  }
}

function drawOrders(ctx, state, now) {
  const r = LAYOUT.orders;
  drawPanel(ctx, r);
  text(ctx, 'PESANAN', r.x + 16, r.y + 18, 15, '#9c7a4a', '800', 'left');
  if (state.customers.length === 0) {
    text(ctx, 'Belum ada pelanggan — siap-siap!', r.x + r.w / 2, r.y + r.h / 2 + 10, 20, '#9c7a4a');
    return;
  }
  state.customers.forEach((c, i) => {
    const t = customerRect(i);
    const frac = Math.max(0, c.patience / c.maxPatience);
    const urgent = frac < 0.3;
    const shake = urgent ? Math.sin(now / 90) * 2 : 0;
    rr(ctx, t.x + shake, t.y, t.w, t.h, 12);
    ctx.fillStyle = c.mood === 'angry' ? '#ffe3d8' : '#fffdf6';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = urgent ? '#c0392b' : PALETTE.panelDark;
    ctx.stroke();
    drawFace(ctx, c, t.x + 52, t.y + t.h / 2 - 6, 34);
    const recipe = RECIPES[c.dish];
    drawFoodIcon(ctx, c.dish, t.x + 128, t.y + 46, 30);
    text(ctx, recipe.name, t.x + 170, t.y + 30, 22, PALETTE.ink, '800', 'left');
    text(ctx, `$${recipe.price} + tip`, t.x + 170, t.y + 56, 15, '#9c7a4a', '700', 'left');
    progressBar(ctx, t.x + 170, t.y + 82, t.w - 290, 14, frac, frac < 0.3 ? '#c0392b' : frac < 0.6 ? '#f2b705' : '#4d8a3c');
    text(ctx, `${Math.ceil(c.patience)} dtk`, t.x + t.w - 16, t.y + 89, 13, urgent ? '#c0392b' : '#7a6547', '700', 'right');
  });
}

function drawStations(ctx, state, now) {
  const r = LAYOUT.stations;
  drawPanel(ctx, r, 'rgba(255,246,227,0.96)');
  text(ctx, 'DAPUR', r.x + 16, r.y + 18, 15, '#9c7a4a', '800', 'left');
  STATIONS.forEach((s, i) => {
    const b = stationRect(i);
    const hover = state.hoverId === `station:${s.id}`;
    rr(ctx, b.x, b.y + 26, b.w, b.h - 26, 12);
    ctx.fillStyle = hover ? '#fffdf6' : '#f3e6c8';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = hover ? PALETTE.accent : '#d9c39a';
    ctx.stroke();
    text(ctx, s.label.toUpperCase(), b.x + b.w / 2, b.y + 46, 16, PALETTE.ink);
    text(ctx, s.hint, b.x + b.w / 2, b.y + b.h - 14, 11, '#9c7a4a');
    const cx = b.x + b.w / 2;
    const cy = b.y + 128;
    if (s.id === 'board') drawBoard(ctx, state, cx, cy, now);
    if (s.id === 'wok') drawWok(ctx, state, cx, cy, now);
    if (s.id === 'grill') drawGrill(ctx, state, cx, cy, now);
    if (s.id === 'plates') drawPlates(ctx, state, now);
    if (s.id === 'trash') drawTrash(ctx, cx, cy);
    const prog = stationProgress(state, s.id);
    if (prog !== null) {
      progressBar(ctx, b.x + 24, b.y + b.h - 34, b.w - 48, 10, prog, '#e4572e');
    }
  });
}

function drawBoard(ctx, state, cx, cy, now) {
  rr(ctx, cx - 82, cy - 46, 164, 92, 10);
  ctx.fillStyle = PALETTE.board;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#a8763e';
  ctx.stroke();
  const b = state.board;
  if (!b) {
    text(ctx, 'kosong', cx, cy, 16, '#8a6a42');
    return;
  }
  const bob = b.state === 'chopping' ? Math.sin(now / 120) * 2 : 0;
  if (b.state === 'chopping') drawFoodIcon(ctx, b.id, cx, cy + bob, 30);
  else {
    drawFoodIcon(ctx, CHOPPED_ID(b.id), cx, cy, 30);
    text(ctx, 'SIAP!', cx, cy + 62, 13, PALETTE.green, '800');
  }
}

function CHOPPED_ID(id) {
  return id === 'ayam' ? 'ayam-cincang' : 'sayur-cincang';
}

function drawWok(ctx, state, cx, cy, now) {
  const wok = state.wok;
  ctx.fillStyle = '#2b2b2b';
  ctx.beginPath(); ctx.ellipse(cx, cy + 8, 86, 40, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#454545';
  ctx.beginPath(); ctx.ellipse(cx, cy + 2, 86, 36, 0, Math.PI, 0); ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#1c1c1c';
  ctx.beginPath(); ctx.ellipse(cx, cy + 2, 86, 36, 0, 0, Math.PI * 2); ctx.stroke();
  if (!wok) {
    text(ctx, 'kosong', cx, cy - 18, 16, '#cfc4ae');
    return;
  }
  if (wok.state === 'need-addin') {
    drawFoodIcon(ctx, wok.base, cx, cy - 6, 26);
    text(ctx, `+ ${wok.base === 'nasi' ? 'telur' : 'sayur'}`, cx, cy + 34, 14, '#f2b705', '800');
    return;
  }
  if (wok.state === 'burnt') {
    ctx.fillStyle = '#141414';
    ctx.beginPath(); ctx.ellipse(cx, cy - 4, 62, 22, 0, 0, Math.PI * 2); ctx.fill();
    text(ctx, 'HANGUS!', cx, cy - 34, 16, '#ff6b4a', '800');
    return;
  }
  const dish = wok.base === 'nasi' ? 'nasi-goreng' : 'mie-goreng';
  const steam = wok.state === 'cooking' ? 1 : 0.4;
  for (let i = 0; i < 3; i++) {
    const sx = cx - 30 + i * 30 + Math.sin(now / 300 + i * 2) * 6;
    ctx.strokeStyle = `rgba(255,255,255,${0.5 * steam})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(sx, cy - 26);
    ctx.quadraticCurveTo(sx + 8, cy - 44, sx, cy - 58);
    ctx.stroke();
  }
  drawFoodIcon(ctx, dish, cx, cy - 2, 30);
  if (wok.state === 'done') text(ctx, 'MATANG! Ambil!', cx, cy + 64, 14, PALETTE.green, '800');
}

function drawGrill(ctx, state, cx, cy, now) {
  rr(ctx, cx - 82, cy - 44, 164, 88, 10);
  ctx.fillStyle = PALETTE.grill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#3a2c1e';
  ctx.stroke();
  ctx.strokeStyle = '#2b2018';
  ctx.lineWidth = 5;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath(); ctx.moveTo(cx - 70, cy - 24 + i * 18); ctx.lineTo(cx + 70, cy - 24 + i * 18); ctx.stroke();
  }
  const g = state.grill;
  if (!g) {
    text(ctx, 'kosong', cx, cy - 2, 16, '#d8c9a8');
    return;
  }
  if (g.state === 'burnt') {
    ctx.fillStyle = '#141414';
    ctx.beginPath(); ctx.ellipse(cx, cy - 4, 60, 18, 0, 0, Math.PI * 2); ctx.fill();
    text(ctx, 'HANGUS!', cx, cy - 34, 16, '#ff6b4a', '800');
    return;
  }
  const flicker = g.state === 'cooking' ? 0.5 + 0.5 * Math.sin(now / 140) : 0.3;
  ctx.fillStyle = `rgba(228,87,46,${0.55 * flicker})`;
  ctx.beginPath(); ctx.ellipse(cx, cy + 26, 60, 12, 0, 0, Math.PI * 2); ctx.fill();
  drawFoodIcon(ctx, 'sate-ayam', cx, cy - 4, 30);
  if (g.state === 'done') text(ctx, 'MATANG! Ambil!', cx, cy + 64, 14, PALETTE.green, '800');
}

function drawPlates(ctx, state) {
  const slots = plateSlotRects();
  slots.forEach((slot, i) => {
    ctx.fillStyle = '#fffdf6';
    ctx.beginPath(); ctx.ellipse(slot.cx, slot.cy, 52, 40, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#d9c39a';
    ctx.stroke();
    ctx.fillStyle = '#f3e6c8';
    ctx.beginPath(); ctx.ellipse(slot.cx, slot.cy, 36, 26, 0, 0, Math.PI * 2); ctx.fill();
    const plate = state.plates[i];
    if (!plate) return;
    drawFoodIcon(ctx, plate.id, slot.cx, slot.cy - 4, 30);
    if (plate.kind === 'dish') {
      rr(ctx, slot.cx - 34, slot.cy + 30, 68, 20, 10);
      ctx.fillStyle = PALETTE.green;
      ctx.fill();
      text(ctx, 'SIAP SAJI', slot.cx, slot.cy + 41, 11, '#fff', '800');
    } else {
      text(ctx, '+ bumbu', slot.cx, slot.cy + 40, 11, '#9c7a4a', '700');
    }
  });
}

function drawTrash(ctx, cx, cy) {
  ctx.fillStyle = '#7a7f8a';
  ctx.beginPath(); ctx.moveTo(cx - 34, cy - 34); ctx.lineTo(cx + 34, cy - 34); ctx.lineTo(cx + 26, cy + 40); ctx.lineTo(cx - 26, cy + 40); ctx.closePath(); ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#565b66';
  ctx.stroke();
  ctx.fillStyle = '#565b66';
  ctx.fillRect(cx - 40, cy - 42, 80, 10);
  text(ctx, 'BUANG', cx, cy + 6, 15, '#fff', '800');
}

function drawIngredients(ctx, state) {
  const r = LAYOUT.ingredients;
  drawPanel(ctx, r);
  text(ctx, 'BAHAN — KLIK UNTUK MENGAMBIL (TOMBOL 1–6)', r.x + 16, r.y + 18, 15, '#9c7a4a', '800', 'left');
  INGREDIENT_ORDER.forEach((id, i) => {
    const b = ingredientRect(i);
    const hover = state.hoverId === `ingredient:${id}`;
    rr(ctx, b.x, b.y + 26, b.w, b.h - 26, 12);
    ctx.fillStyle = hover ? '#fffdf6' : '#f3e6c8';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = hover ? PALETTE.accent : '#d9c39a';
    ctx.stroke();
    drawFoodIcon(ctx, id, b.x + b.w / 2, b.y + 68, 30);
    text(ctx, INGREDIENTS[id].name, b.x + b.w / 2, b.y + 108, 17, PALETTE.ink);
    rr(ctx, b.x + 10, b.y + 32, 24, 24, 6);
    ctx.fillStyle = PALETTE.ink;
    ctx.fill();
    text(ctx, String(i + 1), b.x + 22, b.y + 45, 14, '#fff6e3');
  });
}

function drawBottom(ctx, state) {
  const r = LAYOUT.bottom;
  drawPanel(ctx, r, 'rgba(20,10,6,0.85)', 'rgba(255,246,227,0.25)');
  // hand slot
  rr(ctx, r.x + 16, r.y + 18, 150, 94, 12);
  ctx.fillStyle = 'rgba(255,246,227,0.12)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,246,227,0.4)';
  ctx.stroke();
  text(ctx, 'DI TANGAN', r.x + 91, r.y + 32, 12, '#d8c9a8', '800');
  if (state.hand) {
    drawFoodIcon(ctx, state.hand.id, r.x + 91, r.y + 66, 26);
    text(ctx, itemName(state.hand.id), r.x + 91, r.y + 100, 13, '#fff6e3', '700');
  } else {
    text(ctx, 'kosong', r.x + 91, r.y + 66, 16, '#9c8a6e');
  }
  // toast / hint
  const hint = state.toastT > 0 ? state.toast : 'Klik bahan, olah di dapur, sajikan ke pelanggan sebelum kesabarannya habis.';
  text(ctx, hint, r.x + 190, r.y + 52, 20, state.toastT > 0 ? PALETTE.gold : '#fff6e3', '700', 'left');
  text(ctx, 'Klik: ambil / taruh  •  1–6: bahan  •  P: jeda  •  M: suara  •  Esc: buang isi tangan', r.x + 190, r.y + 92, 15, '#cbb894', '700', 'left');
}

function drawTitle(ctx, state, now) {
  drawKitchenWall(ctx, now);
  const cx = VIEW_W / 2;
  drawFoodIcon(ctx, 'nasi-goreng', cx - 130, 118, 34);
  drawFoodIcon(ctx, 'sate-ayam', cx + 130, 118, 34);
  text(ctx, 'DAPUR NGEBUL', cx, 190, 76, '#fff6e3', '800');
  text(ctx, 'Warung cepat saji paling sibuk sedunia — masak, sajikan, jangan sampai hangus!', cx, 240, 22, PALETTE.gold);
  const panel = { x: cx - 420, y: 290, w: 840, h: 260 };
  drawPanel(ctx, panel);
  text(ctx, 'CARA MAIN', panel.x + 24, panel.y + 26, 18, '#9c7a4a', '800', 'left');
  const steps = [
    ['1', 'Ambil bahan dari counter bawah (klik / tombol 1–6).'],
    ['2', 'Cincang ayam & sayur di talenan, masak nasi/mie di wajan, panggang sate.'],
    ['3', 'Rakit hidangan di Meja Saji — Gado-Gado = sayur cincang + bumbu.'],
    ['4', 'Klik pelanggan dengan hidangan yang benar sebelum kesabarannya habis!'],
  ];
  steps.forEach(([n, s], i) => {
    const y = panel.y + 66 + i * 44;
    ctx.fillStyle = PALETTE.accent;
    ctx.beginPath(); ctx.arc(panel.x + 44, y, 17, 0, Math.PI * 2); ctx.fill();
    text(ctx, n, panel.x + 44, y + 1, 18, '#fff', '800');
    text(ctx, s, panel.x + 74, y, 18, PALETTE.ink, '700', 'left');
  });
  text(ctx, 'Shift 150 detik  •  3 pelanggan pergi = dapur tutup  •  Combo menaikkan tip!', cx, panel.y + 232, 16, '#9c7a4a');
  rr(ctx, START_BUTTON.x, START_BUTTON.y, START_BUTTON.w, START_BUTTON.h, 16);
  ctx.fillStyle = state.hoverId === 'start' ? '#f06a3a' : PALETTE.accent;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#7e2a10';
  ctx.stroke();
  text(ctx, 'MULAI MASAK', cx, START_BUTTON.y + 38, 28, '#fff', '800');
  text(ctx, 'atau tekan Enter', cx, START_BUTTON.y + 96, 15, '#d8c9a8');
}

function drawPaused(ctx, state) {
  ctx.fillStyle = 'rgba(20,10,6,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'JEDA', VIEW_W / 2, VIEW_H / 2 - 30, 64, '#fff6e3', '800');
  text(ctx, 'Tekan P atau klik untuk lanjut', VIEW_W / 2, VIEW_H / 2 + 30, 22, PALETTE.gold);
}

function drawGameOver(ctx, state) {
  ctx.fillStyle = 'rgba(20,10,6,0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const panel = { x: VIEW_W / 2 - 360, y: 130, w: 720, h: 440 };
  drawPanel(ctx, panel);
  text(ctx, 'SHIFT SELESAI', VIEW_W / 2, panel.y + 44, 30, PALETTE.ink, '800');
  text(ctx, state.overReason, VIEW_W / 2, panel.y + 80, 17, '#9c7a4a');
  text(ctx, rankTitle(state.coins), VIEW_W / 2, panel.y + 128, 30, PALETTE.accent, '800');
  const rows = [
    ['Koin didapat', `$${state.coins}`],
    ['Hidangan tersaji', `${state.served}`],
    ['Pelanggan pergi', `${state.walkouts}`],
    ['Combo terbaik', `x${state.bestCombo}`],
  ];
  rows.forEach(([label, value], i) => {
    const y = panel.y + 178 + i * 40;
    text(ctx, label, panel.x + 60, y, 20, PALETTE.ink, '700', 'left');
    text(ctx, value, panel.x + panel.w - 60, y, 20, PALETTE.ink, '800', 'right');
  });
  rr(ctx, AGAIN_BUTTON.x, AGAIN_BUTTON.y, AGAIN_BUTTON.w, AGAIN_BUTTON.h, 16);
  ctx.fillStyle = state.hoverId === 'again' ? '#f06a3a' : PALETTE.accent;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#7e2a10';
  ctx.stroke();
  text(ctx, 'MASAK LAGI', VIEW_W / 2, AGAIN_BUTTON.y + 38, 26, '#fff', '800');
  text(ctx, 'atau tekan Enter', VIEW_W / 2, AGAIN_BUTTON.y + 96, 15, '#d8c9a8');
}

export function draw(ctx, state, now) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (state.screen === 'title') {
    drawTitle(ctx, state, now);
    return;
  }
  drawKitchenWall(ctx, now);
  drawHud(ctx, state);
  drawOrders(ctx, state, now);
  drawStations(ctx, state, now);
  drawIngredients(ctx, state);
  drawBottom(ctx, state);
  if (state.screen === 'paused') drawPaused(ctx, state);
  if (state.screen === 'over') drawGameOver(ctx, state);
}
