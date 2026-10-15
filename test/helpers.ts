import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('..', import.meta.url));

export function readProjectFile(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}
