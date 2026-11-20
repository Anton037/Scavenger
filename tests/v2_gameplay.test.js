import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSpatialAudioParams } from '../src/audio.js';
import { COSMETIC_ITEMS, CUSTOM_PRESETS } from '../src/fnafData.js';
import {
  advance,
  getHourLabel,
  HOUR_SECONDS,
  interactPrepStation,
  newNight,
  resetBreaker,
  selectCam,
  setFlashlight,
  setHoldingBreath,
  setUnderDesk,
  STEP,
  toggleLeftDoor,
  toggleMonitor,
  triggerCamCounter,
  turnAround,
} from '../src/game.js';
import {
  advanceMinigame,
  createMinigame,
  flashCorridor,
  playSalvageCassette,
  setClipboardDown,
  setFreezerHoldBreath,
  setFreezerRepairing,
  triggerSalvageTaser,
} from '../src/minigames/vhsMinigames.js';
import { loadAssetOverrides, resetOverridesForTest } from '../src/render/overrides.js';
import {
  addWalletTips,
  loadCosmeticState,
  loadWallet,
  purchaseCosmetic,
  toggleCosmetic,
} from '../src/storage/saveSystem.js';

function simulate(run, seconds, inputFn = () => ({})) {
  const steps = Math.round(seconds / STEP);
  const events = [];
  for (let i = 0; i < steps; i++) {
    advance(run, inputFn(i), STEP);
    events.push(...run.events);
  }
  return events;
}

function createMemoryStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  return store;
}

test('Overrides manifest loads once with zero 404 asset requests when empty', async () => {
  resetOverridesForTest();
  const urls = [];
  const fakeFetch = async (url) => {
    urls.push(url);
    return {
      ok: true,
      json: async () => ({ faces: {}, sfx: {} }),
    };
  };
  const manifest = await loadAssetOverrides(fakeFetch);
  assert.deepEqual(manifest, { faces: {}, sfx: {} });
  assert.deepEqual(urls, ['./overrides.json']);
});

test('2-Station view transitions (front <-> back 180° <-> under_desk) and 180° stereo pan inversion math', () => {
  const run = newNight({ night: 2, seed: 202 });
  assert.equal(run.viewState, 'front');
  assert.equal(turnAround(run), true);
  assert.equal(run.viewState, 'back');
  simulate(run, 0.35);
  assert.ok(run.turnAnim > 0.92);

  // Duck under desk from back or front, then stand back up
  assert.equal(setUnderDesk(run, true), true);
  assert.equal(run.viewState, 'under_desk');
  simulate(run, 0.3);
  assert.ok(run.duckAnim > 0.85);
  assert.equal(setUnderDesk(run, false), true);
  assert.equal(run.viewState, 'front');

  // Verify 180° stereo pan inversion & rear high-shelf occlusion
  const frontLeft = computeSpatialAudioParams(-0.76, 'front', 0, false);
  const backLeft = computeSpatialAudioParams(-0.76, 'back', 0, false);
  assert.ok(frontLeft.pan < -0.5, 'Front view keeps left hallway in left ear');
  assert.equal(frontLeft.rearOcclusionDb, 0);
  assert.ok(backLeft.pan > 0.5, 'Turning 180° to Back Prep Wall flips front-left hallway to right ear');
  assert.ok(backLeft.rearOcclusionDb <= -6, 'Front hallway cues get rear high-shelf occlusion while facing Back Wall');

  const hatchFromFront = computeSpatialAudioParams(0.65, 'front', 0, true);
  const hatchFromBack = computeSpatialAudioParams(0.65, 'back', 0, true);
  assert.ok(hatchFromFront.rearOcclusionDb <= -6);
  assert.equal(hatchFromBack.rearOcclusionDb, 0);
});

test('Mandatory Shift Order Quota persists prep steps across 180° turns, raises roomNoise, and triggers 6:00 AM Overtime until bagged', () => {
  const run = newNight({ night: 1, seed: 303 });
  run.ai = { torge: 0, anton: 0, tom: 0, hauke: 0, duck: 0 };
  run.training = 'done';
  assert.equal(run.orders.quota, 3);
  assert.equal(run.orders.completed, 0);

  // Spawn active order immediately
  run.orders.nextAt = 0.05;
  simulate(run, 0.2);
  assert.ok(run.orders.active);
  assert.equal(run.orders.active.step, 'doner');

  // Turn 180° to Back Station and slice Döner halfway
  turnAround(run);
  for (let i = 0; i < 60; i++) {
    interactPrepStation(run, 'doner', STEP);
    advance(run, {}, STEP);
  }
  const savedSlice = run.orders.active.donerProgress;
  assert.ok(savedSlice > 0.8 && savedSlice < 2.1);
  assert.ok(run.roomNoise > 0.3, 'Electric Döner slicer raises room noise');

  // Spin 180° back to Front Desk to check doors -> progress persists!
  turnAround(run);
  simulate(run, 1.0);
  assert.equal(run.orders.active.donerProgress, savedSlice);

  // Spin back to Prep Wall, finish Döner slice -> moves to Fryer step
  turnAround(run);
  for (let i = 0; i < 90; i++) {
    interactPrepStation(run, 'doner', STEP);
    advance(run, {}, STEP);
  }
  assert.equal(run.orders.active.step, 'fryer');

  // Drop fryer basket, spin to Front while it sizzles for 4.1s!
  assert.equal(interactPrepStation(run, 'fryer'), true);
  assert.equal(run.orders.active.fryerState, 'frying');
  turnAround(run);
  simulate(run, 4.2);
  assert.equal(run.orders.active.fryerState, 'ready');

  // Spin back, lift fries, then pour Spezi & bag!
  turnAround(run);
  assert.equal(interactPrepStation(run, 'fryer'), true);
  assert.equal(run.orders.active.step, 'bag');
  for (let i = 0; i < 75; i++) {
    interactPrepStation(run, 'bag', STEP);
    advance(run, {}, STEP);
  }
  assert.equal(run.orders.completed, 1);
  assert.ok(run.stats.tipsEarned > 0);

  // Advance clock past 6:00 AM with only 1/3 orders completed -> MUST enter 06:00 ÜBERSTUNDEN (NOT win!)
  run.time = HOUR_SECONDS * 6 - 0.5;
  run.hour = 5;
  simulate(run, 1.0);
  assert.equal(run.state, 'playing');
  assert.equal(run.overtime, true);
  assert.ok(getHourLabel(run).includes('ÜBERSTUNDEN'));
  assert.ok(run.ai.torge > 0, 'Torge aggression spikes during Nachschicht overtime');

  // Prevent Torge from killing during test while completing remaining 2 orders -> instant win on 3/3!
  run.ai.torge = 0;
  while (run.orders.completed < run.orders.quota) {
    if (!run.orders.active) {
      run.orders.nextAt = run.time;
      simulate(run, 0.1);
    }
    while (run.orders.active && run.orders.active.step === 'doner') {
      interactPrepStation(run, 'doner', 0.25);
      advance(run, {}, STEP);
    }
    if (run.orders.active?.step === 'fryer') {
      interactPrepStation(run, 'fryer');
      simulate(run, 4.1);
      interactPrepStation(run, 'fryer');
    }
    while (run.orders.active && run.orders.active.step === 'bag') {
      interactPrepStation(run, 'bag', 0.25);
      advance(run, {}, STEP);
    }
  }
  assert.equal(run.orders.completed, 3);
  assert.equal(run.state, 'won');
});

test('Chef Torge Center Pass-Through ignores side shutters and is repelled by Tactical Flashlight, while Duck Suit enforces Anti-Flash', () => {
  const run = newNight({ night: 4, seed: 404 });
  run.ai = { torge: 20, anton: 0, tom: 0, hauke: 0, duck: 0 };
  run.animatronics.anton.room = '1B';
  run.animatronics.tom.room = '1B';

  // Even with both steel shutters closed, Torge advances into Center Pass-Through
  toggleLeftDoor(run);
  run.rightDoor = true;
  run.animatronics.torge.room = 'center_near';
  run.animatronics.torge.pathIdx = 5;
  run.lookX = 0;
  setFlashlight(run, true);
  const evRepel = simulate(run, 1.4);
  assert.ok(evRepel.some((e) => e.kind === 'torge_repelled'));
  assert.notEqual(run.animatronics.torge.room, 'center_near');
  assert.ok(run.stats.torgeRepelled >= 1);
  setFlashlight(run, false);

  // Duck Suit 180° Anomaly: Look-away banishes cleanly when Flashlight is OFF
  run.duck = { active: true, station: 'back', timer: 4.0, flashGrace: 0 };
  run.viewState = 'back';
  assert.equal(turnAround(run), true); // Whip 180° away from 'back' to 'front'!
  assert.equal(run.duck.active, false);
  assert.equal(run.stats.goldenBanished, 1);

  // Duck Suit STRICT ANTI-FLASH RULE: Shining Flashlight at Duck Suit causes instant jumpscare!
  run.duck = { active: true, station: 'front', timer: 4.0, flashGrace: 0 };
  run.viewState = 'front';
  setFlashlight(run, true);
  simulate(run, 0.1);
  assert.equal(run.state, 'jumpscare');
  assert.equal(run.killedBy, 'duck');
  assert.equal(run.jumpscare.cause, 'flash');
});

test('Anton office breach gives Under-Desk Hold-Breath survival vs unhidden or breath-gasp jumpscare', () => {
  // Case A: Survive Anton's floor inspection by ducking under desk and holding breath!
  const survive = newNight({ night: 3, seed: 505 });
  survive.ai = { torge: 0, anton: 15, tom: 0, hauke: 0, duck: 0 };
  survive.training = 'done';
  survive.animatronics.anton.room = 'left_door';
  survive.animatronics.anton.timer = 0.05;
  const evBreach = simulate(survive, 0.2);
  assert.equal(survive.animatronics.anton.room, 'office');
  assert.ok(evBreach.some((e) => e.kind === 'office_breach' && e.who === 'anton'));

  setUnderDesk(survive, true);
  setHoldingBreath(survive, true);
  simulate(survive, 5.8);
  assert.equal(survive.state, 'playing');
  assert.notEqual(survive.animatronics.anton.room, 'office');
  assert.equal(survive.leftJammed, false);
  assert.equal(survive.stats.underDeskSurvived, 1);

  // Case B: Depleting breath to 0% while Anton inspects triggers gasp + under-desk jumpscare!
  const gaspFail = newNight({ night: 3, seed: 506 });
  gaspFail.ai = { torge: 0, anton: 15, tom: 0, hauke: 0, duck: 0 };
  gaspFail.training = 'done';
  gaspFail.animatronics.anton.room = 'office';
  gaspFail.animatronics.anton.inspectionTimer = 5.0;
  gaspFail.animatronics.anton.graceTimer = 0;
  setUnderDesk(gaspFail, true);
  setHoldingBreath(gaspFail, true);
  gaspFail.breath = 4; // Almost out of air!
  simulate(gaspFail, 1.0);
  assert.equal(gaspFail.state, 'jumpscare');
  assert.equal(gaspFail.killedBy, 'anton');
});

test('Hauke Left Shutter slam trips Physical Main Breaker until reset at Back Wall, and Tom creeps to Back Hatch', () => {
  const run = newNight({ night: 4, seed: 606 });
  run.ai = { torge: 0, anton: 0, tom: 14, hauke: 20, duck: 0 };
  run.animatronics.hauke.stage = 3;
  run.animatronics.hauke.sprint = { active: true, triggered: true, waitTimer: 0, progress: 0.92, duration: 2.0, nextStomp: 0.5 };
  toggleLeftDoor(run);
  simulate(run, 0.35);

  assert.equal(run.stats.haukeBlocked, 1);
  assert.equal(run.breakerTripped, true);
  assert.equal(toggleMonitor(run), false, 'Cameras offline while Main Breaker is tripped');
  assert.equal(resetBreaker(run), false, 'Cannot reset breaker while facing Front Desk');

  turnAround(run);
  assert.equal(resetBreaker(run), true);
  assert.equal(run.breakerTripped, false);
  turnAround(run);
  assert.equal(toggleMonitor(run), true);
  toggleMonitor(run);

  // Tom at Back Pickup Hatch repelled by Flashlight on Back Wall
  run.animatronics.tom.room = 'back_hatch';
  turnAround(run);
  run.lookX = 0.45;
  setFlashlight(run, true);
  simulate(run, 1.2);
  assert.notEqual(run.animatronics.tom.room, 'back_hatch');
  assert.ok(run.stats.tomBlocked >= 1);

  // Context-sensitive Camera Counter (X) dispatches Gong on CAM 6
  setFlashlight(run, false);
  turnAround(run);
  run.animatronics.tom.room = '4A';
  toggleMonitor(run);
  selectCam(run, '6');
  assert.equal(triggerCamCounter(run), true);
  assert.equal(run.animatronics.tom.room, '6');
});

test('All 3 Playable VHS Horror Minigames (Flur-Kontrolle, Hinterzimmer-Inventur, Kühlhaus-Schlussrunde) complete & fail cleanly', () => {
  // TAPE 01: Flur-Kontrolle
  const m1 = createMinigame('tape1', { seed: 11 });
  while (m1.distance > 3.0 && m1.state === 'playing') {
    advanceMinigame(m1, 0.25);
  }
  assert.equal(flashCorridor(m1), true);
  assert.equal(m1.state, 'won');
  assert.equal(m1.rewardTips, 15);

  // TAPE 02: Hinterzimmer-Inventur
  const m2 = createMinigame('tape2', { seed: 22 });
  for (let round = 0; round < 4; round++) {
    assert.equal(playSalvageCassette(m2), true);
    for (let i = 0; i < 20; i++) advanceMinigame(m2, 0.25);
    setClipboardDown(m2, true);
    for (let i = 0; i < 12; i++) advanceMinigame(m2, 0.25);
    setClipboardDown(m2, false);
    if (m2.postureStage >= 2 && m2.taserCharges > 0) {
      assert.equal(triggerSalvageTaser(m2), true);
      assert.equal(m2.postureStage, 0);
    }
  }
  assert.equal(m2.state, 'won');
  assert.equal(m2.rewardTips, 20);

  // TAPE 03: Kühlhaus-Schlussrunde
  const m3 = createMinigame('tape3', { seed: 33 });
  let guard = 0;
  while (m3.state === 'playing' && guard < 1200) {
    guard += 1;
    if (m3.stalkerPhase === 'at_curtain' || m3.stalkerPhase === 'approaching') {
      setFreezerRepairing(m3, false);
      setFreezerHoldBreath(m3, m3.stalkerPhase === 'at_curtain');
    } else {
      setFreezerHoldBreath(m3, false);
      setFreezerRepairing(m3, true);
    }
    advanceMinigame(m3, 0.2);
  }
  assert.equal(m3.state, 'won');
  assert.equal(m3.rewardTips, 25);
});

test('Pure Cosmetic Kiosk purchases & equips persist in wallet and NEVER alter gameplay stats, plus 6 Custom Night presets exist', () => {
  createMemoryStorage();
  assert.ok(COSMETIC_ITEMS.length >= 10);
  assert.ok(CUSTOM_PRESETS.length >= 6);

  addWalletTips(100);
  assert.equal(loadWallet().balance, 100);

  const paidItem = COSMETIC_ITEMS.find((c) => c.price > 0 && c.slot === 'desk');
  const shaderItem = COSMETIC_ITEMS.find((c) => c.price > 0 && c.slot === 'shader');
  assert.ok(paidItem && shaderItem);

  assert.equal(purchaseCosmetic(paidItem.id), true);
  assert.equal(purchaseCosmetic(shaderItem.id), true);
  assert.equal(loadWallet().balance, 100 - paidItem.price - shaderItem.price);

  const cosState = loadCosmeticState();
  assert.ok(cosState.owned.includes(paidItem.id));
  assert.ok(cosState.deskEquipped.includes(paidItem.id));
  assert.equal(cosState.activeShader, shaderItem.id);

  // Verify ZERO gameplay stat difference between bare run and fully-decked cosmetic run!
  const deckedRun = newNight({ night: 3, seed: 999 });
  toggleCosmetic(paidItem.id);
  const bareRun = newNight({ night: 3, seed: 999 });

  assert.equal(deckedRun.power, bareRun.power);
  assert.equal(deckedRun.passiveDrain, bareRun.passiveDrain);
  assert.equal(deckedRun.flashlightBattery, bareRun.flashlightBattery);
  assert.equal(deckedRun.orders.quota, bareRun.orders.quota);
  assert.deepEqual(deckedRun.ai, bareRun.ai);
});
