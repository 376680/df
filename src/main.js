// DELTA-WEB 入口：渲染器/场景/相机/全局状态机
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { Input } from './engine/Input.js';
import { SaveManager } from './engine/SaveManager.js';
import { AudioEngine } from './audio/AudioEngine.js';
import { MainMenu, SettingsMenu } from './ui/Menus.js';
import { createMatch, cleanupMatch } from './game/Game.js';

class App {
  constructor() {
    this.container = document.getElementById('app');

    // 渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    // 色调映射 + 输出色彩空间：ACES 柔化高光、提高对比；输出统一 sRGB
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 相机 & 场景
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 600);
    this.scene = new THREE.Scene();

    // 子系统
    this.input = new Input(this.renderer.domElement);
    this.save = new SaveManager();
    this.audio = new AudioEngine();
    this.match = null;

    // 首次点击进入交互（音频解锁 + 指针锁定）
    document.addEventListener('mousedown', () => {
      this.audio.ensure(); this.audio.resume(); this.audio.setVolume(this.save.data.settings.volume);
      if (this.match && !this.match.ended) this.audio.windLoop();
    }, { once: false });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.applySettings();
    this.toMainMenu();

    // 菜单背景旋转展示（简单场景）
    this._menuLoop();
  }

  applySettings() {
    const s = this.save.data.settings;
    this.input.sensitivity = s.sens;
    this.camera.fov = s.fov;
    this.camera.updateProjectionMatrix();
    this.renderer.shadowMap.enabled = s.shadows;
    this.audio.setVolume(s.volume);
  }

  toMainMenu() {
    if (this.match) { cleanupMatch(this.match); this.match = null; }
    this.scene.clear();
    this.input.enabled = true;
    new MainMenu(this).show(this.save);
  }

  startMatch() {
    if (this.match) cleanupMatch(this.match);
    this.scene.clear();
    this.audio.ensure(); this.audio.resume();
    this.audio.windLoop();
    this.applySettings();
    // 清掉可能残留的菜单 DOM
    document.querySelectorAll('.dw-menu').forEach(e => e.remove());
    this.match = createMatch(this);
  }

  _menuLoop() {
    requestAnimationFrame(() => this._menuLoop());
    if (this.match && !this.match.ended) return;   // 对局中由 Match 渲染
    if (this.match && this.match.ended) {
      // 结算画面：仍渲染最后一帧世界
    }
    if (!this.match) {
      // 空场景渲染避免黑屏闪烁
      this.renderer.render(this.scene, this.camera);
    }
  }
}

const app = new App();
window.DeltaLoading?.finish();   // 初始化完成且首帧已渲染，收起载入遮罩
window.__deltaApp = app;   // 调试句柄
