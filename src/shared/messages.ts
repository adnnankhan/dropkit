// Messages between the window (ui) and the plugin (code), in both directions.
import type { CheckResult } from '../check/checker.ts';
import type { Part } from './format.ts';
import type { Report } from './report.ts';

export type ToPlugin =
  | { type: 'check'; id: number; data: unknown; ticked: Part[] }
  | { type: 'build'; data: unknown; ticked: Part[]; fileName: string }
  | { type: 'stop' }
  | { type: 'show'; part: Part }
  | { type: 'open-url'; url: string };

export interface ProgressRow {
  part: Part;
  status: 'done' | 'active' | 'waiting';
  /** "18 variables · 4 text styles" when done, "Building “Task row” · 3 of 3" when active. */
  detail: string;
}

export type ToUi =
  | { type: 'checked'; id: number; result: CheckResult }
  | { type: 'progress'; fraction: number; rows: ProgressRow[] }
  | { type: 'done'; report: Report };
