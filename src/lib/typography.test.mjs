import assert from 'node:assert/strict';
import {
  FONT_BODY_MIN_PX,
  FONT_CONTROL_MIN_PX,
  FONT_HUD_MIN_PX,
  FONT_LABEL_MIN_PX,
  FONT_TIER_CLASS,
  FONT_TIER_PX,
  assertFontMin,
} from './typography.ts';

assert.equal(FONT_HUD_MIN_PX, 9, 'HUD minimum must be 9px');
assert.equal(FONT_LABEL_MIN_PX, 9, 'Label minimum must be 9px');
assert.equal(FONT_BODY_MIN_PX, 10, 'Body minimum must be 10px');
assert.equal(FONT_CONTROL_MIN_PX, 10, 'Control minimum must be 10px');

assert.equal(FONT_TIER_PX.hud, 9);
assert.equal(FONT_TIER_PX.body, 10);
assert.equal(FONT_TIER_CLASS.hud, 'cyber-text-2xs');
assert.equal(FONT_TIER_CLASS.body, 'cyber-text-sm');

assertFontMin(9, 'hud');
assertFontMin(10, 'body');
assert.throws(() => assertFontMin(8, 'hud'), /below minimum 9px for tier "hud"/);
assert.throws(() => assertFontMin(9, 'body'), /below minimum 10px for tier "body"/);
