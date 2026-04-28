/* ============================================================
 * playerData.ts
 * 플레이어 데이터 — 코인·클리어 레벨 중심 (XP 완전 제거)
 * ============================================================ */

/* ── 생명력 상수 ─────────────────────────────────────────── */
export const MAX_LIVES = 10;

/* ── 플레이어 데이터 구조 ───────────────────────────────── */
export interface PlayerData {
  coins:        number;
  clearedLevel: number;  /* 클리어한 맵 스테이지 번호 (0 = 아직 없음) */
  lives:        number;  /* 생명력 (0 ~ MAX_LIVES) */
}

/* ── 레벨별 목표 점수 테이블 ─────────────────────────────── */
export const LEVEL_GOALS: Record<number, number> = {
  1:  300,
  2:  600,
  3:  1000,
  4:  1500,
  5:  2200,
  6:  3000,
  7:  4200,
  8:  5600,
  9:  7500,
  10: 10000,
};

/** 테이블에 없는 레벨은 공식으로 계산 (11 이상) */
export const getLevelGoal = (level: number): number =>
  LEVEL_GOALS[level] ?? Math.round(300 * Math.pow(1.4, level - 1));

/* ── localStorage 영속성 ────────────────────────────────── */
export const PLAYER_STORAGE_KEY = "plant2048_player";

const DEFAULT_PLAYER: PlayerData = { coins: 0, clearedLevel: 0, lives: 0 };

export const loadPlayerData = (): PlayerData => {
  try {
    const raw = localStorage.getItem(PLAYER_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PLAYER };
    const parsed = JSON.parse(raw) as Partial<PlayerData & { level?: number; xp?: number; totalXp?: number }>;
    return {
      coins:        parsed.coins        ?? 0,
      clearedLevel: parsed.clearedLevel ?? 0,
      lives:        parsed.lives        ?? 0,
    };
  } catch {
    return { ...DEFAULT_PLAYER };
  }
};

export const savePlayerData = (data: PlayerData): void => {
  try {
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(data));
  } catch { /* noop */ }
};
