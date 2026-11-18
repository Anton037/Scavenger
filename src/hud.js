import { interaction, TOTAL_RECORDS } from './game.js';
import { WIDTH, DEPTH, LIFT, RECORDS, cell, roomAt } from './level.js';

export const get = (id) => document.getElementById(id);
export function write(element, text) {
  if (element && element.textContent !== text) element.textContent = text;
}

const mapColors = ['#1b2d32', '#283f46', '#283f46', '#4b6573', '#302f4b', '#263d39', '#615347', '#4d3736'];

function formatAura(amount) {
  return `${Math.round(amount).toLocaleString('de-DE')} Aura`;
}

export class Hud {
  constructor() {
    this.elements = Object.fromEntries([
      'hud', 'location', 'objective', 'record-counter', 'record-pips', 'pfand-counter',
      'noise-label', 'noise-meter', 'lamp-state', 'interact', 'interact-key', 'interact-label',
      'notice', 'clapper-count', 'dash-state', 'bonk-state', 'popups',
      'boss-bar', 'boss-name', 'boss-status', 'boss-bar-fill', 'upgrade-modal',
      'touch-use', 'touch-dash', 'touch-shutter', 'touch-lure', 'touch-bonk',
      'orb-bonk', 'orb-dash',
      'vignette', 'chart', 'chart-map', 'chart-toggle', 'overlay-receipt',
    ].map((id) => [id, get(id)]));
    const map = this.elements['chart-map'];
    this.chart = map.getContext('2d');
    this.scale = Math.min((map.width - 12) / WIDTH, (map.height - 12) / DEPTH);
    this.plan = document.createElement('canvas');
    this.plan.width = map.width;
    this.plan.height = map.height;
    const plan = this.plan.getContext('2d');
    plan.fillStyle = '#101c20';
    plan.fillRect(0, 0, map.width, map.height);
    for (let z = 0; z < DEPTH; z++) {
      for (let x = 0; x < WIDTH; x++) {
        const c = cell(x, z);
        if (!c) continue;
        plan.fillStyle = mapColors[c - 1];
        plan.fillRect(this.px(x), this.py(z), this.scale + 0.3, this.scale + 0.3);
      }
    }
    this.lastPopupKey = '';
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
    place(LIFT, '#91c9b4', 8);
    for (const record of RECORDS) {
      if (!run.records.has(record.id)) place(record, '#e5b878', 4.7, true);
    }
    place(run.listener, '#bacfd9', 4.6, true);
    place(run.hauke, '#f08e70', 6.2, true);
    place(run.tom, '#91c9b4', 4.0, true);
    place(run.player, '#f5e5c9', 5.4, true);
  }

  renderReceipt(run) {
    const box = this.elements['overlay-receipt'];
    if (!box || !run) return;
    const stats = run.stats ?? { bonks: 0, slips: 0, cans: 0, stolen: 0, toots: 0, valves: 0 };
    const aura = run.player.pfand ?? 1000;
    const penalty = run.state === 'caught' ? 1500 : 0;
    const net = aura - penalty;
    const rank = run.state === 'escaped' && stats.bonks >= 2
      ? 'ÜBERLEGENER CHEF TORGE (MAX AURA)'
      : run.state === 'escaped'
        ? 'Zertifizierter Macher (Spezi-Retter)'
        : run.caughtBy === 'hauke'
          ? 'Von Haukes Gravitation absorbiert'
          : 'Genauso lost wie Anton';

    box.innerHTML = `
      <div class="receipt-row"><span>Geborgene Schätze (${run.records.size}/3)</span><span>+${formatAura(run.records.size * 2000)}</span></div>
      <div class="receipt-row"><span>Chef-Schellen (${stats.bonks}×) &amp; Pfand-Dosen (${stats.cans}×)</span><span>+${formatAura(stats.bonks * 1200 + stats.cans * 250)}</span></div>
      <div class="receipt-row"><span>Anton-Fails / Ventile / Tom-Schnorrer</span><span>${stats.slips}× / ${stats.valves}× / ${stats.stolen}×</span></div>
      ${penalty > 0 ? `<div class="receipt-row"><span>Aura-Verlust (im Schacht gecatcht)</span><span>-${formatAura(penalty)}</span></div>` : ''}
      <div class="receipt-row total"><span>Finaler Chef-Aura-Score</span><span>⚡ ${formatAura(net)}</span></div>
      <div class="receipt-rank">Status: <strong>${rank}</strong></div>
    `;
    box.hidden = false;
  }

  paint(run) {
    const ui = this.elements;
    const { player, records, lift, hauke } = run;
    const amount = records.size;
    const callTime = Math.ceil(lift.remaining);
    const objective = amount < TOTAL_RECORDS
      ? 'Hol Chef-Krone, Spezi & Döner'
      : lift.state === 'calling' ? `Aufzug kommt in ${callTime}s!` : 'Ab zum Aufzug!';
    write(ui.objective, objective);
    write(ui.location, roomAt(player.x, player.z));
    write(ui['record-counter'], `${amount} / ${TOTAL_RECORDS}`);
    write(ui['pfand-counter'], `⚡ ${formatAura(player.pfand ?? 1000)}`);
    for (const [index, pip] of [...ui['record-pips'].children].entries()) pip.classList.toggle('found', index < amount);

    if (ui['boss-bar'] && hauke) {
      const gap = Math.hypot(hauke.x - player.x, hauke.z - player.z);
      const status = hauke.stunned > 0
        ? 'GEBONKT · TAUMELT'
        : hauke.mode === 'hunt'
          ? 'ROLLT MIT VOLLER MASSE AN!'
          : gap < 9
            ? 'BEBEN SPÜRBAR'
            : 'PATROUILLIERT';
      write(ui['boss-status'], status);
      if (ui['boss-bar-fill']) {
        const pct = hauke.stunned > 0 ? Math.max(25, 100 - hauke.stunned * 22) : 96;
        ui['boss-bar-fill'].style.width = `${pct}%`;
      }
    }

    const loudness = Math.ceil(player.noise / 2);
    for (const [index, line] of [...ui['noise-meter'].children].entries()) line.classList.toggle('active', index < loudness);
    ui['noise-meter'].classList.toggle('high', loudness >= 4);
    write(ui['noise-label'], loudness >= 4 ? 'Höllenlärm' : loudness >= 2 ? 'Hörbar' : 'Leise');
    const boostText = player.beanBoost > 0 ? ' · ⚡ Booster aktiv!' : '';
    write(ui['lamp-state'], `${player.lamp ? 'Taschenlampe an' : 'Licht gedimmt'}${boostText}`);
    write(ui['clapper-count'], String(player.clappers));
    write(ui['dash-state'], player.cooldown > 0 ? `${Math.ceil(player.cooldown)}s` : 'BEREIT');
    write(ui['bonk-state'], player.bonkCooldown > 0 ? `${Math.ceil(player.bonkCooldown)}s` : 'BEREIT');
    ui['touch-dash'].disabled = player.cooldown > 0;
    ui['touch-lure'].disabled = player.clappers === 0;
    if (ui['touch-bonk']) ui['touch-bonk'].disabled = player.bonkCooldown > 0;
    if (ui['orb-bonk']) ui['orb-bonk'].disabled = player.bonkCooldown > 0;
    if (ui['orb-dash']) ui['orb-dash'].disabled = player.cooldown > 0;
    ui['touch-shutter'].setAttribute('aria-pressed', String(player.lamp));

    if (ui.popups && run.popups) {
      const key = run.popups.map((p) => p.id).join(',');
      if (key !== this.lastPopupKey) {
        this.lastPopupKey = key;
        ui.popups.innerHTML = run.popups.map((p) => `<div class="popup-tag">${p.text}</div>`).join('');
      }
    }

    const action = interaction(run);
    ui['touch-use'].disabled = !action?.enabled;
    ui.interact.hidden = !action;
    ui['interact-key'].hidden = !action?.enabled;
    write(ui['interact-label'], action?.text ?? '');
    const notice = run.notices[0];
    ui.notice.hidden = !notice;
    write(ui.notice, notice?.message ?? '');
    ui.vignette.classList.toggle('alert', run.listener.mode === 'hunt' || run.hauke?.mode === 'hunt');
    if (!ui.chart.hidden) this.drawChart(run);
  }
}
