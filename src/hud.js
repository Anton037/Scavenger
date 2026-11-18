import { interaction, TOTAL_RECORDS } from './game.js';
import { WIDTH, DEPTH, LIFT, RECORDS, cell, roomAt } from './level.js';

export const get = (id) => document.getElementById(id);
export function write(element, text) {
  if (element.textContent !== text) element.textContent = text;
}

const mapColors = ['#293b3a', '#4d5a52', '#3b5152', '#504542', '#42545a', '#474f43', '#41504a', '#484e5c'];

export class Hud {
  constructor() {
    this.elements = Object.fromEntries([
      'hud', 'location', 'objective', 'record-counter', 'record-pips', 'noise-label', 'noise-meter',
      'lamp-state', 'interact', 'interact-key', 'interact-label', 'notice', 'clapper-count', 'dash-state',
      'touch-use', 'touch-dash', 'touch-shutter', 'touch-lure', 'vignette', 'chart', 'chart-map', 'chart-toggle',
    ].map((id) => [id, get(id)]));
    const map = this.elements['chart-map'];
    this.chart = map.getContext('2d');
    this.scale = Math.min((map.width - 12) / WIDTH, (map.height - 12) / DEPTH);
    this.plan = document.createElement('canvas');
    this.plan.width = map.width;
    this.plan.height = map.height;
    const plan = this.plan.getContext('2d');
    plan.fillStyle = '#0d1b1c';
    plan.fillRect(0, 0, map.width, map.height);
    for (let z = 0; z < DEPTH; z++) {
      for (let x = 0; x < WIDTH; x++) {
        const c = cell(x, z);
        if (!c) continue;
        plan.fillStyle = mapColors[c - 1];
        plan.fillRect(this.px(x), this.py(z), this.scale + 0.3, this.scale + 0.3);
      }
    }
  }

  px(x) { return 6 + this.scale * x; }
  py(z) { return 6 + this.scale * z; }

  toggleChart(run, show = this.elements.chart.hidden) {
    this.elements.chart.hidden = !show;
    this.elements['chart-toggle'].setAttribute('aria-expanded', String(show));
    if (show && run) this.drawChart(run);
  }

  drawChart(run) {
    const ctx = this.chart;
    ctx.drawImage(this.plan, 0, 0);
    const place = (point, tint, size, circle = false) => {
      const x = this.px(point.x);
      const z = this.py(point.z);
      ctx.fillStyle = tint;
      if (circle) {
        ctx.beginPath();
        ctx.arc(x, z, size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(x, z);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.restore();
      }
    };
    place(LIFT, '#a5c5ab', 8);
    for (const record of RECORDS) {
      if (!run.records.has(record.id)) place(record, '#ecbf85', 4.7, true);
    }
    place(run.player, '#f5eee0', 5.4, true);
  }

  paint(run) {
    const ui = this.elements;
    const { player, records, lift } = run;
    const amount = records.size;
    const callTime = Math.ceil(lift.remaining);
    const objective = amount < TOTAL_RECORDS
      ? 'Recover three records'
      : lift.state === 'calling' ? `Lift arriving in ${callTime}s` : 'Return to the lift';
    write(ui.objective, objective);
    write(ui.location, roomAt(player.x, player.z));
    write(ui['record-counter'], `${amount} / ${TOTAL_RECORDS}`);
    for (const [index, pip] of [...ui['record-pips'].children].entries()) pip.classList.toggle('found', index < amount);

    const loudness = Math.ceil(player.noise / 2);
    for (const [index, line] of [...ui['noise-meter'].children].entries()) line.classList.toggle('active', index < loudness);
    ui['noise-meter'].classList.toggle('high', loudness >= 4);
    write(ui['noise-label'], loudness >= 4 ? 'Loud' : loudness >= 2 ? 'Carrying' : 'Quiet');
    write(ui['lamp-state'], player.lamp ? 'Lamp open' : 'Shutter closed');
    write(ui['clapper-count'], String(player.clappers));
    write(ui['dash-state'], player.cooldown > 0 ? `${Math.ceil(player.cooldown)}s` : '');
    ui['touch-dash'].disabled = player.cooldown > 0;
    ui['touch-lure'].disabled = player.clappers === 0;
    ui['touch-shutter'].setAttribute('aria-pressed', String(player.lamp));

    const action = interaction(run);
    ui['touch-use'].disabled = !action?.enabled;
    ui.interact.hidden = !action;
    ui['interact-key'].hidden = !action?.enabled;
    write(ui['interact-label'], action?.text ?? '');
    const notice = run.notices[0];
    ui.notice.hidden = !notice;
    write(ui.notice, notice?.message ?? '');
    ui.vignette.classList.toggle('alert', run.listener.mode === 'hunt');
    if (!ui.chart.hidden) this.drawChart(run);
  }
}
