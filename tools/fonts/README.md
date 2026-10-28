# Bundled fonts

`public/fonts/*.woff2` ships inside the app. Nothing is fetched from Google
Fonts at runtime: a webfont arriving over the network is a race the player can
lose, and Phaser rasterizes canvas text once at creation, so a face that lands
late never repaints. A cold start on a slow connection used to show the title
and HUD in the OS fallback serif.

The full families are far too big to ship (Noto Serif KR/SC/TC/JP are 13–25MB
each), so every file here is subsetted to the characters that family can
actually be asked to draw. All player-facing text is static — the dictionaries
in `src/i18n/translations.ts` and the story in `src/data/story.ts` — so that
set is computable rather than guessed. Current total: ~1.5MB for 22 languages.

## Regenerating (after adding or editing any player-facing text)

Run from the repo root, with `fonttools` and `brotli` installed
(`pip install fonttools brotli`):

```sh
python tools/fonts/extract_charsets.py   # sources  -> .cache/sets/
python tools/fonts/build_subsets.py      # .cache/  -> public/fonts/*.woff2
python tools/fonts/check_coverage.py     # asserts nothing is missing
```

`check_coverage.py` is the one that matters: it checks the shipped `.woff2`
files, not the sources they were cut from, and prints `미커버 0` for all 22
languages when every character has a home. Emoji are expected misses — they
come from the system font, exactly as before.

A character that gets added to the UI but not to the fonts does not error; it
falls back to a system face and looks wrong only in that language. Re-run these
three commands whenever translated text changes.

## Source files

`.cache/ttf/` holds the upstream variable TTFs (~81MB, gitignored). Re-download
from the Google Fonts repo:

```sh
B=https://raw.githubusercontent.com/google/fonts/main/ofl
curl -sL -o tools/fonts/.cache/ttf/CinzelDecorative-Bold.ttf   "$B/cinzeldecorative/CinzelDecorative-Bold.ttf"
curl -sL -o tools/fonts/.cache/ttf/CinzelDecorative-Black.ttf  "$B/cinzeldecorative/CinzelDecorative-Black.ttf"
curl -sL -o tools/fonts/.cache/ttf/CormorantGaramond-VF.ttf    "$B/cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf"
curl -sL -o tools/fonts/.cache/ttf/NotoSerifKR-VF.ttf          "$B/notoserifkr/NotoSerifKR%5Bwght%5D.ttf"
curl -sL -o tools/fonts/.cache/ttf/NotoSerifJP-VF.ttf          "$B/notoserifjp/NotoSerifJP%5Bwght%5D.ttf"
curl -sL -o tools/fonts/.cache/ttf/NotoSerifSC-VF.ttf          "$B/notoserifsc/NotoSerifSC%5Bwght%5D.ttf"
curl -sL -o tools/fonts/.cache/ttf/NotoSerifTC-VF.ttf          "$B/notoseriftc/NotoSerifTC%5Bwght%5D.ttf"
curl -sL -o tools/fonts/.cache/ttf/NotoNaskhArabic-VF.ttf      "$B/notonaskharabic/NotoNaskhArabic%5Bwght%5D.ttf"
curl -sL -o tools/fonts/.cache/ttf/NotoSerifDevanagari-VF.ttf  "$B/notoserifdevanagari/NotoSerifDevanagari%5Bwdth%2Cwght%5D.ttf"
curl -sL -o tools/fonts/.cache/ttf/NotoSerifThai-VF.ttf        "$B/notoserifthai/NotoSerifThai%5Bwdth%2Cwght%5D.ttf"
curl -sL -o tools/fonts/.cache/ttf/NotoSerif-VF.ttf            "$B/notoserif/NotoSerif%5Bwdth%2Cwght%5D.ttf"
```

All eleven are SIL Open Font License 1.1. The license travels with the font, so
`public/fonts/OFL.txt` ships alongside the subsets.

## Which family serves which language

`build_subsets.py`'s `FAMILIES` table decides what each file carries, and it has
to agree with the fallback chains in `index.html` (`--font-title` / `--font-body`)
and `src/config/GameConfig.ts` (`TITLE_FONT` / `BODY_FONT`). Latin faces carry
the Latin languages, each Noto carries its own script, and `NotoSerif-VF` is the
end-of-chain fallback that also covers Cyrillic.

The language picker is the subtle case: it lists all 22 languages in their own
scripts at once, whatever language is active, so those names are shared chrome
and `extract_charsets.py` pulls them out of `LANGUAGES` separately. Miss that and
the picker shows tofu in a build that otherwise looks fine.
