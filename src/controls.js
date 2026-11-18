const MOVEMENT = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);
const ACTIONS = { KeyQ: 'lamp', Space: 'dash', KeyF: 'lure', KeyE: 'use', KeyC: 'bonk', KeyV: 'bonk' };
const shortcuts = new Set([...MOVEMENT, ...Object.keys(ACTIONS), 'KeyM', 'Escape', 'KeyP']);

export class Controls {
  constructor(canvas, stick, thumb, { chart, pause }) {
    this.active = false;
    this.keys = new Set();
    this.actions = new Set();
    this.movement = { x: 0, z: 0 };
    this.stickId = null;
    this.aimId = null;
    this.aimPoint = null;
    this.aimAngle = undefined;
    this.thumb = thumb;
    this.useTouch(matchMedia('(pointer: coarse)').matches);

    window.addEventListener('keydown', (event) => {
      if (!shortcuts.has(event.code) || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.code === 'Escape' || event.code === 'KeyP') {
        if (!event.repeat && pause()) event.preventDefault();
        return;
      }
      if (!this.active || (event.code === 'Space' && event.target.closest?.('button'))) return;
      event.preventDefault();
      this.useTouch(false);
      if (MOVEMENT.has(event.code)) this.keys.add(event.code);
      if (event.repeat) return;
      if (event.code === 'KeyM') chart();
      else if (ACTIONS[event.code]) this.queue(ACTIONS[event.code]);
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.reset());

    canvas.addEventListener('pointerdown', (event) => {
      if (!this.active) return;
      if (event.pointerType === 'touch' && this.aimId === null) {
        this.useTouch(true);
        this.aimId = event.pointerId;
        canvas.setPointerCapture(event.pointerId);
        this.aimPoint = { x: event.clientX, y: event.clientY };
      } else if (event.pointerType !== 'touch' && event.button === 0) {
        this.aimPoint = { x: event.clientX, y: event.clientY };
        this.queue('bonk');
      }
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!this.active) return;
      if (event.pointerType !== 'touch') this.useTouch(false);
      if (event.pointerType !== 'touch' || event.pointerId === this.aimId) {
        this.aimPoint = { x: event.clientX, y: event.clientY };
      }
    });
    const releaseAim = (event) => {
      if (event.pointerId === this.aimId) this.aimId = null;
    };
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, releaseAim);

    const aimStick = (event) => {
      const rect = stick.getBoundingClientRect();
      const radius = rect.width * 0.34;
      const x = event.clientX - rect.left - rect.width / 2;
      const z = event.clientY - rect.top - rect.height / 2;
      const length = Math.hypot(x, z);
      const scale = Math.max(radius, length);
      this.movement = { x: length > 5 ? x / scale : 0, z: length > 5 ? z / scale : 0 };
      thumb.style.transform = `translate(${this.movement.x * radius}px, ${this.movement.z * radius}px)`;
    };
    stick.addEventListener('pointerdown', (event) => {
      if (!this.active || this.stickId !== null) return;
      event.preventDefault();
      this.stickId = event.pointerId;
      stick.setPointerCapture(event.pointerId);
      aimStick(event);
    });
    stick.addEventListener('pointermove', (event) => {
      if (event.pointerId === this.stickId) aimStick(event);
    });
    const releaseStick = (event) => {
      if (event.pointerId !== this.stickId) return;
      this.stickId = null;
      this.movement = { x: 0, z: 0 };
      thumb.style.transform = '';
    };
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) stick.addEventListener(name, releaseStick);
  }

  useTouch(touch) {
    if (this.touch === touch) return;
    this.touch = touch;
    this.aimPoint = null;
    this.aimAngle = undefined;
    document.body.classList.toggle('touch-input', touch);
  }

  enable(active) {
    this.active = active;
    this.reset();
  }

  reset() {
    this.keys.clear();
    this.actions.clear();
    this.stickId = null;
    this.aimId = null;
    this.aimPoint = null;
    this.aimAngle = undefined;
    this.movement = { x: 0, z: 0 };
    this.thumb.style.transform = '';
  }

  queue(action) {
    if (this.active) this.actions.add(action);
  }

  read(view, player) {
    const left = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
    const right = this.keys.has('KeyD') || this.keys.has('ArrowRight');
    const up = this.keys.has('KeyW') || this.keys.has('ArrowUp');
    const down = this.keys.has('KeyS') || this.keys.has('ArrowDown');
    if (this.aimPoint) {
      this.aimAngle = view.aimAt(this.aimPoint, player);
      if (this.touch) this.aimPoint = null;
    }
    const output = {
      x: this.movement.x + Number(right) - Number(left),
      z: this.movement.z + Number(down) - Number(up),
      angle: this.aimAngle,
      use: this.actions.has('use'),
      dash: this.actions.has('dash'),
      lamp: this.actions.has('lamp'),
      lure: this.actions.has('lure'),
      bonk: this.actions.has('bonk'),
    };
    this.actions.clear();
    return output;
  }
}
