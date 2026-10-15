// Runs a build part item by item: each item in its own try/catch, skipped items reported,
// Stop honoured between items (never in the middle of one), progress sent as it goes.
import type { Part } from '../shared/format.ts';
import type { PartReport } from '../shared/report.ts';
import { reason, type BuildContext } from './context.ts';

export interface Controls {
  shouldStop(): boolean;
  /** Called before each item. */
  onItem(part: Part, label: string): void;
}

export const STOPPED = 'Stopped before it was built.';

/** For items the checker always skips (not a { } block, or no name): never runs. */
export async function notBuildable(): Promise<never> {
  throw new Error('This item can’t be built.');
}

export class PartRun {
  readonly ctx: BuildContext;
  readonly report: PartReport;
  /** Item key → why the checker skips it. */
  private readonly skips: Map<string, string>;
  private readonly controls: Controls;
  stopped = false;

  constructor(ctx: BuildContext, report: PartReport, skips: Map<string, string>, controls: Controls) {
    this.ctx = ctx;
    this.report = report;
    this.skips = skips;
    this.controls = controls;
  }

  /**
   * Builds one item. `key` is the checker's item key, `label` its name in the report.
   * `build` returns "already" when the name was already in the file.
   */
  async item(key: string, label: string, build: () => Promise<'built' | 'already'>): Promise<boolean> {
    if (this.stopped || this.controls.shouldStop()) {
      this.stopped = true;
      this.report.skipped.push({ name: label, reason: STOPPED });
      return false;
    }
    const why = this.skips.get(key);
    if (why) {
      this.report.skipped.push({ name: label, reason: why });
      return false;
    }
    this.controls.onItem(this.report.part, label);
    // Let Figma deliver messages (Stop) and draw progress between items.
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      const result = await build();
      if (result === 'already') this.report.alreadyInFile.push(label);
      else this.report.built.push(label);
      return result === 'built';
    } catch (error) {
      this.unbuilt(label, error);
      return false;
    }
  }

  /** Moves an item that failed after it was counted as built into "skipped". */
  unbuilt(label: string, error: unknown): void {
    this.report.built = this.report.built.filter((name) => name !== label);
    const { reason: why, detail } = reason(error);
    this.report.skipped.push({ name: label, reason: why, detail });
  }

  isSkipped(key: string): boolean {
    return this.skips.has(key);
  }

  warn(message: string): void {
    if (!this.report.warnings.includes(message)) this.report.warnings.push(message);
  }

  summary(text: string): void {
    this.report.summary = text;
  }
}
