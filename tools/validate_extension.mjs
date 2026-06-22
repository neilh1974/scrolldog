import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const rootPath = root.pathname;
const failures = [];

const manifest = readJson('manifest.json');
if (manifest) {
  pass('manifest JSON parses');
  expect(manifest.manifest_version === 3, 'manifest version is 3');
  expect(manifest.name === 'Scroll Dog', 'manifest name is Scroll Dog');
  expect(typeof manifest.version === 'string' && /^\d+\.\d+\.\d+$/.test(manifest.version), 'manifest version uses three parts');
  expect(Array.isArray(manifest.permissions) && manifest.permissions.includes('storage'), 'storage permission is present');
  expect(Array.isArray(manifest.content_scripts) && manifest.content_scripts.length === 1, 'one content script entry is present');
  expect(manifest.action && manifest.action.default_popup === 'popup.html', 'popup is registered');

  for (const script of manifest.content_scripts?.[0]?.js || []) {
    expectFile(script);
    parseJs(script);
  }

  for (const css of manifest.content_scripts?.[0]?.css || []) {
    expectFile(css);
  }

  expectFile(manifest.action.default_popup);
  expectFile('popup.css');
  parseJs('popup.js');

  for (const icon of Object.values(manifest.icons || {})) {
    expectFile(icon);
  }

  for (const icon of Object.values(manifest.action.default_icon || {})) {
    expectFile(icon);
  }
}

const contentSource = readText('content.js');
const popupSource = readText('popup.js');
expect(contentSource.includes('getExtensionApi'), 'content script has extension API wrapper');
expect(popupSource.includes('usesPromises'), 'popup supports promise storage APIs');
expect(popupSource.includes('escapeHtml'), 'popup escapes rendered host names');
expectNoNetworkApi('content.js', contentSource);
expectNoNetworkApi('popup.js', popupSource);
await runContentCheck();
await runPopupCheck('promise');
await runPopupCheck('callback');

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
} else {
  console.log('ALL CHECKS PASSED');
}

function readJson(file) {
  try {
    return JSON.parse(readText(file));
  } catch (error) {
    failures.push(`${file} does not parse as JSON: ${error.message}`);
    return null;
  }
}

function readText(file) {
  return readFileSync(join(rootPath, file), 'utf8');
}

function expectFile(file) {
  expect(existsSync(join(rootPath, file)), `${file} exists`);
}

function parseJs(file) {
  try {
    new Function(readText(file));
    pass(`${file} parses`);
  } catch (error) {
    failures.push(`${file} has a syntax error: ${error.message}`);
  }
}

function expect(condition, message) {
  if (condition) {
    pass(message);
  } else {
    failures.push(message);
  }
}

function pass(message) {
  console.log(`PASS ${message}`);
}

function expectNoNetworkApi(file, source) {
  const patterns = ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource'];
  for (const pattern of patterns) {
    expect(!source.includes(pattern), `${file} does not use ${pattern}`);
  }
}

async function runPopupCheck(mode) {
  const callbacks = [];
  const elements = {
    stats: { innerHTML: '' },
    'reset-btn': { addEventListener() {} },
  };

  const sandbox = {
    console,
    document: {
      addEventListener(event, callback) {
        if (event === 'DOMContentLoaded') callbacks.push(callback);
      },
      getElementById(id) {
        return elements[id];
      },
    },
    setTimeout,
    clearTimeout,
  };

  const stored = {
    sd_test: {
      host: '<img src=x onerror=alert(1)>',
      scroll: 9000,
      ts: Date.now(),
    },
  };

  if (mode === 'promise') {
    sandbox.browser = {
      storage: {
        local: {
          get: () => Promise.resolve(stored),
          remove: () => Promise.resolve(),
        },
      },
    };
  } else {
    sandbox.chrome = {
      storage: {
        local: {
          get: (keys, callback) => callback(stored),
          remove: (keys, callback) => callback(),
        },
      },
    };
  }

  vm.createContext(sandbox);
  vm.runInContext(popupSource, sandbox);
  for (const callback of callbacks) await callback();
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(elements.stats.innerHTML.includes('&lt;img'), `popup escapes ${mode} storage data`);
  expect(!elements.stats.innerHTML.includes('<img'), `popup blocks ${mode} storage markup`);
}

async function runContentCheck() {
  const timers = [];
  const elements = {};
  const storageWrites = [];
  const documentNode = { name: 'document' };
  const wrap = { className: '' };

  const sandbox = {
    console,
    location: { hostname: 'www.reddit.com' },
    window: { scrollY: 0 },
    setTimeout(callback) {
      timers.push(callback);
      return timers.length;
    },
    clearTimeout() {},
    chrome: {
      storage: {
        local: {
          set(payload) {
            storageWrites.push(payload);
          },
        },
      },
    },
    document: {
      body: { appendChild() {} },
      documentElement: documentNode,
      getElementById(id) {
        return elements[id] || null;
      },
      createElement() {
        return {
          set id(value) {
            elements[value] = this;
          },
          set innerHTML(value) {
            this.html = value;
            if (value.includes('id="sdw-wrap"')) elements['sdw-wrap'] = wrap;
          },
        };
      },
      addEventListener(event, callback) {
        if (event === 'scroll') elements.scrollCallback = callback;
      },
    },
  };

  vm.createContext(sandbox);
  vm.runInContext(contentSource, sandbox);

  expect(Boolean(elements['scroll-dog-widget']), 'content script creates widget root');
  expect(typeof elements.scrollCallback === 'function', 'content script registers scroll listener');

  elements.scrollCallback({ target: sandbox.document });
  sandbox.window.scrollY = 2000;
  elements.scrollCallback({ target: sandbox.document });
  expect(wrap.className.includes('sdw-state-happy'), 'content script enters happy state');

  sandbox.window.scrollY = 19000;
  elements.scrollCallback({ target: sandbox.document });
  expect(wrap.className.includes('sdw-state-crying'), 'content script enters crying state');

  for (const timer of timers) timer();
  expect(storageWrites.length > 0, 'content script writes scroll storage');
  expect(Boolean(storageWrites.at(-1)['sd_reddit.com']), 'content script stores by normalized host');
}
