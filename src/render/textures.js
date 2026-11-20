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
          grad.addColorStop(0, '#181a26');
          grad.addColorStop(1, '#0e1018');
        } else {
          grad.addColorStop(0, '#e8dec8');
          grad.addColorStop(1, '#bfb39b');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, tile, tile);

        ctx.strokeStyle = dark ? '#07080d' : '#857a66';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 1.5, y + 1.5, tile - 3, tile - 3);

        // Glazed ceramic sheen highlight
        ctx.fillStyle = dark ? 'rgba(255,235,200,0.05)' : 'rgba(255,252,244,0.28)';
        ctx.fillRect(x + 6, y + 6, tile - 12, 5);
      }
    }
    for (let i = 0; i < 320; i++) {
      ctx.fillStyle = rng() > 0.45 ? 'rgba(10,8,6,0.18)' : 'rgba(196,138,64,0.10)';
      ctx.fillRect(Math.floor(rng() * size), Math.floor(rng() * size), 2 + Math.floor(rng() * 9), 2 + Math.floor(rng() * 7));
    }
  }, { repeat: true });
}

export function wallPanelTexture() {
  return makeCanvasTexture(512, 512, (ctx, size) => {
    const rng = randomFrom(808);
    // Upper wall: warm vintage diner ceramic tile glaze (replaces gloomy submarine navy!)
    const upper = ctx.createLinearGradient(0, 0, 0, 248);
    upper.addColorStop(0, '#2c2220');
    upper.addColorStop(0.55, '#42332d');
    upper.addColorStop(1, '#2f2420');
    ctx.fillStyle = upper;
    ctx.fillRect(0, 0, size, 248);

    // Subtle subway tile grid on upper diner wall
    ctx.strokeStyle = 'rgba(18, 12, 10, 0.36)';
    ctx.lineWidth = 2;
    for (let y = 0; y < 240; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
      const offset = ((y / 32) % 2) * 32;
      for (let x = offset; x < size; x += 64) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 32); ctx.stroke();
      }
    }

    // Lower wainscot: rich dark walnut/mahogany diner wood paneling
    const lower = ctx.createLinearGradient(0, 326, 0, size);
    lower.addColorStop(0, '#261a17');
    lower.addColorStop(1, '#130d0c');
    ctx.fillStyle = lower;
    ctx.fillRect(0, 326, size, size - 326);

    for (let x = 0; x < size; x += 48) {
      ctx.fillStyle = 'rgba(0,0,0,0.36)';
      ctx.fillRect(x, 326, 4, size - 326);
      ctx.fillStyle = 'rgba(255,210,160,0.05)';
      ctx.fillRect(x + 4, 326, 2, size - 326);
    }

    // Iconic FNaF 1 3-row Red / White / Black Checkered Diner Frieze + Brass Trim!
    const bandY = 236;
    ctx.fillStyle = '#090a10';
    ctx.fillRect(0, bandY - 8, size, 96);
    const sq = 24;
    for (let row = 0; row < 3; row++) {
      for (let x = 0; x < size; x += sq) {
        const colIdx = (Math.floor(x / sq) + row) % 2;
        if (row === 1) {
          ctx.fillStyle = colIdx === 0 ? '#d8283c' : '#11121a';
        } else {
          ctx.fillStyle = colIdx === 0 ? '#f4ebd8' : '#11121a';
        }
        ctx.fillRect(x, bandY + row * sq, sq, sq);
      }
    }
    // Brass & Crimson molding rails
    ctx.fillStyle = '#ffbf52';
    ctx.fillRect(0, bandY - 7, size, 5);
    ctx.fillStyle = '#e02f44';
    ctx.fillRect(0, bandY + 74, size, 6);
    ctx.fillStyle = '#ffbf52';
    ctx.fillRect(0, bandY + 80, size, 3);

    // Late-night Imbiss grime drips & baseboard
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.fillRect(Math.floor(rng() * size), Math.floor(rng() * size), 2 + Math.floor(rng() * 6), 8 + Math.floor(rng() * 24));
    }
    ctx.fillStyle = '#090a10';
    ctx.fillRect(0, size - 30, size, 30);
  }, { repeat: true });
}

export function deskWoodTexture() {
  return makeCanvasTexture(256, 256, (ctx, size) => {
    const rng = randomFrom(912);
    ctx.fillStyle = '#523423';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 4) {
      ctx.fillStyle = rng() > 0.5 ? 'rgba(28,15,9,0.26)' : 'rgba(154,104,68,0.16)';
      ctx.fillRect(0, y, size, 2 + Math.floor(rng() * 3));
    }
    ctx.strokeStyle = 'rgba(26,12,6,0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(185, 110, 20, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,235,200,0.10)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 24; i++) {
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
    ctx.fillStyle = '#384154';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size - 38; y += 20) {
      const g = ctx.createLinearGradient(0, y, 0, y + 20);
      g.addColorStop(0, '#62708c');
      g.addColorStop(0.25, '#455068');
      g.addColorStop(0.85, '#262d3d');
      g.addColorStop(1, '#121620');
      ctx.fillStyle = g;
      ctx.fillRect(0, y, size, 20);
      // Side rivets
      ctx.fillStyle = 'rgba(220,232,250,0.35)';
      ctx.beginPath();
      ctx.arc(12, y + 10, 2.5, 0, TAU);
      ctx.arc(size - 12, y + 10, 2.5, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(215,230,255,0.16)';
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      const x = rng() * size;
      const y = rng() * (size - 44);
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() - 0.5) * 34, y + (rng() - 0.5) * 12);
      ctx.stroke();
    }
    // Stencil warning plate
    ctx.fillStyle = 'rgba(12, 15, 22, 0.72)';
    ctx.fillRect(36, 104, size - 72, 34);
    ctx.strokeStyle = '#ffbf52';
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 104, size - 72, 34);
    ctx.fillStyle = '#ffcf56';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('STAHLTÜR · 8.4', size * 0.5, 126);

    // Bottom yellow-black hazard stripe
    ctx.fillStyle = '#f5b836';
    ctx.fillRect(0, size - 36, size, 36);
    ctx.fillStyle = '#141720';
    for (let x = -40; x < size + 40; x += 34) {
      ctx.beginPath();
      ctx.moveTo(x, size);
      ctx.lineTo(x + 17, size);
      ctx.lineTo(x + 34, size - 36);
      ctx.lineTo(x + 17, size - 36);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#0c0e14';
    ctx.fillRect(0, size - 38, size, 4);
  });
}

function drawCrownIcon(ctx, cx, cy, s = 1) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.fillStyle = '#ffbf52';
  ctx.strokeStyle = '#382208';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-28, 12);
  ctx.lineTo(-24, -14);
  ctx.lineTo(-10, 0);
  ctx.lineTo(0, -20);
  ctx.lineTo(10, 0);
  ctx.lineTo(24, -14);
  ctx.lineTo(28, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff3550';
  ctx.beginPath();
  ctx.arc(0, -1, 4.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function posterTexture(isGolden = false) {
  return makeCanvasTexture(320, 420, (ctx, w, h) => {
    if (isGolden) {
      const bg = ctx.createRadialGradient(w * 0.5, h * 0.44, 18, w * 0.5, h * 0.5, 220);
      bg.addColorStop(0, '#362008');
      bg.addColorStop(1, '#070504');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#ffcf4d';
      ctx.lineWidth = 8;
      ctx.strokeRect(10, 10, w - 20, h - 20);

      // Slumped Golden Duck with crooked purple-band top hat!
      ctx.save();
      ctx.translate(w * 0.5, 182);
      ctx.rotate(-0.18);
      ctx.fillStyle = '#e5b322';
      ctx.beginPath();
      ctx.arc(0, 0, 74, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#4a3206';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Top hat
      ctx.fillStyle = '#14111c';
      ctx.fillRect(-46, -78, 92, 12);
      ctx.fillRect(-30, -124, 60, 48);
      ctx.fillStyle = '#9b4dff';
      ctx.fillRect(-30, -88, 60, 10);

      // Hollow black sockets + eerie pinpricks
      ctx.fillStyle = '#030306';
      ctx.beginPath();
      ctx.arc(-28, -10, 20, 0, TAU);
      ctx.arc(28, -10, 20, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-30, -12, 5, 5);
      ctx.fillRect(26, -12, 5, 5);

      // Slack open orange bill
      ctx.fillStyle = '#180c08';
      ctx.beginPath();
      ctx.ellipse(0, 34, 42, 24, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#e8611a';
      ctx.beginPath();
      ctx.ellipse(0, 22, 46, 16, 0, 0, TAU);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#ff3550';
      ctx.font = 'bold 34px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ES BIN ICH', w * 0.5, 336);
      ctx.fillStyle = '#ffda38';
      ctx.font = 'bold 26px monospace';
      ctx.fillText('AKTE 1987', w * 0.5, 378);
      return;
    }

    // FNaF 1 "CELEBRATE!" Homage Group Poster featuring Anton, Chef Torge & Tom!
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#241828');
    bg.addColorStop(0.6, '#141829');
    bg.addColorStop(1, '#0c0e18');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Stage spotlight cones!
    for (const [sx, col] of [[75, 'rgba(204,232,56,0.16)'], [160, 'rgba(255,191,82,0.22)'], [245, 'rgba(245,179,200,0.16)']]) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(sx, 54);
      ctx.lineTo(sx - 68, 340);
      ctx.lineTo(sx + 68, 340);
      ctx.closePath();
      ctx.fill();
    }

    // Confetti stars
    ctx.fillStyle = 'rgba(255, 207, 86, 0.55)';
    for (const [cx, cy] of [[36, 98], [282, 106], [48, 152], [272, 162], [116, 92], [206, 90]]) {
      ctx.fillRect(cx, cy, 5, 5);
    }

    // Left Mascot: Lost Anton (hoodie + headphones + wide eyes)
    ctx.save();
    ctx.translate(68, 226);
    ctx.fillStyle = '#1b1f2c';
    ctx.beginPath(); ctx.roundRect(-36, 30, 72, 75, 14); ctx.fill();
    ctx.fillStyle = '#cce838';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('404?', 0, 62);
    // Headphones
    ctx.strokeStyle = '#38c8ff';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(0, -2, 34, Math.PI, TAU); ctx.stroke();
    ctx.fillStyle = '#ebd2be';
    ctx.beginPath(); ctx.roundRect(-28, -26, 56, 56, 16); ctx.fill();
    ctx.fillStyle = '#6c4c32';
    ctx.beginPath(); ctx.roundRect(-28, -32, 56, 20, 10); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-11, -2, 8, 0, TAU); ctx.arc(11, -2, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff2948';
    ctx.beginPath(); ctx.arc(-11, -2, 3.5, 0, TAU); ctx.arc(11, -2, 3.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#151822';
    ctx.fillRect(-10, 14, 20, 8);
    ctx.restore();

    // Right Mascot: Schnorrer Tom (backwards cap + Surf tee + buck teeth)
    ctx.save();
    ctx.translate(252, 230);
    ctx.fillStyle = '#f5b3c8';
    ctx.beginPath(); ctx.roundRect(-36, 28, 72, 75, 14); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 42, 22, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#ebd2bc';
    ctx.beginPath(); ctx.roundRect(-28, -24, 56, 52, 16); ctx.fill();
    ctx.fillStyle = '#dcc89a';
    ctx.beginPath(); ctx.roundRect(-30, -34, 60, 20, 10); ctx.fill();
    ctx.fillStyle = '#3a281c';
    ctx.beginPath(); ctx.arc(0, -18, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-11, -2, 8, 0, TAU); ctx.arc(11, -2, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#24c98b';
    ctx.beginPath(); ctx.arc(-11, -2, 3.5, 0, TAU); ctx.arc(11, -2, 3.5, 0, TAU); ctx.fill();
    // Buck teeth grin
    ctx.fillStyle = '#151822';
    ctx.fillRect(-13, 12, 26, 9);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-6, 12, 5, 6);
    ctx.fillRect(1, 12, 5, 6);
    ctx.restore();

    // Center Hero Mascot: Chef Torge (Crown + Cap + Rosy Cheeks + Clickable Red Nose!)
    ctx.save();
    ctx.translate(160, 202);
    ctx.fillStyle = '#c82333';
    ctx.beginPath(); ctx.roundRect(-56, 42, 112, 92, 20); ctx.fill();
    ctx.fillStyle = '#f8f5ec';
    ctx.fillRect(-30, 42, 60, 92);
    ctx.strokeStyle = '#ffbf52';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 50, 22, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();

    drawCrownIcon(ctx, 0, -64, 1.15);
    ctx.fillStyle = '#144c38';
    ctx.beginPath(); ctx.ellipse(0, -38, 46, 20, 0, Math.PI, TAU); ctx.fill();
    ctx.fillRect(-46, -40, 92, 12);

    ctx.fillStyle = '#20161e';
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath(); ctx.arc(i * 12, -26, 10, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#f2d7bf';
    ctx.beginPath(); ctx.roundRect(-42, -24, 84, 70, 20); ctx.fill();
    // Toy-Animatronic rosy cheeks!
    ctx.fillStyle = 'rgba(255, 65, 85, 0.65)';
    ctx.beginPath(); ctx.arc(-28, 16, 9, 0, TAU); ctx.arc(28, 16, 9, 0, TAU); ctx.fill();
    // Mascot eyes
    ctx.fillStyle = '#111420';
    ctx.beginPath(); ctx.arc(-17, 2, 11, 0, TAU); ctx.arc(17, 2, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-17, 2, 8.5, 0, TAU); ctx.arc(17, 2, 8.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2da8ff';
    ctx.beginPath(); ctx.arc(-17, 2, 4.5, 0, TAU); ctx.arc(17, 2, 4.5, 0, TAU); ctx.fill();
    // Iconic Honkable Shiny Red Nose!
    ctx.fillStyle = '#ff3b2f';
    ctx.beginPath(); ctx.arc(0, 14, 10, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd6cf';
    ctx.beginPath(); ctx.arc(-3, 11, 3.2, 0, TAU); ctx.fill();
    // Animatronic toothed smile
    ctx.fillStyle = '#16121a';
    ctx.beginPath(); ctx.roundRect(-20, 28, 40, 12, 5); ctx.fill();
    ctx.fillStyle = '#f7f4ea';
    for (let tx = -15; tx <= 11; tx += 7) ctx.fillRect(tx, 29, 5, 5);
    ctx.restore();

    // Bold Header & Footer Banners
    ctx.strokeStyle = '#ffbf52';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    ctx.fillStyle = '#d62839';
    ctx.fillRect(18, 18, w - 36, 46);
    ctx.fillStyle = '#fff7e2';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FEIERABEND!', w * 0.5, 50);

    ctx.fillStyle = '#0c0e18';
    ctx.fillRect(18, 336, w - 36, 64);
    ctx.fillStyle = '#ffcf56';
    ctx.font = 'bold 21px monospace';
    ctx.fillText("TORGE'S NACHT-IMBISS", w * 0.5, 364);
    ctx.fillStyle = '#38f2af';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('NASE DRÜCKEN FÜR GLÜCK! [H]', w * 0.5, 388);
  });
}

export function rulesPosterTexture(corrupted = false) {
  return makeCanvasTexture(256, 340, (ctx, w, h) => {
    ctx.fillStyle = '#f3ead4';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#25201e';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.fillStyle = '#c82333';
    ctx.fillRect(18, 18, w - 36, 38);
    ctx.fillStyle = '#fff9ec';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HAUSORDNUNG', w * 0.5, 44);

    ctx.font = 'bold 11.5px monospace';
    ctx.textAlign = 'left';
    const rules = corrupted
      ? [
          '1. KEIN SPEZI SCHNORREN',
          '2. HÖRE AUF DIE SCHRITTE!',
          '3. HAUKES VORHANG PRÜFEN',
          '4. CAM 4B FESTHALTEN!!',
          '5. VENTIL DREHEN = LAUT!',
          '6. SIE SIND SCHON HIER',
          '7. NICHT EINSCHLAFEN',
          '8. ES BIN ICH · 1987',
        ]
      : [
          '1. KEIN SPEZI SCHNORREN',
          '2. AUF SCHRITTE ACHTEN!',
          '3. HAUKE AUF CAM 1C PRÜFEN',
          '4. ANTONS ANRUF WEGDRÜCKEN',
          '5. VENTIL (V) BEI HITZE',
          '6. BONS (T) SCHNELL STEMPELN',
          '7. CAM 6 GONG (B) IST GRATIS',
          '8. POSTER NICHT HUPEN!',
        ];
    rules.forEach((line, i) => {
      ctx.fillStyle = (corrupted && i >= 5) ? '#c81e32' : '#1e1b1a';
      ctx.fillText(line, 20, 82 + i * 27);
    });

    ctx.fillStyle = '#c82333';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('— CHEF TORGE —', w * 0.5, 316);
  });
}

export function speziWrapTexture() {
  return makeCanvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#2b130d';
    ctx.fillRect(0, 0, w, h);

    // Iconic retro wavy sunset stripes!
    const stripes = [
      ['#ffda38', 58, 36],
      ['#ff881c', 94, 38],
      ['#e82c64', 132, 38],
      ['#8c28b4', 170, 34],
    ];
    for (const [col, y0, sh] of stripes) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, y0);
      for (let x = 0; x <= w; x += 16) {
        ctx.lineTo(x, y0 + Math.sin((x / w) * TAU) * 10);
      }
      for (let x = w; x >= 0; x -= 16) {
        ctx.lineTo(x, y0 + sh + Math.sin((x / w) * TAU) * 10);
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#160b10';
    ctx.fillRect(36, 92, w - 72, 54);
    ctx.strokeStyle = '#ffda38';
    ctx.lineWidth = 3;
    ctx.strokeRect(36, 92, w - 72, 54);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SPEZI', w * 0.5, 124);
    ctx.fillStyle = '#ffda38';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('KOFFEIN-KICK [C]', w * 0.5, 140);
  });
}

export function torgeApronTexture() {
  return makeCanvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f6f2e8';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d4cbb8';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    drawCrownIcon(ctx, w * 0.5, 62, 1.0);
    ctx.fillStyle = '#bc1e2c';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CHEF TORGE', w * 0.5, 114);
    ctx.fillStyle = '#154c38';
    ctx.fillRect(34, 128, w - 68, 30);
    ctx.fillStyle = '#ffdf78';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('MIT SCHARF!', w * 0.5, 149);

    // Goofy chili/garlic sauce splatters!
    ctx.fillStyle = 'rgba(204, 38, 28, 0.55)';
    ctx.beginPath(); ctx.arc(64, 198, 12, 0, TAU); ctx.arc(80, 210, 6, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(235, 180, 65, 0.5)';
    ctx.beginPath(); ctx.arc(192, 186, 10, 0, TAU); ctx.fill();
  });
}

export function antonShirtTexture() {
  return makeCanvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#181b26';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(204, 232, 56, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(w * 0.5, 106, 52, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(w * 0.5, 106, 30, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#cce838';
    ctx.font = 'bold 34px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('404', w * 0.5, 112);
    ctx.font = 'bold 17px monospace';
    ctx.fillText('WO AUSGANG?!', w * 0.5, 138);
    ctx.fillStyle = '#73d7ff';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('LOST ANTON', w * 0.5, 186);
  });
}

export function antonPhoneTexture() {
  return makeCanvasTexture(128, 220, (ctx, w, h) => {
    ctx.fillStyle = '#0d1924';
    ctx.fillRect(0, 0, w, h);
    // Map roads
    ctx.strokeStyle = '#243c52';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(16, 20); ctx.lineTo(96, 120); ctx.lineTo(32, 180);
    ctx.moveTo(110, 35); ctx.lineTo(20, 130);
    ctx.stroke();
    // Lost blue route line spinning in circles!
    ctx.strokeStyle = '#38d6ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(64, 96, 28, 0, Math.PI * 1.65);
    ctx.stroke();
    // Red GPS pin
    ctx.fillStyle = '#ff3550';
    ctx.beginPath(); ctx.arc(64, 96, 9, 0, TAU); ctx.fill();
    // Top notification pill
    ctx.fillStyle = '#17382c';
    ctx.fillRect(8, 10, w - 16, 30);
    ctx.fillStyle = '#38f2af';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ROUTE NEU...', w * 0.5, 29);
    // Call buttons at bottom
    ctx.fillStyle = '#2bd97c';
    ctx.beginPath(); ctx.arc(38, 188, 14, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff3550';
    ctx.beginPath(); ctx.arc(90, 188, 14, 0, TAU); ctx.fill();
  });
}

export function tomShirtTexture() {
  return makeCanvasTexture(256, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#ff7b89');
    g.addColorStop(0.55, '#ffae70');
    g.addColorStop(1, '#26b8b0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Sunset circle
    ctx.fillStyle = '#ffe66d';
    ctx.beginPath(); ctx.arc(w * 0.5, 118, 46, 0, TAU); ctx.fill();
    // Ocean stripes
    ctx.fillStyle = '#177e89';
    for (let y = 148; y < h; y += 18) {
      ctx.fillRect(0, y, w, 8);
    }
    // Palm silhouettes
    ctx.fillStyle = '#1c1624';
    ctx.fillRect(52, 86, 8, 90);
    ctx.fillRect(194, 94, 8, 86);
    for (const px of [56, 198]) {
      for (const a of [-2.4, -1.8, -1.1, -0.5, 0.2]) {
        ctx.beginPath();
        ctx.ellipse(px + Math.cos(a) * 22, 88 + Math.sin(a) * 10, 22, 5, a, 0, TAU);
        ctx.fill();
      }
    }
  });
}

export function tomBibTexture() {
  return makeCanvasTexture(192, 192, (ctx, w, h) => {
    ctx.fillStyle = '#fcf9f0';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ffbf52';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    // Confetti triangles (classic FNaF 1 Chica bib homage!)
    const cols = ['#ff3550', '#38d6ff', '#a855f7', '#22c55e', '#ff9f1c'];
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = cols[i % cols.length];
      const cx = 20 + ((i * 47) % (w - 40));
      const cy = 22 + ((i * 67) % (h - 44));
      ctx.beginPath();
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx + 6, cy + 5);
      ctx.lineTo(cx - 6, cy + 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#d91e36';
    ctx.font = 'bold 23px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GRATIS', w * 0.5, 84);
    ctx.fillStyle = '#7c22ce';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('SPEZI?!', w * 0.5, 116);
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('HAST DU 2 EURO?', w * 0.5, 148);
  });
}

export function arcadeScreenTexture() {
  return makeCanvasTexture(160, 160, (ctx, w, h) => {
    ctx.fillStyle = '#091428';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(28, 0, 20, 52);
    ctx.fillRect(28, 96, 20, 64);
    ctx.fillRect(108, 0, 20, 74);
    ctx.fillRect(108, 118, 20, 42);
    // Pixel duck
    ctx.fillStyle = '#ffda38';
    ctx.fillRect(66, 68, 22, 18);
    ctx.fillStyle = '#ff6b22';
    ctx.fillRect(86, 74, 10, 6);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText("FLAPPY ENTE '87", w * 0.5, 22);
    ctx.fillStyle = '#ffcf56';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('HI: HAUKE 9990', w * 0.5, 148);
  }, { nearest: true });
}

export function menuBoardTexture() {
  return makeCanvasTexture(320, 160, (ctx, w, h) => {
    ctx.fillStyle = '#141118';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ffbf52';
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
      ctx.fillStyle = '#f6efe0';
      ctx.fillText(name, 18, y);
      ctx.fillStyle = i === 3 ? '#ff3b56' : '#38f2af';
      ctx.textAlign = 'right';
      ctx.fillText(price, w - 18, y);
      ctx.textAlign = 'left';
    });
  });
}

export function neonSignTexture(line1, line2, color1 = '#ff3b56', color2 = '#38f2af') {
  return makeCanvasTexture(288, 96, (ctx, w, h) => {
    ctx.fillStyle = '#09070c';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = color1;
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    ctx.textAlign = 'center';
    ctx.shadowColor = color1;
    ctx.shadowBlur = 14;
    ctx.fillStyle = color1;
    ctx.font = 'bold 26px monospace';
    ctx.fillText(line1, w * 0.5, 42);

    ctx.shadowColor = color2;
    ctx.shadowBlur = 10;
    ctx.fillStyle = color2;
    ctx.font = 'bold 17px monospace';
    ctx.fillText(line2, w * 0.5, 74);
  });
}

export function coveSignTexture(angry = false) {
  return makeCanvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = angry ? '#2b0910' : '#241a15';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = angry ? '#ff3b56' : '#ffbf52';
    ctx.lineWidth = 7;
    ctx.strokeRect(7, 7, w - 14, h - 14);
    ctx.textAlign = 'center';
    if (angry) {
      ctx.fillStyle = '#ff3b56';
      ctx.font = 'bold 28px monospace';
      ctx.fillText('WO IST MEIN', w * 0.5, 54);
      ctx.fillText('DÖNER?!!', w * 0.5, 96);
    } else {
      ctx.fillStyle = '#ffe49e';
      ctx.font = 'bold 24px monospace';
      ctx.fillText('AUSSER BETRIEB', w * 0.5, 54);
      ctx.fillStyle = '#d8c5a0';
      ctx.font = 'bold 17px monospace';
      ctx.fillText('HAUKES FRESSPAUSE', w * 0.5, 92);
    }
  });
}

export function steamGaugeDialTexture() {
  return makeCanvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = '#f6eedc';
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#26201c';
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
    ctx.fillStyle = '#faf4e6';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c9283e';
    ctx.fillRect(0, 0, w, 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NACHT-BON', w * 0.5, 19);

    ctx.fillStyle = '#1b1e28';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('EXPRESS +5%!', w * 0.5, 48);
    ctx.fillStyle = '#4a5268';
    for (let y = 64; y <= 136; y += 16) {
      ctx.fillRect(14, y, w - 28, 5);
    }
    ctx.fillStyle = '#198754';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('[T] STEMPELN', w * 0.5, 166);
    ctx.fillText('DYNAMO-BOOST', w * 0.5, 182);
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
    const activeBon = run.orders?.active;
    const isExpress = activeBon && (run.time - activeBon.createdAt <= 5.5);
    const sLvl = run.seismicLevel ?? 0;

    const ctx = this.sysCtx;
    ctx.fillStyle = '#061217';
    ctx.fillRect(0, 0, 160, 112);

    ctx.strokeStyle = 'rgba(56, 242, 175, 0.15)';
    ctx.lineWidth = 1;
    for (let y = 18; y < 112; y += 18) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(160, y); ctx.stroke();
    }

    ctx.fillStyle = '#73d7ff';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`IMBISS-OS · ${pwr}% AKKU`, 8, 15);

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(8, 21, 144, 10);
    ctx.fillStyle = pwr <= 20 ? '#ff3550' : '#38f2af';
    ctx.fillRect(8, 21, Math.round(1.44 * pwr), 10);

    ctx.fillStyle = heat >= 70 ? '#ff6b4a' : '#ffcf56';
    ctx.fillText(`FRITTEUSE: ${tempC}°C (${heat}%)`, 8, 47);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(8, 53, 144, 10);
    ctx.fillStyle = heat >= 75 ? '#ff3550' : heat >= 45 ? '#ffb84d' : '#38f2af';
    ctx.fillRect(8, 53, Math.round(1.44 * heat), 10);

    if (activeBon) {
      const blink = Math.sin(run.time * 14) > 0;
      ctx.fillStyle = isExpress ? (blink ? '#38f2af' : '#125c42') : (blink ? '#ffb84d' : '#7a4f10');
      ctx.fillRect(8, 74, 144, 28);
      ctx.fillStyle = blink ? '#080b12' : '#fff5d6';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(isExpress ? '>> EXPRESS BON [T]! <<' : '>> NEUER BON [T] <<', 10, 92);
    } else if ((run.speziBoostUntil ?? 0) > run.time) {
      ctx.fillStyle = 'rgba(255, 191, 82, 0.24)';
      ctx.fillRect(8, 74, 144, 28);
      ctx.fillStyle = '#ffda38';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('KOFFEIN-KICK AKTIV!', 14, 92);
    } else if (heat >= 45) {
      ctx.fillStyle = 'rgba(56, 242, 175, 0.18)';
      ctx.fillRect(8, 74, 144, 28);
      ctx.fillStyle = '#38f2af';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('DAMPFSTOSS BEREIT [G]', 12, 92);
    } else {
      ctx.fillStyle = '#8fa4b8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`SPEZI: ${run.speziCharges ?? 0}/2 [C]`, 12, 92);
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

export { getCharacterPortraitUrl } from './portraits.js';
