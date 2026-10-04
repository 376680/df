// 地图构建：长弓溪谷 —— 农场/工业/溪谷/防空洞四区 + 撤离点 + 植被
import * as THREE from 'three';
import { CONFIG } from '../config.js';

export const EXTRACT_POINTS = [
  { id: 'farm_gate', name: '农场大门', pos: new THREE.Vector3(-92, 0, -88), radius: 6 },
  { id: 'dam',       name: '水坝缺口', pos: new THREE.Vector3(95, 0, 90),   radius: 6 },
  { id: 'tunnel',    name: '南隧道',   pos: new THREE.Vector3(0, 0, 108),   radius: 5 },
];

// 出生点（玩家跳伞落点候选）
export const SPAWN_POINTS = [
  new THREE.Vector3(-80, 0, 70),
  new THREE.Vector3(75, 0, -75),
  new THREE.Vector3(-60, 0, -20),
  new THREE.Vector3(55, 0, 45),
];

const rnd = (a, b) => a + Math.random() * (b - a);

export function buildWorld(scene, collision, rng = Math.random) {
  const R = rng;
  const mats = {
    ground:  new THREE.MeshLambertMaterial({ color: 0x7d8a4f }),
    dirt:    new THREE.MeshLambertMaterial({ color: 0x9b7f56 }),
    wood:    new THREE.MeshLambertMaterial({ color: 0x8a6238 }),
    woodDark:new THREE.MeshLambertMaterial({ color: 0x5e4326 }),
    metal:   new THREE.MeshLambertMaterial({ color: 0x5c6670 }),
    rust:    new THREE.MeshLambertMaterial({ color: 0x8a4a2e }),
    concrete:new THREE.MeshLambertMaterial({ color: 0x8f8d84 }),
    roofRed: new THREE.MeshLambertMaterial({ color: 0x7e3b2a }),
    roofGray:new THREE.MeshLambertMaterial({ color: 0x4a4f54 }),
    water:   new THREE.MeshPhongMaterial({ color: 0x2e6d8f, transparent: true, opacity: 0.82, shininess: 120 }),
    hay:     new THREE.MeshLambertMaterial({ color: 0xc2a24b }),
    leaf:    new THREE.MeshLambertMaterial({ color: 0x4d6b2f }),
    trunk:   new THREE.MeshLambertMaterial({ color: 0x54402a }),
    grass:   new THREE.MeshLambertMaterial({ color: 0x6f8438 }),
    containerColors: [0xa63c2e, 0x2e5fa6, 0x3c8a3c, 0xb08a2e, 0x777777],
  };

  const group = new THREE.Group();
  scene.add(group);

  // ---------- 地形 ----------
  {
    const seg = 96;
    const geo = new THREE.PlaneGeometry(CONFIG.world.size, CONFIG.world.size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, collision.terrainHeight(x, z));
    }
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, mats.ground);
    ground.receiveShadow = true;   // 地面必须接收阴影，否则看不到接触阴影
    group.add(ground);
  }

  // ---------- 河流水面 ----------
  const riverY = () => collision.terrainHeight(0, -10) + 1.15;
  {
    const waterGeo = new THREE.PlaneGeometry(CONFIG.world.size, 34, 1, 1);
    waterGeo.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(waterGeo, mats.water);
    water.position.set(0, riverY(), -10);
    group.add(water);
    collision.addZone(
      new THREE.Vector3(-CONFIG.world.size/2, -50, -27),
      new THREE.Vector3(CONFIG.world.size/2, 50, 7),
      'water'
    );
  }

  // ---------- 建筑工具函数 ----------
  function box(x, y, z, sx, sy, sz, mat, solid = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    if (solid) collision.addBoxCentered(x, y, z, sx, sy, sz);
    return m;
  }
  // 带门洞的墙：沿 x 或 z 方向，中间留 1.4m 门
  function wallWithDoor(cx, cz, len, h, thick, axis, mat) {
    const doorW = 1.5, segLen = (len - doorW) / 2;
    if (axis === 'x') {
      box(cx - (doorW/2 + segLen/2), h/2, cz, segLen, h, thick, mat);
      box(cx + (doorW/2 + segLen/2), h/2, cz, segLen, h, thick, mat);
      if (h > 2.6) box(cx, 2.35 + (h - 2.5)/2, cz, doorW, h - 2.5, thick, mat);  // 门楣
    } else {
      box(cx, h/2, cz - (doorW/2 + segLen/2), thick, h, segLen, mat);
      box(cx, h/2, cz + (doorW/2 + segLen/2), thick, h, segLen, mat);
      if (h > 2.6) box(cx, 2.35 + (h - 2.5)/2, cz, thick, h - 2.5, doorW, mat);
    }
  }
  function house(x, z, w, d, h, wallMat, roofMat, doorSide = '+z') {
    const yBase = collision.terrainHeight(x, z);
    // 四面墙，一面留门
    const t = 0.25;
    if (doorSide === '+z') {
      box(x, yBase + h/2, z - d/2, w, h, t, wallMat);
      wallWithDoor(x, z + d/2, w, h, t, 'x', wallMat);
      box(x - w/2, yBase + h/2, z, t, h, d, wallMat);
      box(x + w/2, yBase + h/2, z, t, h, d, wallMat);
    } else {
      box(x, yBase + h/2, z + d/2, w, h, t, wallMat);
      wallWithDoor(x, z - d/2, w, h, t, 'x', wallMat);
      box(x - w/2, yBase + h/2, z, t, h, d, wallMat);
      box(x + w/2, yBase + h/2, z, t, h, d, wallMat);
    }
    // 屋顶（薄板，可站）
    box(x, yBase + h + 0.12, z, w + 0.6, 0.24, d + 0.6, roofMat);
  }

  // ========== 农产区（西北） ==========
  house(-72, -62, 14, 10, 3.4, mats.wood, mats.roofRed);            // 谷仓主屋
  house(-52, -78, 8, 6, 2.8, mats.woodDark, mats.roofRed, '-z');    // 工具房
  for (let i = 0; i < 6; i++) {                                     // 干草垛
    const hx = -84 + (i % 3) * 12, hz = -40 - Math.floor(i / 3) * 11;
    const hayY = collision.terrainHeight(hx, hz);
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 2.2, 12), mats.hay);
    roll.rotation.z = Math.PI / 2;
    roll.position.set(hx, hayY + 1.5, hz);
    roll.castShadow = roll.receiveShadow = true;
    group.add(roll);
    collision.addBoxCentered(hx, hayY + 1.5, hz, 2.2, 3.0, 2.2);
  }
  // 麦田（装饰平面 + 碰撞稀疏玉米秆省略——不阻挡）
  {
    const fieldGeo = new THREE.PlaneGeometry(46, 30);
    fieldGeo.rotateX(-Math.PI / 2);
    const field = new THREE.Mesh(fieldGeo, mats.grass);
    const fy = collision.terrainHeight(-58, -18);
    field.position.set(-58, fy + 0.06, -18);
    group.add(field);
  }

  // ========== 工业区（东南） ==========
  house(62, 58, 22, 14, 5, mats.metal, mats.roofGray, '-z');        // 大仓库
  // 集装箱堆场
  const contPos = [
    [48, 38], [56, 38], [64, 38], [48, 46], [56, 46],
    [76, 52], [76, 60], [84, 56], [68, 68], [58, 70],
  ];
  contPos.forEach(([cx, cz], i) => {
    const cmat = new THREE.MeshLambertMaterial({ color: mats.containerColors[i % mats.containerColors.length] });
    const stacked = i % 4 === 0 && cx === 48 || cx === 76 && i > 5;
    const levels = stacked ? 2 : 1;
    for (let lv = 0; lv < levels; lv++) {
      const cy = collision.terrainHeight(cx, cz) + 1.3 + lv * 2.6;
      box(cx, cy, cz, 6.2, 2.6, 2.5, cmat);
    }
  });
  // 油罐 ×2
  for (const [tx, tz] of [[88, 74], [96, 64]]) {
    const ty = collision.terrainHeight(tx, tz);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 5, 16), mats.rust);
    tank.position.set(tx, ty + 2.5, tz);
    tank.castShadow = tank.receiveShadow = true;
    group.add(tank);
    collision.addBoxCentered(tx, ty + 2.5, tz, 5.4, 5, 5.4);
  }

  // ========== 防空洞（北坡地下感：厚混凝土半埋房） ==========
  {
    const bx = 10, bz = -86;
    const by = collision.terrainHeight(bx, bz);
    box(bx, by + 1.4, bz, 18, 2.8, 12, mats.concrete);
    box(bx, by + 3.0, bz - 6, 18, 0.6, 0.4, mats.concrete);
    box(bx, by + 3.0, bz + 6, 18, 0.6, 0.4, mats.concrete);
    wallWithDoor(bx, bz - 6, 18, 2.6, 0.4, 'x', mats.concrete);
    wallWithDoor(bx, bz + 6, 18, 2.6, 0.4, 'x', mats.concrete);
    box(bx - 9, by + 1.4, bz, 0.4, 2.8, 12, mats.concrete);
    box(bx + 9, by + 1.4, bz, 0.4, 2.8, 12, mats.concrete);
    box(bx, by + 2.9, bz, 19, 0.5, 13, mats.concrete);
  }

  // ========== 中央溪谷木桥 ×2 ==========
  for (const bx of [-30, 34]) {
    const by = riverY() + 1.6;
    box(bx, by, -10, 3.2, 0.3, 26, mats.woodDark);
    for (const s of [-1, 1]) {
      box(bx + s * 1.6, by + 0.5, -10, 0.15, 1.0, 26, mats.woodDark, false);
    }
  }

  // ========== 散落小屋与掩体 ==========
  const sheds = [
    [-20, 42], [-8, 66], [22, -48], [40, -20], [-40, 8], [8, 24], [70, -60], [-88, 30],
  ];
  sheds.forEach(([sx, sz]) => house(sx, sz, 6, 5, 2.6, mats.wood, mats.roofGray));

  // 石堆/矮墙掩体
  const covers = [
    [-36, -34, 4, 1.2], [-14, -52, 5, 1.2], [18, 8, 4, 1.2], [44, 22, 5, 1.2],
    [-58, 44, 4, 1.2], [28, 78, 4, 1.2], [-70, -20, 5, 1.2], [86, 20, 4, 1.2],
  ];
  covers.forEach(([cx, cz, cw, ch]) => {
    const cy = collision.terrainHeight(cx, cz);
    box(cx, cy + ch/2, cz, cw, ch, 0.8, mats.concrete);
  });

  // ========== 树木（InstancedMesh） ==========
  {
    const N = 130;
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.32, 3.2, 6);
    const leafGeo = new THREE.SphereGeometry(1.8, 7, 5);
    const trunks = new THREE.InstancedMesh(trunkGeo, mats.trunk, N);
    const leaves = new THREE.InstancedMesh(leafGeo, mats.leaf, N);
    trunks.castShadow = trunks.receiveShadow = true;
    leaves.castShadow = leaves.receiveShadow = true;
    const dummy = new THREE.Object3D();
    let placed = 0, guard = 0;
    while (placed < N && guard++ < 800) {
      const x = rnd(-110, 110), z = rnd(-110, 110);
      if (Math.abs(z + 10) < 22) continue;                    // 河里不放
      if (Math.hypot(x - 62, z - 58) < 30) continue;          // 仓库区不放
      if (Math.abs(x + 58) < 26 && Math.abs(z + 18) < 18) continue; // 麦田不放
      const gy = collision.terrainHeight(x, z);
      const s = rnd(0.8, 1.5);
      dummy.position.set(x, gy + 1.6 * s, z);
      dummy.scale.setScalar(s);
      dummy.rotation.y = rnd(0, Math.PI * 2);
      dummy.updateMatrix();
      trunks.setMatrixAt(placed, dummy.matrix);
      dummy.position.y = gy + 3.6 * s;
      dummy.updateMatrix();
      leaves.setMatrixAt(placed, dummy.matrix);
      collision.addBoxCentered(x, gy + 1.6, z, 0.55, 3.2 * s, 0.55);
      placed++;
    }
    trunks.count = leaves.count = placed;
    group.add(trunks, leaves);
  }

  // ========== 草丛（InstancedMesh，无碰撞） ==========
  {
    const N = 260;
    const geo = new THREE.ConeGeometry(0.35, 0.9, 5);
    const inst = new THREE.InstancedMesh(geo, mats.grass, N);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < N; i++) {
      const x = rnd(-115, 115), z = rnd(-115, 115);
      dummy.position.set(x, collision.terrainHeight(x, z) + 0.4, z);
      dummy.rotation.set(rnd(-0.15, 0.15), rnd(0, Math.PI*2), rnd(-0.15, 0.15));
      dummy.scale.setScalar(rnd(0.7, 1.6));
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    group.add(inst);
  }

  // ========== 边界墙 ==========
  {
    const LIM = 119, H = 6;
    box(0, H/2 - 2, -LIM, LIM*2, H, 2, mats.concrete);
    box(0, H/2 - 2, LIM, LIM*2, H, 2, mats.concrete);
    box(-LIM, H/2 - 2, 0, 2, H, LIM*2, mats.concrete);
    box(LIM, H/2 - 2, 0, 2, H, LIM*2, mats.concrete);
  }

  // ---------- 天空 / 光照 / 雾 ----------
  scene.background = new THREE.Color(CONFIG.world.skyColor);
  scene.fog = new THREE.FogExp2(CONFIG.world.fogColor, CONFIG.world.fogDensity);

  const hemi = new THREE.HemisphereLight(0xbcd2e4, 0x4a4a46, 0.5);   // 天光去暖偏蓝、地面中性暗；强度压低避免冲淡阴影
  scene.add(hemi);
  // 低角度太阳：保留长影的方向感（角度不动），色温按白天调成接近中性白
  const sun = new THREE.DirectionalLight(0xfff4e6, 3.0);
  sun.position.set(-84, 90, 56);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  // frustum 只覆盖玩家周围 ±40，并由 Game 每帧平移到玩家位置；覆盖全图会把分辨率摊薄成锯齿
  sun.shadow.camera.left = -40; sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40;
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = 220;
  sun.shadow.bias = -0.0004;       // 抑制 shadow acne（地面条纹）
  sun.shadow.normalBias = 0.035;   // 抑制自阴影/浮空，避免影子脱离物体
  scene.add(sun);
  scene.add(sun.target);

  return { group, materials: mats, sun };
}
