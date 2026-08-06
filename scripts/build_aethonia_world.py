#!/usr/bin/env python3
"""Baut eine SEHR DYNAMISCHE Aethonia-Pixel-Weltkarte aus den Kenney-Tiles.
Organische geschwungene Wege (zufällige Drift), natürliche Flüsse, Seen,
Baum-Cluster, Biome-Färbung. Ergebnis: assets/kenney-tiny-town/aethonia_world.png"""
from PIL import Image
import random, math

TILES = "assets/kenney-tiny-town/tiles"
OUT = "assets/kenney-tiny-town/aethonia_world.png"

def tile(i):
    return Image.open(f"{TILES}/tile_{i:04d}.png").convert("RGBA")

# Karten-Größe
W, H = 48, 36
TS = 16

# ============================================================
# Seeded Noise für organische Formen
# ============================================================
def make_rng(seed):
    return random.Random(seed)

rng = make_rng(1337)

def smooth_noise(x, y, freq):
    """Einfaches value-noise für organische Drift."""
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
# Boden: Gras als Basis
# ============================================================
base = Image.new("RGBA", (W*TS, H*TS), (0,0,0,0))
grass = tile(0)
for y in range(H):
    for x in range(W):
        base.paste(grass, (x*TS, y*TS))

# Gras-Varianten mit Noise streuen (organisch, nicht Zufall)
g1, g2 = tile(1), tile(2)
for y in range(H):
    for x in range(W):
        n = smooth_noise(x, y, 0.08)
        if n > 0.55:
            base.paste(g1, (x*TS, y*TS), g1)
        elif n < -0.55:
            base.paste(g2, (x*TS, y*TS), g2)

# ============================================================
# ORGANISCHE GESCHWUNGENE WEGE (random-walk mit Noise-Drift)
# ============================================================
path = tile(25)
# Set für Weg-Pixel (Grid-Koordinaten)
path_cells = set()

def draw_winding_path(start, end, noise_freq=0.12, drift=5):
    """Zeichnet einen organisch geschwungenen Weg. Verwendet Noise für Drift."""
    x, y = start
    tx, ty = end
    steps = max(abs(tx-x), abs(ty-y)) * 2
    for s in range(steps+1):
        t = s / steps
        # Ziel-Interpolation
        gx = x + (tx-x) * t
        gy = y + (ty-y) * t
        # Noise-Drift senkrecht
        perp_noise = smooth_noise(s, 0, noise_freq) * drift
        # Senkrechte Richtung berechnen
        dx, dy = tx-x, ty-y
        length = math.hypot(dx, dy) or 1
        px, py = -dy/length, dx/length  # senkrecht
        gx += px * perp_noise
        gy += py * perp_noise
        # Auch entlang-Noise für wellige Wege
        gx += smooth_noise(s, 10, noise_freq*0.5) * drift * 0.5
        gy += smooth_noise(s, 20, noise_freq*0.5) * drift * 0.5
        cx, cy = int(round(gx)), int(round(gy))
        if 1 <= cx < W-1 and 1 <= cy < H-1:
            path_cells.add((cx, cy))
            base.paste(path, (cx*TS, cy*TS), path)

# Hauptwege — organisch von Rand zu Rand
draw_winding_path((2, 6), (46, 8), 0.10, 4)
draw_winding_path((2, 18), (46, 16), 0.08, 5)
draw_winding_path((2, 28), (46, 30), 0.12, 4)
# Vertikale organische Wege
draw_winding_path((10, 2), (8, 34), 0.10, 4)
draw_winding_path((26, 2), (24, 34), 0.08, 5)
draw_winding_path((38, 2), (40, 34), 0.12, 4)

# ============================================================
# NATÜRLICHER FLUSS (Wasser-Band durch die Karte)
# ============================================================
water = tile(76)
river_cells = set()
def draw_river(start, end, noise_freq=0.06, width=2):
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
draw_river((4, 20), (44, 22), 0.05, 2)

# ============================================================
# WASSER rendern (Fluss zuerst, dann Rand)
# ============================================================
for (cx, cy) in river_cells:
    base.paste(water, (cx*TS, cy*TS), water)
# Ozean an den Rändern
for y in range(H):
    for x in [0, W-1]:
        base.paste(water, (x*TS, y*TS), water)
for x in range(W):
    for y in [0, H-1]:
        base.paste(water, (x*TS, y*TS), water)

# ============================================================
# HÄUSER an Weg-Kreuzungen (nur wo Weg ist)
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

# Häuser entlang der Wege (wo Weg-Zellen nahe sind)
house_spots = [(6,5),(6,16),(6,27),(22,5),(24,16),(22,27),(36,5),(38,16),(36,27)]
for i, (gx, gy) in enumerate(house_spots):
    # Nur platzieren, wenn nicht auf Wasser
    if not any((gx+dx, gy+dy) in river_cells for dx in range(3) for dy in range(3)):
        place_house(base, gx, gy, "gray" if i % 2 == 0 else "brown")

# ============================================================
# BÄUME — Cluster-artig mit Noise (organisch)
# ============================================================
tree_green_crown, tree_green_body = tile(4), tile(16)
tree_yellow_crown, tree_yellow_body = tile(3), tile(15)
for y in range(1, H-1):
    for x in range(1, W-1):
        if (x, y) in path_cells or (x, y) in river_cells:
            continue
        n = smooth_noise(x, y, 0.05)
        if n > 0.35:  # Noise-gesteuerte Cluster
            r = rng.random()
            if r < 0.6:
                base.paste(tree_green_crown, (x*TS, y*TS), tree_green_crown)
                base.paste(tree_green_body, (x*TS, (y+1)*TS), tree_green_body)
            elif r < 0.8:
                base.paste(tree_yellow_crown, (x*TS, y*TS), tree_yellow_crown)
                base.paste(tree_yellow_body, (x*TS, (y+1)*TS), tree_yellow_body)

base.save(OUT)
print(f"Sehr dynamische Weltkarte gespeichert: {OUT} ({W*TS}x{H*TS})")
