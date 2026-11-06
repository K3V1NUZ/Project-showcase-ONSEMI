import { NextResponse } from "next/server";
import {
  normalize,
  scoreRelevance,
  type OffProduct,
  type RawProduct,
} from "@/lib/openFoodFacts";
import { searchSeeds, type SeedFood } from "@/lib/seedFoods";

function seedToProduct(s: SeedFood): OffProduct {
  return {
    code: `seed:${s.id}`,
    name: s.names[0],
    // Seeds list Slovak first and often the English word next — pull that
    // through so the same seed matches when the user types English too.
    englishName: s.names[1] ?? null,
    brand: null,
    imageUrl: null,
    countries: [],
    caloriesPer100g: s.caloriesPer100g,
    proteinPer100g: s.proteinPer100g,
    fatPer100g: s.fatPer100g,
    carbsPer100g: s.carbsPer100g,
  };
}

const FIELDS = [
  "code",
  "product_name",
  "product_name_sk",
  "product_name_en",
  "brands",
  "countries_tags",
  "image_thumb_url",
  "image_small_url",
  "nutriments", // includes fiber_100g when OFF has it
].join(",");

// OFF asks callers to identify themselves via User-Agent.
const UA = "nutriTrack/0.1 (https://github.com/K3V1NUZ/nutritrack)";

// ---------- In-memory cache (per warm serverless instance) --------------

type CacheEntry = { ts: number; data: OffProduct[] };
const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_ENTRIES = 500;

function getCached(key: string): OffProduct[] | null {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) {
    CACHE.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key: string, data: OffProduct[]) {
  CACHE.set(key, { ts: Date.now(), data });
  if (CACHE.size > MAX_ENTRIES) {
    // Evict oldest entry (simple LRU-ish).
    let oldestKey: string | null = null;
    let oldestTs = Infinity;
    for (const [k, v] of CACHE) {
      if (v.ts < oldestTs) {
        oldestTs = v.ts;
        oldestKey = k;
      }
    }
    if (oldestKey) CACHE.delete(oldestKey);
  }
}

// ---------- OFF endpoints (with fallback) --------------------------------

async function callSearchalicious(query: string): Promise<RawProduct[]> {
  const url = new URL("https://search.openfoodfacts.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("fields", FIELDS);
  url.searchParams.set("page_size", "40");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`search-a-licious ${res.status}`);
  const json = (await res.json()) as { hits?: RawProduct[] };
  return json.hits || [];
}

async function callCgi(query: string): Promise<RawProduct[]> {
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "40");
  url.searchParams.set("fields", FIELDS);

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`cgi ${res.status}`);
  const json = (await res.json()) as { products?: RawProduct[] };
  return json.products || [];
}

async function callOff(query: string): Promise<RawProduct[]> {
  // Try both endpoints; if the first throws we retry with a short backoff,
  // then fall back to the second.
  try {
    return await callSearchalicious(query);
  } catch (e1) {
    await new Promise((r) => setTimeout(r, 400));
    try {
      return await callSearchalicious(query);
    } catch {
      // fall through to cgi
    }
    try {
      return await callCgi(query);
    } catch (e2) {
      await new Promise((r) => setTimeout(r, 400));
      try {
        return await callCgi(query);
      } catch (e3) {
        throw e3 instanceof Error
          ? e3
          : e1 instanceof Error
            ? e1
            : new Error("OFF unavailable");
      }
    }
  }
}

// ---------- Route -------------------------------------------------------

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Seed matches are instant and cover basics OFF is weak at
  // (banana, apple, chicken breast, tvaroh, bryndza, etc.).
  const seedMatches = searchSeeds(q).map(seedToProduct);

  const cacheKey = q.toLowerCase();
  const cachedOff = getCached(cacheKey);

  const combineAndReturn = (offResults: OffProduct[]) => {
    const combined = [...seedMatches, ...offResults].slice(0, 15);
    return NextResponse.json({ results: combined });
  };

  if (cachedOff) {
    return combineAndReturn(cachedOff);
  }

  try {
    const raw = await callOff(q);
    const products = raw
      .map(normalize)
      .filter((p): p is OffProduct => p !== null);

    const scoredOff = products
      .map((p) => ({ p, score: scoreRelevance(p, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.p)
      .slice(0, 15);

    setCached(cacheKey, scoredOff);
    return combineAndReturn(scoredOff);
  } catch (e) {
    // If OFF is down but we have seed matches, still return those.
    if (seedMatches.length > 0) {
      return NextResponse.json({ results: seedMatches });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Search failed" },
      { status: 502 }
    );
  }
}
