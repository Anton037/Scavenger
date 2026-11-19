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
  crtScreenTexture,
  deskFanModel,
  deskWoodTexture,
  donerSpitModel,
  dustParticlesModel,
  emissive,
  goldenDuckModel,
  lostAntonModel,
  material,
  menuBoardTexture,
  miniDuckModel,
  neonSignTexture,
  officePhoneModel,
  orb,
  partyGarland,
  piece,
  posterTexture,
  round,
  rulesPosterTexture,
  schnorrerTomModel,
  shutterTexture,
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
  constructor(canvas, settings = {}) {
    this.reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.settings = {
      graphics: settings.graphics === 'retro' ? 'retro' : 'hd',
      crt: ['subtle', 'strong', 'off'].includes(settings.crt) ? settings.crt : 'subtle',
      reducedMotion: Boolean(settings.reducedMotion),
    };

    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.14;
    this.renderer.shadowMap.enabled = this.settings.graphics === 'hd';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = color(0x05060b);
    this.scene.fog = new THREE.FogExp2(0x05060b, 0.072);

    this.camera = new THREE.PerspectiveCamera(56, 16 / 9, 0.08, 38);
    this.raycaster = new THREE.Raycaster();
    this.clickables = [];

    // Offscreen render target + upgraded FNAF cinematic/CRT shader
    const isRetro = this.settings.graphics === 'retro';
    this.pixelTarget = new THREE.WebGLRenderTarget(960, 540, {
      minFilter: isRetro ? THREE.NearestFilter : THREE.LinearFilter,
      magFilter: isRetro ? THREE.NearestFilter : THREE.LinearFilter,
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
        uCrtStrength: { value: 0.55 },
        uMonitorFlash: { value: 0 },
        uRetro: { value: isRetro ? 1.0 : 0.0 },
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
        uniform float uCrtStrength;
        uniform float uMonitorFlash;
        uniform float uRetro;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        void main() {
          vec2 uv = vUv;

          // Subtle CRT barrel curvature in CCTV mode or Retro mode
          float curve = (uCctv * 0.022 + uRetro * 0.008) * max(0.35, uCrtStrength);
          if (curve > 0.001) {
            vec2 c = uv * 2.0 - 1.0;
            uv += c * dot(c, c) * curve;
          }

          // Earthquake micro-tear + horror shock chromatic offset
          float tear = (hash(vec2(floor(uv.y * 48.0), floor(uTime * 28.0))) - 0.5);
          uv.x += tear * (uQuake * 0.007 + uStatic * 0.016);

          float ca = 0.0007 + uShock * 0.009 + uCctv * 0.0016 + uRetro * 0.0006;
          vec3 col;
          col.r = texture2D(tDiffuse, clamp(uv + vec2(ca, 0.0), 0.001, 0.999)).r;
          col.g = texture2D(tDiffuse, clamp(uv, 0.001, 0.999)).g;
          col.b = texture2D(tDiffuse, clamp(uv - vec2(ca, 0.0), 0.001, 0.999)).b;

          // Subtle highlight lift (cinematic bloom feel on neon & eyes)
          vec3 bloomSample = (
            texture2D(tDiffuse, clamp(uv + vec2(0.004, 0.003), 0.001, 0.999)).rgb +
            texture2D(tDiffuse, clamp(uv + vec2(-0.004, -0.003), 0.001, 0.999)).rgb +
            texture2D(tDiffuse, clamp(uv + vec2(0.004, -0.003), 0.001, 0.999)).rgb +
            texture2D(tDiffuse, clamp(uv + vec2(-0.004, 0.003), 0.001, 0.999)).rgb
          ) * 0.25;
          vec3 bright = max(bloomSample - vec3(0.62), vec3(0.0));
          col += bright * (0.42 + uCctv * 0.18);

          // Office flicker & Blackout
          col *= mix(1.0, uFlicker, 0.24);
          col *= (1.0 - uBlackout);

          // CCTV cold night-vision grading + scanlines
          if (uCctv > 0.5) {
            float lum = dot(col, vec3(0.30, 0.58, 0.12));
            vec3 tint = mix(col * 0.72, vec3(lum * 0.82, lum * 1.0, lum * 0.93), 0.68);
            float scanAmt = 0.09 * uCrtStrength;
            float scan = (1.0 - scanAmt) + scanAmt * sin(vUv.y * 360.0 + uTime * 8.0);
            float bar = smoothstep(0.93, 1.0, sin(vUv.y * 5.0 - uTime * 1.5));
            col = tint * scan + vec3(0.04, 0.075, 0.065) * bar * max(0.3, uCrtStrength);
          } else if (uCrtStrength > 0.01) {
            float scan = 1.0 - (0.025 * uCrtStrength) + (0.025 * uCrtStrength) * sin(vUv.y * 280.0);
            col *= scan;
          }

          // Animated film grain / VHS static snow
          vec2 noiseRes = uRetro > 0.5 ? vec2(260.0, 150.0) : vec2(480.0, 270.0);
          vec2 noiseCell = floor(vUv * noiseRes);
          float snow = hash(noiseCell + fract(uTime * 19.37));
          float grainAmt = (0.022 + uCctv * 0.048 + uRetro * 0.026) * max(0.25, uCrtStrength);
          col += vec3((snow - 0.5) * grainAmt);

          if (uStatic > 0.01) {
            float bandMask = step(0.68, hash(vec2(floor(vUv.y * 34.0), floor(uTime * 22.0))));
            col = mix(col, vec3(snow * 0.88), clamp(uStatic * (0.42 + bandMask * 0.45), 0.0, 0.92));
          }

          // Smooth CRT horizontal power-on beam when flipping monitor!
          if (uMonitorFlash > 0.01) {
            float distY = abs(vUv.y - 0.5);
            float beam = exp(-distY * (18.0 + (1.0 - uMonitorFlash) * 28.0)) * uMonitorFlash;
            col += vec3(0.55, 0.92, 0.82) * beam * 0.72;
          }

          // Red shock pulse on window stings & jumpscares
          col += vec3(0.32, 0.02, 0.04) * uShock * 0.46;

          // Deep claustrophobic vignette
          vec2 d = vUv - 0.5;
          float vig = smoothstep(0.95, 0.28, length(d * vec2(1.18, 1.12)));
          col *= mix(0.32, 1.0, vig);

          gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
        }
      `,
    });
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMat));

    // Shared procedural HD textures
    this.floorTex = checkerFloorTexture();
    this.floorTex.repeat.set(6, 6);
    this.wallTex = wallPanelTexture();
    this.wallTex.repeat.set(3, 1);
    this.deskTex = deskWoodTexture();
    this.shutterTex = shutterTexture();
    this.posterNormalTex = posterTexture(false);
    this.posterGoldenTex = posterTexture(true);
    this.rulesPosterTex = rulesPosterTexture();
    this.menuBoardTex = menuBoardTexture();
    this.signNormalTex = coveSignTexture(false);
    this.signAngryTex = coveSignTexture(true);
    this.neonStageTex = neonSignTexture("TORGE'S IMBISS", '24H · MITTERNACHTS-DÖNER', '#ff3b56', '#ffcf56');
    this.neonHallTex = neonSignTexture('DÖNER & SPEZI', 'NUR MIT KASSENBON', '#38f2af', '#ff5ea8');
    this.crtRadarTex = crtScreenTexture('radar');
    this.crtSeismicTex = crtScreenTexture('seismic');

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
    this.applySettings(this.settings);
  }

  isReducedMotion() {
    return Boolean(this.settings.reducedMotion || this.reducedMotionQuery.matches);
  }

  applySettings(next = {}) {
    if (next.graphics === 'retro' || next.graphics === 'hd') {
      this.settings.graphics = next.graphics;
    }
    if (['subtle', 'strong', 'off'].includes(next.crt)) {
      this.settings.crt = next.crt;
    }
    if (typeof next.reducedMotion === 'boolean') {
      this.settings.reducedMotion = next.reducedMotion;
    }
    const isRetro = this.settings.graphics === 'retro';
    this.renderer.shadowMap.enabled = !isRetro;
    this.renderer.shadowMap.needsUpdate = true;
    this.pixelTarget.texture.minFilter = isRetro ? THREE.NearestFilter : THREE.LinearFilter;
    this.pixelTarget.texture.magFilter = isRetro ? THREE.NearestFilter : THREE.LinearFilter;
    this.pixelTarget.texture.needsUpdate = true;
    this.canvas.classList.toggle('retro-canvas', isRetro);

    this.postMat.uniforms.uRetro.value = isRetro ? 1.0 : 0.0;
    this.postMat.uniforms.uCrtStrength.value = this.settings.crt === 'off' ? 0.0 : this.settings.crt === 'strong' ? 1.15 : 0.55;
    this.resize();
  }

  resize() {
    const w = Math.max(320, Math.floor(window.innerWidth));
    const h = Math.max(240, Math.floor(window.innerHeight));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = 56;
    this.camera.updateProjectionMatrix();

    let pw;
    let ph;
    if (this.settings.graphics === 'retro') {
      const scale = w < 640 ? 2.4 : PIXEL_SCALE;
      pw = Math.max(240, Math.min(620, Math.floor(w / scale)));
      ph = Math.max(160, Math.min(360, Math.floor(h / scale)));
    } else {
      const hdScale = Math.min(dpr, 1.5);
      pw = Math.max(640, Math.min(1600, Math.floor(w * hdScale)));
      ph = Math.max(360, Math.min(900, Math.floor(h * hdScale)));
    }
    if (this.pixelTarget.width !== pw || this.pixelTarget.height !== ph) {
      this.pixelTarget.setSize(pw, ph);
    }
  }

  pickOfficeProp(rx, ry) {
    if (!this.officeRoot.visible || !this.clickables.length) return null;
    const ndc = new THREE.Vector2(rx * 2 - 1, -(ry * 2 - 1));
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.clickables, true);
    for (const hit of hits) {
      let cur = hit.object;
      while (cur) {
        if (cur.userData?.propKind) return cur.userData.propKind;
        cur = cur.parent;
      }
    }
    return null;
  }

  setMode(mode) {
    this.titleRoot.visible = mode === 'title';
    this.officeRoot.visible = mode === 'office';
    this.cctvRoot.visible = mode === 'cctv';
    this.jumpscareRoot.visible = mode === 'jumpscare';
  }

  buildTitleStage() {
    const g = this.titleRoot;
    const ambient = new THREE.AmbientLight(0x1e2842, 0.95);
    g.add(ambient);

    this.titleSpot = new THREE.SpotLight(0xffd79e, 34, 14, 0.68, 0.65, 1.25);
    this.titleSpot.position.set(1.1, 3.3, 2.5);
    this.titleSpot.target.position.set(0.88, 1.35, -1.35);
    this.titleSpot.castShadow = true;
    this.titleSpot.shadow.mapSize.set(512, 512);
    g.add(this.titleSpot, this.titleSpot.target);

    this.titleRim = new THREE.PointLight(0xff3b56, 12, 7.5, 1.6);
    this.titleRim.position.set(2.35, 2.0, -2.0);
    g.add(this.titleRim);

    const cyanFill = new THREE.PointLight(0x52c8ff, 7, 7, 1.8);
    cyanFill.position.set(-1.1, 1.7, -1.6);
    g.add(cyanFill);

    const wallMat = new THREE.MeshStandardMaterial({ map: this.wallTex, roughness: 0.72, metalness: 0.12 });
    const floorMat = new THREE.MeshStandardMaterial({ map: this.floorTex, roughness: 0.68, metalness: 0.1 });
    piece(g, solid, floorMat, 0, -0.05, -1.0, 9, 0.1, 6);
    piece(g, solid, wallMat, 0, 1.8, -3.2, 9.4, 4.4, 0.2);

    // Stage Neon Sign & rotating Döner spit in background!
    const neonMat = new THREE.MeshBasicMaterial({ map: this.neonStageTex });
    piece(g, solid, neonMat, 0.92, 2.48, -3.04, 2.3, 0.82, 0.06);
    partyGarland(g, -2.5, 3.3, 3.24, -2.65);

    this.titleSpit = donerSpitModel();
    this.titleSpit.root.position.set(2.35, 0.0, -2.35);
    this.titleSpit.root.rotation.y = -0.45;
    g.add(this.titleSpit.root);

    this.titleDust = dustParticlesModel(45);
    g.add(this.titleDust);

    this.titleTorge = chefTorgeModel();
    this.titleTorge.root.position.set(0.88, 0.0, -1.35);
    this.titleTorge.root.rotation.y = -0.24;
    g.add(this.titleTorge.root);

    this.titleAnton = lostAntonModel();
    this.titleAnton.root.position.set(0.88, -0.1, -1.35);
    this.titleAnton.root.rotation.y = -0.18;
    this.titleAnton.root.visible = false;
    g.add(this.titleAnton.root);

    this.titleTom = schnorrerTomModel();
    this.titleTom.root.position.set(0.9, 0.0, -1.32);
    this.titleTom.root.rotation.y = -0.2;
    this.titleTom.root.visible = false;
    g.add(this.titleTom.root);

    this.titleHauke = bossHaukeModel();
    this.titleHauke.root.position.set(0.95, 0.0, -1.45);
    this.titleHauke.root.rotation.y = -0.22;
    this.titleHauke.root.visible = false;
    g.add(this.titleHauke.root);
  }

  buildOffice() {
    const g = this.officeRoot;
    const floorMat = new THREE.MeshStandardMaterial({ map: this.floorTex, roughness: 0.62, metalness: 0.12 });
    const wallMat = new THREE.MeshStandardMaterial({ map: this.wallTex, roughness: 0.72, metalness: 0.12 });
    const darkMetal = material(0x191e2e, 0.42, 0.58);
    const shutterMat = new THREE.MeshStandardMaterial({ map: this.shutterTex, roughness: 0.4, metalness: 0.65 });
    const deskWood = new THREE.MeshStandardMaterial({ map: this.deskTex, roughness: 0.62, metalness: 0.08 });
    const steelMat = material(0x6c7991, 0.34, 0.65);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x7aa4c4,
      transparent: true,
      opacity: 0.16,
      roughness: 0.18,
      metalness: 0.45,
    });

    // Ambient + Overhead swinging tungsten office bulb with real shadows & volumetric light cone!
    this.officeAmb = new THREE.AmbientLight(0x303c5a, 1.05);
    g.add(this.officeAmb);

    this.officeBulbGroup = new THREE.Group();
    this.officeBulbGroup.position.set(0, 3.25, -1.2);
    piece(this.officeBulbGroup, round, darkMetal, 0, -0.22, 0, 0.025, 0.44, 0.025);
    piece(this.officeBulbGroup, tapered, darkMetal, 0, -0.45, 0, 0.3, 0.14, 0.3);
    this.officeBulbOrb = piece(this.officeBulbGroup, orb, emissive(0xffdf9e), 0, -0.52, 0, 0.095, 0.095, 0.095);

    const coneGeo = new THREE.ConeGeometry(2.05, 2.8, 24, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xffd596,
      transparent: true,
      opacity: 0.055,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.officeLightCone = new THREE.Mesh(coneGeo, coneMat);
    this.officeLightCone.position.set(0, -1.9, 0);
    this.officeBulbGroup.add(this.officeLightCone);

    this.officeLight = new THREE.PointLight(0xffd49e, 14.5, 11.5, 1.4);
    this.officeLight.position.set(0, -0.62, 0.15);
    this.officeLight.castShadow = true;
    this.officeLight.shadow.mapSize.set(512, 512);
    this.officeLight.shadow.bias = -0.002;
    this.officeBulbGroup.add(this.officeLight);
    g.add(this.officeBulbGroup);

    // Floating dust particles illuminated by overhead bulb
    this.officeDust = dustParticlesModel(55);
    g.add(this.officeDust);

    // Room shell (Floor, Ceiling, Front Wall, Side Walls with doorway & window cutouts)
    piece(g, solid, floorMat, 0, -0.05, -1.4, 7.6, 0.1, 6.2);
    piece(g, solid, darkMetal, 0, 3.3, -1.4, 7.6, 0.1, 6.2);
    piece(g, solid, wallMat, 0, 1.65, -3.2, 6.2, 3.4, 0.2);

    // Ceiling conduits & hanging cables for extra atmosphere
    for (const cx of [-1.85, 1.95]) {
      piece(g, round, darkMetal, cx, 3.18, -1.4, 0.04, 5.2, 0.04).rotation.x = Math.PI / 2;
    }

    // Hang party garland high along front office wall (extinguishes during Power Outage!)
    this.officeGarland = partyGarland(g, -2.5, 2.5, 3.16, -3.02);

    // Clickable Chef Torge Poster cleanly centered above desk fan & Spezi can
    const posterMat = new THREE.MeshStandardMaterial({ map: this.posterNormalTex, roughness: 0.52 });
    this.officePoster = piece(g, solid, posterMat, 0.24, 1.98, -3.07, 1.1, 1.4, 0.04);
    this.officePoster.userData.propKind = 'poster';
    this.clickables.push(this.officePoster);

    // Hilarious Imbiss-Hausordnung poster on left side of front wall!
    const rulesMat = new THREE.MeshStandardMaterial({ map: this.rulesPosterTex, roughness: 0.62 });
    piece(g, solid, rulesMat, -1.52, 1.98, -3.07, 0.94, 1.16, 0.035);

    // Side dark corridors behind Left & Right doors/windows
    for (const side of [-1, 1]) {
      const sx = side * 3.1;
      piece(g, solid, floorMat, sx + side * 1.1, -0.05, -1.5, 2.6, 0.1, 5.4);
      piece(g, solid, wallMat, sx + side * 2.2, 1.65, -1.5, 0.2, 3.4, 5.4);
      piece(g, solid, wallMat, sx + side * 1.1, 1.65, -3.9, 2.6, 3.4, 0.2);

      // Office side wall pillars framing the doorway & window
      piece(g, solid, wallMat, sx, 1.65, 0.55, 0.22, 3.4, 1.7);
      piece(g, solid, wallMat, sx, 2.88, -0.95, 0.22, 0.9, 1.3);
      piece(g, solid, wallMat, sx, 1.65, -1.65, 0.24, 3.4, 0.22);
      piece(g, solid, wallMat, sx, 0.52, -2.35, 0.22, 1.05, 1.25);
      piece(g, solid, wallMat, sx, 2.85, -2.35, 0.22, 0.95, 1.25);
      piece(g, solid, glassMat, sx, 1.72, -2.35, 0.05, 1.36, 1.18);
      piece(g, solid, darkMetal, sx, 1.72, -2.98, 0.26, 3.4, 0.26);

      // Heavy metal doorway frame & shutter tracks
      piece(g, solid, darkMetal, sx - side * 0.06, 2.42, -0.95, 0.28, 0.14, 1.34);
      piece(g, solid, darkMetal, sx - side * 0.04, 1.25, -0.32, 0.14, 2.45, 0.08);
      piece(g, solid, darkMetal, sx - side * 0.04, 1.25, -1.58, 0.14, 2.45, 0.08);
    }

    // Animated Industrial Steel Roller Shutters (Left & Right) with hazard stripes
    this.leftShutter = new THREE.Group();
    this.leftShutter.position.set(-3.04, 2.65, -0.95);
    piece(this.leftShutter, solid, shutterMat, 0, 0, 0, 0.14, 2.45, 1.24);
    g.add(this.leftShutter);

    this.rightShutter = new THREE.Group();
    this.rightShutter.position.set(3.04, 2.65, -0.95);
    piece(this.rightShutter, solid, shutterMat, 0, 0, 0, 0.14, 2.45, 1.24);
    g.add(this.rightShutter);

    // 3D Wall control boxes beside doors
    for (const side of [-1, 1]) {
      piece(g, solid, darkMetal, side * 2.98, 1.36, -0.18, 0.1, 0.58, 0.22);
    }
    this.leftBtnDoor = piece(g, solid, emissive(0xff3b56), -2.92, 1.48, -0.18, 0.08, 0.16, 0.14);
    this.leftBtnLight = piece(g, solid, emissive(0x73d7ff), -2.92, 1.24, -0.18, 0.08, 0.16, 0.14);
    this.rightBtnDoor = piece(g, solid, emissive(0xff3b56), 2.92, 1.48, -0.18, 0.08, 0.16, 0.14);
    this.rightBtnLight = piece(g, solid, emissive(0x73d7ff), 2.92, 1.24, -0.18, 0.08, 0.16, 0.14);

    // Hallway lights (illuminate Anton on left / Tom on right!)
    this.leftHallLight = new THREE.PointLight(0xd9ecff, 0, 6.5, 1.45);
    this.leftHallLight.position.set(-3.75, 2.1, -1.65);
    g.add(this.leftHallLight);

    this.rightHallLight = new THREE.PointLight(0xd9ecff, 0, 6.5, 1.45);
    this.rightHallLight.position.set(3.75, 2.1, -1.65);
    g.add(this.rightHallLight);

    // Security Desk + Rich Interactive Props!
    piece(g, solid, deskWood, 0, 0.86, -2.25, 2.95, 0.12, 1.18);
    piece(g, solid, darkMetal, -1.32, 0.42, -2.25, 0.14, 0.84, 1.06);
    piece(g, solid, darkMetal, 1.32, 0.42, -2.25, 0.14, 0.84, 1.06);
    piece(g, solid, darkMetal, 0, 0.42, -2.74, 2.55, 0.78, 0.08);

    this.deskFan = deskFanModel();
    this.deskFan.root.position.set(-0.08, 0.92, -2.18);
    g.add(this.deskFan.root);

    // Clickable Spezi can (bounces on sip & Hauke earthquakes!)
    this.deskSpezi = speziModel();
    this.deskSpezi.position.set(0.48, 0.92, -1.96);
    this.deskSpezi.userData.propKind = 'spezi';
    g.add(this.deskSpezi);
    this.clickables.push(this.deskSpezi);

    // Clickable Mini Rubber Duck on desk!
    this.deskMiniDuck = miniDuckModel();
    this.deskMiniDuck.position.set(0.84, 0.92, -1.92);
    this.deskMiniDuck.rotation.y = -0.55;
    this.deskMiniDuck.userData.propKind = 'duck';
    g.add(this.deskMiniDuck);
    this.clickables.push(this.deskMiniDuck);

    // Coffee mug
    this.deskMug = new THREE.Group();
    this.deskMug.position.set(0.78, 0.92, -2.32);
    piece(this.deskMug, round, material(0xf4ebd9, 0.4, 0.1), 0, 0.11, 0, 0.085, 0.22, 0.085);
    piece(this.deskMug, round, material(0x2a140c, 0.3, 0.1), 0, 0.21, 0, 0.072, 0.02, 0.072);
    g.add(this.deskMug);

    // Retro Security Telephone (blinks red when Phone Guy is talking!)
    this.deskPhone = officePhoneModel();
    this.deskPhone.root.position.set(1.12, 0.92, -2.08);
    this.deskPhone.root.rotation.y = -0.25;
    g.add(this.deskPhone.root);

    // Crumpled Döner foil & paper receipt on desk
    piece(g, solid, material(0xf4eedc, 0.85, 0.02), 0.25, 0.925, -1.95, 0.18, 0.01, 0.24).rotation.y = 0.22;
    piece(g, orb, material(0xc4ccd8, 0.22, 0.82, true), 0.26, 0.96, -2.34, 0.09, 0.06, 0.08);

    // Stacked CRT security monitors on left side of desk
    piece(g, solid, darkMetal, -0.96, 1.16, -2.32, 0.64, 0.48, 0.46);
    this.deskCrt1Mat = new THREE.MeshBasicMaterial({ map: this.crtRadarTex });
    this.deskCrt1 = piece(g, solid, this.deskCrt1Mat, -0.96, 1.16, -2.08, 0.52, 0.36, 0.03);
    piece(g, solid, steelMat, -0.94, 1.56, -2.34, 0.52, 0.34, 0.38);
    this.deskCrt2Mat = new THREE.MeshBasicMaterial({ map: this.crtSeismicTex });
    this.deskCrt2 = piece(g, solid, this.deskCrt2Mat, -0.94, 1.56, -2.14, 0.42, 0.24, 0.03);
    this.deskCrtGlow = new THREE.PointLight(0x38f2af, 1.4, 2.2, 2.0);
    this.deskCrtGlow.position.set(-0.92, 1.25, -1.85);
    g.add(this.deskCrtGlow);

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
    this.outageEyeLight = new THREE.PointLight(0x88f4ff, 0, 2.4, 2.0);
    this.outageEyeLight.position.set(-3.25, 1.78, -0.95);
    g.add(this.outageEyeLight);

    this.officeGoldenDuck = goldenDuckModel();
    this.officeGoldenDuck.root.position.set(0.08, 0.0, -1.18);
    this.officeGoldenDuck.root.visible = false;
    g.add(this.officeGoldenDuck.root);
  }

  buildCctvRooms() {
    const g = this.cctvRoot;
    this.cctvAmb = new THREE.AmbientLight(0x2e3d4f, 0.95);
    g.add(this.cctvAmb);

    this.cctvSpot = new THREE.SpotLight(0xdff5ff, 32, 18, 0.88, 0.58, 1.2);
    g.add(this.cctvSpot, this.cctvSpot.target);

    this.cctvFill = new THREE.PointLight(0xffb84d, 5.2, 11, 1.55);
    g.add(this.cctvFill);

    const floorMat = new THREE.MeshStandardMaterial({ map: this.floorTex, roughness: 0.68 });
    const wallMat = new THREE.MeshStandardMaterial({ map: this.wallTex, roughness: 0.74 });
    const darkMat = material(0x161a26, 0.7, 0.15);
    const steel = material(0x7c8ca3, 0.32, 0.65);
    const redCurtain = material(0x8f1d2c, 0.65, 0.08);
    const creamCurtain = material(0xe3d6b8, 0.65, 0.06);
    const wood = new THREE.MeshStandardMaterial({ map: this.deskTex, roughness: 0.68 });
    const menuMat = new THREE.MeshBasicMaterial({ map: this.menuBoardTex });
    const stageNeonMat = new THREE.MeshBasicMaterial({ map: this.neonStageTex });
    const hallNeonMat = new THREE.MeshBasicMaterial({ map: this.neonHallTex });

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

    // CAM 1A: Döner-Bühne (Show Stage with Neon sign, Menu Board, party tassels & rotating Döner spit!)
    const r1a = makeRoomShell(7.2, 6.0);
    piece(r1a, solid, wood, 0, 0.22, -1.65, 5.4, 0.44, 2.2);
    piece(r1a, solid, redCurtain, -2.55, 1.85, -2.7, 0.9, 3.2, 0.35);
    piece(r1a, solid, redCurtain, 2.55, 1.85, -2.7, 0.9, 3.2, 0.35);
    piece(r1a, solid, stageNeonMat, 0, 2.58, -2.86, 2.5, 0.85, 0.06);
    partyGarland(r1a, -2.8, 2.8, 3.05, -2.3);
    this.stageSpit = donerSpitModel();
    this.stageSpit.root.position.set(2.15, 0.44, -1.55);
    this.stageSpit.root.rotation.y = -0.35;
    r1a.add(this.stageSpit.root);
    this.rooms['1A'] = r1a;

    // CAM 1B: Gastraum (Dining Hall with Imbiss tables, menu board, Spezi & party lights)
    const r1b = makeRoomShell(8.2, 7.6);
    partyGarland(r1b, -3.5, 3.5, 3.05, -2.2);
    piece(r1b, solid, menuMat, 0, 2.2, -3.65, 2.6, 1.25, 0.06);
    for (const [tx, tz] of [[-2.0, -1.4], [2.0, -1.4], [-2.0, 1.2], [2.0, 1.2]]) {
      piece(r1b, solid, wood, tx, 0.78, tz, 1.55, 0.1, 1.0);
      piece(r1b, solid, material(0xc4283b, 0.6, 0.05), tx, 0.835, tz, 1.48, 0.02, 0.92);
      piece(r1b, round, darkMat, tx, 0.38, tz, 0.12, 0.76, 0.12);
      piece(r1b, tapered, emissive(0xff3b56), tx - 0.34, 0.94, tz, 0.05, 0.2, 0.05);
      piece(r1b, tapered, material(0xf4ebd9, 0.4, 0.1), tx + 0.25, 0.94, tz, 0.05, 0.2, 0.05);
      const can = speziModel();
      can.position.set(tx + 0.02, 0.84, tz + 0.18);
      can.scale.setScalar(0.65);
      r1b.add(can);
    }
    this.rooms['1B'] = r1b;

    // CAM 1C: Haukes Buffet-Bucht (Pirate Cove with smoothly sliding striped curtains & sign!)
    const r1c = makeRoomShell(6.4, 5.8);
    piece(r1c, solid, wood, 0, 0.18, -1.5, 4.2, 0.36, 2.2);
    piece(r1c, round, steel, 0, 3.22, -0.52, 0.05, 4.4, 0.05).rotation.z = Math.PI / 2;
    this.coveCurtainL = new THREE.Group();
    this.coveCurtainR = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      piece(this.coveCurtainL, solid, i % 2 === 0 ? redCurtain : creamCurtain, -1.45 + i * 0.36, 1.75, -0.52, 0.35, 3.0, 0.14);
      piece(this.coveCurtainR, solid, i % 2 === 0 ? creamCurtain : redCurtain, 0.37 + i * 0.36, 1.75, -0.52, 0.35, 3.0, 0.14);
    }
    r1c.add(this.coveCurtainL, this.coveCurtainR);
    // Floor seismic cracks radiating from Hauke's Buffet Cove!
    const crackMat = material(0x090a10, 0.95, 0);
    piece(r1c, solid, crackMat, -0.35, 0.01, 0.45, 0.08, 0.02, 1.4).rotation.y = 0.42;
    piece(r1c, solid, crackMat, 0.22, 0.01, 0.72, 0.06, 0.02, 1.1).rotation.y = -0.35;
    // "AUSSER BETRIEB" sign on wooden stand
    piece(r1c, round, wood, 1.68, 0.55, 0.45, 0.06, 1.1, 0.06);
    this.coveSignMat = new THREE.MeshStandardMaterial({ map: this.signNormalTex, roughness: 0.55 });
    piece(r1c, solid, this.coveSignMat, 1.68, 1.15, 0.45, 1.24, 0.64, 0.08).rotation.y = -0.35;
    this.rooms['1C'] = r1c;

    // CAM 2A: West-Flur (Long corridor where Boss Hauke earthquake-sprints!)
    const r2a = makeRoomShell(3.8, 9.6);
    for (let z = -3.8; z <= 2.4; z += 1.6) {
      piece(r2a, round, steel, -1.78, 2.75, z, 0.08, 1.6, 0.08).rotation.x = Math.PI / 2;
      piece(r2a, solid, emissive(0xffd79a), 0, 3.48, z, 0.95, 0.06, 0.14);
    }
    // Yellow wet floor cone in West Hall
    piece(r2a, tapered, material(0xf5c838, 0.45, 0.08), -1.15, 0.35, 0.6, 0.18, 0.7, 0.18);
    this.rooms['2A'] = r2a;

    // CAM 2B: West-Ecke (Corner with poster that rarely turns into Goldene Ente!)
    const r2b = makeRoomShell(4.0, 5.4);
    this.cam2bPosterMat = new THREE.MeshStandardMaterial({ map: this.posterNormalTex, roughness: 0.52 });
    piece(r2b, solid, this.cam2bPosterMat, -1.86, 1.72, -0.8, 0.05, 1.45, 1.1);
    const cr = crateMesh(false);
    cr.position.set(1.25, 0, -1.8);
    r2b.add(cr);
    piece(r2b, solid, emissive(0xff3b56), 0.2, 3.25, -2.55, 0.65, 0.22, 0.06);
    this.rooms['2B'] = r2b;

    // CAM 3: Pfand-Lager (Supply Closet full of Spezi crates + mop)
    const r3 = makeRoomShell(3.8, 4.4);
    for (const [cx, cy, cz] of [[-1.15, 0, -1.3], [-1.15, 0.62, -1.3], [1.15, 0, -1.45], [0.2, 0, -1.65]]) {
      const box = crateMesh(false);
      box.position.set(cx, cy, cz);
      r3.add(box);
    }
    const s1 = speziModel();
    s1.position.set(1.15, 0.64, -1.45);
    r3.add(s1);
    piece(r3, round, wood, -1.55, 0.9, -0.2, 0.03, 1.8, 0.03).rotation.z = -0.14;
    this.rooms['3'] = r3;

    // CAM 4A: Ost-Flur (East Hall with glowing Imbiss neon sign)
    const r4a = makeRoomShell(3.8, 9.4);
    const hallNeon = piece(r4a, solid, hallNeonMat, 1.82, 2.15, -1.8, 0.06, 0.85, 2.1);
    hallNeon.rotation.y = 0;
    piece(r4a, round, darkMat, -1.35, 0.4, -2.6, 0.28, 0.8, 0.28);
    this.rooms['4A'] = r4a;

    // CAM 4B: Ost-Ecke (Claustrophobic corner right outside right door)
    const r4b = makeRoomShell(3.8, 5.2);
    piece(r4b, solid, steel, -1.38, 0.82, -1.6, 0.78, 1.64, 0.76);
    piece(r4b, solid, emissive(0x38f2af), -0.98, 1.45, -1.45, 0.04, 0.08, 0.14);
    this.rooms['4B'] = r4b;

    // CAM 5: Fritteusen-Werkstatt (Backstage with spare crowns & glowing fryer)
    const r5 = makeRoomShell(5.8, 5.6);
    piece(r5, solid, steel, 0, 0.55, -1.65, 2.5, 0.96, 1.02);
    piece(r5, solid, emissive(0xff8e42), -0.45, 1.05, -1.65, 0.82, 0.06, 0.64);
    piece(r5, solid, emissive(0xff6b2b), 0.55, 1.05, -1.65, 0.72, 0.06, 0.64);
    piece(r5, solid, wood, -1.95, 1.5, -2.25, 1.1, 0.06, 0.55);
    piece(r5, solid, wood, -1.95, 2.0, -2.25, 1.1, 0.06, 0.55);
    for (let i = 0; i < 3; i++) {
      const spare = crownMesh(0.75);
      spare.position.set(-2.2 + i * 0.34, 1.56 + (i % 2) * 0.5, -2.22);
      r5.add(spare);
    }
    this.rooms['5'] = r5;

    // Shared CCTV character puppets
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
    this.jsAmb = new THREE.AmbientLight(0x281018, 1.15);
    g.add(this.jsAmb);
    this.jsStrobe = new THREE.PointLight(0xffffff, 26, 8, 1.2);
    this.jsStrobe.position.set(0, 1.65, 0.8);
    g.add(this.jsStrobe);
    this.jsRed = new THREE.PointLight(0xff2040, 20, 8, 1.2);
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

  renderPass(time, { cctv = 0, staticAmt = 0, blackout = 0, shock = 0, quake = 0, flicker = 1, monitorFlash = 0 }) {
    this.postMat.uniforms.uTime.value = time;
    this.postMat.uniforms.uCctv.value = cctv;
    this.postMat.uniforms.uStatic.value = staticAmt;
    this.postMat.uniforms.uBlackout.value = blackout;
    this.postMat.uniforms.uShock.value = shock;
    this.postMat.uniforms.uQuake.value = quake;
    this.postMat.uniforms.uFlicker.value = flicker;
    this.postMat.uniforms.uMonitorFlash.value = monitorFlash;

    this.renderer.setRenderTarget(this.pixelTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);
  }

  drawTitle(time) {
    this.setMode('title');
    const reduced = this.isReducedMotion();
    const sway = reduced ? 0 : Math.sin(time * 0.45) * 0.04;
    this.camera.position.set(sway, 1.58, 2.02);
    this.camera.rotation.set(-0.04, sway * -0.15, 0);

    // Rotate background Döner spit & drift dust motes
    this.titleSpit.spit.rotation.y = time * 1.1;
    this.titleDust.rotation.y = time * 0.04;

    // Classic FNAF 1 eerie twitching title screen cycling Torge, Anton, Tom & Hauke!
    const cycle = time % 7.2;
    const glitch = !reduced && (cycle > 6.9 || (cycle > 2.6 && cycle < 2.75) || (cycle > 4.75 && cycle < 4.86));
    const showAnton = !reduced && cycle > 6.96 && cycle < 7.08;
    const showHauke = !reduced && cycle > 2.63 && cycle < 2.72;
    const showTom = !reduced && cycle > 4.77 && cycle < 4.84;

    this.titleTorge.root.visible = !showAnton && !showHauke && !showTom;
    this.titleAnton.root.visible = showAnton;
    this.titleHauke.root.visible = showHauke;
    this.titleTom.root.visible = showTom;

    if (this.titleTorge.root.visible) {
      const twitch = glitch ? (Math.sin(time * 95) * 0.24) : Math.sin(time * 0.85) * 0.045;
      this.titleTorge.head.rotation.z = twitch;
      this.titleTorge.head.rotation.y = -0.18 + (glitch ? Math.cos(time * 73) * 0.18 : Math.sin(time * 0.5) * 0.04);
      this.titleTorge.core.position.y = Math.sin(time * 1.6) * 0.015;
      this.titleTorge.eyes.visible = !glitch || Math.sin(time * 60) > 0;
    }
    this.titleSpot.intensity = glitch ? 16 + Math.random() * 22 : 33 + Math.sin(time * 3.1) * 2.5;

    this.renderPass(time, {
      cctv: 0,
      staticAmt: glitch ? 0.36 : 0.04,
      blackout: 0,
      shock: glitch ? 0.28 : 0,
      quake: 0,
      flicker: glitch ? 0.68 : 1,
      monitorFlash: 0,
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
    const reduced = this.isReducedMotion();
    const q = (run.quake || 0) * (reduced ? 0.2 : 1);
    const shakeX = q > 0.01 ? (Math.sin(run.quakeTime * 54) * 0.095 * q) : 0;
    const shakeY = q > 0.01 ? (Math.cos(run.quakeTime * 68) * 0.075 * q) : 0;
    const shakeRoll = q > 0.01 ? (Math.sin(run.quakeTime * 46) * 0.055 * q) : 0;

    // Velvet-smooth spring-damped camera pan + subtle roll inertia & breathing!
    const look = Number.isFinite(run.lookSmooth) ? run.lookSmooth : run.lookX;
    const breathY = reduced ? 0 : Math.sin(t * 1.55) * 0.011;
    const panRoll = reduced ? 0 : -(run.lookVel || 0) * 0.008;

    this.camera.position.set(look * 0.34 + shakeX, 1.62 + breathY + shakeY, 0.72);
    this.camera.rotation.set(-0.04, -look * 0.62, shakeRoll + panRoll);

    // Steel shutters animation with mechanical impact bounce!
    const leftBounce = Math.sin(run.leftDoorBounce * Math.PI * 2.5) * 0.05 * run.leftDoorBounce;
    const rightBounce = Math.sin(run.rightDoorBounce * Math.PI * 2.5) * 0.05 * run.rightDoorBounce;
    this.leftShutter.position.y = 3.55 - run.leftDoorAnim * 2.38 + leftBounce;
    this.rightShutter.position.y = 3.55 - run.rightDoorAnim * 2.38 + rightBounce;

    // 3D Wall switches glow
    this.leftBtnDoor.material.color.setHex(run.leftJammed ? 0x222630 : run.leftDoor ? 0x38f2af : 0xff3b56);
    this.leftBtnLight.material.color.setHex(run.leftJammed ? 0x222630 : run.leftLight ? 0xffe082 : 0x5282a8);
    this.rightBtnDoor.material.color.setHex(run.rightJammed ? 0x222630 : run.rightDoor ? 0x38f2af : 0xff3b56);
    this.rightBtnLight.material.color.setHex(run.rightJammed ? 0x222630 : run.rightLight ? 0xffe082 : 0x5282a8);

    // Spinning desk fan + dust drift + earthquake/prop bounce!
    if (!out) {
      this.deskFan.blades.rotation.z = t * 20;
      this.officeDust.rotation.y = t * 0.035;
      this.officeDust.position.y = Math.sin(t * 0.7) * 0.05;
    }
    const rattle = q > 0.05 ? Math.abs(Math.sin(run.quakeTime * 44)) * q : 0;
    const speziPop = Math.sin((run.speziBounce || 0) * Math.PI * 2.6) * 0.16 * (run.speziBounce || 0);
    const duckPop = Math.sin((run.duckBounce || 0) * Math.PI * 2.6) * 0.14 * (run.duckBounce || 0);
    this.deskSpezi.position.y = 0.92 + rattle * 0.14 + Math.max(0, speziPop);
    this.deskSpezi.rotation.z = (q > 0.05 ? Math.sin(run.quakeTime * 39) * 0.22 * q : 0) + (run.speziBounce || 0) * 0.35;
    this.deskMiniDuck.position.y = 0.92 + rattle * 0.11 + Math.max(0, duckPop);
    this.deskMiniDuck.scale.set(
      1 + (run.duckBounce || 0) * 0.22,
      1 - (run.duckBounce || 0) * 0.16,
      1 + (run.duckBounce || 0) * 0.22,
    );
    this.deskMug.position.y = 0.92 + rattle * 0.09;
    this.deskMug.rotation.x = q > 0.05 ? Math.cos(run.quakeTime * 48) * 0.14 * q : 0;
    this.officeBulbGroup.rotation.z = q > 0.02 ? Math.sin(run.quakeTime * 11) * 0.18 * q : Math.sin(t * 1.35) * 0.016;
    this.officePoster.scale.setScalar(1 + (run.posterBounce || 0) * 0.22);

    // Telephone red blinking indicator during Phone Guy calls!
    const phoneBlink = !out && run.callActive && !run.callMuted && Math.sin(t * 9) > 0;
    this.deskPhone.ledMat.color.setHex(phoneBlink ? 0xff3b56 : 0x2a1016);

    // Lighting (Normal vs Power Outage!)
    if (out) {
      this.officeAmb.intensity = 0.025;
      this.officeLight.intensity = 0;
      this.officeLightCone.visible = false;
      this.officeDust.visible = false;
      this.officeBulbOrb.material.color.setHex(0x0c0e14);
      this.officeGarland.visible = false;
      this.deskCrt1.visible = false;
      this.deskCrt2.visible = false;
      this.deskCrtGlow.intensity = 0;
      this.leftHallLight.intensity = 0;
      this.rightHallLight.intensity = 0;
    } else {
      this.officeAmb.intensity = 1.05;
      this.officeLight.intensity = (14.5 - q * 4.2) * run.lightFlicker;
      this.officeLightCone.visible = true;
      this.officeDust.visible = true;
      this.officeBulbOrb.material.color.setHex(0xffdf9e);
      this.officeGarland.visible = true;
      this.deskCrt1.visible = true;
      this.deskCrt2.visible = true;
      const seismicWarn = (run.seismicLevel || 0) > 0.35;
      this.deskCrtGlow.color.setHex(seismicWarn ? 0xff3b56 : 0x38f2af);
      this.deskCrtGlow.intensity = seismicWarn ? (2.2 + Math.sin(t * 18) * 0.6) : 1.3;
      this.leftHallLight.intensity = run.leftLight ? (26 * run.lightFlicker) : 0;
      this.rightHallLight.intensity = run.rightLight ? (26 * run.lightFlicker) : 0;
    }

    // Office animatronics visibility & subtle eerie motion
    const showAnton = !out && run.leftLight && run.animatronics.anton.room === 'left_door';
    const showTom = !out && run.rightLight && run.animatronics.tom.room === 'right_door';
    this.officeAnton.root.visible = showAnton;
    if (showAnton) {
      this.officeAnton.head.rotation.z = 0.18 + Math.sin(t * 3.2) * 0.04;
      this.officeAnton.core.position.y = Math.sin(t * 2.1) * 0.015;
    }
    this.officeTom.root.visible = showTom;
    if (showTom) {
      this.officeTom.head.rotation.y = Math.sin(t * 2.5) * 0.06;
      this.officeTom.core.position.y = Math.sin(t * 2.4) * 0.015;
    }

    const showOutageTorge = Boolean(out && out.phase === 'jingle' && out.eyesOn);
    this.officeOutageTorge.root.visible = showOutageTorge;
    this.outageEyeLight.intensity = showOutageTorge ? 3.2 : 0;

    this.officeGoldenDuck.root.visible = Boolean(run.goldenActive && !out);
    if (this.officeGoldenDuck.root.visible) {
      this.officeGoldenDuck.head.rotation.z = -0.15 + Math.sin(t * 28) * 0.025;
    }

    const shock = Math.max(run.stingFlash * 1.4, run.doorSlamFlash * 1.1, run.goldenActive ? 0.35 : 0);
    const blackout = out && out.phase === 'blackout' ? 0.96 : 0;
    this.renderPass(t, {
      cctv: 0,
      staticAmt: run.hallucination ? 0.46 : (run.monitorAnim > 0.06 ? 0.28 : 0),
      blackout,
      shock,
      quake: Math.min(1.2, q),
      flicker: run.lightFlicker,
      monitorFlash: run.monitorFlash || 0,
    });
  }

  drawCctv(run) {
    this.setMode('cctv');
    const t = run.time;
    const camId = run.activeCam;
    const videoWarning = run.antonVideo.deadline > run.time;
    const reduced = this.isReducedMotion();

    // Audio-Only CAM 6 or signal disruption
    if (camId === '6' || feedIsInterrupted(run)) {
      for (const room of Object.values(this.rooms)) room.visible = false;
      for (const m of [this.cctvTorge, this.cctvAnton, this.cctvTom, this.cctvHauke]) m.root.visible = false;
      this.renderPass(t, {
        cctv: 1,
        staticAmt: camId === '6' ? 0.27 : 0.74,
        blackout: 0.98,
        shock: 0,
        quake: reduced ? 0 : Math.min(1, run.quake || 0),
        flicker: 1,
        monitorFlash: run.monitorFlash || 0,
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
    const q = (run.quake || 0) * (reduced ? 0.2 : 1);
    const qx = q > 0.02 ? Math.sin(run.quakeTime * 58) * 0.08 * q : 0;
    const qy = q > 0.02 ? Math.cos(run.quakeTime * 66) * 0.06 * q : 0;

    // Configure per-room surveillance camera angle & moody lighting
    this.cctvFill.color.setHex(0xffb84d);
    if (camId === '1A') {
      this.camera.position.set(0.2 + qx, 2.35 + qy, 2.35);
      this.camera.lookAt(sweep * 2.2, 1.25, -1.6);
      this.cctvSpot.position.set(0, 3.2, 1.5);
      this.cctvSpot.target.position.set(0, 1.1, -1.6);
      this.cctvFill.position.set(0, 2.4, 0.2);
      this.stageSpit.spit.rotation.y = t * 1.4;
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
      this.cctvFill.color.setHex(0xb85cff);
      this.cctvFill.position.set(1.5, 1.9, 1.0);
      const openAmt = run.animatronics.hauke.curtainAnim ?? 0;
      this.coveCurtainL.position.x = -openAmt;
      this.coveCurtainR.position.x = openAmt;
      this.coveSignMat.map = run.animatronics.hauke.stage >= 3 ? this.signAngryTex : this.signNormalTex;
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
      this.cctvFill.color.setHex(run.goldenPoster ? 0xffcf4d : 0xff5a66);
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
      this.cctvFill.color.setHex(0x38f2af);
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
      this.cctvFill.color.setHex(0xff8e42);
      this.cctvFill.position.set(-0.4, 1.8, -1.4);
    }

    // Place animatronics in their eerie CCTV room poses with idle breathing!
    const { torge, anton, tom, hauke } = run.animatronics;

    if (torge.room === camId) {
      this.cctvTorge.root.visible = true;
      this.cctvTorge.core.position.y = Math.sin(t * 1.7) * 0.014;
      if (camId === '1A') {
        this.cctvTorge.root.position.set(0, 0.44, -1.6);
        this.cctvTorge.root.rotation.y = 0;
        this.cctvTorge.head.rotation.y = Math.sin(t * 0.7) * 0.14;
      } else if (camId === '1B') {
        this.cctvTorge.root.position.set(0.3, 0, -2.5);
        this.cctvTorge.root.rotation.y = -0.35;
      } else if (camId === '4A') {
        this.cctvTorge.root.position.set(-0.55, 0, -1.4);
        this.cctvTorge.root.rotation.y = 0.22;
      } else if (camId === '4B') {
        this.cctvTorge.root.position.set(0.05, 0.15, 0.45);
        this.cctvTorge.root.rotation.y = -0.3;
        this.cctvTorge.head.rotation.z = Math.sin(t * 2.2) * 0.06;
      }
    }

    if (anton.room === camId) {
      this.cctvAnton.root.visible = true;
      this.cctvAnton.core.position.y = Math.sin(t * 2.0) * 0.014;
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
      this.cctvAnton.arms[1].rotation.x = videoWarning ? -1.45 : -0.15;
      if (this.cctvAnton.phoneScreen) {
        const pulseHex = videoWarning ? (Math.sin(t * 18) > 0 ? 0x38f2af : 0xff3b56) : 0x1a302b;
        this.cctvAnton.phoneScreen.material.color.setHex(pulseHex);
      }
      if (videoWarning) {
        const lean = reduced ? 0.16 : 0.28;
        this.cctvAnton.root.position.x = THREE.MathUtils.lerp(this.cctvAnton.root.position.x, this.camera.position.x, lean);
        this.cctvAnton.root.position.z = THREE.MathUtils.lerp(this.cctvAnton.root.position.z, this.camera.position.z, lean);
        this.cctvAnton.head.rotation.z = -0.24;
      }
    }

    if (tom.room === camId) {
      this.cctvTom.root.visible = true;
      this.cctvTom.core.position.y = Math.sin(t * 2.3) * 0.014;
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
      this.cctvHauke.core.position.y = Math.sin(t * 2.2) * 0.018;
      if (hauke.stage === 1) {
        this.cctvHauke.root.position.set(0.0, 0.36, -1.25);
        this.cctvHauke.root.rotation.y = -0.1;
      } else if (hauke.stage === 2) {
        this.cctvHauke.root.position.set(0.0, 0.36, -0.45);
        this.cctvHauke.root.rotation.y = -0.22;
      }
      this.cctvHauke.legs[0].rotation.x = 0;
      this.cctvHauke.legs[1].rotation.x = 0;
      this.cctvHauke.arms[0].rotation.x = 0;
      this.cctvHauke.arms[1].rotation.x = 0;
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

    const staticAmt = Math.max(videoWarning ? 0.16 : 0.035, run.camSwitchStatic * 2, run.goldenPoster && camId === '2B' ? 0.22 : 0);
    this.renderPass(t, {
      cctv: 1,
      staticAmt,
      blackout: 0,
      shock: (run.goldenPoster && camId === '2B') ? 0.28 : videoWarning ? 0.12 : 0,
      quake: Math.min(1.2, q),
      flicker: run.lightFlicker,
      monitorFlash: run.monitorFlash || 0,
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
    const reduced = this.isReducedMotion();
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
      active.jaw.scale.y = 1.15 + lunge * 0.72;
    }
    if (active.arms) {
      active.arms[0].rotation.x = -lunge * (video ? 2.1 : 1.25);
      active.arms[1].rotation.x = -lunge * (js.who === 'tom' ? 2.05 : 1.35);
    }

    this.camera.position.set(Math.sin(t * 28) * 0.06 * shake, shot.headY + Math.cos(t * 32) * 0.07 * shake, 0.38);
    this.camera.rotation.set(0, 0, Math.sin(t * 24) * 0.11 * shake);

    this.jsStrobe.intensity = video ? 19 : 10 + 6 * lunge;
    this.jsRed.intensity = video ? 3 : 9;

    this.renderPass(t, {
      cctv: video ? 1 : 0,
      staticAmt: video ? 0.12 + p * 0.25 : 0.065,
      blackout: Math.max(0, (p - 0.85) / 0.15),
      shock: video ? 0.16 : 0.36,
      quake: shake,
      flicker: 1,
      monitorFlash: 0,
    });
  }
}
