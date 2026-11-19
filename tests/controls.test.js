import test from 'node:test';
import assert from 'node:assert/strict';
import { Controls } from '../src/controls.js';

function createFakeDom() {
  const listeners = new Map();
  const makeTarget = () => ({
    addEventListener(type, fn) {
      if (!listeners.has(this)) listeners.set(this, new Map());
      const map = listeners.get(this);
      if (!map.has(type)) map.set(type, []);
      map.get(type).push(fn);
    },
    dispatch(type, event = {}) {
      const list = listeners.get(this)?.get(type) ?? [];
      for (const fn of list) fn(event);
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 1000, height: 600 };
    },
    setPointerCapture() {},
  });

  const win = makeTarget();
  win.innerWidth = 1000;
  win.innerHeight = 600;
  win.matchMedia = () => ({ matches: false });

  const doc = makeTarget();
  doc.body = {
    classList: {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      contains(c) { return this.classes.has(c); },
    },
  };

  const canvas = makeTarget();
  globalThis.window = win;
  globalThis.document = doc;
  Object.defineProperty(globalThis, 'navigator', {
    value: { maxTouchPoints: 0 },
    configurable: true,
  });

  return { win, doc, canvas };
}

test('Controls maps FNAF hotkeys (Q/W/E/R/Space/1-0/M/H) and A/D office panning', () => {
  const { win, canvas } = createFakeDom();
  const log = [];
  const controls = new Controls(canvas, {
    leftDoor: () => log.push('leftDoor'),
    leftLight: () => log.push('leftLight'),
    rightDoor: () => log.push('rightDoor'),
    rightLight: () => log.push('rightLight'),
    monitor: () => log.push('monitor'),
    mute: () => log.push('mute'),
    honk: () => log.push('honk'),
    cam: (id) => log.push(`cam:${id}`),
  });
  controls.enable(true);

  const fireKey = (code) => {
    let prevented = false;
    win.dispatch('keydown', { code, preventDefault() { prevented = true; } });
    return prevented;
  };

  assert.equal(fireKey('KeyQ'), true);
  assert.equal(fireKey('KeyW'), true);
  assert.equal(fireKey('KeyE'), true);
  assert.equal(fireKey('KeyR'), true);
  assert.equal(fireKey('Space'), true);
  assert.equal(fireKey('Digit3'), true);
  assert.equal(fireKey('Digit0'), true);
  assert.equal(fireKey('KeyM'), true);
  assert.equal(fireKey('KeyH'), true);
  assert.deepEqual(log, ['leftDoor', 'leftLight', 'rightDoor', 'rightLight', 'monitor', 'cam:1C', 'cam:6', 'mute', 'honk']);

  win.dispatch('keydown', { code: 'KeyA', preventDefault() {} });
  assert.ok(controls.read().lookDelta < 0);
  win.dispatch('keyup', { code: 'KeyA' });
  win.dispatch('keydown', { code: 'KeyD', preventDefault() {} });
  assert.ok(controls.read().lookDelta > 0);
});

test('Controls blocks zooming, selection, and context menu outside editable inputs', () => {
  const { win, doc, canvas } = createFakeDom();
  new Controls(canvas, {});

  let wheelPrevented = false;
  win.dispatch('wheel', { ctrlKey: true, preventDefault() { wheelPrevented = true; } });
  assert.equal(wheelPrevented, true);

  let gesturePrevented = false;
  win.dispatch('gesturestart', { preventDefault() { gesturePrevented = true; } });
  assert.equal(gesturePrevented, true);

  let selectPrevented = false;
  doc.dispatch('selectstart', { target: { closest: () => null }, preventDefault() { selectPrevented = true; } });
  assert.equal(selectPrevented, true);

  let ctxPrevented = false;
  doc.dispatch('contextmenu', { target: { closest: () => null }, preventDefault() { ctxPrevented = true; } });
  assert.equal(ctxPrevented, true);
});

test('Controls toggles pause once per key press and preserves focused button activation', () => {
  const { win, canvas } = createFakeDom();
  let pauseCount = 0;
  let monitorCount = 0;
  const controls = new Controls(canvas, {
    pause: () => { pauseCount += 1; return true; },
    monitor: () => { monitorCount += 1; },
  });
  controls.enable(true);

  const preventDefault = () => {};
  win.dispatch('keydown', { code: 'Escape', preventDefault });
  win.dispatch('keydown', { code: 'Escape', repeat: true, preventDefault });
  assert.equal(pauseCount, 1);

  const button = { closest: (selector) => selector === 'button' ? button : null };
  win.dispatch('keydown', { code: 'Space', target: button, preventDefault });
  win.dispatch('keydown', { code: 'KeyS', ctrlKey: true, preventDefault });
  assert.equal(monitorCount, 0);
});

test('Controls only treats a completed pointer gesture as a canvas tap', () => {
  const { canvas } = createFakeDom();
  const taps = [];
  const controls = new Controls(canvas, { canvasTap: (x, y) => taps.push([x, y]) });
  controls.enable(true);

  const pointer = { pointerId: 1, pointerType: 'touch', button: 0, clientX: 500, clientY: 300 };
  canvas.dispatch('pointerdown', pointer);
  canvas.dispatch('pointercancel', pointer);
  assert.deepEqual(taps, []);

  canvas.dispatch('pointerdown', pointer);
  canvas.dispatch('pointerup', pointer);
  assert.deepEqual(taps, [[0.5, 0.5]]);
});
