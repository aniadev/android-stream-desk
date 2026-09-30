// Run with: node --experimental-strip-types src/stores/connection.test.mjs
//
// Covers the press-delivery guarantees of the connection store: a user's
// button press must never be silently discarded because the socket went
// stale while the phone's screen was off.
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

// Fake WebSocket: `behaviour` decides what each new socket does, and every
// instance records what was written to it.
let behaviour = 'silent'; // 'open' | 'error' | 'silent'
const created = [];
globalThis.WebSocket = class FakeWebSocket {
  static OPEN = 1;
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.closed = false;
    this.sent = [];
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
  send(data) {
    this.sent.push(data);
  }
  close() {
    this.closed = true;
  }
};

const { createPinia, setActivePinia } = await import('pinia');
const { useConnectionStore } = await import('./connection.ts');

const tick = () => new Promise(r => setTimeout(r, 0));
const types = ws => ws.sent.map(d => JSON.parse(d).type);

const freshStore = () => {
  setActivePinia(createPinia());
  const s = useConnectionStore();
  s.isOnline = true;
  s.ipAddress = '127.0.0.1';
  s.port = '8089';
  return s;
};

// ------------------------------------------------- open socket: straight out
let store = freshStore();
behaviour = 'open';
created.length = 0;
store.connect();
await tick();
const live = created.at(-1);
assert.equal(store.status, 'connected', 'socket opened');
assert.equal(store.sendOrQueue({ type: 'press', payload: { id: 'a' } }), true, 'open socket → sent');
assert.ok(types(live).includes('press'), 'press written to the socket');

// ------------------------------------------------- stale socket: queue, replay
// This is the double-tap bug: the screen was off, the WebView's timers were
// frozen, and the socket is no longer usable but nothing has noticed yet.
live.readyState = 0;
const beforeCount = created.length;
assert.equal(
  store.sendOrQueue({ type: 'press', payload: { id: 'queued' } }),
  false,
  'stale socket → reports not sent',
);
assert.ok(created.length > beforeCount, 'stale socket triggers an immediate reconnect');
await tick();
const revived = created.at(-1);
const replayed = revived.sent.map(d => JSON.parse(d)).filter(m => m.type === 'press');
assert.equal(replayed.length, 1, 'queued press replayed exactly once on reopen');
assert.equal(replayed[0].payload.id, 'queued', 'the queued press is the one replayed');
store.disconnect();

// ------------------------------------------------- TTL: no late macro firing
store = freshStore();
behaviour = 'silent';
created.length = 0;
store.connect();
await tick();
created.at(-1).readyState = 0;
store.sendOrQueue({ type: 'press', payload: { id: 'stale' } });
const realNow = Date.now;
Date.now = () => realNow() + 6000; // past the 5s TTL
behaviour = 'open';
store.connect();
await tick();
Date.now = realNow;
assert.equal(
  types(created.at(-1)).filter(t => t === 'press').length,
  0,
  'press older than the TTL is dropped, not fired late',
);
store.disconnect();

// ------------------------------------------------- revive() keeps a good socket
store = freshStore();
behaviour = 'open';
created.length = 0;
store.connect();
await tick();
const healthy = created.at(-1);
const countBeforeRevive = created.length;
healthy.sent.length = 0;
store.revive();
assert.equal(healthy.closed, false, 'healthy socket is not torn down by revive()');
assert.equal(created.length, countBeforeRevive, 'healthy socket: no new socket opened');
assert.ok(types(healthy).includes('ping'), 'revive() probes the socket with a ping');
store.disconnect();

console.log('✅ connection store tests passed');
process.exit(0);
