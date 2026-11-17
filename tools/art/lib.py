"""SVG drawing kit for the storybook sample scenes (cover + 8 scenes).

Scenes are 1024 x 1024. Every visually separate blob is wrapped in <g data-part="1"> so the
clay and paper-cut styles can light or shadow each piece on its own. Everything else (sky,
tiny details, faces) is plain.
"""
import math

W = H = 1024

C = {
    # fox
    "fox": "#F28A36", "fox_shade": "#DE6E22", "fox_light": "#FFA55A",
    "cream": "#FFF5E6", "ear_in": "#FFCDB8", "ear_tip": "#6A3820", "paw": "#7E4422",
    "eye": "#2B1E1A", "nose": "#3A2A24", "blush": "#FF8A8A", "mouth": "#7A3430", "tongue": "#FF8C8C",
    "scarf": "#E23B3F", "scarf_shade": "#BC2C35", "scarf_light": "#F2675F",
    # bird
    "bird": "#4A90E2", "bird_light": "#7DB4F0", "bird_shade": "#2F6FC0", "bird_belly": "#B4DAFA", "beak": "#FFB13D",
    # star
    "star": "#FFD54A", "star_light": "#FFF2AE", "star_shade": "#F7B731",
    # world
    "grass": "#86CC74", "grass_dark": "#5BAE5E", "grass_light": "#B0E092",
    "path": "#F5DDAE", "path_shade": "#E8C68E",
    "trunk": "#9C6B46", "trunk_dark": "#7B5236", "trunk_light": "#B98760",
    "leaf": "#62BA67", "leaf_dark": "#449E57", "leaf_light": "#93D884",
    "wall": "#FBE7C0", "wall_shade": "#EDD09E", "roof": "#DE6440", "roof_dark": "#B94C2E",
    "door": "#8F5A36", "window": "#AEDDF4", "window_warm": "#FFE59A",
    "water": "#66C0EA", "water_deep": "#45A3D6", "water_light": "#C6EBFB",
    "wood": "#C08A56", "wood_dark": "#94653A", "wood_light": "#D9A874", "rope": "#8C6442",
    "rock": "#B3BCC4", "rock_dark": "#8E99A3",
    "pink": "#FF94B6", "pink_dark": "#F0709A", "yellow": "#FFD34A", "white": "#FFFFFF",
    "violet": "#B9A0F2", "lilac": "#D7C6FF", "mushroom": "#F05A5A",
}


def f(v):
    """Format a number compactly: whole numbers for large values, 1 decimal for small ones."""
    s = f"{v:.0f}" if abs(v) >= 10 else f"{v:.1f}"
    if s.endswith(".0"):
        s = s[:-2]
    return "0" if s == "-0" else s


def P(content, extra=""):
    """A separately lit / shadowed piece."""
    return f'<g data-part="1"{extra}>{content}</g>'


class Defs:
    """Collects <defs> entries with short unique ids."""

    def __init__(self, prefix):
        self.prefix = prefix
        self.items = []
        self.n = 0

    def uid(self):
        self.n += 1
        return f"{self.prefix}{self.n}"

    @staticmethod
    def _stops(stops):
        out = []
        for st in stops:
            o, c = st[0], st[1]
            a = st[2] if len(st) > 2 else None
            out.append(f'<stop offset="{o}" stop-color="{c}"' + (f' stop-opacity="{a}"' if a is not None else "") + "/>")
        return "".join(out)

    def lin(self, stops, x1=0, y1=0, x2=0, y2=1, user=False):
        gid = self.uid()
        u = ' gradientUnits="userSpaceOnUse"' if user else ""
        self.items.append(f'<linearGradient id="{gid}" x1="{f(x1)}" y1="{f(y1)}" x2="{f(x2)}" y2="{f(y2)}"{u}>{self._stops(stops)}</linearGradient>')
        return f"url(#{gid})"

    def rad(self, stops, cx=0.5, cy=0.5, r=0.5, user=False):
        gid = self.uid()
        u = ' gradientUnits="userSpaceOnUse"' if user else ""
        self.items.append(f'<radialGradient id="{gid}" cx="{f(cx)}" cy="{f(cy)}" r="{f(r)}"{u}>{self._stops(stops)}</radialGradient>')
        return f"url(#{gid})"

    def symbol(self, key, content):
        """Defines reusable content once per scene; returns its id."""
        if not hasattr(self, "symbols"):
            self.symbols = {}
        if key not in self.symbols:
            sid = self.uid()
            self.symbols[key] = sid
            self.items.append(f'<g id="{sid}">{content}</g>')
        return self.symbols[key]

    def clip(self, content):
        cid = self.uid()
        self.items.append(f'<clipPath id="{cid}">{content}</clipPath>')
        return f"url(#{cid})"

    def render(self):
        return "<defs>" + "".join(self.items) + "</defs>"


# ---------------------------------------------------------------- curves

def smooth(points, move=True):
    """Catmull-Rom spline through points, as cubic Bezier path data."""
    n = len(points)
    d = f"M{f(points[0][0])} {f(points[0][1])}" if move else f"L{f(points[0][0])} {f(points[0][1])}"
    for i in range(n - 1):
        p0 = points[i - 1] if i > 0 else points[i]
        p1, p2 = points[i], points[i + 1]
        p3 = points[i + 2] if i + 2 < n else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f" C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(p2[0])} {f(p2[1])}"
    return d


def hill(points, fill, bottom=H + 30, extra=""):
    d = smooth(points) + f" L{f(points[-1][0])} {bottom} L{f(points[0][0])} {bottom}Z"
    return f'<path d="{d}" fill="{fill}"{extra}/>'


def road(center, widths, fill, extra=""):
    """Ribbon along a centerline (e.g. a winding path)."""
    left, right = [], []
    n = len(center)
    for i, (x, y) in enumerate(center):
        a = center[max(i - 1, 0)]
        b = center[min(i + 1, n - 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        ln = math.hypot(dx, dy) or 1
        nx, ny = -dy / ln, dx / ln
        w = widths[i] / 2
        left.append((x + nx * w, y + ny * w))
        right.append((x - nx * w, y - ny * w))
    d = smooth(left) + " " + smooth(list(reversed(right)), move=False) + "Z"
    return f'<path d="{d}" fill="{fill}"{extra}/>'


# ---------------------------------------------------------------- small things

def sparkle(x, y, s, fill="#FFFFFF", opacity=1.0):
    k = 0.16
    return (f'<path d="M{f(x)} {f(y - s)} Q{f(x + s * k)} {f(y - s * k)} {f(x + s)} {f(y)} Q{f(x + s * k)} {f(y + s * k)} {f(x)} {f(y + s)} '
            f'Q{f(x - s * k)} {f(y + s * k)} {f(x - s)} {f(y)} Q{f(x - s * k)} {f(y - s * k)} {f(x)} {f(y - s)}Z" fill="{fill}" opacity="{f(opacity) if opacity < 1 else 1}"/>')


def cloud(x, y, s, fill="#FFFFFF", shade="#DDEBF7"):
    blobs = [(-0.95, 0.2, 0.5), (-0.4, -0.18, 0.7), (0.32, -0.34, 0.82), (0.95, 0.12, 0.56), (0.05, 0.22, 0.66)]
    base = "".join(f'<circle cx="{f(x + bx * s)}" cy="{f(y + by * s + s * .13)}" r="{f(br * s)}" fill="{shade}"/>' for bx, by, br in blobs)
    top = "".join(f'<circle cx="{f(x + bx * s)}" cy="{f(y + by * s)}" r="{f(br * s)}" fill="{fill}"/>' for bx, by, br in blobs)
    return P(base + top)


def flower_head(x, y, s, petal, center="#FFE066", rot=0):
    out = []
    for i in range(5):
        a = math.radians(i * 72 - 90 + rot)
        out.append(f'<circle cx="{f(x + math.cos(a) * s * .62)}" cy="{f(y + math.sin(a) * s * .62)}" r="{f(s * .5)}" fill="{petal}"/>')
    out.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(s * .4)}" fill="{center}"/>')
    return "".join(out)


def smiley(x, y, s, color):
    """Tiny closed-eye smile (for flowers and the sun)."""
    return (f'<path d="M{f(x - s * .42)} {f(y - s * .05)} q{f(s * .14)} {f(-s * .16)} {f(s * .28)} 0 M{f(x + s * .14)} {f(y - s * .05)} '
            f'q{f(s * .14)} {f(-s * .16)} {f(s * .28)} 0 M{f(x - s * .2)} {f(y + s * .2)} q{f(s * .2)} {f(s * .2)} {f(s * .4)} 0" '
            f'stroke="{color}" stroke-width="{f(max(s * .09, 1.6))}" fill="none" stroke-linecap="round"/>')


def tuft(x, y, s, color):
    return (f'<path d="M{f(x - s)} {f(y)} Q{f(x - s * .8)} {f(y - s * 1.1)} {f(x - s * .4)} {f(y - s * 1.6)} Q{f(x - s * .4)} {f(y - s * .8)} {f(x)} {f(y - s * .5)} '
            f'Q{f(x + s * .2)} {f(y - s * 1.3)} {f(x + s * .6)} {f(y - s * 1.9)} Q{f(x + s * .56)} {f(y - s * .9)} {f(x + s)} {f(y)}Z" fill="{color}"/>')


def butterfly(x, y, s, wing, wing2):
    return P(f'<g transform="translate({f(x)} {f(y)}) scale({f(s)})">'
             f'<ellipse cx="-11" cy="-8" rx="12" ry="10" fill="{wing}" transform="rotate(-25 -11 -8)"/>'
             f'<ellipse cx="11" cy="-8" rx="12" ry="10" fill="{wing}" transform="rotate(25 11 -8)"/>'
             f'<ellipse cx="-8" cy="8" rx="8" ry="7" fill="{wing2}"/><ellipse cx="8" cy="8" rx="8" ry="7" fill="{wing2}"/>'
             f'<rect x="-2.5" y="-14" width="5" height="28" rx="2.5" fill="#5A3A2A"/>'
             f'<path d="M-1 -14 q-5 -9 -9 -10 M1 -14 q5 -9 9 -10" stroke="#5A3A2A" stroke-width="2" fill="none" stroke-linecap="round"/></g>')


def mushroom(x, y, s, cap=None):
    cap = cap or C["mushroom"]
    return P(f'<g transform="translate({f(x)} {f(y)}) scale({f(s)})">'
             f'<path d="M-12 0 Q-14 -26 -9 -34 L9 -34 Q14 -26 12 0Z" fill="#FFF3DF"/>'
             f'<path d="M-38 -30 Q-36 -66 0 -68 Q36 -66 38 -30 Q20 -24 0 -24 Q-20 -24 -38 -30Z" fill="{cap}"/>'
             f'<circle cx="-16" cy="-48" r="6" fill="#fff"/><circle cx="10" cy="-56" r="5" fill="#fff"/><circle cx="22" cy="-38" r="4" fill="#fff"/></g>')


def heart(x, y, s, fill):
    return (f'<path d="M{f(x)} {f(y + s * .9)} C{f(x - s * 1.3)} {f(y)} {f(x - s * .9)} {f(y - s * .95)} {f(x)} {f(y - s * .35)} '
            f'C{f(x + s * .9)} {f(y - s * .95)} {f(x + s * 1.3)} {f(y)} {f(x)} {f(y + s * .9)}Z" fill="{fill}"/>')


def note(x, y, s, fill):
    return (f'<g transform="translate({f(x)} {f(y)}) scale({f(s)}) rotate(-12)"><ellipse cx="0" cy="0" rx="9" ry="7" fill="{fill}"/>'
            f'<rect x="6" y="-30" width="4" height="30" rx="2" fill="{fill}"/><path d="M8 -30 q12 4 12 16" stroke="{fill}" stroke-width="4" fill="none" stroke-linecap="round"/></g>')


def crescent(cx, cy, R, fill, shade):
    r, d = R * .88, R * .5
    x = (d * d + R * R - r * r) / (2 * d)
    y = math.sqrt(R * R - x * x)
    path = (f'M{f(cx + x)} {f(cy - y)} A{f(R)} {f(R)} 0 1 0 {f(cx + x)} {f(cy + y)} A{f(r)} {f(r)} 0 0 1 {f(cx + x)} {f(cy - y)}Z')
    return P(f'<path d="{path}" fill="{fill}"/>'
             f'<circle cx="{f(cx - R * .55)}" cy="{f(cy + R * .1)}" r="{f(R * .09)}" fill="{shade}"/>'
             f'<circle cx="{f(cx - R * .35)}" cy="{f(cy - R * .5)}" r="{f(R * .06)}" fill="{shade}"/>')


def glow(defs, x, y, r, color, a=0.8):
    g = defs.rad([(0, color, a), (0.45, color, a * .45), (1, color, 0)])
    return f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r)}" fill="{g}"/>'


def night_sky_dots(rng, n, y_max, x0=10, x1=W - 10, avoid=None):
    out = []
    for _ in range(n):
        x, y = rng.uniform(x0, x1), rng.uniform(8, y_max)
        r, a = rng.uniform(1.4, 3.4), rng.uniform(.55, 1)
        if avoid and avoid(x, y):
            continue
        out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r:.1f}" opacity="{a:.1f}"/>')
    return f'<g fill="#FFF8D8">{"".join(out)}</g>'


def use(sid, x, y, s=1.0, rot=0.0):
    r = f" rotate({rot:.0f})" if rot else ""
    return f'<use href="#{sid}" transform="translate({x:.0f} {y:.0f}){r} scale({s:.2f})"/>'


# ---------------------------------------------------------------- scenery objects

def round_tree(x, y, s, leaf=None, leaf_dark=None, light=None, trunk=None):
    leaf = leaf or C["leaf"]
    leaf_dark = leaf_dark or C["leaf_dark"]
    light = light or C["leaf_light"]
    trunk = trunk or C["trunk"]
    t = P(f'<path d="M{f(x - s * .13)} {f(y)} Q{f(x - s * .09)} {f(y - s * .6)} {f(x - s * .07)} {f(y - s * 1.15)} L{f(x + s * .07)} {f(y - s * 1.15)} '
          f'Q{f(x + s * .09)} {f(y - s * .6)} {f(x + s * .13)} {f(y)}Z" fill="{trunk}"/>')
    dark = [(-0.46, -1.22, .46), (0.46, -1.24, .46), (0, -1.04, .5)]
    top = [(-0.36, -1.46, .5), (0.37, -1.5, .5), (0, -1.84, .55), (0, -1.36, .55)]
    g1 = "".join(f'<circle cx="{f(x + bx * s)}" cy="{f(y + by * s)}" r="{f(br * s)}" fill="{leaf_dark}"/>' for bx, by, br in dark)
    g2 = "".join(f'<circle cx="{f(x + bx * s)}" cy="{f(y + by * s)}" r="{f(br * s)}" fill="{leaf}"/>' for bx, by, br in top)
    g3 = (f'<circle cx="{f(x - s * .2)}" cy="{f(y - s * 2)}" r="{f(s * .2)}" fill="{light}"/>'
          f'<circle cx="{f(x - s * .56)}" cy="{f(y - s * 1.58)}" r="{f(s * .14)}" fill="{light}"/>')
    return t + P(g1) + P(g2 + g3)


def pine(x, y, s, fill, fill2):
    tiers = []
    for i, (w, top, bot) in enumerate([(1.0, -1.1, -0.25), (0.82, -1.6, -0.8), (0.6, -2.05, -1.3)]):
        tiers.append(f'<path d="M{f(x - s * w * .5)} {f(y + bot * s)} Q{f(x)} {f(y + (bot + .12) * s)} {f(x + s * w * .5)} {f(y + bot * s)} '
                     f'L{f(x + s * .06)} {f(y + top * s)} Q{f(x)} {f(y + (top - .06) * s)} {f(x - s * .06)} {f(y + top * s)}Z" fill="{fill if i % 2 == 0 else fill2}"/>')
    trunk = f'<rect x="{f(x - s * .07)}" y="{f(y - s * .3)}" width="{f(s * .14)}" height="{f(s * .3)}" fill="{C["trunk_dark"]}"/>'
    return P(trunk + "".join(tiers))


def cottage(defs, x, y, s, warm=False):
    """Cottage; (x, y) = bottom center of the wall; s = wall width."""
    w, h = s, s * .62
    wall = defs.lin([(0, C["wall"]), (1, C["wall_shade"])])
    roof = defs.lin([(0, "#E8744E"), (1, C["roof_dark"])])
    win = C["window_warm"] if warm else C["window"]
    out = []
    out.append(P(f'<rect x="{f(x + w * .2)}" y="{f(y - h - s * .6)}" width="{f(s * .12)}" height="{f(s * .32)}" rx="{f(s * .02)}" fill="#C65A3A"/>'))
    out.append(P(f'<rect x="{f(x - w / 2)}" y="{f(y - h)}" width="{f(w)}" height="{f(h)}" rx="{f(s * .03)}" fill="{wall}"/>'))
    rp = (f'M{f(x - w * .64)} {f(y - h + s * .05)} Q{f(x - w * .3)} {f(y - h - s * .2)} {f(x - s * .04)} {f(y - h - s * .47)} Q{f(x)} {f(y - h - s * .5)} {f(x + s * .04)} {f(y - h - s * .47)} '
          f'Q{f(x + w * .3)} {f(y - h - s * .2)} {f(x + w * .64)} {f(y - h + s * .05)} Q{f(x + w * .66)} {f(y - h + s * .12)} {f(x + w * .57)} {f(y - h + s * .11)} '
          f'L{f(x - w * .57)} {f(y - h + s * .11)} Q{f(x - w * .66)} {f(y - h + s * .12)} {f(x - w * .64)} {f(y - h + s * .05)}Z')
    tiles = ""
    for i in range(1, 4):
        yy = y - h - s * .47 + i * s * .14
        half = (i * s * .14) / (s * .52) * w * .6
        tiles += f'<path d="M{f(x - half)} {f(yy)} L{f(x + half)} {f(yy)}" stroke="{C["roof_dark"]}" stroke-width="{f(s * .014)}" opacity=".5" stroke-linecap="round"/>'
    out.append(P(f'<path d="{rp}" fill="{roof}"/>{tiles}'))
    dw, dh = s * .21, s * .35
    out.append(P(f'<path d="M{f(x - dw / 2)} {f(y)} V{f(y - dh + dw / 2)} A{f(dw / 2)} {f(dw / 2)} 0 0 1 {f(x + dw / 2)} {f(y - dh + dw / 2)} V{f(y)}Z" fill="{C["door"]}"/>'
                 f'<circle cx="{f(x + dw * .27)}" cy="{f(y - dh * .42)}" r="{f(s * .016)}" fill="{C["yellow"]}"/>'))
    for sx in (-1, 1):
        wx, wy, ws = x + sx * w * .3, y - h * .6, s * .17
        out.append(P(f'<rect x="{f(wx - ws / 2)}" y="{f(wy - ws / 2)}" width="{f(ws)}" height="{f(ws)}" rx="{f(s * .025)}" fill="{win}" stroke="#FFFFFF" stroke-width="{f(s * .02)}"/>'
                     f'<path d="M{f(wx)} {f(wy - ws / 2)} V{f(wy + ws / 2)} M{f(wx - ws / 2)} {f(wy)} H{f(wx + ws / 2)}" stroke="#FFFFFF" stroke-width="{f(s * .015)}"/>'))
        box = f'<rect x="{f(wx - ws * .64)}" y="{f(wy + ws * .5)}" width="{f(ws * 1.28)}" height="{f(s * .05)}" rx="{f(s * .016)}" fill="{C["trunk"]}"/>'
        fl = "".join(flower_head(wx - ws * .4 + k * ws * .4, wy + ws * .5, s * .03, [C["pink"], C["yellow"], "#FFFFFF"][k]) for k in range(3))
        out.append(P(box + fl))
    if warm:
        out.insert(0, glow(defs, x, y - h * .5, s * .95, C["window_warm"], .5))
    return "".join(out)


def fence(x0, x1, y, h, color="#FFF6E8", shade="#E9D7BC"):
    posts = []
    n = int((x1 - x0) / (h * .5))
    for i in range(n + 1):
        px = x0 + i * (x1 - x0) / max(n, 1)
        posts.append(f'<path d="M{f(px - h * .12)} {f(y)} V{f(y - h * .85)} L{f(px)} {f(y - h)} L{f(px + h * .12)} {f(y - h * .85)} V{f(y)}Z" fill="{color}"/>')
    rail = (f'<rect x="{f(x0 - h * .1)}" y="{f(y - h * .7)}" width="{f(x1 - x0 + h * .2)}" height="{f(h * .12)}" rx="{f(h * .05)}" fill="{shade}"/>'
            f'<rect x="{f(x0 - h * .1)}" y="{f(y - h * .35)}" width="{f(x1 - x0 + h * .2)}" height="{f(h * .12)}" rx="{f(h * .05)}" fill="{shade}"/>')
    return P(rail + "".join(posts))


# ---------------------------------------------------------------- characters

def ear(side, inner_on=True):
    m = side
    outer = f'M{-84 * m} -284 C{-110 * m} -330 {-108 * m} -378 {-92 * m} -404 C{-62 * m} -386 {-36 * m} -354 {-26 * m} -322Z'
    inner = f'M{-76 * m} -294 C{-94 * m} -330 {-94 * m} -362 {-87 * m} -383 C{-66 * m} -368 {-48 * m} -346 {-40 * m} -326Z'
    tip = f'M{-92 * m} -404 C{-80 * m} -396 {-70 * m} -387 {-63 * m} -380 C{-75 * m} -376 {-88 * m} -376 {-99 * m} -378 C{-99 * m} -388 {-96 * m} -397 {-92 * m} -404Z'
    mid = f'<path d="{inner}" fill="{C["ear_in"]}"/>' if inner_on else ""
    return P(f'<path d="{outer}" fill="{C["fox"]}"/>{mid}<path d="{tip}" fill="{C["ear_tip"]}"/>')


def fox_face(face):
    e, n = C["eye"], C["nose"]
    out = []
    if face in ("happy", "determined", "surprised", "amazed", "look_up"):
        dy = -12 if face == "look_up" else 0
        ry = 21 if face in ("surprised", "amazed") else 19
        for ex in (-37, 37):
            out.append(f'<ellipse cx="{ex}" cy="{-238 + dy}" rx="15" ry="{ry}" fill="{e}"/>')
            out.append(f'<circle cx="{ex + 5}" cy="{-246 + dy}" r="6" fill="#FFFFFF"/>')
            out.append(f'<circle cx="{ex - 5}" cy="{-229 + dy}" r="2.8" fill="#FFFFFF"/>')
            if face == "amazed":
                out.append(sparkle(ex - 3, -240 + dy, 5, "#FFF6C2"))
    else:  # gentle (closed happy eyes)
        for ex in (-37, 37):
            out.append(f'<path d="M{ex - 14} -234 Q{ex} -252 {ex + 14} -234" stroke="{e}" stroke-width="6.5" fill="none" stroke-linecap="round"/>')
    if face == "determined":
        out.append(f'<path d="M-54 -272 Q-38 -278 -22 -270 M54 -272 Q38 -278 22 -270" stroke="{C["fox_shade"]}" stroke-width="7" fill="none" stroke-linecap="round"/>')
    if face in ("surprised", "amazed", "look_up"):
        out.append(f'<path d="M-52 -{280 + (10 if face == "look_up" else 0)} Q-37 -{290 + (10 if face == "look_up" else 0)} -22 -{282 + (10 if face == "look_up" else 0)} '
                   f'M52 -{280 + (10 if face == "look_up" else 0)} Q37 -{290 + (10 if face == "look_up" else 0)} 22 -{282 + (10 if face == "look_up" else 0)}" '
                   f'stroke="{C["fox_shade"]}" stroke-width="6" fill="none" stroke-linecap="round"/>')
    out.append(f'<path d="M-12 -213 Q0 -221 12 -213 Q8 -201 0 -198 Q-8 -201 -12 -213Z" fill="{n}"/>')
    out.append('<ellipse cx="-3" cy="-213" rx="4" ry="2.2" fill="#FFFFFF" opacity=".6"/>')
    if face in ("surprised", "amazed"):
        out.append(f'<ellipse cx="0" cy="-183" rx="10" ry="12" fill="{C["mouth"]}"/><ellipse cx="0" cy="-177" rx="6.5" ry="5" fill="{C["tongue"]}"/>')
    elif face in ("look_up", "happy"):
        out.append(f'<path d="M-17 -192 Q0 -170 17 -192 Q0 -186 -17 -192Z" fill="{C["mouth"]}" stroke="{n}" stroke-width="3.5" stroke-linejoin="round"/>'
                   f'<path d="M-8 -181 Q0 -175 8 -181 Q0 -179 -8 -181Z" fill="{C["tongue"]}"/>')
    else:
        out.append(f'<path d="M-17 -192 Q-8 -182 0 -190 Q8 -182 17 -192" stroke="{n}" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
    out.append(f'<ellipse cx="-64" cy="-207" rx="16" ry="9.5" fill="{C["blush"]}" opacity=".55"/>')
    out.append(f'<ellipse cx="64" cy="-207" rx="16" ry="9.5" fill="{C["blush"]}" opacity=".55"/>')
    return "".join(out)


ARMS = {
    # (shoulder x, shoulder y, rotation, length, drawn in front of the head)
    "down": [(-58, -118, 20, 62, False), (58, -118, -20, 62, False)],
    "out": [(-62, -128, 70, 62, False), (62, -128, -70, 62, False)],
    "up": [(-66, -146, 128, 82, True), (66, -146, -128, 82, True)],
    "wave": [(-58, -118, 20, 62, False), (66, -146, -148, 88, True)],
    "point": [(-58, -118, 20, 62, False), (66, -142, -160, 94, True)],
    "hug": [(-56, -134, -14, 64, True), (56, -134, 14, 64, True)],
    "swing": [(-58, -118, -16, 62, False), (58, -118, -30, 62, False)],
}


def arm(ax, ay, rot, ln):
    return P(f'<g transform="rotate({rot} {ax} {ay})"><rect x="{ax - 15}" y="{ay - 6}" width="30" height="{ln}" rx="15" fill="{C["fox"]}"/>'
             f'<ellipse cx="{ax}" cy="{ay + ln - 12}" rx="14.5" ry="12.5" fill="{C["paw"]}"/></g>')


def fox(defs, x, y, s=1.0, face="happy", arms="down", flip=False, walk=0.0, tilt=0.0, wave=0.0, held=""):
    """Tori, front three-quarter view. (x, y) = ground point between the feet; s=1 is ~400 units tall."""
    head = defs.rad([(0, C["fox_light"]), (.68, C["fox"]), (1, C["fox_shade"])], .4, .32, .78)
    body = defs.rad([(0, C["fox_light"]), (.62, C["fox"]), (1, C["fox_shade"])], .35, .28, .82)
    tail = defs.lin([(0, C["fox_shade"]), (.55, C["fox"]), (1, C["fox_light"])], 0, 1, 1, 0)
    scarf = defs.lin([(0, C["scarf_light"]), (1, C["scarf"])])
    o = []
    tp = 'M14 -70 C70 -58 150 -84 164 -166 C172 -226 132 -262 106 -246 C94 -236 110 -216 113 -194 C118 -140 74 -110 18 -114Z'
    cl = defs.clip(f'<path d="{tp}"/>')
    o.append(P(f'<path d="{tp}" fill="{tail}"/><g clip-path="{cl}"><ellipse cx="142" cy="-238" rx="54" ry="46" fill="{C["cream"]}"/></g>'))
    lf = 11 * walk
    lift = abs(walk) * 8
    o.append(P(f'<rect x="{f(-42 + lf)}" y="-58" width="34" height="56" rx="17" fill="{C["fox_shade"]}"/><ellipse cx="{f(-25 + lf)}" cy="-7" rx="23" ry="12.5" fill="{C["paw"]}"/>'))
    o.append(P(f'<rect x="{f(8 - lf)}" y="{f(-58 - lift)}" width="34" height="56" rx="17" fill="{C["fox"]}"/><ellipse cx="{f(25 - lf)}" cy="{f(-7 - lift)}" rx="23" ry="12.5" fill="{C["paw"]}"/>'))
    o.append(P(f'<path d="M-60 -122 C-68 -70 -48 -38 0 -36 C48 -38 68 -70 60 -122 C54 -162 28 -178 0 -178 C-28 -178 -54 -162 -60 -122Z" fill="{body}"/>'))
    o.append(P(f'<ellipse cx="0" cy="-92" rx="35" ry="45" fill="{C["cream"]}"/>'))
    o.extend(arm(ax, ay, rot, ln) for ax, ay, rot, ln, front in ARMS[arms] if not front)
    wv = wave
    tail_d = (f'M20 -168 C32 -142 {f(38 + 12 * wv)} -120 {f(34 + 24 * wv)} -96 Q{f(46 + 26 * wv)} -90 {f(62 + 26 * wv)} -100 '
              f'C{f(62 + 14 * wv)} -124 54 -150 46 -170Z')
    fringe = "".join(f'<path d="M{f(36 + 24 * wv + i * 9)} {f(-97 + i * 1.5)} l{f(2 + 4 * wv)} 13" stroke="{C["scarf_shade"]}" stroke-width="5" stroke-linecap="round"/>' for i in range(3))
    o.append(P(f'<path d="{tail_d}" fill="{C["scarf_shade"]}"/>{fringe}'))
    o.append(P(f'<path d="M-64 -176 C-40 -150 40 -150 64 -176 C68 -158 62 -142 52 -137 C20 -124 -20 -124 -52 -137 C-62 -142 -68 -158 -64 -176Z" fill="{scarf}"/>'
               f'<path d="M-46 -150 C-16 -138 16 -138 46 -150" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity=".3" fill="none"/>'))
    o.append(held)
    o.append(ear(-1) + ear(1))
    hp = ('M0 -334 C60 -334 100 -298 102 -248 C104 -214 94 -196 86 -186 C72 -170 42 -160 0 -160 '
          'C-42 -160 -72 -170 -86 -186 C-94 -196 -104 -214 -102 -248 C-100 -298 -60 -334 0 -334Z')
    fluff = (f'<path d="M-97 -216 C-115 -207 -121 -189 -105 -182 C-97 -180 -90 -185 -86 -190Z" fill="{C["fox"]}"/>'
             f'<path d="M97 -216 C115 -207 121 -189 105 -182 C97 -180 90 -185 86 -190Z" fill="{C["fox"]}"/>')
    o.append(P(f'<path d="{hp}" fill="{head}"/>{fluff}'))
    o.append(P(f'<path d="M-94 -214 C-80 -178 -42 -160 0 -160 C42 -160 80 -178 94 -214 C70 -229 40 -223 21 -239 '
               f'C12 -247 -12 -247 -21 -239 C-40 -223 -70 -229 -94 -214Z" fill="{C["cream"]}"/>'))
    o.append(f'<g>{fox_face(face)}</g>')
    o.extend(arm(ax, ay, rot, ln) for ax, ay, rot, ln, front in ARMS[arms] if front)
    sx = -s if flip else s
    return f'<g transform="translate({f(x)} {f(y)}) rotate({f(tilt)}) scale({f(sx)} {f(s)})">{"".join(o)}</g>'


def fox_back_sitting(defs, x, y, s=1.0):
    """Tori sitting, seen from behind (looking at the sky)."""
    head = defs.rad([(0, C["fox_light"]), (.7, C["fox"]), (1, C["fox_shade"])], .5, .3, .8)
    body = defs.rad([(0, C["fox_light"]), (.7, C["fox"]), (1, C["fox_shade"])], .5, .2, .9)
    o = []
    o.append(P(f'<path d="M24 -24 C96 -16 168 -48 166 -118 C164 -160 128 -170 116 -152 C108 -140 122 -124 116 -100 C104 -66 70 -58 26 -60Z" fill="{C["fox"]}"/>'
               f'<path d="M150 -164 C132 -172 114 -160 116 -144 C128 -132 156 -132 164 -142 C164 -152 158 -160 150 -164Z" fill="{C["cream"]}"/>'))
    o.append(P(f'<path d="M-74 -34 C-86 -96 -54 -164 0 -164 C54 -164 86 -96 74 -34 C62 -10 -62 -10 -74 -34Z" fill="{body}"/>'))
    ny = -162
    o.append(P(f'<path d="M-32 {ny + 24} C-36 {ny + 50} -42 {ny + 72} -48 {ny + 88} Q-34 {ny + 96} -22 {ny + 92} C-18 {ny + 70} -14 {ny + 50} -12 {ny + 30}Z" fill="{C["scarf_shade"]}"/>'))
    o.append(P(f'<path d="M-66 {ny - 6} C-42 {ny + 18} 42 {ny + 18} 66 {ny - 6} C70 {ny + 10} 64 {ny + 26} 54 {ny + 30} C20 {ny + 42} -20 {ny + 42} -54 {ny + 30} '
               f'C-64 {ny + 26} -70 {ny + 10} -66 {ny - 6}Z" fill="{C["scarf"]}"/>'))
    hy = -238
    o.append(f'<g transform="translate(0 {hy + 250})">{ear(-1, False)}{ear(1, False)}</g>')
    fl = (f'<path d="M-90 {hy + 22} C-112 {hy + 30} -120 {hy + 50} -104 {hy + 58} C-96 {hy + 60} -86 {hy + 52} -80 {hy + 44}Z" fill="{C["fox"]}"/>'
          f'<path d="M90 {hy + 22} C112 {hy + 30} 120 {hy + 50} 104 {hy + 58} C96 {hy + 60} 86 {hy + 52} 80 {hy + 44}Z" fill="{C["fox"]}"/>')
    o.append(P(f'<ellipse cx="0" cy="{hy}" rx="98" ry="86" fill="{head}"/>{fl}'))
    return f'<g transform="translate({f(x)} {f(y)}) scale({f(s)})">{"".join(o)}</g>'


def bird(defs, x, y, s=1.0, flip=False, flying=False, face="happy", sit=False):
    """Small blue bird facing right; (x, y) = body center; s=1 is ~110 units wide."""
    body = defs.rad([(0, C["bird_light"]), (.72, C["bird"]), (1, C["bird_shade"])], .4, .32, .78)
    o = []
    o.append(P(f'<path d="M-38 2 L-72 -12 Q-70 2 -64 6 Q-74 16 -72 22 L-36 16Z" fill="{C["bird_shade"]}"/>'))
    if flying:
        o.append(P(f'<path d="M-6 -12 C-28 -70 -72 -82 -88 -64 C-68 -54 -52 -36 -40 -12Z" fill="{C["bird_shade"]}"/>'))
    if not flying and not sit:
        o.append(f'<path d="M-8 34 v13 M10 34 v13 M-15 47 h13 M3 47 h13" stroke="{C["beak"]}" stroke-width="4.5" stroke-linecap="round"/>')
    o.append(P(f'<ellipse cx="0" cy="0" rx="47" ry="41" fill="{body}"/><path d="M-4 -38 Q0 -58 13 -52 Q6 -46 9 -38Z" fill="{C["bird"]}"/>'))
    o.append(P(f'<ellipse cx="12" cy="15" rx="29" ry="22" fill="{C["bird_belly"]}"/>'))
    if flying:
        o.append(P(f'<path d="M-2 -10 C8 -72 54 -90 72 -74 C56 -62 42 -40 26 -10Z" fill="{C["bird_light"]}"/>'))
    else:
        o.append(P(f'<ellipse cx="-12" cy="6" rx="25" ry="16" fill="{C["bird_shade"]}" transform="rotate(-18 -12 6)"/>'))
    o.append(P(f'<path d="M42 -7 Q52 -4 61 0 Q52 5 42 8Z" fill="{C["beak"]}" stroke="{C["beak"]}" stroke-width="3" stroke-linejoin="round"/>'))
    if face == "gentle":
        o.append(f'<path d="M13 -12 Q22 -21 31 -12" stroke="{C["eye"]}" stroke-width="4.5" fill="none" stroke-linecap="round"/>')
    else:
        o.append(f'<circle cx="22" cy="-10" r="8" fill="{C["eye"]}"/><circle cx="25.5" cy="-13.5" r="3" fill="#FFFFFF"/>')
    o.append(f'<ellipse cx="31" cy="9" rx="8.5" ry="5" fill="{C["blush"]}" opacity=".6"/>')
    sx = -s if flip else s
    return f'<g transform="translate({f(x)} {f(y)}) scale({f(sx)} {f(s)})">{"".join(o)}</g>'


def star_char(defs, x, y, s=1.0, glow_on=True, face="happy", rot=-8):
    """The fallen star with a face. (x, y) = center; s=1 is ~140 units across."""
    o = []
    if glow_on:
        o.append(glow(defs, 0, 0, 200, "#FFF3B0", .85))
    R, r = 64, 31
    pts = []
    for i in range(10):
        a = math.radians(-90 + i * 36)
        rr = R if i % 2 == 0 else r
        pts.append((math.cos(a) * rr, math.sin(a) * rr))
    poly = " ".join(f"{f(px)},{f(py)}" for px, py in pts)
    sg = defs.rad([(0, C["star_light"]), (.6, C["star"]), (1, C["star_shade"])], .45, .38, .72)
    o.append(P(f'<g transform="rotate({rot})"><polygon points="{poly}" fill="{sg}" stroke="{C["star"]}" stroke-width="20" stroke-linejoin="round"/>'
               f'<polygon points="{poly}" fill="{sg}"/></g>'))
    if face == "happy":
        o.append(f'<path d="M-21 -5 Q-14 -14 -7 -5 M7 -5 Q14 -14 21 -5" stroke="{C["nose"]}" stroke-width="4.5" fill="none" stroke-linecap="round"/>')
    else:
        o.append(f'<circle cx="-13" cy="-6" r="5.5" fill="{C["nose"]}"/><circle cx="13" cy="-6" r="5.5" fill="{C["nose"]}"/>'
                 '<circle cx="-11" cy="-8" r="2" fill="#fff"/><circle cx="15" cy="-8" r="2" fill="#fff"/>')
    o.append(f'<path d="M-9 8 Q0 17 9 8" stroke="{C["nose"]}" stroke-width="4.5" fill="none" stroke-linecap="round"/>')
    o.append(f'<ellipse cx="-25" cy="9" rx="7.5" ry="4.5" fill="{C["blush"]}" opacity=".65"/><ellipse cx="25" cy="9" rx="7.5" ry="4.5" fill="{C["blush"]}" opacity=".65"/>')
    return f'<g transform="translate({f(x)} {f(y)}) scale({f(s)})">{"".join(o)}</g>'


def svg_doc(defs, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
            f'{defs.render()}{body}</svg>')
