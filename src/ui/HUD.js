// HUD：准星、血条、弹药、小地图、命中反馈、击杀 feed、受击方向
export class HUD {
  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'hud';
    Object.assign(this.root.style, {
      position: 'absolute', inset: '0', pointerEvents: 'none',
      fontFamily: "'Segoe UI', 'Microsoft YaHei', sans-serif",
      color: '#eafff4', userSelect: 'none', zIndex: 10,
      background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 58%, rgba(4,18,9,.36) 100%)',
    });
    document.getElementById('app').appendChild(this.root);
    this._build();
    this.killFeedTimer = 0;
  }

  _build() {
    // 准星（四线 + 扩散由 JS 控制）
    this.crosshair = document.createElement('div');
    this.crosshair.style.cssText = `position:absolute;left:50%;top:50%;width:0;height:0;`;
    const mkLine = (rot, off) => {
      const l = document.createElement('div');
      l.style.cssText = `position:absolute;background:#e6fff2dd;box-shadow:0 0 4px #00ff8599;width:2px;height:${off}px;` +
        `left:-1px;top:-1px;transform-origin:center;transform:rotate(${rot}deg) translateY(-${6 + off/2}px);`;
      return l;
    };
    for (const r of [0, 90, 180, 270]) this.crosshair.appendChild(mkLine(r, 7));
    this.root.appendChild(this.crosshair);

    // 命中标记
    this.hitmarker = document.createElement('div');
    this.hitmarker.textContent = '✕';
    this.hitmarker.style.cssText = `position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      font-size:22px;color:#5dffb0;opacity:0;transition:opacity .18s;font-weight:bold;text-shadow:0 0 9px currentColor;`;
    this.root.appendChild(this.hitmarker);

    // 左下：生命/护甲/体力
    const statusBox = document.createElement('div');
    statusBox.style.cssText = `position:absolute;left:24px;bottom:24px;width:230px;`;
    statusBox.innerHTML = `
      <div id="hp-bar" style="height:14px;background:rgba(4,16,10,.72);border:1px solid rgba(90,255,150,.35);border-radius:1px;overflow:hidden;margin-bottom:5px;">
        <div style="height:100%;width:100%;background:linear-gradient(90deg,#ff8a7a,#ff4d5e);box-shadow:0 0 10px rgba(255,77,94,.45);transition:width .15s"></div>
      </div>
      <div id="armor-bar" style="height:8px;background:rgba(4,16,10,.72);border:1px solid rgba(90,255,150,.35);border-radius:1px;overflow:hidden;margin-bottom:5px;">
        <div style="height:100%;width:0%;background:linear-gradient(90deg,#12b85c,#5dffb0);box-shadow:0 0 10px rgba(0,255,133,.45);transition:width .15s"></div>
      </div>
      <div id="stam-bar" style="height:6px;background:rgba(4,16,10,.72);border:1px solid rgba(90,255,150,.35);border-radius:1px;overflow:hidden;">
        <div style="height:100%;width:100%;background:linear-gradient(90deg,#a8f0c8,#e6fff2);transition:width .1s"></div>
      </div>`;
    this.root.appendChild(statusBox);

    // 右下：弹药与武器名
    this.ammoBox = document.createElement('div');
    this.ammoBox.style.cssText = `position:absolute;right:28px;bottom:24px;text-align:right;
      text-shadow:0 1px 3px #000,0 0 14px rgba(0,255,133,.35);`;
    this.ammoBox.innerHTML = `<div id="wpn-name" style="font-size:12px;letter-spacing:2.5px;color:#8affc2;"></div>
      <div><span id="ammo-mag" style="font-size:30px;font-weight:700;letter-spacing:1px;font-variant-numeric:tabular-nums;">-</span>
      <span id="ammo-res" style="font-size:15px;color:#a6c9b2;font-variant-numeric:tabular-nums;">/-</span></div>`;
    this.root.appendChild(this.ammoBox);

    // 中下：交互提示
    this.interactHint = document.createElement('div');
    this.interactHint.style.cssText = `position:absolute;left:50%;bottom:26%;transform:translateX(-50%);
      font-size:13.5px;letter-spacing:1.5px;padding:5px 14px;background:rgba(6,22,13,.8);border:1px solid rgba(90,255,150,.45);border-radius:1px;
      box-shadow:0 0 18px rgba(0,255,133,.18);backdrop-filter:blur(4px);color:#e6fff2;
      opacity:0;transition:opacity .12s;white-space:nowrap;`;
    this.root.appendChild(this.interactHint);

    // 顶部中间：计时 + 撤离点状态
    this.topbar = document.createElement('div');
    this.topbar.style.cssText = `position:absolute;top:14px;left:50%;transform:translateX(-50%);
      text-align:center;text-shadow:0 1px 3px #000;color:#e6fff2;`;
    this.root.appendChild(this.topbar);

    // 小地图（右上）
    this.minimapCanvas = document.createElement('canvas');
    this.minimapCanvas.width = 170; this.minimapCanvas.height = 170;
    Object.assign(this.minimapCanvas.style, {
      position: 'absolute', right: '20px', top: '20px',
      border: '1px solid rgba(90,255,150,.4)', borderRadius: '2px', background: 'rgba(4,16,8,.85)',
      boxShadow: '0 0 22px rgba(0,255,133,.16)',
    });
    this.root.appendChild(this.minimapCanvas);

    // 击杀 feed（右上小地图下方）
    this.feed = document.createElement('div');
    this.feed.style.cssText = `position:absolute;right:20px;top:205px;width:240px;text-align:right;
      font-size:12.5px;color:#d2f0dc;text-shadow:0 1px 2px #000;`;
    this.root.appendChild(this.feed);

    // 受击方向指示
    this.dmgIndicator = document.createElement('div');
    this.dmgIndicator.style.cssText = `position:absolute;left:50%;top:50%;width:130px;height:130px;
      transform:translate(-50%,-50%);opacity:0;transition:opacity .3s;`;
    this.root.appendChild(this.dmgIndicator);

    // 低血量红晕
    this.hurtVignette = document.createElement('div');
    this.hurtVignette.style.cssText = `position:absolute;inset:0;box-shadow:inset 0 0 140px 40px rgba(160,20,20,0);
      transition:box-shadow .4s;`;
    this.root.appendChild(this.hurtVignette);

    // 撤离进度条
    this.extractBarWrap = document.createElement('div');
    this.extractBarWrap.style.cssText = `position:absolute;left:50%;top:60%;transform:translateX(-50%);
      width:280px;opacity:0;transition:opacity .2s;text-align:center;`;
    this.extractBarWrap.innerHTML = `<div id="ext-label" style="font-size:13.5px;letter-spacing:2px;margin-bottom:6px;color:#e6fff2;">撤离中…</div>
      <div style="height:10px;background:rgba(4,16,10,.72);border:1px solid rgba(90,255,150,.4);border-radius:1px;overflow:hidden;">
      <div id="ext-fill" style="height:100%;width:0%;background:linear-gradient(90deg,#12b85c,#5dffb0);box-shadow:0 0 12px rgba(0,255,133,.5);"></div></div>`;
    this.root.appendChild(this.extractBarWrap);

    // 使用医疗进度
    this.healBarWrap = this.extractBarWrap.cloneNode(true);
    this.healBarWrap.id = '';
    this.healBarWrap.style.top = '66%';
    this.healBarWrap.querySelector('#ext-label').textContent = '治疗中…';
    this.healBarWrap.querySelector('#ext-fill').style.background = 'linear-gradient(90deg,#1fb890,#3fe0b0)';
    this.healBarWrap.querySelector('#ext-fill').style.boxShadow = '0 0 12px rgba(63,224,176,.5)';
    this.healBarWrap.style.opacity = '0';
    this.root.appendChild(this.healBarWrap);
  }

  update({ hp, maxHp, armor, stamina, weaponName, magAmmo, reserveAmmo,
           matchTimeLeft, extracts, playerPos, playerYaw, enemies, containersNearby,
           interactLabel, extractProgress, healProgress }) {
    // 血条
    const hpFill = this.root.querySelector('#hp-bar div');
    hpFill.style.width = `${(hp / maxHp) * 100}%`;
    hpFill.style.background = hp > 60 ? 'linear-gradient(90deg,#ff8a7a,#ff4d5e)'
      : hp > 25 ? 'linear-gradient(90deg,#ffb35c,#ff8a3d)' : '#ff2d3d';
    const armorFill = this.root.querySelector('#armor-bar div');
    armorFill.style.width = armor ? `${(armor.durability / armor.maxDurability) * 100}%` : '0%';
    const stamFill = this.root.querySelector('#stam-bar div');
    stamFill.style.width = `${stamina}%`;

    // 弹药
    this.root.querySelector('#wpn-name').textContent = weaponName || '—';
    this.root.querySelector('#ammo-mag').textContent = magAmmo ?? '-';
    this.root.querySelector('#ammo-res').textContent = `/${reserveAmmo ?? '-'}`;

    // 计时 & 撤离点
    const m = Math.floor(Math.max(0, matchTimeLeft) / 60);
    const s = Math.floor(Math.max(0, matchTimeLeft) % 60).toString().padStart(2, '0');
    let extHtml = `<div style="font-size:21px;font-weight:600;letter-spacing:2px;font-variant-numeric:tabular-nums;text-shadow:0 0 14px rgba(0,255,133,.5);">${m}:${s}</div>`;
    if (extracts) {
      for (const e of extracts) {
        const color = e.open ? '#3fe0b0' : '#74a284';
        const dist = Math.round(e.dist);
        extHtml += `<div style="font-size:12.5px;color:${color};">${e.name} ${e.open ? '· 开放' : '· 关闭'} · ${dist}m</div>`;
      }
    }
    this.topbar.innerHTML = extHtml;

    // 交互提示
    if (interactLabel) {
      this.interactHint.textContent = interactLabel;
      this.interactHint.style.opacity = '1';
    } else this.interactHint.style.opacity = '0';

    // 撤离/治疗进度
    this.extractBarWrap.style.opacity = extractProgress != null ? '1' : '0';
    if (extractProgress != null)
      this.extractBarWrap.querySelector('#ext-fill').style.width = `${extractProgress * 100}%`;
    this.healBarWrap.style.opacity = healProgress != null ? '1' : '0';
    if (healProgress != null)
      this.healBarWrap.querySelector('#ext-fill').style.width = `${healProgress * 100}%`;

    this._minimap(playerPos, playerYaw, enemies, extracts);
    this._updateCrosshairSpread();
  }

  _minimap(playerPos, yaw, enemies, extracts) {
    const ctx = this.minimapCanvas.getContext('2d');
    const W = this.minimapCanvas.width, H = this.minimapCanvas.height;
    ctx.clearRect(0, 0, W, H);
    const scale = W / 260;   // 显示半径 ±130m
    const cx = W / 2, cy = H / 2;
    const toMap = (x, z) => [cx + x * scale, cy + z * scale];

    // 雷达网格
    ctx.strokeStyle = 'rgba(90,255,150,.13)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, W * .22, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, W * .44, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 4); ctx.lineTo(cx, H - 4);
    ctx.moveTo(4, cy); ctx.lineTo(W - 4, cy); ctx.stroke();

    // 玩家箭头（中心，随朝向旋转）
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(yaw);
    ctx.fillStyle = '#eafff4';
    ctx.shadowColor = 'rgba(0,255,133,.9)'; ctx.shadowBlur = 7;
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(4.5, 5); ctx.lineTo(-4.5, 5); ctx.closePath(); ctx.fill();
    ctx.restore();

    // 敌人红点
    ctx.fillStyle = '#ff5560';
    for (const en of enemies || []) {
      if (en.dead) continue;
      const rel = { x: en.pos.x - playerPos.x, z: en.pos.z - playerPos.z };
      if (Math.abs(rel.x) > 128 || Math.abs(rel.z) > 128) continue;
      const [mx, my] = toMap(rel.x, rel.z);
      ctx.beginPath(); ctx.arc(mx, my, 3, 0, Math.PI * 2); ctx.fill();
    }
    // 撤离点标记
    for (const e of extracts || []) {
      ctx.fillStyle = e.open ? '#3fe0b0' : '#5f8a6f';
      const [mx, my] = toMap(e.pos.x - playerPos.x, e.pos.z - playerPos.z);
      ctx.fillRect(mx - 3, my - 3, 6, 6);
    }
  }

  _updateCrosshairSpread() {}

  showHitmarker(head) {
    this.hitmarker.style.color = head ? '#ffffff' : '#5dffb0';
    this.hitmarker.style.opacity = '1';
    clearTimeout(this._hmT);
    this._hmT = setTimeout(() => this.hitmarker.style.opacity = '0', 140);
  }

  showDamageDirection(angleFromView) {
    // angleFromView: 弧度，0=正前方
    const deg = angleFromView * 180 / Math.PI;
    this.dmgIndicator.innerHTML =
      `<div style="position:absolute;left:50%;top:50%;width:120px;height:120px;transform:translate(-50%,-50%) rotate(${deg}deg);">
        <div style="position:absolute;left:50%;top:-8px;transform:translateX(-50%);width:70px;height:16px;
          background:radial-gradient(ellipse at center,rgba(255,40,40,.9),transparent 70%);border-radius:50%;"></div>
      </div>`;
    this.dmgIndicator.style.opacity = '1';
    clearTimeout(this._diT);
    this._diT = setTimeout(() => this.dmgIndicator.style.opacity = '0', 1500);
  }

  setHurtVignette(intensity) {
    this.hurtVignette.style.boxShadow = `inset 0 0 140px 40px rgba(160,20,20,${intensity})`;
  }

  addKillFeed(text) {
    const row = document.createElement('div');
    row.textContent = text;
    row.style.cssText = 'margin-top:3px;color:#bfffdc;transition:opacity .5s;';
    this.feed.prepend(row);
    setTimeout(() => { row.style.opacity = '0'; }, 3500);
    setTimeout(() => row.remove(), 4200);
  }

  setVisible(v) { this.root.style.display = v ? '' : 'none'; }
}
