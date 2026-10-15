// Step 3e: prototype links (FORMAT.md, "Prototype & animations"). Links use the async
// reactions API (HANDOFF lesson 1). The same link is never added twice.
import { matches, plural, type Combination } from '../shared/format.ts';
import { Missing } from './context.ts';
import type { PartRun } from './run.ts';

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

export const OVERLAY_WARNING =
  'Overlay settings (position, closing when clicking outside, background) can’t be set by plugins. Set them in Figma’s Prototype panel on the overlay screen.';

export async function buildPrototype(p: Json, run: PartRun): Promise<void> {
  const { ctx } = run;
  let links = 0;

  if (typeof p.start === 'string') {
    const start = p.start;
    await run.item('start', `Start on “${start}”`, async () => {
      const screen = ctx.screens.get(start);
      if (!screen) throw new Missing('screen', start);
      const page = pageOf(screen);
      if (page.flowStartingPoints.some((f) => f.nodeId === screen.id)) return 'already';
      page.flowStartingPoints = [...page.flowStartingPoints, { nodeId: screen.id, name: start }];
      ctx.remember('prototype', screen);
      return 'built';
    });
  }

  for (const [i, link] of (Array.isArray(p.links) ? (p.links as Json[]) : []).entries()) {
    const label = linkLabel(link, i);
    await run.item(`link:${i}`, label, async () => {
      const from = ctx.screens.get(link.from as string);
      if (!from) throw new Missing('screen', String(link.from));
      const node = typeof link.layer === 'string' ? findPath(from, link.layer) : from;
      if (!node) throw new Missing('layer', String(link.layer));
      if (link.position !== undefined || link.closeOnOutside !== undefined || link.background !== undefined) run.warn(OVERLAY_WARNING);
      const added = await addReaction(node as SceneNode & ReactionMixin, { trigger: trigger(link), actions: [action(link, run)] });
      ctx.remember('prototype', from);
      if (!added) return 'already';
      links++;
      return 'built';
    });
  }

  for (const [i, link] of (Array.isArray(p.componentLinks) ? (p.componentLinks as Json[]) : []).entries()) {
    const label = `${String(link.component)}: ${combo(link.from)} → ${combo(link.to)}`;
    await run.item(`componentLink:${i}`, label, async () => {
      const target = ctx.components.get(link.component as string);
      if (!target) throw new Missing('component', String(link.component));
      if (target.type !== 'COMPONENT_SET') throw new Missing('variants of', String(link.component));
      const variants = target.children.filter((c): c is ComponentNode => c.type === 'COMPONENT');
      const from = (isObject(link.from) ? link.from : {}) as Combination;
      const to = (isObject(link.to) ? link.to : {}) as Combination;
      let added = 0;
      for (const source of variants.filter((v) => matches(v.variantProperties ?? {}, from))) {
        const want = { ...(source.variantProperties ?? {}), ...to };
        const destination = variants.find((v) => matches(v.variantProperties ?? {}, want) && matches(want, v.variantProperties ?? {}));
        if (!destination || destination === source) continue;
        const node = typeof link.layer === 'string' ? findPath(source, link.layer) : source;
        if (!node) throw new Missing('layer', String(link.layer));
        const change: Action = { type: 'NODE', destinationId: destination.id, navigation: 'CHANGE_TO', transition: transition(link) };
        if (await addReaction(node as SceneNode & ReactionMixin, { trigger: trigger(link), actions: [change] })) added++;
      }
      ctx.remember('prototype', target);
      if (added === 0) return 'already';
      links++;
      return 'built';
    });
  }
  run.summary(links ? plural(links, 'link') : '');
}

function linkLabel(link: Json, i: number): string {
  if (link.action === 'back') return `Back from “${String(link.from)}”`;
  if (link.action === 'close') return `Close from “${String(link.from)}”`;
  if (typeof link.to === 'string') return `“${String(link.from)}” → “${link.to}”`;
  return `Link ${i + 1}`;
}

function combo(value: unknown): string {
  return isObject(value) ? Object.entries(value).map(([k, v]) => `${k}=${String(v)}`).join(', ') : '';
}

function pageOf(node: BaseNode): PageNode {
  let current: BaseNode | null = node;
  while (current && current.type !== 'PAGE') current = current.parent;
  return (current as PageNode) ?? figma.currentPage;
}

/** A layer by name, or by "Parent/Child" path when names repeat. */
export function findPath(root: SceneNode, path: string): SceneNode | null {
  if (!('findAll' in root)) return null;
  const whole = root.findAll((n) => n.name === path);
  if (whole.length >= 1) return whole[0];
  let current: SceneNode[] = [root];
  for (const segment of path.split('/')) {
    current = current.flatMap((n) => ('findAll' in n ? n.findAll((c) => c.name === segment) : []));
    if (current.length === 0) return null;
  }
  return current[0] ?? null;
}

function trigger(link: Json): Trigger {
  switch (link.on) {
    case 'press':
      return { type: 'ON_PRESS' };
    case 'hover':
      return { type: 'ON_HOVER' };
    case 'drag':
      return { type: 'ON_DRAG' };
    case 'afterDelay':
      // Figma's Trigger docs: "timeout … stored in milliseconds", the same unit as FORMAT.md.
      return { type: 'AFTER_TIMEOUT', timeout: typeof link.delay === 'number' ? link.delay : 0 };
    default:
      return { type: 'ON_CLICK' };
  }
}

const EASING: Record<string, Easing['type']> = {
  linear: 'LINEAR',
  easeIn: 'EASE_IN',
  easeOut: 'EASE_OUT',
  easeInOut: 'EASE_IN_AND_OUT',
  gentle: 'GENTLE',
  quick: 'QUICK',
  bouncy: 'BOUNCY',
  slow: 'SLOW',
};

export function transition(link: Json): Transition | null {
  const kind = link.transition ?? 'instant';
  if (kind === 'instant') return null;
  const easing: Easing = { type: EASING[link.easing as string] ?? 'EASE_OUT' };
  // FORMAT.md uses ms; Figma's transitions use seconds (its docs example: 0.2, 0.5).
  const duration = (typeof link.duration === 'number' ? link.duration : 300) / 1000;
  if (kind === 'dissolve') return { type: 'DISSOLVE', easing, duration };
  if (kind === 'smartAnimate') return { type: 'SMART_ANIMATE', easing, duration };
  const type = ({ moveIn: 'MOVE_IN', moveOut: 'MOVE_OUT', push: 'PUSH', slideIn: 'SLIDE_IN', slideOut: 'SLIDE_OUT' } as const)[kind as 'push'];
  if (!type) return null;
  const direction = ({ left: 'LEFT', right: 'RIGHT', up: 'TOP', down: 'BOTTOM' } as const)[(link.direction as 'left') ?? 'left'] ?? 'LEFT';
  return { type, direction, matchLayers: false, easing, duration };
}

function action(link: Json, run: PartRun): Action {
  const ctx = run.ctx;
  switch (link.action) {
    case 'back':
      return { type: 'BACK' };
    case 'close':
      return { type: 'CLOSE' };
    case 'url':
      return { type: 'URL', url: link.to as string };
    default: {
      const to = ctx.screens.get(link.to as string);
      if (!to) throw new Missing('screen', String(link.to));
      const navigation = link.action === 'overlay' ? 'OVERLAY' : link.action === 'swapOverlay' ? 'SWAP' : 'NAVIGATE';
      return { type: 'NODE', destinationId: to.id, navigation, transition: transition(link) };
    }
  }
}

/** Adds a reaction unless the node already has the same one. Returns false when it was there. */
async function addReaction(node: SceneNode & ReactionMixin, reaction: Reaction): Promise<boolean> {
  const existing = node.reactions ?? [];
  const sig = signature(reaction);
  if (existing.some((r) => signature(r) === sig)) return false;
  await node.setReactionsAsync([...existing, reaction]);
  return true;
}

function signature(reaction: Reaction): string {
  const actions = reaction.actions ?? (reaction.action ? [reaction.action] : []);
  return JSON.stringify([
    reaction.trigger?.type,
    actions.map((a) => [a.type, 'destinationId' in a ? a.destinationId : null, 'navigation' in a ? a.navigation : null, 'url' in a ? a.url : null]),
  ]);
}
