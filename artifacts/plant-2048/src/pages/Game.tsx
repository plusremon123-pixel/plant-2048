/* ============================================================
 * Game.tsx
 * 게임 화면 페이지 컴포넌트
 *
 * Props:
 *  - themeId:   현재 테마
 *  - player:    현재 플레이어 데이터 (XP 계산에 사용)
 *  - onEarnXp:  XP 지급 콜백 (App에서 전달)
 *  - onHome:    홈 화면으로 이동 콜백
 * ============================================================ */

import { useState, useRef, useEffect } from "react";
import { useGame } from "@/hooks/useGame";
import { Board } from "@/components/Board";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { GameEndModal } from "@/components/GameEndModal";
import { TileStagePanel } from "@/components/TileStagePanel";
import { PlayerData } from "@/utils/playerData";
import { ApplyXpResult } from "@/hooks/usePlayer";

interface GameProps {
  themeId: string;
  player: PlayerData;
  onEarnXp: (xp: number) => ApplyXpResult;
  onHome: () => void;
}

export default function Game({ themeId, player, onEarnXp, onHome }: GameProps) {
  const {
    activeTiles,
    graveyard,
    score,
    bestScore,
    highestTile,
    hasLost,
    hasWon,
    showWinModal,
    handleMove,
    resetGame,
    playOn,
  } = useGame();

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showHomeConfirm,  setShowHomeConfirm]  = useState(false);

  /* ── 게임 종료 모달 상태 ─────────────────────────────── */
  /* 같은 게임 종료에 XP가 두 번 지급되지 않도록 ref로 추적 */
  const xpAwardedRef = useRef(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [endIsWin, setEndIsWin]         = useState(false);
  const [endScore, setEndScore]         = useState(0);
  const [endTile, setEndTile]           = useState(0);
  /* 모달이 열릴 때의 플레이어 스냅샷 (XP 계산 기준) */
  const [playerSnapshot, setPlayerSnapshot] = useState<PlayerData>(player);

  /* hasLost / showWinModal 변화 감지 → 종료 모달 트리거 */
  useEffect(() => {
    if ((hasLost || showWinModal) && !xpAwardedRef.current && !showEndModal) {
      xpAwardedRef.current = true;
      setEndIsWin(showWinModal);
      setEndScore(score);
      setEndTile(highestTile);
      setPlayerSnapshot({ ...player }); /* 현재 플레이어 상태 스냅샷 */
      setShowEndModal(true);
    }
  }, [hasLost, showWinModal]); // eslint-disable-line react-hooks/exhaustive-deps

  const tilesList = Object.values(activeTiles);

  /* ── 게임 종료 모달 확인 ─────────────────────────────── */
  const handleEndConfirm = (earnedXp: number, action: "reset" | "home") => {
    onEarnXp(earnedXp);  /* XP 지급 */
    setShowEndModal(false);
    xpAwardedRef.current = false; /* 다음 게임을 위해 초기화 */
    if (action === "reset") {
      resetGame();
    } else {
      resetGame();
      onHome();
    }
  };

  /* ── 새 게임 / 홈 버튼 처리 ──────────────────────────── */
  const handleResetRequest = () => {
    if (showEndModal) return; /* 종료 모달 중에는 무시 */
    /* 항상 확인 다이얼로그를 표시 */
    setShowResetConfirm(true);
  };

  const handleHomeRequest = () => {
    if (showEndModal) return;
    if (score > 0 && !hasLost && !showWinModal) {
      setShowHomeConfirm(true);
    } else {
      onHome();
    }
  };

  const confirmReset = () => {
    setShowResetConfirm(false);
    xpAwardedRef.current = false;
    resetGame();
  };

  const confirmHome = () => {
    setShowHomeConfirm(false);
    xpAwardedRef.current = false;
    resetGame();
    onHome();
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center bg-background">

      {/* ── 상단 타일 단계 패널 ──────────────────────────── */}
      <TileStagePanel highestTile={highestTile} variant="top" />

      {/* ── 메인 콘텐츠 ──────────────────────────────────── */}
      <div className="w-full max-w-[500px] flex flex-col flex-1 px-4 pb-4">

        <Header
          score={score}
          bestScore={bestScore}
          themeId={themeId}
          player={player}
          onReset={handleResetRequest}
          onHome={handleHomeRequest}
        />

        <main className="w-full flex-1 flex flex-col justify-center">
          <Board
            tiles={tilesList}
            graveyard={graveyard}
            onSwipe={handleMove}
            themeId={themeId}
          />
        </main>

        {/* ── 하단 타일 단계 패널 ──────────────────────────── */}
        <TileStagePanel highestTile={highestTile} variant="bottom" />

      </div>

      {/* ── 모달 레이어 ─────────────────────────────────── */}

      {/* 게임 종료 모달 (게임 오버 / 승리 공통) */}
      <GameEndModal
        isOpen={showEndModal}
        isWin={endIsWin}
        score={endScore}
        highestTile={endTile}
        player={playerSnapshot}
        onConfirm={handleEndConfirm}
      />

      {/* 승리 후 계속 플레이 — 이미 종료 모달에서 처리하므로 종료 모달이 닫힌 후에만 표시 */}
      {!showEndModal && showWinModal && (
        <Modal
          isOpen={true}
          type="success"
          title="전설의 꽃이 피었어요!"
          description="계속 더 높은 타일에 도전해보세요!"
          primaryAction={{ label: "계속 플레이", onClick: playOn }}
          secondaryAction={{ label: "새 게임", onClick: resetGame }}
        />
      )}

      {/* 새 게임 확인 모달 */}
      <Modal
        isOpen={showResetConfirm}
        type="info"
        title="새 게임 시작"
        description="진행 중인 게임이 초기화됩니다. 정말 다시 시작할까요?"
        primaryAction={{ label: "네, 다시 할래요", onClick: confirmReset }}
        secondaryAction={{ label: "취소", onClick: () => setShowResetConfirm(false) }}
      />

      {/* 홈 이동 확인 모달 */}
      <Modal
        isOpen={showHomeConfirm}
        type="info"
        title="홈으로 돌아가기"
        description="진행 중인 게임이 종료됩니다. 홈 화면으로 돌아갈까요?"
        primaryAction={{ label: "홈으로", onClick: confirmHome }}
        secondaryAction={{ label: "계속 플레이", onClick: () => setShowHomeConfirm(false) }}
      />

    </div>
  );
}
