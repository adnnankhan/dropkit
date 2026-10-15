let idc = 0;
function guard(i) { Object.defineProperty(i, 'mainComponent', { get() { throw new Error('in get_mainComponent: Cannot call with documentAccess: dynamic-page. Use node.getMainComponentAsync instead.'); }, configurable: true }); i.getMainComponentAsync = async function () { return this._mc; }; }
function node(type) {
  const n = { type, id: 'n' + (++idc), name: '', children: [], fills: [], strokes: [], effects: [], width: 100, height: 100, x: 0, y: 0, visible: true, opacity: 1, componentPropertyReferences: {}, _props: {}, effectStyleId: '', description: '',
    appendChild(c) { if (c.parent) { const i = c.parent.children.indexOf(c); if (i >= 0) c.parent.children.splice(i, 1); } c.parent = this; this.children.push(c); },
    insertChild(i, c) { c.parent = this; this.children.splice(i, 0, c); },
    resize(w, h) { this.width = w; this.height = h; }, resizeWithoutConstraints(w, h) { this.resize(w, h); }, rescale(s) { this.width *= s; this.height *= s; },
    remove() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); },
    findAll(fn) { const out = []; const w = (x) => { for (const c of x.children) { if (!fn || fn(c)) out.push(c); w(c); } }; w(this); return out; },
    findAllWithCriteria(o) { return this.findAll(x => o.types.includes(x.type)); },
    async loadAsync() {},
    async setTextStyleIdAsync(id) { if (!id) throw new Error('empty text style'); this.textStyleId = id; },
    async setEffectStyleIdAsync(id) { if (!id) throw new Error('empty effect style'); this.effectStyleId = id; },
    setBoundVariable(k, v) { if (!v) throw new Error('bind undefined var ' + k); },
    addComponentProperty(name, type, def) { const k = name + '#' + idc; this._props[k] = { type, value: def }; return k; },
    get absoluteBoundingBox() { let x = this.x, y = this.y, p = this.parent; while (p && p.type !== 'PAGE') { x += p.x || 0; y += p.y || 0; p = p.parent; } return { x, y, width: this.width, height: this.height }; },
    characters: '', textAutoResize: 'NONE',
    clone() { const c = node(this.type); for (const k of ['name', 'width', 'height', 'x', 'y', 'effectStyleId', '_props', '_mc', 'componentProperties']) c[k] = this[k]; if (this.type === 'INSTANCE') guard(c); c.fills = JSON.parse(JSON.stringify(this.fills)); c.strokes = JSON.parse(JSON.stringify(this.strokes)); c.effects = JSON.parse(JSON.stringify(this.effects)); for (const ch of this.children) c.appendChild(ch.clone()); if (this.type === 'INSTANCE') { c.setProperties = this.setProperties; c.swapComponent = (m) => { c._mc = m; replaceContents(c, m); }; } if (this.parent) this.parent.appendChild(c); return c; },
    createInstance() { const i = node('INSTANCE'); i._mc = this; guard(i); const src = this.parent && this.parent.type === 'COMPONENT_SET' ? this.parent : this; i.componentProperties = Object.assign({}, this._props, src._allProps || {}); i.setProperties = function (o) { for (const k in o) { if (k === 'Mode') { const set = this._mc.parent; if (!set || !set.children.some(c => /Mode=Dark/.test(c.name))) throw new Error('no Mode'); const want = this._mc.name.replace(/Mode=(Light|Dark)/, 'Mode=' + o[k]); const tgt = set.children.find(c => c.name === want); if (tgt && tgt !== this._mc) { this._mc = tgt; replaceContents(this, tgt); } } else if (!(k in this.componentProperties)) throw new Error('bad prop ' + k); } }; i.swapComponent = (m) => { i._mc = m; replaceContents(i, m); }; for (const ch of this.children) { const cc = ch.clone(); i.appendChild(cc); } return i; },
  };
  for (const key of ['fills', 'strokes']) { let store = n[key]; Object.defineProperty(n, key, { get() { if (this._dead) throw new Error('The node does not exist'); return store; }, set(v) { if (this._dead) throw new Error('The node does not exist'); store = v; }, enumerable: true, configurable: true }); }
  return n;
}
function replaceContents(inst, main) { for (const d of inst.findAll(() => true)) d._dead = true; inst.children = []; for (const ch of main.children) { const cc = ch.clone(); inst.appendChild(cc); } }
const vars = []; const colls = [{ id: 'cl', name: 'Color / Light', modes: [{ modeId: 'm' }] }, { id: 'cd', name: 'Color / Dark', modes: [{ modeId: 'm2' }] }];
const hx = h => ({ r: parseInt(h.slice(1,3),16)/255, g: parseInt(h.slice(3,5),16)/255, b: parseInt(h.slice(5,7),16)/255, a: 1 });
const LV = { 'bg/primary': '#FFFFFF', 'text/primary': '#0A0A0A', 'text/secondary': '#5C5C5F', 'button/primary/bg': '#0A0A0A', 'button/primary/text': '#FFFFFF', 'risk/low/fg': '#1E5E2E', 'risk/low/bg': '#E2F0E4', 'risk/medium/fg': '#7A4A00', 'risk/medium/bg': '#FAEBD2', 'risk/high/fg': '#A3170E', 'risk/high/bg': '#FBE5E2', 'status/working/fg': '#3E3C36', 'status/working/bg': '#ECE9E2' };
for (const n of Object.keys(LV).concat(['border/hairline'])) { const lc = n === 'border/hairline' ? { r: 0, g: 0, b: 0, a: 0.08 } : hx(LV[n]); vars.push({ id: 'L:' + n, name: n, variableCollectionId: 'cl', resolvedType: 'COLOR', valuesByMode: { m: lc } }); vars.push({ id: 'D:' + n, name: n, variableCollectionId: 'cd', resolvedType: 'COLOR', valuesByMode: { m2: lc } }); }
for (const n of ['radius/code', 'radius/stat-field', 'radius/card', 'radius/tab-bar', 'radius/sheet', 'radius/pill']) vars.push({ id: n, name: n, variableCollectionId: 'x', resolvedType: 'FLOAT' });
const page = node('PAGE'); const TSTY = [];
global.figma = {
  root: { children: [page] },
  listAvailableFontsAsync: async () => ['Regular', 'Medium', 'SemiBold'].map(s => ({ fontName: { family: 'IBM Plex Sans', style: s } })).concat([{ fontName: { family: 'IBM Plex Mono', style: 'Regular' } }]),
  loadFontAsync: async () => {}, variables: { getLocalVariableCollectionsAsync: async () => colls, getLocalVariablesAsync: async (t) => t ? vars.filter(v => v.resolvedType === t) : vars, setBoundVariableForPaint: (p, k, v) => { if (!v) throw new Error('paint var undefined'); return Object.assign({}, p, { boundVariables: { color: { type: 'VARIABLE_ALIAS', id: v.id } } }); } },
  getLocalTextStylesAsync: async () => TSTY, createEffectStyle: () => ({ id: 'fxn' + (++idc), name: '', effects: [] }), getLocalEffectStylesAsync: async () => [{ name: 'Glass/Card · Light', id: 'fx1' }, { name: 'Glass/Button · Light', id: 'fx2' }, { name: 'Glass/Card · Dark', id: 'fx3' }, { name: 'Glass/Button · Dark', id: 'fx4' }],
  createTextStyle: () => { const s = { id: 'ts' + (++idc), fontName: { family: 'IBM Plex Sans', style: 'Regular' } }; TSTY.push(s); return s; }, createPage: () => { throw new Error('3 pages'); }, currentPage: page, setCurrentPageAsync: async () => {},
  createFrame: () => node('FRAME'), createComponent: () => node('COMPONENT'), createText: () => node('TEXT'), createRectangle: () => node('RECTANGLE'), createEllipse: () => node('ELLIPSE'), createSection: () => node('SECTION'),
  createNodeFromSvg: () => { const n = node('FRAME'); const v = node('VECTOR'); v.strokes = [{ type: 'SOLID', color: { r: 0.039, g: 0.039, b: 0.039 } }]; v.fills = [{ type: 'SOLID', color: { r: 0.039, g: 0.039, b: 0.039 } }]; n.appendChild(v); return n; },
  createComponentFromNode: (n) => { n.type = 'COMPONENT'; page.appendChild(n); return n; },
  combineAsVariants: (comps, parent) => { const s = node('COMPONENT_SET'); s.createInstance = undefined; s._allProps = {}; for (const c of comps) { s.appendChild(c); Object.assign(s._allProps, c._props); } parent.appendChild(s); return s; },
  createImage: () => ({ hash: 'h' }), base64Decode: () => new Uint8Array(4), viewport: { scrollAndZoomIntoView: () => {} },
  notify: (m) => console.log('NOTIFY:', m), closePlugin: () => {},
};
const waits = []; global.setTimeout = () => {};
(async () => {
  require('./nudge-final/code.js');
  for (let i = 0; i < 300; i++) await new Promise(r => setImmediate(r));
  console.log('--- screens ---');
  require('./nudge-screens-final/code.js');
  for (let i = 0; i < 20000; i++) await new Promise(r => setImmediate(r));
  const screens = page.children.filter(c => c.type === 'FRAME');
  const countType = (t) => screens.reduce((a, s) => a + s.findAll(x => x.type === t).length, 0);
  console.log('screen frames:', screens.length, '· instances:', countType('INSTANCE'), '· auto-layout frames on screens:', screens.reduce((a, s) => a + s.findAll(x => x.type === 'FRAME' && x.layoutMode && x.layoutMode !== 'NONE').length, 0));
  const names = {}; for (const s of screens) for (const x of s.findAll(z => z.type === 'INSTANCE')) names[x.name] = (names[x.name] || 0) + 1;
  console.log('top instance names:', Object.entries(names).sort((a, b) => b[1] - a[1]).slice(0, 12).map(e => e[0] + ' ×' + e[1]).join(', '));
  const drawnParts = {}; for (const s of screens) for (const x of s.findAll(z => z.type === 'FRAME' && / (button|chip|field|option|row)$|^Toggle|^Text input|^Answer option|^Tab bar|^Header|^Summary card|^Top bar|message$/.test(z.name))) drawnParts[x.name] = (drawnParts[x.name] || 0) + 1;
  console.log('component-type parts still drawn (not instances):', JSON.stringify(drawnParts));
  process.exit(0);
  delete require.cache[require.resolve('./nudge-final/code.js')];
  console.log('--- second run on the same file ---');
  require('./nudge-final/code.js');
  await new Promise(r => setImmediate(r)); for (let i = 0; i < 200; i++) await new Promise(r => setImmediate(r));

  for (let i = 0; i < 400; i++) await new Promise(r => setImmediate(r));
  // checks
  const sets = page.findAll(x => x.type === 'COMPONENT_SET');
  const btn = sets.find(s => s.name === 'Button');
  console.log('Button variants:', btn.children.length, '· dark first in layers?', /Mode=Dark/.test(btn.children[btn.children.length - 1].name), '· dark at left?', Math.min(...btn.children.filter(c => /Mode=Dark/.test(c.name)).map(c => c.x)) < Math.min(...btn.children.filter(c => /Mode=Light/.test(c.name)).map(c => c.x)));
  const darkPrim = btn.children.find(c => c.name.startsWith('Style=Primary, Size=Medium, State=Default, Mode=Dark'));
  console.log('Dark primary fill bound to:', darkPrim.fills[0].boundVariables.color.id);
  const card = sets.find(s => s.name === 'Request card · Approval'); const dc = card.children.find(c => /Mode=Dark/.test(c.name));
  console.log('Dark card effect:', dc.effectStyleId, '· fill opacity:', dc.fills[0].opacity);
  console.log('Sets with Mode:', sets.filter(s => s.children.some(c => /Mode=Dark/.test(c.name))).length, 'of', sets.length);
})();
