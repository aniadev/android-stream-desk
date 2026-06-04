import assert from 'node:assert/strict';
import { buildApkConnectPayload, parseApkConnectPayload } from './apkConnectQr.ts';
import { createQrSvg, safeCreateQrSvg } from './qrSvg.ts';

const payload = buildApkConnectPayload('192.168.100.200', 65535);

assert.equal(
  payload,
  'android-stream-desk://connect?v=1&host=192.168.100.200&wsPort=65535',
);

const svg = createQrSvg(payload);

assert.match(svg, /^<svg /);
assert.match(svg, /role="img"/);

assert.deepEqual(parseApkConnectPayload(payload), {
  host: '192.168.100.200',
  wsPort: '65535',
});

assert.deepEqual(
  parseApkConnectPayload('android-stream-desk://connect?v=1&host=192.168.31.112&wsPort=8089'),
  {
    host: '192.168.31.112',
    wsPort: '8089',
  },
);

assert.equal(parseApkConnectPayload('http://192.168.31.112:8089'), null);
assert.equal(parseApkConnectPayload('android-stream-desk://connect?v=1&host=&wsPort=8089'), null);
assert.equal(parseApkConnectPayload('android-stream-desk://connect?v=1&host=192.168.31.112&wsPort=99999'), null);

// Test safeCreateQrSvg with longer IPv6 addresses (which now succeed due to dynamic version scaling)
const longIpPayload = 'android-stream-desk://connect?v=1&host=2001%3A0db8%3A85a3%3A0000%3A0000%3A8a2e%3A0370%3A7334&wsPort=65535';
const longSvg = safeCreateQrSvg(longIpPayload);
assert.match(longSvg, /^<svg /);
assert.match(longSvg, /role="img"/);

// Verify that excessive payload throws an error rather than silently returning empty string
assert.throws(() => {
  createQrSvg('a'.repeat(4000));
}, /too big|too long|too large|large/i);

