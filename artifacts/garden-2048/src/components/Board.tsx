/* ============================================================
 * Board.tsx
 * 4×4 게임 보드 컴포넌트
 *
 * - 빈 셀 배경 그리드
 * - 활성 타일 + 사라지는 타일(그레이브야드) 렌더링
 * - 터치 스와이프 이벤트 처리
 * ============================================================ */

import { useRef, useEffect } from "react";
import { Tile } from "./Tile";
import { TileData } from "@/utils/gameUtils";
import { useTranslation } from "@/i18n";

interface BoardProps {
  tiles: TileData[];
  graveyard: TileData[];
  onSwipe: (dir: "UP" | "DOWN" | "LEFT" | "RIGHT") => void;
  themeId?: string;
  gridSize?: number;
  /** 타일 선택 모드 (선인장 카드 / remove 아이템) */
  selectMode?: boolean;
  onTileClick?: (tileId: string) => void;
  /** 빈 칸 선택 모드 (해바라기 카드) */
  emptyCellSelectMode?: boolean;
  onEmptyCellClick?: (x: number, y: number) => void;
}

export function Board({
  tiles, graveyard, onSwipe,
  themeId = "plant",
  gridSize = 4,
  selectMode = false, onTileClick,
  emptyCellSelectMode = false, onEmptyCellClick,
}: BoardProps) {
  const { t } = useTranslation();
  const boardRef = useRef<HTMLDivElement>(null);

  /* ── 터치 스와이프 처리 ─────────────────────────────── */
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    /* 보드 위에서는 페이지 스크롤 방지 */
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!startX || !startY) return;

      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      /* selectMode / emptyCellSelectMode 중에는 스와이프 무시 */
      if (!selectMode && !emptyCellSelectMode && Math.max(absDx, absDy) > 40) {
        if (absDx > absDy) {
          onSwipe(dx > 0 ? "RIGHT" : "LEFT");
        } else {
          onSwipe(dy > 0 ? "DOWN" : "UP");
        }
      }

      startX = 0;
      startY = 0;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [onSwipe]);

  const boardSizeStyle = gridSize !== 4
    ? ({ "--board-size": gridSize } as React.CSSProperties)
    : undefined;

  return (
    <div className="relative w-full max-w-[500px] aspect-square mx-auto">
      <div
        ref={boardRef}
        className="absolute inset-0 bg-board rounded-2xl p-[var(--board-gap)] shadow-inner touch-none"
        style={boardSizeStyle}
      >
        {/* 빈 셀 배경 그리드 */}
        <div
          className="w-full h-full gap-[var(--board-gap)]"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${gridSize}, 1fr)`,
            gap: "var(--board-gap)",
          }}
        >
          {Array.from({ length: gridSize * gridSize }).map((_, i) => {
            const cx = i % gridSize;
            const cy = Math.floor(i / gridSize);
            const isEmpty = emptyCellSelectMode && !tiles.some((t) => t.x === cx && t.y === cy);
            return (
              <div
                key={`cell-${i}`}
                className={[
                  "bg-cell rounded-xl md:rounded-2xl transition-all",
                  isEmpty
                    ? "ring-2 ring-yellow-300/80 cursor-pointer hover:bg-yellow-100/40 hover:ring-4"
                    : "",
                ].join(" ")}
                onClick={isEmpty ? () => onEmptyCellClick?.(cx, cy) : undefined}
              />
            );
          })}
        </div>

        {/* 합쳐지는 중인 타일 (뒤에 렌더, z-0) */}
        {graveyard.map((tile) => (
          <Tile key={tile.id} data={tile} themeId={themeId} isGhost />
        ))}

        {/* 활성 타일 */}
        {tiles.map((tile) => (
          <Tile
            key={tile.id}
            data={tile}
            themeId={themeId}
            selectMode={selectMode}
            onClick={selectMode && onTileClick ? () => onTileClick(tile.id) : undefined}
          />
        ))}

        {/* 타일 선택 모드 안내 */}
        {selectMode && (
          <div className="absolute inset-0 z-20 flex items-start justify-center pt-3 pointer-events-none">
            <div className="bg-black/65 text-white text-xs font-bold px-4 py-1.5 rounded-full animate-pulse">
              {t("game.selectTileToRemove")}
            </div>
          </div>
        )}

        {/* 빈 칸 선택 모드 안내 */}
        {emptyCellSelectMode && (
          <div className="absolute inset-0 z-20 flex items-start justify-center pt-3 pointer-events-none">
            <div className="bg-black/65 text-white text-xs font-bold px-4 py-1.5 rounded-full animate-pulse">
              {t("game.selectEmptyCell")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
