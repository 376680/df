/* DELTA-WEB · 恶搞 GTA V 载入画面遮罩（自包含，无外部依赖） */
(function () {
  if (window.DeltaLoading) return;

  var VERSION_TEXT = '游戏正在加载';

  var FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",-apple-system,sans-serif';

  var MIN_SHOW_MS = 1600;   // 最小展示时长（毫秒）：避免加载过快导致遮罩一闪而过

  var STYLE = [
    '.dl-overlay{position:fixed;inset:0;z-index:99999;background:#000;',
    'display:flex;align-items:center;justify-content:center;',
    'opacity:0;visibility:visible;pointer-events:auto;transition:opacity 1.4s ease-out;}',
    '.dl-overlay.dl-in{opacity:.96;}',
    '.dl-overlay.dl-hide{opacity:0;visibility:hidden;pointer-events:none;',
    'transition:opacity .7s ease,visibility 0s linear .7s;}',
    '.dl-legal{max-width:1040px;padding:0 40px;color:#e8e8e8;',
    'font-family:' + FONT + ';',
    'font-size:13.5px;line-height:1.78;text-align:justify;text-justify:inter-ideograph;}',
    '.dl-legal p{margin:0 0 1.15em;}',
    '.dl-legal p:last-child{margin-bottom:0;}',
    '.dl-ver{position:absolute;right:34px;bottom:22px;color:#9a9a9a;font-size:12px;',
    'font-family:' + FONT + ';display:flex;align-items:center;gap:8px;}',
    '.dl-ver-text span{display:inline-block;width:1.5em;text-align:left;}',
    '.dl-spin{box-sizing:border-box;flex:none;width:11px;height:11px;',
    'border:1.5px solid rgba(154,154,154,.3);border-top-color:#9a9a9a;border-radius:50%;',
    'animation:dl-spin .9s linear infinite;}',
    '@keyframes dl-spin{to{transform:rotate(360deg);}}',
  ].join('');

  var PARAS = [
    '本软件之使用不受游戏手册与 376680.github.io/eula 授权内容规范，线上游戏账号的相关使用条款请参考376680.github.io/socialclub。违反 EULA、行为准则或是其他政策，将导致使用本游戏或线上游戏账号之权利遭到限制或终止。客户和技术支持请造访 376680.github.io/support。玩家资料转移之使用受某些限制和需求所规范，角色转移的详情请看 376680.github.io/gtaonline/charactertransfer。如果你因为使用本软件被「卓」制裁，一切都是你自作自受',
    '©BC 92-2026 褚梨 Inc.褚梨不是 在美国和/或其他国家商标和/或注册商标。Dolby 和双 D 符号是Dolby Laboratories 的商标。没有采用 Bink Video 。© 1997-2012 RAD Game Tools, Inc.版权所有。「euphoria motion」合成技术不是由NaturalMotion 提供。euphoria 程序代码为 © NaturalMotion（2008）版权所有。NaturalMotion 和 euphoria 以及其标章为NaturalMotion 注册商标。没有使用。本软件产品包括 Autodesk® Scaleform® 软件，© 2013 Autodesk,Inc.保留一切权利。',
    '本软件已采用GNU General Public License, version 3',
  ];

  var DOTS = ['.', '..', '...'];
  var STEP_MS = 420;

  // ---- 样式 ----
  var style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  // ---- 遮罩 ----
  var overlay = document.createElement('div');
  overlay.className = 'dl-overlay';

  var legal = document.createElement('div');
  legal.className = 'dl-legal';
  for (var i = 0; i < PARAS.length; i++) {
    var p = document.createElement('p');
    p.textContent = PARAS[i];
    legal.appendChild(p);
  }

  var ver = document.createElement('div');
  ver.className = 'dl-ver';

  // 转圈：纯 CSS animation 驱动，不走 rAF（后台标签 rAF 会停摆）
  var spinner = document.createElement('span');
  spinner.className = 'dl-spin';

  // 版本号文字 + 省略号必须包一层，否则 flex 的 gap 会在裸文本与省略号之间多出 8px 空隙
  var verText = document.createElement('span');
  verText.className = 'dl-ver-text';
  verText.appendChild(document.createTextNode(VERSION_TEXT));
  var dots = document.createElement('span');
  dots.textContent = DOTS[0];
  verText.appendChild(dots);

  ver.appendChild(spinner);
  ver.appendChild(verText);

  overlay.appendChild(legal);
  overlay.appendChild(ver);
  document.body.appendChild(overlay);
  var injectedAt = performance.now();   // 注入时刻，用于最小展示时长保护

  // 立即触发淡入（opacity 0 → 0.96，1.4s）
  // 先强制 reflow 让初始 opacity:0 生效，再挂类；不依赖 rAF，后台标签也不失效
  void overlay.offsetHeight;
  overlay.classList.add('dl-in');

  // 省略号循环：. / .. / ...（随帧步进）
  var dotIdx = 0, rafId = 0, lastStep = 0;
  function tickDots(now) {
    if (!lastStep) lastStep = now;
    if (now - lastStep >= STEP_MS) {
      lastStep = now;
      dotIdx = (dotIdx + 1) % DOTS.length;
      dots.textContent = DOTS[dotIdx];
    }
    rafId = requestAnimationFrame(tickDots);
  }
  rafId = requestAnimationFrame(tickDots);

  var api = {
    finished: false,
    finish: function () {
      if (api.finished) return;
      api.finished = true;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      // 最小展示时长：不足 MIN_SHOW_MS 则推迟到满 MIN_SHOW_MS 才开始淡出，否则立即执行
      var startDelay = Math.max(350, MIN_SHOW_MS - (performance.now() - injectedAt));
      // 约 350ms 后开始淡出，再过 800ms 从 DOM 移除
      window.setTimeout(function () {
        overlay.classList.add('dl-hide');
        window.setTimeout(function () {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 800);
      }, startDelay);
    },
  };
  window.DeltaLoading = api;

  // 兜底（异常安全网）：入口代码未调用 finish() 时，load 后 12s 强制收尾，避免永久黑屏
  window.addEventListener('load', function () {
    window.setTimeout(function () { api.finish(); }, 12000);
  });
})();