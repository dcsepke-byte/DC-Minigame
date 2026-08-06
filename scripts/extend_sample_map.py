#!/usr/bin/env python3
"""Erweitert die offizielle Kenney Pico-8 Beispielkarte (sample-map.tmx)
auf allen Seiten nach demselben Muster mittels Spiegel-Kacheln (mirror tiling).
NxN Kacheln -> nahtlose Uebergaenge an allen Nahtstellen."""
from PIL import Image
import numpy as np, re

TILESHEET = "assets/kenney-pico8-city/Tilemap/tilemap.png"
TILE=8; SPACING=1; COLUMNS=24; FIRSTGID=1
sheet = Image.open(TILESHEET).convert('RGBA')

def gid_crop(gid):
    if gid<=0: return None
    gid &= 0x0FFFFFFF
    if gid<=0: return None
    idx=gid-FIRSTGID
    sx=idx%COLUMNS; sy=idx//COLUMNS
    x=sx*(TILE+SPACING); y=sy*(TILE+SPACING)
    if x+TILE>sheet.size[0] or y+TILE>sheet.size[1]: return None
    return sheet.crop((x,y,x+TILE,y+TILE))

# Lese .tmx
tmx=open("assets/kenney-pico8-city/Tiled/sample-map.tmx").read()
mw=int(re.search(r'width="(\d+)"',tmx).group(1))
mh=int(re.search(r'height="(\d+)"',tmx).group(1))
layers=re.findall(r'<layer.*?name="([^"]+)".*?<data encoding="csv">\s*(.*?)\s*</data>',tmx,re.S)

# Grid pro Layer als 2D-Array von GIDs
layer_grids={}
for name,csv in layers:
    nums=[int(x) for x in csv.replace('\r','').replace('\n',',').replace(' ',',').split(',') if x.strip()!='']
    layer_grids[name]=[nums[y*mw:(y+1)*mw] for y in range(mh)]

# NxN Spiegel-Kacheln
N=2  # 2x2 = 4x Flaeche (doppelt so gross linear)
OUT_W, OUT_H = mw*N, mh*N
print(f"Erweitere {mw}x{mh} -> {OUT_W}x{OUT_H} Tiles (N={N})")

def get_gid(grid, x, y):
    """GID mit Spiegelung an den Kachelgrenzen."""
    # Bestimme Kachel + Position darin
    kx, tx = divmod(x, mw)  # Kachelindex, Position
    ky, ty = divmod(y, mh)
    # Spiegeln: wenn Kachel ungerade, Position spiegeln
    if kx % 2 == 1:
        tx = mw-1-tx
    if ky % 2 == 1:
        ty = mh-1-ty
    return grid[ty][tx]

# Render
canvas = Image.new('RGBA', (OUT_W*TILE, OUT_H*TILE), (0,0,0,0))
# Terrain zuerst
terrain = layer_grids.get('Terrain')
if terrain:
    for y in range(OUT_H):
        for x in range(OUT_W):
            img = gid_crop(get_gid(terrain, x, y))
            if img: canvas.paste(img, (x*TILE, y*TILE), img)
# Objects drueber
objects = layer_grids.get('Objects')
if objects:
    for y in range(OUT_H):
        for x in range(OUT_W):
            img = gid_crop(get_gid(objects, x, y))
            if img: canvas.paste(img, (x*TILE, y*TILE), img)

out="assets/kenney-pico8-city/aethonia_city_4x.png"
canvas.save(out)
print("Gespeichert:", out, canvas.size)
