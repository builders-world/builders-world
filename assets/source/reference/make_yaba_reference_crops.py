"""Create lightweight, named inspection crops from the local Yaba reference boards.

The crops are for art review and prompting only. Runtime assets never load these files.
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "generated_images" / "chatgpt-yaba-visual-references"
OUT = ROOT / "assets" / "reference" / "generated-visual-direction" / "extracted-crops"
OUT.mkdir(parents=True, exist_ok=True)


CROPS = [
    {
        "source": "exec-fc5fc17f-4c86-4121-b8bf-41383c381c80.png",
        "name": "yaba-market-street-and-wet-pavement.png",
        "box": (0, 160, 930, 941),
    },
    {
        "source": "exec-4ac4ac0c-ae8b-492f-894e-9099883b22a6.png",
        "name": "yaba-community-board-interaction.png",
        "box": (900, 260, 1672, 941),
    },
    {
        "source": "exec-2ca88e5a-56ff-46a5-a2b3-6a26e6378fa0.png",
        "name": "builders-world-avatar-turnaround.png",
        "box": (700, 0, 1115, 620),
    },
    {
        "source": "exec-2ca88e5a-56ff-46a5-a2b3-6a26e6378fa0.png",
        "name": "yaba-materials-reference-strip.png",
        "box": (0, 620, 1672, 941),
    },
    {
        "source": "exec-a1590ed1-df4f-4ed9-87ff-6d4905226e11.png",
        "name": "yaba-explore-connect-build-flow.png",
        "box": (0, 185, 1672, 810),
    },
    {
        "source": "exec-a1590ed1-df4f-4ed9-87ff-6d4905226e11.png",
        "name": "yaba-blue-hour-skyline-banner.png",
        "box": (0, 0, 1672, 220),
    },
]


def save_crop(item):
    source_path = SOURCE / item["source"]
    image = Image.open(source_path).convert("RGB")
    crop = image.crop(item["box"])
    crop.thumbnail((1400, 1000), Image.Resampling.LANCZOS)
    crop.save(OUT / item["name"], format="PNG", optimize=True)


def main():
    for item in CROPS:
        save_crop(item)
    print(f"Wrote {len(CROPS)} named reference crops to {OUT}")


if __name__ == "__main__":
    main()
