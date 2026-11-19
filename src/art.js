import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const TAU = Math.PI * 2;
export const color = (hex) => new THREE.Color(hex);

export const PALETTE = {
  ink: 0x0b0c14,
  slate: 0x1f2438,
  ivory: 0xf4ebd9,
  brass: 0xffb84d,
  copper: 0xe07a47,
  jade: 0x38f2af,
  glacier: 0x73d7ff,
  lavender: 0xb85cff,
  vermilion: 0xff3b56,
  pink: 0xf2b5c6,
  khaki: 0xd9c79e,
  neonLime: 0xc8e838,
};

export const material = (hex, roughness = 0.56, metalness = 0.12, flat = false) => (
  new THREE.MeshStandardMaterial({
    color: hex,
    roughness,
    metalness,
    flatShading: flat,
  })
);

export const brassMaterial = (hex = PALETTE.brass) => (
  new THREE.MeshStandardMaterial({ color: hex, roughness: 0.28, metalness: 0.78 })
);

export const emissive = (hex) => new THREE.MeshBasicMaterial({ color: hex });
export const solid = new THREE.BoxGeometry(1, 1, 1);
export const round = new THREE.CylinderGeometry(1, 1, 1, 16);
export const tapered = new THREE.CylinderGeometry(0.76, 1, 1, 16);
export const orb = new THREE.SphereGeometry(1, 18, 14);
export const octa = new THREE.OctahedronGeometry(1, 0);
export const hoop = new THREE.TorusGeometry(1, 0.048, 8, 28);

export function randomFrom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function piece(parent, geometry, finish, x, y, z, sx = 1, sy = 1, sz = 1) {
  const object = new THREE.Mesh(geometry, finish);
  object.position.set(x, y, z);
  object.scale.set(sx, sy, sz);
  object.castShadow = !finish.isMeshBasicMaterial && !finish.transparent;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

export function band(parent, finish, x, y, z, radius) {
  const ring = piece(parent, hoop, finish, x, y, z, radius, radius, radius);
  ring.rotation.x = -Math.PI / 2;
  return ring;
}

export function batchScenery(scene, group) {
  const layers = new Map();
  group.updateMatrixWorld(true);
  group.traverse((object) => {
    if (!object.isMesh) return;
    const style = object.material;
    if (!layers.has(style)) layers.set(style, []);
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    layers.get(style).push(geometry);
  });
  for (const [style, parts] of layers) {
    const geometry = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    const surface = new THREE.Mesh(geometry, style);
    surface.castShadow = !style.isMeshBasicMaterial;
    surface.receiveShadow = true;
    scene.add(surface);
  }
}

function makeCanvasTexture(w, h, drawFn, { repeat = false, nearest = false } = {}) {
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
  return makeCanvasTexture(256, 256, (ctx, size) => {
    const rng = randomFrom(404);
    const tile = 64;
    for (let y = 0; y < size; y += tile) {
      for (let x = 0; x < size; x += tile) {
        const dark = ((x / tile) + (y / tile)) % 2 === 0;
        const grad = ctx.createLinearGradient(x, y, x + tile, y + tile);
        if (dark) {
          grad.addColorStop(0, '#181c2b');
          grad.addColorStop(1, '#10131e');
        } else {
          grad.addColorStop(0, '#9aa3ba');
          grad.addColorStop(1, '#7d869c');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, tile, tile);

        // Subtle tile bevel & grout
        ctx.strokeStyle = dark ? '#08090f' : '#586075';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, tile - 2, tile - 2);
        ctx.fillStyle = dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.14)';
        ctx.fillRect(x + 3, y + 3, tile - 6, 3);
      }
    }
    // Scuffs, grease stains & diner wear
    for (let i = 0; i < 240; i++) {
      ctx.fillStyle = rng() > 0.45 ? 'rgba(6,8,14,0.22)' : 'rgba(180,140,75,0.11)';
      ctx.fillRect(Math.floor(rng() * size), Math.floor(rng() * size), 2 + Math.floor(rng() * 6), 2 + Math.floor(rng() * 5));
    }
  }, { repeat: true });
}

export function wallPanelTexture() {
  return makeCanvasTexture(256, 256, (ctx, size) => {
    const rng = randomFrom(808);
    // Upper dark slate plaster
    const upper = ctx.createLinearGradient(0, 0, 0, size);
    upper.addColorStop(0, '#1a1f2e');
    upper.addColorStop(0.5, '#252b3d');
    upper.addColorStop(1, '#161a26');
    ctx.fillStyle = upper;
    ctx.fillRect(0, 0, size, size);

    // Subtle vertical Imbiss paneling + rivets
    for (let x = 0; x < size; x += 32) {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(x, 0, 3, size);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(x + 3, 0, 2, size);
    }

    // Classic FNAF checkered diner stripe band across center
    const bandY = 122;
    ctx.fillStyle = '#0c0e15';
    ctx.fillRect(0, bandY - 5, size, 42);
    for (let x = 0; x < size; x += 16) {
      const alt = (x / 16) % 2 === 0;
      ctx.fillStyle = alt ? '#ebe4d5' : '#11131d';
      ctx.fillRect(x, bandY, 16, 16);
      ctx.fillStyle = alt ? '#11131d' : '#c6283d';
      ctx.fillRect(x, bandY + 16, 16, 16);
    }
    // Red accent pinstripe above & below checker band
    ctx.fillStyle = '#b9263a';
    ctx.fillRect(0, bandY - 4, size, 3);
    ctx.fillStyle = '#ffb84d';
    ctx.fillRect(0, bandY + 33, size, 2);

    // Grime & vertical leak stains
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.fillRect(Math.floor(rng() * size), Math.floor(rng() * size), 2 + Math.floor(rng() * 4), 4 + Math.floor(rng() * 14));
    }
    // Dark baseboard
    ctx.fillStyle = '#0e1018';
    ctx.fillRect(0, size - 18, size, 18);
  }, { repeat: true });
}

export function deskWoodTexture() {
  return makeCanvasTexture(256, 256, (ctx, size) => {
    const rng = randomFrom(912);
    ctx.fillStyle = '#4a3226';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 4) {
      ctx.fillStyle = rng() > 0.5 ? 'rgba(28,16,10,0.22)' : 'rgba(120,82,58,0.14)';
      ctx.fillRect(0, y, size, 2 + Math.floor(rng() * 3));
    }
    // Coffee ring stain & scratches
    ctx.strokeStyle = 'rgba(28,14,8,0.38)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(185, 110, 22, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,235,200,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 24; i++) {
      const sx = rng() * size;
      const sy = rng() * size;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (rng() - 0.5) * 40, sy + (rng() - 0.5) * 10);
      ctx.stroke();
    }
  }, { repeat: true });
}

export function shutterTexture() {
  return makeCanvasTexture(256, 256, (ctx, size) => {
    const rng = randomFrom(701);
    ctx.fillStyle = '#363f54';
    ctx.fillRect(0, 0, size, size);
    // Horizontal steel slats
    for (let y = 0; y < size - 36; y += 22) {
      const g = ctx.createLinearGradient(0, y, 0, y + 22);
      g.addColorStop(0, '#4d5872');
      g.addColorStop(0.2, '#3c465c');
      g.addColorStop(0.85, '#252c3c');
      g.addColorStop(1, '#141822');
      ctx.fillStyle = g;
      ctx.fillRect(0, y, size, 22);
    }
    // Scratches & dent marks (Hauke impacts!)
    ctx.strokeStyle = 'rgba(210,225,255,0.16)';
    for (let i = 0; i < 45; i++) {
      ctx.beginPath();
      const x = rng() * size;
      const y = rng() * (size - 40);
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() - 0.5) * 32, y + (rng() - 0.5) * 14);
      ctx.stroke();
    }
    // Industrial yellow-black hazard stripe at bottom edge
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

      // Eerie Golden Duck close-up portrait
      ctx.fillStyle = '#f5c72c';
      ctx.beginPath();
      ctx.arc(w * 0.5, 145, 68, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#d99e1a';
      ctx.beginPath();
      ctx.ellipse(w * 0.5, 192, 78, 36, 0, 0, TAU);
      ctx.fill();
      // Beak
      ctx.fillStyle = '#e8611a';
      ctx.beginPath();
      ctx.ellipse(w * 0.5, 175, 42, 18, 0, 0, TAU);
      ctx.fill();
      // Hollow black sockets + eerie white pinpoints
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

    // Crisp illustrated "FEIERABEND! — CHEF TORGE" poster
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#1e243b');
    bg.addColorStop(1, '#101321');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Starburst behind portrait
    ctx.fillStyle = 'rgba(255, 184, 77, 0.10)';
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

    // Banner
    ctx.fillStyle = '#d92f44';
    ctx.fillRect(16, 18, w - 32, 42);
    ctx.fillStyle = '#fff5dc';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FEIERABEND!', w * 0.5, 48);

    // Golden Crown
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

    // Forest Green Cap + Dark Curly Hair
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

    // Face
    ctx.fillStyle = '#f1d6be';
    ctx.beginPath();
    ctx.roundRect(84, 130, 88, 78, 22);
    ctx.fill();

    // Eyes with eerie cyan glints
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

    // Clickable Red Honk Nose!
    ctx.fillStyle = '#ff5a3c';
    ctx.beginPath();
    ctx.arc(128, 177, 9, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffd2c4';
    ctx.beginPath();
    ctx.arc(125, 174, 3, 0, TAU);
    ctx.fill();

    // Smile
    ctx.strokeStyle = '#331c24';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(128, 186, 16, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // Red Chef Jacket + White Tee + Gold Chain
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

    // Footer
    ctx.fillStyle = '#0b0d16';
    ctx.fillRect(16, 286, w - 32, 38);
    ctx.fillStyle = '#ffe082';
    ctx.font = 'bold 19px monospace';
    ctx.fillText("TORGE'S IMBISS", w * 0.5, 311);
  });
}

export function rulesPosterTexture() {
  return makeCanvasTexture(256, 320, (ctx, w, h) => {
    ctx.fillStyle = '#efe6cf';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#252836';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.fillStyle = '#c6283d';
    ctx.fillRect(18, 18, w - 36, 40);
    ctx.fillStyle = '#fff9ec';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HAUSORDNUNG', w * 0.5, 45);

    ctx.fillStyle = '#1d202b';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    const rules = [
      '1. KEIN SPEZI SCHNORREN',
      '2. KEINE ZWIEBELN AB 02:00',
      '3. NICHT IN HAUKES BUFFET',
      '   GREIFEN (ERDBEBEN!)',
      '4. ANTONS VIDEOANRUFE',
      '   SOFORT WEGDRÜCKEN',
      '5. KASSENBON AUFHEBEN!',
      '6. POSTER NICHT HUPEN!',
    ];
    rules.forEach((line, i) => {
      ctx.fillText(line, 22, 86 + i * 25);
    });

    ctx.fillStyle = '#c6283d';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('— DIE GESCHÄFTSLEITUNG —', w * 0.5, 298);
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
      ['POMMES SCHRANK', '4,00 €'],
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

export function crownMesh(scale = 1) {
  const crown = new THREE.Group();
  const gold = brassMaterial(PALETTE.brass);
  const ruby = emissive(PALETTE.vermilion);
  const rim = emissive(0xffe082);
  const velvet = material(0x9e1c36, 0.52, 0.1);
  piece(crown, round, gold, 0, 0, 0, 0.21 * scale, 0.075 * scale, 0.21 * scale);
  piece(crown, orb, velvet, 0, 0.035 * scale, 0, 0.16 * scale, 0.085 * scale, 0.16 * scale);
  for (let i = 0; i < 5; i++) {
    const a = (i * TAU) / 5;
    piece(crown, octa, rim, Math.cos(a) * 0.165 * scale, 0.092 * scale, Math.sin(a) * 0.165 * scale, 0.055 * scale, 0.105 * scale, 0.055 * scale);
  }
  piece(crown, octa, ruby, 0, 0.115 * scale, 0.165 * scale, 0.05 * scale, 0.065 * scale, 0.05 * scale);
  return crown;
}

export function chefTorgeModel() {
  // Chef Torge (Freddy): Dunkelgrüne Kappe + dunkle Locken + Goldene Chef-Krone, weißes Tee unter offener roter Imbiss-Jacke, Goldkette & Pfanne!
  const root = new THREE.Group();
  const skin = material(0xf0d6be, 0.48, 0.04);
  const darkCurlyHair = material(0x1c151d, 0.78, 0.03);
  const forestCap = material(0x134433, 0.55, 0.08);
  const whiteTee = material(0xeef2fa, 0.55, 0.04);
  const chefJacket = material(0xbc2432, 0.42, 0.12);
  const jacketLapel = material(0x8c1824, 0.48, 0.1);
  const darkPants = material(0x161a28, 0.62, 0.1);
  const sneakerSole = material(0xdce2f0, 0.5, 0.06);
  const brass = brassMaterial(PALETTE.brass);
  const copper = brassMaterial(PALETTE.copper);
  const socketMat = material(0x05060a, 0.92, 0);
  const teethMat = material(0xeae6d8, 0.35, 0.1);
  const eyePin = emissive(0x88f4ff);
  const glow = emissive(0xffe082);

  const core = new THREE.Group();
  core.scale.set(1.12, 1.15, 1.12);
  root.add(core);

  // Beine + Sneaker
  for (const side of [-1, 1]) {
    piece(core, tapered, darkPants, side * 0.14, 0.36, 0, 0.105, 0.66, 0.105);
    piece(core, orb, darkPants, side * 0.14, 0.36, 0.02, 0.095, 0.09, 0.095);
    piece(core, solid, chefJacket, side * 0.14, 0.065, 0.04, 0.145, 0.085, 0.23);
    piece(core, solid, sneakerSole, side * 0.14, 0.02, 0.05, 0.155, 0.035, 0.25);
  }

  // Torso: Weißes T-Shirt in der Mitte + offene rote Chef-Jacke mit Revers & Knöpfen + Goldkette
  piece(core, tapered, whiteTee, 0, 0.96, 0, 0.34, 0.62, 0.25);
  piece(core, solid, chefJacket, -0.185, 0.97, 0.02, 0.165, 0.62, 0.28);
  piece(core, solid, chefJacket, 0.185, 0.97, 0.02, 0.165, 0.62, 0.28);
  piece(core, solid, chefJacket, 0, 0.97, -0.09, 0.39, 0.62, 0.13);
  piece(core, solid, jacketLapel, -0.11, 1.06, 0.155, 0.045, 0.42, 0.03);
  piece(core, solid, jacketLapel, 0.11, 1.06, 0.155, 0.045, 0.42, 0.03);
  // Hals
  piece(core, round, skin, 0, 1.31, 0.01, 0.095, 0.14, 0.095);
  // Goldkette + Medaillon
  const chain = band(core, brass, 0, 1.2, 0.04, 0.195);
  chain.rotation.x = -Math.PI / 2 + 0.22;
  piece(core, octa, glow, 0, 1.12, 0.225, 0.052, 0.058, 0.035);

  // Kopf, Ohren, Nase, lockiges dunkles Haar, dunkelgrüne Kappe + Goldene Krone
  const head = new THREE.Group();
  head.position.set(0, 1.5, 0.02);
  core.add(head);
  piece(head, orb, skin, 0, 0, 0, 0.23, 0.255, 0.23);
  piece(head, orb, skin, -0.23, 0.0, -0.01, 0.045, 0.068, 0.04);
  piece(head, orb, skin, 0.23, 0.0, -0.01, 0.045, 0.068, 0.04);
  piece(head, orb, skin, 0, -0.02, 0.225, 0.038, 0.035, 0.04);
  // Dunkle lockige Stirnfransen
  for (let i = -2; i <= 2; i++) {
    piece(head, orb, darkCurlyHair, i * 0.075, 0.115, 0.17 - Math.abs(i) * 0.02, 0.072, 0.068, 0.072);
  }
  piece(head, orb, darkCurlyHair, 0, 0.08, -0.05, 0.245, 0.19, 0.235);
  // Dunkelgrüne Kappe + geschwungener Schirm
  piece(head, orb, forestCap, 0, 0.185, -0.01, 0.245, 0.115, 0.245);
  const brim = piece(head, solid, forestCap, 0, 0.15, 0.22, 0.245, 0.032, 0.17);
  brim.rotation.x = 0.08;
  // Goldene Chef-Krone oben auf der Kappe
  const crown = crownMesh(0.84);
  crown.position.set(0, 0.275, 0);
  head.add(crown);

  // Unheimliche tiefe Augenhöhlen + Brauen + Cyan Pinpoints + artikulierter Kiefer mit Zähnen
  const eyes = new THREE.Group();
  head.add(eyes);
  for (const side of [-1, 1]) {
    piece(head, orb, socketMat, side * 0.086, 0.02, 0.192, 0.056, 0.05, 0.038);
    piece(eyes, orb, eyePin, side * 0.086, 0.02, 0.224, 0.023, 0.023, 0.018);
    const brow = piece(head, solid, darkCurlyHair, side * 0.086, 0.078, 0.205, 0.092, 0.022, 0.024);
    brow.rotation.z = side * -0.14;
  }
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.1, 0.185);
  piece(jaw, solid, socketMat, 0, 0, 0, 0.125, 0.055, 0.045);
  for (let i = -2; i <= 2; i++) {
    piece(jaw, solid, teethMat, i * 0.022, 0.016, 0.02, 0.015, 0.015, 0.012);
    piece(jaw, solid, teethMat, i * 0.022, -0.016, 0.02, 0.015, 0.015, 0.012);
  }
  head.add(jaw);

  // Arme + Goldene Bratpfanne
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.35, 1.18, 0);
    piece(arm, orb, chefJacket, 0, 0, 0, 0.135, 0.14, 0.135);
    piece(arm, tapered, chefJacket, side * 0.02, -0.22, 0.04, 0.088, 0.35, 0.088);
    piece(arm, orb, skin, side * 0.04, -0.44, 0.1, 0.075, 0.085, 0.075);
    core.add(arm);
    return arm;
  });

  const pan = new THREE.Group();
  pan.position.set(0.05, -0.42, 0.18);
  arms[1].add(pan);
  piece(pan, round, copper, 0, 0.05, 0.13, 0.036, 0.44, 0.036).rotation.x = Math.PI / 2.2;
  piece(pan, round, brass, 0, 0.11, 0.38, 0.22, 0.065, 0.22);
  piece(pan, round, socketMat, 0, 0.125, 0.38, 0.175, 0.07, 0.175);

  return { root, core, head, eyes, jaw, arms, crown, pan };
}

export function lostAntonModel() {
  // Lost Anton (Bonnie): Groß & schlank, hellbraunes zurückgekämmtes Haar, schwarzes Shirt mit gelb-grünem Frontdruck, Smartphone & rote Augen!
  const root = new THREE.Group();
  const skin = material(0xebd2be, 0.46, 0.04);
  const hairMat = material(0x8c6b47, 0.65, 0.05);
  const blackTee = material(0x13151e, 0.62, 0.08);
  const darkPants = material(0x171b27, 0.58, 0.1);
  const sneakerMat = material(0xe4e8f2, 0.5, 0.06);
  const limePrint = emissive(PALETTE.neonLime);
  const socketMat = material(0x06070b, 0.92, 0);
  const redEye = emissive(0xff2948);
  const phoneBody = material(0x141722, 0.32, 0.55);
  const phoneScreenMat = new THREE.MeshBasicMaterial({ color: 0x264a3e });

  const core = new THREE.Group();
  core.scale.set(1.02, 1.18, 1.02);
  root.add(core);

  // Lange schlanke Beine + helle Sneaker
  for (const side of [-1, 1]) {
    piece(core, tapered, darkPants, side * 0.13, 0.45, 0, 0.084, 0.86, 0.084);
    piece(core, solid, blackTee, side * 0.13, 0.055, 0.05, 0.12, 0.065, 0.22);
    piece(core, solid, sneakerMat, side * 0.13, 0.018, 0.055, 0.128, 0.032, 0.24);
  }

  // Schlanker langer Oberkörper im schwarzen Shirt mit neon-gelbgrünem Brust-Print
  piece(core, tapered, blackTee, 0, 1.18, 0, 0.285, 0.72, 0.215);
  piece(core, round, skin, 0, 1.56, 0.01, 0.075, 0.14, 0.075);
  piece(core, solid, limePrint, -0.075, 1.25, 0.155, 0.055, 0.042, 0.014);
  piece(core, solid, limePrint, 0.0, 1.25, 0.155, 0.068, 0.042, 0.014);
  piece(core, solid, limePrint, 0.082, 1.25, 0.155, 0.052, 0.042, 0.014);
  piece(core, solid, limePrint, 0.0, 1.185, 0.155, 0.18, 0.018, 0.012);

  // Schief gelegter Kopf mit zurückgekämmtem hellbraunem Haar & roten FNAF-Augen
  const head = new THREE.Group();
  head.position.set(0, 1.73, 0.03);
  head.rotation.z = 0.16;
  core.add(head);
  piece(head, orb, skin, 0, 0, 0, 0.21, 0.26, 0.21);
  piece(head, orb, skin, -0.205, 0.0, 0, 0.038, 0.062, 0.035);
  piece(head, orb, skin, 0.205, 0.0, 0, 0.038, 0.062, 0.035);
  piece(head, orb, skin, 0, -0.015, 0.205, 0.032, 0.038, 0.036);
  piece(head, orb, hairMat, 0, 0.125, -0.03, 0.22, 0.145, 0.215);
  const hairWave = piece(head, solid, hairMat, 0, 0.175, 0.045, 0.185, 0.075, 0.155);
  hairWave.rotation.x = -0.18;

  const eyes = new THREE.Group();
  head.add(eyes);
  for (const side of [-1, 1]) {
    piece(head, orb, socketMat, side * 0.075, 0.025, 0.176, 0.052, 0.05, 0.036);
    piece(eyes, orb, redEye, side * 0.075, 0.025, 0.208, 0.026, 0.026, 0.02);
  }
  const jaw = piece(head, orb, socketMat, 0, -0.1, 0.176, 0.062, 0.068, 0.042);

  // Lange schlaksige Arme + Smartphone in der rechten Hand (für den Videoanruf!)
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.285, 1.46, 0);
    piece(arm, orb, blackTee, 0, 0, 0, 0.09, 0.095, 0.09);
    piece(arm, tapered, blackTee, side * 0.03, -0.14, 0, 0.072, 0.28, 0.072);
    piece(arm, tapered, skin, side * 0.06, -0.46, 0.03, 0.058, 0.44, 0.058);
    piece(arm, orb, skin, side * 0.08, -0.7, 0.05, 0.07, 0.088, 0.07);
    core.add(arm);
    return arm;
  });

  const phone = new THREE.Group();
  phone.position.set(0.08, -0.72, 0.13);
  piece(phone, solid, phoneBody, 0, 0, 0, 0.11, 0.19, 0.022);
  const phoneScreen = piece(phone, solid, phoneScreenMat, 0, 0, 0.013, 0.092, 0.165, 0.008);
  arms[1].add(phone);

  return { root, core, head, eyes, jaw, arms, phone, phoneScreen };
}

export function bossHaukeModel() {
  // Boss Hauke (Foxy / Erdbeben-Koloss!): Braune Haar-Tolle, weißes Shirt mit dunkelgrünem Kragen, graue Jogginghose, Goldgürtel & Zornes-Augen!
  const root = new THREE.Group();
  const skin = material(0xf0d5be, 0.44, 0.05);
  const hairMat = material(0x4c3224, 0.65, 0.05);
  const whiteTee = material(0xf0f3fa, 0.52, 0.04);
  const greenCollar = material(0x16523b, 0.5, 0.08);
  const greyJoggers = material(0x6e7585, 0.64, 0.05);
  const brass = brassMaterial(PALETTE.brass);
  const browMat = material(0x281b15, 0.6, 0.08);
  const socketMat = material(0x07070c, 0.92, 0);
  const teethMat = material(0xf0eadc, 0.35, 0.1);
  const amberEye = emissive(0xffaa30);

  const core = new THREE.Group();
  root.add(core);

  // Wuchtige Stampf-Beine in grauer Jogginghose + Messing-Stiefel!
  const legs = [-1, 1].map((side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.38, 0.44, 0);
    piece(leg, round, greyJoggers, 0, -0.18, 0, 0.24, 0.44, 0.24);
    piece(leg, solid, brass, 0, -0.37, 0.08, 0.28, 0.13, 0.36);
    core.add(leg);
    return leg;
  });

  // MASSIVER Erdbeben-Körper im weißen T-Shirt mit dunkelgrünem Kragen & Champion-Goldgürtel!
  const belly = piece(core, orb, whiteTee, 0, 0.95, 0.04, 0.93, 0.83, 0.87);
  piece(core, round, greyJoggers, 0, 0.54, 0.02, 0.79, 0.22, 0.75);
  const collar = band(core, greenCollar, 0, 1.45, 0.08, 0.35);
  collar.scale.set(0.37, 0.37, 0.82);
  band(core, brass, 0, 0.62, 0.04, 0.87);
  piece(core, solid, brass, 0, 0.62, 0.91, 0.3, 0.19, 0.095);

  // Kopf mit brauner Haar-Tolle, Ohren, wütenden Zornesbrauen & glühenden Bernstein-Augen
  const head = new THREE.Group();
  head.position.set(0, 1.72, 0.14);
  core.add(head);
  piece(head, orb, skin, 0, 0, 0, 0.35, 0.315, 0.34);
  piece(head, orb, skin, -0.34, 0, 0, 0.06, 0.08, 0.05);
  piece(head, orb, skin, 0.34, 0, 0, 0.06, 0.08, 0.05);
  piece(head, orb, skin, 0, -0.02, 0.33, 0.06, 0.05, 0.06);
  piece(head, orb, hairMat, 0, 0.195, -0.02, 0.345, 0.165, 0.315);
  const quiff = piece(head, solid, hairMat, 0, 0.25, 0.11, 0.29, 0.14, 0.19);
  quiff.rotation.x = -0.22;

  const eyes = new THREE.Group();
  head.add(eyes);
  for (const side of [-1, 1]) {
    piece(head, orb, socketMat, side * 0.12, 0.03, 0.292, 0.072, 0.058, 0.042);
    piece(eyes, orb, amberEye, side * 0.12, 0.03, 0.328, 0.038, 0.034, 0.024);
    const brow = piece(head, solid, browMat, side * 0.12, 0.115, 0.312, 0.15, 0.045, 0.045);
    brow.rotation.z = side * -0.28;
  }
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.115, 0.29);
  piece(jaw, solid, socketMat, 0, 0, 0, 0.21, 0.08, 0.055);
  for (let i = -3; i <= 3; i++) {
    piece(jaw, solid, teethMat, i * 0.028, 0.024, 0.024, 0.018, 0.02, 0.014);
  }
  head.add(jaw);

  // Breite weiße Ärmel & wuchtige Arme + Fäuste
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.89, 1.08, 0.08);
    piece(arm, orb, whiteTee, 0, 0, 0, 0.29, 0.33, 0.29);
    piece(arm, tapered, skin, side * 0.06, -0.34, 0.14, 0.165, 0.36, 0.165);
    piece(arm, orb, skin, side * 0.08, -0.56, 0.2, 0.145, 0.145, 0.145);
    core.add(arm);
    return arm;
  });

  return { root, core, head, eyes, jaw, arms, legs, belly };
}

export function schnorrerTomModel() {
  // Schnorrer Tom (Chica): Umgedrehte beige Cap, pastell-rosa "Surf Miami"-Shirt, praller Beutesack, Spezi-Dose & grün glühende Augen!
  const root = new THREE.Group();
  const skin = material(0xebd2bc, 0.45, 0.05);
  const darkHair = material(0x2a201c, 0.68, 0.05);
  const khakiCap = material(PALETTE.khaki, 0.56, 0.06);
  const pinkTee = material(PALETTE.pink, 0.52, 0.05);
  const surfTeal = emissive(0x3ec2c9);
  const surfSunset = emissive(0xff8c66);
  const darkPants = material(0x1c202e, 0.58, 0.1);
  const bagMat = material(PALETTE.copper, 0.46, 0.18);
  const brass = brassMaterial(PALETTE.brass);
  const socketMat = material(0x06070b, 0.92, 0);
  const jadeEye = emissive(PALETTE.jade);

  const core = new THREE.Group();
  root.add(core);

  // Beine + Sneaker
  for (const side of [-1, 1]) {
    piece(core, tapered, darkPants, side * 0.13, 0.35, 0, 0.09, 0.66, 0.09);
    piece(core, solid, brass, side * 0.13, 0.045, 0.05, 0.135, 0.08, 0.22);
  }

  // Oberkörper im rosa "Surf Miami"-Shirt + prall gefüllter Schnorrer-Rucksack hinten!
  piece(core, tapered, pinkTee, 0, 0.96, 0.03, 0.34, 0.62, 0.26).rotation.x = 0.12;
  piece(core, round, skin, 0, 1.3, 0.07, 0.085, 0.12, 0.085);
  piece(core, round, surfTeal, 0, 0.95, 0.165, 0.13, 0.025, 0.13).rotation.x = Math.PI / 2;
  piece(core, solid, surfSunset, 0, 0.99, 0.175, 0.17, 0.045, 0.015);
  // Überfüllter Beutesack auf dem Rücken + herausschauende Spezi-Dose
  piece(core, orb, bagMat, 0, 0.96, -0.22, 0.27, 0.31, 0.25);
  piece(core, round, brass, 0, 1.22, -0.22, 0.115, 0.1, 0.115);
  const bagSpezi = speziModel();
  bagSpezi.position.set(0.12, 1.15, -0.24);
  bagSpezi.rotation.z = -0.35;
  bagSpezi.scale.setScalar(0.7);
  core.add(bagSpezi);

  // Kopf mit umgedrehter beiger Cap & grünen Augen
  const head = new THREE.Group();
  head.position.set(0, 1.47, 0.1);
  core.add(head);
  piece(head, orb, skin, 0, 0, 0, 0.22, 0.235, 0.22);
  piece(head, orb, skin, 0, -0.015, 0.215, 0.035, 0.035, 0.038);
  piece(head, orb, darkHair, 0, 0.08, 0.085, 0.195, 0.082, 0.165);
  piece(head, orb, khakiCap, 0, 0.125, -0.02, 0.235, 0.115, 0.235);
  // Schirm nach HINTEN (umgedrehte Cap!)
  piece(head, solid, khakiCap, 0, 0.095, -0.245, 0.205, 0.038, 0.185);

  const eyes = new THREE.Group();
  head.add(eyes);
  for (const side of [-1, 1]) {
    piece(head, orb, socketMat, side * 0.08, 0.018, 0.186, 0.052, 0.048, 0.036);
    piece(eyes, orb, jadeEye, side * 0.08, 0.018, 0.218, 0.026, 0.026, 0.02);
  }
  const jaw = piece(head, solid, socketMat, 0, -0.095, 0.186, 0.12, 0.055, 0.042);

  // Arme + erbeutete Spezi-Dose in der Hand!
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.31, 1.15, 0.06);
    piece(arm, orb, pinkTee, 0, 0, 0, 0.105, 0.11, 0.105);
    piece(arm, tapered, pinkTee, side * 0.02, -0.1, 0.02, 0.085, 0.22, 0.085);
    piece(arm, tapered, skin, side * 0.04, -0.32, 0.09, 0.065, 0.32, 0.065);
    piece(arm, orb, skin, side * 0.05, -0.5, 0.14, 0.075, 0.085, 0.075);
    core.add(arm);
    return arm;
  });

  const handSpezi = speziModel();
  handSpezi.position.set(-0.04, -0.52, 0.21);
  handSpezi.scale.setScalar(0.75);
  arms[0].add(handSpezi);

  return { root, core, head, eyes, jaw, arms };
}

export function goldenDuckModel() {
  // Secret Goldene Ente (Golden Freddy) — unheimlich reglos mit pechschwarzen Augenhöhlen & weißen Pinpoints!
  const root = new THREE.Group();
  const goldBody = material(0xf7c931, 0.32, 0.38);
  const beak = material(0xe05818, 0.38, 0.12);
  const socket = material(0x040408, 0.95, 0);
  const pinpoint = emissive(0xffffff);

  const core = new THREE.Group();
  core.scale.set(2.15, 2.15, 2.15);
  root.add(core);
  piece(core, orb, goldBody, 0, 0.24, 0, 0.3, 0.24, 0.35);
  piece(core, tapered, goldBody, 0, 0.34, -0.29, 0.1, 0.17, 0.12).rotation.x = -0.65;
  for (const side of [-1, 1]) {
    piece(core, orb, goldBody, side * 0.27, 0.25, -0.02, 0.105, 0.135, 0.23);
  }
  const head = new THREE.Group();
  head.position.set(0, 0.5, 0.16);
  head.rotation.z = -0.14;
  core.add(head);
  piece(head, orb, goldBody, 0, 0, 0, 0.225, 0.215, 0.225);
  piece(head, solid, beak, 0, -0.03, 0.215, 0.175, 0.08, 0.155);
  const eyes = new THREE.Group();
  head.add(eyes);
  for (const side of [-1, 1]) {
    piece(head, orb, socket, side * 0.095, 0.05, 0.178, 0.055, 0.055, 0.042);
    piece(eyes, orb, pinpoint, side * 0.095, 0.05, 0.215, 0.016, 0.016, 0.016);
  }
  return { root, core, head, eyes };
}

export function miniDuckModel() {
  const g = new THREE.Group();
  const yellow = material(0xffd633, 0.35, 0.1);
  const orange = material(0xff6b22, 0.4, 0.08);
  const black = material(0x0d0e14, 0.2, 0.1);
  piece(g, orb, yellow, 0, 0.075, 0, 0.095, 0.075, 0.115);
  piece(g, orb, yellow, 0, 0.155, 0.055, 0.07, 0.068, 0.07);
  piece(g, solid, orange, 0, 0.145, 0.12, 0.058, 0.025, 0.05);
  piece(g, orb, black, -0.032, 0.17, 0.108, 0.012, 0.012, 0.012);
  piece(g, orb, black, 0.032, 0.17, 0.108, 0.012, 0.012, 0.012);
  return g;
}

export function speziModel() {
  const g = new THREE.Group();
  const brown = material(0x4a2016, 0.3, 0.28);
  const orange = emissive(0xff8c24);
  const magenta = emissive(0xe83b8a);
  const yellow = emissive(0xffcf48);
  const alu = material(0xb8c2d6, 0.22, 0.85);
  piece(g, round, brown, 0, 0.18, 0, 0.11, 0.34, 0.11);
  piece(g, round, yellow, 0, 0.26, 0, 0.115, 0.045, 0.115);
  piece(g, round, orange, 0, 0.20, 0, 0.116, 0.075, 0.116);
  piece(g, round, magenta, 0, 0.125, 0, 0.116, 0.075, 0.116);
  piece(g, round, alu, 0, 0.352, 0, 0.104, 0.024, 0.104);
  piece(g, solid, alu, 0.02, 0.366, 0, 0.035, 0.008, 0.02);
  return g;
}

export function officePhoneModel() {
  const root = new THREE.Group();
  const body = material(0x1b1f2c, 0.42, 0.25);
  const accent = material(0x2d354a, 0.45, 0.3);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x38141a });
  piece(root, solid, body, 0, 0.055, 0, 0.34, 0.11, 0.28);
  piece(root, solid, accent, 0, 0.12, -0.05, 0.3, 0.04, 0.12);
  // Handset resting on cradle
  const handset = new THREE.Group();
  handset.position.set(0, 0.155, -0.05);
  piece(handset, round, body, 0, 0, 0, 0.035, 0.38, 0.035).rotation.z = Math.PI / 2;
  piece(handset, orb, body, -0.17, -0.015, 0, 0.055, 0.045, 0.055);
  piece(handset, orb, body, 0.17, -0.015, 0, 0.055, 0.045, 0.055);
  root.add(handset);
  // Keypad grid & blinking message LED
  piece(root, solid, accent, 0, 0.112, 0.06, 0.18, 0.012, 0.12);
  const led = piece(root, orb, ledMat, 0.12, 0.12, 0.08, 0.018, 0.018, 0.018);
  return { root, led, ledMat };
}

export function donerSpitModel() {
  const root = new THREE.Group();
  const steel = material(0x8a9ab2, 0.28, 0.78);
  const darkSteel = material(0x283042, 0.42, 0.65);
  const meat1 = material(0x7c3e24, 0.52, 0.06);
  const meat2 = material(0x5c2b17, 0.58, 0.05);
  const coil = emissive(0xff6b2b);

  // Housing + back heater panel
  piece(root, solid, darkSteel, 0, 0.06, 0, 0.68, 0.12, 0.58);
  piece(root, solid, steel, 0, 0.72, -0.24, 0.62, 1.24, 0.1);
  // Glowing red-orange ceramic heating coils
  for (let i = 0; i < 3; i++) {
    piece(root, solid, coil, 0, 0.38 + i * 0.32, -0.18, 0.44, 0.16, 0.03);
  }
  // Rotating vertical spit + layered kebab cone
  const spit = new THREE.Group();
  spit.position.set(0, 0.12, 0.04);
  piece(spit, round, steel, 0, 0.62, 0, 0.035, 1.26, 0.035);
  piece(spit, round, steel, 0, 0.16, 0, 0.24, 0.03, 0.24);
  piece(spit, tapered, meat1, 0, 0.58, 0, 0.26, 0.76, 0.26);
  for (let i = 0; i < 4; i++) {
    piece(spit, round, i % 2 === 0 ? meat2 : meat1, 0, 0.34 + i * 0.16, 0, 0.24 - i * 0.012, 0.05, 0.24 - i * 0.012);
  }
  root.add(spit);
  return { root, spit };
}

export function deskFanModel() {
  // Klassischer FNAF-Schreibtisch-Ventilator mit Gitterkäfig & rotierenden Blättern!
  const root = new THREE.Group();
  const darkMetal = material(0x1a2030, 0.38, 0.62);
  const cageMat = material(0x46516d, 0.32, 0.72);
  const bladeMat = material(0x283044, 0.32, 0.55);
  piece(root, round, darkMetal, 0, 0.03, 0, 0.23, 0.06, 0.23);
  piece(root, solid, emissive(0x38f2af), 0.06, 0.065, 0.12, 0.03, 0.015, 0.03);
  piece(root, round, darkMetal, 0, 0.18, -0.02, 0.05, 0.28, 0.05);
  piece(root, round, darkMetal, 0, 0.36, -0.05, 0.11, 0.18, 0.11).rotation.x = Math.PI / 2;

  const ringOuter = band(root, cageMat, 0, 0.36, 0.06, 0.27);
  ringOuter.rotation.x = 0;
  const ringInner = band(root, cageMat, 0, 0.36, 0.08, 0.16);
  ringInner.rotation.x = 0;
  for (let i = 0; i < 4; i++) {
    const spoke = piece(root, solid, cageMat, 0, 0.36, 0.075, 0.012, 0.52, 0.012);
    spoke.rotation.z = (i * Math.PI) / 4;
  }

  const blades = new THREE.Group();
  blades.position.set(0, 0.36, 0.045);
  for (let i = 0; i < 4; i++) {
    const b = piece(blades, solid, bladeMat, 0, 0, 0, 0.105, 0.42, 0.018);
    b.rotation.z = (i * Math.PI) / 4;
    b.rotation.y = 0.22;
  }
  piece(blades, orb, darkMetal, 0, 0, 0.02, 0.065, 0.065, 0.05);
  root.add(blades);
  return { root, blades };
}

export function crateMesh(isGold = false) {
  const g = new THREE.Group();
  const wood = isGold ? brassMaterial(PALETTE.brass) : material(0x7c4f2b, 0.72, 0.06);
  const trim = material(0x283044, 0.45, 0.25);
  piece(g, solid, wood, 0, 0.32, 0, 0.62, 0.62, 0.62);
  piece(g, solid, trim, 0, 0.32, 0, 0.66, 0.09, 0.66);
  piece(g, solid, trim, 0, 0.61, 0, 0.65, 0.07, 0.65);
  piece(g, solid, trim, 0, 0.04, 0, 0.65, 0.07, 0.65);
  return g;
}

export function partyGarland(parent, x1, x2, y, z) {
  // Kultige bunte Party-Quasten & warme Lichterkette aus dem Imbiss-Schuppen!
  const g = new THREE.Group();
  const wire = material(0x161822, 0.8, 0.1);
  const len = Math.abs(x2 - x1);
  piece(g, solid, wire, (x1 + x2) * 0.5, y, z, len, 0.025, 0.025);
  const colors = [0xff3b56, 0xffb84d, 0x38f2af, 0xb85cff, 0x73d7ff, 0xf2b5c6];
  const warmBulb = emissive(0xffd27d);
  const count = Math.max(5, Math.floor(len * 2.1));
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const px = x1 + (x2 - x1) * t;
    const sag = Math.sin(t * Math.PI) * 0.28;
    const mat = material(colors[i % colors.length], 0.32, 0.48);
    piece(g, tapered, mat, px, y - sag - 0.16, z, 0.085, 0.28, 0.085);
    if (i % 2 === 1) {
      piece(g, orb, warmBulb, px, y - sag - 0.04, z + 0.05, 0.048, 0.058, 0.048);
    }
  }
  parent.add(g);
  return g;
}

export function dustParticlesModel(count = 55) {
  const positions = new Float32Array(count * 3);
  const rng = randomFrom(1987);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (rng() - 0.5) * 4.2;
    positions[i * 3 + 1] = 0.65 + rng() * 2.35;
    positions[i * 3 + 2] = -2.75 + rng() * 2.15;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dotTex = makeCanvasTexture(32, 32, (ctx, s) => {
    const g = ctx.createRadialGradient(s * 0.5, s * 0.5, 1, s * 0.5, s * 0.5, s * 0.5);
    g.addColorStop(0, 'rgba(255, 238, 195, 0.95)');
    g.addColorStop(0.45, 'rgba(255, 224, 165, 0.42)');
    g.addColorStop(1, 'rgba(255, 224, 165, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
  const mat = new THREE.PointsMaterial({
    color: 0xffe4b5,
    map: dotTex,
    size: 0.055,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}
