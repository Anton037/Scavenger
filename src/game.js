import {
  INITIAL_CANS, LIFT, PATROL, PATROL_HAUKE, PATROL_TOM, RECORDS, SPAWN, VALVES, VENDING,
  clearPath, route, walkable, wetAt,
} from './level.js';

export const STEP = 1 / 60;
export const TOTAL_RECORDS = RECORDS.length;
export const LIFT_WAIT = 5;
const WALK = 3.05;
const DASH_TIME = 0.28;
const DASH_COOLDOWN = 2.15;
const BONK_COOLDOWN = 1.85;
const USE_RANGE = 1.42;
const START_LISTENER = { x: 18.4, z: 9.25 };
const START_HAUKE = { x: 28.0, z: 25.3 };
const START_TOM = { x: 20.45, z: 16.0 };

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const location = (point) => ({ x: point.x, z: point.z });

const DEATH_QUOTES_ANTON = [
  'Anton war komplett lost, ist dir im Dunkeln aber direkt vor die Füße gestolpert.',
  'Lost Anton hat dich ohne Taschenlampe mit der Kellerwand verwechselt — Game Over.',
  'Slenderman-Anton wusste nicht wo Norden ist, aber seine Arme waren trotzdem länger.',
];

const DEATH_QUOTES_HAUKE = [
  'Massiv-Rund Hauke hat dich mit voller Schwerkraft überrollt!',
  'Ereignishorizont überschritten: Du wurdest in Haukes Bauch-Umlaufbahn gezogen.',
  'Haukes Bauchplatscher hat die gesamte Keller-Statik beendet.',
];

export function newRun() {
  return {
    state: 'playing',
    time: 0,
    caughtBy: 'anton',
    deathReason: DEATH_QUOTES_ANTON[0],
    cameraShake: 0,
    hitFlash: 0,
    pendingUpgrade: false,
    player: {
      ...SPAWN,
      angle: -Math.PI / 2,
      lamp: true,
      dash: 0,
      cooldown: 0,
      bonkCooldown: 0,
      swing: 0,
      sliding: 0,
      beanBoost: 0,
      nextToot: 0,
      clinkIn: 5.5,
      helmet: true,
      invuln: 0,
      dodgeBonusCooldown: 0,
      pfand: 1000,
      combo: 1,
      comboTimer: 0,
      maxCombo: 1,
      novaRadius: 2.25,
      speedMult: 1.0,
      dx: 0,
      dz: 0,
      stride: 0,
      moving: false,
      wet: false,
      stepIn: 0,
      clappers: 2,
      noise: 0,
    },
    listener: {
      ...START_LISTENER,
      angle: Math.PI / 2,
      mode: 'patrol',
      target: PATROL[0],
      patrol: 0,
      awareness: 0,
      lastSeen: 0,
      searchUntil: 0,
      path: [],
      replanAt: 0,
      pulseSeen: new Set(),
      moving: false,
      stunned: 0,
      stunImmune: 0,
      slipCooldown: 3.5,
      wasWet: false,
      stride: 0,
    },
    hauke: {
      ...START_HAUKE,
      angle: Math.PI,
      mode: 'patrol',
      target: PATROL_HAUKE[0],
      patrol: 0,
      path: [],
      replanAt: 0,
      moving: false,
      stunned: 0,
      stunImmune: 0,
      stompIn: 0.72,
      hp: 100,
      maxHp: 100,
      koTimer: 0,
      hitFlash: 0,
      knockouts: 0,
      chargeState: 'none',
      chargeTimer: 0,
      chargeCooldown: 4.5,
      chargeDirX: 0,
      chargeDirZ: 0,
      stride: 0,
    },
    tom: {
      ...START_TOM,
      angle: 0,
      mode: 'patrol',
      target: PATROL_TOM[0],
      patrol: 0,
      path: [],
      replanAt: 0,
      moving: false,
      stunned: 0,
      stunImmune: 0,
      stealCooldown: 0,
      stride: 0,
    },
    records: new Set(),
    cans: INITIAL_CANS.map((can) => ({ ...can, vx: 0, vz: 0, collected: false })),
    valves: VALVES.map((valve) => ({ ...valve, cooldown: 0, active: 0 })),
    vendingCooldown: 0,
    droppedHelmet: null,
    lift: { state: 'idle', remaining: LIFT_WAIT },
    notices: [],
    barks: [],
    vfx: [],
    pulses: [],
    throws: [],
    events: [],
    pulseSerial: 0,
    stats: {
      bonks: 0,
      slips: 0,
      cans: 0,
      stolen: 0,
      toots: 0,
      valves: 0,
      upgrades: 0,
      haukeKos: 0,
      dodges: 0,
      wallSlams: 0,
    },
  };
}

function addAura(run, baseAmount, bumpCombo = true) {
  const { player } = run;
  if (bumpCombo) {
    player.combo = Math.min(8, (player.combo || 1) + (player.comboTimer > 0 ? 1 : 0));
    player.comboTimer = 8.5;
    player.maxCombo = Math.max(player.maxCombo || 1, player.combo);
  }
  const mult = 1 + (player.combo - 1) * 0.25;
  const gained = Math.round(baseAmount * mult);
  player.pfand += gained;
  return gained;
}

function bark(run, target, text, tone = 'gold', height = 1.9, duration = 1.25) {
  const id = ++run.pulseSerial;
  run.barks.push({
    id,
    x: target.x,
    z: target.z,
    y: height,
    text,
    tone,
    until: run.time + duration,
    duration,
  });
  if (run.barks.length > 6) run.barks.shift();
}

function spawnVfx(run, kind, point, extra = {}) {
  run.vfx.push({ kind, x: point.x, z: point.z, angle: point.angle ?? 0, ...extra });
}

export function applyUpgrade(run, kind) {
  if (!run) return;
  run.pendingUpgrade = false;
  run.stats.upgrades++;
  if (kind === 'nova') {
    run.player.novaRadius += 0.85;
    addAura(run, 1000, true);
    bark(run, run.player, 'MEGA-SCHELLE!', 'jade', 2.1, 1.5);
  } else if (kind === 'speed') {
    run.player.speedMult += 0.22;
    addAura(run, 1000, true);
    bark(run, run.player, 'CREATIN +25%!', 'cyan', 2.1, 1.5);
  } else {
    addAura(run, 2500, true);
    run.player.clappers = Math.min(5, run.player.clappers + 2);
    run.player.helmet = true;
    run.droppedHelmet = null;
    bark(run, run.player, '+2.500 ⚡ & KRONE!', 'gold', 2.1, 1.6);
  }
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

function tell(run, message, duration = 2.9) {
  run.notices.splice(0, run.notices.length, { message, until: run.time + duration });
}

function damageHauke(run, dmg, sourceLabel) {
  const { hauke, player } = run;
  if (hauke.koTimer > 0) return;
  hauke.hp = Math.max(0, hauke.hp - dmg);
  hauke.hitFlash = 0.28;
  spawnVfx(run, 'bonk_hit', hauke, { color: 0xffb84d });
  if (hauke.hp <= 0) {
    hauke.koTimer = 14.0;
    hauke.stunned = 14.0;
    hauke.chargeState = 'none';
    hauke.knockouts = (hauke.knockouts || 0) + 1;
    run.stats.haukeKos = (run.stats.haukeKos || 0) + 1;
    run.cameraShake = Math.max(run.cameraShake, 0.85);
    run.hitFlash = 0.28;
    player.clappers = Math.min(5, player.clappers + 1);
    const bonus = addAura(run, 4000, true);
    run.events.push({ kind: 'ko', ...location(hauke) });
    spawnVfx(run, 'ko_explosion', hauke);
    bark(run, hauke, `FRESSKOMA! +${bonus} ⚡`, 'gold', 2.4, 1.8);
    tell(run, 'HAUKE IM FRESSKOMA (14s K.O.)! Goldene Pfand-Dose gedroppt!', 3.2);
  } else {
    const gained = addAura(run, 1400, true);
    bark(run, hauke, `${sourceLabel} -${dmg}%`, 'vermilion', 2.3, 1.3);
    bark(run, run.player, `+${gained} ⚡`, 'gold', 1.8, 1.0);
  }
}

export function interaction(run) {
  const record = RECORDS.find((item) => !run.records.has(item.id) && distance(item, run.player) < USE_RANGE);
  if (record) return { text: `${record.shortName ?? record.name} sichern`, record, enabled: true };

  if (run.droppedHelmet && distance(run.droppedHelmet, run.player) < USE_RANGE) {
    return { text: 'Chef-Krone aufsetzen', helmet: true, enabled: true };
  }

  const valve = run.valves.find((item) => item.cooldown <= 0 && distance(item, run.player) < USE_RANGE);
  if (valve) return { text: `${valve.name}`, valve, enabled: true };

  if (distance(VENDING, run.player) < USE_RANGE && run.vendingCooldown <= 0) {
    return { text: 'Späti-Automat: Booster & Dose', vending: true, enabled: true };
  }

  if (distance(run.player, LIFT) > USE_RANGE) return null;
  const missing = TOTAL_RECORDS - run.records.size;
  if (missing) {
    return {
      text: `Aufzug gesperrt (${missing}/3 fehlen)`,
      enabled: false,
    };
  }
  if (run.lift.state === 'idle') return { text: 'Aufzug rufen!', enabled: true };
  return {
    text: run.lift.state === 'calling' ? 'Plattform halten!' : 'Abhauen!',
    enabled: false,
  };
}

function reclaimCrown(run) {
  const { player } = run;
  player.helmet = true;
  run.droppedHelmet = null;
  run.events.push({ kind: 'crown_pickup', ...location(player) });
  spawnVfx(run, 'can_pickup', player, { color: 0xffb84d });
  const gained = addAura(run, 500, true);
  bark(run, player, `👑 KRONE! +${gained}`, 'gold', 2.0, 1.25);
}

function use(run) {
  const action = interaction(run);
  if (!action?.enabled) return;
  const { player } = run;

  if (action.record) {
    const rec = action.record;
    run.records.add(rec.id);
    if (rec.id === 'log') {
      player.novaRadius += 0.9;
      player.helmet = true;
      run.droppedHelmet = null;
    } else if (rec.id === 'cylinder') {
      player.speedMult += 0.22;
      player.beanBoost = Math.max(player.beanBoost, 3.0);
    } else {
      player.clappers = Math.min(5, player.clappers + 2);
      player.helmet = true;
      run.droppedHelmet = null;
    }
    const gained = addAura(run, rec.id === 'spool' ? 2500 : 2000, true);
    run.stats.upgrades++;
    makeNoise(run, 'record', player, 4.2);
    spawnVfx(run, 'ko_explosion', rec);
    tell(run, rec.discovery, 2.8);
    bark(run, player, `${rec.perk}! +${gained}`, 'gold', 2.1, 1.5);
  } else if (action.helmet) {
    reclaimCrown(run);
  } else if (action.valve) {
    action.valve.cooldown = 9;
    action.valve.active = 1.6;
    run.stats.valves++;
    run.cameraShake = Math.max(run.cameraShake, 0.45);
    makeNoise(run, 'valve', action.valve, 16);
    spawnVfx(run, 'valve_blast', action.valve);
    const gained = addAura(run, 800, true);
    bark(run, action.valve, `ZISCH! +${gained}`, 'vermilion', 1.6, 1.2);
    for (const enemy of [run.listener, run.hauke, run.tom]) {
      if (distance(enemy, action.valve) < 5.4) {
        enemy.stunned = Math.max(enemy.stunned, 3.6);
        if (enemy === run.hauke) enemy.chargeState = 'none';
        const pushAngle = Math.atan2(enemy.z - action.valve.z, enemy.x - action.valve.x);
        shiftBody(enemy, Math.cos(pushAngle) * 1.5, Math.sin(pushAngle) * 1.5, 0.25);
        if (enemy === run.hauke) damageHauke(run, 50, 'GEDÜNSTET!');
      }
    }
  } else if (action.vending) {
    run.vendingCooldown = 8.5;
    player.clappers = Math.min(5, player.clappers + 1);
    player.beanBoost = 6.0;
    player.nextToot = 1.6;
    const gained = addAura(run, 500, true);
    makeNoise(run, 'can', player, 6.0);
    spawnVfx(run, 'can_pickup', VENDING, { color: 0x38f2af });
    bark(run, player, `OVERDRIVE! +${gained}`, 'jade', 2.0, 1.3);
    tell(run, 'Pre-Workout gezündet! 6s Tempo-Boost & +1 Pfand-Dose!', 2.6);
  } else {
    run.lift.state = 'calling';
    makeNoise(run, 'lift', LIFT, 38);
    tell(run, 'ALARM! Aufzug fährt hoch — Hauke, Anton & Tom stürmen die Plattform!', 3.2);
    bark(run, LIFT, '🚨 LIFT KOMMT!', 'vermilion', 2.2, 1.6);
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
  bark(run, target, 'KÖDER!', 'cyan', 1.2, 1.0);
}

function swingWrench(run) {
  const { player } = run;
  if (player.bonkCooldown > 0) return;
  player.bonkCooldown = BONK_COOLDOWN;
  player.swing = 0.36;
  makeNoise(run, 'bonk', player, 9.5);
  run.cameraShake = Math.max(run.cameraShake, 0.24);
  spawnVfx(run, 'bonk_swing', player);

  const reach = player.novaRadius || 2.25;
  let hits = 0;

  if (distance(player, run.listener) < reach) {
    hits++;
    run.stats.bonks++;
    const canStun = run.listener.stunImmune <= 0;
    run.listener.stunned = canStun ? 2.5 : Math.max(run.listener.stunned, 0.65);
    if (canStun) run.listener.stunImmune = 4.2;
    const push = Math.atan2(run.listener.z - player.z, run.listener.x - player.x);
    shiftBody(run.listener, Math.cos(push) * 1.45, Math.sin(push) * 1.45, 0.24);
    const gained = addAura(run, 1000, true);
    spawnVfx(run, 'bonk_hit', run.listener, { color: 0xff3b56 });
    bark(run, run.listener, canStun ? `BONK! +${gained}` : `ABGEPRALLT! +${gained}`, 'gold', 2.4, 1.2);
  }

  if (distance(player, run.hauke) < reach) {
    hits++;
    run.stats.bonks++;
    const canStun = run.hauke.stunImmune <= 0 && run.hauke.chargeState !== 'rush';
    if (canStun) {
      run.hauke.stunned = Math.max(run.hauke.stunned, 2.2);
      run.hauke.stunImmune = 4.6;
      run.hauke.chargeState = 'none';
    }
    const push = Math.atan2(run.hauke.z - player.z, run.hauke.x - player.x);
    shiftBody(run.hauke, Math.cos(push) * (canStun ? 1.15 : 0.45), Math.sin(push) * (canStun ? 1.15 : 0.45), 0.24);
    damageHauke(run, run.hauke.chargeState === 'rush' ? 18 : 35, 'SCHELLE!');
  }

  if (distance(player, run.tom) < reach) {
    hits++;
    run.tom.stunned = 3.2;
    run.stats.bonks++;
    player.clappers = Math.min(5, player.clappers + 1);
    const push = Math.atan2(run.tom.z - player.z, run.tom.x - player.x);
    shiftBody(run.tom, Math.cos(push) * 1.55, Math.sin(push) * 1.55, 0.24);
    const gained = addAura(run, 1400, true);
    spawnVfx(run, 'coin_burst', run.tom);
    bark(run, run.tom, `SCHELLE! +${gained} & DOSE`, 'jade', 1.6, 1.3);
  }

  if (hits >= 2) {
    const bonus = addAura(run, 800, true);
    bark(run, player, `${hits}× DOPPEL-SCHELLE! +${bonus}`, 'gold', 2.2, 1.4);
  }

  if (hits === 0 && distance(player, VENDING) < 1.85 && run.vendingCooldown <= 0) {
    run.vendingCooldown = 8.5;
    player.clappers = Math.min(5, player.clappers + 1);
    const gained = addAura(run, 500, true);
    spawnVfx(run, 'can_pickup', VENDING, { color: 0x38f2af });
    bark(run, VENDING, `+1 DOSE! +${gained}`, 'jade', 1.9, 1.2);
  }
}

function findCrownDropPoint(around) {
  const randomAngle = ((around.x * 13.7 + around.z * 7.3) % 1) * Math.PI * 2;
  for (let i = 0; i < 8; i++) {
    const a = randomAngle + (i * Math.PI) / 4;
    for (const dist of [3.2, 2.4, 1.6]) {
      const x = around.x + Math.cos(a) * dist;
      const z = around.z + Math.sin(a) * dist;
      if (walkable(x, z, 0.3)) return { x, z };
    }
  }
  return location(around);
}

function movePlayer(run, input, dt) {
  const player = run.player;
  if (input.lamp) {
    player.lamp = !player.lamp;
    run.events.push({ kind: 'shutter', ...location(player) });
    bark(run, player, player.lamp ? '🔦 LICHT AN' : '🌑 GETARNT', 'cyan', 1.85, 0.9);
  }

  if (player.comboTimer > 0) {
    player.comboTimer = Math.max(0, player.comboTimer - dt);
    if (player.comboTimer === 0) player.combo = 1;
  }

  const x = input.x || 0;
  const z = input.z || 0;
  const magnitude = Math.hypot(x, z);
  let dx = x / Math.max(1, magnitude);
  let dz = z / Math.max(1, magnitude);
  if (Number.isFinite(input.angle)) player.angle = input.angle;
  else if (magnitude > 0.15) player.angle = Math.atan2(z, x);

  player.cooldown = Math.max(0, player.cooldown - dt);
  player.bonkCooldown = Math.max(0, player.bonkCooldown - dt);
  player.swing = Math.max(0, player.swing - dt);
  player.sliding = Math.max(0, player.sliding - dt);
  player.invuln = Math.max(0, player.invuln - dt);
  player.dodgeBonusCooldown = Math.max(0, player.dodgeBonusCooldown - dt);
  run.vendingCooldown = Math.max(0, run.vendingCooldown - dt);
  run.cameraShake = Math.max(0, run.cameraShake - dt * 1.9);
  run.hitFlash = Math.max(0, (run.hitFlash || 0) - dt);

  if (player.beanBoost > 0) {
    player.beanBoost = Math.max(0, player.beanBoost - dt);
    player.nextToot -= dt;
    if (player.nextToot <= 0) {
      player.nextToot = 1.9;
      run.stats.toots++;
      makeNoise(run, 'toot', player, 8.5);
      const gained = addAura(run, 250, false);
      spawnVfx(run, 'can_pickup', player, { color: 0x38f2af });
      bark(run, player, `TURBO +${gained}`, 'jade', 1.8, 0.85);
    }
  }

  player.wet = wetAt(player.x, player.z);
  player.dash = Math.max(0, player.dash - dt);
  if (input.dash && player.cooldown === 0) {
    player.dash = DASH_TIME;
    player.cooldown = DASH_COOLDOWN;
    player.dx = magnitude > 0.15 ? x / magnitude : Math.cos(player.angle);
    player.dz = magnitude > 0.15 ? z / magnitude : Math.sin(player.angle);
    makeNoise(run, 'dash', player, 12);
    spawnVfx(run, 'dash', player);
    if (player.wet) {
      player.sliding = 0.44;
      run.events.push({ kind: 'slip', ...location(player) });
      const gained = addAura(run, 300, true);
      spawnVfx(run, 'water_slip', player);
      bark(run, player, `GLIDE! +${gained}`, 'cyan', 1.85, 1.0);
    }
  }

  let speed = (player.wet ? WALK * 0.78 : WALK) * (player.speedMult || 1);
  if (player.beanBoost > 0) speed *= 1.32;
  if (player.dash > 0 || player.sliding > 0) {
    dx = player.dx;
    dz = player.dz;
    speed = player.sliding > 0 ? 9.8 : 8.5;
    // Close-Call Dodge Check gegen aktive Jäger!
    if (player.dodgeBonusCooldown <= 0) {
      const chargingHauke = run.hauke.chargeState === 'rush' && distance(player, run.hauke) < 1.85;
      const huntingAnton = run.listener.mode === 'hunt' && run.listener.stunned <= 0 && distance(player, run.listener) < 1.5;
      if (chargingHauke || huntingAnton) {
        player.dodgeBonusCooldown = 2.0;
        run.stats.dodges++;
        const gained = addAura(run, 400, true);
        run.events.push({ kind: 'dodge', ...location(player) });
        bark(run, player, `KNAPP! +${gained} ⚡`, 'cyan', 2.05, 1.15);
      }
    }
    for (const enemy of [run.listener, run.tom]) {
      if (distance(player, enemy) < 1.15 && enemy.stunned <= 0 && enemy.stunImmune <= 0) {
        enemy.stunned = 1.9;
        enemy.stunImmune = 3.2;
        run.stats.bonks++;
        const gained = addAura(run, 600, true);
        spawnVfx(run, 'bonk_hit', enemy, { color: 0x73d7ff });
        bark(run, enemy, `CHECK! +${gained}`, 'cyan', 2.0, 1.0);
      }
    }
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
    if (run.records.has('cylinder')) {
      player.clinkIn -= traveled;
      if (player.clinkIn <= 0) {
        player.clinkIn = 7.5;
        makeNoise(run, 'can', player, 5.5);
        bark(run, player, '*ZISCH*', 'cyan', 1.8, 0.8);
      }
    }
  }

  for (const can of run.cans) {
    if (!can.collected && distance(player, can) < 0.72) {
      can.collected = true;
      run.stats.cans++;
      const gained = addAura(run, 250, true);
      makeNoise(run, 'can', can, 3.8);
      spawnVfx(run, 'can_pickup', can, { color: 0x38f2af });
      bark(run, can, `+${gained} ⚡`, 'jade', 1.2, 0.95);
    }
  }

  // Schnelles automatisches Aufsammeln der heruntergefallenen Chef-Krone beim Drüberlaufen
  if (run.droppedHelmet && player.invuln <= 0.6 && distance(player, run.droppedHelmet) < 0.78) {
    reclaimCrown(run);
  }

  if (input.use) use(run);
  if (input.lure) throwClapper(run);
  if (input.bonk) swingWrench(run);
}

function advanceSounds(run, dt) {
  const landed = [];
  for (const projectile of run.throws) {
    projectile.elapsed += dt;
    if (projectile.elapsed >= projectile.duration) landed.push(projectile);
  }
  for (const projectile of landed) {
    makeNoise(run, 'clapper', projectile.to, 15.5);
    spawnVfx(run, 'can_pickup', projectile.to, { color: 0xffb84d });
  }
  run.throws = run.throws.filter((projectile) => projectile.elapsed < projectile.duration);
  for (const pulse of run.pulses) pulse.age += dt;
  run.pulses = run.pulses.filter((pulse) => pulse.age < pulse.reach / 13 + 0.28);
  run.barks = run.barks.filter((entry) => entry.until > run.time);
  for (const valve of run.valves) {
    valve.cooldown = Math.max(0, valve.cooldown - dt);
    valve.active = Math.max(0, valve.active - dt);
  }
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

function followWaypoints(agent, targetPoint, speed, dt, run) {
  if (agent.replanAt <= run.time) {
    agent.path = route(agent, targetPoint);
    agent.replanAt = run.time + 0.24;
  }
  while (agent.path.length && distance(agent, agent.path[0]) < 0.16) agent.path.shift();
  while (agent.path.length > 1 && clearPath(agent, agent.path[1], 0.25)) agent.path.shift();
  const target = agent.path[0];
  if (!target) return false;
  const heading = Math.atan2(target.z - agent.z, target.x - agent.x);
  const turn = Math.atan2(Math.sin(heading - agent.angle), Math.cos(heading - agent.angle));
  agent.angle += turn * Math.min(1, dt * 11);
  const stride = Math.min(speed * dt, distance(agent, target));
  const before = location(agent);
  shiftBody(agent, Math.cos(heading) * stride, Math.sin(heading) * stride, 0.23);
  const moved = distance(agent, before);
  agent.stride = (agent.stride || 0) + moved;
  return moved > 0.001;
}

function threatScale(run) {
  return 1 + run.records.size * 0.09 + (run.lift.state === 'calling' ? 0.14 : 0);
}

function moveListener(run, dt) {
  const listener = run.listener;
  const player = run.player;
  listener.slipCooldown = Math.max(0, listener.slipCooldown - dt);
  listener.stunImmune = Math.max(0, (listener.stunImmune || 0) - dt);

  if (listener.stunned > 0) {
    listener.stunned = Math.max(0, listener.stunned - dt);
    listener.moving = false;
    listener.angle += dt * 7.5;
    return;
  }

  const gap = distance(listener, player);
  const visible = gap < (player.lamp ? 6.0 : 1.9) && clearPath(listener, player);
  const sound = hear(run);

  listener.awareness = clamp(listener.awareness + (visible ? dt * (gap < 1.3 ? 9 : 3.4) : -dt * 1.8), 0, 1);
  if (visible && (listener.awareness >= 1 || listener.mode === 'hunt')) {
    if (listener.mode !== 'hunt') {
      run.events.push({ kind: 'detected', ...location(listener) });
      bark(run, listener, 'DA?!', 'vermilion', 2.45, 1.0);
    }
    listener.mode = 'hunt';
    listener.lastSeen = run.time;
    listener.target = location(player);
  } else if (listener.mode === 'hunt' && run.time - listener.lastSeen > 1.35) {
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
      listener.searchUntil = run.time + 1.6;
      bark(run, listener, 'HÄ?!', 'gold', 2.45, 1.1);
    }
  }
  if (listener.mode === 'search' && run.time >= listener.searchUntil) {
    listener.mode = 'patrol';
    listener.target = PATROL[listener.patrol];
    listener.replanAt = run.time;
  }

  listener.moving = false;
  if (listener.mode === 'search') {
    listener.angle += dt * 1.8;
    return;
  }
  const scale = threatScale(run);
  const speed = (listener.mode === 'hunt' ? 3.28 : listener.mode === 'investigate' ? 2.4 : 1.54) * scale;
  listener.moving = followWaypoints(listener, listener.target, speed, dt, run);

  const nowWet = wetAt(listener.x, listener.z);
  if (
    nowWet && !listener.wasWet && listener.mode === 'hunt' &&
    listener.slipCooldown <= 0 && gap > 1.35 && (run.stats.bonks > 0 || player.clappers < 2 || player.beanBoost > 0)
  ) {
    listener.stunned = 2.4;
    listener.slipCooldown = 10;
    run.stats.slips++;
    run.events.push({ kind: 'slip', ...location(listener) });
    spawnVfx(run, 'water_slip', listener);
    const gained = addAura(run, 500, true);
    bark(run, listener, `PLATSCH! +${gained}`, 'cyan', 2.4, 1.3);
  }
  listener.wasWet = nowWet;
}

function moveHauke(run, dt) {
  const { hauke, player } = run;
  hauke.hitFlash = Math.max(0, (hauke.hitFlash || 0) - dt);
  hauke.stunImmune = Math.max(0, (hauke.stunImmune || 0) - dt);
  hauke.chargeCooldown = Math.max(0, (hauke.chargeCooldown || 0) - dt);

  if (hauke.koTimer > 0) {
    hauke.koTimer = Math.max(0, hauke.koTimer - dt);
    hauke.stunned = hauke.koTimer;
    hauke.moving = false;
    hauke.chargeState = 'none';
    if (hauke.koTimer === 0) {
      hauke.hp = hauke.maxHp;
      hauke.mode = 'hunt';
      hauke.target = location(player);
      hauke.chargeCooldown = 2.0;
      bark(run, hauke, 'HUNGER!!', 'vermilion', 2.4, 1.4);
      tell(run, 'Hauke ist aus dem Fresskoma erwacht — jetzt richtig unterzuckert!', 2.8);
    }
    return;
  }

  if (hauke.stunned > 0) {
    hauke.stunned = Math.max(0, hauke.stunned - dt);
    hauke.moving = false;
    hauke.chargeState = 'none';
    hauke.angle -= dt * 5.2;
    return;
  }

  const gap = distance(hauke, player);

  // Haukes Signature Move: BAUCH-RAMME (Windup -> Blitz-Roll -> Wall-Slam Counterplay!)
  if (hauke.chargeState === 'windup') {
    hauke.moving = false;
    hauke.chargeTimer -= dt;
    const aim = Math.atan2(player.z - hauke.z, player.x - hauke.x);
    hauke.angle = aim;
    hauke.chargeDirX = Math.cos(aim);
    hauke.chargeDirZ = Math.sin(aim);
    if (hauke.chargeTimer <= 0) {
      hauke.chargeState = 'rush';
      hauke.chargeTimer = 0.85;
      makeNoise(run, 'stomp', hauke, 10);
      bark(run, hauke, 'VOLLGAS!', 'vermilion', 2.35, 0.9);
    }
    return;
  }

  if (hauke.chargeState === 'rush') {
    hauke.moving = true;
    hauke.chargeTimer -= dt;
    const rushSpeed = 7.9 + (hauke.knockouts > 0 ? 0.6 : 0);
    const nx = hauke.x + hauke.chargeDirX * rushSpeed * dt;
    const nz = hauke.z + hauke.chargeDirZ * rushSpeed * dt;
    hauke.stride = (hauke.stride || 0) + rushSpeed * dt;

    if (!walkable(nx, nz, 0.27)) {
      // WALL SLAM! Wenn Chef Torge ausweicht und Hauke gegen die Wand knallt!
      hauke.chargeState = 'none';
      hauke.chargeCooldown = 6.0;
      hauke.stunned = 2.8;
      run.stats.wallSlams = (run.stats.wallSlams || 0) + 1;
      run.cameraShake = Math.max(run.cameraShake, 0.82);
      run.events.push({ kind: 'wall_slam', ...location(hauke) });
      spawnVfx(run, 'wall_slam', hauke);
      damageHauke(run, 25, 'OLÉ! WAND-CRASH');
      return;
    }

    hauke.x = nx;
    hauke.z = nz;
    if (hauke.chargeTimer <= 0) {
      hauke.chargeState = 'none';
      hauke.chargeCooldown = 5.2;
    }
    return;
  }

  const loudPulse = run.pulses.find((p) => (p.kind === 'lift' || p.kind === 'bonk' || p.kind === 'clapper' || p.kind === 'toot') && distance(p, hauke) < p.reach * 0.78);
  const canSee = player.lamp && gap < 5.6 && clearPath(hauke, player);

  if (canSee) {
    if (hauke.mode !== 'hunt') bark(run, hauke, 'ERBEUTEN!', 'vermilion', 2.3, 1.0);
    hauke.mode = 'hunt';
    hauke.target = location(player);
  } else if (loudPulse) {
    hauke.mode = 'investigate';
    hauke.target = location(loudPulse);
  } else if (run.lift.state === 'calling') {
    hauke.mode = 'hunt';
    hauke.target = location(LIFT);
  } else if (distance(hauke, hauke.target) < 0.55) {
    hauke.mode = 'patrol';
    hauke.patrol = (hauke.patrol + 1) % PATROL_HAUKE.length;
    hauke.target = PATROL_HAUKE[hauke.patrol];
    hauke.replanAt = run.time;
  }

  // Trigger Bauch-Ramme wenn Spieler in Charge-Reichweite und Sichtlinie
  if (
    hauke.chargeCooldown <= 0 &&
    (hauke.mode === 'hunt' || gap < 4.5) &&
    gap > 2.25 && gap < 6.8 &&
    clearPath(hauke, player, 0.25)
  ) {
    hauke.chargeState = 'windup';
    hauke.chargeTimer = 0.62;
    hauke.chargeCooldown = Math.max(3.6, 5.4 - run.records.size * 0.5);
    const aim = Math.atan2(player.z - hauke.z, player.x - hauke.x);
    hauke.angle = aim;
    hauke.chargeDirX = Math.cos(aim);
    hauke.chargeDirZ = Math.sin(aim);
    run.events.push({ kind: 'charge_windup', ...location(hauke) });
    bark(run, hauke, '⚠️ AUFPASSEN!', 'vermilion', 2.45, 0.9);
    return;
  }

  const rageSpeed = (hauke.knockouts || 0) > 0 ? 0.28 : 0;
  const speed = ((hauke.mode === 'hunt' ? 2.58 : 1.32) + rageSpeed) * threatScale(run);
  hauke.moving = followWaypoints(hauke, hauke.target, speed, dt, run);

  if (hauke.moving) {
    hauke.stompIn -= dt;
    if (hauke.stompIn <= 0) {
      hauke.stompIn = hauke.mode === 'hunt' ? 0.42 : 0.76;
      if (gap < 10.0) {
        const intensity = (1 - gap / 10.0) * 0.16;
        run.cameraShake = Math.max(run.cameraShake, intensity);
        run.events.push({ kind: 'stomp', ...location(hauke) });
      }
    }
  }
}

function moveTom(run, dt) {
  const { tom, player } = run;
  tom.stealCooldown = Math.max(0, tom.stealCooldown - dt);
  tom.stunImmune = Math.max(0, (tom.stunImmune || 0) - dt);
  if (tom.stunned > 0) {
    tom.stunned = Math.max(0, tom.stunned - dt);
    tom.moving = false;
    tom.angle += dt * 9.0;
    return;
  }

  const gap = distance(tom, player);
  const hasLoot = player.pfand > 0 || player.clappers > 0 || run.records.has('spool');
  if (tom.stealCooldown > 2.2) {
    tom.mode = 'flee';
    tom.target = PATROL_TOM[tom.patrol];
  } else if (hasLoot && (player.lamp || gap < 3.4) && gap < (run.records.has('spool') ? 8.2 : 5.4) && clearPath(tom, player)) {
    tom.mode = 'greed';
    tom.target = location(player);
  } else if (run.lift.state === 'calling') {
    tom.mode = 'greed';
    tom.target = location(LIFT);
  } else if (distance(tom, tom.target) < 0.52) {
    tom.mode = 'patrol';
    tom.patrol = (tom.patrol + 1) % PATROL_TOM.length;
    tom.target = PATROL_TOM[tom.patrol];
    tom.replanAt = run.time;
  }

  const speed = (tom.mode === 'flee' ? 3.8 : tom.mode === 'greed' ? 2.9 : 1.8) * threatScale(run);
  tom.moving = followWaypoints(tom, tom.target, speed, dt, run);

  if (gap < 0.78 && tom.stealCooldown <= 0 && (player.lamp || gap < 0.72)) {
    tom.stealCooldown = 6.2;
    tom.patrol = (tom.patrol + 2) % PATROL_TOM.length;
    tom.target = PATROL_TOM[tom.patrol];
    tom.replanAt = run.time;
    run.stats.stolen++;
    run.events.push({ kind: 'steal', ...location(tom) });
    spawnVfx(run, 'coin_burst', player);
    player.pfand = Math.max(0, player.pfand - 400);
    if (player.clappers > 0 && run.stats.stolen % 2 === 1) player.clappers--;
    player.combo = 1;
    player.comboTimer = 0;
    bark(run, tom, 'YOINK! -400 ⚡', 'jade', 1.55, 1.35);
  }
}

export function advance(run, input = {}, dt = STEP) {
  run.events.length = 0;
  run.vfx.length = 0;
  if (run.state !== 'playing') return run;
  run.time += dt;
  movePlayer(run, input, dt);
  advanceSounds(run, dt);
  moveListener(run, dt);
  moveHauke(run, dt);
  moveTom(run, dt);
  if (run.notices.length && run.notices[0].until < run.time) run.notices.length = 0;

  const caughtByAnton = run.listener.stunned <= 0 && distance(run.listener, run.player) < 0.54;
  const haukeHitRadius = run.hauke.chargeState === 'rush' ? 0.78 : 0.65;
  const caughtByHauke = run.hauke.stunned <= 0 && !(run.hauke.koTimer > 0) && (run.player.lamp || run.hauke.mode === 'hunt' || run.hauke.chargeState === 'rush') && distance(run.hauke, run.player) < haukeHitRadius;

  if ((caughtByAnton || caughtByHauke) && run.player.invuln <= 0) {
    if (run.player.helmet) {
      // Chef-Krone fängt den ersten Hit ab & fliegt durch den Raum!
      run.player.helmet = false;
      run.player.invuln = 1.65;
      run.player.combo = 1;
      run.player.comboTimer = 0;
      run.cameraShake = 0.78;
      run.hitFlash = 0.45;
      const drop = findCrownDropPoint(run.player);
      run.droppedHelmet = drop;
      run.events.push({ kind: 'crown_drop', ...location(run.player) });
      spawnVfx(run, 'bonk_hit', run.player, { color: 0xffb84d });
      bark(run, run.player, '👑 KRONE VERLOREN!', 'vermilion', 2.2, 1.5);
      tell(run, 'Chef-Krone verloren! Hol sie zurück — nächster Treffer ist K.O.!', 2.8);
      if (caughtByHauke) {
        run.hauke.chargeState = 'none';
        run.hauke.chargeCooldown = 3.2;
      }
    } else {
      run.caughtBy = caughtByHauke ? 'hauke' : 'anton';
      const pool = caughtByHauke ? DEATH_QUOTES_HAUKE : DEATH_QUOTES_ANTON;
      run.deathReason = pool[Math.floor(run.time * 7) % pool.length];
      run.state = 'caught';
      run.events.push({ kind: 'caught' });
      return run;
    }
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
