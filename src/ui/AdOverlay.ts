import Phaser from 'phaser';
import { Capacitor } from '@capacitor/core';
import { drawPanel } from './Panel';
import { t } from '../i18n';
import { UI_SCALE, TITLE_FONT } from '../config/GameConfig';
import { showRewardedAd, shouldGrantReward } from '../ads/adService';
import { CANDY_PALETTES } from '../art/candyArt';
import { Direction, nextDirection } from '../engine/Gravity';

const S = UI_SCALE;

// Every one of these overlays is interactive so taps on whatever's underneath
// (Ascend, Shop, board tiles) don't go through while it's up — without that, a
// player could navigate away mid-ad and the pending reward callback would
// simply never fire once the scene it belongs to stops.
function blockingOverlay(scene: Phaser.Scene, cx: number, cy: number): Phaser.GameObjects.Rectangle {
  return scene.add
    .rectangle(cx, cy, scene.scale.width, scene.scale.height, 0x000000, 0.82)
    .setDepth(60)
    .setInteractive();
}

// The mock "watch an ad" countdown. This is what the web build runs: AdMob is
// a native SDK and the GitHub Pages demo has no way to serve a real ad, so the
// demo keeps its placeholder rather than handing out rewards for nothing on a
// build nobody is monetizing.
export function playMockAd(scene: Phaser.Scene, cx: number, cy: number, onComplete: () => void): void {
  const overlay = blockingOverlay(scene, cx, cy);
  const panel = drawPanel(scene, cx, cy, 160 * S, 110 * S, {
    fillColor: 0x241a3f, strokeColor: 0xe8b64f, strokeAlpha: 0.9, radius: 16 * S, strokeWidth: 2 * S, depth: 61,
  });
  const label = scene.add.text(cx, cy - 18 * S, t('ad.playing'), {
    fontFamily: TITLE_FONT, fontSize: `${16 * S}px`, color: '#f3e6c8',
  }).setOrigin(0.5).setDepth(62);

  let remaining = 3;
  const countdown = scene.add.text(cx, cy + 24 * S, `${remaining}`, {
    fontFamily: TITLE_FONT, fontSize: `${24 * S}px`, color: '#e8b64f',
  }).setOrigin(0.5).setDepth(62);

  const tick = scene.time.addEvent({
    delay: 700,
    repeat: 2,
    callback: () => {
      remaining -= 1;
      countdown.setText(String(Math.max(0, remaining)));
      if (remaining <= 0) {
        tick.remove(false);
        overlay.destroy();
        panel.destroy();
        label.destroy();
        countdown.destroy();
        onComplete();
      }
    },
  });
}

// Fetching a rewarded ad takes a few seconds on a real connection, and an
// unexplained freeze on the button reads as a broken game. Rather than a stock
// buffering spinner — which would be the one surface in this game that looks
// like it came from somewhere else — the wait shows the game's own hook in
// miniature: three runes pinned to whichever wall gravity is pointing at,
// tumbling to the next wall each beat, using the same easing the real board
// falls with. It keeps turning for as long as the wait lasts and never
// resolves into a finished-looking state, so it can't imply the ad is ready
// before it is.
function showAdSummoning(scene: Phaser.Scene, cx: number, cy: number): () => void {
  const overlay = blockingOverlay(scene, cx, cy);
  const panel = drawPanel(scene, cx, cy, 190 * S, 172 * S, {
    fillColor: 0x241a3f, strokeColor: 0xe8b64f, strokeAlpha: 0.9, radius: 16 * S, strokeWidth: 2 * S, depth: 61,
  });

  const cell = 30 * S;
  const field = cell * 3;
  const fieldCx = cx;
  const fieldCy = cy - 22 * S;
  const originX = fieldCx - field / 2 + cell / 2;
  const originY = fieldCy - field / 2 + cell / 2;

  // The well the runes fall into — the same rounded frame the board sits in,
  // so the miniature reads as a board rather than as decoration.
  const frame = scene.add.graphics().setDepth(61);
  frame.lineStyle(1.5 * S, 0xe8b64f, 0.35);
  frame.strokeRoundedRect(fieldCx - field / 2 - 4 * S, fieldCy - field / 2 - 4 * S, field + 8 * S, field + 8 * S, 10 * S);

  // Drawn from the candy palette rather than loaded as textures: the candy
  // SVGs are only loaded by GameScene, so on a cold start in the lobby they
  // don't exist yet and sprites would come up blank.
  const runeTypes = [0, 4, 3];
  const runes = runeTypes.map((type) => {
    const palette = CANDY_PALETTES[type];
    const size = cell * 0.68;
    const g = scene.add.graphics().setDepth(62);
    g.fillStyle(Phaser.Display.Color.HexStringToColor(palette.base).color, 1);
    g.fillRoundedRect(-size / 2, -size / 2, size, size, 7 * S);
    g.fillStyle(Phaser.Display.Color.HexStringToColor(palette.light).color, 0.55);
    g.fillRoundedRect(-size / 2 + 3 * S, -size / 2 + 3 * S, size * 0.42, size * 0.3, 4 * S);
    g.lineStyle(1.5 * S, Phaser.Display.Color.HexStringToColor(palette.dark).color, 0.9);
    g.strokeRoundedRect(-size / 2, -size / 2, size, size, 7 * S);
    return g;
  });

  // Which three cells the runes occupy for a given gravity direction: they
  // always line the wall that gravity points at.
  const wallCells = (dir: Direction): Array<{ col: number; row: number }> => {
    switch (dir) {
      case 'down': return [{ col: 0, row: 2 }, { col: 1, row: 2 }, { col: 2, row: 2 }];
      case 'left': return [{ col: 0, row: 0 }, { col: 0, row: 1 }, { col: 0, row: 2 }];
      case 'up': return [{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }];
      case 'right': return [{ col: 2, row: 0 }, { col: 2, row: 1 }, { col: 2, row: 2 }];
    }
  };

  let dir: Direction = 'down';
  const settle = (target: Direction, animate: boolean) => {
    wallCells(target).forEach((c, i) => {
      const x = originX + c.col * cell;
      const y = originY + c.row * cell;
      if (!animate) { runes[i].setPosition(x, y); return; }
      scene.tweens.add({ targets: runes[i], x, y, duration: 300, ease: 'Cubic.easeIn', delay: i * 45 });
    });
  };
  settle(dir, false);

  const label = scene.add.text(cx, cy + 56 * S, t('ad.loading'), {
    fontFamily: TITLE_FONT, fontSize: `${14 * S}px`, color: '#f3e6c8',
    align: 'center', wordWrap: { width: 164 * S },
  }).setOrigin(0.5).setDepth(62);

  const flip = scene.time.addEvent({
    delay: 850,
    loop: true,
    callback: () => {
      dir = nextDirection(dir);
      settle(dir, true);
    },
  });

  return () => {
    flip.remove(false);
    runes.forEach((r) => { scene.tweens.killTweensOf(r); r.destroy(); });
    overlay.destroy();
    panel.destroy();
    frame.destroy();
    label.destroy();
  };
}

// Says why no reward is coming. Dismisses itself so a failed ad never leaves
// the player stuck behind a modal they have to figure out how to close.
function showAdNotice(scene: Phaser.Scene, cx: number, cy: number, message: string): void {
  const overlay = blockingOverlay(scene, cx, cy);
  const panel = drawPanel(scene, cx, cy, 240 * S, 110 * S, {
    fillColor: 0x241a3f, strokeColor: 0xe8b64f, strokeAlpha: 0.9, radius: 16 * S, strokeWidth: 2 * S, depth: 61,
  });
  const label = scene.add.text(cx, cy, message, {
    fontFamily: TITLE_FONT, fontSize: `${14 * S}px`, color: '#f3e6c8',
    align: 'center', wordWrap: { width: 210 * S },
  }).setOrigin(0.5).setDepth(62);

  const close = () => {
    overlay.destroy();
    panel.destroy();
    label.destroy();
  };
  overlay.once('pointerdown', close);
  scene.time.delayedCall(2600, close);
}

/**
 * Runs the whole "watch an ad for a reward" flow and resolves with whether the
 * caller should actually hand the reward over. Callers must not pay out on
 * `false` — that covers a dismissed ad, a failure past its one forgiven
 * attempt, and being offline.
 */
export async function watchRewardedAd(scene: Phaser.Scene, cx: number, cy: number): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return new Promise((resolve) => playMockAd(scene, cx, cy, () => resolve(true)));
  }

  const dismissSummoning = showAdSummoning(scene, cx, cy);
  const outcome = await showRewardedAd();
  dismissSummoning();

  if (shouldGrantReward(outcome)) return true;

  // Closing the ad early is the player's own choice and needs a different
  // explanation from "we couldn't get you one" — telling them the ad failed
  // when they skipped it reads as the game being broken.
  const message = outcome === 'offline' ? 'ad.offline'
    : outcome === 'dismissed' ? 'ad.dismissed'
    : 'ad.unavailable';
  showAdNotice(scene, cx, cy, t(message));
  return false;
}
