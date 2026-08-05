#!/usr/bin/env python3
"""Erfasst alle Village-Assets und erzeugt eine bearbeitbare Klassifikations-CSV."""
import os, csv

BASE = "/opt/data/DC-Minigame/assets/craftpix/village"
OUT = "/opt/data/DC-Minigame/docs/village-tiles-klassifikation.csv"

rows = []

def add(cat, name, path):
    rows.append({
        "Kategorie": cat,
        "Datei": name,
        "Pfad": path,
        "Beschreibung": "",
        "Typ": "",        # Boden / Objekt / Deko / Gebäude
        "Nutzung": "",    # z.B. Weg, Stadtplatz, Haus-Wand
        "Pruefstatus": "",  # offen / ok / anpassen
        "Notizen": "",
    })

# Fields-Tiles (64)
tiles_dir = os.path.join(BASE, "1 Tiles")
for i in range(1, 65):
    add("FieldsTile", f"FieldsTile_{i:02d}.png", f"1 Tiles/FieldsTile_{i:02d}.png")

# 1.1 Tiles (Tile2_*)
tiles2_dir = os.path.join(BASE, "1.1 Tiles")
for f in sorted(os.listdir(tiles2_dir)):
    if f.endswith(".png") and not f.startswith("Tileset"):
        add("Tile2", f, f"1.1 Tiles/{f}")

# Objects
obj_dir = os.path.join(BASE, "2 Objects")
obj_map = {
    "1 Shadow": "Schatten", "2 Stone": "Stein", "3 Decor": "Deko",
    "4 Box": "Kiste", "5 Grass": "Gras", "6 Tent": "Zelt", "7 House": "Haus",
}
for sub, kat in obj_map.items():
    d = os.path.join(obj_dir, sub)
    if os.path.isdir(d):
        for f in sorted(os.listdir(d)):
            if f.endswith(".png"):
                add(kat, f, f"2 Objects/{sub}/{f}")
    else:
        # Einzeldateien wie PlaceForTower
        for f in sorted(os.listdir(obj_dir)):
            if f.endswith(".png"):
                add("Objekt", f, f"2 Objects/{f}")

# Animated
anim_dir = os.path.join(BASE, "3 Animated Objects")
if os.path.isdir(anim_dir):
    for f in sorted(os.listdir(anim_dir)):
        if f.endswith(".png"):
            add("Animiert", f, f"3 Animated Objects/{f}")

# Als CSV schreiben
with open(OUT, "w", newline="", encoding="utf-8") as fh:
    fieldnames = ["Kategorie", "Datei", "Pfad", "Beschreibung", "Typ", "Nutzung", "Pruefstatus", "Notizen"]
    writer = csv.DictWriter(fh, fieldnames=fieldnames, delimiter=";")
    writer.writeheader()
    writer.writerows(rows)

print(f"Klassifikationsdatei: {OUT}")
print(f"Erfasst: {len(rows)} Assets")
from collections import Counter
c = Counter(r["Kategorie"] for r in rows)
for k, v in c.items():
    print(f"  {k}: {v}")
