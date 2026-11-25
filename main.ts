// Dapur Ngebul — hand-in program (Node 22, standard library only).
// Copies this repository's game/ and screenshots/ into the output directory
// and writes dossier.json with make.fun's vendored library, exactly as the
// gate rebuilds it. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for
// /output, so `MAKEFUN_OUTPUT_DIR=out node main.ts` writes ./out.
//
// The program is deterministic: the same repository always writes the same
// bytes, so the grader's two runs agree.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');

mkdirSync(outputDir, { recursive: true });
cpSync(gameDir, join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// Caps from the competition's gate: only text_max_bytes shapes the dossier
// bytes; the rest refuse an entry the scorer would refuse anyway.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outputDir, 'dossier.json'), dossier);
