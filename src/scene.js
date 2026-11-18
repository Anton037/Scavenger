import * as THREE from 'three';
import { LIFT_WAIT } from './game.js';
import {
  BLOCKS, DEPTH, FIXTURES, LIFT, POOLS, RECORDS, ROOMS, VALVES, VENDING, WIDTH, cell, clearPath,
} from './level.js';
import {
  PALETTE, TAU, band, batchScenery, brassMaterial, color, diver, dredged, emissive,
  greedyTom, haukeBoss, material, octa, orb, piece, randomFrom, round, rubberDuck,
  solid, surfaceTexture, tapered,
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

// Dead-Cells Pixel-Art Auflösung (knackiges Nearest-Neighbor Pixel-Grid)
const PIXEL_SCALE = 2.4;

function placeInlayRing(parent, tint, x, z, radius, opacity = 0.42) {
  const finish = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity, depthWrite: false });
  const mark = piece(parent, thinRingPlane, finish, x, floorY + 0.008, z, radius, 1, radius);
  mark.renderOrder = 1;
  return mark;
}

function installFloor(scene) {
  const random = randomFrom(91);
  const texture = surfaceTexture();
  const floorFinish = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.62,
    metalness: 0.12,
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
    const baseHex = ROOMS[style - 2]?.glaze ?? 0x3b4666;
    tiles.setColorAt(index, color(baseHex).multiplyScalar(1.05 + random() * 0.18));
  }
  tiles.receiveShadow = true;
  scene.add(tiles);

  for (const room of ROOMS) {
    const cx = room.x + room.w * 0.5;
    const cz = room.z + room.d * 0.5;
    const r = Math.min(room.w, room.d) * 0.38;
    placeInlayRing(scene, PALETTE.brass, cx, cz, r, 0.36);
    placeInlayRing(scene, PALETTE.copper, cx, cz, r * 0.62, 0.26);
  }

  const sidesFinish = new THREE.MeshStandardMaterial({
    color: 0x354063,
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
    const height = dz > 0 ? 0.42 : 0.95 + random() * 0.2;
    const width = dx ? 0.24 : 1.06;
    const depth = dz ? 0.24 : 1.06;
    transform.position.set(px, height / 2 - 0.15, pz);
    transform.scale.set(width, height + 0.3, depth);
    transform.updateMatrix();
    walls.setMatrixAt(index, transform.matrix);
    walls.setColorAt(index, color(0x38456b).multiplyScalar(0.95 + random() * 0.2));
    transform.position.y = height + 0.015;
    transform.scale.set(width + 0.04, 0.06, depth + 0.04);
    transform.updateMatrix();
    rims.setMatrixAt(index, transform.matrix);
    transform.position.y = 0.11;
    transform.scale.set(width + 0.05, 0.12, depth + 0.05);
    transform.updateMatrix();
    feet.setMatrixAt(index, transform.matrix);

    if (index % 5 === 0 && dz <= 0) {
      piece(profile, tapered, enamel, px, height * 0.72, pz, 0.25, height * 1.45, 0.25);
      piece(profile, round, brass, px, height * 1.38, pz, 0.28, 0.075, 0.28);
      piece(profile, orb, enamel, px, height * 1.48, pz, 0.23, 0.15, 0.23);
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
    uniforms: { uTime: clock, uColor: { value: color(0x1f6e7a) } },
    vertexShader: `varying vec2 waterUv;
void main() {
  waterUv = uv * 2.0 - 1.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `uniform float uTime;
uniform vec3 uColor;
varying vec2 waterUv;
void main() {
  vec2 pixUv = floor(waterUv * 16.0) / 16.0;
  float angle = atan(pixUv.y, pixUv.x);
  float border = length(pixUv) + sin(angle * 6.0 + uTime * 0.6) * 0.03;
  float surface = step(border, 0.95);
  float ring = step(0.65, sin(border * 18.0 - uTime * 2.2));
  float rim = step(0.86, border) * step(border, 0.95);
  vec3 tint = uColor * 0.55 + vec3(0.22, 0.95, 0.68) * (ring * 0.18 + rim * 0.45);
  gl_FragColor = vec4(tint, surface * 0.72);
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
    piece(group, solid, brass, 18.5 + offset, 0.017, 23.8, 0.045, 0.018, 4.25);
    piece(group, solid, brass, 18.5 + offset, 0.017, 10.1, 0.045, 0.018, 3.64);
  }
  for (const { x, z, w, d, kind } of BLOCKS) {
    const detail = new THREE.Group();
    detail.position.set(x, 0, z);
    group.add(detail);
    piece(detail, round, ink, 0, 0.05, 0, Math.min(w, d) * 0.54, 0.1, Math.min(w, d) * 0.54);
    if (kind === 'pump' || kind === 'coil') {
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

  // Späti-Automat
  const vend = new THREE.Group();
  vend.position.set(VENDING.x, 0, VENDING.z);
  piece(vend, tapered, enamel, 0, 0.64, 0, 0.44, 1.22, 0.44);
  band(vend, brass, 0, 1.18, 0, 0.42);
  piece(vend, orb, ivoryMat, 0, 1.26, 0, 0.36, 0.18, 0.36);
  piece(vend, solid, emissive(PALETTE.jade), 0, 0.76, 0.36, 0.38, 0.42, 0.04);
  piece(vend, octa, emissive(PALETTE.vermilion), 0, 1.48, 0, 0.13, 0.19, 0.13);
  group.add(vend);

  batchScenery(scene, group);
}

function installValves(scene) {
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
      piece(wheel, octa, emissive(PALETTE.vermilion), Math.cos(a) * 0.24, 0.04, Math.sin(a) * 0.24, 0.07, 0.1, 0.07);
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
    piece(shape, orb, emissive(tint), x, 0.88, z, 0.16, 0.19, 0.16);
    piece(shape, tapered, brass, x, 1.02, z, 0.22, 0.08, 0.22);
    scene.add(shape);
    // Dezente Wand-Fackeln an den Rändern (lassen die Raummitte atmosphärisch dunkel)
    const lantern = new THREE.PointLight(tint, strength * 0.36, 4.8, 2.0);
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
      piece(root, octa, brass, 0, 0.16, 0, 0.24, 0.3, 0.24);
      band(root, label, 0, 0.16, 0, 0.36);
    } else if (id === 'cylinder') {
      piece(root, round, enamel, 0, 0.16, 0, 0.17, 0.34, 0.17);
      band(root, brass, 0, 0.28, 0, 0.18);
      band(root, label, 0, 0.16, 0, 0.19);
    } else {
      piece(root, octa, label, 0, 0.18, 0, 0.22, 0.36, 0.22);
      const orbit = band(root, brass, 0, 0.18, 0, 0.34);
      orbit.rotation.x = 0.6;
    }
    const ring = placeRing(scene, tint, x, z, 0.88);
    const glow = new THREE.PointLight(tint, 4.5, 3.4, 2);
    glow.position.set(x, 0.75, z);
    scene.add(glow);
    items.push({ record, root, ring, glow });
  }
  batchScenery(scene, plinths);
  return items;
}

function placeRing(parent, tint, x, z, radius) {
  const finish = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.82, depthWrite: false });
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
  const points = new Float32Array(180 * 3);
  for (let index = 0; index < points.length; index += 3) {
    points[index] = rng() * WIDTH;
    points[index + 1] = 0.32 + rng() * 2.45;
    points[index + 2] = rng() * DEPTH;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(points, 3));
  const motes = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.055, color: PALETTE.brass, transparent: true, opacity: 0.55, depthWrite: false,
  }));
  scene.add(motes);
  return motes;
}

// Volumetrischer Taschenlampen-Lichtkegel auf dem Boden (zeigt exakt die Reichweite & Richtung der Lampe)
function createFlashlightConeMesh(scene) {
  const geo = new THREE.PlaneGeometry(10.5, 9.0);
  geo.translate(5.0, 0, 0);
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
        // vLocal.x: 0 (Spieler) -> 1 (Spitze), vLocal.y: 0..1 (Breite)
        float dist = vLocal.x;
        float side = (vLocal.y - 0.5) * 2.0;
        float radial = length(vec2(dist, side * 0.65));
        float coneWidth = max(0.06, dist * 0.92);
        float inCone = 1.0 - smoothstep(coneWidth * 0.52, coneWidth, abs(side));
        float fadeOut = (1.0 - smoothstep(0.22, 0.96, radial)) * smoothstep(0.0, 0.08, dist);
        // Pixel-Art Stufen im Lichtkegel
        float intensity = floor(inCone * fadeOut * 6.0) / 6.0;
        vec3 beamColor = vec3(1.0, 0.88, 0.55);
        gl_FragColor = vec4(beamColor, intensity * 0.22);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = floorY + 0.018;
  mesh.renderOrder = 1;
  scene.add(mesh);
  return mesh;
}

// Custom WebGL Dead-Cells Pixel-Art & Dynamic Flashlight Cone Shader
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
    uLampOn: { value: 1.0 },
    uTitleMode: { value: 0.0 },
  };

  const material = new THREE.ShaderMaterial({
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
      uniform float uLampOn;
      uniform float uTitleMode;
      varying vec2 vUv;

      // 2x2 Bayer Dither Matrix für echten Dead-Cells Pixel-Art Look
      float bayer2x2(vec2 pixel) {
        vec2 p = mod(floor(pixel), 2.0);
        return (p.x + p.y * 2.0) * 0.25 - 0.375;
      }

      void main() {
        vec2 texel = 1.0 / uResolution;
        vec3 col = texture2D(tDiffuse, vUv).rgb;
        float depth = texture2D(tDepth, vUv).r;

        // 1. 1px Pixel-Art Depth- & Kontrast-Outlines (Dead-Cells Silhouette)
        float dL = texture2D(tDepth, vUv - vec2(texel.x, 0.0)).r;
        float dR = texture2D(tDepth, vUv + vec2(texel.x, 0.0)).r;
        float dU = texture2D(tDepth, vUv + vec2(0.0, texel.y)).r;
        float dD = texture2D(tDepth, vUv - vec2(0.0, texel.y)).r;
        float depthEdge = max(max(abs(depth - dL), abs(depth - dR)), max(abs(depth - dU), abs(depth - dD)));

        vec3 cL = texture2D(tDiffuse, vUv - vec2(texel.x, 0.0)).rgb;
        vec3 cU = texture2D(tDiffuse, vUv + vec2(0.0, texel.y)).rgb;
        float colorEdge = length(col - cL) + length(col - cU);
        float isOutline = clamp(step(0.0018, depthEdge) + step(0.38, colorEdge) * 0.45, 0.0, 1.0);

        // 2. Exakter Taschenlampen-Lichtkegel von Chef Torge in Blickrichtung
        vec2 delta = (vUv - uPlayerUv) * vec2(uAspect, 1.0);
        float dist = length(delta);
        vec2 dir = dist > 0.0001 ? delta / dist : uAimDirUv;
        float cosA = dot(dir, normalize(uAimDirUv));

        // Breiter, klar erkennbarer Taschenlampen-Kegel + heller Kernstrahl
        float coneOuter = smoothstep(0.55, 0.86, cosA);
        float coneCore = smoothstep(0.84, 0.98, cosA);
        float coneReach = (1.0 - smoothstep(0.26, 0.82, dist)) * smoothstep(0.01, 0.06, dist);
        float coneLight = (coneOuter * 0.92 + coneCore * 0.45) * coneReach * uLampOn;

        // Kleiner persönlicher Nahbereichs-Schein direkt um Chef Torge
        float auraRadius = uLampOn > 0.5 ? 0.22 : 0.15;
        float personalAura = (1.0 - smoothstep(0.04, auraRadius, dist)) * (uLampOn > 0.5 ? 0.82 : 0.54);

        // Im Hauptmenü beleuchten wir die Arena-Bühne breit
        float titleLight = uTitleMode * (1.0 - smoothstep(0.25, 0.95, length((vUv - vec2(0.48, 0.52)) * vec2(uAspect, 1.0)))) * 1.05;

        // 3. Gesamt-Lichtstufe & Bayer-geditherte Dead-Cells Cel-Shading-Bänder
        float rawLight = max(max(coneLight, personalAura), titleLight);
        float dither = bayer2x2(vUv * uResolution) * 0.075;
        float lit = rawLight + dither;

        // Außerhalb des Taschenlampen-Kegels ist es ECHT DUNKEL (Dead-Cells Indigo-Schatten ~0.22),
        // aber Wände, Fliesen & Gegner-Silhouetten bleiben schemenhaft sichtbar!
        float celBand;
        if (lit > 0.82) celBand = 1.32;
        else if (lit > 0.46) celBand = 1.02;
        else if (lit > 0.18) celBand = 0.58;
        else celBand = 0.22;

        vec3 darkIndigoTint = vec3(0.48, 0.58, 1.16);
        vec3 warmBeamTint = vec3(1.12, 1.01, 0.86);
        vec3 lightTint = mix(darkIndigoTint, warmBeamTint, clamp(rawLight * 1.25, 0.0, 1.0));

        // 4. Farb-Quantisierung & Volumetrischer Lichtkegel-Schimmer
        vec3 quantAlbedo = floor(col * 13.0 + 0.5) / 13.0;
        vec3 shaded = quantAlbedo * celBand * lightTint;

        // Goldener volumetrischer Lichtstrahl-Schimmer im Kegel
        float beamGlow = coneOuter * coneReach * uLampOn * 0.14;
        shaded += vec3(1.0, 0.88, 0.54) * beamGlow;

        // 5. Emissive Highlights (Leuchtende Augen von Anton/Hauke/Tom im Dunkeln, Schätze, Schallringe)
        float maxC = max(col.r, max(col.g, col.b));
        float minC = min(col.r, min(col.g, col.b));
        float isNeon = smoothstep(0.62, 0.88, maxC) * smoothstep(0.22, 0.45, maxC - minC);
        shaded = max(shaded, col * isNeon * 1.18);

        // 6. Dunkle 1px Dead-Cells Pixel-Outlines
        vec3 outlineColor = vec3(0.02, 0.02, 0.06);
        vec3 finalCol = mix(shaded, outlineColor, isOutline * clamp(celBand * 0.85 + isNeon, 0.25, 0.88));

        // 7. Rotes Horror-Pulsieren am Bildschirmrand bei Gefahr
        float vigDist = length(vUv - 0.5) * 1.42;
        float pulse = (0.5 + 0.5 * sin(uTime * 8.0)) * uDanger;
        finalCol += vec3(0.55, 0.05, 0.12) * smoothstep(0.52, 1.05, vigDist) * pulse * 0.42;

        gl_FragColor = vec4(finalCol, 1.0);
      }
    `,
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
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

    // Sauberes 3D-Basislicht für klare Texturen & Normalen im Offscreen-Buffer
    // (Die echte Dunkelheit außerhalb des Kegels & der helle Taschenlampen-Kegel werden im WebGL-Shader berechnet!)
    this.ambient = new THREE.HemisphereLight(0xdce6ff, 0x262f4d, 1.25);
    this.scene.add(this.ambient);
    const key = new THREE.DirectionalLight(0xfff0d4, 0.95);
    key.position.set(14, 22, 14);
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

    // 3D-Taschenlampen-SpotLight für plastische Glanzlichter & Schattenwurf im Kegel
    this.lamp = new THREE.SpotLight(0xffe29e, 65, 14.0, 0.65, 0.45, 1.2);
    this.lamp.castShadow = true;
    this.lamp.shadow.mapSize.set(512, 512);
    this.lamp.shadow.camera.near = 0.3;
    this.lamp.shadow.camera.far = 14;
    this.scene.add(this.lamp, this.lamp.target);

    // Sichtbarer volumetrischer Lichtkegel am Boden
    this.beamCone = createFlashlightConeMesh(this.scene);

    // Kleines Nahbereichs-Licht direkt um Chef Torge
    this.island = new THREE.PointLight(0x8aa8ff, 2.5, 3.4, 1.8);
    this.scene.add(this.island);

    this.ripples = Array.from({ length: 14 }, () => placeRing(this.scene, PALETTE.brass, 0, 0, 1));
    this.clappers = Array.from({ length: 4 }, () => rubberDuck(this.scene));

    // Pixel-Art Offscreen RenderTarget + DepthTexture
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

  resize() {
    const { clientWidth, clientHeight } = this.renderer.domElement;
    const width = Math.max(clientWidth || window.innerWidth, 1);
    const height = Math.max(clientHeight || window.innerHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);

    const pw = Math.max(260, Math.round(width / PIXEL_SCALE));
    const ph = Math.max(160, Math.round(height / PIXEL_SCALE));
    this.pixelTarget.setSize(pw, ph);
    this.post.uniforms.uResolution.value.set(pw, ph);
    this.post.uniforms.uAspect.value = width / height;
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
        this.novaRing.material.opacity = (1 - progress) * 0.92;
      }
    }

    bulb.material.color.setHex(player.lamp ? 0xffe082 : 0x242838);
    const aimX = Math.cos(player.angle);
    const aimZ = Math.sin(player.angle);
    this.lamp.position.set(player.x + aimX * 0.25, 2.4, player.z + aimZ * 0.25);
    this.lamp.target.position.set(player.x + aimX * 5.2, 0.0, player.z + aimZ * 5.2);
    this.lamp.visible = player.lamp;

    this.beamCone.visible = player.lamp;
    this.beamCone.position.set(player.x, floorY + 0.018, player.z);
    this.beamCone.rotation.y = -player.angle;

    this.island.position.set(player.x, 1.25, player.z);
    this.island.intensity = player.lamp ? 3.5 : 1.8;
  }

  updateActor(model, agent, player, time, alwaysShow) {
    if (!agent) {
      model.root.visible = false;
      return;
    }
    const { root, core, arms, mask, stars, eyes, belly } = model;
    const gap = Math.hypot(agent.x - player.x, agent.z - player.z);
    const hasLOS = alwaysShow || (gap < 15.5 && clearPath(player, agent));

    // KEIN künstliches Ausblenden ohne Taschenlampe mehr!
    // Sobald eine Sichtlinie besteht (keine Wand dazwischen), ist der Gegner physisch da:
    // Im Lichtkegel voll ausgeleuchtet, im Dunkeln als dunkle Silhouette mit leuchtenden Augen!
    root.visible = hasLOS;
    if (eyes) {
      eyes.visible = hasLOS && (agent.koTimer ?? 0) <= 0;
    }
    if (belly) {
      belly.material.emissive?.setHex((agent.hitFlash ?? 0) > 0 ? 0xffffff : 0x000000);
    }

    root.position.set(agent.x, 0.011, agent.z);
    root.rotation.y = Math.PI / 2 - agent.angle;
    const faster = agent.mode === 'hunt' || agent.mode === 'flee';
    const pace = agent.moving ? Math.sin(time * (faster ? 11.8 : 6.3)) : 0;
    const isKO = (agent.koTimer ?? 0) > 0;
    core.position.y = isKO ? -0.18 : 0.02 + Math.abs(pace) * 0.081;
    core.rotation.x = isKO ? -1.15 : agent.stunned > 0 ? -0.45 : faster ? 0.2 : 0.052;
    arms[0].rotation.x = pace * 0.45;
    arms[1].rotation.x = -pace * 0.45;
    mask.rotation.z = Math.cos(time * 1.6) * 0.1;
    if (stars) {
      stars.visible = (agent.stunned > 0 || isKO) && hasLOS;
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
      snack.visible = Boolean(showHauke && (hauke.koTimer ?? 0) <= 0);
      if (!snack.visible) continue;
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
      ring.material.opacity = gap < 1.35 ? 0.94 : 0.48 + 0.14 * Math.sin(run.time * 2.4);
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
    this.lift.ring.material.opacity = called ? 0.9 : 0.55;
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
      ring.material.opacity = (1 - pulse.age / 0.63) * 0.68;
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

  renderPixelPipeline(run, isTitle = false) {
    const { player, listener, hauke, time } = run;
    const u = this.post.uniforms;
    u.uTime.value = time;
    u.uLampOn.value = player.lamp ? 1.0 : 0.0;
    u.uTitleMode.value = isTitle ? 1.0 : 0.0;

    // Projektion von Chef Torges Weltposition & Blickrichtung in Screen-Space-UVs für den Taschenlampen-Shader
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

    const dAnton = listener ? Math.hypot(listener.x - player.x, listener.z - player.z) : 99;
    const dHauke = hauke ? Math.hypot(hauke.x - player.x, hauke.z - player.z) : 99;
    const minDist = Math.min(dAnton, dHauke);
    u.uDanger.value = isTitle ? 0.0 : Math.max(0, 1 - minDist / 6.5);

    this.renderer.setRenderTarget(this.pixelTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.post.postScene, this.post.postCam);
  }

  drawTitle(run, time) {
    run.time = time;
    run.player.x = 18.5;
    run.player.z = 16.4;
    run.player.angle = -0.35;
    run.player.lamp = true;
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
    this.renderPixelPipeline(run, true);
  }

  draw(run, dt = 0, snap = false) {
    this.setCamera(run, dt, snap);
    this.updateHero(run.player, run.time);
    this.updateThreat(run, false);
    this.updateProps(run);
    this.renderPixelPipeline(run, false);
  }
}
