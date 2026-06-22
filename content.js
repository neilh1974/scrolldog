(function () {
  'use strict';

  if (document.getElementById('scroll-dog-widget')) return;

  const THRESHOLDS = {
    APPEAR: 1500,
    WORRIED: 5000,
    SAD: 10000,
    CRYING: 18000,
  };

  const HOST      = location.hostname.replace(/^www\./, '');
  const STORE_KEY = `sd_${HOST}`;
  const extensionApi = getExtensionApi();

  let sessionScroll = 0;
  let currentState  = '';
  let saveTimer     = null;
  const lastScrollY = new WeakMap();

  const root = document.createElement('div');
  root.id    = 'scroll-dog-widget';
  root.innerHTML = `
    <div class="sdw-wrap sdw-state-hidden" id="sdw-wrap">
      <svg class="sdw-dog" viewBox="0 0 112 112" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">

        <rect class="sdw-shadow" x="26" y="96" width="60" height="5"/>

        <g class="sdw-head">
          <rect x="24" y="12" width="12" height="12" fill="#111111"/>
          <rect x="20" y="24" width="12" height="28" fill="#111111"/>
          <rect x="32" y="20" width="8" height="28" fill="#111111"/>
          <rect x="28" y="24" width="8" height="24" fill="#FFFFFF"/>
          <rect x="32" y="28" width="4" height="12" fill="#DDE6EE"/>

          <rect x="76" y="20" width="8" height="28" fill="#111111"/>
          <rect x="84" y="24" width="12" height="28" fill="#111111"/>
          <rect x="76" y="12" width="12" height="12" fill="#111111"/>
          <rect x="80" y="24" width="8" height="24" fill="#FFFFFF"/>
          <rect x="80" y="28" width="4" height="12" fill="#DDE6EE"/>

          <rect x="28" y="28" width="56" height="12" fill="#111111"/>
          <rect x="20" y="40" width="72" height="12" fill="#111111"/>
          <rect x="16" y="52" width="80" height="28" fill="#111111"/>
          <rect x="24" y="80" width="64" height="12" fill="#111111"/>
          <rect x="36" y="92" width="40" height="8" fill="#111111"/>

          <rect x="24" y="48" width="64" height="32" fill="#FFFFFF"/>
          <rect x="32" y="80" width="48" height="12" fill="#FFFFFF"/>
          <rect x="20" y="56" width="12" height="16" fill="#FFFFFF"/>
          <rect x="80" y="56" width="12" height="16" fill="#FFFFFF"/>

          <rect x="28" y="36" width="56" height="16" fill="#111111"/>
          <rect x="24" y="48" width="24" height="18" fill="#111111"/>
          <rect x="64" y="48" width="24" height="18" fill="#111111"/>
          <rect x="48" y="40" width="16" height="30" fill="#FFFFFF"/>
          <rect x="40" y="52" width="12" height="18" fill="#FFFFFF"/>
          <rect x="60" y="52" width="12" height="18" fill="#FFFFFF"/>

          <rect x="36" y="54" width="8" height="8" fill="#86D8FF"/>
          <rect x="68" y="54" width="8" height="8" fill="#86D8FF"/>
          <rect x="40" y="56" width="4" height="4" fill="#111111"/>
          <rect x="68" y="56" width="4" height="4" fill="#111111"/>
          <rect x="36" y="52" width="4" height="3" fill="#FFFFFF"/>
          <rect x="72" y="52" width="4" height="3" fill="#FFFFFF"/>

          <rect class="sdw-brow-l" x="32" y="48" width="16" height="4" fill="#111111"/>
          <rect class="sdw-brow-r" x="64" y="48" width="16" height="4" fill="#111111"/>

          <rect x="48" y="68" width="16" height="8" fill="#111111"/>
          <rect x="52" y="68" width="4" height="3" fill="#555555"/>
          <rect x="54" y="76" width="4" height="12" fill="#111111"/>
          <rect class="sdw-mouth-happy" x="42" y="84" width="12" height="4" fill="#111111"/>
          <rect class="sdw-mouth-happy" x="58" y="84" width="12" height="4" fill="#111111"/>
          <rect class="sdw-tongue" x="54" y="88" width="8" height="10" fill="#F27A8A"/>
          <rect class="sdw-mouth-sad" x="42" y="88" width="12" height="4" fill="#111111"/>
          <rect class="sdw-mouth-sad" x="58" y="88" width="12" height="4" fill="#111111"/>
          <rect class="sdw-mouth-sad" x="50" y="84" width="12" height="4" fill="#111111"/>
        </g>

        <g class="sdw-tears">
          <rect class="sdw-tear-a" x="34" y="62" width="6" height="12" fill="#8BD7FF"/>
          <rect class="sdw-tear-b" x="72" y="62" width="6" height="12" fill="#8BD7FF"/>
          <rect class="sdw-tear-c" x="32" y="78" width="5" height="9" fill="#8BD7FF"/>
          <rect class="sdw-tear-d" x="76" y="78" width="5" height="9" fill="#8BD7FF"/>
        </g>
      </svg>
    </div>
  `;

  document.body.appendChild(root);

  const wrap  = document.getElementById('sdw-wrap');

  document.addEventListener('scroll', (e) => {
    const el   = (e.target === document) ? document.documentElement : e.target;
    const y    = (el === document.documentElement) ? window.scrollY : el.scrollTop;
    const prev = lastScrollY.has(el) ? lastScrollY.get(el) : y;
    lastScrollY.set(el, y);
    const delta = y - prev;
    if (delta > 0) sessionScroll += delta;
    render();
    scheduleSave();
  }, { passive: true, capture: true });

  function render() {
    const state = calcState();
    if (state === currentState) return;
    currentState      = state;
    wrap.className    = `sdw-wrap sdw-state-${state}`;
  }

  function calcState() {
    const s = sessionScroll;
    if (s < THRESHOLDS.APPEAR)  return 'hidden';
    if (s < THRESHOLDS.WORRIED) return 'happy';
    if (s < THRESHOLDS.SAD)     return 'worried';
    if (s < THRESHOLDS.CRYING)  return 'sad';
    return 'crying';
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 2000);
  }

  function persist() {
    try {
      if (!extensionApi || !extensionApi.storage || !extensionApi.storage.local) return;
      const result = extensionApi.storage.local.set({
        [STORE_KEY]: { scroll: sessionScroll, host: HOST, ts: Date.now() }
      });
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch (_) {}
  }

  function getExtensionApi() {
    if (typeof browser !== 'undefined' && browser.storage) return browser;
    if (typeof chrome !== 'undefined' && chrome.storage) return chrome;
    return null;
  }
})();
