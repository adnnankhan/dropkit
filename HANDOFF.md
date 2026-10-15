# Handoff — Universal Figma plugin: "drop a JSON, get a design"

## The idea (decided)
A Figma plugin with a simple interface:
1. **Choose what to make** — 5 checkboxes: **Design system · Components · Screens · SVGs · Prototype & animations**.
2. **Drop a JSON file** (or paste it).
3. The plugin **checks the file first** and lists clear problems before building anything.
4. **Build** → it creates what was ticked, in order (design system → components → screens → SVGs → prototype links), then shows a short report.

**No AI inside the plugin.** Any AI (Claude, ChatGPT, Gemini, Grok, DeepSeek…) writes the JSON. The plugin only reads it and builds — reliable, free to run, same result every time.

## What the project needs to deliver
1. **The JSON format (spec)** — one documented structure covering:
   - Design system: colour variables (with light/dark), spacing, radius, sizes, text styles, effect styles (shadows, glass/background blur)
   - Components: layout, fills/strokes/text bound to the design system by name, properties (text, boolean, instance swap), variant sets (e.g. Style × Size × State × Mode)
   - Screens: frames with layers placed by position (or auto layout), using component instances by name, human layer names
   - SVGs: icons/logos as SVG strings → editable vectors (optionally made into components)
   - Prototype: links between screens (on tap → navigate / open overlay / back) with transitions (smart animate, dissolve, slide), durations and easing
2. **A ready-made prompt for any AI** — "Here is my design/spec; write it as a JSON file in this format", plus the format spec attached.
3. **An example JSON file** — e.g. a small app (a few tokens, 3–4 components, 2–3 screens, links) so people and AIs can see what a correct file looks like.
4. **The plugin**: UI (checkboxes, drop zone, paste box, validation list, Build button, progress, final report) + builders for each of the 5 parts.
5. **Partial files work** — e.g. only screens: components already in the Figma file are found **by name**.
6. **Readable errors** — e.g. "Screen 'Home' uses component 'Card/Approval', which isn't in the file or the JSON."

## Lessons from the Nudge plugins (real Figma behaviour — design around these)
These broke the earlier plugins; build them in from day one:
1. **Use `documentAccess: "dynamic-page"` APIs.** `instance.mainComponent` is blocked — use `await instance.getMainComponentAsync()`. Load pages with `await page.loadAsync()` before searching them. Prototype links: use the async reactions API (`setReactionsAsync`) — check current docs.
2. **A component set can't be instanced directly.** Pick a variant (`set.children[...]`) and `createInstance()` from that. Single components can become sets later (e.g. after adding a Mode) — always resolve "component by name" to a variant if it's a set.
3. **Cloning a variant loses its property links** (`componentPropertyReferences` on text/instances). After cloning (e.g. making dark variants), copy the references over from the original, layer by layer, or rebuild the variant instead of cloning.
4. **Switching an instance's variant or swapping it replaces its contents.** Any child nodes you collected before are gone ("The node does not exist"). Don't walk into instances you're about to switch; walk the tree yourself and stop at instances.
5. **Glass looks grey on white** because the shadow shows through the translucent fill. Fix: drop shadows with `showShadowBehindNode: false`.
6. **Free (Starter) plan limits:** max **3 pages** per file; **1 mode per variable collection** (so Light/Dark must be separate collections, or `Mode=Dark/Light` variants). Detect and work around instead of failing. The Figma MCP/connector on Starter also has a small monthly call limit — a local plugin has none.
7. **Plugin API vs MCP helpers:** helpers like `figma.createAutoLayout()` don't exist in normal plugins — create a frame and set `layoutMode` yourself.
8. **Order of operations matters:** `resize()` resets sizing modes — set `primaryAxisSizingMode`/`counterAxisSizingMode` after resizing. `layoutGrow` must be an integer. Append a node to its auto-layout parent before setting `layoutSizingHorizontal = 'FILL'`.
9. **Fonts:** `await figma.loadFontAsync()` for every font (and the font of a text style) before setting characters or styles. Check `listAvailableFontsAsync()` and report missing fonts clearly before building.
10. **Images:** `figma.createImage(figma.base64Decode(...))` works in plugins.
11. **Never stop halfway:** build each part in its own try/catch, keep going, and list every problem in the final report.
12. **Re-running must be safe:** skip what already exists (by name), finish what's half-done, never duplicate.

## How to test (important — the earlier bugs slipped through)
- Write a **mock Figma** for automated tests that copies real behaviour, including the strict parts: blocked `mainComponent`, sets that can't be instanced, variant switch replacing children, lost property links on clone.
- Also test in **real Figma** after every step with a small test file, and keep that file as a fixture.
- Build it in **Claude Code**, step by step: format spec → validator → design system → components → screens → SVGs → prototype → UI polish.

## Reference files (from the Nudge project)
In the attached zip, `reference/`:
- `nudge-components-plugin/code.js` — builds a full component library from variables and styles, adds Dark/Light variants, stronger glass for the tab bar (contains the fixes for lessons 1–5).
- `nudge-screens-plugin/code.js` — builds screens from component instances + styled layers at exact positions, human layer names, no auto layout.
- `mock-figma-test.js` — the mock Figma used to test them (strict version).
Use them as working examples of the Plugin API calls — not as the final architecture.

## Open decisions for the new chat
- Plugin name.
- Exact JSON structure (start from the 5 parts above).
- Publish on the Figma Community, or keep private first?
- Where it lives (a GitHub repo, built with Claude Code).
