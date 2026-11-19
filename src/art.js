import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const TAU = Math.PI * 2;
export const color = (hex) => new THREE.Color(hex);

// Dead-Cells-inspiriertes High-Contrast Dungeon- & Neon-Farbschema
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
};

export const material = (hex, roughness = 0.52, metalness = 0.14) => (
  new THREE.MeshStandardMaterial({
    color: hex,
    roughness,
    metalness,
    flatShading: true,
  })
);

export const brassMaterial = (hex = PALETTE.brass) => (
  new THREE.MeshStandardMaterial({ color: hex, roughness: 0.32, metalness: 0.74, flatShading: true })
);

export const emissive = (hex) => new THREE.MeshBasicMaterial({ color: hex });
export const solid = new THREE.BoxGeometry(1, 1, 1);
export const round = new THREE.CylinderGeometry(1, 1, 1, 12);
export const tapered = new THREE.CylinderGeometry(0.76, 1, 1, 12);
export const orb = new THREE.SphereGeometry(1, 14, 10);
export const octa = new THREE.OctahedronGeometry(1, 0);
export const hoop = new THREE.TorusGeometry(1, 0.04, 6, 24);

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

export function studioEnv() {
  return null;
}

// Knackige 64x64 Pixel-Art Dungeon-Fliesen & Ziegel-Textur (NearestFilter wie in Dead Cells)
export function surfaceTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const random = randomFrom(1337);

  ctx.fillStyle = '#aebcd9';
  ctx.fillRect(0, 0, size, size);

  const shades = ['#9aaac9', '#c1ceeb', '#8898b8', '#d2def7', '#7b8aa8'];
  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      if (random() < 0.56) {
        ctx.fillStyle = shades[Math.floor(random() * shades.length)];
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }

  // Klare Pixel-Fugen
  ctx.fillStyle = '#333b52';
  ctx.fillRect(0, 0, size, 3);
  ctx.fillRect(0, 0, 3, size);
  ctx.fillRect(0, 31, size, 2);
  ctx.fillRect(31, 0, 2, 32);
  ctx.fillRect(15, 32, 2, 32);

  // Helle Pixel-Kanten-Highlights (oben/links an jedem Steinblock)
  ctx.fillStyle = '#ebf1ff';
  ctx.fillRect(3, 3, 27, 1);
  ctx.fillRect(3, 3, 1, 27);
  ctx.fillRect(33, 3, 29, 1);
  ctx.fillRect(3, 33, 11, 1);
  ctx.fillRect(17, 33, 44, 1);

  // Leuchtende Nachtmarkt-Akzentpixel in den Fugen
  ctx.fillStyle = '#38f2af';
  for (let i = 0; i < 6; i++) {
    const px = Math.floor(random() * 30) * 2;
    const py = random() > 0.5 ? 2 : 30;
    ctx.fillRect(px, py, 2, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
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

function stunStars(parent, height = 1.65) {
  const crown = new THREE.Group();
  crown.position.set(0, height, 0);
  crown.visible = false;
  const gold = emissive(PALETTE.brass);
  const red = emissive(PALETTE.vermilion);
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4;
    piece(crown, octa, i % 2 === 0 ? gold : red, Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42, 0.09, 0.09, 0.09).rotation.set(0.4, a, 0.4);
  }
  parent.add(crown);
  return crown;
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

export function diver() {
  // Chef Torge: Überlegener Boss mit roter Chef-Jacke, Goldkette, Pixel-Sonnenbrille, Krone & Bratpfannen-Schelle
  const root = new THREE.Group();
  const skin = material(PALETTE.ivory, 0.44, 0.06);
  const hair = material(0x1f1924, 0.65, 0.05);
  const chefJacket = material(0xd9383a, 0.38, 0.14);
  const jacketTrim = material(0x1b2234, 0.5, 0.18);
  const darkPants = material(0x171c2b, 0.52, 0.15);
  const shades = emissive(PALETTE.glacier);
  const frameMat = material(0x10131c, 0.4, 0.3);
  const brass = brassMaterial(PALETTE.brass);
  const copper = brassMaterial(PALETTE.copper);
  const glow = emissive(0xffe082);
  const whiteTrim = material(0xf4ebd9, 0.4, 0.1);

  const body = new THREE.Group();
  body.scale.set(1.16, 1.2, 1.16);
  root.add(body);

  // Muskulöser Torso & Jacken-Streifen
  piece(body, tapered, darkPants, 0, 0.34, 0, 0.24, 0.34, 0.22);
  piece(body, tapered, chefJacket, 0, 0.57, 0, 0.42, 0.42, 0.32);
  piece(body, solid, jacketTrim, 0, 0.59, 0.17, 0.15, 0.38, 0.05);
  // Goldkette um den Hals
  const chain = band(body, brass, 0, 0.72, 0.03, 0.23);
  chain.rotation.x = -Math.PI / 2 + 0.15;
  piece(body, octa, glow, 0, 0.66, 0.24, 0.06, 0.06, 0.04);

  // Kopf, Undercut-Haar & Pixel-Sonnenbrille
  piece(body, orb, skin, 0, 0.91, 0, 0.24, 0.24, 0.24);
  piece(body, orb, hair, 0, 0.97, -0.04, 0.24, 0.17, 0.23);
  piece(body, solid, frameMat, 0, 0.93, 0.19, 0.34, 0.095, 0.08);
  piece(body, solid, shades, -0.07, 0.93, 0.225, 0.11, 0.055, 0.03);
  piece(body, solid, shades, 0.07, 0.93, 0.225, 0.11, 0.055, 0.03);

  // Abnehmbare Goldene Chef-Krone
  const helmet = crownMesh(1.0);
  helmet.position.set(0, 1.1, 0);
  body.add(helmet);

  // Breite Schultern & kräftige Arme
  for (const side of [-1, 1]) {
    piece(body, orb, chefJacket, side * 0.36, 0.68, 0, 0.15, 0.16, 0.15);
    piece(body, solid, brass, side * 0.36, 0.74, 0, 0.17, 0.04, 0.17);
    piece(body, tapered, chefJacket, side * 0.39, 0.54, 0.04, 0.095, 0.18, 0.095);
    piece(body, tapered, skin, side * 0.4, 0.42, 0.11, 0.08, 0.16, 0.08).rotation.x = 0.4;
  }

  // Animierte Beine & Sneaker
  const legs = [-1, 1].map((side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.135, 0.28, 0);
    piece(leg, tapered, darkPants, 0, -0.09, 0, 0.095, 0.24, 0.095);
    piece(leg, solid, whiteTrim, 0, -0.21, 0.04, 0.14, 0.09, 0.23);
    piece(leg, solid, brass, 0, -0.24, 0.04, 0.145, 0.03, 0.235);
    root.add(leg);
    return leg;
  });

  // Taschenlampe in der rechten Hand
  const lamp = new THREE.Group();
  lamp.position.set(0.39, 0.41, 0.22);
  body.add(lamp);
  piece(lamp, round, jacketTrim, 0, 0, 0, 0.065, 0.2, 0.065).rotation.x = Math.PI / 2;
  piece(lamp, round, brass, 0, 0, 0.1, 0.09, 0.09, 0.09).rotation.x = Math.PI / 2;
  const bulb = piece(lamp, orb, glow, 0, 0, 0.14, 0.08, 0.08, 0.05);

  // Goldene Chef-Pfanne / Megaklatscher in der linken Hand
  const wrench = new THREE.Group();
  wrench.position.set(-0.4, 0.43, 0.18);
  body.add(wrench);
  piece(wrench, round, copper, 0, 0.08, 0.16, 0.042, 0.46, 0.042).rotation.x = Math.PI / 2.2;
  // Schwere Bratpfannen-/Schlagfläche aus Gold
  piece(wrench, round, brass, 0, 0.16, 0.44, 0.23, 0.07, 0.23);
  piece(wrench, round, jacketTrim, 0, 0.17, 0.44, 0.18, 0.08, 0.18);
  piece(wrench, octa, glow, 0, 0.2, 0.44, 0.08, 0.06, 0.08);

  return { root, body, bulb, legs, wrench, helmet, jacketMat: chefJacket };
}

export function dredged() {
  // Anton: Extrem groß & dürr (Slenderman-Statur), Nadelstreifen-Kontrast & schwebendes Gelb-'?' wenn lost!
  const root = new THREE.Group();
  const darkSuit = material(0x28314a, 0.45, 0.18);
  const pinstripe = material(0x6c7eb0, 0.42, 0.2);
  const shirtMat = material(0xeef4ff, 0.38, 0.08);
  const paleSkin = material(0xe6effa, 0.34, 0.08);
  const tieMat = material(0xff2c4f, 0.32, 0.12);
  const eyeGlow = emissive(0xff2644);
  const goldMark = emissive(0xffd04d);
  const voidMouth = material(0x07080d, 0.9, 0);

  const core = new THREE.Group();
  root.add(core);

  // Ellenlange, animierbare Slenderman-Beine
  const legs = [-1, 1].map((side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.13, 0.96, 0);
    piece(leg, tapered, darkSuit, 0, -0.45, 0, 0.068, 0.92, 0.068);
    piece(leg, solid, pinstripe, 0, -0.45, 0.055, 0.025, 0.86, 0.02);
    piece(leg, solid, darkSuit, 0, -0.92, 0.04, 0.08, 0.08, 0.18);
    root.add(leg);
    return leg;
  });

  // Extrem langer, dürrer Oberkörper mit hellem Hemd & roter Krawatte (gute Lesbarkeit im Dunkeln!)
  piece(core, tapered, darkSuit, 0, 1.32, 0, 0.21, 0.88, 0.18);
  piece(core, solid, shirtMat, 0, 1.56, 0.15, 0.12, 0.28, 0.04);
  piece(core, solid, tieMat, 0, 1.34, 0.175, 0.055, 0.56, 0.03);
  piece(core, solid, pinstripe, -0.11, 1.34, 0.14, 0.035, 0.72, 0.03);
  piece(core, solid, pinstripe, 0.11, 1.34, 0.14, 0.035, 0.72, 0.03);

  // Schief gelegter, bleicher Slenderman-Kopf mit leerem Mund & irren roten Augen
  const mask = new THREE.Group();
  mask.position.set(0, 1.9, 0.06);
  mask.rotation.z = 0.22;
  core.add(mask);
  piece(mask, orb, paleSkin, 0, 0, 0, 0.22, 0.3, 0.22);
  piece(mask, orb, voidMouth, 0, -0.1, 0.18, 0.06, 0.075, 0.04);

  const eyes = new THREE.Group();
  mask.add(eyes);
  piece(eyes, orb, eyeGlow, -0.075, 0.04, 0.19, 0.058, 0.058, 0.04);
  piece(eyes, orb, eyeGlow, 0.08, -0.01, 0.19, 0.042, 0.042, 0.04);

  // Schwebendes Pixel-Fragezeichen ("?") wenn Anton lost ist
  const lostMark = new THREE.Group();
  lostMark.position.set(0, 2.38, 0);
  piece(lostMark, solid, goldMark, 0, 0.18, 0, 0.16, 0.06, 0.06);
  piece(lostMark, solid, goldMark, 0.06, 0.11, 0, 0.06, 0.1, 0.06);
  piece(lostMark, solid, goldMark, 0, 0.05, 0, 0.08, 0.06, 0.06);
  piece(lostMark, solid, goldMark, 0, -0.06, 0, 0.065, 0.065, 0.065);
  root.add(lostMark);

  // Überlange herunterhängende Slenderman-Arme
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.28, 1.66, 0);
    piece(arm, tapered, darkSuit, side * 0.07, -0.45, 0, 0.058, 0.94, 0.058).rotation.z = side * 0.12;
    piece(arm, orb, paleSkin, side * 0.13, -0.94, 0, 0.08, 0.14, 0.08);
    core.add(arm);
    return arm;
  });

  const stars = stunStars(root, 2.32);
  return { root, core, mask, arms, legs, stars, eyes, lostMark };
}

export function haukeBoss() {
  // Boss Hauke: MASSIV RUND — gigantischer Kugelkörper, hervorguckende weiße Bauchfalte unter engem Hoodie, dicker Goldgürtel, Zornesbrauen & Stampf-Beine!
  const root = new THREE.Group();
  const hoodie = material(0xa62639, 0.4, 0.14);
  const hoodieDark = material(0x5c1320, 0.5, 0.15);
  const tshirt = material(0xf0ead8, 0.48, 0.05);
  const skin = material(PALETTE.ivory, 0.38, 0.08);
  const pants = material(0x1f263b, 0.5, 0.15);
  const brass = brassMaterial(PALETTE.brass);
  const browMat = material(0x1b151e, 0.6, 0.1);
  const eyeGlow = emissive(0xffaa3b);
  const core = new THREE.Group();
  root.add(core);

  // Animierte stämmige Stampfer-Beine
  const legs = [-1, 1].map((side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.42, 0.32, 0);
    piece(leg, round, pants, 0, -0.14, 0, 0.22, 0.34, 0.22);
    piece(leg, solid, brass, 0, -0.27, 0.07, 0.27, 0.11, 0.34);
    core.add(leg);
    return leg;
  });

  // MASSIV RUNDE WAMPE + hervorstehendes zu enges T-Shirt vorne!
  const belly = piece(core, orb, hoodie, 0, 0.86, 0.04, 1.0, 0.86, 0.98);
  piece(core, orb, tshirt, 0, 0.72, 0.38, 0.72, 0.52, 0.7);
  piece(core, solid, hoodieDark, -0.58, 0.9, 0.34, 0.16, 0.68, 0.28);
  piece(core, solid, hoodieDark, 0.58, 0.9, 0.34, 0.16, 0.68, 0.28);
  // Mega-Gürtel + riesige goldene Schnalle um die Wampe
  band(core, brass, 0, 0.54, 0.06, 0.95);
  piece(core, solid, brass, 0, 0.54, 1.0, 0.32, 0.2, 0.1);

  // Runder Kopf, dicke Pausbacken, grimmige Zornesbrauen & Kappe
  const mask = new THREE.Group();
  mask.position.set(0, 1.62, 0.16);
  core.add(mask);
  piece(mask, orb, skin, 0, 0, 0, 0.39, 0.33, 0.39);
  piece(mask, orb, skin, 0, -0.14, 0.1, 0.36, 0.16, 0.33); // Doppelkinn

  const eyes = new THREE.Group();
  mask.add(eyes);
  for (const side of [-1, 1]) {
    piece(mask, orb, skin, side * 0.26, -0.06, 0.16, 0.18, 0.15, 0.17);
    const eye = piece(eyes, orb, eyeGlow, side * 0.13, 0.05, 0.34, 0.07, 0.055, 0.04);
    eye.userData.isEyeGlow = true;
    const brow = piece(mask, solid, browMat, side * 0.14, 0.12, 0.35, 0.14, 0.045, 0.05);
    brow.rotation.z = side * -0.28;
  }
  // Rote Snapback-Kappe
  piece(mask, orb, hoodie, 0, 0.2, 0, 0.34, 0.16, 0.34);
  piece(mask, solid, brass, 0, 0.15, 0.31, 0.3, 0.045, 0.24);

  // Wuchtige runde Arme
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.95, 0.96, 0.1);
    piece(arm, orb, hoodie, 0, 0, 0, 0.31, 0.39, 0.31);
    piece(arm, orb, skin, side * 0.07, -0.35, 0.16, 0.2, 0.2, 0.2);
    core.add(arm);
    return arm;
  });

  const stars = stunStars(root, 2.15);
  return { root, core, mask, arms, legs, stars, eyes, belly };
}

export function haukeSnack(index) {
  // 3 echte Snacks im Gravitations-Orbit um Hauke: Burger, Döner-Spieß & Spezi-Dose!
  const g = new THREE.Group();
  const bun = material(0xe09f52, 0.55, 0.05);
  const patty = material(0x5e2c1c, 0.65, 0.05);
  const lettuce = emissive(PALETTE.jade);
  const brass = brassMaterial(PALETTE.brass);
  const speziRed = emissive(PALETTE.vermilion);
  const speziOrange = material(0xff8c24, 0.35, 0.2);

  if (index % 3 === 0) {
    // Mini-Double-Burger
    piece(g, round, bun, 0, 0.72, 0, 0.15, 0.06, 0.15);
    piece(g, round, patty, 0, 0.78, 0, 0.155, 0.055, 0.155);
    piece(g, round, lettuce, 0, 0.82, 0, 0.16, 0.025, 0.16);
    piece(g, orb, bun, 0, 0.86, 0, 0.15, 0.08, 0.15);
  } else if (index % 3 === 1) {
    // Mini-Döner-Spieß
    piece(g, round, brass, 0, 0.62, 0, 0.03, 0.42, 0.03);
    piece(g, tapered, patty, 0, 0.78, 0, 0.13, 0.24, 0.13);
    piece(g, round, lettuce, 0, 0.9, 0, 0.12, 0.04, 0.12);
  } else {
    // Mini-Spezi-Dose
    piece(g, round, speziOrange, 0, 0.78, 0, 0.11, 0.22, 0.11);
    piece(g, round, speziRed, 0, 0.78, 0, 0.114, 0.09, 0.114);
    piece(g, round, brass, 0, 0.9, 0, 0.105, 0.025, 0.105);
  }
  return g;
}

export function greedyTom() {
  // Tom: "Einfach Tom" — flinker Schnorrer mit animierten Beinen, überfülltem Gold-Rucksack & grünen Gier-Augen!
  const root = new THREE.Group();
  const hoodie = material(0x1f8a65, 0.4, 0.14);
  const hoodieDark = material(0x124d38, 0.5, 0.15);
  const skin = material(PALETTE.ivory, 0.4, 0.08);
  const bag = material(PALETTE.copper, 0.44, 0.22);
  const brass = brassMaterial(PALETTE.brass);
  const eyeGlow = emissive(PALETTE.jade);
  const goldGlow = emissive(0xffe082);
  const core = new THREE.Group();
  root.add(core);

  // Animierbare flinke Schnorrer-Beine
  const legs = [-1, 1].map((side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.12, 0.28, 0);
    piece(leg, tapered, hoodieDark, 0, -0.1, 0, 0.075, 0.22, 0.075);
    piece(leg, solid, brass, 0, -0.21, 0.04, 0.11, 0.075, 0.18);
    core.add(leg);
    return leg;
  });

  // Geduckter Torso + prall überfüllter Beutesack mit Goldmünzen & Dose oben dran!
  piece(core, tapered, hoodie, 0, 0.44, 0.04, 0.3, 0.5, 0.28).rotation.x = 0.35;
  piece(core, orb, bag, 0, 0.56, -0.25, 0.31, 0.35, 0.29);
  piece(core, round, brass, 0, 0.82, -0.25, 0.14, 0.12, 0.14);
  piece(core, octa, goldGlow, -0.1, 0.9, -0.27, 0.08, 0.08, 0.08);
  piece(core, octa, goldGlow, 0.09, 0.93, -0.22, 0.07, 0.07, 0.07);

  // Kopf mit umgedrehter Cap & leuchtenden Gier-Augen
  const mask = new THREE.Group();
  mask.position.set(0, 0.8, 0.22);
  core.add(mask);
  piece(mask, orb, skin, 0, 0, 0, 0.22, 0.22, 0.22);
  piece(mask, orb, brass, 0, 0.1, -0.02, 0.235, 0.12, 0.235);
  piece(mask, solid, brass, 0, 0.08, -0.24, 0.2, 0.045, 0.18);

  const eyes = new THREE.Group();
  mask.add(eyes);
  for (const side of [-1, 1]) {
    piece(eyes, orb, eyeGlow, side * 0.085, 0.02, 0.195, 0.055, 0.05, 0.035);
  }

  // Gier-Hände nach vorne
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.29, 0.54, 0.16);
    piece(arm, tapered, hoodie, 0, -0.05, 0.14, 0.08, 0.28, 0.08).rotation.x = Math.PI / 2.6;
    piece(arm, orb, skin, 0, -0.12, 0.29, 0.09, 0.09, 0.09);
    core.add(arm);
    return arm;
  });

  const stars = stunStars(root, 1.25);
  return { root, core, mask, arms, legs, stars, eyes };
}

export function speziModel() {
  // Echte Paulaner Spezi Dose mit charakteristischen Sunset-Farbstreifen!
  const g = new THREE.Group();
  const brown = material(0x4a2016, 0.35, 0.25);
  const orange = emissive(0xff8c24);
  const magenta = emissive(0xe83b8a);
  const brass = brassMaterial(PALETTE.brass);
  piece(g, round, brown, 0, 0.2, 0, 0.15, 0.42, 0.15);
  piece(g, round, orange, 0, 0.26, 0, 0.156, 0.11, 0.156);
  piece(g, round, magenta, 0, 0.15, 0, 0.156, 0.09, 0.156);
  piece(g, round, brass, 0, 0.41, 0, 0.14, 0.035, 0.14);
  return g;
}

export function doenerModel() {
  // Heiliger Mitternachts-Döner mit Alles auf Gold-Teller!
  const g = new THREE.Group();
  const brass = brassMaterial(PALETTE.brass);
  const pita = material(0xe2b46d, 0.6, 0.04);
  const meat = material(0x6e361f, 0.55, 0.05);
  const salad = emissive(PALETTE.jade);
  const sauce = emissive(0xfff4d4);
  piece(g, round, brass, 0, 0.04, 0, 0.32, 0.04, 0.32);
  const pocket = new THREE.Group();
  pocket.position.set(0, 0.22, 0);
  pocket.rotation.x = 0.28;
  piece(pocket, tapered, pita, 0, -0.04, 0, 0.24, 0.34, 0.16);
  piece(pocket, orb, meat, 0, 0.12, 0, 0.21, 0.14, 0.14);
  piece(pocket, orb, salad, -0.09, 0.15, 0.06, 0.1, 0.08, 0.09);
  piece(pocket, orb, sauce, 0.06, 0.18, 0.05, 0.1, 0.07, 0.09);
  g.add(pocket);
  return g;
}

export function skewerModel() {
  // Goldener Grillspieß mit neon-grüner Spitze
  const g = new THREE.Group();
  const brass = brassMaterial(PALETTE.brass);
  const meat = material(0x733224, 0.5, 0.08);
  const sear = material(0xa84d2a, 0.45, 0.1);
  const jadeGlow = emissive(PALETTE.jade);
  piece(g, round, brass, 0, 0.04, 0, 0.28, 0.04, 0.28);
  piece(g, round, brass, 0, 0.34, 0, 0.035, 0.56, 0.035);
  for (let i = 0; i < 4; i++) {
    const r = 0.09 + i * 0.035;
    piece(g, tapered, i % 2 === 0 ? meat : sear, 0, 0.18 + i * 0.1, 0, r, 0.09, r);
  }
  piece(g, octa, jadeGlow, 0, 0.65, 0, 0.085, 0.1, 0.085);
  return g;
}

export function crateMesh(isGold = false) {
  // Zerstörbare Holz-Beutekiste oder Goldene Chef-Truhe
  const g = new THREE.Group();
  const wood = isGold ? brassMaterial(PALETTE.brass) : material(0x7c4f2b, 0.72, 0.06);
  const trim = isGold ? material(0x3a2614, 0.42, 0.3) : material(0x283044, 0.45, 0.25);
  const gem = emissive(isGold ? PALETTE.jade : PALETTE.brass);
  const scale = isGold ? 1.12 : 1.0;
  piece(g, solid, wood, 0, 0.32 * scale, 0, 0.62 * scale, 0.62 * scale, 0.62 * scale);
  piece(g, solid, trim, 0, 0.32 * scale, 0, 0.66 * scale, 0.09 * scale, 0.66 * scale);
  piece(g, solid, trim, 0, 0.61 * scale, 0, 0.65 * scale, 0.07 * scale, 0.65 * scale);
  piece(g, solid, trim, 0, 0.04 * scale, 0, 0.65 * scale, 0.07 * scale, 0.65 * scale);
  piece(g, solid, gem, 0, 0.32 * scale, 0.325 * scale, 0.16 * scale, 0.14 * scale, 0.045 * scale);
  piece(g, solid, gem, 0, 0.32 * scale, -0.325 * scale, 0.16 * scale, 0.14 * scale, 0.045 * scale);
  if (isGold) {
    g.userData.topGem = piece(g, octa, gem, 0, 0.78, 0, 0.11, 0.12, 0.11);
  }
  return g;
}

export function barrelMesh() {
  // Explosives Druckfass mit rotem Warnring
  const g = new THREE.Group();
  const shell = material(0xb32436, 0.42, 0.22);
  const iron = material(0x1f2536, 0.5, 0.3);
  const warn = emissive(0xffc94d);
  const danger = emissive(0xff3b56);
  piece(g, round, shell, 0, 0.37, 0, 0.3, 0.72, 0.3);
  piece(g, round, iron, 0, 0.08, 0, 0.315, 0.07, 0.315);
  piece(g, round, iron, 0, 0.68, 0, 0.315, 0.07, 0.315);
  const glowBand = piece(g, round, warn, 0, 0.38, 0, 0.318, 0.13, 0.318);
  const cap = piece(g, octa, danger, 0, 0.8, 0, 0.1, 0.1, 0.1);
  return { root: g, glowBand, cap };
}

export function rubberDuck(parent) {
  // Gold-rote Billard-Pfand-Dose als Ricochet-Projektil
  const can = new THREE.Group();
  const brass = brassMaterial(PALETTE.brass);
  const red = emissive(PALETTE.vermilion);
  piece(can, round, brass, 0, 0.12, 0, 0.11, 0.22, 0.11);
  piece(can, round, red, 0, 0.12, 0, 0.115, 0.11, 0.115);
  parent.add(can);
  return can;
}

export function magnetPickupModel(parent) {
  // Leuchtender Cyan-Pfand-Magnet mit Hufeisen-Polen & Boden-Halo (klar unterscheidbar von Spezi-Dosen)
  const g = new THREE.Group();
  const body = material(0x16324f, 0.32, 0.45);
  const cyanGlow = emissive(PALETTE.glacier);
  const redPole = emissive(PALETTE.vermilion);
  const silver = material(0xe4f2ff, 0.25, 0.6);

  // Hufeisen-Magnet (U-Form)
  piece(g, solid, redPole, 0, 0.18, 0, 0.34, 0.1, 0.12);
  piece(g, solid, redPole, -0.14, 0.32, 0, 0.09, 0.24, 0.12);
  piece(g, solid, redPole, 0.14, 0.32, 0, 0.09, 0.24, 0.12);
  piece(g, solid, silver, -0.14, 0.46, 0, 0.095, 0.09, 0.125);
  piece(g, solid, silver, 0.14, 0.46, 0, 0.095, 0.09, 0.125);
  piece(g, octa, cyanGlow, 0, 0.46, 0, 0.075, 0.075, 0.075);
  piece(g, round, body, 0, 0.06, 0, 0.22, 0.06, 0.22);
  band(g, cyanGlow, 0, 0.04, 0, 0.38);

  if (parent) parent.add(g);
  return g;
}

export function megaDuckModel(parent) {
  // Echte leuchtend gelbe Mega-Quietscheente mit orangem Schnabel, Flügeln & Gold-Halo!
  const duck = new THREE.Group();
  const yellow = material(0xffe135, 0.32, 0.08);
  const yellowGlow = emissive(0xffea59);
  const beak = emissive(0xff6b1a);
  const eyeMat = material(0x0b0c14, 0.2, 0.1);
  const halo = emissive(0xffe082);

  // Runder Entenkörper & Schwanzspitze
  piece(duck, orb, yellow, 0, 0.2, 0, 0.28, 0.22, 0.34);
  piece(duck, tapered, yellow, 0, 0.3, -0.28, 0.1, 0.16, 0.12).rotation.x = -0.65;
  // Flügelchen links & rechts
  for (const side of [-1, 1]) {
    piece(duck, orb, yellowGlow, side * 0.25, 0.22, -0.02, 0.09, 0.12, 0.2);
  }
  // Runder Kopf, Kulleraugen & breiter Entenschnabel
  piece(duck, orb, yellowGlow, 0, 0.44, 0.16, 0.2, 0.19, 0.2);
  piece(duck, solid, beak, 0, 0.41, 0.36, 0.16, 0.075, 0.14);
  piece(duck, solid, beak, 0, 0.37, 0.34, 0.13, 0.04, 0.11);
  for (const side of [-1, 1]) {
    piece(duck, orb, eyeMat, side * 0.11, 0.49, 0.29, 0.04, 0.04, 0.04);
  }
  // Goldener Boden-Halo damit die Ente im Gewühl sofort leuchtet
  band(duck, halo, 0, 0.04, 0, 0.44);
  if (parent) parent.add(duck);
  return duck;
}
