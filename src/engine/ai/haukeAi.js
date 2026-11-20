import {
  emit,
  endAntonVideo,
  feedIsInterrupted,
  grantAchievement,
  noteRoomTransition,
  triggerJumpscare,
} from '../runtime.js';

export function pulseHaukeCameraCheck(run, camId = run?.activeCam) {
  if (!run?.animatronics?.hauke) return;
  const h = run.animatronics.hauke;
  if (h.sprint.active) return;
  const bonus = camId === '1C' ? 3.6 : (1.55 + run.rng() * 1.45);
  h.lockTimer = Math.max(h.lockTimer, bonus);
}

export function startHaukeCharge(run) {
  const sprint = run.animatronics.hauke.sprint;
  if (sprint.triggered) return;
  sprint.triggered = true;
  sprint.progress = 0;
  sprint.duration = 2.35;
  sprint.nextStomp = 0.05;
  run.quake = Math.max(run.quake, 0.42);
  run.motionBlips['2A'] = run.time + 3.0;
  emit(run, 'hauke_charge_start');
}

export function stepHauke(run, dt) {
  const h = run.animatronics.hauke;
  const sprint = h.sprint;

  if (sprint.active) {
    if (!sprint.triggered) {
      sprint.waitTimer -= dt;
      run.quake = Math.max(run.quake, 0.08 + 0.04 * Math.sin(run.time * 9));
      if (sprint.waitTimer <= 0) {
        startHaukeCharge(run);
      }
      return;
    }

    sprint.progress += dt / sprint.duration;
    const seismic = 0.35 + Math.min(1, sprint.progress) * 0.72;
    run.quake = Math.max(run.quake, seismic);
    sprint.nextStomp -= dt;
    if (sprint.nextStomp <= 0) {
      sprint.nextStomp = 0.25;
      emit(run, 'hauke_stomp', { intensity: seismic, onCam: run.monitorOpen && run.activeCam === '2A' });
    }

    if (sprint.progress >= 1) {
      sprint.active = false;
      sprint.triggered = false;
      sprint.progress = 0;
      if (run.leftDoor) {
        const drain = 1 + h.hits * 4;
        h.hits += 1;
        run.power = Math.max(0, run.power - drain);
        run.quake = 1.45;
        run.doorSlamFlash = 0.5;
        run.leftDoorBounce = 1.4;
        run.stats.haukeBlocked += 1;
        if (run.stats.haukeBlocked >= 3) grantAchievement(run, 'quake_pro');
        h.stage = run.rng() < 0.5 ? 0 : 1;
        h.lockTimer = 3.2;
        noteRoomTransition(run, '2A', '1C', 'hauke');
        emit(run, 'hauke_door_slam', { drain, hits: h.hits, side: 'left' });

        // Trips the Physical Main Breaker on the Back Wall!
        run.monitorOpen = false;
        run.monitorAnim = 0;
        run.leftLight = false;
        run.rightLight = false;
        run.flashlightOn = false;
        endAntonVideo(run, false);
        run.breakerTripped = true;
        run.cameraFuseUntil = run.time + 9;
        emit(run, 'breaker_trip', { rear: true });
        emit(run, 'fuse_trip');
      } else {
        triggerJumpscare(run, 'hauke', 'rush');
      }
    }
    return;
  }

  if (run.monitorOpen && run.activeCam === '1C' && !feedIsInterrupted(run)) {
    h.lockTimer = 3.6;
  } else {
    h.lockTimer = Math.max(0, h.lockTimer - dt);
  }

  h.timer -= dt;
  if (h.timer > 0) return;
  h.timer = 5.01;
  if (run.ai.hauke <= 0) return;

  if (h.lockTimer > 0) return;
  if (Math.ceil(run.rng() * 20) > run.ai.hauke) return;

  h.stage += 1;
  run.motionBlips['1C'] = run.time + 2.2;
  if (h.stage >= 3) {
    h.stage = 3;
    sprint.active = true;
    sprint.triggered = false;
    sprint.waitTimer = Math.max(4.5, 9.0 - run.ai.hauke * 0.18);
    sprint.progress = 0;
    emit(run, 'hauke_curtain_open');
  } else {
    emit(run, 'footstep', { side: 'left', who: 'hauke', loud: false });
  }
}
