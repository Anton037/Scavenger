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
      if (this.context && this.context.state !== 'running') {
        this.context.resume().then(() => this.mix()).catch(() => {});
      }
    } catch {
      this.context = null;
    }
  }

  suspend() {
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
      case 'bonk':
        // Goldene Bratpfannen-SCHELLE!
        this.tone(240, 520, 0.08, 0.22, pan, 0, 'triangle');
        this.tone(680, 310, 0.26, 0.18, pan, 0.04, 'sine');
        this.rustle(1400, 2.2, 0.12, 0.14, pan);
        break;
      case 'stomp':
        // Boss Hauke heavy sub-bass footstep
        this.tone(68, 28, 0.24, 0.2, pan, 0, 'triangle');
        this.rustle(140, 1.4, 0.18, 0.1, pan);
        break;
      case 'steal':
        // Sneaky Schnorrer Tom giggle zip
        this.tone(540, 1180, 0.09, 0.12, pan, 0, 'sawtooth');
        this.tone(720, 1440, 0.11, 0.12, pan, 0.1, 'sawtooth');
        break;
      case 'can':
        this.tone(890, 620, 0.14, 0.09, pan, 0, 'triangle');
        this.tone(1240, 980, 0.18, 0.07, pan, 0.05, 'sine');
        break;
      case 'crown_drop':
        // Chef-Krone fliegt klirrend weg!
        this.tone(860, 320, 0.28, 0.22, pan, 0, 'triangle');
        this.tone(1420, 980, 0.14, 0.14, pan, 0.12, 'sine');
        this.rustle(1650, 1.5, 0.22, 0.14, pan);
        break;
      case 'crown_pickup':
        this.tone(523, 784, 0.16, 0.16, pan, 0, 'triangle');
        this.tone(784, 1046, 0.24, 0.14, pan, 0.08, 'sine');
        break;
      case 'charge_windup':
        // Bedrohliches Aufheulen vor Haukes Bauch-Ramme
        this.tone(75, 220, 0.55, 0.22, pan, 0, 'sawtooth');
        this.rustle(280, 1.8, 0.45, 0.12, pan);
        break;
      case 'wall_slam':
        // MASSIVER Wand-Einschlag + K.O.-Glocke!
        this.tone(95, 26, 0.48, 0.28, pan, 0, 'triangle');
        this.tone(1120, 880, 0.32, 0.12, pan, 0.06, 'sine');
        this.rustle(920, 0.7, 0.4, 0.22, pan);
        break;
      case 'dodge':
        this.tone(360, 740, 0.11, 0.12, pan, 0, 'sine');
        this.rustle(1900, 1.2, 0.1, 0.08, pan);
        break;
      case 'ko':
        // Dramatischer K.O.-Bass + Fresskoma-Posaune
        this.tone(180, 42, 0.65, 0.26, pan, 0, 'sawtooth');
        this.tone(520, 260, 0.28, 0.16, pan, 0.05, 'triangle');
        break;
      case 'crate_break':
        // Splitternde Holzkiste
        this.rustle(680, 0.85, 0.19, 0.18, pan);
        this.tone(175, 72, 0.16, 0.14, pan, 0, 'triangle');
        break;
      case 'chest_gold':
        // Goldene Chef-Truhe Jackpot!
        this.rustle(720, 0.9, 0.18, 0.15, pan);
        this.tone(523.25, 523.25, 0.14, 0.16, pan, 0, 'triangle');
        this.tone(659.25, 659.25, 0.16, 0.16, pan, 0.06, 'triangle');
        this.tone(783.99, 783.99, 0.18, 0.16, pan, 0.12, 'triangle');
        this.tone(1046.5, 1046.5, 0.34, 0.18, pan, 0.18, 'sine');
        break;
      case 'wave':
        // Nächste Welle / Arena-Horn
        this.tone(140, 210, 0.36, 0.16, 0, 0, 'triangle');
        this.tone(280, 420, 0.28, 0.11, 0, 0.08, 'sine');
        break;
      case 'gem':
        this.tone(680 + Math.random() * 240, 1020 + Math.random() * 240, 0.085, 0.075, pan, 0, 'sine');
        break;
      case 'heal':
        this.tone(440, 660, 0.14, 0.13, pan, 0, 'triangle');
        this.tone(660, 880, 0.18, 0.12, pan, 0.07, 'sine');
        break;
      case 'skewer':
        this.tone(720, 320, 0.075, 0.075, pan, 0, 'triangle');
        break;
      case 'spezi_boom':
        this.rustle(950, 0.65, 0.32, 0.2, pan);
        this.tone(140, 42, 0.34, 0.22, pan, 0, 'sawtooth');
        break;
      case 'levelup':
        this.tone(523.25, 523.25, 0.12, 0.16, 0, 0, 'triangle');
        this.tone(659.25, 659.25, 0.12, 0.16, 0, 0.06, 'triangle');
        this.tone(783.99, 783.99, 0.14, 0.16, 0, 0.12, 'triangle');
        this.tone(1046.5, 1046.5, 0.32, 0.19, 0, 0.18, 'sine');
        break;
      case 'duck_quack':
        // Riesiges Quietscheenten-QUAAAK + Boing!
        this.tone(920, 1480, 0.12, 0.22, pan, 0, 'sawtooth');
        this.tone(1360, 740, 0.18, 0.22, pan, 0.11, 'sawtooth');
        this.tone(1120, 560, 0.22, 0.2, pan, 0.27, 'triangle');
        this.tone(125, 38, 0.36, 0.24, pan, 0.05, 'triangle');
        break;
      case 'hauke_burp':
        // Massiver Kohlensäure-Mega-Rülps!
        this.tone(98, 42, 0.44, 0.26, pan, 0, 'sawtooth');
        this.tone(132, 54, 0.38, 0.18, pan, 0.09, 'sawtooth');
        this.rustle(420, 1.4, 0.35, 0.15, pan);
        break;
      case 'knobi':
        this.rustle(760, 1.1, 0.14, 0.09, pan);
        this.tone(240, 150, 0.11, 0.065, pan, 0, 'triangle');
        break;
      case 'chaos_event':
        // Imbiss-Durchsage Ding-Dong-Gong!
        this.tone(660, 660, 0.14, 0.16, 0, 0, 'triangle');
        this.tone(523.25, 523.25, 0.24, 0.16, 0, 0.14, 'triangle');
        this.tone(880, 440, 0.18, 0.12, 0, 0.28, 'sine');
        break;
      case 'ka_ching':
        // Kassen-Klingeln (Rekord geknackt / Barzahlung!)
        this.tone(1318.5, 1318.5, 0.08, 0.15, 0, 0, 'triangle');
        this.tone(1760, 2093, 0.28, 0.18, 0, 0.07, 'sine');
        this.rustle(3200, 2.2, 0.09, 0.08, 0);
        break;
      case 'slip':
        // Cartoon-Rutsch-Pfeife auf Öl/Pfütze!
        this.tone(320, 1280, 0.14, 0.12, pan, 0, 'sine');
        this.tone(1180, 420, 0.15, 0.1, pan, 0.12, 'sine');
        break;
      case 'evolve':
        // Legendäre Michelin-Stern Waffen-Evolution!
        this.tone(523.25, 523.25, 0.11, 0.18, 0, 0, 'triangle');
        this.tone(659.25, 659.25, 0.11, 0.18, 0, 0.07, 'triangle');
        this.tone(783.99, 783.99, 0.13, 0.18, 0, 0.14, 'triangle');
        this.tone(1046.5, 1046.5, 0.2, 0.2, 0, 0.21, 'sawtooth');
        this.tone(1318.5, 1568, 0.42, 0.22, 0, 0.3, 'sine');
        break;
      case 'combo_milestone':
        // Hype Kombo-Jingle!
        this.tone(587.3, 880, 0.11, 0.15, 0, 0, 'triangle');
        this.tone(880, 1174.6, 0.18, 0.16, 0, 0.09, 'sine');
        break;
      case 'reroll':
        this.tone(420, 680, 0.07, 0.11, 0, 0, 'triangle');
        this.rustle(1600, 1.4, 0.06, 0.07, 0);
        break;
      case 'upgrade':
        this.tone(587.3, 880, 0.1, 0.14, 0, 0, 'triangle');
        this.tone(880, 1174.6, 0.16, 0.13, 0, 0.06, 'sine');
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
      this.nextDrip = run.time + 1.6 + Math.random() * 3.6;
      const pan = Math.random() * 1.4 - 0.7;
      const biomeId = run.map?.biome?.id;
      const pitch = biomeId === 'freezer'
        ? 440 + Math.random() * 390
        : biomeId === 'furnace'
          ? 165 + Math.random() * 165
          : 265 + Math.random() * 320;
      this.tone(pitch, pitch * (biomeId === 'freezer' ? 0.82 : 0.51), 0.24, 0.035, pan);
      this.tone(pitch * 2.28, pitch * 2.22, 0.41, 0.013, pan, 0.08);
      if (biomeId === 'furnace') this.rustle(290, 1.4, 0.28, 0.025, pan);
    }
    const target = run.hauke && !run.hauke.dead ? run.hauke : run.listener;
    if (!target || target.dead) return;
    const gap = Math.hypot(target.x - run.player.x, target.z - run.player.z);
    if (gap < 6.5 && run.time > this.nextPulse) {
      const pressure = 1 - gap / 6.5;
      const pan = (target.x - run.player.x) / 8;
      this.nextPulse = run.time + 1.35 - pressure * 0.68;
      this.tone(71, 39, 0.22, 0.038 + pressure * 0.08, pan);
      this.tone(62, 37, 0.14, 0.027 + pressure * 0.047, pan, 0.16);
    }
  }
}
