// Helpers for the listing images: the real plugin window in a given state, and the two
// example screens as Figma builds them from examples/example.json.
// data.json is made by scripts/listing-images.mjs from the real checker and builder.

export const ICONS = {
  check: (c, s = 24) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  plus: (c, s = 24) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="${c}" stroke-width="2" stroke-linecap="round"/></svg>`,
  back: (c, s = 24) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

let dataPromise = null;
export function data() {
  dataPromise ??= fetch('./data.json').then((r) => r.json());
  return dataPromise;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Puts the real plugin window (dist/ui.html) at x, y, scaled, in one of its states:
 * empty, checked-ok, checked-problems, building, done.
 */
export async function plugin(parent, { x, y, scale = 1, state }) {
  const d = await data();
  const frame = document.createElement('div');
  frame.className = 'plugin';
  frame.style.left = `${x}px`;
  frame.style.top = `${y}px`;
  frame.style.transform = `scale(${scale})`;
  frame.innerHTML = `<div class="bar"><img src="../../icon/dropkit-icon.svg" alt="">Dropkit<span class="close">✕</span></div>`;
  const iframe = document.createElement('iframe');
  iframe.src = '/dist/ui.html';
  frame.append(iframe);
  parent.append(frame);
  await new Promise((r) => iframe.addEventListener('load', r, { once: true }));

  const w = iframe.contentWindow;
  const doc = w.document;
  doc.documentElement.classList.add('figma-dark');
  const font = doc.createElement('link');
  font.rel = 'stylesheet';
  font.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=block';
  doc.head.append(font);
  const send = (message) => w.dispatchEvent(new w.MessageEvent('message', { data: { pluginMessage: message } }));
  const $ = (s) => doc.querySelector(s);
  // Drops a file on the drop zone, as a person would, and waits until it's read.
  const read = async (fileName, tickPrototype) => {
    if (tickPrototype) $('input[value="prototype"]').click();
    const files = new w.DataTransfer();
    files.items.add(new w.File(['{"format": "dropkit/0.1"}'], fileName, { type: 'application/json' }));
    $('#drop-zone').dispatchEvent(new w.DragEvent('drop', { dataTransfer: files, bubbles: true, cancelable: true }));
    while ($('#view-read').hidden) await wait(10);
  };

  if (state === 'checked-ok') {
    await read('tasks-app.json', true);
    send({ type: 'checked', id: 1, result: d.ok });
  } else if (state === 'checked-problems') {
    await read('tasks-app.json', false);
    send({ type: 'checked', id: 1, result: d.broken });
  } else if (state === 'building' || state === 'done') {
    await read('tasks-app.json', true);
    send({ type: 'checked', id: 1, result: d.ok });
    await wait(10);
    $('#main-button').click();
    send({ type: 'progress', fraction: d.progress.fraction, rows: d.progress.rows });
    if (state === 'done') send({ type: 'done', report: d.report });
  }
  await doc.fonts.ready;
  return frame;
}

/** The "Tasks" screen from example.json. */
export function tasksScreen(parent, { x, y, scale = 1, label = true }) {
  return screen(parent, { x, y, scale, label: label && 'Tasks' }, `
    <div class="abs t-title" style="left:20px;top:64px">Today</div>
    <div class="abs" style="left:20px;top:120px;display:flex;flex-direction:column;gap:8px">
      <div class="row"><div class="box"><i></i></div><span class="t-body">Call the bank</span></div>
      <div class="row"><div class="box on"><i>${ICONS.check('#fff', 16)}</i></div><span class="t-body" style="color:#6b6b73;text-decoration:line-through">Send the invoice</span></div>
    </div>
    <div class="abs t-body" style="left:20px;top:256px;color:#6b6b73">1 of 2 tasks <span class="t-headline" style="color:#111113">done</span></div>
    <div class="abs" style="left:20px;top:286px;width:353px;height:8px;border-radius:999px;background:#f2f2f5"></div>
    <div class="abs" style="left:20px;top:286px;width:176px;height:8px;border-radius:999px;background:linear-gradient(90deg,#4f46e5,#f97316)"></div>
    <div class="abs btn t-headline" style="left:20px;top:766px;width:353px">${ICONS.plus('#fff', 20)}Add task</div>
  `);
}

/** The "New task" screen from example.json. */
export function newTaskScreen(parent, { x, y, scale = 1, label = true }) {
  return screen(parent, { x, y, scale, label: label && 'New task' }, `
    <div class="abs btn secondary small t-headline" style="left:16px;top:56px">${ICONS.back('#111113', 20)}Back</div>
    <div class="abs t-title" style="left:20px;top:120px">New task</div>
    <div class="abs t-body" style="left:20px;top:176px;width:353px;height:52px;border-radius:12px;background:#f2f2f5;display:flex;align-items:center;padding:0 16px;color:#6b6b73">What needs doing?</div>
    <div class="abs btn t-headline" style="left:20px;top:766px;width:353px">Save</div>
  `);
}

function screen(parent, { x, y, scale, label }, html) {
  if (label) {
    const l = document.createElement('div');
    l.className = 'screen-label';
    l.textContent = label;
    l.style.left = `${x}px`;
    l.style.top = `${y - 24 * scale}px`;
    l.style.transform = `scale(${scale})`;
    parent.append(l);
  }
  const s = document.createElement('div');
  s.className = 'screen';
  s.style.left = `${x}px`;
  s.style.top = `${y}px`;
  s.style.transform = `scale(${scale})`;
  s.innerHTML = html;
  parent.append(s);
  return s;
}

/** Marks the page ready for the screenshot. */
export async function ready() {
  await document.fonts.ready;
  await wait(50);
  document.body.dataset.ready = 'true';
}
