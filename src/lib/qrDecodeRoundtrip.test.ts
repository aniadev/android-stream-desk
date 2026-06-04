import assert from 'node:assert/strict';
import jsQR from 'jsqr';
import { createQrSvg } from './qrSvg.ts';
import { buildApkConnectPayload, parseApkConnectPayload } from './apkConnectQr.ts';

function rasterizeGeneratedSvg(svgString: string, scale = 8): { data: Uint8ClampedArray; width: number; height: number } {
  const viewBoxMatch = svgString.match(/viewBox="0 0 (\d+) (\d+)"/);
  if (!viewBoxMatch) {
    throw new Error('Invalid SVG: viewBox not found');
  }
  if (!svgString.includes('<rect') || !svgString.includes('<path')) {
    throw new Error('Invalid SVG: expected rendered background and module path');
  }

  const moduleWidth = parseInt(viewBoxMatch[1], 10);
  const moduleHeight = parseInt(viewBoxMatch[2], 10);
  const width = moduleWidth * scale;
  const height = moduleHeight * scale;

  const rgbaBuffer = new Uint8ClampedArray(width * height * 4);
  rgbaBuffer.fill(255);

  const pathRegex = /M(\d+) (\d+)h1v1h-1z/g;
  let match;
  while ((match = pathRegex.exec(svgString)) !== null) {
    const moduleX = parseInt(match[1], 10);
    const moduleY = parseInt(match[2], 10);
    if (moduleX < 0 || moduleX >= moduleWidth || moduleY < 0 || moduleY >= moduleHeight) {
      throw new Error(`Invalid SVG: module outside viewBox at ${moduleX},${moduleY}`);
    }

    for (let y = moduleY * scale; y < (moduleY + 1) * scale; y += 1) {
      for (let x = moduleX * scale; x < (moduleX + 1) * scale; x += 1) {
        const idx = (y * width + x) * 4;
        rgbaBuffer[idx] = 0;
        rgbaBuffer[idx + 1] = 0;
        rgbaBuffer[idx + 2] = 0;
        rgbaBuffer[idx + 3] = 255;
      }
    }
  }

  return { data: rgbaBuffer, width, height };
}

function decodeRenderedSvgQr(svgString: string): string {
  const rendered = rasterizeGeneratedSvg(svgString);
  const code = jsQR(rendered.data, rendered.width, rendered.height);
  if (!code) {
    throw new Error('Failed to decode QR code');
  }
  return code.data;
}

// 1. Basic roundtrip test
const host = '192.168.100.200';
const wsPort = 8089;
const originalPayload = buildApkConnectPayload(host, wsPort);
const svg = createQrSvg(originalPayload);
const decoded = decodeRenderedSvgQr(svg);

assert.equal(decoded, originalPayload);
const parsed = parseApkConnectPayload(decoded);
assert.deepEqual(parsed, { host, wsPort: String(wsPort) });

// 2. Long payload roundtrip test (IPv6 addresses / long hostnames)
const longHost = '2001-0db8-85a3-0000-0000-8a2e-0370-7334.ipv6-literal.net';
const longPayload = buildApkConnectPayload(longHost, 65535);
const longSvg = createQrSvg(longPayload);
const decodedLong = decodeRenderedSvgQr(longSvg);

assert.equal(decodedLong, longPayload);
const parsedLong = parseApkConnectPayload(decodedLong);
assert.deepEqual(parsedLong, { host: longHost, wsPort: '65535' });

// 3. Encoded IPv6 payload roundtrip test
const ipv6HostEncoded = '2001%3A0db8%3A85a3%3A0000%3A0000%3A8a2e%3A0370%3A7334';
const ipv6HostDecoded = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
const ipv6Payload = `android-stream-desk://connect?v=1&host=${ipv6HostEncoded}&wsPort=65535`;
const ipv6Svg = createQrSvg(ipv6Payload);
const decodedIpv6 = decodeRenderedSvgQr(ipv6Svg);

assert.equal(decodedIpv6, ipv6Payload);
assert.deepEqual(parseApkConnectPayload(decodedIpv6), { host: ipv6HostDecoded, wsPort: '65535' });

console.log('✅ QR decode roundtrip test passed successfully!');
