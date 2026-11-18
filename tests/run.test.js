import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advance,
  descendNextFloor,
  finishRunCashOut,
  interaction,
  LIFT_WAIT,
  newRun,
  STEP,
} from '../src/game.js';
import { buildDungeon } from '../src/level.js';

function idle(run, seconds) {
  for (let frame = 0; frame < Math.ceil(seconds / STEP); frame++) advance(run);
}

function follow(run, destination) {
  const { clearPath, route } = run.map;
  const gap = (point) => Math.hypot(point.x - run.player.x, point.z - run.player.z);
  for (let frame = 0; frame < 4800 && run.state === 'playing'; frame++) {
    if (gap(destination) < 0.25) return;
    const path = route(run.player, destination);
    while (path.length && gap(path[0]) < 0.16) path.shift();
    while (path.length > 1 && clearPath(run.player, path[1], 0.27, true)) path.shift();
    assert.ok(path.length, 'expected a waypoint toward the destination');
    const waypoint = path[0];
    const angle = Math.atan2(waypoint.z - run.player.z, waypoint.x - run.player.x);
    advance(run, { x: Math.cos(angle), z: Math.sin(angle) });
  }
  assert.fail(`could not reach ${destination.name ?? 'the lift'} while playing`);
}

function place(point, destination) {
  point.x = destination.x;
  point.z = destination.z;
}

test('procedural dungeon connectivity and floor scaling hold across 10 seeds', () => {
  for (let seed = 1001; seed <= 1010; seed++) {
    for (const floor of [1, 3]) {
      const map = buildDungeon(seed, floor);
      assert.equal(map.walkable(0, 0), false);
      assert.equal(map.records.length, floor >= 3 ? 4 : 3);
      assert.ok(map.crates.length >= 6);
      assert.ok(map.barrels.length >= 3);
      for (const destination of [map.lift, ...map.records, ...map.patrol]) {
        assert.ok(map.walkable(destination.x, destination.z), `walkable point on seed ${seed} E${floor}`);
        const path = map.route(map.spawn, destination);
        assert.ok(path.length > 0, `reachable route on seed ${seed} E${floor}`);
        let prev = map.spawn;
        for (const step of path) {
          assert.ok(map.clearPath(prev, step, 0.25, true), `clear segment on seed ${seed} E${floor}`);
          prev = step;
        }
        assert.deepEqual(prev, destination);
      }
    }
  }
});

test('dash gives a burst of motion, a single loud pulse, and respects cooldown', () => {
  const run = newRun({ seed: 2026, floor: 1, loadout: 'classic' });
  const startZ = run.player.z;
  advance(run, { z: -1, dash: true });
  assert.ok(run.player.z < startZ - 0.1);
  assert.ok(run.player.cooldown > 2);
  assert.equal(run.events.filter((event) => event.kind === 'dash').length, 1);
  advance(run, { z: -1, dash: true });
  assert.equal(run.events.filter((event) => event.kind === 'dash').length, 0);
});

test('loadouts customize starting speed, pan radius, and clapper stock', () => {
  const runner = newRun({ seed: 2026, floor: 1, loadout: 'runner' });
  const brawler = newRun({ seed: 2026, floor: 1, loadout: 'brawler' });
  assert.equal(runner.player.clappers, 4);
  assert.ok(runner.player.speedMult > 1.1);
  assert.ok(brawler.player.novaRadius > runner.player.novaRadius);
});

test('the lamp exposes Chef Torge while darkness conceals him in open room sightlines', () => {
  const lit = newRun({ seed: 4242, floor: 1 });
  const dark = newRun({ seed: 4242, floor: 1 });
  const hall = lit.map.rooms[1];
  for (const run of [lit, dark]) {
    run.cans.length = 0;
    place(run.player, { x: hall.cx - 1.4, z: hall.cz });
    place(run.listener, { x: hall.cx + 1.4, z: hall.cz });
    assert.ok(run.map.clearPath(run.listener, run.player), 'expected clear line across hall');
    run.listener.target = { ...run.listener };
    run.listener.mode = 'search';
    run.listener.searchUntil = 2;
  }
  advance(dark, { lamp: true });
  idle(lit, 0.42);
  idle(dark, 0.42);
  assert.equal(lit.listener.mode, 'hunt');
  assert.equal(dark.listener.mode, 'search');
});

test('clappers land on walkable floor, emit one noise pulse, and attract Anton', () => {
  const run = newRun({ seed: 3030, floor: 1 });
  const hall = run.map.rooms[1];
  place(run.player, { x: hall.cx, z: hall.cz + 1.1 });
  place(run.listener, { x: hall.cx + 1.8, z: hall.cz - 1.2 });
  run.listener.mode = 'search';
  run.listener.searchUntil = 6;
  advance(run, { lamp: true, angle: -Math.PI / 2, lure: true });
  assert.equal(run.player.clappers, 1);
  const destination = run.throws[0].to;
  assert.ok(run.map.walkable(destination.x, destination.z, 0.08));
  idle(run, 1.0);
  assert.equal(run.throws.length, 0);
  assert.equal(run.pulses.filter((pulse) => pulse.kind === 'clapper').length, 1);
  assert.equal(run.listener.mode, 'investigate');
  assert.deepEqual(run.listener.target, destination);
});

test('Chef-Schelle bonks enemies, smashes crates, and detonates barrels with Hauke splash damage', () => {
  const run = newRun({ seed: 5050, floor: 1 });
  const hall = run.map.rooms[1];
  place(run.player, { x: hall.cx, z: hall.cz });
  place(run.listener, { x: hall.cx, z: hall.cz - 1.1 });
  place(run.tom, { x: hall.cx + 0.8, z: hall.cz });
  place(run.hauke, { x: hall.cx + 1.8, z: hall.cz });

  const targetCrate = run.crates[0];
  targetCrate.x = hall.cx - 0.9;
  targetCrate.z = hall.cz;
  targetCrate.broken = false;

  const targetBarrel = run.barrels[0];
  targetBarrel.x = hall.cx + 1.2;
  targetBarrel.z = hall.cz;
  targetBarrel.exploded = false;

  advance(run, { bonk: true });
  assert.ok(run.listener.stunned > 2.0, 'Lost Anton should be stunned by Chef-Schelle');
  assert.ok(run.tom.stunned > 2.0, 'Tom should be stunned by Chef-Schelle');
  assert.equal(targetCrate.broken, true, 'Crate inside Schelle radius should shatter');
  assert.ok(run.stats.crates >= 1);
  assert.ok(targetBarrel.fuse > 0, 'Barrel should start fuse after hit');

  idle(run, 0.35);
  assert.equal(targetBarrel.exploded, true, 'Barrel fuse should detonate');
  assert.ok(run.stats.barrels >= 1);
  assert.ok(run.hauke.hp <= 25, 'Barrel explosion should heavily damage nearby Hauke');
});

test('collecting all relics unlocks the lift, offers Chef-Mods, descends to Floor 2, and supports cash-out', () => {
  const run = newRun({ seed: 2026, floor: 1 });
  place(run.player, run.map.lift);
  assert.equal(interaction(run).enabled, false);
  advance(run, { use: true });
  assert.equal(run.lift.state, 'idle');

  for (const record of run.map.records) run.records.add(record.id);
  advance(run, { use: true });
  assert.equal(run.lift.state, 'calling');
  place(run.player, run.map.spawn);
  idle(run, LIFT_WAIT + 0.1);
  assert.equal(run.lift.state, 'ready');
  assert.equal(run.state, 'playing');

  place(run.player, run.map.lift);
  advance(run);
  assert.equal(run.state, 'floor_clear');
  assert.equal(run.modOffers.length, 3);

  const chosenMod = run.modOffers[0].id;
  descendNextFloor(run, chosenMod);
  assert.equal(run.floor, 2);
  assert.equal(run.state, 'playing');
  assert.equal(run.mods.has(chosenMod), true);
  assert.equal(run.records.size, 0);
  assert.equal(run.map.biome.id, 'freezer');

  finishRunCashOut(run);
  assert.equal(run.state, 'escaped');
});

test('a full procedural route collects every relic on Floor 1 and activates the Lastenaufzug', () => {
  const run = newRun({ seed: 7777, floor: 1, loadout: 'runner' });
  const { clearPath, route } = run.map;
  const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const navigate = (dest) => {
    for (let f = 0; f < 4800 && run.state === 'playing'; f++) {
      if (gap(run.player, dest) < 0.28) return;
      const path = route(run.player, dest);
      while (path.length && gap(run.player, path[0]) < 0.16) path.shift();
      while (path.length > 1 && clearPath(run.player, path[1], 0.27, true)) path.shift();
      const wp = path[0];
      const ang = Math.atan2(wp.z - run.player.z, wp.x - run.player.x);
      const nearThreat = gap(run.player, run.listener) < 1.85 || gap(run.player, run.hauke) < 2.1;
      const nearCrate = run.crates.some((c) => !c.broken && gap(run.player, c) < 1.2);
      advance(run, {
        x: Math.cos(ang),
        z: Math.sin(ang),
        bonk: nearThreat || nearCrate,
        dash: nearThreat && run.player.bonkCooldown > 0,
      });
    }
    assert.fail(`could not reach ${dest.name ?? 'the lift'} (${run.state})`);
  };
  advance(run, { lamp: true });
  for (const record of run.map.records) {
    navigate(record);
    assert.equal(interaction(run).record, record);
    advance(run, { use: true });
  }
  navigate(run.map.lift);
  advance(run, { use: true });
  for (let f = 0; f < Math.ceil((LIFT_WAIT + 0.25) / STEP) && run.state === 'playing'; f++) {
    const nearThreat = gap(run.player, run.listener) < 2.1 || gap(run.player, run.hauke) < 2.2;
    advance(run, { bonk: nearThreat });
  }
  if (run.state === 'playing') navigate(run.map.lift);
  assert.equal(run.records.size, run.map.records.length);
  assert.equal(run.state, 'floor_clear');
});

test('Chef-Krone absorbs the first hit, drops on the floor, and leaves Torge vulnerable until reclaimed', () => {
  const run = newRun({ seed: 8888, floor: 1 });
  const hall = run.map.rooms[1];
  place(run.player, { x: hall.cx, z: hall.cz });
  place(run.listener, { x: hall.cx, z: hall.cz });
  advance(run);
  assert.equal(run.state, 'playing');
  assert.equal(run.player.helmet, false);
  assert.ok(run.droppedHelmet);
  run.player.invuln = 0;
  advance(run);
  assert.equal(run.state, 'caught');
});
