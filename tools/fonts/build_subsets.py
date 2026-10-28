"""Subset each bundled face to only the characters the game can actually show in it.

Each family serves specific languages (the fallback chain in GameConfig.ts /
index.html decides which), so a family only needs that language's glyphs plus
the shared UI chrome. pyftsubset silently drops requested characters a font
doesn't have, so a family can be handed a superset safely.
"""
import json, pathlib, subprocess, sys

SETS = json.load(open('tools/fonts/.cache/sets/langs.json', encoding='utf-8'))
SHARED = open('tools/fonts/.cache/sets/_shared.txt', encoding='utf-8').read()

SCRIPT_LANGS = {'ko', 'ja', 'zh-Hans', 'zh-Hant', 'ar', 'hi', 'th'}
LATIN = [l for l in SETS if l not in SCRIPT_LANGS and l != 'ru']

FAMILIES = {
    'CinzelDecorative-Bold':   LATIN,
    'CinzelDecorative-Black':  LATIN,
    'CormorantGaramond-VF':    LATIN,
    'NotoSerif-VF':            LATIN + ['ru'],      # cyrillic + latin-ext fallback
    'NotoSerifKR-VF':          ['ko'],
    'NotoSerifJP-VF':          ['ja'],
    'NotoSerifSC-VF':          ['zh-Hans'],
    'NotoSerifTC-VF':          ['zh-Hant'],
    'NotoNaskhArabic-VF':      ['ar'],
    'NotoSerifDevanagari-VF':  ['hi'],
    'NotoSerifThai-VF':        ['th'],
}

out = pathlib.Path('public/fonts')
out.mkdir(parents=True, exist_ok=True)
# The per-family character lists are build inputs, not app assets — anything
# left in public/ is copied into the bundle verbatim, so they stay in .cache/.
charsdir = pathlib.Path('tools/fonts/.cache/chars')
charsdir.mkdir(parents=True, exist_ok=True)
total = 0
for name, langs in FAMILIES.items():
    chars = set(SHARED)
    for l in langs:
        chars |= set(SETS[l])
    text = ''.join(sorted(chars))
    txt = charsdir / (name + '.chars.txt')
    txt.write_text(text, encoding='utf-8')
    dest = out / (name + '.woff2')
    subprocess.run([
        sys.executable, '-m', 'fontTools.subset', 'tools/fonts/.cache/ttf/' + name + '.ttf',
        '--text-file=' + str(txt), '--flavor=woff2', '--layout-features=*',
        '--no-hinting', '--desubroutinize', '--output-file=' + str(dest),
    ], check=True, capture_output=True)
    size = dest.stat().st_size
    total += size
    print(f'{name:26} {len(chars):5} chars  {size/1024:8.1f} KB  ({",".join(langs)})')
print(f'{"합계":26} {total/1024:21.1f} KB')
