import {
  INITIAL_CANS, LIFT, PATROL, PATROL_HAUKE, PATROL_TOM, RECORDS, SPAWN, VALVES, VENDING,
  clearPath, route, walkable, wetAt,
} from './level.js';

export const STEP = 1 / 60;
export const TOTAL_RECORDS = RECORDS.length;
export const LIFT_WAIT = 5;
const WALK = 2.95;
const DASH_TIME = 0.28;
const DASH_COOLDOWN = 2.1;
const BONK_COOLDOWN = 2.0;
const USE_RANGE = 1.38;
const START_LISTENER = { x: 18.4, z: 9.25 };
const START_HAUKE = { x: 28.0, z: 25.3 };
const START_TOM = { x: 20.45, z: 16.0 };

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const location = (point) => ({ x: point.x, z: point.z });

const DEATH_QUOTES_ANTON = [
  'Anton war eigentlich komplett lost, ist aber im Dunkeln aus Versehen in dich reingelaufen (-10.000 Aura).',
  'Anton wusste selbst nicht wo er hinwill, hat dich aber trotzdem mit seinen Slenderman-Armen gegriffen.',
  'Lost Anton hat dich im Dunkeln mit dem Kühlschrank verwechselt. Selbst Chef Torge war kurz sprachlos.',
];

const DEATH_QUOTES_HAUKE = [
  'Hauke (Massiv Rund) hat dich einfach überrollt. Gegen 360° pure Masse und eigene Schwerkraft hilft nichts!',
  'Du bist zu nah an Haukes Ereignishorizont geraten und wurdest in seine Bauch-Umlaufbahn gezogen!',
  'Hauke hat einen Bauchplatscher gemacht — das Druckwellen-Beben hat die halbe Halle plattgewalzt!',
];

const ANTON_QUOTES = [
  'Anton murmelt im Dunkeln: „Hä, war ich in dem Gang nicht schon dreimal?“',
  'Anton ruft: „Torge, warte mal kurz, wo ist hier Norden?!“',
  'Anton starrt eine Wand an: „Sieht aus wie der Ausgang… glaube ich.“',
];

const HAUKE_QUOTES = [
  'Hauke brüllt: „Massephase seit 2019 — ich hab ein eigenes Gravitationsfeld!“',
  'Hauke schnauft: „Ich rieche Mitternachts-Döner und eiskalte Spezi!“',
  'Hauke ruft: „Wer stehen bleibt, wird überrollt!“',
];

export function newRun() {
  return {
    state: 'playing',
    time: 0,
    caughtBy: 'anton',
    deathReason: DEATH_QUOTES_ANTON[0],
    cameraShake: 0,
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
      clinkIn: 5.0,
      helmet: true,
      invuln: 0,
      pfand: 1000,
      combo: 1,
      comboTimer: 0,
      maxCombo: 1,
      novaRadius: 2.2,
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
      slipCooldown: 4,
      wasWet: false,
      lostChatIn: 6.5,
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
      stompIn: 0.72,
      hp: 100,
      maxHp: 100,
      koTimer: 0,
      hitFlash: 0,
      knockouts: 0,
      quoteIn: 9.0,
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
      stealCooldown: 0,
    },
    records: new Set(),
    cans: INITIAL_CANS.map((can) => ({ ...can, vx: 0, vz: 0, collected: false })),
    valves: VALVES.map((valve) => ({ ...valve, cooldown: 0, active: 0 })),
    vendingCooldown: 0,
    droppedHelmet: null,
    lift: { state: 'idle', remaining: LIFT_WAIT },
    notices: [],
    popups: [],
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
    },
  };
}

function addAura(run, baseAmount, bumpCombo = true) {
  const { player } = run;
  if (bumpCombo) {
    player.combo = Math.min(8, (player.combo || 1) + (player.comboTimer > 0 ? 1 : 0));
    player.comboTimer = 6.5;
    player.maxCombo = Math.max(player.maxCombo || 1, player.combo);
  }
  const mult = 1 + (player.combo - 1) * 0.25;
  const gained = Math.round(baseAmount * mult);
  player.pfand += gained;
  return gained;
}

export function applyUpgrade(run, kind) {
  if (!run) return;
  run.pendingUpgrade = false;
  run.stats.upgrades++;
  if (kind === 'nova') {
    run.player.novaRadius += 0.85;
    addAura(run, 1000, true);
    popup(run, '❖ UPGRADE: ÜBERLEGENE CHEF-SCHELLE (+45% RADIUS)');
  } else if (kind === 'speed') {
    run.player.speedMult += 0.24;
    addAura(run, 1000, true);
    popup(run, '⚡ UPGRADE: CREATIN-OVERDRIVE (+25% TEMPO)');
  } else {
    addAura(run, 2500, true);
    run.player.clappers = Math.min(5, run.player.clappers + 2);
    popup(run, '✦ UPGRADE: +2.500 AURA & +2 PFAND-DOSEN');
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

function tell(run, message, duration = 5.4) {
  run.notices.splice(0, run.notices.length, { message, until: run.time + duration });
}

function popup(run, text) {
  run.popups.push({ id: ++run.pulseSerial, text, until: run.time + 2.3 });
  if (run.popups.length > 3) run.popups.shift();
}

function damageHauke(run, dmg, sourceLabel) {
  const { hauke, player } = run;
  if (hauke.koTimer > 0) return;
  hauke.hp = Math.max(0, hauke.hp - dmg);
  hauke.hitFlash = 0.28;
  if (hauke.hp <= 0) {
    hauke.koTimer = 14.0;
    hauke.stunned = 14.0;
    hauke.knockouts = (hauke.knockouts || 0) + 1;
    run.stats.haukeKos = (run.stats.haukeKos || 0) + 1;
    run.cameraShake = Math.max(run.cameraShake, 0.75);
    player.clappers = Math.min(5, player.clappers + 1);
    const bonus = addAura(run, 4000, true);
    popup(run, `👑 HAUKE IM FRESSKOMA! (+${bonus} BOSS-AURA)`);
    tell(run, 'MASSIV-RUND HAUKE GEHT INS FRESSKOMA (14s K.O.)! Er hat eine goldene Pfand-Dose gedroppt!');
  } else {
    const gained = addAura(run, 1500, true);
    popup(run, `⚡ ${sourceLabel} (-${dmg}% HP · +${gained} AURA)`);
  }
}

export function interaction(run) {
  const record = RECORDS.find((item) => !run.records.has(item.id) && distance(item, run.player) < USE_RANGE);
  if (record) return { text: `${record.name} sichern`, record, enabled: true };

  if (run.droppedHelmet && distance(run.droppedHelmet, run.player) < USE_RANGE) {
    return { text: 'Chef-Krone wieder aufsetzen', helmet: true, enabled: true };
  }

  const valve = run.valves.find((item) => item.cooldown <= 0 && distance(item, run.player) < USE_RANGE);
  if (valve) return { text: `${valve.name}`, valve, enabled: true };

  if (distance(VENDING, run.player) < USE_RANGE && run.vendingCooldown <= 0) {
    return { text: 'Späti-Automat: Pre-Workout-Boost & Pfand-Dose ziehen', vending: true, enabled: true };
  }

  if (distance(run.player, LIFT) > USE_RANGE) return null;
  const missing = TOTAL_RECORDS - run.records.size;
  if (missing) {
    return {
      text: `Aufzug gesperrt · Noch ${missing} ${missing === 1 ? 'Schatz fehlt' : 'Schätze fehlen'}`,
      enabled: false,
    };
  }
  if (run.lift.state === 'idle') return { text: 'Aufzug rufen (Hauke & Anton hören das!)', enabled: true };
  return {
    text: run.lift.state === 'calling' ? 'Am Aufzug behaupten (Chef-Modus)!' : 'In den Aufzug treten!',
    enabled: false,
  };
}

function use(run) {
  const action = interaction(run);
  if (!action?.enabled) return;
  const { player } = run;

  if (action.record) {
    run.records.add(action.record.id);
    const gained = addAura(run, 2000, true);
    run.pendingUpgrade = true;
    makeNoise(run, 'record', player, 4.2);
    tell(run, action.record.discovery);
    popup(run, `✦ ${action.record.name} (+${gained} AURA)`);
  } else if (action.helmet) {
    player.helmet = true;
    run.droppedHelmet = null;
    run.events.push({ kind: 'record', ...location(player) });
    const gained = addAura(run, 500, true);
    popup(run, `👑 CHEF-KRONE SITZT WIEDER (+${gained} AURA)`);
  } else if (action.valve) {
    action.valve.cooldown = 9;
    action.valve.active = 1.6;
    run.stats.valves++;
    run.cameraShake = Math.max(run.cameraShake, 0.45);
    makeNoise(run, 'valve', action.valve, 16);
    const gained = addAura(run, 800, true);
    popup(run, `💥 DAMPF-VENTIL GEZÜNDET! (+${gained} AURA)`);
    for (const enemy of [run.listener, run.hauke, run.tom]) {
      if (distance(enemy, action.valve) < 5.4) {
        enemy.stunned = Math.max(enemy.stunned, 3.6);
        const pushAngle = Math.atan2(enemy.z - action.valve.z, enemy.x - action.valve.x);
        shiftBody(enemy, Math.cos(pushAngle) * 1.5, Math.sin(pushAngle) * 1.5, 0.25);
        if (enemy === run.hauke) damageHauke(run, 50, 'HAUKE VOM VENTIL GEDÜNSTET!');
      }
    }
  } else if (action.vending) {
    run.vendingCooldown = 8.5;
    player.clappers = Math.min(5, player.clappers + 1);
    player.beanBoost = 6.0;
    player.nextToot = 1.5;
    const gained = addAura(run, 500, true);
    makeNoise(run, 'can', player, 6.0);
    tell(run, 'Dry-Scoop Pre-Workout gezündet! 6s Chef-Overdrive (+1 Pfand-Dose)!');
    popup(run, `⚡ PRE-WORKOUT OVERDRIVE (+${gained} AURA)`);
  } else {
    run.lift.state = 'calling';
    makeNoise(run, 'lift', LIFT, 38);
    tell(run, 'Der Aufzug fährt hoch! Hauke rollt mit Höchstgeschwindigkeit an — verteidige die Plattform!');
    popup(run, '🚨 AUFZUG KOMMT! HALT DIE PLATTFORM!');
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
  popup(run, '🥫 PFAND-DOSE GEWORFEN (ANTON IST LOST)');
}

function swingWrench(run) {
  const { player } = run;
  if (player.bonkCooldown > 0) return;
  player.bonkCooldown = BONK_COOLDOWN;
  player.swing = 0.36;
  makeNoise(run, 'bonk', player, 9.5);
  run.cameraShake = Math.max(run.cameraShake, 0.32);

  const reach = player.novaRadius || 2.2;
  let hitAny = false;

  if (distance(player, run.listener) < reach) {
    hitAny = true;
    run.listener.stunned = 3.2;
    run.stats.bonks++;
    const push = Math.atan2(run.listener.z - player.z, run.listener.x - player.x);
    shiftBody(run.listener, Math.cos(push) * 1.35, Math.sin(push) * 1.35, 0.24);
    const gained = addAura(run, 1000, true);
    popup(run, `⚡ LOST ANTON WEGGEBONKT! (+${gained} AURA)`);
  }

  if (distance(player, run.hauke) < reach) {
    hitAny = true;
    run.hauke.stunned = Math.max(run.hauke.stunned, 2.6);
    run.stats.bonks++;
    const push = Math.atan2(run.hauke.z - player.z, run.hauke.x - player.x);
    shiftBody(run.hauke, Math.cos(push) * 1.15, Math.sin(push) * 1.15, 0.24);
    damageHauke(run, 35, 'MASSIV-RUND HAUKE GEBONKT!');
  }

  if (distance(player, run.tom) < reach) {
    hitAny = true;
    run.tom.stunned = 3.8;
    run.stats.bonks++;
    player.clappers = Math.min(5, player.clappers + 1);
    const push = Math.atan2(run.tom.z - player.z, run.tom.x - player.x);
    shiftBody(run.tom, Math.cos(push) * 1.45, Math.sin(push) * 1.45, 0.24);
    const gained = addAura(run, 1200, true);
    popup(run, `⚡ CHEF-SCHELLE FÜR TOM! (+${gained} AURA & DOSE)`);
  }

  if (!hitAny && distance(player, VENDING) < 1.8 && run.vendingCooldown <= 0) {
    run.vendingCooldown = 8.5;
    player.clappers = Math.min(5, player.clappers + 1);
    const gained = addAura(run, 500, true);
    popup(run, `⚡ SPÄTI-AUTOMAT GEBONKT! (+${gained} AURA & DOSE)`);
  } else if (!hitAny) {
    popup(run, '❖ CHEF-SCHELLE GEZÜNDET');
  }
}

function movePlayer(run, input, dt) {
  const player = run.player;
  if (input.lamp) {
    player.lamp = !player.lamp;
    run.events.push({ kind: 'shutter', ...location(player) });
    popup(run, player.lamp ? '🔦 TASCHENLAMPE AN (LICHTKEGEL AKTIV)' : '🌑 TASCHENLAMPE AUS (TARN-MODUS IM DUNKELN)');
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
  run.vendingCooldown = Math.max(0, run.vendingCooldown - dt);
  run.cameraShake = Math.max(0, run.cameraShake - dt * 1.8);

  if (player.beanBoost > 0) {
    player.beanBoost = Math.max(0, player.beanBoost - dt);
    player.nextToot -= dt;
    if (player.nextToot <= 0) {
      player.nextToot = 1.8;
      run.stats.toots++;
      makeNoise(run, 'toot', player, 8.5);
      const gained = addAura(run, 250, false);
      popup(run, `💨 CHEF-SCHUB (+${gained} AURA)`);
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
    if (player.wet) {
      player.sliding = 0.44;
      run.events.push({ kind: 'slip', ...location(player) });
      const gained = addAura(run, 300, true);
      popup(run, `🌊 HYDRO-GLIDE (+${gained} AURA)`);
    }
  }

  let speed = (player.wet ? WALK * 0.76 : WALK) * (player.speedMult || 1);
  if (player.beanBoost > 0) speed *= 1.3;
  if (player.dash > 0 || player.sliding > 0) {
    dx = player.dx;
    dz = player.dz;
    speed = player.sliding > 0 ? 9.6 : 8.3;
    for (const enemy of [run.listener, run.hauke, run.tom]) {
      if (distance(player, enemy) < 1.15 && enemy.stunned <= 0) {
        enemy.stunned = 2.2;
        run.stats.bonks++;
        const gained = addAura(run, 600, true);
        popup(run, `🎳 CHEF-BODYCHECK! (+${gained} AURA)`);
        if (enemy === run.hauke) damageHauke(run, 20, 'BODYCHECK GEGEN HAUKE!');
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
        player.clinkIn = 7.0;
        makeNoise(run, 'can', player, 5.5);
        popup(run, '🍺 *ZISCH!* Die Spezi lockt Hauke an!');
      }
    }
  }

  for (const can of run.cans) {
    if (!can.collected && distance(player, can) < 0.72) {
      can.collected = true;
      run.stats.cans++;
      const gained = addAura(run, 250, true);
      makeNoise(run, 'can', can, 3.8);
      popup(run, `🥫 +${gained} PFAND-AURA`);
    }
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
  for (const projectile of landed) makeNoise(run, 'clapper', projectile.to, 15.5);
  run.throws = run.throws.filter((projectile) => projectile.elapsed < projectile.duration);
  for (const pulse of run.pulses) pulse.age += dt;
  run.pulses = run.pulses.filter((pulse) => pulse.age < pulse.reach / 13 + 0.28);
  run.popups = run.popups.filter((entry) => entry.until > run.time);
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
    agent.replanAt = run.time + 0.26;
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
  return distance(agent, before) > 0.001;
}

function moveListener(run, dt) {
  const listener = run.listener;
  const player = run.player;
  listener.slipCooldown = Math.max(0, listener.slipCooldown - dt);
  listener.lostChatIn = Math.max(0, (listener.lostChatIn ?? 8) - dt);

  if (listener.stunned > 0) {
    listener.stunned = Math.max(0, listener.stunned - dt);
    listener.moving = false;
    listener.angle += dt * 7.5;
    return;
  }

  const gap = distance(listener, player);
  if (listener.lostChatIn <= 0 && gap < 11.5 && listener.mode !== 'hunt') {
    listener.lostChatIn = 14.0;
    if (run.notices.length === 0) {
      tell(run, ANTON_QUOTES[Math.floor(run.time * 3) % ANTON_QUOTES.length], 4.0);
    }
  }

  const visible = gap < (player.lamp ? 6.0 : 1.9) && clearPath(listener, player);
  const sound = hear(run);

  listener.awareness = clamp(listener.awareness + (visible ? dt * (gap < 1.3 ? 9 : 3.4) : -dt * 1.8), 0, 1);
  if (visible && (listener.awareness >= 1 || listener.mode === 'hunt')) {
    if (listener.mode !== 'hunt') {
      run.events.push({ kind: 'detected', ...location(listener) });
      popup(run, '👀 ANTON HAT DICH GESEHEN (ODER IST LOST)');
    }
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
  const speed = listener.mode === 'hunt' ? 3.25 : listener.mode === 'investigate' ? 2.36 : 1.49;
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
    const gained = addAura(run, 500, true);
    popup(run, `🍌 ANTON AUSGERUTSCHT! (+${gained} AURA)`);
  }
  listener.wasWet = nowWet;
}

function moveHauke(run, dt) {
  const { hauke, player } = run;
  hauke.hitFlash = Math.max(0, (hauke.hitFlash || 0) - dt);
  hauke.quoteIn = Math.max(0, (hauke.quoteIn ?? 9) - dt);

  if (hauke.koTimer > 0) {
    hauke.koTimer = Math.max(0, hauke.koTimer - dt);
    hauke.stunned = hauke.koTimer;
    hauke.moving = false;
    if (hauke.koTimer === 0) {
      hauke.hp = hauke.maxHp;
      hauke.mode = 'hunt';
      hauke.target = location(player);
      popup(run, '🔥 HAUKE IST WIEDER WACH & UNTERZUCKERT!');
      tell(run, 'Hauke ist aus dem Fresskoma erwacht und hat jetzt doppelten Hunger!');
    }
    return;
  }

  if (hauke.stunned > 0) {
    hauke.stunned = Math.max(0, hauke.stunned - dt);
    hauke.moving = false;
    hauke.angle -= dt * 5.2;
    return;
  }

  const gap = distance(hauke, player);
  if (hauke.quoteIn <= 0 && gap < 12.0 && run.notices.length === 0) {
    hauke.quoteIn = 15.0;
    tell(run, HAUKE_QUOTES[Math.floor(run.time * 5) % HAUKE_QUOTES.length], 4.0);
  }

  const loudPulse = run.pulses.find((p) => (p.kind === 'lift' || p.kind === 'bonk' || p.kind === 'clapper' || p.kind === 'toot') && distance(p, hauke) < p.reach * 0.75);
  const canSee = player.lamp && gap < 5.5 && clearPath(hauke, player);

  if (canSee) {
    if (hauke.mode !== 'hunt') popup(run, '⚠️ HAUKE (MASSIV RUND) ROLLT AN!');
    hauke.mode = 'hunt';
    hauke.target = location(player);
  } else if (loudPulse) {
    hauke.mode = 'investigate';
    hauke.target = location(loudPulse);
  } else if (distance(hauke, hauke.target) < 0.55) {
    hauke.mode = 'patrol';
    hauke.patrol = (hauke.patrol + 1) % PATROL_HAUKE.length;
    hauke.target = PATROL_HAUKE[hauke.patrol];
    hauke.replanAt = run.time;
  }

  const rageSpeed = (hauke.knockouts || 0) > 0 ? 0.25 : 0;
  const speed = (hauke.mode === 'hunt' ? 2.48 : 1.25) + rageSpeed;
  hauke.moving = followWaypoints(hauke, hauke.target, speed, dt, run);

  if (hauke.moving) {
    hauke.stompIn -= dt;
    if (hauke.stompIn <= 0) {
      hauke.stompIn = hauke.mode === 'hunt' ? 0.42 : 0.76;
      if (gap < 10.0) {
        const intensity = (1 - gap / 10.0) * 0.18;
        run.cameraShake = Math.max(run.cameraShake, intensity);
        run.events.push({ kind: 'stomp', ...location(hauke) });
      }
    }
  }
}

function moveTom(run, dt) {
  const { tom, player } = run;
  tom.stealCooldown = Math.max(0, tom.stealCooldown - dt);
  if (tom.stunned > 0) {
    tom.stunned = Math.max(0, tom.stunned - dt);
    tom.moving = false;
    tom.angle += dt * 9.0;
    return;
  }

  const gap = distance(tom, player);
  const hasLoot = player.pfand > 0 || player.clappers > 0 || run.records.has('spool');
  if (tom.stealCooldown > 2.5) {
    tom.mode = 'flee';
    tom.target = PATROL_TOM[tom.patrol];
  } else if (hasLoot && player.lamp && gap < (run.records.has('spool') ? 7.8 : 5.2) && clearPath(tom, player)) {
    tom.mode = 'greed';
    tom.target = location(player);
  } else if (distance(tom, tom.target) < 0.52) {
    tom.mode = 'patrol';
    tom.patrol = (tom.patrol + 1) % PATROL_TOM.length;
    tom.target = PATROL_TOM[tom.patrol];
    tom.replanAt = run.time;
  }

  const speed = tom.mode === 'flee' ? 3.55 : tom.mode === 'greed' ? 2.8 : 1.75;
  tom.moving = followWaypoints(tom, tom.target, speed, dt, run);

  if (gap < 0.74 && tom.stealCooldown <= 0 && player.lamp) {
    tom.stealCooldown = 6.5;
    tom.patrol = (tom.patrol + 2) % PATROL_TOM.length;
    tom.target = PATROL_TOM[tom.patrol];
    tom.replanAt = run.time;
    run.stats.stolen++;
    run.events.push({ kind: 'steal', ...location(tom) });
    player.pfand = Math.max(0, player.pfand - 400);
    player.combo = 1;
    player.comboTimer = 0;
    popup(run, '🦝 TOM MACHT TOM-SACHEN (-400 AURA GESCHNORRT)');
    tell(run, 'Tom ruft: „Ich geb dir morgen zurück, schwöre!“ — Gib ihm mit [C] oder Klick eine Chef-Schelle!');
  }
}

export function advance(run, input = {}, dt = STEP) {
  run.events.length = 0;
  if (run.state !== 'playing') return run;
  run.time += dt;
  movePlayer(run, input, dt);
  advanceSounds(run, dt);
  moveListener(run, dt);
  moveHauke(run, dt);
  moveTom(run, dt);
  if (run.notices.length && run.notices[0].until < run.time) run.notices.length = 0;

  const caughtByAnton = run.listener.stunned <= 0 && distance(run.listener, run.player) < 0.53;
  const caughtByHauke = run.hauke.stunned <= 0 && !(run.hauke.koTimer > 0) && (run.player.lamp || run.hauke.mode === 'hunt') && distance(run.hauke, run.player) < 0.65;

  if ((caughtByAnton || caughtByHauke) && run.player.invuln <= 0) {
    run.caughtBy = caughtByHauke ? 'hauke' : 'anton';
    const pool = caughtByHauke ? DEATH_QUOTES_HAUKE : DEATH_QUOTES_ANTON;
    run.deathReason = pool[Math.floor(run.time * 7) % pool.length];
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
