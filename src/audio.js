import { feedIsInterrupted } from './game.js';
import { getSfxOverrideBytes } from './render/overrides.js';

const AUDIO_PREFERENCE = 'fnat.sound';

const CAMERA_AUDIO = {
  '1A': { frequency: 620, q: 2.1, gain: 0.085, flutter: 1.3 },
  '1B': { frequency: 440, q: 1.5, gain: 0.095, flutter: 0.48 },
  '1C': { frequency: 340, q: 1.7, gain: 0.105, flutter: 2.2 },
  '2A': { frequency: 780, q: 2.6, gain: 0.075, flutter: 0.82 },
  '2B': { frequency: 520, q: 3.2, gain: 0.10, flutter: 1.6 },
  '3': { frequency: 360, q: 3.0, gain: 0.105, flutter: 3.3 },
  '4A': { frequency: 970, q: 1.8, gain: 0.065, flutter: 0.62 },
  '4B': { frequency: 710, q: 3.1, gain: 0.090, flutter: 1.1 },
  '5': { frequency: 1180, q: 2.5, gain: 0.075, flutter: 4.5 },
  '6': { frequency: 1920, q: 1.65, gain: 0.059, flutter: 5.4 },
};

function savedPreference() {
  try {
    return localStorage.getItem(AUDIO_PREFERENCE) !== 'off';
  } catch {
    return true;
  }
}

const TOREADOR_MELODY = [
  [392.00, 0.42], [440.00, 0.22], [392.00, 0.22], [329.63, 0.44],
  [329.63, 0.44], [329.63, 0.22], [293.66, 0.22], [329.63, 0.22],
  [349.23, 0.22], [293.66, 0.66],
  [329.63, 0.42], [349.23, 0.22], [329.63, 0.22], [293.66, 0.44],
  [261.63, 0.44], [293.66, 0.22], [329.63, 0.22], [261.63, 0.66],
  [246.94, 0.42], [293.66, 0.22], [246.94, 0.22], [220.00, 0.44],
  [196.00, 0.66],
];

/**
 * Computes physically accurate 180° stereo panning & rear-wall high-shelf occlusion:
 * - When turned 180° ('back'), front-hallway sounds flip Left <-> Right (`pan = -pan`)
 *   and receive rear-wall high-shelf attenuation (`-8.5 dB`).
 * - Rear-wall cues (`isRear = true`, e.g. Back Pickup Hatch or Main Breaker) are crisp in 'back'
 *   and occluded/flipped when facing 'front'.
 */
export function computeSpatialAudioParams(rawPan = 0, viewState = 'front', lookSmooth = 0, isRear = false) {
  const facingBack = viewState === 'back';
  const behindListener = isRear ? !facingBack : facingBack;
  const orientedPan = behindListener ? -rawPan : rawPan;
  const pan = Math.max(-0.92, Math.min(0.92, orientedPan - lookSmooth * 0.24));
  const rearOcclusionDb = behindListener ? -8.5 : 0;
  return { pan, rearOcclusionDb, behindListener };
}

function makeDistortionCurve(amount = 42) {
  const n = 512;
  const curve = new Float32Array(n);
  const k = amount;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

function makeReverbImpulse(ctx, seconds = 1.45, decay = 2.6) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const env = Math.pow(1 - i / length, decay);
      const early = i < ctx.sampleRate * 0.04 ? 1.45 : 1.0;
      data[i] = (Math.random() * 2 - 1) * env * early;
    }
  }
  return impulse;
}

/**
 * Offline-baked procedural AudioBuffer foley bank (multi-layered modal synthesis & transients).
 */
function bakeFoleyBuffers(ctx) {
  const sr = ctx.sampleRate;
  const makeBuf = (durSec, synthFn) => {
    const len = Math.max(1, Math.floor(sr * durSec));
    const buf = ctx.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);
    synthFn(out, len, sr);
    return buf;
  };

  return {
    // Tom's hollow aluminum Pfand/Spezi can clink + dent crinkle
    canClink: makeBuf(0.38, (out, len) => {
      const modes = [[1390, 26, 0.36], [2185, 34, 0.28], [3240, 42, 0.20], [4510, 55, 0.12]];
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        let s = 0;
        for (const [f, d, a] of modes) {
          s += Math.sin(2 * Math.PI * f * t + Math.sin(t * 210) * 0.25) * Math.exp(-t * d) * a;
        }
        // Second can tap at 95ms
        if (t > 0.095) {
          const t2 = t - 0.095;
          for (const [f, d, a] of modes) {
            s += Math.sin(2 * Math.PI * (f * 1.12) * t2) * Math.exp(-t2 * (d * 1.15)) * (a * 0.7);
          }
        }
        const crinkle = (Math.random() * 2 - 1) * Math.exp(-t * 65) * 0.32;
        out[i] = Math.tanh((s + crinkle) * 1.4);
      }
    }),

    // Anton's wet rubber sole squeak on quarry tiles
    sneakerSqueak: makeBuf(0.28, (out, len) => {
      let phase = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const thud = Math.sin(2 * Math.PI * (96 * Math.exp(-t * 14)) * t) * Math.exp(-t * 18) * 0.65;
        let squeak = 0;
        if (t > 0.03 && t < 0.21) {
          const st = (t - 0.03) / 0.18;
          const freq = 1480 - st * 560 + Math.sin(st * 34) * 45;
          phase += (2 * Math.PI * freq) / sr;
          squeak = Math.sin(phase) * Math.sin(st * Math.PI) * 0.22;
        }
        out[i] = thud + squeak + (Math.random() * 2 - 1) * Math.exp(-t * 42) * 0.16;
      }
    }),

    // Torge's heavy cast-iron pan metallic scrape
    castIronScrape: makeBuf(0.56, (out, len) => {
      const modes = [[318, 8, 0.32], [688, 11, 0.24], [1490, 14, 0.18], [2610, 19, 0.12]];
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const rough = 0.6 + 0.4 * Math.sin(t * 135) * Math.cos(t * 63);
        const env = Math.sin(Math.min(1, t / 0.56) * Math.PI);
        let ring = 0;
        for (const [f, d, a] of modes) {
          ring += Math.sin(2 * Math.PI * f * t + rough * 1.3) * Math.exp(-t * d * 0.45) * a;
        }
        const grit = (Math.random() * 2 - 1) * env * rough * 0.28;
        out[i] = Math.tanh((ring * env + grit) * 1.5);
      }
    }),

    // Duck Suit's heavy wet canvas/matted plush rub + hollow mask breath
    wetMascotRub: makeBuf(0.68, (out, len) => {
      let lp1 = 0;
      let lp2 = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const env = Math.sin((t / 0.68) * Math.PI);
        const n = Math.random() * 2 - 1;
        lp1 += 0.08 * (n - lp1);
        lp2 += 0.025 * (n - lp2);
        const cloth = (lp1 - lp2) * env * (0.7 + 0.3 * Math.sin(t * 19));
        const breath = Math.sin(2 * Math.PI * 290 * t) * env * 0.06;
        out[i] = Math.tanh((cloth * 2.4 + breath) * 1.3);
      }
    }),

    // Paper takeout bag crinkle
    bagCrinkle: makeBuf(0.34, (out, len) => {
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const burstEnv = Math.pow(Math.sin(t * 38), 8) * Math.exp(-t * 4.5);
        out[i] = (Math.random() * 2 - 1) * burstEnv * 0.62;
      }
    }),

    // Heavy Main Breaker lever throw + spring latch
    breakerClunk: makeBuf(0.32, (out, len) => {
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const body = Math.sin(2 * Math.PI * 135 * t) * Math.exp(-t * 28) * 0.7;
        const latch = t > 0.065
          ? Math.sin(2 * Math.PI * 980 * (t - 0.065)) * Math.exp(-(t - 0.065) * 55) * 0.55
          : 0;
        const click = (Math.random() * 2 - 1) * Math.exp(-t * 70) * 0.45;
        out[i] = Math.tanh((body + latch + click) * 1.6);
      }
    }),

    // Cassette deck transport CLICK-CLACK
    cassetteClick: makeBuf(0.18, (out, len) => {
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const c1 = (Math.random() * 2 - 1) * Math.exp(-t * 120) * 0.7;
        const c2 = t > 0.055 ? (Math.random() * 2 - 1) * Math.exp(-(t - 0.055) * 110) * 0.55 : 0;
        const spring = Math.sin(2 * Math.PI * 1650 * t) * Math.exp(-t * 85) * 0.25;
        out[i] = c1 + c2 + spring;
      }
    }),

    // Muffled under-desk lub-dub heartbeat
    heartbeat: makeBuf(0.55, (out, len) => {
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const lub = Math.sin(2 * Math.PI * 52 * t) * Math.exp(-t * 18) * 0.68;
        const dub = t > 0.19
          ? Math.sin(2 * Math.PI * 66 * (t - 0.19)) * Math.exp(-(t - 0.19) * 22) * 0.48
          : 0;
        out[i] = lub + dub;
      }
    }),
  };
}

export class Soundscape {
  constructor() {
    this.enabled = savedPreference();
    this.volume = 0.85;
    this.viewState = 'front';
    this.lookSmooth = 0;
    this.activity = 'title';
    this.context = null;
    this.master = null;
    this.reverbSend = null;
    this.distortBus = null;
    this.rearBus = null;
    this.cassetteBus = null;
    this.tapeHissGain = null;
    this.foley = null;
    this.decodedOverrides = new Map();
    this.overrideSource = null;

    this.fanGain = null;
    this.fryerGain = null;
    this.slicerGain = null;
    this.cctvGain = null;
    this.cameraProfile = null;
    this.lightGain = null;
    this.tensionGain = null;
    this.titleDroneGain = null;

    this.jingleTimeout = null;
    this.jingleStep = 0;
    this.jingleActive = false;
    this.phoneTimers = [];
    this.heartbeatAt = 0;
  }

  open() {
    if (!this.enabled) return;
    try {
      if (!this.context) this.build();
      if (this.context && this.context.state !== 'running') {
        this.context.resume().then(() => this.mix()).catch(() => {});
      }
    } catch {
      this.context = null;
    }
  }

  suspend() {
    this.stopJingle();
    this.stopSpeech();
    if (!this.context) return;
    try {
      this.master?.gain?.setTargetAtTime(0, this.context.currentTime, 0.03);
      if (this.context.state === 'running') {
        this.context.suspend().catch(() => {});
      }
    } catch {
      // ignore audio state errors
    }
  }

  build() {
    const Engine = window.AudioContext || window.webkitAudioContext;
    if (!Engine) return;
    const ctx = new Engine();
    this.context = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0;

    // World-cue lowpass filter: drops to ~420 Hz under desk holding breath, or ~620 Hz during loud steam/prep!
    this.cuesFilter = ctx.createBiquadFilter();
    this.cuesFilter.type = 'lowpass';
    this.cuesFilter.frequency.value = 16000;
    this.cuesFilter.Q.value = 0.72;
    this.cuesFilter.connect(this.master);

    // Rear-wall high-shelf occlusion bus (-8.5 dB above 1800 Hz for behind-the-back sounds!)
    this.rearBus = ctx.createBiquadFilter();
    this.rearBus.type = 'highshelf';
    this.rearBus.frequency.value = 1800;
    this.rearBus.gain.value = -8.5;
    this.rearBus.connect(this.cuesFilter);

    // 300–2800 Hz Telephone / Cassette Murmur Bandpass Chain (zero speechSynthesis!)
    const casHp = ctx.createBiquadFilter();
    casHp.type = 'highpass';
    casHp.frequency.value = 310;
    const casLp = ctx.createBiquadFilter();
    casLp.type = 'lowpass';
    casLp.frequency.value = 2750;
    casLp.Q.value = 1.35;
    const casSat = ctx.createWaveShaper();
    casSat.curve = makeDistortionCurve(14);
    this.cassetteBus = ctx.createGain();
    this.cassetteBus.gain.value = 0.85;
    this.cassetteBus.connect(casHp).connect(casLp).connect(casSat).connect(this.master);

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -13;
    compressor.knee.value = 10;
    compressor.ratio.value = 7;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.14;
    const rumbleCut = ctx.createBiquadFilter();
    rumbleCut.type = 'highpass';
    rumbleCut.frequency.value = 42;
    rumbleCut.Q.value = 0.7;
    this.master.connect(rumbleCut).connect(compressor).connect(ctx.destination);

    // Dark-hallway algorithmic reverb send bus
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.34;
    const convolver = ctx.createConvolver();
    convolver.buffer = makeReverbImpulse(ctx, 1.4, 2.7);
    const revTone = ctx.createBiquadFilter();
    revTone.type = 'lowpass';
    revTone.frequency.value = 2600;
    this.reverbSend.connect(convolver).connect(revTone).connect(this.master);

    // Harsh distortion bus for jumpscares, slams, and danger stingers
    this.distortBus = ctx.createGain();
    this.distortBus.gain.value = 0.75;
    const shaper = ctx.createWaveShaper();
    shaper.curve = makeDistortionCurve(62);
    shaper.oversample = '2x';
    const distLowpass = ctx.createBiquadFilter();
    distLowpass.type = 'lowpass';
    distLowpass.frequency.value = 4500;
    this.distortBus.connect(shaper).connect(distLowpass).connect(this.master);
    distLowpass.connect(this.reverbSend);

    // Reusable 2.5s white noise buffer + Baked Foley AudioBuffers
    this.noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2.5), ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.foley = bakeFoleyBuffers(ctx);

    // Cassette motor tape hiss loop
    this.tapeHissGain = ctx.createGain();
    this.tapeHissGain.gain.value = 0;
    const hissSrc = ctx.createBufferSource();
    hissSrc.buffer = this.noise;
    hissSrc.loop = true;
    hissSrc.connect(this.tapeHissGain).connect(this.cassetteBus);
    hissSrc.start(0, 0.2);

    // Desk fan loop
    this.fanGain = ctx.createGain();
    this.fanGain.gain.value = 0;
    this.fanGain.connect(this.master);
    const fanAir = ctx.createBufferSource();
    fanAir.buffer = this.noise;
    fanAir.loop = true;
    const fanFilter = ctx.createBiquadFilter();
    fanFilter.type = 'bandpass';
    fanFilter.frequency.value = 540;
    fanFilter.Q.value = 0.95;
    const fanAirGain = ctx.createGain();
    fanAirGain.gain.value = 0.44;
    const blades = ctx.createOscillator();
    blades.frequency.value = 11.8;
    const bladeDepth = ctx.createGain();
    bladeDepth.gain.value = 0.08;
    blades.connect(bladeDepth).connect(fanAirGain.gain);
    fanAir.connect(fanFilter).connect(fanAirGain).connect(this.fanGain);
    fanAir.start();
    blades.start();

    // Steam exhaust hiss loop
    this.steamGain = ctx.createGain();
    this.steamGain.gain.value = 0;
    this.steamGain.connect(this.master);
    const steamNoise = ctx.createBufferSource();
    steamNoise.buffer = this.noise;
    steamNoise.loop = true;
    const steamBp = ctx.createBiquadFilter();
    steamBp.type = 'bandpass';
    steamBp.frequency.value = 2350;
    steamBp.Q.value = 0.85;
    steamNoise.connect(steamBp).connect(this.steamGain);
    steamNoise.start(0, 0.4);

    // Back-Station Deep-Fryer oil sizzle loop
    this.fryerGain = ctx.createGain();
    this.fryerGain.gain.value = 0;
    this.fryerGain.connect(this.cuesFilter);
    const fryNoise = ctx.createBufferSource();
    fryNoise.buffer = this.noise;
    fryNoise.loop = true;
    const fryBp = ctx.createBiquadFilter();
    fryBp.type = 'bandpass';
    fryBp.frequency.value = 2950;
    fryBp.Q.value = 0.9;
    fryNoise.connect(fryBp).connect(this.fryerGain);
    fryNoise.start(0, 0.85);

    // CCTV room mic floor
    this.cctvGain = ctx.createGain();
    this.cctvGain.gain.value = 0;
    this.cctvGain.connect(this.master);
    const cctvNoise = ctx.createBufferSource();
    cctvNoise.buffer = this.noise;
    cctvNoise.loop = true;
    const cctvBp = ctx.createBiquadFilter();
    cctvBp.type = 'bandpass';
    cctvBp.frequency.value = 1320;
    cctvBp.Q.value = 0.95;
    cctvNoise.connect(cctvBp).connect(this.cctvGain);
    cctvNoise.start();

    const roomAir = ctx.createBufferSource();
    roomAir.buffer = this.noise;
    roomAir.loop = true;
    this.roomFilter = ctx.createBiquadFilter();
    this.roomFilter.type = 'bandpass';
    this.roomGain = ctx.createGain();
    this.roomGain.gain.value = 0;
    const roomAmplitude = ctx.createGain();
    this.roomFlutter = ctx.createOscillator();
    this.roomFlutter.type = 'triangle';
    const flutterDepth = ctx.createGain();
    flutterDepth.gain.value = 0.36;
    this.roomFlutter.connect(flutterDepth).connect(roomAmplitude.gain);
    roomAir.connect(this.roomFilter).connect(roomAmplitude).connect(this.roomGain).connect(this.master);
    roomAir.start(0, 1.18);
    this.roomFlutter.start();

    // Fluorescent ballast hum
    this.lightGain = ctx.createGain();
    this.lightGain.gain.value = 0;
    this.lightGain.connect(this.master);
    const buzz1 = ctx.createOscillator();
    buzz1.type = 'sawtooth';
    buzz1.frequency.value = 99.8;
    const buzzFilter = ctx.createBiquadFilter();
    buzzFilter.type = 'bandpass';
    buzzFilter.frequency.value = 380;
    buzzFilter.Q.value = 2.4;
    buzz1.connect(buzzFilter).connect(this.lightGain);
    buzz1.start();

    // Sub-bass psychological horror tension bed
    this.tensionGain = ctx.createGain();
    this.tensionGain.gain.value = 0;
    this.tensionGain.connect(this.master);
    this.tensionGain.connect(this.reverbSend);
    const tSub = ctx.createOscillator();
    tSub.type = 'sine';
    tSub.frequency.value = 44;
    const tDis = ctx.createOscillator();
    tDis.type = 'sawtooth';
    tDis.frequency.value = 62.2;
    const tFilter = ctx.createBiquadFilter();
    tFilter.type = 'lowpass';
    tFilter.frequency.value = 260;
    const tDisGain = ctx.createGain();
    tDisGain.gain.value = 0.22;
    tSub.connect(this.tensionGain);
    tDis.connect(tDisGain).connect(tFilter).connect(this.tensionGain);
    tSub.start();
    tDis.start();

    // Cold 3:00 AM Imbiss title drone
    this.titleDroneGain = ctx.createGain();
    this.titleDroneGain.gain.value = 0;
    this.titleDroneGain.connect(this.master);
    const titleOsc1 = ctx.createOscillator();
    titleOsc1.type = 'sawtooth';
    titleOsc1.frequency.value = 51.9;
    const titleOsc2 = ctx.createOscillator();
    titleOsc2.type = 'triangle';
    titleOsc2.frequency.value = 77.8;
    const titleLfo = ctx.createOscillator();
    titleLfo.frequency.value = 0.16;
    const titleLfoGain = ctx.createGain();
    titleLfoGain.gain.value = 70;
    const titleFilter = ctx.createBiquadFilter();
    titleFilter.type = 'lowpass';
    titleFilter.frequency.value = 165;
    titleLfo.connect(titleLfoGain).connect(titleFilter.frequency);
    titleOsc1.connect(titleFilter);
    titleOsc2.connect(titleFilter);
    titleFilter.connect(this.titleDroneGain);
    titleOsc1.start();
    titleOsc2.start();
    titleLfo.start();

    this.mix();
  }

  mix() {
    if (!this.context) return;
    const now = this.context.currentTime;
    const base = !this.enabled ? 0 : this.activity === 'play' ? 0.92 : this.activity === 'title' ? 0.42 : 0.36;
    const level = base * this.volume;
    this.master.gain.setTargetAtTime(level, now, 0.08);
    if (this.titleDroneGain) {
      const titleOn = this.enabled && this.activity === 'title';
      this.titleDroneGain.gain.setTargetAtTime(titleOn ? 0.15 : 0, now, 0.22);
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, Number.isFinite(Number(val)) ? Number(val) : 0.85));
    this.mix();
  }

  setActivity(activity) {
    this.activity = activity;
    if (activity !== 'play') {
      this.stopJingle();
      this.stopSpeech();
      this.syncLoops(null);
    }
    this.mix();
  }

  toggle() {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem(AUDIO_PREFERENCE, this.enabled ? 'on' : 'off');
    } catch {
      // optional
    }
    if (!this.enabled) {
      this.stopJingle();
      this.stopSpeech();
    }
    this.open();
    this.mix();
  }

  route(source, panVal = 0, { wet = 0, distort = false, worldCue = false, rearOccluded = false } = {}) {
    const dest = distort
      ? this.distortBus
      : rearOccluded && this.rearBus
        ? this.rearBus
        : worldCue && this.cuesFilter
          ? this.cuesFilter
          : this.master;

    let output = source;
    if (typeof this.context.createStereoPanner === 'function') {
      output = this.context.createStereoPanner();
      output.pan.value = Math.max(-0.92, Math.min(0.92, panVal));
      source.connect(output);
    }
    output.connect(dest);
    let send = null;
    if (wet > 0) {
      send = this.context.createGain();
      send.gain.value = wet;
      output.connect(send).connect(this.reverbSend);
    }
    return () => {
      source.disconnect();
      if (output !== source) output.disconnect();
      send?.disconnect();
    };
  }

  playSample(buffer, gain = 0.4, panVal = 0, offset = 0, playbackRate = 1.0, opts = {}) {
    if (!this.context || !buffer) return;
    const ctx = this.context;
    const now = ctx.currentTime + offset;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = playbackRate;
    const env = ctx.createGain();
    env.gain.value = gain;
    src.connect(env);
    src.onended = this.route(env, panVal, opts);
    src.start(now);
  }

  async tryPlayOverrideCue(cueKey, panVal = 0) {
    if (!this.context) return false;
    const rawBytes = getSfxOverrideBytes(cueKey);
    if (!rawBytes) return false;
    try {
      let decoded = this.decodedOverrides.get(cueKey);
      if (!decoded) {
        decoded = await this.context.decodeAudioData(rawBytes.slice(0));
        this.decodedOverrides.set(cueKey, decoded);
      }
      if (!decoded) return false;
      const src = this.context.createBufferSource();
      src.buffer = decoded;
      const g = this.context.createGain();
      g.gain.value = 0.78;
      src.connect(g);
      src.onended = this.route(g, panVal, { wet: 0.12 });
      src.start();
      this.overrideSource = src;
      return true;
    } catch {
      return false;
    }
  }

  tone(freqStart, freqEnd, dur, gain, panVal = 0, offset = 0, type = 'sine', opts = {}) {
    if (!this.context) return;
    const ctx = this.context;
    const now = ctx.currentTime + offset;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(18, freqStart), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(18, freqEnd), now + dur);
    env.gain.setValueAtTime(0.0008, now);
    env.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), now + Math.min(0.018, dur * 0.18));
    env.gain.exponentialRampToValueAtTime(0.0008, now + dur);
    if (opts.formants) {
      for (const [frequency, q] of opts.formants) {
        const band = ctx.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.value = frequency;
        band.Q.value = q;
        osc.connect(band).connect(env);
      }
    } else {
      osc.connect(env);
    }
    if (opts.cassette && this.cassetteBus) {
      env.connect(this.cassetteBus);
      osc.onended = () => {
        osc.disconnect();
        env.disconnect();
      };
    } else {
      osc.onended = this.route(env, panVal, opts);
    }
    osc.start(now);
    osc.stop(now + dur + 0.04);
  }

  burst(freq, q, dur, gain, panVal = 0, offset = 0, opts = {}) {
    if (!this.context || !this.noise) return;
    const ctx = this.context;
    const now = ctx.currentTime + offset;
    const src = ctx.createBufferSource();
    const flt = ctx.createBiquadFilter();
    const env = ctx.createGain();
    src.buffer = this.noise;
    src.loop = true;
    flt.type = 'bandpass';
    flt.frequency.value = freq;
    flt.Q.value = q;
    env.gain.setValueAtTime(0.0008, now);
    const attack = Math.min(opts.attack ?? 0.006, dur * 0.6);
    env.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), now + attack);
    env.gain.exponentialRampToValueAtTime(0.0008, now + dur);
    src.connect(flt).connect(env);
    src.onended = this.route(env, panVal, opts);
    src.start(now, Math.random() * this.noise.duration);
    src.stop(now + dur + 0.04);
  }

  metal(frequency, strength, pan = 0, offset = 0, wet = 0.32, rearOccluded = false) {
    const strike = frequency * (0.94 + Math.random() * 0.12);
    this.burst(strike * 2.7, 0.7, 0.06, strength, pan, offset, { wet, rearOccluded });
    this.burst(strike, 7, 0.2, strength * 1.25, pan, offset, { wet, rearOccluded });
    this.burst(strike * 2.31, 15, 0.26, strength * 0.85, pan, offset + 0.012, { wet, rearOccluded });
  }

  footImpact(strength, pan, offset, heavy = false, rearOccluded = false) {
    const damp = { wet: 0.46, worldCue: true, rearOccluded };
    this.burst(heavy ? 310 : 450, 0.68, heavy ? 0.24 : 0.15, strength, pan, offset, damp);
    this.burst(heavy ? 660 : 1140, 1, 0.085, strength * 0.54, pan, offset + 0.016, damp);
  }

  /**
   * 300–2800 Hz Bandpass-Filtered Telephone / Cassette Murmur Cadence Synthesizer.
   * Zero `window.speechSynthesis` dependency; automatically plays real audio if mapped in overrides.json!
   */
  speakCassetteLine(text, night = 1) {
    if (!this.enabled || !this.context || !text) return;
    this.stopSpeech();

    const cueKey = `call_night${night}`;
    if (getSfxOverrideBytes(cueKey)) {
      this.tryPlayOverrideCue(cueKey, 0.22);
      return;
    }

    // Mechanical cassette CLICK-CLACK start + subtle tape hiss
    this.playSample(this.foley?.cassetteClick, 0.28, 0.22, 0);
    if (this.tapeHissGain) {
      this.tapeHissGain.gain.setTargetAtTime(night >= 4 ? 0.026 : 0.014, this.context.currentTime, 0.04);
    }

    const clean = text.replace(/\*[^*]+\*/g, '').replace(/[„“"—–]/g, ' ').trim();
    const words = clean.split(/\s+/).filter(Boolean).slice(0, 26);
    const vowelSets = [
      [[480, 4.5], [1180, 5.2]], // 'o'/'a'
      [[540, 4.2], [1780, 5.6]], // 'e'
      [[380, 4.8], [2150, 6.0]], // 'i'
      [[680, 4.0], [1120, 4.8]], // 'a'
    ];

    const warped = night >= 4;
    const baseF0 = night === 5 ? 92 : night === 4 ? 114 : 126;
    let cursor = 0.12;

    words.forEach((word, idx) => {
      const sylCount = Math.max(1, Math.min(3, Math.ceil(word.length / 3.5)));
      for (let s = 0; s < sylCount; s++) {
        const hash = (word.charCodeAt(s % word.length) + idx * 17 + s * 31) % 100;
        const dur = 0.075 + (hash % 5) * 0.014;
        const wow = warped ? Math.sin((cursor + s) * 6.5) * (night === 5 ? 18 : 9) : 0;
        const pitch = baseF0 + ((hash % 9) - 4) * 4.2 + wow;
        const formants = vowelSets[hash % vowelSets.length];
        const delayMs = Math.round(cursor * 1000);
        const timer = setTimeout(() => {
          if (!this.enabled || !this.context || this.context.state !== 'running') return;
          this.tone(pitch, pitch * (warped ? 0.88 : 0.96), dur, 0.14, 0.24, 0, 'sawtooth', {
            formants,
            cassette: true,
          });
        }, delayMs);
        this.phoneTimers.push(timer);
        cursor += dur + 0.024;
      }
      const hasPause = /[,.;:!?]/.test(word);
      cursor += hasPause ? 0.17 : 0.045;
    });

    const endTimer = setTimeout(() => {
      if (this.tapeHissGain && this.context) {
        this.tapeHissGain.gain.setTargetAtTime(0, this.context.currentTime, 0.08);
      }
      if (night >= 4) {
        this.playSample(this.foley?.cassetteClick, 0.22, 0.22, 0, 0.92);
      }
    }, Math.round((cursor + 0.18) * 1000));
    this.phoneTimers.push(endTimer);
  }

  stopSpeech() {
    for (const id of this.phoneTimers) clearTimeout(id);
    this.phoneTimers.length = 0;
    if (this.overrideSource) {
      try {
        this.overrideSource.stop();
      } catch {
        // ignore
      }
      this.overrideSource = null;
    }
    if (this.tapeHissGain && this.context) {
      this.tapeHissGain.gain.setTargetAtTime(0, this.context.currentTime, 0.04);
    }
  }

  ambience(cam, tense) {
    const room = CAMERA_AUDIO[cam];
    const pan = (Math.random() - 0.5) * 0.85;
    if (cam === '6') {
      for (const offset of [0, 0.09, 0.29, 0.38]) {
        this.burst(1600 + Math.random() * 720, 1.25, 0.072, 0.09, pan, offset);
      }
    } else if (cam === '1A') {
      this.burst(840, 3.2, 0.53, 0.12, pan, 0, { attack: 0.055, wet: 0.44 });
    } else if (cam === '5') {
      this.playSample(this.foley?.wetMascotRub, 0.18, pan, 0, 0.92, { wet: 0.36 });
    } else if (room) {
      this.burst(room.frequency * 1.45, 1.8, 1.1, 0.085, pan, 0, { attack: 0.18, wet: 0.45 });
    } else {
      this.burst(410, 1.05, 1.85, tense ? 0.21 : 0.14, pan, 0, { attack: 0.38, wet: 0.45 });
    }
  }

  syncLoops(run) {
    if (!this.context || !this.fanGain) return;
    const t = this.context.currentTime;
    const active = Boolean(this.enabled && run && run.state === 'playing' && !run.powerOutage);

    this.viewState = active ? (run.viewState || 'front') : 'front';
    this.lookSmooth = active && !run.monitorOpen ? (run.lookSmooth ?? run.lookX ?? 0) : 0;

    const camera = active && run.monitorOpen ? CAMERA_AUDIO[run.activeCam] : null;
    const disrupted = camera && feedIsInterrupted(run);
    const venting = active && (run.thermal?.ventingUntil ?? 0) > run.time;
    const underDesk = active && run.viewState === 'under_desk';
    const holdingBreath = underDesk && Boolean(run.holdingBreath);
    const frying = active && run.orders?.active?.fryerState === 'frying';

    // Fan quieter when turned away or under desk
    const fanTarget = !active || run.breakerTripped ? 0 : camera ? 0.055 : underDesk ? 0.09 : 0.18;
    this.fanGain.gain.setTargetAtTime(fanTarget, t, 0.08);

    if (this.steamGain) {
      this.steamGain.gain.setTargetAtTime(venting ? (camera ? 0.07 : 0.24) : 0, t, 0.06);
    }
    if (this.fryerGain) {
      const fryLevel = frying ? (this.viewState === 'back' ? 0.16 : 0.075) : 0;
      this.fryerGain.gain.setTargetAtTime(fryLevel, t, 0.08);
    }

    // Ear-pressure 420 Hz lowpass under desk holding breath; ~620 Hz during loud prep/steam!
    if (this.cuesFilter) {
      const cutoff = holdingBreath
        ? 420
        : underDesk
          ? 920
          : (venting || (active && (run.roomNoise || 0) > 0.45)) && !camera
            ? 620
            : 16000;
      this.cuesFilter.frequency.setTargetAtTime(cutoff, t, 0.08);
    }

    // Subtle heartbeat while crouched under desk holding breath!
    if (holdingBreath && t >= this.heartbeatAt) {
      const stress = 1 - (run.breath ?? 100) / 100;
      this.heartbeatAt = t + Math.max(0.48, 0.88 - stress * 0.36);
      this.playSample(this.foley?.heartbeat, 0.26 + stress * 0.22, 0, 0, 1 + stress * 0.12);
    }

    this.cctvGain.gain.setTargetAtTime(camera ? (disrupted ? 0.042 : 0.009) : 0, t, 0.05);
    this.roomGain.gain.setTargetAtTime(camera && !disrupted ? camera.gain : 0, t, 0.12);
    if (camera && camera !== this.cameraProfile) {
      this.roomFilter.frequency.setTargetAtTime(camera.frequency, t, 0.10);
      this.roomFilter.Q.setTargetAtTime(camera.q, t, 0.10);
      this.roomFlutter.frequency.setTargetAtTime(camera.flutter, t, 0.10);
    }
    this.cameraProfile = camera;

    const lightOn = active && !run.breakerTripped && (run.leftLight || run.rightLight);
    const flickerMod = lightOn ? (0.055 + (run.lightFlicker ?? 1) * 0.065) : 0;
    this.lightGain.gain.setTargetAtTime(flickerMod, t, 0.02);

    // Psychological tension drone swells when stalkers close in or in Overtime!
    let danger = active && run.overtime ? 0.55 : 0;
    if (active && run.animatronics) {
      const { anton, tom, torge, hauke } = run.animatronics;
      if (anton.room === 'left_door' || anton.room === 'office') danger += 0.5;
      if (tom.room === 'right_door' || tom.room === 'back_hatch' || tom.room === 'office') danger += 0.45;
      if (torge.room === 'center_near' || torge.room === 'center_mid' || torge.room === 'office') danger += 0.55;
      if (hauke.sprint.active) danger += 0.7;
      if (run.duck?.active || run.goldenActive) danger += 0.8;
    }
    this.tensionGain.gain.setTargetAtTime(Math.min(0.18, danger * 0.15), t, 0.28);

    if (this.enabled && run?.powerOutage?.phase === 'jingle' && this.context.state === 'running' && !this.jingleActive) {
      this.startJingle();
    }
  }

  startJingle() {
    this.stopJingle();
    if (!this.enabled || !this.context) return;
    this.jingleActive = true;
    this.jingleStep = 0;
    const playStep = () => {
      if (!this.jingleActive || !this.enabled || !this.context || this.context.state !== 'running') return;
      const [freq, dur] = TOREADOR_MELODY[this.jingleStep % TOREADOR_MELODY.length];
      this.jingleStep += 1;
      const wobble = 0.992 + Math.random() * 0.012;
      const { pan } = computeSpatialAudioParams(-0.6, this.viewState, this.lookSmooth, false);
      this.tone(freq * wobble, freq * wobble * 0.995, dur * 1.18, 0.16, pan, 0, 'sine', { wet: 0.7 });
      this.tone(freq * 2.004, freq * 1.995, dur * 0.55, 0.055, pan, 0, 'triangle', { wet: 0.5 });
      this.jingleTimeout = setTimeout(playStep, dur * 1000);
    };
    playStep();
  }

  stopJingle() {
    this.jingleActive = false;
    if (this.jingleTimeout) {
      clearTimeout(this.jingleTimeout);
      this.jingleTimeout = null;
    }
  }

  reset() {
    this.stopJingle();
    this.stopSpeech();
  }

  playJumpscareScream(who = 'torge') {
    const overrideKey = `jumpscare_${who}`;
    if (getSfxOverrideBytes(overrideKey)) {
      this.tryPlayOverrideCue(overrideKey, 0);
      return;
    }
    // Distinct multi-layered Jumpscare Scream per stalker (formant screech + distorted mid roar + sub-bass slam)
    const profiles = {
      torge: { base: 148, top: 820, formants: [[540, 4.2], [1160, 5.5], [2280, 6.2]], scrape: true },
      anton: { base: 196, top: 1180, formants: [[660, 4.8], [1640, 6.0], [2880, 7.0]], glitch: true },
      tom: { base: 174, top: 960, formants: [[610, 4.5], [1420, 5.5], [2540, 6.5]], cans: true },
      hauke: { base: 96, top: 540, formants: [[410, 3.8], [890, 4.8], [1780, 5.8]], slam: true },
      duck: { base: 118, top: 1340, formants: [[480, 5.5], [1080, 7.0], [2950, 8.0]], cloth: true },
    };
    const p = profiles[who] ?? profiles.torge;

    // 1. Sub-bass chest slam
    this.tone(82, 34, 0.95, 0.72, 0, 0, 'sine', { distort: true, wet: 0.35 });
    // 2. Distorted mid roar + dissonant formant screech
    this.tone(p.base, p.base * 0.78, 1.05, 0.56, 0, 0, 'sawtooth', {
      formants: p.formants,
      distort: true,
      wet: 0.42,
    });
    this.tone(p.top, p.top * 0.68, 0.92, 0.42, -0.18, 0.01, 'sawtooth', { distort: true, wet: 0.45 });
    this.tone(p.top * 1.07, p.top * 0.74, 0.88, 0.38, 0.18, 0.02, 'square', { distort: true, wet: 0.45 });
    this.burst(1950, 0.8, 0.96, 0.52, 0, 0, { attack: 0.004, distort: true, wet: 0.36 });

    if (p.scrape) this.playSample(this.foley?.castIronScrape, 0.55, 0.15, 0.02, 1.15, { distort: true });
    if (p.cans) this.playSample(this.foley?.canClink, 0.52, -0.2, 0.03, 0.95, { distort: true });
    if (p.cloth) this.playSample(this.foley?.wetMascotRub, 0.65, 0, 0, 1.1, { distort: true });
    if (p.slam) this.footImpact(0.75, 0, 0.02, true);
  }

  play(event) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const baseSide = event.side === 'left' ? -0.76 : event.side === 'right' ? 0.76 : (typeof event.pan === 'number' ? event.pan : 0);
    const isRear = Boolean(event.rear);
    const { pan: sidePan, behindListener } = computeSpatialAudioParams(baseSide, this.viewState, this.lookSmooth, isRear);

    switch (event.kind) {
      case 'whip_turn':
        this.burst(420, 1.1, 0.16, 0.22, event.to === 'back' ? 0.3 : -0.3, 0, { attack: 0.02 });
        break;
      case 'under_desk_enter':
        this.playSample(this.foley?.wetMascotRub, 0.26, 0, 0, 1.25);
        this.footImpact(0.22, 0, 0.08, false);
        break;
      case 'under_desk_exit':
        this.playSample(this.foley?.wetMascotRub, 0.20, 0, 0, 1.4);
        break;
      case 'breath_hold_start':
        this.burst(620, 1.8, 0.22, 0.14, 0, 0, { attack: 0.05 });
        break;
      case 'breath_gasp':
        this.burst(980, 1.4, 0.36, 0.42, 0, 0, { attack: 0.015, wet: 0.28 });
        this.tone(360, 240, 0.28, 0.20, 0, 0.02, 'triangle', { formants: [[620, 4], [1380, 5]] });
        break;
      case 'flashlight_click':
        this.playSample(this.foley?.cassetteClick, 0.24, 0, 0, event.on ? 1.35 : 1.05);
        break;
      case 'door':
        this.burst(520, 0.95, 0.44, 0.44, sidePan, 0, { attack: 0.05, wet: 0.36, rearOccluded: behindListener });
        this.footImpact(event.closed ? 0.54 : 0.32, sidePan, 0.26, true, behindListener);
        this.metal(event.closed ? 305 : 490, event.closed ? 0.44 : 0.26, sidePan, 0.26, 0.34, behindListener);
        break;
      case 'light':
        this.burst(1700, 0.9, 0.044, 0.19, sidePan, 0, { rearOccluded: behindListener });
        if (event.on) this.burst(760, 1.8, 0.14, 0.15, sidePan, 0.03, { rearOccluded: behindListener });
        break;
      case 'jammed':
        for (const off of [0, 0.16]) {
          this.tone(146, 138, 0.12, 0.34, sidePan, off, 'sawtooth', { distort: true, wet: 0.16 });
          this.tone(108, 102, 0.12, 0.30, sidePan, off, 'square', { wet: 0.12 });
        }
        break;
      case 'breaker_trip':
      case 'fuse_trip':
        this.playSample(this.foley?.breakerClunk, 0.52, sidePan, 0, 0.86, { rearOccluded: behindListener, wet: 0.3 });
        this.tone(118, 52, 0.55, 0.34, sidePan, 0.04, 'sawtooth', { distort: true });
        break;
      case 'breaker_reset':
      case 'fuse_reset':
        this.playSample(this.foley?.breakerClunk, 0.48, sidePan, 0, 1.12, { rearOccluded: behindListener, wet: 0.25 });
        this.tone(95, 198, 0.32, 0.18, sidePan, 0.06, 'triangle');
        break;
      case 'prep_doner_slice':
        this.tone(182, 196, 0.34, 0.16, -0.32, 0, 'sawtooth', { rearOccluded: behindListener });
        this.burst(2450, 2.2, 0.32, 0.14, -0.32, 0.02, { attack: 0.04, rearOccluded: behindListener });
        break;
      case 'prep_fryer_drop':
        this.metal(680, 0.22, 0, 0, 0.2, behindListener);
        this.burst(2800, 0.85, 0.65, 0.34, 0, 0.03, { attack: 0.02, rearOccluded: behindListener });
        break;
      case 'prep_fryer_ready':
        this.tone(1318.5, 1318.5, 0.14, 0.20, 0, 0, 'sine', { rearOccluded: behindListener, wet: 0.22 });
        this.tone(1318.5, 1318.5, 0.16, 0.20, 0, 0.18, 'sine', { rearOccluded: behindListener, wet: 0.22 });
        break;
      case 'prep_fryer_lift':
        this.metal(790, 0.20, 0, 0, 0.2, behindListener);
        break;
      case 'prep_spezi_pour':
        this.burst(3850, 1.3, 0.36, 0.18, 0.35, 0, { attack: 0.03, rearOccluded: behindListener });
        break;
      case 'prep_bag_done':
      case 'bon_stamped':
        this.playSample(this.foley?.bagCrinkle, 0.38, 0.32, 0, 1.0, { rearOccluded: behindListener });
        this.metal(940, 0.20, 0.32, 0.08, 0.25, behindListener);
        break;
      case 'prep_step_done':
        this.metal(820, 0.16, 0, 0, 0.18, behindListener);
        break;
      case 'overtime_start':
        for (const off of [0, 0.32, 0.64]) {
          this.tone(440, 415, 0.22, 0.28, 0, off, 'sawtooth', { wet: 0.42 });
        }
        break;
      case 'monitor_open':
        this.burst(580, 0.7, 0.15, 0.26, 0, 0, { attack: 0.025 });
        this.tone(2400, 4600, 0.12, 0.045, 0, 0.04, 'sine');
        break;
      case 'monitor_close':
        this.burst(860, 0.82, 0.12, 0.20);
        this.tone(3400, 1100, 0.10, 0.045, 0, 0.02, 'sine');
        break;
      case 'cam_blip': {
        const frequency = CAMERA_AUDIO[event.cam]?.frequency ?? 900;
        this.burst(1250 + frequency * 0.48, 1.2, 0.055, 0.14);
        break;
      }
      case 'cam_static_burst':
        this.burst(1370, 1.12, 0.21, 0.19);
        break;
      case 'anton_video_warning':
        this.tone(740, 740, 0.11, 0.20, 0, 0, 'sine', { wet: 0.22 });
        this.tone(988, 988, 0.13, 0.20, 0, 0.12, 'sine', { wet: 0.22 });
        this.tone(135, 130, 0.26, 0.16, 0, 0.04, 'triangle');
        break;
      case 'anton_video_dodged':
        this.burst(680, 1.35, 0.14, 0.16);
        break;
      case 'office_breach':
        this.tone(92, 48, 0.55, 0.38, sidePan, 0, 'sawtooth', { wet: 0.45, rearOccluded: behindListener });
        this.burst(1850, 1.2, 0.18, 0.24, sidePan, 0.02, { rearOccluded: behindListener });
        break;
      case 'anton_sweep_step':
        this.playSample(this.foley?.sneakerSqueak, 0.34, sidePan, 0, 0.96 + Math.random() * 0.08, {
          worldCue: true,
          wet: 0.35,
          rearOccluded: behindListener,
        });
        // Faint tinny phone speaker bleed
        this.burst(2450, 4.5, 0.12, 0.06, sidePan, 0.08, { worldCue: true });
        break;
      case 'hatch_clink':
        this.playSample(this.foley?.canClink, 0.46, sidePan, 0, 1.0, {
          worldCue: true,
          wet: 0.42,
          rearOccluded: behindListener,
        });
        this.metal(510, 0.20, sidePan, 0.18, 0.35, behindListener);
        break;
      case 'torge_repelled':
        this.playSample(this.foley?.castIronScrape, 0.48, 0, 0, 0.92, { wet: 0.5 });
        this.tone(116, 78, 0.42, 0.32, 0, 0.04, 'sawtooth', { formants: [[490, 4], [980, 5]], wet: 0.55 });
        break;
      case 'tom_repelled':
        this.playSample(this.foley?.canClink, 0.44, sidePan, 0, 1.15, { wet: 0.4, rearOccluded: behindListener });
        this.footImpact(0.36, sidePan, 0.12, false, behindListener);
        break;
      case 'duck_rustle':
      case 'duck_banished':
        this.playSample(this.foley?.wetMascotRub, 0.42, sidePan, 0, event.kind === 'duck_banished' ? 0.85 : 1.0, {
          wet: 0.38,
          rearOccluded: behindListener,
        });
        break;
      case 'salvage_creak':
        this.tone(240, 168, 0.24, 0.22, 0, 0, 'sawtooth', { formants: [[440, 6], [1120, 8]], wet: 0.35 });
        this.playSample(this.foley?.wetMascotRub, 0.24, 0, 0.03, 1.15);
        break;
      case 'cassette_start':
        this.speakCassetteLine('Prüfton aktiv. Beobachten Sie jede Haltungsänderung über den Tisch.', 4);
        break;
      case 'cassette_stop':
        this.playSample(this.foley?.cassetteClick, 0.26, 0, 0, 0.94);
        break;
      case 'clipboard_flip':
        this.playSample(this.foley?.bagCrinkle, 0.22, 0, 0, event.down ? 0.85 : 1.15);
        break;
      case 'relay_spark':
        this.burst(3400, 1.6, 0.07, 0.22, (Math.random() - 0.5) * 0.4);
        break;
      case 'curtain_stop':
        this.playSample(this.foley?.wetMascotRub, 0.36, 0, 0, 0.78, { wet: 0.45 });
        this.footImpact(0.42, 0, 0.04, true);
        break;
      case 'vhs_win':
        this.playSample(this.foley?.cassetteClick, 0.32, 0, 0);
        this.tone(523.25, 659.25, 0.45, 0.22, 0, 0.08, 'triangle', { wet: 0.4 });
        break;
      case 'window_sting':
      case 'danger_stinger':
        this.tone(110, 55, 0.85, 0.42, sidePan, 0, 'sawtooth', { distort: true, wet: 0.55 });
        this.tone(932.3, 918, 0.72, 0.24, sidePan, 0.005, 'sawtooth', { distort: true, wet: 0.62 });
        this.tone(987.8, 1002, 0.76, 0.24, sidePan, 0.01, 'sawtooth', { distort: true, wet: 0.62 });
        this.metal(520, 0.34, sidePan, 0.01, 0.62, behindListener);
        break;
      case 'door_approach':
      case 'door_knock':
        this.footImpact(0.45, sidePan, 0, true, behindListener);
        this.metal(315, 0.30, sidePan, 0.05, 0.42, behindListener);
        break;
      case 'training_knock':
        this.metal(370, 0.17, sidePan, 0, 0.3, behindListener);
        break;
      case 'kitchen_bell':
        this.metal(725, 0.30, 0.42, 0, 0.42);
        this.tone(683, 678, 0.37, 0.10, 0.42, 0.01, 'triangle', { wet: 0.35 });
        break;
      case 'steam_vent_start':
        this.metal(480, 0.22, -0.45, 0, 0.22, behindListener);
        this.burst(2400, 0.8, 0.55, 0.28, -0.45, 0.04, { attack: 0.04, wet: 0.35, rearOccluded: behindListener });
        break;
      case 'steam_burst':
        this.metal(390, 0.32, sidePan, 0, 0.35);
        this.burst(1950, 0.72, 0.85, 0.42, sidePan, 0.02, { attack: 0.02, wet: 0.52 });
        break;
      case 'overheat_alarm':
        for (const off of [0, 0.18, 0.36]) {
          this.tone(880, 820, 0.12, 0.22, -0.35, off, 'sawtooth', { wet: 0.3 });
        }
        break;
      case 'bon_printed':
        for (const off of [0, 0.07, 0.14]) {
          this.burst(2850, 2.2, 0.045, 0.15, 0.32, off, { rearOccluded: this.viewState !== 'back' });
        }
        break;
      case 'bon_missed':
        this.tone(310, 220, 0.24, 0.24, 0.32, 0, 'sawtooth', { wet: 0.35 });
        break;
      case 'ir_flash':
        this.burst(3200, 1.4, 0.08, 0.26, 0, 0);
        this.tone(1480, 2960, 0.26, 0.15, 0, 0.02, 'sine', { wet: 0.32 });
        break;
      case 'footstep': {
        const baseStrength = event.loud ? 0.52 : event.receding ? 0.19 : 0.28;
        if (event.who === 'tom') {
          this.footImpact(baseStrength, sidePan, 0, true, behindListener);
          this.playSample(this.foley?.canClink, baseStrength * 0.65, sidePan, 0.05, 0.96 + Math.random() * 0.08, {
            worldCue: true,
            wet: 0.45,
            rearOccluded: behindListener,
          });
        } else if (event.who === 'anton') {
          this.playSample(this.foley?.sneakerSqueak, baseStrength * 0.85, sidePan, 0, 0.95 + Math.random() * 0.1, {
            worldCue: true,
            wet: 0.42,
            rearOccluded: behindListener,
          });
        } else if (event.who === 'duck') {
          this.playSample(this.foley?.wetMascotRub, baseStrength * 0.9, sidePan, 0, 0.92, {
            worldCue: true,
            wet: 0.4,
            rearOccluded: behindListener,
          });
        } else {
          this.footImpact(baseStrength, sidePan, 0, true, behindListener);
        }
        break;
      }
      case 'sneak_in':
        this.burst(560, 1.35, 0.55, 0.28, sidePan, 0, { attack: 0.12, wet: 0.6, rearOccluded: behindListener });
        break;
      case 'office_breath':
        this.burst(740, 1.15, 0.59, 0.26, sidePan, 0, { attack: 0.17, wet: 0.22 });
        break;
      case 'hauke_hum': {
        const strength = event.loud ? 0.20 : 0.08;
        this.tone(98, 78, 0.81, strength, -0.52, 0.05, 'sawtooth', {
          wet: 0.54,
          formants: [[315, 2.8], [730, 5]],
        });
        break;
      }
      case 'hauke_curtain_open':
        this.burst(650, 1.1, 0.62, 0.24, -0.62, 0, { attack: 0.08, wet: 0.45 });
        break;
      case 'hauke_charge_start':
        this.burst(525, 0.76, 0.54, 0.35, -0.64, 0, { attack: 0.05, wet: 0.42 });
        break;
      case 'hauke_stomp': {
        const strength = 0.32 + Math.min(1, event.intensity ?? 0.7) * 0.36;
        const stompSpatial = computeSpatialAudioParams(-0.65, this.viewState, this.lookSmooth, false);
        this.footImpact(strength, stompSpatial.pan, 0, true, stompSpatial.behindListener);
        this.metal(620, strength * 0.25, stompSpatial.pan, 0.04, 0.32, stompSpatial.behindListener);
        break;
      }
      case 'hauke_door_slam':
        for (const [offset, strength] of [[0, 0.62], [0.22, 0.44], [0.46, 0.32]]) {
          this.footImpact(strength, sidePan, offset, true, behindListener);
          this.metal(330, strength * 0.72, sidePan, offset, 0.38, behindListener);
        }
        break;
      case 'torge_laugh': {
        const dist = event.distance ?? (event.close ? 0 : 2);
        const strength = dist === 0 ? 0.38 : dist === 1 ? 0.28 : 0.18;
        const centerSpatial = computeSpatialAudioParams(0, this.viewState, this.lookSmooth, false);
        const formants = [[510, 4.4], [1020, 5.1], [1880, 6.5]];
        this.playSample(this.foley?.castIronScrape, strength * 0.72, centerSpatial.pan, 0, 0.96, {
          worldCue: true,
          wet: 0.6,
          rearOccluded: centerSpatial.behindListener,
        });
        for (const [offset, pitch, length] of [[0.05, 118, 0.18], [0.29, 108, 0.22], [0.55, 98, 0.34]]) {
          this.tone(pitch, pitch * 0.78, length, strength, centerSpatial.pan, offset, 'sawtooth', {
            formants,
            wet: 0.72,
            worldCue: true,
            rearOccluded: centerSpatial.behindListener,
          });
        }
        break;
      }
      case 'kitchen_clatter': {
        const strength = event.loud ? 0.42 : 0.18;
        this.playSample(this.foley?.canClink, strength * 0.75, 0.45, 0, 0.9, { wet: 0.55 });
        this.metal(490, strength * 0.75, 0.38, 0.16, 0.54);
        break;
      }
      case 'torge_jingle_distant': {
        const g = event.loud ? 0.14 : 0.05;
        this.tone(392.00, 389, 0.42, g, 0.3, 0, 'sine', { wet: 0.85 });
        this.tone(440.00, 437, 0.28, g, 0.3, 0.34, 'sine', { wet: 0.85 });
        break;
      }
      case 'power_out':
        this.stopJingle();
        this.stopSpeech();
        this.playSample(this.foley?.breakerClunk, 0.55, 0, 0, 0.78);
        this.tone(140, 36, 1.35, 0.36, 0, 0.04, 'sawtooth', { wet: 0.42 });
        break;
      case 'torge_jingle_start':
        this.startJingle();
        break;
      case 'torge_jingle_stop':
        this.stopJingle();
        break;
      case 'phone_ring':
        for (const off of [0, 0.055, 0.11, 0.165, 0.55, 0.605, 0.66]) {
          this.metal(1320, 0.15, 0.28, off, 0.22);
        }
        this.speakCassetteLine(event.text, event.night);
        break;
      case 'phone_line':
        this.speakCassetteLine(event.text, event.night);
        break;
      case 'hour_tick':
        this.tone(523.25, 520, 0.32, 0.10, 0, 0, 'sine', { wet: 0.45 });
        break;
      case 'distant_calliope':
        for (const [off, f] of [[0, 523.25], [0.36, 622.25], [0.72, 587.33], [1.12, 493.88]]) {
          this.tone(f, f * 0.985, 0.38, 0.032, 0.35, off, 'triangle', { wet: 0.9 });
        }
        break;
      case 'achievement':
        this.tone(587.33, 587.33, 0.14, 0.16, 0, 0, 'triangle', { wet: 0.3 });
        this.tone(880.00, 880.00, 0.24, 0.16, 0, 0.12, 'triangle', { wet: 0.35 });
        break;
      case 'win_6am':
        this.stopJingle();
        this.stopSpeech();
        for (const [off, f, dur] of [
          [0.0, 659.25, 0.55],
          [0.52, 783.99, 0.55],
          [1.04, 587.33, 0.55],
          [1.56, 392.00, 1.15],
        ]) {
          this.tone(f, f * 0.998, dur, 0.24, 0, off, 'triangle', { wet: 0.65 });
        }
        break;
      case 'jumpscare':
        this.stopJingle();
        this.stopSpeech();
        this.playJumpscareScream(event.who);
        break;
      case 'gameover_static':
        this.burst(1150, 0.65, 1.2, 0.26, 0, 0, { attack: 0.02 });
        break;
      case 'honk':
      case 'duck_squeak':
        this.playSample(this.foley?.cassetteClick, 0.18, 0, 0, 1.2);
        break;
      case 'spezi_sip':
        this.burst(3600, 1.4, 0.28, 0.20, 0.22, 0);
        break;
      case 'spezi_empty':
        this.playSample(this.foley?.canClink, 0.26, 0.22, 0, 1.2);
        break;
      case 'ambience':
        this.ambience(event.cam, event.tense);
        break;
      default:
        break;
    }
  }
}
