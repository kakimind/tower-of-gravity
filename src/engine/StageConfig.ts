export const TOTAL_STAGES = 1000;

export interface StageConfig {
  stage: number;
  targetScore: number;
  movesLimit: number;
  gravityFlipInterval: number;
}

export function getStageConfig(stage: number): StageConfig {
  const s = Math.max(1, Math.min(TOTAL_STAGES, stage));

  const targetScore = 550 + (s - 1) * 50 + Math.floor((s - 1) / 25) * 90;
  const movesLimit = 20 + Math.floor((s - 1) / 10) * 2;
  const gravityFlipInterval = Math.max(3, 6 - Math.floor((s - 1) / 200));

  return { stage: s, targetScore, movesLimit, gravityFlipInterval };
}
