import {
  BON_EXPRESS_POWER,
  BON_EXPRESS_RUSTY_POWER,
  BON_EXPRESS_WINDOW,
  BON_REWARD_POWER,
  BON_RUSTY_REWARD_POWER,
  BON_WINDOW_SECONDS,
} from '../../config/constants.js';
import { MEME_LINES, ORDER_ITEMS } from '../../config/nights.js';
import { clamp, emit, grantAchievement, notify, pickLine } from '../runtime.js';

export function createOrderState(cfg, modifiers = [], rng = Math.random) {
  const isRush = modifiers.includes('rush_hour');
  const firstAt = (cfg.firstBonAt ?? 26) * (isRush ? 0.68 : 1.0);
  return {
    nextAt: firstAt + rng() * 4.5,
    seq: 100,
    active: null, // { id, label, tip, createdAt, deadline, duration }
    stampBounce: 0,
  };
}

function scheduleNextOrder(run) {
  const cfg = run.nightCfg;
  const [lo, hi] = cfg?.bonInterval ?? [32, 44];
  const mult = run.modifiers?.includes('rush_hour') ? 0.58 : 1.0;
  const delay = (lo + run.rng() * (hi - lo)) * mult;
  run.orders.nextAt = run.time + delay;
}

export function isOrderExpress(run) {
  const active = run?.orders?.active;
  if (!active) return false;
  return (run.time - active.createdAt) <= BON_EXPRESS_WINDOW;
}

export function stampOrderBon(run) {
  if (!run || run.state !== 'playing' || run.powerOutage || run.monitorOpen) return false;
  const ord = run.orders;
  if (!ord?.active) return false;

  const ticket = ord.active;
  const express = (run.time - ticket.createdAt) <= BON_EXPRESS_WINDOW;
  ord.active = null;
  ord.stampBounce = 1.0;

  const isRusty = run.modifiers?.includes('rusty_gen');
  const powerBoost = express
    ? (isRusty ? BON_EXPRESS_RUSTY_POWER : BON_EXPRESS_POWER)
    : (isRusty ? BON_RUSTY_REWARD_POWER : BON_REWARD_POWER);
  const tipEarned = express ? ticket.tip * 2 : ticket.tip;

  run.power = clamp(run.power + powerBoost, 0, 100);
  run.stats.bonsStamped += 1;
  if (express) run.stats.expressBons = (run.stats.expressBons || 0) + 1;
  run.stats.tipsEarned = Math.round((run.stats.tipsEarned + tipEarned) * 100) / 100;

  if (run.stats.bonsStamped >= 3) grantAchievement(run, 'night_cashier');
  const prefix = express ? 'HEISS SERVIERT! (EXPRESS ×2) · ' : '';
  notify(run, `${prefix}${pickLine(MEME_LINES.bonStamped, run.stats.bonsStamped - 1)} (+${powerBoost} % Strom)`, 4.2);
  emit(run, 'bon_stamped', { powerBoost, tip: tipEarned, express });
  scheduleNextOrder(run);
  return true;
}

export function stepOrderSystem(run, dt) {
  const ord = run.orders;
  if (!ord) return;

  ord.stampBounce = Math.max(0, ord.stampBounce - dt * 3.2);

  if (ord.active) {
    if (run.time >= ord.active.deadline) {
      ord.active = null;
      run.stats.bonsMissed += 1;
      // Missed order Storno-Buzzer attracts Tom & Torge faster!
      if (run.ai.tom > 0 && run.animatronics.tom.room !== 'office') {
        run.animatronics.tom.timer = Math.min(run.animatronics.tom.timer, 0.65);
      }
      if (run.ai.anton > 0 && run.animatronics.anton.room !== 'office' && run.training === 'done') {
        run.animatronics.anton.timer = Math.min(run.animatronics.anton.timer, 0.75);
      }
      if (run.ai.torge > 0 && run.animatronics.torge.room !== 'office') {
        run.animatronics.torge.timer = Math.min(run.animatronics.torge.timer, 0.85);
      }
      notify(run, pickLine(MEME_LINES.bonMissed, run.stats.bonsMissed - 1), 4.6);
      emit(run, 'bon_missed');
      scheduleNextOrder(run);
    }
    return;
  }

  if (run.time >= ord.nextAt) {
    ord.seq += 1;
    const item = ORDER_ITEMS[Math.floor(run.rng() * ORDER_ITEMS.length)];
    const windowSec = run.modifiers?.includes('rush_hour') ? BON_WINDOW_SECONDS * 0.82 : BON_WINDOW_SECONDS;
    ord.active = {
      id: ord.seq,
      label: item.label,
      tip: item.tip,
      createdAt: run.time,
      duration: windowSec,
      deadline: run.time + windowSec,
    };
    emit(run, 'bon_printed', { id: ord.seq, label: item.label });
  }
}
