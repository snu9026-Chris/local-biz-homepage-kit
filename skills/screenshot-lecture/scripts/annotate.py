"""캡처 이미지에 번호·색 박스와 라벨을 그린다.

사용: python3 annotate.py <입력.png> <출력.png> <표시.json>
표시.json 예:
  {"crop": [0, 0, 1200, 600], "scale": 2, "font": 30,
   "marks": [{"box": [10, 736, 266, 786], "label": "① 사이드바", "color": "red"},
             {"circle": [1973, 23, 30], "label": "⋮ 메뉴", "color": "#1e6ee6"}]}
- 좌표는 «원본 이미지 픽셀» 기준. Read 도구가 축소해 보여 줬다면 표시된 배율을 곱해 넣는다.
- color: red·blue·green·orange, PIL 색 이름, "#rrggbb", [r,g,b] 중 하나. 모르는 값은 red 로 대체하고 경고한다.
- 경고(표시가 잘라낸 영역 밖·라벨이 이미지보다 넓음 등)는 stderr 로 출력한다 — 결과 이미지를 반드시 눈으로 다시 본다.
"""
import json
import sys

from PIL import Image, ImageColor, ImageDraw, ImageFont

COLORS = {"red": (229, 57, 53), "blue": (30, 110, 230), "green": (20, 140, 80), "orange": (232, 120, 20)}
FONT = "/System/Library/Fonts/AppleSDGothicNeo.ttc"  # index 6 = 굵은 한글


def warn(msg):
    print("경고:", msg, file=sys.stderr)


def color(v):
    if isinstance(v, (list, tuple)) and len(v) == 3:
        return tuple(int(c) for c in v)
    if isinstance(v, str):
        if v in COLORS:
            return COLORS[v]
        try:
            return ImageColor.getrgb(v)
        except ValueError:
            pass
    warn(f"알 수 없는 색 {v!r} → red 로 대체")
    return COLORS["red"]


def main(src, dst, spec_path):
    spec = json.load(open(spec_path, encoding="utf-8"))
    im = Image.open(src).convert("RGB")
    ox, oy, s = 0, 0, float(spec.get("scale", 1))
    if "crop" in spec:
        x0, y0, x1, y1 = spec["crop"]
        x0, x1 = sorted((max(0, x0), min(im.width, x1)))
        y0, y1 = sorted((max(0, y0), min(im.height, y1)))
        if [x0, y0, x1, y1] != list(spec["crop"]):
            warn(f"crop 이 이미지 범위를 넘어 {[x0, y0, x1, y1]} 로 줄임")
        ox, oy = x0, y0
        im = im.crop((x0, y0, x1, y1))
    if s != 1:
        im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    font = ImageFont.truetype(FONT, int(spec.get("font", 30)), index=6)
    t = lambda x, y: (int((x - ox) * s), int((y - oy) * s))

    for i, m in enumerate(spec.get("marks", [])):
        col = color(m.get("color", "red"))
        if "box" in m:
            (ax0, ay0), (ax1, ay1) = t(*m["box"][:2]), t(*m["box"][2:])
            x0, x1 = sorted((ax0, ax1)); y0, y1 = sorted((ay0, ay1))
            d.rectangle([x0, y0, x1, y1], outline=col, width=6)
            lx, ly = x0, y1 + 10
        elif "circle" in m:
            cx, cy = t(*m["circle"][:2]); r = int(m["circle"][2] * s)
            x0, y0, x1, y1 = cx - r, cy - r, cx + r, cy + r
            d.ellipse([x0, y0, x1, y1], outline=col, width=6)
            lx, ly = x0, y1 + 10
        else:
            warn(f"marks[{i}] 에 box·circle 이 없어 건너뜀"); continue
        if x1 < 0 or y1 < 0 or x0 > im.width or y0 > im.height:
            warn(f"marks[{i}] 가 잘라낸 영역 밖에 있음 — 결과에 안 보인다")
        if m.get("label"):
            tw = d.textlength(m["label"], font=font); h = font.size + 16
            if tw + 28 > im.width:
                warn(f"marks[{i}] 라벨이 이미지보다 넓어 잘린다 — 글자를 줄이거나 font 를 낮춘다")
            # 라벨이 이미지 밖으로 나가 잘리지 않게 네 방향 모두 안쪽으로 당긴다.
            lx = max(4, min(lx, im.width - tw - 28)); ly = max(4, min(ly, im.height - h - 4))
            d.rounded_rectangle([lx, ly, lx + tw + 24, ly + h], radius=8, fill=col)
            d.text((lx + 12, ly + 6), m["label"], font=font, fill="white")
    im.save(dst)
    print(dst, f"{im.width}x{im.height}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:4])
