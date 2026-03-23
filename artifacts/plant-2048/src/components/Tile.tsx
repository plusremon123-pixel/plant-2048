import { TileData } from "@/utils/gameUtils";
import { THEMES } from "@/utils/themes";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TileProps {
  data: TileData;
  themeId?: string;
  isGhost?: boolean;
}

export function Tile({ data, themeId = "plant", isGhost = false }: TileProps) {
  const theme = THEMES[themeId] || THEMES.plant;
  const style = theme.tiles[data.value] || theme.fallback;

  // React CSS custom properties need to be casted
  const cssVars = {
    '--x': data.x,
    '--y': data.y,
  } as React.CSSProperties;

  return (
    <div 
      className={cn(
        "tile-wrapper",
        data.isNew && !isGhost && "tile-new",
        data.isMerged && !isGhost && "tile-merged",
        isGhost && "z-0" // Ghost tiles (graveyard) sit slightly behind
      )}
      style={cssVars}
    >
      <div className={cn("tile-inner", style.bg, style.color)}>
        <span className="text-xl md:text-2xl font-bold font-display leading-tight">{data.value}</span>
        <span className="text-xs md:text-sm font-medium opacity-90 mt-0.5">{style.name}</span>
      </div>
    </div>
  );
}
