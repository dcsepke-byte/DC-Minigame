# Dorf-Tiles — Komplette Kurznamen-Liste

Du baust dein Dorf im Grid (JSON). Jedes Kästchen = 1 Feld mit einem Kürzel.
Dieses Dokument zeigt ALLE verfügbaren Kürzel mit ihren Bildern.

## Boden (Grid-Grund)

| Kürzel | Bild | Beschreibung |
|---|---|---|
| `g` | FieldsTile_38 | Gras (grüner Boden) |
| `s` | FieldsTile_01 | Sand/Wüste |
| `e` | FieldsTile_02 | Erde |
| `w` | Tile2_02 | Straße/Weg |

## Gebäude & Objekte (auf dem Boden platzierbar)

### Häuser
| Kürzel | Bild | Beschreibung |
|---|---|---|
| `h1` | 7 House/1.png | Haus 1 |
| `h2` | 7 House/2.png | Haus 2 |
| `h3` | 7 House/3.png | Haus 3 |
| `h4` | 7 House/4.png | Haus 4 |

### Zelte
| Kürzel | Bild |
|---|---|
| `z1` | 6 Tent/1.png |
| `z2` | 6 Tent/2.png |
| `z3` | 6 Tent/3.png |
| `z4` | 6 Tent/4.png |

### Grasbüschel
| Kürzel | Bild |
|---|---|
| `gb1` | 5 Grass/1.png |
| `gb2` | 5 Grass/2.png |
| `gb3` | 5 Grass/3.png |
| `gb4` | 5 Grass/4.png |
| `gb5` | 5 Grass/5.png |
| `gb6` | 5 Grass/6.png |

### Steine
| Kürzel | Bild |
|---|---|
| `st1` | 2 Stone/1.png |
| `st2` | 2 Stone/2.png |
| `st3` | 2 Stone/3.png |
| `st4` | 2 Stone/4.png |
| `st5` | 2 Stone/5.png |
| `st6` | 2 Stone/6.png |

### Kisten
| Kürzel | Bild |
|---|---|
| `k1` | 4 Box/1.png |
| `k2` | 4 Box/2.png |
| `k3` | 4 Box/3.png |
| `k4` | 4 Box/4.png |
| `k5` | 4 Box/5.png |

### Deko (17 Stück)
| Kürzel | Bild |
|---|---|
| `d1` | 3 Decor/1.png |
| `d2` | 3 Decor/2.png |
| `d3` | 3 Decor/3.png |
| `d4` | 3 Decor/4.png |
| `d5` | 3 Decor/5.png |
| `d6` | 3 Decor/6.png |
| `d7` | 3 Decor/7.png |
| `d8` | 3 Decor/8.png |
| `d9` | 3 Decor/9.png |
| `d10` | 3 Decor/10.png |
| `d11` | 3 Decor/11.png |
| `d12` | 3 Decor/12.png |
| `d13` | 3 Decor/13.png |
| `d14` | 3 Decor/14.png |
| `d15` | 3 Decor/15.png |
| `d16` | 3 Decor/16.png |
| `d17` | 3 Decor/17.png |

### Schatten (für Gebäude)
| Kürzel | Bild |
|---|---|
| `sh1` | 1 Shadow/1.png |
| `sh2` | 1 Shadow/2.png |
| `sh3` | 1 Shadow/3.png |
| `sh4` | 1 Shadow/4.png |
| `sh5` | 1 Shadow/5.png |
| `sh6` | 1 Shadow/6.png |

### Türen (animiert)
| Kürzel | Bild |
|---|---|
| `t1` | Door1.png |
| `t2` | Door2.png |
| `td1` | DoubleDoor1.png |
| `td2` | DoubleDoor2.png |

---

## Wie du das Grid baust

Jede Zeile in `karte` ist ein Array. Beispiel: ein Haus auf Gras, daneben Straße:

```json
["g","g","g","h1","h1","w","w","w","g","g"]
```

- Zeile = eine Reihe im Dorf
- Spalten = von links nach rechts
- `h1` belegt die Felder, die das Haus einnimmt (je nach Hausgröße)

**Grid-Größe:** 30 Spalten × 20 Zeilen (passend zur `gridWidth`/`gridHeight` in der JSON).
