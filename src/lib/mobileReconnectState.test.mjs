import assert from 'node:assert/strict';
import {
  formatReconnectEndpoint,
  shouldShowScanAgainCta,
} from './mobileReconnectState.ts';

assert.equal(
  shouldShowScanAgainCta({
    isAndroidTauriApp: true,
    status: 'error',
    reconnectAttempts: 3,
    maxReconnectAttempts: 3,
  }),
  true,
);

assert.equal(
  shouldShowScanAgainCta({
    isAndroidTauriApp: false,
    status: 'error',
    reconnectAttempts: 3,
    maxReconnectAttempts: 3,
  }),
  false,
);

assert.equal(
  shouldShowScanAgainCta({
    isAndroidTauriApp: true,
    status: 'connecting',
    reconnectAttempts: 3,
    maxReconnectAttempts: 3,
  }),
  false,
);

assert.equal(formatReconnectEndpoint('192.168.1.20', '18089'), '192.168.1.20:18089');
assert.equal(formatReconnectEndpoint('', '18089'), '');
