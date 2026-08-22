// 输入管理：键鼠状态、指针锁定、设置持久化
import { KEYBINDS } from '../config.js';

export class Input {
  constructor(dom) {
    this.dom = dom;
    this.keys = new Set();
    this.mouseDX = 0; this.mouseDY = 0;
    this.m0 = this.m1 = this.m2 = false;   // 左/中/右
    this.wheelDelta = 0;
    this.locked = false;
    this.sensitivity = 1.0;
    this._onKeyExtra = new Set();          // (code)=>void，一次性按键事件订阅
    this.enabled = true;

    document.addEventListener('keydown', e => {
      if (!this.enabled) return;
      if (e.code === 'Tab') e.preventDefault();
      if (!this.keys.has(e.code)) {
        for (const fn of this._onKeyExtra) fn(e.code);
      }
      this.keys.add(e.code);
    });
    document.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.m0 = this.m1 = this.m2 = false; });

    dom.addEventListener('mousedown', e => {
      if (!this.locked) return;
      if (e.button === 0) this.m0 = true;
      if (e.button === 1) this.m1 = true;
      if (e.button === 2) this.m2 = true;
    });
    document.addEventListener('mouseup', e => {
      if (e.button === 0) this.m0 = false;
      if (e.button === 1) this.m1 = false;
      if (e.button === 2) this.m2 = false;
    });
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('mousemove', e => {
      if (!this.locked || !this.enabled) return;
      this.mouseDX += e.movementX * 0.0022 * this.sensitivity;
      this.mouseDY += e.movementY * 0.0022 * this.sensitivity;
    });
    document.addEventListener('wheel', e => {
      if (this.locked) { this.wheelDelta += Math.sign(e.deltaY); e.preventDefault(); }
    }, { passive: false });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
    });
  }

  requestLock() {
    if (!this.locked) this.dom.requestPointerLock();
  }
  releaseLock() { if (this.locked) document.exitPointerLock(); }

  isDown(code) { return this.keys.has(code); }
  consumeMouse() {
    const d = [this.mouseDX, this.mouseDY];
    this.mouseDX = 0; this.mouseDY = 0;
    return d;
  }
  consumeWheel() {
    const w = this.wheelDelta;
    this.wheelDelta = 0;
    return w;
  }
  onKeyPress(fn) { this._onKeyExtra.add(fn); return () => this._onKeyExtra.delete(fn); }

  down(...codes) { return codes.some(c => this.keys.has(c)); }
}
