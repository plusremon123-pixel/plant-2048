/* ============================================================
 * seasonTheme.ts
 * 사계절 UI 테마 시스템 — 모든 화면/팝업의 색상 기준
 * ============================================================ */

import { Season } from "./seasonData";

export interface SeasonTheme {
  /* 배경 */
  backgroundColor: string;
  panelColor:      string;
  popupBg:         string;

  /* 보드 */
  boardColor: string;
  cellColor:  string;

  /* 버튼 */
  btnPrimary:      string;
  btnPrimaryText:  string;
  btnPrimaryHover: string;
  btnSecondary:    string;
  btnSecondaryText:string;

  /* 텍스트 */
  textPrimary:   string;
  textSecondary: string;
  textMuted:     string;

  /* 강조 */
  accentColor: string;
  borderColor: string;
  shadow:      string;

  /* 팝업 헤더 */
  popupHeaderBg:   string;
  popupHeaderText: string;

  /* CSS 변수 주입용 (HSL 값, hsl() 없이) */
  cssVars: {
    background:   string;
    foreground:   string;
    board:        string;
    cell:         string;
    primary:      string;
    primaryHover: string;
  };
}

/* ── 전체 갈색 팔레트 (홈 메뉴 missions 카드 기준)
 *    missions: bg=#F8E6C6, text=#4C2E0C
 *    팝업/플레이 화면/보드/셀까지 모두 갈색 톤으로 통일.
 *    sub-tones:
 *      배경  = #FAF2E4 (밝은 크림)
 *      보드  = #E8D0A8 (따뜻한 탠)
 *      셀    = #D4B088 (우디 탠)
 *      패널  = #F8E6C6 (missions 카드)
 *      강조  = #8B5A2B (미드 브라운 CTA) */
const BROWN_THEME = {
  backgroundColor:   "#FAF2E4",
  boardColor:        "#E8D0A8",
  cellColor:         "#D4B088",
  panelColor:        "#F8E6C6",
  popupBg:           "#FFF7EA",
  btnPrimary:        "hsl(26 45% 36%)",       /* #8B5A2B 톤 */
  btnPrimaryText:    "#FFF7EA",
  btnPrimaryHover:   "hsl(26 50% 28%)",
  btnSecondary:      "#F8E6C6",
  btnSecondaryText:  "#4C2E0C",
  textPrimary:       "#4C2E0C",
  textSecondary:     "#6B4423",
  textMuted:         "#B8946C",
  accentColor:       "#D4A55C",
  borderColor:       "#D4B088",
  shadow:            "rgba(76,46,12,0.14)",
  popupHeaderBg:     "#F8E6C6",
  popupHeaderText:   "#4C2E0C",
} as const;

const BROWN_CSS_VARS = {
  background:   "34 60% 94%",
  foreground:   "22 60% 18%",
  board:        "30 50% 78%",
  cell:         "30 45% 68%",
  primary:      "26 45% 36%",
  primaryHover: "26 50% 28%",
} as const;

/* 4계절 모두 동일한 갈색 팔레트를 사용한다.
   (이후 계절감이 필요해지면 backgroundColor/boardColor/cellColor 만 계절별로 덮어쓸 것) */
export const SEASON_THEMES: Record<Season, SeasonTheme> = {
  spring: { ...BROWN_THEME, cssVars: { ...BROWN_CSS_VARS } },
  summer: { ...BROWN_THEME, cssVars: { ...BROWN_CSS_VARS } },
  autumn: { ...BROWN_THEME, cssVars: { ...BROWN_CSS_VARS } },
  winter: { ...BROWN_THEME, cssVars: { ...BROWN_CSS_VARS } },
};

/**
 * 현재 계절의 CSS 변수를 document.documentElement에 주입한다.
 * App.tsx의 useEffect에서 호출하면 전체 앱에 즉시 반영된다.
 */
export function applySeasonCssVars(season: Season): void {
  const vars = SEASON_THEMES[season].cssVars;
  const root = document.documentElement;
  root.style.setProperty("--background",          vars.background);
  root.style.setProperty("--foreground",          vars.foreground);
  root.style.setProperty("--board",               vars.board);
  root.style.setProperty("--cell",                vars.cell);
  root.style.setProperty("--primary",             vars.primary);
  root.style.setProperty("--primary-hover",       vars.primaryHover);
  root.style.setProperty("--primary-foreground",  "0 0% 100%");
}
