import './style.css';
import { Soundscape } from './audio.js';
import { Controls } from './controls.js';
import {
  CUSTOM_PRESETS,
  loadProgress,
  loadSettings,
  NIGHT_CONFIGS,
  saveProgress,
  saveSettings,
  saveShiftRecord,
  SHIFT_MODIFIERS,
  unlockAchievement,
} from './fnafData.js';
import {
  advance,
  honkPoster,
  muteCall,
  newNight,
  resetCameraFuse,
  ringKitchenBell,
  selectCam,
  sipSpezi,
  squeakDuck,
  stampOrderBon,
  STEP,
  toggleLeftDoor,
  toggleLeftLight,
  toggleMonitor,
  toggleRightDoor,
  toggleRightLight,
  triggerCamFlash,
  triggerSteamBurst,
  ventOfficeSteam,
} from './game.js';
import { get, Hud, write } from './hud.js';

const canvas = get('stage');
const titleScreen = get('title-screen');
const customScreen = get('custom-screen');
const dossierScreen = get('dossier-screen');
const achievementsScreen = get('achievements-screen');
const settingsScreen = get('settings-screen');
const introScreen = get('intro-screen');
const hudScreen = get('hud');
const pauseScreen = get('pause-screen');
const winScreen = get('win-screen');
const gameoverScreen = get('gameover-screen');

const sound = new Soundscape();
let settings = loadSettings();
sound.setVolume(settings.volume);

let view = null;
let run = null;
let stage = 'title'; // 'title' | 'custom' | 'dossier' | 'achievements' | 'settings' | 'intro' | 'play' | 'pause' | 'win' | 'gameover'
let modalReturnStage = 'title';
let introTimer = null;
let pausedFocus = null;
let lastTs = 0;
let lag = 0;
let lastHapticAt = 0;

const customAi = { torge: 5, anton: 5, tom: 5, hauke: 5 };
const selectedModifiers = new Set();

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
    if (ev.kind === 'achievement') {
      if (unlockAchievement(ev.id)) {
        sound.play(ev);
        hud.showAchievementToast(ev.id);
        hud.syncTitleProgress();
      }
      continue;
    }
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
  vent: playAction(ventOfficeSteam),
  stampBon: playAction(stampOrderBon),
  camFlash: playAction(triggerCamFlash),
  steamBurst: playAction(triggerSteamBurst),
  mute: playAction((currentRun) => {
    if (muteCall(currentRun)) sound.stopSpeech();
  }),
};

const hud = new Hud(gameActions.cam);
const controls = new Controls(canvas, {
  ...gameActions,
  pause: () => handleEscapeOrPause(),
  honk: () => {
    if (stage !== 'play' || !run) return;
    sound.open();
    if (honkPoster(run)) flushEvents(run);
  },
  canvasTap: (rx, ry) => {
    if (stage !== 'play' || !run || run.monitorOpen || run.powerOutage) return;
    const hit = view?.pickOfficeProp?.(rx, ry);
    if (hit === 'valve') {
      sound.open();
      if (ventOfficeSteam(run)) flushEvents(run);
      hud.paint(run);
      return;
    }
    if (hit === 'printer') {
      sound.open();
      if (stampOrderBon(run)) flushEvents(run);
      hud.paint(run);
      return;
    }
    if (hit === 'poster') {
      sound.open();
      if (honkPoster(run)) flushEvents(run);
      hud.paint(run);
      return;
    }
    if (hit === 'spezi') {
      sound.open();
      if (sipSpezi(run)) flushEvents(run);
      hud.paint(run);
      return;
    }
    if (hit === 'duck') {
      sound.open();
      if (squeakDuck(run)) flushEvents(run);
      hud.paint(run);
      return;
    }
    // Fallback poster bounding region if raycaster unavailable
    const expectedX = 0.53 - run.lookX * 0.24;
    if (Math.abs(rx - expectedX) < 0.14 && ry > 0.16 && ry < 0.58) {
      sound.open();
      if (honkPoster(run)) flushEvents(run);
      hud.paint(run);
    }
  },
});
controls.setMouseSensitivity(settings.mouseSens);

function hideAllScreens() {
  hudScreen.inert = false;
  pausedFocus = null;
  for (const s of [
    titleScreen, customScreen, dossierScreen, achievementsScreen, settingsScreen,
    introScreen, hudScreen, pauseScreen, winScreen, gameoverScreen,
  ]) {
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

function syncSettingsUi() {
  for (const btn of document.querySelectorAll('.seg-btn')) {
    const key = btn.dataset.setting;
    const val = btn.dataset.value;
    btn.setAttribute('aria-pressed', String(settings[key] === val));
  }
  const perfEl = get('engine-perf-label');
  if (perfEl && view?.getPerfSnapshot) {
    const snap = view.getPerfSnapshot();
    write(perfEl, `Aktuell: ~${snap.fps} FPS · ${snap.drawCalls} Draw Calls (Gebatcht)`);
  }
  const volInput = get('set-volume');
  if (volInput) volInput.value = String(Math.round(settings.volume * 100));
  write(get('set-volume-label'), `${Math.round(settings.volume * 100)} %`);

  const sensInput = get('set-sens');
  if (sensInput) sensInput.value = String(Math.round(settings.mouseSens * 100));
  write(get('set-sens-label'), `${Math.round(settings.mouseSens * 100)} %`);

  const rmBtn = get('set-reduced-motion');
  if (rmBtn) {
    rmBtn.setAttribute('aria-pressed', String(settings.reducedMotion));
    write(rmBtn, settings.reducedMotion ? 'AN' : 'AUS');
  }
}

function applyAllSettings(patch = {}) {
  settings = saveSettings(patch);
  sound.setVolume(settings.volume);
  controls.setMouseSensitivity(settings.mouseSens);
  view?.applySettings(settings);
  syncSettingsUi();
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
  modalReturnStage = 'title';
  controls.enable(false);
  sound.setActivity('title');
  hideAllScreens();
  hud.syncTitleProgress();
  if (titleScreen) titleScreen.hidden = false;
  titleScreen.querySelector('.title-menu button:not([hidden])')?.focus();
}

function returnFromSubModal() {
  if (modalReturnStage === 'pause' && run) {
    stage = 'pause';
    dossierScreen.hidden = true;
    settingsScreen.hidden = true;
    achievementsScreen.hidden = true;
    hudScreen.hidden = false;
    hudScreen.inert = true;
    pauseScreen.hidden = false;
    get('pause-resume')?.focus();
    return;
  }
  showTitle();
}

function showCustomNight() {
  sound.open();
  stage = 'custom';
  modalReturnStage = 'title';
  controls.enable(false);
  hideAllScreens();
  syncCustomValues();
  if (customScreen) customScreen.hidden = false;
  get('custom-back').focus();
}

function showDossier(fromStage = 'title') {
  sound.open();
  modalReturnStage = fromStage;
  stage = 'dossier';
  controls.enable(false);
  if (fromStage === 'pause') {
    pauseScreen.hidden = true;
  } else {
    hideAllScreens();
  }
  dossierScreen.hidden = false;
  get('dossier-back')?.focus();
}

function showAchievements() {
  sound.open();
  modalReturnStage = 'title';
  stage = 'achievements';
  controls.enable(false);
  hideAllScreens();
  hud.renderAchievements();
  achievementsScreen.hidden = false;
  get('ach-back')?.focus();
}

function showSettings(fromStage = 'title') {
  sound.open();
  modalReturnStage = fromStage;
  stage = 'settings';
  controls.enable(false);
  syncSettingsUi();
  if (fromStage === 'pause') {
    pauseScreen.hidden = true;
  } else {
    hideAllScreens();
  }
  settingsScreen.hidden = false;
  get('settings-back')?.focus();
}

function syncCustomValues() {
  let total = 0;
  for (const k of ['torge', 'anton', 'tom', 'hauke']) {
    total += customAi[k];
    write(get(`ai-${k}`), String(customAi[k]));
  }
  const tier = total >= 70 ? 'ALPTRAUM' : total >= 45 ? 'EXTREM' : total >= 25 ? 'SCHWER' : total > 0 ? 'MODERAT' : 'RUHIG';
  write(get('custom-danger-label'), `Gefahrenstufe: ${total} / 80 (${tier})`);
  const fill = get('custom-danger-fill');
  if (fill) fill.style.width = `${Math.round((total / 80) * 100)}%`;

  let bonusPct = 0;
  for (const btn of document.querySelectorAll('.mod-chip')) {
    const id = btn.dataset.mod;
    const active = selectedModifiers.has(id);
    btn.setAttribute('aria-pressed', String(active));
    if (active) {
      const m = SHIFT_MODIFIERS.find((item) => item.id === id);
      bonusPct += m?.bonusPct ?? 0;
    }
  }
  write(get('custom-bonus-label'), `Bonus: +${bonusPct} % Wertung`);
}

async function ensureView() {
  if (view) return view;
  const { SceneView } = await import('./scene.js');
  view = new SceneView(canvas, settings);
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
  tryLandscapeLock();
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
    modifiers: night === 7 ? [...selectedModifiers] : [],
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

function handleEscapeOrPause() {
  if (stage === 'dossier' || stage === 'settings' || stage === 'achievements') {
    returnFromSubModal();
    return true;
  }
  if (stage === 'custom') {
    showTitle();
    return true;
  }
  return togglePause();
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
  saveProgress(run.night, run.customAi, run.modifiers);
  const { isNewRecord } = saveShiftRecord(run);
  hud.syncTitleProgress();
  hideAllScreens();
  hud.showWin(run, { isNewRecord });
  const nextBtn = get('win-next');
  if (nextBtn) {
    nextBtn.hidden = run.night >= 6;
    write(nextBtn, `Nacht ${run.night + 1} starten ▶`);
  }
  winScreen.hidden = false;
  (nextBtn && !nextBtn.hidden ? nextBtn : get('win-menu'))?.focus();
}

function showGameOver() {
  stage = 'gameover';
  controls.enable(false);
  sound.syncLoops(null);
  hideAllScreens();
  hud.showGameOver(run);
  gameoverScreen.hidden = false;
  get('gameover-retry')?.focus();
}

// Build Custom Night modifier chips & preset buttons
const modWrap = get('custom-modifiers');
if (modWrap) {
  for (const mod of SHIFT_MODIFIERS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mod-chip';
    btn.dataset.mod = mod.id;
    btn.setAttribute('aria-pressed', 'false');
    btn.title = mod.desc;
    btn.innerHTML = `<b>${mod.name}</b><small>${mod.short} · +${mod.bonusPct}%</small>`;
    btn.addEventListener('click', () => {
      if (selectedModifiers.has(mod.id)) selectedModifiers.delete(mod.id);
      else selectedModifiers.add(mod.id);
      syncCustomValues();
      sound.open();
      sound.play({ kind: 'cam_blip' });
    });
    modWrap.appendChild(btn);
  }
}

const presetWrap = get('custom-presets');
if (presetWrap) {
  for (const preset of CUSTOM_PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-crt small';
    btn.textContent = preset.name;
    btn.addEventListener('click', () => {
      Object.assign(customAi, preset.ai);
      selectedModifiers.clear();
      for (const m of (preset.modifiers || [])) selectedModifiers.add(m);
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
    btn.addEventListener('click', (event) => {
      const mult = event.shiftKey ? 5 : 1;
      const delta = (Number(btn.dataset.step) || 0) * mult;
      customAi[charKey] = Math.max(0, Math.min(20, (customAi[charKey] || 0) + delta));
      syncCustomValues();
      sound.open();
      sound.play({ kind: 'cam_blip' });
    });
  }
}

get('custom-random')?.addEventListener('click', () => {
  for (const k of ['torge', 'anton', 'tom', 'hauke']) {
    customAi[k] = Math.floor(Math.random() * 21);
  }
  syncCustomValues();
  sound.open();
  sound.play({ kind: 'cam_blip' });
});

// Settings controls bindings
for (const btn of document.querySelectorAll('.seg-btn')) {
  btn.addEventListener('click', () => {
    const key = btn.dataset.setting;
    const val = btn.dataset.value;
    applyAllSettings({ [key]: val });
    sound.open();
    sound.play({ kind: 'cam_blip' });
  });
}

get('set-volume')?.addEventListener('input', (event) => {
  applyAllSettings({ volume: Number(event.target.value) / 100 });
});

get('set-sens')?.addEventListener('input', (event) => {
  applyAllSettings({ mouseSens: Number(event.target.value) / 100 });
});

get('set-reduced-motion')?.addEventListener('click', () => {
  applyAllSettings({ reducedMotion: !settings.reducedMotion });
  sound.open();
  sound.play({ kind: 'cam_blip' });
});

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
get('btn-dossier')?.addEventListener('click', () => showDossier('title'));
get('btn-achievements')?.addEventListener('click', showAchievements);
get('btn-settings')?.addEventListener('click', () => showSettings('title'));

get('custom-back')?.addEventListener('click', showTitle);
get('custom-start')?.addEventListener('click', () => startNight(7, customAi));
get('dossier-back')?.addEventListener('click', returnFromSubModal);
get('ach-back')?.addEventListener('click', returnFromSubModal);
get('settings-back')?.addEventListener('click', returnFromSubModal);

get('title-audio')?.addEventListener('click', toggleAudio);
get('pause-audio')?.addEventListener('click', toggleAudio);

get('btn-pause')?.addEventListener('click', togglePause);
get('pause-resume')?.addEventListener('click', togglePause);
get('pause-dossier')?.addEventListener('click', () => showDossier('pause'));
get('pause-settings')?.addEventListener('click', () => showSettings('pause'));
get('pause-menu')?.addEventListener('click', showTitle);

get('btn-mute-call')?.addEventListener('click', (event) => {
  gameActions.mute();
  if (event.detail > 0) event.currentTarget.blur();
});

// Start eerie Title Screen horror drone on first user gesture
for (const ev of ['pointerdown', 'keydown']) {
  window.addEventListener(ev, () => {
    if (stage === 'title' || stage === 'custom' || stage === 'dossier' || stage === 'achievements' || stage === 'settings') {
      sound.open();
    }
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
  ['btn-vent-steam', gameActions.vent],
  ['btn-stamp-bon', gameActions.stampBon],
  ['btn-ir-flash', gameActions.camFlash],
  ['btn-steam-burst', gameActions.steamBurst],
  ['btn-monitor', gameActions.monitor],
  ['btn-fuse', gameActions.fuse],
  ['btn-kitchen-bell', gameActions.bell],
]) {
  const btn = get(id);
  if (!btn) continue;
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

function isPortraitBlocked() {
  return window.innerHeight > window.innerWidth;
}

function tryLandscapeLock() {
  try {
    screen.orientation?.lock?.('landscape')?.catch?.(() => {});
  } catch {
    // ignore unsupported orientation lock
  }
}

// Resize & background tab pause
function handleResize() {
  if (isPortraitBlocked()) {
    controls.enable(false);
    sound.syncLoops(null);
  } else if (stage === 'play' && run?.state === 'playing') {
    controls.enable(true);
    lastTs = 0;
    lag = 0;
  }
  if (!view) return;
  view.resize();
  if (['title', 'custom', 'dossier', 'achievements', 'settings'].includes(stage)) {
    view.drawTitle(performance.now() / 1000);
  } else if (run && stage !== 'play') {
    view.draw(run);
  }
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
syncSettingsUi();

// Main 60 FPS fixed-step render loop
function tick(now) {
  requestAnimationFrame(tick);
  if (isPortraitBlocked()) {
    lastTs = 0;
    lag = 0;
    return;
  }
  if (['title', 'custom', 'dossier', 'achievements', 'settings'].includes(stage)) {
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
    get: () => ({
      run, view, stage, hud, controls, startNight,
      showDossier, showAchievements, showSettings, showCustomNight,
      gameActions, applyAllSettings,
    }),
  });
}
