import {
  ACHIEVEMENT_MAP,
  ACHIEVEMENTS,
  CAMERAS,
  CAMERA_MAP,
  CHARACTERS,
  computeShiftRank,
  COSMETIC_ITEMS,
  IR_FLASH_COST,
  loadAchievements,
  loadCosmeticState,
  loadProgress,
  loadRecords,
  loadTapeProgress,
  loadWallet,
  PREP_BAG_SECONDS,
  PREP_DONER_SECONDS,
  purchaseCosmetic,
  RETRY_HINTS,
  STEAM_BURST_MIN_HEAT,
  toggleCosmetic,
  VHS_TAPES,
} from './fnafData.js';
import {
  feedIsInterrupted,
  getFormattedShiftTime,
  getHourLabel,
  getTemperatureCelsius,
  hasMotionBlip,
  isOrderExpress,
  isVentingSteam,
  KITCHEN_BELL_COST,
} from './game.js';
import { onOverridesLoaded } from './render/overrides.js';
import { getCharacterPortraitUrl } from './render/portraits.js';

export const get = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);

export function write(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}

function formatEuros(val) {
  return `${(Number(val) || 0).toFixed(2).replace('.', ',')} €`;
}

export class Hud {
  constructor(onSelectCam) {
    this.onSelectCam = onSelectCam;
    this.audioSubtitles = false;
    this.toastQueue = [];
    this.toastTimer = null;
    this.el = Object.fromEntries([
      'hud', 'clock-hour', 'clock-night', 'power-box', 'power-pct', 'usage-bars', 'seismic-bars',
      'thermal-label', 'thermal-fill',
      'quota-pill', 'quota-label', 'active-bon-chip', 'active-bon-text', 'active-bon-bar',
      'office-controls', 'front-controls', 'back-controls', 'under-desk-controls',
      'btn-left-door', 'btn-left-light', 'btn-right-door', 'btn-right-light',
      'btn-flashlight', 'flashlight-label', 'btn-turn-back', 'turn-back-label',
      'btn-under-desk', 'under-desk-label',
      'btn-prep-doner', 'prep-doner-label', 'prep-doner-bar',
      'btn-prep-fryer', 'prep-fryer-label',
      'btn-prep-bag', 'prep-bag-label', 'prep-bag-bar',
      'btn-reset-breaker', 'btn-vent-steam', 'vent-btn-label',
      'btn-back-flashlight', 'back-flash-label', 'btn-turn-front',
      'breath-label', 'breath-fill', 'btn-hold-breath', 'hold-breath-label', 'btn-stand-up',
      'btn-monitor', 'monitor-label', 'btn-breaker-warn',
      'cctv-overlay', 'cctv-room-label', 'cctv-audio-only',
      'cctv-tools', 'btn-cam-counter', 'cam-counter-label',
      'cctv-telemetry', 'cctv-time', 'cctv-signal', 'cctv-hint',
      'anton-call-overlay', 'anton-call-progress',
      'kitchen-wave', 'kitchen-status', 'cctv-disrupt', 'cam-buttons', 'call-box', 'call-text', 'btn-mute-call',
      'shift-alert', 'shift-alert-title', 'shift-alert-text', 'shift-alert-timer', 'video-takeover',
      'hallucination', 'hallucination-text',
      'achievement-toast', 'achievement-toast-icon', 'achievement-toast-title',
      'title-stars', 'title-ach-count', 'title-wallet-badge', 'title-tape-count',
      'btn-continue', 'continue-night-label',
      'kiosk-wallet', 'kiosk-sections', 'vhs-tape-list',
      'vhs-title', 'vhs-sub', 'vhs-timer', 'vhs-status-strip',
      'vhs-ctrl-tape1', 'vhs-t1-flash', 'vhs-t1-flash-label',
      'vhs-ctrl-tape2', 'vhs-t2-cassette', 'vhs-t2-cassette-label', 'vhs-t2-clipboard', 'vhs-t2-clip-label', 'vhs-t2-taser', 'vhs-t2-taser-label',
      'vhs-ctrl-tape3', 'vhs-t3-repair', 'vhs-t3-repair-label', 'vhs-t3-light', 'vhs-t3-light-label', 'vhs-t3-breath', 'vhs-t3-breath-label',
      'vhs-result', 'vhs-result-kicker', 'vhs-result-title', 'vhs-result-reward', 'vhs-result-lore', 'vhs-result-retry',
      'dossier-grid', 'records-summary', 'ach-grid',
      'pause-meta', 'win-clock', 'win-sub', 'win-stats',
      'win-rank-grade', 'win-rank-label', 'win-rank-wage', 'win-record-pill',
      'gameover-kicker', 'gameover-title', 'gameover-line', 'gameover-hint', 'gameover-meta',
    ].map((id) => [id, get(id)]));

    this.camButtons = new Map();
    this.buildCamButtons();
    this.paintCustomPortraits();
    this.renderDossier();

    onOverridesLoaded(() => {
      this.paintCustomPortraits();
      this.renderDossier();
    });

    const mapToggle = get('btn-map');
    mapToggle?.addEventListener('click', () => {
      const expanded = mapToggle.getAttribute('aria-expanded') !== 'true';
      get('cctv-map')?.toggleAttribute('data-expanded', expanded);
      mapToggle.setAttribute('aria-expanded', String(expanded));
    });
    this.syncTitleProgress();
  }

  setAudioSubtitles(on) {
    this.audioSubtitles = Boolean(on);
  }

  paintCustomPortraits() {
    if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
    for (const img of document.querySelectorAll('img[data-portrait]')) {
      const id = img.dataset.portrait;
      const url = getCharacterPortraitUrl(id);
      if (url) img.src = url;
    }
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
      const portrait = getCharacterPortraitUrl(key);
      const card = document.createElement('article');
      card.className = 'dossier-card';
      card.innerHTML = `
        <div class="dossier-top">
          <img class="dossier-portrait" src="${portrait}" alt="">
          <div class="dossier-title-col">
            <div class="dossier-head">
              <span class="dossier-badge" style="background:${c.color}">${c.badge}</span>
              <span class="dossier-role">${c.role}</span>
            </div>
            <h3>${c.name}</h3>
          </div>
        </div>
        <p class="dossier-lore">${c.lore}</p>
        <div class="dossier-meta">
          <div><b>Route:</b> ${c.route}</div>
          <div><b>Konter:</b> ${c.counter}</div>
        </div>
      `;
      wrap.appendChild(card);
    }
  }

  renderKiosk(onCosmeticChanged) {
    const wrap = this.el['kiosk-sections'];
    const wallet = loadWallet();
    const state = loadCosmeticState();
    write(this.el['kiosk-wallet'], `Guthaben: ${formatEuros(wallet.balance)}`);
    if (!wrap) return;
    wrap.innerHTML = '';

    const groups = [
      { slot: 'desk', title: 'Theken-Sammlerstücke (Mehrfach aufstellbar)' },
      { slot: 'poster', title: 'Wand-Aushang (Neben der Durchreiche)' },
      { slot: 'shader', title: 'VHS-Kamerafilter (Post-Processing)' },
    ];

    for (const grp of groups) {
      const sec = document.createElement('div');
      sec.className = 'kiosk-group';
      const heading = document.createElement('h3');
      heading.className = 'kiosk-group-title';
      heading.textContent = grp.title;
      sec.appendChild(heading);

      const grid = document.createElement('div');
      grid.className = 'kiosk-grid';

      for (const item of COSMETIC_ITEMS.filter((i) => i.slot === grp.slot)) {
        const owned = state.owned.includes(item.id);
        const equipped = item.slot === 'desk'
          ? state.deskEquipped.includes(item.id)
          : item.slot === 'poster'
            ? state.activePoster === item.id
            : state.activeShader === item.id;
        const canAfford = wallet.balance >= item.price;

        const card = document.createElement('article');
        card.className = `kiosk-card${equipped ? ' equipped' : ''}`;
        card.innerHTML = `
          <div class="kiosk-card-head">
            <b>${item.name}</b>
            <span class="kiosk-price">${owned ? (equipped ? 'AKTIV' : 'BESITZ') : formatEuros(item.price)}</span>
          </div>
          <p>${item.desc}</p>
        `;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `btn-crt small${equipped ? ' primary' : ''}`;
        if (!owned) {
          btn.disabled = !canAfford;
          btn.textContent = canAfford ? `Kaufen (${formatEuros(item.price)})` : `Fehlt (${formatEuros(item.price)})`;
        } else if (item.slot === 'desk') {
          btn.textContent = equipped ? 'Von Theke nehmen' : 'Auf Theke stellen';
        } else {
          btn.disabled = equipped;
          btn.textContent = equipped ? 'Ausgewählt ✓' : 'Aktivieren';
        }

        btn.addEventListener('click', () => {
          const ok = owned ? toggleCosmetic(item.id) : purchaseCosmetic(item.id);
          if (ok) {
            onCosmeticChanged?.(loadCosmeticState());
            this.syncTitleProgress();
            this.renderKiosk(onCosmeticChanged);
          }
        });
        card.appendChild(btn);
        grid.appendChild(card);
      }

      sec.appendChild(grid);
      wrap.appendChild(sec);
    }
  }

  renderArchiveTapes(onPlayTape) {
    const wrap = this.el['vhs-tape-list'];
    if (!wrap) return;
    const progress = loadTapeProgress();
    const { night } = loadProgress();
    wrap.innerHTML = '';

    for (const tape of VHS_TAPES) {
      const cleared = progress.completed.includes(tape.id);
      const card = document.createElement('article');
      card.className = `tape-card${cleared ? ' cleared' : ''}`;
      card.innerHTML = `
        <div class="tape-card-head">
          <span class="tape-code">${tape.code}</span>
          <span class="tape-status">${cleared ? 'ARCHIVIERT ✓' : `BONUS +${tape.rewardTips} €`}</span>
        </div>
        <h3>${tape.title}</h3>
        <p class="tape-sub">${tape.sub}</p>
        ${cleared
          ? `<blockquote class="tape-lore"><b>${tape.loreTitle}:</b> ${tape.loreText}</blockquote>`
          : `<p class="tape-locked-note">Schließe das Band ab, um das interne Schichtprotokoll und +${tape.rewardTips},00 € Trinkgeld freizuschalten (Nach Nacht ${tape.unlockAfterNight}${night > tape.unlockAfterNight ? ' · bereit' : ''}).</p>`}
      `;
      const btnRow = document.createElement('div');
      btnRow.className = 'tape-actions';
      const playBtn = document.createElement('button');
      playBtn.type = 'button';
      playBtn.className = 'btn-crt small primary';
      playBtn.textContent = cleared ? '▶ Band erneut abspielen' : '▶ Band einlegen';
      playBtn.addEventListener('click', () => onPlayTape?.(tape.id));
      btnRow.appendChild(playBtn);
      card.appendChild(btnRow);
      wrap.appendChild(card);
    }
  }

  renderAchievements() {
    const unlocked = new Set(loadAchievements());
    const rec = loadRecords();
    const wallet = loadWallet();

    const summary = this.el['records-summary'];
    if (summary) {
      const bestList = [1, 2, 3, 4, 5, 6]
        .map((n) => (rec.bestPowerByNight[String(n)] ? `N${n}: ${rec.bestPowerByNight[String(n)]}%` : null))
        .filter(Boolean)
        .join(' · ');
      summary.innerHTML = `
        <div class="record-chip"><small>Stempel</small><strong>${unlocked.size} / ${ACHIEVEMENTS.length}</strong></div>
        <div class="record-chip"><small>Schichten</small><strong>${rec.nightsWon}</strong></div>
        <div class="record-chip"><small>Trinkgeld gesamt</small><strong>${formatEuros(wallet.lifetime)}</strong></div>
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
        <span class="ach-icon" aria-hidden="true">${done ? ach.icon : '◆'}</span>
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
    }, 3200);
  }

  syncTitleProgress() {
    const { night, stars } = loadProgress();
    const unlocked = loadAchievements();
    const wallet = loadWallet();
    const tapes = loadTapeProgress();

    if (this.el['btn-continue']) this.el['btn-continue'].hidden = night === 1;
    write(this.el['continue-night-label'], night === 7 ? 'Custom Night' : `Nacht ${night}`);
    write(this.el['title-ach-count'], `${unlocked.length}/${ACHIEVEMENTS.length}`);
    write(this.el['title-wallet-badge'], formatEuros(wallet.balance));
    write(this.el['title-tape-count'], `${tapes.completed.length}/${VHS_TAPES.length}`);

    const starsEl = this.el['title-stars'];
    if (starsEl) {
      starsEl.innerHTML = stars > 0
        ? Array.from({ length: stars }, (_, idx) => `<span class="${idx === 3 ? 'star-plat' : ''}">★</span>`).join('')
        : '';
    }
  }

  paintMinigame(mg) {
    if (!mg) return;
    const ui = this.el;
    write(ui['vhs-title'], mg.title);
    write(ui['vhs-sub'], mg.sub);

    const mins = Math.floor(mg.time / 60);
    const secs = Math.floor(mg.time % 60);
    const frames = Math.floor((mg.time % 1) * 25);
    write(ui['vhs-timer'], `${mg.code.split('·')[1]?.trim() || '03:14'} · ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`);

    const inPlay = mg.state === 'playing';
    if (ui['vhs-ctrl-tape1']) ui['vhs-ctrl-tape1'].hidden = !inPlay || mg.tapeId !== 'tape1';
    if (ui['vhs-ctrl-tape2']) ui['vhs-ctrl-tape2'].hidden = !inPlay || mg.tapeId !== 'tape2';
    if (ui['vhs-ctrl-tape3']) ui['vhs-ctrl-tape3'].hidden = !inPlay || mg.tapeId !== 'tape3';

    if (mg.tapeId === 'tape1') {
      const cd = Math.max(0, mg.flashCooldown || 0);
      if (ui['vhs-t1-flash']) ui['vhs-t1-flash'].disabled = cd > 0;
      write(ui['vhs-t1-flash-label'], cd > 0 ? `LÄDT (${cd.toFixed(1)}s)` : 'LICHT-CHECK AM X');
      const nearHint = mg.distance <= 3.6 ? ' · SCHRITTE DIREKT VOR DEM X!' : '';
      write(ui['vhs-status-strip'], `RESTZEIT: ${Math.ceil(mg.timeLeft)}s · BLITZE GENAU AUF DER WEISSEN MARKIERUNG${nearHint}`);
    } else if (mg.tapeId === 'tape2') {
      const round = Math.min(mg.totalTests, mg.testIndex + 1);
      const postureNames = ['ZUSAMMENGESACKT', 'KOPF GENEIGT', 'BEUGT SICH VOR — VORSICHT!', 'ANGRIFF!'];
      write(
        ui['vhs-status-strip'],
        `PRÜFTON ${round}/${mg.totalTests} · KOSTÜM: ${postureNames[mg.postureStage] || 'RUHIG'} · STROBO: ${mg.taserCharges}×`,
      );
      if (ui['vhs-t2-cassette']) {
        ui['vhs-t2-cassette'].disabled = mg.cassettePlaying || mg.cassetteDoneForRound || mg.clipboardDown;
        write(
          ui['vhs-t2-cassette-label'],
          mg.cassettePlaying
            ? `TON LÄUFT (${Math.round(mg.cassetteProgress * 100)}%)`
            : mg.cassetteDoneForRound
              ? 'TON FERTIG ✓'
              : '1. PRÜFTON STARTEN',
        );
      }
      if (ui['vhs-t2-clipboard']) {
        ui['vhs-t2-clipboard'].classList.toggle('active-boost', mg.clipboardDown);
        write(
          ui['vhs-t2-clip-label'],
          mg.cassetteDoneForRound
            ? `2. ABHAKEN (${Math.round(mg.checkProgress * 100)}%)`
            : 'KLEMMBRETT',
        );
      }
      if (ui['vhs-t2-taser']) {
        ui['vhs-t2-taser'].disabled = mg.taserCharges <= 0 || mg.clipboardDown;
        write(ui['vhs-t2-taser-label'], `STROBO-TASER (${mg.taserCharges}×)`);
      }
    } else {
      const rTxt = mg.relays.map((v, idx) => `R${idx + 1}:${Math.round(v)}%${idx === mg.selectedRelay ? '◀' : ''}`).join('  ');
      const dangerTxt = mg.stalkerPhase === 'at_curtain'
        ? ' · ⚠ JEMAND STEHT VOR DEN LAMELLEN — LICHT AUS & ATEM HALTEN!'
        : mg.stalkerPhase === 'approaching'
          ? ' · SCHRITTE DRAUSSEN...'
          : '';
      write(ui['vhs-status-strip'], `${rTxt} · ATEM: ${Math.round(mg.breath)}%${dangerTxt}`);
      if (ui['vhs-t3-repair']) {
        const curPct = Math.round(mg.relays[mg.selectedRelay] || 0);
        ui['vhs-t3-repair'].classList.toggle('active-boost', mg.repairing);
        write(ui['vhs-t3-repair-label'], curPct >= 100 ? `R${mg.selectedRelay + 1} FERTIG ✓` : `R${mg.selectedRelay + 1} REPARIEREN (${curPct}%)`);
      }
      if (ui['vhs-t3-light']) {
        ui['vhs-t3-light'].setAttribute('aria-pressed', String(Boolean(mg.workLightOn)));
        write(ui['vhs-t3-light-label'], mg.workLightOn ? 'LAMPE: AN' : 'LAMPE: AUS');
      }
      if (ui['vhs-t3-breath']) {
        ui['vhs-t3-breath'].classList.toggle('active-boost', mg.holdingBreath);
        write(ui['vhs-t3-breath-label'], mg.holdingBreath ? `HÄLT ATEM (${Math.round(mg.breath)}%)` : 'ATEM ANHALTEN');
      }
    }
  }

  showMinigameResult(mg, { won, reward = 0, loreTitle = '', loreText = '', canRetry = true }) {
    const ui = this.el;
    if (!ui['vhs-result']) return;
    ui['vhs-result'].hidden = false;
    write(ui['vhs-result-kicker'], won ? 'BAND ARCHIVIERT' : 'BANDAUFNAHME ABGEBROCHEN');
    if (ui['vhs-result-kicker']) ui['vhs-result-kicker'].classList.toggle('red', !won);
    write(ui['vhs-result-title'], won ? mg.title : 'SIGNALVERLUST');
    write(ui['vhs-result-reward'], won ? `+${formatEuros(reward)} Trinkgeld gutgeschrieben` : 'Kein Protokoll gespeichert.');
    if (ui['vhs-result-lore']) {
      ui['vhs-result-lore'].hidden = !won || !loreText;
      write(ui['vhs-result-lore'], won ? `${loreTitle} — ${loreText}` : '');
    }
    if (ui['vhs-result-retry']) ui['vhs-result-retry'].hidden = !canRetry;
  }

  paint(run) {
    if (!run) return;
    const ui = this.el;
    const out = Boolean(run.powerOutage);
    const inJumpscare = run.state === 'jumpscare';
    const fuseSeconds = Math.ceil((run.cameraFuseUntil || 0) - run.time);
    const breakerFault = Boolean(run.breakerTripped || fuseSeconds > 0);

    write(ui['clock-hour'], getHourLabel(run));
    write(ui['clock-night'], run.nightTitle);

    // Mandatory Shift Order Quota Pill & Active Ticket Indicator
    const ord = run.orders;
    const completed = ord?.completed ?? 0;
    const quota = ord?.quota ?? 0;
    const quotaMet = completed >= quota;
    if (ui['quota-pill']) {
      ui['quota-pill'].hidden = out || inJumpscare;
      ui['quota-pill'].classList.toggle('done', quotaMet && !run.overtime);
      ui['quota-pill'].classList.toggle('overtime', Boolean(run.overtime));
      write(
        ui['quota-label'],
        run.overtime
          ? `ÜBERSTUNDEN · NOCH ${Math.max(1, quota - completed)} BON`
          : `PFLICHT-BONS: ${completed}/${quota}${quotaMet ? ' ✓' : ''}`,
      );
    }

    const activeBon = ord?.active;
    if (ui['active-bon-chip']) {
      const showChip = Boolean(activeBon && !out && !inJumpscare);
      ui['active-bon-chip'].hidden = !showChip;
      if (showChip) {
        const leftSec = Math.max(0, activeBon.deadline - run.time);
        const pctBon = run.overtime ? 100 : Math.max(0, Math.min(100, (leftSec / activeBon.duration) * 100));
        const stepLabel = activeBon.step === 'doner'
          ? '1/3 SPIESS'
          : activeBon.step === 'fryer'
            ? (activeBon.fryerState === 'ready' ? '2/3 KORB HEBEN!' : activeBon.fryerState === 'frying' ? '2/3 FRITTIERT' : '2/3 FRITTEUSE')
            : '3/3 EINPACKEN';
        ui['active-bon-chip'].classList.toggle('urgent', !run.overtime && leftSec < 6.0);
        write(
          ui['active-bon-text'],
          run.viewState === 'back' && !run.monitorOpen
            ? `BON #${activeBon.id} · ${stepLabel}`
            : `BON #${activeBon.id} · ${stepLabel} [S]`,
        );
        if (ui['active-bon-bar']) ui['active-bon-bar'].style.width = `${pctBon.toFixed(1)}%`;
      }
    }

    // Power, Usage, Seismograph & Fryer Heat Box
    const pct = Math.ceil(run.power);
    write(ui['power-pct'], `${pct}%`);
    if (ui['power-box']) {
      ui['power-box'].hidden = out || inJumpscare;
      ui['power-box'].classList.toggle('low', pct <= 20 || run.breakerTripped);
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

    const heat = Math.round(run.thermal?.heat ?? 16);
    const tempC = getTemperatureCelsius(run);
    const venting = isVentingSteam(run);
    if (ui['thermal-label']) {
      write(ui['thermal-label'], `${tempC}°C`);
      ui['thermal-label'].className = `thermal-val${heat >= 72 ? ' hot' : heat >= 45 ? ' warm' : ''}`;
    }
    if (ui['thermal-fill']) {
      ui['thermal-fill'].style.width = `${Math.max(6, Math.min(100, heat))}%`;
      ui['thermal-fill'].className = heat >= 72 ? 'hot' : heat >= 45 ? 'warm' : '';
    }

    // Contextual 2-Station + Under-Desk Booth Controls
    const showOfficeHud = !run.monitorOpen && !out && !inJumpscare;
    if (ui['office-controls']) ui['office-controls'].hidden = !showOfficeHud;

    if (showOfficeHud) {
      const st = run.viewState || 'front';
      if (ui['front-controls']) ui['front-controls'].hidden = st !== 'front';
      if (ui['back-controls']) ui['back-controls'].hidden = st !== 'back';
      if (ui['under-desk-controls']) ui['under-desk-controls'].hidden = st !== 'under_desk';

      const flashCap = Math.round(run.flashlightBattery ?? 100);
      const officeBreached = run.animatronics.anton.room === 'office' || run.animatronics.tom.room === 'office';

      if (st === 'front') {
        const syncSwitch = (btn, active, jammed) => {
          if (!btn) return;
          btn.setAttribute('aria-pressed', String(Boolean(active)));
          btn.classList.toggle('jammed', Boolean(jammed));
        };
        syncSwitch(ui['btn-left-door'], run.leftDoor, run.leftJammed);
        syncSwitch(ui['btn-left-light'], run.leftLight, run.leftJammed || run.breakerTripped);
        syncSwitch(ui['btn-right-door'], run.rightDoor, run.rightJammed);
        syncSwitch(ui['btn-right-light'], run.rightLight, run.rightJammed || run.breakerTripped);

        if (ui['btn-flashlight']) {
          ui['btn-flashlight'].setAttribute('aria-pressed', String(Boolean(run.flashlightOn)));
          ui['btn-flashlight'].disabled = flashCap <= 1;
          write(ui['flashlight-label'], `LAMPE · ${flashCap}%`);
        }
        if (ui['btn-turn-back']) {
          ui['btn-turn-back'].classList.toggle('urgent', breakerFault);
          ui['btn-turn-back'].classList.toggle('attention', !breakerFault && Boolean(activeBon));
          write(
            ui['turn-back-label'],
            breakerFault ? '⚡ SICHERUNG HINTEN!' : activeBon ? '180° ZUR KÜCHE (BON)' : '180° UMDREHEN',
          );
        }
        if (ui['btn-under-desk']) {
          ui['btn-under-desk'].classList.toggle('urgent', officeBreached);
          write(ui['under-desk-label'], officeBreached ? '⚠ UNTER THEKE!' : 'UNTER THEKE');
        }
      } else if (st === 'back') {
        // 3-Step Tactile Prep Buttons
        const donerBtn = ui['btn-prep-doner'];
        if (donerBtn) {
          const isStep = Boolean(activeBon && activeBon.step === 'doner');
          const done = Boolean(activeBon && activeBon.step !== 'doner');
          donerBtn.disabled = !isStep;
          donerBtn.classList.toggle('step-active', isStep);
          const pctD = isStep ? Math.round(((activeBon.donerProgress || 0) / PREP_DONER_SECONDS) * 100) : (done ? 100 : 0);
          write(ui['prep-doner-label'], done ? '1. SPIESS ✓' : isStep ? `1. SCHNEIDEN (${pctD}%)` : '1. SPIESS');
          if (ui['prep-doner-bar']) ui['prep-doner-bar'].style.width = `${pctD}%`;
        }

        const fryerBtn = ui['btn-prep-fryer'];
        if (fryerBtn) {
          const isStep = Boolean(activeBon && activeBon.step === 'fryer');
          const done = Boolean(activeBon && activeBon.step === 'bag');
          const fState = activeBon?.fryerState || 'idle';
          fryerBtn.disabled = !isStep || fState === 'frying';
          fryerBtn.classList.toggle('step-active', isStep && fState !== 'frying');
          fryerBtn.classList.toggle('urgent', isStep && fState === 'ready');
          write(
            ui['prep-fryer-label'],
            done
              ? '2. POMMES ✓'
              : !isStep
                ? '2. FRITTEUSE'
                : fState === 'idle'
                  ? '2. KORB SENKEN'
                  : fState === 'frying'
                    ? `FRITTIERT (${Math.ceil(activeBon.fryerTimer)}s)`
                    : '2. KORB HEBEN!',
          );
        }

        const bagBtn = ui['btn-prep-bag'];
        if (bagBtn) {
          const isStep = Boolean(activeBon && activeBon.step === 'bag');
          bagBtn.disabled = !isStep;
          bagBtn.classList.toggle('step-active', isStep);
          const pctB = isStep ? Math.round(((activeBon.bagProgress || 0) / PREP_BAG_SECONDS) * 100) : 0;
          write(ui['prep-bag-label'], isStep ? `3. EINPACKEN (${pctB}%)` : '3. EINPACKEN');
          if (ui['prep-bag-bar']) ui['prep-bag-bar'].style.width = `${pctB}%`;
        }

        if (ui['btn-reset-breaker']) {
          ui['btn-reset-breaker'].hidden = !breakerFault;
        }

        const ventBtn = ui['btn-vent-steam'];
        if (ventBtn) {
          ventBtn.disabled = venting || heat < 10;
          ventBtn.classList.toggle('hot', heat >= 70);
          ventBtn.classList.toggle('steam-ready', heat >= STEAM_BURST_MIN_HEAT && heat < 70);
          write(ui['vent-btn-label'], venting ? 'ABLUFT ZISCHT' : `VENTIL · ${tempC}°C`);
        }

        if (ui['btn-back-flashlight']) {
          ui['btn-back-flashlight'].setAttribute('aria-pressed', String(Boolean(run.flashlightOn)));
          ui['btn-back-flashlight'].disabled = flashCap <= 1;
          write(ui['back-flash-label'], `LUKE · ${flashCap}%`);
        }
      } else {
        // Under-Desk Survival View
        const breathPct = Math.round(run.breath ?? 100);
        write(ui['breath-label'], `ATEM: ${breathPct}%`);
        if (ui['breath-fill']) {
          ui['breath-fill'].style.width = `${Math.max(4, breathPct)}%`;
          ui['breath-fill'].className = breathPct <= 25 ? 'critical' : run.holdingBreath ? 'holding' : '';
        }
        if (ui['btn-hold-breath']) {
          ui['btn-hold-breath'].setAttribute('aria-pressed', String(Boolean(run.holdingBreath)));
          ui['btn-hold-breath'].classList.toggle('active-boost', Boolean(run.holdingBreath));
          write(ui['hold-breath-label'], run.holdingBreath ? 'HÄLT LUFT AN...' : 'ATEM ANHALTEN');
        }
      }
    }

    // Bottom CCTV Monitor Bar vs Breaker Tripped Warning Bar
    const hideMonitorForDesk = run.viewState === 'under_desk';
    if (ui['btn-monitor']) {
      ui['btn-monitor'].hidden = out || inJumpscare || breakerFault || hideMonitorForDesk;
      ui['btn-monitor'].setAttribute('aria-pressed', String(Boolean(run.monitorOpen)));
      write(ui['monitor-label'], run.monitorOpen ? 'MONITOR SENKEN' : 'CCTV MONITOR');
    }
    if (ui['btn-breaker-warn']) {
      ui['btn-breaker-warn'].hidden = out || inJumpscare || !breakerFault || hideMonitorForDesk;
      write(
        ui['btn-breaker-warn'],
        run.viewState === 'back' ? '⚡ HAUPTSICHERUNG HOCHZIEHEN [R]' : '⚡ HAUPTSICHERUNG HINTEN [S]',
      );
    }

    if (ui['video-takeover']) {
      ui['video-takeover'].hidden = !inJumpscare || run.jumpscare?.cause !== 'video';
    }

    // CCTV Overlay & Single Context-Sensitive Countermeasure ([X])
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
        if (activeBon) hint = isOrderExpress(run) ? '⚡ NEUER BON HINTEN!' : '⚠ OFFENER BON';
        else if (heat >= 75) hint = '⚠ HITZESTAU FRITTEUSE';
        else if (run.activeCam === '1C' && run.animatronics.hauke.stage === 2) hint = '⚠ BEREITSCHAFT';
        else if (run.activeCam === '1C' && run.animatronics.hauke.stage >= 3) hint = '⚠ SEKTOR LEER';
        else if (run.activeCam === '2B' && run.goldenPoster) hint = '⚠ KEIN LICHT';
        write(ui['cctv-hint'], hint);
      }

      // Unified Context-Sensitive Countermeasure Button ([X])
      const counterBtn = ui['btn-cam-counter'];
      if (counterBtn) {
        const bellCd = Math.ceil((run.kitchenBellUntil || 0) - run.time);
        const steamCd = Math.ceil((run.thermal?.burstCooldownUntil || 0) - run.time);
        const irCd = Math.ceil((run.camFlashCooldownUntil || 0) - run.time);
        const tomNearEast = ['4A', '4B', 'right_door'].includes(run.animatronics.tom.room);

        if (run.activeCam === '6' || (run.activeCam === '4A' && bellCd <= 0 && tomNearEast)) {
          counterBtn.classList.remove('steam-btn');
          counterBtn.disabled = bellCd > 0 || disrupted || run.power <= KITCHEN_BELL_COST;
          write(ui['cam-counter-label'], bellCd > 0 ? `KÜCHENGONG (${bellCd}s)` : 'KÜCHENGONG (0%)');
        } else if ((run.activeCam === '2B' || run.activeCam === '4B') && heat >= STEAM_BURST_MIN_HEAT && steamCd <= 0) {
          counterBtn.classList.add('steam-btn');
          counterBtn.disabled = false;
          write(ui['cam-counter-label'], 'FLUR-DAMPFSTOSS (0%)');
        } else {
          counterBtn.classList.remove('steam-btn');
          counterBtn.disabled = irCd > 0 || run.power <= IR_FLASH_COST;
          write(ui['cam-counter-label'], irCd > 0 ? `IR-STROBOSKOP (${irCd}s)` : `IR-STROBOSKOP −${IR_FLASH_COST}%`);
        }
      }

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
              ? (run.animatronics.tom.room === '6' ? 'DOSEN & BLECHE KLAPPERN' : 'PFANNE & SCHRITTE IN DER KÜCHE')
              : 'LÜFTUNG & FRITTEUSE SUMMEN',
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

    const showAlert = !out && !inJumpscare && this.paintShiftAlert(run);
    if (ui['shift-alert']) ui['shift-alert'].hidden = !showAlert;

    if (ui['btn-mute-call']) {
      ui['btn-mute-call'].hidden = !run.callActive || run.callMuted || out || inJumpscare;
    }
    if (ui['call-box']) {
      const showCall = Boolean(run.callText) && !run.callMuted && !out && !inJumpscare && !showAlert;
      ui['call-box'].hidden = !showCall;
      if (showCall) write(ui['call-text'], run.callText);
    }

    if (ui.hallucination) {
      ui.hallucination.hidden = !run.hallucination || inJumpscare;
      if (run.hallucination) write(ui['hallucination-text'], run.hallucination.text);
    }
  }

  /**
   * Psychological Horror Discipline:
   * Zero arcade/meme banners! Only critical physical booth emergencies (breaker trip, overtime,
   * incoming video hijack when interrupted) or opt-in Accessibility Audio Subtitles appear here.
   */
  paintShiftAlert(run) {
    const subs = Boolean(this.audioSubtitles);
    const breach = run.animatronics.anton.room === 'office' || run.animatronics.tom.room === 'office';
    const sprint = subs && run.animatronics.hauke.sprint.triggered;
    const west = subs && !run.leftDoor && run.animatronics.anton.room === 'left_door';
    const east = subs && !run.rightDoor && run.animatronics.tom.room === 'right_door';
    const hatch = subs && run.animatronics.tom.room === 'back_hatch';
    const center = subs && run.animatronics.torge.room === 'center_near';

    let title;
    let text;
    let timer;

    if (breach && run.viewState !== 'under_desk') {
      title = 'EINBRUCH IN DER KABINE';
      text = 'Sofort unter die Theke [C] ducken und Atem anhalten [Space]!';
    } else if (run.antonVideo.deadline) {
      if (!sprint && run.monitorOpen && !feedIsInterrupted(run)) return false;
      title = 'ÜBERTRAGUNG · ANTON';
      text = 'Kamera wechseln oder Monitor schließen!';
      timer = Math.ceil(run.antonVideo.deadline - run.time);
    } else if (run.breakerTripped && run.viewState !== 'back') {
      title = 'HAUPTSICHERUNG AUSGELÖST';
      text = 'Um 180° zur Rückwand drehen [S] und den Sicherungshebel [R] hochziehen.';
    } else if (sprint) {
      title = 'UNTERTITEL · SCHWERE SCHRITTE LINKS';
      text = 'Linker Rollladen [Q] schließen!';
    } else if (center) {
      title = 'UNTERTITEL · SCHLEIFEN IN DER DURCHREICHE';
      text = 'Taschenlampe [F] in den Mittelgang richten.';
    } else if (hatch) {
      title = 'UNTERTITEL · KLOPFEN AN DER HINTERLUKE';
      text = '180° umdrehen [S] und Hinterluke mit [F] ableuchten.';
    } else if (west || east) {
      title = west ? 'UNTERTITEL · BEWEGUNG WESTTÜR' : 'UNTERTITEL · DOSENKLAPPERN OSTFENSTER';
      text = 'Licht/Taschenlampe prüfen und Rollladen schließen.';
    } else if (run.notice?.until > run.time && (!run.notice.audioCue || subs)) {
      title = run.notice.audioCue ? 'AKUSTIK-UNTERTITEL' : 'SYSTEMHINWEIS';
      text = run.notice.text;
    } else {
      return false;
    }

    const ui = this.el;
    ui['shift-alert']?.classList.toggle('urgent', breach || run.breakerTripped || sprint || Boolean(run.antonVideo.deadline));
    write(ui['shift-alert-title'], title);
    write(ui['shift-alert-text'], text);
    write(ui['shift-alert-timer'], timer ? `${timer} s` : '');
    return true;
  }

  showPause(run) {
    const ord = run.orders;
    write(
      this.el['pause-meta'],
      `${run.nightTitle} · ${getHourLabel(run)} · Strom ${Math.ceil(run.power)}% · Bons ${ord?.completed ?? 0}/${ord?.quota ?? 0}`,
    );
  }

  showGameOver(run) {
    const killer = CHARACTERS[run.killedBy];
    write(this.el['gameover-kicker'], killer ? `AUFNAHME ENDE · ${killer.name.toUpperCase()}` : 'SIGNALVERLUST');
    write(this.el['gameover-title'], 'SCHICHT ENDE');
    write(this.el['gameover-line'], run.deathLine || killer?.deathLine || 'Die Überwachungskabine wurde nicht bis 06:00 Uhr gehalten.');
    write(this.el['gameover-hint'], RETRY_HINTS[run.jumpscare?.cause] ?? RETRY_HINTS[run.killedBy] ?? '');
    write(
      this.el['gameover-meta'],
      `${run.nightTitle} · ${getHourLabel(run)} · Strom ${Math.ceil(run.power)}% · Pflicht-Bons ${run.orders?.completed ?? 0}/${run.orders?.quota ?? 0}`,
    );
  }

  showWin(run, { isNewRecord = false, shiftTips = 0 } = {}) {
    write(this.el['win-clock'], '5:59 AM');
    const rank = computeShiftRank(run);
    write(this.el['win-rank-grade'], rank.grade);
    write(this.el['win-rank-label'], rank.label);
    write(this.el['win-rank-wage'], rank.wage);
    if (this.el['win-record-pill']) this.el['win-record-pill'].hidden = !isNewRecord;

    const tipText = shiftTips > 0 ? ` · +${formatEuros(shiftTips)} Trinkgeld` : '';
    const sub = run.night === 5
      ? `WOCHENABRECHNUNG FREIGEGEBEN${tipText}`
      : run.night === 6
        ? `NACHSCHICHT ÜBERSTANDEN${tipText}`
        : `${run.nightTitle} ABGESCHLOSSEN${tipText}`;
    write(this.el['win-sub'], sub);
    write(
      this.el['win-stats'],
      `Reststrom: ${Math.ceil(run.power)}% · Bons: ${run.orders?.completed ?? 0}/${run.orders?.quota ?? 0} · Abgewehrt: ${(run.stats.haukeBlocked || 0) + (run.stats.antonBlocked || 0) + (run.stats.tomBlocked || 0) + (run.stats.torgeRepelled || 0)}× · Unter Theke: ${run.stats.underDeskSurvived || 0}×`,
    );
    setTimeout(() => {
      write(this.el['win-clock'], '6:00 AM');
    }, 850);
  }
}
