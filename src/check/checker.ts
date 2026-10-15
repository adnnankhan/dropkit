// The checker (step 2). Reads the parsed JSON, which parts are ticked and the names already
// in the Figma file, and lists every problem in plain words. It never changes anything.
//
// An error skips only its item (a colour, an SVG, a component, a screen, a link); everything
// else is still built. A warning is built, with a note. When an item is skipped, the items
// that use it are skipped too, so the build never meets a missing name.

import {
  BUILD_ORDER,
  ENUMS,
  FORMAT_VERSION,
  LAYER_TYPES,
  PART_LABEL,
  combinations,
  isHexColor,
  matches,
  pickFontStyle,
  plural,
  type Combination,
  type Part,
} from '../shared/format.ts';

export interface ExistingComponent {
  name: string;
  /** Variant property → its values. Empty for a single component. */
  variants: Record<string, string[]>;
  /** Other properties: name → type. */
  props: Record<string, 'text' | 'boolean' | 'swap'>;
}

/** Names already in the open Figma file. */
export interface ExistingNames {
  colorVariables: string[];
  numberVariables: string[];
  /** Modes of the Colors collection, if the file has one. */
  colorModes: string[];
  paintStyles: string[];
  textStyles: string[];
  effectStyles: string[];
  components: ExistingComponent[];
  /** Top-level frames, which can be prototype screens. */
  screens: string[];
  /** Installed fonts, or null when unknown. */
  fonts: { family: string; style: string }[] | null;
}

export const NO_NAMES: ExistingNames = {
  colorVariables: [],
  numberVariables: [],
  colorModes: [],
  paintStyles: [],
  textStyles: [],
  effectStyles: [],
  components: [],
  screens: [],
  fonts: null,
};

export interface Problem {
  kind: 'error' | 'warning';
  /** Where it is, in plain words: Screen “New task” › Task name field */
  where: string;
  /** What's wrong and what happens, as a full sentence. */
  message: string;
  /** The item an error skips, e.g. "screen:New task". */
  skip?: string;
}

export interface Counts {
  variables: number;
  gradients: number;
  textStyles: number;
  effects: number;
  svgs: number;
  components: number;
  variants: number;
  screens: number;
  links: number;
}

export interface CheckResult {
  problems: Problem[];
  /** Parts the file has. */
  present: Part[];
  /** Parts that are ticked and in the file, in build order. */
  buildable: Part[];
  /** Item keys an error skips. "file" means nothing can be built. */
  skipped: string[];
  /** Why each item is skipped, in plain words, for the build report. */
  reasons: Record<string, string>;
  counts: Counts;
}

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const q = (name: unknown) => `“${String(name)}”`;

/** The words for an item, used in messages. */
interface Owner {
  key: string;
  /** "Screen “Tasks”" */
  label: string;
  /** "This screen will be skipped." */
  skipped: string;
}

type RefKind = 'component' | 'colour' | 'fill' | 'number' | 'textStyle' | 'effect' | 'svg' | 'screen';

const REF_WORDS: Record<RefKind, string> = {
  component: 'component',
  colour: 'colour',
  fill: 'colour or gradient',
  number: 'spacing, radius or size token',
  textStyle: 'text style',
  effect: 'effect',
  svg: 'SVG',
  screen: 'screen',
};

interface ComponentInfo {
  name: string;
  variants: Record<string, string[]>;
  props: Record<string, 'text' | 'boolean' | 'swap'>;
  /** Combinations that exist (after skip). */
  combos: Combination[];
}

interface LayerContext {
  owner: Owner;
  /** The component being checked, for textProp / visibleProp / swapProp. */
  component?: ComponentInfo;
}

const COMMON_KEYS = ['type', 'name', 'x', 'y', 'width', 'height', 'fill', 'stroke', 'radius', 'effect', 'opacity', 'rotation', 'visible', 'clip', 'absolute', 'visibleProp'];
const FRAME_KEYS = ['layout', 'gap', 'padding', 'align', 'justify', 'wrap', 'children'];
const TYPE_KEYS: Record<string, string[]> = {
  frame: FRAME_KEYS,
  text: ['text', 'runs', 'textStyle', 'align', 'truncate', 'decoration', 'textProp'],
  rect: [],
  ellipse: [],
  instance: ['component', 'variant', 'props', 'color', 'swapProp'],
  svg: ['svg'],
  image: ['src', 'fit'],
};
const SCREEN_KEYS = ['name', 'width', 'height', 'mode', 'children', ...FRAME_KEYS, ...COMMON_KEYS.filter((k) => !['type', 'x', 'y', 'absolute', 'visibleProp'].includes(k))];
const TOP_KEYS = ['format', 'name', 'designSystem', 'svgs', 'components', 'screens', 'prototype'];
const DS_KEYS = ['modes', 'colors', 'gradients', 'spacing', 'radius', 'sizes', 'textStyles', 'effects'];

export function checkFile(data: unknown, ticked: Part[], existing: ExistingNames = NO_NAMES): CheckResult {
  return new Checker(data, new Set(ticked), existing).run();
}

class Checker {
  private readonly problems: Problem[] = [];
  private readonly skips = new Map<string, Problem>();
  private readonly reasons = new Map<string, string>();
  private readonly deps = new Map<string, { owner: Owner; part: Part; refs: { kind: RefKind; name: string; key: string }[] }>();
  private readonly d: Json;
  private readonly ticked: Set<Part>;
  private readonly existing: ExistingNames;
  private readonly fileComponents = new Map<string, ExistingComponent>();

  // Names the JSON defines, by kind.
  private readonly colors = new Set<string>();
  private readonly gradients = new Set<string>();
  private readonly numbers = new Set<string>();
  private readonly textStyles = new Set<string>();
  private readonly effects = new Set<string>();
  private readonly svgs = new Map<string, Json>();
  private readonly components = new Map<string, ComponentInfo>();
  private readonly screens = new Map<string, Json>();
  private modes: string[] = [];

  constructor(data: unknown, ticked: Set<Part>, existing: ExistingNames) {
    this.d = isObject(data) ? data : {};
    this.ticked = ticked;
    this.existing = existing;
    for (const c of existing.components) this.fileComponents.set(c.name, c);
    if (!isObject(data)) {
      this.error(FILE_OWNER, 'File', 'The file must be one { … } block with "format" and the parts inside it. Nothing can be built until this is fixed.');
    }
  }

  run(): CheckResult {
    const present = BUILD_ORDER.filter((part) => this.d[part] !== undefined);
    if (!this.skips.has('file')) {
      this.checkTop(present);
      this.collectNames();
      // Only ticked parts are checked: the others won’t be built.
      if (this.ticked.has('designSystem')) this.checkDesignSystem();
      if (this.ticked.has('svgs')) this.checkSvgs();
      if (this.ticked.has('components')) this.checkComponents();
      if (this.ticked.has('screens')) this.checkScreens();
      if (this.ticked.has('prototype')) this.checkPrototype();
      this.propagate();
    }
    const blocked = this.skips.has('file');
    // Errors first, as in mockup 4; otherwise in the order found.
    const problems = [...this.problems.filter((p) => p.kind === 'error'), ...this.problems.filter((p) => p.kind === 'warning')];
    return {
      problems,
      present,
      buildable: blocked ? [] : BUILD_ORDER.filter((part) => present.includes(part) && this.ticked.has(part)),
      skipped: [...this.skips.keys()],
      reasons: Object.fromEntries(this.reasons),
      counts: this.counts(),
    };
  }

  // ── Problems ────────────────────────────────────────────────────────────

  private error(owner: Owner, where: string, message: string): void {
    const full = message.endsWith(owner.skipped) || owner.skipped === '' ? message : `${message} ${owner.skipped}`;
    const problem: Problem = { kind: 'error', where, message: full, skip: owner.key };
    this.problems.push(problem);
    if (!this.skips.has(owner.key)) {
      this.skips.set(owner.key, problem);
      this.reasons.set(owner.key, full);
    }
  }

  private warn(where: string, message: string): void {
    this.problems.push({ kind: 'warning', where, message });
  }

  private unknownKeys(value: Json, known: string[], where: string, label: string): void {
    for (const key of Object.keys(value)) {
      if (known.includes(key)) continue;
      const guess = closest(key, known);
      const hint = guess ? ` Did you mean ${q(guess)}?` : '';
      this.warn(where, `${label} has ${q(key)}, which the plugin doesn’t know. It will be ignored.${hint}`);
    }
  }

  // ── Top level ───────────────────────────────────────────────────────────

  private checkTop(present: Part[]): void {
    const format = this.d.format;
    if (format === undefined) {
      this.warn('File', `The file has no "format". Add "format": "${FORMAT_VERSION}" at the top. The plugin reads it as ${FORMAT_VERSION}.`);
    } else if (format !== FORMAT_VERSION) {
      this.warn('File', `The file says "format": ${JSON.stringify(format)}, but this plugin reads ${FORMAT_VERSION}. It will try, and anything it doesn’t know is ignored.`);
    }
    if (this.d.name !== undefined && typeof this.d.name !== 'string') this.warn('File', '"name" should be text. It will be ignored.');
    this.unknownKeys(this.d, TOP_KEYS, 'File', 'The file');

    for (const part of present) {
      if (this.ticked.has(part)) continue;
      const message = {
        designSystem: 'The file has a design system, but Design system isn’t ticked. It won’t be built.',
        svgs: 'The file has SVGs, but SVGs isn’t ticked. They won’t be built.',
        components: 'The file has components, but Components isn’t ticked. They won’t be built.',
        screens: 'The file has screens, but Screens isn’t ticked. They won’t be built.',
        prototype: 'The file has prototype links, but Prototype & animations isn’t ticked. Links won’t be built.',
      }[part];
      this.warn('File', message);
    }
  }

  /** Learn every name the JSON defines first, so items can use names defined later in the file. */
  private collectNames(): void {
    const ds = this.d.designSystem;
    if (isObject(ds)) {
      if (isObject(ds.colors)) Object.keys(ds.colors).forEach((n) => this.colors.add(n));
      if (isObject(ds.gradients)) Object.keys(ds.gradients).forEach((n) => this.gradients.add(n));
      for (const key of ['spacing', 'radius', 'sizes']) if (isObject(ds[key])) Object.keys(ds[key] as Json).forEach((n) => this.numbers.add(n));
      if (isObject(ds.textStyles)) Object.keys(ds.textStyles).forEach((n) => this.textStyles.add(n));
      if (isObject(ds.effects)) Object.keys(ds.effects).forEach((n) => this.effects.add(n));
      if (Array.isArray(ds.modes) && ds.modes.every(isString) && ds.modes.length > 0) {
        this.modes = [...new Set(ds.modes as string[])];
      } else if (isObject(ds.colors)) {
        const first = Object.values(ds.colors).find(isObject);
        if (first) this.modes = Object.keys(first);
      }
    }
    if (this.modes.length === 0) this.modes = [...this.existing.colorModes];

    if (Array.isArray(this.d.svgs)) {
      for (const svg of this.d.svgs) if (isObject(svg) && isString(svg.name) && !this.svgs.has(svg.name)) this.svgs.set(svg.name, svg);
    }
    if (Array.isArray(this.d.components)) {
      for (const c of this.d.components) {
        if (!isObject(c) || !isString(c.name) || this.components.has(c.name)) continue;
        const variants: Record<string, string[]> = {};
        if (isObject(c.variants)) {
          for (const [prop, values] of Object.entries(c.variants)) {
            if (Array.isArray(values)) variants[prop] = [...new Set(values.filter(isString))];
          }
        }
        const props: ComponentInfo['props'] = {};
        if (isObject(c.props)) {
          for (const [prop, def] of Object.entries(c.props)) {
            if (isObject(def) && (ENUMS.propType as readonly unknown[]).includes(def.type)) props[prop] = def.type as 'text' | 'boolean' | 'swap';
          }
        }
        const skip = Array.isArray(c.skip) ? (c.skip.filter(isObject) as Combination[]) : [];
        this.components.set(c.name, { name: c.name, variants, props, combos: combinations(variants, skip) });
      }
    }
    if (Array.isArray(this.d.screens)) {
      for (const s of this.d.screens) if (isObject(s) && isString(s.name) && !this.screens.has(s.name)) this.screens.set(s.name, s);
    }
  }

  // ── Names ───────────────────────────────────────────────────────────────

  /**
   * Checks that a name exists. Records a dependency when it comes from this JSON, so a
   * skipped item also skips the items that use it. Returns false (and adds an error) when missing.
   */
  private uses(ctx: { owner: Owner; part: Part }, where: string, kind: RefKind, name: string): boolean {
    const found = this.find(kind, name);
    if (found === 'file') return true;
    if (found !== null && found.ticked) {
      this.dependOn(ctx, kind, name, found.key);
      return true;
    }
    const label = ctx.owner.label;
    if (found !== null) {
      this.error(ctx.owner, where, `${label} uses ${REF_WORDS[kind]} ${q(name)}, which is in the JSON but isn’t in the file yet, and ${PART_LABEL[found.part]} isn’t ticked.`);
    } else {
      this.error(ctx.owner, where, `${label} uses ${REF_WORDS[kind]} ${q(name)}, which isn’t in the file or the JSON.`);
    }
    return false;
  }

  private dependOn(ctx: { owner: Owner; part: Part }, kind: RefKind, name: string, key: string): void {
    if (key === ctx.owner.key) return;
    const entry = this.deps.get(ctx.owner.key) ?? { owner: ctx.owner, part: ctx.part, refs: [] };
    entry.refs.push({ kind, name, key });
    this.deps.set(ctx.owner.key, entry);
  }

  /** "file" when the Figma file has it; the JSON item when the JSON does; null when neither. */
  private find(kind: RefKind, name: string): 'file' | { key: string; part: Part; ticked: boolean } | null {
    const e = this.existing;
    const json = (key: string, part: Part) => ({ key, part, ticked: this.ticked.has(part) });
    switch (kind) {
      case 'component':
        if (this.fileComponents.has(name)) return 'file';
        if (this.components.has(name)) return json(`component:${name}`, 'components');
        if (this.svgs.has(name) && this.svgs.get(name)!.component !== false) return json(`svg:${name}`, 'svgs');
        return null;
      case 'colour':
        if (e.colorVariables.includes(name)) return 'file';
        return this.colors.has(name) ? json(`color:${name}`, 'designSystem') : null;
      case 'fill':
        if (e.colorVariables.includes(name) || e.paintStyles.includes(name)) return 'file';
        if (this.colors.has(name)) return json(`color:${name}`, 'designSystem');
        return this.gradients.has(name) ? json(`gradient:${name}`, 'designSystem') : null;
      case 'number':
        if (e.numberVariables.includes(name)) return 'file';
        return this.numbers.has(name) ? json(`number:${name}`, 'designSystem') : null;
      case 'textStyle':
        if (e.textStyles.includes(name)) return 'file';
        return this.textStyles.has(name) ? json(`textStyle:${name}`, 'designSystem') : null;
      case 'effect':
        if (e.effectStyles.includes(name)) return 'file';
        return this.effects.has(name) ? json(`effect:${name}`, 'designSystem') : null;
      case 'svg':
        return this.svgs.has(name) ? json(`svg:${name}`, 'svgs') : null;
      case 'screen':
        if (this.screens.has(name)) {
          const s = json(`screen:${name}`, 'screens');
          if (s.ticked || !e.screens.includes(name)) return s;
        }
        return e.screens.includes(name) ? 'file' : null;
    }
  }

  /** Component info, from the JSON or the file. */
  private componentInfo(name: string): ComponentInfo | null {
    const file = this.fileComponents.get(name);
    if (file) return { name, variants: file.variants, props: file.props, combos: combinations(file.variants) };
    const json = this.components.get(name);
    if (json) return json;
    if (this.svgs.has(name)) return { name, variants: {}, props: {}, combos: [{}] };
    return null;
  }

  /**
   * Skips items that use a skipped item, until nothing changes. They don’t get problems of
   * their own: the first problem says what else it skips, so one mistake is one problem.
   */
  private propagate(): void {
    const also = new Map<Problem, string[]>();
    let changed = true;
    while (changed) {
      changed = false;
      for (const [key, entry] of this.deps) {
        if (this.skips.has(key)) continue;
        const ref = entry.refs.find((r) => this.skips.has(r.key));
        if (!ref) continue;
        const root = this.skips.get(ref.key)!;
        this.skips.set(key, root);
        this.reasons.set(key, `It uses ${REF_WORDS[ref.kind]} ${q(ref.name)}, which was skipped.`);
        also.set(root, [...(also.get(root) ?? []), entry.owner.label.replace(/^The /, 'the ')]);
        changed = true;
      }
    }
    for (const [problem, labels] of also) {
      const shown = labels.length > 4 ? [...labels.slice(0, 3), `${labels.length - 3} more`] : labels;
      const joined = shown.length > 1 ? `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}` : shown[0];
      problem.message += ` Also skipped, because they use it: ${joined}.`;
    }
  }

  // ── Design system ───────────────────────────────────────────────────────

  private checkDesignSystem(): void {
    const ds = this.d.designSystem;
    if (ds === undefined) return;
    const part: Part = 'designSystem';
    if (!isObject(ds)) {
      this.error({ key: 'part:designSystem', label: 'The design system', skipped: 'The design system will be skipped.' }, 'Design system', '"designSystem" must be a { … } block.');
      return;
    }
    this.unknownKeys(ds, DS_KEYS, 'Design system', 'The design system');

    if (ds.modes !== undefined && !(Array.isArray(ds.modes) && ds.modes.length > 0 && ds.modes.every(isString))) {
      this.warn('Design system › modes', '"modes" should be a list of mode names, like ["Light", "Dark"]. It will be ignored.');
    } else if (Array.isArray(ds.modes) && new Set(ds.modes).size !== ds.modes.length) {
      this.warn('Design system › modes', '"modes" lists the same mode twice. The repeat will be ignored.');
    }

    const group = (key: string, what: string): Json | null => {
      const value = ds[key];
      if (value === undefined) return null;
      if (!isObject(value)) {
        this.warn(`Design system › ${key}`, `"${key}" must be a { … } block of ${what}. It will be ignored.`);
        return null;
      }
      return value;
    };

    const colors = group('colors', 'colours');
    if (colors) {
      for (const [name, value] of Object.entries(colors)) {
        const owner = item(`color:${name}`, `Colour ${q(name)}`, 'This colour will be skipped.');
        const where = `Design system › colors › ${name}`;
        const ctx = { owner, part };
        if (isObject(value)) {
          const keys = Object.keys(value);
          const missing = this.modes.filter((m) => !keys.includes(m));
          const extra = keys.filter((m) => !this.modes.includes(m));
          if (missing.length || extra.length) {
            const parts = [];
            if (missing.length) parts.push(`has no value for ${list(missing)}`);
            if (extra.length) parts.push(`has ${list(extra)}, which isn’t one of the modes (${list(this.modes)})`);
            this.error(owner, where, `${owner.label} ${parts.join(' and ')}. Every colour with modes must use the same mode names.`);
          }
          for (const [mode, v] of Object.entries(value)) this.colourValue(ctx, `${where} › ${mode}`, v, name);
        } else {
          this.colourValue(ctx, where, value, name);
        }
      }
      this.colourCycles(colors);
    }

    const gradients = group('gradients', 'gradients');
    if (gradients) {
      for (const [name, value] of Object.entries(gradients)) {
        const owner = item(`gradient:${name}`, `Gradient ${q(name)}`, 'This gradient will be skipped.');
        this.gradient({ owner, part }, `Design system › gradients › ${name}`, value);
      }
    }

    for (const key of ['spacing', 'radius', 'sizes']) {
      const values = group(key, 'numbers');
      if (!values) continue;
      for (const [name, value] of Object.entries(values)) {
        const owner = item(`number:${name}`, `Token ${q(name)}`, 'This token will be skipped.');
        if (!isNumber(value)) this.error(owner, `Design system › ${key} › ${name}`, `${owner.label} must be a number of px, like 16.`);
        else if (value < 0) this.error(owner, `Design system › ${key} › ${name}`, `${owner.label} can’t be below 0.`);
      }
    }

    const textStyles = group('textStyles', 'text styles');
    if (textStyles) {
      for (const [name, value] of Object.entries(textStyles)) this.textStyle(name, value);
    }

    const effects = group('effects', 'effects');
    if (effects) {
      for (const [name, value] of Object.entries(effects)) {
        const owner = item(`effect:${name}`, `Effect ${q(name)}`, 'This effect will be skipped.');
        const where = `Design system › effects › ${name}`;
        const list = Array.isArray(value) ? value : isObject(value) ? [value] : null;
        if (!list || list.length === 0) {
          this.error(owner, where, `${owner.label} must be a list of effects, like [{ "type": "dropShadow", … }].`);
          continue;
        }
        list.forEach((effect, i) => this.effect({ owner, part }, `${where} › ${i + 1}`, effect));
      }
    }
  }

  private colourValue(ctx: { owner: Owner; part: Part }, where: string, value: unknown, self: string): void {
    if (isHexColor(value)) return;
    if (!isString(value)) {
      this.error(ctx.owner, where, `${ctx.owner.label} must be a colour like "#4F46E5", the name of another colour, or one value per mode.`);
      return;
    }
    if (value.startsWith('#')) {
      this.error(ctx.owner, where, `${ctx.owner.label} has ${q(value)}, which isn’t a colour. Write colours as #RRGGBB or #RRGGBBAA.`);
      return;
    }
    if (value === self) {
      this.error(ctx.owner, where, `${ctx.owner.label} links to itself.`);
      return;
    }
    this.uses(ctx, where, 'colour', value);
  }

  private colourCycles(colors: Json): void {
    const links = (name: string): string[] => {
      const v = colors[name];
      const values = isObject(v) ? Object.values(v) : [v];
      return values.filter((x): x is string => isString(x) && !isHexColor(x) && x in colors);
    };
    for (const start of Object.keys(colors)) {
      const seen = new Set<string>();
      const walk = (name: string): boolean => {
        if (name === start && seen.size > 0) return true;
        if (seen.has(name)) return false;
        seen.add(name);
        return links(name).some(walk);
      };
      if (links(start).some((next) => next !== start && walk(next))) {
        const owner = item(`color:${start}`, `Colour ${q(start)}`, 'This colour will be skipped.');
        if (!this.skips.has(owner.key)) this.error(owner, `Design system › colors › ${start}`, `${owner.label} links to colours that link back to it, so it never gets a value.`);
      }
    }
  }

  private gradient(ctx: { owner: Owner; part: Part }, where: string, value: unknown): void {
    const { owner } = ctx;
    if (!isObject(value)) {
      this.error(owner, where, `${owner.label} must be a { … } block with "type" and "stops".`);
      return;
    }
    this.unknownKeys(value, ['type', 'angle', 'stops'], where, owner.label);
    if (!(ENUMS.gradientType as readonly unknown[]).includes(value.type)) {
      this.error(owner, where, `${owner.label} needs "type": "linear", "radial" or "angular".`);
    }
    if (value.angle !== undefined && !isNumber(value.angle)) this.warn(where, `${owner.label} has an "angle" that isn’t a number. It will use 0.`);
    if (!Array.isArray(value.stops) || value.stops.length < 2) {
      this.error(owner, where, `${owner.label} needs at least 2 "stops".`);
      return;
    }
    value.stops.forEach((stop, i) => {
      const at = `${where} › stop ${i + 1}`;
      if (!isObject(stop)) {
        this.error(owner, at, `${owner.label}: stop ${i + 1} must be like { "color": "#F97316", "at": 1 }.`);
        return;
      }
      if (!isNumber(stop.at) || stop.at < 0 || stop.at > 1) this.error(owner, at, `${owner.label}: stop ${i + 1} needs "at" between 0 and 1.`);
      if (isHexColor(stop.color)) return;
      if (!isString(stop.color)) this.error(owner, at, `${owner.label}: stop ${i + 1} needs a "color".`);
      else this.uses(ctx, at, 'colour', stop.color);
    });
  }

  private textStyle(name: string, value: unknown): void {
    const owner = item(`textStyle:${name}`, `Text style ${q(name)}`, 'This text style will be skipped.');
    const where = `Design system › textStyles › ${name}`;
    if (!isObject(value)) {
      this.error(owner, where, `${owner.label} must be like { "font": "Inter", "weight": 400, "size": 17 }.`);
      return;
    }
    this.unknownKeys(value, ['font', 'weight', 'size', 'lineHeight', 'letterSpacing', 'italic', 'case', 'decoration'], where, owner.label);
    if (!isString(value.font)) this.error(owner, where, `${owner.label} needs a "font", like "Inter".`);
    if (!isNumber(value.weight) || value.weight < 100 || value.weight > 900) this.error(owner, where, `${owner.label} needs a "weight" from 100 to 900, like 400.`);
    if (!isNumber(value.size) || value.size <= 0) this.error(owner, where, `${owner.label} needs a "size" in px, like 17.`);
    if (value.lineHeight !== undefined && value.lineHeight !== 'auto' && !isNumber(value.lineHeight)) this.warn(where, `${owner.label} has a "lineHeight" that isn’t a number or "auto". It will use auto.`);
    if (value.letterSpacing !== undefined && !isNumber(value.letterSpacing)) this.warn(where, `${owner.label} has a "letterSpacing" that isn’t a number. It will use 0.`);
    if (value.italic !== undefined && typeof value.italic !== 'boolean') this.warn(where, `${owner.label} has an "italic" that isn’t true or false. It will be ignored.`);
    this.enumField(where, owner.label, 'case', value.case, ENUMS.textCase);
    this.enumField(where, owner.label, 'decoration', value.decoration, ENUMS.decoration);

    const fonts = this.existing.fonts;
    if (fonts && isString(value.font) && isNumber(value.weight)) {
      const italic = value.italic === true;
      const pick = pickFontStyle(fonts, value.font, value.weight, italic);
      if (!pick) {
        this.warn(where, `${owner.label} uses the font ${q(value.font)}, which isn’t installed. Its text will fall back to Inter.`);
      } else if (!pick.exact) {
        this.warn(where, `${owner.label}: ${q(value.font)} has no weight ${value.weight}${italic ? ' italic' : ''} installed. It will use ${q(pick.style)}.`);
      }
    }
  }

  private effect(ctx: { owner: Owner; part: Part }, where: string, effect: unknown): void {
    const { owner } = ctx;
    if (!isObject(effect) || !(ENUMS.effectType as readonly unknown[]).includes(effect.type)) {
      this.error(owner, where, `${owner.label}: each effect needs "type": "dropShadow", "innerShadow", "layerBlur" or "backgroundBlur".`);
      return;
    }
    if (effect.type === 'dropShadow' || effect.type === 'innerShadow') {
      this.unknownKeys(effect, ['type', 'color', 'x', 'y', 'blur', 'spread'], where, owner.label);
      if (effect.color === undefined) this.error(owner, where, `${owner.label}: a shadow needs a "color", like "#0000001F".`);
      else if (!isHexColor(effect.color)) {
        if (isString(effect.color) && !effect.color.startsWith('#')) this.uses(ctx, where, 'colour', effect.color);
        else this.error(owner, where, `${owner.label}: the shadow colour ${q(effect.color)} isn’t a colour. Write it as #RRGGBB or #RRGGBBAA.`);
      }
      for (const key of ['x', 'y', 'blur', 'spread']) {
        if (effect[key] !== undefined && !isNumber(effect[key])) this.warn(where, `${owner.label}: "${key}" isn’t a number. It will use 0.`);
      }
    } else {
      this.unknownKeys(effect, ['type', 'radius'], where, owner.label);
      if (!isNumber(effect.radius) || effect.radius < 0) this.error(owner, where, `${owner.label}: a blur needs a "radius" in px, like 24.`);
    }
  }

  // ── SVGs ────────────────────────────────────────────────────────────────

  private checkSvgs(): void {
    const svgs = this.d.svgs;
    if (svgs === undefined) return;
    const part: Part = 'svgs';
    if (!Array.isArray(svgs)) {
      this.error({ key: 'part:svgs', label: 'The SVGs', skipped: 'The SVGs will be skipped.' }, 'SVGs', '"svgs" must be a list: [ { "name": …, "svg": … } ].');
      return;
    }
    const seen = new Set<string>();
    svgs.forEach((svg, i) => {
      const where = `SVGs › ${isObject(svg) && isString(svg.name) ? svg.name : `SVG ${i + 1}`}`;
      if (!isObject(svg) || !isString(svg.name)) {
        this.error(item(`svg#${i}`, `SVG ${i + 1}`, 'This SVG will be skipped.'), where, `SVG ${i + 1} needs a "name", like "Icon/check".`);
        return;
      }
      const owner = item(`svg:${svg.name}`, `SVG ${q(svg.name)}`, 'This SVG will be skipped.');
      if (seen.has(svg.name)) {
        this.error(item(`svg#${i}`, owner.label, 'The second one will be skipped.'), where, `There are two SVGs named ${q(svg.name)}. Names must be unique.`);
        return;
      }
      seen.add(svg.name);
      if (this.components.has(svg.name) && svg.component !== false) {
        this.error(owner, where, `${owner.label} has the same name as a component. Names must be unique.`);
      }
      this.unknownKeys(svg, ['name', 'svg', 'component', 'color'], where, owner.label);
      if (!isString(svg.svg) || !/<svg[\s>]/i.test(svg.svg)) {
        this.error(owner, where, `${owner.label} needs "svg": the SVG code as one string, starting with <svg.`);
      } else {
        if (!/viewBox\s*=/i.test(svg.svg)) this.error(owner, where, `${owner.label} has no viewBox. Add one, like viewBox='0 0 24 24'.`);
        if (/<script|\son[a-z]+\s*=|javascript:/i.test(svg.svg)) this.error(owner, where, `${owner.label} has a script inside it, which isn’t allowed.`);
        if (/<image|<foreignObject|href\s*=\s*['"]?\s*data:/i.test(svg.svg)) this.error(owner, where, `${owner.label} has an embedded image, which isn’t allowed. Use vector shapes only.`);
      }
      if (svg.component !== undefined && typeof svg.component !== 'boolean') this.warn(where, `${owner.label}: "component" should be true or false. It will be true.`);
      if (svg.color !== undefined) this.colourRef({ owner, part }, where, svg.color);
    });
  }

  private colourRef(ctx: { owner: Owner; part: Part }, where: string, value: unknown): void {
    if (isHexColor(value)) return;
    if (isString(value) && !value.startsWith('#')) {
      this.uses(ctx, where, 'colour', value);
      return;
    }
    this.error(ctx.owner, where, `${ctx.owner.label}: ${q(value)} isn’t a colour. Write colours as #RRGGBB, #RRGGBBAA or a colour name.`);
  }

  // ── Components ──────────────────────────────────────────────────────────

  private checkComponents(): void {
    const components = this.d.components;
    if (components === undefined) return;
    const part: Part = 'components';
    if (!Array.isArray(components)) {
      this.error({ key: 'part:components', label: 'The components', skipped: 'The components will be skipped.' }, 'Components', '"components" must be a list: [ { "name": …, "base": … } ].');
      return;
    }
    const seen = new Set<string>();
    components.forEach((c, i) => {
      if (!isObject(c) || !isString(c.name)) {
        this.error(item(`component#${i}`, `Component ${i + 1}`, 'This component will be skipped.'), `Components › ${i + 1}`, `Component ${i + 1} needs a "name".`);
        return;
      }
      const owner = item(`component:${c.name}`, `Component ${q(c.name)}`, 'This component will be skipped.');
      const where = `Component ${q(c.name)}`;
      if (seen.has(c.name)) {
        this.error(item(`component#${i}`, owner.label, 'The second one will be skipped.'), where, `There are two components named ${q(c.name)}. Names must be unique.`);
        return;
      }
      seen.add(c.name);
      const info = this.components.get(c.name)!;
      const ctx = { owner, part };
      this.unknownKeys(c, ['name', 'description', 'base', 'props', 'variants', 'skip', 'rules'], where, owner.label);
      if (c.description !== undefined && typeof c.description !== 'string') this.warn(where, `${owner.label}: "description" should be text. It will be ignored.`);

      // Props
      if (c.props !== undefined) {
        if (!isObject(c.props)) this.error(owner, where, `${owner.label}: "props" must be a { … } block.`);
        else {
          for (const [prop, def] of Object.entries(c.props)) {
            const at = `${where} › props › ${prop}`;
            if (!isObject(def) || !(ENUMS.propType as readonly unknown[]).includes(def.type)) {
              this.error(owner, at, `${owner.label}: prop ${q(prop)} needs "type": "text", "boolean" or "swap".`);
              continue;
            }
            if (def.type === 'text' && typeof def.default !== 'string') this.error(owner, at, `${owner.label}: text prop ${q(prop)} needs a "default" text.`);
            if (def.type === 'boolean' && typeof def.default !== 'boolean') this.error(owner, at, `${owner.label}: boolean prop ${q(prop)} needs "default": true or false.`);
            if (def.type === 'swap') {
              if (!isString(def.default)) this.error(owner, at, `${owner.label}: swap prop ${q(prop)} needs a "default" component name.`);
              else this.uses(ctx, at, 'component', def.default);
            }
            if (prop in info.variants) this.error(owner, at, `${owner.label}: ${q(prop)} is both a prop and a variant. Use different names.`);
          }
        }
      }

      // Variants
      if (c.variants !== undefined) {
        if (!isObject(c.variants)) this.error(owner, where, `${owner.label}: "variants" must be like { "Style": ["Primary", "Secondary"] }.`);
        else {
          for (const [prop, values] of Object.entries(c.variants)) {
            if (!Array.isArray(values) || values.length === 0 || !values.every(isString)) {
              this.error(owner, `${where} › variants › ${prop}`, `${owner.label}: variant ${q(prop)} needs a list of values, like ["Primary", "Secondary"].`);
            } else if (new Set(values).size !== values.length) {
              this.warn(`${where} › variants › ${prop}`, `${owner.label}: variant ${q(prop)} lists the same value twice. The repeat will be ignored.`);
            }
          }
        }
      }
      if (c.skip !== undefined) {
        if (!Array.isArray(c.skip)) this.error(owner, where, `${owner.label}: "skip" must be a list of combinations.`);
        else c.skip.forEach((combo, n) => this.combo(owner, `${where} › skip ${n + 1}`, info, combo, 'skip'));
      }
      if (info.combos.length === 0) this.error(owner, where, `${owner.label}: "skip" leaves no variants to build.`);

      // Base layer
      const names = new Map<string, number>();
      if (!isObject(c.base)) {
        this.error(owner, where, `${owner.label} needs a "base" layer, like { "type": "frame", … }.`);
      } else {
        this.layer(c.base, { owner, component: info }, [where], 'root', names);
      }

      // Rules
      if (c.rules !== undefined) {
        if (!Array.isArray(c.rules)) this.error(owner, where, `${owner.label}: "rules" must be a list.`);
        else c.rules.forEach((rule, n) => this.rule(owner, info, `${where} › rule ${n + 1}`, rule, isObject(c.base) ? c.base : null, names));
      }
    });
    this.componentCycles();
  }

  private combo(owner: Owner, where: string, info: ComponentInfo, combo: unknown, what: string): boolean {
    if (!isObject(combo)) {
      this.error(owner, where, `${owner.label}: each ${what} must be like { "Style": "Secondary" }.`);
      return false;
    }
    let ok = true;
    for (const [prop, value] of Object.entries(combo)) {
      const values = info.variants[prop];
      if (!values) {
        this.error(owner, where, `${owner.label}: ${what} uses variant ${q(prop)}, which ${q(info.name)} doesn’t have.${hintList(Object.keys(info.variants))}`);
        ok = false;
      } else if (!values.includes(value as string)) {
        this.error(owner, where, `${owner.label}: ${what} uses ${q(`${prop}=${String(value)}`)}, but ${q(prop)} is ${list(values)}.`);
        ok = false;
      }
    }
    return ok;
  }

  private rule(owner: Owner, info: ComponentInfo, where: string, rule: unknown, base: Json | null, names: Map<string, number>): void {
    if (!isObject(rule) || !isObject(rule.when) || !isObject(rule.set)) {
      this.error(owner, where, `${owner.label}: each rule needs "when" and "set", like { "when": { "Size": "Small" }, "set": { "self": { … } } }.`);
      return;
    }
    this.unknownKeys(rule, ['when', 'set'], where, owner.label);
    this.combo(owner, where, info, rule.when, 'a rule');
    for (const [layerName, fields] of Object.entries(rule.set)) {
      const at = `${where} › ${layerName}`;
      if (!isObject(fields)) {
        this.error(owner, at, `${owner.label}: in a rule, ${q(layerName)} must be a { … } block of fields to change.`);
        continue;
      }
      let target: Json | null = base;
      if (layerName !== 'self') {
        const count = names.get(layerName) ?? 0;
        if (count === 0) {
          this.error(owner, at, `${owner.label}: a rule changes layer ${q(layerName)}, which isn’t in the component.`);
          continue;
        }
        if (count > 1) {
          this.error(owner, at, `${owner.label}: a rule changes ${q(layerName)}, but more than one layer has that name. Give it a unique name.`);
          continue;
        }
        target = base ? findLayer(base, layerName) : null;
      }
      if (!target) continue;
      const parentLayout = layerName === 'self' ? 'root' : parentLayoutOf(base!, layerName);
      this.layerFields({ ...target, ...fields }, fields, { owner, component: info }, at, owner.label, parentLayout);
    }
  }

  private componentCycles(): void {
    const uses = new Map<string, Set<string>>();
    const comps = Array.isArray(this.d.components) ? this.d.components.filter(isObject) : [];
    for (const c of comps) {
      if (!isString(c.name)) continue;
      const set = new Set<string>();
      const walk = (layer: unknown) => {
        if (!isObject(layer)) return;
        if (layer.type === 'instance' && isString(layer.component) && this.components.has(layer.component)) set.add(layer.component);
        if (Array.isArray(layer.children)) layer.children.forEach(walk);
      };
      walk(c.base);
      uses.set(c.name, set);
    }
    for (const start of uses.keys()) {
      const seen = new Set<string>();
      const loops = (name: string): boolean => {
        for (const next of uses.get(name) ?? []) {
          if (next === start) return true;
          if (!seen.has(next)) {
            seen.add(next);
            if (loops(next)) return true;
          }
        }
        return false;
      };
      if (loops(start)) {
        const owner = item(`component:${start}`, `Component ${q(start)}`, 'This component will be skipped.');
        this.error(owner, owner.label, `${owner.label} contains itself, through its instances.`);
      }
    }
  }

  // ── Layers ──────────────────────────────────────────────────────────────

  /**
   * Checks one layer and its children. parentLayout: "auto" inside auto layout, "none" for
   * a frame without layout, "root" for a component's base (it has no parent).
   */
  private layer(layer: unknown, ctx: LayerContext, path: string[], parentLayout: 'auto' | 'none' | 'root', names: Map<string, number>): void {
    const where = path.join(' › ');
    if (!isObject(layer)) {
      this.error(ctx.owner, where, `${ctx.owner.label} has a layer that isn’t a { … } block.`);
      return;
    }
    const label = isString(layer.name) ? `Layer ${q(layer.name)}` : typeof layer.type === 'string' ? `A ${layer.type} layer` : 'A layer';
    const here = isString(layer.name) ? [...path, layer.name] : path;
    const at = here.join(' › ');
    if (isString(layer.name)) names.set(layer.name, (names.get(layer.name) ?? 0) + 1);
    else if (layer.name !== undefined) this.warn(at, `${label}: "name" should be text. It will be ignored.`);

    if (!(LAYER_TYPES as readonly unknown[]).includes(layer.type)) {
      const guess = typeof layer.type === 'string' ? closest(layer.type, [...LAYER_TYPES]) : null;
      this.error(ctx.owner, at, `${ctx.owner.label} has a layer with "type": ${JSON.stringify(layer.type ?? null)}. Use ${list([...LAYER_TYPES])}.${guess ? ` Did you mean ${q(guess)}?` : ''}`);
      return;
    }
    this.unknownKeys(layer, [...COMMON_KEYS, ...TYPE_KEYS[layer.type as string]], at, label);
    this.layerFields(layer, layer, ctx, at, label, parentLayout);

    if (layer.type === 'frame' && layer.children !== undefined) {
      if (!Array.isArray(layer.children)) this.warn(at, `${label}: "children" must be a list. It will be ignored.`);
      else {
        const inner = layer.layout === 'row' || layer.layout === 'column' ? 'auto' : 'none';
        for (const child of layer.children) this.layer(child, ctx, here, inner, names);
      }
    }
  }

  /**
   * Checks layer fields. `layer` is the whole layer (for its type and layout); `fields` are
   * the fields to check (the whole layer, or the fields a rule changes).
   */
  private layerFields(layer: Json, fields: Json, ctx: LayerContext, at: string, label: string, parentLayout: 'auto' | 'none' | 'root'): void {
    const type = layer.type as string;
    const c = { owner: ctx.owner, part: partOf(ctx.owner) };
    const hasLayout = layer.layout === 'row' || layer.layout === 'column';

    for (const key of ['x', 'y', 'rotation']) {
      if (fields[key] !== undefined && !isNumber(fields[key])) this.warn(at, `${label}: "${key}" isn’t a number. It will be ignored.`);
    }
    for (const key of ['width', 'height'] as const) {
      const v = fields[key];
      if (v === undefined) continue;
      if (v === 'fill') {
        if (parentLayout !== 'auto' || layer.absolute === true) {
          this.warn(at, `${label}: "${key}": "fill" only works inside a parent with "layout". It keeps its own ${key}.`);
        }
      } else if (v === 'hug') {
        if (!(type === 'text' || (type === 'frame' && hasLayout))) {
          this.warn(at, `${label}: "${key}": "hug" only works on frames with "layout" and on text. It keeps its own ${key}.`);
        }
      } else this.numberValue(c, at, label, key, v);
    }
    if (fields.fill !== undefined && fields.fill !== null) this.fill(c, at, label, fields.fill);
    if (fields.stroke !== undefined && fields.stroke !== null) {
      const s = fields.stroke;
      if (!isObject(s)) this.warn(at, `${label}: "stroke" must be like { "color": "#000000", "width": 1 }. It will be ignored.`);
      else {
        this.unknownKeys(s, ['color', 'width', 'align', 'dash'], at, `${label}’s stroke`);
        if (s.color === undefined) this.warn(at, `${label}: the stroke has no "color". It will be ignored.`);
        else this.colourRef(c, at, s.color);
        if (s.width !== undefined) this.numberValue(c, at, label, 'stroke width', s.width);
        this.enumField(at, label, 'stroke align', s.align, ENUMS.strokeAlign);
        if (s.dash !== undefined && !(Array.isArray(s.dash) && s.dash.length >= 1 && s.dash.every(isNumber))) {
          this.warn(at, `${label}: the stroke "dash" should be like [4, 4]. It will be ignored.`);
        }
      }
    }
    if (fields.radius !== undefined) {
      const r = fields.radius;
      if (Array.isArray(r)) {
        if (r.length !== 4) this.warn(at, `${label}: "radius" as a list needs 4 values: [topLeft, topRight, bottomRight, bottomLeft]. It will be ignored.`);
        else r.forEach((v) => this.numberValue(c, at, label, 'radius', v));
      } else this.numberValue(c, at, label, 'radius', r);
    }
    if (fields.effect !== undefined) {
      if (!isString(fields.effect)) this.warn(at, `${label}: "effect" should be an effect name. It will be ignored.`);
      else this.uses(c, at, 'effect', fields.effect);
    }
    if (fields.opacity !== undefined && !(isNumber(fields.opacity) && fields.opacity >= 0 && fields.opacity <= 1)) {
      this.warn(at, `${label}: "opacity" must be from 0 to 1. It will be ignored.`);
    }
    for (const key of ['visible', 'clip', 'absolute']) {
      if (fields[key] !== undefined && typeof fields[key] !== 'boolean') this.warn(at, `${label}: "${key}" should be true or false. It will be ignored.`);
    }
    if (fields.absolute === true && parentLayout !== 'auto') {
      this.warn(at, `${label}: "absolute" only matters inside a parent with "layout". It will be ignored.`);
    }
    if (fields.visibleProp !== undefined) this.propLink(ctx, at, label, 'visibleProp', fields.visibleProp, 'boolean');

    if (type === 'frame') {
      this.enumField(at, label, 'layout', fields.layout, ENUMS.layout);
      if (fields.gap !== undefined && fields.gap !== 'auto') this.numberValue(c, at, label, 'gap', fields.gap);
      if (fields.padding !== undefined) {
        const p = fields.padding;
        if (Array.isArray(p)) {
          if (![1, 2, 4].includes(p.length)) this.warn(at, `${label}: "padding" needs 1, 2 or 4 values. It will be ignored.`);
          else p.forEach((v) => this.numberValue(c, at, label, 'padding', v));
        } else this.numberValue(c, at, label, 'padding', p);
      }
      this.enumField(at, label, 'align', fields.align, ENUMS.frameAlign);
      this.enumField(at, label, 'justify', fields.justify, ENUMS.justify);
      if (fields.wrap !== undefined) {
        if (typeof fields.wrap !== 'boolean') this.warn(at, `${label}: "wrap" should be true or false. It will be ignored.`);
        else if (fields.wrap && layer.layout !== 'row') this.warn(at, `${label}: "wrap" only works with "layout": "row". It will be ignored.`);
      }
      if (!hasLayout) {
        for (const key of ['gap', 'padding', 'align', 'justify']) {
          if (fields[key] !== undefined) this.warn(at, `${label}: "${key}" only works with "layout": "row" or "column". It will be ignored.`);
        }
      }
    }

    if (type === 'text') {
      if (fields.text !== undefined && typeof fields.text !== 'string') this.warn(at, `${label}: "text" should be text. It will be ignored.`);
      if (fields.runs !== undefined) {
        if (!Array.isArray(fields.runs) || fields.runs.length === 0) this.warn(at, `${label}: "runs" must be a list like [{ "text": "Pay " }]. It will be ignored.`);
        else {
          if (fields.text !== undefined) this.warn(at, `${label} has both "text" and "runs". The runs are used.`);
          fields.runs.forEach((run, i) => {
            if (!isObject(run) || typeof run.text !== 'string') {
              this.warn(at, `${label}: run ${i + 1} needs "text". It will be left out.`);
              return;
            }
            this.unknownKeys(run, ['text', 'textStyle', 'fill', 'decoration', 'link'], at, `${label}, run ${i + 1},`);
            if (run.textStyle !== undefined) {
              if (isString(run.textStyle)) this.uses(c, at, 'textStyle', run.textStyle);
              else this.warn(at, `${label}: run ${i + 1} has a "textStyle" that isn’t a name. It will be ignored.`);
            }
            if (run.fill !== undefined) this.colourRef(c, at, run.fill);
            this.enumField(at, `${label}, run ${i + 1}`, 'decoration', run.decoration, ENUMS.decoration);
            if (run.link !== undefined && !(isString(run.link) && /^(https?:\/\/|mailto:)/i.test(run.link))) {
              this.warn(at, `${label}: run ${i + 1} has a "link" that isn’t a web address. It will be ignored.`);
            }
          });
        }
      }
      if (layer === fields && fields.text === undefined && fields.runs === undefined) this.warn(at, `${label} has no "text". It will be empty.`);
      if (fields.textStyle !== undefined) {
        if (isString(fields.textStyle)) this.uses(c, at, 'textStyle', fields.textStyle);
        else this.warn(at, `${label}: "textStyle" should be a text style name. It will be ignored.`);
      }
      this.enumField(at, label, 'align', fields.align, ENUMS.textAlign);
      this.enumField(at, label, 'decoration', fields.decoration, ENUMS.decoration);
      if (fields.truncate !== undefined && !(typeof fields.truncate === 'boolean' || (isNumber(fields.truncate) && fields.truncate >= 1))) {
        this.warn(at, `${label}: "truncate" should be true or a number of lines. It will be ignored.`);
      }
      if (fields.textProp !== undefined) this.propLink(ctx, at, label, 'textProp', fields.textProp, 'text');
    }

    if (type === 'instance') {
      if (layer === fields && !isString(fields.component)) {
        this.error(ctx.owner, at, `${ctx.owner.label}: ${label} needs a "component" name.`);
      }
      const compName = isString(layer.component) ? layer.component : null;
      if (fields.component !== undefined && compName && fields === layer) this.uses(c, at, 'component', compName);
      const info = compName ? this.componentInfo(compName) : null;
      if (info && ctx.component && info.name === ctx.component.name) {
        this.error(ctx.owner, at, `${ctx.owner.label} can’t contain an instance of itself.`);
      }
      if (fields.variant !== undefined && info) {
        if (!isObject(fields.variant)) this.error(ctx.owner, at, `${ctx.owner.label}: ${label} has a "variant" that isn’t like { "Style": "Primary" }.`);
        else {
          for (const [prop, value] of Object.entries(fields.variant)) {
            const values = info.variants[prop];
            if (!values) this.error(ctx.owner, at, `${ctx.owner.label}: ${label} picks variant ${q(prop)}, but component ${q(info.name)} has no such variant.${hintList(Object.keys(info.variants))}`);
            else if (!values.includes(value as string)) this.error(ctx.owner, at, `${ctx.owner.label}: ${label} picks ${q(`${prop}=${String(value)}`)}, but ${q(prop)} of ${q(info.name)} is ${list(values)}.`);
          }
          const chosen = { ...defaultCombo(info), ...(fields.variant as Combination) };
          if (info.combos.length && !info.combos.some((combo) => matches(combo, chosen) && matches(chosen, combo))) {
            if (Object.entries(fields.variant).every(([p, v]) => info.variants[p]?.includes(v as string))) {
              this.error(ctx.owner, at, `${ctx.owner.label}: ${label} picks a variant of ${q(info.name)} that is skipped.`);
            }
          }
        }
      }
      if (fields.props !== undefined && info) {
        if (!isObject(fields.props)) this.error(ctx.owner, at, `${ctx.owner.label}: ${label} has "props" that aren’t like { "Label": "Save" }.`);
        else {
          for (const [prop, value] of Object.entries(fields.props)) {
            const type = info.props[prop];
            if (!type) {
              this.error(ctx.owner, at, `${ctx.owner.label}: ${label} sets prop ${q(prop)}, but component ${q(info.name)} has no such prop.${hintList(Object.keys(info.props))}`);
            } else if (type === 'text' && typeof value !== 'string') {
              this.error(ctx.owner, at, `${ctx.owner.label}: ${label} sets text prop ${q(prop)} to something that isn’t text.`);
            } else if (type === 'boolean' && typeof value !== 'boolean') {
              this.error(ctx.owner, at, `${ctx.owner.label}: ${label} sets ${q(prop)} to ${JSON.stringify(value)}; it must be true or false.`);
            } else if (type === 'swap') {
              if (!isString(value)) this.error(ctx.owner, at, `${ctx.owner.label}: ${label} sets swap prop ${q(prop)} to something that isn’t a component name.`);
              else this.uses(c, at, 'component', value);
            }
          }
        }
      }
      if (fields.color !== undefined) this.colourRef(c, at, fields.color);
      if (fields.swapProp !== undefined) this.propLink(ctx, at, label, 'swapProp', fields.swapProp, 'swap');
    }

    if (type === 'svg' && layer === fields) {
      if (!isString(fields.svg)) this.error(ctx.owner, at, `${ctx.owner.label}: ${label} needs "svg": the name of an SVG in the "svgs" list.`);
      else this.uses(c, at, 'svg', fields.svg);
    }

    if (type === 'image') {
      if (layer === fields && fields.src === undefined) this.warn(at, `${label} has no "src". The plugin draws a grey placeholder.`);
      else if (fields.src !== undefined && !(isString(fields.src) && /^data:image\/(png|jpe?g);base64,[A-Za-z0-9+/=\s]+$/.test(fields.src))) {
        this.warn(at, `${label}: "src" must be a data:image/png;base64,… or JPG string. The plugin draws a grey placeholder.`);
      }
      this.enumField(at, label, 'fit', fields.fit, ENUMS.imageFit);
    }
  }

  private propLink(ctx: LayerContext, at: string, label: string, key: string, value: unknown, type: 'text' | 'boolean' | 'swap'): void {
    if (!ctx.component) {
      this.warn(at, `${label}: "${key}" only works inside a component. It will be ignored.`);
      return;
    }
    const actual = isString(value) ? ctx.component.props[value] : undefined;
    if (!isString(value) || actual === undefined) {
      this.error(ctx.owner, at, `${ctx.owner.label}: ${label} has "${key}": ${JSON.stringify(value)}, but the component has no such prop.${hintList(Object.keys(ctx.component.props))}`);
    } else if (actual !== type) {
      this.error(ctx.owner, at, `${ctx.owner.label}: ${label} has "${key}": ${q(value)}, but that prop is a ${actual} prop, not a ${type} prop.`);
    }
  }

  private fill(c: { owner: Owner; part: Part }, at: string, label: string, value: unknown): void {
    if (isHexColor(value)) return;
    if (isObject(value)) {
      this.gradient(c, at, value);
      return;
    }
    if (isString(value) && !value.startsWith('#')) {
      this.uses(c, at, 'fill', value);
      return;
    }
    this.error(c.owner, at, `${c.owner.label}: ${label} has the fill ${q(value)}, which isn’t a colour. Write colours as #RRGGBB, #RRGGBBAA or a colour name.`);
  }

  private numberValue(c: { owner: Owner; part: Part }, at: string, label: string, key: string, value: unknown): void {
    if (isNumber(value)) return;
    if (isString(value)) {
      this.uses(c, at, 'number', value);
      return;
    }
    this.warn(at, `${label}: "${key}" should be a number or a token name. It will be ignored.`);
  }

  private enumField(at: string, label: string, key: string, value: unknown, allowed: readonly string[]): void {
    if (value === undefined || allowed.includes(value as string)) return;
    this.warn(at, `${label}: "${key.split(' ').pop()}" is ${JSON.stringify(value)}; use ${list([...allowed])}. It will be ignored.`);
  }

  // ── Screens ─────────────────────────────────────────────────────────────

  private checkScreens(): void {
    const screens = this.d.screens;
    if (screens === undefined) return;
    if (!Array.isArray(screens)) {
      this.error({ key: 'part:screens', label: 'The screens', skipped: 'The screens will be skipped.' }, 'Screens', '"screens" must be a list: [ { "name": …, "width": …, "height": … } ].');
      return;
    }
    const seen = new Set<string>();
    screens.forEach((s, i) => {
      if (!isObject(s) || !isString(s.name)) {
        this.error(item(`screen#${i}`, `Screen ${i + 1}`, 'This screen will be skipped.'), `Screens › ${i + 1}`, `Screen ${i + 1} needs a "name".`);
        return;
      }
      const owner = item(`screen:${s.name}`, `Screen ${q(s.name)}`, 'This screen will be skipped.');
      const where = owner.label;
      if (seen.has(s.name)) {
        this.error(item(`screen#${i}`, owner.label, 'The second one will be skipped.'), where, `There are two screens named ${q(s.name)}. Names must be unique.`);
        return;
      }
      seen.add(s.name);
      this.unknownKeys(s, SCREEN_KEYS, where, owner.label);
      for (const key of ['width', 'height']) {
        if (!isNumber(s[key]) || (s[key] as number) <= 0) this.error(owner, where, `${owner.label} needs "${key}" in px, like ${key === 'width' ? 393 : 852}.`);
      }
      if (s.mode !== undefined) {
        if (!isString(s.mode)) this.warn(where, `${owner.label}: "mode" should be a mode name. It will use the first mode.`);
        else if (this.modes.length && !this.modes.includes(s.mode)) {
          this.warn(where, `${owner.label} uses mode ${q(s.mode)}, which isn’t one of the modes (${list(this.modes)}). It will use the first mode.`);
        }
      }
      const names = new Map<string, number>();
      const asLayer = { ...s, type: 'frame' };
      delete (asLayer as Json).width;
      delete (asLayer as Json).height;
      delete (asLayer as Json).children;
      this.layerFields(asLayer, asLayer, { owner }, where, owner.label, 'none');
      if (s.children !== undefined) {
        if (!Array.isArray(s.children)) this.warn(where, `${owner.label}: "children" must be a list. It will be ignored.`);
        else {
          const inner = s.layout === 'row' || s.layout === 'column' ? 'auto' : 'none';
          for (const child of s.children) this.layer(child, { owner }, [where], inner, names);
        }
      }
    });
  }

  // ── Prototype ───────────────────────────────────────────────────────────

  private checkPrototype(): void {
    const p = this.d.prototype;
    if (p === undefined) return;
    const part: Part = 'prototype';
    if (!isObject(p)) {
      this.error({ key: 'part:prototype', label: 'The prototype', skipped: 'The prototype will be skipped.' }, 'Prototype', '"prototype" must be a { … } block with "links".');
      return;
    }
    this.unknownKeys(p, ['start', 'links', 'componentLinks'], 'Prototype', 'The prototype');
    if (p.start !== undefined) {
      const owner = item('start', 'The prototype start', 'The start won’t be set.');
      if (!isString(p.start)) this.error(owner, 'Prototype › start', '"start" must be a screen name.');
      else this.uses({ owner, part }, 'Prototype › start', 'screen', p.start);
    }
    if (p.links !== undefined) {
      if (!Array.isArray(p.links)) this.warn('Prototype › links', '"links" must be a list. It will be ignored.');
      else p.links.forEach((link, i) => this.link(link, i));
    }
    if (p.componentLinks !== undefined) {
      if (!Array.isArray(p.componentLinks)) this.warn('Prototype › componentLinks', '"componentLinks" must be a list. It will be ignored.');
      else p.componentLinks.forEach((link, i) => this.componentLink(link, i));
    }
  }

  private linkCommon(owner: Owner, where: string, link: Json): void {
    if (link.on !== undefined && !(ENUMS.trigger as readonly unknown[]).includes(link.on)) {
      this.error(owner, where, `${owner.label} has "on": ${JSON.stringify(link.on)}; use ${list([...ENUMS.trigger])}.`);
    }
    if (link.on === 'afterDelay' && !(isNumber(link.delay) && link.delay >= 0)) {
      this.error(owner, where, `${owner.label} uses "afterDelay", so it needs "delay" in ms, like 1500.`);
    }
    if (link.delay !== undefined && link.on !== 'afterDelay') this.warn(where, `${owner.label}: "delay" only works with "on": "afterDelay". It will be ignored.`);
    if (link.transition !== undefined && !(ENUMS.transition as readonly unknown[]).includes(link.transition)) {
      this.warn(where, `${owner.label}: "transition" is ${JSON.stringify(link.transition)}; use ${list([...ENUMS.transition])}. It will be instant.`);
    }
    const directional = ['moveIn', 'moveOut', 'push', 'slideIn', 'slideOut'].includes(link.transition as string);
    if (link.direction !== undefined) {
      if (!(ENUMS.direction as readonly unknown[]).includes(link.direction)) this.warn(where, `${owner.label}: "direction" is ${JSON.stringify(link.direction)}; use ${list([...ENUMS.direction])}. It will be left.`);
      else if (!directional) this.warn(where, `${owner.label}: "direction" only works with move, push and slide transitions. It will be ignored.`);
    }
    if (link.duration !== undefined && !(isNumber(link.duration) && link.duration >= 0)) this.warn(where, `${owner.label}: "duration" should be a number of ms, like 300. It will be 300.`);
    if (link.easing !== undefined && !(ENUMS.easing as readonly unknown[]).includes(link.easing)) {
      this.warn(where, `${owner.label}: "easing" is ${JSON.stringify(link.easing)}; use ${list([...ENUMS.easing])}. It will be easeOut.`);
    }
  }

  private link(link: unknown, i: number): void {
    const part: Part = 'prototype';
    const fallback = item(`link:${i}`, `Link ${i + 1}`, 'This link will be skipped.');
    const where = `Prototype › link ${i + 1}`;
    if (!isObject(link)) {
      this.error(fallback, where, `Link ${i + 1} must be a { … } block.`);
      return;
    }
    const owner = item(`link:${i}`, `Link ${i + 1}${isString(link.from) ? ` from ${q(link.from)}` : ''}`, 'This link will be skipped.');
    const ctx = { owner, part };
    this.unknownKeys(link, ['from', 'layer', 'on', 'action', 'to', 'transition', 'direction', 'duration', 'easing', 'delay', 'position', 'closeOnOutside', 'background'], where, owner.label);
    if (!isString(link.from)) this.error(owner, where, `${owner.label} needs "from": the screen it starts on.`);
    else if (this.uses(ctx, where, 'screen', link.from) && link.layer !== undefined) {
      if (!isString(link.layer)) this.error(owner, where, `${owner.label}: "layer" must be a layer name.`);
      else {
        const screen = this.screens.get(link.from);
        if (screen && this.find('screen', link.from) !== 'file') {
          const found = findPath(screen, link.layer);
          if (found === 'missing') this.error(owner, where, `${owner.label}: screen ${q(link.from)} has no layer ${q(link.layer)}.`);
          if (found === 'many') this.error(owner, where, `${owner.label}: screen ${q(link.from)} has more than one layer named ${q(link.layer)}. Give it a unique name, or use a path like "Header/Back button".`);
        }
      }
    }
    if (!(ENUMS.action as readonly unknown[]).includes(link.action)) {
      this.error(owner, where, `${owner.label} needs "action": ${list([...ENUMS.action])}.`);
    } else if (['navigate', 'overlay', 'swapOverlay'].includes(link.action as string)) {
      if (!isString(link.to)) this.error(owner, where, `${owner.label} needs "to": the screen to go to.`);
      else this.uses(ctx, where, 'screen', link.to);
    } else if (link.action === 'url') {
      if (!(isString(link.to) && /^https?:\/\//i.test(link.to))) this.error(owner, where, `${owner.label} needs "to": a web address starting with https://.`);
    } else if (link.to !== undefined) {
      this.warn(where, `${owner.label}: "to" isn’t used with "action": ${q(link.action)}. It will be ignored.`);
    }
    const overlay = link.action === 'overlay' || link.action === 'swapOverlay';
    for (const key of ['position', 'closeOnOutside', 'background']) {
      if (link[key] !== undefined && !overlay) this.warn(where, `${owner.label}: "${key}" only works with overlays. It will be ignored.`);
    }
    if (overlay) {
      this.enumField(where, owner.label, 'position', link.position, ENUMS.overlayPosition);
      if (link.closeOnOutside !== undefined && typeof link.closeOnOutside !== 'boolean') this.warn(where, `${owner.label}: "closeOnOutside" should be true or false. It will be ignored.`);
      if (link.background !== undefined && !isHexColor(link.background)) this.warn(where, `${owner.label}: "background" should be a colour like "#00000066". It will be ignored.`);
    }
    this.linkCommon(owner, where, link);
  }

  private componentLink(link: unknown, i: number): void {
    const part: Part = 'prototype';
    const where = `Prototype › component link ${i + 1}`;
    const owner = item(`componentLink:${i}`, `Component link ${i + 1}`, 'This link will be skipped.');
    if (!isObject(link)) {
      this.error(owner, where, `${owner.label} must be a { … } block.`);
      return;
    }
    this.unknownKeys(link, ['component', 'from', 'layer', 'on', 'to', 'transition', 'direction', 'duration', 'easing', 'delay'], where, owner.label);
    if (!isString(link.component)) {
      this.error(owner, where, `${owner.label} needs "component": the component to switch.`);
      return;
    }
    if (!this.uses({ owner, part }, where, 'component', link.component)) return;
    const info = this.componentInfo(link.component)!;
    const ok = this.combo(owner, where, info, link.from, '"from"') && this.combo(owner, where, info, link.to, '"to"');
    if (ok) {
      const from = link.from as Combination;
      const to = link.to as Combination;
      const sources = info.combos.filter((combo) => matches(combo, from));
      if (sources.length === 0) this.error(owner, where, `${owner.label}: no variant of ${q(info.name)} matches "from".`);
      else if (sources.every((combo) => !info.combos.some((target) => matches(target, { ...combo, ...to })))) {
        this.error(owner, where, `${owner.label}: the "to" variant of ${q(info.name)} is skipped, so there’s nothing to switch to.`);
      }
    }
    this.linkCommon(owner, where, link);
  }

  // ── Counts ──────────────────────────────────────────────────────────────

  private counts(): Counts {
    const counts: Counts = { variables: 0, gradients: 0, textStyles: 0, effects: 0, svgs: 0, components: 0, variants: 0, screens: 0, links: 0 };
    const ok = (key: string) => !this.skips.has(key);
    const ds = this.d.designSystem;
    if (this.ticked.has('designSystem') && isObject(ds) && ok('part:designSystem')) {
      const keys = (k: string) => (isObject(ds[k]) ? Object.keys(ds[k] as Json) : []);
      counts.variables = keys('colors').filter((n) => ok(`color:${n}`)).length + ['spacing', 'radius', 'sizes'].flatMap(keys).filter((n) => ok(`number:${n}`)).length;
      counts.gradients = keys('gradients').filter((n) => ok(`gradient:${n}`)).length;
      counts.textStyles = keys('textStyles').filter((n) => ok(`textStyle:${n}`)).length;
      counts.effects = keys('effects').filter((n) => ok(`effect:${n}`)).length;
    }
    if (this.ticked.has('svgs') && ok('part:svgs')) counts.svgs = [...this.svgs.keys()].filter((n) => ok(`svg:${n}`)).length;
    if (this.ticked.has('components') && ok('part:components')) {
      for (const [name, info] of this.components) {
        if (!ok(`component:${name}`)) continue;
        counts.components++;
        counts.variants += info.combos.length;
      }
    }
    if (this.ticked.has('screens') && ok('part:screens')) counts.screens = [...this.screens.keys()].filter((n) => ok(`screen:${n}`)).length;
    const p = this.d.prototype;
    if (this.ticked.has('prototype') && isObject(p) && ok('part:prototype')) {
      if (Array.isArray(p.links)) counts.links += p.links.filter((_, i) => ok(`link:${i}`)).length;
      if (Array.isArray(p.componentLinks)) counts.links += p.componentLinks.filter((_, i) => ok(`componentLink:${i}`)).length;
    }
    return counts;
  }
}

const FILE_OWNER: Owner = { key: 'file', label: 'The file', skipped: '' };

function item(key: string, label: string, skipped: string): Owner {
  return { key, label, skipped };
}

function partOf(owner: Owner): Part {
  const kind = owner.key.split(/[:#]/)[0];
  if (kind === 'screen') return 'screens';
  if (kind === 'component') return 'components';
  if (kind === 'svg') return 'svgs';
  if (kind === 'link' || kind === 'componentLink' || kind === 'start') return 'prototype';
  return 'designSystem';
}

function list(values: string[]): string {
  const quoted = values.map((v) => q(v));
  if (quoted.length <= 1) return quoted.join('');
  return `${quoted.slice(0, -1).join(', ')} or ${quoted[quoted.length - 1]}`;
}

function hintList(values: string[]): string {
  return values.length ? ` It has ${list(values).replace(/ or /, ' and ')}.` : '';
}

function defaultCombo(info: ComponentInfo): Combination {
  return info.combos[0] ?? {};
}

/** The first layer with this name, depth first. */
export function findLayer(root: Json, name: string): Json | null {
  for (const child of Array.isArray(root.children) ? root.children : []) {
    if (!isObject(child)) continue;
    if (child.name === name) return child;
    const inner = findLayer(child, name);
    if (inner) return inner;
  }
  return null;
}

function parentLayoutOf(root: Json, name: string): 'auto' | 'none' {
  const walk = (parent: Json): 'auto' | 'none' | null => {
    for (const child of Array.isArray(parent.children) ? parent.children : []) {
      if (!isObject(child)) continue;
      if (child.name === name) return parent.layout === 'row' || parent.layout === 'column' ? 'auto' : 'none';
      const inner = walk(child);
      if (inner) return inner;
    }
    return null;
  };
  return walk(root) ?? 'none';
}

/** Finds a layer by name or by "Parent/Child" path. */
export function findPath(root: Json, path: string): 'one' | 'many' | 'missing' {
  const all = (node: Json, name: string): Json[] => {
    const out: Json[] = [];
    for (const child of Array.isArray(node.children) ? node.children : []) {
      if (!isObject(child)) continue;
      if (child.name === name) out.push(child);
      out.push(...all(child, name));
    }
    return out;
  };
  const byWhole = all(root, path);
  if (byWhole.length === 1) return 'one';
  if (byWhole.length > 1) return 'many';
  const segments = path.split('/');
  if (segments.length < 2) return 'missing';
  let current = [root];
  for (const segment of segments) {
    current = current.flatMap((node) => all(node, segment));
    if (current.length === 0) return 'missing';
  }
  return current.length === 1 ? 'one' : 'many';
}

/** A close match for a typo, or null. */
function closest(word: string, options: string[]): string | null {
  let best: string | null = null;
  let bestScore = Infinity;
  for (const option of options) {
    const d = distance(word.toLowerCase(), option.toLowerCase());
    if (d < bestScore) {
      best = option;
      bestScore = d;
    }
  }
  return bestScore <= Math.max(1, Math.floor(word.length / 4)) + 1 && bestScore < word.length ? best : null;
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

/** "18 variables · 4 text styles · …" for the parts that will be built. */
export function countsLine(counts: Counts): string {
  const parts: string[] = [];
  if (counts.variables) parts.push(plural(counts.variables, 'variable'));
  if (counts.gradients) parts.push(plural(counts.gradients, 'gradient'));
  if (counts.textStyles) parts.push(plural(counts.textStyles, 'text style'));
  if (counts.effects) parts.push(plural(counts.effects, 'effect'));
  if (counts.svgs) parts.push(plural(counts.svgs, 'SVG'));
  if (counts.components) parts.push(`${plural(counts.components, 'component')} (${plural(counts.variants, 'variant')})`);
  if (counts.screens) parts.push(plural(counts.screens, 'screen'));
  if (counts.links) parts.push(plural(counts.links, 'link'));
  return parts.join(' · ');
}

/** What "Copy problems for your AI" copies. */
export function problemsForAi(problems: Problem[]): string {
  const lines = problems.map((p, i) => `${i + 1}. ${p.kind === 'error' ? 'Error' : 'Warning'}: ${p.message}\n   Where: ${p.where}`);
  return `The Figma plugin found these problems in my JSON file. Please fix them and send me the whole corrected file.\n\n${lines.join('\n')}\n`;
}
