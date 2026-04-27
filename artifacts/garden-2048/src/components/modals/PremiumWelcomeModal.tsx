/* ============================================================
 * PremiumWelcomeModal.tsx
 * 구독 완료 직후 온보딩 — 2단계 환영 플로우
 *   Step 1: 혜택 소개
 *   Step 2: 해금된 프리미엄 카드 소개
 * ============================================================ */

import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "@/i18n";
import type { Season } from "@/utils/seasonData";
import { SEASON_THEMES } from "@/utils/seasonTheme";

interface PremiumWelcomeModalProps {
  onDone:   () => void;
  season?:  Season;
}

/* 프리미엄 카드 정보 (loadoutData.ts와 동기) */
const PREMIUM_CARDS = [
  { emoji: "🌷", nameKey: "card.golden_sunflower",  descKey: "card.desc.golden_sunflower"  },
  { emoji: "🌳", nameKey: "card.life_tree",          descKey: "card.desc.life_tree"          },
  { emoji: "🌺", nameKey: "card.premium_remove",     descKey: "card.desc.premium_remove"     },
];

/* 프리미엄 혜택 */
const BENEFITS = [
  { emoji: "🚫", key: "premium.removeAds"    },
  { emoji: "💎", key: "premium.premiumCards" },
  { emoji: "🪙", key: "premium.doubleCoins"  },
  { emoji: "🌟", key: "premium.autoGoldBoost"},
];

export function PremiumWelcomeModal({ onDone, season = "spring" }: PremiumWelcomeModalProps) {
  const { t } = useTranslation();
  const theme  = SEASON_THEMES[season];
  const [step, setStep] = useState<1 | 2>(1);

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-[340px] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ background: theme.popupBg }}
      >

        {/* ── STEP 1: 환영 + 혜택 ─────────────────────── */}
        {step === 1 && (
          <>
            {/* 배너 */}
            <div
              className="px-5 py-6 text-center"
              style={{ background: "linear-gradient(135deg, #d97706, #f59e0b, #fcd34d)" }}
            >
              <div className="text-4xl mb-2">👑</div>
              <p className="text-xs font-bold tracking-widest uppercase text-amber-100 mb-1">
                {t("premium.welcome.badge") || "Premium Activated"}
              </p>
              <h2 className="text-xl font-black text-white leading-tight">
                {t("premium.welcome.title") || "환영합니다!"}
              </h2>
              <p className="text-sm text-amber-100 mt-1 font-medium">
                {t("premium.welcome.subtitle") || "지금부터 프리미엄 혜택을 누려보세요"}
              </p>
            </div>

            {/* 혜택 리스트 */}
            <div className="px-5 py-4 flex flex-col gap-2.5">
              {BENEFITS.map((b) => (
                <div
                  key={b.key}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
                  style={{ background: theme.panelColor }}
                >
                  <span className="text-xl w-7 text-center">{b.emoji}</span>
                  <span className="text-sm font-bold" style={{ color: theme.textPrimary }}>
                    {t(b.key)}
                  </span>
                  <span className="ml-auto text-xs font-bold text-amber-500">✓</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="px-5 pb-5 pt-1">
              <button
                onClick={() => setStep(2)}
                className="w-full py-3.5 rounded-2xl font-black text-sm tracking-widest active:scale-95 transition-all"
                style={{ background: "#d97706", color: "#fff", boxShadow: "0 4px 12px rgba(217,119,6,0.45)" }}
              >
                {t("premium.welcome.nextBtn") || "해금 카드 보기 →"}
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: 프리미엄 카드 소개 ─────────────── */}
        {step === 2 && (
          <>
            {/* 헤더 */}
            <div
              className="px-5 py-5 text-center"
              style={{ background: theme.panelColor, borderBottom: `1px solid ${theme.borderColor}50` }}
            >
              <div className="text-3xl mb-1.5">💎</div>
              <h2 className="text-base font-black" style={{ color: theme.textPrimary }}>
                {t("premium.welcome.cardsTitle") || "프리미엄 카드 해금!"}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                {t("premium.welcome.cardsSubtitle") || "로드아웃 선택 시 구독 탭에서 사용 가능합니다"}
              </p>
            </div>

            {/* 카드 그리드 */}
            <div className="px-5 py-4 grid grid-cols-3 gap-3">
              {PREMIUM_CARDS.map((card) => (
                <div
                  key={card.nameKey}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2"
                  style={{
                    background: "#fffbeb",
                    borderColor: "#fde68a",
                  }}
                >
                  <span className="text-3xl leading-none">{card.emoji}</span>
                  <span
                    className="text-[11px] font-bold text-center leading-tight"
                    style={{ color: "#92400e" }}
                  >
                    {t(card.nameKey)}
                  </span>
                  <span
                    className="text-[9px] text-center leading-tight"
                    style={{ color: "#b45309" }}
                  >
                    {t(card.descKey)}
                  </span>
                </div>
              ))}
            </div>

            {/* 안내 문구 */}
            <div className="mx-5 mb-3 px-3 py-2 rounded-xl text-center text-[11px]"
              style={{ background: theme.panelColor, color: theme.textMuted }}>
              {t("premium.welcome.cardHint") || "💡 구독 탭은 카드 선택 화면의 '💎 프리미엄' 탭에 있습니다"}
            </div>

            {/* CTA */}
            <div className="px-5 pb-5">
              <button
                onClick={onDone}
                className="w-full py-3.5 rounded-2xl font-black text-sm tracking-widest active:scale-95 transition-all"
                style={{ background: "#d97706", color: "#fff", boxShadow: "0 4px 12px rgba(217,119,6,0.45)" }}
              >
                {t("premium.welcome.doneBtn") || "게임 시작하기 🎮"}
              </button>
            </div>
          </>
        )}

        {/* 페이지 인디케이터 */}
        <div className="flex justify-center gap-1.5 pb-3">
          {([1, 2] as const).map((s) => (
            <div
              key={s}
              className="rounded-full transition-all"
              style={{
                width:      s === step ? 16 : 6,
                height:     6,
                background: s === step ? "#d97706" : theme.borderColor,
              }}
            />
          ))}
        </div>

      </div>
    </div>,
    document.body,
  );
}
