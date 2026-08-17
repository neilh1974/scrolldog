document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  document.getElementById('reset-btn').addEventListener('click', resetStats);
});

const extensionApi = getExtensionApi();

async function loadStats() {
  const items = await getAllStorage();
  const statsEl = document.getElementById('stats');

  const entries = Object.entries(items)
    .filter(([k]) => k.startsWith('sd_'))
    .map(([, v]) => v)
    .filter(v => v && v.host)
    .sort((a, b) => b.scroll - a.scroll);

  if (entries.length === 0) {
    statsEl.innerHTML = `
      <div class="empty">
        <img class="empty-icon" src="icons/icon128.png" alt="">
        <div class="empty-msg">No scrolling tracked yet.</div>
        <div class="empty-sub">
          Visit LinkedIn, Instagram, Twitter,<br>
          TikTok, Reddit, or YouTube to start.
        </div>
      </div>
    `;
    return;
  }

  statsEl.innerHTML = entries.map(e => {
    const host = escapeHtml(e.host);
    const mood = moodLabel(e.scroll);
    return `
    <div class="row">
      <span class="host" title="${host}">${host}</span>
      <span class="scroll-val ${colorClass(e.scroll)}">${fmt(e.scroll)}</span>
      <span class="mood ${colorClass(e.scroll)}" aria-label="Dog mood: ${mood}">${mood}</span>
    </div>
  `;
  }).join('');
}

async function resetStats() {
  const items = await getAllStorage();
  const keys = Object.keys(items).filter(k => k.startsWith('sd_'));
  await removeStorage(keys);
  loadStats();
}

function fmt(px) {
  if (!px || px < 1000) return `${Math.round(px || 0)}px`;
  if (px < 1_000_000)   return `${(px / 1000).toFixed(1)}k`;
  return `${(px / 1_000_000).toFixed(2)}M`;
}

function colorClass(px) {
  if (px < 8000)  return 'ok';
  if (px < 15000) return 'warn';
  if (px < 25000) return 'sad';
  return 'cry';
}

function moodLabel(px) {
  if (px < 3000)  return 'calm';
  if (px < 8000)  return 'happy';
  if (px < 15000) return 'worried';
  if (px < 25000) return 'sad';
  return 'crying';
}

function getExtensionApi() {
  if (typeof browser !== 'undefined' && browser.storage) return { api: browser, usesPromises: true };
  if (typeof chrome !== 'undefined' && chrome.storage) return { api: chrome, usesPromises: false };
  return null;
}

function getAllStorage() {
  return new Promise((resolve) => {
    try {
      if (!extensionApi || !extensionApi.api || !extensionApi.api.storage || !extensionApi.api.storage.local) {
        resolve({});
        return;
      }

      if (extensionApi.usesPromises) {
        extensionApi.api.storage.local.get(null).then((items) => resolve(items || {})).catch(() => resolve({}));
        return;
      }

      const result = extensionApi.api.storage.local.get(null, (items) => resolve(items || {}));
      if (result && typeof result.then === 'function') {
        result.then((items) => resolve(items || {})).catch(() => resolve({}));
      }
    } catch (_) {
      resolve({});
    }
  });
}

function removeStorage(keys) {
  return new Promise((resolve) => {
    try {
      if (!extensionApi || !extensionApi.api || !extensionApi.api.storage || !extensionApi.api.storage.local || keys.length === 0) {
        resolve();
        return;
      }

      if (extensionApi.usesPromises) {
        extensionApi.api.storage.local.remove(keys).then(resolve).catch(resolve);
        return;
      }

      const result = extensionApi.api.storage.local.remove(keys, resolve);
      if (result && typeof result.then === 'function') {
        result.then(resolve).catch(resolve);
      }
    } catch (_) {
      resolve();
    }
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
