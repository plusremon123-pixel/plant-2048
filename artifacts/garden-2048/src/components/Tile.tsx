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
  onClick?: () => void;
}

export function Tile({
  data,
  themeId = "plant",
  isGhost = false,
  selectMode = false,
  onClick,
}: TileProps) {
  const { t } = useTranslation();

  // React CSS custom properties need to be casted
  const cssVars = {
    "--x": data.x,
    "--y": data.y,
  } as React.CSSProperties;

  /* ── 장애물 타일 렌더링 ────────────────────────────────── */
  if (data.tileType === "soil") {
    return (
      <div
        className={cn("tile-wrapper", isGhost && "z-0")}
        style={cssVars}
        onClick={!isGhost ? onClick : undefined}
      >
        <div className={cn(
          "tile-inner bg-amber-800/75 text-amber-100",
          selectMode && !isGhost && "ring-2 ring-yellow-300/80 ring-offset-1 cursor-pointer hover:brightness-95",
        )}>
          <span className="text-xl md:text-2xl leading-none">🟫</span>
        </div>
      </div>
    );
  }

  if (data.tileType === "thorn") {
    /* 원본 가시 — 진한 빨강, 카드로만 제거 가능 */
    return (
      <div
        className={cn("tile-wrapper", isGhost && "z-0")}
        style={cssVars}
        onClick={!isGhost ? onClick : undefined}
      >
        <div className={cn(
          "tile-inner bg-rose-800/75 text-rose-100",
          selectMode && !isGhost && "ring-2 ring-yellow-300/80 ring-offset-1 cursor-pointer hover:brightness-95",
        )}>
          <span className="text-xl md:text-2xl leading-none">🌵</span>
        </div>
      </div>
    );
  }

  if (data.tileType === "thorn_spread") {
    /* 번진 가시 — 주황, 타일 충돌 시 제거됨 */
    return (
      <div
        className={cn("tile-wrapper", isGhost && "z-0")}
        style={cssVars}
        onClick={!isGhost ? onClick : undefined}
      >
        <div className={cn(
          "tile-inner text-orange-100",
          selectMode && !isGhost && "ring-2 ring-yellow-300/80 ring-offset-1 cursor-pointer hover:brightness-95",
        )} style={{ background: "rgba(154, 52, 18, 0.70)" }}>
          <span className="text-xl md:text-2xl leading-none">🌵</span>
        </div>
      </div>
    );
  }

  if (data.tileType === "rock") {
    const hp = data.hp ?? 3;
    const rockBg =
      hp >= 3 ? "bg-slate-600 text-slate-100" :
      hp === 2 ? "bg-slate-500 text-slate-100" :
                  "bg-slate-400 text-slate-100";
    return (
      <div
        className={cn("tile-wrapper", isGhost && "z-0")}
        style={cssVars}
        onClick={!isGhost ? onClick : undefined}
      >
        <div className={cn(
          "tile-inner", rockBg,
          selectMode && !isGhost && "ring-2 ring-yellow-300/80 ring-offset-1 cursor-pointer hover:brightness-95",
        )}>
          <span className="text-xl md:text-2xl leading-none">🪨</span>
          <span className="text-xs font-bold leading-none">{"❤️".repeat(hp)}</span>
        </div>
      </div>
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
