#!/usr/bin/env python3
"""Visualisiert Hauptpfad + Side-Paths auf der Stadtkarte."""
from PIL import Image, ImageDraw
import json, re

TILE = 8
city = Image.open("assets/kenney-pico8-city/aethonia_city_4x.png").convert("RGBA")
SCALE = 2
view = city.resize((city.size[0]*SCALE, city.size[1]*SCALE), Image.NEAREST).convert("RGB")
d = ImageDraw.Draw(view)

# Parse die JS-Datei: extrahiere JSON-Blöcke fuer main und side
src = open("js/board-path-data.js").read()
m_main = re.search(r'main:\s*(\[\[.*?\]\])', src, re.S)
m_side = re.search(r'side:\s*(\[\[\[.*?\]\]\])', src, re.S)
m_streets = re.search(r'streets:\s*(\[\[.*?\]\])', src, re.S)
main = json.loads(m_main.group(1))
side = json.loads(m_side.group(1))

def to_px(p):
    return (p[0]*TILE*SCALE + TILE*SCALE//2, p[1]*TILE*SCALE + TILE*SCALE//2)

# Side-Paths (blau)
for sp in side:
    pts = [to_px(p) for p in sp]
    d.line(pts, fill=(80,80,255), width=6)

# Hauptpfad (rot)
pts = [to_px(p) for p in main]
d.line(pts, fill=(255,60,60), width=4)

# Start
sx, sy = to_px(main[0])
d.ellipse([sx-10, sy-10, sx+10, sy+10], fill=(0,255,0))

view.save("/opt/data/board_path_side_visual.png")
print("Visualisierung:", view.size)
print("Hauptpfad:", len(main), "Punkte, Side-Paths:", len(side))
# Side-Path-Laengen
print("Side-Path-Laengen:", [len(s) for s in side])
