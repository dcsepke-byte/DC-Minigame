#!/usr/bin/env python3
"""Zeichnet die 8 Arenians als UNTERSCHIEDLICHE 2D-Pixel-Sprites (Kenney-Stil, 16x16).
Jeder Charakter hat eine eigene Silhouette/Form. Ergebnis: assets/characters/<id>.png"""
from PIL import Image, ImageDraw
import os

OUT_DIR = "assets/characters"
os.makedirs(OUT_DIR, exist_ok=True)

OUTLINE = (30, 20, 30, 255)
EYE = (255, 255, 255, 255)
PUPIL = (20, 20, 30, 255)

def new_img():
    return Image.new("RGBA", (16, 16), (0,0,0,0))

def px(img, x, y, c):
    if 0 <= x < 16 and 0 <= y < 16:
        img.putpixel((x, y), c)

def rect(img, x0, y0, x1, y1, c):
    for y in range(y0, y1+1):
        for x in range(x0, x1+1):
            px(img, x, y, c)

def eyes(img, y=4):
    # zwei große Augen
    rect(img, 4, y, 6, y+2, EYE)
    rect(img, 9, y, 11, y+2, EYE)
    px(img, 5, y+1, PUPIL)
    px(img, 10, y+1, PUPIL)

def outline_rect(img, x0, y0, x1, y1, c):
    for x in range(x0, x1+1):
        px(img, x, y0, c); px(img, x, y1, c)
    for y in range(y0, y1+1):
        px(img, x0, y, c); px(img, x1, y, c)

# ============================================================
# 1. BRIX — Stein-Golem (quadratisch, kantig, Felsbrocken)
# ============================================================
def brix():
    img = new_img()
    body = (255, 106, 0, 255); accent = (255, 180, 100, 255)
    # Quadratischer Körper
    rect(img, 3, 8, 12, 15, body)
    outline_rect(img, 3, 8, 12, 15, OUTLINE)
    # Quadratischer Kopf
    rect(img, 2, 1, 13, 8, body)
    outline_rect(img, 2, 1, 13, 8, OUTLINE)
    # Riss-Detail (Golem)
    px(img, 7, 10, accent); px(img, 8, 11, accent); px(img, 7, 12, accent)
    eyes(img, 3)
    return img

# ============================================================
# 2. NIXIE — Axolotl (runder Kopf, Kiemen-Flossen seitlich)
# ============================================================
def nixie():
    img = new_img()
    body = (0, 240, 255, 255); accent = (150, 250, 255, 255)
    # Runder Körper
    rect(img, 4, 9, 11, 15, body)
    outline_rect(img, 4, 9, 11, 15, OUTLINE)
    # Runder Kopf
    rect(img, 3, 2, 12, 9, body)
    outline_rect(img, 3, 2, 12, 9, OUTLINE)
    # Kiemen-Flossen (3 seitlich)
    px(img, 1, 3, accent); px(img, 1, 4, accent); px(img, 1, 5, accent)
    px(img, 14, 3, accent); px(img, 14, 4, accent); px(img, 14, 5, accent)
    eyes(img, 4)
    return img

# ============================================================
# 3. PIP — Fliegendes Eichhörnchen (Schwanz hinten, spitze Ohren)
# ============================================================
def pip():
    img = new_img()
    body = (255, 211, 78, 255); accent = (255, 240, 180, 255)
    # Körper
    rect(img, 4, 9, 11, 15, body)
    outline_rect(img, 4, 9, 11, 15, OUTLINE)
    # Kopf
    rect(img, 3, 2, 12, 9, body)
    outline_rect(img, 3, 2, 12, 9, OUTLINE)
    # Spitze Ohren
    px(img, 3, 1, body); px(img, 4, 0, body)
    px(img, 11, 1, body); px(img, 10, 0, body)
    # Schwanz (hinten, buschig)
    rect(img, 12, 10, 14, 13, accent)
    outline_rect(img, 12, 10, 14, 13, OUTLINE)
    eyes(img, 4)
    return img

# ============================================================
# 4. KOKO — Panda (runde Ohren, schwarze Augen-Flecken)
# ============================================================
def koko():
    img = new_img()
    body = (255, 77, 109, 255); accent = (255, 180, 200, 255)
    black = (40, 40, 50, 255)
    # Körper
    rect(img, 4, 9, 11, 15, body)
    outline_rect(img, 4, 9, 11, 15, OUTLINE)
    # Kopf
    rect(img, 3, 2, 12, 9, body)
    outline_rect(img, 3, 2, 12, 9, OUTLINE)
    # Runde Ohren
    rect(img, 2, 1, 4, 3, black)
    rect(img, 11, 1, 13, 3, black)
    # Augen-Flecken (Panda)
    rect(img, 4, 3, 6, 5, black)
    rect(img, 9, 3, 11, 5, black)
    px(img, 5, 4, EYE); px(img, 10, 4, EYE)
    return img

# ============================================================
# 5. TIKO — Vogel (Schnabel, Flügel)
# ============================================================
def tiko():
    img = new_img()
    body = (43, 255, 185, 255); accent = (180, 255, 230, 255)
    beak = (255, 200, 60, 255)
    # Körper
    rect(img, 4, 9, 11, 15, body)
    outline_rect(img, 4, 9, 11, 15, OUTLINE)
    # Kopf
    rect(img, 3, 2, 12, 9, body)
    outline_rect(img, 3, 2, 12, 9, OUTLINE)
    # Schnabel (Mitte)
    rect(img, 6, 5, 9, 6, beak)
    # Flügel
    rect(img, 2, 10, 3, 13, accent)
    rect(img, 12, 10, 13, 13, accent)
    eyes(img, 3)
    return img

# ============================================================
# 6. BOLT — Roboter (Antenne, quadratisch, Leucht-Augen)
# ============================================================
def bolt():
    img = new_img()
    body = (58, 134, 255, 255); accent = (180, 210, 255, 255)
    # Roboter-Körper
    rect(img, 3, 8, 12, 15, body)
    outline_rect(img, 3, 8, 12, 15, OUTLINE)
    # Roboter-Kopf
    rect(img, 2, 1, 13, 8, body)
    outline_rect(img, 2, 1, 13, 8, OUTLINE)
    # Antenne
    px(img, 7, 0, accent); px(img, 7, -1, accent)
    # Leucht-Augen (blau)
    rect(img, 4, 3, 6, 5, (0, 200, 255, 255))
    rect(img, 9, 3, 11, 5, (0, 200, 255, 255))
    return img

# ============================================================
# 7. BLOOM — Wandelnder Kaktus (Blume oben, stachelig)
# ============================================================
def bloom():
    img = new_img()
    body = (123, 47, 247, 255); accent = (200, 160, 255, 255)
    flower = (255, 100, 200, 255)
    # Kaktus-Körper (schmal, hoch)
    rect(img, 5, 6, 10, 15, body)
    outline_rect(img, 5, 6, 10, 15, OUTLINE)
    # Kopf
    rect(img, 4, 1, 11, 6, body)
    outline_rect(img, 4, 1, 11, 6, OUTLINE)
    # Blume oben
    px(img, 7, 0, flower); px(img, 6, 0, flower); px(img, 8, 0, flower)
    # Stacheln
    px(img, 3, 3, accent); px(img, 12, 3, accent)
    eyes(img, 3)
    return img

# ============================================================
# 8. MOMO — Waschbär (Maske, Streifen-Schwanz)
# ============================================================
def momo():
    img = new_img()
    body = (255, 60, 172, 255); accent = (255, 180, 220, 255)
    dark = (50, 30, 50, 255)
    # Körper
    rect(img, 4, 9, 11, 15, body)
    outline_rect(img, 4, 9, 11, 15, OUTLINE)
    # Kopf
    rect(img, 3, 2, 12, 9, body)
    outline_rect(img, 3, 2, 12, 9, OUTLINE)
    # Waschbär-Maske (dunkel um Augen)
    rect(img, 4, 3, 6, 5, dark)
    rect(img, 9, 3, 11, 5, dark)
    px(img, 5, 4, EYE); px(img, 10, 4, EYE)
    # Streifen-Schwanz
    rect(img, 12, 10, 14, 12, dark)
    rect(img, 12, 13, 14, 14, accent)
    return img

CHARACTERS = [
    ("brix", brix), ("nixie", nixie), ("pip", pip), ("koko", koko),
    ("tiko", tiko), ("bolt", bolt), ("bloom", bloom), ("momo", momo),
]

sheet = Image.new("RGBA", (16*8, 16), (0,0,0,0))
for i, (name, fn) in enumerate(CHARACTERS):
    sprite = fn()
    sprite.save(f"{OUT_DIR}/{name}.png")
    sheet.paste(sprite, (i*16, 0), sprite)
sheet.save(f"{OUT_DIR}/sheet.png")
print("8 unterschiedliche Charakter-Sprites gespeichert")
