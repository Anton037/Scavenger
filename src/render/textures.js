import * as THREE from 'three';
import { randomFrom, TAU } from './primitives.js';

export function makeCanvasTexture(w, h, drawFn, { repeat = false, nearest = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = !nearest;
  drawFn(ctx, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
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

export function checkerFloorTexture() {
  return makeCanvasTexture(512, 512, (ctx, size) => {
    const rng = randomFrom(404);
    const tile = 128;
    for (let y = 0; y < size; y += tile) {
      for (let x = 0; x < size; x += tile) {
        const dark = ((x / tile) + (y / tile)) % 2 === 0;
        const grad = ctx.createLinearGradient(x, y, x + tile, y + tile);
        if (dark) {
          grad.addColorStop(0, '#191e2f');
          grad.addColorStop(1, '#0e111b');
        } else {
          grad.addColorStop(0, '#a6b0c8');
          grad.addColorStop(1, '#7e88a0');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, tile, tile);

        ctx.strokeStyle = dark ? '#06070c' : '#535b70';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 1.5, y + 1.5, tile - 3, tile - 3);
        ctx.fillStyle = dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.18)';
        ctx.fillRect(x + 5, y + 5, tile - 10, 4);
      }
    }
    for (let i = 0; i < 360; i++) {
      ctx.fillStyle = rng() > 0.42 ? 'rgba(6,8,14,0.22)' : 'rgba(188,142,72,0.12)';
      ctx.fillRect(Math.floor(rng() * size), Math.floor(rng() * size), 3 + Math.floor(rng() * 10), 3 + Math.floor(rng() * 8));
    }
  }, { repeat: true });
}

export function wallPanelTexture() {
  return makeCanvasTexture(512, 512, (ctx, size) => {
    const rng = randomFrom(808);
    const upper = ctx.createLinearGradient(0, 0, 0, size);
    upper.addColorStop(0, '#181d2c');
    upper.addColorStop(0.48, '#262d42');
    upper.addColorStop(1, '#131722');
    ctx.fillStyle = upper;
    ctx.fillRect(0, 0, size, size);

    for (let x = 0; x < size; x += 64) {
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.fillRect(x, 0, 5, size);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(x + 5, 0, 3, size);
      for (const ry of [38, 210, 340, 460]) {
        ctx.fillStyle = 'rgba(180,196,225,0.22)';
        ctx.beginPath();
        ctx.arc(x + 14, ry, 3, 0, TAU);
        ctx.fill();
      }
    }

    const bandY = 244;
    ctx.fillStyle = '#0a0c13';
    ctx.fillRect(0, bandY - 10, size, 84);
    for (let x = 0; x < size; x += 32) {
      const alt = (x / 32) % 2 === 0;
      ctx.fillStyle = alt ? '#efe7d6' : '#10121c';
      ctx.fillRect(x, bandY, 32, 32);
      ctx.fillStyle = alt ? '#10121c' : '#c9283e';
      ctx.fillRect(x, bandY + 32, 32, 32);
    }
    ctx.fillStyle = '#d42b42';
    ctx.fillRect(0, bandY - 7, size, 5);
    ctx.fillStyle = '#ffb84d';
    ctx.fillRect(0, bandY + 66, size, 4);

    for (let i = 0; i < 220; i++) {
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.fillRect(Math.floor(rng() * size), Math.floor(rng() * size), 3 + Math.floor(rng() * 7), 8 + Math.floor(rng() * 26));
    }
    ctx.fillStyle = '#0b0d14';
    ctx.fillRect(0, size - 34, size, 34);
  }, { repeat: true });
}

export function deskWoodTexture() {
  return makeCanvasTexture(256, 256, (ctx, size) => {
    const rng = randomFrom(912);
    ctx.fillStyle = '#483024';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 4) {
      ctx.fillStyle = rng() > 0.5 ? 'rgba(26,14,9,0.24)' : 'rgba(128,88,62,0.15)';
      ctx.fillRect(0, y, size, 2 + Math.floor(rng() * 3));
    }
    ctx.strokeStyle = 'rgba(24,12,7,0.42)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(185, 110, 22, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,235,200,0.09)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 26; i++) {
      const sx = rng() * size;
      const sy = rng() * size;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (rng() - 0.5) * 42, sy + (rng() - 0.5) * 10);
      ctx.stroke();
    }
  }, { repeat: true });
}

export function shutterTexture() {
  return makeCanvasTexture(256, 256, (ctx, size) => {
    const rng = randomFrom(701);
    ctx.fillStyle = '#363f54';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size - 36; y += 22) {
      const g = ctx.createLinearGradient(0, y, 0, y + 22);
      g.addColorStop(0, '#525e7a');
      g.addColorStop(0.2, '#3d4860');
      g.addColorStop(0.85, '#242b3b');
      g.addColorStop(1, '#121620');
      ctx.fillStyle = g;
      ctx.fillRect(0, y, size, 22);
    }
    ctx.strokeStyle = 'rgba(215,230,255,0.18)';
    for (let i = 0; i < 48; i++) {
      ctx.beginPath();
      const x = rng() * size;
      const y = rng() * (size - 40);
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() - 0.5) * 34, y + (rng() - 0.5) * 14);
      ctx.stroke();
    }
    ctx.fillStyle = '#f5b836';
    ctx.fillRect(0, size - 34, size, 34);
    ctx.fillStyle = '#141720';
    for (let x = -40; x < size + 40; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, size);
      ctx.lineTo(x + 18, size);
      ctx.lineTo(x + 34, size - 34);
      ctx.lineTo(x + 16, size - 34);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#0c0e14';
    ctx.fillRect(0, size - 36, size, 4);
  });
}

export function posterTexture(isGolden = false) {
  return makeCanvasTexture(256, 340, (ctx, w, h) => {
    if (isGolden) {
      const bg = ctx.createRadialGradient(w * 0.5, h * 0.45, 20, w * 0.5, h * 0.5, 190);
      bg.addColorStop(0, '#2a1808');
      bg.addColorStop(1, '#090604');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#ffcf4d';
      ctx.lineWidth = 8;
      ctx.strokeRect(8, 8, w - 16, h - 16);

      ctx.fillStyle = '#f5c72c';
      ctx.beginPath();
      ctx.arc(w * 0.5, 145, 68, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#d99e1a';
      ctx.beginPath();
      ctx.ellipse(w * 0.5, 192, 78, 36, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#e8611a';
      ctx.beginPath();
      ctx.ellipse(w * 0.5, 175, 42, 18, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#050508';
      ctx.beginPath();
      ctx.arc(98, 132, 18, 0, TAU);
      ctx.arc(158, 132, 18, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(96, 130, 5, 5);
      ctx.fillRect(156, 130, 5, 5);

      ctx.fillStyle = '#ff3550';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ES BIN ICH', w * 0.5, 272);
      ctx.fillStyle = '#ffda38';
      ctx.font = 'bold 24px monospace';
      ctx.fillText('QUAAAK', w * 0.5, 308);
      return;
    }

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#1e243b');
    bg.addColorStop(1, '#101321');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255, 184, 77, 0.11)';
    for (let i = 0; i < 12; i++) {
      const a = (i * TAU) / 12;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, 168);
      ctx.lineTo(w * 0.5 + Math.cos(a) * 180, 168 + Math.sin(a) * 180);
      ctx.lineTo(w * 0.5 + Math.cos(a + 0.14) * 180, 168 + Math.sin(a + 0.14) * 180);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = '#ffb84d';
    ctx.lineWidth = 7;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.fillStyle = '#d92f44';
    ctx.fillRect(16, 18, w - 32, 42);
    ctx.fillStyle = '#fff5dc';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FEIERABEND!', w * 0.5, 48);

    ctx.fillStyle = '#ffb84d';
    ctx.beginPath();
    ctx.moveTo(86, 100);
    ctx.lineTo(94, 70);
    ctx.lineTo(114, 86);
    ctx.lineTo(128, 64);
    ctx.lineTo(142, 86);
    ctx.lineTo(162, 70);
    ctx.lineTo(170, 100);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff3b56';
    ctx.beginPath();
    ctx.arc(128, 88, 6, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#154634';
    ctx.beginPath();
    ctx.ellipse(128, 114, 52, 22, 0, Math.PI, TAU);
    ctx.fill();
    ctx.fillRect(76, 112, 104, 12);
    ctx.fillStyle = '#1d161f';
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(128 + i * 13, 128, 11, 0, TAU);
      ctx.fill();
    }

    ctx.fillStyle = '#f1d6be';
    ctx.beginPath();
    ctx.roundRect(84, 130, 88, 78, 22);
    ctx.fill();

    ctx.fillStyle = '#0e111c';
    ctx.beginPath();
    ctx.arc(107, 160, 11, 0, TAU);
    ctx.arc(149, 160, 11, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#73d7ff';
    ctx.beginPath();
    ctx.arc(107, 160, 4.5, 0, TAU);
    ctx.arc(149, 160, 4.5, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#ff5a3c';
    ctx.beginPath();
    ctx.arc(128, 177, 9, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffd2c4';
    ctx.beginPath();
    ctx.arc(125, 174, 3, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = '#331c24';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(128, 186, 16, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = '#c42736';
    ctx.beginPath();
    ctx.roundRect(52, 210, 152, 74, 18);
    ctx.fill();
    ctx.fillStyle = '#f2f5ff';
    ctx.fillRect(94, 210, 68, 74);
    ctx.strokeStyle = '#ffb84d';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(128, 216, 26, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = '#0b0d16';
    ctx.fillRect(16, 286, w - 32, 38);
    ctx.fillStyle = '#ffe082';
    ctx.font = 'bold 19px monospace';
    ctx.fillText("TORGE'S IMBISS", w * 0.5, 311);
  });
}

export function rulesPosterTexture() {
  return makeCanvasTexture(256, 340, (ctx, w, h) => {
    ctx.fillStyle = '#efe6cf';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#252836';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.fillStyle = '#c6283d';
    ctx.fillRect(18, 18, w - 36, 38);
    ctx.fillStyle = '#fff9ec';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HAUSORDNUNG', w * 0.5, 44);

    ctx.fillStyle = '#1d202b';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    const rules = [
      '1. KEIN SPEZI SCHNORREN',
      '2. KEINE ZWIEBELN AB 02:00',
      '3. HAUKES BUFFET MEIDEN!',
      '4. ANTONS ANRUFE WEGDRÜCKEN',
      '5. ROTES VENTIL (V) BEI HITZE',
      '6. NACHT-BONS (T) STEMPELN!',
      '7. IR-BLITZ (X) GEGEN STÖRUNG',
      '8. POSTER NICHT HUPEN!',
    ];
    rules.forEach((line, i) => {
      ctx.fillText(line, 20, 82 + i * 27);
    });

    ctx.fillStyle = '#c6283d';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('— DIE GESCHÄFTSLEITUNG —', w * 0.5, 316);
  });
}

export function menuBoardTexture() {
  return makeCanvasTexture(320, 160, (ctx, w, h) => {
    ctx.fillStyle = '#12151f';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ffb84d';
    ctx.lineWidth = 5;
    ctx.strokeRect(5, 5, w - 10, h - 10);

    ctx.fillStyle = '#ff3b56';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText("CHEF TORGE'S NACHTKARTE", w * 0.5, 32);

    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    const items = [
      ['DÖNER KOMPLETT', '9,50 €'],
      ['SPEZI EISKALT', '2,50 €'],
      ['POMMES SCHRANKE', '4,00 €'],
      ['HAUKES XXL-TELLER', 'AUSVERK.'],
    ];
    items.forEach(([name, price], i) => {
      const y = 62 + i * 24;
      ctx.fillStyle = '#f2ede0';
      ctx.fillText(name, 18, y);
      ctx.fillStyle = i === 3 ? '#ff3b56' : '#38f2af';
      ctx.textAlign = 'right';
      ctx.fillText(price, w - 18, y);
      ctx.textAlign = 'left';
    });
  });
}

export function neonSignTexture(line1, line2, color1 = '#ff3b56', color2 = '#38f2af') {
  return makeCanvasTexture(256, 96, (ctx, w, h) => {
    ctx.fillStyle = '#08090f';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = color1;
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    ctx.textAlign = 'center';
    ctx.shadowColor = color1;
    ctx.shadowBlur = 12;
    ctx.fillStyle = color1;
    ctx.font = 'bold 26px monospace';
    ctx.fillText(line1, w * 0.5, 42);

    ctx.shadowColor = color2;
    ctx.shadowBlur = 10;
    ctx.fillStyle = color2;
    ctx.font = 'bold 18px monospace';
    ctx.fillText(line2, w * 0.5, 74);
  });
}

export function coveSignTexture(angry = false) {
  return makeCanvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = angry ? '#2b0910' : '#261e18';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = angry ? '#ff3b56' : '#ffb84d';
    ctx.lineWidth = 7;
    ctx.strokeRect(7, 7, w - 14, h - 14);
    ctx.textAlign = 'center';
    if (angry) {
      ctx.fillStyle = '#ff3b56';
      ctx.font = 'bold 30px monospace';
      ctx.fillText('ER HAT', w * 0.5, 56);
      ctx.fillText('HUNGER!!', w * 0.5, 96);
    } else {
      ctx.fillStyle = '#ffe49e';
      ctx.font = 'bold 24px monospace';
      ctx.fillText('AUSSER BETRIEB', w * 0.5, 56);
      ctx.fillStyle = '#d8c5a0';
      ctx.font = 'bold 17px monospace';
      ctx.fillText('HAUKES FRESSPAUSE', w * 0.5, 92);
    }
  });
}

export function steamGaugeDialTexture() {
  return makeCanvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = '#f3ebd8';
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#262b38';
    ctx.lineWidth = 6;
    ctx.stroke();

    const zones = [
      [Math.PI * 0.75, Math.PI * 1.35, '#2fa866'],
      [Math.PI * 1.35, Math.PI * 1.85, '#e89d2c'],
      [Math.PI * 1.85, Math.PI * 2.25, '#df2941'],
    ];
    for (const [a0, a1, col] of zones) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(64, 64, 44, a0, a1);
      ctx.stroke();
    }
    ctx.fillStyle = '#1c202c';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DAMPF', 64, 46);
    ctx.font = 'bold 11px monospace';
    ctx.fillText('°C / BAR', 64, 96);
  });
}

export function receiptPaperTexture() {
  return makeCanvasTexture(128, 192, (ctx, w, h) => {
    ctx.fillStyle = '#f8f3e6';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c9283e';
    ctx.fillRect(0, 0, w, 26);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NACHT-BON', w * 0.5, 18);

    ctx.fillStyle = '#1b1e28';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('EXPRESS-ORDER', w * 0.5, 48);
    ctx.fillStyle = '#4a5268';
    for (let y = 64; y <= 136; y += 16) {
      ctx.fillRect(14, y, w - 28, 5);
    }
    ctx.fillStyle = '#198754';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('[T] STEMPELN', w * 0.5, 166);
    ctx.fillText('+STROM!', w * 0.5, 182);
  });
}

export function crtScreenTexture(variant = 'radar') {
  return makeCanvasTexture(128, 96, (ctx, w, h) => {
    ctx.fillStyle = variant === 'seismic' ? '#12080d' : '#08171c';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = variant === 'seismic' ? 'rgba(255,60,85,0.35)' : 'rgba(56,242,175,0.22)';
    ctx.lineWidth = 1;
    for (let x = 16; x < w; x += 16) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 16; y < h; y += 16) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.strokeStyle = variant === 'seismic' ? '#ff556c' : '#38f2af';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 4) {
      const y = h * 0.5 + Math.sin(x * 0.19) * (variant === 'seismic' ? 22 : 12) * Math.cos(x * 0.07);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = variant === 'seismic' ? '#ffcf56' : '#73d7ff';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(variant === 'seismic' ? 'SEISMOGRAPH' : 'CCTV SYS OK', 8, 16);
  });
}

export class LiveDeskDisplays {
  constructor() {
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
    if (!run) return;
    if (Math.abs(run.time - this.lastPaintAt) < 0.085) return;
    this.lastPaintAt = run.time;

    const heat = Math.round(run.thermal?.heat ?? 16);
    const tempC = Math.round(30 + heat * 0.7);
    const pwr = Math.ceil(run.power ?? 100);
    const hasBon = Boolean(run.orders?.active);
    const sLvl = run.seismicLevel ?? 0;

    const ctx = this.sysCtx;
    ctx.fillStyle = '#061217';
    ctx.fillRect(0, 0, 160, 112);

    ctx.strokeStyle = 'rgba(56, 242, 175, 0.16)';
    ctx.lineWidth = 1;
    for (let y = 18; y < 112; y += 18) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(160, y); ctx.stroke();
    }

    ctx.fillStyle = '#73d7ff';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`IMBISS-OS · ${pwr}% AKKU`, 8, 15);

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(8, 22, 144, 11);
    ctx.fillStyle = pwr <= 20 ? '#ff3550' : '#38f2af';
    ctx.fillRect(8, 22, Math.round(1.44 * pwr), 11);

    ctx.fillStyle = heat >= 70 ? '#ff6b4a' : '#ffcf56';
    ctx.fillText(`FRITTEUSE: ${tempC}°C (${heat}%)`, 8, 50);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(8, 56, 144, 11);
    ctx.fillStyle = heat >= 75 ? '#ff3550' : heat >= 45 ? '#ffb84d' : '#38f2af';
    ctx.fillRect(8, 56, Math.round(1.44 * heat), 11);

    if (hasBon) {
      const blink = Math.sin(run.time * 12) > 0;
      ctx.fillStyle = blink ? '#ffb84d' : '#7a4f10';
      ctx.fillRect(8, 76, 144, 26);
      ctx.fillStyle = blink ? '#0a0c12' : '#fff5d6';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('>> NEUER BON [T] <<', 14, 93);
    } else if (heat >= 45) {
      ctx.fillStyle = 'rgba(56, 242, 175, 0.18)';
      ctx.fillRect(8, 76, 144, 26);
      ctx.fillStyle = '#38f2af';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('DAMPFSTOSS BEREIT [G]', 12, 93);
    } else {
      ctx.fillStyle = '#8fa4b8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('SYSTEME NOMINAL', 12, 93);
    }
    this.sysTexture.needsUpdate = true;

    const wctx = this.waveCtx;
    wctx.fillStyle = sLvl > 0.4 ? '#1a070d' : '#0b0e18';
    wctx.fillRect(0, 0, 144, 96);
    wctx.strokeStyle = 'rgba(255,255,255,0.1)';
    wctx.beginPath();
    wctx.moveTo(0, 48);
    wctx.lineTo(144, 48);
    wctx.stroke();

    wctx.strokeStyle = sLvl > 0.45 ? '#ff3b56' : heat >= 70 ? '#ffb84d' : '#38f2af';
    wctx.lineWidth = 2.4;
    wctx.beginPath();
    const amp = 6 + sLvl * 34 + (heat / 100) * 6;
    const freq = 0.16 + sLvl * 0.25;
    for (let x = 0; x <= 144; x += 4) {
      const y = 48 + Math.sin(x * freq + run.time * 16) * Math.cos(x * 0.06 - run.time * 5) * amp;
      if (x === 0) wctx.moveTo(x, y);
      else wctx.lineTo(x, y);
    }
    wctx.stroke();

    wctx.fillStyle = sLvl > 0.45 ? '#ff7a8c' : '#ffcf56';
    wctx.font = 'bold 10px monospace';
    wctx.fillText(sLvl > 0.45 ? '!! BEBEN WEST !!' : 'SEISMO-MONITOR', 8, 14);
    this.waveTexture.needsUpdate = true;
  }
}
