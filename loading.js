/* DELTA-WEB · 恶搞 GTA V 载入画面遮罩（自包含，无外部依赖） */
(function () {
  if (window.DeltaLoading) return;

  var VERSION_TEXT = '遊戲版本 1180.1　線上版本 1.41';

  var FONT = '"PingFang TC","Hiragino Sans TC","Microsoft JhengHei","Noto Sans TC",-apple-system,sans-serif';

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
    '此軟體之使用不受遊戲手冊與 376680.github.io/eula 授權內容規範，線上遊戲帳號的相關使用條款請參考376680.github.io/socialclub。違反 EULA、行為準則或是其他政策，將導致使用本遊戲或線上遊戲帳號之權利遭到限制或終止。客戶和技術支援請造訪 376680.github.io/support。玩家資料轉移之使用受某些限制和需求所規範，角色轉移的詳情請看 376680.github.io/gtaonline/charactertransfer。',
    '©BC 92-2026 褚梨 Inc.褚梨不是 在美國和/或其他國家商標和/或註冊商標。Dolby 和雙 D 符號是Dolby Laboratories 的商標。没有採用 Bink Video 。© 1997-2012 RAD Game Tools, Inc.版權所有。「euphoria motion」合成技術不是由NaturalMotion 提供。euphoria 程式碼為 © NaturalMotion（2008）版權所有。NaturalMotion 和 euphoria 以及其標章為NaturalMotion 註冊商標。没有使用。此軟體產品包括 Autodesk® Scaleform® 軟體，© 2013 Autodesk,Inc.保留一切權利。',
    '所有其他標章和商標是其各自擁有者之財產。保留一切權利',
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