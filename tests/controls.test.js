import test from 'node:test';
import assert from 'node:assert/strict';

function createMockClassList(initial = []) {
  const set = new Set(initial);
  return {
    add(...names) { for (const n of names) set.add(n); },
    remove(...names) { for (const n of names) set.delete(n); },
    toggle(name, force) {
      if (force === undefined) {
        if (set.has(name)) set.delete(name);
        else set.add(name);
        return set.has(name);
      }
      if (force) set.add(name);
      else set.delete(name);
      return Boolean(force);
    },
    contains(name) { return set.has(name); },
  };
}

function createMockElement(rect = { left: 0, top: 0, width: 100, height: 100 }, { closestMap = {} } = {}) {
  const listeners = new Map();
  return {
    style: {},
    classList: createMockClassList(),
    closest(selector) { return closestMap[selector] ?? null; },
    getBoundingClientRect() {
      return { ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height };
    },
    setPointerCapture() {},
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    dispatch(type, event = {}) {
      const payload = {
        preventDefault() { payload.defaultPrevented = true; },
        defaultPrevented: false,
        target: this,
        ...event,
      };
      for (const fn of listeners.get(type) ?? []) fn(payload);
      return payload;
    },
  };
}

async function setupControls({ coarse = true } = {}) {
  const windowEl = createMockElement({ left: 0, top: 0, width: 390, height: 844 });
  const bodyClassList = createMockClassList();
  globalThis.window = windowEl;
  globalThis.document = { body: { classList: bodyClassList } };
  globalThis.matchMedia = (q) => ({
    matches: coarse ? q.includes('coarse') : q.includes('fine'),
  });

  // Import after globals are prepared (cache-busted for isolated runs)
  const { Controls } = await import(`../src/controls.js?t=${Date.now()}_${Math.random()}`);
  const canvas = createMockElement({ left: 0, top: 0, width: 390, height: 844 });
  const stickZone = createMockElement({ left: 4, top: 680, width: 150, height: 150 });
  const stick = createMockElement(
    { left: 14, top: 730, width: 90, height: 90 },
    { closestMap: { '.stick-zone': stickZone } },
  );
  const thumb = createMockElement({ left: 44, top: 760, width: 30, height: 30 });

  let chartToggled = 0;
  let paused = 0;
  const controls = new Controls(canvas, stick, thumb, {
    chart: () => { chartToggled += 1; },
    pause: () => { paused += 1; return true; },
  });
  controls.enable(true);

  return {
    controls,
    canvas,
    stickZone,
    stick,
    thumb,
    windowEl,
    bodyClassList,
    counts: () => ({ chartToggled, paused }),
  };
}

test('Controls detects coarse touch device on init and snaps floating stick inside zone', async () => {
  const { controls, stickZone, stick, bodyClassList } = await setupControls({ coarse: true });
  assert.equal(controls.touch, true);
  assert.equal(bodyClassList.contains('touch-input'), true);

  // Tap upper-right area inside stick-zone away from default stick center
  stickZone.dispatch('pointerdown', { pointerType: 'touch', pointerId: 1, clientX: 110, clientY: 710 });
  assert.equal(stick.classList.contains('active'), true);
  assert.ok(stick.style.transform.includes('translate('));

  // Drag right (+x) from anchored center
  stickZone.dispatch('pointermove', { pointerType: 'touch', pointerId: 1, clientX: 145, clientY: 724 });
  const frame = controls.read({ aimAt: () => 0 }, { x: 0, z: 0 });
  assert.ok(frame.x > 0.7, `expected positive X movement, got ${frame.x}`);
  assert.equal(frame.isTouch, true);

  // Release resets stick
  stickZone.dispatch('pointerup', { pointerType: 'touch', pointerId: 1 });
  assert.equal(stick.classList.contains('active'), false);
  assert.equal(stick.style.transform, '');
  const idleFrame = controls.read({ aimAt: () => 0 }, { x: 0, z: 0 });
  assert.equal(idleFrame.x, 0);
  assert.equal(idleFrame.z, 0);
});

test('Controls preserves continuous touch aiming until finger lifts', async () => {
  const { controls, canvas } = await setupControls({ coarse: true });
  let mockAngle = 1.1;
  const fakeView = { aimAt: () => mockAngle };

  canvas.dispatch('pointerdown', { pointerType: 'touch', pointerId: 2, clientX: 250, clientY: 300 });
  const frame1 = controls.read(fakeView, { x: 1, z: 1 });
  assert.equal(frame1.angle, 1.1);

  // Even without moving pointer, read() continuously recalculates relative to moving player
  mockAngle = 1.45;
  const frame2 = controls.read(fakeView, { x: 2, z: 1 });
  assert.equal(frame2.angle, 1.45);

  // Lifting aim finger clears angle so Dose touch auto-aim takes over again
  canvas.dispatch('pointerup', { pointerType: 'touch', pointerId: 2 });
  const frame3 = controls.read(fakeView, { x: 2, z: 1 });
  assert.equal(frame3.angle, undefined);
});

test('Controls ignores synthetic mouse jitter right after touch and keeps Space dashing when HUD button is focused', async () => {
  const { controls, canvas, windowEl, bodyClassList } = await setupControls({ coarse: true });
  canvas.dispatch('pointerdown', { pointerType: 'touch', pointerId: 3, clientX: 200, clientY: 200 });
  canvas.dispatch('pointerup', { pointerType: 'touch', pointerId: 3 });

  // Trailing synthetic mousemove immediately after touch stays in touch-input mode
  canvas.dispatch('pointermove', { pointerType: 'mouse', button: 0, clientX: 200, clientY: 200 });
  assert.equal(controls.touch, true);
  assert.equal(bodyClassList.contains('touch-input'), true);

  // Focused HUD button should NOT swallow Space for Dash
  const hudBtn = createMockElement({}, {
    closestMap: { button: true, '#hud': true },
  });
  const keyEvt = windowEl.dispatch('keydown', { code: 'Space', target: hudBtn, repeat: false });
  assert.equal(keyEvt.defaultPrevented, true);
  const frame = controls.read({ aimAt: () => 0 }, { x: 0, z: 0 });
  assert.equal(frame.dash, true);
  assert.equal(controls.touch, false);

  // Focused modal/non-HUD button preserves native Space button click
  const modalBtn = createMockElement({}, {
    closestMap: { button: true },
  });
  const modalKey = windowEl.dispatch('keydown', { code: 'Space', target: modalBtn, repeat: false });
  assert.equal(modalKey.defaultPrevented, false);
});
