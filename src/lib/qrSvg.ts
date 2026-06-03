const VERSION = 4;
const SIZE = 33;
const QUIET_ZONE = 4;
const DATA_CODEWORDS = 80;
const EC_CODEWORDS = 20;
const MAX_BYTE_LENGTH = 78;

type Matrix = (boolean | null)[][];

class BitBuffer {
  private bits: number[] = [];

  get length(): number {
    return this.bits.length;
  }

  push(value: number, width: number) {
    for (let i = width - 1; i >= 0; i -= 1) {
      this.bits.push((value >>> i) & 1);
    }
  }

  toCodewords(): number[] {
    const result: number[] = [];
    for (let i = 0; i < this.bits.length; i += 8) {
      let value = 0;
      for (let j = 0; j < 8; j += 1) {
        value = (value << 1) | (this.bits[i + j] ?? 0);
      }
      result.push(value);
    }
    return result;
  }
}

const makeMatrix = (): Matrix =>
  Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => null));

const makeReserved = (): boolean[][] =>
  Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => false));

const setModule = (
  matrix: Matrix,
  reserved: boolean[][],
  x: number,
  y: number,
  dark: boolean,
  reserve = true,
) => {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  matrix[y][x] = dark;
  if (reserve) reserved[y][x] = true;
};

const drawFinder = (matrix: Matrix, reserved: boolean[][], x: number, y: number) => {
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const xx = x + dx;
      const yy = y + dy;
      const inFinder = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
      const dark =
        inFinder &&
        (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
      setModule(matrix, reserved, xx, yy, dark);
    }
  }
};

const drawAlignment = (matrix: Matrix, reserved: boolean[][], cx: number, cy: number) => {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      setModule(matrix, reserved, cx + dx, cy + dy, dist !== 1);
    }
  }
};

const drawFunctionPatterns = (matrix: Matrix, reserved: boolean[][]) => {
  drawFinder(matrix, reserved, 0, 0);
  drawFinder(matrix, reserved, SIZE - 7, 0);
  drawFinder(matrix, reserved, 0, SIZE - 7);
  drawAlignment(matrix, reserved, 26, 26);

  for (let i = 8; i <= SIZE - 9; i += 1) {
    const dark = i % 2 === 0;
    setModule(matrix, reserved, i, 6, dark);
    setModule(matrix, reserved, 6, i, dark);
  }

  reserveFormatAreas(reserved);
  setModule(matrix, reserved, 8, 4 * VERSION + 9, true);
};

const reserveFormatAreas = (reserved: boolean[][]) => {
  for (let i = 0; i < 9; i += 1) {
    reserved[8][i] = true;
    reserved[i][8] = true;
  }
  for (let i = 0; i < 8; i += 1) {
    reserved[8][SIZE - 1 - i] = true;
    reserved[SIZE - 1 - i][8] = true;
  }
};

const gfTables = (() => {
  const exp = new Array<number>(512).fill(0);
  const log = new Array<number>(256).fill(0);
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    exp[i] = x;
    log[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) exp[i] = exp[i - 255];
  return { exp, log };
})();

const gfMultiply = (x: number, y: number): number => {
  if (x === 0 || y === 0) return 0;
  return gfTables.exp[gfTables.log[x] + gfTables.log[y]];
};

const reedSolomonGenerator = (degree: number): number[] => {
  let generator = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = new Array<number>(generator.length + 1).fill(0);
    for (let j = 0; j < generator.length; j += 1) {
      next[j] ^= gfMultiply(generator[j], gfTables.exp[i]);
      next[j + 1] ^= generator[j];
    }
    generator = next;
  }
  return generator;
};

const reedSolomonRemainder = (data: number[]): number[] => {
  const generator = reedSolomonGenerator(EC_CODEWORDS);
  const result = new Array<number>(EC_CODEWORDS).fill(0);
  for (const value of data) {
    const factor = value ^ result.shift()!;
    result.push(0);
    for (let i = 0; i < EC_CODEWORDS; i += 1) {
      result[i] ^= gfMultiply(generator[i], factor);
    }
  }
  return result;
};

const encodeData = (text: string): number[] => {
  const bytes = Array.from(new TextEncoder().encode(text));
  if (bytes.length > MAX_BYTE_LENGTH) {
    throw new Error(`QR payload too long: ${bytes.length}/${MAX_BYTE_LENGTH} bytes`);
  }

  const bits = new BitBuffer();
  bits.push(0b0100, 4);
  bits.push(bytes.length, 8);
  for (const byte of bytes) bits.push(byte, 8);

  const capacityBits = DATA_CODEWORDS * 8;
  bits.push(0, Math.min(4, capacityBits - bits.length));
  while (bits.length % 8 !== 0) bits.push(0, 1);

  const data = bits.toCodewords();
  for (let pad = 0xec; data.length < DATA_CODEWORDS; pad ^= 0xec ^ 0x11) {
    data.push(pad);
  }
  return data;
};

const formatBits = (): number => {
  const errorCorrectionLow = 1;
  const mask = 0;
  const data = (errorCorrectionLow << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i += 1) {
    rem = (rem << 1) ^ (((rem >>> 9) & 1) ? 0x537 : 0);
  }
  return ((data << 10) | rem) ^ 0x5412;
};

const bitAt = (value: number, index: number): boolean => ((value >>> index) & 1) !== 0;

const drawFormatBits = (matrix: Matrix, reserved: boolean[][]) => {
  const bits = formatBits();
  for (let i = 0; i <= 5; i += 1) setModule(matrix, reserved, 8, i, bitAt(bits, i));
  setModule(matrix, reserved, 8, 7, bitAt(bits, 6));
  setModule(matrix, reserved, 8, 8, bitAt(bits, 7));
  setModule(matrix, reserved, 7, 8, bitAt(bits, 8));
  for (let i = 9; i < 15; i += 1) setModule(matrix, reserved, 14 - i, 8, bitAt(bits, i));
  for (let i = 0; i < 8; i += 1) setModule(matrix, reserved, SIZE - 1 - i, 8, bitAt(bits, i));
  for (let i = 8; i < 15; i += 1) setModule(matrix, reserved, 8, SIZE - 15 + i, bitAt(bits, i));
  setModule(matrix, reserved, 8, SIZE - 8, true);
};

const mask = (x: number, y: number): boolean => (x + y) % 2 === 0;

const drawData = (matrix: Matrix, reserved: boolean[][], codewords: number[]) => {
  const bits = codewords.flatMap(codeword =>
    Array.from({ length: 8 }, (_, index) => (codeword >>> (7 - index)) & 1),
  );
  let bitIndex = 0;
  let upward = true;

  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let vert = 0; vert < SIZE; vert += 1) {
      const y = upward ? SIZE - 1 - vert : vert;
      for (let dx = 0; dx < 2; dx += 1) {
        const x = right - dx;
        if (reserved[y][x]) continue;
        const rawBit = (bits[bitIndex] ?? 0) !== 0;
        setModule(matrix, reserved, x, y, rawBit !== mask(x, y), false);
        bitIndex += 1;
      }
    }
    upward = !upward;
  }
};

const toSvg = (matrix: Matrix): string => {
  const viewBoxSize = SIZE + QUIET_ZONE * 2;
  const path = matrix
    .flatMap((row, y) =>
      row.map((dark, x) => (dark ? `M${x + QUIET_ZONE} ${y + QUIET_ZONE}h1v1h-1z` : '')),
    )
    .filter(Boolean)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" role="img" aria-label="QR code"><rect width="${viewBoxSize}" height="${viewBoxSize}" fill="#fff"/><path d="${path}" fill="#020617"/></svg>`;
};

export function createQrSvg(text: string): string {
  const matrix = makeMatrix();
  const reserved = makeReserved();
  drawFunctionPatterns(matrix, reserved);

  const data = encodeData(text);
  const codewords = data.concat(reedSolomonRemainder(data));
  drawData(matrix, reserved, codewords);
  drawFormatBits(matrix, reserved);

  return toSvg(matrix);
}

export function safeCreateQrSvg(text: string): string {
  try {
    return createQrSvg(text);
  } catch (error) {
    console.warn('Failed to create QR SVG:', error);
    return '';
  }
}
