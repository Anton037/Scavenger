import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advance,
  applyUpgrade,
  CHAOS_EVENTS,
  DEATH_ROASTS,
  finishRunCashOut,
  getStats,
  interaction,
  newRun,
  rerollUpgrades,
  STEP,
  triggerChaosEvent,
  WAVE_DURATION,
} from '../src/game.js';
import { computeBadges, formatShareReceipt } from '../src/hud.js';
import { BIOMES, buildArena, EVOLUTIONS, getDailySeed, LOADOUTS, UPGRADE_POOL } from '../src/level.js';

function simulate(run, seconds, inputFn = () => ({})) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) {
    if (run.state === 'levelup') {
      const offer = run.upgradeOffers[0];
      if (offer) applyUpgrade(run, offer.id);
    }
    if (run.state !== 'playing') break;
    advance(run, inputFn(run, i));
  }
  return run;
}

test('open survival arena generates spacious walkable courtyard and rotates biomes across seeds', () => {
  const seenBiomes = new Set();
  for (let i = 0; i < 8; i++) {
    const map = buildArena(2026 + i, 1);
    seenBiomes.add(map.biome.name);
    assert.equal(map.width, 28);
    assert.equal(map.depth, 28);
    assert.equal(map.walkable(map.start.x, map.start.z, 0.3), true);
    assert.equal(map.blocks.length, 4);
    assert.ok(map.barrels.length >= 5);
    assert.ok(map.crates.length >= 5);
  }
  assert.equal(buildArena(2026, 1).biome.name, 'Mitternachts-Imbiss');
  assert.equal(seenBiomes.size, 3);
  assert.equal(getDailySeed(new Date('2026-05-19T12:00:00Z')), 260519);
});

test('loadouts initialize unique starter weapons, HP, and speed profiles (including Knobi-Priester)', () => {
  const classic = newRun({ seed: 100, loadout: 'classic' });
  const runner = newRun({ seed: 100, loadout: 'runner' });
  const brawler = newRun({ seed: 100, loadout: 'brawler' });
  const knobi = newRun({ seed: 100, loadout: 'knobi_chef' });

  assert.equal(classic.player.weapons.pan, 1);
  assert.equal(runner.player.weapons.skewer, 1);
  assert.equal(brawler.player.weapons.doner, 1);
  assert.equal(knobi.player.weapons.knobi, 1);
  assert.equal(brawler.player.maxHp, LOADOUTS.brawler.maxHp);
  assert.equal(knobi.player.maxHp, LOADOUTS.knobi_chef.maxHp);
  assert.equal(knobi.player.clappers, LOADOUTS.knobi_chef.clappers);
  assert.ok(runner.player.clappers > classic.player.clappers);
});

test('XP pickup magnetism fills level bar and triggers 3-card level-up selection', () => {
  const run = newRun({ seed: 2026 });
  run.enemies.forEach((e) => { e.dead = true; });
  run.pickups.push({
    id: 9001,
    kind: 'xp',
    x: run.player.x + 1.5,
    z: run.player.z,
    value: run.player.xpNext + 2,
    tone: 'gold',
    magnetized: false,
    collected: false,
    age: 0,
  });

  for (let i = 0; i < 60 && run.state === 'playing'; i++) {
    advance(run, {});
  }
  assert.equal(run.state, 'levelup');
  assert.equal(run.upgradeOffers.length, 3);
  assert.ok(run.player.level >= 2);

  const chosen = run.upgradeOffers[0].id;
  applyUpgrade(run, chosen);
  assert.equal(run.state, 'playing');
  assert.ok((run.player.weapons[chosen] || run.player.passives[chosen]) >= 1);
});

test('auto-weapons (skewer, doner, spezi, beam, can) damage and defeat enemies', () => {
  const run = newRun({ seed: 555 });
  run.player.weapons = { pan: 2, skewer: 2, doner: 2, spezi: 2, beam: 2, can: 2 };
  run.player.timers = { pan: 0.05, skewer: 0.05, spezi: 0.05, beam: 0.05, can: 0.05 };
  // Place Anton right in front of Torge inside light cone & doner orbit
  run.enemies = [{
    id: 500, type: 'anton', elite: false, x: run.player.x + 1.6, z: run.player.z,
    angle: Math.PI, hp: 32, maxHp: 32, speed: 0, radius: 0.32, damage: 5,
    dead: false, moving: false, stunned: 0, slowed: 0, exposed: 0, hitFlash: 0,
    burning: 0, donerCd: 0, knockX: 0, knockZ: 0, knockTime: 0, lootBank: 0,
    chargeState: 'none', chargeTimer: 0, chargeDir: { x: 0, z: 0 }, enraged: false, koTimer: 0,
  }];
  run.player.angle = 0;

  simulate(run, 1.8, () => ({}));
  assert.ok(run.player.kills >= 1);
  assert.ok(run.pickups.some((pk) => pk.kind === 'xp'));
});

test('manual Power-Schelle, Spezi-Granate, and Explosive Barrels chain-detonate', () => {
  const run = newRun({ seed: 777 });
  const barrel = run.barrels[0];
  barrel.x = run.player.x + 1.8;
  barrel.z = run.player.z;
  barrel.exploded = false;
  run.enemies[0].x = barrel.x + 1.0;
  run.enemies[0].z = barrel.z;
  run.enemies[0].hp = 18;
  run.player.angle = 0;

  advance(run, { bonk: true });
  assert.equal(barrel.exploded, true);
  assert.equal(run.enemies[0].dead, true);
  assert.ok(run.stats.barrels >= 1);
});

test('Crown Shield absorbs first hit and drops crown before HP loss occurs', () => {
  const run = newRun({ seed: 888 });
  run.player.invuln = 0;
  run.player.helmet = true;
  const startHp = run.player.hp;
  run.enemies[0].x = run.player.x + 0.2;
  run.enemies[0].z = run.player.z;

  advance(run, {});
  assert.equal(run.player.helmet, false);
  assert.ok(run.droppedHelmet !== null);
  assert.equal(run.player.hp, startHp);

  // Second hit after invuln expires reduces HP
  run.player.invuln = 0;
  run.enemies[0].x = run.player.x + 0.2;
  run.enemies[0].z = run.player.z;
  run.enemies[0].stunned = 0;
  run.enemies[0].knockTime = 0;
  advance(run, {});
  assert.ok(run.player.hp < startHp);
});

test('Dash provides invulnerability frames and Perfect Dodge resets manual Schelle cooldown', () => {
  const run = newRun({ seed: 999 });
  run.player.invuln = 0;
  run.player.bonkCooldown = 0.6;
  run.enemies[0].x = run.player.x + 1.1;
  run.enemies[0].z = run.player.z;

  advance(run, { x: 1, z: 0, dash: true });
  assert.ok(run.player.dash > 0);
  assert.equal(run.player.bonkCooldown, 0);
  assert.ok(run.stats.dodges >= 1);
});

test('Wave Director advances waves and spawns Boss Hauke on Wave 3', () => {
  const run = newRun({ seed: 303 });
  run.waveTimer = WAVE_DURATION - 0.1;
  run.wave = 2;

  simulate(run, 0.3, () => ({}));
  assert.equal(run.wave, 3);
  assert.ok(run.enemies.some((e) => !e.dead && e.type === 'hauke'));
});

test('Cashout cleanly ends the survival shift with stats intact', () => {
  const run = newRun({ seed: 404 });
  simulate(run, 15, (r, i) => ({ x: Math.cos(i * 0.04), z: Math.sin(i * 0.04) }));
  finishRunCashOut(run);
  assert.equal(run.state, 'escaped');
  assert.ok(run.time >= 14.9);
  assert.ok(interaction(run) === null);
});

test('60-second automated survival bot kites arena, levels up, and remains error-free', () => {
  const run = newRun({ seed: 2026, loadout: 'runner' });
  simulate(run, 60, (r, i) => {
    const a = i * 0.035;
    return {
      x: Math.cos(a),
      z: Math.sin(a),
      bonk: i % 50 === 0,
      dash: i % 95 === 0,
      lure: i % 160 === 0,
      lamp: i % 300 === 0,
    };
  });
  assert.ok(run.player.level >= 2 || run.player.kills >= 3);
  assert.ok(run.wave >= 2 || run.state === 'caught');
});

test('Knobi-Knaller aura pushes and damages nearby Antons with funny pulse', () => {
  const run = newRun({ seed: 111 });
  run.player.weapons.knobi = 2;
  run.player.timers.knobi = 0.02;
  run.enemies[0].x = run.player.x + 1.4;
  run.enemies[0].z = run.player.z;
  const startHp = run.enemies[0].hp;

  simulate(run, 0.12, () => ({}));
  assert.ok(run.player.knobiPulse > 0);
  assert.ok(run.enemies[0].hp < startHp || run.enemies[0].dead);
});

test('Mega-Quietscheente pickup triggers QUAAAK shockwave that stuns and panics enemies', () => {
  const run = newRun({ seed: 222 });
  run.enemies[0].x = run.player.x + 3.0;
  run.enemies[0].z = run.player.z;
  run.enemies[0].hp = 999;
  run.pickups.push({
    id: 777, kind: 'duck', x: run.player.x + 0.4, z: run.player.z,
    value: 1, tone: 'gold', magnetized: false, collected: false, age: 0,
  });

  advance(run, {});
  assert.ok(run.enemies[0].stunned > 0);
  assert.ok(run.enemies[0].panicked > 0);
  assert.ok(run.barks.some((b) => b.text === 'QUAAAK!!'));
});

test('Schnorrer Tom steals dropped crown, flees wearing it, and drops it on hit', () => {
  const run = newRun({ seed: 333 });
  run.player.helmet = false;
  run.droppedHelmet = { x: run.player.x + 6.0, z: run.player.z };
  run.enemies = [{
    id: 601, type: 'tom', elite: false, x: run.player.x + 6.5, z: run.player.z,
    angle: Math.PI, hp: 60, maxHp: 60, speed: 3.5, radius: 0.3, damage: 5,
    dead: false, moving: true, stunned: 0, slowed: 0, exposed: 0, hitFlash: 0,
    burning: 0, donerCd: 0, knockX: 0, knockZ: 0, knockTime: 0, lootBank: 6,
    hasCrown: false, panicked: 0, stuffed: 0, coma: 0, burpCd: 0,
    slideVx: 0, slideVz: 0, chargeState: 'none', chargeTimer: 0, chargeDir: { x: 0, z: 0 }, enraged: false, koTimer: 0,
  }];

  simulate(run, 0.35, () => ({}));
  assert.equal(run.enemies[0].hasCrown, true);
  assert.equal(run.droppedHelmet, null);

  // Move Torge next to crown-thief Tom and land a Schelle
  run.player.x = run.enemies[0].x - 1.0;
  run.player.z = run.enemies[0].z;
  run.player.angle = 0;
  advance(run, { bonk: true });
  assert.equal(run.enemies[0].hasCrown, false);
  assert.ok(run.droppedHelmet !== null);
});

test('Hauke triggers Mega-Rülps on allies, eats 3 Spezi bombs, and enters Fresskoma', () => {
  const run = newRun({ seed: 444 });
  run.waveTimer = WAVE_DURATION - 0.05;
  run.wave = 2;
  simulate(run, 0.1, () => ({}));

  const hauke = run.enemies.find((e) => e.type === 'hauke');
  assert.ok(hauke);
  const anton = run.enemies.find((e) => e.type === 'anton');
  if (anton) {
    anton.x = hauke.x + 1.8;
    anton.z = hauke.z;
    anton.hp = 999;
  }
  hauke.burpCd = 0.01;
  advance(run, {});
  assert.ok(run.stats.burps >= 1);
  assert.ok(run.barks.some((b) => /BÖÖÖRPS|KOHLENSÄURE/i.test(b.text)));
  if (anton) assert.ok(anton.hp < 999);

  // Feed 3 Spezi bombs to Hauke -> Fresskoma!
  for (let i = 0; i < 3; i++) {
    run.bombs.push({
      fromX: hauke.x, fromZ: hauke.z, toX: hauke.x, toZ: hauke.z,
      x: hauke.x, z: hauke.z, elapsed: 0.1, duration: 0.5, radius: 2, damage: 15,
    });
  }
  advance(run, {});
  assert.ok(hauke.coma > 1.5);
  assert.ok(run.barks.some((b) => b.text.includes('FRESSKOMA')));
});

test('All 6 Chaos Events trigger cleanly with expected gameplay effects', () => {
  const run = newRun({ seed: 556 });
  run.chaosTimer = 0.01;
  advance(run, {});
  assert.ok(run.chaosEvent !== null);
  assert.ok(CHAOS_EVENTS.some((ev) => ev.id === run.chaosEvent.id));

  for (const ev of CHAOS_EVENTS) {
    const r = newRun({ seed: 600 });
    const prevDucks = r.pickups.filter((pk) => pk.kind === 'duck').length;
    triggerChaosEvent(r, ev.id);
    assert.equal(r.chaosEvent.id, ev.id);
    assert.ok(r.stats.chaosEvents >= 1);
    if (ev.id === 'enten_regen') {
      assert.ok(r.pickups.filter((pk) => pk.kind === 'duck').length >= prevDucks + 3);
    }
    if (ev.id === 'kartenzahlung') {
      const xpBefore = r.player.xp;
      const expected = 2 * 2 * (r.map.mutator?.scoreMult || 1);
      r.pickups.push({
        id: 8888, kind: 'xp', x: r.player.x + 0.2, z: r.player.z,
        value: 2, tone: 'gold', magnetized: false, collected: false, age: 0,
      });
      advance(r, {});
      assert.ok(Math.abs((r.player.xp - xpBefore) - expected) < 0.01);
    }
  }
});

test('Weapon Evolutions appear on slot 0 when synergy conditions are met and enhance combat', () => {
  for (const evo of EVOLUTIONS) {
    const run = newRun({ seed: 2026 });
    run.player.weapons[evo.weapon] = 3;
    if (evo.synergy in run.player.passives) run.player.passives[evo.synergy] = 1;
    else run.player.weapons[evo.synergy] = 1;
    run.pendingLevelUps = 1;
    advance(run, {});

    assert.equal(run.state, 'levelup');
    assert.equal(run.upgradeOffers[0].id, evo.id);
    assert.equal(run.upgradeOffers[0].isEvo, true);

    applyUpgrade(run, evo.id);
    assert.equal(run.state, 'playing');
    assert.equal(run.player.evolutions.has(evo.id), true);
    assert.equal(run.stats.evolutions, 1);
  }

  // Verify evo_pan creates a 360° fiery shockwave explosion on manual Schelle
  const evoRun = newRun({ seed: 2026 });
  evoRun.player.weapons.pan = 3;
  evoRun.player.passives.chili = 1;
  evoRun.player.evolutions.add('evo_pan');
  advance(evoRun, { bonk: true });
  assert.ok(evoRun.explosions.length >= 1);
});

test('Upgrade reroll consumes a reroll charge and refreshes level-up offers', () => {
  const run = newRun({ seed: 707 });
  run.pendingLevelUps = 1;
  advance(run, {});
  assert.equal(run.state, 'levelup');
  assert.equal(run.player.rerolls, 2);

  const firstOfferIds = run.upgradeOffers.map((o) => o.id);
  const ok1 = rerollUpgrades(run);
  assert.equal(ok1, true);
  assert.equal(run.player.rerolls, 1);
  assert.equal(run.upgradeOffers.length, 3);
  assert.notDeepEqual(run.upgradeOffers.map((o) => o.id), firstOfferIds);

  assert.equal(rerollUpgrades(run), true);
  assert.equal(run.player.rerolls, 0);
  assert.equal(rerollUpgrades(run), false);
});

test('Combo milestone at 10 kills grants bonus Aura, heal, and milestone bark', () => {
  const run = newRun({ seed: 808 });
  run.player.combo = 9;
  run.player.comboTimer = 3.0;
  run.player.hp = 60;
  const pfandBefore = run.player.pfand;
  run.enemies = [{
    id: 901, type: 'anton', elite: false, x: run.player.x + 1.0, z: run.player.z,
    angle: Math.PI, hp: 5, maxHp: 20, speed: 0, radius: 0.32, damage: 5,
    dead: false, moving: false, stunned: 0, slowed: 0, exposed: 0, hitFlash: 0,
    burning: 0, donerCd: 0, knockX: 0, knockZ: 0, knockTime: 0, lootBank: 0,
    hasCrown: false, panicked: 0, stuffed: 0, coma: 0, burpCd: 0,
    slideVx: 0, slideVz: 0, chargeState: 'none', chargeTimer: 0, chargeDir: { x: 0, z: 0 }, enraged: false, koTimer: 0,
  }];
  run.player.angle = 0;

  advance(run, { bonk: true });
  assert.equal(run.player.combo, 10);
  assert.equal(run.player.comboTier, 10);
  assert.ok(run.player.pfand >= pfandBefore + 250);
  assert.ok(run.player.hp > 60);
  assert.ok(run.events.some((ev) => ev.kind === 'combo_milestone'));
});

test('Killer-specific death roasts match Hauke, Tom, and Anton', () => {
  for (const killerType of ['hauke', 'tom', 'anton']) {
    const run = newRun({ seed: 909 });
    run.player.helmet = false;
    run.player.invuln = 0;
    run.player.hp = 1;
    run.enemies = [{
      id: 950, type: killerType, elite: false, x: run.player.x + 0.1, z: run.player.z,
      angle: Math.PI, hp: 50, maxHp: 50, speed: 0, radius: 0.4, damage: 25,
      dead: false, moving: false, stunned: 0, slowed: 0, exposed: 0, hitFlash: 0,
      burning: 0, donerCd: 0, knockX: 0, knockZ: 0, knockTime: 0, lootBank: 0,
      hasCrown: false, panicked: 0, stuffed: 0, coma: 0, burpCd: 0,
      slideVx: 0, slideVz: 0, chargeState: 'none', chargeTimer: 0, chargeDir: { x: 0, z: 0 }, enraged: false, koTimer: 0,
    }];
    advance(run, {});
    assert.equal(run.state, 'caught');
    assert.equal(run.caughtBy, killerType);
    assert.ok(DEATH_ROASTS[killerType].some((line) => run.deathReason.includes(line)));
  }
});

test('Rival challenge marks beaten and formatShareReceipt builds WhatsApp-ready Kassenbon', () => {
  const run = newRun({ seed: 2026, loadout: 'knobi_chef', beatScore: 500, beatFrom: 'Anton' });
  assert.equal(run.challenge.score, 500);
  assert.equal(run.challenge.beaten, false);

  run.player.pfand = 750;
  run.player.evolutions.add('evo_pan');
  run.stats.evolutions = 1;
  run.stats.ducks = 2;
  advance(run, {});
  assert.equal(run.challenge.beaten, true);
  assert.ok(run.events.some((ev) => ev.kind === 'ka_ching'));

  const badges = computeBadges(run);
  assert.ok(badges.some((b) => b.label.includes('EVOLUTIONS-CHEF')));
  assert.ok(badges.some((b) => b.label.includes('ENTEN-FLÜSTERER')));

  const text = formatShareReceipt(run, 'https://example.com/?seed=2026&beat=750');
  assert.ok(text.includes('IMBISS-SURVIVAL KASSENBON (#2026)'));
  assert.ok(text.includes('Knobi-Priester'));
  assert.ok(text.includes('SCHELLEN-INFERNO'));
  assert.ok(text.includes('GEKNACKT!'));
  assert.ok(text.includes('https://example.com/?seed=2026&beat=750'));
});

test('All 7 weapons and 5 passives participate in Evolutions with live synergy hints, evo_knobi heal/panic, and evo_beam 360 strobe', () => {
  const weapons = UPGRADE_POOL.filter((u) => u.kind === 'weapon').map((u) => u.id);
  const passives = UPGRADE_POOL.filter((u) => u.kind === 'passive').map((u) => u.id);
  assert.equal(EVOLUTIONS.length, weapons.length);
  for (const w of weapons) {
    assert.ok(EVOLUTIONS.some((e) => e.weapon === w), `missing evolution for weapon ${w}`);
  }
  for (const p of passives) {
    assert.ok(EVOLUTIONS.some((e) => e.synergy === p), `missing evolution synergy for passive ${p}`);
  }

  // Synergy hints populate on non-evo level-up cards
  const hintRun = newRun({ seed: 2026, loadout: 'classic' });
  hintRun.player.passives.chili = 1;
  hintRun.pendingLevelUps = 1;
  advance(hintRun, {});
  assert.equal(hintRun.state, 'levelup');
  for (const offer of hintRun.upgradeOffers) {
    assert.ok(offer.synergyHint && offer.synergyHint.includes('★'));
  }

  // evo_knobi panics Antons and heals Torge when hitting 3+ enemies
  const knobiRun = newRun({ seed: 2026, loadout: 'knobi_chef' });
  knobiRun.player.hp = 60;
  knobiRun.player.weapons.knobi = 3;
  knobiRun.player.passives.crown = 1;
  knobiRun.player.evolutions.add('evo_knobi');
  knobiRun.player.timers.knobi = 0.005;
  knobiRun.enemies = [0, 1, 2].map((i) => ({
    id: 1200 + i, type: 'anton', elite: false,
    x: knobiRun.player.x + 1.2 + i * 0.25, z: knobiRun.player.z,
    angle: Math.PI, hp: 80, maxHp: 80, speed: 0, radius: 0.32, damage: 5,
    dead: false, moving: false, stunned: 0, slowed: 0, exposed: 0, hitFlash: 0,
    burning: 0, donerCd: 0, knockX: 0, knockZ: 0, knockTime: 0, lootBank: 0,
    hasCrown: false, panicked: 0, stuffed: 0, coma: 0, burpCd: 0,
    slideVx: 0, slideVz: 0, chargeState: 'none', chargeTimer: 0, chargeDir: { x: 0, z: 0 }, enraged: false, koTimer: 0,
  }));
  advance(knobiRun, {});
  assert.ok(knobiRun.player.hp > 60);
  assert.ok(knobiRun.enemies.every((e) => e.panicked > 0 && e.hp < 80));

  // evo_beam hits enemies behind Torge in 360° with stun + burn
  const beamRun = newRun({ seed: 2026 });
  beamRun.player.angle = 0; // facing +X
  beamRun.player.weapons.beam = 3;
  beamRun.player.passives.espresso = 1;
  beamRun.player.evolutions.add('evo_beam');
  beamRun.player.timers.beam = 0.005;
  beamRun.enemies = [{
    id: 1300, type: 'anton', elite: false,
    x: beamRun.player.x - 3.5, z: beamRun.player.z, // directly behind Torge
    angle: 0, hp: 90, maxHp: 90, speed: 0, radius: 0.32, damage: 5,
    dead: false, moving: false, stunned: 0, slowed: 0, exposed: 0, hitFlash: 0,
    burning: 0, donerCd: 0, knockX: 0, knockZ: 0, knockTime: 0, lootBank: 0,
    hasCrown: false, panicked: 0, stuffed: 0, coma: 0, burpCd: 0,
    slideVx: 0, slideVz: 0, chargeState: 'none', chargeTimer: 0, chargeDir: { x: 0, z: 0 }, enraged: false, koTimer: 0,
  }];
  advance(beamRun, {});
  assert.ok(beamRun.enemies[0].hp < 90);
  assert.ok(beamRun.enemies[0].stunned > 0);
  assert.ok(beamRun.enemies[0].burning > 0);
});

test('Stats and hitbox radii stay consistent with upgrade copy and loadout areaMult', () => {
  const run = newRun({ seed: 2026, loadout: 'brawler' });
  const baseStats = getStats(run);
  assert.ok(Math.abs(run.player.donerRadius - 2.19 * LOADOUTS.brawler.areaMult) < 0.001);

  run.player.passives.espresso = 1;
  run.player.passives.dash_mod = 1;
  const upgraded = getStats(run);
  assert.ok(Math.abs(upgraded.cdMult / baseStats.cdMult - 0.88) < 0.001);
  assert.ok(Math.abs(upgraded.dashCdMult / baseStats.dashCdMult - 0.82) < 0.001);
});

test('Dropped crown prompt triggers before auto-pickup and input.use recovers the crown', () => {
  const run = newRun({ seed: 2026 });
  run.player.helmet = false;
  run.droppedHelmet = { x: run.player.x + 1.5, z: run.player.z, age: 1 };

  const act = interaction(run);
  assert.ok(act?.helmet);
  advance(run, { use: true });
  assert.equal(run.player.helmet, true);
  assert.equal(run.droppedHelmet, null);
  assert.ok(run.events.some((ev) => ev.kind === 'crown_pickup'));
});

test('Unnamed challenge copy, biome oil/ice palettes, loadout jacketHex, and non-clipping Späti lanterns', () => {
  const run = newRun({ seed: 2026, beatScore: 400 });
  assert.equal(run.challenge.from, '');
  run.player.pfand = 520;
  advance(run, {});
  assert.equal(run.challenge.beaten, true);
  assert.ok(run.notices.some((n) => /kumpel-rekord/i.test(n.message)));
  const receipt = formatShareReceipt(run, 'https://example.com/?seed=2026&beat=520');
  assert.ok(receipt.includes('Kumpel-Rekord'));
  assert.ok(!receipt.includes('Kumpels'));

  for (const biome of BIOMES) {
    assert.ok(typeof biome.waterHex === 'number' && typeof biome.foamHex === 'number');
    assert.ok(Array.isArray(biome.nightTint) && biome.nightTint.length === 3);
  }
  const jacketColors = new Set(Object.values(LOADOUTS).map((l) => l.jacketHex));
  assert.equal(jacketColors.size, Object.keys(LOADOUTS).length);

  // Ensure no lantern fixture clips into the Späti-Bude footprint
  const arena = buildArena(2026, 1);
  for (const fx of arena.fixtures) {
    assert.ok(
      Math.hypot(fx.x - arena.vending.x, fx.z - arena.vending.z) >= 1.0,
      `fixture at (${fx.x}, ${fx.z}) overlaps vending kiosk`,
    );
  }
});
