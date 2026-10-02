import Phaser from 'phaser';
import {
  GRID_SIZE, TILE, CANDY_DISPLAY, CANDY_TYPE_COUNT, ART_SIZE, SCORE_PER_CANDY, UI_SCALE,
} from '../config/GameConfig';

const S = UI_SCALE;
import { buildCandySvg, svgToDataUri, candyTextureKey, CANDY_PALETTES } from '../art/candyArt';
import { buildSpecialSvg, specialTextureKey, SpecialArtType } from '../art/specialArt';
import { buildInitialTypeGrid, findMatchedCells, findLongRuns, findHintSwap, isAdjacent, randomType } from '../engine/BoardModel';
import { Direction, nextDirection, DIRECTION_ARROW } from '../engine/Gravity';
import { getStageConfig, TOTAL_STAGES } from '../engine/StageConfig';
import {
  getCurrentStage, setCurrentStage, completeStage, consumeBoosts, addCurrency, spendHeart,
} from '../engine/Progress';
import { getStageIntro, getFloor, rollRandomEvent, EventItem } from '../data/story';
import { t } from '../i18n';
import { createPillButton } from '../ui/PillButton';
import { drawPanel } from '../ui/Panel';
import { setCurrentSceneKey } from '../ui/settingsPanel';
import {
  playTap, playSwap, playInvalidSwap, playMatch, playSpecialPromote,
  playSpecialActivate, playGravityFlip, playStageClear, playOutOfMoves, playGameStart,
} from '../audio/sfx';

const DIRECTION_KEY = {
  down: 'direction.down', left: 'direction.left', up: 'direction.up', right: 'direction.right',
} as const;

function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i < to; i++) out.push(i);
  return out;
}

function tweenPromise(scene: Phaser.Scene, config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
  return new Promise((resolve) => {
    scene.tweens.add({ ...config, onComplete: () => resolve() });
  });
}

interface Cell { row: number; col: number; }

type SpecialType = SpecialArtType;

export class GameScene extends Phaser.Scene {
  private board: (Phaser.GameObjects.Image | null)[][] = [];
  private typeGrid: number[][] = [];
  private specialGrid: (SpecialType | null)[][] = [];
  private direction: Direction = 'down';
  private stage = 1;
  private targetScore = 0;
  private movesRemaining = 0;
  private gravityFlipInterval = 5;
  private movesUsed = 0;
  private score = 0;
  private busy = false;
  private selected: Cell | null = null;
  private dragStart: Cell | null = null;
  private selectionRing?: Phaser.GameObjects.Container;
  private armPreview?: Phaser.GameObjects.Graphics;
  private armPreviewTween?: Phaser.Tweens.Tween;
  private hintTweens: Phaser.Tweens.Tween[] = [];
  private hintSprites: Phaser.GameObjects.Image[] = [];
  private idleEvent?: Phaser.Time.TimerEvent;
  private pendingSpecialQueue: SpecialType[] = [];
  private exitListener?: () => void;
  private placingSpecials = 0;
  private eventGrantedSpecials = 0;
  private placementActive = false;
  private placementQueue: SpecialType[] = [];
  private gravityBanner?: Phaser.GameObjects.Text;
  private gravityBannerBg?: Phaser.GameObjects.Graphics;
  private endText?: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  init(data: { stage?: number }): void {
    this.stage = data?.stage ?? getCurrentStage();
    setCurrentStage(this.stage);
    const cfg = getStageConfig(this.stage);
    const boosts = consumeBoosts();
    this.targetScore = cfg.targetScore;
    this.movesRemaining = cfg.movesLimit + boosts.bonusMovesOwned * 3;
    const specialOrder: SpecialType[] = ['lineRow', 'lineCol', 'crossBomb', 'colorBomb'];
    this.pendingSpecialQueue = specialOrder.flatMap(
      (type) => Array<SpecialType>(boosts.specialOwned[type]).fill(type),
    );
    this.gravityFlipInterval = cfg.gravityFlipInterval;
    this.movesUsed = 0;
    this.score = 0;
    this.direction = 'down';
    this.selected = null;
    this.dragStart = null;
    this.busy = false;
    this.endText = undefined;
    this.armPreview = undefined;
    this.armPreviewTween = undefined;
    this.placingSpecials = 0;
    this.eventGrantedSpecials = 0;
    this.placementActive = false;
    this.placementQueue = [];
  }

  preload(): void {
    for (let t = 0; t < CANDY_TYPE_COUNT; t++) {
      const svg = buildCandySvg(t);
      this.load.svg(candyTextureKey(t), svgToDataUri(svg), { width: ART_SIZE, height: ART_SIZE });
    }
    (['lineRow', 'lineCol', 'crossBomb', 'colorBomb'] as SpecialArtType[]).forEach((type) => {
      const svg = buildSpecialSvg(type);
      this.load.svg(specialTextureKey(type), svgToDataUri(svg), { width: ART_SIZE, height: ART_SIZE });
    });
  }

  create(): void {
    document.querySelector('.hud')?.setAttribute('style', 'display:flex');
    const hint = document.querySelector('.footer-hint');
    hint?.setAttribute('style', 'display:block');
    if (hint) hint.textContent = t('footerHint', { n: this.gravityFlipInterval });

    this.cameras.main.setBackgroundColor('#1a1330');
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.onPointerUp(pointer));
    this.ensureSparkTexture();
    this.drawSlots();

    this.typeGrid = buildInitialTypeGrid(GRID_SIZE);
    this.specialGrid = Array.from({ length: GRID_SIZE }, () => new Array<SpecialType | null>(GRID_SIZE).fill(null));
    this.board = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const row: (Phaser.GameObjects.Image | null)[] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        row.push(this.spawnCandySprite(r, c, this.typeGrid[r][c]));
      }
      this.board.push(row);
    }

    this.placingSpecials = this.pendingSpecialQueue.length;

    // Arcane selection ring: a gold band with a faint violet glow and a
    // trio of slowly orbiting runes, instead of a plain white outline, to
    // match the tower theme's selection/highlight feedback.
    const ringRadius = CANDY_DISPLAY / 2 + 4 * S;
    const ringGlow = this.add.circle(0, 0, ringRadius + 5 * S, 0x9b6bff, 0.14);
    const ringGold = this.add.circle(0, 0, ringRadius, 0x000000, 0);
    ringGold.setStrokeStyle(3 * S, 0xe8b64f, 0.95);
    const runes = [0, 1, 2].map((i) => {
      const angle = (i / 3) * Math.PI * 2;
      const rx = Math.cos(angle) * (ringRadius + 3 * S);
      const ry = Math.sin(angle) * (ringRadius + 3 * S);
      return this.add.star(rx, ry, 4, 1.4 * S, 3 * S, 0xffe9a8, 0.9);
    });
    this.selectionRing = this.add.container(0, 0, [ringGlow, ringGold, ...runes]);
    this.selectionRing.setVisible(false);
    this.selectionRing.setDepth(10);
    this.tweens.add({
      targets: this.selectionRing, angle: 360, duration: 4000, repeat: -1, ease: 'Linear',
    });

    this.gravityBannerBg = this.add.graphics().setDepth(19).setAlpha(0);
    this.gravityBannerBg.fillStyle(0x170f2b, 0.92);
    this.gravityBannerBg.lineStyle(2 * S, 0xe8b64f, 0.9);
    this.gravityBannerBg.fillRoundedRect(-110 * S, -44 * S, 220 * S, 88 * S, 16 * S);
    this.gravityBannerBg.strokeRoundedRect(-110 * S, -44 * S, 220 * S, 88 * S, 16 * S);
    this.gravityBannerBg.setPosition(GRID_SIZE * TILE / 2, GRID_SIZE * TILE / 2);

    this.gravityBanner = this.add.text(GRID_SIZE * TILE / 2, GRID_SIZE * TILE / 2, '', {
      fontFamily: 'Cinzel Decorative, serif',
      fontSize: `${18 * S}px`,
      color: '#e8c977',
      align: 'center',
      lineSpacing: 8 * S,
    }).setOrigin(0.5).setDepth(20).setAlpha(0);

    setCurrentSceneKey('GameScene');
    this.exitListener = () => this.confirmExitToLobby();
    window.addEventListener('game:exit-to-lobby', this.exitListener);
    this.events.once('shutdown', () => {
      if (this.exitListener) window.removeEventListener('game:exit-to-lobby', this.exitListener);
    });

    this.updateHud();
    this.armIdleTimer();

    const intro = getStageIntro(this.stage);
    if (intro) {
      this.busy = true;
      this.showStoryIntro(intro.speaker, intro.text, () => {
        this.maybeTriggerRandomEvent();
      }, t('intro.floorStage', { floor: getFloor(this.stage), stage: this.stage }));
    } else {
      this.maybeTriggerRandomEvent();
    }
  }

  // Applied straight to this run, not banked via Progress boosts — those only
  // get consumed at the next stage init(), which has already passed by the
  // time an event fires mid-create(). The player should feel the reward now.
  private grantEventItem(item: EventItem): void {
    if (item === 'bonusMove') {
      this.movesRemaining += 3;
      this.updateHud();
    } else {
      this.pendingSpecialQueue.push(item);
      this.placingSpecials += 1;
      this.eventGrantedSpecials += 1;
    }
  }

  private maybeTriggerRandomEvent(): void {
    const event = rollRandomEvent();
    if (!event) {
      this.busy = false;
      this.maybeStartPlacement();
      return;
    }
    this.grantEventItem(event.item);
    this.busy = true;
    this.showStoryIntro(event.speaker, `${event.text}\n${t('event.itemGot', { item: event.itemLabel })}`, () => {
      this.busy = false;
      this.maybeStartPlacement();
    });
  }

  private maybeStartPlacement(): void {
    if (this.placingSpecials <= 0) {
      this.showGameStartBanner();
      return;
    }
    const bought = this.placingSpecials - this.eventGrantedSpecials;
    let itemLine: string;
    if (this.eventGrantedSpecials <= 0) {
      itemLine = t('placementIntro.boughtOnly', { n: this.placingSpecials });
    } else if (bought <= 0) {
      itemLine = t('placementIntro.eventOnly', { n: this.eventGrantedSpecials });
    } else {
      itemLine = t('placementIntro.both', { bought, event: this.eventGrantedSpecials, total: this.placingSpecials });
    }
    this.busy = true;
    this.showStoryIntro(
      t('shopkeeper.name'),
      t('placementIntro.instruction', { itemLine }),
      () => {
        this.busy = false;
        this.startPlacementMode();
      },
    );
  }

  private startPlacementMode(): void {
    this.placementQueue = this.pendingSpecialQueue;
    this.pendingSpecialQueue = [];
    this.showPlacementCard();
  }

  private showPlacementCard(): void {
    this.placementActive = false;
    const type = this.placementQueue[0];
    if (!type) return;
    playSpecialPromote();
    const cx = GRID_SIZE * TILE / 2;
    const cy = GRID_SIZE * TILE / 2;

    const dim = this.add.rectangle(cx, cy, GRID_SIZE * TILE, GRID_SIZE * TILE, 0x0a0618, 0.5).setDepth(35);
    const cardBg = this.add.rectangle(cx, cy - 10 * S, 168 * S, 168 * S, 0x241a3f, 1)
      .setStrokeStyle(3 * S, 0xe8b64f, 0.9).setDepth(36).setScale(0.4).setAlpha(0);
    const icon = this.add.image(cx, cy - 24 * S, specialTextureKey(type)).setDepth(37).setScale(0);
    icon.setDisplaySize(96 * S, 96 * S);
    const label = this.add.text(cx, cy + 92 * S, t('placement.instruction'), {
      fontFamily: 'Cinzel Decorative, serif',
      fontSize: `${15 * S}px`,
      color: '#ffffff',
      stroke: '#150f26',
      strokeThickness: 4 * S,
      align: 'center',
    }).setOrigin(0.5).setDepth(37).setAlpha(0);

    icon.setAngle(-25);
    this.tweens.add({
      targets: cardBg, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: icon, scale: 1, angle: 0, duration: 380, delay: 80, ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: label, alpha: 1, y: cy + 82 * S, duration: 280, delay: 200, ease: 'Sine.easeOut',
    });

    this.time.delayedCall(1300, () => {
      this.tweens.add({
        targets: [dim, cardBg, icon, label],
        alpha: 0,
        duration: 220,
        onComplete: () => {
          dim.destroy(); cardBg.destroy(); icon.destroy(); label.destroy();
          this.placementActive = true;
        },
      });
    });
  }

  private finishPlacementAt(row: number, col: number): void {
    if (this.specialGrid[row][col]) return;
    const type = this.placementQueue.shift();
    if (!type) return;
    this.promoteToSpecial(row, col, type);
    this.placingSpecials -= 1;

    if (this.placementQueue.length > 0) {
      this.showPlacementCard();
    } else {
      this.placementActive = false;
      this.showGameStartBanner();
    }
  }

  private showGameStartBanner(): void {
    playGameStart();
    const cx = GRID_SIZE * TILE / 2;
    const cy = GRID_SIZE * TILE / 2;
    const txt = this.add.text(cx, cy, t('game.start'), {
      fontFamily: 'Cinzel Decorative, serif',
      fontSize: `${30 * S}px`,
      color: '#ffe9a8',
      stroke: '#150f26',
      strokeThickness: 6 * S,
    }).setOrigin(0.5).setDepth(38).setScale(0.3).setAlpha(0).setAngle(-8);

    this.tweens.add({
      targets: txt, scale: 1, alpha: 1, angle: 0, duration: 320, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: txt, alpha: 0, scale: 1.3, duration: 350, delay: 500,
          onComplete: () => txt.destroy(),
        });
      },
    });
  }

  private showStoryIntro(speaker: string, text: string, onDismiss: () => void, subtitle?: string): void {
    const cx = GRID_SIZE * TILE / 2;
    const cy = GRID_SIZE * TILE / 2;

    const overlay = this.add.rectangle(cx, cy, GRID_SIZE * TILE, GRID_SIZE * TILE, 0x0a0618, 0.82).setDepth(40);
    const cardG = drawPanel(this, cx, cy, GRID_SIZE * TILE - 40 * S, 150 * S, {
      fillColor: 0x2c1f4a, radius: 18 * S, strokeWidth: 2 * S, depth: 41,
    });
    const speakerText = this.add.text(cx, cy - 62 * S, speaker, {
      fontFamily: 'Cinzel Decorative, serif',
      fontSize: `${15 * S}px`,
      color: '#e8b64f',
      stroke: '#0a0618',
      strokeThickness: 4 * S,
    }).setOrigin(0.5).setDepth(42);
    const subtitleText = subtitle ? this.add.text(cx, cy - 42 * S, subtitle, {
      fontFamily: 'Cormorant Garamond, serif',
      fontSize: `${11 * S}px`,
      fontStyle: '700',
      color: '#a898c8',
      stroke: '#0a0618',
      strokeThickness: 2 * S,
    }).setOrigin(0.5).setDepth(42) : undefined;
    const bodyText = this.add.text(cx, cy - 5 * S, text, {
      fontFamily: 'Cormorant Garamond, serif',
      fontSize: `${16 * S}px`,
      fontStyle: '700',
      color: '#f3e6c8',
      align: 'center',
      stroke: '#0a0618',
      strokeThickness: 3 * S,
      wordWrap: { width: GRID_SIZE * TILE - 80 * S },
    }).setOrigin(0.5).setDepth(42);
    const btn = createPillButton(this, cx, cy + 62 * S, t('story.startButton'), {
      fontSize: `${14 * S}px`, bgColor: 0xe8b64f, paddingX: 14 * S, paddingY: 6 * S, depth: 42,
    });

    const children: Phaser.GameObjects.GameObject[] = [overlay, cardG, speakerText, bodyText, btn];
    if (subtitleText) children.push(subtitleText);
    const group = this.add.container(0, 0, children).setDepth(40);
    btn.on('pointerdown', () => {
      group.destroy(true);
      onDismiss();
    });
  }

  private ensureSparkTexture(): void {
    if (this.textures.exists('spark')) return;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('spark', 8, 8);
    g.destroy();
  }

  private drawSlots(): void {
    const boardPx = GRID_SIZE * TILE;
    // fillGradientStyle only renders under WebGL; without a solid fillStyle
    // set first, a Canvas-renderer fallback leaves these fillRect calls
    // using whatever fill was last active (defaulting to opaque black),
    // painting solid black bars across the board instead of a soft fade.
    const vignette = this.add.graphics().setDepth(-1);
    vignette.fillStyle(0x000000, 0.25);
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.5, 0.5, 0, 0);
    vignette.fillRect(0, 0, boardPx, boardPx * 0.18);
    vignette.fillStyle(0x000000, 0.25);
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.5, 0.5);
    vignette.fillRect(0, boardPx * 0.82, boardPx, boardPx * 0.18);
    vignette.fillStyle(0x000000, 0.2);
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.4, 0, 0.4, 0);
    vignette.fillRect(0, 0, boardPx * 0.14, boardPx);
    vignette.fillStyle(0x000000, 0.2);
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0.4, 0, 0.4);
    vignette.fillRect(boardPx * 0.86, 0, boardPx * 0.14, boardPx);

    const g = this.add.graphics();
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const isAlt = (r + c) % 2 === 0;
        const base = isAlt ? 0x2c1f4a : 0x241a3f;
        const light = isAlt ? 0x3d2c66 : 0x342752;
        const x = c * TILE + 2 * S;
        const y = r * TILE + 2 * S;
        const s = TILE - 4 * S;
        g.fillStyle(base, 1);
        g.fillGradientStyle(light, light, base, base, 1);
        g.fillRoundedRect(x, y, s, s, 10 * S);
        g.lineStyle(S, 0x120a20, 0.5);
        g.strokeRoundedRect(x, y, s, s, 10 * S);
      }
    }

    const corners: [number, number][] = [[14 * S, 14 * S], [boardPx - 14 * S, 14 * S], [14 * S, boardPx - 14 * S], [boardPx - 14 * S, boardPx - 14 * S]];
    corners.forEach(([x, y], i) => {
      const sigil = this.add.star(x, y, 4, 2 * S, 5 * S, 0xe8b64f, 0.35).setDepth(4);
      this.tweens.add({
        targets: sigil, alpha: 0.12, angle: 45, yoyo: true, repeat: -1,
        duration: 2200 + i * 300, ease: 'Sine.easeInOut',
      });
    });

    const border = this.add.graphics().setDepth(4);
    border.lineStyle(2 * S, 0xe8b64f, 0.5);
    border.strokeRoundedRect(3 * S, 3 * S, boardPx - 6 * S, boardPx - 6 * S, 14 * S);
  }

  private cellX(col: number): number { return col * TILE + TILE / 2; }
  private cellY(row: number): number { return row * TILE + TILE / 2; }

  private spawnCandySprite(row: number, col: number, type: number): Phaser.GameObjects.Image {
    const img = this.add.image(this.cellX(col), this.cellY(row), candyTextureKey(type));
    img.setDisplaySize(CANDY_DISPLAY, CANDY_DISPLAY);
    img.setInteractive({ useHandCursor: true });
    img.setData('row', row);
    img.setData('col', col);
    img.on('pointerdown', () => this.onCandyPointerDown(img));
    return img;
  }

  // Swipe is the primary way to move on a phone — tapping a tile then
  // hunting for its neighbor is fiddly with a thumb. A short drag off a
  // tile swaps it toward wherever it was dragged; a drag too short to count
  // as a swipe falls back to the old tap-to-select-then-tap-neighbor flow
  // (also how a special tile still gets armed and double-tap-activated).
  private onCandyPointerDown(img: Phaser.GameObjects.Image): void {
    const row = img.getData('row') as number;
    const col = img.getData('col') as number;

    if (this.placementActive) {
      this.finishPlacementAt(row, col);
      return;
    }

    if (this.busy) return;
    this.dragStart = { row, col };
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    const start = this.dragStart;
    this.dragStart = null;
    if (!start || this.busy) return;

    const dx = pointer.upX - pointer.downX;
    const dy = pointer.upY - pointer.downY;
    const swipeThreshold = TILE * 0.28;

    if (Math.hypot(dx, dy) < swipeThreshold) {
      this.handleTap(start.row, start.col);
      return;
    }

    let targetRow = start.row;
    let targetCol = start.col;
    if (Math.abs(dx) > Math.abs(dy)) {
      targetCol += dx > 0 ? 1 : -1;
    } else {
      targetRow += dy > 0 ? 1 : -1;
    }
    if (targetRow < 0 || targetRow >= GRID_SIZE || targetCol < 0 || targetCol >= GRID_SIZE) return;

    this.armIdleTimer();
    this.clearHint();
    this.clearArmPreview();
    this.selected = null;
    this.selectionRing!.setVisible(false);
    void this.attemptSwap(start, { row: targetRow, col: targetCol });
  }

  private handleTap(row: number, col: number): void {
    this.armIdleTimer();
    this.clearHint();

    const img = this.board[row][col];
    if (!img) return;

    playTap();
    if (!this.selected) {
      this.selected = { row, col };
      this.selectionRing!.setPosition(img.x, img.y).setVisible(true);
      const special = this.specialGrid[row][col];
      if (special) this.showArmPreview(row, col, special);
      return;
    }

    if (this.selected.row === row && this.selected.col === col) {
      const special = this.specialGrid[row][col];
      this.clearArmPreview();
      this.selected = null;
      this.selectionRing!.setVisible(false);
      if (special) {
        void this.activateSpecialAt({ row, col });
      }
      return;
    }

    if (isAdjacent(this.selected.row, this.selected.col, row, col)) {
      const from = this.selected;
      this.clearArmPreview();
      this.selected = null;
      this.selectionRing!.setVisible(false);
      void this.attemptSwap(from, { row, col });
    } else {
      this.clearArmPreview();
      this.selected = { row, col };
      this.selectionRing!.setPosition(img.x, img.y).setVisible(true);
      const special = this.specialGrid[row][col];
      if (special) this.showArmPreview(row, col, special);
    }
  }

  private showArmPreview(row: number, col: number, type: SpecialType): void {
    const g = this.add.graphics().setDepth(14);
    g.fillStyle(0xffffff, 1);
    if (type === 'lineRow') {
      g.fillRect(0, row * TILE, GRID_SIZE * TILE, TILE);
    } else if (type === 'lineCol') {
      g.fillRect(col * TILE, 0, TILE, GRID_SIZE * TILE);
    } else if (type === 'crossBomb') {
      g.fillRect(0, row * TILE, GRID_SIZE * TILE, TILE);
      g.fillRect(col * TILE, 0, TILE, GRID_SIZE * TILE);
    } else {
      const target = this.mostCommonType();
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (this.typeGrid[r][c] === target) {
            g.fillRoundedRect(c * TILE + 3 * S, r * TILE + 3 * S, TILE - 6 * S, TILE - 6 * S, 10 * S);
          }
        }
      }
    }
    g.setAlpha(0.3);
    this.armPreview = g;
    this.armPreviewTween = this.tweens.add({
      targets: g, alpha: 0.08, yoyo: true, repeat: -1, duration: 350, ease: 'Sine.easeInOut',
    });
  }

  private armIdleTimer(): void {
    this.idleEvent?.remove(false);
    this.idleEvent = this.time.delayedCall(8000, () => {
      if (!this.busy && !this.endText) this.showHint();
      this.armIdleTimer();
    });
  }

  private hasAnyMove(): boolean {
    const hasSpecial = this.specialGrid.some((row) => row.some((v) => v !== null));
    if (hasSpecial) return true;
    return !!findHintSwap(this.typeGrid, GRID_SIZE);
  }

  private showHint(): void {
    if (this.busy) return;
    this.clearHint();

    const hasSpecial = this.specialGrid.some((row) => row.some((v) => v !== null));
    const hint = findHintSwap(this.typeGrid, GRID_SIZE);

    if (!hint) {
      if (!hasSpecial) {
        void this.reshuffleBoard();
      }
      return;
    }

    // Only wiggle the two tiles the player actually needs to swap — not
    // every tile that ends up matched afterward — so the hint reads as
    // "swap this with this" instead of pointing at the whole resulting run.
    [hint.a, hint.b].forEach(({ row: r, col: c }) => {
      const sprite = this.board[r][c];
      if (!sprite) return;
      this.hintSprites.push(sprite);
      const tw = this.tweens.add({
        targets: sprite, angle: -12, yoyo: true, repeat: 7, duration: 90, ease: 'Sine.easeInOut',
      });
      this.hintTweens.push(tw);
    });

    this.time.delayedCall(1400, () => this.clearHint());
  }

  private clearHint(): void {
    this.hintTweens.forEach((tw) => tw.stop());
    this.hintTweens = [];
    this.hintSprites.forEach((sprite) => sprite.setAngle(0));
    this.hintSprites = [];
  }

  private async reshuffleBoard(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      const banner = this.add.text(GRID_SIZE * TILE / 2, GRID_SIZE * TILE / 2, t('reshuffle.banner'), {
        fontFamily: 'Cinzel Decorative, serif',
        fontSize: `${18 * S}px`,
        color: '#ffffff',
        stroke: '#7a1fc9',
        strokeThickness: 5 * S,
        align: 'center',
      }).setOrigin(0.5).setDepth(20).setAlpha(0);
      await tweenPromise(this, { targets: banner, alpha: 1, duration: 200 });
      await new Promise((r) => this.time.delayedCall(500, () => r(undefined)));

      const fadeOuts: Promise<void>[] = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const sprite = this.board[r][c];
          if (sprite) fadeOuts.push(tweenPromise(this, { targets: sprite, alpha: 0, scale: 0, duration: 200 }));
        }
      }
      await Promise.all(fadeOuts);

      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          this.board[r][c]?.destroy();
        }
      }

      this.typeGrid = buildInitialTypeGrid(GRID_SIZE);
      this.specialGrid = Array.from({ length: GRID_SIZE }, () => new Array<SpecialType | null>(GRID_SIZE).fill(null));
      const fadeIns: Promise<void>[] = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const sprite = this.spawnCandySprite(r, c, this.typeGrid[r][c]);
          const targetScale = sprite.scale;
          sprite.setAlpha(0).setScale(0);
          this.board[r][c] = sprite;
          fadeIns.push(tweenPromise(this, { targets: sprite, alpha: 1, scale: targetScale, duration: 220 }));
        }
      }
      await Promise.all(fadeIns);

      await tweenPromise(this, { targets: banner, alpha: 0, duration: 250 });
      banner.destroy();
    } finally {
      this.busy = false;
    }
  }

  private clearArmPreview(): void {
    this.armPreviewTween?.stop();
    this.armPreviewTween = undefined;
    this.armPreview?.destroy();
    this.armPreview = undefined;
  }

  private async attemptSwap(a: Cell, b: Cell): Promise<void> {
    if (!this.board[a.row][a.col] || !this.board[b.row][b.col]) return;
    this.busy = true;
    try {
      playSwap();
      await this.swapCells(a, b);

      const specialAtA = this.specialGrid[a.row][a.col];
      const specialAtB = this.specialGrid[b.row][b.col];
      const matches = findMatchedCells(this.typeGrid, GRID_SIZE);
      const hasSpecial = !!specialAtA || !!specialAtB;

      if (matches.size === 0 && !hasSpecial) {
        playInvalidSwap();
        await this.swapCells(a, b);
        return;
      }

      this.movesRemaining -= 1;
      this.movesUsed += 1;

      let forced = new Set<string>();
      if (specialAtA) {
        const partnerIsPlain = !specialAtB;
        const pairedType = partnerIsPlain ? this.typeGrid[b.row][b.col] : this.mostCommonType();
        forced = new Set([...forced, ...this.getSpecialActivationCells(a, specialAtA, pairedType)]);
        this.stopSpecialVisual(a.row, a.col);
        this.specialGrid[a.row][a.col] = null;
      }
      if (specialAtB) {
        const partnerIsPlain = !specialAtA;
        const pairedType = partnerIsPlain ? this.typeGrid[a.row][a.col] : this.mostCommonType();
        forced = new Set([...forced, ...this.getSpecialActivationCells(b, specialAtB, pairedType)]);
        this.stopSpecialVisual(b.row, b.col);
        this.specialGrid[b.row][b.col] = null;
      }

      await this.resolveCascade(1, forced);
      this.updateHud();

      if (this.movesRemaining > 0 && this.movesUsed % this.gravityFlipInterval === 0) {
        await this.flipGravity();
      }

      if (this.movesRemaining > 0 && !this.hasAnyMove()) {
        await this.reshuffleBoard();
      }

      await this.checkEndState();
    } catch (err) {
      console.error('attemptSwap failed', err);
    } finally {
      this.busy = false;
    }
  }

  private async activateSpecialAt(cell: Cell): Promise<void> {
    const type = this.specialGrid[cell.row][cell.col];
    if (!type) return;
    this.busy = true;
    try {
      playSpecialActivate();
      this.movesRemaining -= 1;
      this.movesUsed += 1;

      const pairedType = type === 'colorBomb' ? this.mostCommonType() : this.typeGrid[cell.row][cell.col];
      const forced = this.getSpecialActivationCells(cell, type, pairedType);
      this.stopSpecialVisual(cell.row, cell.col);
      this.specialGrid[cell.row][cell.col] = null;

      await this.resolveCascade(1, forced);
      this.updateHud();

      if (this.movesRemaining > 0 && this.movesUsed % this.gravityFlipInterval === 0) {
        await this.flipGravity();
      }

      if (this.movesRemaining > 0 && !this.hasAnyMove()) {
        await this.reshuffleBoard();
      }

      await this.checkEndState();
    } catch (err) {
      console.error('activateSpecialAt failed', err);
    } finally {
      this.busy = false;
    }
  }

  private mostCommonType(): number {
    const counts = new Array(CANDY_TYPE_COUNT).fill(0);
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const t = this.typeGrid[r][c];
        if (t >= 0) counts[t] += 1;
      }
    }
    let best = 0;
    for (let i = 1; i < counts.length; i++) {
      if (counts[i] > counts[best]) best = i;
    }
    return best;
  }

  private async swapCells(a: Cell, b: Cell): Promise<void> {
    const spriteA = this.board[a.row][a.col];
    const spriteB = this.board[b.row][b.col];
    if (!spriteA || !spriteB) return;

    this.board[a.row][a.col] = spriteB;
    this.board[b.row][b.col] = spriteA;
    spriteA.setData('row', b.row).setData('col', b.col);
    spriteB.setData('row', a.row).setData('col', a.col);

    const tmpType = this.typeGrid[a.row][a.col];
    this.typeGrid[a.row][a.col] = this.typeGrid[b.row][b.col];
    this.typeGrid[b.row][b.col] = tmpType;

    const tmpSpecial = this.specialGrid[a.row][a.col];
    this.specialGrid[a.row][a.col] = this.specialGrid[b.row][b.col];
    this.specialGrid[b.row][b.col] = tmpSpecial;

    await Promise.all([
      tweenPromise(this, { targets: spriteA, x: this.cellX(b.col), y: this.cellY(b.row), duration: 160, ease: 'Sine.easeInOut' }),
      tweenPromise(this, { targets: spriteB, x: this.cellX(a.col), y: this.cellY(a.row), duration: 160, ease: 'Sine.easeInOut' }),
    ]);
  }

  private getSpecialActivationCells(cell: Cell, type: SpecialType, pairedType: number): Set<string> {
    const out = new Set<string>();
    if (type === 'lineRow') {
      for (let c = 0; c < GRID_SIZE; c++) out.add(`${cell.row},${c}`);
    } else if (type === 'lineCol') {
      for (let r = 0; r < GRID_SIZE; r++) out.add(`${r},${cell.col}`);
    } else if (type === 'crossBomb') {
      for (let c = 0; c < GRID_SIZE; c++) out.add(`${cell.row},${c}`);
      for (let r = 0; r < GRID_SIZE; r++) out.add(`${r},${cell.col}`);
    } else {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (this.typeGrid[r][c] === pairedType) out.add(`${r},${c}`);
        }
      }
    }
    out.add(`${cell.row},${cell.col}`);
    return out;
  }

  private promoteToSpecial(r: number, c: number, type: SpecialType): void {
    playSpecialPromote();
    this.specialGrid[r][c] = type;
    const sprite = this.board[r][c];
    if (!sprite) return;
    sprite.setTexture(specialTextureKey(type));
    sprite.setDisplaySize(CANDY_DISPLAY * 1.05, CANDY_DISPLAY * 1.05);
    const baseScale = sprite.scale;
    const pulse = this.tweens.add({
      targets: sprite, scale: baseScale * 1.16, yoyo: true, repeat: -1, duration: 380, ease: 'Sine.easeInOut',
    });
    sprite.setData('pulseTween', pulse);
  }

  private stopSpecialVisual(r: number, c: number): void {
    const sprite = this.board[r][c];
    if (!sprite) return;
    const pulse = sprite.getData('pulseTween') as Phaser.Tweens.Tween | undefined;
    if (pulse) pulse.stop();
  }

  private async resolveCascade(comboMultiplier: number, forcedCells: Set<string> = new Set()): Promise<void> {
    const baseMatches = findMatchedCells(this.typeGrid, GRID_SIZE);
    const matches = new Set<string>([...baseMatches, ...forcedCells]);
    if (matches.size === 0) return;
    playMatch(comboMultiplier);

    // Any pre-existing special caught in this match should detonate for its full effect,
    // not just vanish like a plain candy. Expand to a fixed point since chained specials
    // can pull in further specials.
    const expandedSpecials = new Set<string>();
    let grew = true;
    while (grew) {
      grew = false;
      for (const key of Array.from(matches)) {
        if (expandedSpecials.has(key)) continue;
        const [r, c] = key.split(',').map(Number);
        const existingSpecial = this.specialGrid[r][c];
        if (!existingSpecial) continue;
        expandedSpecials.add(key);
        const pairedType = existingSpecial === 'colorBomb' ? this.mostCommonType() : this.typeGrid[r][c];
        const extra = this.getSpecialActivationCells({ row: r, col: c }, existingSpecial, pairedType);
        extra.forEach((k) => {
          if (!matches.has(k)) {
            matches.add(k);
            grew = true;
          }
        });
      }
    }

    const promote = new Map<string, SpecialType>();
    const runs3 = findLongRuns(this.typeGrid, GRID_SIZE, 3);
    const rowRuns3 = runs3.filter((r) => r.axis === 'row');
    const colRuns3 = runs3.filter((r) => r.axis === 'col');
    rowRuns3.forEach((rr) => {
      colRuns3.forEach((cr) => {
        const shared = rr.cells.find((rc) => cr.cells.some((cc) => cc.row === rc.row && cc.col === rc.col));
        if (shared) promote.set(`${shared.row},${shared.col}`, 'crossBomb');
      });
    });

    if (promote.size === 0) {
      const longRuns = findLongRuns(this.typeGrid, GRID_SIZE, 4);
      longRuns.forEach((run) => {
        const mid = run.cells[Math.floor(run.cells.length / 2)];
        const key = `${mid.row},${mid.col}`;
        const type: SpecialType = run.cells.length >= 5 ? 'colorBomb' : (run.axis === 'row' ? 'lineRow' : 'lineCol');
        promote.set(key, type);
      });
    }

    const gained = matches.size * SCORE_PER_CANDY * comboMultiplier;
    this.score += gained;
    this.updateHud();

    let sumX = 0;
    let sumY = 0;
    const removeTweens: Promise<void>[] = [];
    const cellsToClear: Cell[] = [];
    matches.forEach((key) => {
      const [r, c] = key.split(',').map(Number);
      const x = this.cellX(c);
      const y = this.cellY(r);
      sumX += x;
      sumY += y;
      const paletteColor = CANDY_PALETTES[this.typeGrid[r][c]]?.base ?? '#ffffff';
      const colorNum = Phaser.Display.Color.HexStringToColor(paletteColor).color;
      this.spawnBurst(x, y, colorNum);
      this.spawnShockwave(x, y, colorNum);

      const promoteType = promote.get(key);
      if (promoteType) {
        this.promoteToSpecial(r, c, promoteType);
        return;
      }

      const sprite = this.board[r][c];
      if (sprite) {
        removeTweens.push(this.popAndShrink(sprite));
      }
      cellsToClear.push({ row: r, col: c });
    });
    this.spawnScorePopup(sumX / matches.size, sumY / matches.size, gained);
    if (comboMultiplier >= 2) {
      this.showComboBanner(comboMultiplier);
    }
    this.cameras.main.shake(Math.min(160, 60 + matches.size * 6), Math.min(0.009, 0.0012 * matches.size));
    await Promise.all(removeTweens);

    cellsToClear.forEach(({ row: r, col: c }) => {
      this.stopSpecialVisual(r, c);
      this.board[r][c]?.destroy();
      this.board[r][c] = null;
      this.typeGrid[r][c] = -1;
      this.specialGrid[r][c] = null;
    });

    await this.applyGravityAndRefill();
    await this.resolveCascade(comboMultiplier + 1);
  }

  private spawnBurst(x: number, y: number, color: number): void {
    const emitter = this.add.particles(x, y, 'spark', {
      lifespan: 420,
      speed: { min: 90 * S, max: 260 * S },
      scale: { start: 2.1 * S, end: 0 },
      tint: color,
      quantity: 14,
      blendMode: 'ADD',
      emitting: false,
    });
    emitter.setDepth(18);
    emitter.explode(14);
    this.time.delayedCall(460, () => emitter.destroy());
  }

  private spawnShockwave(x: number, y: number, color: number): void {
    const ring = this.add.circle(x, y, CANDY_DISPLAY / 2, color, 0);
    ring.setStrokeStyle(4 * S, color, 0.9);
    ring.setDepth(17);
    this.tweens.add({
      targets: ring,
      radius: CANDY_DISPLAY * 1.3,
      alpha: 0,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private popAndShrink(sprite: Phaser.GameObjects.Image): Promise<void> {
    const baseScale = sprite.scale;
    return new Promise((resolve) => {
      this.tweens.add({
        targets: sprite,
        scale: baseScale * 1.35,
        duration: 70,
        ease: 'Sine.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: sprite,
            scale: 0,
            alpha: 0,
            duration: 130,
            ease: 'Back.easeIn',
            onComplete: () => resolve(),
          });
        },
      });
    });
  }

  private spawnScorePopup(x: number, y: number, amount: number): void {
    const txt = this.add.text(x, y, `+${amount}`, {
      fontFamily: 'Cinzel Decorative, serif',
      fontSize: `${16 * S}px`,
      color: '#ffe9a8',
      stroke: '#150f26',
      strokeThickness: 3 * S,
    }).setOrigin(0.5).setDepth(19);
    this.tweens.add({
      targets: txt, y: y - 34 * S, alpha: 0, duration: 620, ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy(),
    });
  }

  private showComboBanner(multiplier: number): void {
    const cx = GRID_SIZE * TILE / 2;
    const cy = GRID_SIZE * TILE / 2;
    const txt = this.add.text(cx, cy, t('game.combo', { n: multiplier }), {
      fontFamily: 'Cinzel Decorative, serif',
      fontSize: `${26 * S}px`,
      color: '#ffd166',
      stroke: '#150f26',
      strokeThickness: 6 * S,
    }).setOrigin(0.5).setDepth(25).setScale(0.4).setAlpha(0);

    this.tweens.add({
      targets: txt, scale: 1, alpha: 1, duration: 160, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: txt, alpha: 0, y: cy - 20 * S, duration: 300, delay: 250,
          onComplete: () => txt.destroy(),
        });
      },
    });

    this.cameras.main.shake(Math.min(220, 110 + multiplier * 20), Math.min(0.012, 0.0035 * multiplier));
  }

  private lineCells(lineIndex: number): Cell[] {
    if (this.direction === 'down' || this.direction === 'up') {
      return range(0, GRID_SIZE).map((row) => ({ row, col: lineIndex }));
    }
    return range(0, GRID_SIZE).map((col) => ({ row: lineIndex, col }));
  }

  private async applyGravityAndRefill(): Promise<void> {
    const toHigh = this.direction === 'down' || this.direction === 'right';
    const tweens: Promise<void>[] = [];

    for (let lineIndex = 0; lineIndex < GRID_SIZE; lineIndex++) {
      const cells = this.lineCells(lineIndex);
      const survivors: { sprite: Phaser.GameObjects.Image; type: number; special: SpecialType | null }[] = [];
      for (const cell of cells) {
        const sprite = this.board[cell.row][cell.col];
        if (sprite) {
          survivors.push({ sprite, type: this.typeGrid[cell.row][cell.col], special: this.specialGrid[cell.row][cell.col] });
        }
      }
      const emptyCount = GRID_SIZE - survivors.length;
      const survivorTargets = toHigh ? range(emptyCount, GRID_SIZE) : range(0, survivors.length);
      const spawnTargets = toHigh ? range(0, emptyCount) : range(survivors.length, GRID_SIZE);

      survivors.forEach((sv, idx) => {
        const targetCell = cells[survivorTargets[idx]];
        sv.sprite.setData('row', targetCell.row).setData('col', targetCell.col);
        this.board[targetCell.row][targetCell.col] = sv.sprite;
        this.typeGrid[targetCell.row][targetCell.col] = sv.type;
        this.specialGrid[targetCell.row][targetCell.col] = sv.special;
        tweens.push(tweenPromise(this, {
          targets: sv.sprite,
          x: this.cellX(targetCell.col),
          y: this.cellY(targetCell.row),
          duration: 220,
          ease: 'Cubic.easeIn',
        }));
      });

      spawnTargets.forEach((targetIdx) => {
        const targetCell = cells[targetIdx];
        const type = randomType();
        const { x: entryX, y: entryY } = this.entryPosition(targetCell, emptyCount);
        const sprite = this.spawnCandySprite(targetCell.row, targetCell.col, type);
        sprite.setPosition(entryX, entryY);
        this.board[targetCell.row][targetCell.col] = sprite;
        this.typeGrid[targetCell.row][targetCell.col] = type;
        this.specialGrid[targetCell.row][targetCell.col] = null;
        tweens.push(tweenPromise(this, {
          targets: sprite,
          x: this.cellX(targetCell.col),
          y: this.cellY(targetCell.row),
          duration: 260,
          ease: 'Cubic.easeIn',
        }));
      });
    }

    await Promise.all(tweens);
  }

  private entryPosition(cell: Cell, emptyCount: number): { x: number; y: number } {
    const x = this.cellX(cell.col);
    const y = this.cellY(cell.row);
    switch (this.direction) {
      case 'down': return { x, y: y - emptyCount * TILE };
      case 'up': return { x, y: y + emptyCount * TILE };
      case 'left': return { x: x + emptyCount * TILE, y };
      case 'right': return { x: x - emptyCount * TILE, y };
    }
  }

  private async flipGravity(): Promise<void> {
    this.direction = nextDirection(this.direction);
    playGravityFlip();

    this.gravityBanner?.setText(`${t('gravity.flip')}\n${DIRECTION_ARROW[this.direction]} ${t(DIRECTION_KEY[this.direction])}`);
    const targets = [this.gravityBanner, this.gravityBannerBg].filter(Boolean);
    targets.forEach((t) => t?.setAlpha(0).setScale(0.6));
    await tweenPromise(this, { targets, alpha: 1, scale: 1, duration: 220, ease: 'Back.easeOut' });
    await new Promise((r) => this.time.delayedCall(1200, () => r(undefined)));
    await tweenPromise(this, { targets, alpha: 0, duration: 260 });
  }

  private updateHud(): void {
    const movesEl = document.getElementById('hud-moves');
    const scoreEl = document.getElementById('hud-score');
    const targetEl = document.getElementById('hud-target');
    const stageEl = document.getElementById('hud-stage');
    if (movesEl) movesEl.textContent = String(Math.max(0, this.movesRemaining));
    if (scoreEl) scoreEl.textContent = String(this.score);
    if (targetEl) targetEl.textContent = String(this.targetScore);
    if (stageEl) stageEl.textContent = String(this.stage);
  }

  private async checkEndState(): Promise<void> {
    if (this.endText) return;
    if (this.score >= this.targetScore) {
      await this.detonateRemainingSpecials();
      completeStage(this.stage);
      const baseReward = Math.min(30, 8 + Math.floor(this.stage / 20));
      const overAchieved = this.score >= this.targetScore * 2;
      const reward = overAchieved ? Math.round(baseReward * 1.5) : baseReward;
      addCurrency(reward);
      const hasNext = this.stage < TOTAL_STAGES;
      playStageClear();
      this.showEndBanner(
        overAchieved
          ? t('stageClear.overachieved', { stage: this.stage, reward })
          : t('stageClear.normal', { stage: this.stage, reward }),
        '#7ee08a',
        hasNext ? t('stageClear.next', { stage: this.stage + 1 }) : t('stageClear.allDone'),
        hasNext ? () => this.scene.restart({ stage: this.stage + 1 }) : undefined,
      );
    } else if (this.movesRemaining <= 0) {
      playOutOfMoves();
      this.showOutOfMovesOptions();
    }
  }

  private showOutOfMovesOptions(): void {
    const cx = GRID_SIZE * TILE / 2;
    const cy = GRID_SIZE * TILE / 2;

    const overlay = this.add.rectangle(cx, cy, GRID_SIZE * TILE, GRID_SIZE * TILE, 0x0a0618, 0.72).setDepth(30);
    this.endText = this.add.text(cx, cy - 66 * S, t('outOfMoves.title'), {
      fontFamily: 'Cinzel Decorative, serif',
      fontSize: `${22 * S}px`,
      color: '#ff8080',
      stroke: '#150f26',
      strokeThickness: 5 * S,
    }).setOrigin(0.5).setDepth(31);

    const adBtn = createPillButton(this, cx, cy - 12 * S, t('outOfMoves.watchAd'), {
      fontSize: `${15 * S}px`, bgColor: 0xe8b64f, paddingX: 16 * S, paddingY: 8 * S, depth: 31,
    });

    const leaveBtn = createPillButton(this, cx, cy + 40 * S, t('outOfMoves.leave'), {
      fontFamily: 'Cormorant Garamond, serif', fontSize: `${14 * S}px`, textColor: '#c9b8e0',
      bgColor: 0x3a2a5c, paddingX: 14 * S, paddingY: 7 * S, depth: 31,
    });

    const group = this.add.container(0, 0, [overlay, this.endText, adBtn, leaveBtn]).setDepth(30);

    adBtn.on('pointerdown', () => {
      group.destroy(true);
      this.endText = undefined;
      this.confirmAd(t('outOfMoves.confirmAd'), () => this.playMockAdForMoves());
    });
    leaveBtn.on('pointerdown', () => {
      spendHeart();
      this.scene.start('LobbyScene');
    });
  }

  private confirmAd(message: string, onConfirm: () => void): void {
    this.showConfirmDialog(message, t('common.watch'), t('common.cancel'), onConfirm);
  }

  private confirmExitToLobby(): void {
    if (this.busy) return;
    this.showConfirmDialog(
      t('settings.exitConfirm'),
      t('common.leave'),
      t('common.cancel'),
      () => this.scene.start('LobbyScene'),
    );
  }

  private showConfirmDialog(message: string, yesLabel: string, noLabel: string, onConfirm: () => void): void {
    const cx = GRID_SIZE * TILE / 2;
    const cy = GRID_SIZE * TILE / 2;
    const overlay = this.add.rectangle(cx, cy, GRID_SIZE * TILE, GRID_SIZE * TILE, 0x0a0618, 0.75).setDepth(58).setInteractive();
    const panelG = drawPanel(this, cx, cy, GRID_SIZE * TILE - 80 * S, 150 * S, {
      radius: 16 * S, strokeWidth: 2 * S, depth: 59,
    });
    const text = this.add.text(cx, cy - 30 * S, message, {
      fontFamily: 'Cormorant Garamond, serif', fontSize: `${15 * S}px`, fontStyle: '700', color: '#f3e6c8', align: 'center',
      stroke: '#0a0618', strokeThickness: 3 * S,
      wordWrap: { width: GRID_SIZE * TILE - 120 * S },
    }).setOrigin(0.5).setDepth(59);

    const yesBtn = createPillButton(this, cx - 55 * S, cy + 40 * S, yesLabel, {
      fontSize: `${14 * S}px`, bgColor: 0xe8b64f, paddingX: 16 * S, paddingY: 8 * S, depth: 59,
    });
    const noBtn = createPillButton(this, cx + 55 * S, cy + 40 * S, noLabel, {
      fontFamily: 'Cormorant Garamond, serif', fontSize: `${13 * S}px`, textColor: '#f3e6c8',
      bgColor: 0x3a2a5c, paddingX: 16 * S, paddingY: 8 * S, depth: 59,
    });

    const group = this.add.container(0, 0, [overlay, panelG, text, yesBtn, noBtn]).setDepth(58);
    yesBtn.on('pointerdown', () => { group.destroy(true); onConfirm(); });
    noBtn.on('pointerdown', () => group.destroy(true));
  }

  private playMockAdForMoves(): void {
    const cx = GRID_SIZE * TILE / 2;
    const cy = GRID_SIZE * TILE / 2;
    const overlay = this.add.rectangle(cx, cy, GRID_SIZE * TILE, GRID_SIZE * TILE, 0x000000, 0.9).setDepth(60);
    const label = this.add.text(cx, cy, t('ad.playing'), {
      fontFamily: 'Cinzel Decorative, serif', fontSize: `${18 * S}px`, color: '#ffffff',
    }).setOrigin(0.5).setDepth(61);
    let remaining = 3;
    const countdown = this.add.text(cx, cy + 40 * S, `${remaining}`, {
      fontFamily: 'Cinzel Decorative, serif', fontSize: `${24 * S}px`, color: '#e8b64f',
    }).setOrigin(0.5).setDepth(61);

    const tick = this.time.addEvent({
      delay: 700,
      repeat: 2,
      callback: () => {
        remaining -= 1;
        countdown.setText(String(Math.max(0, remaining)));
        if (remaining <= 0) {
          tick.remove(false);
          overlay.destroy();
          label.destroy();
          countdown.destroy();
          this.movesRemaining += 10;
          this.updateHud();
          this.armIdleTimer();
        }
      },
    });
  }

  private async detonateRemainingSpecials(): Promise<void> {
    let guard = 0;
    while (guard < 20) {
      guard += 1;
      const cells: Cell[] = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (this.specialGrid[r][c]) cells.push({ row: r, col: c });
        }
      }
      if (cells.length === 0) return;

      let forced = new Set<string>();
      cells.forEach((cell) => {
        const type = this.specialGrid[cell.row][cell.col]!;
        const paired = type === 'colorBomb' ? this.mostCommonType() : this.typeGrid[cell.row][cell.col];
        forced = new Set([...forced, ...this.getSpecialActivationCells(cell, type, paired)]);
      });
      cells.forEach((cell) => {
        this.stopSpecialVisual(cell.row, cell.col);
        this.specialGrid[cell.row][cell.col] = null;
      });

      await this.resolveCascade(2, forced);
      this.updateHud();
    }
  }

  private showEndBanner(msg: string, color: string, actionLabel?: string, onAction?: () => void): void {
    const cx = GRID_SIZE * TILE / 2;
    const cy = GRID_SIZE * TILE / 2;

    const overlay = this.add.rectangle(cx, cy, GRID_SIZE * TILE, GRID_SIZE * TILE, 0x0a0618, 0.72).setDepth(30);
    this.endText = this.add.text(cx, cy - 40 * S, msg, {
      fontFamily: 'Cinzel Decorative, serif',
      fontSize: `${22 * S}px`,
      color,
      stroke: '#150f26',
      strokeThickness: 5 * S,
      align: 'center',
      wordWrap: { width: GRID_SIZE * TILE - 40 * S },
    }).setOrigin(0.5).setDepth(31);

    const children: Phaser.GameObjects.GameObject[] = [overlay, this.endText];

    if (actionLabel) {
      const btn = createPillButton(this, cx, cy + 30 * S, actionLabel, {
        fontSize: `${16 * S}px`, bgColor: 0xe8b64f, paddingX: 16 * S, paddingY: 8 * S, depth: 31,
      });
      if (onAction) {
        btn.on('pointerdown', onAction);
      } else {
        btn.disableInteractive();
      }
      children.push(btn);
    }

    const lobbyBtn = createPillButton(this, cx, cy + 78 * S, t('endBanner.backToLobby'), {
      fontFamily: 'Cormorant Garamond, serif', fontSize: `${14 * S}px`, textColor: '#c9b8e0',
      bgColor: 0x3a2a5c, paddingX: 14 * S, paddingY: 6 * S, depth: 31,
    });
    lobbyBtn.on('pointerdown', () => this.scene.start('LobbyScene'));
    children.push(lobbyBtn);

    this.add.container(0, 0, children).setDepth(30);
  }
}
