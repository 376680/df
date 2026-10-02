// 一局游戏的总控：世界生成、实体管理、交互、撤离、结算
import * as THREE from 'three';
import { CONFIG, WEAPONS, MEDICAL, RARITY } from '../config.js';
import { buildWorld, EXTRACT_POINTS, SPAWN_POINTS } from '../world/WorldBuilder.js';
import { LootContainer, spawnContainers, itemValue } from '../loot/LootSystem.js';
import { Inventory } from '../loot/Inventory.js';
import { Player } from '../player/Player.js';
import { WeaponSystem } from '../combat/WeaponSystem.js';
import { Enemy } from '../combat/Enemy.js';
import { HUD } from '../ui/HUD.js';
import { OverlayManager } from '../ui/Overlay.js';
import { ResultScreen } from '../ui/Menus.js';
import { CollisionWorld } from '../world/CollisionWorld.js';

const EXTRACT_HOLD = CONFIG.extraction.holdTime;

export function createMatch(app) {
  const { renderer, scene, camera, input, audio, save } = app;

  const match = {
    time: 0,
    matchTimeLeft: CONFIG.world.matchTime,
    kills: 0,
    ended: false,
    extractProgress: null,
    healProgress: null,
    healTimer: 0,
    healTotal: 0,
    reinforceTimer: 0,
    disposables: [],
  };

  // ---- 碰撞与世界 ----
  const collision = new CollisionWorld();
  match.collision = collision;
  buildWorld(scene, collision);
  match.containers = spawnContainers(26, scene, collision);

  // ---- 玩家 ----
  const player = new Player(camera, input, collision, audio);
  match.player = player;
  player.equipLoadout(save.data.loadout);
  const spawn = SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];
  player.spawnAt(spawn.clone(), Math.random() * Math.PI * 2);

  // ---- 撤离点：全部开放 ----
  const shuffled = [...EXTRACT_POINTS].sort(() => Math.random() - 0.5);
  match.extracts = shuffled.map((e, i) => ({
    ...e, pos: e.pos.clone(), open: true,
  }));

  // ---- 敌人 ----
  match.enemies = [];
  const aiCfg = CONFIG.ai;
  const targetCount = aiCfg.countMin + Math.floor(Math.random() * (aiCfg.countMax - aiCfg.countMin + 1));
  // ---- HUD（提前创建，供事件回调使用） ----
  const hud = new HUD();
  match.hud = hud;
  hud.setVisible(true);

  // ---- 覆盖层（背包/地图/拾取面板） ----
  const overlay = new OverlayManager(app);
  match.overlay = overlay;

  const spawnAI = () => {
    let x, z, guard = 0;
    do {
      x = (Math.random() - 0.5) * 220; z = (Math.random() - 0.5) * 220;
      guard++;
    } while ((Math.abs(z + 10) < 14 || player.pos.distanceTo(new THREE.Vector3(x, 0, z)) < 45) && guard < 60);
    const tier = Math.random() < 0.25 ? 1 : 0;
    const enemy = new Enemy(scene, collision, new THREE.Vector3(x, 0, z), { tier });
    enemy.onDeath = e => onEnemyKilled(e);
    match.enemies.push(enemy);
    return enemy;
  };
  for (let i = 0; i < targetCount; i++) spawnAI();

  function onEnemyKilled(e) {
    match.kills++;
    audio.headshotDing();
    hud.addKillFeed(`你击倒了 ${e.tierName || '一名敌人'}`);
    // 尸体掉落包
    const body = new LootContainer('body', e.pos.x, e.pos.z, scene, collision);
    match.containers.push(body);
  }

  // ---- 武器系统接线 ----
  const weapons = new WeaponSystem({ scene, collision, audio, camera });
  match.weapons = weapons;
  weapons.enemies = match.enemies;
  weapons.onEnemyHit = (head) => {
    hud.showHitmarker(head);
    if (head) audio.headshotDing(); else audio.hit(player.pos);
  };
  weapons.onShot = (pos, radius) => {
    for (const e of match.enemies) if (!e.dead) e.hearNoise(pos, radius);
  };


  // ---- 玩家事件 ----
  player.onDamaged = (dmg, fromPos) => {
    if (fromPos) {
      const rel = Math.atan2(fromPos.x - player.pos.x, -(fromPos.z - player.pos.z)) - player.yaw;
      hud.showDamageDirection(rel);
    }
  };
  player.onDeath = () => endMatch(false);

  // ---- 输入绑定（一次性按键） ----
  const unbinds = [];
  unbinds.push(input.onKeyPress(code => {
    if (match.ended) return;
    switch (code) {
      case 'Tab': overlay.toggle('inventory'); break;
      case 'KeyM': overlay.toggle('map'); break;
      case 'Escape': if (overlay.open) overlay.close(); break;
      case 'Digit1': if (player.slots.primary) player.activeSlot = 'primary'; break;
      case 'Digit2': if (player.slots.secondary) player.activeSlot = 'secondary'; break;
      case 'Digit3': player.activeSlot = 'melee'; break;
      case 'Digit4':
        player.activeSlot = 'throwable';
        break;
      case 'KeyR': tryReload(); break;
      case 'KeyG': quickThrow(); break;
      case 'KeyE': interact(); break;
      case 'KeyH': useMedical(); break;
    }
  }));
  match.unbinds = unbinds;

  function activeWeaponState() {
    return player.activeSlot === 'primary' ? player.slots.primary
      : player.activeSlot === 'secondary' ? player.slots.secondary
      : player.activeSlot === 'melee' ? { defId: 'knife', ammoInMag: Infinity }
      : null;
  }

  let fireCooldown = 0, reloading = false;
  function tryReload() {
    const st = activeWeaponState();
    if (!st || reloading) return;
    if (weapons.reload(player, st, () => { reloading = false; })) reloading = true;
  }

  function quickThrow() {
    if (overlay.open) return;
    const gIdx = player.throwable.indexOf('grenade');
    if (gIdx === -1) { hud.addKillFeed('没有手雷'); return; }
    player.throwable.splice(gIdx, 1);
    weapons.throwGrenade(player, 'grenade');
  }

  function useMedical() {
    if (player.medkitQty <= 0 || match.healProgress != null) return;
    const med = MEDICAL[player.medkitId];
    match.healProgress = 0;
    match.healTotal = med.useTime;
    match._healAmount = med.heal;
  }

  // ---- 交互（搜刮）----
  let nearContainer = null;
  function findInteractable() {
    const eye = player.eyePos;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    let best = null, bestScore = 3.2;
    for (const c of match.containers) {
      if (c.empty) continue;
      const center = c.pos.clone(); center.y += 0.5;
      const to = center.sub(eye);
      const d = to.length();
      if (d > 3.2) continue;
      const align = to.normalize().dot(dir);
      const score = d - align;
      if (align > 0.55 && score < bestScore) { best = c; bestScore = score; }
    }
    return best;
  }

  function interact() {
    if (overlay.open === 'loot') { overlay.close(); return; }
    if (nearContainer) openLoot(nearContainer);
  }

  function openLoot(container) {
    const items = container.open();
    overlay.openLootPanel(container, items, inst => {
      if (inventory.add(inst)) {
        audio.pickup();
        container.takeItem(items.indexOf(inst));
        return true;
      }
      hud.addKillFeed('背包已满');
      return false;
    });
  }

  // 背包
  const inventory = new Inventory(4, 4);
  match.inventory = inventory;
  overlay.game = { get inventory() { return inventory; }, get player() { return player; },
    get enemies() { return match.enemies; }, get containers() { return match.containers; },
    get extracts() { return match.extracts; }, player,
    dropItem: inst => { inventory.remove(inst); respawnDropped(inst); } };

  function respawnDropped(inst) {
    const c = new LootContainer('crate', player.pos.x + 1, player.pos.z, scene, collision);
    c.items = [inst]; c.searched = true;
    match.containers.push(c);
  }
  // Overlay 需要 openLootPanel——动态挂载
  overlay.openLootPanel = (container, items, takeFn) => {
    overlay.close();
    overlay.open = 'loot';
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'absolute', inset: '0', zIndex: '40', background: '#000a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI','Microsoft YaHei',sans-serif", color: '#e8e4d8',
    });
    const renderItems = () => `
      <div style="background:#141a12ee;border:1px solid #ffffff20;border-radius:10px;padding:26px 32px;width:min(440px,90vw);">
        <div style="font-size:19px;margin-bottom:10px;">${containerTypeName(container.type)}${container.searched ? ' · 已搜刮' : ''}</div>
        ${items.length ? items.map((it, i) => `
          <div class="dw-kv" style="padding:7px 0;">
            <span style="color:${RARITY[it.rarity].color};cursor:pointer;" data-take="${i}">${it.name}${it.qty>1?' ×'+it.qty:''}</span>
            <span style="opacity:.6;">￥${itemValue(it).toLocaleString()}</span>
          </div>`).join('')
        : '<div style="opacity:.5;padding:20px 0;text-align:center;">空空如也</div>'}
        <div style="margin-top:14px;font-size:12px;opacity:.55;">点击物品拾取 · E/Esc 关闭</div>
      </div>`;
    el.innerHTML = renderItems();
    const rerender = () => { el.innerHTML = renderItems(); bind(); };
    const bind = () => {
      el.querySelectorAll('[data-take]').forEach(node => {
        node.onclick = () => {
          const idx = +node.dataset.take;
          const inst = items[idx];
          if (inst && takeFn(inst)) rerender();
        };
      });
    };
    bind();
    el.addEventListener('mousedown', e => { if (e.target === el) overlay.close(); });
    document.getElementById('app').appendChild(el);
    overlay.el = el;
  };

  // ---- 主循环 ----
  let lastT = performance.now();
  let rafId = 0;
  let heartbeatAcc = 0;

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (match.ended) return;
    match.time += dt;
    match.matchTimeLeft -= dt;

    const uiBlocked = !!overlay.open;
    input.enabled = !uiBlocked;
    if (!uiBlocked && input.locked === false && !match.ended && !app.paused) input.requestLock();

    // 射击
    fireCooldown -= dt;
    if (!uiBlocked && !reloading && fireCooldown <= 0) {
      const st = activeWeaponState();
      const def = st ? WEAPONS[st.defId] : null;
      if (def && input.m0) {
        if (weapons.fire(player, st, input.m2)) {
          fireCooldown = 60 / def.rpm;
          if (def.boltAction || def.pump) fireCooldown += (def.boltAction || def.pump);
        } else fireCooldown = 0.15;
      }
      // 近战也走 m0
      if (def?.type === 'melee' && input.m0 && fireCooldown <= 0) {
        weapons.fire(player, st, false);
        fireCooldown = 60 / def.rpm;
      }
    }
    if (!input.m0 && activeWeaponState()) { /* 松开即可再射 */ }

    // 换弹期间禁止射击
    if (reloading) fireCooldown = Math.max(fireCooldown, 0.05);

    // 投掷物切换后按左键投掷
    if (!uiBlocked && player.activeSlot === 'throwable' && input.m0 && fireCooldown <= 0) {
      const t = player.throwable[0];
      if (t) {
        player.throwable.shift();
        weapons.throwGrenade(player, t);
        fireCooldown = 0.8;
        if (player.throwable.length === 0) player.activeSlot = player.slots.primary ? 'primary' : 'secondary';
      }
    }

    // 更新实体
    if (!uiBlocked) {
      weapons.applyRecoilToCamera(player, dt);
      player.update(dt);
      for (const e of match.enemies) {
        e.update(dt, player, (dmg, fromPos) => {
          if (dmg) player.takeDamage(dmg, fromPos);
          // AI 枪声：命中与 miss 都发声（带方向衰减）
          audio.gunshot(e.pos, 'rifle');
          // AI 开火反馈：曳光（命中指向玩家，miss 加随机偏移）
          const tracerFrom = e.muzzlePos.clone();
          const tracerTo = player.pos.clone();
          tracerTo.y += 1.1;
          if (!dmg) {
            tracerTo.x += (Math.random() - 0.5) * 3;
            tracerTo.y += (Math.random() - 0.5) * 3;
            tracerTo.z += (Math.random() - 0.5) * 3;
          }
          const tracerDir = tracerTo.clone().sub(tracerFrom).normalize();
          weapons.spawnTracer(tracerFrom, tracerDir, tracerFrom.distanceTo(tracerTo));
        });
      }
    }
    weapons.updateProjectiles(dt, (pos, radius, maxDmg) => {
      const d = player.pos.distanceTo(pos);
      if (d < radius) player.takeDamage(maxDmg * (1 - d / radius), pos);
    }, match.enemies);

    // 治疗
    if (match.healProgress != null) {
      if (uiBlocked) { /* 打开UI打断 */ match.healProgress = null; }
      else {
        match.healProgress += dt / match.healTotal;
        if (match.healProgress >= 1) {
          player.heal(match._healAmount);
          player.medkitQty--;
          match.healProgress = null;
          audio.pickup();
        }
      }
    }

    // 补员
    match.reinforceTimer += dt;
    if (match.reinforceTimer > CONFIG.ai.reinforceInterval) {
      match.reinforceTimer = 0;
      const alive = match.enemies.filter(e => !e.dead).length;
      if (alive < CONFIG.ai.countMax) {
        for (let i = 0; i < CONFIG.ai.reinforceBatch && alive + i < CONFIG.ai.countMax; i++) spawnAI();
      }
    }

    // 交互检测 & 撤离
    nearContainer = findInteractable();
    updateExtraction(dt);

    // 音频听者
    const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
    audio.updateListener(player.eyePos, fwd, new THREE.Vector3(0, 1, 0));

    // 低血量表现
    const hpFrac = player.hp / player.maxHp;
    hud.setHurtVignette(hpFrac < 0.35 ? (0.35 - hpFrac) * 1.8 : 0);
    if (hpFrac < 0.3 && hpFrac > 0) {
      heartbeatAcc += dt;
      if (heartbeatAcc > 1.1) { heartbeatAcc = 0; audio.heartbeat(); }
    }

    // 超时判定
    if (match.matchTimeLeft <= 0) endMatch(false, '时间耗尽，行动失败');

    // HUD
    hud.update({
      hp: player.hp, maxHp: player.maxHp, armor: player.armor, stamina: player.stamina,
      weaponName: weaponDisplayName(),
      magAmmo: magDisplay(), reserveAmmo: reserveDisplay(),
      matchTimeLeft: match.matchTimeLeft,
      extracts: match.extracts.map(e => ({
        name: e.name, open: e.open, pos: e.pos, dist: e.pos.distanceTo(player.pos),
      })),
      playerPos: player.pos, playerYaw: player.yaw, enemies: match.enemies,
      interactLabel: nearContainer ? `[E] ${containerTypeName(nearContainer.type)}${nearContainer.searched ? '（已搜）' : ''}` : null,
      extractProgress: match.extractProgress,
      healProgress: match.healProgress,
    });

    renderer.render(scene, camera);
  }

  function weaponDisplayName() {
    const st = activeWeaponState();
    if (player.activeSlot === 'throwable') return player.throwable[0] === 'smoke' ? '烟雾弹' : '破片手雷';
    return st ? WEAPONS[st.defId]?.name : '—';
  }
  function magDisplay() {
    const st = activeWeaponState();
    if (!st) return '-';
    const def = WEAPONS[st.defId];
    return def.type === 'melee' ? '∞' : st.ammoInMag;
  }
  function reserveDisplay() {
    const st = activeWeaponState();
    if (!st) return '-';
    const def = WEAPONS[st.defId];
    if (def.type === 'melee') return '';
    if (player.activeSlot === 'throwable') return `×${player.throwable.length}`;
    return player.reserveAmmo[def.ammoId] ?? 0;
  }

  function updateExtraction(dt) {
    match.extractProgress = null;
    if (!player.onGround) return;
    for (const e of match.extracts) {
      if (!e.open) continue;
      const d = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
      if (d < e.radius) {
        match._extAccum = (match._extAccum || 0) + dt;
        match.extractProgress = Math.min(1, match._extAccum / EXTRACT_HOLD);
        if (match._extAccum >= EXTRACT_HOLD) { endMatch(true); return; }
        return;
      }
    }
    match._extAccum = 0;
  }

  function endMatch(survived, reasonText) {
    if (match.ended) return;
    match.ended = true;
    cancelAnimationFrame(rafId);
    overlay.close();
    hud.setVisible(false);
    input.releaseLock();
    input.enabled = true;

    // 结算数据
    const stashValue = survived ? inventory.totalValue() : 0;
    const secureValue = (save.data.loadout.secure || []).length * 0;   // 安全箱价值不计入本局收益
    let koenEarned = survived ? Math.round(stashValue * 1.15) : Math.round(inventory.totalValue() * 0);   // 死亡一无所有
    koenEarned += match.kills * 800;                                    // 击杀奖励

    // 物品明细
    const detail = survived ? inventory.items.map(e => ({
      name: e.inst.name, qty: e.inst.qty || 1, value: e.inst.value, color: RARITY[e.inst.rarity].color,
    })) : [];

    // 存档更新
    const st = save.data.stats;
    st.matches++; st.kills += match.kills;
    if (survived) {
      st.extractions++;
      save.data.koen += koenEarned;
      // 带出的物品进仓库（弹药合并堆叠）
      for (const entry of inventory.items) {
        const ex = save.data.stash.find(s => s.defId === entry.inst.defId);
        if (ex) ex.qty += (entry.inst.qty || 1);
        else save.data.stash.push({ defId: entry.inst.defId, qty: entry.inst.qty || 1 });
      }
      if (stashValue > st.bestRun) { st.bestRun = stashValue; match.newBest = true; }
    } else {
      st.deaths++;
      save.data.koen += koenEarned;
    }
    save.save();

    const dur = match.time;
    setTimeout(() => {
      new ResultScreen(app).show({
        survived, kills: match.kills, durationSec: dur,
        itemsValue: stashValue, itemsDetail: detail, koenEarned,
        bestRun: match.newBest ? stashValue : null,
        onBack: () => { cleanupMatch(match); app.toMainMenu(); },
      });
      if (reasonText && !survived) {
        // 失败原因已在标题下展示（简化为击杀行）
      }
    }, survived ? 400 : 1200);
  }

  rafId = requestAnimationFrame(frame);

  match.cleanup = () => {
    cancelAnimationFrame(rafId);
    unbinds.forEach(u => u());
    hud.setVisible(false);
    overlay.close();
    for (const e of match.enemies) e.dispose();
    scene.clear();
  };
  return match;
}

function containerTypeName(t) {
  return { crate: '木箱', toolbox: '工具箱', medbox: '医疗箱', safebox: '保险柜', ammobox: '弹药箱', body: '尸体包' }[t] || t;
}

export function cleanupMatch(match) {
  if (match && match.cleanup) match.cleanup();
}
