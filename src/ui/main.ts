// The plugin window: tick what to build, add a file (drop, choose or paste), see the check,
// build, watch progress and read the report. The plugin side does the checking and building.
import { countsLine, problemsForAi, type CheckResult, type Problem } from '../check/checker.ts';
import { describeProblem, readJson } from '../read-json.ts';
import { PART_LABEL, type Part } from '../shared/format.ts';
import type { ProgressRow, ToPlugin, ToUi } from '../shared/messages.ts';
import { partLine, reportSubtitle, reportText, reportTitle, skippedNote, type Report } from '../shared/report.ts';
import { copyText } from './clipboard.ts';
import {
  BUTTON,
  COPIED,
  NOT_COPIED,
  NOTHING_CHECKED,
  PASTED_NAME,
  WEB_PAGE_URL,
  buildLabel,
  buildingTitle,
  errorForAi,
  problemsTitle,
} from './texts.ts';

type View = 'empty' | 'paste' | 'read' | 'error' | 'building' | 'done';

const state = {
  view: 'empty' as View,
  fileName: '',
  /** The read error, e.g. "Line 60: a comma is missing after “radius/md”." */
  problem: '',
  pasted: '',
  data: undefined as unknown,
  result: null as CheckResult | null,
  checkId: 0,
  stopping: false,
  report: null as Report | null,
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const views: Record<View, HTMLElement[]> = {
  empty: [$('setup'), $('view-empty'), $('footer-setup')],
  paste: [$('setup'), $('view-paste'), $('footer-setup')],
  read: [$('setup'), $('view-read'), $('view-read-result'), $('footer-setup')],
  error: [$('setup'), $('view-error'), $('footer-setup')],
  building: [$('view-building'), $('footer-building')],
  done: [$('view-done'), $('footer-done')],
};
const allViewParts = [...new Set(Object.values(views).flat())];

const mainButton = $<HTMLButtonElement>('main-button');
const stopButton = $<HTMLButtonElement>('stop-button');
const pasteBox = $<HTMLTextAreaElement>('json-paste');
const fileInput = $<HTMLInputElement>('file-input');
const dropZone = $('drop-zone');
const partBoxes = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="part"]'));

function post(message: ToPlugin): void {
  parent.postMessage({ pluginMessage: message }, '*');
}

function ticked(): Part[] {
  return partBoxes.filter((box) => box.checked).map((box) => box.value as Part);
}

// ── Rendering ───────────────────────────────────────────────────────────

function render(): void {
  const visible = new Set(views[state.view]);
  for (const element of allViewParts) element.hidden = !visible.has(element);
  for (const name of document.querySelectorAll('[data-file-name]')) name.textContent = state.fileName;
  $('error-message').textContent = `${state.problem} ${NOTHING_CHECKED}`;
  if (state.view === 'read') renderResult();

  const result = state.result;
  const button = {
    empty: { label: BUTTON.addFile, enabled: false },
    paste: { label: BUTTON.checkJson, enabled: pasteBox.value.trim() !== '' },
    read: !result
      ? { label: buildLabel(ticked().length), enabled: false }
      : result.skipped.includes('file')
        ? { label: BUTTON.fixFile, enabled: false }
        : result.buildable.length === 0
          ? { label: BUTTON.nothingToBuild, enabled: false }
          : { label: buildLabel(result.buildable.length), enabled: true },
    error: { label: BUTTON.fixFile, enabled: false },
    building: { label: '', enabled: false },
    done: { label: '', enabled: false },
  }[state.view];
  mainButton.textContent = button.label;
  mainButton.disabled = !button.enabled;
  stopButton.textContent = state.stopping ? BUTTON.stopping : BUTTON.stop;
  stopButton.disabled = state.stopping;
}

function renderResult(): void {
  const result = state.result;
  $('checking').hidden = result !== null;
  $('result-ok').hidden = !result || result.problems.length > 0;
  $('result-problems').hidden = !result || result.problems.length === 0;
  if (!result) return;
  $('counts').textContent = countsLine(result.counts);
  $('problems-title').textContent = problemsTitle(result.problems.length);
  $('problem-list').replaceChildren(...result.problems.map(problemRow));
}

const ICONS = {
  error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Error"><circle cx="12" cy="12" r="9"></circle><path d="M15 9l-6 6M9 9l6 6"></path></svg>',
  warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Warning"><path d="M12 3l9.5 17h-19z"></path><path d="M12 10v4M12 17.5v.01"></path></svg>',
  done: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Done"><circle cx="12" cy="12" r="9"></circle><path d="M8 12.5l2.7 2.7L16 9.8"></path></svg>',
  active: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" role="img" aria-label="In progress"><circle class="track" cx="12" cy="12" r="9"></circle><path d="M12 3a9 9 0 0 1 9 9"></path></svg>',
  waiting: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" role="img" aria-label="Waiting"><circle cx="12" cy="12" r="9"></circle></svg>',
};

function element(tag: string, className: string, text?: string): HTMLElement {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function problemRow(problem: Problem): HTMLElement {
  const row = element('li', `problem-row problem-row--${problem.kind}`);
  row.innerHTML = ICONS[problem.kind];
  row.append(element('p', 'problem-message', problem.message));
  return row;
}

function partRow(row: ProgressRow): HTMLElement {
  const li = element('li', `part-row part-row--${row.status}`);
  li.innerHTML = ICONS[row.status];
  const body = element('div', 'part-body');
  body.append(element('div', 'part-name', PART_LABEL[row.part]), element('div', 'part-detail', row.detail));
  li.append(body);
  return li;
}

function renderProgress(fraction: number, rows: ProgressRow[]): void {
  const percent = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  $('progress-fill').style.width = `${percent}%`;
  $('progress').setAttribute('aria-valuenow', String(percent));
  $('building-list').replaceChildren(...rows.map(partRow));
}

function renderReport(report: Report): void {
  $('done-title').textContent = reportTitle(report);
  $('done-subtitle').textContent = reportSubtitle(report);
  const partial = report.stopped || !!report.error || report.parts.some((p) => p.skipped.length > 0);
  $('done-icon').classList.toggle('done-icon--partial', partial);
  $('report-list').replaceChildren(
    ...report.parts.map((part) => {
      const li = element('li', 'part-row');
      const body = element('div', 'part-body');
      body.append(element('div', 'part-name', PART_LABEL[part.part]), element('div', 'part-detail', partLine(part)));
      const notes = [
        ...part.skipped.map((s) => element('li', 'note--skipped', skippedNote(s))),
        ...part.warnings.map((w) => element('li', 'note--warning', w)),
      ];
      if (notes.length) {
        const list = element('ul', 'part-notes');
        list.append(...notes);
        body.append(list);
      }
      li.append(body);
      if (part.reached && (part.built.length || part.alreadyInFile.length)) {
        const show = element('a', 'show-link', 'Show') as HTMLAnchorElement;
        show.href = '#';
        show.dataset.action = 'show-part';
        show.dataset.part = part.part;
        li.append(show);
      }
      return li;
    }),
  );
}

// ── Flow ────────────────────────────────────────────────────────────────

function show(view: View): void {
  state.view = view;
  if (view === 'paste') pasteBox.value = state.pasted; // pasted text is kept when you go back and forth
  render();
  if (view === 'paste') pasteBox.focus();
}

/** fresh: a newly read file (the plugin collects the names in the Figma file again). */
function requestCheck(fresh: boolean): void {
  state.result = null;
  state.checkId++;
  post({ type: 'check', id: state.checkId, data: state.data, ticked: ticked(), fresh });
}

function readText(text: string, fileName: string): void {
  const result = readJson(text);
  state.fileName = fileName;
  if (result.ok) {
    state.problem = '';
    state.data = result.data;
    show('read');
    requestCheck(true);
    render();
  } else {
    state.problem = describeProblem(result);
    state.data = undefined;
    show('error');
  }
}

function readFile(file: File): void {
  const reader = new FileReader();
  reader.onload = () => readText(String(reader.result ?? ''), file.name);
  reader.onerror = () => {
    state.fileName = file.name;
    state.problem = 'This file couldn’t be opened. Try choosing it again.';
    show('error');
  };
  reader.readAsText(file);
}

function startBuild(): void {
  const result = state.result;
  if (!result || result.buildable.length === 0) return;
  state.stopping = false;
  $('building-title').textContent = buildingTitle(state.fileName);
  renderProgress(0, result.buildable.map((part) => ({ part, status: 'waiting', detail: 'Waiting' })));
  show('building');
  post({ type: 'build', data: state.data, ticked: ticked(), fileName: state.fileName });
}

window.addEventListener('message', (event: MessageEvent) => {
  const message = (event.data as { pluginMessage?: ToUi } | null)?.pluginMessage;
  if (!message) return;
  if (message.type === 'checked') {
    if (message.id !== state.checkId) return; // an older check, from before a box changed
    state.result = message.result;
    render();
  } else if (message.type === 'progress') {
    renderProgress(message.fraction, message.rows);
  } else if (message.type === 'done') {
    state.report = message.report;
    renderReport(message.report);
    show('done');
  }
});

/** Copy, then show "Copied" on the button for 2 seconds. */
function copyButton(button: HTMLButtonElement, text: () => string): void {
  const label = button.querySelector('.button-text') as HTMLElement;
  const original = label.textContent ?? '';
  let timer: ReturnType<typeof setTimeout> | undefined;
  button.addEventListener('click', async () => {
    const copied = await copyText(text());
    label.textContent = copied ? COPIED : NOT_COPIED;
    clearTimeout(timer);
    timer = setTimeout(() => {
      label.textContent = original;
    }, 2000);
  });
}

// Links that switch views or ask the plugin to do something
document.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target) return;
  event.preventDefault();
  const action = target.dataset.action;
  if (action === 'show-paste') show('paste');
  else if (action === 'show-empty') show('empty');
  else if (action === 'remove-file') {
    state.data = undefined;
    state.result = null;
    show('empty');
  } else if (action === 'show-part') post({ type: 'show', part: target.dataset.part as Part });
});

$('open-web-page').addEventListener('click', (event) => {
  event.preventDefault();
  post({ type: 'open-url', url: WEB_PAGE_URL });
});

copyButton($('copy-instructions'), () => __INSTRUCTIONS__);
copyButton($('copy-error'), () => errorForAi(state.problem));
copyButton($('copy-problems'), () => problemsForAi(state.result?.problems ?? []));
copyButton($('copy-report'), () => (state.report ? reportText(state.report) : ''));

for (const box of partBoxes) {
  box.addEventListener('change', () => {
    if (state.view === 'read') requestCheck(false);
    render();
  });
}

pasteBox.addEventListener('input', () => {
  state.pasted = pasteBox.value;
  render();
});

mainButton.addEventListener('click', () => {
  if (state.view === 'paste' && pasteBox.value.trim() !== '') readText(pasteBox.value, PASTED_NAME);
  else if (state.view === 'read') startBuild();
});

stopButton.addEventListener('click', () => {
  state.stopping = true;
  post({ type: 'stop' });
  render();
});

// "Build another file": back to state 1, keeping the ticked boxes.
$('build-another').addEventListener('click', () => {
  state.data = undefined;
  state.result = null;
  state.report = null;
  state.fileName = '';
  show('empty');
});

$('choose-file').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (file) readFile(file);
  fileInput.value = ''; // so choosing the same file again still works
});

// Dropping a file: only the drop zone takes it. Elsewhere, stop the window from opening the file.
let dragDepth = 0;
window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('drop', (event) => event.preventDefault());
dropZone.addEventListener('dragenter', (event) => {
  event.preventDefault();
  dragDepth++;
  dropZone.classList.add('is-over');
});
dropZone.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) dropZone.classList.remove('is-over');
});
dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  dragDepth = 0;
  dropZone.classList.remove('is-over');
  const file = event.dataTransfer?.files?.[0];
  if (file) readFile(file);
});

render();
