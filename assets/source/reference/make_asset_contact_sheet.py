"""Assemble the named Blender asset cards into one review image."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
RENDER_DIR = ROOT / "assets" / "exports" / "renders"
OUTPUT = RENDER_DIR / "yaba-kit-contact-sheet.png"
ASSETS = [
    ("Yaba street lamp", "yaba_street_lamp.png"),
    ("Yaba market stall", "yaba_market_stall.png"),
    ("Yaba community board", "yaba_community_board.png"),
    ("Yaba palm tree", "yaba_palm_tree.png"),
    ("Yaba starter house", "yaba_starter_house.png"),
    ("Provisional builder avatar", "builders_world_avatar_provisional.png"),
    ("Yaba danfo minibus", "yaba_danfo_minibus.png"),
    ("Yaba compound shop", "yaba_compound_shop.png"),
    ("Yaba mid-rise corner block", "yaba_midrise_corner_block.png"),
    ("Yaba utility pole", "yaba_utility_pole.png"),
    ("Yaba drainage gutter", "yaba_drainage_gutter.png"),
    ("Yaba rooftop water tank", "yaba_rooftop_water_tank.png"),
]


def main():
    card_w, card_h, label_h = 640, 640, 58
    columns = 3
    rows = (len(ASSETS) + columns - 1) // columns
    sheet = Image.new("RGB", (card_w * columns, (card_h + label_h) * rows), "#101a21")
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24)
    except OSError:
        font = ImageFont.load_default()
    for index, (label, filename) in enumerate(ASSETS):
        image = Image.open(RENDER_DIR / filename).convert("RGB").resize((card_w, card_h), Image.Resampling.LANCZOS)
        x = (index % columns) * card_w
        y = (index // columns) * (card_h + label_h)
        sheet.paste(image, (x, y + label_h))
        draw.rectangle((x, y, x + card_w, y + label_h), fill="#172a35")
        draw.text((x + 18, y + 16), label, fill="#f4b54e", font=font)
    sheet.save(OUTPUT, format="PNG", optimize=True)
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
