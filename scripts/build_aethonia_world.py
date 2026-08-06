#!/usr/bin/env python3
"""Baut eine DETAILREICHE Aethonia-Stadt aus den Kenney-Tiles.
Ufer, Brücken, Wege-Kanten, viele Gebäude, Deko, Parks.
Ergebnis: assets/kenney-tiny-town/aethonia_world.png"""
from PIL import Image
import random, math

TILES = "assets/kenney-tiny-town/tiles"
OUT = "assets/kenney-tiny-town/aethonia_world.png"

def tile(i):
    return Image.open(f"{TILES}/tile_{i:04d}.png").convert("RGBA")

W, H = 48, 36
TS = 16
rng = random.Random(2026)

def smooth_noise(x, y, freq):
    def cell(a, b):
        rng2 = random.Random((a*7919 + b*104729) & 0xffffffff)
        return rng2.random() * 2 - 1
    xf, yf = x * freq, y * freq
    x0, y0 = int(math.floor(xf)), int(math.floor(yf))
    tx, ty = xf - x0, yf - y0
    tx = tx*tx*(3-2*tx); ty = ty*ty*(3-2*ty)
    n00 = cell(x0, y0); n10 = cell(x0+1, y0)
    n01 = cell(x0, y0+1); n11 = cell(x0+1, y0+1)
    nx0 = n00 + (n10-n00)*tx; nx1 = n01 + (n11-n01)*tx
    return nx0 + (nx1-nx0)*ty

# ============================================================
# Boden: Gras
# ============================================================
base = Image.new("RGBA", (W*TS, H*TS), (0,0,0,0))
grass = tile(0)
for y in range(H):
    for x in range(W):
        base.paste(grass, (x*TS, y*TS))

# Gras-Varianten mit Noise
g1, g2 = tile(1), tile(2)
for y in range(H):
    for x in range(W):
        n = smooth_noise(x, y, 0.08)
        if n > 0.5:
            base.paste(g1, (x*TS, y*TS), g1)
        elif n < -0.5:
            base.paste(g2, (x*TS, y*TS), g2)

# ============================================================
# STRASSEN (Pflaster + Wege mit Kanten)
# ============================================================
path = tile(25)
pflaster = tile(43)
street_cells = set()

def draw_street(start, end, noise_freq=0.15, drift=3, surface=25):
    x, y = start
    tx, ty = end
    steps = max(abs(tx-x), abs(ty-y)) * 2
    for s in range(steps+1):
        t = s / steps
        gx = x + (tx-x) * t + smooth_noise(s, 0, noise_freq) * drift
        gy = y + (ty-y) * t + smooth_noise(s, 10, noise_freq) * drift
        cx, cy = int(round(gx)), int(round(gy))
        if 1 <= cx < W-1 and 1 <= cy < H-1:
            street_cells.add((cx, cy))
            base.paste(tile(surface), (cx*TS, cy*TS), tile(surface))

# Hauptstraßen (Pflaster)
draw_street((2, 8), (46, 10), 0.10, 2, 43)
draw_street((2, 20), (46, 18), 0.08, 3, 43)
draw_street((2, 30), (46, 28), 0.12, 2, 43)
draw_street((10, 2), (8, 34), 0.10, 2, 43)
draw_street((26, 2), (24, 34), 0.08, 3, 43)
draw_street((38, 2), (40, 34), 0.12, 2, 43)

# Nebenstraßen (Weg)
for _ in range(8):
    x0 = rng.randint(2, W-3); y0 = rng.randint(2, H-3)
    x1 = rng.randint(2, W-3); y1 = rng.randint(2, H-3)
    draw_street((x0, y0), (x1, y1), 0.15, 2, 25)

# ============================================================
# MARKTPLATZ
# ============================================================
market_cx, market_cy = 24, 18
for dy in range(-3, 4):
    for dx in range(-3, 4):
        if abs(dx) + abs(dy) <= 4:
            cx, cy = market_cx+dx, market_cy+dy
            if 1 <= cx < W-1 and 1 <= cy < H-1:
                base.paste(pflaster, (cx*TS, cy*TS), pflaster)
                street_cells.add((cx, cy))

# ============================================================
# FLUSS mit Ufern + Brücken
# ============================================================
water = tile(76)
water_edge = tile(78)  # Wasser-Kante
river_cells = set()
def draw_river(start, end, noise_freq=0.05, width=2):
    x, y = start
    tx, ty = end
    steps = max(abs(tx-x), abs(ty-y)) * 3
    for s in range(steps+1):
        t = s / steps
        gx = x + (tx-x) * t + smooth_noise(s, 5, noise_freq) * 8
        gy = y + (ty-y) * t + smooth_noise(s, 15, noise_freq) * 8
        cx, cy = int(round(gx)), int(round(gy))
        for dy in range(-width//2, width//2+1):
            for dx in range(-width//2, width//2+1):
                if 0 <= cx+dx < W and 0 <= cy+dy < H:
                    river_cells.add((cx+dx, cy+dy))
draw_river((4, 20), (44, 22), 0.05, 1)

# Wasser rendern
for (cx, cy) in river_cells:
    base.paste(water, (cx*TS, cy*TS), water)

# Ufer-Kanten (Wasser-Rand zu Gras)
for (cx, cy) in river_cells:
    for dx, dy in [(1,0),(-1,0),(0,1),(0,-1)]:
        nx, ny = cx+dx, cy+dy
        if (nx, ny) not in river_cells and 0 <= nx < W and 0 <= ny < H:
            base.paste(water_edge, (nx*TS, ny*TS), water_edge)

# Brücken über den Fluss (Pflaster)
for bx in [12, 24, 36]:
    for dy in range(-1, 2):
        if (bx, 20+dy) in river_cells:
            base.paste(pflaster, (bx*TS, (20+dy)*TS), pflaster)

# Ozean an den Rändern
for y in range(H):
    for x in [0, W-1]:
        base.paste(water, (x*TS, y*TS), water)
for x in range(W):
    for y in [0, H-1]:
        base.paste(water, (x*TS, y*TS), water)

# ============================================================
# GEBÄUDE (viele, mit Dächern + Fassaden)
# ============================================================
def place_house(base, gx, gy, variant="gray"):
    if variant == "gray":
        roof_top, roof_mid, facade = [48,49,50], [60,61,62], [72,74,75]
    else:
        roof_top, roof_mid, facade = [52,53,54], [64,65,66], [72,74,75]
    for i, t in enumerate(roof_top):
        base.paste(tile(t), ((gx+i)*TS, gy*TS), tile(t))
    for i, t in enumerate(roof_mid):
        base.paste(tile(t), ((gx+i)*TS, (gy+1)*TS), tile(t))
    for i, t in enumerate(facade):
        base.paste(tile(t), ((gx+i)*TS, (gy+2)*TS), tile(t))

# Häuser entlang der Straßen (dicht, abwechselnd)
house_idx = 0
for gy in [5, 7, 9, 15, 17, 19, 25, 27, 29]:
    for gx in range(2, W-4, 3):
        if abs(gx - market_cx) < 4 and abs(gy - market_cy) < 4:
            continue
        if any((gx+dx, gy+dy) in river_cells for dx in range(3) for dy in range(3)):
            continue
        if rng.random() < 0.75:
            place_house(base, gx, gy, "gray" if house_idx % 2 == 0 else "brown")
            house_idx += 1

# ============================================================
# ZÄUNE (um Marktplatz + Gärten)
# ============================================================
fence_h, fence_v = tile(45), tile(59)
for dx in range(-4, 5):
    base.paste(fence_h, ((market_cx+dx)*TS, (market_cy-4)*TS), fence_h)
    base.paste(fence_h, ((market_cx+dx)*TS, (market_cy+4)*TS), fence_h)
for dy in range(-4, 5):
    base.paste(fence_v, ((market_cx-4)*TS, (market_cy+dy)*TS), fence_v)
    base.paste(fence_v, ((market_cx+4)*TS, (market_cy+dy)*TS), fence_v)

# ============================================================
# BÄUME (Parks, Ränder, Cluster)
# ============================================================
tree_green_crown, tree_green_body = tile(4), tile(16)
tree_yellow_crown, tree_yellow_body = tile(3), tile(15)
for y in range(1, H-1):
    for x in range(1, W-1):
        if (x, y) in street_cells or (x, y) in river_cells:
            continue
        n = smooth_noise(x, y, 0.05)
        if n > 0.4:
            r = rng.random()
            if r < 0.6:
                base.paste(tree_green_crown, (x*TS, y*TS), tree_green_crown)
                base.paste(tree_green_body, (x*TS, (y+1)*TS), tree_green_body)
            elif r < 0.8:
                base.paste(tree_yellow_crown, (x*TS, y*TS), tree_yellow_crown)
                base.paste(tree_yellow_body, (x*TS, (y+1)*TS), tree_yellow_body)

# ============================================================
# DEKO (Schubkarren, Pilze, Blumen)
# ============================================================
cart, mushroom = tile(57), tile(29)
for (cx, cy) in [(12, 8), (30, 28), (20, 20), (40, 8)]:
    if (cx, cy) not in street_cells and (cx, cy) not in river_cells:
        base.paste(cart, (cx*TS, cy*TS), cart)
for _ in range(12):
    px, py = rng.randint(2, W-3), rng.randint(2, H-3)
    if (px, py) not in street_cells and (px, py) not in river_cells:
        base.paste(mushroom, (px*TS, py*TS), mushroom)

base.save(OUT)
print(f"Detailreiche Aethonia-Stadt gespeichert: {OUT} ({W*TS}x{H*TS})")
