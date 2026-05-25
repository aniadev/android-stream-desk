let sentinel: WakeLockSentinel | null = null;
let acquiring = false;

export async function acquireWakeLock(): Promise<void> {
  if (!('wakeLock' in navigator)) {
    console.warn('Screen Wake Lock API not supported in this browser.');
    return;
  }
  if (sentinel && !sentinel.released) return;
  if (acquiring) return;
  acquiring = true;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => {
      sentinel = null;
    });
  } catch (e) {
    console.warn('WakeLock acquire failed:', e);
  } finally {
    acquiring = false;
  }
}

export async function releaseWakeLock(): Promise<void> {
  if (sentinel && !sentinel.released) {
    await sentinel.release();
  }
  sentinel = null;
}

export function isWakeLockActive(): boolean {
  return sentinel !== null && !sentinel.released;
}
