#!/usr/bin/env python3
"""Extrahiert sauberen Serpentinen-Pfad durch die Strassen und legt
160 Hauptpfad-Felder + 8 lokale Side-Path-Abstecher darauf."""
from PIL import Image
import numpy as np, json

TILE = 8
city = Image.open("assets/kenney-pico8-city/aethonia_city_4x.png").convert("RGB")
a = np.array(city)
H, W = a.shape[:2]
TW, TH = W//TILE, H//TILE

def cell_is_road(tx, ty):
    x0, y0 = tx*TILE, ty*TILE
    block = a[y0:y0+TILE, x0:x0+TILE]
    r, g, b = block[...,0], block[...,1], block[...,2]
    return ((r>100)&(r<150)&(g>100)&(g<150)&(b>100)&(b<160)).mean() > 0.3

road_cells = set((tx,ty) for ty in range(TH) for tx in range(TW) if cell_is_road(tx,ty))
print(f"Road-Cells: {len(road_cells)}")

# Durchgehende horizontale Strassenzeilen (y) und vertikale Spalten (x)
horiz_y = [y for y in range(TH) if sum(1 for x in range(TW) if (x,y) in road_cells) > TW*0.4]
vert_x = [x for x in range(TW) if sum(1 for y in range(TH) if (x,y) in road_cells) > TH*0.4]
print("horiz_y:", horiz_y)
print("vert_x:", vert_x)

# Baue geordneten Serpentinen-Pfad: fahre jede horizontale Zeile ab,
# wechsle Richtung, verbinde vertikal an der letzten Spalte.
path = []
for zi, y in enumerate(horiz_y):
    xs = sorted(vert_x)
    if zi % 2 == 1:
        xs = xs[::-1]
    xmin, xmax = min(vert_x), max(vert_x)
    for x in range(xmin, xmax+1):
        if (x,y) in road_cells:
            path.append((x,y))
    if zi < len(horiz_y)-1:
        cx = xs[-1]
        ny = horiz_y[zi+1]
        step = 1 if ny>y else -1
        for yy in range(y, ny+step, step):
            if (cx,yy) in road_cells and (cx,yy) not in path:
                path.append((cx,yy))
print(f"Serpentinen-Pfad: {len(path)} Punkte")
# Adjazenz pruefen
gaps = sum(1 for i in range(1,len(path)) if abs(path[i][0]-path[i-1][0])+abs(path[i][1]-path[i-1][1])!=1)
print(f"Nicht-Nachbar-Spruenge: {gaps}")

# 160 Hauptpfad-Felder gleichmaessig aus geordnetem Pfad
n = len(path)
main = [path[int(i*n/160)] for i in range(160)]
# Adjazenz der main (visuell verbunden durch Linien - ok wenn auf Strassen)
main_on_road = sum(1 for p in main if p in road_cells)
print(f"main auf Strassen: {main_on_road}/160")

# 8 Side-Paths als LOKALE Abstecher: nahe jedem Branch-Abzweigpunkt
# Die Side-Path-Zellen muessen benachbart sein (keine Sprünge).
branch_main_idx = [10,30,50,70,90,110,130,150]
side = []
for midx in branch_main_idx:
    mp = main[midx]
    # Sammle die zusammenhangende Strassen-Komponente in der Naehe des
    # Abzweigpunkts (BFS, Radius ~12 Zellen) aber NICHT den Hauptpfad selbst.
    # Baue einen kleinen lokalen Abstecher aus benachbarten Road-Zellen.
    from collections import deque
    # Naechste vertikale Linie (Nebenstrasse) finden
    best_v=None; best_d=999
    for vx in vert_x:
        if abs(vx-mp[0]) < best_d:
            near=[p for p in path if p[0]==vx and abs(p[1]-mp[1])<8]
            if near:
                best_v=vx; best_d=abs(vx-mp[0])
    vx = best_v if best_v is not None else mp[0]
    # Alle Road-Zellen auf dieser Spalte, sortiert nach Distanz zu mp[1]
    col = sorted([p for p in path if p[0]==vx], key=lambda p: abs(p[1]-mp[1]))
    if not col:
        side.append([mp]*10); continue
    start_i = min(range(len(col)), key=lambda i: abs(col[i][1]-mp[1]))
    # Nimm 10 aufeinanderfolgende von der Mitte weg (nach unten, dann oben)
    seg = []
    # erst nach unten (groessere y)
    down = col[start_i:]
    up = col[:start_i+1][::-1]
    for p in down[1:]:
        if len(seg)<10: seg.append(p)
    for p in up:
        if len(seg)<10: seg.append(p)
    # Sicherstellen: nur benachbarte Zellen
    # Sortiere seg nach y fuer saubere Linie
    seg_sorted = sorted(set(seg), key=lambda p: p[1])[:10]
    side.append(seg_sorted)

out = 'window.BOARD_PATH = {\n'
out += '  main: ' + json.dumps(main) + ',\n'
out += '  side: ' + json.dumps(side) + ',\n'
out += '  path: ' + json.dumps(path) + '\n'
out += '};\n'
open('js/board-path-data.js','w').write(out)
print("board-path-data.js geschrieben")
print("main:", len(main), ", side:", [len(s) for s in side])
# Side-Adjazenz
for i,s in enumerate(side):
    g = sum(1 for j in range(1,len(s)) if abs(s[j][0]-s[j-1][0])+abs(s[j][1]-s[j-1][1])!=1)
    print(f"  side[{i}] Spruenge: {g}")
