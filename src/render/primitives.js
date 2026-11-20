import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const TAU = Math.PI * 2;
export const color = (hex) => new THREE.Color(hex);

export const PALETTE = {
  ink: 0x0b0c14,
  slate: 0x22273c,
  ivory: 0xf6eedc,
  brass: 0xffbf52,
  copper: 0xe07c48,
  jade: 0x38f2af,
  glacier: 0x73d7ff,
  lavender: 0xb85cff,
  vermilion: 0xff3b56,
  pink: 0xf5b3c8,
  khaki: 0xdcc89a,
  neonLime: 0xcce838,
  endoDark: 0x181c28,
  endoSteel: 0x56627a,
};

export const material = (hex, roughness = 0.5, metalness = 0.12, flat = false) => (
  new THREE.MeshStandardMaterial({
    color: hex,
    roughness,
    metalness,
    flatShading: flat,
  })
);

export const vinylMaterial = (hex, roughness = 0.34, metalness = 0.08) => (
  new THREE.MeshStandardMaterial({
    color: hex,
    roughness,
    metalness,
  })
);

export const brassMaterial = (hex = PALETTE.brass) => (
  new THREE.MeshStandardMaterial({ color: hex, roughness: 0.25, metalness: 0.82 })
);

export const endoMaterial = (hex = PALETTE.endoDark) => (
  new THREE.MeshStandardMaterial({ color: hex, roughness: 0.38, metalness: 0.78 })
);

export const emissive = (hex) => new THREE.MeshBasicMaterial({ color: hex });

export const solid = new THREE.BoxGeometry(1, 1, 1);
export const round = new THREE.CylinderGeometry(1, 1, 1, 18);
export const tapered = new THREE.CylinderGeometry(0.76, 1, 1, 18);
export const orb = new THREE.SphereGeometry(1, 20, 16);
export const dome = new THREE.SphereGeometry(1, 20, 12, 0, TAU, 0, Math.PI * 0.55);
export const capsule = new THREE.CapsuleGeometry(0.5, 0.5, 6, 16);
export const octa = new THREE.OctahedronGeometry(1, 0);
export const hoop = new THREE.TorusGeometry(1, 0.055, 10, 28);
export const wedge = new THREE.ConeGeometry(0.5, 1, 3);

const _roundedBoxCache = new Map();

/**
 * Generates a smooth beveled vinyl/animatronic shell box centered at (0,0,0) of unit-like dimensions.
 */
export function roundedBox(w = 1, h = 1, d = 1, radius = 0.14, segments = 3) {
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${radius.toFixed(3)}|${segments}`;
  if (_roundedBoxCache.has(key)) return _roundedBoxCache.get(key);

  const r = Math.min(radius, w * 0.42, h * 0.42, d * 0.42);
  const iw = Math.max(0.01, w - r * 2);
  const ih = Math.max(0.01, h - r * 2);
  const id = Math.max(0.01, d - r * 2);

  const shape = new THREE.Shape();
  const hw = iw * 0.5;
  const hh = ih * 0.5;
  shape.moveTo(-hw, -hh - r);
  shape.lineTo(hw, -hh - r);
  shape.absarc(hw, -hh, r, -Math.PI * 0.5, 0, false);
  shape.lineTo(hw + r, hh);
  shape.absarc(hw, hh, r, 0, Math.PI * 0.5, false);
  shape.lineTo(-hw, hh + r);
  shape.absarc(-hw, hh, r, Math.PI * 0.5, Math.PI, false);
  shape.lineTo(-hw - r, -hh);
  shape.absarc(-hw, -hh, r, Math.PI, Math.PI * 1.5, false);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: id,
    bevelEnabled: true,
    bevelSegments: segments,
    steps: 1,
    bevelSize: r * 0.65,
    bevelThickness: r,
    curveSegments: Math.max(4, segments * 2),
  });
  geo.center();
  geo.computeVertexNormals();
  _roundedBoxCache.set(key, geo);
  return geo;
}

export function randomFrom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/**
 * Adds a scaled primitive mesh with selective shadow discipline.
 */
export function piece(parent, geometry, finish, x, y, z, sx = 1, sy = 1, sz = 1, opts = {}) {
  const object = new THREE.Mesh(geometry, finish);
  object.position.set(x, y, z);
  object.scale.set(sx, sy, sz);
  const canShadow = !finish.isMeshBasicMaterial && !finish.transparent;
  const maxDim = Math.max(Math.abs(sx), Math.abs(sy), Math.abs(sz));
  object.castShadow = opts.shadow !== undefined ? (opts.shadow && canShadow) : (canShadow && maxDim >= 0.22);
  object.receiveShadow = opts.receive !== undefined ? opts.receive : canShadow;
  parent.add(object);
  return object;
}

export function band(parent, finish, x, y, z, radius) {
  const ring = piece(parent, hoop, finish, x, y, z, radius, radius, radius, { shadow: false });
  ring.rotation.x = -Math.PI / 2;
  return ring;
}

const _sharedEndoDark = endoMaterial(0x161a26);
const _sharedEndoRing = endoMaterial(0x525e78);

/**
 * Builds a ribbed FNaF-style metallic endoskeleton joint ring/ball between mascot shell segments.
 */
export function endoJoint(parent, x, y, z, r = 0.065, vertical = true) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  piece(g, orb, _sharedEndoDark, 0, 0, 0, r, r * 0.92, r, { shadow: false });
  const ring = piece(g, hoop, _sharedEndoRing, 0, 0, 0, r * 1.05, r * 1.05, r * 1.05, { shadow: false });
  if (vertical) ring.rotation.x = Math.PI / 2;
  parent.add(g);
  return g;
}

/**
 * Builds an expressive FNaF-style Mascot-Animatronic Eye Rig:
 * - Recessed dark socket
 * - Glossy white animatronic eyeball + colored iris + pupil + catchlight
 * - Posable upper eyelid shell (for sleepy/scheming/angry/wide expressions!)
 * - Switchable blacked-out "Endo-Stare" glowing pinprick mode for scary close-ups & jumpscares!
 */
export function mascotEyeRig(parent, x, y, z, {
  radius = 0.052,
  irisHex = 0x36b5ff,
  pinHex = 0x88f4ff,
  lidHex = 0xd9bfa9,
  lidDrop = 0.25, // 0 = wide open, 0.5 = half-lidded, 0.8 = sleepy
  lidTilt = 0,
} = {}) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const socketMat = material(0x05060b, 0.94, 0.05);
  const scleraMat = vinylMaterial(0xf7f8fc, 0.14, 0.04);
  const irisMat = emissive(irisHex);
  const pupilMat = material(0x06070c, 0.2, 0.1);
  const catchMat = emissive(0xffffff);
  const lidMat = vinylMaterial(lidHex, 0.42, 0.08);
  const endoPinMat = emissive(pinHex);

  // Recessed socket rim
  piece(group, orb, socketMat, 0, 0, -radius * 0.18, radius * 1.18, radius * 1.15, radius * 0.65, { shadow: false });

  // Normal Mascot Eyeball assembly
  const normalEye = new THREE.Group();
  piece(normalEye, orb, scleraMat, 0, 0, 0, radius, radius * 0.98, radius * 0.72, { shadow: false });
  piece(normalEye, round, irisMat, 0, 0, radius * 0.64, radius * 0.56, 0.008, radius * 0.56, { shadow: false }).rotation.x = Math.PI / 2;
  piece(normalEye, round, pupilMat, 0, 0, radius * 0.68, radius * 0.30, 0.009, radius * 0.30, { shadow: false }).rotation.x = Math.PI / 2;
  piece(normalEye, orb, catchMat, radius * 0.18, radius * 0.20, radius * 0.72, radius * 0.12, radius * 0.12, 0.006, { shadow: false });
  group.add(normalEye);

  // Scary Blacked-out Endo-Stare Pinprick assembly (toggled on in close-ups / jumpscares / blackout!)
  const endoEye = new THREE.Group();
  endoEye.visible = false;
  piece(endoEye, orb, socketMat, 0, 0, 0, radius * 1.02, radius, radius * 0.7, { shadow: false });
  piece(endoEye, orb, endoPinMat, 0, 0, radius * 0.68, radius * 0.24, radius * 0.24, 0.012, { shadow: false });
  group.add(endoEye);

  // Posable heavy animatronic eyelid
  const eyelid = new THREE.Group();
  eyelid.rotation.z = lidTilt;
  eyelid.rotation.x = -0.35 + lidDrop * 0.95;
  const lidCap = piece(eyelid, dome, lidMat, 0, 0, 0, radius * 1.08, radius * 1.08, radius * 0.82, { shadow: false });
  lidCap.rotation.x = -Math.PI * 0.36;
  group.add(eyelid);

  parent.add(group);
  return { group, normalEye, endoEye, eyelid };
}

export function setEndoEyes(model, endoOn = false) {
  if (!model?.eyeRigs) return;
  for (const rig of model.eyeRigs) {
    rig.normalEye.visible = !endoOn;
    rig.endoEye.visible = Boolean(endoOn);
  }
}

/**
 * Merges static scenery meshes by material + attribute layout into single draw calls.
 */
export function batchStaticGroup(targetParent, stagingGroup, { castShadow = false, receiveShadow = true } = {}) {
  const buckets = new Map();
  stagingGroup.updateMatrixWorld(true);

  stagingGroup.traverse((object) => {
    if (!object.isMesh || !object.geometry) return;
    const style = object.material;
    const baseGeo = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    baseGeo.applyMatrix4(object.matrixWorld);
    const sig = Object.keys(baseGeo.attributes).sort().join('|');
    let bySig = buckets.get(style);
    if (!bySig) {
      bySig = new Map();
      buckets.set(style, bySig);
    }
    if (!bySig.has(sig)) bySig.set(sig, []);
    bySig.get(sig).push(baseGeo);
  });

  const mergedGroup = new THREE.Group();
  for (const [style, bySig] of buckets.entries()) {
    for (const parts of bySig.values()) {
      const merged = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
      if (parts.length > 1) {
        for (const p of parts) p.dispose();
      }
      if (!merged) continue;
      const canShadow = !style.isMeshBasicMaterial && !style.transparent;
      const mesh = new THREE.Mesh(merged, style);
      mesh.castShadow = Boolean(castShadow && canShadow);
      mesh.receiveShadow = Boolean(receiveShadow && canShadow);
      mergedGroup.add(mesh);
    }
  }
  targetParent.add(mergedGroup);
  return mergedGroup;
}

export const batchScenery = batchStaticGroup;
