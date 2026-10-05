# DELTA-WEB

网页端 3D 第一人称撤离射击游戏（致敬《三角洲行动》烽火地带玩法，非原创实现，基于vimalinx/delta-web）。

![menu](.ai/evidence/delta-menu.png)

## 快速开始

```bash
cd delta-web
npx serve -l 8931 .
# 浏览器打开 http://localhost:8931/
```

无构建步骤、无外部 CDN。唯一依赖 three.js（已拷贝到 `vendor/`，通过 importmap 引入）。

## 玩法

跳伞进入「长弓溪谷」，在 12 分钟内搜刮物资、对抗 AI、从随机开放的 2 个撤离点撤出。
**撤离带出才算赚**；死亡失去背包内一切（安全箱物品保留）。

| 按键 | 功能 |
|---|---|
| WASD / Shift / C / Space / Ctrl | 移动 / 冲刺(耗体力) / 蹲伏 / 跳跃 / 缓步 |
| 鼠标左键 / 右键 | 射击 / 开镜 |
| 1 / 2 / 3 / 4 | 主武器 / 副武器 / 近战 / 投掷物 |
| R / G / H | 换弹 / 扔雷 / 使用医疗品 |
| E / Tab / M | 搜刮交互 / 背包 / 战术地图 |

## 特性

- **地图** 240×240m：农场区、工业区（集装箱/油罐/大仓库）、溪谷（河流+双木桥）、防空洞高价值区；130 棵树 + 260 草丛 InstancedMesh
- **武器** 6 种（AKS-74U / MP5 / M700 栓狙 / M870 霰弹 / M45 手枪 / 战术刀），hitscan + 后坐力 + 距离衰减 + 开镜精度
- **AI** 巡逻→警戒→交战三态状态机；视锥/听声感知（枪声 60m 传播）、点射节奏、横移拉扯、换弹窗口；每局 14–18 人 + 90s 补员
- **物资** 26 个容器 ×5 类，30+ 物品，白绿蓝紫金五档稀有度；格子制背包（4×4）；尸体可搜
- **经济** Koen 币结算（带出价值 ×1.15 + 击杀奖励），局外仓库回购、军备配置、安全箱、战绩统计
- **表现** 黄昏光照 + 指数雾 + 实时阴影；全程序化合成音频（枪声/脚步/爆炸/心跳/风声，距离衰减+声像）
- **存档** localStorage 持久化，支持 JSON 导入导出

## 性能

实测 headless Chromium 1600×900：**60 FPS**，49 draw calls，32,874 triangles。

## 结构

```
index.html
loading.js            GTA V 风格载入遮罩
fps.js                左上角 FPS 计数器
src/
  main.js             App 入口：渲染器 / 相机 / 场景 / 主菜单循环
  config.js           全部可调参数（世界 / 玩家 / AI / 武器 / 物资）
  engine/             Input · SaveManager
  game/               Game.js（对局主控）
  world/              WorldBuilder（地图生成）· CollisionWorld
  player/             Player（移动 / 物理 / 相机）
  combat/             WeaponSystem · Enemy
  loot/               LootSystem · Inventory
  ui/                 HUD · Menus · Overlay
  audio/              AudioEngine
vendor/               three.js r180
```

## 验证记录

端到端浏览器实测（见 `.ai/`）：
- 完整局：搜刮 → 击杀 → 撤离读秒 8s → 结算 `42000×1.15 + 16×800 = 61100` Koen 正确入账 → 仓库收到金条
- 死亡路径：物品丢失、deaths+1、无收益
- 换弹数学（5+25=30，备弹 120−25=95）、医疗消耗、手雷引信与爆炸伤害均验证通过

![match](.ai/evidence/delta-match.png)


## 来源与致谢

本项目的原始版本来自 [vimalinx/delta-web](https://github.com/vimalinx/delta-web)，我在其基础上做了二次开发。

原项目未附许可证文件。本仓库中的 [LICENSE](./LICENSE) 由本人添加，仅适用于本人新增与修改的部分。

本仓库相对原项目的改动：

- AI 开火前增加视线（LOS）检查，修复 hearRadius 死配置
- 收紧 AI 开火距离与命中率
- AI 开火增加枪口闪光、曳光与枪声反馈
- 调整为 3 分钟局节奏，三撤离点全开
- 新增 GTA V 风格载入遮罩（法律声明版式 + 右下角转圈指示器）
- 新增 FPS 计数器
- 启用 ACES 色调映射与 sRGB 输出色彩空间
- 方向光阴影与白天基调
- 第一人称武器模型（参数化拼装，5 把枪）
