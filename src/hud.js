import { CAMERAS, CAMERA_MAP, CHARACTERS, loadProgress } from './fnafData.js';
import { feedIsInterrupted, FUSE_RESET_COST, getHourLabel, KITCHEN_BELL_COST } from './game.js';

const RETRY_HINTS = {
  video: 'Wenn Anton im Kamerabild anruft, wechsle den Feed oder senke rechtzeitig den Monitor.',
  blackout: 'Der Notstrom war aufgebraucht. Mach Tür, Licht und Monitor nach dem Check wieder aus.',
  hallucination: 'Wenn die Ente im Büro auftaucht, öffne sofort wieder die Kameras.',
  anton: 'Wenn du Schritte links hörst, prüfe das Licht und sichere die linke Tür.',
  tom: 'Schleifen rechts kündigt Tom an. Sichere die Tür oder lock ihn über CAM 6 zurück.',
  hauke: 'Wenn der Boden bebt, senke den Monitor und schließ die linke Tür.',
  torge: 'Achte auf Torges Lachen. Er kommt über die Ost-Ecke an die rechte Tür.',
};

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
      'btn-monitor', 'btn-fuse', 'btn-kitchen-bell', 'monitor-label', 'cctv-overlay', 'cctv-room-label', 'cctv-audio-only',
      'kitchen-wave', 'kitchen-status', 'cctv-disrupt', 'cam-buttons', 'call-box', 'call-text', 'btn-mute-call',
      'shift-alert', 'shift-alert-title', 'shift-alert-text', 'shift-alert-timer', 'video-takeover',
      'hallucination', 'hallucination-text',
      'title-stars', 'btn-continue', 'continue-night-label',
      'pause-meta', 'win-clock', 'win-sub', 'win-stats',
      'gameover-kicker', 'gameover-title', 'gameover-line', 'gameover-hint', 'gameover-meta',
    ].map((id) => [id, get(id)]));

    this.camButtons = new Map();
    this.buildCamButtons();
    const mapToggle = get('btn-map');
    mapToggle.addEventListener('click', () => {
      const expanded = mapToggle.getAttribute('aria-expanded') !== 'true';
      get('cctv-map').toggleAttribute('data-expanded', expanded);
      mapToggle.setAttribute('aria-expanded', String(expanded));
    });
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
      btn.style.setProperty('--cam-x', `${cam.x}%`);
      btn.style.setProperty('--cam-y', `${cam.y}%`);
      btn.textContent = `CAM ${cam.short}`;
      btn.title = `CAM ${cam.id} — ${cam.name}`;
      btn.setAttribute('aria-label', `Kamera ${cam.id}, ${cam.name}`);
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', (event) => {
        this.onSelectCam?.(cam.id);
        if (event.detail > 0) btn.blur();
      });
      wrap.appendChild(btn);
      this.camButtons.set(cam.id, btn);
    }
  }

  syncTitleProgress() {
    const { night, stars } = loadProgress();
    this.el['btn-continue'].hidden = night === 1;
    write(this.el['continue-night-label'], night === 7 ? 'Custom Night' : `Nacht ${night}`);
    const starsEl = this.el['title-stars'];
    if (starsEl) {
      starsEl.innerHTML = stars > 0
        ? Array.from({ length: stars }, () => '<span>★</span>').join('')
        : '';
    }
  }

  paint(run) {
    if (!run) return;
    const ui = this.el;
    const out = Boolean(run.powerOutage);
    const inJumpscare = run.state === 'jumpscare';
    const fuseSeconds = Math.ceil(run.cameraFuseUntil - run.time);
    const hasFuseFault = fuseSeconds > 0 && !out && !inJumpscare;

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
      ui['btn-monitor'].hidden = out || inJumpscare || hasFuseFault;
      ui['btn-monitor'].setAttribute('aria-pressed', String(Boolean(run.monitorOpen)));
      write(ui['monitor-label'], run.monitorOpen ? 'KAMERAS ZU' : 'KAMERAS');
    }
    const fuse = ui['btn-fuse'];
    fuse.hidden = !hasFuseFault;
    fuse.disabled = run.power <= FUSE_RESET_COST;
    write(fuse, fuse.disabled ? `KAMERAS IN ${fuseSeconds} s` : `SICHERUNG −${FUSE_RESET_COST} %`);
    ui['video-takeover'].hidden = !inJumpscare || run.jumpscare.cause !== 'video';

    // CCTV Overlay
    if (ui['cctv-overlay']) {
      ui['cctv-overlay'].hidden = !run.monitorOpen || out || inJumpscare;
    }
    if (run.monitorOpen) {
      const cam = CAMERA_MAP[run.activeCam];
      const disrupted = feedIsInterrupted(run);
      write(ui['cctv-room-label'], cam ? `CAM ${cam.id} — ${cam.name}` : `CAM ${run.activeCam}`);
      if (ui['cctv-audio-only']) {
        const showKitchen = run.activeCam === '6' && !disrupted;
        ui['cctv-audio-only'].hidden = !showKitchen;
        if (showKitchen && ui['kitchen-wave']) {
          const bell = ui['btn-kitchen-bell'];
          const cooldown = Math.ceil(run.kitchenBellUntil - run.time);
          bell.disabled = cooldown > 0 || run.power <= KITCHEN_BELL_COST;
          write(bell, cooldown > 0 ? `Gong in ${cooldown} s` : `Bestellgong −${KITCHEN_BELL_COST} %`);
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
          write(
            ui['kitchen-status'],
            active
              ? (run.animatronics.tom.room === '6' ? 'TÖPFE KLAPPERN · TOM IST HIER' : 'LEISE SPIELUHR')
              : 'FRITTEUSE ZISCHT',
          );
        }
      }
      if (ui['cctv-disrupt']) ui['cctv-disrupt'].hidden = !disrupted;
      for (const [id, btn] of this.camButtons.entries()) {
        const pressed = String(id === run.activeCam);
        if (btn.getAttribute('aria-pressed') !== pressed) btn.setAttribute('aria-pressed', pressed);
      }
    }

    const showAlert = !out && !inJumpscare && this.paintShiftAlert(run, fuseSeconds);
    ui['shift-alert'].hidden = !showAlert;

    // Make room for immediate warnings while the call continues.
    if (ui['btn-mute-call']) {
      ui['btn-mute-call'].hidden = !run.callActive || run.callMuted || out || inJumpscare;
    }
    if (ui['call-box']) {
      const showCall = Boolean(run.callText) && !run.callMuted && !out && !inJumpscare && !showAlert;
      ui['call-box'].hidden = !showCall;
      if (showCall) write(ui['call-text'], run.callText);
    }

    // Subliminal Hallucination Flash
    if (ui.hallucination) {
      ui.hallucination.hidden = !run.hallucination || inJumpscare;
      if (run.hallucination) write(ui['hallucination-text'], run.hallucination.text);
    }
  }

  paintShiftAlert(run, fuseSeconds) {
    const sprint = run.animatronics.hauke.sprint.triggered;
    const west = run.training !== 'door' && !run.leftDoor && run.animatronics.anton.room === 'left_door';
    const east = !run.rightDoor && run.animatronics.tom.room === 'right_door';
    let title, text, timer;
    if (run.antonVideo.deadline) {
      title = 'VIDEOANRUF · LOST ANTON';
      text = sprint ? 'Monitor runter, dann linke Tür!' : '„Guck nicht so.“ Kamera wechseln oder Monitor senken!';
      timer = Math.ceil(run.antonVideo.deadline - run.time);
    } else if (sprint) {
      title = 'HAUKE RENNT · WEST-FLUR';
      text = 'Monitor runter. Linke Tür zu!';
    } else if (west || east) {
      title = west && east ? 'GERÄUSCHE AN BEIDEN TÜREN' : west ? 'SCHRITTE LINKS' : 'SCHLEIFEN RECHTS';
      text = run.monitorOpen ? 'Monitor runter und die Flurlichter prüfen.' : 'Flurlicht prüfen und die betroffene Seite sichern.';
    } else if (fuseSeconds > 0) {
      title = 'HAUKE · SICHERUNG RAUS';
      text = `Tür hält. Kameras kommen von selbst zurück oder für ${FUSE_RESET_COST} % sofort.`;
      timer = fuseSeconds;
    } else if (run.notice?.until > run.time) {
      title = 'SCHICHTFUNK';
      text = run.notice.text;
    } else {
      return false;
    }
    const ui = this.el;
    ui['shift-alert'].classList.toggle('urgent', sprint || west || east || Boolean(run.antonVideo.deadline));
    write(ui['shift-alert-title'], title);
    write(ui['shift-alert-text'], text);
    write(ui['shift-alert-timer'], timer ? `${timer} s` : '');
    return true;
  }

  showPause(run) {
    write(this.el['pause-meta'], `${run.nightTitle} · ${getHourLabel(run)} · Strom ${Math.ceil(run.power)}%`);
  }

  showGameOver(run) {
    const killer = CHARACTERS[run.killedBy];
    write(this.el['gameover-kicker'], killer ? `ERWISCHT VON ${killer.name.toUpperCase()}` : 'VERBINDUNG ABGEBROCHEN');
    write(this.el['gameover-title'], 'GAME OVER');
    write(this.el['gameover-line'], run.deathLine || killer?.deathLine || 'Deine Schicht endete abrupt.');
    write(this.el['gameover-hint'], RETRY_HINTS[run.jumpscare.cause] ?? RETRY_HINTS[run.killedBy] ?? '');
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
      `Reststrom: ${Math.ceil(run.power)}% · Türen verteidigt: ${run.stats.haukeBlocked + run.stats.antonBlocked + run.stats.tomBlocked}× · Anrufe abgelehnt: ${run.stats.videoDodges}× · Tom umgeleitet: ${run.stats.tomLured}× · Sicherungen: ${run.stats.fusesReset}×`,
    );
    setTimeout(() => {
      write(this.el['win-clock'], '6:00 AM');
    }, 850);
  }
}
