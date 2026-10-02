// 武器系统：射击、换弹、后坐力、投掷物、曳光
import * as THREE from 'three';
import { CONFIG, WEAPONS } from '../config.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();

export class WeaponSystem {
  constructor({ scene, collision, audio, camera }) {
    this.scene = scene;
    this.collision = collision;
    this.audio = audio;
    this.camera = camera;

    this.tracers = [];           // {mesh, life}
    this.grenades = [];          // {mesh, vel, fuse, type}
    this.smokes = [];            // {pos, t, duration, particles}

    this.recoilPitch = 0; this.recoilYaw = 0;
    this._shotIndex = 0;
  }

  weaponDef(state) { return state ? WEAPONS[state.defId] : null; }

  // ---- 射击 ----
  fire(player, state, ads) {
    const def = this.weaponDef(state);
    if (!def) return false;

    if (def.type === 'melee') return this._melee(player, def);
    if (state.ammoInMag <= 0) { this.audio.reloadClick(0); return false; }

    state.ammoInMag--;
    const pellets = def.pellets || 1;
    const origin = player.eyePos;
    const baseDir = new THREE.Vector3();
    this.camera.getWorldDirection(baseDir);

    const spreadDeg = (ads ? def.adsSpread : def.spread) * (player.sprinting ? 1.6 : 1) * (player.crouching ? 0.75 : 1);
    let anyHit = false, headHit = false;

    for (let p = 0; p < pellets; p++) {
      const dir = baseDir.clone();
      const spreadRad = THREE.MathUtils.degToRad(spreadDeg);
      if (spreadRad > 0) {
        const ang = Math.random() * Math.PI * 2;
        const mag = Math.sqrt(Math.random()) * spreadRad * 0.5;
        const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
        const up = new THREE.Vector3().crossVectors(right, dir).normalize();
        dir.addScaledVector(right, Math.tan(mag) * Math.cos(ang));
        dir.addScaledVector(up, Math.tan(mag) * Math.sin(ang));
        dir.normalize();
      }
      const res = this.hitscan(player, origin, dir, def);
      if (res.hitEnemy) { anyHit = true; if (res.head) headHit = true; }
      this.spawnTracer(origin, dir, res.dist ?? def.range, res.endPoint);
    }

    // 后坐力
    const [rv, rh] = def.recoil;
    this.recoilPitch += THREE.MathUtils.degToRad(rv * (ads ? 0.7 : 1));
    this.recoilYaw += THREE.MathUtils.degToRad((Math.random() * 2 - 1) * rh);

    // 枪声
    this.audio.gunshot(origin, def.type === 'pistol' ? 'pistol' : def.type === 'sniper' ? 'sniper' : 'rifle');
    if (this.onShot) this.onShot(origin, def.range > 60 ? CONFIG.ai.hearRadius : CONFIG.ai.hearRadius * 0.67);   // AI 听声
    return true;
  }

  hitscan(player, origin, dir, def) {
    const maxDist = def.meleeRange ?? def.range;
    // 静态世界命中
    const worldDist = this.collision.raycast(origin, dir, maxDist);
    // 敌人命中（由 Game 注入 enemies 列表）
    let bestEnemy = null, bestDist = worldDist ?? maxDist, head = false;
    for (const e of this.enemies || []) {
      if (e.dead) continue;
      const hit = e.raycast(origin, dir, bestDist);
      if (hit) { bestEnemy = e; bestDist = hit.dist; head = hit.head; }
    }
    // 玩家被射时走 enemy.fireAt 内部逻辑，不走这里
    const endPoint = origin.clone().addScaledVector(dir, bestDist);
    if (bestEnemy) {
      const falloff = 1 - Math.min(0.35, (bestDist / def.range) * 0.35);
      const dmg = def.dmg * falloff * (head ? def.headMult : 1);
      bestEnemy.takeDamage(dmg, origin, head);
      if (this.onEnemyHit) this.onEnemyHit(head, bestEnemy);
      return { hitEnemy: true, dist: bestDist, head, endPoint };
    }
    return { hitEnemy: false, dist: worldDist, endPoint };
  }

  spawnTracer(origin, dir, dist, endOverride) {
    const end = endOverride || origin.clone().addScaledVector(dir, dist);
    const geo = new THREE.BufferGeometry().setFromPoints([origin.clone(), end]);
    const mat = new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.85 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.tracers.push({ mesh: line, life: 0.06 });
  }

  _melee(player, def) {
    const origin = player.eyePos;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    let hitSomething = false;
    for (const e of this.enemies || []) {
      if (e.dead) continue;
      const toE = _v1.copy(e.pos).setY(e.pos.y + 1).sub(origin);
      const d = toE.length();
      if (d < def.meleeRange && toE.normalize().dot(dir) > 0.6) {
        e.takeDamage(def.dmg, origin, false);
        hitSomething = true;
        if (this.onEnemyHit) this.onEnemyHit(false, e);
      }
    }
    this.audio.click(300, origin, 0.4, 'sawtooth');
    return hitSomething;
  }

  // ---- 换弹 ----
  reload(player, state, onDone) {
    const def = this.weaponDef(state);
    if (!def || def.type === 'melee') return false;
    if (state.ammoInMag >= def.mag) return false;
    const reserve = player.reserveAmmo[def.ammoId] || 0;
    if (reserve <= 0) return false;
    this.audio.reloadClick(0);
    setTimeout(() => this.audio.reloadClick(1), def.reload * 500);
    setTimeout(() => {
      const need = def.mag - state.ammoInMag;
      const take = Math.min(need, player.reserveAmmo[def.ammoId] || 0);
      state.ammoInMag += take;
      player.reserveAmmo[def.ammoId] -= take;
      this.audio.reloadClick(2);
      if (onDone) onDone(true);
    }, def.reload * 1000);
    return true;
  }

  // ---- 投掷物 ----
  throwGrenade(player, type) {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const origin = player.eyePos.clone().addScaledVector(dir, 0.5);
    const isSmoke = type === 'smoke';
    const color = isSmoke ? 0x888888 : 0x334422;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 6),
      new THREE.MeshLambertMaterial({ color })
    );
    mesh.position.copy(origin);
    this.scene.add(mesh);
    this.grenades.push({
      mesh, type,
      vel: dir.multiplyScalar(isSmoke ? 14 : 16).add(new THREE.Vector3(0, 3.5, 0)),
      fuse: isSmoke ? THROWABLE_FUSE.smoke : THROWABLE_FUSE.grenade,
    });
    this.audio.click(500, origin, 0.25, 'sine');
  }

  updateProjectiles(dt, damagePlayerFn, aiList) {
    // 曳光衰减
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.life <= 0) { this.scene.remove(t.mesh); t.mesh.geometry.dispose(); this.tracers.splice(i, 1); }
    }

    // 手雷/烟雾
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.vel.y -= CONFIG_GRAVITY * dt;
      g.mesh.position.addScaledVector(g.vel, dt);
      // 简单地面反弹
      const gy = this.collision.terrainHeight(g.mesh.position.x, g.mesh.position.z);
      if (g.mesh.position.y < gy + 0.08) {
        g.mesh.position.y = gy + 0.08;
        g.vel.y = Math.abs(g.vel.y) * 0.35;
        g.vel.x *= 0.7; g.vel.z *= 0.7;
      }
      g.fuse -= dt;
      if (g.fuse <= 0) {
        const pos = g.mesh.position.clone();
        if (g.type === 'grenade') {
          this.audio.explosion(pos);
          // 范围伤害：玩家与 AI
          for (const e of aiList || []) {
            if (!e.dead) {
              const d = e.pos.distanceTo(pos);
              if (d < 7) e.takeDamage(120 * (1 - d / 7), pos, false);
            }
          }
          damagePlayerFn(pos, 7, 120);
          this._explosionFlash(pos);
        } else {
          this._spawnSmoke(pos);
        }
        this.scene.remove(g.mesh); g.mesh.geometry.dispose();
        this.grenades.splice(i, 1);
      }
    }

    // 烟雾寿命
    for (let i = this.smokes.length - 1; i >= 0; i--) {
      const s = this.smokes[i];
      s.t += dt;
      if (s.t > s.duration + 3) {
        this.scene.remove(s.group);
        this.smokes.splice(i, 1);
      } else {
        const grow = Math.min(1, s.t / 1.2);
        const fade = s.t > s.duration ? 1 - (s.t - s.duration) / 3 : 1;
        s.group.children.forEach(p => {
          p.material.opacity = 0.85 * grow * fade;
          p.scale.setScalar(grow);
        });
      }
    }
  }

  _explosionFlash(pos) {
    const flash = new THREE.PointLight(0xffaa44, 60, 18);
    flash.position.copy(pos).y += 0.5;
    this.scene.add(flash);
    setTimeout(() => this.scene.remove(flash), 120);
  }

  _spawnSmoke(pos) {
    const group = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(1.1 + Math.random() * 0.8, 7, 5),
        new THREE.MeshBasicMaterial({ color: 0xbfbfbf, transparent: true, opacity: 0 })
      );
      const a = Math.random() * Math.PI * 2, r = Math.random() * 2.2;
      p.position.set(pos.x + Math.cos(a) * r, pos.y + 0.8 + Math.random() * 1.6, pos.z + Math.sin(a) * r);
      group.add(p);
    }
    this.scene.add(group);
    this.smokes.push({ group, t: 0, duration: 20 });
  }

  // 后坐力应用到相机（Game 每帧调用）
  applyRecoilToCamera(player, dt) {
    const rec = 8;
    this.recoilPitch *= Math.exp(-rec * dt);
    this.recoilYaw *= Math.exp(-rec * dt);
    this.camera.rotation.x += this.recoilPitch * 0.12;   // 视觉上抬
    // 永久部分：把一部分后坐力转成实际视角偏移
    player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch + this.recoilPitch * dt * 2.2));
    player.yaw += this.recoilYaw * dt * 2.2;
  }
}

const CONFIG_GRAVITY = 22;
const THROWABLE_FUSE = { grenade: 2.5, smoke: 1.8 };
