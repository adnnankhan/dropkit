// Makes the Figma Community cover and carousel images (1920 × 1080 PNG) in listing/media/.
// The pages in listing/media/src/ show the real plugin window (dist/ui.html) with real check
// and build results from examples/example.json, so the images stay true to the plugin.
// Needs Microsoft Edge or Google Chrome. Run: npm run build && npm run listing-images
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const at = (...parts) => join(root, ...parts);
const PAGES = ['cover', '1-instructions', '2-check', '3-build', '4-result', '5-trust'];

// 1. Real results from the checker and the builder (against the strict mock Figma).
const load = (file) => import(pathToFileURL(at(file)).href);
const { checkFile, NO_NAMES } = await load('src/check/checker.ts');
const { createMockFigma } = await load('test/mock-figma.ts');
const example = JSON.parse(readFileSync(at('examples/example.json'), 'utf8'));
const broken = JSON.parse(readFileSync(at('examples/broken-missing-component.json'), 'utf8'));
const four = ['designSystem', 'svgs', 'components', 'screens'];
const all = [...four, 'prototype'];
globalThis.figma = createMockFigma().figma;
const { build } = await load('src/plugin/build.ts');
let progress = null;
const report = await build(example, all, 'tasks-app.json', {
  shouldStop: () => false,
  onProgress: (fraction, rows) => {
    if (!progress && rows.some((r) => r.part === 'components' && r.status === 'active' && r.detail.includes('Task row'))) progress = { fraction, rows };
  },
});
writeFileSync(
  at('listing/media/src/data.json'),
  JSON.stringify({ ok: checkFile(example, all, NO_NAMES), broken: checkFile(broken, four, NO_NAMES), progress, report }),
);

// 2. Serve the project, so the pages can drive the plugin window (same origin).
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer((req, res) => {
  const path = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!path.startsWith(root) || !existsSync(path)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(readFileSync(path));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;

// 3. Screenshot each page at exactly 1920 × 1080, once the page says it's ready.
const { chromium } = await import('playwright-core');
const executablePath = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find((p) => p && existsSync(p));
if (!executablePath) throw new Error('Needs Microsoft Edge or Google Chrome (or set BROWSER to its path).');
const browser = await chromium.launch({ executablePath });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  for (const name of PAGES) {
    await page.goto(`http://127.0.0.1:${port}/listing/media/src/${name}.html`);
    await page.waitForSelector('body[data-ready="true"]', { timeout: 30000 });
    await page.screenshot({ path: at('listing/media', `${name}.png`) });
    console.log(`Made listing/media/${name}.png`);
  }
} finally {
  await browser.close();
  server.close();
}
