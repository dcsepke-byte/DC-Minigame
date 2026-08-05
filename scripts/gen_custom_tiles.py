#!/usr/bin/env python3
"""Eigenes Party-Arena Tileset generieren (Pixel-Art, einheitlicher Cartoon-Stil)."""
from PIL import Image, ImageDraw
import os

TS = 16  # Tile-Größe
OUT = "/opt/data/DC-Minigame/assets/custom-tiles"
os.makedirs(OUT, exist_ok=True)

def new_tile():
    return Image.new("RGBA", (TS, TS), (0, 0, 0, 0))

def save(img, name):
    img.save(f"{OUT}/{name}.png")

def px(d, x, y, c):
    """Pixel setzen mit Clamping."""
    if 0 <= x < TS and 0 <= y < TS:
        d.point((x, y), fill=c)

def rect(img, x0, y0, x1, y1, c):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=c)

def outline_rect(img, x0, y0, x1, y1, c, w=1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], outline=c, width=w)

def noise_fill(img, base, count=14, spread=14):
    """Gras-Textur: zufällige hellere/dunklere Pixel."""
    import random
    rnd = random.Random(hash(base) & 0xffff)
    d = ImageDraw.Draw(img)
    r, g, b = base
    for _ in range(count):
        x = rnd.randrange(TS); y = rnd.randrange(TS)
        dr = rnd.randrange(-spread, spread)
        c = (max(0,min(255,r+dr)), max(0,min(255,g+dr)), max(0,min(255,b+dr)))
        px(d, x, y, c)

# ---------- GRAS ----------
def make_grass(base, flowers=None):
    img = new_tile()
    rect(img, 0, 0, TS-1, TS-1, base)
    noise_fill(img, base, count=12, spread=12)
    if flowers:
        d = ImageDraw.Draw(img)
        import random
        rnd = random.Random(hash((base, tuple(flowers))) & 0xffff)
        for _ in range(3):
            x = rnd.randrange(2, TS-2); y = rnd.randrange(2, TS-2)
            d.point((x, y), fill=flowers[rnd.randrange(len(flowers))])
            d.point((x+1, y), fill=flowers[rnd.randrange(len(flowers))])
    return img

grass0 = make_grass((104, 168, 84))                    # Basis-Gras
grass1 = make_grass((104, 168, 84), [(120, 200, 100)]) # Blumen
grass2 = make_grass((104, 168, 84), [(240, 220, 100)]) # gelbe Blumen
save(grass0, "grass0"); save(grass1, "grass1"); save(grass2, "grass2")

# ---------- WEG (mit weichem Übergang zu Gras) ----------
def make_road(base=(208, 178, 132), edge=(140, 118, 84)):
    img = new_tile()
    rect(img, 0, 0, TS-1, TS-1, base)   # sandfarben
    # Körnung
    noise_fill(img, base, count=10, spread=18)
    return img

road_mid = make_road()
# Randstreifen (Gras am Wegrand für weichen Übergang)
def road_with_grass_edge(side):
    img = new_tile()
    rect(img, 0, 0, TS-1, TS-1, (104, 168, 84))
    noise_fill(img, (104,168,84), count=8, spread=10)
    if side == "top":   rect(img, 0, 4, TS-1, TS-1, (208, 178, 132))
    if side == "bottom": rect(img, 0, 0, TS-1, TS-1, (208, 178, 132))
    if side == "left":  rect(img, 4, 0, TS-1, TS-1, (208, 178, 132))
    if side == "right": rect(img, 0, 0, TS-1, TS-1, (208, 178, 132))
    return img

save(road_mid, "road_mid")
save(road_with_grass_edge("top"), "road_top")
save(road_with_grass_edge("bottom"), "road_bottom")
save(road_with_grass_edge("left"), "road_left")
save(road_with_grass_edge("right"), "road_right")

# Wegecke (oben-links: Gras in der Ecke)
def road_corner(dx, dy):
    img = new_tile()
    # Gras-Basis
    rect(img, 0, 0, TS-1, TS-1, (104, 168, 84))
    noise_fill(img, (104,168,84), count=8, spread=10)
    # Weg füllt außer der Ecke
    d = ImageDraw.Draw(img)
    d.polygon([(dx, 0), (0, 0), (0, dy), (dx, dy)], fill=(208,178,132))
    return img
save(road_corner(8, 8), "road_corner_tl")
save(road_corner(8, 8), "road_corner_tr")
save(road_corner(8, 8), "road_corner_bl")
save(road_corner(8, 8), "road_corner_br")

# ---------- BAUM ----------
def make_tree(crown, trunk=(112, 76, 44)):
    img = new_tile()
    # Krone (rund)
    d = ImageDraw.Draw(img)
    d.ellipse([3, 2, 12, 11], fill=crown)
    d.ellipse([4, 3, 9, 8], fill=(min(255,crown[0]+30), min(255,crown[1]+25), min(255,crown[2]+20)))
    # Trunk
    d.rectangle([6, 11, 9, 15], fill=trunk)
    return img
save(make_tree((72, 156, 60)), "tree_green")       # grüner Baum
save(make_tree((240, 196, 80)), "tree_yellow")      # gelber Baum
save(make_tree((72, 156, 60), (140, 100, 60)), "tree_small")  # kleiner

# ---------- HAUS ----------
def make_house(roof, wall=(235, 235, 235), door=(122, 74, 44)):
    img = new_tile()
    d = ImageDraw.Draw(img)
    # Dach (Spitzdreieck + Balken)
    d.polygon([(2, 6), (8, 1), (14, 6)], fill=roof)
    d.rectangle([2, 6, 14, 15], fill=wall)   # Fassade
    # Fenster
    d.rectangle([4, 8, 6, 10], fill=(140, 200, 235))
    d.rectangle([9, 8, 11, 10], fill=(140, 200, 235))
    # Tür
    d.rectangle([6, 12, 9, 15], fill=door)
    return img
save(make_house((200, 90, 90)), "house_red")     # rotes Dach
save(make_house((90, 130, 200)), "house_blue")    # blaues Dach

# ---------- WASSER ----------
def make_water():
    img = new_tile()
    rect(img, 0, 0, TS-1, TS-1, (90, 180, 220))
    noise_fill(img, (90,180,220), count=10, spread=16)
    # Wellenlinien
    d = ImageDraw.Draw(img)
    d.arc([2, 5, 8, 11], 180, 360, fill=(160, 220, 245))
    d.arc([8, 8, 14, 14], 180, 360, fill=(160, 220, 245))
    return img
save(make_water(), "water")

# ---------- BLUME (Deko) ----------
def make_flower(color):
    img = new_tile()
    d = ImageDraw.Draw(img)
    d.point((8, 6), fill=color); d.point((7,7), fill=color); d.point((9,7), fill=color); d.point((8,8), fill=color)
    d.point((8,5), fill=color)
    return img
save(make_flower((255, 80, 120)), "flower_red")
save(make_flower((255, 220, 80)), "flower_yellow")

print("Eigenes Tileset generiert:")
for f in sorted(os.listdir(OUT)):
    print(" ", f)
