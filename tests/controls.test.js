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

test('Controls maps streamlined v2.0 2-Station hotkeys (S/Tab 180°, C Under-Desk, Space Monitor/Breath, F Flashlight, Q/E, X, 1-0)', () => {
  const { win, canvas } = createFakeDom();
  const log = [];
  let underDeskState = false;
  const controls = new Controls(canvas, {
    isUnderDesk: () => underDeskState,
    turnAround: () => log.push('turn180'),
    underDesk: () => {
      underDeskState = !underDeskState;
      log.push(`underDesk:${underDeskState}`);
    },
    holdBreath: (on) => log.push(`breath:${on}`),
    flashlight: () => log.push('flashlight'),
    leftDoor: () => log.push('leftDoor'),
    rightDoor: () => log.push('rightDoor'),
    monitor: () => log.push('monitor'),
    camCounter: () => log.push('camCounter'),
    mute: () => log.push('mute'),
    cam: (id) => log.push(`cam:${id}`),
  });
  controls.enable(true);

  const fireKey = (code) => {
    let prevented = false;
    win.dispatch('keydown', { code, preventDefault() { prevented = true; } });
    return prevented;
  };

  assert.equal(fireKey('KeyQ'), true);
  assert.equal(fireKey('KeyE'), true);
  assert.equal(fireKey('KeyS'), true);
  assert.equal(fireKey('KeyF'), true);
  assert.equal(fireKey('Space'), true); // Not under desk -> flips monitor!
  assert.equal(fireKey('Digit3'), true);
  assert.equal(fireKey('KeyX'), true);
  assert.equal(fireKey('KeyC'), true); // Enters under_desk!
  assert.equal(fireKey('Space'), true); // Under desk -> holds breath!
  win.dispatch('keyup', { code: 'Space' });
  assert.equal(fireKey('KeyM'), true);

  assert.deepEqual(log, [
    'leftDoor',
    'rightDoor',
    'turn180',
    'flashlight',
    'monitor',
    'cam:1C',
    'camCounter',
    'underDesk:true',
    'breath:true',
    'breath:false',
    'mute',
  ]);

  win.dispatch('keydown', { code: 'KeyA', preventDefault() {} });
  assert.ok(controls.read().lookDelta < 0);
  win.dispatch('keyup', { code: 'KeyA' });
  win.dispatch('keydown', { code: 'KeyD', preventDefault() {} });
  assert.ok(controls.read().lookDelta > 0);
});

test('Controls supports vertical touch swipe-down to duck under desk and swipe-up to stand', () => {
  const { canvas } = createFakeDom();
  let hidden = false;
  const controls = new Controls(canvas, {
    isUnderDesk: () => hidden,
    underDesk: (val) => { hidden = typeof val === 'boolean' ? val : !hidden; },
  });
  controls.enable(true);

  canvas.dispatch('pointerdown', { pointerId: 2, pointerType: 'touch', button: 0, clientX: 500, clientY: 200 });
  canvas.dispatch('pointermove', { pointerId: 2, pointerType: 'touch', clientX: 505, clientY: 280 });
  canvas.dispatch('pointerup', { pointerId: 2, pointerType: 'touch', clientX: 505, clientY: 280 });
  assert.equal(hidden, true);

  canvas.dispatch('pointerdown', { pointerId: 3, pointerType: 'touch', button: 0, clientX: 500, clientY: 320 });
  canvas.dispatch('pointermove', { pointerId: 3, pointerType: 'touch', clientX: 502, clientY: 220 });
  canvas.dispatch('pointerup', { pointerId: 3, pointerType: 'touch', clientX: 502, clientY: 220 });
  assert.equal(hidden, false);
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

test('Controls toggles pause once per key press and only treats completed stationary pointer gesture as canvasTap', () => {
  const { win, canvas } = createFakeDom();
  let pauseCount = 0;
  let monitorCount = 0;
  const taps = [];
  const controls = new Controls(canvas, {
    pause: () => { pauseCount += 1; return true; },
    monitor: () => { monitorCount += 1; },
    canvasTap: (x, y) => taps.push([x, y]),
  });
  controls.enable(true);

  const preventDefault = () => {};
  win.dispatch('keydown', { code: 'Escape', preventDefault });
  win.dispatch('keydown', { code: 'Escape', repeat: true, preventDefault });
  assert.equal(pauseCount, 1);

  const button = { closest: (selector) => (selector === 'button' ? button : null) };
  win.dispatch('keydown', { code: 'Space', target: button, preventDefault });
  assert.equal(monitorCount, 0);

  const pointer = { pointerId: 1, pointerType: 'touch', button: 0, clientX: 500, clientY: 300 };
  canvas.dispatch('pointerdown', pointer);
  canvas.dispatch('pointercancel', pointer);
  assert.deepEqual(taps, []);

  canvas.dispatch('pointerdown', pointer);
  canvas.dispatch('pointerup', pointer);
  assert.deepEqual(taps, [[0.5, 0.5]]);
});

test('Slow swipes and vertical drags do not activate the poster', () => {
  const { canvas } = createFakeDom();
  let taps = 0;
  const controls = new Controls(canvas, { canvasTap: () => taps++ });
  controls.enable(true);
  const pointer = { pointerId: 1, pointerType: 'touch', button: 0, clientX: 80, clientY: 100 };
  canvas.dispatch('pointerdown', pointer);
  for (let x = 81; x <= 100; x++) canvas.dispatch('pointermove', { ...pointer, clientX: x });
  canvas.dispatch('pointermove', pointer);
  canvas.dispatch('pointerup', pointer);
  canvas.dispatch('pointerdown', pointer);
  canvas.dispatch('pointerup', { ...pointer, clientY: 125 });
  assert.equal(taps, 0);
});

test('Releasing a look arrow preserves the other finger and pause clears held arrows', () => {
  const { canvas } = createFakeDom();
  const controls = new Controls(canvas);
  controls.enable(true);
  controls.setLookHold(10, -1);
  controls.setLookHold(20, 1);
  assert.ok(controls.read().lookDelta > 0);
  controls.setLookHold(20, 0);
  assert.ok(controls.read().lookDelta < 0);
  controls.enable(false);
  controls.enable(true);
  assert.equal(controls.read().lookDelta, 0);
});

test('Holding E works on one kitchen step and releasing E clears that hold', () => {
  const { win, canvas } = createFakeDom();
  let presses = 0;
  const controls = new Controls(canvas, {
    isBackView: () => true,
    startPrepHold: () => {
      presses += 1;
      controls.setPrepHold('doner');
    },
  });
  controls.enable(true);
  const preventDefault = () => {};
  win.dispatch('keydown', { code: 'KeyE', preventDefault });
  win.dispatch('keydown', { code: 'KeyE', repeat: true, preventDefault });
  assert.equal(presses, 1);
  assert.equal(controls.read().prepHold, 'doner');
  win.dispatch('keyup', { code: 'KeyE' });
  assert.equal(controls.read().prepHold, null);
});
