/* ============================================================
 * EndlessGameOverModal.tsx
 * 무한 모드 게임 종료 팝업
 * - 이어하기 (광고 선택)
 * - 새로 시작
 * - 홈으로
 * ============================================================ */

import { useState }       from "react";
import { createPortal }   from "react-dom";
import { useTranslation } from "@/i18n";
import { watchAd }        from "@/utils/adService";

interface EndlessGameOverModalProps {
  score:            number;
  highestTile:      number;
  revived:          boolean;          // 이미 부활 사용 여부 (true면 버튼 숨김)
  isPremiumActive?: boolean;          // 구독자면 광고 없이 무료 부활
  onContinue:  () => void;   // 이어하기 (보드 한 수 되돌리기)
  onRestart:   () => void;   // 새로 시작 (같은 난이도)
  onHome:      () => void;   // 홈으로
}

export function EndlessGameOverModal({
  score, highestTile, revived, isPremiumActive = false,
  onContinue, onRestart, onHome,
}: EndlessGameOverModalProps) {
  const { t }                         = useTranslation();
  const [adState, setAdState]         = useState<"idle" | "watching">("idle");

  const handleContinueAd = async () => {
    if (isPremiumActive) { onContinue(); return; }   // 구독자: 광고 없이 즉시
    setAdState("watching");
    const ok = await watchAd();
    if (ok) onContinue();
    else    setAdState("idle");
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-[360px] mx-4 bg-white rounded-3xl shadow-2xl overflow-hidden animate-modal-slide-up">

        {/* 헤더 */}
        <div className="bg-gradient-to-br from-slate-500 to-slate-700 px-5 pt-6 pb-4 text-center">
          <div className="text-4xl mb-2">😔</div>
          <h2 className="text-lg font-black text-white">{t("endless.gameOver")}</h2>
          <p className="text-sm text-white/70 mt-0.5">{t("endless.boardFull")}</p>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">

          {/* 결과 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-foreground/4 rounded-2xl px-3 py-2 text-center">
              <p className="text-xs text-foreground/40">{t("game.score")}</p>
              <p className="text-base font-black text-foreground">{score.toLocaleString()}</p>
            </div>
            <div className="bg-foreground/4 rounded-2xl px-3 py-2 text-center">
              <p className="text-xs text-foreground/40">{t("game.best")}</p>
              <p className="text-base font-black text-foreground">{highestTile.toLocaleString()}</p>
            </div>
          </div>

          {/* 이어하기 (부활) — 1회 제한 */}
          {!revived && (
            <button
              onClick={handleContinueAd}
              disabled={adState === "watching"}
              className="w-full py-3.5 rounded-2xl text-white text-sm font-bold shadow-md active:scale-95 transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}
            >
              {adState === "watching"
                ? <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    {t("endless.watching")}
                  </span>
                : isPremiumActive
                  ? `✨ ${t("game.reviveFree") || "무료 부활하기"}`
                  : `📺 ${t("game.reviveAd")  || "광고 보고 부활하기"}`}
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={onRestart}
              className="flex-1 py-2.5 rounded-2xl bg-foreground/6 border border-foreground/10 text-sm font-bold text-foreground/55 active:scale-95 transition-all"
            >
              {t("endless.restart")}
            </button>
            <button
              onClick={onHome}
              className="flex-1 py-2.5 rounded-2xl bg-foreground/6 border border-foreground/10 text-sm font-bold text-foreground/55 active:scale-95 transition-all"
            >
              {t("game.homeBtn")}
            </button>
          </div>

        </div>
      </div>
    </div>,
    document.body,
  );
}
