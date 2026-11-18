import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, interaction, LIFT_WAIT, newRun, STEP } from '../src/game.js';
import { BLOCKS, LIFT, PATROL, RECORDS, SPAWN, clearPath, route, walkable } from '../src/level.js';

function idle(run, seconds) {
  for (let frame = 0; frame < Math.ceil(seconds / STEP); frame++) advance(run);
}

function follow(run, destination) {
  const path = route(run.player, destination);
  const gap = (point) => Math.hypot(point.x - run.player.x, point.z - run.player.z);
  for (let frame = 0; frame < 4200 && run.state === 'playing'; frame++) {
    if (gap(destination) < 0.18) return;
    while (path.length && gap(path[0]) < 0.14) path.shift();
    while (path.length > 1 && clearPath(run.player, path[1], 0.27)) path.shift();
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

test('every record, lift, and patrol waypoint is navigable from the landing', () => {
  assert.equal(walkable(13.92, 28), false);
  assert.equal(walkable(BLOCKS[0].x, BLOCKS[0].z), false);
  for (const destination of [LIFT, ...RECORDS, ...PATROL]) {
    assert.ok(walkable(destination.x, destination.z), 'destination has room for a body');
    let position = SPAWN;
    for (const point of route(SPAWN, destination)) {
      assert.ok(clearPath(position, point, 0.25), `blocked route to ${destination.name ?? destination.x}`);
      position = point;
    }
    assert.deepEqual(position, destination);
  }
});

test('dash gives a burst of motion and a single loud pulse with a cooldown', () => {
  const run = newRun();
  advance(run, { z: -1, dash: true });
  assert.ok(run.player.z < SPAWN.z - 0.1);
  assert.ok(run.player.cooldown > 2);
  assert.equal(run.events.filter((event) => event.kind === 'dash').length, 1);
  advance(run, { z: -1, dash: true });
  assert.equal(run.events.filter((event) => event.kind === 'dash').length, 0);
});

test('the lamp exposes the diver at a distance that the shutter conceals', () => {
  const lit = newRun();
  const dark = newRun();
  for (const run of [lit, dark]) {
    place(run.player, { x: 19, z: 18.25 });
    place(run.listener, { x: 19, z: 14.1 });
    run.listener.target = { ...run.listener };
    run.listener.mode = 'search';
    run.listener.searchUntil = 2;
  }
  advance(dark, { lamp: true });
  idle(lit, 0.38);
  idle(dark, 0.38);
  assert.equal(lit.listener.mode, 'hunt');
  assert.equal(dark.listener.mode, 'search');
});

test('clappers reach a floor point, emit one noise, and attract the Listener', () => {
  const run = newRun();
  place(run.player, { x: 18.6, z: 17.9 });
  place(run.listener, { x: 24.6, z: 13.1 });
  run.listener.mode = 'search';
  run.listener.searchUntil = 6;
  advance(run, { lamp: true, angle: -Math.PI / 2, lure: true });
  assert.equal(run.player.clappers, 1);
  const destination = run.throws[0].to;
  assert.ok(walkable(destination.x, destination.z, 0.08));
  idle(run, 1.0);
  assert.equal(run.throws.length, 0);
  assert.equal(run.pulses.filter((pulse) => pulse.kind === 'clapper').length, 1);
  assert.equal(run.listener.mode, 'investigate');
  assert.deepEqual(run.listener.target, destination);
});

test('a locked lift waits for every record and requires the diver to board', () => {
  const run = newRun();
  place(run.player, LIFT);
  assert.equal(interaction(run).enabled, false);
  advance(run, { use: true });
  assert.equal(run.lift.state, 'idle');
  for (const record of RECORDS) run.records.add(record.id);
  advance(run, { use: true });
  assert.equal(run.lift.state, 'calling');
  place(run.player, SPAWN);
  idle(run, LIFT_WAIT + 0.1);
  assert.equal(run.lift.state, 'ready');
  assert.equal(run.state, 'playing');
  place(run.player, LIFT);
  advance(run);
  assert.equal(run.state, 'escaped');
});

test('a full stealth route recovers all three records and escapes with the patrol active', () => {
  const run = newRun();
  advance(run, { lamp: true });
  for (const record of RECORDS) {
    follow(run, record);
    assert.equal(interaction(run).record, record);
    advance(run, { use: true });
  }
  follow(run, LIFT);
  advance(run, { use: true });
  idle(run, LIFT_WAIT + 0.1);
  assert.equal(run.records.size, 3);
  assert.equal(run.state, 'escaped');
});
