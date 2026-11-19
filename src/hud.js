import {
  ACHIEVEMENTS,
  ACHIEVEMENT_MAP,
  CAMERAS,
  CAMERA_MAP,
  CHARACTERS,
  computeShiftRank,
  loadAchievements,
  loadProgress,
  loadRecords,
} from './fnafData.js';
import {
  feedIsInterrupted,
  FUSE_RESET_COST,
  getFormattedShiftTime,
  getHourLabel,
  hasMotionBlip,
  KITCHEN_BELL_COST,
} from './game.js';

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
    this.toastQueue = [];
    this.toastTimer = null;
    this.el = Object.fromEntries([
      'hud', 'clock-hour', 'clock-night', 'power-box', 'power-pct', 'usage-bars', 'seismic-bars',
      'office-controls', 'btn-left-door', 'btn-left-light', 'btn-right-door', 'btn-right-light',
      'btn-monitor', 'btn-fuse', 'btn-kitchen-bell', 'monitor-label', 'cctv-overlay', 'cctv-room-label', 'cctv-audio-only',
      'cctv-telemetry', 'cctv-time', 'cctv-signal', 'cctv-hint',
      'anton-call-overlay', 'anton-call-progress',
      'kitchen-wave', 'kitchen-status', 'cctv-disrupt', 'cam-buttons', 'call-box', 'call-text', 'btn-mute-call',
      'shift-alert', 'shift-alert-title', 'shift-alert-text', 'shift-alert-timer', 'video-takeover',
      'hallucination', 'hallucination-text',
      'achievement-toast', 'achievement-toast-icon', 'achievement-toast-title',
      'title-stars', 'title-ach-count', 'btn-continue', 'continue-night-label',
      'dossier-grid', 'records-summary', 'ach-grid',
      'pause-meta', 'win-clock', 'win-sub', 'win-stats',
      'win-rank-grade', 'win-rank-label', 'win-rank-wage', 'win-record-pill',
      'gameover-kicker', 'gameover-title', 'gameover-line', 'gameover-hint', 'gameover-meta',
    ].map((id) => [id, get(id)]));

    this.camButtons = new Map();
    this.buildCamButtons();
    this.renderDossier();

    const mapToggle = get('btn-map');
    mapToggle?.addEventListener('click', () => {
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

  renderDossier() {
    const wrap = this.el['dossier-grid'];
    if (!wrap) return;
    wrap.innerHTML = '';
    for (const key of ['torge', 'anton', 'tom', 'hauke', 'duck']) {
      const c = CHARACTERS[key];
      if (!c) continue;
      const card = document.createElement('article');
      card.className = 'dossier-card';
      card.innerHTML = `
        <div class="dossier-head">
          <span class="dossier-badge" style="background:${c.color}">${c.badge}</span>
          <span class="dossier-role">${c.role}</span>
        </div>
        <h3>${c.name}</h3>
        <p class="dossier-lore">${c.lore}</p>
        <div class="dossier-meta">
          <div><b>Route:</b> ${c.route}</div>
          <div><b>Konter:</b> ${c.counter}</div>
        </div>
      `;
      wrap.appendChild(card);
    }
  }

  renderAchievements() {
    const unlocked = new Set(loadAchievements());
    const rec = loadRecords();

    const summary = this.el['records-summary'];
    if (summary) {
      const bestList = [1, 2, 3, 4, 5, 6]
        .map((n) => (rec.bestPowerByNight[String(n)] ? `N${n}: ${rec.bestPowerByNight[String(n)]}%` : null))
        .filter(Boolean)
        .join(' · ');
      summary.innerHTML = `
        <div class="record-chip"><small>Stempel</small><strong>${unlocked.size} / ${ACHIEVEMENTS.length}</strong></div>
        <div class="record-chip"><small>Schichten überlebt</small><strong>${rec.nightsWon}</strong></div>
        <div class="record-chip"><small>Türen verteidigt</small><strong>${rec.totalBlocks}×</strong></div>
        <div class="record-chip"><small>Best-Reststrom</small><strong>${bestList || 'Noch offen'}</strong></div>
      `;
    }

    const grid = this.el['ach-grid'];
    if (!grid) return;
    grid.innerHTML = '';
    for (const ach of ACHIEVEMENTS) {
      const done = unlocked.has(ach.id);
      const card = document.createElement('article');
      card.className = `ach-card${done ? ' unlocked' : ''}`;
      card.innerHTML = `
        <span class="ach-icon" aria-hidden="true">${done ? ach.icon : '🔒'}</span>
        <div>
          <h3>${ach.title}</h3>
          <p>${ach.desc}</p>
        </div>
      `;
      grid.appendChild(card);
    }
  }

  showAchievementToast(id) {
    const ach = ACHIEVEMENT_MAP[id];
    if (!ach) return;
    this.toastQueue.push(ach);
    if (!this.toastTimer) this.flushToast();
  }

  flushToast() {
    const toast = this.el['achievement-toast'];
    if (!toast || !this.toastQueue.length) {
      this.toastTimer = null;
      return;
    }
    const next = this.toastQueue.shift();
    write(this.el['achievement-toast-icon'], next.icon);
    write(this.el['achievement-toast-title'], next.title);
    toast.hidden = false;
    this.toastTimer = setTimeout(() => {
      toast.hidden = true;
      this.toastTimer = null;
      if (this.toastQueue.length) this.flushToast();
    }, 3400);
  }

  syncTitleProgress() {
    const { night, stars } = loadProgress();
    const unlocked = loadAchievements();
    if (this.el['btn-continue']) this.el['btn-continue'].hidden = night === 1;
    write(this.el['continue-night-label'], night === 7 ? 'Custom Night' : `Nacht ${night}`);
    write(this.el['title-ach-count'], `${unlocked.length}/${ACHIEVEMENTS.length}`);
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

    // Power, 5-bar Usage meter & 5-bar Seismograph!
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
    if (ui['seismic-bars']) {
      const sLevel = Math.max(0, Math.min(1, run.seismicLevel || 0));
      const lit = sLevel < 0.08 ? 1 : Math.min(5, Math.ceil(sLevel * 5));
      const bars = [...ui['seismic-bars'].children];
      for (let i = 0; i < bars.length; i++) {
        if (i >= lit) bars[i].className = '';
        else if (i <= 1) bars[i].className = 's-low';
        else if (i === 2) bars[i].className = 's-mid';
        else bars[i].className = 's-high';
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
    if (fuse) {
      fuse.hidden = !hasFuseFault;
      fuse.disabled = run.power <= FUSE_RESET_COST;
      write(fuse, fuse.disabled ? `KAMERAS IN ${fuseSeconds} s` : `SICHERUNG −${FUSE_RESET_COST} %`);
    }
    if (ui['video-takeover']) {
      ui['video-takeover'].hidden = !inJumpscare || run.jumpscare.cause !== 'video';
    }

    // CCTV Telemetry & Overlay
    const showCctv = run.monitorOpen && !out && !inJumpscare;
    if (ui['cctv-overlay']) ui['cctv-overlay'].hidden = !showCctv;
    if (ui['cctv-telemetry']) ui['cctv-telemetry'].hidden = !showCctv;

    if (showCctv) {
      const cam = CAMERA_MAP[run.activeCam];
      const disrupted = feedIsInterrupted(run);
      write(ui['cctv-room-label'], cam ? `CAM ${cam.id} — ${cam.name}` : `CAM ${run.activeCam}`);
      write(ui['cctv-time'], `${getFormattedShiftTime(run)} · ${run.nightTitle}`);
      if (ui['cctv-signal']) {
        ui['cctv-signal'].className = `cctv-signal${disrupted ? ' lost' : run.quake > 0.3 ? ' weak' : ''}`;
      }
      if (ui['cctv-hint']) {
        let hint = '';
        if (run.activeCam === '1C' && run.animatronics.hauke.stage === 2) hint = '⚠ VORHANG OFFEN';
        else if (run.activeCam === '1C' && run.animatronics.hauke.stage >= 3) hint = '⚠ HAUKE IST WEG!';
        else if (run.activeCam === '4B' && run.animatronics.torge.room === '4B') hint = '⚠ CHEF TORGE IM BLICK';
        else if (run.activeCam === '2B' && run.goldenPoster) hint = '⚠ ES BIN ICH';
        write(ui['cctv-hint'], hint);
      }

      // Hilarious Lost Anton Incoming Video Call Overlay
      const videoActive = Boolean(run.antonVideo.deadline && run.antonVideo.deadline > run.time && !disrupted);
      if (ui['anton-call-overlay']) {
        ui['anton-call-overlay'].hidden = !videoActive;
        if (videoActive && ui['anton-call-progress']) {
          const pctLeft = Math.max(0, Math.min(100, ((run.antonVideo.deadline - run.time) / 3.8) * 100));
          ui['anton-call-progress'].style.width = `${pctLeft.toFixed(1)}%`;
        }
      }

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
        btn.classList.toggle('has-motion', id !== run.activeCam && hasMotionBlip(run, id));
      }
    }

    const showAlert = !out && !inJumpscare && this.paintShiftAlert(run, fuseSeconds);
    ui['shift-alert'].hidden = !showAlert;

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
    let title;
    let text;
    let timer;
    if (run.antonVideo.deadline) {
      if (!sprint && run.monitorOpen && !feedIsInterrupted(run)) return false;
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

  showWin(run, { isNewRecord = false } = {}) {
    write(this.el['win-clock'], '5:59 AM');
    const rank = computeShiftRank(run);
    write(this.el['win-rank-grade'], rank.grade);
    write(this.el['win-rank-label'], rank.label);
    write(this.el['win-rank-wage'], rank.wage);
    if (this.el['win-record-pill']) this.el['win-record-pill'].hidden = !isNewRecord;

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
