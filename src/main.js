import './style.css';
import { Soundscape } from './audio.js';
import { Controls } from './controls.js';
import { advance, applyUpgrade, finishRunCashOut, newRun, rerollUpgrades, STEP, TITLE_TICKERS } from './game.js';
import { formatShareReceipt, get, Hud, write } from './hud.js';
import { getDailySeed } from './level.js';

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

const urlParams = new URLSearchParams(window.location.search);
const urlSeed = parseSeed(urlParams.get('seed'));
const rawBeat = Math.floor(Number(urlParams.get('beat')));
const activeChallenge = Number.isFinite(rawBeat) && rawBeat > 0
  ? {
      score: Math.min(99999999, rawBeat),
      from: String(urlParams.get('from') || '').trim().slice(0, 18),
      seed: urlSeed,
    }
  : null;

let previewSeed = urlSeed ?? freshSeed();
let selectedLoadout = 'classic';
let titlePreviewRun = newRun({ seed: previewSeed, floor: 1, loadout: selectedLoadout });
let run = titlePreviewRun;
let view;
let stage = 'title';
let last = 0;
let lag = 0;

function syncDailyButton() {
  const btn = get('daily-seed');
  if (btn) btn.setAttribute('aria-pressed', String(previewSeed === getDailySeed()));
}

function syncChallengeBanner() {
  const el = get('challenge-banner');
  if (!el) return;
  if (activeChallenge) {
    const matchesSeed = !activeChallenge.seed || activeChallenge.seed === previewSeed;
    const seedLabel = activeChallenge.seed ? `#${String(activeChallenge.seed).padStart(4, '0')}` : '';
    const seedPart = seedLabel ? ` · Seed ${seedLabel}` : '';
    const scorePart = `${activeChallenge.score.toLocaleString('de-DE')} ⚡${seedPart}`;
    if (matchesSeed) {
      const targetText = activeChallenge.from
        ? `Knacke ${activeChallenge.from} (${scorePart})!`
        : `Knacke diesen Kumpel-Rekord (${scorePart})!`;
      write(el, `HERAUSFORDERUNG: ${targetText}`);
      el.classList.remove('inactive');
      el.removeAttribute('role');
      el.removeAttribute('title');
    } else {
      write(el, `HERAUSFORDERUNG (${seedLabel}) PAUSIERT — Klick für Seed ${seedLabel}`);
      el.classList.add('inactive');
      el.setAttribute('role', 'button');
      el.setAttribute('title', `Zurück zu Challenge-Seed ${seedLabel}`);
    }
    el.hidden = false;
  } else {
    el.hidden = true;
  }
}

get('challenge-banner')?.addEventListener('click', () => {
  if (!activeChallenge?.seed || previewSeed === activeChallenge.seed) return;
  previewSeed = activeChallenge.seed;
  updateSeedBadge();
  refreshTitlePreview();
});

function updateSeedBadge() {
  const input = get('seed-input');
  if (input && input.value !== String(previewSeed)) {
    input.value = String(previewSeed);
  }
  syncDailyButton();
  syncChallengeBanner();
}
updateSeedBadge();

let tickerIdx = previewSeed % TITLE_TICKERS.length;
function paintTitleTicker() {
  const el = get('title-ticker');
  if (el) write(el, `📢 ${TITLE_TICKERS[tickerIdx % TITLE_TICKERS.length]}`);
}
paintTitleTicker();
setInterval(() => {
  if (stage !== 'title') return;
  tickerIdx = (tickerIdx + 1) % TITLE_TICKERS.length;
  paintTitleTicker();
}, 4500);

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
    refreshTitlePreview();
  });
}

get('seed-input')?.addEventListener('input', (event) => {
  const parsed = parseSeed(event.target.value);
  if (parsed !== null) {
    previewSeed = parsed;
    syncDailyButton();
    syncChallengeBanner();
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

get('daily-seed')?.addEventListener('click', () => {
  previewSeed = getDailySeed();
  updateSeedBadge();
  refreshTitlePreview();
});

async function copyShareUrl(text, shareTitle = 'Imbiss-Survival') {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback below when Clipboard API is restricted (e.g. HTTP LAN on mobile)
    }
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0;pointer-events:none;';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    const copied = document.execCommand('copy');
    area.remove();
    if (copied) return true;
  } catch {
    // ignore execCommand restrictions
  }
  if (navigator.share) {
    try {
      await navigator.share({ title: shareTitle, text });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

get('copy-seed')?.addEventListener('click', async () => {
  const shareUrl = `${window.location.origin}${window.location.pathname}?seed=${previewSeed}`;
  const ok = await copyShareUrl(shareUrl, 'Imbiss-Survival Seed');
  const btn = get('copy-seed');
  if (btn && ok) {
    btn.classList.add('copied');
    setTimeout(() => btn.classList.remove('copied'), 1200);
  }
});

let lastHapticAt = 0;
function pulseHaptic(event) {
  if (!controls.touch || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  const now = performance.now();
  const urgent = event.kind === 'ko' || event.kind === 'wall_slam' || event.kind === 'crown_drop' || event.kind === 'caught' || event.kind === 'levelup' || event.kind === 'evolve';
  if (!urgent && now - lastHapticAt < 90) return;
  const pattern = event.kind === 'evolve'
    ? [20, 24, 30, 24, 48]
    : event.kind === 'wall_slam' || event.kind === 'ko'
      ? [24, 28, 36]
      : event.kind === 'crown_drop' || event.kind === 'caught'
        ? [40, 35, 55]
        : event.kind === 'levelup' || event.kind === 'chest_gold' || event.kind === 'wave' || event.kind === 'escaped' || event.kind === 'combo_milestone' || event.kind === 'ka_ching'
          ? [18, 22, 24]
          : event.kind === 'bonk' || event.kind === 'dodge' || event.kind === 'spezi_boom'
            ? 14
            : 0;
  if (!pattern) return;
  lastHapticAt = now;
  try {
    navigator.vibrate(pattern);
  } catch {
    // ignore unsupported/blocked vibration
  }
}

function installTapGuard(container) {
  if (!container) return;
  container.addEventListener('click', (event) => {
    const until = Number(container.dataset.guardUntil || 0);
    if (performance.now() < until) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}
installTapGuard(liftScreen);
installTapGuard(overlay);

function armTouchTapGuard(container, ms = 420) {
  if (!container) return;
  if (!controls.touch || ms <= 0) {
    delete container.dataset.guardUntil;
    container.classList.remove('tap-guard');
    return;
  }
  const until = performance.now() + ms;
  container.dataset.guardUntil = String(until);
  container.classList.add('tap-guard');
  setTimeout(() => {
    if (Number(container.dataset.guardUntil || 0) <= until) {
      container.classList.remove('tap-guard');
    }
  }, ms);
}

window.addEventListener('keydown', (event) => {
  if (stage !== 'lift' || event.repeat) return;
  if (event.code === 'KeyR') {
    const rerollBtn = get('lift-reroll');
    if (rerollBtn && !rerollBtn.disabled) {
      event.preventDefault();
      rerollBtn.click();
    }
    return;
  }
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
  const useChallenge = activeChallenge && (!activeChallenge.seed || activeChallenge.seed === seed);
  run = newRun({
    seed,
    floor: 1,
    loadout: selectedLoadout,
    beatScore: useChallenge ? activeChallenge.score : 0,
    beatFrom: useChallenge ? activeChallenge.from : '',
  });
  if (run.challenge) {
    const scoreStr = run.challenge.score.toLocaleString('de-DE');
    const seedStr = String(seed).padStart(4, '0');
    const msg = run.challenge.from
      ? `CHALLENGE: Knacke ${run.challenge.from} (${scoreStr} ⚡) auf #${seedStr}!`
      : `CHALLENGE: Knacke den Kumpel-Rekord (${scoreStr} ⚡) auf #${seedStr}!`;
    run.notices.push({ message: msg, until: 3.6 });
  } else if (run.map?.mutator && run.map.mutator.id !== 'classic') {
    run.notices.push({
      message: `${run.map.mutator.name}: ${run.map.mutator.hint}`,
      until: 3.4,
    });
  } else {
    run.notices.push({
      message: 'Welle 1 gestartet! Pfand-XP sammeln · Auto-Waffen feuern von selbst!',
      until: 3.2,
    });
  }
  if (liftScreen) liftScreen.hidden = true;
  hud.clearFloating();
  title.hidden = true;
  canvas.hidden = false;
  get('hud').hidden = false;
  get('vignette').hidden = false;
  get('vignette').classList.remove('alert');
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
  write(label, 'STARTET…');
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
    console.warn('Imbiss-Survival could not start', error.message);
    stage = 'title';
    title.hidden = false;
    const message = get('launch-error');
    write(message, 'WebGL 2 konnte nicht gestartet werden.');
    message.hidden = false;
  } finally {
    startButton.disabled = false;
    write(label, 'SCHICHT STARTEN');
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

function showLevelChoices({ isReroll = false } = {}) {
  stage = 'lift';
  controls.enable(false);
  sound.setActivity('pause');
  hud.toggleChart(run, false);
  hud.clearFloating();
  get('vignette')?.classList.remove('alert');
  get('hud').inert = true;
  hud.showLevelChoices(
    run,
    (upgradeId) => {
      applyUpgrade(run, upgradeId);
      const ev = {
        kind: String(upgradeId).startsWith('evo_') ? 'evolve' : 'upgrade',
        x: run.player.x,
        z: run.player.z,
      };
      sound.play(ev, run.player);
      pulseHaptic(ev);
      view.resize();
      view.draw(run, 0, true);
      hud.paint(run, view);
      if (run.state === 'levelup') {
        showLevelChoices();
      } else {
        resume();
      }
    },
    () => {
      if (rerollUpgrades(run)) {
        sound.play({ kind: 'reroll', x: run.player.x, z: run.player.z }, run.player);
        showLevelChoices({ isReroll: true });
      }
    },
  );
  armTouchTapGuard(liftScreen, isReroll ? 120 : 420);
}

function showOverlay(kind) {
  const caughtTitle = run?.caughtBy === 'hauke'
    ? 'Von Hauke überrollt!'
    : run?.caughtBy === 'tom'
      ? 'Von Tom geschnorrt!'
      : 'Schicht beendet!';
  const mutLabel = run?.map?.mutator?.id && run.map.mutator.id !== 'classic' ? ` · ${run.map.mutator.name}` : '';
  const details = {
    pause: ['Pause', `Welle ${run?.wave ?? 1} · Stufe ${run?.player?.level ?? 1}${mutLabel} · Seed #${String(run?.seed ?? previewSeed).padStart(4, '0')}`, 'Weitermachen'],
    caught: [caughtTitle, run?.deathReason ?? 'Die Horde war stärker.', 'Neue Schicht'],
    escaped: [
      `Welle ${run?.wave ?? 1} gesichert!`,
      'Chef Torge macht rechtzeitig Feierabend und behält die komplette Kasse.',
      'Neue Schicht',
    ],
  }[kind];
  stage = kind;
  controls.enable(false);
  sound.setActivity('pause');
  hud.toggleChart(run, false);
  hud.clearFloating();
  if (kind !== 'caught') get('vignette')?.classList.remove('alert');
  if (liftScreen) liftScreen.hidden = true;
  get('hud').inert = true;
  write(get('overlay-eyebrow'), kind === 'pause' ? 'SCHICHT PAUSIERT' : "IMBISS-BILANZ · '26");
  write(get('overlay-title'), details[0]);
  write(get('overlay-copy'), details[1]);
  write(get('overlay-action'), details[2]);
  hud.renderOverlayMods(run);
  const sameSeedBtn = get('overlay-same-seed');
  if (sameSeedBtn) sameSeedBtn.hidden = kind === 'pause';
  const shareBtn = get('overlay-share');
  if (shareBtn) {
    shareBtn.hidden = kind === 'pause';
    shareBtn.classList.remove('copied');
    write(get('overlay-share-label'), 'Kassenbon teilen');
  }
  const receipt = get('overlay-receipt');
  if (kind === 'pause') {
    if (receipt) receipt.hidden = true;
  } else {
    hud.renderReceipt(run);
  }
  overlay.hidden = false;
  if (kind !== 'pause') armTouchTapGuard(overlay, 420);
  else armTouchTapGuard(overlay, 0);
  if (!controls.touch) {
    get('overlay-primary').focus({ preventScroll: true });
  }
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
  get('vignette').classList.remove('alert');
  title.hidden = false;
  if (!titlePreviewRun || titlePreviewRun.seed !== previewSeed || titlePreviewRun.loadoutId !== selectedLoadout) {
    titlePreviewRun = newRun({ seed: previewSeed, floor: 1, loadout: selectedLoadout });
  }
  if (view) view.drawTitle(titlePreviewRun, performance.now() / 1000);
  if (!controls.touch) {
    startButton.focus({ preventScroll: true });
  }
}

get('lift-cashout')?.addEventListener('click', () => {
  finishRunCashOut(run);
  const ev = { kind: 'escaped', x: run.player.x, z: run.player.z };
  sound.play(ev, run.player);
  pulseHaptic(ev);
  showOverlay('escaped');
});

get('title-audio').addEventListener('click', changeSound);
get('pause-audio').addEventListener('click', changeSound);
paintSound();
startButton.addEventListener('click', begin);
get('pause').addEventListener('click', () => {
  togglePause();
  get('pause')?.blur();
});
get('chart-toggle').addEventListener('click', () => {
  toggleChart();
  get('chart-toggle')?.blur();
});
get('chart-close')?.addEventListener('click', () => {
  if (stage === 'play') hud.toggleChart(run, false);
  get('chart-close')?.blur();
});
get('menu').addEventListener('click', showTitle);
get('overlay-same-seed')?.addEventListener('click', () => {
  restart(run?.seed ?? previewSeed);
});
get('overlay-share')?.addEventListener('click', async () => {
  if (!run) return;
  const score = Math.round(run.player?.pfand ?? 0);
  const shareUrl = `${window.location.origin}${window.location.pathname}?seed=${run.seed}&beat=${score}`;
  const text = formatShareReceipt(run, shareUrl);
  const ok = await copyShareUrl(text, 'Imbiss-Survival Kassenbon');
  const btn = get('overlay-share');
  if (btn && ok) {
    btn.classList.add('copied');
    write(get('overlay-share-label'), 'Kopiert! ✓');
    setTimeout(() => {
      btn.classList.remove('copied');
      write(get('overlay-share-label'), 'Kassenbon teilen');
    }, 1800);
  }
});
get('overlay-primary').addEventListener('click', () => {
  if (stage === 'pause') resume();
  else restart(null);
});

function bindActionButton(id, action, { checkLocked = false } = {}) {
  const el = get(id);
  if (!el) return;
  let lastPointerAt = 0;
  let pressTimer = 0;
  const clearPressed = () => {
    el.classList.remove('pressed');
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = 0;
    }
  };
  el.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (el.disabled || (checkLocked && el.classList.contains('locked'))) return;
    if (event.pointerType !== 'mouse') controls.noteTouch();
    lastPointerAt = performance.now();
    event.preventDefault();
    sound.open();
    controls.queue(action);
    el.classList.add('pressed');
    clearTimeout(pressTimer);
    pressTimer = setTimeout(clearPressed, 120);
  });
  for (const ev of ['pointerup', 'pointercancel']) {
    el.addEventListener(ev, clearPressed);
  }
  el.addEventListener('click', () => {
    if (performance.now() - lastPointerAt < 700) return;
    if (el.disabled || (checkLocked && el.classList.contains('locked'))) return;
    sound.open();
    controls.queue(action);
    el.blur?.();
  });
}

for (const [id, action, opts] of [
  ['touch-shutter', 'lamp'], ['touch-dash', 'dash'], ['touch-lure', 'lure'], ['touch-use', 'use'],
  ['touch-bonk', 'bonk'], ['orb-bonk', 'bonk'], ['orb-dash', 'dash'],
  ['slot-lamp', 'lamp'], ['slot-lure', 'lure'], ['interact', 'use', { checkLocked: true }],
]) bindActionButton(id, action, opts);

function handleResize() {
  if (!view) return;
  view.resize();
  if (stage === 'title') {
    view.drawTitle(titlePreviewRun, performance.now() / 1000);
  } else if (run && stage !== 'play') {
    view.draw(run, 0, true);
  }
}

window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', () => {
  handleResize();
  setTimeout(handleResize, 140);
  setTimeout(handleResize, 360);
});
window.visualViewport?.addEventListener('resize', handleResize);

function handleBackgroundHide() {
  sound.suspend();
  if (stage === 'play') showOverlay('pause');
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) handleBackgroundHide();
});
window.addEventListener('pagehide', handleBackgroundHide);

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
    for (const event of run.events) {
      sound.play(event, run.player);
      pulseHaptic(event);
    }
    lag -= STEP;
  }
  sound.background(run);
  view.draw(run, dt);
  hud.paint(run, view);
  if (run.state === 'levelup') showLevelChoices();
  else if (run.state !== 'playing') showOverlay(run.state);
}
requestAnimationFrame(tick);

if (import.meta.env.DEV) {
  Object.defineProperty(window, '__scavenger', { get: () => ({ run, view, stage, hud, controls }) });
}
