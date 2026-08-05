#!/usr/bin/env python3
"""Autotile-Netz-Test: Zeigt, dass die Wege-Kanten nahtlos zusammenpassen."""
from PIL import Image
import os
TS=32
TERRAIN="/opt/data/DC-Minigame/assets/custom-tiles-32/terrain"
def t(name):
    p=f"{TERRAIN}/{name}.png"
    return Image.open(p).convert("RGBA") if os.path.exists(p) else None

# Ein Weg-Netz bauen: Kreuzung + Kurven + T
def build_road_demo(prefix):
    W,H=9,7
    world=Image.new("RGBA",(W*TS,H*TS),(104,168,84))
    # Gras füllen
    for y in range(H):
        for x in range(W):
            g=t(f"Grass_{x%5:02d}" if False else f"Grass_0{(x%3)}")
            if g: world.paste(g,(x*TS,y*TS))
    def put(x,y,mask):
        name=f"{prefix}_{mask}"
        names={0:"Single",1:"End_N",2:"End_E",3:"Corner_NE",4:"End_S",5:"Straight_NS",6:"Corner_ES",7:"TJunction_ENS",8:"End_W",9:"Corner_WN",10:"Straight_EW",11:"TJunction_EWN",12:"Corner_SW",13:"TJunction_NSW",14:"TJunction_EWS",15:"Cross"}
        img=t(f"{prefix}_{names[mask]}")
        if img: world.paste(img,(x*TS,y*TS),img)
    # Horizontale Straße (y=3)
    for x in range(W):
        mask=10  # EW
        if x==0: mask=8   # End_W
        if x==W-1: mask=2 # End_E
        put(x,3,mask)
    # Vertikale Straße (x=4) durch die Mitte -> Kreuzung
    for y in range(H):
        mask=5  # NS
        if y==0: mask=1
        if y==H-1: mask=4
        if y==3: mask=15  # Kreuzung
        put(4,y,mask)
    # Kurzer Abzweig oben links -> T
    put(2,1,3)  # Corner_NE
    put(3,1,10) # EW
    put(4,1,7)  # TJunction_ENS
    return world

for prefix in ["Road_Erd","Road_Kies","Road_Pflaster"]:
    world=build_road_demo(prefix)
    world=world.resize((world.width*3,world.height*3),Image.NEAREST)
    world.save(f"/opt/data/road_net_{prefix}.png")
    print(f"road_net_{prefix}.png")
