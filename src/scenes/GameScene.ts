import Phaser from 'phaser';
import {
  GRID_SIZE, TILE, CANDY_DISPLAY, CANDY_TYPE_COUNT, ART_SIZE, SCORE_PER_CANDY, UI_SCALE,
  TITLE_FONT, BODY_FONT,
} from '../config/GameConfig';

const S = UI_SCALE;
import { buildCandySvg, svgToDataUri, candyTextureKey, CANDY_PALETTES } from '../art/candyArt';
import { buildSpecialSvg, specialTextureKey, SpecialArtType, SPECIAL_THEMES } from '../art/specialArt';
import { buildNukeSvg, nukeTextureKey, NukeType, NUKE_THEMES } from '../art/nukeArt';
import { TranslationKey } from '../i18n/translations';
import { buildInitialTypeGrid, findMatchedCells, findLongRuns, findHintSwap, isAdjacent, randomType } from '../engine/BoardModel';
import { Direction, nextDirection, DIRECTION_ARROW } from '../engine/Gravity';
import { getStageConfig, TOTAL_STAGES, ObstacleKind } from '../engine/StageConfig';
import {
  getCurrentStage, setCurrentStage, completeStage, addCurrency, spendHeart,
  useNukeItem, useBonusMovesItem, useSpecialItem,
} from '../engine/Progress';
import { refreshItemBar } from '../ui/itemBar';
import { getStageIntro, getFloor, rollRandomEvent, EventItem } from '../data/story';
import { t } from '../i18n';
import { createPillButton } from '../ui/PillButton';
import { drawPanel } from '../ui/Panel';
import { playMockAd } from '../ui/AdOverlay';
import { setCurrentSceneKey } from '../ui/settingsPanel';
import {
  playTap, playSwap, playInvalidSwap, playMatch, playSpecialPromote,
  playSpecialActivate, playGravityFlip, playStageClear, playOutOfMoves, playGameStart,
} from '../audio/sfx';

const DIRECTION_KEY = {
  down: 'direction.down', left: 'direction.left', up: 'direction.up', right: 'direction.right',
} as const;

const NUKE_LABEL_KEYS: Record<NukeType, TranslationKey> = {
  bomb: 'item.bomb', blackHole: 'item.blackHole', lightning: 'item.lightning', meteor: 'item.meteor',
};

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
  private colorCount = CANDY_TYPE_COUNT;
  private iceCount = 0;
  private chainCount = 0;
  private moldCount = 0;
  private obstacleHp = 1;
  private obstacleType: (ObstacleKind | null)[][] = [];
  private obstacleGridHp: number[][] = [];
  private obstacleOverlays: (Phaser.GameObjects.Container | null)[][] = [];
  private obstacleTotal = 0;
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
  private useNukeListener?: (e: Event) => void;
  private useSpecialListener?: (e: Event) => void;
  private useBonusMovesListener?: () => void;
  private languageListener?: () => void;
  private placingSpecials = 0;
  private eventGrantedSpecials = 0;
  private placementActive = false;
  private placementQueue: SpecialType[] = [];
  private placementMode: 'special' | 'nuke' | 'specialItem' = 'special';
  private targetingNukeType: NukeType | null = null;
  private targetingSpecialType: SpecialType | null = null;
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
    this.targetScore = cfg.targetScore;
    // Shop-bought bonus-moves/specials/nukes are all standing bag inventory
    // now (see Progress.ts) — used on demand mid-stage via the HUD item
    // button, not auto-applied or force-placed at stage start. Only a
    // random mid-stage event still pushes straight into pendingSpecialQueue
    // (see grantEventItem) for its instant-placement-card flow.
    this.movesRemaining = cfg.movesLimit;
    this.gravityFlipInterval = cfg.gravityFlipInterval;
    this.colorCount = cfg.colorCount;
    this.iceCount = cfg.iceCount;
    this.chainCount = cfg.chainCount;
    this.moldCount = cfg.moldCount;
    this.obstacleHp = cfg.obstacleHp;
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
    this.placementMode = 'special';
    this.targetingNukeType = null;
    this.targetingSpecialType = null;
  }

  preload(): void {
    // Every stage clear/restart re-runs preload(). Without this guard, each
    // one re-queued all 10 textures under their existing keys — Phaser
    // replaces the old GPU texture each time, and across many stages in a
    // row that churn can exhaust GPU memory and lose the WebGL context
    // (symptom: canvas renders as a solid color while game logic keeps
    // running). Load once, like LobbyScene already does for its icons.
    for (let t = 0; t < CANDY_TYPE_COUNT; t++) {
      if (this.textures.exists(candyTextureKey(t))) continue;
      const svg = buildCandySvg(t);
      this.load.svg(candyTextureKey(t), svgToDataUri(svg), { width: ART_SIZE, height: ART_SIZE });
    }
    (['lineRow', 'lineCol', 'crossBomb', 'colorBomb'] as SpecialArtType[]).forEach((type) => {
      if (this.textures.exists(specialTextureKey(type))) return;
      const svg = buildSpecialSvg(type);
      this.load.svg(specialTextureKey(type), svgToDataUri(svg), { width: ART_SIZE, height: ART_SIZE });
    });
    (['bomb', 'blackHole', 'lightning', 'meteor'] as NukeType[]).forEach((type) => {
      if (this.textures.exists(nukeTextureKey(type))) return;
      const svg = buildNukeSvg(type);
      this.load.svg(nukeTextureKey(type), svgToDataUri(svg), { width: ART_SIZE, height: ART_SIZE });
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

    this.typeGrid = buildInitialTypeGrid(GRID_SIZE, this.colorCount);
    this.specialGrid = Array.from({ length: GRID_SIZE }, () => new Array<SpecialType | null>(GRID_SIZE).fill(null));
    this.board = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const row: (Phaser.GameObjects.Image | null)[] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        row.push(this.spawnCandySprite(r, c, this.typeGrid[r][c]));
      }
      this.board.push(row);
    }

    this.setupObstacles();

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

    this.gravityBannerBg = drawPanel(this, GRID_SIZE * TILE / 2, GRID_SIZE * TILE / 2, 220 * S, 88 * S, {
      fillColor: 0x170f2b, strokeAlpha: 0.9, radius: 16 * S, strokeWidth: 2 * S, depth: 19,
    }).setAlpha(0);

    this.gravityBanner = this.add.text(GRID_SIZE * TILE / 2, GRID_SIZE * TILE / 2, '', {
      fontFamily: TITLE_FONT,
      fontSize: `${18 * S}px`,
      color: '#e8c977',
      align: 'center',
      lineSpacing: 8 * S,
    }).setOrigin(0.5).setDepth(20).setAlpha(0);

    setCurrentSceneKey('GameScene');
    this.exitListener = () => this.confirmExitToLobby();
    window.addEventListener('game:exit-to-lobby', this.exitListener);
    this.useNukeListener = (e: Event) => {
      const type = (e as CustomEvent<{ type: NukeType }>).detail?.type;
      if (type) this.beginUseNukeItem(type);
    };
    window.addEventListener('game:use-nuke', this.useNukeListener);
    this.useSpecialListener = (e: Event) => {
      const type = (e as CustomEvent<{ type: SpecialType }>).detail?.type;
      if (type) this.beginUseSpecialItem(type);
    };
    window.addEventListener('game:use-special', this.useSpecialListener);
    this.useBonusMovesListener = () => this.beginUseBonusMoves();
    window.addEventListener('game:use-bonusmoves', this.useBonusMovesListener);
    this.languageListener = () => {
      const hint = document.querySelector<HTMLElement>('.footer-hint');
      if (hint) hint.textContent = t('footerHint', { n: this.gravityFlipInterval });
    };
    window.addEventListener('game:language-changed', this.languageListener);
    this.events.once('shutdown', () => {
      if (this.exitListener) window.removeEventListener('game:exit-to-lobby', this.exitListener);
      if (this.useNukeListener) window.removeEventListener('game:use-nuke', this.useNukeListener);
      if (this.useSpecialListener) window.removeEventListener('game:use-special', this.useSpecialListener);
      if (this.useBonusMovesListener) window.removeEventListener('game:use-bonusmoves', this.useBonusMovesListener);
      if (this.languageListener) window.removeEventListener('game:language-changed', this.languageListener);
    });
    refreshItemBar();

    this.updateHud();
    this.armIdleTimer();
    this.startStageIntro();
  }

  private startStageIntro(): void {
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

  // "Finisher" items bought in the shop (bomb/blackHole/lightning/meteor):
  // unlike lineRow/lineCol/crossBomb/colorBomb, which promote in place as a
  // special candy, these sit in a standing inventory and are used on demand
  // mid-stage via the HUD items button (see beginUseNukeItem below), then
  // player-targeted the same way specials are placed. The blast feeds its
  // cell set into the existing resolveCascade(forcedCells) pipeline — the
  // same path specials use — so scoring, obstacle damage, cascades and
  // gravity refill all come for free instead of a parallel clear/score path.
  private forceDestroyObstaclesIn(cells: Set<string>): void {
    cells.forEach((key) => {
      const [r, c] = key.split(',').map(Number);
      const kind = this.obstacleType[r][c];
      if (kind) this.clearObstacle(r, c, GameScene.OBSTACLE_STYLE[kind].fill);
    });
  }

  private randomCell(): Cell {
    return { row: Math.floor(Math.random() * GRID_SIZE), col: Math.floor(Math.random() * GRID_SIZE) };
  }

  // Keeps a blast center at least `margin` cells from every edge so a
  // fixed-size blast (e.g. a 5x5 bomb) always lands at its full size instead
  // of getting silently clipped when the center lands near a wall — used
  // both for the random fallback and to nudge a player-tapped target that
  // landed too close to an edge.
  private randomCellAwayFromEdge(margin: number): Cell {
    const lo = Math.min(margin, GRID_SIZE - 1);
    const hi = Math.max(lo, GRID_SIZE - 1 - margin);
    const span = hi - lo + 1;
    return {
      row: lo + Math.floor(Math.random() * span),
      col: lo + Math.floor(Math.random() * span),
    };
  }

  private clampAwayFromEdge(cell: Cell, margin: number): Cell {
    const lo = Math.min(margin, GRID_SIZE - 1);
    const hi = Math.max(lo, GRID_SIZE - 1 - margin);
    return { row: Math.min(hi, Math.max(lo, cell.row)), col: Math.min(hi, Math.max(lo, cell.col)) };
  }

  private addSquareBlast(out: Set<string>, center: Cell, radius: number): void {
    for (let r = center.row - radius; r <= center.row + radius; r++) {
      for (let c = center.col - radius; c <= center.col + radius; c++) {
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) out.add(`${r},${c}`);
      }
    }
  }

  // `primary` is the cell the player tapped to aim this item (see
  // finishNukeTargetAt); omitted only for the no-target-UI edge case.
  // `centers` are the actual impact points (post edge-clamp/spread) so the
  // projectile-flight animation can fly to exactly where the blast lands.
  private buildNukeCells(type: NukeType, primary?: Cell): { cells: Set<string>; centers: Cell[] } {
    const out = new Set<string>();
    const centers: Cell[] = [];
    if (type === 'bomb') {
      // One big 5x5 crater right where the player aimed.
      const center = this.clampAwayFromEdge(primary ?? this.randomCell(), 2);
      centers.push(center);
      this.addSquareBlast(out, center, 2);
    } else if (type === 'blackHole') {
      // Pulls in ~60% of a 7x7 region around the targeted point, scattered
      // at random within it rather than a solid block — the "pulls from
      // everywhere nearby" feel, but still clearly centered on the target.
      const focus = primary ?? this.randomCell();
      centers.push(focus);
      const pool: Cell[] = [];
      for (let r = focus.row - 3; r <= focus.row + 3; r++) {
        for (let c = focus.col - 3; c <= focus.col + 3; c++) {
          if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) pool.push({ row: r, col: c });
        }
      }
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      pool.slice(0, Math.round(pool.length * 0.6)).forEach((cell) => out.add(`${cell.row},${cell.col}`));
    } else if (type === 'lightning') {
      // The targeted cell's row and column are always struck; a second
      // random row and column round it out to the usual two of each.
      const rows = new Set<number>();
      const cols = new Set<number>();
      if (primary) { rows.add(primary.row); cols.add(primary.col); centers.push(primary); }
      while (rows.size < 2) rows.add(Math.floor(Math.random() * GRID_SIZE));
      while (cols.size < 2) cols.add(Math.floor(Math.random() * GRID_SIZE));
      if (centers.length === 0) centers.push({ row: [...rows][0], col: [...cols][0] });
      rows.forEach((r) => { for (let c = 0; c < GRID_SIZE; c++) out.add(`${r},${c}`); });
      cols.forEach((c) => { for (let r = 0; r < GRID_SIZE; r++) out.add(`${r},${c}`); });
    } else {
      // Four 3x3 impacts: the first lands right on the target, the other
      // three scatter nearby (kept spread apart so none swallow another).
      const list: Cell[] = [];
      if (primary) list.push(this.clampAwayFromEdge(primary, 1));
      let guard = 0;
      while (list.length < 4 && guard < 40) {
        guard += 1;
        const candidate = this.randomCellAwayFromEdge(1);
        if (list.some((p) => Math.abs(p.row - candidate.row) + Math.abs(p.col - candidate.col) < 3)) continue;
        list.push(candidate);
      }
      while (list.length < 4) list.push(this.randomCellAwayFromEdge(1));
      list.forEach((c) => this.addSquareBlast(out, c, 1));
      centers.push(...list);
    }
    return { cells: out, centers };
  }

  // A small projectile sprite flies from `from` to `to`, trailing bursts of
  // the item's theme color, so the player sees something physically arrive
  // before it detonates — rather than the blast just appearing on tap.
  private flyProjectile(
    type: NukeType, from: { x: number; y: number }, to: { x: number; y: number },
    delay = 0, duration = 420, sizeScale = 0.55, ease = 'Cubic.easeIn',
  ): Promise<void> {
    const glowColor = Phaser.Display.Color.HexStringToColor(NUKE_THEMES[type].glow).color;
    return new Promise((resolve) => {
      this.time.delayedCall(delay, () => {
        const icon = this.add.image(from.x, from.y, nukeTextureKey(type)).setDepth(39);
        icon.setDisplaySize(ART_SIZE * sizeScale, ART_SIZE * sizeScale);
        const trail = this.time.addEvent({
          delay: 35, loop: true, callback: () => this.spawnBurst(icon.x, icon.y, glowColor),
        });
        this.tweens.add({
          targets: icon, x: to.x, y: to.y, angle: 320, duration, ease,
          onComplete: () => { trail.remove(); icon.destroy(); resolve(); },
        });
      });
    });
  }

  // A single jagged zigzag segment, redrawn fresh each flicker so repeated
  // strikes don't look like the same static shape stamped twice.
  private drawBoltSegment(
    g: Phaser.GameObjects.Graphics, x0: number, y0: number, x1: number, y1: number,
    color: number, widthPx: number, jitter: number,
  ): void {
    const segments = 8;
    g.lineStyle(widthPx, color, 1);
    g.beginPath();
    g.moveTo(x0, y0);
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      g.lineTo(x0 + (x1 - x0) * t + (Math.random() - 0.5) * jitter, y0 + (y1 - y0) * t + (Math.random() - 0.5) * jitter);
    }
    g.lineTo(x1, y1);
    g.strokePath();
  }

  // Real lightning actually falls — it strikes down from above the board
  // to the point of contact first, THEN arcs out along the row/column and
  // flickers with a trailing afterimage. The actual candy burst happens on
  // the thunderclap right after (showNukeBanner's flash/shake), not on the
  // bolt itself — this whole method is just the strike.
  private async strikeLightning(target: Cell): Promise<void> {
    const boardW = GRID_SIZE * TILE;
    const boardH = GRID_SIZE * TILE;
    const tx = this.cellX(target.col);
    const ty = this.cellY(target.row);
    const glow = Phaser.Display.Color.HexStringToColor(NUKE_THEMES.lightning.glow).color;

    // Phase 1: fall — the bolt grows down from the sky to the contact point
    // instead of just appearing, so it reads as striking down rather than
    // flashing in place. Slowed to 2s (from a snappy 260ms) to match the
    // other finisher items' appear-then-arrive timing — the bolt starts
    // drawing the instant the target tile is tapped, so the player still
    // sees it "appear immediately," it just takes 2s to reach the ground.
    await new Promise<void>((resolve) => {
      const haze = this.add.graphics().setDepth(38).setAlpha(0.6);
      const core = this.add.graphics().setDepth(39);
      const progress = { p: 0 };
      this.tweens.add({
        targets: progress, p: 1, duration: 2000, ease: 'Sine.easeIn',
        onUpdate: () => {
          const y1 = (ty + 40 * S) * progress.p;
          haze.clear();
          core.clear();
          this.drawBoltSegment(haze, tx, -40 * S, tx, y1, glow, 14 * S, 16 * S);
          this.drawBoltSegment(core, tx, -40 * S, tx, y1, 0xffffff, 5 * S, 16 * S);
        },
        onComplete: () => { haze.destroy(); core.destroy(); resolve(); },
      });
    });

    // Phase 2: contact — the strike point flashes and the row arcs out
    // from it immediately, then both lines flicker together with an
    // afterimage.
    this.cameras.main.shake(130, 0.014);
    this.spawnShockwave(tx, ty, 0xffffff);
    this.spawnBurst(tx, ty, glow);

    const flicker = (alpha: number): Promise<void> => new Promise((resolve) => {
      const haze = this.add.graphics().setDepth(38).setAlpha(0.55 * alpha);
      this.drawBoltSegment(haze, tx, 0, tx, boardH, glow, 12 * S, 22 * S);
      this.drawBoltSegment(haze, 0, ty, boardW, ty, glow, 12 * S, 22 * S);
      const core = this.add.graphics().setDepth(39).setAlpha(alpha);
      this.drawBoltSegment(core, tx, 0, tx, boardH, 0xffffff, 4 * S, 22 * S);
      this.drawBoltSegment(core, 0, ty, boardW, ty, 0xffffff, 4 * S, 22 * S);
      // The afterimage: the bolt doesn't vanish instantly, it fades out
      // leaving a faint trailing streak for a beat before the next flicker.
      this.tweens.add({
        targets: [haze, core], alpha: 0, duration: 160, delay: 50,
        onComplete: () => { haze.destroy(); core.destroy(); resolve(); },
      });
    });

    await flicker(1);
    await new Promise<void>((resolve) => this.time.delayedCall(70, resolve));
    await flicker(0.75);
    await new Promise<void>((resolve) => this.time.delayedCall(70, resolve));
    await flicker(1);
  }

  // One meteor: a long tapered flame (three layered triangles — dim red
  // outer, orange mid, bright core) stretching back from the meteor along
  // its fall direction, present from the very first frame so it reads as
  // trailing fire the whole way down rather than building up gradually.
  // It lands with its own small shockwave and shake right at impact — each
  // of the four hits its own beat — rather than everything only landing on
  // the shared end-of-sequence flash.
  private flyMeteorStreak(target: Cell, delay: number): Promise<void> {
    const tx = this.cellX(target.col);
    const ty = this.cellY(target.row);
    const fromX = tx - 300 * S;
    const fromY = ty - 300 * S;
    const dx = tx - fromX;
    const dy = ty - fromY;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    const px = -uy;
    const py = ux;
    const tailLen = 150 * S;
    const headW = ART_SIZE * 0.24;
    const glow = Phaser.Display.Color.HexStringToColor(NUKE_THEMES.meteor.glow).color;

    return new Promise((resolve) => {
      this.time.delayedCall(delay, () => {
        const icon = this.add.image(fromX, fromY, nukeTextureKey('meteor')).setDepth(39);
        icon.setDisplaySize(ART_SIZE * 0.5, ART_SIZE * 0.5);
        icon.setRotation(Math.atan2(dy, dx));

        const flame = this.add.graphics().setDepth(38);
        const drawTri = (len: number, widthFrac: number, color: number, alpha: number) => {
          const tipX = icon.x - ux * len;
          const tipY = icon.y - uy * len;
          flame.fillStyle(color, alpha);
          flame.beginPath();
          flame.moveTo(icon.x + px * headW * widthFrac, icon.y + py * headW * widthFrac);
          flame.lineTo(icon.x - px * headW * widthFrac, icon.y - py * headW * widthFrac);
          flame.lineTo(tipX, tipY);
          flame.closePath();
          flame.fillPath();
        };
        const updateFlame = () => {
          flame.clear();
          drawTri(tailLen, 1, 0xff3b1f, 0.45);
          drawTri(tailLen * 0.62, 0.7, 0xff8a3d, 0.6);
          drawTri(tailLen * 0.3, 0.35, 0xfff2b0, 0.85);
        };
        updateFlame();
        const trailTimer = this.time.addEvent({ delay: 16, loop: true, callback: updateFlame });

        this.tweens.add({
          targets: icon, x: tx, y: ty, duration: 2000, ease: 'Cubic.easeIn',
          onComplete: () => {
            trailTimer.remove();
            flame.destroy();
            icon.destroy();
            this.spawnShockwave(tx, ty, glow);
            this.spawnBurst(tx, ty, glow);
            this.cameras.main.shake(140, 0.01);
            resolve();
          },
        });
      });
    });
  }

  private async strikeMeteor(centers: Cell[]): Promise<void> {
    await Promise.all(centers.map((c, i) => this.flyMeteorStreak(c, i * 140)));
  }

  // Black hole doesn't drop or strike anything — it opens on the targeted
  // point as a spinning vortex, and every candy caught in the blast
  // visibly spirals/flies into its center (shrinking and spinning as it
  // goes) before the vortex snaps shut. The actual clear/score still runs
  // through resolveCascade right after — this just sells the "sucked in"
  // feeling first.
  private async collapseIntoBlackHole(cells: Set<string>, center: { x: number; y: number }): Promise<void> {
    const vortex = this.add.image(center.x, center.y, nukeTextureKey('blackHole')).setDepth(39).setScale(0).setAlpha(0.95);
    const spin = this.tweens.add({ targets: vortex, angle: 360, duration: 900, repeat: -1, ease: 'Linear' });

    // The vortex appears the instant the target tile is tapped, then spends
    // ~2s visibly opening/charging before it starts pulling candies in —
    // matching the other finisher items' appear-then-arrive timing instead
    // of snapping open in 320ms.
    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: vortex, scale: 1.3, duration: 1700, ease: 'Back.easeOut', onComplete: () => resolve(),
      });
    });

    const pulls = Array.from(cells).map((key) => new Promise<void>((resolve) => {
      const [r, c] = key.split(',').map(Number);
      const sprite = this.board[r][c];
      if (!sprite) { resolve(); return; }
      const baseScale = sprite.scale;
      this.tweens.add({
        targets: sprite,
        x: center.x, y: center.y, scale: baseScale * 0.08, angle: sprite.angle + 480 + Math.random() * 280,
        duration: 420 + Math.random() * 260, ease: 'Cubic.easeIn',
        onComplete: () => resolve(),
      });
    }));
    await Promise.all(pulls);

    this.cameras.main.shake(160, 0.012);
    spin.remove();
    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: vortex, scale: 0, alpha: 0, duration: 260, ease: 'Back.easeIn',
        onComplete: () => { vortex.destroy(); resolve(); },
      });
    });
  }

  // Full sequence for one targeted finisher item: fly in (per-type), then
  // the impact beat (flash/shake/zoom/banner), then the actual board clear.
  private async detonateNuke(type: NukeType, target: Cell): Promise<void> {
    const { cells, centers } = this.buildNukeCells(type, target);
    if (cells.size === 0) return;
    playSpecialActivate();

    if (type === 'blackHole') {
      const c = centers[0];
      await this.collapseIntoBlackHole(cells, { x: this.cellX(c.col), y: this.cellY(c.row) });
    } else if (type === 'lightning') {
      await this.strikeLightning(centers[0]);
    } else if (type === 'bomb') {
      // A heavy object falling, not a quick toss — but it used to spawn
      // 3 art-sizes above the board with an aggressive easeIn curve, so for
      // roughly the first half of the 2s drop it was sitting almost
      // motionless off-screen before becoming visible at all. Spawning it
      // just above the board edge with a gentler ease means it's visible
      // falling from the instant you tap, while still landing at the same
      // ~2s mark as the other finisher items.
      const c = centers[0];
      await this.flyProjectile(
        type, { x: this.cellX(c.col), y: -ART_SIZE * 0.6 }, { x: this.cellX(c.col), y: this.cellY(c.row) },
        0, 2000, 1.1, 'Quad.easeIn',
      );
    } else {
      await this.strikeMeteor(centers);
    }

    await this.showNukeBanner(type);
    this.forceDestroyObstaclesIn(cells);
    await this.resolveCascade(3, cells);
    this.updateHud();
  }

  // Paid finisher items need to feel unmistakably bigger than a normal
  // combo — a full-screen color flash + a camera zoom punch on top of the
  // usual shake-and-text beat, loud enough that it reads as "worth buying"
  // at a glance instead of blending into ordinary match feedback.
  private flashScreen(colorNum: number, peakAlpha: number, duration: number): Promise<void> {
    const flash = this.add.rectangle(
      GRID_SIZE * TILE / 2, GRID_SIZE * TILE / 2, GRID_SIZE * TILE, GRID_SIZE * TILE, colorNum, 0,
    ).setDepth(40);
    return new Promise((resolve) => {
      this.tweens.add({
        targets: flash, alpha: peakAlpha, duration: duration * 0.3, ease: 'Sine.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: flash, alpha: 0, duration: duration * 0.7, ease: 'Sine.easeIn',
            onComplete: () => { flash.destroy(); resolve(); },
          });
        },
      });
    });
  }

  private punchZoom(): void {
    const cam = this.cameras.main;
    const baseZoom = cam.zoom;
    this.tweens.add({
      targets: cam, zoom: baseZoom * 1.08, duration: 110, yoyo: true, ease: 'Sine.easeOut',
    });
  }

  private showNukeBanner(type: NukeType): Promise<void> {
    const cx = GRID_SIZE * TILE / 2;
    const cy = GRID_SIZE * TILE / 2;
    const theme = NUKE_THEMES[type];
    const colorNum = Phaser.Display.Color.HexStringToColor(theme.glow).color;

    this.cameras.main.shake(460, 0.024);
    this.punchZoom();
    const flashDone = this.flashScreen(colorNum, 0.6, 300);

    const txt = this.add.text(cx, cy, t(NUKE_LABEL_KEYS[type]), {
      fontFamily: TITLE_FONT,
      fontSize: `${34 * S}px`,
      color: theme.glow,
      stroke: '#150f26',
      strokeThickness: 7 * S,
    }).setOrigin(0.5).setDepth(41).setScale(0.2).setAlpha(0);

    const textDone = new Promise<void>((resolve) => {
      this.tweens.add({
        targets: txt, scale: 1.15, alpha: 1, duration: 150, ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: txt, scale: 1, duration: 90, ease: 'Sine.easeOut',
          });
          this.tweens.add({
            targets: txt, alpha: 0, duration: 260, delay: 340,
            onComplete: () => { txt.destroy(); resolve(); },
          });
        },
      });
    });

    return Promise.all([flashDone, textDone]).then(() => undefined);
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
    this.placementMode = 'special';
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
    const cardBg = drawPanel(this, cx, cy - 10 * S, 168 * S, 168 * S, {
      strokeAlpha: 0.9, strokeWidth: 3 * S, radius: 20 * S, depth: 36,
    }).setScale(0.4).setAlpha(0);
    const icon = this.add.image(cx, cy - 24 * S, specialTextureKey(type)).setDepth(37).setScale(0);
    icon.setDisplaySize(96 * S, 96 * S);
    const label = this.add.text(cx, cy + 92 * S, t('placement.instruction'), {
      fontFamily: TITLE_FONT,
      fontSize: `${15 * S}px`,
      color: '#ffffff',
      stroke: '#150f26',
      strokeThickness: 4 * S,
      align: 'center',
      wordWrap: { width: 150 * S },
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

  // Finisher items (bomb/lightning/meteor/blackHole) are a standing
  // inventory, not something placed before the stage starts — the player
  // taps the 🎒 items button in the HUD at any point mid-stage, which
  // dispatches 'game:use-nuke' (see ui/itemBar.ts and the listener wired in
  // create()). This reuses the same tap-to-target flow specials use
  // (showNukeTargetCard / placementActive / onCandyPointerDown), just
  // entered on demand instead of chained after the pre-stage placement.
  private beginUseNukeItem(type: NukeType): void {
    if (this.busy || this.placementActive || this.endText || this.movesRemaining <= 0) return;
    if (!useNukeItem(type)) return;
    refreshItemBar();
    this.placementMode = 'nuke';
    this.targetingNukeType = type;
    this.showNukeTargetCard();
  }

  private showNukeTargetCard(): void {
    this.placementActive = false;
    const type = this.targetingNukeType;
    if (!type) return;
    playSpecialPromote();
    const cx = GRID_SIZE * TILE / 2;
    const cy = GRID_SIZE * TILE / 2;
    const theme = NUKE_THEMES[type];
    const themeColor = Phaser.Display.Color.HexStringToColor(theme.glow).color;

    const dim = this.add.rectangle(cx, cy, GRID_SIZE * TILE, GRID_SIZE * TILE, 0x0a0618, 0.5).setDepth(35);
    const cardBg = drawPanel(this, cx, cy - 10 * S, 168 * S, 168 * S, {
      strokeColor: themeColor, strokeAlpha: 0.9, strokeWidth: 3 * S, radius: 20 * S, depth: 36,
    }).setScale(0.4).setAlpha(0);
    const icon = this.add.image(cx, cy - 24 * S, nukeTextureKey(type)).setDepth(37).setScale(0);
    icon.setDisplaySize(96 * S, 96 * S);
    const label = this.add.text(cx, cy + 92 * S, t('placement.nukeInstruction', { item: t(NUKE_LABEL_KEYS[type]) }), {
      fontFamily: TITLE_FONT,
      fontSize: `${15 * S}px`,
      color: '#ffffff',
      stroke: '#150f26',
      strokeThickness: 4 * S,
      align: 'center',
      wordWrap: { width: 150 * S },
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

  private finishNukeTargetAt(row: number, col: number): void {
    const type = this.targetingNukeType;
    if (!type) return;
    this.targetingNukeType = null;
    this.placementActive = false;
    this.busy = true;
    this.detonateNuke(type, { row, col }).then(async () => {
      // Using an item isn't a move, but clearing a big chunk of the board
      // can still finish the stage or leave no legal swap — the same
      // checks a normal match/special activation runs afterward.
      if (this.movesRemaining > 0 && !this.hasAnyMove()) {
        await this.reshuffleBoard();
      }
      await this.checkEndState();
      this.busy = false;
    });
  }

  // +3 moves is applied immediately, no targeting needed — mirrors
  // grantEventItem's instant 'bonusMove' handling.
  private beginUseBonusMoves(): void {
    if (this.busy || this.placementActive || this.endText || this.movesRemaining <= 0) return;
    if (!useBonusMovesItem()) return;
    refreshItemBar();
    this.movesRemaining += 3;
    this.updateHud();
  }

  // Shop-bought specials (lineRow/lineCol/crossBomb/colorBomb) reuse the
  // same tap-to-target flow as nuke items (see beginUseNukeItem above) —
  // placementMode 'specialItem' keeps this on-demand path distinct from the
  // pre-stage forced placement queue (placementMode 'special') that random
  // in-stage events still use, since that one ends by showing the stage's
  // "game start" banner, which would be wrong mid-stage here.
  private beginUseSpecialItem(type: SpecialType): void {
    if (this.busy || this.placementActive || this.endText || this.movesRemaining <= 0) return;
    if (!useSpecialItem(type)) return;
    refreshItemBar();
    this.placementMode = 'specialItem';
    this.targetingSpecialType = type;
    this.showSpecialTargetCard();
  }

  private showSpecialTargetCard(): void {
    this.placementActive = false;
    const type = this.targetingSpecialType;
    if (!type) return;
    playSpecialPromote();
    const cx = GRID_SIZE * TILE / 2;
    const cy = GRID_SIZE * TILE / 2;
    const theme = SPECIAL_THEMES[type];
    const themeColor = Phaser.Display.Color.HexStringToColor(theme.glow).color;

    const dim = this.add.rectangle(cx, cy, GRID_SIZE * TILE, GRID_SIZE * TILE, 0x0a0618, 0.5).setDepth(35);
    const cardBg = drawPanel(this, cx, cy - 10 * S, 168 * S, 168 * S, {
      strokeColor: themeColor, strokeAlpha: 0.9, strokeWidth: 3 * S, radius: 20 * S, depth: 36,
    }).setScale(0.4).setAlpha(0);
    const icon = this.add.image(cx, cy - 24 * S, specialTextureKey(type)).setDepth(37).setScale(0);
    icon.setDisplaySize(96 * S, 96 * S);
    const label = this.add.text(cx, cy + 92 * S, t('placement.instruction'), {
      fontFamily: TITLE_FONT,
      fontSize: `${15 * S}px`,
      color: '#ffffff',
      stroke: '#150f26',
      strokeThickness: 4 * S,
      align: 'center',
      wordWrap: { width: 150 * S },
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

  private finishSpecialTargetAt(row: number, col: number): void {
    const type = this.targetingSpecialType;
    if (!type) return;
    // Tile already holds a special — leave placementActive on (like
    // finishPlacementAt) so the player can just tap a different tile
    // instead of losing the already-consumed item to a bad target.
    if (this.specialGrid[row][col]) return;
    this.targetingSpecialType = null;
    this.placementActive = false;
    this.promoteToSpecial(row, col, type);
  }

  private showGameStartBanner(): void {
    playGameStart();
    const cx = GRID_SIZE * TILE / 2;
    const cy = GRID_SIZE * TILE / 2;
    const txt = this.add.text(cx, cy, t('game.start'), {
      fontFamily: TITLE_FONT,
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
    const cardW = GRID_SIZE * TILE - 40 * S;
    const wrapWidth = GRID_SIZE * TILE - 80 * S;
    const maxCardH = GRID_SIZE * TILE - 40 * S;

    window.dispatchEvent(new CustomEvent('game:story-open'));

    const overlay = this.add.rectangle(cx, cy, GRID_SIZE * TILE, GRID_SIZE * TILE, 0x0a0618, 0.82).setDepth(40);

    const speakerText = this.add.text(0, 0, speaker, {
      fontFamily: TITLE_FONT,
      fontSize: `${15 * S}px`,
      color: '#e8b64f',
      stroke: '#0a0618',
      strokeThickness: 4 * S,
    }).setOrigin(0.5, 0).setDepth(42);
    const subtitleText = subtitle ? this.add.text(0, 0, subtitle, {
      fontFamily: BODY_FONT,
      fontSize: `${11 * S}px`,
      fontStyle: '700',
      color: '#a898c8',
      stroke: '#0a0618',
      strokeThickness: 2 * S,
    }).setOrigin(0.5, 0).setDepth(42) : undefined;

    // Translated body text varies hugely in wrapped line count across 22
    // languages, so the body font shrinks (down to a floor) before the card
    // falls back to just growing — rather than a fixed card height that
    // either clips long translations or looks mostly-empty for short ones.
    let bodyFontPx = 16 * S;
    const bodyFloorPx = 11 * S;
    let bodyText: Phaser.GameObjects.Text;
    const makeBodyText = (fontPx: number) => this.add.text(0, 0, text, {
      fontFamily: BODY_FONT,
      fontSize: `${fontPx}px`,
      fontStyle: '700',
      color: '#f3e6c8',
      align: 'center',
      stroke: '#0a0618',
      strokeThickness: 3 * S,
      wordWrap: { width: wrapWidth },
    }).setOrigin(0.5, 0).setDepth(42);

    const gap = 10 * S;
    const topPad = 20 * S;
    const bottomPad = 20 * S;
    const btnH = 14 * S + 6 * S * 2; // fontSize + paddingY*2, matches createPillButton sizing
    const fixedH = topPad + speakerText.height + gap
      + (subtitleText ? subtitleText.height + gap : 0)
      + gap + btnH + bottomPad;

    bodyText = makeBodyText(bodyFontPx);
    while (fixedH + bodyText.height > maxCardH && bodyFontPx > bodyFloorPx) {
      bodyText.destroy();
      bodyFontPx = Math.max(bodyFloorPx, bodyFontPx - 1 * S);
      bodyText = makeBodyText(bodyFontPx);
    }

    const cardH = Math.min(maxCardH, Math.max(150 * S, fixedH + bodyText.height));
    const top = cy - cardH / 2;
    let cursor = top + topPad;
    speakerText.setPosition(cx, cursor);
    cursor += speakerText.height + gap;
    if (subtitleText) {
      subtitleText.setPosition(cx, cursor);
      cursor += subtitleText.height + gap;
    }
    bodyText.setPosition(cx, cursor);
    cursor += bodyText.height + gap;
    const btn = createPillButton(this, cx, cursor + btnH / 2, t('story.startButton'), {
      fontSize: `${14 * S}px`, bgColor: 0xe8b64f, paddingX: 14 * S, paddingY: 6 * S, depth: 42,
    });

    const cardG = drawPanel(this, cx, cy, cardW, cardH, {
      fillColor: 0x2c1f4a, radius: 18 * S, strokeWidth: 2 * S, depth: 41,
    });

    const children: Phaser.GameObjects.GameObject[] = [overlay, cardG, speakerText, bodyText, btn];
    if (subtitleText) children.push(subtitleText);
    const group = this.add.container(0, 0, children).setDepth(40);
    btn.on('pointerdown', () => {
      group.destroy(true);
      window.dispatchEvent(new CustomEvent('game:story-close'));
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

  // Three physical obstacles, each a passive overlay on top of a slot,
  // independent of whichever candy currently sits there (none of them block
  // matching that cell directly — only player-initiated swaps). Keeping them
  // tied to the fixed slot rather than to a falling sprite means gravity/
  // refill code needs no changes at all to carry obstacle state around.
  //  - ice: thaws (loses 1 HP) when a match clears one of its 4 orthogonal
  //    neighbors — the baseline, directly targetable obstacle.
  //  - chain: never thaws from a neighbor match. Only clears if a cascade
  //    happens to match its own candy directly (via candies shifting into
  //    alignment after a refill elsewhere) — the player can't aim for this,
  //    making chain meaningfully harsher than ice despite sharing its HP pool.
  //  - mold: thaws like ice, but spreads to one adjacent open cell every few
  //    moves if left alone, so ignoring it compounds the problem.
  private readonly MOLD_SPREAD_CHANCE = 0.35;
  private readonly MOLD_SPREAD_EVERY_MOVES = 3;
  private readonly OBSTACLE_CAP = Math.floor(GRID_SIZE * GRID_SIZE * 0.4);

  private setupObstacles(): void {
    this.obstacleType = Array.from({ length: GRID_SIZE }, () => new Array<ObstacleKind | null>(GRID_SIZE).fill(null));
    this.obstacleGridHp = Array.from({ length: GRID_SIZE }, () => new Array(GRID_SIZE).fill(0));
    this.obstacleOverlays = Array.from({ length: GRID_SIZE }, () => new Array<Phaser.GameObjects.Container | null>(GRID_SIZE).fill(null));
    this.obstacleTotal = 0;

    const total = this.iceCount + this.chainCount + this.moldCount;
    if (total <= 0) return;

    const cells: Cell[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) cells.push({ row: r, col: c });
    }
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    const plan: ObstacleKind[] = [
      ...Array<ObstacleKind>(this.iceCount).fill('ice'),
      ...Array<ObstacleKind>(this.chainCount).fill('chain'),
      ...Array<ObstacleKind>(this.moldCount).fill('mold'),
    ];
    plan.forEach((kind, i) => {
      const { row, col } = cells[i];
      this.placeObstacle(row, col, kind, this.obstacleHp);
    });
  }

  private placeObstacle(row: number, col: number, kind: ObstacleKind, hp: number): void {
    this.obstacleType[row][col] = kind;
    this.obstacleGridHp[row][col] = hp;
    this.obstacleOverlays[row][col] = this.createObstacleOverlay(row, col, kind, hp);
    this.obstacleTotal += 1;
  }

  private clearObstacle(row: number, col: number, burstColor: number): void {
    this.obstacleType[row][col] = null;
    this.obstacleGridHp[row][col] = 0;
    this.obstacleOverlays[row][col]?.destroy();
    this.obstacleOverlays[row][col] = null;
    this.obstacleTotal -= 1;
    this.spawnBurst(this.cellX(col), this.cellY(row), burstColor);
  }

  private static readonly OBSTACLE_STYLE: Record<ObstacleKind, { fill: number; stroke: string; icon: string; color: string }> = {
    ice: { fill: 0xbfe8ff, stroke: '#e8f7ff', icon: '❄', color: '#e8f7ff' },
    chain: { fill: 0x8a7a63, stroke: '#d8c9a8', icon: '⛓', color: '#d8c9a8' },
    mold: { fill: 0x3a8f4a, stroke: '#9df0ac', icon: '🍄', color: '#c8f7d0' },
  };

  private createObstacleOverlay(row: number, col: number, kind: ObstacleKind, hp: number): Phaser.GameObjects.Container {
    const style = GameScene.OBSTACLE_STYLE[kind];
    const size = CANDY_DISPLAY;
    const g = this.add.graphics();
    g.fillStyle(style.fill, 0.22);
    g.fillRoundedRect(-size / 2, -size / 2, size, size, 12 * S);
    g.lineStyle(2.5 * S, Phaser.Display.Color.HexStringToColor(style.stroke).color, 0.85);
    g.strokeRoundedRect(-size / 2, -size / 2, size, size, 12 * S);
    const icon = this.add.text(0, -4 * S, style.icon, {
      fontSize: `${16 * S}px`, color: style.color,
    }).setOrigin(0.5);
    const pips = this.add.text(0, 15 * S, '●'.repeat(hp), {
      fontFamily: TITLE_FONT, fontSize: `${8 * S}px`, color: style.color,
    }).setOrigin(0.5);
    return this.add.container(this.cellX(col), this.cellY(row), [g, icon, pips]).setDepth(8);
  }

  // Called with every cell a match just cleared (including ones consumed by
  // a special-item detonation). Ice/mold thaw when one of their orthogonal
  // neighbors is in this list; chain only thaws if it's in the list itself.
  // Each obstacle thaws at most once per cascade step even if multiple
  // cleared cells touch it, so a big combo doesn't insta-clear one.
  private damageObstacles(cells: Cell[]): void {
    const damaged = new Set<string>();

    const damageAt = (row: number, col: number) => {
      const key = `${row},${col}`;
      if (damaged.has(key)) return;
      const kind = this.obstacleType[row][col];
      if (!kind || this.obstacleGridHp[row][col] <= 0) return;
      damaged.add(key);
      this.obstacleGridHp[row][col] -= 1;
      this.obstacleOverlays[row][col]?.destroy();
      this.obstacleOverlays[row][col] = null;
      if (this.obstacleGridHp[row][col] > 0) {
        this.obstacleOverlays[row][col] = this.createObstacleOverlay(row, col, kind, this.obstacleGridHp[row][col]);
      } else {
        this.clearObstacle(row, col, GameScene.OBSTACLE_STYLE[kind].fill);
      }
    };

    cells.forEach(({ row, col }) => {
      const kindHere = this.obstacleType[row][col];
      if (kindHere === 'chain') damageAt(row, col);

      const neighbors: Cell[] = [
        { row: row - 1, col }, { row: row + 1, col }, { row, col: col - 1 }, { row, col: col + 1 },
      ];
      neighbors.forEach(({ row: nr, col: nc }) => {
        if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) return;
        const kind = this.obstacleType[nr][nc];
        if (kind === 'ice' || kind === 'mold') damageAt(nr, nc);
      });
    });
  }

  // Mold's whole identity is that ignoring it makes things worse: every few
  // player moves, each surviving mold tile has a chance to spread into one
  // adjacent open cell (one with a candy and no obstacle of its own yet).
  // Capped so a run of bad luck can't fill the entire board with obstacles.
  private trySpreadMold(): void {
    if (this.obstacleTotal >= this.OBSTACLE_CAP) return;
    const moldCells: Cell[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.obstacleType[r][c] === 'mold') moldCells.push({ row: r, col: c });
      }
    }
    moldCells.forEach(({ row, col }) => {
      if (this.obstacleTotal >= this.OBSTACLE_CAP) return;
      if (Math.random() >= this.MOLD_SPREAD_CHANCE) return;
      const neighbors: Cell[] = [
        { row: row - 1, col }, { row: row + 1, col }, { row, col: col - 1 }, { row, col: col + 1 },
      ];
      const open = neighbors.filter(
        ({ row: nr, col: nc }) => nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE
          && this.board[nr][nc] && !this.obstacleType[nr][nc],
      );
      if (open.length === 0) return;
      const target = open[Math.floor(Math.random() * open.length)];
      this.placeObstacle(target.row, target.col, 'mold', this.obstacleHp);
    });
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
      if (this.placementMode === 'nuke') {
        this.finishNukeTargetAt(row, col);
      } else if (this.placementMode === 'specialItem') {
        this.finishSpecialTargetAt(row, col);
      } else {
        this.finishPlacementAt(row, col);
      }
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

  private isLocked(row: number, col: number): boolean {
    return !!this.obstacleType[row]?.[col];
  }

  private hasAnyMove(): boolean {
    const hasSpecial = this.specialGrid.some((row) => row.some((v) => v !== null));
    if (hasSpecial) return true;
    return !!findHintSwap(this.typeGrid, GRID_SIZE, (r, c) => this.isLocked(r, c));
  }

  private showHint(): void {
    if (this.busy) return;
    this.clearHint();

    const hasSpecial = this.specialGrid.some((row) => row.some((v) => v !== null));
    const hint = findHintSwap(this.typeGrid, GRID_SIZE, (r, c) => this.isLocked(r, c));

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
        fontFamily: TITLE_FONT,
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

      this.typeGrid = buildInitialTypeGrid(GRID_SIZE, this.colorCount);
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
    // Any obstacle-covered tile (ice/chain/mold) can never be swapped by the
    // player directly, in either direction, no matter how it's initiated
    // (tap-to-select or swipe) — each kind has its own way of clearing (see
    // damageObstacles), but none of them is "the player moves it out of the way".
    if (this.isLocked(a.row, a.col) || this.isLocked(b.row, b.col)) {
      playInvalidSwap();
      return;
    }
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
      if (this.movesUsed % this.MOLD_SPREAD_EVERY_MOVES === 0) this.trySpreadMold();

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
      if (this.movesUsed % this.MOLD_SPREAD_EVERY_MOVES === 0) this.trySpreadMold();

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
    this.damageObstacles(cellsToClear);

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
      fontFamily: TITLE_FONT,
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
      fontFamily: TITLE_FONT,
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
        const type = randomType(this.colorCount);
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
      const baseReward = 8;
      const overAchieved = this.score >= this.targetScore * 2;
      const reward = overAchieved ? 12 : baseReward;
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
    const panelH = 190 * S;

    const overlay = this.add.rectangle(cx, cy, GRID_SIZE * TILE, GRID_SIZE * TILE, 0x0a0618, 0.72).setDepth(30);
    const panel = drawPanel(this, cx, cy, GRID_SIZE * TILE - 56 * S, panelH, {
      fillColor: 0x241a3f, strokeColor: 0xff8080, strokeAlpha: 0.9,
      radius: 18 * S, strokeWidth: 2 * S, depth: 31,
    });

    this.endText = this.add.text(cx, cy - panelH / 2 + 44 * S, t('outOfMoves.title'), {
      fontFamily: TITLE_FONT,
      fontSize: `${20 * S}px`,
      color: '#ff8080',
      stroke: '#150f26',
      strokeThickness: 5 * S,
    }).setOrigin(0.5).setDepth(32);

    const adBtn = createPillButton(this, cx, cy - 6 * S, t('outOfMoves.watchAd'), {
      fontSize: `${15 * S}px`, bgColor: 0xe8b64f, paddingX: 16 * S, paddingY: 8 * S, depth: 32,
    });

    const leaveBtn = createPillButton(this, cx, cy + panelH / 2 - 36 * S, t('outOfMoves.leave'), {
      fontFamily: BODY_FONT, fontSize: `${14 * S}px`, textColor: '#c9b8e0',
      bgColor: 0x3a2a5c, paddingX: 14 * S, paddingY: 7 * S, depth: 32,
    });

    const group = this.add.container(0, 0, [overlay, panel, this.endText, adBtn, leaveBtn]).setDepth(30);
    // Fade only, not scale: every child keeps its absolute grid coordinate
    // (so the overlay still covers the whole board, and the panel its own
    // bounds) rather than a container-local one, so scaling the container
    // from its (0,0) origin would visibly shift the dialog toward the
    // top-left corner instead of growing from its own center.
    group.setAlpha(0);
    this.tweens.add({ targets: group, alpha: 1, duration: 180, ease: 'Sine.easeOut' });

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
    if (this.movesUsed === 0) {
      this.scene.start('LobbyScene');
      return;
    }
    this.showConfirmDialog(
      t('settings.exitConfirm'),
      t('common.leave'),
      t('common.cancel'),
      () => {
        spendHeart();
        this.scene.start('LobbyScene');
      },
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
      fontFamily: BODY_FONT, fontSize: `${15 * S}px`, fontStyle: '700', color: '#f3e6c8', align: 'center',
      stroke: '#0a0618', strokeThickness: 3 * S,
      wordWrap: { width: GRID_SIZE * TILE - 120 * S },
    }).setOrigin(0.5).setDepth(59);

    const yesBtn = createPillButton(this, cx - 55 * S, cy + 40 * S, yesLabel, {
      fontSize: `${14 * S}px`, bgColor: 0xe8b64f, paddingX: 16 * S, paddingY: 8 * S, depth: 59,
    });
    const noBtn = createPillButton(this, cx + 55 * S, cy + 40 * S, noLabel, {
      fontFamily: BODY_FONT, fontSize: `${13 * S}px`, textColor: '#f3e6c8',
      bgColor: 0x3a2a5c, paddingX: 16 * S, paddingY: 8 * S, depth: 59,
    });

    const group = this.add.container(0, 0, [overlay, panelG, text, yesBtn, noBtn]).setDepth(58);
    yesBtn.on('pointerdown', () => { group.destroy(true); onConfirm(); });
    noBtn.on('pointerdown', () => group.destroy(true));
  }

  private playMockAdForMoves(): void {
    const cx = GRID_SIZE * TILE / 2;
    const cy = GRID_SIZE * TILE / 2;
    playMockAd(this, cx, cy, () => {
      this.movesRemaining += 10;
      this.updateHud();
      this.armIdleTimer();
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
    const panelH = actionLabel ? 220 * S : 170 * S;

    // A dim overlay with a floating text was the only moment in the game
    // left without the gem-panel treatment used everywhere else (shop,
    // confirm dialogs, placement cards) — the single biggest beat in a run
    // (clearing or failing a stage) deserves the same framing, not less.
    const overlay = this.add.rectangle(cx, cy, GRID_SIZE * TILE, GRID_SIZE * TILE, 0x0a0618, 0.72).setDepth(30);
    const panel = drawPanel(this, cx, cy, GRID_SIZE * TILE - 56 * S, panelH, {
      fillColor: 0x241a3f, strokeColor: Phaser.Display.Color.ValueToColor(color).color, strokeAlpha: 0.9,
      radius: 18 * S, strokeWidth: 2 * S, depth: 31,
    });

    this.endText = this.add.text(cx, cy - panelH / 2 + 44 * S, msg, {
      fontFamily: TITLE_FONT,
      fontSize: `${20 * S}px`,
      color,
      stroke: '#150f26',
      strokeThickness: 5 * S,
      align: 'center',
      wordWrap: { width: GRID_SIZE * TILE - 96 * S },
      lineSpacing: 6 * S,
    }).setOrigin(0.5).setDepth(32);

    const children: Phaser.GameObjects.GameObject[] = [overlay, panel, this.endText];

    if (actionLabel) {
      const btn = createPillButton(this, cx, cy + 18 * S, actionLabel, {
        fontSize: `${16 * S}px`, bgColor: 0xe8b64f, paddingX: 16 * S, paddingY: 8 * S, depth: 32,
      });
      if (onAction) {
        btn.on('pointerdown', onAction);
      } else {
        // The final stage (1000/1000) has no "next stage" to advance to, so
        // this becomes a label rather than a button — dim it so it doesn't
        // read as a dead, still-clickable-looking gold pill.
        btn.disableInteractive();
        btn.setAlpha(0.6);
      }
      children.push(btn);
    }

    const lobbyBtn = createPillButton(this, cx, cy + panelH / 2 - 36 * S, t('endBanner.backToLobby'), {
      fontFamily: BODY_FONT, fontSize: `${14 * S}px`, textColor: '#c9b8e0',
      bgColor: 0x3a2a5c, paddingX: 14 * S, paddingY: 6 * S, depth: 32,
    });
    lobbyBtn.on('pointerdown', () => this.scene.start('LobbyScene'));
    children.push(lobbyBtn);

    const group = this.add.container(0, 0, children).setDepth(30);
    // Fade only — see the matching comment in showOutOfMovesOptions for why
    // scaling this container isn't safe (children keep absolute coordinates).
    group.setAlpha(0);
    this.tweens.add({ targets: group, alpha: 1, duration: 180, ease: 'Sine.easeOut' });
  }
}
