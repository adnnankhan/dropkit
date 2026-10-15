# Dropkit

A plugin for Figma that builds a design from one JSON file: a design system, components, screens, SVG icons and prototype links. Write the file yourself or have any AI write it. There's no AI inside the plugin, and it needs no internet connection.

**Format version:** `dropkit/0.1` · [Instructions for your AI](https://adnnankhan.github.io/dropkit/) · [Help](https://adnnankhan.github.io/dropkit/help.html) · [Privacy](https://adnnankhan.github.io/dropkit/privacy.html)

## What it does

1. **Tick what to build:** Design system, Components, Screens, SVGs, Prototype & animations.
2. **Drop or paste the JSON file.**
3. **It checks the file first** and explains every problem in plain words. "Copy problems for your AI" copies them, ready to paste back into the AI.
4. **Build.** Parts are built in order: design system → SVGs → components → screens → prototype. A broken item is skipped and listed in the report; everything else is built. Running the same file again doesn't duplicate anything.

Good to know:

- On Figma's free plan, colours are built with one mode only, because Figma allows one mode per collection on that plan. Dropkit says so in the report and never works around it.
- Fonts must be installed on your computer. A missing font falls back to Inter, with a warning.
- Overlay settings (position, close when clicking outside, background) can't be set by plugins, so set them in Figma's Prototype panel.

## How to use it

1. In Dropkit, press **Copy instructions** (or open the [instructions page](https://adnnankhan.github.io/dropkit/)).
2. Paste them into any AI (Claude, ChatGPT, Gemini…) together with your design idea. It replies with the JSON file.
3. In Figma, open Dropkit, tick what you want, drop the file and press **Build**.

The format is described in [docs/FORMAT.md](docs/FORMAT.md). A complete example is [examples/example.json](examples/example.json).

## Install it from GitHub (without Figma Community)

1. Download the zip from the latest [GitHub Release](https://github.com/adnnankhan/dropkit/releases) and unzip it.
2. In the **Figma desktop app**: Plugins → Development → **Import plugin from manifest**, and pick `manifest.json` in the unzipped folder.
3. Run it from Plugins → Development → **Dropkit**.

This works in the desktop app only, and updates aren't automatic: download the new release and import it again.

## Help and bug reports

Open an issue on [GitHub Issues](https://github.com/adnnankhan/dropkit/issues). Say what you did, what you expected and what happened, and attach the JSON file and the copied report if you can.

## For developers

Needs Node.js 24 or newer.

```bash
npm install
```

```bash
npm test
```

| Command | What it does |
| --- | --- |
| `npm run build` | Builds `dist/code.js` and `dist/ui.html` (CSS, JS and the copied instructions inlined) |
| `npm run watch` | Rebuilds when a file changes |
| `npm test` | Builds, type-checks and runs the tests against a strict mock of Figma |
| `npm run site` | Builds the instructions, help and privacy pages into `site/` (published by GitHub Actions) |
| `npm run release` | Builds `release/dropkit-v<version>.zip` (manifest.json + dist/) for a GitHub Release |

| Path | What it is |
| --- | --- |
| `src/code.ts`, `src/plugin/` | The plugin side: checking and building in Figma |
| `src/check/checker.ts` | The checker: every rule in FORMAT.md, in plain words |
| `src/ui/` | The plugin window |
| `test/` | Tests, and the strict mock Figma they run against |
| `docs/FORMAT.md` | The JSON format. Source of truth. |
| `instructions/AI-INSTRUCTIONS.md` | The text behind "Copy instructions" (followed by FORMAT.md and example.json) |
| `examples/` | A correct example file and two broken ones |
| `design/` | The plugin screens and design notes |
| `listing/` | Figma Community listing draft, privacy policy, review checklist, icon |
| `PROMPTS.md`, `CLAUDE.md`, `HANDOFF.md` | How the plugin was built, step by step |
| `reference/` | The earlier Nudge plugins, for reference |

## License

[MIT](LICENSE) © 2026 Adnan Asif Khan
