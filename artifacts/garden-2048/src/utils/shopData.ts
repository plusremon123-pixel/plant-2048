/* ============================================================
 * shopData.ts
 * 상점 아이템 데이터 구조, 인벤토리 타입, localStorage 영속성
 *
 * ✏️ 수정 포인트:
 *   - SHOP_ITEMS: 아이템 추가/비용 변경
 *   - INVENTORY_STORAGE_KEY: 저장 키 변경 시
 * ============================================================ */

/* ── 아이템 ID 타입 ─────────────────────────────────────── */
export type ShopItemId =
  | "undo"
  | "remove_tile"
  | "board_clean"
  | "remove_obstacle"
  | "skin_unlock"
  | "theme_unlock";

export type ShopItemCategory = "action" | "unlock";

/* ── 아이템 정의 타입 ────────────────────────────────────── */
export interface ShopItem {
  id: ShopItemId;
  name: string;
  description: string;
  emoji: string;
  cost: number;
  category: ShopItemCategory;
  /** true: 인벤토리에 쌓이는 소모품, false: 1회 해금 */
  consumable: boolean;
}

/* ── 상점 아이템 목록 ────────────────────────────────────── */
export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "undo",
    name: "되돌리기",
    description: "마지막 이동을 취소합니다",
    emoji: "↩️",
    cost: 100,          /* ✏️ 가격 */
    category: "action",
    consumable: true,
  },
  {
    id: "remove_tile",
    name: "타일 제거",
    description: "원하는 타일 1개 선택 후 제거",
    emoji: "🗑️",
    cost: 180,          /* ✏️ 가격 */
    category: "action",
    consumable: true,
  },
  {
    id: "board_clean",
    name: "보드 청소",
    description: "상위 4개 타일만 남기고 나머지를 모두 제거합니다",
    emoji: "🧹",
    cost: 350,          /* ✏️ 가격 */
    category: "action",
    consumable: true,
  },
  {
    id: "remove_obstacle",
    name: "장애물 제거",
    description: "장애물 1개를 즉시 제거합니다",
    emoji: "⛏️",
    cost: 400,          /* ✏️ 가격 */
    category: "action",
    consumable: true,
  },
  {
    id: "skin_unlock",
    name: "스킨 해금",
    description: "특별한 타일 스킨을 해금합니다 (준비 중)",
    emoji: "🎨",
    cost: 1200,
    category: "unlock",
    consumable: false,
  },
  {
    id: "theme_unlock",
    name: "테마 해금",
    description: "새로운 테마를 해금합니다 (준비 중)",
    emoji: "🌈",
    cost: 2500,
    category: "unlock",
    consumable: false,
  },
];

/* ── 인벤토리 타입 ───────────────────────────────────────── */
/** 소모품 수량 맵. unlock 아이템은 1이면 보유, 0이면 미보유 */
export type Inventory = Record<ShopItemId, number>;

const DEFAULT_INVENTORY: Inventory = {
  undo:             0,
  remove_tile:      0,
  board_clean:      0,
  remove_obstacle:  0,
  skin_unlock:      0,
  theme_unlock:     0,
};

/* ============================================================
 * 골드 구매 상품 (인앱결제 상품)
 *
 * ✏️ Google Play Billing 연결 포인트:
 *   - id 필드가 Google Play Console에 등록하는 productId와 1:1 대응
 *   - priceLabel은 placeholder; 실제 배포 시 Billing Library의
 *     skuDetails.price 로 교체
 * ============================================================ */
export interface GoldShopItem {
  id:          string;   // Google Play productId (e.g. "gold_pack_1000")
  amount:      number;   // 지급 골드
  priceLabel:  string;   // 표시 가격 placeholder (₩X,XXX)
  badge?:      string;   // "베스트" | "추천" 등 뱃지
}

export const GOLD_SHOP_ITEMS: GoldShopItem[] = [
  { id: "gold_pack_1000",  amount: 1000,  priceLabel: "₩1,200" },
  { id: "gold_pack_3000",  amount: 3000,  priceLabel: "₩3,500", badge: "recommend" },
  { id: "gold_pack_5000",  amount: 5000,  priceLabel: "₩5,900", badge: "best" },
  { id: "gold_pack_10000", amount: 10000, priceLabel: "₩9,900" },
];

/* ============================================================
 * mock 결제 함수
 *
 * [Google Play Billing 연결 포인트]
 *   아래 함수 내부를 Google Play Billing API 호출로 교체하면 됨.
 *   Capacitor 예시:
 *     import { InAppPurchase2 } from '@awesome-cordova-plugins/in-app-purchase-2';
 *     InAppPurchase2.order(productId).then(...);
 *   React Native 예시:
 *     import { requestPurchase } from 'react-native-iap';
 *     await requestPurchase({ skus: [productId] });
 * ============================================================ */
export interface GoldPurchaseResult {
  success: boolean;
  amount?: number;
  error?:  string;
}

export async function purchaseGoldPack(productId: string): Promise<GoldPurchaseResult> {
  // TODO: 실제 결제 시 아래 mock 코드를 Google Play Billing 호출로 교체
  await new Promise((r) => setTimeout(r, 800)); // 결제 처리 시뮬레이션
  const item = GOLD_SHOP_ITEMS.find((i) => i.id === productId);
  if (!item) return { success: false, error: "상품을 찾을 수 없습니다" };
  return { success: true, amount: item.amount };
}

/* ── localStorage 영속성 ────────────────────────────────── */
export const INVENTORY_STORAGE_KEY = "plant2048_inventory";

export const loadInventory = (): Inventory => {
  try {
    const raw = localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_INVENTORY };
    const parsed = JSON.parse(raw) as Partial<Inventory>;
    return {
      undo:             parsed.undo             ?? 0,
      remove_tile:      parsed.remove_tile      ?? 0,
      board_clean:      parsed.board_clean      ?? 0,
      remove_obstacle:  parsed.remove_obstacle  ?? 0,
      skin_unlock:      parsed.skin_unlock      ?? 0,
      theme_unlock:     parsed.theme_unlock     ?? 0,
    };
  } catch {
    return { ...DEFAULT_INVENTORY };
  }
};

export const saveInventory = (inv: Inventory): void => {
  try {
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(inv));
  } catch { /* noop */ }
};
