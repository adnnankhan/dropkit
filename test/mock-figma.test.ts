// The mock must copy Figma's strict behaviours (CLAUDE.md, HANDOFF.md "How to test").
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { createMockFigma } from './mock-figma.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function setup(options = {}) {
  const mock = createMockFigma(options);
  const figma = mock.figma as Any;
  return { mock, figma };
}

describe('mock Figma is strict, like real Figma', () => {
  it('unknown APIs throw', () => {
    const { figma } = setup();
    assert.throws(() => figma.createSlice(), /figma.createSlice was used/);
    assert.throws(() => figma.createFrame().someMadeUpField, /someMadeUpField/);
    assert.throws(() => {
      figma.createFrame().madeUp = 1;
    }, /can’t set|can't set/);
  });

  it('dynamic-page: sync getters and instance.mainComponent throw (lesson 1)', async () => {
    const { figma } = setup();
    assert.throws(() => figma.getNodeById('1:1'), /getNodeByIdAsync/);
    assert.throws(() => figma.getLocalPaintStyles(), /Async/);
    const component = figma.createComponent();
    const instance = component.createInstance();
    assert.throws(() => instance.mainComponent, /getMainComponentAsync/);
    assert.equal(await instance.getMainComponentAsync(), component);
  });

  it('pages must be loaded before searching them', async () => {
    const { figma } = setup({ pages: ['Two'] });
    const two = figma.root.children[1];
    assert.throws(() => two.children, /loadAsync/);
    await figma.loadAllPagesAsync();
    assert.deepEqual(two.children, []);
  });

  it('a component set can’t be instanced (lesson 2)', () => {
    const { figma } = setup();
    const a = figma.createComponent();
    a.name = 'Size=Large';
    const b = figma.createComponent();
    b.name = 'Size=Small';
    const set = figma.combineAsVariants([a, b], figma.currentPage);
    assert.equal(set.createInstance, undefined);
    assert.deepEqual(set.componentPropertyDefinitions.Size.variantOptions, ['Large', 'Small']);
    assert.throws(() => a.componentPropertyDefinitions, /component set or non-variant/);
  });

  it('cloning loses prop links (lesson 3)', () => {
    const { figma } = setup();
    const component = figma.createComponent();
    const text = figma.createText();
    component.appendChild(text);
    const key = component.addComponentProperty('Label', 'TEXT', 'Hi');
    text.componentPropertyReferences = { characters: key };
    const copy = component.clone();
    assert.equal(copy.children[0].componentPropertyReferences, null);
  });

  it('switching a variant replaces the instance’s children; old ones are dead (lesson 4)', () => {
    const { figma } = setup();
    const make = (name: string) => {
      const c = figma.createComponent();
      c.name = name;
      c.appendChild(figma.createRectangle());
      return c;
    };
    const set = figma.combineAsVariants([make('State=Off'), make('State=On')], figma.currentPage);
    const instance = set.children[0].createInstance();
    const old = instance.children[0];
    instance.setProperties({ State: 'On' });
    assert.throws(() => old.fills, /The node does not exist/);
    assert.notEqual(instance.children[0], old);
  });

  it('layout order rules (lesson 8)', () => {
    const { figma } = setup();
    const frame = figma.createFrame();
    const child = figma.createFrame();
    assert.throws(() => (child.layoutSizingHorizontal = 'FILL'), /FILL can only be set on children of auto-layout/);
    frame.layoutMode = 'HORIZONTAL';
    frame.appendChild(child);
    child.layoutSizingHorizontal = 'FILL';
    assert.throws(() => (figma.createRectangle().layoutSizingHorizontal = 'HUG'), /HUG can only be set/);
    frame.layoutSizingHorizontal = 'HUG';
    assert.equal(frame.primaryAxisSizingMode, 'AUTO');
    frame.resize(200, 100);
    assert.equal(frame.primaryAxisSizingMode, 'FIXED', 'resize() resets sizing');
    assert.throws(() => (child.layoutGrow = 0.5), /0 or 1/);
  });

  it('text needs its font loaded (lesson 9)', async () => {
    const { figma } = setup();
    const text = figma.createText();
    assert.throws(() => (text.characters = 'Hi'), /unloaded font/);
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    text.characters = 'Hi';
    await assert.rejects(figma.loadFontAsync({ family: 'Nope', style: 'Regular' }), /could not be loaded/);
  });

  it('free plan: one mode per collection, 3 pages (lesson 6)', () => {
    const { figma } = setup({ plan: 'free' });
    const collection = figma.variables.createVariableCollection('Colors');
    assert.throws(() => collection.addMode('Dark'), /Limited to 1 modes/);
    figma.createPage();
    figma.createPage();
    assert.throws(() => figma.createPage(), /Starter plan only comes with 3 pages/);
  });

  it('overlay settings and reactions are read-only', async () => {
    const { figma } = setup();
    const frame = figma.createFrame();
    assert.throws(() => (frame.overlayPositionType = 'BOTTOM_CENTER'), /read only/);
    assert.throws(() => (frame.reactions = []), /setReactionsAsync/);
    await assert.rejects(frame.setReactionsAsync([{ trigger: { type: 'ON_CLICK' }, actions: [] }]), /trigger and actions/);
  });

  it('variables need objects, not ids', () => {
    const { figma } = setup();
    const collection = figma.variables.createVariableCollection('Sizes');
    assert.throws(() => figma.variables.createVariable('x', collection.id, 'FLOAT'), /Pass the collection/);
    const v = figma.variables.createVariable('x', collection, 'FLOAT');
    assert.throws(() => figma.createFrame().setBoundVariable('width', v.id), /Pass the variable/);
    assert.throws(() => v.setValueForMode(collection.defaultModeId, '12'), /Expected a number/);
  });
});
