import { useState } from "react";
import { useGame } from "@/hooks/useGame";
import { Board } from "@/components/Board";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";

export default function Game() {
  const { 
    activeTiles, 
    graveyard, 
    score, 
    bestScore, 
    hasLost, 
    showWinModal, 
    handleMove, 
    resetGame, 
    playOn 
  } = useGame();

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const tilesList = Object.values(activeTiles);

  const handleResetRequest = () => {
    if (score > 0 && !hasLost && !showWinModal) {
      setShowResetConfirm(true);
    } else {
      resetGame();
    }
  };

  const confirmReset = () => {
    setShowResetConfirm(false);
    resetGame();
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 md:p-8 bg-background">
      <div className="w-full max-w-[500px] flex flex-col">
        
        <Header 
          score={score} 
          bestScore={bestScore} 
          onReset={handleResetRequest} 
        />

        <main className="w-full">
          <Board 
            tiles={tilesList} 
            graveyard={graveyard} 
            onSwipe={handleMove} 
          />
        </main>

        <footer className="mt-12 text-center text-muted-foreground/60 text-sm pb-8">
          <p>방향키나 화면을 스와이프해서 조작하세요.</p>
        </footer>

      </div>

      {/* Modals */}
      <Modal 
        isOpen={showWinModal}
        type="success"
        title="전설의 꽃이 피었어요!"
        description={`축하합니다! 놀라운 식물 키우기 실력이네요. (점수: ${score})`}
        primaryAction={{ label: "계속 플레이", onClick: playOn }}
        secondaryAction={{ label: "새 게임 시작", onClick: resetGame }}
      />

      <Modal 
        isOpen={hasLost}
        type="danger"
        title="더 이상 움직일 수 없어요"
        description={`화분에 자리가 없네요. 최고 점수는 ${bestScore}점 입니다!`}
        primaryAction={{ label: "새 게임 시작", onClick: resetGame }}
      />

      <Modal 
        isOpen={showResetConfirm}
        type="info"
        title="새 게임 시작"
        description="진행 중인 게임이 초기화됩니다. 정말 다시 시작할까요?"
        primaryAction={{ label: "네, 다시 할래요", onClick: confirmReset }}
        secondaryAction={{ label: "취소", onClick: () => setShowResetConfirm(false) }}
      />

    </div>
  );
}
