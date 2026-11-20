const TAU = Math.PI * 2;
const _portraitCache = new Map();

function drawCrown(ctx, cx, cy, s = 1) {
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

export function getCharacterPortraitUrl(charId) {
  if (typeof document === 'undefined') return '';
  if (_portraitCache.has(charId)) return _portraitCache.get(charId);

  const c = document.createElement('canvas');
  c.width = 140;
  c.height = 140;
  const ctx = c.getContext('2d');

  const bg = ctx.createRadialGradient(70, 68, 14, 70, 70, 82);
  const bgColors = {
    torge: ['#481820', '#100910'],
    anton: ['#263218', '#0c1016'],
    tom: ['#3c2232', '#100c14'],
    hauke: ['#3d2812', '#120c08'],
    duck: ['#3c2e0a', '#0c0904'],
  }[charId] || ['#22283a', '#0c0e16'];
  bg.addColorStop(0, bgColors[0]);
  bg.addColorStop(1, bgColors[1]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 140, 140);

  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let y = 0; y < 140; y += 4) ctx.fillRect(0, y, 140, 2);

  ctx.save();
  ctx.translate(70, 78);

  if (charId === 'torge') {
    ctx.fillStyle = '#c82333';
    ctx.beginPath(); ctx.roundRect(-48, 30, 96, 44, 16); ctx.fill();
    ctx.fillStyle = '#f8f5ec';
    ctx.fillRect(-24, 30, 48, 44);
    drawCrown(ctx, 0, -52, 0.92);
    ctx.fillStyle = '#144c38';
    ctx.beginPath(); ctx.ellipse(0, -30, 38, 16, 0, Math.PI, TAU); ctx.fill();
    ctx.fillRect(-38, -32, 76, 10);
    ctx.fillStyle = '#20161e';
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath(); ctx.arc(i * 10, -20, 8.5, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#f2d7bf';
    ctx.beginPath(); ctx.roundRect(-35, -18, 70, 54, 18); ctx.fill();
    ctx.fillStyle = 'rgba(255,65,85,0.65)';
    ctx.beginPath(); ctx.arc(-23, 12, 7.5, 0, TAU); ctx.arc(23, 12, 7.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111420';
    ctx.beginPath(); ctx.arc(-14, 2, 9.5, 0, TAU); ctx.arc(14, 2, 9.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-14, 2, 7, 0, TAU); ctx.arc(14, 2, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2da8ff';
    ctx.beginPath(); ctx.arc(-14, 2, 3.8, 0, TAU); ctx.arc(14, 2, 3.8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff3b2f';
    ctx.beginPath(); ctx.arc(0, 11, 7.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#16121a';
    ctx.beginPath(); ctx.roundRect(-16, 22, 32, 9, 4); ctx.fill();
    ctx.fillStyle = '#f7f4ea';
    for (let tx = -12; tx <= 8; tx += 6) ctx.fillRect(tx, 23, 4, 4);
  } else if (charId === 'anton') {
    ctx.rotate(0.08);
    ctx.fillStyle = '#1b1f2c';
    ctx.beginPath(); ctx.roundRect(-40, 28, 80, 46, 14); ctx.fill();
    ctx.strokeStyle = '#38c8ff';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(0, -4, 36, Math.PI, TAU); ctx.stroke();
    ctx.fillStyle = '#222838';
    ctx.fillRect(-41, -12, 10, 22);
    ctx.fillRect(31, -12, 10, 22);
    ctx.fillStyle = '#ebd2be';
    ctx.beginPath(); ctx.roundRect(-31, -24, 62, 54, 18); ctx.fill();
    ctx.fillStyle = '#6c4c32';
    ctx.beginPath(); ctx.roundRect(-32, -32, 64, 20, 10); ctx.fill();
    ctx.fillStyle = 'rgba(42,30,52,0.55)';
    ctx.beginPath(); ctx.arc(-13, 3, 11, 0, TAU); ctx.arc(13, 3, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-13, 1, 9, 0, TAU); ctx.arc(13, 1, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff2948';
    ctx.beginPath(); ctx.arc(-13, 1, 4, 0, TAU); ctx.arc(13, 1, 4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#161822';
    ctx.beginPath(); ctx.roundRect(-13, 17, 26, 9, 4); ctx.fill();
    ctx.fillStyle = '#f4f2ec';
    for (let tx = -9; tx <= 6; tx += 6) ctx.fillRect(tx, 18, 4, 4);
  } else if (charId === 'tom') {
    ctx.fillStyle = '#ff7b89';
    ctx.beginPath(); ctx.roundRect(-42, 28, 84, 46, 14); ctx.fill();
    ctx.fillStyle = '#fcf9f0';
    ctx.beginPath(); ctx.arc(0, 32, 24, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#ebd2bc';
    ctx.beginPath(); ctx.roundRect(-32, -22, 64, 52, 18); ctx.fill();
    ctx.fillStyle = '#dcc89a';
    ctx.beginPath(); ctx.roundRect(-34, -34, 68, 22, 10); ctx.fill();
    ctx.fillStyle = '#1c1614';
    ctx.beginPath(); ctx.arc(0, -16, 9, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = '#3d281c';
    ctx.beginPath(); ctx.arc(0, -14, 6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-13, 1, 9, 0, TAU); ctx.arc(13, 1, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1fd68a';
    ctx.beginPath(); ctx.arc(-11, 2, 4.2, 0, TAU); ctx.arc(15, 2, 4.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#d4b89e';
    ctx.fillRect(-23, -8, 20, 8);
    ctx.fillRect(3, -8, 20, 8);
    ctx.fillStyle = '#161822';
    ctx.beginPath(); ctx.roundRect(-16, 16, 32, 10, 4); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-7, 16, 6, 7);
    ctx.fillRect(1, 16, 6, 7);
  } else if (charId === 'hauke') {
    ctx.fillStyle = '#16523b';
    ctx.beginPath(); ctx.roundRect(-56, 24, 112, 50, 18); ctx.fill();
    ctx.fillStyle = '#f4f6fc';
    ctx.fillRect(-24, 24, 48, 50);
    ctx.strokeStyle = '#ffbf52';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 30, 22, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();

    ctx.fillStyle = '#f0d5be';
    ctx.beginPath(); ctx.roundRect(-40, -24, 80, 54, 18); ctx.fill();
    ctx.fillStyle = '#4c3224';
    ctx.beginPath(); ctx.roundRect(-40, -38, 80, 22, 10); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-24, -48, 48, 16, 8); ctx.fill();
    ctx.fillStyle = '#12131c';
    ctx.beginPath(); ctx.arc(-15, 0, 9.5, 0, TAU); ctx.arc(15, 0, 9.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffaa30';
    ctx.beginPath(); ctx.arc(-15, 0, 5, 0, TAU); ctx.arc(15, 0, 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#281810';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-28, -12); ctx.lineTo(-5, -5);
    ctx.moveTo(28, -12); ctx.lineTo(5, -5);
    ctx.stroke();
    ctx.fillStyle = '#14121a';
    ctx.beginPath(); ctx.roundRect(-22, 15, 44, 11, 4); ctx.fill();
    for (let tx = -18; tx <= 14; tx += 7) {
      ctx.fillStyle = tx === 10 ? '#ffbf52' : '#f5f2e8';
      ctx.fillRect(tx, 16, 5, 6);
    }
  } else {
    ctx.rotate(-0.14);
    ctx.fillStyle = '#e5b322';
    ctx.beginPath(); ctx.arc(0, 4, 38, 0, TAU); ctx.fill();
    ctx.fillStyle = '#14111c';
    ctx.fillRect(-26, -34, 52, 7);
    ctx.fillRect(-17, -58, 34, 25);
    ctx.fillStyle = '#9b4dff';
    ctx.fillRect(-17, -40, 34, 6);
    ctx.fillStyle = '#040408';
    ctx.beginPath(); ctx.arc(-14, -2, 10, 0, TAU); ctx.arc(14, -2, 10, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-15, -3, 3, 3); ctx.fillRect(13, -3, 3, 3);
    ctx.fillStyle = '#e8611a';
    ctx.beginPath(); ctx.ellipse(0, 16, 24, 9, 0, 0, TAU); ctx.fill();
  }

  ctx.restore();
  const url = c.toDataURL('image/png');
  _portraitCache.set(charId, url);
  return url;
}
