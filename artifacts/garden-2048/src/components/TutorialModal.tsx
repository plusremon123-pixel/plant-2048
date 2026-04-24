/* ============================================================
 * TutorialModal.tsx
 * 첫 실행 튜토리얼 — 풀페이지 슬라이드 디자인
 * localStorage key: plant2048_tutorial_done
 * ============================================================ */

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "@/i18n";

interface TutorialModalProps { onDone: () => void; }

const TUTORIAL_KEY = "plant2048_tutorial_done";

/* ── 색상 팔레트 ──────────────────────────────────────────── */
const BG    = "#FFFBF2";
const AMBER = "#F59E0B";
const BROWN = "#78350F";
const TXT   = "#3D2000";
const MUTED = "#9C7A52";

/* ============================================================
 * 일러스트 컴포넌트들
 * ============================================================ */

/* 1) 타일 헬퍼 */
const TILE_COLORS: Record<number, { bg: string; color: string }> = {
  2:    { bg: "#FEF9EE", color: "#4A3000" },
  4:    { bg: "#FEF0CC", color: "#4A3000" },
  8:    { bg: "#FDDFAA", color: "#3D2000" },
  16:   { bg: "#FBCB7C", color: "#3D2000" },
  32:   { bg: "#F9B347", color: "#fff" },
  64:   { bg: "#F59E0B", color: "#fff" },
  128:  { bg: "#EA8C00", color: "#fff" },
  256:  { bg: "#D97706", color: "#fff" },
  512:  { bg: "#B45309", color: "#fff" },
  1024: { bg: "#92400E", color: "#fff" },
  2048: { bg: "#78350F", color: "#fff" },
};

function Tile({ v, size = 56, pulse }: { v: number; size?: number; pulse?: boolean }) {
  const c = TILE_COLORS[v] ?? { bg: "#E5E7EB", color: "#374151" };
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.18,
      background: c.bg, color: c.color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-display)", fontWeight: 900,
      fontSize: v >= 1000 ? size * 0.28 : v >= 100 ? size * 0.34 : size * 0.4,
      boxShadow: "0 3px 8px rgba(0,0,0,0.12)",
      animation: pulse ? "tutPop 0.7s ease-in-out infinite" : undefined,
      flexShrink: 0,
    }}>{v}</div>
  );
}

function EmptyCell({ size = 56 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.18,
      background: "rgba(212,167,106,0.2)",
      flexShrink: 0,
    }} />
  );
}

/* 2) 게임 보드 미니어처 */
function BoardVisual({ highlightGoal }: { highlightGoal?: boolean }) {
  const GAP = 6;
  const SZ  = 58;
  const board = [
    [2, 4, 8, 0],
    [0, 2, 4, 16],
    [0, 0, 2, 8],
    [0, 0, 0, highlightGoal ? 32 : 4],
  ];
  return (
    <div style={{
      background: "#D4A76A", borderRadius: 16, padding: GAP,
      display: "inline-flex", flexDirection: "column", gap: GAP,
      boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    }}>
      {board.map((row, ri) => (
        <div key={ri} style={{ display: "flex", gap: GAP }}>
          {row.map((v, ci) =>
            v ? (
              <div key={ci} style={{ position: "relative" }}>
                <Tile v={v} size={SZ} pulse={highlightGoal && v === 32} />
                {highlightGoal && v === 32 && (
                  <div style={{
                    position: "absolute", inset: -4,
                    borderRadius: SZ * 0.22,
                    border: "3px solid #F59E0B",
                    animation: "tutGlow 1.2s ease-in-out infinite",
                    pointerEvents: "none",
                  }} />
                )}
              </div>
            ) : <EmptyCell key={ci} size={SZ} />
          )}
        </div>
      ))}
    </div>
  );
}

/* 3) 스와이프 일러스트 */
function SwipeVisual() {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <BoardVisual />
      {/* 손가락 + 화살표 오버레이 */}
      <div style={{
        position: "absolute", bottom: -20, left: "50%",
        transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      }}>
        <div style={{ fontSize: 32, animation: "tutSwipeUp 1.4s ease-in-out infinite" }}>☝️</div>
      </div>
      {/* 방향 힌트 */}
      <div style={{
        position: "absolute", top: "50%", right: -32,
        transform: "translateY(-50%)",
        fontSize: 28, animation: "tutArrowRight 1.2s ease-in-out infinite",
      }}>→</div>
    </div>
  );
}

/* 4) 병합 일러스트 */
function MergeVisual() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 12,
    }}>
      <Tile v={8} size={64} />
      <span style={{ fontSize: 28, color: AMBER, fontWeight: 900 }}>+</span>
      <Tile v={8} size={64} />
      <span style={{ fontSize: 28, color: AMBER, fontWeight: 900 }}>=</span>
      <Tile v={16} size={76} pulse />
    </div>
  );
}

/* 5) 목표 타일 일러스트 */
function GoalVisual({ lang }: { lang: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <BoardVisual highlightGoal />
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "#FEF3C7", border: "2px solid #FCD34D",
        borderRadius: 999, padding: "6px 16px",
      }}>
        <span style={{ fontSize: 16 }}>🎯</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: BROWN }}>
          {lang === "ko" ? "목표: 32" : "Goal: 32"}
        </span>
      </div>
    </div>
  );
}

/* 6) 코인 일러스트 */
function CoinVisual({ lang }: { lang: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      {/* 코인 카운터 */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "#FFFBEE", border: "2px solid #FCD34D",
        borderRadius: 20, padding: "12px 24px",
        boxShadow: "0 4px 16px rgba(245,158,11,0.2)",
      }}>
        <span style={{ fontSize: 36, animation: "tutSpin 2s linear infinite" }}>🪙</span>
        <span style={{ fontSize: 28, fontWeight: 900, color: BROWN, fontFamily: "var(--font-display)" }}>
          +50
        </span>
      </div>
      {/* 쓸모 예시 */}
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { emoji: "↩️", labelKo: "되돌리기", labelEn: "Undo" },
          { emoji: "🧹", labelKo: "보드 청소", labelEn: "Clear" },
          { emoji: "🗑️", labelKo: "타일 제거", labelEn: "Remove" },
        ].map((item) => (
          <div key={item.labelEn} style={{
            background: "#FFF8E1", border: "1.5px solid #FDE68A",
            borderRadius: 12, padding: "8px 8px", textAlign: "center", minWidth: 72,
          }}>
            <div style={{ fontSize: 22 }}>{item.emoji}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, marginTop: 4 }}>
              {lang === "ko" ? item.labelKo : item.labelEn}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 7) 카드 일러스트 */
function CardVisual({ lang }: { lang: string }) {
  const cards = [
    { emoji: "🌵", nameKo: "선인장",  nameEn: "Cactus",    descKo: "타일 1개 제거", descEn: "Remove tile", uses: 1, bg: "#D1FAE5", border: "#6EE7B7", text: "#064E3B" },
    { emoji: "🌻", nameKo: "해바라기", nameEn: "Sunflower", descKo: "씨앗 2개 배치", descEn: "Place 2 seeds", uses: 2, bg: "#FEF3C7", border: "#FCD34D", text: "#78350F" },
    { emoji: "🌿", nameKo: "새싹",    nameEn: "Sprout",    descKo: "점수 +20%",    descEn: "Score +20%",  uses: 2, bg: "#DCFCE7", border: "#86EFAC", text: "#14532D" },
  ];
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      {cards.map((card, i) => (
        <div key={i} style={{
          background: card.bg,
          border: `2px solid ${card.border}`,
          borderRadius: 14,
          padding: "10px 8px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          width: 80,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          position: "relative",
          animation: i === 0 ? "tutCardPop 0.8s ease-in-out infinite" : undefined,
        }}>
          <div style={{
            position: "absolute", top: 5, right: 5,
            background: card.text, color: "#fff",
            borderRadius: 999, fontSize: 9, fontWeight: 900,
            padding: "1px 5px",
          }}>×{card.uses}</div>
          <span style={{ fontSize: 28, lineHeight: 1 }}>{card.emoji}</span>
          <span style={{ fontSize: 11, fontWeight: 900, color: card.text, textAlign: "center" }}>
            {lang === "ko" ? card.nameKo : card.nameEn}
          </span>
          <span style={{ fontSize: 9, color: card.text, opacity: 0.75, textAlign: "center" }}>
            {lang === "ko" ? card.descKo : card.descEn}
          </span>
        </div>
      ))}
    </div>
  );
}

/* 8) 무한 모드 일러스트 */
function EndlessVisual({ lang }: { lang: string }) {
  const modes = [
    { emoji: "🌿", nameKo: "쉬움",   nameEn: "Easy",   descKo: "여유롭게", descEn: "Relaxed",  bg: "#DCFCE7", border: "#86EFAC", text: "#166534" },
    { emoji: "🌻", nameKo: "보통",   nameEn: "Normal", descKo: "균형 잡힌", descEn: "Balanced", bg: "#FEF9C3", border: "#FDE047", text: "#713F12" },
    { emoji: "🌵", nameKo: "어려움", nameEn: "Hard",   descKo: "도전적인", descEn: "Intense",  bg: "#FEE2E2", border: "#FCA5A5", text: "#991B1B" },
  ];
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
      {modes.map((m, i) => (
        <div key={i} style={{
          background: m.bg, border: `2px solid ${m.border}`,
          borderRadius: 16, padding: "12px 8px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          minWidth: 82,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}>
          <span style={{ fontSize: 30, lineHeight: 1 }}>{m.emoji}</span>
          <span style={{ fontSize: 12, fontWeight: 900, color: m.text, fontFamily: "var(--font-display)" }}>
            {lang === "ko" ? m.nameKo : m.nameEn}
          </span>
          <span style={{ fontSize: 10, color: m.text, opacity: 0.7 }}>
            {lang === "ko" ? m.descKo : m.descEn}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
 * 단계 데이터
 * ============================================================ */
interface Step {
  bgGradient:  string;
  accentColor: string;
  emoji:       string;
  titleKo:     string;
  titleEn:     string;
  descKo:      string;
  descEn:      string;
  visual:      (lang: string) => React.ReactNode;
}

const STEPS: Step[] = [
  {
    bgGradient:  "linear-gradient(160deg,#FFF8ED 0%,#FEF3C7 100%)",
    accentColor: "#F59E0B",
    emoji: "🌱",
    titleKo: "가든 2048에 오신 걸 환영해요!",
    titleEn: "Welcome to Garden 2048!",
    descKo: "타일을 합쳐 아름다운 정원을\n키워나가는 퍼즐 게임이에요.",
    descEn: "Grow a beautiful garden by\nmerging tiles in this puzzle game.",
    visual: () => (
      <div style={{ textAlign: "center", lineHeight: 1 }}>
        <div style={{ fontSize: 90, userSelect: "none", animation: "tutFloat 2.5s ease-in-out infinite" }}>🌸</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12 }}>
          {["🌷","🌻","🌹","🌼"].map((e, i) => (
            <span key={i} style={{
              fontSize: 28,
              animation: `tutFloat 2.5s ease-in-out ${i * 0.3}s infinite`,
            }}>{e}</span>
          ))}
        </div>
      </div>
    ),
  },
  {
    bgGradient:  "linear-gradient(160deg,#EFF6FF 0%,#DBEAFE 100%)",
    accentColor: "#3B82F6",
    emoji: "👆",
    titleKo: "스와이프로 타일을 이동해요",
    titleEn: "Swipe to move tiles",
    descKo: "상하좌우로 밀면 모든 타일이\n한꺼번에 그 방향으로 이동해요.",
    descEn: "Swipe in any direction to slide\nall tiles at once.",
    visual: () => <SwipeVisual />,
  },
  {
    bgGradient:  "linear-gradient(160deg,#FFF7ED 0%,#FFEDD5 100%)",
    accentColor: "#F97316",
    emoji: "✨",
    titleKo: "같은 숫자 타일이 만나면 합쳐져요!",
    titleEn: "Same tiles merge into double!",
    descKo: "같은 숫자 두 개가 만나면\n두 배 숫자로 합쳐지면서 점수가 올라요.",
    descEn: "When identical tiles meet,\nthey merge and your score goes up!",
    visual: () => <MergeVisual />,
  },
  {
    bgGradient:  "linear-gradient(160deg,#F0FDF4 0%,#DCFCE7 100%)",
    accentColor: "#22C55E",
    emoji: "🎯",
    titleKo: "목표 타일에 도달하면 클리어!",
    titleEn: "Reach the goal tile to clear!",
    descKo: "각 스테이지마다 목표 숫자가 있어요.\n빛나는 타일이 목표예요!",
    descEn: "Each stage has a goal number.\nThe glowing tile is your target!",
    visual: (lang) => <GoalVisual lang={lang} />,
  },
  {
    bgGradient:  "linear-gradient(160deg,#FFFBEB 0%,#FEF3C7 100%)",
    accentColor: "#EAB308",
    emoji: "🪙",
    titleKo: "코인으로 아이템을 구매해요",
    titleEn: "Buy items with coins",
    descKo: "스테이지를 클리어하면 코인을 얻고\n되돌리기·청소·제거 아이템을 살 수 있어요.",
    descEn: "Clear stages to earn coins and\nbuy Undo, Clear, Remove items.",
    visual: (lang) => <CoinVisual lang={lang} />,
  },
  {
    bgGradient:  "linear-gradient(160deg,#F0FDF4 0%,#DCFCE7 100%)",
    accentColor: "#10B981",
    emoji: "🃏",
    titleKo: "카드로 특별한 능력을 써요",
    titleEn: "Use cards for special powers",
    descKo: "게임 시작 전 카드 1장을 선택해요.\n선인장은 방해 타일을 바로 제거할 수 있어요!",
    descEn: "Pick 1 card before each game.\nCactus removes any tile instantly!",
    visual: (lang) => <CardVisual lang={lang} />,
  },
  {
    bgGradient:  "linear-gradient(160deg,#FAF5FF 0%,#F3E8FF 100%)",
    accentColor: "#8B5CF6",
    emoji: "♾️",
    titleKo: "무한 게임으로 도전을 이어가요",
    titleEn: "Keep playing in Endless Mode",
    descKo: "스테이지 제한 없이 무한으로 즐겨요.\n쉬움·보통·어려움 중 난이도를 선택해요.",
    descEn: "Play endlessly without stage limits.\nChoose Easy, Normal, or Hard.",
    visual: (lang) => <EndlessVisual lang={lang} />,
  },
  {
    bgGradient:  "linear-gradient(160deg,#FFF8ED 0%,#FEE2C8 100%)",
    accentColor: "#F59E0B",
    emoji: "🌸",
    titleKo: "이제 정원을 키울 준비가 됐어요!",
    titleEn: "Ready to grow your garden!",
    descKo: "타일을 합치고, 카드를 쓰고,\n아름다운 정원을 완성해보세요!",
    descEn: "Merge tiles, use cards,\nand build your beautiful garden!",
    visual: () => (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 72, animation: "tutFloat 2s ease-in-out infinite" }}>🏡</div>
        <div style={{ display: "flex", gap: 8 }}>
          {["🌷","🌻","🌿","🌸","🌹"].map((e, i) => (
            <span key={i} style={{ fontSize: 24, animation: `tutFloat 2s ease-in-out ${i * 0.2}s infinite` }}>{e}</span>
          ))}
        </div>
      </div>
    ),
  },
];

/* ============================================================
 * 메인 컴포넌트
 * ============================================================ */
export function TutorialModal({ onDone }: TutorialModalProps) {
  const { lang } = useTranslation();
  const [step, setStep]         = useState(0);
  const [dir,  setDir]          = useState<"next" | "prev">("next");
  const [animKey, setAnimKey]   = useState(0);
  const touchStartX             = useRef(0);

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;
  const total   = STEPS.length;

  const go = (nextStep: number, direction: "next" | "prev") => {
    setDir(direction);
    setAnimKey((k) => k + 1);
    setStep(nextStep);
  };

  const advance = () => {
    if (isLast) handleDone();
    else go(step + 1, "next");
  };

  const back = () => {
    if (step > 0) go(step - 1, "prev");
  };

  const handleDone = () => {
    try { localStorage.setItem(TUTORIAL_KEY, "1"); } catch { /* noop */ }
    onDone();
  };

  /* 키보드 */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") advance();
      if (e.key === "ArrowLeft") back();
      if (e.key === "Escape") handleDone();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* 터치 스와이프 */
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd   = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -40) advance();
    if (dx >  40) back();
  };

  const slideAnim = dir === "next"
    ? "tutSlideInRight 280ms cubic-bezier(0.22,1,0.36,1) both"
    : "tutSlideInLeft  280ms cubic-bezier(0.22,1,0.36,1) both";

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        display: "flex", flexDirection: "column",
        background: current.bgGradient,
        transition: "background 0.4s ease",
        userSelect: "none",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── 상단 바: 건너뛰기 + 진행 도트 ───────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px 0",
        flexShrink: 0,
      }}>
        {/* 도트 */}
        <div style={{ display: "flex", gap: 6 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              height: 6,
              width: i === step ? 22 : 6,
              borderRadius: 999,
              background: i === step ? current.accentColor : "rgba(0,0,0,0.15)",
              transition: "all 280ms ease",
            }} />
          ))}
        </div>

        {/* 건너뛰기 */}
        <button
          onClick={handleDone}
          style={{
            background: "none", border: "none",
            fontSize: 13, fontWeight: 700,
            color: "rgba(0,0,0,0.35)", cursor: "pointer",
            padding: "6px 4px",
          }}
        >
          {lang === "ko" ? "건너뛰기" : "Skip"}
        </button>
      </div>

      {/* ── 일러스트 영역 ────────────────────────────────── */}
      <div
        key={`visual-${animKey}`}
        style={{
          flex: "1 1 0",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "16px 24px",
          animation: slideAnim,
          minHeight: 0,
        }}
      >
        {current.visual(lang)}
      </div>

      {/* ── 하단 텍스트 + 버튼 카드 ─────────────────────── */}
      <div
        key={`text-${animKey}`}
        style={{
          flexShrink: 0,
          background: "#fff",
          borderRadius: "28px 28px 0 0",
          padding: "28px 28px 40px",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.08)",
          animation: slideAnim,
        }}
      >
        {/* 이모지 + 제목 */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
          <span style={{ fontSize: 34, lineHeight: 1, flexShrink: 0 }}>{current.emoji}</span>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: 20, fontWeight: 900,
            color: TXT, lineHeight: 1.25, margin: 0,
          }}>
            {lang === "ko" ? current.titleKo : current.titleEn}
          </h2>
        </div>

        {/* 설명 */}
        <p style={{
          fontSize: 14, color: MUTED,
          lineHeight: 1.7, whiteSpace: "pre-line",
          margin: "0 0 24px",
        }}>
          {lang === "ko" ? current.descKo : current.descEn}
        </p>

        {/* 버튼 */}
        <div style={{ display: "flex", gap: 10 }}>
          {/* 이전 버튼 */}
          {step > 0 && (
            <button
              onClick={back}
              style={{
                width: 48, height: 48, borderRadius: 999,
                border: `2px solid ${current.accentColor}40`,
                background: "none", cursor: "pointer",
                fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
                color: current.accentColor, flexShrink: 0,
              }}
            >←</button>
          )}

          {/* 다음 / 시작 버튼 */}
          <button
            onClick={advance}
            style={{
              flex: 1, height: 52, borderRadius: 999,
              border: "none",
              background: isLast
                ? `linear-gradient(135deg,#FCD34D,${current.accentColor})`
                : `linear-gradient(135deg,${current.accentColor}CC,${current.accentColor})`,
              color: "#fff",
              fontFamily: "var(--font-display)",
              fontSize: 17, fontWeight: 900,
              cursor: "pointer",
              boxShadow: `0 4px 16px ${current.accentColor}50`,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {isLast
              ? (lang === "ko" ? "정원 키우러 가기 🌸" : "Start Growing! 🌸")
              : (lang === "ko" ? "다음" : "Next")}
            {!isLast && <span style={{ fontSize: 18 }}>→</span>}
          </button>
        </div>

        {/* 단계 표시 */}
        <p style={{
          textAlign: "center", marginTop: 14,
          fontSize: 11, color: "rgba(0,0,0,0.2)", fontWeight: 600,
        }}>
          {step + 1} / {total}
        </p>
      </div>

      {/* ── CSS 애니메이션 ───────────────────────────────── */}
      <style>{`
        @keyframes tutSlideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes tutSlideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes tutFloat {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes tutPop {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.12); }
        }
        @keyframes tutCardPop {
          0%,100% { transform: scale(1) rotate(-2deg); }
          50%      { transform: scale(1.06) rotate(2deg); }
        }
        @keyframes tutGlow {
          0%,100% { opacity: 0.5; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.08); }
        }
        @keyframes tutSwipeUp {
          0%,100% { transform: translateY(0); opacity: 1; }
          50%      { transform: translateY(-12px); opacity: 0.6; }
        }
        @keyframes tutArrowRight {
          0%,100% { transform: translateX(0) translateY(-50%); opacity: 0.6; }
          50%      { transform: translateX(6px) translateY(-50%); opacity: 1; }
        }
        @keyframes tutSpin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>,
    document.body,
  );
}
