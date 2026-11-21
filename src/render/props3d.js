import * as GL from './webgl/index.js';
import { crownMesh, speziCanMesh } from './characters3d.js';
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
} from './primitives.js';
import { makeCanvasTexture, receiptPaperTexture, steamGaugeDialTexture } from './textures.js';

export const speziModel = speziCanMesh;

export function officePhoneModel() {
  const root = new GL.Group();
  const body = vinylMaterial(0x1b1e26, 0.52, 0.22);
  const accent = vinylMaterial(0x2d3342, 0.55, 0.24);
  const ledMat = new GL.MeshBasicMaterial({ color: 0x38141a });
  // Retro cassette answering machine + corded phone
  piece(root, roundedBox(0.32, 0.095, 0.24, 0.02, 1), body, 0, 0.048, 0, 1, 1, 1, { shadow: true });
  piece(root, solid, accent, 0.05, 0.098, 0.02, 0.14, 0.012, 0.10, { shadow: false });
  // Visible mini cassette reels
  const reelL = piece(root, round, material(0xd8d0c0, 0.5), 0.02, 0.105, 0.02, 0.018, 0.008, 0.018, { shadow: false });
  const reelR = piece(root, round, material(0xd8d0c0, 0.5), 0.08, 0.105, 0.02, 0.018, 0.008, 0.018, { shadow: false });
  const handset = new GL.Group();
  handset.position.set(-0.09, 0.115, 0);
  piece(handset, round, body, 0, 0, 0, 0.024, 0.22, 0.024, { shadow: false }).rotation.x = Math.PI / 2;
  root.add(handset);
  const led = piece(root, orb, ledMat, 0.12, 0.104, 0.085, 0.014, 0.014, 0.014);
  return { root, led, ledMat, reelL, reelR };
}

/**
 * Clickable 3D Doorframe Steel Shutter & Light Switch Box.
 */
export function doorButtonBoxModel(side = 'left') {
  const root = new GL.Group();
  const s = side === 'left' ? -1 : 1;
  const housing = endoMaterial(0x181c26);
  const rim = brassMaterial(0x886c38);

  piece(root, roundedBox(0.11, 0.58, 0.24, 0.02, 1), housing, 0, 0, 0, 1, 1, 1, { shadow: true });
  piece(root, solid, rim, -s * 0.04, 0.26, 0, 0.04, 0.02, 0.22, { shadow: false });
  piece(root, solid, rim, -s * 0.04, -0.26, 0, 0.04, 0.02, 0.22, { shadow: false });

  const doorMat = emissive(0xc83242);
  const lightMat = emissive(0x466885);

  const btnGeo = roundedBox(0.07, 0.17, 0.15, 0.015, 1);
  const doorBtn = piece(root, btnGeo, doorMat, -s * 0.045, 0.115, 0, 1, 1, 1, { shadow: false });
  doorBtn.userData.propKind = side === 'left' ? 'left_door_btn' : 'right_door_btn';

  const lightBtn = piece(root, btnGeo, lightMat, -s * 0.045, -0.115, 0, 1, 1, 1, { shadow: false });
  lightBtn.userData.propKind = side === 'left' ? 'left_light_btn' : 'right_light_btn';

  return { root, doorBtn, lightBtn, doorMat, lightMat };
}

/**
 * Center Service Pass-Through Stainless Exhaust Hood & Hanging Aluminum Ticket Rail.
 */
export function centerPassThroughHoodModel(steelMat) {
  const g = new GL.Group();
  const darkBaffle = endoMaterial(0x222834);
  const paper = material(0xe4dcc8, 0.85, 0.02);
  piece(g, solid, steelMat, 0, 2.72, -3.02, 2.35, 0.52, 0.58, { shadow: true });
  piece(g, solid, darkBaffle, 0, 2.45, -2.95, 2.15, 0.04, 0.42, { shadow: false });
  // Hanging ticket slide rail across the top of the open pass-through
  piece(g, solid, steelMat, 0, 2.16, -2.92, 2.18, 0.045, 0.03, { shadow: false });
  for (const tx of [-0.68, -0.18, 0.44]) {
    piece(g, solid, paper, tx, 2.06, -2.91, 0.11, 0.16, 0.006, { shadow: false }).rotation.z = tx * 0.08;
  }
  return g;
}

/**
 * Back Station 1: Vertical Döner Spit + Electric Slicer (propKind: 'prep_doner').
 */
export function donerSpitModel() {
  const root = new GL.Group();
  root.userData.propKind = 'prep_doner';
  const steel = endoMaterial(0x7d8a9e);
  const darkSteel = endoMaterial(0x222834);
  const meat1 = vinylMaterial(0x6e3218, 0.62, 0.04);
  const meat2 = vinylMaterial(0x4f2210, 0.68, 0.04);
  const coil = emissive(0xd8521c);

  piece(root, roundedBox(0.64, 0.10, 0.54, 0.02, 1), darkSteel, 0, 0.05, 0, 1, 1, 1, { shadow: true });
  piece(root, roundedBox(0.58, 1.18, 0.10, 0.02, 1), steel, 0, 0.68, -0.22, 1, 1, 1, { shadow: true });
  for (let i = 0; i < 3; i++) {
    piece(root, solid, coil, 0, 0.34 + i * 0.30, -0.16, 0.40, 0.14, 0.02);
  }
  const spit = new GL.Group();
  spit.position.set(0, 0.10, 0.03);
  piece(spit, round, steel, 0, 0.58, 0, 0.026, 1.18, 0.026, { shadow: false });
  piece(spit, tapered, meat1, 0, 0.54, 0, 0.24, 0.72, 0.24, { shadow: true });
  for (let i = 0; i < 4; i++) {
    piece(spit, round, i % 2 === 0 ? meat2 : meat1, 0, 0.26 + i * 0.15, 0, 0.22 - i * 0.015, 0.05, 0.22 - i * 0.015, { shadow: false });
  }
  root.add(spit);

  // Handheld electric rotary Döner knife resting beside spit
  const slicer = new GL.Group();
  slicer.position.set(0.26, 0.16, 0.18);
  piece(slicer, round, darkSteel, 0, 0, 0, 0.028, 0.18, 0.028, { shadow: false }).rotation.z = 0.4;
  piece(slicer, round, steel, -0.06, 0.06, 0, 0.065, 0.012, 0.065, { shadow: false });
  root.add(slicer);

  const statusLedMat = emissive(0x283430);
  piece(root, solid, statusLedMat, 0, 1.29, -0.18, 0.38, 0.035, 0.03);
  return { root, spit, slicer, statusLedMat };
}

/**
 * Back Station 2: Bubbling Twin Deep-Fryer Vat + Articulated Wire Basket (propKind: 'prep_fryer').
 */
export function prepFryerStationModel() {
  const root = new GL.Group();
  root.userData.propKind = 'prep_fryer';
  const steel = endoMaterial(0x7c8898);
  const darkVat = material(0x16181e, 0.75, 0.3);
  const oilMat = new GL.MeshStandardMaterial({ color: 0x8a5a14, roughness: 0.12, metalness: 0.25 });
  const friesMat = vinylMaterial(0xdba432, 0.55, 0.02);
  const handleMat = vinylMaterial(0x151820, 0.7);
  const ledMat = emissive(0x26342e);

  piece(root, roundedBox(0.68, 0.36, 0.54, 0.02, 1), steel, 0, 0.18, 0, 1, 1, 1, { shadow: true });
  piece(root, solid, steel, 0, 0.50, -0.22, 0.66, 0.28, 0.08, { shadow: false });
  piece(root, solid, darkVat, -0.15, 0.365, 0.02, 0.26, 0.02, 0.36, { shadow: false });
  piece(root, solid, darkVat, 0.15, 0.365, 0.02, 0.26, 0.02, 0.36, { shadow: false });
  const oil = piece(root, solid, oilMat, 0.15, 0.355, 0.02, 0.24, 0.02, 0.34, { shadow: false });

  const basketGroup = new GL.Group();
  basketGroup.position.set(0.15, 0.44, 0.02);
  piece(basketGroup, roundedBox(0.21, 0.10, 0.28, 0.01, 1), steel, 0, 0, 0, 1, 1, 1, { shadow: false });
  const fries = piece(basketGroup, solid, friesMat, 0, 0.02, 0, 0.18, 0.05, 0.24, { shadow: false });
  fries.visible = false;
  piece(basketGroup, solid, handleMat, 0, 0.06, 0.24, 0.035, 0.025, 0.22, { shadow: false }).rotation.x = -0.22;
  root.add(basketGroup);

  piece(root, solid, ledMat, 0, 0.58, -0.17, 0.42, 0.035, 0.02);
  return { root, basketGroup, fries, oil, ledMat };
}

/**
 * Back Station 3: Chilled Spezi Dispenser + Bagging Tray & Order Ticket (propKind: 'prep_bag').
 */
export function prepBaggingStationModel() {
  const root = new GL.Group();
  root.userData.propKind = 'prep_bag';

  const steel = endoMaterial(0x788496);
  const darkTower = vinylMaterial(0x1b202a, 0.48, 0.25);
  const kraftPaper = vinylMaterial(0xa67c4e, 0.86, 0.02);
  const speziBadge = emissive(0xd87c24);
  const ledMat = emissive(0x24342e);
  const ticketMat = new GL.MeshStandardMaterial({
    map: receiptPaperTexture(),
    roughness: 0.8,
  });

  // Chilled Spezi dispenser tower on left side of tray
  piece(root, roundedBox(0.30, 0.52, 0.32, 0.02, 1), darkTower, -0.22, 0.26, -0.06, 1, 1, 1, { shadow: true });
  piece(root, solid, speziBadge, -0.22, 0.40, 0.105, 0.22, 0.12, 0.015, { shadow: false });
  piece(root, round, steel, -0.22, 0.24, 0.12, 0.018, 0.06, 0.018, { shadow: false });
  const cup = speziCanMesh();
  cup.position.set(-0.22, 0.02, 0.12);
  root.add(cup);

  // Stainless bagging tray + brown kraft takeout bag
  piece(root, solid, steel, 0.16, 0.02, 0.04, 0.42, 0.03, 0.34, { shadow: false });
  const bagMesh = piece(root, roundedBox(0.20, 0.28, 0.14, 0.015, 1), kraftPaper, 0.16, 0.17, 0.04, 1, 1, 1, { shadow: true });
  bagMesh.visible = false;

  // Hanging thermal ticket for active order
  const ticketGroup = new GL.Group();
  ticketGroup.position.set(0.16, 0.56, -0.06);
  piece(ticketGroup, solid, ticketMat, 0, -0.11, 0, 0.16, 0.22, 0.005, { shadow: false });
  ticketGroup.visible = false;
  root.add(ticketGroup);

  piece(root, solid, ledMat, 0.16, 0.05, 0.20, 0.32, 0.025, 0.02);
  return { root, bagMesh, ticketGroup, ledMat };
}

/**
 * Physical Heavy Main Breaker Box on the Back Wall (propKind: 'breaker_box').
 */
export function breakerBoxModel() {
  const root = new GL.Group();
  root.userData.propKind = 'breaker_box';

  const greySteel = endoMaterial(0x3a424e);
  const darkSlot = material(0x0c0e14, 0.9, 0.1);
  const hazardYellow = vinylMaterial(0xc89628, 0.5);
  const redHandle = vinylMaterial(0xc82432, 0.35, 0.2);
  const ledMat = emissive(0x38d698);

  piece(root, roundedBox(0.46, 0.64, 0.16, 0.02, 1), greySteel, 0, 0, 0, 1, 1, 1, { shadow: true });
  piece(root, solid, hazardYellow, -0.08, 0.16, 0.084, 0.16, 0.12, 0.008, { shadow: false });
  piece(root, solid, darkSlot, 0.12, -0.02, 0.082, 0.08, 0.28, 0.015, { shadow: false });
  const led = piece(root, orb, ledMat, -0.08, -0.16, 0.088, 0.024, 0.024, 0.018);

  // Heavy articulated pull-up / snap-down lever!
  const leverPivot = new GL.Group();
  leverPivot.position.set(0.12, -0.02, 0.085);
  piece(leverPivot, round, greySteel, 0, 0.08, 0.04, 0.014, 0.18, 0.014, { shadow: false }).rotation.x = 0.35;
  piece(leverPivot, roundedBox(0.11, 0.04, 0.05, 0.01, 1), redHandle, 0, 0.16, 0.08, 1, 1, 1, { shadow: true });
  root.add(leverPivot);

  return { root, leverPivot, led, ledMat };
}

/**
 * Industrial Exhaust Valve Assembly (propKind: 'exhaust_valve').
 */
export function steamValveAssemblyModel() {
  const root = new GL.Group();
  root.userData.propKind = 'exhaust_valve';

  const brass = brassMaterial(PALETTE.brass);
  const copper = brassMaterial(PALETTE.copper);
  const redValve = vinylMaterial(0xb82434, 0.36, 0.28);
  const dialFaceMat = new GL.MeshBasicMaterial({ map: steamGaugeDialTexture() });
  const needleMat = emissive(0xff2838);
  const ledMat = new GL.MeshBasicMaterial({ color: 0x1e4a38 });
  const steamMat = new GL.MeshBasicMaterial({
    color: 0xe6e0d4,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });

  piece(root, round, copper, 0, 0.22, -0.03, 0.035, 0.48, 0.035, { shadow: true });
  piece(root, round, brass, 0, 0.48, -0.01, 0.105, 0.045, 0.105, { shadow: true }).rotation.x = Math.PI / 2;
  piece(root, round, dialFaceMat, 0, 0.48, 0.015, 0.09, 0.01, 0.09, { shadow: false }).rotation.x = Math.PI / 2;

  const needlePivot = new GL.Group();
  needlePivot.position.set(0, 0.48, 0.026);
  piece(needlePivot, solid, needleMat, 0, 0.028, 0, 0.010, 0.06, 0.008);
  root.add(needlePivot);

  const led = piece(root, orb, ledMat, 0, 0.60, 0, 0.022, 0.026, 0.022);

  const wheel = new GL.Group();
  wheel.position.set(0, 0.20, 0.09);
  const rim = band(wheel, redValve, 0, 0, 0, 0.10);
  rim.rotation.x = 0;
  for (let i = 0; i < 4; i++) {
    const spoke = piece(wheel, solid, redValve, 0, 0, 0, 0.016, 0.19, 0.016, { shadow: false });
    spoke.rotation.z = (i * Math.PI) / 4;
  }
  root.add(wheel);

  const puffs = [];
  for (let i = 0; i < 5; i++) {
    const puff = piece(root, orb, steamMat.clone(), 0, 0.44 + i * 0.1, -0.04, 0.055, 0.045, 0.055, { shadow: false, receive: false });
    puff.visible = false;
    puffs.push(puff);
  }

  return { root, wheel, needlePivot, led, ledMat, puffs };
}

/**
 * 5 Unlockable Desk Cosmetic Collectibles (Pure Cosmetics — Zero Gameplay Buffs!).
 */
export function buildDeskCosmeticsGroup() {
  const root = new GL.Group();
  const brass = brassMaterial(0xc89a38);
  const darkMetal = endoMaterial(0x1c202a);

  // 1. Goldener Mini-Dönerspieß
  const goldSpit = new GL.Group();
  goldSpit.position.set(0.36, 0.92, -1.94);
  piece(goldSpit, round, darkMetal, 0, 0.015, 0, 0.065, 0.03, 0.065, { shadow: false });
  const miniSpitCone = piece(goldSpit, tapered, brass, 0, 0.12, 0, 0.052, 0.16, 0.052, { shadow: true });
  piece(goldSpit, round, brass, 0, 0.12, 0, 0.008, 0.22, 0.008, { shadow: false });
  root.add(goldSpit);

  // 2. Neon-Spezi-Leuchtschild
  const neonSpezi = new GL.Group();
  neonSpezi.position.set(-1.26, 0.92, -1.98);
  neonSpezi.rotation.y = 0.26;
  piece(neonSpezi, solid, darkMetal, 0, 0.02, 0, 0.24, 0.04, 0.08, { shadow: false });
  piece(neonSpezi, solid, emissive(0xff8424), 0, 0.13, 0, 0.22, 0.16, 0.018, { shadow: false });
  piece(neonSpezi, solid, emissive(0xb82888), 0, 0.08, 0.012, 0.20, 0.03, 0.01, { shadow: false });
  root.add(neonSpezi);

  // 3. Wackel-Krone
  const bobbleCrown = new GL.Group();
  bobbleCrown.position.set(0.62, 0.92, -1.92);
  piece(bobbleCrown, round, darkMetal, 0, 0.015, 0, 0.055, 0.03, 0.055, { shadow: false });
  piece(bobbleCrown, round, brass, 0, 0.05, 0, 0.012, 0.06, 0.012, { shadow: false });
  const crownTop = crownMesh(0.42);
  crownTop.position.set(0, 0.09, 0);
  bobbleCrown.add(crownTop);
  root.add(bobbleCrown);

  // 4. 1998 Hi8-Camcorder
  const camcorder = new GL.Group();
  camcorder.position.set(0.92, 0.92, -1.96);
  camcorder.rotation.y = -0.38;
  piece(camcorder, roundedBox(0.11, 0.11, 0.22, 0.018, 1), darkMetal, 0, 0.06, 0, 1, 1, 1, { shadow: true });
  piece(camcorder, round, darkMetal, 0, 0.065, 0.13, 0.036, 0.05, 0.036, { shadow: false }).rotation.x = Math.PI / 2;
  piece(camcorder, solid, emissive(0x285848), -0.085, 0.065, -0.02, 0.065, 0.05, 0.008, { shadow: false });
  const camLed = piece(camcorder, orb, emissive(0xff2838), 0.035, 0.105, 0.11, 0.008, 0.008, 0.008);
  root.add(camcorder);

  // 5. Gerahmtes Schicht-Polaroid
  const polaroid = new GL.Group();
  polaroid.position.set(0.16, 0.92, -2.02);
  polaroid.rotation.y = -0.18;
  polaroid.rotation.x = -0.22;
  piece(polaroid, solid, vinylMaterial(0x3a2618, 0.8), 0, 0.09, 0, 0.15, 0.18, 0.016, { shadow: true });
  piece(polaroid, solid, material(0xded6c4, 0.7), 0, 0.09, 0.01, 0.12, 0.15, 0.005, { shadow: false });
  piece(polaroid, solid, material(0x1c2228, 0.8), 0, 0.105, 0.014, 0.10, 0.10, 0.004, { shadow: false });
  root.add(polaroid);

  return {
    root,
    items: {
      gold_spit: goldSpit,
      neon_spezi: neonSpezi,
      bobble_crown: bobbleCrown,
      vhs_camcorder: camcorder,
      polaroid_frame: polaroid,
    },
    miniSpitCone,
    crownTop,
    camLed,
  };
}

export function deskFanModel() {
  const root = new GL.Group();
  const darkMetal = endoMaterial(0x1b2130);
  const cageMat = endoMaterial(0x4c5870);
  const bladeMat = endoMaterial(0x283042);
  piece(root, round, darkMetal, 0, 0.03, 0, 0.18, 0.05, 0.18, { shadow: true });
  piece(root, round, darkMetal, 0, 0.17, -0.02, 0.038, 0.26, 0.038, { shadow: false });
  piece(root, round, darkMetal, 0, 0.33, -0.05, 0.09, 0.14, 0.09, { shadow: false }).rotation.x = Math.PI / 2;

  const ringOuter = band(root, cageMat, 0, 0.33, 0.05, 0.22);
  ringOuter.rotation.x = 0;
  for (let i = 0; i < 4; i++) {
    const spoke = piece(root, solid, cageMat, 0, 0.33, 0.065, 0.010, 0.42, 0.010, { shadow: false });
    spoke.rotation.z = (i * Math.PI) / 4;
  }

  const blades = new GL.Group();
  blades.position.set(0, 0.33, 0.04);
  for (let i = 0; i < 4; i++) {
    const b = piece(blades, solid, bladeMat, 0, 0, 0, 0.085, 0.34, 0.014, { shadow: false });
    b.rotation.z = (i * Math.PI) / 4;
    b.rotation.y = 0.22;
  }
  root.add(blades);
  return { root, blades };
}

export function crateMesh(colorHex = 0x26486e) {
  const g = new GL.Group();
  const crateMat = vinylMaterial(colorHex, 0.72, 0.04);
  const bottleTop = material(0xb89642, 0.35, 0.7);
  piece(g, roundedBox(0.46, 0.36, 0.36, 0.02, 1), crateMat, 0, 0.18, 0, 1, 1, 1, { shadow: true });
  for (const bx of [-0.13, 0, 0.13]) {
    for (const bz of [-0.08, 0.08]) {
      piece(g, round, bottleTop, bx, 0.37, bz, 0.022, 0.03, 0.022, { shadow: false });
    }
  }
  return g;
}

export function wetFloorConeModel() {
  const g = new GL.Group();
  const yellow = vinylMaterial(0xc9a224, 0.55, 0.04);
  const red = vinylMaterial(0x9e242c, 0.6);
  const a = piece(g, solid, yellow, 0, 0.32, -0.08, 0.28, 0.64, 0.025, { shadow: true });
  a.rotation.x = 0.22;
  const b = piece(g, solid, yellow, 0, 0.32, 0.08, 0.28, 0.64, 0.025, { shadow: true });
  b.rotation.x = -0.22;
  piece(g, solid, red, 0, 0.38, 0.082, 0.14, 0.14, 0.01, { shadow: false }).rotation.x = -0.22;
  return g;
}

export function mopBucketModel() {
  const g = new GL.Group();
  const bucketMat = vinylMaterial(0x285678, 0.62, 0.08);
  const wood = vinylMaterial(0x6e4c2e, 0.8);
  const dirtyWater = material(0x1c2426, 0.15, 0.2);
  piece(g, tapered, bucketMat, 0, 0.20, 0, 0.20, 0.38, 0.20, { shadow: true });
  piece(g, round, dirtyWater, 0, 0.34, 0, 0.18, 0.02, 0.18, { shadow: false });
  const handle = piece(g, round, wood, 0.06, 0.72, 0, 0.016, 1.35, 0.016, { shadow: false });
  handle.rotation.z = -0.16;
  return g;
}

export function hallSteamCloudModel() {
  const group = new GL.Group();
  const rng = randomFrom(777);
  const puffs = [];
  for (let i = 0; i < 9; i++) {
    const mat = new GL.MeshBasicMaterial({
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

export function dustParticlesModel(count = 45) {
  const positions = new Float32Array(count * 3);
  const rng = randomFrom(1987);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (rng() - 0.5) * 4.4;
    positions[i * 3 + 1] = 0.55 + rng() * 2.35;
    positions[i * 3 + 2] = -2.85 + rng() * 5.2;
  }
  const geo = new GL.BufferGeometry();
  geo.setAttribute('position', new GL.BufferAttribute(positions, 3));
  const dotTex = makeCanvasTexture(32, 32, (ctx, s) => {
    const g = ctx.createRadialGradient(s * 0.5, s * 0.5, 1, s * 0.5, s * 0.5, s * 0.5);
    g.addColorStop(0, 'rgba(225, 232, 235, 0.85)');
    g.addColorStop(1, 'rgba(225, 232, 235, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
  const mat = new GL.PointsMaterial({
    color: 0xd8e2e6,
    map: dotTex,
    size: 0.045,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    blending: GL.AdditiveBlending,
  });
  return new GL.Points(geo, mat);
}
