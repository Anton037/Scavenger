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
    heatRate: 0.52,
    firstBonAt: 48,
    bonInterval: [42, 54],
  },
  2: {
    title: 'NACHT 2',
    sub: 'Dampf & Erdbeben im West-Flur',
    ai: { torge: 0, anton: 3, tom: 1, hauke: 1 },
    hourlyBumps: {
      2: { anton: 1 },
      3: { anton: 1, tom: 1, hauke: 1 },
      4: { anton: 1, tom: 1, hauke: 1 },
    },
    passiveDrain: 0.015,
    heatRate: 0.88,
    firstBonAt: 26,
    bonInterval: [36, 48],
  },
  3: {
    title: 'NACHT 3',
    sub: 'Chef Torge & die heiße Fritteuse',
    ai: { torge: 1, anton: 0, tom: 5, hauke: 2 },
    hourlyBumps: {
      2: { anton: 1 },
      3: { anton: 1, tom: 1, hauke: 1 },
      4: { anton: 1, tom: 1, hauke: 1 },
    },
    passiveDrain: 0.025,
    heatRate: 1.08,
    firstBonAt: 22,
    bonInterval: [33, 45],
  },
  4: {
    title: 'NACHT 4',
    sub: 'Hochdruck an allen Ventilen',
    ai: { torge: 2, anton: 2, tom: 4, hauke: 6 },
    hourlyBumps: {
      2: { anton: 1 },
      3: { anton: 1, tom: 1, hauke: 1 },
      4: { anton: 1, tom: 1, hauke: 1 },
    },
    passiveDrain: 0.036,
    heatRate: 1.25,
    firstBonAt: 20,
    bonInterval: [30, 42],
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
    heatRate: 1.42,
    firstBonAt: 18,
    bonInterval: [28, 39],
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
    heatRate: 1.58,
    firstBonAt: 16,
    bonInterval: [26, 36],
  },
  7: {
    title: 'CUSTOM NIGHT',
    sub: 'Eigene Schicht & Risiko-Modifikatoren',
    ai: { torge: 5, anton: 5, tom: 5, hauke: 5 },
    hourlyBumps: {},
    passiveDrain: 0.042,
    heatRate: 1.32,
    firstBonAt: 18,
    bonInterval: [28, 40],
  },
};

export const SHIFT_MODIFIERS = [
  {
    id: 'grease_fire',
    name: 'Fritteusen-Überlast',
    short: 'HITZE ×1.8',
    desc: 'Dampfdruck steigt 80 % schneller — Flur-Dampfstöße laden dafür schneller nach!',
    bonusPct: 20,
  },
  {
    id: 'rush_hour',
    name: 'Liefer-Rushhour',
    short: 'BONS ×1.7',
    desc: 'Doppelt so viele Nacht-Bestellungen mit kürzerem Zeitfenster (+Trinkgeld).',
    bonusPct: 20,
  },
  {
    id: 'rusty_gen',
    name: 'Rostiger Generator',
    short: '75 % AKKU',
    desc: 'Start mit 75 % Notstrom, dafür bringt jeder abgestempelte Bon +6 % Strom!',
    bonusPct: 25,
  },
  {
    id: 'midnight_fog',
    name: 'Nebel-Schicht',
    short: 'DUNST',
    desc: 'Dichter Imbiss-Fettdunst & stärkeres Kamera-Flackern für echte Horror-Profis.',
    bonusPct: 15,
  },
];

export const SHIFT_MODIFIER_MAP = Object.fromEntries(SHIFT_MODIFIERS.map((m) => [m.id, m]));

export const ORDER_ITEMS = [
  { label: 'Döner Komplett (mit Scharf)', tip: 4.5 },
  { label: '2× Eiskaltes Spezi + Pommes', tip: 3.8 },
  { label: 'Mitternachts-Dürüm Spezial', tip: 5.2 },
  { label: 'Chef-Box ohne Zwiebeln', tip: 4.2 },
  { label: 'XXL-Schranke & Ayran', tip: 4.9 },
  { label: 'Überstunden-Sparmenü #04', tip: 5.5 },
];

export const PHONE_CALLS = {
  1: [
    { at: 2, dur: 6.5, text: '„Hallo? Hallo, hallo? Hey, willkommen zu deiner ersten Nachtschicht in Chef Torges Mitternachts-Imbiss!“' },
    { at: 9.5, dur: 6.5, text: '„Gleich startet unser Probealarm an der West-Ecke. Wenn Anton per Video anruft: Kamera wechseln, Monitor runter oder IR-Blitz drücken!“' },
    { at: 17, dur: 7.0, text: '„Kleine Info zu den Jungs auf der Bühne: Nachts laufen sie im Freilauf-Modus, sonst rosten uns die Fritteusen-Scharniere ein.“' },
    { at: 25, dur: 7.5, text: '„Wenn sie dich nach Mitternacht sehen, halten sie dich leider für einen nicht abkassierten Gast ohne Bon. Und das mögen sie gar nicht.“' },
    { at: 33.5, dur: 7.5, text: '„Du hast Stahltüren und Flurlichter — aber geschlossene Türen stauen Fritteusen-Hitze! Dreh links am roten Ventil, wenn es zu heiß wird.“' },
    { at: 42, dur: 6.5, text: '„Und falls rechts der Bon-Drucker rattert: Stempel den Bon im Büro ab, der Kassen-Dynamo gibt dir +4 % Notstrom! Viel Erfolg!“' },
  ],
  2: [
    { at: 2, dur: 6.5, text: '„Hallo, hallo! Stark, du hast Nacht 1 gepackt! Heute drehen Anton, Tom und unsere Fritteuse leider deutlich höher auf.“' },
    { at: 9.5, dur: 7.5, text: '„Wichtige Warnung: Vergiss nicht die Buffet-Bucht auf CAM 1C! Hinter dem gestreiften Vorhang lauert Boss Hauke.“' },
    { at: 18, dur: 7.5, text: '„Schau regelmäßig auf CAM 1C — oder feure dort den IR-Blitz ab, das drückt seinen Vorhang sogar eine Stufe zurück!“' },
    { at: 26.5, dur: 7.5, text: '„Bebt dein Schreibtisch: SOFORT die LINKE Stahltür runter! Und Tipp zum Dampfdruck: Ab 45 % kannst du auf CAM 2B oder 4B Dampfstöße ablassen!“' },
    { at: 35, dur: 7.5, text: '„So nebelst du Anton oder Tom kostenlos ein, ohne Türstrom zu verballern. Auf CAM 6 lockt außerdem der Bestellgong Tom zurück.“' },
  ],
  3: [
    { at: 2, dur: 6.5, text: '„Hey, du bist echt noch da! Die meisten kündigen nach dem ersten Erdbeben im West-Flur. Respekt.“' },
    { at: 9.5, dur: 7.5, text: '„Ab heute Nacht wird Chef Torge selbst aktiv. Er wartet auf der Bühne, bis Anton und Tom losgezogen sind — hör auf sein tiefes Lachen.“' },
    { at: 18, dur: 7.5, text: '„Halt bloß die Temperatur per Ventil unter 70 %, sonst kriegt Torge Küchen-Fieber und stürmt den Ost-Flur doppelt so schnell!“' },
    { at: 26.5, dur: 7.0, text: '„Auf CAM 4B beobachten hält ihn fest, und ein gezielter Dampfstoß treibt ihn zurück. Lass den Akku bloß nicht auf 0 % fallen...“' },
  ],
  4: [
    { at: 2, dur: 6.5, text: '„Hallo? Hallo! Oh Mann, gut dass das Band noch läuft... meine letzte Schicht hier ist komplett außer Kontrolle...“' },
    { at: 9.5, dur: 6.5, text: '„*ZISCH* *KLOPF* — Hörst du das?! Die Fritteuse kocht über, Hauke rammt die linke Tür und der Bon-Drucker rattert ohne Pause!“' },
    { at: 17, dur: 6.5, text: '„Stempel die Bons ab, wenn du Akku brauchst — *SEISMISCHES DUMPEN* — ach Mist, das Dampfventil klemmt fast!“' },
    { at: 24.5, dur: 6.0, text: '„*LEISE SPIELUHR-MELODIE* ...Oh nein. Torge steht im Dunst vor der Tür. Ich— *STATISCHES KREISCHEN* — *KLICK*“' },
  ],
  5: [
    { at: 2, dur: 7.5, text: '„*VERZERRTES RAUSCHEN* ...d-die Fritteuse... kühlt nie ab... kein Bon... keine Gnade... 03:00...“' },
    { at: 10.5, dur: 7.5, text: '„*METALLISCHES FLÜSTERN* ...es ist nur noch eine Nacht... halte den Dampf im Griff... er steht hinter dem Vorhang...“' },
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
  'FRITTEUSE KOCHT',
  'BON ABSTEMPELN!',
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
  bonStamped: [
    'BON ABGESTEMPELT · Kassen-Dynamo lädt Notstrom + Trinkgeld kassiert!',
    'BESTELLUNG #OK · „Einmal mit alles!“ Generator schnurrt zufrieden.',
    'EXPRESS-STEMPEL · Trinkgeld gesichert & Notstrom-Puffer aufgeladen!',
  ],
  bonMissed: [
    'BON VERPASST! · Drucker piept laut — Tom & Anton haben das gehört!',
    'STORNO-ALARM! · Unbestätigter Bon! Das Piepen hallt durch beide Flure!',
  ],
  steamVent: [
    'ABLUFT OFFEN · *ZISCHHH!* Fritteusen-Dampf zieht ab — kurz schwerhörig!',
    'DRUCK ABGELASSEN · Büro kühlt runter. Behalte die Türen im Auge!',
  ],
  steamBurstHit: [
    'DAMPFSTOSS TREFFER! · Heißer Knoblauch-Dampf treibt den Eindringling zurück!',
    'VOLLE LADUNG DAMPF! · Flur eingenebelt — Angreifer zieht hustend ab!',
  ],
  steamBurstMiss: [
    'DAMPFSTOSS · Flur eingenebelt, aber niemand stand in der Ecke.',
  ],
  irFlashHit: [
    'IR-BLITZ TREFFER! · Sensorik geblendet & Feed kristallklar!',
    'STROBOSKOP-IMPULS! · Volltreffer im Nachtsicht-Kanal!',
  ],
  overheat: [
    'ÜBERHITZUNG! · Fritteusen-Dampf beschlägt die Linsen — Chef Torge kocht!',
  ],
};

export const CUSTOM_PRESETS = [
  { name: 'Standard', ai: { torge: 5, anton: 5, tom: 5, hauke: 5 }, modifiers: [] },
  { name: 'Erdbeben-Hauke', ai: { torge: 2, anton: 4, tom: 4, hauke: 20 }, modifiers: [] },
  { name: 'Dampf-Kessel', ai: { torge: 14, anton: 10, tom: 12, hauke: 8 }, modifiers: ['grease_fire'] },
  { name: 'Nacht-Kassierer', ai: { torge: 8, anton: 12, tom: 14, hauke: 8 }, modifiers: ['rush_hour', 'rusty_gen'] },
  { name: 'Doppeltür-Stress', ai: { torge: 0, anton: 18, tom: 18, hauke: 8 }, modifiers: [] },
  { name: 'Chef-Visite', ai: { torge: 20, anton: 8, tom: 8, hauke: 10 }, modifiers: ['midnight_fog'] },
  { name: '4/20 ALPTRAUM', ai: { torge: 20, anton: 20, tom: 20, hauke: 20 }, modifiers: [] },
  { name: '4/20 KÜCHENGOTT', ai: { torge: 20, anton: 20, tom: 20, hauke: 20 }, modifiers: ['grease_fire', 'rush_hour', 'rusty_gen', 'midnight_fog'] },
];

export const ACHIEVEMENTS = [
  { id: 'first_bon', title: 'Erster Bon', desc: 'Überlebe Nacht 1 im Mitternachts-Imbiss.', icon: '★' },
  { id: 'stammkraft', title: 'Stammkraft', desc: 'Überlebe alle 5 regulären Nächte.', icon: '♛' },
  { id: 'overtime', title: 'Überstunden-Held', desc: 'Meistere die 6. Nacht ohne Erbarmen.', icon: '⚡' },
  { id: 'legend_420', title: '4/20 Imbiss-Legende', desc: 'Überlebe 4/20 ALPTRAUM in der Custom Night.', icon: '🔥' },
  { id: 'quake_pro', title: 'Erdbeben-Experte', desc: 'Blocke Boss Hauke 3× in einer einzigen Schicht.', icon: '◈' },
  { id: 'ghosting', title: 'Ghosting-Profi', desc: 'Drücke 3 Videoanrufe von Lost Anton in einer Nacht weg.', icon: '📵' },
  { id: 'spezi_bait', title: 'Spezi-Köder', desc: 'Locke Schnorrer Tom 2× per Bestellgong in die Küche.', icon: '🔔' },
  { id: 'power_saver', title: 'Sparfuchs', desc: 'Erreiche 6:00 AM mit mindestens 35 % Reststrom.', icon: '🔋' },
  { id: 'honk_rebel', title: 'Hausordnung ignoriert', desc: 'Hupe 10× auf Chef Torges Poster in einer Schicht.', icon: '📯' },
  { id: 'duck_banish', title: 'Quak-Exorzist', desc: 'Vertreibe die Goldene Ente rechtzeitig per Monitor.', icon: '🦆' },
  { id: 'code_1987', title: 'Akte 1987', desc: 'Entdecke das geheime 1-9-8-7 Easter Egg.', icon: '👁' },
  { id: 'steam_master', title: 'Dampf-Meister', desc: 'Vertreibe 2× in einer Schicht Angreifer per Flur-Dampfstoß.', icon: '♨' },
  { id: 'night_cashier', title: 'Bon-König', desc: 'Stemple 3 Nacht-Bestellungen in einer einzigen Schicht ab.', icon: '🧾' },
  { id: 'paparazzi_flash', title: 'Blitzlicht-Wächter', desc: 'Nutze 3× erfolgreich den IR-Kamerablitz gegen Störungen oder Gegner.', icon: '✦' },
  { id: 'mutator_pro', title: 'Risiko-Zuschlag', desc: 'Gewinne eine Schicht mit mindestens 2 aktiven Modifikatoren.', icon: '⚙' },
  { id: 'chef_god', title: '4/20 Küchengott', desc: 'Überlebe 4/20 mit aktiven Risiko-Modifikatoren oder Rang S++.', icon: '👑' },
];

export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
