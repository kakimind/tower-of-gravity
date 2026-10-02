import Phaser from 'phaser';
import { drawPanel } from './Panel';
import { t } from '../i18n';
import { UI_SCALE } from '../config/GameConfig';

const S = UI_SCALE;

// The mock "watch an ad" countdown was copy-pasted three times (lobby heart
// refill, lobby stardust reward, in-run bonus moves) as a flat near-black
// rectangle with bare text — the one surface left without the gem-panel
// treatment used everywhere else. One shared implementation instead of a
// fourth copy.
export function playMockAd(scene: Phaser.Scene, cx: number, cy: number, onComplete: () => void): void {
  const overlay = scene.add.rectangle(cx, cy, scene.scale.width, scene.scale.height, 0x000000, 0.82).setDepth(60);
  const panel = drawPanel(scene, cx, cy, 160 * S, 110 * S, {
    fillColor: 0x241a3f, strokeColor: 0xe8b64f, strokeAlpha: 0.9, radius: 16 * S, strokeWidth: 2 * S, depth: 61,
  });
  const label = scene.add.text(cx, cy - 18 * S, t('ad.playing'), {
    fontFamily: 'Cinzel Decorative, serif', fontSize: `${16 * S}px`, color: '#f3e6c8',
  }).setOrigin(0.5).setDepth(62);

  let remaining = 3;
  const countdown = scene.add.text(cx, cy + 24 * S, `${remaining}`, {
    fontFamily: 'Cinzel Decorative, serif', fontSize: `${24 * S}px`, color: '#e8b64f',
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
