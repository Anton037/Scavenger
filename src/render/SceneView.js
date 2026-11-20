import * as THREE from 'three';
import { COSMETIC_MAP } from '../config/cosmetics.js';
import { feedIsInterrupted } from '../engine/simulation.js';
import {
  applyStalkerPose,
  bossHaukeModel,
  chefTorgeModel,
  crownMesh,
  filthyDuckSuitModel,
  invalidateCharacterTextures,
  lostAntonModel,
  schnorrerTomModel,
  spareMascotHeadMesh,
} from './characters3d.js';
import { onOverridesLoaded } from './overrides.js';
import { invalidatePortraitCache } from './portraits.js';
import { createPostShaderMaterial } from './postShader.js';
import {
  batchStaticGroup,
  brassMaterial,
  color,
  emissive,
  endoMaterial,
  material,
  orb,
  PALETTE,
  piece,
  round,
  setIrEyeShine,
  solid,
  tapered,
} from './primitives.js';
import {
  breakerBoxModel,
  buildDeskCosmeticsGroup,
  centerPassThroughHoodModel,
  crateMesh,
  deskFanModel,
  donerSpitModel,
  doorButtonBoxModel,
  dustParticlesModel,
  hallSteamCloudModel,
  mopBucketModel,
  officePhoneModel,
  prepBaggingStationModel,
  prepFryerStationModel,
  speziModel,
  steamValveAssemblyModel,
  wetFloorConeModel,
} from './props3d.js';
import {
  ceramicWallPbrSet,
  corrugatedShutterPbrSet,
  coveSignTexture,
  deskWoodTexture,
  LiveDeskDisplays,
  menuBoardTexture,
  neonSignTexture,
  posterTexture,
  quarryFloorPbrSet,
  rainWindowTexture,
  stainlessSteelPbrSet,
} from './textures.js';

const SCARE_SHOTS = {
  anton: { headY: 1.72, fromX: -0.65, stopZ: -0.44, speed: 14, shake: 0.44 },
  tom: { headY: 1.58, fromX: 0.65, stopZ: -0.46, speed: 13, shake: 0.38 },
  hauke: { headY: 1.78, fromX: -0.38, stopZ: -0.58, speed: 15, shake: 0.95 },
  torge: { headY: 1.66, fromX: 0.08, stopZ: -0.46, speed: 12, shake: 0.36 },
  duck: { headY: 1.64, fromX: 0.04, stopZ: -0.50, speed: 18, shake: 0.42 },
};

export class SceneView {
  constructor(canvas, settings = {}) {
    this.reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.settings = {
      crt: ['subtle', 'strong', 'off'].includes(settings.crt) ? settings.crt : 'subtle',
      reducedMotion: Boolean(settings.reducedMotion),
    };
    this.cosmetics = {
      deskEquipped: [],
      activePoster: 'poster_default',
      activeShader: 'vhs_standard',
    };

    this.canvas = canvas;
    // Unified PSX+ pipeline: one fixed internal pixel resolution (see resize()) with
    // 4x MSAA, linear upscale and VHS post — identical look & load on every device.
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = color(0x040507);
    this.scene.fog = new THREE.FogExp2(0x050609, 0.068);

    this.camera = new THREE.PerspectiveCamera(56, 16 / 9, 0.08, 38);
    this.camera.rotation.order = 'YXZ';
    this.raycaster = new THREE.Raycaster();
    this._ndc = new THREE.Vector2();
    this._camDir = new THREE.Vector3();
    this.clickables = [];

    // Performance telemetry
    this.fpsFrames = 0;
    this.fpsAccum = 0;
    this.fpsLastNow = performance.now();
    this.currentFps = 60;
    this.lastDrawCalls = 0;

    this.pixelTarget = new THREE.WebGLRenderTarget(712, 400, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
      samples: 4,
    });
    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postMat = createPostShaderMaterial(this.pixelTarget.texture);
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMat));

    // Shared Procedural PBR Surface Sets (Albedo + Sobel Normal + Roughness)
    this.floorPbr = quarryFloorPbrSet();
    for (const k of ['map', 'normalMap', 'roughnessMap']) this.floorPbr[k].repeat.set(6, 6);
    this.wallPbr = ceramicWallPbrSet();
    for (const k of ['map', 'normalMap', 'roughnessMap']) this.wallPbr[k].repeat.set(3, 1);
    this.steelPbr = stainlessSteelPbrSet();
    this.shutterPbr = corrugatedShutterPbrSet();

    this.deskTex = deskWoodTexture();
    this.rainTex = rainWindowTexture();
    this.posterTextures = {
      poster_default: posterTexture('poster_default'),
      poster_retro_doner: posterTexture('poster_retro_doner'),
      poster_missing: posterTexture('poster_missing'),
      golden: posterTexture('golden'),
    };
    this.menuBoardTex = menuBoardTexture();
    this.signNormalTex = coveSignTexture(false);
    this.signAngryTex = coveSignTexture(true);
    this.neonStageTex = neonSignTexture("TORGE'S IMBISS", 'NACHTSCHICHT · 00–06 UHR', '#d83848', '#d8a842');
    this.neonHallTex = neonSignTexture('AUSGABE & PFAND', 'KEIN ZUTRITT', '#48c896', '#d86842');
    this.liveDisplays = new LiveDeskDisplays();

    // Scene roots
    this.titleRoot = new THREE.Group();
    this.officeRoot = new THREE.Group();
    this.cctvRoot = new THREE.Group();
    this.vhsRoot = new THREE.Group();
    this.archiveRoot = new THREE.Group();
    this.jumpscareRoot = new THREE.Group();
    this.scene.add(
      this.titleRoot,
      this.officeRoot,
      this.cctvRoot,
      this.vhsRoot,
      this.archiveRoot,
      this.jumpscareRoot,
    );

    this.buildTitleStage();
    this.buildOffice();
    this.buildCctvRooms();
    this.buildVhsMinigameScenes();
    this.buildArchiveViewerStage();
    this.buildJumpscareStage();
    this.applySettings(this.settings);

    // Refresh character face textures if user configured `public/overrides.json`
    onOverridesLoaded((manifest) => {
      if (manifest?.faces && Object.keys(manifest.faces).length > 0) {
        invalidateCharacterTextures();
        invalidatePortraitCache();
      }
    });
  }

  makeFloorMaterial() {
    return new THREE.MeshStandardMaterial({
      map: this.floorPbr.map,
      normalMap: this.floorPbr.normalMap,
      roughnessMap: this.floorPbr.roughnessMap,
      roughness: 0.72,
      metalness: 0.08,
    });
  }

  makeWallMaterial() {
    return new THREE.MeshStandardMaterial({
      map: this.wallPbr.map,
      normalMap: this.wallPbr.normalMap,
      roughnessMap: this.wallPbr.roughnessMap,
      roughness: 0.78,
      metalness: 0.06,
    });
  }

  makeSteelMaterial() {
    return new THREE.MeshStandardMaterial({
      map: this.steelPbr.map,
      normalMap: this.steelPbr.normalMap,
      roughnessMap: this.steelPbr.roughnessMap,
      roughness: 0.44,
      metalness: 0.76,
    });
  }

  isReducedMotion() {
    return Boolean(this.settings.reducedMotion || this.reducedMotionQuery.matches);
  }

  getPerfSnapshot() {
    return {
      fps: this.currentFps,
      drawCalls: this.lastDrawCalls,
      mode: 'psx-plus',
    };
  }

  applyCosmetics(cosmeticState = {}) {
    this.cosmetics = {
      deskEquipped: Array.isArray(cosmeticState.deskEquipped) ? [...cosmeticState.deskEquipped] : [],
      activePoster: cosmeticState.activePoster || 'poster_default',
      activeShader: cosmeticState.activeShader || 'vhs_standard',
    };
    const shaderItem = COSMETIC_MAP[this.cosmetics.activeShader];
    this.postMat.uniforms.uVhsTheme.value = shaderItem?.shaderCode ?? 0;

    if (this.deskCosmetics) {
      for (const [id, group] of Object.entries(this.deskCosmetics.items)) {
        group.visible = this.cosmetics.deskEquipped.includes(id);
      }
    }
    if (this.officePosterMat) {
      const nextTex = this.posterTextures[this.cosmetics.activePoster] ?? this.posterTextures.poster_default;
      if (this.officePosterMat.map !== nextTex) {
        this.officePosterMat.map = nextTex;
        this.officePosterMat.needsUpdate = true;
      }
    }
  }

  applySettings(next = {}) {
    if (['subtle', 'strong', 'off'].includes(next.crt)) {
      this.settings.crt = next.crt;
    }
    if (typeof next.reducedMotion === 'boolean') {
      this.settings.reducedMotion = next.reducedMotion;
    }
    this.postMat.uniforms.uRetro.value = 1.0;
    this.postMat.uniforms.uCrtStrength.value = this.settings.crt === 'off' ? 0.0 : this.settings.crt === 'strong' ? 0.95 : 0.55;
    this.resize();
  }

  resize() {
    const w = Math.max(320, Math.floor(window.innerWidth));
    const h = Math.max(240, Math.floor(window.innerHeight));
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = 56;
    this.camera.updateProjectionMatrix();

    // Unified PSX+ internal resolution: fixed 400 rows, width follows the aspect
    // ratio. Constant ~0.29 MP fragment load on every device (phone-first), while
    // 4x MSAA + mipmapped textures keep it crisp — the HD×Retro sweet spot.
    const ph = 400;
    const pw = Math.max(600, Math.min(960, Math.round((ph * w) / h)));
    this.postMat.uniforms.uPixelH.value = ph;
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
        if (!cur.visible) break;
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
    this.vhsRoot.visible = mode === 'vhs';
    this.archiveRoot.visible = mode === 'archive';
    this.jumpscareRoot.visible = mode === 'jumpscare_office' || mode === 'jumpscare_cctv';
  }

  // ==================== TITLE SCREEN 3:00 AM IMBISS DIORAMA ====================
  buildTitleStage() {
    const g = this.titleRoot;
    g.add(new THREE.AmbientLight(0x1e242c, 0.72));

    this.titleSpot = new THREE.SpotLight(0xdce8f0, 26, 14, 0.68, 0.65, 1.3);
    this.titleSpot.position.set(1.15, 3.25, 2.35);
    this.titleSpot.target.position.set(0.92, 1.38, -1.35);
    this.titleSpot.castShadow = true;
    this.titleSpot.shadow.mapSize.set(512, 512);
    this.titleSpot.shadow.bias = -0.0018;
    this.titleSpot.shadow.normalBias = 0.02;
    g.add(this.titleSpot, this.titleSpot.target);

    const warmSpitGlow = new THREE.PointLight(0xd85a24, 9, 6.5, 1.7);
    warmSpitGlow.position.set(2.35, 1.35, -2.1);
    g.add(warmSpitGlow);

    const staticStage = new THREE.Group();
    const wallMat = this.makeWallMaterial();
    const floorMat = this.makeFloorMaterial();
    const steelMat = this.makeSteelMaterial();
    const neonMat = new THREE.MeshBasicMaterial({ map: this.neonStageTex });
    piece(staticStage, solid, floorMat, 0, -0.05, -1.0, 9.2, 0.1, 6.2);
    piece(staticStage, solid, wallMat, 0, 1.8, -3.2, 9.6, 4.0, 0.2);
    piece(staticStage, solid, steelMat, 1.2, 0.45, -2.35, 4.6, 0.9, 0.75);
    piece(staticStage, solid, neonMat, 0.92, 2.65, -3.06, 2.45, 0.78, 0.06);
    batchStaticGroup(g, staticStage, { castShadow: false, receiveShadow: true });

    this.titleSpit = donerSpitModel();
    this.titleSpit.root.position.set(2.35, 0.90, -2.35);
    this.titleSpit.root.rotation.y = -0.45;
    g.add(this.titleSpit.root);

    this.titleDust = dustParticlesModel(40);
    g.add(this.titleDust);

    this.titleTorge = chefTorgeModel();
    this.titleTorge.root.position.set(0.88, 0.0, -1.25);
    this.titleTorge.root.rotation.y = -0.22;
    g.add(this.titleTorge.root);

    this.titleAnton = lostAntonModel();
    this.titleAnton.root.position.set(0.88, 0.0, -1.25);
    this.titleAnton.root.rotation.y = -0.18;
    setIrEyeShine(this.titleAnton, 0.9);
    this.titleAnton.root.visible = false;
    g.add(this.titleAnton.root);

    this.titleTom = schnorrerTomModel();
    this.titleTom.root.position.set(0.90, 0.0, -1.22);
    this.titleTom.root.rotation.y = -0.20;
    setIrEyeShine(this.titleTom, 0.9);
    this.titleTom.root.visible = false;
    g.add(this.titleTom.root);

    this.titleDuck = filthyDuckSuitModel();
    this.titleDuck.root.position.set(0.92, 0.0, -1.28);
    this.titleDuck.root.rotation.y = -0.18;
    setIrEyeShine(this.titleDuck, 0.85);
    this.titleDuck.root.visible = false;
    g.add(this.titleDuck.root);
  }

  // ==================== 2-STATION 180° IMBISS BOOTH + UNDER-DESK ====================
  buildOffice() {
    const g = this.officeRoot;
    const floorMat = this.makeFloorMaterial();
    const wallMat = this.makeWallMaterial();
    const steelMat = this.makeSteelMaterial();
    const shutterMat = new THREE.MeshStandardMaterial({
      map: this.shutterPbr.map,
      normalMap: this.shutterPbr.normalMap,
      roughnessMap: this.shutterPbr.roughnessMap,
      roughness: 0.48,
      metalness: 0.72,
    });
    const darkMetal = endoMaterial(0x181c26);
    const copperPipe = brassMaterial(PALETTE.copper);
    const deskTopMat = new THREE.MeshStandardMaterial({ map: this.deskTex, roughness: 0.58, metalness: 0.12 });

    this.officeAmb = new THREE.AmbientLight(0x232934, 0.78);
    g.add(this.officeAmb);

    // Cold Overhead Fluorescent Booth Fixture
    this.officeBulbGroup = new THREE.Group();
    this.officeBulbGroup.position.set(0, 3.25, -0.35);
    piece(this.officeBulbGroup, solid, darkMetal, 0, -0.04, 0, 1.25, 0.08, 0.28, { shadow: false });
    this.officeBulbOrb = piece(this.officeBulbGroup, solid, emissive(0xdcebf2), 0, -0.09, 0, 1.15, 0.03, 0.16);
    this.officeLight = new THREE.PointLight(0xd6e6f0, 11.5, 10.5, 1.45);
    this.officeLight.position.set(0, -0.25, 0);
    this.officeLight.castShadow = true;
    this.officeLight.shadow.mapSize.set(512, 512);
    this.officeLight.shadow.bias = -0.002;
    this.officeLight.shadow.normalBias = 0.02;
    this.officeBulbGroup.add(this.officeLight);
    g.add(this.officeBulbGroup);

    // Back Prep Warm Hood Light
    this.prepLight = new THREE.PointLight(0xffb878, 5.2, 5.8, 1.6);
    this.prepLight.position.set(0.15, 2.45, 2.15);
    g.add(this.prepLight);

    // Emergency Red Backup Light (activates when Breaker Tripped, Low Power, or Overtime!)
    this.emergencyLight = new THREE.PointLight(0xff2238, 0, 8.5, 1.5);
    this.emergencyLight.position.set(0, 2.95, 0.4);
    g.add(this.emergencyLight);

    // Player Tactical Flashlight SpotLight (works Front Center, Doorways, AND Back Hatch!)
    this.playerFlashlight = new THREE.SpotLight(0xf0f6ff, 0, 14.5, 0.48, 0.62, 1.25);
    this.playerFlashlight.castShadow = false;
    g.add(this.playerFlashlight, this.playerFlashlight.target);

    // Anton's Sweeping Smartphone Flashlight when inspecting the floor outside your Under-Desk gap!
    this.antonSweepSpot = new THREE.SpotLight(0x7af4e8, 0, 5.5, 0.56, 0.55, 1.4);
    g.add(this.antonSweepSpot, this.antonSweepSpot.target);

    this.officeDust = dustParticlesModel(48);
    g.add(this.officeDust);

    // --- Static Batched 2-Station Booth Shell ---
    const st = new THREE.Group();
    // Main booth floor & ceiling + deep Center Kitchen Corridor (z = -3.0 .. -7.8) + Back Alley Hatch void
    piece(st, solid, floorMat, 0, -0.05, -0.1, 7.6, 0.1, 6.4);
    piece(st, solid, darkMetal, 0, 3.3, -0.1, 7.6, 0.1, 6.4);

    // FRONT NORTH WALL (split around the open doorless Center Service Pass-Through x = -1.08 .. +1.08!)
    piece(st, solid, wallMat, -2.08, 1.65, -3.08, 2.0, 3.4, 0.22);
    piece(st, solid, wallMat, 2.08, 1.65, -3.08, 2.0, 3.4, 0.22);
    piece(st, solid, wallMat, 0, 3.05, -3.08, 2.16, 0.55, 0.22);
    st.add(centerPassThroughHoodModel(steelMat));

    // Deep pitch-black Center Kitchen Corridor behind the open pass-through!
    piece(st, solid, floorMat, 0, -0.05, -5.4, 2.6, 0.1, 4.8);
    piece(st, solid, darkMetal, 0, 3.15, -5.4, 2.6, 0.1, 4.8);
    piece(st, solid, wallMat, -1.22, 1.6, -5.4, 0.2, 3.2, 4.8);
    piece(st, solid, wallMat, 1.22, 1.6, -5.4, 0.2, 3.2, 4.8);
    piece(st, solid, material(0x050608, 0.95, 0), 0, 1.6, -7.7, 2.6, 3.2, 0.2);

    // LEFT & RIGHT SIDE WALLS (Doorways at z = -0.95 + Rain Windows at z = -2.30)
    for (const side of [-1, 1]) {
      const sx = side * 3.1;
      piece(st, solid, floorMat, sx + side * 1.1, -0.05, -1.2, 2.4, 0.1, 5.2);
      piece(st, solid, wallMat, sx + side * 2.1, 1.65, -1.2, 0.2, 3.4, 5.2);
      piece(st, solid, wallMat, sx + side * 1.1, 1.65, -3.7, 2.4, 3.4, 0.2);

      // Wall segments framing doorway (z = -0.95) & window (z = -2.30)
      piece(st, solid, wallMat, sx, 1.65, 1.35, 0.22, 3.4, 3.3);
      piece(st, solid, wallMat, sx, 2.88, -0.95, 0.22, 0.9, 1.3);
      piece(st, solid, wallMat, sx, 1.65, -1.65, 0.24, 3.4, 0.22);
      piece(st, solid, wallMat, sx, 0.52, -2.32, 0.22, 1.05, 1.2);
      piece(st, solid, wallMat, sx, 2.85, -2.32, 0.22, 0.95, 1.2);
      piece(st, solid, darkMetal, sx, 1.72, -2.98, 0.26, 3.4, 0.26);

      // Steel shutter tracks
      piece(st, solid, darkMetal, sx - side * 0.06, 2.42, -0.95, 0.28, 0.14, 1.34);
      piece(st, solid, steelMat, sx - side * 0.02, 1.03, -2.32, 0.26, 0.05, 1.22);
    }

    // FRONT SECURITY COUNTER / DESK (Open Under-Desk Cavity facing +Z toward the wet doorway floor!)
    // Desk spans z = -1.62 .. -2.62, top at y = 0.88. Front steel drawer lip hangs down to y = 0.63 so crouching at y = 0.34 frames a clear floor-level gap!
    piece(st, solid, deskTopMat, 0, 0.86, -2.10, 3.08, 0.10, 1.06);
    piece(st, solid, steelMat, 0, 0.915, -2.10, 3.12, 0.02, 1.08);
    piece(st, solid, steelMat, 0, 0.74, -1.62, 2.86, 0.22, 0.06);
    piece(st, solid, darkMetal, -1.46, 0.42, -2.10, 0.12, 0.84, 0.98);
    piece(st, solid, darkMetal, 1.46, 0.42, -2.10, 0.12, 0.84, 0.98);
    piece(st, solid, darkMetal, 0, 0.42, -2.58, 2.82, 0.82, 0.06);
    // Tangled CRT power cables hanging inside top of under-desk gap for claustrophobic framing
    piece(st, round, darkMetal, -0.42, 0.50, -1.65, 0.012, 0.65, 0.012).rotation.z = 1.28;
    piece(st, round, darkMetal, 0.38, 0.51, -1.66, 0.010, 0.58, 0.010).rotation.z = -1.34;

    // Dual Telemetry CRT Monitor Housings on left of Front Counter
    piece(st, solid, darkMetal, -0.82, 1.14, -2.22, 0.58, 0.44, 0.40);
    piece(st, solid, steelMat, -0.82, 1.50, -2.24, 0.48, 0.30, 0.34);

    // SOUTH BACK WALL (z = +2.92 — Prep Counter + Utility Wall + Back Pickup Hatch!)
    // Wall split around Back Pickup Hatch opening at x = +1.95 (width 0.95, y = 1.05..2.05)
    piece(st, solid, wallMat, -0.85, 1.65, 2.92, 4.65, 3.4, 0.22);
    piece(st, solid, wallMat, 2.75, 1.65, 2.92, 0.70, 3.4, 0.22);
    piece(st, solid, wallMat, 1.95, 0.52, 2.92, 0.96, 1.05, 0.22);
    piece(st, solid, wallMat, 1.95, 2.72, 2.92, 0.96, 1.35, 0.22);
    // Dark back-alley alcove outside the Pickup Hatch
    piece(st, solid, darkMetal, 1.95, 1.55, 3.85, 1.4, 2.4, 0.15);
    piece(st, solid, floorMat, 1.95, -0.05, 3.4, 1.4, 0.1, 1.0);
    piece(st, solid, steelMat, 1.95, 1.04, 2.90, 1.02, 0.05, 0.32);

    // Stainless Midnight Prep Counter along South Wall (x = -1.05 .. +1.35, z = +2.36)
    piece(st, solid, steelMat, 0.15, 0.45, 2.38, 2.55, 0.90, 0.78);
    piece(st, solid, darkMetal, 0.15, 0.04, 2.38, 2.50, 0.08, 0.72);
    piece(st, solid, steelMat, 0.15, 2.68, 2.52, 2.60, 0.42, 0.72);
    // Copper steam conduit connecting Exhaust Valve
    piece(st, round, copperPipe, -1.36, 2.35, 2.78, 0.036, 1.85, 0.036);

    batchStaticGroup(g, st, { castShadow: true, receiveShadow: true });

    // Rain-streaked Window Glass Panes (Left, Right, and Back Pickup Hatch)
    this.leftWindowGlassMat = new THREE.MeshStandardMaterial({
      color: 0x8ab0c8,
      map: this.rainTex,
      transparent: true,
      opacity: 0.22,
      roughness: 0.16,
      metalness: 0.35,
    });
    this.rightWindowGlassMat = this.leftWindowGlassMat.clone();
    this.hatchGlassMat = this.leftWindowGlassMat.clone();
    piece(g, solid, this.leftWindowGlassMat, -3.1, 1.72, -2.32, 0.04, 1.34, 1.16, { shadow: false, receive: false });
    piece(g, solid, this.rightWindowGlassMat, 3.1, 1.72, -2.32, 0.04, 1.34, 1.16, { shadow: false, receive: false });
    const hatchGlass = piece(g, solid, this.hatchGlassMat, 1.95, 1.55, 2.90, 0.92, 0.96, 0.04, { shadow: false, receive: false });
    hatchGlass.userData.propKind = 'back_hatch';
    this.clickables.push(hatchGlass);

    // Front Wall Cosmetic Poster (Left of Center Pass-Through)
    this.officePosterMat = new THREE.MeshStandardMaterial({ map: this.posterTextures.poster_default, roughness: 0.62 });
    this.officePoster = piece(g, solid, this.officePosterMat, -1.78, 1.88, -2.95, 0.86, 1.14, 0.03, { shadow: false });
    this.officePoster.userData.propKind = 'poster';
    this.clickables.push(this.officePoster);

    // Animated Steel Roller Shutters (Left & Right)
    this.leftShutter = new THREE.Group();
    this.leftShutter.position.set(-3.04, 2.65, -0.95);
    piece(this.leftShutter, solid, shutterMat, 0, 0, 0, 0.14, 2.45, 1.24, { shadow: true });
    g.add(this.leftShutter);

    this.rightShutter = new THREE.Group();
    this.rightShutter.position.set(3.04, 2.65, -0.95);
    piece(this.rightShutter, solid, shutterMat, 0, 0, 0, 0.14, 2.45, 1.24, { shadow: true });
    g.add(this.rightShutter);

    // Clickable 3D Doorframe Switch Boxes
    this.leftSwitchBox = doorButtonBoxModel('left');
    this.leftSwitchBox.root.position.set(-2.96, 1.36, -0.18);
    g.add(this.leftSwitchBox.root);
    this.clickables.push(this.leftSwitchBox.root);

    this.rightSwitchBox = doorButtonBoxModel('right');
    this.rightSwitchBox.root.position.set(2.96, 1.36, -0.18);
    g.add(this.rightSwitchBox.root);
    this.clickables.push(this.rightSwitchBox.root);

    // Side Hallway Lights
    this.leftHallLight = new THREE.PointLight(0xcfe4f5, 0, 7.2, 1.35);
    this.leftHallLight.position.set(-3.72, 2.18, -1.72);
    g.add(this.leftHallLight);

    this.rightHallLight = new THREE.PointLight(0xcfe4f5, 0, 7.2, 1.35);
    this.rightHallLight.position.set(3.72, 2.18, -1.72);
    g.add(this.rightHallLight);

    // Live Front Desk Telemetry CRTs
    this.deskCrt1Mat = new THREE.MeshBasicMaterial({ map: this.liveDisplays.sysTexture });
    this.deskCrt1 = piece(g, solid, this.deskCrt1Mat, -0.82, 1.14, -2.01, 0.48, 0.34, 0.02);
    this.deskCrt2Mat = new THREE.MeshBasicMaterial({ map: this.liveDisplays.waveTexture });
    this.deskCrt2 = piece(g, solid, this.deskCrt2Mat, -0.82, 1.50, -2.06, 0.38, 0.22, 0.02);
    this.deskCrtGlow = new THREE.PointLight(0x48c896, 1.2, 2.2, 2.0);
    this.deskCrtGlow.position.set(-0.82, 1.25, -1.78);
    g.add(this.deskCrtGlow);

    // Front Desk Fan & Cassette Telephone
    this.deskFan = deskFanModel();
    this.deskFan.root.position.set(-0.18, 0.92, -2.08);
    g.add(this.deskFan.root);

    this.deskPhone = officePhoneModel();
    this.deskPhone.root.position.set(1.22, 0.92, -2.08);
    this.deskPhone.root.rotation.y = -0.28;
    g.add(this.deskPhone.root);

    // 5 Pure Cosmetic Desk Trophy Slots
    this.deskCosmetics = buildDeskCosmeticsGroup();
    g.add(this.deskCosmetics.root);
    this.applyCosmetics(this.cosmetics);

    // --- BACK STATION INTERACTIVE 3D PROPS (Facing North / -Z toward turned player!) ---
    this.prepDoner = donerSpitModel();
    this.prepDoner.root.position.set(-0.62, 0.90, 2.38);
    this.prepDoner.root.rotation.y = Math.PI;
    g.add(this.prepDoner.root);
    this.clickables.push(this.prepDoner.root);

    this.prepFryer = prepFryerStationModel();
    this.prepFryer.root.position.set(0.16, 0.90, 2.38);
    this.prepFryer.root.rotation.y = Math.PI;
    g.add(this.prepFryer.root);
    this.clickables.push(this.prepFryer.root);

    this.prepBagging = prepBaggingStationModel();
    this.prepBagging.root.position.set(0.92, 0.90, 2.38);
    this.prepBagging.root.rotation.y = Math.PI;
    g.add(this.prepBagging.root);
    this.clickables.push(this.prepBagging.root);

    this.breakerBox = breakerBoxModel();
    this.breakerBox.root.position.set(-2.02, 1.54, 2.78);
    this.breakerBox.root.rotation.y = Math.PI;
    g.add(this.breakerBox.root);
    this.clickables.push(this.breakerBox.root);

    this.steamValve = steamValveAssemblyModel();
    this.steamValve.root.position.set(-1.36, 1.08, 2.74);
    this.steamValve.root.rotation.y = Math.PI;
    g.add(this.steamValve.root);
    this.clickables.push(this.steamValve.root);

    // --- LIVE IN-BOOTH STALKER PUPPETS ---
    this.officeTorge = chefTorgeModel();
    setIrEyeShine(this.officeTorge, 0.95);
    this.officeTorge.root.visible = false;
    g.add(this.officeTorge.root);

    this.officeAnton = lostAntonModel();
    setIrEyeShine(this.officeAnton, 0.92);
    this.officeAnton.root.visible = false;
    g.add(this.officeAnton.root);

    this.officeTom = schnorrerTomModel();
    setIrEyeShine(this.officeTom, 0.92);
    this.officeTom.root.visible = false;
    g.add(this.officeTom.root);

    this.officeDuckSuit = filthyDuckSuitModel();
    setIrEyeShine(this.officeDuckSuit, 0.55);
    this.officeDuckSuit.root.visible = false;
    g.add(this.officeDuckSuit.root);

    this.outageEyeLight = new THREE.PointLight(0xdff6ff, 0, 2.2, 2.0);
    g.add(this.outageEyeLight);
  }

  // ==================== DENSE LIVED-IN 3 AM CCTV ROOMS (1A - 5) ====================
  buildCctvRooms() {
    const g = this.cctvRoot;
    this.cctvAmb = new THREE.AmbientLight(0x28303d, 0.96);
    g.add(this.cctvAmb);

    this.cctvSpot = new THREE.SpotLight(0xdff2fa, 34, 18, 0.88, 0.58, 1.2);
    g.add(this.cctvSpot, this.cctvSpot.target);

    this.cctvFill = new THREE.PointLight(0xc89852, 4.8, 11, 1.55);
    g.add(this.cctvFill);

    const floorMat = this.makeFloorMaterial();
    const wallMat = this.makeWallMaterial();
    const steel = this.makeSteelMaterial();
    const darkMat = material(0x141720, 0.78, 0.15);
    const curtainA = material(0x3b2436, 0.78, 0.04);
    const curtainB = material(0x9a9282, 0.78, 0.04);
    const wood = new THREE.MeshStandardMaterial({ map: this.deskTex, roughness: 0.68 });
    const menuMat = new THREE.MeshBasicMaterial({ map: this.menuBoardTex });
    const stageNeonMat = new THREE.MeshBasicMaterial({ map: this.neonStageTex });
    const hallNeonMat = new THREE.MeshBasicMaterial({ map: this.neonHallTex });

    const addCeilingDucts = (st, w, d, h) => {
      // Overhead galvanized steel HVAC duct + twin fluorescent strip
      piece(st, solid, steel, -w * 0.25, h - 0.24, 0, 0.45, 0.32, d * 0.92);
      piece(st, solid, emissive(0xd8ebf2), 0.2, h - 0.08, -0.4, 1.2, 0.04, 0.16);
    };

    const makeRoom = (w, d, buildStaticFn, h = 3.5) => {
      const r = new THREE.Group();
      const staging = new THREE.Group();
      piece(staging, solid, floorMat, 0, -0.05, 0, w, 0.1, d);
      piece(staging, solid, darkMat, 0, h, 0, w, 0.1, d);
      piece(staging, solid, wallMat, 0, h * 0.5, -d * 0.5, w, h, 0.2);
      piece(staging, solid, wallMat, -w * 0.5, h * 0.5, 0, 0.2, h, d);
      piece(staging, solid, wallMat, w * 0.5, h * 0.5, 0, 0.2, h, d);
      addCeilingDucts(staging, w, d, h);
      buildStaticFn?.(staging, r);
      batchStaticGroup(r, staging, { castShadow: false, receiveShadow: true });
      r.visible = false;
      g.add(r);
      return r;
    };

    this.rooms = {};

    // CAM 1A: Ausgabe & Spieß-Theke
    this.rooms['1A'] = makeRoom(7.4, 6.0, (st, r) => {
      piece(st, solid, steel, 0, 0.44, -1.65, 5.4, 0.88, 0.95);
      piece(st, solid, stageNeonMat, 0, 2.58, -2.86, 2.55, 0.82, 0.06);
      // Gastro GN sauce tubs along stainless counter
      for (let i = -2; i <= 2; i++) {
        piece(st, solid, darkMat, i * 0.42, 0.90, -1.45, 0.32, 0.06, 0.24);
      }
      this.stageSpit = donerSpitModel();
      this.stageSpit.root.position.set(2.15, 0.88, -1.85);
      this.stageSpit.root.rotation.y = -0.35;
      r.add(this.stageSpit.root);
    });

    // CAM 1B: Gastraum Nord (Tables, Menu Lightbox, Wet-Floor Cone, Rain Window)
    this.rooms['1B'] = makeRoom(8.2, 7.6, (st) => {
      piece(st, solid, menuMat, 0, 2.35, -3.65, 2.75, 1.25, 0.06);
      const cone = wetFloorConeModel();
      cone.position.set(0.15, 0, 0.35);
      cone.rotation.y = 0.4;
      st.add(cone);
      for (const [tx, tz] of [[-1.95, -1.3], [2.05, -1.3], [-1.95, 1.25], [2.05, 1.25]]) {
        piece(st, solid, wood, tx, 0.76, tz, 1.48, 0.08, 0.92);
        piece(st, round, steel, tx, 0.38, tz, 0.08, 0.76, 0.08);
        const can = speziModel();
        can.position.set(tx + 0.12, 0.80, tz + 0.14);
        st.add(can);
      }
    });

    // CAM 1C: Vorhang-Nische (Hauke's Alcove)
    this.rooms['1C'] = makeRoom(6.4, 5.8, (st, r) => {
      piece(st, solid, wood, 0, 0.16, -1.5, 4.3, 0.32, 2.2);
      piece(st, round, steel, 0, 3.15, -0.52, 0.04, 4.5, 0.04).rotation.z = Math.PI / 2;
      const mop = mopBucketModel();
      mop.position.set(-2.2, 0, 0.8);
      st.add(mop);

      this.coveCurtainL = new THREE.Group();
      this.coveCurtainR = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        piece(this.coveCurtainL, solid, i % 2 === 0 ? curtainA : curtainB, -1.45 + i * 0.36, 1.72, -0.52, 0.35, 2.95, 0.12);
        piece(this.coveCurtainR, solid, i % 2 === 0 ? curtainB : curtainA, 0.37 + i * 0.36, 1.72, -0.52, 0.35, 2.95, 0.12);
      }
      r.add(this.coveCurtainL, this.coveCurtainR);

      this.coveSignMat = new THREE.MeshStandardMaterial({ map: this.signNormalTex, roughness: 0.62 });
      piece(r, solid, this.coveSignMat, 1.68, 1.12, 0.45, 1.24, 0.64, 0.06).rotation.y = -0.35;
    });

    // CAM 2A: West-Flur (Wet Floor Cone, Mop Bucket, Convex Security Mirror)
    this.rooms['2A'] = makeRoom(3.8, 9.6, (st) => {
      const cone = wetFloorConeModel();
      cone.position.set(-1.05, 0, 0.55);
      st.add(cone);
      const mop = mopBucketModel();
      mop.position.set(1.22, 0, -1.8);
      st.add(mop);
      // Convex corner mirror
      piece(st, orb, steel, 1.55, 2.95, -3.9, 0.32, 0.32, 0.12);
    });

    // CAM 2B: West-Ecke (Stacked Pfand Crates + Steam Nozzle + Anomaly Poster)
    this.rooms['2B'] = makeRoom(4.0, 5.4, (st, r) => {
      for (const [cx, cy, cz, hex] of [[1.25, 0, -1.8, 0x26486e], [1.25, 0.36, -1.8, 0x782828], [0.72, 0, -1.9, 0x245838]]) {
        const cr = crateMesh(hex);
        cr.position.set(cx, cy, cz);
        st.add(cr);
      }
      piece(st, round, brassMaterial(PALETTE.copper), 1.72, 2.65, -0.6, 0.06, 3.4, 0.06).rotation.x = Math.PI / 2;

      this.cam2bPosterMat = new THREE.MeshStandardMaterial({ map: this.posterTextures.poster_default, roughness: 0.58 });
      piece(r, solid, this.cam2bPosterMat, -1.86, 1.72, -0.8, 0.04, 1.32, 0.98);
      this.cam2bSteam = hallSteamCloudModel();
      r.add(this.cam2bSteam.group);
    });

    // CAM 3: Pfand- & Putzkammer
    this.rooms['3'] = makeRoom(3.8, 4.4, (st) => {
      for (const [cx, cy, cz, hex] of [[-1.1, 0, -1.3, 0x26486e], [-1.1, 0.36, -1.3, 0x26486e], [1.05, 0, -1.4, 0x782828], [0.2, 0, -1.6, 0x245838]]) {
        const cr = crateMesh(hex);
        cr.position.set(cx, cy, cz);
        st.add(cr);
      }
      const mop = mopBucketModel();
      mop.position.set(-1.1, 0, 0.3);
      st.add(mop);
    });

    // CAM 4A: Ost-Flur
    this.rooms['4A'] = makeRoom(3.8, 9.4, (st) => {
      piece(st, solid, hallNeonMat, 1.82, 2.15, -1.8, 0.05, 0.78, 2.0);
      const cr = crateMesh(0x782828);
      cr.position.set(-1.25, 0, -2.4);
      st.add(cr);
    });

    // CAM 4B: Ost-Ecke (Commercial Stainless Reach-In Freezer + Steam Cloud)
    this.rooms['4B'] = makeRoom(3.8, 5.2, (st, r) => {
      piece(st, solid, steel, -1.32, 0.95, -1.55, 0.82, 1.90, 0.78);
      piece(st, solid, emissive(0x38d698), -0.90, 1.65, -1.45, 0.03, 0.06, 0.14);
      this.cam4bSteam = hallSteamCloudModel();
      r.add(this.cam4bSteam.group);
    });

    // CAM 5: Hinterzimmer / Spinde (Employee Lockers + Spare Heads)
    this.cam5Heads = [];
    this.rooms['5'] = makeRoom(5.8, 5.6, (st, r) => {
      // Steel employee lockers
      for (let i = 0; i < 3; i++) {
        piece(st, solid, steel, 1.45 + i * 0.52, 0.95, -2.15, 0.48, 1.90, 0.55);
      }
      piece(st, solid, wood, -1.65, 1.42, -2.20, 1.55, 0.06, 0.55);
      piece(st, solid, wood, -1.65, 2.02, -2.20, 1.55, 0.06, 0.55);
      const spare = crownMesh(0.75);
      spare.position.set(-2.05, 2.08, -2.18);
      st.add(spare);
      for (let i = 0; i < 3; i++) {
        const sh = spareMascotHeadMesh(i);
        sh.root.position.set(-2.12 + i * 0.48, 1.45, -2.16);
        r.add(sh.root);
        this.cam5Heads.push(sh);
      }
    });

    this.cctvTorge = chefTorgeModel();
    this.cctvAnton = lostAntonModel();
    this.cctvTom = schnorrerTomModel();
    this.cctvHauke = bossHaukeModel();
    for (const m of [this.cctvTorge, this.cctvAnton, this.cctvTom, this.cctvHauke]) {
      setIrEyeShine(m, 0.92);
      m.root.visible = false;
      g.add(m.root);
    }
  }

  // ==================== 3 PLAYABLE 3D VHS MINIGAME DIORAMAS ====================
  buildVhsMinigameScenes() {
    const g = this.vhsRoot;
    this.vhsAmb = new THREE.AmbientLight(0x181c24, 0.25);
    g.add(this.vhsAmb);

    const floorMat = this.makeFloorMaterial();
    const wallMat = this.makeWallMaterial();
    const steelMat = this.makeSteelMaterial();
    const darkMat = material(0x0c0e14, 0.9, 0.1);

    // --- TAPE 01: 12-Meter Dark Corridor + Taped White X at z = -2.5 ---
    this.vhsTape1Group = new THREE.Group();
    const st1 = new THREE.Group();
    piece(st1, solid, floorMat, 0, -0.05, -6.2, 3.2, 0.1, 13.6);
    piece(st1, solid, darkMat, 0, 3.2, -6.2, 3.2, 0.1, 13.6);
    piece(st1, solid, wallMat, -1.6, 1.6, -6.2, 0.2, 3.3, 13.6);
    piece(st1, solid, wallMat, 1.6, 1.6, -6.2, 0.2, 3.3, 13.6);
    piece(st1, solid, darkMat, 0, 1.6, -12.9, 3.2, 3.3, 0.2);
    // Taped White 'X' on floor 2.5m ahead!
    const tapeMat = material(0xe8e4d8, 0.65, 0.02);
    piece(st1, solid, tapeMat, 0, 0.008, -2.5, 0.72, 0.01, 0.09).rotation.y = Math.PI * 0.25;
    piece(st1, solid, tapeMat, 0, 0.008, -2.5, 0.72, 0.01, 0.09).rotation.y = -Math.PI * 0.25;
    batchStaticGroup(this.vhsTape1Group, st1, { castShadow: false, receiveShadow: true });

    this.vhsTape1Light = new THREE.SpotLight(0xf0f7ff, 0, 15.5, 0.44, 0.55, 1.2);
    this.vhsTape1Light.position.set(0, 1.56, 0.2);
    this.vhsTape1Light.target.position.set(0, 1.15, -6.0);
    this.vhsTape1Group.add(this.vhsTape1Light, this.vhsTape1Light.target);

    this.vhsTape1Tom = schnorrerTomModel();
    this.vhsTape1Duck = filthyDuckSuitModel();
    setIrEyeShine(this.vhsTape1Tom, 1.0);
    setIrEyeShine(this.vhsTape1Duck, 0.9);
    this.vhsTape1Group.add(this.vhsTape1Tom.root, this.vhsTape1Duck.root);
    g.add(this.vhsTape1Group);

    // --- TAPE 02: Hinterzimmer-Inventur (Table Inspection + Clipboard + Duck Suit) ---
    this.vhsTape2Group = new THREE.Group();
    const st2 = new THREE.Group();
    piece(st2, solid, floorMat, 0, -0.05, -1.2, 4.6, 0.1, 4.6);
    piece(st2, solid, wallMat, 0, 1.65, -2.8, 4.6, 3.4, 0.2);
    piece(st2, solid, steelMat, 0, 0.76, -0.92, 1.35, 0.06, 0.86);
    piece(st2, solid, darkMat, -0.58, 0.38, -0.92, 0.06, 0.76, 0.76);
    piece(st2, solid, darkMat, 0.58, 0.38, -0.92, 0.06, 0.76, 0.76);
    // Cassette deck & Strobe Taser unit on table
    piece(st2, solid, darkMat, -0.34, 0.83, -0.76, 0.24, 0.08, 0.16);
    piece(st2, solid, brassMaterial(0xb88c38), 0.36, 0.83, -0.74, 0.18, 0.09, 0.15);
    batchStaticGroup(this.vhsTape2Group, st2, { castShadow: true, receiveShadow: true });

    this.vhsTape2Bulb = new THREE.PointLight(0xffdca8, 8.5, 6.2, 1.5);
    this.vhsTape2Bulb.position.set(0, 2.25, -0.95);
    this.vhsTape2Group.add(this.vhsTape2Bulb);

    this.vhsTape2Clipboard = new THREE.Group();
    this.vhsTape2Clipboard.position.set(0, 1.12, -0.38);
    piece(this.vhsTape2Clipboard, solid, material(0x5c3c22, 0.8), 0, 0, 0, 0.28, 0.36, 0.014);
    piece(this.vhsTape2Clipboard, solid, material(0xece4d2, 0.75), 0, -0.01, 0.01, 0.24, 0.31, 0.004);
    this.vhsTape2Group.add(this.vhsTape2Clipboard);

    this.vhsTape2Duck = filthyDuckSuitModel();
    setIrEyeShine(this.vhsTape2Duck, 0.75);
    this.vhsTape2Duck.root.position.set(0, -0.28, -1.45);
    this.vhsTape2Group.add(this.vhsTape2Duck.root);
    g.add(this.vhsTape2Group);

    // --- TAPE 03: Kühlhaus-Schlussrunde (-18°C Walk-In Freezer + PVC Strip Curtains) ---
    this.vhsTape3Group = new THREE.Group();
    const st3 = new THREE.Group();
    piece(st3, solid, steelMat, 0, -0.05, -1.6, 5.2, 0.1, 5.4);
    piece(st3, solid, steelMat, -2.4, 1.6, -1.6, 0.2, 3.3, 5.4);
    piece(st3, solid, steelMat, 2.4, 1.6, -1.6, 0.2, 3.3, 5.4);
    piece(st3, solid, steelMat, 0, 3.2, -1.6, 5.2, 0.1, 5.4);
    // Translucent frosted PVC strip curtains straight ahead at z = -2.25!
    const pvcMat = new THREE.MeshStandardMaterial({
      color: 0xb8dce8,
      transparent: true,
      opacity: 0.42,
      roughness: 0.38,
      metalness: 0.1,
    });
    for (let i = -4; i <= 4; i++) {
      piece(st3, solid, pvcMat, i * 0.22, 1.45, -2.25, 0.20, 2.85, 0.025);
    }
    // 3 Frosted Relay Boxes (Left, Center-Left, Right)
    for (const rx of [-1.65, -0.85, 1.65]) {
      piece(st3, solid, darkMat, rx, 1.42, -1.55, 0.36, 0.48, 0.18);
    }
    batchStaticGroup(this.vhsTape3Group, st3, { castShadow: false, receiveShadow: true });

    this.vhsTape3Leds = [-1.65, -0.85, 1.65].map((rx) => {
      const m = emissive(0xc83242);
      const led = piece(this.vhsTape3Group, orb, m, rx, 1.72, -1.48, 0.03, 0.03, 0.03);
      return { led, mat: m };
    });

    this.vhsTape3Light = new THREE.SpotLight(0xd8f2ff, 16, 8.5, 0.65, 0.55, 1.3);
    this.vhsTape3Light.position.set(0, 1.62, 0.35);
    this.vhsTape3Light.target.position.set(0, 1.4, -2.2);
    this.vhsTape3Group.add(this.vhsTape3Light, this.vhsTape3Light.target);

    this.vhsTape3Torge = chefTorgeModel();
    setIrEyeShine(this.vhsTape3Torge, 0.95);
    this.vhsTape3Group.add(this.vhsTape3Torge.root);
    g.add(this.vhsTape3Group);
  }

  // ==================== INTERACTIVE 3D ARCHIVE TURNTABLE STAGE ====================
  buildArchiveViewerStage() {
    const g = this.archiveRoot;
    g.add(new THREE.AmbientLight(0x222834, 0.85));

    this.archiveKeyLight = new THREE.SpotLight(0xedf5ff, 22, 12, 0.62, 0.55, 1.2);
    this.archiveKeyLight.position.set(1.2, 2.9, 2.6);
    this.archiveKeyLight.target.position.set(0.55, 1.15, -0.8);
    g.add(this.archiveKeyLight, this.archiveKeyLight.target);

    this.archiveRimLight = new THREE.PointLight(0xd84838, 8, 6, 1.6);
    this.archiveRimLight.position.set(1.8, 1.9, -1.9);
    g.add(this.archiveRimLight);

    const pedMat = this.makeSteelMaterial();
    this.archivePedestal = piece(g, round, pedMat, 0.55, 0.06, -0.85, 0.72, 0.12, 0.72, { shadow: true });

    this.archiveTurntable = new THREE.Group();
    this.archiveTurntable.position.set(0.55, 0.12, -0.85);
    g.add(this.archiveTurntable);

    this.archiveModels = {
      torge: chefTorgeModel(),
      anton: lostAntonModel(),
      tom: schnorrerTomModel(),
      hauke: bossHaukeModel(),
      duck: filthyDuckSuitModel(),
    };
    for (const m of Object.values(this.archiveModels)) {
      m.root.visible = false;
      this.archiveTurntable.add(m.root);
    }
  }

  buildJumpscareStage() {
    const g = this.jumpscareRoot;
    this.jsStrobe = new THREE.PointLight(0xeef6ff, 20, 9, 1.2);
    this.jsStrobe.position.set(0, 1.68, 0.95);
    g.add(this.jsStrobe);
    this.jsRed = new THREE.PointLight(0xd82038, 18, 9, 1.2);
    this.jsRed.position.set(0.55, 1.45, 0.55);
    g.add(this.jsRed);

    this.jsModels = {
      torge: chefTorgeModel(),
      anton: lostAntonModel(),
      tom: schnorrerTomModel(),
      hauke: bossHaukeModel(),
      duck: filthyDuckSuitModel(),
    };
    for (const m of Object.values(this.jsModels)) {
      setIrEyeShine(m, 1.0);
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
    flashlight = 0,
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
    u.uFlashlight.value = flashlight;

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
    const sway = reduced ? 0 : Math.sin(time * 0.42) * 0.035;
    this.camera.position.set(sway, 1.54, 1.92);
    this.camera.rotation.set(-0.02, sway * -0.14, 0);

    this.titleSpit.spit.rotation.y = time * 0.85;
    this.titleDust.rotation.y = time * 0.03;

    const cycle = time % 8.4;
    const glitch = !reduced && (cycle > 8.1 || (cycle > 2.9 && cycle < 3.04) || (cycle > 5.6 && cycle < 5.72));
    const showAnton = !reduced && cycle > 8.14 && cycle < 8.28;
    const showTom = !reduced && cycle > 2.92 && cycle < 3.02;
    const showDuck = !reduced && cycle > 5.62 && cycle < 5.71;

    this.titleTorge.root.visible = !showAnton && !showTom && !showDuck;
    this.titleAnton.root.visible = showAnton;
    this.titleTom.root.visible = showTom;
    this.titleDuck.root.visible = showDuck;

    if (this.titleTorge.root.visible) {
      setIrEyeShine(this.titleTorge, glitch ? 0.95 : 0.22);
      this.titleTorge.head.rotation.z = glitch ? (Math.sin(time * 88) * 0.22) : Math.sin(time * 0.7) * 0.03;
      this.titleTorge.head.rotation.y = -0.16 + (glitch ? Math.cos(time * 68) * 0.18 : Math.sin(time * 0.45) * 0.04);
      this.titleTorge.jaw.rotation.x = glitch ? 0.28 : 0.04;
    }
    this.titleSpot.intensity = glitch ? 12 + Math.random() * 14 : 21 + Math.sin(time * 2.8) * 1.6;

    this.renderPass(time, {
      cctv: 0,
      staticAmt: glitch ? 0.38 : 0.03,
      blackout: 0,
      shock: glitch ? 0.24 : 0,
      quake: 0,
      flicker: glitch ? 0.65 : 1,
    });
  }

  drawArchiveViewer(viewer, time) {
    this.setMode('archive');
    const charId = viewer?.charId || 'torge';
    const pose = viewer?.pose || 'neutral';
    const flashOn = Boolean(viewer?.flashlight);
    const rotY = viewer?.yaw ?? (time * 0.45);
    const scareTimer = viewer?.scareTimer ?? 0;

    for (const [id, m] of Object.entries(this.archiveModels)) {
      m.root.visible = id === charId;
    }
    const active = this.archiveModels[charId] ?? this.archiveModels.torge;
    applyStalkerPose(active, scareTimer > 0 ? 'jumpscare_lunge' : pose, time);
    setIrEyeShine(active, flashOn || scareTimer > 0 ? 0.98 : 0.12);

    this.archiveKeyLight.intensity = flashOn ? 38 : 16;
    this.archiveTurntable.rotation.y = scareTimer > 0 ? 0 : rotY;

    if (scareTimer > 0) {
      const lunge = 1 - Math.min(1, scareTimer / 0.9);
      this.camera.position.set(0.55 + Math.sin(time * 42) * 0.05, 1.56, 0.55 - lunge * 0.68);
      this.camera.lookAt(0.55, 1.52, -0.85);
    } else {
      this.camera.position.set(0.05, 1.32, 1.85);
      this.camera.lookAt(0.28, 1.08, -0.85);
    }

    this.renderPass(time, {
      cctv: 0,
      staticAmt: scareTimer > 0 ? 0.22 : 0.025,
      shock: scareTimer > 0 ? 0.36 : 0,
      flashlight: flashOn ? 0.95 : 0,
    });
  }

  drawMinigame(mg, time) {
    if (!mg) return;
    this.setMode('vhs');
    this.vhsTape1Group.visible = mg.tapeId === 'tape1';
    this.vhsTape2Group.visible = mg.tapeId === 'tape2';
    this.vhsTape3Group.visible = mg.tapeId === 'tape3';

    const inScare = mg.state === 'jumpscare';
    let flashAmt = 0;

    if (mg.tapeId === 'tape1') {
      const lit = mg.flashTimer > 0 || inScare;
      flashAmt = lit ? 1.0 : 0.0;
      this.vhsTape1Light.intensity = lit ? 44 : 0;
      this.vhsAmb.intensity = lit ? 0.22 : 0.015;

      this.camera.position.set(
        inScare ? Math.sin(time * 40) * 0.06 : Math.sin(time * 0.9) * 0.015,
        1.56,
        0.35,
      );
      this.camera.rotation.set(-0.05, 0, inScare ? Math.sin(time * 32) * 0.08 : 0);

      const useDuck = mg.stalker === 'duck';
      this.vhsTape1Tom.root.visible = !useDuck && lit;
      this.vhsTape1Duck.root.visible = useDuck && lit;
      const puppet = useDuck ? this.vhsTape1Duck : this.vhsTape1Tom;
      const zPos = inScare ? -0.45 : -mg.distance;
      puppet.root.position.set(inScare ? 0 : mg.lane * 0.45, 0, zPos);
      puppet.root.rotation.y = 0;
      const poses = ['neutral', 'doorway_peek', 'crate_crouch', 'corner_stare'];
      applyStalkerPose(puppet, inScare ? 'jumpscare_lunge' : (useDuck ? 'slumped_suit' : poses[mg.poseSeed % 4]), time);
    } else if (mg.tapeId === 'tape2') {
      const strobe = mg.taserFlash || 0;
      this.vhsAmb.intensity = 0.24;
      this.vhsTape2Bulb.intensity = (7.8 + Math.sin(time * 3.4) * 0.8) + strobe * 32;
      this.vhsTape2Bulb.position.x = Math.sin(time * 1.4) * 0.14;

      const downAmt = mg.clipboardDown ? 1 : 0;
      this.camera.position.set(
        inScare ? Math.sin(time * 42) * 0.06 : 0,
        1.38,
        0.12,
      );
      this.camera.rotation.set(inScare ? 0 : (-0.06 - downAmt * 0.58), 0, 0);

      this.vhsTape2Clipboard.visible = mg.clipboardDown && !inScare;
      this.vhsTape2Clipboard.position.set(0, 1.06, -0.34);
      this.vhsTape2Clipboard.rotation.x = -0.68;

      const duck = this.vhsTape2Duck;
      duck.root.visible = true;
      applyStalkerPose(duck, inScare ? 'jumpscare_lunge' : 'slumped_suit', time);
      if (inScare) {
        duck.root.position.set(0, -0.18, -0.42);
      } else {
        duck.root.position.set(0, -0.28, -1.42 + mg.postureStage * 0.14);
        if (mg.postureStage === 1) {
          duck.head.rotation.z = 0.18;
          duck.head.rotation.x = 0.02;
        } else if (mg.postureStage >= 2) {
          duck.torso.rotation.x = 0.34;
          duck.head.rotation.z = 0.04;
          duck.head.rotation.x = -0.08;
          setIrEyeShine(duck, 0.98);
        } else {
          setIrEyeShine(duck, 0.25);
        }
      }
    } else {
      // TAPE 03: Kühlhaus-Schlussrunde
      const lit = Boolean(mg.workLightOn || inScare);
      flashAmt = lit ? 0.85 : 0;
      this.vhsAmb.intensity = 0.18;
      this.vhsTape3Light.intensity = lit ? (18 + (mg.sparkFlash || 0) * 14) : 0.4;

      const targetX = [-0.45, -0.15, 0.45][mg.selectedRelay] ?? 0;
      this.camera.position.set(inScare ? Math.sin(time * 44) * 0.06 : 0, 1.54, 0.38);
      this.camera.lookAt(inScare ? 0 : targetX, 1.42, -2.0);
      this.vhsTape3Light.target.position.set(targetX * 1.4, 1.4, -2.1);

      this.vhsTape3Leds.forEach((entry, idx) => {
        const done = mg.relays[idx] >= 100;
        entry.mat.color.setHex(done ? 0x38d698 : idx === mg.selectedRelay ? 0xffb842 : 0xc83242);
      });

      const torge = this.vhsTape3Torge;
      torge.root.visible = mg.stalkerPhase !== 'patrol' || inScare;
      if (inScare) {
        torge.root.position.set(0, 0, -0.42);
        applyStalkerPose(torge, 'jumpscare_lunge', time);
      } else if (mg.stalkerPhase === 'at_curtain') {
        torge.root.position.set(0.08, 0, -2.42);
        torge.root.rotation.y = 0;
        applyStalkerPose(torge, 'window_press', time);
      } else {
        torge.root.position.set(Math.sin(mg.curtainAngle) * 1.35, 0, -3.15);
        torge.root.rotation.y = Math.cos(mg.curtainAngle) * 0.6;
        applyStalkerPose(torge, 'neutral', time);
      }
    }

    // Rain/condensation UV drift
    this.rainTex.offset.y = -(time * 0.08) % 1;

    this.renderPass(time, {
      cctv: 0.35,
      staticAmt: inScare ? 0.34 : 0.055,
      shock: inScare ? 0.45 : (mg.taserFlash || 0) * 0.25,
      steam: mg.tapeId === 'tape3' ? 0.45 : 0.08,
      irFlash: mg.taserFlash || 0,
      flashlight: flashAmt,
    });
  }

  syncOfficeEnvironment(run) {
    const t = run.time;
    const out = run.powerOutage;
    const reduced = this.isReducedMotion();
    const q = (run.quake || 0) * (reduced ? 0.2 : 1);

    // Rain streaks drifting down office & hatch glass
    this.rainTex.offset.y = -(t * 0.11) % 1;

    const leftBounce = Math.sin(run.leftDoorBounce * Math.PI * 2.5) * 0.05 * run.leftDoorBounce;
    const rightBounce = Math.sin(run.rightDoorBounce * Math.PI * 2.5) * 0.05 * run.rightDoorBounce;
    this.leftShutter.position.y = 3.55 - run.leftDoorAnim * 2.38 + leftBounce;
    this.rightShutter.position.y = 3.55 - run.rightDoorAnim * 2.38 + rightBounce;

    // 3D Doorframe Switch LEDs
    this.leftSwitchBox.doorMat.color.setHex(run.leftJammed ? 0x222630 : run.leftDoor ? 0x38d698 : 0xc83242);
    this.leftSwitchBox.lightMat.color.setHex(run.leftJammed || run.breakerTripped ? 0x222630 : run.leftLight ? 0xffe082 : 0x466885);
    this.rightSwitchBox.doorMat.color.setHex(run.rightJammed ? 0x222630 : run.rightDoor ? 0x38d698 : 0xc83242);
    this.rightSwitchBox.lightMat.color.setHex(run.rightJammed || run.breakerTripped ? 0x222630 : run.rightLight ? 0xffe082 : 0x466885);

    if (!out) {
      this.deskFan.blades.rotation.z = run.breakerTripped ? 0 : t * 18;
      this.officeDust.rotation.y = t * 0.03;
      this.liveDisplays.update(run);

      // Animate cosmetic trophies on desk
      if (this.deskCosmetics.items.gold_spit.visible) {
        this.deskCosmetics.miniSpitCone.rotation.y = t * 1.4;
      }
      if (this.deskCosmetics.items.bobble_crown.visible) {
        this.deskCosmetics.crownTop.rotation.z = Math.sin(t * 9) * (0.04 + q * 0.28);
      }
      if (this.deskCosmetics.items.vhs_camcorder.visible) {
        this.deskCosmetics.camLed.visible = Math.sin(t * 4) > -0.2;
      }
    }

    // Window steam condensation
    const heat = run.thermal?.heat ?? 16;
    const glassFog = out ? 0.18 : 0.20 + Math.max(0, (heat - 58) / 42) * 0.34;
    this.leftWindowGlassMat.opacity = glassFog;
    this.rightWindowGlassMat.opacity = glassFog;

    // Back Wall Physical Main Breaker Lever & LED
    const brkAnim = run.breakerAnim ?? (run.breakerTripped ? 0 : 1);
    this.breakerBox.leverPivot.rotation.x = (1 - brkAnim) * 1.35; // snaps DOWN when tripped!
    this.breakerBox.ledMat.color.setHex(out ? 0x101218 : run.breakerTripped ? (Math.sin(t * 14) > 0 ? 0xff2438 : 0x3a0810) : 0x38d698);

    // Back Wall Exhaust Valve & Steam Puffs
    const venting = (run.thermal?.ventingUntil ?? 0) > t;
    this.steamValve.needlePivot.rotation.z = (0.5 - heat / 100) * 2.55;
    this.steamValve.wheel.rotation.z = -(run.thermal?.valveSpin ?? 0);
    this.steamValve.ledMat.color.setHex(out ? 0x101218 : heat >= 72 ? 0xff2838 : heat >= 45 ? 0x38d698 : 0x204438);
    const showValveSteam = !out && (venting || heat >= 74);
    for (let i = 0; i < this.steamValve.puffs.length; i++) {
      const puff = this.steamValve.puffs[i];
      puff.visible = showValveSteam;
      if (showValveSteam) {
        const cycle = (t * (venting ? 2.6 : 1.1) + i * 0.2) % 1;
        puff.position.y = 0.42 + cycle * 0.55;
        const sc = 0.045 + cycle * (venting ? 0.11 : 0.065);
        puff.scale.set(sc, sc * 0.85, sc);
        puff.material.opacity = (1 - cycle) * (venting ? 0.48 : 0.22);
      }
    }

    // Back Prep Counter Visual Telemetry (Döner Spit, Fryer Basket, Bagging Tray & Ticket)
    const ticket = run.orders?.active;
    this.prepDoner.spit.rotation.y = out ? 0 : t * (ticket?.step === 'doner' ? 3.2 : 0.75);
    this.prepDoner.statusLedMat.color.setHex(
      !out && ticket?.step === 'doner' ? (Math.sin(t * 12) > 0 ? 0xffb842 : 0x5c3c10) : 0x22302c,
    );

    if (!out && ticket?.step === 'fryer') {
      if (ticket.fryerState === 'frying') {
        this.prepFryer.basketGroup.position.y = 0.34;
        this.prepFryer.fries.visible = true;
        this.prepFryer.ledMat.color.setHex(0xff8c24);
      } else if (ticket.fryerState === 'ready') {
        this.prepFryer.basketGroup.position.y = 0.36;
        this.prepFryer.fries.visible = true;
        this.prepFryer.ledMat.color.setHex(Math.sin(t * 16) > 0 ? 0x38d698 : 0x144834);
      } else {
        this.prepFryer.basketGroup.position.y = 0.46;
        this.prepFryer.fries.visible = false;
        this.prepFryer.ledMat.color.setHex(0xffb842);
      }
    } else {
      this.prepFryer.basketGroup.position.y = 0.46;
      this.prepFryer.fries.visible = Boolean(ticket && ticket.step === 'bag');
      this.prepFryer.ledMat.color.setHex(0x22302c);
    }

    this.prepBagging.ticketGroup.visible = Boolean(!out && ticket);
    this.prepBagging.bagMesh.visible = Boolean(!out && ticket && ticket.step === 'bag');
    this.prepBagging.ledMat.color.setHex(
      !out && ticket?.step === 'bag' ? (Math.sin(t * 14) > 0 ? 0x38d698 : 0x144834) : 0x22302c,
    );

    // Cassette telephone reels spin during active call
    const callRunning = !out && run.callActive && !run.callMuted;
    this.deskPhone.ledMat.color.setHex(callRunning && Math.sin(t * 9) > 0 ? 0xd83242 : 0x2a1016);
    if (callRunning) {
      this.deskPhone.reelL.rotation.y = t * 4;
      this.deskPhone.reelR.rotation.y = t * 4;
    }

    const lowPowerAmt = !out && (run.power <= 20 || run.breakerTripped || run.overtime)
      ? Math.max(run.breakerTripped || run.overtime ? 0.65 : 0, Math.min(1, (20 - run.power) / 18 + 0.2))
      : 0;

    if (out) {
      this.officeAmb.intensity = 0.025;
      this.officeLight.intensity = 0;
      this.prepLight.intensity = 0;
      this.emergencyLight.intensity = 0;
      this.officeDust.visible = false;
      this.officeBulbOrb.material.color.setHex(0x0a0c10);
      this.deskCrt1.visible = false;
      this.deskCrt2.visible = false;
      this.deskCrtGlow.intensity = 0;
      this.leftHallLight.intensity = 0;
      this.rightHallLight.intensity = 0;
    } else if (run.breakerTripped) {
      // Physical Main Breaker Tripped -> overhead light cuts out, eerie emergency red backup light!
      this.officeAmb.intensity = 0.18;
      this.officeLight.intensity = 0;
      this.prepLight.intensity = 1.4;
      this.emergencyLight.intensity = 4.5 + Math.sin(t * 6.5) * 1.8;
      this.officeBulbOrb.material.color.setHex(0x140a0c);
      this.deskCrt1.visible = true;
      this.deskCrt2.visible = false;
      this.deskCrtGlow.color.setHex(0xff2838);
      this.deskCrtGlow.intensity = 1.6;
      this.leftHallLight.intensity = 0;
      this.rightHallLight.intensity = 0;
    } else {
      this.officeAmb.intensity = 0.78;
      this.officeLight.intensity = (11.5 - q * 3.5) * run.lightFlicker;
      this.prepLight.intensity = 5.2;
      this.emergencyLight.intensity = run.overtime
        ? (3.8 + Math.sin(t * 7.5) * 2.0)
        : (lowPowerAmt > 0 ? (2.2 + Math.sin(t * 5.2) * 1.4) * lowPowerAmt : 0);
      this.officeDust.visible = true;
      this.officeBulbOrb.material.color.setHex(0xdcebf2);
      this.deskCrt1.visible = true;
      this.deskCrt2.visible = true;
      this.deskCrtGlow.color.setHex(run.overtime ? 0xff2838 : ticket ? 0xd8a842 : 0x48c896);
      this.deskCrtGlow.intensity = 1.25;
      this.leftHallLight.intensity = run.leftLight ? (20 * run.lightFlicker) : 0;
      this.rightHallLight.intensity = run.rightLight ? (20 * run.lightFlicker) : 0;
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

    // --- 2-STATION BOOTH & UNDER-DESK CAMERA ---
    this.setMode('office');
    const { out, q, heat, lowPowerAmt, reduced } = this.syncOfficeEnvironment(run);

    const shakeX = q > 0.01 ? (Math.sin(run.quakeTime * 54) * 0.08 * q) : 0;
    const shakeY = q > 0.01 ? (Math.cos(run.quakeTime * 68) * 0.06 * q) : 0;
    const shakeRoll = q > 0.01 ? (Math.sin(run.quakeTime * 46) * 0.045 * q) : 0;

    const look = Number.isFinite(run.lookSmooth) ? run.lookSmooth : run.lookX;
    const turn = run.turnAnim ?? 0;
    const duck = run.duckAnim ?? 0;
    const breathY = reduced ? 0 : Math.sin(t * 1.5) * (run.holdingBreath ? 0.002 : 0.010);

    // Stand camera interpolates Front (z=+0.38, yaw=0) <-> Back 180° (z=-0.12, yaw=PI)
    const standX = look * 0.34 * (1 - turn * 2);
    const standY = 1.56 + breathY;
    const standZ = THREE.MathUtils.lerp(0.38, -0.12, turn);
    const standYaw = turn * Math.PI - look * 0.62;
    const whipRoll = reduced ? 0 : Math.sin(turn * Math.PI) * 0.065;

    // Under-Desk camera crouches at (y=0.34, z=-2.18), facing OUT (+Z, yaw=PI) toward the wet doorway floor!
    const hideX = -look * 0.24;
    const hideY = 0.34 + breathY * 0.5;
    const hideZ = -2.18;
    const hideYaw = Math.PI - look * 0.42;

    this.camera.position.set(
      THREE.MathUtils.lerp(standX, hideX, duck) + shakeX,
      THREE.MathUtils.lerp(standY, hideY, duck) + shakeY,
      THREE.MathUtils.lerp(standZ, hideZ, duck),
    );
    this.camera.rotation.set(
      THREE.MathUtils.lerp(-0.03, -0.04, duck),
      THREE.MathUtils.lerp(standYaw, hideYaw, duck),
      shakeRoll + whipRoll,
    );

    // Sync Tactical Flashlight SpotLight along camera look vector
    const flashActive = Boolean(!out && run.flashlightOn && duck < 0.4);
    const capScale = Math.max(0.25, (run.flashlightBattery ?? 100) / 100);
    this.playerFlashlight.intensity = flashActive ? (34 * capScale * run.lightFlicker) : 0;
    if (flashActive) {
      this.playerFlashlight.position.copy(this.camera.position);
      this.camera.getWorldDirection(this._camDir);
      this.playerFlashlight.target.position.copy(this.camera.position).addScaledVector(this._camDir, 8.0);
    }

    // --- 1. CHEF TORGE: Center Service Pass-Through (3 Depth Stages) OR Power Outage Left Door ---
    const torgeRoom = run.animatronics.torge.room;
    const showOutageTorge = Boolean(out && out.phase === 'jingle' && out.eyesOn);
    const inCenterCorridor = !out && (torgeRoom === 'center_far' || torgeRoom === 'center_mid' || torgeRoom === 'center_near');
    this.officeTorge.root.visible = showOutageTorge || inCenterCorridor;
    if (showOutageTorge) {
      applyStalkerPose(this.officeTorge, 'neutral', t);
      this.officeTorge.root.position.set(-3.62, 0, -0.98);
      this.officeTorge.root.rotation.y = Math.PI / 2 - 0.1;
      setIrEyeShine(this.officeTorge, 1.0);
      this.outageEyeLight.position.set(-3.25, 1.72, -0.95);
      this.outageEyeLight.intensity = 2.8;
    } else if (inCenterCorridor) {
      const zDepth = torgeRoom === 'center_near' ? -3.38 : torgeRoom === 'center_mid' ? -4.75 : -6.25;
      this.officeTorge.root.position.set(torgeRoom === 'center_mid' ? -0.32 : 0.05, 0, zDepth);
      this.officeTorge.root.rotation.y = 0;
      applyStalkerPose(this.officeTorge, torgeRoom === 'center_mid' ? 'doorway_peek' : 'neutral', t);
      const centerLit = flashActive && turn < 0.3 && Math.abs(look) < 0.62;
      setIrEyeShine(this.officeTorge, centerLit ? 1.0 : 0.28);
      this.outageEyeLight.intensity = 0;
    } else {
      this.outageEyeLight.intensity = 0;
    }

    // --- 2. LOST ANTON: Left Door/Window OR Walking Across Wet Tiles Sweeping Phone Beam Under Desk! ---
    const antonRoom = run.animatronics.anton.room;
    const leftIlluminated = !out && (run.leftLight || (flashActive && turn < 0.3 && look < -0.32));
    const antonInOffice = !out && antonRoom === 'office';
    const antonAtLeft = leftIlluminated && antonRoom === 'left_door';
    this.officeAnton.root.visible = antonInOffice || antonAtLeft;
    this.antonSweepSpot.intensity = 0;

    if (antonInOffice) {
      const sweep = run.animatronics.anton.sweepPhase ?? (t * 1.6);
      const walkX = Math.sin(sweep * 0.75) * 0.82;
      this.officeAnton.root.position.set(walkX, 0, -0.78);
      this.officeAnton.root.rotation.y = Math.PI + Math.cos(sweep * 0.75) * 0.35;
      applyStalkerPose(this.officeAnton, 'phone_walk', t);
      setIrEyeShine(this.officeAnton, 0.85);

      // Anton's sweeping smartphone beam scanning across the wet floor under your counter!
      this.antonSweepSpot.intensity = 28;
      this.antonSweepSpot.position.set(walkX, 0.88, -0.88);
      this.antonSweepSpot.target.position.set(Math.sin(sweep * 1.35) * 0.85, 0.05, -1.95);
    } else if (antonAtLeft) {
      if (run.leftDoor) {
        this.officeAnton.root.position.set(-3.46, 0.0, -2.30);
        this.officeAnton.root.rotation.y = Math.PI / 2 + 0.1;
        applyStalkerPose(this.officeAnton, 'window_press', t);
      } else {
        this.officeAnton.root.position.set(-3.55, 0.0, -1.04);
        this.officeAnton.root.rotation.y = Math.PI / 2 - 0.16;
        applyStalkerPose(this.officeAnton, 'doorway_peek', t);
      }
      setIrEyeShine(this.officeAnton, 0.95);
    }

    // --- 3. SCHNORRER TOM: Right Window, Back Pickup Hatch, OR Scavenging Floor in Office! ---
    const tomRoom = run.animatronics.tom.room;
    const rightIlluminated = !out && (run.rightLight || (flashActive && turn < 0.3 && look > 0.32));
    const hatchIlluminated = !out && turn > 0.5 && (flashActive || !run.breakerTripped) && tomRoom === 'back_hatch';
    const tomInOffice = !out && tomRoom === 'office';
    const tomAtRight = rightIlluminated && tomRoom === 'right_door';
    this.officeTom.root.visible = tomInOffice || tomAtRight || hatchIlluminated;

    if (tomInOffice) {
      const sweep = run.animatronics.tom.sweepPhase ?? (t * 1.7);
      this.officeTom.root.position.set(Math.cos(sweep * 0.8) * 1.1, 0, -0.85);
      this.officeTom.root.rotation.y = Math.PI - Math.sin(sweep * 0.8) * 0.4;
      applyStalkerPose(this.officeTom, 'crate_crouch', t);
    } else if (hatchIlluminated) {
      // Pressed right against the Back Pickup Hatch glass behind your chair!
      this.officeTom.root.position.set(1.95, 0.02, 3.26);
      this.officeTom.root.rotation.y = Math.PI;
      applyStalkerPose(this.officeTom, 'window_press', t);
      setIrEyeShine(this.officeTom, flashActive ? 1.0 : 0.45);
    } else if (tomAtRight) {
      this.officeTom.root.position.set(3.44, 0.0, -2.28);
      this.officeTom.root.rotation.y = -Math.PI / 2 + 0.15;
      applyStalkerPose(this.officeTom, 'window_press', t);
      setIrEyeShine(this.officeTom, 0.95);
    }

    // --- 4. THE FILTHY DUCK SUIT: Silent 180° Anomaly (Front or Back Station) ---
    const duckActive = Boolean(!out && (run.duck?.active || run.goldenActive));
    this.officeDuckSuit.root.visible = duckActive;
    if (duckActive) {
      const atBack = run.duck?.station === 'back';
      this.officeDuckSuit.root.position.set(0.06, 0, atBack ? 1.48 : -1.08);
      this.officeDuckSuit.root.rotation.y = atBack ? Math.PI : 0;
      applyStalkerPose(this.officeDuckSuit, 'slumped_suit', t);
      setIrEyeShine(this.officeDuckSuit, 0.68);
    }

    const shock = Math.max(run.stingFlash * 1.4, run.doorSlamFlash * 1.1, duckActive ? 0.25 : 0);
    const blackout = out && out.phase === 'blackout' ? 0.96 : 0;
    const heatNorm = reduced ? 0 : Math.max(0, (heat - 58) / 42);

    this.renderPass(t, {
      cctv: 0,
      staticAmt: run.hallucination ? 0.44 : (run.monitorAnim > 0.06 ? 0.26 : 0),
      blackout,
      shock,
      quake: Math.min(1.2, q),
      flicker: run.lightFlicker,
      monitorFlash: run.monitorFlash || 0,
      heat: heatNorm,
      steam: out ? 0 : (run.thermal?.steamFog ?? 0),
      lowPower: reduced ? lowPowerAmt * 0.4 : lowPowerAmt,
      flashlight: flashActive ? capScale : 0,
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

    this.cctvSpot.intensity = 19 + (run.irFlash || 0) * 18;
    this.cctvFill.color.setHex(0xc89852);

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
          p.scale.setScalar(0.55 * (1 + (1 - life) * 0.85));
        });
      }
    };
    syncSteamCloud(this.cam2bSteam, '2B');
    syncSteamCloud(this.cam4bSteam, '4B');

    if (camId === '1A') {
      this.camera.position.set(0.15 + qx, 2.32 + qy, 2.42);
      this.camera.lookAt(sweep * 2.1, 1.28, -1.55);
      this.cctvSpot.position.set(0, 3.25, 1.6);
      this.cctvSpot.target.position.set(0, 1.2, -1.6);
      this.stageSpit.spit.rotation.y = t * 1.1;
    } else if (camId === '1B') {
      this.camera.position.set(-2.5 + qx, 2.55 + qy, 3.1);
      this.camera.lookAt(sweep * 2.8, 1.05, -1.25);
      this.cctvSpot.position.set(0, 3.3, 1.0);
      this.cctvSpot.target.position.set(0, 0.9, -1.5);
    } else if (camId === '1C') {
      this.camera.position.set(-1.2 + qx, 2.22 + qy, 2.38);
      this.camera.lookAt(0.15 + sweep * 1.3, 1.32, -1.1);
      this.cctvSpot.position.set(0, 3.15, 1.85);
      this.cctvSpot.target.position.set(0, 1.2, -1.1);
      const openAmt = run.animatronics.hauke.curtainAnim ?? 0;
      this.coveCurtainL.position.x = -openAmt;
      this.coveCurtainR.position.x = openAmt;
      this.coveSignMat.map = run.animatronics.hauke.stage >= 3 ? this.signAngryTex : this.signNormalTex;
    } else if (camId === '2A') {
      this.camera.position.set(0.0 + qx, 2.35 + qy, 3.9);
      this.camera.lookAt(sweep * 0.9, 1.15, -2.6);
      this.cctvSpot.position.set(0, 3.2, 2.6);
      this.cctvSpot.target.position.set(0, 1.05, -2.2);
    } else if (camId === '2B') {
      this.camera.position.set(0.95 + qx, 2.25 + qy, 2.25);
      this.camera.lookAt(-0.45 + sweep * 0.7, 1.48, -1.2);
      this.cctvSpot.position.set(0.5, 3.1, 1.6);
      this.cctvSpot.target.position.set(-0.5, 1.35, -1.1);
      this.cam2bPosterMat.map = run.goldenPoster ? this.posterTextures.golden : this.posterTextures.poster_default;
    } else if (camId === '3') {
      this.camera.position.set(0.9 + qx, 2.6 + qy, 1.7);
      this.camera.lookAt(-0.2 + sweep * 0.6, 1.15, -1.0);
      this.cctvSpot.position.set(0.2, 3.2, 1.2);
      this.cctvSpot.target.position.set(-0.2, 1.0, -1.0);
    } else if (camId === '4A') {
      this.camera.position.set(0.0 + qx, 2.35 + qy, 3.9);
      this.camera.lookAt(sweep * 0.9, 1.15, -2.6);
      this.cctvSpot.position.set(0, 3.2, 2.2);
      this.cctvSpot.target.position.set(0, 1.1, -2.5);
    } else if (camId === '4B') {
      this.camera.position.set(-0.7 + qx, 2.22 + qy, 2.05);
      this.camera.lookAt(0.12 + sweep * 0.55, 1.48, -1.0);
      this.cctvSpot.position.set(-0.4, 3.0, 1.5);
      this.cctvSpot.target.position.set(0.2, 1.35, -0.9);
    } else if (camId === '5') {
      this.camera.position.set(1.6 + qx, 2.35 + qy, 2.2);
      this.camera.lookAt(-0.4 + sweep * 1.1, 1.35, -1.4);
      this.cctvSpot.position.set(0.6, 3.2, 1.6);
      this.cctvSpot.target.position.set(-0.3, 1.2, -1.4);
      const stare = Boolean(run.cam5Stare);
      for (const sh of this.cam5Heads) {
        sh.pins.visible = stare;
        sh.root.rotation.y = stare ? 0.62 : 0.12;
      }
    }

    const { torge, anton, tom, hauke } = run.animatronics;

    if (torge.room === camId) {
      this.cctvTorge.root.visible = true;
      if (camId === '1A') {
        this.cctvTorge.root.position.set(0, 0, -1.1);
        this.cctvTorge.root.rotation.y = 0;
        applyStalkerPose(this.cctvTorge, 'neutral', t);
      } else if (camId === '1B') {
        this.cctvTorge.root.position.set(0.45, 0, -2.25);
        this.cctvTorge.root.rotation.y = -0.55;
        applyStalkerPose(this.cctvTorge, 'corner_stare', t);
      } else {
        this.cctvTorge.root.position.set(-0.2, 0.12, 0.8);
        this.cctvTorge.root.rotation.y = -0.32;
        applyStalkerPose(this.cctvTorge, 'corner_stare', t);
      }
    }

    if (anton.room === camId) {
      this.cctvAnton.root.visible = true;
      if (camId === '1A') {
        this.cctvAnton.root.position.set(-1.35, 0, -1.05);
        this.cctvAnton.root.rotation.y = 0.18;
        applyStalkerPose(this.cctvAnton, 'neutral', t);
      } else if (camId === '1B') {
        this.cctvAnton.root.position.set(-1.25, 0, -0.35);
        this.cctvAnton.root.rotation.y = 0.42;
        applyStalkerPose(this.cctvAnton, 'doorway_peek', t);
      } else if (camId === '5') {
        this.cctvAnton.root.position.set(0.65, 0.08, 0.92);
        this.cctvAnton.root.rotation.y = 0.56;
        applyStalkerPose(this.cctvAnton, 'corner_stare', t);
      } else if (camId === '3') {
        this.cctvAnton.root.position.set(0.15, 0, 0.15);
        this.cctvAnton.root.rotation.y = 0.48;
        applyStalkerPose(this.cctvAnton, 'crate_crouch', t);
      } else if (camId === '2A') {
        this.cctvAnton.root.position.set(0.45, 0, -0.75);
        this.cctvAnton.root.rotation.y = -0.22;
        applyStalkerPose(this.cctvAnton, 'doorway_peek', t);
      } else if (camId === '2B') {
        this.cctvAnton.root.position.set(0.32, 0.05, 0.85);
        this.cctvAnton.root.rotation.y = 0.45;
        applyStalkerPose(this.cctvAnton, 'corner_stare', t);
      }
      if (videoWarning) {
        this.cctvAnton.root.position.lerp(this.camera.position, reduced ? 0.18 : 0.34);
      }
    }

    if (tom.room === camId) {
      this.cctvTom.root.visible = true;
      if (camId === '1A') {
        this.cctvTom.root.position.set(1.35, 0, -1.05);
        this.cctvTom.root.rotation.y = -0.18;
        applyStalkerPose(this.cctvTom, 'neutral', t);
      } else if (camId === '1B') {
        this.cctvTom.root.position.set(1.22, 0, 0.18);
        this.cctvTom.root.rotation.y = -0.58;
        applyStalkerPose(this.cctvTom, 'crate_crouch', t);
      } else if (camId === '4A') {
        this.cctvTom.root.position.set(0.35, 0, -0.45);
        this.cctvTom.root.rotation.y = -0.15;
        applyStalkerPose(this.cctvTom, 'doorway_peek', t);
      } else if (camId === '4B') {
        this.cctvTom.root.position.set(-0.18, 0.08, 0.88);
        this.cctvTom.root.rotation.y = -0.36;
        applyStalkerPose(this.cctvTom, 'corner_stare', t);
      }
    }

    if (camId === '1C' && hauke.stage < 3) {
      this.cctvHauke.root.visible = hauke.stage >= 1;
      applyStalkerPose(this.cctvHauke, hauke.stage === 2 ? 'doorway_peek' : 'neutral', t);
      if (hauke.stage === 1) {
        this.cctvHauke.root.position.set(0.0, 0.32, -1.18);
        this.cctvHauke.root.rotation.y = -0.14;
      } else if (hauke.stage === 2) {
        this.cctvHauke.root.position.set(-0.08, 0.32, -0.28);
        this.cctvHauke.root.rotation.y = -0.26;
      }
    } else if (camId === '2A' && hauke.sprint.active && hauke.sprint.triggered) {
      this.cctvHauke.root.visible = true;
      applyStalkerPose(this.cctvHauke, 'neutral', t);
      const p = Math.min(1, hauke.sprint.progress);
      this.cctvHauke.root.position.set(Math.sin(t * 24) * 0.10, Math.abs(Math.sin(t * 22)) * 0.16, -4.2 + p * 7.2);
      this.cctvHauke.leftThigh.rotation.x = Math.sin(t * 22) * 0.85;
      this.cctvHauke.rightThigh.rotation.x = -Math.sin(t * 22) * 0.85;
      this.cctvHauke.leftUpperArm.rotation.x = -0.8 - Math.sin(t * 22) * 0.5;
      this.cctvHauke.rightUpperArm.rotation.x = -0.8 + Math.sin(t * 22) * 0.5;
    }

    const staticAmt = Math.max(videoWarning ? 0.18 : 0.038, run.camSwitchStatic * 2, run.goldenPoster && camId === '2B' ? 0.24 : 0);
    const activeSteam = (burst && burst.cam === camId && burst.timer > 0)
      ? Math.min(1, 0.55 + (burst.timer / 1.35) * 0.45)
      : (run.thermal?.steamFog ?? 0) * 0.75;

    this.renderPass(t, {
      cctv: 1,
      staticAmt,
      shock: (run.goldenPoster && camId === '2B') ? 0.26 : videoWarning ? 0.12 : 0,
      quake: Math.min(1.2, q),
      flicker: run.lightFlicker,
      monitorFlash: run.monitorFlash || 0,
      steam: activeSteam,
      irFlash: run.irFlash || 0,
    });
  }

  drawJumpscare(run) {
    const js = run.jumpscare;
    const video = js.cause === 'video';
    this.setMode(video ? 'jumpscare_cctv' : 'jumpscare_office');

    if (!video) {
      this.syncOfficeEnvironment(run);
      this.officeAnton.root.visible = false;
      this.officeTom.root.visible = false;
      this.officeTorge.root.visible = false;
      this.officeDuckSuit.root.visible = false;
      this.officeLight.intensity = 9 + Math.sin(js.timer * 18) * 4;
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

    applyStalkerPose(active, 'jumpscare_lunge', t);

    this.camera.position.set(
      Math.sin(t * 34) * 0.07 * shake,
      1.58 + Math.cos(t * 38) * 0.06 * shake,
      0.72,
    );
    this.camera.rotation.set(
      -0.02 + Math.cos(t * 29) * 0.04 * shake,
      0,
      Math.sin(t * 26) * 0.10 * shake,
    );

    const stopZ = video ? -0.18 : shot.stopZ;
    const startZ = stopZ - (video ? 0.85 : 1.55);
    const baseY = 1.58 - shot.headY;

    active.root.position.set(
      (video ? 0.06 : shot.fromX) * (1 - lunge) + Math.sin(t * 36) * 0.07 * shake,
      baseY + Math.cos(t * 24) * 0.05 * shake,
      startZ + lunge * (stopZ - startZ),
    );
    active.root.rotation.y = (1 - lunge) * -shot.fromX * 0.4;

    this.jsStrobe.intensity = video ? 12 : 8 + 5 * lunge;
    this.jsRed.intensity = video ? 4 : 9;

    this.renderPass(t, {
      cctv: video ? 1 : 0,
      staticAmt: video ? 0.14 + p * 0.28 : 0.08,
      blackout: Math.max(0, (p - 0.86) / 0.14),
      shock: video ? 0.24 : 0.46,
      quake: shake,
    });
  }
}
