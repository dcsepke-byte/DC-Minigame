#!/usr/bin/env python3
"""Ein einzelner Pflasterstein-Tile (32x32) zum Abnehmen."""
from PIL import Image, ImageDraw
import random

TS = 32
OUTLINE = (74, 52, 34)

img = Image.new("RGBA", (TS, TS), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
def rect(x0, y0, x1, y1, c):
    d.rectangle([x0, y0, x1, y1], fill=c)

# --- Stein-Fläche ---
stone = (172, 174, 180)
rect(0, 0, TS-1, TS-1, stone)

# --- Stein-Textur (Fugen + Variation) ---
# 4x4 Steinraster mit versetzten Fugen
rnd = random.Random(42)
block = TS // 4  # 8px pro Stein
for by in range(4):
    for bx in range(4):
        x0 = bx*block; y0 = by*block
        x1 = x0+block-1; y1 = y0+block-1
        # leichte Tonvariation pro Stein
        shade = rnd.randrange(-10, 10)
        c = (max(0,min(255,stone[0]+shade)), max(0,min(255,stone[1]+shade)), max(0,min(255,stone[2]+shade)))
        d.rectangle([x0, y0, x1, y1], fill=c)
        # Fugen (dunkle Linien zwischen Steinen)
        d.line([(x0, y1), (x1, y1)], fill=(130, 130, 136), width=1)
        d.line([(x1, y0), (x1, y1)], fill=(130, 130, 136), width=1)
# Fuge in der Mitte (horizontale Reihe)
d.line([(0, block*2-1), (TS-1, block*2-1)], fill=(130,130,136), width=1)

# --- Schatten rechts-unten (Bible: Licht von links-oben) ---
# Kante rechts unten abdunkeln
for y in range(TS):
    d.line([(TS-3, y), (TS-1, y)], fill=(140, 142, 148), width=1)
for x in range(TS):
    d.line([(x, TS-3), (x, TS-1)], fill=(140, 142, 148), width=1)

# --- Highlight links-oben ---
for y in range(TS):
    d.line([(0, y), (1, y)], fill=(200, 202, 206), width=1)
for x in range(TS):
    d.line([(x, 0), (x, 1)], fill=(200, 202, 206), width=1)

# --- Außen-Outline (dunkelbraun, 1px) ---
d.rectangle([0, 0, TS-1, TS-1], outline=OUTLINE, width=1)

img.save("/opt/data/DC-Minigame/assets/custom-tiles-32/terrain/Road_Pflaster_Demo.png")
# Groß für Abnahme
big = img.resize((TS*8, TS*8), Image.NEAREST)
big.save("/opt/data/pflaster_demo.png")
print("Pflasterstein-Tile erstellt (32x32), groß als /opt/data/pflaster_demo.png")
