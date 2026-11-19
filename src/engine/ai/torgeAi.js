import { TORGE_PATH } from '../../config/facility.js';
import { emit, noteRoomTransition, notify, triggerJumpscare } from '../runtime.js';

export function stepTorge(run, dt) {
  const f = run.animatronics.torge;
  if (f.room === 'office') {
    f.officeTimer -= dt;
    if (f.officeTimer <= 0) {
      triggerJumpscare(run, 'torge');
    }
    return;
  }

  // Chef Torge gets agitated ("Küchen-Fieber") when office/fryer heat exceeds 70%!
  const heatSpeed = (run.thermal?.heat ?? 0) >= 70 ? 1.48 : 1.0;
  f.timer -= dt * heatSpeed;
  if (f.timer > 0) return;
  f.timer = 3.02;
  if (run.ai.torge <= 0) return;

  // Torge stays on Show Stage until Anton and Tom have left
  if (f.room === '1A' && (run.animatronics.anton.room === '1A' || run.animatronics.tom.room === '1A')) {
    return;
  }

  // Authentic FNAF 1 camera stall
  if (run.monitorOpen && run.activeCam === f.room) {
    run.stats.torgeStalled += 1;
    return;
  }

  if (Math.ceil(run.rng() * 20) > run.ai.torge) return;

  if (f.room === '4B') {
    if (run.rightDoor) {
      f.room = '4A';
      f.pathIdx = 3;
      noteRoomTransition(run, '4B', '4A', 'torge');
      emit(run, 'torge_laugh', { close: true });
    } else if (!run.monitorOpen || run.activeCam !== '4B') {
      f.room = 'office';
      f.officeTimer = 3.2 + run.rng() * 5.2;
      noteRoomTransition(run, '4B', 'office', 'torge');
      notify(run, 'LACHEN IM BÜRO · Torge ist durch die rechte Tür.', 5);
      emit(run, 'torge_laugh', { close: true });
    }
    return;
  }

  const prev = f.room;
  f.pathIdx = Math.min(TORGE_PATH.length - 1, f.pathIdx + 1);
  f.room = TORGE_PATH[f.pathIdx];
  noteRoomTransition(run, prev, f.room, 'torge');
  emit(run, 'torge_laugh', { close: f.room === '4B' || f.room === '4A' });
}
