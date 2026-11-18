import './style.css';
import { Soundscape } from './audio.js';
import { Controls } from './controls.js';
import { applyUpgrade, newRun, advance, STEP } from './game.js';
import { get, Hud, write } from './hud.js';

const canvas = get('arena');
const title = get('title-screen');
const startButton = get('start');
const overlay = get('overlay');
const upgradeModal = get('upgrade-modal');
const hud = new Hud();
const sound = new Soundscape();
const controls = new Controls(canvas, get('stick'), get('stick-thumb'), { chart: toggleChart, pause: togglePause });
let run = newRun();
let titlePreviewRun = newRun();
let view;
let stage = 'title';
let last = 0;
let lag = 0;

// Initialize 3D Riftline Arena immediately so the Main Menu & In-Game graphics share the exact same 3D scene!
import('./scene.js').then(({ SceneView }) => {
  view = new SceneView(canvas);
  view.resize();
  view.drawTitle(titlePreviewRun, 0);
}).catch((err) => {
  console.warn('3D preview init warning:', err.message);
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

function restart() {
  run = newRun();
  run.notices.push({
    message: 'Du bist Chef Torge! Dein Lichtkegel leuchtet durch die Dunkelheit ([Q] an/aus). [Klick]/[C] = Chef-Schelle, [Rechtsklick]/[Space] = Dash!',
    until: 8.5,
  });
  if (upgradeModal) upgradeModal.hidden = true;
  title.hidden = true;
  canvas.hidden = false;
  get('hud').hidden = false;
  get('vignette').hidden = false;
  hud.toggleChart(run, false);
  sound.reset();
  view.resize();
  view.draw(run, 0, true);
  hud.paint(run);
  resume();
}

async function begin() {
  if (stage !== 'title') return;
  stage = 'loading';
  startButton.disabled = true;
  const label = startButton.querySelector('span');
  write(label, 'ARENA LÄDT…');
  get('launch-error').hidden = true;
  sound.open();
  try {
    canvas.hidden = false;
    if (!view) {
      const { SceneView } = await import('./scene.js');
      view = new SceneView(canvas);
    }
    restart();
  } catch (error) {
    console.warn('Scavenger could not start', error.message);
    stage = 'title';
    title.hidden = false;
    const message = get('launch-error');
    write(message, 'WebGL 2 konnte nicht gestartet werden.');
    message.hidden = false;
  } finally {
    startButton.disabled = false;
    write(label, 'RUN STARTEN');
  }
}

function resume() {
  overlay.hidden = true;
  get('hud').inert = false;
  stage = 'play';
  lag = 0;
  last = 0;
  controls.enable(true);
  sound.open();
  sound.setActivity('play');
  canvas.focus({ preventScroll: true });
}

function showOverlay(kind) {
  const caughtTitle = run?.caughtBy === 'hauke' ? 'Von Hauke überrollt!' : 'Von Lost Anton gecatcht!';
  const details = {
    pause: ['Kurze Pause', 'Chef Torge gönnt sich kurz Ruhe. Hauke rollt weiter.', 'Weitermachen'],
    caught: [caughtTitle, run?.deathReason ?? 'Du wurdest in der Arena erwischt.', 'Neuer Run'],
    escaped: [
      'Dominanz bewiesen!',
      'Chef Torge hat alle 3 Relikte extrahiert! Unten diskutieren Hauke, Anton und Tom, wer schuld war.',
      'Nächster Run',
    ],
  }[kind];
  stage = kind;
  controls.enable(false);
  sound.setActivity('pause');
  hud.toggleChart(run, false);
  if (upgradeModal) upgradeModal.hidden = true;
  if (run?.popups) run.popups.length = 0;
  if (get('popups')) get('popups').innerHTML = '';
  get('hud').inert = true;
  write(get('overlay-title'), details[0]);
  write(get('overlay-copy'), details[1]);
  write(get('overlay-action'), details[2]);
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
  if (upgradeModal) upgradeModal.hidden = true;
  get('hud').hidden = true;
  get('vignette').hidden = true;
  title.hidden = false;
  startButton.focus({ preventScroll: true });
}

function pickUpgrade(kind) {
  if (!run) return;
  applyUpgrade(run, kind);
  if (upgradeModal) upgradeModal.hidden = true;
  hud.paint(run);
  canvas.focus({ preventScroll: true });
}

for (const card of document.querySelectorAll('.upgrade-card')) {
  card.addEventListener('click', () => pickUpgrade(card.dataset.upgrade));
}
window.addEventListener('keydown', (e) => {
  if (upgradeModal && !upgradeModal.hidden) {
    if (e.code === 'Digit1') pickUpgrade('nova');
    if (e.code === 'Digit2') pickUpgrade('speed');
    if (e.code === 'Digit3') pickUpgrade('aura');
  }
});

get('title-audio').addEventListener('click', changeSound);
get('pause-audio').addEventListener('click', changeSound);
paintSound();
startButton.addEventListener('click', begin);
get('pause').addEventListener('click', togglePause);
get('chart-toggle').addEventListener('click', toggleChart);
get('menu').addEventListener('click', showTitle);
get('overlay-primary').addEventListener('click', () => {
  if (stage === 'pause') resume();
  else restart();
});
for (const [id, action] of [
  ['touch-shutter', 'lamp'], ['touch-dash', 'dash'], ['touch-lure', 'lure'], ['touch-use', 'use'],
  ['touch-bonk', 'bonk'], ['orb-bonk', 'bonk'], ['orb-dash', 'dash'], ['interact', 'use'],
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
  if (upgradeModal && !upgradeModal.hidden) {
    view.draw(run, dt);
    return;
  }
  lag += dt;
  while (lag >= STEP && run.state === 'playing') {
    advance(run, controls.read(view, run.player));
    for (const event of run.events) sound.play(event, run.player);
    lag -= STEP;
    if (run.pendingUpgrade && upgradeModal) {
      run.pendingUpgrade = false;
      upgradeModal.hidden = false;
      break;
    }
  }
  sound.background(run);
  view.draw(run, dt);
  hud.paint(run);
  if (run.state !== 'playing') showOverlay(run.state);
}
requestAnimationFrame(tick);

if (import.meta.env.DEV) {
  Object.defineProperty(window, '__scavenger', { get: () => ({ run, view, stage, hud, pickUpgrade }) });
}
