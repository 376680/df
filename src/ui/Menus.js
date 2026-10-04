// UI 屏幕管理：主菜单 / 军备 / 结算 / 背包 / 大地图
import { WEAPONS, ARMORS, AMMO, MEDICAL, THROWABLES, RARITY, JUNK } from '../config.js';

const CSS = `
.dw-menu { position:absolute; inset:0; z-index:50; color:#eafff4;
  font-family:'Segoe UI','Microsoft YaHei',sans-serif;
  background:
    linear-gradient(rgba(0,255,133,.05) 1px, transparent 1px) 0 0/46px 46px,
    linear-gradient(90deg, rgba(0,255,133,.05) 1px, transparent 1px) 0 0/46px 46px,
    radial-gradient(1100px 640px at 68% 14%, rgba(20,140,70,.3), transparent 62%),
    linear-gradient(160deg,#0a2818f5,#03140bf7);
  display:flex; align-items:center; justify-content:center; }
.dw-menu::before,.dw-menu::after { content:''; position:absolute; width:36px; height:36px; pointer-events:none; }
.dw-menu::before { left:16px; top:16px; border-left:2px solid rgba(0,255,133,.75); border-top:2px solid rgba(0,255,133,.75); }
.dw-menu::after { right:16px; bottom:16px; border-right:2px solid rgba(0,255,133,.75); border-bottom:2px solid rgba(0,255,133,.75); }
.dw-panel { position:relative; width:min(880px,92vw); max-height:90vh; overflow:auto; padding:34px 40px;
  background:rgba(6,20,12,.84); border:1px solid rgba(90,255,150,.28); border-radius:2px;
  box-shadow:0 18px 60px rgba(0,0,0,.55), inset 0 0 70px rgba(20,140,70,.1); }
.dw-panel h1 { font-size:34px; letter-spacing:9px; margin-bottom:4px; color:#eafff4;
  text-shadow:0 0 22px rgba(0,255,133,.5); }
.dw-panel h1::after { content:''; display:block; width:76px; height:2px; margin-top:12px;
  background:linear-gradient(90deg,#00ff85,rgba(0,255,133,0)); }
.dw-panel h2 { font-size:17px; letter-spacing:2px; margin:20px 0 8px; color:#9fe8bd;
  border-bottom:1px solid rgba(90,255,150,.16); padding-bottom:5px; }
.dw-panel h2::before { content:''; display:inline-block; width:3px; height:12px; margin-right:9px;
  background:#00ff85; box-shadow:0 0 8px rgba(0,255,133,.8); vertical-align:-1px; }
.dw-btn { display:inline-block; padding:11px 30px; margin:6px 8px 0 0; cursor:pointer;
  background:linear-gradient(180deg,rgba(0,255,133,.16),rgba(0,255,133,.05));
  border:1px solid rgba(90,255,150,.42); border-radius:1px; font-size:15px; letter-spacing:2px;
  color:#e6fff2; text-shadow:0 0 10px rgba(0,255,133,.4);
  transition:background .15s, box-shadow .15s, border-color .15s; pointer-events:auto; }
.dw-btn:hover { background:linear-gradient(180deg,rgba(0,255,133,.32),rgba(0,255,133,.14));
  border-color:#5dffb0; box-shadow:0 0 20px rgba(0,255,133,.35), inset 0 0 14px rgba(0,255,133,.16); }
.dw-btn.small { padding:7px 16px; font-size:13.5px; }
.dw-btn.danger { background:linear-gradient(180deg,rgba(255,90,106,.16),rgba(255,90,106,.05));
  border-color:rgba(255,120,130,.4); }
.dw-btn.danger:hover { background:linear-gradient(180deg,rgba(255,90,106,.32),rgba(255,90,106,.14));
  border-color:#ff8a96; box-shadow:0 0 20px rgba(255,90,106,.3); }
.dw-row { display:flex; gap:10px; flex-wrap:wrap; margin:6px 0; }
.dw-card { flex:1; min-width:170px; padding:12px 14px; background:rgba(10,30,18,.45);
  border:1px solid rgba(90,255,150,.2); border-radius:2px; cursor:pointer;
  transition:border-color .15s, box-shadow .15s, background .15s; }
.dw-card:hover { border-color:rgba(90,255,150,.5); box-shadow:0 0 14px rgba(0,255,133,.15); }
.dw-card.sel { border-color:#00ff85; background:rgba(0,255,133,.14);
  box-shadow:0 0 16px rgba(0,255,133,.28), inset 0 0 20px rgba(0,255,133,.1); }
.dw-card .t { font-weight:600; font-size:14.5px; margin-bottom:3px; color:#e6fff2; }
.dw-card .s { font-size:12.5px; color:#a6c9b2; line-height:1.5; }
.dw-stat { display:inline-block; margin-right:22px; font-size:14px; color:#d2f0dc;}
.dw-kv { display:flex; justify-content:space-between; font-size:13.5px; padding:3px 0; border-bottom:1px dashed rgba(90,255,150,.14);}
table.dw-tbl { width:100%; border-collapse:collapse; font-size:13px; margin-top:6px;}
table.dw-tbl th, table.dw-tbl td { padding:5px 8px; text-align:left; border-bottom:1px solid rgba(90,255,150,.14);}
input[type=range]{ pointer-events:auto; width:180px; accent-color:#00ff85;}
textarea{ pointer-events:auto; width:100%; height:80px; background:rgba(4,16,10,.8); color:#d2f0dc;
  border:1px solid rgba(90,255,150,.3); border-radius:2px; padding:8px; font-family:monospace; font-size:12px;}
select,input[type=text]{pointer-events:auto; background:rgba(4,16,10,.8); color:#eafff4;
  border:1px solid rgba(90,255,150,.3); border-radius:2px; padding:4px 8px;}
select:focus,input[type=text]:focus,textarea:focus{outline:none;border-color:#5dffb0;box-shadow:0 0 12px rgba(0,255,133,.3);}
.dw-inv-grid { display:grid; grid-template-columns:repeat(4,52px); grid-auto-rows:52px; gap:4px; margin-top:8px;}
.dw-cell { position:relative; background:rgba(8,26,16,.55); border:1px solid rgba(90,255,150,.15); border-radius:1px;}
.dw-item { position:absolute; display:flex; align-items:center; justify-content:center; font-size:10.5px;
  text-align:center; border-radius:1px; overflow:hidden; cursor:pointer; border:1px solid; line-height:1.25; pointer-events:auto;}
.dw-overlay-close { position:absolute;top:14px;right:20px;cursor:pointer;font-size:22px;color:#a6c9b2;pointer-events:auto;
  transition:color .15s, text-shadow .15s;}
.dw-overlay-close:hover{color:#5dffb0;text-shadow:0 0 12px rgba(0,255,133,.7);}
.dw-panel::-webkit-scrollbar,.dw-ovl::-webkit-scrollbar{width:8px;}
.dw-panel::-webkit-scrollbar-track,.dw-ovl::-webkit-scrollbar-track{background:rgba(4,16,10,.55);}
.dw-panel::-webkit-scrollbar-thumb,.dw-ovl::-webkit-scrollbar-thumb{background:rgba(0,255,133,.28);border:1px solid rgba(90,255,150,.35);}
.dw-panel::-webkit-scrollbar-thumb:hover,.dw-ovl::-webkit-scrollbar-thumb:hover{background:rgba(0,255,133,.5);}
`;

let styleInjected = false;
function injectStyle() {
  if (styleInjected) return;
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.appendChild(s);
  styleInjected = true;
}

export class UIScreen {
  constructor(app) {
    injectStyle();
    this.app = app;
    this.root = null;
  }

  _mount(html) {
    this._unmount();
    const wrap = document.createElement('div');
    wrap.innerHTML = html.trim();
    this.root = wrap.firstElementChild;      // .dw-menu
    document.getElementById('app').appendChild(this.root);
    return this.root;
  }
  _unmount() {
    if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
    this.root = null;
  }
  get mounted() { return !!this.root; }
}

// ---------- 主菜单 ----------
export class MainMenu extends UIScreen {
  show(save) {
    const st = save.data.stats;
    const el = this._mount(`
      <div class="dw-menu"><div class="dw-panel">
        <h1>DELTA-WEB</h1>
        <div style="opacity:.65;margin-bottom:20px;">烽火地带 · 单人撤离射击</div>
        <div class="dw-stat">Koen 币 <b id="mm-koen" style="color:#5dffb0;">${save.data.koen.toLocaleString()}</b></div>
        <div class="dw-stat">总局数 ${st.matches}</div>
        <div class="dw-stat">撤离率 ${st.matches ? Math.round(st.extractions / st.matches * 100) : 0}%</div>
        <div class="dw-stat">K/D ${(st.kills / Math.max(1, st.deaths)).toFixed(2)}</div>
        <div class="dw-stat">最高单局收益 <span style="color:#3fe0b0">${st.bestRun.toLocaleString()}</span></div>
        <h2>行动</h2>
        <div>
          <span class="dw-btn" id="btn-start">开始行动</span>
          <span class="dw-btn" id="btn-loadout">军备配置</span>
          <span class="dw-btn" id="btn-settings">设置</span>
          <span class="dw-btn" id="btn-guide">玩法说明</span>
        </div>
        <div id="mm-extra"></div>
      </div></div>`);

    el.querySelector('#btn-start').onclick = () => { this._unmount(); this.app.startMatch(); };
    el.querySelector('#btn-loadout').onclick = () => new LoadoutMenu(this.app).show(save);
    el.querySelector('#btn-settings').onclick = () => new SettingsMenu(this.app).show(save);
    el.querySelector('#btn-guide').onclick = () => this._guide(el.querySelector('#mm-extra'));
    return el;
  }
  _guide(container) {
    container.innerHTML = `
      <h2>玩法说明</h2>
      <div class="s" style="font-size:13.5px;line-height:2;">
        跳伞进入封锁区，搜刮物资并从撤离点带出。死亡失去本局背包内一切。<br>
        WASD 移动 · Shift 冲刺 · C 蹲伏 · Ctrl 缓步 · 空格跳 · R 换弹 · E 搜刮/交互 · G 扔雷 · Tab 背包 · M 地图<br>
        鼠标左键射击 · 右键开镜 · 1/2 切换枪械 · 3 近战 · 4 投掷物 · 滚轮切枪<br>
        AI 会听到枪声并搜索；草丛与蹲伏降低被发现概率。安全箱物品无论存亡都保留。
      </div>`;
  }
}

// ---------- 军备配置 ----------
export class LoadoutMenu extends UIScreen {
  show(save) {
    const L = save.data.loadout;
    const price = id => WEAPONS[id]?.price || ARMORS[id]?.price || MEDICAL[id]?.price || 0;

    const weaponCards = ids => ids.map(id => {
      const w = WEAPONS[id];
      return `<div class="dw-card ${L.primary === id || L.secondary === id ? 'sel' : ''}" data-w="${id}">
        <div class="t">${w.name}</div>
        <div class="s">伤害 ${w.dmg} · 射速 ${w.rpm}rpm · 弹匣 ${w.mag}<br>￥${w.price.toLocaleString()}</div>
      </div>`;
    }).join('');

    const armorCards = Object.values(ARMORS).map(a =>
      `<div class="dw-card ${L.armor === a.id ? 'sel' : ''}" data-a="${a.id}">
        <div class="t">${a.name}</div>
        <div class="s">减伤 ${Math.round(a.defense * 100)}% · 耐久 ${a.durability}<br>￥${a.price.toLocaleString()}</div>
      </div>`).join('');

    const el = this._mount(`
      <div class="dw-menu"><div class="dw-panel">
        <div class="dw-overlay-close" id="lo-back">✕</div>
        <h1 style="font-size:24px;">军备配置</h1>
        <h2>主武器</h2><div class="dw-row">${weaponCards(['aks74u','mp5','m700','m870'])}</div>
        <h2>副武器</h2><div class="dw-row">${weaponCards(['m45'])}</div>
        <h2>护甲</h2><div class="dw-row">${armorCards}</div>
        <h2>弹药与投掷物</h2>
        <div class="dw-row" style="font-size:13.5px;">
          ${Object.values(AMMO).map(a => `<label class="dw-card" style="cursor:default;min-width:130px;flex:none;">
            <div class="t">${a.name}</div><div class="s">携弹量：<input type="text" data-ammo="${a.id}"
              value="${L.ammo[a.id] ?? 0}" style="width:56px;"></div></label>`).join('')}
          <label class="dw-card" style="cursor:default;min-width:120px;flex:none;">
            <div class="t">破片手雷</div><div class="s">数量：
              <select id="ld-grenades">${[0,1,2,3].map(n=>`<option ${L.grenades===n?'selected':''}>${n}</option>`).join('')}</select></div></label>
          <label class="dw-card" style="cursor:default;min-width:120px;flex:none;">
            <div class="t">烟雾弹</div><div class="s">数量：
              <select id="ld-smokes">${[0,1,2].map(n=>`<option ${L.smokes===n?'selected':''}>${n}</option>`).join('')}</select></div></label>
          <label class="dw-card" style="cursor:default;min-width:140px;flex:none;">
            <div class="t">医疗品</div><div class="s">
              <select id="ld-medkit">${Object.values(MEDICAL).map(m=>`<option value="${m.id}" ${L.medkit===m.id?'selected':''}>${m.name}</option>`).join('')}</select>
              × <select id="ld-medqty">${[0,1,2,3].map(n=>`<option ${L.medkitQty===n?'selected':''}>${n}</option>`).join('')}</select></div></label>
        </div>
        <h2>安全箱（局内存亡保留，最多4格）</h2>
        <div class="dw-row" id="secure-row"></div>
        <div style="margin-top:18px;">
          <span class="dw-btn small" id="lo-done">保存并返回</span>
        </div>
      </div></div>`);

    // 安全箱：从仓库选择物品放入
    const secureRow = el.querySelector('#secure-row');
    const renderSecure = () => {
      secureRow.innerHTML = '';
      for (let i = 0; i < 4; i++) {
        const slot = document.createElement('div');
        slot.className = 'dw-card';
        slot.style.cssText += 'flex:none;min-width:150px;';
        const item = L.secure[i];
        slot.innerHTML = item ? `<div class="t" style="color:${RARITY[JUNK.find(j=>j.id===item)?.rarity||'common'].color}">
            ${JUNK.find(j=>j.id===item)?.name || item}</div><div class="s">点击移除</div>`
          : '<div class="t" style="opacity:.4;">空格位</div>';
        slot.onclick = () => { if (item) { L.secure.splice(i, 1); renderSecure(); save.save(); } };
        secureRow.appendChild(slot);
      }
      // 可放入的仓库杂物
      const stashJunk = save.data.stash.filter(s => JUNK.some(j => j.id === s.defId));
      if (stashJunk.length) {
        const pick = document.createElement('div');
        pick.className = 'dw-card'; pick.style.cssText += 'flex:none;min-width:200px;';
        pick.innerHTML = `<div class="t">+ 从仓库放入</div><div class="s">
          <select id="sec-pick">${stashJunk.map(s => {
            const j = JUNK.find(x => x.id === s.defId);
            return `<option value="${j.id}" style="color:${RARITY[j.rarity].color}">${j.name} ￥${j.value}</option>`;
          }).join('')}</select></div>`;
        pick.querySelector('#sec-pick').onchange = e => {
          const defId = e.target.value;
          if (L.secure.length < 4) {
            L.secure.push(defId);
            const si = save.data.stash.findIndex(s => s.defId === defId);
            if (--save.data.stash[si].qty <= 0) save.data.stash.splice(si, 1);
            save.save(); renderSecure(); renderSecure();
          }
        };
        secureRow.appendChild(pick);
      }
    };
    renderSecure();

    el.querySelectorAll('[data-w]').forEach(c => c.onclick = () => {
      const id = c.dataset.w;
      if (WEAPONS[id].slot === 'primary') L.primary = id; else L.secondary = id;
      save.save(); this.show(save);
    });
    el.querySelectorAll('[data-a]').forEach(c => c.onclick = () => {
      L.armor = c.dataset.a; save.save(); this.show(save);
    });
    el.querySelectorAll('[data-ammo]').forEach(inp => inp.onchange = () => {
      L.ammo[inp.dataset.ammo] = Math.max(0, parseInt(inp.value) || 0); save.save();
    });
    el.querySelector('#ld-grenades').onchange = e => { L.grenades = +e.target.value; save.save(); };
    el.querySelector('#ld-smokes').onchange = e => { L.smokes = +e.target.value; save.save(); };
    el.querySelector('#ld-medkit').onchange = e => { L.medkit = e.target.value; save.save(); };
    el.querySelector('#ld-medqty').onchange = e => { L.medkitQty = +e.target.value; save.save(); };

    el.querySelector('#lo-back').onclick = el.querySelector('#lo-done').onclick =
      () => { save.save(); new MainMenu(this.app).show(save); };
    return el;
  }
}

// ---------- 设置 ----------
export class SettingsMenu extends UIScreen {
  show(save) {
    const S = save.data.settings;
    const el = this._mount(`
      <div class="dw-menu"><div class="dw-panel">
        <div class="dw-overlay-close" id="st-back">✕</div>
        <h1 style="font-size:24px;">设置</h1>
        <h2>操作</h2>
        <div class="dw-row" style="align-items:center;font-size:14px;">
          灵敏度 <input type="range" id="st-sens" min="0.2" max="3" step="0.05" value="${S.sens}">
          <span id="st-sens-v">${S.sens.toFixed(2)}</span>
        </div>
        <h2>画面</h2>
        <div class="dw-row" style="align-items:center;font-size:14px;">
          视野 FOV <input type="range" id="st-fov" min="60" max="110" step="1" value="${S.fov}">
          <span id="st-fov-v">${S.fov}</span>
        </div>
        <div class="dw-row" style="font-size:14px;">
          <label><input type="checkbox" id="st-shadow" ${S.shadows?'checked':''}> 阴影</label>
          绘制距离 <input type="range" id="st-dd" min="0.5" max="1.5" step="0.1" value="${S.drawDist}">
        </div>
        <h2>音频</h2>
        <div class="dw-row" style="align-items:center;font-size:14px;">
          音量 <input type="range" id="st-vol" min="0" max="1" step="0.05" value="${S.volume}">
          <span id="st-vol-v">${S.volume}</span>
        </div>
        <h2>存档</h2>
        <div class="dw-row"><textarea id="st-save" spellcheck="false">${save.export()}</textarea></div>
        <div class="dw-row">
          <span class="dw-btn small" id="st-import">导入存档</span>
          <span class="dw-btn small danger" id="st-reset">重置全部进度</span>
        </div>
        <div style="margin-top:16px;"><span class="dw-btn" id="st-done">完成</span></div>
      </div></div>`);

    const bindRange = (id, key, fmt, cb) => {
      const inp = el.querySelector(id);
      const out = el.querySelector(id + '-v');
      inp.oninput = () => {
        const v = parseFloat(inp.value);
        S[key] = v; out.textContent = fmt(v); save.save();
        if (cb) cb(v);
      };
    };
    bindRange('#st-sens', 'sens', v => v.toFixed(2));
    bindRange('#st-fov', 'fov', v => Math.round(v), v => this.app.applySettings());
    bindRange('#st-vol', 'volume', v => v.toFixed(2), v => this.app.audio.setVolume(v));
    bindRange('#st-dd', 'drawDist', v => v.toFixed(1), v => this.app.applySettings());
    el.querySelector('#st-shadow').onchange = e => { S.shadows = e.target.checked; save.save(); this.app.applySettings(); };

    el.querySelector('#st-import').onclick = () => {
      try { save.import(el.querySelector('#st-save').value); alert('导入成功'); }
      catch (err) { alert('导入失败：' + err.message); }
    };
    el.querySelector('#st-reset').onclick = () => {
      if (confirm('确认重置所有进度？此操作不可撤销。')) {
        save.reset(); new MainMenu(this.app).show(save);
      }
    };
    el.querySelector('#st-back').onclick = el.querySelector('#st-done').onclick =
      () => new MainMenu(this.app).show(save);
    return el;
  }
}

// ---------- 结算 ----------
export class ResultScreen extends UIScreen {
  show({ survived, kills, durationSec, itemsValue, itemsDetail, koenEarned, bestRun, onBack }) {
    const m = Math.floor(durationSec / 60), s = Math.floor(durationSec % 60);
    const rows = (itemsDetail || []).map(d => `
      <div class="dw-kv"><span style="color:${d.color}">${d.name}${d.qty > 1 ? ` ×${d.qty}` : ''}</span>
      <span>￥${(d.value * d.qty).toLocaleString()}</span></div>`).join('');
    const el = this._mount(`
      <div class="dw-menu"><div class="dw-panel" style="max-width:560px;">
        <h1 style="font-size:28px;color:${survived ? '#3fe0b0' : '#ff5a6a'};">${survived ? '撤离成功' : '任务失败'}</h1>
        <div style="margin:10px 0 16px;font-size:14px;">
          <span class="dw-stat">存活 ${m}:${String(s).padStart(2,'0')}</span>
          <span class="dw-stat">击杀 ${kills}</span>
          <span class="dw-stat">带出价值 ￥${itemsValue.toLocaleString()}</span>
        </div>
        ${rows ? `<h2>带出明细</h2>${rows}` : ''}
        <h2>结算</h2>
        <div class="dw-kv"><span>获得 Koen</span><span style="color:#5dffb0;">+${koenEarned.toLocaleString()}</span></div>
        ${bestRun ? `<div class="dw-kv"><span>新纪录！</span><span style="color:#3fe0b0;">￥${bestRun.toLocaleString()}</span></div>` : ''}
        <div style="margin-top:20px;"><span class="dw-btn" id="rs-back">返回基地</span></div>
      </div></div>`);
    el.querySelector('#rs-back').onclick = onBack;
    return el;
  }
}
