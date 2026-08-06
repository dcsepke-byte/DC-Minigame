#!/usr/bin/env python3
"""Baut eine SCHÖNE AETHONIA-STADT aus den Kenney-Tiles.
Straßen-Netz, viele Häuser, Marktplatz, Zäune, Bäume, Deko.
Ergebnis: assets/kenney-tiny-town/aethonia_world.png"""
from PIL import Image
import random, math

TILES = "assets/kenney-tiny-town/tiles"
OUT = "assets/kenney-tiny-town/aethonia_world.png"

def tile(i):
    return Image.open(f"{TILES}/tile_{i:04d}.png").convert("RGBA")

# Karten-Größe
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
# STADT-STRASSEN (Pflaster + Wege)
# ============================================================
path = tile(25)       # Weg-Mitte
pflaster = tile(43)   # Pflasterstein
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

# Hauptstraßen (Pflaster) — Stadtkern
draw_street((2, 8), (46, 10), 0.10, 2, 43)
draw_street((2, 20), (46, 18), 0.08, 3, 43)
draw_street((2, 30), (46, 28), 0.12, 2, 43)
# Vertikale Hauptstraßen
draw_street((10, 2), (8, 34), 0.10, 2, 43)
draw_street((26, 2), (24, 34), 0.08, 3, 43)
draw_street((38, 2), (40, 34), 0.12, 2, 43)

# Nebenstraßen (Weg) — organisch
for _ in range(6):
    x0 = rng.randint(2, W-3)
    y0 = rng.randint(2, H-3)
    x1 = rng.randint(2, W-3)
    y1 = rng.randint(2, H-3)
    draw_street((x0, y0), (x1, y1), 0.15, 2, 25)

# ============================================================
# MARKTPLATZ (zentraler Platz mit Pflaster)
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
# HÄUSER (viele, entlang der Straßen)
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

# Häuser entlang der Hauptstraßen (versetzt, abwechselnd grau/braun)
house_rows = [5, 7, 9, 15, 17, 19, 25, 27, 29]
house_cols = [5, 7, 9, 21, 23, 25, 33, 35, 37]
house_idx = 0
for gy in house_rows:
    for gx in range(2, W-4, 4):
        # Nur wenn nahe einer Straße (nicht auf dem Marktplatz)
        if abs(gx - market_cx) < 4 and abs(gy - market_cy) < 4:
            continue
        if rng.random() < 0.7:
            place_house(base, gx, gy, "gray" if house_idx % 2 == 0 else "brown")
            house_idx += 1

# ============================================================
# ZÄUNE (um Häuser/Gärten)
# ============================================================
fence_h = tile(45)  # Zaun wagerecht
fence_v = tile(59)  # Zaun senkrecht
# Zaun um den Marktplatz
for dx in range(-4, 5):
    base.paste(fence_h, ((market_cx+dx)*TS, (market_cy-4)*TS), fence_h)
    base.paste(fence_h, ((market_cx+dx)*TS, (market_cy+4)*TS), fence_h)
for dy in range(-4, 5):
    base.paste(fence_v, ((market_cx-4)*TS, (market_cy+dy)*TS), fence_v)
    base.paste(fence_v, ((market_cx+4)*TS, (market_cy+dy)*TS), fence_v)

# ============================================================
# BÄUME (an den Rändern, Parks)
# ============================================================
tree_green_crown, tree_green_body = tile(4), tile(16)
tree_yellow_crown, tree_yellow_body = tile(3), tile(15)
for y in range(1, H-1):
    for x in range(1, W-1):
        if (x, y) in street_cells:
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
# WASSER (Ozean an den Rändern + Teich im Park)
# ============================================================
water = tile(76)
for y in range(H):
    for x in [0, W-1]:
        base.paste(water, (x*TS, y*TS), water)
for x in range(W):
    for y in [0, H-1]:
        base.paste(water, (x*TS, y*TS), water)
# Teich im Park (oben links)
for dy in range(3):
    for dx in range(3):
        if rng.random() < 0.8:
            base.paste(water, ((6+dx)*TS, (2+dy)*TS), water)

# ============================================================
# DEKO (Schubkarren, Pilze)
# ============================================================
cart = tile(57)
mushroom = tile(29)
# Schubkarren an Straßen
for (cx, cy) in [(12, 8), (30, 28), (20, 20)]:
    if (cx, cy) not in street_cells:
        base.paste(cart, (cx*TS, cy*TS), cart)
# Pilze im Gras
for _ in range(8):
    px, py = rng.randint(2, W-3), rng.randint(2, H-3)
    if (px, py) not in street_cells:
        base.paste(mushroom, (px*TS, py*TS), mushroom)

base.save(OUT)
print(f"Aethonia-Stadt gespeichert: {OUT} ({W*TS}x{H*TS})")
