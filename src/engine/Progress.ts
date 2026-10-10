import { TOTAL_STAGES } from './StageConfig';
import type { SpecialArtType } from '../art/specialArt';
import type { NukeType } from '../art/nukeArt';

const KEY = 'towerGravityProgress';

export type SpecialCounts = Record<SpecialArtType, number>;
export type NukeCounts = Record<NukeType, number>;

const EMPTY_SPECIAL_COUNTS: SpecialCounts = {
  lineRow: 0, lineCol: 0, crossBomb: 0, colorBomb: 0,
};

const EMPTY_NUKE_COUNTS: NukeCounts = {
  bomb: 0, blackHole: 0, lightning: 0, meteor: 0,
};

interface ProgressData {
  unlocked: number;
  current: number;
  currency: number;
  bonusMovesOwned: number;
  specialOwned: SpecialCounts;
  nukeOwned: NukeCounts;
  hearts: number;
  heartRegenSince: number;
}

export const HEART_MAX = 5;
export const HEART_REGEN_MS = 15 * 60 * 1000;

const DEFAULT_DATA: ProgressData = {
  unlocked: 1,
  current: 1,
  currency: 0,
  bonusMovesOwned: 0,
  specialOwned: { ...EMPTY_SPECIAL_COUNTS },
  nukeOwned: { ...EMPTY_NUKE_COUNTS },
  hearts: HEART_MAX,
  heartRegenSince: 0,
};

function applyHeartRegen(data: ProgressData): boolean {
  if (data.hearts >= HEART_MAX) {
    if (data.heartRegenSince !== 0) {
      data.heartRegenSince = 0;
      return true;
    }
    return false;
  }
  if (data.heartRegenSince === 0) {
    data.heartRegenSince = Date.now();
    return true;
  }
  const elapsed = Date.now() - data.heartRegenSince;
  const gained = Math.floor(elapsed / HEART_REGEN_MS);
  if (gained <= 0) return false;
  data.hearts = Math.min(HEART_MAX, data.hearts + gained);
  data.heartRegenSince = data.hearts >= HEART_MAX ? 0 : data.heartRegenSince + gained * HEART_REGEN_MS;
  return true;
}

function load(): ProgressData {
  let data: ProgressData;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ProgressData>;
      data = (parsed.unlocked ?? 0) >= 1 && (parsed.current ?? 0) >= 1
        ? {
          ...DEFAULT_DATA,
          ...parsed,
          specialOwned: { ...EMPTY_SPECIAL_COUNTS, ...parsed.specialOwned },
          nukeOwned: { ...EMPTY_NUKE_COUNTS, ...parsed.nukeOwned },
        }
        : { ...DEFAULT_DATA };
    } else {
      data = { ...DEFAULT_DATA };
    }
  } catch {
    data = { ...DEFAULT_DATA };
  }
  if (applyHeartRegen(data)) save(data);
  return data;
}

function save(data: ProgressData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage unavailable — progress just does not persist
  }
}

export function getCurrentStage(): number {
  return load().current;
}

export function getUnlockedStage(): number {
  return load().unlocked;
}

export function setCurrentStage(stage: number): void {
  const data = load();
  data.current = Math.max(1, Math.min(TOTAL_STAGES, stage));
  save(data);
}

export function completeStage(stage: number): void {
  const data = load();
  data.unlocked = Math.max(data.unlocked, Math.min(TOTAL_STAGES, stage + 1));
  save(data);
}

export function getCurrency(): number {
  return load().currency;
}

export function addCurrency(amount: number): number {
  const data = load();
  data.currency += amount;
  save(data);
  return data.currency;
}

export function trySpendCurrency(amount: number): boolean {
  const data = load();
  if (data.currency < amount) return false;
  data.currency -= amount;
  save(data);
  return true;
}

// Every shop-bought item (bonus-move, hand-placed special, and finisher nuke)
// is a standing inventory the player uses on demand mid-stage via the HUD
// item bag — none of these are reset or auto-applied at stage start, so
// buying one and not using it just carries it over to the next stage.
export function getNukeInventory(): NukeCounts {
  return { ...load().nukeOwned };
}

export function useNukeItem(type: NukeType): boolean {
  const data = load();
  if (data.nukeOwned[type] <= 0) return false;
  data.nukeOwned[type] -= 1;
  save(data);
  return true;
}

export function getBonusMovesInventory(): number {
  return load().bonusMovesOwned;
}

export function useBonusMovesItem(): boolean {
  const data = load();
  if (data.bonusMovesOwned <= 0) return false;
  data.bonusMovesOwned -= 1;
  save(data);
  return true;
}

export function getSpecialInventory(): SpecialCounts {
  return { ...load().specialOwned };
}

export function useSpecialItem(type: SpecialArtType): boolean {
  const data = load();
  if (data.specialOwned[type] <= 0) return false;
  data.specialOwned[type] -= 1;
  save(data);
  return true;
}

export function addBonusMovesBoost(): void {
  const data = load();
  data.bonusMovesOwned += 1;
  save(data);
}

export function addSpecialBoost(type: SpecialArtType): void {
  const data = load();
  data.specialOwned[type] += 1;
  save(data);
}

export function addNukeBoost(type: NukeType): void {
  const data = load();
  data.nukeOwned[type] += 1;
  save(data);
}

export function getHearts(): number {
  return load().hearts;
}

export function getMsUntilNextHeart(): number {
  const data = load();
  if (data.hearts >= HEART_MAX) return 0;
  return Math.max(0, HEART_REGEN_MS - (Date.now() - data.heartRegenSince));
}

export function spendHeart(): number {
  const data = load();
  if (data.hearts > 0) {
    data.hearts -= 1;
    if (data.heartRegenSince === 0) data.heartRegenSince = Date.now();
    save(data);
  }
  return data.hearts;
}

export function addHearts(amount: number): number {
  const data = load();
  data.hearts = Math.min(HEART_MAX, data.hearts + amount);
  if (data.hearts >= HEART_MAX) data.heartRegenSince = 0;
  save(data);
  return data.hearts;
}
