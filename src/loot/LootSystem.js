// 物资系统：容器生成、战利品随机、物品实例
import * as THREE from 'three';
import { WEAPONS, AMMO, ARMORS, MEDICAL, THROWABLES, JUNK, LOOT_TABLES, RARITY } from '../config.js';

let uidCounter = 1;
export function newItemInstance(defId) {
  // 在各数据库中查找定义
  const def = WEAPONS[defId] || ARMORS[defId] || MEDICAL[defId] || THROWABLES[defId]
    || AMMO[defId] || JUNK.find(j => j.id === defId);
  if (!def) return null;
  return {
    uid: 'i' + (uidCounter++),
    defId,
    name: def.name,
    rarity: def.rarity || 'common',
    value: def.price || def.value || 0,
    grid: def.grid || weaponGrid(def),
    kind: classifyKind(defId),
    qty: 1,
  };
}
function weaponGrid(def) {
  if (WEAPONS[defId_check(def)]) return [4, 1];
  if (AMMO[defId]) return [1, 1];
  if (ARMORS[defId]) return [3, 2];
  return [2, 1];
}
function defId_check(def) { return Object.values(WEAPONS).find(w => w === def)?.id; }
function classifyKind(id) {
  if (WEAPONS[id]) return 'weapon';
  if (AMMO[id]) return 'ammo';
  if (ARMORS[id]) return 'armor';
  if (MEDICAL[id]) return 'medical';
  if (THROWABLES[id]) return 'throwable';
  return 'junk';
}

export function itemValue(inst) { return inst.value * (inst.qty || 1); }

// ---- 权重抽取 ----
function weightedPick(table) {
  const total = table.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of table) {
    r -= w;
    if (r <= 0) return key;
  }
  return table[0][0];
}

const pools = {
  junk_common: () => JUNK.filter(j => j.rarity === 'common' || j.rarity === 'uncommon'),
  junk_uncommon: () => JUNK.filter(j => j.rarity === 'uncommon' || j.rarity === 'rare'),
  junk_rare: () => JUNK.filter(j => j.rarity === 'rare'),
  junk_epic: () => JUNK.filter(j => j.rarity === 'epic'),
  junk_legendary: () => JUNK.filter(j => j.rarity === 'legendary'),
};

export function rollLoot(containerType) {
  const table = LOOT_TABLES[containerType];
  const n = containerType === 'body' ? 1 + Math.floor(Math.random() * 2)
    : 1 + Math.floor(Math.random() * 3);   // 1-3 件（body 略少）
  const items = [];
  for (let i = 0; i < n; i++) {
    const key = weightedPick(table);
    let inst = null;
    switch (key) {
      case 'junk_common': case 'junk_uncommon': case 'junk_rare':
      case 'junk_epic': case 'junk_legendary':
        inst = pickFrom(pools[key]());
        break;
      case 'ammo_any':
        inst = pickAmmo();
        break;
      case 'medical':
        inst = pickFrom(Object.values(MEDICAL));
        break;
      case 'throwable':
        inst = pickFrom(Object.values(THROWABLES));
        break;
      case 'weapon_loose': {
        const ids = ['mp5', 'm870', 'm45'];
        inst = pickFrom(ids.map(id => WEAPONS[id]));
        break;
      }
    }
    if (inst) {
      inst.qty = inst.kind === 'ammo' ? (inst.defId === 'ammo762' ? 10 : 20 + Math.floor(Math.random()*30)) : 1;
      items.push(inst);
    }
  }
  return items;
}

function pickFrom(arr) {
  const def = arr[Math.floor(Math.random() * arr.length)];
  return newItemInstance(def.id);
}
function pickAmmo() {
  return pickFrom(Object.values(AMMO));
}

// ---- 容器世界实体 ----
export class LootContainer {
  constructor(type, x, z, scene, collision) {
    this.type = type;             // crate/toolbox/medbox/safebox/ammobox
    this.searched = false;
    this.pos = new THREE.Vector3(x, collision.terrainHeight(x, z), z);
    this.mesh = this._makeMesh(scene);
    this.items = null;            // 打开时生成
    this.openedAt = 0;
  }
  _makeMesh(scene) {
    const geoByType = {
      crate:   new THREE.BoxGeometry(0.9, 0.7, 0.9),
      toolbox: new THREE.BoxGeometry(0.8, 0.55, 0.55),
      medbox:  new THREE.BoxGeometry(0.6, 0.7, 0.5),
      safebox: new THREE.BoxGeometry(0.75, 0.9, 0.7),
      ammobox: new THREE.BoxGeometry(0.7, 0.45, 0.5),
    };
    const colorByType = {
      crate: 0x7a5c34, toolbox: 0xb0432e, medbox: 0xe8e8e8, safebox: 0x3a4550, ammobox: 0x4a5a30,
    };
    const mat = new THREE.MeshLambertMaterial({ color: colorByType[this.type] });
    const m = new THREE.Mesh(geoByType[this.type], mat);
    m.position.copy(this.pos).y += geoHeight(this.type);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    this.baseGeoH = geoHeight(this.type);
    return m;
  }
  open() {
    if (!this.searched) {
      this.items = rollLoot(this.type);
      this.searched = true;
    }
    return this.items;
  }
  takeItem(idx) {
    if (!this.items || idx >= this.items.length) return null;
    return this.items.splice(idx, 1)[0];
  }
  get empty() { return this.searched && this.items && this.items.length === 0; }
}
function geoHeight(t) {
  return { crate: 0.35, toolbox: 0.28, medbox: 0.35, safebox: 0.45, ammobox: 0.23 }[t];
}

// 容器布点：按区域密度撒点（避免与建筑重叠由简单距离检查保证）
export function spawnContainers(count, scene, collision, worldBoxes) {
  const containers = [];
  const zones = [
    { cx: -65, cz: -60, r: 26, types: ['crate', 'toolbox', 'ammobox'] },     // 农场
    { cx: 66, cz: 56, r: 30, types: ['crate', 'toolbox', 'safebox', 'ammobox'] }, // 工业
    { cx: 10, cz: -86, r: 12, types: ['safebox', 'medbox', 'crate'] },       // 防空洞
    { cx: -20, cz: 50, r: 40, types: ['crate', 'medbox'] },                  // 中部民居
    { cx: 40, cz: -30, r: 35, types: ['crate', 'toolbox', 'ammobox'] },      // 东部
  ];
  let placed = 0, guard = 0;
  while (placed < count && guard++ < count * 30) {
    const zone = zones[Math.floor(Math.random() * zones.length)];
    const a = Math.random() * Math.PI * 2;
    const rr = Math.sqrt(Math.random()) * zone.r;
    const x = zone.cx + Math.cos(a) * rr;
    const z = zone.cz + Math.sin(a) * rr;
    if (Math.abs(z + 10) < 16) continue;                       // 不在河里
    let tooClose = false;
    for (const c of containers) {
      if (c.pos.distanceTo(new THREE.Vector3(x, 0, z)) < 4) { tooClose = true; break; }
    }
    if (tooClose) continue;
    const type = zone.types[Math.floor(Math.random() * zone.types.length)];
    containers.push(new LootContainer(type, x, z, scene, collision));
    placed++;
  }
  return containers;
}
