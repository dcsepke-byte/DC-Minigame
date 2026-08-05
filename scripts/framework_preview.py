#!/usr/bin/env python3
"""Konsistenz-Test: alle generierten Tiles in einer Übersicht, nach Kategorie."""
from PIL import Image
import os
TS=32
OUT="/opt/data/DC-Minigame/assets/custom-tiles-32"
cats = ["ground","trees","plants","buildings","mountains"]
# Grid pro Kategorie anordnen
tiles=[]
for cat in cats:
    d=os.path.join(OUT,cat)
    if not os.path.isdir(d): continue
    for f in sorted(os.listdir(d)):
        if f.endswith(".png"): tiles.append((cat, f))

COLS=8
rows=(len(tiles)+COLS-1)//COLS
CELL=TS+8
W=COLS*CELL+8; H=rows*CELL+8
sheet=Image.new("RGBA",(W,H),(45,50,58))
d=ImageDraw=Image.new("RGBA",(W,H),(0,0,0,0))
from PIL import ImageDraw as ID
dr=ID.Draw(sheet)
for idx,(cat,f) in enumerate(tiles):
    r=idx//COLS; c=idx%COLS
    img=Image.open(os.path.join(OUT,cat,f)).convert("RGBA").resize((TS*2,TS*2),Image.NEAREST)
    sheet.paste(img,(c*CELL+4,r*CELL+4),img)
    name=f[:-4]
    dr.text((c*CELL+4,r*CELL+CELL-14),name,fill=(255,255,255))
sheet=sheet.resize((W*2,H*2),Image.NEAREST)
sheet.save("/opt/data/framework_sheet.png")
print("Sheet:",sheet.size,"Tiles:",len(tiles))
# Zusammengesetztes Beispiel: Mini-Welt
W2,H2=10,6
world=Image.new("RGBA",(W2*TS,H2*TS),(104,168,84))
def t(cat,name):
    p=os.path.join(OUT,cat,name)
    return Image.open(p).convert("RGBA") if os.path.exists(p) else None
# Gras
for y in range(H2):
    for x in range(W2):
        g=t("ground","Grass_%02d"%(x%3))
        if g: world.paste(g,(x*TS,y*TS))
# Weg horizontal
for x in range(W2):
    w=t("ground","Road_00_Mid")
    if w: world.paste(w,(x*TS,3*TS))
# Großes Haus
for q,ox,oy in [("TL",0,0),("TR",TS,0),("BL",0,TS),("BR",TS,TS)]:
    h=t("buildings",f"Building_01_Red_{q}")
    if h: world.paste(h,(1*TS+ox,1*TS+oy),h)
# Großer Baum
for q,ox,oy in [("TL",0,0),("TR",TS,0),("BL",0,TS),("BR",TS,TS)]:
    h=t("trees",f"Tree_02_Big_Green_{q}")
    if h: world.paste(h,(7*TS+ox,1*TS+oy),h)
# Berg
for q,ox,oy in [("TL",0,0),("TR",TS,0),("BL",0,TS),("BR",TS,TS)]:
    h=t("mountains",f"Mountain_01_{q}")
    if h: world.paste(h,(8*TS+ox,4*TS+oy),h)
world=world.resize((W2*TS*3,H2*TS*3),Image.NEAREST)
world.save("/opt/data/framework_world.png")
print("World-Beispiel:",world.size)
