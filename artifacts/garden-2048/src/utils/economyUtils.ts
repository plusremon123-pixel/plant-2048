/* ============================================================
 * economyUtils.ts
 * 게임 경제 시스템 유틸리티
 *
 * ✏️ 수정 포인트:
 *   - calculateGameCoins(): 코인 획득 공식 조정
 *   - INITIAL_GIFT_COINS / INITIAL_GIFT_ITEMS: 초기 지급 내용 변경
 * ============================================================ */

import { loadInventory, saveInventory } from "./shopData";
import { loadPlayerData, savePlayerData } from "./playerData";

/* ── 초기 생명력 지급 ──────────────────────────────────── */
const LIVES_GIFT_KEY     = "plant2048_lives_init_v1";
const INITIAL_LIVES      = 5;

/**
 * 생명력이 0인 사용자(신규·기존 모두)에게 1회만 초기 생명력 5개를 지급한다.
 * usePlayer 훅 초기화 전에 호출해야 함 (App.tsx 최상단).
 */
export const giveInitialLivesIfNeeded = (): boolean => {
  try {
    if (localStorage.getItem(LIVES_GIFT_KEY)) return false;
    const player = loadPlayerData();
    if (player.lives === 0) {
      savePlayerData({ ...player, lives: INITIAL_LIVES });
    }
    localStorage.setItem(LIVES_GIFT_KEY, "1");
    return true;
  } catch {
    return false;
  }
};

/* ── 게임 종료 코인 계산 ───────────────────────────────── */

/**
 * 게임 한 판 종료 시 획득 코인 계산
 * 공식: 기본(10) + floor(score/300) + 최고 타일 보너스
 *
 * ✏️ 타일 보너스 수치를 여기서 조정하세요
 */
export const calculateGameCoins = (score: number, highestTile: number): number => {
  const base       = 10;
  const scoreBonus = Math.floor(score / 300);
  const tileBonus  =
    highestTile >= 512 ? 50 :
    highestTile >= 256 ? 30 :
    highestTile >= 128 ? 20 :
    highestTile >= 64  ? 10 :
    highestTile >= 32  ? 5  : 0;

  return base + scoreBonus + tileBonus;
};

/* ── 초기 지급 (최초 1회) ──────────────────────────────── */

/** ✏️ 초기 지급 내용을 여기서 변경하세요 */
const INITIAL_GIFT_KEY   = "plant2048_initial_gift_v1";
const INITIAL_GIFT_COINS = 200;
const INITIAL_GIFT_ITEMS: { id: string; qty: number }[] = [
  { id: "undo",         qty: 2 },
  { id: "remove_tile",  qty: 1 },
  { id: "spawn_sprout", qty: 1 },
];

/**
 * 첫 플레이 시 1회만 초기 선물을 지급한다.
 * localStorage를 직접 수정하므로, usePlayer/useShop 훅 초기화 전에 호출해야 함.
 * @returns 지급된 경우 true, 이미 지급된 경우 false
 */
export const giveInitialGiftIfNeeded = (): boolean => {
  try {
    if (localStorage.getItem(INITIAL_GIFT_KEY)) return false;

    /* 코인 지급 */
    const player = loadPlayerData();
    savePlayerData({ ...player, coins: player.coins + INITIAL_GIFT_COINS });

    /* 아이템 지급 */
    const inv = loadInventory();
    const updated = { ...inv };
    for (const { id, qty } of INITIAL_GIFT_ITEMS) {
      const key = id as keyof typeof inv;
      (updated as Record<string, number>)[key] = (updated[key] ?? 0) + qty;
    }
    saveInventory(updated);

    localStorage.setItem(INITIAL_GIFT_KEY, "1");
    return true;
  } catch {
    return false;
  }
};
