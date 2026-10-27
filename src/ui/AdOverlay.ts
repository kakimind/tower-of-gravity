import Phaser from 'phaser';
import { Capacitor } from '@capacitor/core';
import { drawPanel } from './Panel';
import { t } from '../i18n';
import { UI_SCALE, TITLE_FONT } from '../config/GameConfig';
import { showRewardedAd, shouldGrantReward } from '../ads/adService';

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

// Fetching a rewarded ad takes a noticeable moment on a real connection, and
// an unexplained freeze on the button reads as a broken game. The dots animate
// so the wait is visibly alive rather than a stalled screen.
function showAdSpinner(scene: Phaser.Scene, cx: number, cy: number): () => void {
  const overlay = blockingOverlay(scene, cx, cy);
  const panel = drawPanel(scene, cx, cy, 170 * S, 96 * S, {
    fillColor: 0x241a3f, strokeColor: 0xe8b64f, strokeAlpha: 0.9, radius: 16 * S, strokeWidth: 2 * S, depth: 61,
  });
  const label = scene.add.text(cx, cy - 10 * S, t('ad.loading'), {
    fontFamily: TITLE_FONT, fontSize: `${15 * S}px`, color: '#f3e6c8',
  }).setOrigin(0.5).setDepth(62);
  const dots = scene.add.text(cx, cy + 20 * S, '', {
    fontFamily: TITLE_FONT, fontSize: `${20 * S}px`, color: '#e8b64f',
  }).setOrigin(0.5).setDepth(62);

  let step = 0;
  const tick = scene.time.addEvent({
    delay: 320,
    loop: true,
    callback: () => {
      step = (step + 1) % 4;
      dots.setText('·'.repeat(step));
    },
  });

  return () => {
    tick.remove(false);
    overlay.destroy();
    panel.destroy();
    label.destroy();
    dots.destroy();
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

  const dismissSpinner = showAdSpinner(scene, cx, cy);
  const outcome = await showRewardedAd();
  dismissSpinner();

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
