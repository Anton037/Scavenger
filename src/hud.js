import { CAMERAS, CAMERA_MAP, CHARACTERS, loadProgress } from './fnafData.js';
import { getHourLabel } from './game.js';

export const get = (id) => document.getElementById(id);

export function write(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}

export class Hud {
  constructor(onSelectCam) {
    this.onSelectCam = onSelectCam;
    this.el = Object.fromEntries([
      'hud', 'clock-hour', 'clock-night', 'power-box', 'power-pct', 'usage-bars',
      'office-controls', 'btn-left-door', 'btn-left-light', 'btn-right-door', 'btn-right-light',
      'btn-monitor', 'monitor-label', 'cctv-overlay', 'cctv-room-label', 'cctv-audio-only',
      'kitchen-wave', 'kitchen-status', 'cctv-disrupt', 'cam-buttons', 'call-box', 'call-text', 'btn-mute-call',
      'quake-alert', 'hallucination', 'hallucination-text',
      'title-stars', 'continue-night-label', 'btn-night6', 'btn-custom',
      'pause-meta', 'win-clock', 'win-sub', 'win-stats',
      'gameover-kicker', 'gameover-title', 'gameover-line', 'gameover-meta',
    ].map((id) => [id, get(id)]));

    this.camButtons = new Map();
    this.buildCamButtons();
    this.syncTitleProgress();
  }

  buildCamButtons() {
    const wrap = this.el['cam-buttons'];
    if (!wrap) return;
    wrap.innerHTML = '';
    for (const cam of CAMERAS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cam-btn';
      btn.dataset.cam = cam.id;
      btn.style.left = `${cam.x}%`;
      btn.style.top = `${cam.y}%`;
      btn.textContent = `CAM ${cam.short}`;
      btn.title = `CAM ${cam.id} — ${cam.name}`;
      btn.addEventListener('click', () => this.onSelectCam?.(cam.id));
      wrap.appendChild(btn);
      this.camButtons.set(cam.id, btn);
    }
  }

  syncTitleProgress() {
    const { night, stars } = loadProgress();
    const continueLabel = this.el['continue-night-label'];
    if (continueLabel) write(continueLabel, `Nacht ${Math.min(5, night)}`);
    const starsEl = this.el['title-stars'];
    if (starsEl) {
      starsEl.innerHTML = stars > 0
        ? Array.from({ length: stars }, () => '<span>★</span>').join('')
        : '';
    }
    // Keep Night 6 & Custom Night accessible anytime for friends, with clear label if unlocked
    if (this.el['btn-night6']) this.el['btn-night6'].hidden = false;
    if (this.el['btn-custom']) this.el['btn-custom'].hidden = false;
  }

  paint(run) {
    if (!run) return;
    const ui = this.el;
    const out = Boolean(run.powerOutage);
    const inJumpscare = run.state === 'jumpscare';

    write(ui['clock-hour'], getHourLabel(run));
    write(ui['clock-night'], run.nightTitle);

    // Power & 5-bar Usage meter
    const pct = Math.ceil(run.power);
    write(ui['power-pct'], `${pct}%`);
    if (ui['power-box']) {
      ui['power-box'].hidden = out || inJumpscare;
      ui['power-box'].classList.toggle('low', pct <= 20);
    }
    if (ui['usage-bars']) {
      const bars = [...ui['usage-bars'].children];
      for (let i = 0; i < bars.length; i++) {
        bars[i].className = i < run.usage ? `on-${i + 1}` : '';
      }
    }

    // Office Steel Switches
    if (ui['office-controls']) {
      ui['office-controls'].hidden = run.monitorOpen || out || inJumpscare;
    }
    const syncSwitch = (btn, active, jammed) => {
      if (!btn) return;
      btn.setAttribute('aria-pressed', String(Boolean(active)));
      btn.classList.toggle('jammed', Boolean(jammed));
    };
    syncSwitch(ui['btn-left-door'], run.leftDoor, run.leftJammed);
    syncSwitch(ui['btn-left-light'], run.leftLight, run.leftJammed);
    syncSwitch(ui['btn-right-door'], run.rightDoor, run.rightJammed);
    syncSwitch(ui['btn-right-light'], run.rightLight, run.rightJammed);

    // Monitor Bar
    if (ui['btn-monitor']) {
      ui['btn-monitor'].hidden = out || inJumpscare;
      ui['btn-monitor'].setAttribute('aria-pressed', String(Boolean(run.monitorOpen)));
      write(ui['monitor-label'], run.monitorOpen ? 'KAMERAS ZU' : 'KAMERAS');
    }

    // CCTV Overlay
    if (ui['cctv-overlay']) {
      ui['cctv-overlay'].hidden = !run.monitorOpen || out || inJumpscare;
    }
    if (run.monitorOpen) {
      const cam = CAMERA_MAP[run.activeCam];
      write(ui['cctv-room-label'], cam ? `CAM ${cam.id} — ${cam.name}` : `CAM ${run.activeCam}`);
      if (ui['cctv-audio-only']) {
        const showKitchen = run.activeCam === '6' && run.camDisrupt <= 0;
        ui['cctv-audio-only'].hidden = !showKitchen;
        if (showKitchen && ui['kitchen-wave']) {
          const pulse = run.kitchenNoisePulse || 0;
          const active = pulse > 0.08;
          ui['kitchen-wave'].classList.toggle('active', active);
          const bars = [...ui['kitchen-wave'].children];
          for (let i = 0; i < bars.length; i++) {
            const wave = active
              ? (0.28 + 0.72 * Math.abs(Math.sin(run.time * 18 + i * 1.15)) * pulse)
              : (0.12 + 0.06 * Math.abs(Math.sin(run.time * 3.5 + i)));
            bars[i].style.transform = `scaleY(${wave.toFixed(2)})`;
          }
          const inKitchen = run.animatronics.tom.room === '6' || run.animatronics.torge.room === '6';
          write(
            ui['kitchen-status'],
            active
              ? (run.animatronics.tom.room === '6' ? 'AUDIO: TÖPFE & SPEZI-KLAPPERN!' : 'AUDIO: LEISE SPIELUHR...')
              : inKitchen
                ? 'AUDIO: FRITTEUSE ZISCHT...'
                : 'AUDIO: RUHIG',
          );
        }
      }
      if (ui['cctv-disrupt']) ui['cctv-disrupt'].hidden = run.camDisrupt <= 0;
      for (const [id, btn] of this.camButtons.entries()) {
        btn.classList.toggle('active', id === run.activeCam);
      }
    }

    // Phone Guy Radio Subtitles & Mute Button
    if (ui['btn-mute-call']) {
      ui['btn-mute-call'].hidden = !run.callActive || run.callMuted || out || inJumpscare;
    }
    if (ui['call-box']) {
      const showCall = Boolean(run.callText) && !run.callMuted && !out && !inJumpscare;
      ui['call-box'].hidden = !showCall;
      if (showCall) write(ui['call-text'], run.callText);
    }

    // Hauke Earthquake Warning
    if (ui['quake-alert']) {
      const quaking = Boolean(run.animatronics.hauke.sprint.triggered || run.quake > 0.35) && !inJumpscare;
      ui['quake-alert'].hidden = !quaking;
    }

    // Subliminal Hallucination Flash
    if (ui.hallucination) {
      ui.hallucination.hidden = !run.hallucination || inJumpscare;
      if (run.hallucination) write(ui['hallucination-text'], run.hallucination.text);
    }
  }

  showPause(run) {
    write(this.el['pause-meta'], `${run.nightTitle} · ${getHourLabel(run)} · Strom ${Math.ceil(run.power)}%`);
  }

  showGameOver(run) {
    const killer = CHARACTERS[run.killedBy];
    write(this.el['gameover-kicker'], killer ? `ERWISCHT VON ${killer.name.toUpperCase()}` : 'VERBINDUNG ABGEBROCHEN');
    write(this.el['gameover-title'], 'GAME OVER');
    write(this.el['gameover-line'], run.deathLine || killer?.deathLine || 'Deine Schicht endete abrupt.');
    write(
      this.el['gameover-meta'],
      `${run.nightTitle} · Überlebt bis ${getHourLabel(run)} · Strom ${Math.ceil(run.power)}% · Hauke geblockt: ${run.stats.haukeBlocked}×`,
    );
  }

  showWin(run) {
    write(this.el['win-clock'], '5:59 AM');
    const bonus = run.night === 5
      ? 'GEHALTSCHECK: 120,50 € + 2 GRATIS-DÖNER ★'
      : run.night === 6
        ? 'ÜBERSTUNDEN-BONUS: +50,00 € PFANDGELD ★★'
        : run.night === 7 && run.customAi && run.customAi.torge >= 20 && run.customAi.anton >= 20 && run.customAi.tom >= 20 && run.customAi.hauke >= 20
          ? '4/20-LEGENDE: KÜCHENCHEF-EHRE ★★★'
          : `${run.nightTitle} ÜBERLEBT!`;
    write(this.el['win-sub'], bonus);
    write(
      this.el['win-stats'],
      `Reststrom: ${Math.ceil(run.power)}% · Hauke geblockt: ${run.stats.haukeBlocked}× · Anton/Tom geblockt: ${run.stats.antonBlocked + run.stats.tomBlocked}×`,
    );
    setTimeout(() => {
      write(this.el['win-clock'], '6:00 AM');
    }, 850);
  }
}
