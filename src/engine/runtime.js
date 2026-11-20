import { CHARACTERS } from '../config/characters.js';
import { CAMERA_MAP } from '../config/facility.js';
import { MEME_LINES } from '../config/nights.js';

export function randomFrom(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function emit(run, kind, extra = {}) {
  run.events.push({ kind, ...extra });
}

export function notify(run, text, seconds = 4.5, opts = {}) {
  run.notice = { text, until: run.time + seconds, audioCue: Boolean(opts.audioCue) };
}

export function pickLine(list, index) {
  if (!Array.isArray(list) || !list.length) return '';
  return list[Math.abs(index) % list.length];
}

export function grantAchievement(run, id) {
  if (!run || !id || run.unlockedThisRun.has(id)) return;
  run.unlockedThisRun.add(id);
  emit(run, 'achievement', { id });
}

export function feedIsInterrupted(run, cam = run?.activeCam) {
  if (!run || !cam) return false;
  return (run.feedFaultUntil[cam] ?? 0) > run.time;
}

export function hasMotionBlip(run, camId) {
  return (run?.motionBlips?.[camId] ?? 0) > (run?.time ?? 0);
}

export function noteRoomTransition(run, fromRoom, toRoom, who, disruptDestination = true) {
  if (CAMERA_MAP[fromRoom]) {
    run.feedFaultUntil[fromRoom] = run.time + 1.4;
    run.motionBlips[fromRoom] = run.time + 1.6;
  }
  if (disruptDestination && CAMERA_MAP[toRoom]) {
    run.feedFaultUntil[toRoom] = run.time + 1.4;
    run.motionBlips[toRoom] = run.time + 2.4;
  } else if (CAMERA_MAP[toRoom]) {
    run.motionBlips[toRoom] = run.time + 2.4;
  }
  if (run.monitorOpen && (run.activeCam === fromRoom || (disruptDestination && run.activeCam === toRoom))) {
    emit(run, 'cam_static_burst', { who });
  }
}

export function endAntonVideo(run, dodged = true) {
  const video = run.antonVideo;
  if (video.deadline && dodged) {
    run.stats.videoDodges += 1;
    notify(run, pickLine(MEME_LINES.videoDodge, run.stats.videoDodges - 1));
    if (run.stats.videoDodges >= 3) grantAchievement(run, 'ghosting');
    emit(run, 'anton_video_dodged');
  }
  if (video.deadline) video.cooldownUntil = run.time + 16;
  video.cam = null;
  video.watched = 0;
  video.deadline = 0;
}

export function triggerJumpscare(run, who, cause = 'office') {
  if (!run || run.state === 'jumpscare' || run.state === 'gameover' || run.state === 'won') return;
  run.state = 'jumpscare';
  run.killedBy = who;
  run.deathLine = cause === 'video'
    ? 'Anton hat den Videoanruf angenommen. Für euch beide.'
    : (CHARACTERS[who]?.deathLine ?? 'Die Schicht ist vorbei.');
  run.monitorOpen = false;
  run.monitorAnim = 0;
  run.leftLight = false;
  run.rightLight = false;
  run.goldenActive = false;
  run.quake = Math.max(run.quake, 1.3);
  run.jumpscare = { who, cause, cam: cause === 'video' ? run.activeCam : null, timer: 0, duration: 1.35 };
  emit(run, 'jumpscare', { who, cause });
}
