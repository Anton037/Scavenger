import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const TAU = Math.PI * 2;
export const color = (hex) => new THREE.Color(hex);

export const PALETTE = {
  ink: 0x0b0c14,
  slate: 0x1f2438,
  ivory: 0xf4ebd9,
  brass: 0xffb84d,
  copper: 0xe07a47,
  jade: 0x38f2af,
  glacier: 0x73d7ff,
  lavender: 0xb85cff,
  vermilion: 0xff3b56,
  pink: 0xf2b5c6,
  khaki: 0xd9c79e,
  neonLime: 0xc8e838,
};

export const material = (hex, roughness = 0.56, metalness = 0.12) => (
  new THREE.MeshStandardMaterial({
    color: hex,
    roughness,
    metalness,
    flatShading: true,
  })
);

export const brassMaterial = (hex = PALETTE.brass) => (
  new THREE.MeshStandardMaterial({ color: hex, roughness: 0.34, metalness: 0.72, flatShading: true })
);

export const emissive = (hex) => new THREE.MeshBasicMaterial({ color: hex });
export const solid = new THREE.BoxGeometry(1, 1, 1);
export const round = new THREE.CylinderGeometry(1, 1, 1, 12);
export const tapered = new THREE.CylinderGeometry(0.76, 1, 1, 12);
export const orb = new THREE.SphereGeometry(1, 14, 10);
export const octa = new THREE.OctahedronGeometry(1, 0);
export const hoop = new THREE.TorusGeometry(1, 0.045, 6, 22);

export function randomFrom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function piece(parent, geometry, finish, x, y, z, sx = 1, sy = 1, sz = 1) {
  const object = new THREE.Mesh(geometry, finish);
  object.position.set(x, y, z);
  object.scale.set(sx, sy, sz);
  object.castShadow = !finish.isMeshBasicMaterial;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

export function band(parent, finish, x, y, z, radius) {
  const ring = piece(parent, hoop, finish, x, y, z, radius, radius, radius);
  ring.rotation.x = -Math.PI / 2;
  return ring;
}

export function batchScenery(scene, group) {
  const layers = new Map();
  group.updateMatrixWorld(true);
  group.traverse((object) => {
    if (!object.isMesh) return;
    const style = object.material;
    if (!layers.has(style)) layers.set(style, []);
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    layers.get(style).push(geometry);
  });
  for (const [style, parts] of layers) {
    const geometry = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    const surface = new THREE.Mesh(geometry, style);
    surface.castShadow = !style.isMeshBasicMaterial;
    surface.receiveShadow = true;
    scene.add(surface);
  }
}

function makePixelTexture(size, drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawFn(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = false;
  return texture;
}

export function checkerFloorTexture() {
  return makePixelTexture(64, (ctx, size) => {
    const rng = randomFrom(404);
    const tile = 16;
    for (let y = 0; y < size; y += tile) {
      for (let x = 0; x < size; x += tile) {
        const dark = ((x / tile) + (y / tile)) % 2 === 0;
        ctx.fillStyle = dark ? '#161926' : '#8d96ad';
        ctx.fillRect(x, y, tile, tile);
        ctx.fillStyle = dark ? '#0d0f18' : '#747d94';
        ctx.fillRect(x, y, tile, 1);
        ctx.fillRect(x, y, 1, tile);
      }
    }
    // Grime & grease flecks
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = rng() > 0.5 ? 'rgba(8,10,16,0.34)' : 'rgba(180,145,80,0.16)';
      ctx.fillRect(Math.floor(rng() * size), Math.floor(rng() * size), 2, 2);
    }
  });
}

export function wallPanelTexture() {
  return makePixelTexture(64, (ctx, size) => {
    const rng = randomFrom(808);
    ctx.fillStyle = '#252a3a';
    ctx.fillRect(0, 0, size, size);
    // Vertical corrugated shed / tiled kitchen stripes
    for (let x = 0; x < size; x += 8) {
      ctx.fillStyle = '#1b1f2d';
      ctx.fillRect(x, 0, 2, size);
      ctx.fillStyle = '#30374c';
      ctx.fillRect(x + 2, 0, 1, size);
    }
    // FNAF-style checkered wall stripe across center
    const bandY = 32;
    for (let x = 0; x < size; x += 8) {
      const alt = (x / 8) % 2 === 0;
      ctx.fillStyle = alt ? '#e4dfd2' : '#10121b';
      ctx.fillRect(x, bandY, 8, 5);
      ctx.fillStyle = alt ? '#10121b' : '#b82538';
      ctx.fillRect(x, bandY + 5, 8, 5);
    }
    for (let i = 0; i < 65; i++) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(Math.floor(rng() * size), Math.floor(rng() * size), 2, 3);
    }
  });
}

export function posterTexture(isGolden = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  if (isGolden) {
    ctx.fillStyle = '#140c06';
    ctx.fillRect(0, 0, 96, 128);
    ctx.strokeStyle = '#ffcf4d';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 88, 120);
    // Creepy golden duck silhouette with hollow black sockets
    ctx.fillStyle = '#ffda38';
    ctx.fillRect(24, 34, 48, 42);
    ctx.fillRect(18, 44, 60, 24);
    ctx.fillStyle = '#ff6d1f';
    ctx.fillRect(34, 62, 28, 12);
    ctx.fillStyle = '#07070b';
    ctx.fillRect(30, 44, 12, 12);
    ctx.fillRect(54, 44, 12, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(35, 49, 2, 2);
    ctx.fillRect(59, 49, 2, 2);
    ctx.fillStyle = '#ff3b56';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ES BIN ICH', 48, 102);
    ctx.fillText('QUAAAK', 48, 116);
  } else {
    ctx.fillStyle = '#181c2e';
    ctx.fillRect(0, 0, 96, 128);
    ctx.strokeStyle = '#ffb84d';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, 88, 120);
    // Header
    ctx.fillStyle = '#ff3b56';
    ctx.fillRect(8, 8, 80, 18);
    ctx.fillStyle = '#fff5dc';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FEIERABEND!', 48, 21);
    // Stylized Chef Torge portrait + crown + clickable honk nose/duck!
    ctx.fillStyle = '#ffb84d';
    ctx.fillRect(34, 30, 28, 8);
    ctx.fillRect(36, 26, 4, 4);
    ctx.fillRect(46, 25, 4, 5);
    ctx.fillRect(56, 26, 4, 4);
    // Dark green cap + dark curly hair
    ctx.fillStyle = '#184735';
    ctx.fillRect(30, 38, 36, 10);
    ctx.fillStyle = '#1f1822';
    ctx.fillRect(28, 46, 40, 8);
    // Face
    ctx.fillStyle = '#f0d8c0';
    ctx.fillRect(32, 52, 32, 28);
    // Eyes
    ctx.fillStyle = '#111420';
    ctx.fillRect(38, 59, 6, 5);
    ctx.fillRect(52, 59, 6, 5);
    ctx.fillStyle = '#73d7ff';
    ctx.fillRect(40, 61, 2, 2);
    ctx.fillRect(54, 61, 2, 2);
    // Honk nose
    ctx.fillStyle = '#ff6b4a';
    ctx.fillRect(45, 65, 6, 5);
    // Smile
    ctx.fillStyle = '#331c24';
    ctx.fillRect(40, 73, 16, 3);
    // White tee + red chef jacket
    ctx.fillStyle = '#d9383a';
    ctx.fillRect(22, 80, 52, 26);
    ctx.fillStyle = '#f2f5ff';
    ctx.fillRect(36, 80, 24, 26);
    // Footer
    ctx.fillStyle = '#ffe082';
    ctx.font = 'bold 9px monospace';
    ctx.fillText("TORGE'S IMBISS", 48, 118);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

export function coveSignTexture(angry = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = angry ? '#2b0b12' : '#2a221c';
  ctx.fillRect(0, 0, 128, 64);
  ctx.strokeStyle = angry ? '#ff3b56' : '#ffb84d';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 120, 56);
  ctx.fillStyle = angry ? '#ff3b56' : '#ffe49e';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  if (angry) {
    ctx.fillText('ER HAT', 64, 28);
    ctx.fillText('HUNGER!!', 64, 48);
  } else {
    ctx.fillText('AUSSER BETRIEB', 64, 28);
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#d8c5a0';
    ctx.fillText('HAUKES FRESSPAUSE', 64, 46);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

export function crownMesh(scale = 1) {
  const crown = new THREE.Group();
  const gold = brassMaterial(PALETTE.brass);
  const ruby = emissive(PALETTE.vermilion);
  const rim = emissive(0xffe082);
  const velvet = material(0x9e1c36, 0.5, 0.1);
  piece(crown, round, gold, 0, 0, 0, 0.21 * scale, 0.07 * scale, 0.21 * scale);
  piece(crown, orb, velvet, 0, 0.03 * scale, 0, 0.16 * scale, 0.08 * scale, 0.16 * scale);
  for (let i = 0; i < 5; i++) {
    const a = (i * TAU) / 5;
    piece(crown, octa, rim, Math.cos(a) * 0.16 * scale, 0.085 * scale, Math.sin(a) * 0.16 * scale, 0.055 * scale, 0.095 * scale, 0.055 * scale);
  }
  piece(crown, octa, ruby, 0, 0.11 * scale, 0.15 * scale, 0.05 * scale, 0.06 * scale, 0.05 * scale);
  return crown;
}

export function chefTorgeModel() {
  // Chef Torge (Freddy): Dunkelgrüne Kappe + dunkle Locken + Goldene Chef-Krone, weißes Tee unter offener roter Imbiss-Jacke, Goldkette & Pfanne!
  const root = new THREE.Group();
  const skin = material(0xf0d6be, 0.48, 0.05);
  const darkCurlyHair = material(0x1f1920, 0.72, 0.04);
  const forestCap = material(0x133d2e, 0.58, 0.08);
  const whiteTee = material(0xeef2fa, 0.52, 0.04);
  const chefJacket = material(0xb82430, 0.44, 0.12);
  const darkPants = material(0x151926, 0.58, 0.12);
  const brass = brassMaterial(PALETTE.brass);
  const copper = brassMaterial(PALETTE.copper);
  const socketMat = material(0x05060a, 0.9, 0);
  const eyePin = emissive(0x88f4ff);
  const glow = emissive(0xffe082);

  const core = new THREE.Group();
  core.scale.set(1.12, 1.15, 1.12);
  root.add(core);

  // Beine
  for (const side of [-1, 1]) {
    piece(core, tapered, darkPants, side * 0.14, 0.34, 0, 0.1, 0.68, 0.1);
    piece(core, solid, whiteTee, side * 0.14, 0.04, 0.05, 0.15, 0.09, 0.24);
  }

  // Torso: Weißes T-Shirt in der Mitte + offene rote Chef-Jacke links/rechts + Goldkette
  piece(core, tapered, whiteTee, 0, 0.96, 0, 0.34, 0.62, 0.25);
  piece(core, solid, chefJacket, -0.18, 0.97, 0.02, 0.16, 0.6, 0.28);
  piece(core, solid, chefJacket, 0.18, 0.97, 0.02, 0.16, 0.6, 0.28);
  piece(core, solid, chefJacket, 0, 0.97, -0.09, 0.38, 0.6, 0.12);
  const chain = band(core, brass, 0, 1.18, 0.04, 0.19);
  chain.rotation.x = -Math.PI / 2 + 0.18;
  piece(core, octa, glow, 0, 1.11, 0.22, 0.05, 0.05, 0.035);

  // Kopf, lockiges dunkles Haar, dunkelgrüne Kappe + Goldene Krone obenauf
  const head = new THREE.Group();
  head.position.set(0, 1.48, 0.02);
  core.add(head);
  piece(head, orb, skin, 0, 0, 0, 0.23, 0.25, 0.23);
  // Dunkle lockige Stirnfransen (wie im Referenzfoto!)
  for (let i = -2; i <= 2; i++) {
    piece(head, orb, darkCurlyHair, i * 0.075, 0.11, 0.17 - Math.abs(i) * 0.02, 0.068, 0.065, 0.068);
  }
  piece(head, orb, darkCurlyHair, 0, 0.08, -0.05, 0.24, 0.18, 0.23);
  // Dunkelgrüne Kappe
  piece(head, orb, forestCap, 0, 0.18, -0.01, 0.24, 0.11, 0.24);
  piece(head, solid, forestCap, 0, 0.15, 0.21, 0.24, 0.035, 0.16);
  // Goldene Chef-Krone oben auf der Kappe
  const crown = crownMesh(0.82);
  crown.position.set(0, 0.27, 0);
  head.add(crown);

  // Unheimliche tiefe Augenhöhlen mit leuchtenden Pinpoint-Pupillen (FNAF-Freddy-Look!)
  const eyes = new THREE.Group();
  head.add(eyes);
  for (const side of [-1, 1]) {
    piece(head, orb, socketMat, side * 0.085, 0.015, 0.19, 0.052, 0.048, 0.035);
    piece(eyes, orb, eyePin, side * 0.085, 0.015, 0.22, 0.022, 0.022, 0.018);
  }
  const jaw = piece(head, solid, socketMat, 0, -0.1, 0.19, 0.11, 0.045, 0.04);

  // Arme + Goldene Pfanne
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.34, 1.18, 0);
    piece(arm, orb, chefJacket, 0, 0, 0, 0.13, 0.14, 0.13);
    piece(arm, tapered, chefJacket, side * 0.02, -0.22, 0.04, 0.085, 0.34, 0.085);
    piece(arm, orb, skin, side * 0.04, -0.44, 0.1, 0.075, 0.085, 0.075);
    core.add(arm);
    return arm;
  });

  // Goldene Bratpfanne in der rechten Hand (wie Freddys Mikrofon!)
  const pan = new THREE.Group();
  pan.position.set(0.05, -0.42, 0.18);
  arms[1].add(pan);
  piece(pan, round, copper, 0, 0.05, 0.12, 0.038, 0.42, 0.038).rotation.x = Math.PI / 2.2;
  piece(pan, round, brass, 0, 0.11, 0.36, 0.21, 0.06, 0.21);
  piece(pan, round, socketMat, 0, 0.12, 0.36, 0.16, 0.068, 0.16);

  return { root, core, head, eyes, jaw, arms, crown, pan };
}

export function lostAntonModel() {
  // Lost Anton (Bonnie): Groß & schlank, hellbraunes zurückgekämmtes Haar, schwarzes Shirt mit gelb-grünem Frontdruck, unheimlich leuchtende rote Augen!
  const root = new THREE.Group();
  const skin = material(0xebd2be, 0.46, 0.05);
  const hairMat = material(0x8a6946, 0.65, 0.05);
  const blackTee = material(0x12141c, 0.62, 0.08);
  const darkPants = material(0x161a24, 0.58, 0.1);
  const limePrint = emissive(PALETTE.neonLime);
  const socketMat = material(0x06070b, 0.9, 0);
  const redEye = emissive(0xff2948);

  const core = new THREE.Group();
  core.scale.set(1.02, 1.18, 1.02);
  root.add(core);

  // Lange schlanke Beine
  for (const side of [-1, 1]) {
    piece(core, tapered, darkPants, side * 0.13, 0.44, 0, 0.082, 0.88, 0.082);
    piece(core, solid, blackTee, side * 0.13, 0.04, 0.05, 0.12, 0.08, 0.22);
  }

  // Schlanker langer Oberkörper im schwarzen Shirt mit neon-gelbgrünem Brust-Schriftzug (wie im Foto!)
  piece(core, tapered, blackTee, 0, 1.18, 0, 0.28, 0.72, 0.21);
  piece(core, solid, limePrint, -0.07, 1.24, 0.155, 0.055, 0.045, 0.015);
  piece(core, solid, limePrint, 0.0, 1.24, 0.155, 0.065, 0.045, 0.015);
  piece(core, solid, limePrint, 0.08, 1.24, 0.155, 0.055, 0.045, 0.015);

  // Schief gelegter Kopf mit zurückgekämmtem hellbraunem Haar & roten FNAF-Augen
  const head = new THREE.Group();
  head.position.set(0, 1.72, 0.03);
  head.rotation.z = 0.16;
  core.add(head);
  piece(head, orb, skin, 0, 0, 0, 0.21, 0.26, 0.21);
  piece(head, orb, hairMat, 0, 0.12, -0.03, 0.215, 0.14, 0.21);
  piece(head, solid, hairMat, 0, 0.17, 0.05, 0.18, 0.07, 0.14);

  const eyes = new THREE.Group();
  head.add(eyes);
  for (const side of [-1, 1]) {
    piece(head, orb, socketMat, side * 0.075, 0.02, 0.175, 0.05, 0.048, 0.035);
    piece(eyes, orb, redEye, side * 0.075, 0.02, 0.205, 0.026, 0.026, 0.02);
  }
  const jaw = piece(head, orb, socketMat, 0, -0.1, 0.175, 0.058, 0.065, 0.04);

  // Lange schlaksige Arme (inkl. Peace-Geste auf der Bühne!)
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.28, 1.46, 0);
    piece(arm, tapered, blackTee, side * 0.03, -0.14, 0, 0.07, 0.28, 0.07);
    piece(arm, tapered, skin, side * 0.06, -0.46, 0.02, 0.058, 0.44, 0.058);
    piece(arm, orb, skin, side * 0.08, -0.7, 0.04, 0.07, 0.09, 0.07);
    core.add(arm);
    return arm;
  });

  return { root, core, head, eyes, jaw, arms };
}

export function bossHaukeModel() {
  // Boss Hauke (Foxy / Erdbeben-Koloss!): Braunes nach oben gestyltes Haar, weißes Shirt mit dunkelgrünem Kragen, graue Jogginghose — aber MASSIVE Erdbeben-Statur & leuchtende Zorn-Augen!
  const root = new THREE.Group();
  const skin = material(0xf0d5be, 0.44, 0.06);
  const hairMat = material(0x4c3224, 0.65, 0.05);
  const whiteTee = material(0xf0f3fa, 0.5, 0.05);
  const greenCollar = material(0x16523b, 0.52, 0.08);
  const greyJoggers = material(0x6e7585, 0.62, 0.06);
  const brass = brassMaterial(PALETTE.brass);
  const browMat = material(0x281b15, 0.6, 0.08);
  const socketMat = material(0x07070c, 0.9, 0);
  const amberEye = emissive(0xffaa30);

  const core = new THREE.Group();
  root.add(core);

  // Wuchtige Stampf-Beine in grauer Jogginghose!
  const legs = [-1, 1].map((side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.38, 0.42, 0);
    piece(leg, round, greyJoggers, 0, -0.18, 0, 0.23, 0.42, 0.23);
    piece(leg, solid, brass, 0, -0.36, 0.08, 0.27, 0.12, 0.34);
    core.add(leg);
    return leg;
  });

  // MASSIVER Erdbeben-Körper im weißen T-Shirt mit dunkelgrünem Kragen!
  const belly = piece(core, orb, whiteTee, 0, 0.94, 0.04, 0.92, 0.82, 0.86);
  piece(core, round, greyJoggers, 0, 0.54, 0.02, 0.78, 0.22, 0.74);
  // Dunkelgrüner Kragen + Goldgürtel
  const collar = band(core, greenCollar, 0, 1.44, 0.08, 0.34);
  collar.scale.set(0.36, 0.36, 0.8);
  band(core, brass, 0, 0.62, 0.04, 0.86);
  piece(core, solid, brass, 0, 0.62, 0.9, 0.28, 0.18, 0.09);

  // Kopf mit braunem hochgestyltem Haar, Zornesbrauen & glühenden Bernstein-Augen
  const head = new THREE.Group();
  head.position.set(0, 1.7, 0.14);
  core.add(head);
  piece(head, orb, skin, 0, 0, 0, 0.35, 0.31, 0.34);
  // Braune Haar-Tolle (wie im Referenzfoto!)
  piece(head, orb, hairMat, 0, 0.19, -0.02, 0.34, 0.16, 0.31);
  piece(head, solid, hairMat, 0, 0.24, 0.1, 0.28, 0.13, 0.18);

  const eyes = new THREE.Group();
  head.add(eyes);
  for (const side of [-1, 1]) {
    piece(head, orb, socketMat, side * 0.12, 0.03, 0.29, 0.068, 0.056, 0.04);
    piece(eyes, orb, amberEye, side * 0.12, 0.03, 0.325, 0.036, 0.032, 0.024);
    const brow = piece(head, solid, browMat, side * 0.12, 0.11, 0.31, 0.14, 0.04, 0.04);
    brow.rotation.z = side * -0.26;
  }
  const jaw = piece(head, solid, socketMat, 0, -0.11, 0.29, 0.19, 0.07, 0.05);

  // Breite weiße Ärmel & wuchtige Arme
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.88, 1.06, 0.08);
    piece(arm, orb, whiteTee, 0, 0, 0, 0.28, 0.32, 0.28);
    piece(arm, tapered, skin, side * 0.06, -0.34, 0.14, 0.16, 0.34, 0.16);
    core.add(arm);
    return arm;
  });

  return { root, core, head, eyes, jaw, arms, legs, belly };
}

export function schnorrerTomModel() {
  // Schnorrer Tom (Chica): Umgedrehte beige Cap, pastell-rosa "Surf Miami" T-Shirt mit türkisem Palmen-Kreis, Beutesack & grün glühende Augen!
  const root = new THREE.Group();
  const skin = material(0xebd2bc, 0.45, 0.06);
  const darkHair = material(0x2a201c, 0.68, 0.05);
  const khakiCap = material(PALETTE.khaki, 0.56, 0.06);
  const pinkTee = material(PALETTE.pink, 0.52, 0.05);
  const surfTeal = emissive(0x3ec2c9);
  const surfSunset = emissive(0xff8c66);
  const darkPants = material(0x1c202e, 0.58, 0.1);
  const bagMat = material(PALETTE.copper, 0.46, 0.18);
  const brass = brassMaterial(PALETTE.brass);
  const socketMat = material(0x06070b, 0.9, 0);
  const jadeEye = emissive(PALETTE.jade);

  const core = new THREE.Group();
  root.add(core);

  // Beine
  for (const side of [-1, 1]) {
    piece(core, tapered, darkPants, side * 0.13, 0.34, 0, 0.088, 0.68, 0.088);
    piece(core, solid, brass, side * 0.13, 0.04, 0.05, 0.13, 0.08, 0.21);
  }

  // Oberkörper im rosa "Surf Miami"-Shirt + prall gefüllter Schnorrer-Rucksack hinten!
  piece(core, tapered, pinkTee, 0, 0.96, 0.03, 0.34, 0.62, 0.26).rotation.x = 0.12;
  // Runder Surf-Miami Print vorne auf der Brust
  piece(core, round, surfTeal, 0, 0.95, 0.16, 0.13, 0.025, 0.13).rotation.x = Math.PI / 2;
  piece(core, solid, surfSunset, 0, 0.99, 0.17, 0.17, 0.045, 0.015);
  // Überfüllter Beutesack auf dem Rücken
  piece(core, orb, bagMat, 0, 0.96, -0.22, 0.26, 0.3, 0.24);
  piece(core, round, brass, 0, 1.2, -0.22, 0.11, 0.1, 0.11);

  // Kopf mit umgedrehter beiger Cap (wie im Referenzfoto!) & grünen Augen
  const head = new THREE.Group();
  head.position.set(0, 1.46, 0.1);
  core.add(head);
  piece(head, orb, skin, 0, 0, 0, 0.22, 0.23, 0.22);
  piece(head, orb, darkHair, 0, 0.08, 0.08, 0.19, 0.08, 0.16);
  piece(head, orb, khakiCap, 0, 0.12, -0.02, 0.23, 0.11, 0.23);
  // Schirm nach HINTEN (umgedrehte Cap!)
  piece(head, solid, khakiCap, 0, 0.09, -0.24, 0.2, 0.04, 0.18);

  const eyes = new THREE.Group();
  head.add(eyes);
  for (const side of [-1, 1]) {
    piece(head, orb, socketMat, side * 0.08, 0.015, 0.185, 0.05, 0.046, 0.035);
    piece(eyes, orb, jadeEye, side * 0.08, 0.015, 0.215, 0.025, 0.025, 0.02);
  }
  const jaw = piece(head, solid, socketMat, 0, -0.095, 0.185, 0.11, 0.05, 0.04);

  // Arme
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.3, 1.15, 0.06);
    piece(arm, tapered, pinkTee, side * 0.02, -0.1, 0.02, 0.085, 0.22, 0.085);
    piece(arm, tapered, skin, side * 0.04, -0.32, 0.09, 0.065, 0.32, 0.065);
    piece(arm, orb, skin, side * 0.05, -0.5, 0.14, 0.075, 0.085, 0.075);
    core.add(arm);
    return arm;
  });

  return { root, core, head, eyes, jaw, arms };
}

export function goldenDuckModel() {
  // Secret Goldene Ente (Golden Freddy) — unheimlich reglos mit pechschwarzen Augenhöhlen & weißen Pinpoints!
  const root = new THREE.Group();
  const goldBody = material(0xf7c931, 0.38, 0.25);
  const beak = material(0xe05818, 0.4, 0.1);
  const socket = material(0x040408, 0.95, 0);
  const pinpoint = emissive(0xffffff);

  const core = new THREE.Group();
  core.scale.set(2.15, 2.15, 2.15);
  root.add(core);
  piece(core, orb, goldBody, 0, 0.24, 0, 0.3, 0.24, 0.34);
  piece(core, tapered, goldBody, 0, 0.34, -0.28, 0.1, 0.16, 0.12).rotation.x = -0.65;
  for (const side of [-1, 1]) {
    piece(core, orb, goldBody, side * 0.27, 0.25, -0.02, 0.1, 0.13, 0.22);
  }
  const head = new THREE.Group();
  head.position.set(0, 0.5, 0.16);
  head.rotation.z = -0.14;
  core.add(head);
  piece(head, orb, goldBody, 0, 0, 0, 0.22, 0.21, 0.22);
  piece(head, solid, beak, 0, -0.03, 0.21, 0.17, 0.08, 0.15);
  const eyes = new THREE.Group();
  head.add(eyes);
  for (const side of [-1, 1]) {
    piece(head, orb, socket, side * 0.095, 0.05, 0.175, 0.052, 0.052, 0.04);
    piece(eyes, orb, pinpoint, side * 0.095, 0.05, 0.21, 0.015, 0.015, 0.015);
  }
  return { root, core, head, eyes };
}

export function speziModel() {
  const g = new THREE.Group();
  const brown = material(0x4a2016, 0.35, 0.25);
  const orange = emissive(0xff8c24);
  const magenta = emissive(0xe83b8a);
  const brass = brassMaterial(PALETTE.brass);
  piece(g, round, brown, 0, 0.18, 0, 0.11, 0.34, 0.11);
  piece(g, round, orange, 0, 0.23, 0, 0.116, 0.09, 0.116);
  piece(g, round, magenta, 0, 0.14, 0, 0.116, 0.075, 0.116);
  piece(g, round, brass, 0, 0.35, 0, 0.1, 0.025, 0.1);
  return g;
}

export function deskFanModel() {
  // Klassischer FNAF-Schreibtisch-Ventilator mit rotierenden Blättern!
  const root = new THREE.Group();
  const darkMetal = material(0x1b2030, 0.42, 0.55);
  const cageMat = material(0x3a435c, 0.38, 0.62);
  const bladeMat = material(0x283044, 0.35, 0.45);
  piece(root, round, darkMetal, 0, 0.03, 0, 0.22, 0.06, 0.22);
  piece(root, round, darkMetal, 0, 0.18, -0.02, 0.05, 0.28, 0.05);
  piece(root, round, darkMetal, 0, 0.36, -0.04, 0.1, 0.16, 0.1).rotation.x = Math.PI / 2;
  const ring = band(root, cageMat, 0, 0.36, 0.06, 0.26);
  ring.rotation.x = 0;
  const blades = new THREE.Group();
  blades.position.set(0, 0.36, 0.05);
  for (let i = 0; i < 4; i++) {
    const b = piece(blades, solid, bladeMat, 0, 0, 0, 0.09, 0.38, 0.018);
    b.rotation.z = (i * Math.PI) / 4;
  }
  piece(blades, orb, darkMetal, 0, 0, 0.02, 0.06, 0.06, 0.05);
  root.add(blades);
  return { root, blades };
}

export function crateMesh(isGold = false) {
  const g = new THREE.Group();
  const wood = isGold ? brassMaterial(PALETTE.brass) : material(0x7c4f2b, 0.72, 0.06);
  const trim = material(0x283044, 0.45, 0.25);
  piece(g, solid, wood, 0, 0.32, 0, 0.62, 0.62, 0.62);
  piece(g, solid, trim, 0, 0.32, 0, 0.66, 0.09, 0.66);
  piece(g, solid, trim, 0, 0.61, 0, 0.65, 0.07, 0.65);
  piece(g, solid, trim, 0, 0.04, 0, 0.65, 0.07, 0.65);
  return g;
}

export function partyGarland(parent, x1, x2, y, z) {
  // Kultige bunte Party-Quasten & warme Lichterkette aus dem Imbiss-Schuppen (wie im Referenzfoto!)
  const g = new THREE.Group();
  const wire = material(0x161822, 0.8, 0.1);
  const len = Math.abs(x2 - x1);
  piece(g, solid, wire, (x1 + x2) * 0.5, y, z, len, 0.025, 0.025);
  const colors = [0xff3b56, 0xffb84d, 0x38f2af, 0xb85cff, 0x73d7ff, 0xf2b5c6];
  const warmBulb = emissive(0xffd27d);
  const count = Math.max(5, Math.floor(len * 2.1));
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const px = x1 + (x2 - x1) * t;
    const sag = Math.sin(t * Math.PI) * 0.28;
    const mat = material(colors[i % colors.length], 0.32, 0.48);
    piece(g, tapered, mat, px, y - sag - 0.16, z, 0.085, 0.28, 0.085);
    if (i % 2 === 1) {
      piece(g, orb, warmBulb, px, y - sag - 0.04, z + 0.05, 0.045, 0.055, 0.045);
    }
  }
  parent.add(g);
  return g;
}
