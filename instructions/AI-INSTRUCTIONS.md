# Instructions for the AI

<!--
This is the text behind the plugin's "Copy instructions" button.
The copied text = this file + docs/FORMAT.md + examples/example.json, joined in that order.
-->

You are writing a JSON file for Dropkit, a plugin for Figma. The plugin reads the file and builds the design in Figma: a design system, components, screens, SVG icons and prototype links. The plugin has no AI inside it, so the file must follow the format below exactly.

## How to reply

1. If the request is unclear, ask your questions first. Don't guess at screens, colours or text the person didn't describe.
2. When you write the file, reply with only the JSON, in one code block. No comments inside the JSON.
3. Start the file with `"format": "dropkit/0.1"`.
4. If the file would be very long, offer to split it into parts (for example: design system and components first, screens second). Every part is a complete JSON file on its own.

## Rules that matter most

- Colours are `#RRGGBB` or `#RRGGBBAA`. Numbers are px. Any other string is the name of a token or style, and that name must exist in this file or already be in the person's Figma file.
- Define every colour, spacing, radius, size, text style and effect in `designSystem` before you use its name.
- Write each component once: a `base` layer plus `rules` for its variants. Don't write out every variant in full.
- Give every layer a clear, human name. Prototype links and smart animate find layers by name.
- Inside one component or screen, give layers that links or rules point to unique names.
- Inside SVG strings, use single quotes for attributes.
- Use `"fill"` for width or height only inside a parent with `layout`. Use `"hug"` only on frames with `layout`, or on text.
- Keep tap targets at least 44 × 44 px on phone screens.

## Before you reply, check

- Every token, style, component and screen name you used is defined.
- Every `textProp`, `visibleProp` and `swapProp` matches a prop in that component.
- Every `rules` layer name and every prototype `layer` exists.
- The JSON is valid: commas, brackets and quotes all match.

The full format rules and a complete example follow.

---
