// Words the window shows or copies, kept in one place.

export const PASTED_NAME = 'Pasted JSON';
export const NOTHING_CHECKED = 'Nothing was checked yet.';
export const COPIED = 'Copied';
export const NOT_COPIED = 'Couldn’t copy';

export const BUTTON = {
  addFile: 'Add a file to build',
  checkJson: 'Check JSON',
  fixFile: 'Fix the file to build',
} as const;

export function buildLabel(parts: number): string {
  return `Build ${parts} ${parts === 1 ? 'part' : 'parts'}`;
}

/** What "Copy error for your AI" copies. `problem` is e.g. "Line 60: a comma is missing after “radius/md”." */
export function errorForAi(problem: string): string {
  return `The Figma plugin can’t read my JSON file: ${problem} Please fix it and send me the whole corrected file.`;
}
