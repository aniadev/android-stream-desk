import assert from 'node:assert/strict';

// --- minimal browser globals the store touches at import / connect time ---
const storage = new Map();
globalThis.localStorage = {
  getItem: k => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: k => storage.delete(k),
};
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.dispatchEvent = () => true;
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init) {
    this.type = type;
    this.detail = init?.detail;
  }
};

// Fake WebSocket: `behaviour` decides what each new socket does.
let behaviour = 'silent'; // 'open' | 'error' | 'silent'
const created = [];
globalThis.WebSocket = class FakeWebSocket {
  static OPEN = 1;
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.closed = false;
    created.push(this);
    queueMicrotask(() => {
      if (behaviour === 'open') {
        this.readyState = FakeWebSocket.OPEN;
        this.onopen?.();
      } else if (behaviour === 'error') {
        this.onerror?.();
        this.onclose?.();
      }
    });
  }
  send() {}
  close() {
    this.closed = true;
  }
};

const { createPinia, setActivePinia } = await import('pinia');
const { isLoopbackHost, probeWebSocket, useConnectionStore } = await import('./connection.ts');

// ---------------------------------------------------------------- isLoopbackHost
for (const h of ['127.0.0.1', 'localhost', 'LOCALHOST', ' 127.0.0.1 ', '::1', '[::1]']) {
  assert.equal(isLoopbackHost(h), true, `${h} is loopback`);
}
for (const h of ['10.0.0.5', '192.168.1.20', '127.0.0.2', '', 'example.com']) {
  assert.equal(isLoopbackHost(h), false, `${h} is not loopback`);
}

// ---------------------------------------------------------------- probeWebSocket
behaviour = 'open';
assert.equal(await probeWebSocket('ws://127.0.0.1:8089', 200), true, 'open handshake → true');
assert.equal(created.at(-1).closed, true, 'probe socket is closed after success');

behaviour = 'error';
assert.equal(await probeWebSocket('ws://127.0.0.1:8089', 200), false, 'error → false');

behaviour = 'silent';
assert.equal(await probeWebSocket('ws://127.0.0.1:8089', 30), false, 'no answer → timeout → false');
assert.equal(created.at(-1).closed, true, 'timed-out probe socket is closed');

// ---------------------------------------------------------------- online gate
// USB mode: with the WebView reporting offline (Wi-Fi off), a loopback
// target must still be attempted; a LAN target must not.
setActivePinia(createPinia());
let store = useConnectionStore();
store.isOnline = false;
store.port = '8089';

created.length = 0;
behaviour = 'silent';
store.ipAddress = '10.0.0.5';
store.connect();
assert.equal(store.status, 'disconnected', 'LAN target offline → skipped');
assert.equal(created.length, 0, 'LAN target offline → no socket opened');

store.ipAddress = '127.0.0.1';
store.connect();
assert.equal(store.status, 'connecting', 'loopback target offline → still attempted');
assert.equal(created.length, 1, 'loopback target offline → socket opened');
assert.equal(created[0].url, 'ws://127.0.0.1:8089');
store.disconnect();

// ---------------------------------------------------------------- tryLoopbackAutoConnect
setActivePinia(createPinia());
storage.clear();
store = useConnectionStore();
store.isOnline = true;

store.ipAddress = '192.168.1.20';
behaviour = 'open';
created.length = 0;
assert.equal(await store.tryLoopbackAutoConnect(), false, 'saved address → no probe');
assert.equal(created.length, 0, 'saved address → no socket opened');

store.ipAddress = '';
behaviour = 'error';
assert.equal(await store.tryLoopbackAutoConnect(), false, 'no Companion on loopback → false');
assert.equal(store.ipAddress, '', 'address stays empty when probe fails');

behaviour = 'open';
created.length = 0;
assert.equal(await store.tryLoopbackAutoConnect(), true, 'Companion answers on loopback → adopted');
assert.equal(store.ipAddress, '127.0.0.1');
assert.equal(storage.get('server_ip'), '127.0.0.1', 'adopted address is persisted');
assert.ok(created.some(ws => ws.url === 'ws://127.0.0.1:8089'), 'real connect opened to loopback');
store.disconnect();

console.log('✅ connection store tests passed');
process.exit(0);
