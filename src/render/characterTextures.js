import * as THREE from 'three';
import { getFaceOverrideImage } from './overrides.js';
import { randomFrom, TAU } from './primitives.js';

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function quantizePsxCanvas(ctx, w, h, levels = 26, ditherStrength = 9) {
  let imgData;
  try {
    imgData = ctx.getImageData(0, 0, w, h);
  } catch {
    return;
  }
  const d = imgData.data;
  const step = 255 / levels;
  for (let y = 0; y < h; y++) {
    const row = BAYER_4X4[y & 3];
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const bayer = (row[x & 3] / 16 - 0.5) * ditherStrength;
      d[idx] = Math.max(0, Math.min(255, Math.round((d[idx] + bayer) / step) * step));
      d[idx + 1] = Math.max(0, Math.min(255, Math.round((d[idx + 1] + bayer) / step) * step));
      d[idx + 2] = Math.max(0, Math.min(255, Math.round((d[idx + 2] + bayer) / step) * step));
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

export function makePsxTexture(w, h, drawFn, { quantize = true, nearest = true } = {}) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return new THREE.Texture();
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, w, h);
  if (quantize) quantizePsxCanvas(ctx, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter;
  tex.minFilter = nearest ? THREE.NearestFilter : THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = !nearest;
  return tex;
}

/**
 * Gritty 128x128 / 256x256 PS1/VHS Human Face UV CanvasTexture:
 * - Skin pores, 3 AM sweat highlights, dark under-eye bags, stubble, creases.
 * - Seamlessly composites user face overrides from `public/overrides.json` when configured!
 */
export function characterFaceTexture(charId) {
  const tones = {
    torge: { base: '#b98f73', shadow: '#72513d', bag: 'rgba(42,24,30,0.62)', stubble: true },
    anton: { base: '#b69783', shadow: '#6d5548', bag: 'rgba(34,24,46,0.78)', stubble: false, uplight: true },
    tom: { base: '#be9578', shadow: '#785842', bag: 'rgba(48,30,32,0.55)', stubble: true },
    hauke: { base: '#b48a6e', shadow: '#684936', bag: 'rgba(38,24,24,0.68)', stubble: true, heavyBrow: true },
    duck: { base: '#9e7c20', shadow: '#543e0c', bag: 'rgba(18,14,8,0.75)', mascot: true },
  }[charId] || { base: '#b89074', shadow: '#70503c', bag: 'rgba(40,24,28,0.6)' };

  return makePsxTexture(256, 256, (ctx, w, h) => {
    const rng = randomFrom(charId.charCodeAt(0) * 97 + 31);

    // Base shaded skin or matted yellow mascot cloth
    const g = ctx.createRadialGradient(w * 0.5, h * 0.52, 18, w * 0.5, h * 0.5, w * 0.65);
    g.addColorStop(0, tones.base);
    g.addColorStop(1, tones.shadow);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Optional drop-in face photo override from public/overrides.json
    const overrideImg = getFaceOverrideImage(charId);
    if (overrideImg) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.drawImage(overrideImg, 36, 36, w - 72, h - 72);
      ctx.restore();
    }

    if (tones.mascot) {
      // Matted filthy yellow mascot plush seams + oil & mold stains
      for (let i = 0; i < 480; i++) {
        ctx.fillStyle = rng() > 0.5 ? 'rgba(34,24,8,0.24)' : 'rgba(210,175,65,0.12)';
        ctx.fillRect(rng() * w, rng() * h, 2 + rng() * 5, 2 + rng() * 5);
      }
      ctx.strokeStyle = 'rgba(28,18,8,0.72)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, 0);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();
      for (let y = 12; y < h; y += 18) {
        ctx.beginPath();
        ctx.moveTo(w * 0.5 - 7, y);
        ctx.lineTo(w * 0.5 + 7, y + 4);
        ctx.stroke();
      }
      return;
    }

    // Skin pores & gritty VHS noise
    for (let i = 0; i < 650; i++) {
      ctx.fillStyle = rng() > 0.52 ? 'rgba(35,18,12,0.14)' : 'rgba(245,218,195,0.08)';
      ctx.fillRect(rng() * w, rng() * h, 2, 2);
    }

    // Jaw/chin 5-o'clock stubble
    if (tones.stubble) {
      for (let i = 0; i < 520; i++) {
        const sx = 54 + rng() * (w - 108);
        const sy = h * 0.56 + rng() * (h * 0.36);
        ctx.fillStyle = 'rgba(28,22,20,0.28)';
        ctx.fillRect(sx, sy, 2, 2);
      }
    }

    // Recessed eye socket shadows & sleepless dark under-eye bags
    ctx.fillStyle = tones.bag;
    ctx.beginPath();
    ctx.ellipse(w * 0.36, h * 0.42, 24, 16, -0.08, 0, TAU);
    ctx.ellipse(w * 0.64, h * 0.42, 24, 16, 0.08, 0, TAU);
    ctx.fill();

    // Nose bridge shadow & nasolabial folds
    ctx.strokeStyle = 'rgba(46,24,18,0.48)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.46, h * 0.40);
    ctx.lineTo(w * 0.44, h * 0.58);
    ctx.moveTo(w * 0.54, h * 0.40);
    ctx.lineTo(w * 0.56, h * 0.58);
    // Nasolabial creases
    ctx.moveTo(w * 0.40, h * 0.58);
    ctx.lineTo(w * 0.34, h * 0.72);
    ctx.moveTo(w * 0.60, h * 0.58);
    ctx.lineTo(w * 0.66, h * 0.72);
    ctx.stroke();

    // Forehead & nose bridge 3 AM sweat specular sheen
    ctx.fillStyle = tones.uplight ? 'rgba(110,235,220,0.16)' : 'rgba(255,236,214,0.14)';
    ctx.fillRect(w * 0.48, h * 0.42, 8, 34);
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.25, 38, 10, 0, 0, TAU);
    ctx.fill();
  });
}

export function torgeJacketTexture() {
  return makePsxTexture(256, 256, (ctx, w, h) => {
    const rng = randomFrom(101);
    // Stained dark-crimson double-breasted chef jacket
    ctx.fillStyle = '#5e141c';
    ctx.fillRect(0, 0, w, h);

    // Cloth folds
    for (let i = 0; i < 42; i++) {
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(18,4,8,0.36)' : 'rgba(148,44,54,0.18)';
      ctx.lineWidth = 3 + rng() * 4;
      ctx.beginPath();
      const y = rng() * h;
      ctx.moveTo(rng() * w, y);
      ctx.lineTo(rng() * w, y + (rng() - 0.5) * 35);
      ctx.stroke();
    }

    // Wrinkled sweat-stained white undershirt V-neck at top
    ctx.fillStyle = '#cfc6b4';
    ctx.beginPath();
    ctx.moveTo(w * 0.36, 0);
    ctx.lineTo(w * 0.64, 0);
    ctx.lineTo(w * 0.5, 58);
    ctx.closePath();
    ctx.fill();

    // Double-breasted overlap seam & tarnished brass buttons
    ctx.strokeStyle = '#24070b';
    ctx.lineWidth = 4;
    ctx.strokeRect(w * 0.30, 52, w * 0.40, h - 56);
    ctx.fillStyle = '#8c6c32';
    for (const by of [76, 118, 160, 202]) {
      ctx.beginPath();
      ctx.arc(w * 0.36, by, 5, 0, TAU);
      ctx.arc(w * 0.64, by, 5, 0, TAU);
      ctx.fill();
    }

    // Dark fryer oil & sauce stains
    for (let i = 0; i < 28; i++) {
      ctx.fillStyle = 'rgba(16,8,4,0.42)';
      ctx.beginPath();
      ctx.arc(40 + rng() * (w - 80), 70 + rng() * (h - 90), 4 + rng() * 14, 0, TAU);
      ctx.fill();
    }
  });
}

export function antonOutfitTexture() {
  return makePsxTexture(256, 256, (ctx, w, h) => {
    const rng = randomFrom(202);
    // Faded washed-out charcoal black tee
    ctx.fillStyle = '#181a20';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 38; i++) {
      ctx.strokeStyle = 'rgba(42,46,56,0.28)';
      ctx.lineWidth = 2 + rng() * 3;
      ctx.beginPath();
      ctx.moveTo(0, rng() * h);
      ctx.lineTo(w, rng() * h);
      ctx.stroke();
    }

    // Cracked faded lime graphic print
    ctx.strokeStyle = 'rgba(158,188,52,0.58)';
    ctx.lineWidth = 3;
    ctx.strokeRect(66, 74, w - 132, 84);
    ctx.fillStyle = 'rgba(168,198,58,0.68)';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NO SIGNAL', w * 0.5, 116);
    ctx.font = 'bold 14px monospace';
    ctx.fillText('03:14 // WEST', w * 0.5, 142);

    // Cracks across screenprint
    ctx.strokeStyle = '#181a20';
    ctx.lineWidth = 2;
    for (let i = 0; i < 16; i++) {
      ctx.beginPath();
      ctx.moveTo(64 + rng() * 128, 70 + rng() * 90);
      ctx.lineTo(64 + rng() * 128, 70 + rng() * 90);
      ctx.stroke();
    }
  });
}

export function antonPhoneGlowTexture() {
  return makePsxTexture(128, 224, (ctx, w, h) => {
    ctx.fillStyle = '#071c22';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#4de8d2';
    ctx.fillRect(8, 12, w - 16, 26);
    ctx.fillStyle = '#041216';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('03:14', w * 0.5, 30);

    // Cold blue-green map grid + cracked glass lines
    ctx.strokeStyle = '#26948c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(14, 58); ctx.lineTo(108, 134); ctx.lineTo(28, 188);
    ctx.moveTo(98, 52); ctx.lineTo(22, 152);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(215,255,250,0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 44); ctx.lineTo(74, 112); ctx.lineTo(128, 96);
    ctx.moveTo(74, 112); ctx.lineTo(48, 224);
    ctx.stroke();
  });
}

export function tomSurfTeeTexture() {
  return makePsxTexture(256, 256, (ctx, w, h) => {
    const rng = randomFrom(303);
    // Wrinkled, sweat-stained faded pink Surf-Miami thrift tee (no bib!)
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#9e626e');
    g.addColorStop(0.6, '#8f6858');
    g.addColorStop(1, '#3d5e62');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Faded sun & palm graphic
    ctx.fillStyle = 'rgba(214,178,96,0.45)';
    ctx.beginPath();
    ctx.arc(w * 0.5, 112, 36, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(24,20,26,0.62)';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SURF MIAMI', w * 0.5, 164);

    // Dark backpack shoulder-strap wear marks & grease smudges
    ctx.fillStyle = 'rgba(22,16,14,0.48)';
    ctx.fillRect(54, 0, 18, h);
    ctx.fillRect(w - 72, 0, 18, h);
    for (let i = 0; i < 36; i++) {
      ctx.fillStyle = 'rgba(24,16,12,0.28)';
      ctx.fillRect(rng() * w, rng() * h, 4 + rng() * 14, 3 + rng() * 8);
    }
  });
}

export function haukeRingerTeeTexture() {
  return makePsxTexture(256, 256, (ctx, w, h) => {
    const rng = randomFrom(404);
    // Stretched heavy off-white cotton tee with forest-green collar
    ctx.fillStyle = '#c8c4ba';
    ctx.fillRect(0, 0, w, h);

    // Sweat & grime shading
    const sweat = ctx.createRadialGradient(w * 0.5, 42, 10, w * 0.5, 92, 110);
    sweat.addColorStop(0, 'rgba(72,66,54,0.42)');
    sweat.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sweat;
    ctx.fillRect(0, 0, w, h);

    // Forest-green ringer collar & sleeve cuffs
    ctx.fillStyle = '#143b2a';
    ctx.fillRect(0, 0, w, 28);

    // Stretched chest fabric tension folds
    for (let i = 0; i < 34; i++) {
      ctx.strokeStyle = 'rgba(64,62,58,0.28)';
      ctx.lineWidth = 2 + rng() * 3;
      ctx.beginPath();
      const y = 36 + rng() * (h - 46);
      ctx.moveTo(32, y);
      ctx.lineTo(w - 32, y + (rng() - 0.5) * 18);
      ctx.stroke();
    }
  });
}

export function duckSuitClothTexture() {
  return makePsxTexture(256, 256, (ctx, w, h) => {
    const rng = randomFrom(505);
    // Filthy, matted, grease-stained mustard-yellow mascot costume fabric
    ctx.fillStyle = '#9c7b1e';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = rng() > 0.46 ? 'rgba(28,20,6,0.30)' : 'rgba(186,152,48,0.18)';
      ctx.fillRect(rng() * w, rng() * h, 2 + rng() * 6, 2 + rng() * 6);
    }

    // Heavy black oil/mold hem stains & stitched vertical mascot seam
    const grime = ctx.createLinearGradient(0, h * 0.65, 0, h);
    grime.addColorStop(0, 'rgba(16,12,6,0)');
    grime.addColorStop(1, 'rgba(16,12,6,0.72)');
    ctx.fillStyle = grime;
    ctx.fillRect(0, h * 0.65, w, h * 0.35);

    ctx.strokeStyle = '#221808';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, 0);
    ctx.lineTo(w * 0.5, h);
    ctx.stroke();
    for (let y = 10; y < h; y += 16) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5 - 8, y);
      ctx.lineTo(w * 0.5 + 8, y + 3);
      ctx.stroke();
    }
  });
}
