/* ============================================================
 * GameEndModal.tsx
 * 게임 종료(게임 오버 / 승리) 전용 모달
 *
 * 기능:
 *  - XP 획득 내역 표시 (기본/점수/타일/승리 보너스)
 *  - "광고 보고 XP 2배 받기" 버튼 (mock 광고)
 *  - XP 바 애니메이션 (현재 → 새 XP)
 *  - 레벨업 여부 표시
 *  - 새 게임 / 홈으로 버튼
 * ============================================================ */

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  PlayerData,
  calculateGameXp,
  applyXp,
  xpForNextLevel,
} from "@/utils/playerData";
import { watchAd } from "@/utils/adService";

interface GameEndModalProps {
  isOpen: boolean;
  isWin: boolean;
  score: number;
  highestTile: number;
  player: PlayerData;           /* XP 적용 전 현재 플레이어 상태 */
  /**
   * 사용자가 확인 버튼을 누를 때 호출.
   * earnedXp: 최종 지급할 XP (2x 포함)
   * action: 'reset' | 'home'
   */
  onConfirm: (earnedXp: number, action: "reset" | "home") => void;
}

type AdState = "idle" | "watching" | "done";

export function GameEndModal({
  isOpen,
  isWin,
  score,
  highestTile,
  player,
  onConfirm,
}: GameEndModalProps) {
  /* ── XP 계산 (한 번만) ──────────────────────────────── */
  const baseXpRef = useRef(0);
  useEffect(() => {
    if (isOpen) {
      baseXpRef.current = calculateGameXp(score, highestTile, isWin);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  const baseXp = baseXpRef.current;

  /* ── 상태 ───────────────────────────────────────────── */
  const [adState, setAdState] = useState<AdState>("idle");
  const [multiplied, setMultiplied] = useState(false);
  /* XP 바 애니메이션을 위해 "보여줄" progress 값 */
  const [barAnimated, setBarAnimated] = useState(false);

  /* 모달이 열릴 때마다 상태 초기화 */
  useEffect(() => {
    if (!isOpen) return;
    setAdState("idle");
    setMultiplied(false);
    setBarAnimated(false);
    /* 약간의 지연 후 바 애니메이션 시작 */
    const t = setTimeout(() => setBarAnimated(true), 300);
    return () => clearTimeout(t);
  }, [isOpen]);

  if (!isOpen) return null;

  /* ── 최종 XP & 플레이어 미리보기 ───────────────────── */
  const finalXp    = baseXp * (multiplied ? 2 : 1);
  const preview    = applyXp(player, barAnimated ? finalXp : 0);
  const didLevelUp = preview.levelsGained > 0;

  /* 진행 바 수치 */
  const displayLevel = barAnimated ? preview.newPlayer.level : player.level;
  const displayXp    = barAnimated ? preview.newPlayer.xp   : player.xp;
  const needed       = xpForNextLevel(displayLevel);
  const pct          = Math.min((displayXp / needed) * 100, 100);

  /* ── 광고 시청 ──────────────────────────────────────── */
  const handleWatchAd = async () => {
    if (adState !== "idle" || multiplied) return;
    setAdState("watching");
    const success = await watchAd();
    if (success) {
      setMultiplied(true);
      setAdState("done");
    } else {
      setAdState("idle"); /* 실패 시 재시도 가능 */
    }
  };

  /* ── XP 세부 내역 ───────────────────────────────────── */
  const baseParticipation = 10;
  const scoreXp           = Math.floor(score / 40);
  const tileBonus         = highestTile >= 2
    ? Math.floor(Math.log2(highestTile) * 3) : 0;
  const winBonus          = isWin ? 50 : 0;

  return createPortal(
    /* 오버레이 */
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl flex flex-col gap-5 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">

        {/* ── 제목 ────────────────────────────────────── */}
        <div className="text-center">
          <div className="text-4xl mb-2">{isWin ? "🌸" : "😢"}</div>
          <h2 className="text-xl font-display font-bold text-foreground">
            {isWin ? "전설의 꽃이 피었어요!" : "게임 오버"}
          </h2>
          <p className="text-sm text-foreground/50 mt-0.5">
            점수: <span className="font-bold text-foreground">{score.toLocaleString()}</span>
            &nbsp;·&nbsp;최고 타일: <span className="font-bold text-foreground">{highestTile}</span>
          </p>
        </div>

        {/* ── XP 획득 내역 ─────────────────────────── */}
        <div className="bg-board/60 rounded-2xl p-4 flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground/40 mb-1">이번 판 XP</p>
          <XpRow label="기본 참여"    xp={baseParticipation} />
          <XpRow label="점수 보너스"  xp={scoreXp}  />
          <XpRow label={`최고 타일 (${highestTile})`} xp={tileBonus} />
          {isWin && <XpRow label="2048 달성 🎉" xp={winBonus} highlight />}
          <div className="border-t border-board mt-1 pt-2 flex justify-between items-center">
            <span className="text-sm font-bold text-foreground">합계</span>
            <span className={`text-lg font-display font-bold ${multiplied ? "text-amber-500" : "text-primary"}`}>
              +{finalXp.toLocaleString()} XP
              {multiplied && <span className="ml-1 text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">×2</span>}
            </span>
          </div>
        </div>

        {/* ── XP 진행 바 ──────────────────────────── */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-primary">Lv.{displayLevel}</span>
            <span className="text-foreground/40">{displayXp} / {needed} XP</span>
          </div>
          <div className="w-full h-3 bg-board rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          {/* 레벨업 알림 */}
          {didLevelUp && barAnimated && (
            <div className="flex items-center justify-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl py-2 animate-in fade-in duration-500">
              <span className="text-base">🎊</span>
              <span className="text-sm font-bold text-amber-600">
                레벨 업! Lv.{player.level} → Lv.{preview.newPlayer.level}
              </span>
            </div>
          )}
          {/* 레벨업 보상 */}
          {didLevelUp && barAnimated && preview.rewards.length > 0 && (
            <div className="flex flex-col gap-1">
              {preview.rewards.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                  <span>🪙</span>
                  <span>{r.description} (+{r.amount} 코인)</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 광고 보고 XP 2배 버튼 ───────────────── */}
        {!multiplied ? (
          <button
            onClick={handleWatchAd}
            disabled={adState === "watching"}
            className={[
              "w-full py-3 rounded-2xl font-bold text-sm transition-all duration-200 border-2",
              adState === "watching"
                ? "border-amber-200 bg-amber-50 text-amber-400 cursor-wait"
                : "border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100 active:scale-95",
            ].join(" ")}
          >
            {adState === "watching" ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                광고 시청 중...
              </span>
            ) : (
              "📺 광고 보고 XP 2배 받기"
            )}
          </button>
        ) : (
          <div className="w-full py-3 rounded-2xl bg-amber-50 border-2 border-amber-300 text-center text-sm font-bold text-amber-600">
            ✓ XP 2배 적용됨!
          </div>
        )}

        {/* ── 액션 버튼 ───────────────────────────── */}
        <div className="flex gap-3">
          <button
            onClick={() => onConfirm(finalXp, "home")}
            className="flex-1 py-3 rounded-2xl bg-board text-foreground/70 font-bold text-sm hover:bg-cell active:scale-95 transition-all"
          >
            홈으로
          </button>
          <button
            onClick={() => onConfirm(finalXp, "reset")}
            className="flex-2 flex-[2] py-3 rounded-2xl bg-primary text-white font-bold text-sm shadow-sm hover:bg-primary-hover active:scale-95 transition-all"
          >
            새 게임 시작
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

/* ── XP 항목 행 ─────────────────────────────────────────── */
function XpRow({ label, xp, highlight }: { label: string; xp: number; highlight?: boolean }) {
  if (xp === 0) return null;
  return (
    <div className="flex justify-between items-center text-sm">
      <span className={highlight ? "font-bold text-emerald-600" : "text-foreground/60"}>{label}</span>
      <span className={`font-bold ${highlight ? "text-emerald-600" : "text-foreground"}`}>+{xp}</span>
    </div>
  );
}
