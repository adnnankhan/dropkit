// Step 3b: SVGs → editable vectors, made into components unless "component" is false
// (FORMAT.md, "SVGs"). Icons go on the Components page, before the other components.
import { plural } from '../shared/format.ts';
import { PAGES } from './context.ts';
import { svgNode } from './layers.ts';
import { below } from './place.ts';
import type { PartRun } from './run.ts';

type Json = Record<string, unknown>;

const CELL = 64;
const PER_ROW = 8;

export async function buildSvgs(svgs: Json[], run: PartRun): Promise<void> {
  const { ctx } = run;
  const { page, warning } = await ctx.page(PAGES.components);
  if (warning) run.warn(warning);
  const origin = below(page);
  let placed = 0;
  let icons = 0;
  let graphics = 0;

  for (const [i, svg] of svgs.entries()) {
    const name = svg.name as string;
    const key = run.isSkipped(`svg#${i}`) ? `svg#${i}` : `svg:${name}`;
    await run.item(key, name, async () => {
      const asComponent = svg.component !== false;
      if (asComponent && ctx.components.has(name)) return 'already';
      if (!asComponent && page.children.some((n) => n.name === name && n.type === 'FRAME')) return 'already';
      let node: SceneNode;
      try {
        node = svgNode(svg, ctx);
      } catch (error) {
        throw error instanceof Error && /svg|parse/i.test(error.message) ? new Error(`Figma couldn’t read this SVG: ${error.message}`) : error;
      }
      page.appendChild(node);
      if (asComponent) {
        const component = figma.createComponentFromNode(node);
        ctx.components.set(name, component);
        node = component;
        icons++;
      } else graphics++;
      node.x = origin.x + (placed % PER_ROW) * CELL;
      node.y = origin.y + Math.floor(placed / PER_ROW) * CELL;
      placed++;
      ctx.remember('svgs', node);
      return 'built';
    });
  }
  const bits = [];
  if (icons) bits.push(plural(icons, 'icon'));
  if (graphics) bits.push(plural(graphics, 'graphic'));
  run.summary(bits.join(' · '));
}
