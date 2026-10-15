// Run with: node --experimental-strip-types src/lib/tapTracker.test.mjs
import assert from 'node:assert/strict';
import { createTapTracker, TAP_SLOP_PX, CLICK_ECHO_MS } from './tapTracker.ts';

// A clean tap is a press.
{
  const t = createTapTracker();
  t.down(1, 100, 100);
  assert.equal(t.up(1, 100, 100, 1000), true);
}

// The drift that dropped presses on the device (9 CSS px) is still a tap.
{
  const t = createTapTracker();
  t.down(1, 296, 126);
  assert.equal(t.up(1, 295, 117, 1000), true, '9px drift must count as a tap');
}

// Beyond the slop it is a drag, not a press.
{
  const t = createTapTracker();
  t.down(1, 0, 0);
  assert.equal(t.up(1, TAP_SLOP_PX + 1, 0, 1000), false);
}

// A touch the browser took for scrolling (pointercancel) never presses.
{
  const t = createTapTracker();
  t.down(1, 0, 0);
  t.cancel(1);
  assert.equal(t.up(1, 0, 0, 1000), false);
}

// pointerup from a different pointer, or without a pointerdown, is ignored.
{
  const t = createTapTracker();
  assert.equal(t.up(1, 0, 0, 1000), false);
  t.down(1, 0, 0);
  assert.equal(t.up(2, 0, 0, 1000), false);
}

// The native click right after a tap is its echo; a later click is not.
{
  const t = createTapTracker();
  assert.equal(t.isClickEcho(1000), false, 'no tap yet: click is real (mouse / keyboard)');
  t.down(1, 0, 0);
  t.up(1, 0, 0, 1000);
  assert.equal(t.isClickEcho(1020), true);
  assert.equal(t.isClickEcho(1000 + CLICK_ECHO_MS), false);
}

console.log('✅ tapTracker tests passed');
