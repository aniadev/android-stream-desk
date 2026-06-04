import assert from 'node:assert/strict';
import {
  DEFAULT_FIT_MODE,
  DISPLAY_FIT_MODES,
  parseFitMode,
} from './settings.ts';

assert.equal(DEFAULT_FIT_MODE, 'contain', 'Default must be contain per AC1');
assert.equal(DISPLAY_FIT_MODES.length, 3);
assert.deepEqual(DISPLAY_FIT_MODES, ['contain', 'cover', 'fullscreen']);

assert.equal(parseFitMode('contain'), 'contain');
assert.equal(parseFitMode('cover'), 'cover');
assert.equal(parseFitMode('fullscreen'), 'fullscreen');

assert.equal(parseFitMode(null), 'contain', 'null must fall back to default');
assert.equal(parseFitMode(undefined), 'contain', 'undefined must fall back to default');
assert.equal(parseFitMode(''), 'contain', 'empty string must fall back to default');
assert.equal(parseFitMode('garbage'), 'contain', 'unknown value must fall back to default');
assert.equal(parseFitMode('CONTAIN'), 'contain', 'uppercase must fall back (case-sensitive)');
