// End to end: the real window (dist/ui.html, in a simulated browser) talking to the real
// plugin (dist/code.js), which builds into the strict mock Figma.
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { runInNewContext } from 'node:vm';
import { JSDOM } from 'jsdom';
import { buildInstructions } from '../scripts/instructions.mjs';
import { readProjectFile, root } from './helpers.ts';
import { createMockFigma, type MockFigma } from './mock-figma.ts';

const html = readProjectFile('dist/ui.html');
const code = readProjectFile('dist/code.js');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

interface Options {
  /** What document.execCommand('copy') returns. Figma allows it; false acts like a browser that blocks it. */
  selectCopyWorks?: boolean;
  /** Whether navigator.clipboard.writeText works. Figma's window usually blocks it. */
  clipboardApiWorks?: boolean;
  mock?: MockFigma;
}

function openWindow({ selectCopyWorks = true, clipboardApiWorks = false, mock = createMockFigma() }: Options = {}) {
  const copied: string[] = [];
  const toPlugin: Any[] = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.document.execCommand = (command: string) => {
        if (command !== 'copy' || !selectCopyWorks) return false;
        const area = window.document.querySelector<HTMLTextAreaElement>('textarea[aria-hidden="true"]');
        copied.push(area?.value ?? '');
        return true;
      };
      Object.defineProperty(window.navigator, 'clipboard', {
        value: {
          async writeText(text: string) {
            if (!clipboardApiWorks) throw new Error('NotAllowedError');
            copied.push(text);
          },
        },
      });
      // The window talks to the plugin through parent.postMessage …
      Object.defineProperty(window, 'parent', {
        value: {
          postMessage(data: Any) {
            toPlugin.push(data.pluginMessage);
            setTimeout(() => (mock.figma.ui as Any).onmessage?.(data.pluginMessage), 0);
          },
        },
      });
    },
  });
  const { window } = dom;
  // … and the plugin answers with figma.ui.postMessage.
  (mock.figma.ui as Any).postMessage = (message: unknown) => {
    setTimeout(() => window.dispatchEvent(new window.MessageEvent('message', { data: { pluginMessage: message } })), 0);
  };
  runInNewContext(code, { figma: mock.figma, __html__: '', console });

  const document = window.document;
  const $ = <T extends HTMLElement>(selector: string) => document.querySelector(selector) as T;
  const visible = (id: string) => !$(`#${id}`).hidden;
  const button = () => $<HTMLButtonElement>('#main-button');
  const text = (selector: string) => $(selector).textContent!.replace(/\s+/g, ' ').trim();
  const click = (selector: string) => $(selector).click();
  const boxes = () => Array.from(document.querySelectorAll<HTMLInputElement>('input[name="part"]'));
  const visibleLink = (label: string) => {
    const link = Array.from(document.querySelectorAll('a')).find((a) => a.textContent === label && !a.closest('[hidden]'));
    assert.ok(link, `a visible "${label}" link`);
    return link as HTMLAnchorElement;
  };
  const paste = (value: string) => {
    const box = $<HTMLTextAreaElement>('#json-paste');
    box.value = value;
    box.dispatchEvent(new window.Event('input', { bubbles: true }));
  };
  const file = (name: string, content: string) => new window.File([content], name, { type: 'application/json' });
  const drop = (dropped: File) => {
    const event = new window.Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { files: [dropped] } });
    $('#drop-zone').dispatchEvent(event);
  };
  const choose = (chosen: File) => {
    const input = $<HTMLInputElement>('#file-input');
    Object.defineProperty(input, 'files', { value: [chosen], configurable: true });
    input.dispatchEvent(new window.Event('change', { bubbles: true }));
  };
  const until = async (check: () => boolean, what = 'condition') => {
    for (let i = 0; i < 400 && !check(); i++) await new Promise((resolve) => setTimeout(resolve, 5));
    assert.ok(check(), `waited too long for ${what}`);
  };
  /** Drops a file and waits for the check result. */
  const dropAndCheck = async (name: string, content: string) => {
    drop(file(name, content));
    await until(() => visible('view-error') || (visible('view-read') && $('#checking').hidden), 'the check');
  };
  return { window, document, $, visible, button, text, click, boxes, visibleLink, paste, file, drop, choose, until, dropAndCheck, copied, toPlugin, mock };
}

const example = readProjectFile('examples/example.json');
const brokenSyntax = readProjectFile('examples/broken-syntax.json');
const brokenComponent = readProjectFile('examples/broken-missing-component.json');

describe('window: opening (state 1)', () => {
  it('opens a 360 × 720 window that follows the Figma theme', () => {
    const w = openWindow();
    assert.deepEqual({ ...w.mock.calls.showUI[0].options }, { width: 360, height: 720, themeColors: true });
  });

  it('shows the 5 boxes, all ticked except Prototype & animations', () => {
    const w = openWindow();
    assert.deepEqual(
      w.boxes().map((box) => box.parentElement!.textContent!.trim()),
      ['Design system', 'Components', 'Screens', 'SVGs', 'Prototype & animations'],
    );
    assert.deepEqual(w.boxes().map((box) => box.checked), [true, true, true, true, false]);
  });

  it('shows the drop zone and a disabled "Add a file to build"', () => {
    const w = openWindow();
    assert.ok(w.visible('view-empty'));
    assert.ok(!w.visible('view-paste') && !w.visible('view-read') && !w.visible('view-error') && !w.visible('view-building') && !w.visible('view-done'));
    assert.equal(w.button().textContent, 'Add a file to build');
    assert.ok(w.button().disabled);
  });

  it('uses the exact words from the mockup', () => {
    const w = openWindow();
    const words = w.text('#setup');
    for (const phrase of ['Instructions for your AI', 'Copy these into any AI with your design idea. It will write the JSON file for you.', 'Copy instructions', 'Open as web page', 'What to build', 'JSON file', 'Drop a .json file here', 'Choose file', 'Paste JSON instead']) {
      assert.ok(words.includes(phrase), phrase);
    }
  });

  it('"Open as web page" opens the instructions page in the browser', async () => {
    const w = openWindow();
    w.visibleLink('Open as web page').click();
    await w.until(() => w.mock.calls.opened.length === 1, 'openExternal');
    assert.deepEqual(w.mock.calls.opened, ['https://adnnankhan.github.io/dropkit/']);
  });
});

describe('window: checking (states 3 and 4)', () => {
  it('example.json with Prototype unticked: one warning, Build 4 parts', async () => {
    const w = openWindow();
    await w.dropAndCheck('example.json', example);
    assert.equal(w.text('[data-file-name]'), 'example.json');
    assert.equal(w.text('#problems-title'), '1 problem found');
    assert.equal(w.text('#problem-list'), 'The file has prototype links, but Prototype & animations isn’t ticked. Links won’t be built.');
    assert.equal(w.$('#problem-list svg').getAttribute('aria-label'), 'Warning');
    assert.equal(w.button().textContent, 'Build 4 parts');
    assert.ok(!w.button().disabled);
  });

  it('ticking Prototype checks again: no problems, the counts, Build 5 parts', async () => {
    const w = openWindow();
    await w.dropAndCheck('example.json', example);
    w.boxes()[4].click();
    await w.until(() => !w.$('#result-ok').hidden, 'the new check');
    assert.equal(w.text('#result-ok h2'), 'No problems found');
    assert.equal(w.text('#counts'), '18 variables · 1 gradient · 4 text styles · 2 effects · 3 SVGs · 3 components (8 variants) · 2 screens · 5 links');
    assert.equal(w.button().textContent, 'Build 5 parts');
  });

  it('broken-missing-component.json: the error and the warning, as in mockup 4', async () => {
    const w = openWindow();
    await w.dropAndCheck('tasks-app.json', brokenComponent);
    assert.equal(w.text('#problems-title'), '2 problems found');
    const rows = Array.from(w.document.querySelectorAll('#problem-list li'));
    assert.equal(rows[0].querySelector('svg')!.getAttribute('aria-label'), 'Error');
    assert.equal(rows[1].querySelector('svg')!.getAttribute('aria-label'), 'Warning');
    assert.equal(rows[0].textContent, 'Screen “New task” uses component “Text field”, which isn’t in the file or the JSON. This screen will be skipped.');
    assert.equal(w.button().textContent, 'Build 4 parts');
    assert.ok(!w.button().disabled, 'errors only skip their item');
  });

  it('"Copy problems for your AI" copies every problem with the agreed first line', async () => {
    const w = openWindow();
    await w.dropAndCheck('tasks-app.json', brokenComponent);
    w.click('#copy-problems');
    await w.until(() => w.copied.length === 1, 'the copy');
    assert.ok(w.copied[0].startsWith('The Figma plugin found these problems in my JSON file. Please fix them and send me the whole corrected file.\n\n1. Error: '));
    assert.match(w.copied[0], /1\. Error: Screen “New task” uses component “Text field”/);
    assert.match(w.copied[0], /2\. Warning: The file has prototype links/);
  });

  it('a file that isn’t a { } block: "Fix the file to build"', async () => {
    const w = openWindow();
    await w.dropAndCheck('list.json', '[1, 2]');
    assert.equal(w.button().textContent, 'Fix the file to build');
    assert.ok(w.button().disabled);
  });

  it('nothing ticked: "Nothing to build"', async () => {
    const w = openWindow();
    await w.dropAndCheck('example.json', example);
    w.boxes().slice(0, 4).forEach((box) => box.click());
    await w.until(() => w.button().textContent === 'Nothing to build', 'the new check');
    assert.ok(w.button().disabled);
  });
});

describe('window: building (states 5 and 6)', () => {
  it('builds example.json and shows the report', async () => {
    const w = openWindow();
    await w.dropAndCheck('example.json', example);
    w.boxes()[4].click();
    await w.until(() => w.button().textContent === 'Build 5 parts' && !w.button().disabled, 'the new check');
    w.click('#main-button');
    assert.ok(w.visible('view-building'), 'the building view');
    assert.equal(w.text('#building-title'), 'Building example.json');
    assert.equal(w.text('#stop-button'), 'Stop after this step');
    await w.until(() => w.visible('view-done'), 'the build');
    assert.equal(w.text('#done-title'), 'Built 5 parts');
    assert.equal(w.text('#done-subtitle'), 'From example.json · nothing skipped');
    const rows = Array.from(w.document.querySelectorAll('#report-list > li')).map((li) => [
      li.querySelector('.part-name')!.textContent,
      li.querySelector('.part-detail')!.textContent,
      li.querySelector('.show-link')?.textContent,
    ]);
    assert.deepEqual(rows, [
      ['Design system', '18 variables · 1 gradient · 4 text styles · 2 effects', 'Show'],
      ['SVGs', '3 icons', 'Show'],
      ['Components', '3 components · 8 variants', 'Show'],
      ['Screens', '2 screens', 'Show'],
      ['Prototype & animations', '5 links', 'Show'],
    ]);
    assert.ok(w.mock.page('Screens'), 'a Screens page');
  });

  it('"Show" selects and zooms to what was built', async () => {
    const w = openWindow();
    await w.dropAndCheck('example.json', example);
    w.click('#main-button');
    await w.until(() => w.visible('view-done'), 'the build');
    const show = w.document.querySelector<HTMLAnchorElement>('[data-part="screens"]')!;
    show.click();
    await w.until(() => w.mock.calls.zoomed.length === 1, 'the zoom');
    assert.deepEqual([...w.mock.calls.zoomed[0]].map((n: Any) => n.name), ['Tasks', 'New task']);
  });

  it('"Copy report" copies the report as text, and "Build another file" keeps the boxes', async () => {
    const w = openWindow();
    w.boxes()[0].click(); // untick Design system
    await w.dropAndCheck('tasks-app.json', brokenComponent);
    w.click('#main-button');
    await w.until(() => w.visible('view-done'), 'the build');
    assert.match(w.text('#done-subtitle'), /From tasks-app\.json · \d+ items skipped/);
    w.click('#copy-report');
    await w.until(() => w.copied.length === 1, 'the copy');
    assert.match(w.copied[0], /^Dropkit report: Built 3 parts/);
    // Design system is unticked and the file is empty, so whatever uses its colours is skipped.
    assert.match(w.copied[0], /Skipped: Screen “New task” uses colour or gradient “bg\/primary”, which is in the JSON but isn’t in the file yet, and Design system isn’t ticked/);
    w.click('#build-another');
    assert.ok(w.visible('view-empty'));
    assert.deepEqual(w.boxes().map((box) => box.checked), [false, true, true, true, false]);
  });

  it('a second build of the same file builds nothing new', async () => {
    const mock = createMockFigma();
    for (const round of [1, 2]) {
      const w = openWindow({ mock });
      await w.dropAndCheck('example.json', example);
      w.click('#main-button');
      await w.until(() => w.visible('view-done'), 'the build');
      if (round === 2) {
        assert.equal(w.text('#done-title'), 'Nothing new to build');
        assert.match(w.text('#report-list'), /Components\s*3 already in file/);
      }
    }
  });
});

describe('window: paste (state 2)', () => {
  it('"Paste JSON instead" opens the paste box, "Use a file instead" goes back', () => {
    const w = openWindow();
    w.visibleLink('Paste JSON instead').click();
    assert.ok(w.visible('view-paste') && !w.visible('view-empty'));
    assert.equal(w.document.activeElement, w.$('#json-paste'));
    assert.equal(w.button().textContent, 'Check JSON');
    assert.ok(w.button().disabled, 'nothing to check yet');
    w.paste('{}');
    assert.ok(!w.button().disabled);
    w.visibleLink('Use a file instead').click();
    assert.ok(w.visible('view-empty') && !w.visible('view-paste'));
  });

  it('"Check JSON" reads and checks valid text, named "Pasted JSON"', async () => {
    const w = openWindow();
    w.visibleLink('Paste JSON instead').click();
    w.paste(example);
    w.click('#main-button');
    await w.until(() => w.visible('view-read') && w.$('#checking').hidden, 'the check');
    assert.equal(w.text('#view-read [data-file-name]'), 'Pasted JSON');
    assert.equal(w.button().textContent, 'Build 4 parts');
  });

  it('"Check JSON" on broken text shows state 7 with the line and reason', () => {
    const w = openWindow();
    w.visibleLink('Paste JSON instead').click();
    w.paste(brokenSyntax);
    w.click('#main-button');
    assert.ok(w.visible('view-error'));
    assert.equal(w.text('#view-error [data-file-name]'), 'Pasted JSON');
    assert.equal(w.text('#error-message'), 'Line 60: a comma is missing after “radius/md”. Nothing was checked yet.');
    assert.equal(w.button().textContent, 'Fix the file to build');
    assert.ok(w.button().disabled);
  });

  it('keeps the pasted text after removing the file, so it can be fixed', () => {
    const w = openWindow();
    w.visibleLink('Paste JSON instead').click();
    w.paste('{"a": 1');
    w.click('#main-button');
    w.click('#view-error [data-action="remove-file"]');
    assert.ok(w.visible('view-empty'));
    w.visibleLink('Paste JSON instead').click();
    assert.equal(w.$<HTMLTextAreaElement>('#json-paste').value, '{"a": 1');
  });
});

describe('window: adding a file', () => {
  it('dropping broken-syntax.json shows state 7', async () => {
    const w = openWindow();
    await w.dropAndCheck('broken-syntax.json', brokenSyntax);
    assert.equal(w.text('#view-error [data-file-name]'), 'broken-syntax.json');
    assert.equal(w.text('#error-message'), 'Line 60: a comma is missing after “radius/md”. Nothing was checked yet.');
    assert.equal(w.text('#view-error .problem-title'), 'Can’t read this file');
  });

  it('"Choose file" opens the file picker, and a chosen file is read', async () => {
    const w = openWindow();
    let opened = false;
    w.$<HTMLInputElement>('#file-input').click = () => {
      opened = true;
    };
    w.click('#choose-file');
    assert.ok(opened);
    w.choose(w.file('example.json', example));
    await w.until(() => w.visible('view-read'), 'the read');
    assert.equal(w.text('#view-read [data-file-name]'), 'example.json');
  });

  it('the remove button goes back to the drop zone', async () => {
    const w = openWindow();
    await w.dropAndCheck('example.json', example);
    w.click('#view-read [data-action="remove-file"]');
    assert.ok(w.visible('view-empty') && !w.visible('view-read') && !w.visible('view-read-result'));
    assert.equal(w.button().textContent, 'Add a file to build');
  });
});

describe('window: copying', () => {
  const instructions = buildInstructions(root);

  it('"Copy instructions" copies the bundled text and says "Copied"', async () => {
    const w = openWindow();
    w.click('#copy-instructions');
    await w.until(() => w.copied.length === 1);
    assert.equal(w.copied[0], instructions);
    await w.until(() => w.text('#copy-instructions .button-text') === 'Copied');
  });

  it('falls back to the clipboard API when select-and-copy is blocked', async () => {
    const w = openWindow({ selectCopyWorks: false, clipboardApiWorks: true });
    w.click('#copy-instructions');
    await w.until(() => w.copied.length === 1);
    assert.equal(w.copied[0], instructions);
  });

  it('says "Couldn’t copy" when both ways are blocked', async () => {
    const w = openWindow({ selectCopyWorks: false, clipboardApiWorks: false });
    w.click('#copy-instructions');
    await w.until(() => w.text('#copy-instructions .button-text') === 'Couldn’t copy');
  });

  it('"Copy error for your AI" copies the error with a request to fix it', async () => {
    const w = openWindow();
    await w.dropAndCheck('broken-syntax.json', brokenSyntax);
    w.click('#copy-error');
    await w.until(() => w.copied.length === 1);
    assert.equal(
      w.copied[0],
      'The Figma plugin can’t read my JSON file: Line 60: a comma is missing after “radius/md”. Please fix it and send me the whole corrected file.',
    );
  });
});
