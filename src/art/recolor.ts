// Practice mode's "Fix the picture": the sample pictures can only change one thing's color. A note such as
// "목도리 파랗게" or "make the scarf blue" names a thing and a color; every color that thing is drawn with
// in the sample scenes gets the new hue and keeps its lightness. Colors come from the palette C in tools/art/lib.py.

/** A thing in the sample pictures, the words that name it, and the palette colors it is drawn with. */
interface RecolorTarget {
  id: string;
  words: string[];
  colors: string[];
}

/** A color the note can ask for. white and black change lightness instead of hue. */
interface RecolorColor {
  id: string;
  words: string[];
  hue: number | 'white' | 'black';
}

/** Longer words come first where one word starts another. */
export const RECOLOR_TARGETS: RecolorTarget[] = [
  { id: 'scarf', words: ['목도리', '스카프', 'scarf'], colors: ['#E23B3F', '#BC2C35', '#F2675F'] },
  { id: 'bird', words: ['새', 'bird'], colors: ['#4A90E2', '#7DB4F0', '#2F6FC0', '#B4DAFA'] },
  { id: 'fox', words: ['여우', '털', 'fox', 'fur'], colors: ['#F28A36', '#DE6E22', '#FFA55A'] },
  { id: 'roof', words: ['지붕', 'roof'], colors: ['#DE6440', '#B94C2E'] },
  { id: 'star', words: ['별', 'star'], colors: ['#FFD54A', '#FFF2AE', '#F7B731'] },
  { id: 'door', words: ['문', 'door'], colors: ['#8F5A36'] },
  { id: 'leaf', words: ['나뭇잎', '나무', '잎', 'leaves', 'leaf', 'tree'], colors: ['#62BA67', '#449E57', '#93D884'] },
  { id: 'grass', words: ['잔디', '풀', 'grass'], colors: ['#86CC74', '#5BAE5E', '#B0E092'] },
  { id: 'water', words: ['물', '강', '바다', 'water', 'river', 'sea'], colors: ['#66C0EA', '#45A3D6', '#C6EBFB'] },
  { id: 'mushroom', words: ['버섯', 'mushroom'], colors: ['#F05A5A'] },
];

export const RECOLOR_COLORS: RecolorColor[] = [
  { id: 'red', words: ['빨강', '빨갛', '빨간', '붉은', 'red'], hue: 0 },
  { id: 'orange', words: ['주황', 'orange'], hue: 28 },
  { id: 'yellow', words: ['노랑', '노랗', '노란', 'yellow'], hue: 50 },
  { id: 'green', words: ['초록', '녹색', 'green'], hue: 125 },
  { id: 'blue', words: ['파랑', '파랗', '파란', 'blue'], hue: 215 },
  { id: 'purple', words: ['보라', 'purple', 'violet'], hue: 275 },
  { id: 'pink', words: ['분홍', '핑크', 'pink'], hue: 335 },
  { id: 'white', words: ['하양', '하얗', '하얀', '흰', 'white'], hue: 'white' },
  { id: 'black', words: ['검정', '까맣', '까만', '검은', 'black'], hue: 'black' },
];

/** Least saturation a recolored piece gets, so a pale thing still shows its new color. */
const MIN_SATURATION = 0.45;
/** Lightness range for white and black. */
const WHITE_LIGHTNESS = 0.9;
const BLACK_LIGHTNESS = 0.16;
/** How much of the original light and shade is kept for white and black. */
const SHADE_KEEP = 0.15;
const HALF = 0.5;
const FULL_TURN = 360;
const HEX_COLOR = /#[0-9a-f]{6}\b/gi;
/** Comment inside the SVG that remembers which palette color is drawn in which new color, so fixes can chain. */
const MAP_COMMENT = /<!--recolor:(\{[^>]*\})-->/;

export interface RecolorRequest {
  target: RecolorTarget;
  color: RecolorColor;
}

/** Finds the thing and the color a note asks for; null if either is missing. */
export function parse_recolor_note(note: string): RecolorRequest | null {
  const tokens = note
    .toLowerCase()
    .split(/[\s,.!?~·]+/)
    .filter((token) => token.length > 0);
  let target: RecolorTarget | undefined;
  let target_token = -1;
  for (const [index, token] of tokens.entries()) {
    target = RECOLOR_TARGETS.find((item) => item.words.some((word) => token.startsWith(word)));
    if (target) {
      target_token = index;
      break;
    }
  }
  if (!target) return null;
  const color = tokens
    .filter((_, index) => index !== target_token)
    .map((token) => RECOLOR_COLORS.find((item) => item.words.some((word) => token.startsWith(word))))
    .find((item) => item !== undefined);
  return color ? { target, color } : null;
}

interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function hex_to_hsl(hex: string): Hsl {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > HALF ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: (h * FULL_TURN) / 6, s, l };
}

export function hsl_to_hex({ h, s, l }: Hsl): string {
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const value = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`.toUpperCase();
}

/** The new color for one palette color: the asked hue with the same lightness (white and black keep a little shade). */
export function recolor_hex(hex: string, color: RecolorColor): string {
  const hsl = hex_to_hsl(hex);
  if (color.hue === 'white') return hsl_to_hex({ h: hsl.h, s: hsl.s * SHADE_KEEP, l: WHITE_LIGHTNESS + (hsl.l - HALF) * SHADE_KEEP });
  if (color.hue === 'black') return hsl_to_hex({ h: hsl.h, s: hsl.s * SHADE_KEEP, l: BLACK_LIGHTNESS + (hsl.l - HALF) * SHADE_KEEP });
  return hsl_to_hex({ h: color.hue, s: Math.max(hsl.s, MIN_SATURATION), l: hsl.l });
}

/**
 * Recolors one thing in a sample-picture SVG. Returns null when the picture has none of that thing's colors.
 * Works on a picture that was recolored before: the comment in the SVG says which color each palette color became.
 */
export function recolor_svg(svg: string, request: RecolorRequest): string | null {
  const map_match = MAP_COMMENT.exec(svg);
  const map = map_match ? (JSON.parse(map_match[1] ?? '{}') as Record<string, string>) : {};
  const replace = new Map<string, string>();
  for (const palette_color of request.target.colors) {
    const key = palette_color.toUpperCase();
    const now = (map[key] ?? key).toUpperCase();
    const next = recolor_hex(palette_color, request.color);
    replace.set(now, next);
    map[key] = next;
  }
  let changed = false;
  const body = svg.replace(MAP_COMMENT, '').replace(HEX_COLOR, (found) => {
    const next = replace.get(found.toUpperCase());
    if (next === undefined) return found;
    changed = true;
    return next;
  });
  if (!changed) return null;
  const comment = `<!--recolor:${JSON.stringify(map)}-->`;
  return body.replace(/<svg\b[^>]*>/, (open_tag) => `${open_tag}${comment}`);
}
