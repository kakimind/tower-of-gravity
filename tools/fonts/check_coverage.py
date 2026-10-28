"""Every character the game can display must exist in at least one bundled face.

Checks the subsetted woff2 files that actually ship, not the sources they were
cut from, so a mistake in the subsetting step shows up here. Emoji are expected
misses — they come from the system font, same as before.
"""
import json, glob, pathlib
from fontTools.ttLib import TTFont

cmaps = {}
for p in sorted(glob.glob('public/fonts/*.woff2')):
    cmaps[pathlib.Path(p).stem] = set(TTFont(p).getBestCmap())

sets = json.load(open('tools/fonts/.cache/sets/langs.json', encoding='utf-8'))
shared = open('tools/fonts/.cache/sets/_shared.txt', encoding='utf-8').read()

def is_emoji(o):
    return o >= 0x1F000 or 0x2600 <= o <= 0x27BF or o in (0xFE0F, 0x2194, 0x2195, 0x21A7, 0x2190, 0x2192)

missing_total = 0
for lang, chars in sorted(sets.items()):
    miss = []
    for c in set(chars) | set(shared):
        o = ord(c)
        if is_emoji(o) or o < 32:
            continue
        if not any(o in cm for cm in cmaps.values()):
            miss.append(c)
    missing_total += len(miss)
    flag = 'OK ' if not miss else '!! '
    print(f'{flag}{lang:9} 미커버 {len(miss):3}' + (' -> ' + ''.join(sorted(miss)[:40]) if miss else ''))

print('\n총 미커버(이모지 제외):', missing_total)
print('\n패밀리별 글리프 수:')
for name, cm in cmaps.items():
    print(f'  {name:26} {len(cm):5}')
