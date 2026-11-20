import { HALLUCINATIONS } from '../../config/nights.js';
import { emit, grantAchievement, triggerJumpscare } from '../runtime.js';

export function banishDuckSuit(run) {
  if (!run?.duck?.active && !run?.goldenActive) return false;
  if (run.duck) {
    run.duck.active = false;
    run.duck.timer = 0;
    run.duck.flashGrace = 0;
    run.duck.spawnCooldown = 18 + run.rng() * 14;
  }
  run.goldenActive = false;
  run.goldenPoster = false;
  run.goldenTimer = 0;
  run.stats.goldenBanished += 1;
  grantAchievement(run, 'duck_banish');
  emit(run, 'duck_banished');
  return true;
}

export function spawnDuckAnomaly(run, station = 'back') {
  if (!run || run.powerOutage || run.state !== 'playing') return;
  run.duck.active = true;
  run.duck.station = station;
  run.duck.timer = 3.9;
  run.duck.flashGrace = 0;
  // Sputter & kill flashlight on manifestation so the player gets a fair chance to see it before flashing!
  if (run.flashlightOn && run.viewState === station) {
    run.flashlightOn = false;
  }
  run.goldenActive = station === 'front';
  run.goldenTimer = 3.9;
  emit(run, 'duck_rustle', { rear: station === 'back' });
}

export function stepDuck(run, dt) {
  const duck = run.duck;
  if (!duck) return;

  // Legacy goldenActive sync
  if (run.goldenActive && !duck.active) {
    duck.active = true;
    duck.station = 'front';
    duck.timer = run.goldenTimer || 3.8;
  }

  if (!duck.active) {
    const duckAi = run.ai?.duck ?? 0;
    if (duckAi <= 0 || run.monitorOpen || run.viewState === 'under_desk') return;
    duck.spawnCooldown = (duck.spawnCooldown ?? 20) - dt;
    if (duck.spawnCooldown <= 0) {
      duck.spawnCooldown = Math.max(14, 34 - duckAi * 0.9);
      if (Math.ceil(run.rng() * 20) <= duckAi && run.rng() < 0.42) {
        // Manifest silently behind the player's current station!
        const behind = run.viewState === 'front' ? 'back' : 'front';
        duck.active = true;
        duck.station = behind;
        duck.timer = 4.2;
        duck.flashGrace = 0;
        emit(run, 'duck_rustle', { rear: behind !== run.viewState });
      }
    }
    return;
  }

  // Only ticks down & checks anti-flash when player is actually facing the station where the Duck Suit stands!
  if (run.monitorOpen || run.viewState !== duck.station) {
    return;
  }

  if ((duck.flashGrace ?? 0) > 0) {
    duck.flashGrace = Math.max(0, duck.flashGrace - dt);
  }

  // STRICT ANTI-FLASH RULE: Shining Flashlight at the Duck Suit provokes an immediate jumpscare!
  if (run.flashlightOn && (duck.flashGrace ?? 0) <= 0) {
    triggerJumpscare(run, 'duck', 'flash');
    return;
  }

  duck.timer -= dt;
  run.goldenTimer = duck.timer;
  if (run.rng() < 0.06) {
    run.hallucination = {
      text: HALLUCINATIONS[Math.floor(run.rng() * HALLUCINATIONS.length)],
      timer: 0.14,
    };
  }
  if (duck.timer <= 0) {
    triggerJumpscare(run, 'duck', 'hallucination');
  }
}
