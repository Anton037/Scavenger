import * as THREE from 'three';
import { speziCanMesh } from './characters3d.js';
import {
  band,
  brassMaterial,
  emissive,
  material,
  orb,
  PALETTE,
  piece,
  randomFrom,
  round,
  solid,
  tapered,
  TAU,
} from './primitives.js';
import { makeCanvasTexture, receiptPaperTexture, steamGaugeDialTexture } from './textures.js';

export const speziModel = speziCanMesh;

export function miniDuckModel() {
  const g = new THREE.Group();
  const yellow = material(0xffd633, 0.35, 0.1);
  const orange = material(0xff6b22, 0.4, 0.08);
  const black = material(0x0d0e14, 0.2, 0.1);
  piece(g, orb, yellow, 0, 0.075, 0, 0.095, 0.075, 0.115, { shadow: false });
  piece(g, orb, yellow, 0, 0.155, 0.055, 0.07, 0.068, 0.07, { shadow: false });
  piece(g, solid, orange, 0, 0.145, 0.12, 0.058, 0.025, 0.05, { shadow: false });
  piece(g, orb, black, -0.032, 0.17, 0.108, 0.012, 0.012, 0.012, { shadow: false });
  piece(g, orb, black, 0.032, 0.17, 0.108, 0.012, 0.012, 0.012, { shadow: false });
  return g;
}

export function officePhoneModel() {
  const root = new THREE.Group();
  const body = material(0x1b1f2c, 0.42, 0.25);
  const accent = material(0x2d354a, 0.45, 0.3);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x38141a });
  piece(root, solid, body, 0, 0.055, 0, 0.32, 0.11, 0.26, { shadow: true });
  piece(root, solid, accent, 0, 0.12, -0.05, 0.28, 0.04, 0.12, { shadow: false });
  const handset = new THREE.Group();
  handset.position.set(0, 0.155, -0.05);
  piece(handset, round, body, 0, 0, 0, 0.032, 0.36, 0.032, { shadow: false }).rotation.z = Math.PI / 2;
  piece(handset, orb, body, -0.16, -0.015, 0, 0.052, 0.042, 0.052, { shadow: false });
  piece(handset, orb, body, 0.16, -0.015, 0, 0.052, 0.042, 0.052, { shadow: false });
  root.add(handset);
  piece(root, solid, accent, 0, 0.112, 0.06, 0.16, 0.012, 0.11, { shadow: false });
  const led = piece(root, orb, ledMat, 0.11, 0.12, 0.08, 0.018, 0.018, 0.018);
  return { root, led, ledMat };
}

/**
 * NEW Tealerland-inspired 3D Steam Manometer + Clickable Red Exhaust Handwheel + Rising Steam Puffs!
 */
export function steamValveAssemblyModel() {
  const root = new THREE.Group();
  root.userData.propKind = 'valve';

  const brass = brassMaterial(PALETTE.brass);
  const copper = brassMaterial(PALETTE.copper);
  const darkIron = material(0x1b2130, 0.42, 0.65);
  const redValve = material(0xd9283e, 0.32, 0.45);
  const dialFaceMat = new THREE.MeshBasicMaterial({ map: steamGaugeDialTexture() });
  const needleMat = emissive(0xff2038);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x1e4a38 });
  const steamMat = new THREE.MeshBasicMaterial({
    color: 0xf4eee2,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });

  // Heavy base & vertical brass boiler pipe
  piece(root, solid, darkIron, 0, 0.025, 0, 0.24, 0.05, 0.22, { shadow: false });
  piece(root, round, copper, -0.04, 0.22, -0.03, 0.035, 0.40, 0.035, { shadow: true });
  piece(root, round, brass, -0.04, 0.40, -0.03, 0.055, 0.04, 0.055, { shadow: false });

  // Pressure dial gauge housing facing player
  piece(root, round, brass, -0.04, 0.49, -0.02, 0.115, 0.055, 0.115, { shadow: true }).rotation.x = Math.PI / 2;
  piece(root, round, dialFaceMat, -0.04, 0.49, 0.01, 0.098, 0.01, 0.098, { shadow: false }).rotation.x = Math.PI / 2;

  const needlePivot = new THREE.Group();
  needlePivot.position.set(-0.04, 0.49, 0.022);
  piece(needlePivot, solid, needleMat, 0, 0.032, 0, 0.012, 0.068, 0.008);
  piece(needlePivot, orb, darkIron, 0, 0, 0.004, 0.016, 0.016, 0.01, { shadow: false });
  root.add(needlePivot);

  // Warning beacon bulb on top of gauge
  const led = piece(root, orb, ledMat, -0.04, 0.625, -0.01, 0.026, 0.032, 0.026);

  // Red cast-iron clickable valve handwheel on front pipe tee!
  piece(root, round, brass, 0.03, 0.22, 0.04, 0.032, 0.12, 0.032, { shadow: false }).rotation.x = Math.PI / 2;
  const wheel = new THREE.Group();
  wheel.position.set(0.03, 0.22, 0.11);
  const rim = band(wheel, redValve, 0, 0, 0, 0.105);
  rim.rotation.x = 0;
  for (let i = 0; i < 4; i++) {
    const spoke = piece(wheel, solid, redValve, 0, 0, 0, 0.018, 0.20, 0.018, { shadow: false });
    spoke.rotation.z = (i * Math.PI) / 4;
  }
  piece(wheel, orb, brass, 0, 0, 0.012, 0.028, 0.028, 0.024, { shadow: false });
  root.add(wheel);

  // Rising 3D steam puffs above exhaust nozzle
  const puffs = [];
  for (let i = 0; i < 5; i++) {
    const puff = piece(root, orb, steamMat.clone(), -0.04, 0.44 + i * 0.1, -0.05, 0.06, 0.05, 0.06, { shadow: false, receive: false });
    puff.visible = false;
    puffs.push(puff);
  }

  return { root, wheel, needlePivot, led, ledMat, puffs };
}

/**
 * NEW 3D Thermal Receipt / Nacht-Bon Printer on right side of desk!
 */
export function bonPrinterModel() {
  const root = new THREE.Group();
  root.userData.propKind = 'printer';

  const body = material(0x1b2030, 0.38, 0.45);
  const slotMat = material(0x0a0c12, 0.85, 0.1);
  const stampBtnMat = material(0xd49b2a, 0.32, 0.55);
  const lcdMat = new THREE.MeshBasicMaterial({ color: 0x164236 });
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x204034 });
  const paperMat = new THREE.MeshStandardMaterial({
    map: receiptPaperTexture(),
    roughness: 0.75,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  // Compact POS thermal printer chassis
  piece(root, solid, body, 0, 0.075, 0, 0.28, 0.15, 0.25, { shadow: true });
  piece(root, solid, body, 0, 0.155, -0.03, 0.25, 0.05, 0.16, { shadow: false });
  // Cutter slot
  piece(root, solid, slotMat, 0, 0.181, -0.02, 0.19, 0.008, 0.025, { shadow: false });
  // Front LCD strip & Stamp button + Status LED
  const lcd = piece(root, solid, lcdMat, -0.025, 0.115, 0.126, 0.15, 0.042, 0.008);
  const stampBtn = piece(root, solid, stampBtnMat, 0.088, 0.115, 0.128, 0.048, 0.042, 0.018, { shadow: false });
  const led = piece(root, orb, ledMat, 0.095, 0.162, 0.06, 0.018, 0.018, 0.018);

  // Sliding 3D paper receipt emerging from top slot!
  const paperGroup = new THREE.Group();
  paperGroup.position.set(0, 0.18, -0.02);
  const paperMesh = piece(paperGroup, solid, paperMat, 0, 0.12, 0, 0.16, 0.24, 0.005, { shadow: false });
  paperMesh.rotation.x = -0.14;
  paperGroup.visible = false;
  root.add(paperGroup);

  return { root, paperGroup, lcd, lcdMat, led, ledMat, stampBtn };
}

/**
 * Volumetric 3D hallway steam cloud when firing a Flur-Dampfstoß on CAM 2B / 4B!
 */
export function hallSteamCloudModel() {
  const group = new THREE.Group();
  const rng = randomFrom(777);
  const puffs = [];
  for (let i = 0; i < 9; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xdbeee8,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    const m = piece(
      group,
      orb,
      mat,
      (rng() - 0.5) * 2.2,
      0.55 + rng() * 1.65,
      -1.2 + (rng() - 0.5) * 1.8,
      0.45 + rng() * 0.4,
      0.35 + rng() * 0.3,
      0.45 + rng() * 0.4,
      { shadow: false, receive: false },
    );
    puffs.push(m);
  }
  group.visible = false;
  return { group, puffs };
}

export function donerSpitModel() {
  const root = new THREE.Group();
  const steel = material(0x8a9ab2, 0.28, 0.78);
  const darkSteel = material(0x283042, 0.42, 0.65);
  const meat1 = material(0x7c3e24, 0.52, 0.06);
  const meat2 = material(0x5c2b17, 0.58, 0.05);
  const coil = emissive(0xff6b2b);

  piece(root, solid, darkSteel, 0, 0.06, 0, 0.68, 0.12, 0.58, { shadow: true });
  piece(root, solid, steel, 0, 0.72, -0.24, 0.62, 1.24, 0.1, { shadow: true });
  for (let i = 0; i < 3; i++) {
    piece(root, solid, coil, 0, 0.38 + i * 0.32, -0.18, 0.44, 0.16, 0.03);
  }
  const spit = new THREE.Group();
  spit.position.set(0, 0.12, 0.04);
  piece(spit, round, steel, 0, 0.62, 0, 0.035, 1.26, 0.035, { shadow: false });
  piece(spit, round, steel, 0, 0.16, 0, 0.24, 0.03, 0.24, { shadow: false });
  piece(spit, tapered, meat1, 0, 0.58, 0, 0.26, 0.76, 0.26, { shadow: true });
  for (let i = 0; i < 4; i++) {
    piece(spit, round, i % 2 === 0 ? meat2 : meat1, 0, 0.34 + i * 0.16, 0, 0.24 - i * 0.012, 0.05, 0.24 - i * 0.012, { shadow: false });
  }
  root.add(spit);
  return { root, spit };
}

export function deskFanModel() {
  const root = new THREE.Group();
  const darkMetal = material(0x1a2030, 0.38, 0.62);
  const cageMat = material(0x46516d, 0.32, 0.72);
  const bladeMat = material(0x283044, 0.32, 0.55);
  piece(root, round, darkMetal, 0, 0.03, 0, 0.22, 0.06, 0.22, { shadow: true });
  piece(root, solid, emissive(0x38f2af), 0.06, 0.065, 0.12, 0.03, 0.015, 0.03);
  piece(root, round, darkMetal, 0, 0.18, -0.02, 0.048, 0.28, 0.048, { shadow: false });
  piece(root, round, darkMetal, 0, 0.36, -0.05, 0.11, 0.18, 0.11, { shadow: false }).rotation.x = Math.PI / 2;

  const ringOuter = band(root, cageMat, 0, 0.36, 0.06, 0.26);
  ringOuter.rotation.x = 0;
  const ringInner = band(root, cageMat, 0, 0.36, 0.08, 0.15);
  ringInner.rotation.x = 0;
  for (let i = 0; i < 4; i++) {
    const spoke = piece(root, solid, cageMat, 0, 0.36, 0.075, 0.012, 0.5, 0.012, { shadow: false });
    spoke.rotation.z = (i * Math.PI) / 4;
  }

  const blades = new THREE.Group();
  blades.position.set(0, 0.36, 0.045);
  for (let i = 0; i < 4; i++) {
    const b = piece(blades, solid, bladeMat, 0, 0, 0, 0.105, 0.4, 0.018, { shadow: false });
    b.rotation.z = (i * Math.PI) / 4;
    b.rotation.y = 0.22;
  }
  piece(blades, orb, darkMetal, 0, 0, 0.02, 0.065, 0.065, 0.05, { shadow: false });
  root.add(blades);
  return { root, blades };
}

export function crateMesh(isGold = false) {
  const g = new THREE.Group();
  const wood = isGold ? brassMaterial(PALETTE.brass) : material(0x7c4f2b, 0.72, 0.06);
  const trim = material(0x283044, 0.45, 0.25);
  piece(g, solid, wood, 0, 0.32, 0, 0.62, 0.62, 0.62);
  piece(g, solid, trim, 0, 0.32, 0, 0.66, 0.09, 0.66, { shadow: false });
  piece(g, solid, trim, 0, 0.61, 0, 0.65, 0.07, 0.65, { shadow: false });
  piece(g, solid, trim, 0, 0.04, 0, 0.65, 0.07, 0.65, { shadow: false });
  return g;
}

export function partyGarland(parent, x1, x2, y, z) {
  const g = new THREE.Group();
  const wire = material(0x161822, 0.8, 0.1);
  const len = Math.abs(x2 - x1);
  piece(g, solid, wire, (x1 + x2) * 0.5, y, z, len, 0.025, 0.025, { shadow: false });
  const colors = [0xff3b56, 0xffb84d, 0x38f2af, 0xb85cff, 0x73d7ff, 0xf2b5c6];
  const warmBulb = emissive(0xffd27d);
  const count = Math.max(5, Math.floor(len * 2.1));
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const px = x1 + (x2 - x1) * t;
    const sag = Math.sin(t * Math.PI) * 0.28;
    const mat = material(colors[i % colors.length], 0.32, 0.48);
    piece(g, tapered, mat, px, y - sag - 0.16, z, 0.085, 0.28, 0.085, { shadow: false });
    if (i % 2 === 1) {
      piece(g, orb, warmBulb, px, y - sag - 0.04, z + 0.05, 0.048, 0.058, 0.048);
    }
  }
  parent.add(g);
  return g;
}

export function dustParticlesModel(count = 55) {
  const positions = new Float32Array(count * 3);
  const rng = randomFrom(1987);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (rng() - 0.5) * 4.2;
    positions[i * 3 + 1] = 0.65 + rng() * 2.35;
    positions[i * 3 + 2] = -2.75 + rng() * 2.15;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dotTex = makeCanvasTexture(32, 32, (ctx, s) => {
    const g = ctx.createRadialGradient(s * 0.5, s * 0.5, 1, s * 0.5, s * 0.5, s * 0.5);
    g.addColorStop(0, 'rgba(255, 238, 195, 0.95)');
    g.addColorStop(0.45, 'rgba(255, 224, 165, 0.42)');
    g.addColorStop(1, 'rgba(255, 224, 165, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
  const mat = new THREE.PointsMaterial({
    color: 0xffe4b5,
    map: dotTex,
    size: 0.055,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}
