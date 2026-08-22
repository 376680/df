// 玩家控制器：FPS 移动、体力、姿态、生命/护甲
import * as THREE from 'three';
import { CONFIG, ARMORS, WEAPONS } from '../config.js';

export class Player {
  constructor(camera, input, collision, audio) {
    this.camera = camera;
    this.input = input;
    this.collision = collision;
    this.audio = audio;

    this.pos = new THREE.Vector3(0, 0, 0);
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.height = CONFIG.player.height;
    this.onGround = true;
    this.crouching = false;
    this.sprinting = false;

    this.hp = 100; this.maxHp = 100;
    this.armor = null;              // {id, durability, defense}
    this.stamina = CONFIG.player.staminaMax;
    this.dead = false;

    // 装备
    this.slots = {
      primary: null,     // 武器实例状态 {defId, ammoInMag}
      secondary: null,
      melee: 'knife',
      throwable: [],     // ['grenade', ...]
    };
    this.activeSlot = 'primary';
    this.reserveAmmo = {};   // defId -> count

    // 交互状态（由 Game 注入回调）
    this.onDeath = null;
    this.onDamaged = null;   // (dmg, fromPos)

    this._stepAccum = 0;
    this._fallPeakY = 0;
  }

  get eyeHeight() {
    return this.crouching ? CONFIG.player.crouchHeight : this.height;
  }
  get eyePos() {
    return new THREE.Vector3(this.pos.x, this.pos.y + this.eyeHeight - 0.15, this.pos.z);
  }
  get speedBase() {
    let s = this.crouching ? CONFIG.player.crouchSpeed : CONFIG.player.walkSpeed;
    if (this.sprinting && !this.crouching) s = CONFIG.player.sprintSpeed;
    return s;
  }

  spawnAt(pos, yaw) {
    this.pos.copy(pos);
    this.pos.y = this.collision.groundHeight(pos.x, pos.z, pos.y + 5);
    this.vel.set(0, 0, 0);
    this.yaw = yaw ?? Math.random() * Math.PI * 2;
    this.pitch = 0;
    this.hp = this.maxHp;
    this.dead = false;
    this.stamina = CONFIG.player.staminaMax;
    this._fallPeakY = this.pos.y;
  }

  equipLoadout(loadout) {
    const mkWeaponState = id => ({ defId: id, ammoInMag: magSize(id) });
    this.slots.primary = loadout.primary ? mkWeaponState(loadout.primary) : null;
    this.slots.secondary = loadout.secondary ? mkWeaponState(loadout.secondary) : null;
    this.reserveAmmo = Object.assign({}, loadout.ammo || {});
    this.throwable = [];
    for (let i = 0; i < (loadout.grenades || 0); i++) this.throwable.push('grenade');
    for (let i = 0; i < (loadout.smokes || 0); i++) this.throwable.push('smoke');
    if (loadout.armor) {
      const a = ARMORS[loadout.armor];
      this.armor = { id: a.id, name: a.name, defense: a.defense, durability: a.durability, maxDurability: a.durability };
    } else this.armor = null;
    this.medkitId = loadout.medkit || 'bandage';
    this.medkitQty = loadout.medkitQty || 0;
    this.activeSlot = this.slots.primary ? 'primary' : (this.slots.secondary ? 'secondary' : 'melee');
  }

  addReserveAmmo(defId, qty) {
    this.reserveAmmo[defId] = (this.reserveAmmo[defId] || 0) + qty;
  }

  takeDamage(dmg, fromPos) {
    if (this.dead) return;
    let remaining = dmg;
    if (this.armor && this.armor.durability > 0) {
      const absorbed = Math.min(remaining * this.armor.defense, this.armor.durability);
      this.armor.durability -= absorbed;
      remaining -= absorbed;
    }
    this.hp -= remaining;
    this.audio.hurt();
    if (this.onDamaged) this.onDamaged(dmg, fromPos);
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      if (this.onDeath) this.onDeath();
    }
  }
  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  update(dt) {
    if (this.dead) return;
    const inp = this.input;

    // 视角
    const [mdx, mdy] = inp.consumeMouse();
    this.yaw -= mdx;
    this.pitch -= mdy;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));

    // 姿态
    this.crouching = inp.isDown('KeyC');
    const wantSprint = inp.isDown('ShiftLeft') && !this.crouching;
    const movingInput = inp.down('KeyW', 'KeyA', 'KeyS', 'KeyD');

    // 水域检测
    const zone = this.collision.zoneAt(this.eyePos);
    const inWater = zone === 'water' && this.pos.y < this._waterSurfaceY();

    // 体力
    this.sprinting = wantSprint && movingInput && this.stamina > 1 && !inWater;
    if (this.sprinting) this.stamina -= CONFIG.player.staminaDrain * dt;
    else this.stamina += CONFIG.player.staminaRegen * dt;
    this.stamina = Math.max(0, Math.min(CONFIG.player.staminaMax, this.stamina));

    // 移动方向
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const move = new THREE.Vector3();
    if (inp.isDown('KeyW')) move.add(fwd);
    if (inp.isDown('KeyS')) move.sub(fwd);
    if (inp.isDown('KeyD')) move.add(right);
    if (inp.isDown('KeyA')) move.sub(right);
    const moving = move.lengthSq() > 0;
    if (moving) move.normalize();

    let speed = this.speedBase;
    if (inp.isDown('ControlLeft')) speed *= 0.45;       // 缓步（静音）
    if (inWater) speed *= 0.5;
    if (this.hp < 30) speed *= 0.85;

    // 水平速度
    const targetVx = move.x * speed, targetVz = move.z * speed;
    this.vel.x += (targetVx - this.vel.x) * Math.min(1, dt * 12);
    this.vel.z += (targetVz - this.vel.z) * Math.min(1, dt * 12);

    // 跳跃 & 重力
    if (inp.isDown('Space') && this.onGround && !this.crouching && this.stamina > 8 && !inWater) {
      this.vel.y = CONFIG.player.jumpVel;
      this.stamina -= 8;
      this.onGround = false;
    }
    this.vel.y -= CONFIG.world.gravity * dt;
    if (inWater) this.vel.y = Math.max(this.vel.y, -1.5);

    this.pos.addScaledVector(this.vel, dt);
    this.collision.resolveCylinder(this.pos, CONFIG.player.radius, this.eyeHeight);

    // 地面吸附与跌落伤害
    const g = this.collision.groundHeight(this.pos.x, this.pos.z, this.pos.y);
    if (this.pos.y <= g) {
      if (!this.onGround) {
        const fallDist = this._fallPeakY - this.pos.y;
        if (fallDist > CONFIG.player.fallDamageThreshold) {
          const dmg = (fallDist - CONFIG.player.fallDamageThreshold) * 14;
          this.takeDamage(dmg, null);
        }
      }
      this.pos.y = g;
      this.vel.y = 0;
      this.onGround = true;
      this._fallPeakY = this.pos.y;
    } else {
      this.onGround = false;
      this._fallPeakY = Math.max(this._fallPeakY, this.pos.y);
    }

    // 相机跟随
    const eye = this.eyePos;
    this.camera.position.copy(eye);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // 脚步声
    if (moving && this.onGround) {
      const stepInterval = this.sprinting ? 0.32 : this.crouching ? 0.75 : 0.5;
      this._stepAccum += dt;
      if (this._stepAccum > stepInterval) {
        this._stepAccum = 0;
        this.audio.footstep(this.pos, inWater ? 'water' : 'dirt');
      }
    }
  }

  _waterSurfaceY() {
    return this.collision.terrainHeight(0, -10) + 1.15;
  }
}

function magSize(defId) {
  return WEAPONS[defId]?.mag ?? 0;
}
