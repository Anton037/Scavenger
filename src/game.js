import {
  CAMERA_MAP,
  CHARACTERS,
  HALLUCINATIONS,
  HOUR_SECONDS,
  NIGHT_CONFIGS,
  PHONE_CALLS,
  TOTAL_NIGHT_SECONDS,
} from './fnafData.js';

export const STEP = 1 / 60;
export { HOUR_SECONDS, TOTAL_NIGHT_SECONDS };

export function randomFrom(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function emit(run, kind, extra = {}) {
  run.events.push({ kind, ...extra });
}

const ANTON_GRAPH = {
  '1A': ['1B', '5'],
  '1B': ['5', '2A'],
  '5': ['1B', '2A'],
  '2A': ['3', '2B'],
  '3': ['2A', 'left_door'],
  '2B': ['3', 'left_door'],
};

const TOM_GRAPH = {
  '1A': ['1B'],
  '1B': ['6', '4A'],
  '6': ['1B', '4A'],
  '4A': ['1B', '4B'],
  '4B': ['4A', 'right_door'],
};

const TORGE_PATH = ['1A', '1B', '6', '4A', '4B'];

export function isEasterEgg1987(ai) {
  return Boolean(ai && ai.torge === 1 && ai.anton === 9 && ai.tom === 8 && ai.hauke === 7);
}

export function getUsageBars(run) {
  if (!run || run.powerOutage) return 0;
  let bars = 1;
  if (run.leftDoor) bars += 1;
  if (run.rightDoor) bars += 1;
  if (run.leftLight || run.rightLight) bars += 1;
  if (run.monitorOpen) bars += 1;
  return Math.min(5, bars);
}

export function getHourLabel(run) {
  const hr = Math.min(6, Math.floor((run?.time ?? 0) / HOUR_SECONDS));
  return hr === 0 ? '12 AM' : `${hr} AM`;
}

export function newNight(options = {}) {
  const night = clamp(Math.floor(Number(options.night) || 1), 1, 7);
  const cfg = NIGHT_CONFIGS[night] ?? NIGHT_CONFIGS[1];
  const seed = Number.isFinite(Number(options.seed)) ? Math.floor(Number(options.seed)) : (Date.now() & 0xfffffff);
  const rng = randomFrom(seed * 31 + night * 97 + 13);

  const customAi = options.customAi && night === 7
    ? {
        torge: clamp(Math.floor(Number(options.customAi.torge) || 0), 0, 20),
        anton: clamp(Math.floor(Number(options.customAi.anton) || 0), 0, 20),
        tom: clamp(Math.floor(Number(options.customAi.tom) || 0), 0, 20),
        hauke: clamp(Math.floor(Number(options.customAi.hauke) || 0), 0, 20),
      }
    : null;

  const ai = customAi ? { ...customAi } : { ...cfg.ai };

  const run = {
    seed,
    night,
    nightTitle: cfg.title,
    nightSub: cfg.sub,
    customAi,
    rng,
    state: 'playing', // 'playing' | 'jumpscare' | 'gameover' | 'won'
    time: 0,
    hour: 0,
    appliedBumps: new Set(),

    // Power & office hardware
    power: 100,
    passiveDrain: cfg.passiveDrain,
    usage: 1,
    leftDoor: false,
    rightDoor: false,
    leftDoorAnim: 0, // 0 open .. 1 closed
    rightDoorAnim: 0,
    leftLight: false,
    rightLight: false,
    leftJammed: false,
    rightJammed: false,
    lightFlicker: 1,

    // View & CCTV monitor
    lookX: 0, // -1 (left door) .. +1 (right door)
    monitorOpen: false,
    monitorAnim: 0, // 0 down .. 1 up
    activeCam: '1A',
    camPan: 0,
    camSwitchStatic: 0,
    camDisrupt: 0,
    officeAttackWait: 0,

    // Power Outage (FNAF 1 3-phase sequence)
    powerOutage: null, // null | { phase: 'wait'|'jingle'|'blackout', timer, eyesOn }

    // Animatronics
    ai,
    animatronics: {
      torge: { room: '1A', pathIdx: 0, timer: 3.02, officeTimer: 0, sighted: false },
      anton: { room: '1A', timer: 4.97, officeTimer: 0, sighted: false },
      tom: { room: '1A', timer: 4.98, officeTimer: 0, sighted: false },
      hauke: {
        stage: 0, // 0 closed, 1 peeking, 2 stepping out, 3 GONE -> sprinting!
        timer: 5.01,
        lockTimer: 0,
        hits: 0,
        sprint: {
          active: false,
          triggered: false,
          waitTimer: 0,
          progress: 0,
          duration: 2.35,
          nextStomp: 0,
        },
      },
    },

    // Secret Golden Duck (Golden Freddy)
    goldenPoster: false,
    goldenUsed: false,
    goldenActive: false,
    goldenTimer: 0,

    // Sensory feedback & FNAF atmosphere
    quake: 0,
    quakeTime: 0,
    doorSlamFlash: 0,
    stingFlash: 0,
    hallucination: null, // { text, timer }
    kitchenAudioTimer: 2.2,
    ambienceTimer: 9.0,
    posterHonks: 0,
    posterBounce: 0,

    // Phone Guy
    callLines: PHONE_CALLS[night] ? PHONE_CALLS[night].map((l) => ({ ...l })) : [],
    callMuted: false,
    callIndex: -1,
    callText: '',
    callActive: Boolean(PHONE_CALLS[night]?.length),

    // Jumpscare & end state
    jumpscare: null, // null | { who, timer, duration }
    killedBy: null,
    deathLine: '',

    // Stats & event stream for audio/haptics
    stats: {
      doorsClosed: 0,
      camSwitches: 0,
      haukeBlocked: 0,
      antonBlocked: 0,
      tomBlocked: 0,
      torgeStalled: 0,
      goldenBanished: 0,
      posterHonks: 0,
    },
    events: [],
  };

  if (customAi && isEasterEgg1987(customAi)) {
    triggerJumpscare(run, 'duck');
  }

  return run;
}

export function triggerJumpscare(run, who) {
  if (!run || run.state === 'jumpscare' || run.state === 'gameover' || run.state === 'won') return;
  run.state = 'jumpscare';
  run.killedBy = who;
  run.deathLine = CHARACTERS[who]?.deathLine ?? 'Die Schicht ist vorbei.';
  run.monitorOpen = false;
  run.monitorAnim = 0;
  run.leftLight = false;
  run.rightLight = false;
  run.goldenActive = false;
  run.quake = Math.max(run.quake, 1.3);
  run.jumpscare = { who, timer: 0, duration: 1.35 };
  emit(run, 'jumpscare', { who });
}

export function toggleLeftDoor(run) {
  if (!run || run.state !== 'playing' || run.powerOutage || run.monitorOpen) return false;
  if (run.leftJammed) {
    emit(run, 'jammed', { side: 'left' });
    return false;
  }
  run.leftDoor = !run.leftDoor;
  if (run.leftDoor) run.stats.doorsClosed += 1;
  emit(run, 'door', { side: 'left', closed: run.leftDoor });
  return true;
}

export function toggleRightDoor(run) {
  if (!run || run.state !== 'playing' || run.powerOutage || run.monitorOpen) return false;
  if (run.rightJammed) {
    emit(run, 'jammed', { side: 'right' });
    return false;
  }
  run.rightDoor = !run.rightDoor;
  if (run.rightDoor) run.stats.doorsClosed += 1;
  emit(run, 'door', { side: 'right', closed: run.rightDoor });
  return true;
}

export function toggleLeftLight(run) {
  if (!run || run.state !== 'playing' || run.powerOutage || run.monitorOpen) return false;
  if (run.leftJammed) {
    emit(run, 'jammed', { side: 'left' });
    return false;
  }
  run.leftLight = !run.leftLight;
  if (run.leftLight) {
    run.rightLight = false;
    emit(run, 'light', { side: 'left', on: true });
    if (run.animatronics.anton.room === 'left_door' && !run.animatronics.anton.sighted) {
      run.animatronics.anton.sighted = true;
      run.stingFlash = 0.55;
      emit(run, 'window_sting', { who: 'anton', side: 'left' });
    }
  } else {
    emit(run, 'light', { side: 'left', on: false });
  }
  return true;
}

export function toggleRightLight(run) {
  if (!run || run.state !== 'playing' || run.powerOutage || run.monitorOpen) return false;
  if (run.rightJammed) {
    emit(run, 'jammed', { side: 'right' });
    return false;
  }
  run.rightLight = !run.rightLight;
  if (run.rightLight) {
    run.leftLight = false;
    emit(run, 'light', { side: 'right', on: true });
    if (run.animatronics.tom.room === 'right_door' && !run.animatronics.tom.sighted) {
      run.animatronics.tom.sighted = true;
      run.stingFlash = 0.55;
      emit(run, 'window_sting', { who: 'tom', side: 'right' });
    }
  } else {
    emit(run, 'light', { side: 'right', on: false });
  }
  return true;
}

export function toggleMonitor(run) {
  if (!run || run.state !== 'playing' || run.powerOutage) return false;
  run.monitorOpen = !run.monitorOpen;
  if (run.monitorOpen) {
    run.leftLight = false;
    run.rightLight = false;
    run.camSwitchStatic = 0.28;
    emit(run, 'monitor_open');

    // Banish Golden Duck immediately when flipping monitor back up!
    if (run.goldenActive) {
      run.goldenActive = false;
      run.goldenPoster = false;
      run.goldenTimer = 0;
      run.stats.goldenBanished += 1;
      emit(run, 'cam_blip');
    }

    onCameraViewed(run, run.activeCam);
  } else {
    emit(run, 'monitor_close');
    // Closing monitor locks Hauke for a short authentic FNAF 1 grace window
    run.animatronics.hauke.lockTimer = 1.1 + run.rng() * 4.4;

    // If Golden Duck poster was seen on CAM 2B, summon it into the Office!
    if (run.goldenPoster && !run.goldenActive) {
      run.goldenActive = true;
      run.goldenTimer = 3.8;
      run.hallucination = { text: 'ES BIN ICH', timer: 0.9 };
      emit(run, 'duck_giggle');
    }

    // If Anton or Tom already slipped into the office, jumpscare the moment monitor drops!
    if (run.animatronics.anton.room === 'office') {
      triggerJumpscare(run, 'anton');
      return true;
    }
    if (run.animatronics.tom.room === 'office') {
      triggerJumpscare(run, 'tom');
      return true;
    }
  }
  return true;
}

function onCameraViewed(run, camId) {
  // Viewing CAM 2A while Hauke is in stage 3 immediately triggers his Earthquake Sprint!
  const sprint = run.animatronics.hauke.sprint;
  if (camId === '2A' && sprint.active && !sprint.triggered) {
    startHaukeCharge(run);
  }
  // Rare Golden Duck poster hallucination on CAM 2B (Night 2+)
  if (camId === '2B' && run.night >= 2 && !run.goldenUsed && !run.goldenPoster && run.rng() < 0.03) {
    run.goldenPoster = true;
    run.goldenUsed = true;
    emit(run, 'duck_giggle');
  }
}

export function selectCam(run, camId) {
  if (!run || run.state !== 'playing' || run.powerOutage || !run.monitorOpen) return false;
  if (!CAMERA_MAP[camId]) return false;
  if (run.activeCam !== camId) {
    run.activeCam = camId;
    run.camSwitchStatic = 0.24;
    run.stats.camSwitches += 1;
    emit(run, 'cam_blip', { cam: camId });
    onCameraViewed(run, camId);
  }
  return true;
}

export function honkPoster(run) {
  if (!run || run.state !== 'playing' || run.monitorOpen || run.powerOutage) return false;
  run.posterHonks += 1;
  run.stats.posterHonks += 1;
  run.posterBounce = 0.3;
  emit(run, 'honk');
  return true;
}

export function muteCall(run) {
  if (!run || run.callMuted) return false;
  run.callMuted = true;
  run.callActive = false;
  run.callText = '';
  emit(run, 'cam_blip');
  return true;
}

function noteRoomTransition(run, fromRoom, toRoom, who) {
  if (run.monitorOpen && (run.activeCam === fromRoom || run.activeCam === toRoom)) {
    run.camDisrupt = 2.25;
    emit(run, 'cam_static_burst', { who });
  }
}

function startHaukeCharge(run) {
  const sprint = run.animatronics.hauke.sprint;
  if (sprint.triggered) return;
  sprint.triggered = true;
  sprint.progress = 0;
  sprint.duration = 2.35;
  sprint.nextStomp = 0.05;
  run.quake = Math.max(run.quake, 0.42);
  emit(run, 'hauke_charge_start');
}

function stepAnton(run, dt) {
  const a = run.animatronics.anton;
  if (a.room === 'office') {
    a.officeTimer += dt;
    if (a.officeTimer > 12.5 && !run.monitorOpen) {
      triggerJumpscare(run, 'anton');
    }
    return;
  }
  a.timer -= dt;
  if (a.timer > 0) return;
  a.timer = 4.97;
  if (run.ai.anton <= 0) return;
  if (Math.ceil(run.rng() * 20) > run.ai.anton) return;

  if (a.room === 'left_door') {
    if (run.leftDoor) {
      // Blocked! Retreats to Dining Area
      a.room = '1B';
      a.sighted = false;
      run.stats.antonBlocked += 1;
      noteRoomTransition(run, 'left_door', '1B', 'anton');
      emit(run, 'footstep', { side: 'left', who: 'anton' });
    } else {
      // Slipped into office! Jams left controls and waits for monitor close
      a.room = 'office';
      a.officeTimer = 0;
      run.leftJammed = true;
      run.leftLight = false;
      emit(run, 'sneak_in', { side: 'left', who: 'anton' });
    }
    return;
  }

  const choices = ANTON_GRAPH[a.room] ?? ['1B'];
  const next = choices[Math.floor(run.rng() * choices.length)];
  const prev = a.room;
  a.room = next;
  if (next === 'left_door') a.sighted = false;
  noteRoomTransition(run, prev, next, 'anton');
  emit(run, 'footstep', { side: 'left', who: 'anton', loud: next === 'left_door' || next === '2B' });
}

function stepTom(run, dt) {
  const t = run.animatronics.tom;
  if (t.room === 'office') {
    t.officeTimer += dt;
    if (t.officeTimer > 12.5 && !run.monitorOpen) {
      triggerJumpscare(run, 'tom');
    }
    return;
  }
  t.timer -= dt;
  if (t.timer > 0) return;
  t.timer = 4.98;
  if (run.ai.tom <= 0) return;
  if (Math.ceil(run.rng() * 20) > run.ai.tom) return;

  if (t.room === 'right_door') {
    if (run.rightDoor) {
      t.room = run.rng() < 0.6 ? '1B' : '4A';
      t.sighted = false;
      run.stats.tomBlocked += 1;
      noteRoomTransition(run, 'right_door', t.room, 'tom');
      emit(run, 'footstep', { side: 'right', who: 'tom' });
    } else {
      t.room = 'office';
      t.officeTimer = 0;
      run.rightJammed = true;
      run.rightLight = false;
      emit(run, 'sneak_in', { side: 'right', who: 'tom' });
    }
    return;
  }

  const choices = TOM_GRAPH[t.room] ?? ['1B'];
  const next = choices[Math.floor(run.rng() * choices.length)];
  const prev = t.room;
  t.room = next;
  if (next === 'right_door') t.sighted = false;
  noteRoomTransition(run, prev, next, 'tom');
  emit(run, 'footstep', { side: 'right', who: 'tom', loud: next === 'right_door' || next === '4B' });
}

function stepHauke(run, dt) {
  const h = run.animatronics.hauke;
  const sprint = h.sprint;

  if (sprint.active) {
    if (!sprint.triggered) {
      sprint.waitTimer -= dt;
      // Subtle ominous distant rumble while Hauke is missing from 1C!
      run.quake = Math.max(run.quake, 0.08 + 0.04 * Math.sin(run.time * 9));
      if (sprint.waitTimer <= 0) {
        startHaukeCharge(run);
      }
      return;
    }

    // EARTHQUAKE SPRINT DOWN WEST HALL!!
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
        // COLOSSAL EARTHQUAKE DOOR SLAM!
        const drain = 1 + h.hits * 5;
        h.hits += 1;
        run.power = Math.max(0, run.power - drain);
        run.quake = 1.45;
        run.doorSlamFlash = 0.5;
        run.stats.haukeBlocked += 1;
        h.stage = run.rng() < 0.5 ? 0 : 1;
        h.lockTimer = 3.2;
        noteRoomTransition(run, '2A', '1C', 'hauke');
        emit(run, 'hauke_door_slam', { drain, hits: h.hits });
      } else {
        triggerJumpscare(run, 'hauke');
      }
    }
    return;
  }

  if (h.lockTimer > 0 && !run.monitorOpen) {
    h.lockTimer = Math.max(0, h.lockTimer - dt);
  }

  h.timer -= dt;
  if (h.timer > 0) return;
  h.timer = 5.01;
  if (run.ai.hauke <= 0) return;

  // Authentic FNAF 1 Foxy camera lock: any open camera OR recent camera close blocks Hauke!
  if (run.monitorOpen || h.lockTimer > 0) return;
  if (Math.ceil(run.rng() * 20) > run.ai.hauke) return;

  h.stage += 1;
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

function stepTorge(run, dt) {
  const f = run.animatronics.torge;
  if (f.room === 'office') {
    f.officeTimer -= dt;
    if (f.officeTimer <= 0 && !run.monitorOpen) {
      triggerJumpscare(run, 'torge');
    }
    return;
  }

  f.timer -= dt;
  if (f.timer > 0) return;
  f.timer = 3.02;
  if (run.ai.torge <= 0) return;

  // Freddy stays on Show Stage until Anton and Tom have left
  if (f.room === '1A' && (run.animatronics.anton.room === '1A' || run.animatronics.tom.room === '1A')) {
    return;
  }

  // Authentic FNAF 1 Freddy camera stall
  if (run.monitorOpen && run.activeCam === f.room) {
    run.stats.torgeStalled += 1;
    return;
  }

  if (Math.ceil(run.rng() * 20) > run.ai.torge) return;

  if (f.room === '4B') {
    if (run.rightDoor) {
      // Blocked by right door — backs off to 4A!
      f.room = '4A';
      f.pathIdx = 3;
      noteRoomTransition(run, '4B', '4A', 'torge');
      emit(run, 'torge_laugh', { close: true });
    } else if (!run.monitorOpen || run.activeCam !== '4B') {
      // Slipped into office!
      f.room = 'office';
      f.officeTimer = 3.2 + run.rng() * 5.2;
      noteRoomTransition(run, '4B', 'office', 'torge');
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

function stepPowerOutage(run, dt) {
  const out = run.powerOutage;
  out.timer -= dt;
  if (out.phase === 'jingle') {
    out.eyesOn = Math.sin(run.time * 17) > -0.25 && Math.sin(run.time * 5.3) > -0.65;
  } else {
    out.eyesOn = false;
  }

  if (out.timer <= 0) {
    if (out.phase === 'wait') {
      out.phase = 'jingle';
      out.timer = 6.5 + run.rng() * 4.5;
      emit(run, 'torge_jingle_start');
    } else if (out.phase === 'jingle') {
      out.phase = 'blackout';
      out.timer = 2.6 + run.rng() * 3.4;
      emit(run, 'torge_jingle_stop');
    } else {
      triggerJumpscare(run, 'torge');
    }
  }
}

function stepPhoneCall(run) {
  if (run.callMuted || !run.callLines.length || run.powerOutage) {
    run.callText = '';
    run.callActive = false;
    return;
  }
  let foundIdx = -1;
  let activeLine = null;
  for (let i = 0; i < run.callLines.length; i++) {
    const line = run.callLines[i];
    if (run.time >= line.at && run.time <= line.at + line.dur) {
      foundIdx = i;
      activeLine = line;
      break;
    }
  }
  const lastEnd = run.callLines[run.callLines.length - 1].at + run.callLines[run.callLines.length - 1].dur;
  run.callActive = run.time <= lastEnd + 0.5;
  if (foundIdx !== -1 && foundIdx !== run.callIndex) {
    run.callIndex = foundIdx;
    emit(run, foundIdx === 0 ? 'phone_ring' : 'phone_line', { night: run.night });
  }
  run.callText = activeLine ? activeLine.text : '';
}

export function advance(run, input = {}, dt = STEP) {
  run.events.length = 0;

  if (run.state === 'jumpscare') {
    run.jumpscare.timer += dt;
    run.quake = Math.max(0.85, run.quake);
    run.quakeTime += dt;
    if (run.jumpscare.timer >= run.jumpscare.duration) {
      run.state = 'gameover';
      emit(run, 'gameover_static');
    }
    return run;
  }
  if (run.state !== 'playing') return run;

  // Smooth office pan
  if (!run.monitorOpen && typeof input.lookDelta === 'number' && input.lookDelta !== 0) {
    run.lookX = clamp(run.lookX + input.lookDelta * dt, -1, 1);
  }
  if (typeof input.lookTarget === 'number') {
    run.lookX = clamp(run.lookX + (clamp(input.lookTarget, -1, 1) - run.lookX) * Math.min(1, dt * 10), -1, 1);
  }

  // Smooth animations
  const doorSpeed = 6.2;
  run.leftDoorAnim += ((run.leftDoor ? 1 : 0) - run.leftDoorAnim) * Math.min(1, dt * doorSpeed * 2);
  run.rightDoorAnim += ((run.rightDoor ? 1 : 0) - run.rightDoorAnim) * Math.min(1, dt * doorSpeed * 2);
  run.monitorAnim += ((run.monitorOpen ? 1 : 0) - run.monitorAnim) * Math.min(1, dt * 12);
  run.camPan = Math.sin(run.time * 0.42);

  // Decay visual timers
  run.camSwitchStatic = Math.max(0, run.camSwitchStatic - dt);
  run.camDisrupt = Math.max(0, run.camDisrupt - dt);
  run.doorSlamFlash = Math.max(0, run.doorSlamFlash - dt);
  run.stingFlash = Math.max(0, run.stingFlash - dt);
  run.posterBounce = Math.max(0, run.posterBounce - dt);
  run.quake = Math.max(0, run.quake - dt * 1.45);
  run.quakeTime += dt;
  if (run.hallucination) {
    run.hallucination.timer -= dt;
    if (run.hallucination.timer <= 0) run.hallucination = null;
  }

  // Authentic fluorescent light micro-flicker
  run.lightFlicker = run.rng() < 0.045 ? (0.45 + run.rng() * 0.45) : 1.0;

  // Advance Night Clock
  run.time += dt;
  const newHour = Math.floor(run.time / HOUR_SECONDS);
  if (newHour > run.hour) {
    run.hour = newHour;
    if (run.hour >= 6) {
      run.state = 'won';
      run.monitorOpen = false;
      run.powerOutage = null;
      emit(run, 'win_6am');
      return run;
    }
    emit(run, 'hour_tick', { hour: run.hour });
    const bumps = NIGHT_CONFIGS[run.night]?.hourlyBumps?.[run.hour];
    if (bumps && !run.appliedBumps.has(run.hour)) {
      run.appliedBumps.add(run.hour);
      for (const [k, delta] of Object.entries(bumps)) {
        run.ai[k] = clamp((run.ai[k] || 0) + delta, 0, 20);
      }
    }
  }

  stepPhoneCall(run);

  // Power Outage branch
  if (run.powerOutage) {
    stepPowerOutage(run, dt);
    return run;
  }

  // Battery Drain
  run.usage = getUsageBars(run);
  const drainPerSec = 0.098 * run.usage + run.passiveDrain;
  run.power = Math.max(0, run.power - drainPerSec * dt);
  if (run.power <= 0) {
    run.power = 0;
    run.usage = 0;
    run.leftDoor = false;
    run.rightDoor = false;
    run.leftLight = false;
    run.rightLight = false;
    run.monitorOpen = false;
    run.goldenActive = false;
    run.callText = '';
    run.callActive = false;
    run.powerOutage = {
      phase: 'wait',
      timer: 3.5 + run.rng() * 3.8,
      eyesOn: false,
    };
    emit(run, 'power_out');
    return run;
  }

  // Golden Duck countdown in Office
  if (run.goldenActive) {
    run.goldenTimer -= dt;
    if (run.rng() < 0.08) {
      run.hallucination = {
        text: HALLUCINATIONS[Math.floor(run.rng() * HALLUCINATIONS.length)],
        timer: 0.16,
      };
    }
    if (run.goldenTimer <= 0) {
      triggerJumpscare(run, 'duck');
      return run;
    }
  }

  // Kitchen Audio-Only clatter when Tom or Torge is in CAM 6!
  const tomInKitchen = run.animatronics.tom.room === '6';
  const torgeInKitchen = run.animatronics.torge.room === '6';
  if (tomInKitchen || torgeInKitchen) {
    run.kitchenAudioTimer -= dt;
    if (run.kitchenAudioTimer <= 0) {
      run.kitchenAudioTimer = 1.9 + run.rng() * 2.2;
      const watchingKitchen = run.monitorOpen && run.activeCam === '6';
      emit(run, tomInKitchen ? 'kitchen_clatter' : 'torge_jingle_distant', { loud: watchingKitchen });
    }
  }

  // Rare eerie ambience & subliminal hallucination flash
  run.ambienceTimer -= dt;
  if (run.ambienceTimer <= 0) {
    run.ambienceTimer = 11 + run.rng() * 14;
    const nearDoor = run.animatronics.anton.room === 'left_door'
      || run.animatronics.tom.room === 'right_door'
      || run.animatronics.torge.room === '4B';
    emit(run, 'ambience', { tense: nearDoor });
    if (nearDoor && run.rng() < 0.22 && !run.hallucination) {
      run.hallucination = {
        text: HALLUCINATIONS[Math.floor(run.rng() * HALLUCINATIONS.length)],
        timer: 0.22,
      };
    }
  }

  // Animatronic AI Steps
  stepAnton(run, dt);
  if (run.state !== 'playing') return run;
  stepTom(run, dt);
  if (run.state !== 'playing') return run;
  stepHauke(run, dt);
  if (run.state !== 'playing') return run;
  stepTorge(run, dt);

  return run;
}

export function getRoomOccupants(run, camId) {
  const list = [];
  if (!run?.animatronics) return list;
  if (run.animatronics.torge.room === camId) list.push('torge');
  if (run.animatronics.anton.room === camId) list.push('anton');
  if (run.animatronics.tom.room === camId) list.push('tom');
  if (camId === '1C') list.push(`hauke_${run.animatronics.hauke.stage}`);
  if (camId === '2A' && run.animatronics.hauke.sprint.active && run.animatronics.hauke.sprint.triggered) {
    list.push('hauke_sprint');
  }
  return list;
}
