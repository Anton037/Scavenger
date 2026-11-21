import test from 'node:test';
import assert from 'node:assert/strict';
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
import {
  bossHaukeModel,
  chefTorgeModel,
  filthyDuckSuitModel,
  lostAntonModel,
  schnorrerTomModel,
} from '../src/render/characters3d.js';
import { setIrEyeShine } from '../src/render/primitives.js';

function simulate(run, seconds) {
  const steps = Math.round(seconds / STEP);
  const events = [];
  for (let i = 0; i < steps; i++) {
    advance(run, {}, STEP);
    events.push(...run.events);
  }
  return events;
}

test('Thermal system rises faster with closed shutters, vents via Exhaust Valve, and repels threats via Steam Burst on CAM 2B/4B', () => {
  const run = newNight({ night: 3, seed: 515 });
  const startHeat = run.thermal.heat;
  toggleLeftDoor(run);
  toggleRightDoor(run);
  simulate(run, 10);
  assert.ok(run.thermal.heat > startHeat + 20);
  assert.ok(getTemperatureCelsius(run) > 50);

  const beforeVent = run.thermal.heat;
  assert.equal(ventOfficeSteam(run), true);
  assert.equal(isVentingSteam(run), true);
  simulate(run, 2.5);
  assert.ok(run.thermal.heat < beforeVent - 25);

  // Steam Burst on CAM 2B repels Anton at 0% power cost
  run.thermal.heat = 60;
  run.animatronics.anton.room = 'left_door';
  toggleMonitor(run);
  selectCam(run, '2B');
  const pwrBefore = run.power;
  assert.equal(triggerSteamBurst(run), true);
  assert.equal(run.power, pwrBefore);
  assert.equal(run.animatronics.anton.room, '1B');
  assert.equal(run.stats.steamHits, 1);

  // Steam Burst on CAM 4B repels Tom & pushes Torge back to kitchen (CAM 6)
  run.thermal.heat = 65;
  run.thermal.burstCooldownUntil = 0;
  run.animatronics.tom.room = 'right_door';
  run.animatronics.torge.room = 'center_far';
  selectCam(run, '4B');
  assert.equal(triggerSteamBurst(run), true);
  assert.equal(run.animatronics.tom.room, '1B');
  assert.equal(run.animatronics.torge.room, '6');
  assert.equal(run.stats.steamHits, 2);
  assert.ok(run.events.some((e) => e.kind === 'achievement' && e.id === 'steam_master'));
});

test('Order tickets reward express completion (+7% rusty_gen), standard completion (+5% rusty_gen), and attract threats if missed', () => {
  const run = newNight({ night: 7, seed: 818, customAi: { tom: 10 }, modifiers: ['rusty_gen'] });
  assert.equal(run.power, 75);
  run.orders.nextAt = 0.2;
  const evPrint = simulate(run, 0.5);
  assert.ok(evPrint.some((e) => e.kind === 'bon_printed'));
  assert.ok(run.orders.active);

  const pwrBefore = run.power;
  const baseTip = run.orders.active.tip;
  assert.equal(stampOrderBon(run), true);
  assert.ok(run.power >= pwrBefore + 6.9);
  assert.equal(run.orders.completed, 1);
  assert.equal(run.stats.tipsEarned, Math.round(baseTip * 1.5 * 100) / 100);

  // Standard (non-express) completion after >14s -> +5% with rusty_gen
  run.power = 60;
  run.orders.active = {
    id: 101,
    label: 'Spät-Döner',
    tip: 4.0,
    createdAt: run.time - 18.0,
    duration: 30,
    deadline: run.time + 12.0,
    step: 'bag',
  };
  assert.equal(stampOrderBon(run), true);
  assert.equal(run.power, 65);

  // Expire next bon -> missed order alarm accelerates Tom!
  run.orders.active = {
    id: 102,
    label: 'Test-Döner',
    tip: 4.0,
    createdAt: run.time,
    duration: 10,
    deadline: run.time + 0.2,
    step: 'doner',
  };
  run.animatronics.tom.timer = 4.9;
  const evMiss = simulate(run, 0.35);
  assert.ok(evMiss.some((e) => e.kind === 'bon_missed'));
  assert.equal(run.stats.bonsMissed, 1);
  assert.ok(run.animatronics.tom.timer < 1.0);
});

test('CCTV IR Strobe clears camera disruption, cancels Anton FaceTime + stuns him, and pushes Hauke curtain back', () => {
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

  run.camFlashCooldownUntil = 0;
  run.animatronics.hauke.stage = 2;
  selectCam(run, '1C');
  assert.equal(triggerCamFlash(run), true);
  assert.equal(run.animatronics.hauke.stage, 1);
  assert.equal(run.stats.camFlashHits, 2);
});

test('All 5 sculpted PS1 stalker rigs expose full 17-joint articulated anatomy, Anton uplight PointLight, and retroreflective IR eye-shine', () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };

  assert.equal(SHIFT_MODIFIERS.length, 4);
  assert.equal(ACHIEVEMENTS.length, 16);
  assert.equal(DEFAULT_SETTINGS.audioSubtitles, false);
  saveSettings({ audioSubtitles: true });
  assert.equal(loadSettings().audioSubtitles, true);

  const run = newNight({ night: 2, seed: 777 });
  run.orders.active = { id: 1, label: 'Döner', tip: 4, createdAt: run.time - 3.0, duration: 30, deadline: run.time + 27.0 };
  assert.equal(isOrderExpress(run), true);
  run.time += 13.0;
  assert.equal(isOrderExpress(run), false);

  const requiredJoints = [
    'pelvis', 'torso', 'chest', 'neck', 'head', 'jaw', 'eyes',
    'leftUpperArm', 'leftForearm', 'leftHand',
    'rightUpperArm', 'rightForearm', 'rightHand',
    'leftThigh', 'leftCalf', 'leftFoot',
    'rightThigh', 'rightCalf', 'rightFoot',
  ];

  const models = [
    chefTorgeModel(),
    lostAntonModel(),
    schnorrerTomModel(),
    bossHaukeModel(),
    filthyDuckSuitModel(),
  ];

  for (const m of models) {
    for (const joint of requiredJoints) {
      assert.ok(m[joint], `Missing articulated joint: ${joint}`);
    }
    setIrEyeShine(m, 0.85);
    assert.equal(m.eyeRigs[0].endoEye.visible, true);
    setIrEyeShine(m, 0.0);
    assert.equal(m.eyeRigs[0].endoEye.visible, false);
  }

  // Verify Anton has real smartphone uplight PointLight
  const anton = models[1];
  assert.equal(anton.phoneLight?.kind, 'point', 'Lost Anton must carry an uplight PointLight on his smartphone');

  const godRun = newNight({
    night: 7,
    seed: 1337,
    customAi: { torge: 20, anton: 20, tom: 20, hauke: 20, duck: 20 },
    modifiers: ['grease_fire', 'rush_hour'],
  });
  godRun.power = 38;
  assert.equal(computeShiftRank(godRun).grade, 'S++');
});

test('Only the first ticket of night 1 gets training time and completion shows the credited reward', () => {
  const firstNight = newNight({ night: 1, seed: 101 });
  const otherNight = newNight({ night: 2, seed: 101 });
  simulate(firstNight, 15.1);
  simulate(otherNight, 15.1);
  assert.equal(firstNight.orders.active.training, true);
  assert.equal(otherNight.orders.active.training, false);
  assert.equal(firstNight.orders.active.duration - otherNight.orders.active.duration, 12);
  firstNight.power = 60;
  assert.equal(stampOrderBon(firstNight), true);
  assert.equal(firstNight.orders.lastReceipt.power, Math.round(firstNight.power - 60));
  assert.equal(firstNight.orders.lastReceipt.tip, firstNight.stats.tipsEarned);
  firstNight.orders.nextAt = firstNight.time;
  advance(firstNight, {}, STEP);
  assert.equal(firstNight.orders.active.training, false);
});
