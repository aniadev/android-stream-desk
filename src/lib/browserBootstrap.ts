export interface BrowserServerInfo {
  wsPort: number;
}

export interface BrowserBootstrapTarget {
  ipAddress: string;
  port: string;
}

interface BrowserLocation {
  hostname: string;
  port: string;
}

type ServerInfoFetcher = (input: string) => Promise<Pick<Response, 'json' | 'ok'>>;

export function isBrowserMode(win: { __TAURI_INTERNALS__?: unknown }): boolean {
  return !win.__TAURI_INTERNALS__;
}

export function browserServerInfoUrl(location: BrowserLocation): string {
  const port = location.port ? `:${location.port}` : '';
  return `http://${location.hostname}${port}/api/server-info`;
}

export async function fetchBrowserServerInfo(
  location: BrowserLocation,
  fetcher: ServerInfoFetcher = fetch,
): Promise<BrowserServerInfo> {
  const response = await fetcher(browserServerInfoUrl(location));
  if (!response.ok) {
    throw new Error('server-info request failed');
  }

  const payload = (await response.json()) as Partial<BrowserServerInfo>;
  if (!Number.isFinite(payload.wsPort) || !payload.wsPort) {
    throw new Error('server-info response missing wsPort');
  }

  return { wsPort: payload.wsPort };
}

export function toBrowserBootstrapTarget(
  info: BrowserServerInfo,
  location: BrowserLocation,
): BrowserBootstrapTarget {
  return {
    ipAddress: location.hostname,
    port: String(info.wsPort),
  };
}
