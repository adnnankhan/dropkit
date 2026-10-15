// Builds layers (FORMAT.md, "Layers"), for components and screens alike.
//
// Order matters in Figma (HANDOFF lesson 8): set a frame's layout before its children,
// append a node to its parent before FILL sizing, and set sizing after resize().
import { propName } from '../shared/format.ts';
import { setGradient } from './build-design-system.ts';
import { Missing, colourPaint, solid, type BuildContext } from './context.ts';

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A layer linked to a component prop (textProp, visibleProp, swapProp). */
export interface PropLink {
  node: SceneNode;
  field: 'characters' | 'visible' | 'mainComponent';
  prop: string;
}

export interface LayerScope {
  ctx: BuildContext;
  svgs: Map<string, Json>;
  links: PropLink[];
  warn(message: string): void;
}

type Container = BaseNode & ChildrenMixin;
type NumberField = 'width' | 'height' | 'itemSpacing' | 'paddingLeft' | 'paddingRight' | 'paddingTop' | 'paddingBottom' | 'topLeftRadius' | 'topRightRadius' | 'bottomLeftRadius' | 'bottomRightRadius' | 'strokeWeight';

const isAutoLayout = (node: BaseNode | null): boolean => !!node && 'layoutMode' in node && (node as FrameNode).layoutMode !== 'NONE';

/**
 * Builds a layer into `parent`. Pass `into` to put the fields onto a node that already
 * exists (a component's top layer, or a screen frame) instead of making a new one.
 */
export async function buildLayer(layer: Json, parent: Container | null, scope: LayerScope, into?: FrameNode | ComponentNode): Promise<SceneNode> {
  const node = into ?? (await create(layer, scope));
  try {
    if (typeof layer.name === 'string') node.name = layer.name;
    if (!into && parent) parent.appendChild(node);
    const parentAuto = !into && isAutoLayout(parent);
    const absolute = parentAuto && layer.absolute === true;
    if (absolute) (node as FrameNode).layoutPositioning = 'ABSOLUTE';

    if (node.type === 'FRAME' || node.type === 'COMPONENT') {
      if (!into && layer.fill === undefined) node.fills = []; // frames are see-through unless they have a fill
      if (!into) node.clipsContent = layer.clip === true;
      autoLayout(node, layer, scope);
    }
    size(node, layer, parentAuto && !absolute, scope);
    if (!parentAuto || absolute) {
      if (typeof layer.x === 'number') node.x = layer.x;
      if (typeof layer.y === 'number') node.y = layer.y;
    }
    await appearance(node, layer, scope);
    if (typeof layer.visibleProp === 'string') scope.links.push({ node, field: 'visible', prop: layer.visibleProp });

    if ((node.type === 'FRAME' || node.type === 'COMPONENT') && Array.isArray(layer.children)) {
      for (const child of layer.children) if (isObject(child)) await buildLayer(child, node, scope);
    }
    if (typeof layer.rotation === 'number' && 'rotation' in node) node.rotation = layer.rotation;
    return node;
  } catch (error) {
    if (!into) node.remove(); // nothing is left half-made
    throw error;
  }
}

async function create(layer: Json, scope: LayerScope): Promise<SceneNode> {
  switch (layer.type) {
    case 'frame':
      return figma.createFrame();
    case 'rect':
      return figma.createRectangle();
    case 'ellipse':
      return figma.createEllipse();
    case 'text':
      return text(layer, scope);
    case 'instance':
      return instance(layer, scope);
    case 'svg': {
      const svg = scope.svgs.get(layer.svg as string);
      if (!svg) throw new Missing('SVG', String(layer.svg));
      return svgNode(svg, scope.ctx);
    }
    case 'image':
      return image(layer, scope);
    default:
      throw new Error(`Unknown layer type ${String(layer.type)}`);
  }
}

// ── Text ──────────────────────────────────────────────────────────────

async function text(layer: Json, scope: LayerScope): Promise<TextNode> {
  const { ctx } = scope;
  const node = figma.createText();
  try {
    const runs = Array.isArray(layer.runs) ? (layer.runs.filter((r) => isObject(r) && typeof r.text === 'string') as Json[]) : [];
    const characters = runs.length ? runs.map((r) => r.text as string).join('') : typeof layer.text === 'string' ? layer.text : '';

    // Every font used must be loaded before the text or its styles change (HANDOFF lesson 9).
    // A text style already in the file can use a font that isn't installed here: then the
    // text uses Inter without that style, with a warning (FORMAT.md, "Fonts").
    const style = await usableStyle(textStyle(ctx, layer.textStyle), layer, scope);
    const base = style ? (style.fontName as FontName) : ctx.fontFor('Inter', 400, false);
    await ctx.loadFont(base);
    const runStyles = new Map<Json, TextStyle | null>();
    for (const run of runs) runStyles.set(run, await usableStyle(textStyle(ctx, run.textStyle), layer, scope));
    node.fontName = base;
    node.characters = characters;
    if (style) await node.setTextStyleIdAsync(style.id);
    if (layer.fill !== undefined) await fill(node, layer.fill, scope);
    const decoration = DECORATION[layer.decoration as string];
    if (decoration) node.textDecoration = decoration;
    const align = ({ left: 'LEFT', center: 'CENTER', right: 'RIGHT', justify: 'JUSTIFIED' } as const)[layer.align as 'left'];
    if (align) node.textAlignHorizontal = align;

    let at = 0;
    for (const run of runs) {
      const end = at + (run.text as string).length;
      if (end > at) {
        const s = runStyles.get(run);
        if (s) await node.setRangeTextStyleIdAsync(at, end, s.id);
        if (typeof run.fill === 'string') node.setRangeFills(at, end, [colourPaint(ctx, run.fill)]);
        const runDecoration = DECORATION[run.decoration as string];
        if (runDecoration) node.setRangeTextDecoration(at, end, runDecoration);
        if (typeof run.link === 'string' && /^(https?:\/\/|mailto:)/i.test(run.link)) node.setRangeHyperlink(at, end, { type: 'URL', value: run.link });
      }
      at = end;
    }
    const lines = layer.truncate === true ? 1 : typeof layer.truncate === 'number' && layer.truncate >= 1 ? Math.floor(layer.truncate) : null;
    if (lines !== null) {
      node.textTruncation = 'ENDING';
      node.maxLines = lines;
    }
    if (typeof layer.textProp === 'string') scope.links.push({ node, field: 'characters', prop: layer.textProp });
    return node;
  } catch (error) {
    node.remove();
    throw error;
  }
}

const DECORATION: Record<string, TextDecoration> = { underline: 'UNDERLINE', strikethrough: 'STRIKETHROUGH' };

/** The style, when its font can be loaded; null (with a warning) when it can't. */
async function usableStyle(style: TextStyle | null, layer: Json, scope: LayerScope): Promise<TextStyle | null> {
  if (!style) return null;
  const font = style.fontName as FontName;
  try {
    await scope.ctx.loadFont(font);
    return style;
  } catch {
    scope.warn(`Text style “${style.name}” uses the font “${font.family} ${font.style}”, which isn’t installed, so “${String(layer.name ?? 'text')}” uses Inter instead.`);
    return null;
  }
}

function textStyle(ctx: BuildContext, name: unknown): TextStyle | null {
  if (typeof name !== 'string') return null;
  const style = ctx.textStyles.get(name);
  if (!style) throw new Missing('text style', name);
  return style;
}

// ── Instances ─────────────────────────────────────────────────────────

/** The variant of a component (set) to make an instance from (HANDOFF lesson 2: never the set). */
export function pickVariant(target: ComponentNode | ComponentSetNode, variant?: Record<string, string>): ComponentNode {
  if (target.type === 'COMPONENT') return target;
  const want = { ...(target.defaultVariant.variantProperties ?? {}), ...(variant ?? {}) };
  const match = target.children.find(
    (child): child is ComponentNode =>
      child.type === 'COMPONENT' && Object.entries(want).every(([prop, value]) => child.variantProperties?.[prop] === value),
  );
  if (match) return match;
  // Asked for a variant the set doesn't have: say so, never quietly use another one.
  if (variant && Object.keys(variant).length) throw new Missing('variant', `${target.name}: ${Object.entries(variant).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  return target.defaultVariant;
}

async function instance(layer: Json, scope: LayerScope): Promise<InstanceNode> {
  const { ctx } = scope;
  const name = layer.component as string;
  const target = ctx.components.get(name);
  if (!target) throw new Missing('component', name);
  const node = pickVariant(target, isObject(layer.variant) ? (layer.variant as Record<string, string>) : undefined).createInstance();
  try {
    if (isObject(layer.props)) {
      const keys = Object.keys(node.componentProperties);
      const values: Record<string, string | boolean> = {};
      for (const [prop, value] of Object.entries(layer.props)) {
        const key = keys.find((k) => propName(k) === prop && node.componentProperties[k].type !== 'VARIANT');
        if (!key) continue;
        if (node.componentProperties[key].type === 'INSTANCE_SWAP') {
          const swap = ctx.components.get(value as string);
          if (!swap) throw new Missing('component', String(value));
          values[key] = pickVariant(swap).id;
        } else values[key] = value as string | boolean;
      }
      if (Object.keys(values).length) node.setProperties(values);
    }
    if (typeof layer.color === 'string') recolour(node, colourPaint(ctx, layer.color));
    if (typeof layer.swapProp === 'string') scope.links.push({ node, field: 'mainComponent', prop: layer.swapProp });
    return node;
  } catch (error) {
    node.remove();
    throw error;
  }
}

/** Recolours every visible fill and stroke inside a node (icons). Leaves "none" alone. */
export function recolour(root: SceneNode, paint: SolidPaint): void {
  const nodes: SceneNode[] = 'findAll' in root ? [root, ...root.findAll(() => true)] : [root];
  for (const node of nodes) {
    if (node === root && node.type !== 'VECTOR') continue;
    if ('fills' in node && Array.isArray(node.fills) && node.fills.length > 0) node.fills = [paint];
    if ('strokes' in node && Array.isArray(node.strokes) && node.strokes.length > 0) node.strokes = [paint];
  }
}

// ── SVGs and images ───────────────────────────────────────────────────

/** Editable vectors from an SVG. Children scale with the frame, so icons resize cleanly. */
export function svgNode(svg: Json, ctx: BuildContext): FrameNode {
  const node = figma.createNodeFromSvg(svg.svg as string);
  try {
    node.name = svg.name as string;
    for (const child of node.children) {
      if ('constraints' in child) child.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
    }
    if (typeof svg.color === 'string') recolour(node, colourPaint(ctx, svg.color));
    return node;
  } catch (error) {
    node.remove();
    throw error;
  }
}

async function image(layer: Json, scope: LayerScope): Promise<RectangleNode> {
  const node = figma.createRectangle();
  const match = typeof layer.src === 'string' ? /^data:image\/(png|jpe?g);base64,(.+)$/s.exec(layer.src) : null;
  if (!match) {
    node.fills = [solid('#D9D9D9')];
    scope.warn(`Image “${String(layer.name ?? 'image')}” has no picture, so it’s a grey placeholder.`);
    return node;
  }
  try {
    const picture = figma.createImage(figma.base64Decode(match[2].replace(/\s/g, '')));
    const scaleMode = ({ fill: 'FILL', fit: 'FIT', crop: 'CROP' } as const)[(layer.fit as 'fill') ?? 'fill'] ?? 'FILL';
    node.fills = [{ type: 'IMAGE', imageHash: picture.hash, scaleMode }];
  } catch {
    node.fills = [solid('#D9D9D9')];
    scope.warn(`Image “${String(layer.name ?? 'image')}” couldn’t be read, so it’s a grey placeholder.`);
  }
  return node;
}

// ── Fields ────────────────────────────────────────────────────────────

/**
 * Sets a number field from a number or a number variable name (linked to the variable).
 * null removes the value (FORMAT.md). Anything else is ignored, as the checker said.
 */
function setNumber(node: SceneNode, field: NumberField, value: unknown, ctx: BuildContext): void {
  const target = node as unknown as Record<string, number>;
  if (value === null) {
    if (field === 'width' || field === 'height') return;
    if ((node as SceneNode & { boundVariables?: Record<string, unknown> }).boundVariables?.[field]) node.setBoundVariable(field, null);
    target[field] = 0;
    return;
  }
  if (typeof value === 'number') {
    if (Number.isFinite(value) && value >= 0) target[field] = value;
    return;
  }
  if (typeof value !== 'string') return;
  const variable = ctx.numberVars.get(value as string);
  if (!variable) throw new Missing('token', String(value));
  if (field !== 'width' && field !== 'height') target[field] = ctx.numberValue(variable);
  node.setBoundVariable(field, variable);
}

function numberOf(value: unknown, ctx: BuildContext): number | null {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || value === 'hug' || value === 'fill') return null;
  const variable = ctx.numberVars.get(value);
  if (!variable) throw new Missing('token', value);
  return ctx.numberValue(variable);
}

function autoLayout(node: FrameNode | ComponentNode, layer: Json, scope: LayerScope): void {
  const { ctx } = scope;
  if (layer.layout !== 'row' && layer.layout !== 'column') {
    if (layer.layout === 'none') node.layoutMode = 'NONE';
    return;
  }
  node.layoutMode = layer.layout === 'row' ? 'HORIZONTAL' : 'VERTICAL';
  if (layer.gap === 'auto') node.primaryAxisAlignItems = 'SPACE_BETWEEN';
  else if (layer.gap !== undefined) setNumber(node, 'itemSpacing', layer.gap, ctx);
  const padding = Array.isArray(layer.padding) ? layer.padding : layer.padding === undefined ? null : [layer.padding];
  if (padding && [1, 2, 4].includes(padding.length)) {
    const p = padding;
    const [top, right, bottom, left] = p.length === 1 ? [p[0], p[0], p[0], p[0]] : p.length === 2 ? [p[0], p[1], p[0], p[1]] : p;
    setNumber(node, 'paddingTop', top, ctx);
    setNumber(node, 'paddingRight', right, ctx);
    setNumber(node, 'paddingBottom', bottom, ctx);
    setNumber(node, 'paddingLeft', left, ctx);
  }
  const counters: Record<string, FrameNode['counterAxisAlignItems']> = { start: 'MIN', center: 'CENTER', end: 'MAX', baseline: 'BASELINE' };
  const counter = counters[layer.align as string];
  if (counter && !(counter === 'BASELINE' && node.layoutMode !== 'HORIZONTAL')) node.counterAxisAlignItems = counter;
  const primary = ({ start: 'MIN', center: 'CENTER', end: 'MAX', 'space-between': 'SPACE_BETWEEN' } as const)[layer.justify as 'start'];
  if (primary && layer.gap !== 'auto') node.primaryAxisAlignItems = primary;
  if (layer.wrap === true && node.layoutMode === 'HORIZONTAL') node.layoutWrap = 'WRAP';
}

/**
 * Width and height. Numbers and tokens resize (tokens stay linked); "hug" and "fill" set
 * the sizing mode, after resize() and only where Figma allows it (lesson 8).
 */
function size(node: SceneNode, layer: Json, inAutoLayout: boolean, scope: LayerScope): void {
  const { ctx } = scope;
  const width = numberOf(layer.width, ctx);
  const height = numberOf(layer.height, ctx);
  const isText = node.type === 'TEXT';
  const ownAuto = isAutoLayout(node);
  if (width !== null || height !== null) {
    if (isText && width !== null) (node as TextNode).textAutoResize = height !== null ? 'NONE' : 'HEIGHT';
    if ('resize' in node) node.resize(Math.max(0.01, width ?? node.width), Math.max(0.01, height ?? node.height));
    if (typeof layer.width === 'string' && width !== null) setNumber(node, 'width', layer.width, ctx);
    if (typeof layer.height === 'string' && height !== null) setNumber(node, 'height', layer.height, ctx);
  } else if (isText) {
    (node as TextNode).textAutoResize = 'WIDTH_AND_HEIGHT';
  }
  if (!('layoutSizingHorizontal' in node)) return;
  const sized = node as FrameNode;
  const mode = (value: unknown, own: number | null): 'FIXED' | 'HUG' | 'FILL' | null => {
    if (value === 'fill') return inAutoLayout ? 'FILL' : null;
    if (value === 'hug') return ownAuto || isText ? 'HUG' : null;
    if (own !== null) return ownAuto || inAutoLayout ? 'FIXED' : null;
    // An auto layout frame without a size hugs its content.
    return ownAuto && (node.type === 'FRAME' || node.type === 'COMPONENT') ? 'HUG' : null;
  };
  const horizontal = mode(layer.width, width);
  const vertical = mode(layer.height, height);
  if (horizontal) sized.layoutSizingHorizontal = horizontal;
  if (vertical) sized.layoutSizingVertical = vertical;
  if (isText && horizontal === 'FILL') (node as TextNode).textAutoResize = 'HEIGHT';
}

async function appearance(node: SceneNode, layer: Json, scope: LayerScope): Promise<void> {
  const { ctx } = scope;
  if (node.type !== 'TEXT' && layer.fill !== undefined) await fill(node, layer.fill, scope);
  if (layer.stroke !== undefined && 'strokes' in node) {
    if (layer.stroke === null) node.strokes = [];
    else if (isObject(layer.stroke) && typeof layer.stroke.color === 'string') {
      const s = layer.stroke;
      node.strokes = [colourPaint(ctx, s.color as string)];
      setNumber(node, 'strokeWeight', s.width ?? 1, ctx);
      const align = ({ inside: 'INSIDE', center: 'CENTER', outside: 'OUTSIDE' } as const)[s.align as 'inside'];
      if (align && 'strokeAlign' in node) node.strokeAlign = align;
      if (Array.isArray(s.dash) && s.dash.every((n) => typeof n === 'number' && n >= 0) && 'dashPattern' in node) node.dashPattern = s.dash as number[];
    }
  }
  const radius = Array.isArray(layer.radius) ? layer.radius : layer.radius === undefined ? null : [layer.radius, layer.radius, layer.radius, layer.radius];
  if (radius && radius.length === 4 && 'topLeftRadius' in node) {
    const r = radius;
    setNumber(node, 'topLeftRadius', r[0], ctx);
    setNumber(node, 'topRightRadius', r[1], ctx);
    setNumber(node, 'bottomRightRadius', r[2], ctx);
    setNumber(node, 'bottomLeftRadius', r[3], ctx);
  }
  if (typeof layer.effect === 'string' && 'setEffectStyleIdAsync' in node) {
    const style = ctx.effectStyles.get(layer.effect);
    if (!style) throw new Missing('effect', layer.effect);
    await node.setEffectStyleIdAsync(style.id);
  }
  if (typeof layer.opacity === 'number' && layer.opacity >= 0 && layer.opacity <= 1 && 'opacity' in node) node.opacity = layer.opacity;
  if (typeof layer.visible === 'boolean') node.visible = layer.visible;
  if (typeof layer.clip === 'boolean' && 'clipsContent' in node) node.clipsContent = layer.clip;
}

async function fill(node: SceneNode, value: unknown, scope: LayerScope): Promise<void> {
  if (!('fills' in node)) return;
  const { ctx } = scope;
  if (value === null) {
    node.fills = [];
    return;
  }
  if (isObject(value)) {
    const target = node as GeometryMixin;
    if (!setGradient(ctx, value, (paint) => (target.fills = [paint]), () => (target.fills as Paint[])[0])) {
      scope.warn(`“${node.name}” uses colour values in its gradient, not linked variables: Figma doesn’t keep variable links on gradient stops.`);
    }
    return;
  }
  if (typeof value !== 'string') return;
  const name = value;
  if (name.startsWith('#') || ctx.colorVars.has(name)) {
    node.fills = [colourPaint(ctx, name)];
    return;
  }
  const style = ctx.paintStyles.get(name);
  if (!style) throw new Missing('colour or gradient', name);
  await (node as GeometryMixin & MinimalFillsMixin & { setFillStyleIdAsync(id: string): Promise<void> }).setFillStyleIdAsync(style.id);
}

/** Links layers to the component props they name (textProp, visibleProp, swapProp). */
export function linkProps(links: PropLink[], keys: Map<string, string>): void {
  for (const link of links) {
    const key = keys.get(link.prop);
    // Only layers inside the component can link to its props, not the component itself.
    if (!key || link.node.type === 'COMPONENT') continue;
    link.node.componentPropertyReferences = { ...(link.node.componentPropertyReferences ?? {}), [link.field]: key };
  }
}
