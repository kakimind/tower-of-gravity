/**
 * Captures the Play Store screenshot set in every language the game speaks.
 *
 * Runs against `npm run dev`, not the production build, because the dev build
 * is the one that exposes `window.__game` — that hook is what lets a shot be
 * staged directly (jump to a stage, force the clear banner) instead of playing
 * the game well enough to reach each screen 22 times.
 *
 * Output: 1080x1920 (9:16 exactly, the ratio the console asks for) PNGs under
 * store/스크린샷/<언어>/.
 *
 * Usage: node tools/store/shoot_screenshots.mjs [baseUrl] [lang ...]
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] || 'http://127.0.0.1:5173';
const ONLY = process.argv.slice(3);

// Korean folder names, matching how the store listings are filed — the person
// uploading these is reading the console in Korean.
const LANGS = [
  ['ko', '한국어'], ['en', '영어(미국)'], ['ja', '일본어'],
  ['zh-Hans', '중국어(간체)'], ['zh-Hant', '중국어(번체)'],
  ['es', '스페인어(스페인)'], ['es-419', '스페인어(라틴아메리카)'],
  ['pt', '포르투갈어(포르투갈)'], ['pt-BR', '포르투갈어(브라질)'],
  ['fr', '프랑스어'], ['de', '독일어'], ['it', '이탈리아어'],
  ['ru', '러시아어'], ['ar', '아랍어'], ['hi', '힌디어'],
  ['id', '인도네시아어'], ['th', '태국어'], ['vi', '베트남어'],
  ['tr', '터키어'], ['pl', '폴란드어'], ['nl', '네덜란드어'], ['sv', '스웨덴어'],
].filter(([code]) => !ONLY.length || ONLY.includes(code));

// A save file that makes every screen look lived-in: enough stardust for the
// shop rows to read as affordable, a stocked item bag, full hearts.
const SAVE = {
  unlocked: 46, current: 41, currency: 2400,
  bonusMovesOwned: 3,
  specialOwned: { lineRow: 2, lineCol: 1, crossBomb: 2, colorBomb: 1 },
  nukeOwned: { bomb: 2, lightning: 1, meteor: 1, blackHole: 1 },
  hearts: 5, heartRegenSince: 0,
};

const OUT_ROOT = 'store/스크린샷';
const SHOTS = ['01-로비', '02-상점', '03-이야기', '04-플레이', '05-스테이지클리어'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function scene(page, name) {
  return page.evaluate((n) => {
    const g = window.__game;
    const s = g && g.scene.getScene(n);
    return !!(s && s.scene.isActive());
  }, name);
}

async function waitForScene(page, name, timeout = 15000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    if (await scene(page, name)) return true;
    await sleep(250);
  }
  throw new Error(`scene ${name} never became active`);
}

const browser = await chromium.launch();
const failures = [];

for (const [code, folder] of LANGS) {
  const dir = path.join(OUT_ROOT, folder);
  fs.mkdirSync(dir, { recursive: true });

  const ctx = await browser.newContext({
    viewport: { width: 540, height: 960 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(([lang, save]) => {
    localStorage.setItem('towerGravityLanguage', lang);
    localStorage.setItem('towerGravityProgress', JSON.stringify(save));
  }, [code, SAVE]);

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await waitForScene(page, 'LobbyScene');
  await sleep(1800);
  await page.screenshot({ path: path.join(dir, SHOTS[0] + '.png') });

  // Shop — opened through the real button so the panel animates in as players see it.
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('LobbyScene');
    s.buildShop();
  });
  await sleep(1400);
  await page.screenshot({ path: path.join(dir, SHOTS[1] + '.png') });

  // Story card — a guide speaks at the first stage of each floor (stage % 10 === 1),
  // so 41 is one of the few stages that actually shows one.
  await page.evaluate(() => {
    window.__game.scene.stop('LobbyScene');
    window.__game.scene.start('GameScene', { stage: 41 });
  });
  await waitForScene(page, 'GameScene');
  await sleep(2200);
  await page.screenshot({ path: path.join(dir, SHOTS[2] + '.png') });

  // Dismiss the story card, then shoot the board itself.
  // The card keeps its container in a local, so it is cleared by depth: the
  // overlay and the card itself are the only things drawn at depth 40.
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('GameScene');
    s.children.list.filter((o) => o.depth === 40).forEach((o) => o.destroy(true));
    window.dispatchEvent(new CustomEvent('game:story-close'));
  });
  await sleep(1600);
  await page.screenshot({ path: path.join(dir, SHOTS[3] + '.png') });

  // Stage clear — hand the scene a winning score and let its own end-state
  // path draw the banner, so the copy and reward are the real ones.
  await page.evaluate(async () => {
    const s = window.__game.scene.getScene('GameScene');
    s.score = s.targetScore * 2;
    await s.checkEndState();
  });
  await sleep(1800);
  await page.screenshot({ path: path.join(dir, SHOTS[4] + '.png') });

  if (errors.length) failures.push(`${code}: ${errors.slice(0, 2).join(' | ')}`);
  console.log(`${folder.padEnd(22)} 5컷  ${errors.length ? '에러 ' + errors.length : 'OK'}`);
  await ctx.close();
}

await browser.close();
if (failures.length) {
  console.log('\n문제 있는 언어:');
  failures.forEach((f) => console.log('  ' + f));
  process.exitCode = 1;
}
