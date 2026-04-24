/* ============================================================
 * adService.ts
 * 광고 서비스 — 네이티브는 AdMob, 웹은 Mock
 *
 * 실제 광고 호출은 adProvider.ts 에 위임.
 * 외부 인터페이스(Promise<boolean>)는 동일하게 유지.
 *
 * ✏️ 수정 포인트:
 *   - AD_DURATION_MS: 웹 Mock 시청 시간 (테스트 시 0으로 줄이세요)
 *   - AD_COINS_AMOUNT: 광고 1회당 지급 코인
 *   - AD_COINS_MAX_PER_DAY: 하루 최대 광고 코인 수령 횟수
 * ============================================================ */

import { Capacitor } from "@capacitor/core";
import { showInterstitial, showRewarded } from "./adProvider";

/** 웹 Mock 광고 시청 시간 (ms) — 네이티브에선 실제 AdMob 지연 사용 */
const AD_DURATION_MS = 2000;

/** 웹 Mock 성공률 (0 ~ 1) */
const AD_SUCCESS_RATE = 1.0;

const isNative = () => {
  try { return Capacitor.isNativePlatform(); }
  catch { return false; }
};

/** 외부에서 네이티브 여부 확인 (Game.tsx 등) */
export const isNativePlatform = isNative;

/**
 * 리워드 광고를 시청한다.
 * - 네이티브: AdMob 리워드 광고 표시
 * - 웹: Mock (AD_DURATION_MS 대기 후 AD_SUCCESS_RATE 확률로 성공)
 */
export const watchAd = async (): Promise<boolean> => {
  if (isNative()) return showRewarded();
  await new Promise((r) => setTimeout(r, AD_DURATION_MS));
  return Math.random() < AD_SUCCESS_RATE;
};

/**
 * 광고 가용 여부 확인 (mock: 항상 true)
 */
export const isAdAvailable = (): boolean => true;

/* ── 광고 코인 시스템 ────────────────────────────────────── */

/** ✏️ 광고 1회 지급 코인 */
const AD_COINS_AMOUNT     = 100;

/** ✏️ 하루 최대 수령 횟수 */
const AD_COINS_MAX_PER_DAY = 3;

const AD_COINS_KEY = "plant2048_ad_coins";

interface AdCoinRecord {
  date:  string;  /* YYYY-MM-DD */
  count: number;
}

const todayStr = (): string => new Date().toISOString().slice(0, 10);

/**
 * 오늘 광고 코인 수령 상태 조회
 * @returns { remaining: 남은 횟수, total: 하루 최대 횟수 }
 */
export const getAdCoinState = (): { remaining: number; total: number } => {
  try {
    const raw = localStorage.getItem(AD_COINS_KEY);
    if (!raw) return { remaining: AD_COINS_MAX_PER_DAY, total: AD_COINS_MAX_PER_DAY };
    const stored: AdCoinRecord = JSON.parse(raw);
    if (stored.date !== todayStr()) return { remaining: AD_COINS_MAX_PER_DAY, total: AD_COINS_MAX_PER_DAY };
    return {
      remaining: Math.max(0, AD_COINS_MAX_PER_DAY - stored.count),
      total:     AD_COINS_MAX_PER_DAY,
    };
  } catch {
    return { remaining: AD_COINS_MAX_PER_DAY, total: AD_COINS_MAX_PER_DAY };
  }
};

/**
 * 광고 시청 후 코인을 획득한다.
 * - 하루 최대 횟수 초과 시 0 반환
 * - 광고 실패 시 0 반환
 * @returns 획득한 코인 수
 */
/* ── 인터스티셜 광고 (판 종료 시 자동 표시) ──────────────── */

const GAME_COUNT_KEY = "plant2048_game_count";

/** 게임 횟수를 1 증가시키고 새 카운트를 반환 */
export const incrementGameCount = (): number => {
  const prev  = parseInt(localStorage.getItem(GAME_COUNT_KEY) ?? "0", 10) || 0;
  const count = prev + 1;
  localStorage.setItem(GAME_COUNT_KEY, String(count));
  return count;
};

/** 인터스티셜 광고를 표시해야 하는지 판단 (첫 3판 제외, 이후 5판마다, 구독자 스킵) */
export const shouldShowInterstitialAd = (count: number, isPremium = false): boolean =>
  !isPremium && count > 3 && count % 5 === 0;

/** 보스 스테이지 여부 (50, 100, 150 …) — 전후 광고 금지 */
export const isBossStage = (stageId: number): boolean =>
  stageId > 0 && stageId % 50 === 0;

/** 실패 광고를 표시할지 판단 (연속 2회 이상 실패 or 보스 스테이지면 스킵) */
export const shouldShowFailureAd = (
  consecutiveFails: number,
  stageId:          number,
  isPremium:        boolean,
): boolean =>
  !isPremium && consecutiveFails < 2 && !isBossStage(stageId);

/** 인터스티셜 광고 호출 — 네이티브에선 AdMob, 웹에선 noop */
export const markInterstitialAdShown = async (): Promise<void> => {
  if (isNative()) { await showInterstitial(); }
};

export const watchAdForCoins = async (): Promise<number> => {
  const { remaining } = getAdCoinState();
  if (remaining <= 0) return 0;

  const success = await watchAd();
  if (!success) return 0;

  try {
    const raw   = localStorage.getItem(AD_COINS_KEY);
    let count   = 0;
    if (raw) {
      const stored: AdCoinRecord = JSON.parse(raw);
      count = stored.date === todayStr() ? stored.count : 0;
    }
    localStorage.setItem(
      AD_COINS_KEY,
      JSON.stringify({ date: todayStr(), count: count + 1 })
    );
  } catch { /* noop */ }

  return AD_COINS_AMOUNT;
};
