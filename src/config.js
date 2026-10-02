// DELTA-WEB · 全局配置与物品/武器数据库
export const CONFIG = {
  world: {
    size: 240,              // 地图边长（米）
    gravity: 22,
    matchTime: 4 * 60,     // 一局 4 分钟
    fogColor: 0x8f7a5e,
    fogDensity: 0.0065,
    skyColor: 0xc4a06a,
  },
  player: {
    height: 1.7,
    crouchHeight: 1.1,
    radius: 0.35,
    walkSpeed: 4.6,
    sprintSpeed: 7.6,
    crouchSpeed: 2.2,
    jumpVel: 7.2,
    staminaMax: 100,
    staminaDrain: 18,       // 每秒冲刺消耗
    staminaRegen: 14,       // 每秒恢复
    fallDamageThreshold: 4, // 超过 4m 开始计算跌落伤
  },
  extraction: { holdTime: 5 },   // 撤离读秒
  ai: {
    viewDist: 55,
    fovDeg: 110,
    hearRadius: 75,
    fireRange: 40,
    countMin: 5,
    countMax: 7,
    reinforceInterval: 300,
    reinforceBatch: 2,
  },
};

export const RARITY = {
  common:    { name: '普通', color: '#c9c9c9', mult: 1.0 },
  uncommon:  { name: '罕见', color: '#5fd35f', mult: 1.6 },
  rare:      { name: '稀有', color: '#4aa3ff', mult: 2.6 },
  epic:      { name: '史诗', color: '#b26bff', mult: 4.5 },
  legendary: { name: '传说', color: '#ffb340', mult: 8.0 },
};

// 武器数据库。dmg 单发伤害；rpm 射速；mag 弹匣；reload 秒；
// recoil [垂直,水平]（度/发）；spread 腰射基础扩散(度)；adsSpread 开镜扩散
export const WEAPONS = {
  aks74u: {
    id: 'aks74u', name: 'AKS-74U 突击步枪', type: 'rifle', slot: 'primary',
    dmg: 28, rpm: 650, mag: 30, reload: 2.4, ammoId: 'ammo556',
    recoil: [1.35, 0.45], spread: 3.2, adsSpread: 0.55, auto: true,
    adsFov: 52, range: 120, price: 38000, headMult: 2.0,
  },
  mp5: {
    id: 'mp5', name: 'MP5 冲锋枪', type: 'smg', slot: 'primary',
    dmg: 19, rpm: 800, mag: 30, reload: 2.0, ammoId: 'ammo9',
    recoil: [0.85, 0.35], spread: 3.8, adsSpread: 0.9, auto: true,
    adsFov: 58, range: 80, price: 26000, headMult: 1.8,
  },
  m700: {
    id: 'm700', name: 'M700 栓动狙击', type: 'sniper', slot: 'primary',
    dmg: 85, rpm: 41, mag: 5, reload: 3.6, ammoId: 'ammo762',
    recoil: [4.2, 0.8], spread: 4.5, adsSpread: 0.03, auto: false,
    adsFov: 20, range: 300, price: 72000, headMult: 2.5, boltAction: 1.15,
  },
  m870: {
    id: 'm870', name: 'M870 霰弹枪', type: 'shotgun', slot: 'primary',
    dmg: 9, pellets: 8, rpm: 68, mag: 5, reload: 3.2, ammoId: 'shell12',
    recoil: [3.6, 1.1], spread: 6.5, adsSpread: 4.2, auto: false,
    adsFov: 60, range: 30, price: 31000, headMult: 1.6, pump: 0.75,
  },
  m45: {
    id: 'm45', name: 'M45 手枪', type: 'pistol', slot: 'secondary',
    dmg: 22, rpm: 400, mag: 12, reload: 1.7, ammoId: 'ammo45',
    recoil: [0.9, 0.4], spread: 4.0, adsSpread: 1.1, auto: false,
    adsFov: 60, range: 50, price: 9800, headMult: 1.8,
  },
  knife: {
    id: 'knife', name: '战术刀', type: 'melee', slot: 'melee',
    dmg: 55, rpm: 110, mag: Infinity, reload: 0, ammoId: null,
    recoil: [0, 0], spread: 0, adsSpread: 0, auto: false,
    meleeRange: 2.2, price: 1500, headMult: 1.5,
  },
};

export const AMMO = {
  ammo556: { id: 'ammo556', name: '5.56mm 步枪弹', boxSize: 60, pricePerBox: 2400, rarity: 'common' },
  ammo9:   { id: 'ammo9',   name: '9mm 手枪弹',   boxSize: 60, pricePerBox: 1600, rarity: 'common' },
  ammo762: { id: 'ammo762', name: '7.62mm 狙击弹', boxSize: 20, pricePerBox: 3200, rarity: 'uncommon' },
  shell12: { id: 'shell12', name: '12号 鹿弹',     boxSize: 20, pricePerBox: 2000, rarity: 'common' },
  ammo45:  { id: 'ammo45',  name: '.45 ACP',       boxSize: 30, pricePerBox: 1800, rarity: 'common' },
};

export const ARMORS = {
  armor_light:  { id: 'armor_light',  name: '轻型防弹衣', defense: 0.25, durability: 40, price: 18000, rarity: 'uncommon' },
  armor_heavy:  { id: 'armor_heavy',  name: '重型防弹衣', defense: 0.42, durability: 65, price: 42000, rarity: 'rare' },
};

export const MEDICAL = {
  bandage: { id: 'bandage', name: '绷带', heal: 30, useTime: 3.0, price: 900,  grid: [1,1], rarity: 'common' },
  medkit:  { id: 'medkit',  name: '急救包', heal: 70, useTime: 5.0, price: 3600, grid: [2,1], rarity: 'uncommon' },
  surgery: { id: 'surgery', name: '手术包', heal: 100, useTime: 8.0, price: 9800, grid: [2,2], rarity: 'rare' },
};

export const THROWABLES = {
  grenade: { id: 'grenade', name: '破片手雷', fuseTime: 2.5, radius: 7, maxDmg: 120, price: 2800, grid: [1,1], rarity: 'uncommon' },
  smoke:   { id: 'smoke',   name: '烟雾弹', fuseTime: 1.8, duration: 20, price: 1400, grid: [1,1], rarity: 'common' },
};

// 杂物（纯卖钱）
export const JUNK = [
  { id: 'gold_bar',    name: '金条',         value: 42000, weight: 2, rarity: 'legendary', grid: [1,1] },
  { id: 'gpu',         name: '显卡',         value: 26000, weight: 2, rarity: 'epic',      grid: [2,1] },
  { id: 'cpu',         name: '服务器CPU',    value: 15500, weight: 2, rarity: 'epic',      grid: [1,1] },
  { id: 'watch_rolex', name: '机械腕表',     value: 11800, weight: 1, rarity: 'rare',      grid: [1,1] },
  { id: 'lion_figurine',name: '狮子雕像',    value: 16800, weight: 2, rarity: 'rare',      grid: [2,1] },
  { id: 'hard_drive',  name: '军用硬盘',     value: 8600,  weight: 1, rarity: 'uncommon',  grid: [1,1] },
  { id: 'powercord',   name: '电源线',       value: 2100,  weight: 1, rarity: 'common',    grid: [1,1] },
  { id: 'bolt',        name: '一包螺栓',     value: 1300,  weight: 1, rarity: 'common',    grid: [1,1] },
  { id: 'lamp',        name: '旧台灯',       value: 1700,  weight: 2, rarity: 'common',    grid: [2,1] },
  { id: 'beer',        name: '罐装啤酒',     value: 600,   weight: 1, rarity: 'common',    grid: [1,1] },
];

// 搜刮权重表：容器类型 → [池, 权重]
export const LOOT_TABLES = {
  crate:    [ ['junk_common', 5], ['junk_uncommon', 3], ['ammo_any', 3], ['medical', 1], ['throwable', 1] ],
  toolbox:  [ ['junk_uncommon', 4], ['junk_rare', 2], ['ammo_any', 3], ['throwable', 1] ],
  medbox:   [ ['medical', 6], ['junk_common', 1] ],
  safebox:  [ ['junk_legendary', 2], ['junk_epic', 4], ['junk_rare', 3], ['weapon_loose', 1] ],
  ammobox:  [ ['ammo_any', 8], ['throwable', 2] ],
  body:     [ ['ammo_any', 4], ['medical', 2], ['junk_common', 3], ['weapon_loose', 1] ],
};

export const KEYBINDS = {
  forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD',
  sprint: 'ShiftLeft', crouch: 'KeyC', jump: 'Space', walk: 'ControlLeft',
  reload: 'KeyR', interact: 'KeyE', inventory: 'Tab', map: 'KeyM',
  slotPrimary: 'Digit1', slotSecondary: 'Digit2', slotMelee: 'Digit3', slotThrowable: 'Digit4',
  throwGrenade: 'KeyG', flashlight: 'KeyF',
};
