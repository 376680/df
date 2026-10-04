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
      background: 'rgba(2,10,6,.72)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI','Microsoft YaHei',sans-serif", color: '#eafff4',
    });
    el.innerHTML = this.open === 'inventory' ? this._invHtml() : this._mapHtml();
    // 点击背景关闭
    el.addEventListener('mousedown', e => { if (e.target === el) this.close(); });
    const closeBtn = document.createElement('div');
    closeBtn.textContent = '✕ [Tab]';
    closeBtn.style.cssText = 'position:absolute;top:16px;right:24px;font-size:20px;cursor:pointer;color:#d2f0dc;letter-spacing:1px;';
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
      <div class="dw-ovl" style="background:rgba(6,20,12,.92);border:1px solid rgba(90,255,150,.28);border-radius:2px;padding:28px 34px;max-height:90vh;overflow:auto;box-shadow:0 18px 60px rgba(0,0,0,.5),0 0 40px rgba(20,140,70,.15);">
        <div style="font-size:20px;letter-spacing:4px;margin-bottom:4px;color:#eafff4;">背包</div>
        <div style="font-size:13px;color:#a6c9b2;margin-bottom:8px;">总价值 ￥${value.toLocaleString()} · 点击物品丢弃</div>
        <div class="dw-inv-grid" id="ov-inv" style="position:relative;width:${inv.w*52+ (inv.w-1)*4}px;height:auto;">
          ${cells.join('')}
        </div>
        <div style="margin-top:14px;font-size:13px;line-height:1.9;color:#d2f0dc;">
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
      <div class="dw-kv"><span>${e.name}</span><span style="color:${e.open?'#3fe0b0':'#74a284'}">
        ${e.open ? `开放 · ${Math.round(e.pos.distanceTo(game.player.pos))}m` : '关闭'}</span></div>`).join('');
    return `
      <div class="dw-ovl" style="background:rgba(6,20,12,.92);border:1px solid rgba(90,255,150,.28);border-radius:2px;padding:28px 34px;width:min(560px,90vw);max-height:90vh;overflow:auto;box-shadow:0 18px 60px rgba(0,0,0,.5),0 0 40px rgba(20,140,70,.15);">
        <div style="font-size:20px;letter-spacing:4px;margin-bottom:10px;color:#eafff4;">战术地图 · 长弓溪谷</div>
        <canvas id="ov-map" width="500" height="500" style="width:100%;border:1px solid rgba(90,255,150,.3);border-radius:2px;background:#03120a;"></canvas>
        <h2 style="font-size:15px;letter-spacing:2px;margin-top:14px;color:#9fe8bd;">撤离点</h2>
        ${extracts}
        <div style="margin-top:8px;font-size:12px;color:#74a284;">浅绿点=物资容器 · 红点=敌人 · 绿框=开放撤离点</div>
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
    ctx.fillStyle = '#061409';
    ctx.fillRect(0, 0, W, W);
    // 网格
    ctx.strokeStyle = 'rgba(90,255,150,.08)'; ctx.lineWidth = 1;
    for (let g = 50; g < W; g += 50) {
      ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, W); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(W, g); ctx.stroke();
    }
    // 河
    ctx.strokeStyle = '#0e5233'; ctx.lineWidth = 26 * scale;
    ctx.beginPath(); ctx.moveTo(toMap(-130, -10)[0], toMap(-130, -10)[1]);
    ctx.lineTo(toMap(130, -10)[0], toMap(130, -10)[1]); ctx.stroke();

    // 容器浅蓝点
    ctx.fillStyle = '#bfffdc';
    for (const c of game.containers) {
      const [mx, my] = toMap(c.pos.x, c.pos.z);
      if (!c.searched) ctx.fillRect(mx - 1.5, my - 1.5, 3, 3);
    }
    // 敌人
    ctx.fillStyle = '#ff5560';
    for (const en of game.enemies) {
      if (en.dead) continue;
      const [mx, my] = toMap(en.pos.x, en.pos.z);
      ctx.beginPath(); ctx.arc(mx, my, 3, 0, Math.PI * 2); ctx.fill();
    }
    // 撤离点
    for (const e of game.extracts) {
      const [mx, my] = toMap(e.pos.x, e.pos.z);
      ctx.strokeStyle = e.open ? '#3fe0b0' : '#5f8a6f';
      ctx.lineWidth = 2;
      ctx.strokeRect(mx - 6, my - 6, 12, 12);
      ctx.fillStyle = e.open ? '#3fe0b0' : '#5f8a6f';
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
