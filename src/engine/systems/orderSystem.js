import {
  BON_EXPRESS_POWER,
  BON_EXPRESS_RUSTY_POWER,
  BON_EXPRESS_WINDOW,
  BON_REWARD_POWER,
  BON_RUSTY_REWARD_POWER,
  BON_WINDOW_SECONDS,
  FIRST_BON_GRACE_SECONDS,
  PREP_BAG_SECONDS,
  PREP_DONER_SECONDS,
  PREP_FRYER_SECONDS,
} from '../../config/constants.js';
import { ORDER_ITEMS } from '../../config/nights.js';
import { clamp, emit, grantAchievement } from '../runtime.js';

export function createOrderState(cfg, modifiers = [], rng = Math.random) {
  const isRush = modifiers.includes('rush_hour');
  const firstAt = (cfg.firstBonAt ?? 12) * (isRush ? 0.72 : 1.0);
  const baseQuota = cfg.orderQuota ?? 4;
  return {
    quota: baseQuota + (isRush ? 2 : 0),
    completed: 0,
    nextAt: firstAt + rng() * 3.0,
    seq: 100,
    active: null,
    stampBounce: 0,
    lastReceipt: null,
    prepNoise: 0,
    lastSliceSoundAt: -1,
    lastPourSoundAt: -1,
  };
}

function scheduleNextOrder(run) {
  const ord = run.orders;
  if (run.overtime && ord.completed < ord.quota) {
    // Slightly kinder overtime pacing (was 2.5s) so the Nachschicht stays scary but fair
    ord.nextAt = run.time + 3.5;
    return;
  }
  const cfg = run.nightCfg;
  const [lo, hi] = cfg?.bonInterval ?? [18, 26];
  const mult = run.modifiers?.includes('rush_hour') ? 0.65 : 1.0;
  const delay = (lo + run.rng() * (hi - lo)) * mult;
  ord.nextAt = run.time + delay;
}

export function spawnNewOrderTicket(run) {
  const ord = run.orders;
  ord.seq += 1;
  const item = ORDER_ITEMS[Math.floor(run.rng() * ORDER_ITEMS.length)];
  const training = run.night === 1 && ord.seq === 101;
  const baseWindow = run.modifiers?.includes('rush_hour') ? BON_WINDOW_SECONDS * 0.85 : BON_WINDOW_SECONDS;
  const windowSec = baseWindow + (training ? FIRST_BON_GRACE_SECONDS : 0);
  ord.active = {
    id: ord.seq,
    label: item.label,
    tip: item.tip,
    createdAt: run.time,
    duration: windowSec,
    training,
    deadline: run.time + windowSec,
    step: 'doner', // 'doner' -> 'fryer' -> 'bag'
    donerProgress: 0,
    fryerState: 'idle', // 'idle' | 'frying' | 'ready' | 'done'
    fryerTimer: 0,
    bagProgress: 0,
  };
  emit(run, 'bon_printed', { id: ord.seq, label: item.label });
}

export function isOrderExpress(run) {
  const active = run?.orders?.active;
  if (!active) return false;
  return (run.time - active.createdAt) <= BON_EXPRESS_WINDOW;
}

function finalizeCompletedOrder(run, ticket) {
  const ord = run.orders;
  const express = (run.time - ticket.createdAt) <= BON_EXPRESS_WINDOW;
  ord.active = null;
  ord.completed += 1;
  ord.stampBounce = 1.0;

  const isRusty = run.modifiers?.includes('rusty_gen');
  const powerBoost = express
    ? (isRusty ? BON_EXPRESS_RUSTY_POWER : BON_EXPRESS_POWER)
    : (isRusty ? BON_RUSTY_REWARD_POWER : BON_REWARD_POWER);
  const tipEarned = Math.round(ticket.tip * (express ? 150 : 100)) / 100;

  const before = run.power;
  run.power = clamp(before + powerBoost, 0, 100);
  ord.lastReceipt = { until: run.time + 3, power: Math.round(run.power - before), tip: tipEarned, express };
  run.stats.bonsStamped += 1;
  if (express) run.stats.expressBons = (run.stats.expressBons || 0) + 1;
  run.stats.tipsEarned = Math.round((run.stats.tipsEarned + tipEarned) * 100) / 100;

  if (ord.completed >= 4) grantAchievement(run, 'night_cashier');
  emit(run, 'bon_stamped', { powerBoost, tip: tipEarned, express, completed: ord.completed, quota: ord.quota });

  // Instant victory if completing mandatory quota during 6:00 AM Overtime!
  if (run.overtime && ord.completed >= ord.quota) {
    run.onOvertimeQuotaMet?.();
    return;
  }
  scheduleNextOrder(run);
}

/**
 * Tactile 3-step Back-Station Prep interaction:
 * 1. 'doner': Hold/slice vertical spit (2.2s, persistent across 180° turns)
 * 2. 'fryer': Drop basket (4.0s autonomous sizzle), then tap again when 'ready' to lift
 * 3. 'bag' (or 'spezi'): Pour cold Spezi & bag takeout order (1.0s)
 */
export function interactPrepStation(run, station = 'auto', holdDt = 0.35) {
  if (!run || run.state !== 'playing' || run.powerOutage || run.monitorOpen) return false;
  if (run.viewState !== 'back') return false;
  const ord = run.orders;
  if (!ord?.active) return false;

  const ticket = ord.active;
  const target = (!station || station === 'auto') ? ticket.step : (station === 'spezi' ? 'bag' : station);

  if (ticket.step === 'doner' && target === 'doner') {
    ticket.donerProgress = Math.min(PREP_DONER_SECONDS, (ticket.donerProgress || 0) + holdDt);
    ord.prepNoise = Math.max(ord.prepNoise, 0.72);
    if (run.time - ord.lastSliceSoundAt >= 0.38) {
      ord.lastSliceSoundAt = run.time;
      emit(run, 'prep_doner_slice', { rear: true });
    }
    if (ticket.donerProgress >= PREP_DONER_SECONDS) {
      ticket.step = 'fryer';
      emit(run, 'prep_step_done', { step: 'doner' });
    }
    return true;
  }

  if (ticket.step === 'fryer' && target === 'fryer') {
    if (ticket.fryerState === 'idle') {
      ticket.fryerState = 'frying';
      ticket.fryerTimer = PREP_FRYER_SECONDS;
      ord.prepNoise = Math.max(ord.prepNoise, 0.48);
      emit(run, 'prep_fryer_drop', { rear: true });
      return true;
    }
    if (ticket.fryerState === 'ready') {
      ticket.fryerState = 'done';
      ticket.step = 'bag';
      emit(run, 'prep_fryer_lift', { rear: true });
      return true;
    }
    return false;
  }

  if (ticket.step === 'bag' && target === 'bag') {
    ticket.bagProgress = Math.min(PREP_BAG_SECONDS, (ticket.bagProgress || 0) + holdDt);
    ord.prepNoise = Math.max(ord.prepNoise, 0.36);
    if (run.time - ord.lastPourSoundAt >= 0.42) {
      ord.lastPourSoundAt = run.time;
      emit(run, 'prep_spezi_pour', { rear: true });
    }
    if (ticket.bagProgress >= PREP_BAG_SECONDS) {
      emit(run, 'prep_bag_done', { rear: true });
      finalizeCompletedOrder(run, ticket);
    }
    return true;
  }

  return false;
}

/**
 * Legacy/express helper kept for backward test compatibility.
 */
export function stampOrderBon(run) {
  if (!run || run.state !== 'playing' || run.powerOutage || run.monitorOpen) return false;
  const ord = run.orders;
  if (!ord?.active) return false;
  finalizeCompletedOrder(run, ord.active);
  return true;
}

export function stepOrderSystem(run, dt) {
  const ord = run.orders;
  if (!ord) return;

  ord.stampBounce = Math.max(0, ord.stampBounce - dt * 3.2);
  ord.prepNoise = Math.max(0, ord.prepNoise - dt * 1.6);

  if (ord.active) {
    const ticket = ord.active;
    if (ticket.step === 'fryer' && ticket.fryerState === 'frying') {
      ticket.fryerTimer -= dt;
      ord.prepNoise = Math.max(ord.prepNoise, 0.42);
      if (ticket.fryerTimer <= 0) {
        ticket.fryerTimer = 0;
        ticket.fryerState = 'ready';
        emit(run, 'prep_fryer_ready', { rear: true });
      }
    } else if (ticket.step === 'fryer' && ticket.fryerState === 'ready') {
      ord.prepNoise = Math.max(ord.prepNoise, 0.16);
    }

    if (!run.overtime && run.time >= ticket.deadline) {
      ord.active = null;
      run.stats.bonsMissed += 1;
      // Missed order alarm agitates Tom & Torge!
      if (run.ai.tom > 0 && run.animatronics.tom.room !== 'office') {
        run.animatronics.tom.timer = Math.min(run.animatronics.tom.timer, 0.65);
      }
      if (run.ai.anton > 0 && run.animatronics.anton.room !== 'office' && run.training === 'done') {
        run.animatronics.anton.timer = Math.min(run.animatronics.anton.timer, 0.75);
      }
      if (run.ai.torge > 0 && run.animatronics.torge.room !== 'office') {
        run.animatronics.torge.timer = Math.min(run.animatronics.torge.timer, 0.75);
      }
      emit(run, 'bon_missed');
      scheduleNextOrder(run);
    }
    return;
  }

  if (run.time >= ord.nextAt) {
    spawnNewOrderTicket(run);
  }
}
