# Dropkit: project rules for Claude Code

A Figma plugin that builds a design from a JSON file. No AI inside the plugin: any AI writes the JSON, the plugin checks it and builds what's ticked.

## Read before any work

- `docs/FORMAT.md`: the JSON format. **Source of truth.** Where it differs from `HANDOFF.md` (for example the build order), FORMAT.md wins.
- `HANDOFF.md`: the idea and the 12 lessons from the earlier Nudge plugins. Every lesson applies.
- `design/DESIGN-NOTES.md` and `design/*.html`: the plugin UI, every state, and the confirmed behaviours.
- `examples/`: `example.json` (correct), `broken-missing-component.json`, `broken-syntax.json`.
- `reference/`: the old Nudge plugin code and its mock Figma. Use them as working examples of Plugin API calls, not as the architecture.
- `listing/`: the Figma Community listing draft, privacy policy and review checklist. The plugin must stay true to what these say.

## Figma review rules that shape the code

- Never work around Figma's plan limits (free plan: one mode per collection, 3 pages). Build what the plan allows and say so in the report.
- No network access, no ads, no AI inside, plain-words messages only.

## How we work

- Build one step at a time, only the step I ask for. Stop when it's done and tell me how to test it in Figma.
- Ask me before any decision about look, wording or behaviour that the docs don't settle. Don't invent features.
- If the docs contradict each other or a Figma API doesn't behave as the docs say, stop and tell me plainly.
- Check Figma's current Plugin API docs for any API you're unsure of. Don't rely on memory.
- Keep my tests passing. Add tests for everything you build.
- Explain things to me in simple words, no jargon. I'm a designer.

## Technical setup

- TypeScript with `@figma/plugin-typings`, bundled with esbuild into `dist/code.js` and `dist/ui.html` (CSS and JS inlined).
- UI in plain HTML, CSS and TypeScript. No framework.
- `manifest.json`: `"editorType": ["figma"]`, `"documentAccess": "dynamic-page"`, `"networkAccess": { "allowedDomains": ["none"] }`. The plugin needs no internet.
- Name: **Dropkit**. Never put "Figma" or "Fig" in the plugin's name, the repo name or any domain (Figma's trademark rules). Saying it works with Figma is fine.
- Icon: `listing/icon/` (SVG, plus PNG at 128 and 512).
- Tests run with `npm test` in Node, against a strict mock Figma based on `reference/mock-figma-test.js`. The mock must copy the strict real behaviours listed in HANDOFF.md.
- No libraries that use `eval` or `new Function` in the plugin code.
