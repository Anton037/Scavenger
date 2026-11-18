export function randomFrom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export const BIOMES = [
  {
    id: 'cellar',
    name: 'Keller-Trakt',
    accent: 0xffb84d,
    floorGlazes: [0x2a3d4a, 0x344663, 0x263d39, 0x3b3552, 0x473836],
    wallHex: 0x354063,
    torchHex: 0xe5b878,
    waterHex: 0x1f6e7a,
    fogHex: 0x0b0c14,
  },
  {
    id: 'freezer',
    name: 'Kühlhaus -18°C',
    accent: 0x73d7ff,
    floorGlazes: [0x204459, 0x2a546e, 0x1e4b52, 0x2c4268, 0x324b63],
    wallHex: 0x294866,
    torchHex: 0x73d7ff,
    waterHex: 0x2987a8,
    fogHex: 0x08101c,
  },
  {
    id: 'furnace',
    name: 'Heiz-Bunker',
    accent: 0xff5744,
    floorGlazes: [0x472934, 0x52312a, 0x36243d, 0x4d342b, 0x3e222f],
    wallHex: 0x472939,
    torchHex: 0xff7b4d,
    waterHex: 0x255e68,
    fogHex: 0x14080d,
  },
];

export const MUTATORS = {
  classic: {
    id: 'classic',
    name: 'Normale Schicht',
    hint: 'Klassische Keller-Regeln',
    auraMult: 1.0,
  },
  slippery: {
    id: 'slippery',
    name: 'Spiegelglatt',
    hint: 'Extra Pfützen & +45% Rutsch-Tempo',
    auraMult: 1.15,
    extraPools: 4,
    slideMult: 1.35,
  },
  crates: {
    id: 'crates',
    name: 'Kisten-Rausch',
    hint: 'Doppelt so viele Loot-Kisten & Fässer',
    auraMult: 1.1,
    extraCrates: 6,
    extraBarrels: 2,
  },
  hyper_hauke: {
    id: 'hyper_hauke',
    name: 'Vollgas-Hauke',
    hint: 'Hauke rammt häufiger · +40% Aura',
    auraMult: 1.4,
    haukeChargeScale: 0.72,
  },
  tom_greed: {
    id: 'tom_greed',
    name: 'Schnorrer-Alarm',
    hint: 'Flinker Tom · Extra Dosen-Beute',
    auraMult: 1.25,
    tomSpeedScale: 1.22,
    extraCans: 4,
  },
  blackout: {
    id: 'blackout',
    name: 'Stromausfall',
    hint: 'Kaum Wandfackeln · +40% Aura auf alles',
    auraMult: 1.4,
    dimTorches: true,
  },
  brawler: {
    id: 'brawler',
    name: 'Pfannen-Fieber',
    hint: 'Schnellere Schelle & mehr Druckfässer',
    auraMult: 1.15,
    bonkCdMult: 0.76,
    extraBarrels: 3,
  },
};

export const LOADOUTS = {
  classic: {
    id: 'classic',
    name: 'Klassik',
    tag: 'Krone · 2 Dosen · Allround',
    speedMult: 1.0,
    novaRadius: 2.25,
    clappers: 2,
    bonkCdMult: 1.0,
    dashCdMult: 1.0,
  },
  runner: {
    id: 'runner',
    name: 'Pfand-Jäger',
    tag: '+16% Tempo · 4 Dosen · Flinker Dash',
    speedMult: 1.16,
    novaRadius: 2.05,
    clappers: 4,
    bonkCdMult: 1.0,
    dashCdMult: 0.82,
  },
  brawler: {
    id: 'brawler',
    name: 'Schwergewicht',
    tag: '+38% Pfannen-Radius · Mehr Stun',
    speedMult: 0.96,
    novaRadius: 3.1,
    clappers: 1,
    bonkCdMult: 0.85,
    dashCdMult: 1.05,
  },
};

export const MOD_POOL = [
  { id: 'fire_pan', name: 'Flammende Pfanne', desc: 'Schellen verbrennen Gegner (DoT + Tempo-Slow)', tint: 'vermilion' },
  { id: 'twin_dash', name: 'Turbo-Kettendash', desc: '-35% Dash-Cooldown & längerer Gleit-Impuls', tint: 'cyan' },
  { id: 'shock_pan', name: 'Schock-Schelle', desc: '+45% Pfannen-Reichweite & starker Rückstoß', tint: 'gold' },
  { id: 'searchlight', name: 'Flutlicht-Brenner', desc: '+20% Tempo · Taschenlampe blendet Anton länger', tint: 'cyan' },
  { id: 'pfand_magnet', name: 'Pfand-Recycling', desc: '+3 Dosen sofort · Dose werfen oft gratis', tint: 'jade' },
  { id: 'espresso', name: 'Dreifach-Espresso', desc: '+25% Grundtempo · Pfützen geben 4s Turbo', tint: 'jade' },
  { id: 'titan_crown', name: 'Titan-Krone', desc: 'Krone repariert · Doppelte Schutzzeit nach Treffer', tint: 'gold' },
];

const ROOM_NAMES = [
  'Fliesentisch-Lounge',
  'Spezi-Kammer',
  'Döner-Eck',
  'Antons Lost-Zone',
  'Haukes Masse-Keller',
  'Kühlraum -18°C',
  'Pfand-Tresor',
  'Späti-Lager',
  'Party-Bunker',
];

const RELIC_TEMPLATES = [
  {
    id: 'log',
    name: 'Goldene Chef-Krone',
    shortName: 'Chef-Krone',
    perk: '+45% Schellen-Radius',
    color: 0xffb84d,
    discovery: 'Chef-Krone geborgen — Schellen-Radius +45%!',
  },
  {
    id: 'cylinder',
    name: 'Paulaner Spezi',
    shortName: 'Paulaner Spezi',
    perk: '+20% Lauftempo',
    color: 0xff8c24,
    discovery: 'Eiskalte Spezi geext — +20% Tempo!',
  },
  {
    id: 'spool',
    name: 'Mitternachts-Döner',
    shortName: 'Mitternachts-Döner',
    perk: '+2 Dosen & Krone',
    color: 0xb85cff,
    discovery: 'Mitternachts-Döner gesichert — +2 Dosen & Krone!',
  },
  {
    id: 'skewer',
    name: 'Goldener Grillspieß',
    shortName: 'Grillspieß',
    perk: '+3.000 ⚡ & 2× Combo',
    color: 0x38f2af,
    discovery: 'Goldener Grillspieß erbeutet — Massiver Aura-Schub!',
  },
];

function rectDistanceSquared(x, z, left, top, right, bottom) {
  const gapX = Math.max(left - x, x - right, 0);
  const gapZ = Math.max(top - z, z - bottom, 0);
  return gapX * gapX + gapZ * gapZ;
}

function shuffled(arr, rng) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildDungeon(seed = 2026, floor = 1) {
  const rng = randomFrom((seed >>> 0) ^ (floor * 0x9e3779b1));
  const width = 39;
  const depth = 35;

  const biome = BIOMES[(floor - 1) % BIOMES.length];
  const mutatorKeys = Object.keys(MUTATORS);
  const pickedMutatorKey = floor === 1 && rng() < 0.28
    ? 'classic'
    : mutatorKeys[1 + Math.floor(rng() * (mutatorKeys.length - 1))];
  const mutator = MUTATORS[pickedMutatorKey];

  // 3x3 Sektor-Layout: Mitte (1,1) und Aufzug (1,2) sind immer aktiv, plus 4-6 zufällige Seitenräume
  const optionalSectors = shuffled(
    [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
    rng,
  );
  const extraCount = Math.min(7, (floor >= 3 ? 5 : 4) + Math.floor(rng() * 2));
  const activeSet = new Set(['1,1', '1,2']);
  const sectorCoords = [[1, 2], [1, 1]];
  for (let i = 0; i < optionalSectors.length && sectorCoords.length < 2 + extraCount; i++) {
    const [sc, sr] = optionalSectors[i];
    // Stelle sicher, dass neuer Sektor an mindestens einen vorhandenen Nachbarn grenzt
    const hasNeighbor = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(
      ([dc, dr]) => activeSet.has(`${sc + dc},${sr + dr}`),
    );
    if (hasNeighbor) {
      activeSet.add(`${sc},${sr}`);
      sectorCoords.push([sc, sr]);
    } else {
      optionalSectors.push([sc, sr]); // später nochmals prüfen sobald Zwischensektor aktiv ist
    }
  }

  const sectorToRoom = new Map();
  const namesPool = shuffled(ROOM_NAMES, rng);
  const rooms = sectorCoords.map(([sc, sr], index) => {
    const baseX = 2 + sc * 12;
    const baseZ = 2 + sr * 11;
    const isLiftRoom = sc === 1 && sr === 2;
    const isCenter = sc === 1 && sr === 1;
    const w = isCenter ? 9 + Math.floor(rng() * 2) : isLiftRoom ? 8 + Math.floor(rng() * 2) : 6 + Math.floor(rng() * 4);
    const d = isCenter ? 8 + Math.floor(rng() * 2) : isLiftRoom ? 7 + Math.floor(rng() * 2) : 6 + Math.floor(rng() * 3);
    const maxJitterX = Math.max(0, 11 - w);
    const maxJitterZ = Math.max(0, 10 - d);
    const x = baseX + Math.floor(rng() * (maxJitterX + 1));
    const z = baseZ + Math.floor(rng() * (maxJitterZ + 1));
    const id = isLiftRoom ? 'landing' : isCenter ? 'hall' : `wing_${sc}_${sr}`;
    const name = isLiftRoom ? 'Aufzugsschacht' : isCenter ? 'Zentral-Halle' : namesPool[(index - 2) % namesPool.length];
    const glaze = biome.floorGlazes[(index + Math.floor(rng() * 2)) % biome.floorGlazes.length];
    const room = { id, name, x, z, w, d, glaze, sc, sr, cx: x + w * 0.5, cz: z + d * 0.5 };
    sectorToRoom.set(`${sc},${sr}`, room);
    return room;
  });

  // Verbindungsgraph (Spanning Tree + Schleifen gegen Sackgassen)
  const edgePairs = [];
  for (const r of rooms) {
    for (const [dc, dr] of [[1, 0], [0, 1]]) {
      const nb = sectorToRoom.get(`${r.sc + dc},${r.sr + dr}`);
      if (nb) edgePairs.push([r, nb]);
    }
  }
  const treeParent = new Map(rooms.map((r) => [r, r]));
  const findRoot = (r) => (treeParent.get(r) === r ? r : findRoot(treeParent.get(r)));
  const selectedEdges = [];
  const unusedEdges = [];
  for (const [a, b] of shuffled(edgePairs, rng)) {
    const ra = findRoot(a);
    const rb = findRoot(b);
    if (ra !== rb) {
      treeParent.set(ra, rb);
      selectedEdges.push([a, b]);
    } else {
      unusedEdges.push([a, b]);
    }
  }
  // 2–3 extra Loop-Verbindungen
  const loopTarget = Math.min(unusedEdges.length, 2 + Math.floor(rng() * 2));
  for (let i = 0; i < loopTarget; i++) selectedEdges.push(unusedEdges[i]);

  const cells = new Uint8Array(width * depth);
  const passages = [];
  const doorClearances = [];

  const carveRect = (rx, rz, rw, rd, val) => {
    const x0 = Math.max(1, Math.min(width - 2, rx));
    const z0 = Math.max(1, Math.min(depth - 2, rz));
    const x1 = Math.max(x0 + 1, Math.min(width - 1, rx + rw));
    const z1 = Math.max(z0 + 1, Math.min(depth - 1, rz + rd));
    for (let row = z0; row < z1; row++) {
      for (let col = x0; col < x1; col++) {
        if (val > 1 || cells[row * width + col] === 0) {
          cells[row * width + col] = val;
        }
      }
    }
  };

  for (const [a, b] of selectedEdges) {
    const corWidth = 3;
    if (a.sr === b.sr) {
      const left = a.x < b.x ? a : b;
      const right = a.x < b.x ? b : a;
      const minOverlapZ = Math.max(left.z + 1, right.z + 1);
      const maxOverlapZ = Math.min(left.z + left.d - corWidth - 1, right.z + right.d - corWidth - 1);
      const cz = maxOverlapZ >= minOverlapZ
        ? minOverlapZ + Math.floor(rng() * (maxOverlapZ - minOverlapZ + 1))
        : Math.round((left.cz + right.cz) * 0.5 - 1);
      const px = left.x + left.w - 1;
      const pw = right.x - px + 2;
      carveRect(px, cz, pw, corWidth, 1);
      passages.push([px, cz, pw, corWidth]);
      doorClearances.push({ x: left.x + left.w - 0.5, z: cz + corWidth * 0.5, r: 1.7 });
      doorClearances.push({ x: right.x + 0.5, z: cz + corWidth * 0.5, r: 1.7 });
    } else {
      const top = a.z < b.z ? a : b;
      const bot = a.z < b.z ? b : a;
      const minOverlapX = Math.max(top.x + 1, bot.x + 1);
      const maxOverlapX = Math.min(top.x + top.w - corWidth - 1, bot.x + bot.w - corWidth - 1);
      const cx = maxOverlapX >= minOverlapX
        ? minOverlapX + Math.floor(rng() * (maxOverlapX - minOverlapX + 1))
        : Math.round((top.cx + bot.cx) * 0.5 - 1);
      const pz = top.z + top.d - 1;
      const pd = bot.z - pz + 2;
      carveRect(cx, pz, corWidth, pd, 1);
      passages.push([cx, pz, corWidth, pd]);
      doorClearances.push({ x: cx + corWidth * 0.5, z: top.z + top.d - 0.5, r: 1.7 });
      doorClearances.push({ x: cx + corWidth * 0.5, z: bot.z + 0.5, r: 1.7 });
    }
  }

  for (const [index, room] of rooms.entries()) {
    carveRect(room.x, room.z, room.w, room.d, index + 2);
  }

  const landingRoom = rooms[0];
  const centerRoom = rooms[1];
  const lift = { x: landingRoom.x + landingRoom.w * 0.5, z: landingRoom.z + landingRoom.d - 1.9 };
  const spawn = { x: landingRoom.x + landingRoom.w * 0.5, z: Math.max(landingRoom.z + 1.5, lift.z - 2.6) };

  const blocks = [];
  const pools = [];
  const fixtures = [];
  const crates = [];
  const barrels = [];
  const cans = [];
  const reserved = [
    { x: lift.x, z: lift.z, r: 2.2 },
    { x: spawn.x, z: spawn.z, r: 1.7 },
    { x: centerRoom.cx, z: centerRoom.cz, r: 1.65 },
    ...doorClearances,
  ];

  const cell = (x, z) => {
    if (x < 0 || z < 0 || x >= width || z >= depth) return 0;
    return cells[z * width + x];
  };

  const roomAt = (x, z) => rooms[cell(Math.floor(x), Math.floor(z)) - 2]?.name ?? 'Sektor-Korridor';

  const freeSpace = (x, z, radius = 0.25, extraSolids = true) => {
    if (!cell(Math.floor(x), Math.floor(z))) return false;
    const limit = radius * radius;
    for (let row = Math.floor(z - radius); row <= Math.floor(z + radius); row++) {
      for (let column = Math.floor(x - radius); column <= Math.floor(x + radius); column++) {
        if (!cell(column, row) && rectDistanceSquared(x, z, column, row, column + 1, row + 1) < limit) {
          return false;
        }
      }
    }
    if (blocks.some((b) => rectDistanceSquared(x, z, b.x - b.w / 2, b.z - b.d / 2, b.x + b.w / 2, b.z + b.d / 2) <= limit)) {
      return false;
    }
    if (extraSolids) {
      if (crates.some((c) => !c.broken && rectDistanceSquared(x, z, c.x - 0.36, c.z - 0.36, c.x + 0.36, c.z + 0.36) <= limit)) {
        return false;
      }
      if (barrels.some((b) => !b.exploded && Math.hypot(x - b.x, z - b.z) <= radius + 0.34)) {
        return false;
      }
    }
    return true;
  };

  const canPlaceSpot = (x, z, minClear = 1.25) => {
    if (!freeSpace(x, z, 0.48, true)) return false;
    return reserved.every((item) => Math.hypot(item.x - x, item.z - z) >= item.r + minClear);
  };

  const findRoomSpot = (room, minClear = 1.0, attempts = 25) => {
    for (let attempt = 0; attempt < attempts; attempt++) {
      const tx = room.x + 1.3 + rng() * Math.max(0.4, room.w - 2.6);
      const tz = room.z + 1.3 + rng() * Math.max(0.4, room.d - 2.6);
      if (canPlaceSpot(tx, tz, minClear)) return { x: tx, z: tz };
    }
    for (let dz = 1; dz < room.d - 1; dz++) {
      for (let dx = 1; dx < room.w - 1; dx++) {
        const px = room.x + dx + 0.5;
        const pz = room.z + dz + 0.5;
        if (freeSpace(px, pz, 0.38, true)) return { x: px, z: pz };
      }
    }
    return { x: room.cx, z: room.cz };
  };

  // Fackeln in Ecken jedes Raums (gedimmt bei Stromausfall)
  for (const [idx, room] of rooms.entries()) {
    const torchStrength = mutator.dimTorches ? 10 : idx % 2 === 0 ? 25 : 22;
    const corners = idx % 2 === 0
      ? [[room.x + 0.85, room.z + 0.85], [room.x + room.w - 0.85, room.z + room.d - 0.85]]
      : [[room.x + room.w - 0.85, room.z + 0.85], [room.x + 0.85, room.z + room.d - 0.85]];
    for (const [fx, fz] of corners) {
      if (!mutator.dimTorches || idx < 2) {
        fixtures.push({ x: fx, z: fz, color: biome.torchHex, strength: torchStrength });
      }
    }
  }

  // Zufällige Deko-Blöcke / Maschinen / Säulen in Innenräumen
  const blockKinds = ['pump', 'coil', 'turbine', 'shelves', 'crates'];
  for (const [idx, room] of rooms.entries()) {
    const count = idx === 1 ? 2 : idx === 0 ? 1 : (room.w >= 8 || room.d >= 8 ? 2 : 1);
    for (let k = 0; k < count; k++) {
      for (let attempt = 0; attempt < 18; attempt++) {
        const px = room.x + 1.4 + rng() * Math.max(0.5, room.w - 2.8);
        const pz = room.z + 1.4 + rng() * Math.max(0.5, room.d - 2.8);
        const kind = blockKinds[Math.floor(rng() * blockKinds.length)];
        const w = kind === 'turbine' ? 2.1 : kind === 'pump' ? 1.45 : 1.15;
        const d = kind === 'shelves' ? 1.85 : 1.25;
        if (canPlaceSpot(px, pz, 1.35)) {
          blocks.push({ x: px, z: pz, w, d, kind });
          reserved.push({ x: px, z: pz, r: Math.max(w, d) * 0.65 });
          break;
        }
      }
    }
  }

  // BFS Routen-Precompute über statische Architektur (BLOCKS)
  const routeCells = new Uint8Array(width * depth);
  const rebuildRouteMask = () => {
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) routeCells[z * width + x] = freeSpace(x + 0.5, z + 0.5, 0.28, false);
    }
  };
  rebuildRouteMask();

  // Relikte verteilen (auf Flügelräume abseits des Aufzugs)
  const wingRooms = shuffled(rooms.slice(2), rng);
  const relicCount = floor >= 3 ? 4 : 3;
  const records = [];
  for (let i = 0; i < relicCount; i++) {
    const room = wingRooms[i % wingRooms.length] ?? centerRoom;
    const { x: rx, z: rz } = findRoomSpot(room, 1.0, 25);
    const tpl = RELIC_TEMPLATES[i];
    records.push({ ...tpl, room: room.name, x: rx, z: rz });
    reserved.push({ x: rx, z: rz, r: 1.35 });
  }

  // Späti-Automat in Zentral-Halle oder Flügelraum
  const vendingRoom = wingRooms[3] ?? centerRoom;
  const { x: vx, z: vz } = findRoomSpot(vendingRoom, 1.0, 24);
  const vending = { x: vx, z: vz, name: 'Späti-Automat (Booster & Pfand-Dosen)' };
  reserved.push({ x: vx, z: vz, r: 1.25 });

  // Dampf-Ventile (3 Stück)
  const valves = [];
  const valveNames = ['Überdruck-Ventil', 'Heizungs-Ventil', 'Kühlgas-Ventil'];
  for (let i = 0; i < 3; i++) {
    const room = rooms[1 + ((i * 2) % Math.max(1, rooms.length - 1))];
    const { x: lx, z: lz } = findRoomSpot(room, 0.9, 22);
    valves.push({ id: `v${i + 1}`, name: `${valveNames[i]} (Zünden)`, x: lx, z: lz });
    reserved.push({ x: lx, z: lz, r: 1.0 });
  }

  // Wasser-Pfützen gleichmäßig auf Räume verteilen (mehr im Kühlhaus oder Spiegelglatt-Mutator)
  const poolCount = 5 + (biome.id === 'freezer' ? 3 : 0) + (mutator.extraPools ?? 0);
  for (let i = 0; i < poolCount; i++) {
    const room = rooms[1 + (i % Math.max(1, rooms.length - 1))];
    const px = room.x + 1.6 + rng() * Math.max(0.4, room.w - 3.2);
    const pz = room.z + 1.6 + rng() * Math.max(0.4, room.d - 3.2);
    pools.push({
      x: px,
      z: pz,
      w: 2.6 + rng() * 1.8,
      d: 2.1 + rng() * 1.6,
    });
  }

  const doorAndObjectiveKeepout = [
    { x: lift.x, z: lift.z, r: 2.1 },
    { x: spawn.x, z: spawn.z, r: 1.6 },
    { x: centerRoom.cx, z: centerRoom.cz, r: 1.25 },
    ...doorClearances.map((d) => ({ ...d, r: 1.45 })),
    ...records.map((r) => ({ x: r.x, z: r.z, r: 1.2 })),
    { x: vending.x, z: vending.z, r: 1.1 },
    ...valves.map((v) => ({ x: v.x, z: v.z, r: 1.0 })),
  ];

  const canPlaceProp = (x, z, wallRadius = 0.36, crateGap = 0.92, barrelGap = 1.2) => {
    if (!freeSpace(x, z, wallRadius, false)) return false;
    if (doorAndObjectiveKeepout.some((k) => Math.hypot(k.x - x, k.z - z) < k.r)) return false;
    if (crates.some((c) => Math.hypot(c.x - x, c.z - z) < crateGap)) return false;
    if (barrels.some((b) => Math.hypot(b.x - x, b.z - z) < barrelGap)) return false;
    return true;
  };

  // Zerstörbare Loot-Kisten (Crates) & Explosive Druckfässer (Barrels)
  const propRooms = rooms.filter((r, i) => i > 0);
  const crateTarget = 6 + (mutator.extraCrates ?? 0);
  for (let i = 0; i < crateTarget; i++) {
    let placed = false;
    for (let tryRoom = 0; tryRoom < propRooms.length && !placed; tryRoom++) {
      const room = propRooms[(i + tryRoom) % propRooms.length];
      for (let attempt = 0; attempt < 24; attempt++) {
        const cx = room.x + 1.0 + rng() * Math.max(0.4, room.w - 2.0);
        const cz = room.z + 1.0 + rng() * Math.max(0.4, room.d - 2.0);
        if (canPlaceProp(cx, cz, 0.38, 0.9, 1.1)) {
          crates.push({ id: `cr_${i}`, x: cx, z: cz, broken: false, gold: i === 0 });
          placed = true;
          break;
        }
      }
    }
  }

  const barrelTarget = 3 + (mutator.extraBarrels ?? 0);
  for (let i = 0; i < barrelTarget; i++) {
    let placed = false;
    for (let tryRoom = 0; tryRoom < propRooms.length && !placed; tryRoom++) {
      const room = propRooms[(i + 1 + tryRoom) % propRooms.length];
      for (let attempt = 0; attempt < 24; attempt++) {
        const bx = room.x + 1.1 + rng() * Math.max(0.4, room.w - 2.2);
        const bz = room.z + 1.1 + rng() * Math.max(0.4, room.d - 2.2);
        if (canPlaceProp(bx, bz, 0.4, 1.05, 1.35)) {
          barrels.push({ id: `br_${i}`, x: bx, z: bz, exploded: false, fuse: 0 });
          placed = true;
          break;
        }
      }
    }
  }

  // Goldene Pfand-Dosen entlang der Flure & Räume
  const canTarget = 10 + (mutator.extraCans ?? 0);
  for (let i = 0; i < canTarget; i++) {
    const room = rooms[i % rooms.length];
    for (let attempt = 0; attempt < 18; attempt++) {
      const cx = room.x + 1.0 + rng() * Math.max(0.4, room.w - 2.0);
      const cz = room.z + 1.0 + rng() * Math.max(0.4, room.d - 2.0);
      if (freeSpace(cx, cz, 0.32, true) && Math.hypot(cx - spawn.x, cz - spawn.z) > 1.4) {
        cans.push({ id: i + 1, x: cx, z: cz, collected: false });
        break;
      }
    }
  }

  // Patrouillen-Wegpunkte (garantiert laufbare Punkte in allen Räumen)
  const roomSpot = (room) => {
    for (let attempt = 0; attempt < 24; attempt++) {
      const px = room.x + 1.2 + rng() * Math.max(0.4, room.w - 2.4);
      const pz = room.z + 1.2 + rng() * Math.max(0.4, room.d - 2.4);
      if (freeSpace(px, pz, 0.32, true)) return { x: px, z: pz };
    }
    for (let dz = 1; dz < room.d - 1; dz++) {
      for (let dx = 1; dx < room.w - 1; dx++) {
        const px = room.x + dx + 0.5;
        const pz = room.z + dz + 0.5;
        if (freeSpace(px, pz, 0.28, false)) return { x: px, z: pz };
      }
    }
    return { x: room.cx, z: room.cz };
  };

  const farRooms = rooms.filter((r) => r !== landingRoom && Math.hypot(r.cx - spawn.x, r.cz - spawn.z) > 7.5);
  const patrolPool = (farRooms.length >= 3 ? farRooms : rooms.slice(1)).map(roomSpot);
  const patrol = patrolPool.slice(0, Math.min(8, patrolPool.length));
  const patrolHauke = shuffled(patrolPool, rng).slice(0, Math.min(4, patrolPool.length));
  const patrolTom = shuffled(rooms.slice(1).map(roomSpot), rng).slice(0, Math.min(5, rooms.length - 1));

  // Startpunkte der Gegner weit genug vom Spawn entfernt!
  const pickFar = (candidates, fallbackRoom) => (
    candidates.find((p) => Math.hypot(p.x - spawn.x, p.z - spawn.z) > 8.5)
    ?? roomSpot(fallbackRoom)
  );
  const startListener = pickFar(patrol, wingRooms[0] ?? centerRoom);
  const startHauke = pickFar(shuffled(patrolHauke, rng), wingRooms[1] ?? centerRoom);
  const startTom = roomSpot(centerRoom);

  const wetAt = (x, z) => pools.some((pool) => {
    const rx = (x - pool.x) / (pool.w * 0.5);
    const rz = (z - pool.z) / (pool.d * 0.5);
    return rx * rx + rz * rz < 0.94;
  });

  const walkable = (x, z, radius = 0.25) => freeSpace(x, z, radius, true);

  const clearPath = (from, to, radius = 0.035, ignoreTempObstacles = false) => {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const steps = Math.ceil(Math.hypot(dx, dz) * 5);
    for (let step = 1; step <= steps; step++) {
      const fraction = step / steps;
      if (!freeSpace(from.x + dx * fraction, from.z + dz * fraction, radius, !ignoreTempObstacles)) return false;
    }
    return true;
  };

  const nearestCell = (point) => {
    const cx = Math.floor(point.x);
    const cz = Math.floor(point.z);
    let best = -1;
    let nearest = Infinity;
    for (let z = Math.max(0, cz - 2); z <= Math.min(depth - 1, cz + 2); z++) {
      for (let x = Math.max(0, cx - 2); x <= Math.min(width - 1, cx + 2); x++) {
        const index = z * width + x;
        const dist = (point.x - x - 0.5) ** 2 + (point.z - z - 0.5) ** 2;
        if (routeCells[index] && dist < nearest) {
          best = index;
          nearest = dist;
        }
      }
    }
    return best;
  };

  const neighbors = [-1, 1, -width, width];
  const route = (from, to) => {
    if (clearPath(from, to, 0.26, true)) return [to];
    const start = nearestCell(from);
    const end = nearestCell(to);
    if (start < 0 || end < 0) return [];
    const parents = new Int16Array(cells.length).fill(-1);
    const queue = new Int16Array(cells.length);
    let head = 0;
    let tail = 1;
    queue[0] = start;
    parents[start] = start;
    while (head < tail && parents[end] === -1) {
      const index = queue[head++];
      for (const delta of neighbors) {
        const next = index + delta;
        if (next >= 0 && next < cells.length && routeCells[next] && parents[next] === -1) {
          parents[next] = index;
          queue[tail++] = next;
        }
      }
    }
    if (parents[end] === -1) return [];
    const path = [];
    for (let index = end; index !== start; index = parents[index]) {
      path.push({ x: (index % width) + 0.5, z: Math.floor(index / width) + 0.5 });
    }
    path.reverse();
    path.push(to);
    return path;
  };

  // Sicherheits-Check: keine temporäre Kiste/Fass darf einen Relikt- oder Lift-Weg blockieren
  for (const list of [barrels, crates]) {
    for (let i = list.length - 1; i >= 0; i--) {
      const item = list[i];
      if (!freeSpace(item.x, item.z, 0.05, false)) list.splice(i, 1);
    }
  }

  return {
    seed,
    floor,
    biome,
    mutator,
    width,
    depth,
    cells,
    rooms,
    passages,
    blocks,
    pools,
    fixtures,
    records,
    vending,
    valves,
    crates,
    barrels,
    cans,
    lift,
    spawn,
    patrol,
    patrolHauke,
    patrolTom,
    startListener,
    startHauke,
    startTom,
    cell,
    roomAt,
    walkable,
    wetAt,
    clearPath,
    route,
  };
}
