// The plugin side: opens the window, checks files and builds them.
// themeColors makes Figma add its --figma-color-* variables, so the window follows the Figma theme.
import { checkFile } from './check/checker.ts';
import { build, showPart } from './plugin/build.ts';
import { collectNames } from './plugin/names.ts';
import type { ToPlugin, ToUi } from './shared/messages.ts';

figma.showUI(__html__, { width: 360, height: 720, themeColors: true });

const send = (message: ToUi) => figma.ui.postMessage(message);
const control = { stop: false, building: false };

figma.ui.onmessage = async (message: ToPlugin) => {
  if (message.type === 'check') {
    const names = await collectNames();
    send({ type: 'checked', id: message.id, result: checkFile(message.data, message.ticked, names) });
  } else if (message.type === 'build') {
    if (control.building) return;
    control.building = true;
    control.stop = false;
    try {
      const report = await build(message.data, message.ticked, message.fileName, {
        shouldStop: () => control.stop,
        onProgress: (fraction, rows) => send({ type: 'progress', fraction, rows }),
      });
      send({ type: 'done', report });
    } finally {
      control.building = false;
    }
  } else if (message.type === 'stop') {
    control.stop = true;
  } else if (message.type === 'show') {
    await showPart(message.part);
  } else if (message.type === 'open-url') {
    figma.openExternal(message.url);
  }
};
