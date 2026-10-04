/* DELTA-WEB · FPS 计数器（自包含，无外部依赖；样式跟随 HUD 绿白科技风） */
(function () {
  if (window.DeltaFPS) return;

  var UPDATE_MS = 500;    // 读数刷新周期（毫秒）
  var STALE_MS = 1000;    // 超过该时长没有新帧视为冻结（窗口失焦/切后台），显示 --

  var FONT = "'Segoe UI','Microsoft YaHei',sans-serif";

  var STYLE = [
    '.dfps{position:fixed;left:24px;top:56px;z-index:60;pointer-events:none;',
    'font-family:' + FONT + ';font-size:12.5px;letter-spacing:1.5px;',
    'color:#8affc2;text-shadow:0 1px 3px #000,0 0 14px rgba(0,255,133,.35);',
    'font-variant-numeric:tabular-nums;user-select:none;white-space:nowrap;}',
    '.dfps b{color:#eafff4;font-weight:600;}',
  ].join('');

  var style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  var el = document.createElement('div');
  el.className = 'dfps';
  var valueNode = document.createElement('b');
  valueNode.textContent = '--';
  el.appendChild(document.createTextNode('FPS '));
  el.appendChild(valueNode);
  document.body.appendChild(el);

  var frames = 0;
  var windowStart = performance.now();
  var lastFrame = windowStart;
  var frozen = false;

  function setValue(v) { valueNode.textContent = v; }
  // 冻结：立即显示 --，不挂旧数字（rAF 停摆后没有帧会覆盖它）
  function markFrozen() { frozen = true; setValue('--'); }

  function tick(now) {
    requestAnimationFrame(tick);
    var gap = now - lastFrame;
    lastFrame = now;
    if (frozen || gap > STALE_MS) {
      // 冻结恢复后的第一帧，或大停滞：作废当前统计窗口，等下一个完整窗口再出数
      frozen = false;
      frames = 0;
      windowStart = now;
      setValue('--');
      return;
    }
    frames++;
    if (now - windowStart >= UPDATE_MS) {
      setValue(Math.round(frames * 1000 / (now - windowStart)));
      frames = 0;
      windowStart = now;
    }
  }
  requestAnimationFrame(tick);

  // 窗口失焦 / 切后台：rAF 会完全冻结，用事件立即置 --
  window.addEventListener('blur', markFrozen);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) markFrozen();
  });

  // 兜底看守：无 blur 事件但 rAF 停摆（被遮挡/系统挂起）也能在约 1s 内转为 --
  setInterval(function () {
    if (performance.now() - lastFrame > STALE_MS) markFrozen();
  }, UPDATE_MS);

  window.DeltaFPS = { el: el };
})();