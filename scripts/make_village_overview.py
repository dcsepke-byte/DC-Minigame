#!/usr/bin/env python3
"""Erstellt eine grafische Übersicht aller Village-Tiles, nach Kategorie gruppiert."""
from PIL import Image, ImageDraw
import os, glob, math

BASE = "/opt/data/DC-Minigame/assets/craftpix/village"
OUT_DIR = "/opt/data"

# Kategorien sammeln: (Name, [Pfade])
categories = []

# Fields Tiles (64)
ft = sorted(glob.glob(f"{BASE}/1 Tiles/FieldsTile_*.png"),
            key=lambda p: int(p.split('_')[-1].split('.')[0]))
categories.append(("FieldsTiles (Boden)", ft))

# Tile2 (64)
t2 = sorted(glob.glob(f"{BASE}/1.1 Tiles/Tile2_*.png"))
categories.append(("Tile2 (Boden)", t2))

# Objects
obj_cats = {
    "1 Shadow": "Schatten", "2 Stone": "Stein", "3 Decor": "Deko",
    "4 Box": "Kiste", "5 Grass": "Gras", "6 Tent": "Zelt", "7 House": "Haus",
}
for sub, name in obj_cats.items():
    d = f"{BASE}/2 Objects/{sub}"
    if os.path.isdir(d):
        files = sorted([os.path.join(d, f) for f in os.listdir(d) if f.endswith(".png")],
                       key=lambda p: int(p.split('/')[-1].split('.')[0]))
        categories.append((f"{name}", files))

# Animated
anim = sorted(glob.glob(f"{BASE}/3 Animated Objects/*.png"))
categories.append(("Animiert (Türen)", anim))

# Preview-Sheet pro Kategorie
def make_sheet(name, files, scale=3, cols=8):
    if not files: return
    # Bildgröße pro Tile
    ts = Image.open(files[0]).size[0]
    rows = math.ceil(len(files)/cols)
    cell = ts*scale + 6
    W = cols*cell + 6
    H = rows*cell + 30 + 6
    sheet = Image.new("RGBA", (W, H), (45, 50, 58))
    dr = ImageDraw.Draw(sheet)
    dr.text((6, 6), name, fill=(255, 255, 0))
    for idx, p in enumerate(files):
        r = idx//cols; c = idx%cols
        img = Image.open(p).convert("RGBA")
        # resize auf einheitliche Größe
        if img.size != (ts*scale, ts*scale):
            img = img.resize((ts*scale, ts*scale), Image.NEAREST)
        x = c*cell + 3
        y = r*cell + 30 + 3
        sheet.paste(img, (x, y), img)
        # Dateiname beschriften
        fname = p.split('/')[-1].split('.')[0]
        dr.text((x+1, y+ts*scale+2), fname, fill=(255, 255, 255))
    return sheet

# Alle Sheets erzeugen
all_sheets = []
for cat_name, files in categories:
    s = make_sheet(cat_name, files)
    if s:
        all_sheets.append((cat_name, s))
        s.save(f"{OUT_DIR}/village_{cat_name.replace(' ','').replace('(','').replace(')','')}.png")

# Komplettes Gesamt-Sheet (alle Kategorien vertikal stapeln)
def stack_sheets(sheets, gap=20):
    max_w = max(s.width for _, s in sheets)
    total_h = sum(s.height for _, s in sheets) + gap*(len(sheets)-1)
    canvas = Image.new("RGBA", (max_w, total_h), (30, 34, 40))
    y = 0
    for _, s in sheets:
        canvas.paste(s, (0, y), s)
        y += s.height + gap
    return canvas

combined = stack_sheets(all_sheets)
combined.save(f"{OUT_DIR}/village_all_tiles_overview.png")
print(f"Gesamt-Übersicht: {combined.size} ({combined.width}x{combined.height})")
for name, s in all_sheets:
    print(f"  {name}: {s.width}x{s.height}")
