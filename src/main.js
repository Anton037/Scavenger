import './style.css';
import { Soundscape } from './audio.js';
import { Controls } from './controls.js';
import { advance, descendNextFloor, finishRunCashOut, newRun, STEP } from './game.js';
import { get, Hud, write } from './hud.js';

const canvas = get('arena');
const title = get('title-screen');
const startButton = get('start');
const overlay = get('overlay');
const liftScreen = get('lift-screen');
const hud = new Hud();
const sound = new Soundscape();
const controls = new Controls(canvas, get('stick'), get('stick-thumb'), { chart: toggleChart, pause: togglePause });

const freshSeed = () => Math.floor(1000 + Math.random() * 9000);
function parseSeed(raw) {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n > 0 ? Math.min(999999, n) : null;
}

const urlSeed = parseSeed(new URLSearchParams(window.location.search).get('seed'));
let previewSeed = urlSeed ?? freshSeed();
let selectedLoadout = 'classic';
let titlePreviewRun = newRun({ seed: previewSeed, floor: 1, loadout: selectedLoadout });
let run = titlePreviewRun;
let view;
let stage = 'title';
let last = 0;
let lag = 0;

function updateSeedBadge() {
  const input = get('seed-input');
  if (input && input.value !== String(previewSeed)) {
    input.value = String(previewSeed);
  }
}
updateSeedBadge();

function refreshTitlePreview() {
  titlePreviewRun = newRun({ seed: previewSeed, floor: 1, loadout: selectedLoadout });
  if (view && stage === 'title') view.drawTitle(titlePreviewRun, performance.now() / 1000);
}

import('./scene.js').then(({ SceneView }) => {
  view = new SceneView(canvas);
  view.resize();
  view.drawTitle(titlePreviewRun, 0);
}).catch((err) => {
  console.warn('3D preview init warning:', err.message);
});

for (const btn of document.querySelectorAll('.loadout-btn')) {
  btn.addEventListener('click', () => {
    selectedLoadout = btn.dataset.loadout || 'classic';
    for (const item of document.querySelectorAll('.loadout-btn')) {
      const on = item === btn;
      item.classList.toggle('active', on);
      item.setAttribute('aria-pressed', String(on));
    }
  });
}

get('seed-input')?.addEventListener('input', (event) => {
  const parsed = parseSeed(event.target.value);
  if (parsed !== null) {
    previewSeed = parsed;
    refreshTitlePreview();
  }
});

get('seed-input')?.addEventListener('blur', () => {
  updateSeedBadge();
});

get('shuffle-seed')?.addEventListener('click', () => {
  previewSeed = freshSeed();
  updateSeedBadge();
  refreshTitlePreview();
});

get('copy-seed')?.addEventListener('click', async () => {
  const shareUrl = `${window.location.origin}${window.location.pathname}?seed=${previewSeed}`;
  try {
    await navigator.clipboard?.writeText?.(shareUrl);
  } catch {
    // clipboard optional in headless/restricted contexts
  }
  const btn = get('copy-seed');
  if (btn) {
    btn.classList.add('copied');
    setTimeout(() => btn.classList.remove('copied'), 1200);
  }
});

window.addEventListener('keydown', (event) => {
  if (stage !== 'lift' || event.repeat) return;
  const idx = event.code === 'Digit1' ? 0 : event.code === 'Digit2' ? 1 : event.code === 'Digit3' ? 2 : -1;
  if (idx >= 0) {
    const btn = get('mod-list')?.children[idx];
    if (btn) {
      event.preventDefault();
      btn.click();
    }
  }
});

function toggleChart() {
  if (stage === 'play') hud.toggleChart(run);
}

function togglePause() {
  if (stage === 'play') {
    showOverlay('pause');
    return true;
  }
  if (stage === 'pause') {
    resume();
    return true;
  }
  return false;
}

function paintSound() {
  for (const button of [get('title-audio'), get('pause-audio')]) {
    button.setAttribute('aria-pressed', String(sound.enabled));
    write(button, sound.enabled ? 'Ton an' : 'Ton aus');
  }
}

function changeSound() {
  sound.toggle();
  paintSound();
}

function restart(explicitSeed = null) {
  const seed = explicitSeed ?? freshSeed();
  previewSeed = seed;
  updateSeedBadge();
  titlePreviewRun = newRun({ seed: previewSeed, floor: 1, loadout: selectedLoadout });
  run = newRun({ seed, floor: 1, loadout: selectedLoadout });
  if (liftScreen) liftScreen.hidden = true;
  hud.clearFloating();
  title.hidden = true;
  canvas.hidden = false;
  get('hud').hidden = false;
  get('vignette').hidden = false;
  hud.toggleChart(run, false);
  sound.reset();
  view.resize();
  view.draw(run, 0, true);
  hud.paint(run, view);
  resume();
}

async function begin() {
  if (stage !== 'title') return;
  stage = 'loading';
  startButton.disabled = true;
  const label = startButton.querySelector('span');
  write(label, 'GENERIERT…');
  get('launch-error').hidden = true;
  sound.open();
  try {
    canvas.hidden = false;
    if (!view) {
      const { SceneView } = await import('./scene.js');
      view = new SceneView(canvas);
    }
    restart(previewSeed);
  } catch (error) {
    console.warn('Scavenger could not start', error.message);
    stage = 'title';
    title.hidden = false;
    const message = get('launch-error');
    write(message, 'WebGL 2 konnte nicht gestartet werden.');
    message.hidden = false;
  } finally {
    startButton.disabled = false;
    write(label, 'ETAGE 1 BETRETEN');
  }
}

function resume() {
  overlay.hidden = true;
  if (liftScreen) liftScreen.hidden = true;
  get('hud').inert = false;
  stage = 'play';
  lag = 0;
  last = 0;
  controls.enable(true);
  sound.open();
  sound.setActivity('play');
  canvas.focus({ preventScroll: true });
}

function showFloorChoices() {
  stage = 'lift';
  controls.enable(false);
  sound.setActivity('pause');
  hud.toggleChart(run, false);
  hud.clearFloating();
  get('hud').inert = true;
  hud.showLiftChoices(run, (modId) => {
    descendNextFloor(run, modId);
    for (const event of run.events) sound.play(event, run.player);
    view.resize();
    view.draw(run, 0, true);
    hud.paint(run, view);
    resume();
  });
}

function showOverlay(kind) {
  const caughtTitle = run?.caughtBy === 'hauke' ? 'Von Hauke überrollt!' : 'Von Anton gecatcht!';
  const mutLabel = run?.map?.mutator?.id && run.map.mutator.id !== 'classic' ? ` · ${run.map.mutator.name}` : '';
  const details = {
    pause: ['Pause', `Etage ${run?.floor ?? 1} · ${run?.map?.biome?.name ?? 'Keller'}${mutLabel} · Seed #${String(run?.seed ?? previewSeed).padStart(4, '0')}`, 'Weitermachen'],
    caught: [caughtTitle, run?.deathReason ?? 'Du wurdest im Dunkeln erwischt.', 'Neuer Keller'],
    escaped: [
      `Etage ${run?.floor ?? 1} gesichert!`,
      'Chef Torge verlässt den Keller ungeschlagen mit voller Beute.',
      'Neuer Run',
    ],
  }[kind];
  stage = kind;
  controls.enable(false);
  sound.setActivity('pause');
  hud.toggleChart(run, false);
  hud.clearFloating();
  if (liftScreen) liftScreen.hidden = true;
  get('hud').inert = true;
  write(get('overlay-title'), details[0]);
  write(get('overlay-copy'), details[1]);
  write(get('overlay-action'), details[2]);
  hud.renderOverlayMods(run);
  const sameSeedBtn = get('overlay-same-seed');
  if (sameSeedBtn) sameSeedBtn.hidden = kind === 'pause';
  const receipt = get('overlay-receipt');
  if (kind === 'pause') {
    if (receipt) receipt.hidden = true;
  } else {
    hud.renderReceipt(run);
  }
  overlay.hidden = false;
  get('overlay-primary').focus({ preventScroll: true });
}

function showTitle() {
  stage = 'title';
  controls.enable(false);
  sound.setActivity('title');
  overlay.hidden = true;
  if (liftScreen) liftScreen.hidden = true;
  hud.clearFloating();
  get('hud').hidden = true;
  get('vignette').hidden = true;
  title.hidden = false;
  if (view) view.drawTitle(titlePreviewRun, performance.now() / 1000);
  startButton.focus({ preventScroll: true });
}

get('lift-cashout')?.addEventListener('click', () => {
  finishRunCashOut(run);
  showOverlay('escaped');
});

get('title-audio').addEventListener('click', changeSound);
get('pause-audio').addEventListener('click', changeSound);
paintSound();
startButton.addEventListener('click', begin);
get('pause').addEventListener('click', togglePause);
get('chart-toggle').addEventListener('click', toggleChart);
get('menu').addEventListener('click', showTitle);
get('overlay-same-seed')?.addEventListener('click', () => {
  restart(run?.seed ?? previewSeed);
});
get('overlay-primary').addEventListener('click', () => {
  if (stage === 'pause') resume();
  else restart(null);
});
for (const [id, action] of [
  ['touch-shutter', 'lamp'], ['touch-dash', 'dash'], ['touch-lure', 'lure'], ['touch-use', 'use'],
  ['touch-bonk', 'bonk'], ['orb-bonk', 'bonk'], ['orb-dash', 'dash'],
  ['slot-lamp', 'lamp'], ['slot-lure', 'lure'], ['interact', 'use'],
]) get(id)?.addEventListener('click', () => controls.queue(action));

window.addEventListener('resize', () => {
  if (view) {
    view.resize();
    if (stage === 'title') view.drawTitle(titlePreviewRun, performance.now() / 1000);
    else if (run && stage !== 'play') view.draw(run, 0, true);
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && stage === 'play') showOverlay('pause');
});

function tick(now) {
  requestAnimationFrame(tick);
  if (stage === 'title') {
    if (view) view.drawTitle(titlePreviewRun, now / 1000);
    return;
  }
  if (stage !== 'play') return;
  if (last === 0) {
    last = now;
    return;
  }
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if ((run.hitStop || 0) > 0) {
    run.hitStop = Math.max(0, run.hitStop - dt);
    view.draw(run, dt * 0.2);
    hud.paint(run, view);
    return;
  }
  lag += dt;
  while (lag >= STEP && run.state === 'playing') {
    advance(run, controls.read(view, run.player));
    for (const event of run.events) sound.play(event, run.player);
    lag -= STEP;
  }
  sound.background(run);
  view.draw(run, dt);
  hud.paint(run, view);
  if (run.state === 'floor_clear') showFloorChoices();
  else if (run.state !== 'playing') showOverlay(run.state);
}
requestAnimationFrame(tick);

if (import.meta.env.DEV) {
  Object.defineProperty(window, '__scavenger', { get: () => ({ run, view, stage, hud }) });
}
