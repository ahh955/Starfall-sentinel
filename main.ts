// Starfall Sentinel's entrypoint (Node 22, standard library only).
//
// The game itself is plain static files under game/; this program is only the
// courier that hands them in. It copies game/ and screenshots/ from beside
// this file into the output directory, then writes dossier.json there — the
// summary the judge reads — using make.fun's own library from vendor/.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The grader sets no MAKEFUN_OUTPUT_DIR and the output lands in /output.
// Play the game locally first with `node serve.ts` (http://localhost:8080).

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(name: string): void {
  const source = join(repoRoot, name);
  const target = join(outputDir, name);
  mkdirSync(target, { recursive: true });
  if (existsSync(source)) cpSync(source, target, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyTree('game');
copyTree('screenshots');

// The caps come from the competition's gate: the text cap shapes the dossier,
// the rest make this program refuse exactly where the scorer would — more
// than 4 screenshots, one over 256 KiB, or a game/ past 993 entries, 48 MiB
// or a 1000-byte path.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outputDir, 'dossier.json'), dossier);
