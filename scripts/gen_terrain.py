#!/usr/bin/env python3
"""
Party Arena — Terrain Generator (Pack 01: Wege, Gras, Pflastersteine)

Baut das BODEN-Fundament mit vollständiger Autotile-Logik:
  - Gras (Basis-Varianten)
  - Erdweg (Autotile: 16 Bitmask-Varianten — gerade, Ecken, Kreuzungen, T, Enden)
  - Kiesweg (Autotile)
  - Pflasterstein-Weg (Autotile)

Jeder Weg-Typ hat die 16 Bitmask-Kombinationen (N/S/E/W = 1 wenn verbunden).
So passen alle Wege nahtlos aneinander — das Herzstück der Karte.
"""
from PIL import Image, ImageDraw
import os, random, json

TS = 32
BASE = "/opt/data/DC-Minigame/assets/custom-tiles-32"
TERRAIN = os.path.join(BASE, "terrain")
os.makedirs(TERRAIN, exist_ok=True)

OUTLINE = (74, 52, 34)

def new_tile():
    return Image.new("RGBA", (TS, TS), (0, 0, 0, 0))

def px(d, x, y, c):
    if 0 <= x < TS and 0 <= y < TS:
        d.point((x, y), fill=c)

def rect(img, x0, y0, x1, y1, c):
    ImageDraw.Draw(img).rectangle([x0, y0, x1, y1], fill=c)

def noise(img, base, count, spread, seed):
    rnd = random.Random(seed)
    d = ImageDraw.Draw(img)
    for _ in range(count):
        x = rnd.randrange(TS); y = rnd.randrange(TS)
        dr = rnd.randrange(-spread, spread)
        px(d, x, y, (max(0,min(255,base[0]+dr)),
                     max(0,min(255,base[1]+dr)),
                     max(0,min(255,base[2]+dr))))

def save(img, name):
    img.save(os.path.join(TERRAIN, f"{name}.png"))

# ============================================================
# GRAS (Basis + Deko-Varianten)
# ============================================================
GRASS_BASE = (104, 168, 84)
GRASS_DARK = (82, 140, 64)
GRASS_LIGHT = (130, 192, 100)

def gen_grass():
    variants = {
        "Grass_00": None,                          # Basis
        "Grass_01_FlowerGreen": [(140,220,110),(120,200,90)],  # grüne Blumen
        "Grass_02_FlowerYellow": [(250,225,100),(245,210,80)], # gelbe Blumen
        "Grass_03_FlowerWhite": [(250,250,240),(235,235,225)], # weiße Blumen
        "Grass_04_Tufts": [(86,150,68),(78,140,60)],  # Grasbüschel
    }
    for name, flowers in variants.items():
        img = new_tile()
        rect(img, 0, 0, TS-1, TS-1, GRASS_BASE)
        rnd = random.Random(hash(name) & 0xffff)
        d = ImageDraw.Draw(img)
        # Gras-Textur (helle/dunkle Flecken)
        for _ in range(16):
            x = rnd.randrange(0, TS-3); y = rnd.randrange(0, TS-3)
            s = rnd.randrange(-1, 2)
            c = GRASS_DARK if s < 0 else (GRASS_LIGHT if s > 0 else GRASS_BASE)
            d.rectangle([x, y, x+2, y+2], fill=c)
        # Gras-Halme (feine Striche)
        for _ in range(6):
            x = rnd.randrange(1, TS-2); y = rnd.randrange(1, TS-2)
            d.line([(x, y+3), (x, y-2)], fill=GRASS_DARK, width=1)
        if flowers:
            for _ in range(4):
                x = rnd.randrange(2, TS-2); y = rnd.randrange(2, TS-2)
                fc = flowers[rnd.randrange(len(flowers))]
                for dx, dy in [(0,0),(1,0),(-1,0),(0,1),(0,-1)]:
                    px(d, x+dx, y+dy, fc)
                px(d, x, y, (255,255,210))
        save(img, name)

# ============================================================
# WEG-AUTOTILE (generisch für jeden Weg-Typ)
# ============================================================
def render_road_tile(road_c, road_edge, grass_c, mask):
    """Erzeugt einen Weg-Tile basierend auf 4-bit Maske (N,S,E,W verbunden)."""
    img = new_tile()
    rect(img, 0, 0, TS-1, TS-1, grass_c)
    noise(img, grass_c, count=8, spread=8, seed=mask*7+3)
    d = ImageDraw.Draw(img)
    # Weg-Fläche (Kern) mit weichem Gras-Übergang
    edge = 6  # Gras-Randbreite
    x0, y0, x1, y1 = edge, edge, TS-1-edge, TS-1-edge
    # Erweitere je nach Verbindungen
    if mask & 1: y0 = 0          # N
    if mask & 4: y1 = TS-1       # S
    if mask & 8: x0 = 0          # W
    if mask & 2: x1 = TS-1       # E
    # Weg-Basis
    rect(img, x0, y0, x1, y1, road_c)
    # Weg-Textur
    noise(img, road_c, count=12, spread=12, seed=mask)
    # Weicher Gras-Rand (Übergang): helle Gras-Kante am Weg
    d = ImageDraw.Draw(img)
    # Gras-Randstreifen um den Weg (nur wo Gras bleibt)
    for i in range(edge):
        c = (max(0,min(255,grass_c[0]+(i*6))), max(0,min(255,grass_c[1]+(i*6))), max(0,min(255,grass_c[2]+(i*6))))
        if not (mask & 1): rect(img, x0, i, x1, i, c)           # Nord-Rand
        if not (mask & 4): rect(img, x0, TS-1-i, x1, TS-1-i, c) # Süd-Rand
        if not (mask & 8): rect(img, i, y0, i, y1, c)           # West-Rand
        if not (mask & 2): rect(img, TS-1-i, y0, TS-1-i, y1, c) # Ost-Rand
    # Weg-Outline (dunkelbraun, 1px) am Rand wo kein Gras
    if not (mask & 1): d.line([(x0,edge),(x1,edge)], fill=OUTLINE, width=1)
    if not (mask & 4): d.line([(x0,TS-1-edge),(x1,TS-1-edge)], fill=OUTLINE, width=1)
    if not (mask & 8): d.line([(edge,y0),(edge,y1)], fill=OUTLINE, width=1)
    if not (mask & 2): d.line([(TS-1-edge,y0),(TS-1-edge,y1)], fill=OUTLINE, width=1)
    return img

def gen_road_autotile(prefix, road_c, road_edge=None, subdir="terrain"):
    """Generiert alle 16 Autotile-Varianten für einen Weg-Typ."""
    # Namen für die 16 Masken
    names = {
        0: "Single", 1: "End_N", 2: "End_E", 3: "Corner_NE",
        4: "End_S", 5: "Straight_NS", 6: "Corner_ES", 7: "TJunction_ENS",
        8: "End_W", 9: "Corner_WN", 10: "Straight_EW", 11: "TJunction_EWN",
        12: "Corner_SW", 13: "TJunction_NSW", 14: "TJunction_EWS", 15: "Cross",
    }
    for mask, name in names.items():
        img = render_road_tile(road_c, road_edge, GRASS_BASE, mask)
        # Pflaster-Spezial: Steinfugen
        if "Pflaster" in prefix:
            d = ImageDraw.Draw(img)
            for i in range(2, TS-2, 8):
                d.line([(2,i),(TS-3,i)], fill=(150,150,150), width=1)
                d.line([(i,2),(i,TS-3)], fill=(150,150,150), width=1)
        save(img, f"{prefix}_{name}")

# ============================================================
# WEG-TYPEN
# ============================================================
def gen_roads():
    # Erdweg (dunkler, natürlicher Pfad)
    gen_road_autotile("Road_Erd", (190, 150, 100))
    # Kiesweg (heller, körniger)
    gen_road_autotile("Road_Kies", (205, 185, 150))
    # Grasweg (fast Gras, nur leicht abgenutzt)
    gen_road_autotile("Road_Gras", (120, 175, 92))
    # Pflasterstein (grau, mit Fugen)
    gen_road_autotile("Road_Pflaster", (175, 175, 180))

# ============================================================
# ÜBERGÄNGE (Gras→Weg, optional für Sand etc.)
# ============================================================
def gen_transitions():
    pass  # spätere Erweiterung

# ============================================================
# REGISTRY
# ============================================================
def write_registry():
    entries = []
    for f in sorted(os.listdir(TERRAIN)):
        if f.endswith(".png"):
            entries.append({"tile_id": f[:-4], "path": f"terrain/{f}"})
    with open("/opt/data/DC-Minigame/assets/registry/terrain.json", "w") as fh:
        json.dump(entries, fh, indent=2)
    return entries

if __name__ == "__main__":
    gen_grass()
    gen_roads()
    entries = write_registry()
    # Zähle je Kategorie
    from collections import Counter
    cats = Counter()
    for e in entries:
        prefix = e["tile_id"].split("_")[0] + ("_" + e["tile_id"].split("_")[1] if "_" in e["tile_id"] else "")
        cats[e["tile_id"].split("_")[0]] += 1
    print(f"✓ Terrain-Pack: {len(entries)} Tiles")
    for k, v in sorted(cats.items()):
        print(f"    {k}: {v}")
    print(f"    davon Weg-Autotile: {len([e for e in entries if 'Road_' in e['tile_id']])}")
