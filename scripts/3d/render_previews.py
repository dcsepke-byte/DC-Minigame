"""Party Arena — Insel-Previews rendern (Blender 4.2 headless)

Lädt jede generierte Insel .glb und rendert sie als PNG (für Review).
Aufruf: blender -b -P scripts/3d/render_previews.py
"""
import bpy
import os
import math

GLB_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'blender-assets', 'islands')
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'blender-assets', 'previews')
os.makedirs(OUT_DIR, exist_ok=True)


def setup_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # Kamera
    cam_data = bpy.data.cameras.new('Cam')
    cam = bpy.data.objects.new('Cam', cam_data)
    cam.location = (0, -6, 4)
    cam.rotation_euler = (math.radians(55), 0, 0)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    # Licht
    bpy.ops.object.light_add(type='SUN', location=(4, 4, 8))
    bpy.context.object.data.energy = 2.0
    bpy.ops.object.light_add(type='AREA', location=(0, -4, 6))
    bpy.context.object.data.energy = 50.0
    # Render-Einstellungen (CPU-only — kein OpenGL auf Headless-VM)
    bpy.context.scene.render.engine = 'CYCLES'
    bpy.context.scene.cycles.samples = 32
    bpy.context.scene.render.resolution_x = 800
    bpy.context.scene.render.resolution_y = 800
    bpy.context.scene.render.image_settings.file_format = 'PNG'


def render_island(name):
    setup_scene()
    glb_path = os.path.join(GLB_DIR, f'{name}.glb')
    bpy.ops.import_scene.gltf(filepath=glb_path)
    out_path = os.path.join(OUT_DIR, f'{name}.png')
    bpy.context.scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print(f'OK: {out_path}')


if __name__ == '__main__':
    for f in sorted(os.listdir(GLB_DIR)):
        if f.endswith('.glb'):
            render_island(f[:-4])
    print('FERTIG')
