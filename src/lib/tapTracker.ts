// Tap detection for touch / pen presses on grid buttons.
//
// The browser only turns a touch into a `click` when the finger stays within
// its small "tap slop" (a few device pixels). A finger resting on a macro pad
// often drifts further than that during an ordinary tap, and the browser then
// delivers pointerup with no click: the button animates (CSS :active) but the
// press is never sent. Recorded on a Galaxy A8: a 9 CSS px drift over 130 ms
// dropped 3 of 3 presses.
//
// So a press is recognised here from pointerdown -> pointerup on the same
// pointer within a forgiving distance, and the native click that may follow
// is ignored to avoid a double press. Touches the browser claims for
// scrolling (horizontal page swipes) end in pointercancel and never count.

/** Max finger travel, in CSS px, for a touch to still count as a tap. */
export const TAP_SLOP_PX = 24;

/** How long after a recognised tap a native click is treated as its echo. */
export const CLICK_ECHO_MS = 600;

export interface TapTracker {
  down(pointerId: number, x: number, y: number): void;
  /** True when this pointerup completes a tap. */
  up(pointerId: number, x: number, y: number, now: number): boolean;
  cancel(pointerId: number): void;
  /** True when a click is the browser's echo of a tap already handled. */
  isClickEcho(now: number): boolean;
}

export function createTapTracker(
  slopPx: number = TAP_SLOP_PX,
  echoMs: number = CLICK_ECHO_MS,
): TapTracker {
  let start: { id: number; x: number; y: number } | null = null;
  let lastTapAt = -Infinity;

  return {
    down(pointerId, x, y) {
      start = { id: pointerId, x, y };
    },
    up(pointerId, x, y, now) {
      if (!start || start.id !== pointerId) return false;
      const moved = Math.hypot(x - start.x, y - start.y);
      start = null;
      if (moved > slopPx) return false;
      lastTapAt = now;
      return true;
    },
    cancel(pointerId) {
      if (start && start.id === pointerId) start = null;
    },
    isClickEcho(now) {
      return now - lastTapAt < echoMs;
    },
  };
}
