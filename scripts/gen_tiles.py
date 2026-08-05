#!/usr/bin/env python3
"""
Party Arena — Tile Generator Framework (Tileset Bible konform)

Erzeugt 32x32 Pixel-Art-Tiles mit KONSISTENTEN Stilregeln aus der Tileset Bible:
  - Licht IMMER von links oben, Schatten IMMER rechts unten
  - Outlines dunkelbraun, 1px
  - Top-Down (90°), keine Isometrie
  - Max. 32 Farben pro Region, keine Farbverläufe
  - Multi-Tile-Objekte (2x2) für große Gebäude/Bäume

Jedes Tile wird über Registry-Daten + eine Render-Funktion definiert.
So sind 1200+ Tiles programmatisch erzeugbar, alle aus einem Guss.
"""
from PIL import Image, ImageDraw
import os, random, json

# ============================================================
# KONFIG
# ============================================================
TS = 32            # Tile-Größe 32x32 (Bible-Vorgabe)
OUT = "/opt/data/DC-Minigame/assets/custom-tiles-32"
PALETTE_DIR = "/opt/data/DC-Minigame/assets/palettes"
REGISTRY = "/opt/data/DC-Minigame/assets/registry"
os.makedirs(OUT, exist_ok=True)
os.makedirs(PALETTE_DIR, exist_ok=True)
os.makedirs(REGISTRY, exist_ok=True)

# Stilregeln (Bible)
OUTLINE = (74, 52, 34)          # dunkelbraun statt schwarz
LIGHT_OFF = (-1, -1)            # Licht von links oben
SHADOW_OFF = (1, 1)             # Schatten rechts unten

# ============================================================
# PALETTEN (je Region, max 32 Farben)
# ============================================================
PALETTES = {
    "nature": {
        "grass": (104, 168, 84), "grass_dark": (84, 140, 66),
        "grass_light": (128, 190, 100), "earth": (138, 100, 62),
        "road": (208, 178, 132), "road_dark": (168, 140, 100),
        "trunk": (138, 90, 48), "trunk_dark": (94, 62, 34),
        "leaf_green": (90, 170, 66), "leaf_green_dark": (58, 130, 44),
        "leaf_green_light": (140, 210, 90),
        "leaf_yellow": (230, 190, 70), "leaf_yellow_dark": (180, 140, 40),
        "water": (90, 180, 220), "water_dark": (60, 140, 185),
        "water_light": (165, 225, 245),
    },
    "sand": {
        "sand": (232, 205, 150), "sand_dark": (190, 162, 110),
        "sand_light": (250, 230, 185), "water": (90, 180, 220),
    },
    "winter": {
        "snow": (235, 240, 245), "snow_dark": (195, 205, 215),
        "ice": (175, 220, 245), "ice_dark": (130, 190, 225),
        "pine": (40, 95, 55), "pine_dark": (25, 65, 40),
    },
}

# ============================================================
# BASIS-WERKZEUGE
# ============================================================
def new_tile():
    return Image.new("RGBA", (TS, TS), (0, 0, 0, 0))

def save(img, name, subdir=""):
    d = os.path.join(OUT, subdir) if subdir else OUT
    os.makedirs(d, exist_ok=True)
    img.save(os.path.join(d, f"{name}.png"))
    return f"{name}.png"

def px(d, x, y, c):
    if 0 <= x < TS and 0 <= y < TS:
        d.point((x, y), fill=c)

def rect(img, x0, y0, x1, y1, c):
    ImageDraw.Draw(img).rectangle([x0, y0, x1, y1], fill=c)

def outline(img, x0, y0, x1, y1, c=OUTLINE, w=1):
    ImageDraw.Draw(img).rectangle([x0, y0, x1, y1], outline=c, width=w)

def shade(c, amt):
    """Abdunkeln (Schatten) — Bible: Schatten = 60-70% Helligkeit."""
    f = 1 - amt
    return (max(0, min(255, round(c[0]*f))),
            max(0, min(255, round(c[1]*f))),
            max(0, min(255, round(c[2]*f))))

def lighten(c, amt):
    f = 1 + amt
    return (max(0, min(255, round(c[0]*f))),
            max(0, min(255, round(c[1]*f))),
            max(0, min(255, round(c[2]*f))))

def add_shadow(img, obj_mask=None):
    """Schatten rechts-unten auf ein Objekt legen (Licht links-oben)."""
    # Vereinfachung: dunkle Pixel rechts-unten auf Rand-Zone

def noise(img, base, count=12, spread=8, seed=0):
    rnd = random.Random(seed)
    d = ImageDraw.Draw(img)
    for _ in range(count):
        x = rnd.randrange(TS); y = rnd.randrange(TS)
        dr = rnd.randrange(-spread, spread)
        d.point((x, y), fill=(max(0,min(255,base[0]+dr)),
                              max(0,min(255,base[1]+dr)),
                              max(0,min(255,base[2]+dr))))

# ============================================================
# GENERATOR-FUNKTIONEN
# ============================================================
def gen_grass(region="nature"):
    """3 Grasvarianten: Basis, mit Blumen, mit Blumen gelb."""
    pal = PALETTES[region]
    variants = {
        "Grass_00": None,
        "Grass_01": [(140, 220, 110), (120, 200, 90)],   # grüne Blumen
        "Grass_02": [(250, 225, 100), (245, 210, 80)],   # gelbe Blumen
    }
    for name, flowers in variants.items():
        img = new_tile()
        rect(img, 0, 0, TS-1, TS-1, pal["grass"])
        # Grass-Textur (Variation)
        rnd = random.Random(hash(name) & 0xffff)
        d = ImageDraw.Draw(img)
        for _ in range(14):
            x = rnd.randrange(0, TS-3); y = rnd.randrange(0, TS-3)
            s = rnd.randrange(-1, 2)
            c = pal["grass_dark"] if s < 0 else (pal["grass_light"] if s > 0 else pal["grass"])
            d.rectangle([x, y, x+2, y+2], fill=c)
        if flowers:
            for _ in range(4):
                x = rnd.randrange(2, TS-2); y = rnd.randrange(2, TS-2)
                fc = flowers[rnd.randrange(len(flowers))]
                for dx, dy in [(0,0),(1,0),(-1,0),(0,1),(0,-1)]:
                    px(d, x+dx, y+dy, fc)
                px(d, x, y, (255, 255, 210))
        save(img, name, "ground")

def gen_road(region="nature"):
    """Autotile-Weg: Mitte, 4 Ränder, 4 Ecken."""
    pal = PALETTES[region]
    road_c = pal["road"]; grass_c = pal["grass"]
    # Mitte
    img = new_tile(); rect(img, 0, 0, TS-1, TS-1, road_c); noise(img, road_c, seed=1); save(img, "Road_00_Mid", "ground")
    # Ränder (Gras + Weg mit weichem Übergang)
    edges = {"N": (0, 6, 0, 0), "S": (0, 0, 0, 6), "W": (6, 0, 0, 0), "E": (0, 0, 6, 0)}
    for dirn, (we0, gr0, we1, gr1) in edges.items():
        img = new_tile(); rect(img, 0, 0, TS-1, TS-1, grass_c); noise(img, grass_c, seed=hash(dirn)&0xffff)
        rect(img, we0, gr0, TS-1-we1, TS-1-gr1, road_c)
        save(img, f"Road_01_Edge_{dirn}", "ground")
    # Ecken (Weg in Form eines L)
    corners = {"TL": (6,6), "TR": (0,6), "BL": (6,0), "BR": (0,0)}
    for dirn, (cx, cy) in corners.items():
        img = new_tile(); rect(img, 0, 0, TS-1, TS-1, grass_c); noise(img, grass_c, seed=hash(dirn)&0xffff)
        d = ImageDraw.Draw(img)
        # L-förmiger Weg
        d.polygon([(6,0),(TS-1,0),(TS-1,TS-1),(0,TS-1),(0,6)], fill=road_c) if dirn=="TL" else \
        d.polygon([(0,0),(TS-6,0),(TS-1,6),(TS-1,TS-1),(0,TS-1)], fill=road_c) if dirn=="TR" else \
        d.polygon([(0,0),(TS-1,0),(TS-1,TS-1),(TS-6,TS-1),(0,TS-6)], fill=road_c) if dirn=="BL" else \
        d.polygon([(0,0),(TS-1,0),(TS-1,TS-1),(0,TS-1)], fill=road_c)
        save(img, f"Road_02_Corner_{dirn}", "ground")

def gen_water(region="nature"):
    pal = PALETTES[region]
    img = new_tile(); rect(img, 0, 0, TS-1, TS-1, pal["water"])
    noise(img, pal["water"], count=10, spread=10, seed=2)
    d = ImageDraw.Draw(img)
    d.arc([4, 12, 20, 24], 180, 360, fill=pal["water_light"], width=2)
    d.arc([18, 18, 30, 28], 180, 360, fill=pal["water_light"], width=1)
    save(img, "Water_00", "ground")

def gen_tree_small(region="nature"):
    """1x1 kleiner Baum."""
    pal = PALETTES[region]
    for color_name, crown in [("Green", pal["leaf_green"]), ("Yellow", pal["leaf_yellow"])]:
        img = new_tile(); d = ImageDraw.Draw(img)
        # Schatten rechts-unten (Bible)
        d.ellipse([10, 12, 25, 25], fill=shade(crown, 0.3))
        d.ellipse([8, 9, 24, 24], fill=crown)
        d.ellipse([12, 13, 17, 18], fill=lighten(crown, 0.2))
        # Stamm
        d.rectangle([14, 23, 18, 30], fill=pal["trunk"])
        d.rectangle([14, 23, 18, 30], outline=OUTLINE)
        save(img, f"Tree_01_Small_{color_name}", "trees")

def gen_tree_big(region="nature"):
    """2x2 großer Baum (Multi-Tile)."""
    pal = PALETTES[region]
    for color_name, crown in [("Green", pal["leaf_green"]), ("Yellow", pal["leaf_yellow"])]:
        for quad in ["tl", "tr", "bl", "br"]:
            img = new_tile(); d = ImageDraw.Draw(img)
            # Krone in allen 4 Quadranten
            d.ellipse([1, 1, 31, 31], fill=shade(crown, 0.25))
            d.ellipse([1, 1, 31, 31], fill=crown)
            # Highlight links-oben
            if quad == "tl":
                d.ellipse([4, 4, 14, 14], fill=lighten(crown, 0.25))
            elif quad == "tr":
                d.ellipse([18, 4, 28, 12], fill=lighten(crown, 0.15))
            # Stamm in untere Mitte
            if quad == "bl":
                d.rectangle([13, 12, 19, 31], fill=pal["trunk"])
                d.rectangle([13, 12, 19, 31], outline=OUTLINE)
            elif quad == "br":
                d.rectangle([19, 12, 21, 31], fill=shade(pal["trunk"], 0.2))
            save(img, f"Tree_02_Big_{color_name}_{quad.upper()}", "trees")

def gen_house(region="nature"):
    """2x2 Haus mit Dach/Fassade über 4 Tiles."""
    pal = PALETTES["nature"]
    houses = {
        "Red": (205, 92, 92), "Blue": (92, 130, 205),
        "Green": (110, 170, 90), "Brown": (168, 110, 70),
    }
    for color_name, roof_c in houses.items():
        wall = (238, 238, 238); door = (120, 74, 44); win = (150, 205, 240)
        # TL: Dach oben-links + Fassade oben
        img = new_tile(); d = ImageDraw.Draw(img)
        d.polygon([(0,16),(16,2),(32,16)], fill=shade(roof_c, 0.25))
        d.polygon([(0,16),(16,2),(32,16)], fill=roof_c)
        d.polygon([(0,16),(16,2),(16,16)], fill=shade(roof_c, 0.15))
        rect(img, 0, 16, 31, 31, wall); outline(img, 0, 16, 31, 31)
        save(img, f"Building_01_{color_name}_TL", "buildings")
        # TR: Dach oben-rechts + Fassade + Fenster
        img = new_tile(); d = ImageDraw.Draw(img)
        d.polygon([(0,16),(16,2),(32,16)], fill=shade(roof_c, 0.25))
        d.polygon([(0,16),(16,2),(32,16)], fill=roof_c)
        rect(img, 0, 16, 31, 31, wall); outline(img, 0, 16, 31, 31)
        rect(img, 8, 20, 22, 28, win); outline(img, 8, 20, 22, 28)
        d.line([(15,20),(15,28)], fill=(100,100,100)); d.line([(8,24),(22,24)], fill=(100,100,100))
        save(img, f"Building_01_{color_name}_TR", "buildings")
        # BL: Fassade unten + Tür
        img = new_tile(); d = ImageDraw.Draw(img)
        rect(img, 0, 0, 31, 31, wall); outline(img, 0, 0, 31, 31)
        rect(img, 10, 8, 22, 31, door); outline(img, 10, 8, 22, 31)
        px(d, 20, 20, (255, 240, 180))
        rect(img, 2, 2, 7, 7, win)
        save(img, f"Building_01_{color_name}_BL", "buildings")
        # BR: Fassade unten + Fenster rechts
        img = new_tile(); d = ImageDraw.Draw(img)
        rect(img, 0, 0, 31, 31, wall); outline(img, 0, 0, 31, 31)
        rect(img, 23, 14, 31, 31, win); outline(img, 23, 14, 31, 31)
        d.line([(27,14),(27,31)], fill=(100,100,100))
        save(img, f"Building_01_{color_name}_BR", "buildings")

def gen_flower(region="nature"):
    colors = {"Red": (255, 80, 120), "Yellow": (255, 220, 80), "Blue": (100, 150, 255)}
    for color_name, c in colors.items():
        img = new_tile(); d = ImageDraw.Draw(img)
        for dx, dy in [(0,-3),(4,0),(2,3),(-2,3),(-4,0)]:
            d.ellipse([15+dx-2, 15+dy-2, 15+dx+2, 15+dy+2], fill=c)
        d.ellipse([14, 14, 18, 18], fill=(255,255,210))
        d.line([(16, 18), (16, 28)], fill=(70, 140, 60), width=1)
        save(img, f"Plant_01_Flower_{color_name}", "plants")

def gen_mountain(region="nature"):
    """2x2 Berg (Multi-Tile)."""
    for quad in ["tl", "tr", "bl", "br"]:
        img = new_tile(); d = ImageDraw.Draw(img)
        if quad == "tl":
            d.polygon([(0,31),(16,2),(32,31)], fill=(120,120,125))
            d.polygon([(0,31),(16,2),(16,31)], fill=(100,100,105))  # Schattenseite
            d.polygon([(12,6),(20,16),(16,18)], fill=(220,225,230))  # Schnee
        elif quad == "tr":
            d.polygon([(0,31),(16,2),(32,31)], fill=(120,120,125))
            d.polygon([(12,6),(20,16),(16,18)], fill=(220,225,230))
        elif quad == "bl":
            rect(img, 0, 0, 31, 31, (110,110,115))
        else:  # br
            rect(img, 0, 0, 31, 31, (110,110,115))
            rect(img, 24, 24, 31, 31, (80,80,85))
        save(img, f"Mountain_01_{quad.upper()}", "mountains")

# ============================================================
# REGISTRY-DOKUMENTATION generieren
# ============================================================
def write_registry():
    """Generiert registry/tiles.md mit allen erzeugten Tiles (Bible-Schema)."""
    entries = []
    for root, _, files in os.walk(OUT):
        for f in sorted(files):
            if f.endswith(".png"):
                rel = os.path.relpath(root, OUT)
                tid = f[:-4]
                entries.append({"tile_id": tid, "path": (rel + "/" if rel != "." else "") + f})
    with open(os.path.join(REGISTRY, "tiles.md"), "w") as fh:
        fh.write("# Tile Registry (generiert)\n\n")
        fh.write(f"**Gesamt:** {len(entries)} Tiles\n\n")
        fh.write("| Tile-ID | Pfad |\n|---|---|\n")
        for e in entries:
            fh.write(f"| `{e['tile_id']}` | `{e['path']}` |\n")
    # JSON für Maschinen
    with open(os.path.join(REGISTRY, "tiles.json"), "w") as fh:
        json.dump(entries, fh, indent=2)
    return len(entries)

# ============================================================
# MAIN
# ============================================================
if __name__ == "__main__":
    gen_grass()
    gen_road()
    gen_water()
    gen_tree_small()
    gen_tree_big()
    gen_house()
    gen_flower()
    gen_mountain()
    n = write_registry()
    print(f"✓ Generator-Framework: {n} Tiles erzeugt")
    print("  Struktur:")
    for sub in sorted([d for d in os.listdir(OUT) if os.path.isdir(os.path.join(OUT, d))]):
        c = len([f for f in os.listdir(os.path.join(OUT, sub)) if f.endswith(".png")])
        print(f"    {sub}/ ({c})")
