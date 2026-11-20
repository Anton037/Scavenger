import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Controls } from '../src/controls.js';
import {
  ACHIEVEMENTS,
  computeShiftRank,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  SHIFT_MODIFIERS,
} from '../src/fnafData.js';
import {
  advance,
  feedIsInterrupted,
  getTemperatureCelsius,
  isOrderExpress,
  isSpeziBoosted,
  isVentingSteam,
  newNight,
  selectCam,
  sipSpezi,
  stampOrderBon,
  STEP,
  toggleLeftDoor,
  toggleMonitor,
  toggleRightDoor,
  triggerCamFlash,
  triggerSteamBurst,
  ventOfficeSteam,
} from '../src/game.js';
import { mascotEyeRig, setEndoEyes } from '../src/render/primitives.js';

function simulate(run, seconds) {
  const steps = Math.round(seconds / STEP);
  const events = [];
  for (let i = 0; i < steps; i++) {
    advance(run, {}, STEP);
    events.push(...run.events);
  }
  return events;
}

test('Thermal system rises faster with closed doors, vents via V in office, and repels attackers via Steam Burst on CAM 2B/4B', () => {
  const run = newNight({ night: 3, seed: 515 });
  const startHeat = run.thermal.heat;
  toggleLeftDoor(run);
  toggleRightDoor(run);
  simulate(run, 10);
  assert.ok(run.thermal.heat > startHeat + 20);
  assert.ok(getTemperatureCelsius(run) > 50);

  // Vent steam in office
  const beforeVent = run.thermal.heat;
  assert.equal(ventOfficeSteam(run), true);
  assert.equal(isVentingSteam(run), true);
  simulate(run, 2.5);
  assert.ok(run.thermal.heat < beforeVent - 25);

  // Build steam >= 45 and repel Anton from left_door via CAM 2B Steam Burst at 0% power cost!
  run.thermal.heat = 60;
  run.animatronics.anton.room = 'left_door';
  toggleMonitor(run);
  selectCam(run, '2B');
  const pwrBefore = run.power;
  assert.equal(triggerSteamBurst(run), true);
  assert.equal(run.power, pwrBefore);
  assert.equal(run.animatronics.anton.room, '1B');
  assert.equal(run.stats.steamHits, 1);

  // Repel Tom & Torge on CAM 4B and unlock steam_master stamp!
  run.thermal.heat = 65;
  run.thermal.burstCooldownUntil = 0;
  run.animatronics.tom.room = 'right_door';
  run.animatronics.torge.room = '4B';
  selectCam(run, '4B');
  assert.equal(triggerSteamBurst(run), true);
  assert.equal(run.animatronics.tom.room, '1B');
  assert.equal(run.animatronics.torge.room, '4A');
  assert.equal(run.stats.steamHits, 2);
  assert.ok(run.events.some((e) => e.kind === 'achievement' && e.id === 'steam_master'));
});

test('Nacht-Bon Printer rewards Express stamps (+5% / +7% rusty_gen + 2x tip), standard stamps (+3% / +5%), and attracts threats if missed', () => {
  const run = newNight({ night: 7, seed: 818, customAi: { tom: 10 }, modifiers: ['rusty_gen'] });
  assert.equal(run.power, 75);
  run.orders.nextAt = 0.2;
  const evPrint = simulate(run, 0.5);
  assert.ok(evPrint.some((e) => e.kind === 'bon_printed'));
  assert.ok(run.orders.active);

  // Cannot stamp while monitor is up
  toggleMonitor(run);
  assert.equal(stampOrderBon(run), false);
  toggleMonitor(run);

  // Stamp within first 5.5s -> Express bonus (+7% with rusty_gen, 2x tip)!
  const pwrBefore = run.power;
  const baseTip = run.orders.active.tip;
  assert.equal(stampOrderBon(run), true);
  assert.ok(run.power >= pwrBefore + 6.9);
  assert.equal(run.stats.bonsStamped, 1);
  assert.equal(run.stats.expressBons, 1);
  assert.equal(run.stats.tipsEarned, Math.round(baseTip * 2 * 100) / 100);

  // Standard (non-express) stamp after >5.5s -> +5% with rusty_gen
  run.power = 60;
  run.orders.active = { id: 101, label: 'Spät-Döner', tip: 4.0, createdAt: run.time - 8.0, duration: 15, deadline: run.time + 7.0 };
  assert.equal(stampOrderBon(run), true);
  assert.equal(run.power, 65);
  assert.equal(run.stats.expressBons, 1);

  // Expire next bon -> missed bon alarm speeds up Tom!
  run.orders.active = { id: 102, label: 'Test-Döner', tip: 4.0, createdAt: run.time, duration: 5, deadline: run.time + 0.2 };
  run.animatronics.tom.timer = 4.9;
  const evMiss = simulate(run, 0.35);
  assert.ok(evMiss.some((e) => e.kind === 'bon_missed'));
  assert.equal(run.stats.bonsMissed, 1);
  assert.ok(run.animatronics.tom.timer < 1.0);
});

test('Tactical Desk Spezi grants 2 Koffein-Kick charges per night, steadies focus, and tempts Schnorrer Tom', () => {
  const run = newNight({ night: 4, seed: 616 });
  run.ai.tom = 12;
  run.animatronics.tom.room = '4A';
  run.animatronics.tom.timer = 4.8;
  assert.equal(run.speziCharges, 2);

  assert.equal(sipSpezi(run), true);
  assert.equal(run.speziCharges, 1);
  assert.ok(run.speziBoostUntil > run.time + 7.5);
  assert.ok(run.animatronics.tom.timer <= 2.2); // Tom smelled open Spezi!

  run.speziBoostUntil = 0;
  assert.equal(sipSpezi(run), true);
  assert.equal(run.speziCharges, 0);
  assert.ok(run.speziBoostUntil > run.time + 7.5);

  // 3rd sip rattles empty can without refilling boost
  run.speziBoostUntil = 0;
  run.events.length = 0;
  assert.equal(sipSpezi(run), true);
  assert.equal(run.speziCharges, 0);
  assert.equal(run.speziBoostUntil, 0);
  assert.ok(run.events.some((e) => e.kind === 'spezi_empty'));
});

test('CCTV IR-Blitz clears camera disruption, cancels Anton video call + stuns him, and pushes Hauke curtain back', () => {
  const run = newNight({ night: 7, seed: 909, customAi: { anton: 20, hauke: 15 } });
  toggleMonitor(run);
  selectCam(run, '1A');
  run.feedFaultUntil['1A'] = run.time + 5;
  run.antonVideo.deadline = run.time + 2.5;

  assert.equal(feedIsInterrupted(run, '1A'), true);
  assert.equal(triggerCamFlash(run), true);
  assert.equal(feedIsInterrupted(run, '1A'), false);
  assert.equal(run.antonVideo.deadline, 0);
  assert.equal(run.stats.videoDodges, 1);
  assert.ok(run.animatronics.anton.stunUntil > run.time + 5);

  // Calm Hauke on CAM 1C
  run.camFlashCooldownUntil = 0;
  run.animatronics.hauke.stage = 2;
  selectCam(run, '1C');
  assert.equal(triggerCamFlash(run), true);
  assert.equal(run.animatronics.hauke.stage, 1);
  assert.equal(run.stats.camFlashHits, 2);
});

test('Shift Modifiers and S++ Küchengott rank work cleanly and new hotkeys V/T/X/G fire', () => {
  assert.equal(SHIFT_MODIFIERS.length, 4);
  assert.equal(ACHIEVEMENTS.length, 16);

  const godRun = newNight({
    night: 7,
    seed: 1337,
    customAi: { torge: 20, anton: 20, tom: 20, hauke: 20 },
    modifiers: ['grease_fire', 'rush_hour'],
  });
  godRun.power = 38;
  godRun.stats.bonsStamped = 3;
  godRun.stats.steamHits = 2;
  assert.equal(computeShiftRank(godRun).grade, 'S++');

  // Verify V / T / X / G hotkeys in Controls
  const log = [];
  const listeners = new Map();
  const makeTarget = () => ({
    addEventListener(type, fn) {
      if (!listeners.has(this)) listeners.set(this, new Map());
      const m = listeners.get(this);
      if (!m.has(type)) m.set(type, []);
      m.get(type).push(fn);
    },
    dispatch(type, ev = {}) {
      for (const fn of (listeners.get(this)?.get(type) ?? [])) fn(ev);
    },
  });
  const win = makeTarget();
  win.innerWidth = 1000;
  win.matchMedia = () => ({ matches: false });
  globalThis.window = win;
  globalThis.document = makeTarget();
  const controls = new Controls(makeTarget(), {
    vent: () => log.push('vent'),
    stampBon: () => log.push('stampBon'),
    camFlash: () => log.push('camFlash'),
    steamBurst: () => log.push('steamBurst'),
    spezi: () => log.push('spezi'),
  });
  controls.enable(true);
  for (const code of ['KeyV', 'KeyT', 'KeyX', 'KeyG', 'KeyC']) {
    win.dispatch('keydown', { code, preventDefault() {} });
  }
  assert.deepEqual(log, ['vent', 'stampBon', 'camFlash', 'steamBurst', 'spezi']);
});

test('Settings default audioSubtitles to false (no doorway HUD spoilers), persist opt-in, and dual-mode Mascot/Endo eye rigs toggle cleanly', () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };

  assert.equal(DEFAULT_SETTINGS.audioSubtitles, false);
  assert.equal(loadSettings().audioSubtitles, false);
  saveSettings({ audioSubtitles: true });
  assert.equal(loadSettings().audioSubtitles, true);

  const run = newNight({ night: 2, seed: 777 });
  assert.equal(isSpeziBoosted(run), false);
  sipSpezi(run);
  assert.equal(isSpeziBoosted(run), true);
  run.time += 10;
  assert.equal(isSpeziBoosted(run), false);

  run.orders.active = { id: 1, label: 'Döner', tip: 2, createdAt: run.time - 2.0, duration: 15, deadline: run.time + 13.0 };
  assert.equal(isOrderExpress(run), true);
  run.time += 4.5;
  assert.equal(isOrderExpress(run), false);

  // Verify 3D dual-mode mascotEyeRig / setEndoEyes toggling
  const eyesGroup = new THREE.Group();
  const rig = mascotEyeRig(eyesGroup, 0, 0, 0, { radius: 0.05 });
  assert.equal(rig.normalEye.visible, true);
  assert.equal(rig.endoEye.visible, false);
  setEndoEyes({ eyeRigs: [rig] }, true);
  assert.equal(rig.normalEye.visible, false);
  assert.equal(rig.endoEye.visible, true);
  setEndoEyes({ eyeRigs: [rig] }, false);
  assert.equal(rig.normalEye.visible, true);
  assert.equal(rig.endoEye.visible, false);
});
