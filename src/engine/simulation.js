import {
  BASE_IDLE_DRAIN,
  EXTRA_BAR_DRAIN,
  FUSE_RESET_COST,
  HOUR_SECONDS,
  KITCHEN_BELL_COOLDOWN,
  KITCHEN_BELL_COST,
  SPEZI_BOOST_SECONDS,
  SPEZI_CHARGES,
  STEP,
  TOTAL_NIGHT_SECONDS,
} from '../config/constants.js';
import { CAMERA_MAP } from '../config/facility.js';
import {
  HALLUCINATIONS,
  MEME_LINES,
  NIGHT_CONFIGS,
  PHONE_CALLS,
  SHIFT_MODIFIER_MAP,
} from '../config/nights.js';
import { computeShiftRank } from '../storage/saveSystem.js';
import { stepAnton, stepAntonVideo } from './ai/antonAi.js';
import { pulseHaukeCameraCheck, startHaukeCharge, stepHauke } from './ai/haukeAi.js';
import { stepTom } from './ai/tomAi.js';
import { getTorgeCamStallSeconds, stepTorge } from './ai/torgeAi.js';
import {
  clamp,
  emit,
  endAntonVideo,
  feedIsInterrupted,
  grantAchievement,
  hasMotionBlip,
  noteRoomTransition,
  notify,
  pickLine,
  randomFrom,
  triggerJumpscare,
} from './runtime.js';
import { triggerCamFlash } from './systems/camPulseSystem.js';
import { createOrderState, isOrderExpress, stampOrderBon, stepOrderSystem } from './systems/orderSystem.js';
import {
  createThermalState,
  getTemperatureCelsius,
  isVentingSteam,
  stepThermalSystem,
  triggerSteamBurst,
  ventOfficeSteam,
} from './systems/thermalSystem.js';

export {
  clamp,
  feedIsInterrupted,
  FUSE_RESET_COST,
  getTemperatureCelsius,
  hasMotionBlip,
  HOUR_SECONDS,
  isOrderExpress,
  isVentingSteam,
  KITCHEN_BELL_COST,
  randomFrom,
  stampOrderBon,
  STEP,
  TOTAL_NIGHT_SECONDS,
  triggerCamFlash,
  triggerJumpscare,
  triggerSteamBurst,
  ventOfficeSteam,
};

export function isSpeziBoosted(run) {
  return Boolean(run && (run.speziBoostUntil ?? 0) > (run.time ?? 0));
}

export function getFormattedShiftTime(run) {
  const totalSec = clamp(run?.time ?? 0, 0, TOTAL_NIGHT_SECONDS);
  const progressHours = totalSec / HOUR_SECONDS;
  const h = Math.min(6, Math.floor(progressHours));
  const m = h >= 6 ? 0 : Math.floor((progressHours - h) * 60);
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${hh}:${mm}`;
}

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

  const modifiers = Array.isArray(options.modifiers)
    ? [...new Set(options.modifiers.filter((m) => Boolean(SHIFT_MODIFIER_MAP[m])))]
    : [];

  const customAi = options.customAi && night === 7
    ? {
        torge: clamp(Math.floor(Number(options.customAi.torge) || 0), 0, 20),
        anton: clamp(Math.floor(Number(options.customAi.anton) || 0), 0, 20),
        tom: clamp(Math.floor(Number(options.customAi.tom) || 0), 0, 20),
        hauke: clamp(Math.floor(Number(options.customAi.hauke) || 0), 0, 20),
      }
    : null;

  const ai = customAi ? { ...customAi } : { ...cfg.ai };
  const startPower = modifiers.includes('rusty_gen') ? 75 : 100;

  const run = {
    seed,
    night,
    nightCfg: cfg,
    nightTitle: cfg.title,
    nightSub: cfg.sub,
    customAi,
    modifiers,
    rng,
    state: 'playing', // 'playing' | 'jumpscare' | 'gameover' | 'won'
    time: 0,
    hour: 0,
    appliedBumps: new Set(),
    unlockedThisRun: new Set(),

    // Power & office hardware
    power: startPower,
    passiveDrain: cfg.passiveDrain,
    usage: 1,
    leftDoor: false,
    rightDoor: false,
    leftDoorAnim: 0,
    rightDoorAnim: 0,
    leftDoorBounce: 0,
    rightDoorBounce: 0,
    leftLight: false,
    rightLight: false,
    leftJammed: false,
    rightJammed: false,
    lightFlicker: 1,

    // Smooth View & CCTV monitor
    lookX: 0,
    lookSmooth: 0,
    lookVel: 0,
    monitorOpen: false,
    monitorAnim: 0,
    monitorFlash: 0,
    activeCam: '1A',
    camPan: 0,
    camSwitchStatic: 0,
    camFlashCooldownUntil: 0,
    irFlash: 0,
    feedFaultUntil: {},
    motionBlips: {},
    antonVideo: { cam: null, watched: 0, deadline: 0, cooldownUntil: 0 },
    cameraFuseUntil: 0,
    kitchenBellUntil: 0,
    training: night === 1 ? 'waiting' : 'done',
    notice: null,

    // Fangame Mechanical Subsystems
    thermal: createThermalState(cfg, modifiers),
    orders: createOrderState(cfg, modifiers, rng),
    speziCharges: SPEZI_CHARGES,
    speziBoostUntil: 0,

    // Power Outage (FNAF 1 3-phase sequence)
    powerOutage: null,

    // Animatronics
    ai,
    animatronics: {
      torge: { room: '1A', pathIdx: 0, timer: 3.02, stallTimer: 0, officeTimer: 0, sighted: false },
      anton: { room: '1A', timer: 4.97, officeTimer: 0, sighted: false, stunUntil: 0, subPose: 0, doorWait: 0 },
      tom: { room: '1A', timer: 4.98, officeTimer: 0, sighted: false, subPose: 0 },
      hauke: {
        stage: 0,
        curtainAnim: 0,
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

    // Secret Golden Duck & Rare Hallucinations
    goldenPoster: false,
    goldenUsed: false,
    goldenActive: false,
    goldenTimer: 0,
    cam5Stare: false,

    // Sensory feedback & atmosphere
    quake: 0,
    quakeTime: 0,
    seismicLevel: 0,
    doorSlamFlash: 0,
    stingFlash: 0,
    hallucination: null,
    kitchenAudioTimer: 2.2,
    kitchenNoisePulse: 0,
    officeBreathTimer: 2.8,
    haukeHumTimer: 11.0,
    ambienceTimer: 9.0,
    calliopeTimer: 28.0,
    posterHonks: 0,
    posterBounce: 0,
    speziSips: 0,
    speziBounce: 0,
    duckSqueaks: 0,
    duckBounce: 0,

    // Phone Guy
    callLines: PHONE_CALLS[night] ? PHONE_CALLS[night].map((l) => ({ ...l })) : [],
    callMuted: false,
    callIndex: -1,
    callText: '',
    callActive: Boolean(PHONE_CALLS[night]?.length),

    // Jumpscare & end state
    jumpscare: null,
    killedBy: null,
    deathLine: '',

    // Stats & event stream
    stats: {
      doorsClosed: 0,
      camSwitches: 0,
      haukeBlocked: 0,
      antonBlocked: 0,
      tomBlocked: 0,
      torgeBlocked: 0,
      torgeStalled: 0,
      goldenBanished: 0,
      posterHonks: 0,
      videoDodges: 0,
      tomLured: 0,
      fusesReset: 0,
      steamVents: 0,
      steamBursts: 0,
      steamHits: 0,
      overheats: 0,
      bonsStamped: 0,
      expressBons: 0,
      bonsMissed: 0,
      tipsEarned: 0,
      camFlashes: 0,
      camFlashHits: 0,
      speziBoosts: 0,
    },
    events: [],
  };

  if (customAi && isEasterEgg1987(customAi)) {
    grantAchievement(run, 'code_1987');
    triggerJumpscare(run, 'duck', 'code');
  }

  return run;
}

export function toggleLeftDoor(run) {
  if (!run || run.state !== 'playing' || run.powerOutage || run.monitorOpen) return false;
  if (run.leftJammed) {
    emit(run, 'jammed', { side: 'left' });
    return false;
  }
  run.leftDoor = !run.leftDoor;
  if (run.leftDoor) {
    run.stats.doorsClosed += 1;
    run.leftDoorBounce = 1.0;
    run.quake = Math.max(run.quake, 0.14);
  }
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
  if (run.rightDoor) {
    run.stats.doorsClosed += 1;
    run.rightDoorBounce = 1.0;
    run.quake = Math.max(run.quake, 0.14);
  }
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
    } else if (run.animatronics.torge.room === '4B' && !run.animatronics.torge.sighted && run.rng() < 0.35) {
      run.animatronics.torge.sighted = true;
      emit(run, 'torge_laugh', { close: true, distance: 0 });
    }
  } else {
    emit(run, 'light', { side: 'right', on: false });
  }
  return true;
}

function onCameraViewed(run, camId) {
  pulseHaukeCameraCheck(run, camId);
  if (run.animatronics.torge.room === camId && !feedIsInterrupted(run, camId)) {
    run.animatronics.torge.stallTimer = Math.max(
      run.animatronics.torge.stallTimer ?? 0,
      getTorgeCamStallSeconds(run.ai.torge),
    );
  }
  const sprint = run.animatronics.hauke.sprint;
  if (camId === '2A' && sprint.active && !sprint.triggered) {
    startHaukeCharge(run);
  }
  if (camId === '5') {
    run.cam5Stare = run.rng() < 0.16;
  }
  if (camId === '2B' && run.night >= 2 && !run.goldenUsed && !run.goldenPoster && run.rng() < 0.035) {
    run.goldenPoster = true;
    run.goldenUsed = true;
    emit(run, 'duck_giggle');
  }
}

export function toggleMonitor(run) {
  if (!run || run.state !== 'playing' || run.powerOutage || run.cameraFuseUntil > run.time) return false;
  run.monitorOpen = !run.monitorOpen;
  run.monitorFlash = 1.0;
  if (run.monitorOpen) {
    run.leftLight = false;
    run.rightLight = false;
    run.camSwitchStatic = 0.28;
    emit(run, 'monitor_open');

    if (run.goldenActive) {
      run.goldenActive = false;
      run.goldenPoster = false;
      run.goldenTimer = 0;
      run.stats.goldenBanished += 1;
      grantAchievement(run, 'duck_banish');
      emit(run, 'cam_blip');
    }

    onCameraViewed(run, run.activeCam);
  } else {
    pulseHaukeCameraCheck(run, null);
    emit(run, 'monitor_close');
    endAntonVideo(run);

    if (run.goldenPoster && !run.goldenActive) {
      run.goldenActive = true;
      run.goldenTimer = 3.8;
      run.hallucination = { text: 'ES BIN ICH', timer: 0.9 };
      emit(run, 'duck_giggle');
    }

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

export function selectCam(run, camId) {
  if (!run || run.state !== 'playing' || run.powerOutage || !run.monitorOpen) return false;
  if (!CAMERA_MAP[camId]) return false;
  if (run.activeCam !== camId) {
    endAntonVideo(run);
    run.activeCam = camId;
    run.camSwitchStatic = 0.24;
    run.stats.camSwitches += 1;
    emit(run, 'cam_blip', { cam: camId });
    onCameraViewed(run, camId);
  }
  return true;
}

export function resetCameraFuse(run) {
  if (!run || run.state !== 'playing' || run.powerOutage || run.monitorOpen
      || run.cameraFuseUntil <= run.time || run.power <= FUSE_RESET_COST) return false;
  run.power -= FUSE_RESET_COST;
  run.cameraFuseUntil = 0;
  run.stats.fusesReset += 1;
  notify(run, 'Kameras wieder da. Elektriker rechnet nach Einsatz ab.');
  emit(run, 'fuse_reset');
  return true;
}

export function ringKitchenBell(run) {
  if (!run || run.state !== 'playing' || !run.monitorOpen || run.activeCam !== '6'
      || feedIsInterrupted(run) || run.kitchenBellUntil > run.time || run.power <= KITCHEN_BELL_COST) return false;
  if (KITCHEN_BELL_COST > 0) run.power = Math.max(0, run.power - KITCHEN_BELL_COST);
  run.kitchenBellUntil = run.time + KITCHEN_BELL_COOLDOWN;
  emit(run, 'kitchen_bell');
  const tom = run.animatronics.tom;
  const torge = run.animatronics.torge;
  let luredAny = false;

  if (tom.room === '4A' || tom.room === '4B' || tom.room === 'right_door') {
    noteRoomTransition(run, tom.room, '6', 'tom', false);
    tom.room = '6';
    tom.timer = 9.5;
    run.kitchenAudioTimer = 0.55;
    run.stats.tomLured += 1;
    if (run.stats.tomLured >= 2) grantAchievement(run, 'spezi_bait');
    notify(run, pickLine(MEME_LINES.tomLure, run.stats.tomLured - 1));
    luredAny = true;
  }
  if (torge.room === '6') {
    torge.timer = Math.max(torge.timer, 6.5);
    run.kitchenAudioTimer = 0.55;
    if (!luredAny) {
      notify(run, 'BON #404 · Chef Torge prüft misstrauisch die Durchreiche in CAM 6!');
      luredAny = true;
    }
  }
  if (!luredAny) {
    notify(run, 'BON #404 · „Gratis-Spezi an der Ausgabe!“ Keine Reaktion im Ost-Flur.');
  }
  return true;
}

export function honkPoster(run) {
  if (!run || run.state !== 'playing' || run.monitorOpen || run.powerOutage) return false;
  run.posterHonks += 1;
  run.stats.posterHonks += 1;
  run.posterBounce = 0.34;
  if (run.posterHonks === 3 && (run.notice?.until ?? 0) <= run.time) {
    notify(run, 'HAUSORDNUNG · Drei Hupen gelten als schriftliche Beschwerde.');
  } else if (run.posterHonks === 7) {
    notify(run, 'CHEF TORGE · „Drück noch einmal meine Nase und es gibt keinen Personal-Döner!“', 5.5);
  } else if (run.posterHonks === 10) {
    notify(run, 'ABMAHNUNG #01 · Zehn Hupen! Personalabteilung ist informiert.', 5.5);
    grantAchievement(run, 'honk_rebel');
  }
  emit(run, 'honk');
  return true;
}

export function sipSpezi(run) {
  if (!run || run.state !== 'playing' || run.monitorOpen || run.powerOutage) return false;
  if ((run.speziCharges ?? 0) <= 0) {
    run.speziBounce = 0.22;
    notify(run, 'SPEZI LEER · Dose komplett ausgetrunken! Kein Koffein-Kick mehr übrig.', 3.2);
    emit(run, 'spezi_empty');
    return true;
  }

  run.speziCharges -= 1;
  run.speziSips += 1;
  run.stats.speziBoosts = (run.stats.speziBoosts || 0) + 1;
  run.speziBounce = 0.42;
  run.speziBoostUntil = run.time + SPEZI_BOOST_SECONDS;
  run.quake *= 0.35;

  // Risk/Reward: cracking open a fizzy Spezi can tempts Schnorrer Tom if he is roaming!
  const tom = run.animatronics.tom;
  if (run.ai.tom > 0 && tom.room !== 'office' && tom.room !== 'right_door') {
    tom.timer = Math.min(tom.timer, 1.85);
  }

  notify(run, pickLine(MEME_LINES.speziSip, run.speziSips - 1), 4.2);
  emit(run, 'spezi_sip', { remaining: run.speziCharges });
  return true;
}

export function squeakDuck(run) {
  if (!run || run.state !== 'playing' || run.monitorOpen || run.powerOutage) return false;
  run.duckSqueaks += 1;
  run.duckBounce = 0.38;
  if (run.duckSqueaks === 1 || run.duckSqueaks % 4 === 0) {
    notify(run, pickLine(MEME_LINES.duckSqueak, run.duckSqueaks - 1), 3.6);
  }
  emit(run, 'duck_squeak');
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
      triggerJumpscare(run, 'torge', 'blackout');
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
    emit(run, foundIdx === 0 ? 'phone_ring' : 'phone_line', { night: run.night, text: activeLine.text });
  }
  run.callText = activeLine ? activeLine.text : '';
}

function checkWinAchievements(run) {
  if (run.night === 1) grantAchievement(run, 'first_bon');
  if (run.night === 5) grantAchievement(run, 'stammkraft');
  if (run.night === 6) grantAchievement(run, 'overtime');
  const is420 = run.night === 7
    && run.customAi
    && run.customAi.torge >= 20
    && run.customAi.anton >= 20
    && run.customAi.tom >= 20
    && run.customAi.hauke >= 20;
  if (is420) grantAchievement(run, 'legend_420');
  if (Math.ceil(run.power) >= 35) grantAchievement(run, 'power_saver');
  if ((run.modifiers?.length ?? 0) >= 2) grantAchievement(run, 'mutator_pro');
  if ((is420 && (run.modifiers?.length ?? 0) >= 1) || computeShiftRank(run).grade === 'S++') {
    grantAchievement(run, 'chef_god');
  }
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

  const boosted = isSpeziBoosted(run);
  const servoMult = boosted ? 1.48 : 1.0;

  // Smooth office pan + velocity-damped visual smoothing
  const prevLookX = run.lookX;
  if (!run.monitorOpen && typeof input.lookDelta === 'number' && input.lookDelta !== 0) {
    run.lookX = clamp(run.lookX + input.lookDelta * servoMult * dt, -1, 1);
  }
  if (typeof input.lookTarget === 'number') {
    run.lookX = clamp(run.lookX + (clamp(input.lookTarget, -1, 1) - run.lookX) * Math.min(1, dt * 10 * servoMult), -1, 1);
  }
  const smoothFactor = 1 - Math.exp(-dt * (boosted ? 20 : 15));
  const nextSmooth = run.lookSmooth + (run.lookX - run.lookSmooth) * smoothFactor;
  run.lookVel = clamp((nextSmooth - run.lookSmooth) / Math.max(0.001, dt), -4, 4);
  run.lookSmooth = nextSmooth;
  if (Math.abs(run.lookX - prevLookX) < 1e-5 && Math.abs(run.lookX - run.lookSmooth) < 1e-4) {
    run.lookSmooth = run.lookX;
    run.lookVel *= 0.8;
  }

  // Smooth mechanical animations
  const doorSpeed = 6.8 * servoMult;
  run.leftDoorAnim += ((run.leftDoor ? 1 : 0) - run.leftDoorAnim) * Math.min(1, dt * doorSpeed * 2);
  run.rightDoorAnim += ((run.rightDoor ? 1 : 0) - run.rightDoorAnim) * Math.min(1, dt * doorSpeed * 2);
  run.leftDoorBounce = Math.max(0, run.leftDoorBounce - dt * 4.5);
  run.rightDoorBounce = Math.max(0, run.rightDoorBounce - dt * 4.5);
  run.monitorAnim += ((run.monitorOpen ? 1 : 0) - run.monitorAnim) * Math.min(1, dt * 14 * servoMult);
  run.monitorFlash = Math.max(0, run.monitorFlash - dt * 5.2);
  run.irFlash = Math.max(0, (run.irFlash || 0) - dt * 3.8);
  run.camPan = Math.sin(run.time * 0.42);

  // Smooth Hauke curtain opening
  const targetCurtain = [0, 0.38, 0.78, 1.18][run.animatronics.hauke.stage] ?? 0;
  run.animatronics.hauke.curtainAnim += (targetCurtain - run.animatronics.hauke.curtainAnim) * Math.min(1, dt * 6.5);

  // Decay visual timers
  run.camSwitchStatic = Math.max(0, run.camSwitchStatic - dt);
  run.doorSlamFlash = Math.max(0, run.doorSlamFlash - dt);
  run.stingFlash = Math.max(0, run.stingFlash - dt);
  run.posterBounce = Math.max(0, run.posterBounce - dt);
  run.speziBounce = Math.max(0, run.speziBounce - dt);
  run.duckBounce = Math.max(0, run.duckBounce - dt);
  run.kitchenNoisePulse = Math.max(0, run.kitchenNoisePulse - dt * 1.15);
  run.quake = Math.max(0, run.quake - dt * (boosted ? 2.1 : 1.45));
  run.quakeTime += dt;

  // Live seismograph indicator
  const h = run.animatronics.hauke;
  const targetSeismic = h.sprint.triggered
    ? 1.0
    : h.sprint.active
      ? 0.72
      : h.stage === 2
        ? 0.48
        : Math.min(1, run.quake * 0.9);
  run.seismicLevel += (targetSeismic - run.seismicLevel) * Math.min(1, dt * 7);

  if (run.hallucination) {
    run.hallucination.timer -= dt;
    if (run.hallucination.timer <= 0) run.hallucination = null;
  }

  // Fluorescent light micro-flicker (stronger with Nebel-Schicht modifier)
  const flickerChance = run.modifiers?.includes('midnight_fog') ? 0.095 : 0.045;
  run.lightFlicker = run.rng() < flickerChance ? (0.42 + run.rng() * 0.48) : 1.0;

  // Advance Night Clock
  run.time += dt;
  const newHour = Math.floor(run.time / HOUR_SECONDS);
  if (newHour > run.hour) {
    run.hour = newHour;
    if (run.hour >= 6) {
      run.state = 'won';
      run.monitorOpen = false;
      run.powerOutage = null;
      checkWinAchievements(run);
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

  if (run.powerOutage) {
    stepPowerOutage(run, dt);
    return run;
  }

  // Authentic FNaF 1 Battery Drain
  run.usage = getUsageBars(run);
  const boostRelief = boosted ? -0.032 : 0;
  const drainPerSec = Math.max(0.05, BASE_IDLE_DRAIN + (run.usage - 1) * EXTRA_BAR_DRAIN + run.passiveDrain + boostRelief);
  run.power = Math.max(0, run.power - drainPerSec * dt);
  if (run.power <= 0) {
    run.power = 0;
    run.usage = 0;
    run.leftDoor = false;
    run.rightDoor = false;
    run.leftLight = false;
    run.rightLight = false;
    run.monitorOpen = false;
    endAntonVideo(run, false);
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

  // Mechanical Subsystems (Thermal/Steam & Order Printer)
  stepThermalSystem(run, dt);
  stepOrderSystem(run, dt);

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
      triggerJumpscare(run, 'duck', 'hallucination');
      return run;
    }
  }

  // Kitchen Audio-Only clatter when Tom or Torge is in CAM 6
  const tomInKitchen = run.animatronics.tom.room === '6';
  const torgeInKitchen = run.animatronics.torge.room === '6';
  if (tomInKitchen || torgeInKitchen) {
    run.kitchenAudioTimer -= dt;
    if (run.kitchenAudioTimer <= 0) {
      run.kitchenAudioTimer = 1.9 + run.rng() * 2.2;
      run.kitchenNoisePulse = 1.0;
      const watchingKitchen = run.monitorOpen && run.activeCam === '6';
      emit(run, tomInKitchen ? 'kitchen_clatter' : 'torge_jingle_distant', { loud: watchingKitchen });
    }
  }

  // Eerie office breathing & monitor glitch when Anton or Tom already slipped inside while monitor is up
  const antonIn = run.animatronics.anton.room === 'office';
  const tomIn = run.animatronics.tom.room === 'office';
  if ((antonIn || tomIn) && run.monitorOpen) {
    run.officeBreathTimer -= dt;
    if (run.officeBreathTimer <= 0) {
      run.officeBreathTimer = 2.6 + run.rng() * 1.9;
      run.camSwitchStatic = Math.max(run.camSwitchStatic, 0.12);
      emit(run, 'office_breath', { side: antonIn ? 'left' : 'right' });
    }
  }

  // Hauke's creepy muffled hum in Buffet-Bucht (CAM 1C)
  if (run.ai.hauke > 0 && run.animatronics.hauke.stage < 3) {
    run.haukeHumTimer -= dt;
    if (run.haukeHumTimer <= 0) {
      run.haukeHumTimer = 14 + run.rng() * 12;
      emit(run, 'hauke_hum', { loud: run.monitorOpen && run.activeCam === '1C' });
    }
  }

  // Rare FNaF-1 style distant midnight carnival/radio calliope drift on Night 2+
  if (run.night >= 2) {
    run.calliopeTimer -= dt;
    if (run.calliopeTimer <= 0) {
      run.calliopeTimer = 42 + run.rng() * 38;
      if (run.rng() < 0.45) emit(run, 'distant_calliope');
    }
  }

  // Eerie ambience & subliminal hallucination flash
  run.ambienceTimer -= dt;
  if (run.ambienceTimer <= 0) {
    run.ambienceTimer = 11 + run.rng() * 14;
    const nearDoor = run.animatronics.anton.room === 'left_door'
      || run.animatronics.tom.room === 'right_door'
      || run.animatronics.torge.room === '4B';
    emit(run, 'ambience', { tense: nearDoor, cam: run.monitorOpen ? run.activeCam : undefined });
    if (nearDoor && run.rng() < 0.22 && !run.hallucination) {
      run.hallucination = {
        text: HALLUCINATIONS[Math.floor(run.rng() * HALLUCINATIONS.length)],
        timer: 0.22,
      };
    }
  }

  // Animatronic AI Steps
  stepAntonVideo(run, dt);
  if (run.state !== 'playing') return run;
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
