import './style.css';
import { Soundscape } from './audio.js';
import { Controls } from './controls.js';
import { newRun, advance, STEP } from './game.js';
import { get, Hud, write } from './hud.js';

const canvas = get('arena');
const title = get('title-screen');
const startButton = get('start');
const overlay = get('overlay');
const hud = new Hud();
const sound = new Soundscape();
const controls = new Controls(canvas, get('stick'), get('stick-thumb'), { chart: toggleChart, pause: togglePause });
let run;
let view;
let stage = 'title';
let last = 0;
let lag = 0;

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
    write(button, sound.enabled ? 'Sound on' : 'Sound off');
  }
}

function changeSound() {
  sound.toggle();
  paintSound();
}

function restart() {
  run = newRun();
  run.notices.push({
    message: 'Use the chart to find the records. Close your lamp if you hear movement nearby.',
    until: 7.5,
  });
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
  write(label, 'Opening the works…');
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
    canvas.hidden = true;
    title.hidden = false;
    const message = get('launch-error');
    write(message, 'The works could not open. Check that WebGL is enabled in your browser and try again.');
    message.hidden = false;
  } finally {
    startButton.disabled = false;
    write(label, 'Descend');
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
  const details = {
    pause: ['Paused', 'Your run is on hold.', 'Resume'],
    caught: ['It heard you', `You recovered ${run.records.size} of 3 records before the Listener found you.`, 'Descend again'],
    escaped: ['The lift rose', 'You brought all three records to the surface. The knocking continued below.', 'Descend again'],
  }[kind];
  stage = kind;
  controls.enable(false);
  sound.setActivity('pause');
  hud.toggleChart(run, false);
  get('hud').inert = true;
  write(get('overlay-title'), details[0]);
  write(get('overlay-copy'), details[1]);
  write(get('overlay-action'), details[2]);
  overlay.hidden = false;
  get('overlay-primary').focus({ preventScroll: true });
}

function showTitle() {
  stage = 'title';
  run = null;
  controls.enable(false);
  sound.setActivity('title');
  overlay.hidden = true;
  get('hud').hidden = true;
  get('vignette').hidden = true;
  canvas.hidden = true;
  title.hidden = false;
  startButton.focus({ preventScroll: true });
}

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
]) get(id).addEventListener('click', () => controls.queue(action));

window.addEventListener('resize', () => {
  if (view && run) {
    view.resize();
    if (stage !== 'play') view.draw(run, 0, true);
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && stage === 'play') showOverlay('pause');
});

function tick(now) {
  requestAnimationFrame(tick);
  if (stage !== 'play') return;
  if (last === 0) {
    last = now;
    return;
  }
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  lag += dt;
  while (lag >= STEP && run.state === 'playing') {
    advance(run, controls.read(view, run.player));
    for (const event of run.events) sound.play(event, run.player);
    lag -= STEP;
  }
  sound.background(run);
  view.draw(run, dt);
  hud.paint(run);
  if (run.state !== 'playing') showOverlay(run.state);
}
requestAnimationFrame(tick);

if (import.meta.env.DEV) {
  Object.defineProperty(window, '__scavenger', { get: () => ({ run, view, stage }) });
}
