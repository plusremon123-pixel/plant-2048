/* ============================================================
 * GameEndModal.tsx
 * 게임 종료 결과 모달 — XP 완전 제거, 시즌 테마 적용
 * ============================================================ */

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { PlayerData } from "@/utils/playerData";
import { calculateGameCoins } from "@/utils/economyUtils";
import { watchAd } from "@/utils/adService";
import { useTranslation } from "@/i18n";
import type { Season } from "@/utils/seasonData";
import { SEASON_THEMES } from "@/utils/seasonTheme";

interface GameEndModalProps {
  isOpen:            boolean;
  isWin:             boolean;
  score:             number;
  highestTile:       number;
  player:            PlayerData;
  season:            Season;
  isPremiumActive?:  boolean;
  lives?:            number;           // 현재 잔여 생명력 (undefined = 생명력 시스템 미사용)
  onRevive?:         () => void;        // 보드 가득 찬 패배 시 부활
  onExtendTurns?:    () => void;        // 턴 소진 패배 시 턴 연장
  onBuyLives?:       () => void;        // 생명력 소진 시 충전 유도
  onConfirm:         (earnedCoins: number, action: "reset" | "home") => void;
}

type AdState = "idle" | "watching" | "done";

export function GameEndModal({
  isOpen,
  isWin,
  score,
  highestTile,
  player,
  season,
  isPremiumActive = false,
  lives,
  onRevive,
  onExtendTurns,
  onBuyLives,
  onConfirm,
}: GameEndModalProps) {
  /* 생명력이 0이면 부활/연장 불가 */
  const livesEmpty = typeof lives === "number" && lives <= 0;
  const { t } = useTranslation();
  const theme = SEASON_THEMES[season];

  const gameCoinsRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      gameCoinsRef.current = calculateGameCoins(score, highestTile);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const gameCoins = gameCoinsRef.current;

  const [adState,    setAdState]    = useState<AdState>("idle");
  const [multiplied, setMultiplied] = useState(false);
  const [reviveAd,   setReviveAd]   = useState<"idle" | "watching" | "done">("idle");

  useEffect(() => {
    if (!isOpen) return;
    setAdState("idle");
    setMultiplied(false);
    setReviveAd("idle");
  }, [isOpen]);

  /* ── 부활 광고 ─────────────────────────────────────── */
  const handleReviveAd = async () => {
    if (!onRevive || reviveAd !== "idle") return;
    if (isPremiumActive) { onRevive(); return; }   // 구독자: 광고 없이 즉시
    setReviveAd("watching");
    const ok = await watchAd();
    if (ok) {
      setReviveAd("done");
      onRevive();
    } else {
      setReviveAd("idle");   // 실패 → 재시도 가능
    }
  };

  /* ── 턴 연장 광고 (+30턴) ──────────────────────────── */
  const handleExtendTurnsAd = async () => {
    if (!onExtendTurns || reviveAd !== "idle") return;
    setReviveAd("watching");
    const ok = await watchAd();
    if (ok) {
      setReviveAd("done");
      onExtendTurns();
    } else {
      setReviveAd("idle");
    }
  };

  if (!isOpen) return null;

  /* ── 최종 코인 ──────────────────────────────────────── */
  const finalCoins = gameCoins * ((multiplied || isPremiumActive) ? 2 : 1);

  /* ── 광고 시청 (코인 2배) ──────────────────────────── */
  const handleWatchAd = async () => {
    if (adState !== "idle" || multiplied) return;
    setAdState("watching");
    const success = await watchAd();
    if (success) {
      setMultiplied(true);
      setAdState("done");
    } else {
      setAdState("idle");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-300"
        style={{ background: theme.popupBg }}
      >

        {/* ── 결과 헤더 ────────────────────────────────── */}
        <div className="text-center">
          <div className="text-3xl mb-1">
            {isWin ? "🌸" : "🌱"}
          </div>
          <h2 className="text-lg font-display font-bold" style={{ color: theme.textPrimary }}>
            {isWin ? t("game.stageClear") : t("game.gameOver")}
          </h2>
        </div>

        {/* ── 점수 ─────────────────────────────────────── */}
        <div className="flex gap-3">
          <div
            className="flex-1 rounded-2xl py-3 flex flex-col items-center gap-0.5"
            style={{ background: theme.panelColor }}
          >
            <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: theme.textMuted }}>
              {t("game.score")}
            </span>
            <span className="text-xl font-display font-bold" style={{ color: theme.textPrimary }}>
              {score.toLocaleString()}
            </span>
          </div>
          <div
            className="flex-1 rounded-2xl py-3 flex flex-col items-center gap-0.5"
            style={{ background: theme.panelColor }}
          >
            <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: theme.textMuted }}>
              {t("game.best")}
            </span>
            <span className="text-xl font-display font-bold" style={{ color: theme.textPrimary }}>
              {highestTile}
            </span>
          </div>
        </div>

        {/* ── 코인 획득 ────────────────────────────────── */}
        <div
          className="flex items-center justify-center gap-2 rounded-2xl py-3 border"
          style={{ background: "#fff8e1", borderColor: "#ffe082" }}
        >
          <span className="text-xl">🪙</span>
          <span className="text-base font-bold text-amber-600">
            {t("game.coinEarned", { coins: finalCoins })}
          </span>
          {multiplied && (
            <span className="text-xs bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">×2</span>
          )}
        </div>

        {/* ── 생명력 소진 시 충전 버튼 ──────────────────────── */}
        {!isWin && livesEmpty && onBuyLives && (
          <button
            onClick={onBuyLives}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-white shadow-md active:scale-95 transition-all"
            style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)" }}
          >
            ❤️ {t("lives.chargeBtn")}
          </button>
        )}

        {/* ── 턴 연장 (턴 소진 패배 + onExtendTurns 있을 때) ── */}
        {!isWin && !livesEmpty && onExtendTurns && reviveAd !== "done" && (
          <button
            onClick={handleExtendTurnsAd}
            disabled={reviveAd === "watching"}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-white shadow-md active:scale-95 transition-all"
            style={{
              background: reviveAd === "watching"
                ? "linear-gradient(135deg,#93c5fd,#60a5fa)"
                : "linear-gradient(135deg,#3b82f6,#2563eb)",
              opacity: reviveAd === "watching" ? 0.75 : 1,
              cursor:  reviveAd === "watching" ? "wait" : "pointer",
            }}
          >
            {reviveAd === "watching" ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                {t("game.watchingAd")}
              </span>
            ) : "📺 " + (t("game.extendTurns") || "광고 보고 +30턴")}
          </button>
        )}

        {/* ── 부활하기 (보드 가득 찬 패배 + onRevive 있을 때만) */}
        {!isWin && !livesEmpty && onRevive && reviveAd !== "done" && (
          <button
            onClick={handleReviveAd}
            disabled={reviveAd === "watching"}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-white shadow-md active:scale-95 transition-all"
            style={{
              background: reviveAd === "watching"
                ? "linear-gradient(135deg,#86efac,#4ade80)"
                : "linear-gradient(135deg,#22c55e,#16a34a)",
              opacity: reviveAd === "watching" ? 0.75 : 1,
              cursor:  reviveAd === "watching" ? "wait" : "pointer",
            }}
          >
            {reviveAd === "watching" ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                {t("game.watchingAd")}
              </span>
            ) : isPremiumActive
              ? "✨ " + (t("game.reviveFree") || "무료 부활하기")
              : "📺 " + (t("game.reviveAd")  || "광고 보고 부활하기")}
          </button>
        )}

        {/* ── 코인 2배: 구독자 자동 / 비구독자 광고 ──── */}
        {isPremiumActive ? (
          <div
            className="w-full py-3 rounded-2xl border-2 text-center text-sm font-bold text-amber-600"
            style={{ background: "#fff8e1", borderColor: "#ffe082" }}
          >
            {t("game.premiumDoubleAuto")}
          </div>
        ) : !multiplied ? (
          <button
            onClick={handleWatchAd}
            disabled={adState === "watching"}
            className="w-full py-3 rounded-2xl font-bold text-sm transition-all duration-200 border-2 text-amber-600 active:scale-95"
            style={{
              background:  "#fff8e1",
              borderColor: "#ffe082",
              opacity:     adState === "watching" ? 0.6 : 1,
              cursor:      adState === "watching" ? "wait" : "pointer",
            }}
          >
            {adState === "watching" ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                {t("game.watchingAd")}
              </span>
            ) : t("game.watchAdDouble")}
          </button>
        ) : (
          <div
            className="w-full py-3 rounded-2xl border-2 text-center text-sm font-bold text-amber-600"
            style={{ background: "#fff8e1", borderColor: "#ffe082" }}
          >
            {t("game.doubleApplied")}
          </div>
        )}

        {/* ── 액션 버튼 ───────────────────────────────── */}
        <div className="flex gap-3">
          <button
            onClick={() => onConfirm(finalCoins, "home")}
            className="flex-1 py-3 rounded-2xl font-bold text-sm active:scale-95 transition-all"
            style={{ background: theme.btnSecondary, color: theme.textSecondary }}
          >
            {t("game.home")}
          </button>
          <button
            onClick={() => onConfirm(finalCoins, "reset")}
            className="flex-2 flex-[2] py-3 rounded-2xl font-bold text-sm shadow-sm active:scale-95 transition-all"
            style={{ background: theme.btnPrimary, color: theme.btnPrimaryText }}
          >
            {isWin ? t("game.nextStage") : t("game.tryAgain")}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
