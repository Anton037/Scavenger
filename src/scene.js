import * as THREE from 'three';
import { feedIsInterrupted } from './game.js';
import {
  PALETTE,
  bossHaukeModel,
  checkerFloorTexture,
  chefTorgeModel,
  color,
  coveSignTexture,
  crateMesh,
  crownMesh,
  deskFanModel,
  emissive,
  goldenDuckModel,
  lostAntonModel,
  material,
  orb,
  partyGarland,
  piece,
  posterTexture,
  round,
  schnorrerTomModel,
  solid,
  speziModel,
  tapered,
  wallPanelTexture,
} from './art.js';

const PIXEL_SCALE = 2.15;
const SCARE_SHOTS = {
  anton: { headY: 1.88, fromX: -0.84, stopZ: -0.86, speed: 14, shake: 0.4 },
  tom: { headY: 1.62, fromX: 1.48, stopZ: -1.02, speed: 7, shake: 0.3 },
  hauke: { headY: 1.66, fromX: -0.28, stopZ: -1.12, speed: 12, shake: 1.0 },
  torge: { headY: 1.61, fromX: 0, stopZ: -0.94, speed: 5, shake: 0.12 },
  duck: { headY: 1.05, fromX: 0.28, stopZ: -1.04, speed: 22, shake: 0.04 },
};

export class SceneView {
  constructor(canvas) {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = false;

    this.scene = new THREE.Scene();
    this.scene.background = color(0x05060b);
    this.scene.fog = new THREE.FogExp2(0x05060b, 0.085);

    this.camera = new THREE.PerspectiveCamera(56, 16 / 9, 0.08, 36);

    // Offscreen low-res pixel-art target + custom FNAF CRT/Office shader
    this.pixelTarget = new THREE.WebGLRenderTarget(512, 288, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
    });
    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.pixelTarget.texture },
        uTime: { value: 0 },
        uCctv: { value: 0 },
        uStatic: { value: 0 },
        uBlackout: { value: 0 },
        uShock: { value: 0 },
        uQuake: { value: 0 },
        uFlicker: { value: 1 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uCctv;
        uniform float uStatic;
        uniform float uBlackout;
        uniform float uShock;
        uniform float uQuake;
        uniform float uFlicker;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        void main() {
          vec2 uv = vUv;
          // Subtle CRT curvature in CCTV mode
          if (uCctv > 0.5) {
            vec2 c = uv * 2.0 - 1.0;
            uv += c * dot(c, c) * 0.028;
          }

          // Earthquake micro-tear + horror shock chromatic offset
          float tear = (hash(vec2(floor(uv.y * 42.0), floor(uTime * 28.0))) - 0.5);
          uv.x += tear * (uQuake * 0.008 + uStatic * 0.018);

          float ca = 0.0012 + uShock * 0.011 + uCctv * 0.0018;
          vec3 col;
          col.r = texture2D(tDiffuse, clamp(uv + vec2(ca, 0.0), 0.001, 0.999)).r;
          col.g = texture2D(tDiffuse, clamp(uv, 0.001, 0.999)).g;
          col.b = texture2D(tDiffuse, clamp(uv - vec2(ca, 0.0), 0.001, 0.999)).b;

          // Office flicker & Blackout
          col *= mix(1.0, uFlicker, 0.28);
          col *= (1.0 - uBlackout);

          // CCTV cold greenish-blue monochrome grading + scanlines
          if (uCctv > 0.5) {
            float lum = dot(col, vec3(0.30, 0.58, 0.12));
            vec3 tint = mix(col * 0.65, vec3(lum * 0.84, lum * 0.98, lum * 0.92), 0.72);
            float scan = 0.88 + 0.12 * sin(vUv.y * 320.0 + uTime * 8.0);
            float bar = smoothstep(0.92, 1.0, sin(vUv.y * 5.0 - uTime * 1.4));
            col = tint * scan + vec3(0.05, 0.08, 0.07) * bar;
          } else {
            // Subtle warm pixel-art office scanline depth
            float scan = 0.96 + 0.04 * sin(vUv.y * 240.0);
            col *= scan;
          }

          // Animated VHS / CRT static snow
          vec2 noiseCell = floor(vUv * vec2(260.0, 150.0));
          float snow = hash(noiseCell + fract(uTime * 19.37));
          float grain = (snow - 0.5) * (0.06 + uCctv * 0.07);
          col += vec3(grain);
          if (uStatic > 0.01) {
            float bandMask = step(0.68, hash(vec2(floor(vUv.y * 32.0), floor(uTime * 22.0))));
            col = mix(col, vec3(snow * 0.88), clamp(uStatic * (0.45 + bandMask * 0.45), 0.0, 0.92));
          }

          // Red shock pulse on window stings & jumpscares
          col += vec3(0.32, 0.02, 0.04) * uShock * 0.5;

          // Deep claustrophobic FNAF vignette
          vec2 d = vUv - 0.5;
          float vig = smoothstep(0.92, 0.24, length(d * vec2(1.22, 1.15)));
          col *= mix(0.26, 1.0, vig);

          gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
        }
      `,
    });
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMat));

    // Shared procedural textures & materials
    this.floorTex = checkerFloorTexture();
    this.floorTex.repeat.set(6, 6);
    this.wallTex = wallPanelTexture();
    this.wallTex.repeat.set(3, 1);
    this.posterNormalTex = posterTexture(false);
    this.posterGoldenTex = posterTexture(true);
    this.signNormalTex = coveSignTexture(false);
    this.signAngryTex = coveSignTexture(true);

    // 4 isolated lightweight roots (only 1 visible per frame = 60 FPS!)
    this.titleRoot = new THREE.Group();
    this.officeRoot = new THREE.Group();
    this.cctvRoot = new THREE.Group();
    this.jumpscareRoot = new THREE.Group();
    this.scene.add(this.titleRoot, this.officeRoot, this.cctvRoot, this.jumpscareRoot);

    this.buildTitleStage();
    this.buildOffice();
    this.buildCctvRooms();
    this.buildJumpscareStage();
    this.resize();
  }

  resize() {
    const w = Math.max(320, Math.floor(window.innerWidth));
    const h = Math.max(240, Math.floor(window.innerHeight));
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 0.85 ? 72 : aspect < 1.15 ? 62 : 56;
    this.camera.updateProjectionMatrix();

    const scale = w < 640 ? 2.4 : PIXEL_SCALE;
    const pw = Math.max(240, Math.min(620, Math.floor(w / scale)));
    const ph = Math.max(160, Math.min(360, Math.floor(h / scale)));
    if (this.pixelTarget.width !== pw || this.pixelTarget.height !== ph) {
      this.pixelTarget.setSize(pw, ph);
    }
  }

  setMode(mode) {
    this.titleRoot.visible = mode === 'title';
    this.officeRoot.visible = mode === 'office';
    this.cctvRoot.visible = mode === 'cctv';
    this.jumpscareRoot.visible = mode === 'jumpscare';
  }

  buildTitleStage() {
    const g = this.titleRoot;
    const ambient = new THREE.AmbientLight(0x182034, 0.8);
    g.add(ambient);
    this.titleSpot = new THREE.SpotLight(0xffd296, 26, 12, 0.72, 0.6, 1.3);
    this.titleSpot.position.set(1.2, 3.2, 2.4);
    this.titleSpot.target.position.set(0.8, 1.35, -1.2);
    g.add(this.titleSpot, this.titleSpot.target);

    this.titleRim = new THREE.PointLight(0xff3b56, 8, 6, 1.8);
    this.titleRim.position.set(2.3, 2.0, -2.0);
    g.add(this.titleRim);

    const wallMat = new THREE.MeshStandardMaterial({ map: this.wallTex, roughness: 0.75, metalness: 0.1 });
    piece(g, solid, wallMat, 0, 1.8, -3.2, 9, 4.4, 0.2);
    partyGarland(g, -2.5, 3.2, 2.75, -2.6);

    this.titleTorge = chefTorgeModel();
    this.titleTorge.root.position.set(0.88, 0.0, -1.35);
    this.titleTorge.root.rotation.y = -0.24;
    g.add(this.titleTorge.root);

    this.titleAnton = lostAntonModel();
    this.titleAnton.root.position.set(0.88, -0.1, -1.35);
    this.titleAnton.root.rotation.y = -0.18;
    this.titleAnton.root.visible = false;
    g.add(this.titleAnton.root);

    this.titleHauke = bossHaukeModel();
    this.titleHauke.root.position.set(0.95, 0.0, -1.45);
    this.titleHauke.root.rotation.y = -0.22;
    this.titleHauke.root.visible = false;
    g.add(this.titleHauke.root);
  }

  buildOffice() {
    const g = this.officeRoot;
    const floorMat = new THREE.MeshStandardMaterial({ map: this.floorTex, roughness: 0.72, metalness: 0.08 });
    const wallMat = new THREE.MeshStandardMaterial({ map: this.wallTex, roughness: 0.74, metalness: 0.12 });
    const darkMetal = material(0x1b2030, 0.45, 0.55);
    const shutterMat = material(0x3a4358, 0.36, 0.68);
    const deskWood = material(0x4b3428, 0.68, 0.08);
    const steelMat = material(0x6c7991, 0.36, 0.6);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x7aa4c4,
      transparent: true,
      opacity: 0.16,
      roughness: 0.2,
      metalness: 0.4,
    });

    // Ambient + Overhead swinging tungsten office bulb
    this.officeAmb = new THREE.AmbientLight(0x2d3752, 1.08);
    g.add(this.officeAmb);

    this.officeBulbGroup = new THREE.Group();
    this.officeBulbGroup.position.set(0, 3.25, -1.2);
    piece(this.officeBulbGroup, round, darkMetal, 0, -0.22, 0, 0.025, 0.44, 0.025);
    piece(this.officeBulbGroup, tapered, darkMetal, 0, -0.45, 0, 0.28, 0.14, 0.28);
    this.officeBulbOrb = piece(this.officeBulbGroup, orb, emissive(0xffd999), 0, -0.52, 0, 0.09, 0.09, 0.09);
    this.officeLight = new THREE.PointLight(0xffd49e, 11.5, 10.0, 1.45);
    this.officeLight.position.set(0, -0.62, 0.15);
    this.officeBulbGroup.add(this.officeLight);
    g.add(this.officeBulbGroup);

    // Room shell (Floor, Ceiling, Front Wall, Side Walls with doorway & window cutouts)
    piece(g, solid, floorMat, 0, -0.05, -1.4, 7.6, 0.1, 6.2);
    piece(g, solid, darkMetal, 0, 3.3, -1.4, 7.6, 0.1, 6.2);
    // Front wall facing player
    piece(g, solid, wallMat, 0, 1.65, -3.2, 6.2, 3.4, 0.2);

    // Hang party garland along front office wall (extinguishes during Power Outage!)
    this.officeGarland = partyGarland(g, -2.5, 2.5, 2.86, -3.02);

    // Clickable Chef Torge Poster cleanly centered above desk fan & Spezi can
    const posterMat = new THREE.MeshStandardMaterial({ map: this.posterNormalTex, roughness: 0.55 });
    this.officePoster = piece(g, solid, posterMat, 0.16, 2.02, -3.07, 1.12, 1.44, 0.04);

    // Side dark corridors behind Left & Right doors/windows
    for (const side of [-1, 1]) {
      const sx = side * 3.1;
      // Corridor walls & floor
      piece(g, solid, floorMat, sx + side * 1.1, -0.05, -1.5, 2.6, 0.1, 5.4);
      piece(g, solid, wallMat, sx + side * 2.2, 1.65, -1.5, 0.2, 3.4, 5.4);
      piece(g, solid, wallMat, sx + side * 1.1, 1.65, -3.9, 2.6, 3.4, 0.2);

      // Office side wall pillars framing the doorway (z = -0.35..-1.55) and window (z = -1.75..-2.85)
      piece(g, solid, wallMat, sx, 1.65, 0.55, 0.22, 3.4, 1.7);
      piece(g, solid, wallMat, sx, 2.88, -0.95, 0.22, 0.9, 1.3); // lintel above doorway
      piece(g, solid, wallMat, sx, 1.65, -1.65, 0.24, 3.4, 0.22); // pillar between door & window
      piece(g, solid, wallMat, sx, 0.52, -2.35, 0.22, 1.05, 1.25); // wall below window
      piece(g, solid, wallMat, sx, 2.85, -2.35, 0.22, 0.95, 1.25); // wall above window
      piece(g, solid, glassMat, sx, 1.72, -2.35, 0.05, 1.36, 1.18); // window pane
      piece(g, solid, darkMetal, sx, 1.72, -2.98, 0.26, 3.4, 0.26); // corner column

      // Doorway frame
      piece(g, solid, darkMetal, sx - side * 0.06, 2.42, -0.95, 0.28, 0.12, 1.32);
    }

    // Animated Steel Roller Shutters (Left & Right)
    this.leftShutter = new THREE.Group();
    this.leftShutter.position.set(-3.04, 2.65, -0.95);
    piece(this.leftShutter, solid, shutterMat, 0, 0, 0, 0.14, 2.45, 1.24);
    for (let i = -4; i <= 4; i++) {
      piece(this.leftShutter, solid, darkMetal, 0.08, i * 0.24, 0, 0.04, 0.04, 1.2);
    }
    piece(this.leftShutter, solid, emissive(0xffb84d), 0.08, -1.12, 0, 0.05, 0.12, 1.18);
    g.add(this.leftShutter);

    this.rightShutter = new THREE.Group();
    this.rightShutter.position.set(3.04, 2.65, -0.95);
    piece(this.rightShutter, solid, shutterMat, 0, 0, 0, 0.14, 2.45, 1.24);
    for (let i = -4; i <= 4; i++) {
      piece(this.rightShutter, solid, darkMetal, -0.08, i * 0.24, 0, 0.04, 0.04, 1.2);
    }
    piece(this.rightShutter, solid, emissive(0xffb84d), -0.08, -1.12, 0, 0.05, 0.12, 1.18);
    g.add(this.rightShutter);

    // 3D Wall control boxes beside doors
    this.leftBtnDoor = piece(g, solid, emissive(0xff3b56), -2.92, 1.48, -0.18, 0.08, 0.16, 0.14);
    this.leftBtnLight = piece(g, solid, emissive(0x73d7ff), -2.92, 1.24, -0.18, 0.08, 0.16, 0.14);
    this.rightBtnDoor = piece(g, solid, emissive(0xff3b56), 2.92, 1.48, -0.18, 0.08, 0.16, 0.14);
    this.rightBtnLight = piece(g, solid, emissive(0x73d7ff), 2.92, 1.24, -0.18, 0.08, 0.16, 0.14);

    // Hallway lights (illuminate Anton on left / Tom on right!)
    this.leftHallLight = new THREE.PointLight(0xd9ecff, 0, 6.2, 1.5);
    this.leftHallLight.position.set(-3.75, 2.1, -1.65);
    g.add(this.leftHallLight);

    this.rightHallLight = new THREE.PointLight(0xd9ecff, 0, 6.2, 1.5);
    this.rightHallLight.position.set(3.75, 2.1, -1.65);
    g.add(this.rightHallLight);

    // Security Desk + Props (Spezi can, coffee mug, spinning fan, stacked monitors!)
    piece(g, solid, deskWood, 0, 0.86, -2.25, 2.85, 0.12, 1.15);
    piece(g, solid, darkMetal, -1.28, 0.42, -2.25, 0.14, 0.84, 1.04);
    piece(g, solid, darkMetal, 1.28, 0.42, -2.25, 0.14, 0.84, 1.04);
    piece(g, solid, darkMetal, 0, 0.42, -2.72, 2.45, 0.78, 0.08);

    this.deskFan = deskFanModel();
    this.deskFan.root.position.set(-0.08, 0.92, -2.18);
    g.add(this.deskFan.root);

    // Spezi can & Mug that physically rattle/bounce during Hauke's earthquakes!!
    this.deskSpezi = speziModel();
    this.deskSpezi.position.set(0.54, 0.92, -2.02);
    g.add(this.deskSpezi);

    this.deskMug = new THREE.Group();
    this.deskMug.position.set(0.84, 0.92, -2.16);
    piece(this.deskMug, round, material(0xf4ebd9, 0.4, 0.1), 0, 0.11, 0, 0.085, 0.22, 0.085);
    piece(this.deskMug, round, material(0x2a140c, 0.3, 0.1), 0, 0.21, 0, 0.072, 0.02, 0.072);
    g.add(this.deskMug);

    // Stacked CRT security monitors on left side of desk
    piece(g, solid, darkMetal, -0.94, 1.16, -2.32, 0.62, 0.48, 0.46);
    this.deskCrt1 = piece(g, solid, emissive(0x2a6672), -0.94, 1.16, -2.08, 0.5, 0.36, 0.03);
    piece(g, solid, steelMat, -0.92, 1.56, -2.34, 0.5, 0.34, 0.38);
    this.deskCrt2 = piece(g, solid, emissive(0x364a3e), -0.92, 1.56, -2.14, 0.4, 0.24, 0.03);

    // Office Threats (Doorway Anton, Window Tom, Power-Outage Torge, Golden Duck!)
    this.officeAnton = lostAntonModel();
    this.officeAnton.root.position.set(-3.72, 0.02, -1.12);
    this.officeAnton.root.rotation.y = Math.PI / 2 - 0.15;
    this.officeAnton.root.visible = false;
    g.add(this.officeAnton.root);

    this.officeTom = schnorrerTomModel();
    this.officeTom.root.position.set(3.52, 0.36, -2.26);
    this.officeTom.root.rotation.y = -Math.PI / 2 + 0.16;
    this.officeTom.root.visible = false;
    g.add(this.officeTom.root);

    this.officeOutageTorge = chefTorgeModel();
    this.officeOutageTorge.root.position.set(-3.68, 0.0, -0.98);
    this.officeOutageTorge.root.rotation.y = Math.PI / 2 - 0.1;
    this.officeOutageTorge.root.visible = false;
    g.add(this.officeOutageTorge.root);
    this.outageEyeLight = new THREE.PointLight(0x88f4ff, 0, 2.2, 2.0);
    this.outageEyeLight.position.set(-3.25, 1.78, -0.95);
    g.add(this.outageEyeLight);

    this.officeGoldenDuck = goldenDuckModel();
    this.officeGoldenDuck.root.position.set(0.08, 0.0, -1.18);
    this.officeGoldenDuck.root.visible = false;
    g.add(this.officeGoldenDuck.root);
  }

  buildCctvRooms() {
    const g = this.cctvRoot;
    this.cctvAmb = new THREE.AmbientLight(0x2e3b4a, 0.9);
    g.add(this.cctvAmb);

    this.cctvSpot = new THREE.SpotLight(0xdff5ff, 28, 18, 0.88, 0.55, 1.2);
    g.add(this.cctvSpot, this.cctvSpot.target);

    this.cctvFill = new THREE.PointLight(0xffb84d, 4.5, 10, 1.6);
    g.add(this.cctvFill);

    const floorMat = new THREE.MeshStandardMaterial({ map: this.floorTex, roughness: 0.75 });
    const wallMat = new THREE.MeshStandardMaterial({ map: this.wallTex, roughness: 0.78 });
    const darkMat = material(0x161a26, 0.7, 0.15);
    const steel = material(0x7c8ca3, 0.36, 0.58);
    const redCurtain = material(0x8f1d2c, 0.65, 0.08);
    const creamCurtain = material(0xe3d6b8, 0.65, 0.06);
    const wood = material(0x6e472c, 0.72, 0.06);

    const makeRoomShell = (w, d, h = 3.6) => {
      const r = new THREE.Group();
      piece(r, solid, floorMat, 0, -0.05, 0, w, 0.1, d);
      piece(r, solid, darkMat, 0, h, 0, w, 0.1, d);
      piece(r, solid, wallMat, 0, h * 0.5, -d * 0.5, w, h, 0.2);
      piece(r, solid, wallMat, -w * 0.5, h * 0.5, 0, 0.2, h, d);
      piece(r, solid, wallMat, w * 0.5, h * 0.5, 0, 0.2, h, d);
      r.visible = false;
      g.add(r);
      return r;
    };

    this.rooms = {};

    // CAM 1A: Döner-Bühne (Show Stage with party tassels & rotating Döner spit!)
    const r1a = makeRoomShell(7.2, 6.0);
    piece(r1a, solid, wood, 0, 0.22, -1.65, 5.4, 0.44, 2.2);
    piece(r1a, solid, redCurtain, -2.55, 1.85, -2.7, 0.9, 3.2, 0.35);
    piece(r1a, solid, redCurtain, 2.55, 1.85, -2.7, 0.9, 3.2, 0.35);
    partyGarland(r1a, -2.8, 2.8, 3.0, -2.3);
    // Glowing mini-döner spit on stage corner
    this.stageSpit = new THREE.Group();
    this.stageSpit.position.set(2.1, 0.44, -1.45);
    piece(this.stageSpit, round, steel, 0, 0.62, 0, 0.05, 1.24, 0.05);
    piece(this.stageSpit, tapered, material(0x753822, 0.55, 0.06), 0, 0.66, 0, 0.22, 0.72, 0.22);
    r1a.add(this.stageSpit);
    this.rooms['1A'] = r1a;

    // CAM 1B: Gastraum (Dining Hall with Imbiss tables & party lights)
    const r1b = makeRoomShell(8.2, 7.6);
    partyGarland(r1b, -3.5, 3.5, 3.05, -2.2);
    for (const [tx, tz] of [[-2.0, -1.4], [2.0, -1.4], [-2.0, 1.2], [2.0, 1.2]]) {
      piece(r1b, solid, wood, tx, 0.78, tz, 1.5, 0.1, 1.0);
      piece(r1b, round, darkMat, tx, 0.38, tz, 0.12, 0.76, 0.12);
      piece(r1b, tapered, emissive(0xff3b56), tx - 0.3, 0.94, tz, 0.05, 0.2, 0.05);
      piece(r1b, tapered, material(0xf4ebd9, 0.4, 0.1), tx + 0.25, 0.94, tz, 0.05, 0.2, 0.05);
    }
    this.rooms['1B'] = r1b;

    // CAM 1C: Haukes Buffet-Bucht (Pirate Cove with animated striped curtains & sign!)
    const r1c = makeRoomShell(6.4, 5.8);
    piece(r1c, solid, wood, 0, 0.18, -1.5, 4.2, 0.36, 2.2);
    this.coveCurtainL = new THREE.Group();
    this.coveCurtainR = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      piece(this.coveCurtainL, solid, i % 2 === 0 ? redCurtain : creamCurtain, -1.45 + i * 0.36, 1.75, -0.52, 0.35, 3.0, 0.14);
      piece(this.coveCurtainR, solid, i % 2 === 0 ? creamCurtain : redCurtain, 0.37 + i * 0.36, 1.75, -0.52, 0.35, 3.0, 0.14);
    }
    r1c.add(this.coveCurtainL, this.coveCurtainR);
    // "AUSSER BETRIEB" sign on wooden stand
    piece(r1c, round, wood, 1.68, 0.55, 0.45, 0.06, 1.1, 0.06);
    this.coveSignMat = new THREE.MeshStandardMaterial({ map: this.signNormalTex, roughness: 0.6 });
    piece(r1c, solid, this.coveSignMat, 1.68, 1.15, 0.45, 1.18, 0.62, 0.08).rotation.y = -0.35;
    this.rooms['1C'] = r1c;

    // CAM 2A: West-Flur (Long corridor where Boss Hauke earthquake-sprints!)
    const r2a = makeRoomShell(3.8, 9.6);
    for (let z = -3.8; z <= 2.4; z += 1.6) {
      piece(r2a, round, steel, -1.78, 2.75, z, 0.08, 1.6, 0.08).rotation.x = Math.PI / 2;
      piece(r2a, solid, emissive(0xffd79a), 0, 3.48, z, 0.9, 0.06, 0.14);
    }
    this.rooms['2A'] = r2a;

    // CAM 2B: West-Ecke (Corner with poster that rarely turns into Goldene Ente!)
    const r2b = makeRoomShell(4.0, 5.4);
    this.cam2bPosterMat = new THREE.MeshStandardMaterial({ map: this.posterNormalTex, roughness: 0.55 });
    piece(r2b, solid, this.cam2bPosterMat, -1.86, 1.72, -0.8, 0.05, 1.45, 1.1);
    const cr = crateMesh(false);
    cr.position.set(1.25, 0, -1.8);
    r2b.add(cr);
    this.rooms['2B'] = r2b;

    // CAM 3: Pfand-Lager (Supply Closet full of Spezi crates)
    const r3 = makeRoomShell(3.8, 4.4);
    for (const [cx, cy, cz] of [[-1.15, 0, -1.3], [-1.15, 0.62, -1.3], [1.15, 0, -1.45]]) {
      const box = crateMesh(false);
      box.position.set(cx, cy, cz);
      r3.add(box);
    }
    const s1 = speziModel();
    s1.position.set(1.15, 0.64, -1.45);
    r3.add(s1);
    this.rooms['3'] = r3;

    // CAM 4A: Ost-Flur (East Hall with neon Imbiss sign)
    const r4a = makeRoomShell(3.8, 9.4);
    piece(r4a, solid, emissive(0xff3b56), 1.84, 2.25, -1.8, 0.06, 0.35, 1.6);
    piece(r4a, solid, emissive(0x38f2af), 1.84, 1.85, -1.8, 0.06, 0.16, 1.3);
    this.rooms['4A'] = r4a;

    // CAM 4B: Ost-Ecke (Claustrophobic corner right outside right door)
    const r4b = makeRoomShell(3.8, 5.2);
    piece(r4b, solid, steel, -1.4, 0.72, -1.6, 0.7, 1.4, 0.7);
    this.rooms['4B'] = r4b;

    // CAM 5: Fritteusen-Werkstatt (Backstage with spare crowns & fryer)
    const r5 = makeRoomShell(5.8, 5.6);
    piece(r5, solid, steel, 0, 0.55, -1.65, 2.4, 0.95, 1.0);
    piece(r5, solid, emissive(0xff8e42), -0.45, 1.05, -1.65, 0.75, 0.06, 0.62);
    for (let i = 0; i < 3; i++) {
      const spare = crownMesh(0.75);
      spare.position.set(-1.95, 1.6 + i * 0.45, -2.25);
      r5.add(spare);
    }
    this.rooms['5'] = r5;

    // Shared CCTV character puppets (zero duplicate allocations!)
    this.cctvTorge = chefTorgeModel();
    this.cctvAnton = lostAntonModel();
    this.cctvTom = schnorrerTomModel();
    this.cctvHauke = bossHaukeModel();
    for (const m of [this.cctvTorge, this.cctvAnton, this.cctvTom, this.cctvHauke]) {
      m.root.visible = false;
      g.add(m.root);
    }
  }

  buildJumpscareStage() {
    const g = this.jumpscareRoot;
    this.jsAmb = new THREE.AmbientLight(0x281018, 1.1);
    g.add(this.jsAmb);
    this.jsStrobe = new THREE.PointLight(0xffffff, 24, 8, 1.2);
    this.jsStrobe.position.set(0, 1.65, 0.8);
    g.add(this.jsStrobe);
    this.jsRed = new THREE.PointLight(0xff2040, 18, 8, 1.2);
    this.jsRed.position.set(0.6, 1.4, 0.4);
    g.add(this.jsRed);

    this.jsModels = {
      torge: chefTorgeModel(),
      anton: lostAntonModel(),
      tom: schnorrerTomModel(),
      hauke: bossHaukeModel(),
      duck: goldenDuckModel(),
    };
    for (const m of Object.values(this.jsModels)) {
      m.root.visible = false;
      g.add(m.root);
    }
  }

  renderPass(time, { cctv = 0, staticAmt = 0, blackout = 0, shock = 0, quake = 0, flicker = 1 }) {
    this.postMat.uniforms.uTime.value = time;
    this.postMat.uniforms.uCctv.value = cctv;
    this.postMat.uniforms.uStatic.value = staticAmt;
    this.postMat.uniforms.uBlackout.value = blackout;
    this.postMat.uniforms.uShock.value = shock;
    this.postMat.uniforms.uQuake.value = quake;
    this.postMat.uniforms.uFlicker.value = flicker;

    this.renderer.setRenderTarget(this.pixelTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);
  }

  drawTitle(time) {
    this.setMode('title');
    this.camera.position.set(0, 1.56, 2.05);
    this.camera.rotation.set(-0.04, 0, 0);

    // Classic FNAF 1 eerie twitching title screen!
    const cycle = time % 5.4;
    const glitch = cycle > 5.15 || (cycle > 2.6 && cycle < 2.74);
    const showAnton = cycle > 5.22 && cycle < 5.33;
    const showHauke = cycle > 2.63 && cycle < 2.71;

    this.titleTorge.root.visible = !showAnton && !showHauke;
    this.titleAnton.root.visible = showAnton;
    this.titleHauke.root.visible = showHauke;

    if (this.titleTorge.root.visible) {
      const twitch = glitch ? (Math.sin(time * 95) * 0.24) : Math.sin(time * 0.8) * 0.04;
      this.titleTorge.head.rotation.z = twitch;
      this.titleTorge.head.rotation.y = -0.18 + (glitch ? Math.cos(time * 73) * 0.18 : 0);
      this.titleTorge.eyes.visible = !glitch || Math.sin(time * 60) > 0;
    }
    this.titleSpot.intensity = glitch ? 12 + Math.random() * 20 : 25 + Math.sin(time * 3.1) * 2.5;

    this.renderPass(time, {
      cctv: 0,
      staticAmt: glitch ? 0.42 : 0.08,
      blackout: 0,
      shock: glitch ? 0.35 : 0,
      quake: 0,
      flicker: glitch ? 0.65 : 1,
    });
  }

  draw(run) {
    if (!run) return;
    const t = run.time;

    if (run.state === 'jumpscare' && run.jumpscare) {
      this.drawJumpscare(run);
      return;
    }

    if (run.monitorOpen && !run.powerOutage) {
      this.drawCctv(run);
      return;
    }

    // OFFICE VIEW
    this.setMode('office');
    const out = run.powerOutage;
    const q = (run.quake || 0) * (this.reducedMotion.matches ? 0.22 : 1);
    const shakeX = q > 0.01 ? (Math.sin(run.quakeTime * 54) * 0.095 * q) : 0;
    const shakeY = q > 0.01 ? (Math.cos(run.quakeTime * 68) * 0.075 * q) : 0;
    const shakeRoll = q > 0.01 ? (Math.sin(run.quakeTime * 46) * 0.055 * q) : 0;

    this.camera.position.set(run.lookX * 0.32 + shakeX, 1.62 + shakeY, 0.72);
    this.camera.rotation.set(-0.04, -run.lookX * 0.62, shakeRoll);

    // Steel shutters animation
    this.leftShutter.position.y = 3.55 - run.leftDoorAnim * 2.38;
    this.rightShutter.position.y = 3.55 - run.rightDoorAnim * 2.38;

    // 3D Wall switches glow
    this.leftBtnDoor.material.color.setHex(run.leftJammed ? 0x222630 : run.leftDoor ? 0x38f2af : 0xff3b56);
    this.leftBtnLight.material.color.setHex(run.leftJammed ? 0x222630 : run.leftLight ? 0xffe082 : 0x5282a8);
    this.rightBtnDoor.material.color.setHex(run.rightJammed ? 0x222630 : run.rightDoor ? 0x38f2af : 0xff3b56);
    this.rightBtnLight.material.color.setHex(run.rightJammed ? 0x222630 : run.rightLight ? 0xffe082 : 0x5282a8);

    // Spinning desk fan + earthquake desk rattle (Spezi can & mug bounce!)
    if (!out) this.deskFan.blades.rotation.z = t * 18;
    const rattle = q > 0.05 ? Math.abs(Math.sin(run.quakeTime * 44)) * q : 0;
    this.deskSpezi.position.y = 0.92 + rattle * 0.14;
    this.deskSpezi.rotation.z = q > 0.05 ? Math.sin(run.quakeTime * 39) * 0.22 * q : 0;
    this.deskMug.position.y = 0.92 + rattle * 0.09;
    this.deskMug.rotation.x = q > 0.05 ? Math.cos(run.quakeTime * 48) * 0.14 * q : 0;
    this.officeBulbGroup.rotation.z = q > 0.02 ? Math.sin(run.quakeTime * 11) * 0.18 * q : Math.sin(t * 1.4) * 0.015;
    this.officePoster.scale.setScalar(1 + run.posterBounce * 0.24);

    // Lighting (Normal vs Power Outage!)
    if (out) {
      this.officeAmb.intensity = 0.02;
      this.officeLight.intensity = 0;
      this.officeBulbOrb.material.color.setHex(0x0c0e14);
      this.officeGarland.visible = false;
      this.deskCrt1.material.color.setHex(0x07080d);
      this.deskCrt2.material.color.setHex(0x07080d);
      this.leftHallLight.intensity = 0;
      this.rightHallLight.intensity = 0;
    } else {
      this.officeAmb.intensity = 1.08;
      this.officeLight.intensity = (11.5 - q * 3.8) * run.lightFlicker;
      this.officeBulbOrb.material.color.setHex(0xffd999);
      this.officeGarland.visible = true;
      this.deskCrt1.material.color.setHex(0x2a6672);
      this.deskCrt2.material.color.setHex(0x364a3e);
      this.leftHallLight.intensity = run.leftLight ? (24 * run.lightFlicker) : 0;
      this.rightHallLight.intensity = run.rightLight ? (24 * run.lightFlicker) : 0;
    }

    // Office animatronics visibility
    const showAnton = !out && run.leftLight && run.animatronics.anton.room === 'left_door';
    const showTom = !out && run.rightLight && run.animatronics.tom.room === 'right_door';
    this.officeAnton.root.visible = showAnton;
    if (showAnton) {
      this.officeAnton.head.rotation.z = 0.18 + Math.sin(t * 3.2) * 0.04;
    }
    this.officeTom.root.visible = showTom;
    if (showTom) {
      this.officeTom.head.rotation.y = Math.sin(t * 2.5) * 0.06;
    }

    const showOutageTorge = Boolean(out && out.phase === 'jingle' && out.eyesOn);
    this.officeOutageTorge.root.visible = showOutageTorge;
    this.outageEyeLight.intensity = showOutageTorge ? 2.8 : 0;

    this.officeGoldenDuck.root.visible = Boolean(run.goldenActive && !out);
    if (this.officeGoldenDuck.root.visible) {
      this.officeGoldenDuck.head.rotation.z = -0.15 + Math.sin(t * 28) * 0.025;
    }

    const shock = Math.max(run.stingFlash * 1.4, run.doorSlamFlash * 1.1, run.goldenActive ? 0.35 : 0);
    const blackout = out && out.phase === 'blackout' ? 0.96 : 0;
    this.renderPass(t, {
      cctv: 0,
      staticAmt: run.hallucination ? 0.48 : (run.monitorAnim > 0.05 ? 0.35 : 0),
      blackout,
      shock,
      quake: Math.min(1.2, q),
      flicker: run.lightFlicker,
    });
  }

  drawCctv(run) {
    this.setMode('cctv');
    const t = run.time;
    const camId = run.activeCam;
    const videoWarning = run.antonVideo.deadline > run.time;

    // Audio-Only CAM 6 or signal disruption
    if (camId === '6' || feedIsInterrupted(run)) {
      for (const room of Object.values(this.rooms)) room.visible = false;
      for (const m of [this.cctvTorge, this.cctvAnton, this.cctvTom, this.cctvHauke]) m.root.visible = false;
      this.renderPass(t, {
        cctv: 1,
        staticAmt: camId === '6' ? 0.27 : 0.74,
        blackout: 0.98,
        shock: 0,
        quake: this.reducedMotion.matches ? 0 : Math.min(1, run.quake || 0),
        flicker: 1,
      });
      return;
    }

    for (const [id, room] of Object.entries(this.rooms)) {
      room.visible = id === camId;
    }
    for (const m of [this.cctvTorge, this.cctvAnton, this.cctvTom, this.cctvHauke]) {
      m.root.visible = false;
    }

    const sweep = run.camPan * 0.28;
    const q = (run.quake || 0) * (this.reducedMotion.matches ? 0.22 : 1);
    const qx = q > 0.02 ? Math.sin(run.quakeTime * 58) * 0.08 * q : 0;
    const qy = q > 0.02 ? Math.cos(run.quakeTime * 66) * 0.06 * q : 0;

    // Configure per-room surveillance camera angle & lighting
    if (camId === '1A') {
      this.camera.position.set(0.2 + qx, 2.35 + qy, 2.35);
      this.camera.lookAt(sweep * 2.2, 1.25, -1.6);
      this.cctvSpot.position.set(0, 3.2, 1.5);
      this.cctvSpot.target.position.set(0, 1.1, -1.6);
      this.cctvFill.position.set(0, 2.4, 0.2);
      this.stageSpit.rotation.y = t * 1.4;
    } else if (camId === '1B') {
      this.camera.position.set(-2.6 + qx, 2.55 + qy, 3.1);
      this.camera.lookAt(sweep * 3.0, 1.0, -1.2);
      this.cctvSpot.position.set(0, 3.3, 1.0);
      this.cctvSpot.target.position.set(0, 0.9, -1.5);
      this.cctvFill.position.set(0, 2.2, -1.5);
    } else if (camId === '1C') {
      this.camera.position.set(-1.3 + qx, 2.2 + qy, 2.3);
      this.camera.lookAt(0.2 + sweep * 1.5, 1.25, -1.2);
      this.cctvSpot.position.set(0, 3.1, 1.8);
      this.cctvSpot.target.position.set(0, 1.1, -1.2);
      this.cctvFill.position.set(1.5, 1.9, 1.0);
      const stage = run.animatronics.hauke.stage;
      const openAmt = stage === 0 ? 0 : stage === 1 ? 0.34 : stage === 2 ? 0.72 : 1.12;
      this.coveCurtainL.position.x = -openAmt;
      this.coveCurtainR.position.x = openAmt;
      this.coveSignMat.map = stage >= 3 ? this.signAngryTex : this.signNormalTex;
    } else if (camId === '2A') {
      this.camera.position.set(0.0 + qx, 2.35 + qy, 3.9);
      this.camera.lookAt(sweep * 0.9, 1.15, -2.6);
      this.cctvSpot.position.set(0, 3.2, 2.6);
      this.cctvSpot.target.position.set(0, 1.05, -2.2);
      this.cctvFill.position.set(0, 2.1, 0.4);
    } else if (camId === '2B') {
      this.camera.position.set(0.95 + qx, 2.25 + qy, 2.25);
      this.camera.lookAt(-0.55 + sweep * 0.8, 1.45, -1.4);
      this.cctvSpot.position.set(0.5, 3.1, 1.6);
      this.cctvSpot.target.position.set(-0.6, 1.3, -1.2);
      this.cctvFill.position.set(-0.5, 2.1, -0.5);
      this.cam2bPosterMat.map = run.goldenPoster ? this.posterGoldenTex : this.posterNormalTex;
    } else if (camId === '3') {
      this.camera.position.set(0.9 + qx, 2.6 + qy, 1.7);
      this.camera.lookAt(-0.2 + sweep * 0.6, 1.2, -1.1);
      this.cctvSpot.position.set(0.2, 3.2, 1.2);
      this.cctvSpot.target.position.set(-0.2, 1.0, -1.0);
      this.cctvFill.position.set(0, 2.0, 0);
    } else if (camId === '4A') {
      this.camera.position.set(0.0 + qx, 2.35 + qy, 3.9);
      this.camera.lookAt(sweep * 0.9, 1.15, -2.6);
      this.cctvSpot.position.set(0, 3.2, 2.2);
      this.cctvSpot.target.position.set(0, 1.1, -2.5);
      this.cctvFill.position.set(0.8, 2.2, -1.4);
    } else if (camId === '4B') {
      this.camera.position.set(-0.7 + qx, 2.2 + qy, 2.05);
      this.camera.lookAt(0.15 + sweep * 0.6, 1.45, -1.2);
      this.cctvSpot.position.set(-0.4, 3.0, 1.5);
      this.cctvSpot.target.position.set(0.2, 1.3, -1.0);
      this.cctvFill.position.set(0, 2.1, 0);
    } else if (camId === '5') {
      this.camera.position.set(1.6 + qx, 2.35 + qy, 2.2);
      this.camera.lookAt(-0.4 + sweep * 1.1, 1.3, -1.4);
      this.cctvSpot.position.set(0.6, 3.2, 1.6);
      this.cctvSpot.target.position.set(-0.3, 1.2, -1.4);
      this.cctvFill.position.set(-1.0, 2.0, -1.0);
    }

    // Place animatronics in their eerie CCTV room poses!
    const { torge, anton, tom, hauke } = run.animatronics;

    if (torge.room === camId) {
      this.cctvTorge.root.visible = true;
      if (camId === '1A') {
        this.cctvTorge.root.position.set(0, 0.44, -1.6);
        this.cctvTorge.root.rotation.y = 0;
      } else if (camId === '1B') {
        this.cctvTorge.root.position.set(0.3, 0, -2.5);
        this.cctvTorge.root.rotation.y = -0.35;
      } else if (camId === '4A') {
        this.cctvTorge.root.position.set(-0.55, 0, -1.4);
        this.cctvTorge.root.rotation.y = 0.22;
      } else if (camId === '4B') {
        this.cctvTorge.root.position.set(0.05, 0.15, 0.45);
        this.cctvTorge.root.rotation.y = -0.3;
      }
    }

    if (anton.room === camId) {
      this.cctvAnton.root.visible = true;
      if (camId === '1A') {
        this.cctvAnton.root.position.set(-1.32, 0.44, -1.55);
        this.cctvAnton.root.rotation.y = 0.18;
      } else if (camId === '1B') {
        this.cctvAnton.root.position.set(-1.35, 0, -0.4);
        this.cctvAnton.root.rotation.y = 0.45;
      } else if (camId === '5') {
        this.cctvAnton.root.position.set(0.55, 0.0, 0.55);
        this.cctvAnton.root.rotation.y = 0.52;
      } else if (camId === '3') {
        this.cctvAnton.root.position.set(0.0, 0, -0.4);
        this.cctvAnton.root.rotation.y = 0.35;
      } else if (camId === '2A') {
        this.cctvAnton.root.position.set(0.5, 0, -0.8);
        this.cctvAnton.root.rotation.y = -0.25;
      } else if (camId === '2B') {
        this.cctvAnton.root.position.set(0.2, 0.1, 0.45);
        this.cctvAnton.root.rotation.y = 0.35;
      }
      this.cctvAnton.head.rotation.z = 0.16 + Math.sin(t * 2.1) * 0.04;
      if (videoWarning) {
        const lean = this.reducedMotion.matches ? 0.16 : 0.25;
        this.cctvAnton.root.position.x = THREE.MathUtils.lerp(this.cctvAnton.root.position.x, this.camera.position.x, lean);
        this.cctvAnton.root.position.z = THREE.MathUtils.lerp(this.cctvAnton.root.position.z, this.camera.position.z, lean);
        this.cctvAnton.head.rotation.z = -0.22;
      }
    }

    if (tom.room === camId) {
      this.cctvTom.root.visible = true;
      if (camId === '1A') {
        this.cctvTom.root.position.set(1.28, 0.44, -1.55);
        this.cctvTom.root.rotation.y = -0.18;
      } else if (camId === '1B') {
        this.cctvTom.root.position.set(1.25, 0, 0.15);
        this.cctvTom.root.rotation.y = -0.6;
      } else if (camId === '4A') {
        this.cctvTom.root.position.set(0.35, 0, -0.5);
        this.cctvTom.root.rotation.y = -0.15;
      } else if (camId === '4B') {
        this.cctvTom.root.position.set(0.15, 0.15, 0.55);
        this.cctvTom.root.rotation.y = -0.32;
      }
    }

    if (camId === '1C' && hauke.stage < 3) {
      this.cctvHauke.root.visible = hauke.stage >= 1;
      if (hauke.stage === 1) {
        this.cctvHauke.root.position.set(0.0, 0.36, -1.25);
        this.cctvHauke.root.rotation.y = -0.1;
      } else if (hauke.stage === 2) {
        this.cctvHauke.root.position.set(0.0, 0.36, -0.45);
        this.cctvHauke.root.rotation.y = -0.22;
      }
      this.cctvHauke.legs[0].rotation.x = 0;
      this.cctvHauke.legs[1].rotation.x = 0;
    } else if (camId === '2A' && hauke.sprint.active && hauke.sprint.triggered) {
      // LIVE EARTHQUAKE HAUKE SPRINT STRAIGHT TOWARD THE CAMERA!!
      this.cctvHauke.root.visible = true;
      const p = Math.min(1, hauke.sprint.progress);
      this.cctvHauke.root.position.set(Math.sin(t * 24) * 0.14, Math.abs(Math.sin(t * 22)) * 0.24, -4.2 + p * 7.2);
      this.cctvHauke.root.rotation.y = Math.sin(t * 18) * 0.1;
      this.cctvHauke.legs[0].rotation.x = Math.sin(t * 22) * 0.9;
      this.cctvHauke.legs[1].rotation.x = -Math.sin(t * 22) * 0.9;
      this.cctvHauke.arms[0].rotation.x = -0.8 - Math.sin(t * 22) * 0.5;
      this.cctvHauke.arms[1].rotation.x = -0.8 + Math.sin(t * 22) * 0.5;
    }

    const staticAmt = Math.max(videoWarning ? 0.18 : 0.045, run.camSwitchStatic * 2, run.goldenPoster && camId === '2B' ? 0.22 : 0);
    this.renderPass(t, {
      cctv: 1,
      staticAmt,
      blackout: 0,
      shock: run.goldenPoster && camId === '2B' ? 0.28 : 0,
      quake: Math.min(1.2, q),
      flicker: run.lightFlicker,
    });
  }

  drawJumpscare(run) {
    this.setMode('jumpscare');
    const js = run.jumpscare;
    const p = Math.min(1, js.timer / js.duration);
    const t = js.timer;

    for (const [key, m] of Object.entries(this.jsModels)) {
      m.root.visible = key === js.who;
    }
    const active = this.jsModels[js.who] ?? this.jsModels.torge;
    const shot = SCARE_SHOTS[js.who] ?? SCARE_SHOTS.torge;
    const video = js.cause === 'video';
    const reduced = this.reducedMotion.matches;
    const lunge = reduced ? 0.82 : 1 - Math.exp(-t * (video ? 8 : shot.speed));
    const shake = reduced ? 0 : shot.shake;
    const stopZ = video ? -0.52 : shot.stopZ;
    const startZ = stopZ - (video ? 0.62 : 1.5);

    active.root.position.set(
      (video ? 0.10 : shot.fromX) * (1 - lunge) + Math.sin(t * 33) * 0.10 * shake,
      (js.who === 'duck' ? 0.35 : 0) + Math.cos(t * 18) * 0.08 * shake,
      startZ + lunge * (stopZ - startZ),
    );
    active.root.rotation.y = (1 - lunge) * -shot.fromX * 0.45;
    if (active.head) {
      active.head.rotation.z = video ? -0.24 : Math.sin(t * 14) * 0.19 * shake;
      active.head.rotation.x = video ? 0.10 : Math.cos(t * 15) * 0.15 * shake;
    }
    if (active.jaw) {
      active.jaw.scale.y = 1.15 + lunge * 0.7;
    }
    if (active.arms) {
      active.arms[0].rotation.x = -lunge * (video ? 2.1 : 1.25);
      active.arms[1].rotation.x = -lunge * (js.who === 'tom' ? 2.05 : 1.35);
    }

    this.camera.position.set(Math.sin(t * 28) * 0.06 * shake, shot.headY + Math.cos(t * 32) * 0.07 * shake, 0.38);
    this.camera.rotation.set(0, 0, Math.sin(t * 24) * 0.11 * shake);

    this.jsStrobe.intensity = video ? 17 : 8 + 5 * lunge;
    this.jsRed.intensity = video ? 2 : 7;

    this.renderPass(t, {
      cctv: video ? 1 : 0,
      staticAmt: video ? 0.12 + p * 0.25 : 0.065,
      blackout: Math.max(0, (p - 0.85) / 0.15),
      shock: video ? 0.16 : 0.32,
      quake: shake,
      flicker: 1,
    });
  }
}
