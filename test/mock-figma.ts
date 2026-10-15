// A strict mock of the `figma` global, based on reference/mock-figma-test.js and on the real
// behaviours in HANDOFF.md. It is strict on purpose, so tests fail the way real Figma would:
//
// - Anything the mock doesn't know throws (figma.x, node.x, setting node.x).
// - dynamic-page: instance.mainComponent, figma.getNodeById, sync style/variable getters and
//   pages that weren't loaded all throw.
// - A component set can't be instanced (lesson 2).
// - Cloning loses componentPropertyReferences (lesson 3).
// - Switching an instance's variant or swapping it replaces its children; old ones are dead (lesson 4).
// - resize() resets the auto layout sizing modes; FILL needs an auto layout parent; HUG needs
//   auto layout or text; layoutGrow must be 0 or 1 (lesson 8).
// - Text needs its fonts loaded first (lesson 9).
// - Free plan: one mode per collection, 3 pages (lesson 6).
// - Overlay settings and `reactions` are read-only; links go through setReactionsAsync.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

export interface MockOptions {
  plan?: 'free' | 'professional';
  fonts?: { family: string; style: string }[];
  /** false: Figma drops variable links on gradient stops; "refuse": it throws (to test the fallback). */
  gradientLinks?: boolean | 'refuse';
  /** Extra pages besides "Page 1". */
  pages?: string[];
}

export interface MockFigma {
  figma: PluginAPI;
  calls: {
    showUI: { html: string; options: ShowUIOptions | undefined }[];
    notify: string[];
    posted: unknown[];
    opened: string[];
    zoomed: unknown[][];
  };
  /** Every node made, by id, removed or not. */
  nodes: Map<string, Any>;
  variables: Any[];
  collections: Any[];
  styles: Any[];
  page(name: string): Any;
}

const WEIGHTS = ['Thin', 'Extra Light', 'Light', 'Regular', 'Medium', 'Semi Bold', 'Bold', 'Extra Bold', 'Black'];
export const DEFAULT_FONTS = [
  ...WEIGHTS.flatMap((w) => [
    { family: 'Inter', style: w },
    { family: 'Inter', style: w === 'Regular' ? 'Italic' : `${w} Italic` },
  ]),
  { family: 'Roboto', style: 'Regular' },
  { family: 'Roboto', style: 'Medium' },
  { family: 'Roboto', style: 'Bold' },
];

const DEAD = 'The node does not exist';
const PASS = new Set(['then', 'toJSON', 'constructor', 'inspect', 'nodeType', 'asymmetricMatch', '$$typeof']);

function strict<T extends object>(target: T, label: string): T {
  return new Proxy(target, {
    get(t, key, receiver) {
      // Internal fields ('_x') read as undefined when missing; the public API stays strict.
      if (typeof key === 'symbol' || key in t || PASS.has(key) || key.startsWith('_')) return Reflect.get(t, key, receiver);
      throw new Error(`Mock Figma: ${label}.${key} was used, but the mock doesn't have it.`);
    },
    set(t, key, value, receiver) {
      if (typeof key === 'symbol' || key in t) return Reflect.set(t, key, value, receiver);
      throw new Error(`Mock Figma: can't set ${label}.${String(key)}.`);
    },
  });
}

const copy = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

/** Adds properties with their getters and setters (Object.assign would copy getter values). */
function mix(target: Any, props: Record<string, unknown> & ThisType<Any>): void {
  Object.defineProperties(target, Object.getOwnPropertyDescriptors(props));
}

export function createMockFigma(options: MockOptions = {}): MockFigma {
  const plan = options.plan ?? 'professional';
  const fonts = options.fonts ?? DEFAULT_FONTS;
  const loadedFonts = new Set<string>();
  const fontKey = (f: FontName) => `${f.family}|${f.style}`;
  let ids = 0;
  const nextId = () => `${++ids}:${ids % 7}`;
  const nodes = new Map<string, Any>();
  const variables: Any[] = [];
  const collections: Any[] = [];
  const styles: Any[] = [];
  const calls: MockFigma['calls'] = { showUI: [], notify: [], posted: [], opened: [], zoomed: [] };
  let currentPage: Any;
  let allPagesLoaded = false;

  const requireFont = (font: FontName, what: string) => {
    if (!loadedFonts.has(fontKey(font))) throw new Error(`in ${what}: Cannot write to node with unloaded font "${font.family} ${font.style}". Please call figma.loadFontAsync`);
  };

  // ── Paints and effects ──────────────────────────────────────────────

  const checkPaints = (paints: Any, where: string): Any[] => {
    if (!Array.isArray(paints)) throw new Error(`in ${where}: Expected an array of paints`);
    return paints.map((p) => {
      if (p.type === 'SOLID') {
        const { r, g, b } = p.color ?? {};
        if (![r, g, b].every((n) => typeof n === 'number' && n >= 0 && n <= 1) || 'a' in p.color) throw new Error(`in ${where}: Invalid SOLID color`);
      } else if (/^GRADIENT_/.test(p.type)) {
        if (!Array.isArray(p.gradientTransform) || !Array.isArray(p.gradientStops) || p.gradientStops.length < 2) throw new Error(`in ${where}: Invalid gradient`);
        const stops = p.gradientStops.map((s: Any) => {
          if (typeof s.position !== 'number' || typeof s.color?.a !== 'number') throw new Error(`in ${where}: Invalid color stop`);
          const out = { position: s.position, color: { ...s.color } } as Any;
          if (s.boundVariables?.color && options.gradientLinks === 'refuse') throw new Error(`in ${where}: Invalid color stop: unexpected boundVariables`);
          if (s.boundVariables?.color && options.gradientLinks !== false) out.boundVariables = { color: { ...s.boundVariables.color } };
          return out;
        });
        return Object.freeze({ ...copy({ ...p, gradientStops: undefined }), gradientStops: stops });
      } else if (p.type === 'IMAGE') {
        if (typeof p.imageHash !== 'string' || !['FILL', 'FIT', 'CROP', 'TILE'].includes(p.scaleMode)) throw new Error(`in ${where}: Invalid image paint`);
      } else throw new Error(`in ${where}: Unknown paint type ${p.type}`);
      return Object.freeze(copy(p));
    });
  };

  const checkEffects = (effects: Any[]): Any[] =>
    effects.map((e) => {
      if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
        if (!e.blendMode || typeof e.visible !== 'boolean' || !e.offset || typeof e.radius !== 'number' || typeof e.color?.a !== 'number') throw new Error('in effects: Invalid shadow');
        if (e.type === 'INNER_SHADOW' && 'showShadowBehindNode' in e) throw new Error('in effects: showShadowBehindNode is only for drop shadows');
      } else if (e.type === 'LAYER_BLUR' || e.type === 'BACKGROUND_BLUR') {
        if (e.blurType !== 'NORMAL' || typeof e.radius !== 'number' || typeof e.visible !== 'boolean') throw new Error('in effects: Invalid blur');
      } else throw new Error(`in effects: Unknown effect ${e.type}`);
      return copy(e);
    });

  // ── Nodes ───────────────────────────────────────────────────────────

  const FRAMEY = new Set(['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE']);
  const BINDABLE = new Set(['width', 'height', 'itemSpacing', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'visible', 'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius', 'strokeWeight', 'opacity', 'counterAxisSpacing', 'characters']);

  function makeNode(type: string): Any {
    const id = nextId();
    const frame = FRAMEY.has(type);
    const shape = ['RECTANGLE', 'ELLIPSE', 'VECTOR', 'TEXT'].includes(type);
    const n: Any = {
      id,
      type,
      _name: type === 'FRAME' ? 'Frame' : type.toLowerCase(),
      parent: null,
      _dead: false,
      _removed: false,
      get removed() {
        return this._removed;
      },
      get name() {
        if (this._dead) throw new Error(DEAD);
        return this._name;
      },
      set name(v: string) {
        if (this._dead) throw new Error(DEAD);
        this._name = v;
        if (this.type === 'COMPONENT' && this.parent?.type === 'COMPONENT_SET') this._variantProps = parseVariant(v);
      },
      x: 0,
      y: 0,
      _w: 100,
      _h: 100,
      get width() {
        return this._w;
      },
      get height() {
        return this._h;
      },
      visible: true,
      opacity: 1,
      rotation: 0,
      locked: false,
      constraints: { horizontal: 'MIN', vertical: 'MIN' },
      boundVariables: {} as Any,
      _fills: frame || type === 'TEXT' || type === 'VECTOR' ? [] : [],
      _strokes: [],
      get fills() {
        if (this._dead) throw new Error(DEAD);
        return this._fills;
      },
      set fills(v: Any) {
        if (this._dead) throw new Error(DEAD);
        this._fills = Object.freeze(checkPaints(v, 'fills'));
        this.fillStyleId = '';
      },
      get strokes() {
        if (this._dead) throw new Error(DEAD);
        return this._strokes;
      },
      set strokes(v: Any) {
        if (this._dead) throw new Error(DEAD);
        this._strokes = Object.freeze(checkPaints(v, 'strokes'));
      },
      strokeWeight: 1,
      strokeAlign: type === 'TEXT' ? 'OUTSIDE' : 'INSIDE',
      dashPattern: [],
      fillStyleId: '',
      effectStyleId: '',
      effects: [],
      _reactions: [] as Any[],
      get reactions() {
        return copy(this._reactions);
      },
      set reactions(_v: Any) {
        throw new Error('in set_reactions: Cannot call with documentAccess: dynamic-page. Use node.setReactionsAsync instead.');
      },
      async setReactionsAsync(reactions: Any[]) {
        checkReactions(this, reactions);
        this._reactions = copy(reactions);
      },
      _refs: null as Any,
      get componentPropertyReferences() {
        return this._refs ? { ...this._refs } : null;
      },
      set componentPropertyReferences(refs: Any) {
        setRefs(this, refs);
      },
      _layoutPositioning: 'AUTO',
      get layoutPositioning() {
        return this._layoutPositioning;
      },
      set layoutPositioning(v: string) {
        if (v === 'ABSOLUTE' && !isAuto(this.parent)) throw new Error('in set_layoutPositioning: Can only set layoutPositioning = ABSOLUTE if the parent node has layoutMode !== NONE');
        this._layoutPositioning = v;
      },
      _sizeH: 'FIXED',
      _sizeV: 'FIXED',
      get layoutSizingHorizontal() {
        return this._sizeH;
      },
      set layoutSizingHorizontal(v: string) {
        this._sizeH = checkSizing(this, v, 'Horizontal');
      },
      get layoutSizingVertical() {
        return this._sizeV;
      },
      set layoutSizingVertical(v: string) {
        this._sizeV = checkSizing(this, v, 'Vertical');
      },
      _grow: 0,
      get layoutGrow() {
        return this._grow;
      },
      set layoutGrow(v: number) {
        if (v !== 0 && v !== 1) throw new Error('in set_layoutGrow: Expected 0 or 1');
        this._grow = v;
      },
      resize(w: number, h: number) {
        if (this._dead) throw new Error(DEAD);
        if (!(w >= 0.01 && h >= 0.01)) throw new Error('in resize: Expected width and height >= 0.01');
        this._w = w;
        this._h = h;
        // Lesson 8: resize() resets sizing modes to fixed.
        if (this._layoutMode && this._layoutMode !== 'NONE') {
          this.primaryAxisSizingMode = 'FIXED';
          this.counterAxisSizingMode = 'FIXED';
        }
        this._sizeH = 'FIXED';
        this._sizeV = 'FIXED';
        if (this.type === 'TEXT' && this.textAutoResize === 'WIDTH_AND_HEIGHT') this.textAutoResize = 'NONE';
      },
      resizeWithoutConstraints(w: number, h: number) {
        this._w = w;
        this._h = h;
      },
      rescale(s: number) {
        this._w *= s;
        this._h *= s;
      },
      remove() {
        if (this._removed) throw new Error(DEAD);
        detach(this);
        const kill = (x: Any) => {
          x._removed = true;
          (x._children ?? []).forEach(kill);
        };
        kill(this);
      },
      setBoundVariable(field: string, variable: Any) {
        if (typeof variable === 'string') throw new Error('in setBoundVariable: Cannot call with a variable id under documentAccess: dynamic-page. Pass the variable.');
        if (!BINDABLE.has(field)) throw new Error(`in setBoundVariable: ${field} can't be bound`);
        if (variable && !variables.includes(variable)) throw new Error('in setBoundVariable: unknown variable');
        if (variable && variable.resolvedType !== 'FLOAT' && field !== 'visible' && field !== 'characters') throw new Error(`in setBoundVariable: ${field} needs a number variable`);
        if (field === 'cornerRadius' || /Radius$/.test(field)) {
          if (!('topLeftRadius' in this) && field !== 'cornerRadius') throw new Error(`in setBoundVariable: ${this.type} has no ${field}`);
        }
        this.boundVariables = { ...this.boundVariables, [field]: variable ? { type: 'VARIABLE_ALIAS', id: variable.id } : undefined };
      },
      async setFillStyleIdAsync(styleId: string) {
        const style = styles.find((s) => s.id === styleId && s.type === 'PAINT');
        if (!style) throw new Error('in setFillStyleIdAsync: style not found');
        this._fills = style.paints;
        this.fillStyleId = styleId;
      },
      async setEffectStyleIdAsync(styleId: string) {
        const style = styles.find((s) => s.id === styleId && s.type === 'EFFECT');
        if (!style) throw new Error('in setEffectStyleIdAsync: style not found');
        this.effects = copy(style.effects);
        this.effectStyleId = styleId;
      },
      clone() {
        return cloneNode(this, false);
      },
    };
    if (shape && type !== 'TEXT') n.cornerRadius = 0;
    if (type === 'RECTANGLE' || frame) Object.assign(n, { cornerRadius: 0, topLeftRadius: 0, topRightRadius: 0, bottomLeftRadius: 0, bottomRightRadius: 0 });
    if (type === 'RECTANGLE') n._fills = Object.freeze([{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 }, opacity: 1 }]);
    if (type === 'ELLIPSE') n._fills = Object.freeze([{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 }, opacity: 1 }]);
    if (type === 'FRAME') n._fills = Object.freeze([{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 1 }]);
    if (frame) addFrame(n);
    if (type === 'TEXT') addText(n);
    nodes.set(id, n);
    const p = strict(n, type);
    n._self = p;
    return p;
  }

  function addChildren(n: Any) {
    mix(n, {
      _children: [] as Any[],
      get children() {
        if (this._dead) throw new Error(DEAD);
        if (this.type === 'PAGE' && !this._loaded) throw new Error(`Cannot access children on a page that has not been explored. Call \`await page.loadAsync()\` first.`);
        return Object.freeze([...this._children]);
      },
      appendChild(child: Any) {
        if (this._dead) throw new Error(DEAD);
        if (child.type === 'PAGE') throw new Error('in appendChild: Cannot move a page');
        if (this.type === 'COMPONENT_SET' && child.type !== 'COMPONENT') throw new Error('in appendChild: Component sets can only contain components');
        if (this.type === 'INSTANCE') throw new Error('in appendChild: Cannot add children to an instance');
        detach(child);
        child.parent = this._self;
        this._children.push(child);
      },
      insertChild(index: number, child: Any) {
        detach(child);
        child.parent = this._self;
        this._children.splice(index, 0, child);
      },
      findAll(fn?: (x: Any) => boolean) {
        if (this.type === 'PAGE' && !this._loaded) throw new Error('in findAll: Call page.loadAsync() first');
        const out: Any[] = [];
        const walk = (x: Any) => {
          for (const c of x._children ?? []) {
            if (!fn || fn(c)) out.push(c);
            walk(c);
          }
        };
        walk(this);
        return out;
      },
      findOne(fn: (x: Any) => boolean) {
        return this.findAll(fn)[0] ?? null;
      },
      findAllWithCriteria(criteria: { types: string[] }) {
        if (this.type === 'PAGE' && !this._loaded && !allPagesLoaded) {
          throw new Error('in findAllWithCriteria: If the manifest contains "documentAccess": "dynamic-page", you must first call figma.loadAllPagesAsync');
        }
        return this.findAll((x: Any) => criteria.types.includes(x.type));
      },
    });
  }

  function addFrame(n: Any) {
    addChildren(n);
    mix(n, {
      clipsContent: true,
      _layoutMode: 'NONE',
      get layoutMode() {
        return this._layoutMode;
      },
      set layoutMode(v: string) {
        if (this.type === 'INSTANCE') throw new Error('in set_layoutMode: Cannot change layout of an instance');
        this._layoutMode = v;
      },
      primaryAxisSizingMode: 'FIXED',
      counterAxisSizingMode: 'FIXED',
      _primary: 'MIN',
      get primaryAxisAlignItems() {
        return this._primary;
      },
      set primaryAxisAlignItems(v: string) {
        if (!['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN'].includes(v)) throw new Error('in primaryAxisAlignItems: bad value');
        this._primary = v;
      },
      _counter: 'MIN',
      get counterAxisAlignItems() {
        return this._counter;
      },
      set counterAxisAlignItems(v: string) {
        if (!['MIN', 'CENTER', 'MAX', 'BASELINE'].includes(v)) throw new Error('in counterAxisAlignItems: bad value');
        if (v === 'BASELINE' && this._layoutMode !== 'HORIZONTAL') throw new Error('in counterAxisAlignItems: BASELINE needs horizontal layout');
        this._counter = v;
      },
      _wrap: 'NO_WRAP',
      get layoutWrap() {
        return this._wrap;
      },
      set layoutWrap(v: string) {
        if (v === 'WRAP' && this._layoutMode !== 'HORIZONTAL') throw new Error('in layoutWrap: WRAP needs horizontal layout');
        this._wrap = v;
      },
      itemSpacing: 0,
      counterAxisSpacing: 0,
      paddingLeft: 0,
      paddingRight: 0,
      paddingTop: 0,
      paddingBottom: 0,
      _explicitModes: {} as Record<string, string>,
      get explicitVariableModes() {
        return { ...this._explicitModes };
      },
      setExplicitVariableModeForCollection(collection: Any, modeId: string) {
        if (typeof collection === 'string') throw new Error('in setExplicitVariableModeForCollection: Cannot call with a collection id under documentAccess: dynamic-page. Pass the collection.');
        if (!collection.modes.some((m: Any) => m.modeId === modeId)) throw new Error('in setExplicitVariableModeForCollection: mode not in collection');
        this._explicitModes[collection.id] = modeId;
      },
      get overlayPositionType() {
        return 'CENTER';
      },
      set overlayPositionType(_v: Any) {
        throw new Error('Cannot assign to read only property overlayPositionType');
      },
      get overlayBackground() {
        return { type: 'NONE' };
      },
      set overlayBackground(_v: Any) {
        throw new Error('Cannot assign to read only property overlayBackground');
      },
      get overlayBackgroundInteraction() {
        return 'NONE';
      },
      set overlayBackgroundInteraction(_v: Any) {
        throw new Error('Cannot assign to read only property overlayBackgroundInteraction');
      },
    });
    if (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') addComponent(n);
    if (n.type === 'INSTANCE') addInstance(n);
  }

  function addText(n: Any) {
    mix(n, {
      _font: { family: 'Inter', style: 'Regular' },
      get fontName() {
        return { ...this._font };
      },
      set fontName(v: FontName) {
        requireFont(v, 'set_fontName');
        this._font = { ...v };
      },
      _chars: '',
      get characters() {
        return this._chars;
      },
      set characters(v: string) {
        requireFont(this._font, 'set_characters');
        this._chars = v;
        this._ranges = [];
      },
      fontSize: 12,
      textStyleId: '',
      textAutoResize: 'WIDTH_AND_HEIGHT',
      textAlignHorizontal: 'LEFT',
      textTruncation: 'DISABLED',
      _maxLines: null as number | null,
      get maxLines() {
        return this._maxLines;
      },
      set maxLines(v: number | null) {
        if (v !== null && (!Number.isInteger(v) || v < 1)) throw new Error('in maxLines: Expected a positive integer');
        this._maxLines = v;
      },
      textDecoration: 'NONE',
      _ranges: [] as Any[],
      async setTextStyleIdAsync(styleId: string) {
        const style = styles.find((s) => s.id === styleId && s.type === 'TEXT');
        if (!style) throw new Error('in setTextStyleIdAsync: style not found');
        requireFont(style.fontName, 'setTextStyleIdAsync');
        this._font = { ...style.fontName };
        this.fontSize = style.fontSize;
        this.textStyleId = styleId;
      },
      async setRangeTextStyleIdAsync(start: number, end: number, styleId: string) {
        checkRange(this, start, end);
        const style = styles.find((s) => s.id === styleId && s.type === 'TEXT');
        if (!style) throw new Error('in setRangeTextStyleIdAsync: style not found');
        requireFont(style.fontName, 'setRangeTextStyleIdAsync');
        this._ranges.push({ start, end, textStyleId: styleId });
      },
      setRangeFills(start: number, end: number, paints: Any[]) {
        checkRange(this, start, end);
        this._ranges.push({ start, end, fills: checkPaints(paints, 'setRangeFills') });
      },
      setRangeTextDecoration(start: number, end: number, value: string) {
        checkRange(this, start, end);
        this._ranges.push({ start, end, textDecoration: value });
      },
      setRangeHyperlink(start: number, end: number, value: Any) {
        checkRange(this, start, end);
        if (value && (value.type !== 'URL' || typeof value.value !== 'string')) throw new Error('in setRangeHyperlink: bad link');
        this._ranges.push({ start, end, hyperlink: value });
      },
    });
  }

  function checkRange(n: Any, start: number, end: number) {
    if (!(start >= 0 && end <= n._chars.length && start < end)) throw new Error(`in range: Invalid range ${start}–${end} for ${n._chars.length} characters`);
  }

  // ── Components and instances ────────────────────────────────────────

  function addComponent(n: Any) {
    mix(n, {
      description: '',
      _props: {} as Record<string, Any>,
      key: `key-${n.id}`,
      get componentPropertyDefinitions() {
        if (this.type === 'COMPONENT' && this.parent?.type === 'COMPONENT_SET') {
          throw new Error('in get_componentPropertyDefinitions: Can only get component property definitions of a component set or non-variant component');
        }
        const out: Record<string, Any> = copy(this._props);
        if (this.type === 'COMPONENT_SET') {
          const options: Record<string, string[]> = {};
          for (const child of this._children) {
            for (const [k, v] of Object.entries(child._variantProps ?? {})) {
              options[k] = options[k] ?? [];
              if (!options[k].includes(v as string)) options[k].push(v as string);
            }
          }
          for (const [k, values] of Object.entries(options)) out[k] = { type: 'VARIANT', defaultValue: values[0], variantOptions: values };
        }
        return out;
      },
      addComponentProperty(name: string, type: string, defaultValue: Any) {
        if (this.type === 'COMPONENT' && this.parent?.type === 'COMPONENT_SET') throw new Error('in addComponentProperty: Can only add component properties to a component set or non-variant component');
        if (!['TEXT', 'BOOLEAN', 'INSTANCE_SWAP'].includes(type)) throw new Error(`in addComponentProperty: bad type ${type}`);
        if (Object.keys(this._props).some((k) => k.split('#')[0] === name)) throw new Error(`in addComponentProperty: Property "${name}" already exists`);
        if (type === 'TEXT' && typeof defaultValue !== 'string') throw new Error('in addComponentProperty: TEXT default must be a string');
        if (type === 'BOOLEAN' && typeof defaultValue !== 'boolean') throw new Error('in addComponentProperty: BOOLEAN default must be a boolean');
        if (type === 'INSTANCE_SWAP') {
          const target = nodes.get(defaultValue);
          if (!target || target.type !== 'COMPONENT') throw new Error('in addComponentProperty: INSTANCE_SWAP default must be a component id');
        }
        const key = `${name}#${nextId()}`;
        this._props[key] = { type, defaultValue };
        return key;
      },
    });
    if (n.type === 'COMPONENT') {
      mix(n, {
        _variantProps: null as Record<string, string> | null,
        get variantProperties() {
          return this.parent?.type === 'COMPONENT_SET' ? { ...(this._variantProps ?? {}) } : null;
        },
        createInstance() {
          if (this._removed) throw new Error(DEAD);
          return makeInstance(this._self);
        },
      });
    } else {
      mix(n, {
        // Lesson 2: a component set can't be instanced.
        get createInstance() {
          return undefined;
        },
        get defaultVariant() {
          return this._children[0];
        },
      });
    }
  }

  function addInstance(n: Any) {
    mix(n, {
      _main: null as Any,
      get mainComponent() {
        throw new Error('in get_mainComponent: Cannot call with documentAccess: dynamic-page. Use node.getMainComponentAsync instead.');
      },
      set mainComponent(_v: Any) {
        throw new Error('in set_mainComponent: use swapComponent');
      },
      async getMainComponentAsync() {
        return this._main;
      },
      get variantProperties() {
        return this._main?.parent?.type === 'COMPONENT_SET' ? { ...this._main._variantProps } : null;
      },
      _propValues: {} as Record<string, Any>,
      get componentProperties() {
        const out: Record<string, Any> = {};
        const owner = this._main.parent?.type === 'COMPONENT_SET' ? this._main.parent : this._main;
        for (const [k, def] of Object.entries(owner._props as Record<string, Any>)) out[k] = { type: def.type, value: k in this._propValues ? this._propValues[k] : def.defaultValue };
        for (const [k, v] of Object.entries(this.variantProperties ?? {})) out[k] = { type: 'VARIANT', value: v };
        return out;
      },
      setProperties(values: Record<string, Any>) {
        const props = this.componentProperties;
        for (const [key, value] of Object.entries(values)) {
          if (props[key]?.type === 'VARIANT') {
            const set = this._main.parent;
            const want = { ...this._main._variantProps, [key]: value };
            const target = set._children.find((c: Any) => Object.entries(want).every(([k, v]) => c._variantProps?.[k] === v));
            if (!target) throw new Error(`in setProperties: no variant with ${key}=${value}`);
            if (target !== this._main) {
              this._main = target;
              replaceChildren(this, target); // lesson 4
            }
            continue;
          }
          if (!(key in props)) throw new Error(`in setProperties: Could not find a component property with name: '${key}'`);
          if (props[key].type === 'INSTANCE_SWAP') {
            const target = nodes.get(value);
            if (!target || target.type !== 'COMPONENT') throw new Error('in setProperties: INSTANCE_SWAP needs a component id');
            for (const sub of this.findAll((x: Any) => x._refs?.mainComponent === key)) {
              sub._main = target;
              replaceChildren(sub, target);
            }
          } else if (props[key].type === 'TEXT') {
            if (typeof value !== 'string') throw new Error('in setProperties: TEXT needs a string');
            for (const sub of this.findAll((x: Any) => x._refs?.characters === key)) sub._chars = value;
          } else if (props[key].type === 'BOOLEAN') {
            if (typeof value !== 'boolean') throw new Error('in setProperties: BOOLEAN needs true or false');
            for (const sub of this.findAll((x: Any) => x._refs?.visible === key)) sub.visible = value;
          }
          this._propValues[key] = value;
        }
      },
      swapComponent(component: Any) {
        this._main = component;
        replaceChildren(this, component);
      },
    });
  }

  function makeInstance(main: Any): Any {
    const inst = makeNode('INSTANCE');
    const raw = nodes.get(inst.id);
    raw._main = main;
    raw._w = main._w;
    raw._h = main._h;
    raw._layoutMode = main._layoutMode;
    raw._fills = main._fills;
    raw._strokes = main._strokes;
    raw.clipsContent = main.clipsContent;
    raw._refs = null;
    for (const child of main._children) raw._children.push(withParent(cloneNode(child, true), inst));
    return inst;
  }

  function replaceChildren(inst: Any, main: Any) {
    const raw = nodes.get(inst.id) ?? inst;
    const kill = (x: Any) => {
      x._dead = true;
      (x._children ?? []).forEach(kill);
    };
    raw._children.forEach(kill);
    raw._children = [];
    for (const child of main._children) raw._children.push(withParent(cloneNode(child, true), inst));
  }

  function withParent(child: Any, parent: Any) {
    child.parent = parent;
    return child;
  }

  /** keepRefs: instance sublayers keep their prop links; clone() loses them (lesson 3). */
  function cloneNode(source: Any, keepRefs: boolean): Any {
    const raw = nodes.get(source.id) ?? source;
    if (raw.type === 'INSTANCE') {
      const inst = makeInstance(raw._main);
      const r = nodes.get(inst.id);
      Object.assign(r, { _name: raw._name, x: raw.x, y: raw.y, _w: raw._w, _h: raw._h, visible: raw.visible, _propValues: copy(raw._propValues) });
      if (keepRefs) r._refs = raw._refs ? { ...raw._refs } : null;
      r._fills = raw._fills;
      r._strokes = raw._strokes;
      r._children.forEach((c: Any) => (c._dead = true));
      r._children = raw._children.map((c: Any) => withParent(cloneNode(c, keepRefs), inst));
      return inst;
    }
    const c = makeNode(raw.type === 'COMPONENT' ? 'FRAME' : raw.type);
    const r = nodes.get(c.id);
    for (const key of ['_name', 'x', 'y', '_w', '_h', 'visible', 'opacity', 'rotation', '_fills', '_strokes', 'strokeWeight', 'cornerRadius', 'effects', 'effectStyleId', 'fillStyleId', '_layoutMode', 'itemSpacing', '_chars', '_font', 'constraints', 'clipsContent']) {
      if (key in raw && key in r) r[key] = copy(raw[key]);
    }
    r._fills = raw._fills;
    r._strokes = raw._strokes;
    r._reactions = copy(raw._reactions);
    r.boundVariables = copy(raw.boundVariables);
    r._refs = keepRefs && raw._refs ? { ...raw._refs } : null;
    for (const child of raw._children ?? []) r._children.push(withParent(cloneNode(child, keepRefs), c));
    return c;
  }

  function setRefs(n: Any, refs: Any) {
    if (refs === null) {
      n._refs = null;
      return;
    }
    let owner = n.parent;
    while (owner && owner.type !== 'COMPONENT' && owner.type !== 'COMPONENT_SET') owner = owner.parent;
    if (!owner) throw new Error('in set_componentPropertyReferences: Can only set references on a component sublayer');
    const container = owner.type === 'COMPONENT' && owner.parent?.type === 'COMPONENT_SET' ? owner.parent : owner;
    for (const [field, key] of Object.entries(refs as Record<string, string>)) {
      const def = container._props[key];
      if (!def) throw new Error(`in set_componentPropertyReferences: Could not find a component property with name: '${key}'`);
      const ok = (field === 'characters' && n.type === 'TEXT' && def.type === 'TEXT') || (field === 'visible' && def.type === 'BOOLEAN') || (field === 'mainComponent' && n.type === 'INSTANCE' && def.type === 'INSTANCE_SWAP');
      if (!ok) throw new Error(`in set_componentPropertyReferences: ${field} can't link to a ${def.type} property on a ${n.type}`);
    }
    n._refs = { ...refs };
  }

  function parseVariant(name: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const part of name.split(',')) {
      const [k, v] = part.split('=').map((s) => s.trim());
      if (k && v !== undefined) out[k] = v;
    }
    return out;
  }

  // ── Layout rules ────────────────────────────────────────────────────

  const isAuto = (n: Any) => !!n && typeof n._layoutMode === 'string' && n._layoutMode !== 'NONE';

  function checkSizing(n: Any, value: string, axis: string): string {
    if (value === 'FILL' && (!isAuto(n.parent) || n._layoutPositioning === 'ABSOLUTE')) {
      throw new Error(`in set_layoutSizing${axis}: FILL can only be set on children of auto-layout frames`);
    }
    if (value === 'HUG' && !(isAuto(n) || n.type === 'TEXT')) {
      throw new Error(`in set_layoutSizing${axis}: HUG can only be set on auto-layout frames and text nodes`);
    }
    if (value === 'FIXED' && !isAuto(n) && !isAuto(n.parent)) {
      throw new Error(`in set_layoutSizing${axis}: Can only set on auto-layout frames and their children`);
    }
    if (isAuto(n)) {
      const primary = (n._layoutMode === 'HORIZONTAL') === (axis === 'Horizontal');
      const mode = value === 'HUG' ? 'AUTO' : 'FIXED';
      if (primary) n.primaryAxisSizingMode = mode;
      else n.counterAxisSizingMode = mode;
    }
    return value;
  }

  // ── Prototype ───────────────────────────────────────────────────────

  function checkReactions(n: Any, reactions: Any[]) {
    for (const r of reactions) {
      if (!r.trigger || !Array.isArray(r.actions) || r.actions.length === 0) throw new Error('in setReactionsAsync: every reaction needs a trigger and actions');
      if (!['ON_CLICK', 'ON_PRESS', 'ON_HOVER', 'ON_DRAG', 'AFTER_TIMEOUT'].includes(r.trigger.type)) throw new Error(`in setReactionsAsync: bad trigger ${r.trigger.type}`);
      if (r.trigger.type === 'AFTER_TIMEOUT' && typeof r.trigger.timeout !== 'number') throw new Error('in setReactionsAsync: AFTER_TIMEOUT needs timeout');
      for (const a of r.actions) {
        if (a.type === 'BACK' || a.type === 'CLOSE') continue;
        if (a.type === 'URL') {
          if (typeof a.url !== 'string') throw new Error('in setReactionsAsync: URL needs url');
          continue;
        }
        if (a.type !== 'NODE') throw new Error(`in setReactionsAsync: bad action ${a.type}`);
        const dest = nodes.get(a.destinationId);
        if (!dest || dest._removed) throw new Error('in setReactionsAsync: destination not found');
        if (a.navigation === 'CHANGE_TO') {
          if (dest.type !== 'COMPONENT' || dest.parent?.type !== 'COMPONENT_SET') throw new Error('in setReactionsAsync: CHANGE_TO needs a variant');
          let owner = n;
          while (owner && owner.type !== 'COMPONENT') owner = owner.parent;
          if (!owner || owner.parent !== dest.parent) throw new Error('in setReactionsAsync: CHANGE_TO must go to a variant of the same set');
        } else if (['NAVIGATE', 'OVERLAY', 'SWAP'].includes(a.navigation)) {
          if (dest.type !== 'FRAME' || dest.parent?.type !== 'PAGE') throw new Error('in setReactionsAsync: destination must be a top-level frame');
        } else throw new Error(`in setReactionsAsync: bad navigation ${a.navigation}`);
        const t = a.transition;
        if (t !== null) {
          if (!t || typeof t.duration !== 'number' || !t.easing?.type) throw new Error('in setReactionsAsync: bad transition');
          if (['MOVE_IN', 'MOVE_OUT', 'PUSH', 'SLIDE_IN', 'SLIDE_OUT'].includes(t.type)) {
            if (!['LEFT', 'RIGHT', 'TOP', 'BOTTOM'].includes(t.direction) || typeof t.matchLayers !== 'boolean') throw new Error('in setReactionsAsync: directional transitions need direction and matchLayers');
          } else if (!['DISSOLVE', 'SMART_ANIMATE', 'SCROLL_ANIMATE'].includes(t.type)) throw new Error(`in setReactionsAsync: bad transition ${t.type}`);
          if (!['LINEAR', 'EASE_IN', 'EASE_OUT', 'EASE_IN_AND_OUT', 'GENTLE', 'QUICK', 'BOUNCY', 'SLOW'].includes(t.easing.type)) throw new Error('in setReactionsAsync: bad easing');
        }
      }
    }
  }

  function detach(child: Any) {
    const parent = child.parent ? nodes.get(child.parent.id) ?? child.parent : null;
    if (parent?._children) parent._children = parent._children.filter((c: Any) => c !== child);
    child.parent = null;
  }

  // ── Pages and document ──────────────────────────────────────────────

  function makePage(name: string): Any {
    const p: Any = {
      id: nextId(),
      type: 'PAGE',
      name,
      parent: null,
      removed: false,
      _loaded: false,
      selection: [] as Any[],
      _flow: [] as Any[],
      get flowStartingPoints() {
        return copy(this._flow);
      },
      set flowStartingPoints(points: Any[]) {
        for (const point of points) {
          const node = nodes.get(point.nodeId);
          if (!node || node.parent !== this._self || node.type !== 'FRAME') throw new Error('in set_flowStartingPoints: a starting point must be a top-level frame on this page');
        }
        this._flow = copy(points);
      },
      async loadAsync() {
        this._loaded = true;
      },
    };
    addChildren(p);
    nodes.set(p.id, p);
    const proxy = strict(p, 'PAGE');
    p._self = proxy;
    return proxy;
  }

  const pages: Any[] = [makePage('Page 1'), ...(options.pages ?? []).map(makePage)];
  nodes.get(pages[0].id)._loaded = true;
  currentPage = pages[0];
  const root = strict(
    {
      type: 'DOCUMENT',
      get children() {
        return Object.freeze([...pages]);
      },
    },
    'root',
  );
  for (const p of pages) nodes.get(p.id).parent = root;

  // ── Variables and styles ────────────────────────────────────────────

  function makeCollection(name: string): Any {
    const c: Any = {
      id: `VariableCollectionId:${nextId()}`,
      name,
      modes: [{ modeId: `${nextId()}`, name: 'Mode 1' }],
      get defaultModeId() {
        return this.modes[0].modeId;
      },
      get variableIds() {
        return variables.filter((v) => v.variableCollectionId === this.id).map((v) => v.id);
      },
      addMode(modeName: string) {
        if (plan === 'free' && this.modes.length >= 1) throw new Error('in addMode: Limited to 1 modes only');
        const modeId = nextId();
        this.modes = [...this.modes, { modeId, name: modeName }];
        for (const v of variables.filter((x) => x.variableCollectionId === this.id)) v.valuesByMode[modeId] = copy(v.valuesByMode[this.defaultModeId]);
        return modeId;
      },
      renameMode(modeId: string, newName: string) {
        const mode = this.modes.find((m: Any) => m.modeId === modeId);
        if (!mode) throw new Error('in renameMode: mode not found');
        this.modes = this.modes.map((m: Any) => (m.modeId === modeId ? { ...m, name: newName } : m));
      },
      remove() {
        collections.splice(collections.indexOf(proxy), 1);
      },
    };
    const proxy = strict(c, 'VariableCollection');
    collections.push(proxy);
    return proxy;
  }

  function makeVariable(name: string, collection: Any, type: string): Any {
    if (typeof collection === 'string') throw new Error('in createVariable: Cannot call with a collection id under documentAccess: dynamic-page. Pass the collection.');
    if (!collections.includes(collection)) throw new Error('in createVariable: unknown collection');
    if (variables.some((v) => v.variableCollectionId === collection.id && v.name === name)) throw new Error(`in createVariable: A variable named "${name}" already exists in this collection`);
    const v: Any = {
      id: `VariableID:${nextId()}`,
      name,
      resolvedType: type,
      variableCollectionId: collection.id,
      valuesByMode: {} as Record<string, Any>,
      scopes: ['ALL_SCOPES'],
      setValueForMode(modeId: string, value: Any) {
        const c = collections.find((x) => x.id === this.variableCollectionId);
        if (!c.modes.some((m: Any) => m.modeId === modeId)) throw new Error('in setValueForMode: mode not in collection');
        if (value?.type === 'VARIABLE_ALIAS') {
          const target = variables.find((x) => x.id === value.id);
          if (!target || target.resolvedType !== this.resolvedType) throw new Error('in setValueForMode: alias must point to a variable of the same type');
          if (target === this._self) throw new Error('in setValueForMode: a variable can’t alias itself');
        } else if (this.resolvedType === 'COLOR' && !(value && ['r', 'g', 'b'].every((k) => typeof value[k] === 'number'))) {
          throw new Error('in setValueForMode: Expected a color');
        } else if (this.resolvedType === 'FLOAT' && typeof value !== 'number') throw new Error('in setValueForMode: Expected a number');
        this.valuesByMode[modeId] = copy(value);
      },
      remove() {
        variables.splice(variables.indexOf(this._self), 1);
      },
    };
    for (const m of collection.modes) v.valuesByMode[m.modeId] = type === 'COLOR' ? { r: 0, g: 0, b: 0, a: 1 } : 0;
    const proxy = strict(v, 'Variable');
    v._self = proxy;
    variables.push(proxy);
    return proxy;
  }

  function makeStyle(type: 'PAINT' | 'TEXT' | 'EFFECT'): Any {
    const s: Any = {
      id: `S:${nextId()}`,
      type,
      name: '',
      description: '',
      remove() {
        styles.splice(styles.indexOf(proxy), 1);
      },
    };
    if (type === 'PAINT') {
      mix(s, {
        _paints: [] as Any[],
        get paints() {
          return this._paints;
        },
        set paints(v: Any) {
          this._paints = Object.freeze(checkPaints(v, 'paints'));
        },
      });
    }
    if (type === 'EFFECT') {
      mix(s, {
        _effects: [] as Any[],
        get effects() {
          return copy(this._effects);
        },
        set effects(v: Any) {
          this._effects = checkEffects(v);
        },
      });
    }
    if (type === 'TEXT') {
      mix(s, {
        _font: { family: 'Inter', style: 'Regular' },
        get fontName() {
          return { ...this._font };
        },
        set fontName(v: FontName) {
          requireFont(v, 'set_fontName');
          this._font = { ...v };
        },
        fontSize: 12,
        lineHeight: { unit: 'AUTO' },
        letterSpacing: { unit: 'PIXELS', value: 0 },
        textCase: 'ORIGINAL',
        textDecoration: 'NONE',
      });
    }
    const proxy = strict(s, `${type} style`);
    styles.push(proxy);
    return proxy;
  }

  // ── SVG ─────────────────────────────────────────────────────────────

  function nodeFromSvg(svg: string): Any {
    if (typeof svg !== 'string' || !/<svg[\s>]/i.test(svg)) throw new Error('in createNodeFromSvg: Failed to parse SVG');
    const attr = (tag: string, name: string) => new RegExp(`\\s${name}=['"]([^'"]*)['"]`).exec(tag)?.[1];
    const head = /<svg[^>]*>/i.exec(svg)![0];
    const frame = makeNode('FRAME');
    const raw = nodes.get(frame.id);
    raw._fills = Object.freeze([]);
    raw._name = 'svg';
    const viewBox = attr(head, 'viewBox')?.split(/[\s,]+/).map(Number);
    raw._w = Number(attr(head, 'width')) || viewBox?.[2] || 100;
    raw._h = Number(attr(head, 'height')) || viewBox?.[3] || 100;
    const rootFill = attr(head, 'fill');
    for (const match of svg.matchAll(/<(path|circle|rect|line|polyline|polygon|ellipse)\b[^>]*>/gi)) {
      const tag = match[0];
      const v = makeNode('VECTOR');
      const vr = nodes.get(v.id);
      const fill = attr(tag, 'fill') ?? rootFill ?? '#000000';
      const stroke = attr(tag, 'stroke');
      vr._fills = Object.freeze(fill === 'none' ? [] : [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1 }]);
      vr._strokes = Object.freeze(!stroke || stroke === 'none' ? [] : [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1 }]);
      vr._w = raw._w;
      vr._h = raw._h;
      raw._children.push(v);
      vr.parent = frame;
    }
    currentPage.appendChild(frame);
    return frame;
  }

  // ── The figma global ────────────────────────────────────────────────

  const ui = strict(
    {
      postMessage(message: unknown) {
        calls.posted.push(message);
      },
      onmessage: undefined as unknown,
      on() {},
    },
    'figma.ui',
  );

  const append = (node: Any) => {
    currentPage.appendChild(node);
    return node;
  };

  const api: Any = {
    showUI(html: string, opts?: ShowUIOptions) {
      calls.showUI.push({ html, options: opts });
    },
    ui,
    notify(message: string) {
      calls.notify.push(message);
      return { cancel() {} };
    },
    closePlugin() {},
    on() {},
    openExternal(url: string) {
      calls.opened.push(url);
    },
    root,
    get currentPage() {
      return currentPage;
    },
    set currentPage(_v: Any) {
      throw new Error('in set_currentPage: Cannot call with documentAccess: dynamic-page. Use figma.setCurrentPageAsync instead.');
    },
    async setCurrentPageAsync(page: Any) {
      await page.loadAsync();
      currentPage = page;
    },
    async loadAllPagesAsync() {
      allPagesLoaded = true;
      for (const p of pages) nodes.get(p.id)._loaded = true;
    },
    createPage() {
      if (plan === 'free' && pages.length >= 3) throw new Error('The Starter plan only comes with 3 pages. Upgrade to Professional for unlimited pages.');
      const page = makePage('Page');
      nodes.get(page.id)._loaded = true;
      nodes.get(page.id).parent = root;
      pages.push(page);
      return page;
    },
    getNodeById() {
      throw new Error('in getNodeById: Cannot call with documentAccess: dynamic-page. Use figma.getNodeByIdAsync instead.');
    },
    async getNodeByIdAsync(id: string) {
      const node = nodes.get(id);
      return node && !node._removed ? node._self ?? node : null;
    },
    createFrame: () => append(makeNode('FRAME')),
    createComponent: () => append(makeNode('COMPONENT')),
    createText: () => append(makeNode('TEXT')),
    createRectangle: () => append(makeNode('RECTANGLE')),
    createEllipse: () => append(makeNode('ELLIPSE')),
    createNodeFromSvg: nodeFromSvg,
    createComponentFromNode(node: Any) {
      const raw = nodes.get(node.id);
      if (!raw || raw._removed) throw new Error(DEAD);
      const parent = raw.parent ? nodes.get(raw.parent.id) : null;
      const component = makeNode('COMPONENT');
      const c = nodes.get(component.id);
      for (const key of ['_name', 'x', 'y', '_w', '_h', '_fills', '_strokes', 'clipsContent', '_layoutMode']) c[key] = raw[key];
      for (const child of [...raw._children]) {
        c._children.push(child);
        child.parent = component;
      }
      raw._children = [];
      if (parent) {
        const at = parent._children.indexOf(node);
        parent._children.splice(at, 1, component);
        c.parent = parent._self ?? parent;
      }
      raw._removed = true;
      raw.parent = null;
      return component;
    },
    combineAsVariants(components: Any[], parent: Any) {
      if (!components.length) throw new Error('in combineAsVariants: Expected at least one component');
      for (const c of components) {
        if (c.type !== 'COMPONENT') throw new Error('in combineAsVariants: Can only combine components');
        if (c.parent?.type === 'COMPONENT_SET') throw new Error('in combineAsVariants: already a variant');
      }
      const set = makeNode('COMPONENT_SET');
      const s = nodes.get(set.id);
      s._name = 'Component set';
      for (const c of components) {
        detach(c);
        c.parent = set;
        s._children.push(c);
        nodes.get(c.id)._variantProps = parseVariant(c.name);
      }
      parent.appendChild(set);
      return set;
    },
    createImage(bytes: Uint8Array) {
      if (!(bytes instanceof Uint8Array) || bytes.length === 0) throw new Error('in createImage: Image is empty');
      return { hash: `img-${nextId()}` };
    },
    base64Decode(text: string) {
      return new Uint8Array(Buffer.from(text, 'base64'));
    },
    async listAvailableFontsAsync() {
      return fonts.map((f) => ({ fontName: { ...f } }));
    },
    async loadFontAsync(font: FontName) {
      if (!fonts.some((f) => f.family === font.family && f.style === font.style)) throw new Error(`in loadFontAsync: The font "${font.family} ${font.style}" could not be loaded`);
      loadedFonts.add(fontKey(font));
    },
    getLocalPaintStyles() {
      throw new Error('in getLocalPaintStyles: Cannot call with documentAccess: dynamic-page. Use figma.getLocalPaintStylesAsync instead.');
    },
    getLocalPaintStylesAsync: async () => styles.filter((s) => s.type === 'PAINT'),
    getLocalTextStylesAsync: async () => styles.filter((s) => s.type === 'TEXT'),
    getLocalEffectStylesAsync: async () => styles.filter((s) => s.type === 'EFFECT'),
    createPaintStyle: () => makeStyle('PAINT'),
    createTextStyle: () => makeStyle('TEXT'),
    createEffectStyle: () => makeStyle('EFFECT'),
    variables: strict(
      {
        getLocalVariableCollectionsAsync: async () => [...collections],
        getLocalVariablesAsync: async (type?: string) => variables.filter((v) => !type || v.resolvedType === type),
        getLocalVariables() {
          throw new Error('in getLocalVariables: Cannot call with documentAccess: dynamic-page.');
        },
        createVariableCollection: (name: string) => makeCollection(name),
        createVariable: makeVariable,
        createVariableAlias: (variable: Any) => ({ type: 'VARIABLE_ALIAS', id: variable.id }),
        setBoundVariableForPaint(paint: Any, field: string, variable: Any) {
          if (paint.type !== 'SOLID' || field !== 'color') throw new Error('in setBoundVariableForPaint: only SOLID color');
          if (!variables.includes(variable) || variable.resolvedType !== 'COLOR') throw new Error('in setBoundVariableForPaint: needs a color variable');
          return { ...copy(paint), boundVariables: { color: { type: 'VARIABLE_ALIAS', id: variable.id } } };
        },
        setBoundVariableForEffect(effect: Any, field: string, variable: Any) {
          if (!variables.includes(variable)) throw new Error('in setBoundVariableForEffect: unknown variable');
          return { ...copy(effect), boundVariables: { ...(effect.boundVariables ?? {}), [field]: { type: 'VARIABLE_ALIAS', id: variable.id } } };
        },
      },
      'figma.variables',
    ),
    viewport: strict(
      {
        scrollAndZoomIntoView(list: Any[]) {
          calls.zoomed.push(list);
        },
      },
      'figma.viewport',
    ),
  };

  return {
    figma: strict(api, 'figma') as unknown as PluginAPI,
    calls,
    nodes,
    variables,
    collections,
    styles,
    page: (name: string) => pages.find((p) => p.name === name),
  };
}
