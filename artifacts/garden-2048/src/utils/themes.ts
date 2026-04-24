/* ============================================================
 * themes.ts
 * 테마 데이터 중앙 관리 파일
 *
 * 새 테마를 추가하려면 Theme 객체를 만들고
 * THEMES 레코드에 키를 추가하세요.
 * ============================================================ */

export interface TileStyle {
  bg: string;      /* Tailwind 배경 클래스 */
  color: string;   /* Tailwind 텍스트 클래스 */
  name: string;    /* 단계 이름 (한국어) */
}

export type ThemeMap = Record<number, TileStyle>;

export interface Theme {
  id: string;
  name: string;       /* 표시 이름 */
  emoji: string;      /* 테마를 나타내는 이모지 */
  description: string;
  tiles: ThemeMap;
  fallback: TileStyle; /* 2048 초과 값에 사용 */
  available: boolean;  /* false면 "준비 중" UI로 표시 */
}

/* ── 식물 테마 (기본, 파스텔 그린 계열) ────────────────── */
export const plantTheme: Theme = {
  id: "plant",
  name: "식물",
  emoji: "🌱",
  description: "씨앗에서 전설의 꽃까지",
  available: true,
  fallback: { bg: "bg-tile-32768", color: "text-text-light", name: "초월 식물" },
  tiles: {
    2:     { bg: "bg-tile-2",     color: "text-text-dark",  name: "씨앗" },
    4:     { bg: "bg-tile-4",     color: "text-text-dark",  name: "싹" },
    8:     { bg: "bg-tile-8",     color: "text-text-dark",  name: "새싹" },
    16:    { bg: "bg-tile-16",    color: "text-text-dark",  name: "잎" },
    32:    { bg: "bg-tile-32",    color: "text-text-light", name: "작은 화분" },
    64:    { bg: "bg-tile-64",    color: "text-text-light", name: "꽃봉오리" },
    128:   { bg: "bg-tile-128",   color: "text-text-light", name: "꽃" },
    256:   { bg: "bg-tile-256",   color: "text-text-light", name: "큰 꽃" },
    512:   { bg: "bg-tile-512",   color: "text-text-light", name: "반짝 꽃" },
    1024:  { bg: "bg-tile-1024",  color: "text-text-light", name: "희귀 꽃" },
    2048:  { bg: "bg-tile-2048",  color: "text-text-light", name: "전설의 꽃" },
    4096:  { bg: "bg-tile-4096",  color: "text-text-light", name: "신비의 꽃" },
    8192:  { bg: "bg-tile-8192",  color: "text-text-light", name: "환상의 꽃" },
    16384: { bg: "bg-tile-16384", color: "text-text-light", name: "전설의 정원" },
    32768: { bg: "bg-tile-32768", color: "text-text-light", name: "영원의 정원" },
  }
};

/* ── 동물 테마 (준비 중) ────────────────────────────────── */
export const animalTheme: Theme = {
  id: "animal",
  name: "동물",
  emoji: "🐾",
  description: "귀여운 동물들의 성장 이야기",
  available: false,
  fallback: { bg: "bg-orange-900", color: "text-white", name: "전설 동물" },
  tiles: {
    2:    { bg: "bg-orange-100", color: "text-orange-900", name: "알" },
    4:    { bg: "bg-orange-200", color: "text-orange-900", name: "병아리" },
    8:    { bg: "bg-orange-300", color: "text-orange-900", name: "강아지" },
    16:   { bg: "bg-orange-400", color: "text-white",      name: "고양이" },
    32:   { bg: "bg-orange-500", color: "text-white",      name: "여우" },
    64:   { bg: "bg-orange-600", color: "text-white",      name: "늑대" },
    128:  { bg: "bg-orange-700", color: "text-white",      name: "곰" },
    256:  { bg: "bg-orange-800", color: "text-white",      name: "사자" },
    512:  { bg: "bg-amber-700",  color: "text-white",      name: "용" },
    1024: { bg: "bg-amber-800",  color: "text-white",      name: "신수" },
    2048: { bg: "bg-amber-900",  color: "text-white",      name: "전설 동물" },
  }
};

/* ── 날씨 테마 (준비 중) ────────────────────────────────── */
export const weatherTheme: Theme = {
  id: "weather",
  name: "날씨",
  emoji: "⛅",
  description: "맑음부터 폭풍우까지",
  available: false,
  fallback: { bg: "bg-indigo-950", color: "text-white", name: "대폭풍" },
  tiles: {
    2:    { bg: "bg-sky-100",    color: "text-sky-900",   name: "맑음" },
    4:    { bg: "bg-sky-200",    color: "text-sky-900",   name: "구름" },
    8:    { bg: "bg-sky-300",    color: "text-sky-900",   name: "흐림" },
    16:   { bg: "bg-sky-400",    color: "text-white",     name: "안개" },
    32:   { bg: "bg-blue-400",   color: "text-white",     name: "이슬비" },
    64:   { bg: "bg-blue-500",   color: "text-white",     name: "비" },
    128:  { bg: "bg-blue-600",   color: "text-white",     name: "폭우" },
    256:  { bg: "bg-indigo-600", color: "text-white",     name: "번개" },
    512:  { bg: "bg-indigo-700", color: "text-white",     name: "뇌우" },
    1024: { bg: "bg-indigo-800", color: "text-white",     name: "태풍" },
    2048: { bg: "bg-indigo-900", color: "text-white",     name: "대폭풍" },
  }
};

/* ── 풍경 테마 (준비 중) ────────────────────────────────── */
export const landscapeTheme: Theme = {
  id: "landscape",
  name: "풍경",
  emoji: "🏔️",
  description: "자연 풍경의 아름다움",
  available: false,
  fallback: { bg: "bg-stone-900", color: "text-white", name: "신비 풍경" },
  tiles: {
    2:    { bg: "bg-teal-100",  color: "text-teal-900",  name: "호수" },
    4:    { bg: "bg-teal-200",  color: "text-teal-900",  name: "들판" },
    8:    { bg: "bg-teal-300",  color: "text-teal-900",  name: "숲" },
    16:   { bg: "bg-teal-400",  color: "text-white",     name: "계곡" },
    32:   { bg: "bg-teal-500",  color: "text-white",     name: "언덕" },
    64:   { bg: "bg-teal-600",  color: "text-white",     name: "산" },
    128:  { bg: "bg-teal-700",  color: "text-white",     name: "높은 산" },
    256:  { bg: "bg-teal-800",  color: "text-white",     name: "설산" },
    512:  { bg: "bg-stone-600", color: "text-white",     name: "협곡" },
    1024: { bg: "bg-stone-700", color: "text-white",     name: "대자연" },
    2048: { bg: "bg-stone-800", color: "text-white",     name: "신비 풍경" },
  }
};

/* ── 전체 테마 레지스트리 ───────────────────────────────── */
export const THEMES: Record<string, Theme> = {
  plant:     plantTheme,
  animal:    animalTheme,
  weather:   weatherTheme,
  landscape: landscapeTheme,
};

/* 테마 선택 순서 */
export const THEME_ORDER: string[] = ["plant", "animal", "weather", "landscape"];

/* localStorage 키 */
export const THEME_STORAGE_KEY = "plant2048_selectedTheme";
