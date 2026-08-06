#!/usr/bin/env python3
"""Baut eine DYNAMISCHE Aethonia-Pixel-Weltkarte aus den Kenney-Tiles.
Geschwungene Wege (nicht nur gerade), Biome-Farben, mehr Variation.
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

# Boden: Gras (0) als Basis
base = Image.new("RGBA", (W*TS, H*TS), (0,0,0,0))
grass = tile(0)
for y in range(H):
    for x in range(W):
        base.paste(grass, (x*TS, y*TS))

# Gras-Varianten (1, 2) als Deko streuen
random.seed(7)
g1, g2 = tile(1), tile(2)
for y in range(H):
    for x in range(W):
        r = random.random()
        if r < 0.10:
            base.paste(g1, (x*TS, y*TS), g1)
        elif r < 0.16:
            base.paste(g2, (x*TS, y*TS), g2)

# ============================================================
# GESCHWUNGENE WEGE (Sinus-Pfade statt gerader Straßen)
# ============================================================
path = tile(25)
path_corner = tile(12)  # Wegecke

def draw_curved_path(base, x0, y0, x1, y1, amplitude=3):
    """Zeichnet einen geschwungenen Weg von (x0,y0) zu (x1,y1)."""
    steps = max(abs(x1-x0), abs(y1-y0))
    for s in range(steps+1):
        t = s / steps
        x = round(x0 + (x1-x0)*t)
        y = round(y0 + (y1-y0)*t)
        # Sinus-Offset senkrecht zum Pfad
        if x1 != x0:  # horizontaler Pfad
            y += round(math.sin(t * math.pi * 2) * amplitude)
        else:  # vertikaler Pfad
            x += round(math.sin(t * math.pi * 2) * amplitude)
        if 0 <= x < W and 0 <= y < H:
            base.paste(path, (x*TS, y*TS), path)

# Geschwungene Hauptwege (S-förmig durch die Karte)
draw_curved_path(base, 2, 6, 45, 6, 2)    # oberer Weg
draw_curved_path(base, 2, 18, 45, 18, 3)  # mittlerer Weg (stärker geschwungen)
draw_curved_path(base, 2, 30, 45, 30, 2)  # unterer Weg
# Vertikale geschwungene Wege
draw_curved_path(base, 8, 2, 8, 34, 2)
draw_curved_path(base, 24, 2, 24, 34, 3)
draw_curved_path(base, 40, 2, 40, 34, 2)

# ============================================================
# HÄUSER an Weg-Kreuzungen (Stein + Braun)
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

# Häuser an Kreuzungen (versetzt, nicht alle gleich)
house_spots = [(6,5),(6,17),(6,29),(22,5),(22,17),(22,29),(38,5),(38,17),(38,29)]
for i, (gx, gy) in enumerate(house_spots):
    place_house(base, gx, gy, "gray" if i % 2 == 0 else "brown")

# ============================================================
# BÄUME (grüne + gelbe Kronen) — unregelmäßig verteilt
# ============================================================
tree_green_crown, tree_green_body = tile(4), tile(16)
tree_yellow_crown, tree_yellow_body = tile(3), tile(15)
for y in range(1, H-1, 2):
    for x in range(1, W-1, 2):
        r = random.random()
        if r < 0.18 and (x, y) not in [(6,5),(6,17),(6,29),(22,5),(22,17),(22,29),(38,5),(38,17),(38,29)]:
            if random.random() < 0.7:
                base.paste(tree_green_crown, (x*TS, y*TS), tree_green_crown)
                base.paste(tree_green_body, (x*TS, (y+1)*TS), tree_green_body)
            else:
                base.paste(tree_yellow_crown, (x*TS, y*TS), tree_yellow_crown)
                base.paste(tree_yellow_body, (x*TS, (y+1)*TS), tree_yellow_body)

# ============================================================
# WASSER (Ozean) an den Rändern + kleine Seen
# ============================================================
water = tile(76)
for y in range(H):
    for x in [0, W-1]:
        base.paste(water, (x*TS, y*TS), water)
for x in range(W):
    for y in [0, H-1]:
        base.paste(water, (x*TS, y*TS), water)
# Kleine Seen (unregelmäßig)
for (sx, sy) in [(12, 10), (30, 24), (18, 28)]:
    for dy in range(3):
        for dx in range(3):
            if random.random() < 0.8:
                base.paste(water, ((sx+dx)*TS, (sy+dy)*TS), water)

base.save(OUT)
print(f"Dynamische Weltkarte gespeichert: {OUT} ({W*TS}x{H*TS})")
