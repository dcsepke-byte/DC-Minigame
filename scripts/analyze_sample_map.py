#!/usr/bin/env python3
"""Analysiert die offizielle Kenney Pico-8 Beispielkarte (sample-map.tmx),
visualisiert die Struktur als Kategorien-ASCII-Map, um das Muster zu verstehen."""
import re
from collections import Counter
from PIL import Image
import numpy as np

TILESHEET = "assets/kenney-pico8-city/Tilemap/tilemap.png"
sheet = Image.open(TILESHEET).convert('RGBA')
sarr = np.array(sheet)
TILE=8; SPACING=1; COLUMNS=24; FIRSTGID=1

def gid_img(gid):
    if gid<=0: return None
    idx=gid-FIRSTGID
    sx=idx%COLUMNS; sy=idx//COLUMNS
    x=sx*(TILE+SPACING); y=sy*(TILE+SPACING)
    if x+TILE>sheet.size[0] or y+TILE>sheet.size[1]: return None
    return sarr[y:y+TILE, x:x+TILE]

def classify(a):
    if a is None: return '.'
    opaque=a[...,3]>0
    if opaque.sum()<3: return '.'
    px=a[opaque][:,:3]
    col=Counter(map(tuple,px.tolist())).most_common(1)[0][0]
    r,g,b=col
    if b>150 and r<100: return 'W'   # Wasser blau
    if r>100 and g>100 and b>100 and r<150: return 'S'  # Strasse lila
    if r>80 and g>80 and b<100: return 'B'  # Gebaeude
    if g>100 and r<100: return 'G'   # Gras
    if r>200 and g>100: return 'O'   # Orange/Deko
    if r>150 and g<120 and b<120: return 'R'  # rot/braun Dach
    return '?'

tmx=open("assets/kenney-pico8-city/Tiled/sample-map.tmx").read()
mw=int(re.search(r'width="(\d+)"',tmx).group(1))
mh=int(re.search(r'height="(\d+)"',tmx).group(1))
layers=re.findall(r'<layer.*?name="([^"]+)".*?<data encoding="csv">\s*(.*?)\s*</data>',tmx,re.S)

for name,csv in layers:
    nums=[int(x) for x in csv.replace('\r','').replace('\n',',').replace(' ',',').split(',') if x.strip()!='']
    print(f"\n=== Layer: {name} ({mw}x{mh}) ===")
    for y in range(mh):
        line=''
        for x in range(mw):
            gid=nums[y*mw+x]&0x0FFFFFFF
            line+=classify(gid_img(gid))
        print(line)
