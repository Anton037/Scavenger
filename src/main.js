import './style.css';
import { Soundscape } from './audio.js';
import { Controls } from './controls.js';
import { CUSTOM_PRESETS, loadProgress, NIGHT_CONFIGS, saveProgress } from './fnafData.js';
import {
  advance,
  honkPoster,
  muteCall,
  newNight,
  resetCameraFuse,
  ringKitchenBell,
  selectCam,
  STEP,
  toggleLeftDoor,
  toggleLeftLight,
  toggleMonitor,
  toggleRightDoor,
  toggleRightLight,
} from './game.js';
import { get, Hud, write } from './hud.js';

const canvas = get('stage');
const titleScreen = get('title-screen');
const customScreen = get('custom-screen');
const introScreen = get('intro-screen');
const hudScreen = get('hud');
const pauseScreen = get('pause-screen');
const winScreen = get('win-screen');
const gameoverScreen = get('gameover-screen');

const sound = new Soundscape();
let view = null;
let run = null;
let stage = 'title'; // 'title' | 'custom' | 'intro' | 'play' | 'pause' | 'win' | 'gameover'
let introTimer = null;
let pausedFocus = null;
let lastTs = 0;
let lag = 0;
let lastHapticAt = 0;

const customAi = { torge: 5, anton: 5, tom: 5, hauke: 5 };

function pulseHaptic(event) {
  if (!controls.touch || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  const now = performance.now();
  const urgent = event.kind === 'jumpscare' || event.kind === 'hauke_door_slam' || event.kind === 'window_sting' || event.kind === 'anton_video_warning';
  if (!urgent && now - lastHapticAt < 85) return;
  const pattern = event.kind === 'jumpscare'
    ? [70, 30, 90, 30, 120]
    : event.kind === 'hauke_door_slam'
      ? [60, 28, 80, 28, 60]
      : event.kind === 'anton_video_warning'
        ? [32, 65, 32]
        : event.kind === 'window_sting'
          ? [36, 20, 48]
          : event.kind === 'hauke_stomp'
            ? 34
            : event.kind === 'door'
              ? 20
              : 0;
  if (!pattern) return;
  lastHapticAt = now;
  try {
    navigator.vibrate(pattern);
  } catch {
    // ignore unsupported vibration
  }
}

function flushEvents(currentRun) {
  if (!currentRun?.events?.length) return;
  for (const ev of currentRun.events) {
    sound.play(ev);
    pulseHaptic(ev);
  }
  currentRun.events.length = 0;
}

function playAction(action) {
  return (...args) => {
    if (stage !== 'play' || run?.state !== 'playing') return;
    sound.open();
    action(run, ...args);
    flushEvents(run);
    hud.paint(run);
  };
}

const gameActions = {
  monitor: playAction(toggleMonitor),
  leftDoor: playAction(toggleLeftDoor),
  leftLight: playAction(toggleLeftLight),
  rightDoor: playAction(toggleRightDoor),
  rightLight: playAction(toggleRightLight),
  cam: playAction(selectCam),
  fuse: playAction(resetCameraFuse),
  bell: playAction(ringKitchenBell),
  mute: playAction((currentRun) => {
    if (muteCall(currentRun)) sound.stopSpeech();
  }),
};

const hud = new Hud(gameActions.cam);
const controls = new Controls(canvas, {
  ...gameActions,
  pause: () => togglePause(),
  honk: () => {
    if (stage !== 'play' || !run) return;
    sound.open();
    if (honkPoster(run)) flushEvents(run);
  },
  canvasTap: (rx, ry) => {
    if (stage !== 'play' || !run || run.monitorOpen || run.powerOutage) return;
    // Chef Torge poster sits cleanly centered above the desk!
    const expectedX = 0.53 - run.lookX * 0.24;
    if (Math.abs(rx - expectedX) < 0.14 && ry > 0.16 && ry < 0.58) {
      sound.open();
      if (honkPoster(run)) flushEvents(run);
    }
  },
});

function hideAllScreens() {
  hudScreen.inert = false;
  pausedFocus = null;
  for (const s of [titleScreen, customScreen, introScreen, hudScreen, pauseScreen, winScreen, gameoverScreen]) {
    if (s) s.hidden = true;
  }
  const hal = get('hallucination');
  if (hal) hal.hidden = true;
}

function paintAudioButtons() {
  const txt = sound.enabled ? 'Ton: AN' : 'Ton: AUS';
  for (const id of ['title-audio', 'pause-audio']) {
    const b = get(id);
    if (b) {
      b.setAttribute('aria-pressed', String(sound.enabled));
      write(b, txt);
    }
  }
}

function toggleAudio() {
  sound.toggle();
  paintAudioButtons();
}

function showTitle() {
  if (introTimer) {
    clearTimeout(introTimer);
    introTimer = null;
  }
  stage = 'title';
  controls.enable(false);
  sound.setActivity('title');
  hideAllScreens();
  hud.syncTitleProgress();
  if (titleScreen) titleScreen.hidden = false;
  titleScreen.querySelector('.title-menu button:not([hidden])')?.focus();
}

function showCustomNight() {
  sound.open();
  stage = 'custom';
  controls.enable(false);
  hideAllScreens();
  syncCustomValues();
  if (customScreen) customScreen.hidden = false;
  get('custom-back').focus();
}

function syncCustomValues() {
  for (const k of ['torge', 'anton', 'tom', 'hauke']) {
    write(get(`ai-${k}`), String(customAi[k]));
  }
}

async function ensureView() {
  if (view) return view;
  const { SceneView } = await import('./scene.js');
  view = new SceneView(canvas);
  view.resize();
  return view;
}

// Kick off 3D engine load immediately for the live FNAF Title Screen!
ensureView().catch((err) => {
  console.warn('3D scene init warning:', err.message);
  const el = get('launch-error');
  if (el) {
    write(el, 'WebGL 2 konnte nicht gestartet werden.');
    el.hidden = false;
  }
});

async function startNight(night, customOverride = null) {
  if (introTimer) {
    clearTimeout(introTimer);
    introTimer = null;
  }
  sound.open();
  sound.reset();
  try {
    await ensureView();
  } catch {
    return;
  }

  run = newNight({
    night,
    customAi: night === 7 ? { ...(customOverride || customAi) } : null,
  });

  // Immediate 1-9-8-7 Golden Duck Easter Egg skips intro straight into Jumpscare!
  if (run.state === 'jumpscare') {
    hideAllScreens();
    hudScreen.hidden = false;
    stage = 'play';
    controls.enable(false);
    sound.setActivity('play');
    flushEvents(run);
    hud.paint(run);
    lastTs = 0;
    lag = 0;
    return;
  }

  const cfg = NIGHT_CONFIGS[night] ?? NIGHT_CONFIGS[1];
  hideAllScreens();
  write(get('intro-night'), cfg.title);
  write(get('intro-sub'), cfg.sub);
  if (introScreen) introScreen.hidden = false;
  stage = 'intro';
  controls.enable(false);
  sound.setActivity('pause');
  sound.play({ kind: 'cam_blip' });

  introTimer = setTimeout(() => {
    introTimer = null;
    if (stage !== 'intro') return;
    hideAllScreens();
    hudScreen.hidden = false;
    stage = 'play';
    lastTs = 0;
    lag = 0;
    controls.enable(true);
    sound.setActivity('play');
    hud.paint(run);
    view.draw(run);
  }, 1900);
}

function togglePause() {
  if (stage === 'play' && run && run.state === 'playing') {
    pausedFocus = hudScreen.contains(document.activeElement) ? document.activeElement : get('btn-pause');
    stage = 'pause';
    controls.enable(false);
    sound.setActivity('pause');
    hud.showPause(run);
    hudScreen.inert = true;
    pauseScreen.hidden = false;
    get('pause-resume').focus();
    return true;
  }
  if (stage === 'pause') {
    pauseScreen.hidden = true;
    hudScreen.inert = false;
    pausedFocus?.focus({ preventScroll: true });
    pausedFocus = null;
    stage = 'play';
    lastTs = 0;
    lag = 0;
    controls.enable(true);
    sound.setActivity('play');
    sound.open();
    return true;
  }
  return false;
}

function showWin() {
  stage = 'win';
  controls.enable(false);
  sound.syncLoops(null);
  saveProgress(run.night, run.customAi);
  hud.syncTitleProgress();
  hideAllScreens();
  hud.showWin(run);
  const nextBtn = get('win-next');
  if (nextBtn) {
    nextBtn.hidden = run.night >= 6;
    write(nextBtn, `Nacht ${run.night + 1} starten ▶`);
  }
  winScreen.hidden = false;
}

function showGameOver() {
  stage = 'gameover';
  controls.enable(false);
  sound.syncLoops(null);
  hideAllScreens();
  hud.showGameOver(run);
  gameoverScreen.hidden = false;
}

// Build Custom Night preset buttons
const presetWrap = get('custom-presets');
if (presetWrap) {
  for (const preset of CUSTOM_PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-crt small';
    btn.textContent = preset.name;
    btn.addEventListener('click', () => {
      Object.assign(customAi, preset.ai);
      syncCustomValues();
      sound.open();
      sound.play({ kind: 'cam_blip' });
    });
    presetWrap.appendChild(btn);
  }
}

for (const card of document.querySelectorAll('.ai-card')) {
  const charKey = card.dataset.char;
  for (const btn of card.querySelectorAll('.step-btn')) {
    btn.addEventListener('click', () => {
      const delta = Number(btn.dataset.step) || 0;
      customAi[charKey] = Math.max(0, Math.min(20, (customAi[charKey] || 0) + delta));
      syncCustomValues();
      sound.open();
      sound.play({ kind: 'cam_blip' });
    });
  }
}

// Menu & Overlay bindings
get('btn-new-game')?.addEventListener('click', () => startNight(1));
get('btn-continue')?.addEventListener('click', () => {
  const { night } = loadProgress();
  if (night === 7) {
    showCustomNight();
  } else {
    startNight(night);
  }
});
get('btn-night6')?.addEventListener('click', () => startNight(6));
get('btn-custom')?.addEventListener('click', showCustomNight);
get('custom-back')?.addEventListener('click', showTitle);
get('custom-start')?.addEventListener('click', () => startNight(7, customAi));
get('title-audio')?.addEventListener('click', toggleAudio);
get('pause-audio')?.addEventListener('click', toggleAudio);

get('btn-pause')?.addEventListener('click', togglePause);
get('pause-resume')?.addEventListener('click', togglePause);
get('pause-menu')?.addEventListener('click', showTitle);

get('btn-mute-call')?.addEventListener('click', (event) => {
  gameActions.mute();
  if (event.detail > 0) event.currentTarget.blur();
});

// Start eerie Title Screen horror drone on first user gesture
for (const ev of ['pointerdown', 'keydown']) {
  window.addEventListener(ev, () => {
    if (stage === 'title' || stage === 'custom') sound.open();
  }, { once: true });
}

get('win-next')?.addEventListener('click', () => {
  if (run && run.night < 6) startNight(run.night + 1);
  else showTitle();
});
get('win-menu')?.addEventListener('click', showTitle);

get('gameover-retry')?.addEventListener('click', () => {
  if (run) startNight(run.night, run.customAi);
  else showTitle();
});
get('gameover-menu')?.addEventListener('click', showTitle);

for (const [id, action] of [
  ['btn-left-door', gameActions.leftDoor],
  ['btn-left-light', gameActions.leftLight],
  ['btn-right-door', gameActions.rightDoor],
  ['btn-right-light', gameActions.rightLight],
  ['btn-monitor', gameActions.monitor],
  ['btn-fuse', gameActions.fuse],
  ['btn-kitchen-bell', gameActions.bell],
]) {
  const btn = get(id);
  btn.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') controls.noteTouch();
  });
  btn.addEventListener('click', (event) => {
    action();
    if (event.detail > 0) btn.blur();
  });
}

// Touch Quick-Look Left / Right hold buttons
function bindHoldLook(id, dir) {
  const el = get(id);
  if (!el) return;
  const start = (e) => {
    e.preventDefault();
    controls.setLookHold(dir);
  };
  const stop = () => controls.setLookHold(0);
  el.addEventListener('pointerdown', start);
  el.addEventListener('pointerup', stop);
  el.addEventListener('pointercancel', stop);
  el.addEventListener('pointerleave', stop);
}
bindHoldLook('look-left', -1);
bindHoldLook('look-right', 1);

// Resize & background tab pause
function handleResize() {
  if (!view) return;
  view.resize();
  if (stage === 'title' || stage === 'custom') view.drawTitle(performance.now() / 1000);
  else if (run && stage !== 'play') view.draw(run);
}
window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', () => {
  handleResize();
  setTimeout(handleResize, 160);
});
window.visualViewport?.addEventListener('resize', handleResize);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    sound.suspend();
    if (stage === 'play' && run?.state === 'playing') togglePause();
  }
});
window.addEventListener('pagehide', () => sound.suspend());

paintAudioButtons();

// Main 60 FPS fixed-step render loop
function tick(now) {
  requestAnimationFrame(tick);
  if (stage === 'title' || stage === 'custom') {
    if (view) view.drawTitle(now / 1000);
    return;
  }
  if (stage !== 'play' || !run) return;

  if (lastTs === 0) {
    lastTs = now;
    return;
  }
  const dt = Math.min(0.1, (now - lastTs) / 1000);
  lastTs = now;
  lag += dt;

  while (lag >= STEP && (run.state === 'playing' || run.state === 'jumpscare')) {
    advance(run, controls.read(), STEP);
    flushEvents(run);
    lag -= STEP;
  }

  sound.syncLoops(run);
  if (view) view.draw(run);
  hud.paint(run);

  if (run.state === 'won') showWin();
  else if (run.state === 'gameover') showGameOver();
}
requestAnimationFrame(tick);

if (import.meta.env.DEV) {
  Object.defineProperty(window, '__fnat', {
    get: () => ({ run, view, stage, hud, controls, startNight }),
  });
}
