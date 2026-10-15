# Plugin UI — design notes

Look: **Figma-native** (chosen). Open the `.html` files in a browser to see each state. They are static mockups, not working code.

## States

| File | State | When |
| --- | --- | --- |
| `1-empty.html` | Empty | Plugin just opened, no file yet |
| `2-paste.html` | Paste JSON | User chose "Paste JSON instead" |
| `3-checked-ready.html` | Checked, ready | File read and checked, no problems |
| `4-checked-problems.html` | Checked, with problems | File checked, errors and/or warnings |
| `5-building.html` | Building | After Build is pressed |
| `6-done.html` | Done | Build finished, report shown |
| `7-cant-read.html` | Can't read | The file isn't valid JSON |
| `8-dark-theme.html` | Dark theme | Same as state 4 when Figma is in dark mode |

## Layout

- Window: 360 × 720 px, the same size in every state.
- Sections separated by 1px lines, 16px padding.
- Order, top to bottom: Instructions for your AI → What to build → JSON file → check result → footer with the main button.
- The main button always sits in the footer, full width.
- Building and Done replace the sections with a progress list or a report, but keep the same footer position.

## Style

- Font: Inter, 12px body, 11px semibold section labels.
- Controls: 32px high (Figma is used with a mouse on desktop).
- Light and dark must follow the user's Figma theme. Use `figma.showUI(__html__, { themeColors: true })` and Figma's `--figma-color-*` CSS variables, so the plugin matches Figma exactly. The hex values in the mockups are close stand-ins, checked for contrast:

| Role | Light | Dark |
| --- | --- | --- |
| Background | #FFFFFF | #2C2C2C |
| Text | #1E1E1E | #FFFFFF |
| Secondary text | #6B6B6B | #B3B3B3 |
| Lines | #E6E6E6 | #444444 |
| Primary button | #0A6CC2, white text | same |
| Error | #B42318 | #FF8A80 |
| Warning | #8A5300 | #F5B544 |
| Success | #067647 | — |

Errors and warnings also differ by icon (circle-x vs triangle), not just colour.

## Behaviour (confirmed by Adnan)

1. A broken item is skipped; everything else is built. The report lists what was skipped.
2. "Copy problems for your AI" copies every problem as plain text, ready to paste into an AI.
3. "Stop after this step" finishes the item being built, then stops. Nothing is left half-made.
4. All 5 boxes are ticked when the plugin opens.

## Copy

Use the exact wording in the mockups. Main button labels: "Add a file to build" (disabled), "Build N parts", "Check JSON" (paste), "Fix the file to build" (disabled), "Build another file".
