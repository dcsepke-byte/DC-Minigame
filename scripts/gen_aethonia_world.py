#!/usr/bin/env python3
"""Generiert eine Aethonia-Pixel-Welt mit dem Noise-Welten-Generator,
texturiert mit Kenney-Tiles. Organische Inseln, Biome, Wege, Häuser.
Ergebnis: assets/kenney-tiny-town/aethonia_world.png"""
from PIL import Image
import math, random

TILES = "assets/kenney-tiny-town/tiles"
OUT = "assets/kenney-tiny-town/aethonia_world.png"

def tile(i):
    return Image.open(f"{TILES}/tile_{i:04d}.png").convert("RGBA")

# ============================================================
# Deterministischer Noise (mulberry32 + value noise + fBm)
# ============================================================
def mulberry32(seed):
    a = seed & 0xFFFFFFFF
    def f():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = (a ^ (a >> 15)) & 0xFFFFFFFF
        t = (t + ((t ^ (t >> 7)) & 0xFFFFFFFF) * 61) & 0xFFFFFFFF
        t = (t ^ (t >> 14)) & 0xFFFFFFFF
        return t / 4294967296
    return f

def make_noise(seed):
    rng = mulberry32(seed)
    p = list(range(256))
    for i in range(255, 0, -1):
        j = math.floor(rng() * (i + 1))
        p[i], p[j] = p[j], p[i]
    perm = [p[i & 255] for i in range(512)]
    def fade(t): return t*t*t*(t*(t*6-15)+10)
    def lerp(a,b,t): return a+(b-a)*t
    def grad(h,x,y):
        h &= 7; u = x if h<4 else y; v = y if h<4 else x
        return (u if h&1 else -u) + (v if h&2 else -v)
    def noise(x,y):
        X=math.floor(x)&255; Y=math.floor(y)&255
        xf=x-math.floor(x); yf=y-math.floor(y)
        u=fade(xf); v=fade(yf)
        aa=perm[perm[X]+Y]; ab=perm[perm[X]+Y+1]
        ba=perm[perm[X+1]+Y]; bb=perm[perm[X+1]+Y+1]
        x1=lerp(grad(aa,xf,yf),grad(ba,xf-1,yf),u)
        x2=lerp(grad(ab,xf,yf-1),grad(bb,xf-1,yf-1),u)
        return (lerp(x1,x2,v)+1)/2
    return noise

def fbm(noise,x,y,oct,lac,gain):
    total=0; amp=1; freq=1; norm=0
    for _ in range(oct):
        total+=amp*noise(x*freq,y*freq); norm+=amp; amp*=gain; freq*=lac
    return total/norm

# ============================================================
# Biome-Lookup (Aethonia)
# ============================================================
def biome(e, m):
    if e < 0.22: return 'ocean'
    if e < 0.30: return 'beach'
    if e > 0.70: return 'ice' if m > 0.5 else 'sky'
    if e > 0.55: return 'jungle' if m > 0.6 else 'tech'
    if m < 0.30: return 'candy'
    if m < 0.50: return 'beach'
    if m < 0.72: return 'jungle'
    return 'finale'

# ============================================================
# Generierung
# ============================================================
def generate(seed, W=48, H=36):
    TS = 16
    elev = make_noise(seed*2+1)
    moist = make_noise(seed*2+2)
    detail = make_noise(seed*2+3)

    # Biome-Grid
    grid = [['ocean']*W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            nx, ny = x/W, y/H
            e = fbm(elev, nx*3, ny*3, 5, 2.0, 0.5)
            dx, dy = nx*2-1, ny*2-1
            d = 1-(1-dx*dx)*(1-dy*dy)
            e = e*(1-0.45)+(1-d)*0.45
            e = math.pow(e, 1.2)
            det = fbm(detail, nx*8, ny*8, 3, 2.0, 0.5)
            e = e*0.85 + det*0.15
            e = max(0, min(1, (e-0.5)*1.4+0.5))
            m = fbm(moist, nx*3+100, ny*3+100, 4, 2.0, 0.5)
            grid[y][x] = biome(e, m)

    # Tiles pro Biome
    grass, sand, water = tile(0), tile(12), tile(76)
    g1, g2 = tile(1), tile(2)
    tree_c, tree_b = tile(4), tile(16)
    tree_yc, tree_yb = tile(3), tile(15)
    path = tile(25)
    pflaster = tile(43)

    base = Image.new("RGBA", (W*TS, H*TS), (0,0,0,0))
    rng = random.Random(seed)

    # Boden pro Biome
    for y in range(H):
        for x in range(W):
            b = grid[y][x]
            if b == 'ocean':
                base.paste(water, (x*TS, y*TS), water)
            elif b == 'beach':
                base.paste(sand, (x*TS, y*TS), sand)
            else:
                base.paste(grass, (x*TS, y*TS), grass)
                if rng.random() < 0.1:
                    base.paste(g1, (x*TS, y*TS), g1)
                elif rng.random() < 0.06:
                    base.paste(g2, (x*TS, y*TS), g2)

    # Wege: verbinde Land-Zellen (einfaches Netz)
    path_cells = set()
    for y in range(1, H-1):
        for x in range(1, W-1):
            if grid[y][x] != 'ocean' and grid[y][x] != 'beach':
                # Weg entlang der Mitte
                if abs(y - H//2) < 2 or abs(x - W//2) < 2:
                    path_cells.add((x, y))
                    base.paste(path, (x*TS, y*TS), path)

    # Bäume auf Land (nicht auf Weg)
    for y in range(1, H-1):
        for x in range(1, W-1):
            b = grid[y][x]
            if b in ('jungle', 'candy', 'finale', 'sky', 'ice', 'tech') and (x,y) not in path_cells:
                if rng.random() < 0.3:
                    if rng.random() < 0.7:
                        base.paste(tree_c, (x*TS, y*TS), tree_c)
                        base.paste(tree_b, (x*TS, (y+1)*TS), tree_b)
                    else:
                        base.paste(tree_yc, (x*TS, y*TS), tree_yc)
                        base.paste(tree_yb, (x*TS, (y+1)*TS), tree_yb)

    # Häuser auf tech/beach (Stadt)
    def place_house(gx, gy, variant="gray"):
        if variant == "gray":
            rt, rm, fa = [48,49,50], [60,61,62], [72,74,75]
        else:
            rt, rm, fa = [52,53,54], [64,65,66], [72,74,75]
        for i, t in enumerate(rt):
            base.paste(tile(t), ((gx+i)*TS, gy*TS), tile(t))
        for i, t in enumerate(rm):
            base.paste(tile(t), ((gx+i)*TS, (gy+1)*TS), tile(t))
        for i, t in enumerate(fa):
            base.paste(tile(t), ((gx+i)*TS, (gy+2)*TS), tile(t))

    hi = 0
    for y in range(1, H-3):
        for x in range(1, W-3):
            if grid[y][x] in ('tech', 'beach') and (x,y) not in path_cells:
                if rng.random() < 0.12:
                    place_house(x, y, "gray" if hi%2==0 else "brown")
                    hi += 1

    base.save(OUT)
    return grid

if __name__ == "__main__":
    import sys
    seed = int(sys.argv[1]) if len(sys.argv) > 1 else 42
    grid = generate(seed)
    print(f"Generierte Aethonia-Welt (Seed {seed}): {OUT}")
