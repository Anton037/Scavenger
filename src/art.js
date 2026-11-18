import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const TAU = Math.PI * 2;
export const color = (hex) => new THREE.Color(hex);

export const PALETTE = {
  ink: 0x101c20,
  slate: 0x283f46,
  ivory: 0xf5e5c9,
  brass: 0xe5b878,
  copper: 0xc98860,
  jade: 0x91c9b4,
  glacier: 0xbacfd9,
  lavender: 0xc0a6db,
  vermilion: 0xf08e70,
};

export const material = (hex, roughness = 0.34, metalness = 0.12, clearcoat = 0.55) => (
  new THREE.MeshPhysicalMaterial({
    color: hex,
    roughness,
    metalness,
    clearcoat,
    clearcoatRoughness: 0.2,
  })
);

export const brassMaterial = (hex = PALETTE.brass) => (
  new THREE.MeshStandardMaterial({ color: hex, roughness: 0.24, metalness: 0.82 })
);

export const emissive = (hex) => new THREE.MeshBasicMaterial({ color: hex });
export const solid = new THREE.BoxGeometry(1, 1, 1);
export const round = new THREE.CylinderGeometry(1, 1, 1, 20);
export const tapered = new THREE.CylinderGeometry(0.76, 1, 1, 20);
export const orb = new THREE.SphereGeometry(1, 24, 18);
export const octa = new THREE.OctahedronGeometry(1, 0);
export const hoop = new THREE.TorusGeometry(1, 0.028, 8, 36);

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

export function studioEnv(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = color(0x16272c);
  const top = new THREE.Mesh(orb, emissive(0xd8e8ee));
  top.position.set(0, 8, 0);
  top.scale.set(6, 1.5, 6);
  const warm = new THREE.Mesh(orb, emissive(0xf2be84));
  warm.position.set(6, 3, 5);
  warm.scale.set(3, 3, 3);
  const cool = new THREE.Mesh(orb, emissive(0x6ba4b8));
  cool.position.set(-6, 2, -5);
  cool.scale.set(4, 3, 4);
  envScene.add(top, warm, cool);
  const texture = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();
  return texture;
}

export function surfaceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const random = randomFrom(77);

  const grad = ctx.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#b5c2c7');
  grad.addColorStop(0.5, '#a7b5ba');
  grad.addColorStop(1, '#98a7ad');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 65; i++) {
    const x = random() * 256;
    const z = random() * 256;
    const r = random() * 38 + 12;
    const blot = ctx.createRadialGradient(x, z, 0, x, z, r);
    const tone = random() > 0.5 ? '235, 245, 248' : '40, 63, 70';
    blot.addColorStop(0, `rgba(${tone}, 0.035)`);
    blot.addColorStop(1, `rgba(${tone}, 0)`);
    ctx.fillStyle = blot;
    ctx.fillRect(x - r, z - r, r * 2, r * 2);
  }

  ctx.strokeStyle = '#101c20';
  ctx.lineWidth = 5;
  ctx.strokeRect(2.5, 2.5, 251, 251);

  ctx.strokeStyle = 'rgba(245, 229, 201, 0.24)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(6, 6, 244, 244);

  ctx.strokeStyle = 'rgba(229, 184, 120, 0.22)';
  ctx.lineWidth = 1.1;
  ctx.strokeRect(14, 14, 228, 228);

  ctx.fillStyle = 'rgba(229, 184, 120, 0.32)';
  for (const [cx, cy] of [[14, 14], [242, 14], [14, 242], [242, 242]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, TAU);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
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
    piece(crown, octa, gold, Math.cos(a) * 0.34, 0, Math.sin(a) * 0.34, 0.08, 0.08, 0.08).rotation.set(0.4, a, 0.4);
  }
  parent.add(crown);
  return crown;
}

export function diver() {
  // Chef Torge: Groß, breit gebaut ("der überlegene Chef") mit Chef-Jacke, Sonnenbrille, goldener Krone & Klatscher
  const root = new THREE.Group();
  const skin = material(PALETTE.ivory, 0.28, 0.06, 0.72);
  const chefJacket = material(0x9e3528, 0.32, 0.12, 0.65);
  const darkPants = material(PALETTE.slate, 0.34, 0.16, 0.55);
  const shades = material(PALETTE.ink, 0.1, 0.5, 0.92);
  const brass = brassMaterial(PALETTE.brass);
  const copper = brassMaterial(PALETTE.copper);
  const glow = emissive(0xffcf8b);

  const body = new THREE.Group();
  body.scale.set(1.12, 1.18, 1.12);
  root.add(body);

  // Breiter athletischer Oberkörper & Chef-Jacke mit Goldkette
  piece(body, tapered, darkPants, 0, 0.36, 0, 0.22, 0.36, 0.2);
  piece(body, tapered, chefJacket, 0, 0.56, 0, 0.38, 0.36, 0.28);
  band(body, brass, 0, 0.66, 0.02, 0.26);

  // Kopf & coole Chef-Sonnenbrille
  piece(body, orb, skin, 0, 0.88, 0, 0.22, 0.24, 0.22);
  piece(body, solid, shades, 0, 0.9, 0.19, 0.28, 0.08, 0.08);

  // Goldene Chef-Krone (fällt beim ersten Treffer ab)
  const helmet = new THREE.Group();
  body.add(helmet);
  piece(helmet, round, brass, 0, 1.06, 0, 0.17, 0.06, 0.17);
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4;
    piece(helmet, octa, brass, Math.cos(a) * 0.12, 1.12, Math.sin(a) * 0.12, 0.045, 0.07, 0.045);
  }

  // Breite Schultern & kräftige Arme
  for (const side of [-1, 1]) {
    piece(body, orb, chefJacket, side * 0.34, 0.64, 0, 0.13, 0.15, 0.13);
    piece(body, tapered, skin, side * 0.36, 0.46, 0.06, 0.08, 0.24, 0.08);
  }

  // Beine & Sneaker
  const legs = [-1, 1].map((side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.12, 0.28, 0);
    piece(leg, tapered, darkPants, 0, -0.1, 0, 0.085, 0.24, 0.085);
    piece(leg, solid, skin, 0, -0.216, 0.04, 0.13, 0.09, 0.21);
    root.add(leg);
    return leg;
  });

  // Taschenlampe rechts
  const lamp = new THREE.Group();
  lamp.position.set(0.34, 0.44, 0.18);
  body.add(lamp);
  piece(lamp, round, brass, 0, 0, 0, 0.075, 0.16, 0.075).rotation.x = Math.PI / 2;
  const bulb = piece(lamp, orb, glow, 0, 0, 0.09, 0.065, 0.065, 0.065);

  // Goldener Chef-Klatscher links
  const wrench = new THREE.Group();
  wrench.position.set(-0.36, 0.48, 0.14);
  body.add(wrench);
  piece(wrench, round, copper, 0, 0.12, 0.1, 0.045, 0.38, 0.045).rotation.x = Math.PI / 3;
  piece(wrench, solid, brass, 0, 0.24, 0.24, 0.18, 0.14, 0.22);

  return { root, body, bulb, legs, wrench, helmet };
}

export function dredged() {
  // Anton: Extrem groß & schlaksig (Slenderman-Statur) und öfter komplett lost!
  const root = new THREE.Group();
  const darkSuit = material(0x1b2b30, 0.3, 0.15, 0.72);
  const paleSkin = material(PALETTE.glacier, 0.24, 0.1, 0.82);
  const brass = brassMaterial(PALETTE.brass);
  const eyeGlow = emissive(PALETTE.vermilion);
  const core = new THREE.Group();
  root.add(core);

  // Ellenlange, dünne Slenderman-Beine & extrem hoher, dürrer Oberkörper
  for (const side of [-1, 1]) {
    piece(core, tapered, darkSuit, side * 0.12, 0.45, 0, 0.065, 0.9, 0.065);
  }
  piece(core, tapered, darkSuit, 0, 1.24, 0, 0.19, 0.88, 0.16);
  // Schmale Krawatte / Revers
  piece(core, solid, brass, 0, 1.28, 0.15, 0.05, 0.48, 0.03);

  // Schief gelegter, verwirrter Slenderman-Kopf ("komplett lost")
  const mask = new THREE.Group();
  mask.position.set(0, 1.82, 0.06);
  mask.rotation.z = 0.22;
  core.add(mask);
  piece(mask, orb, paleSkin, 0, 0, 0, 0.2, 0.28, 0.2);
  // Zwei ungleich große, verwirrte Leuchtaugen
  piece(mask, orb, eyeGlow, -0.07, 0.03, 0.17, 0.045, 0.045, 0.03);
  piece(mask, orb, eyeGlow, 0.07, -0.02, 0.17, 0.03, 0.03, 0.03);
  // Schwebender Verwirrungs-Ring über Antons Kopf
  band(mask, brass, 0, 0.34, 0, 0.22);

  // Überlange, schlaksig herunterhängende Slenderman-Arme
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.26, 1.58, 0);
    piece(arm, tapered, darkSuit, side * 0.08, -0.45, 0, 0.055, 0.95, 0.055).rotation.z = side * 0.14;
    piece(arm, orb, paleSkin, side * 0.15, -0.94, 0, 0.07, 0.12, 0.07);
    core.add(arm);
    return arm;
  });

  const stars = stunStars(root, 2.25);
  return { root, core, mask, arms, stars };
}

export function haukeBoss() {
  // Boss Hauke: "Massiv rund" – gewaltige Kugel-Wampe, dicke Backen, Gürtelschnalle & wuchtige Arme!
  const root = new THREE.Group();
  const hoodie = material(0x6e322c, 0.28, 0.14, 0.78);
  const skin = material(PALETTE.ivory, 0.26, 0.08, 0.76);
  const pants = material(PALETTE.slate, 0.34, 0.16, 0.6);
  const brass = brassMaterial(PALETTE.brass);
  const eyeGlow = emissive(PALETTE.vermilion);
  const core = new THREE.Group();
  root.add(core);

  // Kurze, stämmige Stampfer-Beine
  for (const side of [-1, 1]) {
    piece(core, round, pants, side * 0.36, 0.22, 0, 0.22, 0.42, 0.22);
    piece(core, solid, brass, side * 0.36, 0.06, 0.08, 0.26, 0.12, 0.34);
  }

  // MASSIV RUNDE WAMPE (Haukes Markenzeichen!)
  piece(core, orb, hoodie, 0, 0.82, 0.06, 0.92, 0.78, 0.92);
  // Gewaltiger Gürtel mit goldener Schnalle um den Bauch
  band(core, brass, 0, 0.56, 0.06, 0.88);
  piece(core, solid, brass, 0, 0.56, 0.92, 0.26, 0.18, 0.08);

  // Runder Kopf mit dicken Backen & Kappe
  const mask = new THREE.Group();
  mask.position.set(0, 1.54, 0.18);
  core.add(mask);
  piece(mask, orb, skin, 0, 0, 0, 0.36, 0.32, 0.36);
  // Dicke Pausbacken
  for (const side of [-1, 1]) {
    piece(mask, orb, skin, side * 0.24, -0.06, 0.14, 0.16, 0.14, 0.15);
    piece(mask, orb, eyeGlow, side * 0.12, 0.05, 0.31, 0.055, 0.045, 0.03);
  }
  // Kleine Kappe oben auf dem runden Kopf
  piece(mask, orb, hoodie, 0, 0.18, 0, 0.32, 0.16, 0.32);
  piece(mask, solid, brass, 0, 0.14, 0.28, 0.28, 0.04, 0.22);

  // Dicke, runde Oberarme links und rechts
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.86, 0.92, 0.12);
    piece(arm, orb, hoodie, 0, 0, 0, 0.28, 0.36, 0.28);
    piece(arm, orb, skin, side * 0.08, -0.32, 0.14, 0.18, 0.18, 0.18);
    core.add(arm);
    return arm;
  });

  const stars = stunStars(root, 2.02);
  return { root, core, mask, arms, stars };
}

export function greedyTom() {
  // Tom: "Einfach Tom" – kleiner, geduckter Schnorrer im Hoodie mit umgedrehter Cap, Beutesack & Gier-Händen
  const root = new THREE.Group();
  const hoodie = material(0x2d6b59, 0.26, 0.14, 0.78);
  const skin = material(PALETTE.ivory, 0.28, 0.08, 0.74);
  const bag = material(PALETTE.copper, 0.34, 0.22, 0.65);
  const brass = brassMaterial(PALETTE.brass);
  const eyeGlow = emissive(PALETTE.ivory);
  const core = new THREE.Group();
  root.add(core);

  // Geduckter Schnorrer-Torso & praller Beute-Rucksack auf dem Rücken
  piece(core, tapered, hoodie, 0, 0.42, 0.04, 0.28, 0.52, 0.26).rotation.x = 0.35;
  piece(core, orb, bag, 0, 0.56, -0.24, 0.28, 0.32, 0.26);
  piece(core, round, brass, 0, 0.82, -0.24, 0.11, 0.16, 0.11);

  // Kopf mit frechem Grinsen & umgedrehter Cap
  const mask = new THREE.Group();
  mask.position.set(0, 0.78, 0.22);
  core.add(mask);
  piece(mask, orb, skin, 0, 0, 0, 0.21, 0.21, 0.21);
  piece(mask, orb, brass, 0, 0.1, -0.02, 0.22, 0.12, 0.22);
  piece(mask, solid, brass, 0, 0.08, -0.22, 0.18, 0.035, 0.16);
  for (const side of [-1, 1]) {
    piece(mask, orb, eyeGlow, side * 0.08, 0.02, 0.18, 0.04, 0.04, 0.03);
  }

  // Nach vorne ausgestreckte Schnorrer-Hände
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.28, 0.52, 0.16);
    piece(arm, tapered, hoodie, 0, -0.06, 0.14, 0.075, 0.28, 0.075).rotation.x = Math.PI / 2.6;
    piece(arm, orb, skin, 0, -0.12, 0.28, 0.085, 0.085, 0.085);
    core.add(arm);
    return arm;
  });

  const stars = stunStars(root, 1.18);
  return { root, core, mask, arms, stars };
}

export function rubberDuck(parent) {
  // Goldene Pfand-Dose zum Ablenken von Anton & Hauke
  const can = new THREE.Group();
  const brass = brassMaterial(PALETTE.brass);
  const red = material(PALETTE.vermilion, 0.25, 0.2, 0.8);
  piece(can, round, brass, 0, 0.12, 0, 0.1, 0.22, 0.1);
  piece(can, round, red, 0, 0.12, 0, 0.104, 0.11, 0.104);
  parent.add(can);
  return can;
}
