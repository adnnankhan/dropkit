// Step 3a: the design system → variables and styles (FORMAT.md, "Design system").
import { hexToRgba, isHexColor, plural } from '../shared/format.ts';
import { COLLECTIONS, Missing, colourPaint, type BuildContext } from './context.ts';
import type { PartRun } from './run.ts';

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

export async function buildDesignSystem(ds: Json, run: PartRun): Promise<void> {
  const { ctx } = run;
  const counts = { variables: 0, gradients: 0, textStyles: 0, effects: 0 };

  // Colours: one collection with the modes. Variables first, values second, so links work in any order.
  const colors = isObject(ds.colors) ? ds.colors : {};
  const names = Object.keys(colors);
  if (names.length) {
    const wanted = modeNames(ds, colors);
    const { collection, modes, leftOut, note } = await colorCollection(ctx, wanted);
    if (note) run.warn(note);
    if (leftOut.length) {
      run.warn(`Colours were built with ${quoteList(modes.map((m) => m.name))} only. Figma’s free plan allows one mode per collection, so ${quoteList(leftOut)} ${leftOut.length === 1 ? 'needs' : 'need'} a paid Figma plan.`);
    }
    const created = new Map<string, Variable>();
    for (const name of names) {
      await run.item(`color:${name}`, name, async () => {
        if (ctx.colorVars.has(name)) return 'already';
        const variable = figma.variables.createVariable(name, collection, 'COLOR');
        ctx.colorVars.set(name, variable);
        created.set(name, variable);
        return 'built';
      });
    }
    for (const [name, variable] of created) {
      try {
        const value = colors[name];
        for (const mode of modes) {
          const raw = isObject(value) ? value[mode.name] : value;
          variable.setValueForMode(mode.modeId, colourValue(ctx, raw as string));
        }
        counts.variables++;
      } catch (error) {
        variable.remove();
        ctx.colorVars.delete(name);
        run.unbuilt(name, error);
      }
    }
  }

  // Spacing, radius and sizes: number variables, one collection each.
  for (const [key, collectionName] of [['spacing', COLLECTIONS.spacing], ['radius', COLLECTIONS.radius], ['sizes', COLLECTIONS.sizes]] as const) {
    const values = isObject(ds[key]) ? ds[key] : {};
    if (Object.keys(values).length === 0) continue;
    const collection = collectionNamed(ctx, collectionName);
    for (const [name, value] of Object.entries(values)) {
      await run.item(`number:${name}`, name, async () => {
        if (ctx.numberVars.has(name)) return 'already';
        const variable = figma.variables.createVariable(name, collection, 'FLOAT');
        try {
          variable.setValueForMode(collection.defaultModeId, value as number);
        } catch (error) {
          variable.remove();
          throw error;
        }
        ctx.numberVars.set(name, variable);
        counts.variables++;
        return 'built';
      });
    }
  }

  // Gradients: colour styles.
  for (const [name, value] of Object.entries(isObject(ds.gradients) ? ds.gradients : {})) {
    await run.item(`gradient:${name}`, name, async () => {
      if (ctx.paintStyles.has(name)) return 'already';
      const style = figma.createPaintStyle();
      try {
        style.name = name;
        const kept = setGradient(ctx, value as Json, (paint) => (style.paints = [paint]), () => style.paints[0]);
        if (!kept) run.warn(`Gradient “${name}” uses colour values, not linked variables: Figma doesn’t keep variable links on gradient stops.`);
      } catch (error) {
        style.remove();
        throw error;
      }
      ctx.paintStyles.set(name, style);
      counts.gradients++;
      return 'built';
    });
  }

  // Text styles.
  for (const [name, value] of Object.entries(isObject(ds.textStyles) ? ds.textStyles : {})) {
    await run.item(`textStyle:${name}`, name, async () => {
      if (ctx.textStyles.has(name)) return 'already';
      const t = value as Json;
      const font = ctx.fontFor(t.font as string, t.weight as number, t.italic === true);
      await ctx.loadFont(font);
      const style = figma.createTextStyle();
      try {
        style.name = name;
        style.fontName = font;
        style.fontSize = t.size as number;
        style.lineHeight = typeof t.lineHeight === 'number' ? { unit: 'PIXELS', value: t.lineHeight } : { unit: 'AUTO' };
        style.letterSpacing = { unit: 'PIXELS', value: typeof t.letterSpacing === 'number' ? t.letterSpacing : 0 };
        if (t.case) style.textCase = ({ upper: 'UPPER', lower: 'LOWER', title: 'TITLE' } as const)[t.case as 'upper'] ?? 'ORIGINAL';
        if (t.decoration === 'underline') style.textDecoration = 'UNDERLINE';
        if (t.decoration === 'strikethrough') style.textDecoration = 'STRIKETHROUGH';
      } catch (error) {
        style.remove();
        throw error;
      }
      if (font.family !== t.font) run.warn(`Text style “${name}” uses Inter: the font “${String(t.font)}” isn’t installed.`);
      ctx.textStyles.set(name, style);
      counts.textStyles++;
      return 'built';
    });
  }

  // Effects.
  for (const [name, value] of Object.entries(isObject(ds.effects) ? ds.effects : {})) {
    await run.item(`effect:${name}`, name, async () => {
      if (ctx.effectStyles.has(name)) return 'already';
      const list = (Array.isArray(value) ? value : [value]) as Json[];
      const effects = list.map((e) => effect(ctx, e));
      const style = figma.createEffectStyle();
      try {
        style.name = name;
        style.effects = effects;
      } catch (error) {
        style.remove();
        throw error;
      }
      ctx.effectStyles.set(name, style);
      counts.effects++;
      return 'built';
    });
  }

  const bits: string[] = [];
  if (counts.variables) bits.push(plural(counts.variables, 'variable'));
  if (counts.gradients) bits.push(plural(counts.gradients, 'gradient'));
  if (counts.textStyles) bits.push(plural(counts.textStyles, 'text style'));
  if (counts.effects) bits.push(plural(counts.effects, 'effect'));
  run.summary(bits.join(' · '));
}

function modeNames(ds: Json, colors: Json): string[] {
  if (Array.isArray(ds.modes) && ds.modes.length) return [...new Set(ds.modes as string[])];
  const first = Object.values(colors).find(isObject);
  return first ? Object.keys(first) : [];
}

/**
 * The Colors collection with the wanted modes. A new collection gets its first mode renamed;
 * the others are added. When Figma refuses a mode (free plan), it is left out, never worked
 * around. In a collection already in the file that has none of the wanted modes, Figma's
 * untouched "Mode 1" is renamed; any other first mode takes the first wanted mode's values.
 */
async function colorCollection(ctx: BuildContext, wanted: string[]) {
  let collection = ctx.collections.get(COLLECTIONS.colors);
  const ids = new Map<string, string>();
  let note = '';
  if (!collection) {
    collection = figma.variables.createVariableCollection(COLLECTIONS.colors);
    ctx.collections.set(COLLECTIONS.colors, collection);
    if (wanted.length) collection.renameMode(collection.defaultModeId, wanted[0]);
  } else if (wanted.length && !collection.modes.some((m) => wanted.includes(m.name))) {
    const first = collection.modes[0];
    if (first.name === 'Mode 1') collection.renameMode(first.modeId, wanted[0]);
    else {
      ids.set(wanted[0], first.modeId);
      note = `The Colors collection already in the file has the mode “${first.name}”, so the “${wanted[0]}” values went there.`;
    }
  }
  const leftOut: string[] = [];
  for (const name of wanted) {
    if (ids.has(name)) continue;
    const found = collection.modes.find((m) => m.name === name);
    if (found) {
      ids.set(name, found.modeId);
      continue;
    }
    try {
      ids.set(name, collection.addMode(name));
    } catch {
      leftOut.push(name);
    }
  }
  const modes = wanted.length
    ? wanted.filter((name) => ids.has(name)).map((name) => ({ name, modeId: ids.get(name)! }))
    : [{ name: collection.modes[0].name, modeId: collection.modes[0].modeId }];
  for (const mode of modes) ctx.colorModes.set(mode.name, mode.modeId);
  return { collection, modes, leftOut, note };
}

function collectionNamed(ctx: BuildContext, name: string): VariableCollection {
  let collection = ctx.collections.get(name);
  if (!collection) {
    collection = figma.variables.createVariableCollection(name);
    ctx.collections.set(name, collection);
  }
  return collection;
}

function colourValue(ctx: BuildContext, value: string): VariableValue {
  if (isHexColor(value)) return hexToRgba(value);
  const target = ctx.colorVars.get(value);
  if (!target) throw new Missing('colour', value);
  return figma.variables.createVariableAlias(target);
}

/**
 * A gradient paint. Stops that name a colour variable are linked to it when `link` is true.
 * Angles follow CSS: 90 runs left to right, 180 top to bottom.
 */
export function gradientPaint(ctx: BuildContext, g: Json, link = true): { paint: GradientPaint; linked: boolean } {
  const type = ({ linear: 'GRADIENT_LINEAR', radial: 'GRADIENT_RADIAL', angular: 'GRADIENT_ANGULAR' } as const)[g.type as 'linear'];
  const theta = (((typeof g.angle === 'number' ? g.angle : 90) - 90) * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const transform: Transform =
    type === 'GRADIENT_LINEAR'
      ? [
          [cos, sin, 0.5 - 0.5 * cos - 0.5 * sin],
          [-sin, cos, 0.5 + 0.5 * sin - 0.5 * cos],
        ]
      : [
          [1, 0, 0],
          [0, 1, 0],
        ];
  let linked = false;
  const stops: ColorStop[] = (g.stops as Json[]).map((stop) => {
    const value = stop.color as string;
    if (isHexColor(value)) return { position: stop.at as number, color: hexToRgba(value) };
    const variable = ctx.colorVars.get(value);
    if (!variable) throw new Missing('colour', value);
    const color = ctx.colorValue(variable);
    if (!link) return { position: stop.at as number, color };
    linked = true;
    return { position: stop.at as number, color, boundVariables: { color: figma.variables.createVariableAlias(variable) } };
  });
  return { paint: { type, gradientTransform: transform, gradientStops: stops }, linked };
}

/**
 * Sets a gradient with its stops linked to colour variables. Whether Figma keeps links on
 * gradient stops is an open question in FORMAT.md, so: try, read it back, and when Figma
 * drops or refuses the links, use the colour values. Returns false when it fell back.
 */
export function setGradient(ctx: BuildContext, g: Json, write: (paint: GradientPaint) => void, read: () => Paint): boolean {
  const { paint, linked } = gradientPaint(ctx, g);
  if (!linked) {
    write(paint);
    return true;
  }
  try {
    write(paint);
    if (gradientLinksStuck(read())) return true;
  } catch {
    // Figma refused the links; use the colour values below.
  }
  write(gradientPaint(ctx, g, false).paint);
  return false;
}

/** True when Figma kept any of the variable links we put on the gradient stops. */
export function gradientLinksStuck(paint: Paint): boolean {
  if (!('gradientStops' in paint)) return false;
  return paint.gradientStops.some((s) => s.boundVariables?.color);
}

function effect(ctx: BuildContext, e: Json): Effect {
  if (e.type === 'layerBlur' || e.type === 'backgroundBlur') {
    return { type: e.type === 'layerBlur' ? 'LAYER_BLUR' : 'BACKGROUND_BLUR', radius: e.radius as number, visible: true, blurType: 'NORMAL' };
  }
  const colour = e.color as string;
  const variable = isHexColor(colour) ? null : ctx.colorVars.get(colour);
  if (!isHexColor(colour) && !variable) throw new Missing('colour', colour);
  const color = variable ? ctx.colorValue(variable) : hexToRgba(colour);
  const num = (key: string) => (typeof e[key] === 'number' ? (e[key] as number) : 0);
  const shadow: DropShadowEffect | InnerShadowEffect =
    e.type === 'dropShadow'
      ? // Shadows never show through see-through fills, so glass stays clear (HANDOFF lesson 5).
        { type: 'DROP_SHADOW', color, offset: { x: num('x'), y: num('y') }, radius: num('blur'), spread: num('spread'), visible: true, blendMode: 'NORMAL', showShadowBehindNode: false }
      : { type: 'INNER_SHADOW', color, offset: { x: num('x'), y: num('y') }, radius: num('blur'), spread: num('spread'), visible: true, blendMode: 'NORMAL' };
  return variable ? figma.variables.setBoundVariableForEffect(shadow, 'color', variable) : shadow;
}

function quoteList(values: string[]): string {
  const q = values.map((v) => `“${v}”`);
  return q.length <= 1 ? q.join('') : `${q.slice(0, -1).join(', ')} and ${q[q.length - 1]}`;
}

export { colourPaint };
