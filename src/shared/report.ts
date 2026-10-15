// The build report (state 6), and the plain text "Copy report" copies.
import { PART_LABEL, plural, type Part } from './format.ts';

export interface PartReport {
  part: Part;
  /** False when it wasn't built because of Stop. */
  reached: boolean;
  built: string[];
  alreadyInFile: string[];
  /** detail: Figma's own message, kept for the copied report only. */
  skipped: { name: string; reason: string; detail?: string }[];
  warnings: string[];
  /** e.g. "18 variables · 4 text styles · 2 effects" */
  summary: string;
}

export interface Report {
  fileName: string;
  stopped: boolean;
  parts: PartReport[];
}

export function emptyPart(part: Part): PartReport {
  return { part, reached: false, built: [], alreadyInFile: [], skipped: [], warnings: [], summary: '' };
}

/** "Built 5 parts" / "Built 3 of 5 parts" / "Nothing new to build" */
export function reportTitle(report: Report): string {
  const built = report.parts.reduce((n, p) => n + p.built.length, 0);
  const already = report.parts.reduce((n, p) => n + p.alreadyInFile.length, 0);
  if (built === 0 && already > 0 && !report.stopped) return 'Nothing new to build';
  const reached = report.parts.filter((p) => p.reached).length;
  if (reached === report.parts.length) return `Built ${plural(reached, 'part')}`;
  return `Built ${reached} of ${plural(report.parts.length, 'part')}`;
}

/** "From tasks-app.json · nothing skipped" */
export function reportSubtitle(report: Report): string {
  const skipped = report.parts.reduce((n, p) => n + p.skipped.length, 0);
  const already = report.parts.reduce((n, p) => n + p.alreadyInFile.length, 0);
  const bits = [`From ${report.fileName}`];
  bits.push(skipped ? `${plural(skipped, 'item')} skipped` : 'nothing skipped');
  if (already) bits.push(`${already} already in file`);
  if (report.stopped) bits.push('stopped early');
  return bits.join(' · ');
}

/** One line under a part's name in the report. */
export function partLine(part: PartReport): string {
  if (!part.reached) return 'Not built: stopped before this part';
  const bits: string[] = [];
  if (part.summary) bits.push(part.summary);
  if (part.alreadyInFile.length) bits.push(`${part.alreadyInFile.length} already in file`);
  if (part.skipped.length) bits.push(`${part.skipped.length} skipped`);
  if (part.warnings.length) bits.push(plural(part.warnings.length, 'warning'));
  return bits.join(' · ') || 'Nothing to build';
}

/** "New task: …", or just the reason when it already names the item. */
export function skippedNote(item: { name: string; reason: string }): string {
  return item.reason.includes(`“${item.name}”`) ? item.reason : `${item.name}: ${item.reason}`;
}

/** What "Copy report" copies. */
export function reportText(report: Report): string {
  const lines = [`Dropkit report: ${reportTitle(report)}`, reportSubtitle(report), ''];
  for (const part of report.parts) {
    lines.push(`${PART_LABEL[part.part]}: ${partLine(part)}`);
    if (part.built.length) lines.push(`  Built: ${part.built.join(', ')}`);
    if (part.alreadyInFile.length) lines.push(`  Already in file: ${part.alreadyInFile.join(', ')}`);
    for (const s of part.skipped) lines.push(`  Skipped: ${skippedNote(s)}${s.detail ? ` (Figma said: ${s.detail})` : ''}`);
    for (const w of part.warnings) lines.push(`  Warning: ${w}`);
  }
  return lines.join('\n') + '\n';
}
