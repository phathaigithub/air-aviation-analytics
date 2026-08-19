export type Language = "en" | "vi";
export type MartRow = Record<string, string | number | boolean | null>;
export type MartFile = { rows: MartRow[] };
export type Criterion = { key: string; score: string; count: string; en: string; vi: string };
export type CriterionResult = { score: number; answered: number; coverage: number };
export type EntitySummary = {
  id: number;
  name: string;
  reviews: number;
  recommendation: number;
  verifiedRate: number;
  averageRating: number;
  criteria: Record<string, CriterionResult>;
};

export function publicAssetUrl(url: string): string {
  if (!url.startsWith("/")) return url;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${basePath}${url}`;
}

const martCache = new Map<string, Promise<MartRow[]>>();

export const airlineCriteria: Criterion[] = [
  { key: "seat", score: "avg_seat_comfort", count: "seat_comfort_answered_count", en: "Seat comfort", vi: "Thoải mái ghế" },
  { key: "cabin", score: "avg_cabin_staff_service", count: "cabin_staff_answered_count", en: "Cabin staff", vi: "Tiếp viên" },
  { key: "food", score: "avg_food_and_beverages", count: "food_and_beverages_answered_count", en: "Food & beverage", vi: "Đồ ăn & thức uống" },
  { key: "entertainment", score: "avg_inflight_entertainment", count: "entertainment_answered_count", en: "Entertainment", vi: "Giải trí" },
  { key: "ground", score: "avg_ground_service", count: "ground_service_answered_count", en: "Ground service", vi: "Dịch vụ mặt đất" },
  { key: "wifi", score: "avg_wifi_and_connectivity", count: "wifi_answered_count", en: "Wi-Fi", vi: "Wi-Fi" },
  { key: "value", score: "avg_value_for_money", count: "value_for_money_answered_count", en: "Value for money", vi: "Đáng tiền" },
];

export const airportCriteria: Criterion[] = [
  { key: "queue", score: "avg_queuing_times", count: "queuing_answered_count", en: "Queueing", vi: "Xếp hàng" },
  { key: "cleanliness", score: "avg_terminal_cleanliness", count: "cleanliness_answered_count", en: "Cleanliness", vi: "Vệ sinh" },
  { key: "seating", score: "avg_terminal_seating", count: "seating_answered_count", en: "Seating", vi: "Ghế ngồi" },
  { key: "signage", score: "avg_terminal_signs", count: "signs_answered_count", en: "Signage", vi: "Biển chỉ dẫn" },
  { key: "food", score: "avg_food_beverages", count: "food_answered_count", en: "Food", vi: "Ăn uống" },
  { key: "shopping", score: "avg_airport_shopping", count: "shopping_answered_count", en: "Shopping", vi: "Mua sắm" },
  { key: "staff", score: "avg_airport_staff", count: "staff_answered_count", en: "Staff", vi: "Nhân viên" },
  { key: "wifi", score: "avg_wifi_connectivity", count: "wifi_answered_count", en: "Wi-Fi", vi: "Wi-Fi" },
];

export async function loadMart(url: string): Promise<MartRow[]> {
  const resolvedUrl = publicAssetUrl(url);
  const cached = martCache.get(resolvedUrl);
  if (cached) return cached;
  const request = fetch(resolvedUrl).then(async response => {
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    const file = await response.json() as MartFile;
    return file.rows;
  }).catch(error => {
    martCache.delete(resolvedUrl);
    throw error;
  });
  martCache.set(resolvedUrl, request);
  return request;
}

export function num(row: MartRow, field: string): number {
  const value = row[field];
  return value === null || value === undefined ? 0 : Number(value);
}

export function validEntityName(value: unknown): boolean {
  const name = String(value ?? "").trim().toLowerCase();
  return Boolean(name) && name !== "read more";
}

export function aggregateEntities(
  rows: MartRow[],
  criteria: Criterion[],
  idField: string,
  nameField: string,
): EntitySummary[] {
  const groups = new Map<number, MartRow[]>();
  rows.forEach((row) => {
    if (!validEntityName(row[nameField])) return;
    const id = num(row, idField);
    groups.set(id, [...(groups.get(id) ?? []), row]);
  });
  return [...groups.entries()].map(([id, items]) => {
    const reviews = items.reduce((sum, row) => sum + num(row, "review_count"), 0);
    const recommendation = reviews
      ? items.reduce((sum, row) => sum + num(row, "recommendation_rate_pct") * num(row, "review_count"), 0) / reviews
      : 0;
    const verified = items.reduce((sum, row) => sum + num(row, "verified_review_count"), 0);
    let totalAnswered = 0;
    let totalScore = 0;
    const results: Record<string, CriterionResult> = {};
    criteria.forEach((criterion) => {
      const answered = items.reduce((sum, row) => sum + num(row, criterion.count), 0);
      const weighted = items.reduce((sum, row) => sum + num(row, criterion.score) * num(row, criterion.count), 0);
      results[criterion.key] = {
        score: answered ? weighted / answered : 0,
        answered,
        coverage: reviews ? Math.min(100, answered / reviews * 100) : 0,
      };
      totalAnswered += answered;
      totalScore += weighted;
    });
    return {
      id,
      name: String(items[0][nameField]),
      reviews,
      recommendation,
      verifiedRate: reviews ? verified / reviews * 100 : 0,
      averageRating: totalAnswered ? totalScore / totalAnswered : 0,
      criteria: results,
    };
  });
}

export function marketCriterion(items: EntitySummary[], key: string): number {
  const answered = items.reduce((sum, item) => sum + item.criteria[key].answered, 0);
  return answered
    ? items.reduce((sum, item) => sum + item.criteria[key].score * item.criteria[key].answered, 0) / answered
    : 0;
}

export function weightedEntityMetric(items: EntitySummary[], field: "recommendation" | "verifiedRate" | "averageRating"): number {
  const reviews = items.reduce((sum, item) => sum + item.reviews, 0);
  return reviews ? items.reduce((sum, item) => sum + item[field] * item.reviews, 0) / reviews : 0;
}
