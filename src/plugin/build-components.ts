// Step 3c: components (FORMAT.md, "Components"; HANDOFF lessons 1–4 and 7–9).
// Every variant is built fresh from base + rules. A variant is never cloned to make another,
// because clones lose their prop links (lesson 3).
import { combinations, matches, plural, variantName, type Combination } from '../shared/format.ts';
import { Missing, PAGES } from './context.ts';
import { buildLayer, linkProps, pickVariant, type LayerScope, type PropLink } from './layers.ts';
import { below } from './place.ts';
import type { PartRun } from './run.ts';

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

const GAP = 24;

export async function buildComponents(components: Json[], svgs: Map<string, Json>, run: PartRun): Promise<void> {
  const { ctx } = run;
  const { page, warning } = await ctx.page(PAGES.components);
  if (warning) run.warn(warning);
  let built = 0;
  let variants = 0;

  for (const c of dependencyOrder(components)) {
    const name = c.name as string;
    const index = components.indexOf(c);
    const key = run.isSkipped(`component#${index}`) ? `component#${index}` : `component:${name}`;
    await run.item(key, name, async () => {
      if (ctx.components.has(name)) return 'already';
      const variantProps = isObject(c.variants) ? (c.variants as Record<string, string[]>) : {};
      const hasVariants = Object.keys(variantProps).length > 0;
      const skip = Array.isArray(c.skip) ? (c.skip as Combination[]) : [];
      const combos = combinations(Object.fromEntries(Object.entries(variantProps).map(([p, v]) => [p, [...new Set(v)]])), skip);
      const links: PropLink[] = [];
      const scope: LayerScope = { ctx, svgs, links, warn: (m) => run.warn(m) };
      const made: ComponentNode[] = [];
      const at = below(page); // worked out first, so the new component isn't counted
      let result: ComponentNode | ComponentSetNode | null = null;
      try {
        for (const combo of combos) {
          const layer = applyRules(c.base as Json, Array.isArray(c.rules) ? (c.rules as Json[]) : [], combo);
          const component = figma.createComponent();
          made.push(component);
          page.appendChild(component);
          if (layer.fill === undefined) component.fills = [];
          component.clipsContent = layer.clip === true;
          if (layer.type === 'frame') {
            await buildLayer(layer, null, scope, component);
          } else {
            // A base that isn't a frame sits inside a component that hugs it.
            component.layoutMode = 'HORIZONTAL';
            component.primaryAxisSizingMode = 'AUTO';
            component.counterAxisSizingMode = 'AUTO';
            await buildLayer(layer, component, scope);
          }
          component.name = hasVariants ? variantName(combo) : name;
        }

        if (hasVariants) {
          const set = figma.combineAsVariants(made, page);
          set.name = name;
          arrange(set, variantProps);
          result = set;
        } else {
          result = made[0];
          result.name = name;
        }
        if (typeof c.description === 'string') result.description = c.description;

        // Props live on the component (or the set); layers link to them by key.
        const keys = new Map<string, string>();
        for (const [prop, def] of Object.entries(isObject(c.props) ? c.props : {})) {
          const d = def as Json;
          if (d.type === 'swap') {
            const target = ctx.components.get(d.default as string);
            if (!target) throw new Missing('component', String(d.default));
            keys.set(prop, result.addComponentProperty(prop, 'INSTANCE_SWAP', pickVariant(target).id));
          } else {
            keys.set(prop, result.addComponentProperty(prop, d.type === 'text' ? 'TEXT' : 'BOOLEAN', d.default as string | boolean));
          }
        }
        linkProps(links, keys);
        result.x = at.x;
        result.y = at.y;
      } catch (error) {
        if (result) result.remove();
        else for (const node of made) if (!node.removed) node.remove();
        throw error;
      }
      ctx.components.set(name, result);
      ctx.remember('components', result);
      built++;
      variants += combos.length;
      return 'built';
    });
  }
  run.summary(built ? `${plural(built, 'component')} · ${plural(variants, 'variant')}` : '');
}

/** The base layer with every matching rule applied, in order; a later rule wins. */
export function applyRules(base: Json, rules: Json[], combo: Combination): Json {
  const root = structuredCloneJson(base);
  for (const rule of rules) {
    if (!isObject(rule.when) || !isObject(rule.set) || !matches(combo, rule.when as Combination)) continue;
    for (const [target, fields] of Object.entries(rule.set)) {
      const layer = target === 'self' ? root : findByName(root, target);
      if (!layer || !isObject(fields)) continue;
      for (const [field, value] of Object.entries(fields)) {
        if (field === 'variant' && isObject(value) && isObject(layer.variant)) layer.variant = { ...layer.variant, ...value };
        else layer[field] = structuredCloneJson(value);
      }
    }
  }
  return root;
}

function findByName(root: Json, name: string): Json | null {
  for (const child of Array.isArray(root.children) ? root.children : []) {
    if (!isObject(child)) continue;
    if (child.name === name) return child;
    const inner = findByName(child, name);
    if (inner) return inner;
  }
  return null;
}

function structuredCloneJson<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

/** Components that others use come first. */
export function dependencyOrder(components: Json[]): Json[] {
  const byName = new Map(components.filter((c) => typeof c.name === 'string').map((c) => [c.name as string, c]));
  const uses = (c: Json): string[] => {
    const out: string[] = [];
    const walk = (layer: unknown) => {
      if (!isObject(layer)) return;
      if (layer.type === 'instance' && typeof layer.component === 'string') out.push(layer.component);
      if (Array.isArray(layer.children)) layer.children.forEach(walk);
    };
    walk(c.base);
    for (const rule of Array.isArray(c.rules) ? c.rules : []) {
      if (isObject(rule) && isObject(rule.set)) for (const fields of Object.values(rule.set)) if (isObject(fields) && typeof fields.component === 'string') out.push(fields.component);
    }
    for (const def of Object.values(isObject(c.props) ? c.props : {})) if (isObject(def) && def.type === 'swap' && typeof def.default === 'string') out.push(def.default);
    return out;
  };
  const ordered: Json[] = [];
  const state = new Map<Json, 'visiting' | 'done'>();
  const visit = (c: Json) => {
    if (state.get(c)) return; // done, or a loop (the checker reports loops)
    state.set(c, 'visiting');
    for (const name of uses(c)) {
      const dep = byName.get(name);
      if (dep) visit(dep);
    }
    state.set(c, 'done');
    ordered.push(c);
  };
  components.forEach(visit);
  return ordered;
}

/** Lays variants out in a grid inside their set, with Figma's dashed purple set outline. */
function arrange(set: ComponentSetNode, variantProps: Record<string, string[]>): void {
  const children = set.children as ComponentNode[];
  const last = Object.values(variantProps).pop() ?? [];
  const columns = last.length > 1 && last.length <= 6 ? last.length : Math.ceil(Math.sqrt(children.length));
  const cellW = Math.max(...children.map((c) => c.width));
  const cellH = Math.max(...children.map((c) => c.height));
  children.forEach((child, i) => {
    child.x = GAP + (i % columns) * (cellW + GAP);
    child.y = GAP + Math.floor(i / columns) * (cellH + GAP);
  });
  const rows = Math.ceil(children.length / columns);
  set.resizeWithoutConstraints(GAP * 2 + columns * cellW + (columns - 1) * GAP, GAP * 2 + rows * cellH + (rows - 1) * GAP);
  set.strokes = [{ type: 'SOLID', color: { r: 0x97 / 255, g: 0x47 / 255, b: 1 } }];
  set.dashPattern = [10, 5];
  set.cornerRadius = 5;
}
