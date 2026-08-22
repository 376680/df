// 存档管理：仓库/货币/战绩/设置，localStorage 持久化
const SAVE_KEY = 'delta-web-save-v1';
const VERSION = 1;

export class SaveManager {
  constructor() {
    this.data = this._load();
  }
  _default() {
    return {
      version: VERSION,
      koen: 128000,
      stash: [],               // [{id, qty}] 物品堆叠
      loadout: {
        primary: 'aks74u', secondary: 'm45',
        armor: 'armor_light',
        ammo: { ammo556: 120, ammo9: 60 },
        grenades: 2, smokes: 1,
        medkit: 'medkit', medkitQty: 2,
        secure: [],              // 安全箱物品 id 数组（最多4）
      },
      stats: { matches: 0, extractions: 0, kills: 0, deaths: 0, bestRun: 0 },
      settings: { sens: 1.0, volume: 0.7, fov: 75, shadows: true, drawDist: 1.0 },
    };
  }
  _load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return this._default();
      const data = JSON.parse(raw);
      if (data.version !== VERSION) return this._migrate(data);
      return Object.assign(this._default(), data);
    } catch (e) {
      console.warn('存档读取失败，使用默认', e);
      return this._default();
    }
  }
  _migrate(old) {
    // v1 为首个版本；未来版本在此扩展
    return Object.assign(this._default(), old, { version: VERSION });
  }
  save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); }
    catch (e) { console.warn('存档写入失败', e); }
  }
  export() { return JSON.stringify(this.data, null, 2); }
  import(json) {
    const data = JSON.parse(json);
    if (typeof data.koen !== 'number' || !Array.isArray(data.stash)) throw new Error('格式不合法');
    this.data = Object.assign(this._default(), data, { version: VERSION });
    this.save();
  }
  reset() { this.data = this._default(); this.save(); }
}
