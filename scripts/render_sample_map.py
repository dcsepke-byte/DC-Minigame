#!/usr/bin/env python3
"""Rendert die offizielle Kenney Pico-8 City Beispielkarte (sample-map.tmx).
55x30 Tiles, 2 Layer (Terrain + Objects). Gibt eine korrekt angeordnete Stadt."""
from PIL import Image
import numpy as np, re

# Tilesheet: ../Tilemap/tilemap.png, tilewidth=8, tileheight=8, spacing=1, columns=24
TILESHEET = "assets/kenney-pico8-city/Tilemap/tilemap.png"
TILE = 8
SPACING = 1
COLUMNS = 24
FIRSTGID = 1

sheet = Image.open(TILESHEET).convert('RGBA')
print("Tilesheet:", sheet.size)

# GID -> Pixel-Koordinate im Sheet
def gid_to_xy(gid):
    if gid <= 0: return None
    idx = gid - FIRSTGID
    sx = idx % COLUMNS
    sy = idx // COLUMNS
    x = sx * (TILE + SPACING)
    y = sy * (TILE + SPACING)
    return (x, y, TILE, TILE)

# Lese die .tmx
tmx = open("assets/kenney-pico8-city/Tiled/sample-map.tmx").read()
# Map-Groesse
mw = int(re.search(r'width="(\d+)"', tmx).group(1))
mh = int(re.search(r'height="(\d+)"', tmx).group(1))
print(f"Map: {mw}x{mh}")

# Layer CSV-Daten
layers = re.findall(r'<layer.*?name="([^"]+)".*?<data encoding="csv">\s*(.*?)\s*</data>', tmx, re.S)
print("Layer:", [l[0] for l in layers])

# Render
canvas = Image.new('RGBA', (mw*TILE, mh*TILE), (0,0,0,0))
for name, csvdata in layers:
    # CSV -> Liste
    nums = [int(x) for x in csvdata.replace('\r','').replace('\n',',').replace(' ',',').split(',') if x.strip()!='']
    # Objects-Layer hat evtl. negative/huge Werte -> filtere gueltige GIDs
    # Terrain zuerst (Basis), Objects drueber
    for i, gid in enumerate(nums):
        if gid <= 0: continue
        # Bei Objects: sehr grosse Werte (2147483935) sind Flags -> maskieren
        gid = gid & 0x0FFFFFFF
        if gid <= 0: continue
        xy = gid_to_xy(gid)
        if xy is None: continue
        x0, y0, tw, th = xy
        if x0+tw > sheet.size[0] or y0+th > sheet.size[1]:
            continue
        tile_img = sheet.crop((x0, y0, x0+tw, y0+th))
        px, py = (i % mw) * TILE, (i // mw) * TILE
        canvas.paste(tile_img, (px, py), tile_img)

canvas.save("assets/kenney-pico8-city/aethonia_city_4x.png")
print("Gespeichert: aethonia_city_4x.png", canvas.size)
