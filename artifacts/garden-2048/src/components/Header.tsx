/* ============================================================
 * Header.tsx
 * 게임 화면 상단 헤더 — 시즌 테마 적용, XP 바 제거
 * ============================================================ */

import { RefreshCw, Home, ShoppingBag } from "lucide-react";
import { useTranslation } from "@/i18n";
import type { Season } from "@/utils/seasonData";
import { SEASON_THEMES, type SeasonTheme } from "@/utils/seasonTheme";

interface HeaderProps {
  score:     number;
  bestScore: number;
  season:    Season;
  onReset:   () => void;
  onHome:    () => void;
  onShop:    () => void;
}

export function Header({ score, bestScore, season, onReset, onHome, onShop }: HeaderProps) {
  const { t } = useTranslation();
  const theme = SEASON_THEMES[season];

  return (
    <header className="flex flex-col gap-2.5 mb-4 mt-2">

      {/* ── 행 1: 홈 버튼 + 새 게임 버튼 ─── */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onHome}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl active:scale-95 transition-all text-sm font-medium"
          style={{ background: theme.btnSecondary, color: theme.textSecondary }}
          aria-label={t("game.homeBtn")}
        >
          <Home className="w-4 h-4" />
          <span>{t("game.homeBtn")}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onShop}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl active:scale-95 transition-all text-sm font-medium"
            style={{ background: theme.btnSecondary, color: theme.textMuted }}
            aria-label={t("menu.shop")}
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl active:scale-95 transition-all text-sm font-bold shadow-sm"
            style={{ background: theme.btnPrimary, color: theme.btnPrimaryText }}
            aria-label={t("game.newGame")}
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t("game.newGame")}</span>
          </button>
        </div>
      </div>

      {/* ── 행 2: 점수 ──────────────────────────────────── */}
      <div className="flex items-stretch gap-3">
        <ScoreBox label={t("game.score")}     score={score}     theme={theme} />
        <ScoreBox label={t("game.bestScore")} score={bestScore} theme={theme} />
      </div>

    </header>
  );
}

function ScoreBox({ label, score, theme }: { label: string; score: number; theme: SeasonTheme }) {
  return (
    <div
      className="flex-1 px-4 py-3 rounded-2xl flex flex-col items-center"
      style={{ background: theme.panelColor }}
    >
      <span
        className="text-[11px] font-bold tracking-wide mb-1"
        style={{ color: theme.textMuted }}
      >
        {label}
      </span>
      <span
        className="text-2xl font-black leading-none tabular-nums"
        style={{ color: theme.textPrimary }}
      >
        {score.toLocaleString()}
      </span>
    </div>
  );
}
