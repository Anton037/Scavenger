import * as THREE from 'three';
import { feedIsInterrupted } from '../engine/simulation.js';
import {
  bossHaukeModel,
  chefTorgeModel,
  crownMesh,
  goldenDuckModel,
  lostAntonModel,
  schnorrerTomModel,
} from './characters3d.js';
import { createPostShaderMaterial } from './postShader.js';
import {
  batchStaticGroup,
  color,
  emissive,
  material,
  orb,
  piece,
  round,
  solid,
  tapered,
} from './primitives.js';
import {
  bonPrinterModel,
  crateMesh,
  deskFanModel,
  donerSpitModel,
  dustParticlesModel,
  hallSteamCloudModel,
  miniDuckModel,
  officePhoneModel,
  partyGarland,
  speziModel,
  steamValveAssemblyModel,
} from './props3d.js';
import {
  checkerFloorTexture,
  coveSignTexture,
  deskWoodTexture,
  LiveDeskDisplays,
  menuBoardTexture,
  neonSignTexture,
  posterTexture,
  rulesPosterTexture,
  shutterTexture,
  wallPanelTexture,
} from './textures.js';

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
      graphics: ['hd', 'balanced', 'retro'].includes(settings.graphics) ? settings.graphics : 'hd',
      crt: ['subtle', 'strong', 'off'].includes(settings.crt) ? settings.crt : 'subtle',
      reducedMotion: Boolean(settings.reducedMotion),
    };

    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.settings.graphics === 'hd',
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.16;
    // Set shadowMap.enabled BEFORE creating shadow-casting lights (Three.js r182+ PCFShadowMap)
    this.renderer.shadowMap.enabled = this.settings.graphics === 'hd';
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = color(0x05060b);
    this.scene.fog = new THREE.FogExp2(0x05060b, 0.068);

    this.camera = new THREE.PerspectiveCamera(56, 16 / 9, 0.08, 38);
    this.raycaster = new THREE.Raycaster();
    this._ndc = new THREE.Vector2();
    this.clickables = [];

    // Performance telemetry
    this.fpsFrames = 0;
    this.fpsAccum = 0;
    this.fpsLastNow = performance.now();
    this.currentFps = 60;
    this.lastDrawCalls = 0;

    const isRetro = this.settings.graphics === 'retro';
    this.pixelTarget = new THREE.WebGLRenderTarget(960, 540, {
      minFilter: isRetro ? THREE.NearestFilter : THREE.LinearFilter,
      magFilter: isRetro ? THREE.NearestFilter : THREE.LinearFilter,
      generateMipmaps: false,
    });
    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postMat = createPostShaderMaterial(this.pixelTarget.texture, isRetro);
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
    this.liveDisplays = new LiveDeskDisplays();

    // 4 isolated lightweight roots (only 1 visible per frame)
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

  getPerfSnapshot() {
    return {
      fps: this.currentFps,
      drawCalls: this.lastDrawCalls,
      mode: this.settings.graphics,
    };
  }

  applySettings(next = {}) {
    if (['hd', 'balanced', 'retro'].includes(next.graphics)) {
      this.settings.graphics = next.graphics;
    }
    if (['subtle', 'strong', 'off'].includes(next.crt)) {
      this.settings.crt = next.crt;
    }
    if (typeof next.reducedMotion === 'boolean') {
      this.settings.reducedMotion = next.reducedMotion;
    }
    const isRetro = this.settings.graphics === 'retro';
    const isHd = this.settings.graphics === 'hd';
    this.renderer.shadowMap.enabled = isHd;
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
    } else if (this.settings.graphics === 'balanced') {
      pw = Math.max(560, Math.min(1280, w));
      ph = Math.max(320, Math.min(720, h));
    } else {
      const hdScale = Math.min(dpr, 1.55);
      pw = Math.max(640, Math.min(1680, Math.floor(w * hdScale)));
      ph = Math.max(360, Math.min(945, Math.floor(h * hdScale)));
    }
    if (this.pixelTarget.width !== pw || this.pixelTarget.height !== ph) {
      this.pixelTarget.setSize(pw, ph);
    }
  }

  pickOfficeProp(rx, ry) {
    if (!this.officeRoot.visible || !this.clickables.length) return null;
    this._ndc.set(rx * 2 - 1, -(ry * 2 - 1));
    this.raycaster.setFromCamera(this._ndc, this.camera);
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
    this.titleSpot.shadow.radius = 2;
    g.add(this.titleSpot, this.titleSpot.target);

    this.titleRim = new THREE.PointLight(0xff3b56, 12, 7.5, 1.6);
    this.titleRim.position.set(2.35, 2.0, -2.0);
    g.add(this.titleRim);

    const cyanFill = new THREE.PointLight(0x52c8ff, 7, 7, 1.8);
    cyanFill.position.set(-1.1, 1.7, -1.6);
    g.add(cyanFill);

    const staticStage = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ map: this.wallTex, roughness: 0.72, metalness: 0.12 });
    const floorMat = new THREE.MeshStandardMaterial({ map: this.floorTex, roughness: 0.65, metalness: 0.12 });
    const neonMat = new THREE.MeshBasicMaterial({ map: this.neonStageTex });
    piece(staticStage, solid, floorMat, 0, -0.05, -1.0, 9, 0.1, 6);
    piece(staticStage, solid, wallMat, 0, 1.8, -3.2, 9.4, 4.4, 0.2);
    piece(staticStage, solid, neonMat, 0.92, 2.48, -3.04, 2.3, 0.82, 0.06);
    partyGarland(staticStage, -2.5, 3.3, 3.24, -2.65);
    batchStaticGroup(g, staticStage, { castShadow: false, receiveShadow: true });

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
    const floorMat = new THREE.MeshStandardMaterial({ map: this.floorTex, roughness: 0.58, metalness: 0.14 });
    const wallMat = new THREE.MeshStandardMaterial({ map: this.wallTex, roughness: 0.72, metalness: 0.12 });
    const darkMetal = material(0x191e2e, 0.42, 0.58);
    const shutterMat = new THREE.MeshStandardMaterial({ map: this.shutterTex, roughness: 0.4, metalness: 0.65 });
    const deskWood = new THREE.MeshStandardMaterial({ map: this.deskTex, roughness: 0.58, metalness: 0.1 });
    const steelMat = material(0x6c7991, 0.34, 0.65);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x7aa4c4,
      transparent: true,
      opacity: 0.16,
      roughness: 0.18,
      metalness: 0.45,
    });

    this.officeAmb = new THREE.AmbientLight(0x303c5a, 1.05);
    g.add(this.officeAmb);

    this.officeBulbGroup = new THREE.Group();
    this.officeBulbGroup.position.set(0, 3.25, -1.2);
    piece(this.officeBulbGroup, round, darkMetal, 0, -0.22, 0, 0.025, 0.44, 0.025, { shadow: false });
    piece(this.officeBulbGroup, tapered, darkMetal, 0, -0.45, 0, 0.3, 0.14, 0.3, { shadow: false });
    this.officeBulbOrb = piece(this.officeBulbGroup, orb, emissive(0xffdf9e), 0, -0.52, 0, 0.095, 0.095, 0.095);

    const coneGeo = new THREE.ConeGeometry(2.15, 2.85, 24, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xffd596,
      transparent: true,
      opacity: 0.058,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.officeLightCone = new THREE.Mesh(coneGeo, coneMat);
    this.officeLightCone.position.set(0, -1.9, 0);
    this.officeBulbGroup.add(this.officeLightCone);

    this.officeLight = new THREE.PointLight(0xffd49e, 14.8, 11.8, 1.4);
    this.officeLight.position.set(0, -0.62, 0.15);
    this.officeLight.castShadow = true;
    this.officeLight.shadow.mapSize.set(512, 512);
    this.officeLight.shadow.bias = -0.002;
    this.officeLight.shadow.radius = 2;
    this.officeBulbGroup.add(this.officeLight);
    g.add(this.officeBulbGroup);

    // Emergency red ceiling beacon light when battery < 20%!
    this.emergencyLight = new THREE.PointLight(0xff2842, 0, 6.5, 1.6);
    this.emergencyLight.position.set(0, 2.95, -2.4);
    g.add(this.emergencyLight);

    this.officeDust = dustParticlesModel(55);
    g.add(this.officeDust);

    // Batch all static room architecture & desk shell into ~5 draw calls!
    const staticOffice = new THREE.Group();
    piece(staticOffice, solid, floorMat, 0, -0.05, -1.4, 7.6, 0.1, 6.2);
    piece(staticOffice, solid, darkMetal, 0, 3.3, -1.4, 7.6, 0.1, 6.2);
    piece(staticOffice, solid, wallMat, 0, 1.65, -3.2, 6.2, 3.4, 0.2);

    for (const cx of [-1.85, 1.95]) {
      piece(staticOffice, round, darkMetal, cx, 3.18, -1.4, 0.04, 5.2, 0.04).rotation.x = Math.PI / 2;
    }

    const rulesMat = new THREE.MeshStandardMaterial({ map: this.rulesPosterTex, roughness: 0.62 });
    piece(staticOffice, solid, rulesMat, -1.56, 1.98, -3.07, 0.96, 1.22, 0.035);

    for (const side of [-1, 1]) {
      const sx = side * 3.1;
      piece(staticOffice, solid, floorMat, sx + side * 1.1, -0.05, -1.5, 2.6, 0.1, 5.4);
      piece(staticOffice, solid, wallMat, sx + side * 2.2, 1.65, -1.5, 0.2, 3.4, 5.4);
      piece(staticOffice, solid, wallMat, sx + side * 1.1, 1.65, -3.9, 2.6, 3.4, 0.2);

      piece(staticOffice, solid, wallMat, sx, 1.65, 0.55, 0.22, 3.4, 1.7);
      piece(staticOffice, solid, wallMat, sx, 2.88, -0.95, 0.22, 0.9, 1.3);
      piece(staticOffice, solid, wallMat, sx, 1.65, -1.65, 0.24, 3.4, 0.22);
      piece(staticOffice, solid, wallMat, sx, 0.52, -2.35, 0.22, 1.05, 1.25);
      piece(staticOffice, solid, wallMat, sx, 2.85, -2.35, 0.22, 0.95, 1.25);
      piece(staticOffice, solid, darkMetal, sx, 1.72, -2.98, 0.26, 3.4, 0.26);

      piece(staticOffice, solid, darkMetal, sx - side * 0.06, 2.42, -0.95, 0.28, 0.14, 1.34);
      piece(staticOffice, solid, darkMetal, sx - side * 0.04, 1.25, -0.32, 0.14, 2.45, 0.08);
      piece(staticOffice, solid, darkMetal, sx - side * 0.04, 1.25, -1.58, 0.14, 2.45, 0.08);
      piece(staticOffice, solid, darkMetal, side * 2.98, 1.36, -0.18, 0.1, 0.58, 0.22);

      // Transparent window glass stays unmerged on g for clean alpha sorting
      piece(g, solid, glassMat, sx, 1.72, -2.35, 0.05, 1.36, 1.18, { shadow: false, receive: false });
    }

    // Security Desk + Dual CRT Monitor housings
    piece(staticOffice, solid, deskWood, 0, 0.86, -2.22, 3.16, 0.12, 1.22);
    piece(staticOffice, solid, darkMetal, -1.42, 0.42, -2.22, 0.14, 0.84, 1.08);
    piece(staticOffice, solid, darkMetal, 1.42, 0.42, -2.22, 0.14, 0.84, 1.08);
    piece(staticOffice, solid, darkMetal, 0, 0.42, -2.74, 2.75, 0.78, 0.08);

    // Monitor casings
    piece(staticOffice, solid, darkMetal, -0.80, 1.16, -2.32, 0.62, 0.46, 0.44);
    piece(staticOffice, solid, steelMat, -0.80, 1.54, -2.34, 0.50, 0.32, 0.36);
    piece(staticOffice, solid, material(0xf4eedc, 0.85, 0.02), 0.20, 0.925, -1.96, 0.16, 0.01, 0.22).rotation.y = 0.22;
    piece(staticOffice, orb, material(0xc4ccd8, 0.22, 0.82, true), 0.22, 0.96, -2.36, 0.08, 0.06, 0.08);

    batchStaticGroup(g, staticOffice, { castShadow: true, receiveShadow: true });

    // Party garland (toggles off during power outage)
    this.officeGarland = partyGarland(g, -2.5, 2.5, 3.16, -3.02);

    // Clickable Chef Torge Poster
    const posterMat = new THREE.MeshStandardMaterial({ map: this.posterNormalTex, roughness: 0.52 });
    this.officePoster = piece(g, solid, posterMat, 0.24, 1.98, -3.07, 1.1, 1.4, 0.04, { shadow: false });
    this.officePoster.userData.propKind = 'poster';
    this.clickables.push(this.officePoster);

    // Animated Industrial Steel Roller Shutters (Left & Right)
    this.leftShutter = new THREE.Group();
    this.leftShutter.position.set(-3.04, 2.65, -0.95);
    piece(this.leftShutter, solid, shutterMat, 0, 0, 0, 0.14, 2.45, 1.24, { shadow: true });
    g.add(this.leftShutter);

    this.rightShutter = new THREE.Group();
    this.rightShutter.position.set(3.04, 2.65, -0.95);
    piece(this.rightShutter, solid, shutterMat, 0, 0, 0, 0.14, 2.45, 1.24, { shadow: true });
    g.add(this.rightShutter);

    // 3D Wall control LEDs
    this.leftBtnDoor = piece(g, solid, emissive(0xff3b56), -2.92, 1.48, -0.18, 0.08, 0.16, 0.14);
    this.leftBtnLight = piece(g, solid, emissive(0x73d7ff), -2.92, 1.24, -0.18, 0.08, 0.16, 0.14);
    this.rightBtnDoor = piece(g, solid, emissive(0xff3b56), 2.92, 1.48, -0.18, 0.08, 0.16, 0.14);
    this.rightBtnLight = piece(g, solid, emissive(0x73d7ff), 2.92, 1.24, -0.18, 0.08, 0.16, 0.14);

    // Hallway lights + Volumetric Hallway Beams!
    this.leftHallLight = new THREE.PointLight(0xd9ecff, 0, 6.8, 1.4);
    this.leftHallLight.position.set(-3.75, 2.15, -1.65);
    g.add(this.leftHallLight);

    this.rightHallLight = new THREE.PointLight(0xd9ecff, 0, 6.8, 1.4);
    this.rightHallLight.position.set(3.75, 2.15, -1.65);
    g.add(this.rightHallLight);

    const hallBeamGeo = new THREE.ConeGeometry(1.45, 2.6, 18, 1, true);
    const hallBeamMat = new THREE.MeshBasicMaterial({
      color: 0xd0ebff,
      transparent: true,
      opacity: 0.075,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.leftHallBeam = new THREE.Mesh(hallBeamGeo, hallBeamMat);
    this.leftHallBeam.position.set(-3.75, 1.45, -1.65);
    this.leftHallBeam.visible = false;
    g.add(this.leftHallBeam);

    this.rightHallBeam = new THREE.Mesh(hallBeamGeo, hallBeamMat);
    this.rightHallBeam.position.set(3.75, 1.45, -1.65);
    this.rightHallBeam.visible = false;
    g.add(this.rightHallBeam);

    // Live Desk CRT Screen Surfaces
    this.deskCrt1Mat = new THREE.MeshBasicMaterial({ map: this.liveDisplays.sysTexture });
    this.deskCrt1 = piece(g, solid, this.deskCrt1Mat, -0.80, 1.16, -2.09, 0.50, 0.35, 0.02);
    this.deskCrt2Mat = new THREE.MeshBasicMaterial({ map: this.liveDisplays.waveTexture });
    this.deskCrt2 = piece(g, solid, this.deskCrt2Mat, -0.80, 1.54, -2.15, 0.40, 0.23, 0.02);
    this.deskCrtGlow = new THREE.PointLight(0x38f2af, 1.4, 2.2, 2.0);
    this.deskCrtGlow.position.set(-0.80, 1.25, -1.85);
    g.add(this.deskCrtGlow);

    // Interactive 3D Steam Manometer + Red Exhaust Valve (Left Desk)
    this.steamValve = steamValveAssemblyModel();
    this.steamValve.root.position.set(-1.26, 0.92, -1.96);
    this.steamValve.root.rotation.y = 0.28;
    g.add(this.steamValve.root);
    this.clickables.push(this.steamValve.root);

    // Center Desk Fan, Spezi, Mini Duck & Mug
    this.deskFan = deskFanModel();
    this.deskFan.root.position.set(-0.12, 0.92, -2.18);
    g.add(this.deskFan.root);

    this.deskSpezi = speziModel();
    this.deskSpezi.position.set(0.38, 0.92, -1.94);
    this.deskSpezi.userData.propKind = 'spezi';
    g.add(this.deskSpezi);
    this.clickables.push(this.deskSpezi);

    this.deskMiniDuck = miniDuckModel();
    this.deskMiniDuck.position.set(0.66, 0.92, -1.90);
    this.deskMiniDuck.rotation.y = -0.55;
    this.deskMiniDuck.userData.propKind = 'duck';
    g.add(this.deskMiniDuck);
    this.clickables.push(this.deskMiniDuck);

    this.deskMug = new THREE.Group();
    this.deskMug.position.set(0.58, 0.92, -2.34);
    piece(this.deskMug, round, material(0xf4ebd9, 0.4, 0.1), 0, 0.11, 0, 0.082, 0.22, 0.082, { shadow: false });
    piece(this.deskMug, round, material(0x2a140c, 0.3, 0.1), 0, 0.21, 0, 0.070, 0.02, 0.070, { shadow: false });
    g.add(this.deskMug);

    // Interactive 3D Nacht-Bon Receipt Printer (Right Desk)
    this.deskBonPrinter = bonPrinterModel();
    this.deskBonPrinter.root.position.set(0.96, 0.92, -1.95);
    this.deskBonPrinter.root.rotation.y = -0.22;
    g.add(this.deskBonPrinter.root);
    this.clickables.push(this.deskBonPrinter.root);

    // Retro Security Telephone
    this.deskPhone = officePhoneModel();
    this.deskPhone.root.position.set(1.30, 0.92, -2.22);
    this.deskPhone.root.rotation.y = -0.32;
    g.add(this.deskPhone.root);

    // Office Threats
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
    this.cctvAmb = new THREE.AmbientLight(0x2e3d4f, 0.98);
    g.add(this.cctvAmb);

    this.cctvSpot = new THREE.SpotLight(0xdff5ff, 34, 18, 0.88, 0.58, 1.2);
    g.add(this.cctvSpot, this.cctvSpot.target);

    this.cctvFill = new THREE.PointLight(0xffb84d, 5.4, 11, 1.55);
    g.add(this.cctvFill);

    const floorMat = new THREE.MeshStandardMaterial({ map: this.floorTex, roughness: 0.64 });
    const wallMat = new THREE.MeshStandardMaterial({ map: this.wallTex, roughness: 0.72 });
    const darkMat = material(0x161a26, 0.7, 0.15);
    const steel = material(0x7c8ca3, 0.32, 0.65);
    const redCurtain = material(0x8f1d2c, 0.65, 0.08);
    const creamCurtain = material(0xe3d6b8, 0.65, 0.06);
    const wood = new THREE.MeshStandardMaterial({ map: this.deskTex, roughness: 0.68 });
    const menuMat = new THREE.MeshBasicMaterial({ map: this.menuBoardTex });
    const stageNeonMat = new THREE.MeshBasicMaterial({ map: this.neonStageTex });
    const hallNeonMat = new THREE.MeshBasicMaterial({ map: this.neonHallTex });

    const makeRoom = (w, d, buildStaticFn, h = 3.6) => {
      const r = new THREE.Group();
      const staging = new THREE.Group();
      piece(staging, solid, floorMat, 0, -0.05, 0, w, 0.1, d);
      piece(staging, solid, darkMat, 0, h, 0, w, 0.1, d);
      piece(staging, solid, wallMat, 0, h * 0.5, -d * 0.5, w, h, 0.2);
      piece(staging, solid, wallMat, -w * 0.5, h * 0.5, 0, 0.2, h, d);
      piece(staging, solid, wallMat, w * 0.5, h * 0.5, 0, 0.2, h, d);
      buildStaticFn?.(staging, r);
      batchStaticGroup(r, staging, { castShadow: false, receiveShadow: true });
      r.visible = false;
      g.add(r);
      return r;
    };

    this.rooms = {};

    // CAM 1A: Döner-Bühne
    this.rooms['1A'] = makeRoom(7.2, 6.0, (st, r) => {
      piece(st, solid, wood, 0, 0.22, -1.65, 5.4, 0.44, 2.2);
      piece(st, solid, redCurtain, -2.55, 1.85, -2.7, 0.9, 3.2, 0.35);
      piece(st, solid, redCurtain, 2.55, 1.85, -2.7, 0.9, 3.2, 0.35);
      piece(st, solid, stageNeonMat, 0, 2.58, -2.86, 2.5, 0.85, 0.06);
      partyGarland(st, -2.8, 2.8, 3.05, -2.3);
      this.stageSpit = donerSpitModel();
      this.stageSpit.root.position.set(2.15, 0.44, -1.55);
      this.stageSpit.root.rotation.y = -0.35;
      r.add(this.stageSpit.root);
    });

    // CAM 1B: Gastraum
    this.rooms['1B'] = makeRoom(8.2, 7.6, (st) => {
      partyGarland(st, -3.5, 3.5, 3.05, -2.2);
      piece(st, solid, menuMat, 0, 2.2, -3.65, 2.6, 1.25, 0.06);
      for (const [tx, tz] of [[-2.0, -1.4], [2.0, -1.4], [-2.0, 1.2], [2.0, 1.2]]) {
        piece(st, solid, wood, tx, 0.78, tz, 1.55, 0.1, 1.0);
        piece(st, solid, material(0xc4283b, 0.6, 0.05), tx, 0.835, tz, 1.48, 0.02, 0.92);
        piece(st, round, darkMat, tx, 0.38, tz, 0.12, 0.76, 0.12);
        piece(st, tapered, emissive(0xff3b56), tx - 0.34, 0.94, tz, 0.05, 0.2, 0.05);
        piece(st, tapered, material(0xf4ebd9, 0.4, 0.1), tx + 0.25, 0.94, tz, 0.05, 0.2, 0.05);
        const can = speziModel();
        can.position.set(tx + 0.02, 0.84, tz + 0.18);
        can.scale.setScalar(0.65);
        st.add(can);
      }
    });

    // CAM 1C: Haukes Buffet-Bucht
    this.rooms['1C'] = makeRoom(6.4, 5.8, (st, r) => {
      piece(st, solid, wood, 0, 0.18, -1.5, 4.2, 0.36, 2.2);
      piece(st, round, steel, 0, 3.22, -0.52, 0.05, 4.4, 0.05).rotation.z = Math.PI / 2;
      const crackMat = material(0x090a10, 0.95, 0);
      piece(st, solid, crackMat, -0.35, 0.01, 0.45, 0.08, 0.02, 1.4).rotation.y = 0.42;
      piece(st, solid, crackMat, 0.22, 0.01, 0.72, 0.06, 0.02, 1.1).rotation.y = -0.35;
      piece(st, round, wood, 1.68, 0.55, 0.45, 0.06, 1.1, 0.06);

      this.coveCurtainL = new THREE.Group();
      this.coveCurtainR = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        piece(this.coveCurtainL, solid, i % 2 === 0 ? redCurtain : creamCurtain, -1.45 + i * 0.36, 1.75, -0.52, 0.35, 3.0, 0.14);
        piece(this.coveCurtainR, solid, i % 2 === 0 ? creamCurtain : redCurtain, 0.37 + i * 0.36, 1.75, -0.52, 0.35, 3.0, 0.14);
      }
      r.add(this.coveCurtainL, this.coveCurtainR);

      this.coveSignMat = new THREE.MeshStandardMaterial({ map: this.signNormalTex, roughness: 0.55 });
      piece(r, solid, this.coveSignMat, 1.68, 1.15, 0.45, 1.24, 0.64, 0.08).rotation.y = -0.35;
    });

    // CAM 2A: West-Flur
    this.rooms['2A'] = makeRoom(3.8, 9.6, (st) => {
      for (let z = -3.8; z <= 2.4; z += 1.6) {
        piece(st, round, steel, -1.78, 2.75, z, 0.08, 1.6, 0.08).rotation.x = Math.PI / 2;
        piece(st, solid, emissive(0xffd79a), 0, 3.48, z, 0.95, 0.06, 0.14);
      }
      piece(st, tapered, material(0xf5c838, 0.45, 0.08), -1.15, 0.35, 0.6, 0.18, 0.7, 0.18);
    });

    // CAM 2B: West-Ecke (+ Steam Pipe & Steam Burst Cloud!)
    this.rooms['2B'] = makeRoom(4.0, 5.4, (st, r) => {
      const cr = crateMesh(false);
      cr.position.set(1.25, 0, -1.8);
      st.add(cr);
      piece(st, round, steel, 1.72, 2.65, -0.6, 0.07, 3.4, 0.07).rotation.x = Math.PI / 2;
      piece(st, solid, emissive(0xff3b56), 0.2, 3.25, -2.55, 0.65, 0.22, 0.06);

      this.cam2bPosterMat = new THREE.MeshStandardMaterial({ map: this.posterNormalTex, roughness: 0.52 });
      piece(r, solid, this.cam2bPosterMat, -1.86, 1.72, -0.8, 0.05, 1.45, 1.1);
      this.cam2bSteam = hallSteamCloudModel();
      r.add(this.cam2bSteam.group);
    });

    // CAM 3: Pfand-Lager
    this.rooms['3'] = makeRoom(3.8, 4.4, (st) => {
      for (const [cx, cy, cz] of [[-1.15, 0, -1.3], [-1.15, 0.62, -1.3], [1.15, 0, -1.45], [0.2, 0, -1.65]]) {
        const box = crateMesh(false);
        box.position.set(cx, cy, cz);
        st.add(box);
      }
      const s1 = speziModel();
      s1.position.set(1.15, 0.64, -1.45);
      st.add(s1);
      piece(st, round, wood, -1.55, 0.9, -0.2, 0.03, 1.8, 0.03).rotation.z = -0.14;
    });

    // CAM 4A: Ost-Flur
    this.rooms['4A'] = makeRoom(3.8, 9.4, (st) => {
      piece(st, solid, hallNeonMat, 1.82, 2.15, -1.8, 0.06, 0.85, 2.1);
      piece(st, round, darkMat, -1.35, 0.4, -2.6, 0.28, 0.8, 0.28);
    });

    // CAM 4B: Ost-Ecke (+ Steam Pipe & Steam Burst Cloud!)
    this.rooms['4B'] = makeRoom(3.8, 5.2, (st, r) => {
      piece(st, solid, steel, -1.38, 0.82, -1.6, 0.78, 1.64, 0.76);
      piece(st, round, steel, 1.68, 2.65, -0.5, 0.07, 3.2, 0.07).rotation.x = Math.PI / 2;
      piece(st, solid, emissive(0x38f2af), -0.98, 1.45, -1.45, 0.04, 0.08, 0.14);
      this.cam4bSteam = hallSteamCloudModel();
      r.add(this.cam4bSteam.group);
    });

    // CAM 5: Fritteusen-Werkstatt
    this.rooms['5'] = makeRoom(5.8, 5.6, (st) => {
      piece(st, solid, steel, 0, 0.55, -1.65, 2.5, 0.96, 1.02);
      piece(st, solid, emissive(0xff8e42), -0.45, 1.05, -1.65, 0.82, 0.06, 0.64);
      piece(st, solid, emissive(0xff6b2b), 0.55, 1.05, -1.65, 0.72, 0.06, 0.64);
      piece(st, solid, wood, -1.95, 1.5, -2.25, 1.1, 0.06, 0.55);
      piece(st, solid, wood, -1.95, 2.0, -2.25, 1.1, 0.06, 0.55);
      for (let i = 0; i < 3; i++) {
        const spare = crownMesh(0.75);
        spare.position.set(-2.2 + i * 0.34, 1.56 + (i % 2) * 0.5, -2.22);
        st.add(spare);
      }
    });

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

  renderPass(time, {
    cctv = 0,
    staticAmt = 0,
    blackout = 0,
    shock = 0,
    quake = 0,
    flicker = 1,
    monitorFlash = 0,
    heat = 0,
    steam = 0,
    irFlash = 0,
    lowPower = 0,
  }) {
    const u = this.postMat.uniforms;
    u.uTime.value = time;
    u.uCctv.value = cctv;
    u.uStatic.value = staticAmt;
    u.uBlackout.value = blackout;
    u.uShock.value = shock;
    u.uQuake.value = quake;
    u.uFlicker.value = flicker;
    u.uMonitorFlash.value = monitorFlash;
    u.uHeat.value = heat;
    u.uSteam.value = steam;
    u.uIrFlash.value = irFlash;
    u.uLowPower.value = lowPower;

    this.renderer.setRenderTarget(this.pixelTarget);
    this.renderer.render(this.scene, this.camera);
    this.lastDrawCalls = this.renderer.info.render.calls;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);

    // Lightweight FPS tracker
    const now = performance.now();
    this.fpsFrames += 1;
    this.fpsAccum += now - this.fpsLastNow;
    this.fpsLastNow = now;
    if (this.fpsAccum >= 500) {
      this.currentFps = Math.min(120, Math.round((this.fpsFrames * 1000) / this.fpsAccum));
      this.fpsFrames = 0;
      this.fpsAccum = 0;
    }
  }

  drawTitle(time) {
    this.setMode('title');
    const reduced = this.isReducedMotion();
    const sway = reduced ? 0 : Math.sin(time * 0.45) * 0.04;
    this.camera.position.set(sway, 1.58, 2.02);
    this.camera.rotation.set(-0.04, sway * -0.15, 0);

    this.titleSpit.spit.rotation.y = time * 1.1;
    this.titleDust.rotation.y = time * 0.04;

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

    const look = Number.isFinite(run.lookSmooth) ? run.lookSmooth : run.lookX;
    const breathY = reduced ? 0 : Math.sin(t * 1.55) * 0.011;
    const panRoll = reduced ? 0 : -(run.lookVel || 0) * 0.008;

    this.camera.position.set(look * 0.34 + shakeX, 1.62 + breathY + shakeY, 0.72);
    this.camera.rotation.set(-0.04, -look * 0.62, shakeRoll + panRoll);

    const leftBounce = Math.sin(run.leftDoorBounce * Math.PI * 2.5) * 0.05 * run.leftDoorBounce;
    const rightBounce = Math.sin(run.rightDoorBounce * Math.PI * 2.5) * 0.05 * run.rightDoorBounce;
    this.leftShutter.position.y = 3.55 - run.leftDoorAnim * 2.38 + leftBounce;
    this.rightShutter.position.y = 3.55 - run.rightDoorAnim * 2.38 + rightBounce;

    this.leftBtnDoor.material.color.setHex(run.leftJammed ? 0x222630 : run.leftDoor ? 0x38f2af : 0xff3b56);
    this.leftBtnLight.material.color.setHex(run.leftJammed ? 0x222630 : run.leftLight ? 0xffe082 : 0x5282a8);
    this.rightBtnDoor.material.color.setHex(run.rightJammed ? 0x222630 : run.rightDoor ? 0x38f2af : 0xff3b56);
    this.rightBtnLight.material.color.setHex(run.rightJammed ? 0x222630 : run.rightLight ? 0xffe082 : 0x5282a8);

    // Desk props animation + live CRT displays
    if (!out) {
      this.deskFan.blades.rotation.z = t * 20;
      this.officeDust.rotation.y = t * 0.035;
      this.officeDust.position.y = Math.sin(t * 0.7) * 0.05;
      this.liveDisplays.update(run);
    }

    // 3D Steam Valve Manometer & Rising Steam Puffs!
    const heat = run.thermal?.heat ?? 16;
    const venting = (run.thermal?.ventingUntil ?? 0) > t;
    const needleAngle = (0.5 - heat / 100) * 2.55;
    this.steamValve.needlePivot.rotation.z = needleAngle;
    this.steamValve.wheel.rotation.z = -(run.thermal?.valveSpin ?? 0);
    if (out) {
      this.steamValve.ledMat.color.setHex(0x101218);
    } else if (heat >= 72) {
      this.steamValve.ledMat.color.setHex(Math.sin(t * 16) > 0 ? 0xff2842 : 0x4a1018);
    } else if (heat >= 45) {
      this.steamValve.ledMat.color.setHex(0x38f2af);
    } else {
      this.steamValve.ledMat.color.setHex(0x204438);
    }
    const showValveSteam = !out && (venting || heat >= 74);
    for (let i = 0; i < this.steamValve.puffs.length; i++) {
      const puff = this.steamValve.puffs[i];
      puff.visible = showValveSteam;
      if (showValveSteam) {
        const cycle = (t * (venting ? 2.6 : 1.1) + i * 0.2) % 1;
        puff.position.y = 0.42 + cycle * 0.55;
        puff.position.x = -0.04 + Math.sin(t * 5 + i) * 0.04 * cycle;
        const sc = 0.045 + cycle * (venting ? 0.11 : 0.065);
        puff.scale.set(sc, sc * 0.85, sc);
        puff.material.opacity = (1 - cycle) * (venting ? 0.52 : 0.24);
      }
    }

    // 3D Thermal Bon Printer animation!
    const activeBon = run.orders?.active;
    const stampPop = run.orders?.stampBounce ?? 0;
    this.deskBonPrinter.root.position.y = 0.92 + Math.sin(stampPop * Math.PI) * 0.045;
    if (!out && activeBon) {
      this.deskBonPrinter.paperGroup.visible = true;
      const elapsed = Math.min(1, (t - activeBon.createdAt) / 0.85);
      const urgent = activeBon.deadline - t < 5.0;
      this.deskBonPrinter.paperGroup.scale.y = 0.2 + elapsed * 0.8;
      this.deskBonPrinter.paperGroup.position.y = 0.16 + elapsed * 0.04;
      const blink = Math.sin(t * (urgent ? 18 : 9)) > 0;
      this.deskBonPrinter.ledMat.color.setHex(urgent ? (blink ? 0xff3550 : 0x3a0c14) : (blink ? 0xffcf56 : 0x38f2af));
      this.deskBonPrinter.lcdMat.color.setHex(urgent ? 0x5c1824 : 0x1d5c48);
    } else {
      this.deskBonPrinter.paperGroup.visible = false;
      this.deskBonPrinter.ledMat.color.setHex(out ? 0x0e1016 : 0x1e3830);
      this.deskBonPrinter.lcdMat.color.setHex(out ? 0x0a0c10 : 0x133028);
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

    const phoneBlink = !out && run.callActive && !run.callMuted && Math.sin(t * 9) > 0;
    this.deskPhone.ledMat.color.setHex(phoneBlink ? 0xff3b56 : 0x2a1016);

    const lowPowerAmt = !out && run.power <= 20 ? Math.min(1, (20 - run.power) / 18 + 0.2) : 0;

    if (out) {
      this.officeAmb.intensity = 0.025;
      this.officeLight.intensity = 0;
      this.emergencyLight.intensity = 0;
      this.officeLightCone.visible = false;
      this.officeDust.visible = false;
      this.officeBulbOrb.material.color.setHex(0x0c0e14);
      this.officeGarland.visible = false;
      this.deskCrt1.visible = false;
      this.deskCrt2.visible = false;
      this.deskCrtGlow.intensity = 0;
      this.leftHallLight.intensity = 0;
      this.rightHallLight.intensity = 0;
      this.leftHallBeam.visible = false;
      this.rightHallBeam.visible = false;
    } else {
      this.officeAmb.intensity = 1.05;
      this.officeLight.intensity = (14.8 - q * 4.2 - lowPowerAmt * 3.2) * run.lightFlicker;
      this.emergencyLight.intensity = lowPowerAmt > 0 ? (2.2 + Math.sin(t * 5.2) * 1.4) * lowPowerAmt : 0;
      this.officeLightCone.visible = true;
      this.officeDust.visible = this.settings.graphics !== 'retro';
      this.officeBulbOrb.material.color.setHex(0xffdf9e);
      this.officeGarland.visible = true;
      this.deskCrt1.visible = true;
      this.deskCrt2.visible = true;
      const warnGlow = (run.seismicLevel || 0) > 0.35 || heat >= 75;
      this.deskCrtGlow.color.setHex(warnGlow ? 0xff3b56 : activeBon ? 0xffcf56 : 0x38f2af);
      this.deskCrtGlow.intensity = warnGlow ? (2.2 + Math.sin(t * 18) * 0.6) : 1.35;
      this.leftHallLight.intensity = run.leftLight ? (27 * run.lightFlicker) : 0;
      this.rightHallLight.intensity = run.rightLight ? (27 * run.lightFlicker) : 0;
      this.leftHallBeam.visible = Boolean(run.leftLight);
      this.rightHallBeam.visible = Boolean(run.rightLight);
    }

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
    const heatNorm = reduced ? 0 : Math.max(0, (heat - 58) / 42);

    this.renderPass(t, {
      cctv: 0,
      staticAmt: run.hallucination ? 0.46 : (run.monitorAnim > 0.06 ? 0.28 : 0),
      blackout,
      shock,
      quake: Math.min(1.2, q),
      flicker: run.lightFlicker,
      monitorFlash: run.monitorFlash || 0,
      heat: heatNorm,
      steam: out ? 0 : (run.thermal?.steamFog ?? 0),
      lowPower: reduced ? lowPowerAmt * 0.4 : lowPowerAmt,
    });
  }

  drawCctv(run) {
    this.setMode('cctv');
    const t = run.time;
    const camId = run.activeCam;
    const videoWarning = run.antonVideo.deadline > run.time;
    const reduced = this.isReducedMotion();

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
        irFlash: run.irFlash || 0,
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

    // Boost CCTV spotlight during IR-Flash!
    const irBoost = (run.irFlash || 0) * 28;
    this.cctvSpot.intensity = 34 + irBoost;
    this.cctvFill.color.setHex(0xffb84d);

    // Animate Hallway Steam Burst Clouds on CAM 2B / 4B!
    const burst = run.thermal?.burstVisual;
    const syncSteamCloud = (cloud, targetCam) => {
      if (!cloud) return;
      const active = Boolean(burst && burst.cam === targetCam && burst.timer > 0);
      cloud.group.visible = active;
      if (active) {
        const life = burst.timer / 1.35;
        cloud.puffs.forEach((p, idx) => {
          p.material.opacity = Math.min(0.75, life * 0.68);
          p.rotation.z = t * 2 + idx;
          const expand = 1 + (1 - life) * 0.85;
          p.scale.setScalar(0.55 * expand);
        });
      }
    };
    syncSteamCloud(this.cam2bSteam, '2B');
    syncSteamCloud(this.cam4bSteam, '4B');

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
      const stunned = (anton.stunUntil ?? 0) > t;
      this.cctvAnton.head.rotation.z = stunned ? -0.32 : (0.16 + Math.sin(t * 2.1) * 0.04);
      this.cctvAnton.arms[1].rotation.x = videoWarning ? -1.45 : stunned ? -1.9 : -0.15;
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
    const activeSteam = (burst && burst.cam === camId && burst.timer > 0)
      ? Math.min(1, 0.55 + (burst.timer / 1.35) * 0.45)
      : (run.thermal?.steamFog ?? 0) * 0.75;

    this.renderPass(t, {
      cctv: 1,
      staticAmt,
      blackout: 0,
      shock: (run.goldenPoster && camId === '2B') ? 0.28 : videoWarning ? 0.12 : 0,
      quake: Math.min(1.2, q),
      flicker: run.lightFlicker,
      monitorFlash: run.monitorFlash || 0,
      steam: activeSteam,
      irFlash: run.irFlash || 0,
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
