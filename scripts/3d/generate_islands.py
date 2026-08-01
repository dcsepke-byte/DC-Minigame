"""Party Arena — Insel-Generator (Blender 4.2, headless)

Erzeugt die 7 Konzept-Inseln aus dem Spielwelt-Konzept (Aethonia):
1. Sonnenstrand    — Türkis, Sandgelb, Korallenrot (Palmen, Strand)
2. Zuckerwald      — Rosa, Schokobraun, Mintgrün (Bonbons, Kuchen)
3. Wolkenwerk      — Hellblau, Weiß, Regenbogen (schwebend, Wolken)
4. Frostgipfel     — Eisblau, Weiß, Violett (Eis, Schnee)
5. Dschungeltempel — Dschungelgrün, Gold, Braun (Tempel, Lianen)
6. Mechanik-Stadt  — Silber, Orange, Gelb (Zahnräder, Roboter)
7. Sternenzitadelle— Gold, Tiefblau, Magenta (Sterne, Türme)

Exportiert jede Insel als .glb in blender-assets/islands/.
Aufruf: blender -b -P scripts/3d/generate_islands.py
"""
import bpy
import math
import os
import random

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'blender-assets', 'islands')
os.makedirs(OUT_DIR, exist_ok=True)

# Seeded RNG für reproduzierbare Ergebnisse
random.seed(20260801)


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # Light + Camera
    bpy.ops.object.light_add(type='SUN', location=(5, 5, 10))
    cam_data = bpy.data.cameras.new('Cam')
    cam = bpy.data.objects.new('Cam', cam_data)
    cam.location = (0, -8, 6)
    cam.rotation_euler = (math.radians(60), 0, 0)
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


def add_island_base(color, radius=2.0, height=0.4, bevel=True):
    """Flacher Zylinder mit abgerundetem Rand (Konzept: 'flache Zylinder mit abgerundetem Rand')."""
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=height, vertices=32, location=(0, 0, height/2))
    base = bpy.context.object
    base.name = 'IslandBase'
    if bevel:
        bpy.ops.object.modifier_add(type='BEVEL')
        bpy.context.object.modifiers['Bevel'].width = 0.08
        bpy.context.object.modifiers['Bevel'].segments = 4
    base.data.materials.append(new_material('IslandMat', hex_to_rgba(color), roughness=0.85, metalness=0.05))
    return base


def add_ground_layer(color, radius=1.7, height=0.12, y=0.45):
    """Obere Grüne/Sand-Schicht der Insel."""
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=height, vertices=32, location=(0, 0, y))
    layer = bpy.context.object
    layer.name = 'GroundLayer'
    layer.data.materials.append(new_material('GroundMat', hex_to_rgba(color), roughness=0.9))
    return layer


def add_tree(x, y, z, trunk_color='#8b5a2b', leaf_color='#2ecc71', leaf2_color='#27ae60', scale=1.0):
    """Kapsel-Stamm + Kugel-Krone (Konzept: 'Bäume: Kapsel-Stamm + Kugel-Krone')."""
    bpy.ops.mesh.primitive_cylinder_add(radius=0.12*scale, depth=0.7*scale, vertices=8, location=(x, y, z + 0.35*scale))
    trunk = bpy.context.object
    trunk.name = 'TreeTrunk'
    trunk.data.materials.append(new_material(f'Trunk{x}{y}', hex_to_rgba(trunk_color), roughness=0.9))

    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.35*scale, segments=12, ring_count=8, location=(x, y, z + 0.85*scale))
    crown = bpy.context.object
    crown.name = 'TreeCrown'
    crown.data.materials.append(new_material(f'Crown{x}{y}', hex_to_rgba(leaf_color), roughness=0.8, emissive=hex_to_rgba(leaf2_color), emissive_strength=0.05))

    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.18*scale, segments=8, ring_count=6, location=(x + 0.2*scale, y + 0.15*scale, z + 0.7*scale))
    crown2 = bpy.context.object
    crown2.name = 'TreeCrown2'
    crown2.data.materials.append(new_material(f'Crown2{x}{y}', hex_to_rgba(leaf2_color), roughness=0.8))


def add_palm(x, y, z, scale=1.0):
    """Gekrümmter Stamm + Palmblatt-Scheiben (Konzept: 'Palmen: gekrümmter Zylinder-Stamm + Palmblatt-Scheiben')."""
    bpy.ops.mesh.primitive_cylinder_add(radius=0.1*scale, depth=0.9*scale, vertices=8, location=(x, y, z + 0.45*scale))
    trunk = bpy.context.object
    trunk.name = 'PalmTrunk'
    trunk.rotation_euler = (0.15*scale, 0.1*scale, 0)
    trunk.data.materials.append(new_material(f'PalmTrunk{x}{y}', hex_to_rgba('#8b5a2b'), roughness=0.9))

    for i, ang in enumerate([0, 72, 144, 216, 288]):
        a = math.radians(ang)
        bpy.ops.mesh.primitive_cone_add(radius1=0.28*scale, depth=0.08*scale, vertices=6,
                                        location=(x + math.cos(a)*0.25*scale, y + math.sin(a)*0.25*scale, z + 0.95*scale))
        leaf = bpy.context.object
        leaf.name = f'PalmLeaf{i}'
        leaf.rotation_euler = (math.radians(75), 0, -a)
        leaf.data.materials.append(new_material(f'PalmLeaf{i}{x}{y}', hex_to_rgba('#27ae60'), roughness=0.8))


def add_house(x, y, z, wall_color, roof_color='#d32f2f', scale=1.0):
    """Abgerundeter Würfel mit Kegel-Dach (Konzept: 'Häuser: abgerundete Würfel mit Kegel-/Halbkugel-Dächern')."""
    bpy.ops.mesh.primitive_cube_add(size=0.6*scale, location=(x, y, z + 0.3*scale))
    walls = bpy.context.object
    walls.name = 'HouseWalls'
    walls.data.materials.append(new_material(f'HouseWalls{x}{y}', hex_to_rgba(wall_color), roughness=0.8))

    bpy.ops.mesh.primitive_cone_add(radius1=0.5*scale, depth=0.4*scale, vertices=8, location=(x, y, z + 0.7*scale))
    roof = bpy.context.object
    roof.name = 'HouseRoof'
    roof.data.materials.append(new_material(f'HouseRoof{x}{y}', hex_to_rgba(roof_color), roughness=0.75))


def add_rock(x, y, z, color='#90a4ae', scale=1.0):
    """Vulkan-Kegel oder Felsen."""
    bpy.ops.mesh.primitive_cone_add(radius1=0.4*scale, depth=0.6*scale, vertices=8, location=(x, y, z + 0.3*scale))
    rock = bpy.context.object
    rock.name = 'Rock'
    rock.data.materials.append(new_material(f'Rock{x}{y}', hex_to_rgba(color), roughness=0.9))


def add_crystal(x, y, z, color='#7b2ff7', scale=1.0):
    """Kristall-Spitze (leuchtend)."""
    bpy.ops.mesh.primitive_cone_add(radius1=0.15*scale, depth=0.8*scale, vertices=6, location=(x, y, z + 0.4*scale))
    crystal = bpy.context.object
    crystal.name = 'Crystal'
    crystal.rotation_euler = (0.1, 0.2, 0)
    crystal.data.materials.append(new_material(f'Crystal{x}{y}', hex_to_rgba(color), roughness=0.3, metalness=0.4,
                                               emissive=hex_to_rgba(color), emissive_strength=0.8))


def add_gear(x, y, z, color='#ff9800', scale=1.0):
    """Zahnrad (Torus + Zähne)."""
    bpy.ops.mesh.primitive_torus_add(major_radius=0.3*scale, minor_radius=0.07*scale, major_segments=24, minor_segments=8,
                                     location=(x, y, z + 0.3*scale))
    gear = bpy.context.object
    gear.name = 'Gear'
    gear.rotation_euler = (math.radians(90), 0, 0)
    gear.data.materials.append(new_material(f'Gear{x}{y}', hex_to_rgba(color), roughness=0.4, metalness=0.7))

    # Zähne
    for i in range(8):
        a = math.radians(i * 45)
        bpy.ops.mesh.primitive_cube_add(size=0.14*scale, location=(x + math.cos(a)*0.33*scale, y + math.sin(a)*0.33*scale, z + 0.3*scale))
        tooth = bpy.context.object
        tooth.name = f'GearTooth{i}'
        tooth.data.materials.append(new_material(f'Tooth{i}{x}{y}', hex_to_rgba(color), roughness=0.4, metalness=0.7))


def add_cloud(x, y, z, color='#ffffff', scale=1.0):
    """Wolke (Gruppe aus Halbkugeln, Konzept)."""
    for i, (dx, dy, r) in enumerate([(-0.25, 0, 0.2), (0, 0.08, 0.3), (0.25, 0, 0.2), (0, 0, 0.25)]):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=r*scale, segments=12, ring_count=8,
                                             location=(x + dx*scale, y + dy*scale, z + 0.15*scale))
        cloud = bpy.context.object
        cloud.name = f'Cloud{i}'
        cloud.data.materials.append(new_material(f'Cloud{i}{x}{y}', hex_to_rgba(color), roughness=1.0))


def add_balloon(x, y, z, color='#ff3cac', scale=1.0):
    """Luftballon (Konzept: 'Luftballons treiben vorbei')."""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.25*scale, segments=12, ring_count=8, location=(x, y, z + 0.6*scale))
    ball = bpy.context.object
    ball.name = 'Balloon'
    ball.data.materials.append(new_material(f'Balloon{x}{y}', hex_to_rgba(color), roughness=0.4, metalness=0.1))
    bpy.ops.mesh.primitive_cylinder_add(radius=0.01*scale, depth=0.3*scale, vertices=4, location=(x, y, z + 0.32*scale))
    string = bpy.context.object
    string.name = 'BalloonString'
    string.data.materials.append(new_material(f'BString{x}{y}', hex_to_rgba('#333333'), roughness=0.9))


def add_star(x, y, z, color='#ffd34e', scale=1.0):
    """Leuchtender Stern (Konzept: ArenaStar)."""
    bpy.ops.mesh.primitive_ico_sphere_add(radius=0.25*scale, subdivisions=1, location=(x, y, z + 0.5*scale))
    star = bpy.context.object
    star.name = 'Star'
    star.data.materials.append(new_material(f'Star{x}{y}', hex_to_rgba(color), roughness=0.2, metalness=0.3,
                                            emissive=hex_to_rgba(color), emissive_strength=1.2))


def generate_island(name, base_color, ground_color, decor_fn):
    clear_scene()
    add_island_base(base_color)
    add_ground_layer(ground_color)
    decor_fn()
    # Export als .glb
    out_path = os.path.join(OUT_DIR, f'{name}.glb')
    bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', use_selection=False)
    print(f'OK: {out_path}')


def island_sonnenstrand():
    """1 · Sonnenstrand — Türkis, Sandgelb, Korallenrot (Palmen, Strand, Boote)."""
    add_palm(0.8, 0.6, 0.5)
    add_palm(-0.9, -0.5, 0.5, 0.8)
    add_palm(-0.2, 1.0, 0.5, 0.9)
    add_house(-0.7, 0.9, 0.4, '#ff8a65', '#ff6b6b', 0.7)
    add_rock(1.0, -0.9, 0.4, '#ffa08c', 0.6)
    add_balloon(0.0, -1.1, 0.4, '#ff6b6b')
    add_balloon(-1.1, 0.0, 0.4, '#4ecdc4')


def island_zuckerwald():
    """2 · Zuckerwald — Rosa, Schokobraun, Mintgrün (Bonbons, Kuchen)."""
    add_house(0.6, 0.5, 0.4, '#f8bbd0', '#f06292', 0.8)
    add_house(-0.7, -0.6, 0.4, '#e1bee7', '#ba68c8', 0.7)
    add_tree(0.9, -0.7, 0.5, '#8d6e63', '#a5d6a7', '#80cbc4', 1.0)
    add_tree(-0.8, 0.8, 0.5, '#6d4c41', '#f8bbd0', '#f48fb1', 0.9)
    add_tree(0.0, -0.2, 0.5, '#5d4037', '#c5e1a5', '#aed581', 1.1)
    add_balloon(1.0, 0.9, 0.4, '#ff80ab')
    add_balloon(-1.1, -0.1, 0.4, '#a5d6a7')


def island_wolkenwerk():
    """3 · Wolkenwerk — Hellblau, Weiß, Regenbogen (schwebend, Wolken)."""
    # Insel selbst höher = schwebender Look
    add_cloud(-0.5, 0.3, 0.6, '#e3f2fd', 1.0)
    add_cloud(0.6, -0.5, 0.6, '#ffffff', 0.8)
    add_cloud(0.2, 0.7, 0.6, '#bbdefb', 0.7)
    add_cloud(-0.7, -0.7, 0.6, '#e1f5fe', 0.9)
    add_star(0.9, 0.6, 0.6, '#ffd34e', 0.8)
    add_balloon(-0.3, -0.9, 0.5, '#4fc3f7')
    add_balloon(0.5, 0.9, 0.5, '#ff80ab')


def island_frostgipfel():
    """4 · Frostgipfel — Eisblau, Weiß, Violett (Eis, Schnee)."""
    add_rock(0.7, 0.4, 0.5, '#b3e5fc', 1.1)
    add_rock(-0.8, -0.5, 0.5, '#e1f5fe', 0.9)
    add_crystal(0.2, 0.8, 0.5, '#29b6f6', 0.8)
    add_crystal(-0.6, 0.7, 0.5, '#7b2ff7', 0.6)
    add_crystal(0.9, -0.8, 0.5, '#4fc3f7', 0.7)
    add_tree(-0.3, -0.4, 0.5, '#90caf9', '#e1f5fe', '#ffffff', 0.8)


def island_dschungeltempel():
    """5 · Dschungeltempel — Dschungelgrün, Gold, Braun (Tempel, Lianen)."""
    add_tree(0.8, 0.7, 0.5, '#6d4c41', '#388e3c', '#2e7d32', 1.0)
    add_tree(-0.9, 0.4, 0.5, '#5d4037', '#4caf50', '#2e7d32', 0.9)
    add_tree(0.5, -0.9, 0.5, '#4e342e', '#66bb6a', '#388e3c', 1.1)
    # Tempel (Pyramide aus Kisten)
    bpy.ops.mesh.primitive_cube_add(size=0.8, location=(0, 0, 0.7))
    temple = bpy.context.object
    temple.name = 'Temple'
    temple.data.materials.append(new_material('Temple', hex_to_rgba('#8d6e63'), roughness=0.85))
    bpy.ops.mesh.primitive_cube_add(size=0.5, location=(0, 0, 1.15))
    temple2 = bpy.context.object
    temple2.name = 'TempleTop'
    temple2.data.materials.append(new_material('TempleTop', hex_to_rgba('#fdd835'), roughness=0.6, metalness=0.4,
                                               emissive=hex_to_rgba('#fdd835'), emissive_strength=0.2))
    add_rock(-0.4, 0.2, 0.5, '#795548', 0.6)


def island_mechanikstadt():
    """6 · Mechanik-Stadt — Silber, Orange, Gelb (Zahnräder, Roboter)."""
    add_gear(0.7, 0.6, 0.4, '#ff9800', 1.0)
    add_gear(-0.8, 0.5, 0.4, '#fdd835', 0.7)
    add_gear(0.4, -0.8, 0.4, '#90a4ae', 0.8)
    add_house(-0.5, -0.6, 0.4, '#cfd8dc', '#607d8b', 0.8)
    add_house(0.9, -0.3, 0.4, '#b0bec5', '#78909c', 0.7)
    add_crystal(-0.2, 0.9, 0.5, '#ffd54f', 0.5)


def island_sternenzitadelle():
    """7 · Sternenzitadelle — Gold, Tiefblau, Magenta (Sterne, Türme)."""
    add_star(0.8, 0.7, 0.5, '#ffd34e', 1.0)
    add_star(-0.8, 0.6, 0.5, '#ff3cac', 0.7)
    add_star(0.5, -0.8, 0.5, '#7b2ff7', 0.8)
    add_star(-0.6, -0.7, 0.5, '#ffd34e', 0.6)
    add_crystal(0.0, 0.0, 0.5, '#7b2ff7', 1.0)
    # Turm
    bpy.ops.mesh.primitive_cylinder_add(radius=0.3, depth=1.0, vertices=16, location=(0, 0, 1.0))
    tower = bpy.context.object
    tower.name = 'CitadelTower'
    tower.data.materials.append(new_material('Tower', hex_to_rgba('#ffe082'), roughness=0.5, metalness=0.5))
    bpy.ops.mesh.primitive_cone_add(radius1=0.45, depth=0.5, vertices=16, location=(0, 0, 1.75))
    tower_top = bpy.context.object
    tower_top.name = 'CitadelTop'
    tower_top.data.materials.append(new_material('TowerTop', hex_to_rgba('#7b2ff7'), roughness=0.3, metalness=0.4,
                                                 emissive=hex_to_rgba('#7b2ff7'), emissive_strength=0.6))


ISLANDS = [
    ('01_sonnenstrand',    '#ffe082', '#ffcc80', island_sonnenstrand),
    ('02_zuckerwald',      '#f8bbd0', '#e1bee7', island_zuckerwald),
    ('03_wolkenwerk',      '#e3f2fd', '#bbdefb', island_wolkenwerk),
    ('04_frostgipfel',     '#e1f5fe', '#b3e5fc', island_frostgipfel),
    ('05_dschungeltempel', '#a5d6a7', '#81c784', island_dschungeltempel),
    ('06_mechanikstadt',   '#cfd8dc', '#b0bec5', island_mechanikstadt),
    ('07_sternenzitadelle','#ffe082', '#ffd54f', island_sternenzitadelle),
]

if __name__ == '__main__':
    for name, base, ground, fn in ISLANDS:
        try:
            generate_island(name, base, ground, fn)
        except Exception as e:
            print(f'FEHLER {name}: {e}')
    print('FERTIG')
