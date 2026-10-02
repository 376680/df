// AI 敌人：巡逻/警戒/交战状态机 + 胶囊体渲染
import * as THREE from 'three';
import { CONFIG, WEAPONS } from '../config.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
let AI_UID = 1;

export class Enemy {
  constructor(scene, collision, spawnPos, opts = {}) {
    this.id = AI_UID++;
    this.scene = scene;
    this.collision = collision;
    this.pos = spawnPos.clone();
    this.yaw = Math.random() * Math.PI * 2;
    this.hp = opts.hp ?? 100;
    this.armorFactor = opts.armorFactor ?? 0.85;   // 承伤乘数
    this.dead = false;
    this.state = 'PATROL';
    this.alertTimer = 0;
    this.searchPos = null;
    this.fireCooldown = 0;
    this.burstLeft = 0;
    this.reloadTimer = 0;
    this.strafeDir = Math.random() > 0.5 ? 1 : -1;
    this.strafeTimer = 0;
    this.lastKnownPlayerPos = null;

    // 巡逻路径点
    this.patrol = [];
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      this.patrol.push(spawnPos.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 30, 0, (Math.random() - 0.5) * 30
      )));
    }
    this.patrolIdx = 0;

    // 武器（简化：全部步枪行为，参数微调）
    this.weapon = WEAPONS.aks74u;
    this.magAmmo = this.weapon.mag;
    this.dmgPerShot = 9 + (opts.tier ?? 0) * 4;   // tier 0/1/2

    // 渲染：胶囊身+头球
    this.group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: opts.color ?? 0x4a4a3a });
    const bodyGeo = new THREE.CapsuleGeometry(0.32, 0.75, 4, 8);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.95;
    body.castShadow = true;
    const headMat = new THREE.MeshLambertMaterial({ color: 0xc9a184 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), headMat);
    head.position.y = 1.62;
    head.castShadow = true;
    this.group.add(body, head);
    this.bodyMesh = body; this.headMesh = head;
    // 枪（简单长方体）
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.7), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    gun.position.set(0.22, 1.15, 0.35);
    this.group.add(gun);
    // 枪口闪光：小球 + 点光，开火时短暂显示
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.9 })
    );
    const flashLight = new THREE.PointLight(0xffcc44, 3, 8);
    this.muzzleFlash = new THREE.Group();
    this.muzzleFlash.position.set(0.22, 1.15, 0.62);
    this.muzzleFlash.add(flash, flashLight);
    this.muzzleFlash.visible = false;
    this.muzzleFlashTimer = 0;
    this.group.add(this.muzzleFlash);
    scene.add(this.group);

    // 血条 sprite（受击后短暂显示）
    this.hpSprite = makeHpSprite();
    this.group.add(this.hpSprite);
    this.hpSprite.visible = false;
  }

  get eyePos() { return _v2.set(this.pos.x, this.pos.y + 1.62, this.pos.z); }
  get muzzlePos() { return this.muzzleFlash.getWorldPosition(_v3); }

  raycast(origin, dir, maxDist) {
    // 球形检测：头(1.62h r0.19) 与身体中心(0.95h r0.42)
    const checks = [
      { c: _v1.set(this.pos.x, this.pos.y + 1.62, this.pos.z), r: 0.19, head: true },
      { c: _v1.set(this.pos.x, this.pos.y + 0.95, this.pos.z), r: 0.42, head: false },
    ];
    let best = null;
    for (const chk of checks) {
      const t = raySphere(origin, dir, chk.c, chk.r);
      if (t !== null && t < maxDist && (!best || t < best.dist)) best = { dist: t, head: chk.head };
    }
    return best;
  }

  takeDamage(dmg, fromPos, head = false) {
    if (this.dead) return;
    this.hp -= dmg * this.armorFactor * (head ? 1 : 1);
    this.hpSprite.visible = true;
    this.hpSprite.scale.x = Math.max(0.01, this.hp / 100);
    setTimeout(() => { if (!this.dead) this.hpSprite.visible = false; }, 1500);
    // 受击进入警戒并朝向射击来源搜索
    if (this.state === 'PATROL') this.state = 'ALERT';
    this.alertTimer = 8;
    if (fromPos) this.searchPos = fromPos.clone();
    if (this.hp <= 0) this.die(fromPos);
  }

  die(killerPos) {
    this.dead = true;
    this.group.rotation.z = Math.PI / 2;   // 倒地
    this.group.position.y -= 0.6;
    this.hpSprite.visible = false;
    if (this.onDeath) this.onDeath(this);
  }

  canSee(player) {
    if (player.dead) return false;
    const eye = new THREE.Vector3(this.pos.x, this.pos.y + 1.62, this.pos.z);
    const target = player.eyePos;
    const toP = _v1.copy(target).sub(eye);
    const dist = toP.length();
    let viewDist = CONFIG.ai.viewDist;
    if (player.crouching) viewDist *= 0.65;
    if (dist > viewDist) return false;
    // 视锥
    const fwd = _v2.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    toP.normalize();
    if (fwd.dot(toP) < Math.cos(THREE.MathUtils.degToRad(CONFIG.ai.fovDeg / 2))) return false;
    return this.collision.lineOfSight(eye, target);
  }

  hearNoise(pos, radius) {
    if (this.dead) return;
    const d = this.pos.distanceTo(pos);
    if (d < radius) {
      if (this.state === 'PATROL') this.state = 'ALERT';
      this.alertTimer = Math.max(this.alertTimer, 6);
      this.searchPos = pos.clone();
    }
  }

  update(dt, player, onShootAtPlayer) {
    if (this.dead) return;

    switch (this.state) {
      case 'PATROL': this._patrol(dt); break;
      case 'ALERT': this._alert(dt, player); break;
      case 'COMBAT': this._combat(dt, player, onShootAtPlayer); break;
    }

    // 枪口闪光计时（与游戏循环同步，不用 setTimeout）
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0) this.muzzleFlash.visible = false;
    }

    // 感知升级/降级
    if (this.canSee(player)) {
      if (this.state !== 'COMBAT') { this.state = 'COMBAT'; this.burstLeft = 0; }
      this.lastKnownPlayerPos = player.pos.clone();
      this.alertTimer = 5;
    } else if (this.state === 'COMBAT') {
      this.alertTimer -= dt;
      if (this.alertTimer <= 0) { this.state = 'ALERT'; this.alertTimer = 6; }
    }

    // 重力贴地
    const g = this.collision.groundHeight(this.pos.x, this.pos.z, this.pos.y + 0.4);
    this.pos.y += (g - this.pos.y) * Math.min(1, dt * 10);

    // 同步 mesh
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;
  }

  _moveToward(target, speed, dt) {
    const dx = target.x - this.pos.x, dz = target.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.5) return true;
    const nx = dx / d, nz = dz / d;
    this.pos.x += nx * speed * dt;
    this.pos.z += nz * speed * dt;
    this.collision.resolveCylinder(this.pos, 0.35, 1.7);
    this.yaw = Math.atan2(-nx, -nz);
    return false;
  }

  _patrol(dt) {
    const wp = this.patrol[this.patrolIdx];
    if (this._moveToward(wp, 2.0, dt)) {
      this.patrolIdx = (this.patrolIdx + 1) % this.patrol.length;
    }
  }

  _alert(dt, player) {
    this.alertTimer -= dt;
    if (this.alertTimer <= 0) { this.state = 'PATROL'; return; }
    const look = this.searchPos || this.lastKnownPlayerPos;
    if (look && !this._moveToward(look, 3.2, dt)) {
      // 移动中
    } else if (look) {
      // 到达搜索点附近，缓慢转身环视
      this.yaw += dt * 1.2;
    }
  }

  _combat(dt, player, onShootAtPlayer) {
    if (player.dead) { this.state = 'ALERT'; return; }
    const distToPlayer = this.pos.distanceTo(player.pos);

    // 换弹
    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) this.magAmmo = this.weapon.mag;
      return;
    }

    // 视线检查：被遮挡时不射击，并加速退回 ALERT
    const aiEye = _v1.set(this.pos.x, this.pos.y + 1.62, this.pos.z);
    const canFire = this.collision.lineOfSight(aiEye, player.eyePos);
    if (!canFire) this.alertTimer = Math.min(this.alertTimer, 1.0);

    // 射击节奏：点射
    this.fireCooldown -= dt;
    if (canFire && this.fireCooldown <= 0 && distToPlayer < CONFIG.ai.fireRange) {
      if (this.burstLeft > 0) {
        this.burstLeft--;
        this.fireCooldown = 0.11;
        // 枪口闪光
        this.muzzleFlash.visible = true;
        this.muzzleFlashTimer = 0.06;
        // 命中概率随距离衰减；玩家移动/蹲伏修正
        let acc = Math.max(0.05, 0.45 - distToPlayer / 25);
        if (player.sprinting) acc -= 0.08;
        if (player.crouching) acc -= 0.05;
        acc = Math.max(0.05, Math.min(0.5, acc));
        if (Math.random() < acc) {
          const hitDmg = this.dmgPerShot * (0.8 + Math.random() * 0.4);
          onShootAtPlayer(hitDmg, this.pos);
        } else {
          // 弹着点音效（近处）
          onShootAtPlayer(null, this.pos);
        }
        if (this.burstLeft === 0) this.fireCooldown = 0.55 + Math.random() * 0.5;
      } else {
        this.burstLeft = 2 + Math.floor(Math.random() * 3);
      }
      this.magAmmo--;
      if (this.magAmmo <= 0) this.reloadTimer = 2.6;
    }

    // 移动策略：远则逼近，近则横移找掩体感
    const idealDist = 14;
    if (distToPlayer > idealDist + 6) {
      this._moveToward(player.pos, 4.2, dt);
    } else if (distToPlayer < idealDist - 6) {
      // 后撤
      const away = this.pos.clone().sub(player.pos).setY(0).normalize().add(this.pos);
      this._moveToward(away, 3.0, dt);
    } else {
      this.strafeTimer -= dt;
      if (this.strafeTimer <= 0) {
        this.strafeTimer = 1.2 + Math.random();
        this.strafeDir *= Math.random() > 0.3 ? 1 : -1;
      }
      const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const rightV = new THREE.Vector3(fwd.z, 0, -fwd.x);
      const dest = this.pos.clone().addScaledVector(rightV, this.strafeDir * 4);
      this._moveToward(dest, 3.4, dt);
      // 面朝玩家
      const dx = player.pos.x - this.pos.x, dz = player.pos.z - this.pos.z;
      this.yaw = Math.atan2(-dx, -dz);
    }
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse(o => { o.geometry?.dispose?.(); });
  }
}

function raySphere(origin, dir, center, radius) {
  const ocX = origin.x - center.x, ocY = origin.y - center.y, ocZ = origin.z - center.z;
  const b = ocX * dir.x + ocY * dir.y + ocZ * dir.z;
  const c = ocX*ocX + ocY*ocY + ocZ*ocZ - radius*radius;
  const disc = b*b - c;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  return t > 0 ? t : null;
}

function makeHpSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 8;
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
  const spr = new THREE.Sprite(mat);
  spr.position.y = 2.0;
  spr.scale.set(0.9, 0.09, 1);
  // 初始画满绿色
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#44dd44'; ctx.fillRect(0, 0, 64, 8);
  tex.needsUpdate = true;
  spr.userData.canvas = canvas; spr.userData.tex = tex;
  return spr;
}
