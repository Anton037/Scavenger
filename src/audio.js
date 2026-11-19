const AUDIO_PREFERENCE = 'fnat.sound';

function savedPreference() {
  try { return localStorage.getItem(AUDIO_PREFERENCE) !== 'off'; }
  catch { return true; }
}

// Eerie Toreador-inspired music-box melody for Chef Torge Power Outage (Hz)
const JINGLE_NOTES = [
  329.63, 392.00, 329.63, 293.66, 261.63, 293.66, 329.63, 261.63,
  246.94, 293.66, 246.94, 220.00, 196.00, 220.00, 246.94, 196.00,
];

export class Soundscape {
  constructor() {
    this.enabled = savedPreference();
    this.activity = 'title';
    this.context = null;
    this.master = null;
    this.fanGain = null;
    this.cctvGain = null;
    this.lightGain = null;
    this.jingleTimer = null;
    this.jingleStep = 0;
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
    compressor.threshold.value = -16;
    compressor.ratio.value = 6;
    this.master.connect(compressor).connect(ctx.destination);

    // White noise buffer (2s loop)
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    // 1. Iconic FNAF Desk Fan hum (bandpass noise + 58Hz motor)
    this.fanGain = ctx.createGain();
    this.fanGain.gain.value = 0;
    this.fanGain.connect(this.master);

    const fanAir = ctx.createBufferSource();
    fanAir.buffer = this.noise;
    fanAir.loop = true;
    const fanFilter = ctx.createBiquadFilter();
    fanFilter.type = 'bandpass';
    fanFilter.frequency.value = 185;
    fanFilter.Q.value = 1.1;
    const fanAirGain = ctx.createGain();
    fanAirGain.gain.value = 0.24;
    fanAir.connect(fanFilter).connect(fanAirGain).connect(this.fanGain);
    fanAir.start();

    const fanHum = ctx.createOscillator();
    fanHum.type = 'triangle';
    fanHum.frequency.value = 58;
    const fanHumGain = ctx.createGain();
    fanHumGain.gain.value = 0.08;
    fanHum.connect(fanHumGain).connect(this.fanGain);
    fanHum.start();

    // 2. CCTV Monitor static bed
    this.cctvGain = ctx.createGain();
    this.cctvGain.gain.value = 0;
    this.cctvGain.connect(this.master);

    const cctvNoise = ctx.createBufferSource();
    cctvNoise.buffer = this.noise;
    cctvNoise.loop = true;
    const cctvHp = ctx.createBiquadFilter();
    cctvHp.type = 'bandpass';
    cctvHp.frequency.value = 2400;
    cctvHp.Q.value = 0.8;
    cctvNoise.connect(cctvHp).connect(this.cctvGain);
    cctvNoise.start();

    // 3. Fluorescent Hall Light 60Hz electrical buzz
    this.lightGain = ctx.createGain();
    this.lightGain.gain.value = 0;
    this.lightGain.connect(this.master);

    const buzz = ctx.createOscillator();
    buzz.type = 'sawtooth';
    buzz.frequency.value = 120;
    const buzzFilter = ctx.createBiquadFilter();
    buzzFilter.type = 'bandpass';
    buzzFilter.frequency.value = 340;
    buzzFilter.Q.value = 2.5;
    buzz.connect(buzzFilter).connect(this.lightGain);
    buzz.start();

    this.mix();
  }

  mix() {
    if (!this.context) return;
    const level = !this.enabled ? 0 : this.activity === 'play' ? 0.84 : this.activity === 'title' ? 0.24 : 0.35;
    this.master.gain.setTargetAtTime(level, this.context.currentTime, 0.08);
  }

  setActivity(activity) {
    this.activity = activity;
    if (activity !== 'play') {
      this.stopJingle();
      this.syncLoops(null);
    }
    this.mix();
  }

  toggle() {
    this.enabled = !this.enabled;
    try { localStorage.setItem(AUDIO_PREFERENCE, this.enabled ? 'on' : 'off'); } catch { /* optional */ }
    if (!this.enabled) this.stopJingle();
    this.open();
    this.mix();
  }

  pan(source, panVal) {
    if (typeof this.context.createStereoPanner !== 'function') {
      source.connect(this.master);
      return null;
    }
    const p = this.context.createStereoPanner();
    p.pan.value = Math.max(-0.9, Math.min(0.9, panVal));
    source.connect(p).connect(this.master);
    return p;
  }

  tone(freqStart, freqEnd, dur, gain, panVal = 0, offset = 0, type = 'sine') {
    if (!this.context) return;
    const ctx = this.context;
    const now = ctx.currentTime + offset;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freqStart), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + dur);
    env.gain.setValueAtTime(0.0008, now);
    env.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), now + Math.min(0.018, dur * 0.2));
    env.gain.exponentialRampToValueAtTime(0.0008, now + dur);
    osc.connect(env);
    const p = this.pan(env, panVal);
    osc.start(now);
    osc.stop(now + dur + 0.03);
    osc.onended = () => {
      env.disconnect();
      p?.disconnect();
    };
  }

  burst(freq, q, dur, gain, panVal = 0, offset = 0) {
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
    const p = this.pan(env, panVal);
    src.start(now, Math.random());
    src.stop(now + dur + 0.03);
    src.onended = () => {
      env.disconnect();
      p?.disconnect();
    };
  }

  syncLoops(run) {
    if (!this.context || !this.fanGain) return;
    const t = this.context.currentTime;
    const active = Boolean(this.enabled && run && run.state === 'playing' && !run.powerOutage);
    this.fanGain.gain.setTargetAtTime(active ? (run.monitorOpen ? 0.16 : 0.34) : 0, t, 0.08);
    this.cctvGain.gain.setTargetAtTime(active && run.monitorOpen ? (run.camDisrupt > 0 ? 0.24 : 0.075) : 0, t, 0.04);
    this.lightGain.gain.setTargetAtTime(active && (run.leftLight || run.rightLight) ? 0.12 : 0, t, 0.03);
  }

  startJingle() {
    this.stopJingle();
    if (!this.enabled || !this.context) return;
    this.jingleStep = 0;
    const playStep = () => {
      if (!this.enabled || !this.context || this.context.state !== 'running') return;
      const note = JINGLE_NOTES[this.jingleStep % JINGLE_NOTES.length];
      this.jingleStep += 1;
      // Creepy slightly detuned music box chime from left doorway!
      this.tone(note, note * 0.996, 0.52, 0.14, -0.55, 0, 'sine');
      this.tone(note * 2, note * 1.99, 0.22, 0.045, -0.55, 0, 'triangle');
    };
    playStep();
    this.jingleTimer = setInterval(playStep, 430);
  }

  stopJingle() {
    if (this.jingleTimer) {
      clearInterval(this.jingleTimer);
      this.jingleTimer = null;
    }
  }

  reset() {
    this.stopJingle();
  }

  play(event) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const sidePan = event.side === 'left' ? -0.72 : event.side === 'right' ? 0.72 : 0;

    switch (event.kind) {
      case 'door':
        // Heavy hydraulic steel shutter slam
        this.tone(event.closed ? 145 : 95, event.closed ? 36 : 165, 0.28, 0.34, sidePan, 0, 'sawtooth');
        this.burst(420, 0.85, 0.24, 0.26, sidePan);
        this.tone(55, 28, 0.22, 0.28, sidePan, 0.02, 'triangle');
        break;
      case 'light':
        this.tone(event.on ? 920 : 620, event.on ? 1240 : 410, 0.045, 0.09, sidePan, 0, 'square');
        break;
      case 'jammed':
        // Dead broken switch click (pure FNAF dread!)
        this.tone(240, 140, 0.055, 0.18, sidePan, 0, 'square');
        this.burst(1800, 3.0, 0.04, 0.12, sidePan);
        break;
      case 'monitor_open':
        this.tone(360, 740, 0.08, 0.12, 0, 0, 'triangle');
        this.burst(2800, 1.1, 0.12, 0.14, 0);
        break;
      case 'monitor_close':
        this.tone(640, 260, 0.08, 0.11, 0, 0, 'triangle');
        this.burst(1900, 1.4, 0.08, 0.09, 0);
        break;
      case 'cam_blip':
        this.tone(1080, 1320, 0.045, 0.1, 0, 0, 'square');
        this.burst(3400, 1.4, 0.06, 0.1, 0);
        break;
      case 'cam_static_burst':
        this.burst(1800, 0.55, 0.55, 0.24, 0);
        this.tone(92, 46, 0.32, 0.16, 0, 0.06, 'sawtooth');
        break;
      case 'window_sting':
        // Iconic FNAF horror discovery sting!
        this.tone(290, 275, 0.65, 0.28, sidePan, 0, 'sawtooth');
        this.tone(308, 294, 0.65, 0.24, sidePan, 0, 'sawtooth');
        this.tone(72, 34, 0.55, 0.3, sidePan, 0, 'triangle');
        this.burst(1650, 1.2, 0.4, 0.22, sidePan);
        break;
      case 'footstep':
        this.tone(90, 42, 0.16, event.loud ? 0.22 : 0.11, sidePan, 0, 'triangle');
        this.burst(320, 1.6, 0.12, event.loud ? 0.13 : 0.06, sidePan);
        break;
      case 'sneak_in':
        // Eerie metallic vent/step creep inside office
        this.tone(130, 58, 0.36, 0.2, sidePan, 0, 'sawtooth');
        this.burst(780, 1.8, 0.25, 0.14, sidePan);
        break;
      case 'hauke_curtain_open':
        // Ominous cloth rip + distant rumble
        this.burst(980, 0.9, 0.38, 0.18, -0.65);
        this.tone(58, 32, 0.65, 0.24, -0.65, 0.05, 'triangle');
        break;
      case 'hauke_charge_start':
        this.tone(68, 32, 0.72, 0.32, -0.75, 0, 'sawtooth');
        this.burst(240, 0.8, 0.55, 0.24, -0.75);
        break;
      case 'hauke_stomp': {
        // MASSIVE EARTHQUAKE SUB-BASS FOOTSTEPS + DESK RATTLE!!
        const power = Math.min(1, event.intensity || 0.7);
        this.tone(62, 24, 0.24, 0.28 + power * 0.16, -0.68, 0, 'triangle');
        this.tone(42, 20, 0.26, 0.22 + power * 0.14, -0.68, 0.01, 'sine');
        // Desk Spezi can & mug rattling!
        this.burst(2600, 2.2, 0.08, 0.08 + power * 0.1, 0.15, 0.03);
        this.tone(1480, 980, 0.05, 0.04 + power * 0.05, 0.2, 0.04, 'triangle');
        break;
      }
      case 'hauke_door_slam':
        // COLOSSAL EARTHQUAKE DOOR BANG!!
        this.tone(86, 22, 0.62, 0.44, -0.75, 0, 'sawtooth');
        this.tone(190, 48, 0.42, 0.34, -0.75, 0.02, 'triangle');
        this.burst(620, 0.6, 0.48, 0.36, -0.75);
        this.tone(95, 24, 0.48, 0.34, -0.75, 0.24, 'triangle');
        this.burst(540, 0.7, 0.36, 0.28, -0.75, 0.24);
        this.tone(80, 24, 0.42, 0.26, -0.75, 0.46, 'triangle');
        break;
      case 'torge_laugh':
        // Deep ominous Freddy/Torge chuckle + metallic pan resonance
        this.tone(138, 108, 0.16, event.close ? 0.24 : 0.14, 0.4, 0, 'sawtooth');
        this.tone(124, 96, 0.16, event.close ? 0.24 : 0.14, 0.4, 0.18, 'sawtooth');
        this.tone(110, 82, 0.24, event.close ? 0.26 : 0.16, 0.4, 0.36, 'sawtooth');
        this.tone(540, 510, 0.35, 0.06, 0.4, 0.05, 'triangle');
        break;
      case 'kitchen_clatter': {
        // CAM 6 Audio-Only pots, pans & rolling Spezi cans!
        const g = event.loud ? 0.22 : 0.09;
        this.tone(820, 440, 0.14, g, 0.7, 0, 'triangle');
        this.burst(1850, 1.4, 0.22, g * 0.9, 0.7, 0.04);
        this.tone(1180, 740, 0.16, g * 0.8, 0.7, 0.18, 'sine');
        break;
      }
      case 'torge_jingle_distant':
        this.tone(329.63, 328, 0.35, event.loud ? 0.12 : 0.05, 0.65, 0, 'sine');
        this.tone(392.00, 390, 0.35, event.loud ? 0.12 : 0.05, 0.65, 0.28, 'sine');
        break;
      case 'power_out':
        this.stopJingle();
        // Dramatic power-down pitch drop!
        this.tone(240, 34, 1.15, 0.32, 0, 0, 'sawtooth');
        this.burst(520, 0.9, 0.65, 0.2, 0);
        break;
      case 'torge_jingle_start':
        this.startJingle();
        break;
      case 'torge_jingle_stop':
        this.stopJingle();
        this.tone(80, 34, 0.35, 0.16, -0.5, 0, 'triangle');
        break;
      case 'duck_giggle':
        // Creepy eerie squeak-giggle for Golden Duck
        this.tone(620, 980, 0.14, 0.18, 0, 0, 'triangle');
        this.tone(880, 520, 0.22, 0.18, 0, 0.15, 'triangle');
        this.tone(1240, 420, 0.26, 0.14, 0, 0.32, 'sine');
        break;
      case 'honk':
        // Classic FNAF poster nose honk!
        this.tone(480, 620, 0.06, 0.2, 0, 0, 'triangle');
        this.tone(620, 390, 0.09, 0.18, 0, 0.05, 'triangle');
        break;
      case 'phone_ring':
        this.tone(440, 440, 0.28, 0.12, 0.35, 0, 'sine');
        this.tone(480, 480, 0.28, 0.1, 0.35, 0, 'sine');
        this.tone(440, 440, 0.28, 0.12, 0.35, 0.42, 'sine');
        this.tone(480, 480, 0.28, 0.1, 0.35, 0.42, 'sine');
        break;
      case 'phone_line':
        // Subtle lo-fi radio voice blip
        this.burst(1350, 3.2, 0.14, 0.07, 0.35);
        this.tone(event.night === 5 ? 118 : 310, event.night === 5 ? 88 : 260, 0.12, 0.06, 0.35, 0.02, 'triangle');
        break;
      case 'ambience':
        this.tone(event.tense ? 64 : 88, event.tense ? 42 : 66, 1.8, event.tense ? 0.14 : 0.08, 0, 0, 'sine');
        this.burst(420, 2.2, 1.1, 0.05, (Math.random() - 0.5) * 1.2);
        break;
      case 'hour_tick':
        this.tone(523.25, 520, 0.38, 0.08, 0, 0, 'sine');
        break;
      case 'jumpscare':
        this.stopJingle();
        // Brutal authentic FNAF multi-layered screech!!
        this.tone(240, 880, 0.14, 0.42, 0, 0, 'sawtooth');
        this.tone(860, 310, 0.95, 0.4, 0, 0.08, 'sawtooth');
        this.tone(915, 345, 0.95, 0.36, 0, 0.08, 'square');
        this.tone(112, 34, 1.05, 0.46, 0, 0, 'sawtooth');
        this.burst(1600, 0.55, 1.05, 0.42, 0);
        if (event.who === 'hauke') {
          this.tone(54, 20, 1.1, 0.48, 0, 0, 'triangle');
        } else if (event.who === 'duck') {
          this.tone(1340, 620, 0.95, 0.38, 0, 0.04, 'sawtooth');
        }
        break;
      case 'gameover_static':
        this.burst(1900, 0.65, 1.4, 0.24, 0);
        break;
      case 'win_6am':
        this.stopJingle();
        // Classic 6:00 AM grandfather clock Westminster chimes!
        this.tone(523.25, 523.25, 0.55, 0.24, 0, 0.0, 'triangle');
        this.tone(440.00, 440.00, 0.55, 0.24, 0, 0.52, 'triangle');
        this.tone(493.88, 493.88, 0.55, 0.24, 0, 1.04, 'triangle');
        this.tone(329.63, 329.63, 0.95, 0.26, 0, 1.56, 'triangle');
        this.tone(329.63, 329.63, 0.55, 0.22, 0, 2.55, 'sine');
        this.tone(493.88, 493.88, 0.55, 0.22, 0, 3.05, 'sine');
        this.tone(440.00, 440.00, 0.55, 0.22, 0, 3.55, 'sine');
        this.tone(523.25, 523.25, 1.25, 0.28, 0, 4.05, 'triangle');
        break;
    }
  }
}
