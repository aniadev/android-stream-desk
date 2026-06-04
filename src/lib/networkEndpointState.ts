import { buildApkConnectPayload } from './apkConnectQr.ts';

const UNKNOWN_IP = '—';

export interface PendingServerChangeInput {
  draftWsPort: string;
  runningWsPort: number | null;
  webEnabledDraft: boolean;
  webEnabledSaved: boolean;
  webPortDraft: string;
  webPortSaved: number | null;
}

export interface ApkEndpointInput {
  serverIp: string;
  runningWsPort: number | null;
  hasPendingServerChanges: boolean;
  hasBindError: boolean;
}

export interface WebEndpointInput {
  serverIp: string;
  webEnabled: boolean;
  webPort: number;
  webReady: boolean;
  hasPendingServerChanges: boolean;
  hasBindError: boolean;
}

function parseDraftPort(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

export function hasPendingServerChanges(input: PendingServerChangeInput): boolean {
  const draftWsPort = parseDraftPort(input.draftWsPort);
  if (draftWsPort === null || draftWsPort !== input.runningWsPort) {
    return true;
  }

  if (input.webEnabledDraft !== input.webEnabledSaved) {
    return true;
  }

  const draftWebPort = parseDraftPort(input.webPortDraft);
  return draftWebPort === null || draftWebPort !== input.webPortSaved;
}

export function buildApkEndpointPayload(input: ApkEndpointInput): string {
  if (
    input.serverIp === UNKNOWN_IP ||
    input.runningWsPort === null ||
    input.hasPendingServerChanges ||
    input.hasBindError
  ) {
    return '';
  }

  return buildApkConnectPayload(input.serverIp, input.runningWsPort);
}

export function buildWebClientUrl(input: WebEndpointInput): string {
  if (
    !input.webEnabled ||
    !input.webReady ||
    input.serverIp === UNKNOWN_IP ||
    input.hasPendingServerChanges ||
    input.hasBindError
  ) {
    return '';
  }

  return `http://${input.serverIp}:${input.webPort}`;
}
