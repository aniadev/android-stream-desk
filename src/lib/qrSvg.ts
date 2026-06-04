import QRCode from 'qrcode';

export function createQrSvg(text: string): string {
  if (!text) {
    throw new Error('QR payload is empty');
  }
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const quietZone = 4;
  const viewBoxSize = size + quietZone * 2;
  
  const pathParts: string[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (qr.modules.get(y, x)) {
        pathParts.push(`M${x + quietZone} ${y + quietZone}h1v1h-1z`);
      }
    }
  }
  const path = pathParts.join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" role="img" aria-label="QR code"><rect width="${viewBoxSize}" height="${viewBoxSize}" fill="#fff"/><path d="${path}" fill="#020617"/></svg>`;
}

export function safeCreateQrSvg(text: string): string {
  try {
    return createQrSvg(text);
  } catch (error: any) {
    // Safe variant: never throws. Callers render this into `v-html`/`v-if`
    // computeds, so a throw here would propagate during render and crash the
    // component. Log and return '' so the UI just shows no QR.
    console.warn(`Failed to create QR SVG: ${error?.message || error}`);
    return '';
  }
}
