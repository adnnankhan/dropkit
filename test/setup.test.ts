// The project setup: manifest, the plugin code, and the bundled instructions.
import { strict as assert } from 'node:assert';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { runInNewContext } from 'node:vm';
import { buildInstructions, INSTRUCTION_FILES } from '../scripts/instructions.mjs';
import { readProjectFile, root } from './helpers.ts';
import { createMockFigma } from './mock-figma.ts';

describe('manifest.json', () => {
  const manifest = JSON.parse(readProjectFile('manifest.json'));

  it('is named Dropkit, with no "Figma" or "Fig" in the name', () => {
    assert.equal(manifest.name, 'Dropkit');
    assert.doesNotMatch(manifest.name, /fig/i);
  });

  it('follows the rules in CLAUDE.md', () => {
    assert.deepEqual(manifest.editorType, ['figma']);
    assert.equal(manifest.documentAccess, 'dynamic-page');
    assert.deepEqual(manifest.networkAccess, { allowedDomains: ['none'] });
  });

  it('points at the built files', () => {
    assert.equal(manifest.main, 'dist/code.js');
    assert.equal(manifest.ui, 'dist/ui.html');
    assert.ok(existsSync(join(root, manifest.main)), 'run npm run build first');
    assert.ok(existsSync(join(root, manifest.ui)), 'run npm run build first');
  });
});

describe('plugin code', () => {
  const code = readProjectFile('dist/code.js');

  it('opens a 360 × 720 window that follows the Figma theme, and touches nothing else', () => {
    const mock = createMockFigma();
    runInNewContext(code, { figma: mock.figma, __html__: '<html></html>', setTimeout });
    assert.equal(mock.calls.showUI.length, 1);
    assert.equal(mock.calls.showUI[0].html, '<html></html>');
    // Spread copies the options out of the sandbox, so they compare as plain objects.
    assert.deepEqual({ ...mock.calls.showUI[0].options }, { width: 360, height: 720, themeColors: true });
  });

  it('the strict mock fails on anything it doesn’t know', () => {
    const { figma } = createMockFigma();
    assert.throws(() => (figma as unknown as { createSlice(): void }).createSlice(), /Mock Figma: figma.createSlice was used/);
  });

  it('has no eval or new Function, in the plugin or the window', () => {
    const ui = readProjectFile('dist/ui.html');
    for (const source of [code, ui]) {
      assert.doesNotMatch(source, /\beval\s*\(/);
      assert.doesNotMatch(source, /new\s+Function\s*\(/);
    }
  });

  it('makes no network requests from the window', () => {
    const ui = readProjectFile('dist/ui.html');
    assert.doesNotMatch(ui, /\bfetch\s*\(|XMLHttpRequest|WebSocket|<link[^>]+href=|<script[^>]+src=/);
  });
});

describe('Copy instructions text', () => {
  const text = buildInstructions(root);
  const instructions = readProjectFile(INSTRUCTION_FILES[0]);
  const format = readProjectFile(INSTRUCTION_FILES[1]).replace(/\r\n?/g, '\n').trim();
  const example = readProjectFile(INSTRUCTION_FILES[2]).replace(/\r\n?/g, '\n').trim();

  it('joins AI-INSTRUCTIONS.md, FORMAT.md and example.json, in that order', () => {
    assert.deepEqual(INSTRUCTION_FILES, ['instructions/AI-INSTRUCTIONS.md', 'docs/FORMAT.md', 'examples/example.json']);
    const start = text.indexOf('# Instructions for the AI');
    const formatAt = text.indexOf(format);
    const exampleAt = text.indexOf(example);
    assert.equal(start, 0);
    assert.ok(formatAt > start, 'FORMAT.md is in the text, after the instructions');
    assert.ok(exampleAt > formatAt, 'example.json is in the text, after FORMAT.md');
    assert.ok(text.trimEnd().endsWith(example));
  });

  it('leaves out the note for us at the top of AI-INSTRUCTIONS.md', () => {
    assert.match(instructions, /<!--/);
    assert.doesNotMatch(text, /<!--|This is the text behind/);
  });

  it('is bundled into the window', () => {
    const ui = readProjectFile('dist/ui.html');
    assert.ok(ui.includes(JSON.stringify(text).slice(1, 200)), 'the start of the text is in dist/ui.html');
    assert.ok(ui.includes('Dropkit JSON format v0.1'));
  });
});

describe('example files', () => {
  it('write strikethrough the way FORMAT.md says: "decoration": "strikethrough"', () => {
    for (const file of ['examples/example.json', 'examples/broken-syntax.json', 'examples/broken-missing-component.json']) {
      const text = readProjectFile(file);
      assert.doesNotMatch(text, /"strikethrough"\s*:/, file);
      assert.match(text, /"decoration"\s*:\s*"strikethrough"/, file);
    }
    assert.match(readProjectFile('docs/FORMAT.md'), /`decoration` is `underline` or `strikethrough`/);
  });
});

describe('instructions web page (step 5)', async () => {
  const { buildSite } = await import('../scripts/build-site.mjs');
  const { readFileSync } = await import('node:fs');
  const out = buildSite();
  const site = (file: string) => readFileSync(join(out, file), 'utf8');

  it('the plain text is exactly what "Copy instructions" copies', () => {
    assert.equal(site('instructions.txt'), buildInstructions(root));
  });

  it('the page shows the same three files', () => {
    const page = site('index.html');
    assert.match(page, /<h1[^>]*>Instructions for the AI<\/h1>/);
    assert.match(page, /<h1[^>]*>Dropkit JSON format v0.1<\/h1>/);
    assert.ok(page.includes('&quot;name&quot;: &quot;Example · Tasks app&quot;'), 'the example file');
    assert.doesNotMatch(page, /This is the text behind/);
  });

  it('has the privacy and help pages, pointing to GitHub Issues', () => {
    assert.match(site('privacy.html'), /Privacy policy — Dropkit/);
    assert.match(site('help.html'), /https:\/\/github.com\/adnnankhan\/dropkit\/issues/);
  });

  it('the plugin’s "Open as web page" points to the published page', () => {
    assert.ok(readProjectFile('dist/ui.html').includes('https://adnnankhan.github.io/dropkit/'));
  });
});

describe('release zip (step 6)', async () => {
  const { zip } = await import('../scripts/zip.mjs');
  const { inflateRawSync } = await import('node:zlib');

  it('makes a zip whose files unpack to the same bytes', () => {
    const files = [
      { name: 'dropkit/manifest.json', data: Buffer.from(readProjectFile('manifest.json')) },
      { name: 'dropkit/dist/ui.html', data: Buffer.from(readProjectFile('dist/ui.html')) },
    ];
    const archive = zip(files);
    assert.equal(archive.readUInt32LE(0), 0x04034b50, 'starts with a file header');
    assert.equal(archive.readUInt32LE(archive.length - 22), 0x06054b50, 'ends with the directory');
    assert.equal(archive.readUInt16LE(archive.length - 12), 2, 'two files');
    let at = 0;
    for (const file of files) {
      const size = archive.readUInt32LE(at + 18);
      const nameLength = archive.readUInt16LE(at + 26);
      assert.equal(archive.subarray(at + 30, at + 30 + nameLength).toString(), file.name);
      const data = inflateRawSync(archive.subarray(at + 30 + nameLength, at + 30 + nameLength + size));
      assert.ok(data.equals(file.data), file.name);
      at += 30 + nameLength + size;
    }
  });
});
