import { SpecialArtType } from '../art/specialArt';
import { CANDY_TYPE_COUNT } from '../config/GameConfig';

export const TOTAL_STAGES = 1000;

export type ObstacleKind = 'ice' | 'chain' | 'mold';

export interface StageConfig {
  stage: number;
  targetScore: number;
  movesLimit: number;
  gravityFlipInterval: number;
  // Difficulty variety beyond "bigger numbers": physical obstacles layered
  // in from floor 4 onward as an independent axis of challenge, split
  // across three kinds (see GameScene's setupObstacles) so difficulty can
  // be distributed across several easier-to-tune knobs instead of one.
  colorCount: number;
  iceCount: number;
  chainCount: number;
  moldCount: number;
  obstacleHp: number;
}

export function getFloor(stage: number): number {
  return Math.ceil(stage / 10);
}

export function getStageConfig(stage: number): StageConfig {
  const s = Math.max(1, Math.min(TOTAL_STAGES, stage));
  const floor = getFloor(s);

  // Target score used to grow by a flat 50/stage forever, which compounded
  // into absurd totals late-game (stage 950 wanted 51,330 points against a
  // 207-move limit — a single stage that could eat an entire play session).
  // Score grinding isn't meant to be the primary difficulty driver at all:
  // it now climbs gently across nearly the whole game, only reaching its
  // 5000 ceiling at stage 950 (the last 50 stages hold flat) — difficulty
  // before that is carried by lock tiles and gravity-flip frequency instead.
  const targetScore = Math.round(550 + Math.min(s - 1, 949) * (4450 / 949));

  // Move limit used to grow without bound too (218 moves by stage 1000) —
  // capped so a stage stays a few-minute puzzle instead of a marathon.
  const movesLimit = Math.min(40, 20 + Math.floor((s - 1) / 15) * 2);

  const gravityFlipInterval = Math.max(3, 6 - Math.floor((s - 1) / 200));

  // Long three-step ramp: 5 colors for most of the game, 6th unlocks at
  // stage 200, 7th (the full palette) unlocks at stage 500 — color variety
  // stays a late-game reveal rather than something exhausted in the first
  // couple of floors.
  const colorCount = s >= 500 ? CANDY_TYPE_COUNT : s >= 200 ? Math.min(CANDY_TYPE_COUNT, 6) : Math.min(CANDY_TYPE_COUNT, 5);

  // Physical obstacles are the actual difficulty driver now that target
  // score only ramps up to its cap at stage 950 — total density spreads
  // across nearly the same range (floor 4 through floor ~94) instead of
  // maxing out by floor 34, so the board keeps getting physically harder
  // for as long as the score curve is still climbing.
  const totalObstacles = floor < 4 ? 0 : Math.min(14, Math.round((floor - 4) * (14 / 90)));
  const obstacleHp = floor < 30 ? 1 : floor < 60 ? 2 : floor < 90 ? 3 : 4;

  // Three kinds, introduced one at a time as the board's capacity for
  // obstacles grows, so each kind gets its own "this is new" moment instead
  // of all scaling together from floor 4:
  //  - ice: thaws when a match clears one of its orthogonal neighbors —
  //    the baseline obstacle, present from floor 4.
  //  - chain: can never be swapped and never thaws from a neighbor match —
  //    only clears if a cascade happens to match its own candy directly,
  //    which the player can't engineer on purpose. Introduced floor 20.
  //  - mold: thaws like ice, but spreads to an adjacent open cell every
  //    few moves if left alone — a creeping threat that punishes ignoring
  //    it. Introduced floor 50, and kept rare even late-game.
  const moldCount = floor < 50 ? 0 : Math.min(3, 1 + Math.floor((floor - 50) / 15));
  const afterMold = totalObstacles - moldCount;
  const chainCount = floor < 20 ? 0 : Math.min(afterMold, Math.ceil(afterMold * 0.4));
  const iceCount = afterMold - chainCount;

  return {
    stage: s, targetScore, movesLimit, gravityFlipInterval, colorCount, iceCount, chainCount, moldCount, obstacleHp,
  };
}

// Special items aren't all available from floor 1 — crossBomb and colorBomb
// unlock later so the shop has something new to reveal as players climb,
// instead of showing the full roster (and its full price list) immediately.
export const SPECIAL_UNLOCK_FLOOR: Record<SpecialArtType, number> = {
  lineRow: 1,
  lineCol: 1,
  crossBomb: 3,
  colorBomb: 8,
};

export function isSpecialUnlocked(type: SpecialArtType, unlockedStage: number): boolean {
  return getFloor(unlockedStage) >= SPECIAL_UNLOCK_FLOOR[type];
}
