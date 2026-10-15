# Dropkit JSON format v0.1

Version `dropkit/0.1` · 15 Oct 2026. This file is the source of truth for the format. Where it differs from HANDOFF.md, this file wins.

## Basics

One JSON file describes what to build. Every section is optional, so a file can hold only colours, only screens, or everything.

| Key | Required | Holds |
| --- | --- | --- |
| `format` | Yes | Always `"dropkit/0.1"` for this version |
| `name` | No | A label shown in the plugin and the report |
| `designSystem` | No | Colours, gradients, spacing, radius, sizes, text styles, effects |
| `svgs` | No | Icons and other SVG graphics |
| `components` | No | Components with props and variants |
| `screens` | No | Screen frames |
| `prototype` | No | Links between screens and inside components |

**Names are how everything is found.** A screen can use `"Button"` whether Button is in this JSON or already in the Figma file. Use `/` to group, as Figma does: `bg/primary`, `Icon/check`. Names must be unique within their kind. Layer names must be unique inside one component or screen when a rule or a link points at them.

**One way to write values:**

| You write | It means | Example |
| --- | --- | --- |
| `#RRGGBB` or `#RRGGBBAA` | A raw colour (last two digits = opacity) | `"#4F46E5"`, `"#0000001A"` |
| A number | A raw size in px | `16` |
| Any other string | The name of a token or style | `"bg/primary"`, `"space/4"`, `"Body"` |
| `"hug"` or `"fill"` | Sizing keywords (width and height only) | `"width": "fill"` |
| `null` | Remove this value | `"stroke": null` |

Units: sizes in px, durations in milliseconds, angles in degrees, font weight as 100–900. Keys the plugin doesn't know are ignored with a warning, so a newer file never breaks an older plugin.

## Design system

The design system becomes Figma variables and styles. It needs no page on the canvas.

| Key | Value shape | Built as |
| --- | --- | --- |
| `modes` | List of mode names, e.g. `["Light", "Dark"]` (optional) | Mode order; if missing, taken from the first colour that has modes |
| `colors` | name → colour | Colour variables in a collection called Colors |
| `gradients` | name → gradient | Colour styles (Figma variables can't hold gradients) |
| `spacing` | name → number | Number variables in a collection called Spacing |
| `radius` | name → number | Number variables in a collection called Radius |
| `sizes` | name → number | Number variables in a collection called Sizes |
| `textStyles` | name → text style | Text styles |
| `effects` | name → list of effects | Effect styles |

**A colour can be written three ways:**

- One value for every mode: `"brand/500": "#4F46E5"`
- A link to another colour: `"button/primary/bg": "brand/500"`
- One value per mode: `"bg/primary": { "Light": "#FFFFFF", "Dark": "#0E0E10" }`

Every colour with modes must use the same mode names.

**A gradient** has a type, stops and (for linear) an angle:

```json
"gradients": {
  "Brand/Sunrise": {
    "type": "linear",
    "angle": 135,
    "stops": [
      { "color": "brand/500", "at": 0 },
      { "color": "#F97316", "at": 1 }
    ]
  }
}
```

`type` is `linear`, `radial` or `angular`. `at` runs from 0 (start) to 1 (end). Stop colours can be hex or colour names.

**A text style:**

```json
"Headline": { "font": "Inter", "weight": 600, "size": 17, "lineHeight": 22, "letterSpacing": -0.2 }
```

| Field | Required | Notes |
| --- | --- | --- |
| `font` | Yes | Font family name |
| `weight` | Yes | 100–900; the plugin finds the matching style name (600 → Semi Bold) |
| `size` | Yes | px |
| `lineHeight` | No | px, or `"auto"` (default) |
| `letterSpacing` | No | px, default 0 |
| `italic` | No | `true` or `false` (default) |
| `case` | No | `upper`, `lower` or `title` |
| `decoration` | No | `underline` or `strikethrough` |

**An effect** is a list, so one style can stack a blur and a shadow:

```json
"Glass/Bar": [
  { "type": "backgroundBlur", "radius": 24 },
  { "type": "dropShadow", "color": "#0000001F", "x": 0, "y": 8, "blur": 24, "spread": 0 }
]
```

Types: `dropShadow`, `innerShadow` (use `color`, `x`, `y`, `blur`, `spread`) and `layerBlur`, `backgroundBlur` (use `radius`). Shadows never show through see-through fills, so glass stays clear.

## SVGs

Each SVG becomes editable vectors. By default it becomes a component too, so icons can be reused and swapped.

```json
"svgs": [
  {
    "name": "Icon/check",
    "color": "text/primary",
    "svg": "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'><path d='M5 12.5l4.5 4.5L19 7' stroke='#000' stroke-width='2'/></svg>"
  }
]
```

| Field | Required | Notes |
| --- | --- | --- |
| `name` | Yes | e.g. `Icon/check`, `Logo/full` |
| `svg` | Yes | The SVG code as one string. Use single quotes inside it to avoid escaping. Must have a `viewBox`. |
| `component` | No | `true` (default) makes a component; `false` places plain vectors |
| `color` | No | Recolours every fill and stroke (except `none`) to this colour or token. Leave it out for multi-colour graphics like logos. |

SVGs with scripts or embedded images are rejected. Icon components sit on the Components page, before the other components.

## Layers

Components and screens are built from the same layers. A frame holds other layers in `children`.

| `type` | What it makes | Its own fields |
| --- | --- | --- |
| `frame` | A frame, with or without auto layout | Layout fields (below), `children` |
| `text` | A text layer | `text` or `runs`, `textStyle`, `align`, `truncate`, `decoration` |
| `rect` | A rectangle | — |
| `ellipse` | A circle or oval | — |
| `instance` | A copy of a component | `component`, `variant`, `props`, `color` |
| `svg` | A plain SVG from the `svgs` list | `svg` (its name) |
| `image` | An image | `src`, `fit` |

**Fields every layer can use:**

| Field | Value |
| --- | --- |
| `name` | Layer name. Give real names: smart animate matches layers by name. |
| `x`, `y` | Position inside the parent. Ignored inside auto layout unless `absolute` is `true`. |
| `width`, `height` | Number, token, `"hug"` or `"fill"` |
| `fill` | Colour, colour token, gradient name, a gradient object, or `null` |
| `stroke` | `{ "color": …, "width": 1, "align": "inside" }`; align is `inside`, `center` or `outside`; optional `dash`: `[4, 4]` |
| `radius` | Number or token; or four values `[topLeft, topRight, bottomRight, bottomLeft]` |
| `effect` | Effect style name |
| `opacity` | 0 to 1 |
| `rotation` | Degrees |
| `visible` | `true` (default) or `false` |
| `clip` | `true` hides what overflows the frame |
| `absolute` | `true` places it by `x`/`y` inside an auto layout parent |

**Auto layout** (on a frame):

| Field | Value |
| --- | --- |
| `layout` | `row`, `column` or `none` (default: children use `x`/`y`) |
| `gap` | Number, token, or `"auto"` (space between) |
| `padding` | One value; `[vertical, horizontal]`; or `[top, right, bottom, left]`. Each can be a number or token. |
| `align` | Cross axis: `start`, `center`, `end` or `baseline` |
| `justify` | Main axis: `start`, `center`, `end` or `space-between` |
| `wrap` | `true` lets a row wrap onto new lines |

`"fill"` only works inside an auto layout parent. `"hug"` only works on auto layout frames and text.

**Mixed text styles** use `runs` instead of `text`. The plugin joins the runs into one text layer:

```json
{ "type": "text", "name": "Due", "textStyle": "Body", "fill": "text/primary",
  "runs": [
    { "text": "Pay " },
    { "text": "₹500", "textStyle": "Headline", "fill": "brand/500" },
    { "text": " by Friday" }
  ] }
```

A run can set `textStyle`, `fill`, `decoration` and `link` (a web address). Anything it doesn't set comes from the layer.

**Other text fields:** `align` is `left`, `center`, `right` or `justify`. `truncate` is `true` (one line) or a number of lines. `decoration` is `underline` or `strikethrough`, as in text styles.

**Instance fields:** `component` is the component's name. `variant` picks values, e.g. `{ "Style": "Primary" }`. `props` sets its properties, e.g. `{ "Label": "Save", "Show icon": true }`. `color` recolours an icon instance.

**Image fields:** `src` is a `data:image/png;base64,…` or JPG string. `fit` is `fill` (default), `fit` or `crop`. With no `src`, the plugin draws a grey placeholder and adds a warning.

## Components

A component is written once as a `base` layer plus `rules` for its variants. The plugin builds every variant fresh from these; it never copies one variant to make another.

```json
{
  "name": "Button",
  "props": {
    "Label": { "type": "text", "default": "Continue" },
    "Show icon": { "type": "boolean", "default": false },
    "Icon": { "type": "swap", "default": "Icon/plus" }
  },
  "variants": { "Style": ["Primary", "Secondary"], "Size": ["Large", "Small"] },
  "base": {
    "type": "frame", "layout": "row", "gap": "space/2", "padding": [0, "space/6"],
    "align": "center", "justify": "center", "width": "hug", "height": 52,
    "fill": "button/primary/bg", "radius": "radius/md",
    "children": [
      { "type": "instance", "name": "Icon", "component": "Icon/plus", "width": 20, "height": 20,
        "swapProp": "Icon", "visibleProp": "Show icon" },
      { "type": "text", "name": "Label", "text": "Continue", "textStyle": "Headline",
        "fill": "button/primary/text", "textProp": "Label" }
    ]
  },
  "rules": [
    { "when": { "Style": "Secondary" },
      "set": { "self": { "fill": "bg/secondary" }, "Label": { "fill": "text/primary" } } },
    { "when": { "Size": "Small" },
      "set": { "self": { "height": 44, "padding": [0, "space/4"] } } }
  ]
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `name` | Yes | Component name |
| `description` | No | Shown in Figma's component description |
| `base` | Yes | One layer (usually a frame): the component itself |
| `props` | No | Its properties (below) |
| `variants` | No | Each property and its values. The plugin makes every combination. |
| `skip` | No | Combinations that shouldn't exist, e.g. `[{ "Style": "Secondary", "Size": "Small" }]` |
| `rules` | No | Changes for some variants (below) |

**Props** have a `type` and a `default`:

- `text`: link a text layer to it with `"textProp": "Label"`.
- `boolean`: show or hide a layer with `"visibleProp": "Show icon"`.
- `swap`: let an instance be swapped with `"swapProp": "Icon"`. The default is a component name.

**Rules** say what changes. `when` lists one or more variant values. `set` lists layers by name (`self` = the component's top layer) and the fields to change. Any layer field can be changed, including `visible`, `text` and the `variant` of a nested instance. Rules apply in order; a later rule wins.

Components sit on the Components page, each variant set in its own area.

## Screens

A screen is a top-level frame. It takes every frame field from Layers, plus a size and a mode.

```json
{
  "name": "Tasks",
  "width": 393, "height": 852, "mode": "Light", "fill": "bg/primary",
  "children": [
    { "type": "text", "name": "Title", "x": 20, "y": 64, "text": "Today",
      "textStyle": "Title", "fill": "text/primary" },
    { "type": "instance", "name": "Add task button", "component": "Button",
      "variant": { "Style": "Primary", "Size": "Large" },
      "props": { "Label": "Add task" }, "x": 20, "y": 766, "width": 353 }
  ]
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `name` | Yes | Screen name; prototype links use it |
| `width`, `height` | Yes | px, e.g. 393 × 852 for a phone |
| `mode` | No | Which colour mode the screen shows, e.g. `"Dark"`. Default: the first mode. |
| `children` | No | Its layers |

Screens sit on the Screens page, left to right in the order they are listed.

## Prototype & animations

The prototype has two lists: `links` between screens, and `componentLinks` that switch a component between its variants (a toggle turning on, for example).

```json
"prototype": {
  "start": "Tasks",
  "links": [
    { "from": "Tasks", "layer": "Add task button", "on": "tap", "action": "navigate",
      "to": "New task", "transition": "push", "direction": "left", "duration": 300, "easing": "easeOut" },
    { "from": "New task", "layer": "Back button", "on": "tap", "action": "back" }
  ],
  "componentLinks": [
    { "component": "Checkbox", "from": { "Checked": "Off" }, "on": "tap",
      "to": { "Checked": "On" }, "transition": "smartAnimate", "duration": 200, "easing": "gentle" }
  ]
}
```

| Field | Values |
| --- | --- |
| `start` | The screen the prototype starts on |
| `from` | Screen name (links) or variant values (componentLinks) |
| `layer` | The layer that's tapped. Use a path like `Header/Back button` if the name repeats. Leave it out to use the whole screen. |
| `on` | `tap`, `press`, `hover`, `drag` or `afterDelay` (add `delay` in ms) |
| `action` | `navigate`, `overlay`, `swapOverlay`, `back`, `close` or `url` |
| `to` | Screen name; variant values for componentLinks; a web address for `url` |
| `transition` | `instant` (default), `dissolve`, `smartAnimate`, `moveIn`, `moveOut`, `push`, `slideIn` or `slideOut` |
| `direction` | `left`, `right`, `up` or `down` (for move, push and slide) |
| `duration` | ms, default 300 |
| `easing` | `linear`, `easeIn`, `easeOut` (default), `easeInOut`, `gentle`, `quick`, `bouncy` or `slow` |

**Overlays** can also set `position` (`center`, `top`, `bottom`), `closeOnOutside` (`true` or `false`) and `background` (a colour with opacity, e.g. `"#00000066"`). Figma doesn’t let plugins set these three, so the plugin builds the overlay link and the report reminds you to set them by hand in Figma’s Prototype panel.

Smart animate moves layers that have the same name on both screens, so name layers carefully.

## How the plugin checks and builds

The plugin checks the whole file first, then builds the ticked parts in this order:

1. Design system
2. SVGs (icons are used inside components)
3. Components
4. Screens
5. Prototype & animations

**Problems come in three kinds:**

| Kind | What happens | Example |
| --- | --- | --- |
| Can't read | Nothing is checked or built until the file is fixed | A missing comma on line 42 |
| Error | Only that item is skipped; everything else is built | A screen uses a component that isn't in the file or the JSON |
| Warning | Built, with a note in the report | Prototype links exist but Prototype isn't ticked |

Every problem names the item and says what to fix, in plain words. "Copy problems for your AI" copies them all, ready to paste.

**Ticked boxes vs. the file:**

- A ticked part that's missing from the file is simply skipped.
- An unticked part is not built. Other parts can still use it if it already exists in the Figma file; if it doesn't, that's an error.
- When the plugin opens, every box is ticked except Prototype & animations.

**Running the same file again** skips anything whose name already exists, and lists it in the report as "already in file". A half-finished build can be finished this way.

**Stop** finishes the item being built, then stops.

**Figma's free plan** allows one mode per collection and 3 pages. The plugin doesn't work around these limits:

- Colours are built with the first mode only. The report says which modes were left out and that they need a paid Figma plan.
- Screens set to another mode are built in the first mode, with a warning.
- Only two pages are used: Components and Screens.

**Fonts:** if a font isn't installed, text using it falls back to Inter and the report lists it as a warning.

**Open questions:**

- Whether gradient stops can stay linked to colour variables depends on Figma's plugin API. Check this while building; if they can't, the colour value is used.
