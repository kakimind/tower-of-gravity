import { CANDY_TYPE_COUNT } from '../config/GameConfig';

export function randomType(): number {
  return Math.floor(Math.random() * CANDY_TYPE_COUNT);
}

function wouldMatchAt(grid: number[][], r: number, c: number, type: number): boolean {
  if (c >= 2 && grid[r][c - 1] === type && grid[r][c - 2] === type) return true;
  if (r >= 2 && grid[r - 1][c] === type && grid[r - 2][c] === type) return true;
  return false;
}

export function buildInitialTypeGrid(size: number): number[][] {
  const grid: number[][] = Array.from({ length: size }, () => new Array(size).fill(-1));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      let type = randomType();
      let guard = 0;
      while (wouldMatchAt(grid, r, c, type) && guard < 50) {
        type = randomType();
        guard++;
      }
      grid[r][c] = type;
    }
  }
  return grid;
}

export function findMatchedCells(typeGrid: number[][], size: number): Set<string> {
  const matched = new Set<string>();

  for (let r = 0; r < size; r++) {
    let runStart = 0;
    for (let c = 1; c <= size; c++) {
      const prevType = typeGrid[r][c - 1];
      const curType = c < size ? typeGrid[r][c] : -2;
      if (curType !== prevType) {
        if (c - runStart >= 3 && prevType !== -1) {
          for (let k = runStart; k < c; k++) matched.add(`${r},${k}`);
        }
        runStart = c;
      }
    }
  }

  for (let c = 0; c < size; c++) {
    let runStart = 0;
    for (let r = 1; r <= size; r++) {
      const prevType = typeGrid[r - 1][c];
      const curType = r < size ? typeGrid[r][c] : -2;
      if (curType !== prevType) {
        if (r - runStart >= 3 && prevType !== -1) {
          for (let k = runStart; k < r; k++) matched.add(`${k},${c}`);
        }
        runStart = r;
      }
    }
  }

  return matched;
}

export function isAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
  const dr = Math.abs(r1 - r2);
  const dc = Math.abs(c1 - c2);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

export interface HintSwap {
  a: { row: number; col: number };
  b: { row: number; col: number };
}

export function findHintSwap(typeGrid: number[][], size: number): HintSwap | null {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const neighbors: [number, number][] = [[r, c + 1], [r + 1, c]];
      for (const [r2, c2] of neighbors) {
        if (r2 >= size || c2 >= size) continue;
        const clone = typeGrid.map((row) => row.slice());
        const tmp = clone[r][c];
        clone[r][c] = clone[r2][c2];
        clone[r2][c2] = tmp;
        if (findMatchedCells(clone, size).size > 0) {
          return { a: { row: r, col: c }, b: { row: r2, col: c2 } };
        }
      }
    }
  }
  return null;
}

export interface RunGroup {
  cells: { row: number; col: number }[];
  axis: 'row' | 'col';
}

export function findLongRuns(typeGrid: number[][], size: number, minLen = 4): RunGroup[] {
  const runs: RunGroup[] = [];

  for (let r = 0; r < size; r++) {
    let runStart = 0;
    for (let c = 1; c <= size; c++) {
      const prevType = typeGrid[r][c - 1];
      const curType = c < size ? typeGrid[r][c] : -2;
      if (curType !== prevType) {
        if (c - runStart >= minLen && prevType !== -1) {
          const cells = [];
          for (let k = runStart; k < c; k++) cells.push({ row: r, col: k });
          runs.push({ cells, axis: 'row' });
        }
        runStart = c;
      }
    }
  }

  for (let c = 0; c < size; c++) {
    let runStart = 0;
    for (let r = 1; r <= size; r++) {
      const prevType = typeGrid[r - 1][c];
      const curType = r < size ? typeGrid[r][c] : -2;
      if (curType !== prevType) {
        if (r - runStart >= minLen && prevType !== -1) {
          const cells = [];
          for (let k = runStart; k < r; k++) cells.push({ row: k, col: c });
          runs.push({ cells, axis: 'col' });
        }
        runStart = r;
      }
    }
  }

  return runs;
}
