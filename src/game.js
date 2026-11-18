import { buildDungeon, LOADOUTS, MOD_POOL, randomFrom } from './level.js';

export const STEP = 1 / 60;
export const LIFT_WAIT = 5;
const WALK = 3.05;
const DASH_TIME = 0.28;
const DASH_COOLDOWN = 2.15;
const BONK_COOLDOWN = 1.85;
const USE_RANGE = 1.45;

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

function populateFloorState(run, map) {
  run.map = map;
  run.records = new Set();
  run.cans = map.cans;
  run.crates = map.crates;
  run.barrels = map.barrels;
  run.valves = map.valves.map((valve) => ({ ...valve, cooldown: 0, active: 0 }));
  run.vendingCooldown = 0;
  run.droppedHelmet = null;
  run.lift = { state: 'idle', remaining: LIFT_WAIT };
  run.pulses = [];
  run.throws = [];
  run.barks = [];
  run.vfx = [];

  run.player.x = map.spawn.x;
  run.player.z = map.spawn.z;
  run.player.angle = -Math.PI / 2;
  run.player.invuln = run.floor > 1 ? 1.2 : 0;
  run.player.dash = 0;
  run.player.sliding = 0;
  run.player.noise = 0;

  run.listener = {
    ...map.startListener,
    angle: Math.PI / 2,
    mode: 'patrol',
    target: map.patrol[0] ?? map.startListener,
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
    burning: 0,
    burnTick: 0,
    slipCooldown: 3.0,
    wasWet: false,
    stride: 0,
  };

  const hyperHauke = map.mutator?.haukeChargeScale ?? 1;
  run.hauke = {
    ...map.startHauke,
    angle: Math.PI,
    mode: 'patrol',
    target: map.patrolHauke[0] ?? map.startHauke,
    patrol: 0,
    path: [],
    replanAt: 0,
    moving: false,
    stunned: 0,
    stunImmune: 0,
    burning: 0,
    burnTick: 0,
    stompIn: 0.72,
    hp: 100,
    maxHp: 100,
    koTimer: 0,
    hitFlash: 0,
    knockouts: 0,
    chargeState: 'none',
    chargeTimer: 0,
    chargeCooldown: 4.5 * hyperHauke,
    chargeDirX: 0,
    chargeDirZ: 0,
    stride: 0,
  };

  run.tom = {
    ...map.startTom,
    angle: 0,
    mode: 'patrol',
    target: map.patrolTom[0] ?? map.startTom,
    patrol: 0,
    path: [],
    replanAt: 0,
    moving: false,
    stunned: 0,
    stunImmune: 0,
    burning: 0,
    burnTick: 0,
    stealCooldown: 0,
    stride: 0,
  };
}

export function newRun(options = {}) {
  const seed = options.seed ?? ((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
  const floor = options.floor ?? 1;
  const loadoutId = options.loadout && LOADOUTS[options.loadout] ? options.loadout : 'classic';
  const loadout = LOADOUTS[loadoutId];
  const map = buildDungeon(seed, floor);

  const run = {
    state: 'playing',
    seed,
    floor,
    loadoutId,
    time: 0,
    caughtBy: 'anton',
    deathReason: DEATH_QUOTES_ANTON[0],
    cameraShake: 0,
    hitFlash: 0,
    mods: new Set(),
    modOffers: [],
    player: {
      x: map.spawn.x,
      z: map.spawn.z,
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
      novaRadius: loadout.novaRadius,
      speedMult: loadout.speedMult,
      bonkCdMult: loadout.bonkCdMult,
      dashCdMult: loadout.dashCdMult,
      crownInvulnTime: 1.75,
      dx: 0,
      dz: 0,
      stride: 0,
      moving: false,
      wet: false,
      stepIn: 0,
      clappers: loadout.clappers,
      noise: 0,
    },
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
      crates: 0,
      barrels: 0,
      stolen: 0,
      toots: 0,
      valves: 0,
      upgrades: 0,
      haukeKos: 0,
      dodges: 0,
      wallSlams: 0,
    },
  };

  populateFloorState(run, map);
  return run;
}

function addAura(run, baseAmount, bumpCombo = true) {
  const { player, floor, map } = run;
  if (bumpCombo) {
    player.combo = Math.min(8, (player.combo || 1) + (player.comboTimer > 0 ? 1 : 0));
    player.comboTimer = 8.5;
    player.maxCombo = Math.max(player.maxCombo || 1, player.combo);
  }
  const floorMult = 1 + (floor - 1) * 0.35;
  const mutMult = map?.mutator?.auraMult ?? 1;
  const comboMult = 1 + (player.combo - 1) * 0.25;
  const gained = Math.round(baseAmount * comboMult * floorMult * mutMult);
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
  if (run.barks.length > 7) run.barks.shift();
}

function spawnVfx(run, kind, point, extra = {}) {
  run.vfx.push({ kind, x: point.x, z: point.z, angle: point.angle ?? 0, ...extra });
}

function rollModOffers(run) {
  const rng = randomFrom((run.seed >>> 0) ^ (run.floor * 0x517cc1b7));
  const available = MOD_POOL.filter((m) => !run.mods.has(m.id));
  const pool = available.length >= 3 ? [...available] : [...MOD_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

export function applyMod(run, modId) {
  if (!run) return;
  run.mods.add(modId);
  run.stats.upgrades++;
  const { player } = run;
  if (modId === 'fire_pan') {
    // Passiv in swingWrench aktiviert
  } else if (modId === 'twin_dash') {
    player.dashCdMult = (player.dashCdMult || 1) * 0.65;
  } else if (modId === 'shock_pan') {
    player.novaRadius += 0.95;
  } else if (modId === 'searchlight') {
    player.speedMult += 0.14;
  } else if (modId === 'pfand_magnet') {
    player.clappers = Math.min(5, player.clappers + 3);
  } else if (modId === 'espresso') {
    player.speedMult += 0.24;
  } else if (modId === 'titan_crown') {
    player.helmet = true;
    player.crownInvulnTime = 3.0;
  }
}

export function descendNextFloor(run, modId) {
  if (!run) return run;
  if (modId) applyMod(run, modId);
  run.floor += 1;
  const bonus = addAura(run, 2000, false);
  const nextMap = buildDungeon(run.seed, run.floor);
  populateFloorState(run, nextMap);
  run.state = 'playing';
  run.modOffers = [];
  tell(run, `ETAGE ${run.floor}: ${nextMap.biome.name} (${nextMap.mutator.name})! +${bonus} ⚡`, 3.4);
  bark(run, run.player, `ETAGE ${run.floor}!`, 'gold', 2.2, 1.5);
  return run;
}

export function finishRunCashOut(run) {
  if (!run) return run;
  run.state = 'escaped';
  run.events.push({ kind: 'escaped' });
  return run;
}

function shiftBody(run, body, dx, dz, radius) {
  const { walkable } = run.map;
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
    hauke.burning = 0;
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

function smashCrate(run, crate) {
  if (!crate || crate.broken) return;
  crate.broken = true;
  run.stats.crates = (run.stats.crates || 0) + 1;
  spawnVfx(run, 'crate_smash', crate);
  const { player } = run;
  const roll = Math.abs(Math.sin(crate.x * 19.3 + crate.z * 7.1 + run.time));
  if (!player.helmet && roll < 0.45) {
    reclaimCrown(run, crate);
  } else if (roll < 0.38 && player.clappers < 5) {
    player.clappers++;
    const gained = addAura(run, 250, true);
    bark(run, crate, `+1 DOSE & +${gained} ⚡`, 'jade', 1.4, 1.2);
  } else if (roll < 0.68) {
    player.beanBoost = Math.max(player.beanBoost, 4.5);
    const gained = addAura(run, 300, true);
    bark(run, crate, `ESPRESSO-TURBO! +${gained}`, 'cyan', 1.4, 1.2);
  } else {
    const gained = addAura(run, 650, true);
    bark(run, crate, `BEUTE! +${gained} ⚡`, 'gold', 1.4, 1.2);
  }
}

function detonateBarrel(run, barrel) {
  if (!barrel || barrel.exploded) return;
  barrel.exploded = true;
  barrel.fuse = 0;
  run.stats.barrels = (run.stats.barrels || 0) + 1;
  run.cameraShake = Math.max(run.cameraShake, 0.92);
  run.hitFlash = Math.max(run.hitFlash || 0, 0.24);
  makeNoise(run, 'valve', barrel, 22);
  run.events.push({ kind: 'wall_slam', ...location(barrel) });
  spawnVfx(run, 'ko_explosion', barrel);
  bark(run, barrel, 'KABOOM!', 'vermilion', 1.8, 1.4);

  // Kisten & Nachbar-Fässer sprengen
  for (const c of run.crates) {
    if (!c.broken && distance(c, barrel) < 4.2) smashCrate(run, c);
  }
  for (const other of run.barrels) {
    if (!other.exploded && other !== barrel && distance(other, barrel) < 4.2) {
      other.fuse = Math.min(other.fuse || 0.14, 0.14);
    }
  }

  // Gegner treffen
  for (const enemy of [run.listener, run.tom]) {
    if (distance(enemy, barrel) < 4.6) {
      enemy.stunned = Math.max(enemy.stunned, 4.0);
      enemy.stunImmune = 4.5;
      const push = Math.atan2(enemy.z - barrel.z, enemy.x - barrel.x);
      shiftBody(run, enemy, Math.cos(push) * 2.1, Math.sin(push) * 2.1, 0.25);
      const gained = addAura(run, 1200, true);
      bark(run, enemy, `BOOM! +${gained} ⚡`, 'gold', 2.4, 1.3);
    }
  }
  if (distance(run.hauke, barrel) < 4.8) {
    run.hauke.stunned = Math.max(run.hauke.stunned, 3.0);
    run.hauke.chargeState = 'none';
    const push = Math.atan2(run.hauke.z - barrel.z, run.hauke.x - barrel.x);
    shiftBody(run, run.hauke, Math.cos(push) * 1.6, Math.sin(push) * 1.6, 0.25);
    damageHauke(run, 40, 'FASS-SPRENGUNG!');
  }
}

export function interaction(run) {
  const { map, player, records } = run;
  const record = map.records.find((item) => !records.has(item.id) && distance(item, player) < USE_RANGE);
  if (record) return { text: `${record.shortName ?? record.name} sichern`, record, enabled: true };

  if (run.droppedHelmet && distance(run.droppedHelmet, player) < USE_RANGE) {
    return { text: 'Chef-Krone aufsetzen', helmet: true, enabled: true };
  }

  const valve = run.valves.find((item) => item.cooldown <= 0 && distance(item, player) < USE_RANGE);
  if (valve) return { text: `${valve.name}`, valve, enabled: true };

  if (distance(map.vending, player) < USE_RANGE && run.vendingCooldown <= 0) {
    return { text: 'Späti-Automat: Booster & Dose', vending: true, enabled: true };
  }

  if (distance(player, map.lift) > USE_RANGE) return null;
  const missing = map.records.length - records.size;
  if (missing) {
    return {
      text: `Aufzug gesperrt (${missing}/${map.records.length} fehlen)`,
      enabled: false,
    };
  }
  if (run.lift.state === 'idle') return { text: 'Aufzug rufen!', enabled: true };
  return {
    text: run.lift.state === 'calling' ? 'Plattform halten!' : 'Abwärts zur nächsten Etage!',
    enabled: false,
  };
}

function reclaimCrown(run, source = run.player) {
  const { player } = run;
  player.helmet = true;
  run.droppedHelmet = null;
  run.events.push({ kind: 'crown_pickup', ...location(source) });
  spawnVfx(run, 'can_pickup', source, { color: 0xffb84d });
  const gained = addAura(run, 500, true);
  bark(run, player, `KRONE! +${gained}`, 'gold', 2.0, 1.25);
}

function use(run) {
  const action = interaction(run);
  if (!action?.enabled) return;
  const { player, map } = run;

  if (action.record) {
    const rec = action.record;
    run.records.add(rec.id);
    if (rec.id === 'log') {
      player.novaRadius += 0.9;
      player.helmet = true;
      run.droppedHelmet = null;
    } else if (rec.id === 'cylinder') {
      player.speedMult += 0.2;
      player.beanBoost = Math.max(player.beanBoost, 3.0);
    } else if (rec.id === 'spool') {
      player.clappers = Math.min(5, player.clappers + 2);
      player.helmet = true;
      run.droppedHelmet = null;
    } else {
      player.combo = Math.min(8, player.combo + 2);
      player.comboTimer = 10.0;
    }
    const gained = addAura(run, rec.id === 'skewer' ? 3000 : rec.id === 'spool' ? 2500 : 2000, true);
    run.stats.upgrades++;
    makeNoise(run, 'record', player, 4.2);
    spawnVfx(run, 'ko_explosion', rec);
    tell(run, rec.discovery, 2.6);
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
        shiftBody(run, enemy, Math.cos(pushAngle) * 1.5, Math.sin(pushAngle) * 1.5, 0.25);
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
    spawnVfx(run, 'can_pickup', map.vending, { color: 0x38f2af });
    bark(run, player, `OVERDRIVE! +${gained}`, 'jade', 2.0, 1.3);
    tell(run, 'Späti-Booster gezündet! +Tempo & +1 Dose!', 2.4);
  } else {
    run.lift.state = 'calling';
    makeNoise(run, 'lift', map.lift, 38);
    tell(run, 'ALARM! Aufzug fährt hoch — Plattform halten!', 3.0);
    bark(run, map.lift, 'LIFT KOMMT!', 'vermilion', 2.2, 1.6);
  }
}

function throwClapper(run) {
  const { player, map } = run;
  if (player.clappers === 0) return;
  const direction = { x: Math.cos(player.angle), z: Math.sin(player.angle) };
  let target = location(player);
  for (let step = 0.28; step < 6.4; step += 0.24) {
    const x = player.x + direction.x * step;
    const z = player.z + direction.z * step;
    if (!map.walkable(x, z, 0.08)) break;
    target = { x, z };
  }
  if (distance(player, target) < 0.5) return;
  const freeThrow = run.mods.has('pfand_magnet') && Math.random() < 0.45;
  if (!freeThrow) player.clappers--;
  run.throws.push({ from: location(player), to: target, elapsed: 0, duration: 0.39 });
  run.events.push({ kind: 'throw', ...location(player) });
  bark(run, target, freeThrow ? 'GRATIS-KÖDER!' : 'KÖDER!', 'cyan', 1.2, 1.0);
}

function swingWrench(run) {
  const { player, map, mods } = run;
  if (player.bonkCooldown > 0) return;
  const mutCd = map.mutator?.bonkCdMult ?? 1;
  player.bonkCooldown = BONK_COOLDOWN * (player.bonkCdMult || 1) * mutCd;
  player.swing = 0.36;
  makeNoise(run, 'bonk', player, 9.5);
  run.cameraShake = Math.max(run.cameraShake, 0.24);
  spawnVfx(run, 'bonk_swing', player);

  const reach = player.novaRadius || 2.25;
  const hasFire = mods.has('fire_pan');
  const knockMult = mods.has('shock_pan') ? 1.45 : 1.0;
  let hits = 0;

  if (distance(player, run.listener) < reach) {
    hits++;
    run.stats.bonks++;
    const canStun = run.listener.stunImmune <= 0;
    run.listener.stunned = canStun ? 2.5 : Math.max(run.listener.stunned, 0.65);
    if (canStun) run.listener.stunImmune = 4.2;
    if (hasFire) run.listener.burning = 3.2;
    const push = Math.atan2(run.listener.z - player.z, run.listener.x - player.x);
    shiftBody(run, run.listener, Math.cos(push) * 1.45 * knockMult, Math.sin(push) * 1.45 * knockMult, 0.24);
    const gained = addAura(run, 1000, true);
    spawnVfx(run, 'bonk_hit', run.listener, { color: hasFire ? 0xff7b36 : 0xff3b56 });
    bark(run, run.listener, hasFire ? `GLUT! +${gained}` : canStun ? `BONK! +${gained}` : `ABGEPRALLT! +${gained}`, 'gold', 2.4, 1.2);
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
    if (hasFire) run.hauke.burning = 3.2;
    const push = Math.atan2(run.hauke.z - player.z, run.hauke.x - player.x);
    shiftBody(run, run.hauke, Math.cos(push) * (canStun ? 1.15 : 0.45) * knockMult, Math.sin(push) * (canStun ? 1.15 : 0.45) * knockMult, 0.24);
    damageHauke(run, run.hauke.chargeState === 'rush' ? 18 : 35, hasFire ? 'GLUT-SCHELLE!' : 'SCHELLE!');
  }

  if (distance(player, run.tom) < reach) {
    hits++;
    run.tom.stunned = 3.2;
    if (hasFire) run.tom.burning = 3.2;
    run.stats.bonks++;
    player.clappers = Math.min(5, player.clappers + 1);
    const push = Math.atan2(run.tom.z - player.z, run.tom.x - player.x);
    shiftBody(run, run.tom, Math.cos(push) * 1.55 * knockMult, Math.sin(push) * 1.55 * knockMult, 0.24);
    const gained = addAura(run, 1400, true);
    spawnVfx(run, 'coin_burst', run.tom);
    bark(run, run.tom, `SCHELLE! +${gained}`, 'jade', 1.6, 1.3);
  }

  // Zerstöre Holzkisten & entzünde Druckfässer in Pfannen-Reichweite!
  for (const crate of run.crates) {
    if (!crate.broken && distance(player, crate) < reach) {
      smashCrate(run, crate);
    }
  }
  for (const barrel of run.barrels) {
    if (!barrel.exploded && distance(player, barrel) < reach) {
      barrel.fuse = 0.24;
      bark(run, barrel, 'ZÜNDUNG!', 'vermilion', 1.3, 0.6);
      spawnVfx(run, 'bonk_hit', barrel, { color: 0xff5744 });
    }
  }

  if (hits >= 2) {
    const bonus = addAura(run, 800, true);
    bark(run, player, `${hits}× DOPPEL-SCHELLE! +${bonus}`, 'gold', 2.2, 1.4);
  }

  if (hits === 0 && distance(player, map.vending) < 1.85 && run.vendingCooldown <= 0) {
    run.vendingCooldown = 8.5;
    player.clappers = Math.min(5, player.clappers + 1);
    const gained = addAura(run, 500, true);
    spawnVfx(run, 'can_pickup', map.vending, { color: 0x38f2af });
    bark(run, map.vending, `+1 DOSE! +${gained}`, 'jade', 1.9, 1.2);
  }
}

function findCrownDropPoint(run, around) {
  const randomAngle = ((around.x * 13.7 + around.z * 7.3) % 1) * Math.PI * 2;
  for (let i = 0; i < 8; i++) {
    const a = randomAngle + (i * Math.PI) / 4;
    for (const dist of [3.1, 2.3, 1.5]) {
      const x = around.x + Math.cos(a) * dist;
      const z = around.z + Math.sin(a) * dist;
      if (run.map.walkable(x, z, 0.3)) return { x, z };
    }
  }
  return location(around);
}

function movePlayer(run, input, dt) {
  const { player, map, mods } = run;
  if (input.lamp) {
    player.lamp = !player.lamp;
    run.events.push({ kind: 'shutter', ...location(player) });
    bark(run, player, player.lamp ? 'LICHT AN' : 'GETARNT', 'cyan', 1.85, 0.85);
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

  const nowWet = map.wetAt(player.x, player.z);
  if (nowWet && !player.wet && mods.has('espresso')) {
    player.beanBoost = Math.max(player.beanBoost, 4.0);
    bark(run, player, 'ESPRESSO-SLIDE!', 'jade', 1.9, 0.9);
  }
  player.wet = nowWet;

  player.dash = Math.max(0, player.dash - dt);
  if (input.dash && player.cooldown === 0) {
    player.dash = DASH_TIME;
    player.cooldown = DASH_COOLDOWN * (player.dashCdMult || 1);
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
    const slideMut = map.mutator?.slideMult ?? 1;
    speed = (player.sliding > 0 ? 9.8 * slideMut : 8.5) * (mods.has('twin_dash') ? 1.12 : 1);
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
  shiftBody(run, player, dx * speed * dt, dz * speed * dt, 0.26);
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

  if (run.droppedHelmet && player.invuln <= 0.6 && distance(player, run.droppedHelmet) < 0.78) {
    reclaimCrown(run);
  }

  if (input.use) use(run);
  if (input.lure) throwClapper(run);
  if (input.bonk) swingWrench(run);
}

function advanceProps(run, dt) {
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
  for (const barrel of run.barrels) {
    if (!barrel.exploded && barrel.fuse > 0) {
      barrel.fuse -= dt;
      if (barrel.fuse <= 0) detonateBarrel(run, barrel);
    }
  }
}

function applyBurnTick(run, enemy, dt, isHauke = false) {
  if (!enemy.burning || enemy.burning <= 0) return;
  enemy.burning = Math.max(0, enemy.burning - dt);
  enemy.burnTick = (enemy.burnTick || 0) - dt;
  if (enemy.burnTick <= 0) {
    enemy.burnTick = 0.55;
    spawnVfx(run, 'can_pickup', enemy, { color: 0xff5744 });
    if (isHauke) damageHauke(run, 8, 'GLUT!');
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
    const range = run.map.clearPath(pulse, listener) ? pulse.reach : pulse.reach * 0.63;
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
    agent.path = run.map.route(agent, targetPoint);
    agent.replanAt = run.time + 0.24;
  }
  while (agent.path.length && distance(agent, agent.path[0]) < 0.16) agent.path.shift();
  while (agent.path.length > 1 && run.map.clearPath(agent, agent.path[1], 0.25)) agent.path.shift();
  const target = agent.path[0];
  if (!target) return false;
  const heading = Math.atan2(target.z - agent.z, target.x - agent.x);
  const turn = Math.atan2(Math.sin(heading - agent.angle), Math.cos(heading - agent.angle));
  agent.angle += turn * Math.min(1, dt * 11);
  const stride = Math.min(speed * dt, distance(agent, target));
  const before = location(agent);
  shiftBody(run, agent, Math.cos(heading) * stride, Math.sin(heading) * stride, 0.23);
  const moved = distance(agent, before);
  agent.stride = (agent.stride || 0) + moved;
  return moved > 0.001;
}

function threatScale(run) {
  return 1 + (run.floor - 1) * 0.08 + run.records.size * 0.09 + (run.lift.state === 'calling' ? 0.14 : 0);
}

function moveListener(run, dt) {
  const { listener, player, map } = run;
  listener.slipCooldown = Math.max(0, listener.slipCooldown - dt);
  listener.stunImmune = Math.max(0, (listener.stunImmune || 0) - dt);
  applyBurnTick(run, listener, dt, false);

  if (listener.stunned > 0) {
    listener.stunned = Math.max(0, listener.stunned - dt);
    listener.moving = false;
    listener.angle += dt * 7.5;
    return;
  }

  const gap = distance(listener, player);
  const visible = gap < (player.lamp ? 6.0 : 1.9) && map.clearPath(listener, player);
  const sound = hear(run);

  listener.awareness = clamp(listener.awareness + (visible ? dt * (gap < 1.3 ? 9 : 3.4) : -dt * 1.8), 0, 1);
  if (visible && (listener.awareness >= 1 || listener.mode === 'hunt')) {
    if (listener.mode !== 'hunt') {
      run.events.push({ kind: 'detected', ...location(listener) });
      bark(run, listener, 'DA?!', 'vermilion', 2.45, 1.0);
      if (run.mods.has('searchlight') && gap < 4.5 && listener.stunImmune <= 0) {
        listener.stunned = 0.85;
        listener.stunImmune = 4.5;
        bark(run, listener, 'GEBLENDET!', 'cyan', 2.6, 0.9);
      }
    }
    listener.mode = 'hunt';
    listener.lastSeen = run.time;
    listener.target = location(player);
  } else if (listener.mode === 'hunt' && run.time - listener.lastSeen > 1.35) {
    investigate(listener, sound ?? listener.target, run.time);
  } else if (sound && listener.mode !== 'hunt') {
    investigate(listener, sound, run.time);
  }

  const patrolList = map.patrol;
  if (distance(listener, listener.target) < 0.48) {
    if (listener.mode === 'patrol' && patrolList.length) {
      listener.patrol = (listener.patrol + 1) % patrolList.length;
      listener.target = patrolList[listener.patrol];
      listener.replanAt = run.time;
    } else if (listener.mode === 'investigate') {
      listener.mode = 'search';
      listener.searchUntil = run.time + 1.6;
      bark(run, listener, 'HÄ?!', 'gold', 2.45, 1.1);
    }
  }
  if (listener.mode === 'search' && run.time >= listener.searchUntil) {
    listener.mode = 'patrol';
    listener.target = patrolList[listener.patrol % Math.max(1, patrolList.length)] ?? listener.target;
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

  const nowWet = map.wetAt(listener.x, listener.z);
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
  const { hauke, player, map } = run;
  hauke.hitFlash = Math.max(0, (hauke.hitFlash || 0) - dt);
  hauke.stunImmune = Math.max(0, (hauke.stunImmune || 0) - dt);
  hauke.chargeCooldown = Math.max(0, (hauke.chargeCooldown || 0) - dt);
  applyBurnTick(run, hauke, dt, true);

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
      tell(run, 'Hauke ist aus dem Fresskoma erwacht — unterzuckert!', 2.5);
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
  const hyperScale = map.mutator?.haukeChargeScale ?? 1;

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

    // Hauke zertrümmert Holzkisten & zündet Fässer im Lauf!
    for (const crate of run.crates) {
      if (!crate.broken && distance({ x: nx, z: nz }, crate) < 0.72) {
        smashCrate(run, crate);
      }
    }
    for (const barrel of run.barrels) {
      if (!barrel.exploded && distance({ x: nx, z: nz }, barrel) < 0.75) {
        detonateBarrel(run, barrel);
        return;
      }
    }

    if (!map.walkable(nx, nz, 0.27)) {
      hauke.chargeState = 'none';
      hauke.chargeCooldown = 6.0 * hyperScale;
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
      hauke.chargeCooldown = 5.2 * hyperScale;
    }
    return;
  }

  const loudPulse = run.pulses.find((p) => (p.kind === 'lift' || p.kind === 'bonk' || p.kind === 'clapper' || p.kind === 'toot') && distance(p, hauke) < p.reach * 0.78);
  const canSee = player.lamp && gap < 5.6 && map.clearPath(hauke, player);

  if (canSee) {
    if (hauke.mode !== 'hunt') bark(run, hauke, 'ERBEUTEN!', 'vermilion', 2.3, 1.0);
    hauke.mode = 'hunt';
    hauke.target = location(player);
  } else if (loudPulse) {
    hauke.mode = 'investigate';
    hauke.target = location(loudPulse);
  } else if (run.lift.state === 'calling') {
    hauke.mode = 'hunt';
    hauke.target = location(map.lift);
  } else if (distance(hauke, hauke.target) < 0.55 && map.patrolHauke.length) {
    hauke.mode = 'patrol';
    hauke.patrol = (hauke.patrol + 1) % map.patrolHauke.length;
    hauke.target = map.patrolHauke[hauke.patrol];
    hauke.replanAt = run.time;
  }

  if (
    hauke.chargeCooldown <= 0 &&
    (hauke.mode === 'hunt' || gap < 4.5) &&
    gap > 2.25 && gap < 6.8 &&
    map.clearPath(hauke, player, 0.25)
  ) {
    hauke.chargeState = 'windup';
    hauke.chargeTimer = 0.62;
    hauke.chargeCooldown = Math.max(3.1, 5.4 - run.records.size * 0.5) * hyperScale;
    const aim = Math.atan2(player.z - hauke.z, player.x - hauke.x);
    hauke.angle = aim;
    hauke.chargeDirX = Math.cos(aim);
    hauke.chargeDirZ = Math.sin(aim);
    run.events.push({ kind: 'charge_windup', ...location(hauke) });
    bark(run, hauke, 'AUFPASSEN!', 'vermilion', 2.45, 0.9);
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
  const { tom, player, map } = run;
  tom.stealCooldown = Math.max(0, tom.stealCooldown - dt);
  tom.stunImmune = Math.max(0, (tom.stunImmune || 0) - dt);
  applyBurnTick(run, tom, dt, false);

  if (tom.stunned > 0) {
    tom.stunned = Math.max(0, tom.stunned - dt);
    tom.moving = false;
    tom.angle += dt * 9.0;
    return;
  }

  const gap = distance(tom, player);
  const hasLoot = player.pfand > 0 || player.clappers > 0 || run.records.has('spool');
  const tomPatrol = map.patrolTom;
  if (tom.stealCooldown > 2.2 && tomPatrol.length) {
    tom.mode = 'flee';
    tom.target = tomPatrol[tom.patrol % tomPatrol.length];
  } else if (hasLoot && (player.lamp || gap < 3.4) && gap < (run.records.has('spool') ? 8.2 : 5.4) && map.clearPath(tom, player)) {
    tom.mode = 'greed';
    tom.target = location(player);
  } else if (run.lift.state === 'calling') {
    tom.mode = 'greed';
    tom.target = location(map.lift);
  } else if (distance(tom, tom.target) < 0.52 && tomPatrol.length) {
    tom.mode = 'patrol';
    tom.patrol = (tom.patrol + 1) % tomPatrol.length;
    tom.target = tomPatrol[tom.patrol];
    tom.replanAt = run.time;
  }

  const tomScale = map.mutator?.tomSpeedScale ?? 1;
  const speed = (tom.mode === 'flee' ? 3.8 : tom.mode === 'greed' ? 2.9 : 1.8) * threatScale(run) * tomScale;
  tom.moving = followWaypoints(tom, tom.target, speed, dt, run);

  if (gap < 0.78 && tom.stealCooldown <= 0 && (player.lamp || gap < 0.72)) {
    tom.stealCooldown = 6.2;
    if (tomPatrol.length) {
      tom.patrol = (tom.patrol + 2) % tomPatrol.length;
      tom.target = tomPatrol[tom.patrol];
    }
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
  advanceProps(run, dt);
  moveListener(run, dt);
  moveHauke(run, dt);
  moveTom(run, dt);
  if (run.notices.length && run.notices[0].until < run.time) run.notices.length = 0;

  const caughtByAnton = run.listener.stunned <= 0 && distance(run.listener, run.player) < 0.54;
  const haukeHitRadius = run.hauke.chargeState === 'rush' ? 0.78 : 0.65;
  const caughtByHauke = run.hauke.stunned <= 0 && !(run.hauke.koTimer > 0) && (run.player.lamp || run.hauke.mode === 'hunt' || run.hauke.chargeState === 'rush') && distance(run.hauke, run.player) < haukeHitRadius;

  if ((caughtByAnton || caughtByHauke) && run.player.invuln <= 0) {
    if (run.player.helmet) {
      run.player.helmet = false;
      run.player.invuln = run.player.crownInvulnTime || 1.75;
      run.player.combo = 1;
      run.player.comboTimer = 0;
      run.cameraShake = 0.78;
      run.hitFlash = 0.45;
      const drop = findCrownDropPoint(run, run.player);
      run.droppedHelmet = drop;
      run.events.push({ kind: 'crown_drop', ...location(run.player) });
      spawnVfx(run, 'bonk_hit', run.player, { color: 0xffb84d });
      bark(run, run.player, 'KRONE VERLOREN!', 'vermilion', 2.2, 1.5);
      tell(run, 'Chef-Krone verloren! Schnell wieder einsammeln!', 2.6);
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
  if (run.lift.state === 'ready' && distance(run.player, run.map.lift) <= USE_RANGE) {
    run.modOffers = rollModOffers(run);
    run.state = 'floor_clear';
    run.events.push({ kind: 'escaped' });
  }
  return run;
}
