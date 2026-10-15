// What a build needs to find by name: variables, styles, components, pages and fonts,
// both from the open file and from what this build creates.
import { hexToRgba, pickFontStyle } from '../shared/format.ts';

export const COLLECTIONS = { colors: 'Colors', spacing: 'Spacing', radius: 'Radius', sizes: 'Sizes' } as const;
export const PAGES = { components: 'Components', screens: 'Screens' } as const;

export class BuildContext {
  readonly colorVars = new Map<string, Variable>();
  readonly numberVars = new Map<string, Variable>();
  readonly paintStyles = new Map<string, PaintStyle>();
  readonly textStyles = new Map<string, TextStyle>();
  readonly effectStyles = new Map<string, EffectStyle>();
  readonly components = new Map<string, ComponentNode | ComponentSetNode>();
  /** Top-level frames by name (screens). Screens page first. */
  readonly screens = new Map<string, FrameNode>();
  readonly collections = new Map<string, VariableCollection>();
  fonts: Font[] = [];
  private readonly loaded = new Set<string>();
  /** Things each part made in this build, for "Show". */
  readonly made = new Map<string, string[]>();

  static async load(): Promise<BuildContext> {
    const ctx = new BuildContext();
    await figma.loadAllPagesAsync();
    const [collections, variables, paints, texts, effects] = await Promise.all([
      figma.variables.getLocalVariableCollectionsAsync(),
      figma.variables.getLocalVariablesAsync(),
      figma.getLocalPaintStylesAsync(),
      figma.getLocalTextStylesAsync(),
      figma.getLocalEffectStylesAsync(),
    ]);
    for (const c of collections) if (!ctx.collections.has(c.name)) ctx.collections.set(c.name, c);
    const colorsId = ctx.collections.get(COLLECTIONS.colors)?.id;
    // Prefer variables from our own collections when names repeat.
    const sorted = [...variables].sort((a, b) => Number(b.variableCollectionId === colorsId) - Number(a.variableCollectionId === colorsId));
    for (const v of sorted) {
      const map = v.resolvedType === 'COLOR' ? ctx.colorVars : v.resolvedType === 'FLOAT' ? ctx.numberVars : null;
      if (map && !map.has(v.name)) map.set(v.name, v);
    }
    for (const s of paints) if (!ctx.paintStyles.has(s.name)) ctx.paintStyles.set(s.name, s);
    for (const s of texts) if (!ctx.textStyles.has(s.name)) ctx.textStyles.set(s.name, s);
    for (const s of effects) if (!ctx.effectStyles.has(s.name)) ctx.effectStyles.set(s.name, s);

    const pages = [...figma.root.children].sort((a, b) => Number(b.name === PAGES.screens) - Number(a.name === PAGES.screens));
    for (const page of pages) {
      for (const node of page.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] })) {
        if (node.type === 'COMPONENT' && node.parent?.type === 'COMPONENT_SET') continue;
        if (!ctx.components.has(node.name)) ctx.components.set(node.name, node);
      }
      for (const node of page.children) if (node.type === 'FRAME' && !ctx.screens.has(node.name)) ctx.screens.set(node.name, node);
    }
    try {
      ctx.fonts = await figma.listAvailableFontsAsync();
    } catch {
      ctx.fonts = [];
    }
    return ctx;
  }

  remember(part: string, node: { id: string }): void {
    this.made.set(part, [...(this.made.get(part) ?? []), node.id]);
  }

  /**
   * The font to use for a family and weight: the installed style closest to it, or Inter
   * when the family isn't installed (FORMAT.md, "Fonts").
   */
  fontFor(family: string, weight: number, italic: boolean): FontName {
    const list = this.fonts.map((f) => f.fontName);
    const pick = pickFontStyle(list, family, weight, italic);
    if (pick) return { family, style: pick.style };
    const inter = pickFontStyle(list, 'Inter', weight, italic);
    return { family: 'Inter', style: inter?.style ?? 'Regular' };
  }

  async loadFont(font: FontName): Promise<void> {
    const key = `${font.family}|${font.style}`;
    if (this.loaded.has(key)) return;
    await figma.loadFontAsync(font);
    this.loaded.add(key);
  }

  /** A page by name; creates it when missing. Returns null when Figma won't (free plan: 3 pages). */
  async page(name: string): Promise<{ page: PageNode; warning?: string }> {
    const existing = figma.root.children.find((p) => p.name === name);
    if (existing) {
      await existing.loadAsync();
      return { page: existing };
    }
    try {
      const page = figma.createPage();
      page.name = name;
      return { page };
    } catch {
      return {
        page: figma.currentPage,
        warning: `Figma didn’t allow a new page called “${name}” (the free plan allows 3 pages), so this was put on the page “${figma.currentPage.name}”.`,
      };
    }
  }

  /** The value of a number variable in its first mode, following aliases. */
  numberValue(variable: Variable): number {
    return this.resolve(variable, (v) => (typeof v === 'number' ? v : null)) ?? 0;
  }

  colorValue(variable: Variable): RGBA {
    return this.resolve(variable, (v) => (typeof v === 'object' && v !== null && 'r' in v ? ({ a: 1, ...(v as RGB) } as RGBA) : null)) ?? { r: 0, g: 0, b: 0, a: 1 };
  }

  private resolve<T>(variable: Variable, read: (value: VariableValue) => T | null, depth = 0): T | null {
    const collection = [...this.collections.values()].find((c) => c.id === variable.variableCollectionId);
    const modeId = collection?.defaultModeId ?? Object.keys(variable.valuesByMode)[0];
    const value = variable.valuesByMode[modeId];
    if (value && typeof value === 'object' && 'type' in value && value.type === 'VARIABLE_ALIAS' && depth < 10) {
      const target = [...this.colorVars.values(), ...this.numberVars.values()].find((v) => v.id === value.id);
      return target ? this.resolve(target, read, depth + 1) : null;
    }
    return value === undefined ? null : read(value);
  }
}

export function solid(hex: string): SolidPaint {
  const { r, g, b, a } = hexToRgba(hex);
  return { type: 'SOLID', color: { r, g, b }, opacity: a };
}

/** A solid paint for a hex colour or a colour variable name (bound to the variable). */
export function colourPaint(ctx: BuildContext, value: string): SolidPaint {
  if (value.startsWith('#')) return solid(value);
  const variable = ctx.colorVars.get(value);
  if (!variable) throw new Missing('colour', value);
  const { r, g, b } = ctx.colorValue(variable);
  return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r, g, b } }, 'color', variable);
}

/** A name the build needed but couldn't find. Caught per item and reported in plain words. */
export class Missing extends Error {
  constructor(kind: string, name: string) {
    super(`It uses ${kind} “${name}”, which isn’t in the file.`);
  }
}

/** Plain words for a failure, for the report. */
export function reason(error: unknown): { reason: string; detail?: string } {
  if (error instanceof Missing) return { reason: error.message };
  const detail = error instanceof Error ? error.message : String(error);
  return { reason: 'Figma couldn’t build it.', detail };
}
