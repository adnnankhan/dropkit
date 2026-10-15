// The text behind "Copy instructions": these three files, joined in this order.
// Read at build time, so the plugin always ships the current files.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const INSTRUCTION_FILES = [
  'instructions/AI-INSTRUCTIONS.md',
  'docs/FORMAT.md',
  'examples/example.json',
];

export function buildInstructions(root) {
  return INSTRUCTION_FILES.map((file, index) => {
    let text = readFileSync(join(root, file), 'utf8')
      .replace(/^\uFEFF/, '')
      .replace(/\r\n?/g, '\n');
    // The note at the top of AI-INSTRUCTIONS.md is for us, not for the AI.
    if (index === 0) text = text.replace(/<!--[\s\S]*?-->\n*/g, '');
    return text.trim();
  }).join('\n\n') + '\n';
}
