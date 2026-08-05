#!/usr/bin/env python3
"""Terrain-Übersicht: Alle 69 Tiles nach Kategorie anzeigen."""
from PIL import Image, ImageDraw
import os
TS=32
TERRAIN="/opt/data/DC-Minigame/assets/custom-tiles-32/terrain"
files=sorted(os.listdir(TERRAIN))
# Gruppe nach Präfix
groups={}
for f in files:
    if not f.endswith(".png"): continue
    pre=f.split("_")[0]+"_"+f.split("_")[1] if len(f.split("_"))>1 else f.split("_")[0]
    groups.setdefault(pre,[]).append(f[:-4])

COLS=8
for gname, names in groups.items():
    rows=(len(names)+COLS-1)//COLS
    CELL=TS+6
    W=COLS*CELL+6; H=rows*CELL+6
    sheet=Image.new("RGBA",(W,H),(40,45,52))
    dr=ImageDraw.Draw(sheet)
    for idx,n in enumerate(names):
        r=idx//COLS; c=idx%COLS
        img=Image.open(f"{TERRAIN}/{n}.png").convert("RGBA").resize((TS*2,TS*2),Image.NEAREST)
        sheet.paste(img,(c*CELL+3,r*CELL+3),img)
        dr.text((c*CELL+3,r*CELL+CELL-12),n.split("_")[-1],fill=(255,255,255))
    sheet=sheet.resize((W*2,H*2),Image.NEAREST)
    sheet.save(f"/opt/data/terrain_{gname}.png")
    print(f"{gname}: {len(names)} Tiles -> terrain_{gname}.png")
