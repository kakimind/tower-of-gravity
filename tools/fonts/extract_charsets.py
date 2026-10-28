import re, json, pathlib, collections

BACKSLASH = chr(92)

def find_map(src, name):
    """lang code -> const identifier, from `const NAME: ... = { 'ko': ko, en, ... }`"""
    m = re.search(r'const\s+' + name + r'\b[^=]*=\s*\{', src)
    i = m.end(); depth = 1; start = i
    while depth:
        c = src[i]
        if c == '{': depth += 1
        elif c == '}': depth -= 1
        i += 1
    body = src[start:i-1]
    out = {}
    for entry in body.split(','):
        entry = entry.strip()
        if not entry or entry.startswith('//'): continue
        if ':' in entry:
            k, v = entry.split(':', 1)
            out[k.strip().strip('\'"')] = v.strip()
        else:
            out[entry] = entry          # shorthand `en,`
    return out

def block_of(src, ident):
    """Text of the top-level `const <ident> ... = { ... }`, brace-matched, string-aware."""
    m = re.search(r'^const\s+' + re.escape(ident) + r'\b[^=]*=\s*\{', src, re.M)
    if not m: return ''
    i = m.end(); depth = 1; start = i; quote = None
    while depth:
        c = src[i]
        if quote:
            if c == BACKSLASH:
                i += 2; continue
            if c == quote: quote = None
        elif c in '\'"`': quote = c
        elif c == '/' and src[i+1] == '/':
            i = src.index('\n', i); continue
        elif c == '{': depth += 1
        elif c == '}': depth -= 1
        i += 1
    return src[start:i-1]

langs = collections.defaultdict(set)
for path, mapname in (('src/i18n/translations.ts', 'DICTIONARIES'), ('src/data/story.ts', 'STORIES')):
    src = open(path, encoding='utf-8').read()
    for lang, ident in find_map(src, mapname).items():
        blk = block_of(src, ident)
        if not blk:
            print('  !! ' + path + ': ' + lang + ' -> ' + ident + ' 블록을 못 찾음')
            continue
        langs[lang] |= {c for c in blk if ord(c) > 31}

# UI chrome outside the dictionaries (index.html, scene literals) can show in any language
shared = set()
for p in ['index.html'] + [str(q) for q in pathlib.Path('src').rglob('*.ts')]:
    if p.endswith(('translations.ts', 'story.ts')): continue
    shared |= {c for c in open(p, encoding='utf-8').read() if ord(c) > 31}

# The language picker lists every language in its OWN script at once, whatever
# the current language is — so '한국어', '日本語', 'العربية' and the rest are
# shared chrome, not part of any single language's set. Missing this is why
# they have to be pulled out of LANGUAGES explicitly.
tsrc = open('src/i18n/translations.ts', encoding='utf-8').read()
langs_block = tsrc[tsrc.index('const LANGUAGES'):]
langs_block = langs_block[:langs_block.index('];') + 2]
shared |= {c for c in langs_block if ord(c) > 31}

pathlib.Path('tools/fonts/.cache/sets').mkdir(exist_ok=True, parents=True)
for lang, cps in sorted(langs.items()):
    print(f'{lang:9} {len(cps):5} chars')
open('tools/fonts/.cache/sets/_shared.txt', 'w', encoding='utf-8').write(''.join(sorted(shared)))
json.dump({k: ''.join(sorted(v)) for k, v in langs.items()},
          open('tools/fonts/.cache/sets/langs.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('언어 수:', len(langs), '| 공용(비사전) 문자:', len(shared))
