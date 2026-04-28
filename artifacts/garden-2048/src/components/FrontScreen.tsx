/* ============================================================
 * FrontScreen.tsx
 * 홈 화면 — 배경 콘텐츠 영역 기준 좌표계 + 에셋 비율 유지
 * ============================================================ */

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { PlayerData } from "@/utils/playerData";
import {
  MissionState, MissionId, DAILY_MISSIONS,
  WeeklyMissionState, WeeklyMissionId, WEEKLY_MISSIONS,
} from "@/utils/missionData";
import { getAdCoinState } from "@/utils/adService";
import { type Inventory, type ShopItemId } from "@/utils/shopData";
import type { SubscriptionState } from "@/utils/subscriptionData";
import type { GameSettings } from "@/hooks/useSettings";
import { useTranslation } from "@/i18n";
import {
  type Season,
  getSeason,
  SEASON_BG,
  SEASON_PULSE_COLOR,
  SEASON_NODE_FILTER,
} from "@/utils/seasonData";
import { SEASON_THEMES, type SeasonTheme } from "@/utils/seasonTheme";
import { SeasonTransition }       from "./modals/SeasonTransition";
import { ItemsModal }             from "./modals/ItemsModal";
import { CardCollectionModal }    from "./modals/CardCollectionModal";
import { HomeShopModal }          from "./modals/HomeShopModal";
import { SettingsModal }          from "./modals/SettingsModal";
import { PremiumPassModal }       from "./modals/PremiumPassModal";
import { EndlessDifficultyModal } from "./modals/EndlessDifficultyModal";
import type { EndlessDifficulty } from "@/utils/endlessModeData";
import { TutorialModal }          from "./TutorialModal";

/* ============================================================
 * Design constants
 * ============================================================ */
const DESIGN_W = 1120;
const DESIGN_H = 2048;

/* ── Background layout (home-bg.svg fills 100% × 100% of container) ── */
interface BgLayout { offsetX: number; offsetY: number; renderW: number; renderH: number; containerW: number; containerH: number }

function toRenderPoint(designX: number, designY: number, bg: BgLayout) {
  const scaleX = bg.renderW / DESIGN_W;
  const scaleY = bg.renderH / DESIGN_H;
  return { rx: bg.offsetX + designX * scaleX, ry: bg.offsetY + designY * scaleY, scaleX, scaleY };
}

/* ── Stage node template (center anchor in design space) ────── */
type StageNodeTemplate = {
  stage:   number;
  cx:      number;
  cy:      number;
  offsetX?: number;
  offsetY?: number;
};

/* 20개 노드 — 디자인 좌표 (cx, cy) 기준 center anchor */
/* 돌길 중앙 center anchor — 레퍼런스 이미지 정밀 트레이싱 후 균등 간격(≈173px) */
const STAGE_NODE_TEMPLATES: StageNodeTemplate[] = [
  { stage:  1, cx:  914, cy: 1718 },
  { stage:  2, cx:  856, cy: 1588 },
  { stage:  3, cx:  716, cy: 1523 },
  { stage:  4, cx:  560, cy: 1548 },
  { stage:  5, cx:  395, cy: 1558 },
  { stage:  6, cx:  264, cy: 1483 },
  { stage:  7, cx:  217, cy: 1353 },
  { stage:  8, cx:  304, cy: 1235 },
  { stage:  9, cx:  466, cy: 1194 },
  { stage: 10, cx:  629, cy: 1206 },
  { stage: 11, cx:  798, cy: 1183 },
  { stage: 12, cx:  898, cy: 1064 },
  { stage: 13, cx:  873, cy:  934 },
  { stage: 14, cx:  779, cy:  828 },
  { stage: 15, cx:  659, cy:  756 },
  { stage: 16, cx:  524, cy:  722 },
  { stage: 17, cx:  399, cy:  703 },
  { stage: 18, cx:  305, cy:  638 },
  { stage: 19, cx:  415, cy:  567 },
  { stage: 20, cx:  544, cy:  523 },
];

const LEVELS_PER_PAGE = 20;
const MAX_PAGES       = 5;

/* ── Menu data ─────────────────────────────────────────────── */
interface MenuItemDef {
  key:         string;
  x:           number;
  y:           number;
  iconPng:     string;  // PNG 아이콘 경로
  bgColor:     string;  // 카드 배경색
  textColor:   string;  // 라벨 텍스트 색상
  shadowColor?: string; // 하단 3D 쉐도우 색 (없으면 bgColor 기반 자동)
}

/* ── 계절별 메뉴 카드 색상 ────────────────────────────────── */
const SEASON_MENU_PALETTE: Record<Season, { bg: string; text: string; shadow: string }> = {
  // 봄: 벚꽃 핑크+연두 배경 → 따뜻한 아이보리 크림
  spring: { bg: "#F7EED8", text: "#5A3210", shadow: "rgba(90,50,16,0.50)"  },
  // 여름: 선명한 초록+하늘+해바라기 배경 → 따뜻한 선샤인 크림
  summer: { bg: "#FFF8CA", text: "#5A3C00", shadow: "rgba(90,60,0,0.55)"   },
  // 가을: 짙은 주황/황금 단풍 배경 → 부드러운 황금 크림 (배경보다 밝고 채도 낮게)
  autumn: { bg: "#F5E0A8", text: "#5A2800", shadow: "rgba(90,40,0,0.55)"   },
  // 겨울: 흰눈+연한 파랑 배경 → 아이시 화이트 (배경보다 밝고 따뜻)
  winter: { bg: "#EDF4FB", text: "#1A3858", shadow: "rgba(26,56,88,0.45)"  },
};

/* ── 계절별 START 버튼 CSS filter
 *  원본 SVG 황금/앰버(hue≈38°) 기준 계절 보정
 */
const SEASON_START_FILTER: Record<Season, string> = {
  // 봄: 원본 골드 거의 그대로
  spring: "saturate(1.05) brightness(1.03)",
  // 여름: 밝고 따뜻한 골드 유지
  summer: "saturate(1.15) brightness(1.06)",
  // 가을: 더 진한 주황-빨강
  autumn: "hue-rotate(-25deg) saturate(1.40) brightness(0.95)",
  // 겨울: 쿨 블루
  winter: "hue-rotate(175deg) saturate(0.80) brightness(1.10)",
};

/* ── 계절별 타이틀 CSS filter ───────────────────────────── */
const SEASON_TITLE_FILTER: Record<Season, string> = {
  spring: "none",                                                         // 원본 유지
  summer: "saturate(1.2) brightness(1.05)",                              // 따뜻한 골드 강조
  autumn: "sepia(0.30) saturate(1.5) hue-rotate(-15deg)",               // 주황-갈색
  winter: "saturate(0.50) hue-rotate(195deg) brightness(1.10)",         // 쿨 블루
};

type NodeStatus = "done" | "current" | "available" | "locked";

/* ── Active modal type ─────────────────────────────────────── */
type ActiveModal = "items" | "cards" | "shop" | "settings" | "premium" | "endless" | null;

/* ── Props ─────────────────────────────────────────────────── */
interface FrontScreenProps {
  player:                 PlayerData;
  selectedThemeId?:       string;
  onSelectTheme?:         (id: string) => void;
  onStartGame:            () => void;
  missions?:              MissionState[];
  onClaimMission?:        (id: MissionId) => number;
  weeklyMissions?:        WeeklyMissionState[];
  onClaimWeeklyMission?:  (id: WeeklyMissionId) => number;
  onEarnCoins?:           (amount: number) => void;
  onAdWatched?:           () => void;
  inventory?:             Inventory;
  onBuyItem?:             (id: ShopItemId, cost: number) => boolean;
  settings?:              GameSettings;
  onToggleSetting?:       (key: keyof GameSettings) => void;
  isPremiumActive?:       boolean;
  subscriptionState?:     SubscriptionState;
  onBuyPremium?:          () => Promise<void>;
  onStartEndless?:        (difficulty: EndlessDifficulty, resume: boolean) => void;
}

const DEFAULT_SETTINGS: GameSettings = {
  sound: true, vibration: true, animation: true, notifications: false,
};

/* ============================================================
 * FrontScreen
 * ============================================================ */
export function FrontScreen({
  player, onStartGame,
  missions = [], onClaimMission,
  weeklyMissions = [], onClaimWeeklyMission,
  onEarnCoins, onAdWatched,
  inventory, onBuyItem,
  settings = DEFAULT_SETTINGS, onToggleSetting,
  isPremiumActive = false, subscriptionState, onBuyPremium,
  onStartEndless,
}: FrontScreenProps) {
  const { t } = useTranslation();
  const containerRef                        = useRef<HTMLDivElement>(null);
  const [bg, setBg]                         = useState<BgLayout>({ offsetX: 0, offsetY: 0, renderW: 0, renderH: 0, containerW: 0, containerH: 0 });
  const [showMissionModal,    setShowMissionModal]    = useState(false);
  const [activeModal,         setActiveModal]         = useState<ActiveModal>(null);
  const [showTutorialReplay,  setShowTutorialReplay]  = useState(false);
// ── 계절 판별 — clearedLevel+1 = 플레이어가 현재 있는 stage 기준 ──
  const season: Season = getSeason(Math.max(1, player.clearedLevel + 1));

  /* ── 계절 전환 애니메이션 ───────────────────────────────────────────
     localStorage 에 마지막으로 머물렀던 계절을 저장하고, FrontScreen이
     마운트되거나 clearedLevel 변경으로 season이 바뀌면 1회 재생한다.
     (초기 진입 시에는 재생하지 않고 현재 계절만 저장) */
  const SEASON_LAST_KEY = "plant2048_last_season";
  const [seasonTransition, setSeasonTransition] =
    useState<{ from: Season; to: Season } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(SEASON_LAST_KEY) as Season | null;
    if (!stored) {
      localStorage.setItem(SEASON_LAST_KEY, season);
      return;
    }
    if (stored !== season) {
      setSeasonTransition({ from: stored, to: season });
    }
  }, [season]);

  const handleSeasonTransitionDone = () => {
    setSeasonTransition((cur) => {
      if (cur) localStorage.setItem(SEASON_LAST_KEY, cur.to);
      return null;
    });
  };

  /* 컨테이너 크기 추적 → BgLayout 업데이트 (cover 모드 기준) */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      // cover: 이미지 비율을 유지하면서 컨테이너를 꽉 채우는 scale 계산
      const scaleX = width  / DESIGN_W;
      const scaleY = height / DESIGN_H;
      const scale  = Math.max(scaleX, scaleY); // cover = 큰 쪽 기준
      const renderW = DESIGN_W * scale;
      const renderH = DESIGN_H * scale;
      // 수평: 중앙 정렬 / 수직: top 정렬 (하단 스테이지 잘림 방지)
      const offsetX = (width  - renderW) / 2;
      const offsetY = Math.max(0, (height - renderH) / 2); // 위쪽 기준 정렬
      setBg({ offsetX, offsetY, renderW, renderH, containerW: width, containerH: height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const closeModal = () => setActiveModal(null);

  const completedDaily  = missions.filter((m) => m.status === "complete").length;
  const completedWeekly = weeklyMissions.filter((m) => m.status === "complete").length;
  const missionBadge    = completedDaily + completedWeekly;

  /* 노드 클릭 */
  const handleNodeSelect = (level: number) => {
    const status: NodeStatus =
      level <= player.clearedLevel      ? "done"      :
      level === player.clearedLevel + 1 ? "current"   :
      level === player.clearedLevel + 2 ? "available" : "locked";
    if (status === "current") onStartGame();
  };

  /* 메뉴 데이터 — 22.svg 디자인 좌표 기준 (1120×2048)
   * textTopRatio: SVG 텍스트 시작 y (카드 공간 기준, 5px 여유) / 179
   *   mission/card: minTextY≈289~502, card-rel≈123, ratio≈0.689 → safe 0.65
   *   infinite:     minTextY≈720,    card-rel≈128, ratio≈0.717 → safe 0.68
   *   shop:         minTextY≈294,    card-rel≈128, ratio≈0.717 → safe 0.68
   *   settings:     minTextY≈502,    card-rel≈123, ratio≈0.687 → safe 0.65
   *   subscribe:    minTextY≈722,    card-rel≈130, ratio≈0.726 → safe 0.69
   */
  const mp = SEASON_MENU_PALETTE[season];
  const leftMenuItems: MenuItemDef[] = [
    { key: "mission",  x:  37, y: 166, iconPng: "/menu-mission.png",  bgColor: mp.bg, textColor: mp.text, shadowColor: mp.shadow },
    { key: "card",     x:  37, y: 379, iconPng: "/menu-card.png",     bgColor: mp.bg, textColor: mp.text, shadowColor: mp.shadow },
    { key: "infinite", x:  37, y: 592, iconPng: "/menu-infinite.png", bgColor: "#7F239D", textColor: "#F4FFF8", shadowColor: "rgba(81,9,104,0.65)" },
  ];
  const rightMenuItems: MenuItemDef[] = [
    { key: "shop",     x: 906, y: 166, iconPng: "/menu-shop.png",     bgColor: mp.bg, textColor: mp.text, shadowColor: mp.shadow },
    { key: "settings", x: 906, y: 379, iconPng: "/menu-settings.png", bgColor: mp.bg, textColor: mp.text, shadowColor: mp.shadow },
    ...(!isPremiumActive ? [
      { key: "subscribe", x: 906, y: 592, iconPng: "/menu-subscribe.png", bgColor: "#FFAE00", textColor: "#6D1D00", shadowColor: "rgba(239,120,0,0.65)" },
    ] : []),
  ];

  const menuLabel: Record<string, string> = {
    mission:   t("menu.missions"),
    card:      t("menu.cards"),
    infinite:  t("menu.endless"),
    shop:      t("menu.shop"),
    settings:  t("menu.settings"),
    subscribe: isPremiumActive ? t("menu.premium") : t("menu.subscribe"),
  };

  const menuBadge: Partial<Record<string, number>> = {
    mission: missionBadge > 0 ? missionBadge : undefined,
  };

  const menuOnClick: Record<string, () => void> = {
    mission:   () => setShowMissionModal(true),
    card:      () => setActiveModal("cards"),
    infinite:  () => setActiveModal("endless"),
    shop:      () => setActiveModal("shop"),
    settings:  () => setActiveModal("settings"),
    subscribe: () => setActiveModal("premium"),
  };

  const ready = bg.renderW > 0 && bg.renderH > 0;

  return (
    <div ref={containerRef} className="relative h-[100dvh] w-full overflow-hidden">

      {/* ── 계절 전환 애니메이션 오버레이 ────────────────────────────── */}
      {seasonTransition && (
        <SeasonTransition
          from={seasonTransition.from}
          to={seasonTransition.to}
          onDone={handleSeasonTransitionDone}
        />
      )}

      {/* ── 튜토리얼 다시 보기 (설정에서 열릴 때) ──────────────────── */}
      {showTutorialReplay && (
        <TutorialModal onDone={() => setShowTutorialReplay(false)} />
      )}

{/* ── 배경 이미지 — 계절(season)에 따라 home_bg_1~4.svg 로 자동 교체 ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:    `url(${SEASON_BG[season]})`,
          backgroundSize:     "cover",
          backgroundPosition: "center top",
          backgroundRepeat:   "no-repeat",
          zIndex: 0,
          opacity:            0.80,
          transition:         "background-image 0.6s ease, opacity 0.6s ease",
        }}
      />

      {/* ── 좌표 기반 UI (배경 렌더 영역 기준) ───────────────── */}
      {ready && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>

          {/* ── 상단 생명력 / 코인 표시 ─────────────────────── */}
          <LivesDisplay lives={player.lives} bg={bg} season={season} />
          <TopCoinDisplay coins={player.coins} bg={bg} season={season} />

          {/* ── 타이틀 ──────────────────────────────────────── */}
          <HomeTitle bg={bg} season={season} />


          {/* ── 메뉴 버튼 ────────────────────────────────────── */}
          {[...leftMenuItems, ...rightMenuItems].map((item) => (
            <HomeMenuButton
              key={item.key}
              item={item}
              label={menuLabel[item.key] ?? item.key}
              badge={menuBadge[item.key]}
              bg={bg}
              onClick={menuOnClick[item.key]}
            />
          ))}

          {/* ── 스테이지 노드 맵 ─────────────────────────────── */}
          <HomeStageMap
            clearedLevel={player.clearedLevel}
            bg={bg}
            season={season}
            onSelectLevel={handleNodeSelect}
          />

          {/* ── START 버튼 ───────────────────────────────────── */}
          <StartButton bg={bg} season={season} onClick={onStartGame} />

        </div>
      )}

      {/* ── 하단 광고 (portal) ──────────────────────────────── */}
      {createPortal(
        <div className="fixed bottom-0 left-0 right-0 z-[30]">
          <AdBanner />
        </div>,
        document.body,
      )}

      {/* ── 미션 모달 ─────────────────────────────────────────── */}
      {showMissionModal && (
        <MissionModal
          missions={missions}
          weeklyMissions={weeklyMissions}
          onClaimDaily={onClaimMission}
          onClaimWeekly={onClaimWeeklyMission}
          onEarnCoins={onEarnCoins}
          onAdWatched={onAdWatched}
          onClose={() => setShowMissionModal(false)}
          season={season}
        />
      )}


      {activeModal === "cards" && (
        <CardCollectionModal
          player={player}
          subscriptionState={{ isPremium: isPremiumActive, trialUsed: false, trialActive: false, trialExpiry: null }}
          onClose={closeModal}
          onOpenPremium={() => setActiveModal("premium")}
          season={season}
        />
      )}

      {activeModal === "premium" && (
        <PremiumPassModal
          onBuy={async () => { await onBuyPremium?.(); closeModal(); }}
          onClose={closeModal}
          subscriptionState={subscriptionState}
          season={season}
        />
      )}

      {activeModal === "endless" && (
        <EndlessDifficultyModal
          onStart={(diff) => { closeModal(); onStartEndless?.(diff, false); }}
          onContinue={(diff) => { closeModal(); onStartEndless?.(diff, true); }}
          onClose={closeModal}
          season={season}
        />
      )}

      {activeModal === "items" && inventory && (
        <ItemsModal inventory={inventory} onClose={closeModal} season={season} />
      )}

      {activeModal === "shop" && inventory && onBuyItem && (
        <HomeShopModal
          player={player}
          inventory={inventory}
          onBuyItem={onBuyItem}
          onEarnCoins={onEarnCoins}
          onClose={closeModal}
          isPremiumActive={isPremiumActive}
          onOpenPremium={() => setActiveModal("premium")}
          season={season}
        />
      )}

      {activeModal === "settings" && onToggleSetting && (
        <SettingsModal
          settings={settings}
          onToggle={onToggleSetting}
          onClose={closeModal}
          onShowTutorial={() => { closeModal(); setShowTutorialReplay(true); }}
          subscriptionState={subscriptionState}
          onBuyPremium={onBuyPremium}
          season={season}
        />
      )}

    </div>
  );
}

/* ============================================================
 * HomeTitle — title.svg, width 기준 비율 유지
 * ============================================================ */
function HomeTitle({ bg, season }: { bg: BgLayout; season: Season }) {
  const { ry, scaleX } = toRenderPoint(388, 162, bg);
  const w = 344 * scaleX * 1.2;
  return (
    <img
      src="/title.svg"
      alt="Garden 2048"
      draggable={false}
      style={{
        position:      "absolute",
        left:          "50%",
        transform:     "translateX(-50%)",
        top:           ry,
        width:         w,
        height:        "auto",
        objectFit:     "contain",
        zIndex:        10,
        pointerEvents: "none",
        filter:        SEASON_TITLE_FILTER[season],
        transition:    "filter 0.6s ease",
      }}
    />
  );
}

/* ============================================================
 * LivesDisplay — 홈 상단 생명력 표시 (design coords 300, 100)
 * ============================================================ */
function LivesDisplay({ lives, bg, season }: { lives: number; bg: BgLayout; season: Season }) {
  const { rx, ry, scaleX } = toRenderPoint(300, 100, bg);
  const fontSize  = Math.max(13, 15 * scaleX);
  const palette   = SEASON_MENU_PALETTE[season];
  const MAX_SLOTS = 5;
  const filled    = Math.min(lives, MAX_SLOTS);
  const bonus     = Math.max(0, lives - MAX_SLOTS);

  return (
    <div
      style={{
        position:      "absolute",
        left:          rx,
        top:           ry,
        transform:     "translateX(-50%)",
        zIndex:        20,
        pointerEvents: "none",
        display:       "flex",
        alignItems:    "center",
        gap:           3 * scaleX,
        background:    palette.bg + "dd",
        border:        `1px solid ${palette.text}40`,
        borderRadius:  9999,
        padding:       `${4 * scaleX}px ${10 * scaleX}px`,
        boxShadow:     `0 2px 8px ${palette.shadow}`,
        backdropFilter:"blur(4px)",
      }}
    >
      {Array.from({ length: MAX_SLOTS }, (_, i) => (
        <span key={i} style={{ fontSize: fontSize + 2, lineHeight: 1, opacity: i < filled ? 1 : 0.25 }}>
          ❤️
        </span>
      ))}
      {bonus > 0 && (
        <span style={{ fontSize, fontWeight: 800, color: palette.text, lineHeight: 1, marginLeft: 2 * scaleX }}>
          +{bonus}
        </span>
      )}
    </div>
  );
}

/* ============================================================
 * TopCoinDisplay — 홈 상단 코인 표시 (design coords 820, 100)
 * ============================================================ */
function TopCoinDisplay({ coins, bg, season }: { coins: number; bg: BgLayout; season: Season }) {
  const { rx, ry, scaleX } = toRenderPoint(820, 100, bg);
  const fontSize = Math.max(13, 15 * scaleX);
  const palette  = SEASON_MENU_PALETTE[season];

  return (
    <div
      style={{
        position:      "absolute",
        left:          rx,
        top:           ry,
        transform:     "translateX(-50%)",
        zIndex:        20,
        pointerEvents: "none",
        display:       "flex",
        alignItems:    "center",
        gap:           6 * scaleX,
        background:    palette.bg + "dd",
        border:        `1px solid ${palette.text}40`,
        borderRadius:  9999,
        padding:       `${4 * scaleX}px ${10 * scaleX}px`,
        boxShadow:     `0 2px 8px ${palette.shadow}`,
        backdropFilter:"blur(4px)",
      }}
    >
      <span style={{ fontSize: fontSize + 2, lineHeight: 1 }}>🪙</span>
      <span style={{ fontSize, fontWeight: 800, color: palette.text, lineHeight: 1 }}>
        {coins.toLocaleString()}
      </span>
    </div>
  );
}

/* ============================================================
 * HomeMenuButton — 배경 좌표계 기준 메뉴 카드
 * ============================================================ */
interface HomeMenuButtonProps {
  item:    MenuItemDef;
  label:   string;
  badge?:  number;
  bg:      BgLayout;
  onClick: () => void;
}

function HomeMenuButton({ item, label, badge, bg, onClick }: HomeMenuButtonProps) {
  const { rx, ry, scaleX } = toRenderPoint(item.x, item.y, bg);
  // SVG 원본: 카드 173×173 시각 영역 + 하단 6px 그림자 = 총 179px
  const cardW      = 173 * scaleX;
  const cardVisH   = 173 * scaleX;  // 시각적 카드 높이
  const cardH      = 179 * scaleX;  // 버튼 전체 높이 (그림자 포함)
  const cornerR    = 30 * scaleX;
  // SVG 참고: 라벨 영역 ~48px (카드 125px 지점부터 173px 까지)
  const labelH     = 48 * scaleX;

  const screenPad  = 6;
  const isLeftMenu = item.x < DESIGN_W / 2;
  const clampedX   = isLeftMenu
    ? Math.max(screenPad, rx)
    : Math.min(bg.containerW - cardW - screenPad, rx);

  // 3D 카드 하단 쉐도우: item.shadowColor 우선, 없으면 기존 fallback
  const shadowColor = item.shadowColor ?? "rgba(197,154,104,1.0)";
  const cardShadow = `0 6px 0 ${shadowColor}, 0 10px 18px rgba(0,0,0,0.13)`;

  return (
    <button
      onClick={onClick}
      onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.95)"; }}
      onPointerUp={(e)   => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
      onPointerLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
      aria-label={label}
      style={{
        position:      "absolute",
        left:          clampedX,
        top:           ry,
        width:         cardW,
        height:        cardH,
        background:    "transparent",
        border:        "none",
        padding:       0,
        cursor:        "pointer",
        zIndex:        20,
        pointerEvents: "auto",
        transition:    "transform 0.15s ease",
      }}
    >
      {/* 뱃지 — SVG 참고: 49×49px 빨간 원, 카드 우상단 7px 오버플로우 */}
      {badge !== undefined && (
        <span style={{
          position:       "absolute",
          top:            0,
          right:          -7 * scaleX,
          width:          49 * scaleX,
          height:         49 * scaleX,
          background:     "#EB0000",
          color:          "#fff",
          fontSize:       Math.max(11, badge > 9 ? 14 * scaleX : 18 * scaleX),
          fontWeight:     800,
          borderRadius:   "50%",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          zIndex:         2,
        }}>
          {badge}
        </span>
      )}

      {/* 카드 본체 — 시각 높이 173px (그림자 제외) */}
      <div style={{
        width:           cardW,
        height:          cardVisH,
        borderRadius:    cornerR,
        overflow:        "hidden",
        display:         "flex",
        flexDirection:   "column",
        justifyContent:  "space-between",
        alignItems:      "center",
        paddingTop:      18.5 * scaleX,
        paddingBottom:   18.5 * scaleX,
        boxShadow:       cardShadow,
        background:      item.bgColor,
      }}>
        {/* 아이콘 */}
        <img
          src={item.iconPng}
          alt=""
          draggable={false}
          style={{
            width:     90 * scaleX,
            height:    90 * scaleX,
            objectFit: "contain",
            flexShrink: 0,
          }}
        />

        {/* 라벨 */}
        <span style={{
          fontSize:      Math.max(12, 30 * scaleX),
          fontWeight:    700,
          color:         item.textColor,
          lineHeight:    1,
          textAlign:     "center",
          whiteSpace:    "nowrap",
          letterSpacing: "-0.3px",
          flexShrink:    0,
        }}>
          {label}
        </span>
      </div>
    </button>
  );
}

/* ============================================================
 * HomeStageMap — 20개 노드 페이지 기반 슬라이드 (부동 윈도우)
 *
 * 기존: MAX_PAGES=5 고정 범위(스테이지 1-100)
 * 수정: actualPage를 중심으로 MAX_PAGES 크기의 윈도우를 부동시켜
 *       스테이지 249/499/749 등 고단계에서도 올바른 노드를 표시한다.
 *
 * ── 윈도우 계산 ──────────────────────────────────────────
 *   actualPage  = floor(clearedLevel / 20)
 *   windowStart = max(0, actualPage - HALF)
 *   visualSlot  = actualPage - windowStart   ← 화면 내 슬롯(0~MAX_PAGES-1)
 *
 * transform 은 visualSlot 기준으로 계산되므로 actualPage가 커져도
 * 항상 [0, MAX_PAGES-1] 범위의 슬롯을 가리킨다.
 * ============================================================ */
function HomeStageMap({
  clearedLevel,
  bg,
  season,
  onSelectLevel,
}: {
  clearedLevel:  number;
  bg:            BgLayout;
  season:        Season;
  onSelectLevel: (level: number) => void;
}) {
  const HALF        = Math.floor(MAX_PAGES / 2);                         // = 2
  const actualPage  = Math.floor(Math.max(0, clearedLevel) / LEVELS_PER_PAGE);
  const windowStart = Math.max(0, actualPage - HALF);                    // 윈도우 첫 페이지 (실제 페이지 번호)
  const visualSlot  = Math.min(actualPage - windowStart, MAX_PAGES - 1); // 윈도우 내 현재 슬롯(0~4)

  return (
    <div
      style={{
        position:      "absolute",
        inset:         0,
        overflow:      "hidden",
        pointerEvents: "none",
        zIndex:        10,  // 메뉴(20) 아래, 타이틀(10)과 동일
      }}
    >
      <div
        style={{
          position:   "absolute",
          top:        0,
          left:       0,
          right:      0,
          height:     `${MAX_PAGES * 100}dvh`,
          transform:  `translateY(-${(MAX_PAGES - 1 - visualSlot) * 100}dvh)`,
          transition: "transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "transform",
        }}
      >
        {Array.from({ length: MAX_PAGES }, (_, i) => {
          /* i = 시각적 슬롯 인덱스(고정), pageActual = 실제 페이지 번호(윈도우에 따라 변동) */
          const pageActual = windowStart + i;
          const pageStart  = pageActual * LEVELS_PER_PAGE + 1;

          return (
            <div
              key={i}  /* 시각적 슬롯 키 고정 — 윈도우 이동 시 DOM 재활용 */
              style={{
                position: "absolute",
                top:      `${(MAX_PAGES - 1 - i) * 100}dvh`,
                left:     0,
                right:    0,
                height:   "100dvh",
              }}
            >
              {STAGE_NODE_TEMPLATES.map((tmpl) => {
                const level   = pageStart + (tmpl.stage - 1);
                const status: NodeStatus =
                  level <= clearedLevel      ? "done"      :
                  level === clearedLevel + 1 ? "current"   :
                  level === clearedLevel + 2 ? "available" : "locked";

                const { rx, ry, scaleX } = toRenderPoint(
                  tmpl.cx + (tmpl.offsetX ?? 0),
                  tmpl.cy + (tmpl.offsetY ?? 0),
                  bg,
                );

                return (
                  <StageNode
                    key={level}
                    level={level}
                    status={status}
                    season={season}
                    x={rx}
                    y={ry}
                    scaleX={scaleX}
                    onClick={() => onSelectLevel(level)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
 * NODE_ASSETS — status 기준 PNG 경로 매핑
 * spring 에셋만 사용하고, 여름/가을/겨울은 CSS filter 로 톤 변경
 * (SEASON_NODE_FILTER in seasonData.ts)
 * ============================================================ */
const NODE_ASSETS: Record<NodeStatus, string> = {
  done:      "/nodes/spring_end.png",
  current:   "/nodes/spring_stay.png",
  available: "/nodes/spring_ready.png",
  locked:    "/nodes/spring_ready.png",
};

/* ============================================================
 * StageNode — 위치·크기·배지 구조 절대 변경 금지
 * 변경 범위: <NodeSvg> → <img> (PNG asset), button에 float 애니메이션
 * ============================================================ */
interface StageNodeProps {
  level:   number;
  status:  NodeStatus;
  season:  Season;
  x:       number;
  y:       number;
  scaleX:  number;
  onClick: () => void;
}

function StageNode({ level, status, season, x, y, scaleX, onClick }: StageNodeProps) {
  const isDone      = status === "done";
  const isCurrent   = status === "current";
  const isLocked    = status === "locked";
  const isAvailable = status === "available";

  // ── 크기: 절대 변경 금지 ─────────────────────────────────
  const nodeHeight = 130 * scaleX;
  const nodeWidth  = nodeHeight * (115 / 130);

  // ── 배지 크기: 절대 변경 금지 ────────────────────────────
  const badgeSize     = Math.max(18, 52 * scaleX);
  const badgeFontSize = Math.max(10, 14 * scaleX);

  return (
    <div
      style={{
        position:      "absolute",
        left:          x,          // ← 절대 변경 금지
        top:           y,          // ← 절대 변경 금지
        width:         nodeWidth,  // ← 절대 변경 금지
        transform:     "translate(-50%, -50%)",  // ← 절대 변경 금지
        pointerEvents: isCurrent ? "auto" : "none",
        zIndex:        isCurrent ? 7 : 6,
      }}
    >
      {/* ── STAY 글로우 & 링 (outer div 기준 — float와 독립) ── */}
      {isCurrent && (() => {
        /* 링 공통 크기: 노드 너비 기준 원형 */
        const ringSize = nodeWidth * 1.15;
        const ringOff  = -ringSize / 2;
        const ringBase: React.CSSProperties = {
          position:      "absolute",
          top:           "50%",
          left:          "50%",
          marginTop:     ringOff,
          marginLeft:    ringOff,
          width:         ringSize,
          height:        ringSize,
          borderRadius:  "50%",
          pointerEvents: "none",
          transformOrigin: "center",
        };
        return (
          <>
            {/* 1) 앰비언트 글로우 — 항상 보이는 부드러운 흰 원 */}
            <div style={{
              position:      "absolute",
              top:           "50%",
              left:          "50%",
              marginTop:     -nodeWidth * 0.85,
              marginLeft:    -nodeWidth * 0.85,
              width:         nodeWidth * 1.7,
              height:        nodeWidth * 1.7,
              borderRadius:  "50%",
              background:    "radial-gradient(circle, rgba(255,255,255,0.20) 0%, transparent 68%)",
              pointerEvents: "none",
            }} />
            {/* 2) 링 A — 0s 시작, 1px→5px */}
            <span style={{ ...ringBase, border: "1px solid rgba(255,255,255,0.7)", animation: "stayRingPulse 2.4s ease-out infinite" }} />
            {/* 3) 링 B — 1.2s 지연, 1px→5px */}
            <span style={{ ...ringBase, border: "1px solid rgba(255,255,255,0.7)", animation: "stayRingPulse 2.4s ease-out 1.2s infinite" }} />
          </>
        );
      })()}

      {/* inner button — float 애니메이션은 여기에만 적용
          (outer div의 translate(-50%,-50%) 위치 기준을 보존하기 위함) */}
      <button
        onClick={onClick}
        className={isCurrent ? "node-float" : undefined}
        style={{
          display:    "block",
          width:      "100%",
          background: "none",
          border:     "none",
          padding:    0,
          cursor:     isCurrent ? "pointer" : "default",
          position:   "relative",
          animation:  isCurrent
            ? "nodeFloat 2.4s ease-in-out infinite"
            : undefined,
        }}
        aria-label={`스테이지 ${level}`}
      >
        {/* PNG 노드 아이콘 — spring 에셋 + 계절별 CSS filter */}
        <img
          src={NODE_ASSETS[status]}
          alt=""
          draggable={false}
          style={{
            display:    "block",
            width:      "100%",
            height:     nodeHeight,
            objectFit:  "contain",
            opacity:    status === "done" ? 0.72 : 1,
            filter:     SEASON_NODE_FILTER[season],
          }}
        />

        {/* 배지 + 숫자 — 위치(left/top/transform) 절대 변경 금지 */}
        <div
          style={{
            position:      "absolute",
            left:          "50%",   // ← 절대 변경 금지
            top:           "60%",   // ← 절대 변경 금지
            transform:     "translateX(-50%)",
            width:         badgeSize,
            height:        badgeSize,
            borderRadius:  9999,
            // ── 게임 일러스트와 어울리는 earthy 팔레트 (글래스모피즘 제거) ──
            background:    isDone    ? "rgba(122,85,53,0.90)"    // 따뜻한 나무껍질 갈색
                         : isCurrent ? "rgba(240,144,32,0.90)"   // 황금 앰버
                         :             "rgba(168,152,120,0.90)", // 따뜻한 웜 그레이 베이지 (잠금)
            border:        isDone    ? `${Math.max(1, 1.5 * scaleX)}px solid #5A3A20`
                         : isCurrent ? `${Math.max(1, 1.5 * scaleX)}px solid #C06010`
                         :             `${Math.max(1, 1.5 * scaleX)}px solid #887858`,
            boxShadow:     isDone    ? "0 2px 4px rgba(40,20,5,0.45), inset 0 1px 0 rgba(255,255,255,0.12)"
                         : isCurrent ? "0 3px 8px rgba(160,80,10,0.55), inset 0 1px 0 rgba(255,255,255,0.35)"
                         :             "0 2px 4px rgba(60,40,15,0.30), inset 0 1px 0 rgba(255,255,255,0.15)",
            display:       "flex",
            alignItems:    "center",
            justifyContent:"center",
            pointerEvents: "none",
          }}
        >
          <span style={{
            color:      "#FFFFFF",
            fontSize:   badgeFontSize,
            fontWeight: 800,
            lineHeight: 1,
            textShadow: isDone    ? "0 1px 2px rgba(30,12,3,0.65)"
                      : isCurrent ? "0 1px 3px rgba(100,40,5,0.70)"
                      :             "0 1px 2px rgba(50,30,10,0.50)",
            whiteSpace: "nowrap",
          }}>
            {level}
          </span>
        </div>
      </button>
    </div>
  );
}

/* ============================================================
 * StartButton — start_button.svg + 계절별 CSS filter
 * ============================================================ */
function StartButton({ bg, season, onClick }: { bg: BgLayout; season: Season; onClick: () => void }) {
  const { rx, ry, scaleX } = toRenderPoint(365, 1715, bg);
  const w = 430 * scaleX;

  return (
    <button
      onClick={onClick}
      onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.95)"; }}
      onPointerUp={(e)   => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
      onPointerLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
      aria-label="START"
      style={{
        position:      "absolute",
        left:          rx,
        top:           ry,
        width:         w,
        background:    "none",
        border:        "none",
        padding:       0,
        cursor:        "pointer",
        zIndex:        25,
        pointerEvents: "auto",
        transition:    "transform 0.15s ease",
      }}
    >
      <img
        src="/start_button.svg"
        alt="START"
        draggable={false}
        style={{
          display:    "block",
          width:      "100%",
          height:     "auto",
          objectFit:  "contain",
          filter:     SEASON_START_FILTER[season],
          transition: "filter 0.6s ease",
        }}
      />
    </button>
  );
}

/* ============================================================
 * MissionModal
 * ============================================================ */
interface MissionModalProps {
  missions:        MissionState[];
  weeklyMissions:  WeeklyMissionState[];
  onClaimDaily?:   (id: MissionId) => number;
  onClaimWeekly?:  (id: WeeklyMissionId) => number;
  onEarnCoins?:    (amount: number) => void;
  onAdWatched?:    () => void;
  onClose:         () => void;
  season?:         Season;
}

function MissionModal({ missions, weeklyMissions, onClaimDaily, onClaimWeekly, onEarnCoins, onAdWatched, onClose, season = "spring" }: MissionModalProps) {
  const { t } = useTranslation();
  const theme = SEASON_THEMES[season];
  const [tab, setTab] = useState<"daily" | "weekly">("daily");

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[85dvh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300"
        style={{ background: theme.popupBg }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0"
          style={{ borderBottom: `1px solid ${theme.borderColor}50` }}
        >
          <h2 className="text-lg font-display font-bold flex items-center gap-1.5" style={{ color: theme.textPrimary }}>
            <img src="/menu-mission.png" className="w-6 h-6 object-contain" alt="" draggable={false} />
            {t("missions.title")}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all text-sm active:scale-95"
            style={{ background: theme.borderColor + "40", color: theme.textSecondary }}
          >✕</button>
        </div>

        <div className="flex gap-1 px-5 pb-3 pt-3 flex-shrink-0">
          {(["daily", "weekly"] as const).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
              style={tab === tabKey
                ? { background: theme.btnPrimary, color: theme.btnPrimaryText }
                : { background: theme.panelColor, color: theme.textMuted }
              }
            >
              {tabKey === "daily" ? t("missions.daily") : t("missions.weekly")}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {tab === "daily"
            ? <DailyMissionList missions={missions} onClaim={onClaimDaily} onEarnCoins={onEarnCoins} onAdWatched={onAdWatched} theme={theme} />
            : <WeeklyMissionList weeklyMissions={weeklyMissions} onClaim={onClaimWeekly} onEarnCoins={onEarnCoins} onAdWatched={onAdWatched} theme={theme} />
          }
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DailyMissionList({ missions, onClaim, onEarnCoins, onAdWatched, theme }: {
  missions: MissionState[]; onClaim?: (id: MissionId) => number;
  onEarnCoins?: (amount: number) => void; onAdWatched?: () => void;
  theme: SeasonTheme;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <FreeCoinsButton onEarnCoins={onEarnCoins} onAdWatched={onAdWatched} />
      {DAILY_MISSIONS.map((mission) => {
        const state = missions.find((s) => s.id === mission.id);
        const status = state?.status ?? "incomplete";
        const prog = state?.progress ?? 0;
        return (
          <div
            key={mission.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all"
            style={{
              background: status === "claimed" ? theme.panelColor : status === "complete" ? theme.btnPrimary + "15" : theme.panelColor,
              opacity: status === "claimed" ? 0.5 : 1,
              border: status === "complete" ? `1px solid ${theme.btnPrimary}40` : `1px solid transparent`,
            }}
          >
            <span className="text-xl flex-shrink-0">{mission.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight" style={{ color: theme.textPrimary }}>{t(mission.title)}</p>
              <p className="text-xs" style={{ color: theme.textMuted }}>{t(mission.description)}</p>
              {/* target>1인 미션은 항상 같은 높이의 진행 바 영역 확보 */}
              {mission.target > 1 && (
                <div className="mt-1 w-full h-1.5 rounded-full overflow-hidden" style={{ background: theme.borderColor + "40" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: status === "incomplete" ? `${(prog / mission.target) * 100}%` : "100%",
                      background: status === "incomplete" ? theme.btnPrimary + "80" : theme.btnPrimary + "40",
                    }}
                  />
                </div>
              )}
            </div>
            <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
              <span className="text-xs font-bold" style={{ color: "#e65100" }}>🪙{mission.reward}</span>
              {/* 고정 높이로 수령 전/후 행 높이 통일 */}
              <div className="h-[22px] flex items-center justify-end">
                {status === "complete" && (
                  <button
                    onClick={() => onClaim?.(mission.id)}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full active:scale-95 transition-all"
                    style={{ background: theme.btnPrimary, color: theme.btnPrimaryText }}
                  >{t("ranking.claimReward")}</button>
                )}
                {status === "claimed" && <span className="text-[10px] font-medium" style={{ color: theme.textMuted }}>✓</span>}
                {status === "incomplete" && mission.target > 1 && <span className="text-[10px]" style={{ color: theme.textMuted }}>{prog}/{mission.target}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeeklyMissionList({ weeklyMissions, onClaim, onEarnCoins, onAdWatched, theme }: {
  weeklyMissions: WeeklyMissionState[]; onClaim?: (id: WeeklyMissionId) => number;
  onEarnCoins?: (amount: number) => void; onAdWatched?: () => void;
  theme: SeasonTheme;

}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <FreeCoinsButton onEarnCoins={onEarnCoins} onAdWatched={onAdWatched} />
      {WEEKLY_MISSIONS.map((mission) => {
        const state = weeklyMissions.find((s) => s.id === mission.id);
        const status = state?.status ?? "incomplete";
        const prog = state?.progress ?? 0;
        return (
          <div
            key={mission.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all"
            style={{
              background: status === "claimed" ? theme.panelColor : status === "complete" ? theme.btnPrimary + "15" : theme.panelColor,
              opacity: status === "claimed" ? 0.5 : 1,
              border: status === "complete" ? `1px solid ${theme.btnPrimary}40` : `1px solid transparent`,
            }}
          >
            <span className="text-xl flex-shrink-0">{mission.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight" style={{ color: theme.textPrimary }}>{t(mission.title)}</p>
              <p className="text-xs" style={{ color: theme.textMuted }}>{t(mission.description)}</p>
              {/* target>1인 미션은 항상 같은 높이의 진행 바 영역 확보 */}
              {mission.target > 1 && (
                <div className="mt-1 w-full h-1.5 rounded-full overflow-hidden" style={{ background: theme.borderColor + "40" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: status === "incomplete" ? `${(prog / mission.target) * 100}%` : "100%",
                      background: status === "incomplete" ? "#FFC107" + "90" : "#FFC107" + "40",
                    }}
                  />
                </div>
              )}
            </div>
            <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
              <span className="text-xs font-bold" style={{ color: "#e65100" }}>🪙{mission.reward}</span>
              {/* 고정 높이로 수령 전/후 행 높이 통일 */}
              <div className="h-[22px] flex items-center justify-end">
                {status === "complete" && (
                  <button
                    onClick={() => onClaim?.(mission.id)}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full active:scale-95 transition-all"
                    style={{ background: theme.btnPrimary, color: theme.btnPrimaryText }}
                  >{t("ranking.claimReward")}</button>
                )}
                {status === "claimed" && <span className="text-[10px] font-medium" style={{ color: theme.textMuted }}>✓</span>}
                {status === "incomplete" && mission.target > 1 && <span className="text-[10px]" style={{ color: theme.textMuted }}>{prog}/{mission.target}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── FreeCoinsButton ────────────────────────────────────────── */
function FreeCoinsButton({ onEarnCoins, onAdWatched }: { onEarnCoins?: (n: number) => void; onAdWatched?: () => void }) {
  const { t } = useTranslation();
  const [adState, setAdState] = useState<"idle" | "watching">("idle");
  const [adInfo,  setAdInfo]  = useState(getAdCoinState());
  useEffect(() => { setAdInfo(getAdCoinState()); }, []);

  if (adInfo.remaining <= 0) {
    return <div className="w-full py-3 rounded-2xl bg-board/40 border border-board text-center text-xs text-foreground/30 font-medium mb-1">{t("common.watchAd")}</div>;
  }

  const handleWatch = async () => {
    if (adState === "watching") return;
    setAdState("watching");
    const { watchAdForCoins } = await import("@/utils/adService");
    const earned = await watchAdForCoins();
    setAdState("idle");
    if (earned > 0) { onEarnCoins?.(earned); onAdWatched?.(); setAdInfo(getAdCoinState()); }
  };

  return (
    <button onClick={handleWatch} disabled={adState === "watching"} className={["w-full py-2.5 rounded-2xl border-2 font-bold text-sm transition-all active:scale-95 mb-1", adState === "watching" ? "border-amber-200 bg-amber-50 text-amber-400 cursor-wait" : "border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100"].join(" ")}>
      {adState === "watching" ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          {t("game.watchingAd")}
        </span>
      ) : `📺 ${t("common.watchAd")} +100 (${adInfo.remaining})`}
    </button>
  );
}

/* ── AdBanner — 웹: 플레이스홀더 / 네이티브: AdMob 하단 배너 표시 ── */
function AdBanner() {
  useEffect(() => {
    let cancelled = false;
    import("@/utils/adProvider").then(({ showBanner }) => {
      if (!cancelled) void showBanner("bottom");
    });
    return () => {
      cancelled = true;
      import("@/utils/adProvider").then(({ removeBanner }) => void removeBanner());
    };
  }, []);

  return (
    <div
      className="w-full h-10 flex items-center justify-center text-[11px] font-medium select-none flex-shrink-0 border-t border-white/40 bg-white/55 backdrop-blur-sm text-foreground/30"
      aria-hidden="true"
    >
      AD
    </div>
  );
}
