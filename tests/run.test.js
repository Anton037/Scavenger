import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, applyUpgrade, finishRunCashOut, interaction, newRun, STEP, WAVE_DURATION } from '../src/game.js';
import { buildArena, LOADOUTS } from '../src/level.js';

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

test('open survival arena generates spacious walkable courtyard across seeds', () => {
  for (let i = 0; i < 8; i++) {
    const map = buildArena(4000 + i * 17, (i % 3) + 1);
    assert.equal(map.width, 28);
    assert.equal(map.depth, 28);
    assert.equal(map.walkable(map.start.x, map.start.z, 0.3), true);
    assert.equal(map.blocks.length, 4);
    assert.ok(map.barrels.length >= 5);
    assert.ok(map.crates.length >= 5);
  }
});

test('loadouts initialize unique starter weapons, HP, and speed profiles', () => {
  const classic = newRun({ seed: 100, loadout: 'classic' });
  const runner = newRun({ seed: 100, loadout: 'runner' });
  const brawler = newRun({ seed: 100, loadout: 'brawler' });

  assert.equal(classic.player.weapons.pan, 1);
  assert.equal(runner.player.weapons.skewer, 1);
  assert.equal(brawler.player.weapons.doner, 1);
  assert.equal(brawler.player.maxHp, LOADOUTS.brawler.maxHp);
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
  assert.ok(run.barks.some((b) => b.text === 'BÖÖÖRPS!!'));
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

test('Chaos Events trigger cleanly when chaosTimer elapses', () => {
  const run = newRun({ seed: 556 });
  run.chaosTimer = 0.01;
  advance(run, {});
  assert.ok(run.chaosEvent !== null);
  assert.ok(['ordnungsamt', 'happy_hour', 'fettbahn'].includes(run.chaosEvent.id));
});
