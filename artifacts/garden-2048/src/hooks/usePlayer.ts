/* ============================================================
 * usePlayer.ts
 * 플레이어 코인·클리어 레벨 상태 관리 훅 (XP 완전 제거)
 * ============================================================ */

import { useState, useCallback } from "react";
import {
  PlayerData,
  MAX_LIVES,
  loadPlayerData,
  savePlayerData,
} from "@/utils/playerData";

export function usePlayer() {
  const [player, setPlayer] = useState<PlayerData>(loadPlayerData);

  /** 맵 스테이지 클리어 처리 — clearedLevel + 1 */
  const clearLevel = useCallback(() => {
    setPlayer((prev) => {
      const updated = { ...prev, clearedLevel: prev.clearedLevel + 1 };
      savePlayerData(updated);
      return updated;
    });
  }, []);

  /** 코인을 차감한다. 잔액 부족 시 false 반환. */
  const spendCoins = useCallback((amount: number): boolean => {
    let success = false;
    setPlayer((prev) => {
      if (prev.coins < amount) return prev;
      success = true;
      const updated = { ...prev, coins: prev.coins - amount };
      savePlayerData(updated);
      return updated;
    });
    return success;
  }, []);

  /** 코인을 추가한다. */
  const addCoins = useCallback((amount: number) => {
    if (amount <= 0) return;
    setPlayer((prev) => {
      const updated = { ...prev, coins: prev.coins + amount };
      savePlayerData(updated);
      return updated;
    });
  }, []);

  /** 생명력 1 차감. 이미 0이면 false 반환. */
  const spendLife = useCallback((): boolean => {
    let success = false;
    setPlayer((prev) => {
      if (prev.lives <= 0) return prev;
      success = true;
      const updated = { ...prev, lives: prev.lives - 1 };
      savePlayerData(updated);
      return updated;
    });
    return success;
  }, []);

  /** 생명력 n 추가 (MAX_LIVES 상한). */
  const addLives = useCallback((n: number) => {
    if (n <= 0) return;
    setPlayer((prev) => {
      const updated = { ...prev, lives: Math.min(MAX_LIVES, prev.lives + n) };
      savePlayerData(updated);
      return updated;
    });
  }, []);

  /** 강제로 플레이어 데이터를 재로드한다. */
  const reloadPlayer = useCallback(() => {
    setPlayer(loadPlayerData());
  }, []);

  return { player, clearLevel, spendCoins, addCoins, reloadPlayer, spendLife, addLives };
}
