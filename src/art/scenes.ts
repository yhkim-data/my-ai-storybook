// Hand-coded SVG scenes (cover + 8 story scenes) in six styles. No external images.
import type { StyleId } from '../types';

export const COVER_SCENE_INDEX = 0;
/** Story scenes are numbered 1..STORY_SCENE_COUNT. */
export const STORY_SCENE_COUNT = 8;

/** Canvas side length (SVG user units). */
const CANVAS = 1024;
/** Pixel-art cell size (SVG user units). */
const PIXEL_CELL = 32;
const PIXEL_GRID = CANVAS / PIXEL_CELL;
/** Shapes this small (in cells) always paint their center cell so they don't vanish. */
const PIXEL_SMALL_CELLS = 2;
/** Coordinates are rounded to 1 decimal place. */
const ROUND_SCALE = 10;
/** Marker color for ground shadows; only the clay style draws them. */
const SHADOW_COLOR = 'shadow';

const COLOR = {
  fox: '#f28c28',
  fox_dark: '#7a3b1c',
  cream: '#fff1d6',
  white: '#ffffff',
  scarf: '#d62839',
  ink: '#2b2118',
  bird: '#4a90e2',
  bird_dark: '#2c5fa8',
  beak: '#ffb703',
  sky_day: '#bfe6ff',
  sky_far: '#d9f0ff',
  grass: '#6cc070',
  grass_light: '#8fd48a',
  grass_dark: '#3f8f55',
  path: '#e3c48b',
  trunk: '#8a5a3c',
  leaf: '#3f9a5a',
  leaf_dark: '#2f7a48',
  night: '#1b2250',
  night_hill: '#2f5d46',
  moon: '#fff6c8',
  star: '#ffe98a',
  water: '#5fb4e8',
  water_light: '#9fd6f5',
  wood: '#9a6b3f',
  wall: '#f6d9a8',
  roof: '#b5452f',
  door: '#7a4a2a',
  window: '#9ad1f5',
  sun: '#ffd84a',
  flower_pink: '#ff7fa8',
  flower_yellow: '#ffd23f',
} as const;

interface RectShape {
  k: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  c: string;
}
/** Ellipse; circles are ellipses too. */
interface EllShape {
  k: 'ell';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  c: string;
}
/** Polygon; pts is a flat x,y,x,y list. */
interface PolyShape {
  k: 'poly';
  pts: number[];
  c: string;
}
type Shape = RectShape | EllShape | PolyShape;

type Scene = Shape[];

function rect(x: number, y: number, w: number, h: number, c: string): Shape {
  return { k: 'rect', x, y, w, h, c };
}

function ell(cx: number, cy: number, rx: number, ry: number, c: string): Shape {
  return { k: 'ell', cx, cy, rx, ry, c };
}

function poly(c: string, pts: number[]): Shape {
  return { k: 'poly', pts, c };
}

/** A four-pointed star has 8 vertices. */
const STAR_POINTS = 8;
/** Inner vertex radius as a fraction of the outer radius. */
const STAR_INNER_RATIO = 0.4;
const FULL_TURN_DEG = 360;
const HALF_TURN_DEG = 180;
/** Start angle (deg) so the first point faces up. */
const STAR_START_DEG = -90;

function star(cx: number, cy: number, r: number, c: string): Shape {
  const pts: number[] = [];
  for (let i = 0; i < STAR_POINTS; i += 1) {
    const angle = ((STAR_START_DEG + (i * FULL_TURN_DEG) / STAR_POINTS) * Math.PI) / HALF_TURN_DEG;
    const radius = i % 2 === 0 ? r : r * STAR_INNER_RATIO;
    pts.push(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
  }
  return poly(c, pts);
}

/** Translates and scales a shape group, optionally mirroring it horizontally. */
function place(shapes: Scene, dx: number, dy: number, s: number, flip = false): Scene {
  const mx = (x: number): number => dx + (flip ? -x : x) * s;
  const my = (y: number): number => dy + y * s;
  return shapes.map((shape): Shape => {
    if (shape.k === 'rect') {
      const x1 = mx(shape.x);
      const x2 = mx(shape.x + shape.w);
      return rect(Math.min(x1, x2), my(shape.y), Math.abs(x2 - x1), shape.h * s, shape.c);
    }
    if (shape.k === 'ell') {
      return ell(mx(shape.cx), my(shape.cy), shape.rx * s, shape.ry * s, shape.c);
    }
    const pts = shape.pts.map((value, index) => (index % 2 === 0 ? mx(value) : my(value)));
    return poly(shape.c, pts);
  });
}

/** Hero fox; origin is between the feet, facing right. */
const FOX_PARTS: Scene = [
  ell(-25, 2, 110, 14, SHADOW_COLOR),
  ell(-95, -80, 70, 30, COLOR.fox),
  ell(-146, -88, 22, 20, COLOR.white),
  ell(0, -70, 70, 55, COLOR.fox),
  ell(20, -58, 40, 34, COLOR.cream),
  ell(-30, -12, 18, 14, COLOR.fox_dark),
  ell(30, -12, 18, 14, COLOR.fox_dark),
  poly(COLOR.fox, [22, -160, 28, -228, 66, -176]),
  poly(COLOR.fox, [68, -176, 96, -230, 106, -158]),
  poly(COLOR.fox_dark, [32, -170, 34, -208, 54, -176]),
  poly(COLOR.fox_dark, [78, -176, 92, -208, 98, -170]),
  ell(58, -135, 56, 48, COLOR.fox),
  ell(60, -112, 38, 22, COLOR.cream),
  ell(42, -142, 6, 8, COLOR.ink),
  ell(78, -142, 6, 8, COLOR.ink),
  ell(60, -120, 9, 7, COLOR.ink),
  ell(44, -94, 50, 14, COLOR.scarf),
  poly(COLOR.scarf, [14, -96, 40, -96, 34, -48, 8, -54]),
];

/** Blue bird friend; origin is between the feet, facing right. */
const BIRD_PARTS: Scene = [
  ell(0, 2, 44, 8, SHADOW_COLOR),
  rect(-12, -14, 6, 14, COLOR.beak),
  rect(8, -14, 6, 14, COLOR.beak),
  poly(COLOR.bird_dark, [-30, -44, -78, -66, -74, -30]),
  ell(0, -44, 40, 30, COLOR.bird),
  ell(6, -26, 26, 14, COLOR.cream),
  ell(-8, -44, 22, 14, COLOR.bird_dark),
  ell(32, -72, 22, 22, COLOR.bird),
  poly(COLOR.beak, [50, -76, 70, -68, 50, -62]),
  ell(38, -76, 4, 5, COLOR.ink),
];

/** House; origin is the bottom center. */
const HOUSE_PARTS: Scene = [
  rect(90, -410, 40, 90, '#8a5a44'),
  rect(-180, -260, 360, 260, COLOR.wall),
  poly(COLOR.roof, [-215, -255, 0, -420, 215, -255]),
  rect(-40, -150, 80, 150, COLOR.door),
  ell(22, -76, 6, 6, COLOR.beak),
  rect(80, -200, 70, 70, COLOR.window),
  rect(-150, -200, 70, 70, COLOR.window),
];

/** Sky stars as [x, y, radius]. */
const STAR_FIELD: number[][] = [
  [90, 110, 18],
  [220, 230, 14],
  [340, 90, 20],
  [470, 200, 14],
  [600, 80, 18],
  [700, 250, 14],
  [880, 120, 20],
  [960, 300, 14],
  [140, 380, 16],
  [310, 330, 12],
  [820, 400, 16],
  [930, 480, 12],
  [60, 520, 14],
  [560, 340, 12],
];

/** Wildflowers as [x, y, color index]. */
const FLOWER_SPOTS: number[][] = [
  [90, 760, 0],
  [200, 900, 1],
  [330, 820, 0],
  [720, 780, 1],
  [850, 920, 0],
  [940, 800, 1],
  [620, 960, 0],
  [120, 980, 1],
];

function star_sky(): Scene {
  return STAR_FIELD.map(([x = 0, y = 0, r = 0]) => star(x, y, r, COLOR.star));
}

function flowers(): Scene {
  return FLOWER_SPOTS.flatMap(([x = 0, y = 0, kind = 0]) => [
    ell(x, y, 12, 12, kind === 0 ? COLOR.flower_pink : COLOR.flower_yellow),
    ell(x, y, 5, 5, COLOR.white),
  ]);
}

/** base_y is the y of the trunk bottom. */
function tree(x: number, base_y: number, s: number, leaf: string): Scene {
  return [
    rect(x - 16 * s, base_y - 130 * s, 32 * s, 130 * s, COLOR.trunk),
    ell(x, base_y - 170 * s, 80 * s, 90 * s, leaf),
    ell(x - 40 * s, base_y - 130 * s, 50 * s, 50 * s, leaf),
    ell(x + 40 * s, base_y - 130 * s, 50 * s, 50 * s, leaf),
  ];
}

function fox_at(x: number, y: number, s: number, flip = false): Scene {
  return place(FOX_PARTS, x, y, s, flip);
}

function bird_at(x: number, y: number, s: number, flip = false): Scene {
  return place(BIRD_PARTS, x, y, s, flip);
}

function cloud(x: number, y: number, s: number): Scene {
  return [
    ell(x, y, 80 * s, 28 * s, COLOR.white),
    ell(x - 30 * s, y - 20 * s, 40 * s, 30 * s, COLOR.white),
    ell(x + 30 * s, y - 24 * s, 44 * s, 34 * s, COLOR.white),
  ];
}

function build_scene(index: number): Scene {
  const full = (c: string): Shape => rect(0, 0, CANVAS, CANVAS, c);
  switch (index) {
    case 1:
      // Morning in front of the house
      return [
        full(COLOR.sky_day),
        ell(800, 170, 120, 120, '#fff0a8'),
        ell(800, 170, 90, 90, COLOR.sun),
        ...cloud(220, 190, 1),
        rect(0, 690, CANVAS, 334, COLOR.grass),
        ell(820, 700, 300, 90, COLOR.grass_light),
        ...place(HOUSE_PARTS, 330, 720, 1),
        poly(COLOR.path, [290, 720, 370, 720, 560, 1024, 200, 1024]),
        ...fox_at(740, 900, 1.3, true),
      ];
    case 2:
      // Path through the fields
      return [
        full(COLOR.sky_day),
        ell(150, 150, 70, 70, COLOR.sun),
        ...cloud(640, 170, 1.2),
        ell(250, 640, 400, 110, COLOR.grass_light),
        ell(800, 650, 380, 100, COLOR.grass),
        rect(0, 640, CANVAS, 384, COLOR.grass),
        poly(COLOR.path, [450, 640, 570, 640, 930, 1024, 150, 1024]),
        ...flowers(),
        ...fox_at(560, 930, 1.3),
      ];
    case 3:
      // In the forest
      return [
        full('#a8d8a0'),
        rect(0, 640, CANVAS, 384, COLOR.leaf_dark),
        ...tree(120, 700, 1.3, COLOR.grass_dark),
        ...tree(430, 680, 1.1, COLOR.grass_dark),
        ...tree(760, 700, 1.3, COLOR.grass_dark),
        ...tree(950, 680, 1, COLOR.grass_dark),
        poly('#e6f5b8', [600, 0, 700, 0, 540, 720, 400, 720]),
        ...tree(40, 960, 1.6, COLOR.leaf),
        ...tree(980, 960, 1.6, COLOR.leaf),
        ...fox_at(520, 930, 1.3),
      ];
    case 4:
      // River and bridge
      return [
        full(COLOR.sky_day),
        ...cloud(780, 170, 1),
        ell(260, 600, 360, 100, COLOR.grass_light),
        rect(0, 600, 300, 424, COLOR.grass),
        rect(724, 600, 300, 424, COLOR.grass),
        rect(300, 640, 424, 384, COLOR.water),
        ell(400, 760, 70, 10, COLOR.water_light),
        ell(620, 860, 80, 10, COLOR.water_light),
        ell(500, 940, 60, 8, COLOR.water_light),
        rect(250, 600, 524, 36, COLOR.wood),
        rect(250, 530, 524, 14, COLOR.wood),
        ...[250, 380, 512, 644, 760].map((x) => rect(x, 530, 14, 70, COLOR.wood)),
        ...fox_at(512, 602, 1),
      ];
    case 5:
      // Meeting the friend
      return [
        full(COLOR.sky_day),
        ell(860, 150, 70, 70, COLOR.sun),
        ...cloud(240, 170, 1),
        ell(300, 680, 420, 100, COLOR.grass_light),
        rect(0, 690, CANVAS, 334, COLOR.grass),
        ...tree(880, 720, 1.2, COLOR.leaf),
        ...flowers(),
        star(500, 560, 26, COLOR.star),
        star(580, 500, 18, COLOR.star),
        ...fox_at(330, 880, 1.4),
        ...bird_at(700, 880, 1.8, true),
      ];
    case 6:
      // Night hill and stars
      return [
        full(COLOR.night),
        ell(800, 170, 70, 70, COLOR.moon),
        ell(830, 150, 56, 56, COLOR.night),
        ...star_sky(),
        ell(150, 900, 300, 150, '#243f5a'),
        ell(512, 1200, 760, 480, COLOR.night_hill),
        ...fox_at(512, 740, 1.3),
      ];
    case 7:
      // Finding the treasure: a glowing light
      return [
        full('#2a2a62'),
        ...STAR_FIELD.slice(0, 8).map(([x = 0, y = 0, r = 0]) => star(x, y, r, COLOR.star)),
        ell(512, 1250, 800, 420, COLOR.night_hill),
        poly('#4a4592', [720, 720, 560, 380, 880, 380]),
        poly('#4a4592', [720, 720, 400, 640, 400, 800]),
        ell(720, 720, 260, 260, '#5a4f9a'),
        ell(720, 720, 190, 190, '#f7e58a'),
        ell(720, 720, 120, 120, '#fff6b0'),
        star(720, 720, 90, COLOR.white),
        star(560, 560, 24, COLOR.white),
        star(900, 560, 20, COLOR.white),
        ...fox_at(330, 900, 1.4),
      ];
    default:
      // Heading home with the friend at sunset
      return [
        rect(0, 0, CANVAS, 300, '#ff9a76'),
        rect(0, 300, CANVAS, 250, '#ffb88a'),
        rect(0, 550, CANVAS, 300, '#ffd9a8'),
        ell(512, 760, 140, 140, COLOR.sun),
        rect(0, 780, CANVAS, 244, '#6fae6a'),
        ...place(HOUSE_PARTS, 800, 790, 0.9),
        poly(COLOR.path, [760, 790, 840, 790, 700, 1024, 400, 1024]),
        ...fox_at(300, 940, 1.3),
        ...bird_at(560, 920, 1.6),
      ];
  }
}

function build_cover(): Scene {
  return [
    rect(0, 0, CANVAS, CANVAS, '#1f2a5c'),
    ell(840, 160, 80, 80, COLOR.moon),
    ell(872, 140, 64, 64, '#1f2a5c'),
    ...star_sky(),
    ell(512, 1250, 900, 450, '#2f6b4a'),
    ...fox_at(540, 880, 2.2),
  ];
}

/** 0 stays the cover; any other index wraps into 1..8. */
function normalize_scene_index(scene_index: number): number {
  const whole = Number.isFinite(scene_index) ? Math.trunc(scene_index) : 1;
  if (whole === COVER_SCENE_INDEX) return COVER_SCENE_INDEX;
  return ((((whole - 1) % STORY_SCENE_COUNT) + STORY_SCENE_COUNT) % STORY_SCENE_COUNT) + 1;
}

const HEX_RADIX = 16;
const BYTE_MAX = 255;
/** Rec. 601 luma weights. */
const LUMA_R = 0.299;
const LUMA_G = 0.587;
const LUMA_B = 0.114;

function hex_to_rgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), HEX_RADIX);
  return [(value >> 16) & BYTE_MAX, (value >> 8) & BYTE_MAX, value & BYTE_MAX];
}

function rgb_to_hex(r: number, g: number, b: number): string {
  const part = (n: number): string =>
    Math.max(0, Math.min(BYTE_MAX, Math.round(n))).toString(HEX_RADIX).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** Blends color a toward b by amount (0-1). */
function mix(a: string, b: string, amount: number): string {
  const [ar, ag, ab] = hex_to_rgb(a);
  const [br, bg, bb] = hex_to_rgb(b);
  return rgb_to_hex(ar + (br - ar) * amount, ag + (bg - ag) * amount, ab + (bb - ab) * amount);
}

/** Perceived brightness, 0-1. */
function luminance(hex: string): number {
  const [r, g, b] = hex_to_rgb(hex);
  return (LUMA_R * r + LUMA_G * g + LUMA_B * b) / BYTE_MAX;
}

function num(n: number): string {
  return String(Math.round(n * ROUND_SCALE) / ROUND_SCALE);
}

function shape_to_element(shape: Shape, attrs: string): string {
  if (shape.k === 'rect') {
    return `<rect x="${num(shape.x)}" y="${num(shape.y)}" width="${num(shape.w)}" height="${num(shape.h)}" ${attrs}/>`;
  }
  if (shape.k === 'ell') {
    return `<ellipse cx="${num(shape.cx)}" cy="${num(shape.cy)}" rx="${num(shape.rx)}" ry="${num(shape.ry)}" ${attrs}/>`;
  }
  const points: string[] = [];
  for (let i = 0; i + 1 < shape.pts.length; i += 2) {
    points.push(`${num(shape.pts[i] ?? 0)},${num(shape.pts[i + 1] ?? 0)}`);
  }
  return `<polygon points="${points.join(' ')}" ${attrs}/>`;
}

/** Point-in-shape test; polygons use even-odd ray casting. */
function shape_contains(shape: Shape, px: number, py: number): boolean {
  if (shape.k === 'rect') {
    return px >= shape.x && px <= shape.x + shape.w && py >= shape.y && py <= shape.y + shape.h;
  }
  if (shape.k === 'ell') {
    const dx = (px - shape.cx) / shape.rx;
    const dy = (py - shape.cy) / shape.ry;
    return dx * dx + dy * dy <= 1;
  }
  let inside = false;
  const n = shape.pts.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i, i += 1) {
    const xi = shape.pts[i * 2] ?? 0;
    const yi = shape.pts[i * 2 + 1] ?? 0;
    const xj = shape.pts[j * 2] ?? 0;
    const yj = shape.pts[j * 2 + 1] ?? 0;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function shape_bounds(shape: Shape): [number, number, number, number] {
  if (shape.k === 'rect') return [shape.x, shape.y, shape.x + shape.w, shape.y + shape.h];
  if (shape.k === 'ell') {
    return [shape.cx - shape.rx, shape.cy - shape.ry, shape.cx + shape.rx, shape.cy + shape.ry];
  }
  const xs = shape.pts.filter((_v, i) => i % 2 === 0);
  const ys = shape.pts.filter((_v, i) => i % 2 === 1);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

function clamp_cell(n: number): number {
  return Math.max(0, Math.min(PIXEL_GRID - 1, n));
}

/** Rasterizes shapes onto the pixel grid and merges horizontal runs into rects. */
function render_pixel_body(shapes: Scene): string {
  const grid: (string | null)[] = new Array<string | null>(PIXEL_GRID * PIXEL_GRID).fill(null);
  for (const shape of shapes) {
    if (shape.c === SHADOW_COLOR) continue;
    const [x1, y1, x2, y2] = shape_bounds(shape);
    const col_from = clamp_cell(Math.floor(x1 / PIXEL_CELL));
    const col_to = clamp_cell(Math.floor(x2 / PIXEL_CELL));
    const row_from = clamp_cell(Math.floor(y1 / PIXEL_CELL));
    const row_to = clamp_cell(Math.floor(y2 / PIXEL_CELL));
    let painted = false;
    for (let row = row_from; row <= row_to; row += 1) {
      for (let col = col_from; col <= col_to; col += 1) {
        const cx = col * PIXEL_CELL + PIXEL_CELL / 2;
        const cy = row * PIXEL_CELL + PIXEL_CELL / 2;
        if (shape_contains(shape, cx, cy)) {
          grid[row * PIXEL_GRID + col] = shape.c;
          painted = true;
        }
      }
    }
    // Paint the center cell so small shapes (stars, flowers) don't disappear
    const is_small = x2 - x1 <= PIXEL_CELL * PIXEL_SMALL_CELLS && y2 - y1 <= PIXEL_CELL * PIXEL_SMALL_CELLS;
    if (!painted && is_small) {
      const col = clamp_cell(Math.floor((x1 + x2) / 2 / PIXEL_CELL));
      const row = clamp_cell(Math.floor((y1 + y2) / 2 / PIXEL_CELL));
      grid[row * PIXEL_GRID + col] = shape.c;
    }
  }
  const out: string[] = [];
  for (let row = 0; row < PIXEL_GRID; row += 1) {
    let col = 0;
    while (col < PIXEL_GRID) {
      const color = grid[row * PIXEL_GRID + col];
      let end = col;
      while (end + 1 < PIXEL_GRID && grid[row * PIXEL_GRID + end + 1] === color) end += 1;
      if (color) {
        const run = end - col + 1;
        out.push(
          `<rect x="${col * PIXEL_CELL}" y="${row * PIXEL_CELL}" width="${run * PIXEL_CELL}" height="${PIXEL_CELL}" fill="${color}"/>`,
        );
      }
      col = end + 1;
    }
  }
  return `<g shape-rendering="crispEdges">${out.join('')}</g>`;
}

const WATERCOLOR_WHITE_MIX = 0.45;
const WATERCOLOR_OPACITY = 0.92;
const WATERCOLOR_NOISE_FREQ = 0.02;
const WATERCOLOR_DISPLACE = 10;
const WATERCOLOR_BLUR = 1.5;
const WATERCOLOR_PAPER = '#fffaf0';
const CRAYON_NOISE_FREQ = 0.035;
const CRAYON_DISPLACE = 24;
const CRAYON_STROKE = 8;
const CRAYON_PAPER = '#fff6e0';
const CLAY_LIGHT_MIX = 0.45;
const CLAY_DARK_MIX = 0.3;
const CLAY_SHADOW_OPACITY = 0.28;
const PAPERCUT_SHADOW_DX = 6;
const PAPERCUT_SHADOW_DY = 8;
const PAPERCUT_SHADOW_BLUR = 4;
const PAPERCUT_SHADOW_OPACITY = 0.35;
const PENCIL_LINE = '#555555';
const PENCIL_PAPER = '#fbfaf7';
const PENCIL_STROKE = 3;
const PENCIL_DARK_LUMA = 0.35;
const PENCIL_MID_LUMA = 0.65;
const PENCIL_DARK_GAP = 6;
const PENCIL_LIGHT_GAP = 12;

/** Renders the inner SVG (with defs) for every style except pixel. */
function render_styled_body(shapes: Scene, style_id: Exclude<StyleId, 'pixel'>): string {
  // Only the clay style draws shadow shapes
  const drawn = style_id === 'clay' ? shapes : shapes.filter((s) => s.c !== SHADOW_COLOR);

  if (style_id === 'watercolor') {
    const body = drawn
      .map((s) =>
        shape_to_element(
          s,
          `fill="${mix(s.c, COLOR.white, WATERCOLOR_WHITE_MIX)}" fill-opacity="${WATERCOLOR_OPACITY}"`,
        ),
      )
      .join('');
    return (
      `<defs><filter id="wc_wash" x="-5%" y="-5%" width="110%" height="110%">` +
      `<feTurbulence type="fractalNoise" baseFrequency="${WATERCOLOR_NOISE_FREQ}" numOctaves="2" seed="3" result="noise"/>` +
      `<feDisplacementMap in="SourceGraphic" in2="noise" scale="${WATERCOLOR_DISPLACE}" result="bent"/>` +
      `<feGaussianBlur in="bent" stdDeviation="${WATERCOLOR_BLUR}"/></filter></defs>` +
      `<rect width="${CANVAS}" height="${CANVAS}" fill="${WATERCOLOR_PAPER}"/>` +
      `<g filter="url(#wc_wash)">${body}</g>`
    );
  }

  if (style_id === 'crayon') {
    const body = drawn
      .map((s) =>
        shape_to_element(
          s,
          `fill="${s.c}" stroke="${COLOR.ink}" stroke-width="${CRAYON_STROKE}" stroke-linejoin="round"`,
        ),
      )
      .join('');
    return (
      `<defs><filter id="cr_rough" x="-5%" y="-5%" width="110%" height="110%">` +
      `<feTurbulence type="turbulence" baseFrequency="${CRAYON_NOISE_FREQ}" numOctaves="3" seed="7" result="noise"/>` +
      `<feDisplacementMap in="SourceGraphic" in2="noise" scale="${CRAYON_DISPLACE}"/></filter></defs>` +
      `<rect width="${CANVAS}" height="${CANVAS}" fill="${CRAYON_PAPER}"/>` +
      `<g filter="url(#cr_rough)">${body}</g>`
    );
  }

  if (style_id === 'clay') {
    const gradient_ids = new Map<string, string>();
    const body = drawn
      .map((s) => {
        if (s.c === SHADOW_COLOR) {
          return shape_to_element(s, `fill="#000000" fill-opacity="${CLAY_SHADOW_OPACITY}"`);
        }
        let id = gradient_ids.get(s.c);
        if (id === undefined) {
          id = `clay_${gradient_ids.size}`;
          gradient_ids.set(s.c, id);
        }
        return shape_to_element(s, `fill="url(#${id})"`);
      })
      .join('');
    const defs = [...gradient_ids.entries()]
      .map(
        ([color, id]) =>
          `<radialGradient id="${id}" cx="0.35" cy="0.3" r="0.85">` +
          `<stop offset="0" stop-color="${mix(color, COLOR.white, CLAY_LIGHT_MIX)}"/>` +
          `<stop offset="0.55" stop-color="${color}"/>` +
          `<stop offset="1" stop-color="${mix(color, '#000000', CLAY_DARK_MIX)}"/></radialGradient>`,
      )
      .join('');
    return `<defs>${defs}</defs>${body}`;
  }

  if (style_id === 'papercut') {
    const body = drawn.map((s) => shape_to_element(s, `fill="${s.c}" filter="url(#pc_shadow)"`)).join('');
    return (
      `<defs><filter id="pc_shadow" x="-10%" y="-10%" width="125%" height="125%">` +
      `<feDropShadow dx="${PAPERCUT_SHADOW_DX}" dy="${PAPERCUT_SHADOW_DY}" stdDeviation="${PAPERCUT_SHADOW_BLUR}" flood-color="#000000" flood-opacity="${PAPERCUT_SHADOW_OPACITY}"/></filter></defs>` +
      body
    );
  }

  // Pencil: gray outlines and hatching
  const body = drawn
    .map((s) => {
      const luma = luminance(s.c);
      const fill =
        luma < PENCIL_DARK_LUMA ? 'url(#pn_dark)' : luma < PENCIL_MID_LUMA ? 'url(#pn_light)' : PENCIL_PAPER;
      return shape_to_element(
        s,
        `fill="${fill}" stroke="${PENCIL_LINE}" stroke-width="${PENCIL_STROKE}" stroke-linejoin="round"`,
      );
    })
    .join('');
  const hatch = (id: string, gap: number): string =>
    `<pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
    `<rect width="${gap}" height="${gap}" fill="${PENCIL_PAPER}"/>` +
    `<line x1="0" y1="0" x2="0" y2="${gap}" stroke="${PENCIL_LINE}" stroke-width="2"/></pattern>`;
  return `<defs>${hatch('pn_dark', PENCIL_DARK_GAP)}${hatch('pn_light', PENCIL_LIGHT_GAP)}</defs>${body}`;
}

/**
 * Returns a square SVG for a scene (0 = cover, 1-8 = story) in the given style.
 * Out-of-range indices wrap into 1-8.
 */
export function render_scene_svg(scene_index: number, style_id: StyleId): string {
  const index = normalize_scene_index(scene_index);
  const shapes = index === COVER_SCENE_INDEX ? build_cover() : build_scene(index);
  const body =
    style_id === 'pixel' ? render_pixel_body(shapes) : render_styled_body(shapes, style_id);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}" width="${CANVAS}" height="${CANVAS}">${body}</svg>`;
}
