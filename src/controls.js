const MOVEMENT = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);
const ACTIONS = { KeyQ: 'lamp', Space: 'dash', KeyF: 'lure', KeyE: 'use', KeyC: 'bonk', KeyV: 'bonk' };
const shortcuts = new Set([...MOVEMENT, ...Object.keys(ACTIONS), 'KeyM', 'Escape', 'KeyP']);

function detectInitialTouch() {
  if (typeof matchMedia !== 'function') return false;
  return matchMedia('(pointer: coarse)').matches
    || (matchMedia('(any-pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches);
}

function capturePointer(element, pointerId) {
  try {
    element.setPointerCapture?.(pointerId);
  } catch {
    // ignore synthetic/released pointers
  }
}

const ZOOM_KEYS = new Set(['Equal', 'Minus', 'Digit0', 'NumpadAdd', 'NumpadSubtract', 'Numpad0']);
const ZOOM_KEY_CHARS = new Set(['+', '-', '=', '0']);

function isEditableTarget(target) {
  const tag = target?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || Boolean(target?.isContentEditable);
}

export class Controls {
  constructor(canvas, stick, thumb, { chart, pause }) {
    this.active = false;
    this.keys = new Set();
    this.actions = new Set();
    this.movement = { x: 0, z: 0 };
    this.stickId = null;
    this.stickCenter = null;
    this.aimId = null;
    this.aimPoint = null;
    this.aimAngle = undefined;
    this.lastTouchAt = 0;
    this.stick = stick;
    this.thumb = thumb;
    this.stickTarget = stick.closest('.stick-zone') || stick;
    this.useTouch(detectInitialTouch());

    const preventNonEditable = (event) => {
      if (!isEditableTarget(event.target)) event.preventDefault();
    };
    window.addEventListener('contextmenu', preventNonEditable);
    window.addEventListener('selectstart', preventNonEditable);
    window.addEventListener('dragstart', preventNonEditable);
    window.addEventListener('dblclick', preventNonEditable);
    window.addEventListener('wheel', (event) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault();
    }, { passive: false });
    for (const gesture of ['gesturestart', 'gesturechange', 'gestureend']) {
      window.addEventListener(gesture, (event) => event.preventDefault(), { passive: false });
    }
    window.addEventListener('touchstart', (event) => {
      if ((event.touches?.length ?? 0) > 1 && !event.target?.closest?.('button, input, textarea')) {
        event.preventDefault();
      }
    }, { passive: false });
    window.addEventListener('touchmove', (event) => {
      if ((event.touches?.length ?? 0) > 1) event.preventDefault();
    }, { passive: false });

    window.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && (ZOOM_KEYS.has(event.code) || ZOOM_KEY_CHARS.has(event.key))) {
        event.preventDefault();
        return;
      }
      if (!shortcuts.has(event.code) || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.code === 'Escape' || event.code === 'KeyP') {
        if (!event.repeat && pause()) event.preventDefault();
        return;
      }
      if (!this.active) return;
      if (event.code === 'Space' && event.target.closest?.('button') && !event.target.closest?.('#hud')) return;
      event.preventDefault();
      this.useTouch(false);
      if (MOVEMENT.has(event.code)) this.keys.add(event.code);
      if (event.repeat) return;
      if (event.code === 'KeyM') chart();
      else if (ACTIONS[event.code]) this.queue(ACTIONS[event.code]);
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.reset());

    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    canvas.addEventListener('pointerdown', (event) => {
      if (!this.active) return;
      if (event.pointerType === 'touch') {
        this.lastTouchAt = performance.now();
        this.useTouch(true);
        if (this.aimId === null) {
          this.aimId = event.pointerId;
          capturePointer(canvas, event.pointerId);
          this.aimPoint = { x: event.clientX, y: event.clientY };
        }
      } else if (event.pointerType === 'mouse') {
        if (performance.now() - this.lastTouchAt < 800) return;
        this.useTouch(false);
        this.aimPoint = { x: event.clientX, y: event.clientY };
        if (event.button === 0) this.queue('bonk');
        else if (event.button === 2) this.queue('dash');
      }
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!this.active) return;
      if (event.pointerType === 'touch') {
        this.lastTouchAt = performance.now();
        if (event.pointerId === this.aimId) {
          this.aimPoint = { x: event.clientX, y: event.clientY };
        }
      } else if (event.pointerType === 'mouse') {
        if (performance.now() - this.lastTouchAt < 800 || this.touch) return;
        this.aimPoint = { x: event.clientX, y: event.clientY };
      }
    });
    const releaseAim = (event) => {
      if (event.pointerId === this.aimId) {
        this.aimId = null;
        this.aimPoint = null;
        this.aimAngle = undefined;
      }
    };
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, releaseAim);

    const aimStick = (event) => {
      if (!this.stickCenter) return;
      const { x: cx, y: cy, radius } = this.stickCenter;
      const x = event.clientX - cx;
      const z = event.clientY - cy;
      const length = Math.hypot(x, z);
      const scale = Math.max(radius, length);
      this.movement = { x: length > 5 ? x / scale : 0, z: length > 5 ? z / scale : 0 };
      thumb.style.transform = `translate(${this.movement.x * radius}px, ${this.movement.z * radius}px)`;
    };
    this.stickTarget.addEventListener('pointerdown', (event) => {
      if (!this.active || this.stickId !== null) return;
      event.preventDefault();
      if (event.pointerType === 'touch') this.lastTouchAt = performance.now();
      this.useTouch(true);
      this.stickId = event.pointerId;
      capturePointer(this.stickTarget, event.pointerId);

      stick.style.transform = '';
      const zoneRect = this.stickTarget.getBoundingClientRect();
      const stickRect = stick.getBoundingClientRect();
      const pad = stickRect.width * 0.44;
      const ax = Math.max(zoneRect.left + pad, Math.min(zoneRect.right - pad, event.clientX));
      const ay = Math.max(zoneRect.top + pad, Math.min(zoneRect.bottom - pad, event.clientY));
      this.stickCenter = { x: ax, y: ay, radius: Math.max(28, stickRect.width * 0.36) };
      const homeX = stickRect.left + stickRect.width * 0.5;
      const homeY = stickRect.top + stickRect.height * 0.5;
      stick.style.transform = `translate(${(ax - homeX).toFixed(1)}px, ${(ay - homeY).toFixed(1)}px)`;
      stick.classList.add('active');
      aimStick(event);
    });
    this.stickTarget.addEventListener('pointermove', (event) => {
      if (event.pointerId === this.stickId) {
        if (event.pointerType === 'touch') this.lastTouchAt = performance.now();
        aimStick(event);
      }
    });
    const releaseStick = (event) => {
      if (event.pointerId !== this.stickId) return;
      this.stickId = null;
      this.stickCenter = null;
      this.movement = { x: 0, z: 0 };
      thumb.style.transform = '';
      stick.style.transform = '';
      stick.classList.remove('active');
    };
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      this.stickTarget.addEventListener(name, releaseStick);
    }
  }

  noteTouch() {
    this.lastTouchAt = performance.now();
    this.useTouch(true);
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
    this.stickCenter = null;
    this.aimId = null;
    this.aimPoint = null;
    this.aimAngle = undefined;
    this.movement = { x: 0, z: 0 };
    this.thumb.style.transform = '';
    this.stick.style.transform = '';
    this.stick.classList.remove('active');
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
    }
    const output = {
      x: this.movement.x + Number(right) - Number(left),
      z: this.movement.z + Number(down) - Number(up),
      angle: this.aimAngle,
      isTouch: Boolean(this.touch),
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
