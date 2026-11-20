const KEY_CAM_MAP = {
  Digit1: '1A',
  Digit2: '1B',
  Digit3: '1C',
  Digit4: '2A',
  Digit5: '2B',
  Digit6: '3',
  Digit7: '4A',
  Digit8: '4B',
  Digit9: '5',
  Digit0: '6',
};

export class Controls {
  constructor(canvas, actions = {}) {
    this.canvas = canvas;
    this.actions = actions;
    this.enabled = false;
    this.keys = new Set();
    this.touch = false;
    this.edgePan = 0; // -1..+1 from mouse cursor edge hover on desktop
    this.dragId = null;
    this.dragLastX = 0;
    this.dragDelta = 0;
    this.dragMoved = false;
    this.lookHold = 0; // -1 left / +1 right from optional hold arrows
    this.mouseSens = 1.0;

    const isCoarse = Boolean(
      (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches)
      || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 && window.innerWidth <= 1024),
    );
    if (isCoarse) this.noteTouch();

    this.bindViewportLocks();
    this.bindKeyboard();
    this.bindPointer();
  }

  noteTouch() {
    this.touch = true;
    document.body?.classList?.add('touch-input');
  }

  enable(on) {
    this.enabled = Boolean(on);
    if (!on) {
      this.keys.clear();
      this.edgePan = 0;
      this.dragId = null;
      this.dragDelta = 0;
      this.lookHold = 0;
    }
  }

  setLookHold(dir) {
    this.lookHold = dir;
  }

  setMouseSensitivity(val) {
    this.mouseSens = Math.max(0.5, Math.min(2.0, Number.isFinite(Number(val)) ? Number(val) : 1.0));
  }

  isEditable(target) {
    if (!target || typeof target.closest !== 'function') return false;
    return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
  }

  bindViewportLocks() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    // CSS handles double-tap zoom so repeated touches still reach the buttons.
    window.addEventListener('wheel', (event) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault();
    }, { passive: false });

    for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) {
      window.addEventListener(ev, (event) => event.preventDefault(), { passive: false });
    }

    document.addEventListener('selectstart', (event) => {
      if (!this.isEditable(event.target)) event.preventDefault();
    });

    document.addEventListener('contextmenu', (event) => {
      if (!this.isEditable(event.target)) event.preventDefault();
    });
  }

  bindKeyboard() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (event) => {
      if (this.isEditable(event.target)) return;
      if ((event.ctrlKey || event.metaKey) && ['Equal', 'Minus', 'Digit0', 'NumpadAdd', 'NumpadSubtract'].includes(event.code)) {
        event.preventDefault();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.code === 'Escape' || event.code === 'KeyP') {
        if (!event.repeat && this.actions.pause?.()) event.preventDefault();
        return;
      }
      if (!this.enabled) return;
      if (event.code === 'Space' && event.target?.closest?.('button')) return;

      this.keys.add(event.code);
      if (event.repeat) return;

      if (event.code === 'Space' || event.code === 'KeyS' || event.code === 'ArrowDown') {
        event.preventDefault();
        this.actions.monitor?.();
      } else if (event.code === 'KeyQ') {
        event.preventDefault();
        this.actions.leftDoor?.();
      } else if (event.code === 'KeyW') {
        event.preventDefault();
        this.actions.leftLight?.();
      } else if (event.code === 'KeyE') {
        event.preventDefault();
        this.actions.rightDoor?.();
      } else if (event.code === 'KeyR') {
        event.preventDefault();
        this.actions.rightLight?.();
      } else if (event.code === 'KeyM') {
        event.preventDefault();
        this.actions.mute?.();
      } else if (event.code === 'KeyF') {
        event.preventDefault();
        this.actions.fuse?.();
      } else if (event.code === 'KeyB') {
        event.preventDefault();
        this.actions.bell?.();
      } else if (event.code === 'KeyV') {
        event.preventDefault();
        this.actions.vent?.();
      } else if (event.code === 'KeyT') {
        event.preventDefault();
        this.actions.stampBon?.();
      } else if (event.code === 'KeyX') {
        event.preventDefault();
        this.actions.camFlash?.();
      } else if (event.code === 'KeyG') {
        event.preventDefault();
        this.actions.steamBurst?.();
      } else if (event.code === 'KeyC') {
        event.preventDefault();
        this.actions.spezi?.();
      } else if (event.code === 'KeyH') {
        event.preventDefault();
        this.actions.honk?.();
      } else if (KEY_CAM_MAP[event.code]) {
        event.preventDefault();
        this.actions.cam?.(KEY_CAM_MAP[event.code]);
      }
    });

    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.edgePan = 0;
      this.dragId = null;
      this.dragDelta = 0;
      this.lookHold = 0;
    });
  }

  bindPointer() {
    if (!this.canvas || typeof window === 'undefined') return;
    // Desktop mouse edge-panning (classic FNAF 1 feel!)
    window.addEventListener('mousemove', (event) => {
      if (this.touch || !this.enabled) return;
      const w = Math.max(1, window.innerWidth);
      const nx = (event.clientX / w) * 2 - 1; // -1 left .. +1 right
      const dead = 0.24;
      if (Math.abs(nx) <= dead) this.edgePan = 0;
      else this.edgePan = Math.sign(nx) * ((Math.abs(nx) - dead) / (1 - dead));
    });

    this.canvas.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse') this.noteTouch();
      if (!this.enabled || this.dragId !== null || event.button !== 0) return;
      this.dragId = event.pointerId;
      this.dragLastX = event.clientX;
      this.dragMoved = false;
      this.canvas.setPointerCapture?.(event.pointerId);
    });

    this.canvas.addEventListener('pointermove', (event) => {
      if (this.dragId !== event.pointerId || !this.enabled) return;
      const dx = event.clientX - this.dragLastX;
      this.dragLastX = event.clientX;
      if (Math.abs(dx) > 2) this.dragMoved = true;
      // Swiping left turns view right (natural panorama feel)
      const sensitivity = this.touch ? 3.2 : 2.2;
      this.dragDelta -= (dx / Math.max(320, window.innerWidth)) * sensitivity;
    });

    this.canvas.addEventListener('pointerup', (event) => {
      if (this.dragId !== event.pointerId) return;
      this.dragId = null;
      if (!this.dragMoved && this.enabled) {
        // Check if player tapped/clicked the Chef Torge poster in the center-left of Office!
        const rect = this.canvas.getBoundingClientRect();
        const rx = (event.clientX - rect.left) / Math.max(1, rect.width);
        const ry = (event.clientY - rect.top) / Math.max(1, rect.height);
        this.actions.canvasTap?.(rx, ry);
      }
    });
    const cancelDrag = (event) => {
      if (this.dragId !== event.pointerId) return;
      this.dragId = null;
      this.dragDelta = 0;
    };
    this.canvas.addEventListener('pointercancel', cancelDrag);
    this.canvas.addEventListener('lostpointercapture', cancelDrag);
  }

  read() {
    let lookDelta = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) lookDelta -= 2.4;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) lookDelta += 2.4;
    if (this.lookHold !== 0) lookDelta += this.lookHold * 2.5;
    if (this.edgePan !== 0) lookDelta += this.edgePan * 2.1 * this.mouseSens;
    if (this.dragDelta !== 0) {
      lookDelta += this.dragDelta * 60;
      this.dragDelta = 0;
    }
    return { lookDelta };
  }
}
