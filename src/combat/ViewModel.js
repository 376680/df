// 第一人称持枪模型（viewmodel）：纯 Box/Cylinder 低多边形拼装，零外部资源
// 挂载前提：scene.add(camera) 之后再 camera.add(vm.group)（three 只遍历 scene 子树）
// 枪体本地坐标：原点在机匣后端面中心、枪管轴线 y=0，枪管朝本地 -Z（相机前向）
import * as THREE from 'three';

const COLOR_BODY = 0x222222;     // 主体色（机匣/枪管）——沿用 Enemy.js:59 的枪色
const COLOR_ACCENT = 0x333a36;   // 分色（枪托/握把/弹匣/瞄具）

// 每把枪一条外观参数（id 与 config.js WEAPONS 一一对应）
// receiver 机匣 [长,高,宽]；barrel 枪管 [长,半径]
// mag.style: curve 弯弹匣 / straight 直弹匣 / grip 握把一体(手枪) / none 无
// stock.style: short 折叠短托 / slim 伸缩细托 / full 全尺寸枪托 / none 无
// sight: iron 机械瞄具 / optic 光学镜 / none 无；tube 霰弹护木管；brake 枪口制退器
const GUN_PARAMS = {
  //           机匣[长,高,宽]        枪管[长,半径]       弹匣(样式,长)              枪托(样式,长)               瞄具
  aks74u: { receiver: [0.40, 0.10, 0.07], barrel: [0.20, 0.020], mag: { style: 'curve',    len: 0.18 }, stock: { style: 'short', len: 0.16 }, sight: 'iron', brake: true },
  mp5:    { receiver: [0.36, 0.09, 0.06], barrel: [0.14, 0.018], mag: { style: 'straight', len: 0.15 }, stock: { style: 'slim',  len: 0.20 }, sight: 'iron' },
  m700:   { receiver: [0.46, 0.09, 0.06], barrel: [0.46, 0.013], mag: { style: 'none' },              stock: { style: 'full',  len: 0.26 }, sight: 'optic' },
  m870:   { receiver: [0.40, 0.10, 0.065],barrel: [0.38, 0.020], mag: { style: 'none' },              stock: { style: 'full',  len: 0.24 }, sight: 'iron', tube: true },
  m45:    { receiver: [0.22, 0.085,0.05], barrel: [0.03, 0.015], mag: { style: 'grip',     len: 0.13 }, stock: { style: 'none' },            sight: 'iron' },
};

function buildGun(p) {
  const group = new THREE.Group();
  const geos = [], mats = [];
  const bodyMat = new THREE.MeshLambertMaterial({ color: COLOR_BODY });
  const accentMat = new THREE.MeshLambertMaterial({ color: COLOR_ACCENT });
  mats.push(bodyMat, accentMat);

  const [lr, hr, wr] = p.receiver;
  const [lb, rb] = p.barrel;

  // 加一个件：登记几何便于 dispose，统一不投影/不受影（太阳阴影相机覆盖玩家周围）
  const part = (geo, mat, x, y, z) => {
    geos.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = false;
    m.receiveShadow = false;
    group.add(m);
    return m;
  };
  const box = (w, h, d, mat, x, y, z) => part(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  const cylZ = (r, len, mat, x, y, z) => {
    const m = part(new THREE.CylinderGeometry(r, r, len, 8), mat, x, y, z);
    m.rotation.x = Math.PI / 2;   // Cylinder 默认沿 Y，转成沿 Z
    return m;
  };

  // ---- 机匣（z: 0 ~ -lr）----
  box(wr, hr, lr, bodyMat, 0, 0, -lr / 2);

  // ---- 枪管（z: -lr ~ -(lr+lb)）----
  cylZ(rb, lb, bodyMat, 0, 0, -(lr + lb / 2));
  if (p.brake) cylZ(rb * 1.45, 0.06, bodyMat, 0, 0, -(lr + lb - 0.02));

  // ---- muzzle 节点：空 Object3D，位置严格由枪管长度推出，供枪口闪光/曳光起点 ----
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0, -(lr + lb));
  group.add(muzzle);

  // ---- 弹匣 ----
  if (p.mag.style === 'curve') {          // AK 弯匣：前倾
    const mg = box(wr * 0.85, p.mag.len, 0.10, accentMat, 0, -(hr / 2 + p.mag.len / 2 - 0.03), -lr * 0.55);
    mg.rotation.x = -0.22;
  } else if (p.mag.style === 'straight') {
    box(wr * 0.8, p.mag.len, 0.075, accentMat, 0, -(hr / 2 + p.mag.len / 2 - 0.03), -lr * 0.62);
  } else if (p.mag.style === 'grip') {    // 手枪：握把即弹匣井
    const g = box(wr * 0.85, p.mag.len, 0.085, accentMat, 0, -(hr / 2 + p.mag.len / 2 - 0.02), -lr * 0.4);
    g.rotation.x = 0.18;
  }

  // ---- 小握把（长枪有，手枪无）----
  if (p.stock.style !== 'none') {
    const g = box(wr * 0.8, 0.11, 0.07, accentMat, 0, -(hr / 2 + 0.045), -0.05);
    g.rotation.x = 0.18;
  }

  // ---- 霰弹管状弹仓 + 泵动护木 ----
  if (p.tube) {
    const tl = lb * 0.9;
    cylZ(0.014, tl, bodyMat, 0, -0.045, -(lr + tl / 2 - 0.02));
    box(wr + 0.02, 0.055, 0.10, accentMat, 0, -0.045, -(lr + 0.14));
  }

  // ---- 枪托（z 正方向：朝相机/射手）----
  const sl = p.stock.len;
  if (p.stock.style === 'short') {        // AKS-74U 折叠短托
    box(wr * 0.65, 0.05, sl, accentMat, 0, -0.005, sl / 2);
    box(wr * 0.75, 0.07, 0.03, accentMat, 0, -0.005, 0.015);
  } else if (p.stock.style === 'slim') {  // MP5 伸缩托：细杆 + 尾板
    box(wr * 0.4, 0.035, sl, accentMat, 0, 0.005, sl / 2 - 0.02);
    box(wr * 0.85, 0.075, 0.025, accentMat, 0, 0, sl);
  } else if (p.stock.style === 'full') {  // M700/M870 全尺寸木托造型（用分色）
    box(wr * 0.9, 0.085, sl, accentMat, 0, -0.02, sl / 2 - 0.01);
    box(wr * 0.6, 0.03, sl * 0.5, accentMat, 0, 0.04, sl * 0.35);
  }

  // ---- 瞄具 ----
  if (p.sight === 'iron') {
    box(wr * 0.25, 0.03, 0.02, accentMat, 0, hr / 2 + 0.025, -lr + 0.04);   // 前准星柱
    box(wr * 0.7, 0.025, 0.03, accentMat, 0, hr / 2 + 0.03, -0.04);         // 后照门
  } else if (p.sight === 'optic') {      // M700 高倍镜：底座 + 镜筒 + 两个环
    box(wr * 0.55, 0.02, 0.12, bodyMat, 0, hr / 2 + 0.01, -lr * 0.55);
    cylZ(0.022, 0.18, bodyMat, 0, hr / 2 + 0.05, -lr * 0.55);
    box(wr * 0.75, 0.04, 0.015, accentMat, 0, hr / 2 + 0.05, -lr * 0.55 - 0.06);
    box(wr * 0.75, 0.04, 0.015, accentMat, 0, hr / 2 + 0.05, -lr * 0.55 + 0.06);
  }

  return { group, muzzle, geos, mats };
}

export class ViewModel {
  constructor(camera) {
    this.camera = camera;
    this.group = new THREE.Group();
    this.group.position.set(0.24, -0.26, -0.50);   // 右下角持枪位（相机本地坐标）
    this.group.visible = false;
    this.currentKey = null;
    this._child = null;
    this._muzzle = null;
    this._cache = new Map();      // key -> {group, muzzle, geos, mats}，几何体/材质只建一次
    this._disposed = false;
    camera.add(this.group);       // 前提：调用方已先 scene.add(camera)

    // 共享枪口闪光：所有枪复用一套。PointLight 常驻且 intensity=0，绝不 toggle visible
    // （灯光数量变化会使全场景材质重编译着色器，每枪卡顿；网格 visible 可随便切）
    const flash = new THREE.Group();
    const flashGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffcc44, transparent: true, opacity: 0.9,
      depthWrite: false,     // 防止在近处枪身上打出深度洞
      toneMapped: false,     // 项目开了 ACES，关闭色调映射让火光保持高饱和亮黄
    });
    const flashBall = new THREE.Mesh(flashGeo, flashMat);
    flashBall.visible = false;
    const flashLight = new THREE.PointLight(0xffcc44, 0, 8, 2);   // 初始强度 0，常驻场景
    flash.add(flashBall, flashLight);
    this.flash = flash;
    this._flashBall = flashBall;
    this._flashLight = flashLight;
    this._flashGeo = flashGeo;
    this._flashMat = flashMat;
    this._flashTimer = 0;
    this._flashMax = 0.06;      // 火光时长（与敌人一致 0.06s）
    this._flashPeak = 15;       // 峰值强度（敌人 3/8；玩家枪口离相机 ~0.5-1.4m，需更亮）
  }

  get muzzle() { return this._muzzle; }

  // 当前枪 muzzle 的世界坐标；刀/投掷槽等无枪模时返回 null（调用方回退 eyePos）
  getMuzzleWorldPosition(target) {
    if (!this._muzzle) return null;
    return this._muzzle.getWorldPosition(target || new THREE.Vector3());
  }

  // 开火触发：重置计时、亮球、光强拉满（仅枪槽调用；无 muzzle 时忽略）
  triggerFlash() {
    if (!this._muzzle) return;
    this._flashTimer = this._flashMax;
    this._flashBall.visible = true;
    this._flashBall.scale.setScalar(0.75 + Math.random() * 0.5);        // 随机大小
    this._flashBall.rotation.set(0, 0, Math.random() * Math.PI * 2);    // 随机朝向
    this._flashLight.intensity = this._flashPeak;
  }

  // 火光衰减：必须每帧调用（含背包/地图打开时），靠 intensity 衰减，不碰 light.visible
  updateFlash(dt) {
    if (this._flashTimer <= 0) return;
    this._flashTimer -= dt;
    const k = Math.max(0, this._flashTimer / this._flashMax);
    this._flashLight.intensity = this._flashPeak * k;
    if (this._flashTimer <= 0) {
      this._flashLight.intensity = 0;
      this._flashBall.visible = false;
    }
  }

  // 每帧调用：key 为当前武器 defId；'knife'/null 等非枪 id 隐藏整个 viewmodel
  update(key) {
    if (this._disposed || key === this.currentKey) return;
    this.currentKey = key;
    if (this._child) { this.group.remove(this._child); this._child = null; this._muzzle = null; }
    const params = GUN_PARAMS[key];
    if (!params) { this.group.visible = false; return; }
    this.group.visible = true;
    let model = this._cache.get(key);
    if (!model) { model = buildGun(params); this._cache.set(key, model); }   // 首次切到才建，之后复用
    this._child = model.group;
    this._muzzle = model.muzzle;
    this.group.add(model.group);
    this._muzzle.add(this.flash);   // 切枪时重挂到新枪管末端；add() 自动从旧父级摘除
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this.camera.remove(this.group);
    for (const m of this._cache.values()) {
      for (const g of m.geos) g.dispose();
      for (const x of m.mats) x.dispose();
    }
    this._cache.clear();
    this._flashGeo.dispose();
    this._flashMat.dispose();
    this.group.clear();
  }
}
