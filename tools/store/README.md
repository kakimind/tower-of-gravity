# Store assets, one set per language

The game speaks 22 languages, so the Play listing needs 22 sets of images —
taking them by hand is a few hundred screenshots. These two scripts produce
them from the game itself, so the pictures always show the build that is
actually shipping.

Output (Korean folder names, to match how the console lists languages):

- `store/스크린샷/<언어>/01-로비 … 05-스테이지클리어.png` — 1080×1920, the exact
  9:16 the console asks for.
- `store/그래픽이미지/<언어>.png` — 1024×500 feature graphic.
- `store/store-listings/<언어>.txt` — the text that goes beside them.

## Running them

Playwright is not a dependency of this project. Install it wherever you like
and run the scripts from there with the repo as the working directory, or
`npm i -D playwright` first if you would rather have it local.

```sh
npm run dev                                   # leave running on :5173
node tools/store/shoot_screenshots.mjs        # all 22 languages, ~4 min
node tools/store/shoot_screenshots.mjs http://127.0.0.1:5173 ko ja   # or a few
node tools/store/make_feature_graphics.mjs    # reads the listing files
```

**The screenshots need the dev server, not a production build.** `window.__game`
only exists under `import.meta.env.DEV`, and that hook is what lets each shot be
staged directly — jump to a stage, force the stage-clear banner — instead of
playing well enough to reach every screen 22 times over.

## Things that will bite

- **The story card only appears when `stage % 10 === 1`** (plus stages 1 and
  1000). Point the script at an ordinary stage and shot 03 silently comes back
  as a second copy of the board, which is easy to miss in a run of 110 files.
- **The card's container is a local variable**, so it can't be reached by field
  name; the script clears it by depth instead (overlay and card are the only
  things at depth 40).
- **The stage-clear shot runs the real end-state path** — score is set above the
  target and `checkEndState()` does the rest — so the banner carries the real reward
  and translated copy rather than a mock-up.
- **Feature graphic copy is read from the listing files**, never retyped here, so
  the tagline on the image always matches the one in the console.
- `word-break: keep-all` on the graphic's text matters: without it Korean and
  Chinese break mid-word and the result reads as a typo.
