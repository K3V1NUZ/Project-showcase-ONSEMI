// Shared types and normalization for Open Food Facts data.
// Live search hits our /api/food-search route (server-side proxy), so the
// browser never talks to OFF directly.

export type OffProduct = {
  code: string;
  name: string;
  englishName: string | null;
  brand: string | null;
  imageUrl: string | null;
  countries: string[];
  caloriesPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
};

export type Nutriments = {
  "energy-kcal_100g"?: number;
  "energy-kj_100g"?: number;
  proteins_100g?: number;
  fat_100g?: number;
  carbohydrates_100g?: number;
};

export type RawProduct = {
  code?: string;
  product_name?: string;
  product_name_sk?: string;
  product_name_en?: string;
  // cgi returns a comma-separated string; search-a-licious returns an array.
  brands?: string | string[];
  countries_tags?: string[];
  image_thumb_url?: string;
  image_small_url?: string;
  image_url?: string;
  nutriments?: Nutriments;
};

function firstBrand(brands: string | string[] | undefined): string | null {
  if (!brands) return null;
  if (Array.isArray(brands)) {
    return brands[0]?.trim() || null;
  }
  return brands.split(",")[0]?.trim() || null;
}

export function normalize(p: RawProduct): OffProduct | null {
  const name = (
    p.product_name_sk ||
    p.product_name ||
    p.product_name_en ||
    ""
  ).trim();
  if (!name || !p.nutriments) return null;

  const brand = firstBrand(p.brands);
  const n = p.nutriments;
  let kcal = n["energy-kcal_100g"];
  if (kcal === undefined && n["energy-kj_100g"] !== undefined) {
    kcal = n["energy-kj_100g"] / 4.184;
  }
  if (kcal === undefined || kcal <= 0) return null;

  return {
    code: p.code || "",
    name,
    englishName: (p.product_name_en || "").trim() || null,
    brand,
    imageUrl: p.image_thumb_url || p.image_small_url || p.image_url || null,
    countries: p.countries_tags || [],
    caloriesPer100g: Math.round(kcal),
    proteinPer100g: n.proteins_100g ?? 0,
    fatPer100g: n.fat_100g ?? 0,
    carbsPer100g: n.carbohydrates_100g ?? 0,
  };
}

// Country boosts — products from stores the user actually shops at rank first.
const COUNTRY_BOOST: Record<string, number> = {
  "en:slovakia": 10,
  "en:czech-republic": 5,
  "en:poland": 3,
  "en:hungary": 3,
  "en:austria": 3,
  "en:germany": 1,
};

// Rank a product against the search query. Higher = more relevant.
// Zero name-match means the query doesn't appear in the name or brand at all.
export function scoreRelevance(p: OffProduct, query: string): number {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
  if (terms.length === 0) return 0;

  const name = p.name.toLowerCase();
  const brand = (p.brand || "").toLowerCase();
  let score = 0;

  for (const t of terms) {
    if (name.startsWith(t)) score += 6;
    else if (name.includes(t)) score += 3;
    if (brand.includes(t)) score += 1;
  }
  if (score === 0) return 0; // must at least match the query somewhere

  let countryBoost = 0;
  for (const c of p.countries) {
    const b = COUNTRY_BOOST[c] || 0;
    if (b > countryBoost) countryBoost = b;
  }
  return score + countryBoost;
}

// Client-side entry point — calls our own API route.
export async function searchFoods(
  query: string,
  signal?: AbortSignal
): Promise<OffProduct[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const res = await fetch(`/api/food-search?q=${encodeURIComponent(q)}`, {
    signal,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Search failed (${res.status})`);
  }
  const json = (await res.json()) as { results: OffProduct[] };
  return json.results;
}

// Barcode → product lookup, via our /api/food-by-barcode proxy.
// Returns null when OFF doesn't have the product (or the response is malformed).
export async function fetchOffByBarcode(
  code: string,
  signal?: AbortSignal
): Promise<OffProduct | null> {
  const res = await fetch(
    `/api/food-by-barcode?code=${encodeURIComponent(code)}`,
    { signal }
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { product: OffProduct | null };
  return json.product;
}
