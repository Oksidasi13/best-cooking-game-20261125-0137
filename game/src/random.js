// random.js — one clear job: a tiny seeded random generator.
// The game reads ?seed= from the URL so a playtest or a screenshot run can
// replay the exact same customers, faces and spawn order.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seedParam) {
  const parsed = Number.parseInt(seedParam, 10);
  const seed = Number.isFinite(parsed) ? parsed : (Math.random() * 1e9) | 0;
  return { next: mulberry32(seed), seed };
}

// Pick one entry of `list` with the game's rng.
export function pick(rng, list) {
  return list[Math.floor(rng.next() * list.length)];
}

// A number in [min, max) from the game's rng.
export function range(rng, min, max) {
  return min + rng.next() * (max - min);
}
