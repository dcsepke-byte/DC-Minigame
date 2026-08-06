#!/usr/bin/env python3
"""Baut eine echte Aethonia-Pixel-Weltkarte aus den Kenney-Tiny-Town-Tiles.
Ergebnis: assets/kenney-tiny-town/aethonia_world.png (zusammenhängende Karte)."""
from PIL import Image
import os

TILES = "assets/kenney-tiny-town/tiles"
OUT = "assets/kenney-tiny-town/aethonia_world.png"

def tile(i):
    return Image.open(f"{TILES}/tile_{i:04d}.png").convert("RGBA")

# Karten-Größe (in Tiles)
W, H = 40, 30
TS = 16  # Tile-Größe

# Boden: Gras (0) als Basis
base = Image.new("RGBA", (W*TS, H*TS), (0,0,0,0))
grass = tile(0)
for y in range(H):
    for x in range(W):
        base.paste(grass, (x*TS, y*TS))

# Gras-Varianten (1, 2) als Deko streuen
import random
random.seed(42)
g1, g2 = tile(1), tile(2)
for y in range(H):
    for x in range(W):
        r = random.random()
        if r < 0.12:
            base.paste(g1, (x*TS, y*TS), g1)
        elif r < 0.18:
            base.paste(g2, (x*TS, y*TS), g2)

# Wege: horizontale + vertikale Trampelpfade (Weg-Mitte 25)
path = tile(25)
# Horizontale Wege (durch die Mitte jeder Biome-Zeile)
for row in [5, 10, 15, 20, 25]:
    for x in range(W):
        base.paste(path, (x*TS, row*TS), path)
# Vertikale Wege
for col in [5, 12, 20, 28, 35]:
    for y in range(H):
        base.paste(path, (col*TS, y*TS), path)

# Häuser (Steinhaus grau 48-75 + Braunhaus 52-67) an Weg-Kreuzungen
def place_house(base, gx, gy, variant="gray"):
    # 3x3 Haus: Dach oben (48/49/50), Dach mitte (60/61/62), Fassade (72/74/75)
    if variant == "gray":
        roof_top = [48, 49, 50]
        roof_mid = [60, 61, 62]
        facade = [72, 74, 75]
    else:
        roof_top = [52, 53, 54]
        roof_mid = [64, 65, 66]
        facade = [72, 74, 75]
    for i, t in enumerate(roof_top):
        base.paste(tile(t), ((gx+i)*TS, gy*TS), tile(t))
    for i, t in enumerate(roof_mid):
        base.paste(tile(t), ((gx+i)*TS, (gy+1)*TS), tile(t))
    for i, t in enumerate(facade):
        base.paste(tile(t), ((gx+i)*TS, (gy+2)*TS), tile(t))

# Häuser an Kreuzungen platzieren
house_spots = [(4,4),(4,9),(11,4),(11,9),(19,4),(19,9),(27,4),(27,9),(34,4),(34,9),
               (4,14),(4,19),(11,14),(11,19),(19,14),(19,19),(27,14),(27,19),(34,14),(34,19),
               (4,24),(11,24),(19,24),(27,24),(34,24)]
for i, (gx, gy) in enumerate(house_spots):
    place_house(base, gx, gy, "gray" if i % 2 == 0 else "brown")

# Bäume (grüne Krone 4 + Körper 16) an Wegen
tree_crown, tree_body = tile(4), tile(16)
for y in range(0, H, 3):
    for x in range(0, W, 3):
        if (x, y) not in [(4,4),(4,9),(11,4),(11,9),(19,4),(19,9),(27,4),(27,9),(34,4),(34,9),
                          (4,14),(4,19),(11,14),(11,19),(19,14),(19,19),(27,14),(27,19),(34,14),(34,19),
                          (4,24),(11,24),(19,24),(27,24),(34,24)]:
            base.paste(tree_crown, (x*TS, y*TS), tree_crown)
            base.paste(tree_body, (x*TS, (y+1)*TS), tree_body)

# Wasser: blaue Tiles (76, 77, 79) als Ozean an den Rändern
water = tile(76)
for y in range(H):
    for x in [0, W-1]:
        base.paste(water, (x*TS, y*TS), water)
for x in range(W):
    for y in [0, H-1]:
        base.paste(water, (x*TS, y*TS), water)

base.save(OUT)
print(f"Weltkarte gespeichert: {OUT} ({W*TS}x{H*TS})")
