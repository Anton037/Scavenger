import {
  IR_FLASH_COOLDOWN,
  IR_FLASH_COST,
  IR_STUN_SECONDS,
} from '../../config/constants.js';
import {
  emit,
  endAntonVideo,
  feedIsInterrupted,
  grantAchievement,
} from '../runtime.js';

export function triggerCamFlash(run) {
  if (!run || run.state !== 'playing' || run.powerOutage || !run.monitorOpen) return false;
  const cam = run.activeCam;
  if (!cam || cam === '6') return false;
  if ((run.camFlashCooldownUntil ?? 0) > run.time || run.power <= IR_FLASH_COST) return false;

  const wasDisrupted = feedIsInterrupted(run, cam);
  run.power = Math.max(0, run.power - IR_FLASH_COST);
  run.camFlashCooldownUntil = run.time + IR_FLASH_COOLDOWN;
  run.irFlash = 1.0;
  run.feedFaultUntil[cam] = 0;
  run.stats.camFlashes += 1;

  let effective = wasDisrupted;

  // Dazzle Lost Anton & cancel incoming video call!
  const anton = run.animatronics.anton;
  if (anton.room === cam) {
    if (run.antonVideo.deadline) {
      endAntonVideo(run, true);
    }
    anton.stunUntil = run.time + IR_STUN_SECONDS;
    anton.timer = Math.max(anton.timer, IR_STUN_SECONDS);
    effective = true;
  }

  // Calm Boss Hauke back by 1 curtain stage on CAM 1C if not yet sprinting!
  const hauke = run.animatronics.hauke;
  if (cam === '1C' && !hauke.sprint.active && hauke.stage >= 1 && hauke.stage < 3) {
    hauke.stage -= 1;
    hauke.lockTimer = 4.8;
    effective = true;
  }

  if (effective) {
    run.stats.camFlashHits += 1;
    if (run.stats.camFlashHits >= 3) grantAchievement(run, 'paparazzi_flash');
  }

  emit(run, 'ir_flash', { cam, effective });
  return true;
}
