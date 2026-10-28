/**
 * Renders the 1024x500 Play feature graphic in every language.
 *
 * Title and tagline are read from the store listing files rather than typed
 * again here, so the graphic can never drift from the copy that sits beside it
 * in the console.
 *
 * Usage: node tools/store/make_feature_graphics.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const LISTINGS = 'store/store-listings';
const OUT = 'store/그래픽이미지';

// The Latin display face covers no other script, so the title falls back
// through the same Noto chain the game itself uses. These come from Google
// Fonts at render time — this is a build step, not the shipped app.
const FONTS = 'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cormorant+Garamond:wght@600;700&family=Noto+Serif+KR:wght@700;900&family=Noto+Serif+JP:wght@700;900&family=Noto+Serif+SC:wght@700;900&family=Noto+Serif+TC:wght@700;900&family=Noto+Naskh+Arabic:wght@700&family=Noto+Serif+Devanagari:wght@700&family=Noto+Serif+Thai:wght@700&family=Noto+Serif:wght@600;700;900&display=swap';
const CHAIN = `'Noto Serif KR','Noto Serif JP','Noto Serif SC','Noto Serif TC','Noto Naskh Arabic','Noto Serif Devanagari','Noto Serif Thai','Noto Serif',serif`;

function section(text, name) {
  const m = text.match(new RegExp('\\[' + name + '\\]\\n([\\s\\S]*?)(?=\\n\\[|$)'));
  return m ? m[1].trim() : '';
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function page(title, tagline, rtl) {
  return `<!doctype html><html${rtl ? ' dir="rtl"' : ''}><head><meta charset="UTF-8">
<link rel="stylesheet" href="${FONTS}">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1024px; height: 500px; overflow: hidden; }
  body {
    position: relative;
    background:
      radial-gradient(ellipse 620px 420px at 20% 0%, rgba(155,107,255,0.28) 0%, rgba(155,107,255,0) 70%),
      radial-gradient(circle 2px at 10% 20%, #fff 0%, transparent 100%),
      radial-gradient(circle 1.5px at 30% 70%, #fff 0%, transparent 100%),
      radial-gradient(circle 2px at 60% 15%, #fff 0%, transparent 100%),
      radial-gradient(circle 1.5px at 85% 60%, #fff 0%, transparent 100%),
      radial-gradient(circle 1.5px at 95% 25%, #fff 0%, transparent 100%),
      radial-gradient(circle 2px at 48% 85%, #fff 0%, transparent 100%),
      linear-gradient(135deg, #150f26 0%, #1e1638 55%, #2c1f4a 100%);
    font-family: 'Cormorant Garamond', ${CHAIN};
  }
  .content {
    position: absolute; ${rtl ? 'right' : 'left'}: 56px; top: 0; bottom: 0;
    display: flex; flex-direction: column; justify-content: center;
    width: 560px; text-align: ${rtl ? 'right' : 'left'};
  }
  .eyebrow {
    font-family: 'Cormorant Garamond', ${CHAIN};
    font-size: 19px; letter-spacing: 0.12em; text-transform: uppercase;
    color: #9b6bff; font-weight: 700; margin-bottom: 14px;
  }
  h1 {
    font-family: 'Cinzel Decorative', ${CHAIN};
    font-size: 56px; line-height: 1.12; color: #e8b64f;
    text-shadow: 0 2px 6px rgba(0,0,0,0.6);
    margin-bottom: 18px; font-weight: 900;
    text-wrap: balance; word-break: keep-all;
  }
  /* keep-all stops Korean and Chinese from breaking mid-word, which the
     default CJK line-breaking happily does and which reads as a typo. */
  .sub {
    font-size: 24px; color: #c9bce0; line-height: 1.4; max-width: 480px;
    font-weight: 600; word-break: keep-all;
  }
  .tower-stage {
    position: absolute; ${rtl ? 'left' : 'right'}: 30px; top: 0; bottom: 0; width: 420px;
    display: flex; align-items: center; justify-content: center;
  }
  .tower-glow {
    position: absolute; width: 360px; height: 360px; border-radius: 50%;
    background: radial-gradient(circle, rgba(155,107,255,0.35), transparent 70%);
  }
  svg { position: relative; }
</style></head>
<body>
  <div class="content">
    <div class="eyebrow">Gravity-Flip Match-3</div>
    <h1>${esc(title)}</h1>
    <div class="sub">${esc(tagline)}</div>
  </div>
  <div class="tower-stage">
    <div class="tower-glow"></div>
    <svg width="300" height="420" viewBox="0 0 300 420">
      <circle cx="225" cy="90" r="34" fill="#f3e6c8" opacity="0.92"/>
      <circle cx="225" cy="90" r="30" fill="#2c1f4a"/>
      <circle cx="213" cy="84" r="24" fill="#1e1638"/>
      <polygon points="150,60 215,200 85,200" fill="#8c6bff" stroke="#e8b64f" stroke-width="5"/>
      <line x1="150" y1="60" x2="190" y2="150" stroke="#e8b64f" stroke-width="3" opacity="0.6"/>
      <rect x="110" y="195" width="80" height="190" rx="6" fill="#241a3f" stroke="#e8b64f" stroke-width="5"/>
      <rect x="118" y="210" width="8" height="40" fill="#c0392b"/>
      <rect x="172" y="210" width="8" height="40" fill="#c0392b"/>
      <circle cx="150" cy="260" r="16" fill="#3d2c66" stroke="#e8b64f" stroke-width="3"/>
      <circle cx="150" cy="310" r="16" fill="#3d2c66" stroke="#e8b64f" stroke-width="3"/>
      <circle cx="150" cy="360" r="16" fill="#3d2c66" stroke="#e8b64f" stroke-width="3"/>
      <polygon points="55,235 85,320 25,320" fill="#6b4fc2" stroke="#e8b64f" stroke-width="4"/>
      <rect x="35" y="320" width="40" height="65" fill="#241a3f" stroke="#e8b64f" stroke-width="4"/>
      <polygon points="245,235 275,320 215,320" fill="#6b4fc2" stroke="#e8b64f" stroke-width="4"/>
      <rect x="225" y="320" width="40" height="65" fill="#241a3f" stroke="#e8b64f" stroke-width="4"/>
      <ellipse cx="150" cy="392" rx="130" ry="14" fill="#0a0618" opacity="0.5"/>
    </svg>
  </div>
</body></html>`;
}

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1024, height: 500 } });
const tab = await ctx.newPage();

for (const file of fs.readdirSync(LISTINGS).filter((f) => f.endsWith('.txt'))) {
  const text = fs.readFileSync(path.join(LISTINGS, file), 'utf8');
  const locale = section(text, 'Play Console 언어');
  const title = section(text, '앱 이름');
  const tagline = section(text, '간단한 설명');
  const rtl = /\(ar\)/.test(locale);

  await tab.setContent(page(title, tagline, rtl), { waitUntil: 'networkidle' });
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForTimeout(400);

  const dest = path.join(OUT, file.replace(/\.txt$/, '.png'));
  await tab.screenshot({ path: dest });

  // The headline box is fixed height by design; a title that outgrows it would
  // ride over the tagline, so check rather than trust.
  const overflow = await tab.evaluate(() => {
    const c = document.querySelector('.content');
    return c.scrollHeight > c.clientHeight;
  });
  console.log(`${path.basename(dest).padEnd(28)} ${overflow ? '!! 넘침' : 'OK'}  ${title}`);
}

await browser.close();
