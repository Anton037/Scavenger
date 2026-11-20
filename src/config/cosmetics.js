export const COSMETIC_ITEMS = [
  // 3D Desk Collectibles (toggleable simultaneously)
  {
    id: 'gold_spit',
    slot: 'desk',
    name: 'Goldener Mini-Dönerspieß',
    price: 12,
    desc: 'Messing-Trophäe vom Straßenfest 1996. Dreht sich leise auf der Theke.',
  },
  {
    id: 'neon_spezi',
    slot: 'desk',
    name: 'Neon-Spezi-Leuchtschild',
    price: 18,
    desc: 'Kleines Acryl-Thekenschild mit summender kalt-oranger Röhre.',
  },
  {
    id: 'bobble_crown',
    slot: 'desk',
    name: 'Wackel-Krone',
    price: 15,
    desc: 'Angelaufene Blechkrone auf rostiger Feder. Zittert bei jedem Schritt im Flur.',
  },
  {
    id: 'vhs_camcorder',
    slot: 'desk',
    name: '1998 Hi8-Camcorder',
    price: 22,
    desc: 'Abgegriffene Handkamera vom Vormieter. Die rote Standby-LED geht nie ganz aus.',
  },
  {
    id: 'polaroid_frame',
    slot: 'desk',
    name: 'Gerahmtes Schicht-Polaroid',
    price: 10,
    desc: 'Verblasstes Foto der alten Belegschaft vor dem Umbau. Ein Gesicht ist zerkratzt.',
  },

  // Wall Poster Variants (mutually exclusive)
  {
    id: 'poster_default',
    slot: 'poster',
    name: 'Nachtschicht-Dienstplan',
    price: 0,
    defaultUnlocked: true,
    desc: 'Vergilbter Hygiene- und Schließplan neben der Durchreiche.',
  },
  {
    id: 'poster_retro_doner',
    slot: 'poster',
    name: 'Drehspieß-Reklame (1996)',
    price: 14,
    desc: 'Fettfleckiges Originalplakat: „Torges Nacht-Imbiss — Bis 06:00 Uhr geöffnet“.',
  },
  {
    id: 'poster_missing',
    slot: 'poster',
    name: 'Akte 87 · Rückruf-Aushang',
    price: 20,
    desc: 'Interner Aushang zur Ausmusterung des gelben Straßen-Maskottchens.',
  },

  // VHS / CRT Shader Themes (mutually exclusive)
  {
    id: 'vhs_standard',
    slot: 'shader',
    name: 'Standard VHS (03:00 AM)',
    price: 0,
    defaultUnlocked: true,
    shaderCode: 0,
    desc: 'Kalte Leuchtstoffröhren, dezentes Chroma-Bleed und Magnetband-Rauschen.',
  },
  {
    id: 'vhs_camcorder98',
    slot: 'shader',
    name: '1998 Camcorder Green',
    price: 16,
    shaderCode: 1,
    desc: 'Phosphor-grüne Nachtsicht-Gradation wie auf alten Überwachungsbändern.',
  },
  {
    id: 'vhs_bleach',
    slot: 'shader',
    name: 'Bleach Bypass',
    price: 18,
    shaderCode: 2,
    desc: 'Entsättigter Silberhalogenid-Kontrast mit tiefschwarzen Schatten.',
  },
  {
    id: 'vhs_psx',
    slot: 'shader',
    name: 'PSX Dither (1997)',
    price: 24,
    shaderCode: 3,
    desc: 'Geordnetes 4×4-Hardware-Dithering und 15-Bit-Farbquantisierung.',
  },
];

export const COSMETIC_MAP = Object.fromEntries(COSMETIC_ITEMS.map((item) => [item.id, item]));

export const VHS_TAPES = [
  {
    id: 'tape1',
    code: 'BAND 01 · 03:14 AM',
    title: 'TAPE 01 · FLUR-KONTROLLE',
    sub: '12-Meter-Lieferflur · Akustischer Licht-Check am weißen Klebeband-X',
    unlockAfterNight: 1,
    rewardTips: 15,
    loreTitle: 'PROTOKOLL #01 — HINTEREINGANG',
    loreText: '„Nach Ladenschluss bleibt das Flurlicht aus, weil der Trafo brummt. Wenn Dosen über die nassen Fliesen schleifen: kurz blitzen, erst wenn es genau auf der weißen Markierung steht.“',
  },
  {
    id: 'tape2',
    code: 'BAND 02 · 04:08 AM',
    title: 'TAPE 02 · HINTERZIMMER-INVENTUR',
    sub: 'Edelstahltisch · 4 Kassetten-Testtöne, Klemmbrett-Protokoll & Tisch-Stroboskop',
    unlockAfterNight: 2,
    rewardTips: 20,
    loreTitle: 'PROTOKOLL #02 — DAS KOSTÜM AUS DEM LAGER',
    loreText: '„Wir haben den nassen gelben Anzug hinter den Gefriertruhen gefunden. Der Reißverschluss am Rücken klemmt von innen. Spiel die vier Prüftöne ab und schreib mit, ob sich der Kopf hebt.“',
  },
  {
    id: 'tape3',
    code: 'BAND 03 · 05:22 AM',
    title: 'TAPE 03 · KÜHLHAUS-SCHLUSSRUNDE',
    sub: '−18 °C Kühlzelle · 3 vereiste Relaiskästen hinter milchigen PVC-Streifen',
    unlockAfterNight: 3,
    rewardTips: 25,
    loreTitle: 'PROTOKOLL #03 — KÜHLZELLE NORD',
    loreText: '„Alle drei Abtau-Relais vereisen vor 5 Uhr. Wenn draußen jemand direkt vor den Plastiklamellen stehen bleibt: Werkzeug loslassen, Lampe aus, Luft anhalten. Die Folie hält niemanden auf.“',
  },
];

export const VHS_TAPE_MAP = Object.fromEntries(VHS_TAPES.map((t) => [t.id, t]));
