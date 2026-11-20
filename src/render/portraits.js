import { getFaceOverrideImage } from './overrides.js';

const TAU = Math.PI * 2;
const _portraitCache = new Map();

export function invalidatePortraitCache() {
  _portraitCache.clear();
}

/**
 * Renders gritty VHS Security-File / Mugshot Portraits for Personalakte & Custom Night.
 * Automatically blends optional `public/overrides.json` face images when configured.
 */
export function getCharacterPortraitUrl(charId) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return '';
  const overrideImg = getFaceOverrideImage(charId);
  const cacheKey = `${charId}|${overrideImg ? 'ovr' : 'proc'}`;
  if (_portraitCache.has(cacheKey)) return _portraitCache.get(cacheKey);

  const c = document.createElement('canvas');
  c.width = 140;
  c.height = 140;
  const ctx = c.getContext('2d');

  // Gritty low-light VHS surveillance backdrop
  const bg = ctx.createRadialGradient(70, 64, 10, 70, 70, 88);
  const bgColors = {
    torge: ['#2a1216', '#080608'],
    anton: ['#0e2426', '#06080c'],
    tom: ['#261a1e', '#08070a'],
    hauke: ['#1e1b16', '#070606'],
    duck: ['#282008', '#060503'],
  }[charId] || ['#181c24', '#07080c'];
  bg.addColorStop(0, bgColors[0]);
  bg.addColorStop(1, bgColors[1]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 140, 140);

  ctx.save();
  ctx.translate(70, 78);

  if (charId === 'torge') {
    // Stained dark-red chef jacket + white undershirt
    ctx.fillStyle = '#541219';
    ctx.beginPath(); ctx.moveTo(-52, 62); ctx.lineTo(-42, 24); ctx.lineTo(42, 24); ctx.lineTo(52, 62); ctx.fill();
    ctx.fillStyle = '#c8bfae';
    ctx.beginPath(); ctx.moveTo(-12, 24); ctx.lineTo(12, 24); ctx.lineTo(0, 46); ctx.fill();
    // Sculpted angular head + dark curly hair + forest cap + crooked tarnished brass crown
    ctx.fillStyle = '#b48a6e';
    ctx.beginPath();
    ctx.moveTo(-26, -24); ctx.lineTo(26, -24); ctx.lineTo(30, 0); ctx.lineTo(20, 24); ctx.lineTo(-20, 24); ctx.lineTo(-30, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#181214';
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath(); ctx.arc(i * 8, -22, 7, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#123828';
    ctx.fillRect(-30, -38, 60, 15);
    ctx.fillRect(-28, -26, 58, 5);
    // Crooked tarnished crown
    ctx.save();
    ctx.translate(2, -46);
    ctx.rotate(-0.09);
    ctx.fillStyle = '#9a7432';
    ctx.beginPath();
    ctx.moveTo(-20, 8); ctx.lineTo(-18, -8); ctx.lineTo(-7, 1); ctx.lineTo(0, -12); ctx.lineTo(8, 1); ctx.lineTo(18, -8); ctx.lineTo(20, 8);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // Deep shadowed sockets + IR pinpoints + crooked deadpan grin
    ctx.fillStyle = '#1c1014';
    ctx.fillRect(-20, -8, 14, 8); ctx.fillRect(6, -8, 14, 8);
    ctx.fillStyle = '#eef6ff';
    ctx.fillRect(-14, -5, 3, 3); ctx.fillRect(12, -5, 3, 3);
    ctx.strokeStyle = '#241210';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-13, 13); ctx.lineTo(4, 14); ctx.lineTo(15, 10); ctx.stroke();
  } else if (charId === 'anton') {
    ctx.rotate(0.09);
    // Faded black tee + hunched neck + cyan smartphone uplight!
    ctx.fillStyle = '#14171e';
    ctx.beginPath(); ctx.moveTo(-44, 62); ctx.lineTo(-34, 26); ctx.lineTo(34, 26); ctx.lineTo(44, 62); ctx.fill();
    const uplight = ctx.createLinearGradient(0, 32, 0, -24);
    uplight.addColorStop(0, '#62e0d0');
    uplight.addColorStop(0.45, '#9c8c7e');
    uplight.addColorStop(1, '#4c423c');
    ctx.fillStyle = uplight;
    ctx.beginPath();
    ctx.moveTo(-23, -24); ctx.lineTo(23, -24); ctx.lineTo(25, 2); ctx.lineTo(15, 24); ctx.lineTo(-15, 24); ctx.lineTo(-25, 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2b201a';
    ctx.fillRect(-25, -34, 50, 14);
    // Hollow sleepless dark bags + pinpoints
    ctx.fillStyle = '#120e1a';
    ctx.beginPath(); ctx.arc(-11, -3, 8, 0, TAU); ctx.arc(11, -3, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#dffcff';
    ctx.fillRect(-12, -4, 2.5, 2.5); ctx.fillRect(10, -4, 2.5, 2.5);
  } else if (charId === 'tom') {
    // Bulging backpack straps + faded pink Surf tee + backwards khaki cap + wide unblinking stare
    ctx.fillStyle = '#8e5a64';
    ctx.beginPath(); ctx.moveTo(-46, 62); ctx.lineTo(-36, 26); ctx.lineTo(36, 26); ctx.lineTo(46, 62); ctx.fill();
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(-28, 26, 8, 36); ctx.fillRect(20, 26, 8, 36);
    ctx.fillStyle = '#b68e72';
    ctx.beginPath();
    ctx.moveTo(-24, -22); ctx.lineTo(24, -22); ctx.lineTo(27, 2); ctx.lineTo(17, 23); ctx.lineTo(-17, 23); ctx.lineTo(-27, 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a8946c';
    ctx.fillRect(-27, -36, 54, 15);
    ctx.fillStyle = '#241812';
    ctx.beginPath(); ctx.arc(0, -21, 6, 0, TAU); ctx.fill();
    // Wide unblinking bloodshot sclera + tiny dark irises
    ctx.fillStyle = '#181012';
    ctx.fillRect(-20, -8, 15, 10); ctx.fillRect(5, -8, 15, 10);
    ctx.fillStyle = '#dfd4cc';
    ctx.fillRect(-18, -6, 11, 6); ctx.fillRect(7, -6, 11, 6);
    ctx.fillStyle = '#121010';
    ctx.fillRect(-13, -4, 3, 3); ctx.fillRect(11, -4, 3, 3);
  } else if (charId === 'hauke') {
    // Massive broad shoulders + white tee with green collar + heavy brow scowl
    ctx.fillStyle = '#c2beb4';
    ctx.beginPath(); ctx.moveTo(-62, 62); ctx.lineTo(-52, 22); ctx.lineTo(52, 22); ctx.lineTo(62, 62); ctx.fill();
    ctx.fillStyle = '#143b2a';
    ctx.fillRect(-24, 22, 48, 8);
    ctx.fillStyle = '#ac8468';
    ctx.beginPath();
    ctx.moveTo(-31, -26); ctx.lineTo(31, -26); ctx.lineTo(34, 2); ctx.lineTo(24, 24); ctx.lineTo(-24, 24); ctx.lineTo(-34, 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2c1d15';
    ctx.fillRect(-32, -38, 64, 14);
    // Heavy overhanging brow shadow + clenched teeth
    ctx.fillStyle = '#120d0c';
    ctx.fillRect(-24, -10, 18, 8); ctx.fillRect(6, -10, 18, 8);
    ctx.fillStyle = '#f2f6ff';
    ctx.fillRect(-16, -6, 3, 2.5); ctx.fillRect(13, -6, 3, 2.5);
    ctx.fillStyle = '#1a1212';
    ctx.fillRect(-16, 11, 32, 6);
    ctx.fillStyle = '#d8d2c4';
    for (let tx = -14; tx <= 10; tx += 6) ctx.fillRect(tx, 12, 4, 4);
  } else {
    // The Filthy Duck Suit: sagging grimy yellow mascot head + hollow black mesh + faint human eyes inside!
    ctx.rotate(-0.18);
    ctx.fillStyle = '#8f701a';
    ctx.beginPath(); ctx.arc(0, 2, 36, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#241a06';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(0, 38); ctx.stroke();
    // Hollow mesh eye holes
    ctx.fillStyle = '#040406';
    ctx.beginPath(); ctx.ellipse(-13, -5, 9, 11, 0.1, 0, TAU); ctx.ellipse(13, -5, 9, 11, -0.1, 0, TAU); ctx.fill();
    // Cracked dirty orange mascot bill ajar + faint human eyes deep inside!
    ctx.fillStyle = '#9e4416';
    ctx.beginPath(); ctx.ellipse(0, 14, 22, 8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#050508';
    ctx.beginPath(); ctx.ellipse(0, 20, 18, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(225, 232, 240, 0.78)';
    ctx.fillRect(-14, -4, 2, 2); ctx.fillRect(12, -4, 2, 2);
  }

  if (overrideImg) {
    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.beginPath();
    ctx.arc(0, -2, 26, 0, TAU);
    ctx.clip();
    ctx.drawImage(overrideImg, -26, -28, 52, 52);
    ctx.restore();
  }

  ctx.restore();

  // VHS timestamp & scanlines across mugshot
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  for (let y = 0; y < 140; y += 3) ctx.fillRect(0, y, 140, 1);
  ctx.fillStyle = 'rgba(230, 236, 242, 0.55)';
  ctx.font = 'bold 9px monospace';
  ctx.fillText('CAM-ARCHIVE // 03:14', 8, 132);

  const url = c.toDataURL('image/png');
  _portraitCache.set(cacheKey, url);
  return url;
}
