import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const sourceFiles = [
  'assets/js/config.js',
  'assets/js/schema.js',
  'assets/js/store.js'
];

function createStore({ demo = false } = {}) {
  const values = new Map();
  const localStorage = {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    key: (index) => [...values.keys()][index] ?? null,
    get length() { return values.size; }
  };
  const context = {
    localStorage,
    console,
    Date,
    Math,
    JSON,
    AbortController,
    setTimeout,
    clearTimeout,
    fetch: async () => { throw new Error('Unexpected network request in unit test'); }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(readFileSync(sourceFiles[0], 'utf8'), context, { filename: sourceFiles[0] });
  if (demo) context.APP_CONFIG.appsScriptUrl = '';
  for (const file of sourceFiles.slice(1)) {
    vm.runInContext(readFileSync(file, 'utf8'), context, { filename: file });
  }
  return context.Store;
}

test('an explicitly empty saved URL selects demo mode instead of restoring the default endpoint', () => {
  const store = createStore();
  store.saveConfig({ url: '' });
  assert.equal(store.isRemote(), false);
  assert.equal(store.getConfig().url, '');
});

test('saving general preferences preserves sync errors and the last successful sync time', () => {
  const store = createStore();
  store.status.offline = true;
  store.status.lastError = 'backend unavailable';
  store.status.lastSync = '2026-01-01T00:00:00.000Z';

  store.saveConfig({ teamLabel: 'PTIS Selangau' });

  assert.equal(store.status.offline, true);
  assert.equal(store.status.lastError, 'backend unavailable');
  assert.equal(store.status.lastSync, '2026-01-01T00:00:00.000Z');
});

test('changing the endpoint clears stale sync status', () => {
  const store = createStore();
  store.status.offline = true;
  store.status.lastError = 'old endpoint error';
  store.status.lastSync = '2026-01-01T00:00:00.000Z';

  store.saveConfig({ url: 'https://example.test/exec' });

  assert.equal(store.status.offline, false);
  assert.equal(store.status.lastError, null);
  assert.equal(store.status.lastSync, null);
});

test('demo mode initializes the expected inventory and contract seeds', async () => {
  const store = createStore({ demo: true });
  const all = await store.listAll();

  assert.equal(store.modeName(), 'Demo');
  assert.equal(all.peralatan.length, 114);
  assert.equal(all.kontrak.length, 7);
  assert.equal(all.scst.length, 0);
});
