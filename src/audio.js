const AUDIO_PREFERENCE = 'scavenger.sound';

function savedPreference() {
  try { return localStorage.getItem(AUDIO_PREFERENCE) !== 'off'; }
  catch { return true; }
}

export class Soundscape {
  constructor() {
    this.enabled = savedPreference();
    this.activity = 'title';
    this.nextDrip = 2;
    this.nextPulse = 0;
  }

  open() {
    if (!this.enabled) return;
    try {
      if (!this.context) this.build();
      this.context?.resume().catch(() => {});
    } catch {
      this.context = null;
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
    compressor.threshold.value = -19;
    this.master.connect(compressor).connect(ctx.destination);
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let index = 0; index < data.length; index++) data[index] = Math.random() * 2 - 1;

    const air = ctx.createBufferSource();
    air.buffer = this.noise;
    air.loop = true;
    const resonance = ctx.createBiquadFilter();
    resonance.type = 'bandpass';
    resonance.frequency.value = 131;
    resonance.Q.value = 0.93;
    const airGain = ctx.createGain();
    airGain.gain.value = 0.12;
    air.connect(resonance).connect(airGain).connect(this.master);
    air.start();

    const drone = ctx.createGain();
    drone.gain.value = 0.018;
    drone.connect(this.master);
    for (const [pitch, type] of [[43.65, 'sine'], [66.1, 'triangle'], [87.85, 'sine']]) {
      const tone = ctx.createOscillator();
      const mix = ctx.createGain();
      tone.type = type;
      tone.frequency.value = pitch;
      mix.gain.value = pitch > 60 ? 0.37 : 0.87;
      tone.connect(mix).connect(drone);
      tone.start();
    }
    const swell = ctx.createOscillator();
    const depth = ctx.createGain();
    swell.frequency.value = 0.12;
    depth.gain.value = 0.011;
    swell.connect(depth).connect(drone.gain);
    swell.start();
    this.mix();
  }

  mix() {
    if (!this.context) return;
    const level = !this.enabled || this.activity === 'title' ? 0 : this.activity === 'play' ? 0.76 : 0.22;
    this.master.gain.setTargetAtTime(level, this.context.currentTime, 0.12);
  }

  setActivity(activity) {
    this.activity = activity;
    this.mix();
  }

  toggle() {
    this.enabled = !this.enabled;
    try { localStorage.setItem(AUDIO_PREFERENCE, this.enabled ? 'on' : 'off'); } catch { /* storage is optional */ }
    this.open();
    this.mix();
  }

  pan(source, pan) {
    if (typeof this.context.createStereoPanner !== 'function') {
      source.connect(this.master);
      return null;
    }
    const panner = this.context.createStereoPanner();
    panner.pan.value = Math.min(0.85, Math.max(-0.85, pan));
    source.connect(panner).connect(this.master);
    return panner;
  }

  tone(pitch, fall, length, gain, pan = 0, offset = 0, shape = 'sine') {
    const ctx = this.context;
    const now = ctx.currentTime + offset;
    const wave = ctx.createOscillator();
    const envelope = ctx.createGain();
    wave.type = shape;
    wave.frequency.setValueAtTime(pitch, now);
    wave.frequency.exponentialRampToValueAtTime(fall, now + length);
    envelope.gain.setValueAtTime(0.001, now);
    envelope.gain.exponentialRampToValueAtTime(gain, now + Math.min(0.02, length * 0.2));
    envelope.gain.exponentialRampToValueAtTime(0.001, now + length);
    wave.connect(envelope);
    const panner = this.pan(envelope, pan);
    wave.start(now);
    wave.stop(now + length + 0.025);
    wave.onended = () => {
      envelope.disconnect();
      panner?.disconnect();
    };
  }

  rustle(pitch, q, length, gain, pan = 0) {
    const ctx = this.context;
    const now = ctx.currentTime;
    const brush = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const envelope = ctx.createGain();
    brush.buffer = this.noise;
    filter.type = 'bandpass';
    filter.frequency.value = pitch;
    filter.Q.value = q;
    envelope.gain.setValueAtTime(0.001, now);
    envelope.gain.exponentialRampToValueAtTime(gain, now + 0.014);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + length);
    brush.connect(filter).connect(envelope);
    const panner = this.pan(envelope, pan);
    brush.start(now, Math.random());
    brush.stop(now + length + 0.02);
    brush.onended = () => {
      envelope.disconnect();
      panner?.disconnect();
    };
  }

  play(event, player) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const pan = event.x == null ? 0 : (event.x - player.x) / 8;
    switch (event.kind) {
      case 'step':
        this.rustle(295, 0.9, 0.1, 0.06, pan);
        this.tone(128, 61, 0.1, 0.042, pan);
        break;
      case 'splash':
        this.rustle(1150, 0.7, 0.25, 0.12, pan);
        this.tone(284, 124, 0.15, 0.033, pan);
        break;
      case 'dash':
        this.rustle(590, 0.78, 0.32, 0.145, pan);
        this.tone(152, 44, 0.29, 0.095, pan);
        break;
      case 'shutter':
        this.tone(580, 210, 0.07, 0.065, 0, 0, 'triangle');
        this.rustle(2060, 1.4, 0.055, 0.055);
        break;
      case 'throw':
        this.tone(420, 880, 0.09, 0.08, 0, 0, 'sine');
        break;
      case 'clapper':
        // Rubber duck double-squeak!
        this.tone(980, 1420, 0.11, 0.14, pan, 0, 'triangle');
        this.tone(1320, 860, 0.14, 0.12, pan, 0.12, 'triangle');
        break;
      case 'bonk':
        // Hollow metallic wrench BONK!
        this.tone(240, 520, 0.08, 0.22, pan, 0, 'triangle');
        this.tone(680, 310, 0.26, 0.18, pan, 0.04, 'sine');
        this.rustle(1400, 2.2, 0.12, 0.14, pan);
        break;
      case 'slip':
        // Cartoon slide whistle + splash
        this.tone(920, 220, 0.34, 0.15, pan, 0, 'sine');
        this.rustle(1200, 0.8, 0.28, 0.14, pan);
        break;
      case 'stomp':
        // Boss Hauke heavy sub-bass footstep
        this.tone(68, 28, 0.24, 0.2, pan, 0, 'triangle');
        this.rustle(140, 1.4, 0.18, 0.1, pan);
        break;
      case 'steal':
        // Sneaky goblin giggle zip
        this.tone(540, 1180, 0.09, 0.12, pan, 0, 'sawtooth');
        this.tone(720, 1440, 0.11, 0.12, pan, 0.1, 'sawtooth');
        break;
      case 'toot':
        // Canned ravioli brass toot
        this.tone(115, 62, 0.28, 0.16, pan, 0, 'sawtooth');
        this.rustle(240, 1.8, 0.22, 0.09, pan);
        break;
      case 'can':
        this.tone(890, 620, 0.14, 0.09, pan, 0, 'triangle');
        this.tone(1240, 980, 0.18, 0.07, pan, 0.05, 'sine');
        break;
      case 'valve':
        this.rustle(1850, 0.65, 0.65, 0.22, pan);
        this.tone(180, 90, 0.45, 0.12, pan, 0, 'sawtooth');
        break;
      case 'record':
        this.tone(418, 414, 0.47, 0.079, pan, 0, 'triangle');
        this.tone(566, 562, 0.65, 0.05, pan, 0.08);
        break;
      case 'lift':
        this.tone(42, 59, 4.65, 0.23, pan, 0, 'triangle');
        this.tone(83, 103, 4.9, 0.089, pan, 0.12, 'sawtooth');
        this.rustle(187, 2.0, 0.8, 0.17, pan);
        break;
      case 'detected':
        this.tone(95, 43, 0.78, 0.24, pan, 0, 'triangle');
        this.rustle(530, 2.3, 0.53, 0.12, pan);
        break;
      case 'caught':
        this.tone(126, 29, 0.93, 0.27, 0, 0, 'triangle');
        this.rustle(550, 0.85, 0.89, 0.14);
        break;
      case 'escaped':
        this.tone(196, 201, 1.2, 0.19);
        this.tone(293.7, 292, 1.4, 0.1, 0, 0.26);
        break;
    }
  }

  reset() {
    this.nextDrip = 2;
    this.nextPulse = 0;
  }

  background(run) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    if (run.time > this.nextDrip) {
      this.nextDrip = run.time + 1.6 + Math.random() * 3.8;
      const pan = Math.random() * 1.4 - 0.7;
      const pitch = 265 + Math.random() * 320;
      this.tone(pitch, pitch * 0.51, 0.24, 0.035, pan);
      this.tone(pitch * 2.28, pitch * 2.22, 0.41, 0.013, pan, 0.08);
    }
    const gap = Math.hypot(run.listener.x - run.player.x, run.listener.z - run.player.z);
    if (gap < 6.5 && run.time > this.nextPulse) {
      const pressure = 1 - gap / 6.5;
      const pan = (run.listener.x - run.player.x) / 8;
      this.nextPulse = run.time + 1.35 - pressure * 0.68;
      this.tone(71, 39, 0.22, 0.038 + pressure * 0.08, pan);
      this.tone(62, 37, 0.14, 0.027 + pressure * 0.047, pan, 0.16);
    }
  }
}
