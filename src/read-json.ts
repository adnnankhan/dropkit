// Reads JSON text. When it isn't valid JSON, finds where and says why in plain words,
// for example "Line 60: a comma is missing after “radius/md”."
//
// JSON.parse does the reading. Its error messages differ between browsers and aren't
// plain words, so when it fails, a small scanner walks the text to find the problem.

export type ReadResult =
  | { ok: true; data: unknown }
  | { ok: false; line: number; column: number; reason: string };

type Problem = Extract<ReadResult, { ok: false }>;

export function readJson(text: string): ReadResult {
  const source = text.replace(/^\uFEFF/, '');
  if (source.trim() === '') return { ok: false, line: 1, column: 1, reason: 'the file is empty.' };
  try {
    return { ok: true, data: JSON.parse(source) };
  } catch {
    return findProblem(source);
  }
}

/** "Line 60: a comma is missing after “radius/md”." */
export function describeProblem(problem: { line: number; reason: string }): string {
  return `Line ${problem.line}: ${problem.reason}`;
}

class Found {
  readonly at: number;
  readonly reason: string;
  constructor(at: number, reason: string) {
    this.at = at;
    this.reason = reason;
  }
}

type Context =
  | { kind: 'root' }
  | { kind: 'member'; key: string }
  | { kind: 'item'; list: string | null };

const OPENER_TO_CLOSER: Record<string, string> = { '{': '}', '[': ']' };
const INVISIBLE = /[\u00A0\u200B\u2028\u2029\uFEFF]/;
const VALUE_START = /["'{[\-0-9A-Za-z_$]/;

function findProblem(source: string): Problem {
  try {
    new Scanner(source).document();
  } catch (error) {
    if (error instanceof Found) return { ok: false, ...position(source, error.at), reason: error.reason };
    throw error;
  }
  // JSON.parse refused the text but the scanner found nothing: say so without guessing.
  return { ok: false, line: 1, column: 1, reason: 'this isn’t valid JSON.' };
}

function position(source: string, at: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < at && i < source.length; i++) {
    const c = source[i];
    if (c === '\n' || (c === '\r' && source[i + 1] !== '\n')) {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: at - lineStart + 1 };
}

function quoted(name: string): string {
  const short = name.length > 40 ? name.slice(0, 39) + '…' : name;
  return `“${short}”`;
}

function inList(list: string | null): string {
  return list === null ? 'the list' : quoted(list);
}

class Scanner {
  private readonly s: string;
  private i = 0;
  private readonly open: { char: string; at: number }[] = [];

  constructor(source: string) {
    this.s = source;
  }

  document(): void {
    this.skipSpace();
    this.value({ kind: 'root' });
    this.skipSpace();
    if (this.i < this.s.length) {
      const c = this.s[this.i];
      if (c === '}' || c === ']') throw new Found(this.i, `this ${c} has nothing to close. Remove it.`);
      throw new Found(this.i, 'there’s more text after the end of the JSON. Look for an extra } or ] above this line, or remove the extra text.');
    }
  }

  private skipSpace(): void {
    while (this.i < this.s.length) {
      const c = this.s[this.i];
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
        this.i++;
      } else if (c === '/' && (this.s[this.i + 1] === '/' || this.s[this.i + 1] === '*')) {
        throw new Found(this.i, 'comments aren’t allowed in JSON. Remove the comment.');
      } else if (INVISIBLE.test(c)) {
        throw new Found(this.i, 'there’s an invisible character here that JSON doesn’t allow, often from copying text. Delete it.');
      } else {
        return;
      }
    }
  }

  private value(context: Context): void {
    const c = this.s[this.i];
    if (c === undefined) this.endsEarly(context);
    else if (c === '{') this.object();
    else if (c === '[') this.array(context.kind === 'member' ? context.key : null);
    else if (c === '"') this.string();
    else if (c === '-' || (c >= '0' && c <= '9')) this.number();
    else if (c === '+' || (c === '.' && /[0-9]/.test(this.s[this.i + 1] ?? ''))) this.badNumber(this.i);
    else if (/[A-Za-z_$]/.test(c)) this.word();
    else if (c === "'") this.singleQuote();
    else if (context.kind === 'member' && (c === ',' || c === '}' || c === ']')) {
      throw new Found(this.i, `a value is missing after ${quoted(context.key)}.`);
    } else if (context.kind === 'item' && c === ',') {
      throw new Found(this.i, 'there’s an extra comma here. Remove it.');
    } else if (context.kind === 'root' && (c === '}' || c === ']')) {
      throw new Found(this.i, `this ${c} has nothing to close. Remove it.`);
    } else this.unexpected();
  }

  private object(): void {
    this.open.push({ char: '{', at: this.i });
    this.i++;
    this.skipSpace();
    if (this.s[this.i] === '}') {
      this.close();
      return;
    }
    for (;;) {
      const key = this.key();
      const keyAt = this.i;
      this.skipSpace();
      const c = this.s[this.i];
      if (c === undefined) this.endsEarly({ kind: 'member', key });
      if (c !== ':') throw new Found(keyAt, `a colon (:) is missing after ${quoted(key)}.`);
      this.i++;
      this.skipSpace();
      this.value({ kind: 'member', key });
      this.skipSpace();
      if (this.afterItem('}', `a comma is missing after ${quoted(key)}.`, `there’s an extra comma after ${quoted(key)}. Remove it.`)) return;
    }
  }

  private array(list: string | null): void {
    this.open.push({ char: '[', at: this.i });
    this.i++;
    this.skipSpace();
    if (this.s[this.i] === ']') {
      this.close();
      return;
    }
    for (;;) {
      this.value({ kind: 'item', list });
      this.skipSpace();
      if (this.afterItem(']', `a comma is missing between two items in ${inList(list)}.`, `there’s an extra comma after the last item in ${inList(list)}. Remove it.`)) return;
    }
  }

  /** After a member or item: a comma (go on) or the closer (done). Returns true when closed. */
  private afterItem(closer: string, missingComma: string, extraComma: string): boolean {
    const c = this.s[this.i];
    if (c === ',') {
      const commaAt = this.i;
      this.i++;
      this.skipSpace();
      const next = this.s[this.i];
      if (next === '}' || next === ']') throw new Found(commaAt, extraComma);
      return false;
    }
    if (c === closer) {
      this.close();
      return true;
    }
    if (c === undefined) this.endsEarly({ kind: 'root' });
    if (c === '}' || c === ']') this.mismatch(c);
    if (c === ';') throw new Found(this.i, 'use a comma here, not a semicolon.');
    if (c === ':') throw new Found(this.i, 'a colon (:) is in the wrong place.');
    if (VALUE_START.test(c)) throw new Found(this.i, missingComma);
    return this.unexpected();
  }

  private key(): string {
    const c = this.s[this.i];
    if (c === '"') return this.string();
    if (c === undefined) this.endsEarly({ kind: 'root' });
    if (c === "'") this.singleQuote();
    if (c === ']') this.mismatch(c);
    const word = /^[A-Za-z_$][\w$-]*/.exec(this.s.slice(this.i, this.i + 200));
    if (word) throw new Found(this.i, `the name ${quoted(word[0])} needs double quotes around it: "${word[0]}".`);
    return this.unexpected();
  }

  private string(): string {
    const start = this.i;
    this.i++;
    for (;;) {
      const c = this.s[this.i];
      if (c === undefined || c === '\n' || c === '\r') {
        throw new Found(start, 'a piece of text is missing its closing double quote (").');
      }
      if (c === '"') {
        this.i++;
        return this.s.slice(start + 1, this.i - 1);
      }
      if (c === '\\') {
        const next = this.s[this.i + 1] ?? '';
        if (next === 'u') {
          if (!/^[0-9A-Fa-f]{4}$/.test(this.s.slice(this.i + 2, this.i + 6))) {
            throw new Found(this.i, '“\\u” must be followed by 4 hex digits, like \\u00E9.');
          }
          this.i += 6;
        } else if ('"\\/bfnrt'.includes(next) && next !== '') {
          this.i += 2;
        } else {
          throw new Found(this.i, `“\\${next}” isn’t allowed inside text. To write a backslash, type two: \\\\.`);
        }
        continue;
      }
      if (c < ' ') throw new Found(this.i, 'text can’t contain a tab or other control character. Write a tab as \\t.');
      this.i++;
    }
  }

  private number(): void {
    const start = this.i;
    const match = /-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/y;
    match.lastIndex = start;
    const found = match.exec(this.s);
    const end = found ? start + found[0].length : start;
    if (!found || /[0-9A-Za-z_.+-]/.test(this.s[end] ?? '')) this.badNumber(start);
    this.i = end;
  }

  private badNumber(start: number): never {
    const token = /^[0-9A-Za-z_.+%-]+/.exec(this.s.slice(start, start + 40))?.[0] ?? this.s[start];
    if (/^-?[0-9]+(?:\.[0-9]+)?[A-Za-z%]+$/.test(token)) {
      throw new Found(start, `${quoted(token)} isn’t a valid number. Write numbers without units, like ${/^-?[0-9.]+/.exec(token)![0]}.`);
    }
    throw new Found(start, `${quoted(token)} isn’t a valid number.`);
  }

  private word(): void {
    const start = this.i;
    const word = /^[A-Za-z_$][\w$]*/.exec(this.s.slice(start, start + 200))![0];
    if (word === 'true' || word === 'false' || word === 'null') {
      this.i += word.length;
      return;
    }
    const lower = word.toLowerCase();
    if (lower === 'true' || lower === 'false' || lower === 'null') {
      throw new Found(start, `${quoted(word)} must be written in lowercase: ${lower}.`);
    }
    if (word === 'undefined' || word === 'None') throw new Found(start, `${quoted(word)} isn’t allowed in JSON. Use null instead.`);
    if (word === 'NaN' || word === 'Infinity') throw new Found(start, `${quoted(word)} isn’t allowed in JSON. Use a number.`);
    throw new Found(start, `${quoted(word)} needs double quotes around it if it’s text: "${word}".`);
  }

  private singleQuote(): never {
    throw new Found(this.i, 'text and names must use double quotes ("), not single quotes (\').');
  }

  private close(): void {
    this.open.pop();
    this.i++;
  }

  private mismatch(found: string): never {
    const opener = this.open[this.open.length - 1];
    const { line } = position(this.s, opener.at);
    throw new Found(this.i, `this ${found} doesn’t match the ${opener.char} on line ${line}, which needs a ${OPENER_TO_CLOSER[opener.char]}.`);
  }

  private endsEarly(context: Context): never {
    const opener = this.open[this.open.length - 1];
    const end = this.s.trimEnd().length;
    if (context.kind === 'member') {
      throw new Found(end, `the file ends too early: a value is missing after ${quoted(context.key)}.`);
    }
    if (!opener) throw new Found(end, 'the file ends too early: a value is missing.');
    const { line } = position(this.s, opener.at);
    throw new Found(end, `the file ends too early: the ${opener.char} on line ${line} is never closed with a ${OPENER_TO_CLOSER[opener.char]}.`);
  }

  private unexpected(): never {
    throw new Found(this.i, `${quoted(this.s[this.i])} doesn’t belong here.`);
  }
}
