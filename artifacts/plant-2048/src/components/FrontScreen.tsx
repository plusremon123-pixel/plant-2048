/* ============================================================
 * FrontScreen.tsx
 * 홈 화면 — 배경 콘텐츠 영역 기준 좌표계 + 에셋 비율 유지
 * ============================================================ */

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  PlayerData, LEVEL_REWARDS, xpForNextLevel, xpProgress,
} from "@/utils/playerData";
import {
  MissionState, MissionId, DAILY_MISSIONS,
  WeeklyMissionState, WeeklyMissionId, WEEKLY_MISSIONS,
} from "@/utils/missionData";
import { getAdCoinState } from "@/utils/adService";
import { type Inventory, type ShopItemId } from "@/utils/shopData";
import type { GameSettings } from "@/hooks/useSettings";
import { type PendingReward } from "@/utils/rankingData";
import { useTranslation } from "@/i18n";
import { RankingModal }           from "./modals/RankingModal";
import { ItemsModal }             from "./modals/ItemsModal";
import { CardCollectionModal }    from "./modals/CardCollectionModal";
import { HomeShopModal }          from "./modals/HomeShopModal";
import { SettingsModal }          from "./modals/SettingsModal";
import { DogamModal }             from "./modals/DogamModal";
import { PremiumPassModal }       from "./modals/PremiumPassModal";
import { EndlessDifficultyModal } from "./modals/EndlessDifficultyModal";
import type { EndlessDifficulty } from "@/utils/endlessModeData";

/* ============================================================
 * Design constants
 * ============================================================ */
const DESIGN_W = 1152;
const DESIGN_H = 2048;

/* ── Background layout (home-bg.svg fills 100% × 100% of container) ── */
interface BgLayout { offsetX: number; offsetY: number; renderW: number; renderH: number }

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
  { stage:  1, cx:  939, cy: 1939 }, // 풍차 앞 길 시작
  { stage:  2, cx:  824, cy: 1811 }, // 우측 하단 곡선
  { stage:  3, cx:  669, cy: 1745 }, // 하단 좌로 이동
  { stage:  4, cx:  498, cy: 1766 }, // 하단 중앙
  { stage:  5, cx:  333, cy: 1768 }, // 하단 좌측
  { stage:  6, cx:  217, cy: 1654 }, // 좌측 방향 전환
  { stage:  7, cx:  165, cy: 1491 }, // 좌측 상향
  { stage:  8, cx:  182, cy: 1326 }, // 좌측 상단 곡선
  { stage:  9, cx:  278, cy: 1191 }, // 중앙으로 우이동
  { stage: 10, cx:  437, cy: 1126 }, // 중앙
  { stage: 11, cx:  608, cy: 1110 }, // 중앙 우측
  { stage: 12, cx:  780, cy: 1126 }, // 우측 중앙
  { stage: 13, cx:  891, cy: 1049 }, // 우측 상향
  { stage: 14, cx:  930, cy:  881 }, // 우측 상단
  { stage: 15, cx:  895, cy:  715 }, // 우측 상단 곡선
  { stage: 16, cx:  776, cy:  594 }, // 상단 좌로 이동
  { stage: 17, cx:  623, cy:  514 }, // 상단 중앙
  { stage: 18, cx:  461, cy:  455 }, // 상단 좌측
  { stage: 19, cx:  338, cy:  357 }, // 상단 좌측 상향
  { stage: 20, cx:  390, cy:  203 }, // 상단 도착
];

const LEVELS_PER_PAGE = 20;
const MAX_PAGES       = 5;

/* ── Menu data ─────────────────────────────────────────────── */
interface MenuItemDef {
  key:       string;
  x:         number;
  y:         number;
  imageSrc?: string;
  emoji?:    string;
  highlight?: boolean;
}

type NodeStatus = "done" | "current" | "available" | "locked";

/* ── Active modal type ─────────────────────────────────────── */
type ActiveModal = "ranking" | "items" | "cards" | "shop" | "settings" | "dogam" | "premium" | "endless" | null;

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
  rankingRewards?:        PendingReward[];
  onClaimRankingReward?:  (periodKey: string) => void;
  isPremiumActive?:       boolean;
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
  rankingRewards = [], onClaimRankingReward,
  isPremiumActive = false, onBuyPremium,
  onStartEndless,
}: FrontScreenProps) {
  const { t } = useTranslation();
  const containerRef                        = useRef<HTMLDivElement>(null);
  const [bg, setBg]                         = useState<BgLayout>({ offsetX: 0, offsetY: 0, renderW: 0, renderH: 0 });
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [activeModal,      setActiveModal]      = useState<ActiveModal>(null);

  /* 컨테이너 크기 추적 → BgLayout 업데이트 */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      setBg({ offsetX: 0, offsetY: 0, renderW: width, renderH: height });
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
    if (status !== "locked") onStartGame();
  };

  /* 메뉴 데이터 (label은 렌더 시 t() 적용) */
  // 카드 간 여백 1/2 축소: edge gap 70→35, center 간격 170+35=205, 시작 y=205 고정
  const leftMenuItems: MenuItemDef[] = [
    { key: "mission",  x:  38, y: 205, imageSrc: "/icons/icon-mission.png" },
    { key: "ranking",  x:  38, y: 410, imageSrc: "/icons/icon-ranking.png" },
    { key: "dogam",    x:  38, y: 615, imageSrc: "/icons/icon-book.png"    },
    { key: "endless",  x:  38, y: 820, emoji: "♾️"                         },
  ];
  const rightMenuItems: MenuItemDef[] = [
    { key: "cards",    x: 944, y: 205, imageSrc: "/icons/icon-card.png"    },
    { key: "shop",     x: 944, y: 410, imageSrc: "/icons/icon-shop.png"    },
    { key: "settings", x: 944, y: 615, emoji: "⚙️"                         },
    { key: "premium",  x: 944, y: 820, emoji: isPremiumActive ? "💎" : "✨", highlight: !isPremiumActive },
  ];

  const menuLabel: Record<string, string> = {
    mission:  t("menu.missions"),
    ranking:  t("menu.ranking"),
    dogam:    t("menu.dogam"),
    endless:  t("menu.endless"),
    cards:    t("menu.cards"),
    shop:     t("menu.shop"),
    settings: t("menu.settings"),
    premium:  isPremiumActive ? t("menu.premium") : t("menu.subscribe"),
  };

  const menuBadge: Partial<Record<string, number>> = {
    mission: missionBadge > 0 ? missionBadge : undefined,
  };

  const menuOnClick: Record<string, () => void> = {
    mission:  () => setShowMissionModal(true),
    ranking:  () => setActiveModal("ranking"),
    dogam:    () => setActiveModal("dogam"),
    endless:  () => setActiveModal("endless"),
    cards:    () => setActiveModal("cards"),
    shop:     () => setActiveModal("shop"),
    settings: () => setActiveModal("settings"),
    premium:  () => setActiveModal("premium"),
  };

  const ready = bg.renderW > 0 && bg.renderH > 0;

  return (
    <div ref={containerRef} className="relative h-[100dvh] w-full overflow-hidden">

      {/* ── 배경 이미지 (100% × 100% cover) ──────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:    "url(/home-bg.svg)",
          backgroundSize:     "100% 100%",
          backgroundPosition: "top left",
          backgroundRepeat:   "no-repeat",
          zIndex: 0,
        }}
      />

      {/* ── 좌표 기반 UI (배경 렌더 영역 기준) ───────────────── */}
      {ready && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>

          {/* ── 상단 광고 ────────────────────────────────────── */}
          <TopAdBanner bg={bg} />

          {/* ── 타이틀 ──────────────────────────────────────── */}
          <HomeTitle bg={bg} />

          {/* ── 코인 표시 ────────────────────────────────────── */}
          <CoinDisplay coins={player.coins} bg={bg} />

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
            onSelectLevel={handleNodeSelect}
          />

          {/* ── START 버튼 ───────────────────────────────────── */}
          <StartButton bg={bg} onClick={onStartGame} />

        </div>
      )}

      {/* ── 하단 광고 (portal) ──────────────────────────────── */}
      {createPortal(
        <div className="fixed bottom-0 left-0 right-0 z-[30]">
          <AdBanner position="bottom" />
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
        />
      )}

      {activeModal === "ranking" && <RankingModal onClose={closeModal} />}

      {activeModal === "cards" && (
        <CardCollectionModal
          player={player}
          subscriptionState={{ isPremium: isPremiumActive, trialUsed: false, trialActive: false, trialExpiry: null }}
          onClose={closeModal}
          onOpenPremium={() => setActiveModal("premium")}
        />
      )}

      {activeModal === "premium" && (
        <PremiumPassModal
          onBuy={async () => { await onBuyPremium?.(); closeModal(); }}
          onClose={closeModal}
        />
      )}

      {activeModal === "endless" && (
        <EndlessDifficultyModal
          onStart={(diff) => { closeModal(); onStartEndless?.(diff, false); }}
          onContinue={(diff) => { closeModal(); onStartEndless?.(diff, true); }}
          onClose={closeModal}
        />
      )}

      {activeModal === "items" && inventory && (
        <ItemsModal inventory={inventory} onClose={closeModal} />
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
        />
      )}

      {activeModal === "settings" && onToggleSetting && (
        <SettingsModal settings={settings} onToggle={onToggleSetting} onClose={closeModal} />
      )}

      {activeModal === "dogam" && <DogamModal onClose={closeModal} />}

      {/* ── 랭킹 보상 팝업 ──────────────────────────────────── */}
      {rankingRewards.length > 0 && onClaimRankingReward && createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-[300px] bg-white rounded-3xl p-6 shadow-2xl animate-modal-slide-up text-center">
            <div className="w-16 h-16 bg-yellow-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">🏆</div>
            <h3 className="text-base font-black text-foreground mb-1">{t("ranking.rewardPopupTitle")}</h3>
            <p className="text-xs text-foreground/50 mb-1">
              {t("ranking.rewardPeriodRank", {
                period: rankingRewards[0].type === "daily"  ? t("ranking.periodDaily")   :
                        rankingRewards[0].type === "weekly" ? t("ranking.periodWeekly")  :
                        t("ranking.periodMonthly"),
                rank: rankingRewards[0].rank,
              })}
            </p>
            <p className="text-2xl font-black text-amber-500 mb-5">🪙 {rankingRewards[0].coins.toLocaleString()}</p>
            <button
              onClick={() => onClaimRankingReward(rankingRewards[0].periodKey)}
              className="w-full py-3 rounded-2xl bg-primary text-white font-black text-sm shadow-sm hover:bg-primary-hover active:scale-95 transition-all"
            >{t("ranking.claimReward")}</button>
            {rankingRewards.length > 1 && (
              <p className="mt-2 text-[10px] text-foreground/35">
                {t("ranking.moreRewards", { count: rankingRewards.length - 1 })}
              </p>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

/* ============================================================
 * TopAdBanner — 배경 좌표계 기준 상단 고정
 * ============================================================ */
function TopAdBanner({ bg }: { bg: BgLayout }) {
  const { ry: top } = toRenderPoint(0, 0, bg);
  const h = (110 / DESIGN_H) * bg.renderH;
  return (
    <div
      className="pointer-events-auto"
      style={{
        position: "absolute",
        left: 0, top, width: "100%", height: h,
        zIndex: 30,
      }}
    >
      <AdBanner position="top" />
    </div>
  );
}

/* ============================================================
 * HomeTitle — title.svg, width 기준 비율 유지
 * ============================================================ */
function HomeTitle({ bg }: { bg: BgLayout }) {
  const { rx, ry, scaleX } = toRenderPoint(330, 175, bg);
  const w = 500 * scaleX;
  return (
    <img
      src="/title.svg"
      alt="Plant 2048"
      draggable={false}
      style={{
        position:      "absolute",
        left:          rx,
        top:           ry,
        width:         w,
        height:        "auto",
        objectFit:     "contain",
        zIndex:        10,
        pointerEvents: "none",
      }}
    />
  );
}

/* ============================================================
 * CoinDisplay — 코인 표시
 * ============================================================ */
function CoinDisplay({ coins, bg }: { coins: number; bg: BgLayout }) {
  const { rx, ry, scaleX } = toRenderPoint(840, 390, bg);
  const fontSize = Math.max(11, 14 * scaleX);
  return (
    <div
      style={{
        position:      "absolute",
        left:          rx,
        top:           ry,
        zIndex:        20,
        pointerEvents: "none",
        display:       "flex",
        alignItems:    "center",
        gap:           6 * scaleX,
        background:    "rgba(255,248,230,0.88)",
        border:        "1px solid rgba(217,170,90,0.45)",
        borderRadius:  9999,
        padding:       `${4 * scaleX}px ${10 * scaleX}px`,
        boxShadow:     "0 2px 8px rgba(140,90,30,0.12)",
        backdropFilter:"blur(4px)",
      }}
    >
      <span style={{ fontSize: fontSize + 2, lineHeight: 1 }}>🪙</span>
      <span style={{ fontSize, fontWeight: 800, color: "#a0640a", lineHeight: 1 }}>
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
  const { rx, ry, scaleX, scaleY } = toRenderPoint(item.x, item.y, bg);
  // 정사각형 카드: scaleX 기준으로 양쪽 동일 크기
  const cardSize = Math.max(62, 170 * scaleX);
  const cardW    = cardSize;
  const cardH    = cardSize;
  const radius   = Math.max(14, 28 * scaleX);
  const iconSize = Math.max(36, cardSize * 0.60);
  const fontSize = Math.max(10, 15 * scaleX);

  return (
    <button
      onClick={onClick}
      style={{
        position:       "absolute",
        left:           rx,
        top:            ry,
        width:          cardW,
        height:         cardH,
        borderRadius:   radius,
        background:     item.highlight
          ? "rgba(255,240,200,0.93)"
          : "rgba(255,248,235,0.90)",
        border:         item.highlight
          ? "1.5px solid rgba(200,160,60,0.55)"
          : "1px solid rgba(180,150,100,0.22)",
        boxShadow:      "0 6px 18px rgba(80,50,20,0.10)",
        backdropFilter: "blur(6px)",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        gap:            6,
        padding:        8,
        cursor:         "pointer",
        zIndex:         20,
        pointerEvents:  "auto",
        transition:     "transform 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      {badge !== undefined && (
        <span style={{
          position:       "absolute",
          top:            4 * scaleY,
          right:          4 * scaleX,
          minWidth:       16 * scaleX,
          height:         16 * scaleX,
          background:     "#f87171",
          color:          "#fff",
          fontSize:       10 * scaleX,
          fontWeight:     700,
          borderRadius:   9999,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          padding:        `0 ${3 * scaleX}px`,
        }}>
          {badge}
        </span>
      )}

      {/* 아이콘 wrapper — contain 처리 */}
      <div style={{ width: iconSize, height: iconSize, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {item.imageSrc ? (
          <img
            src={item.imageSrc}
            alt={label}
            draggable={false}
            style={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain", display: "block" }}
          />
        ) : (
          <span style={{ fontSize: iconSize * 0.65, lineHeight: 1 }}>{item.emoji}</span>
        )}
      </div>

      <span style={{ fontSize, fontWeight: 700, color: "#6b5a42", lineHeight: 1, textAlign: "center" }}>
        {label}
      </span>
    </button>
  );
}

/* ============================================================
 * HomeStageMap — 20개 노드 페이지 기반 슬라이드
 * ============================================================ */
function HomeStageMap({
  clearedLevel,
  bg,
  onSelectLevel,
}: {
  clearedLevel:  number;
  bg:            BgLayout;
  onSelectLevel: (level: number) => void;
}) {
  const currentPage = Math.floor(Math.max(0, clearedLevel) / LEVELS_PER_PAGE);

  return (
    <div
      style={{
        position:      "absolute",
        inset:         0,
        overflow:      "hidden",
        pointerEvents: "none",
        zIndex:        5,
      }}
    >
      <div
        style={{
          position:   "absolute",
          top:        0,
          left:       0,
          right:      0,
          height:     `${MAX_PAGES * 100}dvh`,
          transform:  `translateY(-${(MAX_PAGES - 1 - currentPage) * 100}dvh)`,
          transition: "transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "transform",
        }}
      >
        {Array.from({ length: MAX_PAGES }, (_, pageIdx) => {
          const pageStart = pageIdx * LEVELS_PER_PAGE + 1;
          return (
            <div
              key={pageIdx}
              style={{
                position: "absolute",
                top:      `${(MAX_PAGES - 1 - pageIdx) * 100}dvh`,
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
 * StageNode — stage.svg + 반투명 원형 배지 + 숫자
 * ============================================================ */
interface StageNodeProps {
  level:   number;
  status:  NodeStatus;
  x:       number;
  y:       number;
  scaleX:  number;
  onClick: () => void;
}

function StageNode({ level, status, x, y, scaleX, onClick }: StageNodeProps) {
  const isDone      = status === "done";
  const isCurrent   = status === "current";
  const isLocked    = status === "locked";

  const nodeWidth = 144 * scaleX;  // 사과 이미지 1.5배 (96 → 144)

  const imgFilter =
    isDone      ? "saturate(0.6) brightness(0.88)" :
    isCurrent   ? `drop-shadow(0 0 ${8 * scaleX}px rgba(230,190,30,0.95))` :
    isLocked    ? "grayscale(1) brightness(1.6)" :
    /* available */ "grayscale(1) brightness(1.6)";

  // 노드 이미지(330×300 natural) 기준 — 상자 부분에 자연스럽게 맞도록
  const badgeSize     = Math.max(14, 40 * scaleX);
  const badgeFontSize = Math.max(8,  11 * scaleX);

  return (
    <div
      style={{
        position:       "absolute",
        left:           x,
        top:            y,
        width:          nodeWidth,
        transform:      "translate(-50%, -50%)",
        pointerEvents:  isLocked ? "none" : "auto",
        zIndex:         isCurrent ? 7 : 6,
      }}
    >
      {/* 현재 스테이지 pulse ring */}
      {isCurrent && (
        <>
          <span style={{
            position: "absolute",
            inset: -8 * scaleX,
            borderRadius: "50%",
            border: `${2 * scaleX}px solid rgba(255,210,60,0.7)`,
            animation: "ping 1.2s cubic-bezier(0,0,0.2,1) infinite",
            pointerEvents: "none",
          }} />
        </>
      )}

      {/* 노드 이미지 + 배지 컨테이너 */}
      <button
        onClick={onClick}
        style={{
          display:    "block",
          width:      "100%",
          background: "none",
          border:     "none",
          padding:    0,
          cursor:     isLocked ? "default" : "pointer",
          position:   "relative",
        }}
        aria-label={`스테이지 ${level}`}
      >
        {/* stage.svg — 원본 비율 유지 */}
        <img
          src="/stage.svg"
          alt={`스테이지 ${level}`}
          draggable={false}
          style={{
            display:    "block",
            width:      "100%",
            height:     "auto",
            objectFit:  "contain",
            filter:     imgFilter,
            transition: "filter 0.2s",
          }}
        />

        {/* 반투명 원형 배지 + 숫자 (노드 하단 중앙 오버레이) */}
        <div
          style={{
            position:           "absolute",
            left:               "50%",
            top:                "60%",
            transform:          "translateX(-50%)",
            width:              badgeSize,
            height:             badgeSize,
            borderRadius:       9999,
            background:         (!isDone && !isCurrent) ? "rgba(70,70,70,0.88)" : "rgba(255,255,255,0.42)",
            backdropFilter:     "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
            boxShadow:          "0 1px 6px rgba(0,0,0,0.08)",
            display:            "flex",
            alignItems:         "center",
            justifyContent:     "center",
            pointerEvents:      "none",
          }}
        >
          <span
            style={{
              color:      "#fff",
              fontSize:   badgeFontSize,
              fontWeight: 800,
              lineHeight: 1,
              textShadow: "0 1px 4px rgba(0,0,0,0.4)",
              whiteSpace: "nowrap",
            }}
          >
            {level}
          </span>
        </div>
      </button>
    </div>
  );
}

/* ============================================================
 * StartButton — start_button.svg, 비율 유지
 * ============================================================ */
function StartButton({ bg, onClick }: { bg: BgLayout; onClick: () => void }) {
  const { rx, ry, scaleX } = toRenderPoint(365, 1715, bg);
  const w = 430 * scaleX;

  return (
    <button
      onClick={onClick}
      style={{
        position:   "absolute",
        left:       rx,
        top:        ry,
        width:      w,
        background: "none",
        border:     "none",
        padding:    0,
        cursor:     "pointer",
        zIndex:     25,
        pointerEvents: "auto",
        transition: "transform 0.15s ease",
      }}
      onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.95)"; }}
      onPointerUp={(e)   => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
      onPointerLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
      aria-label="START"
    >
      <img
        src="/start_button.svg"
        alt="START"
        draggable={false}
        style={{ display: "block", width: "100%", height: "auto", objectFit: "contain" }}
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
}

function MissionModal({ missions, weeklyMissions, onClaimDaily, onClaimWeekly, onEarnCoins, onAdWatched, onClose }: MissionModalProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"daily" | "weekly">("daily");

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[85dvh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-1.5">
            <img src="/icons/icon-mission.png" className="w-6 h-6 object-contain" alt="" draggable={false} />
            {t("missions.title")}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-board flex items-center justify-center text-foreground/40 hover:bg-cell transition-all text-sm">✕</button>
        </div>

        <div className="flex gap-1 px-5 pb-3 flex-shrink-0">
          {(["daily", "weekly"] as const).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={[
                "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
                tab === tabKey ? "bg-primary text-white shadow-sm" : "bg-board text-foreground/50 hover:bg-cell",
              ].join(" ")}
            >
              {tabKey === "daily" ? t("missions.daily") : t("missions.weekly")}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {tab === "daily"
            ? <DailyMissionList missions={missions} onClaim={onClaimDaily} onEarnCoins={onEarnCoins} onAdWatched={onAdWatched} />
            : <WeeklyMissionList weeklyMissions={weeklyMissions} onClaim={onClaimWeekly} onEarnCoins={onEarnCoins} onAdWatched={onAdWatched} />
          }
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DailyMissionList({ missions, onClaim, onEarnCoins, onAdWatched }: {
  missions: MissionState[]; onClaim?: (id: MissionId) => number;
  onEarnCoins?: (amount: number) => void; onAdWatched?: () => void;
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
          <div key={mission.id} className={["flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all", status === "claimed" ? "bg-black/4 opacity-50" : status === "complete" ? "bg-emerald-50/80 ring-1 ring-emerald-200" : "bg-board/60"].join(" ")}>
            <span className="text-xl flex-shrink-0">{mission.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground leading-tight">{t(mission.title)}</p>
              <p className="text-xs text-foreground/50">{t(mission.description)}</p>
              {mission.target > 1 && status === "incomplete" && (
                <div className="mt-1 w-full h-1.5 bg-board rounded-full overflow-hidden">
                  <div className="h-full bg-primary/50 rounded-full transition-all" style={{ width: `${(prog / mission.target) * 100}%` }} />
                </div>
              )}
            </div>
            <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
              <span className="text-xs font-bold text-amber-500">🪙{mission.reward}</span>
              {status === "complete" && <button onClick={() => onClaim?.(mission.id)} className="text-[10px] font-bold bg-emerald-500 text-white px-2.5 py-1 rounded-full hover:bg-emerald-600 active:scale-95 transition-all">{t("ranking.claimReward")}</button>}
              {status === "claimed" && <span className="text-[10px] text-foreground/30 font-medium">✓</span>}
              {status === "incomplete" && mission.target > 1 && <span className="text-[10px] text-foreground/30">{prog}/{mission.target}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeeklyMissionList({ weeklyMissions, onClaim, onEarnCoins, onAdWatched }: {
  weeklyMissions: WeeklyMissionState[]; onClaim?: (id: WeeklyMissionId) => number;
  onEarnCoins?: (amount: number) => void; onAdWatched?: () => void;
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
          <div key={mission.id} className={["flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all", status === "claimed" ? "bg-black/4 opacity-50" : status === "complete" ? "bg-emerald-50/80 ring-1 ring-emerald-200" : "bg-board/60"].join(" ")}>
            <span className="text-xl flex-shrink-0">{mission.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground leading-tight">{t(mission.title)}</p>
              <p className="text-xs text-foreground/50">{t(mission.description)}</p>
              {mission.target > 1 && status === "incomplete" && (
                <div className="mt-1 w-full h-1.5 bg-board rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400/60 rounded-full transition-all" style={{ width: `${(prog / mission.target) * 100}%` }} />
                </div>
              )}
            </div>
            <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
              <span className="text-xs font-bold text-amber-500">🪙{mission.reward}</span>
              {status === "complete" && <button onClick={() => onClaim?.(mission.id)} className="text-[10px] font-bold bg-emerald-500 text-white px-2.5 py-1 rounded-full hover:bg-emerald-600 active:scale-95 transition-all">{t("ranking.claimReward")}</button>}
              {status === "claimed" && <span className="text-[10px] text-foreground/30 font-medium">✓</span>}
              {status === "incomplete" && mission.target > 1 && <span className="text-[10px] text-foreground/30">{prog}/{mission.target}</span>}
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

/* ── AdBanner placeholder ───────────────────────────────────── */
function AdBanner({ position }: { position: "top" | "bottom" }) {
  return (
    <div
      className={["w-full h-10 flex items-center justify-center text-[11px] font-medium select-none flex-shrink-0", "bg-white/55 backdrop-blur-sm text-foreground/30", position === "top" ? "border-b border-white/40" : "border-t border-white/40"].join(" ")}
      aria-hidden="true"
    >
      AD
    </div>
  );
}
