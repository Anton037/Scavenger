import { feedIsInterrupted } from './game.js';

const AUDIO_PREFERENCE = 'fnat.sound';

// Background sound picked up by each microphone. Interference is mixed separately.
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
  try { return localStorage.getItem(AUDIO_PREFERENCE) !== 'off'; }
  catch { return true; }
}

// Authentic Toreador March music-box motif (Hz) for Chef Torge's Power Outage!
const TOREADOR_MELODY = [
  [392.00, 0.42], [440.00, 0.22], [392.00, 0.22], [329.63, 0.44],
  [329.63, 0.44], [329.63, 0.22], [293.66, 0.22], [329.63, 0.22],
  [349.23, 0.22], [293.66, 0.66],
  [329.63, 0.42], [349.23, 0.22], [329.63, 0.22], [293.66, 0.44],
  [261.63, 0.44], [293.66, 0.22], [329.63, 0.22], [261.63, 0.66],
  [246.94, 0.42], [293.66, 0.22], [246.94, 0.22], [220.00, 0.44],
  [196.00, 0.66],
];

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
      // Slight metallic dark-hallway early reflections
      const early = i < ctx.sampleRate * 0.04 ? 1.45 : 1.0;
      data[i] = (Math.random() * 2 - 1) * env * early;
    }
  }
  return impulse;
}

export class Soundscape {
  constructor() {
    this.enabled = savedPreference();
    this.volume = 0.85;
    this.lookPanBias = 0;
    this.activity = 'title';
    this.context = null;
    this.master = null;
    this.reverbSend = null;
    this.distortBus = null;
    this.fanGain = null;
    this.cctvGain = null;
    this.cameraProfile = null;
    this.lightGain = null;
    this.tensionGain = null;
    this.titleDroneGain = null;
    this.jingleTimeout = null;
    this.jingleStep = 0;
    this.jingleActive = false;
    this.phoneTimeout = null;
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

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -13;
    compressor.knee.value = 10;
    compressor.ratio.value = 7;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.14;
    const rumbleCut = ctx.createBiquadFilter();
    rumbleCut.type = 'highpass';
    rumbleCut.frequency.value = 72;
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

    // Harsh distortion bus for jumpscares, slams, and window stings
    this.distortBus = ctx.createGain();
    this.distortBus.gain.value = 0.72;
    const shaper = ctx.createWaveShaper();
    shaper.curve = makeDistortionCurve(58);
    shaper.oversample = '2x';
    const distLowpass = ctx.createBiquadFilter();
    distLowpass.type = 'lowpass';
    distLowpass.frequency.value = 4600;
    this.distortBus.connect(shaper).connect(distLowpass).connect(this.master);
    distLowpass.connect(this.reverbSend);

    // Reusable 2.5s white noise buffer
    this.noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2.5), ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    // Desk fan with blade turbulence in the midrange.
    this.fanGain = ctx.createGain();
    this.fanGain.gain.value = 0;
    this.fanGain.connect(this.master);

    // Steam exhaust hiss loop when office valve is open
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

    const fanAir = ctx.createBufferSource();
    fanAir.buffer = this.noise;
    fanAir.loop = true;
    const fanFilter = ctx.createBiquadFilter();
    fanFilter.type = 'bandpass';
    fanFilter.frequency.value = 570;
    fanFilter.Q.value = 0.93;
    const fanAirGain = ctx.createGain();
    fanAirGain.gain.value = 0.48;
    const blades = ctx.createOscillator();
    blades.frequency.value = 12.3;
    const bladeDepth = ctx.createGain();
    bladeDepth.gain.value = 0.085;
    blades.connect(bladeDepth).connect(fanAirGain.gain);
    fanAir.connect(fanFilter).connect(fanAirGain).connect(this.fanGain);
    fanAir.start();
    blades.start();

    const fanHum = ctx.createOscillator();
    fanHum.type = 'triangle';
    fanHum.frequency.value = 57.5;
    const fanHumGain = ctx.createGain();
    fanHumGain.gain.value = 0.05;
    fanHum.connect(fanHumGain).connect(this.fanGain);
    fanHum.start();

    // A quiet electrical floor under the room mic.
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

    // Fluorescent ballast flickers in sync with the hall light.
    this.lightGain = ctx.createGain();
    this.lightGain.gain.value = 0;
    this.lightGain.connect(this.master);

    const buzz1 = ctx.createOscillator();
    buzz1.type = 'sawtooth';
    buzz1.frequency.value = 119.5;
    const buzz2 = ctx.createOscillator();
    buzz2.type = 'square';
    buzz2.frequency.value = 240.5;
    const buzzFilter = ctx.createBiquadFilter();
    buzzFilter.type = 'bandpass';
    buzzFilter.frequency.value = 420;
    buzzFilter.Q.value = 2.2;
    const buzzMix2 = ctx.createGain();
    buzzMix2.gain.value = 0.32;
    buzz1.connect(buzzFilter);
    buzz2.connect(buzzMix2).connect(buzzFilter);
    buzzFilter.connect(this.lightGain);
    buzz1.start();
    buzz2.start();

    // Low room resonance swells as threats get close.
    this.tensionGain = ctx.createGain();
    this.tensionGain.gain.value = 0;
    this.tensionGain.connect(this.master);
    this.tensionGain.connect(this.reverbSend);

    const tSub = ctx.createOscillator();
    tSub.type = 'sine';
    tSub.frequency.value = 46;
    const tDissonant = ctx.createOscillator();
    tDissonant.type = 'sawtooth';
    tDissonant.frequency.value = 65.4; // creepy tritone/dark fifth tension
    const tFilter = ctx.createBiquadFilter();
    tFilter.type = 'lowpass';
    tFilter.frequency.value = 330;
    const tDisGain = ctx.createGain();
    tDisGain.gain.value = 0.25;
    tSub.connect(this.tensionGain);
    tDissonant.connect(tDisGain).connect(tFilter).connect(this.tensionGain);
    tSub.start();
    tDissonant.start();

    // Title screen drone
    this.titleDroneGain = ctx.createGain();
    this.titleDroneGain.gain.value = 0;
    this.titleDroneGain.connect(this.master);

    const titleOsc1 = ctx.createOscillator();
    titleOsc1.type = 'sawtooth';
    titleOsc1.frequency.value = 55;
    const titleOsc2 = ctx.createOscillator();
    titleOsc2.type = 'triangle';
    titleOsc2.frequency.value = 82.4;
    const titleLfo = ctx.createOscillator();
    titleLfo.frequency.value = 0.22;
    const titleLfoGain = ctx.createGain();
    titleLfoGain.gain.value = 95;
    const titleFilter = ctx.createBiquadFilter();
    titleFilter.type = 'lowpass';
    titleFilter.frequency.value = 190;
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
    const base = !this.enabled ? 0 : this.activity === 'play' ? 0.92 : this.activity === 'title' ? 0.44 : 0.36;
    const level = base * this.volume;
    this.master.gain.setTargetAtTime(level, now, 0.08);
    if (this.titleDroneGain) {
      const titleOn = this.enabled && this.activity === 'title';
      this.titleDroneGain.gain.setTargetAtTime(titleOn ? 0.16 : 0, now, 0.22);
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
    try { localStorage.setItem(AUDIO_PREFERENCE, this.enabled ? 'on' : 'off'); } catch { /* optional */ }
    if (!this.enabled) {
      this.stopJingle();
      this.stopSpeech();
    }
    this.open();
    this.mix();
  }

  route(source, panVal = 0, { wet = 0, distort = false } = {}) {
    const dest = distort ? this.distortBus : this.master;
    let output = source;
    if (typeof this.context.createStereoPanner === 'function') {
      output = this.context.createStereoPanner();
      output.pan.value = Math.max(-0.85, Math.min(0.85, panVal));
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
    osc.onended = this.route(env, panVal, opts);
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

  metal(frequency, strength, pan = 0, offset = 0, wet = 0.32) {
    const strike = frequency * (0.94 + Math.random() * 0.12);
    // Inharmonic partials and a short broadband contact transient make a loose metallic hit.
    this.burst(strike * 2.7, 0.7, 0.06, strength, pan, offset, { wet });
    this.burst(strike, 7, 0.2, strength * 1.25, pan, offset, { wet });
    this.burst(strike * 2.31, 15, 0.26, strength * 0.85, pan, offset + 0.012, { wet });
  }

  footImpact(strength, pan, offset, heavy = false) {
    const damp = { wet: 0.46 };
    this.burst(heavy ? 330 : 470, 0.68, heavy ? 0.23 : 0.15, strength, pan, offset, damp);
    this.burst(heavy ? 690 : 1180, 1, 0.085, strength * 0.54, pan, offset + 0.016, damp);
    if (heavy) this.burst(1780, 2.2, 0.10, strength * 0.27, pan, offset + 0.065, damp);
  }

  ambience(cam, tense) {
    const room = CAMERA_AUDIO[cam];
    const pan = (Math.random() - 0.5) * 0.9;
    if (cam === '6') {
      // Oil spits underneath the longer clatter that signals someone in the kitchen.
      for (const offset of [0, 0.09, 0.29, 0.38]) {
        this.burst(1600 + Math.random() * 720, 1.25, 0.072, 0.09, pan, offset);
      }
    } else if (cam === '1A') {
      // Fleeting crackle from the stage PA.
      this.burst(840, 3.2, 0.53, 0.14, pan, 0, { attack: 0.055, wet: 0.44 });
      this.burst(2110, 1.6, 0.09, 0.095, pan, 0.24);
      this.burst(1280, 1.4, 0.12, 0.074, pan, 0.42);
    } else if (cam === '5') {
      this.burst(810, 1.6, 0.42, 0.14, pan, 0, { attack: 0.072, wet: 0.3 });
      this.metal(440, 0.13, pan, 0.32, 0.38);
    } else if (room) {
      this.burst(room.frequency * 1.45, 1.8, 1.1, 0.095, pan, 0, { attack: 0.18, wet: 0.45 });
      this.burst(room.frequency * 0.78, 2.4, 0.66, 0.085, pan, 0.31, { attack: 0.10, wet: 0.52 });
    } else if (Math.random() < 0.5) {
      // Airflow through the vent behind the desk.
      this.burst(420, 1.05, 1.95, tense ? 0.23 : 0.16, pan, 0, { attack: 0.38, wet: 0.45 });
      this.burst(930, 1.6, 1.24, 0.12, pan, 0.23, { attack: 0.27, wet: 0.36 });
    } else {
      // The refrigerator relay clicks, then the cabinet rattles.
      this.burst(1550, 2.8, 0.07, 0.10, pan);
      this.burst(310, 2.3, 1.15, 0.17, pan, 0.065, { attack: 0.18, wet: 0.38 });
    }
  }

  speakPhoneLine(text, night = 1) {
    if (!this.enabled || !text) return;
    // The on-screen subtitles carry the dialogue when no German system voice is available.
    this.burst(1480, 1.3, 0.13, 0.065, 0.25);
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function') {
        const synth = window.speechSynthesis;
        const voices = synth.getVoices?.() || [];
        const deVoice = voices.find((v) => /^de/i.test(v.lang));
        if (!deVoice) return;
        synth.cancel();
        const clean = text.replace(/[„“"*]/g, '');
        const utt = new SpeechSynthesisUtterance(clean);
        utt.voice = deVoice;
        utt.lang = deVoice.lang || 'de-DE';
        utt.rate = night === 5 ? 0.72 : 1.06;
        utt.pitch = night === 5 ? 0.52 : 0.94;
        utt.volume = 0.55;
        synth.speak(utt);
      }
    } catch {
      // ignore restricted TTS environments
    }
  }

  stopSpeech() {
    clearTimeout(this.phoneTimeout);
    this.phoneTimeout = null;
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore
    }
  }

  syncLoops(run) {
    if (!this.context || !this.fanGain) return;
    const t = this.context.currentTime;
    const active = Boolean(this.enabled && run && run.state === 'playing' && !run.powerOutage);
    this.lookPanBias = active && !run.monitorOpen ? -(run.lookSmooth ?? run.lookX ?? 0) * 0.28 : 0;

    const camera = active && run.monitorOpen ? CAMERA_AUDIO[run.activeCam] : null;
    const disrupted = camera && feedIsInterrupted(run);
    const venting = active && (run.thermal?.ventingUntil ?? 0) > run.time;
    this.fanGain.gain.setTargetAtTime(active ? (camera ? 0.065 : 0.21) : 0, t, 0.08);
    if (this.steamGain) {
      this.steamGain.gain.setTargetAtTime(venting ? (camera ? 0.07 : 0.22) : 0, t, 0.06);
    }
    this.cctvGain.gain.setTargetAtTime(camera ? (disrupted ? 0.042 : 0.009) : 0, t, 0.05);
    this.roomGain.gain.setTargetAtTime(camera && !disrupted ? camera.gain : 0, t, 0.12);
    if (camera && camera !== this.cameraProfile) {
      this.roomFilter.frequency.setTargetAtTime(camera.frequency, t, 0.10);
      this.roomFilter.Q.setTargetAtTime(camera.q, t, 0.10);
      this.roomFlutter.frequency.setTargetAtTime(camera.flutter, t, 0.10);
    }
    this.cameraProfile = camera;

    // Fluorescent ballast sputters in sync with visual lightFlicker!
    const lightOn = active && (run.leftLight || run.rightLight);
    const flickerMod = lightOn ? (0.065 + (run.lightFlicker ?? 1) * 0.075) : 0;
    this.lightGain.gain.setTargetAtTime(flickerMod, t, 0.02);

    // Dynamic horror tension bed swells when threats close in!
    let danger = 0;
    if (active && run.animatronics) {
      const { anton, tom, torge, hauke } = run.animatronics;
      if (anton.room === 'left_door' || anton.room === 'office') danger += 0.45;
      else if (anton.room === '2B') danger += 0.2;
      if (tom.room === 'right_door' || tom.room === 'office') danger += 0.45;
      else if (tom.room === '4B') danger += 0.2;
      if (torge.room === '4B' || torge.room === 'office') danger += 0.5;
      if (hauke.sprint.active) danger += 0.7;
      else if (hauke.stage >= 2) danger += 0.25;
      if (run.goldenActive) danger += 0.75;
    }
    this.tensionGain.gain.setTargetAtTime(Math.min(0.16, danger * 0.15), t, 0.28);
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
      // Eerie slightly detuned music-box tine pluck from left doorway with dark hallway reverb!
      const wobble = 0.994 + Math.random() * 0.01;
      this.tone(freq * wobble, freq * wobble * 0.996, dur * 1.18, 0.16, -0.6, 0, 'sine', { wet: 0.7 });
      this.tone(freq * 2.004, freq * 1.995, dur * 0.55, 0.055, -0.6, 0, 'triangle', { wet: 0.5 });
      this.tone(freq * 4.01, freq * 3.98, 0.06, 0.025, -0.6, 0, 'sine');
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

  play(event) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const rawPan = event.side === 'left' ? -0.76 : event.side === 'right' ? 0.76 : 0;
    const sidePan = Math.max(-0.88, Math.min(0.88, rawPan + (rawPan !== 0 ? this.lookPanBias : 0)));

    switch (event.kind) {
      case 'door':
        this.burst(520, 0.95, 0.46, 0.46, sidePan, 0, { attack: 0.055, wet: 0.36 });
        this.burst(1120, 2.1, 0.30, 0.17, sidePan, 0.034, { attack: 0.027, wet: 0.3 });
        this.footImpact(event.closed ? 0.52 : 0.34, sidePan, 0.29, true);
        this.metal(event.closed ? 315 : 500, event.closed ? 0.43 : 0.27, sidePan, 0.29);
        break;
      case 'light':
        this.burst(1700, 0.9, 0.044, 0.21, sidePan);
        if (event.on) this.burst(760, 1.8, 0.14, 0.16, sidePan, 0.032);
        break;
      case 'jammed':
        this.metal(530, 0.22, sidePan);
        this.metal(440, 0.14, sidePan, 0.12);
        break;
      case 'monitor_open':
        this.burst(580, 0.7, 0.16, 0.29, 0, 0, { attack: 0.035 });
        this.burst(1570, 1.1, 0.082, 0.16, 0, 0.072);
        break;
      case 'monitor_close':
        this.burst(860, 0.82, 0.12, 0.20);
        this.burst(350, 1.4, 0.105, 0.25, 0, 0.066);
        break;
      case 'cam_blip': {
        const frequency = CAMERA_AUDIO[event.cam]?.frequency ?? 900;
        this.burst(1250 + frequency * 0.48, 1.2, 0.06, 0.15);
        this.burst(frequency, 1.45, 0.095, 0.125, 0, 0.035);
        break;
      }
      case 'cam_static_burst':
        this.burst(1370, 1.12, 0.21, 0.20);
        this.burst(790, 1.2, 0.19, 0.12, 0, 0.26);
        break;
      case 'anton_video_warning':
        // Hilarious incoming video-call smartphone chime + buzz!
        this.tone(740, 740, 0.11, 0.22, 0, 0, 'sine', { wet: 0.22 });
        this.tone(988, 988, 0.13, 0.22, 0, 0.12, 'sine', { wet: 0.22 });
        this.tone(1175, 1175, 0.16, 0.2, 0, 0.26, 'sine', { wet: 0.22 });
        this.tone(135, 130, 0.26, 0.16, 0, 0.04, 'triangle');
        this.burst(1010, 1.1, 0.22, 0.14, 0, 0.42, { attack: 0.03 });
        break;
      case 'anton_video_dodged':
        this.burst(680, 1.35, 0.16, 0.17);
        break;
      case 'door_approach':
        this.footImpact(0.41, sidePan, 0, true);
        this.metal(345, 0.26, sidePan, 0.16);
        break;
      case 'training_knock':
        this.metal(370, 0.17, sidePan);
        this.metal(410, 0.14, sidePan, 0.18);
        break;
      case 'fuse_trip':
        this.burst(1810, 0.8, 0.15, 0.26);
        this.burst(860, 0.9, 0.31, 0.16, 0, 0.09);
        break;
      case 'fuse_reset':
        this.metal(520, 0.22);
        this.burst(720, 1.65, 0.46, 0.14, 0, 0.08, { attack: 0.12 });
        break;
      case 'kitchen_bell':
        this.metal(725, 0.30, 0.42, 0, 0.42);
        this.tone(683, 678, 0.37, 0.10, 0.42, 0.01, 'triangle', { wet: 0.35 });
        break;
      case 'steam_vent_start':
        this.metal(480, 0.22, -0.45, 0, 0.22);
        this.burst(2400, 0.8, 0.55, 0.28, -0.45, 0.04, { attack: 0.04, wet: 0.35 });
        break;
      case 'steam_burst':
        this.metal(390, 0.32, sidePan, 0, 0.35);
        this.burst(1950, 0.72, 0.85, 0.42, sidePan, 0.02, { attack: 0.02, wet: 0.52 });
        this.burst(720, 1.1, 0.65, 0.28, sidePan, 0.08, { attack: 0.05, wet: 0.45 });
        break;
      case 'overheat_alarm':
        for (const off of [0, 0.18, 0.36]) {
          this.tone(880, 820, 0.12, 0.22, -0.35, off, 'sawtooth', { wet: 0.3 });
        }
        this.burst(2100, 0.85, 0.7, 0.30, 0, 0.05, { attack: 0.04, wet: 0.4 });
        break;
      case 'bon_printed':
        for (const off of [0, 0.07, 0.14, 0.22]) {
          this.burst(2850, 2.2, 0.045, 0.16, 0.38, off);
        }
        this.tone(1046.5, 1318.5, 0.14, 0.16, 0.38, 0.28, 'triangle', { wet: 0.25 });
        break;
      case 'bon_stamped':
        this.metal(960, 0.25, 0.36, 0, 0.28);
        this.tone(659.25, 987.77, 0.20, 0.20, 0.36, 0.05, 'triangle', { wet: 0.35 });
        break;
      case 'bon_missed':
        this.tone(310, 220, 0.24, 0.24, 0.36, 0, 'sawtooth', { wet: 0.35 });
        this.tone(240, 175, 0.30, 0.24, 0.36, 0.22, 'sawtooth', { wet: 0.35 });
        break;
      case 'ir_flash':
        this.burst(3200, 1.4, 0.08, 0.26, 0, 0);
        this.tone(1480, 2960, 0.28, 0.16, 0, 0.02, 'sine', { wet: 0.32 });
        break;
      case 'window_sting':
        this.burst(860, 0.75, 0.52, 0.37, sidePan, 0, { attack: 0.076, wet: 0.58 });
        this.metal(event.who === 'tom' ? 405 : 520, 0.30, sidePan, 0.035, 0.63);
        this.burst(2450, 2.1, 0.18, 0.20, sidePan, 0.098, { wet: 0.45 });
        break;
      case 'footstep': {
        const strength = event.loud ? 0.51 : 0.25;
        if (event.who === 'tom') {
          this.burst(855, 1.35, 0.37, strength * 0.85, sidePan, 0, { attack: 0.085, wet: 0.5 });
          this.footImpact(strength, sidePan, 0.18, true);
        } else {
          this.footImpact(strength, sidePan, 0);
          this.footImpact(strength * 0.68, sidePan, 0.23 + Math.random() * 0.065);
        }
        break;
      }
      case 'sneak_in':
        this.burst(560, 1.35, 0.60, 0.29, sidePan, 0, { attack: 0.12, wet: 0.6 });
        this.burst(1450, 1.85, 0.20, 0.19, sidePan, 0.16, { attack: 0.045, wet: 0.38 });
        break;
      case 'office_breath':
        this.burst(740, 1.15, 0.59, 0.28, sidePan, 0, { attack: 0.17, wet: 0.22 });
        this.burst(490, 1.45, 0.72, 0.34, sidePan, 0.60, { attack: 0.20, wet: 0.28 });
        this.burst(1160, 2.3, 0.50, 0.15, sidePan, 0.67, { attack: 0.15, wet: 0.25 });
        break;
      case 'hauke_hum': {
        const strength = event.loud ? 0.21 : 0.082;
        this.burst(355, 2.3, 0.84, strength, -0.52, 0, { attack: 0.16, wet: 0.52 });
        this.tone(102, 81, 0.81, strength, -0.52, 0.08, 'sawtooth', {
          wet: 0.54, formants: [[315, 2.8], [730, 5]],
        });
        break;
      }
      case 'hauke_curtain_open':
        this.burst(650, 1.1, 0.67, 0.24, -0.62, 0, { attack: 0.086, wet: 0.45 });
        this.metal(620, 0.18, -0.55, 0.23);
        this.metal(510, 0.10, -0.55, 0.38);
        break;
      case 'hauke_charge_start':
        this.burst(525, 0.76, 0.54, 0.35, -0.64, 0, { attack: 0.050, wet: 0.42 });
        this.metal(305, 0.25, -0.53, 0.17);
        break;
      case 'hauke_stomp': {
        const strength = 0.3 + Math.min(1, event.intensity ?? 0.7) * 0.34;
        this.footImpact(strength, -0.65, 0, true);
        this.metal(640, strength * 0.28, 0.18, 0.04);
        break;
      }
      case 'hauke_door_slam':
        for (const [offset, strength] of [[0, 0.58], [0.23, 0.42], [0.49, 0.31]]) {
          this.footImpact(strength, -0.68, offset, true);
          this.metal(337, strength * 0.72, -0.59, offset);
        }
        break;
      case 'torge_laugh': {
        const strength = event.close ? 0.35 : 0.21;
        const formants = [[540, 4.4], [1080, 5.1], [1960, 6.5]];
        for (const [offset, pitch, length] of [[0, 126, 0.18], [0.26, 114, 0.23], [0.56, 122, 0.35]]) {
          this.tone(pitch, pitch * 0.78, length, strength, 0.42, offset, 'sawtooth', { formants, wet: 0.68 });
          this.burst(1190, 1.05, length, strength * 0.45, 0.42, offset + 0.025, { wet: 0.52 });
        }
        break;
      }
      case 'kitchen_clatter': {
        const strength = event.loud ? 0.43 : 0.19;
        this.metal(780, strength, 0.55, 0, 0.60);
        this.metal(490, strength * 0.79, 0.38, 0.14, 0.54);
        this.burst(1560, 0.9, 0.33, strength * 0.64, 0.48, 0.24, { attack: 0.043, wet: 0.48 });
        this.metal(780, strength * 0.45, 0.26, 0.47, 0.49);
        break;
      }
      case 'torge_jingle_distant': {
        const g = event.loud ? 0.15 : 0.055;
        this.tone(392.00, 389, 0.42, g, 0.7, 0, 'sine', { wet: 0.85 });
        this.tone(440.00, 437, 0.28, g, 0.7, 0.34, 'sine', { wet: 0.85 });
        this.tone(329.63, 326, 0.52, g, 0.7, 0.58, 'sine', { wet: 0.85 });
        break;
      }
      case 'power_out':
        this.stopJingle();
        this.stopSpeech();
        this.metal(460, 0.26);
        this.burst(560, 1.2, 1.4, 0.30, 0, 0.041, { attack: 0.07, wet: 0.42 });
        this.burst(240, 1.3, 0.72, 0.22, 0, 0.23, { attack: 0.13, wet: 0.4 });
        break;
      case 'torge_jingle_start':
        this.startJingle();
        break;
      case 'torge_jingle_stop':
        this.stopJingle();
        this.tone(76, 30, 0.42, 0.18, -0.55, 0, 'triangle', { wet: 0.6 });
        break;
      case 'duck_giggle':
        this.tone(245, 188, 0.21, 0.23, 0, 0, 'sawtooth', { formants: [[660, 4], [1740, 5]], wet: 0.6 });
        this.tone(290, 170, 0.29, 0.21, 0, 0.22, 'sawtooth', { formants: [[730, 5], [1640, 4]], wet: 0.65 });
        break;
      case 'honk':
        this.tone(272, 209, 0.20, 0.32, 0, 0, 'sawtooth', { formants: [[710, 2.2], [1130, 4.2]] });
        break;
      case 'spezi_sip':
        // Crisp Spezi pull-tab click + fizzy carbonation hiss!
        this.metal(1420, 0.18, 0.22, 0, 0.14);
        this.burst(3400, 0.85, 0.36, 0.19, 0.22, 0.05, { attack: 0.03, wet: 0.18 });
        break;
      case 'duck_squeak':
        // Playful rubber duck squeak!
        this.tone(680, 1080, 0.08, 0.22, 0.28, 0, 'triangle');
        this.tone(1080, 620, 0.11, 0.18, 0.28, 0.08, 'triangle');
        break;
      case 'achievement':
        // Imbiss cash-register ka-ching!
        this.metal(1180, 0.26, 0, 0, 0.38);
        this.tone(880, 880, 0.22, 0.18, 0, 0.04, 'triangle', { wet: 0.45 });
        this.tone(1318.5, 1318.5, 0.42, 0.22, 0, 0.14, 'triangle', { wet: 0.55 });
        break;
      case 'phone_ring':
        for (const offset of [0, 0.058, 0.116, 0.4, 0.458, 0.516]) this.metal(570, 0.19, 0.27, offset, 0.12);
        if (event.text) {
          clearTimeout(this.phoneTimeout);
          this.phoneTimeout = setTimeout(() => {
            this.phoneTimeout = null;
            this.speakPhoneLine(event.text, event.night);
          }, 760);
        }
        break;
      case 'phone_line':
        this.speakPhoneLine(event.text || '...', event.night);
        break;
      case 'ambience':
        this.ambience(event.cam, event.tense);
        break;
      case 'hour_tick':
        this.metal(460, 0.14, 0.25);
        break;
      case 'jumpscare': {
        this.stopJingle();
        this.stopSpeech();
        const pitch = { hauke: 106, torge: 137, anton: 163, tom: 190, duck: 225 }[event.who] ?? 160;
        if (event.cause === 'video') {
          this.burst(1280, 0.62, 0.31, 0.43);
          this.tone(pitch * 1.35, pitch * 0.74, 0.74, 0.36, 0, 0.095, 'sawtooth', {
            formants: [[810, 3.0], [1680, 3.5]], distort: true, wet: 0.14,
          });
          break;
        }
        this.burst(850, 0.67, 0.72, 0.48, 0, 0, { distort: true, wet: 0.24 });
        this.tone(pitch, pitch * 0.68, 0.95, 0.45, 0, 0.015, 'sawtooth', {
          formants: [[590, 3.3], [1370, 3.1], [2710, 4]], distort: true, wet: 0.40,
        });
        this.burst(1580, 1.1, 0.73, 0.25, 0, 0.13, { attack: 0.10, wet: 0.37 });
        break;
      }
      case 'gameover_static':
        this.burst(1220, 0.92, 0.54, 0.14);
        break;
      case 'win_6am':
        this.stopJingle();
        this.stopSpeech();
        // Classic 6:00 AM Westminster Grandfather Clock Chimes + warm reverb + cheering!
        this.tone(523.25, 523.25, 0.62, 0.26, 0, 0.0, 'triangle', { wet: 0.75 });
        this.tone(440.00, 440.00, 0.62, 0.26, 0, 0.52, 'triangle', { wet: 0.75 });
        this.tone(493.88, 493.88, 0.62, 0.26, 0, 1.04, 'triangle', { wet: 0.75 });
        this.tone(329.63, 329.63, 1.05, 0.28, 0, 1.56, 'triangle', { wet: 0.8 });
        this.tone(329.63, 329.63, 0.6, 0.24, 0, 2.55, 'sine', { wet: 0.75 });
        this.tone(493.88, 493.88, 0.6, 0.24, 0, 3.05, 'sine', { wet: 0.75 });
        this.tone(440.00, 440.00, 0.6, 0.24, 0, 3.55, 'sine', { wet: 0.75 });
        this.tone(523.25, 523.25, 1.4, 0.3, 0, 4.05, 'triangle', { wet: 0.85 });
        // Celebratory crowd cheer swell!
        this.burst(1150, 0.65, 1.6, 0.14, 0, 3.9, { wet: 0.6 });
        this.tone(659.25, 783.99, 0.45, 0.12, -0.35, 4.1, 'sine', { wet: 0.6 });
        this.tone(783.99, 1046.5, 0.55, 0.12, 0.35, 4.2, 'sine', { wet: 0.6 });
        break;
    }
  }
}
