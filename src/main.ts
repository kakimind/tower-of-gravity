import Phaser from 'phaser';
import { BOARD_PIXELS } from './config/GameConfig';
import { GameScene } from './scenes/GameScene';
import { LobbyScene } from './scenes/LobbyScene';
import { initSettingsPanel } from './ui/settingsPanel';
import { initItemBar } from './ui/itemBar';
import { unlockAudioOnFirstGesture } from './audio/sfx';

unlockAudioOnFirstGesture();

// Phaser draws Text objects onto a canvas texture once, at creation time —
// unlike DOM text, a webfont finishing its download later never triggers a
// repaint. If LobbyScene.create() ran before the Noto fallback faces (or
// even Cinzel Decorative itself) finished loading, that scene's text would
// be stuck in the browser's default serif until the next scene restart.
// Explicitly request every face/weight the game actually uses so the
// browser starts fetching them immediately, then wait for them to settle —
// capped at 2s so a slow/offline network degrades to system fonts instead
// of blocking startup forever.
async function waitForGameFonts(): Promise<void> {
  const specs = [
    '700 16px "Cinzel Decorative"', '900 16px "Cinzel Decorative"',
    '700 16px "Cormorant Garamond"',
    '700 16px "Noto Serif KR"', '700 16px "Noto Serif JP"',
    '700 16px "Noto Serif SC"', '700 16px "Noto Serif TC"',
    '700 16px "Noto Naskh Arabic"', '700 16px "Noto Serif Devanagari"',
    '700 16px "Noto Serif Thai"', '700 16px "Noto Serif"',
  ];
  try {
    await Promise.race([
      Promise.all(specs.map((spec) => document.fonts.load(spec))).then(() => document.fonts.ready),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  } catch {
    // Font Loading API unsupported, or a face failed to fetch — proceed with
    // whatever fonts are available rather than block the game from starting.
  }
}

// Phaser's canvas renders at the game's logical pixel size. On HiDPI/Retina
// displays that leaves every Text object looking soft, since it's rasterized
// at 1x and then upscaled by the browser. Patch the Text factory so every
// this.add.text(...) call renders its texture at device pixel density by
// default, unless a style explicitly overrides `resolution`.
const dpr = Math.min(window.devicePixelRatio || 1, 3);
type TextFactory = (x: number, y: number, text: string | string[], style?: Phaser.Types.GameObjects.Text.TextStyle) => Phaser.GameObjects.Text;
const factoryProto = Phaser.GameObjects.GameObjectFactory.prototype as unknown as { text: TextFactory };
const originalTextFactory = factoryProto.text;
factoryProto.text = function patchedText(
  this: Phaser.GameObjects.GameObjectFactory,
  x: number,
  y: number,
  text: string | string[],
  style?: Phaser.Types.GameObjects.Text.TextStyle,
) {
  return originalTextFactory.call(this, x, y, text, { resolution: dpr, ...style });
};

waitForGameFonts().then(() => {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'app',
    width: BOARD_PIXELS,
    height: BOARD_PIXELS,
    backgroundColor: '#4a2a17',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [LobbyScene, GameScene],
  };

  const game = new Phaser.Game(config);
  initSettingsPanel();
  initItemBar();

  // The Scale Manager measures the canvas's on-screen position once, during
  // Game construction, and only recomputes it on a window 'resize' event. On
  // this page the layout settles a few pixels away from that first synchronous
  // measurement (the surrounding card reflows after construction), and nothing
  // ever fires a resize to correct it — so every pointer coordinate Phaser
  // computes stays permanently off by that amount, silently missing hit areas
  // near the canvas edges. Watch the canvas's actual position for the first
  // couple of seconds after load and re-sync the Scale Manager whenever it
  // moves, rather than guessing which specific layout change is responsible.
  // Polled with setTimeout rather than requestAnimationFrame so the check
  // still runs if the tab loads in the background (rAF is suspended there).
  {
    let lastX = -1;
    let lastY = -1;
    let checks = 0;
    const watch = () => {
      const rect = document.querySelector('canvas')?.getBoundingClientRect();
      if (rect && (rect.x !== lastX || rect.y !== lastY)) {
        lastX = rect.x;
        lastY = rect.y;
        game.scale.refresh();
      }
      checks++;
      if (checks < 40) setTimeout(watch, 50);
    };
    watch();
  }

  if (import.meta.env.DEV) {
    (window as unknown as { __game: Phaser.Game }).__game = game;
  }
});
