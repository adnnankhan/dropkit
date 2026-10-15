// The plugin window (dist/ui.html), run in a simulated browser.
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { JSDOM } from 'jsdom';
import { buildInstructions } from '../scripts/instructions.mjs';
import { readProjectFile, root } from './helpers.ts';

const html = readProjectFile('dist/ui.html');

interface Options {
  /** What document.execCommand('copy') returns. Figma allows it; false acts like a browser that blocks it. */
  selectCopyWorks?: boolean;
  /** Whether navigator.clipboard.writeText works. Figma's window usually blocks it. */
  clipboardApiWorks?: boolean;
}

function openWindow({ selectCopyWorks = true, clipboardApiWorks = false }: Options = {}) {
  const copied: string[] = [];
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
    },
  });
  const { window } = dom;
  const document = window.document;
  const $ = <T extends HTMLElement>(selector: string) => document.querySelector(selector) as T;
  const visible = (id: string) => !$(`#${id}`).hidden;
  const button = () => $<HTMLButtonElement>('#main-button');
  const click = (selector: string) => $(selector).click();
  const visibleLink = (text: string) => {
    const link = Array.from(document.querySelectorAll('a')).find((a) => a.textContent === text && !a.closest('[hidden]'));
    assert.ok(link, `a visible "${text}" link`);
    return link as HTMLAnchorElement;
  };
  const paste = (text: string) => {
    const box = $<HTMLTextAreaElement>('#json-paste');
    box.value = text;
    box.dispatchEvent(new window.Event('input', { bubbles: true }));
  };
  const file = (name: string, text: string) => new window.File([text], name, { type: 'application/json' });
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
  const until = async (check: () => boolean) => {
    for (let i = 0; i < 200 && !check(); i++) await new Promise((resolve) => setTimeout(resolve, 5));
    assert.ok(check(), 'waited too long');
  };
  return { window, document, $, visible, button, click, visibleLink, paste, file, drop, choose, until, copied };
}

const example = readProjectFile('examples/example.json');
const brokenSyntax = readProjectFile('examples/broken-syntax.json');

describe('window: opening (state 1)', () => {
  it('shows the 5 boxes, all ticked except Prototype & animations', () => {
    const w = openWindow();
    const boxes = Array.from(w.document.querySelectorAll<HTMLInputElement>('input[name="part"]'));
    assert.deepEqual(
      boxes.map((box) => box.parentElement!.textContent!.trim()),
      ['Design system', 'Components', 'Screens', 'SVGs', 'Prototype & animations'],
    );
    assert.deepEqual(boxes.map((box) => box.checked), [true, true, true, true, false]);
  });

  it('shows the drop zone and a disabled "Add a file to build"', () => {
    const w = openWindow();
    assert.ok(w.visible('view-empty'));
    assert.ok(!w.visible('view-paste') && !w.visible('view-read') && !w.visible('view-error'));
    assert.equal(w.button().textContent, 'Add a file to build');
    assert.ok(w.button().disabled);
  });

  it('uses the exact words from the mockup', () => {
    const w = openWindow();
    const text = w.document.body.textContent!.replace(/\s+/g, ' ');
    for (const words of ['Instructions for your AI', 'Copy these into any AI with your design idea. It will write the JSON file for you.', 'Copy instructions', 'Open as web page', 'What to build', 'JSON file', 'Drop a .json file here', 'Choose file', 'Paste JSON instead']) {
      assert.ok(text.includes(words), words);
    }
  });

  it('"Open as web page" is a placeholder that goes nowhere yet', () => {
    const w = openWindow();
    const link = w.visibleLink('Open as web page');
    const event = new w.window.MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    assert.ok(event.defaultPrevented);
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

  it('"Check JSON" reads valid text: shows "Pasted JSON" and keeps Build disabled', () => {
    const w = openWindow();
    w.visibleLink('Paste JSON instead').click();
    w.paste(example);
    w.click('#main-button');
    assert.ok(w.visible('view-read') && w.visible('view-read-result'));
    assert.equal(w.$('#view-read [data-file-name]').textContent, 'Pasted JSON');
    assert.equal(w.$('#view-read-result').textContent!.trim(), 'File read. Checking comes in step 2.');
    assert.equal(w.button().textContent, 'Build 4 parts');
    assert.ok(w.button().disabled);
  });

  it('"Check JSON" on broken text shows state 7 with the line and reason', () => {
    const w = openWindow();
    w.visibleLink('Paste JSON instead').click();
    w.paste(brokenSyntax);
    w.click('#main-button');
    assert.ok(w.visible('view-error'));
    assert.equal(w.$('#view-error [data-file-name]').textContent, 'Pasted JSON');
    assert.equal(w.$('#error-message').textContent, 'Line 60: a comma is missing after “radius/md”. Nothing was checked yet.');
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
  it('dropping example.json shows its name and "File read"', async () => {
    const w = openWindow();
    w.drop(w.file('example.json', example));
    await w.until(() => w.visible('view-read'));
    assert.equal(w.$('#view-read [data-file-name]').textContent, 'example.json');
    assert.equal(w.button().textContent, 'Build 4 parts');
    assert.ok(w.button().disabled);
    assert.ok(w.visibleLink('Paste JSON instead'));
  });

  it('dropping broken-syntax.json shows state 7', async () => {
    const w = openWindow();
    w.drop(w.file('broken-syntax.json', brokenSyntax));
    await w.until(() => w.visible('view-error'));
    assert.equal(w.$('#view-error [data-file-name]').textContent, 'broken-syntax.json');
    assert.equal(w.$('#error-message').textContent, 'Line 60: a comma is missing after “radius/md”. Nothing was checked yet.');
    assert.equal(w.$('#view-error .problem-title').textContent, 'Can’t read this file');
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
    await w.until(() => w.visible('view-read'));
    assert.equal(w.$('#view-read [data-file-name]').textContent, 'example.json');
  });

  it('the remove button goes back to the drop zone', async () => {
    const w = openWindow();
    w.drop(w.file('example.json', example));
    await w.until(() => w.visible('view-read'));
    w.click('#view-read [data-action="remove-file"]');
    assert.ok(w.visible('view-empty') && !w.visible('view-read') && !w.visible('view-read-result'));
    assert.equal(w.button().textContent, 'Add a file to build');
  });

  it('the Build label counts the ticked boxes', async () => {
    const w = openWindow();
    w.drop(w.file('example.json', example));
    await w.until(() => w.visible('view-read'));
    const boxes = Array.from(w.document.querySelectorAll<HTMLInputElement>('input[name="part"]'));
    boxes[4].click();
    assert.equal(w.button().textContent, 'Build 5 parts');
    boxes.slice(0, 4).forEach((box) => box.click());
    assert.equal(w.button().textContent, 'Build 1 part');
    boxes[4].click();
    assert.equal(w.button().textContent, 'Build 0 parts');
    assert.ok(w.button().disabled);
  });
});

describe('window: copying', () => {
  const instructions = buildInstructions(root);

  it('"Copy instructions" copies the bundled text and says "Copied"', async () => {
    const w = openWindow();
    w.click('#copy-instructions');
    await w.until(() => w.copied.length === 1);
    assert.equal(w.copied[0], instructions);
    await w.until(() => w.$('#copy-instructions .button-text').textContent === 'Copied');
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
    await w.until(() => w.$('#copy-instructions .button-text').textContent === 'Couldn’t copy');
  });

  it('"Copy error for your AI" copies the error with a request to fix it', async () => {
    const w = openWindow();
    w.drop(w.file('broken-syntax.json', brokenSyntax));
    await w.until(() => w.visible('view-error'));
    w.click('#copy-error');
    await w.until(() => w.copied.length === 1);
    assert.equal(
      w.copied[0],
      'The Figma plugin can’t read my JSON file: Line 60: a comma is missing after “radius/md”. Please fix it and send me the whole corrected file.',
    );
  });
});
