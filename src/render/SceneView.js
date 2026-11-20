import * as THREE from 'three';
import { feedIsInterrupted } from '../engine/simulation.js';
import {
  bossHaukeModel,
  chefTorgeModel,
  crownMesh,
  goldenDuckModel,
  lostAntonModel,
  schnorrerTomModel,
  spareMascotHeadMesh,
} from './characters3d.js';
import { createPostShaderMaterial } from './postShader.js';
import {
  batchStaticGroup,
  brassMaterial,
  color,
  emissive,
  material,
  orb,
  PALETTE,
  piece,
  round,
  setEndoEyes,
  solid,
  tapered,
} from './primitives.js';
import {
  arcadeCabinetModel,
  bonPrinterModel,
  crateMesh,
  deskFanModel,
  donerSpitModel,
  doorButtonBoxModel,
  dustParticlesModel,
  hallSteamCloudModel,
  miniDuckModel,
  officePhoneModel,
  partyGarland,
  speziModel,
  steamValveAssemblyModel,
} from './props3d.js';
import {
  arcadeScreenTexture,
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
  anton: { headY: 1.72, fromX: -0.95, stopZ: -0.44, speed: 14, shake: 0.44 },
  tom: { headY: 1.58, fromX: 0.95, stopZ: -0.46, speed: 12, shake: 0.36 },
  hauke: { headY: 1.74, fromX: -0.45, stopZ: -0.58, speed: 15, shake: 1.0 },
  torge: { headY: 1.66, fromX: 0.18, stopZ: -0.46, speed: 11, shake: 0.32 },
  duck: { headY: 1.32, fromX: 0.12, stopZ: -0.52, speed: 20, shake: 0.28 },
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
    this.renderer.toneMappingExposure = 1.18;
    // Set shadowMap.enabled BEFORE creating shadow-casting lights (Three.js r182+ PCFShadowMap)
    this.renderer.shadowMap.enabled = this.settings.graphics === 'hd';
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = color(0x060508);
    this.scene.fog = new THREE.FogExp2(0x07060a, 0.062);

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

    // Shared procedural HD diner/Imbiss textures
    this.floorTex = checkerFloorTexture();
    this.floorTex.repeat.set(6, 6);
    this.wallTex = wallPanelTexture();
    this.wallTex.repeat.set(3, 1);
    this.deskTex = deskWoodTexture();
    this.shutterTex = shutterTexture();
    this.posterNormalTex = posterTexture(false);
    this.posterGoldenTex = posterTexture(true);
    this.rulesPosterTex = rulesPosterTexture(false);
    this.rulesPosterCorruptTex = rulesPosterTexture(true);
    this.arcadeTex = arcadeScreenTexture();
    this.menuBoardTex = menuBoardTexture();
    this.signNormalTex = coveSignTexture(false);
    this.signAngryTex = coveSignTexture(true);
    this.neonStageTex = neonSignTexture("TORGE'S IMBISS", '24H · MITTERNACHTS-DÖNER', '#ff3b56', '#ffcf56');
    this.neonHallTex = neonSignTexture('DÖNER & SPEZI', 'NUR MIT KASSENBON', '#38f2af', '#ff5ea8');
    this.liveDisplays = new LiveDeskDisplays();

    // Scene roots
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
    this.officeRoot.visible = mode === 'office' || mode === 'jumpscare_office';
    this.cctvRoot.visible = mode === 'cctv' || mode === 'jumpscare_cctv';
    this.jumpscareRoot.visible = mode === 'jumpscare_office' || mode === 'jumpscare_cctv';
  }

  buildTitleStage() {
    const g = this.titleRoot;
    const ambient = new THREE.AmbientLight(0x362a34, 1.05);
    g.add(ambient);

    this.titleSpot = new THREE.SpotLight(0xffdca8, 38, 15, 0.72, 0.62, 1.2);
    this.titleSpot.position.set(1.15, 3.35, 2.55);
    this.titleSpot.target.position.set(0.92, 1.38, -1.35);
    this.titleSpot.castShadow = true;
    this.titleSpot.shadow.mapSize.set(512, 512);
    this.titleSpot.shadow.radius = 2;
    g.add(this.titleSpot, this.titleSpot.target);

    this.titleRim = new THREE.PointLight(0xff3b56, 13, 7.5, 1.6);
    this.titleRim.position.set(2.35, 2.0, -2.0);
    g.add(this.titleRim);

    const cyanFill = new THREE.PointLight(0x42d6ff, 8, 7.5, 1.7);
    cyanFill.position.set(-0.9, 1.8, -0.8);
    g.add(cyanFill);

    const staticStage = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ map: this.wallTex, roughness: 0.68, metalness: 0.10 });
    const floorMat = new THREE.MeshStandardMaterial({ map: this.floorTex, roughness: 0.56, metalness: 0.12 });
    const neonMat = new THREE.MeshBasicMaterial({ map: this.neonStageTex });
    const redCurtain = material(0x8f1d2c, 0.62, 0.08);
    piece(staticStage, solid, floorMat, 0, -0.05, -1.0, 9.2, 0.1, 6.2);
    piece(staticStage, solid, wallMat, 0, 1.8, -3.2, 9.6, 4.4, 0.2);
    piece(staticStage, solid, redCurtain, -2.8, 1.9, -2.98, 1.1, 3.8, 0.28);
    piece(staticStage, solid, redCurtain, 3.4, 1.9, -2.98, 1.1, 3.8, 0.28);
    piece(staticStage, solid, neonMat, 0.92, 2.58, -3.04, 2.45, 0.84, 0.06);
    partyGarland(staticStage, -2.6, 3.4, 3.24, -2.62);
    batchStaticGroup(g, staticStage, { castShadow: false, receiveShadow: true });

    this.titleSpit = donerSpitModel();
    this.titleSpit.root.position.set(2.35, 0.0, -2.35);
    this.titleSpit.root.rotation.y = -0.45;
    g.add(this.titleSpit.root);

    this.titleDust = dustParticlesModel(45);
    g.add(this.titleDust);

    this.titleTorge = chefTorgeModel();
    this.titleTorge.root.position.set(0.88, 0.0, -1.35);
    this.titleTorge.root.rotation.y = -0.22;
    g.add(this.titleTorge.root);

    this.titleAnton = lostAntonModel();
    this.titleAnton.root.position.set(0.88, 0.0, -1.35);
    this.titleAnton.root.rotation.y = -0.18;
    setEndoEyes(this.titleAnton, true);
    this.titleAnton.root.visible = false;
    g.add(this.titleAnton.root);

    this.titleTom = schnorrerTomModel();
    this.titleTom.root.position.set(0.90, 0.0, -1.32);
    this.titleTom.root.rotation.y = -0.20;
    setEndoEyes(this.titleTom, true);
    this.titleTom.root.visible = false;
    g.add(this.titleTom.root);

    this.titleHauke = bossHaukeModel();
    this.titleHauke.root.position.set(0.95, 0.0, -1.42);
    this.titleHauke.root.rotation.y = -0.22;
    setEndoEyes(this.titleHauke, true);
    this.titleHauke.root.visible = false;
    g.add(this.titleHauke.root);
  }

  buildOffice() {
    const g = this.officeRoot;
    const floorMat = new THREE.MeshStandardMaterial({ map: this.floorTex, roughness: 0.54, metalness: 0.14 });
    const wallMat = new THREE.MeshStandardMaterial({ map: this.wallTex, roughness: 0.68, metalness: 0.10 });
    const darkMetal = material(0x1b2030, 0.42, 0.62);
    const copperPipe = brassMaterial(PALETTE.copper);
    const shutterMat = new THREE.MeshStandardMaterial({ map: this.shutterTex, roughness: 0.38, metalness: 0.68 });
    const deskWood = new THREE.MeshStandardMaterial({ map: this.deskTex, roughness: 0.56, metalness: 0.10 });
    const steelMat = material(0x6c7991, 0.34, 0.65);

    this.officeAmb = new THREE.AmbientLight(0x423648, 1.12);
    g.add(this.officeAmb);

    this.officeBulbGroup = new THREE.Group();
    this.officeBulbGroup.position.set(0, 3.25, -1.2);
    piece(this.officeBulbGroup, round, darkMetal, 0, -0.22, 0, 0.025, 0.44, 0.025, { shadow: false });
    piece(this.officeBulbGroup, tapered, darkMetal, 0, -0.45, 0, 0.32, 0.15, 0.32, { shadow: false });
    this.officeBulbOrb = piece(this.officeBulbGroup, orb, emissive(0xffe2a8), 0, -0.52, 0, 0.095, 0.095, 0.095);

    const coneGeo = new THREE.ConeGeometry(2.25, 2.85, 24, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xffd89e,
      transparent: true,
      opacity: 0.055,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.officeLightCone = new THREE.Mesh(coneGeo, coneMat);
    this.officeLightCone.position.set(0, -1.9, 0);
    this.officeBulbGroup.add(this.officeLightCone);

    this.officeLight = new THREE.PointLight(0xffd7a2, 16.0, 12.2, 1.38);
    this.officeLight.position.set(0, -0.62, 0.15);
    this.officeLight.castShadow = true;
    this.officeLight.shadow.mapSize.set(512, 512);
    this.officeLight.shadow.bias = -0.002;
    this.officeLight.shadow.radius = 2;
    this.officeBulbGroup.add(this.officeLight);
    g.add(this.officeBulbGroup);

    // Emergency red ceiling beacon light when battery < 20%
    this.emergencyLight = new THREE.PointLight(0xff2842, 0, 6.5, 1.6);
    this.emergencyLight.position.set(0, 2.95, -2.4);
    g.add(this.emergencyLight);

    this.officeDust = dustParticlesModel(55);
    g.add(this.officeDust);

    // Static Batched Architecture & Desk Shell
    const staticOffice = new THREE.Group();
    piece(staticOffice, solid, floorMat, 0, -0.05, -1.4, 7.6, 0.1, 6.2);
    piece(staticOffice, solid, darkMetal, 0, 3.3, -1.4, 7.6, 0.1, 6.2);
    piece(staticOffice, solid, wallMat, 0, 1.65, -3.2, 6.2, 3.4, 0.2);

    // Overhead copper fryer-steam conduit plumbed right down into the left desk valve!
    piece(staticOffice, round, copperPipe, -1.30, 3.16, -2.55, 0.045, 2.4, 0.045).rotation.z = Math.PI / 2;
    piece(staticOffice, round, copperPipe, -1.30, 2.15, -2.98, 0.042, 2.1, 0.042);
    piece(staticOffice, round, copperPipe, -1.30, 1.15, -2.52, 0.036, 0.95, 0.036).rotation.x = Math.PI / 2;

    for (const cx of [-1.95, 1.95]) {
      piece(staticOffice, round, darkMetal, cx, 3.18, -1.4, 0.04, 5.2, 0.04).rotation.x = Math.PI / 2;
    }

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

      // Industrial steel doorway shutter tracks & window sills
      piece(staticOffice, solid, darkMetal, sx - side * 0.06, 2.42, -0.95, 0.28, 0.14, 1.34);
      piece(staticOffice, solid, darkMetal, sx - side * 0.04, 1.25, -0.32, 0.14, 2.45, 0.08);
      piece(staticOffice, solid, darkMetal, sx - side * 0.04, 1.25, -1.58, 0.14, 2.45, 0.08);
      piece(staticOffice, solid, brassMaterial(PALETTE.brass), sx - side * 0.02, 1.03, -2.35, 0.26, 0.05, 1.26);
    }

    // Security Desk + Dual CRT Monitor housings
    piece(staticOffice, solid, deskWood, 0, 0.86, -2.22, 3.20, 0.12, 1.24);
    piece(staticOffice, solid, darkMetal, -1.44, 0.42, -2.22, 0.14, 0.84, 1.08);
    piece(staticOffice, solid, darkMetal, 1.44, 0.42, -2.22, 0.14, 0.84, 1.08);
    piece(staticOffice, solid, darkMetal, 0, 0.42, -2.74, 2.78, 0.78, 0.08);

    // Monitor casings + crumpled Döner foil & shift note
    piece(staticOffice, solid, darkMetal, -0.80, 1.16, -2.32, 0.62, 0.46, 0.44);
    piece(staticOffice, solid, steelMat, -0.80, 1.54, -2.34, 0.50, 0.32, 0.36);
    piece(staticOffice, solid, material(0xfff0a8, 0.85, 0.02), 0.18, 0.925, -1.94, 0.14, 0.01, 0.18).rotation.y = 0.22;
    piece(staticOffice, orb, material(0xd0d8e8, 0.22, 0.82, true), 0.22, 0.96, -2.36, 0.08, 0.055, 0.08);

    batchStaticGroup(g, staticOffice, { castShadow: true, receiveShadow: true });

    // Separate Left & Right Window Glass panes (fog up with condensation when fryer heat rises!)
    this.leftWindowGlassMat = new THREE.MeshStandardMaterial({
      color: 0x8cb8d4,
      transparent: true,
      opacity: 0.15,
      roughness: 0.18,
      metalness: 0.38,
    });
    this.rightWindowGlassMat = this.leftWindowGlassMat.clone();
    this.leftWindowGlass = piece(g, solid, this.leftWindowGlassMat, -3.1, 1.72, -2.35, 0.05, 1.36, 1.18, { shadow: false, receive: false });
    this.rightWindowGlass = piece(g, solid, this.rightWindowGlassMat, 3.1, 1.72, -2.35, 0.05, 1.36, 1.18, { shadow: false, receive: false });

    // Hausordnung Poster (corrupts on Nights 4+) & Clickable Group Poster
    this.officeRulesMat = new THREE.MeshStandardMaterial({ map: this.rulesPosterTex, roughness: 0.58 });
    this.officeRulesPoster = piece(g, solid, this.officeRulesMat, -1.58, 1.98, -3.07, 0.96, 1.24, 0.035, { shadow: false });

    const posterMat = new THREE.MeshStandardMaterial({ map: this.posterNormalTex, roughness: 0.48 });
    this.officePoster = piece(g, solid, posterMat, 0.24, 1.98, -3.07, 1.18, 1.48, 0.04, { shadow: false });
    this.officePoster.userData.propKind = 'poster';
    this.clickables.push(this.officePoster);

    // Festive Triangular Diner Bunting Garland
    this.officeGarland = partyGarland(g, -2.55, 2.55, 3.16, -3.02);

    // Animated Industrial Steel Roller Shutters (Left & Right)
    this.leftShutter = new THREE.Group();
    this.leftShutter.position.set(-3.04, 2.65, -0.95);
    piece(this.leftShutter, solid, shutterMat, 0, 0, 0, 0.14, 2.45, 1.24, { shadow: true });
    g.add(this.leftShutter);

    this.rightShutter = new THREE.Group();
    this.rightShutter.position.set(3.04, 2.65, -0.95);
    piece(this.rightShutter, solid, shutterMat, 0, 0, 0, 0.14, 2.45, 1.24, { shadow: true });
    g.add(this.rightShutter);

    // Clickable 3D Doorframe Switch Boxes (Physical FNaF-1 DOOR + LIGHT buttons!)
    this.leftSwitchBox = doorButtonBoxModel('left');
    this.leftSwitchBox.root.position.set(-2.96, 1.36, -0.18);
    g.add(this.leftSwitchBox.root);
    this.clickables.push(this.leftSwitchBox.root);

    this.rightSwitchBox = doorButtonBoxModel('right');
    this.rightSwitchBox.root.position.set(2.96, 1.36, -0.18);
    g.add(this.rightSwitchBox.root);
    this.clickables.push(this.rightSwitchBox.root);

    // Hallway lights + Volumetric Hallway Beams!
    this.leftHallLight = new THREE.PointLight(0xd9ecff, 0, 7.2, 1.35);
    this.leftHallLight.position.set(-3.72, 2.18, -1.72);
    g.add(this.leftHallLight);

    this.rightHallLight = new THREE.PointLight(0xd9ecff, 0, 7.2, 1.35);
    this.rightHallLight.position.set(3.72, 2.18, -1.72);
    g.add(this.rightHallLight);

    const hallBeamGeo = new THREE.ConeGeometry(1.5, 2.65, 18, 1, true);
    const hallBeamMat = new THREE.MeshBasicMaterial({
      color: 0xd0ebff,
      transparent: true,
      opacity: 0.075,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.leftHallBeam = new THREE.Mesh(hallBeamGeo, hallBeamMat);
    this.leftHallBeam.position.set(-3.72, 1.45, -1.72);
    this.leftHallBeam.visible = false;
    g.add(this.leftHallBeam);

    this.rightHallBeam = new THREE.Mesh(hallBeamGeo, hallBeamMat);
    this.rightHallBeam.position.set(3.72, 1.45, -1.72);
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

    // Center Desk Fan, Crisp Spezi Can, Chef Mini Duck & Coffee Mug
    this.deskFan = deskFanModel();
    this.deskFan.root.position.set(-0.14, 0.92, -2.18);
    g.add(this.deskFan.root);

    this.deskSpezi = speziModel();
    this.deskSpezi.position.set(0.38, 0.92, -1.94);
    this.deskSpezi.userData.propKind = 'spezi';
    g.add(this.deskSpezi);
    this.clickables.push(this.deskSpezi);

    this.deskMiniDuck = miniDuckModel();
    this.deskMiniDuck.position.set(0.64, 0.92, -1.92);
    this.deskMiniDuck.rotation.y = -0.52;
    this.deskMiniDuck.userData.propKind = 'duck';
    g.add(this.deskMiniDuck);
    this.clickables.push(this.deskMiniDuck);

    this.deskMug = new THREE.Group();
    this.deskMug.position.set(0.56, 0.92, -2.34);
    piece(this.deskMug, round, material(0xf4ebd9, 0.4, 0.1), 0, 0.09, 0, 0.072, 0.18, 0.072, { shadow: false });
    piece(this.deskMug, round, material(0x2a140c, 0.3, 0.1), 0, 0.172, 0, 0.062, 0.02, 0.062, { shadow: false });
    g.add(this.deskMug);

    // Interactive 3D Nacht-Bon Receipt Printer (Right Desk)
    this.deskBonPrinter = bonPrinterModel();
    this.deskBonPrinter.root.position.set(0.96, 0.92, -1.95);
    this.deskBonPrinter.root.rotation.y = -0.22;
    g.add(this.deskBonPrinter.root);
    this.clickables.push(this.deskBonPrinter.root);

    // Retro Security Telephone
    this.deskPhone = officePhoneModel();
    this.deskPhone.root.position.set(1.32, 0.92, -2.22);
    this.deskPhone.root.rotation.y = -0.32;
    g.add(this.deskPhone.root);

    // Office Hallway Threats (Endo-Stare enabled for terrifying window/doorway reveals!)
    this.officeAnton = lostAntonModel();
    setEndoEyes(this.officeAnton, true);
    this.officeAnton.root.visible = false;
    g.add(this.officeAnton.root);

    this.officeTom = schnorrerTomModel();
    setEndoEyes(this.officeTom, true);
    this.officeTom.root.visible = false;
    g.add(this.officeTom.root);

    this.officeOutageTorge = chefTorgeModel();
    setEndoEyes(this.officeOutageTorge, true);
    this.officeOutageTorge.root.visible = false;
    g.add(this.officeOutageTorge.root);

    this.outageEyeLight = new THREE.PointLight(0x88f4ff, 0, 2.5, 2.0);
    this.outageEyeLight.position.set(-3.25, 1.78, -0.95);
    g.add(this.outageEyeLight);

    this.officeGoldenDuck = goldenDuckModel();
    this.officeGoldenDuck.root.position.set(0.06, 0.18, -1.34);
    this.officeGoldenDuck.root.visible = false;
    g.add(this.officeGoldenDuck.root);
  }

  buildCctvRooms() {
    const g = this.cctvRoot;
    this.cctvAmb = new THREE.AmbientLight(0x343a4c, 1.04);
    g.add(this.cctvAmb);

    this.cctvSpot = new THREE.SpotLight(0xe4f5ff, 36, 18, 0.88, 0.58, 1.2);
    g.add(this.cctvSpot, this.cctvSpot.target);

    this.cctvFill = new THREE.PointLight(0xffb84d, 5.6, 11, 1.55);
    g.add(this.cctvFill);

    const floorMat = new THREE.MeshStandardMaterial({ map: this.floorTex, roughness: 0.58 });
    const wallMat = new THREE.MeshStandardMaterial({ map: this.wallTex, roughness: 0.68 });
    const darkMat = material(0x161a26, 0.7, 0.15);
    const steel = material(0x7c8ca3, 0.32, 0.65);
    const redCurtain = material(0x8f1d2c, 0.62, 0.08);
    const purpleCurtain = material(0x52267a, 0.62, 0.08);
    const creamCurtain = material(0xe8dcc0, 0.62, 0.06);
    const wood = new THREE.MeshStandardMaterial({ map: this.deskTex, roughness: 0.65 });
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

    // CAM 1A: Döner-Bühne (Twin Döner Spits + Velvet Curtains + Bunting)
    this.rooms['1A'] = makeRoom(7.4, 6.0, (st, r) => {
      piece(st, solid, wood, 0, 0.22, -1.65, 5.6, 0.44, 2.2);
      piece(st, solid, brassMaterial(PALETTE.brass), 0, 0.44, -0.56, 5.64, 0.04, 0.06);
      piece(st, solid, redCurtain, -2.65, 1.85, -2.7, 0.95, 3.2, 0.35);
      piece(st, solid, redCurtain, 2.65, 1.85, -2.7, 0.95, 3.2, 0.35);
      piece(st, solid, stageNeonMat, 0, 2.58, -2.86, 2.55, 0.85, 0.06);
      partyGarland(st, -2.9, 2.9, 3.08, -2.3);
      this.stageSpit = donerSpitModel();
      this.stageSpit.root.position.set(2.22, 0.44, -1.62);
      this.stageSpit.root.rotation.y = -0.35;
      r.add(this.stageSpit.root);
    });

    // CAM 1B: Gastraum (+ Retro FLAPPY ENTE '87 Arcade Cabinet!)
    this.rooms['1B'] = makeRoom(8.2, 7.6, (st) => {
      partyGarland(st, -3.5, 3.5, 3.08, -2.2);
      piece(st, solid, menuMat, 0, 2.25, -3.65, 2.65, 1.25, 0.06);
      const cab = arcadeCabinetModel(this.arcadeTex);
      cab.position.set(-3.2, 0, -2.95);
      cab.rotation.y = 0.35;
      st.add(cab);
      for (const [tx, tz] of [[-1.95, -1.3], [2.05, -1.3], [-1.95, 1.25], [2.05, 1.25]]) {
        piece(st, solid, wood, tx, 0.78, tz, 1.55, 0.1, 1.0);
        piece(st, solid, material(0xc4283b, 0.55, 0.05), tx, 0.835, tz, 1.48, 0.02, 0.92);
        piece(st, round, darkMat, tx, 0.38, tz, 0.12, 0.76, 0.12);
        piece(st, tapered, emissive(0xff3b56), tx - 0.34, 0.94, tz, 0.05, 0.2, 0.05);
        piece(st, tapered, material(0xf4ebd9, 0.4, 0.1), tx + 0.25, 0.94, tz, 0.05, 0.2, 0.05);
        const can = speziModel();
        can.position.set(tx + 0.02, 0.84, tz + 0.18);
        can.scale.setScalar(0.82);
        st.add(can);
      }
    });

    // CAM 1C: Haukes Buffet-Bucht (Pirate Cove Homage Curtains + Easel Sign)
    this.rooms['1C'] = makeRoom(6.4, 5.8, (st, r) => {
      piece(st, solid, wood, 0, 0.18, -1.5, 4.3, 0.36, 2.2);
      piece(st, round, steel, 0, 3.22, -0.52, 0.05, 4.5, 0.05).rotation.z = Math.PI / 2;
      const crackMat = material(0x090a10, 0.95, 0);
      piece(st, solid, crackMat, -0.35, 0.01, 0.45, 0.08, 0.02, 1.4).rotation.y = 0.42;
      piece(st, solid, crackMat, 0.22, 0.01, 0.72, 0.06, 0.02, 1.1).rotation.y = -0.35;
      piece(st, round, wood, 1.68, 0.55, 0.45, 0.06, 1.1, 0.06);

      this.coveCurtainL = new THREE.Group();
      this.coveCurtainR = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        piece(this.coveCurtainL, solid, i % 2 === 0 ? purpleCurtain : creamCurtain, -1.45 + i * 0.36, 1.75, -0.52, 0.35, 3.0, 0.14);
        piece(this.coveCurtainR, solid, i % 2 === 0 ? creamCurtain : purpleCurtain, 0.37 + i * 0.36, 1.75, -0.52, 0.35, 3.0, 0.14);
      }
      r.add(this.coveCurtainL, this.coveCurtainR);

      this.coveSignMat = new THREE.MeshStandardMaterial({ map: this.signNormalTex, roughness: 0.52 });
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

    // CAM 2B: West-Ecke (+ Brass Steam Nozzle & Changing Golden Duck Poster)
    this.rooms['2B'] = makeRoom(4.0, 5.4, (st, r) => {
      const cr = crateMesh(false);
      cr.position.set(1.25, 0, -1.8);
      st.add(cr);
      piece(st, round, brassMaterial(PALETTE.copper), 1.72, 2.65, -0.6, 0.07, 3.4, 0.07).rotation.x = Math.PI / 2;
      piece(st, tapered, brassMaterial(PALETTE.brass), 1.56, 2.42, -0.6, 0.09, 0.22, 0.09).rotation.z = Math.PI * 0.35;
      piece(st, solid, emissive(0xff3b56), 0.2, 3.25, -2.55, 0.65, 0.22, 0.06);

      this.cam2bPosterMat = new THREE.MeshStandardMaterial({ map: this.posterNormalTex, roughness: 0.48 });
      piece(r, solid, this.cam2bPosterMat, -1.86, 1.72, -0.8, 0.05, 1.48, 1.12);
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
      s1.position.set(1.15, 0.62, -1.45);
      st.add(s1);
      piece(st, round, wood, -1.55, 0.9, -0.2, 0.03, 1.8, 0.03).rotation.z = -0.14;
      piece(st, orb, emissive(0xffe09e), 0, 3.12, -0.6, 0.08, 0.09, 0.08);
    });

    // CAM 4A: Ost-Flur
    this.rooms['4A'] = makeRoom(3.8, 9.4, (st) => {
      piece(st, solid, hallNeonMat, 1.82, 2.15, -1.8, 0.06, 0.85, 2.1);
      piece(st, round, darkMat, -1.35, 0.4, -2.6, 0.28, 0.8, 0.28);
    });

    // CAM 4B: Ost-Ecke (+ Brass Steam Nozzle & Steam Burst Cloud)
    this.rooms['4B'] = makeRoom(3.8, 5.2, (st, r) => {
      piece(st, solid, steel, -1.38, 0.82, -1.6, 0.78, 1.64, 0.76);
      piece(st, round, brassMaterial(PALETTE.copper), 1.68, 2.65, -0.5, 0.07, 3.2, 0.07).rotation.x = Math.PI / 2;
      piece(st, tapered, brassMaterial(PALETTE.brass), 1.52, 2.42, -0.5, 0.09, 0.22, 0.09).rotation.z = Math.PI * 0.35;
      piece(st, solid, emissive(0x38f2af), -0.98, 1.45, -1.45, 0.04, 0.08, 0.14);
      this.cam4bSteam = hallSteamCloudModel();
      r.add(this.cam4bSteam.group);
    });

    // CAM 5: Ersatzteil-Werkstatt (+ Creepy Staring Spare Mascot Heads!)
    this.cam5Heads = [];
    this.rooms['5'] = makeRoom(5.8, 5.6, (st, r) => {
      piece(st, solid, steel, 0, 0.55, -1.65, 2.5, 0.96, 1.02);
      piece(st, solid, emissive(0xff8e42), -0.45, 1.05, -1.65, 0.82, 0.06, 0.64);
      piece(st, solid, emissive(0xff6b2b), 0.55, 1.05, -1.65, 0.72, 0.06, 0.64);
      piece(st, solid, wood, -1.95, 1.45, -2.25, 1.35, 0.06, 0.55);
      piece(st, solid, wood, -1.95, 2.05, -2.25, 1.35, 0.06, 0.55);
      for (let i = 0; i < 2; i++) {
        const spare = crownMesh(0.75);
        spare.position.set(-2.35 + i * 0.45, 2.11, -2.22);
        st.add(spare);
      }
      for (let i = 0; i < 3; i++) {
        const sh = spareMascotHeadMesh(i);
        sh.root.position.set(-2.38 + i * 0.44, 1.48, -2.20);
        r.add(sh.root);
        this.cam5Heads.push(sh);
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
    this.jsStrobe = new THREE.PointLight(0xffffff, 24, 9, 1.2);
    this.jsStrobe.position.set(0, 1.72, 0.95);
    g.add(this.jsStrobe);
    this.jsRed = new THREE.PointLight(0xff2040, 22, 9, 1.2);
    this.jsRed.position.set(0.55, 1.45, 0.55);
    g.add(this.jsRed);

    this.jsModels = {
      torge: chefTorgeModel(),
      anton: lostAntonModel(),
      tom: schnorrerTomModel(),
      hauke: bossHaukeModel(),
      duck: goldenDuckModel(),
    };
    for (const m of Object.values(this.jsModels)) {
      setEndoEyes(m, true);
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
    this.camera.rotation.set(-0.03, sway * -0.15, 0);

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
      setEndoEyes(this.titleTorge, glitch);
      const twitch = glitch ? (Math.sin(time * 95) * 0.24) : Math.sin(time * 0.85) * 0.045;
      this.titleTorge.head.rotation.z = twitch;
      this.titleTorge.head.rotation.y = -0.16 + (glitch ? Math.cos(time * 73) * 0.18 : Math.sin(time * 0.5) * 0.05);
      this.titleTorge.core.position.y = Math.sin(time * 1.6) * 0.015;
      this.titleTorge.jaw.rotation.x = glitch ? 0.34 : Math.max(0, Math.sin(time * 2.1)) * 0.08;
    }
    this.titleSpot.intensity = glitch ? 14 + Math.random() * 16 : 22 + Math.sin(time * 3.1) * 2.0;

    this.renderPass(time, {
      cctv: 0,
      staticAmt: glitch ? 0.36 : 0.035,
      blackout: 0,
      shock: glitch ? 0.28 : 0,
      quake: 0,
      flicker: glitch ? 0.68 : 1,
    });
  }

  syncOfficeEnvironment(run) {
    const t = run.time;
    const out = run.powerOutage;
    const reduced = this.isReducedMotion();
    const q = (run.quake || 0) * (reduced ? 0.2 : 1);

    const leftBounce = Math.sin(run.leftDoorBounce * Math.PI * 2.5) * 0.05 * run.leftDoorBounce;
    const rightBounce = Math.sin(run.rightDoorBounce * Math.PI * 2.5) * 0.05 * run.rightDoorBounce;
    this.leftShutter.position.y = 3.55 - run.leftDoorAnim * 2.38 + leftBounce;
    this.rightShutter.position.y = 3.55 - run.rightDoorAnim * 2.38 + rightBounce;

    // 3D Clickable Doorframe Button LEDs
    this.leftSwitchBox.doorMat.color.setHex(run.leftJammed ? 0x222630 : run.leftDoor ? 0x38f2af : 0xff3b56);
    this.leftSwitchBox.lightMat.color.setHex(run.leftJammed ? 0x222630 : run.leftLight ? 0xffe082 : 0x5282a8);
    this.rightSwitchBox.doorMat.color.setHex(run.rightJammed ? 0x222630 : run.rightDoor ? 0x38f2af : 0xff3b56);
    this.rightSwitchBox.lightMat.color.setHex(run.rightJammed ? 0x222630 : run.rightLight ? 0xffe082 : 0x5282a8);

    // Corrupted Hausordnung lore poster on Nights 4+
    const wantRulesTex = run.night >= 4 ? this.rulesPosterCorruptTex : this.rulesPosterTex;
    if (this.officeRulesMat.map !== wantRulesTex) {
      this.officeRulesMat.map = wantRulesTex;
      this.officeRulesMat.needsUpdate = true;
    }

    if (!out) {
      const fanSpeed = (run.speziBoostUntil ?? 0) > t ? 28 : 20;
      this.deskFan.blades.rotation.z = t * fanSpeed;
      this.officeDust.rotation.y = t * 0.035;
      this.officeDust.position.y = Math.sin(t * 0.7) * 0.05;
      this.liveDisplays.update(run);
    }

    // Window glass steam condensation when fryer heat rises!
    const heat = run.thermal?.heat ?? 16;
    const glassFog = out ? 0.12 : 0.14 + Math.max(0, (heat - 58) / 42) * 0.34;
    this.leftWindowGlassMat.opacity = glassFog;
    this.rightWindowGlassMat.opacity = glassFog;

    // 3D Steam Valve Manometer & Rising Steam Puffs
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

    // 3D Thermal Bon Printer animation
    const activeBon = run.orders?.active;
    const stampPop = run.orders?.stampBounce ?? 0;
    this.deskBonPrinter.root.position.y = 0.92 + Math.sin(stampPop * Math.PI) * 0.045;
    if (!out && activeBon) {
      this.deskBonPrinter.paperGroup.visible = true;
      const elapsed = Math.min(1, (t - activeBon.createdAt) / 0.85);
      const urgent = activeBon.deadline - t < 5.0;
      const express = (t - activeBon.createdAt) <= 5.5;
      this.deskBonPrinter.paperGroup.scale.y = 0.2 + elapsed * 0.8;
      this.deskBonPrinter.paperGroup.position.y = 0.16 + elapsed * 0.04;
      const blink = Math.sin(t * (urgent ? 18 : 11)) > 0;
      this.deskBonPrinter.ledMat.color.setHex(
        urgent ? (blink ? 0xff3550 : 0x3a0c14) : express ? (blink ? 0x38f2af : 0x165c42) : (blink ? 0xffcf56 : 0x38f2af),
      );
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
      this.officeAmb.intensity = 0.03;
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
      this.officeAmb.intensity = 1.12;
      this.officeLight.intensity = (16.0 - q * 4.2 - lowPowerAmt * 3.2) * run.lightFlicker;
      this.emergencyLight.intensity = lowPowerAmt > 0 ? (2.2 + Math.sin(t * 5.2) * 1.4) * lowPowerAmt : 0;
      this.officeLightCone.visible = true;
      this.officeDust.visible = this.settings.graphics !== 'retro';
      this.officeBulbOrb.material.color.setHex(0xffe2a8);
      this.officeGarland.visible = true;
      this.deskCrt1.visible = true;
      this.deskCrt2.visible = true;
      const warnGlow = (run.seismicLevel || 0) > 0.35 || heat >= 75;
      this.deskCrtGlow.color.setHex(warnGlow ? 0xff3b56 : activeBon ? 0xffcf56 : 0x38f2af);
      this.deskCrtGlow.intensity = warnGlow ? (2.2 + Math.sin(t * 18) * 0.6) : 1.35;
      this.leftHallLight.intensity = run.leftLight ? (22 * run.lightFlicker) : 0;
      this.rightHallLight.intensity = run.rightLight ? (22 * run.lightFlicker) : 0;
      this.leftHallBeam.visible = Boolean(run.leftLight);
      this.rightHallBeam.visible = Boolean(run.rightLight);
    }

    return { out, q, heat, lowPowerAmt, reduced };
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
    const { out, q, heat, lowPowerAmt, reduced } = this.syncOfficeEnvironment(run);

    const shakeX = q > 0.01 ? (Math.sin(run.quakeTime * 54) * 0.095 * q) : 0;
    const shakeY = q > 0.01 ? (Math.cos(run.quakeTime * 68) * 0.075 * q) : 0;
    const shakeRoll = q > 0.01 ? (Math.sin(run.quakeTime * 46) * 0.055 * q) : 0;

    const look = Number.isFinite(run.lookSmooth) ? run.lookSmooth : run.lookX;
    const breathY = reduced ? 0 : Math.sin(t * 1.55) * 0.011;
    const panRoll = reduced ? 0 : -(run.lookVel || 0) * 0.008;

    this.camera.position.set(look * 0.34 + shakeX, 1.62 + breathY + shakeY, 0.72);
    this.camera.rotation.set(-0.04, -look * 0.62, shakeRoll + panRoll);

    // Authentic FNaF 1 Doorway & Window Threat Visibility!
    // Left Light: Open door -> Anton in doorway; Closed door -> Anton's silhouette & glowing phone right outside Left Window!
    const showAnton = !out && run.leftLight && run.animatronics.anton.room === 'left_door';
    this.officeAnton.root.visible = showAnton;
    if (showAnton) {
      if (run.leftDoor) {
        this.officeAnton.root.position.set(-3.48, 0.14, -2.32);
        this.officeAnton.root.rotation.y = Math.PI / 2 + 0.12;
      } else {
        this.officeAnton.root.position.set(-3.62, 0.02, -1.06);
        this.officeAnton.root.rotation.y = Math.PI / 2 - 0.18;
      }
      this.officeAnton.head.rotation.z = 0.18 + Math.sin(t * 3.8) * 0.05;
      this.officeAnton.jaw.rotation.x = 0.16 + Math.abs(Math.sin(t * 3.1)) * 0.08;
      this.officeAnton.arms[1].rotation.x = -0.85;
    }

    // Right Light: Tom pressed right up against the Right Office Window!
    const showTom = !out && run.rightLight && run.animatronics.tom.room === 'right_door';
    this.officeTom.root.visible = showTom;
    if (showTom) {
      this.officeTom.root.position.set(3.46, 0.24, -2.30);
      this.officeTom.root.rotation.y = -Math.PI / 2 + 0.18;
      this.officeTom.head.rotation.y = Math.sin(t * 2.8) * 0.07;
      this.officeTom.jaw.rotation.x = 0.18 + Math.abs(Math.sin(t * 4.2)) * 0.10;
    }

    // Power Outage Torge (Left Doorway Toreador Jingle) OR Subtle East Blind-Spot Glint when Torge camps 4B!
    const showOutageTorge = Boolean(out && out.phase === 'jingle' && out.eyesOn);
    const showEastTorgePeek = Boolean(!out && run.rightLight && !run.rightDoor && run.animatronics.torge.room === '4B');
    this.officeOutageTorge.root.visible = showOutageTorge || showEastTorgePeek;
    if (showOutageTorge) {
      this.officeOutageTorge.root.position.set(-3.66, 0.0, -0.98);
      this.officeOutageTorge.root.rotation.y = Math.PI / 2 - 0.10;
      this.officeOutageTorge.jaw.rotation.x = 0.12 + Math.abs(Math.sin(t * 6.5)) * 0.16;
      this.outageEyeLight.position.set(-3.25, 1.78, -0.95);
      this.outageEyeLight.intensity = 3.4;
    } else if (showEastTorgePeek) {
      this.officeOutageTorge.root.position.set(4.18, 0.0, -1.28);
      this.officeOutageTorge.root.rotation.y = -Math.PI / 2 + 0.12;
      this.officeOutageTorge.jaw.rotation.x = 0.22;
      this.outageEyeLight.position.set(3.65, 1.78, -1.25);
      this.outageEyeLight.intensity = 1.6;
    } else {
      this.outageEyeLight.intensity = 0;
    }

    this.officeGoldenDuck.root.visible = Boolean(run.goldenActive && !out);
    if (this.officeGoldenDuck.root.visible) {
      this.officeGoldenDuck.head.rotation.z = -0.26 + Math.sin(t * 28) * 0.035;
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
      if (m.jaw) m.jaw.rotation.x = 0;
    }

    const sweep = run.camPan * 0.28;
    const q = (run.quake || 0) * (reduced ? 0.2 : 1);
    const qx = q > 0.02 ? Math.sin(run.quakeTime * 58) * 0.08 * q : 0;
    const qy = q > 0.02 ? Math.cos(run.quakeTime * 66) * 0.06 * q : 0;

    const irBoost = (run.irFlash || 0) * 18;
    this.cctvSpot.intensity = 18.5 + irBoost;
    this.cctvFill.color.setHex(0xffb84d);

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
      this.camera.position.set(0.15 + qx, 2.32 + qy, 2.42);
      this.camera.lookAt(sweep * 2.1, 1.32, -1.55);
      this.cctvSpot.position.set(0, 3.25, 1.6);
      this.cctvSpot.target.position.set(0, 1.2, -1.6);
      this.cctvFill.position.set(0, 2.4, 0.2);
      this.stageSpit.spit.rotation.y = t * 1.4;
    } else if (camId === '1B') {
      this.camera.position.set(-2.5 + qx, 2.55 + qy, 3.1);
      this.camera.lookAt(sweep * 2.8, 1.05, -1.25);
      this.cctvSpot.position.set(0, 3.3, 1.0);
      this.cctvSpot.target.position.set(0, 0.9, -1.5);
      this.cctvFill.position.set(0, 2.2, -1.5);
    } else if (camId === '1C') {
      this.camera.position.set(-1.2 + qx, 2.22 + qy, 2.38);
      this.camera.lookAt(0.15 + sweep * 1.3, 1.32, -1.1);
      this.cctvSpot.position.set(0, 3.15, 1.85);
      this.cctvSpot.target.position.set(0, 1.2, -1.1);
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
      this.camera.lookAt(-0.45 + sweep * 0.7, 1.48, -1.2);
      this.cctvSpot.position.set(0.5, 3.1, 1.6);
      this.cctvSpot.target.position.set(-0.5, 1.35, -1.1);
      this.cctvFill.color.setHex(run.goldenPoster ? 0xffcf4d : 0xff5a66);
      this.cctvFill.position.set(-0.5, 2.1, -0.5);
      this.cam2bPosterMat.map = run.goldenPoster ? this.posterGoldenTex : this.posterNormalTex;
    } else if (camId === '3') {
      this.camera.position.set(0.9 + qx, 2.6 + qy, 1.7);
      this.camera.lookAt(-0.2 + sweep * 0.6, 1.25, -1.0);
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
      this.camera.position.set(-0.7 + qx, 2.22 + qy, 2.05);
      this.camera.lookAt(0.12 + sweep * 0.55, 1.48, -1.0);
      this.cctvSpot.position.set(-0.4, 3.0, 1.5);
      this.cctvSpot.target.position.set(0.2, 1.35, -0.9);
      this.cctvFill.position.set(0, 2.1, 0);
    } else if (camId === '5') {
      this.camera.position.set(1.6 + qx, 2.35 + qy, 2.2);
      this.camera.lookAt(-0.4 + sweep * 1.1, 1.35, -1.4);
      this.cctvSpot.position.set(0.6, 3.2, 1.6);
      this.cctvSpot.target.position.set(-0.3, 1.2, -1.4);
      this.cctvFill.color.setHex(0xff8e42);
      this.cctvFill.position.set(-0.4, 1.8, -1.4);
      const stare = Boolean(run.cam5Stare);
      for (const sh of this.cam5Heads) {
        sh.pins.visible = stare;
        sh.root.rotation.y = stare ? 0.62 : 0.12;
      }
    }

    const { torge, anton, tom, hauke } = run.animatronics;
    const stageStare = run.night >= 4 && Math.sin(t * 0.9) > 0.92;

    if (torge.room === camId) {
      this.cctvTorge.root.visible = true;
      this.cctvTorge.core.position.y = Math.sin(t * 1.7) * 0.014;
      setEndoEyes(this.cctvTorge, camId !== '1A' || stageStare);
      if (camId === '1A') {
        this.cctvTorge.root.position.set(0, 0.44, -1.55);
        this.cctvTorge.root.rotation.y = 0;
        this.cctvTorge.head.rotation.y = stageStare ? 0.08 : Math.sin(t * 0.7) * 0.14;
        this.cctvTorge.head.rotation.x = stageStare ? -0.26 : 0;
        this.cctvTorge.jaw.rotation.x = Math.max(0, Math.sin(t * 2.4)) * 0.12;
      } else if (camId === '1B') {
        this.cctvTorge.root.position.set(0.3, 0, -2.35);
        this.cctvTorge.root.rotation.y = -0.35;
        this.cctvTorge.head.rotation.x = -0.18;
      } else if (camId === '4A') {
        this.cctvTorge.root.position.set(-0.45, 0, -1.2);
        this.cctvTorge.root.rotation.y = 0.22;
        this.cctvTorge.head.rotation.x = -0.16;
      } else if (camId === '4B') {
        // Iconic FNaF-1 CAM 4B Freddy Extreme Close-Up Stare!
        this.cctvTorge.root.position.set(-0.22, 0.22, 0.85);
        this.cctvTorge.root.rotation.y = -0.32;
        this.cctvTorge.head.rotation.x = -0.28;
        this.cctvTorge.head.rotation.z = Math.sin(t * 2.2) * 0.07;
        this.cctvTorge.jaw.rotation.x = 0.22 + Math.abs(Math.sin(t * 3.1)) * 0.12;
      }
    }

    if (anton.room === camId) {
      this.cctvAnton.root.visible = true;
      this.cctvAnton.core.position.y = Math.sin(t * 2.0) * 0.014;
      const closeUp = camId === '2B' || camId === '5' || videoWarning || stageStare;
      setEndoEyes(this.cctvAnton, closeUp);
      if (camId === '1A') {
        this.cctvAnton.root.position.set(-1.38, 0.44, -1.52);
        this.cctvAnton.root.rotation.y = 0.18;
      } else if (camId === '1B') {
        this.cctvAnton.root.position.set(-1.25, 0, -0.35);
        this.cctvAnton.root.rotation.y = 0.42;
      } else if (camId === '5') {
        // Iconic FNaF-1 Backstage Close-Up Lens Stare!
        this.cctvAnton.root.position.set(0.68, 0.18, 0.92);
        this.cctvAnton.root.rotation.y = 0.56;
      } else if (camId === '3') {
        this.cctvAnton.root.position.set(0.15, 0, 0.15);
        this.cctvAnton.root.rotation.y = 0.48;
      } else if (camId === '2A') {
        this.cctvAnton.root.position.set(0.45, 0, -0.75);
        this.cctvAnton.root.rotation.y = -0.22;
      } else if (camId === '2B') {
        const twitchMode = !reduced && (anton.subPose === 1 || run.ai.anton >= 12);
        this.cctvAnton.root.position.set(0.32, 0.16, 0.85);
        this.cctvAnton.root.rotation.y = 0.45;
        this.cctvAnton.jaw.rotation.x = twitchMode ? (0.20 + Math.abs(Math.sin(t * 28)) * 0.28) : 0.12;
      }
      const stunned = (anton.stunUntil ?? 0) > t;
      this.cctvAnton.head.rotation.z = stunned ? -0.34 : (0.14 + Math.sin(t * 2.1) * 0.04);
      this.cctvAnton.arms[1].rotation.x = videoWarning ? -1.45 : stunned ? -1.85 : -0.35;
      if (videoWarning) {
        const lean = reduced ? 0.16 : 0.30;
        this.cctvAnton.root.position.x = THREE.MathUtils.lerp(this.cctvAnton.root.position.x, this.camera.position.x, lean);
        this.cctvAnton.root.position.z = THREE.MathUtils.lerp(this.cctvAnton.root.position.z, this.camera.position.z, lean);
        this.cctvAnton.head.rotation.z = -0.22;
      }
    }

    if (tom.room === camId) {
      this.cctvTom.root.visible = true;
      this.cctvTom.core.position.y = Math.sin(t * 2.3) * 0.014;
      setEndoEyes(this.cctvTom, camId === '4B' || stageStare);
      if (camId === '1A') {
        this.cctvTom.root.position.set(1.36, 0.44, -1.52);
        this.cctvTom.root.rotation.y = -0.18;
      } else if (camId === '1B') {
        this.cctvTom.root.position.set(1.22, 0, 0.18);
        this.cctvTom.root.rotation.y = -0.58;
      } else if (camId === '4A') {
        this.cctvTom.root.position.set(0.35, 0, -0.45);
        this.cctvTom.root.rotation.y = -0.15;
      } else if (camId === '4B') {
        const twitchMode = !reduced && (tom.subPose === 1 || run.ai.tom >= 12);
        this.cctvTom.root.position.set(-0.18, 0.22, 0.88);
        this.cctvTom.root.rotation.y = -0.36;
        this.cctvTom.head.rotation.z = twitchMode ? Math.sin(t * 24) * 0.18 : -0.12;
        this.cctvTom.jaw.rotation.x = twitchMode ? (0.24 + Math.abs(Math.sin(t * 26)) * 0.24) : 0.14;
      }
    }

    if (camId === '1C' && hauke.stage < 3) {
      this.cctvHauke.root.visible = hauke.stage >= 1;
      setEndoEyes(this.cctvHauke, hauke.stage >= 2);
      this.cctvHauke.core.position.y = Math.sin(t * 2.2) * 0.018;
      if (hauke.stage === 1) {
        this.cctvHauke.root.position.set(0.0, 0.36, -1.18);
        this.cctvHauke.root.rotation.y = -0.14;
        this.cctvHauke.jaw.rotation.x = 0.08;
      } else if (hauke.stage === 2) {
        this.cctvHauke.root.position.set(-0.08, 0.36, -0.28);
        this.cctvHauke.root.rotation.y = -0.26;
        this.cctvHauke.jaw.rotation.x = 0.24;
      }
      this.cctvHauke.legs[0].rotation.x = 0;
      this.cctvHauke.legs[1].rotation.x = 0;
      this.cctvHauke.arms[0].rotation.x = 0;
      this.cctvHauke.arms[1].rotation.x = 0;
    } else if (camId === '2A' && hauke.sprint.active && hauke.sprint.triggered) {
      this.cctvHauke.root.visible = true;
      setEndoEyes(this.cctvHauke, true);
      const p = Math.min(1, hauke.sprint.progress);
      this.cctvHauke.root.position.set(Math.sin(t * 24) * 0.12, Math.abs(Math.sin(t * 22)) * 0.22, -4.2 + p * 7.2);
      this.cctvHauke.root.rotation.y = Math.sin(t * 18) * 0.1;
      this.cctvHauke.jaw.rotation.x = 0.36;
      this.cctvHauke.legs[0].rotation.x = Math.sin(t * 22) * 0.85;
      this.cctvHauke.legs[1].rotation.x = -Math.sin(t * 22) * 0.85;
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

  /**
   * Renders terrifying in-context 3D Jumpscares right inside the flickering Security Office (or live CCTV room)!
   */
  drawJumpscare(run) {
    const js = run.jumpscare;
    const video = js.cause === 'video';
    this.setMode(video ? 'jumpscare_cctv' : 'jumpscare_office');

    if (!video) {
      this.syncOfficeEnvironment(run);
      this.officeAnton.root.visible = false;
      this.officeTom.root.visible = false;
      this.officeOutageTorge.root.visible = false;
      this.officeGoldenDuck.root.visible = false;
      this.officeLight.intensity = 10 + Math.sin(js.timer * 12) * 3;
    } else {
      const targetRoom = js.cam || run.activeCam || '1A';
      for (const [id, room] of Object.entries(this.rooms)) {
        room.visible = id === targetRoom;
      }
      for (const m of [this.cctvTorge, this.cctvAnton, this.cctvTom, this.cctvHauke]) {
        m.root.visible = false;
      }
    }

    const p = Math.min(1, js.timer / js.duration);
    const t = js.timer;

    for (const [key, m] of Object.entries(this.jsModels)) {
      m.root.visible = key === js.who;
    }
    const active = this.jsModels[js.who] ?? this.jsModels.torge;
    const shot = SCARE_SHOTS[js.who] ?? SCARE_SHOTS.torge;
    const reduced = this.isReducedMotion();
    const lunge = reduced ? 0.85 : 1 - Math.exp(-t * (video ? 9 : shot.speed));
    const shake = reduced ? 0 : shot.shake;

    this.camera.position.set(
      Math.sin(t * 34) * 0.075 * shake,
      1.62 + Math.cos(t * 38) * 0.065 * shake,
      0.72,
    );
    this.camera.rotation.set(
      -0.02 + Math.cos(t * 29) * 0.04 * shake,
      0,
      Math.sin(t * 26) * 0.11 * shake,
    );

    const stopZ = video ? -0.18 : shot.stopZ;
    const startZ = stopZ - (video ? 0.85 : 1.55);
    const baseY = (js.who === 'duck' ? 0.36 : -0.12) + (1.62 - shot.headY);

    active.root.position.set(
      (video ? 0.08 : shot.fromX) * (1 - lunge) + Math.sin(t * 36) * 0.09 * shake,
      baseY + Math.cos(t * 24) * 0.06 * shake,
      startZ + lunge * (stopZ - startZ),
    );
    active.root.rotation.y = (1 - lunge) * -shot.fromX * 0.42;

    if (active.head) {
      active.head.rotation.z = video ? -0.22 : Math.sin(t * 22) * 0.22 * shake;
      active.head.rotation.x = video ? 0.08 : Math.cos(t * 19) * 0.14 * shake;
    }
    if (active.jaw) {
      active.jaw.rotation.x = 0.28 + Math.abs(Math.sin(t * 38)) * 0.42;
    }
    if (active.arms) {
      active.arms[0].rotation.x = -lunge * (video ? 1.35 : 0.95);
      active.arms[1].rotation.x = -lunge * (js.who === 'tom' ? 1.25 : 0.92);
      active.arms[0].rotation.z = -0.32 * lunge;
      active.arms[1].rotation.z = 0.32 * lunge;
    }

    this.jsStrobe.intensity = video ? 11 : 6.5 + 4.5 * lunge;
    this.jsRed.intensity = video ? 4 : 8.5;

    this.renderPass(t, {
      cctv: video ? 1 : 0,
      staticAmt: video ? 0.14 + p * 0.26 : 0.08,
      blackout: Math.max(0, (p - 0.86) / 0.14),
      shock: video ? 0.22 : 0.44,
      quake: shake,
      flicker: 1,
      monitorFlash: 0,
    });
  }
}
