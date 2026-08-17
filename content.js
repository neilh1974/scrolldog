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
    <div class="sdw-wrap sdw-state-hidden" id="sdw-wrap" role="img" aria-label="Scroll Dog is hidden">
      ${getDogArt()}
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
    wrap.setAttribute('aria-label', `Scroll Dog is ${state}`);
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

  function getDogArt() {
    if (typeof globalThis.ScrollDogArt === 'string' && globalThis.ScrollDogArt.includes('class="sdw-dog dogSvg"')) {
      return globalThis.ScrollDogArt;
    }

    if (extensionApi && extensionApi.runtime && typeof extensionApi.runtime.getURL === 'function') {
      console.warn('[Scroll Dog] Shared artwork was unavailable. Using the packaged icon.');
      const iconUrl = extensionApi.runtime.getURL('icons/icon128.png');
      return `<img class="sdw-dog dogSvg sdw-dog-fallback" src="${iconUrl}" alt="">`;
    }

    console.error('[Scroll Dog] Artwork could not be loaded.');
    return '';
  }
})();
