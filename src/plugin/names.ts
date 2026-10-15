// Collects the names already in the open Figma file, for the checker.
import type { ExistingComponent, ExistingNames } from '../check/checker.ts';
import { propName } from '../shared/format.ts';

export async function collectNames(): Promise<ExistingNames> {
  await figma.loadAllPagesAsync(); // dynamic-page: pages must be loaded before searching them

  const [collections, variables, paintStyles, textStyles, effectStyles] = await Promise.all([
    figma.variables.getLocalVariableCollectionsAsync(),
    figma.variables.getLocalVariablesAsync(),
    figma.getLocalPaintStylesAsync(),
    figma.getLocalTextStylesAsync(),
    figma.getLocalEffectStylesAsync(),
  ]);

  const colors = collections.find((c) => c.name === 'Colors');
  const components: ExistingComponent[] = [];
  const screens: string[] = [];
  for (const page of figma.root.children) {
    for (const node of page.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] })) {
      if (node.type === 'COMPONENT' && node.parent?.type === 'COMPONENT_SET') continue; // a variant
      components.push(describeComponent(node));
    }
    for (const node of page.children) if (node.type === 'FRAME') screens.push(node.name);
  }

  let fonts: ExistingNames['fonts'] = null;
  try {
    fonts = (await figma.listAvailableFontsAsync()).map((f) => ({ family: f.fontName.family, style: f.fontName.style }));
  } catch {
    fonts = null;
  }

  return {
    colorVariables: variables.filter((v) => v.resolvedType === 'COLOR').map((v) => v.name),
    numberVariables: variables.filter((v) => v.resolvedType === 'FLOAT').map((v) => v.name),
    colorModes: colors ? colors.modes.map((m) => m.name) : [],
    paintStyles: paintStyles.map((s) => s.name),
    textStyles: textStyles.map((s) => s.name),
    effectStyles: effectStyles.map((s) => s.name),
    components,
    screens,
    fonts,
  };
}

function describeComponent(node: ComponentNode | ComponentSetNode): ExistingComponent {
  const variants: ExistingComponent['variants'] = {};
  const props: ExistingComponent['props'] = {};
  let definitions: ComponentPropertyDefinitions = {};
  try {
    definitions = node.componentPropertyDefinitions;
  } catch {
    // A component with broken properties: treat it as having none.
  }
  for (const [key, def] of Object.entries(definitions)) {
    if (def.type === 'VARIANT') variants[key] = def.variantOptions ?? [];
    else if (def.type === 'TEXT') props[propName(key)] = 'text';
    else if (def.type === 'BOOLEAN') props[propName(key)] = 'boolean';
    else if (def.type === 'INSTANCE_SWAP') props[propName(key)] = 'swap';
  }
  return { name: node.name, variants, props };
}
