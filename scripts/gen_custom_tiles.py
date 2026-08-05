#!/usr/bin/env python3
"""Party-Arena Tileset 32x32 + Multi-Tile-Objekte (große Objekte über mehrere Tiles).
Große Objekte (Häuser, Bäume) werden als Zusammensetzung mehrerer 32x32-Tiles dargestellt."""
from PIL import Image, ImageDraw
import os, random

TS = 32  # Tile-Größe 32x32
OUT = "/opt/data/DC-Minigame/assets/custom-tiles-32"
os.makedirs(OUT, exist_ok=True)

def new_tile():
    return Image.new("RGBA", (TS, TS), (0, 0, 0, 0))

def save(img, name):
    img.save(f"{OUT}/{name}.png")

def rect(img, x0, y0, x1, y1, c):
    ImageDraw.Draw(img).rectangle([x0, y0, x1, y1], fill=c)

def noise(img, base, count=30, spread=10):
    rnd = random.Random(hash(base) & 0xffff)
    d = ImageDraw.Draw(img)
    r,g,b = base
    for _ in range(count):
        x = rnd.randrange(TS); y = rnd.randrange(TS)
        dr = rnd.randrange(-spread, spread)
        d.point((x,y), fill=(max(0,min(255,r+dr)),max(0,min(255,g+dr)),max(0,min(255,b+dr))))

# ---------- GRAS (32x32) ----------
def make_grass(base, flowers=0, flower_color=None):
    img = new_tile()
    rect(img, 0, 0, TS-1, TS-1, base)
    rnd = random.Random(hash((base, flowers)) & 0xffff)
    d = ImageDraw.Draw(img)
    for _ in range(10):  # Variation
        x = rnd.randrange(0, TS-4); y = rnd.randrange(0, TS-4)
        dr = rnd.randrange(-12, 12)
        c = (max(0,min(255,base[0]+dr)),max(0,min(255,base[1]+dr)),max(0,min(255,base[2]+dr)))
        d.rectangle([x,y,x+3,y+3], fill=c)
    for _ in range(flowers):
        x = rnd.randrange(2, TS-2); y = rnd.randrange(2, TS-2)
        for dx,dy in [(0,0),(1,0),(-1,0),(0,1),(0,-1)]:
            d.point((x+dx,y+dy), fill=flower_color)
        d.point((x,y), fill=(255,255,210))
    return img

save(make_grass((104,168,84)), "grass0")
save(make_grass((104,168,84), flowers=4, flower_color=(140,220,110)), "grass1")
save(make_grass((104,168,84), flowers=4, flower_color=(245,220,100)), "grass2")

# ---------- WEG (32x32) ----------
ROAD = (208,178,132); GRASS = (104,168,84)
def make_road(edge=None):
    img = new_tile()
    if edge:
        rect(img, 0, 0, TS-1, TS-1, GRASS)
        d = ImageDraw.Draw(img)
        if edge=="top":    rect(img, 0, 6, TS-1, TS-1, ROAD)
        if edge=="bottom": rect(img, 0, 0, TS-1, TS-1, ROAD)
        if edge=="left":   rect(img, 6, 0, TS-1, TS-1, ROAD)
        if edge=="right":  rect(img, 0, 0, TS-1, TS-1, ROAD)
    else:
        rect(img, 0, 0, TS-1, TS-1, ROAD)
    noise(img, ROAD, count=25, spread=16)
    return img
for e in ["top","bottom","left","right"]: save(make_road(e), f"road_{e}")
save(make_road(), "road_mid")

# Wegecke
def road_corner(kind):
    img = new_tile()
    rect(img, 0, 0, TS-1, TS-1, GRASS)
    d = ImageDraw.Draw(img)
    rnd = random.Random(hash(kind) & 0xffff)
    for _ in range(8):
        x=rnd.randrange(TS); y=rnd.randrange(TS); dr=rnd.randrange(-10,10)
        d.point((x,y), fill=(max(0,min(255,GRASS[0]+dr)),max(0,min(255,GRASS[1]+dr)),max(0,min(255,GRASS[2]+dr))))
    if kind=="tl": d.polygon([(4,0),(31,0),(31,31),(0,31),(0,4)], fill=ROAD)
    if kind=="tr": d.polygon([(0,0),(27,0),(31,4),(31,31),(0,31)], fill=ROAD)
    if kind=="bl": d.polygon([(0,0),(31,0),(31,31),(27,31),(0,27)], fill=ROAD)
    if kind=="br": d.polygon([(0,0),(31,0),(31,31),(0,31)], fill=ROAD)
    return img
for k in ["tl","tr","bl","br"]: save(road_corner(k), f"road_corner_{k}")

# ---------- EINZEL-TILE BAUM (1x1, klein) ----------
def make_tree_small(crown, trunk=(120,82,48)):
    img = new_tile()
    d = ImageDraw.Draw(img)
    d.ellipse([9, 10, 23, 24], fill=crown)
    d.ellipse([13, 14, 18, 19], fill=(min(255,crown[0]+30),min(255,crown[1]+25),min(255,crown[2]+20)))
    d.rectangle([14, 23, 18, 30], fill=trunk)
    return img
save(make_tree_small((72,156,60)), "tree_small_green")
save(make_tree_small((240,196,80)), "tree_small_yellow")

# ---------- MULTI-TILE GROSSER BAUM (2x2) ----------
# Jeder der 4 Tiles = ein Viertel des großen Baums
def tree_quad(crown, trunk, quad):
    img = new_tile()
    d = ImageDraw.Draw(img)
    if quad == "tl":
        # Krone oben-links
        d.ellipse([2, 2, 30, 30], fill=(crown[0]-25,crown[1]-25,crown[2]-25))
        d.ellipse([2, 2, 30, 30], fill=crown)
        d.ellipse([6, 6, 16, 16], fill=(min(255,crown[0]+40),min(255,crown[1]+35),min(255,crown[2]+30)))
    if quad == "tr":
        d.ellipse([2, 2, 30, 30], fill=(crown[0]-25,crown[1]-25,crown[2]-25))
        d.ellipse([2, 2, 30, 30], fill=crown)
        d.ellipse([16, 6, 28, 16], fill=(min(255,crown[0]+25),min(255,crown[1]+20),min(255,crown[2]+15)))
    if quad == "bl":
        # untere Krone + Stamm
        d.ellipse([2, 2, 30, 30], fill=(crown[0]-25,crown[1]-25,crown[2]-25))
        d.ellipse([2, 2, 30, 30], fill=crown)
        # Stamm ragt in untere Mitte
        d.rectangle([14, 14, 18, 31], fill=trunk)
    if quad == "br":
        d.ellipse([2, 2, 30, 30], fill=(crown[0]-25,crown[1]-25,crown[2]-25))
        d.ellipse([2, 2, 30, 30], fill=crown)
        d.rectangle([18, 14, 20, 31], fill=(trunk[0]-15,trunk[1]-15,trunk[2]-12))
    return img
crown_g=(72,156,60)
for q in ["tl","tr","bl","br"]: save(tree_quad(crown_g,(120,82,48),q), f"tree_big_green_{q}")
crown_y=(240,196,80)
for q in ["tl","tr","bl","br"]: save(tree_quad(crown_y,(120,82,48),q), f"tree_big_yellow_{q}")

# ---------- MULTI-TILE GROSSES HAUS (2x2) ----------
def house_quad(roof, wall, quad):
    img = new_tile()
    d = ImageDraw.Draw(img)
    if quad == "tl":
        # Dach oben-links (linke Hälfte des Spitzdachs)
        d.polygon([(0,16),(16,2),(32,16)], fill=(roof[0]-30,roof[1]-30,roof[2]-30))
        d.polygon([(0,16),(16,2),(32,16)], fill=roof)
        d.polygon([(0,16),(16,2),(16,16)], fill=(roof[0]-20,roof[1]-20,roof[2]-20))  # Schattenseite
        d.rectangle([0,16,32,31], fill=wall)  # Fassade oben
        d.rectangle([0,16,32,31], outline=(170,170,170))
    if quad == "tr":
        # Dach oben-rechts
        d.polygon([(0,16),(16,2),(32,16)], fill=(roof[0]-30,roof[1]-30,roof[2]-30))
        d.polygon([(0,16),(16,2),(32,16)], fill=roof)
        d.rectangle([0,16,32,31], fill=wall)
        d.rectangle([0,16,32,31], outline=(170,170,170))
        # Fenster rechts
        d.rectangle([8,20,20,30], fill=(150,205,240))
        d.line([(14,20),(14,30)], fill=(100,100,100)); d.line([(8,25),(20,25)], fill=(100,100,100))
    if quad == "bl":
        # Fassade unten-links + Tür
        d.rectangle([0,0,32,31], fill=wall)
        d.rectangle([0,0,32,31], outline=(170,170,170))
        d.rectangle([8,6,22,31], fill=(120,74,44))  # Tür
        d.rectangle([8,6,22,31], outline=(90,60,30))
        d.point((20,20), fill=(255,240,180))  # Knauf
        # Fenster links oben
        d.rectangle([2,2,6,6], fill=(150,205,240))
    if quad == "br":
        # Fassade unten-rechts
        d.rectangle([0,0,32,31], fill=wall)
        d.rectangle([0,0,32,31], outline=(170,170,170))
        d.rectangle([24,14,31,31], fill=(150,205,240))  # Fenster rechts
        d.line([(27,14),(27,31)], fill=(100,100,100))
    return img
for q in ["tl","tr","bl","br"]: save(house_quad((205,92,92),(238,238,238),q), f"house_red_{q}")
for q in ["tl","tr","bl","br"]: save(house_quad((92,130,205),(238,238,238),q), f"house_blue_{q}")

# ---------- WASSER (32x32) ----------
def make_water():
    img = new_tile()
    rect(img, 0, 0, TS-1, TS-1, (90,180,220))
    noise(img, (90,180,220), count=30, spread=14)
    d = ImageDraw.Draw(img)
    d.arc([4,12,20,24], 180, 360, fill=(165,225,245), width=2)
    d.arc([18,18,30,28], 180, 360, fill=(165,225,245), width=1)
    return img
save(make_water(), "water")

# ---------- BLUME (Deko) ----------
def make_flower(color):
    img = new_tile()
    d = ImageDraw.Draw(img)
    d.ellipse([12,12,19,19], fill=color)  # 5-blättrig
    d.ellipse([9,9,16,16], fill=color)
    d.ellipse([15,9,22,16], fill=color)
    d.ellipse([9,15,16,22], fill=color)
    d.ellipse([15,15,22,22], fill=color)
    d.ellipse([13,13,18,18], fill=(255,255,210))
    d.line([(15,21),(15,29)], fill=(70,140,60), width=1)
    return img
save(make_flower((255,80,120)), "flower_red")
save(make_flower((255,220,80)), "flower_yellow")

# ---------- BERG (2x2 Multi-Tile) ----------
def mountain_quad(quad):
    img = new_tile()
    d = ImageDraw.Draw(img)
    if quad == "tl":
        d.polygon([(0,31),(16,2),(32,31)], fill=(120,120,125))
        d.polygon([(0,31),(16,2),(32,16)], fill=(100,100,105))
        d.polygon([(12,6),(20,16),(16,18)], fill=(200,200,200))  # Schnee
    if quad == "tr":
        d.polygon([(0,31),(16,2),(32,31)], fill=(120,120,125))
        d.polygon([(12,6),(20,16),(16,18)], fill=(200,200,200))
    if quad == "bl":
        d.rectangle([0,0,31,31], fill=(110,110,115))
    if quad == "br":
        d.rectangle([0,0,31,31], fill=(110,110,115))
        d.rectangle([24,24,31,31], fill=(80,80,85))
    return img
for q in ["tl","tr","bl","br"]: save(mountain_quad(q), f"mountain_{q}")

print(f"32x32 Tileset + Multi-Tile-Objekte generiert ({len(os.listdir(OUT))} Dateien):")
for f in sorted(os.listdir(OUT)): print(" ", f)
