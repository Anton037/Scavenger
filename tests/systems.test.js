import test from 'node:test';
import assert from 'node:assert/strict';
import { Controls } from '../src/controls.js';
import { ACHIEVEMENTS, computeShiftRank, SHIFT_MODIFIERS } from '../src/fnafData.js';
import {
  advance,
  feedIsInterrupted,
  getTemperatureCelsius,
  isVentingSteam,
  newNight,
  selectCam,
  stampOrderBon,
  STEP,
  toggleLeftDoor,
  toggleMonitor,
  toggleRightDoor,
  triggerCamFlash,
  triggerSteamBurst,
  ventOfficeSteam,
} from '../src/game.js';

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

test('Nacht-Bon Printer spawns tickets, grants +4% (or +6% rusty_gen) power when stamped in office, and attracts threats if missed', () => {
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

  const pwrBefore = run.power;
  assert.equal(stampOrderBon(run), true);
  assert.ok(run.power > pwrBefore + 5.5);
  assert.equal(run.stats.bonsStamped, 1);
  assert.ok(run.stats.tipsEarned > 0);

  // Expire next bon -> missed bon alarm speeds up Tom!
  run.orders.active = { id: 102, label: 'Test-Döner', tip: 4.0, createdAt: run.time, duration: 5, deadline: run.time + 0.2 };
  run.animatronics.tom.timer = 4.9;
  const evMiss = simulate(run, 0.35);
  assert.ok(evMiss.some((e) => e.kind === 'bon_missed'));
  assert.equal(run.stats.bonsMissed, 1);
  assert.ok(run.animatronics.tom.timer < 1.0);
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
  });
  controls.enable(true);
  for (const code of ['KeyV', 'KeyT', 'KeyX', 'KeyG']) {
    win.dispatch('keydown', { code, preventDefault() {} });
  }
  assert.deepEqual(log, ['vent', 'stampBon', 'camFlash', 'steamBurst']);
});
