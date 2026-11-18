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

export const material = (hex, roughness = 0.55, metalness = 0.12) => (
  new THREE.MeshStandardMaterial({
    color: hex,
    roughness,
    metalness,
    flatShading: true,
  })
);

export const brassMaterial = (hex = PALETTE.brass) => (
  new THREE.MeshStandardMaterial({ color: hex, roughness: 0.35, metalness: 0.72, flatShading: true })
);

export const emissive = (hex) => new THREE.MeshBasicMaterial({ color: hex });
export const solid = new THREE.BoxGeometry(1, 1, 1);
export const round = new THREE.CylinderGeometry(1, 1, 1, 12);
export const tapered = new THREE.CylinderGeometry(0.76, 1, 1, 12);
export const orb = new THREE.SphereGeometry(1, 14, 10);
export const octa = new THREE.OctahedronGeometry(1, 0);
export const hoop = new THREE.TorusGeometry(1, 0.035, 6, 24);

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

  // Grundton: Kontrastreiches Dungeon-Gestein (damit Fliesen im Lichtkegel klar leuchten)
  ctx.fillStyle = '#9aa8c7';
  ctx.fillRect(0, 0, size, size);

  // Pixel-Art Stein-Muster (2x2 und 4x4 Pixel-Cluster)
  const shades = ['#8594b5', '#aebce0', '#7482a3', '#c2d0f0', '#63708f'];
  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      if (random() < 0.58) {
        ctx.fillStyle = shades[Math.floor(random() * shades.length)];
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }

  // Tiefe dunkle Pixel-Fugen (Kreuzfuge + Versatz wie im Kerker)
  ctx.fillStyle = '#252b3d';
  ctx.fillRect(0, 0, size, 3);
  ctx.fillRect(0, 0, 3, size);
  ctx.fillRect(0, 31, size, 2);
  ctx.fillRect(31, 0, 2, 32);
  ctx.fillRect(15, 32, 2, 32);

  // Helle Pixel-Kanten-Highlights (oben/links an jedem Steinblock)
  ctx.fillStyle = '#dce6ff';
  ctx.fillRect(3, 3, 27, 1);
  ctx.fillRect(3, 3, 1, 27);
  ctx.fillRect(33, 3, 29, 1);
  ctx.fillRect(3, 33, 11, 1);
  ctx.fillRect(17, 33, 44, 1);

  // Einzelne leuchtende Moos-/Runen-Pixel in den Fugen
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
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4;
    piece(crown, octa, gold, Math.cos(a) * 0.36, 0, Math.sin(a) * 0.36, 0.09, 0.09, 0.09).rotation.set(0.4, a, 0.4);
  }
  parent.add(crown);
  return crown;
}

export function diver() {
  // Chef Torge: Groß, breit gebaut ("der überlegene Chef") mit leuchtender Chef-Krone, roter Jacke & goldenem Klatscher
  const root = new THREE.Group();
  const skin = material(PALETTE.ivory, 0.45, 0.05);
  const chefJacket = material(0xd9383a, 0.42, 0.12);
  const darkPants = material(0x1b2234, 0.5, 0.15);
  const shades = emissive(0x73d7ff);
  const brass = brassMaterial(PALETTE.brass);
  const copper = brassMaterial(PALETTE.copper);
  const glow = emissive(0xffe082);

  const body = new THREE.Group();
  body.scale.set(1.15, 1.2, 1.15);
  root.add(body);

  // Athletischer Oberkörper & rote Chef-Jacke mit Goldkette
  piece(body, tapered, darkPants, 0, 0.36, 0, 0.23, 0.36, 0.21);
  piece(body, tapered, chefJacket, 0, 0.56, 0, 0.4, 0.38, 0.3);
  band(body, brass, 0, 0.66, 0.02, 0.27);

  // Kopf & leuchtendes Cyan-Visier / coole Brille
  piece(body, orb, skin, 0, 0.88, 0, 0.23, 0.24, 0.23);
  piece(body, solid, shades, 0, 0.9, 0.19, 0.28, 0.075, 0.08);

  // Goldene Chef-Krone
  const helmet = new THREE.Group();
  body.add(helmet);
  piece(helmet, round, brass, 0, 1.06, 0, 0.18, 0.065, 0.18);
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4;
    piece(helmet, octa, glow, Math.cos(a) * 0.13, 1.13, Math.sin(a) * 0.13, 0.05, 0.08, 0.05);
  }

  // Breite Schultern & kräftige Arme
  for (const side of [-1, 1]) {
    piece(body, orb, chefJacket, side * 0.35, 0.64, 0, 0.14, 0.16, 0.14);
    piece(body, tapered, skin, side * 0.37, 0.46, 0.06, 0.085, 0.24, 0.085);
  }

  // Beine & helle Sneaker
  const legs = [-1, 1].map((side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.125, 0.28, 0);
    piece(leg, tapered, darkPants, 0, -0.1, 0, 0.088, 0.24, 0.088);
    piece(leg, solid, skin, 0, -0.216, 0.04, 0.135, 0.095, 0.22);
    root.add(leg);
    return leg;
  });

  // Taschenlampe rechts
  const lamp = new THREE.Group();
  lamp.position.set(0.35, 0.44, 0.19);
  body.add(lamp);
  piece(lamp, round, brass, 0, 0, 0, 0.08, 0.18, 0.08).rotation.x = Math.PI / 2;
  const bulb = piece(lamp, orb, glow, 0, 0, 0.1, 0.075, 0.075, 0.075);

  // Goldener Chef-Klatscher links
  const wrench = new THREE.Group();
  wrench.position.set(-0.37, 0.48, 0.15);
  body.add(wrench);
  piece(wrench, round, copper, 0, 0.12, 0.1, 0.05, 0.4, 0.05).rotation.x = Math.PI / 3;
  piece(wrench, solid, brass, 0, 0.26, 0.26, 0.21, 0.16, 0.24);
  piece(wrench, octa, glow, 0, 0.26, 0.36, 0.08, 0.08, 0.08);

  return { root, body, bulb, legs, wrench, helmet };
}

export function dredged() {
  // Anton: Extrem groß & dürr (Slenderman-Statur) und öfter komplett lost!
  const root = new THREE.Group();
  const darkSuit = material(0x161926, 0.5, 0.15);
  const paleSkin = material(0xd8e6f2, 0.38, 0.08);
  const brass = brassMaterial(PALETTE.brass);
  const eyeGlow = emissive(0xff2a4b);
  const core = new THREE.Group();
  root.add(core);

  // Ellenlange, dünne Slenderman-Beine & extrem hoher, dürrer Oberkörper
  for (const side of [-1, 1]) {
    piece(core, tapered, darkSuit, side * 0.12, 0.46, 0, 0.068, 0.92, 0.068);
  }
  piece(core, tapered, darkSuit, 0, 1.26, 0, 0.2, 0.9, 0.17);
  // Rote Krawatte
  piece(core, solid, material(0xb82538, 0.4, 0.1), 0, 1.28, 0.16, 0.055, 0.5, 0.03);

  // Schief gelegter, verwirrter Slenderman-Kopf ("komplett lost")
  const mask = new THREE.Group();
  mask.position.set(0, 1.85, 0.07);
  mask.rotation.z = 0.24;
  core.add(mask);
  piece(mask, orb, paleSkin, 0, 0, 0, 0.21, 0.29, 0.21);

  // Leuchtende Augen (blitzen im Dunkeln auf!)
  const eyes = new THREE.Group();
  mask.add(eyes);
  piece(eyes, orb, eyeGlow, -0.075, 0.03, 0.18, 0.055, 0.055, 0.04);
  piece(eyes, orb, eyeGlow, 0.075, -0.02, 0.18, 0.04, 0.04, 0.04);
  band(mask, brass, 0, 0.35, 0, 0.23);

  // Überlange, schlaksig herunterhängende Slenderman-Arme
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.27, 1.6, 0);
    piece(arm, tapered, darkSuit, side * 0.08, -0.46, 0, 0.058, 0.96, 0.058).rotation.z = side * 0.14;
    piece(arm, orb, paleSkin, side * 0.15, -0.95, 0, 0.075, 0.13, 0.075);
    core.add(arm);
    return arm;
  });

  const stars = stunStars(root, 2.28);
  return { root, core, mask, arms, stars, eyes };
}

export function haukeBoss() {
  // Boss Hauke: "Massiv rund" – gewaltige Kugel-Wampe, dicke Backen, Gürtelschnalle & wuchtige Arme!
  const root = new THREE.Group();
  const hoodie = material(0x9e2a3b, 0.42, 0.15);
  const skin = material(PALETTE.ivory, 0.4, 0.08);
  const pants = material(0x1f263b, 0.5, 0.15);
  const brass = brassMaterial(PALETTE.brass);
  const eyeGlow = emissive(0xffb84d);
  const core = new THREE.Group();
  root.add(core);

  // Kurze, stämmige Stampfer-Beine
  for (const side of [-1, 1]) {
    piece(core, round, pants, side * 0.38, 0.22, 0, 0.23, 0.42, 0.23);
    piece(core, solid, brass, side * 0.38, 0.06, 0.08, 0.27, 0.12, 0.35);
  }

  // MASSIV RUNDE WAMPE (Haukes Markenzeichen!)
  const belly = piece(core, orb, hoodie, 0, 0.84, 0.06, 0.96, 0.82, 0.96);
  // Gewaltiger Gürtel mit goldener Schnalle um den Bauch
  band(core, brass, 0, 0.56, 0.06, 0.92);
  piece(core, solid, brass, 0, 0.56, 0.96, 0.28, 0.19, 0.09);

  // Runder Kopf mit dicken Backen & Kappe
  const mask = new THREE.Group();
  mask.position.set(0, 1.58, 0.18);
  core.add(mask);
  piece(mask, orb, skin, 0, 0, 0, 0.38, 0.33, 0.38);

  const eyes = new THREE.Group();
  mask.add(eyes);
  for (const side of [-1, 1]) {
    piece(mask, orb, skin, side * 0.25, -0.06, 0.15, 0.17, 0.15, 0.16);
    piece(eyes, orb, eyeGlow, side * 0.13, 0.05, 0.33, 0.065, 0.055, 0.04);
  }
  // Kleine Kappe oben auf dem runden Kopf
  piece(mask, orb, hoodie, 0, 0.19, 0, 0.33, 0.16, 0.33);
  piece(mask, solid, brass, 0, 0.15, 0.3, 0.29, 0.045, 0.23);

  // Dicke, runde Oberarme links und rechts
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.9, 0.94, 0.12);
    piece(arm, orb, hoodie, 0, 0, 0, 0.3, 0.38, 0.3);
    piece(arm, orb, skin, side * 0.08, -0.34, 0.15, 0.19, 0.19, 0.19);
    core.add(arm);
    return arm;
  });

  const stars = stunStars(root, 2.08);
  return { root, core, mask, arms, stars, eyes, belly };
}

export function greedyTom() {
  // Tom: "Einfach Tom" – kleiner, geduckter Schnorrer im Hoodie mit umgedrehter Cap, Beutesack & Gier-Händen
  const root = new THREE.Group();
  const hoodie = material(0x1f8a65, 0.42, 0.12);
  const skin = material(PALETTE.ivory, 0.4, 0.08);
  const bag = material(PALETTE.copper, 0.45, 0.2);
  const brass = brassMaterial(PALETTE.brass);
  const eyeGlow = emissive(PALETTE.jade);
  const core = new THREE.Group();
  root.add(core);

  // Geduckter Schnorrer-Torso & praller Beute-Rucksack auf dem Rücken
  piece(core, tapered, hoodie, 0, 0.42, 0.04, 0.29, 0.52, 0.27).rotation.x = 0.35;
  piece(core, orb, bag, 0, 0.56, -0.25, 0.29, 0.33, 0.27);
  piece(core, round, brass, 0, 0.83, -0.25, 0.12, 0.16, 0.12);

  // Kopf mit frechem Grinsen & umgedrehter Cap
  const mask = new THREE.Group();
  mask.position.set(0, 0.78, 0.22);
  core.add(mask);
  piece(mask, orb, skin, 0, 0, 0, 0.22, 0.22, 0.22);
  piece(mask, orb, brass, 0, 0.1, -0.02, 0.23, 0.12, 0.23);
  piece(mask, solid, brass, 0, 0.08, -0.23, 0.19, 0.04, 0.17);

  const eyes = new THREE.Group();
  mask.add(eyes);
  for (const side of [-1, 1]) {
    piece(eyes, orb, eyeGlow, side * 0.085, 0.02, 0.19, 0.05, 0.05, 0.035);
  }

  // Nach vorne ausgestreckte Schnorrer-Hände
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.29, 0.52, 0.16);
    piece(arm, tapered, hoodie, 0, -0.06, 0.14, 0.08, 0.28, 0.08).rotation.x = Math.PI / 2.6;
    piece(arm, orb, skin, 0, -0.12, 0.29, 0.09, 0.09, 0.09);
    core.add(arm);
    return arm;
  });

  const stars = stunStars(root, 1.2);
  return { root, core, mask, arms, stars, eyes };
}

export function rubberDuck(parent) {
  // Goldene Pfand-Dose zum Ablenken von Anton & Hauke
  const can = new THREE.Group();
  const brass = brassMaterial(PALETTE.brass);
  const red = emissive(PALETTE.vermilion);
  piece(can, round, brass, 0, 0.12, 0, 0.11, 0.22, 0.11);
  piece(can, round, red, 0, 0.12, 0, 0.115, 0.11, 0.115);
  parent.add(can);
  return can;
}
