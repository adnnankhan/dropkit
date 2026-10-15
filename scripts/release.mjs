// Makes release/dropkit-v<version>.zip: manifest.json + dist/, ready to import in Figma
// (Plugins → Development → Import plugin from manifest). Run with `npm run release`,
// then attach the zip to a GitHub Release. No zip library: a small writer is enough.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zip } from './zip.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const FILES = ['manifest.json', 'dist/code.js', 'dist/ui.html'];

for (const file of FILES) {
  if (!existsSync(join(root, file))) throw new Error(`${file} is missing. Run npm run build first.`);
}

const out = join(root, 'release');
mkdirSync(out, { recursive: true });
const file = join(out, `dropkit-v${version}.zip`);
writeFileSync(file, zip(FILES.map((name) => ({ name: `dropkit/${name}`, data: readFileSync(join(root, name)) }))));
console.log(`Made ${file}`);
