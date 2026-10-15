// Words, values and small helpers from docs/FORMAT.md, shared by the checker and the builders.

export const FORMAT_VERSION = 'dropkit/0.1';

export type Part = 'designSystem' | 'svgs' | 'components' | 'screens' | 'prototype';

/** Build order (FORMAT.md, "How the plugin checks and builds"). */
export const BUILD_ORDER: Part[] = ['designSystem', 'svgs', 'components', 'screens', 'prototype'];

export const PART_LABEL: Record<Part, string> = {
  designSystem: 'Design system',
  svgs: 'SVGs',
  components: 'Components',
  screens: 'Screens',
  prototype: 'Prototype & animations',
};

/** Which top-level key holds each part. */
export const PART_KEY: Record<Part, string> = {
  designSystem: 'designSystem',
  svgs: 'svgs',
  components: 'components',
  screens: 'screens',
  prototype: 'prototype',
};

export const LAYER_TYPES = ['frame', 'text', 'rect', 'ellipse', 'instance', 'svg', 'image'] as const;
export type LayerType = (typeof LAYER_TYPES)[number];

export const ENUMS = {
  layout: ['row', 'column', 'none'],
  frameAlign: ['start', 'center', 'end', 'baseline'],
  justify: ['start', 'center', 'end', 'space-between'],
  textAlign: ['left', 'center', 'right', 'justify'],
  decoration: ['underline', 'strikethrough'],
  textCase: ['upper', 'lower', 'title'],
  strokeAlign: ['inside', 'center', 'outside'],
  imageFit: ['fill', 'fit', 'crop'],
  gradientType: ['linear', 'radial', 'angular'],
  effectType: ['dropShadow', 'innerShadow', 'layerBlur', 'backgroundBlur'],
  propType: ['text', 'boolean', 'swap'],
  trigger: ['tap', 'press', 'hover', 'drag', 'afterDelay'],
  action: ['navigate', 'overlay', 'swapOverlay', 'back', 'close', 'url'],
  transition: ['instant', 'dissolve', 'smartAnimate', 'moveIn', 'moveOut', 'push', 'slideIn', 'slideOut'],
  direction: ['left', 'right', 'up', 'down'],
  easing: ['linear', 'easeIn', 'easeOut', 'easeInOut', 'gentle', 'quick', 'bouncy', 'slow'],
  overlayPosition: ['center', 'top', 'bottom'],
} as const;

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value);
}

/** "#RRGGBB" or "#RRGGBBAA" → Figma's 0–1 colour. */
export function hexToRgba(hex: string): { r: number; g: number; b: number; a: number } {
  const n = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255;
  return { r: n(1), g: n(3), b: n(5), a: hex.length === 9 ? n(7) : 1 };
}

export type Combination = Record<string, string>;

/** Every combination of variant values, minus the ones in `skip`. */
export function combinations(variants: Record<string, string[]> | undefined, skip: Combination[] = []): Combination[] {
  const entries = Object.entries(variants ?? {});
  let all: Combination[] = [{}];
  for (const [prop, values] of entries) {
    const next: Combination[] = [];
    for (const combo of all) for (const value of values) next.push({ ...combo, [prop]: value });
    all = next;
  }
  if (entries.length === 0) return all;
  return all.filter((combo) => !skip.some((s) => matches(combo, s)));
}

/** True when every value in `when` is in `combo`. */
export function matches(combo: Combination, when: Combination): boolean {
  return Object.entries(when).every(([prop, value]) => combo[prop] === value);
}

/** Figma's variant name: "Style=Primary, Size=Large". */
export function variantName(combo: Combination): string {
  return Object.entries(combo).map(([prop, value]) => `${prop}=${value}`).join(', ');
}

/** Font style names for a weight, most likely first. 600 → "Semi Bold", "SemiBold", … */
const WEIGHT_NAMES: Record<number, string[]> = {
  100: ['Thin', 'Hairline'],
  200: ['Extra Light', 'ExtraLight', 'Ultra Light', 'UltraLight'],
  300: ['Light'],
  400: ['Regular', 'Normal', 'Book', 'Roman'],
  500: ['Medium'],
  600: ['Semi Bold', 'SemiBold', 'Semibold', 'Demi Bold', 'DemiBold'],
  700: ['Bold'],
  800: ['Extra Bold', 'ExtraBold', 'Ultra Bold', 'UltraBold', 'Heavy'],
  900: ['Black', 'Heavy'],
};

const squash = (style: string) => style.toLowerCase().replace(/[\s_-]/g, '');

/** The weight a font style name stands for, or null. "SemiBold Italic" → 600. */
export function weightOfStyle(style: string): number | null {
  const plain = squash(style).replace(/italic|oblique/g, '') || 'regular';
  for (const [weight, names] of Object.entries(WEIGHT_NAMES)) {
    if (names.some((name) => squash(name) === plain)) return Number(weight);
  }
  return null;
}

export function isItalicStyle(style: string): boolean {
  return /italic|oblique/i.test(style);
}

/**
 * The installed style for a family, weight and italic: an exact match, else the nearest
 * weight (same italic first). Returns null when the family isn't installed.
 */
export function pickFontStyle(
  fonts: { family: string; style: string }[],
  family: string,
  weight: number,
  italic: boolean,
): { style: string; exact: boolean } | null {
  const styles = fonts.filter((f) => f.family === family).map((f) => f.style);
  if (styles.length === 0) return null;
  const scored = styles
    .map((style) => ({ style, weight: weightOfStyle(style), italic: isItalicStyle(style) }))
    .filter((s): s is { style: string; weight: number; italic: boolean } => s.weight !== null);
  const exact = scored.find((s) => s.weight === weight && s.italic === italic);
  if (exact) return { style: exact.style, exact: true };
  const pool = scored.length ? scored : styles.map((style) => ({ style, weight: 400, italic: false }));
  pool.sort(
    (a, b) =>
      Number(a.italic !== italic) - Number(b.italic !== italic) ||
      Math.abs(a.weight - weight) - Math.abs(b.weight - weight),
  );
  return { style: pool[0].style, exact: false };
}

export function plural(count: number, one: string, many = one + 's'): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Figma names variant properties and component properties without the "#123:4" key suffix. */
export function propName(key: string): string {
  const at = key.lastIndexOf('#');
  return at > 0 ? key.slice(0, at) : key;
}
