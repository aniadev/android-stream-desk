import assert from 'node:assert/strict';
import {
  buildApkEndpointPayload,
  buildWebClientUrl,
  hasPendingServerChanges,
} from './networkEndpointState.ts';

assert.equal(
  hasPendingServerChanges({
    draftWsPort: '18089',
    runningWsPort: 8089,
    webEnabledDraft: false,
    webEnabledSaved: false,
    webPortDraft: '8090',
    webPortSaved: 8090,
  }),
  true,
);

assert.equal(
  hasPendingServerChanges({
    draftWsPort: '8089',
    runningWsPort: 8089,
    webEnabledDraft: true,
    webEnabledSaved: true,
    webPortDraft: '8090',
    webPortSaved: 8090,
  }),
  false,
);

assert.equal(
  buildApkEndpointPayload({
    serverIp: '192.168.1.20',
    runningWsPort: 18089,
    hasPendingServerChanges: false,
    hasBindError: false,
  }),
  'android-stream-desk://connect?v=1&host=192.168.1.20&wsPort=18089',
);

assert.equal(
  buildApkEndpointPayload({
    serverIp: '192.168.1.20',
    runningWsPort: 8089,
    hasPendingServerChanges: true,
    hasBindError: false,
  }),
  '',
);

assert.equal(
  buildWebClientUrl({
    serverIp: '192.168.1.20',
    webEnabled: true,
    webPort: 8090,
    webReady: true,
    hasPendingServerChanges: false,
    hasBindError: false,
  }),
  'http://192.168.1.20:8090',
);

assert.equal(
  buildWebClientUrl({
    serverIp: '192.168.1.20',
    webEnabled: true,
    webPort: 8090,
    webReady: false,
    hasPendingServerChanges: false,
    hasBindError: false,
  }),
  '',
);
