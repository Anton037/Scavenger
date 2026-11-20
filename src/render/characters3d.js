import * as THREE from 'three';
import {
  band,
  brassMaterial,
  capsule,
  emissive,
  endoJoint,
  endoMaterial,
  hoop,
  mascotEyeRig,
  material,
  octa,
  orb,
  PALETTE,
  piece,
  round,
  roundedBox,
  solid,
  TAU,
  vinylMaterial,
} from './primitives.js';
import {
  antonPhoneTexture,
  antonShirtTexture,
  speziWrapTexture,
  tomBibTexture,
  tomShirtTexture,
  torgeApronTexture,
} from './textures.js';

let _speziTex = null;
let _apronTex = null;
let _antonShirtTex = null;
let _antonPhoneTex = null;
let _tomShirtTex = null;
let _tomBibTex = null;

function ensureOutfitTextures() {
  if (!_speziTex) {
    _speziTex = speziWrapTexture();
    _apronTex = torgeApronTexture();
    _antonShirtTex = antonShirtTexture();
    _antonPhoneTex = antonPhoneTexture();
    _tomShirtTex = tomShirtTexture();
    _tomBibTex = tomBibTexture();
  }
}

export function speziCanMesh() {
  ensureOutfitTextures();
  const g = new THREE.Group();
  const wrapMat = new THREE.MeshStandardMaterial({
    map: _speziTex,
    roughness: 0.28,
    metalness: 0.35,
  });
  const alu = material(0xcad4e6, 0.2, 0.88);
  const darkTab = material(0x1b2030, 0.3, 0.7);
  piece(g, round, wrapMat, 0, 0.105, 0, 0.056, 0.19, 0.056, { shadow: true });
  piece(g, round, alu, 0, 0.204, 0, 0.052, 0.014, 0.052, { shadow: false });
  piece(g, round, alu, 0, 0.008, 0, 0.052, 0.012, 0.052, { shadow: false });
  piece(g, solid, darkTab, 0.008, 0.213, 0, 0.022, 0.005, 0.014, { shadow: false });
  return g;
}

export function crownMesh(scale = 1) {
  const crown = new THREE.Group();
  const gold = brassMaterial(PALETTE.brass);
  const ruby = emissive(PALETTE.vermilion);
  const emerald = emissive(PALETTE.jade);
  const rim = emissive(0xffe48f);
  const velvet = vinylMaterial(0x9e1c36, 0.48, 0.08);
  piece(crown, round, gold, 0, 0, 0, 0.21 * scale, 0.08 * scale, 0.21 * scale, { shadow: false });
  piece(crown, orb, velvet, 0, 0.038 * scale, 0, 0.165 * scale, 0.09 * scale, 0.165 * scale, { shadow: false });
  for (let i = 0; i < 5; i++) {
    const a = (i * TAU) / 5;
    piece(
      crown,
      octa,
      rim,
      Math.cos(a) * 0.17 * scale,
      0.098 * scale,
      Math.sin(a) * 0.17 * scale,
      0.055 * scale,
      0.115 * scale,
      0.055 * scale,
      { shadow: false },
    );
  }
  piece(crown, octa, ruby, 0, 0.042 * scale, 0.205 * scale, 0.042 * scale, 0.052 * scale, 0.03 * scale, { shadow: false });
  piece(crown, octa, emerald, -0.15 * scale, 0.042 * scale, 0.14 * scale, 0.032 * scale, 0.04 * scale, 0.025 * scale, { shadow: false });
  piece(crown, octa, emerald, 0.15 * scale, 0.042 * scale, 0.14 * scale, 0.032 * scale, 0.04 * scale, 0.025 * scale, { shadow: false });
  return crown;
}

function buildAnimatronicHand(parent, finish, side = 1, scale = 1) {
  const hand = new THREE.Group();
  const palmGeo = roundedBox(0.11 * scale, 0.10 * scale, 0.07 * scale, 0.025 * scale, 2);
  piece(hand, palmGeo, finish, 0, 0, 0, 1, 1, 1, { shadow: false });
  const endo = endoMaterial(0x283044);
  for (const fx of [-0.032, 0, 0.032]) {
    piece(hand, capsule, finish, fx * scale, -0.062 * scale, 0.015 * scale, 0.026 * scale, 0.058 * scale, 0.026 * scale, { shadow: false });
    piece(hand, orb, endo, fx * scale, -0.036 * scale, 0.015 * scale, 0.014 * scale, 0.014 * scale, 0.014 * scale, { shadow: false });
  }
  // Thumb
  const thumb = piece(hand, capsule, finish, -side * 0.058 * scale, -0.02 * scale, 0.025 * scale, 0.026 * scale, 0.052 * scale, 0.026 * scale, { shadow: false });
  thumb.rotation.z = side * 0.55;
  parent.add(hand);
  return hand;
}

const _headbandArcGeo = new THREE.TorusGeometry(0.238, 0.024, 8, 22, Math.PI);

export function chefTorgeModel() {
  ensureOutfitTextures();
  const root = new THREE.Group();
  const skin = vinylMaterial(0xdfb694, 0.48, 0.03);
  const darkCurlyHair = vinylMaterial(0x1f161e, 0.68, 0.04);
  const forestCap = vinylMaterial(0x134c38, 0.45, 0.08);
  const chefJacket = vinylMaterial(0xc82333, 0.38, 0.10);
  const whiteTrim = vinylMaterial(0xf7f4ec, 0.42, 0.05);
  const apronMat = new THREE.MeshStandardMaterial({ map: _apronTex, roughness: 0.55, metalness: 0.04 });
  const darkPants = vinylMaterial(0x181c2c, 0.55, 0.1);
  const brass = brassMaterial(PALETTE.brass);
  const copper = brassMaterial(PALETTE.copper);
  const castIron = endoMaterial(0x1c202b);
  const chrome = endoMaterial(0xcbd6ea);
  const socketMat = material(0x05060b, 0.94, 0);
  const teethMat = vinylMaterial(0xf8f5eb, 0.22, 0.06);
  const cheekMat = vinylMaterial(0xff384c, 0.2, 0.08);
  const clownNoseMat = vinylMaterial(0xff3328, 0.16, 0.08);

  const core = new THREE.Group();
  core.scale.set(1.08, 1.08, 1.08);
  root.add(core);

  // Segmented Mascot-Animatronic Legs + Red/White High-Top Sneakers
  const shoeGeo = roundedBox(0.17, 0.11, 0.28, 0.035, 2);
  const legs = [-1, 1].map((side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.16, 0.68, 0);
    endoJoint(leg, 0, 0, 0, 0.062);
    piece(leg, capsule, darkPants, 0, -0.16, 0, 0.16, 0.22, 0.16, { shadow: true });
    endoJoint(leg, 0, -0.32, 0.01, 0.058);
    piece(leg, capsule, darkPants, 0, -0.47, 0, 0.15, 0.20, 0.15, { shadow: true });
    piece(leg, shoeGeo, chefJacket, 0, -0.61, 0.045, 1, 1, 1, { shadow: true });
    piece(leg, solid, whiteTrim, 0, -0.655, 0.05, 0.18, 0.032, 0.295, { shadow: false });
    piece(leg, orb, whiteTrim, 0, -0.60, 0.155, 0.082, 0.048, 0.065, { shadow: false });
    core.add(leg);
    return leg;
  });

  // Sculpted Chef Coat Torso + Printed "CHEF TORGE · MIT SCHARF!" Apron
  const pelvisGeo = roundedBox(0.50, 0.18, 0.34, 0.05, 2);
  piece(core, pelvisGeo, darkPants, 0, 0.73, 0, 1, 1, 1, { shadow: false });
  endoJoint(core, 0, 0.83, 0, 0.085);

  const torsoGeo = roundedBox(0.58, 0.58, 0.38, 0.11, 3);
  piece(core, torsoGeo, chefJacket, 0, 1.13, 0, 1, 1, 1, { shadow: true });
  // Printed Chef Apron front plate
  piece(core, solid, apronMat, 0, 1.07, 0.194, 0.36, 0.50, 0.018, { shadow: false });
  // Brass double-breasted buttons
  for (const by of [0.96, 1.10, 1.24]) {
    piece(core, orb, brass, -0.21, by, 0.19, 0.02, 0.02, 0.014, { shadow: false });
    piece(core, orb, brass, 0.21, by, 0.19, 0.02, 0.02, 0.014, { shadow: false });
  }
  // Gold chain + Döner-Diamond Medallion
  const chain = band(core, brass, 0, 1.38, 0.05, 0.19);
  chain.rotation.x = -Math.PI / 2 + 0.26;
  piece(core, octa, emissive(0xffe082), 0, 1.29, 0.22, 0.048, 0.058, 0.03, { shadow: false });

  // Ribbed Animatronic Neck
  endoJoint(core, 0, 1.46, 0.01, 0.08);

  // Sculpted Mascot Head + Articulated Hinged Lower Jaw!
  const head = new THREE.Group();
  head.position.set(0, 1.70, 0.02);
  core.add(head);

  const craniumGeo = roundedBox(0.46, 0.38, 0.42, 0.12, 3);
  piece(head, craniumGeo, skin, 0, 0.04, 0, 1, 1, 1, { shadow: true });
  // Mascot Ears with brass bolts
  for (const side of [-1, 1]) {
    piece(head, orb, skin, side * 0.245, 0.03, -0.01, 0.048, 0.075, 0.042, { shadow: false });
    piece(head, orb, brass, side * 0.265, 0.03, 0.01, 0.014, 0.014, 0.014, { shadow: false });
    // Glossy Toy-Freddy style rosy cheeks!
    piece(head, orb, cheekMat, side * 0.165, -0.04, 0.195, 0.048, 0.038, 0.022, { shadow: false });
  }
  // Honkable Glossy Mascot Red Nose!
  piece(head, orb, clownNoseMat, 0, -0.01, 0.235, 0.052, 0.046, 0.052, { shadow: false });

  // Curly dark hair puffs + Forest-Green Snapback + Jeweled Golden Crown!
  for (let i = -3; i <= 3; i++) {
    piece(head, orb, darkCurlyHair, i * 0.066, 0.175, 0.185 - Math.abs(i) * 0.018, 0.068, 0.062, 0.068, { shadow: false });
  }
  piece(head, roundedBox(0.49, 0.22, 0.45, 0.09, 2), darkCurlyHair, 0, 0.13, -0.03, 1, 1, 1, { shadow: false });
  piece(head, roundedBox(0.48, 0.16, 0.46, 0.08, 2), forestCap, 0, 0.245, -0.01, 1, 1, 1, { shadow: false });
  const brim = piece(head, roundedBox(0.42, 0.036, 0.24, 0.015, 2), forestCap, 0, 0.20, 0.26, 1, 1, 1, { shadow: false });
  brim.rotation.x = 0.08;
  const crown = crownMesh(0.92);
  crown.position.set(0.02, 0.335, 0.01);
  crown.rotation.z = -0.08;
  head.add(crown);

  // Mascot-Animatronic Eye Rigs + Thick Expressive Eyebrows
  const eyes = new THREE.Group();
  head.add(eyes);
  const eyeRigs = [-1, 1].map((side) => {
    const rig = mascotEyeRig(eyes, side * 0.105, 0.055, 0.192, {
      radius: 0.058,
      irisHex: 0x2ba8ff,
      pinHex: 0x88f4ff,
      lidHex: 0xd9b89c,
      lidDrop: 0.22,
      lidTilt: side * -0.08,
    });
    const brow = piece(head, roundedBox(0.12, 0.034, 0.04, 0.012, 2), darkCurlyHair, side * 0.105, 0.132, 0.215, 1, 1, 1, { shadow: false });
    brow.rotation.z = side * -0.14;
    return rig;
  });

  // Dark Animatronic Mouth Cavity + Gleaming Upper Teeth Row on Cranium
  piece(head, roundedBox(0.25, 0.095, 0.05, 0.02, 2), socketMat, 0, -0.115, 0.196, 1, 1, 1, { shadow: false });
  for (let i = -2; i <= 2; i++) {
    piece(head, solid, teethMat, i * 0.040, -0.090, 0.214, 0.032, 0.034, 0.018, { shadow: false });
  }

  // Articulated Hinged Lower Jaw!
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.175, 0.02);
  piece(jaw, roundedBox(0.38, 0.105, 0.35, 0.042, 2), skin, 0, -0.042, 0.01, 1, 1, 1, { shadow: true });
  piece(jaw, solid, socketMat, 0, 0.012, 0.09, 0.26, 0.036, 0.21, { shadow: false });
  for (let i = -2; i <= 2; i++) {
    piece(jaw, solid, teethMat, i * 0.040, 0.022, 0.186, 0.030, 0.030, 0.018, { shadow: false });
  }
  head.add(jaw);

  // Segmented Animatronic Arms (NO balloon spheres!)
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.355, 1.33, 0);
    endoJoint(arm, 0, 0, 0, 0.062, false);
    piece(arm, capsule, chefJacket, side * 0.02, -0.15, 0.01, 0.15, 0.22, 0.15, { shadow: true });
    endoJoint(arm, side * 0.03, -0.30, 0.03, 0.052);
    piece(arm, capsule, whiteTrim, side * 0.035, -0.43, 0.09, 0.13, 0.19, 0.13, { shadow: true }).rotation.x = -0.35;
    const hand = buildAnimatronicHand(arm, skin, side, 0.95);
    hand.position.set(side * 0.04, -0.54, 0.16);
    core.add(arm);
    return arm;
  });

  // Left Hand Prop: Classic FNaF Retro Chrome Stage Microphone!
  const mic = new THREE.Group();
  mic.position.set(-0.04, -0.53, 0.21);
  mic.rotation.x = Math.PI * 0.38;
  piece(mic, round, castIron, 0, 0, 0, 0.024, 0.20, 0.024, { shadow: false });
  piece(mic, orb, chrome, 0, 0.125, 0, 0.052, 0.058, 0.052, { shadow: false });
  band(mic, brass, 0, 0.125, 0, 0.054);
  arms[0].add(mic);

  // Right Hand Prop: Sizzling Cast-Iron Skillet with Fried Egg & Döner Strips!
  const pan = new THREE.Group();
  pan.position.set(0.04, -0.52, 0.20);
  piece(pan, round, copper, 0, 0.03, 0.12, 0.028, 0.30, 0.028, { shadow: false }).rotation.x = Math.PI / 2.15;
  piece(pan, round, castIron, 0, 0.06, 0.36, 0.21, 0.055, 0.21, { shadow: true });
  piece(pan, round, brass, 0, 0.065, 0.36, 0.216, 0.02, 0.216, { shadow: false });
  // Sunny-side-up fried egg + browned Döner strips inside skillet!
  piece(pan, round, whiteTrim, -0.02, 0.09, 0.35, 0.11, 0.012, 0.095, { shadow: false });
  piece(pan, orb, emissive(0xffae19), -0.02, 0.10, 0.35, 0.045, 0.025, 0.045, { shadow: false });
  piece(pan, solid, vinylMaterial(0x6e3219, 0.5), 0.08, 0.092, 0.39, 0.08, 0.022, 0.032, { shadow: false }).rotation.y = 0.4;
  piece(pan, solid, vinylMaterial(0x572612, 0.5), 0.06, 0.092, 0.30, 0.075, 0.022, 0.03, { shadow: false }).rotation.y = -0.5;
  arms[1].add(pan);

  return { root, core, head, eyes, eyeRigs, jaw, arms, legs, crown, pan };
}

export function lostAntonModel() {
  ensureOutfitTextures();
  const root = new THREE.Group();
  const skin = vinylMaterial(0xdeb492, 0.48, 0.03);
  const hairMat = vinylMaterial(0x6b4c32, 0.62, 0.04);
  const hoodieMat = vinylMaterial(0x1b1f2e, 0.56, 0.08);
  const shirtMat = new THREE.MeshStandardMaterial({ map: _antonShirtTex, roughness: 0.58, metalness: 0.05 });
  const cargoPants = vinylMaterial(0x232838, 0.58, 0.08);
  const sneakerWhite = vinylMaterial(0xeaf0fa, 0.42, 0.06);
  const limeMat = emissive(PALETTE.neonLime);
  const cyanGlow = emissive(0x38d6ff);
  const headphoneMat = endoMaterial(0x242c40);
  const socketMat = material(0x05060b, 0.94, 0);
  const teethMat = vinylMaterial(0xf4f2e8, 0.25, 0.05);
  const darkRingMat = vinylMaterial(0x3a2846, 0.65, 0.02);
  const phoneBody = endoMaterial(0x111520);
  const phoneScreenMat = new THREE.MeshBasicMaterial({ map: _antonPhoneTex });

  const core = new THREE.Group();
  core.scale.set(1.02, 1.10, 1.02);
  root.add(core);

  // Lanky Cargo Pants + Lime-Sole Skate Sneakers
  const shoeGeo = roundedBox(0.15, 0.095, 0.27, 0.03, 2);
  const legs = [-1, 1].map((side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.145, 0.78, 0);
    endoJoint(leg, 0, 0, 0, 0.055);
    piece(leg, capsule, cargoPants, 0, -0.19, 0, 0.14, 0.28, 0.14, { shadow: true });
    // Cargo side pocket
    piece(leg, solid, hoodieMat, side * 0.075, -0.18, 0.01, 0.03, 0.11, 0.09, { shadow: false });
    endoJoint(leg, 0, -0.39, 0.01, 0.052);
    piece(leg, capsule, cargoPants, 0, -0.56, 0, 0.13, 0.26, 0.13, { shadow: true });
    piece(leg, shoeGeo, hoodieMat, 0, -0.72, 0.05, 1, 1, 1, { shadow: true });
    piece(leg, solid, sneakerWhite, 0, -0.755, 0.05, 0.158, 0.026, 0.28, { shadow: false });
    piece(leg, solid, limeMat, 0, -0.735, 0.16, 0.11, 0.012, 0.04, { shadow: false });
    core.add(leg);
    return leg;
  });

  // Slouched Streetwear Zip-Hoodie + "404 WO AUSGANG?!" Graphic Tee
  piece(core, roundedBox(0.44, 0.16, 0.30, 0.04, 2), cargoPants, 0, 0.83, 0, 1, 1, 1, { shadow: false });
  endoJoint(core, 0, 0.93, 0, 0.072);
  const torso = piece(core, roundedBox(0.50, 0.60, 0.33, 0.10, 3), hoodieMat, 0, 1.24, 0.01, 1, 1, 1, { shadow: true });
  torso.rotation.x = 0.06;
  piece(core, solid, shirtMat, 0, 1.23, 0.172, 0.30, 0.48, 0.016, { shadow: false }).rotation.x = 0.06;
  // Bunched hood collar + neon drawstrings
  piece(core, hoop, hoodieMat, 0, 1.52, -0.02, 0.17, 0.17, 0.22, { shadow: false }).rotation.x = Math.PI / 2 - 0.15;
  piece(core, capsule, sneakerWhite, -0.07, 1.38, 0.18, 0.016, 0.16, 0.016, { shadow: false });
  piece(core, capsule, sneakerWhite, 0.07, 1.36, 0.18, 0.016, 0.19, 0.016, { shadow: false });

  endoJoint(core, 0, 1.57, 0.02, 0.068);

  // Confused Tilted Head + Crooked Gamer Headphones + Hinged Jaw!
  const head = new THREE.Group();
  head.position.set(0, 1.78, 0.04);
  head.rotation.z = 0.13;
  core.add(head);

  piece(head, roundedBox(0.41, 0.38, 0.38, 0.11, 3), skin, 0, 0.03, 0, 1, 1, 1, { shadow: true });
  piece(head, orb, skin, 0, -0.01, 0.20, 0.035, 0.042, 0.042, { shadow: false });

  // Tousled chestnut 3D hair locks
  piece(head, roundedBox(0.44, 0.17, 0.40, 0.08, 2), hairMat, 0, 0.17, -0.02, 1, 1, 1, { shadow: false });
  piece(head, roundedBox(0.28, 0.09, 0.18, 0.04, 2), hairMat, -0.05, 0.21, 0.13, 1, 1, 1, { shadow: false }).rotation.z = 0.18;
  piece(head, roundedBox(0.20, 0.08, 0.16, 0.03, 2), hairMat, 0.10, 0.19, 0.14, 1, 1, 1, { shadow: false }).rotation.z = -0.22;

  // Crooked Wireless Gamer Headphones with Cyan LED rings (overhead XY half-torus arc!)
  const hpGroup = new THREE.Group();
  hpGroup.rotation.z = -0.07;
  piece(hpGroup, _headbandArcGeo, headphoneMat, 0, 0.035, -0.01, 1, 1, 1, { shadow: false });
  for (const side of [-1, 1]) {
    const zOff = side === 1 ? -0.03 : 0.01;
    piece(hpGroup, round, headphoneMat, side * 0.232, 0.025, zOff, 0.068, 0.055, 0.068, { shadow: false }).rotation.z = Math.PI / 2;
    piece(hpGroup, hoop, cyanGlow, side * 0.256, 0.025, zOff, 0.052, 0.052, 0.052, { shadow: false }).rotation.y = Math.PI / 2;
  }
  head.add(hpGroup);

  // Tired Dark Eye-Bags + Wide Bewildered Mascot Eyes + Asymmetrical Worried Brows
  const eyes = new THREE.Group();
  head.add(eyes);
  const eyeRigs = [-1, 1].map((side) => {
    piece(head, orb, darkRingMat, side * 0.092, 0.032, 0.178, 0.062, 0.056, 0.024, { shadow: false });
    const rig = mascotEyeRig(eyes, side * 0.092, 0.045, 0.182, {
      radius: 0.054,
      irisHex: 0xff2948,
      pinHex: 0xff3b56,
      lidHex: 0xcab09c,
      lidDrop: side === -1 ? 0.12 : 0.28,
      lidTilt: side * 0.16,
    });
    const brow = piece(head, roundedBox(0.105, 0.026, 0.035, 0.01, 2), hairMat, side * 0.095, 0.122 + (side === 1 ? 0.018 : 0), 0.198, 1, 1, 1, { shadow: false });
    brow.rotation.z = side * 0.22;
    return rig;
  });

  // Articulated Hinged Lower Jaw with Goofy Gapped Teeth + Dark Mouth Interior
  piece(head, roundedBox(0.20, 0.085, 0.045, 0.018, 2), socketMat, 0, -0.108, 0.178, 1, 1, 1, { shadow: false });
  for (const tx of [-0.050, -0.017, 0.022, 0.054]) {
    piece(head, solid, teethMat, tx, -0.086, 0.194, 0.025, 0.030, 0.018, { shadow: false });
  }
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.165, 0.02);
  piece(jaw, roundedBox(0.32, 0.095, 0.31, 0.038, 2), skin, 0, -0.038, 0.01, 1, 1, 1, { shadow: true });
  piece(jaw, solid, socketMat, 0, 0.012, 0.075, 0.21, 0.034, 0.19, { shadow: false });
  for (const tx of [-0.044, 0.0, 0.044]) {
    piece(jaw, solid, teethMat, tx, 0.022, 0.166, 0.025, 0.028, 0.018, { shadow: false });
  }
  head.add(jaw);

  // Long Lanky Hoodie Arms + Glowing GPS Smartphone!
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.30, 1.46, 0.01);
    endoJoint(arm, 0, 0, 0, 0.052, false);
    piece(arm, capsule, hoodieMat, side * 0.02, -0.17, 0.01, 0.125, 0.26, 0.125, { shadow: true });
    endoJoint(arm, side * 0.035, -0.35, 0.03, 0.046);
    piece(arm, capsule, hoodieMat, side * 0.045, -0.50, 0.08, 0.115, 0.24, 0.115, { shadow: true }).rotation.x = -0.25;
    const hand = buildAnimatronicHand(arm, skin, side, 0.88);
    hand.position.set(side * 0.055, -0.65, 0.14);
    core.add(arm);
    return arm;
  });

  const phone = new THREE.Group();
  phone.position.set(0.05, -0.66, 0.21);
  phone.rotation.x = -0.45;
  phone.rotation.y = -0.2;
  piece(phone, roundedBox(0.13, 0.23, 0.024, 0.018, 2), phoneBody, 0, 0, 0, 1, 1, 1, { shadow: false });
  const phoneScreen = piece(phone, solid, phoneScreenMat, 0, 0, 0.014, 0.112, 0.205, 0.006, { shadow: false });
  arms[1].add(phone);

  return { root, core, head, eyes, eyeRigs, jaw, arms, legs, phone, phoneScreen };
}

export function bossHaukeModel() {
  const root = new THREE.Group();
  const skin = vinylMaterial(0xe0b796, 0.48, 0.03);
  const hairMat = vinylMaterial(0x42291c, 0.6, 0.05);
  const trackJacket = vinylMaterial(0x14523b, 0.44, 0.10);
  const whiteTank = vinylMaterial(0xf2f5fc, 0.48, 0.04);
  const greyJoggers = vinylMaterial(0x525a6c, 0.58, 0.06);
  const brass = brassMaterial(PALETTE.brass);
  const ironBoot = endoMaterial(0x1f2534);
  const browMat = vinylMaterial(0x261710, 0.55, 0.08);
  const socketMat = material(0x05060b, 0.94, 0);
  const teethMat = vinylMaterial(0xf7f3e6, 0.22, 0.08);
  const foilMat = endoMaterial(0xd8e0ee);

  const core = new THREE.Group();
  root.add(core);

  // Heavy Seismic Stomp Boots + Track-Stripe Joggers
  const bootGeo = roundedBox(0.28, 0.17, 0.40, 0.045, 2);
  const legs = [-1, 1].map((side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.29, 0.62, 0);
    endoJoint(leg, 0, 0, 0, 0.085);
    piece(leg, capsule, greyJoggers, 0, -0.20, 0, 0.26, 0.28, 0.26, { shadow: true });
    // White Adidas-style track stripe
    piece(leg, solid, whiteTank, side * 0.132, -0.20, 0, 0.018, 0.32, 0.05, { shadow: false });
    piece(leg, bootGeo, ironBoot, 0, -0.52, 0.07, 1, 1, 1, { shadow: true });
    piece(leg, solid, brass, 0, -0.58, 0.08, 0.30, 0.045, 0.42, { shadow: false });
    piece(leg, solid, brass, 0, -0.46, 0.24, 0.20, 0.07, 0.06, { shadow: false });
    core.add(leg);
    return leg;
  });

  // Broad Barrel-Chested Bouncer Torso (spans y=0.68..1.46 — ZERO clipping into head/chin at y=1.78!)
  piece(core, roundedBox(0.84, 0.24, 0.58, 0.07, 2), greyJoggers, 0, 0.68, 0.02, 1, 1, 1, { shadow: true });
  // Brass Championship/Richter Belt + Glowing "8.4" Buckle!
  piece(core, roundedBox(0.88, 0.09, 0.62, 0.03, 2), ironBoot, 0, 0.78, 0.02, 1, 1, 1, { shadow: false });
  piece(core, roundedBox(0.26, 0.15, 0.08, 0.025, 2), brass, 0, 0.78, 0.34, 1, 1, 1, { shadow: false });
  piece(core, octa, emissive(0xffaa30), 0, 0.78, 0.385, 0.05, 0.05, 0.02, { shadow: false });

  // Sculpted Wide Chest & Open Track Jacket (max y = 1.47!)
  const belly = piece(core, roundedBox(0.98, 0.68, 0.66, 0.16, 3), whiteTank, 0, 1.13, 0.03, 1, 1, 1, { shadow: true });
  piece(core, roundedBox(0.32, 0.70, 0.70, 0.11, 3), trackJacket, -0.37, 1.13, 0.02, 1, 1, 1, { shadow: true });
  piece(core, roundedBox(0.32, 0.70, 0.70, 0.11, 3), trackJacket, 0.37, 1.13, 0.02, 1, 1, 1, { shadow: true });
  piece(core, roundedBox(1.00, 0.70, 0.26, 0.10, 2), trackJacket, 0, 1.13, -0.20, 1, 1, 1, { shadow: false });
  // Gold Cuban Link Chain on chest
  const chain = band(core, brass, 0, 1.42, 0.08, 0.27);
  chain.rotation.x = -Math.PI / 2 + 0.34;

  // Visible Muscular Animatronic Neck Joint (clean gap before jaw!)
  endoJoint(core, 0, 1.53, 0.06, 0.105);

  // Squared-Off Boss Head + Elvis Pompadour Quiff + Heavy Hinged Jaw!
  const head = new THREE.Group();
  head.position.set(0, 1.80, 0.08);
  core.add(head);

  piece(head, roundedBox(0.56, 0.42, 0.48, 0.13, 3), skin, 0, 0.05, 0, 1, 1, 1, { shadow: true });
  for (const side of [-1, 1]) {
    piece(head, orb, skin, side * 0.295, 0.03, 0, 0.055, 0.082, 0.048, { shadow: false });
  }
  piece(head, orb, skin, 0, 0.0, 0.255, 0.058, 0.052, 0.06, { shadow: false });

  // Boss Pompadour Quiff
  piece(head, roundedBox(0.58, 0.18, 0.48, 0.08, 2), hairMat, 0, 0.24, -0.02, 1, 1, 1, { shadow: false });
  const quiff = piece(head, roundedBox(0.38, 0.15, 0.26, 0.06, 2), hairMat, 0, 0.31, 0.16, 1, 1, 1, { shadow: false });
  quiff.rotation.x = -0.24;

  // Blazing Amber Mascot-Animatronic Eyes + Thick Furious V-Eyebrows!
  const eyes = new THREE.Group();
  head.add(eyes);
  const eyeRigs = [-1, 1].map((side) => {
    const rig = mascotEyeRig(eyes, side * 0.135, 0.065, 0.228, {
      radius: 0.064,
      irisHex: 0xff9f1c,
      pinHex: 0xffbe42,
      lidHex: 0xd8b89c,
      lidDrop: 0.34,
      lidTilt: side * -0.26,
    });
    const brow = piece(head, roundedBox(0.18, 0.05, 0.055, 0.015, 2), browMat, side * 0.135, 0.155, 0.255, 1, 1, 1, { shadow: false });
    brow.rotation.z = side * -0.30;
    return rig;
  });

  // Dark Mouth Cavity + Upper Teeth + Gold Canine!
  piece(head, roundedBox(0.34, 0.11, 0.055, 0.022, 2), socketMat, 0, -0.132, 0.228, 1, 1, 1, { shadow: false });
  for (let i = -3; i <= 3; i++) {
    piece(head, solid, i === 2 ? brass : teethMat, i * 0.044, -0.102, 0.248, 0.034, 0.038, 0.020, { shadow: false });
  }

  // Heavy Hinged Chomping Lower Jaw (100% visible above chest!)
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.205, 0.02);
  piece(jaw, roundedBox(0.48, 0.125, 0.42, 0.048, 2), skin, 0, -0.045, 0.02, 1, 1, 1, { shadow: true });
  piece(jaw, solid, socketMat, 0, 0.015, 0.105, 0.34, 0.042, 0.26, { shadow: false });
  for (let i = -3; i <= 3; i++) {
    piece(jaw, solid, teethMat, i * 0.044, 0.028, 0.222, 0.034, 0.036, 0.020, { shadow: false });
  }
  head.add(jaw);

  // Powerhouse Bouncer Arms + Foil-Wrapped XXL-Dürüm!
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.62, 1.34, 0.04);
    endoJoint(arm, 0, 0, 0, 0.085, false);
    piece(arm, capsule, trackJacket, side * 0.04, -0.18, 0.02, 0.26, 0.26, 0.26, { shadow: true });
    endoJoint(arm, side * 0.06, -0.38, 0.06, 0.072);
    piece(arm, capsule, skin, side * 0.07, -0.54, 0.14, 0.22, 0.24, 0.22, { shadow: true }).rotation.x = -0.32;
    const hand = buildAnimatronicHand(arm, skin, side, 1.32);
    hand.position.set(side * 0.08, -0.70, 0.24);
    if (side === -1) {
      // Brass knuckle ring on left fist
      piece(arm, solid, brass, -0.08, -0.74, 0.29, 0.14, 0.028, 0.035, { shadow: false });
    }
    core.add(arm);
    return arm;
  });

  // Half-eaten foil-wrapped XXL-Dürüm in Hauke's right fist!
  const durum = new THREE.Group();
  durum.position.set(0.08, -0.70, 0.32);
  durum.rotation.z = 0.45;
  durum.rotation.x = 0.35;
  piece(durum, round, foilMat, 0, -0.04, 0, 0.062, 0.24, 0.062, { shadow: false });
  piece(durum, round, vinylMaterial(0xe8cfa0, 0.65), 0, 0.11, 0, 0.058, 0.09, 0.058, { shadow: false });
  piece(durum, orb, vinylMaterial(0x6e3219, 0.5), 0, 0.16, 0, 0.05, 0.032, 0.05, { shadow: false });
  arms[1].add(durum);

  return { root, core, head, eyes, eyeRigs, jaw, arms, legs, belly };
}

export function schnorrerTomModel() {
  ensureOutfitTextures();
  const root = new THREE.Group();
  const skin = vinylMaterial(0xdeb695, 0.48, 0.03);
  const darkHair = vinylMaterial(0x32221a, 0.65, 0.04);
  const khakiCap = vinylMaterial(PALETTE.khaki, 0.48, 0.06);
  const coralVisor = vinylMaterial(0xff7262, 0.46, 0.06);
  const surfMat = new THREE.MeshStandardMaterial({ map: _tomShirtTex, roughness: 0.5, metalness: 0.04 });
  const bibMat = new THREE.MeshStandardMaterial({ map: _tomBibTex, roughness: 0.55, metalness: 0.02 });
  const darkPants = vinylMaterial(0x1d2334, 0.55, 0.08);
  const tealShoe = vinylMaterial(0x1f9e96, 0.45, 0.08);
  const whiteTrim = vinylMaterial(0xf5f2ea, 0.4, 0.05);
  const bagMat = vinylMaterial(0xb86635, 0.52, 0.14);
  const bottleMat = vinylMaterial(0x1f9d55, 0.15, 0.35);
  const brass = brassMaterial(PALETTE.brass);
  const socketMat = material(0x05060b, 0.94, 0);
  const teethMat = vinylMaterial(0xfaf8f0, 0.2, 0.06);

  const core = new THREE.Group();
  root.add(core);

  // Skater Chinos + Teal/White Vans Sneakers
  const shoeGeo = roundedBox(0.155, 0.095, 0.26, 0.03, 2);
  const legs = [-1, 1].map((side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.15, 0.66, 0);
    endoJoint(leg, 0, 0, 0, 0.055);
    piece(leg, capsule, darkPants, 0, -0.15, 0, 0.15, 0.21, 0.15, { shadow: true });
    endoJoint(leg, 0, -0.31, 0.01, 0.05);
    piece(leg, capsule, darkPants, 0, -0.45, 0, 0.14, 0.19, 0.14, { shadow: true });
    piece(leg, shoeGeo, tealShoe, 0, -0.59, 0.045, 1, 1, 1, { shadow: true });
    piece(leg, solid, whiteTrim, 0, -0.625, 0.045, 0.162, 0.028, 0.27, { shadow: false });
    core.add(leg);
    return leg;
  });

  // Sneaky Forward-Leaning Surf-Miami Torso + Chica-Homage "GRATIS SPEZI?!" Bib!
  piece(core, roundedBox(0.46, 0.17, 0.32, 0.045, 2), darkPants, 0, 0.71, 0.01, 1, 1, 1, { shadow: false });
  endoJoint(core, 0, 0.81, 0.02, 0.075);
  const torso = piece(core, roundedBox(0.52, 0.56, 0.35, 0.10, 3), surfMat, 0, 1.10, 0.04, 1, 1, 1, { shadow: true });
  torso.rotation.x = 0.10;
  const bib = piece(core, solid, bibMat, 0, 1.15, 0.228, 0.33, 0.34, 0.014, { shadow: false });
  bib.rotation.x = 0.10;

  // Bulging Pfand-Rucksack stuffed with Spezi Cans & Green Pfand Bottle!
  const pack = new THREE.Group();
  pack.position.set(0, 1.10, -0.22);
  pack.rotation.x = 0.08;
  piece(pack, roundedBox(0.46, 0.48, 0.28, 0.09, 2), bagMat, 0, 0, 0, 1, 1, 1, { shadow: true });
  piece(pack, solid, brass, -0.12, 0.08, 0.15, 0.04, 0.42, 0.04, { shadow: false });
  piece(pack, solid, brass, 0.12, 0.08, 0.15, 0.04, 0.42, 0.04, { shadow: false });
  const can1 = speziCanMesh();
  can1.position.set(0.11, 0.22, -0.02);
  can1.rotation.z = -0.32;
  can1.scale.setScalar(0.85);
  pack.add(can1);
  // Green glass Pfand bottle poking out!
  const bottle = new THREE.Group();
  bottle.position.set(-0.10, 0.24, 0.01);
  bottle.rotation.z = 0.26;
  piece(bottle, round, bottleMat, 0, 0, 0, 0.042, 0.16, 0.042, { shadow: false });
  piece(bottle, round, bottleMat, 0, 0.11, 0, 0.018, 0.10, 0.018, { shadow: false });
  piece(bottle, round, brass, 0, 0.165, 0, 0.021, 0.015, 0.021, { shadow: false });
  pack.add(bottle);
  core.add(pack);

  endoJoint(core, 0, 1.42, 0.07, 0.07);

  // Mischievous Mascot Head + Backwards Snapback Cap + Buck-Toothed Hinged Jaw!
  const head = new THREE.Group();
  head.position.set(0, 1.63, 0.09);
  core.add(head);

  piece(head, roundedBox(0.44, 0.37, 0.40, 0.11, 3), skin, 0, 0.03, 0, 1, 1, 1, { shadow: true });
  for (const side of [-1, 1]) {
    piece(head, orb, skin, side * 0.23, 0.02, 0, 0.042, 0.068, 0.038, { shadow: false });
  }
  piece(head, orb, skin, 0, -0.01, 0.215, 0.04, 0.038, 0.045, { shadow: false });

  // Backwards Snapback Cap with front snap-hole + messy brown hair tuft!
  piece(head, roundedBox(0.46, 0.16, 0.43, 0.08, 2), khakiCap, 0, 0.20, -0.01, 1, 1, 1, { shadow: false });
  piece(head, roundedBox(0.36, 0.034, 0.22, 0.015, 2), coralVisor, 0, 0.145, -0.28, 1, 1, 1, { shadow: false }).rotation.x = -0.08;
  piece(head, solid, coralVisor, 0, 0.145, 0.212, 0.13, 0.024, 0.02, { shadow: false });
  piece(head, orb, darkHair, 0, 0.165, 0.21, 0.068, 0.052, 0.048, { shadow: false });

  // Scheming Half-Lidded Emerald Mascot Eyes!
  const eyes = new THREE.Group();
  head.add(eyes);
  const eyeRigs = [-1, 1].map((side) => {
    const rig = mascotEyeRig(eyes, side * 0.098, 0.042, 0.188, {
      radius: 0.055,
      irisHex: 0x1fd68a,
      pinHex: 0x38f2af,
      lidHex: 0xd6ba9e,
      lidDrop: 0.46,
      lidTilt: side * -0.14,
    });
    const brow = piece(head, roundedBox(0.11, 0.028, 0.038, 0.01, 2), darkHair, side * 0.098, 0.118, 0.206, 1, 1, 1, { shadow: false });
    brow.rotation.z = side === -1 ? 0.18 : -0.22;
    return rig;
  });

  // Dark Mouth Cavity + Prominent Goofy Buck Teeth + Hinged Lower Jaw
  piece(head, roundedBox(0.22, 0.09, 0.048, 0.018, 2), socketMat, 0, -0.112, 0.188, 1, 1, 1, { shadow: false });
  piece(head, solid, teethMat, -0.023, -0.092, 0.208, 0.038, 0.046, 0.018, { shadow: false });
  piece(head, solid, teethMat, 0.023, -0.092, 0.208, 0.038, 0.046, 0.018, { shadow: false });

  const jaw = new THREE.Group();
  jaw.position.set(0, -0.165, 0.02);
  piece(jaw, roundedBox(0.35, 0.098, 0.33, 0.040, 2), skin, 0, -0.038, 0.01, 1, 1, 1, { shadow: true });
  piece(jaw, solid, socketMat, 0, 0.012, 0.08, 0.23, 0.035, 0.20, { shadow: false });
  for (let i = -2; i <= 2; i++) {
    piece(jaw, solid, teethMat, i * 0.036, 0.022, 0.175, 0.027, 0.028, 0.018, { shadow: false });
  }
  head.add(jaw);

  // Greedy Reaching Arms + Stolen Cold Spezi Can!
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.32, 1.30, 0.05);
    endoJoint(arm, 0, 0, 0, 0.055, false);
    piece(arm, capsule, surfMat, side * 0.02, -0.13, 0.02, 0.14, 0.18, 0.14, { shadow: true });
    endoJoint(arm, side * 0.035, -0.27, 0.05, 0.048);
    piece(arm, capsule, skin, side * 0.045, -0.39, 0.12, 0.115, 0.19, 0.115, { shadow: true }).rotation.x = -0.42;
    const hand = buildAnimatronicHand(arm, skin, side, 0.92);
    hand.position.set(side * 0.05, -0.50, 0.20);
    core.add(arm);
    return arm;
  });

  const handSpezi = speziCanMesh();
  handSpezi.position.set(-0.05, -0.52, 0.26);
  handSpezi.rotation.x = 0.25;
  arms[0].add(handSpezi);

  return { root, core, head, eyes, eyeRigs, jaw, arms, legs };
}

export function goldenDuckModel() {
  const root = new THREE.Group();
  const goldSuit = new THREE.MeshStandardMaterial({ color: 0xe6b422, roughness: 0.32, metalness: 0.55 });
  const beak = vinylMaterial(0xe05818, 0.36, 0.10);
  const topHatMat = vinylMaterial(0x14111c, 0.5, 0.15);
  const purpleRibbon = vinylMaterial(0x8e3dff, 0.35, 0.15);
  const bowtieMat = vinylMaterial(0xd91e36, 0.35, 0.12);
  const socket = material(0x030306, 0.96, 0);
  const pinpoint = emissive(0xffffff);
  const endo = endoMaterial(0x161924);

  // Slumped Golden-Freddy sitting pose!
  const core = new THREE.Group();
  core.scale.set(1.55, 1.55, 1.55);
  root.add(core);

  // Plump gilded animatronic torso + red bowtie
  piece(core, roundedBox(0.56, 0.50, 0.52, 0.18, 3), goldSuit, 0, 0.32, 0, 1, 1, 1, { shadow: true });
  piece(core, solid, bowtieMat, -0.06, 0.50, 0.265, 0.09, 0.055, 0.03, { shadow: false }).rotation.z = 0.2;
  piece(core, solid, bowtieMat, 0.06, 0.50, 0.265, 0.09, 0.055, 0.03, { shadow: false }).rotation.z = -0.2;
  piece(core, orb, bowtieMat, 0, 0.50, 0.275, 0.025, 0.025, 0.02, { shadow: false });

  // Limp splayed webbed feet in front
  for (const side of [-1, 1]) {
    endoJoint(core, side * 0.18, 0.12, 0.18, 0.048);
    const foot = piece(core, roundedBox(0.18, 0.06, 0.24, 0.02, 2), beak, side * 0.22, 0.05, 0.32, 1, 1, 1, { shadow: true });
    foot.rotation.y = side * -0.32;
    foot.rotation.x = -0.25;
  }

  // Limp slumped wings/arms
  const arms = [-1, 1].map((side) => {
    const wing = new THREE.Group();
    wing.position.set(side * 0.31, 0.42, 0.02);
    endoJoint(wing, 0, 0, 0, 0.048, false);
    const blade = piece(wing, roundedBox(0.12, 0.32, 0.22, 0.05, 2), goldSuit, side * 0.04, -0.16, 0.04, 1, 1, 1, { shadow: true });
    blade.rotation.z = side * -0.22;
    core.add(wing);
    return wing;
  });

  endoJoint(core, 0, 0.60, 0.03, 0.065);

  // Slumped Gilded Duck Head + Crooked Top Hat + Hinged Bill + Hollow Pinprick Sockets!
  const head = new THREE.Group();
  head.position.set(0, 0.82, 0.06);
  head.rotation.z = -0.26;
  head.rotation.x = 0.10;
  core.add(head);

  piece(head, roundedBox(0.46, 0.40, 0.44, 0.16, 3), goldSuit, 0, 0.02, 0, 1, 1, 1, { shadow: true });
  // Upper bill
  piece(head, roundedBox(0.28, 0.085, 0.22, 0.035, 2), beak, 0, -0.04, 0.27, 1, 1, 1, { shadow: true });
  // Slack open lower bill (jaw) exposing dark endo rings!
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.10, 0.16);
  jaw.rotation.x = 0.24;
  piece(jaw, roundedBox(0.24, 0.055, 0.20, 0.025, 2), beak, 0, -0.02, 0.09, 1, 1, 1, { shadow: false });
  piece(jaw, solid, endo, 0, 0.015, 0.06, 0.16, 0.03, 0.14, { shadow: false });
  head.add(jaw);

  // Crooked Purple-Ribbon Top Hat!
  const hat = new THREE.Group();
  hat.position.set(0.03, 0.23, -0.01);
  hat.rotation.z = -0.12;
  piece(hat, round, topHatMat, 0, 0, 0, 0.19, 0.025, 0.19, { shadow: false });
  piece(hat, round, topHatMat, 0, 0.11, 0, 0.125, 0.20, 0.125, { shadow: true });
  piece(hat, round, purpleRibbon, 0, 0.035, 0, 0.128, 0.038, 0.128, { shadow: false });
  head.add(hat);

  const eyes = new THREE.Group();
  head.add(eyes);
  for (const side of [-1, 1]) {
    piece(head, orb, socket, side * 0.115, 0.055, 0.195, 0.068, 0.068, 0.045, { shadow: false });
    piece(eyes, orb, pinpoint, side * 0.115, 0.055, 0.235, 0.018, 0.018, 0.014, { shadow: false });
  }

  return { root, core, head, eyes, jaw, arms };
}

/**
 * Builds creepy spare animatronic mascot heads for CAM 5 (Parts & Service / Werkstatt) that can turn and stare!
 */
export function spareMascotHeadMesh(variant = 0) {
  const g = new THREE.Group();
  const shellHex = [0xd6b89e, 0xe6b422, 0x3b4459][variant % 3];
  const shell = vinylMaterial(shellHex, 0.42, variant === 2 ? 0.72 : 0.12);
  const socket = material(0x04050a, 0.95, 0);
  const pinMat = emissive(variant === 1 ? 0xffffff : 0xff3550);

  piece(g, roundedBox(0.34, 0.30, 0.32, 0.09, 2), shell, 0, 0.15, 0, 1, 1, 1, { shadow: true });
  if (variant === 0) {
    piece(g, orb, vinylMaterial(0xff3328, 0.2), 0, 0.14, 0.18, 0.038, 0.035, 0.038, { shadow: false });
  } else if (variant === 1) {
    piece(g, roundedBox(0.20, 0.065, 0.15, 0.02, 2), vinylMaterial(0xe05818, 0.4), 0, 0.10, 0.20, 1, 1, 1, { shadow: false });
  }
  const pins = new THREE.Group();
  pins.visible = false;
  for (const side of [-1, 1]) {
    piece(g, orb, socket, side * 0.082, 0.17, 0.148, 0.048, 0.048, 0.032, { shadow: false });
    piece(pins, orb, pinMat, side * 0.082, 0.17, 0.176, 0.015, 0.015, 0.012, { shadow: false });
  }
  g.add(pins);
  return { root: g, pins };
}
