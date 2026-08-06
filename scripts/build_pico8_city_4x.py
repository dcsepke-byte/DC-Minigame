#!/usr/bin/env python3
"""Baut eine ECHTE Pico-8-Stadt mit planmaessigem Strassengitter.
Kein Zufall: Gerade Hauptstrassen mit echten Kreuzungen, die klare
Haeuser-Bloecke bilden. Wasser an den Raendern, Park, Deko.
Ergebnis: assets/kenney-pico8-city/aethonia_city_4x.png"""
from PIL import Image
import numpy as np, glob, random
from collections import Counter

TILES = "assets/kenney-pico8-city/Tiles"
OUT = "assets/kenney-pico8-city/aethonia_city_4x.png"

# ============================================================
# 1. Lade + klassifiziere Tiles nach Funktion
# ============================================================
def dom_color(a):
    opaque = a[...,3]>0
    if opaque.sum()<3: return None
    px = a[opaque][:,:3]
    return Counter(map(tuple, px.tolist())).most_common(1)[0][0]

def side_has(a, side, pred):
    if side=='top': px = a[0,:,:3]
    elif side=='bottom': px = a[-1,:,:3]
    elif side=='left': px = a[:,0,:3]
    else: px = a[:,-1,:3]
    return pred(px).mean() > 0.5

ROAD_PRED = lambda p:(p[...,0]>100)&(p[...,0]<150)&(p[...,1]>100)&(p[...,1]<150)&(p[...,2]>100)&(p[...,2]<160)
WATER_PRED = lambda p:(p[...,2]>150)&(p[...,0]<100)

def is_road(c): return c and 100<c[0]<150 and 100<c[1]<150 and 100<c[2]<160
def is_water(c): return c and c[2]>150 and c[0]<100
def is_building(c): return c and c[0]>80 and c[1]>80 and c[2]<100
def is_grass(c): return c and c[1]>100 and c[0]<100
def is_orange(c): return c and c[0]>200 and c[1]>100

tile_files = sorted(glob.glob(f"{TILES}/tile_*.png"))
tiles = {}
for f in tile_files:
    idx = int(f.split('_')[-1].split('.')[0])
    im = Image.open(f).convert('RGBA')
    a = np.array(im)
    c = dom_color(a)
    if c is None: continue
    if is_road(c):
        shape = f'{int(side_has(a,"top",ROAD_PRED))}{int(side_has(a,"bottom",ROAD_PRED))}{int(side_has(a,"left",ROAD_PRED))}{int(side_has(a,"right",ROAD_PRED))}'
        tiles.setdefault(('road', shape), []).append((idx, im))
    elif is_water(c):
        shape = f'{int(side_has(a,"top",WATER_PRED))}{int(side_has(a,"bottom",WATER_PRED))}{int(side_has(a,"left",WATER_PRED))}{int(side_has(a,"right",WATER_PRED))}'
        tiles.setdefault(('water', shape), []).append((idx, im))
    elif is_building(c):
        tiles.setdefault(('building', ''), []).append((idx, im))
    elif is_grass(c):
        tiles.setdefault(('grass', ''), []).append((idx, im))
    elif is_orange(c):
        tiles.setdefault(('orange', ''), []).append((idx, im))

print("Tile-Kategorien:")
for k, v in tiles.items():
    print(f"  {k}: {len(v)}")

# ============================================================
# 2. Layout: Planmaessiges Strassengitter (kein Zufall!)
# ============================================================
W, H = 104, 64
rng = random.Random(7)

# Starte mit Gras
grid = [['grass']*W for _ in range(H)]

# Strassengitter: Hauptstrassen alle 12 Zellen (horizontal + vertikal)
# Das erzeugt klare, gerade Strassen mit echten Kreuzungen und grosse Haeuser-Bloecke
GRID = 12
for y in range(H):
    for x in range(W):
        if x % GRID == 0 or y % GRID == 0:
            grid[y][x] = 'road'

# Eine zusaetzliche Hauptstrasse versetzt (damit nicht alles symmetrisch ist)
for x in range(W):
    grid[H//2][x] = 'road'
for y in range(H):
    grid[y][W//2] = 'road'

# Gebaeude: alle Grasflaechen in den Bloecken zu Gebaeuden (zuerst!)
for y in range(H):
    for x in range(W):
        if grid[y][x] == 'grass':
            grid[y][x] = 'building'

# Wasser: Seen in den Haeuser-Bloecken (NACH der Gebaeude-Konvertierung,
# damit sie nicht wieder ueberschrieben werden). Schneiden die Strassen NICHT.
# Seeds muessen gueltig sein: by*12+8 < H und bx*12+8 < W (nicht out-of-bounds!)
block_seeds = [(3,3), (2,5), (4,3)]  # (Blockzeile, Blockspalte) in 12er-Einheiten
for (by, bx) in block_seeds:
    y0, x0 = by*12, bx*12
    if y0+8 >= H or x0+8 >= W:  # Sicherheitscheck: Seed ausserhalb ueberspringen
        print(f"  (WARN) Seed ({by},{bx}) ausserhalb des Gitters, uebersprungen")
        continue
    for dy in range(3, 9):
        for dx in range(3, 9):
            yy, xx = y0+dy, x0+dx
            if 0<=yy<H and 0<=xx<W and grid[yy][xx]=='building':
                grid[yy][xx] = 'water'

# Park: Grasflaeche in einem Block (NACH der Konvertierung: building -> grass)
# In einem echten Block zentriert (nicht auf den zentralen Strassen!)
# Block (1,1): y=13-23, x=13-23 -> Park zentriert dort (kein Schnitt mit Strassen y=32/x=52)
py0, px0 = 1*12, 1*12
for y in range(py0+3, py0+9):
    for x in range(px0+3, px0+9):
        if 0<=y<H and 0<=x<W and grid[y][x]=='building':
            grid[y][x] = 'grass'

# Orange Deko auf Strassen (Plaetze, Markierungen)
for y in range(0, H, GRID):
    for x in range(0, W, GRID):
        if grid[y][x] == 'road':
            grid[y][x] = 'orange'

# ============================================================
# 3. Autotile-Rendering
# ============================================================
def pick(cat, shape=''):
    key = (cat, shape)
    if key in tiles and tiles[key]:
        return rng.choice(tiles[key])[1]
    for (c, s), lst in tiles.items():
        if c == cat and lst:
            return rng.choice(lst)[1]
    return None

ts = 8
canvas = Image.new('RGBA', (W*ts, H*ts), (0,0,0,0))

def neighbors(x, y):
    return {'top': grid[y-1][x] if y>0 else 'edge',
            'bottom': grid[y+1][x] if y<H-1 else 'edge',
            'left': grid[y][x-1] if x>0 else 'edge',
            'right': grid[y][x+1] if x<W-1 else 'edge'}

for y in range(H):
    for x in range(W):
        cat = grid[y][x]
        if cat == 'road':
            n = neighbors(x, y)
            shape = f'{int(n["top"]=="road")}{int(n["bottom"]=="road")}{int(n["left"]=="road")}{int(n["right"]=="road")}'
            t = pick('road', shape) or pick('road', '1111')
        elif cat == 'water':
            n = neighbors(x, y)
            shape = f'{int(n["top"]=="water")}{int(n["bottom"]=="water")}{int(n["left"]=="water")}{int(n["right"]=="water")}'
            t = pick('water', shape) or pick('water', '1111')
        else:
            t = pick(cat)
        if t:
            canvas.paste(t, (x*ts, y*ts), t)

canvas.save(OUT)
print(f"\nGespeichert: {OUT} ({canvas.size})")
from collections import Counter as C
print("Layout:", dict(C(c for row in grid for c in row)))
