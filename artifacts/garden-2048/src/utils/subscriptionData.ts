/* ============================================================
 * subscriptionData.ts
 * 구독 상태 타입 · localStorage CRUD · 헬퍼 함수
 * ============================================================ */

export interface SubscriptionState {
  isPremium:       boolean;       // 유료 구독 활성
  trialUsed:       boolean;       // 무료 체험 사용 이력
  trialActive:     boolean;       // 현재 체험 진행 중
  trialExpiry:     number | null; // 만료 타임스탬프 (ms)
  premiumStartDate?: number | null; // 유료 구독 시작일 (ms)
}

const KEY = "plant2048_subscription";

const DEFAULT: SubscriptionState = {
  isPremium:   false,
  trialUsed:   false,
  trialActive: false,
  trialExpiry: null,
};

export function loadSubscription(): SubscriptionState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveSubscription(s: SubscriptionState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage full — ignore
  }
}

/** 프리미엄 활성 여부 (유료 구독 or 유효한 체험 중) */
export function isPremiumActive(s: SubscriptionState): boolean {
  if (s.isPremium) return true;
  if (s.trialActive && s.trialExpiry !== null && Date.now() < s.trialExpiry) return true;
  return false;
}

/** 1일 무료 체험 시작 */
export function startFreeTrial(): SubscriptionState {
  const s: SubscriptionState = {
    isPremium:   false,
    trialUsed:   true,
    trialActive: true,
    trialExpiry: Date.now() + 24 * 60 * 60 * 1000, // 24h
  };
  saveSubscription(s);
  return s;
}

/** 체험 만료 처리 */
export function expireTrial(current: SubscriptionState): SubscriptionState {
  const s: SubscriptionState = {
    ...current,
    trialActive: false,
  };
  saveSubscription(s);
  return s;
}

/** 유료 구독 활성화 */
export function activatePremium(): SubscriptionState {
  const s: SubscriptionState = {
    isPremium:        true,
    trialUsed:        true,
    trialActive:      false,
    trialExpiry:      null,
    premiumStartDate: Date.now(),
  };
  saveSubscription(s);
  return s;
}

/** 체험이 만료됐는지 확인 (만료 시 state 반환, 아니면 null) */
export function checkTrialExpiry(s: SubscriptionState): SubscriptionState | null {
  if (s.trialActive && s.trialExpiry !== null && Date.now() >= s.trialExpiry) {
    return expireTrial(s);
  }
  return null;
}
