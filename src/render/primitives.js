import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const TAU = Math.PI * 2;
export const color = (hex) => new THREE.Color(hex);

export const PALETTE = {
  ink: 0x07080d,
  slate: 0x1e2330,
  ivory: 0xe6dfd1,
  brass: 0xb88c42,
  copper: 0x9e5834,
  jade: 0x38d698,
  glacier: 0x6ac4e8,
  lavender: 0x8a52b8,
  vermilion: 0xc82e3f,
  pink: 0xc98a98,
  khaki: 0xb8a47c,
  neonLime: 0xa8c838,
  endoDark: 0x141720,
  endoSteel: 0x485266,
};

export const material = (hex, roughness = 0.68, metalness = 0.08, flat = false) => (
  new THREE.MeshStandardMaterial({
    color: hex,
    roughness,
    metalness,
    flatShading: flat,
  })
);

export const vinylMaterial = (hex, roughness = 0.62, metalness = 0.04) => (
  new THREE.MeshStandardMaterial({
    color: hex,
    roughness,
    metalness,
    flatShading: true,
  })
);

export const brassMaterial = (hex = PALETTE.brass) => (
  new THREE.MeshStandardMaterial({ color: hex, roughness: 0.46, metalness: 0.72 })
);

export const endoMaterial = (hex = PALETTE.endoDark) => (
  new THREE.MeshStandardMaterial({ color: hex, roughness: 0.44, metalness: 0.68 })
);

export const emissive = (hex) => new THREE.MeshBasicMaterial({ color: hex });

export const solid = new THREE.BoxGeometry(1, 1, 1);
export const round = new THREE.CylinderGeometry(1, 1, 1, 12);
export const tapered = new THREE.CylinderGeometry(0.76, 1, 1, 10);
export const orb = new THREE.IcosahedronGeometry(1, 1);
export const dome = new THREE.SphereGeometry(1, 10, 7, 0, TAU, 0, Math.PI * 0.55);
export const capsule = new THREE.CylinderGeometry(0.46, 0.42, 1, 8);
export const octa = new THREE.OctahedronGeometry(1, 0);
export const hoop = new THREE.TorusGeometry(1, 0.055, 7, 18);
export const wedge = new THREE.ConeGeometry(0.5, 1, 3);

const _geoCache = new Map();

export function randomFrom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function roundedBox(w = 1, h = 1, d = 1, radius = 0.08, segments = 1) {
  const key = `rb|${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${radius.toFixed(3)}|${segments}`;
  if (_geoCache.has(key)) return _geoCache.get(key);

  const r = Math.min(radius, w * 0.38, h * 0.38, d * 0.38);
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
    curveSegments: Math.max(3, segments * 2),
  });
  geo.center();
  geo.computeVertexNormals();
  _geoCache.set(key, geo);
  return geo;
}

/**
 * Custom PS1/VHS Faceted Low-Poly Human Head Cranium with:
 * - Angular cheekbones, overhanging brow ridge, recessed dark eye sockets,
 *   nose bridge projection, tapered jaw temples, and planar front-face UVs.
 */
export function sculptedHeadGeometry({
  width = 0.22,
  height = 0.26,
  depth = 0.24,
  cheekWidth = 1.08,
  browRidge = 0.024,
  noseLen = 0.036,
  socketDepth = 0.026,
} = {}) {
  const key = `head|${width}|${height}|${depth}|${cheekWidth}|${browRidge}|${noseLen}|${socketDepth}`;
  if (_geoCache.has(key)) return _geoCache.get(key);

  const radial = 12;
  const rings = [
    // [yNorm (-0.5..+0.5), rxScale, rzScale, zOffset]
    [-0.50, 0.56, 0.58, -0.01], // neck base / lower maxilla
    [-0.30, 0.78, 0.82, 0.008], // upper lip / philtrum
    [-0.08, cheekWidth, 0.94, 0.012], // angular cheekbones + nose tip
    [0.12, 0.95, 0.94, -0.004], // recessed eye socket band
    [0.26, 0.98, 1.02, browRidge], // heavy overhanging brow ridge
    [0.42, 0.90, 0.92, 0.00], // forehead
    [0.52, 0.54, 0.58, -0.015], // crown dome
  ];

  const positions = [];
  const uvs = [];
  const indices = [];

  for (let r = 0; r < rings.length; r++) {
    const [yn, sx, sz, zOff] = rings[r];
    const y = yn * height;
    for (let s = 0; s <= radial; s++) {
      const uTheta = s / radial;
      const theta = uTheta * TAU - Math.PI * 0.5; // theta=0 at +X, pi/2 at +Z (front!)
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      let x = cosT * (width * 0.5) * sx;
      let z = sinT * (depth * 0.5) * sz + zOff;

      // Sculpted facial features on front hemisphere (sinT > 0.25)
      if (sinT > 0.25) {
        // Nose bridge & tip along center X≈0 on rings 1..3
        if (Math.abs(cosT) < 0.24 && (r === 2 || r === 3)) {
          const noseFactor = (1 - Math.abs(cosT) / 0.24) * (r === 2 ? 1.0 : 0.55);
          z += noseLen * noseFactor;
        }
        // Recessed eye sockets on ring 3 around x ≈ ±0.42..0.72
        if (r === 3 && Math.abs(cosT) > 0.22 && Math.abs(cosT) < 0.76) {
          z -= socketDepth;
        }
        // Angular cheekbone flare on ring 2
        if (r === 2 && Math.abs(cosT) > 0.52 && Math.abs(cosT) < 0.90) {
          x *= 1.08;
          z += 0.010;
        }
        // Brow shelf projection on ring 4
        if (r === 4 && sinT > 0.55) {
          z += browRidge * 0.65;
        }
      }

      positions.push(x, y, z);
      // Planar front-face UV mapping on [0..1] for crisp face/override compositing
      const u = sinT > 0 ? (0.5 + (x / (width * 1.15))) : (0.5 + cosT * 0.45);
      const v = yn + 0.5;
      uvs.push(Math.max(0.02, Math.min(0.98, u)), Math.max(0.02, Math.min(0.98, v)));
    }
  }

  const stride = radial + 1;
  for (let r = 0; r < rings.length - 1; r++) {
    for (let s = 0; s < radial; s++) {
      const a = r * stride + s;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  // Cap top crown
  const topCenterIdx = positions.length / 3;
  positions.push(0, height * 0.55, -0.015);
  uvs.push(0.5, 0.98);
  const lastRingStart = (rings.length - 1) * stride;
  for (let s = 0; s < radial; s++) {
    indices.push(lastRingStart + s, lastRingStart + s + 1, topCenterIdx);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  const nonIdx = geo.toNonIndexed();
  geo.dispose();
  nonIdx.computeVertexNormals();
  _geoCache.set(key, nonIdx);
  return nonIdx;
}

/**
 * Faceted Low-Poly Hinged Human Jaw / Chin Geometry.
 */
export function sculptedJawGeometry({ width = 0.17, height = 0.085, depth = 0.17 } = {}) {
  const key = `jaw|${width}|${height}|${depth}`;
  if (_geoCache.has(key)) return _geoCache.get(key);

  const geo = new THREE.CylinderGeometry(width * 0.52, width * 0.36, height, 7, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    let z = pos.getZ(i) * (depth / width);
    if (z > 0 && y < 0) z += 0.014; // angular chin projection
    pos.setZ(i, z);
  }
  const nonIdx = geo.toNonIndexed();
  geo.dispose();
  nonIdx.computeVertexNormals();
  _geoCache.set(key, nonIdx);
  return nonIdx;
}

/**
 * Faceted PS1/VHS Anatomical Torso / Ribcage Geometry with cloth folds.
 */
export function sculptedTorsoGeometry({
  waistW = 0.32,
  chestW = 0.42,
  shoulderW = 0.46,
  height = 0.54,
  depth = 0.24,
  hunch = 0.0,
} = {}) {
  const key = `torso|${waistW}|${chestW}|${shoulderW}|${height}|${depth}|${hunch}`;
  if (_geoCache.has(key)) return _geoCache.get(key);

  const radial = 10;
  const rings = [
    [0.0, waistW, depth * 0.88, 0],
    [0.32, (waistW + chestW) * 0.5, depth * 0.96, hunch * 0.25],
    [0.68, chestW, depth * 1.04, hunch * 0.65],
    [0.92, shoulderW, depth * 0.95, hunch],
    [1.0, shoulderW * 0.52, depth * 0.62, hunch * 1.05],
  ];

  const positions = [];
  const uvs = [];
  const indices = [];

  for (let r = 0; r < rings.length; r++) {
    const [yn, w, d, zOff] = rings[r];
    const y = yn * height;
    for (let s = 0; s <= radial; s++) {
      const theta = (s / radial) * TAU - Math.PI * 0.5;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      // Subtle cloth wrinkle facet
      const fold = (r === 1 || r === 2) ? Math.sin(theta * 3 + r) * 0.008 : 0;
      const x = cosT * (w * 0.5) + cosT * fold;
      const z = sinT * (d * 0.5) + zOff + sinT * fold;
      positions.push(x, y, z);
      const u = 0.5 + (x / Math.max(0.01, shoulderW));
      uvs.push(Math.max(0.02, Math.min(0.98, u)), yn);
    }
  }

  const stride = radial + 1;
  for (let r = 0; r < rings.length - 1; r++) {
    for (let s = 0; s < radial; s++) {
      const a = r * stride + s;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  const nonIdx = geo.toNonIndexed();
  geo.dispose();
  nonIdx.computeVertexNormals();
  _geoCache.set(key, nonIdx);
  return nonIdx;
}

/**
 * Faceted 7-sided Low-Poly Limb Segment extending downward from y=0 to y=-length (joint-pivoted!).
 */
export function sculptedLimbGeometry({ topR = 0.068, midR = 0.062, botR = 0.050, length = 0.28, crease = 0.007 } = {}) {
  const key = `limb|${topR}|${midR}|${botR}|${length}|${crease}`;
  if (_geoCache.has(key)) return _geoCache.get(key);

  const radial = 7;
  const rings = [
    [0.0, topR * 0.88],
    [-0.18, topR],
    [-0.54, midR],
    [-0.92, botR],
    [-1.0, botR * 0.85],
  ];

  const positions = [];
  const uvs = [];
  const indices = [];

  for (let r = 0; r < rings.length; r++) {
    const [yn, rad] = rings[r];
    const y = yn * length;
    for (let s = 0; s <= radial; s++) {
      const theta = (s / radial) * TAU;
      const fold = r === 2 ? Math.cos(theta * 2) * crease : 0;
      const cr = rad + fold;
      positions.push(Math.cos(theta) * cr, y, Math.sin(theta) * cr);
      uvs.push(s / radial, -yn);
    }
  }

  const stride = radial + 1;
  for (let r = 0; r < rings.length - 1; r++) {
    for (let s = 0; s < radial; s++) {
      const a = r * stride + s;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, c, d, a, d, b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  const nonIdx = geo.toNonIndexed();
  geo.dispose();
  nonIdx.computeVertexNormals();
  _geoCache.set(key, nonIdx);
  return nonIdx;
}

/**
 * Faceted Low-Poly Human Hand with Palm, Opposable Thumb, and 4 Articulated Faceted Fingers.
 */
export function buildSculptedHand(parent, skinMat, side = 1, scale = 1) {
  const hand = new THREE.Group();
  const palmGeo = sculptedLimbGeometry({ topR: 0.038 * scale, midR: 0.044 * scale, botR: 0.040 * scale, length: 0.085 * scale, crease: 0.002 });
  const palm = new THREE.Mesh(palmGeo, skinMat);
  palm.scale.set(1.15, 1, 0.58);
  palm.castShadow = true;
  hand.add(palm);

  const fingerGeo = sculptedLimbGeometry({ topR: 0.011 * scale, midR: 0.0095 * scale, botR: 0.0075 * scale, length: 0.068 * scale, crease: 0 });
  const offsets = [-0.028, -0.009, 0.010, 0.027];
  const lengths = [0.95, 1.05, 0.98, 0.82];
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(fingerGeo, skinMat);
    f.position.set(offsets[i] * scale, -0.078 * scale, 0.006 * scale);
    f.scale.set(1, lengths[i], 1);
    f.rotation.x = -0.26 - i * 0.05; // slightly curled tense fingers
    hand.add(f);
  }

  const thumb = new THREE.Mesh(fingerGeo, skinMat);
  thumb.position.set(-side * 0.038 * scale, -0.032 * scale, 0.014 * scale);
  thumb.scale.set(1.15, 0.82, 1.15);
  thumb.rotation.z = side * 0.52;
  thumb.rotation.x = -0.32;
  hand.add(thumb);

  parent.add(hand);
  return hand;
}

/**
 * Adds a scaled mesh with selective shadow discipline.
 */
export function piece(parent, geometry, finish, x, y, z, sx = 1, sy = 1, sz = 1, opts = {}) {
  const object = new THREE.Mesh(geometry, finish);
  object.position.set(x, y, z);
  object.scale.set(sx, sy, sz);
  const canShadow = !finish.isMeshBasicMaterial && !finish.transparent;
  const maxDim = Math.max(Math.abs(sx), Math.abs(sy), Math.abs(sz));
  object.castShadow = opts.shadow !== undefined ? (opts.shadow && canShadow) : (canShadow && maxDim >= 0.18);
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
 * Uncanny Human Eye Rig (Replaces glowing superhero spheres!):
 * - Deep shadowed orbital socket
 * - Pale bloodshot sclera + tiny dark human iris
 * - Heavy dark sleepless upper/lower lids
 * - Retroreflective white IR eye-shine pinpoint catching CCTV night-vision & Flashlight beams!
 */
export function uncannyEyeRig(parent, x, y, z, {
  radius = 0.024,
  irisHex = 0x1c1815,
  scleraHex = 0xd6cbc4,
  bagHex = 0x261a24,
  lidDrop = 0.25,
} = {}) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const socketMat = material(0x060508, 0.96, 0.0);
  const scleraMat = material(scleraHex, 0.32, 0.04, true);
  const irisMat = material(irisHex, 0.22, 0.05);
  const pupilMat = material(0x030305, 0.15, 0.05);
  const bagMat = material(bagHex, 0.85, 0.02, true);
  const irPinMat = new THREE.MeshBasicMaterial({ color: 0xf4faff, transparent: true, opacity: 0.0 });

  // Deep recessed shadow socket & dark under-eye bag
  piece(group, orb, socketMat, 0, 0, -radius * 0.35, radius * 1.45, radius * 1.25, radius * 0.8, { shadow: false });
  piece(group, orb, bagMat, 0, -radius * 0.72, radius * 0.18, radius * 1.32, radius * 0.45, radius * 0.45, { shadow: false });

  // Pale bloodshot sclera + tiny dark human iris (NOT glowing!)
  const normalEye = new THREE.Group();
  piece(normalEye, orb, scleraMat, 0, 0, 0, radius, radius * 0.86, radius * 0.72, { shadow: false });
  piece(normalEye, round, irisMat, 0, 0, radius * 0.66, radius * 0.38, 0.004, radius * 0.38, { shadow: false }).rotation.x = Math.PI / 2;
  piece(normalEye, round, pupilMat, 0, 0, radius * 0.70, radius * 0.18, 0.005, radius * 0.18, { shadow: false }).rotation.x = Math.PI / 2;
  group.add(normalEye);

  // Retroreflective white IR eye-shine pinpoint (glints in CCTV night-vision & Flashlight beams!)
  const endoEye = new THREE.Group();
  endoEye.visible = false;
  const irPin = piece(endoEye, octa, irPinMat, 0, radius * 0.06, radius * 0.78, radius * 0.24, radius * 0.24, 0.006, { shadow: false });
  group.add(endoEye);

  // Heavy sleepless upper eyelid crease
  const eyelid = new THREE.Group();
  eyelid.rotation.x = -0.28 + lidDrop * 0.65;
  const lidCap = piece(eyelid, dome, bagMat, 0, 0, 0, radius * 1.12, radius * 1.05, radius * 0.82, { shadow: false });
  lidCap.rotation.x = -Math.PI * 0.36;
  group.add(eyelid);

  parent.add(group);
  return { group, normalEye, endoEye, irPin, irPinMat, eyelid };
}

export function setIrEyeShine(model, intensity = 0) {
  if (!model?.eyeRigs) return;
  const amt = Math.max(0, Math.min(1, Number(intensity) || 0));
  for (const rig of model.eyeRigs) {
    rig.endoEye.visible = amt > 0.02;
    if (rig.irPinMat) {
      rig.irPinMat.opacity = amt;
    }
  }
}

// Keep backward-compatible names pointing to uncannyEyeRig / setIrEyeShine
export const mascotEyeRig = uncannyEyeRig;
export function setEndoEyes(model, active = false) {
  setIrEyeShine(model, active ? 0.92 : 0.0);
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
