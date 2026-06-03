export function buildApkConnectPayload(host: string, wsPort: number): string {
  return `android-stream-desk://connect?v=1&host=${encodeURIComponent(host)}&wsPort=${wsPort}`;
}

export interface ApkConnectTarget {
  host: string;
  wsPort: string;
}

export function parseApkConnectPayload(payload: string): ApkConnectTarget | null {
  let url: URL;
  try {
    url = new URL(payload);
  } catch {
    return null;
  }

  if (url.protocol !== 'android-stream-desk:' || url.hostname !== 'connect') return null;
  if (url.searchParams.get('v') !== '1') return null;

  const host = url.searchParams.get('host')?.trim();
  const wsPort = url.searchParams.get('wsPort')?.trim();
  if (!host || !wsPort || !/^\d+$/.test(wsPort)) return null;

  const port = Number(wsPort);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) return null;

  return { host, wsPort };
}
