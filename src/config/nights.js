export const NIGHT_CONFIGS = {
  1: {
    title: 'NACHT 1',
    sub: 'Einarbeitung · 3 Pflicht-Bestellungen',
    ai: { torge: 1, anton: 1, tom: 1, hauke: 0, duck: 0 },
    orderQuota: 3,
    hourlyBumps: {
      1: { anton: 1 },
      2: { tom: 1, torge: 1 },
      3: { anton: 1, hauke: 1 },
      4: { anton: 1, tom: 1, torge: 1 },
    },
    passiveDrain: 0.0,
    heatRate: 0.48,
    firstBonAt: 12,
    bonInterval: [22, 30],
  },
  2: {
    title: 'NACHT 2',
    sub: 'Hauptsicherung & Nachtschalter · 4 Bestellungen',
    ai: { torge: 2, anton: 3, tom: 2, hauke: 2, duck: 2 },
    orderQuota: 4,
    hourlyBumps: {
      2: { anton: 1, torge: 1 },
      3: { anton: 1, tom: 1, hauke: 1 },
      4: { anton: 1, tom: 1, hauke: 1, duck: 1 },
    },
    passiveDrain: 0.014,
    heatRate: 0.82,
    firstBonAt: 10,
    bonInterval: [20, 28],
  },
  3: {
    title: 'NACHT 3',
    sub: 'Durchreiche & Abluftdruck · 5 Bestellungen',
    ai: { torge: 4, anton: 3, tom: 5, hauke: 3, duck: 4 },
    orderQuota: 5,
    hourlyBumps: {
      2: { anton: 1, torge: 1 },
      3: { anton: 1, tom: 1, hauke: 1 },
      4: { torge: 1, tom: 1, hauke: 1, duck: 2 },
    },
    passiveDrain: 0.024,
    heatRate: 1.04,
    firstBonAt: 9,
    bonInterval: [19, 26],
  },
  4: {
    title: 'NACHT 4',
    sub: 'Regenschicht · 6 Bestellungen',
    ai: { torge: 6, anton: 5, tom: 6, hauke: 6, duck: 6 },
    orderQuota: 6,
    hourlyBumps: {
      2: { anton: 1, torge: 1 },
      3: { anton: 1, tom: 1, hauke: 2 },
      4: { torge: 2, tom: 1, duck: 2 },
    },
    passiveDrain: 0.034,
    heatRate: 1.22,
    firstBonAt: 8,
    bonInterval: [18, 25],
  },
  5: {
    title: 'NACHT 5',
    sub: 'Letzte Kassette · 7 Bestellungen',
    ai: { torge: 8, anton: 7, tom: 8, hauke: 7, duck: 8 },
    orderQuota: 7,
    hourlyBumps: {
      2: { anton: 2, torge: 1 },
      3: { tom: 2, hauke: 2 },
      4: { torge: 2, anton: 1, duck: 2 },
    },
    passiveDrain: 0.044,
    heatRate: 1.38,
    firstBonAt: 7,
    bonInterval: [17, 24],
  },
  6: {
    title: 'NACHT 6',
    sub: 'Unbezahlte Nachschicht · 8 Bestellungen',
    ai: { torge: 11, anton: 10, tom: 12, hauke: 14, duck: 12 },
    orderQuota: 8,
    hourlyBumps: {
      2: { anton: 2, torge: 2 },
      3: { tom: 2, hauke: 2 },
      4: { torge: 2, duck: 2 },
    },
    passiveDrain: 0.052,
    heatRate: 1.52,
    firstBonAt: 6,
    bonInterval: [16, 22],
  },
  7: {
    title: 'CUSTOM NIGHT',
    sub: 'Freie Parameter & Schicht-Mutatoren',
    ai: { torge: 5, anton: 5, tom: 5, hauke: 5, duck: 5 },
    orderQuota: 6,
    hourlyBumps: {},
    passiveDrain: 0.038,
    heatRate: 1.28,
    firstBonAt: 8,
    bonInterval: [18, 25],
  },
};

export const SHIFT_MODIFIERS = [
  {
    id: 'grease_fire',
    name: 'Defekte Abluft',
    short: 'HITZE ×1.8',
    desc: 'Küchenhitze staut sich 80 % schneller — Flur-Dampfstöße laden dafür schneller nach.',
    bonusPct: 20,
  },
  {
    id: 'rush_hour',
    name: 'Nachtbus-Andrang',
    short: 'QUOTE +2',
    desc: 'Zwei zusätzliche Pflicht-Bestellungen mit engerer Taktung (+Trinkgeld).',
    bonusPct: 20,
  },
  {
    id: 'rusty_gen',
    name: 'Marode Notbatterie',
    short: '75 % AKKU',
    desc: 'Start mit 75 % Hauptstrom; fertig gepackte Bestellungen speisen +5 % bis +7 % zurück.',
    bonusPct: 25,
  },
  {
    id: 'midnight_fog',
    name: 'Schwerer Fettdunst',
    short: 'SICHT −35 %',
    desc: 'Dichter Kondensbeschlag und instabilere Leuchtstoffröhren in beiden Fluren.',
    bonusPct: 15,
  },
];

export const SHIFT_MODIFIER_MAP = Object.fromEntries(SHIFT_MODIFIERS.map((m) => [m.id, m]));

export const ORDER_ITEMS = [
  { label: 'Döner Komplett (scharf, Papierbeutel)', tip: 4.5 },
  { label: 'Große Pommes + 0,5l Spezi kalt', tip: 4.0 },
  { label: 'Dürüm Nachtschicht-Spezial', tip: 5.2 },
  { label: 'Drehspieß-Box ohne Zwiebeln + Spezi', tip: 4.4 },
  { label: 'Doppel-Pommes Schranke & Becher-Spezi', tip: 4.8 },
  { label: 'Fahrer-Menü #04 zum Mitnehmen', tip: 5.5 },
];

export const PHONE_CALLS = {
  1: [
    { at: 2, dur: 6.8, text: '„...Aufnahme läuft. Wenn du das hörst, hast du die Schlüssel für die Nachtausgabe übernommen. Hör kurz genau zu.“' },
    { at: 9.8, dur: 7.2, text: '„Vor dir liegen die zwei Stahlrollläden und die offene Mittel-Durchreiche. Hinter deinem Stuhl [S] steht die Vorbereitungszeile.“' },
    { at: 18.0, dur: 7.4, text: '„Du musst bis Punkt 06:00 Uhr deine Pflicht-Bons abarbeiten: Spieß schneiden, Pommes senken, Spezi zapfen und eintüten.“' },
    { at: 26.4, dur: 7.4, text: '„Fehlen um sechs noch Tüten, schaltet die Stechuhr auf Überstunden — und Torge kommt durch die offene Durchreiche nach vorn.“' },
    { at: 34.8, dur: 7.2, text: '„In der Mitte gibt es keinen Rollladen. Leuchte mit der Taschenlampe [F] tief in den Schacht, sobald dort Augen reflektieren.“' },
    { at: 43.0, dur: 6.8, text: '„Und falls Anton links reinkommt: Nicht stehen bleiben. Unter die Theke [C] und Luft anhalten [Space], bis er weg ist.“' },
  ],
  2: [
    { at: 2, dur: 6.8, text: '„Zweite Kassette. Der Sicherungskasten hinten links an der Rückwand macht seit gestern Probleme.“' },
    { at: 9.8, dur: 7.4, text: '„Hauke steht hinter dem Vorhang auf Kamera 1C. Wenn der Boden bebt: Sofort linken Rollladen [Q] runterlassen.“' },
    { at: 18.2, dur: 7.4, text: '„Der Einschlag wirft jedes Mal den Hauptschalter raus. Dreh dich um 180 Grad [S] und zieh den Hebel im roten Notlicht wieder hoch.“' },
    { at: 26.6, dur: 7.5, text: '„Ach so — lass das Elektromesser nicht unnötig laufen. Tom hört den Lärm bis in die Gasse und kriecht an die hintere Klappe.“' },
    { at: 35.0, dur: 7.2, text: '„Noch was: Im Lager liegt noch das alte gelbe Enten-Kostüm. Wenn es plötzlich im Raum steht — mach bloß die Taschenlampe aus.“' },
  ],
  3: [
    { at: 2, dur: 6.8, text: '„Dritte Nacht. Die Abluft zieht kaum noch. Geschlossene Rollläden treiben die Hitze über siebzig Grad.“' },
    { at: 9.8, dur: 7.4, text: '„Hinten links neben dem Sicherungskasten sitzt das rote Abluftventil. Oder lass den gestauten Dampf auf Kamera 2B und 4B per [X] ab.“' },
    { at: 18.2, dur: 7.4, text: '„Wenn du Antons Gesicht im Monitor zu lange fixierst, wählt sein Handy sich direkt auf deinen Schirm. Drück [X] oder schalt um.“' },
    { at: 26.6, dur: 7.0, text: '„Ich hab vorhin im Kostüm am Spind Reißverschluss-Spuren gesehen. Von innen. Dreh dich einfach weg, wenn es hinter dir steht.“' },
  ],
  4: [
    { at: 2, dur: 6.5, text: '„*BANDLAUF EIERND* ...es ist Viertel nach vier. Mir fehlen noch zwei Bons und die Fritteuse kocht...“' },
    { at: 9.5, dur: 6.8, text: '„*SCHWERER SCHLAG* — Hauptsicherung schon wieder unten. Ich hör Schritte auf den nassen Fliesen direkt vor dem Tresen...“' },
    { at: 17.2, dur: 6.8, text: '„Ich sitz unter der Theke. Sein Handylicht streift über meine Schuhe... *GEDÄMPFTES ATMEN* ...bleib ruhig...“' },
    { at: 25.0, dur: 6.0, text: '„Moment. Hinter mir an der Durchreiche raschelt nasser Stoff. Ich leuchte nur ganz kurz— *BANDRISS*“' },
  ],
  5: [
    { at: 2, dur: 7.2, text: '„*TIEFE BANDVERZERRUNG* ...06:00 Uhr... Überstunden... der Spieß dreht weiter... niemand holt die Tüten ab...“' },
    { at: 10.2, dur: 7.2, text: '„*METALLISCHES SCHABEN* ...schau nicht in den Schnabel... kein Licht... halt die Luft an...“' },
    { at: 18.4, dur: 6.0, text: '„*KASSENBON RATTERT* ...DEINE SCHICHT... ENDET ERST WENN ALLES GEPACKT IST... *KLICK*“' },
  ],
};

export const HALLUCINATIONS = [
  'KEIN LICHT',
  '06:00 ÜBERSTUNDEN',
  'UNTER DIE THEKE',
  'HINTER DIR',
  'ATEM ANHALTEN',
  'QUOTE OFFEN',
  'SICHERUNG RAUS',
  'SCHAU WEG',
];

// Kept minimalistic for legacy helper compatibility; zero slapstick HUD toasts in v2.0
export const MEME_LINES = {
  antonBlock: [''],
  tomBlock: [''],
  videoDodge: [''],
  tomLure: [''],
  haukeBlock: [''],
  speziSip: [''],
  duckSqueak: [''],
  bonStamped: [''],
  bonMissed: [''],
  steamVent: [''],
  steamBurstHit: [''],
  steamBurstMiss: [''],
  irFlashHit: [''],
  overheat: [''],
};

export const CUSTOM_PRESETS = [
  {
    id: 'rushhour_nightmare',
    name: 'Rushhour-Alptraum',
    desc: 'Dauerbetrieb an der Vorbereitungszeile bei aggressivem Lärm-Jäger.',
    ai: { torge: 14, anton: 10, tom: 16, hauke: 8, duck: 8 },
    modifiers: ['rush_hour'],
  },
  {
    id: 'blackout_shift',
    name: 'Stromausfall-Schicht',
    desc: '75 % Startakku, ständige Sicherungs-Trips durch Hauke.',
    ai: { torge: 10, anton: 14, tom: 12, hauke: 18, duck: 6 },
    modifiers: ['rusty_gen'],
  },
  {
    id: 'silent_fryer',
    name: 'Stille Fritteuse',
    desc: 'Jedes Geräusch an der Rückwand ruft Tom und Anton auf den Plan.',
    ai: { torge: 12, anton: 16, tom: 18, hauke: 10, duck: 12 },
    modifiers: ['grease_fire'],
  },
  {
    id: 'imbiss_fever',
    name: 'Imbiss-Fieber',
    desc: 'Extreme Küchenhitze und beschlagene Scheiben — Torge jagt im Sekundentakt.',
    ai: { torge: 18, anton: 12, tom: 14, hauke: 14, duck: 14 },
    modifiers: ['grease_fire', 'midnight_fog'],
  },
  {
    id: 'closing_shift',
    name: 'Schlussschicht 03:00',
    desc: 'Dichter Dunst und häufige 180°-Manifestationen des Enten-Kostüms.',
    ai: { torge: 15, anton: 15, tom: 15, hauke: 15, duck: 18 },
    modifiers: ['midnight_fog'],
  },
  {
    id: 'midnight_hell_420',
    name: '4/20 Mitternachts-Hölle',
    desc: 'Alle Stalker auf Stufe 20 bei voller Risiko-Zulage.',
    ai: { torge: 20, anton: 20, tom: 20, hauke: 20, duck: 20 },
    modifiers: ['grease_fire', 'rush_hour', 'rusty_gen', 'midnight_fog'],
  },
];

export const ACHIEVEMENTS = [
  { id: 'first_bon', title: 'Probeschicht überstanden', desc: 'Überlebe Nacht 1 inklusive Pflicht-Quote.', icon: 'I' },
  { id: 'stammkraft', title: 'Schlüsselgewalt', desc: 'Überlebe alle 5 regulären Nächte.', icon: 'V' },
  { id: 'overtime', title: 'Nachschicht', desc: 'Überlebe die 6. Nacht vollständig.', icon: 'VI' },
  { id: 'legend_420', title: 'Mitternachts-Hölle', desc: 'Überlebe alle KI-Regler auf 20 in der Custom Night.', icon: 'XX' },
  { id: 'quake_pro', title: 'Stahlrahmen', desc: 'Blocke Boss Hauke 3× in einer Schicht und setze die Sicherung zurück.', icon: '⚡' },
  { id: 'ghosting', title: 'Funkstille', desc: 'Unterbrich 3 Videoanrufe von Lost Anton in einer Nacht.', icon: '✕' },
  { id: 'spezi_bait', title: 'Akustik-Köder', desc: 'Locke Schnorrer Tom 2× per Küchengong von den Zugängen weg.', icon: '◉' },
  { id: 'power_saver', title: 'Notstrom-Disziplin', desc: 'Erreiche 06:00 Uhr mit mindestens 35 % Reststrom.', icon: '▣' },
  { id: 'under_desk_ghost', title: 'Fliesen-Schatten', desc: 'Überlebe eine Büro-Durchsuchung mit angehaltenem Atem unter der Theke.', icon: '▽' },
  { id: 'duck_banish', title: 'Blickkontakt vermieden', desc: 'Entkomme dem nassen Enten-Kostüm ohne Taschenlampe.', icon: '◌' },
  { id: 'code_1987', title: 'Akte 1987', desc: 'Gib den gesperrten Code 1-9-8-7 in der Custom Night ein.', icon: '87' },
  { id: 'steam_master', title: 'Überdruck-Ventil', desc: 'Treibe 2× in einer Schicht Angreifer per Flur-Dampfstoß zurück.', icon: '≈' },
  { id: 'night_cashier', title: 'Pflicht-Quote', desc: 'Bereite 4 komplette Nacht-Bestellungen an der Rückwand zu.', icon: '▤' },
  { id: 'paparazzi_flash', title: 'Blend-Impuls', desc: 'Nutze 3× erfolgreich IR-Stroboskop oder Taschenlampe zur Abwehr.', icon: '✦' },
  { id: 'vhs_archivist', title: 'Band-Archivar', desc: 'Schließe mindestens ein VHS-Nachschicht-Band erfolgreich ab.', icon: '▶' },
  { id: 'chef_god', title: 'Schichtleiter-Akte S++', desc: 'Erreiche Rang S++ oder meistere 20er-KI mit Risiko-Mutatoren.', icon: '★' },
];

export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
