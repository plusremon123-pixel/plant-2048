/* ============================================================
 * EndlessGame.tsx
 * 무한 모드 — 다크 코즈믹 가든 테마
 * ============================================================ */

import { useEffect, useRef, useState, useCallback } from "react";
import { useGame }        from "@/hooks/useGame";
import { Board }          from "@/components/Board";
import { useTranslation } from "@/i18n";
import type { TileData }  from "@/utils/gameUtils";
import {
  ENDLESS_CONFIGS,
  loadEndlessSave,
  saveEndlessState,
  clearEndlessSave,
  checkNewPhaseAchieved,
  type EndlessConfig,
  type EndlessDifficulty,
  type EndlessSaveData,
} from "@/utils/endlessModeData";
import type { ShopItemId }      from "@/utils/shopData";
import { loadInventory, saveInventory } from "@/utils/shopData";
import { EndlessRewardModal }   from "@/components/modals/EndlessRewardModal";
import { EndlessGameOverModal } from "@/components/modals/EndlessGameOverModal";
import { EndlessClearModal }    from "@/components/modals/EndlessClearModal";

/* ── 별 파티클 (렌더링 시 한 번만 생성) ───────────────────── */
const STARS = Array.from({ length: 28 }, (_, i) => ({
  id:    i,
  left:  `${(i * 37 + 11) % 100}%`,
  top:   `${(i * 53 + 7)  % 85}%`,
  size:  (i % 3 === 0) ? 3 : (i % 3 === 1) ? 2 : 1.5,
  delay: `${(i * 0.41) % 3}s`,
  dur:   `${2.2 + (i % 5) * 0.6}s`,
}));

/* ── 난이도 팔레트 ─────────────────────────────────────────── */
const DIFF_PALETTE: Record<EndlessDifficulty, {
  accent: string; glow: string; badge: string; emoji: string;
}> = {
  easy:   { accent: "#4ade80", glow: "rgba(74,222,128,0.55)",  badge: "#166534", emoji: "🌱" },
  normal: { accent: "#facc15", glow: "rgba(250,204,21,0.55)",  badge: "#854d0e", emoji: "🌿" },
  hard:   { accent: "#f87171", glow: "rgba(248,113,113,0.55)", badge: "#991b1b", emoji: "🌵" },
};

/* ── 인벤토리 헬퍼 ─────────────────────────────────────────── */
function addItem(itemId: ShopItemId, qty: number) {
  const inv = loadInventory();
  inv[itemId] = (inv[itemId] ?? 0) + qty;
  saveInventory(inv);
}

/* ── Props ─────────────────────────────────────────────────── */
interface EndlessGameProps {
  difficulty:       EndlessDifficulty;
  resumeSave?:      EndlessSaveData | null;
  onHome:           () => void;         // 메인 홈 (현재 미사용)
  onEndlessHome:    () => void;         // 무한게임 선택 화면으로
  onEarnCoins:      (coins: number) => void;
  isPremiumActive?: boolean;            // 구독자: 광고 없이 무료 부활
}

/* ── 무한 게임 부활 최대 횟수 ─────────────────────────────── */
const MAX_REVIVES = 3;

/* ── 새로고침 횟수 5회마다 AD 표시 ────────────────────────── */
const AD_EVERY_N = 5;

/* ============================================================
 * 메인 컴포넌트
 * ============================================================ */
export default function EndlessGame({
  difficulty, resumeSave, onEndlessHome, onEarnCoins, isPremiumActive = false,
}: EndlessGameProps) {
  const { t }    = useTranslation();
  const config   = ENDLESS_CONFIGS[difficulty];
  const gridSize = config.boardSize;
  const pal      = DIFF_PALETTE[difficulty];

  const initialGameState = resumeSave ? {
    board:       resumeSave.board,
    activeTiles: resumeSave.activeTiles,
    graveyard:   [],
    score:       resumeSave.score,
    hasWon:      false,
    hasLost:     false,
    boardSize:   gridSize,
    goalValue:   Number.POSITIVE_INFINITY,   // 무한 모드 = 승리 조건 없음
    maxTurns:    -1,                          // 무제한 턴
    turnsLeft:   -1,                          // 무제한 턴
    thornImmunityTurns: 0,
  } : undefined;

  const {
    board, activeTiles, graveyard,
    score, hasLost, highestTile,
    handleMove, resetGame, undoMultiple,
  } = useGame(undefined, gridSize, initialGameState, { goalValue: Number.POSITIVE_INFINITY });

  const [claimedPhases,    setClaimedPhases]    = useState<number[]>(resumeSave?.claimedPhases ?? []);
  const [pendingReward,    setPendingReward]     = useState<{ phase: 1|2|3 } | null>(null);
  const [showGameOver,     setShowGameOver]      = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showAd,           setShowAd]           = useState(false);
  const [restartCount,     setRestartCount]     = useState(0);
  const [scoreBump,        setScoreBump]        = useState(false);
  const [showUltimateClear, setShowUltimateClear] = useState(false);
  const [reviveCount,      setReviveCount]      = useState(0);       // 부활 횟수 (최대 MAX_REVIVES)
  const prevHighestRef = useRef<number>(-1);
  const prevScoreRef   = useRef<number>(-1);
  const pendingRestartRef = useRef(false); // AD 후 재시작 대기
  const ultimateTriggeredRef = useRef(false); // 32768 달성 1회만 트리거

  const tilesList     = Object.values(activeTiles as Record<string, TileData>);
  const graveyardList = graveyard as TileData[];

  /* 자동 저장 */
  useEffect(() => {
    if (hasLost) return;
    saveEndlessState({ difficulty, board, activeTiles: activeTiles as Record<string, TileData>, score, claimedPhases });
  }, [board, score, claimedPhases, hasLost, difficulty]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 단계 달성 감지 */
  useEffect(() => {
    if (prevHighestRef.current < 0) { prevHighestRef.current = highestTile; return; }
    if (highestTile <= prevHighestRef.current) return;
    prevHighestRef.current = highestTile;
    if (pendingReward) return;
    const achieved = checkNewPhaseAchieved(highestTile, config, claimedPhases);
    if (achieved !== null) setPendingReward({ phase: achieved as 1|2|3 });
  }, [highestTile]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 점수 변화 → bump */
  useEffect(() => {
    if (prevScoreRef.current < 0) { prevScoreRef.current = score; return; }
    if (score !== prevScoreRef.current) {
      prevScoreRef.current = score;
      setScoreBump(true);
    }
  }, [score]);

  /* 게임 오버 */
  useEffect(() => {
    if (hasLost && !pendingReward) setShowGameOver(true);
  }, [hasLost, pendingReward]);

  /* 궁극 클리어 감지 — 32,768 도달 */
  useEffect(() => {
    if (ultimateTriggeredRef.current) return;
    if (highestTile >= 32768) {
      ultimateTriggeredRef.current = true;
      setShowUltimateClear(true);
    }
  }, [highestTile]);

  /* ── 궁극 클리어 선물 수령 → 아이템 지급 후 홈 이동 ──── */
  const handleClaimUltimate = useCallback((gifts: { id: ShopItemId; qty: number }[]) => {
    gifts.forEach((g) => addItem(g.id, g.qty));
    clearEndlessSave();
    setShowUltimateClear(false);
    onEndlessHome();
  }, [onEndlessHome]);

  /* ── 실제 재시작 실행 ──────────────────────────────────── */
  const doRestart = useCallback(() => {
    clearEndlessSave();
    setClaimedPhases([]);
    setPendingReward(null);
    setShowGameOver(false);
    prevHighestRef.current = -1;
    prevScoreRef.current   = -1;
    resetGame();
  }, [resetGame]);

  /* ── 새로고침 버튼 클릭 → 확인 팝업 ─────────────────── */
  const handleRestartPress = () => {
    setShowRestartConfirm(true);
  };

  /* ── 확인 팝업에서 '재시작' 선택 ─────────────────────── */
  const handleRestartConfirm = () => {
    setShowRestartConfirm(false);
    const next = restartCount + 1;
    setRestartCount(next);
    if (next % AD_EVERY_N === 0) {
      // AD 표시 후 재시작
      pendingRestartRef.current = true;
      setShowAd(true);
    } else {
      doRestart();
    }
  };

  /* ── AD 닫기 → 재시작 실행 ───────────────────────────── */
  const handleAdClose = () => {
    setShowAd(false);
    if (pendingRestartRef.current) {
      pendingRestartRef.current = false;
      doRestart();
    }
  };

  const handleClaimReward = useCallback((gold: number) => {
    const phase = pendingReward!.phase;
    onEarnCoins(gold);
    setClaimedPhases((prev) => [...prev, phase]);
    setPendingReward(null);
    if (hasLost) setShowGameOver(true);
  }, [pendingReward, hasLost, onEarnCoins]);

  const handleClaimWithItem = useCallback((gold: number, itemId: ShopItemId) => {
    const phase = pendingReward!.phase;
    onEarnCoins(gold);
    addItem(itemId, 1);
    setClaimedPhases((prev) => [...prev, phase]);
    setPendingReward(null);
    if (hasLost) setShowGameOver(true);
  }, [pendingReward, hasLost, onEarnCoins]);

  const handleContinue = useCallback(() => {
    setReviveCount((c) => c + 1);   // 부활 횟수 증가
    setShowGameOver(false);
    undoMultiple(5);                 // 5턴 전 보드 복원
  }, [undoMultiple]);

  /* 단계 진행 */
  const currentPhaseIdx = claimedPhases.length;
  const nextGoal        = currentPhaseIdx < 3 ? config.goals[currentPhaseIdx] : null;
  const prevGoal        = currentPhaseIdx > 0 ? config.goals[currentPhaseIdx - 1] : 0;
  const progressPct     = nextGoal
    ? Math.min(100, Math.round(((highestTile - prevGoal) / (nextGoal - prevGoal)) * 100))
    : 100;

  /* 난이도 한국어 라벨 */
  const diffLabel = t(`endless.diff.${difficulty}`);

  return (
    <div
      className="relative min-h-[100dvh] w-full flex flex-col items-center overflow-hidden"
      style={{ background: "linear-gradient(170deg, #0d1520 0%, #0d2010 45%, #0a1a1a 100%)" }}
    >
      {/* ── 별 파티클 ────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {STARS.map((s) => (
          <div key={s.id} style={{
            position: "absolute", left: s.left, top: s.top,
            width: s.size, height: s.size, borderRadius: "50%", background: "#fff",
            animationName: "twinkle", animationDuration: s.dur, animationDelay: s.delay,
            animationTimingFunction: "ease-in-out", animationIterationCount: "infinite",
          }} />
        ))}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "45%",
          background: `radial-gradient(ellipse at 50% 100%, ${pal.glow} 0%, transparent 70%)`,
        }} />
      </div>

      <div className="relative z-10 w-full max-w-[500px] flex flex-col flex-1 px-4 pb-10">

        {/* ── 상단 HUD ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2 pb-3 gap-2">

          {/* 무한게임 홈 버튼 */}
          <button
            onClick={onEndlessHome}
            className="active:scale-95 transition-all"
            style={{
              padding: "8px 14px", borderRadius: 12,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.7)",
              fontSize: 18, lineHeight: 1,
            }}
            aria-label="무한게임 홈"
          >
            🏠
          </button>

          {/* 중앙: 난이도 뱃지 + 점수 */}
          <div className="flex flex-col items-center gap-1 flex-1">
            {/* 난이도 뱃지 */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 14px", borderRadius: 99,
              background: pal.badge,
              border: `1px solid ${pal.accent}60`,
              boxShadow: `0 0 12px ${pal.glow}`,
            }}>
              <span style={{ fontSize: 14 }}>{pal.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: pal.accent, letterSpacing: "0.04em" }}>
                {diffLabel}
              </span>
            </div>

            {/* 점수 */}
            <div
              className={scoreBump ? "endless-score-bump" : ""}
              onAnimationEnd={() => setScoreBump(false)}
              style={{ textAlign: "center" }}
            >
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 2 }}>
                SCORE
              </div>
              <div style={{
                fontSize: 32, fontWeight: 900, color: "#ffffff", lineHeight: 1,
                textShadow: `0 0 20px ${pal.glow}`,
                fontVariantNumeric: "tabular-nums",
              }}>
                {score.toLocaleString()}
              </div>
            </div>
          </div>

          {/* 최고 타일 + 새로고침 */}
          <div className="flex flex-col items-end gap-1.5">
            <button
              onClick={handleRestartPress}
              className="active:scale-95 transition-all"
              style={{
                padding: "8px 14px", borderRadius: 12,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.7)",
                fontSize: 18, lineHeight: 1,
              }}
              aria-label="새로고침"
            >
              ↺
            </button>
            <div style={{
              padding: "6px 14px", borderRadius: 14,
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${pal.accent}40`,
              textAlign: "center",
            }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 2 }}>
                BEST
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: pal.accent, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {highestTile || "—"}
              </div>
            </div>
          </div>
        </div>

        {/* ── 마일스톤 진행 바 ─────────────────────────────────── */}
        <MilestoneBar
          config={config}
          claimedPhases={claimedPhases}
          progressPct={progressPct}
          currentPhaseIdx={currentPhaseIdx}
          accent={pal.accent}
          glow={pal.glow}
        />

        {/* ── 게임 보드 ─────────────────────────────────────────── */}
        <main className="w-full flex-1 flex flex-col justify-center mt-3">
          <div style={{
            borderRadius: 24, padding: 3,
            background: `linear-gradient(135deg, ${pal.accent}60 0%, transparent 50%, ${pal.accent}30 100%)`,
            boxShadow: `0 0 40px ${pal.glow}, inset 0 0 20px rgba(0,0,0,0.4)`,
          }}>
            <div style={{ borderRadius: 22, overflow: "hidden", background: "rgba(0,0,0,0.25)" }}>
              <Board
                tiles={tilesList}
                graveyard={graveyardList}
                gridSize={gridSize}
                onSwipe={handleMove}
                themeId="plant"
              />
            </div>
          </div>
        </main>
      </div>

      {/* ── 새로고침 확인 팝업 ───────────────────────────────── */}
      {showRestartConfirm && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
          onClick={() => setShowRestartConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "calc(100% - 48px)", maxWidth: 300,
              borderRadius: 24,
              background: "linear-gradient(160deg, #1a1030 0%, #100818 100%)",
              border: "1.5px solid rgba(255,255,255,0.12)",
              boxShadow: "0 8px 48px rgba(0,0,0,0.7)",
              padding: "28px 24px 20px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            }}
          >
            <div style={{ fontSize: 40 }}>↺</div>
            <p style={{ fontSize: 18, fontWeight: 900, color: "#fff", textAlign: "center" }}>
              새로 시작할까요?
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textAlign: "center", lineHeight: 1.5, marginBottom: 4 }}>
              현재 게임 기록이 사라져요
            </p>
            <button
              onClick={handleRestartConfirm}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 14,
                background: "linear-gradient(135deg, #f87171 0%, #dc2626 100%)",
                border: "none", color: "#fff",
                fontSize: 16, fontWeight: 900, cursor: "pointer",
              }}
            >
              새로 시작
            </button>
            <button
              onClick={() => setShowRestartConfirm(false)}
              style={{
                width: "100%", padding: "13px 0", borderRadius: 14,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.55)",
                fontSize: 15, fontWeight: 700, cursor: "pointer",
              }}
            >
              계속 플레이
            </button>
          </div>
        </div>
      )}

      {/* ── AD 오버레이 (5회 새로고침마다) ──────────────────── */}
      {showAd && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: "rgba(0,0,0,0.92)" }}
        >
          <div style={{
            width: "calc(100% - 48px)", maxWidth: 320,
            borderRadius: 24,
            background: "#1a1a2e",
            border: "1.5px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 48px rgba(0,0,0,0.7)",
            padding: "32px 24px 24px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: "100%", height: 180, borderRadius: 16,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, color: "rgba(255,255,255,0.25)", fontWeight: 600,
              letterSpacing: "0.1em",
            }}>
              AD
            </div>
            <button
              onClick={handleAdClose}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 14,
                background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                border: "none", color: "#fff",
                fontSize: 16, fontWeight: 900, cursor: "pointer",
              }}
            >
              광고 닫기
            </button>
          </div>
        </div>
      )}

      {/* ── 단계 보상 모달 ──────────────────────────────────────── */}
      {pendingReward && (
        <EndlessRewardModal
          phase={pendingReward.phase}
          config={config}
          onClaim={handleClaimReward}
          onClaimWithItem={handleClaimWithItem}
        />
      )}

      {/* ── 게임 오버 모달 ──────────────────────────────────────── */}
      {showGameOver && !pendingReward && !showUltimateClear && (
        <EndlessGameOverModal
          score={score}
          highestTile={highestTile}
          revived={reviveCount >= MAX_REVIVES}
          isPremiumActive={isPremiumActive}
          onContinue={handleContinue}
          onRestart={doRestart}
          onHome={onEndlessHome}
        />
      )}

      {/* ── 궁극 클리어 모달 (32,768 달성) ──────────────────── */}
      {showUltimateClear && (
        <EndlessClearModal onClaim={handleClaimUltimate} />
      )}
    </div>
  );
}

/* ============================================================
 * MilestoneBar
 * ============================================================ */
interface MilestoneBarProps {
  config:          EndlessConfig;
  claimedPhases:   number[];
  progressPct:     number;
  currentPhaseIdx: number;
  accent:          string;
  glow:            string;
}

function MilestoneBar({ config, claimedPhases, progressPct, currentPhaseIdx, accent, glow }: MilestoneBarProps) {
  const allCleared = currentPhaseIdx >= 3;

  return (
    <div style={{
      padding: "10px 14px", borderRadius: 18,
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.08)",
    }}>
      {/* 상단 라벨 */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", marginBottom: 1 }}>
            {allCleared ? "🏆 ALL CLEARED" : `PHASE ${currentPhaseIdx + 1}`}
          </div>
          {!allCleared && (
            <div style={{ fontSize: 14, fontWeight: 900, color: "#ffffff", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {config.goals[currentPhaseIdx].toLocaleString()}
            </div>
          )}
        </div>
        {!allCleared && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", marginBottom: 1 }}>
              진행
            </div>
            <div style={{ fontSize: 14, fontWeight: 900, color: accent, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {Math.round(progressPct)}%
            </div>
          </div>
        )}
      </div>

      {/* 진행 바 */}
      <div className="relative">
        <div style={{
          height: 8, borderRadius: 99,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden", marginBottom: 8,
        }}>
          <div style={{
            height: "100%",
            width: allCleared ? "100%" : `${progressPct}%`,
            borderRadius: 99,
            background: `linear-gradient(90deg, ${accent}80 0%, ${accent} 100%)`,
            boxShadow: `0 0 10px ${glow}`,
            transition: "width 0.5s ease",
          }} />
        </div>

        {/* 3개 마일스톤 */}
        <div className="flex items-center justify-between">
          {[0, 1, 2].map((i) => {
            const claimed = claimedPhases.includes(i + 1);
            const active  = !claimed && i === currentPhaseIdx;
            return (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <div
                  className={claimed ? "milestone-glow" : ""}
                  style={{
                    width: claimed ? 28 : active ? 24 : 20,
                    height: claimed ? 28 : active ? 24 : 20,
                    borderRadius: "50%",
                    background: claimed ? accent : active ? `${accent}30` : "rgba(255,255,255,0.06)",
                    border: `2px solid ${claimed ? accent : active ? `${accent}80` : "rgba(255,255,255,0.12)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: claimed ? 13 : 10,
                    transition: "all 0.3s",
                    animation: claimed ? "milestoneUnlock 0.5s ease-out" : undefined,
                  }}
                >
                  {claimed ? "⭐" : (
                    <span style={{ color: active ? accent : "rgba(255,255,255,0.25)", fontWeight: 900, fontSize: 10 }}>
                      {i + 1}
                    </span>
                  )}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: claimed ? accent : "rgba(255,255,255,0.3)",
                  letterSpacing: "0.04em",
                }}>
                  {config.goals[i] >= 1000 ? `${config.goals[i] / 1000}K` : config.goals[i]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
