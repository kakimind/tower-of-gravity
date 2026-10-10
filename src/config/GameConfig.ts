export const GRID_SIZE = 8;

// Scale factor for the whole game logical/render resolution. Raising this
// (rather than CSS-stretching a 448px canvas, or zooming the camera — both
// tried and reverted, see git history) grows the actual drawing coordinate
// space, so the game renders natively bigger and sharper instead of being
// upscaled. UI_SCALE is this same factor, exposed for Lobby/Game scene code
// that positions things in absolute pixels not derived from TILE/GRID_SIZE
// (illustration geometry, dialog panels, font sizes) so those stay
// proportional to the bigger board instead of looking tiny against it.
export const TILE = 112;
export const UI_SCALE = TILE / 56;

export const BOARD_PIXELS = GRID_SIZE * TILE;
export const ART_SIZE = Math.round(96 * UI_SCALE);
export const CANDY_DISPLAY = TILE * 0.86;
export const CANDY_TYPE_COUNT = 10;

export const SCORE_PER_CANDY = 10;

// Cinzel Decorative / Cormorant Garamond only cover Latin script, so without
// a fallback chain every non-Latin language (ko/ja/zh/ru/ar/hi/th) silently
// drops to whatever generic 'serif' the OS provides — on Windows that's thin
// faces like Batang/MS Mincho/SimSun, which look noticeably lighter than the
// decorative Latin titles, making only some languages look "bold". These
// Noto families (also loaded via the Google Fonts link in index.html) give
// each script a matching weighted face instead of an inconsistent OS default.
const NOTO_FALLBACK =
  'Noto Serif KR, Noto Serif JP, Noto Serif SC, Noto Serif TC, Noto Naskh Arabic, Noto Serif Devanagari, Noto Serif Thai, Noto Serif';
export const TITLE_FONT = `Cinzel Decorative, ${NOTO_FALLBACK}, serif`;
export const BODY_FONT = `Cormorant Garamond, ${NOTO_FALLBACK}, serif`;
