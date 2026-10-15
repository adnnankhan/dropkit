// Builds the ticked parts in order (FORMAT.md, "How the plugin checks and builds"):
// design system → SVGs → components → screens → prototype. Checks the file again first,
// so the build skips exactly what the checker said it would.
import { checkFile } from '../check/checker.ts';
import type { Part } from '../shared/format.ts';
import type { ProgressRow } from '../shared/messages.ts';
import { emptyPart, partLine, type PartReport, type Report } from '../shared/report.ts';
import { buildComponents } from './build-components.ts';
import { buildDesignSystem } from './build-design-system.ts';
import { buildPrototype } from './build-prototype.ts';
import { buildScreens } from './build-screens.ts';
import { buildSvgs } from './build-svgs.ts';
import { BuildContext, reason } from './context.ts';
import { collectNames } from './names.ts';
import { PartRun } from './run.ts';

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

export interface BuildHooks {
  shouldStop(): boolean;
  onProgress(fraction: number, rows: ProgressRow[]): void;
}

/** What the last build made, for "Show". */
let lastMade = new Map<string, string[]>();

export async function build(data: unknown, ticked: Part[], fileName: string, hooks: BuildHooks): Promise<Report> {
  const result = checkFile(data, ticked, await collectNames());
  const d = isObject(data) ? data : {};
  const parts = result.buildable;
  const report: Report = { fileName, stopped: false, parts: parts.map(emptyPart) };
  if (parts.length === 0) return report;

  const ctx = await BuildContext.load();
  const skips = new Map(Object.entries(result.reasons));
  const svgs = new Map<string, Json>();
  for (const svg of Array.isArray(d.svgs) ? d.svgs : []) if (isObject(svg) && typeof svg.name === 'string' && !svgs.has(svg.name)) svgs.set(svg.name, svg);

  // Progress: one step per item across all parts.
  const totals = new Map(parts.map((part) => [part, itemCount(d, part)]));
  const total = Math.max(1, [...totals.values()].reduce((a, b) => a + b, 0));
  let done = 0;
  let current: { part: Part; label: string; index: number } | null = null;
  const rows = (): ProgressRow[] =>
    report.parts.map((p) => {
      if (current?.part === p.part) {
        return { part: p.part, status: 'active', detail: `Building “${current.label}” · ${current.index} of ${totals.get(p.part)}` };
      }
      if (p.reached) return { part: p.part, status: 'done', detail: partLine(p) };
      return { part: p.part, status: 'waiting', detail: 'Waiting' };
    });
  const send = () => hooks.onProgress(done / total, rows());

  let stopped = false;
  for (const partReport of report.parts) {
    const part = partReport.part;
    if (stopped || hooks.shouldStop()) {
      stopped = true;
      continue;
    }
    let index = 0;
    const run = new PartRun(ctx, partReport, skips, {
      shouldStop: hooks.shouldStop,
      onItem: (p, label) => {
        if (current) done++;
        current = { part: p, label, index: ++index };
        send();
      },
    });
    current = null;
    send();
    try {
      if (skips.has(`part:${part}`)) partReport.skipped.push({ name: 'All', reason: skips.get(`part:${part}`)! });
      else await runPart(part, d, svgs, run);
    } catch (error) {
      // A part never stops the build: report it and go on (HANDOFF lesson 11).
      const why = reason(error);
      run.warn(`Something went wrong in this part, so it may be incomplete. ${why.reason}${why.detail ? ` (${why.detail})` : ''}`);
    }
    partReport.reached = true;
    if (current) done++;
    current = null;
    if (run.stopped) stopped = true;
    send();
  }
  report.stopped = stopped;
  lastMade = ctx.made;
  return report;
}

async function runPart(part: Part, d: Json, svgs: Map<string, Json>, run: PartRun): Promise<void> {
  switch (part) {
    case 'designSystem':
      return buildDesignSystem(d.designSystem as Json, run);
    case 'svgs':
      return buildSvgs((d.svgs as unknown[]).filter(isObject), run);
    case 'components':
      return buildComponents((d.components as unknown[]).filter(isObject), svgs, run);
    case 'screens':
      return buildScreens((d.screens as unknown[]).filter(isObject), svgs, run);
    case 'prototype':
      return buildPrototype(d.prototype as Json, run);
  }
}

function itemCount(d: Json, part: Part): number {
  const value = d[part];
  if (Array.isArray(value)) return value.length;
  if (!isObject(value)) return 0;
  if (part === 'designSystem') {
    return ['colors', 'gradients', 'spacing', 'radius', 'sizes', 'textStyles', 'effects'].reduce(
      (n, key) => n + (isObject(value[key]) ? Object.keys(value[key] as Json).length : 0),
      0,
    );
  }
  return (Array.isArray(value.links) ? value.links.length : 0) + (Array.isArray(value.componentLinks) ? value.componentLinks.length : 0) + (value.start ? 1 : 0);
}

/** "Show": selects and zooms to what the last build made for a part. */
export async function showPart(part: Part): Promise<void> {
  if (part === 'designSystem') {
    figma.notify('The design system is in Local variables and Local styles: click an empty spot on the canvas to see them in the right panel.');
    return;
  }
  const ids = lastMade.get(part) ?? [];
  const nodes: SceneNode[] = [];
  for (const id of ids) {
    const node = await figma.getNodeByIdAsync(id);
    if (node && !node.removed && 'visible' in node) nodes.push(node as SceneNode);
  }
  if (nodes.length === 0) {
    figma.notify('Nothing from this part to show. It may have been deleted.');
    return;
  }
  let page: BaseNode | null = nodes[0];
  while (page && page.type !== 'PAGE') page = page.parent;
  if (page) await figma.setCurrentPageAsync(page as PageNode);
  const onPage = nodes.filter((n) => {
    let p: BaseNode | null = n;
    while (p && p.type !== 'PAGE') p = p.parent;
    return p === page;
  });
  figma.currentPage.selection = onPage;
  figma.viewport.scrollAndZoomIntoView(onPage);
}

