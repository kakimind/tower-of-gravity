import { TOTAL_STAGES } from './StageConfig';
import type { SpecialArtType } from '../art/specialArt';

const KEY = 'towerGravityProgress';

export type SpecialCounts = Record<SpecialArtType, number>;

const EMPTY_SPECIAL_COUNTS: SpecialCounts = {
  lineRow: 0, lineCol: 0, crossBomb: 0, colorBomb: 0,
};

interface ProgressData {
  unlocked: number;
  current: number;
  currency: number;
  bonusMovesOwned: number;
  specialOwned: SpecialCounts;
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
        ? { ...DEFAULT_DATA, ...parsed, specialOwned: { ...EMPTY_SPECIAL_COUNTS, ...parsed.specialOwned } }
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

export interface Boosts {
  bonusMovesOwned: number;
  specialOwned: SpecialCounts;
}

export function getBoosts(): Boosts {
  const data = load();
  return { bonusMovesOwned: data.bonusMovesOwned, specialOwned: { ...data.specialOwned } };
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

export function consumeBoosts(): Boosts {
  const data = load();
  const used = { bonusMovesOwned: data.bonusMovesOwned, specialOwned: { ...data.specialOwned } };
  data.bonusMovesOwned = 0;
  data.specialOwned = { ...EMPTY_SPECIAL_COUNTS };
  save(data);
  return used;
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
