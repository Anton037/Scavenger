import {
  STEAM_BURST_COOLDOWN,
  STEAM_BURST_DROP,
  STEAM_BURST_MIN_HEAT,
  VENT_COOL_RATE,
  VENT_STEAM_DURATION,
  VENT_STEAM_MIN_HEAT,
} from '../../config/constants.js';
import { MEME_LINES } from '../../config/nights.js';
import {
  clamp,
  emit,
  endAntonVideo,
  grantAchievement,
  noteRoomTransition,
  notify,
  pickLine,
} from '../runtime.js';

export function createThermalState(cfg, modifiers = []) {
  const hasGreaseFire = modifiers.includes('grease_fire');
  const hasFog = modifiers.includes('midnight_fog');
  return {
    heat: hasFog ? 26 : 16, // 0..100 (% pressure)
    baseRate: (cfg.heatRate ?? 1.0) * (hasGreaseFire ? 1.8 : 1.0),
    ventingUntil: 0,
    burstCooldownUntil: 0,
    valveSpin: 0,
    steamFog: hasFog ? 0.24 : 0,
    burstVisual: null, // { cam, timer }
  };
}

export function getTemperatureCelsius(run) {
  const heat = clamp(run?.thermal?.heat ?? 16, 0, 100);
  return Math.round(30 + heat * 0.7);
}

export function isVentingSteam(run) {
  return (run?.thermal?.ventingUntil ?? 0) > (run?.time ?? 0);
}

export function ventOfficeSteam(run) {
  if (!run || run.state !== 'playing' || run.powerOutage || run.monitorOpen) return false;
  const th = run.thermal;
  if (!th || th.ventingUntil > run.time || th.heat < VENT_STEAM_MIN_HEAT) return false;

  th.ventingUntil = run.time + VENT_STEAM_DURATION;
  run.stats.steamVents += 1;
  notify(run, pickLine(MEME_LINES.steamVent, run.stats.steamVents - 1), 3.6);
  emit(run, 'steam_vent_start');
  return true;
}

export function triggerSteamBurst(run) {
  if (!run || run.state !== 'playing' || run.powerOutage || !run.monitorOpen) return false;
  const cam = run.activeCam;
  if (cam !== '2B' && cam !== '4B') return false;

  const th = run.thermal;
  if (!th || th.heat < STEAM_BURST_MIN_HEAT || th.burstCooldownUntil > run.time) return false;

  const fastCooldown = run.modifiers?.includes('grease_fire') ? STEAM_BURST_COOLDOWN * 0.68 : STEAM_BURST_COOLDOWN;
  th.heat = clamp(th.heat - STEAM_BURST_DROP, 8, 100);
  th.burstCooldownUntil = run.time + fastCooldown;
  th.burstVisual = { cam, timer: 1.35 };
  run.stats.steamBursts += 1;

  let hit = false;
  if (cam === '2B') {
    const anton = run.animatronics.anton;
    if (anton.room === '2B' || anton.room === 'left_door') {
      const prev = anton.room;
      anton.room = '1B';
      anton.timer = 6.2;
      anton.sighted = false;
      endAntonVideo(run, false);
      noteRoomTransition(run, prev, '1B', 'anton', false);
      hit = true;
    }
  } else if (cam === '4B') {
    const tom = run.animatronics.tom;
    const torge = run.animatronics.torge;
    if (tom.room === '4B' || tom.room === 'right_door') {
      const prev = tom.room;
      tom.room = '1B';
      tom.timer = 6.2;
      tom.sighted = false;
      noteRoomTransition(run, prev, '1B', 'tom', false);
      hit = true;
    }
    if (torge.room === '4B') {
      torge.room = '4A';
      torge.pathIdx = 3;
      torge.timer = 4.8;
      noteRoomTransition(run, '4B', '4A', 'torge', false);
      hit = true;
    }
  }

  if (hit) {
    run.stats.steamHits += 1;
    if (run.stats.steamHits >= 2) grantAchievement(run, 'steam_master');
    notify(run, pickLine(MEME_LINES.steamBurstHit, run.stats.steamHits - 1), 4.2);
  } else {
    notify(run, MEME_LINES.steamBurstMiss[0], 3.4);
  }

  emit(run, 'steam_burst', { cam, hit, side: cam === '2B' ? 'left' : 'right' });
  return true;
}

export function stepThermalSystem(run, dt) {
  const th = run.thermal;
  if (!th) return;

  if (th.burstVisual) {
    th.burstVisual.timer -= dt;
    if (th.burstVisual.timer <= 0) th.burstVisual = null;
  }

  const minFog = run.modifiers?.includes('midnight_fog') ? 0.24 : 0;
  if (th.ventingUntil > run.time) {
    th.heat = clamp(th.heat - VENT_COOL_RATE * dt, 8, 100);
    th.valveSpin += dt * 9.5;
    th.steamFog = Math.max(minFog, Math.min(0.62, th.steamFog + dt * 0.55));
    return;
  }

  let doorHeat = 0;
  if (run.leftDoor) doorHeat += 0.85;
  if (run.rightDoor) doorHeat += 0.85;
  const fanRelief = (!run.leftDoor && !run.rightDoor) ? -0.18 : 0;
  const netRate = Math.max(0.18, th.baseRate + doorHeat + fanRelief);

  th.heat = clamp(th.heat + netRate * dt, 8, 100);
  const targetFog = Math.max(minFog, th.heat > 62 ? ((th.heat - 62) / 38) * 0.72 : 0);
  th.steamFog += (targetFog - th.steamFog) * Math.min(1, dt * 2.4);

  if (th.heat >= 100) {
    // Thermal Safety Purge: fogs feed, speeds up Chef Torge, drops pressure back to 58%
    th.heat = 58;
    th.steamFog = 0.95;
    run.stats.overheats += 1;
    if (run.activeCam && run.activeCam !== '6') {
      run.feedFaultUntil[run.activeCam] = Math.max(run.feedFaultUntil[run.activeCam] ?? 0, run.time + 3.5);
    }
    if (run.ai.torge > 0 && run.animatronics.torge.room !== 'office') {
      run.animatronics.torge.timer = Math.min(run.animatronics.torge.timer, 0.35);
    }
    notify(run, MEME_LINES.overheat[0], 4.8);
    emit(run, 'overheat_alarm');
  }
}
