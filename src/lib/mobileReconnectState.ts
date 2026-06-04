import type { ConnectionState } from '../types';

export interface ScanAgainCtaInput {
  isAndroidTauriApp: boolean;
  status: ConnectionState;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

export function shouldShowScanAgainCta(input: ScanAgainCtaInput): boolean {
  return (
    input.isAndroidTauriApp &&
    input.status === 'error' &&
    input.reconnectAttempts >= input.maxReconnectAttempts
  );
}

export function formatReconnectEndpoint(ipAddress: string, port: string): string {
  const host = ipAddress.trim();
  const wsPort = port.trim();
  if (!host || !wsPort) return '';
  return `${host}:${wsPort}`;
}
