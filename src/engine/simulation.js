import {
  BASE_IDLE_DRAIN,
  BREATH_DRAIN_RATE,
  BREATH_MAX,
  BREATH_RECOVER_RATE,
  DUCK_DURATION,
  EXTRA_BAR_DRAIN,
  FLASHLIGHT_DRAIN_RATE,
  FLASHLIGHT_RECHARGE_RATE,
  FUSE_RESET_COST,
  HOUR_SECONDS,
  KITCHEN_BELL_COOLDOWN,
  KITCHEN_BELL_COST,
  SPEZI_BOOST_SECONDS,
  SPEZI_CHARGES,
  STEAM_BURST_MIN_HEAT,
  STEP,
  TOTAL_NIGHT_SECONDS,
  TURN_DURATION,
} from '../config/constants.js';
import { CAMERA_MAP } from '../config/facility.js';
import {
  HALLUCINATIONS,
  NIGHT_CONFIGS,
  PHONE_CALLS,
  SHIFT_MODIFIER_MAP,
} from '../config/nights.js';
import { computeShiftRank } from '../storage/saveSystem.js';
import { stepAnton, stepAntonVideo } from './ai/antonAi.js';
import { banishDuckSuit, spawnDuckAnomaly, stepDuck } from './ai/duckAi.js';
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
  randomFrom,
  triggerJumpscare,
} from './runtime.js';
import { triggerCamFlash } from './systems/camPulseSystem.js';
import {
  createOrderState,
  interactPrepStation,
  isOrderExpress,
  spawnNewOrderTicket,
  stampOrderBon,
  stepOrderSystem,
} from './systems/orderSystem.js';
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
  interactPrepStation,
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
  if (run?.overtime) return '06:00';
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
  if (run.leftLight || run.rightLight || run.flashlightOn) bars += 1;
  if (run.monitorOpen) bars += 1;
  return Math.min(5, bars);
}

export function getHourLabel(run) {
  if (run?.overtime) return '06:00 · ÜBERSTUNDEN';
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
        duck: clamp(Math.floor(Number(options.customAi.duck ?? 0)), 0, 20),
      }
    : null;

  const ai = customAi ? { ...customAi } : { ...cfg.ai };
  const startPower = modifiers.includes('rusty_gen') ? 75 : 100;

  const run = {
    seed,
    night,
    presetId: options.presetId || null,
    nightCfg: cfg,
    nightTitle: cfg.title,
    nightSub: cfg.sub,
    customAi,
    modifiers,
    rng,
    state: 'playing', // 'playing' | 'jumpscare' | 'gameover' | 'won'
    time: 0,
    hour: 0,
    overtime: false,
    appliedBumps: new Set(),
    unlockedThisRun: new Set(),

    // 2-Station Booth & Under-Desk State
    viewState: 'front', // 'front' | 'back' | 'under_desk'
    lastStandStation: 'front',
    turnAnim: 0, // 0 = front (North), 1 = back (South 180°)
    duckAnim: 0, // 0 = seated, 1 = crouched under counter
    holdingBreath: false,
    breath: BREATH_MAX,
    justGasped: false,
    gaspCooldownUntil: 0,

    // Tactical Flashlight & Physical Main Breaker
    flashlightOn: false,
    flashlightBattery: 100,
    breakerTripped: false,
    breakerAnim: 1, // 1 = lever UP (powered), 0 = lever DOWN (tripped)
    roomNoise: 0,

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

    // Mechanical Subsystems
    thermal: createThermalState(cfg, modifiers),
    orders: createOrderState(cfg, modifiers, rng),
    speziCharges: SPEZI_CHARGES,
    speziBoostUntil: 0,

    // Power Outage (FNAF 1 3-phase sequence)
    powerOutage: null,

    // Stalkers
    ai,
    animatronics: {
      torge: { room: '1A', pathIdx: 0, timer: 3.05, stallTimer: 0, officeTimer: 0, sighted: false, flashExposure: 0 },
      anton: { room: '1A', timer: 4.97, officeTimer: 0, sighted: false, stunUntil: 0, subPose: 0 },
      tom: { room: '1A', timer: 4.98, officeTimer: 0, sighted: false, subPose: 0, hatchFlash: 0 },
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

    // The Filthy Duck Suit (180° Anomaly + Anti-Flash)
    duck: {
      active: false,
      station: 'back',
      timer: 0,
      spawnCooldown: 18,
      flashGrace: 0,
    },
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

    // Cassette / Telephone Shift Recording
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
      torgeRepelled: 0,
      torgeStalled: 0,
      goldenBanished: 0,
      underDeskSurvived: 0,
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

  run.onOvertimeQuotaMet = () => completeShiftVictory(run);

  if (customAi && isEasterEgg1987(customAi)) {
    grantAchievement(run, 'code_1987');
    triggerJumpscare(run, 'duck', 'code');
  }

  return run;
}

function completeShiftVictory(run) {
  if (!run || run.state !== 'playing') return;
  run.state = 'won';
  run.monitorOpen = false;
  run.powerOutage = null;
  run.overtime = false;
  checkWinAchievements(run);
  emit(run, 'win_6am');
}

/**
 * Whip 180° between Front Security Desk ('front') and Back Prep & Breaker Wall ('back').
 */
export function turnAround(run) {
  if (!run || run.state !== 'playing' || run.powerOutage || run.monitorOpen) return false;
  if (run.viewState === 'under_desk') {
    return setUnderDesk(run, false);
  }
  const prevStation = run.viewState;
  const nextStation = prevStation === 'front' ? 'back' : 'front';

  // Looking away from the Filthy Duck Suit without flashing banishes it!
  if (run.duck?.active && run.duck.station === prevStation && !run.flashlightOn) {
    banishDuckSuit(run);
  }

  run.viewState = nextStation;
  run.lastStandStation = nextStation;
  run.leftLight = false;
  run.rightLight = false;

  // If the Duck Suit is standing at the destination station, sputter flashlight off so player gets fair visual reaction!
  if (run.duck?.active && run.duck.station === nextStation && run.flashlightOn) {
    run.flashlightOn = false;
  }

  emit(run, 'whip_turn', { to: nextStation });
  return true;
}

export function setUnderDesk(run, hidden) {
  if (!run || run.state !== 'playing' || run.powerOutage || run.monitorOpen) return false;
  const wantHidden = Boolean(hidden);
  if (wantHidden && run.viewState !== 'under_desk') {
    if (run.duck?.active && !run.flashlightOn) {
      banishDuckSuit(run);
    }
    run.lastStandStation = run.viewState === 'back' ? 'back' : 'front';
    run.viewState = 'under_desk';
    run.flashlightOn = false;
    run.leftLight = false;
    run.rightLight = false;
    emit(run, 'under_desk_enter');
    return true;
  }
  if (!wantHidden && run.viewState === 'under_desk') {
    run.viewState = 'front';
    run.holdingBreath = false;
    emit(run, 'under_desk_exit');
    return true;
  }
  return false;
}

export function toggleUnderDesk(run) {
  if (!run) return false;
  return setUnderDesk(run, run.viewState !== 'under_desk');
}

export function setHoldingBreath(run, active) {
  if (!run || run.state !== 'playing' || run.viewState !== 'under_desk') {
    if (run) run.holdingBreath = false;
    return false;
  }
  if (active && (run.gaspCooldownUntil ?? 0) > run.time) return false;
  const next = Boolean(active);
  if (run.holdingBreath !== next) {
    run.holdingBreath = next;
    emit(run, next ? 'breath_hold_start' : 'breath_hold_release');
  }
  return true;
}

export function setFlashlight(run, on) {
  if (!run || run.state !== 'playing' || run.powerOutage || run.monitorOpen) return false;
  const want = Boolean(on) && (run.flashlightBattery ?? 100) > 1 && run.viewState !== 'under_desk';
  if (run.flashlightOn === want) return want === Boolean(on);
  run.flashlightOn = want;
  if (want) {
    // Window scare stingers if shining flashlight at occupied side doorways in front view
    if (run.viewState === 'front' && run.lookX < -0.35 && run.animatronics.anton.room === 'left_door' && !run.animatronics.anton.sighted) {
      run.animatronics.anton.sighted = true;
      run.stingFlash = 0.55;
      emit(run, 'window_sting', { who: 'anton', side: 'left' });
    } else if (run.viewState === 'front' && run.lookX > 0.35 && run.animatronics.tom.room === 'right_door' && !run.animatronics.tom.sighted) {
      run.animatronics.tom.sighted = true;
      run.stingFlash = 0.55;
      emit(run, 'window_sting', { who: 'tom', side: 'right' });
    }
    // Immediate Anti-Flash check on the Filthy Duck Suit!
    if ((run.duck?.active && run.duck.station === run.viewState) || (run.goldenActive && run.viewState === 'front')) {
      triggerJumpscare(run, 'duck', 'flash');
      return true;
    }
  }
  emit(run, 'flashlight_click', { on: want });
  return true;
}

export function toggleFlashlight(run) {
  if (!run) return false;
  return setFlashlight(run, !run.flashlightOn);
}

/**
 * Pulls the Physical Main Breaker Lever on the Back Prep Wall after Hauke's impact trips it.
 */
export function resetBreaker(run) {
  if (!run || run.state !== 'playing' || run.powerOutage || run.monitorOpen) return false;
  if (run.viewState !== 'back') return false;
  if (!run.breakerTripped && run.cameraFuseUntil <= run.time) return false;
  run.breakerTripped = false;
  run.cameraFuseUntil = 0;
  run.breakerAnim = 1;
  run.stats.fusesReset += 1;
  emit(run, 'breaker_reset', { rear: true });
  return true;
}

/**
 * Single context-sensitive CCTV Countermeasure button ([X]):
 * - CAM 6 or CAM 4A (when bell ready & Tom nearby): Audio Gong Lure (0% power)
 * - CAM 2B / CAM 4B (when steam >= 45%): Hall Steam Vent (0% power)
 * - Otherwise: IR Strobe Flash (-1% power, clears fault, cancels Anton video, pushes Hauke back on 1C)
 */
export function triggerCamCounter(run) {
  if (!run || run.state !== 'playing' || run.powerOutage || !run.monitorOpen) return false;
  const cam = run.activeCam;
  if (cam === '6') {
    return ringKitchenBell(run);
  }
  if ((cam === '2B' || cam === '4B') && (run.thermal?.heat ?? 0) >= STEAM_BURST_MIN_HEAT && (run.thermal?.burstCooldownUntil ?? 0) <= run.time) {
    return triggerSteamBurst(run);
  }
  if (cam === '4A' && (run.kitchenBellUntil ?? 0) <= run.time && (run.animatronics.tom.room === '4A' || run.animatronics.tom.room === '4B' || run.animatronics.tom.room === 'right_door')) {
    return ringKitchenBell(run, true);
  }
  return triggerCamFlash(run);
}

export function toggleLeftDoor(run) {
  if (!run || run.state !== 'playing' || run.powerOutage || run.monitorOpen || run.viewState !== 'front') return false;
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
  if (!run || run.state !== 'playing' || run.powerOutage || run.monitorOpen || run.viewState !== 'front') return false;
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
  if (!run || run.state !== 'playing' || run.powerOutage || run.monitorOpen || run.breakerTripped || run.viewState !== 'front') return false;
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
  if (!run || run.state !== 'playing' || run.powerOutage || run.monitorOpen || run.breakerTripped || run.viewState !== 'front') return false;
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
    run.cam5Stare = run.rng() < 0.22;
  }
  if (camId === '2B' && run.night >= 2 && !run.goldenUsed && !run.goldenPoster && run.rng() < 0.04) {
    run.goldenPoster = true;
    run.goldenUsed = true;
    emit(run, 'duck_rustle');
  }
}

export function toggleMonitor(run) {
  if (!run || run.state !== 'playing' || run.powerOutage || run.breakerTripped || run.cameraFuseUntil > run.time) return false;
  if (run.viewState === 'under_desk') return false;

  run.monitorOpen = !run.monitorOpen;
  run.monitorFlash = 1.0;
  if (run.monitorOpen) {
    run.leftLight = false;
    run.rightLight = false;
    run.flashlightOn = false;
    run.camSwitchStatic = 0.28;
    emit(run, 'monitor_open');

    if (run.goldenActive || run.duck?.active) {
      banishDuckSuit(run);
    }

    onCameraViewed(run, run.activeCam);
  } else {
    pulseHaukeCameraCheck(run, null);
    emit(run, 'monitor_close');
    endAntonVideo(run);

    if (run.goldenPoster && !run.goldenActive) {
      spawnDuckAnomaly(run, 'front');
      run.hallucination = { text: 'KEIN LICHT', timer: 0.75 };
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
  if (!run || run.state !== 'playing' || run.powerOutage || run.monitorOpen) return false;
  if (run.cameraFuseUntil <= run.time && !run.breakerTripped) return false;
  if (run.power <= FUSE_RESET_COST) return false;
  run.power -= FUSE_RESET_COST;
  run.cameraFuseUntil = 0;
  run.breakerTripped = false;
  run.breakerAnim = 1;
  run.stats.fusesReset += 1;
  emit(run, 'fuse_reset');
  return true;
}

export function ringKitchenBell(run, allowRemote = false) {
  if (!run || run.state !== 'playing' || !run.monitorOpen
      || (!allowRemote && run.activeCam !== '6')
      || feedIsInterrupted(run) || run.kitchenBellUntil > run.time || run.power <= KITCHEN_BELL_COST) return false;
  if (KITCHEN_BELL_COST > 0) run.power = Math.max(0, run.power - KITCHEN_BELL_COST);
  run.kitchenBellUntil = run.time + KITCHEN_BELL_COOLDOWN;
  emit(run, 'kitchen_bell');
  const tom = run.animatronics.tom;
  const torge = run.animatronics.torge;

  if (tom.room === '4A' || tom.room === '4B' || tom.room === 'right_door' || tom.room === 'back_hatch') {
    noteRoomTransition(run, tom.room, '6', 'tom', false);
    tom.room = '6';
    tom.timer = 9.5;
    run.kitchenAudioTimer = 0.55;
    run.stats.tomLured += 1;
    if (run.stats.tomLured >= 2) grantAchievement(run, 'spezi_bait');
  }
  if (torge.room === '6' || torge.room === 'center_far') {
    torge.timer = Math.max(torge.timer, 6.5);
    run.kitchenAudioTimer = 0.55;
  }
  return true;
}

export function honkPoster(run) {
  if (!run || run.state !== 'playing' || run.monitorOpen || run.powerOutage) return false;
  run.posterHonks += 1;
  run.stats.posterHonks += 1;
  run.posterBounce = 0.34;
  emit(run, 'honk');
  return true;
}

export function sipSpezi(run) {
  if (!run || run.state !== 'playing' || run.monitorOpen || run.powerOutage) return false;
  if ((run.speziCharges ?? 0) <= 0) {
    run.speziBounce = 0.22;
    emit(run, 'spezi_empty');
    return true;
  }

  run.speziCharges -= 1;
  run.speziSips += 1;
  run.stats.speziBoosts = (run.stats.speziBoosts || 0) + 1;
  run.speziBounce = 0.42;
  run.speziBoostUntil = run.time + SPEZI_BOOST_SECONDS;
  run.quake *= 0.35;

  const tom = run.animatronics.tom;
  if (run.ai.tom > 0 && tom.room !== 'office' && tom.room !== 'right_door') {
    tom.timer = Math.min(tom.timer, 1.85);
  }

  emit(run, 'spezi_sip', { remaining: run.speziCharges });
  return true;
}

export function squeakDuck(run) {
  if (!run || run.state !== 'playing' || run.monitorOpen || run.powerOutage) return false;
  run.duckSqueaks += 1;
  run.duckBounce = 0.38;
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
  if ((is420 && (run.modifiers?.length ?? 0) >= 1) || computeShiftRank(run).grade === 'S++') {
    grantAchievement(run, 'chef_god');
  }
}

export function advance(run, input = {}, dt = STEP) {
  run.events.length = 0;
  run.justGasped = false;

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

  // Smooth 180° Whip-Pan & Under-Desk Crouch Transitions
  const targetTurn = run.viewState === 'back' ? 1 : (run.viewState === 'under_desk' && run.lastStandStation === 'back' ? 0 : 0);
  const turnStep = dt / TURN_DURATION;
  if (run.turnAnim < targetTurn) run.turnAnim = Math.min(targetTurn, run.turnAnim + turnStep);
  else if (run.turnAnim > targetTurn) run.turnAnim = Math.max(targetTurn, run.turnAnim - turnStep);

  const targetDuck = run.viewState === 'under_desk' ? 1 : 0;
  const duckStep = dt / DUCK_DURATION;
  if (run.duckAnim < targetDuck) run.duckAnim = Math.min(targetDuck, run.duckAnim + duckStep);
  else if (run.duckAnim > targetDuck) run.duckAnim = Math.max(targetDuck, run.duckAnim - duckStep);

  run.breakerAnim += ((run.breakerTripped ? 0 : 1) - run.breakerAnim) * Math.min(1, dt * 12);

  // Under-Desk Breath Meter
  if (run.viewState === 'under_desk' && run.holdingBreath) {
    run.breath = Math.max(0, run.breath - BREATH_DRAIN_RATE * dt);
    if (run.breath <= 0) {
      run.holdingBreath = false;
      run.justGasped = true;
      run.gaspCooldownUntil = run.time + 1.5;
      emit(run, 'breath_gasp');
    }
  } else {
    run.holdingBreath = false;
    run.breath = Math.min(BREATH_MAX, run.breath + BREATH_RECOVER_RATE * dt);
  }

  // Tactical Flashlight Capacitor
  if (run.flashlightOn && !run.powerOutage && !run.monitorOpen) {
    run.flashlightBattery = Math.max(0, (run.flashlightBattery ?? 100) - FLASHLIGHT_DRAIN_RATE * dt);
    if (run.flashlightBattery <= 0) {
      run.flashlightOn = false;
      emit(run, 'flashlight_click', { on: false });
    }
  } else {
    run.flashlightBattery = Math.min(100, (run.flashlightBattery ?? 100) + FLASHLIGHT_RECHARGE_RATE * dt);
  }

  // Optional hold-prep input from Controls while facing Back Wall
  if (input.prepHold && run.viewState === 'back' && !run.monitorOpen) {
    interactPrepStation(run, input.prepHold, dt);
  }

  // Smooth office pan
  const prevLookX = run.lookX;
  if (!run.monitorOpen && typeof input.lookDelta === 'number' && input.lookDelta !== 0) {
    const limit = run.viewState === 'under_desk' ? 0.45 : 1.0;
    run.lookX = clamp(run.lookX + input.lookDelta * servoMult * dt, -limit, limit);
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

  // Mechanical animations
  const doorSpeed = 6.8 * servoMult;
  run.leftDoorAnim += ((run.leftDoor ? 1 : 0) - run.leftDoorAnim) * Math.min(1, dt * doorSpeed * 2);
  run.rightDoorAnim += ((run.rightDoor ? 1 : 0) - run.rightDoorAnim) * Math.min(1, dt * doorSpeed * 2);
  run.leftDoorBounce = Math.max(0, run.leftDoorBounce - dt * 4.5);
  run.rightDoorBounce = Math.max(0, run.rightDoorBounce - dt * 4.5);
  run.monitorAnim += ((run.monitorOpen ? 1 : 0) - run.monitorAnim) * Math.min(1, dt * 14 * servoMult);
  run.monitorFlash = Math.max(0, run.monitorFlash - dt * 5.2);
  run.irFlash = Math.max(0, (run.irFlash || 0) - dt * 3.8);
  run.camPan = Math.sin(run.time * 0.42);

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

  const breachFlicker = run.animatronics.anton.room === 'office' || run.animatronics.tom.room === 'office';
  const flickerChance = breachFlicker ? 0.32 : (run.modifiers?.includes('midnight_fog') ? 0.095 : 0.045);
  run.lightFlicker = run.rng() < flickerChance ? (0.28 + run.rng() * 0.55) : 1.0;

  // Advance Night Clock & Check 6:00 AM Mandatory Order Quota / Overtime Rule!
  run.time += dt;
  const newHour = Math.floor(run.time / HOUR_SECONDS);
  if (newHour > run.hour && !run.overtime) {
    run.hour = newHour;
    if (run.hour >= 6) {
      if ((run.orders?.completed ?? 0) >= (run.orders?.quota ?? 0)) {
        completeShiftVictory(run);
        return run;
      }
      // Enter 06:00 ÜBERSTUNDEN (Nachschicht) until remaining orders are bagged!
      run.overtime = true;
      run.ai.torge = clamp((run.ai.torge || 0) + 4, 4, 20);
      // Grace period: extend the open ticket so the overtime alarm does not feel cheap
      if (run.orders?.active) run.orders.active.deadline += 6;
      if (run.orders && !run.orders.active) {
        spawnNewOrderTicket(run);
      }
      emit(run, 'overtime_start', { remaining: run.orders.quota - run.orders.completed });
    } else {
      emit(run, 'hour_tick', { hour: run.hour });
      const bumps = NIGHT_CONFIGS[run.night]?.hourlyBumps?.[run.hour];
      if (bumps && !run.appliedBumps.has(run.hour)) {
        run.appliedBumps.add(run.hour);
        for (const [k, delta] of Object.entries(bumps)) {
          run.ai[k] = clamp((run.ai[k] || 0) + delta, 0, 20);
        }
      }
    }
  }

  stepPhoneCall(run);

  if (run.powerOutage) {
    stepPowerOutage(run, dt);
    return run;
  }

  // Booth Battery Drain
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
    run.flashlightOn = false;
    run.monitorOpen = false;
    endAntonVideo(run, false);
    run.goldenActive = false;
    if (run.duck) run.duck.active = false;
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

  // Mechanical Subsystems & Room Noise Synthesis
  stepThermalSystem(run, dt);
  stepOrderSystem(run, dt);
  if (run.state !== 'playing') return run;

  const ventNoise = isVentingSteam(run) ? 0.78 : 0;
  const prepNoise = run.orders?.prepNoise ?? 0;
  run.roomNoise = clamp(Math.max(ventNoise, prepNoise), 0, 1);

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

  // Office breathing when Anton or Tom is inside
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

  // Hauke's muffled hum in CAM 1C
  if (run.ai.hauke > 0 && run.animatronics.hauke.stage < 3) {
    run.haukeHumTimer -= dt;
    if (run.haukeHumTimer <= 0) {
      run.haukeHumTimer = 14 + run.rng() * 12;
      emit(run, 'hauke_hum', { loud: run.monitorOpen && run.activeCam === '1C' });
    }
  }

  // Distant industrial hum / late-night radio drift
  if (run.night >= 2) {
    run.calliopeTimer -= dt;
    if (run.calliopeTimer <= 0) {
      run.calliopeTimer = 42 + run.rng() * 38;
      if (run.rng() < 0.45) emit(run, 'distant_calliope');
    }
  }

  run.ambienceTimer -= dt;
  if (run.ambienceTimer <= 0) {
    run.ambienceTimer = 11 + run.rng() * 14;
    const nearThreat = run.animatronics.anton.room === 'left_door'
      || run.animatronics.tom.room === 'right_door'
      || run.animatronics.tom.room === 'back_hatch'
      || run.animatronics.torge.room === 'center_near';
    emit(run, 'ambience', { tense: nearThreat, cam: run.monitorOpen ? run.activeCam : undefined });
    if (nearThreat && run.rng() < 0.18 && !run.hallucination) {
      run.hallucination = {
        text: HALLUCINATIONS[Math.floor(run.rng() * HALLUCINATIONS.length)],
        timer: 0.18,
      };
    }
  }

  // Stalker AI Steps
  stepDuck(run, dt);
  if (run.state !== 'playing') return run;
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
