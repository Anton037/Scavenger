import { buildArena, LOADOUTS, randomFrom, UPGRADE_POOL } from './level.js';

export const STEP = 1 / 60;
export const WAVE_DURATION = 30;
export const BONK_COOLDOWN = 0.72;
export const DASH_COOLDOWN = 0.95;
export const LIFT_WAIT = 4;

const MAX_ENEMIES = 32;
const MAX_PICKUPS = 140;
const BARREL_RADIUS = 3.25;
const SPEZI_RADIUS = 2.15;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function bark(run, x, y, z, text, tone = 'gold', duration = 1.05) {
  if (run.barks.length >= 22) run.barks.shift();
  run.barks.push({
    id: ++run.barkSeq,
    x,
    y,
    z,
    text,
    tone,
    duration,
    until: run.time + duration,
  });
}

function notice(run, message, duration = 2.6) {
  const existing = run.notices.find((n) => n.message === message);
  if (existing) {
    existing.until = Math.max(existing.until, run.time + duration);
    return;
  }
  run.notices.unshift({ message, until: run.time + duration });
  if (run.notices.length > 3) run.notices.length = 3;
}

function emitEvent(run, kind, x, z, extra = {}) {
  run.events.push({ kind, x, z, ...extra });
}

function emitVfx(run, fx) {
  if (run.vfx.length < 48) run.vfx.push(fx);
}

const ANTON_QUIPS = ['NOCH PFAND DRAUF?!', 'HAB NUR 50 CENT!', 'AU MEIN SCHIENBEIN!', 'SCHON WIEDER MONTAG!', 'WO IST MEIN DÖNER?!'];
const TOM_QUIPS = ['MEINS!!', 'GRATIS SNACK!', 'PFAND-JACKPOT!'];
const KNOBI_QUIPS = ['BOAH KNOBI!!', 'KEIN TZATZIKI!!', 'FRISCHER ATEM!'];
const CHAOS_EVENTS = [
  { id: 'ordnungsamt', title: 'ORDNUNGSAMT KOMMT!!', sub: 'Antons rennen in Panik weg!' },
  { id: 'happy_hour', title: 'SPEZI HAPPY HOUR!!', sub: '-45% Cooldowns & Gratis-Dosen!' },
  { id: 'fettbahn', title: 'FRITTEUSEN-ÖL AUSGELAUFEN!!', sub: 'Gegner schlittern unkontrolliert!' },
];

function quip(run, x, y, z, list, tone = 'gold', duration = 1.05, minGap = 2.1) {
  if (run.time - (run.lastQuipAt ?? -99) < minGap || !list.length) return false;
  run.lastQuipAt = run.time;
  const text = list[Math.floor(run.rng() * list.length)];
  bark(run, x, y, z, text, tone, duration);
  return true;
}

function isInPool(map, x, z) {
  for (const p of map.pools) {
    if (Math.abs(x - p.x) <= p.w * 0.5 && Math.abs(z - p.z) <= p.d * 0.5) return p;
  }
  return null;
}

export function getStats(run) {
  const p = run.player;
  const loadout = LOADOUTS[run.loadoutId] ?? LOADOUTS.classic;
  const mut = run.map.mutator ?? {};
  const shadowMode = !p.lamp;
  const happyHour = run.chaosEvent?.id === 'happy_hour';
  const espresso = p.passives.espresso || 0;
  const magnet = p.passives.magnet || 0;
  const chili = p.passives.chili || 0;
  const dashMod = p.passives.dash_mod || 0;
  const poolBoost = p.sliding > 0 ? 1.35 * (mut.slideMult || 1) : 1;
  const rushBoost = p.beanBoost > 0 ? 1.16 : 1;

  return {
    speed: 4.35 * loadout.speedMult * (1 + espresso * 0.1) * (shadowMode ? 1.14 : 1) * poolBoost * rushBoost,
    dmgMult: (1 + chili * 0.22 + (p.beanBoost > 0 ? 0.18 : 0)),
    areaMult: loadout.areaMult * (1 + chili * 0.12),
    cdMult: (mut.cdMult || 1) * Math.max(0.42, 1 - espresso * 0.1) * (shadowMode ? 0.88 : 1) * (happyHour ? 0.55 : 1),
    dashCdMult: loadout.dashCdMult * Math.max(0.35, 1 - dashMod * 0.16),
    bonkCdMult: loadout.bonkCdMult,
    magnetRadius: 2.65 * loadout.magnetMult * (1 + magnet * 0.38),
    xpMult: (mut.scoreMult || 1) * (1 + magnet * 0.18),
  };
}

function xpThreshold(level) {
  return Math.round(9 + level * 6 + (level ** 1.32) * 1.8);
}

function pushOutOfBlocks(map, body, radius) {
  body.x = clamp(body.x, 1.06 + radius, map.width - 1.06 - radius);
  body.z = clamp(body.z, 1.06 + radius, map.depth - 1.06 - radius);
  for (const b of map.blocks) {
    const hw = b.w * 0.5 + radius;
    const hd = b.d * 0.5 + radius;
    const dx = body.x - b.x;
    const dz = body.z - b.z;
    if (Math.abs(dx) < hw && Math.abs(dz) < hd) {
      const ox = hw - Math.abs(dx);
      const oz = hd - Math.abs(dz);
      if (ox < oz) body.x += dx >= 0 ? ox : -ox;
      else body.z += dz >= 0 ? oz : -dz;
    }
  }
}

function moveBody(run, body, dx, dz, radius = 0.26, checkTemp = false) {
  const { map } = run;
  const temp = checkTemp ? { crates: run.crates, barrels: run.barrels } : null;
  let moved = false;
  let slammed = false;
  if (dx !== 0) {
    if (map.walkable(body.x + dx, body.z, radius, temp)) {
      body.x += dx;
      moved = true;
    } else {
      slammed = true;
    }
  }
  if (dz !== 0) {
    if (map.walkable(body.x, body.z + dz, radius, temp)) {
      body.z += dz;
      moved = true;
    } else {
      slammed = true;
    }
  }
  pushOutOfBlocks(map, body, radius);
  return { moved, slammed };
}

function shiftBodyWithSlam(run, body, dx, dz, radius = 0.28) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.24));
  const sx = dx / steps;
  const sz = dz / steps;
  let wallHit = false;
  for (let i = 0; i < steps; i++) {
    const res = moveBody(run, body, sx, sz, radius, false);
    if (res.slammed) {
      wallHit = true;
      break;
    }
    for (const barrel of run.barrels) {
      if (!barrel.exploded && Math.hypot(body.x - barrel.x, body.z - barrel.z) < 0.78) {
        detonateBarrel(run, barrel);
      }
    }
  }
  return wallHit;
}

function buildUpgradeOffers(run) {
  const { weapons, passives } = run.player;
  const candidates = [];
  for (const item of UPGRADE_POOL) {
    const cur = item.kind === 'weapon' ? (weapons[item.id] || 0) : (passives[item.id] || 0);
    if (cur < item.maxLevel) {
      candidates.push({
        id: item.id,
        kind: item.kind,
        name: item.name,
        icon: item.icon,
        tint: item.tint,
        nextLevel: cur + 1,
        isNew: cur === 0,
        desc: item.descForLevel(cur + 1),
      });
    }
  }
  // Fisher-Yates using deterministic run.rng
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(run.rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, 3);
}

export function newRun(options = {}) {
  const seed = options.seed ?? 2026;
  const loadoutId = LOADOUTS[options.loadout] ? options.loadout : 'classic';
  const loadout = LOADOUTS[loadoutId];
  const map = buildArena(seed, options.floor ?? 1);
  const rng = randomFrom(seed * 31 + 17);

  const weapons = { pan: 0, skewer: 0, doner: 0, spezi: 0, beam: 0, can: 0, knobi: 0 };
  weapons[loadout.startWeapon] = 1;

  const passives = { espresso: 0, magnet: 0, crown: 0, chili: 0, dash_mod: 0 };

  const player = {
    x: map.start.x,
    z: map.start.z,
    angle: -Math.PI / 2,
    hp: loadout.maxHp,
    maxHp: loadout.maxHp,
    helmet: true,
    crownRegen: 0,
    invuln: 0.4,
    lamp: true,
    moving: false,
    stride: 0,
    dash: 0,
    dashDir: { x: 0, z: -1 },
    cooldown: 0,
    bonkCooldown: 0,
    comboStep: 0,
    comboReset: 0,
    swing: 0,
    finisherSwing: 0,
    knobiPulse: 0,
    sliding: 0,
    beanBoost: 0,
    noise: 0,
    stepMark: 0,
    clappers: loadout.clappers,
    level: 1,
    xp: 0,
    xpNext: xpThreshold(1),
    kills: 0,
    pfand: 0,
    combo: 1,
    comboTimer: 0,
    maxCombo: 1,
    weapons,
    passives,
    novaRadius: 2.45 * loadout.areaMult,
    donerAngle: 0,
    timers: {
      pan: 0.35,
      skewer: 0.55,
      spezi: 1.4,
      beam: 1.1,
      can: 1.5,
      knobi: 0.45,
    },
    inputBuffer: { bonk: 0, dash: 0, lure: 0 },
  };

  const crates = map.crates.map((c) => ({ ...c }));
  const barrels = map.barrels.map((b) => ({ ...b }));

  const run = {
    seed,
    floor: 1,
    wave: 1,
    waveTimer: 0,
    loadoutId,
    rng,
    map,
    player,
    enemies: [],
    antons: [],
    listener: null,
    hauke: null,
    tom: null,
    enemySeq: 0,
    spawnTimer: 0.4,
    crateRespawn: 14,
    barrelRespawn: 11,
    duckSpawnTimer: 16,
    chaosTimer: 26,
    chaosEvent: null,
    lastQuipAt: -5,
    projectiles: [],
    bombs: [],
    throws: [],
    explosions: [],
    pickups: [],
    pickupSeq: 0,
    crates,
    barrels,
    records: new Set(),
    valves: [],
    cans: [],
    lift: { state: 'survival', remaining: 0 },
    droppedHelmet: null,
    mods: new Set([loadout.startWeapon]),
    upgradeOffers: [],
    pendingLevelUps: 0,
    notices: [],
    events: [],
    pulses: [],
    vfx: [],
    barks: [],
    barkSeq: 0,
    time: 0,
    state: 'playing',
    deathReason: '',
    caughtBy: null,
    hitFlash: 0,
    hitStop: 0,
    cameraShake: 0,
    stats: {
      kills: 0,
      antonKills: 0,
      tomKills: 0,
      haukeKills: 0,
      bonks: 0,
      wallSlams: 0,
      barrels: 0,
      dodges: 0,
      chests: 0,
    },
  };

  // Start-Gegner für sofortige Action (plus Titel-Vorschau!)
  spawnEnemy(run, 'anton', { x: map.start.x - 6.8, z: map.start.z - 4.2 });
  spawnEnemy(run, 'anton', { x: map.start.x + 7.2, z: map.start.z - 3.6 });
  spawnEnemy(run, 'anton', { x: map.start.x + 5.5, z: map.start.z + 6.4 });
  syncCompatRefs(run);
  return run;
}

function syncCompatRefs(run) {
  run.antons = run.enemies.filter((e) => e.type === 'anton' && !e.dead);
  run.tom = run.enemies.find((e) => e.type === 'tom' && !e.dead) ?? null;
  run.hauke = run.enemies.find((e) => e.type === 'hauke' && !e.dead) ?? null;
  run.listener = run.antons[0] ?? run.hauke ?? run.tom ?? { x: run.player.x, z: run.player.z, dead: true };
}

function spawnEnemy(run, type, posOverride = null, options = {}) {
  const { map, player, wave } = run;
  const activeCount = run.enemies.filter((e) => !e.dead).length;
  if (type !== 'hauke' && activeCount >= MAX_ENEMIES) return null;

  let sx = posOverride?.x;
  let sz = posOverride?.z;
  if (sx === undefined || sz === undefined) {
    for (let attempt = 0; attempt < 16; attempt++) {
      const side = Math.floor(run.rng() * 4);
      const t = 2.2 + run.rng() * (map.width - 4.4);
      const candX = side === 0 ? 2.1 : side === 1 ? map.width - 2.1 : t;
      const candZ = side === 2 ? 2.1 : side === 3 ? map.depth - 2.1 : t;
      if (Math.hypot(candX - player.x, candZ - player.z) >= 7.5 && map.walkable(candX, candZ, 0.35)) {
        sx = candX;
        sz = candZ;
        break;
      }
    }
    if (sx === undefined) {
      const angle = run.rng() * Math.PI * 2;
      sx = clamp(player.x + Math.cos(angle) * 10, 2.2, map.width - 2.2);
      sz = clamp(player.z + Math.sin(angle) * 10, 2.2, map.depth - 2.2);
    }
  }

  const isElite = type === 'anton' && Boolean(options.elite);
  const scaleHp = 1 + (wave - 1) * 0.24;
  let hp = 14 * scaleHp;
  let speed = 2.15 + Math.min(1.1, wave * 0.08);
  let radius = 0.32;
  let damage = 11 + Math.floor(wave * 1.5);

  if (type === 'anton' && isElite) {
    hp = 46 * scaleHp;
    speed = 2.45 + Math.min(0.95, wave * 0.07);
    radius = 0.42;
    damage = 16 + Math.floor(wave * 2);
  } else if (type === 'tom') {
    hp = 18 * scaleHp;
    speed = 3.35 + Math.min(0.9, wave * 0.08);
    radius = 0.3;
    damage = 9 + wave;
  } else if (type === 'hauke') {
    hp = 135 + (wave - 1) * 48;
    speed = 2.25 + Math.min(0.65, wave * 0.05);
    radius = 0.62;
    damage = 22 + Math.floor(wave * 2.5);
  }

  const enemy = {
    id: ++run.enemySeq,
    type,
    elite: isElite,
    x: sx,
    z: sz,
    angle: Math.atan2(player.z - sz, player.x - sx),
    hp,
    maxHp: hp,
    speed,
    radius,
    damage,
    dead: false,
    moving: true,
    mode: 'hunt',
    stunned: 0,
    slowed: 0,
    exposed: 0,
    hitFlash: 0,
    burning: 0,
    donerCd: 0,
    knockX: 0,
    knockZ: 0,
    knockTime: 0,
    lootBank: type === 'tom' ? 6 : 0,
    hasCrown: false,
    panicked: 0,
    stuffed: 0,
    coma: 0,
    burpCd: type === 'hauke' ? 5.2 : 0,
    slideVx: 0,
    slideVz: 0,
    chargeState: 'none',
    chargeTimer: type === 'hauke' ? 4.2 : 0,
    chargeDir: { x: 0, z: 0 },
    enraged: false,
    koTimer: 0,
  };
  run.enemies.push(enemy);
  syncCompatRefs(run);
  return enemy;
}

function spawnPickup(run, kind, x, z, value = 1, tone = 'jade') {
  if (run.pickups.length >= MAX_PICKUPS) {
    // Coalesce oldest xp gem instead of dropping overflow
    const oldest = run.pickups.find((pk) => pk.kind === 'xp' && !pk.collected);
    if (oldest && kind === 'xp') {
      oldest.value += value;
      oldest.tone = oldest.value >= 6 ? 'gold' : oldest.value >= 3 ? 'cyan' : 'jade';
      return oldest;
    }
  }
  const px = clamp(x, 1.5, run.map.width - 1.5);
  const pz = clamp(z, 1.5, run.map.depth - 1.5);
  const item = {
    id: ++run.pickupSeq,
    kind,
    x: px,
    z: pz,
    value,
    tone,
    magnetized: false,
    collected: false,
    age: 0,
  };
  run.pickups.push(item);
  return item;
}

function addXp(run, amount) {
  const { player } = run;
  const mult = getStats(run).xpMult;
  const gained = amount * mult;
  player.xp += gained;
  player.pfand = Math.round(player.pfand + amount * 25 * mult);
  while (player.xp >= player.xpNext) {
    player.xp -= player.xpNext;
    player.level += 1;
    player.xpNext = xpThreshold(player.level);
    run.pendingLevelUps += 1;
  }
}

function triggerPendingLevelUp(run) {
  if (run.pendingLevelUps <= 0 || run.state !== 'playing') return;
  const offers = buildUpgradeOffers(run);
  if (offers.length === 0) {
    run.pendingLevelUps = 0;
    run.player.hp = Math.min(run.player.maxHp, run.player.hp + 20);
    run.player.pfand += 400;
    bark(run, run.player.x, 1.7, run.player.z, 'MAX BUILD! +20 HP', 'gold', 1.2);
    return;
  }
  run.pendingLevelUps -= 1;
  run.upgradeOffers = offers;
  run.state = 'levelup';
  emitEvent(run, 'levelup', run.player.x, run.player.z);
}

export function applyUpgrade(run, upgradeId) {
  const def = UPGRADE_POOL.find((u) => u.id === upgradeId);
  if (!def) {
    run.upgradeOffers = [];
    run.state = 'playing';
    return run;
  }
  const { player } = run;
  if (def.kind === 'weapon') {
    player.weapons[def.id] = Math.min(def.maxLevel, (player.weapons[def.id] || 0) + 1);
    if (def.id === 'can') player.clappers = Math.min(12, player.clappers + 2);
  } else {
    player.passives[def.id] = Math.min(def.maxLevel, (player.passives[def.id] || 0) + 1);
    if (def.id === 'crown') {
      player.maxHp += 25;
      player.hp = Math.min(player.maxHp, player.hp + 35);
      player.helmet = true;
      run.droppedHelmet = null;
      player.crownRegen = 0;
    }
  }
  run.mods.add(def.id);
  run.upgradeOffers = [];
  notice(run, `${def.name} Lv ${def.kind === 'weapon' ? player.weapons[def.id] : player.passives[def.id]} aktiv!`, 2.2);
  bark(run, player.x, 1.85, player.z, `${def.name.toUpperCase()}!`, def.tint, 1.15);

  if (run.pendingLevelUps > 0) {
    const nextOffers = buildUpgradeOffers(run);
    if (nextOffers.length > 0) {
      run.pendingLevelUps -= 1;
      run.upgradeOffers = nextOffers;
      run.state = 'levelup';
      return run;
    }
    run.pendingLevelUps = 0;
  }
  run.state = 'playing';
  return run;
}

export const applyMod = applyUpgrade;

export function finishRunCashOut(run) {
  run.state = 'escaped';
  emitEvent(run, 'escaped', run.player.x, run.player.z);
  return run;
}

function releaseStolenCrown(run, tom) {
  if (!tom?.hasCrown) return;
  tom.hasCrown = false;
  run.player.pfand += 450;
  const dx = run.player.x - tom.x;
  const dz = run.player.z - tom.z;
  const d = Math.hypot(dx, dz) || 1;
  run.droppedHelmet = {
    x: clamp(tom.x + (dx / d) * 0.95, 1.8, run.map.width - 1.8),
    z: clamp(tom.z + (dz / d) * 0.95, 1.8, run.map.depth - 1.8),
  };
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    spawnPickup(run, 'xp', tom.x + Math.cos(a) * 0.55, tom.z + Math.sin(a) * 0.55, 3, 'gold');
  }
  emitEvent(run, 'crown_drop', tom.x, tom.z);
  emitVfx(run, { kind: 'coin_burst', x: tom.x, z: tom.z });
  bark(run, tom.x, 1.75, tom.z, 'KRONE ZURÜCKGEKLATSCHT!!', 'gold', 1.3);
}

function registerKill(run, enemy) {
  if (enemy.dead) return;
  enemy.dead = true;
  const { player, stats } = run;
  stats.kills += 1;
  player.kills += 1;
  player.combo = Math.min(99, player.combo + 1);
  player.comboTimer = 3.2;
  player.maxCombo = Math.max(player.maxCombo, player.combo);

  if (enemy.hasCrown) releaseStolenCrown(run, enemy);

  if (enemy.type === 'anton') {
    stats.antonKills += 1;
    player.pfand += enemy.elite ? 280 : 90;
    const xpVal = enemy.elite ? 10 : run.wave >= 4 ? 3 : 1;
    const xpTone = enemy.elite ? 'gold' : run.wave >= 4 ? 'cyan' : 'jade';
    spawnPickup(run, 'xp', enemy.x, enemy.z, xpVal, xpTone);
    if (enemy.elite) {
      spawnPickup(run, run.rng() < 0.65 ? 'heal' : 'magnet_can', enemy.x + 0.35, enemy.z - 0.2, 25, 'vermilion');
      emitVfx(run, { kind: 'coin_burst', x: enemy.x, z: enemy.z });
    } else if (run.rng() < 0.08) {
      spawnPickup(run, 'dose', enemy.x + 0.15, enemy.z, 2, 'gold');
    } else if (run.rng() < 0.03) {
      spawnPickup(run, 'heal', enemy.x - 0.15, enemy.z, 25, 'vermilion');
    }
  } else if (enemy.type === 'tom') {
    stats.tomKills += 1;
    player.pfand += 380 + enemy.lootBank * 40;
    const burstCount = 5 + Math.min(5, Math.floor(enemy.lootBank / 2));
    for (let i = 0; i < burstCount; i++) {
      const a = (i / burstCount) * Math.PI * 2;
      spawnPickup(run, 'xp', enemy.x + Math.cos(a) * 0.65, enemy.z + Math.sin(a) * 0.65, 3, 'gold');
    }
    spawnPickup(run, 'heal', enemy.x, enemy.z, 25, 'vermilion');
    emitVfx(run, { kind: 'coin_burst', x: enemy.x, z: enemy.z });
    bark(run, enemy.x, 1.5, enemy.z, 'PIÑATA!', 'gold', 1.2);
  } else if (enemy.type === 'hauke') {
    stats.haukeKills += 1;
    player.pfand += 1500;
    emitEvent(run, 'ko', enemy.x, enemy.z);
    emitVfx(run, { kind: 'ko_explosion', x: enemy.x, z: enemy.z });
    run.cameraShake = Math.max(run.cameraShake, 0.72);
    run.hitStop = Math.max(run.hitStop, 0.06);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      spawnPickup(run, 'xp', enemy.x + Math.cos(a) * 0.9, enemy.z + Math.sin(a) * 0.9, 6, 'gold');
    }
    spawnPickup(run, 'chest', enemy.x, enemy.z, 1, 'gold');
    bark(run, enemy.x, 1.9, enemy.z, 'HAUKE K.O.!!', 'jade', 1.45);
    notice(run, 'HAUKE BESIEGT! Goldene Chef-Truhe einsammeln!', 3.2);
  }
  emitVfx(run, { kind: 'bonk_hit', x: enemy.x, z: enemy.z, color: enemy.type === 'tom' ? 0x38f2af : 0xffb84d });
}

function damageEnemy(run, enemy, rawDmg, opts = {}) {
  if (!enemy || enemy.dead) return false;
  const stats = getStats(run);
  const inLightCone = isEnemyInPlayerCone(run.player, enemy);
  const coneMult = run.player.lamp && inLightCone ? 1.3 : 1.0;
  const exposedMult = enemy.exposed > 0 ? 1.25 : 1.0;
  const dmg = rawDmg * stats.dmgMult * coneMult * exposedMult * (opts.mult ?? 1);

  enemy.hp -= dmg;
  enemy.hitFlash = 0.16;
  if (opts.stun && opts.stun > 0) enemy.stunned = Math.max(enemy.stunned, opts.stun);
  if (opts.slow && opts.slow > 0) enemy.slowed = Math.max(enemy.slowed, opts.slow);
  if (opts.burn) enemy.burning = Math.max(enemy.burning, 2.5);

  const kx = opts.knockX ?? (enemy.x - run.player.x);
  const kz = opts.knockZ ?? (enemy.z - run.player.z);
  const kd = Math.hypot(kx, kz) || 1;
  const kForce = (opts.knock ?? 0) * (enemy.type === 'hauke' ? 0.25 : 1.0);
  if (kForce > 0.05) {
    enemy.knockX = (kx / kd) * kForce;
    enemy.knockZ = (kz / kd) * kForce;
    enemy.knockTime = 0.16;
  }

  if (enemy.hasCrown && enemy.hp > 0 && (opts.knock >= 6 || dmg >= 10)) {
    releaseStolenCrown(run, enemy);
  } else if (opts.label) {
    bark(run, enemy.x, 1.45, enemy.z, opts.label, opts.tone ?? 'gold', 0.85);
  } else if (enemy.type === 'anton' && run.rng() < 0.16) {
    quip(run, enemy.x, 1.45, enemy.z, ANTON_QUIPS, 'gold', 0.95, 2.5);
  }

  if (enemy.type === 'hauke' && !enemy.enraged && enemy.hp > 0 && enemy.hp <= enemy.maxHp * 0.5) {
    enemy.enraged = true;
    bark(run, enemy.x, 2.0, enemy.z, 'WUT-MODUS!!', 'vermilion', 1.3);
  }

  if (enemy.hp <= 0) {
    registerKill(run, enemy);
    return true;
  }
  return false;
}

function isEnemyInPlayerCone(player, enemy) {
  const dx = enemy.x - player.x;
  const dz = enemy.z - player.z;
  const dist = Math.hypot(dx, dz);
  if (dist > 9.5) return false;
  if (dist < 0.7) return true;
  const dot = (dx * Math.cos(player.angle) + dz * Math.sin(player.angle)) / dist;
  return dot > 0.62;
}

function detonateBarrel(run, barrel) {
  if (!barrel || barrel.exploded) return;
  barrel.exploded = true;
  barrel.fuse = 0;
  run.stats.barrels += 1;
  run.player.pfand += 140;
  const r = BARREL_RADIUS * getStats(run).areaMult;
  emitEvent(run, 'wall_slam', barrel.x, barrel.z);
  emitVfx(run, { kind: 'ko_explosion', x: barrel.x, z: barrel.z });
  run.explosions.push({ x: barrel.x, z: barrel.z, radius: r, age: 0, maxAge: 0.42, color: 0xff5744 });
  run.cameraShake = Math.max(run.cameraShake, 0.52);
  run.hitStop = Math.max(run.hitStop, 0.04);
  bark(run, barrel.x, 1.5, barrel.z, 'BOOM!', 'vermilion', 1.0);

  for (const enemy of run.enemies) {
    if (enemy.dead) continue;
    const d = Math.hypot(enemy.x - barrel.x, enemy.z - barrel.z);
    if (d <= r + enemy.radius) {
      damageEnemy(run, enemy, 26 + run.wave * 4, {
        knock: 10.5,
        knockX: enemy.x - barrel.x,
        knockZ: enemy.z - barrel.z,
        stun: 0.9,
        burn: true,
      });
    }
  }
  for (const c of run.crates) {
    if (!c.broken && Math.hypot(c.x - barrel.x, c.z - barrel.z) <= r) smashCrate(run, c);
  }
  for (const other of run.barrels) {
    if (!other.exploded && Math.hypot(other.x - barrel.x, other.z - barrel.z) <= r) {
      other.fuse = Math.max(other.fuse, 0.01);
      detonateBarrel(run, other);
    }
  }
}

function smashCrate(run, crate) {
  if (!crate || crate.broken) return;
  crate.broken = true;
  emitEvent(run, crate.gold ? 'chest_gold' : 'crate_break', crate.x, crate.z);
  emitVfx(run, { kind: 'crate_smash', x: crate.x, z: crate.z });
  if (crate.gold) {
    spawnPickup(run, 'chest', crate.x, crate.z, 1, 'gold');
    bark(run, crate.x, 1.4, crate.z, 'GOLD-TRUHE!', 'gold', 1.15);
  } else {
    const roll = run.rng();
    if (roll < 0.30) spawnPickup(run, 'heal', crate.x, crate.z, 25, 'vermilion');
    else if (roll < 0.54) spawnPickup(run, 'dose', crate.x, crate.z, 2, 'gold');
    else if (roll < 0.68) spawnPickup(run, 'duck', crate.x, crate.z, 1, 'gold');
    else if (roll < 0.82) spawnPickup(run, 'magnet_can', crate.x, crate.z, 1, 'cyan');
    else spawnPickup(run, 'xp', crate.x, crate.z, 6, 'gold');
  }
}

function hurtPlayer(run, amount, attacker) {
  const { player } = run;
  if (player.invuln > 0 || player.dash > 0 || player.sliding > 0 || run.state !== 'playing') return false;

  if (player.helmet) {
    player.helmet = false;
    player.crownRegen = Math.max(8, 18 - (player.passives.crown || 0) * 2.5);
    player.invuln = 0.85;
    run.hitFlash = 0.45;
    run.cameraShake = Math.max(run.cameraShake, 0.45);
    const dropA = run.rng() * Math.PI * 2;
    const dropD = 2.4 + run.rng() * 1.1;
    run.droppedHelmet = {
      x: clamp(player.x + Math.cos(dropA) * dropD, 2, run.map.width - 2),
      z: clamp(player.z + Math.sin(dropA) * dropD, 2, run.map.depth - 2),
    };
    emitEvent(run, 'crown_drop', player.x, player.z);
    bark(run, player.x, 1.75, player.z, 'KRONE VERLOREN!', 'vermilion', 1.2);
    // Shockwave pushback on crown break
    for (const enemy of run.enemies) {
      if (enemy.dead) continue;
      if (Math.hypot(enemy.x - player.x, enemy.z - player.z) < 3.4) {
        damageEnemy(run, enemy, 8, { knock: 9.5, stun: 0.5 });
      }
    }
    return false;
  }

  player.hp = Math.max(0, player.hp - amount);
  player.invuln = 0.58;
  run.hitFlash = 0.52;
  run.cameraShake = Math.max(run.cameraShake, 0.45);
  bark(run, player.x, 1.65, player.z, `-${Math.round(amount)} HP`, 'vermilion', 0.9);
  emitEvent(run, 'bonk', player.x, player.z);

  if (player.hp <= 0) {
    run.state = 'caught';
    run.caughtBy = attacker?.type ?? 'anton';
    run.deathReason = attacker?.type === 'hauke'
      ? `Von Hauke in Welle ${run.wave} überrollt!`
      : `In Welle ${run.wave} (Level ${player.level}) überwältigt.`;
    emitEvent(run, 'caught', player.x, player.z);
    return true;
  }
  return false;
}

function firePanSwing(run, isManual = false) {
  const { player } = run;
  const stats = getStats(run);
  const panLv = Math.max(1, player.weapons.pan || 0);
  const isFinisher = isManual && player.comboStep === 2;
  const radius = (2.4 + panLv * 0.16) * stats.areaMult * (isFinisher ? 1.28 : isManual ? 1.12 : 1.0);
  const baseDmg = (11 + panLv * 4.5) * (isFinisher ? 1.6 : isManual ? 1.25 : 1.0);

  player.swing = isFinisher ? 0.42 : 0.32;
  player.finisherSwing = isFinisher ? 0.42 : 0;
  player.novaRadius = radius;
  if (isManual) {
    run.stats.bonks += 1;
    player.comboStep = (player.comboStep + 1) % 3;
    player.comboReset = 1.65;
  }

  emitEvent(run, 'bonk', player.x, player.z);
  emitVfx(run, { kind: 'bonk_swing', x: player.x, z: player.z });

  const fx = Math.cos(player.angle);
  const fz = Math.sin(player.angle);
  let hitCount = 0;

  for (const enemy of run.enemies) {
    if (enemy.dead) continue;
    const dx = enemy.x - player.x;
    const dz = enemy.z - player.z;
    const dist = Math.hypot(dx, dz);
    if (dist > radius + enemy.radius) continue;
    if (!isFinisher && isManual && dist > radius * 0.65) {
      const dot = (dx * fx + dz * fz) / (dist || 1);
      if (dot < -0.45) continue;
    }
    hitCount++;
    damageEnemy(run, enemy, baseDmg, {
      knock: isFinisher ? 14 : 9.5,
      stun: isFinisher ? 0.55 : 0.2,
      burn: panLv >= 4,
      label: isFinisher && hitCount === 1 ? 'MEGA-SCHELLE!' : null,
      tone: 'gold',
    });
  }

  for (const crate of run.crates) {
    if (!crate.broken && Math.hypot(crate.x - player.x, crate.z - player.z) <= radius + 0.4) {
      smashCrate(run, crate);
    }
  }
  for (const barrel of run.barrels) {
    if (!barrel.exploded && Math.hypot(barrel.x - player.x, barrel.z - player.z) <= radius + 0.4) {
      detonateBarrel(run, barrel);
    }
  }
  // Slapshot manual or auto throws
  for (const tossed of run.throws) {
    if (!tossed.slapshot && Math.hypot(tossed.x - player.x, tossed.z - player.z) <= radius) {
      tossed.slapshot = true;
      tossed.vx = fx * 19;
      tossed.vz = fz * 19;
      tossed.bounces += 2;
      tossed.damage *= 1.8;
      bark(run, tossed.x, 1.35, tossed.z, 'SLAPSHOT!', 'cyan', 0.9);
    }
  }

  if (hitCount > 0) {
    run.cameraShake = Math.max(run.cameraShake, isFinisher ? 0.36 : 0.18);
    if (isManual && hitCount >= 4) {
      bark(run, player.x, 1.9, player.z, hitCount >= 6 ? 'ALLE IN DIE FRITTEUSE!!' : 'GRATIS SCHELLE FÜR ALLE!', 'gold', 1.15);
    }
  }
}

function fireSkewers(run) {
  const { player } = run;
  const lv = player.weapons.skewer;
  if (lv <= 0) return;
  const alive = run.enemies.filter((e) => !e.dead);
  if (alive.length === 0) return;

  alive.sort((a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z));
  const count = 1 + lv;
  const pierce = 1 + Math.floor(lv / 2);
  const dmg = 10 + lv * 3.5;

  for (let i = 0; i < count; i++) {
    const target = alive[i % alive.length];
    const baseAngle = Math.atan2(target.z - player.z, target.x - player.x);
    const spread = count > 1 && i >= alive.length ? ((i % 3) - 1) * 0.16 : 0;
    const angle = baseAngle + spread;
    run.projectiles.push({
      kind: 'skewer',
      x: player.x + Math.cos(angle) * 0.45,
      z: player.z + Math.sin(angle) * 0.45,
      vx: Math.cos(angle) * 16.5,
      vz: Math.sin(angle) * 16.5,
      angle,
      damage: dmg,
      pierce,
      hitIds: new Set(),
      life: 1.4,
    });
  }
  emitEvent(run, 'skewer', player.x, player.z);
}

function launchSpeziBomb(run, targetX, targetZ, radiusMult = 1, dmgBoost = 1) {
  const { player } = run;
  const lv = Math.max(1, player.weapons.spezi || 0);
  const dx = targetX - player.x;
  const dz = targetZ - player.z;
  const dist = clamp(Math.hypot(dx, dz), 1.8, 8.8);
  const angle = Math.atan2(dz, dx);
  const tx = clamp(player.x + Math.cos(angle) * dist, 1.5, run.map.width - 1.5);
  const tz = clamp(player.z + Math.sin(angle) * dist, 1.5, run.map.depth - 1.5);

  run.bombs.push({
    fromX: player.x,
    fromZ: player.z,
    toX: tx,
    toZ: tz,
    x: player.x,
    z: player.z,
    elapsed: 0,
    duration: 0.46,
    radius: (SPEZI_RADIUS + lv * 0.22) * getStats(run).areaMult * radiusMult,
    damage: (19 + lv * 5.5) * dmgBoost,
  });
  emitEvent(run, 'throw', player.x, player.z);
}

function fireSpeziAuto(run) {
  const lv = run.player.weapons.spezi;
  if (lv <= 0) return;
  const alive = run.enemies.filter((e) => !e.dead);
  if (alive.length === 0) return;
  const count = 1 + Math.floor(lv / 3);
  for (let i = 0; i < count; i++) {
    const pick = alive[Math.floor(run.rng() * alive.length)];
    launchSpeziBomb(run, pick.x, pick.z);
  }
}

function fireLampBeam(run) {
  const { player } = run;
  const lv = player.weapons.beam;
  if (lv <= 0) return;
  const stats = getStats(run);
  const dmg = 13 + lv * 4.5;
  const maxTargets = 3 + lv * 2;
  let zapped = 0;

  for (const enemy of run.enemies) {
    if (enemy.dead || zapped >= maxTargets) continue;
    const dist = Math.hypot(enemy.x - player.x, enemy.z - player.z);
    const hit = player.lamp ? isEnemyInPlayerCone(player, enemy) : dist <= 4.6 * stats.areaMult;
    if (!hit) continue;
    zapped++;
    enemy.exposed = 2.0;
    damageEnemy(run, enemy, dmg, {
      stun: 0.65 + lv * 0.12,
      slow: 1.5,
      knock: 3.5,
      label: zapped === 1 ? (player.lamp ? 'BLEND-BLITZ!' : 'SCHATTEN-SCHOCK!') : null,
      tone: 'cyan',
    });
    emitVfx(run, { kind: 'can_pickup', x: enemy.x, z: enemy.z, color: 0x73d7ff });
  }
  if (zapped > 0) emitEvent(run, 'shutter', player.x, player.z);
}

function fireKnobiAura(run) {
  const { player } = run;
  const lv = player.weapons.knobi;
  if (lv <= 0) return;
  const stats = getStats(run);
  const r = (2.15 + lv * 0.28) * stats.areaMult;
  const dmg = 6 + lv * 2.5;
  player.knobiPulse = 0.34;
  player.knobiRadius = r;
  let hits = 0;
  let firstHit = null;

  for (const enemy of run.enemies) {
    if (enemy.dead) continue;
    const d = Math.hypot(enemy.x - player.x, enemy.z - player.z);
    if (d <= r + enemy.radius) {
      hits++;
      if (!firstHit) firstHit = enemy;
      damageEnemy(run, enemy, dmg, {
        knock: 4.8 + lv * 0.85,
        slow: 0.9,
      });
    }
  }
  if (hits > 0) {
    emitEvent(run, 'knobi', player.x, player.z);
    emitVfx(run, { kind: 'can_pickup', x: player.x, z: player.z, color: 0x38f2af });
    if (firstHit && run.rng() < 0.35) {
      quip(run, firstHit.x, 1.45, firstHit.z, KNOBI_QUIPS, 'jade', 0.95, 2.2);
    }
  }
}

export function triggerDuckQuack(run, x = run.player.x, z = run.player.z) {
  const radius = 7.5 * getStats(run).areaMult;
  emitEvent(run, 'duck_quack', x, z);
  emitVfx(run, { kind: 'coin_burst', x, z });
  run.explosions.push({ x, z, radius, age: 0, maxAge: 0.5, color: 0xffe082 });
  run.cameraShake = Math.max(run.cameraShake, 0.65);
  run.hitStop = Math.max(run.hitStop, 0.045);
  bark(run, run.player.x, 1.9, run.player.z, 'QUAAAK!!', 'gold', 1.3);

  let panickingBark = false;
  for (const enemy of run.enemies) {
    if (enemy.dead) continue;
    const dist = Math.hypot(enemy.x - x, enemy.z - z);
    if (dist <= radius + enemy.radius) {
      if (enemy.type !== 'hauke') enemy.panicked = Math.max(enemy.panicked, 3.6);
      damageEnemy(run, enemy, 28 + run.wave * 5, {
        knock: 15.5,
        knockX: enemy.x - x,
        knockZ: enemy.z - z,
        stun: enemy.type === 'hauke' ? 0.9 : 1.9,
        label: !panickingBark ? 'MEINE OHREN!!' : null,
        tone: 'cyan',
      });
      panickingBark = true;
    }
  }
  for (const crate of run.crates) {
    if (!crate.broken && Math.hypot(crate.x - x, crate.z - z) <= radius) smashCrate(run, crate);
  }
  for (const barrel of run.barrels) {
    if (!barrel.exploded && Math.hypot(barrel.x - x, barrel.z - z) <= radius) detonateBarrel(run, barrel);
  }
}

function throwCanProjectile(run, angleOverride = null, manual = false) {
  const { player } = run;
  if (manual) {
    if (player.clappers <= 0) return false;
    player.clappers -= 1;
  }
  const lv = Math.max(1, player.weapons.can || 0);
  let angle = angleOverride;
  if (angle === null) {
    const nearest = run.enemies
      .filter((e) => !e.dead)
      .sort((a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z))[0];
    angle = nearest ? Math.atan2(nearest.z - player.z, nearest.x - player.x) : player.angle;
  }
  const speed = 13.8 + lv * 0.8;
  run.throws.push({
    x: player.x + Math.cos(angle) * 0.4,
    z: player.z + Math.sin(angle) * 0.4,
    vx: Math.cos(angle) * speed,
    vz: Math.sin(angle) * speed,
    bounces: (manual ? 3 : 2) + lv,
    damage: (manual ? 22 : 12) + lv * 3.5,
    elapsed: 0,
    duration: 2.1,
    hitCooldowns: new Map(),
    slapshot: false,
  });
  emitEvent(run, 'throw', player.x, player.z);
  return true;
}

function updateAutoWeapons(run, dt) {
  const { player } = run;
  const stats = getStats(run);

  if (player.weapons.pan > 0) {
    player.timers.pan -= dt;
    if (player.timers.pan <= 0) {
      player.timers.pan = Math.max(0.55, (1.28 - player.weapons.pan * 0.1) * stats.cdMult);
      firePanSwing(run, false);
    }
  }
  if (player.weapons.skewer > 0) {
    player.timers.skewer -= dt;
    if (player.timers.skewer <= 0) {
      player.timers.skewer = Math.max(0.36, (1.1 - player.weapons.skewer * 0.08) * stats.cdMult);
      fireSkewers(run);
    }
  }
  if (player.weapons.doner > 0) {
    const lv = player.weapons.doner;
    player.donerAngle = (player.donerAngle + dt * (2.9 + lv * 0.42)) % (Math.PI * 2);
    const count = 1 + lv;
    const orbitR = (2.05 + lv * 0.14) * stats.areaMult;
    for (let i = 0; i < count; i++) {
      const a = player.donerAngle + (i * Math.PI * 2) / count;
      const bx = player.x + Math.cos(a) * orbitR;
      const bz = player.z + Math.sin(a) * orbitR;
      for (const enemy of run.enemies) {
        if (enemy.dead || enemy.donerCd > 0) continue;
        if (Math.hypot(enemy.x - bx, enemy.z - bz) <= 0.62 + enemy.radius) {
          enemy.donerCd = 0.34;
          damageEnemy(run, enemy, 8 + lv * 3, { knock: 4.5, knockX: enemy.x - player.x, knockZ: enemy.z - player.z });
        }
      }
      for (const crate of run.crates) {
        if (!crate.broken && Math.hypot(crate.x - bx, crate.z - bz) <= 0.68) smashCrate(run, crate);
      }
      for (const barrel of run.barrels) {
        if (!barrel.exploded && Math.hypot(barrel.x - bx, barrel.z - bz) <= 0.62) detonateBarrel(run, barrel);
      }
    }
  }
  if (player.weapons.spezi > 0) {
    player.timers.spezi -= dt;
    if (player.timers.spezi <= 0) {
      player.timers.spezi = Math.max(1.0, (2.6 - player.weapons.spezi * 0.2) * stats.cdMult);
      fireSpeziAuto(run);
    }
  }
  if (player.weapons.beam > 0) {
    player.timers.beam -= dt;
    if (player.timers.beam <= 0) {
      player.timers.beam = Math.max(0.85, (2.1 - player.weapons.beam * 0.16) * stats.cdMult);
      fireLampBeam(run);
    }
  }
  if (player.weapons.can > 0) {
    player.timers.can -= dt;
    if (player.timers.can <= 0) {
      player.timers.can = Math.max(0.95, (2.35 - player.weapons.can * 0.18) * stats.cdMult);
      const shots = 1 + Math.floor(player.weapons.can / 2);
      for (let i = 0; i < shots; i++) {
        throwCanProjectile(run, i === 0 ? null : player.angle + i * 0.45, false);
      }
    }
  }
  if (player.weapons.knobi > 0) {
    player.timers.knobi -= dt;
    if (player.timers.knobi <= 0) {
      player.timers.knobi = Math.max(0.45, (0.95 - player.weapons.knobi * 0.08) * stats.cdMult);
      fireKnobiAura(run);
    }
  }
}

function advanceProjectilesAndBombs(run, dt) {
  // Skewers
  for (let i = run.projectiles.length - 1; i >= 0; i--) {
    const p = run.projectiles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    if (p.life <= 0 || !run.map.walkable(p.x, p.z, 0.12)) {
      run.projectiles.splice(i, 1);
      continue;
    }
    for (const enemy of run.enemies) {
      if (enemy.dead || p.hitIds.has(enemy.id)) continue;
      if (Math.hypot(enemy.x - p.x, enemy.z - p.z) <= enemy.radius + 0.34) {
        p.hitIds.add(enemy.id);
        p.pierce -= 1;
        damageEnemy(run, enemy, p.damage, { knock: 4.0, knockX: p.vx, knockZ: p.vz });
        if (p.pierce <= 0) break;
      }
    }
    for (const barrel of run.barrels) {
      if (!barrel.exploded && Math.hypot(barrel.x - p.x, barrel.z - p.z) <= 0.55) {
        detonateBarrel(run, barrel);
        p.pierce = 0;
        break;
      }
    }
    if (p.pierce <= 0) run.projectiles.splice(i, 1);
  }

  // Arcing Spezi Bombs
  for (let i = run.bombs.length - 1; i >= 0; i--) {
    const b = run.bombs[i];
    b.elapsed += dt;
    const t = Math.min(1, b.elapsed / b.duration);
    b.x = b.fromX + (b.toX - b.fromX) * t;
    b.z = b.fromZ + (b.toZ - b.fromZ) * t;
    if (t >= 1) {
      run.bombs.splice(i, 1);
      emitEvent(run, 'spezi_boom', b.toX, b.toZ);
      emitVfx(run, { kind: 'ko_explosion', x: b.toX, z: b.toZ });
      run.explosions.push({ x: b.toX, z: b.toZ, radius: b.radius, age: 0, maxAge: 0.38, color: 0xff8c24 });
      for (const enemy of run.enemies) {
        if (enemy.dead) continue;
        if (Math.hypot(enemy.x - b.toX, enemy.z - b.toZ) <= b.radius + enemy.radius) {
          damageEnemy(run, enemy, b.damage, {
            knock: 8.5,
            knockX: enemy.x - b.toX,
            knockZ: enemy.z - b.toZ,
            stun: 0.45,
          });
        }
      }
      for (const crate of run.crates) {
        if (!crate.broken && Math.hypot(crate.x - b.toX, crate.z - b.toZ) <= b.radius) smashCrate(run, crate);
      }
      for (const barrel of run.barrels) {
        if (!barrel.exploded && Math.hypot(barrel.x - b.toX, barrel.z - b.toZ) <= b.radius) detonateBarrel(run, barrel);
      }
    }
  }

  // Ricochet Cans
  for (let i = run.throws.length - 1; i >= 0; i--) {
    const t = run.throws[i];
    t.elapsed += dt;
    if (t.elapsed >= t.duration) {
      run.throws.splice(i, 1);
      continue;
    }
    const nx = t.x + t.vx * dt;
    const nz = t.z + t.vz * dt;
    let bounced = false;
    if (!run.map.walkable(nx, t.z, 0.16)) {
      t.vx = -t.vx;
      bounced = true;
    } else {
      t.x = nx;
    }
    if (!run.map.walkable(t.x, nz, 0.16)) {
      t.vz = -t.vz;
      bounced = true;
    } else {
      t.z = nz;
    }
    if (bounced) {
      t.bounces -= 1;
      emitEvent(run, 'can', t.x, t.z);
      if (t.bounces < 0) {
        run.throws.splice(i, 1);
        continue;
      }
    }
    for (const barrel of run.barrels) {
      if (!barrel.exploded && Math.hypot(barrel.x - t.x, barrel.z - t.z) <= 0.56) {
        detonateBarrel(run, barrel);
      }
    }
    for (const crate of run.crates) {
      if (!crate.broken && Math.hypot(crate.x - t.x, crate.z - t.z) <= 0.56) {
        smashCrate(run, crate);
      }
    }
    for (const enemy of run.enemies) {
      if (enemy.dead) continue;
      const lastHit = t.hitCooldowns.get(enemy.id) ?? -9;
      if (t.elapsed - lastHit < 0.28) continue;
      if (Math.hypot(enemy.x - t.x, enemy.z - t.z) <= enemy.radius + 0.34) {
        t.hitCooldowns.set(enemy.id, t.elapsed);
        damageEnemy(run, enemy, t.damage, { knock: 6.5, knockX: t.vx, knockZ: t.vz, stun: 0.35 });
        t.vx = -t.vx * 0.92 + (run.rng() - 0.5) * 3;
        t.vz = -t.vz * 0.92 + (run.rng() - 0.5) * 3;
        t.bounces -= 1;
        if (t.bounces < 0) {
          run.throws.splice(i, 1);
          break;
        }
      }
    }
  }

  for (let i = run.explosions.length - 1; i >= 0; i--) {
    run.explosions[i].age += dt;
    if (run.explosions[i].age >= run.explosions[i].maxAge) run.explosions.splice(i, 1);
  }
}

function advanceWaveDirector(run, dt) {
  run.waveTimer += dt;
  const mut = run.map.mutator ?? {};
  const bossInterval = mut.bossInterval || 3;

  if (run.waveTimer >= WAVE_DURATION) {
    run.waveTimer -= WAVE_DURATION;
    run.wave += 1;
    emitEvent(run, 'wave', run.player.x, run.player.z);

    const isBossWave = run.wave % bossInterval === 0;
    if (isBossWave) {
      spawnEnemy(run, 'hauke');
      notice(run, `WELLE ${run.wave}: MASSIV-RUND HAUKE ROLLT AN!`, 3.5);
      bark(run, run.player.x, 1.85, run.player.z, `BOSS WELLE ${run.wave}!`, 'vermilion', 1.4);
    } else if (run.wave % 2 === 0 || mut.extraTom) {
      spawnEnemy(run, 'tom');
      notice(run, `WELLE ${run.wave}: Zechpreller Tom & Anton-Schwarm!`, 2.8);
    } else {
      notice(run, `WELLE ${run.wave} — Halte den Imbiss!`, 2.5);
    }
  }

  // Continuous Vampire-Survivors horde stream
  run.spawnTimer -= dt;
  if (run.spawnTimer <= 0) {
    const rate = Math.max(0.42, (1.55 - run.wave * 0.14) / (mut.spawnMult || 1));
    run.spawnTimer = rate;
    const batch = run.wave >= 5 ? 2 : 1;
    for (let i = 0; i < batch; i++) {
      const roll = run.rng();
      if (run.wave >= 2 && roll < (mut.extraTom ? 0.24 : 0.13) && run.enemies.filter((e) => !e.dead && e.type === 'tom').length < 3) {
        spawnEnemy(run, 'tom');
      } else {
        const elite = run.wave >= 2 && run.rng() < Math.min(0.28, 0.08 + run.wave * 0.03);
        spawnEnemy(run, 'anton', null, { elite });
      }
    }
  }

  // Barrel & Crate periodic drops
  run.barrelRespawn -= dt;
  if (run.barrelRespawn <= 0) {
    run.barrelRespawn = mut.barrelExtra ? 6.5 : 10.5;
    if (run.barrels.filter((b) => !b.exploded).length < 7) {
      const rx = 2.5 + run.rng() * (run.map.width - 5);
      const rz = 2.5 + run.rng() * (run.map.depth - 5);
      if (Math.hypot(rx - run.player.x, rz - run.player.z) > 3.5 && run.map.walkable(rx, rz, 0.5)) {
        const slot = run.barrels.find((b) => b.exploded);
        if (slot) {
          slot.x = rx;
          slot.z = rz;
          slot.exploded = false;
          slot.fuse = 0;
        } else if (run.barrels.length < 12) {
          run.barrels.push({ x: rx, z: rz, exploded: false, fuse: 0 });
        }
      }
    }
  }

  run.crateRespawn -= dt;
  if (run.crateRespawn <= 0) {
    run.crateRespawn = 13;
    if (run.crates.filter((c) => !c.broken).length < 6) {
      const rx = 2.5 + run.rng() * (run.map.width - 5);
      const rz = 2.5 + run.rng() * (run.map.depth - 5);
      if (Math.hypot(rx - run.player.x, rz - run.player.z) > 3.5 && run.map.walkable(rx, rz, 0.5)) {
        const slot = run.crates.find((c) => c.broken);
        if (slot) {
          slot.x = rx;
          slot.z = rz;
          slot.broken = false;
          slot.gold = run.rng() < 0.14;
        } else if (run.crates.length < 10) {
          run.crates.push({ x: rx, z: rz, broken: false, gold: run.rng() < 0.14 });
        }
      }
    }
  }
  // Mega-Quietscheente Chaos-Drop
  run.duckSpawnTimer -= dt;
  if (run.duckSpawnTimer <= 0) {
    run.duckSpawnTimer = 22;
    const duckCount = run.pickups.filter((pk) => !pk.collected && pk.kind === 'duck').length;
    if (duckCount < 2) {
      const rx = 3 + run.rng() * (run.map.width - 6);
      const rz = 3 + run.rng() * (run.map.depth - 6);
      if (run.map.walkable(rx, rz, 0.5)) {
        spawnPickup(run, 'duck', rx, rz, 1, 'gold');
        notice(run, 'MEGA-QUIETSCHEENTE gelandet! Aufheben für QUAAAK-Bombe!', 2.8);
      }
    }
  }

  // Imbiss-Chaos-Durchsagen (alle ~38s ein 12s-Event!)
  if (run.chaosEvent) {
    run.chaosEvent.timer -= dt;
    if (run.chaosEvent.timer <= 0) run.chaosEvent = null;
  } else {
    run.chaosTimer -= dt;
    if (run.chaosTimer <= 0) {
      run.chaosTimer = 36 + run.rng() * 10;
      const pick = CHAOS_EVENTS[Math.floor(run.rng() * CHAOS_EVENTS.length)];
      run.chaosEvent = { ...pick, timer: 12 };
      emitEvent(run, 'chaos_event', run.player.x, run.player.z);
      notice(run, `${pick.title} ${pick.sub}`, 3.4);
      bark(run, run.player.x, 1.95, run.player.z, pick.title, 'cyan', 1.35);

      if (pick.id === 'ordnungsamt') {
        for (const e of run.enemies) {
          if (!e.dead && e.type === 'anton') e.panicked = Math.max(e.panicked, 5.5);
        }
        const sample = run.enemies.find((e) => !e.dead && e.type === 'anton');
        if (sample) bark(run, sample.x, 1.5, sample.z, 'HAB KEIN GEWERBE!!', 'vermilion', 1.2);
      } else if (pick.id === 'happy_hour') {
        run.player.clappers = Math.min(12, run.player.clappers + 3);
        for (let i = 0; i < 2; i++) {
          const bx = 3 + run.rng() * (run.map.width - 6);
          const bz = 3 + run.rng() * (run.map.depth - 6);
          if (run.map.walkable(bx, bz, 0.5) && run.barrels.length < 14) {
            run.barrels.push({ x: bx, z: bz, exploded: false, fuse: 0 });
          }
        }
      }
    }
  }
}

function advanceEnemies(run, dt) {
  const { player } = run;
  const stats = getStats(run);
  const alive = run.enemies.filter((e) => !e.dead);
  const slipperyFloor = run.chaosEvent?.id === 'fettbahn';

  for (const enemy of alive) {
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.donerCd = Math.max(0, enemy.donerCd - dt);
    enemy.exposed = Math.max(0, enemy.exposed - dt);
    enemy.slowed = Math.max(0, enemy.slowed - dt);
    enemy.panicked = Math.max(0, (enemy.panicked || 0) - dt);

    if (enemy.coma > 0) {
      enemy.coma = Math.max(0, enemy.coma - dt);
      enemy.moving = false;
      continue;
    }

    if (enemy.burning > 0) {
      enemy.burning = Math.max(0, enemy.burning - dt);
      enemy.hp -= 5.5 * stats.dmgMult * dt;
      if (enemy.hp <= 0) {
        registerKill(run, enemy);
        continue;
      }
    }

    if (enemy.knockTime > 0) {
      enemy.knockTime = Math.max(0, enemy.knockTime - dt);
      const wallHit = shiftBodyWithSlam(run, enemy, enemy.knockX * dt, enemy.knockZ * dt, enemy.radius * 0.8);
      if (wallHit) {
        run.stats.wallSlams += 1;
        emitVfx(run, { kind: 'wall_slam', x: enemy.x, z: enemy.z });
        damageEnemy(run, enemy, 8 + run.wave * 2, { stun: 0.45, label: 'WAND-KLATSCHER!', tone: 'vermilion' });
        enemy.knockTime = 0;
        if (enemy.dead) continue;
      }
    }

    if (enemy.stunned > 0) {
      enemy.stunned = Math.max(0, enemy.stunned - dt);
      enemy.moving = false;
      continue;
    }

    // Target calculation
    let targetX = player.x;
    let targetZ = player.z;
    if (enemy.type === 'tom') {
      if (enemy.hasCrown) {
        // Kronen-Dieb flieht kichernd im Zickzack weg von Chef Torge!
        const awayX = enemy.x - player.x;
        const awayZ = enemy.z - player.z;
        const ad = Math.hypot(awayX, awayZ) || 1;
        const zig = Math.sin(run.time * 5.2 + enemy.id) * 0.65;
        targetX = clamp(enemy.x + (awayX / ad) * 4 - (awayZ / ad) * zig * 2.5, 2, run.map.width - 2);
        targetZ = clamp(enemy.z + (awayZ / ad) * 4 + (awayX / ad) * zig * 2.5, 2, run.map.depth - 2);
      } else if (run.droppedHelmet && Math.hypot(run.droppedHelmet.x - enemy.x, run.droppedHelmet.z - enemy.z) < 7.5) {
        targetX = run.droppedHelmet.x;
        targetZ = run.droppedHelmet.z;
        if (Math.hypot(run.droppedHelmet.x - enemy.x, run.droppedHelmet.z - enemy.z) < 1.05) {
          run.droppedHelmet = null;
          enemy.hasCrown = true;
          emitEvent(run, 'steal', enemy.x, enemy.z);
          bark(run, enemy.x, 1.75, enemy.z, 'ICH BIN JETZT CHEF!!', 'gold', 1.4);
          notice(run, 'SCHNORRER TOM HAT DEINE KRONE GEKLAUT! Klatsch ihn ab!', 3.0);
        }
      } else {
        const gem = run.pickups.find((pk) => !pk.collected && pk.kind === 'xp' && Math.hypot(pk.x - enemy.x, pk.z - enemy.z) < 5.2);
        if (gem) {
          targetX = gem.x;
          targetZ = gem.z;
          if (Math.hypot(gem.x - enemy.x, gem.z - enemy.z) < 0.65) {
            gem.collected = true;
            enemy.lootBank += gem.value;
            emitEvent(run, 'steal', enemy.x, enemy.z);
            if (run.rng() < 0.35) quip(run, enemy.x, 1.45, enemy.z, TOM_QUIPS, 'jade', 0.9, 2.5);
          }
        }
      }
    } else if (enemy.panicked > 0) {
      const awayX = enemy.x - player.x;
      const awayZ = enemy.z - player.z;
      const ad = Math.hypot(awayX, awayZ) || 1;
      targetX = clamp(enemy.x + (awayX / ad) * 4.5, 2, run.map.width - 2);
      targetZ = clamp(enemy.z + (awayZ / ad) * 4.5, 2, run.map.depth - 2);
    }

    // Hauke Boss Charge, Snacks & Mega-Rülps / Fresskoma!
    if (enemy.type === 'hauke') {
      // Hauke mampft vorbeifliegende Spezi-Bomben!
      if (enemy.chargeState === 'none') {
        for (let bi = run.bombs.length - 1; bi >= 0; bi--) {
          const b = run.bombs[bi];
          if (Math.hypot(b.x - enemy.x, b.z - enemy.z) <= enemy.radius + 0.75) {
            run.bombs.splice(bi, 1);
            enemy.stuffed = (enemy.stuffed || 0) + 1;
            enemy.hp = Math.min(enemy.maxHp, enemy.hp + 12);
            emitEvent(run, 'steal', enemy.x, enemy.z);
            bark(run, enemy.x, 1.95, enemy.z, 'HAPS! LECKER SPEZI!', 'gold', 1.15);
            if (enemy.stuffed >= 3) {
              enemy.stuffed = 0;
              enemy.coma = 2.6;
              enemy.exposed = 2.6;
              emitEvent(run, 'ko', enemy.x, enemy.z);
              bark(run, enemy.x, 2.05, enemy.z, 'Zzz... FRESSKOMA!!', 'jade', 1.5);
              for (let k = 0; k < 3; k++) {
                const a = (k / 3) * Math.PI * 2;
                spawnPickup(run, 'xp', enemy.x + Math.cos(a) * 1.1, enemy.z + Math.sin(a) * 1.1, 4, 'gold');
              }
              spawnPickup(run, 'heal', enemy.x, enemy.z + 1.0, 25, 'vermilion');
              break;
            }
          }
        }
        if (enemy.coma > 0) continue;

        // Kohlensäure-Mega-Rülps kegelt eigene Antons um!
        enemy.burpCd -= dt;
        if (enemy.burpCd <= 0) {
          enemy.burpCd = enemy.enraged ? 5.0 : 7.0;
          const burpR = 4.6;
          emitEvent(run, 'hauke_burp', enemy.x, enemy.z);
          run.explosions.push({ x: enemy.x, z: enemy.z, radius: burpR, age: 0, maxAge: 0.45, color: 0x38f2af });
          run.cameraShake = Math.max(run.cameraShake, 0.34);
          bark(run, enemy.x, 2.0, enemy.z, 'BÖÖÖRPS!!', 'jade', 1.2);
          for (const ally of alive) {
            if (ally === enemy || ally.dead) continue;
            if (Math.hypot(ally.x - enemy.x, ally.z - enemy.z) <= burpR) {
              damageEnemy(run, ally, 18 + run.wave * 3, {
                knock: 14.5,
                knockX: ally.x - enemy.x,
                knockZ: ally.z - enemy.z,
                stun: 0.85,
                label: 'EIGEN-RÜLPS!',
                tone: 'jade',
              });
            }
          }
        }
      }

      if (enemy.chargeState === 'none') {
        enemy.chargeTimer -= dt;
        const distP = Math.hypot(player.x - enemy.x, player.z - enemy.z);
        if (enemy.chargeTimer <= 0 && distP < 11) {
          enemy.chargeState = 'windup';
          enemy.chargeTimer = enemy.enraged ? 0.62 : 0.82;
          const a = Math.atan2(player.z - enemy.z, player.x - enemy.x);
          enemy.chargeDir = { x: Math.cos(a), z: Math.sin(a) };
          enemy.angle = a;
          emitEvent(run, 'charge_windup', enemy.x, enemy.z);
        }
      } else if (enemy.chargeState === 'windup') {
        enemy.chargeTimer -= dt;
        enemy.moving = false;
        if (enemy.chargeTimer <= 0) {
          enemy.chargeState = 'rush';
          enemy.chargeTimer = 0.72;
          emitEvent(run, 'stomp', enemy.x, enemy.z);
        }
        continue;
      } else if (enemy.chargeState === 'rush') {
        enemy.chargeTimer -= dt;
        enemy.moving = true;
        const rushSpd = enemy.enraged ? 10.5 : 8.6;
        const res = moveBody(run, enemy, enemy.chargeDir.x * rushSpd * dt, enemy.chargeDir.z * rushSpd * dt, enemy.radius * 0.85, false);
        if (res.slammed || enemy.chargeTimer <= 0) {
          enemy.chargeState = 'none';
          enemy.chargeTimer = enemy.enraged ? 3.2 : 4.5;
          if (res.slammed) {
            enemy.stunned = 0.7;
            run.cameraShake = Math.max(run.cameraShake, 0.35);
            emitEvent(run, 'wall_slam', enemy.x, enemy.z);
          }
        }
        if (Math.hypot(enemy.x - player.x, enemy.z - player.z) <= enemy.radius + 0.38) {
          hurtPlayer(run, enemy.damage * 1.25, enemy);
        }
        continue;
      }
    }

    const dx = targetX - enemy.x;
    const dz = targetZ - enemy.z;
    const dist = Math.hypot(dx, dz) || 1;
    let vx = dx / dist;
    let vz = dz / dist;

    // Swarm separation
    for (const other of alive) {
      if (other === enemy || other.dead) continue;
      const sx = enemy.x - other.x;
      const sz = enemy.z - other.z;
      const sd = Math.hypot(sx, sz);
      const minGap = enemy.radius + other.radius + 0.14;
      if (sd > 0.001 && sd < minGap) {
        const push = (minGap - sd) * 2.6;
        vx += (sx / sd) * push;
        vz += (sz / sd) * push;
      }
    }

    const vLen = Math.hypot(vx, vz) || 1;
    const coneSlow = player.lamp && isEnemyInPlayerCone(player, enemy) ? 0.76 : 1.0;
    const slowMult = enemy.slowed > 0 ? 0.55 : coneSlow;
    const crownBoost = enemy.hasCrown ? 1.32 : 1.0;
    const spd = enemy.speed * slowMult * crownBoost * (enemy.enraged ? 1.18 : 1.0);
    const goalVx = (vx / vLen) * spd;
    const goalVz = (vz / vLen) * spd;

    if (slipperyFloor && enemy.type !== 'hauke') {
      const blend = 1 - Math.exp(-1.9 * dt);
      enemy.slideVx = (enemy.slideVx || goalVx) + (goalVx * 1.38 - (enemy.slideVx || goalVx)) * blend;
      enemy.slideVz = (enemy.slideVz || goalVz) + (goalVz * 1.38 - (enemy.slideVz || goalVz)) * blend;
      enemy.angle = Math.atan2(enemy.slideVz, enemy.slideVx);
      enemy.moving = true;
      const slideRes = moveBody(run, enemy, enemy.slideVx * dt, enemy.slideVz * dt, enemy.radius * 0.75, false);
      if (slideRes.slammed) {
        enemy.slideVx *= -0.75;
        enemy.slideVz *= -0.75;
      }
      for (const barrel of run.barrels) {
        if (!barrel.exploded && Math.hypot(enemy.x - barrel.x, enemy.z - barrel.z) < 0.78) {
          detonateBarrel(run, barrel);
        }
      }
    } else {
      enemy.slideVx = goalVx;
      enemy.slideVz = goalVz;
      enemy.angle = Math.atan2(goalVz, goalVx);
      enemy.moving = true;
      moveBody(run, enemy, goalVx * dt, goalVz * dt, enemy.radius * 0.75, false);
    }

    if (!enemy.hasCrown && enemy.panicked <= 0 && Math.hypot(enemy.x - player.x, enemy.z - player.z) <= enemy.radius + 0.34) {
      hurtPlayer(run, enemy.damage, enemy);
    }
  }

  // Cleanup dead enemies cleanly so arrays stay bounded
  if (run.enemies.length > 48) {
    run.enemies = run.enemies.filter((e) => !e.dead);
  }
  syncCompatRefs(run);
}

function advancePickups(run, dt) {
  const { player } = run;
  const magnetR = getStats(run).magnetRadius;

  for (const pk of run.pickups) {
    if (pk.collected) continue;
    pk.age += dt;
    const dx = player.x - pk.x;
    const dz = player.z - pk.z;
    const dist = Math.hypot(dx, dz);
    if (pk.kind !== 'chest' && pk.kind !== 'duck' && dist <= magnetR) pk.magnetized = true;

    if (pk.magnetized && dist > 0.01) {
      const pullSpd = 10.5 + Math.min(8, pk.age * 2);
      pk.x += (dx / dist) * pullSpd * dt;
      pk.z += (dz / dist) * pullSpd * dt;
    }

    if (Math.hypot(player.x - pk.x, player.z - pk.z) <= (pk.kind === 'chest' || pk.kind === 'duck' ? 1.05 : 0.72)) {
      pk.collected = true;
      if (pk.kind === 'xp') {
        addXp(run, pk.value);
        emitEvent(run, 'gem', player.x, player.z);
      } else if (pk.kind === 'heal') {
        player.hp = Math.min(player.maxHp, player.hp + pk.value);
        player.beanBoost = Math.max(player.beanBoost, 4.0);
        emitEvent(run, 'heal', player.x, player.z);
        bark(run, player.x, 1.55, player.z, `+${pk.value} HP DÖNER!`, 'jade', 1.0);
      } else if (pk.kind === 'dose') {
        player.clappers = Math.min(12, player.clappers + pk.value);
        emitEvent(run, 'can', player.x, player.z);
        bark(run, player.x, 1.5, player.z, `+${pk.value} DOSEN`, 'gold', 0.9);
      } else if (pk.kind === 'duck') {
        triggerDuckQuack(run, pk.x, pk.z);
      } else if (pk.kind === 'magnet_can') {
        for (const gem of run.pickups) {
          if (!gem.collected && gem.kind === 'xp') gem.magnetized = true;
        }
        emitEvent(run, 'can', player.x, player.z);
        bark(run, player.x, 1.65, player.z, 'PFAND-MAGNET!!', 'cyan', 1.2);
      } else if (pk.kind === 'chest') {
        run.stats.chests += 1;
        player.pfand += 500;
        player.hp = Math.min(player.maxHp, player.hp + 25);
        player.helmet = true;
        run.droppedHelmet = null;
        run.pendingLevelUps += 1;
        emitEvent(run, 'chest_gold', player.x, player.z);
        bark(run, player.x, 1.85, player.z, 'CHEF-TRUHE!!', 'gold', 1.3);
      }
    }
  }
  if (run.pickups.length > 90) {
    run.pickups = run.pickups.filter((pk) => !pk.collected);
  }
}

export function interaction(run) {
  if (!run || run.state !== 'playing') return null;
  const { player, map, droppedHelmet } = run;
  if (droppedHelmet && Math.hypot(player.x - droppedHelmet.x, player.z - droppedHelmet.z) < 1.35) {
    return { kind: 'helmet', helmet: true, enabled: true, text: 'Chef-Krone aufheben' };
  }
  const vend = map.vending;
  if (vend && Math.hypot(player.x - vend.x, player.z - vend.z) < 1.65) {
    if (vend.cooldown <= 0) {
      return { kind: 'vending', vending: true, enabled: true, text: 'Späti-Automat: Spezi & Heal' };
    }
    return { kind: 'vending', vending: true, enabled: false, text: `Automat (${Math.ceil(vend.cooldown)}s)` };
  }
  return null;
}

export function advance(run, input = {}, dt = STEP) {
  if (!run || run.state !== 'playing') return run;
  run.events = [];
  run.time += dt;
  run.hitFlash = Math.max(0, run.hitFlash - dt);
  run.cameraShake = Math.max(0, run.cameraShake - dt * 1.45);
  run.notices = run.notices.filter((n) => n.until > run.time);
  run.barks = run.barks.filter((b) => b.until > run.time);
  run.pulses = run.pulses.filter((p) => {
    p.age += dt;
    return p.age < 0.7;
  });

  const { player, map } = run;
  const stats = getStats(run);

  if (map.vending) map.vending.cooldown = Math.max(0, map.vending.cooldown - dt);
  player.invuln = Math.max(0, player.invuln - dt);
  player.swing = Math.max(0, player.swing - dt);
  player.finisherSwing = Math.max(0, player.finisherSwing - dt);
  player.knobiPulse = Math.max(0, (player.knobiPulse || 0) - dt);
  player.sliding = Math.max(0, player.sliding - dt);
  player.beanBoost = Math.max(0, player.beanBoost - dt);
  player.bonkCooldown = Math.max(0, player.bonkCooldown - dt);
  player.cooldown = Math.max(0, player.cooldown - dt);

  if (player.comboReset > 0) {
    player.comboReset = Math.max(0, player.comboReset - dt);
    if (player.comboReset === 0) player.comboStep = 0;
  }
  if (player.comboTimer > 0) {
    player.comboTimer = Math.max(0, player.comboTimer - dt);
    if (player.comboTimer === 0) player.combo = 1;
  }
  if (!player.helmet && player.crownRegen > 0) {
    player.crownRegen = Math.max(0, player.crownRegen - dt);
    if (player.crownRegen === 0 && !run.droppedHelmet) {
      player.helmet = true;
      emitEvent(run, 'crown_pickup', player.x, player.z);
      bark(run, player.x, 1.65, player.z, 'KRONE BEREIT!', 'gold', 0.9);
    }
  }
  if (run.droppedHelmet && Math.hypot(player.x - run.droppedHelmet.x, player.z - run.droppedHelmet.z) < 1.15) {
    run.droppedHelmet = null;
    player.helmet = true;
    player.crownRegen = 0;
    emitEvent(run, 'crown_pickup', player.x, player.z);
    bark(run, player.x, 1.65, player.z, 'KRONE ZURÜCK!', 'gold', 0.9);
  }

  // Input buffering for crispy combat feel
  player.inputBuffer.bonk = input.bonk ? 0.16 : Math.max(0, player.inputBuffer.bonk - dt);
  player.inputBuffer.dash = input.dash ? 0.16 : Math.max(0, player.inputBuffer.dash - dt);
  player.inputBuffer.lure = input.lure ? 0.16 : Math.max(0, player.inputBuffer.lure - dt);

  if (input.lamp) {
    player.lamp = !player.lamp;
    emitEvent(run, 'shutter', player.x, player.z);
    bark(run, player.x, 1.65, player.z, player.lamp ? 'BLEND-LICHT AN!' : 'SCHATTEN-TEMPO!', player.lamp ? 'gold' : 'cyan', 0.85);
  }

  if (input.use) {
    const act = interaction(run);
    if (act?.enabled && act.vending) {
      map.vending.cooldown = 24;
      player.hp = Math.min(player.maxHp, player.hp + 30);
      player.clappers = Math.min(12, player.clappers + 2);
      player.beanBoost = Math.max(player.beanBoost, 5.0);
      emitEvent(run, 'chest_gold', player.x, player.z);
      bark(run, player.x, 1.75, player.z, 'SPÄTI-REFILL! +30 HP', 'jade', 1.1);
    }
  }

  // Movement & aiming
  let mx = input.x || 0;
  let mz = input.z || 0;
  const mLen = Math.hypot(mx, mz);
  if (mLen > 1) {
    mx /= mLen;
    mz /= mLen;
  }

  if (Number.isFinite(input.angle)) {
    player.angle = input.angle;
  } else if (mLen > 0.12) {
    player.angle = Math.atan2(mz, mx);
  }

  // Dash trigger
  if (player.inputBuffer.dash > 0 && player.cooldown <= 0) {
    player.inputBuffer.dash = 0;
    player.cooldown = DASH_COOLDOWN * stats.dashCdMult;
    player.dash = 0.16;
    const dx = mLen > 0.12 ? mx / (mLen || 1) : Math.cos(player.angle);
    const dz = mLen > 0.12 ? mz / (mLen || 1) : Math.sin(player.angle);
    const dl = Math.hypot(dx, dz) || 1;
    player.dashDir = { x: dx / dl, z: dz / dl };
    emitEvent(run, 'dash', player.x, player.z);
    emitVfx(run, { kind: 'dash', x: player.x, z: player.z });

    // Perfect Dodge if near active enemy
    const nearThreat = run.enemies.some((e) => !e.dead && Math.hypot(e.x - player.x, e.z - player.z) < 2.35);
    if (nearThreat) {
      run.stats.dodges += 1;
      player.bonkCooldown = 0;
      emitEvent(run, 'dodge', player.x, player.z);
      bark(run, player.x, 1.6, player.z, 'PERFECT DODGE!', 'cyan', 0.9);
    }
  }

  if (player.dash > 0) {
    player.dash = Math.max(0, player.dash - dt);
    const dashSpd = 12.2;
    moveBody(run, player, player.dashDir.x * dashSpd * dt, player.dashDir.z * dashSpd * dt, 0.28, false);
    if ((player.passives.dash_mod || 0) > 0 && player.dash === 0) {
      // Shockwave at end of Turbo-Dash
      for (const e of run.enemies) {
        if (!e.dead && Math.hypot(e.x - player.x, e.z - player.z) <= 2.3) {
          damageEnemy(run, e, 10 + player.passives.dash_mod * 4, { knock: 7, stun: 0.4 });
        }
      }
      run.pulses.push({ x: player.x, z: player.z, age: 0, kind: 'splash' });
    }
    player.moving = true;
    player.stride += dt * 2;
  } else if (mLen > 0.04) {
    if (isInPool(map, player.x, player.z) && player.sliding <= 0) {
      player.sliding = 0.6;
      emitVfx(run, { kind: 'water_slip', x: player.x, z: player.z });
      run.pulses.push({ x: player.x, z: player.z, age: 0, kind: 'splash' });
      quip(run, player.x, 1.5, player.z, ['NASSER SOCKE!!', 'RUTSCH-TURBO!', 'FETT-GLITZE!'], 'cyan', 0.9, 4.0);
    }
    const moveSpd = stats.speed;
    moveBody(run, player, mx * moveSpd * dt, mz * moveSpd * dt, 0.28, true);
    player.moving = true;
    player.stride += dt * (moveSpd / 4.2);
    player.stepMark += dt;
    if (player.stepMark > 0.24) {
      player.stepMark = 0;
      emitEvent(run, 'step', player.x, player.z);
    }
  } else {
    player.moving = false;
  }

  // Manual Power-Schelle
  if (player.inputBuffer.bonk > 0 && player.bonkCooldown <= 0) {
    player.inputBuffer.bonk = 0;
    player.bonkCooldown = BONK_COOLDOWN * stats.bonkCdMult;
    firePanSwing(run, true);
  }

  // Manual Spezi/Billard Dose
  if (player.inputBuffer.lure > 0 && player.clappers > 0) {
    player.inputBuffer.lure = 0;
    player.clappers -= 1;
    const nearest = run.enemies
      .filter((e) => !e.dead)
      .sort((a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z))[0];
    const tx = input.isTouch && nearest
      ? nearest.x
      : player.x + Math.cos(player.angle) * 5.2;
    const tz = input.isTouch && nearest
      ? nearest.z
      : player.z + Math.sin(player.angle) * 5.2;
    launchSpeziBomb(run, tx, tz, 1.18, 1.35);
    bark(run, player.x, 1.5, player.z, 'SPEZI-GRANATE!', 'gold', 0.8);
  }

  updateAutoWeapons(run, dt);
  advanceProjectilesAndBombs(run, dt);
  advanceWaveDirector(run, dt);
  advanceEnemies(run, dt);
  advancePickups(run, dt);
  triggerPendingLevelUp(run);

  return run;
}
