import './style.css';
import { Soundscape } from './audio.js';
import { Controls } from './controls.js';
import { CUSTOM_PRESETS, loadProgress, NIGHT_CONFIGS, resetProgress, saveProgress } from './fnafData.js';
import {
  advance,
  honkPoster,
  muteCall,
  newNight,
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
let lastTs = 0;
let lag = 0;
let lastHapticAt = 0;

const customAi = { torge: 5, anton: 5, tom: 5, hauke: 5 };

function pulseHaptic(event) {
  if (!controls.touch || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  const now = performance.now();
  const urgent = event.kind === 'jumpscare' || event.kind === 'hauke_door_slam' || event.kind === 'window_sting';
  if (!urgent && now - lastHapticAt < 85) return;
  const pattern = event.kind === 'jumpscare'
    ? [70, 30, 90, 30, 120]
    : event.kind === 'hauke_door_slam'
      ? [60, 28, 80, 28, 60]
      : event.kind === 'hauke_stomp'
        ? 34
        : event.kind === 'window_sting'
          ? [36, 20, 48]
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

const hud = new Hud((camId) => {
  if (stage !== 'play' || !run) return;
  sound.open();
  if (selectCam(run, camId)) {
    flushEvents(run);
    hud.paint(run);
  }
});

const controls = new Controls(canvas, {
  pause: () => togglePause(),
  monitor: () => {
    if (stage !== 'play' || !run) return;
    sound.open();
    if (toggleMonitor(run)) {
      flushEvents(run);
      hud.paint(run);
    }
  },
  leftDoor: () => {
    if (stage !== 'play' || !run) return;
    sound.open();
    toggleLeftDoor(run);
    flushEvents(run);
    hud.paint(run);
  },
  leftLight: () => {
    if (stage !== 'play' || !run) return;
    sound.open();
    toggleLeftLight(run);
    flushEvents(run);
    hud.paint(run);
  },
  rightDoor: () => {
    if (stage !== 'play' || !run) return;
    sound.open();
    toggleRightDoor(run);
    flushEvents(run);
    hud.paint(run);
  },
  rightLight: () => {
    if (stage !== 'play' || !run) return;
    sound.open();
    toggleRightLight(run);
    flushEvents(run);
    hud.paint(run);
  },
  cam: (camId) => {
    if (stage !== 'play' || !run || !run.monitorOpen) return;
    sound.open();
    if (selectCam(run, camId)) {
      flushEvents(run);
      hud.paint(run);
    }
  },
  mute: () => {
    if (stage !== 'play' || !run) return;
    if (muteCall(run)) {
      sound.stopSpeech();
      flushEvents(run);
      hud.paint(run);
    }
  },
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
}

function showCustomNight() {
  stage = 'custom';
  controls.enable(false);
  hideAllScreens();
  syncCustomValues();
  if (customScreen) customScreen.hidden = false;
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
    stage = 'pause';
    controls.enable(false);
    sound.setActivity('pause');
    hud.showPause(run);
    pauseScreen.hidden = false;
    return true;
  }
  if (stage === 'pause') {
    pauseScreen.hidden = true;
    stage = 'play';
    lastTs = 0;
    lag = 0;
    controls.enable(true);
    sound.setActivity('play');
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
get('btn-new-game')?.addEventListener('click', () => {
  resetProgress();
  startNight(1);
});
get('btn-continue')?.addEventListener('click', () => {
  const { night } = loadProgress();
  startNight(Math.min(5, night));
});
get('btn-night6')?.addEventListener('click', () => startNight(6));
get('btn-custom')?.addEventListener('click', () => {
  sound.open();
  showCustomNight();
});
get('custom-back')?.addEventListener('click', showTitle);
get('custom-start')?.addEventListener('click', () => startNight(7, customAi));
get('title-audio')?.addEventListener('click', toggleAudio);
get('pause-audio')?.addEventListener('click', toggleAudio);

get('btn-pause')?.addEventListener('click', () => {
  togglePause();
  get('btn-pause')?.blur();
});
get('pause-resume')?.addEventListener('click', togglePause);
get('pause-menu')?.addEventListener('click', showTitle);

get('btn-mute-call')?.addEventListener('click', () => {
  if (run && muteCall(run)) {
    sound.stopSpeech();
    flushEvents(run);
    hud.paint(run);
  }
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

// Office tactile button bindings (instant pointerdown for zero mobile latency!)
function bindInstant(id, fn) {
  const el = get(id);
  if (!el) return;
  let lastPtr = 0;
  el.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (event.pointerType !== 'mouse') controls.noteTouch();
    lastPtr = performance.now();
    event.preventDefault();
    fn();
  });
  el.addEventListener('click', () => {
    if (performance.now() - lastPtr < 500) return;
    fn();
    el.blur?.();
  });
}

bindInstant('btn-left-door', () => {
  if (stage !== 'play' || !run) return;
  sound.open();
  toggleLeftDoor(run);
  flushEvents(run);
  hud.paint(run);
});
bindInstant('btn-left-light', () => {
  if (stage !== 'play' || !run) return;
  sound.open();
  toggleLeftLight(run);
  flushEvents(run);
  hud.paint(run);
});
bindInstant('btn-right-door', () => {
  if (stage !== 'play' || !run) return;
  sound.open();
  toggleRightDoor(run);
  flushEvents(run);
  hud.paint(run);
});
bindInstant('btn-right-light', () => {
  if (stage !== 'play' || !run) return;
  sound.open();
  toggleRightLight(run);
  flushEvents(run);
  hud.paint(run);
});
bindInstant('btn-monitor', () => {
  if (stage !== 'play' || !run) return;
  sound.open();
  toggleMonitor(run);
  flushEvents(run);
  hud.paint(run);
});

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
