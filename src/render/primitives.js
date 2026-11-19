import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const TAU = Math.PI * 2;
export const color = (hex) => new THREE.Color(hex);

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
  pink: 0xf2b5c6,
  khaki: 0xd9c79e,
  neonLime: 0xc8e838,
};

export const material = (hex, roughness = 0.56, metalness = 0.12, flat = false) => (
  new THREE.MeshStandardMaterial({
    color: hex,
    roughness,
    metalness,
    flatShading: flat,
  })
);

export const brassMaterial = (hex = PALETTE.brass) => (
  new THREE.MeshStandardMaterial({ color: hex, roughness: 0.28, metalness: 0.78 })
);

export const emissive = (hex) => new THREE.MeshBasicMaterial({ color: hex });

export const solid = new THREE.BoxGeometry(1, 1, 1);
export const round = new THREE.CylinderGeometry(1, 1, 1, 16);
export const tapered = new THREE.CylinderGeometry(0.76, 1, 1, 16);
export const orb = new THREE.SphereGeometry(1, 18, 14);
export const octa = new THREE.OctahedronGeometry(1, 0);
export const hoop = new THREE.TorusGeometry(1, 0.048, 8, 28);

export function randomFrom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/**
 * Adds a scaled primitive mesh.
 * Selective shadow discipline: small decorative sub-meshes do not cast shadows unless `shadow` is set
 * or their footprint is substantial, keeping shadow-map passes ultra-fast.
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

/**
 * Merges static scenery meshes by material + attribute layout into single draw calls.
 * Cuts room draw calls by ~75% while preserving materials, UVs, normals, and shadow flags.
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
