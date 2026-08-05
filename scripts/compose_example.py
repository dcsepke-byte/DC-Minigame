#!/usr/bin/env python3
"""Zusammengesetztes Beispiel: große Objekte aus Multi-Tile-Tiles bauen."""
from PIL import Image
import os
TS = 32
DIR = "/opt/data/DC-Minigame/assets/custom-tiles-32"
def t(name):
    return Image.open(f"{DIR}/{name}.png").convert("RGBA")

# Beispiel-Leinwand: Gras-Basis 8x6 Tiles
W, H = 8, 6
canvas = Image.new("RGBA", (W*TS, H*TS), (104, 168, 84))
# Gras füllen (abwechselnd 0/1/2)
import random
rnd = random.Random(42)
for y in range(H):
    for x in range(W):
        g = t("grass%d" % (rnd.randrange(3)))
        canvas.paste(g, (x*TS, y*TS))

def place(name, gx, gy):
    """Multi-Tile-Objekt an Grid-Position platzieren (alle _tl/_tr/_bl/_br)."""
    for q in ["tl","tr","bl","br"]:
        img = t(f"{name}_{q}")
        ox = 0 if q in ("tl","bl") else TS
        oy = 0 if q in ("tl","tr") else TS
        canvas.paste(img, ((gx*TS)+ox, (gy*TS)+oy), img)

# Großes rotes Haus (2x2) bei (1,1)
place("house_red", 1, 1)
# Großes blaues Haus (2x2) bei (5,1)
place("house_blue", 5, 1)
# Großer grüner Baum (2x2) bei (1,4)
place("tree_big_green", 1, 4)
# Großer gelber Baum (2x2) bei (4,4)
place("tree_big_yellow", 4, 4)
# Berg (2x2) bei (6,4)
place("mountain", 6, 4)
# Kleine Bäume einzeln
canvas.paste(t("tree_small_green"), (0, 3*TS), t("tree_small_green"))
canvas.paste(t("tree_small_yellow"), (3, 3*TS), t("tree_small_yellow"))
# Wasser-Teich
canvas.paste(t("water"), (7*TS, 0), t("water"))
canvas.paste(t("water"), (7*TS, TS), t("water"))

canvas.save("/opt/data/custom_multi_example.png")
print("Beispiel gespeichert:", canvas.size)
