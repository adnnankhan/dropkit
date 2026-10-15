// The plugin side. Step 1 only opens the window; nothing is built on the canvas yet.
// themeColors makes Figma add its --figma-color-* variables, so the window follows the Figma theme.
figma.showUI(__html__, { width: 360, height: 720, themeColors: true });
