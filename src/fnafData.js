export const HOUR_SECONDS = 55;
export const NIGHT_HOURS = 6;
export const TOTAL_NIGHT_SECONDS = HOUR_SECONDS * NIGHT_HOURS;

export const SAVE_KEYS = {
  night: 'fnat_unlocked_night_v1',
  stars: 'fnat_stars_v1',
  achievements: 'fnat_achievements_v1',
  records: 'fnat_records_v1',
  settings: 'fnat_settings_v1',
};

export const CAMERAS = [
  { id: '1A', name: 'Döner-Bühne', short: '1A', x: 39, y: 12 },
  { id: '1B', name: 'Gastraum', short: '1B', x: 34, y: 31 },
  { id: '1C', name: 'Buffet-Bucht', short: '1C', x: 18, y: 47 },
  { id: '2A', name: 'West-Flur', short: '2A', x: 31, y: 69 },
  { id: '2B', name: 'West-Ecke', short: '2B', x: 31, y: 84 },
  { id: '3', name: 'Pfand-Lager', short: '3', x: 15, y: 69 },
  { id: '4A', name: 'Ost-Flur', short: '4A', x: 56, y: 69 },
  { id: '4B', name: 'Ost-Ecke', short: '4B', x: 56, y: 84 },
  { id: '5', name: 'Werkstatt', short: '5', x: 10, y: 27 },
  { id: '6', name: 'Küchenfunk', short: '6', x: 80, y: 60, audioOnly: true },
];

export const CAMERA_MAP = Object.fromEntries(CAMERAS.map((c) => [c.id, c]));

export const NIGHT_CONFIGS = {
  1: {
    title: 'NACHT 1',
    sub: 'Probewache — Mitternachts-Imbiss',
    ai: { torge: 0, anton: 0, tom: 0, hauke: 0 },
    hourlyBumps: {
      1: { anton: 1 },
      2: { tom: 1 },
      3: { anton: 1, hauke: 1 },
      4: { anton: 1, tom: 1, hauke: 1 },
    },
    passiveDrain: 0.0,
  },
  2: {
    title: 'NACHT 2',
    sub: 'Der Boden bebt im West-Flur',
    ai: { torge: 0, anton: 3, tom: 1, hauke: 1 },
    hourlyBumps: {
      2: { anton: 1 },
      3: { anton: 1, tom: 1, hauke: 1 },
      4: { anton: 1, tom: 1, hauke: 1 },
    },
    passiveDrain: 0.015,
  },
  3: {
    title: 'NACHT 3',
    sub: 'Chef Torge verlässt die Bühne',
    ai: { torge: 1, anton: 0, tom: 5, hauke: 2 },
    hourlyBumps: {
      2: { anton: 1 },
      3: { anton: 1, tom: 1, hauke: 1 },
      4: { anton: 1, tom: 1, hauke: 1 },
    },
    passiveDrain: 0.025,
  },
  4: {
    title: 'NACHT 4',
    sub: 'Alle Sicherungen unter Last',
    ai: { torge: 2, anton: 2, tom: 4, hauke: 6 },
    hourlyBumps: {
      2: { anton: 1 },
      3: { anton: 1, tom: 1, hauke: 1 },
      4: { anton: 1, tom: 1, hauke: 1 },
    },
    passiveDrain: 0.036,
  },
  5: {
    title: 'NACHT 5',
    sub: 'Letzte Schicht vor der Auszahlung',
    ai: { torge: 3, anton: 5, tom: 7, hauke: 5 },
    hourlyBumps: {
      2: { anton: 1 },
      3: { anton: 1, tom: 1, hauke: 1 },
      4: { anton: 1, tom: 1, hauke: 1 },
    },
    passiveDrain: 0.048,
  },
  6: {
    title: 'NACHT 6',
    sub: 'Überstunden — Kein Erbarmen',
    ai: { torge: 4, anton: 10, tom: 12, hauke: 16 },
    hourlyBumps: {
      2: { anton: 1 },
      3: { anton: 1, tom: 1, hauke: 1 },
      4: { anton: 1, tom: 1, hauke: 1 },
    },
    passiveDrain: 0.058,
  },
  7: {
    title: 'CUSTOM NIGHT',
    sub: 'Eigene Schicht-Einstellungen',
    ai: { torge: 5, anton: 5, tom: 5, hauke: 5 },
    hourlyBumps: {},
    passiveDrain: 0.042,
  },
};

export const CHARACTERS = {
  torge: {
    id: 'torge',
    name: 'Chef Torge',
    badge: 'TORGE',
    color: '#e0424f',
    role: 'Der Hausherr',
    route: '1A → 1B → 6 → 4A → 4B → Rechte Tür',
    counter: 'Auf CAM 4B beobachten hält ihn auf. Rechts schließen, bevor du wegklickst.',
    lore: 'Trägt goldene Krone auf grüner Kappe und seine Glücks-Bratpfanne. Zählt nach Mitternacht die Kasse — ohne Bon gibt es keine Gnade.',
    desc: 'Bewegt sich im Dunkeln mit leisem Lachen. Hält still, wenn du ihn auf der Kamera fixierst. Kommt rechts.',
    deathLine: 'Chef Torge hat die Kasse gezählt. Du warst das Wechselgeld.',
  },
  anton: {
    id: 'anton',
    name: 'Lost Anton',
    badge: 'ANTON',
    color: '#c8e838',
    role: 'Linke Tür & Videoanruf',
    route: '1A → 1B / 5 → 2A / 3 → 2B → Linke Tür',
    counter: 'Linkes Flurlicht prüfen & linke Tür zu. Bei Videoanruf: Feed wechseln oder Monitor runter!',
    lore: 'Eigentlich komplett verlaufen, aber immer mit Handy in der Hand. Starrst du ihn auf einem Feed zu lange an, startet er unaufgefordert einen Videoanruf.',
    desc: 'Schleicht durch den West-Flur. Starrst du ihn auf einem Feed zu lange an, meldet er sich per Video.',
    deathLine: 'Anton stand lautlos im linken Flur. Er wollte nur fragen, ob du Kleingeld hast.',
  },
  tom: {
    id: 'tom',
    name: 'Schnorrer Tom',
    badge: 'TOM',
    color: '#f2b5c6',
    role: 'Rechte Tür & Küche',
    route: '1A → 1B → 6 → 4A → 4B → Rechte Tür',
    counter: 'Rechtes Licht prüfen & rechte Tür zu — oder per Bestellgong (CAM 6, −4 % Strom) zurücklocken.',
    lore: 'Umgedrehte Cap, Surf-Miami-Shirt und ein Rucksack voller Pfand & Spezi. Schuldet jedem im Imbiss mindestens 4,50 € seit 2022.',
    desc: 'Klappert in der dunklen Küche (CAM 6) mit Pfannen & Spezi-Dosen und starrt danach ins rechte Bürofenster.',
    deathLine: 'Schnorrer Tom hat sich nicht nur dein Spezi geschnorrt — sondern auch deine Schicht.',
  },
  hauke: {
    id: 'hauke',
    name: 'Boss Hauke',
    badge: 'HAUKE',
    color: '#ffb84d',
    role: 'Buffet-Bucht (Erdbeben!)',
    route: 'CAM 1C Vorhang → CAM 2A Erdbeben-Sprint → Linke Tür',
    counter: 'Regelmäßig auf CAM 1C schauen bremst ihn. Bebt das Büro: SOFORT linke Tür schließen!',
    lore: 'Richter-Skala 8,4 auf zwei Beinen. Wenn seine Fresspause vorbei ist, zerlegt sein Sprint im West-Flur die Kamerasicherung gleich mit.',
    desc: 'Lauert hinter dem Vorhang in CAM 1C. Schau regelmäßig auf Kameras! Bebt das Büro: SOFORT LINKE TÜR ZU!',
    deathLine: 'Richter-Skala 8,4 im West-Flur — Boss Hauke hat die linke Stahltür nicht mal gebraucht.',
  },
  duck: {
    id: 'duck',
    name: 'Goldene Ente',
    badge: 'ENTE',
    color: '#ffda38',
    role: 'Halluzination · Akte 1987',
    route: 'Seltenes Poster auf CAM 2B → Direkt im Büro',
    counter: 'Wenn sie vor dem Schreibtisch sitzt: SOFORT Monitor hochklappen! (Nicht 1-9-8-7 testen...)',
    lore: 'Niemand weiß, woher die riesige goldene Quietsche-Ente kommt. Manche sagen, sie war schon vor der Fritteuse da.',
    desc: 'Erscheint selten im Büro nach einem Blick auf CAM 2B. Klappe sofort den Kamera-Monitor hoch!',
    deathLine: 'ES BIN ICH. QUAAAK.',
  },
};

export const PHONE_CALLS = {
  1: [
    { at: 2, dur: 6.5, text: '„Hallo? Hallo, hallo? Hey, wollte dir nur kurz eine Nachricht für deine erste Nacht bei Chef Torges Mitternachts-Imbiss dalassen.“' },
    { at: 9.5, dur: 6.5, text: '„Gleich machen wir einen Probealarm. Fang in der West-Ecke an. Und wenn Anton per Video anruft, drück ihn weg: Kamera wechseln oder Monitor runter.“' },
    { at: 17, dur: 7.0, text: '„Also... kleine Info wegen der Jungs auf der Bühne: Nachts gehen sie in den Freilauf-Modus, sonst rosten die Fritteusen-Scharniere ein.“' },
    { at: 25, dur: 7.5, text: '„Wenn sie dich nach Mitternacht sehen, halten sie dich leider für einen nicht abkassierten Gast ohne Bon. Und das... mögen sie gar nicht.“' },
    { at: 33.5, dur: 7.5, text: '„Deshalb hast du links und rechts Stahltüren und Flurlichter! Aber Achtung: Unser Notstrom reicht nicht ewig — mach Türen nur zu, wenn es ernst wird.“' },
    { at: 42, dur: 6.5, text: '„Prüf die Lichter links und rechts, check die Kameras, und übersteh einfach bis 06:00 Uhr. Viel Erfolg — wir hören uns morgen!“' },
  ],
  2: [
    { at: 2, dur: 6.5, text: '„Hallo, hallo! Stark, du hast Nacht 1 überlebt! Heute werden Anton und Tom leider deutlich unruhiger.“' },
    { at: 9.5, dur: 7.5, text: '„Wichtige Warnung für heute Nacht: Vergiss nicht die Buffet-Bucht auf CAM 1C! Da hinter dem gestreiften Vorhang sitzt Boss Hauke.“' },
    { at: 18, dur: 7.5, text: '„Schau direkt in die Buffet-Bucht. Wenn er dich dort bemerkt, hält er kurz still. Die anderen Kameras sind ihm egal.“' },
    { at: 26.5, dur: 7.5, text: '„Und wenn der Vorhang komplett offen ist... und dein Schreibtisch plötzlich anfängt zu beben: SOFORT die LINKE Stahltür runter! Vertrau mir!“' },
    { at: 35, dur: 7.5, text: '„Auf CAM 6 holt der Bestellgong Tom vom rechten Flur zurück. Kostet vier Prozent Strom. Ja, auch wenn keiner was abholt.“' },
  ],
  3: [
    { at: 2, dur: 6.5, text: '„Hey, du bist echt noch da! Die meisten kündigen nach dem ersten Erdbeben im West-Flur. Respekt.“' },
    { at: 9.5, dur: 7.5, text: '„Ab heute Nacht wird Chef Torge selbst aktiv. Er bleibt auf der Bühne, bis Anton und Tom weg sind — danach hörst du nur noch sein tiefes Lachen.“' },
    { at: 18, dur: 7.5, text: '„Torge versteckt sich im Schatten. Er kommt über den Ost-Flur (CAM 4A & 4B). Wenn du ihn auf CAM 4B im Blick behältst, traut er sich nicht durch die Tür.“' },
    { at: 26.5, dur: 7.0, text: '„Und noch was: Lass den Strom bloß nicht auf 0% fallen. Wenn die Spieluhr im Dunkeln angeht... bleib still und bete für 06:00 Uhr.“' },
  ],
  4: [
    { at: 2, dur: 6.5, text: '„Hallo? Hallo! Oh Mann, ich bin froh, dass ich noch was aufnehmen konnte... meine letzte Schicht hier läuft gerade... nicht so gut.“' },
    { at: 9.5, dur: 6.5, text: '„*KLOPF* *KLOPF* — Hörst du das?! Die linke Tür vibriert, Hauke rammt schon wieder dagegen und ich hab kaum noch Akku...“' },
    { at: 17, dur: 6.5, text: '„Wenn du in den hinteren Lagerräumen mal meine alte Dienstmütze findest — *SEISMISCHES DUMPEN* — ach Mist, das Licht flackert!“' },
    { at: 24.5, dur: 6.0, text: '„*LEISE SPIELUHR-MELODIE* ...Oh nein. Torge steht in der Tür. Ich— *STATISCHES KREISCHEN* — *KLICK*“' },
  ],
  5: [
    { at: 2, dur: 7.5, text: '„*VERZERRTES RAUSCHEN* ...d-die Schicht... endet nie... kein Bon... keine Gnade... 03:00...“' },
    { at: 10.5, dur: 7.5, text: '„*METALLISCHES FLÜSTERN* ...es ist nur noch eine Nacht... halte die Türen fest... er steht hinter dem Vorhang...“' },
    { at: 19, dur: 6.0, text: '„*KASSENKLINGELN* ...ES BIN ICH... *LEITUNG TOT*“' },
  ],
};

export const HALLUCINATIONS = [
  'ES BIN ICH',
  'OHNE ZWIEBELN',
  'KEIN BON',
  'SCHICHT ENDET NIE',
  'ER HAT HUNGER',
  'QUAAAK',
  'MIT SCHARF?!',
  'SPEZI ALLE',
  'RICHTER-SKALA 8,4',
  'PFANDAUTOMAT DEFEKT',
];

export const MEME_LINES = {
  antonBlock: [
    'WEST FREI · „Dann halt durch den Haupteingang.“',
    'WEST FREI · Anton schaut kurz aufs Navi und dreht um.',
    'WEST FREI · „Warte, ist hier gar nicht der Ausgang?“',
    'WEST FREI · Anton zieht verwirrt in den Gastraum ab.',
  ],
  tomBlock: [
    'OST FREI · „War eh nur wegen der Soße hier.“',
    'OST FREI · „Hast du zufällig noch 2 Euro? Nein? Okay...“',
    'OST FREI · Tom klappert beleidigt mit seinem Pfandsack davon.',
    'OST FREI · „Nächstes Mal zahl ich, schwöre!“',
  ],
  videoDodge: [
    'ANTON · Anruf abgelehnt. „Dann halt schriftlich.“',
    'ANTON · „Bruder geh doch ran, ich bin komplett lost.“',
    'ANTON · Weggedrückt. Neue Sprachnachricht (07:42 Min) ignoriert.',
    'ANTON · „Okay chill, schreib ich halt auf WhatsApp.“',
  ],
  tomLure: [
    'BON #404 · „Tom, einmal alles!“ Er ist wieder in der Küche.',
    'BON #404 · „Gratis-Spezi an der Ausgabe!“ Tom sprintet in CAM 6.',
    'BON #404 · „Rest-Pommes auf Haus!“ Tom lässt vom Ost-Flur ab.',
  ],
  haukeBlock: [
    'ERDBEBEN ABGEWEHRT · Linke Stahltür ächzt. Sicherung fliegt!',
    'RICHTER-SKALA 8,4 · Tür hält gerade noch! Hauke schnauft ab.',
    'SEISMISCHER TREFFER · Die Kaffeetasse überlebt knapp.',
  ],
  speziSip: [
    'SCHICHT-BOOST · Eiskaltes Spezi. Moral +100 %, Strom leider +0 %.',
    'SPEZI-PAUSE · *Pssshhh!* Schmeckt besser als Überstunden.',
    'SPEZI-CHECK · Noch halb voll. Gut, dass Tom nicht reingekommen ist.',
  ],
  duckSqueak: [
    'QUIETSCH! · Die Schreibtisch-Ente urteilt schweigend über dich.',
    'QUAAAK! · Angeblich verwandt mit der großen Ente aus CAM 2B.',
  ],
};

export const CUSTOM_PRESETS = [
  { name: 'Standard', ai: { torge: 5, anton: 5, tom: 5, hauke: 5 } },
  { name: 'Erdbeben-Hauke', ai: { torge: 2, anton: 4, tom: 4, hauke: 20 } },
  { name: 'Doppeltür-Stress', ai: { torge: 0, anton: 18, tom: 18, hauke: 8 } },
  { name: 'Spezi-Diebstahl', ai: { torge: 4, anton: 6, tom: 20, hauke: 6 } },
  { name: 'Chef-Visite', ai: { torge: 20, anton: 8, tom: 8, hauke: 10 } },
  { name: 'Antons Anruf', ai: { torge: 0, anton: 20, tom: 0, hauke: 0 } },
  { name: '4/20 ALPTRAUM', ai: { torge: 20, anton: 20, tom: 20, hauke: 20 } },
];

export const ACHIEVEMENTS = [
  { id: 'first_bon', title: 'Erster Bon', desc: 'Überlebe Nacht 1 im Mitternachts-Imbiss.', icon: '★' },
  { id: 'stammkraft', title: 'Stammkraft', desc: 'Überlebe alle 5 regulären Nächte.', icon: '👑' },
  { id: 'overtime', title: 'Überstunden-Held', desc: 'Meistere die 6. Nacht ohne Erbarmen.', icon: '⚡' },
  { id: 'legend_420', title: '4/20 Imbiss-Legende', desc: 'Überlebe 4/20 ALPTRAUM in der Custom Night.', icon: '🔥' },
  { id: 'quake_pro', title: 'Erdbeben-Experte', desc: 'Blocke Boss Hauke 3× in einer einzigen Schicht.', icon: '💥' },
  { id: 'ghosting', title: 'Ghosting-Profi', desc: 'Drücke 3 Videoanrufe von Lost Anton in einer Nacht weg.', icon: '📵' },
  { id: 'spezi_bait', title: 'Spezi-Köder', desc: 'Locke Schnorrer Tom 2× per Bestellgong in die Küche.', icon: '🔔' },
  { id: 'power_saver', title: 'Sparfuchs', desc: 'Erreiche 6:00 AM mit mindestens 35 % Reststrom.', icon: '🔋' },
  { id: 'honk_rebel', title: 'Hausordnung ignoriert', desc: 'Hupe 10× auf Chef Torges Poster in einer Schicht.', icon: '📯' },
  { id: 'duck_banish', title: 'Quak-Exorzist', desc: 'Vertreibe die Goldene Ente rechtzeitig per Monitor.', icon: '🦆' },
  { id: 'code_1987', title: 'Akte 1987', desc: 'Entdecke das geheime 1-9-8-7 Easter Egg.', icon: '👁' },
];

export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

export const DEFAULT_SETTINGS = {
  graphics: 'hd', // 'hd' | 'retro'
  crt: 'subtle', // 'subtle' | 'strong' | 'off'
  volume: 0.85, // 0.0 .. 1.0
  mouseSens: 1.0, // 0.5 .. 2.0
  reducedMotion: false,
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SAVE_KEYS.settings);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      graphics: parsed.graphics === 'retro' ? 'retro' : 'hd',
      crt: ['subtle', 'strong', 'off'].includes(parsed.crt) ? parsed.crt : 'subtle',
      volume: Math.max(0, Math.min(1, Number.isFinite(Number(parsed.volume)) ? Number(parsed.volume) : DEFAULT_SETTINGS.volume)),
      mouseSens: Math.max(0.5, Math.min(2.0, Number.isFinite(Number(parsed.mouseSens)) ? Number(parsed.mouseSens) : DEFAULT_SETTINGS.mouseSens)),
      reducedMotion: Boolean(parsed.reducedMotion),
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
    const stars = Math.max(0, Math.min(3, Math.trunc(Number(localStorage.getItem(SAVE_KEYS.stars))) || 0));
    return { night, stars };
  } catch {
    return { night: 1, stars: 0 };
  }
}

export function saveProgress(nightWon, customAi = null) {
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
    nextStars = 3;
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

export function loadRecords() {
  try {
    const raw = localStorage.getItem(SAVE_KEYS.records);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      nightsWon: Math.max(0, Math.trunc(Number(parsed.nightsWon) || 0)),
      bestPowerByNight: parsed.bestPowerByNight && typeof parsed.bestPowerByNight === 'object' ? parsed.bestPowerByNight : {},
      totalBlocks: Math.max(0, Math.trunc(Number(parsed.totalBlocks) || 0)),
      totalHonks: Math.max(0, Math.trunc(Number(parsed.totalHonks) || 0)),
    };
  } catch {
    return { nightsWon: 0, bestPowerByNight: {}, totalBlocks: 0, totalHonks: 0 };
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
  try {
    localStorage.setItem(SAVE_KEYS.records, JSON.stringify(rec));
  } catch {
    // ignore storage errors
  }
  return { records: rec, isNewRecord };
}

export function computeShiftRank(run) {
  const power = Math.ceil(run?.power || 0);
  const blocks = (run?.stats?.haukeBlocked || 0) + (run?.stats?.antonBlocked || 0) + (run?.stats?.tomBlocked || 0);
  const dodges = run?.stats?.videoDodges || 0;
  const lures = run?.stats?.tomLured || 0;
  const score = power * 1.35 + blocks * 9 + dodges * 10 + lures * 8 + (run?.stats?.goldenBanished || 0) * 15;
  const is420 = run?.night === 7 && run?.customAi
    && run.customAi.torge >= 20 && run.customAi.anton >= 20 && run.customAi.tom >= 20 && run.customAi.hauke >= 20;

  if (is420 || score >= 92 || power >= 45) {
    return { grade: 'S+', label: 'KÜCHENCHEF-EHRE', wage: '149,90 € + VIP-Döner' };
  }
  if (score >= 62 || power >= 28) {
    return { grade: 'A', label: 'STAMMKRAFT', wage: '120,50 € + Gratis-Spezi' };
  }
  if (score >= 38 || power >= 14) {
    return { grade: 'B', label: 'AUSHILFE', wage: '95,00 € + Pommes' };
  }
  return { grade: 'C', label: 'KNAPP ÜBERLEBT', wage: '68,40 € (Strom abgezogen)' };
}
