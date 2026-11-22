// input.js — keyboard (WASD or arrows, Shift to run, E to lift loot,
// Q smoke, F EMP, P or Escape to pause) and mouse click-to-move. Keys are
// edge-triggered for the one-shot actions, held for movement.
export class Input {
  constructor(canvas) {
    this.up = false;
    this.down = false;
    this.left = false;
    this.right = false;
    this.run = false;
    this.grab = false;
    this.smoke = false;
    this.emp = false;
    this.pausePressed = false;
    this.confirmPressed = false;
    this.retryPressed = false;
    this.click = null; // {x, y} in playfield pixels, set on mouse down
    this.hudOffset = 0; // set by main.js: the HUD strip above the playfield
    this.anyKey = false;
    this._keys = new Set();

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.anyKey = true;
      this._keys.add(e.code);
      this._syncKeys();
      if (e.code === 'KeyQ') this.smoke = true;
      if (e.code === 'KeyF') this.emp = true;
      if (e.code === 'KeyP' || e.code === 'Escape') this.pausePressed = true;
      if (e.code === 'KeyR') this.retryPressed = true;
      if (e.code === 'Enter' || e.code === 'Space') this.confirmPressed = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this._keys.delete(e.code);
      this._syncKeys();
    });
    canvas.addEventListener('mousedown', (e) => {
      const r = canvas.getBoundingClientRect();
      const sx = canvas.width / r.width;
      const sy = canvas.height / r.height;
      this.click = { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy - this.hudOffset };
      this.anyKey = true;
    });
    window.addEventListener('blur', () => {
      this._keys.clear();
      this._syncKeys();
    });
  }

  _syncKeys() {
    const k = this._keys;
    this.up = k.has('KeyW') || k.has('ArrowUp');
    this.down = k.has('KeyS') || k.has('ArrowDown');
    this.left = k.has('KeyA') || k.has('ArrowLeft');
    this.right = k.has('KeyD') || k.has('ArrowRight');
    this.run = k.has('ShiftLeft') || k.has('ShiftRight');
    this.grab = k.has('KeyE');
  }

  // One-shot flags are consumed after each frame.
  endFrame() {
    this.smoke = false;
    this.emp = false;
    this.pausePressed = false;
    this.confirmPressed = false;
    this.retryPressed = false;
    this.anyKey = false;
  }
}
