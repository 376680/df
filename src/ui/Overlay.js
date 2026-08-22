// 背包（Tab）与大地图（M）游戏内覆盖层
import { RARITY } from '../config.js';

export class OverlayManager {
  constructor(app) {
    this.app = app;
    this.open = null;    // 'inventory' | 'map' | null
    this.el = null;
  }

  toggle(kind) {
    if (this.open === kind) return this.close();
    this.close();
    this.open = kind;
    this._render();
  }
  close() {
    if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
    this.el = null;
    this.open = null;
  }

  _render() {
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'absolute', inset: '0', zIndex: '40',
      background: '#000a', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI','Microsoft YaHei',sans-serif", color: '#e8e4d8',
    });
    el.innerHTML = this.open === 'inventory' ? this._invHtml() : this._mapHtml();
    // 点击背景关闭
    el.addEventListener('mousedown', e => { if (e.target === el) this.close(); });
    const closeBtn = document.createElement('div');
    closeBtn.textContent = '✕ [Tab]';
    closeBtn.style.cssText = 'position:absolute;top:16px;right:24px;font-size:20px;cursor:pointer;opacity:.7;';
    closeBtn.onclick = () => this.close();
    el.appendChild(closeBtn);
    document.getElementById('app').appendChild(el);
    this.el = el;

    if (this.open === 'inventory') this._bindInv(el);
    else this._bindMap(el);
  }

  _invHtml() {
    const inv = this.game.inventory;
    const cells = [];
    for (let y = 0; y < inv.h; y++) {
      for (let x = 0; x < inv.w; x++) {
        const entry = inv.cells[y * inv.w + x];
        let html = '';
        if (entry && entry.origin[0] === x && entry.origin[1] === y) {
          const inst = entry.inst;
          const color = RARITY[inst.rarity].color;
          html = `<div class="dw-item" data-uid="${inst.uid}" style="
            left:${entry.origin[0]*52+2}px;top:${entry.origin[1]*52+2}px;
            width:${entry.gw*52-6}px;height:${entry.gh*52-6}px;
            background:${color}22;border-color:${color};color:${color};">${inst.name}${inst.qty>1?`<br>×${inst.qty}`:''}</div>`;
        }
        cells.push(`<div class="dw-cell">${html}</div>`);
      }
    }
    const value = inv.totalValue();
    return `
      <div style="background:#141a12ee;border:1px solid #ffffff20;border-radius:10px;padding:28px 34px;">
        <div style="font-size:20px;margin-bottom:4px;">背包</div>
        <div style="font-size:13px;opacity:.7;margin-bottom:8px;">总价值 ￥${value.toLocaleString()} · 点击物品丢弃</div>
        <div class="dw-inv-grid" id="ov-inv" style="position:relative;width:${inv.w*52+ (inv.w-1)*4}px;height:auto;">
          ${cells.join('')}
        </div>
        <div style="margin-top:14px;font-size:13px;line-height:1.9;opacity:.85;">
          医疗品：${this.game.player.medkitQty ? `${this.game.player.medkitId} ×${this.game.player.medkitQty}（按 H 使用）` : '无'}
          <br>投掷物：${this.game.player.throwable.length ? this.game.player.throwable.join(', ') : '无'}（按 G 快速投掷 / 4 切换）
        </div>
      </div>`;
  }

  _bindInv(el) {
    el.querySelectorAll('.dw-item').forEach(node => {
      node.onclick = () => {
        const uid = node.dataset.uid;
        const game = this.game;
        const entry = game.inventory.items.find(e => e.inst.uid === uid);
        if (!entry) return;
        game.dropItem(entry.inst);
        this._render();
      };
    });
  }

  _mapHtml() {
    const game = this.game;
    const extracts = game.extracts.map(e => `
      <div class="dw-kv"><span>${e.name}</span><span style="color:${e.open?'#7fd87f':'#888'}">
        ${e.open ? `开放 · ${Math.round(e.pos.distanceTo(game.player.pos))}m` : '关闭'}</span></div>`).join('');
    return `
      <div style="background:#141a12ee;border:1px solid #ffffff20;border-radius:10px;padding:28px 34px;width:min(560px,90vw);">
        <div style="font-size:20px;margin-bottom:10px;">战术地图 · 长弓溪谷</div>
        <canvas id="ov-map" width="500" height="500" style="width:100%;border:1px solid #ffffff20;border-radius:6px;background:#10160f;"></canvas>
        <h2 style="font-size:15px;margin-top:14px;">撤离点</h2>
        ${extracts}
        <div style="margin-top:8px;font-size:12px;opacity:.55;">白点=物资容器 · 红点=敌人 · 绿框=开放撤离点</div>
      </div>`;
  }

  _bindMap(el) {
    const canvas = el.querySelector('#ov-map');
    const ctx = canvas.getContext('2d');
    const game = this.game;
    const W = canvas.width;
    const scale = W / 260;
    const toMap = (x, z) => [W/2 + x * scale, W/2 + z * scale];

    // 地形底
    ctx.fillStyle = '#182016';
    ctx.fillRect(0, 0, W, W);
    // 河
    ctx.strokeStyle = '#2e6d8f'; ctx.lineWidth = 26 * scale;
    ctx.beginPath(); ctx.moveTo(toMap(-130, -10)[0], toMap(-130, -10)[1]);
    ctx.lineTo(toMap(130, -10)[0], toMap(130, -10)[1]); ctx.stroke();

    // 容器白点
    ctx.fillStyle = '#ccc';
    for (const c of game.containers) {
      const [mx, my] = toMap(c.pos.x, c.pos.z);
      if (!c.searched) ctx.fillRect(mx - 1.5, my - 1.5, 3, 3);
    }
    // 敌人
    ctx.fillStyle = '#e34f4f';
    for (const en of game.enemies) {
      if (en.dead) continue;
      const [mx, my] = toMap(en.pos.x, en.pos.z);
      ctx.beginPath(); ctx.arc(mx, my, 3, 0, Math.PI * 2); ctx.fill();
    }
    // 撤离点
    for (const e of game.extracts) {
      const [mx, my] = toMap(e.pos.x, e.pos.z);
      ctx.strokeStyle = e.open ? '#4fc76a' : '#666';
      ctx.lineWidth = 2;
      ctx.strokeRect(mx - 6, my - 6, 12, 12);
      ctx.fillStyle = e.open ? '#4fc76a' : '#666';
      ctx.font = '11px sans-serif';
      ctx.fillText(e.name, mx + 9, my + 4);
    }
    // 玩家
    const [px, py] = toMap(game.player.pos.x, game.player.pos.z);
    ctx.save();
    ctx.translate(px, py); ctx.rotate(game.player.yaw);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}
