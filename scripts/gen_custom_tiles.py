#!/usr/bin/env python3
"""Eigenes Party-Arena Tileset generieren (Pixel-Art 64x64, einheitlicher Cartoon-Stil)."""
from PIL import Image, ImageDraw
import os, random

TS = 64  # Tile-Größe 64x64
OUT = "/opt/data/DC-Minigame/assets/custom-tiles-64"
os.makedirs(OUT, exist_ok=True)

def new_tile():
    return Image.new("RGBA", (TS, TS), (0, 0, 0, 0))

def save(img, name):
    img.save(f"{OUT}/{name}.png")

def rect(img, x0, y0, x1, y1, c):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=c)

def noise_fill(img, base, count=60, spread=14):
    """Textur: zufällige hellere/dunklere Pixel."""
    rnd = random.Random(hash(base) & 0xffff)
    d = ImageDraw.Draw(img)
    r, g, b = base
    for _ in range(count):
        x = rnd.randrange(TS); y = rnd.randrange(TS)
        dr = rnd.randrange(-spread, spread)
        px(d, x, y, (max(0,min(255,r+dr)), max(0,min(255,g+dr)), max(0,min(255,b+dr))))

def px(d, x, y, c):
    if 0 <= x < TS and 0 <= y < TS:
        d.point((x, y), fill=c)

def rnd_rects(img, base, n=8, spread=10, s=6):
    """Zufällige Flecken (Gras-Variation)."""
    rnd = random.Random(hash((base, n)) & 0xffff)
    d = ImageDraw.Draw(img)
    r, g, b = base
    for _ in range(n):
        x = rnd.randrange(0, TS-s); y = rnd.randrange(0, TS-s)
        dr = rnd.randrange(-spread, spread)
        c = (max(0,min(255,r+dr)), max(0,min(255,g+dr)), max(0,min(255,b+dr)))
        d.rectangle([x, y, x+s, y+s], fill=c)

# ---------- GRAS (64x64) ----------
def make_grass(base, flowers=None, flower_color=None):
    img = new_tile()
    rect(img, 0, 0, TS-1, TS-1, base)
    rnd_rects(img, base, n=14, spread=12, s=8)
    noise_fill(img, base, count=70, spread=10)
    if flowers:
        d = ImageDraw.Draw(img)
        rnd = random.Random(hash((base, flower_color)) & 0xffff)
        for _ in range(flowers):
            x = rnd.randrange(3, TS-3); y = rnd.randrange(3, TS-3)
            # Blüte (4 Pixel Kreuz + Mitte)
            for dx,dy in [(0,0),(1,0),(-1,0),(0,1),(0,-1)]:
                d.point((x+dx,y+dy), fill=flower_color)
            d.point((x,y), fill=(255,255,200))
    return img

grass0 = make_grass((104, 168, 84))                     # Basis-Gras
grass1 = make_grass((104, 168, 84), flowers=8, flower_color=(140, 220, 110))  # grüne Blumen
grass2 = make_grass((104, 168, 84), flowers=8, flower_color=(245, 220, 100))  # gelbe Blumen
save(grass0, "grass0"); save(grass1, "grass1"); save(grass2, "grass2")

# ---------- WEG (64x64) ----------
ROAD_C = (208, 178, 132)   # Weg-Farbe
GRASS_C = (104, 168, 84)

def make_road(full=True, edge=None):
    img = new_tile()
    if edge:
        rect(img, 0, 0, TS-1, TS-1, GRASS_C)
        rnd_rects(img, GRASS_C, n=12, spread=10, s=8)
        if edge == "top":    rect(img, 0, 8, TS-1, TS-1, ROAD_C)
        if edge == "bottom": rect(img, 0, 0, TS-1, TS-1, ROAD_C)
        if edge == "left":   rect(img, 8, 0, TS-1, TS-1, ROAD_C)
        if edge == "right":  rect(img, 0, 0, TS-1, TS-1, ROAD_C)
    else:
        rect(img, 0, 0, TS-1, TS-1, ROAD_C)
    noise_fill(img, ROAD_C, count=80, spread=18)
    # feine Körnung
    d = ImageDraw.Draw(img)
    rnd = random.Random(hash(ROAD_C) & 0xffff)
    for _ in range(30):
        x = rnd.randrange(TS); y = rnd.randrange(TS)
        g = rnd.randrange(-20, 20)
        d.point((x,y), fill=(max(0,min(255,ROAD_C[0]+g)), max(0,min(255,ROAD_C[1]+g)), max(0,min(255,ROAD_C[2]+g))))
    return img

save(make_road(edge="top"), "road_top")
save(make_road(edge="bottom"), "road_bottom")
save(make_road(edge="left"), "road_left")
save(make_road(edge="right"), "road_right")
save(make_road(), "road_mid")

# Wegecke
def road_corner(kind):
    img = new_tile()
    rect(img, 0, 0, TS-1, TS-1, GRASS_C)
    rnd_rects(img, GRASS_C, n=12, spread=10, s=8)
    d = ImageDraw.Draw(img)
    # Fülle mit Weg, lasse die Ecke als Gras
    if kind == "tl":
        d.polygon([(8,0),(TS-1,0),(TS-1,TS-1),(0,TS-1),(0,8)], fill=ROAD_C)
    if kind == "tr":
        d.polygon([(0,0),(TS-9,0),(TS-1,8),(TS-1,TS-1),(0,TS-1)], fill=ROAD_C)
    if kind == "bl":
        d.polygon([(0,0),(TS-1,0),(TS-1,TS-1),(TS-9,TS-1),(0,TS-9)], fill=ROAD_C)
    if kind == "br":
        d.polygon([(0,0),(TS-1,0),(TS-1,TS-1),(0,TS-1)], fill=ROAD_C)
        d.polygon([(0,TS-9),(TS-9,TS-1),(0,TS-1)], fill=GRASS_C)
    return img
save(road_corner("tl"), "road_corner_tl")
save(road_corner("tr"), "road_corner_tr")
save(road_corner("bl"), "road_corner_bl")
save(road_corner("br"), "road_corner_br")

# ---------- BAUM (64x64, groß) ----------
def make_tree(crown, trunk=(120, 82, 48), small=False):
    img = new_tile()
    d = ImageDraw.Draw(img)
    if small:
        # kleine Krone
        d.ellipse([18, 22, 45, 44], fill=crown)
        d.ellipse([24, 28, 35, 36], fill=(min(255,crown[0]+30), min(255,crown[1]+25), min(255,crown[2]+20)))
        d.rectangle([27, 44, 36, 58], fill=trunk)
    else:
        # große Krone mit Schatten + Highlight
        d.ellipse([8, 6, 55, 48], fill=(crown[0]-25, crown[1]-25, crown[2]-25))  # Schatten
        d.ellipse([6, 4, 54, 46], fill=crown)
        d.ellipse([16, 12, 32, 26], fill=(min(255,crown[0]+40), min(255,crown[1]+35), min(255,crown[2]+30)))
        d.rectangle([28, 44, 35, 60], fill=trunk)
        d.rectangle([30, 44, 33, 60], fill=(trunk[0]+20, trunk[1]+20, trunk[2]+15))
        # Wurzeln
        d.rectangle([24, 58, 28, 61], fill=trunk)
        d.rectangle([35, 58, 39, 61], fill=trunk)
    return img
save(make_tree((72, 156, 60)), "tree_green")
save(make_tree((240, 196, 80)), "tree_yellow")
save(make_tree((72, 156, 60), small=True), "tree_small_green")
save(make_tree((240, 196, 80), small=True), "tree_small_yellow")

# ---------- HAUS (64x64) ----------
def make_house(roof, wall=(238, 238, 238), door=(120, 74, 44), window=(150, 205, 240)):
    img = new_tile()
    d = ImageDraw.Draw(img)
    # Dach (großes Spitzdreieck mit Überstand + Schatten)
    d.polygon([(4, 32), (32, 8), (60, 32)], fill=(roof[0]-30, roof[1]-30, roof[2]-30))
    d.polygon([(4, 32), (32, 8), (60, 32)], fill=roof)
    # Dachbalken
    d.line([(32,8),(32,32)], fill=(roof[0]-45, roof[1]-45, roof[2]-45), width=2)
    # Fassade
    d.rectangle([10, 32, 54, 62], fill=wall)
    d.rectangle([10, 32, 54, 62], outline=(180,180,180))
    # Fenster (2)
    d.rectangle([16, 38, 26, 48], fill=window)
    d.rectangle([38, 38, 48, 48], fill=window)
    d.line([(21,38),(21,48)], fill=(100,100,100)); d.line([(16,43),(26,43)], fill=(100,100,100))
    d.line([(43,38),(43,48)], fill=(100,100,100)); d.line([(38,43),(48,43)], fill=(100,100,100))
    # Tür
    d.rectangle([29, 50, 40, 62], fill=door)
    d.rectangle([29, 50, 40, 62], outline=(90,60,30))
    d.point((37, 56), fill=(255,240,180))  # Türknauf
    # Schornstein
    d.rectangle([12, 16, 20, 26], fill=(150,150,150))
    d.rectangle([11, 13, 21, 16], fill=(120,120,120))
    return img
save(make_house((205, 92, 92)), "house_red")
save(make_house((92, 130, 205)), "house_blue")

# ---------- WASSER (64x64) ----------
def make_water():
    img = new_tile()
    rect(img, 0, 0, TS-1, TS-1, (90, 180, 220))
    rnd_rects(img, (90,180,220), n=16, spread=14, s=10)
    noise_fill(img, (90,180,220), count=80, spread=14)
    d = ImageDraw.Draw(img)
    # Wellen
    for i, (x,y) in enumerate([(8,24),(24,44),(40,20),(52,52)]):
        d.arc([x, y, x+20, y+12], 180, 360, fill=(165, 225, 245), width=2)
    return img
save(make_water(), "water")

# ---------- BLUME (Deko) ----------
def make_flower(color):
    img = new_tile()
    d = ImageDraw.Draw(img)
    # 5 Blütenblätter + Mitte
    cx, cy = 32, 32
    for dx, dy in [(0,-6),(5,-2),(3,5),(-3,5),(-5,-2)]:
        d.ellipse([cx+dx-3, cy+dy-3, cx+dx+3, cy+dy+3], fill=color)
    d.ellipse([cx-2, cy-2, cx+2, cy+2], fill=(255,255,200))
    # Stängel
    d.line([(cx, cy+4), (cx, 58)], fill=(70,140,60), width=2)
    return img
save(make_flower((255, 80, 120)), "flower_red")
save(make_flower((255, 220, 80)), "flower_yellow")

# ---------- BERG / FELS ----------
def make_mountain():
    img = new_tile()
    d = ImageDraw.Draw(img)
    # Fels
    d.polygon([(6, 58), (32, 6), (58, 58)], fill=(120, 120, 125))
    d.polygon([(32, 6), (40, 20), (32, 28), (24, 20)], fill=(200, 200, 200))  # Schneegipfel
    d.line([(6,58),(32,6)], fill=(90,90,95), width=2)
    d.line([(32,6),(58,58)], fill=(90,90,95), width=2)
    # Schatten
    d.polygon([(32,28),(58,58),(32,58)], fill=(100,100,105))
    return img
save(make_mountain(), "mountain")

print(f"Eigenes 64x64 Tileset generiert ({len(os.listdir(OUT))} Tiles):")
for f in sorted(os.listdir(OUT)):
    print(" ", f)
