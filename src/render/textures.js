import * as THREE from 'three';
import { randomFrom, TAU } from './primitives.js';

function hasDomCanvas() {
  return typeof document !== 'undefined' && typeof document.createElement === 'function';
}

export function makeCanvasTexture(w, h, drawFn, { repeat = false, nearest = false, srgb = true } = {}) {
  if (!hasDomCanvas()) {
    return new THREE.Texture();
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = !nearest;
  drawFn(ctx, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  if (nearest) {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
  } else {
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.anisotropy = 4;
  }
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  }
  return texture;
}

/**
 * Generates matching Procedural PBR Surface Maps (Albedo + Sobel Tangent Normal + Roughness)
 * for Chilla's Art "Closing Shift" wet tiles, grouted ceramic walls, stainless steel, and shutters!
 */
export function makePbrSurfaceSet(w, h, paintFn, { repeat = true, normalStrength = 2.2 } = {}) {
  if (!hasDomCanvas()) {
    const dummy = new THREE.Texture();
    return { map: dummy, normalMap: dummy, roughnessMap: dummy };
  }

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = w;
  albedoCanvas.height = h;
  const albedoCtx = albedoCanvas.getContext('2d');

  const heightCanvas = document.createElement('canvas');
  heightCanvas.width = w;
  heightCanvas.height = h;
  const heightCtx = heightCanvas.getContext('2d');
  heightCtx.fillStyle = '#808080';
  heightCtx.fillRect(0, 0, w, h);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = w;
  roughCanvas.height = h;
  const roughCtx = roughCanvas.getContext('2d');
  roughCtx.fillStyle = '#909090';
  roughCtx.fillRect(0, 0, w, h);

  paintFn({ albedoCtx, heightCtx, roughCtx, w, h });

  // Compute tangent-space normal map from heightCanvas via Sobel operator
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = w;
  normalCanvas.height = h;
  const nCtx = normalCanvas.getContext('2d');
  const hData = heightCtx.getImageData(0, 0, w, h).data;
  const nImg = nCtx.createImageData(w, h);
  const nData = nImg.data;

  const sampleH = (x, y) => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    return hData[(wy * w + wx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = sampleH(x - 1, y - 1);
      const l = sampleH(x - 1, y);
      const bl = sampleH(x - 1, y + 1);
      const t = sampleH(x, y - 1);
      const b = sampleH(x, y + 1);
      const tr = sampleH(x + 1, y - 1);
      const r = sampleH(x + 1, y);
      const br = sampleH(x + 1, y + 1);

      const dx = ((tr + 2 * r + br) - (tl + 2 * l + bl)) * normalStrength;
      const dy = ((bl + 2 * b + br) - (tl + 2 * t + tr)) * normalStrength;
      const nx = -dx;
      const ny = -dy;
      const nz = 1.0;
      const invLen = 1 / Math.hypot(nx, ny, nz);

      const idx = (y * w + x) * 4;
      nData[idx] = Math.round((nx * invLen * 0.5 + 0.5) * 255);
      nData[idx + 1] = Math.round((ny * invLen * 0.5 + 0.5) * 255);
      nData[idx + 2] = Math.round((nz * invLen * 0.5 + 0.5) * 255);
      nData[idx + 3] = 255;
    }
  }
  nCtx.putImageData(nImg, 0, 0);

  const wrapCfg = (tex, isColor = false) => {
    if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    if (repeat) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
    }
    return tex;
  };

  return {
    map: wrapCfg(new THREE.CanvasTexture(albedoCanvas), true),
    normalMap: wrapCfg(new THREE.CanvasTexture(normalCanvas), false),
    roughnessMap: wrapCfg(new THREE.CanvasTexture(roughCanvas), false),
  };
}

export function quarryFloorPbrSet() {
  return makePbrSurfaceSet(256, 256, ({ albedoCtx, heightCtx, roughCtx, w, h }) => {
    const rng = randomFrom(404);
    const tile = 64;
    for (let y = 0; y < h; y += tile) {
      for (let x = 0; x < w; x += tile) {
        const dark = ((x / tile) + (y / tile)) % 2 === 0;
        albedoCtx.fillStyle = dark ? '#161920' : '#a8a090';
        albedoCtx.fillRect(x, y, tile, tile);
        albedoCtx.strokeStyle = '#0a0b0f';
        albedoCtx.lineWidth = 3;
        albedoCtx.strokeRect(x + 1.5, y + 1.5, tile - 3, tile - 3);

        // Recessed grout in height map
        heightCtx.fillStyle = '#c8c8c8';
        heightCtx.fillRect(x + 3, y + 3, tile - 6, tile - 6);
        heightCtx.strokeStyle = '#222222';
        heightCtx.lineWidth = 4;
        heightCtx.strokeRect(x + 1.5, y + 1.5, tile - 3, tile - 3);

        // Base tile roughness (medium-glossy ceramic) + matte grout
        roughCtx.fillStyle = dark ? '#585858' : '#6e6e6e';
        roughCtx.fillRect(x + 3, y + 3, tile - 6, tile - 6);
        roughCtx.strokeStyle = '#e0e0e0';
        roughCtx.lineWidth = 4;
        roughCtx.strokeRect(x + 1.5, y + 1.5, tile - 3, tile - 3);
      }
    }

    // Wet puddles & kitchen grease patches (darker albedo, ultra-low glossy roughness!)
    for (let i = 0; i < 18; i++) {
      const px = rng() * w;
      const py = rng() * h;
      const pr = 12 + rng() * 28;
      albedoCtx.fillStyle = 'rgba(12, 14, 18, 0.22)';
      albedoCtx.beginPath();
      albedoCtx.arc(px, py, pr, 0, TAU);
      albedoCtx.fill();

      roughCtx.fillStyle = '#181818'; // wet mirror-like specular!
      roughCtx.beginPath();
      roughCtx.arc(px, py, pr, 0, TAU);
      roughCtx.fill();
    }

    // Scuff marks & tracked dirt
    for (let i = 0; i < 220; i++) {
      albedoCtx.fillStyle = 'rgba(18, 14, 10, 0.22)';
      albedoCtx.fillRect(rng() * w, rng() * h, 2 + rng() * 7, 2 + rng() * 5);
    }
  }, { repeat: true, normalStrength: 2.5 });
}

export function ceramicWallPbrSet() {
  return makePbrSurfaceSet(256, 256, ({ albedoCtx, heightCtx, roughCtx, w, h }) => {
    const rng = randomFrom(808);
    // Upper cold off-white/grey glazed Imbiss ceramic tiles
    albedoCtx.fillStyle = '#8b908b';
    albedoCtx.fillRect(0, 0, w, 152);
    // Mid dark bottle-green German Imbiss border strip
    albedoCtx.fillStyle = '#18362a';
    albedoCtx.fillRect(0, 152, w, 18);
    // Lower dark slate/charcoal wainscot tiles
    albedoCtx.fillStyle = '#252930';
    albedoCtx.fillRect(0, 170, w, h - 170);

    heightCtx.fillStyle = '#cccccc';
    heightCtx.fillRect(0, 0, w, h);
    roughCtx.fillStyle = '#545454';
    roughCtx.fillRect(0, 0, w, h);

    // Grouted ceramic tile grid
    const tw = 32;
    const th = 16;
    for (let y = 0; y < h - 16; y += th) {
      albedoCtx.strokeStyle = 'rgba(16, 18, 20, 0.55)';
      albedoCtx.lineWidth = 2;
      albedoCtx.beginPath();
      albedoCtx.moveTo(0, y);
      albedoCtx.lineTo(w, y);
      albedoCtx.stroke();

      heightCtx.strokeStyle = '#303030';
      heightCtx.lineWidth = 2;
      heightCtx.beginPath();
      heightCtx.moveTo(0, y);
      heightCtx.lineTo(w, y);
      heightCtx.stroke();

      roughCtx.strokeStyle = '#d8d8d8';
      roughCtx.lineWidth = 2;
      roughCtx.beginPath();
      roughCtx.moveTo(0, y);
      roughCtx.lineTo(w, y);
      roughCtx.stroke();

      const shift = ((y / th) % 2) * (tw * 0.5);
      for (let x = shift; x < w; x += tw) {
        albedoCtx.beginPath(); albedoCtx.moveTo(x, y); albedoCtx.lineTo(x, y + th); albedoCtx.stroke();
        heightCtx.beginPath(); heightCtx.moveTo(x, y); heightCtx.lineTo(x, y + th); heightCtx.stroke();
        roughCtx.beginPath(); roughCtx.moveTo(x, y); roughCtx.lineTo(x, y + th); roughCtx.stroke();
      }
    }

    // Grease/condensation streaks & dark baseboard
    for (let i = 0; i < 95; i++) {
      const gx = rng() * w;
      const gy = rng() * h;
      albedoCtx.fillStyle = 'rgba(18, 14, 8, 0.16)';
      albedoCtx.fillRect(gx, gy, 2 + rng() * 5, 10 + rng() * 28);
    }
    albedoCtx.fillStyle = '#0d0f14';
    albedoCtx.fillRect(0, h - 16, w, 16);
  }, { repeat: true, normalStrength: 2.0 });
}

export function stainlessSteelPbrSet() {
  return makePbrSurfaceSet(256, 256, ({ albedoCtx, heightCtx, roughCtx, w, h }) => {
    const rng = randomFrom(512);
    albedoCtx.fillStyle = '#8b95a2';
    albedoCtx.fillRect(0, 0, w, h);
    roughCtx.fillStyle = '#4e4e4e';
    roughCtx.fillRect(0, 0, w, h);

    // Brushed horizontal gastro steel grain + fingerprint/wipe smudges
    for (let y = 0; y < h; y += 2) {
      const v = 128 + Math.floor((rng() - 0.5) * 26);
      albedoCtx.fillStyle = `rgba(${v},${v + 6},${v + 12},0.22)`;
      albedoCtx.fillRect(0, y, w, 1);
      heightCtx.fillStyle = `rgb(${v},${v},${v})`;
      heightCtx.fillRect(0, y, w, 1);
    }
    for (let i = 0; i < 24; i++) {
      const sx = rng() * w;
      const sy = rng() * h;
      roughCtx.fillStyle = rng() > 0.5 ? '#8a8a8a' : '#2c2c2c';
      roughCtx.beginPath();
      roughCtx.ellipse(sx, sy, 14 + rng() * 18, 6 + rng() * 10, rng(), 0, TAU);
      roughCtx.fill();
    }
  }, { repeat: true, normalStrength: 1.2 });
}

export function corrugatedShutterPbrSet() {
  return makePbrSurfaceSet(256, 256, ({ albedoCtx, heightCtx, roughCtx, w, h }) => {
    const rng = randomFrom(701);
    albedoCtx.fillStyle = '#363e4c';
    albedoCtx.fillRect(0, 0, w, h);
    roughCtx.fillStyle = '#686868';
    roughCtx.fillRect(0, 0, w, h);

    for (let y = 0; y < h - 32; y += 16) {
      const g = albedoCtx.createLinearGradient(0, y, 0, y + 16);
      g.addColorStop(0, '#5a6578');
      g.addColorStop(0.5, '#363e4c');
      g.addColorStop(1, '#161a22');
      albedoCtx.fillStyle = g;
      albedoCtx.fillRect(0, y, w, 16);

      const hg = heightCtx.createLinearGradient(0, y, 0, y + 16);
      hg.addColorStop(0, '#e0e0e0');
      hg.addColorStop(0.5, '#909090');
      hg.addColorStop(1, '#242424');
      heightCtx.fillStyle = hg;
      heightCtx.fillRect(0, y, w, 16);
    }

    // Scratches & rust grime
    for (let i = 0; i < 45; i++) {
      albedoCtx.fillStyle = 'rgba(42,26,16,0.22)';
      albedoCtx.fillRect(rng() * w, rng() * (h - 36), 4 + rng() * 18, 2 + rng() * 6);
    }

    // Bottom hazard bar
    albedoCtx.fillStyle = '#c9962c';
    albedoCtx.fillRect(0, h - 30, w, 30);
    albedoCtx.fillStyle = '#14161c';
    for (let x = -32; x < w + 32; x += 28) {
      albedoCtx.beginPath();
      albedoCtx.moveTo(x, h);
      albedoCtx.lineTo(x + 14, h);
      albedoCtx.lineTo(x + 28, h - 30);
      albedoCtx.lineTo(x + 14, h - 30);
      albedoCtx.closePath();
      albedoCtx.fill();
    }
  }, { repeat: false, normalStrength: 2.8 });
}

export function checkerFloorTexture() {
  return quarryFloorPbrSet().map;
}

export function wallPanelTexture() {
  return ceramicWallPbrSet().map;
}

export function shutterTexture() {
  return corrugatedShutterPbrSet().map;
}

export function deskWoodTexture() {
  return makeCanvasTexture(256, 256, (ctx, size) => {
    const rng = randomFrom(912);
    ctx.fillStyle = '#3d2a1e';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 4) {
      ctx.fillStyle = rng() > 0.5 ? 'rgba(20,12,8,0.28)' : 'rgba(110,78,54,0.16)';
      ctx.fillRect(0, y, size, 2 + Math.floor(rng() * 3));
    }
  }, { repeat: true });
}

export function rainWindowTexture() {
  return makeCanvasTexture(256, 256, (ctx, w, h) => {
    const rng = randomFrom(314);
    ctx.fillStyle = 'rgba(18, 28, 38, 0.35)';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const len = 14 + rng() * 48;
      ctx.strokeStyle = 'rgba(185, 215, 235, 0.38)';
      ctx.lineWidth = 1 + rng() * 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2 + rng() * 4, y + len);
      ctx.stroke();
    }
  }, { repeat: true });
}

/**
 * Renders wall poster variants (Cosmetic Shop variants + CAM 2B Duck Anomaly).
 */
export function posterTexture(variant = 'poster_default') {
  const mode = variant === true ? 'golden' : variant === false ? 'poster_default' : variant;
  return makeCanvasTexture(256, 340, (ctx, w, h) => {
    if (mode === 'golden') {
      ctx.fillStyle = '#0a0805';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#6e5618';
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.fillStyle = '#8c6e1a';
      ctx.beginPath(); ctx.arc(w * 0.5, 146, 56, 0, TAU); ctx.fill();
      ctx.fillStyle = '#030305';
      ctx.beginPath(); ctx.arc(w * 0.5 - 20, 138, 14, 0, TAU); ctx.arc(w * 0.5 + 20, 138, 14, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e8f2ff';
      ctx.fillRect(w * 0.5 - 21, 137, 3, 3); ctx.fillRect(w * 0.5 + 19, 137, 3, 3);
      ctx.fillStyle = '#943e14';
      ctx.beginPath(); ctx.ellipse(w * 0.5, 168, 34, 12, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#b82834';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('KEIN LICHT', w * 0.5, 268);
      ctx.fillStyle = '#a89668';
      ctx.font = 'bold 15px monospace';
      ctx.fillText('LAGER-AKTE 87', w * 0.5, 298);
      return;
    }

    if (mode === 'poster_retro_doner') {
      ctx.fillStyle = '#1c1210';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#b88a38';
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.fillStyle = '#9e222e';
      ctx.fillRect(18, 18, w - 36, 44);
      ctx.fillStyle = '#f2e8d4';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TORGES DREHSPIESS', w * 0.5, 46);
      ctx.fillStyle = '#8c4422';
      ctx.beginPath();
      ctx.moveTo(92, 92); ctx.lineTo(164, 92); ctx.lineTo(146, 224); ctx.lineTo(110, 224);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d8caa8';
      ctx.font = 'bold 15px monospace';
      ctx.fillText('SEIT 1996 · NACHTVERKAUF', w * 0.5, 268);
      ctx.fillStyle = '#c89838';
      ctx.fillText('BIS 06:00 UHR GEÖFFNET', w * 0.5, 296);
      return;
    }

    if (mode === 'poster_missing') {
      ctx.fillStyle = '#d8d0be';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1a1816';
      ctx.fillRect(16, 18, w - 32, 38);
      ctx.fillStyle = '#e8e0d0';
      ctx.font = 'bold 19px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('INTERNE MITTEILUNG', w * 0.5, 43);
      ctx.fillStyle = '#221e1c';
      ctx.fillRect(58, 74, w - 116, 118);
      ctx.fillStyle = '#78621c';
      ctx.beginPath(); ctx.arc(w * 0.5, 134, 34, 0, TAU); ctx.fill();
      ctx.fillStyle = '#050508';
      ctx.fillRect(w * 0.5 - 16, 124, 10, 10); ctx.fillRect(w * 0.5 + 6, 124, 10, 10);
      ctx.fillStyle = '#1e1a18';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('KOSTÜM AUSGEMUSTERT', w * 0.5, 222);
      ctx.font = '11px monospace';
      ctx.fillText('Reißverschluss defekt.', w * 0.5, 248);
      ctx.fillText('Lagerraum nicht betreten.', w * 0.5, 268);
      ctx.fillStyle = '#9e1c28';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('NICHT ANLEUCHTEN', w * 0.5, 304);
      return;
    }

    // Default: Vergilbter Nachtschicht-Dienstplan & Hygiene-Protokoll
    ctx.fillStyle = '#dfd6c2';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#2a2622';
    ctx.lineWidth = 5;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#1c382c';
    ctx.fillRect(16, 16, w - 32, 36);
    ctx.fillStyle = '#ebe4d4';
    ctx.font = 'bold 17px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SCHLIESSDIENST 00–06', w * 0.5, 40);

    ctx.fillStyle = '#221e1a';
    ctx.font = 'bold 11.5px monospace';
    ctx.textAlign = 'left';
    const lines = [
      '1. PFLICHT-BONS ABARBEITEN',
      '2. SPIESS -> FRITTE -> TÜTE',
      '3. DURCHREICHE BELEUCHTEN [F]',
      '4. BEI EINBRUCH: UNTER THEKE',
      '5. HAUPTSICHERUNG HINTEN LINKS',
      '6. ABLUFT UNTER 70°C HALTEN',
      '7. KOSTÜM NIE ANLEUCHTEN',
    ];
    lines.forEach((l, i) => {
      ctx.fillStyle = i === 6 ? '#8e1c24' : '#221e1a';
      ctx.fillText(l, 20, 82 + i * 30);
    });
    // Grease stain at bottom corner
    ctx.fillStyle = 'rgba(82, 56, 24, 0.24)';
    ctx.beginPath(); ctx.arc(205, 295, 28, 0, TAU); ctx.fill();
  });
}

export function rulesPosterTexture(corrupted = false) {
  return posterTexture(corrupted ? 'poster_missing' : 'poster_default');
}

export function speziWrapTexture() {
  return makeCanvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#22100c';
    ctx.fillRect(0, 0, w, h);
    const stripes = [
      ['#d8b428', 28, 18],
      ['#d86c18', 46, 18],
      ['#b82450', 64, 18],
      ['#682088', 82, 18],
    ];
    for (const [col, y0, sh] of stripes) {
      ctx.fillStyle = col;
      ctx.fillRect(0, y0, w, sh);
    }
    ctx.fillStyle = '#12090c';
    ctx.fillRect(16, 44, w - 32, 30);
    ctx.fillStyle = '#f2ece0';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SPEZI', w * 0.5, 65);
  });
}

export function menuBoardTexture() {
  return makeCanvasTexture(320, 160, (ctx, w, h) => {
    ctx.fillStyle = '#111318';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#687488';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    ctx.fillStyle = '#d49a38';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TORGES NACHT-IMBISS · KARTE', w * 0.5, 30);

    ctx.font = 'bold 13px monospace';
    const items = [
      ['01 DÖNER TASCHE', '7,50 €'],
      ['02 DÜRÜM ROLLE', '8,50 €'],
      ['03 POMMES GROSS', '4,00 €'],
      ['04 SPEZI 0,5L KALT', '2,50 €'],
    ];
    items.forEach(([name, price], i) => {
      const y = 60 + i * 24;
      ctx.fillStyle = '#dfd8c8';
      ctx.textAlign = 'left';
      ctx.fillText(name, 18, y);
      ctx.fillStyle = '#7ec8a0';
      ctx.textAlign = 'right';
      ctx.fillText(price, w - 18, y);
    });
  });
}

export function neonSignTexture(line1, line2, color1 = '#d83848', color2 = '#52c896') {
  return makeCanvasTexture(288, 96, (ctx, w, h) => {
    ctx.fillStyle = '#08090d';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(180,190,205,0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.textAlign = 'center';
    ctx.fillStyle = color1;
    ctx.font = 'bold 24px monospace';
    ctx.fillText(line1, w * 0.5, 42);
    ctx.fillStyle = color2;
    ctx.font = 'bold 15px monospace';
    ctx.fillText(line2, w * 0.5, 72);
  });
}

export function coveSignTexture(angry = false) {
  return makeCanvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = angry ? '#22090d' : '#1b1916';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = angry ? '#b82834' : '#8a7a5c';
    ctx.lineWidth = 5;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.textAlign = 'center';
    ctx.fillStyle = angry ? '#e0424f' : '#d8ccb4';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(angry ? 'VORHANG OFFEN' : 'PERSONAL-BEREICH', w * 0.5, 54);
    ctx.font = 'bold 15px monospace';
    ctx.fillText(angry ? 'WEST-FLUR PRÜFEN!' : 'ZUTRITT VERBOTEN', w * 0.5, 90);
  });
}

export function steamGaugeDialTexture() {
  return makeCanvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = '#e2dac8';
    ctx.beginPath(); ctx.arc(64, 64, 58, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#24201c';
    ctx.lineWidth = 5;
    ctx.stroke();
    const zones = [
      [Math.PI * 0.75, Math.PI * 1.35, '#2b8a58'],
      [Math.PI * 1.35, Math.PI * 1.85, '#c88424'],
      [Math.PI * 1.85, Math.PI * 2.25, '#b82434'],
    ];
    for (const [a0, a1, col] of zones) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 9;
      ctx.beginPath(); ctx.arc(64, 64, 42, a0, a1); ctx.stroke();
    }
    ctx.fillStyle = '#181a20';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ABLUFT', 64, 48);
    ctx.fillText('°C', 64, 94);
  });
}

export function receiptPaperTexture() {
  return makeCanvasTexture(128, 192, (ctx, w, h) => {
    ctx.fillStyle = '#ece4d2';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1c2028';
    ctx.fillRect(0, 0, w, 28);
    ctx.fillStyle = '#f2ece0';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BESTELL-BON', w * 0.5, 19);
    ctx.fillStyle = '#262a34';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('1. SPIESS SCHNEIDEN', w * 0.5, 56);
    ctx.fillText('2. POMMES FRITTIEREN', w * 0.5, 84);
    ctx.fillText('3. SPEZI & TÜTE', w * 0.5, 112);
    ctx.fillStyle = '#8e222c';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('PFLICHT-QUOTE', w * 0.5, 162);
  });
}

export class LiveDeskDisplays {
  constructor() {
    if (!hasDomCanvas()) {
      this.sysTexture = new THREE.Texture();
      this.waveTexture = new THREE.Texture();
      return;
    }
    this.sysCanvas = document.createElement('canvas');
    this.sysCanvas.width = 160;
    this.sysCanvas.height = 112;
    this.sysCtx = this.sysCanvas.getContext('2d');
    this.sysTexture = new THREE.CanvasTexture(this.sysCanvas);
    this.sysTexture.colorSpace = THREE.SRGBColorSpace;

    this.waveCanvas = document.createElement('canvas');
    this.waveCanvas.width = 144;
    this.waveCanvas.height = 96;
    this.waveCtx = this.waveCanvas.getContext('2d');
    this.waveTexture = new THREE.CanvasTexture(this.waveCanvas);
    this.waveTexture.colorSpace = THREE.SRGBColorSpace;

    this.lastPaintAt = -1;
  }

  update(run) {
    if (!run || !this.sysCtx) return;
    if (Math.abs(run.time - this.lastPaintAt) < 0.085) return;
    this.lastPaintAt = run.time;

    const heat = Math.round(run.thermal?.heat ?? 16);
    const tempC = Math.round(30 + heat * 0.7);
    const pwr = Math.ceil(run.power ?? 100);
    const done = run.orders?.completed ?? 0;
    const quota = run.orders?.quota ?? 3;
    const activeBon = run.orders?.active;
    const sLvl = run.seismicLevel ?? 0;
    const noiseLvl = run.roomNoise ?? 0;

    const ctx = this.sysCtx;
    ctx.fillStyle = run.breakerTripped ? '#1c070a' : '#061114';
    ctx.fillRect(0, 0, 160, 112);

    ctx.fillStyle = run.overtime ? '#ff4252' : '#7ac8b8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(run.overtime ? '!! ÜBERSTUNDEN !!' : `QUOTE: ${done}/${quota} BONS`, 8, 15);

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(8, 21, 144, 9);
    ctx.fillStyle = pwr <= 20 ? '#d83242' : '#48c896';
    ctx.fillRect(8, 21, Math.round(1.44 * pwr), 9);

    ctx.fillStyle = heat >= 70 ? '#e85a42' : '#c8b478';
    ctx.fillText(`ABLUFT: ${tempC}°C · AKKU ${pwr}%`, 8, 45);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(8, 51, 144, 8);
    ctx.fillStyle = heat >= 72 ? '#d83242' : '#48c896';
    ctx.fillRect(8, 51, Math.round(1.44 * heat), 8);

    if (run.breakerTripped) {
      ctx.fillStyle = '#8e1c28';
      ctx.fillRect(8, 70, 144, 32);
      ctx.fillStyle = '#fff0f0';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('SICHERUNG RAUS [S]', 14, 90);
    } else if (activeBon) {
      const stepLabel = activeBon.step === 'doner'
        ? '1/3 SPIESS [S]'
        : activeBon.step === 'fryer'
          ? (activeBon.fryerState === 'ready' ? '2/3 HEBEN! [S]' : '2/3 FRITTE...')
          : '3/3 TÜTE [S]';
      ctx.fillStyle = 'rgba(200, 152, 52, 0.28)';
      ctx.fillRect(8, 70, 144, 32);
      ctx.fillStyle = '#f2dca0';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`BON: ${stepLabel}`, 12, 90);
    } else {
      ctx.fillStyle = '#6c8882';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`LAMPE: ${Math.round(run.flashlightBattery ?? 100)}% [F]`, 12, 90);
    }
    this.sysTexture.needsUpdate = true;

    const wctx = this.waveCtx;
    wctx.fillStyle = sLvl > 0.4 ? '#1a070d' : '#080c12';
    wctx.fillRect(0, 0, 144, 96);
    wctx.strokeStyle = sLvl > 0.45 ? '#e03848' : noiseLvl > 0.4 ? '#dca438' : '#48c896';
    wctx.lineWidth = 2.2;
    wctx.beginPath();
    const amp = 4 + sLvl * 28 + noiseLvl * 18;
    for (let x = 0; x <= 144; x += 4) {
      const y = 50 + Math.sin(x * 0.22 + run.time * 16) * Math.cos(x * 0.07 - run.time * 6) * amp;
      if (x === 0) wctx.moveTo(x, y);
      else wctx.lineTo(x, y);
    }
    wctx.stroke();

    wctx.fillStyle = sLvl > 0.45 ? '#ff7a8c' : noiseLvl > 0.4 ? '#f2c868' : '#88b4a8';
    wctx.font = 'bold 10px monospace';
    wctx.fillText(sLvl > 0.45 ? '!! BEBEN WEST !!' : `PEGEL / SEISMO`, 8, 14);
    this.waveTexture.needsUpdate = true;
  }
}

export { getCharacterPortraitUrl } from './portraits.js';
