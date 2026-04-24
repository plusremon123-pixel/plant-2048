/* ============================================================
 * EndlessClearModal.tsx
 * 무한 모드 궁극 클리어 팝업 — 32,768 타일 달성 시
 * 3종류 아이템(되돌리기·타일 제거·보드 청소) × 2개씩 지급 후 게임 종료
 * ============================================================ */

import { createPortal } from "react-dom";
import { useTranslation } from "@/i18n";
import type { ShopItemId } from "@/utils/shopData";
import { SHOP_ITEMS } from "@/utils/shopData";

/* 선물 구성 — 고정: 3종류 × 2개씩 */
const GIFT_ITEMS: { id: ShopItemId; qty: number }[] = [
  { id: "undo",        qty: 2 },
  { id: "remove_tile", qty: 2 },
  { id: "board_clean", qty: 2 },
];

interface EndlessClearModalProps {
  onClaim: (gifts: { id: ShopItemId; qty: number }[]) => void;
}

export function EndlessClearModal({ onClaim }: EndlessClearModalProps) {
  const { t } = useTranslation();

  return createPortal(
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-[380px] bg-white rounded-3xl shadow-2xl overflow-hidden animate-modal-slide-up">

        {/* ── 헤더 ─────────────────────────────────── */}
        <div className="bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 px-5 pt-6 pb-5 text-center relative">
          {/* 반짝임 효과 */}
          <div className="absolute top-2 left-4 text-lg opacity-70">✨</div>
          <div className="absolute top-4 right-6 text-sm opacity-70">⭐</div>
          <div className="absolute bottom-3 left-8 text-sm opacity-60">✨</div>
          <div className="absolute bottom-2 right-4 text-lg opacity-70">⭐</div>

          <div className="text-5xl mb-2 drop-shadow-sm">🏆</div>
          <h2 className="text-lg font-black text-white drop-shadow-sm">
            {t("endless.ultimateClearTitle")}
          </h2>
          <p className="text-sm text-white/95 mt-1 font-bold">
            {t("endless.ultimateClearDesc")}
          </p>
        </div>

        {/* ── 본문: 아이템 3종 × 2개 ───────────────── */}
        <div className="px-5 py-5 flex flex-col gap-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/50 text-center">
            {t("endless.ultimateClearGift")}
          </p>

          <div className="grid grid-cols-3 gap-2">
            {GIFT_ITEMS.map((gift) => {
              const def = SHOP_ITEMS.find((it) => it.id === gift.id);
              return (
                <div
                  key={gift.id}
                  className="flex flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-amber-100 border-2 border-amber-300 rounded-2xl px-2 py-3 shadow-sm"
                >
                  <span className="text-3xl mb-1 leading-none">
                    {def?.emoji ?? "🎁"}
                  </span>
                  <span className="text-[11px] font-bold text-amber-900 text-center leading-tight">
                    {def?.name ?? gift.id}
                  </span>
                  <span className="mt-1 text-[11px] font-black text-white bg-amber-500 rounded-full px-2 py-0.5">
                    ×{gift.qty}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ── 확정 버튼 ─────────────────────────── */}
          <button
            onClick={() => onClaim(GIFT_ITEMS)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-black shadow-md active:scale-95 transition-all"
          >
            🎁 {t("endless.ultimateClearClaim")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
