/* ============================================================
 * PremiumPassModal.tsx
 * 프리미엄 패스 팝업 — 구독 전/후 분기 · 구독 기간 표시
 * ============================================================ */

import { createPortal } from "react-dom";
import { useTranslation } from "@/i18n";
import type { Season } from "@/utils/seasonData";
import { SEASON_THEMES } from "@/utils/seasonTheme";
import type { SubscriptionState } from "@/utils/subscriptionData";

interface PremiumPassModalProps {
  isPostTrial?:       boolean;
  subscriptionState?: SubscriptionState;
  onBuy:              () => void;
  onClose:            () => void;
  season?:            Season;
}

/** 날짜를 YYYY.MM.DD 형식으로 포맷 */
function formatDate(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

/** 다음 갱신일 = 구독 시작일 + 30일 (mock; 실제는 스토어 API) */
function getNextRenewal(startTs: number): string {
  return formatDate(startTs + 30 * 24 * 60 * 60 * 1000);
}

export function PremiumPassModal({
  isPostTrial = false,
  subscriptionState,
  onBuy,
  onClose,
  season = "spring",
}: PremiumPassModalProps) {
  const { t } = useTranslation();
  const theme = SEASON_THEMES[season];

  const isActive = subscriptionState?.isPremium === true;
  const startTs  = subscriptionState?.premiumStartDate ?? null;

  const benefits = [
    { emoji: "🚫", textKey: "premium.removeAds" },
    { emoji: "💎", textKey: "premium.premiumCards" },
    { emoji: "🪙", textKey: "premium.doubleCoins" },
    { emoji: "🌟", textKey: "premium.autoGoldBoost" },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
      <div
        className="w-full max-w-[320px] rounded-3xl shadow-2xl flex flex-col animate-modal-slide-up overflow-hidden"
        style={{ background: theme.popupBg }}
      >
        {/* ── 상단 배너 ──────────────────────────────── */}
        <div
          className="px-6 pt-6 pb-4 text-center"
          style={{ background: theme.panelColor }}
        >
          <div className="flex justify-center mb-2">
            <img src="/menu-subscribe.png" className="w-12 h-12 object-contain" alt="" draggable={false} />
          </div>
          <h2 className="text-lg font-black" style={{ color: theme.textPrimary }}>
            {isActive ? t("premium.activeTitle") : t("premium.title")}
          </h2>
          {isActive ? (
            /* 구독 중 뱃지 */
            <span
              className="inline-block mt-1.5 text-[11px] font-black px-3 py-1 rounded-full"
              style={{ background: "#34d399", color: "#022c22" }}
            >
              {t("premium.activeBadge")}
            </span>
          ) : isPostTrial ? (
            <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>{t("premium.freeTrialExpired")}</p>
          ) : (
            <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>{t("premium.freeTrialCta")}</p>
          )}
        </div>

        {/* ── 구독 기간 정보 (구독 중일 때) ─────────── */}
        {isActive && (
          <div
            className="mx-5 mt-4 rounded-2xl px-4 py-3 flex flex-col gap-1.5"
            style={{ background: "rgba(52,211,153,0.12)", border: "1.5px solid rgba(52,211,153,0.40)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: theme.textMuted }}>{t("premium.startDate")}</span>
              <span className="text-xs font-black" style={{ color: theme.textPrimary }}>
                {startTs ? formatDate(startTs) : "-"}
              </span>
            </div>
            <div className="h-px" style={{ background: "rgba(52,211,153,0.25)" }} />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: theme.textMuted }}>{t("premium.renewalDate")}</span>
              <span className="text-xs font-black" style={{ color: "#059669" }}>
                {startTs ? getNextRenewal(startTs) : "-"}
              </span>
            </div>
            <div className="h-px" style={{ background: "rgba(52,211,153,0.25)" }} />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: theme.textMuted }}>{t("premium.monthlyAmount")}</span>
              <span className="text-xs font-black" style={{ color: theme.textPrimary }}>{t("premium.monthlyPrice")}</span>
            </div>
          </div>
        )}

        {/* ── 혜택 목록 ──────────────────────────────── */}
        <div className="px-6 py-4 flex flex-col gap-2.5">
          {benefits.map(({ emoji, textKey }) => (
            <div key={textKey} className="flex items-center gap-3">
              <span className="text-lg shrink-0">{emoji}</span>
              <p className="text-sm" style={{ color: theme.textSecondary }}>{t(textKey)}</p>
            </div>
          ))}
        </div>

        {/* ── 가격 박스 (비구독 시만) ─────────────────── */}
        {!isActive && (
          <div
            className="mx-5 mb-3 rounded-2xl p-3 text-center"
            style={{ background: theme.panelColor, border: `1px solid ${theme.borderColor}60` }}
          >
            <p className="text-xl font-black" style={{ color: theme.btnPrimary }}>{t("premium.price")}</p>
            <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{t("premium.pricePer")}</p>
          </div>
        )}

        {/* ── 버튼 ───────────────────────────────────── */}
        <div className="px-5 pb-6 pt-2 flex flex-col gap-2">
          {!isActive && (
            /* 비구독: 구독 시작 버튼 */
            <button
              onClick={onBuy}
              className="w-full py-4 rounded-2xl font-black text-sm tracking-widest shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all duration-200"
              style={{ background: theme.btnPrimary, color: theme.btnPrimaryText }}
            >
              {t("premium.continueUse")}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl text-sm font-semibold active:scale-95 transition-all"
            style={{
              color:      isActive ? theme.textPrimary : theme.textMuted,
              background: isActive ? theme.panelColor  : "transparent",
              borderRadius: "1rem",
            }}
          >
            {isActive ? t("premium.confirm") : t("premium.later")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
