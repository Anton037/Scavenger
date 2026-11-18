import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const TAU = Math.PI * 2;
export const color = (hex) => new THREE.Color(hex);
export const material = (hex, roughness = 0.6, metalness = 0.08) => (
  new THREE.MeshStandardMaterial({ color: hex, roughness, metalness })
);
export const emissive = (hex) => new THREE.MeshBasicMaterial({ color: hex });
export const solid = new THREE.BoxGeometry(1, 1, 1);
export const round = new THREE.CylinderGeometry(1, 1, 1, 14);
export const tapered = new THREE.CylinderGeometry(0.8, 1, 1, 14);
export const orb = new THREE.SphereGeometry(1, 14, 10);
export const hoop = new THREE.TorusGeometry(1, 0.033, 6, 24);

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
  object.castShadow = finish.isMeshStandardMaterial;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

export function band(parent, finish, x, y, z, radius) {
  const ring = piece(parent, hoop, finish, x, y, z, radius, radius, radius);
  ring.rotation.x = -Math.PI / 2;
  return ring;
}

export function surfaceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  const random = randomFrom(77);
  ctx.fillStyle = '#a6a6a6';
  ctx.fillRect(0, 0, 160, 160);
  for (let i = 0; i < 250; i++) {
    const x = random() * 160;
    const z = random() * 160;
    const r = random() * 29 + 4;
    const pigment = random() > 0.45 ? '18, 18, 18' : '235, 235, 235';
    const blot = ctx.createRadialGradient(x, z, 0, x, z, r);
    blot.addColorStop(0, `rgba(${pigment}, ${0.04 + random() * 0.16})`);
    blot.addColorStop(1, `rgba(${pigment}, 0)`);
    ctx.fillStyle = blot;
    ctx.fillRect(x - r, z - r, r * 2, r * 2);
  }
  for (let i = 0; i < 2500; i++) {
    ctx.fillStyle = random() > 0.55 ? '#ffffff16' : '#101e241b';
    ctx.fillRect(random() * 160, random() * 160, random() * 1.7 + 0.15, random() * 1.1 + 0.2);
  }
  ctx.strokeStyle = '#252b2b';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, 157, 157);
  ctx.strokeStyle = '#f5f5f53c';
  ctx.lineWidth = 1;
  ctx.strokeRect(4, 4, 152, 152);
  ctx.strokeStyle = '#28353253';
  ctx.lineWidth = 0.65;
  ctx.beginPath();
  ctx.moveTo(16, 82);
  ctx.lineTo(82, 16);
  ctx.lineTo(144, 82);
  ctx.lineTo(82, 144);
  ctx.closePath();
  ctx.stroke();
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
    surface.castShadow = style.isMeshStandardMaterial;
    surface.receiveShadow = true;
    scene.add(surface);
  }
}

export function diver() {
  const root = new THREE.Group();
  const coat = material(0x253c37, 0.86);
  const leather = material(0x7b422f, 0.88);
  const dark = material(0x111d20, 0.56);
  const brass = material(0xb0844b, 0.43, 0.52);
  const porcelain = material(0xe5d7af, 0.35, 0.09);
  const glass = material(0x1c3438, 0.13, 0.35);
  const glow = emissive(0xffc07b);
  const body = new THREE.Group();
  root.add(body);
  piece(body, round, coat, 0, 0.36, 0, 0.23, 0.45, 0.23);
  piece(body, tapered, leather, 0, 0.58, 0, 0.34, 0.16, 0.305);
  piece(body, round, brass, 0, 0.66, 0, 0.19, 0.08, 0.19);
  piece(body, orb, porcelain, 0, 0.83, 0, 0.25, 0.239, 0.24);
  piece(body, orb, brass, 0, 0.846, 0.18, 0.203, 0.108, 0.09);
  piece(body, orb, glass, 0, 0.857, 0.233, 0.166, 0.075, 0.039);
  piece(body, solid, leather, 0, 0.41, -0.245, 0.28, 0.279, 0.14);
  for (const side of [-1, 1]) {
    piece(body, round, brass, side * 0.23, 0.8, -0.025, 0.082, 0.053, 0.082).rotation.z = Math.PI / 2;
    piece(body, orb, coat, side * 0.278, 0.433, 0.027, 0.096, 0.186, 0.085);
  }
  const legs = [-1, 1].map((side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.115, 0.28, 0);
    piece(leg, tapered, coat, 0, -0.107, 0, 0.067, 0.232, 0.07);
    piece(leg, solid, dark, 0, -0.216, 0.038, 0.14, 0.106, 0.205);
    root.add(leg);
    return leg;
  });
  const lamp = new THREE.Group();
  lamp.position.set(0.28, 0.43, 0.23);
  body.add(lamp);
  piece(lamp, round, brass, 0, 0.096, 0, 0.086, 0.05, 0.086);
  piece(lamp, round, brass, 0, -0.089, 0, 0.086, 0.047, 0.086);
  const bulb = piece(lamp, round, glow, 0, 0, 0, 0.066, 0.145, 0.066);
  for (let i = 0; i < 5; i++) {
    const a = i * TAU / 5;
    piece(lamp, solid, brass, 0.077 * Math.sin(a), 0, 0.077 * Math.cos(a), 0.009, 0.19, 0.009);
  }
  return { root, body, bulb, legs };
}

export function dredged() {
  const root = new THREE.Group();
  const hull = material(0x142829, 0.95);
  const mantle = material(0x345151, 0.78);
  const bone = material(0xc4c2a4, 0.67);
  const ink = material(0x0d1518, 0.9);
  const seams = material(0x593e34, 0.7, 0.24);
  const core = new THREE.Group();
  root.add(core);
  piece(core, tapered, hull, 0, 0.77, -0.035, 0.43, 1.45, 0.3).rotation.x = 0.23;
  piece(core, orb, mantle, 0, 1.07, 0.045, 0.51, 0.43, 0.3);
  const mask = new THREE.Group();
  mask.position.set(0, 1.22, 0.283);
  mask.rotation.x = -0.15;
  core.add(mask);
  piece(mask, tapered, bone, 0, 0, 0, 0.212, 0.49, 0.115).rotation.z = Math.PI;
  for (let i = -1; i <= 1; i++) {
    piece(mask, solid, ink, i * 0.066, 0.025, 0.098, 0.024, 0.234 - Math.abs(i) * 0.036, 0.037);
  }
  for (let i = 0; i < 5; i++) {
    piece(core, orb, seams, 0, 0.64 + i * 0.132, -0.302, 0.09, 0.058, 0.07);
  }
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.38, 1.19, 0.02);
    arm.rotation.z = side * 0.175;
    piece(arm, tapered, mantle, side * 0.07, -0.25, 0.025, 0.126, 0.58, 0.11).rotation.z = side * 0.265;
    piece(arm, tapered, bone, side * 0.16, -0.6, -0.06, 0.078, 0.29, 0.092).rotation.x = -0.39;
    core.add(arm);
    return arm;
  });
  return { root, core, mask, arms };
}
