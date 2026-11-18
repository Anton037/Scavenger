export const WIDTH = 37;
export const DEPTH = 33;

export const ROOMS = [
  { id: 'landing', name: 'Aufzugsschacht', x: 14, z: 25, w: 9, d: 7, glaze: 0x283f46 },
  { id: 'hall', name: 'Zentral-Halle', x: 10, z: 12, w: 17, d: 10, glaze: 0x283f46 },
  { id: 'archive', name: 'Fliesentisch-Lounge', x: 2, z: 13, w: 7, d: 9, glaze: 0x4b6573 },
  { id: 'vault', name: 'Spezi-Kammer', x: 13, z: 2, w: 11, d: 7, glaze: 0x302f4b },
  { id: 'annex', name: 'Döner-Eck', x: 28, z: 10, w: 7, d: 10, glaze: 0x263d39 },
  { id: 'sluice', name: 'Antons Lost-Zone', x: 2, z: 3, w: 8, d: 7, glaze: 0x615347 },
  { id: 'cistern', name: 'Haukes Masse-Keller', x: 26, z: 23, w: 9, d: 8, glaze: 0x4d3736 },
];

const PASSAGES = [
  [16, 21, 5, 5], [16, 8, 5, 5], [8, 16, 3, 3], [26, 14, 3, 3],
  [9, 4, 5, 3], [4, 9, 3, 5], [23, 5, 8, 3], [28, 7, 3, 4],
  [22, 20, 7, 4], [22, 26, 5, 3],
];

const cells = new Uint8Array(WIDTH * DEPTH);
for (const [x, z, w, d] of PASSAGES) {
  for (let row = z; row < z + d; row++) cells.fill(1, row * WIDTH + x, row * WIDTH + x + w);
}
for (const [index, { x, z, w, d }] of ROOMS.entries()) {
  for (let row = z; row < z + d; row++) cells.fill(index + 2, row * WIDTH + x, row * WIDTH + x + w);
}

export const BLOCKS = [
  { x: 14.6, z: 16.5, w: 1.7, d: 1.7, kind: 'pump' },
  { x: 23.0, z: 17.9, w: 1.7, d: 1.7, kind: 'pump' },
  { x: 21.4, z: 13.7, w: 1.1, d: 1.1, kind: 'coil' },
  { x: 11.0, z: 20.75, w: 1.1, d: 1.25, kind: 'crates' },
  { x: 3.1, z: 17.8, w: 1.0, d: 3.15, kind: 'shelves' },
  { x: 7.8, z: 14.25, w: 1.15, d: 1.2, kind: 'crates' },
  { x: 18.15, z: 3.35, w: 3.8, d: 1.65, kind: 'turbine' },
  { x: 14.45, z: 6.5, w: 1.35, d: 1.35, kind: 'coil' },
  { x: 21.95, z: 7.45, w: 1.35, d: 1.35, kind: 'coil' },
  { x: 33.45, z: 15.0, w: 1.3, d: 3.1, kind: 'shelves' },
  { x: 30.25, z: 18.65, w: 1.7, d: 1.6, kind: 'pump' },
  { x: 3.3, z: 5.3, w: 1.4, d: 2.2, kind: 'shelves' },
  { x: 8.55, z: 8.0, w: 1.3, d: 2.35, kind: 'shelves' },
  { x: 31.1, z: 27.6, w: 2.6, d: 1.8, kind: 'turbine' },
  { x: 33.75, z: 24.15, w: 1.2, d: 1.2, kind: 'crates' },
  { x: 14.85, z: 27.4, w: 1.05, d: 1.4, kind: 'crates' },
  { x: 21.9, z: 30.8, w: 1.3, d: 1.3, kind: 'coil' },
];

export const POOLS = [
  { x: 12.25, z: 18.65, w: 3.8, d: 3.0 },
  { x: 6.8, z: 19.25, w: 3.75, d: 4.85 },
  { x: 18.65, z: 10.9, w: 4.25, d: 2.8 },
  { x: 31.55, z: 17.7, w: 5.0, d: 3.2 },
  { x: 30.7, z: 27, w: 7.45, d: 6.2 },
  { x: 6, z: 6.45, w: 4.85, d: 3.6 },
];

export const FIXTURES = [
  { x: 15.45, z: 31.3, color: 0xe5b878, strength: 26 },
  { x: 21.65, z: 31.3, color: 0xe5b878, strength: 26 },
  { x: 11.0, z: 13.0, color: 0xe5b878, strength: 28 },
  { x: 25.85, z: 13.1, color: 0x91c9b4, strength: 22 },
  { x: 2.7, z: 14.4, color: 0xbacfd9, strength: 25 },
  { x: 15.0, z: 2.8, color: 0xc0a6db, strength: 30 },
  { x: 33.85, z: 10.65, color: 0x91c9b4, strength: 26 },
  { x: 4.1, z: 3.8, color: 0xe5b878, strength: 20 },
  { x: 34.0, z: 29.95, color: 0xf08e70, strength: 20 },
];

export const RECORDS = [
  {
    id: 'log',
    name: 'Goldene Chef-Krone (+2.000 Aura)',
    room: 'Fliesentisch-Lounge',
    x: 4.55,
    z: 15.35,
    color: 0xe5b878,
    discovery: 'Chef-Krone gesichert! Torges überlegene Chef-Aura steigt ins Unermessliche.',
  },
  {
    id: 'cylinder',
    name: 'Limitierte Paulaner Spezi (Eiskalt)',
    room: 'Spezi-Kammer',
    x: 18.0,
    z: 5.55,
    color: 0x91c9b4,
    discovery: 'Die letzte eiskalte Spezi! Vorsicht: Hauke (Massiv Rund) hat das Zischen gehört!',
  },
  {
    id: 'spool',
    name: 'Heiliger Mitternachts-Döner (Mit Alles)',
    room: 'Döner-Eck',
    x: 32.45,
    z: 12.3,
    color: 0xc0a6db,
    discovery: 'Heiliger Döner geborgen! Tom wittert schon wieder Gratis-Bissen aus 20 Metern.',
  },
];

export const VENDING = { x: 24.6, z: 12.7, name: 'Späti-Automat (Booster & Pfand-Dosen)' };

export const VALVES = [
  { id: 'v1', name: 'Überdruck-Ventil (Zünden)', x: 16.3, z: 13.3 },
  { id: 'v2', name: 'Lounge-Ventil (Zünden)', x: 6.2, z: 14.1 },
  { id: 'v3', name: 'Tresor-Ventil (Zünden)', x: 22.1, z: 4.8 },
];

export const INITIAL_CANS = [
  { id: 1, x: 18.1, z: 22.8 },
  { id: 2, x: 15.6, z: 19.2 },
  { id: 3, x: 12.2, z: 15.4 },
  { id: 4, x: 6.1, z: 16.9 },
  { id: 5, x: 17.6, z: 9.6 },
  { id: 6, x: 20.1, z: 6.1 },
  { id: 7, x: 27.1, z: 15.3 },
  { id: 8, x: 30.8, z: 14.2 },
  { id: 9, x: 24.4, z: 21.4 },
  { id: 10, x: 28.4, z: 25.4 },
];

export const LIFT = { x: 18.5, z: 30.25 };
export const SPAWN = { x: 18.5, z: 27.55 };
export const PATROL = [
  { x: 13.3, z: 14.2 }, { x: 5.85, z: 17.5 }, { x: 6.4, z: 6.25 },
  { x: 19.3, z: 6.8 }, { x: 30.7, z: 13.3 }, { x: 20.45, z: 16.0 },
  { x: 28.0, z: 25.3 }, { x: 23.85, z: 21.3 },
];

export const PATROL_HAUKE = [
  { x: 28.0, z: 25.3 }, { x: 23.85, z: 21.3 }, { x: 20.45, z: 16.0 }, { x: 30.7, z: 13.3 },
];

export const PATROL_TOM = [
  { x: 20.45, z: 16.0 }, { x: 13.3, z: 14.2 }, { x: 19.3, z: 6.8 }, { x: 30.7, z: 13.3 },
];

export function cell(x, z) {
  if (x < 0 || z < 0 || x >= WIDTH || z >= DEPTH) return 0;
  return cells[z * WIDTH + x];
}

export function roomAt(x, z) {
  return ROOMS[cell(Math.floor(x), Math.floor(z)) - 2]?.name ?? 'Sektor-Korridor';
}

function rectDistanceSquared(x, z, left, top, right, bottom) {
  const gapX = Math.max(left - x, x - right, 0);
  const gapZ = Math.max(top - z, z - bottom, 0);
  return gapX * gapX + gapZ * gapZ;
}

export function walkable(x, z, radius = 0.25) {
  if (!cell(Math.floor(x), Math.floor(z))) return false;
  const limit = radius * radius;
  for (let row = Math.floor(z - radius); row <= Math.floor(z + radius); row++) {
    for (let column = Math.floor(x - radius); column <= Math.floor(x + radius); column++) {
      if (!cell(column, row) && rectDistanceSquared(x, z, column, row, column + 1, row + 1) < limit) {
        return false;
      }
    }
  }
  return !BLOCKS.some((block) => (
    rectDistanceSquared(x, z, block.x - block.w / 2, block.z - block.d / 2, block.x + block.w / 2, block.z + block.d / 2) <= limit
  ));
}

export function wetAt(x, z) {
  return POOLS.some((pool) => {
    const rx = (x - pool.x) / (pool.w * 0.5);
    const rz = (z - pool.z) / (pool.d * 0.5);
    return rx * rx + rz * rz < 0.94;
  });
}

export function clearPath(from, to, radius = 0.035) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const steps = Math.ceil(Math.hypot(dx, dz) * 5);
  for (let step = 1; step <= steps; step++) {
    const fraction = step / steps;
    if (!walkable(from.x + dx * fraction, from.z + dz * fraction, radius)) return false;
  }
  return true;
}

const routeCells = new Uint8Array(WIDTH * DEPTH);
for (let z = 0; z < DEPTH; z++) {
  for (let x = 0; x < WIDTH; x++) routeCells[z * WIDTH + x] = walkable(x + 0.5, z + 0.5, 0.28);
}

function nearestCell(point) {
  const cx = Math.floor(point.x);
  const cz = Math.floor(point.z);
  let best = -1;
  let nearest = Infinity;
  for (let z = Math.max(0, cz - 2); z <= Math.min(DEPTH - 1, cz + 2); z++) {
    for (let x = Math.max(0, cx - 2); x <= Math.min(WIDTH - 1, cx + 2); x++) {
      const index = z * WIDTH + x;
      const distance = (point.x - x - 0.5) ** 2 + (point.z - z - 0.5) ** 2;
      if (routeCells[index] && distance < nearest) {
        best = index;
        nearest = distance;
      }
    }
  }
  return best;
}

const neighbors = [-1, 1, -WIDTH, WIDTH];

export function route(from, to) {
  if (clearPath(from, to, 0.26)) return [to];
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
      if (routeCells[next] && parents[next] === -1) {
        parents[next] = index;
        queue[tail++] = next;
      }
    }
  }
  if (parents[end] === -1) return [];
  const path = [];
  for (let index = end; index !== start; index = parents[index]) {
    path.push({ x: (index % WIDTH) + 0.5, z: Math.floor(index / WIDTH) + 0.5 });
  }
  path.reverse();
  path.push(to);
  return path;
}
