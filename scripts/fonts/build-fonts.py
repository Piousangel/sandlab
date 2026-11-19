#!/usr/bin/env python3
"""리디자인 v2 웹폰트 재현 스크립트 (P1, DECISIONS 2026-11-19 웹폰트 도입).

원본(google/fonts, OFL)을 받아 정적 인스턴스로 자르고 라틴 서브셋 woff2를 만든다.
  - Bricolage Grotesque 400 (opsz 14, 본문·UI) / 700 (opsz 48, 제목·디스플레이), wdth 100
  - JetBrains Mono 500 (라벨·계기 숫자)

준비(저장소 의존성과 분리한 가상환경):
  python3 -m venv /tmp/venv-fonts && /tmp/venv-fonts/bin/pip install "fonttools[woff]==4.55.3"
원본 받기(빈 폴더에, 아래 SOURCES의 sha256과 대조):
  curl -L -o <dir>/Bricolage.ttf 'https://github.com/google/fonts/raw/main/ofl/bricolagegrotesque/BricolageGrotesque%5Bopsz,wdth,wght%5D.ttf'
  curl -L -o <dir>/JBMono.ttf    'https://github.com/google/fonts/raw/main/ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf'
실행(받은 파일 폴더 안에서 실행하지 말 것, -I로 격리):
  /tmp/venv-fonts/bin/python -I scripts/fonts/build-fonts.py <dir> src/ui-next/fonts
"""
import hashlib
import sys
from pathlib import Path

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

SOURCES = {
    "Bricolage.ttf": "413e7357809ddd12fd80a96a8a396de0e401638d4acd3cb3e37532f0472ac682",  # v1.001
    "JBMono.ttf": "48715a42ec242c21e9f02692891e147d022299a52e48d5e413e1a942193ffeda",  # v2.211
}

# Google Fonts 'latin' 서브셋과 같은 범위
LATIN = (
    list(range(0x0000, 0x0100))
    + [0x0131, 0x0152, 0x0153, 0x02BB, 0x02BC, 0x02C6, 0x02DA, 0x02DC, 0x0304, 0x0308, 0x0329]
    + list(range(0x2000, 0x2070))
    + [0x20AC, 0x2122, 0x2191, 0x2193, 0x2212, 0x2215, 0xFEFF, 0xFFFD]
)

OUTPUTS = [
    # (원본, 축 고정값, 출력 파일, 레이아웃 기능)
    ("Bricolage.ttf", {"wght": 400, "opsz": 14, "wdth": 100}, "bricolage-grotesque-400-latin.woff2", ["kern", "liga", "calt", "tnum", "case"]),
    ("Bricolage.ttf", {"wght": 700, "opsz": 48, "wdth": 100}, "bricolage-grotesque-700-latin.woff2", ["kern", "liga", "calt", "tnum", "case"]),
    ("JBMono.ttf", {"wght": 500}, "jetbrains-mono-500-latin.woff2", ["kern", "tnum", "zero"]),  # 모노는 리거처(=> 등) 끔
]


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


STYLE = {400: "Regular", 500: "Medium", 700: "Bold"}


def rename(font: TTFont, wght: int) -> None:
    """instancer(updateFontNames=False)는 기본 인스턴스 이름(예: '96pt ExtraBold')을 남긴다 — 실제 굵기로 고친다."""
    name = font["name"]
    family = name.getDebugName(16) or name.getDebugName(1)
    family = family.replace(" 96pt", "").replace(" ExtraBold", "").replace(" Thin", "").strip()
    style = STYLE[wght]
    full = f"{family} {style}"
    ps = f"{family.replace(' ', '')}-{style}"
    for nid in (16, 17, 25):
        name.removeNames(nameID=nid)
    for nid, val in ((1, family), (2, style), (4, full), (6, ps)):
        name.removeNames(nameID=nid)
        name.setName(val, nid, 3, 1, 0x409)
    font["OS/2"].usWeightClass = wght


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit("usage: build-fonts.py <원본 폴더> <출력 폴더>")
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    dst.mkdir(parents=True, exist_ok=True)
    for name, want in SOURCES.items():
        got = sha256(src / name)
        if got != want:
            sys.exit(f"{name}: sha256 불일치 {got} (원본이 바뀌었으면 SOURCES를 갱신하고 실측표를 다시 잰다)")
    for name, axes, out, features in OUTPUTS:
        font = TTFont(src / name)
        static = instantiateVariableFont(font, axes, updateFontNames=False)
        for tag in ("STAT", "MVAR", "HVAR", "avar"):  # 가변 전용 잔재
            if tag in static:
                del static[tag]
        rename(static, axes["wght"])
        opts = Options()
        opts.flavor = "woff2"
        opts.layout_features = features
        opts.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]  # 저작권·이름·버전 + 라이선스·URL(OFL 2조: 사본마다 고지)
        opts.notdef_outline = True
        opts.hinting = False  # 고해상도 화면 기준, 힌팅 제거로 크기 절감
        opts.desubroutinize = True
        sub = Subsetter(opts)
        sub.populate(unicodes=LATIN)
        sub.subset(static)
        static.flavor = "woff2"
        static.recalcTimestamp = False  # head.modified를 원본 값으로 고정 → 다시 돌려도 바이트가 같다
        static.save(dst / out)
        print(f"{out}\t{(dst / out).stat().st_size} bytes")


if __name__ == "__main__":
    main()
