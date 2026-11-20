import { VHS_TAPE_MAP } from '../config/cosmetics.js';

function makeRng(seed = 1998) {
  let s = (Math.floor(Number(seed)) >>> 0) || 1998;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Creates one of the 3 playable first-person 3D VHS Post-Shift Micro-Horror Minigames:
 * - 'tape1': FLUR-KONTROLLE (Plushtrap-style dark 12m corridor acoustic flash freeze)
 * - 'tape2': HINTERZIMMER-INVENTUR (FFPS-style table cassette test + clipboard + strobe taser)
 * - 'tape3': KÜHLHAUS-SCHLUSSRUNDE (Walk-in -18°C freezer 3-relay repair + strip-curtain breath hold)
 */
export function createMinigame(tapeId = 'tape1', options = {}) {
  const meta = VHS_TAPE_MAP[tapeId] ?? VHS_TAPE_MAP.tape1;
  const rng = makeRng(options.seed ?? Date.now());
  const hard = Boolean(options.hard);

  const base = {
    tapeId: meta.id,
    code: meta.code,
    title: meta.title,
    sub: meta.sub,
    rewardTips: meta.rewardTips,
    hard,
    rng,
    state: 'playing', // 'playing' | 'jumpscare' | 'won' | 'lost'
    time: 0,
    jumpscareTimer: 0,
    events: [],
  };

  if (meta.id === 'tape1') {
    return {
      ...base,
      stalker: hard ? 'duck' : 'tom',
      timeLeft: 65,
      distance: 11.4, // meters down the 12m corridor; white X is at 2.5m (win window: 1.85..3.35m)
      lane: 0, // -1 left, 0 center, +1 right
      flashTimer: 0,
      flashCooldown: 0,
      stepTimer: 0.9,
      poseSeed: 0,
    };
  }

  if (meta.id === 'tape2') {
    return {
      ...base,
      stalker: 'duck',
      testIndex: 0,
      totalTests: 4,
      cassettePlaying: false,
      cassetteProgress: 0,
      cassetteDoneForRound: false,
      clipboardDown: false,
      checkProgress: 0,
      postureStage: 0, // 0 slumped, 1 head tilted, 2 leaning forward (aggro!), 3 lunging
      aggression: 0,
      twitchTimer: 2.2,
      taserCharges: 3,
      taserFlash: 0,
      taserOverused: false,
    };
  }

  // tape3: Kühlhaus-Schlussrunde
  return {
    ...base,
    stalker: 'torge',
    selectedRelay: 0, // 0, 1, 2
    relays: [0, 0, 0], // 0..100% repaired
    repairing: false,
    workLightOn: true,
    holdingBreath: false,
    breath: 100,
    stalkerPhase: 'patrol', // 'patrol' | 'approaching' | 'at_curtain'
    phaseTimer: 4.4,
    curtainAngle: -0.6,
    sparkFlash: 0,
  };
}

function emitMg(mg, kind, extra = {}) {
  mg.events.push({ kind, ...extra });
}

function failMinigame(mg, who = mg.stalker) {
  if (mg.state !== 'playing') return;
  mg.state = 'jumpscare';
  mg.jumpscareTimer = 1.15;
  emitMg(mg, 'jumpscare', { who, cause: 'minigame' });
}

function winMinigame(mg) {
  if (mg.state !== 'playing') return;
  mg.state = 'won';
  if (mg.taserOverused) {
    mg.rewardTips = Math.max(5, Math.round(mg.rewardTips * 0.4));
  }
  emitMg(mg, 'vhs_win', { tapeId: mg.tapeId, rewardTips: mg.rewardTips });
}

// ==================== TAPE 01: FLUR-KONTROLLE ====================
export function flashCorridor(mg) {
  if (!mg || mg.tapeId !== 'tape1' || mg.state !== 'playing') return false;
  if (mg.flashCooldown > 0) return false;

  mg.flashTimer = 0.55;
  mg.flashCooldown = 1.35;
  emitMg(mg, 'flashlight_click', { on: true });

  // Win window: squarely on the taped white X (2.5m, tolerance 1.85m .. 3.35m)
  if (mg.distance >= 1.85 && mg.distance <= 3.35) {
    emitMg(mg, 'danger_stinger');
    winMinigame(mg);
    return true;
  }

  // Early flash freezes & pushes stalker slightly back into shadow
  if (mg.distance < 8.5) {
    emitMg(mg, 'salvage_creak');
    mg.distance = Math.min(11.4, mg.distance + 1.35);
    mg.poseSeed = (mg.poseSeed + 1) % 4;
  }
  return true;
}

// ==================== TAPE 02: HINTERZIMMER-INVENTUR ====================
export function playSalvageCassette(mg) {
  if (!mg || mg.tapeId !== 'tape2' || mg.state !== 'playing') return false;
  if (mg.cassettePlaying || mg.cassetteDoneForRound || mg.clipboardDown) return false;
  mg.cassettePlaying = true;
  mg.cassetteProgress = 0;
  emitMg(mg, 'cassette_start', { promptIndex: mg.testIndex });
  return true;
}

export function setClipboardDown(mg, down) {
  if (!mg || mg.tapeId !== 'tape2' || mg.state !== 'playing') return false;
  const next = Boolean(down);
  if (mg.clipboardDown !== next) {
    mg.clipboardDown = next;
    emitMg(mg, 'clipboard_flip', { down: next });
  }
  return true;
}

export function triggerSalvageTaser(mg) {
  if (!mg || mg.tapeId !== 'tape2' || mg.state !== 'playing' || mg.clipboardDown) return false;
  if (mg.taserCharges <= 0) {
    mg.taserOverused = true;
    emitMg(mg, 'jammed');
    return false;
  }
  mg.taserCharges -= 1;
  mg.taserFlash = 1.0;
  if (mg.postureStage === 0) {
    mg.taserOverused = true;
  }
  mg.postureStage = 0;
  mg.aggression = 0;
  emitMg(mg, 'ir_flash', { cam: 'salvage', effective: true });
  return true;
}

// ==================== TAPE 03: KÜHLHAUS-SCHLUSSRUNDE ====================
export function selectFreezerRelay(mg, index) {
  if (!mg || mg.tapeId !== 'tape3' || mg.state !== 'playing') return false;
  const clamped = ((Math.trunc(index) % 3) + 3) % 3;
  mg.selectedRelay = clamped;
  emitMg(mg, 'cam_blip');
  return true;
}

export function setFreezerRepairing(mg, active) {
  if (!mg || mg.tapeId !== 'tape3' || mg.state !== 'playing') return false;
  mg.repairing = Boolean(active);
  if (mg.repairing) {
    mg.holdingBreath = false;
    mg.workLightOn = true;
  }
  return true;
}

export function toggleFreezerLight(mg, force = undefined) {
  if (!mg || mg.tapeId !== 'tape3' || mg.state !== 'playing') return false;
  mg.workLightOn = typeof force === 'boolean' ? force : !mg.workLightOn;
  if (!mg.workLightOn) mg.repairing = false;
  emitMg(mg, 'flashlight_click', { on: mg.workLightOn });
  return true;
}

export function setFreezerHoldBreath(mg, active) {
  if (!mg || mg.tapeId !== 'tape3' || mg.state !== 'playing') return false;
  mg.holdingBreath = Boolean(active);
  if (mg.holdingBreath) {
    mg.repairing = false;
    mg.workLightOn = false;
  }
  return true;
}

export function advanceMinigame(mg, dt = 1 / 60) {
  if (!mg) return mg;
  mg.events.length = 0;

  if (mg.state === 'jumpscare') {
    mg.jumpscareTimer -= dt;
    if (mg.jumpscareTimer <= 0) {
      mg.state = 'lost';
      emitMg(mg, 'gameover_static');
    }
    return mg;
  }
  if (mg.state !== 'playing') return mg;

  mg.time += dt;

  // --- TAPE 01: FLUR-KONTROLLE ---
  if (mg.tapeId === 'tape1') {
    mg.flashCooldown = Math.max(0, mg.flashCooldown - dt);
    mg.timeLeft = Math.max(0, mg.timeLeft - dt);
    if (mg.timeLeft <= 0) {
      failMinigame(mg);
      return mg;
    }

    if (mg.flashTimer > 0) {
      mg.flashTimer = Math.max(0, mg.flashTimer - dt);
      return mg;
    }

    // In pitch darkness, stalker darts closer!
    const speed = (mg.hard ? 1.85 : 1.48) + (1 - mg.timeLeft / 65) * 0.45;
    mg.distance -= speed * dt;
    mg.stepTimer -= dt;
    if (mg.stepTimer <= 0) {
      mg.stepTimer = Math.max(0.28, 0.34 + (mg.distance / 12) * 0.55);
      mg.lane = Math.floor(mg.rng() * 3) - 1;
      const side = mg.lane < 0 ? 'left' : mg.lane > 0 ? 'right' : undefined;
      const onX = mg.distance >= 1.85 && mg.distance <= 3.35;
      emitMg(mg, 'footstep', {
        who: mg.stalker === 'duck' ? 'duck' : 'tom',
        side,
        loud: mg.distance < 4.2,
        onMarker: onX,
      });
    }

    if (mg.distance <= 0.85) {
      failMinigame(mg);
    }
    return mg;
  }

  // --- TAPE 02: HINTERZIMMER-INVENTUR ---
  if (mg.tapeId === 'tape2') {
    mg.taserFlash = Math.max(0, mg.taserFlash - dt * 3.5);

    if (mg.cassettePlaying) {
      mg.cassetteProgress += dt / 3.8;
      // Audio test tone agitates the slumped suit slightly
      mg.aggression += dt * (6.2 + mg.testIndex * 1.4);
      if (mg.cassetteProgress >= 1) {
        mg.cassettePlaying = false;
        mg.cassetteProgress = 1;
        mg.cassetteDoneForRound = true;
        emitMg(mg, 'cassette_stop');
      }
    }

    if (mg.clipboardDown) {
      // Looking down lets you check off the clipboard ONLY after cassette tone finished,
      // while the stalker creeps closer across the table unseen!
      mg.aggression += dt * (11.5 + mg.testIndex * 2.2);
      if (mg.cassetteDoneForRound) {
        mg.checkProgress += dt / 1.85;
        if (mg.checkProgress >= 1) {
          mg.testIndex += 1;
          mg.checkProgress = 0;
          mg.cassetteDoneForRound = false;
          mg.cassetteProgress = 0;
          emitMg(mg, 'bon_stamped');
          if (mg.testIndex >= mg.totalTests) {
            winMinigame(mg);
            return mg;
          }
        }
      }
    } else {
      // Looking directly at stalker slows aggression unless already at stage 3
      mg.aggression += dt * (mg.cassettePlaying ? 2.5 : 0.9);
    }

    const nextStage = mg.aggression >= 98 ? 3 : mg.aggression >= 64 ? 2 : mg.aggression >= 32 ? 1 : 0;
    if (nextStage > mg.postureStage) {
      mg.postureStage = nextStage;
      emitMg(mg, nextStage >= 2 ? 'salvage_creak' : 'duck_rustle');
    }
    if (mg.postureStage >= 3 && (mg.clipboardDown || mg.aggression >= 108)) {
      failMinigame(mg, 'duck');
    }
    return mg;
  }

  // --- TAPE 03: KÜHLHAUS-SCHLUSSRUNDE ---
  mg.sparkFlash = Math.max(0, mg.sparkFlash - dt * 5);

  if (mg.holdingBreath) {
    mg.breath = Math.max(0, mg.breath - 17 * dt);
    if (mg.breath <= 0) {
      mg.holdingBreath = false;
      emitMg(mg, 'breath_gasp');
      if (mg.stalkerPhase === 'at_curtain') {
        failMinigame(mg, 'torge');
        return mg;
      }
    }
  } else {
    mg.breath = Math.min(100, mg.breath + 25 * dt);
  }

  if (mg.repairing) {
    //Auto-advance to next unfinished relay if current is 100%
    if (mg.relays[mg.selectedRelay] >= 100) {
      const nextIdx = mg.relays.findIndex((v) => v < 100);
      if (nextIdx >= 0) mg.selectedRelay = nextIdx;
    }
    const idx = mg.selectedRelay;
    if (idx >= 0 && mg.relays[idx] < 100) {
      mg.relays[idx] = Math.min(100, mg.relays[idx] + (100 / 5.2) * dt);
      if (mg.rng() < 0.14) {
        mg.sparkFlash = 1.0;
        emitMg(mg, 'relay_spark');
      }
      if (mg.relays.every((v) => v >= 100)) {
        winMinigame(mg);
        return mg;
      }
    }
  }

  // Stalker circling outside frosted PVC strip curtains
  const noiseAccel = mg.repairing ? 1.65 : 1.0;
  mg.phaseTimer -= dt * noiseAccel;
  mg.curtainAngle += dt * (mg.stalkerPhase === 'at_curtain' ? 0.05 : 0.48);

  if (mg.stalkerPhase === 'patrol' && mg.phaseTimer <= 0) {
    mg.stalkerPhase = 'approaching';
    mg.phaseTimer = 2.1;
    emitMg(mg, 'footstep', { who: 'torge', loud: false });
  } else if (mg.stalkerPhase === 'approaching' && mg.phaseTimer <= 0) {
    mg.stalkerPhase = 'at_curtain';
    mg.phaseTimer = 2.6;
    emitMg(mg, 'curtain_stop', { loud: true });
  } else if (mg.stalkerPhase === 'at_curtain') {
    // If repairing or shining light (after tiny 0.45s reaction window) -> burst through strips!
    if (mg.phaseTimer < 2.15 && (mg.repairing || mg.workLightOn || !mg.holdingBreath)) {
      failMinigame(mg, 'torge');
      return mg;
    }
    if (mg.phaseTimer <= 0) {
      mg.stalkerPhase = 'patrol';
      mg.phaseTimer = 4.2 + mg.rng() * 1.8;
      emitMg(mg, 'footstep', { who: 'torge', receding: true });
    }
  }

  return mg;
}
