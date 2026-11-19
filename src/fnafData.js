export const HOUR_SECONDS = 55;
export const NIGHT_HOURS = 6;
export const TOTAL_NIGHT_SECONDS = HOUR_SECONDS * NIGHT_HOURS;

export const SAVE_KEYS = {
  night: 'fnat_unlocked_night_v1',
  stars: 'fnat_stars_v1',
};

export const CAMERAS = [
  { id: '1A', name: 'Döner-Bühne', short: '1A', x: 39, y: 12 },
  { id: '1B', name: 'Gastraum', short: '1B', x: 34, y: 31 },
  { id: '1C', name: 'Buffet-Bucht', short: '1C', x: 18, y: 47 },
  { id: '5', name: 'Werkstatt', short: '5', x: 10, y: 27 },
  { id: '3', name: 'Pfand-Lager', short: '3', x: 15, y: 69 },
  { id: '2A', name: 'West-Flur', short: '2A', x: 31, y: 69 },
  { id: '2B', name: 'West-Ecke', short: '2B', x: 31, y: 84 },
  { id: '6', name: 'Küche (Nur Audio)', short: '6', x: 80, y: 60, audioOnly: true },
  { id: '4A', name: 'Ost-Flur', short: '4A', x: 56, y: 69 },
  { id: '4B', name: 'Ost-Ecke', short: '4B', x: 56, y: 84 },
];

export const CAMERA_MAP = Object.fromEntries(CAMERAS.map((c) => [c.id, c]));

export const NIGHT_CONFIGS = {
  1: {
    title: 'NACHT 1',
    sub: 'Probewache — Mitternachts-Imbiss',
    ai: { torge: 0, anton: 0, tom: 0, hauke: 0 },
    hourlyBumps: {
      2: { anton: 1 },
      3: { anton: 1, tom: 1, hauke: 1 },
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
    role: 'Der Hausherr',
    desc: 'Bewegt sich im Dunkeln mit leisem Lachen. Hält still, wenn du ihn auf der Kamera fixierst. Kommt rechts.',
    deathLine: 'Chef Torge hat die Kasse gezählt. Du warst das Wechselgeld.',
  },
  anton: {
    id: 'anton',
    name: 'Lost Anton',
    role: 'Linke Tür',
    desc: 'Schleicht aggressiv durch West-Flur und Pfand-Lager. Leuchte das linke Fenster ab — wenn er starrt: TÜR ZU!',
    deathLine: 'Anton stand lautlos im linken Flur. Er wollte nur fragen, ob du Kleingeld hast.',
  },
  tom: {
    id: 'tom',
    name: 'Schnorrer Tom',
    role: 'Rechte Tür & Küche',
    desc: 'Klappert in der dunklen Küche (CAM 6) mit Pfannen & Spezi-Dosen und starrt danach ins rechte Bürofenster.',
    deathLine: 'Schnorrer Tom hat sich nicht nur dein Spezi geschnorrt — sondern auch deine Schicht.',
  },
  hauke: {
    id: 'hauke',
    name: 'Boss Hauke',
    role: 'Buffet-Bucht (Erdbeben!)',
    desc: 'Lauert hinter dem Vorhang in CAM 1C. Schau regelmäßig auf Kameras! Bebt das Büro: SOFORT LINKE TÜR ZU!',
    deathLine: 'Richter-Skala 8,4 im West-Flur — Boss Hauke hat die linke Stahltür nicht mal gebraucht.',
  },
  duck: {
    id: 'duck',
    name: 'Goldene Ente',
    role: 'Halluzination',
    desc: 'Erscheint selten im Büro nach einem Blick auf CAM 2B. Klappe sofort den Kamera-Monitor hoch!',
    deathLine: 'ES BIN ICH. QUAAAK.',
  },
};

export const PHONE_CALLS = {
  1: [
    { at: 2, dur: 6.5, text: '„Hallo? Hallo, hallo? Hey, wollte dir nur kurz eine Nachricht für deine erste Nacht bei Chef Torges Mitternachts-Imbiss dalassen.“' },
    { at: 9.5, dur: 6.5, text: '„Eigentlich ist der Job super entspannt — du sitzt bis 6 Uhr im Büro, schaust auf die Kameras und passt auf die Kasse auf.“' },
    { at: 17, dur: 7.0, text: '„Also... kleine Info wegen der Jungs auf der Bühne: Nachts gehen sie in den Freilauf-Modus, sonst rosten die Fritteusen-Scharniere ein.“' },
    { at: 25, dur: 7.5, text: '„Wenn sie dich nach Mitternacht sehen, halten sie dich leider für einen nicht abkassierten Gast ohne Bon. Und das... mögen sie gar nicht.“' },
    { at: 33.5, dur: 7.5, text: '„Deshalb hast du links und rechts Stahltüren und Flurlichter! Aber Achtung: Unser Notstrom reicht nicht ewig — mach Türen nur zu, wenn es ernst wird.“' },
    { at: 42, dur: 6.5, text: '„Prüf die Lichter links und rechts, check die Kameras, und übersteh einfach bis 06:00 Uhr. Viel Erfolg — wir hören uns morgen!“' },
  ],
  2: [
    { at: 2, dur: 6.5, text: '„Hallo, hallo! Stark, du hast Nacht 1 überlebt! Heute werden Anton und Tom leider deutlich unruhiger.“' },
    { at: 9.5, dur: 7.5, text: '„Wichtige Warnung für heute Nacht: Vergiss nicht die Buffet-Bucht auf CAM 1C! Da hinter dem gestreiften Vorhang sitzt Boss Hauke.“' },
    { at: 18, dur: 7.5, text: '„Er mag es gar nicht, wenn man ihn beobachtet — aber noch weniger, wenn man die Kameras gar nicht benutzt. Schau regelmäßig mal rein.“' },
    { at: 26.5, dur: 7.5, text: '„Und wenn der Vorhang komplett offen ist... und dein Schreibtisch plötzlich anfängt zu beben: SOFORT die LINKE Stahltür runter! Vertrau mir!“' },
    { at: 35, dur: 6.0, text: '„Ach ja — wenn in der Küche auf CAM 6 die Töpfe und Spezi-Dosen scheppern, ist das nur Tom. Halt einfach die rechte Tür im Blick!“' },
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
];

export const CUSTOM_PRESETS = [
  { name: 'Standard', ai: { torge: 5, anton: 5, tom: 5, hauke: 5 } },
  { name: 'Erdbeben-Hauke', ai: { torge: 2, anton: 4, tom: 4, hauke: 20 } },
  { name: 'Doppeltür-Stress', ai: { torge: 0, anton: 18, tom: 18, hauke: 8 } },
  { name: '4/20 ALPTRAUM', ai: { torge: 20, anton: 20, tom: 20, hauke: 20 } },
];

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
