/* ============================================================
 * endlessModeData.ts
 * 무한 모드 — 설정 상수 및 localStorage 저장/로드
 * ============================================================ */

import type { ShopItemId } from "./shopData";
import type { TileData }   from "./gameUtils";

/* ── 난이도 타입 ───────────────────────────────────────────── */
export type EndlessDifficulty = "easy" | "normal" | "hard";

/* ── 난이도별 설정 ─────────────────────────────────────────── */
export interface EndlessConfig {
  difficulty:   EndlessDifficulty;
  boardSize:    4 | 5 | 6;
  goals:        [number, number, number];       // 1~3단계 목표 타일
  goldRewards:  [number, number, number];       // 1~3단계 골드
  itemPool:     { itemId: ShopItemId; weight: number }[];
}

export const ENDLESS_CONFIGS: Record<EndlessDifficulty, EndlessConfig> = {
  easy: {
    difficulty:  "easy",
    boardSize:   4,
    goals:       [2048, 4096, 8192],
    goldRewards: [30, 60, 120],
    itemPool: [
      { itemId: "undo",        weight: 70 },
      { itemId: "remove_tile", weight: 20 },
      { itemId: "board_clean", weight: 10 },
    ],
  },
  normal: {
    difficulty:  "normal",
    boardSize:   5,
    goals:       [4096, 8192, 16384],
    goldRewards: [60, 120, 240],
    itemPool: [
      { itemId: "undo",        weight: 30 },
      { itemId: "remove_tile", weight: 50 },
      { itemId: "board_clean", weight: 20 },
    ],
  },
  hard: {
    difficulty:  "hard",
    boardSize:   6,
    goals:       [8192, 16384, 32768],
    goldRewards: [100, 200, 400],
    itemPool: [
      { itemId: "undo",        weight: 10 },
      { itemId: "remove_tile", weight: 30 },
      { itemId: "board_clean", weight: 60 },
    ],
  },
};

/* ── 저장 데이터 구조 ──────────────────────────────────────── */
export interface EndlessSaveData {
  difficulty:    EndlessDifficulty;
  board:         (TileData | null)[][];
  activeTiles:   Record<string, TileData>;
  score:         number;
  claimedPhases: number[];                   // 보상 수령한 단계 [1,2,3]
}

const SAVE_KEY = "plant2048_endless_save";

export function loadEndlessSave(): EndlessSaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EndlessSaveData;
  } catch {
    return null;
  }
}

export function saveEndlessState(data: EndlessSaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* localStorage 쓰기 실패 시 무시 */
  }
}

export function clearEndlessSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* noop */
  }
}

/* ── 현재 단계 판별 ────────────────────────────────────────── */
/** highestTile 기준 현재 진행 중인 단계(1~3) 반환, 모두 완료 시 4 */
export function getCurrentPhase(
  highestTile: number,
  config: EndlessConfig,
  claimedPhases: number[],
): 1 | 2 | 3 | 4 {
  for (let i = 0; i < 3; i++) {
    if (!claimedPhases.includes(i + 1)) return (i + 1) as 1 | 2 | 3;
  }
  return 4;
}

/** highestTile이 새 단계를 달성했는지 확인 (보상 미수령 단계만) */
export function checkNewPhaseAchieved(
  highestTile: number,
  config: EndlessConfig,
  claimedPhases: number[],
): number | null {
  for (let i = 0; i < 3; i++) {
    const phase = i + 1;
    if (!claimedPhases.includes(phase) && highestTile >= config.goals[i]) {
      return phase;
    }
  }
  return null;
}

/* ── 랜덤 아이템 선택 ──────────────────────────────────────── */
export function getRandomEndlessItem(config: EndlessConfig): ShopItemId {
  const pool   = config.itemPool;
  const total  = pool.reduce((s, p) => s + p.weight, 0);
  let   rand   = Math.random() * total;
  for (const entry of pool) {
    rand -= entry.weight;
    if (rand <= 0) return entry.itemId;
  }
  return pool[pool.length - 1].itemId;
}
