import { TORGE_PATH } from '../../config/facility.js';
import { emit, feedIsInterrupted, noteRoomTransition, notify, triggerJumpscare } from '../runtime.js';

export function getTorgeCamStallSeconds(aiLevel) {
  return Math.max(0.85, 8.5 - (aiLevel || 0) * 0.35);
}

export function stepTorge(run, dt) {
  const f = run.animatronics.torge;
  if (f.room === 'office') {
    // Authentic FNaF 1 Freddy: once inside office, waits for monitor down or brief ambush delay in dark corner!
    const rate = run.monitorOpen ? 0.45 : 1.35;
    f.officeTimer -= dt * rate;
    if (f.officeTimer <= 0) {
      triggerJumpscare(run, 'torge');
    }
    return;
  }

  // Authentic FNaF 1 Freddy camera-look lock: watching his feed stalls him + leaves a post-look countdown!
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

  // Chef Torge gets agitated ("Küchen-Fieber") when office/fryer heat exceeds 70%!
  const heatSpeed = (run.thermal?.heat ?? 0) >= 70 ? 1.52 : 1.0;
  f.timer -= dt * heatSpeed;
  if (f.timer > 0) return;
  f.timer = 3.02;
  if (run.ai.torge <= 0) return;

  // Torge stays on Show Stage until Anton and Tom have left
  if (f.room === '1A' && (run.animatronics.anton.room === '1A' || run.animatronics.tom.room === '1A')) {
    return;
  }

  if (Math.ceil(run.rng() * 20) > run.ai.torge) return;

  // Authentic FNaF 1 CAM 4B East-Corner Ambush:
  // - If Right Door is CLOSED: Torge stays lurking at 4B (knocks/laughs in the dark, keeping pressure high!)
  // - If Right Door is OPEN: Torge ONLY slips into the Office when the player opens the Monitor on a camera OTHER than 4B!
  if (f.room === '4B') {
    if (run.rightDoor) {
      run.stats.torgeBlocked = (run.stats.torgeBlocked || 0) + 1;
      emit(run, 'door_knock', { side: 'right', who: 'torge' });
      emit(run, 'torge_laugh', { close: true, distance: 0 });
    } else if (run.monitorOpen && run.activeCam !== '4B') {
      f.room = 'office';
      f.officeTimer = 2.6 + run.rng() * 3.8;
      noteRoomTransition(run, '4B', 'office', 'torge');
      notify(run, 'TIEFES LACHEN IM BÜRO · Chef Torge ist unbemerkt reingeschlüpft!', 5, { audioCue: true });
      emit(run, 'torge_laugh', { close: true, distance: 0 });
    }
    return;
  }

  const prev = f.room;
  f.pathIdx = Math.min(TORGE_PATH.length - 1, f.pathIdx + 1);
  f.room = TORGE_PATH[f.pathIdx];
  noteRoomTransition(run, prev, f.room, 'torge');
  const dist = Math.max(0, (TORGE_PATH.length - 1) - f.pathIdx);
  emit(run, 'torge_laugh', { close: f.room === '4B' || f.room === '4A', distance: dist });
}
