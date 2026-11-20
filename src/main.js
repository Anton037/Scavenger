import './style.css';
import { Soundscape } from './audio.js';
import { Controls } from './controls.js';
import {
  CHARACTERS,
  CUSTOM_PRESETS,
  loadCompletedPresets,
  loadCosmeticState,
  loadProgress,
  loadSettings,
  markTapeAttempted,
  markTapeCompleted,
  NIGHT_CONFIGS,
  saveProgress,
  saveSettings,
  saveShiftRecord,
  SHIFT_MODIFIERS,
  unlockAchievement,
  VHS_TAPE_MAP,
} from './fnafData.js';
import {
  advance,
  honkPoster,
  interactPrepStation,
  muteCall,
  newNight,
  resetBreaker,
  selectCam,
  setFlashlight,
  setHoldingBreath,
  setUnderDesk,
  STEP,
  toggleFlashlight,
  toggleLeftDoor,
  toggleLeftLight,
  toggleMonitor,
  toggleRightDoor,
  toggleRightLight,
  toggleUnderDesk,
  triggerCamCounter,
  turnAround,
  ventOfficeSteam,
} from './game.js';
import { get, Hud, write } from './hud.js';
import {
  advanceMinigame,
  createMinigame,
  flashCorridor,
  playSalvageCassette,
  selectFreezerRelay,
  setClipboardDown,
  setFreezerHoldBreath,
  setFreezerRepairing,
  toggleFreezerLight,
  triggerSalvageTaser,
} from './minigames/vhsMinigames.js';
import { loadAssetOverrides } from './render/overrides.js';

// Load optional user drop-in face/audio overrides once at boot (silent when empty)
loadAssetOverrides();

const canvas = get('stage');
const titleScreen = get('title-screen');
const kioskScreen = get('kiosk-screen');
const extrasScreen = get('extras-screen');
const vhsScreen = get('vhs-screen');
const customScreen = get('custom-screen');
const dossierScreen = get('dossier-screen');
const achievementsScreen = get('achievements-screen');
const settingsScreen = get('settings-screen');
const introScreen = get('intro-screen');
const hudScreen = get('hud');
const pauseScreen = get('pause-screen');
const winScreen = get('win-screen');
const gameoverScreen = get('gameover-screen');

const DIALOG_SCREENS = [
  kioskScreen,
  customScreen,
  dossierScreen,
  achievementsScreen,
  settingsScreen,
  pauseScreen,
];

const SECTION_SCREENS = [
  titleScreen,
  extrasScreen,
  vhsScreen,
  introScreen,
  hudScreen,
  winScreen,
  gameoverScreen,
];

const sound = new Soundscape();
let settings = loadSettings();
sound.setVolume(settings.volume);

let view = null;
let run = null;
let minigame = null;
let vhsNextNight = null;
let vhsReturnStage = 'title';
let vhsResultShown = false;

let stage = 'title';
// 'title' | 'kiosk' | 'extras' | 'vhs' | 'custom' | 'dossier' | 'achievements' | 'settings' | 'intro' | 'play' | 'pause' | 'win' | 'gameover'
let modalReturnStage = 'title';
let introTimer = null;
let pausedFocus = null;
let lastTs = 0;
let lag = 0;
let lastHapticAt = 0;

const customAi = { torge: 5, anton: 5, tom: 5, hauke: 5, duck: 3 };
const selectedModifiers = new Set();
let activePresetId = null;

// Interactive 3D Archive Turntable State
const archiveViewer = {
  tab: 'models', // 'models' | 'tapes'
  charId: 'torge',
  pose: 'neutral',
  flashlight: false,
  yaw: -0.25,
  autoSpin: true,
  scareTimer: 0,
  dragging: false,
  dragLastX: 0,
};

function openDialog(dlg) {
  if (!dlg) return;
  if (typeof dlg.showModal === 'function') {
    if (!dlg.open) dlg.showModal();
  } else {
    dlg.setAttribute('open', '');
  }
}

function closeDialog(dlg) {
  if (!dlg) return;
  if (typeof dlg.close === 'function') {
    if (dlg.open) dlg.close();
  } else {
    dlg.removeAttribute('open');
  }
}

function closeAllDialogs() {
  for (const dlg of DIALOG_SCREENS) closeDialog(dlg);
}

function hideAllScreens() {
  if (hudScreen) hudScreen.inert = false;
  if (titleScreen) titleScreen.inert = false;
  pausedFocus = null;
  closeAllDialogs();
  for (const s of SECTION_SCREENS) {
    if (s) s.hidden = true;
  }
  const hal = get('hallucination');
  if (hal) hal.hidden = true;
}

function pulseHaptic(event) {
  if (!controls.touch || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  const now = performance.now();
  const urgent = event.kind === 'jumpscare'
    || event.kind === 'hauke_door_slam'
    || event.kind === 'breaker_trip'
    || event.kind === 'office_breach'
    || event.kind === 'window_sting'
    || event.kind === 'anton_video_warning'
    || event.kind === 'hauke_charge_start';
  if (!urgent && now - lastHapticAt < 85) return;
  const pattern = event.kind === 'jumpscare'
    ? [70, 30, 90, 30, 120]
    : event.kind === 'hauke_door_slam' || event.kind === 'breaker_trip'
      ? [65, 25, 85, 25, 65]
      : event.kind === 'office_breach' || event.kind === 'sneak_in'
        ? [45, 45, 60]
        : event.kind === 'anton_video_warning'
          ? [40, 60, 40]
          : event.kind === 'hauke_charge_start'
            ? [30, 25, 30]
            : event.kind === 'window_sting'
              ? [36, 20, 48]
              : event.kind === 'hatch_clink' || event.kind === 'duck_rustle'
                ? 26
                : event.kind === 'hauke_stomp'
                  ? 34
                  : event.kind === 'door' || event.kind === 'whip_turn'
                    ? 18
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
  sound.viewState = currentRun.viewState || 'front';
  sound.lookSmooth = currentRun.monitorOpen ? 0 : (currentRun.lookSmooth ?? currentRun.lookX ?? 0);
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

function flushMinigameEvents(mg) {
  if (!mg?.events?.length) return;
  sound.viewState = 'front';
  sound.lookSmooth = 0;
  for (const ev of mg.events) {
    sound.play(ev);
    pulseHaptic(ev);
  }
  mg.events.length = 0;
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
  turnAround: playAction(turnAround),
  underDesk: (val) => {
    if (stage !== 'play' || run?.state !== 'playing') return;
    sound.open();
    if (typeof val === 'boolean') setUnderDesk(run, val);
    else toggleUnderDesk(run);
    flushEvents(run);
    hud.paint(run);
  },
  holdBreath: (active) => {
    if (stage !== 'play' || run?.state !== 'playing') return;
    sound.open();
    setHoldingBreath(run, active);
    flushEvents(run);
    hud.paint(run);
  },
  flashlight: playAction(toggleFlashlight),
  setFlashlight: playAction(setFlashlight),
  resetBreaker: playAction(resetBreaker),
  prepInteract: (station = 'auto') => {
    if (stage !== 'play' || run?.state !== 'playing') return;
    sound.open();
    interactPrepStation(run, station, 0.28);
    flushEvents(run);
    hud.paint(run);
  },
  leftDoor: playAction(toggleLeftDoor),
  leftLight: playAction(toggleLeftLight),
  rightDoor: playAction(toggleRightDoor),
  rightLight: playAction(toggleRightLight),
  cam: playAction(selectCam),
  camCounter: playAction(triggerCamCounter),
  vent: playAction(ventOfficeSteam),
  mute: playAction((currentRun) => {
    if (muteCall(currentRun)) sound.stopSpeech();
  }),
};

const hud = new Hud(gameActions.cam);
hud.setAudioSubtitles(settings.audioSubtitles);

function applyLookArrowsSetting() {
  document.body?.classList?.toggle('look-arrows-on', Boolean(settings.lookArrows));
}
applyLookArrowsSetting();

const controls = new Controls(canvas, {
  ...gameActions,
  isUnderDesk: () => run?.viewState === 'under_desk',
  isBackView: () => run?.viewState === 'back',
  pause: () => handleEscapeOrPause(),
  honk: () => {
    if (stage !== 'play' || !run) return;
    sound.open();
    if (honkPoster(run)) flushEvents(run);
  },
  canvasPointerDown: (rx, ry) => {
    if (stage !== 'play' || !run || run.monitorOpen || run.powerOutage || run.viewState !== 'back') return;
    const hit = view?.pickOfficeProp?.(rx, ry);
    if (hit === 'prep_doner') {
      controls.setPrepHold('doner');
      sound.open();
      interactPrepStation(run, 'doner', 0.14);
      flushEvents(run);
      hud.paint(run);
    } else if (hit === 'prep_bag') {
      controls.setPrepHold('bag');
      sound.open();
      interactPrepStation(run, 'bag', 0.14);
      flushEvents(run);
      hud.paint(run);
    }
  },
  canvasPointerUp: () => {
    controls.setPrepHold(null);
  },
  canvasTap: (rx, ry) => {
    if (stage !== 'play' || !run || run.monitorOpen || run.powerOutage) return;
    const hit = view?.pickOfficeProp?.(rx, ry);
    if (hit === 'left_door_btn') {
      gameActions.leftDoor();
      return;
    }
    if (hit === 'left_light_btn') {
      gameActions.leftLight();
      return;
    }
    if (hit === 'right_door_btn') {
      gameActions.rightDoor();
      return;
    }
    if (hit === 'right_light_btn') {
      gameActions.rightLight();
      return;
    }
    if (hit === 'prep_doner') {
      gameActions.prepInteract('doner');
      return;
    }
    if (hit === 'prep_fryer') {
      gameActions.prepInteract('fryer');
      return;
    }
    if (hit === 'prep_bag') {
      gameActions.prepInteract('bag');
      return;
    }
    if (hit === 'breaker_box') {
      gameActions.resetBreaker();
      return;
    }
    if (hit === 'exhaust_valve') {
      gameActions.vent();
      return;
    }
    if (hit === 'back_hatch') {
      gameActions.flashlight();
      return;
    }
    if (hit === 'poster') {
      sound.open();
      if (honkPoster(run)) flushEvents(run);
      hud.paint(run);
    }
  },
});
controls.setMouseSensitivity(settings.mouseSens);

// Fullscreen & landscape lock for touch devices: hides browser chrome and disables
// accidental system gestures during a shift. Desktop never gets forced fullscreen.
let autoFullscreenEntered = false;
function enterGameFullscreen() {
  if (!controls.touch || typeof document === 'undefined') return;
  const el = document.documentElement;
  if (document.fullscreenElement || typeof el.requestFullscreen !== 'function') {
    tryLandscapeLock();
    return;
  }
  el.requestFullscreen({ navigationUI: 'hide' })
    .then(() => {
      autoFullscreenEntered = true;
      tryLandscapeLock();
    })
    .catch(() => tryLandscapeLock());
}
function exitAutoFullscreen() {
  if (!autoFullscreenEntered || typeof document === 'undefined') return;
  autoFullscreenEntered = false;
  if (document.fullscreenElement) document.exitFullscreen?.().catch?.(() => {});
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

  const subBtn = get('set-audio-subs');
  if (subBtn) {
    subBtn.setAttribute('aria-pressed', String(Boolean(settings.audioSubtitles)));
    write(subBtn, settings.audioSubtitles ? 'AN' : 'AUS');
  }

  const arrowsBtn = get('set-look-arrows');
  if (arrowsBtn) {
    arrowsBtn.setAttribute('aria-pressed', String(Boolean(settings.lookArrows)));
    write(arrowsBtn, settings.lookArrows ? 'AN' : 'AUS');
  }
}

function applyAllSettings(patch = {}) {
  settings = saveSettings(patch);
  sound.setVolume(settings.volume);
  controls.setMouseSensitivity(settings.mouseSens);
  hud.setAudioSubtitles(settings.audioSubtitles);
  applyLookArrowsSetting();
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
  exitAutoFullscreen();
  minigame = null;
  stage = 'title';
  modalReturnStage = 'title';
  controls.enable(false);
  sound.reset();
  sound.setActivity('title');
  hideAllScreens();
  hud.syncTitleProgress();
  if (titleScreen) titleScreen.hidden = false;
  titleScreen?.querySelector('.title-menu button:not([hidden])')?.focus();
}

function returnFromSubModal() {
  closeAllDialogs();
  if (modalReturnStage === 'pause' && run) {
    stage = 'pause';
    if (hudScreen) {
      hudScreen.hidden = false;
      hudScreen.inert = true;
    }
    openDialog(pauseScreen);
    get('pause-resume')?.focus();
    return;
  }
  showTitle();
}

function showKiosk() {
  sound.open();
  stage = 'kiosk';
  modalReturnStage = 'title';
  controls.enable(false);
  closeAllDialogs();
  if (titleScreen) titleScreen.hidden = false;
  hud.renderKiosk((cosmetics) => {
    view?.applyCosmetics(cosmetics);
    sound.play({ kind: 'cam_blip' });
  });
  openDialog(kioskScreen);
  get('kiosk-back')?.focus();
}

function syncArchiveUi() {
  const isModels = archiveViewer.tab === 'models';
  get('tab-models')?.setAttribute('aria-selected', String(isModels));
  get('tab-tapes')?.setAttribute('aria-selected', String(!isModels));
  const modelsPane = get('extras-models-pane');
  const tapesPane = get('extras-tapes-pane');
  if (modelsPane) modelsPane.hidden = !isModels;
  if (tapesPane) tapesPane.hidden = isModels;

  for (const btn of document.querySelectorAll('.archive-char-btn')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.char === archiveViewer.charId));
  }
  const c = CHARACTERS[archiveViewer.charId] ?? CHARACTERS.torge;
  write(get('archive-char-name'), c.name);
  write(get('archive-char-role'), c.role);
  write(get('archive-char-lore'), c.lore);

  for (const btn of document.querySelectorAll('.pose-btn')) {
    const p = btn.dataset.pose;
    const mapped = archiveViewer.charId === 'duck' && p === 'crate_crouch' ? 'slumped_suit' : p;
    btn.setAttribute('aria-pressed', String(archiveViewer.pose === mapped));
  }
  get('btn-archive-flash')?.setAttribute('aria-pressed', String(archiveViewer.flashlight));
}

async function showExtras(initialTab = 'models') {
  sound.open();
  try {
    await ensureView();
  } catch {
    // ignore WebGL error
  }
  archiveViewer.tab = initialTab;
  archiveViewer.scareTimer = 0;
  stage = 'extras';
  controls.enable(false);
  sound.setActivity('title');
  hideAllScreens();
  hud.renderArchiveTapes((tapeId) => startVhsMinigame(tapeId, { returnStage: 'extras' }));
  syncArchiveUi();
  if (extrasScreen) extrasScreen.hidden = false;
  get('extras-back')?.focus();
}

function showCustomNight() {
  sound.open();
  stage = 'custom';
  modalReturnStage = 'title';
  controls.enable(false);
  closeAllDialogs();
  if (titleScreen) titleScreen.hidden = false;
  renderCustomPresets();
  syncCustomValues();
  openDialog(customScreen);
  get('custom-back')?.focus();
}

function showDossier(fromStage = 'title') {
  sound.open();
  modalReturnStage = fromStage;
  stage = 'dossier';
  controls.enable(false);
  closeAllDialogs();
  if (fromStage !== 'pause' && titleScreen) titleScreen.hidden = false;
  openDialog(dossierScreen);
  get('dossier-back')?.focus();
}

function showAchievements() {
  sound.open();
  modalReturnStage = 'title';
  stage = 'achievements';
  controls.enable(false);
  closeAllDialogs();
  if (titleScreen) titleScreen.hidden = false;
  hud.renderAchievements();
  openDialog(achievementsScreen);
  get('ach-back')?.focus();
}

function showSettings(fromStage = 'title') {
  sound.open();
  modalReturnStage = fromStage;
  stage = 'settings';
  controls.enable(false);
  syncSettingsUi();
  closeAllDialogs();
  if (fromStage !== 'pause' && titleScreen) titleScreen.hidden = false;
  openDialog(settingsScreen);
  get('settings-back')?.focus();
}

function syncCustomValues() {
  let total = 0;
  for (const k of ['torge', 'anton', 'tom', 'hauke', 'duck']) {
    total += customAi[k] || 0;
    write(get(`ai-${k}`), String(customAi[k] || 0));
  }
  const tier = total >= 85 ? 'ALPTRAUM' : total >= 55 ? 'EXTREM' : total >= 30 ? 'SCHWER' : total > 0 ? 'MODERAT' : 'RUHIG';
  write(get('custom-danger-label'), `Gefahrenstufe: ${total} / 100 (${tier})`);
  const fill = get('custom-danger-fill');
  if (fill) fill.style.width = `${Math.round((total / 100) * 100)}%`;

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
  for (const btn of document.querySelectorAll('.preset-btn')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.preset === activePresetId));
  }
  write(get('custom-bonus-label'), `Bonus: +${bonusPct} % Wertung`);
}

function renderCustomPresets() {
  const presetWrap = get('custom-presets');
  if (!presetWrap) return;
  const completed = new Set(loadCompletedPresets());
  presetWrap.innerHTML = '';
  for (const preset of CUSTOM_PRESETS) {
    const isDone = completed.has(preset.id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn-crt small preset-btn${isDone ? ' cleared' : ''}`;
    btn.dataset.preset = preset.id;
    btn.setAttribute('aria-pressed', String(activePresetId === preset.id));
    btn.textContent = isDone ? `${preset.name} ✓` : preset.name;
    btn.addEventListener('click', () => {
      Object.assign(customAi, { duck: 0 }, preset.ai);
      selectedModifiers.clear();
      for (const m of (preset.modifiers || [])) selectedModifiers.add(m);
      activePresetId = preset.id;
      syncCustomValues();
      sound.open();
      sound.play({ kind: 'cam_blip' });
    });
    presetWrap.appendChild(btn);
  }
}

async function ensureView() {
  if (view) return view;
  const { SceneView } = await import('./scene.js');
  view = new SceneView(canvas, settings);
  view.applyCosmetics(loadCosmeticState());
  view.resize();
  return view;
}

ensureView().catch((err) => {
  console.warn('Warnung bei der 3D-Szenen-Initialisierung:', err.message);
  const el = get('launch-error');
  if (el) {
    write(el, 'WebGL 2 konnte nicht initialisiert werden.');
    el.hidden = false;
  }
});

async function startNight(night, customOverride = null, presetId = null) {
  if (introTimer) {
    clearTimeout(introTimer);
    introTimer = null;
  }
  enterGameFullscreen();
  sound.open();
  sound.reset();
  try {
    await ensureView();
  } catch {
    return;
  }
  view.applyCosmetics(loadCosmeticState());

  run = newNight({
    night,
    presetId: night === 7 ? presetId : null,
    customAi: night === 7 ? { ...(customOverride || customAi) } : null,
    modifiers: night === 7 ? [...selectedModifiers] : [],
  });

  // Immediate 1-9-8-7 Easter Egg skips intro straight into Duck Suit Jumpscare!
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
  }, 1850);
}

// ==================== PLAYABLE 3D VHS POST-SHIFT MINIGAMES ====================
async function startVhsMinigame(tapeId, { nextNight = null, returnStage = 'title' } = {}) {
  enterGameFullscreen();
  sound.open();
  sound.reset();
  try {
    await ensureView();
  } catch {
    if (nextNight) startNight(nextNight);
    else showTitle();
    return;
  }

  vhsNextNight = nextNight;
  vhsReturnStage = returnStage;
  vhsResultShown = false;
  markTapeAttempted(tapeId);
  minigame = createMinigame(tapeId);
  stage = 'vhs';
  controls.enable(false);
  sound.setActivity('play');
  hideAllScreens();
  if (get('vhs-result')) get('vhs-result').hidden = true;
  if (get('vhs-skip')) get('vhs-skip').hidden = false;
  if (vhsScreen) vhsScreen.hidden = false;
  lastTs = 0;
  lag = 0;
  hud.paintMinigame(minigame);
  view.drawMinigame(minigame, performance.now() / 1000);
}

function exitVhsMinigame() {
  const pendingNight = vhsNextNight;
  const backTo = vhsReturnStage;
  minigame = null;
  vhsNextNight = null;
  if (pendingNight) {
    startNight(pendingNight);
  } else if (backTo === 'extras') {
    showExtras('tapes');
  } else {
    showTitle();
  }
}

function handleEscapeOrPause() {
  if (stage === 'dossier' || stage === 'settings' || stage === 'achievements' || stage === 'kiosk') {
    returnFromSubModal();
    return true;
  }
  if (stage === 'custom' || stage === 'extras') {
    showTitle();
    return true;
  }
  if (stage === 'vhs') {
    exitVhsMinigame();
    return true;
  }
  return togglePause();
}

function togglePause() {
  if (stage === 'play' && run && run.state === 'playing') {
    pausedFocus = hudScreen?.contains(document.activeElement) ? document.activeElement : get('btn-pause');
    stage = 'pause';
    controls.enable(false);
    sound.setActivity('pause');
    hud.showPause(run);
    if (hudScreen) hudScreen.inert = true;
    openDialog(pauseScreen);
    get('pause-resume')?.focus();
    return true;
  }
  if (stage === 'pause') {
    closeDialog(pauseScreen);
    if (hudScreen) hudScreen.inert = false;
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
  const { isNewRecord, shiftTips } = saveShiftRecord(run);
  hud.syncTitleProgress();
  hideAllScreens();
  hud.showWin(run, { isNewRecord, shiftTips });

  const nextBtn = get('win-next');
  if (nextBtn) {
    nextBtn.hidden = run.night >= 6;
    const hasPostTape = run.night >= 1 && run.night <= 3;
    write(
      nextBtn,
      hasPostTape
        ? `VHS-Band 0${run.night} & Nacht ${run.night + 1} ▶`
        : `Nacht ${run.night + 1} starten ▶`,
    );
  }
  if (winScreen) winScreen.hidden = false;
  (nextBtn && !nextBtn.hidden ? nextBtn : get('win-menu'))?.focus();
}

function showGameOver() {
  stage = 'gameover';
  controls.enable(false);
  sound.syncLoops(null);
  hideAllScreens();
  hud.showGameOver(run);
  if (gameoverScreen) gameoverScreen.hidden = false;
  get('gameover-retry')?.focus();
}

// Intercept native <dialog> cancel (Esc) and backdrop clicks
for (const dlg of DIALOG_SCREENS) {
  if (!dlg) continue;
  dlg.addEventListener('cancel', (event) => {
    event.preventDefault();
    handleEscapeOrPause();
  });
  dlg.addEventListener('click', (event) => {
    if (event.target === dlg) {
      handleEscapeOrPause();
    }
  });
}

// Build Archive Character Selector & Turntable Drag Controls
const archiveCharWrap = get('extras-char-list');
if (archiveCharWrap) {
  for (const key of ['torge', 'anton', 'tom', 'hauke', 'duck']) {
    const c = CHARACTERS[key];
    if (!c) continue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-crt small archive-char-btn';
    btn.dataset.char = key;
    btn.setAttribute('aria-pressed', String(key === archiveViewer.charId));
    btn.textContent = c.badge;
    btn.addEventListener('click', () => {
      archiveViewer.charId = key;
      archiveViewer.pose = key === 'duck' ? 'slumped_suit' : 'neutral';
      archiveViewer.scareTimer = 0;
      syncArchiveUi();
      sound.open();
      sound.play({ kind: 'cam_blip' });
    });
    archiveCharWrap.appendChild(btn);
  }
}

for (const btn of document.querySelectorAll('.pose-btn')) {
  btn.addEventListener('click', () => {
    const raw = btn.dataset.pose || 'neutral';
    archiveViewer.pose = archiveViewer.charId === 'duck' && raw === 'crate_crouch' ? 'slumped_suit' : raw;
    archiveViewer.scareTimer = 0;
    syncArchiveUi();
    sound.open();
    sound.play({ kind: 'cam_blip' });
  });
}

get('tab-models')?.addEventListener('click', () => {
  archiveViewer.tab = 'models';
  syncArchiveUi();
});
get('tab-tapes')?.addEventListener('click', () => {
  archiveViewer.tab = 'tapes';
  hud.renderArchiveTapes((tapeId) => startVhsMinigame(tapeId, { returnStage: 'extras' }));
  syncArchiveUi();
});
get('btn-archive-flash')?.addEventListener('click', () => {
  archiveViewer.flashlight = !archiveViewer.flashlight;
  syncArchiveUi();
  sound.open();
  sound.play({ kind: 'flashlight_click', on: archiveViewer.flashlight });
});
get('btn-archive-scare')?.addEventListener('click', () => {
  archiveViewer.scareTimer = 0.92;
  sound.open();
  sound.play({ kind: 'jumpscare', who: archiveViewer.charId });
});

canvas?.addEventListener('pointerdown', (event) => {
  if (stage !== 'extras') return;
  archiveViewer.dragging = true;
  archiveViewer.autoSpin = false;
  archiveViewer.dragLastX = event.clientX;
});
window.addEventListener('pointermove', (event) => {
  if (stage !== 'extras' || !archiveViewer.dragging) return;
  const dx = event.clientX - archiveViewer.dragLastX;
  archiveViewer.dragLastX = event.clientX;
  archiveViewer.yaw += dx * 0.012;
});
window.addEventListener('pointerup', () => {
  archiveViewer.dragging = false;
});

// Build Custom Night Modifiers & AI Steppers
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
      activePresetId = null;
      if (selectedModifiers.has(mod.id)) selectedModifiers.delete(mod.id);
      else selectedModifiers.add(mod.id);
      syncCustomValues();
      sound.open();
      sound.play({ kind: 'cam_blip' });
    });
    modWrap.appendChild(btn);
  }
}
renderCustomPresets();

for (const card of document.querySelectorAll('.ai-card')) {
  const charKey = card.dataset.char;
  for (const btn of card.querySelectorAll('.step-btn')) {
    btn.addEventListener('click', (event) => {
      activePresetId = null;
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
  activePresetId = null;
  for (const k of ['torge', 'anton', 'tom', 'hauke', 'duck']) {
    customAi[k] = Math.floor(Math.random() * 21);
  }
  syncCustomValues();
  sound.open();
  sound.play({ kind: 'cam_blip' });
});

// Settings Controls
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
get('set-audio-subs')?.addEventListener('click', () => {
  applyAllSettings({ audioSubtitles: !settings.audioSubtitles });
  sound.open();
  sound.play({ kind: 'cam_blip' });
});
get('set-look-arrows')?.addEventListener('click', () => {
  applyAllSettings({ lookArrows: !settings.lookArrows });
  sound.open();
  sound.play({ kind: 'cam_blip' });
});

// Menu & Modal Navigation
get('btn-new-game')?.addEventListener('click', () => startNight(1));
get('btn-continue')?.addEventListener('click', () => {
  const { night } = loadProgress();
  if (night === 7) showCustomNight();
  else startNight(night);
});
get('btn-night6')?.addEventListener('click', () => startNight(6));
get('btn-custom')?.addEventListener('click', showCustomNight);
get('btn-kiosk')?.addEventListener('click', showKiosk);
get('btn-extras')?.addEventListener('click', () => showExtras('models'));
get('btn-dossier')?.addEventListener('click', () => showDossier('title'));
get('btn-achievements')?.addEventListener('click', showAchievements);
get('btn-settings')?.addEventListener('click', () => showSettings('title'));

get('kiosk-back')?.addEventListener('click', showTitle);
get('extras-back')?.addEventListener('click', showTitle);
get('custom-back')?.addEventListener('click', showTitle);
get('custom-start')?.addEventListener('click', () => startNight(7, customAi, activePresetId));
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

for (const ev of ['pointerdown', 'keydown']) {
  window.addEventListener(ev, () => {
    if (['title', 'kiosk', 'extras', 'custom', 'dossier', 'achievements', 'settings'].includes(stage)) {
      sound.open();
    }
  }, { once: true });
}

get('win-next')?.addEventListener('click', () => {
  if (!run || run.night >= 6) {
    showTitle();
    return;
  }
  if (run.night === 1) {
    startVhsMinigame('tape1', { nextNight: 2, returnStage: 'title' });
  } else if (run.night === 2) {
    startVhsMinigame('tape2', { nextNight: 3, returnStage: 'title' });
  } else if (run.night === 3) {
    startVhsMinigame('tape3', { nextNight: 4, returnStage: 'title' });
  } else {
    startNight(run.night + 1);
  }
});
get('win-menu')?.addEventListener('click', showTitle);

get('gameover-retry')?.addEventListener('click', () => {
  if (run) startNight(run.night, run.customAi, run.presetId);
  else showTitle();
});
get('gameover-menu')?.addEventListener('click', showTitle);

// In-Shift HUD Button Bindings
for (const [id, action] of [
  ['btn-left-door', gameActions.leftDoor],
  ['btn-left-light', gameActions.leftLight],
  ['btn-right-door', gameActions.rightDoor],
  ['btn-right-light', gameActions.rightLight],
  ['btn-flashlight', gameActions.flashlight],
  ['btn-back-flashlight', gameActions.flashlight],
  ['btn-turn-back', gameActions.turnAround],
  ['btn-turn-front', gameActions.turnAround],
  ['btn-under-desk', () => gameActions.underDesk(true)],
  ['btn-stand-up', () => gameActions.underDesk(false)],
  ['btn-reset-breaker', gameActions.resetBreaker],
  ['btn-vent-steam', gameActions.vent],
  ['btn-cam-counter', gameActions.camCounter],
  ['btn-monitor', gameActions.monitor],
  ['btn-breaker-warn', () => {
    if (run?.viewState === 'back') gameActions.resetBreaker();
    else gameActions.turnAround();
  }],
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

// Hold-Interaction Buttons (unified Bon work step, and Under-Desk Hold Breath)
// Pointer capture keeps the hold alive when the finger slides slightly off the button;
// a touch pointerleave only cancels when capture is NOT active (legacy fallback).
function bindHoldPrepBtn(id, station) {
  const btn = get(id);
  if (!btn) return;
  const start = (e) => {
    if (e.pointerType === 'touch') controls.noteTouch();
    e.preventDefault();
    try { btn.setPointerCapture(e.pointerId); } catch { /* legacy: no capture */ }
    controls.setPrepHold(station);
    gameActions.prepInteract(station);
  };
  const stop = () => controls.setPrepHold(null);
  const stopIfReleased = (e) => {
    if (e.pointerType !== 'touch' || !btn.hasPointerCapture?.(e.pointerId)) stop();
  };
  btn.addEventListener('pointerdown', start);
  btn.addEventListener('pointerup', stop);
  btn.addEventListener('pointercancel', stop);
  btn.addEventListener('pointerleave', stopIfReleased);
  btn.addEventListener('click', (e) => {
    if (e.detail === 0) gameActions.prepInteract(station);
  });
}
// 'auto' advances through the current bon step (Döner → Fritteuse → Tüte) exactly like the E key
bindHoldPrepBtn('btn-prep-work', 'auto');

const holdBreathBtn = get('btn-hold-breath');
if (holdBreathBtn) {
  const startBreath = (e) => {
    if (e.pointerType === 'touch') controls.noteTouch();
    e.preventDefault();
    try { holdBreathBtn.setPointerCapture(e.pointerId); } catch { /* legacy: no capture */ }
    gameActions.holdBreath(true);
  };
  const stopBreath = () => gameActions.holdBreath(false);
  const stopBreathIfReleased = (e) => {
    if (e.pointerType !== 'touch' || !holdBreathBtn.hasPointerCapture?.(e.pointerId)) stopBreath();
  };
  holdBreathBtn.addEventListener('pointerdown', startBreath);
  holdBreathBtn.addEventListener('pointerup', stopBreath);
  holdBreathBtn.addEventListener('pointercancel', stopBreath);
  holdBreathBtn.addEventListener('pointerleave', stopBreathIfReleased);
}

// VHS Minigame Controls (Keyboard + Touch Buttons)
get('vhs-skip')?.addEventListener('click', exitVhsMinigame);
get('vhs-result-continue')?.addEventListener('click', exitVhsMinigame);
get('vhs-result-retry')?.addEventListener('click', () => {
  if (minigame) {
    startVhsMinigame(minigame.tapeId, { nextNight: vhsNextNight, returnStage: vhsReturnStage });
  }
});

get('vhs-t1-flash')?.addEventListener('click', () => {
  if (stage === 'vhs' && minigame?.tapeId === 'tape1') {
    sound.open();
    flashCorridor(minigame);
    flushMinigameEvents(minigame);
  }
});
get('vhs-t2-cassette')?.addEventListener('click', () => {
  if (stage === 'vhs' && minigame?.tapeId === 'tape2') {
    sound.open();
    playSalvageCassette(minigame);
    flushMinigameEvents(minigame);
  }
});
get('vhs-t2-taser')?.addEventListener('click', () => {
  if (stage === 'vhs' && minigame?.tapeId === 'tape2') {
    sound.open();
    triggerSalvageTaser(minigame);
    flushMinigameEvents(minigame);
  }
});

const clipBtn = get('vhs-t2-clipboard');
if (clipBtn) {
  const down = (e) => { e.preventDefault(); if (stage === 'vhs') { setClipboardDown(minigame, true); flushMinigameEvents(minigame); } };
  const up = () => { if (stage === 'vhs') { setClipboardDown(minigame, false); flushMinigameEvents(minigame); } };
  clipBtn.addEventListener('pointerdown', down);
  clipBtn.addEventListener('pointerup', up);
  clipBtn.addEventListener('pointercancel', up);
  clipBtn.addEventListener('pointerleave', up);
}

get('vhs-t3-prev')?.addEventListener('click', () => {
  if (stage === 'vhs' && minigame?.tapeId === 'tape3') {
    selectFreezerRelay(minigame, minigame.selectedRelay - 1);
    flushMinigameEvents(minigame);
  }
});
get('vhs-t3-next')?.addEventListener('click', () => {
  if (stage === 'vhs' && minigame?.tapeId === 'tape3') {
    selectFreezerRelay(minigame, minigame.selectedRelay + 1);
    flushMinigameEvents(minigame);
  }
});
get('vhs-t3-light')?.addEventListener('click', () => {
  if (stage === 'vhs' && minigame?.tapeId === 'tape3') {
    toggleFreezerLight(minigame);
    flushMinigameEvents(minigame);
  }
});

const repairBtn = get('vhs-t3-repair');
if (repairBtn) {
  const start = (e) => { e.preventDefault(); if (stage === 'vhs') setFreezerRepairing(minigame, true); };
  const stop = () => { if (stage === 'vhs') setFreezerRepairing(minigame, false); };
  repairBtn.addEventListener('pointerdown', start);
  repairBtn.addEventListener('pointerup', stop);
  repairBtn.addEventListener('pointercancel', stop);
  repairBtn.addEventListener('pointerleave', stop);
}

const vhsBreathBtn = get('vhs-t3-breath');
if (vhsBreathBtn) {
  const start = (e) => { e.preventDefault(); if (stage === 'vhs') setFreezerHoldBreath(minigame, true); };
  const stop = () => { if (stage === 'vhs') setFreezerHoldBreath(minigame, false); };
  vhsBreathBtn.addEventListener('pointerdown', start);
  vhsBreathBtn.addEventListener('pointerup', stop);
  vhsBreathBtn.addEventListener('pointercancel', stop);
  vhsBreathBtn.addEventListener('pointerleave', stop);
}

window.addEventListener('keydown', (event) => {
  if (stage !== 'vhs' || !minigame || minigame.state !== 'playing') return;
  if (event.repeat) return;
  sound.open();

  if (minigame.tapeId === 'tape1') {
    if (event.code === 'KeyF' || event.code === 'Space') {
      event.preventDefault();
      flashCorridor(minigame);
      flushMinigameEvents(minigame);
    }
  } else if (minigame.tapeId === 'tape2') {
    if (event.code === 'KeyE') {
      event.preventDefault();
      playSalvageCassette(minigame);
      flushMinigameEvents(minigame);
    } else if (event.code === 'KeyS' || event.code === 'KeyC' || event.code === 'ArrowDown') {
      event.preventDefault();
      setClipboardDown(minigame, true);
      flushMinigameEvents(minigame);
    } else if (event.code === 'KeyF') {
      event.preventDefault();
      triggerSalvageTaser(minigame);
      flushMinigameEvents(minigame);
    }
  } else if (minigame.tapeId === 'tape3') {
    if (event.code === 'KeyA' || event.code === 'ArrowLeft') {
      event.preventDefault();
      selectFreezerRelay(minigame, minigame.selectedRelay - 1);
      flushMinigameEvents(minigame);
    } else if (event.code === 'KeyD' || event.code === 'ArrowRight') {
      event.preventDefault();
      selectFreezerRelay(minigame, minigame.selectedRelay + 1);
      flushMinigameEvents(minigame);
    } else if (event.code === 'KeyE') {
      event.preventDefault();
      setFreezerRepairing(minigame, true);
    } else if (event.code === 'KeyF') {
      event.preventDefault();
      toggleFreezerLight(minigame);
      flushMinigameEvents(minigame);
    } else if (event.code === 'Space') {
      event.preventDefault();
      setFreezerHoldBreath(minigame, true);
    }
  }
});

window.addEventListener('keyup', (event) => {
  if (stage !== 'vhs' || !minigame) return;
  if (minigame.tapeId === 'tape2' && (event.code === 'KeyS' || event.code === 'KeyC' || event.code === 'ArrowDown')) {
    setClipboardDown(minigame, false);
    flushMinigameEvents(minigame);
  } else if (minigame.tapeId === 'tape3') {
    if (event.code === 'KeyE') setFreezerRepairing(minigame, false);
    if (event.code === 'Space') setFreezerHoldBreath(minigame, false);
  }
});

// Touch Quick-Look Left / Right Hold Buttons
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
  if (['title', 'kiosk', 'custom', 'dossier', 'achievements', 'settings'].includes(stage)) {
    view.drawTitle(performance.now() / 1000);
  } else if (stage === 'extras') {
    view.drawArchiveViewer(archiveViewer, performance.now() / 1000);
  } else if (stage === 'vhs' && minigame) {
    view.drawMinigame(minigame, performance.now() / 1000);
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

// Main 60 FPS Fixed-Step Render Loop
function tick(now) {
  requestAnimationFrame(tick);
  if (isPortraitBlocked()) {
    lastTs = 0;
    lag = 0;
    return;
  }

  const sec = now / 1000;

  if (['title', 'kiosk', 'custom', 'dossier', 'achievements', 'settings'].includes(stage)) {
    if (view) view.drawTitle(sec);
    return;
  }

  if (stage === 'extras') {
    const dt = lastTs ? Math.min(0.1, (now - lastTs) / 1000) : 1 / 60;
    lastTs = now;
    if (archiveViewer.autoSpin && !archiveViewer.dragging) {
      archiveViewer.yaw += dt * 0.36;
    }
    if (archiveViewer.scareTimer > 0) {
      archiveViewer.scareTimer = Math.max(0, archiveViewer.scareTimer - dt);
    }
    if (view) view.drawArchiveViewer(archiveViewer, sec);
    return;
  }

  if (stage === 'vhs' && minigame) {
    if (lastTs === 0) {
      lastTs = now;
      return;
    }
    const dt = Math.min(0.1, (now - lastTs) / 1000);
    lastTs = now;
    lag += dt;

    while (lag >= STEP && (minigame.state === 'playing' || minigame.state === 'jumpscare')) {
      advanceMinigame(minigame, STEP);
      flushMinigameEvents(minigame);
      lag -= STEP;
    }

    if (view) view.drawMinigame(minigame, sec);
    hud.paintMinigame(minigame);

    if (!vhsResultShown && (minigame.state === 'won' || minigame.state === 'lost')) {
      vhsResultShown = true;
      if (get('vhs-skip')) get('vhs-skip').hidden = true;
      const tapeMeta = VHS_TAPE_MAP[minigame.tapeId];
      if (minigame.state === 'won') {
        const { reward } = markTapeCompleted(minigame.tapeId);
        hud.syncTitleProgress();
        hud.showMinigameResult(minigame, {
          won: true,
          reward,
          loreTitle: tapeMeta?.loreTitle || '',
          loreText: tapeMeta?.loreText || '',
          canRetry: false,
        });
      } else {
        hud.showMinigameResult(minigame, { won: false, canRetry: true });
      }
      get('vhs-result-continue')?.focus();
    }
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
      run,
      view,
      stage,
      minigame,
      archiveViewer,
      hud,
      controls,
      startNight,
      startVhsMinigame,
      showTitle,
      showKiosk,
      showExtras,
      showDossier,
      showAchievements,
      showSettings,
      showCustomNight,
      gameActions,
      applyAllSettings,
    }),
  });
}
