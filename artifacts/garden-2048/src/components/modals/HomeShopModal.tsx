/* ============================================================
 * HomeShopModal.tsx
 * 홈 화면 상점 — 풀페이지 팝업 · 계절 테마 지원
 * ============================================================ */

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  SHOP_ITEMS,
  GOLD_SHOP_ITEMS,
  purchaseGoldPack,
  type ShopItemId,
  type Inventory,
} from "@/utils/shopData";
import type { PlayerData } from "@/utils/playerData";
import { SEASON_BG, type Season } from "@/utils/seasonData";
import { SEASON_THEMES, type SeasonTheme } from "@/utils/seasonTheme";
import { useTranslation } from "@/i18n";

interface HomeShopModalProps {
  player:            PlayerData;
  inventory:         Inventory;
  onBuyItem:         (id: ShopItemId, cost: number) => boolean;
  onEarnCoins?:      (amount: number) => void;
  onClose:           () => void;
  isPremiumActive?:  boolean;
  onOpenPremium?:    () => void;
  season?:           Season;
}

export function HomeShopModal({
  player, inventory, onBuyItem, onEarnCoins, onClose,
  isPremiumActive = false, onOpenPremium,
  season = "spring",
}: HomeShopModalProps) {
  const { t } = useTranslation();
  const theme = SEASON_THEMES[season];
  const [toast,      setToast]      = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const handleBuy = (id: ShopItemId, cost: number, name: string) => {
    if (player.coins < cost) { showToast(t("shop.notEnoughCoins")); return; }
    const ok = onBuyItem(id, cost);
    if (ok) showToast(t("shop.buyComplete", { name }));
    else    showToast(t("shop.purchaseFailed"));
  };

  const handleGoldPurchase = async (productId: string, amount: number) => {
    if (purchasing) return;
    setPurchasing(productId);
    try {
      const result = await purchaseGoldPack(productId);
      if (result.success && result.amount) {
        onEarnCoins?.(result.amount);
        showToast(t("shop.goldCharged", { amount: result.amount.toLocaleString() }));
      } else {
        showToast(t("shop.paymentFailed", { error: result.error ?? t("shop.purchaseFailed") }));
      }
    } catch {
      showToast(t("shop.paymentError"));
    } finally {
      setPurchasing(null);
    }
  };

  const toolItems = SHOP_ITEMS.filter((i) => i.consumable);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col animate-in slide-in-from-right duration-300"
      style={{ background: theme.popupBg }}
    >
      {/* ── 헤더 ─────────────────────────────────────────── */}
      <div
        className="flex items-center px-5 pt-safe-top pt-4 pb-2 flex-shrink-0"
        style={{ borderBottom: `1px solid ${theme.borderColor}40` }}
      >
        <div className="flex items-center gap-2 flex-1">
          <img src="/menu-shop.png" className="w-6 h-6 object-contain" alt="" draggable={false} />
          <h2 className="text-base font-bold" style={{ color: theme.textPrimary }}>{t("shop.title")}</h2>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full active:scale-95 transition-all text-sm font-bold flex-shrink-0"
          style={{ background: theme.borderColor + "50", color: theme.textSecondary }}
        >
          ✕
        </button>
      </div>

      {/* ── 보유 코인 (눈에 띄는 대형 표시) ──────────────── */}
      <div
        className="mx-5 mt-2 mb-1 rounded-2xl py-2 flex items-center justify-center gap-2.5 flex-shrink-0"
        style={{ background: "#fff8e1", border: "2px solid #ffe082" }}
      >
        <span className="text-2xl leading-none">🪙</span>
        <span className="text-2xl font-black tabular-nums" style={{ color: "#e65100" }}>
          {player.coins.toLocaleString()}
        </span>
        <span className="text-xs font-semibold" style={{ color: "#c47a15" }}>
          {t("shop.ownedCoins")}
        </span>
      </div>

      {/* ── 본문 ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col px-4 pt-2 pb-2 gap-0 min-h-0">

        {/* ── 도구 섹션 ─────────────────────────────────── */}
        <section className="flex-shrink-0">
          <SectionLabel label={t("shop.tools")} theme={theme} />
          <div className="flex flex-col gap-1 mt-1.5 mb-2">
            {toolItems.map((item) => {
              const owned  = inventory[item.id] ?? 0;
              const canBuy = player.coins >= item.cost;
              const tName  = t(`item.${item.id}.name`);
              const tDesc  = t(`item.${item.id}.desc`);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-1.5"
                  style={{ background: theme.panelColor }}
                >
                  {/* 이모지 아이콘 */}
                  <span className="text-lg w-6 text-center flex-shrink-0 leading-none">
                    {item.emoji}
                  </span>

                  {/* 이름 + 설명 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] font-bold leading-none" style={{ color: theme.textPrimary }}>
                        {tName}
                      </p>
                      {owned > 0 && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                          style={{ background: theme.btnPrimary + "22", color: theme.btnPrimary }}
                        >
                          ×{owned}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] mt-0.5 leading-none" style={{ color: theme.textMuted }}>
                      {tDesc}
                    </p>
                  </div>

                  {/* 구매 버튼 */}
                  <button
                    onClick={() => handleBuy(item.id, item.cost, tName)}
                    disabled={!canBuy}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all active:scale-95 flex-shrink-0"
                    style={canBuy
                      ? { background: "#FFC107", color: "#5D2E0C" }
                      : { background: theme.borderColor + "40", color: theme.textMuted, cursor: "not-allowed" }
                    }
                  >
                    🪙{item.cost.toLocaleString()}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 코인 충전 섹션 ──────────────────────────────── */}
        <section className="flex-shrink-0">
          <SectionLabel label={t("shop.coinCharge")} theme={theme} />
          <div
            className="rounded-2xl px-3 pt-2 pb-2.5 mt-1.5"
            style={{
              background: "linear-gradient(135deg, #FFF8DC 0%, #FFE566 60%, #FFC107 100%)",
              border: "2px solid #FFB300",
            }}
          >
            <div className="grid grid-cols-4 gap-2">
              {GOLD_SHOP_ITEMS.map((item) => {
                const isBuying = purchasing === item.id;
                const isBest   = item.badge === "best" || item.badge === "recommend";
                return (
                  <button
                    key={item.id}
                    onClick={() => handleGoldPurchase(item.id, item.amount)}
                    disabled={!!purchasing}
                    className="relative flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 border-2 transition-all active:scale-95"
                    style={isBest
                      ? { background: "#FFFFFF", borderColor: "#FF8F00", boxShadow: "0 2px 8px rgba(255,143,0,0.35)" }
                      : { background: "rgba(255,255,255,0.65)", borderColor: "#FFD54F" }
                    }
                  >
                    {item.badge && (
                      <span className={[
                        "absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-black px-1.5 py-0.5 rounded-full text-white whitespace-nowrap",
                        isBest ? "bg-orange-500" : "bg-emerald-500",
                      ].join(" ")}>
                        {t(`shop.badge_${item.badge}`)}
                      </span>
                    )}
                    {isBuying ? (
                      <svg className="animate-spin w-4 h-4 my-0.5" style={{ color: "#E65100" }} fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                    ) : (
                      <span className="text-base leading-none">🪙</span>
                    )}
                    <p className="text-[11px] font-black leading-tight" style={{ color: isBest ? "#BF360C" : "#5D2E0C" }}>
                      {item.amount.toLocaleString()}
                    </p>
                    <p className="text-[9px] leading-tight font-semibold" style={{ color: "#7B5800" }}>{t(`shop.price_${item.id}`) || item.priceLabel}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 프리미엄 배너 (배경 이미지 + 세로 풀채움) ─── */}
        <section
          className="flex-1 mt-2 rounded-2xl overflow-hidden relative"
          style={{
            backgroundImage: `url(${SEASON_BG[season]})`,
            backgroundSize: "cover",
            backgroundPosition: "center 55%",
            boxShadow: isPremiumActive
              ? "inset 0 0 0 2.5px #34d399"
              : "inset 0 0 0 2.5px #FFC107",
          }}
        >
          {/* 컬러 오버레이 */}
          <div
            className="absolute inset-0"
            style={{
              background: isPremiumActive
                ? "linear-gradient(175deg, rgba(4,60,38,0.88) 0%, rgba(6,78,59,0.82) 50%, rgba(15,118,110,0.72) 100%)"
                : "linear-gradient(175deg, rgba(15,10,60,0.90) 0%, rgba(49,46,129,0.85) 50%, rgba(88,28,135,0.78) 100%)",
            }}
          />

          {/* 별빛 데코 */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {(isPremiumActive
              ? [
                  { top:"8%",  left:"8%",  ch:"✦", sz:"text-xs",    op:"opacity-50", delay:"0s"   },
                  { top:"15%", left:"82%", ch:"✦", sz:"text-[10px]", op:"opacity-40", delay:"0.6s" },
                  { top:"82%", left:"6%",  ch:"✦", sz:"text-[10px]", op:"opacity-40", delay:"1.0s" },
                  { top:"88%", left:"85%", ch:"✦", sz:"text-xs",    op:"opacity-50", delay:"0.3s" },
                ]
              : [
                  { top:"8%",  left:"5%",  ch:"✦", sz:"text-sm",    op:"opacity-60", delay:"0s"   },
                  { top:"12%", left:"85%", ch:"✦", sz:"text-[10px]", op:"opacity-50", delay:"0.5s" },
                  { top:"50%", left:"3%",  ch:"✦", sz:"text-[10px]", op:"opacity-40", delay:"1.0s" },
                  { top:"80%", left:"82%", ch:"✦", sz:"text-sm",    op:"opacity-60", delay:"0.3s" },
                  { top:"65%", left:"48%", ch:"·",  sz:"text-lg",    op:"opacity-30", delay:"0.8s" },
                ]
            ).map((s, i) => (
              <span
                key={i}
                className={`absolute ${s.sz} ${s.op} animate-pulse text-white`}
                style={{ top: s.top, left: s.left, animationDelay: s.delay }}
              >
                {s.ch}
              </span>
            ))}
          </div>

          {/* 전체 클릭 버튼 — 세로 레이아웃 */}
          <button
            onClick={() => { onClose(); onOpenPremium?.(); }}
            className="relative z-10 w-full h-full flex flex-col items-center justify-center gap-2 px-5 py-4 active:scale-[0.99] transition-all"
          >
            {isPremiumActive ? (
              /* ── 구독 후 ─────────────────────────────── */
              <>
                {/* 이용 중 뱃지 */}
                <span
                  className="text-[11px] font-black px-3 py-1 rounded-full animate-pulse"
                  style={{ background: "#34d399", color: "#022c22" }}
                >
                  {t("premium.activeBadge")}
                </span>

                {/* 타이틀 */}
                <p
                  className="text-xl font-black text-white text-center"
                  style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8), 0 0 24px rgba(52,211,153,0.5)" }}
                >
                  {t("shop.premiumActive")}
                </p>

                {/* 혜택 2×2 */}
                <div className="grid grid-cols-2 gap-2 w-full">
                  {[
                    { icon: "🚫", label: t("shop.benefitNoAds") },
                    { icon: "💰", label: t("shop.benefitDoubleCoins") },
                    { icon: "💎", label: t("shop.benefitPremiumCards") },
                    { icon: "⭐", label: t("shop.benefitXpBoost") },
                  ].map(({ icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-1.5 rounded-xl px-3 py-2"
                      style={{ background: "rgba(52,211,153,0.18)", border: "1px solid rgba(52,211,153,0.35)" }}
                    >
                      <span className="text-base leading-none">{icon}</span>
                      <span className="text-xs font-bold text-emerald-100">{label}</span>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-emerald-300 font-medium">{t("shop.manageSubscription")}</p>
              </>
            ) : (
              /* ── 구독 전 ─────────────────────────────── */
              <>
                {/* 타이틀 */}
                <div className="flex flex-col items-center gap-1">
                  <p
                    className="text-xl font-black text-white text-center"
                    style={{ textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 0 28px rgba(196,130,255,0.5)" }}
                  >
                    {t("shop.premiumPass")}
                  </p>
                  <p className="text-[12px] font-semibold text-purple-200">
                    {t("shop.premiumSubtitle")}
                  </p>
                </div>

                {/* 혜택 2×2 */}
                <div className="grid grid-cols-2 gap-2 w-full">
                  {[
                    { icon: "🚫", label: t("shop.benefitNoAds") },
                    { icon: "💰", label: t("shop.benefitDoubleCoins") },
                    { icon: "💎", label: t("shop.benefitPremiumCards") },
                    { icon: "⭐", label: t("shop.benefitXpBoost") },
                  ].map(({ icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-1.5 rounded-xl px-3 py-2"
                      style={{ background: "rgba(167,139,250,0.20)", border: "1px solid rgba(167,139,250,0.40)" }}
                    >
                      <span className="text-base leading-none">{icon}</span>
                      <span className="text-xs font-bold text-purple-100">{label}</span>
                    </div>
                  ))}
                </div>

                {/* 가격 + CTA */}
                <div className="flex flex-col items-center gap-2 w-full">
                  <span
                    className="text-sm font-black text-yellow-300"
                    style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}
                  >
                    {t("premium.monthlyPrice")}
                  </span>
                  <div
                    className="w-full py-3 rounded-xl text-center text-sm font-black"
                    style={{
                      background: "linear-gradient(135deg, #FFC107, #FF8F00)",
                      color: "#1a0a00",
                      boxShadow: "0 4px 16px rgba(255,193,7,0.50)",
                    }}
                  >
                    {t("shop.subscribeCta")}
                  </div>
                </div>
              </>
            )}
          </button>
        </section>

      </div>

      {/* ── 토스트 ─────────────────────────────────────── */}
      {toast && (
        <div
          className="fixed bottom-28 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-2.5 rounded-full shadow-xl z-[300] whitespace-nowrap animate-modal-slide-up"
          style={{ background: theme.textPrimary, color: theme.popupBg }}
        >
          {toast}
        </div>
      )}
    </div>,
    document.body,
  );
}

/* ── 섹션 레이블 ─────────────────────────────────────────── */
function SectionLabel({ label, theme }: {
  label: string;
  theme: SeasonTheme;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[10px] font-bold uppercase tracking-widest"
        style={{ color: theme.textMuted }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: theme.borderColor + "40" }} />
    </div>
  );
}
