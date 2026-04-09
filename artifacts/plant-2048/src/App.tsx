/* ============================================================
 * App.tsx
 * 앱 루트 컴포넌트
 *
 * - useAppState:  화면 전환 + 테마 선택
 * - usePlayer:    레벨/XP/코인 상태 (앱 전체에서 공유)
 * - useMissions:  일일 미션 상태 (앱 전체에서 공유)
 *
 * 화면 전환 방식:
 *   두 화면을 200vw 트랙에 배치 → translateX 슬라이드
 * ============================================================ */

import { useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { usePlayer } from "@/hooks/usePlayer";
import { useMissions } from "@/hooks/useMissions";
import { useSettings } from "@/hooks/useSettings";
import { useSubscription } from "@/hooks/useSubscription";
import { FrontScreen } from "@/components/FrontScreen";
import Game from "@/pages/Game";
import EndlessGame from "@/pages/EndlessGame";
import {
  loadEndlessSave,
  type EndlessDifficulty,
  type EndlessSaveData,
} from "@/utils/endlessModeData";
import { giveInitialGiftIfNeeded } from "@/utils/economyUtils";
import {
  loadInventory, saveInventory,
  type Inventory, type ShopItemId,
} from "@/utils/shopData";

/* ── 초기 선물: 훅 실행 전 localStorage에 직접 반영 ─────── */
giveInitialGiftIfNeeded();

export default function App() {
  const { currentScreen, selectedThemeId, selectTheme, goToGame, goToEndless, goToFront } =
    useAppState();

  /* ── 무한 모드 상태 ─────────────────────────────────────── */
  const [endlessDifficulty, setEndlessDifficulty] = useState<EndlessDifficulty>("easy");
  const [endlessResumeSave, setEndlessResumeSave] = useState<EndlessSaveData | null>(null);
  const { player, earnXp, clearLevel, spendCoins, addCoins, reloadPlayer } = usePlayer();
  const {
    missions, updateMission, claimMission,
    weeklyMissions, updateWeeklyMission, claimWeeklyMission,
  } = useMissions();
  const { settings, toggleSetting } = useSettings();
  const { sub, active: isPremiumActive, startTrial, buyPremium } = useSubscription();

  /* ── 인벤토리 (홈 상점용 — Game.tsx의 useShop과 별개로 관리) */
  const [inventory, setInventory] = useState<Inventory>(loadInventory);

  const atFront   = currentScreen === "front";
  const atEndless = currentScreen === "endless";

  /* 일일 미션 보상 수령 → 코인 지급 */
  const handleClaimMission = (id: Parameters<typeof claimMission>[0]): number => {
    const coins = claimMission(id);
    if (coins > 0) addCoins(coins);
    return coins;
  };

  /* 주간 미션 보상 수령 → 코인 지급 */
  const handleClaimWeeklyMission = (id: Parameters<typeof claimWeeklyMission>[0]): number => {
    const coins = claimWeeklyMission(id);
    if (coins > 0) addCoins(coins);
    return coins;
  };

  /* ── 홈 상점에서 아이템 구매 */
  const handleBuyItem = (id: ShopItemId, cost: number): boolean => {
    const ok = spendCoins(cost);
    if (!ok) return false;
    setInventory((prev) => {
      const next: Inventory = { ...prev, [id]: (prev[id] ?? 0) + 1 };
      saveInventory(next);
      return next;
    });
    return true;
  };

  /* 무한 모드 시작 */
  const handleStartEndless = (difficulty: EndlessDifficulty, resume: boolean) => {
    setEndlessDifficulty(difficulty);
    setEndlessResumeSave(resume ? loadEndlessSave() : null);
    goToEndless();
  };

  /* 홈 화면으로 돌아올 때 플레이어/인벤토리 동기화 */
  const handleGoToFront = () => {
    reloadPlayer();
    setInventory(loadInventory()); // Game.tsx에서 구매한 아이템 반영
    goToFront();
  };

  return (
    <div
      className="fixed inset-0"
      style={{ clipPath: "inset(0 0 0 0)" }}
    >
      {/* 슬라이딩 트랙 */}
      <div
        className="flex h-full transition-transform duration-[350ms] ease-in-out"
        style={{
          width:     "200vw",
          transform: atFront ? "translateX(0)" : "translateX(-50%)",
        }}
      >
        {/* ── FrontScreen (왼쪽 패널) ────────────────── */}
        <div
          className="w-[100vw] h-full overflow-hidden"
          style={{ visibility: atFront ? "visible" : "hidden" }}
          aria-hidden={!atFront}
        >
          <FrontScreen
            player={player}
            selectedThemeId={selectedThemeId}
            onSelectTheme={selectTheme}
            onStartGame={goToGame}
            missions={missions}
            onClaimMission={handleClaimMission}
            weeklyMissions={weeklyMissions}
            onClaimWeeklyMission={handleClaimWeeklyMission}
            onEarnCoins={addCoins}
            onAdWatched={() => updateWeeklyMission("ad_reward_3")}
            inventory={inventory}
            onBuyItem={handleBuyItem}
            settings={settings}
            onToggleSetting={toggleSetting}
            isPremiumActive={isPremiumActive}
            onBuyPremium={buyPremium}
            onStartEndless={handleStartEndless}
          />
        </div>

        {/* ── GameScreen / EndlessGame (오른쪽 패널) ── */}
        <div
          className="w-[100vw] h-full overflow-y-auto"
          style={{ visibility: atFront ? "hidden" : "visible" }}
          aria-hidden={atFront}
        >
          {atEndless ? (
            <EndlessGame
              difficulty={endlessDifficulty}
              resumeSave={endlessResumeSave}
              onHome={handleGoToFront}
              onEarnCoins={addCoins}
            />
          ) : (
            <Game
              themeId={selectedThemeId}
              isActive={!atFront && !atEndless}
              player={player}
              onEarnXp={earnXp}
              onClearLevel={clearLevel}
              onEarnCoins={addCoins}
              onSpendCoins={spendCoins}
              onHome={handleGoToFront}
              onThemeChange={selectTheme}
              updateMission={updateMission}
              updateWeeklyMission={updateWeeklyMission}
              subscriptionState={sub}
              onStartTrial={startTrial}
              onBuyPremium={buyPremium}
            />
          )}
        </div>
      </div>
    </div>
  );
}
