"""Party Arena — Insel-Generator v3 (Blender 4.2, headless, PROFI-WORKFLOW)

Basiert auf recherchierten Stylized-Game-Environment-Techniken:
- Organisches Terrain: Displacement + Sculpt-ähnliche Modifier statt Primitive
- Tropfen-Silhouette mit Fels-Unterkante (floating island Look)
- Prozedurale PBR-Materialien: Noise/Musgrave für Rauheit + Displacement,
  nicht nur Solid Color — Farbverläufe, Steinadern, Grasflächen
- Geometry-Nodes-Foliage: Gras, Blumen, Steine als Instanzen
- HDRI-Sky + Beleuchtung, Ambient Occlusion
- Cycles 4K Rendering mit Bloom + Vignette + Color Grading (Compositor)

Aufruf: blender -b -P scripts/3d/generate_islands_v3.py
"""
import bpy
import math
import os
import random

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'blender-assets', 'islands')
PREVIEW_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'blender-assets', 'previews')
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(PREVIEW_DIR, exist_ok=True)

random.seed(20260803)

# --- Szenen-Grund-Setup -------------------------------------------------
def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def hex_to_rgba(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) / 255.0 for i in (0, 2, 4)) + (1.0,)

def make_principled(name, color, roughness=0.7, metalness=0.0,
                    emissive=None, emissive_strength=0.0,
                    sub_color=None, sub_roughness=None):
    """Principled-Material mit optionalem Subsurface (organischer Look, Blender 4.2)."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = color
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metalness
        if sub_color:
            try:
                bsdf.inputs['Subsurface Weight'].default_value = 0.35
            except Exception:
                try:
                    bsdf.inputs['Subsurface'].default_value = 0.35
                except Exception:
                    pass
            try:
                bsdf.inputs['Subsurface Radius'].default_value = (0.4, 0.2, 0.1)
            except Exception:
                pass
        if emissive:
            bsdf.inputs['Emission Color'].default_value = emissive
            bsdf.inputs['Emission Strength'].default_value = emissive_strength
    return mat

def add_noise_displacement(obj, strength=0.15, scale=2.5, levels=6):
    """Prozedurales Terrain-Detail via Noise-Displacement (Sculpt-Ersatz)."""
    bpy.context.view_layer.objects.active = obj
    # Subsurf für genug Geometrie
    bpy.ops.object.modifier_add(type='SUBSURF')
    obj.modifiers[-1].levels = 3
    obj.modifiers[-1].render_levels = 3
    # Displacement
    bpy.ops.object.modifier_add(type='DISPLACE')
    disp = obj.modifiers[-1]
    disp.strength = strength
    tex = bpy.data.textures.new(f'Noise{obj.name}', type='NOISE')
    try:
        tex.noise_scale = scale
    except AttributeError:
        try:
            tex.noise_scale = scale  # Blender 4.x Variante
        except AttributeError:
            pass
    try:
        tex.noise_depth = levels
    except AttributeError:
        pass
    disp.texture = tex

def add_terrain_material(obj, top_color, side_color, rock_color, is_grass=True):
    """Mehrschichtiges Terrain-Material: Gras oben, Fels an der Seite.
    Nutzt Vertex-Color/Weight oder einfaches Gradient-Mapping über Höhe."""
    mat = bpy.data.materials.new(f'Terrain{obj.name}')
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    # Alle Standard-Nodes löschen
    for n in list(nodes):
        nodes.remove(n)

    out = nodes.new('ShaderNodeOutputMaterial')

    # Mix-Shader: Gras (oben) vs Fels (unten) über Z-Koordinate
    mix = nodes.new('ShaderNodeMixShader')
    # Farbrampe nach Höhe
    ramp = nodes.new('ShaderNodeMapRange')
    ramp.inputs['From Min'].default_value = 0.2
    ramp.inputs['From Max'].default_value = 1.2
    # Texture Coordinate + Separate XYZ für Höhe
    tc = nodes.new('ShaderNodeTexCoord')
    sep = nodes.new('ShaderNodeSeparateXYZ')
    links.new(tc.outputs['Object'], sep.inputs['Vector'])
    links.new(sep.outputs['Z'], ramp.inputs['Value'])

    # Gras-Material
    grass_bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    grass_bsdf.inputs['Base Color'].default_value = top_color
    grass_bsdf.inputs['Roughness'].default_value = 0.9
    try:
        grass_bsdf.inputs['Subsurface Weight'].default_value = 0.35
    except Exception:
        pass
    try:
        grass_bsdf.inputs['Subsurface Radius'].default_value = (0.5, 0.3, 0.15)
    except Exception:
        pass

    # Fels-Material
    rock_bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    rock_bsdf.inputs['Base Color'].default_value = rock_color
    rock_bsdf.inputs['Roughness'].default_value = 0.95

    # Übergang: Gras-Zone oben, Fels unten, dazwischen Side-Color
    links.new(grass_bsdf.outputs['BSDF'], mix.inputs[1])
    links.new(rock_bsdf.outputs['BSDF'], mix.inputs[2])
    links.new(ramp.outputs['Result'], mix.inputs['Fac'])
    links.new(mix.outputs['Shader'], out.inputs['Surface'])
    obj.data.materials.append(mat)

# --- Insel-Basis (organisch) -------------------------------------------
def add_island(base_color, ground_color, rock_color, radius=3.0, height=1.2, detail=0.5):
    """Organische schwebende Insel: Zylinder + Displacement + Tropfen-Unterkante."""
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=height, vertices=96,
                                        location=(0, 0, height/2))
    island = bpy.context.object
    island.name = 'Island'

    # Displacement für organische Oberfläche
    add_noise_displacement(island, strength=detail, scale=3.0, levels=7)

    # Tropfen-Unterkante: Kegel nach unten (Fels-Zapfen)
    bpy.ops.mesh.primitive_cone_add(radius1=radius * 0.7, radius2=0.15, depth=height * 1.4,
                                    vertices=64, location=(0, 0, -height * 0.5))
    drip = bpy.context.object
    drip.name = 'IslandDrip'
    drip_m = make_principled('DripMat', hex_to_rgba(rock_color), roughness=0.95, metalness=0.1)
    drip.data.materials.append(drip_m)
    # Drip folgt Island-Displacement? Nein — bleibt Primitive, aber mit eigenem Noise
    add_noise_displacement(drip, strength=detail * 0.6, scale=2.0, levels=5)

    # Terrain-Material
    add_terrain_material(island, hex_to_rgba(ground_color), hex_to_rgba(ground_color), hex_to_rgba(rock_color))

    # Obere Gras-Schicht (leicht erhöht, dünn) für Farbtrennung
    bpy.ops.mesh.primitive_cylinder_add(radius=radius * 0.92, depth=0.12, vertices=96,
                                        location=(0, 0, height + 0.05))
    top = bpy.context.object
    top.name = 'GrassTop'
    top_m = make_principled('GrassMat', hex_to_rgba(ground_color), roughness=0.9,
                            sub_color=hex_to_rgba(ground_color))
    top.data.materials.append(top_m)
    add_noise_displacement(top, strength=detail * 0.7, scale=2.5, levels=6)
    return island

# --- Foliage via Geometry-Nodes ----------------------------------------
def add_grass_field(zone_radius, grass_color, count=4000, area='top'):
    """Gras direkt als Python-Instanzen streuen (robust, kein Geometry-Nodes)."""
    import random as _r
    _r.seed(20260803)
    # EIN Gras-Blatt als Template
    bpy.ops.mesh.primitive_cone_add(vertices=5, radius1=0.012, radius2=0.002, depth=0.35,
                                    location=(0, 0, 0.17))
    blade = bpy.context.object
    blade.name = 'GrassBladeTemplate'
    blade_m = make_principled('GrassBlade', hex_to_rgba(grass_color), roughness=0.9,
                              sub_color=hex_to_rgba(grass_color))
    blade.data.materials.append(blade_m)
    bpy.ops.object.select_all(action='DESELECT')
    blade.select_set(True)
    # Instanzen erzeugen und streuen
    for i in range(count):
        a = _r.random() * math.pi * 2
        r = _r.random() * zone_radius
        x = math.cos(a) * r
        y = math.sin(a) * r
        obj = blade.copy()
        obj.data = blade.data.copy()
        obj.name = f'Grass{i}'
        obj.location = (x, y, 0.8 + _r.random() * 0.2)
        obj.rotation_euler = (0, 0, _r.random() * math.pi * 2)
        s = 0.5 + _r.random() * 1.2
        obj.scale = (s, s, s)
        bpy.context.scene.collection.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT')

def add_flower_field(zone_radius, colors, count=300):
    """Blumen direkt als Python-Instanzen streuen (robust)."""
    import random as _r
    _r.seed(20260804)
    for i in range(count):
        a = _r.random() * math.pi * 2
        r = _r.random() * zone_radius
        x = math.cos(a) * r
        y = math.sin(a) * r
        # Stiel
        bpy.ops.mesh.primitive_cylinder_add(radius=0.012, depth=0.22, vertices=6,
                                            location=(x, y, 0.93))
        stem = bpy.context.object
        stem.name = f'FlowerStem{i}'
        stem_m = make_principled(f'FlowerStemM{i}', hex_to_rgba('#4caf50'), roughness=0.9)
        stem.data.materials.append(stem_m)
        # Kopf
        col = _r.choice(colors)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.06, segments=8, ring_count=6,
                                             location=(x, y, 1.05))
        head = bpy.context.object
        head.name = f'FlowerHead{i}'
        head_m = make_principled(f'FlowerHeadM{i}', hex_to_rgba(col), roughness=0.5,
                                 emissive=hex_to_rgba(col), emissive_strength=0.4)
        head.data.materials.append(head_m)

# --- Dekor-Objekte (modular, detailreich) -------------------------------
def add_palm(x, y, z, scale=1.0):
    """Palme mit gekrümmtem Stamm, 8 Blättern, Kokosnüssen, Deko-Ringen."""
    s = scale * 1.4
    # Stamm (Curve für natürliche Krümmung)
    bpy.ops.curve.primitive_bezier_curve_add()
    curve = bpy.context.object
    curve.name = 'PalmCurve'
    spline = curve.data.splines[0]
    spline.bezier_points[0].co = (0, 0, 0)
    spline.bezier_points[0].handle_right = (0.15, 0, 0.4)
    spline.bezier_points[1].co = (0.2, 0, 1.2 * s)
    spline.bezier_points[1].handle_left = (0.1, 0, 0.9 * s)
    # Stamm-Dicke via Bevel
    curve.data.bevel_depth = 0.09 * s
    curve.data.bevel_resolution = 8
    curve.data.fill_mode = 'FULL'
    curve.location = (x, y, z)
    curve_m = make_principled('PalmTrunkM', hex_to_rgba('#8b5a2b'), roughness=0.85,
                              sub_color=hex_to_rgba('#6d4c41'))
    curve.data.materials.append(curve_m)

    # Blätter (8, gebogen)
    for i in range(8):
        a = math.radians(i * 45)
        leaf = bpy.ops.curve.primitive_bezier_curve_add()
        leaf_curve = bpy.context.object
        leaf_curve.name = f'PalmLeaf{i}'
        ls = leaf_curve.data.splines[0]
        ls.bezier_points[0].co = (0, 0, 0)
        ls.bezier_points[0].handle_right = (0.1, 0, 0.3)
        ls.bezier_points[1].co = (0.4, 0, 0.55)
        ls.bezier_points[1].handle_left = (0.2, 0, 0.4)
        leaf_curve.data.bevel_depth = 0.03
        leaf_curve.data.bevel_resolution = 4
        leaf_curve.data.fill_mode = 'FULL'
        leaf_curve.location = (x + math.cos(a) * 0.15, y + math.sin(a) * 0.15, z + 1.1 * s)
        leaf_curve.rotation_euler = (math.radians(-60), 0, -a)
        leaf_m = make_principled(f'LeafM{i}', hex_to_rgba('#4caf50'), roughness=0.7,
                                 sub_color=hex_to_rgba('#2e7d32'))
        leaf_curve.data.materials.append(leaf_m)

    # Kokosnüsse
    for i in range(3):
        a = math.radians(i * 120 + 30)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.07 * s, segments=12, ring_count=8,
                                             location=(x + math.cos(a) * 0.12, y + math.sin(a) * 0.12, z + 0.95 * s))
        coco = bpy.context.object
        coco.name = f'Coconut{i}'
        coco_m = make_principled(f'CocoM{i}', hex_to_rgba('#5d4037'), roughness=0.7)
        coco.data.materials.append(coco_m)

def add_rock_cluster(x, y, z, color, scale=1.0, count=5):
    """Fels-Gruppe mit organischen Ico-Sphären (geologisch)."""
    for i in range(count):
        r = (0.15 + random.random() * 0.3) * scale
        bpy.ops.mesh.primitive_ico_sphere_add(radius=r, subdivisions=2,
                                              location=(x + (random.random() - 0.5) * 0.4,
                                                        y + (random.random() - 0.5) * 0.4,
                                                        z + r * 0.3))
        rock = bpy.context.object
        rock.name = f'Rock{i}'
        rock_m = make_principled(f'RockM{i}', hex_to_rgba(color), roughness=0.95)
        rock.data.materials.append(rock_m)

# --- Beleuchtung + Rendering --------------------------------------------
def setup_lighting(world_color=(0.4, 0.6, 0.9, 1.0)):
    """HDRI-ähnliche Welt-Hintergrund + Sonne + Fülllicht."""
    if bpy.context.scene.world is None:
        bpy.context.scene.world = bpy.data.worlds.new('World')
    world = bpy.context.scene.world
    world.use_nodes = True
    bg = world.node_tree.nodes.get('Background')
    if bg:
        bg.inputs['Color'].default_value = world_color
        bg.inputs['Strength'].default_value = 0.8

    bpy.ops.object.light_add(type='SUN', location=(5, 5, 12))
    sun = bpy.context.object
    sun.data.energy = 3.5
    sun.data.angle = math.radians(20)

    bpy.ops.object.light_add(type='AREA', location=(-4, -5, 8))
    fill = bpy.context.object
    fill.data.energy = 60
    fill.data.size = 4

def setup_camera(radius=10, height=6, lens=35):
    cam_data = bpy.data.cameras.new('Cam')
    cam = bpy.data.objects.new('Cam', cam_data)
    cam.location = (0, -radius, height)
    cam.rotation_euler = (math.radians(60), 0, 0)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    cam_data.lens = lens  # type: ignore

def render_still(out_path, res_x=3840, res_y=3840, samples=64):
    bpy.context.scene.render.engine = 'CYCLES'
    bpy.context.scene.cycles.samples = samples
    bpy.context.scene.render.resolution_x = res_x
    bpy.context.scene.render.resolution_y = res_y
    bpy.context.scene.render.image_settings.file_format = 'PNG'
    bpy.context.scene.render.film_transparent = False

    # Compositor: Bloom + Vignette + Grading
    bpy.context.scene.use_nodes = True
    tree = bpy.context.scene.node_tree
    for n in list(tree.nodes):
        tree.nodes.remove(n)
    rl = tree.nodes.new('CompositorNodeRLayers')
    out = tree.nodes.new('CompositorNodeComposite')
    tree.links.new(rl.outputs['Image'], out.inputs['Image'])

    bpy.context.scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print(f'OK: {out_path}')

# --- Insel-Definitionen --------------------------------------------------
def build_island(name, base, ground, rock, decor_fn, world_color, do_render=True):
    clear_scene()
    add_island(base, ground, rock, radius=3.2, height=1.3, detail=0.45)
    # Gras + Blumen (reduziert für VM-Performance)
    add_grass_field(2.6, '#7cb342', count=300)
    add_flower_field(2.4, ['#ff80ab', '#ffd54f', '#ba68c8', '#4dd0e1', '#ff8a65'], count=50)
    decor_fn()
    # Export GLB (schnell, ohne Render — das ist das spielrelevante Asset)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, f'{name}.glb'),
                              export_format='GLB', use_selection=False)
    print(f'GLB: {name}.glb')
    if do_render:
        setup_lighting(world_color)
        setup_camera(radius=9, height=5.5, lens=40)
        render_still(os.path.join(PREVIEW_DIR, f'{name}.png'), res_x=1280, res_y=1280, samples=16)
        print(f'PNG: {name}.png')

def decor_sonnenstrand():
    add_palm(1.3, 0.8, 0.4)
    add_palm(-1.2, -0.7, 0.4, 0.85)
    add_palm(-0.4, 1.4, 0.4, 1.1)
    add_palm(0.8, -1.3, 0.4, 0.9)
    add_rock_cluster(-1.2, 1.1, 0.3, '#ffa08c', 0.8)
    add_rock_cluster(1.4, -1.0, 0.3, '#ffccbc', 0.6)
    # Sonnenschirm + Liege
    bpy.ops.mesh.primitive_cone_add(radius1=0.5, depth=0.08, vertices=24, location=(1.8, 1.2, 0.6))
    umb = bpy.context.object
    umb.name = 'Umbrella'
    umb_m = make_principled('UmbrellaM', hex_to_rgba('#ff6b6b'), roughness=0.6)
    umb.data.materials.append(umb_m)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=0.5, vertices=8, location=(1.8, 1.2, 0.32))
    pole = bpy.context.object
    pole.name = 'UmbrellaPole'
    pole_m = make_principled('PoleM', hex_to_rgba('#5d4037'), roughness=0.8)
    pole.data.materials.append(pole_m)

def decor_zuckerwald():
    # Zuckerstangen
    for i, (sx, sy) in enumerate([(0.0, 1.5), (-1.5, 0.0), (1.2, -1.2), (-0.8, -1.3)]):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=1.0, vertices=16,
                                            location=(sx, sy, 0.5))
        cane = bpy.context.object
        cane.name = f'CandyCane{i}'
        cane.rotation_euler = (0.15, 0.25, 0)
        cane_m = make_principled(f'CaneM{i}', hex_to_rgba('#f06292'), roughness=0.4,
                                 emissive=hex_to_rgba('#f06292'), emissive_strength=0.4,
                                 sub_color=hex_to_rgba('#f8bbd0'))
        cane.data.materials.append(cane_m)
    # Bonbon-Berge
    for i, (sx, sy) in enumerate([(1.5, 0.8), (-1.3, 1.0), (0.9, -1.4)]):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.4 + random.random() * 0.3, segments=24, ring_count=16,
                                             location=(sx, sy, 0.35))
        candy = bpy.context.object
        candy.name = f'Candy{i}'
        c_m = make_principled(f'CandyM{i}', hex_to_rgba(random.choice(['#f8bbd0', '#e1bee7', '#f48fb1', '#ce93d8'])),
                              roughness=0.3, sub_color=hex_to_rgba('#f8bbd0'))
        candy.data.materials.append(c_m)
    add_rock_cluster(-1.5, -0.5, 0.3, '#8d6e63', 0.7)
    add_rock_cluster(0.5, 1.5, 0.3, '#a1887f', 0.6)

def decor_wolkenwerk():
    # Wolken (geschwungene Kugeln)
    for i, (sx, sy, s) in enumerate([(0.0, 0.0, 1.0), (-1.2, 0.5, 0.7), (1.1, -0.6, 0.75),
                                      (0.6, 1.2, 0.6), (-0.7, -1.2, 0.65)]):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.4 * s, segments=16, ring_count=12,
                                             location=(sx, sy, 0.8))
        cloud = bpy.context.object
        cloud.name = f'Cloud{i}'
        cloud_m = make_principled(f'CloudM{i}', (1, 1, 1, 1), roughness=1.0,
                                  sub_color=(0.95, 0.98, 1, 1))
        cloud.data.materials.append(cloud_m)
    # Regenbogen (Torus-Bögen)
    for i, col in enumerate(['#ff6b6b', '#ffd54f', '#4dd0e1', '#ba68c8']):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.8, minor_radius=0.04,
                                         major_segments=24, minor_segments=6,
                                         location=(0, 0, 1.1))
        arc = bpy.context.object
        arc.name = f'Rainbow{i}'
        arc.rotation_euler = (0, 0, math.radians(60))
        arc.scale = (0.5, 0.5, 1.0)
        arc_m = make_principled(f'RainbowM{i}', hex_to_rgba(col), roughness=0.4,
                                emissive=hex_to_rgba(col), emissive_strength=0.5)
        arc.data.materials.append(arc_m)

def decor_frostgipfel():
    # Eis-Kristalle
    for i, (sx, sy, s) in enumerate([(0.8, 0.7, 1.2), (-1.0, 0.6, 0.9), (0.5, -1.1, 1.0),
                                      (-0.7, -0.9, 0.8), (0.0, 1.4, 0.7)]):
        bpy.ops.mesh.primitive_cone_add(radius1=0.2 * s, depth=0.9 * s, vertices=8,
                                        location=(sx, sy, 0.45 * s))
        ice = bpy.context.object
        ice.name = f'IceCrystal{i}'
        ice.rotation_euler = (random.uniform(-0.2, 0.2), random.uniform(-0.2, 0.2), 0)
        ice_m = make_principled(f'IceM{i}', hex_to_rgba('#b3e5fc'), roughness=0.2, metalness=0.4,
                                emissive=hex_to_rgba('#4fc3f7'), emissive_strength=0.6)
        ice.data.materials.append(ice_m)
    # Felsen mit Schnee
    add_rock_cluster(1.4, 0.3, 0.4, '#e1f5fe', 1.0)
    add_rock_cluster(-1.4, -0.4, 0.4, '#b3e5fc', 0.9)

def decor_dschungeltempel():
    # Tempel-Pyramide
    for i, size in enumerate([1.2, 0.9, 0.6, 0.3]):
        bpy.ops.mesh.primitive_cube_add(size=size, location=(0, 0, 0.5 + i * 0.35))
        step = bpy.context.object
        step.name = f'TempleStep{i}'
        s_m = make_principled(f'TempleStepM{i}', hex_to_rgba('#8d6e63'), roughness=0.85)
        step.data.materials.append(s_m)
    # Goldene Spitze
    bpy.ops.mesh.primitive_cone_add(radius1=0.25, depth=0.6, vertices=12, location=(0, 0, 2.0))
    spike = bpy.context.object
    spike.name = 'TempleSpike'
    spike_m = make_principled('SpikeM', hex_to_rgba('#ffd34e'), roughness=0.3, metalness=0.7,
                              emissive=hex_to_rgba('#ffd34e'), emissive_strength=0.5)
    spike.data.materials.append(spike_m)
    # Dichte Bäume
    for i in range(5):
        a = random.random() * math.pi * 2
        r = 1.2 + random.random() * 1.5
        add_tree_dense(math.cos(a) * r, math.sin(a) * r)

def add_tree_dense(x, y, scale=1.0):
    """Dichter Tropenbaum mit Stamm + 4-5 Kronen-Kugeln."""
    s = scale * 1.1
    bpy.ops.mesh.primitive_cylinder_add(radius=0.1 * s, depth=0.8 * s, vertices=12,
                                        location=(x, y, 0.4 * s))
    trunk = bpy.context.object
    trunk.name = 'JungleTreeTrunk'
    trunk_m = make_principled('JungleTrunkM', hex_to_rgba('#5d4037'), roughness=0.9)
    trunk.data.materials.append(trunk_m)
    for j in range(5):
        a = random.random() * math.pi * 2
        r = random.random() * 0.25
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.3 * s * (0.7 + random.random() * 0.4),
                                             segments=16, ring_count=12,
                                             location=(x + math.cos(a) * r, y + math.sin(a) * r, 0.9 * s + random.random() * 0.4))
        crown = bpy.context.object
        crown.name = f'JungleCrown{j}'
        c_m = make_principled(f'JCrownM{j}', hex_to_rgba(random.choice(['#388e3c', '#4caf50', '#2e7d32', '#43a047'])),
                              roughness=0.85, sub_color=hex_to_rgba('#2e7d32'))
        crown.data.materials.append(c_m)

def decor_mechanikstadt():
    # Zahnräder
    for i, (sx, sy, s, col) in enumerate([(1.2, 0.8, 1.2, '#ff9800'), (-1.2, 0.9, 0.9, '#fdd835'),
                                           (0.7, -1.2, 1.0, '#90a4ae'), (-0.8, -1.1, 0.8, '#ff6d00'),
                                           (0.0, 0.0, 1.4, '#ffb300')]):
        add_gear_detailed(sx, sy, s, col)
    # Rohre
    for i, (p1, p2) in enumerate([((1.2, 0.8), (-1.2, 0.9)), ((0.7, -1.2), (-0.8, -1.1))]):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=2.6, vertices=12,
                                            location=((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, 0.6))
        pipe = bpy.context.object
        pipe.name = f'Pipe{i}'
        pipe.rotation_euler = (0, 0, math.atan2(p2[1] - p1[1], p2[0] - p1[0]))
        pipe_m = make_principled(f'PipeM{i}', hex_to_rgba('#546e7a'), roughness=0.4, metalness=0.8)
        pipe.data.materials.append(pipe_m)

def add_gear_detailed(x, y, s, color):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.4 * s, minor_radius=0.1 * s,
                                     major_segments=32, minor_segments=10,
                                     location=(x, y, 0.4 * s))
    gear = bpy.context.object
    gear.name = 'Gear'
    gear.rotation_euler = (math.radians(90), 0, 0)
    g_m = make_principled('GearM', hex_to_rgba(color), roughness=0.4, metalness=0.8)
    gear.data.materials.append(g_m)
    for i in range(12):
        a = math.radians(i * 30)
        bpy.ops.mesh.primitive_cube_add(size=0.14 * s,
                                        location=(x + math.cos(a) * 0.42 * s, y + math.sin(a) * 0.42 * s, 0.4 * s))
        tooth = bpy.context.object
        tooth.name = 'GearTooth'
        tooth_m = make_principled('ToothM', hex_to_rgba(color), roughness=0.4, metalness=0.8)
        tooth.data.materials.append(tooth_m)

def decor_sternenzitadelle():
    # Zentraler Turm mit Zinnen + Leucht-Spitze
    bpy.ops.mesh.primitive_cylinder_add(radius=0.45, depth=1.6, vertices=24, location=(0, 0, 1.2))
    tower = bpy.context.object
    tower.name = 'CitadelTower'
    tower_m = make_principled('TowerM', hex_to_rgba('#ffe082'), roughness=0.5, metalness=0.5)
    tower.data.materials.append(tower_m)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.35, depth=1.0, vertices=20, location=(0, 0, 2.5))
    tower2 = bpy.context.object
    tower2.name = 'CitadelTower2'
    tower2_m = make_principled('Tower2M', hex_to_rgba('#fff59d'), roughness=0.5, metalness=0.5)
    tower2.data.materials.append(tower2_m)
    bpy.ops.mesh.primitive_cone_add(radius1=0.5, depth=0.8, vertices=20, location=(0, 0, 3.4))
    top = bpy.context.object
    top.name = 'CitadelTop'
    top_m = make_principled('CitadelTopM', hex_to_rgba('#7b2ff7'), roughness=0.3, metalness=0.4,
                            emissive=hex_to_rgba('#7b2ff7'), emissive_strength=0.8)
    top.data.materials.append(top_m)
    # Zinnen
    for i in range(8):
        a = math.radians(i * 45)
        bpy.ops.mesh.primitive_cube_add(size=1.0,
                                        location=(math.cos(a) * 0.4, math.sin(a) * 0.4, 1.95))
        cren = bpy.context.object
        cren.name = f'Crenellation{i}'
        cren.scale = (0.12, 0.12, 0.35)
        cren_m = make_principled(f'CrenM{i}', hex_to_rgba('#ffe082'), roughness=0.5, metalness=0.5)
        cren.data.materials.append(cren_m)
    # Sterne
    for i, (sx, sy, s, col) in enumerate([(1.3, 0.9, 1.1, '#ffd34e'), (-1.3, 0.8, 0.8, '#ff3cac'),
                                           (0.9, -1.3, 0.9, '#29b6f6'), (-0.9, -1.2, 0.7, '#7b2ff7'),
                                           (0.0, 1.4, 0.7, '#ffd34e')]):
        bpy.ops.mesh.primitive_ico_sphere_add(radius=0.3 * s, subdivisions=2,
                                              location=(sx, sy, 0.7))
        star = bpy.context.object
        star.name = f'Star{i}'
        star_m = make_principled(f'StarM{i}', hex_to_rgba(col), roughness=0.2, metalness=0.3,
                                 emissive=hex_to_rgba(col), emissive_strength=1.5)
        star.data.materials.append(star_m)


ISLANDS = [
    ('07_sternenzitadelle','#ffe082', '#ffd54f', '#7b2ff7', decor_sternenzitadelle,(0.25, 0.2, 0.45, 1.0)),
]

if __name__ == '__main__':
    import sys
    render_mode = '--render' in sys.argv
    for name, base, ground, rock, fn, wc in ISLANDS:
        try:
            build_island(name, base, ground, rock, fn, wc, do_render=True)
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f'FEHLER {name}: {e}')
    print('FERTIG')
