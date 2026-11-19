const AUDIO_PREFERENCE = 'fnat.sound';

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
    this.activity = 'title';
    this.context = null;
    this.master = null;
    this.reverbSend = null;
    this.distortBus = null;
    this.fanGain = null;
    this.cctvGain = null;
    this.lightGain = null;
    this.tensionGain = null;
    this.titleDroneGain = null;
    this.fryerGain = null;
    this.jingleTimeout = null;
    this.jingleStep = 0;
    this.jingleActive = false;
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
    compressor.threshold.value = -14;
    compressor.knee.value = 10;
    compressor.ratio.value = 7;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.14;
    this.master.connect(compressor).connect(ctx.destination);

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

    // 1. Iconic FNAF Desk Fan hum (layered air rush + 58Hz motor + subtle blade chop)
    this.fanGain = ctx.createGain();
    this.fanGain.gain.value = 0;
    this.fanGain.connect(this.master);

    const fanAir = ctx.createBufferSource();
    fanAir.buffer = this.noise;
    fanAir.loop = true;
    const fanFilter = ctx.createBiquadFilter();
    fanFilter.type = 'bandpass';
    fanFilter.frequency.value = 175;
    fanFilter.Q.value = 0.95;
    const fanAirGain = ctx.createGain();
    fanAirGain.gain.value = 0.22;
    fanAir.connect(fanFilter).connect(fanAirGain).connect(this.fanGain);
    fanAir.start();

    const fanHum = ctx.createOscillator();
    fanHum.type = 'triangle';
    fanHum.frequency.value = 57.5;
    const fanHumGain = ctx.createGain();
    fanHumGain.gain.value = 0.075;
    fanHum.connect(fanHumGain).connect(this.fanGain);
    fanHum.start();

    // 2. CCTV Monitor static bed
    this.cctvGain = ctx.createGain();
    this.cctvGain.gain.value = 0;
    this.cctvGain.connect(this.master);

    const cctvNoise = ctx.createBufferSource();
    cctvNoise.buffer = this.noise;
    cctvNoise.loop = true;
    const cctvBp = ctx.createBiquadFilter();
    cctvBp.type = 'bandpass';
    cctvBp.frequency.value = 2650;
    cctvBp.Q.value = 0.72;
    cctvNoise.connect(cctvBp).connect(this.cctvGain);
    cctvNoise.start();

    // 3. Fluorescent Hall Light 120Hz ballast buzz (flickers with run.lightFlicker!)
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

    // 4. Dynamic Horror Tension Drone (swells when animatronics are right outside!)
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
    tFilter.frequency.value = 145;
    const tDisGain = ctx.createGain();
    tDisGain.gain.value = 0.25;
    tSub.connect(this.tensionGain);
    tDissonant.connect(tDisGain).connect(tFilter).connect(this.tensionGain);
    tSub.start();
    tDissonant.start();

    // 5. Eerie FNAF 1 Title Screen Industrial Drone
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

    // 6. Kitchen Fryer Sizzle bed (audible when listening on CAM 6!)
    this.fryerGain = ctx.createGain();
    this.fryerGain.gain.value = 0;
    this.fryerGain.connect(this.master);
    const fryerSrc = ctx.createBufferSource();
    fryerSrc.buffer = this.noise;
    fryerSrc.loop = true;
    const fryerHp = ctx.createBiquadFilter();
    fryerHp.type = 'highpass';
    fryerHp.frequency.value = 3400;
    fryerSrc.connect(fryerHp).connect(this.fryerGain);
    fryerSrc.start();

    this.mix();
  }

  mix() {
    if (!this.context) return;
    const now = this.context.currentTime;
    const level = !this.enabled ? 0 : this.activity === 'play' ? 0.88 : this.activity === 'title' ? 0.42 : 0.36;
    this.master.gain.setTargetAtTime(level, now, 0.08);
    if (this.titleDroneGain) {
      const titleOn = this.enabled && this.activity === 'title';
      this.titleDroneGain.gain.setTargetAtTime(titleOn ? 0.16 : 0, now, 0.22);
    }
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
    let dest = this.master;
    if (distort && this.distortBus) dest = this.distortBus;
    let panner = null;
    if (typeof this.context.createStereoPanner === 'function') {
      panner = this.context.createStereoPanner();
      panner.pan.value = Math.max(-0.92, Math.min(0.92, panVal));
      source.connect(panner).connect(dest);
      if (wet > 0 && this.reverbSend) {
        const wetGain = this.context.createGain();
        wetGain.gain.value = wet;
        panner.connect(wetGain).connect(this.reverbSend);
      }
    } else {
      source.connect(dest);
      if (wet > 0 && this.reverbSend) {
        const wetGain = this.context.createGain();
        wetGain.gain.value = wet;
        source.connect(wetGain).connect(this.reverbSend);
      }
    }
    return panner;
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
    osc.connect(env);
    const p = this.route(env, panVal, opts);
    osc.start(now);
    osc.stop(now + dur + 0.04);
    osc.onended = () => {
      env.disconnect();
      p?.disconnect();
    };
  }

  burst(freq, q, dur, gain, panVal = 0, offset = 0, opts = {}) {
    if (!this.context || !this.noise) return;
    const ctx = this.context;
    const now = ctx.currentTime + offset;
    const src = ctx.createBufferSource();
    const flt = ctx.createBiquadFilter();
    const env = ctx.createGain();
    src.buffer = this.noise;
    flt.type = 'bandpass';
    flt.frequency.value = freq;
    flt.Q.value = q;
    env.gain.setValueAtTime(0.0008, now);
    env.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), now + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0008, now + dur);
    src.connect(flt).connect(env);
    const p = this.route(env, panVal, opts);
    src.start(now, Math.random());
    src.stop(now + dur + 0.04);
    src.onended = () => {
      env.disconnect();
      p?.disconnect();
    };
  }

  speakPhoneLine(text, night = 1) {
    if (!this.enabled || !text) return;
    // Subtle cassette-tape radio speech pulse + optional German TTS when browser provides it
    const syllables = Math.min(7, Math.max(3, Math.floor(text.length / 18)));
    for (let i = 0; i < syllables; i++) {
      const f = night === 5 ? (95 + (i % 3) * 26) : (260 + (i % 4) * 58);
      this.tone(f, f * 0.9, 0.085, 0.035, 0.35, i * 0.11, 'triangle');
      this.burst(1450, 3.0, 0.07, 0.032, 0.35, i * 0.11);
    }
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

    this.fanGain.gain.setTargetAtTime(active ? (run.monitorOpen ? 0.14 : 0.34) : 0, t, 0.08);
    this.cctvGain.gain.setTargetAtTime(active && run.monitorOpen ? (run.camDisrupt > 0 ? 0.28 : 0.08) : 0, t, 0.04);

    // Fluorescent ballast sputters in sync with visual lightFlicker!
    const lightOn = active && (run.leftLight || run.rightLight);
    const flickerMod = lightOn ? (0.065 + (run.lightFlicker ?? 1) * 0.075) : 0;
    this.lightGain.gain.setTargetAtTime(flickerMod, t, 0.02);

    // Kitchen fryer sizzle audible on CAM 6
    const onKitchen = active && run.monitorOpen && run.activeCam === '6';
    this.fryerGain.gain.setTargetAtTime(onKitchen ? 0.075 : 0, t, 0.06);

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
    this.tensionGain.gain.setTargetAtTime(Math.min(0.24, danger * 0.22), t, 0.28);
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
    const sidePan = event.side === 'left' ? -0.78 : event.side === 'right' ? 0.78 : 0;

    switch (event.kind) {
      case 'door':
        // Heavy hydraulic steel roller shutter slam + hallway reverb
        this.tone(event.closed ? 155 : 90, event.closed ? 32 : 175, 0.3, 0.36, sidePan, 0, 'sawtooth', { wet: 0.45, distort: true });
        this.burst(460, 0.85, 0.28, 0.3, sidePan, 0, { wet: 0.45 });
        this.tone(52, 24, 0.28, 0.36, sidePan, 0.02, 'triangle');
        this.burst(1950, 2.2, 0.09, 0.14, sidePan, event.closed ? 0.16 : 0.04, { wet: 0.35 });
        break;
      case 'light':
        this.tone(event.on ? 960 : 620, event.on ? 1280 : 390, 0.04, 0.095, sidePan, 0, 'square');
        if (event.on) this.burst(2900, 1.8, 0.05, 0.065, sidePan);
        break;
      case 'jammed':
        // Dead broken switch rattle (instant FNAF dread!)
        this.tone(240, 120, 0.06, 0.2, sidePan, 0, 'square');
        this.tone(180, 95, 0.05, 0.16, sidePan, 0.06, 'square');
        this.burst(1900, 3.0, 0.04, 0.14, sidePan);
        break;
      case 'monitor_open':
        this.tone(320, 780, 0.09, 0.13, 0, 0, 'triangle');
        this.burst(2800, 1.0, 0.14, 0.18, 0);
        break;
      case 'monitor_close':
        this.tone(680, 240, 0.09, 0.12, 0, 0, 'triangle');
        this.burst(2100, 1.3, 0.1, 0.11, 0);
        break;
      case 'cam_blip':
        this.tone(1120, 1380, 0.042, 0.11, 0, 0, 'square');
        this.burst(3600, 1.4, 0.055, 0.12, 0);
        break;
      case 'cam_static_burst':
        this.burst(1750, 0.5, 0.65, 0.3, 0, 0, { distort: true });
        this.tone(92, 42, 0.38, 0.18, 0, 0.05, 'sawtooth', { wet: 0.4 });
        break;
      case 'window_sting':
        // Iconic FNAF 1 dissonant metallic horror discovery sting!!
        this.tone(277.18, 266, 0.85, 0.3, sidePan, 0, 'sawtooth', { wet: 0.75, distort: true });
        this.tone(293.66, 282, 0.85, 0.28, sidePan, 0, 'sawtooth', { wet: 0.75, distort: true });
        this.tone(587.33, 554.37, 0.75, 0.18, sidePan, 0.02, 'square', { wet: 0.7 });
        this.tone(68, 28, 0.65, 0.36, sidePan, 0, 'triangle');
        this.burst(1800, 1.1, 0.48, 0.26, sidePan, 0, { wet: 0.6 });
        break;
      case 'footstep':
        this.tone(86, 38, 0.18, event.loud ? 0.26 : 0.13, sidePan, 0, 'triangle', { wet: 0.55 });
        this.burst(340, 1.5, 0.13, event.loud ? 0.16 : 0.07, sidePan, 0, { wet: 0.4 });
        break;
      case 'sneak_in':
        this.tone(132, 54, 0.44, 0.22, sidePan, 0, 'sawtooth', { wet: 0.65 });
        this.burst(720, 1.8, 0.32, 0.16, sidePan, 0, { wet: 0.5 });
        break;
      case 'office_breath':
        // Terrifying raspy animatronic breathing behind your monitor!
        this.burst(680, 2.8, 0.55, 0.2, sidePan, 0, { wet: 0.55 });
        this.tone(118, 92, 0.52, 0.11, sidePan, 0.02, 'sawtooth', { wet: 0.5 });
        this.burst(540, 2.4, 0.48, 0.16, sidePan, 0.62, { wet: 0.55 });
        break;
      case 'hauke_hum': {
        // Pirate-Cove creepy muffled hum + hungry stomach rumble from CAM 1C!
        const g = event.loud ? 0.16 : 0.06;
        this.tone(110, 108, 0.26, g, -0.7, 0, 'triangle', { wet: 0.7 });
        this.tone(130.8, 128, 0.26, g, -0.7, 0.28, 'triangle', { wet: 0.7 });
        this.tone(146.8, 138, 0.38, g, -0.7, 0.56, 'triangle', { wet: 0.7 });
        this.tone(62, 42, 0.45, g * 1.1, -0.7, 0.12, 'sawtooth');
        break;
      }
      case 'hauke_curtain_open':
        this.burst(980, 0.85, 0.42, 0.2, -0.72, 0, { wet: 0.5 });
        this.tone(54, 28, 0.78, 0.28, -0.72, 0.04, 'triangle', { wet: 0.4 });
        break;
      case 'hauke_charge_start':
        this.tone(64, 26, 0.82, 0.38, -0.82, 0, 'sawtooth', { wet: 0.45, distort: true });
        this.burst(220, 0.75, 0.62, 0.28, -0.82, 0, { wet: 0.4 });
        break;
      case 'hauke_stomp': {
        // MASSIVE EARTHQUAKE SUB-BASS FOOTSTEPS + RATTLING SPEZI CAN & MUG!!
        const p = Math.min(1, event.intensity || 0.7);
        this.tone(58, 22, 0.28, 0.34 + p * 0.18, -0.75, 0, 'triangle', { wet: 0.35 });
        this.tone(36, 18, 0.32, 0.3 + p * 0.18, -0.75, 0.01, 'sine');
        this.burst(160, 1.1, 0.2, 0.2 + p * 0.12, -0.75, 0, { distort: true });
        // Desk Spezi can & ceramic mug clinking on wood!
        this.burst(2850, 2.4, 0.09, 0.09 + p * 0.12, 0.22, 0.03);
        this.tone(1620, 1140, 0.06, 0.05 + p * 0.06, 0.28, 0.04, 'triangle');
        this.tone(2180, 1720, 0.05, 0.035 + p * 0.045, 0.32, 0.08, 'sine');
        break;
      }
      case 'hauke_door_slam':
        // COLOSSAL 3-HIT EARTHQUAKE DOOR BANG!!
        for (let i = 0; i < 3; i++) {
          const off = i * 0.23;
          const decay = 1 - i * 0.16;
          this.tone(84, 20, 0.58, 0.48 * decay, -0.82, off, 'sawtooth', { wet: 0.55, distort: true });
          this.tone(210, 44, 0.36, 0.34 * decay, -0.82, off + 0.01, 'triangle', { wet: 0.5 });
          this.burst(680, 0.65, 0.42, 0.36 * decay, -0.82, off, { wet: 0.45 });
          this.tone(1480, 820, 0.12, 0.12 * decay, 0.2, off + 0.04, 'triangle');
        }
        break;
      case 'torge_laugh': {
        // Deep reverberant Freddy/Torge "Ho... ho... ho..." + metallic pan ring!
        const g = event.close ? 0.28 : 0.15;
        this.tone(142, 102, 0.18, g, 0.48, 0, 'sawtooth', { wet: 0.8 });
        this.tone(128, 92, 0.18, g, 0.48, 0.2, 'sawtooth', { wet: 0.8 });
        this.tone(114, 78, 0.26, g * 1.1, 0.48, 0.4, 'sawtooth', { wet: 0.85 });
        this.tone(540, 515, 0.48, g * 0.28, 0.48, 0.04, 'triangle', { wet: 0.75 });
        break;
      }
      case 'kitchen_clatter': {
        // CAM 6 Audio-Only aluminum pots, fryer clang & rolling Spezi cans!
        const g = event.loud ? 0.26 : 0.095;
        this.tone(860, 460, 0.16, g, 0.74, 0, 'triangle', { wet: 0.72 });
        this.burst(2150, 1.3, 0.26, g * 0.9, 0.74, 0.03, { wet: 0.6 });
        this.tone(1280, 740, 0.18, g * 0.85, 0.74, 0.19, 'sine', { wet: 0.7 });
        this.tone(610, 380, 0.14, g * 0.75, 0.65, 0.34, 'triangle', { wet: 0.65 });
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
        this.tone(245, 28, 1.35, 0.36, 0, 0, 'sawtooth', { wet: 0.6 });
        this.tone(122, 22, 1.4, 0.3, 0, 0.02, 'triangle', { wet: 0.5 });
        this.burst(480, 0.85, 0.75, 0.22, 0, 0, { wet: 0.5 });
        break;
      case 'torge_jingle_start':
        this.startJingle();
        break;
      case 'torge_jingle_stop':
        this.stopJingle();
        this.tone(76, 30, 0.42, 0.18, -0.55, 0, 'triangle', { wet: 0.6 });
        break;
      case 'duck_giggle':
        this.tone(660, 1080, 0.14, 0.2, 0, 0, 'triangle', { wet: 0.8 });
        this.tone(940, 520, 0.22, 0.2, 0, 0.15, 'triangle', { wet: 0.8 });
        this.tone(1320, 410, 0.3, 0.16, 0, 0.32, 'sine', { wet: 0.85 });
        break;
      case 'honk':
        this.tone(480, 640, 0.055, 0.22, 0, 0, 'triangle');
        this.tone(640, 385, 0.095, 0.2, 0, 0.05, 'triangle');
        break;
      case 'phone_ring':
        this.tone(440, 440, 0.28, 0.13, 0.35, 0, 'sine');
        this.tone(480, 480, 0.28, 0.11, 0.35, 0, 'sine');
        this.tone(440, 440, 0.28, 0.13, 0.35, 0.42, 'sine');
        this.tone(480, 480, 0.28, 0.11, 0.35, 0.42, 'sine');
        if (event.text) setTimeout(() => this.speakPhoneLine(event.text, event.night), 760);
        break;
      case 'phone_line':
        this.speakPhoneLine(event.text || '...', event.night);
        break;
      case 'ambience':
        this.tone(event.tense ? 58 : 82, event.tense ? 38 : 62, 2.2, event.tense ? 0.16 : 0.09, 0, 0, 'sine', { wet: 0.75 });
        this.burst(380, 2.4, 1.3, 0.06, (Math.random() - 0.5) * 1.4, 0, { wet: 0.65 });
        break;
      case 'hour_tick':
        this.tone(523.25, 520, 0.45, 0.085, 0, 0, 'sine', { wet: 0.6 });
        break;
      case 'jumpscare':
        this.stopJingle();
        this.stopSpeech();
        // BRUTAL DISTORTED FNAF 1 MULTI-LAYERED ANIMATRONIC SHRIEK!!
        this.tone(210, 960, 0.12, 0.46, 0, 0, 'sawtooth', { distort: true });
        this.tone(920, 310, 1.05, 0.46, -0.25, 0.06, 'sawtooth', { distort: true, wet: 0.45 });
        this.tone(985, 355, 1.05, 0.42, 0.25, 0.06, 'square', { distort: true, wet: 0.45 });
        this.tone(540, 190, 1.0, 0.38, 0, 0.08, 'sawtooth', { distort: true });
        this.tone(98, 26, 1.15, 0.52, 0, 0, 'triangle');
        this.burst(1750, 0.5, 1.15, 0.48, 0, 0, { distort: true, wet: 0.35 });
        if (event.who === 'hauke') {
          this.tone(48, 18, 1.2, 0.56, 0, 0, 'sawtooth', { distort: true });
        } else if (event.who === 'duck') {
          this.tone(1420, 520, 1.05, 0.46, 0, 0.03, 'sawtooth', { distort: true, wet: 0.6 });
        } else if (event.who === 'torge') {
          this.tone(310, 165, 1.0, 0.4, 0, 0.04, 'sawtooth', { distort: true, wet: 0.5 });
        }
        break;
      case 'gameover_static':
        this.burst(1850, 0.6, 1.5, 0.28, 0, 0, { distort: true });
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
