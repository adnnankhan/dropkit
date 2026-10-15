// Builds the public pages into site/ (step 5), published with GitHub Pages:
//   index.html        the instructions: the same text as "Copy instructions"
//   instructions.txt  that text exactly, for AIs and for copying
//   help.html         how to use Dropkit and where to get help
//   privacy.html      listing/PRIVACY.md
// Everything comes from the same files as the plugin, so they never drift apart.
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { INSTRUCTION_FILES, buildInstructions } from './instructions.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const at = (...parts) => join(root, ...parts);
const out = at('site');
const read = (file) => readFileSync(at(file), 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n');

export const REPO = 'https://github.com/adnnankhan/dropkit';
const ISSUES = `${REPO}/issues`;

function page({ title, file, body, intro = '' }) {
  const nav = [
    ['index.html', 'Instructions'],
    ['help.html', 'Help'],
    ['privacy.html', 'Privacy'],
  ]
    .map(([href, label]) => `<a href="${href}"${href === file ? ' aria-current="page"' : ''}>${label}</a>`)
    .join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="icon" href="icon.svg" type="image/svg+xml">
<style>${CSS}</style>
</head>
<body>
<header class="top">
  <a class="brand" href="index.html"><img src="icon.svg" alt="" width="24" height="24">Dropkit</a>
  <nav>${nav}</nav>
</header>
<main>
${intro}
<article>
${body}
</article>
</main>
<footer class="foot">Dropkit is a plugin for Figma. Help and bug reports: <a href="${ISSUES}">GitHub Issues</a>.</footer>
${file === 'index.html' ? `<script>${COPY_SCRIPT}</script>` : ''}
</body>
</html>
`;
}

const CSS = `
:root { --bg:#fff; --text:#1e1e1e; --muted:#6b6b6b; --line:#e6e6e6; --soft:#f5f5f5; --link:#0a6cc2; --brand:#0a6cc2; --on-brand:#fff; color-scheme: light; }
@media (prefers-color-scheme: dark) { :root { --bg:#2c2c2c; --text:#fff; --muted:#b3b3b3; --line:#444; --soft:#383838; --link:#7cc4ff; color-scheme: dark; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.6 Inter, system-ui, -apple-system, "Segoe UI", sans-serif; }
a { color: var(--link); }
.top { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding: 16px; border-bottom: 1px solid var(--line); max-width: 880px; margin: 0 auto; }
.brand { display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--text); text-decoration: none; }
.top nav { display: flex; gap: 16px; }
.top nav a[aria-current] { font-weight: 600; color: var(--text); text-decoration: none; }
main { max-width: 880px; margin: 0 auto; padding: 24px 16px 48px; }
.intro { padding: 16px; border: 1px solid var(--line); border-radius: 8px; background: var(--soft); margin-bottom: 32px; }
.intro p { margin: 0 0 12px; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
button { height: 36px; padding: 0 14px; border: 0; border-radius: 6px; background: var(--brand); color: var(--on-brand); font: 500 14px Inter, system-ui, sans-serif; cursor: pointer; }
h1 { font-size: 28px; line-height: 1.25; margin: 0 0 16px; }
h2 { font-size: 21px; margin: 40px 0 12px; padding-top: 16px; border-top: 1px solid var(--line); }
h3 { font-size: 17px; margin: 28px 0 8px; }
code { font: 0.9em ui-monospace, "SF Mono", Menlo, Consolas, monospace; background: var(--soft); padding: 1px 4px; border-radius: 4px; }
pre { background: var(--soft); border: 1px solid var(--line); border-radius: 8px; padding: 12px 14px; overflow-x: auto; font-size: 13px; line-height: 1.5; }
pre code { background: none; padding: 0; }
table { border-collapse: collapse; width: 100%; display: block; overflow-x: auto; font-size: 14px; margin: 12px 0; }
th, td { border: 1px solid var(--line); padding: 6px 10px; text-align: left; vertical-align: top; }
th { background: var(--soft); }
hr { border: 0; border-top: 1px solid var(--line); margin: 32px 0; }
.foot { max-width: 880px; margin: 0 auto; padding: 24px 16px 40px; color: var(--muted); font-size: 14px; border-top: 1px solid var(--line); }
`;

// The page's own copy button: fetches the plain text so it's exactly what the plugin copies.
const COPY_SCRIPT = `
document.getElementById('copy').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const text = await (await fetch('instructions.txt')).text();
  try { await navigator.clipboard.writeText(text); button.textContent = 'Copied'; }
  catch { button.textContent = 'Couldn’t copy. Open the plain text instead.'; }
  setTimeout(() => { button.textContent = 'Copy instructions'; }, 2000);
});
`;

export function buildSite() {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  const text = buildInstructions(root);
  writeFileSync(join(out, 'instructions.txt'), text);

  // The same three files, in the same order, rendered for reading.
  const [instructions, format] = INSTRUCTION_FILES.slice(0, 2).map(read);
  const example = read(INSTRUCTION_FILES[2]).trim();
  const markdown = [instructions.replace(/<!--[\s\S]*?-->\n*/g, '').trim(), format.trim(), '## Example file\n\n```json\n' + example + '\n```'].join('\n\n');
  const intro = `<section class="intro">
<p>Copy these instructions into any AI (Claude, ChatGPT, Gemini…) together with your design idea. It writes a JSON file; drop that file into the Dropkit plugin in Figma.</p>
<div class="actions"><button type="button" id="copy">Copy instructions</button><a href="instructions.txt">Plain text, for AIs</a></div>
</section>`;
  writeFileSync(join(out, 'index.html'), page({ title: 'Dropkit: instructions for your AI', file: 'index.html', intro, body: marked.parse(markdown) }));

  writeFileSync(join(out, 'help.html'), page({ title: 'Dropkit: help', file: 'help.html', body: marked.parse(HELP) }));
  writeFileSync(join(out, 'privacy.html'), page({ title: 'Dropkit: privacy policy', file: 'privacy.html', body: marked.parse(read('listing/PRIVACY.md')) }));
  copyFileSync(at('listing/icon/dropkit-icon.svg'), join(out, 'icon.svg'));
  writeFileSync(join(out, '.nojekyll'), '');
  return out;
}

const HELP = `# Help

Dropkit builds a design in the open Figma file from one JSON file: a design system, components, screens, SVG icons and prototype links.

## How to use it

1. In Dropkit, press **Copy instructions**, or copy them from [the instructions page](index.html).
2. Paste them into any AI with your design idea. It writes the JSON file. You can also write the file yourself.
3. In Figma, open Dropkit, tick what you want to build, and drop the file (or paste it).
4. Dropkit checks the file first. If it finds problems, press **Copy problems for your AI**, paste them into the AI, and drop the corrected file.
5. Press **Build**. A broken item is skipped and listed in the report; everything else is built. Running the same file again doesn't duplicate anything.

## Good to know

- Dropkit has no AI inside and no internet connection. Nothing you drop in is sent anywhere.
- On Figma's free plan, colours are built with one mode only, because Figma allows one mode per collection on that plan.
- Fonts in your file must be installed on your computer. If one isn't, its text uses Inter.

## Install it from GitHub

1. Download the latest release zip from [GitHub Releases](${REPO}/releases) and unzip it.
2. In the Figma desktop app: **Plugins → Development → Import plugin from manifest**, and pick \`manifest.json\` from the unzipped folder.
3. Run it from **Plugins → Development → Dropkit**. This works in the desktop app only, and updates aren't automatic.

## Get help or report a bug

Open an issue on [GitHub Issues](${ISSUES}). Say what you did, what you expected and what happened. If you can, attach the JSON file and the copied report.
`;

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('build-site.mjs')) {
  console.log(`Built the site in ${buildSite()}`);
}
