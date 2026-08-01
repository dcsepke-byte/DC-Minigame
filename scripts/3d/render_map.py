"""Party Arena — Gesamtkarte rendern (Blender 4.2 headless)

Lädt alle 7 Insel-GLBs und positioniert sie als Kleeblatt-Karte
(wie die Board-Topologie in scene3d.js), rendert ein grosses PNG.
Aufruf: blender -b -P scripts/3d/render_map.py
"""
import bpy
import math
import os

GLB_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'blender-assets', 'islands')
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'blender-assets', 'previews')
os.makedirs(OUT_DIR, exist_ok=True)

# Reihenfolge + Positionierung (Kleeblatt, wie Board)
ISLANDS = [
    ('01_sonnenstrand',    0,  7, 0),
    ('02_zuckerwald',      5,  3, 0),
    ('03_wolkenwerk',      7, -3, 0.8),
    ('04_frostgipfel',     4, -6, 0.2),
    ('05_dschungeltempel', 0, -7, 0),
    ('06_mechanikstadt',  -4, -6, 0),
    ('07_sternenzitadelle',-7, -3, 0.5),
]

RADIUS = 10.0
CENTER_Y = 0


def setup_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # Kamera — schraeg von oben, weit genug fuer alle Inseln
    cam_data = bpy.data.cameras.new('Cam')
    cam = bpy.data.objects.new('Cam', cam_data)
    cam.location = (0, -22, 16)
    cam.rotation_euler = (math.radians(55), 0, 0)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    cam_data.lens = 35

    # Licht
    bpy.ops.object.light_add(type='SUN', location=(8, -8, 18))
    bpy.context.object.data.energy = 3.0
    bpy.ops.object.light_add(type='AREA', location=(0, -12, 12))
    bpy.context.object.data.energy = 100.0

    # Render: Cycles CPU, hochaufloesend
    bpy.context.scene.render.engine = 'CYCLES'
    bpy.context.scene.cycles.samples = 48
    bpy.context.scene.render.resolution_x = 1920
    bpy.context.scene.render.resolution_y = 1080
    bpy.context.scene.render.image_settings.file_format = 'PNG'

    # Boden (Wasser/Abgrund)
    bpy.ops.mesh.primitive_cylinder_add(radius=26, depth=0.2, vertices=96, location=(0, 0, -0.3))
    floor = bpy.context.object
    floor.name = 'Ocean'
    mat = bpy.data.materials.new('OceanMat')
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (0.05, 0.15, 0.3, 1.0)
        bsdf.inputs['Roughness'].default_value = 0.1
        bsdf.inputs['Metallic'].default_value = 0.6
    floor.data.materials.append(mat)

    # Pfad-Boegen zwischen Inseln (Bruecken/Wege)
    for i in range(len(ISLANDS)):
        n1, x1, y1, _ = ISLANDS[i]
        n2, x2, y2, _ = ISLANDS[(i + 1) % len(ISLANDS)]
        # Torus-Segment als Pfad
        mid_x = (x1 + x2) / 2
        mid_y = (y1 + y2) / 2
        bpy.ops.mesh.primitive_torus_add(major_radius=1.5, minor_radius=0.15,
                                         major_segments=24, minor_segments=8,
                                         location=(mid_x, mid_y, 0.1))
        path = bpy.context.object
        path.name = f'Path{i}'
        path.rotation_euler = (math.radians(90), 0, math.atan2(y2 - y1, x2 - x1))
        pm = bpy.data.materials.new(f'PathMat{i}')
        pm.use_nodes = True
        pbsdf = pm.node_tree.nodes.get('Principled BSDF')
        if pbsdf:
            pbsdf.inputs['Base Color'].default_value = (0.9, 0.7, 0.3, 1.0)
            pbsdf.inputs['Roughness'].default_value = 0.7
            pbsdf.inputs['Emission Color'].default_value = (0.9, 0.7, 0.3, 1.0)
            pbsdf.inputs['Emission Strength'].default_value = 0.3
        path.data.materials.append(pm)


def render_map():
    setup_scene()
    for name, x, y, lift in ISLANDS:
        glb_path = os.path.join(GLB_DIR, f'{name}.glb')
        bpy.ops.import_scene.gltf(filepath=glb_path)
        # Alle importierten Objekte in eine Gruppe packen und positionieren
        imported = [o for o in bpy.context.selected_objects]
        for o in imported:
            o.location.x += x
            o.location.y += y
            o.location.z += lift
    out_path = os.path.join(OUT_DIR, 'karte_gesamt.png')
    bpy.context.scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print(f'OK: {out_path}')


if __name__ == '__main__':
    render_map()
    print('FERTIG')
