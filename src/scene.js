import * as THREE from 'three';
import { LIFT_WAIT } from './game.js';
import { BLOCKS, DEPTH, FIXTURES, LIFT, POOLS, RECORDS, ROOMS, WIDTH, cell, clearPath } from './level.js';
import {
  TAU, band, batchScenery, color, diver, dredged, emissive, material, orb, piece,
  randomFrom, round, solid, surfaceTexture, tapered,
} from './art.js';

const quartz = 0x819e9f;
const brass = material(0xaa8150, 0.42, 0.48);
const bronze = material(0x674c37, 0.59, 0.4);
const enamel = material(0x426b6a, 0.4, 0.16);
const clay = material(0x435155, 0.83);
const ink = material(0x182527, 0.82);
const rust = material(0x88583e, 0.66, 0.24);
const tilePlane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const markPlane = new THREE.RingGeometry(0.965, 1, 56).rotateX(-Math.PI / 2);
const floorY = 0.013;

function installFloor(scene) {
  const random = randomFrom(91);
  const texture = surfaceTexture();
  const floorFinish = new THREE.MeshStandardMaterial({
    map: texture, roughness: 0.62, metalness: 0.17, bumpMap: texture, bumpScale: 0.025,
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
    tiles.setColorAt(index, color(ROOMS[style - 2]?.glaze ?? 0x3c4e4e).multiplyScalar(0.89 + random() * 0.31));
  }
  tiles.receiveShadow = true;
  scene.add(tiles);
  const sidesFinish = new THREE.MeshStandardMaterial({
    color: 0xa3a3a3, roughness: 0.72, map: texture, bumpMap: texture, bumpScale: 0.045,
  });
  const walls = new THREE.InstancedMesh(solid, sidesFinish, perimeter.length);
  const rims = new THREE.InstancedMesh(solid, material(0x405451, 0.57, 0.16), perimeter.length);
  const feet = new THREE.InstancedMesh(solid, ink, perimeter.length);
  const profile = new THREE.Group();
  transform.rotation.y = 0;
  for (const [index, { x, z, dx, dz }] of perimeter.entries()) {
    const px = x + 0.5 + dx * 0.54;
    const pz = z + 0.5 + dz * 0.54;
    const height = dz > 0 ? 0.47 : 0.98 + random() * 0.24;
    const width = dx ? 0.22 : 1.06;
    const depth = dz ? 0.22 : 1.06;
    transform.position.set(px, height / 2 - 0.15, pz);
    transform.scale.set(width, height + 0.3, depth);
    transform.updateMatrix();
    walls.setMatrixAt(index, transform.matrix);
    walls.setColorAt(index, color(0x374747).multiplyScalar(0.86 + random() * 0.38));
    transform.position.y = height + 0.01;
    transform.scale.set(width + 0.034, 0.066, depth + 0.034);
    transform.updateMatrix();
    rims.setMatrixAt(index, transform.matrix);
    transform.position.y = 0.13;
    transform.scale.set(width + 0.05, 0.14, depth + 0.05);
    transform.updateMatrix();
    feet.setMatrixAt(index, transform.matrix);
    if (index % 4 === 0 && dz <= 0) {
      piece(profile, solid, clay, px, height / 2, pz, 0.32, height + 0.16, 0.32);
      piece(profile, solid, bronze, px, height + 0.07, pz, 0.35, 0.064, 0.35);
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
  const water = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: clock, uColor: { value: color(0x2d5e64) } },
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
  float border = length(waterUv) + sin(angle * 9.0) * 0.026 + cos(angle * 15.0) * 0.021;
  float surface = 1.0 - smoothstep(0.93, 0.982, border);
  float drift = sin(waterUv.x * 28.0 + waterUv.y * 14.0 + sin(waterUv.y * 16.0) * 0.8 - uTime * 1.12);
  float bands = pow(0.5 + drift * 0.5, 8.0) * 0.028;
  float rim = (smoothstep(0.9, 0.96, border) - smoothstep(0.958, 0.99, border)) * 0.09;
  gl_FragColor = vec4(uColor * 0.28 + vec3(bands * 0.49 + rim * 0.6, bands + rim, bands + rim), surface * 0.57);
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
    piece(group, solid, bronze, 18.5 + offset, 0.017, 23.8, 0.032, 0.016, 4.25);
    piece(group, solid, bronze, 18.5 + offset, 0.017, 10.1, 0.032, 0.016, 3.64);
  }
  for (let z = 21.7; z < 25.75; z += 0.48) {
    for (const side of [-1, 1]) {
      piece(group, solid, ink, 18.5 + side * 1.34, 0.021, z, 0.12, 0.02, 0.042);
    }
  }
  for (const { x, z, w, d, kind } of BLOCKS) {
    const detail = new THREE.Group();
    detail.position.set(x, 0, z);
    group.add(detail);
    piece(detail, solid, ink, 0, 0.066, 0, w * 0.97, 0.13, d * 0.97);
    if (kind === 'pump' || kind === 'coil') {
      const radius = Math.min(w, d) * 0.43;
      const height = kind === 'pump' ? 0.89 : 0.61;
      piece(detail, tapered, enamel, 0, height * 0.51, 0, radius, height, radius);
      piece(detail, round, bronze, 0, 0.2, 0, radius * 1.04, 0.09, radius * 1.04);
      band(detail, brass, 0, height * 0.89, 0, radius * 0.87);
      piece(detail, orb, enamel, 0, height * 0.99, 0, radius * 0.86, 0.154, radius * 0.86);
      piece(detail, round, brass, 0, height + 0.16, 0, 0.12, 0.088, 0.12);
      piece(detail, solid, rust, 0, height + 0.217, 0, 0.48, 0.043, 0.065).rotation.y = 0.34;
      for (const side of [-1, 1]) {
        piece(detail, round, bronze, side * radius * 0.85, 0.51, 0, 0.16, 0.32, 0.16).rotation.z = Math.PI / 2;
        piece(detail, round, brass, side * radius * 1.07, 0.51, 0, 0.179, 0.048, 0.179).rotation.z = Math.PI / 2;
      }
    } else if (kind === 'turbine') {
      piece(detail, solid, clay, 0, 0.29, 0, w * 0.91, 0.47, d * 0.87);
      const barrel = piece(detail, round, enamel, 0, 0.89, 0, d * 0.45, w * 0.9, d * 0.45);
      barrel.rotation.z = Math.PI / 2;
      for (let i = -1; i <= 1; i++) {
        piece(detail, round, brass, i * w * 0.38, 0.89, 0, d * 0.463, 0.081, d * 0.463).rotation.z = Math.PI / 2;
      }
      for (let i = 0; i < 8; i++) {
        piece(detail, solid, bronze, 0, 1.184, (i - 3.5) * d * 0.1, w * 0.76, 0.063, 0.041);
      }
    } else if (kind === 'shelves') {
      for (const end of [-1, 1]) {
        for (const side of [-1, 1]) {
          piece(detail, solid, bronze, side * w * 0.46, 0.58, end * d * 0.459, 0.079, 1.16, 0.079);
        }
      }
      for (let tier = 0; tier < 3; tier++) {
        const y = 0.23 + tier * 0.37;
        piece(detail, solid, clay, 0, y, 0, w * 0.93, 0.07, d * 0.93);
        for (let i = -1; i <= 1; i++) {
          piece(detail, solid, tier === 1 ? enamel : rust, 0, y + 0.17, i * d * 0.26, w * 0.63, 0.27, d * 0.16);
          piece(detail, solid, brass, w * 0.31, y + 0.2, i * d * 0.26, 0.016, 0.034, d * 0.11);
        }
      }
    } else {
      piece(detail, solid, enamel, 0, 0.29, 0, w * 0.91, 0.48, d * 0.87);
      piece(detail, solid, clay, 0, 0.574, 0, w * 0.98, 0.101, d * 0.94);
      for (const side of [-1, 1]) {
        piece(detail, solid, bronze, side * w * 0.315, 0.328, 0, w * 0.067, 0.568, d * 0.96);
        piece(detail, solid, brass, side * w * 0.315, 0.617, 0, w * 0.07, 0.023, d * 0.91);
      }
    }
  }
  const random = randomFrom(233);
  for (let i = 0; i < 82; i++) {
    const x = 2 + random() * 33;
    const z = 2 + random() * 29;
    const c = cell(Math.floor(x), Math.floor(z));
    if (c < 2) continue;
    const metal = piece(group, solid, random() > 0.4 ? bronze : clay, x, 0.028, z, 0.06 + random() * 0.12, 0.047, 0.08);
    metal.rotation.y = random() * TAU;
  }
  batchScenery(scene, group);
}

function fixtureLights(scene) {
  for (const { x, z, color: tint, strength } of FIXTURES) {
    const shape = new THREE.Group();
    piece(shape, tapered, clay, x, 0.375, z, 0.175, 0.71, 0.175);
    piece(shape, round, bronze, x, 0.735, z, 0.196, 0.092, 0.196);
    piece(shape, round, emissive(tint), x, 0.844, z, 0.132, 0.155, 0.132);
    piece(shape, tapered, brass, x, 0.966, z, 0.208, 0.086, 0.208);
    scene.add(shape);
    const lantern = new THREE.PointLight(tint, strength, 5.25, 2);
    lantern.position.set(x, 1.025, z);
    scene.add(lantern);
  }
}

function installRecords(scene) {
  const plinths = new THREE.Group();
  const items = [];
  for (const record of RECORDS) {
    const { x, z, color: tint, id } = record;
    piece(plinths, round, clay, x, 0.253, z, 0.362, 0.46, 0.362);
    piece(plinths, tapered, enamel, x, 0.495, z, 0.43, 0.11, 0.43);
    band(plinths, brass, x, 0.555, z, 0.372);
    const root = new THREE.Group();
    root.position.set(x, 0.65, z);
    scene.add(root);
    const label = emissive(tint);
    if (id === 'log') {
      piece(root, solid, rust, 0, 0.052, 0, 0.415, 0.107, 0.3);
      piece(root, solid, brass, -0.153, 0.11, 0, 0.032, 0.012, 0.292);
      piece(root, solid, label, 0.034, 0.115, 0, 0.18, 0.015, 0.12);
    } else {
      piece(root, round, bronze, 0, 0.068, 0, 0.16, 0.23, 0.16).rotation.z = Math.PI / 2;
      for (const end of [-1, 1]) {
        piece(root, round, brass, end * 0.12, 0.068, 0, 0.184, 0.041, 0.184).rotation.z = Math.PI / 2;
        piece(root, round, label, end * 0.149, 0.068, 0, 0.111, 0.013, 0.111).rotation.z = Math.PI / 2;
      }
      piece(root, round, label, 0, 0.068, 0, 0.162, 0.066, 0.162).rotation.z = Math.PI / 2;
    }
    const ring = placeRing(scene, tint, x, z, 0.8);
    const glow = new THREE.PointLight(tint, 4.1, 2.75, 2);
    glow.position.set(x, 0.65, z);
    scene.add(glow);
    items.push({ record, root, ring, glow });
  }
  batchScenery(scene, plinths);
  return items;
}

function placeRing(parent, tint, x, z, radius) {
  const finish = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.68, depthWrite: false });
  const mark = piece(parent, markPlane, finish, x, floorY + 0.024, z, radius, 1, radius);
  mark.renderOrder = 2;
  return mark;
}

function installLift(scene) {
  const { x, z } = LIFT;
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  piece(root, round, bronze, 0, 0.031, 0, 1.51, 0.063, 1.51);
  piece(root, round, clay, 0, 0.063, 0, 1.41, 0.039, 1.41);
  const segments = [];
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12;
    const x = Math.cos(a);
    const z = Math.sin(a);
    piece(root, solid, brass, x * 1.32, 0.091, z * 1.32, 0.149, 0.024, 0.055).rotation.y = -a;
    const mark = piece(root, solid, emissive(0xf5bd83), x * 1.17, 0.09, z * 1.17, 0.078, 0.008, 0.033);
    mark.rotation.y = -a;
    segments.push(mark);
  }
  band(root, bronze, 0, 0.081, 0, 0.99);
  band(root, bronze, 0, 0.078, 0, 0.34);
  piece(root, solid, brass, 0, 0.081, 0, 0.23, 0.008, 0.23).rotation.y = Math.PI / 4;
  for (const side of [-1, 1]) {
    piece(root, solid, clay, side * 1.32, 0.64, 0.33, 0.145, 1.24, 0.18);
    piece(root, solid, brass, side * 1.32, 1.3, 0.33, 0.193, 0.067, 0.205);
  }
  scene.add(root);
  const ring = placeRing(scene, 0x967f53, x, z, 1.56);
  ring.position.y = 0.113;
  return { ring, segments };
}

function diffuseAir(scene) {
  const rng = randomFrom(128);
  const points = new Float32Array(135 * 3);
  for (let index = 0; index < points.length; index += 3) {
    points[index] = rng() * WIDTH;
    points[index + 1] = 0.32 + rng() * 2.45;
    points[index + 2] = rng() * DEPTH;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(points, 3));
  const motes = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.025, color: 0xc7c1a4, transparent: true, opacity: 0.29, depthWrite: false,
  }));
  scene.add(motes);
  return motes;
}

export class SceneView {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = 1.26;
    this.scene = new THREE.Scene();
    this.scene.background = color(0x0d1719);
    this.scene.fog = new THREE.FogExp2(0x112024, 0.035);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.15, 52);
    this.follow = new THREE.Vector3();
    this.ray = new THREE.Raycaster();
    this.ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.hit = new THREE.Vector3();
    this.pointer = new THREE.Vector2();

    this.scene.add(new THREE.HemisphereLight(0xbbd9df, 0x2c3027, 1.24));
    const key = new THREE.DirectionalLight(0xb0cad0, 0.64);
    key.position.set(9, 14, 10);
    this.scene.add(key);
    installFloor(this.scene);
    this.water = installWater(this.scene);
    installMachinery(this.scene);
    fixtureLights(this.scene);
    this.records = installRecords(this.scene);
    this.lift = installLift(this.scene);
    this.air = diffuseAir(this.scene);
    this.actor = diver();
    this.monster = dredged();
    this.scene.add(this.actor.root, this.monster.root);

    this.lamp = new THREE.SpotLight(0xffd2a1, 51, 9.2, 0.47, 0.65, 1.55);
    this.lamp.castShadow = true;
    this.lamp.shadow.mapSize.set(768, 768);
    this.lamp.shadow.camera.near = 0.3;
    this.lamp.shadow.camera.far = 10;
    this.lamp.shadow.normalBias = 0.025;
    this.lamp.shadow.bias = -0.00013;
    this.scene.add(this.lamp, this.lamp.target);
    this.island = new THREE.PointLight(0xffc38c, 4.2, 3.5, 2);
    this.scene.add(this.island);
    this.ripples = Array.from({ length: 14 }, () => placeRing(this.scene, 0xbd9b78, 0, 0, 1));
    this.clappers = Array.from({ length: 2 }, () => piece(this.scene, orb, brass, 0, 0, 0, 0.09, 0.09, 0.09));
    this.resize();
  }

  resize() {
    const { clientWidth, clientHeight } = this.renderer.domElement;
    const width = Math.max(clientWidth, 1);
    const height = Math.max(clientHeight, 1);
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

  setCamera(player, dt, snap) {
    const near = this.follow;
    const easing = snap ? 1 : 1 - Math.exp(-6 * dt);
    near.x += (player.x - near.x) * easing;
    near.z += (player.z - near.z) * easing;
    const mobileLift = Math.max(0, 1.33 - this.camera.aspect) * 3.9;
    this.camera.position.set(near.x + 0.82, 10.05 + mobileLift, near.z + 7.5 + mobileLift * 0.53);
    this.camera.lookAt(near.x, 0, near.z - 1.03);
    this.camera.updateMatrixWorld();
  }

  updateHero(player, time) {
    const { root, body, legs, bulb } = this.actor;
    root.position.set(player.x, 0.012, player.z);
    root.rotation.y = Math.PI / 2 - player.angle;
    const gait = player.moving ? Math.sin(player.stride * 7.2) * 0.6 : 0;
    legs[0].rotation.x = gait;
    legs[1].rotation.x = -gait;
    body.position.y = (player.moving ? Math.abs(gait) * 0.07 : 0) + Math.sin(time * 3.1) * 0.009;
    body.rotation.x = player.dash > 0 ? 0.35 : 0;
    bulb.material.color.setHex(player.lamp ? 0xffc07b : 0x342821);
    const aimX = Math.cos(player.angle);
    const aimZ = Math.sin(player.angle);
    this.lamp.position.set(player.x + aimX * 0.22, 0.92, player.z + aimZ * 0.22);
    this.lamp.target.position.set(player.x + aimX * 4.5, 0.07, player.z + aimZ * 4.5);
    this.lamp.visible = player.lamp;
    this.island.position.set(player.x, 0.9, player.z);
    this.island.intensity = player.lamp ? 4.2 : 0.23;
  }

  updateThreat(run) {
    const { player, listener, time } = run;
    const { root, core, arms, mask } = this.monster;
    const gap = Math.hypot(listener.x - player.x, listener.z - player.z);
    const ang = Math.atan2(listener.z - player.z, listener.x - player.x);
    const lit = player.lamp && Math.cos(ang - player.angle) > 0.5 && gap < 8.6;
    root.visible = run.state === 'caught' || ((gap < 3.55 || lit || listener.mode === 'hunt') && gap < 11.8 && clearPath(player, listener));
    root.position.set(listener.x, 0.011, listener.z);
    root.rotation.y = Math.PI / 2 - listener.angle;
    const faster = listener.mode === 'hunt';
    const pace = listener.moving ? Math.sin(time * (faster ? 11.8 : 6.3)) : 0;
    core.position.y = 0.02 + Math.abs(pace) * 0.081;
    core.rotation.x = faster ? 0.23 : 0.052;
    arms[0].rotation.x = pace * 0.49;
    arms[1].rotation.x = -pace * 0.49;
    mask.rotation.z = Math.cos(time * 1.6) * 0.12;
  }

  updateProps(run) {
    for (const { record, root, ring, glow } of this.records) {
      const present = !run.records.has(record.id);
      root.visible = ring.visible = glow.visible = present;
      root.rotation.y = 0.3 + Math.sin(run.time * 0.7) * 0.13;
      const gap = Math.hypot(run.player.x - record.x, run.player.z - record.z);
      ring.material.opacity = gap < 1.31 ? 0.94 : 0.37 + 0.11 * Math.sin(run.time * 2.0);
    }
    const called = run.lift.state !== 'idle';
    this.lift.ring.material.color.setHex(called ? 0xffba74 : run.records.size === RECORDS.length ? 0xc0c699 : 0x967f53);
    this.lift.ring.material.opacity = called ? 0.88 : 0.42;
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
      const size = 0.18 + pulse.age * (pulse.kind === 'splash' ? 2 : 3);
      ring.scale.set(size, 1, size);
      ring.material.color.setHex(pulse.kind === 'splash' ? quartz : 0xc89d6c);
      ring.material.opacity = (1 - pulse.age / 0.63) * 0.48;
    }
    for (const [index, clapper] of this.clappers.entries()) {
      const tossed = run.throws[index];
      clapper.visible = Boolean(tossed);
      if (!tossed) continue;
      const factor = tossed.elapsed / tossed.duration;
      clapper.position.set(
        THREE.MathUtils.lerp(tossed.from.x, tossed.to.x, factor),
        0.08 + Math.sin(factor * Math.PI) * 0.85,
        THREE.MathUtils.lerp(tossed.from.z, tossed.to.z, factor),
      );
    }
  }

  draw(run, dt = 0, snap = false) {
    this.setCamera(run.player, dt, snap);
    this.updateHero(run.player, run.time);
    this.updateThreat(run);
    this.updateProps(run);
    this.renderer.render(this.scene, this.camera);
  }
}
