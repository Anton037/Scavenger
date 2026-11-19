import * as THREE from 'three';
import { LOADOUTS } from './level.js';
import {
  PALETTE, TAU, band, batchScenery, barrelMesh, brassMaterial, color, crateMesh, crownMesh,
  diver, doenerModel, dredged, emissive, greedyTom, haukeBoss, haukeSnack, hoop, magnetPickupModel, material,
  megaDuckModel, octa, orb, piece, randomFrom, round, rubberDuck, skewerModel, solid, speziModel, surfaceTexture,
  tapered,
} from './art.js';

const brass = brassMaterial(PALETTE.brass);
const copper = brassMaterial(PALETTE.copper);
const enamel = material(0x274c5e, 0.45, 0.18);
const clay = material(PALETTE.slate, 0.55, 0.14);
const ink = material(PALETTE.ink, 0.75, 0.1);
const ivoryMat = material(PALETTE.ivory, 0.4, 0.1);
const jadeMat = material(PALETTE.jade, 0.4, 0.15);

const tilePlane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const markPlane = new THREE.RingGeometry(0.93, 1, 32).rotateX(-Math.PI / 2);
const thinRingPlane = new THREE.RingGeometry(0.965, 1, 32).rotateX(-Math.PI / 2);
const floorY = 0.013;

const SHARED_GEOS = new Set([tilePlane, markPlane, thinRingPlane, solid, round, tapered, orb, octa, hoop]);
const SHARED_MATERIALS = new Set([brass, copper, enamel, clay, ink, ivoryMat, jadeMat]);

// Dead-Cells Pixel-Art Auflösung
const PIXEL_SCALE = 2.4;

function placeInlayRing(parent, tint, x, z, radius, opacity = 0.42) {
  const finish = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity, depthWrite: false });
  const mark = piece(parent, thinRingPlane, finish, x, floorY + 0.008, z, radius, 1, radius);
  mark.renderOrder = 1;
  return mark;
}

function placeRing(parent, tint, x, z, radius) {
  const finish = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.82, depthWrite: false });
  const mark = piece(parent, markPlane, finish, x, floorY + 0.024, z, radius, 1, radius);
  mark.renderOrder = 2;
  return mark;
}

function installFloor(world, map, texture) {
  const random = randomFrom(map.seed + map.floor * 91);
  const floorFinish = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.62,
    metalness: 0.12,
  });
  const floor = [];
  const perimeter = [];
  const sides = [[1, 0], [0, -1], [-1, 0], [0, 1]];
  for (let z = 0; z < map.depth; z++) {
    for (let x = 0; x < map.width; x++) {
      const style = map.cell(x, z);
      if (!style) continue;
      floor.push({ x, z, style });
      for (const [dx, dz] of sides) {
        if (map.cell(x + dx, z + dz) === 0) perimeter.push({ x, z, dx, dz });
      }
    }
  }
  const transform = new THREE.Object3D();
  const tiles = new THREE.InstancedMesh(tilePlane, floorFinish, floor.length);
  for (const [index, { x, z, style }] of floor.entries()) {
    transform.position.set(x + 0.5, 0, z + 0.5);
    transform.rotation.y = Math.floor(random() * 4) * Math.PI / 2;
    transform.updateMatrix();
    tiles.setMatrixAt(index, transform.matrix);
    const baseHex = map.rooms[style - 2]?.glaze
      ?? map.biome.floorGlazes[(style - 2) % map.biome.floorGlazes.length]
      ?? map.biome.floorGlazes[0];
    tiles.setColorAt(index, color(baseHex).multiplyScalar(1.06 + random() * 0.18));
  }
  tiles.receiveShadow = true;
  world.add(tiles);

  for (const room of map.rooms) {
    const r = Math.min(room.w, room.d) * 0.36;
    placeInlayRing(world, map.biome.accent, room.cx, room.cz, r, 0.15);
    placeInlayRing(world, PALETTE.copper, room.cx, room.cz, r * 0.58, 0.10);
  }

  const sidesFinish = new THREE.MeshStandardMaterial({
    color: map.biome.wallHex,
    roughness: 0.58,
    metalness: 0.15,
    map: texture,
  });
  const walls = new THREE.InstancedMesh(solid, sidesFinish, perimeter.length);
  const rims = new THREE.InstancedMesh(solid, brass, perimeter.length);
  const feet = new THREE.InstancedMesh(solid, ink, perimeter.length);
  const profile = new THREE.Group();
  transform.rotation.y = 0;
  for (const [index, { x, z, dx, dz }] of perimeter.entries()) {
    const px = x + 0.5 + dx * 0.54;
    const pz = z + 0.5 + dz * 0.54;
    const height = dz > 0 ? 0.42 : 0.96 + random() * 0.22;
    const width = dx ? 0.24 : 1.06;
    const depth = dz ? 0.24 : 1.06;
    transform.position.set(px, height / 2 - 0.15, pz);
    transform.scale.set(width, height + 0.3, depth);
    transform.updateMatrix();
    walls.setMatrixAt(index, transform.matrix);
    walls.setColorAt(index, color(map.biome.wallHex).multiplyScalar(0.95 + random() * 0.24));
    transform.position.y = height + 0.015;
    transform.scale.set(width + 0.04, 0.06, depth + 0.04);
    transform.updateMatrix();
    rims.setMatrixAt(index, transform.matrix);
    transform.position.y = 0.11;
    transform.scale.set(width + 0.05, 0.12, depth + 0.05);
    transform.updateMatrix();
    feet.setMatrixAt(index, transform.matrix);

    if (index % 5 === 0 && dz <= 0) {
      piece(profile, tapered, enamel, px, height * 0.72, pz, 0.24, height * 1.4, 0.24);
      piece(profile, round, brass, px, height * 1.38, pz, 0.27, 0.075, 0.27);
      piece(profile, orb, enamel, px, height * 1.48, pz, 0.22, 0.15, 0.22);
    }
  }
  for (const mesh of [walls, rims, feet]) {
    mesh.castShadow = mesh !== feet;
    mesh.receiveShadow = true;
    world.add(mesh);
  }
  batchScenery(world, profile);
}

function installWater(world, map) {
  const clock = { value: 0 };
  const water = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: clock,
      uColor: { value: color(map.biome.waterHex) },
      uFoam: { value: color(map.biome.foamHex ?? 0xffe066) },
    },
    vertexShader: `varying vec2 waterUv;
void main() {
  waterUv = uv * 2.0 - 1.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `uniform float uTime;
uniform vec3 uColor;
uniform vec3 uFoam;
varying vec2 waterUv;
void main() {
  vec2 pixUv = floor(waterUv * 16.0) / 16.0;
  float angle = atan(pixUv.y, pixUv.x);
  float border = length(pixUv) + sin(angle * 6.0 + uTime * 0.6) * 0.03;
  float surface = step(border, 0.95);
  float ring = step(0.65, sin(border * 18.0 - uTime * 2.2));
  float rim = step(0.86, border) * step(border, 0.95);
  vec3 tint = uColor * 0.62 + uFoam * (ring * 0.22 + rim * 0.45);
  gl_FragColor = vec4(tint, surface * 0.74);
}`,
  });
  for (const { x, z, w, d } of map.pools) {
    const patch = piece(world, tilePlane, water, x, floorY + 0.009, z, w, 1, d);
    patch.renderOrder = 1;
  }
  return clock;
}

function installMachinery(world, map) {
  const group = new THREE.Group();
  const steel = material(0x9fb2c7, 0.34, 0.45);
  const redAwning = material(0xe34039, 0.45, 0.08);
  const warmWood = material(0x8a5730, 0.65, 0.06);
  const neonCyan = emissive(0x63e6ff);
  const neonAmber = emissive(0xffb84d);
  const neonRed = emissive(0xff4c5e);
  const neonJade = emissive(0x38f2af);

  for (const { x, z, w, d, kind } of map.blocks) {
    const detail = new THREE.Group();
    detail.position.set(x, 0, z);
    group.add(detail);
    piece(detail, round, ink, 0, 0.04, 0, Math.min(w, d) * 0.55, 0.08, Math.min(w, d) * 0.55);

    if (kind === 'fridge' || kind === 'pump') {
      // Späti-Getränkekühlschrank
      piece(detail, solid, steel, 0, 0.66, 0, w * 0.84, 1.24, d * 0.78);
      piece(detail, solid, ink, 0, 0.64, d * 0.39, w * 0.68, 0.92, 0.06);
      piece(detail, solid, neonCyan, 0, 0.86, d * 0.42, w * 0.58, 0.14, 0.04);
      piece(detail, solid, neonAmber, 0, 0.58, d * 0.42, w * 0.58, 0.14, 0.04);
      piece(detail, solid, neonRed, 0, 0.32, d * 0.42, w * 0.58, 0.14, 0.04);
      piece(detail, solid, redAwning, 0, 1.34, 0, w * 0.88, 0.14, d * 0.82);
      piece(detail, solid, neonAmber, 0, 1.34, d * 0.42, w * 0.52, 0.07, 0.04);
    } else if (kind === 'fryer' || kind === 'turbine') {
      // Edelstahl-Fritteuse & Grillstation
      piece(detail, solid, steel, 0, 0.46, 0, w * 0.9, 0.84, d * 0.84);
      piece(detail, solid, brass, 0, 0.9, 0, w * 0.94, 0.06, d * 0.88);
      piece(detail, solid, neonAmber, -0.2, 0.94, 0, w * 0.36, 0.05, d * 0.56);
      piece(detail, solid, neonRed, 0.24, 0.94, 0, w * 0.34, 0.05, d * 0.56);
      piece(detail, solid, ink, -0.2, 1.06, 0.28, 0.07, 0.22, 0.07);
      piece(detail, solid, brass, -0.2, 1.14, 0.38, 0.09, 0.06, 0.24);
    } else if (kind === 'table' || kind === 'coil') {
      // Imbiss-Stehtisch mit Soßenflaschen
      piece(detail, round, ink, 0, 0.46, 0, 0.14, 0.84, 0.14);
      piece(detail, round, warmWood, 0, 0.9, 0, w * 0.48, 0.09, d * 0.48);
      band(detail, brass, 0, 0.9, 0, w * 0.49);
      // Ketchup & Mayo Flaschen
      piece(detail, tapered, redAwning, -0.18, 1.06, 0.08, 0.07, 0.24, 0.07);
      piece(detail, tapered, ivoryMat, 0.16, 1.06, -0.06, 0.07, 0.24, 0.07);
      piece(detail, solid, neonAmber, 0, 1.0, 0.14, 0.18, 0.08, 0.12);
    } else {
      // Gestapelte Spezi- & Getränkekisten
      piece(detail, solid, redAwning, 0, 0.26, 0, w * 0.86, 0.44, d * 0.82);
      piece(detail, solid, brass, 0, 0.49, 0, w * 0.9, 0.05, d * 0.86);
      piece(detail, solid, jadeMat, 0.05, 0.74, -0.04, w * 0.74, 0.42, d * 0.72);
      piece(detail, solid, neonAmber, 0.05, 0.98, -0.04, w * 0.54, 0.07, d * 0.54);
    }
  }

  // Späti- & Döner-Bude (Nord-Zentrum)
  const vend = new THREE.Group();
  vend.position.set(map.vending.x, 0, map.vending.z);
  piece(vend, solid, steel, 0, 0.62, 0, 1.56, 1.16, 0.92);
  piece(vend, solid, warmWood, 0, 0.34, 0.47, 1.52, 0.58, 0.08);
  piece(vend, solid, brass, 0, 0.66, 0.52, 1.62, 0.08, 0.22);
  piece(vend, solid, neonJade, 0, 0.92, 0.44, 1.24, 0.38, 0.06);
  // Mini-Döner-Spieß in der Vitrine
  piece(vend, tapered, copper, -0.28, 0.92, 0.48, 0.12, 0.34, 0.12);
  piece(vend, solid, neonAmber, 0.28, 0.92, 0.48, 0.28, 0.28, 0.06);
  // Gestreifte Markise (Rot / Elfenbein)
  for (let i = -2; i <= 2; i++) {
    const stripe = piece(vend, solid, i % 2 === 0 ? redAwning : ivoryMat, i * 0.34, 1.32, 0.34, 0.33, 0.1, 0.82);
    stripe.rotation.x = 0.28;
  }
  // Leuchtendes Neon-Dachschild
  piece(vend, solid, ink, 0, 1.58, 0.08, 1.36, 0.28, 0.16);
  piece(vend, solid, neonAmber, 0, 1.58, 0.18, 1.18, 0.16, 0.04);
  piece(vend, octa, neonRed, 0, 1.84, 0.1, 0.13, 0.18, 0.13);
  group.add(vend);

  batchScenery(world, group);
}

function fixtureLights(world, map) {
  const torches = [];
  for (const [i, { x, z, color: tint, strength }] of map.fixtures.entries()) {
    const shape = new THREE.Group();
    piece(shape, tapered, enamel, x, 0.38, z, 0.18, 0.72, 0.18);
    piece(shape, round, brass, x, 0.74, z, 0.21, 0.08, 0.21);
    const orbFlame = piece(shape, orb, emissive(tint), x, 0.89, z, 0.17, 0.21, 0.17);
    piece(shape, tapered, brass, x, 1.03, z, 0.22, 0.08, 0.22);
    world.add(shape);
    torches.push({ x, z, color: tint, flame: orbFlame, base: strength * 0.42, seed: i * 1.93 });
  }
  return torches;
}

function diffuseAir(world, map) {
  const rng = randomFrom(128 + map.floor * 31);
  const points = new Float32Array(210 * 3);
  for (let index = 0; index < points.length; index += 3) {
    points[index] = rng() * map.width;
    points[index + 1] = 0.28 + rng() * 2.4;
    points[index + 2] = rng() * map.depth;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(points, 3));
  const motes = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.065, color: map.biome.accent, transparent: true, opacity: 0.56, depthWrite: false,
  }));
  world.add(motes);
  return motes;
}

function createFlashlightConeMesh(scene) {
  const geo = new THREE.PlaneGeometry(11.0, 9.6);
  geo.translate(5.5, 0, 0);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec2 vLocal;
      void main() {
        vLocal = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vLocal;
      void main() {
        float x = vLocal.x;
        float y = (vLocal.y - 0.5) * 2.0;
        float r = length(vec2(x, y * 0.88));
        float angleRatio = abs(y) / max(0.05, x * 0.85);
        float inSector = 1.0 - smoothstep(0.55, 0.92, angleRatio);
        float radialFade = (1.0 - smoothstep(0.18, 0.88, r)) * smoothstep(0.01, 0.07, x);
        float intensity = floor(inSector * radialFade * 5.0) / 5.0;
        gl_FragColor = vec4(vec3(1.0, 0.88, 0.52), intensity * 0.14);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = floorY + 0.018;
  mesh.renderOrder = 1;
  scene.add(mesh);
  return mesh;
}

function createChargeLaneMesh(scene) {
  const geo = new THREE.PlaneGeometry(6.8, 1.18);
  geo.translate(3.4, 0, 0);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uRush: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uRush;
      varying vec2 vUv;
      void main() {
        float edge = smoothstep(0.42, 0.5, abs(vUv.y - 0.5));
        float scroll = fract(vUv.x * 5.0 - uTime * 3.8);
        float chevron = step(0.55, scroll);
        float alpha = (0.28 + chevron * 0.35 + edge * 0.3 + uRush * 0.25) * (1.0 - smoothstep(0.82, 1.0, vUv.x));
        vec3 col = mix(vec3(1.0, 0.22, 0.32), vec3(1.0, 0.82, 0.3), edge + uRush * 0.4);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = floorY + 0.028;
  mesh.visible = false;
  mesh.renderOrder = 2;
  scene.add(mesh);
  return mesh;
}

function createCrownBeaconMesh(scene) {
  const geo = new THREE.CylinderGeometry(0.14, 0.34, 2.8, 12, 1, true);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      void main() {
        float fade = pow(max(0.0, 1.0 - vUv.y), 1.75);
        gl_FragColor = vec4(1.0, 0.88, 0.5, fade * 0.42);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 1.4;
  mesh.visible = false;
  mesh.renderOrder = 3;
  scene.add(mesh);
  return mesh;
}

function createSlashArcMesh(scene) {
  const geo = new THREE.RingGeometry(0.65, 1.15, 22, 1, -Math.PI * 0.62, Math.PI * 1.24).rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffe082,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.52;
  mesh.visible = false;
  mesh.renderOrder = 3;
  scene.add(mesh);
  return mesh;
}

class ParticlePool {
  constructor(scene, capacity = 180) {
    this.capacity = capacity;
    this.mesh = new THREE.InstancedMesh(solid, new THREE.MeshBasicMaterial(), capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
    this.dummy = new THREE.Object3D();
    this.items = Array.from({ length: capacity }, () => ({
      active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1, size: 0.1, gravity: 9.5, color: color(PALETTE.brass),
    }));
    const blank = color(0xffffff);
    for (let i = 0; i < capacity; i++) {
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, blank);
    }
    this.cursor = 0;
    scene.add(this.mesh);
  }

  emit(x, y, z, vx, vy, vz, hex, size = 0.1, life = 0.45, gravity = 8.5) {
    const p = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.capacity;
    p.active = true;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.life = life;
    p.maxLife = life;
    p.size = size;
    p.gravity = gravity;
    p.color.setHex(hex);
  }

  burst(x, y, z, count, hex, speed = 3.8, size = 0.11, life = 0.42, gravity = 9.0) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + Math.random() * 0.5;
      const spd = speed * (0.45 + Math.random() * 0.75);
      this.emit(x, y, z, Math.cos(a) * spd, 1.4 + Math.random() * speed * 0.65, Math.sin(a) * spd, hex, size * (0.75 + Math.random() * 0.5), life, gravity);
    }
  }

  step(dt) {
    const safeDt = Math.min(0.05, Math.max(0, dt));
    for (let i = 0; i < this.capacity; i++) {
      const p = this.items[i];
      if (!p.active) {
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }
      p.life -= safeDt;
      if (p.life <= 0) {
        p.active = false;
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }
      p.vy -= p.gravity * safeDt;
      p.x += p.vx * safeDt;
      p.y += p.vy * safeDt;
      p.z += p.vz * safeDt;
      if (p.y < 0.04) {
        p.y = 0.04;
        p.vy = Math.abs(p.vy) * 0.35;
        p.vx *= 0.72;
        p.vz *= 0.72;
      }
      const scale = p.size * Math.min(1, (p.life / p.maxLife) * 1.4);
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.rotation.set(p.life * 8, p.life * 6, 0);
      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, p.color);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

function createPixelPostPass() {
  const postScene = new THREE.Scene();
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    tDiffuse: { value: null },
    tDepth: { value: null },
    uResolution: { value: new THREE.Vector2(480, 300) },
    uPlayerUv: { value: new THREE.Vector2(0.5, 0.5) },
    uAimDirUv: { value: new THREE.Vector2(0.0, 1.0) },
    uAspect: { value: 1.6 },
    uTime: { value: 0.0 },
    uDanger: { value: 0.0 },
    uHitFlash: { value: 0.0 },
    uLampOn: { value: 1.0 },
    uWideBeam: { value: 0.0 },
    uTitleMode: { value: 0.0 },
    uNightTint: { value: new THREE.Vector3(0.89, 0.88, 1.05) },
    uChaosTint: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
    uChaosPulse: { value: 0.0 },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    depthWrite: false,
    depthTest: false,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform sampler2D tDepth;
      uniform vec2 uResolution;
      uniform vec2 uPlayerUv;
      uniform vec2 uAimDirUv;
      uniform float uAspect;
      uniform float uTime;
      uniform float uDanger;
      uniform float uHitFlash;
      uniform float uLampOn;
      uniform float uWideBeam;
      uniform float uTitleMode;
      uniform vec3 uNightTint;
      uniform vec3 uChaosTint;
      uniform float uChaosPulse;
      varying vec2 vUv;

      float bayer2x2(vec2 pixel) {
        vec2 p = mod(floor(pixel), 2.0);
        return (p.x + p.y * 2.0) * 0.25 - 0.375;
      }

      void main() {
        vec2 texel = 1.0 / uResolution;
        vec2 chroma = vec2(texel.x * (uHitFlash * 3.5), 0.0);
        float rC = texture2D(tDiffuse, vUv + chroma).r;
        float gC = texture2D(tDiffuse, vUv).g;
        float bC = texture2D(tDiffuse, vUv - chroma).b;
        vec3 col = vec3(rC, gC, bC);
        float depth = texture2D(tDepth, vUv).r;

        float dL = texture2D(tDepth, vUv - vec2(texel.x, 0.0)).r;
        float dR = texture2D(tDepth, vUv + vec2(texel.x, 0.0)).r;
        float dU = texture2D(tDepth, vUv + vec2(0.0, texel.y)).r;
        float dD = texture2D(tDepth, vUv - vec2(0.0, texel.y)).r;
        float depthEdge = max(max(abs(depth - dL), abs(depth - dR)), max(abs(depth - dU), abs(depth - dD)));

        vec3 cL = texture2D(tDiffuse, vUv - vec2(texel.x, 0.0)).rgb;
        vec3 cU = texture2D(tDiffuse, vUv + vec2(0.0, texel.y)).rgb;
        float colorEdge = length(col - cL) + length(col - cU);
        float isOutline = clamp(step(0.0018, depthEdge) + step(0.38, colorEdge) * 0.45, 0.0, 1.0);

        vec2 delta = (vUv - uPlayerUv) * vec2(uAspect, 1.0);
        float dist = length(delta);
        vec2 dir = dist > 0.0001 ? delta / dist : uAimDirUv;
        float cosA = dot(dir, normalize(uAimDirUv));

        float coneOuter = smoothstep(0.56 - uWideBeam * 0.14, 0.87 - uWideBeam * 0.08, cosA);
        float coneCore = smoothstep(0.84 - uWideBeam * 0.08, 0.98, cosA);
        float coneReach = (1.0 - smoothstep(0.28, 0.84 + uWideBeam * 0.16, dist)) * smoothstep(0.01, 0.06, dist);
        float coneLight = (coneOuter * 0.95 + coneCore * 0.45) * coneReach * uLampOn;

        float auraRadius = uLampOn > 0.5 ? 0.28 : 0.22;
        float personalAura = (1.0 - smoothstep(0.04, auraRadius, dist)) * (uLampOn > 0.5 ? 0.88 : 0.65);

        float titleLight = uTitleMode * (1.0 - smoothstep(0.32, 1.08, length((vUv - vec2(0.52, 0.50)) * vec2(uAspect, 1.0)))) * 1.15;

        float rawLight = max(max(coneLight, personalAura), titleLight);
        float dither = bayer2x2(vUv * uResolution) * 0.065;
        float lit = rawLight + dither;

        float celBand;
        if (lit > 0.80) celBand = 1.38;
        else if (lit > 0.45) celBand = 1.18;
        else if (lit > 0.16) celBand = 1.0;
        else celBand = 0.86;

        vec3 warmBeamTint = vec3(1.14, 1.03, 0.88);
        vec3 lightTint = mix(uNightTint, warmBeamTint, clamp(rawLight * 1.25, 0.0, 1.0));

        vec3 quantAlbedo = floor(col * 14.0 + 0.5) / 14.0;
        vec3 shaded = quantAlbedo * celBand * lightTint;

        float beamGlow = coneOuter * coneReach * uLampOn * 0.15;
        shaded += vec3(1.0, 0.88, 0.54) * beamGlow;

        float maxC = max(col.r, max(col.g, col.b));
        float minC = min(col.r, min(col.g, col.b));
        float isNeon = smoothstep(0.58, 0.86, maxC) * smoothstep(0.18, 0.40, maxC - minC);
        shaded = max(shaded, col * isNeon * 1.25);

        vec3 outlineColor = vec3(0.03, 0.03, 0.08);
        vec3 finalCol = mix(shaded, outlineColor, isOutline * clamp(celBand * 0.72 + isNeon, 0.32, 0.84));

        float vigDist = length(vUv - 0.5) * 1.42;
        float pulse = (0.5 + 0.5 * sin(uTime * 8.0)) * uDanger;
        finalCol += vec3(0.55, 0.05, 0.12) * smoothstep(0.52, 1.05, vigDist) * pulse * 0.42;
        finalCol += uChaosTint * (smoothstep(0.45, 1.08, vigDist) * 0.46 + 0.07) * uChaosPulse;
        finalCol += vec3(0.6, 0.18, 0.14) * uHitFlash * 0.35;

        gl_FragColor = vec4(finalCol, 1.0);
      }
    `,
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  postScene.add(quad);
  return { postScene, postCam, uniforms };
}

export class SceneView {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping;

    this.scene = new THREE.Scene();
    this.scene.background = color(PALETTE.ink);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.25, 48);
    this.follow = new THREE.Vector3(18.5, 0, 16.5);
    this.ray = new THREE.Raycaster();
    this.ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.hit = new THREE.Vector3();
    this.pointer = new THREE.Vector2();
    this.projTempA = new THREE.Vector3();
    this.projTempB = new THREE.Vector3();

    this.ambient = new THREE.HemisphereLight(0xffe8cc, 0x383a5c, 1.58);
    this.scene.add(this.ambient);
    this.keyLight = new THREE.DirectionalLight(0xfff2dc, 1.22);
    this.keyLight.position.set(14, 22, 14);
    this.scene.add(this.keyLight);

    this.texture = surfaceTexture();
    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);
    this.loadedMap = null;
    this.torches = [];
    this.torchLights = Array.from({ length: 8 }, () => {
      const light = new THREE.PointLight(0xffe082, 0, 6.4, 1.8);
      this.scene.add(light);
      return light;
    });
    this.crates = Array.from({ length: 10 }, () => {
      const m = crateMesh(false);
      m.visible = false;
      this.scene.add(m);
      return m;
    });
    this.goldCrates = Array.from({ length: 4 }, () => {
      const m = crateMesh(true);
      m.visible = false;
      this.scene.add(m);
      return m;
    });
    this.barrels = Array.from({ length: 14 }, () => {
      const m = barrelMesh();
      m.root.visible = false;
      this.scene.add(m.root);
      return m;
    });
    this.air = null;
    this.water = null;
    this.viewRect = { left: 0, top: 0, width: 1, height: 1 };

    this.actor = diver();
    this.antonPool = Array.from({ length: 28 }, () => dredged());
    this.monster = this.antonPool[0];
    this.hauke = haukeBoss();
    this.tomPool = Array.from({ length: 6 }, () => greedyTom());
    this.tom = this.tomPool[0];
    this.scene.add(
      this.actor.root,
      this.hauke.root,
      ...this.tomPool.map((m) => m.root),
      ...this.antonPool.map((m) => m.root),
    );

    this.droppedCrown = crownMesh(1.35);
    this.droppedCrown.visible = false;
    this.scene.add(this.droppedCrown);
    this.droppedCrownRing = placeRing(this.scene, PALETTE.brass, 0, 0, 0.72);
    this.droppedCrownRing.visible = false;
    this.crownBeacon = createCrownBeaconMesh(this.scene);

    this.vendingRing = placeRing(this.scene, PALETTE.jade, 14, 2.6, 1.48);
    this.vendingRing.visible = false;

    this.haukeSnacks = Array.from({ length: 4 }, (_, i) => {
      const s = haukeSnack(i);
      s.visible = false;
      this.scene.add(s);
      return s;
    });
    this.haukeRing = placeRing(this.scene, PALETTE.copper, 0, 0, 2.05);
    this.chargeLane = createChargeLaneMesh(this.scene);
    this.novaRing = placeRing(this.scene, PALETTE.brass, 0, 0, 1);
    this.novaRing.visible = false;
    this.knobiRing = placeRing(this.scene, PALETTE.jade, 0, 0, 1);
    this.knobiRing.visible = false;
    this.stolenCrown = crownMesh(1.1);
    this.stolenCrown.visible = false;
    this.scene.add(this.stolenCrown);
    this.slashArc = createSlashArcMesh(this.scene);
    this.particles = new ParticlePool(this.scene, 240);

    // Auto-Waffen Pools
    this.donerOrbiters = Array.from({ length: 6 }, () => {
      const d = doenerModel();
      d.visible = false;
      this.scene.add(d);
      return d;
    });
    this.skewerShots = Array.from({ length: 36 }, () => {
      const s = skewerModel();
      s.rotation.x = Math.PI / 2;
      s.scale.setScalar(0.85);
      s.visible = false;
      this.scene.add(s);
      return s;
    });
    this.speziBombs = Array.from({ length: 14 }, () => {
      const s = speziModel();
      s.visible = false;
      this.scene.add(s);
      return s;
    });
    this.explosionRings = Array.from({ length: 14 }, () => {
      const r = placeRing(this.scene, 0xff8c24, 0, 0, 1);
      r.visible = false;
      return r;
    });

    // Instanced XP Gems Pool (140) + Spezial-Pickups (Heal-Döner, Paulaner Spezis, Cyan-Magnet, Mega-Enten, Gold-Truhen)
    this.xpDummy = new THREE.Object3D();
    this.xpGemsMesh = new THREE.InstancedMesh(octa, new THREE.MeshBasicMaterial(), 140);
    this.xpGemsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.xpGemsMesh.frustumCulled = false;
    this.xpGemsMesh.renderOrder = 3;
    const whiteCol = color(0xffffff);
    for (let i = 0; i < 140; i++) {
      this.xpDummy.scale.setScalar(0);
      this.xpDummy.updateMatrix();
      this.xpGemsMesh.setMatrixAt(i, this.xpDummy.matrix);
      this.xpGemsMesh.setColorAt(i, whiteCol);
    }
    this.scene.add(this.xpGemsMesh);

    this.healPickups = Array.from({ length: 10 }, () => {
      const m = doenerModel();
      m.scale.setScalar(0.85);
      m.visible = false;
      this.scene.add(m);
      return m;
    });
    this.dosePickups = Array.from({ length: 10 }, () => {
      const m = speziModel();
      m.scale.setScalar(1.1);
      m.visible = false;
      this.scene.add(m);
      return m;
    });
    this.magnetPickups = Array.from({ length: 8 }, () => {
      const m = magnetPickupModel(this.scene);
      m.scale.setScalar(1.05);
      m.visible = false;
      return m;
    });
    this.duckPickups = Array.from({ length: 6 }, () => {
      const m = megaDuckModel(this.scene);
      m.scale.setScalar(1.35);
      m.visible = false;
      return m;
    });
    this.chestPickups = Array.from({ length: 6 }, () => {
      const m = crateMesh(true);
      m.scale.setScalar(0.85);
      m.visible = false;
      this.scene.add(m);
      return m;
    });

    this.lamp = new THREE.SpotLight(0xffe29e, 74, 15.5, 0.68, 0.45, 1.2);
    this.lamp.castShadow = true;
    this.lamp.shadow.mapSize.set(512, 512);
    this.lamp.shadow.camera.near = 0.3;
    this.lamp.shadow.camera.far = 15;
    this.scene.add(this.lamp, this.lamp.target);

    this.beamCone = createFlashlightConeMesh(this.scene);
    this.island = new THREE.PointLight(0x8aa8ff, 3.2, 4.4, 1.6);
    this.scene.add(this.island);

    this.ripples = Array.from({ length: 14 }, () => placeRing(this.scene, PALETTE.brass, 0, 0, 1));
    this.clappers = Array.from({ length: 16 }, () => {
      const m = rubberDuck(this.scene);
      m.visible = false;
      return m;
    });

    this.pixelTarget = new THREE.WebGLRenderTarget(480, 300, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true,
    });
    this.pixelTarget.texture.generateMipmaps = false;
    this.pixelTarget.depthTexture = new THREE.DepthTexture(480, 300);
    this.pixelTarget.depthTexture.format = THREE.DepthFormat;
    this.pixelTarget.depthTexture.type = THREE.UnsignedIntType;
    this.pixelTarget.depthTexture.minFilter = THREE.NearestFilter;
    this.pixelTarget.depthTexture.magFilter = THREE.NearestFilter;

    this.post = createPixelPostPass();
    this.post.uniforms.tDiffuse.value = this.pixelTarget.texture;
    this.post.uniforms.tDepth.value = this.pixelTarget.depthTexture;

    this.resize();
  }

  disposeWorld() {
    const disposedGeos = new Set();
    const disposedMats = new Set();
    this.worldGroup.traverse((obj) => {
      if (obj.geometry && !SHARED_GEOS.has(obj.geometry) && !disposedGeos.has(obj.geometry)) {
        disposedGeos.add(obj.geometry);
        obj.geometry.dispose();
      }
      const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
      for (const mat of mats) {
        if (mat && !SHARED_MATERIALS.has(mat) && !disposedMats.has(mat)) {
          disposedMats.add(mat);
          mat.dispose();
        }
      }
    });
    this.worldGroup.clear();
  }

  ensureMap(map) {
    if (!map || this.loadedMap === map) return;
    this.loadedMap = map;
    this.disposeWorld();
    this.scene.background = color(map.biome.fogHex);
    this.ambient.color.setHex(map.biome.ambientSky ?? 0xffe8cc);
    this.ambient.groundColor.setHex(map.biome.ambientGround ?? 0x383a5c);
    this.keyLight.color.setHex(map.biome.ambientSky ?? 0xfff2dc);
    const [nr, ng, nb] = map.biome.nightTint ?? [0.89, 0.88, 1.05];
    this.post.uniforms.uNightTint.value.set(nr, ng, nb);

    installFloor(this.worldGroup, map, this.texture);
    this.water = installWater(this.worldGroup, map);
    installMachinery(this.worldGroup, map);
    this.torches = fixtureLights(this.worldGroup, map);
    this.air = diffuseAir(this.worldGroup, map);
  }

  resize() {
    const canvas = this.renderer.domElement;
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(Math.round(bounds.width) || canvas.clientWidth || window.innerWidth, 1);
    const height = Math.max(Math.round(bounds.height) || canvas.clientHeight || window.innerHeight, 1);
    this.viewRect = {
      left: bounds.left || 0,
      top: bounds.top || 0,
      width,
      height,
    };
    const aspect = width / height;
    this.camera.aspect = aspect;
    const portraitBoost = aspect < 0.95 ? Math.min(11, (0.95 - aspect) * 20) : 0;
    this.camera.fov = 44 + portraitBoost;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);

    const scale = Math.min(PIXEL_SCALE, Math.max(1.25, Math.min(width, height) / 185));
    const pw = Math.max(160, Math.round(width / scale));
    const ph = Math.max(160, Math.round(height / scale));
    this.pixelTarget.setSize(pw, ph);
    this.post.uniforms.uResolution.value.set(pw, ph);
    this.post.uniforms.uAspect.value = aspect;
  }

  projectPoint(x, y, z) {
    this.projTempA.set(x, y, z).project(this.camera);
    if (this.projTempA.z > 1) return null;
    const bounds = this.viewRect;
    return {
      x: (this.projTempA.x * 0.5 + 0.5) * bounds.width + bounds.left,
      y: (-this.projTempA.y * 0.5 + 0.5) * bounds.height + bounds.top,
    };
  }

  aimAt(screenPoint, player) {
    const bounds = this.viewRect;
    this.pointer.set(
      2 * (screenPoint.x - bounds.left) / bounds.width - 1,
      1 - 2 * (screenPoint.y - bounds.top) / bounds.height,
    );
    this.ray.setFromCamera(this.pointer, this.camera);
    if (!this.ray.ray.intersectPlane(this.ground, this.hit)) return undefined;
    if (Math.hypot(this.hit.x - player.x, this.hit.z - player.z) < 0.22) return undefined;
    return Math.atan2(this.hit.z - player.z, this.hit.x - player.x);
  }

  setCamera(run, dt, snap) {
    const { player, cameraShake, time } = run;
    const lead = 0.45;
    const tx = player.x + Math.cos(player.angle) * lead;
    const tz = player.z + Math.sin(player.angle) * lead;
    const near = this.follow;
    const easing = snap ? 1 : 1 - Math.exp(-7.5 * dt);
    near.x += (tx - near.x) * easing;
    near.z += (tz - near.z) * easing;
    const aspect = this.camera.aspect;
    const mobileLift = Math.max(0, 1.33 - aspect) * 4.8;
    const portraitOffset = aspect < 0.9 ? (0.9 - aspect) * 1.55 : 0;
    const shakeX = cameraShake > 0 ? Math.sin(time * 58) * cameraShake * 0.36 : 0;
    const shakeZ = cameraShake > 0 ? Math.cos(time * 51) * cameraShake * 0.36 : 0;
    this.camera.position.set(
      near.x + 0.72 + shakeX,
      11.85 + mobileLift,
      near.z + 8.85 + mobileLift * 0.54 + portraitOffset + shakeZ,
    );
    this.camera.lookAt(near.x + shakeX * 0.5, 0, near.z - 0.85 + portraitOffset + shakeZ * 0.5);
    this.camera.updateMatrixWorld();
  }

  updateHero(run, time) {
    const { player } = run;
    const { root, body, legs, bulb, wrench, helmet, jacketMat } = this.actor;
    const loadout = LOADOUTS[run.loadoutId] ?? LOADOUTS.classic;
    if (jacketMat) jacketMat.color.setHex(loadout.jacketHex ?? 0xd9383a);

    root.position.set(player.x, 0.012, player.z);
    root.rotation.y = Math.PI / 2 - player.angle;
    const gait = player.moving ? Math.sin(player.stride * 7.2) * 0.62 : 0;
    legs[0].rotation.x = gait;
    legs[1].rotation.x = -gait;
    body.position.y = (player.moving ? Math.abs(gait) * 0.07 : 0) + Math.sin(time * 3.1) * 0.009;
    body.rotation.x = player.sliding > 0 ? 1.1 : player.dash > 0 ? 0.38 : 0;
    root.visible = player.invuln > 0 ? Math.floor(time * 18) % 2 === 0 : true;
    if (helmet) helmet.visible = player.helmet !== false;

    const swingTotal = (player.finisherSwing || 0) > 0 ? 0.42 : 0.32;
    if (wrench) {
      wrench.rotation.x = player.swing > 0 ? Math.sin((player.swing / swingTotal) * Math.PI) * 1.65 : 0;
      wrench.rotation.z = player.swing > 0 ? -0.45 : 0;
    }

    const isFinisher = (player.finisherSwing || 0) > 0;
    const hasEvoPan = player.evolutions?.has('evo_pan');
    const hasEvoKnobi = player.evolutions?.has('evo_knobi');
    const fever = (player.combo || 1) >= 6;
    if (this.novaRing) {
      this.novaRing.visible = player.swing > 0;
      if (player.swing > 0) {
        const progress = 1 - Math.min(1, player.swing / swingTotal);
        const targetRadius = player.novaRadius || 2.45;
        const radius = 0.45 + progress * targetRadius;
        this.novaRing.position.set(player.x, floorY + 0.03, player.z);
        this.novaRing.scale.set(radius, 1, radius);
        this.novaRing.material.color.setHex(hasEvoPan ? 0xff4c29 : isFinisher ? 0xffe082 : (player.weapons?.pan || 0) >= 4 ? 0xff5744 : PALETTE.brass);
        this.novaRing.material.opacity = (1 - progress) * (isFinisher || hasEvoPan ? 1.0 : 0.9);
      }
    }

    if (this.knobiRing) {
      const kp = player.knobiPulse || 0;
      const knobiLv = player.weapons?.knobi || 0;
      this.knobiRing.visible = kp > 0 || knobiLv > 0;
      if (this.knobiRing.visible) {
        const kr = player.knobiRadius || ((2.15 + knobiLv * 0.28) * (loadout.areaMult ?? 1) * (hasEvoKnobi ? 1.42 : 1));
        const pulseScale = kp > 0 ? kr * (1.0 - kp * 0.55) : kr * (0.86 + Math.sin(time * 4.5) * 0.04);
        this.knobiRing.position.set(player.x, floorY + 0.022, player.z);
        this.knobiRing.scale.set(pulseScale, 1, pulseScale);
        this.knobiRing.material.color.setHex(hasEvoKnobi ? 0x6dffcc : PALETTE.jade);
        this.knobiRing.material.opacity = kp > 0 ? Math.min(0.92, kp * 2.4) : hasEvoKnobi ? 0.36 : 0.22;
      }
    }

    if (this.slashArc) {
      this.slashArc.visible = player.swing > 0;
      if (player.swing > 0) {
        const progress = 1 - Math.min(1, player.swing / swingTotal);
        const targetRadius = player.novaRadius || 2.45;
        const radiusScale = (targetRadius * 0.88) * (0.65 + progress * 0.45);
        this.slashArc.position.set(player.x, 0.56, player.z);
        this.slashArc.rotation.y = -player.angle + (progress - 0.5) * (isFinisher || hasEvoPan ? 5.2 : 2.3);
        this.slashArc.scale.setScalar(radiusScale);
        this.slashArc.material.color.setHex(hasEvoPan ? 0xff6238 : isFinisher ? 0xfff3b0 : 0xffe082);
        this.slashArc.material.opacity = (1 - progress) * 0.95;
      }
    }

    // Döner-Orbit Klingen um Chef Torge (exakt synchron zum Hitbox-Radius inkl. Klassen-Radius!)
    const donerLv = player.weapons?.doner || 0;
    const hasEvoDoner = player.evolutions?.has('evo_doner');
    const donerCount = donerLv > 0 ? (hasEvoDoner ? 6 : 1 + donerLv) : 0;
    const donerRadius = player.donerRadius
      || ((2.05 + donerLv * 0.14) * (loadout.areaMult ?? 1) * (1 + (player.passives?.chili || 0) * 0.12) * (hasEvoDoner ? 1.28 : 1));
    for (let i = 0; i < this.donerOrbiters.length; i++) {
      const orb = this.donerOrbiters[i];
      orb.visible = i < donerCount;
      if (!orb.visible) continue;
      const a = (player.donerAngle || time * 3) + (i * TAU) / donerCount;
      orb.position.set(player.x + Math.cos(a) * donerRadius, 0.45 + Math.sin(time * 5 + i) * 0.06, player.z + Math.sin(a) * donerRadius);
      orb.rotation.y = -a + time * (hasEvoDoner ? 9.5 : 6.5);
      orb.scale.setScalar(hasEvoDoner ? 1.18 : 0.95);
    }

    if (player.dash > 0 || player.sliding > 0 || (fever && Math.random() < 0.22)) {
      if (player.dash > 0 || player.sliding > 0 ? Math.random() < 0.7 : true) {
        const slipColor = run.map?.biome?.foamHex ?? PALETTE.glacier;
        this.particles.emit(
          player.x + (Math.random() - 0.5) * 0.3,
          0.24,
          player.z + (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.8,
          0.8,
          (Math.random() - 0.5) * 0.8,
          player.sliding > 0 ? slipColor : fever && player.dash <= 0 ? PALETTE.brass : PALETTE.ivory,
          0.11,
          0.26,
          2.0,
        );
      }
    }

    const evoBeam = player.evolutions?.has('evo_beam');
    bulb.material.color.setHex(player.lamp ? (evoBeam ? 0x63e6ff : 0xffe082) : 0x242838);
    const aimX = Math.cos(player.angle);
    const aimZ = Math.sin(player.angle);
    this.lamp.position.set(player.x + aimX * 0.25, 2.4, player.z + aimZ * 0.25);
    this.lamp.target.position.set(player.x + aimX * 5.2, 0.0, player.z + aimZ * 5.2);
    this.lamp.angle = evoBeam ? 0.84 : 0.68;
    this.lamp.visible = player.lamp;

    this.beamCone.visible = player.lamp;
    this.beamCone.position.set(player.x, floorY + 0.018, player.z);
    this.beamCone.rotation.y = -player.angle;
    const beamScale = evoBeam ? 1.24 : 1;
    this.beamCone.scale.set(beamScale, 1, evoBeam ? 1.34 : 1);

    this.island.position.set(player.x, 1.35, player.z);
    this.island.intensity = player.lamp ? (evoBeam ? 4.8 : 3.8) : 2.5;
  }

  updateActor(model, agent, player, time, alwaysShow) {
    if (!agent || agent.dead) {
      model.root.visible = false;
      return;
    }
    const { root, core, arms, legs, mask, stars, eyes, belly, lostMark } = model;
    const gap = Math.hypot(agent.x - player.x, agent.z - player.z);
    const visible = alwaysShow || gap < 22;

    root.visible = visible;
    if (!visible) return;

    const comaBreath = (agent.coma || 0) > 0 ? Math.sin(time * 4.5) * 0.06 : 0;
    const scale = agent.elite
      ? 1.28
      : agent.type === 'hauke'
        ? 1.18 + (agent.stuffed || 0) * 0.1 + comaBreath
        : 1.0;
    root.scale.setScalar(scale);

    if (eyes) {
      eyes.visible = true;
      if (eyes.children[0]?.material) {
        const isAngry = agent.elite || agent.chargeState !== 'none' || agent.enraged;
        eyes.children[0].material.color.setHex(
          agent.hitFlash > 0 ? 0xffffff : isAngry ? 0xff2233 : agent.type === 'tom' ? PALETTE.jade : 0xffaa3b,
        );
      }
    }
    if (belly) {
      const chargingFlash = agent.chargeState === 'windup' && Math.floor(time * 22) % 2 === 0;
      belly.material.emissive?.setHex((agent.hitFlash ?? 0) > 0 ? 0xffffff : chargingFlash ? 0x991122 : 0x000000);
    }
    if (lostMark) {
      lostMark.visible = Boolean(agent.elite || agent.stunned > 0 || (agent.panicked || 0) > 0);
      if (lostMark.visible) {
        lostMark.position.y = 2.38 + Math.sin(time * 4.5) * 0.08;
        lostMark.rotation.y = time * 2.5;
      }
    }

    root.position.set(agent.x, 0.011, agent.z);
    root.rotation.y = Math.PI / 2 - agent.angle;
    const faster = agent.type === 'tom' || agent.chargeState === 'rush' || agent.elite || (agent.panicked || 0) > 0;
    const pace = agent.moving ? Math.sin(time * (faster ? 14.5 : 8.5) + (agent.id || 0)) : 0;

    core.position.y = 0.02 + Math.abs(pace) * 0.08;
    core.rotation.z = (agent.coma || 0) > 0 ? Math.sin(time * 3.2) * 0.28 : 0;
    core.rotation.x = (agent.coma || 0) > 0
      ? 0.55
      : agent.stunned > 0
        ? -0.42
        : agent.chargeState === 'windup'
          ? -0.22
          : agent.chargeState === 'rush'
            ? 0.34
            : 0.16;

    const panicWave = (agent.panicked || 0) > 0 ? Math.sin(time * 22 + (agent.id || 0)) * 0.65 : 0;
    arms[0].rotation.x = pace * 0.52 + panicWave - ((agent.panicked || 0) > 0 ? 2.1 : 0);
    arms[1].rotation.x = -pace * 0.52 - panicWave - ((agent.panicked || 0) > 0 ? 2.1 : 0);
    if (legs) {
      legs[0].rotation.x = -pace * 0.58;
      legs[1].rotation.x = pace * 0.58;
    }
    mask.rotation.z = Math.cos(time * 2.1 + (agent.id || 0)) * 0.1;
    if (stars) {
      stars.visible = (agent.stunned > 0 || (agent.exposed ?? 0) > 0 || (agent.coma ?? 0) > 0);
      stars.rotation.y = time * 6.5;
    }
  }

  updateThreat(run, isTitle = false) {
    const { player, time } = run;
    const antons = run.enemies ? run.enemies.filter((e) => !e.dead && e.type === 'anton') : [];
    const toms = isTitle && run.tom ? [run.tom] : (run.enemies ? run.enemies.filter((e) => !e.dead && e.type === 'tom') : []);
    const hauke = isTitle && run.hauke ? run.hauke : (run.enemies ? run.enemies.find((e) => !e.dead && e.type === 'hauke') : run.hauke);

    for (let i = 0; i < this.antonPool.length; i++) {
      const model = this.antonPool[i];
      const anton = antons[i];
      if (!anton || (isTitle && i > 2)) {
        model.root.visible = false;
        continue;
      }
      this.updateActor(model, anton, player, time, isTitle || run.state === 'caught');
      if (!isTitle && model.root.visible && (anton.burning ?? 0) > 0 && Math.random() < 0.25) {
        this.particles.emit(anton.x, 0.7, anton.z, 0, 1.5, 0, 0xff5744, 0.1, 0.28, 1);
      }
    }

    let crownTom = null;
    for (let i = 0; i < this.tomPool.length; i++) {
      const model = this.tomPool[i];
      const tom = toms[i];
      if (!tom || (isTitle && i > 0)) {
        model.root.visible = false;
        continue;
      }
      this.updateActor(model, tom, player, time, isTitle || run.state === 'caught');
      if (tom.hasCrown && model.root.visible) crownTom = tom;
    }
    if (this.stolenCrown) {
      this.stolenCrown.visible = Boolean(crownTom);
      if (crownTom) {
        this.stolenCrown.position.set(crownTom.x, 1.62 + Math.sin(time * 12) * 0.05, crownTom.z);
        this.stolenCrown.rotation.y = time * 5.2;
      }
    }

    this.updateActor(this.hauke, hauke, player, time, isTitle || run.state === 'caught');

    const showHauke = this.hauke.root.visible && hauke;
    this.haukeRing.visible = Boolean(showHauke);
    if (showHauke) {
      this.haukeRing.position.set(hauke.x, floorY + 0.02, hauke.z);
      const baseScale = hauke.chargeState !== 'none' ? 2.4 : hauke.enraged ? 2.25 : 2.05;
      const pulse = baseScale + Math.sin(time * (hauke.enraged ? 6.5 : 4.5)) * 0.15;
      this.haukeRing.scale.set(pulse, 1, pulse);
      this.haukeRing.material.color.setHex(
        hauke.chargeState !== 'none' || hauke.enraged ? PALETTE.vermilion : PALETTE.copper,
      );
    }

    if (this.chargeLane) {
      const showLane = Boolean(showHauke && hauke.chargeState && hauke.chargeState !== 'none');
      this.chargeLane.visible = showLane;
      if (showLane) {
        this.chargeLane.position.set(hauke.x, floorY + 0.028, hauke.z);
        this.chargeLane.rotation.y = -hauke.angle;
        this.chargeLane.material.uniforms.uTime.value = time;
        this.chargeLane.material.uniforms.uRush.value = hauke.chargeState === 'rush' ? 1.0 : 0.0;
      }
    }

    for (const [i, snack] of this.haukeSnacks.entries()) {
      snack.visible = Boolean(showHauke);
      if (!snack.visible) continue;
      const a = (i * TAU) / this.haukeSnacks.length + time * (hauke.enraged ? 2.8 : 1.9);
      const r = 1.55 + Math.sin(time * 3 + i) * 0.08;
      snack.position.set(hauke.x + Math.cos(a) * r, 0.12 + Math.sin(time * 4 + i) * 0.04, hauke.z + Math.sin(a) * r);
      snack.rotation.y = -a;
    }
  }

  consumeVfx(run) {
    if (!run.vfx || run.vfx.length === 0) return;
    const slipColor = run.map?.biome?.foamHex ?? PALETTE.glacier;
    for (const fx of run.vfx) {
      if (fx.kind === 'bonk_swing') {
        this.particles.burst(fx.x, 0.65, fx.z, 10, PALETTE.brass, 4.4, 0.09, 0.28, 3.0);
      } else if (fx.kind === 'bonk_hit') {
        this.particles.burst(fx.x, 0.85, fx.z, 14, fx.color ?? PALETTE.brass, 5.2, 0.11, 0.38, 8.5);
      } else if (fx.kind === 'crate_smash') {
        this.particles.burst(fx.x, 0.42, fx.z, 16, 0xa86c3a, 4.6, 0.12, 0.46, 10.5);
        this.particles.burst(fx.x, 0.55, fx.z, 8, PALETTE.brass, 3.6, 0.09, 0.44, 7.5);
      } else if (fx.kind === 'dash') {
        this.particles.burst(fx.x, 0.22, fx.z, 9, PALETTE.glacier, 3.0, 0.11, 0.34, 4.0);
      } else if (fx.kind === 'water_slip') {
        this.particles.burst(fx.x, 0.2, fx.z, 14, slipColor, 4.6, 0.11, 0.45, 10.5);
      } else if (fx.kind === 'coin_burst') {
        this.particles.burst(fx.x, 0.65, fx.z, 18, 0xffe082, 5.2, 0.12, 0.56, 9.5);
      } else if (fx.kind === 'wall_slam' || fx.kind === 'ko_explosion') {
        this.particles.burst(fx.x, 0.7, fx.z, 22, PALETTE.vermilion, 6.2, 0.13, 0.5, 8.5);
        this.particles.burst(fx.x, 0.9, fx.z, 14, PALETTE.brass, 5.0, 0.12, 0.52, 7.0);
      } else if (fx.kind === 'can_pickup') {
        this.particles.burst(fx.x, 0.4, fx.z, 10, fx.color ?? PALETTE.jade, 3.8, 0.1, 0.36, 6.0);
      }
    }
    run.vfx.length = 0;
  }

  updateProps(run, dt, isTitle = false) {
    const px = run.player.x;
    const pz = run.player.z;
    for (const torch of this.torches) {
      const flick = 0.86 + Math.sin(run.time * 13.7 + torch.seed) * 0.1 + Math.cos(run.time * 21.3 + torch.seed) * 0.06;
      torch.intensity = torch.base * flick;
      torch.distSq = (torch.x - px) ** 2 + (torch.z - pz) ** 2;
      torch.flame.scale.setScalar(0.17 * (0.9 + flick * 0.12));
    }
    const nearest = [...this.torches].sort((a, b) => a.distSq - b.distSq);
    for (let i = 0; i < this.torchLights.length; i++) {
      const light = this.torchLights[i];
      const torch = nearest[i];
      if (torch) {
        light.position.set(torch.x, 1.12, torch.z);
        light.color.setHex(torch.color);
        light.intensity = torch.intensity;
      } else {
        light.intensity = 0;
      }
    }

    // Späti-Bude Bereitschafts-Ring (pulsierend Jade wenn bereit, gedimmtes Bernstein im Cooldown)
    const vend = run.map?.vending;
    if (this.vendingRing) {
      this.vendingRing.visible = Boolean(vend);
      if (vend) {
        const ready = (vend.cooldown || 0) <= 0;
        const pulse = ready ? 1.48 + Math.sin(run.time * 4.4) * 0.1 : 1.32;
        this.vendingRing.position.set(vend.x, floorY + 0.024, vend.z + 0.25);
        this.vendingRing.scale.set(pulse, 1, pulse);
        this.vendingRing.material.color.setHex(ready ? PALETTE.jade : PALETTE.copper);
        this.vendingRing.material.opacity = ready ? 0.72 + Math.sin(run.time * 4.4) * 0.16 : 0.28;
      }
    }

    // Dynamic Wooden & Gold Crates
    const woodCrates = (run.crates ?? []).filter((c) => !c.broken && !c.gold);
    const goldCrates = (run.crates ?? []).filter((c) => !c.broken && c.gold);
    for (let i = 0; i < this.crates.length; i++) {
      const mesh = this.crates[i];
      const c = woodCrates[i];
      mesh.visible = Boolean(c);
      if (c) mesh.position.set(c.x, 0, c.z);
    }
    for (let i = 0; i < this.goldCrates.length; i++) {
      const mesh = this.goldCrates[i];
      const c = goldCrates[i];
      mesh.visible = Boolean(c);
      if (c) {
        mesh.position.set(c.x, 0, c.z);
        if (mesh.userData.topGem) {
          mesh.userData.topGem.rotation.y = run.time * 2.6;
          mesh.userData.topGem.position.y = 0.78 + Math.sin(run.time * 4.0) * 0.04;
        }
      }
    }

    // Dynamic Barrels
    const activeBarrels = (run.barrels ?? []).filter((b) => !b.exploded);
    for (let i = 0; i < this.barrels.length; i++) {
      const mesh = this.barrels[i];
      const b = activeBarrels[i];
      mesh.root.visible = Boolean(b);
      if (b) {
        mesh.root.position.set(b.x, 0, b.z);
        const pulse = Math.sin(run.time * 3.5 + i) > 0.7;
        mesh.glowBand.material.color.setHex(pulse ? 0xffffff : 0xffc94d);
        mesh.cap.rotation.y = run.time * 3.0;
      }
    }

    // Dropped Crown
    const drop = run.droppedHelmet;
    this.droppedCrown.visible = Boolean(drop);
    this.droppedCrownRing.visible = Boolean(drop);
    if (this.crownBeacon) this.crownBeacon.visible = Boolean(drop);
    if (drop) {
      this.droppedCrown.position.set(drop.x, 0.18 + Math.sin(run.time * 5.2) * 0.06, drop.z);
      this.droppedCrown.rotation.y = run.time * 2.8;
      this.droppedCrownRing.position.set(drop.x, floorY + 0.025, drop.z);
      const pulse = 0.65 + Math.sin(run.time * 6.5) * 0.12;
      this.droppedCrownRing.scale.set(pulse, 1, pulse);
      if (this.crownBeacon) {
        this.crownBeacon.position.set(drop.x, 1.45, drop.z);
        this.crownBeacon.rotation.y = run.time * 1.4;
      }
    }

    // Pickups: Instanced XP Gems + Spezial-Items (Heal-Döner, Paulaner Spezis, Cyan-Magnet, Mega-Enten, Gold-Truhen)
    const xpList = [];
    const healList = [];
    const doseList = [];
    const magnetList = [];
    const duckList = [];
    const chestList = [];
    for (const pk of run.pickups ?? []) {
      if (pk.collected) continue;
      if (pk.kind === 'xp') xpList.push(pk);
      else if (pk.kind === 'heal') healList.push(pk);
      else if (pk.kind === 'duck') duckList.push(pk);
      else if (pk.kind === 'chest') chestList.push(pk);
      else if (pk.kind === 'magnet_can') magnetList.push(pk);
      else doseList.push(pk);
    }

    for (let i = 0; i < 140; i++) {
      const g = xpList[i];
      if (!g) {
        this.xpDummy.scale.setScalar(0);
        this.xpDummy.updateMatrix();
        this.xpGemsMesh.setMatrixAt(i, this.xpDummy.matrix);
        continue;
      }
      this.xpDummy.position.set(g.x, 0.24 + Math.sin(run.time * 4 + g.id) * 0.05, g.z);
      this.xpDummy.rotation.set(0.3, run.time * 2.4 + g.id, 0.2);
      this.xpDummy.scale.setScalar(g.tone === 'gold' ? 0.19 : g.tone === 'cyan' ? 0.15 : 0.12);
      this.xpDummy.updateMatrix();
      this.xpGemsMesh.setMatrixAt(i, this.xpDummy.matrix);
      this.xpGemsMesh.setColorAt(i, color(g.tone === 'gold' ? PALETTE.brass : g.tone === 'cyan' ? PALETTE.glacier : PALETTE.jade));
    }
    this.xpGemsMesh.instanceMatrix.needsUpdate = true;
    if (this.xpGemsMesh.instanceColor) this.xpGemsMesh.instanceColor.needsUpdate = true;

    for (let i = 0; i < this.healPickups.length; i++) {
      const m = this.healPickups[i];
      const pk = healList[i];
      m.visible = Boolean(pk);
      if (pk) {
        m.position.set(pk.x, 0.16 + Math.sin(run.time * 3.8 + i) * 0.06, pk.z);
        m.rotation.y = run.time * 2.2;
      }
    }
    for (let i = 0; i < this.dosePickups.length; i++) {
      const m = this.dosePickups[i];
      const pk = doseList[i];
      m.visible = Boolean(pk);
      if (pk) {
        m.position.set(pk.x, 0.12 + Math.sin(run.time * 4 + i) * 0.05, pk.z);
        m.rotation.y = run.time * 2.5;
      }
    }
    for (let i = 0; i < this.magnetPickups.length; i++) {
      const m = this.magnetPickups[i];
      const pk = magnetList[i];
      m.visible = Boolean(pk);
      if (pk) {
        m.position.set(pk.x, 0.12 + Math.sin(run.time * 4.4 + i) * 0.06, pk.z);
        m.rotation.y = run.time * 3.1;
      }
    }
    for (let i = 0; i < this.duckPickups.length; i++) {
      const m = this.duckPickups[i];
      const pk = duckList[i];
      m.visible = Boolean(pk);
      if (pk) {
        m.position.set(pk.x, 0.28 + Math.abs(Math.sin(run.time * 5 + i)) * 0.18, pk.z);
        m.rotation.y = run.time * 3.6;
      }
    }
    for (let i = 0; i < this.chestPickups.length; i++) {
      const m = this.chestPickups[i];
      const pk = chestList[i];
      m.visible = Boolean(pk);
      if (pk) {
        m.position.set(pk.x, 0.06 + Math.sin(run.time * 3 + i) * 0.04, pk.z);
        m.rotation.y = run.time * 1.4;
      }
    }

    // Grillspieß-Projektile (oder Spieß-Kurier Klassen-Vorschau im Titelbildschirm)
    const showRunnerShowcase = isTitle && run.loadoutId === 'runner';
    for (let i = 0; i < this.skewerShots.length; i++) {
      const m = this.skewerShots[i];
      if (showRunnerShowcase && i < 3) {
        const a = run.time * 2.1 + (i * TAU) / 3;
        m.visible = true;
        m.position.set(run.player.x + Math.cos(a) * 1.35, 0.68 + Math.sin(run.time * 4 + i) * 0.06, run.player.z + Math.sin(a) * 1.35);
        m.rotation.set(Math.PI / 2, 0, -a + Math.PI / 2);
        continue;
      }
      const p = run.projectiles?.[i];
      m.visible = Boolean(p);
      if (p) {
        m.position.set(p.x, 0.62, p.z);
        m.rotation.set(Math.PI / 2, 0, Math.atan2(p.vx, p.vz));
      }
    }

    // Arcing Spezi Bombs
    for (let i = 0; i < this.speziBombs.length; i++) {
      const m = this.speziBombs[i];
      const b = run.bombs?.[i];
      m.visible = Boolean(b);
      if (b) {
        const t = Math.min(1, b.elapsed / b.duration);
        m.position.set(b.x, 0.25 + Math.sin(t * Math.PI) * 2.35, b.z);
        m.rotation.set(t * 9, t * 7, 0);
      }
    }

    // Explosion Rings
    for (let i = 0; i < this.explosionRings.length; i++) {
      const r = this.explosionRings[i];
      const ex = run.explosions?.[i];
      r.visible = Boolean(ex);
      if (ex) {
        const p = Math.min(1, ex.age / ex.maxAge);
        const s = 0.4 + p * ex.radius;
        r.position.set(ex.x, floorY + 0.035, ex.z);
        r.scale.set(s, 1, s);
        r.material.color.setHex(ex.color ?? 0xff8c24);
        r.material.opacity = (1 - p) * 0.92;
      }
    }

    // Ricochet Dosen
    for (let i = 0; i < this.clappers.length; i++) {
      const clapper = this.clappers[i];
      const tossed = run.throws?.[i];
      clapper.visible = Boolean(tossed);
      if (tossed) {
        const py = 0.28 + Math.abs(Math.sin(tossed.elapsed * (tossed.slapshot || tossed.superCan ? 16 : 10))) * 0.24;
        clapper.position.set(tossed.x, py, tossed.z);
        clapper.rotation.y = tossed.elapsed * (tossed.slapshot || tossed.superCan ? 22 : 12);
        clapper.scale.setScalar(tossed.superCan ? 1.52 : tossed.slapshot ? 1.25 : 1.0);
      }
    }

    if (this.air) {
      this.air.position.x = Math.sin(run.time * 0.24) * 0.85;
      this.air.position.z = Math.sin(run.time * 0.15) * 0.6;
    }
    if (this.water) this.water.value = run.time;
    const slipColor = run.map?.biome?.foamHex ?? PALETTE.glacier;
    const pulses = (run.pulses ?? []).filter((entry) => entry.kind !== 'step' && entry.age < 0.63);
    for (const [index, ring] of this.ripples.entries()) {
      const pulse = pulses[index];
      ring.visible = Boolean(pulse);
      if (!pulse) continue;
      ring.position.x = pulse.x;
      ring.position.z = pulse.z;
      const size = 0.2 + pulse.age * (pulse.kind === 'splash' ? 2.2 : 3.4);
      ring.scale.set(size, 1, size);
      ring.material.color.setHex(pulse.kind === 'splash' ? slipColor : PALETTE.brass);
      ring.material.opacity = (1 - pulse.age / 0.63) * 0.68;
    }

    this.consumeVfx(run);
    this.particles.step(dt || 0.016);
  }

  renderPixelPipeline(run, isTitle = false) {
    const { player, time, hitFlash } = run;
    const u = this.post.uniforms;
    u.uTime.value = time;
    u.uLampOn.value = player.lamp ? 1.0 : 0.0;
    u.uWideBeam.value = player.evolutions?.has('evo_beam') ? 1.55 : (player.weapons?.beam || 0) > 0 ? 1.0 : 0.0;
    u.uTitleMode.value = isTitle ? 1.0 : 0.0;
    u.uHitFlash.value = isTitle ? 0.0 : Math.min(1, (hitFlash || 0) * 2.4);

    if (!isTitle && run.chaosEvent) {
      const ev = run.chaosEvent.id;
      const pulse = 0.55 + 0.45 * Math.sin(time * (ev === 'ordnungsamt' ? 14 : 6));
      u.uChaosPulse.value = pulse;
      if (ev === 'ordnungsamt') {
        if (Math.sin(time * 14) >= 0) u.uChaosTint.value.set(0.12, 0.42, 1.0);
        else u.uChaosTint.value.set(1.0, 0.14, 0.22);
      } else if (ev === 'happy_hour') {
        u.uChaosTint.value.set(1.0, 0.76, 0.18);
      } else if (ev === 'fettbahn') {
        u.uChaosTint.value.set(0.65, 0.95, 0.24);
      } else if (ev === 'kartenzahlung') {
        u.uChaosTint.value.set(0.22, 0.86, 1.0);
      } else if (ev === 'doenerpreis') {
        u.uChaosTint.value.set(1.0, 0.25, 0.2);
      } else {
        u.uChaosTint.value.set(1.0, 0.92, 0.2);
      }
    } else {
      u.uChaosPulse.value = 0.0;
      u.uChaosTint.value.set(0.0, 0.0, 0.0);
    }

    this.projTempA.set(player.x, 0.35, player.z).project(this.camera);
    const px = this.projTempA.x * 0.5 + 0.5;
    const py = this.projTempA.y * 0.5 + 0.5;
    u.uPlayerUv.value.set(px, py);

    this.projTempB.set(
      player.x + Math.cos(player.angle) * 4.5,
      0.35,
      player.z + Math.sin(player.angle) * 4.5,
    ).project(this.camera);
    const tx = this.projTempB.x * 0.5 + 0.5;
    const ty = this.projTempB.y * 0.5 + 0.5;
    const dx = (tx - px) * this.camera.aspect;
    const dy = ty - py;
    const len = Math.hypot(dx, dy) || 1;
    u.uAimDirUv.value.set(dx / len, dy / len);

    let minDist = 99;
    for (const e of run.enemies ?? []) {
      if (!e.dead) minDist = Math.min(minDist, Math.hypot(e.x - player.x, e.z - player.z));
    }
    u.uDanger.value = isTitle ? 0.0 : Math.max(0, 1 - minDist / 4.2);

    this.renderer.setRenderTarget(this.pixelTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.post.postScene, this.post.postCam);
  }

  drawTitle(run, time) {
    this.ensureMap(run.map);
    const cx = run.map.start.x;
    const cz = run.map.start.z;

    run.time = time;
    run.player.x = cx - 0.85;
    run.player.z = cz + 0.25;
    run.player.angle = -0.25;
    run.player.lamp = true;
    run.player.donerAngle = time * 2.4;

    if (!run.hauke) {
      run.hauke = {
        id: 99, type: 'hauke', x: cx + 1.55, z: cz - 0.85, angle: Math.PI + 0.35,
        dead: false, moving: false, chargeState: 'none', enraged: false,
      };
    }
    if (!run.tom) {
      run.tom = {
        id: 98, type: 'tom', x: cx + 0.85, z: cz + 1.65, angle: -1.2,
        dead: false, moving: true,
      };
    }

    const orbit = time * 0.22;
    const isPortrait = this.camera.aspect < 0.95;
    const pull = isPortrait ? (0.95 - this.camera.aspect) * 4.4 : 0;
    const ox = cx + Math.sin(orbit) * (isPortrait ? 0.55 : 1.15);
    const oz = cz + Math.cos(orbit) * 0.75;
    if (isPortrait) {
      this.camera.position.set(ox + 0.3, 9.6 + pull, oz + 7.9 + pull * 0.8);
      this.camera.lookAt(cx + 0.25, 0.35, cz + 1.25 + pull * 0.25);
    } else {
      this.camera.position.set(ox + 1.3, 8.2, oz + 6.9);
      this.camera.lookAt(cx - 0.2, 0.55, cz - 0.2);
    }
    this.camera.updateMatrixWorld();

    this.updateHero(run, time);
    this.updateThreat(run, true);
    this.updateProps(run, 0.016, true);
    this.renderPixelPipeline(run, true);
  }

  draw(run, dt = 0, snap = false) {
    this.ensureMap(run.map);
    this.setCamera(run, dt, snap);
    this.updateHero(run, run.time);
    this.updateThreat(run, false);
    this.updateProps(run, dt, false);
    this.renderPixelPipeline(run, false);
  }
}
