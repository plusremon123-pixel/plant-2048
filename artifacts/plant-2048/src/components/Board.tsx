import { useRef, useEffect } from "react";
import { Tile } from "./Tile";
import { TileData } from "@/utils/gameUtils";

interface BoardProps {
  tiles: TileData[];
  graveyard: TileData[];
  onSwipe: (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void;
}

export function Board({ tiles, graveyard, onSwipe }: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);

  // Swipe handling
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;

    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      // We don't preventDefault here to allow tap/click
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Prevent scrolling while swiping on the board
      e.preventDefault();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartX || !touchStartY) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const dx = touchEndX - touchStartX;
      const dy = touchEndY - touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Minimum swipe distance
      if (Math.max(absDx, absDy) > 40) {
        if (absDx > absDy) {
          onSwipe(dx > 0 ? 'RIGHT' : 'LEFT');
        } else {
          onSwipe(dy > 0 ? 'DOWN' : 'UP');
        }
      }
      
      touchStartX = 0;
      touchStartY = 0;
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipe]);

  return (
    <div className="relative w-full max-w-[500px] aspect-square mx-auto">
      {/* Board Background container */}
      <div 
        ref={boardRef}
        className="absolute inset-0 bg-board rounded-2xl p-[var(--board-gap)] shadow-inner touch-none"
      >
        {/* Empty Cells Background Grid */}
        <div className="grid grid-cols-4 grid-rows-4 w-full h-full gap-[var(--board-gap)]">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={`cell-${i}`} className="bg-cell rounded-xl md:rounded-2xl" />
          ))}
        </div>

        {/* Active Tiles */}
        {graveyard.map(tile => (
          <Tile key={tile.id} data={tile} isGhost />
        ))}
        {tiles.map(tile => (
          <Tile key={tile.id} data={tile} />
        ))}
      </div>
    </div>
  );
}
