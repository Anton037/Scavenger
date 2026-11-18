import { interaction } from './game.js';
import { ICONS, modIcon, relicIcon } from './icons.js';
import { BIOMES } from './level.js';

export const get = (id) => document.getElementById(id);
export function write(element, text) {
  if (element && element.textContent !== text) element.textContent = text;
}

const mapColors = ['#121524', '#232942', '#232942', '#313a59', '#2b2447', '#1c3a39', '#45362e', '#42222b', '#22364d'];
const HIGHSCORE_KEY = 'scavenger_chef_highscore_2026';
const BEST_FLOOR_KEY = 'scavenger_chef_bestfloor_2026';

export function getBestStats() {
  try {
    return {
      score: Math.max(1000, Number(localStorage.getItem(HIGHSCORE_KEY)) || 1000),
      floor: Math.max(1, Number(localStorage.getItem(BEST_FLOOR_KEY)) || 1),
    };
  } catch {
    return { score: 1000, floor: 1 };
  }
}

export function saveBestStats(score, floor) {
  const prev = getBestStats();
  const bestScore = Math.max(prev.score, Math.round(score));
  const bestFloor = Math.max(prev.floor, floor);
  try {
    localStorage.setItem(HIGHSCORE_KEY, String(bestScore));
    localStorage.setItem(BEST_FLOOR_KEY, String(bestFloor));
  } catch {
    // ignore storage limits
  }
  return { score: bestScore, floor: bestFloor };
}

function formatAura(amount) {
  return Math.round(amount).toLocaleString('de-DE');
}

export class Hud {
  constructor() {
    for (const slot of document.querySelectorAll('.ico-slot[data-ico]')) {
      slot.innerHTML = ICONS[slot.dataset.ico] ?? '';
    }
    this.elements = Object.fromEntries([
      'hud', 'floor-badge', 'location', 'objective', 'mutator-pill', 'crown-badge', 'relic-rack',
      'record-counter', 'pfand-counter', 'noise-label', 'noise-meter', 'lamp-state', 'interact',
      'interact-key', 'interact-label', 'notice', 'clapper-count', 'dash-state', 'bonk-state',
      'bonk-fill', 'dash-fill', 'world-barks', 'boss-bar', 'boss-name', 'boss-status', 'boss-bar-fill',
      'touch-use', 'touch-dash', 'touch-shutter', 'touch-lure', 'touch-bonk', 'orb-bonk', 'orb-dash',
      'slot-lamp', 'slot-lure', 'menu-best', 'vignette', 'chart', 'chart-map', 'chart-toggle',
      'chart-seed', 'overlay-receipt', 'lift-screen', 'lift-eyebrow', 'lift-copy', 'mod-list',
    ].map((id) => [id, get(id)]));

    const mapCanvas = this.elements['chart-map'];
    this.chart = mapCanvas.getContext('2d');
    this.plan = document.createElement('canvas');
    this.plan.width = mapCanvas.width;
    this.plan.height = mapCanvas.height;
    this.planMap = null;
    this.scale = 1;
    this.barkNodes = new Map();
    this.lastRelicMap = null;
    this.syncMenuHighscore();
  }

  syncMenuHighscore() {
    if (this.elements['menu-best']) {
      const { floor, score } = getBestStats();
      write(this.elements['menu-best'], `E${floor} · ${formatAura(score)}`);
    }
  }

  clearFloating() {
    if (this.elements['world-barks']) this.elements['world-barks'].innerHTML = '';
    this.barkNodes.clear();
    if (this.elements.notice) this.elements.notice.hidden = true;
    if (this.elements.interact) this.elements.interact.hidden = true;
  }

  ensurePlan(map) {
    if (!map || this.planMap === map) return;
    this.planMap = map;
    const w = this.plan.width;
    const h = this.plan.height;
    this.scale = Math.min((w - 14) / map.width, (h - 14) / map.depth);
    this.offsetX = (w - map.width * this.scale) * 0.5;
    this.offsetZ = (h - map.depth * this.scale) * 0.5;

    const ctx = this.plan.getContext('2d');
    ctx.fillStyle = '#090b14';
    ctx.fillRect(0, 0, w, h);
    for (let z = 0; z < map.depth; z++) {
      for (let x = 0; x < map.width; x++) {
        const c = map.cell(x, z);
        if (!c) continue;
        ctx.fillStyle = mapColors[(c - 1) % mapColors.length];
        ctx.fillRect(this.px(x), this.py(z), this.scale + 0.35, this.scale + 0.35);
      }
    }
    if (this.elements['chart-seed']) {
      write(this.elements['chart-seed'], `#${String(map.seed % 10000).padStart(4, '0')} · ${map.biome.name}`);
    }
  }

  ensureRelicRack(map) {
    if (!map || this.lastRelicMap === map || !this.elements['relic-rack']) return;
    this.lastRelicMap = map;
    this.elements['relic-rack'].innerHTML = map.records.map((rec) => (
      `<span class="relic-slot" data-relic="${rec.id}" title="${rec.name} (${rec.perk})">${relicIcon(rec.id)}</span>`
    )).join('');
  }

  px(x) { return (this.offsetX ?? 7) + this.scale * x; }
  py(z) { return (this.offsetZ ?? 7) + this.scale * z; }

  toggleChart(run, show = this.elements.chart.hidden) {
    this.elements.chart.hidden = !show;
    this.elements['chart-toggle'].setAttribute('aria-expanded', String(show));
    if (show && run) this.drawChart(run);
  }

  drawChart(run) {
    this.ensurePlan(run.map);
    const ctx = this.chart;
    ctx.drawImage(this.plan, 0, 0);
    const place = (point, tint, size, shape = 'square') => {
      if (!point) return;
      const x = this.px(point.x);
      const z = this.py(point.z);
      ctx.fillStyle = tint;
      if (shape === 'circle') {
        ctx.beginPath();
        ctx.arc(x, z, size, 0, Math.PI * 2);
        ctx.fill();
      } else if (shape === 'diamond') {
        ctx.save();
        ctx.translate(x, z);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.restore();
      } else {
        ctx.fillRect(x - size / 2, z - size / 2, size, size);
      }
    };

    for (const c of run.crates) {
      if (!c.broken) place(c, '#a86c3a', 3.2, 'square');
    }
    for (const b of run.barrels) {
      if (!b.exploded) place(b, '#ff5744', 3.6, 'square');
    }
    place(run.map.lift, '#38f2af', 8, 'diamond');
    if (run.droppedHelmet) place(run.droppedHelmet, '#ffe082', 4.6, 'circle');
    for (const record of run.map.records) {
      if (!run.records.has(record.id)) place(record, '#ffb84d', 4.7, 'circle');
    }
    place(run.listener, '#73d7ff', 4.4, 'circle');
    place(run.hauke, '#ff3b56', 6.0, 'circle');
    place(run.tom, '#38f2af', 3.8, 'circle');
    place(run.player, '#f4ebd9', 5.4, 'circle');
  }

  showLiftChoices(run, onPick) {
    const { lift, 'lift-eyebrow': eyebrow, 'lift-copy': copy, 'mod-list': list } = {
      lift: this.elements['lift-screen'],
      'lift-eyebrow': this.elements['lift-eyebrow'],
      'lift-copy': this.elements['lift-copy'],
      'mod-list': this.elements['mod-list'],
    };
    if (!lift || !list) return;
    const nextFloor = run.floor + 1;
    const nextBiome = BIOMES[(nextFloor - 1) % BIOMES.length];
    const nextMult = (1 + (nextFloor - 1) * 0.35).toFixed(2).replace('.', ',');
    write(eyebrow, `LASTENAUFZUG · ETAGE ${run.floor} BEZWUNGEN`);
    write(copy, `Nächster Halt: Etage ${nextFloor} (${nextBiome.name} · Aura ×${nextMult})`);
    list.innerHTML = '';
    for (const mod of run.modOffers) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `mod-switch tone-${mod.tint}`;
      btn.innerHTML = `
        <span class="mod-ico">${modIcon(mod.id)}</span>
        <span class="mod-text"><b>${mod.name}</b><small>${mod.desc}</small></span>
        <span class="btn-arrow" aria-hidden="true">▶</span>
      `;
      btn.addEventListener('click', () => onPick(mod.id));
      list.appendChild(btn);
    }
    lift.hidden = false;
    list.querySelector('button')?.focus({ preventScroll: true });
  }

  renderReceipt(run) {
    const box = this.elements['overlay-receipt'];
    if (!box || !run) return;
    const stats = run.stats ?? {};
    const aura = run.player.pfand ?? 1000;
    const penalty = run.state === 'caught' ? 800 : 0;
    const net = Math.max(0, aura - penalty);
    const best = saveBestStats(net, run.floor);
    this.syncMenuHighscore();

    const rank = run.floor >= 3
      ? 'KELLER-LEGENDE · TORGE SUPREME'
      : run.state === 'escaped' && (stats.haukeKos > 0 || stats.barrels > 0 || stats.bonks >= 3)
        ? 'ÜBERLEGENER CHEF TORGE'
        : run.state === 'escaped'
          ? 'Zertifizierter Macher'
          : run.caughtBy === 'hauke'
            ? 'Von Haukes Gravitation absorbiert'
            : 'Im Dunkeln genauso lost wie Anton';

    const modLabel = run.mods.size === 1 ? '1 Mod' : `${run.mods.size} Mods`;

    box.innerHTML = `
      <div class="receipt-row"><span>Etage ${run.floor} · Seed #${String(run.seed % 10000).padStart(4, '0')}</span><span>${modLabel} · ${run.player.maxCombo || 1}× Streak</span></div>
      <div class="receipt-row"><span>Schellen (${stats.bonks || 0}×) · Kisten (${stats.crates || 0}×) · Fässer (${stats.barrels || 0}×)</span><span>K.O. ${stats.haukeKos || 0}×</span></div>
      <div class="receipt-row"><span>Knapp-Dash (${stats.dodges || 0}×) · Slips (${stats.slips || 0}×) · Tom-Klau (${stats.stolen || 0}×)</span><span>${stats.cans || 0} Dosen</span></div>
      ${penalty > 0 ? `<div class="receipt-row"><span>Keller-Verlust</span><span>-${formatAura(penalty)} ⚡</span></div>` : ''}
      <div class="receipt-row total"><span>Score (Rekord: E${best.floor} · ${formatAura(best.score)})</span><span>${formatAura(net)} ⚡</span></div>
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
    const { player, records, lift, hauke, map, floor } = run;
    this.ensureRelicRack(map);

    const totalRecs = map.records.length;
    const amount = records.size;
    const callTime = Math.ceil(lift.remaining);
    const objective = amount < totalRecs
      ? `${totalRecs - amount} offen`
      : lift.state === 'calling' ? `Lift ${callTime}s` : 'Zum Lift';
    write(ui.objective, objective);
    write(ui['floor-badge'], `E${floor}`);
    write(ui.location, map.roomAt(player.x, player.z));
    write(ui['record-counter'], `${amount}/${totalRecs}`);

    if (ui['mutator-pill']) {
      const showMut = map.mutator && map.mutator.id !== 'classic';
      ui['mutator-pill'].hidden = !showMut;
      if (showMut) write(ui['mutator-pill'], map.mutator.name);
    }

    if (ui['crown-badge']) {
      const hasCrown = player.helmet !== false;
      ui['crown-badge'].className = `crown-badge ${hasCrown ? 'on' : 'lost'}`;
      ui['crown-badge'].innerHTML = `${ICONS.crown}<span>${hasCrown ? 'Schild' : 'KRONE WEG'}</span>`;
    }

    if (ui['relic-rack']) {
      for (const el of ui['relic-rack'].querySelectorAll('.relic-slot')) {
        el.classList.toggle('got', records.has(el.dataset.relic));
      }
    }

    const comboBadge = (player.combo || 1) >= 2 ? ` · ${player.combo}×` : '';
    write(ui['pfand-counter'], `${formatAura(player.pfand ?? 1000)}${comboBadge}`);
    ui['pfand-counter']?.parentElement?.classList.toggle('combo', (player.combo || 1) >= 2);

    if (ui['boss-bar'] && hauke) {
      const status = hauke.koTimer > 0
        ? `KO ${Math.ceil(hauke.koTimer)}s`
        : hauke.chargeState === 'windup' || hauke.chargeState === 'rush'
          ? 'RAMMT!'
          : hauke.stunned > 0
            ? 'TAUMELT'
            : hauke.mode === 'hunt'
              ? 'ROLLT AN'
              : 'LAUERT';
      write(ui['boss-status'], status);
      ui['boss-status'].classList.toggle('ko', hauke.koTimer > 0);
      ui['boss-bar'].classList.toggle('charging', hauke.chargeState === 'windup' || hauke.chargeState === 'rush');
      if (ui['boss-bar-fill']) {
        const pct = hauke.koTimer > 0 ? 0 : Math.max(0, Math.min(100, hauke.hp ?? 100));
        ui['boss-bar-fill'].style.width = `${pct}%`;
      }
    }

    const loudness = Math.ceil(player.noise / 2);
    for (const [index, line] of [...ui['noise-meter'].children].entries()) line.classList.toggle('active', index < loudness);
    ui['noise-meter'].classList.toggle('high', loudness >= 4);
    write(ui['noise-label'], loudness >= 4 ? 'Laut' : loudness >= 2 ? 'Hörbar' : 'Leise');

    if (ui['lamp-state']) {
      ui['lamp-state'].className = `lamp-pill ${player.lamp ? 'on' : ''}`;
      const boostText = player.beanBoost > 0 ? ` +${Math.ceil(player.beanBoost)}s` : '';
      ui['lamp-state'].innerHTML = `${ICONS.lamp}<span>${player.lamp ? 'AN' : 'AUS'}${boostText}</span>`;
    }

    write(ui['clapper-count'], String(player.clappers));
    write(ui['dash-state'], player.cooldown > 0 ? `${player.cooldown.toFixed(1)}s` : 'BEREIT');
    write(ui['bonk-state'], player.bonkCooldown > 0 ? `${player.bonkCooldown.toFixed(1)}s` : 'BEREIT');
    const totalBonkCd = 1.85 * (player.bonkCdMult || 1) * (map.mutator?.bonkCdMult || 1);
    if (ui['bonk-fill']) ui['bonk-fill'].style.height = `${Math.min(100, (player.bonkCooldown / totalBonkCd) * 100)}%`;
    if (ui['dash-fill']) ui['dash-fill'].style.height = `${Math.min(100, (player.cooldown / (2.15 * (player.dashCdMult || 1))) * 100)}%`;

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
