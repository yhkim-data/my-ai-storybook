"""Cover + 8 scenes of the sample story (Tori and the Fallen Star)."""
import math
import random

from lib import (C, Defs, P, bird, butterfly, cloud, cottage, crescent, fence, flower_head, fox, fox_back_sitting, glow, heart,
                 hill, mushroom, night_sky_dots, note, pine, road, round_tree, smiley, smooth, sparkle, star_char, svg_doc, tuft, use, f)


def scatter_flowers(d, rng, n, x0, x1, y0, y1, s0, s1, colors, avoid=None):
    out = []
    for _ in range(n):
        x, y = rng.uniform(x0, x1), rng.uniform(y0, y1)
        s = rng.uniform(s0, s1) * (0.7 + 0.6 * (y - y0) / max(y1 - y0, 1))
        color, rot = rng.choice(colors), rng.uniform(0, 72)
        if avoid and avoid(x, y):
            continue
        sid = d.symbol(("flower", color), flower_head(0, 0, 10, color))
        out.append(use(sid, x, y, s / 10, rot))
    return P("".join(out))


def scatter_tufts(d, rng, n, x0, x1, y0, y1, s0, s1, color, avoid=None):
    out = []
    sid = d.symbol(("tuft", color), tuft(0, 0, 10, color))
    for _ in range(n):
        x, y = rng.uniform(x0, x1), rng.uniform(y0, y1)
        s = rng.uniform(s0, s1) * (0.7 + 0.6 * (y - y0) / max(y1 - y0, 1))
        if avoid and avoid(x, y):
            continue
        out.append(use(sid, x, y, s / 10))
    return P("".join(out))


def nodding_flower(x, y, s, petal, rot):
    """Big friendly flower with a face, leaning by rot degrees."""
    head = flower_head(0, 0, s, petal, center="#FFE27A") + smiley(0, 2, s * .7, "#7A4A2A") + \
        f'<ellipse cx="{f(-s * .3)}" cy="{f(s * .22)}" rx="{f(s * .1)}" ry="{f(s * .06)}" fill="#FF8A8A" opacity=".7"/>' + \
        f'<ellipse cx="{f(s * .3)}" cy="{f(s * .22)}" rx="{f(s * .1)}" ry="{f(s * .06)}" fill="#FF8A8A" opacity=".7"/>'
    st = (f'<path d="M0 {f(s * .6)} Q{f(-s * .25)} {f(s * 2.2)} {f(s * .1)} {f(s * 3.6)}" stroke="{C["leaf_dark"]}" stroke-width="{f(s * .2)}" fill="none" stroke-linecap="round"/>'
          f'<path d="M{f(-s * .1)} {f(s * 2.4)} q{f(-s * .9)} {f(-s * .5)} {f(-s * 1.1)} {f(-s * .05)} q{f(s * .5)} {f(s * .45)} {f(s * 1.1)} {f(s * .05)}Z" fill="{C["leaf"]}"/>'
          f'<path d="M{f(s * .02)} {f(s * 2.9)} q{f(s * .9)} {f(-s * .5)} {f(s * 1.1)} {f(-s * .05)} q{f(-s * .5)} {f(s * .45)} {f(-s * 1.1)} {f(s * .05)}Z" fill="{C["leaf_dark"]}"/>')
    return (f'<g transform="translate({f(x)} {f(y - s * 3.6)})">{P(st)}'
            f'<g transform="rotate({f(rot)} 0 {f(s * 3.6)})">{P(head)}</g></g>')


def scene_cover():
    d = Defs("c")
    rng = random.Random(10)
    sky = d.lin([(0, "#1E2A66"), (.42, "#3D3F92"), (.72, "#7458AE"), (1, "#E6A0BE")])
    b = [f'<rect width="1024" height="1024" fill="{sky}"/>']
    b.append(night_sky_dots(rng, 120, 700))
    b.append(P("".join(sparkle(rng.uniform(60, 980), rng.uniform(330, 640), rng.uniform(9, 15), "#FFF4B8") for _ in range(7))))
    b.append(P(sparkle(120, 90, 13, "#FFF4B8") + sparkle(900, 70, 11, "#FFF4B8") + sparkle(70, 300, 10, "#FFF4B8") + sparkle(960, 300, 12, "#FFF4B8")))
    b.append(glow(d, 852, 392, 150, "#FFF6CF", .5))
    b.append(crescent(852, 392, 58, "#FFF1B0", "#F2D98A"))
    b.append(P(hill([(-40, 760), (150, 700), (360, 742), (560, 690), (780, 736), (1064, 680)], "#5B4B95")))
    b.append(cottage(d, 150, 742, 104, warm=True))
    b.append(P(hill([(-40, 830), (200, 790), (420, 812), (700, 780), (1064, 806)], "#4C5D9C")))
    land = d.lin([(0, "#3F7C6A"), (1, "#2C5A52")])
    b.append(P(hill([(-40, 900), (240, 866), (512, 850), (790, 864), (1064, 892)], land)))
    b.append(glow(d, 512, 842, 300, "#FFF0A0", .55))
    b.append(scatter_tufts(d, rng, 26, 0, 1024, 890, 1010, 12, 20, "#26504A"))
    b.append(scatter_flowers(d, rng, 22, 20, 1004, 880, 1010, 6, 10, ["#FFFFFF", "#FFE9A8", "#D7C6FF"], avoid=lambda x, y: 380 < x < 660))
    b.append(fox(d, 512, 968, 1.05, face="gentle", arms="hug", wave=.3, held=star_char(d, 0, -104, .78, glow_on=False, face="happy", rot=-6)))
    b.append(bird(d, 526, 598, .72, sit=True, face="happy"))
    b.append("".join(glow(d, x, y, r, "#FFF3A0", .9) for x, y, r in [(220, 700, 14), (300, 610, 10), (760, 640, 12), (840, 560, 9), (660, 520, 8), (380, 520, 8)]))
    return svg_doc(d, "".join(b))


def scene_1():
    """Morning in front of the small house; Tori looks up and decides to find the star."""
    d = Defs("a")
    rng = random.Random(1)
    sky = d.lin([(0, "#94D3F7"), (.55, "#C9EAFA"), (1, "#FFF0CF")])
    b = [f'<rect width="1024" height="1024" fill="{sky}"/>']
    b.append(glow(d, 214, 286, 270, "#FFF2BC", .95))
    rays = "".join(f'<path d="M214 286 L{f(214 + 210 * math.cos(a))} {f(286 + 210 * math.sin(a))}" stroke="#FFE896" stroke-width="16" stroke-linecap="round" opacity=".45"/>'
                   for a in [i * 0.5236 for i in range(12)])
    b.append(rays)
    b.append(P('<circle cx="214" cy="286" r="88" fill="#FFDD6E"/><circle cx="214" cy="286" r="70" fill="#FFE68E"/>'))
    b.append(cloud(560, 170, 64) + cloud(870, 250, 50) + cloud(90, 128, 36))
    b.append(P(sparkle(640, 330, 13, "#FFFFFF") + sparkle(690, 290, 7, "#FFFFFF")))
    b.append(P(hill([(-40, 560), (170, 500), (390, 540), (610, 478), (830, 520), (1064, 470)], "#BEE5B0")))
    b.append(round_tree(940, 600, 96, leaf="#7CC776", leaf_dark="#5DAF63"))
    b.append(P(hill([(-40, 640), (220, 590), (520, 626), (780, 584), (1064, 606)], "#9DD58A")))
    b.append(round_tree(470, 640, 70, leaf="#86CF7B", leaf_dark="#68B96B"))
    b.append(cottage(d, 735, 700, 300))
    ground = d.lin([(0, "#94D47F"), (1, "#73C06B")])
    b.append(P(hill([(-40, 700), (300, 684), (640, 702), (1064, 690)], ground)))
    b.append(P(road([(735, 698), (700, 770), (610, 850), (500, 950), (470, 1044)], [70, 96, 130, 170, 200], C["path"])))
    b.append(fence(40, 300, 760, 58))
    b.append(scatter_tufts(d, rng, 24, 0, 1024, 720, 1010, 10, 18, "#5BAE5E", avoid=lambda x, y: 420 < x < 760 and y > 760))
    b.append(scatter_flowers(d, rng, 34, 0, 1024, 730, 1010, 8, 13, [C["pink"], C["yellow"], "#FFFFFF", C["violet"]],
                             avoid=lambda x, y: (440 < x < 740 and y > 740) or (250 < x < 520 and y > 820)))
    b.append(fox(d, 360, 916, .95, face="look_up", arms="point", wave=.4))
    b.append(butterfly(860, 820, 1.1, "#FFB3CB", "#FF8FB1"))
    return svg_doc(d, "".join(b))


def scene_2():
    """Walking the meadow path; flowers nod hello."""
    d = Defs("b")
    rng = random.Random(2)
    sky = d.lin([(0, "#86CDF6"), (1, "#DDF3FE")])
    b = [f'<rect width="1024" height="1024" fill="{sky}"/>']
    b.append(cloud(200, 150, 70) + cloud(700, 110, 56) + cloud(930, 230, 44))
    b.append(P(hill([(-40, 520), (220, 470), (480, 505), (720, 460), (1064, 500)], "#C3E8B2")))
    b.append(pine(120, 520, 70, "#8DCB86", "#7BBE77") + pine(180, 512, 54, "#8DCB86", "#7BBE77") + pine(860, 492, 64, "#8DCB86", "#7BBE77"))
    b.append(P(hill([(-40, 600), (260, 556), (560, 590), (840, 548), (1064, 570)], "#A5D990")))
    ground = d.lin([(0, "#9AD786"), (1, "#74C06A")])
    b.append(P(hill([(-40, 660), (300, 640), (700, 652), (1064, 636)], ground)))
    b.append(P(road([(560, 1044), (520, 920), (590, 800), (530, 708), (566, 648)], [280, 220, 150, 90, 40], C["path"])))
    b.append(scatter_tufts(d, rng, 30, 0, 1024, 680, 1010, 10, 18, "#5BAE5E", avoid=lambda x, y: 380 < x < 720))
    b.append(scatter_flowers(d, rng, 60, 0, 1024, 670, 1010, 7, 13, [C["pink"], C["yellow"], "#FFFFFF", C["violet"], "#FFB38A"],
                             avoid=lambda x, y: 390 < x < 720 and y > 690))
    b.append(nodding_flower(214, 930, 40, C["pink"], 16) + nodding_flower(110, 820, 30, C["yellow"], 12))
    b.append(nodding_flower(838, 950, 42, "#FFFFFF", -16) + nodding_flower(930, 830, 30, C["violet"], -12))
    b.append(fox(d, 540, 900, .86, face="happy", arms="swing", walk=1, wave=.9))
    b.append(butterfly(330, 640, 1.0, "#FFE38A", "#FFD34A") + butterfly(760, 600, .85, "#C9B3FF", "#B69CF0"))
    return svg_doc(d, "".join(b))


def scene_3():
    """Forest of tall trees with sunlight falling in patches."""
    d = Defs("f")
    rng = random.Random(3)
    sky = d.lin([(0, "#F1F8C8"), (.5, "#BFE3A2"), (1, "#8FCB82")])
    b = [f'<rect width="1024" height="1024" fill="{sky}"/>']
    far = []
    for x in [60, 190, 330, 470, 610, 760, 900, 1000]:
        far.append(f'<rect x="{x - 15}" y="0" width="30" height="700" rx="12" fill="#B6D49F"/>')
    b.append(P("".join(far)))
    b.append(P("".join(f'<circle cx="{x}" cy="{rng.randint(30, 160)}" r="{rng.randint(80, 120)}" fill="#A9D490"/>' for x in range(-40, 1100, 110))))
    mid = []
    for x, w in [(120, 46), (300, 40), (700, 42), (880, 50)]:
        mid.append(f'<path d="M{x - w / 2} 760 Q{x - w * .4} 400 {x - w * .3} 0 L{x + w * .3} 0 Q{x + w * .4} 400 {x + w / 2} 760Z" fill="#A58262"/>'
                   f'<path d="M{x - 4} 680 q-6 -60 2 -120 M{x + 8} 420 q6 -50 -2 -110" stroke="#8C6A4E" stroke-width="5" fill="none" stroke-linecap="round"/>')
    b.append(P("".join(mid)))
    b.append(P("".join(f'<circle cx="{x}" cy="{rng.randint(-10, 90)}" r="{rng.randint(90, 130)}" fill="#7CC576"/>' for x in range(-60, 1120, 140))))
    beams = d.lin([(0, "#FFFBE0", .75), (1, "#FFFBE0", 0)], 0, 0, .3, 1)
    b.append("".join(f'<path d="M{x0} -20 L{x0 + w} -20 L{x0 + w + 260} 900 L{x0 + 200} 900Z" fill="{beams}" opacity=".55"/>'
                     for x0, w in [(180, 70), (420, 50), (600, 90)]))
    ground = d.lin([(0, "#8BCB78"), (1, "#5EAE60")])
    b.append(P(hill([(-40, 700), (260, 686), (620, 700), (1064, 684)], ground)))
    b.append(P(road([(520, 1044), (560, 920), (480, 800), (530, 720), (512, 690)], [300, 220, 150, 80, 34], C["path"])))
    b.append("".join(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{rx * .32:.0f}" fill="#FFF6C8" opacity=".8"/>' for x, y, rx in [(540, 770, 40), (470, 860, 56), (600, 950, 70), (520, 720, 22)]))
    near = []
    for x, w, c in [(30, 120, "#7E5638"), (990, 140, "#7E5638")]:
        near.append(f'<path d="M{x - w / 2} 1044 Q{x - w * .45} 500 {x - w * .3} -20 L{x + w * .3} -20 Q{x + w * .45} 500 {x + w / 2} 1044Z" fill="{c}"/>'
                    f'<path d="M{x - w * .1} 980 q-10 -90 4 -180 M{x + w * .15} 620 q10 -80 -4 -160 M{x - w * .12} 300 q-8 -60 4 -120" stroke="#5F3F28" stroke-width="7" fill="none" stroke-linecap="round"/>')
    b.append(P("".join(near)))
    b.append(P("".join(f'<circle cx="{x}" cy="{rng.randint(-40, 40)}" r="{rng.randint(90, 120)}" fill="#4E9E57"/>' for x in [-30, 90, 960, 1080])))
    b.append(scatter_tufts(d, rng, 30, 0, 1024, 720, 1010, 12, 22, "#4F9F55", avoid=lambda x, y: 360 < x < 700))
    b.append(mushroom(250, 900, 1.2) + mushroom(310, 930, .8, "#FFA94D") + mushroom(820, 980, 1.0))
    b.append(scatter_flowers(d, rng, 20, 0, 1024, 740, 1010, 6, 10, ["#FFFFFF", C["yellow"], C["pink"]], avoid=lambda x, y: 360 < x < 700))
    b.append(fox(d, 520, 905, .82, face="happy", arms="swing", walk=-1, wave=.5))
    b.append(butterfly(700, 560, .9, "#FFFFFF", "#FFF2B0"))
    return svg_doc(d, "".join(b))


def scene_4():
    """Crossing the wooden bridge over a wide river."""
    d = Defs("r")
    rng = random.Random(4)
    sky = d.lin([(0, "#8ED1F7"), (1, "#E2F5FF")])
    b = [f'<rect width="1024" height="1024" fill="{sky}"/>']
    b.append(cloud(180, 130, 58) + cloud(820, 170, 66))
    b.append(P(hill([(-40, 430), (260, 380), (520, 418), (800, 372), (1064, 410)], "#BFE5AE")))
    b.append("".join(round_tree(x, 470, s, leaf="#7FC777", leaf_dark="#62B067") for x, s in [(90, 64), (210, 52), (760, 60), (900, 70), (980, 50)]))
    b.append(P(hill([(-40, 486), (300, 470), (700, 482), (1064, 468)], "#97D283")))
    water = d.lin([(0, C["water_light"]), (.35, C["water"]), (1, C["water_deep"])])
    top = [(-40, 506), (260, 500), (520, 512), (800, 498), (1064, 508)]
    bot = [(1064, 800), (780, 790), (500, 806), (240, 792), (-40, 806)]
    b.append(P(f'<path d="{smooth(top)} {smooth(bot, move=False)}Z" fill="{water}"/>'))
    ripples = "".join(f'<path d="M{f(x)} {f(y)} q{f(w / 2)} -8 {f(w)} 0" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>'
                      for x, y, w in [(80, 560, 70), (300, 700, 90), (640, 560, 60), (820, 690, 80), (150, 760, 60), (560, 760, 70), (420, 620, 50), (900, 600, 50)])
    b.append(ripples)
    b.append(P("".join(sparkle(x, y, s, "#FFFFFF") for x, y, s in [(240, 600, 10), (700, 640, 12), (880, 740, 9), (60, 680, 8)])))
    b.append(P('<ellipse cx="130" cy="720" rx="54" ry="18" fill="#5DB665"/><ellipse cx="210" cy="756" rx="40" ry="13" fill="#4FA35A"/>' + flower_head(140, 712, 12, C["pink"])))
    fish = ('<g transform="translate(830 640) rotate(-28)"><path d="M-40 0 Q-10 -26 26 -6 Q34 0 26 6 Q-10 26 -40 0Z" fill="#FF9F68"/>'
            '<path d="M-40 0 L-62 -16 L-58 0 L-62 16Z" fill="#FF8550"/><circle cx="14" cy="-4" r="4.5" fill="#2B1E1A"/><circle cx="15.5" cy="-5.5" r="1.6" fill="#fff"/></g>')
    b.append(P(fish))
    b.append("".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#FFFFFF" opacity=".85"/>' for x, y, r in [(790, 690, 6), (772, 676, 4), (870, 676, 5)]))
    ground = d.lin([(0, "#8FD27D"), (1, "#6EBE69")])
    b.append(P(hill([(-40, 830), (260, 806), (560, 826), (820, 800), (1064, 820)], ground)))
    reeds = "".join(f'<path d="M{x} 860 q{rng.randint(-14, 14)} -70 {rng.randint(-10, 10)} -{rng.randint(90, 140)}" stroke="#5BAE5E" stroke-width="7" fill="none" stroke-linecap="round"/>'
                    for x in list(range(20, 170, 22)) + list(range(860, 1010, 24)))
    tails = "".join(f'<rect x="{x - 6}" y="{y}" width="12" height="34" rx="6" fill="#9C6B46"/>' for x, y in [(42, 726), (110, 738), (900, 730), (970, 722)])
    b.append(P(reeds + tails))
    x0, x1, base, peak = 90, 934, 740, 586

    def deck_y(x):
        t = (x - x0) / (x1 - x0)
        return base - (base - peak) * math.sin(math.pi * t)
    planks = []
    n = 26
    for i in range(n):
        xa = x0 + (x1 - x0) * i / n
        xb = x0 + (x1 - x0) * (i + 1) / n
        ya, yb = deck_y(xa), deck_y(xb)
        col = C["wood"] if i % 2 == 0 else C["wood_light"]
        planks.append(f'<path d="M{f(xa)} {f(ya)} L{f(xb)} {f(yb)} L{f(xb)} {f(yb + 26)} L{f(xa)} {f(ya + 26)}Z" fill="{col}" stroke="{C["wood_dark"]}" stroke-width="2.5" stroke-linejoin="round"/>')
    support = "".join(f'<rect x="{f(x - 9)}" y="{f(deck_y(x) + 18)}" width="18" height="{f(800 - deck_y(x))}" rx="6" fill="{C["wood_dark"]}"/>' for x in [200, 360, 664, 824])
    b.append(P(support))
    b.append(P("".join(planks)))
    posts = [x0 + 30 + i * (x1 - x0 - 60) / 6 for i in range(7)]
    back_posts = "".join(f'<rect x="{f(x - 7)}" y="{f(deck_y(x) - 84)}" width="14" height="88" rx="6" fill="{C["wood_dark"]}"/>' for x in posts)
    rope_pts = [(x, deck_y(x) - 78) for x in posts]
    rope = ""
    for (xa, ya), (xb, yb) in zip(rope_pts, rope_pts[1:]):
        rope += f'<path d="M{f(xa)} {f(ya)} Q{f((xa + xb) / 2)} {f((ya + yb) / 2 + 22)} {f(xb)} {f(yb)}" stroke="{C["rope"]}" stroke-width="6" fill="none" stroke-linecap="round"/>'
    b.append(P(back_posts + rope))
    b.append(fox(d, 512, deck_y(512) + 8, .74, face="determined", arms="out", tilt=-3, wave=.6))
    front_posts = "".join(f'<rect x="{f(x - 8)}" y="{f(deck_y(x) - 70)}" width="16" height="{f(96)}" rx="7" fill="{C["wood"]}"/>' for x in posts[::2])
    rope2 = ""
    fp = [(x, deck_y(x) - 64) for x in posts[::2]]
    for (xa, ya), (xb, yb) in zip(fp, fp[1:]):
        rope2 += f'<path d="M{f(xa)} {f(ya + 10)} Q{f((xa + xb) / 2)} {f((ya + yb) / 2 + 52)} {f(xb)} {f(yb + 10)}" stroke="{C["rope"]}" stroke-width="7" fill="none" stroke-linecap="round"/>'
    b.append(P(front_posts + rope2))
    b.append(scatter_flowers(d, rng, 24, 0, 1024, 850, 1010, 8, 12, [C["pink"], C["yellow"], "#FFFFFF"]))
    b.append(scatter_tufts(d, rng, 18, 0, 1024, 850, 1010, 10, 16, "#5BAE5E"))
    return svg_doc(d, "".join(b))


def scene_5():
    """A small blue bird lands in front of Tori."""
    d = Defs("m")
    rng = random.Random(5)
    sky = d.lin([(0, "#8FD3F7"), (1, "#E8F7FF")])
    b = [f'<rect width="1024" height="1024" fill="{sky}"/>']
    b.append(cloud(170, 150, 60) + cloud(600, 90, 46))
    b.append(P(hill([(-40, 560), (240, 510), (520, 548), (800, 500), (1064, 540)], "#BEE5AE")))
    b.append(P(hill([(-40, 640), (300, 600), (620, 630), (1064, 596)], "#9FD68B")))
    ground = d.lin([(0, "#96D582"), (1, "#71BF69")])
    b.append(P(hill([(-40, 700), (360, 686), (700, 700), (1064, 690)], ground)))
    b.append(P(f'<path d="M820 1044 Q842 700 830 380 L900 380 Q906 700 944 1044Z" fill="{C["trunk"]}"/>'
               f'<path d="M846 520 Q760 470 690 486 Q700 500 770 500 Q820 506 850 548Z" fill="{C["trunk"]}"/>'))
    b.append(P("".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{C["leaf_dark"]}"/>' for x, y, r in [(760, 330, 120), (900, 260, 150), (1010, 360, 120), (700, 210, 100), (860, 120, 120), (1000, 120, 110)])))
    b.append(P("".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{C["leaf"]}"/>' for x, y, r in [(780, 290, 100), (910, 220, 120), (1010, 300, 90), (720, 180, 80), (870, 90, 90)])
               + "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{C["leaf_light"]}"/>' for x, y, r in [(740, 160, 26), (850, 80, 30), (700, 270, 20)])))
    b.append(scatter_tufts(d, rng, 26, 0, 1024, 720, 1010, 10, 18, "#5BAE5E"))
    b.append(scatter_flowers(d, rng, 40, 0, 1024, 716, 1010, 8, 13, [C["pink"], C["yellow"], "#FFFFFF", C["violet"]],
                             avoid=lambda x, y: (220 < x < 520 and y > 820) or (560 < x < 740 and y > 760)))
    b.append(fox(d, 360, 925, .98, face="happy", arms="wave", wave=.3))
    b.append(P('<ellipse cx="650" cy="816" rx="60" ry="14" fill="#5DAF5E" opacity=".6"/>'))
    b.append(bird(d, 652, 690, 1.25, flip=True, flying=True))
    b.append(P(heart(520, 520, 22, "#FF8FB1") + heart(560, 446, 15, "#FFB3CB")))
    b.append(P(note(740, 520, 1.1, "#4A90E2") + note(790, 600, .8, "#6FA8EC")))
    b.append(P(sparkle(600, 600, 11, "#FFFFFF") + sparkle(700, 790, 9, "#FFFFFF")))
    return svg_doc(d, "".join(b))


def scene_6():
    """Sunset turns to night on the high hill; stars come out."""
    d = Defs("n")
    rng = random.Random(6)
    sky = d.lin([(0, "#1E2A62"), (.4, "#3B3C88"), (.65, "#7A5AA6"), (.85, "#E28EA4"), (1, "#FFC08A")])
    b = [f'<rect width="1024" height="1024" fill="{sky}"/>']
    b.append(night_sky_dots(rng, 110, 560))
    b.append(P("".join(sparkle(rng.uniform(40, 980), rng.uniform(40, 460), rng.uniform(9, 15), "#FFF4B8") for _ in range(9))))
    b.append(glow(d, 812, 190, 140, "#FFF6CF", .45))
    b.append(crescent(812, 190, 56, "#FFF1B0", "#F2D98A"))
    b.append(P(hill([(-40, 700), (180, 650), (420, 690), (680, 640), (900, 680), (1064, 650)], "#6A579E")))
    b.append(P(hill([(-40, 770), (260, 730), (560, 760), (840, 720), (1064, 748)], "#4E4F92")))
    land = d.lin([(0, "#3A7468"), (1, "#28524C")])
    b.append(P(hill([(-40, 1000), (200, 900), (512, 800), (820, 880), (1064, 960)], land)))
    b.append(scatter_tufts(d, rng, 26, 0, 1024, 850, 1020, 12, 20, "#23493F", avoid=lambda x, y: y < 820 + abs(x - 512) * .2))
    b.append(scatter_flowers(d, rng, 16, 40, 980, 880, 1010, 6, 9, ["#FFFFFF", "#FFE9A8"], avoid=lambda x, y: y < 860 + abs(x - 512) * .2))
    b.append(fox_back_sitting(d, 470, 836, .82))
    b.append(bird(d, 640, 800, .72, flip=True, sit=True, face="happy"))
    b.append("".join(glow(d, x, y, r, "#FFF3A0", .9) for x, y, r in [(180, 820, 12), (300, 900, 9), (760, 860, 11), (880, 800, 8), (120, 940, 10)]))
    return svg_doc(d, "".join(b))


def scene_7():
    """A small light sparkles in the grass: the fallen star!"""
    d = Defs("s")
    rng = random.Random(7)
    sky = d.lin([(0, "#1C2660"), (.6, "#33397F"), (1, "#5A4A94")])
    b = [f'<rect width="1024" height="1024" fill="{sky}"/>']
    b.append(night_sky_dots(rng, 100, 520))
    b.append(P("".join(sparkle(rng.uniform(40, 980), rng.uniform(30, 420), rng.uniform(8, 13), "#FFF4B8") for _ in range(7))))
    b.append(P(hill([(-40, 600), (300, 560), (640, 590), (1064, 556)], "#3E4C88")))
    land = d.lin([(0, "#2F6A5A"), (1, "#22503F")])
    b.append(P(hill([(-40, 660), (380, 640), (760, 652), (1064, 640)], land)))
    b.append(glow(d, 690, 770, 380, "#FFF0A0", .6))
    b.append(scatter_tufts(d, rng, 30, 0, 1024, 690, 900, 12, 22, "#2B5F4F"))
    b.append(fox(d, 330, 935, .96, face="amazed", arms="out", wave=.4))
    b.append(bird(d, 520, 520, .8, flying=True, face="happy"))
    b.append(star_char(d, 700, 790, 1.0, glow_on=True, face="eyes", rot=8))
    b.append(P("".join(sparkle(x, y, s, "#FFF8C8") for x, y, s in [(590, 670, 14), (820, 690, 12), (780, 880, 10), (610, 880, 9), (720, 610, 10)])))
    blades = []
    for _ in range(70):
        x = rng.uniform(0, 1024)
        y = rng.uniform(900, 1040)
        hgt = rng.uniform(40, 110)
        lean = rng.uniform(-30, 30)
        col = rng.choice(["#2E6B58", "#3B7D63", "#275B4B"])
        if 600 < x < 800 and y < 960:
            col = rng.choice(["#6E9F62", "#89B36A"])
        blades.append(f'<path d="M{f(x - 7)} {f(y)} Q{f(x + lean * .3)} {f(y - hgt * .6)} {f(x + lean)} {f(y - hgt)} Q{f(x + lean * .2)} {f(y - hgt * .5)} {f(x + 7)} {f(y)}Z" fill="{col}"/>')
    b.append(P("".join(blades)))
    return svg_doc(d, "".join(b))


def scene_8():
    """Home at sunset with the new friend; the star shines in the sky again."""
    d = Defs("h")
    rng = random.Random(8)
    sky = d.lin([(0, "#7C6CCB"), (.35, "#C98BC6"), (.62, "#FF9EA0"), (.82, "#FFC07A"), (1, "#FFE2A6")])
    b = [f'<rect width="1024" height="1024" fill="{sky}"/>']
    b.append(glow(d, 300, 610, 300, "#FFE9A0", .85))
    b.append(P('<circle cx="300" cy="610" r="104" fill="#FFD26E"/>'))
    b.append(P(cloud(640, 230, 50, fill="#FFD9C9", shade="#F5B7B4") + cloud(140, 300, 40, fill="#FFD9C9", shade="#F5B7B4")))
    b.append(star_char(d, 820, 170, .5, glow_on=True, face="happy", rot=-10))
    b.append(P("".join(sparkle(820 - i * 46, 170 + i * 40, 10 - i * 1.5, "#FFF4B8") for i in range(1, 5))))
    b.append(P(hill([(-40, 640), (200, 600), (460, 630), (720, 586), (1064, 616)], "#E7A091")))
    b.append(P(hill([(-40, 700), (280, 662), (600, 690), (900, 654), (1064, 672)], "#B9B27E")))
    ground = d.lin([(0, "#A6C978"), (1, "#83B568")])
    b.append(P(hill([(-40, 734), (320, 716), (700, 730), (1064, 718)], ground)))
    b.append(round_tree(950, 740, 90, leaf="#7DB66A", leaf_dark="#5F9B58", light="#A4CE80"))
    b.append(cottage(d, 770, 748, 270, warm=True))
    b.append(P(road([(770, 746), (720, 810), (590, 880), (460, 960), (380, 1044)], [64, 90, 130, 170, 200], "#F7D9A6")))
    b.append(scatter_tufts(d, rng, 22, 0, 1024, 760, 1010, 10, 18, "#6E9E58", avoid=lambda x, y: 380 < x < 780 and y > 800))
    b.append(scatter_flowers(d, rng, 30, 0, 1024, 760, 1010, 8, 12, [C["pink"], C["yellow"], "#FFFFFF"],
                             avoid=lambda x, y: (360 < x < 800 and y > 790)))
    b.append(fox(d, 470, 930, .9, face="happy", arms="swing", walk=1, wave=.8))
    b.append(bird(d, 640, 640, .9, flying=True, face="gentle"))
    return svg_doc(d, "".join(b))


SCENES = [scene_cover, scene_1, scene_2, scene_3, scene_4, scene_5, scene_6, scene_7, scene_8]
