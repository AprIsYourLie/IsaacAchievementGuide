"""把 1–637 号 64×64 PNG 合并为一个 WebP 图集。"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "achievements"
OUTPUT = ROOT / "assets" / "achievement-atlas.webp"
CELL = 64
COLS = 20
ROWS = 32

atlas = Image.new("RGB", (COLS * CELL, ROWS * CELL), (16, 14, 12))
for achievement_id in range(1, 638):
    path = SOURCE / f"{achievement_id}.png"
    if not path.exists():
        raise FileNotFoundError(f"缺少图标：{path}")
    with Image.open(path) as image:
        if image.size != (CELL, CELL):
            raise ValueError(f"#{achievement_id} 图标尺寸不是 64×64：{image.size}")
        index = achievement_id - 1
        atlas.paste(image.convert("RGB"), ((index % COLS) * CELL, (index // COLS) * CELL))

atlas.save(OUTPUT, "WEBP", quality=92, method=6)
print(f"已生成：{OUTPUT}")
print(f"尺寸：{atlas.width}×{atlas.height}；大小：{OUTPUT.stat().st_size / 1024:.1f} KB")
