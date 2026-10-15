// A strict mock of the `figma` global, based on reference/mock-figma-test.js.
// Anything the mock doesn't know about throws, so a test fails loudly when the plugin
// uses an API nobody has checked. Later steps add the canvas parts and the strict
// real-Figma behaviours listed in HANDOFF.md (blocked mainComponent, sets that can't
// be instanced, variant switches that replace children, clones that lose property links).

export interface MockFigma {
  figma: PluginAPI;
  calls: {
    showUI: { html: string; options: ShowUIOptions | undefined }[];
    notify: string[];
    posted: unknown[];
  };
}

export function createMockFigma(): MockFigma {
  const calls: MockFigma['calls'] = { showUI: [], notify: [], posted: [] };

  const ui = strict('figma.ui', {
    postMessage(message: unknown) {
      calls.posted.push(message);
    },
    onmessage: undefined as unknown,
    on() {},
  });

  const api = strict('figma', {
    showUI(html: string, options?: ShowUIOptions) {
      calls.showUI.push({ html, options });
    },
    ui,
    notify(message: string) {
      calls.notify.push(message);
      return { cancel() {} };
    },
    closePlugin() {},
    on() {},
  });

  return { figma: api as unknown as PluginAPI, calls };
}

function strict<T extends object>(path: string, target: T): T {
  return new Proxy(target, {
    get(object, key) {
      if (typeof key === 'symbol' || key in object) return Reflect.get(object, key);
      throw new Error(`Mock Figma: ${path}.${key} was used, but the mock doesn't have it yet.`);
    },
  });
}
