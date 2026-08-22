// 音频引擎：全部程序化合成，无外部音频文件
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.volume = 0.7;
  }

  ensure() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    // 简单混响：用噪声脉冲响应
    const convolver = this.ctx.createConvolver();
    const len = this.ctx.sampleRate * 0.6;
    const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.5);
    }
    convolver.buffer = buf;
    this.wet = this.ctx.createGain(); this.wet.gain.value = 0.18;
    this.master.connect(this.ctx.destination);
    this.master.connect(convolver); convolver.connect(this.wet);
    this.wet.connect(this.ctx.destination);
  }

  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  // 基础工具
  _noiseBuf(dur) {
    const sr = this.ctx.sampleRate, n = Math.floor(sr * dur);
    const buf = this.ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  _env(gainNode, t0, attack, decay, peak) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(peak, t0 + attack);
    g.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  }
  _pan(pos) {
    // pos: THREE.Vector3 世界坐标 → 相对听者声像/衰减
    if (!pos || !this.listener) return { gain: 1, pan: 0 };
    const rel = pos.clone().sub(this.listener.pos);
    const dist = rel.length();
    const gain = Math.min(1, 14 / (dist + 4));
    const right = new this.listener.up.constructor().crossVectors(this.listener.forward, this.listener.up);
    const pan = Math.max(-1, Math.min(1, rel.normalize().dot(right)));
    return { gain, pan };
  }

  updateListener(pos, forward, up) { this.listener = { pos, forward, up }; }

  gunshot(pos, caliber = 'rifle') {
    if (!this.ctx) return;
    const { gain, pan } = this._pan(pos);
    if (gain < 0.02) return;
    const t = this.ctx.currentTime;
    const panner = this.ctx.createStereoPanner(); panner.pan.value = pan * 0.8;
    const g = this.ctx.createGain();
    this._env(g, t, 0.004, caliber === 'sniper' ? 0.35 : 0.16, (caliber === 'sniper' ? 0.9 : 0.55) * gain);
    const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf(0.4);
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = caliber === 'pistol' ? 2400 : 3800;
    const thump = this.ctx.createOscillator(); thump.type = 'sine';
    thump.frequency.setValueAtTime(caliber === 'sniper' ? 110 : 160, t);
    thump.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    const tg = this.ctx.createGain(); this._env(tg, t, 0.003, 0.13, 0.7 * gain);
    src.connect(filt).connect(g).connect(panner).connect(this.master);
    thump.connect(tg).connect(panner);
    src.start(t); src.stop(t + 0.45);
    thump.start(t); thump.stop(t + 0.2);
  }

  hit(pos) { return this.click(1400, pos, 0.25); }
  headshotDing() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(2100, t);
    const g = this.ctx.createGain(); this._env(g, t, 0.005, 0.22, 0.35);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.3);
  }
  click(freq, pos, vol = 0.3, type = 'square') {
    if (!this.ctx) return;
    const { gain, pan } = this._pan(pos);
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = this.ctx.createGain(); this._env(g, t, 0.004, 0.09, vol * Math.max(gain, 0.15));
    const pn = this.ctx.createStereoPanner(); pn.pan.value = pan * 0.7;
    o.connect(g).connect(pn).connect(this.master);
    o.start(t); o.stop(t + 0.15);
  }
  reloadClick(stage) {
    const f = stage === 0 ? 700 : stage === 1 ? 500 : 900;
    this.click(f, null, 0.28, 'square');
  }
  footstep(pos, surface = 'dirt') {
    if (!this.ctx) return;
    const { gain, pan } = this._pan(pos);
    if (gain < 0.03) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf(0.09);
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = surface === 'water' ? 900 : 300 + Math.random() * 250;
    const g = this.ctx.createGain(); this._env(g, t, 0.004, 0.075, 0.24 * gain);
    const pn = this.ctx.createStereoPanner(); pn.pan.value = pan * 0.6;
    src.connect(filt).connect(g).connect(pn).connect(this.master);
    src.start(t);
  }
  pickup() { this.click(950, null, 0.3, 'sine'); setTimeout(() => this.click(1350, null, 0.3, 'sine'), 70); }
  uiClick() { this.click(800, null, 0.18, 'sine'); }
  hurt() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.25);
    const g = this.ctx.createGain(); this._env(g, t, 0.01, 0.3, 0.4);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.4);
  }
  heartbeat() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const dt of [0, 0.22]) {
      const o = this.ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(55, t + dt);
      const g = this.ctx.createGain(); this._env(g, t + dt, 0.02, 0.18, 0.5);
      o.connect(g).connect(this.master); o.start(t + dt); o.stop(t + dt + 0.25);
    }
  }
  explosion(pos) {
    if (!this.ctx) return;
    const { gain, pan } = this._pan(pos);
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf(1.2);
    const filt = this.ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 900;
    const g = this.ctx.createGain(); this._env(g, t, 0.008, 1.0, 1.1 * Math.max(gain, 0.1));
    const pn = this.ctx.createStereoPanner(); pn.pan.value = pan * 0.7;
    src.connect(filt).connect(g).connect(pn).connect(this.master);
    src.start(t);
  }
  windLoop() {
    if (!this.ctx || this.windNode) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf(3); src.loop = true;
    const filt = this.ctx.createBiquadFilter(); filt.type = 'bandpass';
    filt.frequency.value = 400; filt.Q.value = 0.4;
    const g = this.ctx.createGain(); g.gain.value = 0.045;
    src.connect(filt).connect(g).connect(this.master);
    src.start(); this.windNode = src;
  }
}
