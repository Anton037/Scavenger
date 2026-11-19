import * as THREE from 'three';
import {
  band,
  brassMaterial,
  emissive,
  material,
  octa,
  orb,
  PALETTE,
  piece,
  round,
  solid,
  tapered,
  TAU,
} from './primitives.js';

export function speziCanMesh() {
  const g = new THREE.Group();
  const brown = material(0x4a2016, 0.3, 0.28);
  const orange = emissive(0xff8c24);
  const magenta = emissive(0xe83b8a);
  const yellow = emissive(0xffcf48);
  const alu = material(0xb8c2d6, 0.22, 0.85);
  piece(g, round, brown, 0, 0.18, 0, 0.11, 0.34, 0.11);
  piece(g, round, yellow, 0, 0.26, 0, 0.115, 0.045, 0.115);
  piece(g, round, orange, 0, 0.20, 0, 0.116, 0.075, 0.116);
  piece(g, round, magenta, 0, 0.125, 0, 0.116, 0.075, 0.116);
  piece(g, round, alu, 0, 0.352, 0, 0.104, 0.024, 0.104, { shadow: false });
  piece(g, solid, alu, 0.02, 0.366, 0, 0.035, 0.008, 0.02, { shadow: false });
  return g;
}

export function crownMesh(scale = 1) {
  const crown = new THREE.Group();
  const gold = brassMaterial(PALETTE.brass);
  const ruby = emissive(PALETTE.vermilion);
  const rim = emissive(0xffe082);
  const velvet = material(0x9e1c36, 0.52, 0.1);
  piece(crown, round, gold, 0, 0, 0, 0.21 * scale, 0.075 * scale, 0.21 * scale, { shadow: false });
  piece(crown, orb, velvet, 0, 0.035 * scale, 0, 0.16 * scale, 0.085 * scale, 0.16 * scale, { shadow: false });
  for (let i = 0; i < 5; i++) {
    const a = (i * TAU) / 5;
    piece(crown, octa, rim, Math.cos(a) * 0.165 * scale, 0.092 * scale, Math.sin(a) * 0.165 * scale, 0.055 * scale, 0.105 * scale, 0.055 * scale, { shadow: false });
  }
  piece(crown, octa, ruby, 0, 0.115 * scale, 0.165 * scale, 0.05 * scale, 0.065 * scale, 0.05 * scale, { shadow: false });
  return crown;
}

export function chefTorgeModel() {
  const root = new THREE.Group();
  const skin = material(0xf0d6be, 0.48, 0.04);
  const darkCurlyHair = material(0x1c151d, 0.78, 0.03);
  const forestCap = material(0x134433, 0.55, 0.08);
  const whiteTee = material(0xeef2fa, 0.55, 0.04);
  const chefJacket = material(0xbc2432, 0.42, 0.12);
  const jacketLapel = material(0x8c1824, 0.48, 0.1);
  const darkPants = material(0x161a28, 0.62, 0.1);
  const sneakerSole = material(0xdce2f0, 0.5, 0.06);
  const brass = brassMaterial(PALETTE.brass);
  const copper = brassMaterial(PALETTE.copper);
  const socketMat = material(0x05060a, 0.92, 0);
  const teethMat = material(0xeae6d8, 0.35, 0.1);
  const eyePin = emissive(0x88f4ff);
  const glow = emissive(0xffe082);

  const core = new THREE.Group();
  core.scale.set(1.12, 1.15, 1.12);
  root.add(core);

  for (const side of [-1, 1]) {
    piece(core, tapered, darkPants, side * 0.14, 0.36, 0, 0.105, 0.66, 0.105, { shadow: true });
    piece(core, orb, darkPants, side * 0.14, 0.36, 0.02, 0.095, 0.09, 0.095, { shadow: false });
    piece(core, solid, chefJacket, side * 0.14, 0.065, 0.04, 0.145, 0.085, 0.23, { shadow: false });
    piece(core, solid, sneakerSole, side * 0.14, 0.02, 0.05, 0.155, 0.035, 0.25, { shadow: false });
  }

  piece(core, tapered, whiteTee, 0, 0.96, 0, 0.34, 0.62, 0.25, { shadow: true });
  piece(core, solid, chefJacket, -0.185, 0.97, 0.02, 0.165, 0.62, 0.28, { shadow: true });
  piece(core, solid, chefJacket, 0.185, 0.97, 0.02, 0.165, 0.62, 0.28, { shadow: true });
  piece(core, solid, chefJacket, 0, 0.97, -0.09, 0.39, 0.62, 0.13, { shadow: false });
  piece(core, solid, jacketLapel, -0.11, 1.06, 0.155, 0.045, 0.42, 0.03, { shadow: false });
  piece(core, solid, jacketLapel, 0.11, 1.06, 0.155, 0.045, 0.42, 0.03, { shadow: false });
  // Brass chef buttons
  for (const by of [0.84, 0.98, 1.12]) {
    piece(core, orb, brass, -0.15, by, 0.168, 0.018, 0.018, 0.012, { shadow: false });
    piece(core, orb, brass, 0.15, by, 0.168, 0.018, 0.018, 0.012, { shadow: false });
  }
  piece(core, round, skin, 0, 1.31, 0.01, 0.095, 0.14, 0.095, { shadow: false });
  const chain = band(core, brass, 0, 1.2, 0.04, 0.195);
  chain.rotation.x = -Math.PI / 2 + 0.22;
  piece(core, octa, glow, 0, 1.12, 0.225, 0.052, 0.058, 0.035, { shadow: false });

  const head = new THREE.Group();
  head.position.set(0, 1.5, 0.02);
  core.add(head);
  piece(head, orb, skin, 0, 0, 0, 0.23, 0.255, 0.23, { shadow: true });
  piece(head, orb, skin, -0.23, 0.0, -0.01, 0.045, 0.068, 0.04, { shadow: false });
  piece(head, orb, skin, 0.23, 0.0, -0.01, 0.045, 0.068, 0.04, { shadow: false });
  piece(head, orb, skin, 0, -0.02, 0.225, 0.038, 0.035, 0.04, { shadow: false });
  for (let i = -2; i <= 2; i++) {
    piece(head, orb, darkCurlyHair, i * 0.075, 0.115, 0.17 - Math.abs(i) * 0.02, 0.072, 0.068, 0.072, { shadow: false });
  }
  piece(head, orb, darkCurlyHair, 0, 0.08, -0.05, 0.245, 0.19, 0.235, { shadow: false });
  piece(head, orb, forestCap, 0, 0.185, -0.01, 0.245, 0.115, 0.245, { shadow: false });
  const brim = piece(head, solid, forestCap, 0, 0.15, 0.22, 0.245, 0.032, 0.17, { shadow: false });
  brim.rotation.x = 0.08;
  const crown = crownMesh(0.84);
  crown.position.set(0, 0.275, 0);
  head.add(crown);

  const eyes = new THREE.Group();
  head.add(eyes);
  for (const side of [-1, 1]) {
    piece(head, orb, socketMat, side * 0.086, 0.02, 0.192, 0.056, 0.05, 0.038, { shadow: false });
    piece(eyes, orb, eyePin, side * 0.086, 0.02, 0.224, 0.023, 0.023, 0.018);
    const brow = piece(head, solid, darkCurlyHair, side * 0.086, 0.078, 0.205, 0.092, 0.022, 0.024, { shadow: false });
    brow.rotation.z = side * -0.14;
  }
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.1, 0.185);
  piece(jaw, solid, socketMat, 0, 0, 0, 0.125, 0.055, 0.045, { shadow: false });
  for (let i = -2; i <= 2; i++) {
    piece(jaw, solid, teethMat, i * 0.022, 0.016, 0.02, 0.015, 0.015, 0.012, { shadow: false });
    piece(jaw, solid, teethMat, i * 0.022, -0.016, 0.02, 0.015, 0.015, 0.012, { shadow: false });
  }
  head.add(jaw);

  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.35, 1.18, 0);
    piece(arm, orb, chefJacket, 0, 0, 0, 0.135, 0.14, 0.135, { shadow: false });
    piece(arm, tapered, chefJacket, side * 0.02, -0.22, 0.04, 0.088, 0.35, 0.088, { shadow: true });
    piece(arm, orb, skin, side * 0.04, -0.44, 0.1, 0.075, 0.085, 0.075, { shadow: false });
    core.add(arm);
    return arm;
  });

  const pan = new THREE.Group();
  pan.position.set(0.05, -0.42, 0.18);
  arms[1].add(pan);
  piece(pan, round, copper, 0, 0.05, 0.13, 0.036, 0.44, 0.036, { shadow: false }).rotation.x = Math.PI / 2.2;
  piece(pan, round, brass, 0, 0.11, 0.38, 0.22, 0.065, 0.22, { shadow: true });
  piece(pan, round, socketMat, 0, 0.125, 0.38, 0.175, 0.07, 0.175, { shadow: false });

  return { root, core, head, eyes, jaw, arms, crown, pan };
}

export function lostAntonModel() {
  const root = new THREE.Group();
  const skin = material(0xebd2be, 0.46, 0.04);
  const hairMat = material(0x8c6b47, 0.65, 0.05);
  const blackTee = material(0x13151e, 0.62, 0.08);
  const darkPants = material(0x171b27, 0.58, 0.1);
  const sneakerMat = material(0xe4e8f2, 0.5, 0.06);
  const limePrint = emissive(PALETTE.neonLime);
  const socketMat = material(0x06070b, 0.92, 0);
  const redEye = emissive(0xff2948);
  const phoneBody = material(0x141722, 0.32, 0.55);
  const phoneScreenMat = new THREE.MeshBasicMaterial({ color: 0x264a3e });

  const core = new THREE.Group();
  core.scale.set(1.02, 1.18, 1.02);
  root.add(core);

  for (const side of [-1, 1]) {
    piece(core, tapered, darkPants, side * 0.13, 0.45, 0, 0.084, 0.86, 0.084, { shadow: true });
    piece(core, solid, blackTee, side * 0.13, 0.055, 0.05, 0.12, 0.065, 0.22, { shadow: false });
    piece(core, solid, sneakerMat, side * 0.13, 0.018, 0.055, 0.128, 0.032, 0.24, { shadow: false });
  }

  piece(core, tapered, blackTee, 0, 1.18, 0, 0.285, 0.72, 0.215, { shadow: true });
  piece(core, round, skin, 0, 1.56, 0.01, 0.075, 0.14, 0.075, { shadow: false });
  piece(core, solid, limePrint, -0.075, 1.25, 0.155, 0.055, 0.042, 0.014);
  piece(core, solid, limePrint, 0.0, 1.25, 0.155, 0.068, 0.042, 0.014);
  piece(core, solid, limePrint, 0.082, 1.25, 0.155, 0.052, 0.042, 0.014);
  piece(core, solid, limePrint, 0.0, 1.185, 0.155, 0.18, 0.018, 0.012);

  const head = new THREE.Group();
  head.position.set(0, 1.73, 0.03);
  head.rotation.z = 0.16;
  core.add(head);
  piece(head, orb, skin, 0, 0, 0, 0.21, 0.26, 0.21, { shadow: true });
  piece(head, orb, skin, -0.205, 0.0, 0, 0.038, 0.062, 0.035, { shadow: false });
  piece(head, orb, skin, 0.205, 0.0, 0, 0.038, 0.062, 0.035, { shadow: false });
  piece(head, orb, skin, 0, -0.015, 0.205, 0.032, 0.038, 0.036, { shadow: false });
  piece(head, orb, hairMat, 0, 0.125, -0.03, 0.22, 0.145, 0.215, { shadow: false });
  const hairWave = piece(head, solid, hairMat, 0, 0.175, 0.045, 0.185, 0.075, 0.155, { shadow: false });
  hairWave.rotation.x = -0.18;

  const eyes = new THREE.Group();
  head.add(eyes);
  for (const side of [-1, 1]) {
    piece(head, orb, socketMat, side * 0.075, 0.025, 0.176, 0.052, 0.05, 0.036, { shadow: false });
    piece(eyes, orb, redEye, side * 0.075, 0.025, 0.208, 0.026, 0.026, 0.02);
  }
  const jaw = piece(head, orb, socketMat, 0, -0.1, 0.176, 0.062, 0.068, 0.042, { shadow: false });

  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.285, 1.46, 0);
    piece(arm, orb, blackTee, 0, 0, 0, 0.09, 0.095, 0.09, { shadow: false });
    piece(arm, tapered, blackTee, side * 0.03, -0.14, 0, 0.072, 0.28, 0.072, { shadow: false });
    piece(arm, tapered, skin, side * 0.06, -0.46, 0.03, 0.058, 0.44, 0.058, { shadow: true });
    piece(arm, orb, skin, side * 0.08, -0.7, 0.05, 0.07, 0.088, 0.07, { shadow: false });
    core.add(arm);
    return arm;
  });

  const phone = new THREE.Group();
  phone.position.set(0.08, -0.72, 0.13);
  piece(phone, solid, phoneBody, 0, 0, 0, 0.11, 0.19, 0.022, { shadow: false });
  const phoneScreen = piece(phone, solid, phoneScreenMat, 0, 0, 0.013, 0.092, 0.165, 0.008);
  arms[1].add(phone);

  return { root, core, head, eyes, jaw, arms, phone, phoneScreen };
}

export function bossHaukeModel() {
  const root = new THREE.Group();
  const skin = material(0xf0d5be, 0.44, 0.05);
  const hairMat = material(0x4c3224, 0.65, 0.05);
  const whiteTee = material(0xf0f3fa, 0.52, 0.04);
  const greenCollar = material(0x16523b, 0.5, 0.08);
  const greyJoggers = material(0x6e7585, 0.64, 0.05);
  const brass = brassMaterial(PALETTE.brass);
  const browMat = material(0x281b15, 0.6, 0.08);
  const socketMat = material(0x07070c, 0.92, 0);
  const teethMat = material(0xf0eadc, 0.35, 0.1);
  const amberEye = emissive(0xffaa30);

  const core = new THREE.Group();
  root.add(core);

  const legs = [-1, 1].map((side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.38, 0.44, 0);
    piece(leg, round, greyJoggers, 0, -0.18, 0, 0.24, 0.44, 0.24, { shadow: true });
    piece(leg, solid, brass, 0, -0.37, 0.08, 0.28, 0.13, 0.36, { shadow: false });
    core.add(leg);
    return leg;
  });

  const belly = piece(core, orb, whiteTee, 0, 0.95, 0.04, 0.93, 0.83, 0.87, { shadow: true });
  piece(core, round, greyJoggers, 0, 0.54, 0.02, 0.79, 0.22, 0.75, { shadow: false });
  const collar = band(core, greenCollar, 0, 1.45, 0.08, 0.35);
  collar.scale.set(0.37, 0.37, 0.82);
  band(core, brass, 0, 0.62, 0.04, 0.87);
  piece(core, solid, brass, 0, 0.62, 0.91, 0.3, 0.19, 0.095, { shadow: false });

  const head = new THREE.Group();
  head.position.set(0, 1.72, 0.14);
  core.add(head);
  piece(head, orb, skin, 0, 0, 0, 0.35, 0.315, 0.34, { shadow: true });
  piece(head, orb, skin, -0.34, 0, 0, 0.06, 0.08, 0.05, { shadow: false });
  piece(head, orb, skin, 0.34, 0, 0, 0.06, 0.08, 0.05, { shadow: false });
  piece(head, orb, skin, 0, -0.02, 0.33, 0.06, 0.05, 0.06, { shadow: false });
  piece(head, orb, hairMat, 0, 0.195, -0.02, 0.345, 0.165, 0.315, { shadow: false });
  const quiff = piece(head, solid, hairMat, 0, 0.25, 0.11, 0.29, 0.14, 0.19, { shadow: false });
  quiff.rotation.x = -0.22;

  const eyes = new THREE.Group();
  head.add(eyes);
  for (const side of [-1, 1]) {
    piece(head, orb, socketMat, side * 0.12, 0.03, 0.292, 0.072, 0.058, 0.042, { shadow: false });
    piece(eyes, orb, amberEye, side * 0.12, 0.03, 0.328, 0.038, 0.034, 0.024);
    const brow = piece(head, solid, browMat, side * 0.12, 0.115, 0.312, 0.15, 0.045, 0.045, { shadow: false });
    brow.rotation.z = side * -0.28;
  }
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.115, 0.29);
  piece(jaw, solid, socketMat, 0, 0, 0, 0.21, 0.08, 0.055, { shadow: false });
  for (let i = -3; i <= 3; i++) {
    piece(jaw, solid, teethMat, i * 0.028, 0.024, 0.024, 0.018, 0.02, 0.014, { shadow: false });
  }
  head.add(jaw);

  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.89, 1.08, 0.08);
    piece(arm, orb, whiteTee, 0, 0, 0, 0.29, 0.33, 0.29, { shadow: true });
    piece(arm, tapered, skin, side * 0.06, -0.34, 0.14, 0.165, 0.36, 0.165, { shadow: false });
    piece(arm, orb, skin, side * 0.08, -0.56, 0.2, 0.145, 0.145, 0.145, { shadow: false });
    core.add(arm);
    return arm;
  });

  return { root, core, head, eyes, jaw, arms, legs, belly };
}

export function schnorrerTomModel() {
  const root = new THREE.Group();
  const skin = material(0xebd2bc, 0.45, 0.05);
  const darkHair = material(0x2a201c, 0.68, 0.05);
  const khakiCap = material(PALETTE.khaki, 0.56, 0.06);
  const pinkTee = material(PALETTE.pink, 0.52, 0.05);
  const surfTeal = emissive(0x3ec2c9);
  const surfSunset = emissive(0xff8c66);
  const darkPants = material(0x1c202e, 0.58, 0.1);
  const bagMat = material(PALETTE.copper, 0.46, 0.18);
  const brass = brassMaterial(PALETTE.brass);
  const socketMat = material(0x06070b, 0.92, 0);
  const jadeEye = emissive(PALETTE.jade);

  const core = new THREE.Group();
  root.add(core);

  for (const side of [-1, 1]) {
    piece(core, tapered, darkPants, side * 0.13, 0.35, 0, 0.09, 0.66, 0.09, { shadow: true });
    piece(core, solid, brass, side * 0.13, 0.045, 0.05, 0.135, 0.08, 0.22, { shadow: false });
  }

  piece(core, tapered, pinkTee, 0, 0.96, 0.03, 0.34, 0.62, 0.26, { shadow: true }).rotation.x = 0.12;
  piece(core, round, skin, 0, 1.3, 0.07, 0.085, 0.12, 0.085, { shadow: false });
  piece(core, round, surfTeal, 0, 0.95, 0.165, 0.13, 0.025, 0.13).rotation.x = Math.PI / 2;
  piece(core, solid, surfSunset, 0, 0.99, 0.175, 0.17, 0.045, 0.015);
  piece(core, orb, bagMat, 0, 0.96, -0.22, 0.27, 0.31, 0.25, { shadow: true });
  piece(core, round, brass, 0, 1.22, -0.22, 0.115, 0.1, 0.115, { shadow: false });
  const bagSpezi = speziCanMesh();
  bagSpezi.position.set(0.12, 1.15, -0.24);
  bagSpezi.rotation.z = -0.35;
  bagSpezi.scale.setScalar(0.7);
  core.add(bagSpezi);

  const head = new THREE.Group();
  head.position.set(0, 1.47, 0.1);
  core.add(head);
  piece(head, orb, skin, 0, 0, 0, 0.22, 0.235, 0.22, { shadow: true });
  piece(head, orb, skin, 0, -0.015, 0.215, 0.035, 0.035, 0.038, { shadow: false });
  piece(head, orb, darkHair, 0, 0.08, 0.085, 0.195, 0.082, 0.165, { shadow: false });
  piece(head, orb, khakiCap, 0, 0.125, -0.02, 0.235, 0.115, 0.235, { shadow: false });
  piece(head, solid, khakiCap, 0, 0.095, -0.245, 0.205, 0.038, 0.185, { shadow: false });

  const eyes = new THREE.Group();
  head.add(eyes);
  for (const side of [-1, 1]) {
    piece(head, orb, socketMat, side * 0.08, 0.018, 0.186, 0.052, 0.048, 0.036, { shadow: false });
    piece(eyes, orb, jadeEye, side * 0.08, 0.018, 0.218, 0.026, 0.026, 0.02);
  }
  const jaw = piece(head, solid, socketMat, 0, -0.095, 0.186, 0.12, 0.055, 0.042, { shadow: false });

  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.31, 1.15, 0.06);
    piece(arm, orb, pinkTee, 0, 0, 0, 0.105, 0.11, 0.105, { shadow: false });
    piece(arm, tapered, pinkTee, side * 0.02, -0.1, 0.02, 0.085, 0.22, 0.085, { shadow: false });
    piece(arm, tapered, skin, side * 0.04, -0.32, 0.09, 0.065, 0.32, 0.065, { shadow: true });
    piece(arm, orb, skin, side * 0.05, -0.5, 0.14, 0.075, 0.085, 0.075, { shadow: false });
    core.add(arm);
    return arm;
  });

  const handSpezi = speziCanMesh();
  handSpezi.position.set(-0.04, -0.52, 0.21);
  handSpezi.scale.setScalar(0.75);
  arms[0].add(handSpezi);

  return { root, core, head, eyes, jaw, arms };
}

export function goldenDuckModel() {
  const root = new THREE.Group();
  const goldBody = material(0xf7c931, 0.32, 0.38);
  const beak = material(0xe05818, 0.38, 0.12);
  const socket = material(0x040408, 0.95, 0);
  const pinpoint = emissive(0xffffff);

  const core = new THREE.Group();
  core.scale.set(2.15, 2.15, 2.15);
  root.add(core);
  piece(core, orb, goldBody, 0, 0.24, 0, 0.3, 0.24, 0.35, { shadow: true });
  piece(core, tapered, goldBody, 0, 0.34, -0.29, 0.1, 0.17, 0.12, { shadow: false }).rotation.x = -0.65;
  for (const side of [-1, 1]) {
    piece(core, orb, goldBody, side * 0.27, 0.25, -0.02, 0.105, 0.135, 0.23, { shadow: false });
  }
  const head = new THREE.Group();
  head.position.set(0, 0.5, 0.16);
  head.rotation.z = -0.14;
  core.add(head);
  piece(head, orb, goldBody, 0, 0, 0, 0.225, 0.215, 0.225, { shadow: true });
  piece(head, solid, beak, 0, -0.03, 0.215, 0.175, 0.08, 0.155, { shadow: false });
  const eyes = new THREE.Group();
  head.add(eyes);
  for (const side of [-1, 1]) {
    piece(head, orb, socket, side * 0.095, 0.05, 0.178, 0.055, 0.055, 0.042, { shadow: false });
    piece(eyes, orb, pinpoint, side * 0.095, 0.05, 0.215, 0.016, 0.016, 0.016);
  }
  return { root, core, head, eyes };
}
