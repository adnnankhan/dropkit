import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { describeProblem, readJson } from '../src/read-json.ts';
import { readProjectFile } from './helpers.ts';

function problem(text: string): string {
  const result = readJson(text);
  assert.equal(result.ok, false, `expected a problem in ${JSON.stringify(text)}`);
  return result.ok ? '' : describeProblem(result);
}

describe('readJson: the example files', () => {
  it('reads example.json', () => {
    const result = readJson(readProjectFile('examples/example.json'));
    assert.equal(result.ok, true);
  });

  it('reads broken-missing-component.json (its problem is for the checker, not the reader)', () => {
    assert.equal(readJson(readProjectFile('examples/broken-missing-component.json')).ok, true);
  });

  it('finds the missing comma in broken-syntax.json on line 60', () => {
    assert.equal(problem(readProjectFile('examples/broken-syntax.json')), 'Line 60: a comma is missing after “radius/md”.');
  });

  it('counts lines the same with Windows line endings', () => {
    const windows = readProjectFile('examples/broken-syntax.json').replace(/\r?\n/g, '\r\n');
    assert.equal(problem(windows), 'Line 60: a comma is missing after “radius/md”.');
  });

  it('ignores a byte order mark at the start', () => {
    assert.equal(readJson(String.fromCharCode(0xfeff) + '{"a": 1}').ok, true);
  });
});

describe('readJson: plain-words reasons', () => {
  const cases: [string, string][] = [
    ['', 'Line 1: the file is empty.'],
    ['   \n  ', 'Line 1: the file is empty.'],
    ['{"a": 1,\n"b": 2,\n}', 'Line 2: there’s an extra comma after “b”. Remove it.'],
    ['[1, 2,]', 'Line 1: there’s an extra comma after the last item in the list. Remove it.'],
    ['{"stops": [1, 2,]}', 'Line 1: there’s an extra comma after the last item in “stops”. Remove it.'],
    ['{"a": 1\n"b": 2}', 'Line 2: a comma is missing after “a”.'],
    ['[1 2]', 'Line 1: a comma is missing between two items in the list.'],
    ['{"stops": [{}\n{}]}', 'Line 2: a comma is missing between two items in “stops”.'],
    ['{"a" 1}', 'Line 1: a colon (:) is missing after “a”.'],
    ['{name: 1}', 'Line 1: the name “name” needs double quotes around it: "name".'],
    ["{'a': 1}", 'Line 1: text and names must use double quotes ("), not single quotes (\').'],
    ['{"a": \'x\'}', 'Line 1: text and names must use double quotes ("), not single quotes (\').'],
    ['{"fill": red}', 'Line 1: “red” needs double quotes around it if it’s text: "red".'],
    ['{"a": True}', 'Line 1: “True” must be written in lowercase: true.'],
    ['{"a": NULL}', 'Line 1: “NULL” must be written in lowercase: null.'],
    ['{"a": undefined}', 'Line 1: “undefined” isn’t allowed in JSON. Use null instead.'],
    ['{"a": NaN}', 'Line 1: “NaN” isn’t allowed in JSON. Use a number.'],
    ['{"a": 12px}', 'Line 1: “12px” isn’t a valid number. Write numbers without units, like 12.'],
    ['{"a": 01}', 'Line 1: “01” isn’t a valid number.'],
    ['{"a": 1.}', 'Line 1: “1.” isn’t a valid number.'],
    ['{"a": .5}', 'Line 1: “.5” isn’t a valid number.'],
    ['{"a": +1}', 'Line 1: “+1” isn’t a valid number.'],
    ['{"a": 1]', 'Line 1: this ] doesn’t match the { on line 1, which needs a }.'],
    ['{\n"a": [1, 2}', 'Line 2: this } doesn’t match the [ on line 2, which needs a ].'],
    ['{"a": 1', 'Line 1: the file ends too early: the { on line 1 is never closed with a }.'],
    ['{\n  "a": [\n    1\n', 'Line 3: the file ends too early: the [ on line 2 is never closed with a ].'],
    ['{"a":', 'Line 1: the file ends too early: a value is missing after “a”.'],
    ['{"a": , "b": 1}', 'Line 1: a value is missing after “a”.'],
    ['{"a": }', 'Line 1: a value is missing after “a”.'],
    ['[1,,2]', 'Line 1: there’s an extra comma here. Remove it.'],
    ['{"a": "abc\n}', 'Line 1: a piece of text is missing its closing double quote (").'],
    ['{"a": "abc', 'Line 1: a piece of text is missing its closing double quote (").'],
    ['{"a": "a\\qb"}', 'Line 1: “\\q” isn’t allowed inside text. To write a backslash, type two: \\\\.'],
    ['{"a": "\\u12"}', 'Line 1: “\\u” must be followed by 4 hex digits, like \\u00E9.'],
    ['{"a": "x\ty"}', 'Line 1: text can’t contain a tab or other control character. Write a tab as \\t.'],
    ['// note\n{}', 'Line 1: comments aren’t allowed in JSON. Remove the comment.'],
    ['{\n  /* note */\n}', 'Line 2: comments aren’t allowed in JSON. Remove the comment.'],
    ['{}}', 'Line 1: this } has nothing to close. Remove it.'],
    ['{}\n{}', 'Line 2: there’s more text after the end of the JSON. Look for an extra } or ] above this line, or remove the extra text.'],
    ['{"a": 1; "b": 2}', 'Line 1: use a comma here, not a semicolon.'],
    ['{"a": 1: 2}', 'Line 1: a colon (:) is in the wrong place.'],
    ['{"a": @}', 'Line 1: “@” doesn’t belong here.'],
    ['{' + String.fromCharCode(0xa0) + '"a": 1}', 'Line 1: there’s an invisible character here that JSON doesn’t allow, often from copying text. Delete it.'],
  ];

  for (const [text, expected] of cases) {
    it(JSON.stringify(text), () => assert.equal(problem(text), expected));
  }

  it('shortens very long names', () => {
    const name = 'x'.repeat(60);
    assert.equal(problem(`{"${name}": 1 "b": 2}`), `Line 1: a comma is missing after “${'x'.repeat(39)}…”.`);
  });

  it('gives the column too', () => {
    const result = readJson('{\n  "a": 1\n  "b": 2\n}');
    assert.deepEqual(result, { ok: false, line: 3, column: 3, reason: 'a comma is missing after “a”.' });
  });
});

describe('readJson: always finds the place when JSON.parse fails', () => {
  // Damage example.json one character at a time and check the reader always
  // explains the problem, at a line that exists, never with the vague fallback.
  const example = readProjectFile('examples/example.json');
  const lineCount = example.split('\n').length;
  const damages: [string, (text: string, at: number) => string][] = [
    ['delete', (text, at) => text.slice(0, at) + text.slice(at + 1)],
    ['insert comma', (text, at) => text.slice(0, at) + ',' + text.slice(at)],
    ['insert brace', (text, at) => text.slice(0, at) + '}' + text.slice(at)],
    ['insert quote', (text, at) => text.slice(0, at) + '"' + text.slice(at)],
  ];

  for (const [name, damage] of damages) {
    it(name, () => {
      let broken = 0;
      for (let at = 0; at < example.length; at += 7) {
        const text = damage(example, at);
        let parses = true;
        try {
          JSON.parse(text);
        } catch {
          parses = false;
        }
        const result = readJson(text);
        assert.equal(result.ok, parses, `at ${at}`);
        if (!result.ok) {
          broken++;
          assert.notEqual(result.reason, 'this isn’t valid JSON.', `vague reason at ${at}`);
          assert.ok(result.line >= 1 && result.line <= lineCount + 1, `line ${result.line} at ${at}`);
        }
      }
      assert.ok(broken > 0);
    });
  }
});
