/* ============================================================
 * BuyLivesModal.tsx
 * 생명력 충전 모달
 *  - 코인 1,000개 → 생명력 10개 충전
 *  - 코인 부족 시 골드 구매 유도
 * ============================================================ */

import { createPortal } from "react-dom";
import { useTranslation } from "@/i18n";
import type { Season } from "@/utils/seasonData";
import { SEASON_THEMES } from "@/utils/seasonTheme";

interface BuyLivesModalProps {
  coins:           number;
  season:          Season;
  onBuyWithCoins:  () => void;
  onBuyWithGold:   () => void;
  onClose:         () => void;
}

export function BuyLivesModal({
  coins,
  season,
  onBuyWithCoins,
  onBuyWithGold,
  onClose,
}: BuyLivesModalProps) {
  const { t } = useTranslation();
  const theme  = SEASON_THEMES[season];

  const canAfford = coins >= 1000;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-300"
        style={{ background: theme.popupBg }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 헤더 ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: theme.textPrimary }}>
            {t("lives.chargeTitle")}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold"
            style={{ background: theme.borderColor + "40", color: theme.textSecondary }}
          >
            ✕
          </button>
        </div>

        {/* ── 심볼 + 설명 ──────────────────────────────────── */}
        <div
          className="rounded-2xl py-5 flex flex-col items-center gap-2"
          style={{ background: theme.panelColor }}
        >
          <div className="text-5xl leading-none">❤️</div>
          <p className="text-sm font-bold mt-1" style={{ color: theme.textPrimary }}>
            {t("lives.cost")}
          </p>
          <p className="text-xs" style={{ color: theme.textMuted }}>
            {t("lives.currentCoins")}: {coins.toLocaleString()} 🪙
          </p>
        </div>

        {/* ── 코인으로 충전 버튼 ────────────────────────────── */}
        <button
          onClick={canAfford ? onBuyWithCoins : undefined}
          disabled={!canAfford}
          className="w-full py-3.5 rounded-2xl font-bold text-sm text-white shadow-md transition-all active:scale-95"
          style={{
            background: canAfford
              ? "linear-gradient(135deg,#22c55e,#16a34a)"
              : "linear-gradient(135deg,#d1d5db,#9ca3af)",
            cursor: canAfford ? "pointer" : "not-allowed",
            opacity: canAfford ? 1 : 0.85,
          }}
        >
          {canAfford
            ? t("lives.buyWithCoins")
            : `${t("lives.noCoins")} (${coins.toLocaleString()}/1,000)`}
        </button>

        {/* ── 골드 구매 버튼 ────────────────────────────────── */}
        <button
          onClick={onBuyWithGold}
          className="w-full py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all active:scale-95"
          style={{
            background: "linear-gradient(135deg,#f59e0b,#d97706)",
            color: "#fff",
          }}
        >
          {t("lives.buyGold")}
        </button>
      </div>
    </div>,
    document.body,
  );
}
