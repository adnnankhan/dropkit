# Step-by-step prompts for Claude Code

Paste one prompt at a time. After each step, test in Figma before moving on. If something is wrong, tell Claude Code what you saw and let it fix it before the next step.

Claude Code reads `CLAUDE.md` by itself, so the project rules are already there.

---

## Step 0: Set up (you do this, no prompt)

1. Unzip this folder somewhere easy, for example `Documents/dropkit`.
2. Install Node.js (LTS version) if you don't have it: nodejs.org.
3. Open a terminal in the folder and run `claude`.
4. Create an empty GitHub repo named `dropkit`. Don't add a README; the folder already has files.

**How to test any step in Figma:** open the Figma desktop app → open a test file → Plugins → Development → Import plugin from manifest → pick `manifest.json` in this folder. You only import once. After that, run it from Plugins → Development.

Use a fresh Figma test file for each test, so old results don't mix in.

---

## Step 1: Plugin shell

```
Read CLAUDE.md and every file it lists. Then build step 1 only: the plugin shell.

Set up the project: package.json, tsconfig, esbuild build script, manifest.json, `npm run build`, `npm test`, git (first commit, and connect it to my GitHub repo dropkit; ask me for the URL).

The plugin window must match design states 1, 2 and 7, in light and dark (state 8 shows dark). Use themeColors so it follows my Figma theme.

What must work:
- 5 checkboxes, all ticked when the plugin opens.
- Drop a .json file on the drop zone, or use "Choose file".
- "Paste JSON instead" opens the paste box; "Use a file instead" goes back; "Check JSON" reads the pasted text.
- If the text isn't valid JSON, show state 7. Give the line number and a plain-words reason, like "Line 60: a comma is missing."
- If it is valid, show the file name and the message "File read. Checking comes in step 2." The Build button stays disabled.
- "Copy instructions" copies instructions/AI-INSTRUCTIONS.md + docs/FORMAT.md + examples/example.json, joined in that order and bundled at build time. Make copying work inside Figma's plugin window (the normal clipboard API may be blocked there, so add a fallback).
- "Open as web page" is a placeholder link for now. We set it in step 5.

Don't build anything on the canvas yet. When done, tell me how to load it in Figma and what to try, step by step.
```

**Test:** drop `examples/example.json` (should say file read), drop `examples/broken-syntax.json` (should show the line and reason), try paste, try Copy instructions and paste the result into a note, and switch Figma between light and dark.

---

## Step 2: Checker

```
Build step 2 only: the checker. Follow docs/FORMAT.md exactly, especially "How the plugin checks and builds".

- Write a checker that takes the parsed JSON, which boxes are ticked, and the names that already exist in the open Figma file. It returns a list of problems. Each problem has a kind (error or warning), where it is in plain words (for example: Screen "New task" › Task name field), and what to fix.
- Check everything FORMAT.md describes: required fields, allowed values, the format version, duplicate names, unknown keys (warning), mode names matching, the "hug" and "fill" rules, and that every name used exists: tokens, styles, gradients, SVGs, components, variant values, props (textProp, visibleProp, swapProp), rule layers, screens and prototype layers. Follow the "Ticked boxes vs. the file" rules.
- The plugin side collects the names already in the Figma file: variables, styles and components, including component sets. Load pages first (dynamic-page).
- Fonts used in text styles that aren't installed: a warning that says text will fall back to Inter.
- UI: states 3 and 4 exactly. State 3 shows the counts line. "Copy problems for your AI" copies every problem as plain text, starting with: "The Figma plugin found these problems in my JSON file. Please fix them and send me the whole corrected file."
- The Build button is enabled after a file is read, even with errors, because errors only skip their item. Pressing it shows "Building comes in step 3." for now.
- Also write schema/format.schema.json (JSON Schema 2020-12) that matches FORMAT.md, for editors and AIs. The plugin itself uses the hand-written checker, not the schema.

Tests: example.json gives no errors; broken-missing-component.json gives exactly one error about "Text field"; broken-syntax.json can't be read; plus a small test for each rule.

Stop when done and tell me what to try in Figma.
```

**Test:** drop all three example files. Prototype starts unticked, so `example.json` should give the warning about prototype links; tick Prototype and drop it again, and the warning goes away. Try "Copy problems for your AI".

---

## Step 3a: Build the design system

```
Build step 3a only: the design system builder, following the "Design system" section of docs/FORMAT.md and lessons 6, 9, 11 and 12 in HANDOFF.md.

- Colours as variables in a Colors collection with modes; links between colours as variable aliases. Spacing, Radius and Sizes collections. Gradients as colour styles. Text styles (find the font style name from the weight using the installed fonts). Effect styles, with shadows set not to show behind see-through fills.
- Free plan: try to add a second mode. If Figma refuses, build the first mode only and add a warning to the report naming the modes left out. Don't work around Figma's plan limits in any way (no extra collections, no Mode variants): Figma's review can reject plugins that work around its paid plans.
- Check in the current Plugin API docs whether gradient stops can be linked to colour variables. Tell me what you found and do what FORMAT.md says.
- Running the same file again must skip anything that already exists by name.
- Every item in its own try/catch. Never stop halfway.
- Connect the Build button for this part: show the Building state (state 5) while it runs, then the Done state (state 6) with real counts. Parts not built yet show "Comes later" in the list.

Add mock tests, including a free-plan mock that refuses a second mode. Stop when done and tell me what to try in Figma.
```

**Test:** build `example.json` with only Design system ticked. In Figma, check the local variables (Light and Dark values), colour styles (the gradient), text styles and effect styles. Run it again: nothing should be duplicated.

---

## Step 3b: Build SVGs

```
Build step 3b only: the SVG builder, following the "SVGs" section of docs/FORMAT.md.

- Turn each SVG into editable vectors. Make it a component unless "component" is false.
- "color" recolours every fill and stroke (not "none"), linked to the colour variable when it's a token name.
- Reject SVGs with scripts or embedded images, as an error for that SVG only.
- Put SVG components on the Components page (create it if needed, and respect the free plan's 3-page limit), before other components, neatly in a grid.
- Re-run safe, try/catch per item, progress and report rows like step 3a.

Add mock tests. Stop when done and tell me what to try in Figma.
```

**Test:** build `example.json` with Design system and SVGs ticked. Check the 3 icons on the Components page and that their colour is linked to `text/primary`.

---

## Step 3c: Build components

```
Build step 3c only: the components builder, following the "Layers" and "Components" sections of docs/FORMAT.md and lessons 1–4 and 7–9 in HANDOFF.md.

- Build every variant fresh from base + rules. Never clone a variant to make another (lesson 3).
- All layer types and fields from "Layers": auto layout, sizing (hug/fill, set in the right order: lesson 8), fills (colour, token, gradient), strokes, radius, effects, text styles, mixed text runs, nested instances with variant/props/color, images.
- Link values to variables and styles wherever a token or style name is used.
- Props: text, boolean and swap, linked through textProp, visibleProp and swapProp.
- skip combinations; rules applied in order, later rules win.
- Using a component that is a set: pick the right variant, never instance the set (lesson 2). Get main components with getMainComponentAsync (lesson 1).
- Lay out components on the Components page after the icons, each variant set in its own area.
- Re-run safe, try/catch per component, progress and report rows.

Extend the strict mock so it copies the real behaviours in HANDOFF.md (blocked mainComponent, sets can't be instanced, variant switch replaces children, clones lose property links). Stop when done and tell me what to try in Figma.
```

**Test:** build with the first three boxes ticked. In Figma, check Button (4 variants), Checkbox and Task row. Try the props in the right panel: change Label, toggle Show icon, swap Icon. Check that colours are linked to variables.

---

## Step 3d: Build screens

```
Build step 3d only: the screens builder, following the "Screens" section of docs/FORMAT.md.

- Each screen is a frame with its size, fill and layers, built with the same layer code as step 3c.
- "mode" sets which colour mode the screen shows, by setting the variable mode on the frame. If that mode doesn't exist (free plan), build the screen in the first mode and add a warning.
- Instances use components from this JSON or already in the file.
- Screens go on the Screens page, left to right in the order listed, evenly spaced.
- An error in one screen skips only that screen.
- Re-run safe, try/catch per screen, progress and report rows.

Add mock tests. Stop when done and tell me what to try in Figma.
```

**Test:** build `example.json` with four boxes ticked. Check both screens, the gradient progress bar, and the mixed text "1 of 2 tasks done". Then build `broken-missing-component.json` in a new file: Tasks should build, New task should be skipped and listed in the report.

---

## Step 3e: Build the prototype

```
Build step 3e only: the prototype builder, following the "Prototype & animations" section of docs/FORMAT.md and lesson 1 in HANDOFF.md.

- Links between screens with setReactionsAsync (check the current API docs). Map our words (tap, navigate, smartAnimate, easeOut…) to Figma's values.
- "start" becomes the prototype's starting point.
- componentLinks switch a component between its variants (change to).
- Overlay settings: position, close when clicking outside, background colour.
- A link whose screen or layer is missing is an error for that link only.
- Re-run safe: don't add the same link twice.

Add mock tests. Stop when done and tell me what to try in Figma.
```

**Test:** build `example.json` with all five boxes ticked, then press Present in Figma. Tap "Add task" (should push to New task), "Back", and a checkbox (should animate on and off).

---

## Step 4: Finishing behaviours

```
Build step 4 only: finish the build flow so it matches design states 5 and 6 and the confirmed behaviours in design/DESIGN-NOTES.md.

- "Stop after this step" finishes the item being built, then stops, and shows the report with what was built and what wasn't.
- The report lists, per part: what was built, what was skipped (with the reason) and what was already in the file. "Show" selects and zooms to that part on the canvas. "Copy report" copies the report as plain text.
- "Build another file" goes back to state 1 and keeps the ticked boxes.
- Full re-run test: build example.json twice in the same file. The second run builds nothing new and reports everything as already in the file.
- Half-finished test: stop during components, run again, and it finishes the rest.
- Free plan test in the mock: one mode only (with the warning in the report), no fourth page.

Stop when done and give me a short checklist to test all of this in Figma, including on a free-plan Figma account.
```

**Test:** follow the checklist Claude Code gives you. If you can, test once with a free (Starter) Figma account too.

---

## Step 5: Instructions web page

```
Build step 5 only: the public instructions page.

- Make a page that shows the same text as "Copy instructions" (instructions/AI-INSTRUCTIONS.md + docs/FORMAT.md + examples/example.json), plus a plain-text version AIs can read easily.
- Publish it with GitHub Pages from my repo. GitHub Pages is free only for public repos, so ask me first whether the repo can be public.
- Also publish listing/PRIVACY.md as a privacy page, and a short help page that points to GitHub Issues for support.
- Point the plugin's "Open as web page" link to it.
- Make sure the page and the copied text always come from the same files, so they never drift apart.

Stop when done and tell me the link.
```

**Test (the important one):** paste the copied instructions into 2–3 different AIs (for example Claude, ChatGPT, Gemini) with a small design idea. Drop each AI's JSON into the plugin. Note every problem and give the list to Claude Code: fix the instructions or the format, whichever is at fault.

---

## Step 6: Get ready to publish

```
Build step 6 only: get the plugin ready for Figma Community.

- Review all the code against the 12 lessons in HANDOFF.md and the rules in docs/FORMAT.md. List anything that doesn't match, then fix it.
- Remove debug logs. Make sure the plugin needs no internet access.
- Write a README for the GitHub repo: what it does, how to use it, how to install it from GitHub without Figma Community, the format version, and where to get help (GitHub Issues).
- Make a GitHub Release with a ready-built zip (manifest.json + dist/), so people can use the plugin from GitHub without building it.
- Go through listing/REVIEW-CHECKLIST.md against Figma's current review guidelines. Tell me anything that changed or that we don't meet yet.
- Check that listing/LISTING.md still describes the plugin accurately. Tell me what to change; don't rewrite the wording yourself.

The name is Dropkit and the icon is in listing/icon/. Use them in the manifest, README and pages.
```

**Then:** turn on two-factor authentication on your Figma account (Figma requires it to publish). Make the cover image (1920 × 1080, required) and up to 9 screenshots or videos (optional) from the real, built plugin, approve the listing text, and publish from the Figma desktop app. Fill in the security disclosure form with the facts in `listing/REVIEW-CHECKLIST.md`.
