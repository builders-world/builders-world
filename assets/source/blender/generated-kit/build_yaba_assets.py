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
    "glass_dark": "#27414A",
    "danfo_yellow": "#E7A92F",
    "rubber": "#151B1D",
    "warning": "#E55C3C",
    "water_blue": "#2E6878",
    "sign_white": "#F1E8D1",
    "rust": "#8B4D35",
    "mural_blue": "#274B68",
    "mural_ochre": "#D9943D",
    "mural_pink": "#D47E79",
    "mural_green": "#5C8A72",
    "vest_green": "#3F6658",
    "denim": "#273B4B",
    "sneaker": "#E7E2D4",
    "skin_deep": "#6E432F",
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


def make_danfo_minibus(materials, meshes):
    """A compact Lagos danfo silhouette for readable street movement."""
    c, r = new_asset("yaba_danfo_minibus", "Yaba danfo minibus")
    box(c, r, meshes, materials, "danfo_lower_body", (0, 0.95, 0), (4.8, 1.12, 1.86), "danfo_yellow")
    box(c, r, meshes, materials, "danfo_upper_body", (0.1, 1.72, 0), (4.25, 0.72, 1.72), "cream")
    box(c, r, meshes, materials, "danfo_black_belt", (0, 1.28, 0), (4.86, 0.18, 1.92), "charcoal")
    box(c, r, meshes, materials, "danfo_yellow_belt", (0, 1.45, 0), (4.88, 0.16, 1.94), "danfo_yellow")
    box(c, r, meshes, materials, "danfo_roof", (0.05, 2.18, 0), (4.42, 0.16, 1.86), "danfo_yellow")
    for side in (-1, 1):
        box(c, r, meshes, materials, f"danfo_side_window_front_{side}", (-1.25, 1.83, side * 0.88), (1.15, 0.58, 0.04), "glass_dark")
        box(c, r, meshes, materials, f"danfo_side_window_rear_{side}", (0.75, 1.83, side * 0.88), (1.45, 0.58, 0.04), "glass_dark")
    box(c, r, meshes, materials, "danfo_front_window", (2.16, 1.82, 0), (0.04, 0.6, 1.45), "glass_dark")
    box(c, r, meshes, materials, "danfo_rear_window", (-2.16, 1.82, 0), (0.04, 0.6, 1.45), "glass_dark")
    box(c, r, meshes, materials, "danfo_front_bumper", (2.48, 0.52, 0), (0.16, 0.24, 1.72), "charcoal")
    box(c, r, meshes, materials, "danfo_route_panel", (0.15, 2.28, 0), (1.5, 0.12, 0.7), "sign_white")
    for x in (-1.45, 1.45):
        for z in (-0.98, 0.98):
            add_object(c, r, meshes["cylinder"], f"danfo_wheel_{x}_{z}", (x, 0.52, z), (0.42, 0.42, 0.13), materials["rubber"], role="render")
            add_object(c, r, meshes["cylinder"], f"danfo_hub_{x}_{z}", (x, 0.52, z * 1.01), (0.17, 0.17, 0.145), materials["metal"], role="render")
    box(c, r, meshes, materials, "COLLISION_danfo", (0, 1.15, 0), (4.9, 2.25, 1.95), "charcoal", role="collision")
    return c


def make_compound_shop(materials, meshes):
    """Street-facing low-rise compound/shop mass for Yaba's neighborhood fabric."""
    c, r = new_asset("yaba_compound_shop", "Yaba compound shop")
    box(c, r, meshes, materials, "shop_shell", (0, 2.7, 0), (8.2, 5.2, 5.8), "plaster")
    box(c, r, meshes, materials, "shop_front_band", (0, 4.95, 2.94), (8.1, 0.34, 0.16), "teal")
    box(c, r, meshes, materials, "shop_left_shutter", (-2.35, 2.25, 2.98), (2.65, 2.2, 0.12), "wood_light")
    box(c, r, meshes, materials, "shop_left_opening", (-2.35, 2.25, 3.08), (2.25, 1.68, 0.04), "glass_dark")
    box(c, r, meshes, materials, "shop_door", (0.25, 2.25, 3.08), (1.05, 2.25, 0.1), "deep_teal")
    box(c, r, meshes, materials, "shop_right_window", (2.55, 2.35, 3.08), (1.8, 1.8, 0.06), "glass")
    box(c, r, meshes, materials, "shop_awning", (0, 3.75, 3.48), (7.8, 0.18, 1.45), "coral", (0.12, 0, 0))
    box(c, r, meshes, materials, "shop_sign", (-0.8, 4.48, 3.2), (3.25, 0.62, 0.08), "sign_white")
    box(c, r, meshes, materials, "shop_sign_accent", (-0.8, 4.48, 3.27), (2.45, 0.12, 0.04), "amber")
    box(c, r, meshes, materials, "shop_step", (0, 0.32, 3.35), (7.5, 0.28, 1.0), "concrete")
    for x in (-3.4, 3.4):
        box(c, r, meshes, materials, f"shop_pillar_{x}", (x, 2.5, 3.18), (0.28, 4.7, 0.28), "concrete")
    box(c, r, meshes, materials, "COLLISION_compound_shop", (0, 2.7, 0), (8.3, 5.3, 5.9), "charcoal", role="collision")
    return c


def make_midrise_corner_block(materials, meshes):
    """A repeated mid-rise landmark with a teal roofline and warm windows."""
    c, r = new_asset("yaba_midrise_corner_block", "Yaba mid-rise corner block")
    box(c, r, meshes, materials, "midrise_mass", (0, 6.4, 0), (10.5, 12.8, 8.2), "blue_gray")
    box(c, r, meshes, materials, "midrise_lower_plinth", (0, 0.75, 0), (10.8, 1.5, 8.5), "deep_teal")
    box(c, r, meshes, materials, "midrise_roof_cap", (0, 13.0, 0), (10.9, 0.38, 8.6), "teal")
    for floor in range(4):
        y = 3.1 + floor * 2.55
        for x in (-3.6, -1.2, 1.2, 3.6):
            box(c, r, meshes, materials, f"midrise_window_front_{floor}_{x}", (x, y, 4.16), (1.25, 1.0, 0.05), "amber_soft" if (floor + int(x)) % 3 else "glass_dark")
            box(c, r, meshes, materials, f"midrise_window_side_{floor}_{x}", (5.26, y, x * 0.72), (0.05, 1.0, 1.25), "amber_soft" if floor % 2 else "glass_dark")
    box(c, r, meshes, materials, "midrise_shopfront", (0, 1.55, 4.2), (8.8, 1.25, 0.08), "sign_white")
    box(c, r, meshes, materials, "midrise_vertical_accent", (-4.45, 6.5, 4.22), (0.28, 11.2, 0.08), "amber")
    box(c, r, meshes, materials, "COLLISION_midrise", (0, 6.4, 0), (10.6, 13.0, 8.3), "charcoal", role="collision")
    return c


def make_utility_pole(materials, meshes):
    """Concrete/wood utility pole with a cheap, readable wire silhouette."""
    c, r = new_asset("yaba_utility_pole", "Yaba utility pole")
    cylinder(c, r, meshes, materials, "utility_pole", (0, 4.4, 0), 0.16, 8.8, "wood")
    box(c, r, meshes, materials, "utility_crossarm", (0, 7.35, 0), (3.0, 0.15, 0.15), "wood_light")
    for x in (-1.0, 0, 1.0):
        cylinder(c, r, meshes, materials, f"utility_insulator_{x}", (x, 7.62, 0), 0.11, 0.34, "cream")
    for z in (-0.55, 0.55):
        box(c, r, meshes, materials, f"utility_wire_{z}", (0, 7.88, z), (8.5, 0.035, 0.035), "charcoal")
    box(c, r, meshes, materials, "utility_notice_band", (0, 3.8, -0.18), (0.48, 0.8, 0.04), "warning")
    cylinder(c, r, meshes, materials, "COLLISION_utility_pole", (0, 4.4, 0), 0.32, 8.9, "charcoal", role="collision")
    return c


def make_drainage_gutter(materials, meshes):
    """Open roadside drain segment to give the rain scene a Lagos-specific edge."""
    c, r = new_asset("yaba_drainage_gutter", "Yaba roadside drainage gutter")
    box(c, r, meshes, materials, "drain_channel", (0, 0.06, 0), (8.0, 0.12, 0.72), "wet")
    box(c, r, meshes, materials, "drain_left_wall", (0, 0.28, -0.48), (8.0, 0.5, 0.14), "concrete")
    box(c, r, meshes, materials, "drain_right_wall", (0, 0.28, 0.48), (8.0, 0.5, 0.14), "concrete")
    for x in (-3.0, -1.0, 1.0, 3.0):
        box(c, r, meshes, materials, f"drain_cover_{x}", (x, 0.38, 0), (1.3, 0.12, 1.1), "concrete")
    box(c, r, meshes, materials, "COLLISION_drainage", (0, 0.35, 0), (8.1, 0.65, 1.2), "charcoal", role="collision")
    return c


def make_rooftop_water_tank(materials, meshes):
    """A rooftop tank silhouette that makes the district read as Lagos rather than a generic city."""
    c, r = new_asset("yaba_rooftop_water_tank", "Yaba rooftop water tank")
    for x in (-0.55, 0.55):
        for z in (-0.55, 0.55):
            box(c, r, meshes, materials, f"tank_leg_{x}_{z}", (x, 1.0, z), (0.14, 2.0, 0.14), "metal")
    cylinder(c, r, meshes, materials, "tank_body", (0, 2.2, 0), 0.9, 1.8, "water_blue")
    cylinder(c, r, meshes, materials, "tank_cap", (0, 3.2, 0), 0.64, 0.16, "charcoal")
    cylinder(c, r, meshes, materials, "tank_pipe", (0.9, 1.1, 0), 0.06, 1.2, "metal")
    box(c, r, meshes, materials, "COLLISION_water_tank", (0, 2.1, 0), (2.0, 3.4, 2.0), "charcoal", role="collision")
    return c


def make_creative_hub_frontage(materials, meshes):
    """Hero frontage matching the supplied Yaba Creative Hub illustration language."""
    c, r = new_asset("yaba_creative_hub_frontage", "Yaba Creative Hub frontage")
    box(c, r, meshes, materials, "hub_back_shell", (0, 3.4, -1.0), (11.5, 6.8, 2.6), "deep_teal")
    box(c, r, meshes, materials, "hub_mural_wall", (3.0, 3.35, 0.42), (5.3, 6.4, 0.16), "plaster")
    box(c, r, meshes, materials, "hub_container_left", (-3.95, 3.25, 0.58), (3.0, 6.5, 2.25), "mural_blue")
    box(c, r, meshes, materials, "hub_container_sign", (-3.95, 4.7, 1.76), (2.35, 1.5, 0.08), "amber")
    box(c, r, meshes, materials, "hub_sign_shadow", (-3.95, 4.7, 1.84), (2.0, 0.95, 0.04), "charcoal")
    for x in (-4.45, -3.45):
        box(c, r, meshes, materials, f"hub_sign_letter_{x}", (x, 4.7, 1.9), (0.26, 0.72, 0.04), "sign_white")
    # Mural color blocking and a simplified bridge/skyline silhouette.
    box(c, r, meshes, materials, "mural_sky", (3.0, 5.2, 0.54), (5.0, 2.4, 0.035), "mural_blue")
    box(c, r, meshes, materials, "mural_ochre_sun", (4.35, 5.0, 0.58), (1.35, 1.35, 0.04), "mural_ochre")
    box(c, r, meshes, materials, "mural_pink_block", (1.85, 3.95, 0.58), (1.5, 1.75, 0.04), "mural_pink")
    box(c, r, meshes, materials, "mural_green_block", (3.65, 3.25, 0.58), (2.35, 1.15, 0.04), "mural_green")
    box(c, r, meshes, materials, "mural_bridge_deck", (3.0, 4.2, 0.62), (4.7, 0.12, 0.04), "amber")
    for x in (1.1, 2.0, 3.0, 4.0, 4.9):
        box(c, r, meshes, materials, f"mural_bridge_pier_{x}", (x, 3.75, 0.62), (0.12, 0.82, 0.04), "mural_blue")
    # Open-air balcony/pergola gives the hub a strong near-field silhouette.
    for x in (-5.0, -2.0, 0.8, 5.3):
        box(c, r, meshes, materials, f"hub_column_{x}", (x, 3.2, 2.0), (0.22, 6.4, 0.22), "wood_light")
    for x in (-3.7, -1.5, 0.7, 2.9, 5.1):
        box(c, r, meshes, materials, f"hub_pergola_beam_{x}", (x, 6.55, 1.75), (2.0, 0.16, 2.2), "wood")
        sphere(c, r, meshes, materials, f"hub_string_light_{x}", (x, 5.82, 2.74), (0.11, 0.11, 0.11), "amber")
    box(c, r, meshes, materials, "hub_roof", (0.2, 6.92, 0.72), (11.0, 0.22, 5.0), "charcoal")
    box(c, r, meshes, materials, "hub_steps", (0.1, 0.42, 2.1), (10.0, 0.34, 2.2), "concrete")
    # Community board at the route-facing edge, with colorful low-cost notes.
    box(c, r, meshes, materials, "hub_board_frame", (5.15, 2.35, 2.72), (2.8, 2.3, 0.16), "wood_light")
    box(c, r, meshes, materials, "hub_board_panel", (5.15, 2.35, 2.82), (2.5, 1.95, 0.05), "deep_teal")
    for i, mat in enumerate(("amber", "sign_white", "mural_pink", "mural_green", "amber", "sign_white")):
        box(c, r, meshes, materials, f"hub_board_note_{i}", (4.35 + (i % 3) * 0.75, 1.85 + (i // 3) * 0.72, 2.88), (0.5, 0.38, 0.035), mat)
    for x in (-4.7, 4.7):
        box(c, r, meshes, materials, f"hub_planter_{x}", (x, 0.72, 2.6), (0.8, 0.9, 0.8), "concrete")
        for i in range(3):
            leaf(c, r, meshes, materials, f"hub_leaf_{x}_{i}", (x, 1.35, 2.6), (0.25, 0.72, 0.08), (0.2, i * 2.1, 0.3), "leaf_light")
    box(c, r, meshes, materials, "COLLISION_creative_hub", (0, 3.3, 0.0), (11.7, 6.9, 5.9), "charcoal", role="collision")
    return c


def make_stylized_builder_avatar(materials, meshes):
    """Low-poly builder silhouette based on the supplied cap/vest/cargo illustration."""
    c, r = new_asset("builders_world_stylized_builder", "Builders World stylized builder")
    # Cargo trousers and sneakers keep the 1.8 m silhouette readable at street scale.
    for x in (-0.28, 0.28):
        box(c, r, meshes, materials, f"builder_cargo_leg_{x}", (x, 0.64, 0), (0.42, 1.04, 0.46), "denim")
        box(c, r, meshes, materials, f"builder_cargo_pocket_{x}", (x * 1.04, 0.72, 0.25), (0.28, 0.34, 0.05), "vest_green")
        box(c, r, meshes, materials, f"builder_sneaker_{x}", (x, 0.1, 0.16), (0.54, 0.22, 0.82), "sneaker")
    box(c, r, meshes, materials, "builder_tshirt", (0, 1.52, 0), (1.02, 0.86, 0.56), "sign_white")
    box(c, r, meshes, materials, "builder_vest_front", (0, 1.65, 0.3), (0.92, 0.9, 0.08), "vest_green")
    box(c, r, meshes, materials, "builder_vest_back", (0, 1.65, -0.3), (0.92, 0.9, 0.08), "vest_green")
    sphere(c, r, meshes, materials, "builder_head", (0, 2.55, 0), (0.39, 0.44, 0.38), "skin_deep")
    sphere(c, r, meshes, materials, "builder_hair", (0, 2.87, -0.02), (0.41, 0.2, 0.36), "charcoal")
    box(c, r, meshes, materials, "builder_cap_crown", (0, 3.06, 0), (0.76, 0.18, 0.66), "sneaker")
    box(c, r, meshes, materials, "builder_cap_brim", (0, 3.0, 0.3), (0.6, 0.08, 0.28), "sneaker")
    for x in (-0.68, 0.68):
        box(c, r, meshes, materials, f"builder_arm_{x}", (x, 1.53, 0), (0.22, 0.85, 0.26), "skin_deep", (0, 0, -x * 0.16))
    box(c, r, meshes, materials, "builder_crossbody_bag", (0.58, 1.65, 0.38), (0.42, 0.5, 0.16), "charcoal")
    box(c, r, meshes, materials, "builder_bag_strap", (-0.05, 1.98, 0.31), (0.08, 1.0, 0.06), "charcoal", (0.16, 0, -0.22))
    box(c, r, meshes, materials, "COLLISION_stylized_builder", (0, 1.55, 0), (1.15, 3.2, 0.86), "charcoal", role="collision")
    return c


def setup_preview(materials, meshes, collections):
    scene = bpy.context.scene
    floor = bpy.data.objects.new("preview_ground", meshes["cube"])
    scene.collection.objects.link(floor)
    floor.location = (0, -0.08, 0)
    floor.scale = (24, 0.08, 18)
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
    cam.location = (30, 20, 34)
    cam_data.lens = 48
    look_at(cam, (0, 4, 4))
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
        "yaba_danfo_minibus": (-14, 0, 8),
        "yaba_compound_shop": (-5, 0, 9),
        "yaba_midrise_corner_block": (8, 0, 9),
        "yaba_utility_pole": (-13, 0, 16),
        "yaba_drainage_gutter": (-2, 0, 16),
        "yaba_rooftop_water_tank": (8, 0, 16),
        "yaba_creative_hub_frontage": (17, 0, 11),
        "builders_world_stylized_builder": (17, 0, 4),
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
        # Blender's camera view is opposite the Y-up authoring convention used by
        # these procedural props; a 180° roll makes review cards read upright while
        # leaving the exported GLB transforms untouched.
        camera.rotation_euler.rotate_axis("Z", math.pi)
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
        ("yaba_danfo_minibus", "Yaba danfo minibus", make_danfo_minibus),
        ("yaba_compound_shop", "Yaba compound shop", make_compound_shop),
        ("yaba_midrise_corner_block", "Yaba mid-rise corner block", make_midrise_corner_block),
        ("yaba_utility_pole", "Yaba utility pole", make_utility_pole),
        ("yaba_drainage_gutter", "Yaba roadside drainage gutter", make_drainage_gutter),
        ("yaba_rooftop_water_tank", "Yaba rooftop water tank", make_rooftop_water_tank),
        ("yaba_creative_hub_frontage", "Yaba Creative Hub frontage", make_creative_hub_frontage),
        ("builders_world_stylized_builder", "Builders World stylized builder", make_stylized_builder_avatar),
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
        "yaba_danfo_minibus": "COLLISION_danfo",
        "yaba_compound_shop": "COLLISION_compound_shop",
        "yaba_midrise_corner_block": "COLLISION_midrise",
        "yaba_utility_pole": "COLLISION_utility_pole",
        "yaba_drainage_gutter": "COLLISION_drainage",
        "yaba_rooftop_water_tank": "COLLISION_water_tank",
        "yaba_creative_hub_frontage": "COLLISION_creative_hub",
        "builders_world_stylized_builder": "COLLISION_stylized_builder",
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
