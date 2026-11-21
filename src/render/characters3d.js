import * as GL from './webgl/index.js';
import {
  antonOutfitTexture,
  antonPhoneGlowTexture,
  characterFaceTexture,
  duckSuitClothTexture,
  haukeRingerTeeTexture,
  tomSurfTeeTexture,
  torgeJacketTexture,
} from './characterTextures.js';
import {
  brassMaterial,
  buildSculptedHand,
  endoMaterial,
  material,
  octa,
  orb,
  piece,
  round,
  roundedBox,
  sculptedHeadGeometry,
  sculptedJawGeometry,
  sculptedLimbGeometry,
  sculptedTorsoGeometry,
  solid,
  TAU,
  uncannyEyeRig,
  vinylMaterial,
} from './primitives.js';
import { speziWrapTexture } from './textures.js';

let _texCache = null;

export function invalidateCharacterTextures() {
  _texCache = null;
}

function getCharTextures() {
  if (!_texCache) {
    _texCache = {
      spezi: speziWrapTexture(),
      faceTorge: characterFaceTexture('torge'),
      faceAnton: characterFaceTexture('anton'),
      faceTom: characterFaceTexture('tom'),
      faceHauke: characterFaceTexture('hauke'),
      faceDuck: characterFaceTexture('duck'),
      torgeJacket: torgeJacketTexture(),
      antonOutfit: antonOutfitTexture(),
      antonPhone: antonPhoneGlowTexture(),
      tomShirt: tomSurfTeeTexture(),
      haukeShirt: haukeRingerTeeTexture(),
      duckSuit: duckSuitClothTexture(),
    };
  }
  return _texCache;
}

export function speziCanMesh() {
  const tex = getCharTextures();
  const g = new GL.Group();
  const wrapMat = new GL.MeshStandardMaterial({
    map: tex.spezi,
    roughness: 0.36,
    metalness: 0.42,
  });
  const alu = material(0xb8c2d2, 0.28, 0.82);
  const darkTab = material(0x181c26, 0.35, 0.65);
  piece(g, round, wrapMat, 0, 0.095, 0, 0.048, 0.17, 0.048, { shadow: true });
  piece(g, round, alu, 0, 0.184, 0, 0.045, 0.012, 0.045, { shadow: false });
  piece(g, round, alu, 0, 0.008, 0, 0.045, 0.010, 0.045, { shadow: false });
  piece(g, solid, darkTab, 0.006, 0.192, 0, 0.018, 0.004, 0.012, { shadow: false });
  return g;
}

/**
 * Crooked, tarnished brass crown (no glowing toy gems!).
 */
export function crownMesh(scale = 1) {
  const crown = new GL.Group();
  const tarnishedBrass = new GL.MeshStandardMaterial({
    color: 0x947032,
    roughness: 0.52,
    metalness: 0.76,
    flatShading: true,
  });
  const darkVelvet = vinylMaterial(0x3a1218, 0.82, 0.02);
  piece(crown, round, tarnishedBrass, 0, 0, 0, 0.135 * scale, 0.055 * scale, 0.135 * scale, { shadow: false });
  piece(crown, orb, darkVelvet, 0, 0.022 * scale, 0, 0.11 * scale, 0.055 * scale, 0.11 * scale, { shadow: false });
  for (let i = 0; i < 5; i++) {
    const a = (i * TAU) / 5;
    const spikeH = (i === 2 ? 0.055 : 0.082) * scale; // one slightly bent/shorter point
    const pt = piece(
      crown,
      octa,
      tarnishedBrass,
      Math.cos(a) * 0.118 * scale,
      0.058 * scale,
      Math.sin(a) * 0.118 * scale,
      0.034 * scale,
      spikeH,
      0.034 * scale,
      { shadow: false },
    );
    if (i === 2) pt.rotation.z = 0.24;
  }
  return crown;
}

/**
 * Shared builder for our 17-joint faceted PS1/VHS low-poly human rig:
 * pelvis -> torso -> chest -> neck -> head -> (jaw, eyes)
 * chest -> leftUpperArm -> leftForearm -> leftHand
 * chest -> rightUpperArm -> rightForearm -> rightHand
 * pelvis -> leftThigh -> leftCalf -> leftFoot
 * pelvis -> rightThigh -> rightCalf -> rightFoot
 */
function buildHumanRig({
  totalScale = 1.0,
  pelvisY = 0.92,
  hipSpacing = 0.115,
  thighLen = 0.42,
  calfLen = 0.41,
  thighR = 0.076,
  calfR = 0.058,
  torsoCfg = {},
  shoulderX = 0.23,
  shoulderY = 0.47,
  upperArmLen = 0.29,
  forearmLen = 0.26,
  armR = 0.058,
  neckLen = 0.085,
  headCfg = {},
  jawCfg = {},
  eyeCfg = {},
  faceMat,
  skinMat,
  torsoMat,
  sleeveMat,
  forearmMat,
  pantsMat,
  shoeMat,
  soleMat,
}) {
  const root = new GL.Group();
  const core = new GL.Group();
  core.scale.setScalar(totalScale);
  root.add(core);

  const pelvis = new GL.Group();
  pelvis.position.set(0, pelvisY, 0);
  core.add(pelvis);

  const pelvisMeshGeo = roundedBox(hipSpacing * 2.35, 0.15, (torsoCfg.depth || 0.24) * 0.92, 0.04, 1);
  piece(pelvis, pelvisMeshGeo, pantsMat, 0, 0, 0, 1, 1, 1, { shadow: true });

  const thighGeo = sculptedLimbGeometry({ topR: thighR, midR: thighR * 0.90, botR: thighR * 0.76, length: thighLen, crease: 0.008 });
  const calfGeo = sculptedLimbGeometry({ topR: calfR, midR: calfR * 0.88, botR: calfR * 0.72, length: calfLen, crease: 0.006 });
  const shoeGeo = roundedBox(calfR * 2.15, 0.085, 0.26, 0.025, 1);

  const buildLeg = (side) => {
    const thigh = new GL.Group();
    thigh.position.set(side * hipSpacing, -0.04, 0);
    const tm = new GL.Mesh(thighGeo, pantsMat);
    tm.castShadow = true;
    tm.receiveShadow = true;
    thigh.add(tm);

    const calf = new GL.Group();
    calf.position.set(0, -thighLen, 0);
    const cm = new GL.Mesh(calfGeo, pantsMat);
    cm.castShadow = true;
    cm.receiveShadow = true;
    calf.add(cm);

    const foot = new GL.Group();
    foot.position.set(0, -calfLen, 0);
    piece(foot, shoeGeo, shoeMat, 0, -0.035, 0.048, 1, 1, 1, { shadow: true });
    if (soleMat) {
      piece(foot, solid, soleMat, 0, -0.075, 0.048, calfR * 2.22, 0.020, 0.27, { shadow: false });
    }
    calf.add(foot);
    thigh.add(calf);
    pelvis.add(thigh);
    return { thigh, calf, foot };
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  // Torso & Chest
  const torso = new GL.Group();
  torso.position.set(0, 0.05, 0);
  pelvis.add(torso);

  const tHeight = torsoCfg.height || 0.54;
  const torsoGeo = sculptedTorsoGeometry(torsoCfg);
  const torsoMesh = new GL.Mesh(torsoGeo, torsoMat);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  torso.add(torsoMesh);

  const chest = new GL.Group();
  chest.position.set(0, shoulderY, torsoCfg.hunch || 0);
  torso.add(chest);

  const upperArmGeo = sculptedLimbGeometry({ topR: armR, midR: armR * 0.88, botR: armR * 0.76, length: upperArmLen, crease: 0.006 });
  const forearmGeo = sculptedLimbGeometry({ topR: armR * 0.76, midR: armR * 0.68, botR: armR * 0.56, length: forearmLen, crease: 0.003 });

  const buildArm = (side) => {
    const upperArm = new GL.Group();
    upperArm.position.set(side * shoulderX, 0, 0);
    const uMesh = new GL.Mesh(upperArmGeo, sleeveMat || torsoMat);
    uMesh.castShadow = true;
    upperArm.add(uMesh);

    const forearm = new GL.Group();
    forearm.position.set(0, -upperArmLen, 0);
    const fMesh = new GL.Mesh(forearmGeo, forearmMat || skinMat);
    fMesh.castShadow = true;
    forearm.add(fMesh);

    const hand = buildSculptedHand(forearm, skinMat, side, (armR / 0.058));
    hand.position.set(0, -forearmLen, 0);

    upperArm.add(forearm);
    chest.add(upperArm);
    return { upperArm, forearm, hand };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // Neck -> Head -> Hinged Jaw & Uncanny Recessed Eyes
  const neck = new GL.Group();
  neck.position.set(0, tHeight - shoulderY + 0.02, 0.01);
  const neckGeo = sculptedLimbGeometry({ topR: 0.054, midR: 0.058, botR: 0.064, length: neckLen, crease: 0 });
  const neckMesh = new GL.Mesh(neckGeo, skinMat);
  neckMesh.position.y = neckLen;
  neck.add(neckMesh);
  chest.add(neck);

  const head = new GL.Group();
  head.position.set(0, neckLen + (headCfg.height || 0.25) * 0.42, 0.01);
  neck.add(head);

  const headGeo = sculptedHeadGeometry(headCfg);
  const headMesh = new GL.Mesh(headGeo, faceMat);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  head.add(headMesh);

  // Sculpted Low-Poly Ears
  for (const side of [-1, 1]) {
    piece(head, orb, skinMat, side * (headCfg.width || 0.22) * 0.51, 0.01, -0.01, 0.018, 0.036, 0.022, { shadow: false });
  }

  // Dark Inner Mouth Hollow + Upper Teeth Row
  const socketDark = material(0x050408, 0.96, 0);
  const teethMat = material(0xcfc6b4, 0.42, 0.04, true);
  const mw = (jawCfg.width || 0.16) * 0.58;
  piece(head, solid, socketDark, 0, -(headCfg.height || 0.25) * 0.30, (headCfg.depth || 0.24) * 0.38, mw, 0.036, 0.04, { shadow: false });
  for (let i = -2; i <= 2; i++) {
    piece(head, solid, teethMat, i * (mw * 0.18), -(headCfg.height || 0.25) * 0.26, (headCfg.depth || 0.24) * 0.41, 0.014, 0.014, 0.010, { shadow: false });
  }

  // Hinged Lower Jaw
  const jaw = new GL.Group();
  jaw.position.set(0, -(headCfg.height || 0.25) * 0.34, 0.0);
  const jawGeo = sculptedJawGeometry(jawCfg);
  const jawMesh = new GL.Mesh(jawGeo, faceMat);
  jawMesh.position.set(0, -(jawCfg.height || 0.08) * 0.32, 0.015);
  jawMesh.castShadow = true;
  jaw.add(jawMesh);
  for (let i = -2; i <= 2; i++) {
    piece(jaw, solid, teethMat, i * (mw * 0.17), 0.005, (jawCfg.depth || 0.17) * 0.44, 0.013, 0.012, 0.010, { shadow: false });
  }
  head.add(jaw);

  // Recessed Uncanny Eyes + IR Pinpoints
  const eyes = new GL.Group();
  head.add(eyes);
  const eyeX = (headCfg.width || 0.22) * 0.22;
  const eyeY = (headCfg.height || 0.25) * 0.11;
  const eyeZ = (headCfg.depth || 0.24) * 0.43;
  const eyeRigs = [-1, 1].map((side) => uncannyEyeRig(eyes, side * eyeX, eyeY, eyeZ, eyeCfg));

  return {
    root,
    core,
    pelvis,
    torso,
    chest,
    neck,
    head,
    jaw,
    eyes,
    eyeRigs,
    leftUpperArm: leftArm.upperArm,
    leftForearm: leftArm.forearm,
    leftHand: leftArm.hand,
    rightUpperArm: rightArm.upperArm,
    rightForearm: rightArm.forearm,
    rightHand: rightArm.hand,
    leftThigh: leftLeg.thigh,
    leftCalf: leftLeg.calf,
    leftFoot: leftLeg.foot,
    rightThigh: rightLeg.thigh,
    rightCalf: rightLeg.calf,
    rightFoot: rightLeg.foot,
    arms: [leftArm.upperArm, rightArm.upperArm],
    forearms: [leftArm.forearm, rightArm.forearm],
    hands: [leftArm.hand, rightArm.hand],
    legs: [leftLeg.thigh, rightLeg.thigh],
    calves: [leftLeg.calf, rightLeg.calf],
    feet: [leftLeg.foot, rightLeg.foot],
  };
}

/**
 * 1. CHEF TORGE — Stained dark-red double-breasted chef jacket, curly dark hair under
 *    grease-stained forest-green cap + crooked tarnished brass crown, heavy cast-iron pan held low.
 */
export function chefTorgeModel() {
  const tex = getCharTextures();
  const faceMat = new GL.MeshStandardMaterial({ map: tex.faceTorge, roughness: 0.72, metalness: 0.04, flatShading: true });
  const skinMat = vinylMaterial(0xb58b6f, 0.74, 0.03);
  const jacketMat = new GL.MeshStandardMaterial({ map: tex.torgeJacket, roughness: 0.76, metalness: 0.05, flatShading: true });
  const pantsMat = vinylMaterial(0x161922, 0.82, 0.04);
  const shoeMat = vinylMaterial(0x141418, 0.65, 0.08);
  const darkHair = vinylMaterial(0x171215, 0.88, 0.02);
  const forestCap = vinylMaterial(0x133828, 0.76, 0.04);
  const castIron = endoMaterial(0x171a22);

  const rig = buildHumanRig({
    totalScale: 1.02,
    pelvisY: 0.90,
    hipSpacing: 0.12,
    torsoCfg: { waistW: 0.36, chestW: 0.44, shoulderW: 0.48, height: 0.56, depth: 0.26, hunch: 0.02 },
    shoulderX: 0.25,
    shoulderY: 0.48,
    headCfg: { width: 0.22, height: 0.26, depth: 0.24, cheekWidth: 1.09, browRidge: 0.025, noseLen: 0.038 },
    jawCfg: { width: 0.175, height: 0.085, depth: 0.18 },
    eyeCfg: { radius: 0.023, irisHex: 0x1e262c, lidDrop: 0.28 },
    faceMat,
    skinMat,
    torsoMat: jacketMat,
    sleeveMat: jacketMat,
    forearmMat: skinMat,
    pantsMat,
    shoeMat,
    soleMat: material(0x28282c, 0.85, 0.05),
  });

  // Dark curly hair clusters + grease-stained forest-green cap + crooked tarnished brass crown
  for (let i = -3; i <= 3; i++) {
    piece(rig.head, orb, darkHair, i * 0.032, 0.088, 0.105 - Math.abs(i) * 0.01, 0.032, 0.028, 0.032, { shadow: false });
  }
  piece(rig.head, roundedBox(0.24, 0.11, 0.25, 0.04, 1), darkHair, 0, 0.085, -0.02, 1, 1, 1, { shadow: false });
  piece(rig.head, roundedBox(0.245, 0.095, 0.255, 0.04, 1), forestCap, 0, 0.135, -0.005, 1, 1, 1, { shadow: true });
  const brim = piece(rig.head, roundedBox(0.21, 0.018, 0.13, 0.008, 1), forestCap, 0, 0.105, 0.155, 1, 1, 1, { shadow: true });
  brim.rotation.x = 0.14;

  const crown = crownMesh(0.86);
  crown.position.set(0.015, 0.195, 0.0);
  crown.rotation.z = -0.11;
  rig.head.add(crown);

  // Heavy seasoned cast-iron frying pan held low at his right side
  const pan = new GL.Group();
  pan.position.set(0, -0.06, 0.03);
  piece(pan, round, castIron, 0, 0, 0.12, 0.016, 0.24, 0.016, { shadow: false }).rotation.x = Math.PI / 2;
  piece(pan, round, castIron, 0, -0.01, 0.34, 0.145, 0.038, 0.145, { shadow: true });
  rig.rightHand.add(pan);
  rig.rightForearm.rotation.x = -0.28;
  rig.jaw.rotation.x = 0.04;

  return { ...rig, crown, pan };
}

/**
 * 2. LOST ANTON — Tall, lanky, unnaturally hunched forward neck-tilt silhouette;
 *    faded black tee with cracked lime graphic; sleepless hollow eyes lit from underneath
 *    by his smartphone's cold blue-green PointLight!
 */
export function lostAntonModel() {
  const tex = getCharTextures();
  const faceMat = new GL.MeshStandardMaterial({ map: tex.faceAnton, roughness: 0.70, metalness: 0.03, flatShading: true });
  const skinMat = vinylMaterial(0xb49682, 0.74, 0.02);
  const shirtMat = new GL.MeshStandardMaterial({ map: tex.antonOutfit, roughness: 0.82, metalness: 0.02, flatShading: true });
  const jeansMat = vinylMaterial(0x1c202a, 0.84, 0.04);
  const sneakerMat = vinylMaterial(0x22262e, 0.72, 0.05);
  const wetSoleMat = vinylMaterial(0xb8c0b4, 0.38, 0.08);
  const hairMat = vinylMaterial(0x2e2118, 0.86, 0.02);
  const phoneBody = endoMaterial(0x10141c);
  const phoneScreenMat = new GL.MeshBasicMaterial({ map: tex.antonPhone });

  const rig = buildHumanRig({
    totalScale: 1.07,
    pelvisY: 0.95,
    hipSpacing: 0.105,
    thighLen: 0.45,
    calfLen: 0.44,
    thighR: 0.064,
    calfR: 0.050,
    torsoCfg: { waistW: 0.29, chestW: 0.36, shoulderW: 0.40, height: 0.56, depth: 0.21, hunch: 0.065 },
    shoulderX: 0.21,
    shoulderY: 0.49,
    upperArmLen: 0.31,
    forearmLen: 0.29,
    armR: 0.048,
    neckLen: 0.105,
    headCfg: { width: 0.20, height: 0.25, depth: 0.22, cheekWidth: 1.06, browRidge: 0.022, noseLen: 0.034, socketDepth: 0.032 },
    jawCfg: { width: 0.15, height: 0.08, depth: 0.16 },
    eyeCfg: { radius: 0.023, irisHex: 0x161c22, bagHex: 0x1a1224, lidDrop: 0.18 },
    faceMat,
    skinMat,
    torsoMat: shirtMat,
    sleeveMat: shirtMat,
    forearmMat: skinMat,
    pantsMat: jeansMat,
    shoeMat: sneakerMat,
    soleMat: wetSoleMat,
  });

  // Unnatural forward neck hunch + head tilt
  rig.torso.rotation.x = 0.08;
  rig.neck.rotation.x = 0.22;
  rig.head.rotation.z = 0.14;

  // Messy damp hair locks over forehead
  piece(rig.head, roundedBox(0.215, 0.10, 0.23, 0.04, 1), hairMat, 0, 0.105, -0.01, 1, 1, 1, { shadow: false });
  piece(rig.head, solid, hairMat, -0.04, 0.095, 0.11, 0.09, 0.05, 0.03, { shadow: false }).rotation.z = 0.22;

  // Smartphone in right hand + cold cyan-green PointLight casting eerie uplight onto chin & brow!
  const phone = new GL.Group();
  phone.position.set(-0.02, -0.055, 0.045);
  phone.rotation.x = -0.55;
  phone.rotation.y = -0.25;
  piece(phone, roundedBox(0.075, 0.145, 0.014, 0.008, 1), phoneBody, 0, 0, 0, 1, 1, 1, { shadow: false });
  const phoneScreen = piece(phone, solid, phoneScreenMat, 0, 0, 0.009, 0.066, 0.132, 0.004, { shadow: false });

  const phoneLight = new GL.PointLight(0x4de8d2, 1.35, 1.65, 1.8);
  phoneLight.position.set(0, 0.04, 0.08);
  phone.add(phoneLight);
  rig.rightHand.add(phone);

  // Default arm raise holding phone below chin
  rig.rightUpperArm.rotation.x = -0.62;
  rig.rightUpperArm.rotation.z = -0.18;
  rig.rightForearm.rotation.x = -1.15;

  return { ...rig, phone, phoneScreen, phoneLight };
}

/**
 * 3. SCHNORRER TOM — Scavenging forward crouch, backwards khaki cap, wrinkled faded pink
 *    Surf-Miami tee (NO bib!), bulging worn backpack stuffed with crushed Pfand & Spezi cans.
 */
export function schnorrerTomModel() {
  const tex = getCharTextures();
  const faceMat = new GL.MeshStandardMaterial({ map: tex.faceTom, roughness: 0.72, metalness: 0.03, flatShading: true });
  const skinMat = vinylMaterial(0xba9276, 0.74, 0.02);
  const surfMat = new GL.MeshStandardMaterial({ map: tex.tomShirt, roughness: 0.80, metalness: 0.02, flatShading: true });
  const pantsMat = vinylMaterial(0x1c212c, 0.82, 0.04);
  const shoeMat = vinylMaterial(0x1f5c58, 0.72, 0.05);
  const soleMat = vinylMaterial(0xc8c2b4, 0.6, 0.04);
  const khakiCap = vinylMaterial(0xa49068, 0.78, 0.03);
  const bagMat = vinylMaterial(0x523620, 0.84, 0.06);
  const strapMat = vinylMaterial(0x281c14, 0.82, 0.08);
  const bottleMat = material(0x1b6e3c, 0.22, 0.35);

  const rig = buildHumanRig({
    totalScale: 0.99,
    pelvisY: 0.86,
    hipSpacing: 0.115,
    thighLen: 0.40,
    calfLen: 0.40,
    torsoCfg: { waistW: 0.32, chestW: 0.39, shoulderW: 0.43, height: 0.52, depth: 0.23, hunch: 0.05 },
    shoulderX: 0.22,
    shoulderY: 0.45,
    headCfg: { width: 0.21, height: 0.245, depth: 0.23, cheekWidth: 1.07, browRidge: 0.020, noseLen: 0.036 },
    jawCfg: { width: 0.16, height: 0.08, depth: 0.165 },
    eyeCfg: { radius: 0.025, irisHex: 0x1a2822, lidDrop: 0.06 }, // wide unblinking stare!
    faceMat,
    skinMat,
    torsoMat: surfMat,
    sleeveMat: surfMat,
    forearmMat: skinMat,
    pantsMat,
    shoeMat,
    soleMat,
  });

  // Scavenging forward crouch posture
  rig.torso.rotation.x = 0.16;
  rig.neck.rotation.x = -0.08;
  rig.leftThigh.rotation.x = -0.14;
  rig.leftCalf.rotation.x = 0.24;
  rig.rightThigh.rotation.x = -0.10;
  rig.rightCalf.rotation.x = 0.18;

  // Backwards khaki cap + hair tuft through front snap strap
  piece(rig.head, roundedBox(0.225, 0.095, 0.24, 0.04, 1), khakiCap, 0, 0.115, -0.005, 1, 1, 1, { shadow: true });
  piece(rig.head, roundedBox(0.17, 0.016, 0.12, 0.006, 1), khakiCap, 0, 0.088, -0.155, 1, 1, 1, { shadow: false }).rotation.x = -0.12;
  piece(rig.head, orb, vinylMaterial(0x281b14, 0.88), 0, 0.092, 0.122, 0.032, 0.024, 0.022, { shadow: false });

  // Bulging worn canvas backpack stuffed with crushed Pfand & Spezi cans sticking out!
  const pack = new GL.Group();
  pack.position.set(0, 0.28, -0.17);
  piece(pack, roundedBox(0.34, 0.42, 0.22, 0.06, 1), bagMat, 0, 0, 0, 1, 1, 1, { shadow: true });
  piece(pack, solid, strapMat, -0.10, 0.04, 0.12, 0.032, 0.38, 0.04, { shadow: false });
  piece(pack, solid, strapMat, 0.10, 0.04, 0.12, 0.032, 0.38, 0.04, { shadow: false });

  const can1 = speziCanMesh();
  can1.position.set(0.08, 0.18, -0.01);
  can1.rotation.z = -0.36;
  can1.scale.set(0.82, 0.68, 0.62); // dented/crushed can!
  pack.add(can1);

  const can2 = speziCanMesh();
  can2.position.set(-0.02, 0.19, -0.04);
  can2.rotation.x = 0.28;
  can2.scale.set(0.75, 0.72, 0.60);
  pack.add(can2);

  const bottle = new GL.Group();
  bottle.position.set(-0.09, 0.20, 0.02);
  bottle.rotation.z = 0.28;
  piece(bottle, round, bottleMat, 0, 0, 0, 0.032, 0.13, 0.032, { shadow: false });
  piece(bottle, round, bottleMat, 0, 0.09, 0, 0.014, 0.08, 0.014, { shadow: false });
  pack.add(bottle);

  rig.torso.add(pack);
  return { ...rig, pack };
}

/**
 * 4. BOSS HAUKE — Massive, broad-shouldered heavy silhouette in stretched white tee
 *    with forest-green collar, grey joggers, heavy brow ridge, clenched teeth, dead-eyed scowl.
 */
export function bossHaukeModel() {
  const tex = getCharTextures();
  const faceMat = new GL.MeshStandardMaterial({ map: tex.faceHauke, roughness: 0.72, metalness: 0.04, flatShading: true });
  const skinMat = vinylMaterial(0xb0866a, 0.72, 0.03);
  const shirtMat = new GL.MeshStandardMaterial({ map: tex.haukeShirt, roughness: 0.80, metalness: 0.02, flatShading: true });
  const joggersMat = vinylMaterial(0x4c525e, 0.84, 0.03);
  const bootMat = vinylMaterial(0x181b22, 0.68, 0.12);
  const hairMat = vinylMaterial(0x2b1c14, 0.86, 0.02);

  const rig = buildHumanRig({
    totalScale: 1.09,
    pelvisY: 0.92,
    hipSpacing: 0.145,
    thighLen: 0.43,
    calfLen: 0.42,
    thighR: 0.098,
    calfR: 0.076,
    torsoCfg: { waistW: 0.46, chestW: 0.58, shoulderW: 0.64, height: 0.60, depth: 0.33, hunch: 0.03 },
    shoulderX: 0.34,
    shoulderY: 0.52,
    upperArmLen: 0.31,
    forearmLen: 0.29,
    armR: 0.078,
    neckLen: 0.08,
    headCfg: { width: 0.245, height: 0.265, depth: 0.255, cheekWidth: 1.12, browRidge: 0.036, noseLen: 0.040, socketDepth: 0.030 },
    jawCfg: { width: 0.205, height: 0.095, depth: 0.195 },
    eyeCfg: { radius: 0.023, irisHex: 0x241a12, lidDrop: 0.38 },
    faceMat,
    skinMat,
    torsoMat: shirtMat,
    sleeveMat: shirtMat,
    forearmMat: skinMat,
    pantsMat: joggersMat,
    shoeMat: bootMat,
    soleMat: brassMaterial(0x3a3228),
  });

  // Short cropped dark hair + heavy angry brow ridge
  piece(rig.head, roundedBox(0.255, 0.09, 0.26, 0.035, 1), hairMat, 0, 0.115, -0.01, 1, 1, 1, { shadow: false });
  for (const side of [-1, 1]) {
    const brow = piece(rig.head, solid, hairMat, side * 0.056, 0.058, 0.132, 0.075, 0.020, 0.028, { shadow: false });
    brow.rotation.z = side * -0.26;
  }

  return rig;
}

/**
 * 5. THE FILTHY DUCK SUIT (replaces the rubber bath toy) — Life-sized, grimy, matted yellow
 *    Imbiss mascot costume with stitched seams, dark grease stains, crooked sagging mascot head,
 *    hollow black mesh eye/beak openings, and faint human eyes glinting deep inside the suit!
 */
export function filthyDuckSuitModel() {
  const tex = getCharTextures();
  const suitMat = new GL.MeshStandardMaterial({ map: tex.duckSuit, roughness: 0.90, metalness: 0.02, flatShading: true });
  const headSuitMat = new GL.MeshStandardMaterial({ map: tex.faceDuck, roughness: 0.88, metalness: 0.02, flatShading: true });
  const dirtyBeakMat = vinylMaterial(0x9c4216, 0.72, 0.04);
  const voidMeshMat = material(0x030305, 0.98, 0.0);
  const bootMat = vinylMaterial(0x161412, 0.82, 0.06);

  const rig = buildHumanRig({
    totalScale: 1.04,
    pelvisY: 0.88,
    hipSpacing: 0.135,
    thighLen: 0.40,
    calfLen: 0.39,
    thighR: 0.092,
    calfR: 0.082,
    torsoCfg: { waistW: 0.48, chestW: 0.52, shoulderW: 0.50, height: 0.58, depth: 0.36, hunch: 0.07 },
    shoulderX: 0.27,
    shoulderY: 0.49,
    upperArmLen: 0.30,
    forearmLen: 0.28,
    armR: 0.072,
    neckLen: 0.06,
    headCfg: { width: 0.33, height: 0.32, depth: 0.33, cheekWidth: 1.14, browRidge: 0.01, noseLen: 0.0, socketDepth: 0.045 },
    jawCfg: { width: 0.22, height: 0.055, depth: 0.24 },
    eyeCfg: { radius: 0.016, irisHex: 0x16181c, scleraHex: 0xb8b2aa, lidDrop: 0.35 },
    faceMat: headSuitMat,
    skinMat: suitMat,
    torsoMat: suitMat,
    sleeveMat: suitMat,
    forearmMat: suitMat,
    pantsMat: suitMat,
    shoeMat: bootMat,
  });

  // Oversized sagging mascot duck bill (upper bill + slack open lower bill)
  piece(rig.head, roundedBox(0.21, 0.062, 0.19, 0.025, 1), dirtyBeakMat, 0, -0.035, 0.21, 1, 1, 1, { shadow: true });
  piece(rig.head, solid, voidMeshMat, 0, -0.068, 0.15, 0.17, 0.05, 0.12, { shadow: false });
  piece(rig.jaw, roundedBox(0.19, 0.042, 0.17, 0.02, 1), dirtyBeakMat, 0, -0.015, 0.16, 1, 1, 1, { shadow: false });

  // Hollow black mesh mascot eye cutouts on the outer suit head
  for (const side of [-1, 1]) {
    piece(rig.head, orb, voidMeshMat, side * 0.078, 0.042, 0.145, 0.042, 0.048, 0.022, { shadow: false });
  }

  // Push the real human eyes + IR pinpoints deep INSIDE the dark mascot mesh so you see someone inside!
  rig.eyes.position.set(0, 0.005, -0.032);
  rig.jaw.rotation.x = 0.22;

  // Heavy human-worn slumped posture
  rig.torso.rotation.x = 0.14;
  rig.head.rotation.z = -0.26;
  rig.head.rotation.x = 0.12;
  rig.leftUpperArm.rotation.z = 0.08;
  rig.rightUpperArm.rotation.z = -0.10;
  rig.leftForearm.rotation.x = -0.18;
  rig.rightForearm.rotation.x = -0.12;

  return rig;
}

export const goldenDuckModel = filthyDuckSuitModel;

/**
 * Spare worn mascot / mannequin head for CAM 5 backroom shelf.
 */
export function spareMascotHeadMesh(variant = 0) {
  const tex = getCharTextures();
  const g = new GL.Group();
  const mat = variant === 1
    ? new GL.MeshStandardMaterial({ map: tex.faceDuck, roughness: 0.88, flatShading: true })
    : vinylMaterial(variant === 0 ? 0x8a7c6e : 0x303642, 0.78, 0.15);
  const voidMat = material(0x030306, 0.96, 0);
  const pinMat = new GL.MeshBasicMaterial({ color: 0xeef6ff });

  const hGeo = sculptedHeadGeometry({ width: 0.24, height: 0.25, depth: 0.24 });
  const m = new GL.Mesh(hGeo, mat);
  m.position.y = 0.13;
  m.castShadow = true;
  g.add(m);

  const pins = new GL.Group();
  pins.visible = false;
  for (const side of [-1, 1]) {
    piece(g, orb, voidMat, side * 0.055, 0.15, 0.105, 0.028, 0.028, 0.018, { shadow: false });
    piece(pins, octa, pinMat, side * 0.055, 0.15, 0.122, 0.009, 0.009, 0.006, { shadow: false });
  }
  g.add(pins);
  return { root: g, pins };
}

/**
 * Resets a character rig to clean neutral standing joints, then applies creepy room/archive poses!
 */
export function applyStalkerPose(model, pose = 'neutral', t = 0) {
  if (!model?.pelvis) return;
  model.pelvis.position.set(0, model.pelvis.userData.baseY ?? model.pelvis.position.y, 0);
  model.pelvis.userData.baseY = model.pelvis.position.y;
  model.pelvis.rotation.set(0, 0, 0);
  model.torso.rotation.set(0, 0, 0);
  model.chest.rotation.set(0, 0, 0);
  model.neck.rotation.set(0, 0, 0);
  model.head.rotation.set(0, 0, 0);
  model.jaw.rotation.set(0.04, 0, 0);
  model.leftUpperArm.rotation.set(0, 0, 0.05);
  model.rightUpperArm.rotation.set(0, 0, -0.05);
  model.leftForearm.rotation.set(-0.12, 0, 0);
  model.rightForearm.rotation.set(-0.12, 0, 0);
  model.leftThigh.rotation.set(0, 0, 0);
  model.rightThigh.rotation.set(0, 0, 0);
  model.leftCalf.rotation.set(0, 0, 0);
  model.rightCalf.rotation.set(0, 0, 0);

  const breath = Math.sin(t * 1.6) * 0.012;

  if (pose === 'doorway_peek') {
    // Leaning halfway out from behind a doorway frame with left hand gripping the edge!
    model.pelvis.rotation.z = -0.22;
    model.torso.rotation.z = -0.18;
    model.head.rotation.z = -0.16;
    model.head.rotation.y = 0.24;
    model.leftUpperArm.rotation.x = -0.85;
    model.leftUpperArm.rotation.z = 0.42;
    model.leftForearm.rotation.x = -0.65;
  } else if (pose === 'corner_stare') {
    // Standing nose-to-corner, snapping neck & head unnaturally back toward the CCTV lens!
    model.torso.rotation.x = 0.08 + breath;
    model.neck.rotation.y = 0.55;
    model.head.rotation.y = 0.85;
    model.head.rotation.z = 0.18;
    model.jaw.rotation.x = 0.16;
  } else if (pose === 'window_press') {
    // Pressed close against rain-streaked glass, left palm raised against pane
    model.torso.rotation.x = 0.16;
    model.head.rotation.x = -0.10;
    model.head.rotation.z = Math.sin(t * 2.1) * 0.05;
    model.leftUpperArm.rotation.x = -1.25;
    model.leftForearm.rotation.x = -0.85;
    model.jaw.rotation.x = 0.14;
  } else if (pose === 'crate_crouch') {
    // Low scavenging crouch beside Pfand crates
    model.pelvis.position.y -= 0.28;
    model.torso.rotation.x = 0.46;
    model.head.rotation.x = -0.38;
    model.leftThigh.rotation.x = -0.78;
    model.leftCalf.rotation.x = 1.42;
    model.rightThigh.rotation.x = -0.68;
    model.rightCalf.rotation.x = 1.28;
    model.leftUpperArm.rotation.x = -0.55;
    model.rightUpperArm.rotation.x = -0.65;
  } else if (pose === 'slumped_suit') {
    model.pelvis.position.y -= 0.06;
    model.torso.rotation.x = 0.20 + breath * 0.4;
    model.head.rotation.z = -0.30;
    model.head.rotation.x = 0.18;
    model.jaw.rotation.x = 0.26;
    model.leftUpperArm.rotation.z = 0.12;
    model.rightUpperArm.rotation.z = -0.14;
    model.leftThigh.rotation.x = -0.12;
    model.leftCalf.rotation.x = 0.22;
  } else if (pose === 'phone_walk') {
    const stride = Math.sin(t * 3.8);
    model.torso.rotation.x = 0.16;
    model.neck.rotation.x = 0.24;
    model.leftThigh.rotation.x = stride * 0.36;
    model.rightThigh.rotation.x = -stride * 0.36;
    model.leftCalf.rotation.x = Math.max(0, -stride) * 0.45;
    model.rightCalf.rotation.x = Math.max(0, stride) * 0.45;
    model.rightUpperArm.rotation.x = -0.78;
    model.rightForearm.rotation.x = -0.62; // sweeping phone downward!
  } else if (pose === 'jumpscare_lunge') {
    model.torso.rotation.x = 0.28;
    model.head.rotation.z = Math.sin(t * 28) * 0.18;
    model.jaw.rotation.x = 0.34 + Math.abs(Math.sin(t * 36)) * 0.32;
    model.leftUpperArm.rotation.x = -1.35;
    model.rightUpperArm.rotation.x = -1.35;
    model.leftUpperArm.rotation.z = -0.32;
    model.rightUpperArm.rotation.z = 0.32;
    model.leftForearm.rotation.x = -0.45;
    model.rightForearm.rotation.x = -0.45;
  } else {
    // Neutral subtle breathing
    model.torso.rotation.x = 0.04 + breath;
    if (model.phone) {
      model.neck.rotation.x = 0.20;
      model.head.rotation.z = 0.12;
      model.rightUpperArm.rotation.x = -0.62;
      model.rightForearm.rotation.x = -1.12;
    }
  }
}
