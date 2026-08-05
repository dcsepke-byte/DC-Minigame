#!/usr/bin/env python3
"""
Party Arena — Basis-Bodenkacheln (10 Tiles), organisch & rund statt steril.
Jede Kachel: unregelmäßige, runde Steine mit dunklen Fugen, Ton-Variation,
Schatten rechts-unten, Highlight links-oben (Bible-Lichtregel), dunkelbraune Outline.
"""
from PIL import Image, ImageDraw
import os, random, math

TS = 32
OUT = "/opt/data/DC-Minigame/assets/custom-tiles-32/terrain/base"
os.makedirs(OUT, exist_ok=True)
OUTLINE = (74, 52, 34)

def new_tile():
    return Image.new("RGBA", (TS, TS), (0, 0, 0, 0))

def shade(c, amt):
    f = 1 - amt
    return (max(0,min(255,round(c[0]*f))), max(0,min(255,round(c[1]*f))), max(0,min(255,round(c[2]*f))))

def lighten(c, amt):
    f = 1 + amt
    return (max(0,min(255,round(c[0]*f))), max(0,min(255,round(c[1]*f))), max(0,min(255,round(c[2]*f))))

def jitter(c, amt, rnd):
    return (max(0,min(255,c[0]+rnd.randrange(-amt,amt))),
            max(0,min(255,c[1]+rnd.randrange(-amt,amt))),
            max(0,min(255,c[2]+rnd.randrange(-amt,amt))))

def draw_organic_stone(d, cx, cy, rad, tone, seed, joint=(60,58,60)):
    """Unregelmäßiger runder Stein: leicht gezackter Umriss, Ton-Variation, Schatten+Highlight."""
    rnd = random.Random(seed)
    # unregelmäßiger Umriss (Punkte mit Radius-Jitter)
    pts = []
    n = 10
    for i in range(n):
        a = 2*math.pi*i/n
        r = rad * rnd.uniform(0.72, 1.0)
        pts.append((cx + r*math.cos(a), cy + r*math.sin(a)))
    # Füllung (dunkler Ton = Schattenbasis)
    d.polygon(pts, fill=shade(tone, 0.18))
    d.polygon(pts, fill=tone)
    # Textur-Punkte im Stein
    for _ in range(6):
        x = cx + rnd.uniform(-rad*0.6, rad*0.6)
        y = cy + rnd.uniform(-rad*0.6, rad*0.6)
        d.point((x, y), fill=jitter(tone, 16, rnd))
    # Highlight links-oben (kleiner Bogen)
    hx, hy = cx - rad*0.35, cy - rad*0.35
    d.ellipse([hx-2, hy-2, hx+3, hy+3], fill=lighten(tone, 0.25))
    # Outline dunkelbraun
    d.polygon(pts, outline=OUTLINE)
    return pts

def save(img, name):
    img.save(os.path.join(OUT, f"{name}.png"))

# ============================================================
# TILE 1: Standard-Pflaster (hellgrau) — organische Steine
# ============================================================
def tile_standard():
    img = new_tile(); d = ImageDraw.Draw(img)
    joint = (120, 118, 120)   # Fugen dunkelgrau
    d.rectangle([0,0,TS-1,TS-1], fill=joint)
    stone = (178, 179, 183)
    # 7 organische, leicht überlappende Steine (lückenlos)
    layout = [(8,8,6,1),(24,8,6,2),(16,16,7,3),(8,25,6,4),(24,25,6,5),(31,16,4,6),(2,17,4,7)]
    for cx,cy,r,s in layout:
        draw_organic_stone(d, cx, cy, r, jitter(stone, 8, random.Random(100+s)), 100+s)
    save(img, "Base_01_StandardPflaster")

# ============================================================
# TILE 2: Dunkler Basalt (Anthrazit)
# ============================================================
def tile_basalt():
    img = new_tile(); d = ImageDraw.Draw(img)
    d.rectangle([0,0,TS-1,TS-1], fill=(70, 70, 74))   # dunkle Fugen
    stone = (95, 95, 100)
    layout = [(8,8,6,1),(24,8,6,2),(16,16,7,3),(8,25,6,4),(24,25,6,5),(31,16,4,6)]
    for cx,cy,r,s in layout:
        draw_organic_stone(d, cx, cy, r, jitter(stone, 12, random.Random(50+s)), 50+s)
    save(img, "Base_02_DunklerBasalt")

# ============================================================
# TILE 3: Römischer Ziegel (Terracotta, Fischgrät)
# ============================================================
def tile_herringbone():
    img = new_tile(); d = ImageDraw.Draw(img)
    d.rectangle([0,0,TS-1,TS-1], fill=(120, 78, 50))  # Mörtel
    terracotta = (196, 120, 84)
    # Fischgrät: diagonale kurze Ziegel
    # 4 Diagonallinien-Richtung
    for i in range(4):
        # eine Reihe schräger Ziegel
        x0 = i*8
        for j in range(4):
            # abwechselnde Richtung
            y0 = j*8
            if (i+j)%2==0:
                d.polygon([(x0,y0),(x0+5,y0),(x0+7,y0+3),(x0+5,y0+8),(x0,y0+8),(x0-2,y0+3)], fill=jitter(terracotta,10,random.Random(i*10+j)))
            else:
                d.polygon([(x0,y0),(x0+2,y0+3),(x0+5,y0+8),(x0,y0+8),(x0-2,y0+5)], fill=jitter(terracotta,10,random.Random(i*10+j)))
    save(img, "Base_03_RoemischerZiegel")

# ============================================================
# TILE 4: Moosiger Übergang
# ============================================================
def tile_moss():
    img = new_tile(); d = ImageDraw.Draw(img)
    d.rectangle([0,0,TS-1,TS-1], fill=(70, 95, 70))   # moosige Fugen
    stone = (168, 169, 173)
    layout = [(8,8,6,1),(24,8,6,2),(16,16,7,3),(8,25,6,4),(24,25,6,5)]
    for cx,cy,r,s in layout:
        draw_organic_stone(d, cx, cy, r, jitter(stone, 8, random.Random(10+s)), 10+s)
    # Moos in Fugen + ragt auf Steine
    moss = (86, 148, 60)
    for _ in range(14):
        x = random.Random(7*_).randrange(2, TS-2); y = random.Random(13*_).randrange(2, TS-2)
        d.point((x,y), fill=jitter(moss, 20, random.Random(_)))
        d.point((x+1,y), fill=jitter(moss, 20, random.Random(_+1)))
    save(img, "Base_04_Moosig")

# ============================================================
# TILE 5: Der Riss (beschädigt)
# ============================================================
def tile_crack():
    img = new_tile(); d = ImageDraw.Draw(img)
    d.rectangle([0,0,TS-1,TS-1], fill=(110, 108, 110))
    stone = (172, 173, 177)
    layout = [(8,8,6,1),(24,8,6,2),(16,16,7,3),(8,25,6,4),(24,25,6,5)]
    for cx,cy,r,s in layout:
        draw_organic_stone(d, cx, cy, r, jitter(stone, 8, random.Random(20+s)), 20+s)
    # Tiefe Risse in der Mitte (dunkle Zickzack-Linien)
    rnd = random.Random(99)
    for _ in range(3):
        x = rnd.randrange(12, 20); y = 12
        d.line([(x,y),(x+2,y+4),(x-1,y+8),(x+1,y+12),(x-2,y+16)], fill=(60,60,62), width=1)
    # herausgebrochenes Stück (Fuge freigelegt)
    d.point((16,20), fill=(110,108,110)); d.point((17,21), fill=(110,108,110))
    save(img, "Base_05_Riss")

# ============================================================
# TILE 6: Pfütze / Regennass
# ============================================================
def tile_puddle():
    img = new_tile(); d = ImageDraw.Draw(img)
    d.rectangle([0,0,TS-1,TS-1], fill=(90, 92, 100))   # nasse Fugen (dunkler)
    stone = (150, 152, 160)  # nasser, dunklerer Stein
    layout = [(8,8,6,1),(24,8,6,2),(16,16,7,3),(8,25,6,4),(24,25,6,5)]
    for cx,cy,r,s in layout:
        draw_organic_stone(d, cx, cy, r, jitter(stone, 8, random.Random(30+s)), 30+s)
    # Pfütze (organische Form, spiegelt Himmel hellblau)
    rnd = random.Random(77)
    pts = []
    for i in range(8):
        a = 2*math.pi*i/8
        rr = 6 + rnd.uniform(-1.5, 1.5)
        pts.append((16+rr*math.cos(a), 16+rr*math.sin(a)))
    d.polygon(pts, fill=(140, 190, 215))
    d.polygon(pts, outline=(170, 215, 235))
    # nasse Glanz-Pixel
    d.point((16,14), fill=(200, 230, 245)); d.point((15,15), fill=(200,230,245))
    save(img, "Base_06_Pfuetze")

# ============================================================
# TILE 7: Gullydeckel / Abfluss
# ============================================================
def tile_gully():
    img = new_tile(); d = ImageDraw.Draw(img)
    d.rectangle([0,0,TS-1,TS-1], fill=(120, 118, 120))
    stone = (178, 179, 183)
    # Steine rund um den Deckel (außen)
    layout = [(6,6,5,1),(26,6,5,2),(16,2,4,3),(6,26,5,4),(26,26,5,5),(2,16,4,6),(30,16,3,7)]
    for cx,cy,r,s in layout:
        draw_organic_stone(d, cx, cy, r, jitter(stone, 8, random.Random(40+s)), 40+s)
    # Gullydeckel: runder, eisengrauer Gitterkreis in der Mitte
    d.ellipse([10,10,22,22], fill=(110, 112, 118))
    d.ellipse([10,10,22,22], outline=OUTLINE, width=1)
    d.ellipse([11,11,21,21], outline=(90,92,98), width=1)
    # Gitterlinien
    for a in range(0, 360, 45):
        x = 16 + 5*math.cos(math.radians(a)); y = 16 + 5*math.sin(math.radians(a))
        d.line([(16,16),(x,y)], fill=(90,92,98), width=1)
    d.ellipse([14,14,18,18], fill=(100,102,108))
    save(img, "Base_07_Gully")

# ============================================================
# TILE 8: Ornament / Mosaik-Zentrum
# ============================================================
def tile_ornament():
    img = new_tile(); d = ImageDraw.Draw(img)
    d.rectangle([0,0,TS-1,TS-1], fill=(120, 118, 120))
    stone = (178, 179, 183)
    layout = [(6,6,5,1),(26,6,5,2),(6,26,5,3),(26,26,5,4),(2,16,3,5),(30,16,3,6),(16,2,3,7),(16,30,3,8)]
    for cx,cy,r,s in layout:
        draw_organic_stone(d, cx, cy, r, jitter(stone, 8, random.Random(60+s)), 60+s)
    # Mosaik-Stern in der Mitte (gold/beige)
    gold = (214, 176, 96)
    rnd = random.Random(55)
    # 8-zackiger Stern
    pts = []
    for i in range(16):
        a = math.pi*i/8
        rr = 6 if i%2==0 else 3
        pts.append((16+rr*math.cos(a), 16+rr*math.sin(a)))
    d.polygon(pts, fill=gold)
    d.polygon(pts, outline=shade(gold, 0.3))
    d.ellipse([15,15,17,17], fill=shade(gold, 0.2))
    save(img, "Base_08_Ornament")

# ============================================================
# TILE 9: Bordstein / Kante
# ============================================================
def tile_curb():
    img = new_tile(); d = ImageDraw.Draw(img)
    # Untere Hälfte: Fahrbahn (dunkler)
    d.rectangle([0,16,TS-1,TS-1], fill=(140, 142, 148))
    stone = (185, 186, 190)
    layout = [(8,22,6,1),(24,22,6,2),(16,28,5,3)]
    for cx,cy,r,s in layout:
        draw_organic_stone(d, cx, cy, r, jitter(stone, 8, random.Random(80+s)), 80+s)
    # Obere Hälfte: Gehweg
    d.rectangle([0,0,TS-1,16], fill=(165, 166, 170))
    layout2 = [(8,5,5,4),(24,5,5,5),(16,9,5,6),(3,9,3,7),(29,9,3,8)]
    for cx,cy,r,s in layout2:
        draw_organic_stone(d, cx, cy, r, jitter((180,181,185), 8, random.Random(90+s)), 90+s)
    # Bordstein-Kante: helle Linie + Schatten darunter
    d.rectangle([0,15,TS-1,16], fill=(225, 226, 230))   # erhöhte Kante
    d.rectangle([0,17,TS-1,18], fill=(95, 97, 103))     # Schattenwurf
    save(img, "Base_09_Bordstein")

# ============================================================
# TILE 10: Schmutz- & Sand-Einbruch
# ============================================================
def tile_dirt():
    img = new_tile(); d = ImageDraw.Draw(img)
    d.rectangle([0,0,TS-1,TS-1], fill=(110, 108, 110))
    stone = (172, 173, 177)
    layout = [(8,8,6,1),(24,8,6,2),(16,16,7,3),(8,25,6,4),(24,25,6,5)]
    for cx,cy,r,s in layout:
        draw_organic_stone(d, cx, cy, r, jitter(stone, 8, random.Random(70+s)), 70+s)
    # Sand/Dreck fransend von links unten auf die Steine
    rnd = random.Random(66)
    sand = (196, 178, 140)
    for _ in range(40):
        # Gewichtung: mehr unten-links
        x = rnd.randrange(0, 16); y = rnd.randrange(16, TS)
        d.point((x,y), fill=jitter(sand, 15, rnd))
        d.point((x+1,y), fill=jitter(sand, 15, rnd))
    # weiche Sand-Kante
    for y in range(16, TS):
        w = int((y-16)/16 * 14) + 2
        d.line([(0,y),(w,y)], fill=jitter(sand, 10, rnd))
    save(img, "Base_10_SandEinbruch")

# ============================================================
# PREVIEW-SHEET
# ============================================================
def preview():
    files = sorted(os.listdir(OUT))
    COLS = 5; CELL = TS*3 + 12
    rows = (len(files)+COLS-1)//COLS
    W = COLS*CELL+12; H = rows*CELL+12
    sheet = Image.new("RGBA", (W,H), (45,50,58))
    dr = ImageDraw.Draw(sheet)
    for idx, f in enumerate(files):
        r = idx//COLS; c = idx%COLS
        img = Image.open(os.path.join(OUT,f)).convert("RGBA").resize((TS*3,TS*3), Image.NEAREST)
        sheet.paste(img, (c*CELL+6, r*CELL+6), img)
        dr.text((c*CELL+6, r*CELL+CELL-8), f[:-4], fill=(255,255,255))
    sheet = sheet.resize((W*2, H*2), Image.NEAREST)
    sheet.save("/opt/data/base_tiles_sheet.png")
    print(f"Preview: {len(files)} Tiles -> /opt/data/base_tiles_sheet.png")

if __name__ == "__main__":
    tile_standard(); tile_basalt(); tile_herringbone(); tile_moss()
    tile_crack(); tile_puddle(); tile_gully(); tile_ornament()
    tile_curb(); tile_dirt()
    preview()
    print("10 Basis-Kacheln erstellt (organisch, rund).")
