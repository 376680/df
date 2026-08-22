// 世界碰撞系统：AABB 静态几何 + 地形高度函数
import * as THREE from 'three';

export class CollisionWorld {
  constructor() {
    this.boxes = [];        // {min:Vector3, max:Vector3}
    this.zones = [];        // 水域等特殊区域 {min,max,type}
  }

  addBox(min, max) {
    this.boxes.push({ min: min.clone(), max: max.clone() });
  }
  // 快捷：由中心+尺寸注册
  addBoxCentered(cx, cy, cz, sx, sy, sz) {
    this.addBox(
      new THREE.Vector3(cx - sx/2, cy - sy/2, cz - sz/2),
      new THREE.Vector3(cx + sx/2, cy + sy/2, cz + sz/2)
    );
  }
  addZone(min, max, type) {
    this.zones.push({ min: min.clone(), max: max.clone(), type });
  }

  zoneAt(pos) {
    for (const z of this.zones) {
      if (pos.x >= z.min.x && pos.x <= z.max.x && pos.z >= z.min.z && pos.z <= z.max.z &&
          pos.y >= z.min.y && pos.y <= z.max.y) return z.type;
    }
    return null;
  }

  // 地形高度（起伏地面 + 河谷下切）
  terrainHeight(x, z) {
    const h =
      Math.sin(x * 0.02) * Math.cos(z * 0.017) * 1.6 +
      Math.sin(x * 0.055 + 1.3) * 0.7 +
      Math.cos(z * 0.043 + 0.6) * 0.9;
    // 中央河谷：沿 x 轴的谷地
    const valley = Math.exp(-Math.pow((z + 10) / 22, 2)) * 5.5;
    return h - valley;
  }

  // 圆柱体（玩家/AI）与 AABB 碰撞解算。pos 就地修改。
  resolveCylinder(pos, radius, height) {
    for (const b of this.boxes) {
      if (pos.y + height < b.min.y || pos.y > b.max.y) continue;
      const cx = Math.max(b.min.x, Math.min(pos.x, b.max.x));
      const cz = Math.max(b.min.z, Math.min(pos.z, b.max.z));
      const dx = pos.x - cx, dz = pos.z - cz;
      const d2 = dx*dx + dz*dz;
      if (d2 < radius*radius) {
        const d = Math.sqrt(d2) || 1e-6;
        const push = radius - d;
        pos.x += (dx/d) * push;
        pos.z += (dz/d) * push;
      }
    }
    // 世界边界
    const LIM = 118;
    pos.x = Math.max(-LIM, Math.min(LIM, pos.x));
    pos.z = Math.max(-LIM, Math.min(LIM, pos.z));
  }

  // 从 (x,z,yFrom) 向下找落脚高度；返回可站立的最高面
  groundHeight(x, z, yFrom) {
    let g = this.terrainHeight(x, z);
    for (const b of this.boxes) {
      if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue;
      if (b.max.y <= yFrom + 0.55 && b.max.y > g) g = b.max.y;   // 允许登上矮箱
    }
    return g;
  }

  // 射线 vs AABB 列表，返回最近命中距离或 null
  raycast(origin, dir, maxDist) {
    let best = null;
    for (const b of this.boxes) {
      const t = this._rayBox(origin, dir, b, maxDist);
      if (t !== null && (best === null || t < best)) best = t;
    }
    return best;
  }
  _rayBox(o, d, b, maxDist) {
    let tmin = 0, tmax = maxDist;
    for (const axis of ['x', 'y', 'z']) {
      const inv = 1 / d[axis];
      let t1 = (b.min[axis] - o[axis]) * inv;
      let t2 = (b.max[axis] - o[axis]) * inv;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
    return tmin > 0 ? tmin : null;
  }

  // 视线检测：两点间是否被静态几何阻挡
  lineOfSight(a, b) {
    const dir = b.clone().sub(a);
    const dist = dir.length();
    dir.normalize();
    const hit = this.raycast(a, dir, dist - 0.1);
    return hit === null;
  }
}
