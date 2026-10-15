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
    runInNewContext(code, { figma: mock.figma, __html__: '<html></html>' });
    assert.equal(mock.calls.showUI.length, 1);
    assert.equal(mock.calls.showUI[0].html, '<html></html>');
    // Spread copies the options out of the sandbox, so they compare as plain objects.
    assert.deepEqual({ ...mock.calls.showUI[0].options }, { width: 360, height: 720, themeColors: true });
  });

  it('the strict mock fails on anything it doesn’t know, like building on the canvas', () => {
    const { figma } = createMockFigma();
    assert.throws(() => figma.createFrame(), /Mock Figma: figma.createFrame was used/);
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
