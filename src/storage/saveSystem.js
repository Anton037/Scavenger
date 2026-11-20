import { DEFAULT_SETTINGS, SAVE_KEYS } from '../config/constants.js';
import { COSMETIC_ITEMS, COSMETIC_MAP, VHS_TAPE_MAP } from '../config/cosmetics.js';
import { ACHIEVEMENT_MAP, CUSTOM_PRESETS, SHIFT_MODIFIER_MAP } from '../config/nights.js';

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SAVE_KEYS.settings);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      graphics: ['hd', 'balanced', 'retro'].includes(parsed.graphics) ? parsed.graphics : 'hd',
      crt: ['subtle', 'strong', 'off'].includes(parsed.crt) ? parsed.crt : 'subtle',
      volume: Math.max(0, Math.min(1, Number.isFinite(Number(parsed.volume)) ? Number(parsed.volume) : DEFAULT_SETTINGS.volume)),
      mouseSens: Math.max(0.5, Math.min(2.0, Number.isFinite(Number(parsed.mouseSens)) ? Number(parsed.mouseSens) : DEFAULT_SETTINGS.mouseSens)),
      reducedMotion: Boolean(parsed.reducedMotion),
      audioSubtitles: Boolean(parsed.audioSubtitles),
      lookArrows: Boolean(parsed.lookArrows),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(patch = {}) {
  const next = { ...loadSettings(), ...patch };
  try {
    localStorage.setItem(SAVE_KEYS.settings, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
  return next;
}

export function loadProgress() {
  try {
    const night = Math.max(1, Math.min(7, Math.trunc(Number(localStorage.getItem(SAVE_KEYS.night))) || 1));
    const stars = Math.max(0, Math.min(4, Math.trunc(Number(localStorage.getItem(SAVE_KEYS.stars))) || 0));
    return { night, stars };
  } catch {
    return { night: 1, stars: 0 };
  }
}

export function saveProgress(nightWon, customAi = null, modifiers = []) {
  const prev = loadProgress();
  let nextNight = prev.night;
  let nextStars = prev.stars;
  if (nightWon >= 1 && nightWon < 5) nextNight = Math.max(nextNight, nightWon + 1);
  if (nightWon === 5) {
    nextNight = Math.max(nextNight, 6);
    nextStars = Math.max(nextStars, 1);
  }
  if (nightWon === 6) {
    nextNight = Math.max(nextNight, 7);
    nextStars = Math.max(nextStars, 2);
  }
  if (
    nightWon === 7
    && customAi
    && customAi.torge >= 20
    && customAi.anton >= 20
    && customAi.tom >= 20
    && customAi.hauke >= 20
  ) {
    nextStars = Math.max(nextStars, modifiers?.length >= 2 ? 4 : 3);
  }
  try {
    localStorage.setItem(SAVE_KEYS.night, String(nextNight));
    localStorage.setItem(SAVE_KEYS.stars, String(nextStars));
  } catch {
    // ignore storage errors
  }
  return { night: nextNight, stars: nextStars };
}

export function loadAchievements() {
  try {
    const raw = localStorage.getItem(SAVE_KEYS.achievements);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => Boolean(ACHIEVEMENT_MAP[id])) : [];
  } catch {
    return [];
  }
}

export function unlockAchievement(id) {
  if (!ACHIEVEMENT_MAP[id]) return false;
  const list = loadAchievements();
  if (list.includes(id)) return false;
  list.push(id);
  try {
    localStorage.setItem(SAVE_KEYS.achievements, JSON.stringify(list));
  } catch {
    // ignore storage errors
  }
  return true;
}

export function loadWallet() {
  try {
    const raw = localStorage.getItem(SAVE_KEYS.wallet);
    const parsed = raw ? JSON.parse(raw) : {};
    const balance = Math.max(0, Math.round((Number(parsed.balance) || 0) * 100) / 100);
    const lifetime = Math.max(balance, Math.round((Number(parsed.lifetime) || 0) * 100) / 100);
    return { balance, lifetime };
  } catch {
    return { balance: 0, lifetime: 0 };
  }
}

export function addWalletTips(amount) {
  const add = Math.max(0, Number(amount) || 0);
  const wallet = loadWallet();
  if (add <= 0) return wallet;
  wallet.balance = Math.round((wallet.balance + add) * 100) / 100;
  wallet.lifetime = Math.round((wallet.lifetime + add) * 100) / 100;
  try {
    localStorage.setItem(SAVE_KEYS.wallet, JSON.stringify(wallet));
  } catch {
    // ignore storage errors
  }
  return wallet;
}

function defaultCosmeticState() {
  const defaults = COSMETIC_ITEMS.filter((c) => c.defaultUnlocked).map((c) => c.id);
  return {
    owned: defaults,
    deskEquipped: [],
    activePoster: 'poster_default',
    activeShader: 'vhs_standard',
  };
}

export function loadCosmeticState() {
  const base = defaultCosmeticState();
  try {
    const raw = localStorage.getItem(SAVE_KEYS.cosmetics);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    const ownedSet = new Set([...base.owned, ...(Array.isArray(parsed.owned) ? parsed.owned : [])]);
    const owned = [...ownedSet].filter((id) => Boolean(COSMETIC_MAP[id]));
    const deskEquipped = Array.isArray(parsed.deskEquipped)
      ? parsed.deskEquipped.filter((id) => owned.includes(id) && COSMETIC_MAP[id]?.slot === 'desk')
      : [];
    const activePoster = owned.includes(parsed.activePoster) && COSMETIC_MAP[parsed.activePoster]?.slot === 'poster'
      ? parsed.activePoster
      : 'poster_default';
    const activeShader = owned.includes(parsed.activeShader) && COSMETIC_MAP[parsed.activeShader]?.slot === 'shader'
      ? parsed.activeShader
      : 'vhs_standard';
    return { owned, deskEquipped, activePoster, activeShader };
  } catch {
    return base;
  }
}

function saveCosmeticState(state) {
  try {
    localStorage.setItem(SAVE_KEYS.cosmetics, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
  return state;
}

/**
 * Purchases a purely cosmetic item from the Trinkgeld Kiosk and equips it immediately.
 * Strictly zero gameplay stat changes.
 */
export function purchaseCosmetic(itemId) {
  const item = COSMETIC_MAP[itemId];
  if (!item) return false;
  const state = loadCosmeticState();
  if (state.owned.includes(itemId)) {
    toggleCosmetic(itemId);
    return true;
  }
  const wallet = loadWallet();
  if (wallet.balance < item.price) return false;
  wallet.balance = Math.round((wallet.balance - item.price) * 100) / 100;
  try {
    localStorage.setItem(SAVE_KEYS.wallet, JSON.stringify(wallet));
  } catch {
    // ignore storage errors
  }
  state.owned.push(itemId);
  if (item.slot === 'desk' && !state.deskEquipped.includes(itemId)) {
    state.deskEquipped.push(itemId);
  } else if (item.slot === 'poster') {
    state.activePoster = itemId;
  } else if (item.slot === 'shader') {
    state.activeShader = itemId;
  }
  saveCosmeticState(state);
  return true;
}

export function toggleCosmetic(itemId) {
  const item = COSMETIC_MAP[itemId];
  if (!item) return false;
  const state = loadCosmeticState();
  if (!state.owned.includes(itemId)) return false;

  if (item.slot === 'desk') {
    const idx = state.deskEquipped.indexOf(itemId);
    if (idx >= 0) state.deskEquipped.splice(idx, 1);
    else state.deskEquipped.push(itemId);
  } else if (item.slot === 'poster') {
    state.activePoster = itemId;
  } else if (item.slot === 'shader') {
    state.activeShader = itemId;
  }
  saveCosmeticState(state);
  return true;
}

export function loadTapeProgress() {
  try {
    const raw = localStorage.getItem(SAVE_KEYS.tapes);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      attempted: Array.isArray(parsed.attempted) ? parsed.attempted.filter((id) => Boolean(VHS_TAPE_MAP[id])) : [],
      completed: Array.isArray(parsed.completed) ? parsed.completed.filter((id) => Boolean(VHS_TAPE_MAP[id])) : [],
    };
  } catch {
    return { attempted: [], completed: [] };
  }
}

export function markTapeAttempted(tapeId) {
  if (!VHS_TAPE_MAP[tapeId]) return loadTapeProgress();
  const state = loadTapeProgress();
  if (!state.attempted.includes(tapeId)) {
    state.attempted.push(tapeId);
    try {
      localStorage.setItem(SAVE_KEYS.tapes, JSON.stringify(state));
    } catch {
      // ignore
    }
  }
  return state;
}

export function markTapeCompleted(tapeId) {
  const tape = VHS_TAPE_MAP[tapeId];
  if (!tape) return { firstClear: false, reward: 0 };
  const state = loadTapeProgress();
  if (!state.attempted.includes(tapeId)) state.attempted.push(tapeId);
  const firstClear = !state.completed.includes(tapeId);
  if (firstClear) state.completed.push(tapeId);
  try {
    localStorage.setItem(SAVE_KEYS.tapes, JSON.stringify(state));
  } catch {
    // ignore
  }
  const reward = firstClear ? tape.rewardTips : Math.round(tape.rewardTips * 0.4);
  addWalletTips(reward);
  unlockAchievement('vhs_archivist');
  return { firstClear, reward };
}

export function loadCompletedPresets() {
  try {
    const raw = localStorage.getItem(SAVE_KEYS.presets);
    const parsed = raw ? JSON.parse(raw) : [];
    const valid = new Set(CUSTOM_PRESETS.map((p) => p.id));
    return Array.isArray(parsed) ? parsed.filter((id) => valid.has(id)) : [];
  } catch {
    return [];
  }
}

export function markPresetCompleted(presetId) {
  const valid = CUSTOM_PRESETS.some((p) => p.id === presetId);
  if (!valid) return false;
  const list = loadCompletedPresets();
  if (list.includes(presetId)) return false;
  list.push(presetId);
  try {
    localStorage.setItem(SAVE_KEYS.presets, JSON.stringify(list));
  } catch {
    // ignore
  }
  return true;
}

export function loadRecords() {
  try {
    const raw = localStorage.getItem(SAVE_KEYS.records);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      nightsWon: Math.max(0, Math.trunc(Number(parsed.nightsWon) || 0)),
      bestPowerByNight: parsed.bestPowerByNight && typeof parsed.bestPowerByNight === 'object' ? parsed.bestPowerByNight : {},
      totalBlocks: Math.max(0, Math.trunc(Number(parsed.totalBlocks) || 0)),
      totalHonks: Math.max(0, Math.trunc(Number(parsed.totalHonks) || 0)),
      totalBons: Math.max(0, Math.trunc(Number(parsed.totalBons) || 0)),
      totalSteamHits: Math.max(0, Math.trunc(Number(parsed.totalSteamHits) || 0)),
      totalTips: Math.max(0, Number(parsed.totalTips) || 0),
    };
  } catch {
    return {
      nightsWon: 0,
      bestPowerByNight: {},
      totalBlocks: 0,
      totalHonks: 0,
      totalBons: 0,
      totalSteamHits: 0,
      totalTips: 0,
    };
  }
}

export function saveShiftRecord(run) {
  const rec = loadRecords();
  const powerPct = Math.ceil(run.power || 0);
  const key = String(run.night);
  const prevBest = Number(rec.bestPowerByNight[key]) || 0;
  const isNewRecord = powerPct > prevBest;
  rec.nightsWon += 1;
  rec.bestPowerByNight[key] = Math.max(prevBest, powerPct);
  rec.totalBlocks += (run.stats?.haukeBlocked || 0) + (run.stats?.antonBlocked || 0) + (run.stats?.tomBlocked || 0);
  rec.totalHonks += run.stats?.posterHonks || 0;
  rec.totalBons += run.stats?.bonsStamped || 0;
  rec.totalSteamHits += run.stats?.steamHits || 0;
  const shiftTips = Math.max(4, Number(run.stats?.tipsEarned) || 0);
  rec.totalTips = Math.round((rec.totalTips + shiftTips) * 100) / 100;
  addWalletTips(shiftTips);
  if (run.presetId) markPresetCompleted(run.presetId);
  try {
    localStorage.setItem(SAVE_KEYS.records, JSON.stringify(rec));
  } catch {
    // ignore storage errors
  }
  return { records: rec, isNewRecord, shiftTips };
}

export function computeShiftRank(run) {
  const power = Math.ceil(run?.power || 0);
  const blocks = (run?.stats?.haukeBlocked || 0) + (run?.stats?.antonBlocked || 0) + (run?.stats?.tomBlocked || 0) + (run?.stats?.torgeRepelled || 0);
  const dodges = (run?.stats?.videoDodges || 0) + (run?.stats?.underDeskSurvived || 0);
  const lures = run?.stats?.tomLured || 0;
  const bons = run?.stats?.bonsStamped || 0;
  const steamHits = run?.stats?.steamHits || 0;
  const flashes = run?.stats?.camFlashes || 0;
  const tips = run?.stats?.tipsEarned || 0;
  const activeMods = Array.isArray(run?.modifiers) ? run.modifiers.filter((m) => SHIFT_MODIFIER_MAP[m]) : [];
  const modBonusPct = activeMods.reduce((sum, m) => sum + (SHIFT_MODIFIER_MAP[m]?.bonusPct || 0), 0);

  const rawScore = power * 1.35
    + blocks * 9
    + dodges * 11
    + lures * 8
    + bons * 9
    + steamHits * 11
    + flashes * 6
    + (run?.stats?.goldenBanished || 0) * 15;
  const score = rawScore * (1 + modBonusPct / 100);

  const is420 = run?.night === 7 && run?.customAi
    && run.customAi.torge >= 20 && run.customAi.anton >= 20 && run.customAi.tom >= 20 && run.customAi.hauke >= 20;

  const tipSuffix = tips > 0 ? ` + ${tips.toFixed(2).replace('.', ',')} € Trinkgeld` : '';

  if ((is420 && activeMods.length >= 1) || (score >= 132 && activeMods.length >= 2)) {
    return { grade: 'S++', label: 'NACHTSCHICHT-LEGENDE', wage: `189,90 € Tarif${tipSuffix}` };
  }
  if (is420 || score >= 92 || power >= 45) {
    return { grade: 'S+', label: 'SCHLÜSSELKRAFT', wage: `149,90 € Tarif${tipSuffix}` };
  }
  if (score >= 62 || power >= 28) {
    return { grade: 'A', label: 'STAMMKRAFT', wage: `120,50 € Tarif${tipSuffix}` };
  }
  if (score >= 38 || power >= 14) {
    return { grade: 'B', label: 'NACHTAUSHILFE', wage: `95,00 € Tarif${tipSuffix}` };
  }
  return { grade: 'C', label: 'KNAPP ENTKOMMEN', wage: `68,40 € (Abzüge)${tipSuffix}` };
}
