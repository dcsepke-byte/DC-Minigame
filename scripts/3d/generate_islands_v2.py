"""Party Arena — Insel-Generator v2 (Blender 4.2, headless)

Erzeugt die 7 Konzept-Inseln aus dem Spielwelt-Konzept (Aethonia) —
Version 2: GROESSER, hochaufloesender, deutlich mehr Details.

1. Sonnenstrand    — Tuerkis, Sandgelb, Korallenrot (Palmen, Strand, Boote, Muscheln)
2. Zuckerwald      — Rosa, Schokobraun, Mintgruen (Bonbons, Kuchen, Zuckerstangen)
3. Wolkenwerk      — Hellblau, Weiss, Regenbogen (schwebend, Wolken, Ballons)
4. Frostgipfel     — Eisblau, Weiss, Violett (Eis, Schnee, Eiszapfen)
5. Dschungeltempel — Dschungelgruen, Gold, Braun (Tempel, Lianen, Wasserfall)
6. Mechanik-Stadt  — Silber, Orange, Gelb (Zahnraeder, Roboter, Rohre)
7. Sternenzitadelle— Gold, Tiefblau, Magenta (Sterne, Tuerme, Portale)

Aufruf: blender -b -P scripts/3d/generate_islands_v2.py
"""
import bpy
import math
import os
import random

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'blender-assets', 'islands')
os.makedirs(OUT_DIR, exist_ok=True)

# Seeded RNG fuer reproduzierbare Ergebnisse
random.seed(20260802)

# Basis-Skalierung — Inseln deutlich groesser
SCALE = 2.5


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # Licht + Kamera
    bpy.ops.object.light_add(type='SUN', location=(5, 5, 10))
    bpy.context.object.data.energy = 3.0
    bpy.ops.object.light_add(type='AREA', location=(0, -6, 8))
    bpy.context.object.data.energy = 80.0
    cam_data = bpy.data.cameras.new('Cam')
    cam = bpy.data.objects.new('Cam', cam_data)
    cam.location = (0, -10, 6.5)
    cam.rotation_euler = (math.radians(58), 0, 0)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam


def new_material(name, color, roughness=0.7, metalness=0.0, emissive=None, emissive_strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = color
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metalness
        if emissive:
            bsdf.inputs['Emission Color'].default_value = emissive
            bsdf.inputs['Emission Strength'].default_value = emissive_strength
    return mat


def hex_to_rgba(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) / 255.0 for i in (0, 2, 4)) + (1.0,)


def apply_subdiv(obj, levels=2):
    """Subdivision Surface Modifier — glatte, hochaufloesende Oberflaechen."""
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_add(type='SUBSURF')
    obj.modifiers[-1].levels = levels
    obj.modifiers[-1].render_levels = levels


def add_island_base(color, radius=2.0 * SCALE, height=0.5 * SCALE, segments=64):
    """Flacher Zylinder mit abgerundetem Rand (Konzept: 'flache Zylinder mit abgerundetem Rand')."""
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=height, vertices=segments,
                                        location=(0, 0, height / 2))
    base = bpy.context.object
    base.name = 'IslandBase'
    bpy.ops.object.modifier_add(type='BEVEL')
    base.modifiers['Bevel'].width = 0.15 * SCALE
    base.modifiers['Bevel'].segments = 6
    base.data.materials.append(new_material('IslandMat', hex_to_rgba(color), roughness=0.85, metalness=0.05))
    return base


def add_ground_layer(color, radius=1.75 * SCALE, height=0.15 * SCALE, y=0.5 * SCALE):
    """Obere Gruene/Sand-Schicht der Insel."""
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=height, vertices=64,
                                        location=(0, 0, y))
    layer = bpy.context.object
    layer.name = 'GroundLayer'
    layer.data.materials.append(new_material('GroundMat', hex_to_rgba(color), roughness=0.9))
    return layer


def add_tree(x, y, z, trunk_color='#8b5a2b', leaf_color='#2ecc71', leaf2_color='#27ae60', scale=1.0):
    """Kapsel-Stamm + 3 Kugel-Kronen (dichter, detaillierter)."""
    s = SCALE * scale
    bpy.ops.mesh.primitive_cylinder_add(radius=0.12 * s, depth=0.8 * s, vertices=12,
                                        location=(x * SCALE, y * SCALE, (z + 0.4 * s)))
    trunk = bpy.context.object
    trunk.name = 'TreeTrunk'
    trunk.data.materials.append(new_material(f'Trunk{x}{y}', hex_to_rgba(trunk_color), roughness=0.9))

    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.35 * s, segments=20, ring_count=14,
                                         location=(x * SCALE, y * SCALE, (z + 0.9 * s)))
    crown = bpy.context.object
    crown.name = 'TreeCrown'
    crown.data.materials.append(new_material(f'Crown{x}{y}', hex_to_rgba(leaf_color), roughness=0.8,
                                             emissive=hex_to_rgba(leaf2_color), emissive_strength=0.05))
    apply_subdiv(crown, 1)

    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.2 * s, segments=12, ring_count=8,
                                         location=((x + 0.22 * scale) * SCALE, (y + 0.18 * scale) * SCALE, (z + 0.75 * s)))
    crown2 = bpy.context.object
    crown2.name = 'TreeCrown2'
    crown2.data.materials.append(new_material(f'Crown2{x}{y}', hex_to_rgba(leaf2_color), roughness=0.8))

    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.16 * s, segments=12, ring_count=8,
                                         location=((x - 0.2 * scale) * SCALE, (y - 0.22 * scale) * SCALE, (z + 0.65 * s)))
    crown3 = bpy.context.object
    crown3.name = 'TreeCrown3'
    crown3.data.materials.append(new_material(f'Crown3{x}{y}', hex_to_rgba(leaf_color), roughness=0.8))


def add_palm(x, y, z, scale=1.0, lean=0.15):
    """Gekruemmter Stamm + 8 Palmblaetter (detaillierter)."""
    s = SCALE * scale
    bpy.ops.mesh.primitive_cylinder_add(radius=0.11 * s, depth=1.1 * s, vertices=12,
                                        location=(x * SCALE, y * SCALE, (z + 0.55 * s)))
    trunk = bpy.context.object
    trunk.name = 'PalmTrunk'
    trunk.rotation_euler = (lean, lean * 0.7, 0)
    trunk.data.materials.append(new_material(f'PalmTrunk{x}{y}', hex_to_rgba('#8b5a2b'), roughness=0.9))
    apply_subdiv(trunk, 1)

    for i in range(8):
        a = math.radians(i * 45)
        bpy.ops.mesh.primitive_cone_add(radius1=0.32 * s, depth=0.1 * s, vertices=8,
                                        location=((x + math.cos(a) * 0.28 * s) * SCALE,
                                                  (y + math.sin(a) * 0.28 * s) * SCALE,
                                                  (z + 1.15 * s)))
        leaf = bpy.context.object
        leaf.name = f'PalmLeaf{i}'
        leaf.rotation_euler = (math.radians(70), 0, -a)
        leaf.data.materials.append(new_material(f'PalmLeaf{i}{x}{y}', hex_to_rgba('#27ae60'), roughness=0.8))

    # Kokosnuesse
    for i in range(3):
        a = math.radians(i * 120 + 30)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.06 * s, segments=8, ring_count=6,
                                             location=((x + math.cos(a) * 0.12 * s) * SCALE,
                                                       (y + math.sin(a) * 0.12 * s) * SCALE,
                                                       (z + 0.95 * s)))
        coconut = bpy.context.object
        coconut.name = f'Coconut{i}'
        coconut.data.materials.append(new_material(f'Coc{i}{x}{y}', hex_to_rgba('#5d4037'), roughness=0.8))


def add_house(x, y, z, wall_color, roof_color='#d32f2f', scale=1.0):
    """Detailliertes Haus: Wuerfel + Dach + Fenster + Tuer + Schornstein."""
    s = SCALE * scale
    bpy.ops.mesh.primitive_cube_add(size=0.7 * s, location=(x * SCALE, y * SCALE, (z + 0.35 * s)))
    walls = bpy.context.object
    walls.name = 'HouseWalls'
    walls.data.materials.append(new_material(f'HouseWalls{x}{y}', hex_to_rgba(wall_color), roughness=0.8))
    apply_subdiv(walls, 1)

    bpy.ops.mesh.primitive_cone_add(radius1=0.58 * s, depth=0.5 * s, vertices=12,
                                    location=(x * SCALE, y * SCALE, (z + 0.85 * s)))
    roof = bpy.context.object
    roof.name = 'HouseRoof'
    roof.data.materials.append(new_material(f'HouseRoof{x}{y}', hex_to_rgba(roof_color), roughness=0.75))

    # Fenster (vorne)
    for fx in (-0.18, 0.18):
        bpy.ops.mesh.primitive_cube_add(size=0.12 * s, location=(x * SCALE + fx * s, y * SCALE + 0.35 * s, (z + 0.42 * s)))
        win = bpy.context.object
        win.name = 'HouseWindow'
        win.data.materials.append(new_material(f'Win{fx}{x}{y}', hex_to_rgba('#ffe66d'), roughness=0.3,
                                               emissive=hex_to_rgba('#ffe66d'), emissive_strength=0.8))

    # Tuer
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(x * SCALE, y * SCALE + 0.36 * s, (z + 0.15 * s)))
    door = bpy.context.object
    door.name = 'HouseDoor'
    door.scale = (0.18 * s, 0.05 * s, 0.3 * s)
    door.data.materials.append(new_material(f'Door{x}{y}', hex_to_rgba('#5d4037'), roughness=0.7))

    # Schornstein
    bpy.ops.mesh.primitive_cylinder_add(radius=0.07 * s, depth=0.3 * s, vertices=8,
                                        location=((x + 0.2) * SCALE, (y + 0.15) * SCALE, (z + 1.0 * s)))
    chimney = bpy.context.object
    chimney.name = 'Chimney'
    chimney.data.materials.append(new_material(f'Chimney{x}{y}', hex_to_rgba('#795548'), roughness=0.9))


def add_rock(x, y, z, color='#90a4ae', scale=1.0):
    """Felsen/Vulkan-Kegel mit Subdivision."""
    s = SCALE * scale
    bpy.ops.mesh.primitive_cone_add(radius1=0.45 * s, depth=0.7 * s, vertices=16,
                                    location=(x * SCALE, y * SCALE, (z + 0.35 * s)))
    rock = bpy.context.object
    rock.name = 'Rock'
    rock.data.materials.append(new_material(f'Rock{x}{y}', hex_to_rgba(color), roughness=0.9))
    apply_subdiv(rock, 1)


def add_crystal(x, y, z, color='#7b2ff7', scale=1.0):
    """Leuchtender Kristall-Spitz."""
    s = SCALE * scale
    bpy.ops.mesh.primitive_cone_add(radius1=0.16 * s, depth=0.9 * s, vertices=8,
                                    location=(x * SCALE, y * SCALE, (z + 0.45 * s)))
    crystal = bpy.context.object
    crystal.name = 'Crystal'
    crystal.rotation_euler = (0.1, 0.2, 0)
    crystal.data.materials.append(new_material(f'Crystal{x}{y}', hex_to_rgba(color), roughness=0.3, metalness=0.4,
                                               emissive=hex_to_rgba(color), emissive_strength=1.0))


def add_gear(x, y, z, color='#ff9800', scale=1.0):
    """Zahnrad mit 12 Zaehnen (detaillierter)."""
    s = SCALE * scale
    bpy.ops.mesh.primitive_torus_add(major_radius=0.35 * s, minor_radius=0.08 * s,
                                     major_segments=32, minor_segments=10,
                                     location=(x * SCALE, y * SCALE, (z + 0.35 * s)))
    gear = bpy.context.object
    gear.name = 'Gear'
    gear.rotation_euler = (math.radians(90), 0, 0)
    gear.data.materials.append(new_material(f'Gear{x}{y}', hex_to_rgba(color), roughness=0.4, metalness=0.7))

    for i in range(12):
        a = math.radians(i * 30)
        bpy.ops.mesh.primitive_cube_add(size=0.12 * s,
                                        location=((x + math.cos(a) * 0.36 * s) * SCALE,
                                                  (y + math.sin(a) * 0.36 * s) * SCALE,
                                                  (z + 0.35 * s)))
        tooth = bpy.context.object
        tooth.name = f'GearTooth{i}'
        tooth.data.materials.append(new_material(f'Tooth{i}{x}{y}', hex_to_rgba(color), roughness=0.4, metalness=0.7))


def add_cloud(x, y, z, color='#ffffff', scale=1.0):
    """Wolke aus 6 Halbkugeln."""
    s = SCALE * scale
    puffs = [(-0.35, 0, 0.22), (0, 0.1, 0.32), (0.35, 0, 0.22), (0.15, 0.05, 0.28), (-0.15, 0.05, 0.28), (0, -0.08, 0.26)]
    for i, (dx, dy, r) in enumerate(puffs):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=r * s, segments=16, ring_count=10,
                                             location=((x + dx * scale) * SCALE, (y + dy * scale) * SCALE,
                                                       (z + 0.18 * s)))
        cloud = bpy.context.object
        cloud.name = f'Cloud{i}'
        cloud.data.materials.append(new_material(f'Cloud{i}{x}{y}', hex_to_rgba(color), roughness=1.0))
        apply_subdiv(cloud, 1)


def add_balloon(x, y, z, color='#ff3cac', scale=1.0):
    """Luftballon mit Korb."""
    s = SCALE * scale
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.3 * s, segments=16, ring_count=12,
                                         location=(x * SCALE, y * SCALE, (z + 0.8 * s)))
    ball = bpy.context.object
    ball.name = 'Balloon'
    ball.data.materials.append(new_material(f'Balloon{x}{y}', hex_to_rgba(color), roughness=0.4, metalness=0.1))
    apply_subdiv(ball, 1)

    # Korb
    bpy.ops.mesh.primitive_cylinder_add(radius=0.12 * s, depth=0.15 * s, vertices=10,
                                        location=(x * SCALE, y * SCALE, (z + 0.35 * s)))
    basket = bpy.context.object
    basket.name = 'Basket'
    basket.data.materials.append(new_material(f'Basket{x}{y}', hex_to_rgba('#8d6e63'), roughness=0.9))

    # Seile
    for i, a in enumerate([0, math.radians(90)]):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.012 * s, depth=0.5 * s, vertices=6,
                                            location=((x + math.cos(a) * 0.1 * s) * SCALE,
                                                      (y + math.sin(a) * 0.1 * s) * SCALE,
                                                      (z + 0.55 * s)))
        rope = bpy.context.object
        rope.name = f'Rope{i}'
        rope.data.materials.append(new_material(f'Rope{i}{x}{y}', hex_to_rgba('#795548'), roughness=0.9))


def add_star(x, y, z, color='#ffd34e', scale=1.0):
    """Leuchtender Stern (Ico-Kugel)."""
    s = SCALE * scale
    bpy.ops.mesh.primitive_ico_sphere_add(radius=0.28 * s, subdivisions=2,
                                          location=(x * SCALE, y * SCALE, (z + 0.55 * s)))
    star = bpy.context.object
    star.name = 'Star'
    star.data.materials.append(new_material(f'Star{x}{y}', hex_to_rgba(color), roughness=0.2, metalness=0.3,
                                            emissive=hex_to_rgba(color), emissive_strength=1.5))


def add_bush(x, y, z, color='#66bb6a', scale=1.0):
    """Kleiner Busch (Detail)."""
    s = SCALE * scale * 0.5
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.16 * s, segments=10, ring_count=8,
                                         location=(x * SCALE, y * SCALE, (z + 0.08 * s)))
    bush = bpy.context.object
    bush.name = 'Bush'
    bush.data.materials.append(new_material(f'Bush{x}{y}', hex_to_rgba(color), roughness=0.85))


def add_flower(x, y, z, color='#ff80ab', scale=1.0):
    """Blume: Stiel + Bluetenkopf."""
    s = SCALE * scale
    bpy.ops.mesh.primitive_cylinder_add(radius=0.015 * s, depth=0.2 * s, vertices=6,
                                        location=(x * SCALE, y * SCALE, (z + 0.1 * s)))
    stem = bpy.context.object
    stem.name = 'FlowerStem'
    stem.data.materials.append(new_material(f'FStem{x}{y}', hex_to_rgba('#4caf50'), roughness=0.9))

    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.05 * s, segments=8, ring_count=6,
                                         location=(x * SCALE, y * SCALE, (z + 0.22 * s)))
    head = bpy.context.object
    head.name = 'FlowerHead'
    head.data.materials.append(new_material(f'FHead{x}{y}', hex_to_rgba(color), roughness=0.4,
                                            emissive=hex_to_rgba(color), emissive_strength=0.6))


def add_water_ring(color='#4fc3f7', radius=1.9 * SCALE, opacity=0.35):
    """Wasser-Ring um die Insel (transparente Scheibe)."""
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=0.05 * SCALE, vertices=64,
                                        location=(0, 0, 0.02 * SCALE))
    water = bpy.context.object
    water.name = 'WaterRing'
    mat = new_material('Water', hex_to_rgba(color), roughness=0.1, metalness=0.5)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Alpha'].default_value = opacity
    mat.blend_method = 'BLEND'
    water.data.materials.append(mat)


def add_cloud_ring(radius=2.2 * SCALE, count=6, y=0.9 * SCALE, color='#ffffff'):
    """Wolken-Ring um schwebende Inseln."""
    for i in range(count):
        a = math.radians(i * (360 / count))
        add_cloud(math.cos(a) * radius * 0.5, math.sin(a) * radius * 0.5, y, color, 0.7)


def add_grass_clumps(z=0.5 * SCALE):
    """Grasbueschel verteilen (Details)."""
    for i in range(14):
        a = random.random() * math.pi * 2
        r = 0.8 * SCALE + random.random() * 1.1 * SCALE
        add_bush(math.cos(a) * r / SCALE, math.sin(a) * r / SCALE, z, '#66bb6a', 0.4 + random.random() * 0.3)


def add_flower_field(z=0.5 * SCALE):
    """Blumenwiese."""
    colors = ['#ff80ab', '#ffd54f', '#ba68c8', '#4dd0e1', '#ff8a65']
    for i in range(10):
        a = random.random() * math.pi * 2
        r = 0.5 * SCALE + random.random() * 1.3 * SCALE
        add_flower(math.cos(a) * r / SCALE, math.sin(a) * r / SCALE, z, colors[i % len(colors)], 0.5)


def generate_island(name, base_color, ground_color, decor_fn, water=False, clouds=False):
    clear_scene()
    add_island_base(base_color)
    add_ground_layer(ground_color)
    if water:
        add_water_ring()
    if clouds:
        add_cloud_ring()
    decor_fn()
    add_grass_clumps()
    add_flower_field()
    out_path = os.path.join(OUT_DIR, f'{name}.glb')
    bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', use_selection=False)
    print(f'OK: {out_path}')


def island_sonnenstrand():
    """1 · Sonnenstrand — Tuerkis, Sandgelb, Korallenrot."""
    add_palm(1.0, 0.7, 0.5)
    add_palm(-1.1, -0.6, 0.5, 0.9, 0.2)
    add_palm(-0.3, 1.2, 0.5, 1.1, -0.15)
    add_palm(0.6, -1.2, 0.5, 0.8)
    add_house(-0.9, 1.0, 0.4, '#ff8a65', '#ff6b6b', 0.8)
    add_house(1.2, -0.8, 0.4, '#4ecdc4', '#2a9d8f', 0.7)
    add_rock(1.2, 1.1, 0.4, '#ffa08c', 0.8)
    add_rock(-1.3, -1.0, 0.4, '#ffccbc', 0.6)
    add_balloon(0.0, -1.4, 0.4, '#ff6b6b')
    add_balloon(-1.4, 0.2, 0.4, '#4ecdc4')
    add_balloon(0.9, 1.3, 0.4, '#ffe66d')


def island_zuckerwald():
    """2 · Zuckerwald — Rosa, Schokobraun, Mintgruen."""
    add_house(0.7, 0.6, 0.4, '#f8bbd0', '#f06292', 0.9)
    add_house(-0.9, -0.7, 0.4, '#e1bee7', '#ba68c8', 0.8)
    add_house(-0.4, 1.1, 0.4, '#f48fb1', '#ec407a', 0.7)
    add_tree(1.1, -0.8, 0.5, '#8d6e63', '#a5d6a7', '#80cbc4', 1.1)
    add_tree(-1.0, 0.9, 0.5, '#6d4c41', '#f8bbd0', '#f48fb1', 0.9)
    add_tree(0.2, -0.3, 0.5, '#5d4037', '#c5e1a5', '#aed581', 1.2)
    add_tree(1.2, 1.0, 0.5, '#4e342e', '#b2dfdb', '#80cbc4', 0.8)
    # Zuckerstangen (rot-weiss gestreift = kleine Zylinder)
    for i, (sx, sy) in enumerate([(0.0, 1.3), (-1.3, 0.0), (0.9, -1.2)]):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.08 * SCALE, depth=0.7 * SCALE, vertices=12,
                                            location=(sx * SCALE, sy * SCALE, 0.85 * SCALE))
        cane = bpy.context.object
        cane.name = f'CandyCane{i}'
        cane.rotation_euler = (0.2, 0.3, 0)
        cane.data.materials.append(new_material(f'Cane{i}', hex_to_rgba('#f06292'), roughness=0.5,
                                                emissive=hex_to_rgba('#f06292'), emissive_strength=0.3))
    add_balloon(0.5, -1.3, 0.4, '#ff80ab')
    add_balloon(-0.8, -1.0, 0.4, '#a5d6a7')


def island_wolkenwerk():
    """3 · Wolkenwerk — Hellblau, Weiss, Regenbogen."""
    add_cloud(-0.6, 0.4, 0.6, '#e3f2fd', 1.1)
    add_cloud(0.7, -0.6, 0.6, '#ffffff', 0.9)
    add_cloud(0.3, 0.8, 0.6, '#bbdefb', 0.8)
    add_cloud(-0.8, -0.8, 0.6, '#e1f5fe', 1.0)
    add_cloud(0.0, 0.0, 0.6, '#ffffff', 1.3)
    add_star(1.1, 0.7, 0.6, '#ffd34e', 0.9)
    add_star(-1.2, 0.5, 0.6, '#ff80ab', 0.7)
    add_star(0.8, -1.1, 0.6, '#4fc3f7', 0.8)
    add_balloon(-0.4, -1.2, 0.5, '#4fc3f7')
    add_balloon(0.6, 1.1, 0.5, '#ff80ab')
    add_balloon(-1.1, -0.3, 0.5, '#ba68c8')


def island_frostgipfel():
    """4 · Frostgipfel — Eisblau, Weiss, Violett."""
    add_rock(0.8, 0.5, 0.5, '#b3e5fc', 1.3)
    add_rock(-0.9, -0.6, 0.5, '#e1f5fe', 1.1)
    add_rock(0.3, -1.1, 0.5, '#90caf9', 0.9)
    add_crystal(0.3, 0.9, 0.5, '#29b6f6', 0.9)
    add_crystal(-0.7, 0.8, 0.5, '#7b2ff7', 0.7)
    add_crystal(1.1, -0.9, 0.5, '#4fc3f7', 0.8)
    add_crystal(-0.3, -0.4, 0.5, '#7986cb', 0.6)
    # Eiszapfen (kleine Kegel unter Felsen)
    for i, (sx, sy) in enumerate([(0.8, 0.5), (-0.9, -0.6), (0.3, -1.1)]):
        for j in range(3):
            bpy.ops.mesh.primitive_cone_add(radius1=0.04 * SCALE, depth=0.3 * SCALE, vertices=6,
                                            location=((sx + (j - 1) * 0.15) * SCALE, sy * SCALE, 0.1 * SCALE))
            icicle = bpy.context.object
            icicle.name = f'Icicle{i}{j}'
            icicle.data.materials.append(new_material(f'Ice{i}{j}', hex_to_rgba('#e1f5fe'), roughness=0.3,
                                                      metalness=0.4, emissive=hex_to_rgba('#b3e5fc'), emissive_strength=0.2))
    add_tree(-0.4, 0.3, 0.5, '#90caf9', '#e1f5fe', '#ffffff', 0.9)
    add_star(-1.2, -0.8, 0.5, '#b3e5fc', 0.6)


def island_dschungeltempel():
    """5 · Dschungeltempel — Dschungelgruen, Gold, Braun."""
    add_tree(0.9, 0.8, 0.5, '#6d4c41', '#388e3c', '#2e7d32', 1.1)
    add_tree(-1.1, 0.5, 0.5, '#5d4037', '#4caf50', '#2e7d32', 1.0)
    add_tree(0.6, -1.0, 0.5, '#4e342e', '#66bb6a', '#388e3c', 1.2)
    add_tree(-0.7, -1.1, 0.5, '#3e2723', '#43a047', '#1b5e20', 0.9)
    # Tempel (Pyramide aus Kisten, 3 Stufen)
    bpy.ops.mesh.primitive_cube_add(size=1.0 * SCALE, location=(0, 0, 0.5 * SCALE))
    t1 = bpy.context.object
    t1.name = 'Temple'
    t1.data.materials.append(new_material('Temple', hex_to_rgba('#8d6e63'), roughness=0.85))
    bpy.ops.mesh.primitive_cube_add(size=0.7 * SCALE, location=(0, 0, 1.1 * SCALE))
    t2 = bpy.context.object
    t2.name = 'TempleMid'
    t2.data.materials.append(new_material('TempleMid', hex_to_rgba('#a1887f'), roughness=0.85))
    bpy.ops.mesh.primitive_cube_add(size=0.4 * SCALE, location=(0, 0, 1.6 * SCALE))
    t3 = bpy.context.object
    t3.name = 'TempleTop'
    t3.data.materials.append(new_material('TempleTop', hex_to_rgba('#fdd835'), roughness=0.6, metalness=0.4,
                                          emissive=hex_to_rgba('#fdd835'), emissive_strength=0.4))
    # Goldene Spitze
    bpy.ops.mesh.primitive_cone_add(radius1=0.2 * SCALE, depth=0.4 * SCALE, vertices=10,
                                    location=(0, 0, 2.0 * SCALE))
    spike = bpy.context.object
    spike.name = 'TempleSpike'
    spike.data.materials.append(new_material('Spike', hex_to_rgba('#ffd34e'), roughness=0.3, metalness=0.6,
                                             emissive=hex_to_rgba('#ffd34e'), emissive_strength=0.5))
    add_rock(-0.5, 0.3, 0.5, '#795548', 0.7)
    add_crystal(0.5, 1.1, 0.5, '#fdd835', 0.5)
    add_balloon(-0.2, -1.2, 0.4, '#fdd835')


def island_mechanikstadt():
    """6 · Mechanik-Stadt — Silber, Orange, Gelb."""
    add_gear(0.9, 0.7, 0.4, '#ff9800', 1.1)
    add_gear(-1.0, 0.6, 0.4, '#fdd835', 0.8)
    add_gear(0.5, -0.9, 0.4, '#90a4ae', 0.9)
    add_gear(-0.6, -0.8, 0.4, '#ff6d00', 0.7)
    add_house(-0.6, -0.5, 0.4, '#cfd8dc', '#607d8b', 0.9)
    add_house(1.1, -0.4, 0.4, '#b0bec5', '#78909c', 0.8)
    add_house(-0.2, 1.2, 0.4, '#eceff1', '#546e7a', 0.7)
    # Rohre (zylindrische Verbindungen)
    for i, (p1, p2) in enumerate([((0.9, 0.7), (-1.0, 0.6)), ((0.5, -0.9), (-0.6, -0.8))]):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.06 * SCALE, depth=2.0 * SCALE, vertices=10,
                                            location=(((p1[0] + p2[0]) / 2) * SCALE, ((p1[1] + p2[1]) / 2) * SCALE, 0.55 * SCALE))
        pipe = bpy.context.object
        pipe.name = f'Pipe{i}'
        pipe.rotation_euler = (0, 0, math.atan2(p2[1] - p1[1], p2[0] - p1[0]))
        pipe.data.materials.append(new_material(f'Pipe{i}', hex_to_rgba('#546e7a'), roughness=0.4, metalness=0.7))
    add_crystal(-0.3, 0.9, 0.5, '#ffd54f', 0.6)
    add_star(1.2, 1.0, 0.5, '#ff9800', 0.5)


def island_sternenzitadelle():
    """7 · Sternenzitadelle — Gold, Tiefblau, Magenta."""
    add_star(1.0, 0.8, 0.5, '#ffd34e', 1.1)
    add_star(-1.0, 0.7, 0.5, '#ff3cac', 0.8)
    add_star(0.7, -1.0, 0.5, '#7b2ff7', 0.9)
    add_star(-0.7, -0.9, 0.5, '#ffd34e', 0.7)
    add_star(0.0, 1.2, 0.5, '#29b6f6', 0.7)
    add_crystal(0.0, 0.0, 0.5, '#7b2ff7', 1.2)
    add_crystal(-0.5, 0.4, 0.5, '#ff3cac', 0.8)
    add_crystal(0.5, -0.4, 0.5, '#29b6f6', 0.8)
    # Turm (2-stoeckig mit Zinnen)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.35 * SCALE, depth=1.4 * SCALE, vertices=20,
                                        location=(0, 0, 1.2 * SCALE))
    tower = bpy.context.object
    tower.name = 'CitadelTower'
    tower.data.materials.append(new_material('Tower', hex_to_rgba('#ffe082'), roughness=0.5, metalness=0.5))
    bpy.ops.mesh.primitive_cylinder_add(radius=0.28 * SCALE, depth=0.8 * SCALE, vertices=16,
                                        location=(0, 0, 2.2 * SCALE))
    tower2 = bpy.context.object
    tower2.name = 'CitadelTower2'
    tower2.data.materials.append(new_material('Tower2', hex_to_rgba('#fff59d'), roughness=0.5, metalness=0.5))
    bpy.ops.mesh.primitive_cone_add(radius1=0.4 * SCALE, depth=0.6 * SCALE, vertices=16,
                                    location=(0, 0, 2.9 * SCALE))
    tower_top = bpy.context.object
    tower_top.name = 'CitadelTop'
    tower_top.data.materials.append(new_material('TowerTop', hex_to_rgba('#7b2ff7'), roughness=0.3, metalness=0.4,
                                                 emissive=hex_to_rgba('#7b2ff7'), emissive_strength=0.8))
    # Zinnen
    for i in range(6):
        a = math.radians(i * 60)
        bpy.ops.mesh.primitive_cube_add(size=1.0,
                                        location=(math.cos(a) * 0.3 * SCALE, math.sin(a) * 0.3 * SCALE, 1.8 * SCALE))
        cren = bpy.context.object
        cren.name = f'Crenellation{i}'
        cren.scale = (0.1 * SCALE, 0.1 * SCALE, 0.25 * SCALE)
        cren.data.materials.append(new_material(f'Cren{i}', hex_to_rgba('#ffe082'), roughness=0.5, metalness=0.5))
    add_balloon(-0.4, -1.2, 0.4, '#ff3cac')
    add_balloon(1.1, -0.5, 0.4, '#29b6f6')


ISLANDS = [
    ('01_sonnenstrand',    '#ffe082', '#ffcc80', island_sonnenstrand, True, False),
    ('02_zuckerwald',      '#f8bbd0', '#e1bee7', island_zuckerwald, False, False),
    ('03_wolkenwerk',      '#e3f2fd', '#bbdefb', island_wolkenwerk, False, True),
    ('04_frostgipfel',     '#e1f5fe', '#b3e5fc', island_frostgipfel, False, False),
    ('05_dschungeltempel', '#a5d6a7', '#81c784', island_dschungeltempel, False, False),
    ('06_mechanikstadt',   '#cfd8dc', '#b0bec5', island_mechanikstadt, False, False),
    ('07_sternenzitadelle','#ffe082', '#ffd54f', island_sternenzitadelle, False, False),
]

if __name__ == '__main__':
    for name, base, ground, fn, water, clouds in ISLANDS:
        try:
            generate_island(name, base, ground, fn, water, clouds)
        except Exception as e:
            print(f'FEHLER {name}: {e}')
    print('FERTIG')
