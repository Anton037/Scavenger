import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACHIEVEMENTS,
  CAMERAS,
  computeShiftRank,
  CUSTOM_PRESETS,
  DEFAULT_SETTINGS,
  HOUR_SECONDS,
  NIGHT_CONFIGS,
} from '../src/fnafData.js';
import {
  advance,
  feedIsInterrupted,
  getFormattedShiftTime,
  getHourLabel,
  getUsageBars,
  hasMotionBlip,
  isEasterEgg1987,
  muteCall,
  newNight,
  resetBreaker,
  resetCameraFuse,
  ringKitchenBell,
  selectCam,
  STEP,
  toggleLeftDoor,
  toggleLeftLight,
  toggleMonitor,
  toggleRightDoor,
  toggleRightLight,
  turnAround,
} from '../src/game.js';

function simulate(run, seconds, inputFn = () => ({})) {
  const steps = Math.round(seconds / STEP);
  const events = [];
  for (let i = 0; i < steps; i++) {
    advance(run, inputFn(i), STEP);
    events.push(...run.events);
  }
  return events;
}

test('Night 1 initializes at 12 AM, 100% power, front booth view, mandatory quota 3, and 10 cameras', () => {
  const run = newNight({ night: 1, seed: 2026 });
  assert.equal(CAMERAS.length, 10);
  assert.equal(getHourLabel(run), '12 AM');
  assert.equal(run.power, 100);
  assert.equal(run.viewState, 'front');
  assert.equal(run.orders.quota, 3);
  assert.equal(getUsageBars(run), 1);
  assert.equal(run.animatronics.torge.room, '1A');
  assert.equal(run.animatronics.anton.room, '1A');
  assert.equal(run.animatronics.tom.room, '1A');
  assert.equal(run.animatronics.hauke.stage, 0);
});

test('Power usage scales 1..5 bars, only one hall light active, and monitor turns off lights', () => {
  const run = newNight({ night: 1, seed: 42 });
  assert.equal(getUsageBars(run), 1);
  toggleLeftDoor(run);
  assert.equal(getUsageBars(run), 2);
  toggleRightDoor(run);
  assert.equal(getUsageBars(run), 3);
  toggleLeftLight(run);
  assert.equal(getUsageBars(run), 4);
  toggleRightLight(run);
  assert.equal(run.leftLight, false);
  assert.equal(run.rightLight, true);
  assert.equal(getUsageBars(run), 4);

  toggleMonitor(run);
  assert.equal(run.monitorOpen, true);
  assert.equal(run.rightLight, false);
  assert.equal(getUsageBars(run), 4);
});

test('Power Outage follows authentic 3-phase FNAF 1 sequence (wait -> Torge jingle -> blackout -> jumpscare)', () => {
  const run = newNight({ night: 2, seed: 99 });
  run.power = 0.05;
  toggleLeftDoor(run);
  toggleMonitor(run);

  const ev1 = simulate(run, 1.0);
  assert.ok(ev1.some((e) => e.kind === 'power_out'));
  assert.equal(run.power, 0);
  assert.equal(run.leftDoor, false);
  assert.equal(run.monitorOpen, false);
  assert.equal(run.powerOutage.phase, 'wait');

  const ev2 = simulate(run, 9.0);
  assert.ok(ev2.some((e) => e.kind === 'torge_jingle_start'));
  assert.ok(run.powerOutage.phase === 'jingle' || run.powerOutage.phase === 'blackout');

  const ev3 = simulate(run, 18.0);
  assert.ok(ev3.some((e) => e.kind === 'jumpscare' && e.who === 'torge'));
  assert.equal(run.state, 'gameover');
  assert.equal(run.killedBy, 'torge');
});

test('Boss Hauke Earthquake Sprint shakes booth, slams closed Left Shutter, trips Main Breaker, and kills if open', () => {
  const blocked = newNight({ night: 4, seed: 101 });
  blocked.ai.hauke = 20;
  blocked.animatronics.hauke.stage = 3;
  blocked.animatronics.hauke.sprint.active = true;
  blocked.animatronics.hauke.sprint.waitTimer = 6;
  toggleLeftDoor(blocked);
  toggleMonitor(blocked);
  selectCam(blocked, '2A');
  assert.equal(blocked.animatronics.hauke.sprint.triggered, true);

  const powerBefore = blocked.power;
  const evBlock = simulate(blocked, 2.8);
  assert.ok(evBlock.some((e) => e.kind === 'hauke_stomp'));
  assert.ok(evBlock.some((e) => e.kind === 'hauke_door_slam'));
  assert.equal(blocked.stats.haukeBlocked, 1);
  assert.equal(blocked.breakerTripped, true);
  assert.ok(blocked.power < powerBefore - 1);
  assert.equal(blocked.monitorOpen, false);
  assert.equal(toggleMonitor(blocked), false);

  // Turn 180° to Back Wall and pull Main Breaker Lever!
  turnAround(blocked);
  assert.equal(resetBreaker(blocked), true);
  turnAround(blocked);
  assert.equal(toggleMonitor(blocked), true);

  // Open Left Shutter -> Hauke rush jumpscare!
  const killed = newNight({ night: 4, seed: 102 });
  killed.ai.hauke = 20;
  killed.animatronics.hauke.stage = 3;
  killed.animatronics.hauke.sprint.active = true;
  killed.animatronics.hauke.sprint.waitTimer = 0.05;
  const evKill = simulate(killed, 3.2);
  assert.ok(evKill.some((e) => e.kind === 'jumpscare' && e.who === 'hauke'));
  assert.equal(killed.killedBy, 'hauke');
});

test('Lost Anton triggers window sting, jams Left Shutter on breach, and jumpscares if player stays unhidden', () => {
  const run = newNight({ night: 5, seed: 404 });
  run.ai = { torge: 0, anton: 20, tom: 0, hauke: 0, duck: 0 };
  run.animatronics.anton.room = 'left_door';
  toggleLeftLight(run);
  assert.ok(run.events.some((e) => e.kind === 'window_sting' && e.who === 'anton'));

  // Leave left door open so Anton breaches into office
  run.animatronics.anton.timer = 0.01;
  simulate(run, 0.1);
  assert.equal(run.animatronics.anton.room, 'office');
  assert.equal(run.leftJammed, true);
  assert.equal(toggleLeftDoor(run), false);

  // Failing to duck under desk within reaction window -> Anton jumpscare!
  simulate(run, 2.6);
  assert.equal(run.state, 'jumpscare');
  assert.equal(run.killedBy, 'anton');
});

test('Chef Torge advances into Center Pass-Through and stalls on CCTV', () => {
  const run = newNight({ night: 5, seed: 505 });
  run.ai = { torge: 20, anton: 0, tom: 0, hauke: 0, duck: 0 };
  simulate(run, 4.0);
  assert.equal(run.animatronics.torge.room, '1A');

  run.animatronics.anton.room = '1B';
  const ev = simulate(run, 3.5);
  assert.equal(run.animatronics.torge.room, '1B');
  assert.ok(ev.some((e) => e.kind === 'torge_laugh'));

  toggleMonitor(run);
  selectCam(run, '1B');
  simulate(run, 6.5);
  assert.equal(run.animatronics.torge.room, '1B');
  assert.ok(run.stats.torgeStalled >= 1);
});

test('Filthy Duck Suit spawns from CAM 2B anomaly, banishes when monitor flips up, and 1-9-8-7 triggers instant code jumpscare', () => {
  assert.equal(isEasterEgg1987({ torge: 1, anton: 9, tom: 8, hauke: 7 }), true);
  const egg = newNight({ night: 7, customAi: { torge: 1, anton: 9, tom: 8, hauke: 7 } });
  assert.equal(egg.state, 'jumpscare');
  assert.equal(egg.killedBy, 'duck');

  const run = newNight({ night: 3, seed: 606 });
  toggleMonitor(run);
  run.goldenPoster = true;
  toggleMonitor(run); // close -> Duck Suit manifests in Front Booth!
  assert.equal(run.duck.active, true);
  toggleMonitor(run); // flip back up without flashing -> banished!
  assert.equal(run.duck.active, false);
  assert.equal(run.stats.goldenBanished, 1);
});

test('Full Night 1 reaches 6:00 AM victory when Mandatory Order Quota is fulfilled', () => {
  const run = newNight({ night: 1, seed: 777 });
  simulate(run, 4.0);
  assert.ok(run.callText.length > 0);
  muteCall(run);
  assert.equal(run.callMuted, true);

  run.ai = { torge: 0, anton: 0, tom: 0, hauke: 0, duck: 0 };
  run.orders.completed = run.orders.quota;
  run.time = HOUR_SECONDS * 5 + 53;
  run.hour = 5;
  const ev = simulate(run, 3.0);
  assert.equal(run.state, 'won');
  assert.ok(ev.some((e) => e.kind === 'win_6am'));
  assert.equal(NIGHT_CONFIGS[6].title, 'NACHT 6');
});

test('Antons video call telegraphs its deadline and can be cancelled by changing feeds', () => {
  const run = newNight({ night: 7, seed: 717, customAi: { anton: 20 } });
  run.animatronics.anton.timer = 30;
  toggleMonitor(run);
  const events = simulate(run, 4.5);
  assert.equal(events.filter((e) => e.kind === 'anton_video_warning').length, 1);
  assert.ok(run.antonVideo.deadline > run.time + 3);
  selectCam(run, '3');
  assert.equal(run.stats.videoDodges, 1);
});

test('Kitchen audio lure on CAM 6 costs 0% power, lures Tom from east/hatch, and slows Torge', () => {
  const run = newNight({ night: 7, seed: 719, customAi: { tom: 12, torge: 10 } });
  run.animatronics.tom.room = 'right_door';
  run.animatronics.torge.room = '6';
  run.animatronics.torge.timer = 1.0;
  toggleMonitor(run);
  selectCam(run, '6');
  const pwrBefore = run.power;
  assert.equal(ringKitchenBell(run), true);
  assert.equal(run.animatronics.tom.room, '6');
  assert.equal(run.stats.tomLured, 1);
  assert.equal(run.power, pwrBefore);
  assert.ok(run.animatronics.torge.timer >= 5.0);
  assert.equal(feedIsInterrupted(run), false);
});

test('Locking both doors AFK drains battery to 0% before 6 AM (no double-door cheese)', () => {
  const run = newNight({ night: 1, seed: 1234 });
  run.ai = { torge: 0, anton: 0, tom: 0, hauke: 0, duck: 0 };
  run.nightCfg = { ...run.nightCfg, hourlyBumps: {} };
  toggleLeftDoor(run);
  toggleRightDoor(run);
  simulate(run, HOUR_SECONDS * 6);
  assert.equal(run.power, 0);
  assert.notEqual(run.state, 'won');
});

test('Smooth camera inertia, CCTV motion blips, formatted shift time, rank grading, and 6 Custom Night presets are valid', () => {
  const run = newNight({ night: 4, seed: 912 });
  assert.equal(getFormattedShiftTime(run), '00:00');
  simulate(run, 0.5, () => ({ lookDelta: 2.0 }));
  assert.ok(run.lookX > 0.5);

  run.ai.hauke = 20;
  run.animatronics.hauke.stage = 1;
  run.animatronics.hauke.timer = STEP;
  simulate(run, 0.5);
  assert.equal(run.animatronics.hauke.stage, 2);
  assert.equal(hasMotionBlip(run, '1C'), true);

  assert.ok(ACHIEVEMENTS.length >= 16);
  assert.equal(CUSTOM_PRESETS.length, 6);
  assert.ok(!('graphics' in DEFAULT_SETTINGS)); // v2.3: one unified PSX+ style, no graphics modes
  assert.equal(DEFAULT_SETTINGS.audioSubtitles, false);

  const highRun = newNight({ night: 5, seed: 915 });
  highRun.power = 52;
  assert.equal(computeShiftRank(highRun).grade, 'S+');

  const lowRun = newNight({ night: 2, seed: 916 });
  lowRun.power = 4;
  assert.equal(computeShiftRank(lowRun).grade, 'C');
});
