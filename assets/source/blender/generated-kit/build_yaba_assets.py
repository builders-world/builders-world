"""Build the first local Builders World/Yaba asset kit.

The reference images guide silhouettes, palette and atmosphere. The runtime assets are
procedural Blender geometry with shared materials so they remain easy to revise and cheap
to render in Three.js. Run with Blender 5.2 in background mode from the repository root.
"""

from __future__ import annotations

import json
import math
import os
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(os.environ.get("BUILDERS_WORLD_ROOT", Path(__file__).resolve().parents[4]))
OUT = ROOT / "assets" / "exports" / "models" / "yaba-kit"
RENDER_OUT = ROOT / "assets" / "exports" / "renders"
SOURCE_OUT = ROOT / "assets" / "source" / "blender" / "generated-kit"
OUT.mkdir(parents=True, exist_ok=True)
RENDER_OUT.mkdir(parents=True, exist_ok=True)

MESH_VARIANTS = {}


PALETTE = {
    "night_blue": "#0B1D29",
    "blue_gray": "#4F6673",
    "deep_teal": "#1E4B4B",
    "teal": "#34776F",
    "mural_teal": "#438C85",
    "amber": "#F4B54E",
    "amber_soft": "#FFD58A",
    "cream": "#E6DCC8",
    "plaster": "#A9B4B0",
    "concrete": "#6F7772",
    "wet": "#1B2C38",
    "metal": "#74838A",
    "wood": "#79583E",
    "wood_light": "#A47852",
    "coral": "#D77A6B",
    "leaf": "#315E49",
    "leaf_light": "#63805A",
    "skin": "#8E5E43",
    "skin_light": "#B97B53",
    "cloth": "#D2D6C7",
    "charcoal": "#182326",
    "glass": "#9CC1BF",
}


def hex_color(value: str):
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) / 255 for i in (0, 2, 4)) + (1,)


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def clean_scene():
    MESH_VARIANTS.clear()
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.collections, bpy.data.materials, bpy.data.meshes, bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def make_materials():
    materials = {}
    for name, color in PALETTE.items():
        mat = bpy.data.materials.new(f"BW_{name}")
        mat.diffuse_color = hex_color(color)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value = hex_color(color)
        bsdf.inputs["Roughness"].default_value = 0.78
        if name in {"glass"}:
            bsdf.inputs["Roughness"].default_value = 0.18
            bsdf.inputs["Metallic"].default_value = 0.05
            bsdf.inputs["Alpha"].default_value = 0.42
            mat.surface_render_method = "DITHERED"
        if name in {"amber", "amber_soft"}:
            try:
                bsdf.inputs["Emission Color"].default_value = hex_color(color)
                bsdf.inputs["Emission Strength"].default_value = 3.0 if name == "amber" else 1.2
            except KeyError:
                pass
        materials[name] = mat
    return materials


def primitive_meshes():
    meshes = {}
    for kind, op in (
        ("cube", lambda: bpy.ops.mesh.primitive_cube_add()),
        ("cylinder", lambda: bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=1, depth=2)),
        ("cone", lambda: bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=1, radius2=0.72, depth=2)),
        ("sphere", lambda: bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1)),
    ):
        op()
        obj = bpy.context.object
        meshes[kind] = obj.data.copy()
        bpy.data.objects.remove(obj, do_unlink=True)
    # A broad leaf, local Y axis from stem to tip, with a shallow central crease.
    verts = [(-0.12, 0, 0), (0.12, 0, 0), (-0.18, 0.55, 0.02), (0.18, 0.55, 0.02), (0, 1.15, 0.0)]
    faces = [(0, 1, 3, 2), (2, 3, 4)]
    mesh = bpy.data.meshes.new("BW_leaf_mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    meshes["leaf"] = mesh
    return meshes


def new_asset(asset_id, label):
    collection = bpy.data.collections.new(f"ASSET_{asset_id}")
    bpy.context.scene.collection.children.link(collection)
    root = bpy.data.objects.new(asset_id, None)
    root.empty_display_type = "PLAIN_AXES"
    root["asset_id"] = asset_id
    root["display_name"] = label
    collection.objects.link(root)
    return collection, root


def add_object(collection, root, mesh, name, location, scale, material, rotation=(0, 0, 0), role="render"):
    key = (mesh.name, material.name)
    if key not in MESH_VARIANTS:
        variant = mesh.copy()
        variant.name = f"{mesh.name}_{material.name}"
        variant.materials.append(material)
        MESH_VARIANTS[key] = variant
    obj = bpy.data.objects.new(name, MESH_VARIANTS[key])
    collection.objects.link(obj)
    obj.parent = root
    obj.location = location
    obj.scale = scale
    obj.rotation_euler = rotation
    obj["bw_role"] = role
    if role == "collision":
        obj.display_type = "WIRE"
        obj.hide_render = True
    return obj


def box(collection, root, meshes, materials, name, location, dimensions, material, rotation=(0, 0, 0), role="render"):
    return add_object(collection, root, meshes["cube"], name, location, tuple(d / 2 for d in dimensions), materials[material], rotation, role)


def cylinder(collection, root, meshes, materials, name, location, radius, depth, material, rotation=(0, 0, 0), role="render"):
    # Blender cylinders are authored along local Z; Builders World uses Y-up, so
    # rotate the reusable primitive once here instead of repeating it at every call.
    y_up_rotation = (rotation[0] + math.pi / 2, rotation[1], rotation[2])
    return add_object(collection, root, meshes["cylinder"], name, location, (radius, radius, depth / 2), materials[material], y_up_rotation, role)


def cone(collection, root, meshes, materials, name, location, radius, depth, material, rotation=(0, 0, 0), role="render"):
    return add_object(collection, root, meshes["cone"], name, location, (radius, radius, depth / 2), materials[material], rotation, role)


def sphere(collection, root, meshes, materials, name, location, scale, material, role="render"):
    return add_object(collection, root, meshes["sphere"], name, location, scale, materials[material], role=role)


def leaf(collection, root, meshes, materials, name, location, scale, rotation, material):
    return add_object(collection, root, meshes["leaf"], name, location, scale, materials[material], rotation)


def make_street_lamp(materials, meshes):
    c, r = new_asset("yaba_street_lamp", "Yaba street lamp")
    cylinder(c, r, meshes, materials, "lamp_base", (0, 0.12, 0), 0.42, 0.24, "concrete")
    cylinder(c, r, meshes, materials, "lamp_pole", (0, 2.6, 0), 0.09, 5.0, "metal")
    box(c, r, meshes, materials, "lamp_arm", (0.45, 5.05, 0), (0.95, 0.09, 0.09), "metal", (0, 0, -0.12))
    box(c, r, meshes, materials, "lamp_head", (0.88, 4.92, 0), (0.28, 0.16, 0.32), "charcoal", (0, 0, -0.18))
    box(c, r, meshes, materials, "lamp_glow", (0.88, 4.81, 0), (0.16, 0.04, 0.18), "amber")
    cylinder(c, r, meshes, materials, "lamp_cap", (0, 5.15, 0), 0.12, 0.12, "amber", role="render")
    box(c, r, meshes, materials, "COLLISION_lamp_pole", (0, 2.6, 0), (0.28, 5.2, 0.28), "charcoal", role="collision")
    return c


def make_market_stall(materials, meshes):
    c, r = new_asset("yaba_market_stall", "Yaba market stall")
    for x in (-1.8, 1.8):
        for z in (-1.05, 1.05):
            box(c, r, meshes, materials, f"stall_post_{x}_{z}", (x, 1.55, z), (0.16, 3.1, 0.16), "wood")
    box(c, r, meshes, materials, "stall_counter", (0, 1.15, 0), (4.1, 0.22, 2.25), "wood_light")
    box(c, r, meshes, materials, "stall_counter_shadow", (0, 0.97, 0), (3.9, 0.14, 2.1), "charcoal")
    for i, x in enumerate((-1.5, -0.75, 0, 0.75, 1.5)):
        box(c, r, meshes, materials, f"awning_panel_{i}", (x, 3.2, 0), (0.76, 0.16, 2.65), "coral" if i % 2 else "cream", (0, 0, -0.07))
    box(c, r, meshes, materials, "awning_trim", (0, 3.05, 0), (4.35, 0.15, 2.8), "teal")
    for i, x in enumerate((-1.25, 0, 1.25)):
        box(c, r, meshes, materials, f"crate_{i}", (x, 1.44, 0), (0.72, 0.36, 0.65), "wood")
        sphere(c, r, meshes, materials, f"produce_{i}", (x, 1.72, 0), (0.18, 0.18, 0.18), "amber" if i != 1 else "leaf_light")
    box(c, r, meshes, materials, "COLLISION_stall", (0, 1.65, 0), (4.1, 3.3, 2.35), "charcoal", role="collision")
    return c


def make_community_board(materials, meshes):
    c, r = new_asset("yaba_community_board", "Yaba community board")
    for x in (-2.0, 2.0):
        cylinder(c, r, meshes, materials, f"board_post_{x}", (x, 1.3, 0), 0.12, 2.6, "wood")
        cylinder(c, r, meshes, materials, f"board_foot_{x}", (x, 0.12, 0), 0.3, 0.18, "concrete")
    box(c, r, meshes, materials, "board_frame", (0, 2.25, 0), (4.5, 2.25, 0.18), "wood_light")
    box(c, r, meshes, materials, "board_panel", (0, 2.25, -0.12), (4.05, 1.82, 0.08), "deep_teal")
    notes = [("amber", -1.34, 2.66, 0.02), ("cream", -0.42, 2.42, 0.03), ("coral", 0.5, 2.72, 0.04), ("mural_teal", 1.27, 2.24, 0.02), ("cream", -1.05, 1.92, 0.03), ("amber", 0.05, 1.86, 0.02), ("coral", 1.05, 1.78, 0.04)]
    for i, (mat, x, y, z) in enumerate(notes):
        box(c, r, meshes, materials, f"board_note_{i}", (x, y, -0.19), (0.62, 0.46, 0.035), mat, (0, 0, (i % 3 - 1) * 0.05))
    box(c, r, meshes, materials, "board_header", (0, 3.55, -0.13), (4.15, 0.3, 0.06), "amber")
    box(c, r, meshes, materials, "COLLISION_board", (0, 2.2, 0), (4.55, 4.5, 0.45), "charcoal", role="collision")
    return c


def make_palm_tree(materials, meshes):
    c, r = new_asset("yaba_palm_tree", "Yaba palm tree")
    for i in range(5):
        t = i / 5
        cylinder(c, r, meshes, materials, f"palm_trunk_{i}", (0.06 * i, 0.62 + i * 0.62, 0), 0.26 - i * 0.025, 1.35, "wood", (0.0, 0.03, 0.0))
    for i in range(9):
        angle = i * math.tau / 9
        leaf(c, r, meshes, materials, f"palm_frond_{i}", (0.28, 3.9, 0), (0.6, 1.5, 0.12), (0.25 * math.sin(angle), angle, 0.55 * math.cos(angle)), "leaf_light" if i % 3 == 0 else "leaf")
    cylinder(c, r, meshes, materials, "palm_planter", (0, 0.2, 0), 0.62, 0.4, "concrete")
    cylinder(c, r, meshes, materials, "COLLISION_palm_trunk", (0, 2.25, 0), 0.42, 4.5, "charcoal", role="collision")
    return c


def make_starter_house(materials, meshes):
    c, r = new_asset("yaba_starter_house", "Yaba starter house")
    box(c, r, meshes, materials, "house_foundation", (0, 0.18, 0), (7.8, 0.36, 6.5), "concrete")
    box(c, r, meshes, materials, "house_shell", (0, 2.1, 0), (7.4, 3.7, 6.1), "plaster")
    box(c, r, meshes, materials, "house_facade", (-1.95, 2.1, 3.1), (3.4, 3.55, 0.12), "cream")
    box(c, r, meshes, materials, "house_door_frame", (-1.95, 1.75, 3.24), (1.35, 2.95, 0.14), "wood_light")
    box(c, r, meshes, materials, "house_door", (-1.95, 1.74, 3.33), (1.05, 2.58, 0.08), "deep_teal")
    box(c, r, meshes, materials, "house_door_handle", (-1.56, 1.62, 3.4), (0.1, 0.1, 0.05), "amber")
    box(c, r, meshes, materials, "house_window_frame", (1.25, 2.2, 3.22), (2.5, 1.75, 0.14), "wood_light")
    box(c, r, meshes, materials, "house_window_glass", (1.25, 2.2, 3.32), (2.15, 1.4, 0.05), "glass")
    box(c, r, meshes, materials, "house_window_cross_h", (1.25, 2.2, 3.39), (2.2, 0.07, 0.03), "cream")
    box(c, r, meshes, materials, "house_window_cross_v", (1.25, 2.2, 3.4), (0.07, 1.45, 0.03), "cream")
    box(c, r, meshes, materials, "house_roof", (0, 4.18, 0), (8.0, 0.38, 6.75), "deep_teal")
    box(c, r, meshes, materials, "house_roof_trim", (0, 4.42, 0), (8.25, 0.14, 6.95), "wood_light")
    box(c, r, meshes, materials, "house_entry_canopy", (-1.95, 3.42, 3.78), (2.35, 0.18, 1.2), "wood", (0.12, 0, 0))
    box(c, r, meshes, materials, "house_steps", (-1.95, 0.38, 3.85), (2.05, 0.24, 1.45), "concrete")
    box(c, r, meshes, materials, "house_planter_left", (-3.35, 0.62, 3.85), (0.72, 0.9, 0.72), "concrete")
    box(c, r, meshes, materials, "house_planter_right", (3.05, 0.62, 3.85), (0.72, 0.9, 0.72), "concrete")
    for x in (-3.35, 3.05):
        for i in range(3):
            leaf(c, r, meshes, materials, f"house_leaf_{x}_{i}", (x, 1.15, 3.85), (0.28, 0.85, 0.08), (0.35, i * 2.1, 0.28), "leaf_light")
    box(c, r, meshes, materials, "COLLISION_house", (0, 2.1, 0), (7.45, 4.0, 6.2), "charcoal", role="collision")
    return c


def make_avatar(materials, meshes):
    c, r = new_asset("builders_world_avatar_provisional", "Builders World provisional builder avatar")
    box(c, r, meshes, materials, "avatar_torso", (0, 1.65, 0), (1.05, 1.25, 0.6), "amber")
    sphere(c, r, meshes, materials, "avatar_head", (0, 2.65, 0), (0.43, 0.48, 0.42), "skin")
    sphere(c, r, meshes, materials, "avatar_hair", (0, 2.98, -0.02), (0.45, 0.18, 0.4), "charcoal")
    box(c, r, meshes, materials, "avatar_cap", (0, 3.17, 0), (0.83, 0.12, 0.75), "cream")
    box(c, r, meshes, materials, "avatar_cap_brim", (0, 3.1, 0.33), (0.62, 0.08, 0.28), "cream")
    for x in (-0.19, 0.19):
        box(c, r, meshes, materials, f"avatar_leg_{x}", (x, 0.65, 0), (0.32, 1.0, 0.37), "charcoal")
        box(c, r, meshes, materials, f"avatar_shoe_{x}", (x, 0.08, 0.14), (0.42, 0.22, 0.7), "cloth")
        box(c, r, meshes, materials, f"avatar_arm_{x}", (x * 2.0, 1.66, 0), (0.25, 0.9, 0.3), "amber", (0, 0, -x * 0.25))
    box(c, r, meshes, materials, "avatar_backpack", (0, 1.7, -0.43), (0.75, 0.95, 0.2), "deep_teal")
    box(c, r, meshes, materials, "avatar_backpack_strap", (-0.27, 1.85, 0.28), (0.08, 0.85, 0.06), "cream", (0.1, 0, 0))
    box(c, r, meshes, materials, "COLLISION_avatar", (0, 1.55, 0), (1.25, 3.15, 0.85), "charcoal", role="collision")
    return c


def setup_preview(materials, meshes, collections):
    scene = bpy.context.scene
    floor = bpy.data.objects.new("preview_ground", meshes["cube"])
    scene.collection.objects.link(floor)
    floor.location = (0, -0.08, 0)
    floor.scale = (16, 0.08, 12)
    floor.data.materials.append(materials["wet"])
    sun_data = bpy.data.lights.new("preview_sun", type="AREA")
    sun_data.energy = 900
    sun_data.shape = "DISK"
    sun_data.size = 9
    sun = bpy.data.objects.new("preview_sun", sun_data)
    scene.collection.objects.link(sun)
    sun.location = (-6, 14, 10)
    look_at(sun, (0, 1.4, 0))
    fill_data = bpy.data.lights.new("preview_fill", type="AREA")
    fill_data.energy = 450
    fill_data.color = hex_color(PALETTE["blue_gray"])[:3]
    fill_data.size = 12
    fill = bpy.data.objects.new("preview_fill", fill_data)
    scene.collection.objects.link(fill)
    fill.location = (12, 8, 2)
    look_at(fill, (0, 1.5, 0))
    cam_data = bpy.data.cameras.new("preview_camera")
    cam = bpy.data.objects.new("preview_camera", cam_data)
    scene.collection.objects.link(cam)
    cam.location = (18, 13, 20)
    cam_data.lens = 48
    look_at(cam, (0, 2, 0))
    scene.camera = cam
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 760
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(RENDER_OUT / "yaba_asset_kit_preview.png")
    scene.world.color = hex_color(PALETTE["night_blue"])[:3]
    stage = {
        "yaba_street_lamp": (-9, 0, -2),
        "yaba_market_stall": (-3, 0, -1),
        "yaba_community_board": (3, 0, -1),
        "yaba_palm_tree": (9, 0, -1),
        "yaba_starter_house": (0, 0, 7),
        "builders_world_avatar_provisional": (8, 0, 6),
    }
    for collection in collections:
        root = bpy.data.objects.get(collection.name.replace("ASSET_", ""))
        if root and root.name in stage:
            root.location = stage[root.name]


def render_asset_cards(collections):
    """Render isolated, named cards so artists can inspect each asset at a useful scale."""
    scene = bpy.context.scene
    camera = scene.camera
    original_camera_type = camera.data.type
    original_camera_lens = camera.data.lens
    original_camera_ortho_scale = camera.data.ortho_scale
    original_hidden = {collection: collection.hide_render for collection in collections}
    original_locations = {}
    for collection in collections:
        root = bpy.data.objects.get(collection.name.replace("ASSET_", ""))
        if root:
            original_locations[root] = root.location.copy()
    preview_ground = bpy.data.objects.get("preview_ground")
    original_ground_hidden = preview_ground.hide_render if preview_ground else False
    if preview_ground:
        # Keep cards focused on the reusable prop. The ground plane makes thin props
        # read like cropped screenshots instead of clean asset turntable cards.
        preview_ground.hide_render = True
    camera.data.type = "ORTHO"
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    for collection in collections:
        for other in collections:
            other.hide_render = other != collection
        root = bpy.data.objects.get(collection.name.replace("ASSET_", ""))
        if root:
            root.location = (0, 0, 0)
        bpy.context.view_layer.update()
        points = []
        for obj in collection.objects:
            if obj.type != "MESH" or obj.get("bw_role") == "collision":
                continue
            points.extend([obj.matrix_world @ Vector(corner) for corner in obj.bound_box])
        if not points:
            continue
        min_v = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
        max_v = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
        center = (min_v + max_v) / 2
        dimensions = max_v - min_v
        # Orthographic cards keep the entire silhouette inside the frame even for
        # tall palms, narrow lamps, or wide house facades.
        camera.data.ortho_scale = max(dimensions.x, dimensions.y, dimensions.z, 1.0) * 1.35
        camera.location = center + Vector((0, camera.data.ortho_scale * 0.08, camera.data.ortho_scale * 2.6))
        look_at(camera, center)
        asset_id = root.name if root else collection.name.replace("ASSET_", "")
        scene.render.filepath = str(RENDER_OUT / f"{asset_id}.png")
        bpy.ops.render.render(write_still=True)
    for collection, hidden in original_hidden.items():
        collection.hide_render = hidden
    for root, location in original_locations.items():
        root.location = location
    if preview_ground:
        preview_ground.hide_render = original_ground_hidden
    camera.data.type = original_camera_type
    camera.data.lens = original_camera_lens
    camera.data.ortho_scale = original_camera_ortho_scale
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 760
    scene.render.filepath = str(RENDER_OUT / "yaba_asset_kit_preview.png")


def select_and_export(collection, path):
    bpy.ops.object.select_all(action="DESELECT")
    objects = [o for o in collection.objects if o.type == "MESH" or o.type == "EMPTY"]
    roots = [o for o in objects if o.type == "EMPTY"]
    original_root_rotations = {root: root.rotation_euler.copy() for root in roots}
    # The authoring script intentionally uses a Y-up mental model while Blender's
    # native scene is Z-up. Rotate the asset root for export so the resulting glTF
    # keeps Y-up coordinates when Blender performs its Z-up → glTF conversion.
    for root in roots:
        root.rotation_euler = (math.pi / 2, 0, 0)
    bpy.context.view_layer.update()
    for obj in objects:
        obj.select_set(True)
    if objects:
        bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB", use_selection=True, export_apply=True)
    bpy.ops.object.select_all(action="DESELECT")
    for root, rotation in original_root_rotations.items():
        root.rotation_euler = rotation
    bpy.context.view_layer.update()


def main():
    clean_scene()
    materials = make_materials()
    meshes = primitive_meshes()
    builders = [
        ("yaba_street_lamp", "Yaba street lamp", make_street_lamp),
        ("yaba_market_stall", "Yaba market stall", make_market_stall),
        ("yaba_community_board", "Yaba community board", make_community_board),
        ("yaba_palm_tree", "Yaba palm tree", make_palm_tree),
        ("yaba_starter_house", "Yaba starter house", make_starter_house),
        ("builders_world_avatar_provisional", "Builders World provisional builder avatar", make_avatar),
    ]
    collections = []
    manifest_assets = []
    collision_names = {
        "yaba_street_lamp": "COLLISION_lamp_pole",
        "yaba_market_stall": "COLLISION_stall",
        "yaba_community_board": "COLLISION_board",
        "yaba_palm_tree": "COLLISION_palm_trunk",
        "yaba_starter_house": "COLLISION_house",
        "builders_world_avatar_provisional": "COLLISION_avatar",
    }
    for asset_id, label, builder in builders:
        collection = builder(materials, meshes)
        collections.append(collection)
        output = OUT / f"{asset_id}.glb"
        select_and_export(collection, output)
        manifest_assets.append({
            "id": asset_id,
            "label": label,
            "runtime": f"assets/exports/models/yaba-kit/{output.name}",
            "preview": f"assets/exports/renders/{asset_id}.png",
            "source": "assets/source/blender/generated-kit/build_yaba_assets.py",
            "format": "GLB / glTF 2.0",
            "units": "meters",
            "axis": "Y-up",
            "lod": "hero reusable prop; create instanced/distant variant at integration time",
            "collision": collision_names[asset_id],
            "materials": "shared procedural PBR materials; no external textures",
            "provenance": "Procedural derivative authored from ChatGPT-generated local visual references; no reference image pixels shipped in the GLB.",
            "approval": "prototype / pending art direction approval",
        })
    setup_preview(materials, meshes, collections)
    render_asset_cards(collections)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE_OUT / "yaba_asset_kit.blend"))
    bpy.context.scene.render.filepath = str(RENDER_OUT / "yaba_asset_kit_preview.png")
    bpy.ops.render.render(write_still=True)
    manifest = {
        "schema": "builders-world.asset-manifest.v1",
        "updated": "2026-10-09",
        "engine": "Three.js",
        "asset_family": "Yaba visual reference kit",
        "reference_directory": "generated_images/chatgpt-yaba-visual-references",
        "source_script": "assets/source/blender/generated-kit/build_yaba_assets.py",
        "blender": "5.2.2 LTS",
        "runtime_contract": {"format": "GLB", "color_space": "sRGB", "texture_policy": "procedural/no external textures", "origin": "ground contact at y=0"},
        "contact_sheet": "assets/exports/renders/yaba-kit-contact-sheet.png",
        "assets": manifest_assets,
    }
    (OUT / "asset-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"outputs": [str(OUT / f'{asset_id}.glb') for asset_id, _, _ in builders], "preview": str(RENDER_OUT / 'yaba_asset_kit_preview.png')}, indent=2))


if __name__ == "__main__":
    main()
