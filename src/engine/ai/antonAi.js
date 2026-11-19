import { VIDEO_WARNING_SECONDS } from '../../config/constants.js';
import { ANTON_GRAPH } from '../../config/facility.js';
import { MEME_LINES } from '../../config/nights.js';
import {
  emit,
  endAntonVideo,
  feedIsInterrupted,
  noteRoomTransition,
  notify,
  pickLine,
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
  if (a.room === 'office') {
    a.officeTimer += dt;
    if (a.officeTimer >= 7) {
      triggerJumpscare(run, 'anton');
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
      noteRoomTransition(run, prev, a.room, 'anton');
      notify(run, 'PROBESCHICHT · Geräusch in der West-Ecke. Prüf CAM 2B.', 8);
      emit(run, 'footstep', { side: 'left', who: 'anton', loud: true });
    } else if (run.training === 'camera' && run.time >= 32) {
      run.training = 'door';
      a.room = 'left_door';
      a.timer = 9;
      a.sighted = false;
      noteRoomTransition(run, '2B', a.room, 'anton');
      notify(run, 'PROBEALARM · Monitor runter, Licht links prüfen, linke Tür schließen.', 9);
      emit(run, 'door_approach', { side: 'left' });
    }
    return;
  }

  a.timer -= dt;
  if (a.timer > 0) return;
  a.timer = 4.97;

  if (a.room === 'left_door') {
    if (run.training === 'door') {
      run.training = 'done';
      if (!run.leftDoor) run.power = Math.max(0, run.power - 3);
      else run.stats.antonBlocked += 1;
      a.room = '1B';
      noteRoomTransition(run, 'left_door', a.room, 'anton');
      notify(run, run.leftDoor
        ? 'ANTON · „Zutritt verweigert? Dann gibts nur ein Sternchen.“'
        : 'ANTON · „Nur kurz reingucken.“ Probealarm vorbei. −3 % Strom.', 6);
      emit(run, 'training_knock', { side: 'left' });
      return;
    }
    if (run.leftDoor) {
      a.room = '1B';
      a.sighted = false;
      run.stats.antonBlocked += 1;
      notify(run, pickLine(MEME_LINES.antonBlock, run.stats.antonBlocked - 1));
      noteRoomTransition(run, 'left_door', '1B', 'anton');
      emit(run, 'footstep', { side: 'left', who: 'anton' });
    } else {
      a.room = 'office';
      a.officeTimer = 0;
      run.leftJammed = true;
      run.leftLight = false;
      notify(run, 'SCHRITTE IM BÜRO · Anton ist durch die linke Tür.', 7);
      emit(run, 'sneak_in', { side: 'left', who: 'anton' });
    }
    return;
  }

  if (run.ai.anton <= 0 || Math.ceil(run.rng() * 20) > run.ai.anton) return;
  const choices = ANTON_GRAPH[a.room] ?? ['1B'];
  const next = choices[Math.floor(run.rng() * choices.length)];
  const prev = a.room;
  a.room = next;
  if (next === 'left_door') {
    a.sighted = false;
    emit(run, 'door_approach', { side: 'left' });
  }
  noteRoomTransition(run, prev, next, 'anton');
  emit(run, 'footstep', { side: 'left', who: 'anton', loud: next === 'left_door' || next === '2B' });
}
