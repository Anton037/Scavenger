import { TOM_GRAPH } from '../../config/facility.js';
import {
  emit,
  grantAchievement,
  noteRoomTransition,
  triggerJumpscare,
} from '../runtime.js';

export function stepTom(run, dt) {
  const t = run.animatronics.tom;

  // Office Breach -> Under-Desk Scavenging Sweep!
  if (t.room === 'office') {
    t.officeTimer = (t.officeTimer || 0) + dt;
    t.sweepPhase = (t.sweepPhase || 0) + dt * 1.7;
    t.stepSoundTimer = (t.stepSoundTimer ?? 0.5) - dt;
    if (t.stepSoundTimer <= 0) {
      t.stepSoundTimer = 1.1;
      emit(run, 'footstep', { side: 'right', who: 'tom', loud: true });
    }

    const grace = t.graceTimer ?? 2.1;
    if (grace > 0) {
      t.graceTimer = Math.max(0, grace - dt);
    } else {
      if (run.viewState !== 'under_desk' || run.flashlightOn || run.justGasped) {
        triggerJumpscare(run, 'tom', run.viewState === 'under_desk' ? 'under_desk' : 'office');
        return;
      }

      if (!run.holdingBreath) {
        t.unheldTimer = (t.unheldTimer || 0) + dt;
        if (t.unheldTimer >= 0.95) {
          triggerJumpscare(run, 'tom', 'under_desk');
          return;
        }
      } else {
        t.unheldTimer = Math.max(0, (t.unheldTimer || 0) - dt);
      }
    }

    t.inspectionTimer = (t.inspectionTimer ?? 5.0) - dt;
    if (t.inspectionTimer <= 0) {
      t.room = '1B';
      t.timer = 6.0;
      t.officeTimer = 0;
      t.sighted = false;
      run.rightJammed = false;
      run.stats.underDeskSurvived = (run.stats.underDeskSurvived || 0) + 1;
      grantAchievement(run, 'under_desk_ghost');
      emit(run, 'footstep', { side: 'right', who: 'tom', receding: true });
    }
    return;
  }

  // Back Pickup Hatch Flashlight Repel (180° Back Wall!)
  if (t.room === 'back_hatch') {
    const hatchLit = run.viewState === 'back'
      && !run.monitorOpen
      && !run.powerOutage
      && Boolean(run.flashlightOn)
      && run.lookX >= -0.25;
    if (hatchLit) {
      if (!t.sighted) {
        t.sighted = true;
        run.stingFlash = Math.max(run.stingFlash || 0, 0.44);
        emit(run, 'danger_stinger', { who: 'tom', side: 'right', rear: true });
      }
      t.hatchFlash = (t.hatchFlash || 0) + dt;
      if (t.hatchFlash >= 0.65) {
        t.room = '1B';
        t.hatchFlash = 0;
        t.sighted = false;
        t.timer = 6.2;
        run.stats.tomBlocked += 1;
        noteRoomTransition(run, '6', '1B', 'tom', false);
        emit(run, 'tom_repelled', { side: 'right', rear: true });
        return;
      }
      return;
    }
    t.hatchFlash = Math.max(0, (t.hatchFlash || 0) - dt * 0.5);
  }

  // Acoustic Risk/Reward: noisy prep equipment & unbagged fries accelerate Tom!
  const noiseAccel = 1 + (run.roomNoise || 0) * 1.18 + (run.orders?.active?.fryerState === 'ready' ? 0.35 : 0);
  t.timer -= dt * noiseAccel;
  if (t.timer > 0) return;
  t.timer = 4.95;

  if (t.room === 'right_door') {
    if (run.rightDoor) {
      t.room = run.rng() < 0.6 ? '1B' : '4A';
      t.sighted = false;
      run.stats.tomBlocked += 1;
      noteRoomTransition(run, 'right_door', t.room, 'tom');
      emit(run, 'footstep', { side: 'right', who: 'tom', receding: true });
    } else {
      t.room = 'office';
      t.officeTimer = 0;
      t.graceTimer = run.monitorOpen ? 2.6 : 2.1;
      t.inspectionTimer = 5.0;
      t.unheldTimer = 0;
      t.sweepPhase = 0;
      t.stepSoundTimer = 0.4;
      run.rightJammed = true;
      run.rightLight = false;
      run.lightFlicker = 0.24;
      emit(run, 'office_breach', { side: 'right', who: 'tom' });
      emit(run, 'sneak_in', { side: 'right', who: 'tom' });
    }
    return;
  }

  if (t.room === 'back_hatch') {
    t.room = 'office';
    t.officeTimer = 0;
    t.graceTimer = 2.2;
    t.inspectionTimer = 5.0;
    t.unheldTimer = 0;
    t.sweepPhase = 0;
    run.lightFlicker = 0.24;
    emit(run, 'office_breach', { side: 'right', who: 'tom', rear: true });
    return;
  }

  if (run.ai.tom <= 0 || Math.ceil(run.rng() * 20) > run.ai.tom) return;
  const choices = TOM_GRAPH[t.room] ?? ['1B'];
  // Favor back_hatch when player is making prep noise on the Back Station
  let next = choices[Math.floor(run.rng() * choices.length)];
  if (choices.includes('back_hatch') && (run.roomNoise > 0.25 || run.orders?.active?.fryerState === 'ready') && run.rng() < 0.72) {
    next = 'back_hatch';
  }
  const prev = t.room;
  t.room = next;
  t.subPose = run.rng() < 0.45 ? 1 : 0;
  if (next === 'right_door') {
    t.sighted = false;
    emit(run, 'door_approach', { side: 'right', who: 'tom' });
  } else if (next === 'back_hatch') {
    t.sighted = false;
    t.timer = 6.2;
    emit(run, 'hatch_clink', { side: 'right', who: 'tom', rear: true });
  }
  noteRoomTransition(run, prev, next, 'tom');
  emit(run, 'footstep', { side: 'right', who: 'tom', loud: next === 'right_door' || next === '4B' || next === 'back_hatch', rear: next === 'back_hatch' });
}
