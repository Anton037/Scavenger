import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMERAS, HOUR_SECONDS, NIGHT_CONFIGS } from '../src/fnafData.js';
import {
  advance,
  getHourLabel,
  getUsageBars,
  honkPoster,
  isEasterEgg1987,
  muteCall,
  newNight,
  selectCam,
  STEP,
  toggleLeftDoor,
  toggleLeftLight,
  toggleMonitor,
  toggleRightDoor,
  toggleRightLight,
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

test('Night 1 initializes at 12 AM, 100% power, 1 usage bar, and 10 cameras', () => {
  const run = newNight({ night: 1, seed: 2026 });
  assert.equal(CAMERAS.length, 10);
  assert.equal(getHourLabel(run), '12 AM');
  assert.equal(run.power, 100);
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
  assert.equal(getUsageBars(run), 4); // Base + LDoor + RDoor + Monitor
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

test('Boss Hauke Earthquake Sprint shakes Office, slams closed Left Door with power drain, and jumpscares if door is open', () => {
  // Case 1: Left door CLOSED -> colossal earthquake slam + 1% then 6% power drain!
  const blocked = newNight({ night: 4, seed: 101 });
  blocked.ai.hauke = 20;
  blocked.animatronics.hauke.stage = 3;
  blocked.animatronics.hauke.sprint.active = true;
  blocked.animatronics.hauke.sprint.waitTimer = 6;
  toggleLeftDoor(blocked);
  toggleMonitor(blocked);
  selectCam(blocked, '2A'); // Looking at CAM 2A immediately triggers sprint!
  assert.equal(blocked.animatronics.hauke.sprint.triggered, true);

  const powerBefore = blocked.power;
  const evBlock = simulate(blocked, 2.8);
  assert.ok(evBlock.some((e) => e.kind === 'hauke_stomp'));
  assert.ok(evBlock.some((e) => e.kind === 'hauke_door_slam' && e.drain === 1));
  assert.equal(blocked.stats.haukeBlocked, 1);
  assert.ok(blocked.quake > 0.3);
  assert.ok(blocked.power < powerBefore - 1);
  assert.equal(blocked.state, 'playing');

  // Case 2: Left door OPEN -> Boss Hauke jumpscare!
  const killed = newNight({ night: 4, seed: 102 });
  killed.ai.hauke = 20;
  killed.animatronics.hauke.stage = 3;
  killed.animatronics.hauke.sprint.active = true;
  killed.animatronics.hauke.sprint.waitTimer = 0.05;
  const evKill = simulate(killed, 3.2);
  assert.ok(evKill.some((e) => e.kind === 'jumpscare' && e.who === 'hauke'));
  assert.equal(killed.killedBy, 'hauke');
});

test('Boss Hauke is camera-locked while CCTV monitor is open (authentic FNAF 1 Foxy rule)', () => {
  const run = newNight({ night: 6, seed: 303 });
  run.ai.hauke = 20;
  toggleMonitor(run);
  simulate(run, 12.0);
  assert.equal(run.animatronics.hauke.stage, 0);
});

test('Lost Anton & Schnorrer Tom trigger window stings, jam doors when sneaking in, and jumpscare on monitor close', () => {
  const run = newNight({ night: 5, seed: 404 });
  run.ai.anton = 20;
  run.animatronics.anton.room = 'left_door';
  toggleLeftLight(run);
  assert.ok(run.events.some((e) => e.kind === 'window_sting' && e.who === 'anton'));

  // Leave left door open so Anton slips in
  run.animatronics.anton.timer = 0.01;
  simulate(run, 0.1);
  assert.equal(run.animatronics.anton.room, 'office');
  assert.equal(run.leftJammed, true);
  assert.equal(toggleLeftDoor(run), false);

  // Flip monitor up then down -> Anton jumpscares!
  toggleMonitor(run);
  toggleMonitor(run);
  assert.equal(run.state, 'jumpscare');
  assert.equal(run.killedBy, 'anton');
});

test('Chef Torge stays on stage while Anton/Tom are present, stalls when watched on CAM 4B, and laughs when moving', () => {
  const run = newNight({ night: 5, seed: 505 });
  run.ai.torge = 20;
  run.ai.anton = 0;
  run.ai.tom = 0;
  simulate(run, 4.0);
  assert.equal(run.animatronics.torge.room, '1A'); // Anton & Tom still on 1A

  run.animatronics.anton.room = '1B';
  run.animatronics.tom.room = '1B';
  const ev = simulate(run, 3.5);
  assert.equal(run.animatronics.torge.room, '1B');
  assert.ok(ev.some((e) => e.kind === 'torge_laugh'));

  // Watching Torge on CAM 4B stalls him cleanly
  run.animatronics.torge.room = '4B';
  run.animatronics.torge.pathIdx = 4;
  toggleMonitor(run);
  selectCam(run, '4B');
  simulate(run, 7.0);
  assert.equal(run.animatronics.torge.room, '4B');
  assert.ok(run.stats.torgeStalled >= 1);
});

test('Goldene Ente spawns from CAM 2B poster, banishes when monitor flips up, and 1-9-8-7 Custom Night triggers instant Easter Egg', () => {
  assert.equal(isEasterEgg1987({ torge: 1, anton: 9, tom: 8, hauke: 7 }), true);
  const egg = newNight({ night: 7, customAi: { torge: 1, anton: 9, tom: 8, hauke: 7 } });
  assert.equal(egg.state, 'jumpscare');
  assert.equal(egg.killedBy, 'duck');

  const run = newNight({ night: 3, seed: 606 });
  toggleMonitor(run);
  run.goldenPoster = true;
  toggleMonitor(run); // close -> Golden Duck appears in Office!
  assert.equal(run.goldenActive, true);
  toggleMonitor(run); // flip back up -> banished!
  assert.equal(run.goldenActive, false);
  assert.equal(run.stats.goldenBanished, 1);
});

test('Full Night 1 reaches 6:00 AM victory with hourly AI bumps, Phone Guy call, and poster honk', () => {
  const run = newNight({ night: 1, seed: 777 });
  assert.equal(honkPoster(run), true);
  assert.equal(run.stats.posterHonks, 1);

  simulate(run, 4.0);
  assert.ok(run.callText.length > 0);
  muteCall(run);
  assert.equal(run.callMuted, true);

  // Fast-forward near 6 AM with AI 0 to verify clean clock transition
  run.ai = { torge: 0, anton: 0, tom: 0, hauke: 0 };
  run.time = HOUR_SECONDS * 5 + 53;
  run.hour = 5;
  const ev = simulate(run, 3.0);
  assert.equal(run.state, 'won');
  assert.ok(ev.some((e) => e.kind === 'win_6am'));
  assert.equal(NIGHT_CONFIGS[6].title, 'NACHT 6');
});

test('Horror sound cues fire for office breathing, Hauke cove hum, CAM 6 kitchen pulse, and Phone Guy text', () => {
  const run = newNight({ night: 2, seed: 808 });
  run.ai.hauke = 5;
  run.animatronics.tom.room = '6';
  run.animatronics.anton.room = 'office';
  run.kitchenAudioTimer = 0.05;
  run.officeBreathTimer = 0.05;
  run.haukeHumTimer = 0.05;
  toggleMonitor(run);
  selectCam(run, '6');

  const ev = simulate(run, 2.5);
  assert.ok(ev.some((e) => e.kind === 'kitchen_clatter' && e.loud === true));
  assert.ok(ev.some((e) => e.kind === 'office_breath' && e.side === 'left'));
  assert.ok(ev.some((e) => e.kind === 'hauke_hum'));
  assert.ok(ev.some((e) => e.kind === 'phone_ring' && typeof e.text === 'string' && e.text.length > 10));
});
