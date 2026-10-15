// Builds dist/code.js (the plugin) and dist/ui.html (the window, with CSS and JS inlined).
// `node scripts/build.mjs --watch` rebuilds when a source file changes.
import * as esbuild from 'esbuild';
import { mkdirSync, readFileSync, watch, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildInstructions } from './instructions.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const at = (...parts) => join(root, ...parts);

async function build() {
  mkdirSync(at('dist'), { recursive: true });

  await esbuild.build({
    entryPoints: [at('src/code.ts')],
    outfile: at('dist/code.js'),
    bundle: true,
    format: 'iife',
    target: 'es2017',
    logLevel: 'warning',
  });

  const ui = await esbuild.build({
    entryPoints: [at('src/ui/main.ts')],
    bundle: true,
    write: false,
    format: 'iife',
    target: 'es2020',
    define: { __INSTRUCTIONS__: JSON.stringify(buildInstructions(root)) },
    logLevel: 'warning',
  });

  // A "</script" inside the JS would end the inlined script early.
  const js = ui.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const css = readFileSync(at('src/ui/styles.css'), 'utf8');
  // Function replacers, so "$" in the code is never read as a pattern.
  const html = readFileSync(at('src/ui/index.html'), 'utf8')
    .replace('/* INLINE_CSS */', () => css)
    .replace('/* INLINE_JS */', () => js);
  writeFileSync(at('dist/ui.html'), html);
}

await build();
console.log('Built dist/code.js and dist/ui.html');

if (process.argv.includes('--watch')) {
  let timer;
  for (const dir of ['src', 'instructions', 'docs', 'examples']) {
    watch(at(dir), { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        build().then(
          () => console.log('Rebuilt', new Date().toLocaleTimeString()),
          (error) => console.error(error.message),
        );
      }, 100);
    });
  }
  console.log('Watching for changes…');
}
