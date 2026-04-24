/* ============================================================
 * CardUnlockOverlay.tsx
 * 카드 해금 애니메이션 팝업 (스타터 / Lv.100 / Lv.400 / 프리미엄)
 * ============================================================ */

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { CARD_COLLECTION, CARDS } from "@/utils/loadoutData";
import { useTranslation } from "@/i18n";

export type CardUnlockGroup = "starter" | "lv100" | "lv400" | "premium";

interface CardUnlockOverlayProps {
  group:  CardUnlockGroup;
  onDone: () => void;
}

const TITLE: Record<CardUnlockGroup, { ko: string; en: string }> = {
  starter: { ko: "카드가 해금됐어요!",      en: "Cards Unlocked!" },
  lv100:   { ko: "Lv.100 카드 해금!",       en: "Lv.100 Cards Unlocked!" },
  lv400:   { ko: "Lv.400 카드 해금!",       en: "Lv.400 Cards Unlocked!" },
  premium: { ko: "프리미엄 카드 활성화!",    en: "Premium Cards Activated!" },
};

const TITLE_EMOJI: Record<CardUnlockGroup, string> = {
  starter: "🎉",
  lv100:   "🌟",
  lv400:   "💫",
  premium: "💎",
};

const SUBTITLE: Record<CardUnlockGroup, { ko: string; en: string }> = {
  starter: { ko: "게임 시작 전 카드 1개를 선택할 수 있어요", en: "Choose 1 card before each game!" },
  lv100:   { ko: "Lv.100 돌파! 새 카드 3장을 획득했어요",    en: "Reached Lv.100! 3 new cards unlocked." },
  lv400:   { ko: "Lv.400 돌파! 새 카드 3장을 획득했어요",    en: "Reached Lv.400! 3 new cards unlocked." },
  premium: { ko: "구독 중에 프리미엄 카드를 사용할 수 있어요", en: "Use premium cards while subscribed!" },
};

/* 그룹별 테마 */
const GROUP_THEME: Record<CardUnlockGroup, {
  accent: string;    // 아이콘 배경
  accentText: string; // 아이콘 안 텍스트(이모지 색상)
  badge: string;     // 뱃지 bg
  badgeText: string; // 뱃지 텍스트
  btn: string;       // 버튼 그라디언트
  glow: string;      // 상단 glow
}> = {
  starter: {
    accent: "#dcfce7", accentText: "#16a34a",
    badge: "#bbf7d0",  badgeText: "#15803d",
    btn: "linear-gradient(135deg,#34d399,#10b981)",
    glow: "#bbf7d080",
  },
  lv100: {
    accent: "#fef9c3", accentText: "#ca8a04",
    badge: "#fde68a",  badgeText: "#92400e",
    btn: "linear-gradient(135deg,#fbbf24,#f59e0b)",
    glow: "#fde68a80",
  },
  lv400: {
    accent: "#f3e8ff", accentText: "#7c3aed",
    badge: "#ddd6fe",  badgeText: "#4c1d95",
    btn: "linear-gradient(135deg,#a78bfa,#7c3aed)",
    glow: "#ddd6fe80",
  },
  premium: {
    accent: "#fefce8", accentText: "#b45309",
    badge: "#fde68a",  badgeText: "#78350f",
    btn: "linear-gradient(135deg,#f59e0b,#d97706)",
    glow: "#fde68a80",
  },
};

export function CardUnlockOverlay({ group, onDone }: CardUnlockOverlayProps) {
  const { lang, t } = useTranslation();
  const [visible, setVisible] = useState([false, false, false]);
  const doneCalled = useRef(false);

  const done = useCallback(() => {
    if (!doneCalled.current) { doneCalled.current = true; onDone(); }
  }, [onDone]);

  const cards = CARD_COLLECTION.filter((c) => {
    if (group === "starter")  return c.unlockLevel === 0 && c.status === "active";
    if (group === "lv100")    return c.unlockLevel === 100;
    if (group === "lv400")    return c.unlockLevel === 400;
    if (group === "premium")  return c.status === "premium";
    return false;
  });

  const theme = GROUP_THEME[group];

  useEffect(() => {
    const t0 = setTimeout(() => setVisible([true, false, false]), 200);
    const t1 = setTimeout(() => setVisible([true, true,  false]), 420);
    const t2 = setTimeout(() => setVisible([true, true,  true]),  640);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[450] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="w-full max-w-xs mx-4 flex flex-col rounded-3xl shadow-2xl overflow-hidden"
        style={{ background: "#fff", animation: "unlockPop 0.32s cubic-bezier(.34,1.56,.64,1) both" }}
      >
        {/* ── 상단 glow 헤더 */}
        <div
          className="flex flex-col items-center pt-7 pb-5 px-5 gap-1"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${theme.glow} 0%, #fff 70%)` }}
        >
          <span style={{ fontSize: 40, lineHeight: 1 }}>{TITLE_EMOJI[group]}</span>
          <h2 className="text-lg font-black text-center mt-1" style={{ color: "#1a1a2e", letterSpacing: "-0.3px" }}>
            {lang === "ko" ? TITLE[group].ko : TITLE[group].en}
          </h2>
          <p className="text-xs text-center" style={{ color: "#6b7280" }}>
            {lang === "ko" ? SUBTITLE[group].ko : SUBTITLE[group].en}
          </p>
        </div>

        {/* ── 카드 리스트 */}
        <div className="flex flex-col gap-2.5 px-5 pb-2">
          {cards.map((card, i) => (
            <div
              key={card.collectionId}
              className="flex items-center gap-3 rounded-2xl px-3 py-3"
              style={{
                opacity:   visible[i] ? 1 : 0,
                transform: visible[i] ? "translateX(0)" : "translateX(-16px)",
                transition: "opacity 0.35s ease, transform 0.35s ease",
                background: theme.accent,
              }}
            >
              {/* 이모지 원 */}
              <div
                className="shrink-0 flex items-center justify-center rounded-2xl"
                style={{ width: 52, height: 52, background: "#fff", fontSize: 28 }}
              >
                {card.emoji}
              </div>

              {/* 텍스트 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-sm font-extrabold leading-tight" style={{ color: "#1a1a2e" }}>
                    {t(`card.${card.collectionId}`)}
                  </span>
                </div>
                <p className="text-xs leading-snug whitespace-pre-line" style={{ color: "#374151" }}>
                  {t(`card.desc.${card.collectionId}`)}
                </p>
              </div>

              {/* 사용횟수 뱃지 */}
              {(() => {
                const def = CARDS.find((c) => c.id === card.loadoutId);
                return def ? (
                  <div
                    className="shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5"
                    style={{ background: theme.badge, color: theme.badgeText }}
                  >
                    ×{def.maxUses}
                  </div>
                ) : null;
              })()}
            </div>
          ))}
        </div>

        {/* ── 확인 버튼 */}
        <div className="px-5 pt-3 pb-6">
          <button
            onClick={done}
            className="w-full py-3.5 rounded-2xl font-extrabold text-base text-white active:scale-95 transition-all"
            style={{ background: theme.btn, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
          >
            {lang === "ko" ? "확인" : "Got it!"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes unlockPop {
          from { opacity: 0; transform: scale(0.88) translateY(16px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>,
    document.body,
  );
}
