// The checker (step 2): one test per rule in docs/FORMAT.md.
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { NO_NAMES, checkFile, countsLine, problemsForAi, type ExistingNames } from '../src/check/checker.ts';
import type { Part } from '../src/shared/format.ts';
import { readProjectFile } from './helpers.ts';

const ALL: Part[] = ['designSystem', 'svgs', 'components', 'screens', 'prototype'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const example = (): Any => JSON.parse(readProjectFile('examples/example.json'));

function check(data: unknown, ticked: Part[] = ALL, existing: Partial<ExistingNames> = {}) {
  return checkFile(data, ticked, { ...NO_NAMES, ...existing });
}
const errors = (data: unknown, ticked?: Part[], existing?: Partial<ExistingNames>) => check(data, ticked, existing).problems.filter((p) => p.kind === 'error');
const warnings = (data: unknown, ticked?: Part[], existing?: Partial<ExistingNames>) => check(data, ticked, existing).problems.filter((p) => p.kind === 'warning');

/** A small valid file to change one thing at a time. */
function small(): Any {
  return {
    format: 'dropkit/0.1',
    designSystem: {
      modes: ['Light', 'Dark'],
      colors: { 'brand/500': '#4F46E5', 'bg/primary': { Light: '#FFFFFF', Dark: '#000000' }, 'button/bg': 'brand/500' },
      spacing: { 'space/2': 8 },
      textStyles: { Body: { font: 'Inter', weight: 400, size: 17 } },
    },
    components: [
      {
        name: 'Button',
        props: { Label: { type: 'text', default: 'Go' }, 'Show icon': { type: 'boolean', default: false } },
        variants: { Style: ['Primary', 'Secondary'] },
        base: {
          type: 'frame',
          layout: 'row',
          gap: 'space/2',
          fill: 'button/bg',
          children: [{ type: 'text', name: 'Label', text: 'Go', textStyle: 'Body', textProp: 'Label' }],
        },
        rules: [{ when: { Style: 'Secondary' }, set: { self: { fill: 'bg/primary' } } }],
      },
    ],
    screens: [
      {
        name: 'Home',
        width: 393,
        height: 852,
        fill: 'bg/primary',
        children: [{ type: 'instance', name: 'Go button', component: 'Button', variant: { Style: 'Primary' }, props: { Label: 'Start' }, x: 20, y: 20 }],
      },
      { name: 'Next', width: 393, height: 852 },
    ],
    prototype: { start: 'Home', links: [{ from: 'Home', layer: 'Go button', on: 'tap', action: 'navigate', to: 'Next' }] },
  };
}

describe('checker: the example files', () => {
  it('example.json has no problems at all', () => {
    assert.deepEqual(check(example()).problems, []);
  });

  it('example.json counts what will be built', () => {
    assert.equal(countsLine(check(example()).counts), '18 variables · 1 gradient · 4 text styles · 2 effects · 3 SVGs · 3 components (8 variants) · 2 screens · 5 links');
  });

  it('broken-missing-component.json gives exactly one error, about “Text field”', () => {
    const errs = errors(JSON.parse(readProjectFile('examples/broken-missing-component.json')));
    assert.equal(errs.length, 1);
    assert.match(errs[0].message, /^Screen “New task” uses component “Text field”, which isn’t in the file or the JSON\. This screen will be skipped\./);
    assert.equal(errs[0].where, 'Screen “New task” › Task name field');
  });

  it('the small test file has no problems', () => {
    assert.deepEqual(check(small()).problems, []);
  });
});

describe('checker: file and format', () => {
  it('a file that isn’t one { } block can’t be built', () => {
    const result = check([1, 2]);
    assert.deepEqual(result.skipped, ['file']);
    assert.deepEqual(result.buildable, []);
  });

  it('a missing "format" is a warning', () => {
    const d = small();
    delete d.format;
    assert.match(warnings(d)[0].message, /no "format"/);
  });

  it('another format version is a warning', () => {
    const d = small();
    d.format = 'dropkit/0.2';
    assert.match(warnings(d)[0].message, /this plugin reads dropkit\/0.1/);
  });

  it('unknown keys are warnings, with a guess for typos', () => {
    const d = small();
    d.screen = [];
    d.screens[0].colour = 'red';
    const w = warnings(d).map((p) => p.message);
    assert.ok(w.some((m) => /The file has “screen”.*Did you mean “screens”\?/.test(m)), w.join('\n'));
    assert.ok(w.some((m) => /Screen “Home” has “colour”.*ignored/.test(m)), w.join('\n'));
  });
});

describe('checker: ticked boxes vs the file', () => {
  it('an unticked part in the file is a warning (the mockup’s exact words for prototype)', () => {
    const w = warnings(small(), ['designSystem', 'components', 'screens']);
    assert.deepEqual(
      w.map((p) => p.message),
      ['The file has prototype links, but Prototype & animations isn’t ticked. Links won’t be built.'],
    );
  });

  it('a ticked part missing from the file is simply skipped', () => {
    const result = check({ format: 'dropkit/0.1', screens: [{ name: 'A', width: 10, height: 10 }] });
    assert.deepEqual(result.problems, []);
    assert.deepEqual(result.buildable, ['screens']);
  });

  it('an unticked part can be used when it’s already in the Figma file', () => {
    const existing = {
      colorVariables: ['brand/500', 'bg/primary', 'button/bg'],
      numberVariables: ['space/2'],
      textStyles: ['Body'],
      components: [{ name: 'Button', variants: { Style: ['Primary', 'Secondary'] }, props: { Label: 'text' as const } }],
    };
    assert.deepEqual(errors(small(), ['screens', 'prototype'], existing), []);
  });

  it('an unticked part that isn’t in the Figma file is an error for what uses it', () => {
    const errs = errors(small(), ['screens']);
    assert.match(errs[0].message, /uses colour or gradient “bg\/primary”, which is in the JSON but isn’t in the file yet, and Design system isn’t ticked/);
  });

  it('unticked parts aren’t checked', () => {
    const d = small();
    d.components[0].base.type = 'nope';
    assert.deepEqual(errors(d, ['designSystem']), []);
  });
});

describe('checker: design system', () => {
  it('colours with modes must use the same mode names', () => {
    const d = small();
    d.designSystem.colors['bg/x'] = { Light: '#FFFFFF', Dim: '#000000' };
    assert.match(errors(d)[0].message, /Colour “bg\/x” has no value for “Dark” and has “Dim”, which isn’t one of the modes/);
  });

  it('a colour that isn’t a colour', () => {
    const d = small();
    d.designSystem.colors['brand/500'] = '#12345';
    assert.match(errors(d)[0].message, /isn’t a colour. Write colours as #RRGGBB or #RRGGBBAA/);
  });

  it('a link to a colour that doesn’t exist', () => {
    const d = small();
    d.designSystem.colors['button/bg'] = 'brand/600';
    assert.match(errors(d)[0].message, /Colour “button\/bg” uses colour “brand\/600”, which isn’t in the file or the JSON/);
  });

  it('colours that link in a circle', () => {
    const d = small();
    d.designSystem.colors.a = 'b';
    d.designSystem.colors.b = 'a';
    assert.ok(errors(d).some((p) => /links to colours that link back to it/.test(p.message)));
  });

  it('a skipped colour skips what uses it, in one problem', () => {
    const d = small();
    d.designSystem.colors['bg/primary'] = 'nope';
    const errs = errors(d);
    assert.equal(errs.length, 1);
    assert.match(errs[0].message, /Also skipped, because they use it: Component “Button”, Screen “Home”, the prototype start and Link 1 from “Home”\./);
  });

  it('gradients need a type and at least 2 stops between 0 and 1', () => {
    const d = small();
    d.designSystem.gradients = { G: { type: 'conic', stops: [{ color: '#000000', at: 2 }] } };
    const messages = errors(d).map((p) => p.message);
    assert.ok(messages.some((m) => /needs "type": "linear", "radial" or "angular"/.test(m)));
    assert.ok(messages.some((m) => /needs at least 2 "stops"/.test(m)));
  });

  it('numbers must be numbers', () => {
    const d = small();
    d.designSystem.spacing['space/2'] = '8px';
    assert.match(errors(d)[0].message, /Token “space\/2” must be a number of px/);
  });

  it('text styles need font, weight and size', () => {
    const d = small();
    d.designSystem.textStyles.Body = { font: 'Inter', weight: 950 };
    const messages = errors(d).map((p) => p.message);
    assert.ok(messages.some((m) => /"weight" from 100 to 900/.test(m)));
    assert.ok(messages.some((m) => /needs a "size"/.test(m)));
  });

  it('a font that isn’t installed is a warning: text falls back to Inter', () => {
    const d = small();
    d.designSystem.textStyles.Body.font = 'Nope Sans';
    const w = warnings(d, ALL, { fonts: [{ family: 'Inter', style: 'Regular' }] });
    assert.match(w[0].message, /uses the font “Nope Sans”, which isn’t installed. Its text will fall back to Inter/);
  });

  it('a weight the font doesn’t have is a warning, naming the style used', () => {
    const d = small();
    d.designSystem.textStyles.Body.weight = 600;
    const w = warnings(d, ALL, { fonts: [{ family: 'Inter', style: 'Regular' }, { family: 'Inter', style: 'Bold' }] });
    assert.match(w[0].message, /has no weight 600 installed. It will use “Bold”/);
  });

  it('effects need a known type', () => {
    const d = small();
    d.designSystem.effects = { E: [{ type: 'glow' }], S: [{ type: 'dropShadow' }] };
    const messages = errors(d).map((p) => p.message);
    assert.ok(messages.some((m) => /Effect “E”: each effect needs "type"/.test(m)));
    assert.ok(messages.some((m) => /Effect “S”: a shadow needs a "color"/.test(m)));
  });
});

describe('checker: SVGs', () => {
  const svg = (s: string) => ({ ...small(), svgs: [{ name: 'Icon/x', svg: s }] });

  it('needs a viewBox', () => {
    assert.match(errors(svg("<svg xmlns='http://www.w3.org/2000/svg'><path d='M0 0'/></svg>"))[0].message, /has no viewBox/);
  });

  it('rejects scripts and embedded images', () => {
    assert.match(errors(svg("<svg viewBox='0 0 1 1'><script>alert(1)</script></svg>"))[0].message, /script/);
    assert.match(errors(svg("<svg viewBox='0 0 1 1' onload='x()'></svg>"))[0].message, /script/);
    assert.match(errors(svg("<svg viewBox='0 0 1 1'><image href='data:image/png;base64,AAAA'/></svg>"))[0].message, /embedded image/);
  });

  it('duplicate SVG names', () => {
    const d = small();
    d.svgs = [
      { name: 'Icon/x', svg: "<svg viewBox='0 0 1 1'></svg>" },
      { name: 'Icon/x', svg: "<svg viewBox='0 0 1 1'></svg>" },
    ];
    assert.match(errors(d)[0].message, /two SVGs named “Icon\/x”/);
  });
});

describe('checker: components', () => {
  it('a rule changing a layer that isn’t there', () => {
    const d = small();
    d.components[0].rules[0].set.Icon = { visible: true };
    assert.match(errors(d)[0].message, /a rule changes layer “Icon”, which isn’t in the component/);
  });

  it('a rule with a variant value that doesn’t exist', () => {
    const d = small();
    d.components[0].rules[0].when = { Style: 'Tertiary' };
    assert.match(errors(d)[0].message, /uses “Style=Tertiary”, but “Style” is “Primary” or “Secondary”/);
  });

  it('textProp, visibleProp and swapProp must match a prop of the right kind', () => {
    const d = small();
    d.components[0].base.children[0].textProp = 'Show icon';
    assert.match(errors(d)[0].message, /“Show icon”, but that prop is a boolean prop, not a text prop/);
    const e = small();
    e.components[0].base.children[0].textProp = 'Title';
    assert.match(errors(e)[0].message, /has "textProp": "Title", but the component has no such prop/);
  });

  it('a prop and a variant with the same name', () => {
    const d = small();
    d.components[0].props.Style = { type: 'text', default: 'x' };
    assert.ok(errors(d).some((p) => /“Style” is both a prop and a variant/.test(p.message)));
  });

  it('skip that leaves nothing', () => {
    const d = small();
    d.components[0].skip = [{ Style: 'Primary' }, { Style: 'Secondary' }];
    assert.ok(errors(d).some((p) => /"skip" leaves no variants/.test(p.message)));
  });

  it('a component that contains itself', () => {
    const d = small();
    d.components[0].base.children.push({ type: 'instance', component: 'Button' });
    assert.ok(errors(d).some((p) => /can’t contain an instance of itself|contains itself/.test(p.message)));
  });

  it('an unknown layer type', () => {
    const d = small();
    d.components[0].base.children[0].type = 'txt';
    assert.match(errors(d)[0].message, /has a layer with "type": "txt".*Did you mean “text”\?/);
  });
});

describe('checker: hug and fill', () => {
  it('"fill" outside auto layout is a warning', () => {
    const d = small();
    d.screens[0].children[0].width = 'fill';
    assert.match(warnings(d)[0].message, /"fill" only works inside a parent with "layout"/);
  });

  it('"hug" on a frame without layout is a warning', () => {
    const d = small();
    d.screens[0].children.push({ type: 'frame', name: 'Box', width: 'hug' });
    assert.match(warnings(d)[0].message, /"hug" only works on frames with "layout" and on text/);
  });

  it('"fill" inside auto layout and "hug" on text are fine', () => {
    const d = small();
    d.components[0].base.children[0].width = 'fill';
    d.components[0].base.children[0].height = 'hug';
    assert.deepEqual(check(d).problems, []);
  });
});

describe('checker: screens and instances', () => {
  it('screens need a size', () => {
    const d = small();
    delete d.screens[1].width;
    assert.match(errors(d)[0].message, /Screen “Next” needs "width"/);
  });

  it('a mode that isn’t one of the modes is a warning', () => {
    const d = small();
    d.screens[0].mode = 'Dim';
    assert.match(warnings(d)[0].message, /uses mode “Dim”, which isn’t one of the modes.*first mode/);
  });

  it('an instance with a variant or prop the component doesn’t have', () => {
    const d = small();
    d.screens[0].children[0].variant = { Size: 'Large' };
    d.screens[0].children[0].props = { Title: 'x' };
    const messages = errors(d).map((p) => p.message);
    assert.ok(messages.some((m) => /picks variant “Size”, but component “Button” has no such variant. It has “Style”/.test(m)));
    assert.ok(messages.some((m) => /sets prop “Title”, but component “Button” has no such prop. It has “Label” and “Show icon”/.test(m)));
  });

  it('a boolean prop set to text', () => {
    const d = small();
    d.screens[0].children[0].props = { 'Show icon': 'yes' };
    assert.match(errors(d)[0].message, /sets “Show icon” to "yes"; it must be true or false/);
  });

  it('duplicate screen names', () => {
    const d = small();
    d.screens.push({ name: 'Home', width: 1, height: 1 });
    assert.ok(errors(d).some((p) => /two screens named “Home”/.test(p.message)));
  });
});

describe('checker: prototype', () => {
  it('a link from a layer that isn’t on the screen', () => {
    const d = small();
    d.prototype.links[0].layer = 'Missing button';
    assert.match(errors(d)[0].message, /screen “Home” has no layer “Missing button”/);
  });

  it('a link to a screen that doesn’t exist', () => {
    const d = small();
    d.prototype.links[0].to = 'Nowhere';
    assert.match(errors(d)[0].message, /uses screen “Nowhere”, which isn’t in the file or the JSON/);
  });

  it('a link to a screen already in the Figma file is fine', () => {
    const d = small();
    d.prototype.links[0].to = 'Settings';
    assert.deepEqual(errors(d, ALL, { screens: ['Settings'] }), []);
  });

  it('values that aren’t allowed', () => {
    const d = small();
    Object.assign(d.prototype.links[0], { on: 'click', transition: 'fade', easing: 'smooth' });
    assert.match(errors(d)[0].message, /"on": "click"; use “tap”/);
    const w = warnings(d).map((p) => p.message);
    assert.ok(w.some((m) => /"transition" is "fade"/.test(m)));
    assert.ok(w.some((m) => /"easing" is "smooth"/.test(m)));
  });

  it('afterDelay needs a delay', () => {
    const d = small();
    d.prototype.links[0].on = 'afterDelay';
    assert.match(errors(d)[0].message, /needs "delay" in ms/);
  });

  it('component links need variants that exist', () => {
    const d = small();
    d.prototype.componentLinks = [{ component: 'Button', from: { Style: 'Primary' }, to: { Style: 'Ghost' } }];
    assert.match(errors(d)[0].message, /"to" uses “Style=Ghost”/);
  });

  it('the start screen must exist', () => {
    const d = small();
    d.prototype.start = 'Splash';
    assert.match(errors(d)[0].message, /The prototype start uses screen “Splash”/);
  });
});

describe('Copy problems for your AI', () => {
  it('starts with the agreed sentence and lists every problem', () => {
    const d = small();
    d.prototype.start = 'Splash';
    delete d.format;
    const text = problemsForAi(check(d).problems);
    assert.ok(text.startsWith('The Figma plugin found these problems in my JSON file. Please fix them and send me the whole corrected file.\n\n'));
    assert.match(text, /2. Warning: The file has no "format"/);
    assert.match(text, /1. Error: The prototype start uses screen “Splash”.*\n {3}Where: Prototype › start/);
  });
});
