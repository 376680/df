// HUD：准星、血条、弹药、小地图、命中反馈、击杀 feed、受击方向
export class HUD {
  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'hud';
    Object.assign(this.root.style, {
      position: 'absolute', inset: '0', pointerEvents: 'none',
      fontFamily: "'Segoe UI', 'Microsoft YaHei', sans-serif",
      color: '#e8e4d8', userSelect: 'none', zIndex: 10,
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
      l.style.cssText = `position:absolute;background:#e8e4d8cc;width:2px;height:${off}px;` +
        `left:-1px;top:-1px;transform-origin:center;transform:rotate(${rot}deg) translateY(-${6 + off/2}px);`;
      return l;
    };
    for (const r of [0, 90, 180, 270]) this.crosshair.appendChild(mkLine(r, 7));
    this.root.appendChild(this.crosshair);

    // 命中标记
    this.hitmarker = document.createElement('div');
    this.hitmarker.textContent = '✕';
    this.hitmarker.style.cssText = `position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      font-size:22px;color:#ff5533;opacity:0;transition:opacity .18s;font-weight:bold;`;
    this.root.appendChild(this.hitmarker);

    // 左下：生命/护甲/体力
    const statusBox = document.createElement('div');
    statusBox.style.cssText = `position:absolute;left:24px;bottom:24px;width:230px;`;
    statusBox.innerHTML = `
      <div id="hp-bar" style="height:14px;background:#0008;border:1px solid #fff3;border-radius:2px;overflow:hidden;margin-bottom:5px;">
        <div style="height:100%;width:100%;background:#c94f42;transition:width .15s"></div>
      </div>
      <div id="armor-bar" style="height:8px;background:#0008;border:1px solid #fff3;border-radius:2px;overflow:hidden;margin-bottom:5px;">
        <div style="height:100%;width:0%;background:#5b87c5;transition:width .15s"></div>
      </div>
      <div id="stam-bar" style="height:6px;background:#0008;border:1px solid #fff3;border-radius:2px;overflow:hidden;">
        <div style="height:100%;width:100%;background:#d0b04a;transition:width .1s"></div>
      </div>`;
    this.root.appendChild(statusBox);

    // 右下：弹药与武器名
    this.ammoBox = document.createElement('div');
    this.ammoBox.style.cssText = `position:absolute;right:28px;bottom:24px;text-align:right;
      text-shadow:0 1px 3px #000;`;
    this.ammoBox.innerHTML = `<div id="wpn-name" style="font-size:13px;opacity:.85;"></div>
      <div><span id="ammo-mag" style="font-size:30px;font-weight:700;">-</span>
      <span id="ammo-res" style="font-size:15px;opacity:.75;">/-</span></div>`;
    this.root.appendChild(this.ammoBox);

    // 中下：交互提示
    this.interactHint = document.createElement('div');
    this.interactHint.style.cssText = `position:absolute;left:50%;bottom:26%;transform:translateX(-50%);
      font-size:14px;padding:4px 12px;background:#000a;border:1px solid #ffffff22;border-radius:3px;
      opacity:0;transition:opacity .12s;white-space:nowrap;`;
    this.root.appendChild(this.interactHint);

    // 顶部中间：计时 + 撤离点状态
    this.topbar = document.createElement('div');
    this.topbar.style.cssText = `position:absolute;top:14px;left:50%;transform:translateX(-50%);
      text-align:center;text-shadow:0 1px 3px #000;`;
    this.root.appendChild(this.topbar);

    // 小地图（右上）
    this.minimapCanvas = document.createElement('canvas');
    this.minimapCanvas.width = 170; this.minimapCanvas.height = 170;
    Object.assign(this.minimapCanvas.style, {
      position: 'absolute', right: '20px', top: '20px',
      border: '1px solid #ffffff33', borderRadius: '4px', background: '#1118',
    });
    this.root.appendChild(this.minimapCanvas);

    // 击杀 feed（右上小地图下方）
    this.feed = document.createElement('div');
    this.feed.style.cssText = `position:absolute;right:20px;top:205px;width:240px;text-align:right;
      font-size:12.5px;text-shadow:0 1px 2px #000;`;
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
    this.extractBarWrap.innerHTML = `<div id="ext-label" style="font-size:14px;margin-bottom:5px;">撤离中…</div>
      <div style="height:10px;background:#000a;border:1px solid #fff4;border-radius:3px;overflow:hidden;">
      <div id="ext-fill" style="height:100%;width:0%;background:#4fc76a;"></div></div>`;
    this.root.appendChild(this.extractBarWrap);

    // 使用医疗进度
    this.healBarWrap = this.extractBarWrap.cloneNode(true);
    this.healBarWrap.id = '';
    this.healBarWrap.style.top = '66%';
    this.healBarWrap.querySelector('#ext-label').textContent = '治疗中…';
    this.healBarWrap.querySelector('#ext-fill').style.background = '#c94f42';
    this.healBarWrap.style.opacity = '0';
    this.root.appendChild(this.healBarWrap);
  }

  update({ hp, maxHp, armor, stamina, weaponName, magAmmo, reserveAmmo,
           matchTimeLeft, extracts, playerPos, playerYaw, enemies, containersNearby,
           interactLabel, extractProgress, healProgress }) {
    // 血条
    const hpFill = this.root.querySelector('#hp-bar div');
    hpFill.style.width = `${(hp / maxHp) * 100}%`;
    hpFill.style.background = hp > 60 ? '#c94f42' : hp > 25 ? '#d0762e' : '#ff2222';
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
    let extHtml = `<div style="font-size:20px;font-weight:600;">${m}:${s}</div>`;
    if (extracts) {
      for (const e of extracts) {
        const color = e.open ? '#4fc76a' : '#888';
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

    // 玩家箭头（中心，随朝向旋转）
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(yaw);
    ctx.fillStyle = '#e8e4d8';
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(4.5, 5); ctx.lineTo(-4.5, 5); ctx.closePath(); ctx.fill();
    ctx.restore();

    // 敌人红点
    ctx.fillStyle = '#e34f4f';
    for (const en of enemies || []) {
      if (en.dead) continue;
      const rel = { x: en.pos.x - playerPos.x, z: en.pos.z - playerPos.z };
      if (Math.abs(rel.x) > 128 || Math.abs(rel.z) > 128) continue;
      const [mx, my] = toMap(rel.x, rel.z);
      ctx.beginPath(); ctx.arc(mx, my, 3, 0, Math.PI * 2); ctx.fill();
    }
    // 撤离点绿标
    for (const e of extracts || []) {
      ctx.fillStyle = e.open ? '#4fc76a' : '#777';
      const [mx, my] = toMap(e.pos.x - playerPos.x, e.pos.z - playerPos.z);
      ctx.fillRect(mx - 3, my - 3, 6, 6);
    }
  }

  _updateCrosshairSpread() {}

  showHitmarker(head) {
    this.hitmarker.style.color = head ? '#ffd23a' : '#ff5533';
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
    row.style.cssText = 'margin-top:3px;color:#ffb08a;transition:opacity .5s;';
    this.feed.prepend(row);
    setTimeout(() => { row.style.opacity = '0'; }, 3500);
    setTimeout(() => row.remove(), 4200);
  }

  setVisible(v) { this.root.style.display = v ? '' : 'none'; }
}
