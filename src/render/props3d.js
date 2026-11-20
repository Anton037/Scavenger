import * as THREE from 'three';
import { speziCanMesh } from './characters3d.js';
import {
  band,
  brassMaterial,
  emissive,
  endoMaterial,
  material,
  orb,
  PALETTE,
  piece,
  randomFrom,
  round,
  roundedBox,
  solid,
  tapered,
  vinylMaterial,
  wedge,
} from './primitives.js';
import { makeCanvasTexture, receiptPaperTexture, steamGaugeDialTexture } from './textures.js';

export const speziModel = speziCanMesh;

export function miniDuckModel() {
  const g = new THREE.Group();
  const yellow = vinylMaterial(0xffd633, 0.28, 0.08);
  const orange = vinylMaterial(0xff6b22, 0.35, 0.08);
  const whiteHat = vinylMaterial(0xf8f6f0, 0.42, 0.04);
  const black = material(0x0d0e14, 0.15, 0.1);
  piece(g, orb, yellow, 0, 0.068, 0, 0.088, 0.068, 0.105, { shadow: false });
  piece(g, orb, yellow, 0, 0.142, 0.048, 0.064, 0.062, 0.064, { shadow: false });
  piece(g, roundedBox(0.055, 0.024, 0.05, 0.008, 2), orange, 0, 0.132, 0.108, 1, 1, 1, { shadow: false });
  piece(g, orb, black, -0.028, 0.155, 0.098, 0.011, 0.011, 0.011, { shadow: false });
  piece(g, orb, black, 0.028, 0.155, 0.098, 0.011, 0.011, 0.011, { shadow: false });
  // Tiny Imbiss Chef Toque on the desk duck!
  piece(g, round, whiteHat, 0, 0.205, 0.045, 0.038, 0.042, 0.038, { shadow: false });
  piece(g, orb, whiteHat, 0, 0.232, 0.045, 0.048, 0.028, 0.048, { shadow: false });
  return g;
}

export function officePhoneModel() {
  const root = new THREE.Group();
  const body = vinylMaterial(0x1f2434, 0.38, 0.28);
  const accent = vinylMaterial(0x323b54, 0.42, 0.32);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x38141a });
  piece(root, roundedBox(0.30, 0.10, 0.24, 0.028, 2), body, 0, 0.05, 0, 1, 1, 1, { shadow: true });
  piece(root, solid, accent, 0, 0.108, -0.045, 0.25, 0.035, 0.10, { shadow: false });
  const handset = new THREE.Group();
  handset.position.set(0, 0.145, -0.045);
  piece(handset, round, body, 0, 0, 0, 0.028, 0.33, 0.028, { shadow: false }).rotation.z = Math.PI / 2;
  piece(handset, roundedBox(0.085, 0.065, 0.085, 0.02, 2), body, -0.145, -0.012, 0, 1, 1, 1, { shadow: false });
  piece(handset, roundedBox(0.085, 0.065, 0.085, 0.02, 2), body, 0.145, -0.012, 0, 1, 1, 1, { shadow: false });
  root.add(handset);
  piece(root, solid, accent, 0, 0.104, 0.055, 0.14, 0.012, 0.095, { shadow: false });
  const led = piece(root, orb, ledMat, 0.10, 0.112, 0.075, 0.016, 0.016, 0.016);
  return { root, led, ledMat };
}

/**
 * Authentic FNaF-1 Clickable 3D Doorframe Switch Box (Physical DOOR + LIGHT buttons!).
 */
export function doorButtonBoxModel(side = 'left') {
  const root = new THREE.Group();
  const s = side === 'left' ? -1 : 1;
  const housing = endoMaterial(0x1b202e);
  const rim = brassMaterial(PALETTE.brass);

  piece(root, roundedBox(0.11, 0.62, 0.26, 0.025, 2), housing, 0, 0, 0, 1, 1, 1, { shadow: true });
  piece(root, solid, rim, -s * 0.04, 0.28, 0, 0.04, 0.025, 0.24, { shadow: false });
  piece(root, solid, rim, -s * 0.04, -0.28, 0, 0.04, 0.025, 0.24, { shadow: false });

  const doorMat = emissive(0xff3b56);
  const lightMat = emissive(0x5282a8);

  const btnGeo = roundedBox(0.075, 0.18, 0.16, 0.02, 2);
  const doorBtn = piece(root, btnGeo, doorMat, -s * 0.045, 0.125, 0, 1, 1, 1, { shadow: false });
  doorBtn.userData.propKind = side === 'left' ? 'left_door_btn' : 'right_door_btn';

  const lightBtn = piece(root, btnGeo, lightMat, -s * 0.045, -0.125, 0, 1, 1, 1, { shadow: false });
  lightBtn.userData.propKind = side === 'left' ? 'left_light_btn' : 'right_light_btn';

  return { root, doorBtn, lightBtn, doorMat, lightMat };
}

/**
 * Retro Arcade Machine ("FLAPPY ENTE '87") for CAM 1B Gastraum!
 */
export function arcadeCabinetModel(screenTex) {
  const g = new THREE.Group();
  const cabBody = vinylMaterial(0x281b3d, 0.45, 0.15);
  const sideTrim = vinylMaterial(0xd92848, 0.38, 0.12);
  const darkBezel = material(0x0b0d14, 0.7, 0.1);
  const marqueeMat = emissive(0xffcf56);
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });

  piece(g, roundedBox(0.86, 1.85, 0.76, 0.06, 2), cabBody, 0, 0.92, 0, 1, 1, 1, { shadow: true });
  piece(g, solid, sideTrim, -0.435, 0.92, 0.02, 0.03, 1.80, 0.72, { shadow: false });
  piece(g, solid, sideTrim, 0.435, 0.92, 0.02, 0.03, 1.80, 0.72, { shadow: false });
  piece(g, solid, marqueeMat, 0, 1.72, 0.34, 0.76, 0.18, 0.08, { shadow: false });
  piece(g, solid, darkBezel, 0, 1.28, 0.32, 0.72, 0.56, 0.10, { shadow: false }).rotation.x = -0.22;
  piece(g, solid, screenMat, 0, 1.28, 0.375, 0.60, 0.46, 0.02, { shadow: false }).rotation.x = -0.22;
  piece(g, solid, cabBody, 0, 0.94, 0.42, 0.82, 0.10, 0.28, { shadow: false }).rotation.x = 0.18;
  piece(g, orb, emissive(0xff3550), -0.18, 1.02, 0.44, 0.032, 0.032, 0.032, { shadow: false });
  piece(g, orb, emissive(0x38f2af), 0.12, 1.00, 0.46, 0.026, 0.016, 0.026, { shadow: false });
  piece(g, orb, emissive(0x38d6ff), 0.22, 1.00, 0.46, 0.026, 0.016, 0.026, { shadow: false });
  return g;
}

/**
 * Tealerland-inspired 3D Steam Manometer + Clickable Red Exhaust Handwheel + Rising Steam Puffs!
 */
export function steamValveAssemblyModel() {
  const root = new THREE.Group();
  root.userData.propKind = 'valve';

  const brass = brassMaterial(PALETTE.brass);
  const copper = brassMaterial(PALETTE.copper);
  const darkIron = endoMaterial(0x1b2130);
  const redValve = vinylMaterial(0xd9283e, 0.28, 0.35);
  const dialFaceMat = new THREE.MeshBasicMaterial({ map: steamGaugeDialTexture() });
  const needleMat = emissive(0xff2038);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x1e4a38 });
  const steamMat = new THREE.MeshBasicMaterial({
    color: 0xf4eee2,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });

  piece(root, roundedBox(0.24, 0.05, 0.22, 0.015, 2), darkIron, 0, 0.025, 0, 1, 1, 1, { shadow: false });
  piece(root, round, copper, -0.04, 0.22, -0.03, 0.035, 0.40, 0.035, { shadow: true });
  piece(root, round, brass, -0.04, 0.40, -0.03, 0.055, 0.04, 0.055, { shadow: false });

  piece(root, round, brass, -0.04, 0.49, -0.02, 0.115, 0.055, 0.115, { shadow: true }).rotation.x = Math.PI / 2;
  piece(root, round, dialFaceMat, -0.04, 0.49, 0.01, 0.098, 0.01, 0.098, { shadow: false }).rotation.x = Math.PI / 2;

  const needlePivot = new THREE.Group();
  needlePivot.position.set(-0.04, 0.49, 0.022);
  piece(needlePivot, solid, needleMat, 0, 0.032, 0, 0.012, 0.068, 0.008);
  piece(needlePivot, orb, darkIron, 0, 0, 0.004, 0.016, 0.016, 0.01, { shadow: false });
  root.add(needlePivot);

  const led = piece(root, orb, ledMat, -0.04, 0.625, -0.01, 0.026, 0.032, 0.026);

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

  const puffs = [];
  for (let i = 0; i < 5; i++) {
    const puff = piece(root, orb, steamMat.clone(), -0.04, 0.44 + i * 0.1, -0.05, 0.06, 0.05, 0.06, { shadow: false, receive: false });
    puff.visible = false;
    puffs.push(puff);
  }

  return { root, wheel, needlePivot, led, ledMat, puffs };
}

/**
 * 3D Thermal Receipt / Nacht-Bon Printer on right side of desk!
 */
export function bonPrinterModel() {
  const root = new THREE.Group();
  root.userData.propKind = 'printer';

  const body = vinylMaterial(0x1f2536, 0.36, 0.35);
  const slotMat = material(0x0a0c12, 0.85, 0.1);
  const stampBtnMat = brassMaterial(0xffbf52);
  const lcdMat = new THREE.MeshBasicMaterial({ color: 0x164236 });
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x204034 });
  const paperMat = new THREE.MeshStandardMaterial({
    map: receiptPaperTexture(),
    roughness: 0.72,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  piece(root, roundedBox(0.28, 0.15, 0.25, 0.03, 2), body, 0, 0.075, 0, 1, 1, 1, { shadow: true });
  piece(root, roundedBox(0.25, 0.05, 0.16, 0.015, 2), body, 0, 0.155, -0.03, 1, 1, 1, { shadow: false });
  piece(root, solid, slotMat, 0, 0.181, -0.02, 0.19, 0.008, 0.025, { shadow: false });
  const lcd = piece(root, solid, lcdMat, -0.025, 0.115, 0.128, 0.15, 0.042, 0.008);
  const stampBtn = piece(root, solid, stampBtnMat, 0.088, 0.115, 0.130, 0.048, 0.042, 0.018, { shadow: false });
  const led = piece(root, orb, ledMat, 0.095, 0.162, 0.06, 0.018, 0.018, 0.018);

  const paperGroup = new THREE.Group();
  paperGroup.position.set(0, 0.18, -0.02);
  const paperMesh = piece(paperGroup, solid, paperMat, 0, 0.12, 0, 0.16, 0.24, 0.005, { shadow: false });
  paperMesh.rotation.x = -0.14;
  paperGroup.visible = false;
  root.add(paperGroup);

  return { root, paperGroup, lcd, lcdMat, led, ledMat, stampBtn };
}

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
  const steel = endoMaterial(0x8e9eb8);
  const darkSteel = endoMaterial(0x283042);
  const meat1 = vinylMaterial(0x8a4222, 0.48, 0.06);
  const meat2 = vinylMaterial(0x632d16, 0.54, 0.05);
  const tomato = vinylMaterial(0xd92832, 0.3, 0.05);
  const coil = emissive(0xff6b2b);

  piece(root, roundedBox(0.68, 0.12, 0.58, 0.025, 2), darkSteel, 0, 0.06, 0, 1, 1, 1, { shadow: true });
  piece(root, roundedBox(0.62, 1.28, 0.12, 0.03, 2), steel, 0, 0.74, -0.24, 1, 1, 1, { shadow: true });
  for (let i = 0; i < 3; i++) {
    piece(root, solid, coil, 0, 0.38 + i * 0.32, -0.17, 0.44, 0.16, 0.03);
  }
  const spit = new THREE.Group();
  spit.position.set(0, 0.12, 0.04);
  piece(spit, round, steel, 0, 0.64, 0, 0.032, 1.30, 0.032, { shadow: false });
  piece(spit, round, steel, 0, 0.14, 0, 0.26, 0.03, 0.26, { shadow: false });
  piece(spit, tapered, meat1, 0, 0.58, 0, 0.27, 0.78, 0.27, { shadow: true });
  for (let i = 0; i < 5; i++) {
    piece(spit, round, i % 2 === 0 ? meat2 : meat1, 0, 0.28 + i * 0.15, 0, 0.25 - i * 0.015, 0.055, 0.25 - i * 0.015, { shadow: false });
  }
  // Grilled tomato topper on the Döner spit!
  piece(spit, orb, tomato, 0, 1.01, 0, 0.075, 0.048, 0.075, { shadow: false });
  root.add(spit);
  return { root, spit };
}

export function deskFanModel() {
  const root = new THREE.Group();
  const darkMetal = endoMaterial(0x1b2130);
  const cageMat = endoMaterial(0x52607c);
  const bladeMat = endoMaterial(0x2c354b);
  piece(root, round, darkMetal, 0, 0.03, 0, 0.20, 0.06, 0.20, { shadow: true });
  piece(root, solid, emissive(0x38f2af), 0.06, 0.065, 0.11, 0.028, 0.014, 0.028);
  piece(root, round, darkMetal, 0, 0.18, -0.02, 0.042, 0.28, 0.042, { shadow: false });
  piece(root, round, darkMetal, 0, 0.35, -0.05, 0.10, 0.16, 0.10, { shadow: false }).rotation.x = Math.PI / 2;

  const ringOuter = band(root, cageMat, 0, 0.35, 0.06, 0.24);
  ringOuter.rotation.x = 0;
  const ringInner = band(root, cageMat, 0, 0.35, 0.08, 0.13);
  ringInner.rotation.x = 0;
  for (let i = 0; i < 4; i++) {
    const spoke = piece(root, solid, cageMat, 0, 0.35, 0.075, 0.011, 0.46, 0.011, { shadow: false });
    spoke.rotation.z = (i * Math.PI) / 4;
  }

  const blades = new THREE.Group();
  blades.position.set(0, 0.35, 0.045);
  for (let i = 0; i < 4; i++) {
    const b = piece(blades, solid, bladeMat, 0, 0, 0, 0.095, 0.38, 0.016, { shadow: false });
    b.rotation.z = (i * Math.PI) / 4;
    b.rotation.y = 0.22;
  }
  piece(blades, orb, brassMaterial(PALETTE.brass), 0, 0, 0.02, 0.055, 0.055, 0.04, { shadow: false });
  root.add(blades);
  return { root, blades };
}

export function crateMesh(isGold = false) {
  const g = new THREE.Group();
  const wood = isGold ? brassMaterial(PALETTE.brass) : vinylMaterial(0x8a562e, 0.68, 0.06);
  const trim = endoMaterial(0x283044);
  piece(g, roundedBox(0.60, 0.60, 0.60, 0.03, 2), wood, 0, 0.31, 0, 1, 1, 1);
  piece(g, solid, trim, 0, 0.31, 0, 0.64, 0.08, 0.64, { shadow: false });
  piece(g, solid, trim, 0, 0.58, 0, 0.63, 0.06, 0.63, { shadow: false });
  piece(g, solid, trim, 0, 0.04, 0, 0.63, 0.06, 0.63, { shadow: false });
  return g;
}

/**
 * Festive Diner Bunting Flags (Wimpelkette) + Warm Fairy Bulbs along a draped cord!
 * Replaces the old upside-down floating cones.
 */
export function partyGarland(parent, x1, x2, y, z) {
  const g = new THREE.Group();
  const wire = material(0x181518, 0.85, 0.1);
  const colors = [0xd9283e, 0xffbf52, 0x26b888, 0xf6eedc, 0x9b4dff, 0xff7262];
  const warmBulb = emissive(0xffdc96);
  const count = Math.max(7, Math.floor(Math.abs(x2 - x1) * 2.6));

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const px = x1 + (x2 - x1) * t;
    const sag = Math.sin(t * Math.PI) * 0.24;
    const py = y - sag;

    if (i < count - 1) {
      const tNext = (i + 1) / (count - 1);
      const nx = x1 + (x2 - x1) * tNext;
      const ny = y - Math.sin(tNext * Math.PI) * 0.24;
      const segLen = Math.hypot(nx - px, ny - py);
      const seg = piece(g, solid, wire, (px + nx) * 0.5, (py + ny) * 0.5, z, segLen, 0.018, 0.018, { shadow: false });
      seg.rotation.z = Math.atan2(ny - py, nx - px);
    }

    // Crisp flat triangular pennant flag pointing DOWN!
    const mat = vinylMaterial(colors[i % colors.length], 0.42, 0.12);
    const pennant = piece(g, wedge, mat, px, py - 0.11, z, 0.19, 0.22, 0.025, { shadow: false });
    pennant.rotation.z = Math.PI;

    if (i % 2 === 1) {
      piece(g, orb, warmBulb, px, py + 0.025, z + 0.03, 0.036, 0.044, 0.036, { shadow: false });
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
    opacity: 0.42,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}
