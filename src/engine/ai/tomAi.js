import { TOM_GRAPH } from '../../config/facility.js';
import { MEME_LINES } from '../../config/nights.js';
import {
  emit,
  noteRoomTransition,
  notify,
  pickLine,
  triggerJumpscare,
} from '../runtime.js';

export function stepTom(run, dt) {
  const t = run.animatronics.tom;
  if (t.room === 'office') {
    t.officeTimer += dt;
    if (t.officeTimer >= 7) {
      triggerJumpscare(run, 'tom');
    }
    return;
  }
  t.timer -= dt;
  if (t.timer > 0) return;
  t.timer = 4.98;

  if (t.room === 'right_door') {
    if (run.rightDoor) {
      t.room = run.rng() < 0.6 ? '1B' : '4A';
      t.sighted = false;
      run.stats.tomBlocked += 1;
      notify(run, pickLine(MEME_LINES.tomBlock, run.stats.tomBlocked - 1));
      noteRoomTransition(run, 'right_door', t.room, 'tom');
      emit(run, 'footstep', { side: 'right', who: 'tom' });
    } else {
      t.room = 'office';
      t.officeTimer = 0;
      run.rightJammed = true;
      run.rightLight = false;
      notify(run, 'SCHLEIFEN IM BÜRO · Tom ist durch die rechte Tür.', 7);
      emit(run, 'sneak_in', { side: 'right', who: 'tom' });
    }
    return;
  }

  if (run.ai.tom <= 0 || Math.ceil(run.rng() * 20) > run.ai.tom) return;
  const choices = TOM_GRAPH[t.room] ?? ['1B'];
  const next = choices[Math.floor(run.rng() * choices.length)];
  const prev = t.room;
  t.room = next;
  if (next === 'right_door') {
    t.sighted = false;
    emit(run, 'door_approach', { side: 'right' });
  }
  noteRoomTransition(run, prev, next, 'tom');
  emit(run, 'footstep', { side: 'right', who: 'tom', loud: next === 'right_door' || next === '4B' });
}
