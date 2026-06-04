import assert from 'node:assert/strict';
import { sanitizeLinkUrl } from './linkUrl.ts';

// Accept http(s) and normalize
assert.equal(sanitizeLinkUrl('https://example.com'), 'https://example.com/');
assert.equal(
  sanitizeLinkUrl('http://192.168.1.5:8080/path?q=1'),
  'http://192.168.1.5:8080/path?q=1',
);
assert.equal(sanitizeLinkUrl('  https://github.com/ania  '), 'https://github.com/ania');

// Reject non-http schemes
for (const bad of [
  'file:///etc/passwd',
  'javascript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'ftp://example.com',
  'vbscript:msgbox',
  'about:blank',
  'chrome://settings',
]) {
  assert.equal(sanitizeLinkUrl(bad), undefined, `should reject scheme: ${bad}`);
}

// Reject URLs with embedded credentials
for (const bad of [
  'https://user:pass@example.com',
  'http://admin@192.168.1.5',
  'https://user@github.com/ania',
]) {
  assert.equal(sanitizeLinkUrl(bad), undefined, `should reject credentials: ${bad}`);
}

// Reject malformed and empty
for (const bad of ['', '   ', 'example.com', 'not a url', null, undefined, 42, {}]) {
  assert.equal(sanitizeLinkUrl(bad as any), undefined, `should reject input: ${JSON.stringify(bad)}`);
}

console.log('✅ sanitizeLinkUrl tests passed');
