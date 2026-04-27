import React from "react";
import { TileData } from "@/utils/gameUtils";
import { THEMES } from "@/utils/themes";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useTranslation } from "@/i18n";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TileProps {
  data: TileData;
  themeId?: string;
  isGhost?: boolean;
  selectMode?: boolean;
  gridSize?: number;
  onClick?: () => void;
}

export function Tile({
  data,
  themeId = "plant",
  isGhost = false,
  selectMode = false,
  gridSize = 4,
  onClick,
}: TileProps) {
  const { t } = useTranslation();

  // React CSS custom properties need to be casted
  const cssVars = {
    "--x": data.x,
    "--y": data.y,
  } as React.CSSProperties;

  /* ── 장애물 타일 렌더링 (배경 투명, 이모지 부착 방식) ──── */

  /**
   * 공통 장애물 래퍼
   * - 배경 없음(투명) → 보드 격자 색상이 그대로 보임
   * - selectMode: 노란 링 + 약한 흰 반투명 배경으로 선택 가능 상태 표시
   */
  const ObstacleCell = ({
    children,
    opacity = 1,
  }: {
    children: React.ReactNode;
    opacity?: number;
  }) => (
    <div
      className={cn("tile-wrapper", isGhost && "z-0")}
      style={{ ...cssVars, opacity }}
      onClick={!isGhost ? onClick : undefined}
    >
      <div
        className={cn(
          "tile-inner",                       // 기본 레이아웃 (flex, center 등)
          selectMode && !isGhost &&
            "ring-2 ring-yellow-300/80 ring-offset-1 cursor-pointer bg-white/15",
        )}
        style={{ background: selectMode && !isGhost ? undefined : "transparent" }}
      >
        {children}
      </div>
    </div>
  );

  const isSmallCell = gridSize > 4;
  const emojiSm = isSmallCell ? "text-2xl leading-none" : "text-3xl leading-none";
  const emojiMd = isSmallCell ? "text-xl  leading-none" : "text-2xl md:text-3xl leading-none";

  if (data.tileType === "soil") {
    return <ObstacleCell><span className={emojiSm}>🟫</span></ObstacleCell>;
  }

  if (data.tileType === "thorn") {
    /* 원본 가시 — 100% 불투명 */
    return <ObstacleCell><span className={emojiSm}>🌵</span></ObstacleCell>;
  }

  if (data.tileType === "thorn_spread") {
    /* 번진 가시 — 60% 불투명으로 '확산됨' 표현 */
    return <ObstacleCell opacity={0.6}><span className={emojiSm}>🌵</span></ObstacleCell>;
  }

  if (data.tileType === "rock") {
    /* 바위 — HP에 따라 이모지 아래 작은 HP 뱃지 */
    const hp     = data.hp ?? 3;
    const hpDots = "♥".repeat(hp);
    const hpCls  = isSmallCell
      ? "text-[8px] font-black leading-none tracking-tight text-slate-700 drop-shadow-sm"
      : "text-[10px] font-black leading-none text-slate-700 drop-shadow-sm";
    return (
      <ObstacleCell>
        <span className={emojiMd}>🪨</span>
        <span className={hpCls}>{hpDots}</span>
      </ObstacleCell>
    );
  }

  if (data.tileType === "crystal") {
    /* 수정 💠 — hp=1, 파괴 시 가시 생성. 살짝 반짝이는 느낌을 위해 drop-shadow */
    return (
      <ObstacleCell>
        <span className={emojiSm} style={{ filter: "drop-shadow(0 0 4px rgba(167,139,250,0.9))" }}>
          💠
        </span>
      </ObstacleCell>
    );
  }

  if (data.tileType === "briar") {
    /* 덩굴 🌿 — hp=2, 15턴마다 번짐. HP 뱃지 표시 */
    const hp     = data.hp ?? 2;
    const hpDots = "♥".repeat(hp);
    const hpCls  = isSmallCell
      ? "text-[8px] font-black leading-none tracking-tight text-emerald-800 drop-shadow-sm"
      : "text-[10px] font-black leading-none text-emerald-800 drop-shadow-sm";
    return (
      <ObstacleCell>
        <span className={emojiMd}>🌿</span>
        <span className={hpCls}>{hpDots}</span>
      </ObstacleCell>
    );
  }

  /* ── 일반 숫자 타일 렌더링 ─────────────────────────────── */
  const theme = THEMES[themeId] || THEMES.plant;
  const style = theme.tiles[data.value] || theme.fallback;

  /* 자릿수에 따른 폰트 크기 — 6×6 보드에서도 셀 안에 수렴하도록 축소 */
  const digits  = String(data.value).length;
  const textCls =
    digits <= 3 ? "text-xl md:text-2xl"  :   /* 2 ~ 256 */
    digits === 4 ? "text-base md:text-xl" :   /* 1024 ~ 8192 */
    digits === 5 ? "text-sm md:text-base" :   /* 16384, 32768 */
                    "text-xs md:text-sm";      /* 65536+ (fallback) */

  return (
    <div
      className={cn(
        "tile-wrapper",
        data.isNew && !isGhost && "tile-new",
        data.isMerged && !isGhost && "tile-merged",
        isGhost && "z-0",
        selectMode && !isGhost && "cursor-pointer",
      )}
      style={cssVars}
      onClick={!isGhost ? onClick : undefined}
    >
      <div
        className={cn(
          "tile-inner",
          style.bg,
          style.color,
          selectMode &&
            !isGhost &&
            "ring-2 ring-red-400/80 ring-offset-1 hover:ring-4 hover:brightness-95 transition-all",
        )}
      >
        <span className={cn(textCls, "font-bold font-display leading-none tracking-tight")}>
          {data.value}
        </span>
      </div>
    </div>
  );
}
