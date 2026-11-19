import { BONK_COOLDOWN, DASH_COOLDOWN, getStats, interaction, RECEIPT_FOOTERS, WAVE_DURATION } from './game.js';
import { ICONS } from './icons.js';
import { EVOLUTIONS, LOADOUTS, UPGRADE_POOL } from './level.js';

export const get = (id) => document.getElementById(id);
export function write(element, text) {
  if (element && element.textContent !== text) element.textContent = text;
}

const mapColors = ['#121524', '#232942', '#283150', '#313a59', '#2b2447'];
const HIGHSCORE_KEY = 'imbiss_survival_highscore_2026';
const BEST_WAVE_KEY = 'imbiss_survival_bestwave_2026';
const TOP3_KEY = 'imbiss_survival_top3_2026';

export function getBestStats() {
  try {
    return {
      score: Math.max(0, Number(localStorage.getItem(HIGHSCORE_KEY)) || 0),
      wave: Math.max(1, Number(localStorage.getItem(BEST_WAVE_KEY)) || 1),
    };
  } catch {
    return { score: 0, wave: 1 };
  }
}

export function saveBestStats(score, wave) {
  const prev = getBestStats();
  const bestScore = Math.max(prev.score, Math.round(score));
  const bestWave = Math.max(prev.wave, wave);
  try {
    localStorage.setItem(HIGHSCORE_KEY, String(bestScore));
    localStorage.setItem(BEST_WAVE_KEY, String(bestWave));
  } catch {
    // ignore storage limits
  }
  return { score: bestScore, wave: bestWave };
}

export function getTopRuns() {
  try {
    const raw = localStorage.getItem(TOP3_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r) => r && Number.isFinite(Number(r.score)))
      .slice(0, 3);
  } catch {
    return [];
  }
}

export function saveTopRun(run) {
  const score = Math.round(run?.player?.pfand ?? 0);
  const entry = {
    score,
    wave: run?.wave ?? 1,
    seed: run?.seed ?? 2026,
    loadout: LOADOUTS[run?.loadoutId]?.name ?? 'Pfannen-Chef',
    time: Math.floor(run?.time ?? 0),
    stamp: Date.now(),
  };
  const next = [...getTopRuns(), entry]
    .sort((a, b) => b.score - a.score || b.wave - a.wave)
    .slice(0, 3);
  try {
    localStorage.setItem(TOP3_KEY, JSON.stringify(next));
  } catch {
    // ignore storage limits
  }
  const currentIndex = next.findIndex((r) => r.stamp === entry.stamp);
  return { list: next, currentIndex };
}

function formatAura(amount) {
  return Math.round(amount).toLocaleString('de-DE');
}

function formatClock(sec) {
  const s = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function upgradeMeta(id) {
  const evo = EVOLUTIONS.find((e) => e.id === id);
  if (evo) return { ...evo, isEvo: true };
  return UPGRADE_POOL.find((u) => u.id === id) ?? { id, name: id, icon: 'bolt', tint: 'gold', descForLevel: () => '' };
}

function upgradeIcon(id) {
  const meta = upgradeMeta(id);
  return ICONS[meta.icon] ?? ICONS.bolt;
}

export function computeBadges(run) {
  const stats = run?.stats ?? {};
  const player = run?.player ?? {};
  const evoCount = Math.max(stats.evolutions || 0, player.evolutions?.size || 0);
  const badges = [];
  if (evoCount >= 1) badges.push({ label: '★ EVOLUTIONS-CHEF', tone: 'gold' });
  if ((stats.fresskomas || 0) >= 1) badges.push({ label: 'HAUKE-FÜTTERER', tone: 'jade' });
  if ((stats.haukeKills || 0) >= 1) badges.push({ label: 'HAUKE-BEZWINGER', tone: 'crimson' });
  if ((stats.ducks || 0) >= 1) badges.push({ label: 'ENTEN-FLÜSTERER', tone: 'gold' });
  if ((player.maxCombo || 1) >= 15) badges.push({ label: `${player.maxCombo}× KOMBO-MONSTER`, tone: 'crimson' });
  if ((stats.crownsRecovered || 0) >= 1) badges.push({ label: 'KRONEN-BOXER', tone: 'gold' });
  if ((stats.chaosEvents || 0) >= 2) badges.push({ label: 'CHAOS-PROFI', tone: 'cyan' });
  if ((stats.wallSlams || 0) >= 4) badges.push({ label: 'WAND-KLATSCHER', tone: 'cyan' });
  if ((stats.dodges || 0) >= 3) badges.push({ label: 'ANKLE-BREAKER', tone: 'cyan' });
  if (badges.length === 0) badges.push({ label: 'SPÄTSCHICHT-HELD', tone: 'jade' });
  return badges.slice(0, 4);
}

export function formatShareReceipt(run, shareUrl) {
  const stats = run?.stats ?? {};
  const player = run?.player ?? {};
  const score = Math.round(player.pfand ?? 0);
  const loadoutName = LOADOUTS[run?.loadoutId]?.name ?? 'Pfannen-Chef';
  const seedStr = String(run?.seed ?? 2026).padStart(4, '0');
  const badges = computeBadges(run).map((b) => b.label).join(' · ');
  const evoNames = [...(player.evolutions || [])].map((id) => upgradeMeta(id).name);

  const lines = [
    `IMBISS-SURVIVAL KASSENBON (#${seedStr})`,
    `${loadoutName} · Welle ${run?.wave ?? 1} · ${formatClock(run?.time ?? 0)} · Lv ${player.level ?? 1}`,
    `Score: ${formatAura(score)} ⚡ · ${player.kills ?? 0} Kills · ${player.maxCombo || 1}× Max-Kombo`,
    `Antons: ${stats.antonKills || 0} | Toms: ${stats.tomKills || 0} | Haukes: ${stats.haukeKills || 0}`,
  ];
  if (evoNames.length > 0) lines.push(`★ Evolutionen: ${evoNames.join(', ')}`);
  if (badges) lines.push(`Orden: ${badges}`);
  if (run?.challenge) {
    const scoreStr = formatAura(run.challenge.score);
    if (run.challenge.from) {
      lines.push(run.challenge.beaten
        ? `Rekord von ${run.challenge.from} (${scoreStr} ⚡) GEKNACKT!`
        : `Ziel von ${run.challenge.from}: ${scoreStr} ⚡`);
    } else {
      lines.push(run.challenge.beaten
        ? `Kumpel-Rekord (${scoreStr} ⚡) GEKNACKT!`
        : `Ziel-Rekord: ${scoreStr} ⚡`);
    }
  }
  lines.push('Kannst du meine Schicht toppen?');
  if (shareUrl) lines.push(shareUrl);
  return lines.join('\n');
}

export class Hud {
  constructor() {
    for (const slot of document.querySelectorAll('.ico-slot[data-ico]')) {
      slot.innerHTML = ICONS[slot.dataset.ico] ?? '';
    }
    this.elements = Object.fromEntries([
      'hud', 'floor-badge', 'location', 'mutator-pill', 'challenge-pill', 'crown-badge', 'crown-label',
      'hp-fill', 'hp-text', 'xp-fill', 'xp-text',
      'active-mods', 'record-counter', 'pfand-counter', 'noise-label', 'crowd-label', 'noise-meter', 'lamp-state', 'lamp-label',
      'interact', 'interact-key', 'interact-label', 'notice', 'clapper-count', 'dash-state', 'bonk-state',
      'bonk-fill', 'dash-fill', 'world-barks', 'boss-bar', 'boss-name', 'boss-status', 'boss-bar-fill',
      'touch-use', 'touch-use-label', 'touch-dash', 'touch-dash-label', 'touch-dash-fill',
      'touch-shutter', 'touch-shutter-label', 'touch-lure', 'touch-lure-count',
      'touch-bonk', 'touch-bonk-label', 'touch-bonk-fill',
      'orb-bonk', 'orb-dash', 'slot-lamp', 'slot-lure', 'menu-best', 'vignette', 'chart', 'chart-map',
      'chart-toggle', 'chart-seed', 'overlay-mods', 'overlay-receipt', 'lift-screen', 'lift-eyebrow',
      'lift-copy', 'mod-list', 'lift-reroll', 'lift-reroll-label',
    ].map((id) => [id, get(id)]));

    const mapCanvas = this.elements['chart-map'];
    this.chart = mapCanvas.getContext('2d');
    this.plan = document.createElement('canvas');
    this.plan.width = mapCanvas.width;
    this.plan.height = mapCanvas.height;
    this.planMap = null;
    this.scale = 1;
    this.barkNodes = new Map();
    this.hpBarNodes = new Map();
    this.lastModsKey = '';
    this.syncMenuHighscore();
  }

  syncMenuHighscore() {
    if (this.elements['menu-best']) {
      const { wave, score } = getBestStats();
      write(this.elements['menu-best'], `W${wave} · ${formatAura(score)}`);
    }
  }

  clearFloating() {
    if (this.elements['world-barks']) this.elements['world-barks'].innerHTML = '';
    this.barkNodes.clear();
    this.hpBarNodes.clear();
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
    ctx.fillStyle = '#47506d';
    for (const blk of map.blocks ?? []) {
      ctx.fillRect(this.px(blk.x - blk.w * 0.5), this.py(blk.z - blk.d * 0.5), blk.w * this.scale, blk.d * this.scale);
    }
    if (this.elements['chart-seed']) {
      const mut = map.mutator?.id && map.mutator.id !== 'classic' ? ` · ${map.mutator.name}` : '';
      write(this.elements['chart-seed'], `#${String(map.seed).padStart(4, '0')} · ${map.biome.name}${mut}`);
    }
  }

  px(x) { return (this.offsetX ?? 7) + this.scale * x; }
  py(z) { return (this.offsetZ ?? 7) + this.scale * z; }

  toggleChart(run, show = this.elements.chart.hidden) {
    this.elements.chart.hidden = !show;
    this.elements.hud?.classList.toggle('chart-open', Boolean(show));
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

    if (run.map.vending) place(run.map.vending, '#38f2af', 6.5, 'diamond');
    for (const c of run.crates ?? []) {
      if (!c.broken) place(c, c.gold ? '#ffe082' : '#a86c3a', c.gold ? 5 : 3.2, c.gold ? 'diamond' : 'square');
    }
    for (const b of run.barrels ?? []) {
      if (!b.exploded) place(b, '#ff5744', 3.6, 'square');
    }
    for (const pk of run.pickups ?? []) {
      if (pk.collected) continue;
      if (pk.kind === 'duck') {
        place(pk, '#ffe63b', 5.0, 'circle');
      } else if (pk.kind === 'chest' || pk.kind === 'heal' || pk.kind === 'magnet_can') {
        place(pk, pk.kind === 'chest' ? '#ffe082' : '#ffb84d', 4.4, 'circle');
      }
    }
    for (const e of run.enemies ?? []) {
      if (e.dead) continue;
      if (e.type === 'hauke') place(e, '#ff3b56', 6.4, 'circle');
      else if (e.type === 'tom') place(e, '#38f2af', 4.0, 'circle');
      else place(e, e.elite ? '#ff8c24' : '#73d7ff', e.elite ? 4.4 : 3.0, 'circle');
    }
    if (run.player) {
      const px = this.px(run.player.x);
      const pz = this.py(run.player.z);
      if (run.player.lamp) {
        ctx.fillStyle = 'rgba(255, 224, 130, 0.28)';
        ctx.beginPath();
        ctx.moveTo(px, pz);
        ctx.arc(px, pz, 16, run.player.angle - 0.5, run.player.angle + 0.5);
        ctx.closePath();
        ctx.fill();
      }
      place(run.player, '#f4ebd9', 5.2, 'circle');
    }
  }

  showLevelChoices(run, onPick, onReroll) {
    const lift = this.elements['lift-screen'];
    const eyebrow = this.elements['lift-eyebrow'];
    const copy = this.elements['lift-copy'];
    const list = this.elements['mod-list'];
    const rerollBtn = this.elements['lift-reroll'];
    const rerollLabel = this.elements['lift-reroll-label'];
    if (!lift || !list) return;
    write(eyebrow, `LEVEL UP! · STUFE ${run.player.level}`);
    write(copy, `Welle ${run.wave} · ${formatClock(run.time)} überlebt · ${run.player.kills} Kills`);
    list.innerHTML = '';
    for (const [idx, offer] of (run.upgradeOffers ?? []).entries()) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `mod-switch tone-${offer.tint}${offer.isEvo ? ' is-evo' : ''}`;
      btn.dataset.modIndex = String(idx);
      const lvLabel = offer.isEvo
        ? '<span class="mod-tag-evo">★ EVOLUTION</span>'
        : offer.isNew
          ? '<span class="mod-tag-new">NEU!</span>'
          : ` <small style="color:var(--gold)">LV ${offer.nextLevel}</small>`;
      const synHtml = offer.synergyHint
        ? `<span class="mod-synergy${offer.synergyOwned ? ' ready' : ''}">${offer.synergyHint}</span>`
        : '';
      btn.innerHTML = `
        <span class="mod-ico">${upgradeIcon(offer.id)}</span>
        <span class="mod-text"><b>${offer.name}${lvLabel}</b><small>${offer.desc}</small>${synHtml}</span>
        <kbd class="mod-kbd">${idx + 1}</kbd>
        <span class="btn-arrow" aria-hidden="true">▶</span>
      `;
      btn.addEventListener('click', () => onPick(offer.id));
      list.appendChild(btn);
    }
    if (rerollBtn) {
      const left = Math.max(0, run.player.rerolls || 0);
      rerollBtn.disabled = left <= 0;
      write(rerollLabel, left > 0 ? `Neu würfeln (${left})` : 'Keine Würfel');
      rerollBtn.onclick = () => onReroll?.();
    }
    lift.hidden = false;
    if (!document.body.classList.contains('touch-input')) {
      list.querySelector('button')?.focus({ preventScroll: true });
    }
  }

  renderOverlayMods(run) {
    const box = this.elements['overlay-mods'];
    if (!box) return;
    if (!run || !run.player) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }
    const items = [];
    for (const evoId of run.player.evolutions || []) {
      items.push({ ...upgradeMeta(evoId), isEvo: true });
    }
    for (const [id, lv] of Object.entries(run.player.weapons || {})) {
      if (lv > 0) items.push({ ...upgradeMeta(id), lv });
    }
    for (const [id, lv] of Object.entries(run.player.passives || {})) {
      if (lv > 0) items.push({ ...upgradeMeta(id), lv });
    }
    if (items.length === 0) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }
    box.innerHTML = items.map((m) => (
      m.isEvo
        ? `<span class="overlay-mod-pill is-evo">${ICONS.star}<span>${m.name}</span></span>`
        : `<span class="overlay-mod-pill tone-${m.tint}">${upgradeIcon(m.id)}<span>${m.name} Lv ${m.lv}</span></span>`
    )).join('');
    box.hidden = false;
  }

  renderReceipt(run) {
    const box = this.elements['overlay-receipt'];
    if (!box || !run) return;
    const esc = (str) => String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const stats = run.stats ?? {};
    const score = Math.round(run.player.pfand ?? 0);
    const best = saveBestStats(score, run.wave);
    const top = saveTopRun(run);
    this.syncMenuHighscore();

    const rank = run.wave >= 6 || stats.haukeKills >= 2 || (run.player.evolutions?.size || 0) >= 2
      ? 'IMBISS-LEGENDE · TORGE SUPREME'
      : run.wave >= 3 || stats.haukeKills >= 1 || (run.player.evolutions?.size || 0) >= 1
        ? 'MEISTER DES MITTERNACHTS-GRILLS'
        : run.player.level >= 4
          ? 'FLINKER PFANNEN-PROFI'
          : 'SPÄTSCHICHT-NEULING';

    const badgesHtml = computeBadges(run)
      .map((b) => `<span class="receipt-badge ${b.tone}">${esc(b.label)}</span>`)
      .join('');

    const challengeHtml = run.challenge
      ? `<div class="receipt-challenge${run.challenge.beaten ? ' beaten' : ''}">${
        run.challenge.beaten
          ? (run.challenge.from
              ? `✓ DU HAST ${esc(run.challenge.from.toUpperCase())} (${formatAura(run.challenge.score)} ⚡) GEKNACKT!`
              : `✓ DU HAST DEN KUMPEL-REKORD (${formatAura(run.challenge.score)} ⚡) GEKNACKT!`)
          : (run.challenge.from
              ? `Ziel von ${esc(run.challenge.from)}: ${formatAura(run.challenge.score)} ⚡ — noch ${formatAura(Math.max(1, run.challenge.score + 1 - score))} ⚡!`
              : `Kumpel-Rekord: ${formatAura(run.challenge.score)} ⚡ — noch ${formatAura(Math.max(1, run.challenge.score + 1 - score))} ⚡!`)
      }</div>`
      : '';

    const topHtml = top.list.length > 0
      ? `<div class="receipt-top3"><div class="receipt-top3-title">LOKALE TOP-3 SCHICHTEN</div>${top.list.map((entry, idx) => (
        `<div class="receipt-top3-row${idx === top.currentIndex ? ' current' : ''}">`
        + `<span>#${idx + 1} ${esc(entry.loadout)} · W${entry.wave} (#${String(entry.seed).padStart(4, '0')})</span>`
        + `<span>${formatAura(entry.score)} ⚡</span></div>`
      )).join('')}</div>`
      : '';

    const footerIdx = Math.abs(Math.floor((run.seed || 2026) + score + (run.player.kills || 0))) % RECEIPT_FOOTERS.length;
    const footerLine = RECEIPT_FOOTERS[footerIdx];

    box.innerHTML = `
      <div class="receipt-row"><span>Zeit ${formatClock(run.time)} · Welle ${run.wave} · Stufe ${run.player.level}</span><span>#${String(run.seed).padStart(4, '0')}</span></div>
      <div class="receipt-row"><span>Antons (${stats.antonKills || 0}) · Toms (${stats.tomKills || 0}) · Haukes (${stats.haukeKills || 0})</span><span>${run.player.kills} Kills</span></div>
      <div class="receipt-row"><span>Schellen (${stats.bonks || 0}) · Wand-Klatscher (${stats.wallSlams || 0}) · Fässer (${stats.barrels || 0})</span><span>${run.player.maxCombo || 1}× Max-Kombo</span></div>
      <div class="receipt-row total"><span>Score (Rekord: W${best.wave} · ${formatAura(best.score)})</span><span>${formatAura(score)} ⚡</span></div>
      <div class="receipt-rank"><strong>${rank}</strong></div>
      ${challengeHtml}
      <div class="receipt-badges">${badgesHtml}</div>
      ${topHtml}
      <div class="receipt-footer">„${esc(footerLine)}“</div>
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
      el.style.transform = `translate3d(${screen.x.toFixed(1)}px, ${screen.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
      el.style.opacity = remaining < 0.28 ? String(Math.max(0, remaining / 0.28)) : '1';
    }
    for (const [id, el] of this.barkNodes.entries()) {
      if (!activeIds.has(id)) {
        el.remove();
        this.barkNodes.delete(id);
      }
    }
  }

  paintEnemyBars(run, view) {
    const layer = this.elements['world-barks'];
    if (!layer || !view || !run.enemies) return;
    const activeIds = new Set();
    for (const enemy of run.enemies) {
      if (enemy.dead || enemy.type === 'hauke') continue;
      if (!enemy.elite && enemy.type !== 'tom') continue;
      if (enemy.hp >= enemy.maxHp - 0.1) continue;
      const screen = view.projectPoint(enemy.x, enemy.elite ? 1.84 : 1.5, enemy.z);
      if (!screen) continue;
      activeIds.add(enemy.id);
      let el = this.hpBarNodes.get(enemy.id);
      if (!el) {
        el = document.createElement('div');
        el.className = `enemy-hp${enemy.elite ? ' elite' : ''}${enemy.type === 'tom' ? ' tom' : ''}`;
        el.innerHTML = '<i></i>';
        layer.appendChild(el);
        this.hpBarNodes.set(enemy.id, el);
      }
      const pct = Math.max(4, Math.min(100, (enemy.hp / Math.max(1, enemy.maxHp)) * 100));
      el.firstChild.style.width = `${pct.toFixed(1)}%`;
      el.style.transform = `translate3d(${screen.x.toFixed(1)}px, ${screen.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    }
    for (const [id, el] of this.hpBarNodes.entries()) {
      if (!activeIds.has(id)) {
        el.remove();
        this.hpBarNodes.delete(id);
      }
    }
  }

  paint(run, view) {
    const ui = this.elements;
    const { player, map, wave, waveTimer } = run;
    const stats = getStats(run);

    write(ui['floor-badge'], `W${wave}`);
    write(ui.location, formatClock(run.time));
    write(ui['record-counter'], `${player.kills} KILLS`);

    const hpPct = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
    if (ui['hp-fill']) ui['hp-fill'].style.width = `${hpPct.toFixed(1)}%`;
    write(ui['hp-text'], `${Math.ceil(player.hp)} / ${player.maxHp} HP`);

    const xpPct = Math.max(0, Math.min(100, (player.xp / Math.max(1, player.xpNext)) * 100));
    if (ui['xp-fill']) ui['xp-fill'].style.width = `${xpPct.toFixed(1)}%`;
    write(ui['xp-text'], `LV ${player.level} · ${Math.floor(xpPct)}%`);

    if (ui['mutator-pill']) {
      if (run.chaosEvent) {
        ui['mutator-pill'].hidden = false;
        const chaosLabels = {
          ordnungsamt: 'ORDNUNGSAMT',
          happy_hour: 'HAPPY HOUR',
          fettbahn: 'FETT-BAHN',
          kartenzahlung: 'NUR BAR · 2×XP',
          doenerpreis: 'DÖNER 9,50€',
          enten_regen: 'ENTEN-ALARM',
        };
        const short = chaosLabels[run.chaosEvent.id] ?? 'CHAOS';
        write(ui['mutator-pill'], `${short} ${Math.ceil(run.chaosEvent.timer)}s`);
      } else {
        const showMut = map.mutator && map.mutator.id !== 'classic';
        ui['mutator-pill'].hidden = !showMut;
        if (showMut) write(ui['mutator-pill'], map.mutator.name);
      }
    }

    if (ui['challenge-pill']) {
      if (run.challenge) {
        ui['challenge-pill'].hidden = false;
        ui['challenge-pill'].classList.toggle('beaten', Boolean(run.challenge.beaten));
        write(
          ui['challenge-pill'],
          run.challenge.beaten
            ? '✓ GEKNACKT!'
            : `Ziel: ${formatAura(run.challenge.score)} ⚡`,
        );
      } else {
        ui['challenge-pill'].hidden = true;
      }
    }

    if (ui['active-mods']) {
      const evoIds = [...(player.evolutions || [])];
      const activePairs = [
        ...Object.entries(player.weapons || {}).filter(([, lv]) => lv > 0),
        ...Object.entries(player.passives || {}).filter(([, lv]) => lv > 0),
      ];
      const modsKey = `${evoIds.join('|')}::${activePairs.map(([id, lv]) => `${id}:${lv}`).join(',')}`;
      if (modsKey !== this.lastModsKey) {
        this.lastModsKey = modsKey;
        const evoHtml = evoIds.map((id) => {
          const meta = upgradeMeta(id);
          return `<span class="mod-badge is-evo" title="★ ${meta.name}">${upgradeIcon(id)}<em>★</em></span>`;
        }).join('');
        const regularHtml = activePairs.map(([id, lv]) => {
          const meta = upgradeMeta(id);
          return `<span class="mod-badge tone-${meta.tint}" title="${meta.name} Lv ${lv}">${upgradeIcon(id)}<em>${lv}</em></span>`;
        }).join('');
        ui['active-mods'].innerHTML = evoHtml + regularHtml;
        ui['active-mods'].hidden = evoIds.length === 0 && activePairs.length === 0;
      }
    }

    if (ui['crown-badge']) {
      const hasCrown = player.helmet !== false;
      ui['crown-badge'].classList.toggle('on', hasCrown);
      ui['crown-badge'].classList.toggle('lost', !hasCrown);
      write(ui['crown-label'], hasCrown ? 'Schild' : `${Math.ceil(player.crownRegen || 0)}s`);
    }

    const combo = player.combo || 1;
    const fever = combo >= 8;
    const comboBadge = combo >= 3 ? (fever ? ` · ${combo}× FEVER!` : ` · ${combo}×`) : '';
    write(ui['pfand-counter'], `${formatAura(player.pfand ?? 0)}${comboBadge}`);
    ui['pfand-counter']?.parentElement?.classList.toggle('combo', combo >= 3);
    ui['pfand-counter']?.parentElement?.classList.toggle('fever', fever);

    const boss = run.enemies?.find((e) => !e.dead && e.type === 'hauke');
    if (ui['boss-bar']) {
      if (boss) {
        ui['boss-bar'].classList.add('enraged');
        ui['boss-bar'].classList.toggle('charging', boss.chargeState !== 'none');
        write(ui['boss-name'], 'HAUKE BOSS');
        write(
          ui['boss-status'],
          boss.coma > 0
            ? 'FRESSKOMA!'
            : boss.chargeState !== 'none'
              ? 'RAMMT!'
              : boss.enraged
                ? 'WUT!'
                : `${Math.ceil(boss.hp)} HP`,
        );
        if (ui['boss-bar-fill']) {
          ui['boss-bar-fill'].style.width = `${Math.max(0, Math.min(100, (boss.hp / boss.maxHp) * 100)).toFixed(1)}%`;
        }
      } else {
        ui['boss-bar'].classList.remove('enraged', 'charging');
        write(ui['boss-name'], `WELLE ${wave}`);
        const remain = Math.max(0, Math.ceil(WAVE_DURATION - waveTimer));
        write(ui['boss-status'], `${remain}s bis W${wave + 1}`);
        if (ui['boss-bar-fill']) {
          ui['boss-bar-fill'].style.width = `${Math.min(100, (waveTimer / WAVE_DURATION) * 100).toFixed(1)}%`;
        }
      }
    }

    const aliveEnemies = run.enemies?.filter((e) => !e.dead).length || 0;
    const activeCount = Math.min(6, Math.ceil(aliveEnemies / 4));
    for (const [index, line] of [...ui['noise-meter'].children].entries()) line.classList.toggle('active', index < activeCount);
    ui['noise-meter'].classList.toggle('high', activeCount >= 5);
    write(ui['noise-label'], player.lamp ? '+30% DMG' : '+14% Tempo');
    write(ui['crowd-label'], `ANDRANG ${aliveEnemies}`);

    if (ui['lamp-state']) {
      ui['lamp-state'].classList.toggle('on', Boolean(player.lamp));
      const boostText = player.beanBoost > 0 ? ` +${Math.ceil(player.beanBoost)}s` : '';
      write(ui['lamp-label'], `${player.lamp ? 'LICHT' : 'DUNKEL'}${boostText}`);
    }

    const finisherReady = (player.comboStep || 0) === 2 && player.bonkCooldown <= 0;
    const bonkLabel = player.bonkCooldown > 0
      ? `${player.bonkCooldown.toFixed(1)}s`
      : finisherReady
        ? 'MEGA!'
        : 'SCHELLE';
    const bonkDesktopLabel = player.bonkCooldown > 0
      ? `${player.bonkCooldown.toFixed(1)}s`
      : finisherReady
        ? 'MEGA!'
        : 'BEREIT';

    write(ui['clapper-count'], String(player.clappers));
    write(ui['dash-state'], player.cooldown > 0 ? `${player.cooldown.toFixed(1)}s` : 'BEREIT');
    write(ui['bonk-state'], bonkDesktopLabel);
    const totalBonkCd = BONK_COOLDOWN * stats.bonkCdMult;
    const totalDashCd = DASH_COOLDOWN * stats.dashCdMult;
    const bonkPct = `${Math.min(100, (player.bonkCooldown / totalBonkCd) * 100).toFixed(1)}%`;
    const dashPct = `${Math.min(100, (player.cooldown / totalDashCd) * 100).toFixed(1)}%`;
    if (ui['bonk-fill']) ui['bonk-fill'].style.height = bonkPct;
    if (ui['dash-fill']) ui['dash-fill'].style.height = dashPct;

    if (ui['touch-dash']) {
      const dashCd = player.cooldown > 0;
      ui['touch-dash'].classList.toggle('on-cooldown', dashCd);
      ui['touch-dash'].setAttribute('aria-disabled', String(dashCd));
      write(ui['touch-dash-label'], dashCd ? `${player.cooldown.toFixed(1)}s` : 'DASH');
      if (ui['touch-dash-fill']) ui['touch-dash-fill'].style.height = dashPct;
    }
    if (ui['touch-lure']) {
      ui['touch-lure'].disabled = player.clappers === 0;
      write(ui['touch-lure-count'], String(player.clappers));
    }
    if (ui['slot-lure']) ui['slot-lure'].disabled = player.clappers === 0;
    if (ui['touch-bonk']) {
      const bonkCd = player.bonkCooldown > 0;
      ui['touch-bonk'].classList.toggle('on-cooldown', bonkCd);
      ui['touch-bonk'].classList.toggle('finisher-ready', finisherReady);
      ui['touch-bonk'].setAttribute('aria-disabled', String(bonkCd));
      write(ui['touch-bonk-label'], bonkLabel);
      if (ui['touch-bonk-fill']) ui['touch-bonk-fill'].style.height = bonkPct;
    }
    if (ui['orb-bonk']) {
      const bonkCd = player.bonkCooldown > 0;
      ui['orb-bonk'].classList.toggle('on-cooldown', bonkCd);
      ui['orb-bonk'].classList.toggle('finisher-ready', finisherReady);
      ui['orb-bonk'].setAttribute('aria-disabled', String(bonkCd));
    }
    if (ui['orb-dash']) {
      const dashCd = player.cooldown > 0;
      ui['orb-dash'].classList.toggle('on-cooldown', dashCd);
      ui['orb-dash'].setAttribute('aria-disabled', String(dashCd));
    }
    if (ui['touch-shutter']) {
      ui['touch-shutter'].setAttribute('aria-pressed', String(player.lamp));
      write(ui['touch-shutter-label'], player.lamp ? 'Licht' : 'Tempo');
    }

    this.paintBarks(run, view);
    this.paintEnemyBars(run, view);

    const action = interaction(run);
    if (ui['touch-use']) {
      ui['touch-use'].disabled = !action?.enabled;
      write(
        ui['touch-use-label'],
        action?.helmet
          ? 'Krone!'
          : action?.vending
            ? (action.enabled ? 'Spezi!' : 'Lädt')
            : 'Späti',
      );
    }
    ui.interact.hidden = !action;
    ui.interact.classList.toggle('locked', Boolean(action && !action.enabled));
    ui['interact-key'].hidden = !action?.enabled;
    write(ui['interact-label'], action?.text ?? '');

    const notice = run.notices[0];
    ui.notice.hidden = !notice;
    write(ui.notice, notice?.message ?? '');

    ui.vignette.classList.toggle('alert', player.hp <= player.maxHp * 0.35 || Boolean(boss));
    if (!ui.chart.hidden) this.drawChart(run);
  }
}
