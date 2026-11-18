import { interaction, TOTAL_RECORDS } from './game.js';
import { WIDTH, DEPTH, LIFT, RECORDS, cell, roomAt } from './level.js';

export const get = (id) => document.getElementById(id);
export function write(element, text) {
  if (element && element.textContent !== text) element.textContent = text;
}

const mapColors = ['#141726', '#252b42', '#252b42', '#353e5c', '#2e254a', '#1e3d3b', '#4a3b32', '#47252d'];
const HIGHSCORE_KEY = 'scavenger_chef_highscore_2026';

export function getHighscore() {
  try {
    return Math.max(1000, Number(localStorage.getItem(HIGHSCORE_KEY)) || 1000);
  } catch {
    return 1000;
  }
}

export function saveHighscore(score) {
  const best = Math.max(getHighscore(), Math.round(score));
  try {
    localStorage.setItem(HIGHSCORE_KEY, String(best));
  } catch {
    // ignore storage restriction
  }
  return best;
}

function formatAura(amount) {
  return Math.round(amount).toLocaleString('de-DE');
}

export class Hud {
  constructor() {
    this.elements = Object.fromEntries([
      'hud', 'location', 'objective', 'crown-badge', 'relic-rack', 'record-counter', 'pfand-counter',
      'noise-label', 'noise-meter', 'lamp-state', 'interact', 'interact-key', 'interact-label',
      'notice', 'clapper-count', 'dash-state', 'bonk-state', 'bonk-fill', 'dash-fill', 'world-barks',
      'boss-bar', 'boss-name', 'boss-status', 'boss-bar-fill',
      'touch-use', 'touch-dash', 'touch-shutter', 'touch-lure', 'touch-bonk',
      'orb-bonk', 'orb-dash', 'slot-lamp', 'slot-lure', 'menu-aura',
      'vignette', 'chart', 'chart-map', 'chart-toggle', 'overlay-receipt',
    ].map((id) => [id, get(id)]));
    const map = this.elements['chart-map'];
    this.chart = map.getContext('2d');
    this.scale = Math.min((map.width - 12) / WIDTH, (map.height - 12) / DEPTH);
    this.plan = document.createElement('canvas');
    this.plan.width = map.width;
    this.plan.height = map.height;
    const plan = this.plan.getContext('2d');
    plan.fillStyle = '#0b0c14';
    plan.fillRect(0, 0, map.width, map.height);
    for (let z = 0; z < DEPTH; z++) {
      for (let x = 0; x < WIDTH; x++) {
        const c = cell(x, z);
        if (!c) continue;
        plan.fillStyle = mapColors[c - 1];
        plan.fillRect(this.px(x), this.py(z), this.scale + 0.3, this.scale + 0.3);
      }
    }
    this.barkNodes = new Map();
    this.syncMenuHighscore();
  }

  syncMenuHighscore() {
    if (this.elements['menu-aura']) {
      write(this.elements['menu-aura'], formatAura(getHighscore()));
    }
  }

  clearFloating() {
    if (this.elements['world-barks']) this.elements['world-barks'].innerHTML = '';
    this.barkNodes.clear();
    if (this.elements.notice) this.elements.notice.hidden = true;
    if (this.elements.interact) this.elements.interact.hidden = true;
  }

  px(x) { return 6 + this.scale * x; }
  py(z) { return 6 + this.scale * z; }

  toggleChart(run, show = this.elements.chart.hidden) {
    this.elements.chart.hidden = !show;
    this.elements['chart-toggle'].setAttribute('aria-expanded', String(show));
    if (show && run) this.drawChart(run);
  }

  drawChart(run) {
    const ctx = this.chart;
    ctx.drawImage(this.plan, 0, 0);
    const place = (point, tint, size, circle = false) => {
      if (!point) return;
      const x = this.px(point.x);
      const z = this.py(point.z);
      ctx.fillStyle = tint;
      if (circle) {
        ctx.beginPath();
        ctx.arc(x, z, size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(x, z);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.restore();
      }
    };
    place(LIFT, '#38f2af', 8);
    if (run.droppedHelmet) place(run.droppedHelmet, '#ffe082', 4.5, true);
    for (const record of RECORDS) {
      if (!run.records.has(record.id)) place(record, '#ffb84d', 4.7, true);
    }
    place(run.listener, '#73d7ff', 4.6, true);
    place(run.hauke, '#ff3b56', 6.2, true);
    place(run.tom, '#38f2af', 4.0, true);
    place(run.player, '#f4ebd9', 5.4, true);
  }

  renderReceipt(run) {
    const box = this.elements['overlay-receipt'];
    if (!box || !run) return;
    const stats = run.stats ?? { bonks: 0, slips: 0, cans: 0, stolen: 0, toots: 0, valves: 0, haukeKos: 0, dodges: 0, wallSlams: 0 };
    const aura = run.player.pfand ?? 1000;
    const penalty = run.state === 'caught' ? 1200 : 0;
    const net = Math.max(0, aura - penalty);
    const best = saveHighscore(net);
    this.syncMenuHighscore();

    const rank = run.state === 'escaped' && (stats.haukeKos > 0 || stats.wallSlams > 0 || stats.bonks >= 2)
      ? 'ÜBERLEGENER CHEF TORGE (MAX AURA)'
      : run.state === 'escaped'
        ? 'Zertifizierter Macher'
        : run.caughtBy === 'hauke'
          ? 'Von Haukes Gravitation absorbiert'
          : 'Im Dunkeln genauso lost wie Anton';

    box.innerHTML = `
      <div class="receipt-row"><span>Relikte (${run.records.size}/3) · Max-Combo</span><span>${run.player.maxCombo || 1}× Streak</span></div>
      <div class="receipt-row"><span>Schellen (${stats.bonks}×) · Wand-Crash (${stats.wallSlams || 0}×) · K.O. (${stats.haukeKos || 0}×)</span><span>+${formatAura(stats.bonks * 1000 + (stats.haukeKos || 0) * 4000)} ⚡</span></div>
      <div class="receipt-row"><span>Knapp-Dash (${stats.dodges || 0}×) · Slips (${stats.slips}×) · Tom-Klau (${stats.stolen}×)</span><span>${stats.cans} Dosen</span></div>
      ${penalty > 0 ? `<div class="receipt-row"><span>Keller-Verlust</span><span>-${formatAura(penalty)} ⚡</span></div>` : ''}
      <div class="receipt-row total"><span>Score (Rekord: ${formatAura(best)})</span><span>${formatAura(net)} ⚡</span></div>
      <div class="receipt-rank"><strong>${rank}</strong></div>
    `;
    box.hidden = false;
  }

  paintBarks(run, view) {
    const layer = this.elements['world-barks'];
    if (!layer || !view || !run.barks) return;
    const activeIds = new Set();
    for (const bark of run.barks) {
      const remaining = bark.until - run.time;
      if (remaining <= 0) continue;
      const elapsed = 1 - remaining / bark.duration;
      const screen = view.projectPoint(bark.x, bark.y + elapsed * 0.72, bark.z);
      if (!screen) continue;
      activeIds.add(bark.id);
      let el = this.barkNodes.get(bark.id);
      if (!el) {
        el = document.createElement('div');
        el.className = `world-bark tone-${bark.tone || 'gold'}`;
        el.textContent = bark.text;
        layer.appendChild(el);
        this.barkNodes.set(bark.id, el);
      }
      el.style.left = `${screen.x.toFixed(1)}px`;
      el.style.top = `${screen.y.toFixed(1)}px`;
      el.style.opacity = remaining < 0.28 ? String(Math.max(0, remaining / 0.28)) : '1';
    }
    for (const [id, el] of this.barkNodes.entries()) {
      if (!activeIds.has(id)) {
        el.remove();
        this.barkNodes.delete(id);
      }
    }
  }

  paint(run, view) {
    const ui = this.elements;
    const { player, records, lift, hauke } = run;
    const amount = records.size;
    const callTime = Math.ceil(lift.remaining);
    const objective = amount < TOTAL_RECORDS
      ? `${TOTAL_RECORDS - amount} offen`
      : lift.state === 'calling' ? `Lift ${callTime}s` : 'Zum Lift!';
    write(ui.objective, objective);
    write(ui.location, roomAt(player.x, player.z));
    write(ui['record-counter'], `${amount}/${TOTAL_RECORDS}`);

    if (ui['crown-badge']) {
      const hasCrown = player.helmet !== false;
      ui['crown-badge'].className = `crown-badge ${hasCrown ? 'on' : 'lost'}`;
      write(ui['crown-badge'], hasCrown ? '👑 Schild' : '⚠ KRONE WEG!');
    }

    if (ui['relic-rack']) {
      for (const el of ui['relic-rack'].querySelectorAll('.relic-slot')) {
        el.classList.toggle('got', records.has(el.dataset.relic));
      }
    }

    const comboBadge = (player.combo || 1) >= 2 ? ` · 🔥${player.combo}×` : '';
    write(ui['pfand-counter'], `${formatAura(player.pfand ?? 1000)} ⚡${comboBadge}`);
    ui['pfand-counter']?.parentElement?.classList.toggle('combo', (player.combo || 1) >= 2);

    if (ui['boss-bar'] && hauke) {
      const status = hauke.koTimer > 0
        ? `FRESSKOMA ${Math.ceil(hauke.koTimer)}s`
        : hauke.chargeState === 'windup' || hauke.chargeState === 'rush'
          ? 'RAMMT!!'
          : hauke.stunned > 0
            ? 'TAUMELT'
            : hauke.mode === 'hunt'
              ? 'ROLLT AN'
              : 'LAUERT';
      write(ui['boss-status'], status);
      ui['boss-status'].classList.toggle('ko', hauke.koTimer > 0);
      if (ui['boss-bar-fill']) {
        const pct = hauke.koTimer > 0 ? 0 : Math.max(0, Math.min(100, hauke.hp ?? 100));
        ui['boss-bar-fill'].style.width = `${pct}%`;
      }
    }

    const loudness = Math.ceil(player.noise / 2);
    for (const [index, line] of [...ui['noise-meter'].children].entries()) line.classList.toggle('active', index < loudness);
    ui['noise-meter'].classList.toggle('high', loudness >= 4);
    write(ui['noise-label'], loudness >= 4 ? 'Höllenlärm' : loudness >= 2 ? 'Hörbar' : 'Leise');

    if (ui['lamp-state']) {
      ui['lamp-state'].className = `lamp-pill ${player.lamp ? 'on' : ''}`;
      const boostText = player.beanBoost > 0 ? ` ⚡${Math.ceil(player.beanBoost)}s` : '';
      write(ui['lamp-state'], `${player.lamp ? '🔦 AN' : '🌑 AUS'}${boostText}`);
    }

    write(ui['clapper-count'], String(player.clappers));
    write(ui['dash-state'], player.cooldown > 0 ? `${player.cooldown.toFixed(1)}s` : 'BEREIT');
    write(ui['bonk-state'], player.bonkCooldown > 0 ? `${player.bonkCooldown.toFixed(1)}s` : 'BEREIT');
    if (ui['bonk-fill']) ui['bonk-fill'].style.height = `${Math.min(100, (player.bonkCooldown / 1.85) * 100)}%`;
    if (ui['dash-fill']) ui['dash-fill'].style.height = `${Math.min(100, (player.cooldown / 2.15) * 100)}%`;

    ui['touch-dash'].disabled = player.cooldown > 0;
    ui['touch-lure'].disabled = player.clappers === 0;
    if (ui['slot-lure']) ui['slot-lure'].disabled = player.clappers === 0;
    if (ui['touch-bonk']) ui['touch-bonk'].disabled = player.bonkCooldown > 0;
    if (ui['orb-bonk']) ui['orb-bonk'].disabled = player.bonkCooldown > 0;
    if (ui['orb-dash']) ui['orb-dash'].disabled = player.cooldown > 0;
    ui['touch-shutter'].setAttribute('aria-pressed', String(player.lamp));

    this.paintBarks(run, view);

    const action = interaction(run);
    ui['touch-use'].disabled = !action?.enabled;
    ui.interact.hidden = !action;
    ui['interact-key'].hidden = !action?.enabled;
    write(ui['interact-label'], action?.text ?? '');

    const notice = run.notices[0];
    ui.notice.hidden = !notice;
    write(ui.notice, notice?.message ?? '');

    ui.vignette.classList.toggle('alert', run.listener.mode === 'hunt' || run.hauke?.mode === 'hunt' || run.hauke?.chargeState !== 'none');
    if (!ui.chart.hidden) this.drawChart(run);
  }
}
