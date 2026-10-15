// Step 3d: screens (FORMAT.md, "Screens"). Each screen is a top-level frame on the Screens
// page, left to right in the order listed, built with the same layer code as components.
import { plural } from '../shared/format.ts';
import { COLLECTIONS, PAGES } from './context.ts';
import { buildLayer, type LayerScope } from './layers.ts';
import { rightOf } from './place.ts';
import type { PartRun } from './run.ts';

type Json = Record<string, unknown>;

const GAP = 80;

export async function buildScreens(screens: Json[], svgs: Map<string, Json>, run: PartRun): Promise<void> {
  const { ctx } = run;
  const { page, warning } = await ctx.page(PAGES.screens);
  if (warning) run.warn(warning);
  const start = rightOf(page);
  let x = start.x;
  let built = 0;

  for (const [i, screen] of screens.entries()) {
    const name = screen.name as string;
    const key = run.isSkipped(`screen#${i}`) ? `screen#${i}` : `screen:${name}`;
    await run.item(key, name, async () => {
      if (ctx.screens.has(name)) return 'already';
      const frame = figma.createFrame();
      page.appendChild(frame);
      try {
        frame.name = name;
        frame.resize(screen.width as number, screen.height as number);
        frame.clipsContent = screen.clip !== false; // screens clip, like a device
        const scope: LayerScope = { ctx, svgs, links: [], warn: (m) => run.warn(m) };
        const { width: _w, height: _h, mode: _m, ...fields } = screen;
        await buildLayer({ ...fields, type: 'frame', width: screen.width, height: screen.height }, null, scope, frame);
        setMode(frame, screen.mode, run);
        frame.x = x;
        frame.y = start.y;
      } catch (error) {
        frame.remove();
        throw error;
      }
      x += (screen.width as number) + GAP;
      ctx.screens.set(name, frame);
      ctx.remember('screens', frame);
      built++;
      return 'built';
    });
  }
  run.summary(built ? plural(built, 'screen') : '');
}

/** Shows the screen in its colour mode. A mode the file doesn't have (free plan) gets a warning. */
function setMode(frame: FrameNode, mode: unknown, run: PartRun): void {
  if (typeof mode !== 'string') return;
  const collection = run.ctx.collections.get(COLLECTIONS.colors);
  const found = collection?.modes.find((m) => m.name === mode);
  if (!collection || !found) {
    const first = collection?.modes[0]?.name;
    run.warn(`Screen “${frame.name}” is set to “${mode}”, but the file has no “${mode}” colour mode${first ? `, so it shows “${first}”` : ''}. On Figma’s free plan, colours have one mode only.`);
    return;
  }
  if (found.modeId !== collection.defaultModeId) frame.setExplicitVariableModeForCollection(collection, found.modeId);
}
