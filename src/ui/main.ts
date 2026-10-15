// The plugin window. Step 1: tick boxes, add a file (drop, choose or paste), read it, copy instructions.
import { describeProblem, readJson } from '../read-json.ts';
import { copyText } from './clipboard.ts';
import { BUTTON, COPIED, NOT_COPIED, NOTHING_CHECKED, PASTED_NAME, buildLabel, errorForAi } from './texts.ts';

type View = 'empty' | 'paste' | 'read' | 'error';

const state = {
  view: 'empty' as View,
  fileName: '',
  problem: '',
  pasted: '',
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const views: Record<View, HTMLElement[]> = {
  empty: [$('view-empty')],
  paste: [$('view-paste')],
  read: [$('view-read'), $('view-read-result')],
  error: [$('view-error')],
};
const mainButton = $<HTMLButtonElement>('main-button');
const pasteBox = $<HTMLTextAreaElement>('json-paste');
const fileInput = $<HTMLInputElement>('file-input');
const dropZone = $('drop-zone');
const errorMessage = $('error-message');
const partBoxes = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="part"]'));

function render(): void {
  for (const [view, sections] of Object.entries(views)) {
    for (const section of sections) section.hidden = view !== state.view;
  }
  for (const name of document.querySelectorAll('[data-file-name]')) name.textContent = state.fileName;
  errorMessage.textContent = `${state.problem} ${NOTHING_CHECKED}`;

  const ticked = partBoxes.filter((box) => box.checked).length;
  const button = {
    empty: { label: BUTTON.addFile, enabled: false },
    paste: { label: BUTTON.checkJson, enabled: pasteBox.value.trim() !== '' },
    // Building comes in a later step, so Build stays disabled for now.
    read: { label: buildLabel(ticked), enabled: false },
    error: { label: BUTTON.fixFile, enabled: false },
  }[state.view];
  mainButton.textContent = button.label;
  mainButton.disabled = !button.enabled;
}

function show(view: View): void {
  state.view = view;
  if (view === 'paste') pasteBox.value = state.pasted; // pasted text is kept when you go back and forth
  render();
  if (view === 'paste') pasteBox.focus();
}

function readText(text: string, fileName: string): void {
  const result = readJson(text);
  state.fileName = fileName;
  if (result.ok) {
    state.problem = '';
    show('read');
  } else {
    state.problem = describeProblem(result);
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

// Links that switch views
document.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target) return;
  event.preventDefault();
  const action = target.dataset.action;
  if (action === 'show-paste') show('paste');
  else if (action === 'show-empty') show('empty');
  else if (action === 'remove-file') show('empty');
});

// "Open as web page": placeholder until step 5.
$('open-web-page').addEventListener('click', (event) => event.preventDefault());

copyButton($('copy-instructions'), () => __INSTRUCTIONS__);
copyButton($('copy-error'), () => errorForAi(state.problem));

for (const box of partBoxes) box.addEventListener('change', render);

pasteBox.addEventListener('input', () => {
  state.pasted = pasteBox.value;
  render();
});

mainButton.addEventListener('click', () => {
  if (state.view === 'paste' && pasteBox.value.trim() !== '') readText(pasteBox.value, PASTED_NAME);
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
