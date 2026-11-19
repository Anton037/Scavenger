export function randomFrom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export const BIOMES = [
  {
    id: 'nightmarket',
    name: 'Mitternachts-Imbiss',
    accent: 0xffb84d,
    floorGlazes: [0x384e63, 0x435978, 0x32524f, 0x484469, 0x574848],
    wallHex: 0x45547d,
    torchHex: 0xffca6a,
    waterHex: 0xc98a24,
    foamHex: 0xffe066,
    fogHex: 0x101322,
    ambientSky: 0xffe8cc,
    ambientGround: 0x383a5c,
    nightTint: [0.89, 0.88, 1.05],
  },
  {
    id: 'freezer',
    name: 'Kühlhof -18°C',
    accent: 0x73d7ff,
    floorGlazes: [0x2d5873, 0x376a8c, 0x2a616b, 0x3b5885, 0x416480],
    wallHex: 0x3a6187,
    torchHex: 0x82e0ff,
    waterHex: 0x3298c4,
    foamHex: 0xb6f4ff,
    fogHex: 0x0d1729,
    ambientSky: 0xd0f0ff,
    ambientGround: 0x243e5c,
    nightTint: [0.78, 0.94, 1.15],
  },
  {
    id: 'furnace',
    name: 'Grill-Arena',
    accent: 0xff6247,
    floorGlazes: [0x593645, 0x663f38, 0x483152, 0x61443a, 0x523040],
    wallHex: 0x5e384b,
    torchHex: 0xff8e57,
    waterHex: 0xd46224,
    foamHex: 0xffb84d,
    fogHex: 0x1c0d14,
    ambientSky: 0xffd7ba,
    ambientGround: 0x4d2a34,
    nightTint: [1.03, 0.84, 0.92],
  },
];

export const MUTATORS = {
  classic: {
    id: 'classic',
    name: 'Mitternachts-Andrang',
    hint: 'Klassische Imbiss-Wellen · voller Upgrade-Spaß',
    scoreMult: 1.0,
    spawnMult: 1.0,
    cdMult: 1.0,
    barrelExtra: 0,
    poolExtra: 0,
  },
  crates: {
    id: 'crates',
    name: 'Fass-Kirmes',
    hint: 'Extra viele Druckfässer & Beutekisten',
    scoreMult: 1.15,
    spawnMult: 1.08,
    cdMult: 1.0,
    barrelExtra: 5,
    poolExtra: 0,
  },
  slippery: {
    id: 'slippery',
    name: 'Fritteusen-Öl',
    hint: 'Mehr Rutsch-Pfützen · +40% Turbo-Slide',
    scoreMult: 1.15,
    spawnMult: 1.05,
    cdMult: 0.96,
    barrelExtra: 1,
    poolExtra: 4,
    slideMult: 1.4,
  },
  hyper_hauke: {
    id: 'hyper_hauke',
    name: 'Hauke-Rausch',
    hint: 'Schnellere Boss-Wellen · +35% XP & Aura',
    scoreMult: 1.35,
    spawnMult: 1.15,
    cdMult: 0.95,
    barrelExtra: 2,
    poolExtra: 0,
    bossInterval: 2,
  },
  tom_greed: {
    id: 'tom_greed',
    name: 'Zechpreller-Alarm',
    hint: 'Doppelt flinke Toms mit dicken XP-Piñatas',
    scoreMult: 1.25,
    spawnMult: 1.08,
    cdMult: 0.98,
    barrelExtra: 1,
    poolExtra: 0,
    extraTom: true,
  },
  brawler: {
    id: 'brawler',
    name: 'Turbo-Schicht',
    hint: '-20% Cooldowns auf alle Waffen & Skills',
    scoreMult: 1.2,
    spawnMult: 1.15,
    cdMult: 0.8,
    barrelExtra: 2,
    poolExtra: 1,
  },
};

export const LOADOUTS = {
  classic: {
    id: 'classic',
    name: 'Pfannen-Chef',
    tag: 'Gold-Pfanne · Krone · Allround',
    jacketHex: 0xd9383a,
    startWeapon: 'pan',
    maxHp: 100,
    speedMult: 1.02,
    dashCdMult: 1.0,
    bonkCdMult: 1.0,
    clappers: 3,
    magnetMult: 1.0,
    areaMult: 1.0,
  },
  runner: {
    id: 'runner',
    name: 'Spieß-Kurier',
    tag: 'Grillspieße · +16% Tempo · 5 Spezis',
    jacketHex: 0x1b8ca8,
    startWeapon: 'skewer',
    maxHp: 90,
    speedMult: 1.16,
    dashCdMult: 0.78,
    bonkCdMult: 0.95,
    clappers: 5,
    magnetMult: 1.15,
    areaMult: 0.96,
  },
  brawler: {
    id: 'brawler',
    name: 'Döner-Meister',
    tag: 'Döner-Orbit · 125 HP · +20% Radius',
    jacketHex: 0xc97b18,
    startWeapon: 'doner',
    maxHp: 125,
    speedMult: 0.98,
    dashCdMult: 1.05,
    bonkCdMult: 0.92,
    clappers: 3,
    magnetMult: 1.05,
    areaMult: 1.2,
  },
  knobi_chef: {
    id: 'knobi_chef',
    name: 'Knobi-Priester',
    tag: 'Knobi-Aura · +15% Radius · 4 Spezis',
    jacketHex: 0x1f8f5b,
    startWeapon: 'knobi',
    maxHp: 105,
    speedMult: 1.04,
    dashCdMult: 0.95,
    bonkCdMult: 0.96,
    clappers: 4,
    magnetMult: 1.1,
    areaMult: 1.15,
  },
};

export const UPGRADE_POOL = [
  {
    id: 'pan',
    kind: 'weapon',
    name: 'Gold-Pfanne',
    icon: 'pan',
    tint: 'gold',
    maxLevel: 5,
    descForLevel: (lv) => (
      lv === 1
        ? 'Schwingt automatisch eine fette Pfannen-Salve + verstärkt Schelle'
        : `Lv ${lv}: +Schaden, größerer Bogen & schnellere Pfannen-Schläge`
    ),
  },
  {
    id: 'skewer',
    kind: 'weapon',
    name: 'Grillspieß-Salve',
    icon: 'skewer',
    tint: 'vermilion',
    maxLevel: 5,
    descForLevel: (lv) => (
      lv === 1
        ? 'Feuert automatisch zielsuchende Grillspieße auf nahe Antons'
        : `Lv ${lv}: +1 Spieß pro Salve & höherer Durchschlag`
    ),
  },
  {
    id: 'doner',
    kind: 'weapon',
    name: 'Döner-Orbit',
    icon: 'doner',
    tint: 'gold',
    maxLevel: 5,
    descForLevel: (lv) => (
      lv === 1
        ? 'Heilige Mitternachts-Döner kreisen um Torge und häckseln Gegner'
        : `Lv ${lv}: +1 rotierender Döner, schneller & mehr Schaden`
    ),
  },
  {
    id: 'spezi',
    kind: 'weapon',
    name: 'Spezi-Granaten',
    icon: 'spezi',
    tint: 'vermilion',
    maxLevel: 5,
    descForLevel: (lv) => (
      lv === 1
        ? 'Wirft zischende Paulaner-Spezis ins Gewühl (Explosions-AoE!)'
        : `Lv ${lv}: Größerer Spreng-Radius, +Schaden & schnellerer Nachwurf`
    ),
  },
  {
    id: 'beam',
    kind: 'weapon',
    name: 'Blitz-Lampe',
    icon: 'lamp',
    tint: 'cyan',
    maxLevel: 5,
    descForLevel: (lv) => (
      lv === 1
        ? 'Zapped Gegner im Lichtkegel (oder rundum im Schatten-Boost)'
        : `Lv ${lv}: Häufigere Licht-Blitze, längerer Stun & +Schaden`
    ),
  },
  {
    id: 'can',
    kind: 'weapon',
    name: 'Billard-Pfand',
    icon: 'can',
    tint: 'jade',
    maxLevel: 5,
    descForLevel: (lv) => (
      lv === 1
        ? 'Schleudert abprallende Pfand-Dosen zwischen Wänden & Gegnern (+2 Spezis)'
        : `Lv ${lv}: Mehr Abpraller, mehr Dosen & Bonus-Geschwindigkeit (+2 Spezis)`
    ),
  },
  {
    id: 'knobi',
    kind: 'weapon',
    name: 'Knobi-Knaller',
    icon: 'knobi',
    tint: 'jade',
    maxLevel: 5,
    descForLevel: (lv) => (
      lv === 1
        ? 'Stinkende Knoblauch-Tzatziki-Aura hält Antons würgend auf Abstand'
        : `Lv ${lv}: Größere Stink-Wolke, stärkerer Rückstoß & schnellerer Takt`
    ),
  },
  {
    id: 'espresso',
    kind: 'passive',
    name: 'Dreifach-Espresso',
    icon: 'bolt',
    tint: 'cyan',
    maxLevel: 5,
    descForLevel: (lv) => `+10% Lauf-Tempo & +12% Feuerrate (Stufe ${lv})`,
  },
  {
    id: 'magnet',
    kind: 'passive',
    name: 'Pfand-Magnet',
    icon: 'magnet',
    tint: 'jade',
    maxLevel: 5,
    descForLevel: (lv) => `+38% Sammel-Radius & +18% mehr XP / Aura (Stufe ${lv})`,
  },
  {
    id: 'crown',
    kind: 'passive',
    name: 'Titan-Krone',
    icon: 'crown',
    tint: 'gold',
    maxLevel: 5,
    descForLevel: (lv) => `+25 Max-HP, heilt +35 HP & schnelleres Kronen-Schild (Stufe ${lv})`,
  },
  {
    id: 'chili',
    kind: 'passive',
    name: 'Scharfe Soße',
    icon: 'fire',
    tint: 'vermilion',
    maxLevel: 5,
    descForLevel: (lv) => `+22% Schaden auf alle Waffen & +12% Radius (Stufe ${lv})`,
  },
  {
    id: 'dash_mod',
    kind: 'passive',
    name: 'Turbo-Schlappen',
    icon: 'dash',
    tint: 'cyan',
    maxLevel: 5,
    descForLevel: (lv) => `-18% Dash-Cooldown & Schockwelle am Dash-Ziel (Stufe ${lv})`,
  },
];

export const EVOLUTIONS = [
  {
    id: 'evo_pan',
    weapon: 'pan',
    synergy: 'chili',
    name: 'SCHELLEN-INFERNO',
    icon: 'pan',
    tint: 'gold',
    desc: 'EVOLUTION (Pfanne + Scharfe Soße): 360° Feuer-Druckwelle & doppelter Rückstoß!',
  },
  {
    id: 'evo_doner',
    weapon: 'doner',
    synergy: 'knobi',
    name: 'KNOBI-DÖNER-TORNADO',
    icon: 'doner',
    tint: 'jade',
    desc: 'EVOLUTION (Döner + Knobi): 6 Turbo-Döner mit Mega-Radius häckseln alles weg!',
  },
  {
    id: 'evo_spezi',
    weapon: 'spezi',
    synergy: 'espresso',
    name: 'PAULANER-ARTILLERIE',
    icon: 'spezi',
    tint: 'vermilion',
    desc: 'EVOLUTION (Spezi + Espresso): 3er-Cluster-Spezis mit riesigem Sprudel-Bumms!',
  },
  {
    id: 'evo_skewer',
    weapon: 'skewer',
    synergy: 'magnet',
    name: 'SCHASCHLIK-GATLING',
    icon: 'skewer',
    tint: 'vermilion',
    desc: 'EVOLUTION (Spieße + Magnet): Dauerfeuer-Spieße prügeln extra Pfand-XP aus Gegnern!',
  },
  {
    id: 'evo_can',
    weapon: 'can',
    synergy: 'dash_mod',
    name: 'PFAND-FLIPPER 3000',
    icon: 'can',
    tint: 'cyan',
    desc: 'EVOLUTION (Billard + Schlappen): Riesen-Superdosen mit 8 Abprallern & Blitztempo!',
  },
  {
    id: 'evo_knobi',
    weapon: 'knobi',
    synergy: 'crown',
    name: 'TZATZIKI-SUPERGAU',
    icon: 'knobi',
    tint: 'jade',
    desc: 'EVOLUTION (Knobi + Krone): Mega-Tzatziki-Druckwelle panikt Antons & heilt Torge bei Multi-Hits!',
  },
  {
    id: 'evo_beam',
    weapon: 'beam',
    synergy: 'espresso',
    name: 'STROBO-FLUTLICHT 9000',
    icon: 'lamp',
    tint: 'cyan',
    desc: 'EVOLUTION (Lampe + Espresso): 360°-Imbiss-Strobo brutzelt & betäubt bis zu 14 Gegner blitzschnell!',
  },
];

export function getDailySeed(date = new Date()) {
  const y = date.getUTCFullYear() % 100;
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  return y * 10000 + m * 100 + d;
}

export function buildArena(seed = 2026, biomeStep = 1) {
  const rng = randomFrom(seed + biomeStep * 7919);
  const width = 28;
  const depth = 28;
  const biomeIndex = biomeStep > 1
    ? (biomeStep - 1) % BIOMES.length
    : (((seed - 2026) % BIOMES.length) + BIOMES.length) % BIOMES.length;
  const biome = BIOMES[biomeIndex];
  const mutatorKeys = Object.keys(MUTATORS);
  const mutator = biomeStep === 1 && rng() < 0.45
    ? MUTATORS.classic
    : MUTATORS[mutatorKeys[Math.floor(rng() * mutatorKeys.length)]];

  const cells = Array.from({ length: depth }, (_, z) => (
    Array.from({ length: width }, (__, x) => {
      if (x === 0 || z === 0 || x === width - 1 || z === depth - 1) return 0;
      const dx = Math.abs(x - 14);
      const dz = Math.abs(z - 14);
      if (dx <= 4 && dz <= 4) return 3;
      if ((x < 9 && z < 9) || (x > 18 && z > 18)) return 4;
      return 2;
    })
  ));

  const cx = 14;
  const cz = 14;
  const rooms = [
    { id: 0, name: 'Imbiss-Platz', x: 1, z: 1, w: 26, d: 26, cx, cz, glaze: biome.floorGlazes[0] },
    { id: 1, name: 'Nord-Grill', x: 5, z: 2, w: 18, d: 8, cx: 14, cz: 6, glaze: biome.floorGlazes[1] },
  ];

  // 4 geräumige Imbiss-Deckungen mit viel Laufraum für Horde-Kiting
  const blocks = [
    { x: 8.5, z: 8.5, w: 1.35, d: 1.35, kind: 'fridge' },
    { x: 19.5, z: 8.5, w: 1.35, d: 1.35, kind: 'fryer' },
    { x: 8.5, z: 19.5, w: 1.35, d: 1.35, kind: 'table' },
    { x: 19.5, z: 19.5, w: 1.35, d: 1.35, kind: 'crates_stack' },
  ];

  const vending = { x: 14, z: 2.35, cooldown: 0 };

  const fixtures = [
    { x: 2.3, z: 2.3, color: biome.torchHex, strength: 3.1 },
    { x: 25.7, z: 2.3, color: biome.torchHex, strength: 3.1 },
    { x: 2.3, z: 25.7, color: biome.torchHex, strength: 3.1 },
    { x: 25.7, z: 25.7, color: biome.torchHex, strength: 3.1 },
    { x: 12.6, z: 2.35, color: 0xffc857, strength: 3.2 },
    { x: 15.4, z: 2.35, color: 0xffc857, strength: 3.2 },
    { x: 14, z: 25.7, color: biome.accent, strength: 3.0 },
    { x: 2.3, z: 14, color: biome.accent, strength: 3.0 },
    { x: 25.7, z: 14, color: biome.accent, strength: 3.0 },
  ];

  const pools = [];
  const basePools = 3 + (mutator.poolExtra || 0);
  const poolSpots = [
    [14, 9.2], [9.2, 14], [18.8, 14], [14, 18.8],
    [5.2, 14], [22.8, 14], [14, 5.2], [14, 22.8],
  ];
  for (let i = 0; i < Math.min(basePools, poolSpots.length); i++) {
    const [px, pz] = poolSpots[(i + Math.floor(rng() * 3)) % poolSpots.length];
    if (pools.some((p) => Math.hypot(p.x - px, p.z - pz) < 2.2)) continue;
    pools.push({ x: px, z: pz, w: 2.5, d: 2.2 });
  }

  const clearOfStatic = (x, z, pad = 1.2) => {
    if (x < 2.2 || z < 2.2 || x > width - 2.2 || z > depth - 2.2) return false;
    if (Math.hypot(x - cx, z - cz) < 2.8) return false;
    if (Math.hypot(x - vending.x, z - vending.z) < 1.8) return false;
    for (const b of blocks) {
      if (Math.abs(x - b.x) < b.w * 0.5 + pad && Math.abs(z - b.z) < b.d * 0.5 + pad) return false;
    }
    return true;
  };

  const crates = [];
  const barrels = [];
  const crateCount = 6 + (mutator.barrelExtra ? 2 : 0);
  const barrelCount = 6 + (mutator.barrelExtra || 0);

  for (let i = 0; i < crateCount * 4 && crates.length < crateCount; i++) {
    const x = 3 + rng() * (width - 6);
    const z = 3 + rng() * (depth - 6);
    if (!clearOfStatic(x, z, 1.0)) continue;
    if (crates.some((c) => Math.hypot(c.x - x, c.z - z) < 2.5)) continue;
    crates.push({ x, z, broken: false, gold: crates.length === 0 });
  }

  for (let i = 0; i < barrelCount * 4 && barrels.length < barrelCount; i++) {
    const x = 3.2 + rng() * (width - 6.4);
    const z = 3.2 + rng() * (depth - 6.4);
    if (!clearOfStatic(x, z, 1.0)) continue;
    if (crates.some((c) => Math.hypot(c.x - x, c.z - z) < 1.8)) continue;
    if (barrels.some((b) => Math.hypot(b.x - x, b.z - z) < 2.8)) continue;
    barrels.push({ x, z, exploded: false, fuse: 0 });
  }

  const cell = (x, z) => {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    if (ix < 0 || iz < 0 || ix >= width || iz >= depth) return 0;
    return cells[iz][ix];
  };

  const walkable = (x, z, radius = 0.25, tempObstacles = null) => {
    if (x - radius < 1.04 || z - radius < 1.04 || x + radius > width - 1.04 || z + radius > depth - 1.04) {
      return false;
    }
    for (const b of blocks) {
      if (Math.abs(x - b.x) < b.w * 0.5 + radius && Math.abs(z - b.z) < b.d * 0.5 + radius) return false;
    }
    if (Math.abs(x - vending.x) < 0.78 + radius && Math.abs(z - vending.z) < 0.52 + radius) return false;
    if (tempObstacles) {
      for (const c of tempObstacles.crates ?? []) {
        if (!c.broken && Math.abs(x - c.x) < 0.32 + radius && Math.abs(z - c.z) < 0.32 + radius) return false;
      }
      for (const b of tempObstacles.barrels ?? []) {
        if (!b.exploded && Math.hypot(x - b.x, z - b.z) < 0.3 + radius) return false;
      }
    }
    return true;
  };

  const clearPath = (a, b, radius = 0.14) => {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.05) return true;
    const steps = Math.ceil(dist / 0.35);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = a.x + dx * t;
      const pz = a.z + dz * t;
      for (const blk of blocks) {
        if (Math.abs(px - blk.x) < blk.w * 0.5 + radius && Math.abs(pz - blk.z) < blk.d * 0.5 + radius) {
          return false;
        }
      }
    }
    return true;
  };

  const roomAt = (x, z) => {
    if (Math.hypot(x - cx, z - cz) < 5.5) return 'Imbiss-Mitte';
    if (z < 7) return 'Nord-Grill';
    if (z > 21) return 'Süd-Pfandhof';
    if (x < 7) return 'West-Kühlhof';
    if (x > 21) return 'Ost-Terrasse';
    return biome.name;
  };

  return {
    seed,
    floor: biomeStep,
    biome,
    mutator,
    width,
    depth,
    cells,
    rooms,
    blocks,
    pools,
    fixtures,
    vending,
    crates,
    barrels,
    records: [],
    valves: [],
    cans: [],
    lift: { x: cx, z: cz },
    start: { x: cx, z: cz },
    cell,
    walkable,
    clearPath,
    roomAt,
  };
}

export const buildDungeon = buildArena;
