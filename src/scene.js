import * as THREE from 'three';
import { LIFT_WAIT } from './game.js';
import {
  BLOCKS, DEPTH, FIXTURES, LIFT, POOLS, RECORDS, ROOMS, VALVES, VENDING, WIDTH, cell, clearPath,
} from './level.js';
import {
  PALETTE, TAU, band, batchScenery, brassMaterial, color, diver, dredged, emissive,
  greedyTom, haukeBoss, material, octa, orb, piece, randomFrom, round, rubberDuck,
  solid, studioEnv, surfaceTexture, tapered,
} from './art.js';

const brass = brassMaterial(PALETTE.brass);
const copper = brassMaterial(PALETTE.copper);
const enamel = material(0x235254, 0.22, 0.18, 0.85);
const clay = material(PALETTE.slate, 0.36, 0.14, 0.55);
const ink = material(PALETTE.ink, 0.65, 0.1, 0.2);
const rust = material(0x8e4c37, 0.38, 0.22, 0.5);
const dangerRed = material(PALETTE.vermilion, 0.28, 0.22, 0.7);
const ivoryMat = material(PALETTE.ivory, 0.24, 0.1, 0.8);
const jadeMat = material(PALETTE.jade, 0.24, 0.15, 0.82);

const tilePlane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const markPlane = new THREE.RingGeometry(0.955, 1, 64).rotateX(-Math.PI / 2);
const thinRingPlane = new THREE.RingGeometry(0.985, 1, 64).rotateX(-Math.PI / 2);
const floorY = 0.013;

function placeInlayRing(parent, tint, x, z, radius, opacity = 0.42) {
  const finish = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity, depthWrite: false });
  const mark = piece(parent, thinRingPlane, finish, x, floorY + 0.008, z, radius, 1, radius);
  mark.renderOrder = 1;
  return mark;
}

function installFloor(scene) {
  const random = randomFrom(91);
  const texture = surfaceTexture();
  const floorFinish = new THREE.MeshPhysicalMaterial({
    map: texture,
    roughness: 0.34,
    metalness: 0.15,
    clearcoat: 0.52,
    clearcoatRoughness: 0.24,
    bumpMap: texture,
    bumpScale: 0.014,
  });
  const floor = [];
  const perimeter = [];
  const sides = [[1, 0], [0, -1], [-1, 0], [0, 1]];
  for (let z = 0; z < DEPTH; z++) {
    for (let x = 0; x < WIDTH; x++) {
      const style = cell(x, z);
      if (!style) continue;
      floor.push({ x, z, style });
      for (const [dx, dz] of sides) {
        if (cell(x + dx, z + dz) === 0) perimeter.push({ x, z, dx, dz });
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
    const baseHex = ROOMS[style - 2]?.glaze ?? PALETTE.slate;
    tiles.setColorAt(index, color(baseHex).multiplyScalar(0.95 + random() * 0.12));
  }
  tiles.receiveShadow = true;
  scene.add(tiles);

  // Riftline p. 1-3: Engraved brass floor circles & geometric arena inlays in every room
  for (const room of ROOMS) {
    const cx = room.x + room.w * 0.5;
    const cz = room.z + room.d * 0.5;
    const r = Math.min(room.w, room.d) * 0.38;
    placeInlayRing(scene, PALETTE.brass, cx, cz, r, 0.38);
    placeInlayRing(scene, PALETTE.copper, cx, cz, r * 0.62, 0.28);
  }

  const sidesFinish = new THREE.MeshPhysicalMaterial({
    color: 0x24383f,
    roughness: 0.38,
    metalness: 0.16,
    clearcoat: 0.45,
    map: texture,
    bumpMap: texture,
    bumpScale: 0.02,
  });
  const walls = new THREE.InstancedMesh(solid, sidesFinish, perimeter.length);
  const rims = new THREE.InstancedMesh(solid, brass, perimeter.length);
  const feet = new THREE.InstancedMesh(solid, ink, perimeter.length);
  const profile = new THREE.Group();
  transform.rotation.y = 0;
  for (const [index, { x, z, dx, dz }] of perimeter.entries()) {
    const px = x + 0.5 + dx * 0.54;
    const pz = z + 0.5 + dz * 0.54;
    const height = dz > 0 ? 0.42 : 0.92 + random() * 0.18;
    const width = dx ? 0.22 : 1.06;
    const depth = dz ? 0.22 : 1.06;
    transform.position.set(px, height / 2 - 0.15, pz);
    transform.scale.set(width, height + 0.3, depth);
    transform.updateMatrix();
    walls.setMatrixAt(index, transform.matrix);
    walls.setColorAt(index, color(0x283f46).multiplyScalar(0.92 + random() * 0.18));
    transform.position.y = height + 0.015;
    transform.scale.set(width + 0.04, 0.055, depth + 0.04);
    transform.updateMatrix();
    rims.setMatrixAt(index, transform.matrix);
    transform.position.y = 0.11;
    transform.scale.set(width + 0.05, 0.12, depth + 0.05);
    transform.updateMatrix();
    feet.setMatrixAt(index, transform.matrix);

    // Riftline p. 1 background: Glazed teal ceramic pillars with brass collars along northern walls
    if (index % 5 === 0 && dz <= 0) {
      piece(profile, tapered, enamel, px, height * 0.72, pz, 0.24, height * 1.45, 0.24);
      piece(profile, round, brass, px, height * 1.38, pz, 0.27, 0.07, 0.27);
      piece(profile, orb, enamel, px, height * 1.48, pz, 0.22, 0.14, 0.22);
    }
  }
  for (const mesh of [walls, rims, feet]) {
    mesh.castShadow = mesh !== feet;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
  batchScenery(scene, profile);
}

function installWater(scene) {
  const clock = { value: 0 };
  // Riftline p. 3 "Glowmarsh / Aurora Shelf" stylized luminous pools with crisp brass/jade rims
  const water = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: clock, uColor: { value: color(0x3a8b88) } },
    vertexShader: `varying vec2 waterUv;
void main() {
  waterUv = uv * 2.0 - 1.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `uniform float uTime;
uniform vec3 uColor;
varying vec2 waterUv;
void main() {
  float angle = atan(waterUv.y, waterUv.x);
  float border = length(waterUv) + sin(angle * 7.0 + uTime * 0.4) * 0.022 + cos(angle * 11.0) * 0.018;
  float surface = 1.0 - smoothstep(0.92, 0.985, border);
  float ring = sin(border * 22.0 - uTime * 1.8) * 0.5 + 0.5;
  float bands = pow(ring, 5.0) * 0.08;
  float rim = (smoothstep(0.88, 0.95, border) - smoothstep(0.95, 0.99, border)) * 0.32;
  vec3 tint = uColor * 0.42 + vec3(0.56, 0.78, 0.72) * (bands + rim);
  gl_FragColor = vec4(tint, surface * 0.64);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  });
  for (const { x, z, w, d } of POOLS) {
    const patch = piece(scene, tilePlane, water, x, floorY + 0.009, z, w, 1, d);
    patch.renderOrder = 1;
  }
  return clock;
}

function installMachinery(scene) {
  const group = new THREE.Group();
  for (const offset of [-1.32, 1.32]) {
    piece(group, solid, brass, 18.5 + offset, 0.017, 23.8, 0.038, 0.016, 4.25);
    piece(group, solid, brass, 18.5 + offset, 0.017, 10.1, 0.038, 0.016, 3.64);
  }
  for (const { x, z, w, d, kind } of BLOCKS) {
    const detail = new THREE.Group();
    detail.position.set(x, 0, z);
    group.add(detail);
    piece(detail, round, ink, 0, 0.05, 0, Math.min(w, d) * 0.54, 0.1, Math.min(w, d) * 0.54);
    if (kind === 'pump' || kind === 'coil') {
      // Riftline p. 1 & 4: Rounded glazed ceramic vessels with recessed brass seams
      const radius = Math.min(w, d) * 0.44;
      const height = kind === 'pump' ? 0.88 : 0.62;
      piece(detail, tapered, enamel, 0, height * 0.5, 0, radius, height, radius);
      piece(detail, round, brass, 0, 0.18, 0, radius * 1.05, 0.08, radius * 1.05);
      band(detail, brass, 0, height * 0.88, 0, radius * 0.89);
      piece(detail, orb, enamel, 0, height * 0.98, 0, radius * 0.86, 0.22, radius * 0.86);
      piece(detail, round, brass, 0, height + 0.18, 0, 0.14, 0.07, 0.14);
    } else if (kind === 'turbine') {
      piece(detail, solid, clay, 0, 0.29, 0, w * 0.91, 0.47, d * 0.87);
      const barrel = piece(detail, round, enamel, 0, 0.89, 0, d * 0.45, w * 0.9, d * 0.45);
      barrel.rotation.z = Math.PI / 2;
      for (let i = -1; i <= 1; i++) {
        piece(detail, round, brass, i * w * 0.38, 0.89, 0, d * 0.47, 0.085, d * 0.47).rotation.z = Math.PI / 2;
      }
    } else if (kind === 'shelves') {
      piece(detail, solid, clay, 0, 0.52, 0, w * 0.92, 0.96, d * 0.92);
      piece(detail, solid, brass, 0, 1.02, 0, w * 0.96, 0.06, d * 0.96);
      for (let tier = 0; tier < 2; tier++) {
        const y = 0.32 + tier * 0.38;
        piece(detail, solid, tier === 1 ? enamel : jadeMat, 0, y, 0, w * 0.78, 0.22, d * 0.78);
      }
    } else {
      piece(detail, solid, enamel, 0, 0.32, 0, w * 0.9, 0.54, d * 0.88);
      piece(detail, solid, brass, 0, 0.61, 0, w * 0.95, 0.07, d * 0.92);
    }
  }

  // Riftline Upgrade / Supply Dispenser ("Späti-Terminal") in Valve Hall
  const vend = new THREE.Group();
  vend.position.set(VENDING.x, 0, VENDING.z);
  piece(vend, tapered, enamel, 0, 0.64, 0, 0.44, 1.22, 0.44);
  band(vend, brass, 0, 1.18, 0, 0.42);
  piece(vend, orb, ivoryMat, 0, 1.26, 0, 0.36, 0.18, 0.36);
  piece(vend, solid, emissive(PALETTE.jade), 0, 0.76, 0.36, 0.38, 0.42, 0.04);
  piece(vend, octa, emissive(PALETTE.vermilion), 0, 1.48, 0, 0.12, 0.18, 0.12);
  group.add(vend);

  batchScenery(scene, group);
}

function installValves(scene) {
  // Riftline p. 5: Three-stage floor plate / copper pylon hazard
  return VALVES.map((valve) => {
    const root = new THREE.Group();
    root.position.set(valve.x, 0, valve.z);
    piece(root, round, brass, 0, 0.04, 0, 0.52, 0.08, 0.52);
    piece(root, round, enamel, 0, 0.08, 0, 0.42, 0.06, 0.42);
    const wheel = new THREE.Group();
    wheel.position.set(0, 0.14, 0);
    band(wheel, copper, 0, 0, 0, 0.34);
    for (let i = 0; i < 4; i++) {
      const a = (i * TAU) / 4;
      piece(wheel, octa, emissive(PALETTE.vermilion), Math.cos(a) * 0.24, 0.04, Math.sin(a) * 0.24, 0.06, 0.09, 0.06);
    }
    root.add(wheel);
    const steam = placeRing(scene, PALETTE.vermilion, valve.x, valve.z, 1.8);
    steam.visible = false;
    scene.add(root);
    return { wheel, steam };
  });
}

function fixtureLights(scene) {
  for (const { x, z, color: tint, strength } of FIXTURES) {
    const shape = new THREE.Group();
    piece(shape, tapered, enamel, x, 0.38, z, 0.18, 0.72, 0.18);
    piece(shape, round, brass, x, 0.74, z, 0.21, 0.08, 0.21);
    piece(shape, orb, emissive(tint), x, 0.88, z, 0.15, 0.18, 0.15);
    piece(shape, tapered, brass, x, 1.02, z, 0.22, 0.08, 0.22);
    scene.add(shape);
    const lantern = new THREE.PointLight(tint, strength * 1.15, 6.2, 1.85);
    lantern.position.set(x, 1.08, z);
    scene.add(lantern);
  }
}

function installRecords(scene) {
  const plinths = new THREE.Group();
  const items = [];
  for (const record of RECORDS) {
    const { x, z, color: tint, id } = record;
    piece(plinths, round, clay, x, 0.25, z, 0.38, 0.46, 0.38);
    piece(plinths, tapered, enamel, x, 0.5, z, 0.45, 0.11, 0.45);
    band(plinths, brass, x, 0.56, z, 0.4);
    const root = new THREE.Group();
    root.position.set(x, 0.68, z);
    scene.add(root);
    const label = emissive(tint);
    if (id === 'log') {
      // Goldene Chef-Krone / Drip-Relikt (Ivory & Brass)
      piece(root, octa, brass, 0, 0.16, 0, 0.22, 0.28, 0.22);
      band(root, label, 0, 0.16, 0, 0.34);
    } else if (id === 'cylinder') {
      // Limitierte Paulaner Spezi-Kapsel (Glazed Ceramic & Neon Glow)
      piece(root, round, enamel, 0, 0.16, 0, 0.16, 0.32, 0.16);
      band(root, brass, 0, 0.28, 0, 0.17);
      band(root, label, 0, 0.16, 0, 0.18);
    } else {
      // Heiliger Mitternachts-Döner-Kristall (Lavender & Jade Prism)
      piece(root, octa, label, 0, 0.18, 0, 0.2, 0.34, 0.2);
      const orbit = band(root, brass, 0, 0.18, 0, 0.32);
      orbit.rotation.x = 0.6;
    }
    const ring = placeRing(scene, tint, x, z, 0.85);
    const glow = new THREE.PointLight(tint, 5.2, 3.2, 2);
    glow.position.set(x, 0.75, z);
    scene.add(glow);
    items.push({ record, root, ring, glow });
  }
  batchScenery(scene, plinths);
  return items;
}

function placeRing(parent, tint, x, z, radius) {
  const finish = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.72, depthWrite: false });
  const mark = piece(parent, markPlane, finish, x, floorY + 0.024, z, radius, 1, radius);
  mark.renderOrder = 2;
  return mark;
}

function installLift(scene) {
  const { x, z } = LIFT;
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  piece(root, round, brass, 0, 0.035, 0, 1.54, 0.07, 1.54);
  piece(root, round, enamel, 0, 0.068, 0, 1.42, 0.042, 1.42);
  const segments = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * TAU) / 12;
    const lx = Math.cos(a);
    const lz = Math.sin(a);
    piece(root, solid, brass, lx * 1.32, 0.095, lz * 1.32, 0.15, 0.026, 0.058).rotation.y = -a;
    const mark = piece(root, solid, emissive(PALETTE.brass), lx * 1.17, 0.095, lz * 1.17, 0.082, 0.01, 0.036);
    mark.rotation.y = -a;
    segments.push(mark);
  }
  band(root, brass, 0, 0.085, 0, 0.99);
  band(root, brass, 0, 0.082, 0, 0.36);
  piece(root, octa, emissive(PALETTE.jade), 0, 0.09, 0, 0.22, 0.03, 0.22);
  for (const side of [-1, 1]) {
    piece(root, tapered, enamel, side * 1.34, 0.68, 0.33, 0.16, 1.32, 0.18);
    piece(root, round, brass, side * 1.34, 1.36, 0.33, 0.21, 0.07, 0.21);
  }
  scene.add(root);
  const ring = placeRing(scene, PALETTE.brass, x, z, 1.58);
  ring.position.y = 0.113;
  return { ring, segments };
}

function diffuseAir(scene) {
  const rng = randomFrom(128);
  const points = new Float32Array(150 * 3);
  for (let index = 0; index < points.length; index += 3) {
    points[index] = rng() * WIDTH;
    points[index + 1] = 0.32 + rng() * 2.45;
    points[index + 2] = rng() * DEPTH;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(points, 3));
  const motes = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.032, color: PALETTE.ivory, transparent: true, opacity: 0.34, depthWrite: false,
  }));
  scene.add(motes);
  return motes;
}

export class SceneView {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = 1.38;

    this.scene = new THREE.Scene();
    this.scene.background = color(PALETTE.ink);
    this.scene.fog = new THREE.FogExp2(0x132228, 0.028);
    this.scene.environment = studioEnv(this.renderer);
    this.scene.environmentIntensity = 0.9;

    // Riftline p. 2: "42° vertical field of view and a gently damped follow"
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.15, 56);
    this.follow = new THREE.Vector3(18.5, 0, 16.5);
    this.ray = new THREE.Raycaster();
    this.ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.hit = new THREE.Vector3();
    this.pointer = new THREE.Vector2();

    this.scene.add(new THREE.HemisphereLight(0xd4ebf2, 0x1d2d30, 1.55));
    const key = new THREE.DirectionalLight(0xf5e5c9, 1.15);
    key.position.set(14, 18, 14);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 2;
    key.shadow.camera.far = 38;
    const d = 16;
    key.shadow.camera.left = -d;
    key.shadow.camera.right = d;
    key.shadow.camera.top = d;
    key.shadow.camera.bottom = -d;
    this.scene.add(key);

    installFloor(this.scene);
    this.water = installWater(this.scene);
    installMachinery(this.scene);
    this.valves = installValves(this.scene);
    fixtureLights(this.scene);
    this.records = installRecords(this.scene);
    this.lift = installLift(this.scene);
    this.air = diffuseAir(this.scene);

    this.actor = diver();
    this.monster = dredged();
    this.hauke = haukeBoss();
    this.tom = greedyTom();
    this.scene.add(this.actor.root, this.monster.root, this.hauke.root, this.tom.root);

    // 3 Snacks im eigenen Gravitationsfeld um Haukes Bauch
    this.haukeSnacks = Array.from({ length: 3 }, () => {
      const s = new THREE.Group();
      piece(s, round, brass, 0, 0.72, 0, 0.11, 0.18, 0.11);
      piece(s, orb, emissive(PALETTE.vermilion), 0, 0.84, 0, 0.08, 0.06, 0.08);
      this.scene.add(s);
      return s;
    });
    this.haukeRing = placeRing(this.scene, PALETTE.copper, 0, 0, 2.05);
    this.novaRing = placeRing(this.scene, PALETTE.brass, 0, 0, 1);
    this.novaRing.visible = false;

    this.cans = Array.from({ length: 10 }, () => {
      const canGroup = new THREE.Group();
      piece(canGroup, round, brass, 0, 0.11, 0, 0.11, 0.2, 0.11);
      piece(canGroup, round, emissive(PALETTE.jade), 0, 0.11, 0, 0.114, 0.08, 0.114);
      this.scene.add(canGroup);
      return canGroup;
    });

    this.lamp = new THREE.SpotLight(0xffe1b5, 58, 10.5, 0.52, 0.65, 1.45);
    this.lamp.castShadow = true;
    this.lamp.shadow.mapSize.set(768, 768);
    this.lamp.shadow.camera.near = 0.3;
    this.lamp.shadow.camera.far = 11;
    this.lamp.shadow.normalBias = 0.025;
    this.lamp.shadow.bias = -0.00013;
    this.scene.add(this.lamp, this.lamp.target);
    this.island = new THREE.PointLight(0xffcf96, 5.2, 4.2, 1.8);
    this.scene.add(this.island);
    this.ripples = Array.from({ length: 14 }, () => placeRing(this.scene, PALETTE.brass, 0, 0, 1));
    this.clappers = Array.from({ length: 4 }, () => rubberDuck(this.scene));
    this.resize();
  }

  resize() {
    const { clientWidth, clientHeight } = this.renderer.domElement;
    const width = Math.max(clientWidth || window.innerWidth, 1);
    const height = Math.max(clientHeight || window.innerHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  aimAt(screenPoint, player) {
    const bounds = this.renderer.domElement.getBoundingClientRect();
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
    const near = this.follow;
    const easing = snap ? 1 : 1 - Math.exp(-6 * dt);
    near.x += (player.x - near.x) * easing;
    near.z += (player.z - near.z) * easing;
    const mobileLift = Math.max(0, 1.33 - this.camera.aspect) * 3.9;
    const shakeX = cameraShake > 0 ? Math.sin(time * 58) * cameraShake * 0.35 : 0;
    const shakeZ = cameraShake > 0 ? Math.cos(time * 51) * cameraShake * 0.35 : 0;
    this.camera.position.set(near.x + 0.82 + shakeX, 10.05 + mobileLift, near.z + 7.5 + mobileLift * 0.53 + shakeZ);
    this.camera.lookAt(near.x + shakeX * 0.5, 0, near.z - 1.03 + shakeZ * 0.5);
    this.camera.updateMatrixWorld();
  }

  updateHero(player, time) {
    const { root, body, legs, bulb, wrench, helmet } = this.actor;
    root.position.set(player.x, 0.012, player.z);
    root.rotation.y = Math.PI / 2 - player.angle;
    const gait = player.moving ? Math.sin(player.stride * 7.2) * 0.6 : 0;
    legs[0].rotation.x = gait;
    legs[1].rotation.x = -gait;
    body.position.y = (player.moving ? Math.abs(gait) * 0.07 : 0) + Math.sin(time * 3.1) * 0.009;
    body.rotation.x = player.sliding > 0 ? 1.15 : player.dash > 0 ? 0.35 : 0;
    if (helmet) helmet.visible = player.helmet !== false;
    if (wrench) {
      wrench.rotation.x = player.swing > 0 ? Math.sin((player.swing / 0.36) * Math.PI) * 1.45 : 0;
    }
    if (this.novaRing) {
      this.novaRing.visible = player.swing > 0;
      if (player.swing > 0) {
        const progress = 1 - player.swing / 0.36;
        const radius = 0.4 + progress * (player.novaRadius || 2.1);
        this.novaRing.position.set(player.x, floorY + 0.03, player.z);
        this.novaRing.scale.set(radius, 1, radius);
        this.novaRing.material.opacity = (1 - progress) * 0.85;
      }
    }
    bulb.material.color.setHex(player.lamp ? 0xffcf8b : 0x342821);
    const aimX = Math.cos(player.angle);
    const aimZ = Math.sin(player.angle);
    this.lamp.position.set(player.x + aimX * 0.22, 0.96, player.z + aimZ * 0.22);
    this.lamp.target.position.set(player.x + aimX * 4.8, 0.07, player.z + aimZ * 4.8);
    this.lamp.visible = player.lamp;
    this.island.position.set(player.x, 0.95, player.z);
    this.island.intensity = player.lamp ? 5.2 : 0.45;
  }

  updateActor(model, agent, player, time, alwaysShow) {
    if (!agent) {
      model.root.visible = false;
      return;
    }
    const { root, core, arms, mask, stars } = model;
    const gap = Math.hypot(agent.x - player.x, agent.z - player.z);
    const ang = Math.atan2(agent.z - player.z, agent.x - player.x);
    const lit = player.lamp && Math.cos(ang - player.angle) > 0.4 && gap < 10.5;
    root.visible = alwaysShow || ((gap < 5.2 || lit || agent.mode === 'hunt' || agent.stunned > 0) && gap < 14.0 && clearPath(player, agent));
    root.position.set(agent.x, 0.011, agent.z);
    root.rotation.y = Math.PI / 2 - agent.angle;
    const faster = agent.mode === 'hunt' || agent.mode === 'flee';
    const pace = agent.moving ? Math.sin(time * (faster ? 11.8 : 6.3)) : 0;
    core.position.y = 0.02 + Math.abs(pace) * 0.081;
    core.rotation.x = agent.stunned > 0 ? -0.45 : faster ? 0.2 : 0.052;
    arms[0].rotation.x = pace * 0.45;
    arms[1].rotation.x = -pace * 0.45;
    mask.rotation.z = Math.cos(time * 1.6) * 0.1;
    if (stars) {
      stars.visible = agent.stunned > 0;
      stars.rotation.y = time * 6.5;
    }
  }

  updateThreat(run, forceVisible = false) {
    const { player, listener, hauke, tom, time } = run;
    this.updateActor(this.monster, listener, player, time, forceVisible || run.state === 'caught');
    this.updateActor(this.hauke, hauke, player, time, forceVisible || run.state === 'caught');
    this.updateActor(this.tom, tom, player, time, forceVisible);

    // Haukes Gravitationsring & Snacks im Orbit
    const showHauke = this.hauke.root.visible && hauke;
    this.haukeRing.visible = Boolean(showHauke);
    if (showHauke) {
      this.haukeRing.position.set(hauke.x, floorY + 0.02, hauke.z);
      const pulse = 1.85 + Math.sin(time * 4.5) * 0.15;
      this.haukeRing.scale.set(pulse, 1, pulse);
    }
    for (const [i, snack] of this.haukeSnacks.entries()) {
      snack.visible = Boolean(showHauke);
      if (!showHauke) continue;
      const a = (i * TAU) / this.haukeSnacks.length + time * 1.8;
      const r = 1.32 + Math.sin(time * 3 + i) * 0.08;
      snack.position.set(hauke.x + Math.cos(a) * r, 0.05, hauke.z + Math.sin(a) * r);
      snack.rotation.y = -a;
    }
  }

  updateProps(run) {
    for (const { record, root, ring, glow } of this.records) {
      const present = !run.records.has(record.id);
      root.visible = ring.visible = glow.visible = present;
      root.rotation.y = 0.3 + run.time * 0.85;
      const gap = Math.hypot(run.player.x - record.x, run.player.z - record.z);
      ring.material.opacity = gap < 1.35 ? 0.94 : 0.42 + 0.12 * Math.sin(run.time * 2.4);
    }
    if (run.cans) {
      for (const [index, mesh] of this.cans.entries()) {
        const can = run.cans[index];
        mesh.visible = Boolean(can && !can.collected);
        if (!can || can.collected) continue;
        mesh.position.set(can.x, 0.02, can.z);
        mesh.rotation.y = run.time * 1.8 + index;
      }
    }
    if (run.valves) {
      for (const [index, viewValve] of this.valves.entries()) {
        const state = run.valves[index];
        if (!state) continue;
        viewValve.wheel.rotation.y = state.active > 0 ? run.time * 10 : 0;
        viewValve.steam.visible = state.active > 0;
        if (state.active > 0) {
          const s = 1.2 + (1.6 - state.active) * 2.2;
          viewValve.steam.scale.set(s, 1, s);
          viewValve.steam.material.opacity = (state.active / 1.6) * 0.85;
        }
      }
    }
    const called = run.lift.state !== 'idle';
    this.lift.ring.material.color.setHex(called ? PALETTE.vermilion : run.records.size === RECORDS.length ? PALETTE.jade : PALETTE.brass);
    this.lift.ring.material.opacity = called ? 0.9 : 0.48;
    const progress = 1 - run.lift.remaining / LIFT_WAIT;
    const filled = called ? Math.ceil(this.lift.segments.length * progress) : 0;
    for (const [index, marker] of this.lift.segments.entries()) marker.visible = index < filled;
    this.air.position.x = Math.sin(run.time * 0.24) * 0.85;
    this.air.position.z = Math.sin(run.time * 0.15) * 0.6;
    this.water.value = run.time;
    const pulses = run.pulses.filter((entry) => entry.kind !== 'step' && entry.age < 0.63);
    for (const [index, ring] of this.ripples.entries()) {
      const pulse = pulses[index];
      ring.visible = Boolean(pulse);
      if (!pulse) continue;
      ring.position.x = pulse.x;
      ring.position.z = pulse.z;
      const size = 0.2 + pulse.age * (pulse.kind === 'splash' ? 2.2 : 3.4);
      ring.scale.set(size, 1, size);
      ring.material.color.setHex(pulse.kind === 'splash' ? PALETTE.glacier : pulse.kind === 'toot' ? PALETTE.jade : PALETTE.brass);
      ring.material.opacity = (1 - pulse.age / 0.63) * 0.56;
    }
    for (const [index, clapper] of this.clappers.entries()) {
      const tossed = run.throws[index];
      clapper.visible = Boolean(tossed);
      if (!tossed) continue;
      const factor = tossed.elapsed / tossed.duration;
      clapper.position.set(
        THREE.MathUtils.lerp(tossed.from.x, tossed.to.x, factor),
        0.05 + Math.sin(factor * Math.PI) * 0.85,
        THREE.MathUtils.lerp(tossed.from.z, tossed.to.z, factor),
      );
      clapper.rotation.y = factor * 8;
    }
  }

  drawTitle(run, time) {
    // Seamless 3D Riftline Arena preview behind the Title Screen!
    run.time = time;
    run.player.x = 18.5;
    run.player.z = 16.4;
    run.player.angle = 0.65;
    run.hauke.x = 20.6;
    run.hauke.z = 15.2;
    run.hauke.angle = Math.PI + 0.4;
    run.listener.x = 16.2;
    run.listener.z = 14.3;
    run.listener.angle = 0.5;
    run.tom.x = 19.6;
    run.tom.z = 18.2;
    run.tom.angle = -1.2;

    const orbit = time * 0.18;
    const cx = 19.2 + Math.sin(orbit) * 1.4;
    const cz = 15.8 + Math.cos(orbit) * 0.9;
    this.camera.position.set(cx + 1.8, 7.8, cz + 6.4);
    this.camera.lookAt(19.4, 0.55, 15.4);
    this.camera.updateMatrixWorld();

    this.updateHero(run.player, time);
    this.updateThreat(run, true);
    this.updateProps(run);
    this.renderer.render(this.scene, this.camera);
  }

  draw(run, dt = 0, snap = false) {
    this.setCamera(run, dt, snap);
    this.updateHero(run.player, run.time);
    this.updateThreat(run, false);
    this.updateProps(run);
    this.renderer.render(this.scene, this.camera);
  }
}
