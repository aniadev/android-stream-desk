/**
 * Hex normalization + color math shared between Dashboard color editor and
 * GridButton neon glow rendering. No external deps.
 *
 * normalizeHex examples:
 *   '#FF00FF'   -> '#ff00ff'
 *   'ff00ff'    -> '#ff00ff'
 *   '#f0a'      -> '#ff00aa'
 *   'aBcDeF'    -> '#abcdef'
 *   '  #abc  '  -> '#aabbcc'
 *   '#abcd'     -> null
 *   '#ggg'      -> null
 *   ''          -> null
 */
export function normalizeHex(input: string): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]+$/.test(trimmed)) return null;
  let body: string;
  if (trimmed.length === 3) {
    body = trimmed.split('').map((c) => c + c).join('');
  } else if (trimmed.length === 6) {
    body = trimmed;
  } else {
    return null;
  }
  return '#' + body.toLowerCase();
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const norm = normalizeHex(hex);
  if (!norm) return null;
  return {
    r: parseInt(norm.slice(1, 3), 16),
    g: parseInt(norm.slice(3, 5), 16),
    b: parseInt(norm.slice(5, 7), 16),
  };
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const nr = r / 255, ng = g / 255, nb = b / 255;
  const max = Math.max(nr, ng, nb), min = Math.min(nr, ng, nb);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case nr: h = ((ng - nb) / d + (ng < nb ? 6 : 0)) / 6; break;
      case ng: h = ((nb - nr) / d + 2) / 6; break;
      case nb: h = ((nr - ng) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToString(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}
