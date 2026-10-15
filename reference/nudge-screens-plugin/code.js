// Nudge · build all screens (final)
// Draws every Nudge screen in Dark mode, made from your components (instances) and styles.
// Plain human layer names, no auto layout on the screens. Run AFTER "Nudge · design system components (final)".
const DATA = { screens: [], svgs: [] }; // screen data removed — example only
(async () => {
  const errors = []; const stats = { instances: 0, drawn: 0, screens: 0 };
  try {
    figma.notify('Building screens… this takes a minute or two.', { timeout: 120000 });
    // ---------- Fonts
    const avail = await figma.listAvailableFontsAsync();
    const has = (fam, st) => avail.some(f => f.fontName.family === fam && f.fontName.style === st);
    if (!has('IBM Plex Sans', 'Regular')) throw new Error('Install IBM Plex Sans and IBM Plex Mono first.');
    const semi = has('IBM Plex Sans', 'SemiBold') ? 'SemiBold' : 'Semi Bold';
    const FONT = (mono, w) => mono ? { family: 'IBM Plex Mono', style: w >= 500 && has('IBM Plex Mono', 'Medium') ? 'Medium' : 'Regular' } : { family: 'IBM Plex Sans', style: w >= 600 ? semi : w >= 500 ? 'Medium' : 'Regular' };
    for (const f of [FONT(false, 400), FONT(false, 500), FONT(false, 600), FONT(true, 400), FONT(true, 500)]) await figma.loadFontAsync(f);

    // ---------- Components
    const comps = {};
    for (const p of figma.root.children) { await p.loadAsync(); for (const n of p.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] })) { if (n.type === 'COMPONENT' && n.parent && n.parent.type === 'COMPONENT_SET') continue; if (!comps[n.name]) comps[n.name] = n; } }
    if (!comps['Button']) throw new Error('Components not found. Run “Nudge · design system components (final)” first.');
    const one = (name) => { const s = comps[name]; return !s ? null : (s.type === 'COMPONENT_SET' ? s.children[0] : s); };
    const variant = (setName, props) => { const s = comps[setName]; if (!s) return null; if (s.type === 'COMPONENT') return s; const all = s.children.filter(c => { const v = Object.fromEntries(c.name.split(', ').map(x => x.split('='))); return Object.entries(props).every(([k, val]) => v[k] === val); }); return all[0] || null; };

    // ---------- Tokens
    const colls = await figma.variables.getLocalVariableCollectionsAsync();
    const vars = await figma.variables.getLocalVariablesAsync('COLOR');
    const CL = colls.find(c => c.name === 'Color / Light'), CD = colls.find(c => c.name === 'Color / Dark');
    const byId = new Map(vars.map(v => [v.id, v]));
    const resolve = (v) => { let cur = v, g = 0; while (cur && g++ < 10) { const coll = colls.find(c => c.id === cur.variableCollectionId); const val = cur.valuesByMode[coll.modes[0].modeId]; if (val && val.type === 'VARIABLE_ALIAS') cur = byId.get(val.id); else return val; } return null; };
    const lightVars = vars.filter(v => v.variableCollectionId === CL.id).map(v => ({ v, c: resolve(v) })).filter(x => x.c);
    const darkByName = new Map(vars.filter(v => CD && v.variableCollectionId === CD.id).map(v => [v.name, v]));
    const close = (a, b) => Math.abs(a.r - b.r) < 0.012 && Math.abs(a.g - b.g) < 0.012 && Math.abs(a.b - b.b) < 0.012;
    const order = ['text/primary', 'bg/primary', 'text/secondary', 'button/primary/bg', 'button/primary/text'];
    function findVar(c, isText, mode) {
      let pool = lightVars.filter(x => (x.c.a === undefined || x.c.a > 0.99) && close(x.c, c));
      pool.sort((a, b) => { const sa = isText ? (/^(text|risk|status)/.test(a.v.name) ? 0 : 1) : (/^(bg|button|risk|status)/.test(a.v.name) ? 0 : 1); const sb = isText ? (/^(text|risk|status)/.test(b.v.name) ? 0 : 1) : (/^(bg|button|risk|status)/.test(b.v.name) ? 0 : 1); return (sa - sb) || ((order.indexOf(a.v.name) + 99) % 100 - (order.indexOf(b.v.name) + 99) % 100); });
      const v = pool[0] && pool[0].v; if (!v) return null;
      return mode === 'Dark' ? (darkByName.get(v.name) || v) : v;
    }
    const hair = (mode) => { const l = lightVars.find(x => x.v.name === 'border/hairline'); return l ? (mode === 'Dark' ? darkByName.get('border/hairline') || l.v : l.v) : null; };
    const tstyles = await figma.getLocalTextStylesAsync(); const ts = n => (tstyles.find(s => s.name === 'Nudge/' + n) || {}).id;
    const styleFor = (f) => { const s = Math.round(f.size), w = f.weight || 400;
      if (f.mono) return s >= 15 ? ts('Mono command') : s === 14 ? ts('Mono project') : (s === 13 ? ts('Mono time') : null);
      if (s === 34) return ts('Large title'); if (s === 28 && w >= 600) return ts('Stat number'); if (s === 22) return ts('Title 2'); if (s === 20 && w >= 600) return ts('Title 3');
      if (s === 17) return w >= 600 ? ts('Headline') : ts('Body'); if (s === 16 && w >= 600) return ts('Callout bold'); if (s === 15) return w >= 600 ? ts('Subhead bold') : ts('Subhead');
      if (s === 13) return w >= 600 ? ts('Footnote bold') : ts('Footnote'); if (s === 10) return ts('Tab label'); return null; };
    const fx = await figma.getLocalEffectStylesAsync(); const fxId = n => (fx.find(s => s.name === n) || {}).id;

    // ---------- Paint helpers
    const solid = (c) => ({ type: 'SOLID', color: { r: c.r, g: c.g, b: c.b }, opacity: c.a === undefined ? 1 : c.a });
    let RAW = false;
    function paintFor(c, isText, mode) {
      const a = c.a === undefined ? 1 : c.a;
      if (RAW) return solid(c);
      const white = c.r > 0.99 && c.g > 0.99 && c.b > 0.99;
      if (white && a < 0.99) { // glass and field fills
        if (mode === 'Dark') { const map = Math.abs(a - 0.62) < 0.03 ? 0.065 : Math.abs(a - 0.58) < 0.03 ? 0.10 : Math.abs(a - 0.7) < 0.03 ? 0.04 : Math.abs(a - 0.86) < 0.03 ? 0.86 : a; if (Math.abs(a - 0.86) < 0.03) return { type: 'SOLID', color: { r: 0.12, g: 0.12, b: 0.13 }, opacity: 0.86 }; return { type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: map }; }
        return solid(c);
      }
      if (!white && c.r < 0.06 && c.g < 0.06 && c.b < 0.06 && a < 0.5) { if (a < 0.12) { const h = hair(mode); if (h && a > 0.05) return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', h); } return mode === 'Dark' && a < 0.12 ? { type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: Math.max(a, 0.06) } : solid(c); }
      if (a > 0.99 && isText && c.r > 0.99 && c.g > 0.99 && c.b > 0.99) { const w = lightVars.find(x => x.v.name === 'button/primary/text'); if (w) { const v = mode === 'Dark' ? (darkByName.get(w.v.name) || w.v) : w.v; return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', v); } }
      if (a > 0.99) { const v = findVar(c, isText, mode); if (v) return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', v); }
      return solid(c);
    }

    // ---------- Component matching
    const textsIn = n => { const out = []; const w = x => { if (x.type === 'text') out.push(x); (x.children || []).forEach(w); }; w(n); return out; };
    const namesIn = n => { const out = []; const w = x => { out.push(x.name || ''); (x.children || []).forEach(w); }; (n.children || []).forEach(w); return out; };
    const iconMap = { 'Fingerprint icon': 'fingerprint', 'Send icon': 'send', 'Mic icon': 'mic', 'Plus icon': 'plus', 'Stop icon': 'stop', 'Undo icon': 'undo', 'QR icon': 'qr', 'Mail icon': 'mail', 'Bell icon': 'bell', 'File icon': 'file', 'Folder icon': 'folder', 'Phone icon': 'phone', 'Computer icon': 'computer', 'Settings icon': 'settings' };
    const isDark = c => c && c.r < 0.1 && c.g < 0.1 && c.b < 0.1 && (c.a === undefined || c.a > 0.8);
    const isRed = c => c && c.r > 0.5 && c.g < 0.2;
    function match(n) {
      const nm = n.name || ''; const tx = textsIn(n); const names = namesIn(n);
      if (n.type !== 'frame') return null;
      if (nm === 'Hold to approve button') return { c: variant('Button', { Style: 'Hold', Size: 'Large', State: 'Default' }), props: { Label: tx[0] ? tx[0].text : 'Hold to approve' } };
      if (nm === 'Continue with Google button') return { c: one('Sign-in provider button'), props: { Label: tx[0] ? tx[0].text : '' } };
      if (/ button$/.test(nm)) {
        const text = tx[0]; const underline = text && text.font.underline;
        const style = underline ? 'Text' : isRed(n.bg) ? 'Destructive' : isDark(n.bg) ? 'Primary' : 'Glass';
        const size = style === 'Text' ? 'Medium' : n.h >= 52 ? 'Large' : 'Medium';
        const iconName = names.find(x => iconMap[x]); const ic = iconName ? comps['Icon/' + iconMap[iconName]] : null;
        if (iconName && !ic) return null;
        return { c: variant('Button', { Style: style, Size: size, State: 'Default' }), props: { Label: text ? text.text : '', 'Show icon': !!ic }, swapIcon: ic };
      }
      if (/ chip$/.test(nm)) return { c: variant('Chip', { Kind: nm.replace(' chip', '') }), noText: true };
      if (/^Toggle (on|off)$/.test(nm)) return { c: variant('Toggle', { State: nm.endsWith('on') ? 'On' : 'Off' }), noText: true, keepSize: true };
      if (/^Answer option \d+$/.test(nm)) { const sel = (n.children || []).some(k => k.type === 'frame' && isDark(k.bg)); return { c: variant('Answer option', { State: sel ? 'Selected' : 'Default' }), props: { Number: tx[0] ? tx[0].text : '1', Label: tx[1] ? tx[1].text : '' } }; }
      if (nm === 'Text input') { const typed = names.includes('Send button'); const focused = (n.shadows || []).some(s => s.inset && s.spread > 1.2); const st = typed ? 'Typed' : focused ? 'Focused' : 'Empty'; return { c: variant('Input', { State: st }), props: { Text: tx[0] ? tx[0].text : '' } }; }
      if (/ field$/.test(nm)) {
        if (names.includes('Arrow')) { const note = tx.length > 2; const ph = tx[1] && tx[1].color && tx[1].color.r > 0.3; return { c: variant('Form field', { State: note ? 'With note' : ph ? 'Placeholder' : 'Default' }), props: { Label: tx[0].text, Value: tx[1] ? tx[1].text : '', Note: tx[2] ? tx[2].text : '' } }; }
        const pw = names.includes('Eye icon'); const err = tx.length > 2; const field = (n.children || []).find(k => k.type === 'frame');
        const focused = field && (field.shadows || []).some(s => s.inset && s.spread > 1.2) && !err;
        const filled = tx[1] && tx[1].color && tx[1].color.r < 0.1;
        const st = err ? 'Error' : focused ? 'Focused' : filled ? 'Filled' : 'Default';
        return { c: variant('Text field', { Type: pw ? 'Password' : 'Text', State: st }), props: { Label: tx[0] ? tx[0].text : '', Value: tx[1] ? tx[1].text : '', Message: tx[2] ? tx[2].text : '' }, textsByProps: true };
      }
      if (/ option$/.test(nm)) {
        const radio = (n.children || []).find(k => k.name === 'Radio' || (k.border && k.w <= 23)); const sel = !!(radio && radio.border && radio.border.w > 3) || (n.shadows || []).some(s => s.inset && s.spread > 1.2);
        const logo = names.find(x => /^(Claude|Codex|Cursor) logo$/.test(x));
        return { c: variant('Option row', { State: sel ? 'Selected' : 'Default' }), props: { Title: tx[0] ? tx[0].text : '', Description: tx[1] ? tx[1].text : '', 'Show description': tx.length > 1, 'Show logo': !!logo }, swapLogoProp: logo ? comps['Agent/' + logo.replace(' logo', '')] : null, opacity: n.opacity };
      }
      if (/ row$/.test(nm)) {
        const lead = (n.children || [])[0]; const leadIcon = lead && lead.type === 'svg' && iconMap[lead.name] ? comps['Icon/' + iconMap[lead.name]] : null;
        // agent rows (logo + status dot) → Agent row component
        if (lead && lead.type === 'svg' && /^(Claude|Codex|Cursor) logo$/.test(lead.name) && names.includes('Status dot') && tx.length >= 3) {
          const status = tx[tx.length - 1].text; const st = isRed(tx[tx.length - 1].color) ? 'Disconnected' : /Not connected/.test(status) ? 'Not connected' : 'Connected';
          return { c: variant('Agent row', { Status: st }), props: { Agent: tx[0].text, Capabilities: tx[1].text }, swapLogoProp: comps['Agent/' + lead.name.replace(' logo', '')], statusText: status };
        }
        if (lead && (lead.type === 'svg' && !leadIcon || lead.type === 'text' && /^\d$/.test(lead.text))) return null; // logos and numbered leads stay drawn
        const hasArrow = names.includes('Arrow'), hasToggle = names.some(x => /^Toggle/.test(x)), action = names.find(x => / button$/.test(x));
        const title = tx[0]; const red = title && isRed(title.color);
        let type = null, props = { Title: title ? title.text : '' };
        if (hasToggle) type = 'Toggle'; else if (action) { type = 'Action'; props.Subtitle = tx[1] ? tx[1].text : ''; }
        else if (red) type = 'Destructive';
        else if (hasArrow && tx.length >= 2 && tx[1].y > tx[0].y + 4) { type = 'Two-line'; props.Subtitle = tx[1].text; }
        else if (hasArrow) { type = 'Navigation'; props.Value = tx[1] ? tx[1].text : ''; }
        else if (tx.length === 2 && tx[1].x > tx[0].x + 40) { type = 'Value'; props.Value = tx[1].text; }
        else if (tx.length === 1) { type = 'Value'; props.Value = ''; }
        else return null;
        if (leadIcon) { props['Show leading icon'] = true; }
        return { c: variant('List row', { Type: type }), props, swapLead: leadIcon, actionLabel: action ? (textsIn((n.children || []).find(k => k.name === action) || { children: [] })[0] || {}).text : null };
      }
      if (/^(Warning|Error|Info) message$/.test(nm)) { const act = names.find(x => / button$/.test(x)); return { c: variant('Inline alert', { Kind: nm.split(' ')[0] }), props: { Message: tx[0] ? tx[0].text : '', 'Show action': !!act }, actionLabel: act ? tx[tx.length - 1].text : null }; }
      if (nm === 'Summary card') return { c: one('Summary card'), props: { 'Waiting count': tx[0] && tx[0].text, 'Working count': tx[2] && tx[2].text, 'Completed count': tx[4] && tx[4].text } };
      if (nm === 'Header') { const st = tx.find(t => t.text.startsWith('·')); const comp = tx.find(t => t.text !== 'Nudge' && !t.text.startsWith('·')); return { c: one('Header'), props: { Computer: comp ? comp.text : 'Windows PC', Status: st ? st.text : '· awake' } }; }
      if (nm === 'Tab bar') { const agents = tx.some(t => t.text === 'Agents' && t.font.weight >= 600), home = tx.some(t => t.text === 'Home' && t.font.weight >= 600); return { c: variant('Tab bar', { Active: home ? 'Home' : agents ? 'Agents' : 'None' }), noText: true, keepSize: true }; }
      if (nm === 'Top bar') { const title = tx.find(t => t.font.weight >= 600); const count = tx.find(t => t.font.mono); const logo = names.find(x => /^(Claude|Codex|Cursor) logo$/.test(x)); return { c: variant('Top bar', { Trailing: count ? 'Count' : 'None' }), props: { Title: title ? title.text : '', Count: count ? count.text : '', 'Show logo': !!logo }, swapLogoProp: logo ? comps['Agent/' + logo.replace(' logo', '')] : null, topBar: true }; }
      if (nm === 'Card') {
        const chip = (names.find(x => / chip$/.test(x)) || '').replace(' chip', ''); const logo = names.find(x => /^(Claude|Codex|Cursor) logo$/.test(x));
        if (names.includes('Command box') && names.some(x => / button$/.test(x)) && logo) { const risk = chip === 'High risk' ? 'High' : chip === 'Medium risk' ? 'Medium' : 'Low'; return { c: variant('Request card · Approval', { Risk: risk }), props: { Agent: tx[0].text, Project: tx[1].text, Time: tx[2].text, Title: tx[4] ? tx[4].text : '', Command: (tx.find(t => t.font.mono && t.font.size >= 15) || {}).text }, swapLogoProp: comps['Agent/' + logo.replace(' logo', '')] }; }
        if (names.some(x => /^Answer option/.test(x)) && logo) return { c: one('Request card · Question'), props: { Agent: tx[0].text, Project: tx[1].text, Time: tx[2].text, Question: tx[3] ? tx[3].text : '' }, swapLogoProp: comps['Agent/' + logo.replace(' logo', '')] };
        if (chip && logo && !names.includes('Command box') && tx.length <= 6) return { c: variant('Session row', { Status: chip }), copyTexts: true, swapLogo: comps['Agent/' + logo.replace(' logo', '')] };
      }
      return null;
    }

    // ---------- Builders
    const setP = (inst, name, val) => { if (val === undefined || val === null) return; const k = Object.keys(inst.componentProperties).find(x => x.split('#')[0] === name); if (k) { try { inst.setProperties({ [k]: val }); } catch (e) {} } };
    async function overrideTexts(inst, texts) {
      const tn = inst.findAll(x => x.type === 'TEXT').sort((a, b) => (a.absoluteBoundingBox.y - b.absoluteBoundingBox.y) || (a.absoluteBoundingBox.x - b.absoluteBoundingBox.x));
      if (tn.length !== texts.length) return;
      for (let i = 0; i < tn.length; i++) { if (tn[i].characters === texts[i].text) continue; const f = tn[i].fontName; if (typeof f !== 'symbol') await figma.loadFontAsync(f); tn[i].characters = texts[i].text; }
    }
    async function placeInstance(n, m, parent, px, py, mode) {
      const inst = m.c.createInstance(); parent.appendChild(inst);
      inst.name = n.name; inst.x = n.x - px; inst.y = n.y - py + (m.topBar ? 50 : 0);
      if (!m.keepSize && Math.abs(inst.width - n.w) > 1) { try { inst.resize(n.w, inst.height); } catch (e) {} }
      try { inst.setProperties({ Mode: mode }); } catch (e) {}
      if (m.props) for (const [k, v] of Object.entries(m.props)) setP(inst, k, v);
      if (m.swapIcon) setP(inst, 'Icon', m.swapIcon.id);
      if (m.swapLead) setP(inst, 'Leading icon', m.swapLead.id);
      if (m.swapLogoProp) { setP(inst, 'Agent logo', m.swapLogoProp.id); setP(inst, 'Logo', m.swapLogoProp.id); }
      if (m.swapLogo) { const li = inst.findAll(x => x.type === 'INSTANCE'); for (const l of li) { const mc = await l.getMainComponentAsync(); if (mc && /^Agent\//.test(mc.name)) { l.swapComponent(m.swapLogo); break; } } }
      if (m.copyTexts) await overrideTexts(inst, textsIn(n));
      if (m.actionLabel) { const b = inst.findAll(x => x.type === 'INSTANCE'); for (const x of b) { const k = Object.keys(x.componentProperties || {}).find(y => y.split('#')[0] === 'Label'); if (k) { try { x.setProperties({ [k]: m.actionLabel }); } catch (e) {} } } }
      if (m.statusText) { const st = inst.findAll(x => x.type === 'TEXT' && x.name === 'Status'); for (const x of st) { const f = x.fontName; if (typeof f !== 'symbol') await figma.loadFontAsync(f); x.characters = m.statusText; } }
      if (m.opacity !== undefined && m.opacity < 1) inst.opacity = m.opacity;
      stats.instances++;
      return inst;
    }
    async function drawText(n, parent, px, py, mode) {
      const t = figma.createText(); const f = FONT(n.font.mono, n.font.weight || 400); t.fontName = f; t.characters = n.text;
      const sid = styleFor(n.font);
      if (sid) { const st = tstyles.find(s => s.id === sid); await figma.loadFontAsync(st.fontName); await t.setTextStyleIdAsync(sid); }
      else { t.fontSize = n.font.size; if (n.font.lh) t.lineHeight = { unit: 'PIXELS', value: n.font.lh }; }
      if (n.font.ls) t.letterSpacing = { unit: 'PIXELS', value: n.font.ls };
      if (n.font.underline) t.textDecoration = 'UNDERLINE';
      if (n.font.align === 'center') t.textAlignHorizontal = 'CENTER';
      if (n.color) t.fills = [paintFor(n.color, true, mode)];
      if (n.opacity !== undefined && n.opacity < 1) t.opacity = n.opacity;
      parent.appendChild(t);
      const lineH = n.font.lh || n.font.size * 1.3;
      if (n.h > lineH * 1.5) { t.textAutoResize = 'HEIGHT'; t.resize(Math.ceil(n.w) + 2, t.height); } else t.textAutoResize = 'WIDTH_AND_HEIGHT';
      t.name = n.name || n.text.slice(0, 40); t.x = n.x - px; t.y = n.y - py; stats.drawn++;
    }
    function drawSvg(n, parent, px, py, mode) {
      const svg = DATA.svgs[n.svg];
      const s = figma.createNodeFromSvg(svg); parent.appendChild(s);
      if (s.width > 0 && Math.abs(s.width - n.w) > 0.5) s.rescale(n.w / s.width);
      s.name = n.name || 'Icon'; s.x = n.x - px; s.y = n.y - py;
      // link icon colours to variables (the app icon keeps its own colours)
      if (n.name !== 'Nudge app icon') for (const v of s.findAll(x => 'strokes' in x)) {
        if (Array.isArray(v.strokes)) v.strokes = v.strokes.map(p => p.type === 'SOLID' ? paintFor(Object.assign({}, p.color, { a: p.opacity === undefined ? 1 : p.opacity }), true, mode) : p);
        if (Array.isArray(v.fills)) v.fills = v.fills.map(p => p.type === 'SOLID' && !(p.color.r > 0.8 && p.color.g < 0.6 && p.color.b < 0.5) ? paintFor(Object.assign({}, p.color, { a: p.opacity === undefined ? 1 : p.opacity }), true, mode) : p);
      }
      stats.drawn++;
    }
    async function drawFrame(n, parent, px, py, mode) {
      const f = figma.createFrame(); parent.appendChild(f);
      f.name = n.name || 'Group'; f.resize(Math.max(n.w, 0.01), Math.max(n.h, 0.01)); f.x = n.x - px; f.y = n.y - py;
      const fills = [];
      if (n.grad && n.grad.stops) { let stops = n.grad.stops.map(s => ({ position: s.pos, color: { r: s.color.r, g: s.color.g, b: s.color.b, a: s.color.a === undefined ? 1 : s.color.a } })); if (mode === 'Dark' && n.h < 200) stops = stops.map(s => ({ position: s.position, color: s.color.r > 0.9 ? { r: 0.055, g: 0.059, b: 0.071, a: s.color.a } : s.color })); fills.push({ type: 'GRADIENT_LINEAR', gradientTransform: [[0, 1, 0], [-1, 0, 1]], gradientStops: stops }); }
      if (n.bg && n.bg.a > 0) fills.push(paintFor(n.bg, false, mode));
      f.fills = fills;
      if (n.radius) f.cornerRadius = n.radius;
      f.clipsContent = !!n.clip;
      if (n.opacity !== undefined && n.opacity < 1) f.opacity = n.opacity;
      // glass → effect styles; other shadows kept
      const glassCard = n.blur && n.blur >= 26, glassBtn = n.blur && n.blur < 26;
      let stroke = null; const effects = [];
      for (const s of (n.shadows || [])) { if (!s.color) continue; if (s.inset && !s.blur && !s.x && !s.y && s.spread > 0) { stroke = s; continue; } if (!glassCard && !glassBtn) effects.push(s.inset ? { type: 'INNER_SHADOW', color: { r: s.color.r, g: s.color.g, b: s.color.b, a: s.color.a }, offset: { x: s.x || 0, y: s.y || 0 }, radius: s.blur || 0, spread: s.spread || 0, visible: true, blendMode: 'NORMAL' } : { type: 'DROP_SHADOW', color: { r: s.color.r, g: s.color.g, b: s.color.b, a: mode === 'Dark' ? Math.min(0.6, s.color.a * 3) : s.color.a }, offset: { x: s.x || 0, y: s.y || 0 }, radius: s.blur || 0, spread: s.spread || 0, visible: true, blendMode: 'NORMAL', showShadowBehindNode: false }); }
      if (glassCard || glassBtn) { const id = fxId('Glass/' + (glassCard ? 'Card' : 'Button') + ' · ' + mode); if (id) await f.setEffectStyleIdAsync(id); }
      else if (effects.length) f.effects = effects;
      if (n.border) stroke = { color: n.border.color, spread: n.border.w };
      if (stroke && stroke.color) { f.strokes = [paintFor(stroke.color, false, mode)]; f.strokeWeight = stroke.spread; f.strokeAlign = 'INSIDE'; }
      stats.drawn++;
      return f;
    }
    async function build(n, parent, px, py, mode) {
      if (n.type === 'text') return drawText(n, parent, px, py, mode);
      if (n.type === 'svg') return drawSvg(n, parent, px, py, mode);
      const m = match(n);
      if (m && m.c) { try { await placeInstance(n, m, parent, px, py, mode); return; } catch (e) { errors.push((n.name || 'part') + ': ' + e.message); } }
      const f = await drawFrame(n, parent, px, py, mode);
      for (const c of (n.children || [])) await build(c, f, n.x, n.y, mode);
    }

    // ---------- Page and layout
    let page = figma.currentPage;
    try { page = figma.createPage(); page.name = 'Screens'; } catch (e) { page = figma.currentPage; }
    await figma.setCurrentPageAsync(page);
    let originX = 0; for (const n of page.children) originX = Math.max(originX, n.x + n.width + 400);
    const sections = []; for (const s of DATA.screens) { let sec = sections.find(x => x.name === s.sec); if (!sec) { sec = { name: s.sec, items: [] }; sections.push(sec); } sec.items.push(s); }
    let y = 0;
    const MODES = ['Dark']; // only Dark for now; add 'Light' here to build both
    for (const mode of MODES) {
      const bigTitle = figma.createText(); bigTitle.fontName = FONT(false, 600); bigTitle.characters = mode + ' mode'; bigTitle.fontSize = 72; bigTitle.name = mode + ' mode'; page.appendChild(bigTitle); bigTitle.x = originX; bigTitle.y = y; y += 160;
      for (const sec of sections) {
        const st = figma.createText(); st.fontName = FONT(false, 600); st.characters = sec.name; st.fontSize = 44; st.name = 'Section · ' + sec.name + ' · ' + mode; page.appendChild(st); st.x = originX; st.y = y; y += 90;
        let x = originX, rowH = 0;
        for (const s of sec.items) {
          try {
            const root = figma.createFrame(); page.appendChild(root); root.name = s.title + (mode === 'Dark' ? ' · Dark' : ''); root.resize(s.w, s.h); root.x = x; root.y = y; root.clipsContent = true;
            if (s.tree.grad && s.tree.grad.stops) root.fills = [{ type: 'GRADIENT_LINEAR', gradientTransform: [[0, 1, 0], [-1, 0, 1]], gradientStops: s.tree.grad.stops.map(z => ({ position: z.pos, color: { r: z.color.r, g: z.color.g, b: z.color.b, a: z.color.a === undefined ? 1 : z.color.a } })) }];
            else root.fills = [paintFor(s.tree.bg || { r: 1, g: 1, b: 1, a: 1 }, false, mode)];
            if (s.w > 400) { root.cornerRadius = 14; }
            RAW = !!(s.tree.grad && s.tree.grad.stops);
            for (const c of (s.tree.children || [])) await build(c, root, 0, 0, mode);
            RAW = false;
            stats.screens++;
          } catch (e) { errors.push(s.title + ' (' + mode + '): ' + e.message); }
          x += s.w + 120; rowH = Math.max(rowH, s.h);
        }
        y += rowH + 200;
      }
      y += 300;
    }
    figma.viewport.scrollAndZoomIntoView(page.children.slice(-10));
  } catch (e) { errors.push('Setup: ' + e.message); console.error(e); }
  const msg = `Built ${stats.screens} dark screens: ${stats.instances} component instances, ${stats.drawn} drawn layers.` + (errors.length ? ' Problems: ' + errors.slice(0, 6).join(' | ') + (errors.length > 6 ? ' …' : '') : ' No problems.');
  figma.notify(msg, { timeout: 30000, error: errors.length > 0 }); console.log(msg, errors);
  setTimeout(() => figma.closePlugin(), 30500);
})();
