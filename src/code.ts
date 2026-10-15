// The plugin side: opens the window, checks files and builds them.
// themeColors makes Figma add its --figma-color-* variables, so the window follows the Figma theme.
import { NO_NAMES, checkFile, type CheckResult, type ExistingNames } from './check/checker.ts';
import { build, showPart } from './plugin/build.ts';
import { collectNames } from './plugin/names.ts';
import type { ToPlugin, ToUi } from './shared/messages.ts';
import type { Report } from './shared/report.ts';

figma.showUI(__html__, { width: 360, height: 720, themeColors: true });

const send = (message: ToUi) => figma.ui.postMessage(message);
const control = { stop: false, building: false };
const HELP = 'Please try again. If it keeps happening, report it on GitHub Issues: github.com/adnnankhan/dropkit/issues.';

/** Names in the file, kept while the same file is checked again (a box ticked or unticked). */
let names: ExistingNames | null = null;

figma.ui.onmessage = async (message: ToPlugin) => {
  if (message.type === 'check') {
    send({ type: 'checked', id: message.id, result: await check(message) });
  } else if (message.type === 'build') {
    if (control.building) return;
    control.building = true;
    control.stop = false;
    names = null; // the build changes the file
    let report: Report;
    try {
      report = await build(message.data, message.ticked, message.fileName, {
        shouldStop: () => control.stop,
        onProgress: (fraction, rows) => send({ type: 'progress', fraction, rows }),
      });
    } catch (error) {
      report = { fileName: message.fileName, stopped: true, parts: [], error: `The build stopped because something went wrong. ${HELP}`, detail: String(error) };
    } finally {
      control.building = false;
    }
    send({ type: 'done', report });
  } else if (message.type === 'stop') {
    control.stop = true;
  } else if (message.type === 'show') {
    await showPart(message.part);
  } else if (message.type === 'open-url') {
    figma.openExternal(message.url);
  }
};

async function check(message: Extract<ToPlugin, { type: 'check' }>): Promise<CheckResult> {
  let warning = '';
  try {
    if (message.fresh || !names) names = await collectNames();
  } catch {
    names = null;
    warning = 'The plugin couldn’t read the names already in this Figma file, so the check can’t see what’s there.';
  }
  try {
    const result = checkFile(message.data, message.ticked, names ?? NO_NAMES);
    if (warning) result.problems.push({ kind: 'warning', where: 'Figma file', message: warning });
    return result;
  } catch {
    return {
      problems: [{ kind: 'error', where: 'File', message: `The plugin couldn’t check this file. ${HELP}`, skip: 'file' }],
      present: [],
      buildable: [],
      skipped: ['file'],
      reasons: {},
      counts: { variables: 0, gradients: 0, textStyles: 0, effects: 0, svgs: 0, components: 0, variants: 0, screens: 0, links: 0 },
    };
  }
}
