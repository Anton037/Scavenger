import { LIFT, PATROL, RECORDS, SPAWN, clearPath, route, walkable, wetAt } from './level.js';

export const STEP = 1 / 60;
export const TOTAL_RECORDS = RECORDS.length;
export const LIFT_WAIT = 5;
const WALK = 2.8;
const DASH_TIME = 0.26;
const DASH_COOLDOWN = 2.4;
const USE_RANGE = 1.31;
const START_LISTENER = { x: 18.4, z: 9.25 };
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const location = (point) => ({ x: point.x, z: point.z });

export function newRun() {
  return {
    state: 'playing',
    time: 0,
    player: { ...SPAWN, angle: -Math.PI / 2, lamp: true, dash: 0, cooldown: 0, dx: 0, dz: 0,
      stride: 0, moving: false, wet: false, stepIn: 0, clappers: 2, noise: 0 },
    listener: { ...START_LISTENER, angle: Math.PI / 2, mode: 'patrol', target: PATROL[0],
      patrol: 0, awareness: 0, lastSeen: 0, searchUntil: 0, path: [], replanAt: 0, pulseSeen: new Set(), moving: false },
    records: new Set(),
    lift: { state: 'idle', remaining: LIFT_WAIT },
    notices: [],
    pulses: [],
    throws: [],
    events: [],
    pulseSerial: 0,
  };
}

function shiftBody(body, dx, dz, radius) {
  if (walkable(body.x + dx, body.z, radius)) body.x += dx;
  if (walkable(body.x, body.z + dz, radius)) body.z += dz;
}

function makeNoise(run, kind, point, reach) {
  run.pulses.push({ id: ++run.pulseSerial, ...location(point), reach, age: 0, kind });
  run.events.push({ kind, ...location(point) });
  if (point === run.player) run.player.noise = Math.max(run.player.noise, reach);
}

function tell(run, message) {
  run.notices.splice(0, run.notices.length, { message, until: run.time + 5.4 });
}

export function interaction(run) {
  const record = RECORDS.find((item) => !run.records.has(item.id) && distance(item, run.player) < USE_RANGE);
  if (record) return { text: `Recover ${record.name.toLowerCase()}`, record, enabled: true };
  if (distance(run.player, LIFT) > USE_RANGE) return null;
  const missing = TOTAL_RECORDS - run.records.size;
  if (missing) return { text: `Lift locked · ${missing} ${missing === 1 ? 'record' : 'records'} missing`, enabled: false };
  if (run.lift.state === 'idle') return { text: 'Call the lift', enabled: true };
  return { text: run.lift.state === 'calling' ? 'Stay near the lift' : 'Step onto the lift', enabled: false };
}

function use(run) {
  const action = interaction(run);
  if (!action?.enabled) return;
  if (action.record) {
    run.records.add(action.record.id);
    makeNoise(run, 'record', run.player, 4.2);
    tell(run, action.record.discovery);
  } else {
    run.lift.state = 'calling';
    makeNoise(run, 'lift', LIFT, 38);
    tell(run, 'The lift motor is audible throughout the works. Stay close.');
  }
}

function throwClapper(run) {
  const player = run.player;
  if (player.clappers === 0) return;
  const direction = { x: Math.cos(player.angle), z: Math.sin(player.angle) };
  let target = location(player);
  for (let step = 0.28; step < 6.2; step += 0.24) {
    const x = player.x + direction.x * step;
    const z = player.z + direction.z * step;
    if (!walkable(x, z, 0.08)) break;
    target = { x, z };
  }
  if (distance(player, target) < 0.5) return;
  player.clappers--;
  run.throws.push({ from: location(player), to: target, elapsed: 0, duration: 0.39 });
  run.events.push({ kind: 'throw', ...location(player) });
}

function movePlayer(run, input, dt) {
  const player = run.player;
  if (input.lamp) {
    player.lamp = !player.lamp;
    run.events.push({ kind: 'shutter', ...location(player) });
  }

  const x = input.x || 0;
  const z = input.z || 0;
  const magnitude = Math.hypot(x, z);
  let dx = x / Math.max(1, magnitude);
  let dz = z / Math.max(1, magnitude);
  if (Number.isFinite(input.angle)) player.angle = input.angle;
  else if (magnitude > 0.15) player.angle = Math.atan2(z, x);

  player.cooldown = Math.max(0, player.cooldown - dt);
  player.dash = Math.max(0, player.dash - dt);
  if (input.dash && player.cooldown === 0) {
    player.dash = DASH_TIME;
    player.cooldown = DASH_COOLDOWN;
    player.dx = magnitude > 0.15 ? x / magnitude : Math.cos(player.angle);
    player.dz = magnitude > 0.15 ? z / magnitude : Math.sin(player.angle);
    makeNoise(run, 'dash', player, 12);
  }

  player.wet = wetAt(player.x, player.z);
  let speed = player.wet ? WALK * 0.72 : WALK;
  if (player.dash > 0) {
    dx = player.dx;
    dz = player.dz;
    speed = 8.1;
  }
  const before = location(player);
  shiftBody(player, dx * speed * dt, dz * speed * dt, 0.26);
  const traveled = distance(before, player);
  player.moving = traveled > 0.002;
  player.stride += traveled;
  player.noise = Math.max(player.noise - dt * 10, 0);
  if (player.moving && player.dash === 0) {
    player.stepIn -= traveled;
    if (player.stepIn <= 0) {
      player.stepIn = player.wet ? 0.68 : 0.82;
      makeNoise(run, player.wet ? 'splash' : 'step', player, player.wet ? 8.2 : 2.7);
    }
  }
  if (input.use) use(run);
  if (input.lure) throwClapper(run);
}

function advanceSounds(run, dt) {
  const landed = [];
  for (const projectile of run.throws) {
    projectile.elapsed += dt;
    if (projectile.elapsed >= projectile.duration) landed.push(projectile);
  }
  for (const projectile of landed) makeNoise(run, 'clapper', projectile.to, 15.5);
  run.throws = run.throws.filter((projectile) => projectile.elapsed < projectile.duration);
  for (const pulse of run.pulses) pulse.age += dt;
  run.pulses = run.pulses.filter((pulse) => pulse.age < pulse.reach / 13 + 0.28);
}

function investigate(listener, target, time) {
  listener.mode = 'investigate';
  listener.target = location(target);
  listener.replanAt = time;
}

function hear(run) {
  const listener = run.listener;
  let loudest = null;
  let strength = -Infinity;
  for (const pulse of run.pulses) {
    if (listener.pulseSeen.has(pulse.id)) continue;
    const gap = distance(pulse, listener);
    const range = clearPath(pulse, listener) ? pulse.reach : pulse.reach * 0.63;
    if (gap > range || gap > pulse.age * 13) continue;
    listener.pulseSeen.add(pulse.id);
    if (range - gap > strength) {
      strength = range - gap;
      loudest = pulse;
    }
  }
  if (listener.pulseSeen.size > 32) {
    listener.pulseSeen = new Set(run.pulses.map((pulse) => pulse.id).filter((id) => listener.pulseSeen.has(id)));
  }
  return loudest;
}

function moveListener(run, dt) {
  const listener = run.listener;
  const player = run.player;
  const gap = distance(listener, player);
  const visible = gap < (player.lamp ? 6.0 : 1.9) && clearPath(listener, player);
  const sound = hear(run);

  listener.awareness = clamp(listener.awareness + (visible ? dt * (gap < 1.3 ? 9 : 3.4) : -dt * 1.8), 0, 1);
  if (visible && (listener.awareness >= 1 || listener.mode === 'hunt')) {
    if (listener.mode !== 'hunt') run.events.push({ kind: 'detected', ...location(listener) });
    listener.mode = 'hunt';
    listener.lastSeen = run.time;
    listener.target = location(player);
  } else if (listener.mode === 'hunt' && run.time - listener.lastSeen > 1.15) {
    investigate(listener, sound ?? listener.target, run.time);
  } else if (sound && listener.mode !== 'hunt') {
    investigate(listener, sound, run.time);
  }

  if (distance(listener, listener.target) < 0.48) {
    if (listener.mode === 'patrol') {
      listener.patrol = (listener.patrol + 1) % PATROL.length;
      listener.target = PATROL[listener.patrol];
      listener.replanAt = run.time;
    } else if (listener.mode === 'investigate') {
      listener.mode = 'search';
      listener.searchUntil = run.time + 1.8;
    }
  }
  if (listener.mode === 'search' && run.time >= listener.searchUntil) {
    listener.mode = 'patrol';
    listener.target = PATROL[listener.patrol];
    listener.replanAt = run.time;
  }

  listener.moving = false;
  if (listener.mode === 'search') {
    listener.angle += dt * 1.65;
    return;
  }
  if (listener.replanAt <= run.time) {
    listener.path = route(listener, listener.target);
    listener.replanAt = run.time + 0.24;
  }
  while (listener.path.length && distance(listener, listener.path[0]) < 0.16) listener.path.shift();
  while (listener.path.length > 1 && clearPath(listener, listener.path[1], 0.25)) listener.path.shift();
  const target = listener.path[0];
  if (!target) return;
  const heading = Math.atan2(target.z - listener.z, target.x - listener.x);
  const turn = Math.atan2(Math.sin(heading - listener.angle), Math.cos(heading - listener.angle));
  listener.angle += turn * Math.min(1, dt * 11);
  const speed = listener.mode === 'hunt' ? 3.25 : listener.mode === 'investigate' ? 2.36 : 1.49;
  const stride = Math.min(speed * dt, distance(listener, target));
  const before = location(listener);
  shiftBody(listener, Math.cos(heading) * stride, Math.sin(heading) * stride, 0.23);
  listener.moving = distance(listener, before) > 0.001;
}

export function advance(run, input = {}, dt = STEP) {
  run.events.length = 0;
  if (run.state !== 'playing') return run;
  run.time += dt;
  movePlayer(run, input, dt);
  advanceSounds(run, dt);
  moveListener(run, dt);
  if (run.notices.length && run.notices[0].until < run.time) run.notices.length = 0;

  if (distance(run.listener, run.player) < 0.53) {
    run.state = 'caught';
    run.events.push({ kind: 'caught' });
    return run;
  }
  if (run.lift.state === 'calling') {
    run.lift.remaining = Math.max(0, run.lift.remaining - dt);
    if (run.lift.remaining === 0) run.lift.state = 'ready';
  }
  if (run.lift.state === 'ready' && distance(run.player, LIFT) <= USE_RANGE) {
    run.state = 'escaped';
    run.events.push({ kind: 'escaped' });
  }
  return run;
}
