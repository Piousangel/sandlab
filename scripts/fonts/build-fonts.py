#!/usr/bin/env python3
"""리디자인 v2 웹폰트 재현 스크립트 (P1, DECISIONS 2026-11-19 웹폰트 도입).

원본(google/fonts, OFL)을 받아 정적 인스턴스로 자르고 라틴 서브셋 woff2를 만든다.
글자 범위는 두 파일로 나눈다(P12 LCP, DECISIONS 2026-11-20 'P12 LCP'): core(영문 기본 글자 + 사이트가 쓰는 문장부호)와
ext(나머지 라틴 — 악센트 문자 등). CSS(src/ui-next/fonts.css)의 unicode-range로 나눠 두면 브라우저는 그 글자가 화면에 있을 때만
ext를 받는다 — 영어 페이지 첫 화면은 core만(서체 3개 47.4KB → 약 30KB). 실행 끝에 찍는 unicode-range를 fonts.css에 그대로 쓴다.
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

# core: 영문 기본 글자 + 사이트 본문·UI가 실제로 쓰는 라틴 밖 글자(out/ 전체 HTML 실측 — · — … ’ © × “ ” – − 등).
# 여기 없는 라틴 글자(é 같은 악센트, 갤러리 제목 등 사용자 글자)는 ext 파일이 맡는다 — 모양은 같은 서체, 받는 시점만 다르다.
CORE = sorted(
    set(range(0x0020, 0x007F))
    | {0x00A0, 0x00A9, 0x00B7, 0x00D7, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2026, 0x2212}
)
EXT = sorted(set(LATIN) - set(CORE))

OUTPUTS = [
    # (원본, 축 고정값, 출력 파일 접두, 레이아웃 기능)
    ("Bricolage.ttf", {"wght": 400, "opsz": 14, "wdth": 100}, "bricolage-grotesque-400", ["kern", "liga", "calt", "tnum", "case"]),
    ("Bricolage.ttf", {"wght": 700, "opsz": 48, "wdth": 100}, "bricolage-grotesque-700", ["kern", "liga", "calt", "tnum", "case"]),
    ("JBMono.ttf", {"wght": 500}, "jetbrains-mono-500", ["kern", "tnum", "zero"]),  # 모노는 리거처(=> 등) 끔
]
PARTS = [("core", CORE), ("ext", EXT)]


def unicode_range(cps: list) -> str:
    """코드 포인트 목록 → CSS unicode-range 문자열(연속 구간은 U+XXXX-YYYY)."""
    out, start, prev = [], None, None
    for c in cps + [None]:
        if start is not None and (c is None or c != prev + 1):
            out.append(f"U+{start:04X}" if start == prev else f"U+{start:04X}-{prev:04X}")
            start = None
        if c is not None and start is None:
            start = c
        prev = c
    return ", ".join(out)


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
    for (name, axes, prefix, features), (part, cps) in [(o, p) for o in OUTPUTS for p in PARTS]:
        out = f"{prefix}-{part}.woff2"
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
        sub.populate(unicodes=cps)
        sub.subset(static)
        static.flavor = "woff2"
        static.recalcTimestamp = False  # head.modified를 원본 값으로 고정 → 다시 돌려도 바이트가 같다
        static.save(dst / out)
        print(f"{out}\t{(dst / out).stat().st_size} bytes")
    print(f"\nunicode-range core: {unicode_range(CORE)}")
    print(f"unicode-range ext:  {unicode_range(EXT)}")


if __name__ == "__main__":
    main()
