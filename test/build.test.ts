// Building example.json (and friends) against the strict mock Figma.
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import type { Part } from '../src/shared/format.ts';
import type { Report } from '../src/shared/report.ts';
import { readProjectFile } from './helpers.ts';
import { createMockFigma, type MockFigma, type MockOptions } from './mock-figma.ts';

const ALL: Part[] = ['designSystem', 'svgs', 'components', 'screens', 'prototype'];
const example = () => JSON.parse(readProjectFile('examples/example.json'));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

async function runBuild(
  data: unknown,
  { ticked = ALL, mock = createMockFigma(), stopWhen }: { ticked?: Part[]; mock?: MockFigma; stopWhen?: (detail: string) => boolean } = {},
): Promise<{ mock: MockFigma; report: Report }> {
  (globalThis as Any).figma = mock.figma;
  const { build } = await import('../src/plugin/build.ts');
  let stop = false;
  const report = await build(data, ticked, 'example.json', {
    shouldStop: () => stop,
    onProgress: (_fraction, rows) => {
      if (stopWhen && rows.some((r) => r.status === 'active' && stopWhen(r.detail))) stop = true;
    },
  });
  return { mock, report };
}

const withMock = (options: MockOptions) => createMockFigma(options);
const part = (report: Report, p: Part) => report.parts.find((x) => x.part === p)!;
const byName = (mock: MockFigma, name: string, type?: string): Any =>
  [...mock.nodes.values()].find((n) => !n._removed && !n._dead && n._name === name && (!type || n.type === type));
const variable = (mock: MockFigma, name: string): Any => mock.variables.find((v) => v.name === name);

describe('build: example.json, all five parts', async () => {
  const { mock, report } = await runBuild(example());

  it('builds every part with nothing skipped and no warnings', () => {
    assert.deepEqual(report.parts.map((p) => p.part), ALL);
    for (const p of report.parts) {
      assert.ok(p.reached, p.part);
      assert.deepEqual(p.skipped, [], `${p.part} skipped: ${JSON.stringify(p.skipped)}`);
      assert.deepEqual(p.warnings, [], `${p.part} warnings: ${JSON.stringify(p.warnings)}`);
    }
    assert.equal(report.stopped, false);
    assert.equal(part(report, 'designSystem').summary, '18 variables · 1 gradient · 4 text styles · 2 effects');
    assert.equal(part(report, 'svgs').summary, '3 icons');
    assert.equal(part(report, 'components').summary, '3 components · 8 variants');
    assert.equal(part(report, 'screens').summary, '2 screens');
    assert.equal(part(report, 'prototype').summary, '5 links');
  });

  it('colours: a Colors collection with Light and Dark, and links as aliases', () => {
    const colors = mock.collections.find((c) => c.name === 'Colors');
    assert.deepEqual(colors.modes.map((m: Any) => m.name), ['Light', 'Dark']);
    const [light, dark] = colors.modes.map((m: Any) => m.modeId);
    const bg = variable(mock, 'bg/primary');
    assert.deepEqual(bg.valuesByMode[light], { r: 1, g: 1, b: 1, a: 1 });
    assert.equal(Math.round(bg.valuesByMode[dark].r * 255), 0x0e);
    const button = variable(mock, 'button/primary/bg');
    assert.deepEqual(button.valuesByMode[light], { type: 'VARIABLE_ALIAS', id: variable(mock, 'brand/500').id });
    assert.equal(variable(mock, 'border/hairline').valuesByMode[light].a.toFixed(2), (0x1a / 255).toFixed(2));
  });

  it('spacing, radius and sizes: number variables in their own collections', () => {
    for (const [name, collection, value] of [['space/4', 'Spacing', 16], ['radius/md', 'Radius', 12], ['size/touch', 'Sizes', 44]] as const) {
      const v = variable(mock, name);
      const c = mock.collections.find((x) => x.name === collection);
      assert.equal(v.variableCollectionId, c.id, name);
      assert.equal(v.valuesByMode[c.defaultModeId], value, name);
    }
    assert.equal(mock.variables.length, 18);
  });

  it('gradient: a colour style with its first stop linked to brand/500', () => {
    const style = mock.styles.find((s) => s.name === 'Brand/Sunrise');
    const paint = style.paints[0];
    assert.equal(paint.type, 'GRADIENT_LINEAR');
    assert.deepEqual(paint.gradientTransform, [[1, 0, 0], [0, 1, 0]]); // 90° runs left to right
    assert.equal(paint.gradientStops[0].boundVariables.color.id, variable(mock, 'brand/500').id);
    assert.equal(paint.gradientStops[1].boundVariables, undefined);
  });

  it('text styles: fonts picked from the weight', () => {
    const title = mock.styles.find((s) => s.name === 'Title');
    assert.deepEqual(title.fontName, { family: 'Inter', style: 'Bold' });
    assert.equal(title.fontSize, 28);
    assert.deepEqual(title.lineHeight, { unit: 'PIXELS', value: 34 });
    assert.deepEqual(title.letterSpacing, { unit: 'PIXELS', value: -0.5 });
    assert.deepEqual(mock.styles.find((s) => s.name === 'Headline').fontName, { family: 'Inter', style: 'Semi Bold' });
  });

  it('effects: shadows don’t show behind see-through fills (lesson 5)', () => {
    const glass = mock.styles.find((s) => s.name === 'Glass/Bar');
    assert.deepEqual(glass.effects.map((e: Any) => e.type), ['BACKGROUND_BLUR', 'DROP_SHADOW']);
    assert.equal(glass.effects[1].showShadowBehindNode, false);
    assert.equal(glass.effects[0].radius, 24);
  });

  it('SVGs: three icon components on the Components page, coloured with text/primary', () => {
    const page = mock.page('Components');
    for (const name of ['Icon/check', 'Icon/plus', 'Icon/chevron-left']) {
      const icon = byName(mock, name, 'COMPONENT');
      assert.ok(icon, name);
      assert.equal(icon.parent, page);
      const vector = icon._children[0];
      assert.equal(vector._strokes[0].boundVariables.color.id, variable(mock, 'text/primary').id);
      assert.deepEqual(vector._fills, []);
      assert.deepEqual(vector.constraints, { horizontal: 'SCALE', vertical: 'SCALE' });
    }
  });

  it('Button: a set of 4 variants with props, each variant built fresh', () => {
    const set = byName(mock, 'Button', 'COMPONENT_SET');
    assert.deepEqual(set._children.map((c: Any) => c._name), ['Style=Primary, Size=Large', 'Style=Primary, Size=Small', 'Style=Secondary, Size=Large', 'Style=Secondary, Size=Small']);
    const defs = set.componentPropertyDefinitions;
    const key = (name: string) => Object.keys(defs).find((k) => k.split('#')[0] === name)!;
    assert.equal(defs[key('Label')].type, 'TEXT');
    assert.equal(defs[key('Show icon')].type, 'BOOLEAN');
    assert.equal(defs[key('Icon')].type, 'INSTANCE_SWAP');
    assert.equal(defs[key('Icon')].defaultValue, byName(mock, 'Icon/plus', 'COMPONENT').id);
    assert.deepEqual(defs.Style.variantOptions, ['Primary', 'Secondary']);
    for (const variant of set._children) {
      const [icon, label] = variant._children;
      assert.deepEqual(label._refs, { characters: key('Label') }, `${variant._name} label`);
      assert.deepEqual(icon._refs, { visible: key('Show icon'), mainComponent: key('Icon') }, `${variant._name} icon`);
      assert.equal(variant.layoutSizingHorizontal, 'HUG');
    }
    const secondary = set._children[2];
    assert.equal(secondary._fills[0].boundVariables.color.id, variable(mock, 'bg/secondary').id);
    assert.equal(secondary._children[1]._fills[0].boundVariables.color.id, variable(mock, 'text/primary').id);
    const small = set._children[1];
    assert.equal(small.height, 44);
    assert.equal(small.boundVariables.height.id, variable(mock, 'size/touch').id);
    assert.equal(small.boundVariables.paddingLeft.id, variable(mock, 'space/4').id);
  });

  it('Task row: the Done variant uses the Checked=On checkbox and a strikethrough title', () => {
    const set = byName(mock, 'Task row', 'COMPONENT_SET');
    const done = set._children.find((c: Any) => c._name === 'State=Done');
    const [checkbox, title] = done._children;
    assert.deepEqual(checkbox.variantProperties, { Checked: 'On' });
    assert.equal(title.textDecoration, 'STRIKETHROUGH');
    assert.equal(title.layoutSizingHorizontal, 'FILL');
  });

  it('screens: two frames left to right on the Screens page', () => {
    const page = mock.page('Screens');
    const tasks = byName(mock, 'Tasks', 'FRAME');
    const newTask = byName(mock, 'New task', 'FRAME');
    assert.equal(tasks.parent, page);
    assert.equal(newTask.parent, page);
    assert.ok(newTask.x >= tasks.x + 393);
    assert.equal(tasks.width, 393);
    assert.equal(tasks.height, 852);
  });

  it('screens: mixed text, the gradient and instances with props', () => {
    const summary = byName(mock, 'Summary', 'TEXT');
    assert.equal(summary.characters, '1 of 2 tasks done');
    assert.ok(summary._ranges.some((r: Any) => r.start === 13 && r.end === 17 && r.textStyleId === mock.styles.find((s) => s.name === 'Headline').id));
    const fill = byName(mock, 'Progress fill', 'RECTANGLE');
    assert.equal(fill.fillStyleId, mock.styles.find((s) => s.name === 'Brand/Sunrise').id);
    const add = byName(mock, 'Add task button', 'INSTANCE');
    assert.equal(add.width, 353);
    const label = add._children.find((c: Any) => c._name === 'Label');
    assert.equal(label.characters, 'Add task');
    const rows = byName(mock, 'Task list', 'FRAME');
    assert.equal(rows.layoutSizingVertical, 'HUG');
    assert.deepEqual(rows._children.map((c: Any) => c.layoutSizingHorizontal), ['FILL', 'FILL']);
  });

  it('prototype: links with transitions, back, smart animate and checkbox toggles', () => {
    const add = byName(mock, 'Add task button', 'INSTANCE');
    const [reaction] = add.reactions;
    assert.equal(reaction.trigger.type, 'ON_CLICK');
    assert.deepEqual(reaction.actions[0], {
      type: 'NODE',
      destinationId: byName(mock, 'New task', 'FRAME').id,
      navigation: 'NAVIGATE',
      transition: { type: 'PUSH', direction: 'LEFT', matchLayers: false, easing: { type: 'EASE_OUT' }, duration: 0.3 },
    });
    assert.deepEqual(byName(mock, 'Back button', 'INSTANCE').reactions[0].actions, [{ type: 'BACK' }]);
    assert.equal(byName(mock, 'Save button', 'INSTANCE').reactions[0].actions[0].transition.type, 'SMART_ANIMATE');
    const set = byName(mock, 'Checkbox', 'COMPONENT_SET');
    const [off, on] = set._children;
    assert.equal(off.reactions[0].actions[0].navigation, 'CHANGE_TO');
    assert.equal(off.reactions[0].actions[0].destinationId, on.id);
    assert.equal(on.reactions[0].actions[0].destinationId, off.id);
    assert.equal(off.reactions[0].actions[0].transition.easing.type, 'GENTLE');
    assert.deepEqual(mock.page('Screens').flowStartingPoints, [{ nodeId: byName(mock, 'Tasks', 'FRAME').id, name: 'Tasks' }]);
  });

  it('running the same file again builds nothing new (lesson 12)', async () => {
    const counts = () => ({ variables: mock.variables.length, styles: mock.styles.length, nodes: [...mock.nodes.values()].filter((n) => !n._removed).length });
    const before = counts();
    const again = await runBuild(example(), { mock });
    assert.deepEqual(counts(), before);
    for (const p of again.report.parts) {
      assert.deepEqual(p.built, [], `${p.part} built again`);
      assert.deepEqual(p.skipped, []);
    }
    assert.equal(part(again.report, 'components').alreadyInFile.length, 3);
    assert.equal(part(again.report, 'prototype').alreadyInFile.length, 6);
    assert.equal(byName(mock, 'Add task button', 'INSTANCE').reactions.length, 1);
  });
});

describe('build: Figma’s free plan', () => {
  it('builds colours with the first mode only, with a warning, never a workaround', async () => {
    const { mock, report } = await runBuild(example(), { mock: withMock({ plan: 'free' }) });
    assert.deepEqual(mock.collections.find((c) => c.name === 'Colors').modes.map((m: Any) => m.name), ['Light']);
    assert.equal(mock.collections.filter((c) => /Colo/.test(c.name)).length, 1, 'no extra collections');
    assert.ok(part(report, 'designSystem').warnings.some((w) => /“Light” only.*“Dark” needs a paid Figma plan/.test(w)));
    assert.ok(byName(mock, 'Tasks', 'FRAME'));
  });

  it('a screen in a mode the file doesn’t have uses the first mode, with a warning', async () => {
    const data = example();
    data.screens[1].mode = 'Dark';
    const { report } = await runBuild(data, { mock: withMock({ plan: 'free' }) });
    assert.ok(part(report, 'screens').warnings.some((w) => /“New task” is set to “Dark”.*shows “Light”/.test(w)));
  });

  it('a screen in Dark mode shows Dark on a paid plan', async () => {
    const data = example();
    data.screens[1].mode = 'Dark';
    const { mock } = await runBuild(data);
    const colors = mock.collections.find((c) => c.name === 'Colors');
    assert.equal(byName(mock, 'New task', 'FRAME').explicitVariableModes[colors.id], colors.modes[1].modeId);
  });

  it('with 3 pages already, uses the current page and says so', async () => {
    const { mock, report } = await runBuild(example(), { mock: withMock({ plan: 'free', pages: ['Two', 'Three'] }) });
    assert.equal(byName(mock, 'Button', 'COMPONENT_SET').parent, mock.page('Page 1'));
    assert.ok(part(report, 'components').warnings.some((w) => /free plan allows 3 pages/.test(w)));
  });
});

describe('build: problems', () => {
  it('broken-missing-component.json: Tasks is built, New task and its links are skipped', async () => {
    const { mock, report } = await runBuild(JSON.parse(readProjectFile('examples/broken-missing-component.json')));
    assert.ok(byName(mock, 'Tasks', 'FRAME'));
    assert.equal(byName(mock, 'New task', 'FRAME'), undefined);
    const screens = part(report, 'screens');
    assert.deepEqual(screens.built, ['Tasks']);
    assert.equal(screens.skipped[0].name, 'New task');
    assert.match(screens.skipped[0].reason, /uses component “Text field”, which isn’t in the file or the JSON/);
    const links = part(report, 'prototype');
    assert.equal(links.skipped.length, 3);
    assert.match(links.skipped[0].reason, /uses screen “New task”, which was skipped/);
  });

  it('when Figma drops gradient links, the colour values are used, with a warning', async () => {
    const { mock, report } = await runBuild(example(), { mock: withMock({ gradientLinks: false }) });
    const style = mock.styles.find((s) => s.name === 'Brand/Sunrise');
    assert.equal(style.paints[0].gradientStops[0].boundVariables, undefined);
    assert.equal(Math.round(style.paints[0].gradientStops[0].color.r * 255), 0x4f);
    assert.ok(part(report, 'designSystem').warnings.some((w) => /Brand\/Sunrise.*colour values/.test(w)));
  });

  it('when Figma refuses gradient links, the colour values are used, with a warning', async () => {
    const { mock, report } = await runBuild(example(), { mock: withMock({ gradientLinks: 'refuse' }) });
    const style = mock.styles.find((s) => s.name === 'Brand/Sunrise');
    assert.equal(style.paints[0].gradientStops[0].boundVariables, undefined);
    assert.deepEqual(part(report, 'designSystem').skipped, []);
    assert.ok(part(report, 'designSystem').warnings.some((w) => /Brand\/Sunrise.*colour values/.test(w)));
  });

  it('a font that isn’t installed falls back to Inter, with a warning', async () => {
    const data = example();
    data.designSystem.textStyles.Title.font = 'Nope Sans';
    const { mock, report } = await runBuild(data);
    assert.deepEqual(mock.styles.find((s) => s.name === 'Title').fontName, { family: 'Inter', style: 'Bold' });
    assert.ok(part(report, 'designSystem').warnings.some((w) => /Title.*Nope Sans/.test(w)));
  });

  it('an item Figma refuses is skipped and removed; the rest is built (lesson 11)', async () => {
    const data = example();
    data.screens[0].children.push({ type: 'ellipse', name: 'Dot', width: 8, height: 8 });
    const mock = createMockFigma();
    (mock.figma as Any).createEllipse = () => {
      throw new Error('in createEllipse: refused');
    };
    const { report } = await runBuild(data, { mock });
    const screens = part(report, 'screens');
    assert.deepEqual(screens.skipped.map((s) => s.name), ['Tasks']);
    assert.equal(screens.skipped[0].reason, 'Figma couldn’t build it.');
    assert.match(screens.skipped[0].detail!, /refused/);
    assert.equal(byName(mock, 'Tasks', 'FRAME'), undefined, 'nothing half-made');
    assert.ok(byName(mock, 'New task', 'FRAME'));
  });

  it('overlay settings get a warning, because plugins can’t set them', async () => {
    const data = example();
    data.prototype.links.push({ from: 'Tasks', layer: 'Title', on: 'tap', action: 'overlay', to: 'New task', position: 'bottom', closeOnOutside: true });
    const { report } = await runBuild(data);
    assert.ok(part(report, 'prototype').warnings.some((w) => /Overlay settings.*can’t be set by plugins/.test(w)));
    assert.equal(part(report, 'prototype').built.length, 7);
  });
});

describe('build: Stop', () => {
  it('finishes the item being built, stops, and a second run finishes the rest', async () => {
    const mock = createMockFigma();
    const first = await runBuild(example(), { mock, stopWhen: (detail) => detail.includes('“Checkbox”') });
    assert.equal(first.report.stopped, true);
    const components = part(first.report, 'components');
    assert.deepEqual(components.built, ['Button', 'Checkbox']); // Checkbox was being built when Stop came
    assert.ok(components.skipped.every((s) => s.reason === 'Stopped before it was built.'));
    assert.equal(part(first.report, 'screens').reached, false);
    assert.equal(byName(mock, 'Task row', 'COMPONENT_SET'), undefined);

    const second = await runBuild(example(), { mock });
    assert.equal(second.report.stopped, false);
    assert.deepEqual(part(second.report, 'components').alreadyInFile, ['Button', 'Checkbox']);
    assert.deepEqual(part(second.report, 'components').built, ['Task row']);
    assert.ok(byName(mock, 'Tasks', 'FRAME'));
    assert.equal([...mock.nodes.values()].filter((n) => !n._removed && n._name === 'Checkbox' && n.type === 'COMPONENT_SET').length, 1);
  });
});

describe('build: only some parts ticked', () => {
  it('screens only, with the design system and components already in the file', async () => {
    const mock = createMockFigma();
    await runBuild(example(), { mock, ticked: ['designSystem', 'svgs', 'components'] });
    const { report } = await runBuild(example(), { mock, ticked: ['screens'] });
    assert.deepEqual(part(report, 'screens').built, ['Tasks', 'New task']);
    assert.equal(report.parts.length, 1);
  });

  it('screens only, in an empty file: every screen is skipped, nothing crashes', async () => {
    const { report } = await runBuild(example(), { ticked: ['screens'] });
    const screens = part(report, 'screens');
    assert.deepEqual(screens.built, []);
    assert.equal(screens.skipped.length, 2);
    assert.match(screens.skipped[0].reason, /in the JSON but isn’t in the file yet/);
  });
});

describe('build: fixes from the code review', () => {
  const screen = (children: Any[]) => ({ format: 'dropkit/0.1', screens: [{ name: 'S', width: 400, height: 800, children }] });

  it('a component with only a width hugs its content height', async () => {
    const data = {
      format: 'dropkit/0.1',
      components: [{ name: 'Card', base: { type: 'frame', layout: 'column', width: 343, padding: 16, children: [{ type: 'rect', name: 'Box', width: 10, height: 40 }] } }],
    };
    const { mock, report } = await runBuild(data, { ticked: ['components'] });
    assert.deepEqual(part(report, 'components').built, ['Card']);
    const card = byName(mock, 'Card', 'COMPONENT');
    assert.equal(card.layoutSizingVertical, 'HUG');
    assert.equal(card.width, 343);
  });

  it('values the checker ignores don’t break the build', async () => {
    const data = screen([
      { type: 'frame', name: 'A', layout: 'row', padding: [8, 16, 8], gap: null, radius: [4, 4, 4], opacity: 50, stroke: { color: '#000000', dash: ['a'] } },
      { type: 'text', name: 'T', text: 'Hi', truncate: 0, decoration: 'none' },
    ]);
    const { mock, report } = await runBuild(data, { ticked: ['screens'] });
    assert.deepEqual(part(report, 'screens').skipped, []);
    const a = byName(mock, 'A', 'FRAME');
    assert.equal(a.paddingTop, 0);
    assert.equal(a.opacity, 1);
    assert.deepEqual(a.dashPattern, []);
    const t = byName(mock, 'T', 'TEXT');
    assert.equal(t.textDecoration, 'NONE', '"none" isn’t strikethrough');
    assert.equal(t.textTruncation, 'DISABLED');
  });

  it('null removes a value', async () => {
    const data = screen([{ type: 'frame', name: 'A', layout: 'row', gap: null, padding: null, radius: null, stroke: null, fill: null }]);
    const { mock, report } = await runBuild(data, { ticked: ['screens'] });
    assert.deepEqual(part(report, 'screens').skipped, []);
    const a = byName(mock, 'A', 'FRAME');
    assert.equal(a.itemSpacing, 0);
    assert.deepEqual(a._fills, []);
  });

  it('an existing Colors collection with “Mode 1” is renamed; with another mode, values go there', async () => {
    for (const [existing, expected] of [['Mode 1', 'Light'], ['Default', 'Default']] as const) {
      const mock = createMockFigma({ plan: 'free' });
      const colors = (mock.figma as Any).variables.createVariableCollection('Colors');
      colors.renameMode(colors.defaultModeId, existing);
      const { report } = await runBuild(example(), { mock, ticked: ['designSystem'] });
      assert.deepEqual(colors.modes.map((m: Any) => m.name), [expected]);
      const bg = variable(mock, 'bg/primary');
      assert.deepEqual(bg.valuesByMode[colors.defaultModeId], { r: 1, g: 1, b: 1, a: 1 }, `${existing}: the Light value`);
      assert.deepEqual(part(report, 'designSystem').skipped, []);
      if (existing === 'Default') assert.ok(part(report, 'designSystem').warnings.some((w) => /has the mode “Default”, so the “Light” values went there/.test(w)));
    }
  });

  it('a text style in the file whose font isn’t installed: Inter, a warning, and the screen is built', async () => {
    const mock = createMockFigma();
    const style = (mock.figma as Any).createTextStyle();
    style.name = 'Display';
    style._font = { family: 'SF Pro', style: 'Bold' };
    const { report } = await runBuild(screen([{ type: 'text', name: 'Hello', text: 'Hi', textStyle: 'Display' }]), { mock, ticked: ['screens'] });
    assert.deepEqual(part(report, 'screens').built, ['S']);
    assert.ok(part(report, 'screens').warnings.some((w) => /“Display” uses the font “SF Pro Bold”, which isn’t installed, so “Hello” uses Inter/.test(w)));
    assert.deepEqual(byName(mock, 'Hello', 'TEXT').fontName, { family: 'Inter', style: 'Regular' });
  });

  it('Stop works during the design system too', async () => {
    const { report } = await runBuild(example(), { stopWhen: (detail) => detail.includes('“bg/primary”') });
    const ds = part(report, 'designSystem');
    assert.equal(report.stopped, true);
    assert.deepEqual(ds.built, ['brand/500', 'bg/primary']);
    assert.ok(ds.skipped.length > 10 && ds.skipped.every((s) => s.reason === 'Stopped before it was built.'));
  });

  it('a link that isn’t a { } block is skipped; the other links are built', async () => {
    const data = example();
    data.prototype.links.unshift(null);
    const { report } = await runBuild(data);
    const links = part(report, 'prototype');
    assert.deepEqual(links.skipped.map((s) => s.name), ['Link 1']);
    assert.equal(links.built.length, 6);
  });

  it('a component link with a missing layer adds no links at all', async () => {
    const data = example();
    data.prototype.componentLinks[0].layer = 'Box';
    data.prototype.componentLinks[1].layer = 'Nope';
    const { mock, report } = await runBuild(data);
    const set = byName(mock, 'Checkbox', 'COMPONENT_SET');
    const [, on] = set._children;
    assert.deepEqual(on.reactions, []);
    assert.ok(part(report, 'prototype').skipped.some((s) => /Off/.test(s.name)));
  });

  it('the start screen comes first in the prototype’s flows', async () => {
    const mock = createMockFigma();
    await runBuild(example(), { mock });
    const page = mock.page('Screens');
    const data = example();
    data.prototype.start = 'New task';
    await runBuild(data, { mock });
    assert.deepEqual(page.flowStartingPoints.map((f: Any) => f.name), ['New task', 'Tasks']);
  });
});
