import { TORGE_PATH } from '../../config/facility.js';
import {
  emit,
  feedIsInterrupted,
  grantAchievement,
  noteRoomTransition,
  triggerJumpscare,
} from '../runtime.js';

export function getTorgeCamStallSeconds(aiLevel) {
  return Math.max(0.85, 8.5 - (aiLevel || 0) * 0.35);
}

export function stepTorge(run, dt) {
  const f = run.animatronics.torge;
  if (f.room === 'office') {
    const rate = run.monitorOpen ? 0.65 : 1.35;
    f.officeTimer -= dt * rate;
    if (f.officeTimer <= 0) {
      triggerJumpscare(run, 'torge', 'center');
    }
    return;
  }

  // Center Pass-Through Flashlight Repel (shutters CANNOT block the open service corridor!)
  const inCenterCorridor = f.room === 'center_far' || f.room === 'center_mid' || f.room === 'center_near';
  const centerBeamActive = inCenterCorridor
    && run.viewState === 'front'
    && !run.monitorOpen
    && !run.powerOutage
    && Boolean(run.flashlightOn)
    && Math.abs(run.lookX) <= 0.56;

  if (centerBeamActive) {
    if (!f.sighted && (f.room === 'center_mid' || f.room === 'center_near')) {
      f.sighted = true;
      run.stingFlash = Math.max(run.stingFlash || 0, 0.48);
      emit(run, 'danger_stinger', { who: 'torge', side: 'center' });
    }
    f.flashExposure = (f.flashExposure || 0) + dt;
    const needed = f.room === 'center_far' ? 0.9 : 0.72;
    if (f.flashExposure >= needed) {
      const retreatIdx = f.room === 'center_near' ? 3 : 2; // 'center_far' or '6'
      const prev = f.room;
      f.pathIdx = retreatIdx;
      f.room = TORGE_PATH[retreatIdx];
      f.flashExposure = 0;
      f.sighted = false;
      f.timer = 4.5;
      run.stats.torgeRepelled = (run.stats.torgeRepelled || 0) + 1;
      if ((run.stats.camFlashHits || 0) + run.stats.torgeRepelled >= 3) {
        grantAchievement(run, 'paparazzi_flash');
      }
      noteRoomTransition(run, prev, f.room, 'torge', false);
      emit(run, 'torge_repelled');
      return;
    }
    return;
  }
  f.flashExposure = Math.max(0, (f.flashExposure || 0) - dt * 0.6);

  // Camera-look stall on CCTV feeds (1A, 1B, or legacy 4B)
  if (run.monitorOpen && run.activeCam === f.room && !feedIsInterrupted(run, f.room)) {
    f.stallTimer = Math.max(f.stallTimer ?? 0, getTorgeCamStallSeconds(run.ai.torge));
    f.timer = Math.max(f.timer, 1.2);
    run.stats.torgeStalled += 1;
    return;
  }

  if ((f.stallTimer ?? 0) > 0) {
    f.stallTimer = Math.max(0, f.stallTimer - dt);
    return;
  }

  // Agitation when fryer heat >= 70%, order quota lags behind hourly pace, or in 6:00 AM Overtime!
  const expectedDone = Math.floor(((run.hour || 0) / 6) * (run.orders?.quota ?? 0));
  const quotaLag = (run.orders?.completed ?? 0) < expectedDone;
  let speedMult = 1.0;
  if ((run.thermal?.heat ?? 0) >= 70) speedMult *= 1.48;
  if (quotaLag) speedMult *= 1.32;
  if (run.overtime) speedMult *= 1.55;

  f.timer -= dt * speedMult;
  if (f.timer > 0) return;
  f.timer = 3.08;
  if (run.ai.torge <= 0) return;

  // Torge waits in 1A until Anton or Tom has started moving
  if (f.room === '1A' && run.animatronics.anton.room === '1A' && run.animatronics.tom.room === '1A') {
    return;
  }

  if (Math.ceil(run.rng() * 20) > run.ai.torge) return;

  // Legacy 4B support if explicitly placed in 4B
  if (f.room === '4B') {
    if (run.rightDoor) {
      run.stats.torgeBlocked = (run.stats.torgeBlocked || 0) + 1;
      emit(run, 'door_knock', { side: 'right', who: 'torge' });
      emit(run, 'torge_laugh', { close: true, distance: 0 });
    } else if (run.monitorOpen && run.activeCam !== '4B') {
      f.room = 'office';
      f.officeTimer = 2.0 + run.rng() * 1.8;
      noteRoomTransition(run, '4B', 'office', 'torge');
      emit(run, 'torge_laugh', { close: true, distance: 0 });
    }
    return;
  }

  // Unblockable Center Pass-Through breach from center_near!
  if (f.room === 'center_near') {
    f.room = 'office';
    f.officeTimer = 1.35 + run.rng() * 1.1;
    emit(run, 'torge_laugh', { close: true, distance: 0 });
    return;
  }

  const prev = f.room;
  f.pathIdx = Math.min(TORGE_PATH.length - 1, f.pathIdx + 1);
  f.room = TORGE_PATH[f.pathIdx];
  f.sighted = false;
  noteRoomTransition(run, prev, f.room, 'torge');
  const dist = Math.max(0, (TORGE_PATH.length - 1) - f.pathIdx);
  emit(run, 'torge_laugh', { close: dist <= 1, distance: dist });
}
