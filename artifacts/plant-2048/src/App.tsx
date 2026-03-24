/* ============================================================
 * App.tsx
 * 앱 루트 컴포넌트
 *
 * - useAppState: 화면 전환 + 테마 선택
 * - usePlayer: 레벨/XP/코인 상태 (앱 전체에서 공유)
 *
 * 화면 전환 방식:
 *   두 화면을 200vw 트랙에 배치 → translateX 슬라이드
 *   비활성 패널은 visibility: hidden 처리로 내용이 새어나오지 않게 함
 * ============================================================ */

import { useAppState } from "@/hooks/useAppState";
import { usePlayer } from "@/hooks/usePlayer";
import { FrontScreen } from "@/components/FrontScreen";
import Game from "@/pages/Game";

export default function App() {
  const { currentScreen, selectedThemeId, selectTheme, goToGame, goToFront } =
    useAppState();
  const { player, earnXp } = usePlayer();

  const atFront = currentScreen === "front";

  return (
    /* clip-path: inset(0)는 transform된 자식 요소도 뷰포트에 맞게 정확히 잘라냅니다 */
    <div
      className="fixed inset-0"
      style={{ clipPath: "inset(0 0 0 0)" }}
    >
      {/* 슬라이딩 트랙 */}
      <div
        className="flex h-full transition-transform duration-[350ms] ease-in-out"
        style={{
          width: "200vw",
          transform: atFront ? "translateX(0)" : "translateX(-50%)",
        }}
      >
        {/* ── FrontScreen (왼쪽 패널) ────────────────── */}
        <div
          className="w-[100vw] h-full overflow-y-auto"
          style={{ visibility: atFront ? "visible" : "hidden" }}
          aria-hidden={!atFront}
        >
          <FrontScreen
            player={player}
            selectedThemeId={selectedThemeId}
            onSelectTheme={selectTheme}
            onStartGame={goToGame}
          />
        </div>

        {/* ── GameScreen (오른쪽 패널) ───────────────── */}
        <div
          className="w-[100vw] h-full overflow-y-auto"
          style={{ visibility: atFront ? "hidden" : "visible" }}
          aria-hidden={atFront}
        >
          <Game
            themeId={selectedThemeId}
            player={player}
            onEarnXp={earnXp}
            onHome={goToFront}
          />
        </div>
      </div>
    </div>
  );
}
