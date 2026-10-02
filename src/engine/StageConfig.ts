import { SpecialArtType } from '../art/specialArt';
import { CANDY_TYPE_COUNT } from '../config/GameConfig';

export const TOTAL_STAGES = 1000;

export interface StageConfig {
  stage: number;
  targetScore: number;
  movesLimit: number;
  gravityFlipInterval: number;
  // Difficulty variety beyond "bigger numbers": fewer colors early on (an
  // easier board to read), then locked/icy tiles layered in from floor 4
  // onward as a second, independent axis of challenge.
  colorCount: number;
  lockCount: number;
  lockHp: number;
}

export function getFloor(stage: number): number {
  return Math.ceil(stage / 10);
}

export function getStageConfig(stage: number): StageConfig {
  const s = Math.max(1, Math.min(TOTAL_STAGES, stage));
  const floor = getFloor(s);

  const targetScore = 550 + (s - 1) * 50 + Math.floor((s - 1) / 25) * 90;
  const movesLimit = 20 + Math.floor((s - 1) / 10) * 2;
  const gravityFlipInterval = Math.max(3, 6 - Math.floor((s - 1) / 200));

  // Ease new players in with one fewer ingredient color on floor 1, then the
  // full palette from floor 2 on — a short onboarding nudge, not a permanent
  // cap. (Floor 1 originally dropped two colors; that read as too easy.)
  const colorCount = floor === 1 ? CANDY_TYPE_COUNT - 1 : CANDY_TYPE_COUNT;

  // Locked (icy) tiles: inert overlays that don't block swaps or matches on
  // their own cell, but only thaw when a match clears a neighboring cell —
  // a second difficulty axis that doesn't touch target score or move count.
  const lockCount = floor < 4 ? 0 : Math.min(4, Math.floor(floor / 10) + 1);
  const lockHp = floor >= 50 ? 2 : 1;

  return {
    stage: s, targetScore, movesLimit, gravityFlipInterval, colorCount, lockCount, lockHp,
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
