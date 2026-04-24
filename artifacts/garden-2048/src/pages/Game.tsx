/* ============================================================
 * Game.tsx
 * 게임 화면 페이지 컴포넌트
 *
 * Props:
 *  - themeId:        현재 테마
 *  - player:         현재 플레이어 데이터
 *  - onEarnCoins:    코인 추가 콜백 (App에서 전달)
 *  - onSpendCoins:   코인 차감 콜백 (App에서 전달)
 *  - onHome:         홈 화면으로 이동 콜백
 *  - updateMission:  미션 진행 업데이트 콜백 (App에서 전달)
 * ============================================================ */

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "@/i18n";
import { useGame } from "@/hooks/useGame";
import { useShop } from "@/hooks/useShop";
import { useLoadout, type LoadoutRuntime, type LoadoutItemState } from "@/hooks/useLoadout";
import { Board } from "@/components/Board";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { GameEndModal } from "@/components/GameEndModal";
import { ShopModal } from "@/components/ShopModal";
import { LoadoutModal } from "@/components/LoadoutModal";
import { CardUnlockOverlay, type CardUnlockGroup } from "@/components/modals/CardUnlockOverlay";
import { PlayerData } from "@/utils/playerData";
import { ShopItem, ShopItemId, SHOP_ITEMS, type Inventory } from "@/utils/shopData";
import { CARDS, LOADOUT_ITEMS, CARD_COLLECTION, type CardId } from "@/utils/loadoutData";
import { MissionId, WeeklyMissionId } from "@/utils/missionData";
import { getSeason } from "@/utils/seasonData";
import { SEASON_THEMES } from "@/utils/seasonTheme";
import {
  incrementGameCount,
  shouldShowInterstitialAd,
  shouldShowFailureAd,
  markInterstitialAdShown,
  isNativePlatform,
} from "@/utils/adService";
import { getStageConfig } from "@/utils/stageData";
import { isObstacle } from "@/utils/gameUtils";
import {
  SubscriptionState,
  isPremiumActive,
} from "@/utils/subscriptionData";

/* ── 카드 튜토리얼 가이드 매핑 (스테이지 10·11·12) ─────── */
const GUIDE_CARD: Record<number, { cardId: CardId; msgKo: string; msgEn: string }> = {
  10: { cardId: 'cactus',    msgKo: '선인장 카드로 방해되는 타일을 제거해보세요!', msgEn: 'Use the Cactus card to remove a blocking tile!' },
  11: { cardId: 'sunflower', msgKo: '해바라기 카드로 빈 칸에 씨앗을 심어보세요!', msgEn: 'Use the Sunflower card to plant a seed!' },
  12: { cardId: 'clover',    msgKo: '새싹 카드로 점수를 높여보세요!',             msgEn: 'Use the Sprout card to boost your score!' },
};
import {
  FailureState,
  loadFailureState,
  recordFailure,
  recordWin,
  recordGoldBoost,
  canShowGoldBoost,
  canShowFreeTrial,
} from "@/utils/failureTracking";
import { checkTrialExpiry } from "@/utils/subscriptionData";
import { FreeTrialModal }   from "@/components/modals/FreeTrialModal";
import { PremiumPassModal } from "@/components/modals/PremiumPassModal";
import { GoldBoostModal }   from "@/components/modals/GoldBoostModal";

interface GameProps {
  themeId?:              string;   // 하위 호환 유지 (미사용)
  isActive?:             boolean;  // App에서 게임 화면이 보이는지 여부
  player:                PlayerData;
  onClearLevel:          () => void;
  onEarnCoins:           (coins: number) => void;
  onSpendCoins:          (amount: number) => boolean;
  onHome:                () => void;
  onThemeChange?:        (id: string) => void;  // 하위 호환 유지 (미사용)
  updateMission:         (id: MissionId, inc?: number) => void;
  updateWeeklyMission:   (id: WeeklyMissionId, inc?: number) => void;
  subscriptionState?:    SubscriptionState;
  onStartTrial?:         () => void;
  onBuyPremium?:         () => Promise<void>;
}

export default function Game({
  isActive = true,
  player,
  onClearLevel,
  onEarnCoins,
  onSpendCoins,
  onHome,
  updateMission,
  updateWeeklyMission,
  subscriptionState,
  onStartTrial,
  onBuyPremium,
}: GameProps) {
  const { t, lang } = useTranslation();
  /* ── 구독 상태 ───────────────────────────────────────── */
  const sub         = subscriptionState ?? { isPremium: false, trialUsed: false, trialActive: false, trialExpiry: null };
  const premiumActive = isPremiumActive(sub);
  /* ── 스테이지 설정 (없으면 일반 모드) ──────────────────── */
  const stageConfig = getStageConfig(player.clearedLevel + 1) ?? undefined;

  /* ── 계절 & 테마 ─────────────────────────────────────── */
  const season = getSeason(Math.max(1, player.clearedLevel + 1));
  const theme  = SEASON_THEMES[season];

  const {
    activeTiles,
    graveyard,
    score,
    bestScore,
    highestTile,
    hasLost,
    hasWon,
    showWinModal,
    canUndo,
    turnsLeft,
    maxTurns,
    moveCount,
    lostByTurns,
    handleMove,
    resetGame,
    playOn,
    undoMove,
    undoMultiple,
    extendTurns,
    setThornImmunity,
    removeTileById,
    removeObstacleTile,
    spawnTileAt,
    boardClean,
    setScoreMultiplier,
  } = useGame(stageConfig);

  /* ── 로드아웃 상태 ───────────────────────────────────── */
  const {
    selectedCard, setSelectedCard,
    selectedItems, toggleItem,
    isReady, isReadyItemsOnly,
    resetSelection,
    buildRuntime, buildRuntimeNoCard,
    runtime,
    toggleCardActive, consumeCard,
    activateClover, decrementClover,
    consumeItem,
  } = useLoadout();

  /* 스테이지 9 클리어 후 카드 해금 (clearedLevel >= 9) */
  const cardsUnlocked = player.clearedLevel >= 9;

  /* 게임 시작 전 로드아웃 선택 모달 */
  const [showLoadout, setShowLoadout] = useState(false);

  /* 게임 화면이 활성화될 때 런타임이 없으면 로드아웃 모달 표시 */
  useEffect(() => {
    if (isActive && runtime.items[0] === null) {
      openLoadoutWithGuide();
    }
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 로드아웃 확정 → 런타임 초기화 + 게임 시작 */
  const handleLoadoutStart = () => {
    if (cardsUnlocked) {
      buildRuntime();
    } else {
      buildRuntimeNoCard();
    }
    setShowLoadout(false);
  };

  /* 카드 해금 팝업 */
  const [showCardUnlock,      setShowCardUnlock]      = useState(false);
  const [cardUnlockGroup,     setCardUnlockGroup]     = useState<CardUnlockGroup>('starter');

  /* 카드 가이드 튜토리얼 스테이지 */
  const [cardGuideStage, setCardGuideStage] = useState<number | null>(null);

  /* 카드 튜토리얼 넛지: "idle" | "card"(카드 클릭 유도) | "board"(타일/칸 선택 유도) */
  type TutorialNudge = "idle" | "card" | "board";
  const [tutorialNudge,    setTutorialNudge]    = useState<TutorialNudge>("idle");
  const nudgeTriggeredRef = useRef(false);   // 같은 스테이지에서 재트리거 방지

  /* 구독 해금 감지용 ref */
  const prevPremiumRef = useRef(premiumActive);

  /* ── 실패 추적 & 수익화 팝업 상태 ───────────────────── */
  const [failureState,       setFailureState]       = useState<FailureState>(loadFailureState);
  const [goldBoostMultiplier, setGoldBoostMultiplier] = useState(1);
  const [showFreeTrialModal,  setShowFreeTrialModal]  = useState(false);
  const [showGoldBoostModal,  setShowGoldBoostModal]  = useState(false);
  const [showPostTrialModal,  setShowPostTrialModal]  = useState(false);

  /* ── 타겟 선택 콜백 상태 ─────────────────────────────── *
   * 타일 / 빈 칸 선택 시 실행할 콜백을 저장.
   * null이 아니면 해당 선택 모드가 활성화된 상태.
   * ──────────────────────────────────────────────────── */
  const [tileSelectCb, setTileSelectCb] = useState<((id: string) => void) | null>(null);
  const [emptyCellSelectCb, setEmptyCellSelectCb] = useState<((x: number, y: number) => void) | null>(null);

  /* ── 클로버: 이동마다 버프 턴 감소 ──────────────────────── */
  useEffect(() => {
    if (moveCount === 0) return;
    decrementClover();
  }, [moveCount]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 클로버: 버프 만료 시 점수 배율 초기화 ──────────────── */
  useEffect(() => {
    setScoreMultiplier(runtime.cloverTurnsLeft > 0 ? 1.2 : 1.0);
  }, [runtime.cloverTurnsLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 구독 해금 감지: premiumActive가 처음 true가 됐을 때 팝업 ── */
  useEffect(() => {
    const PREMIUM_SHOWN_KEY = 'plant2048_premium_unlock_shown';
    if (premiumActive && !prevPremiumRef.current && !localStorage.getItem(PREMIUM_SHOWN_KEY)) {
      localStorage.setItem(PREMIUM_SHOWN_KEY, '1');
      setCardUnlockGroup('premium');
      setShowCardUnlock(true);
    }
    prevPremiumRef.current = premiumActive;
  }, [premiumActive]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 상점 상태 ───────────────────────────────────────── */
  const { inventory, addToInventory, useFromInventory } = useShop();
  const [showShop, setShowShop] = useState(false);

  /* ── 일반 모달 상태 ──────────────────────────────────── */
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showHomeConfirm,  setShowHomeConfirm]  = useState(false);

  /* ── 게임 종료 모달 상태 ─────────────────────────────── */
  const gameEndTriggeredRef = useRef(false);
  const revivedRef          = useRef(false);   // 부활 1회 제한
  const [showEndModal, setShowEndModal] = useState(false);
  const [endIsWin,  setEndIsWin]  = useState(false);
  const [endScore,  setEndScore]  = useState(0);
  const [endTile,   setEndTile]   = useState(0);
  const [playerSnapshot, setPlayerSnapshot] = useState<PlayerData>(player);

  /* ── 광고 오버레이 상태 ───────────────────────────────── */
  const [showAdOverlay, setShowAdOverlay] = useState(false);

  /* ── 미션: 64 타일 달성 / 128 타일 달성 (중복 방지 ref) ── */
  const mission64ReportedRef  = useRef(false);
  const mission128ReportedRef = useRef(false);

  useEffect(() => {
    if (highestTile >= 64 && !mission64ReportedRef.current) {
      mission64ReportedRef.current = true;
      updateMission("reach_64");
    }
    if (highestTile >= 128 && !mission128ReportedRef.current) {
      mission128ReportedRef.current = true;
      updateMission("reach_128");
      updateWeeklyMission("tile_128x3");
    }
  }, [highestTile]); // eslint-disable-line react-hooks/exhaustive-deps

  /* hasLost / showWinModal 변화 감지 → 종료 모달 트리거 */
  useEffect(() => {
    if ((hasLost || showWinModal) && !gameEndTriggeredRef.current && !showEndModal) {
      gameEndTriggeredRef.current = true;
      setEndIsWin(showWinModal);
      setEndScore(score);
      setEndTile(highestTile);
      setPlayerSnapshot({ ...player });
      setShowEndModal(true);

      /* 미션: 3판 플레이 */
      updateMission("play_3");
    }
  }, [hasLost, showWinModal]); // eslint-disable-line react-hooks/exhaustive-deps

  const tilesList    = Object.values(activeTiles);
  const numberTiles  = tilesList.filter((t) => !isObstacle(t));

  /* ── 카드 튜토리얼 넛지 트리거 ───────────────────────── *
   * 조건 달성 시 카드 클릭 유도 말풍선 표시
   *   stage 10 (cactus)    : 타일 10개 이상 → 카드 버튼 펄스
   *   stage 11 (sunflower) : 타일 11개 이상
   *   stage 12 (clover)    : 3턴 이상 진행
   * ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!cardGuideStage || nudgeTriggeredRef.current || tutorialNudge !== "idle") return;
    let fire = false;
    if      (cardGuideStage === 10) fire = tilesList.length >= 10;
    else if (cardGuideStage === 11) fire = tilesList.length >= 11;
    else if (cardGuideStage === 12) fire = moveCount >= 3;
    if (fire) {
      nudgeTriggeredRef.current = true;
      setTutorialNudge("card");
    }
  }, [tilesList.length, moveCount, cardGuideStage, tutorialNudge]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── consumeCard 래퍼: 카드 가이드 + 넛지 리셋 포함 ─── */
  const handleConsumeCard = () => {
    consumeCard();
    setCardGuideStage(null);
    setTutorialNudge("idle");
  };

  /* ── 로드아웃 모달 열기 + 카드 가이드 자동 선택 ────────── */
  const openLoadoutWithGuide = () => {
    /* 항상 이전 가이드 상태 초기화 */
    setCardGuideStage(null);
    setTutorialNudge("idle");
    nudgeTriggeredRef.current = false;

    if (cardsUnlocked) {
      const currentStage = player.clearedLevel + 1;
      if (currentStage in GUIDE_CARD) {
        setSelectedCard(GUIDE_CARD[currentStage].cardId);
        setCardGuideStage(currentStage);
      }
    }
    setShowLoadout(true);
  };

  /* ── 카드 버튼 클릭 ──────────────────────────────────── */
  const handleCardClick = () => {
    const { card } = runtime;
    if (!card || card.usesLeft <= 0) return;

    if (card.isActive) {
      /* 취소 */
      toggleCardActive();
      setTileSelectCb(null);
      setEmptyCellSelectCb(null);
      return;
    }

    const cardDef = CARDS.find((c) => c.id === card.id)!;

    switch (cardDef.targetMode) {
      case "tile":
        toggleCardActive();
        if (tutorialNudge === "card") setTutorialNudge("board");
        setTileSelectCb(() => (tileId: string) => {
          if (card.id === "life_tree") {
            /* 생명의 나무: 선택한 타일 값 2배 업그레이드 */
            const tile = Object.values(activeTiles).find((t) => t.id === tileId);
            if (tile) {
              removeTileById(tileId);
              spawnTileAt(tile.x, tile.y, tile.value * 2);
            }
          } else {
            /* 선인장 / 프리미엄 제거: 타일 제거 */
            removeTileById(tileId);
          }
          handleConsumeCard();
          updateMission("use_item");
          updateWeeklyMission("use_item_5");
        });
        break;
      case "empty":
        toggleCardActive();
        if (tutorialNudge === "card") setTutorialNudge("board");
        setEmptyCellSelectCb(() => (x: number, y: number) => {
          spawnTileAt(x, y, 2);
          handleConsumeCard();
          updateMission("use_item");
          updateWeeklyMission("use_item_5");
        });
        break;
      case "instant": {
        const boardSize = stageConfig?.boardSize ?? 4;
        const occupied = new Set(
          Object.values(activeTiles).map((t) => `${t.x},${t.y}`)
        );
        const emptyCells: { x: number; y: number }[] = [];
        for (let x = 0; x < boardSize; x++) {
          for (let y = 0; y < boardSize; y++) {
            if (!occupied.has(`${x},${y}`)) emptyCells.push({ x, y });
          }
        }

        const shuffle = <T,>(arr: T[]): T[] => {
          const a = [...arr];
          for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
          }
          return a;
        };

        const sortedTiles = Object.values(activeTiles)
          .filter((t) => !isObstacle(t))
          .sort((a, b) => a.value - b.value);

        switch (card.id) {
          case "golden_sunflower": {
            /* 황금 해바라기: 빈 칸 2곳에 4 타일 동시 배치 */
            shuffle(emptyCells).slice(0, 2).forEach(({ x, y }) => spawnTileAt(x, y, 4));
            break;
          }
          case "lotus": {
            sortedTiles.slice(0, 3).forEach((t) => removeTileById(t.id));
            break;
          }
          case "bamboo": {
            // 가시 번짐 5턴 면역 설정
            setThornImmunity(5);
            break;
          }
          case "dandelion": {
            shuffle(emptyCells).slice(0, 2).forEach(({ x, y }) => spawnTileAt(x, y, 2));
            break;
          }
          case "cherry": {
            shuffle(emptyCells).slice(0, 3).forEach(({ x, y }) => spawnTileAt(x, y, 2));
            break;
          }
          case "mushroom": {
            const byValue = new Map<number, typeof sortedTiles>();
            for (const t of sortedTiles) {
              if (!byValue.has(t.value)) byValue.set(t.value, []);
              byValue.get(t.value)!.push(t);
            }
            const pair = [...byValue.entries()]
              .filter(([, tiles]) => tiles.length >= 2)
              .sort(([a], [b]) => a - b)[0];
            if (pair) {
              const [val, tiles] = pair;
              removeTileById(tiles[0].id);
              removeTileById(tiles[1].id);
              spawnTileAt(tiles[0].x, tiles[0].y, val * 2);
            }
            break;
          }
          case "rose": {
            activateClover(5);
            setScoreMultiplier(1.3);
            break;
          }
          default: {
            activateClover(3);
            setScoreMultiplier(1.2);
            break;
          }
        }
        handleConsumeCard();
        updateMission("use_item");
        updateWeeklyMission("use_item_5");
        break;
      }
    }
  };

  /* ── 로드아웃 아이템 버튼 클릭 ───────────────────────── */
  const handleLoadoutItemClick = (idx: 0 | 1) => {
    const item = runtime.items[idx];
    if (!item || item.usesLeft <= 0) return;

    switch (item.id) {
      case "undo":
        if (!canUndo) return;
        undoMove();
        consumeItem(idx);
        updateMission("use_item");
        updateWeeklyMission("use_item_5");
        break;
      case "clean":
        if (numberTiles.length <= 4) return;
        boardClean();
        consumeItem(idx);
        updateMission("use_item");
        updateWeeklyMission("use_item_5");
        break;
      case "remove":
        setTileSelectCb(() => (tileId: string) => {
          removeTileById(tileId);
          consumeItem(idx);
          updateMission("use_item");
          updateWeeklyMission("use_item_5");
        });
        break;
    }
  };

  /* ── 부활 (패배 시 광고 1회, 5턴 되돌리기) ──────────── */
  const handleRevive = useCallback(() => {
    if (revivedRef.current) return;
    revivedRef.current = true;
    setShowEndModal(false);
    gameEndTriggeredRef.current = false;
    undoMultiple(5);   // 5턴 전 보드 복원 → hasLost 자동 리셋
  }, [undoMultiple]);

  /* ── 턴 연장 (턴 소진 패배 시 광고 1회, +30턴) ───────── */
  const handleExtendTurns = useCallback(() => {
    if (revivedRef.current) return;
    revivedRef.current = true;
    setShowEndModal(false);
    gameEndTriggeredRef.current = false;
    extendTurns(30);
  }, [extendTurns]);

  /* ── 게임 종료 모달 확인 ─────────────────────────────── */
  const handleEndConfirm = (
    earnedCoins: number,
    action:      "reset" | "home"
  ) => {
    /* 스테이지 클리어 = 카드 해금 이벤트 감지 (onClearLevel 호출 전) */
    const justUnlockedStarter = endIsWin && player.clearedLevel === 8;
    const justUnlockedLv100   = endIsWin && player.clearedLevel === 98;
    const justUnlockedLv400   = endIsWin && player.clearedLevel === 398;

    /* 스테이지 클리어 판정 */
    if (stageConfig) {
      /* 스테이지 모드: 목표 타일 달성 = 클리어 */
      if (endIsWin) onClearLevel();
    } else {
      /* 일반 모드: 게임 승리 = 클리어 */
      if (endIsWin) onClearLevel();
    }

    /* ── 실패 추적 ───────────────────────────────────── */
    const currentStageId = player.clearedLevel + 1;
    let newFailState = failureState;
    if (!endIsWin) {
      newFailState = recordFailure(failureState, currentStageId);
    } else {
      newFailState = recordWin(failureState);
    }
    setFailureState(newFailState);

    /* ── 골드 부스트 배율 적용 ───────────────────────── */
    const boostedCoins = Math.round(earnedCoins * goldBoostMultiplier);
    setGoldBoostMultiplier(1); // 다음 판 리셋

    /* 게임 코인 지급 (골드 부스트 배율 적용됨) */
    onEarnCoins(boostedCoins);

    /* 일일 미션: 500점 달성 */
    if (endScore >= 500) updateMission("score_500");

    /* 주간 미션: 판 완료 / 점수 달성 */
    updateWeeklyMission("play_10");
    if (endScore >= 5000) updateWeeklyMission("score_5000");

    /* ── 체험 만료 체크 ──────────────────────────────── */
    const justExpired = checkTrialExpiry(sub);
    if (justExpired) {
      setShowPostTrialModal(true);
    }

    /* ── 골드 부스트 팝업 (실패 시만) ────────────────── */
    if (!endIsWin && !justExpired && canShowGoldBoost(newFailState, currentStageId)) {
      setShowGoldBoostModal(true);
    }

    /* ── 무료 체험 팝업 (실패 시만, 조건 충족 시) ───── */
    const isObstacleStage = !!(stageConfig && Object.keys(stageConfig).includes("obstacles"));
    if (!endIsWin && !justExpired && !showGoldBoostModal && canShowFreeTrial(newFailState, sub, isObstacleStage)) {
      setShowFreeTrialModal(true);
    }

    /* ── 광고: 5판마다 1회 (첫 3판 제외, 구독자 스킵) ── */
    const adCount = incrementGameCount();
    if (shouldShowInterstitialAd(adCount, premiumActive)) {
      void markInterstitialAdShown(); // 네이티브: 실제 AdMob 인터스티셜 표시
      if (!isNativePlatform()) {      // 웹: 가짜 오버레이
        setShowAdOverlay(true);
        setTimeout(() => setShowAdOverlay(false), 2000);
      }
    }

    /* 실패 광고 (조건 충족 시, 구독자 스킵) */
    if (!endIsWin && shouldShowFailureAd(newFailState.consecutiveFails, currentStageId, premiumActive)) {
      void markInterstitialAdShown(); // 네이티브: 실제 AdMob 인터스티셜 표시
      if (!isNativePlatform()) {      // 웹: 가짜 오버레이
        setShowAdOverlay(true);
        setTimeout(() => setShowAdOverlay(false), 2000);
      }
    }

    setShowEndModal(false);
    gameEndTriggeredRef.current    = false;
    mission64ReportedRef.current   = false;
    mission128ReportedRef.current  = false;

    setTileSelectCb(null);
    setEmptyCellSelectCb(null);
    setSelectingObstacle(false);

    if (justUnlockedStarter) {
      resetGame();
      setCardUnlockGroup('starter');
      setShowCardUnlock(true);
    } else if (justUnlockedLv100) {
      resetGame();
      setCardUnlockGroup('lv100');
      setShowCardUnlock(true);
    } else if (justUnlockedLv400) {
      resetGame();
      setCardUnlockGroup('lv400');
      setShowCardUnlock(true);
    } else if (action === "reset") {
      resetSelection();
      resetGame();
      openLoadoutWithGuide();
    } else {
      resetGame();
      openLoadoutWithGuide();
      onHome();
    }
  };

  /* ── 새 게임 / 홈 버튼 처리 ──────────────────────────── */
  const handleResetRequest = () => {
    if (showEndModal) return;
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
    gameEndTriggeredRef.current    = false;
    mission64ReportedRef.current   = false;
    mission128ReportedRef.current  = false;
    setTileSelectCb(null);
    setEmptyCellSelectCb(null);
    resetSelection();
    resetGame();
    openLoadoutWithGuide();
  };

  const confirmHome = () => {
    setShowHomeConfirm(false);
    gameEndTriggeredRef.current    = false;
    mission64ReportedRef.current   = false;
    mission128ReportedRef.current  = false;
    setTileSelectCb(null);
    setEmptyCellSelectCb(null);
    resetSelection();
    openLoadoutWithGuide(); // 홈 → 다시 로드아웃 선택
    resetGame();
    onHome();
  };

  /* ── 타일 선택 제거 상태 ─────────────────────────────── */
  const [selectingTile, setSelectingTile]           = useState(false);
  const [pendingRemoveTile, setPendingRemoveTile]   = useState<{ id: string; value: number } | null>(null);

  /* ── 장애물 선택 제거 상태 (remove_obstacle 아이템) ──── */
  const [selectingObstacle, setSelectingObstacle]   = useState(false);

  /* ── 인벤토리바 구매 확인 팝업 상태 (portal 렌더용) ───── */
  const [pendingBuy, setPendingBuy] = useState<ShopItem | null>(null);

  const handleConfirmBuy = () => {
    if (!pendingBuy) return;
    handleBuy(pendingBuy);
    setPendingBuy(null);
  };

  /* ── 상점: 구매 처리 ─────────────────────────────────── */
  const handleBuy = (item: ShopItem) => {
    const success = onSpendCoins(item.cost);
    if (!success) return;

    if (item.consumable) {
      addToInventory(item.id);
    } else {
      addToInventory(item.id, 1);
    }
  };

  /* ── 타일 선택 제거: 타일 클릭 시 확인 대기 ─────────── */
  const handleTileSelectClick = (tileId: string) => {
    const tile = (activeTiles as Record<string, { id: string; value: number }>)[tileId];
    if (!tile) return;
    setPendingRemoveTile({ id: tileId, value: tile.value });
  };

  const handleConfirmRemoveTile = () => {
    if (!pendingRemoveTile) return;
    const consumed = useFromInventory("remove_tile");
    if (consumed) {
      removeTileById(pendingRemoveTile.id);
      updateMission("use_item");
      updateWeeklyMission("use_item_5");
    }
    setPendingRemoveTile(null);
    setSelectingTile(false);
  };

  const handleCancelRemoveTile = () => {
    setPendingRemoveTile(null);
    setSelectingTile(false);
    /* 아이템 미소비 — 인벤토리 유지 */
  };

  /* ── 보드 이벤트 라우터 ───────────────────────────────── */

  /** 타일 클릭: 로드아웃 콜백 우선, 없으면 기존 상점 remove_tile/remove_obstacle 흐름 */
  const handleBoardTileClick = (tileId: string) => {
    if (tileSelectCb) {
      tileSelectCb(tileId);
      setTileSelectCb(null);
    } else if (selectingObstacle) {
      /* 장애물 선택 모드: 클릭한 타일이 장애물이면 제거 */
      const tile = (activeTiles as Record<string, { id: string; tileType?: string }>)[tileId];
      if (tile && isObstacle(tile as Parameters<typeof isObstacle>[0])) {
        const consumed = useFromInventory("remove_obstacle");
        if (consumed) {
          removeObstacleTile(tileId);
          updateMission("use_item");
          updateWeeklyMission("use_item_5");
        }
        setSelectingObstacle(false);
      }
    } else if (selectingTile) {
      handleTileSelectClick(tileId);
    }
  };

  /** 빈 칸 클릭: 해바라기 카드 전용 */
  const handleBoardEmptyCellClick = (x: number, y: number) => {
    if (emptyCellSelectCb) {
      emptyCellSelectCb(x, y);
      setEmptyCellSelectCb(null);
    }
  };

  const boardTileSelectMode  = tileSelectCb !== null || selectingTile || selectingObstacle;
  const boardEmptyCellMode   = emptyCellSelectCb !== null;

  /* ── 상점: 아이템 사용 처리 ──────────────────────────── */
  const handleUseItem = (itemId: ShopItemId) => {
    if (itemId === "undo" && !canUndo) return;
    /* board_clean: 5개 이상일 때만 사용 가능 */
    if (itemId === "board_clean" && numberTiles.length <= 4) return;
    if (itemId === "remove_tile" && numberTiles.length === 0) return;
    /* remove_obstacle: 장애물이 있을 때만 사용 가능 */
    if (itemId === "remove_obstacle" && tilesList.filter((t) => isObstacle(t)).length === 0) return;

    /* remove_tile: 아이템 소비 없이 선택 모드 진입 */
    if (itemId === "remove_tile") {
      setSelectingTile(true);
      setShowShop(false);
      return;
    }

    /* remove_obstacle: 아이템 소비 없이 장애물 선택 모드 진입 */
    if (itemId === "remove_obstacle") {
      setSelectingObstacle(true);
      setShowShop(false);
      return;
    }

    const consumed = useFromInventory(itemId);
    if (!consumed) return;

    switch (itemId) {
      case "undo":        undoMove();   break;
      case "board_clean": boardClean(); break;
    }

    updateMission("use_item");
    updateWeeklyMission("use_item_5");
    setShowShop(false);
  };

  const gameContent = (
    <div
      className="relative min-h-[100dvh] w-full flex flex-col items-center overflow-hidden"
      style={{ background: theme.backgroundColor }}
    >

      {/* ── 배경 + 콘텐츠 영역 ─────────────────────────────── */}
      <div className="relative flex-1 w-full flex flex-col items-center overflow-hidden">

<div className="relative z-10 w-full flex flex-col flex-1 items-center">
          <div className="w-full max-w-[500px] flex flex-col flex-1 px-4 pb-10">

            <Header
              score={score}
              bestScore={bestScore}
              season={season}
              onReset={handleResetRequest}
              onHome={handleHomeRequest}
              onShop={() => setShowShop(true)}
            />

            {/* ── 목표 배너 (스테이지 모드 전용) ────────────────── */}
            {stageConfig && (
              <GoalBanner
                score={score}
                stageGoal={stageConfig.goal.targetValue}
                turnsLeft={turnsLeft}
                maxTurns={maxTurns}
                goalTile={stageConfig.goal.targetValue}
              />
            )}

            <main className="w-full flex-1 flex flex-col justify-center relative">
              {cardGuideStage !== null && cardsUnlocked && tutorialNudge !== "idle" && (
                <CardTutorialOverlay
                  stage={cardGuideStage}
                  nudge={tutorialNudge}
                  lang={lang}
                />
              )}

              <Board
                tiles={tilesList}
                graveyard={graveyard}
                gridSize={stageConfig?.boardSize ?? 4}
                onSwipe={(dir) => {
                  /* 선택 모드 중 스와이프 → 선택 모드 취소 */
                  if (boardTileSelectMode) {
                    setSelectingTile(false);
                    setTileSelectCb(null);
                    return;
                  }
                  if (boardEmptyCellMode) {
                    setEmptyCellSelectCb(null);
                    return;
                  }
                  handleMove(dir);
                }}
                themeId="plant"
                selectMode={boardTileSelectMode}
                onTileClick={handleBoardTileClick}
                emptyCellSelectMode={boardEmptyCellMode}
                onEmptyCellClick={handleBoardEmptyCellClick}
              />

            </main>

            {/* ── 액션 바 (보드 아래) ──────────────────────────── */}
            <ActionBar
              runtime={runtime}
              canUndo={canUndo}
              hasSeedTiles={numberTiles.length > 4}
              hasTiles={numberTiles.length > 0}
              cardsUnlocked={cardsUnlocked}
              guidePulse={tutorialNudge === "card"}
              onCardClick={handleCardClick}
              onItemClick={handleLoadoutItemClick}
            />

          </div>
        </div>
      </div>

      {/* ── 로드아웃 선택 모달 (게임 시작 전, 게임 화면이 활성일 때만) ── */}
      {showLoadout && isActive && (
        <LoadoutModal
          selectedCard={selectedCard}
          selectedItems={selectedItems}
          isReady={cardsUnlocked ? isReady : isReadyItemsOnly}
          cardsUnlocked={cardsUnlocked}
          isPremiumActive={premiumActive}
          stageLevel={player.clearedLevel + 1}
          stageConfig={stageConfig}
          clearedLevel={player.clearedLevel}
          tutorialCardId={cardGuideStage ? GUIDE_CARD[cardGuideStage]?.cardId : undefined}
          onSelectCard={setSelectedCard}
          onToggleItem={toggleItem}
          onStart={handleLoadoutStart}
          onClose={() => { setShowLoadout(false); onHome(); }}
          season={season}
        />
      )}

      {/* ── 모달 레이어 ──────────────────────────────────── */}

      <ShopModal
        isOpen={showShop}
        player={player}
        inventory={inventory}
        inGame={true}
        onClose={() => setShowShop(false)}
        onBuy={handleBuy}
        onUse={handleUseItem}
      />

      <GameEndModal
        isOpen={showEndModal}
        isWin={endIsWin}
        score={endScore}
        highestTile={endTile}
        player={playerSnapshot}
        season={season}
        isPremiumActive={premiumActive}
        onRevive={!endIsWin && !lostByTurns && !revivedRef.current ? handleRevive : undefined}
        onExtendTurns={!endIsWin && lostByTurns && !revivedRef.current ? handleExtendTurns : undefined}
        onConfirm={handleEndConfirm}
      />

      {/* ── 카드 해금 팝업 ─────────────────────────────────── */}
      {showCardUnlock && createPortal(
        <CardUnlockOverlay
          group={cardUnlockGroup}
          onDone={() => {
            setShowCardUnlock(false);
            openLoadoutWithGuide();
          }}
        />,
        document.body,
      )}

      {/* 승리 후 계속 플레이 */}
      {!showEndModal && showWinModal && (
        <Modal
          isOpen={true}
          type="success"
          title={t("modal.winTitle")}
          description={t("modal.winDesc")}
          primaryAction={{ label: t("modal.continuePlay"), onClick: playOn }}
          secondaryAction={{ label: t("modal.newGame"), onClick: () => { resetSelection(); resetGame(); openLoadoutWithGuide(); } }}
        />
      )}

      <Modal
        isOpen={showResetConfirm}
        type="info"
        title={t("modal.resetTitle")}
        description={t("modal.resetDesc")}
        primaryAction={{ label: t("modal.resetConfirm"), onClick: confirmReset }}
        secondaryAction={{ label: t("modal.resetCancel"), onClick: () => setShowResetConfirm(false) }}
      />

      <Modal
        isOpen={showHomeConfirm}
        type="info"
        title={t("modal.homeTitle")}
        description={t("modal.homeDesc")}
        primaryAction={{ label: t("modal.homeConfirm"), onClick: confirmHome }}
        secondaryAction={{ label: t("modal.homeCancel"), onClick: () => setShowHomeConfirm(false) }}
      />

      {/* ── 수익화 팝업들 ─────────────────────────────────── */}
      {showFreeTrialModal && (
        <FreeTrialModal
          onStart={() => {
            onStartTrial?.();
            setShowFreeTrialModal(false);
          }}
          onClose={() => setShowFreeTrialModal(false)}
          season={season}
        />
      )}

      {showGoldBoostModal && (
        <GoldBoostModal
          isPremium={premiumActive}
          onBoost={(multiplier) => {
            setGoldBoostMultiplier(multiplier);
            const updated = recordGoldBoost(failureState, player.clearedLevel + 1);
            setFailureState(updated);
            setShowGoldBoostModal(false);
          }}
          onClose={() => setShowGoldBoostModal(false)}
          season={season}
        />
      )}

      {showPostTrialModal && (
        <PremiumPassModal
          isPostTrial={true}
          onBuy={async () => {
            await onBuyPremium?.();
            setShowPostTrialModal(false);
          }}
          onClose={() => setShowPostTrialModal(false)}
          season={season}
        />
      )}

    </div>
  );

  /* ── Portal 레이어: transform 부모를 탈출하여 viewport 기준 렌더 ── */
  return (
    <>
      {gameContent}

      {/* ── 아이템 구매 확인 팝업 ─────────────────────────── */}
      {pendingBuy && createPortal(
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
          onClick={() => setPendingBuy(null)}
        >
          <div
            className="w-full max-w-[300px] bg-white rounded-3xl p-6 shadow-2xl animate-modal-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-3xl">
                {pendingBuy.emoji}
              </div>
            </div>
            <h3 className="text-base font-black text-foreground text-center mb-1">
              {t("modal.buyTitle", { name: pendingBuy.name })}
            </h3>
            <p className="text-xs text-foreground/45 text-center mb-1">
              {pendingBuy.description}
            </p>
            <p className="text-sm font-bold text-amber-600 text-center mb-5">
              {t("modal.buyCoins", { cost: pendingBuy.cost.toLocaleString() })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPendingBuy(null)}
                className="flex-1 py-2.5 rounded-2xl bg-board text-foreground/60 font-bold text-sm hover:bg-cell active:scale-95 transition-all"
              >
                {t("modal.buyCancel")}
              </button>
              <button
                onClick={handleConfirmBuy}
                className="flex-[2] py-2.5 rounded-2xl bg-primary text-white font-bold text-sm shadow-sm hover:bg-primary-hover active:scale-95 transition-all"
              >
                {t("modal.buyConfirm")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── 타일 삭제 확인 팝업 ───────────────────────────── */}
      {pendingRemoveTile && createPortal(
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
          onClick={handleCancelRemoveTile}
        >
          <div
            className="w-full max-w-[300px] bg-white rounded-3xl p-6 shadow-2xl animate-modal-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-3xl">
                🌿
              </div>
            </div>
            <h3 className="text-base font-black text-foreground text-center mb-1">
              {t("modal.removeTileTitle")}
            </h3>
            <p className="text-xs text-foreground/45 text-center mb-5">
              {t("modal.removeTileDesc", { value: pendingRemoveTile.value })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleCancelRemoveTile}
                className="flex-1 py-2.5 rounded-2xl bg-board text-foreground/60 font-bold text-sm hover:bg-cell active:scale-95 transition-all"
              >
                {t("modal.removeTileCancel")}
              </button>
              <button
                onClick={handleConfirmRemoveTile}
                className="flex-[2] py-2.5 rounded-2xl bg-red-500 text-white font-bold text-sm shadow-sm hover:bg-red-600 active:scale-95 transition-all"
              >
                {t("modal.removeTileConfirm")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── 인터스티셜 광고 오버레이 ──────────────────────── */}
      {showAdOverlay && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80">
          <div className="bg-white rounded-2xl px-12 py-8 text-center shadow-2xl">
            <p className="text-xs font-medium text-foreground/30 mb-1">{t("game.ad")}</p>
            <p className="text-2xl font-black text-foreground/20">AD</p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/* ── CloverBanner: needs hook so must be a component ── */
function CloverBanner({ cloverTurnsLeft }: { cloverTurnsLeft: number }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-1.5 mb-2 py-1 rounded-xl bg-emerald-50 border border-emerald-200">
      <span className="text-sm">🍀</span>
      <span className="text-xs font-bold text-emerald-600">
        {t("game.cloverActive")}
      </span>
      <span className="text-xs text-emerald-500 font-semibold">
        {t("game.cloverTurns", { turns: cloverTurnsLeft })}
      </span>
    </div>
  );
}

/* ============================================================
 * ActionBar
 * 하단 3-슬롯 액션 바
 *
 * [로드아웃 카드] | [로드아웃 아이템 0] | [로드아웃 아이템 1]
 *
 * - 카드 슬롯: 선택한 로드아웃 카드, 남은 사용 횟수
 * - 아이템 슬롯 0/1: 선택한 로드아웃 아이템
 * ============================================================ */
interface ActionBarProps {
  runtime:       LoadoutRuntime;
  canUndo:       boolean;
  hasSeedTiles:  boolean;
  hasTiles:      boolean;
  cardsUnlocked: boolean;
  guidePulse?:   boolean;   // 카드 버튼 펄스 (튜토리얼 넛지)
  onCardClick:   () => void;
  onItemClick:   (idx: 0 | 1) => void;
}

function ActionBar({
  runtime, canUndo, hasSeedTiles, hasTiles, cardsUnlocked,
  guidePulse = false,
  onCardClick, onItemClick,
}: ActionBarProps) {
  const { t } = useTranslation();
  const { card, items, cloverTurnsLeft } = runtime;

  /* 카드 버튼 상태 */
  const cardDef       = card ? CARDS.find((c) => c.id === card.id) : null;
  const cardExhausted = !card || card.usesLeft <= 0;

  return (
    <div className="mb-3 px-1">
      {cloverTurnsLeft > 0 && (
        <CloverBanner cloverTurnsLeft={cloverTurnsLeft} />
      )}

      <div className={["flex items-stretch", !cardsUnlocked ? "justify-center" : ""].join(" ")}>

        {/* ── 슬롯 1: 로드아웃 카드 (해금 후에만 표시) ──── */}
        {cardsUnlocked && (
          <>
            <div className="flex items-center flex-1 relative">
              <button
                onClick={onCardClick}
                disabled={cardExhausted}
                title={cardDef ? `${t(`card.${cardDef.id}`)}: ${t(`card.desc.${cardDef.id}`)}` : undefined}
                className={[
                  "flex flex-col items-center gap-0.5 flex-1 py-2 px-1 rounded-lg transition-all active:scale-95",
                  cardExhausted ? "opacity-30 cursor-not-allowed"
                  : card?.isActive
                    ? "opacity-100 bg-primary/10 ring-1 ring-primary/40"
                  : guidePulse
                    ? "opacity-100 ring-2 ring-green-400 bg-green-50 animate-pulse"
                    : "opacity-100 hover:opacity-80",
                ].join(" ")}
              >
                <span className="text-2xl leading-none">{cardDef?.emoji ?? "❓"}</span>
                <span className="text-[11px] font-semibold text-foreground/70 leading-tight">
                  {cardDef ? t(`card.${cardDef.id}`) : "—"}
                </span>
                {card?.isActive && (
                  <span className="text-[10px] font-bold leading-tight text-primary animate-pulse">
                    <CardActiveLabel />
                  </span>
                )}
              </button>
              {/* 튜토리얼 넛지 화살표 */}
              {guidePulse && !cardExhausted && (
                <div style={{
                  position: "absolute", top: -28, left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: 20, animation: "bounce 1s ease-in-out infinite",
                  pointerEvents: "none",
                }}>
                  👆
                </div>
              )}
            </div>
            <div className="w-px bg-foreground/15 shrink-0 self-stretch" />
          </>
        )}

        {/* ── 슬롯 2: 로드아웃 아이템 0 ─────────────────── */}
        <LoadoutItemSlot
          item={items[0]}
          idx={0}
          canUndo={canUndo}
          hasSeedTiles={hasSeedTiles}
          hasTiles={hasTiles}
          onClick={() => onItemClick(0)}
        />

        <div className="w-px bg-foreground/15 shrink-0 self-stretch" />

        {/* ── 슬롯 3: 로드아웃 아이템 1 ─────────────────── */}
        <LoadoutItemSlot
          item={items[1]}
          idx={1}
          canUndo={canUndo}
          hasSeedTiles={hasSeedTiles}
          hasTiles={hasTiles}
          onClick={() => onItemClick(1)}
        />
      </div>
    </div>
  );
}

/* ── Card label helpers (need hooks so must be components) ── */
function CardNoLabel() {
  const { t } = useTranslation();
  return <>{t("game.noCard")}</>;
}
function CardActiveLabel() {
  const { t } = useTranslation();
  return <>{t("game.cardActive")}</>;
}

/* ── 로드아웃 아이템 슬롯 ────────────────────────────────── */
interface LoadoutItemSlotProps {
  item:         LoadoutItemState | null;
  idx:          0 | 1;
  canUndo:      boolean;
  hasSeedTiles: boolean;
  hasTiles:     boolean;
  onClick:      () => void;
}

function LoadoutItemSlot({
  item, canUndo, hasSeedTiles, hasTiles, onClick,
}: LoadoutItemSlotProps) {
  const { t } = useTranslation();

  if (!item) return (
    <div className="flex flex-col items-center gap-0.5 flex-1 py-2 px-1 opacity-20">
      <span className="text-2xl leading-none">❓</span>
      <span className="text-[11px] font-semibold text-foreground/70 leading-tight">{t("game.noItem")}</span>
    </div>
  );

  const itemDef  = LOADOUT_ITEMS.find((i) => i.id === item.id)!;
  const depleted = item.usesLeft <= 0;

  const blocked =
    !depleted && (
      (item.id === "undo"   && !canUndo) ||
      (item.id === "clean"  && !hasSeedTiles) ||
      (item.id === "remove" && !hasTiles)
    );

  const blockMsg: Record<string, string> = {
    undo:   t("game.undoBlocked"),
    clean:  t("game.cleanBlocked"),
    remove: t("game.removeBlocked"),
  };

  const itemName = t(`item.${item.id}.name`);

  return (
    <button
      onClick={onClick}
      disabled={depleted || blocked}
      title={blocked ? blockMsg[item.id] : t("game.useItem", { name: itemName })}
      className={[
        "flex flex-col items-center gap-0.5 flex-1 py-2 px-1 transition-all active:scale-95",
        depleted ? "opacity-20 cursor-not-allowed"
        : blocked ? "opacity-25 cursor-not-allowed"
        : "opacity-100 hover:opacity-80",
      ].join(" ")}
    >
      <span className="text-2xl leading-none">{itemDef.emoji}</span>
      <span className="text-[11px] font-semibold text-foreground/70 leading-tight">
        {itemName}
      </span>
      <span className={[
        "text-[10px] font-bold leading-tight",
        depleted ? "text-foreground/30"
        : blocked ? "text-foreground/30"
        : "text-emerald-500",
      ].join(" ")}>
        ×{item.usesLeft}
      </span>
    </button>
  );
}

/* ============================================================
 * GoalBanner
 * 목표 배너 — Header 아래, Board 위
 *
 * - stageConfig 있음: 타일 목표 + 남은 턴 표시
 * - stageConfig 없음: 기존 점수 목표 표시
 * ============================================================ */
interface GoalBannerProps {
  score:      number;
  stageGoal:  number;
  turnsLeft?: number;
  maxTurns?:  number;
  goalTile?:  number;
}

function GoalBanner({ score, stageGoal, turnsLeft, maxTurns, goalTile }: GoalBannerProps) {
  const { t } = useTranslation();

  /* ── 스테이지 모드: 타일 목표 + 턴 카운터 ─────────────── */
  if (goalTile !== undefined && turnsLeft !== undefined && maxTurns !== undefined) {
    const turnPct     = maxTurns > 0 ? Math.min(100, Math.round((turnsLeft / maxTurns) * 100)) : 0;
    const turnsUrgent = turnsLeft <= Math.ceil(maxTurns * 0.1); // 남은 턴 10% 이하면 위험

    return (
      <div
        className="mb-3 rounded-2xl overflow-hidden"
        style={{
          background:  turnsUrgent
            ? "linear-gradient(135deg, rgba(254,226,226,0.85), rgba(254,202,202,0.75))"
            : "linear-gradient(135deg, rgba(255,255,255,0.75), rgba(255,255,255,0.55))",
          border:      turnsUrgent ? "1.5px solid rgba(252,165,165,0.6)" : "1.5px solid rgba(0,0,0,0.06)",
          backdropFilter: "blur(8px)",
          transition:  "background 0.4s, border 0.4s",
        }}
      >
        {/* ── 상단: 목표 설명 + 남은 턴 */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div>
            <p className="text-[10px] font-semibold leading-none mb-0.5"
              style={{ color: turnsUrgent ? "rgba(185,28,28,0.6)" : "rgba(0,0,0,0.35)" }}>
              {t("game.goal")}
            </p>
            <p className="text-sm font-black leading-tight"
              style={{ color: turnsUrgent ? "#b91c1c" : "rgba(0,0,0,0.75)" }}>
              {t("game.goalTile", { tile: goalTile })}
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-2xl font-black leading-none tabular-nums"
              style={{ color: turnsUrgent ? "#ef4444" : "rgba(0,0,0,0.75)" }}
            >
              {turnsLeft.toLocaleString()}
            </p>
            <p className="text-[10px] font-medium leading-none mt-0.5"
              style={{ color: turnsUrgent ? "rgba(185,28,28,0.55)" : "rgba(0,0,0,0.35)" }}>
              {t("game.turnsLeft")}
            </p>
          </div>
        </div>

        {/* ── 하단: 진행 바 */}
        <div className="px-4 pb-3">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.08)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width:      `${turnPct}%`,
                background: turnsUrgent
                  ? "linear-gradient(90deg, #f87171, #ef4444)"
                  : "linear-gradient(90deg, #6ee7b7, #10b981)",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  /* ── 일반 모드: 점수 목표 ──────────────────────────────── */
  const achieved = score >= stageGoal;
  const pct      = Math.min(100, Math.round((score / stageGoal) * 100));
  return (
    <div
      className="mb-3 rounded-2xl overflow-hidden"
      style={{
        background: achieved
          ? "linear-gradient(135deg, rgba(209,250,229,0.85), rgba(167,243,208,0.7))"
          : "linear-gradient(135deg, rgba(255,255,255,0.75), rgba(255,255,255,0.55))",
        border: achieved ? "1.5px solid rgba(52,211,153,0.5)" : "1.5px solid rgba(0,0,0,0.06)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div>
          <p className="text-[10px] font-semibold leading-none mb-0.5"
            style={{ color: achieved ? "rgba(6,95,70,0.6)" : "rgba(0,0,0,0.35)" }}>
            {t("game.goal")}
          </p>
          <p className="text-sm font-black leading-tight"
            style={{ color: achieved ? "#065f46" : "rgba(0,0,0,0.75)" }}>
            {achieved
              ? t("game.goalExceeded", { goal: stageGoal.toLocaleString() })
              : t("game.goalPrompt", { goal: stageGoal.toLocaleString() })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black leading-none tabular-nums"
            style={{ color: achieved ? "#059669" : "rgba(0,0,0,0.75)" }}>
            {pct}%
          </p>
          <p className="text-[10px] font-medium leading-none mt-0.5"
            style={{ color: achieved ? "rgba(6,95,70,0.55)" : "rgba(0,0,0,0.35)" }}>
            {t("game.progress") ?? "진행"}
          </p>
        </div>
      </div>
      {!achieved && (
        <div className="px-4 pb-3">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.08)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width:      `${pct}%`,
                background: "linear-gradient(90deg, #fbbf24, #f59e0b)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * CardTutorialOverlay
 * 스테이지 10·11·12 인터랙티브 카드 튜토리얼 말풍선
 * - nudge="card"  : 카드 버튼 클릭 유도 (아래쪽 화살표, 보드 하단)
 * - nudge="board" : 타일/빈칸 선택 유도 (위쪽 배너, 보드 상단)
 * ============================================================ */
const GUIDE_BOARD_MSG: Record<number, { ko: string; en: string }> = {
  10: { ko: '제거할 타일을 탭하세요!',   en: 'Tap a tile to remove it!' },
  11: { ko: '씨앗을 심을 빈 칸을 탭하세요!', en: 'Tap an empty cell to plant a seed!' },
  12: { ko: '',                          en: '' },   // 클로버는 즉시 발동, board 단계 없음
};

function CardTutorialOverlay({
  stage, nudge, lang,
}: { stage: number; nudge: "card" | "board"; lang: string }) {
  const guide = GUIDE_CARD[stage];
  if (!guide) return null;

  if (nudge === "card") {
    const msg = lang === 'ko' ? guide.msgKo : guide.msgEn;
    return (
      <div style={{
        position: 'absolute', bottom: 8, left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50, pointerEvents: 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
      }}>
        {/* 말풍선 */}
        <div style={{
          background: 'rgba(255,251,235,0.97)',
          border: '2px solid #fbbf24',
          borderRadius: 14,
          padding: '8px 18px',
          fontSize: 13, fontWeight: 800,
          color: '#92400e',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          whiteSpace: 'nowrap',
          animation: 'tutorialBounce 1.2s ease-in-out infinite',
        }}>
          ✨ {msg}
        </div>
        {/* 아래쪽 삼각형 화살표 */}
        <div style={{
          width: 0, height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '10px solid #fbbf24',
          marginTop: -1,
        }} />
      </div>
    );
  }

  /* nudge === "board" */
  const boardMsg = GUIDE_BOARD_MSG[stage];
  if (!boardMsg?.ko) return null;
  const msg = lang === 'ko' ? boardMsg.ko : boardMsg.en;
  return (
    <div style={{
      position: 'absolute', top: 8, left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 50, pointerEvents: 'none',
      background: 'rgba(240,253,244,0.97)',
      border: '2px solid #86efac',
      borderRadius: 14,
      padding: '7px 18px',
      fontSize: 13, fontWeight: 800,
      color: '#166534',
      boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
      whiteSpace: 'nowrap',
    }}>
      🎯 {msg}
    </div>
  );
}
