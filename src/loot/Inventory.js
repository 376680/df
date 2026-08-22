// 背包：格子制 inventory（4x4 起），支持自动摆放、堆叠（仅弹药）
export class Inventory {
  constructor(w = 4, h = 4) {
    this.w = w; this.h = h;
    this.cells = Array.from({ length: w * h }, () => null); // {inst, origin:[gx,gy]}
    this.items = [];                                        // 引用列表便于遍历
  }

  canPlace(gw, gh) {
    for (let y = 0; y <= this.h - gh; y++) {
      for (let x = 0; x <= this.w - gw; x++) {
        if (this._areaFree(x, y, gw, gh)) return [x, y];
      }
    }
    return null;
  }
  _areaFree(x0, y0, gw, gh) {
    for (let y = y0; y < y0 + gh; y++)
      for (let x = x0; x < x0 + gw; x++)
        if (this.cells[y * this.w + x]) return false;
    return true;
  }
  _place(inst, x, y, gw, gh) {
    const entry = { inst, origin: [x, y], gw, gh };
    for (let yy = y; yy < y + gh; yy++)
      for (let xx = x; xx < x + gw; xx++)
        this.cells[yy * this.w + xx] = entry;
    this.items.push(entry);
    return entry;
  }

  add(inst) {
    if (!inst) return false;
    // 弹药可堆叠
    if (inst.kind === 'ammo') {
      const exist = this.items.find(e => e.inst.kind === 'ammo' && e.inst.defId === inst.defId);
      if (exist) { exist.inst.qty += inst.qty; return true; }
    }
    const spot = this.canPlace(inst.grid[0], inst.grid[1]);
    if (!spot) return false;
    this._place(inst, spot[0], spot[1], inst.grid[0], inst.grid[1]);
    return true;
  }

  remove(inst) {
    const idx = this.items.findIndex(e => e.inst === inst);
    if (idx === -1) return false;
    const entry = this.items[idx];
    const [x, y] = entry.origin;
    for (let yy = y; yy < y + entry.gh; yy++)
      for (let xx = x; xx < x + entry.gw; xx++)
        this.cells[yy * this.w + xx] = null;
    this.items.splice(idx, 1);
    return true;
  }

  totalValue() {
    return this.items.reduce((s, e) => s + e.inst.value * (e.inst.qty || 1), 0);
  }
  count() { return this.items.length; }
  clear() {
    this.cells.fill(null);
    this.items.length = 0;
  }
}
