/* ============================================================
 * GoldShopModal.tsx
 * 골드(인앱결제) 구매 모달
 *  - GOLD_SHOP_ITEMS 목록 표시
 *  - purchaseGoldPack() → 성공 시 onEarnCoins(amount)
 *  - 현재 mock (800ms 딜레이) — 향후 Capacitor IAP로 교체
 * ============================================================ */

import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "@/i18n";
import type { Season } from "@/utils/seasonData";
import { SEASON_THEMES } from "@/utils/seasonTheme";
import { GOLD_SHOP_ITEMS, purchaseGoldPack } from "@/utils/shopData";

interface GoldShopModalProps {
  season:       Season;
  onEarnCoins:  (amount: number) => void;
  onClose:      () => void;
}

export function GoldShopModal({ season, onEarnCoins, onClose }: GoldShopModalProps) {
  const { t }  = useTranslation();
  const theme   = SEASON_THEMES[season];
  const [buying, setBuying] = useState<string | null>(null);

  const handleBuy = async (productId: string) => {
    if (buying) return;
    setBuying(productId);
    try {
      const result = await purchaseGoldPack(productId);
      if (result.success && result.amount) {
        onEarnCoins(result.amount);
        onClose();
      }
    } finally {
      setBuying(null);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[310] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-300"
        style={{ background: theme.popupBg }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 헤더 ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold" style={{ color: theme.textPrimary }}>
              {t("lives.goldTitle")}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
              {t("lives.goldDesc")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold"
            style={{ background: theme.borderColor + "40", color: theme.textSecondary }}
          >
            ✕
          </button>
        </div>

        {/* ── 상품 목록 ─────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          {GOLD_SHOP_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleBuy(item.id)}
              disabled={!!buying}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl shadow-sm transition-all active:scale-95"
              style={{
                background: theme.panelColor,
                border: `1.5px solid ${theme.borderColor}60`,
                opacity: buying && buying !== item.id ? 0.55 : 1,
                cursor: buying ? "wait" : "pointer",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl leading-none">💰</span>
                <div className="text-left">
                  <p className="text-sm font-bold" style={{ color: theme.textPrimary }}>
                    {item.amount.toLocaleString()} 🪙
                  </p>
                  {item.badge && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: item.badge === "best" ? "#f59e0b" : "#3b82f6",
                        color: "#fff",
                      }}
                    >
                      {item.badge === "best" ? t("lives.best") : t("lives.recommend")}
                    </span>
                  )}
                </div>
              </div>
              <span
                className="text-sm font-bold px-3 py-1.5 rounded-xl text-white"
                style={{
                  background: buying === item.id
                    ? "linear-gradient(135deg,#9ca3af,#6b7280)"
                    : "linear-gradient(135deg,#f59e0b,#d97706)",
                  minWidth: 72,
                  textAlign: "center",
                }}
              >
                {buying === item.id ? t("lives.buying") : item.priceLabel}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
