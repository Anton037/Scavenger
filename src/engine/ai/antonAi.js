import { VIDEO_WARNING_SECONDS } from '../../config/constants.js';
import { ANTON_GRAPH } from '../../config/facility.js';
import {
  emit,
  endAntonVideo,
  feedIsInterrupted,
  grantAchievement,
  noteRoomTransition,
  triggerJumpscare,
} from '../runtime.js';

export function stepAntonVideo(run, dt) {
  const video = run.antonVideo;
  const anton = run.animatronics.anton;
  if ((anton.stunUntil ?? 0) > run.time) {
    endAntonVideo(run, false);
    return;
  }
  const eligible = run.monitorOpen && run.activeCam !== '6'
    && anton.room === run.activeCam
    && (run.ai.anton > 0 || run.training === 'camera');
  if (!eligible) {
    endAntonVideo(run, false);
    return;
  }
  if (video.deadline) {
    if (run.time >= video.deadline) triggerJumpscare(run, 'anton', 'video');
    return;
  }
  if (run.time < video.cooldownUntil || feedIsInterrupted(run)) return;
  if (video.cam !== run.activeCam) {
    video.cam = run.activeCam;
    video.watched = 0;
  }
  video.watched += dt;
  if (video.watched >= 4.2) {
    video.deadline = run.time + VIDEO_WARNING_SECONDS;
    emit(run, 'anton_video_warning');
  }
}

export function stepAnton(run, dt) {
  const a = run.animatronics.anton;

  // Office Breach -> Sweeping Phone Flashlight Under-Desk Inspection!
  if (a.room === 'office') {
    a.officeTimer = (a.officeTimer || 0) + dt;
    a.sweepPhase = (a.sweepPhase || 0) + dt * 1.55;
    a.stepSoundTimer = (a.stepSoundTimer ?? 0.45) - dt;
    if (a.stepSoundTimer <= 0) {
      a.stepSoundTimer = 1.05;
      emit(run, 'anton_sweep_step', { pan: Math.sin(a.sweepPhase) * 0.55 });
    }

    const grace = a.graceTimer ?? 2.2;
    if (grace > 0) {
      a.graceTimer = Math.max(0, grace - dt);
    } else {
      // Caught standing, on monitor too long, shining flashlight, or gasping out of breath!
      if (run.viewState !== 'under_desk' || run.flashlightOn || run.justGasped) {
        triggerJumpscare(run, 'anton', run.viewState === 'under_desk' ? 'under_desk' : 'office');
        return;
      }

      if (!run.holdingBreath) {
        a.unheldTimer = (a.unheldTimer || 0) + dt;
        if (a.unheldTimer >= 0.95) {
          triggerJumpscare(run, 'anton', 'under_desk');
          return;
        }
      } else {
        a.unheldTimer = Math.max(0, (a.unheldTimer || 0) - dt);
      }
    }

    a.inspectionTimer = (a.inspectionTimer ?? 5.4) - dt;
    if (a.inspectionTimer <= 0) {
      a.room = '1B';
      a.timer = 6.2;
      a.officeTimer = 0;
      a.sighted = false;
      run.leftJammed = false;
      run.stats.underDeskSurvived = (run.stats.underDeskSurvived || 0) + 1;
      grantAchievement(run, 'under_desk_ghost');
      noteRoomTransition(run, 'left_door', '1B', 'anton', false);
      emit(run, 'footstep', { side: 'left', who: 'anton', receding: true });
    }
    return;
  }

  if ((a.stunUntil ?? 0) > run.time) return;
  if (run.antonVideo.deadline) return;

  if (run.training !== 'done' && a.room !== 'left_door') {
    if (run.training === 'waiting' && run.time >= 20) {
      const prev = a.room;
      run.training = 'camera';
      a.room = '2B';
      a.subPose = 1;
      noteRoomTransition(run, prev, a.room, 'anton');
      emit(run, 'footstep', { side: 'left', who: 'anton', loud: true });
    } else if (run.training === 'camera' && run.time >= 32) {
      run.training = 'door';
      a.room = 'left_door';
      a.timer = 9;
      a.sighted = false;
      noteRoomTransition(run, '2B', a.room, 'anton');
      emit(run, 'door_approach', { side: 'left', who: 'anton' });
    }
    return;
  }

  a.timer -= dt;
  if (a.timer > 0) return;
  a.timer = 4.95;

  if (a.room === 'left_door') {
    if (run.training === 'door') {
      run.training = 'done';
      if (!run.leftDoor) run.power = Math.max(0, run.power - 3);
      else run.stats.antonBlocked += 1;
      a.room = '1B';
      noteRoomTransition(run, 'left_door', a.room, 'anton');
      emit(run, 'training_knock', { side: 'left' });
      return;
    }

    if (run.leftDoor) {
      a.room = '1B';
      a.sighted = false;
      run.stats.antonBlocked += 1;
      noteRoomTransition(run, 'left_door', '1B', 'anton');
      emit(run, 'footstep', { side: 'left', who: 'anton', receding: true });
    } else {
      // Slips into the booth -> Flicker lights & begin Under-Desk Inspection window!
      a.room = 'office';
      a.officeTimer = 0;
      a.graceTimer = run.monitorOpen ? 2.8 : 2.3;
      a.inspectionTimer = 5.4;
      a.unheldTimer = 0;
      a.sweepPhase = 0;
      a.stepSoundTimer = 0.35;
      run.leftJammed = true;
      run.leftLight = false;
      run.lightFlicker = 0.22;
      emit(run, 'office_breach', { side: 'left', who: 'anton' });
      emit(run, 'sneak_in', { side: 'left', who: 'anton' });
    }
    return;
  }

  if (run.ai.anton <= 0 || Math.ceil(run.rng() * 20) > run.ai.anton) return;
  const choices = ANTON_GRAPH[a.room] ?? ['1B'];
  const next = choices[Math.floor(run.rng() * choices.length)];
  const prev = a.room;
  a.room = next;
  a.subPose = run.rng() < 0.45 ? 1 : 0;
  if (next === 'left_door') {
    a.sighted = false;
    emit(run, 'door_approach', { side: 'left', who: 'anton' });
  }
  noteRoomTransition(run, prev, next, 'anton');
  emit(run, 'footstep', { side: 'left', who: 'anton', loud: next === 'left_door' || next === '2B' });
}
