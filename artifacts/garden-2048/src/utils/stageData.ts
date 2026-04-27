/* ============================================================
 * stageData.ts
 * 스테이지 절차적 생성 시스템 (1 ~ 2000스테이지)
 *
 * 설계 원칙:
 *   - 목표 타일 최대 2048 고정 (이후는 턴 수 감소로 난이도 상승)
 *   - 장애물 5종: soil(영구) / rock(3HP) / thorn(증식·10턴)
 *                 crystal(1HP·파괴시가시생성) / briar(2HP·증식·15턴)
 *   - 10판 단위 완급 조절 (리듬 인덱스 9 = 보스슬롯 = 장애물 0)
 *   - thorn / briar 등장 시 boardSize = 6
 *   - 1001-2000: crystal + briar 조합 등장, 난이도 = 800-1000 기조 유지
 * ============================================================ */

import {
  GameState,
  TileData,
  generateId,
  createEmptyBoard,
  getEmptyCells,
} from "./gameUtils";

/* ── 타입 ─────────────────────────────────────────────────── */

export interface StageGoal {
  type: "reachTile";
  targetValue: number;
}

export interface InitialTile {
  x: number;
  y: number;
  tileType: "soil" | "thorn" | "rock" | "crystal" | "briar";
}

export interface StageConfig {
  id:           number;
  name:         string;
  maxTurns:     number;
  goal:         StageGoal;
  initialTiles: InitialTile[];
  boardSize:    4 | 5 | 6;   // thorn 등장 시 6
  spawnRate?:   number;
}

/* ============================================================
 * 장애물 위치 풀 (4×4 보드 기준)
 *
 * 좌표 (x: 열, y: 행, 0-based):
 *   (0,0)(1,0)(2,0)(3,0)
 *   (0,1)(1,1)(2,1)(3,1)
 *   (0,2)(1,2)(2,2)(3,2)
 *   (0,3)(1,3)(2,3)(3,3)
 *
 * 중앙 4칸 (배치 금지): (1,1)(2,1)(1,2)(2,2)
 * ============================================================ */

type Pos = { x: number; y: number };

const SINGLE_POOL: Pos[] = [
  { x: 0, y: 3 },
  { x: 3, y: 3 },
  { x: 1, y: 3 },
  { x: 2, y: 3 },
  { x: 0, y: 0 },
  { x: 3, y: 0 },
  { x: 0, y: 2 },
  { x: 3, y: 2 },
  { x: 0, y: 1 },
  { x: 3, y: 1 },
];

const DOUBLE_POOL: [Pos, Pos][] = [
  [{ x: 0, y: 3 }, { x: 3, y: 3 }],
  [{ x: 0, y: 0 }, { x: 3, y: 3 }],
  [{ x: 3, y: 0 }, { x: 0, y: 3 }],
  [{ x: 0, y: 3 }, { x: 3, y: 1 }],
  [{ x: 3, y: 3 }, { x: 0, y: 1 }],
  [{ x: 1, y: 3 }, { x: 3, y: 0 }],
  [{ x: 2, y: 3 }, { x: 0, y: 0 }],
  [{ x: 0, y: 2 }, { x: 3, y: 3 }],
  [{ x: 3, y: 2 }, { x: 0, y: 3 }],
  [{ x: 0, y: 0 }, { x: 2, y: 3 }],
  [{ x: 3, y: 0 }, { x: 1, y: 3 }],
  [{ x: 0, y: 1 }, { x: 3, y: 3 }],
];

const TRIPLE_POOL: [Pos, Pos, Pos][] = [
  [{ x: 0, y: 3 }, { x: 3, y: 3 }, { x: 0, y: 0 }],
  [{ x: 0, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 0 }],
  [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 1, y: 3 }],
  [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 2, y: 3 }],
  [{ x: 0, y: 3 }, { x: 3, y: 0 }, { x: 3, y: 2 }],
  [{ x: 3, y: 3 }, { x: 0, y: 0 }, { x: 0, y: 2 }],
  [{ x: 1, y: 3 }, { x: 0, y: 0 }, { x: 3, y: 1 }],
  [{ x: 2, y: 3 }, { x: 3, y: 0 }, { x: 0, y: 1 }],
  [{ x: 0, y: 3 }, { x: 3, y: 1 }, { x: 1, y: 0 }],
  [{ x: 3, y: 3 }, { x: 0, y: 2 }, { x: 2, y: 0 }],
];

const QUAD_POOL: [Pos, Pos, Pos, Pos][] = [
  [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 3 }, { x: 3, y: 3 }],
  [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 3 }, { x: 1, y: 3 }],
  [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 3 }, { x: 2, y: 3 }],
  [{ x: 0, y: 3 }, { x: 3, y: 3 }, { x: 0, y: 0 }, { x: 3, y: 1 }],
  [{ x: 0, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 0 }, { x: 0, y: 1 }],
  [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 2 }, { x: 3, y: 2 }],
  [{ x: 0, y: 3 }, { x: 3, y: 3 }, { x: 0, y: 1 }, { x: 3, y: 1 }],
  [{ x: 0, y: 0 }, { x: 3, y: 3 }, { x: 1, y: 3 }, { x: 3, y: 1 }],
  [{ x: 3, y: 0 }, { x: 0, y: 3 }, { x: 2, y: 3 }, { x: 0, y: 1 }],
  [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 2, y: 3 }, { x: 0, y: 2 }],
];

const QUINT_POOL: [Pos, Pos, Pos, Pos, Pos][] = [
  [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 3 }, { x: 3, y: 3 }, { x: 1, y: 3 }],
  [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 3 }, { x: 3, y: 3 }, { x: 2, y: 3 }],
  [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 3 }, { x: 3, y: 3 }, { x: 0, y: 1 }],
  [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 1 }],
  [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 3 }, { x: 0, y: 1 }, { x: 1, y: 3 }],
  [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 3 }, { x: 3, y: 1 }, { x: 2, y: 3 }],
  [{ x: 0, y: 3 }, { x: 3, y: 3 }, { x: 0, y: 0 }, { x: 0, y: 2 }, { x: 3, y: 1 }],
  [{ x: 0, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 0 }, { x: 3, y: 2 }, { x: 0, y: 1 }],
];

/* ============================================================
 * 스테이지 이름 풀 (60개, 모듈러 순환)
 * ============================================================ */
const STAGE_NAMES: string[] = [
  "씨앗의 시작",   "새싹 한 줄기",  "흙 속에서",    "첫 뿌리",      "햇살 속으로",
  "물주기",        "꽃봉오리",      "이슬 맺힌 잎",  "바람과 씨앗",  "첫 개화",
  "뿌리를 내리며", "흙과 햇살",     "새벽 안개",     "초록 물결",    "작은 정원",
  "봄비",          "나뭇잎 사이",   "꽃길",          "씨앗 여행",    "싹이 트는 날",
  "거친 흙밭",     "돌 사이 틈새",  "가시덤불",      "바위 정원",    "험한 비탈",
  "구불진 길",     "모래바람",      "건조한 대지",   "벼랑 끝 꽃",  "사막 선인장",
  "깊은 숲",       "덩굴 미로",     "이끼 낀 바위",  "뒤엉킨 뿌리", "그늘진 골짜기",
  "어두운 토양",   "두꺼운 나무껍", "안개 숲",       "산 중턱",      "나무의 기억",
  "철 지난 꽃",    "낙엽 길",       "찬 바람",       "서리 위 새싹", "겨울 정원",
  "얼어붙은 씨앗", "눈 속의 꽃",   "서리꽃",        "빙판 위 뿌리", "눈보라",
  "봄의 귀환",     "해동",          "첫 빗방울",     "젖은 흙냄새", "다시 피는 꽃",
  "절벽의 꽃",     "폭풍 속 새싹",  "천 개의 씨앗",  "전설의 정원",  "꽃의 끝에서",
];

/* ============================================================
 * 목표값 티어 — 최대 2048(tier 11)로 고정
 * ============================================================ */
function getGoalTier(id: number): number {
  if (id > 1000) return 11;  // 2주기(1001-2000): 전 구간 2048
  if (id <=  5) return 6;    // 64
  if (id <= 15) return 7;    // 128
  if (id <= 30) return 8;    // 256
  if (id <= 250) return 9;   // 512  (Spring 시즌과 일치)
  if (id <= 500) return 10;  // 1024 (Summer 시즌과 일치)
  return 11;                 // 2048 — 상한 고정
}

/** 티어별 기본 턴 수 (tier 11 = 2048 구간은 getBaseTurns로 별도 처리) */
const BASE_TURNS: Record<number, number> = {
  6:  85,
  7:  140,
  8:  200,
  9:  270,
  10: 360,
};

/**
 * 기준 턴 수 결정.
 * tier 11(2048) 구간은 스테이지가 높을수록 허용 턴 감소 → 난이도 상승.
 */
function getBaseTurns(id: number, tier: number): number {
  if (tier < 11) return BASE_TURNS[tier] ?? 360;
  // tier 11 (2048) — 1주기 (501~1000): 점진 감소
  if (id <= 600) return 470;
  if (id <= 700) return 430;
  if (id <= 800) return 380;
  if (id <= 900) return 320;
  if (id <= 1000) return 260;
  // tier 11 (2048) — 2주기 (1001~2000): 800-1000 기조 유지하며 추가 감소
  if (id <= 1200) return 280;
  if (id <= 1500) return 250;
  if (id <= 1800) return 220;
  return 200;   // 1801~2000
}

/**
 * 10판 주기 완급 조절 계수
 * 인덱스: (id-1) % 10
 * 0=쉬움·1.10 / 1=보통·1.00 / 2=보통·0.95 / 3=어려움·0.85 /
 * 4=보통·1.00 / 5=보통·0.90 / 6=쉬움·1.05 / 7=어려움·0.80 /
 * 8=보통·0.95 / 9=보스슬롯·1.15
 */
const RHYTHM: number[] = [1.10, 1.00, 0.95, 0.85, 1.00, 0.90, 1.05, 0.80, 0.95, 1.15];

function getRhythmIdx(id: number): number { return (id - 1) % 10; }
function isHardSlot(id: number):    boolean { const r = getRhythmIdx(id); return r === 3 || r === 7; }
function isBossSlot(id: number):    boolean { return getRhythmIdx(id) === 9; }
function isEasySlot(id: number):    boolean { const r = getRhythmIdx(id); return r === 0 || r === 6; }

/* ============================================================
 * 구간별 장애물 수 — 리듬 기반 + 보스슬롯 = 항상 0
 * ============================================================ */
function getObstacleCount(id: number): number {
  if (isBossSlot(id)) return 0;  // 보스슬롯: 모든 구간에서 숨 고르기

  const hard = isHardSlot(id);
  const easy = isEasySlot(id);

  if (id <= 30)   return 0;
  if (id <= 80)   return hard ? 2 : easy ? 0 : 1;
  if (id <= 250)  return hard ? 3 : easy ? 1 : 2;
  if (id <= 500)  return hard ? 4 : easy ? 1 : 2;
  if (id <= 1000) return hard ? 5 : easy ? 2 : 3;  // 501~1000
  return          hard ? 5 : easy ? 2 : 3;         // 1001~2000 (동일)
}

/* ============================================================
 * 장애물 타입 결정 — 5종 분기
 *
 * soil(흙)    : 영구 블로커, 초반 위주 / easy 슬롯에 간헐적 등장
 * rock(바위)  : 3HP 내구, 중반부터 주력
 * thorn(가시) : 증식형(10턴), 501 이후 등장
 * crystal(수정): 1HP, 파괴 시 인접 가시 생성, 1001 이후 등장
 * briar(덩굴) : 2HP, 증식형(15턴), 1001 이후 등장
 * ============================================================ */
function getObstacleType(
  id: number,
  posInSet: number,
): "soil" | "rock" | "thorn" | "crystal" | "briar" {
  const easy = isEasySlot(id);

  // 1~150: soil만
  if (id <= 150) return "soil";

  // 151~500: rock 위주, easy 슬롯의 첫 번째 위치만 soil
  if (id <= 500) {
    if (easy && posInSet === 0) return "soil";
    return "rock";
  }

  // 501~1000: thorn + rock 위주, easy 슬롯 일부에만 soil
  if (id <= 1000) {
    if (easy && posInSet === 0) return "soil";
    return posInSet === 0 ? "rock" : "thorn";
  }

  // 1001~2000: crystal + briar + thorn + rock 조합
  //   posInSet 0 → briar  (느린 번짐 + 2HP)
  //   posInSet 1 → thorn  (빠른 번짐)
  //   posInSet 2 → crystal(파괴 반응 수정)
  //   posInSet 3 → rock   (기존 3HP 바위)
  //   posInSet 4 → crystal
  //   easy 슬롯 posInSet 0 → soil (숨쉬기)
  if (easy && posInSet === 0) return "soil";
  if (posInSet === 0) return "briar";
  if (posInSet === 1) return "thorn";
  if (posInSet === 2) return "crystal";
  if (posInSet === 3) return "rock";
  return "crystal";   // posInSet 4
}

/* ============================================================
 * 결정적(deterministic) 인덱스 선택
 * ============================================================ */
function pickIdx(id: number, poolLen: number, salt: number = 0): number {
  return ((id * 31 + salt * 17) >>> 0) % poolLen;
}

/* ============================================================
 * 스테이지 생성
 * ============================================================ */
function generateStage(id: number): StageConfig {
  const tier        = getGoalTier(id);
  const baseTurns   = getBaseTurns(id, tier);
  const rhythm      = RHYTHM[getRhythmIdx(id)];
  const maxTurns    = Math.round(baseTurns * rhythm);
  const targetValue = Math.pow(2, tier);
  const name        = STAGE_NAMES[(id - 1) % STAGE_NAMES.length];
  const count       = getObstacleCount(id);

  const initialTiles: InitialTile[] = [];

  if (count === 1) {
    const pos = SINGLE_POOL[pickIdx(id, SINGLE_POOL.length)];
    initialTiles.push({ x: pos.x, y: pos.y, tileType: getObstacleType(id, 0) });
  } else if (count === 2) {
    const pair = DOUBLE_POOL[pickIdx(id, DOUBLE_POOL.length, 1)];
    pair.forEach((pos, i) =>
      initialTiles.push({ x: pos.x, y: pos.y, tileType: getObstacleType(id, i) }),
    );
  } else if (count === 3) {
    const set = TRIPLE_POOL[pickIdx(id, TRIPLE_POOL.length, 2)];
    set.forEach((pos, i) =>
      initialTiles.push({ x: pos.x, y: pos.y, tileType: getObstacleType(id, i) }),
    );
  } else if (count === 4) {
    const set = QUAD_POOL[pickIdx(id, QUAD_POOL.length, 3)];
    set.forEach((pos, i) =>
      initialTiles.push({ x: pos.x, y: pos.y, tileType: getObstacleType(id, i) }),
    );
  } else if (count === 5) {
    const set = QUINT_POOL[pickIdx(id, QUINT_POOL.length, 4)];
    set.forEach((pos, i) =>
      initialTiles.push({ x: pos.x, y: pos.y, tileType: getObstacleType(id, i) }),
    );
  }

  // thorn 또는 briar 포함 시 6×6 보드 (번짐 장애물 = 더 넓은 공간 필요)
  const hasThorn  = initialTiles.some((t) => t.tileType === "thorn" || t.tileType === "briar");
  const boardSize: 4 | 5 | 6 = hasThorn ? 6 : 4;

  /**
   * 6×6 보드 턴 수 보정
   * - 4×4(16칸) → 6×6(36칸): 셀이 2.25배 → 합치기까지 이동 횟수 비례 증가
   * - 무궁화 카드로 가시를 제거하는 턴 비용까지 고려해 ×2.0 적용
   */
  const finalMaxTurns = hasThorn ? Math.round(maxTurns * 3.0) : maxTurns;

  return {
    id, name, maxTurns: finalMaxTurns,
    goal: { type: "reachTile", targetValue },
    initialTiles,
    boardSize,
  };
}

/* ============================================================
 * 공개 API
 * ============================================================ */

/** id 범위: 1 ~ 2000 */
export const getStageConfig = (stageId: number): StageConfig | null => {
  if (stageId < 1 || stageId > 2000) return null;
  return generateStage(stageId);
};

/**
 * 스테이지 초기 GameState 생성.
 * boardSize에 맞는 보드를 생성하고 장애물 + 숫자 타일 2개 배치.
 */
export const initializeStage = (config: StageConfig): GameState => {
  const size  = config.boardSize ?? 4;
  const board = createEmptyBoard(size);
  const activeTiles: Record<string, TileData> = {};

  /* 장애물 배치 */
  for (const it of config.initialTiles) {
    const tile: TileData = {
      id:       generateId(),
      value:    0,
      x:        it.x,
      y:        it.y,
      tileType: it.tileType,
      hp:       it.tileType === "rock" ? 3 : it.tileType === "briar" ? 2 : undefined,
    };
    board[it.y][it.x] = tile;
    activeTiles[tile.id] = tile;
  }

  /* 랜덤 숫자 타일 2개 */
  for (let i = 0; i < 2; i++) {
    const empty = getEmptyCells(board);
    if (empty.length === 0) break;
    const pos  = empty[Math.floor(Math.random() * empty.length)];
    const tile: TileData = {
      id:       generateId(),
      value:    2,
      x:        pos.x,
      y:        pos.y,
      isNew:    true,
      tileType: "number",
    };
    board[pos.y][pos.x] = tile;
    activeTiles[tile.id] = tile;
  }

  return {
    board,
    activeTiles,
    graveyard:           [],
    score:               0,
    hasWon:              false,
    hasLost:             false,
    lostByTurns:         false,
    turnsLeft:           config.maxTurns,
    maxTurns:            config.maxTurns,
    goalValue:           config.goal.targetValue,
    boardSize:           size,
    thornImmunityTurns:  0,
  };
};
