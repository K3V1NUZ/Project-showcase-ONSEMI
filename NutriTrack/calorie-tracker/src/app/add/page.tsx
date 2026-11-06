"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FoodAvatar } from "@/components/FoodAvatar";
import { Skeleton } from "@/components/Skeleton";
import {
  createEntry,
  createEntryFromExistingFood,
  fetchMeals,
  fetchOwnFoodByBarcode,
  fetchOwnFoodsMatching,
  fetchRecentFoods,
  logMeal,
  type FoodDetails,
  type OwnFoodMatch,
} from "@/lib/queries";
import {
  fetchOffByBarcode,
  searchFoods,
  type OffProduct,
} from "@/lib/openFoodFacts";
import {
  MEAL_LABEL,
  MEAL_ORDER,
  type MealSummary,
  type MealType,
  type RecentFood,
} from "@/lib/types";
import { fromISODate, toISODate } from "@/lib/dateHelpers";

type Tab = "search" | "recent" | "meals";

// One-off type used only inside this screen to keep the "amount" step
// abstract over "food picked from search/recent" vs "typed manually".
type PickedFood = {
  source: "off" | "seed" | "recent" | "manual";
  existingFoodId?: string;
  details: FoodDetails;
  suggestedGrams?: number;
};

function offToPicked(p: OffProduct): PickedFood {
  const isSeed = p.code.startsWith("seed:");
  const isOwn = p.code.startsWith("own:");
  return {
    source: isOwn ? "recent" : isSeed ? "seed" : "off",
    existingFoodId: isOwn ? p.code.slice(4) : undefined,
    details: {
      name: p.name,
      englishName: p.englishName ?? undefined,
      brand: p.brand ?? undefined,
      barcode: isSeed || isOwn ? undefined : p.code || undefined,
      imageUrl: p.imageUrl ?? undefined,
      caloriesPer100g: p.caloriesPer100g,
      proteinPer100g: p.proteinPer100g,
      fatPer100g: p.fatPer100g,
      carbsPer100g: p.carbsPer100g,
      source: isSeed || isOwn ? "custom" : "off",
    },
  };
}

function ownToOffProduct(o: OwnFoodMatch): OffProduct {
  return {
    code: `own:${o.foodId}`,
    name: o.name,
    englishName: o.englishName,
    brand: o.brand,
    imageUrl: o.imageUrl,
    countries: [],
    caloriesPer100g: o.caloriesPer100g,
    proteinPer100g: o.proteinPer100g,
    fatPer100g: o.fatPer100g,
    carbsPer100g: o.carbsPer100g,
  };
}

function recentToPicked(r: RecentFood): PickedFood {
  return {
    source: "recent",
    existingFoodId: r.foodId,
    suggestedGrams: r.lastGrams,
    details: {
      name: r.name,
      brand: r.brand ?? undefined,
      imageUrl: r.imageUrl ?? undefined,
      caloriesPer100g: r.caloriesPer100g,
      proteinPer100g: r.proteinPer100g,
      fatPer100g: r.fatPer100g,
      carbsPer100g: r.carbsPer100g,
      source: "custom",
    },
  };
}

function AddScreen() {
  const router = useRouter();
  const params = useSearchParams();

  const dateParam = params.get("date");
  const mealParam = params.get("meal") as MealType | null;
  const barcodeParam = params.get("barcode");

  const [date, setDate] = useState<Date | null>(null);
  const [meal, setMeal] = useState<MealType>(
    mealParam && MEAL_ORDER.includes(mealParam) ? mealParam : "snack"
  );
  const [tab, setTab] = useState<Tab>("search");
  const [barcodeLoading, setBarcodeLoading] = useState<boolean>(
    !!barcodeParam
  );
  const [barcodeError, setBarcodeError] = useState<string | null>(null);

  // Search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OffProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Recent + meals
  const [recent, setRecent] = useState<RecentFood[] | null>(null);
  const [meals, setMealsState] = useState<MealSummary[] | null>(null);

  // Sub-view state
  type SubView =
    | { kind: "list" }
    | { kind: "amount"; picked: PickedFood }
    | { kind: "manual"; seedName?: string; barcode?: string }
    | { kind: "meal-confirm"; meal: MealSummary };

  const [sub, setSub] = useState<SubView>({ kind: "list" });

  // Init date
  useEffect(() => {
    setDate((dateParam && fromISODate(dateParam)) || new Date());
  }, [dateParam]);

  // Fetch recent + meals once on mount (cheap, keeps tabs snappy)
  useEffect(() => {
    fetchRecentFoods(50).then(setRecent);
    fetchMeals().then(setMealsState);
  }, []);

  // If we arrived from /scan, resolve the barcode. Priority:
  //   1. This user's own foods with that barcode — instant, and reflects any
  //      manual corrections (better name, right macros) they made previously.
  //   2. Open Food Facts.
  //   3. Manual entry with the barcode preserved.
  useEffect(() => {
    if (!barcodeParam) return;
    let cancelled = false;
    (async () => {
      setBarcodeError(null);

      const own = await fetchOwnFoodByBarcode(barcodeParam).catch(() => null);
      if (cancelled) return;
      if (own) {
        setSub({
          kind: "amount",
          picked: {
            source: "recent",
            existingFoodId: own.foodId,
            details: {
              name: own.name,
              brand: own.brand ?? undefined,
              imageUrl: own.imageUrl ?? undefined,
              barcode: barcodeParam,
              caloriesPer100g: own.caloriesPer100g,
              proteinPer100g: own.proteinPer100g,
              fatPer100g: own.fatPer100g,
              carbsPer100g: own.carbsPer100g,
              source: "custom",
            },
          },
        });
        setBarcodeLoading(false);
        return;
      }

      const product = await fetchOffByBarcode(barcodeParam).catch(() => null);
      if (cancelled) return;
      if (product) {
        setSub({ kind: "amount", picked: offToPicked(product) });
      } else {
        setBarcodeError(
          `No product found for ${barcodeParam}. Enter it manually — we'll remember it next time.`
        );
        setSub({ kind: "manual", seedName: "", barcode: barcodeParam });
      }
      setBarcodeLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [barcodeParam]);

  // Debounced OFF search
  useEffect(() => {
    if (tab !== "search") return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        // Own foods (client-side, RLS-scoped) run in parallel with the OFF
        // proxy call. Own results are prepended so they show up first.
        const [own, off] = await Promise.all([
          fetchOwnFoodsMatching(q, 8),
          searchFoods(q, controller.signal),
        ]);
        if (controller.signal.aborted) return;

        // Dedup: drop OFF products whose barcode we already have as an own
        // entry (same physical product, but the user's copy is more accurate).
        const ownBarcodes = new Set(
          own.map((o) => o.foodId).filter(Boolean)
        );
        void ownBarcodes; // (foodId isn't a barcode; real dedup done by name below)

        const seen = new Set(
          own.map((o) => `${o.name.toLowerCase()}|${(o.brand ?? "").toLowerCase()}`)
        );
        const dedupedOff = off.filter(
          (p) =>
            !seen.has(
              `${p.name.toLowerCase()}|${(p.brand ?? "").toLowerCase()}`
            )
        );

        setResults([...own.map(ownToOffProduct), ...dedupedOff]);
        setSearching(false);
      } catch (e) {
        if (controller.signal.aborted) return;
        setSearchError(e instanceof Error ? e.message : "Search failed");
        setSearching(false);
      }
    }, 550);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, tab]);

  if (!date || barcodeLoading) {
    return (
      <Shell>
        {barcodeLoading && (
          <div className="flex-1 flex items-center justify-center text-sm text-muted">
            Looking up barcode…
          </div>
        )}
      </Shell>
    );
  }

  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const dateLabel = date.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const backToList = () => setSub({ kind: "list" });

  // ---- sub-views -------------------------------------------------------

  if (sub.kind === "amount") {
    return (
      <AmountView
        picked={sub.picked}
        date={date}
        mealType={meal}
        onBack={backToList}
        onDone={() => router.push("/")}
      />
    );
  }
  if (sub.kind === "manual") {
    return (
      <ManualView
        seedName={sub.seedName}
        barcode={sub.barcode}
        date={date}
        mealType={meal}
        onBack={backToList}
        onDone={() => router.push("/")}
      />
    );
  }
  if (sub.kind === "meal-confirm") {
    return (
      <MealConfirmView
        meal={sub.meal}
        date={date}
        mealType={meal}
        onBack={backToList}
        onDone={() => router.push("/")}
      />
    );
  }

  // ---- main list view --------------------------------------------------

  return (
    <div className="mx-auto w-full max-w-md min-h-screen flex flex-col">
      <ScreenHeader title="Add food" />

      <div className="px-4 pb-3 space-y-3">
        {!isToday && (
          <div className="text-xs text-muted text-center">{dateLabel}</div>
        )}
        <MealPicker value={meal} onChange={setMeal} />
        <TabBar value={tab} onChange={setTab} />
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {tab === "search" && (
          <SearchTab
            query={query}
            setQuery={setQuery}
            searching={searching}
            searchError={searchError}
            results={results}
            onPick={(p) => setSub({ kind: "amount", picked: offToPicked(p) })}
            onManual={() =>
              setSub({ kind: "manual", seedName: query.trim() || undefined })
            }
            scanHref={`/scan?date=${toISODate(date)}&meal=${meal}`}
          />
        )}
        {tab === "recent" && (
          <RecentTab
            recent={recent}
            onPick={(r) => setSub({ kind: "amount", picked: recentToPicked(r) })}
          />
        )}
        {tab === "meals" && (
          <MealsTab
            meals={meals}
            onPick={(m) => setSub({ kind: "meal-confirm", meal: m })}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md min-h-screen flex flex-col">
      <ScreenHeader title="Add food" />
      {children}
    </div>
  );
}

function ScreenHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center px-2 py-2 gap-1 pt-safe">
      <Link
        href="/"
        aria-label="Back"
        className="w-10 h-10 flex items-center justify-center rounded-full active:bg-[var(--color-track)]"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M15 6l-6 6 6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
      <div className="flex-1 text-center text-base font-semibold pr-10">
        {title}
      </div>
      {right ?? <div className="w-10" />}
    </div>
  );
}

function MealPicker({
  value,
  onChange,
}: {
  value: MealType;
  onChange: (m: MealType) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[var(--color-track)]">
      {MEAL_ORDER.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`h-9 rounded-lg text-xs font-medium transition ${
            value === m ? "bg-card shadow-sm" : "text-muted"
          }`}
        >
          {MEAL_LABEL[m]}
        </button>
      ))}
    </div>
  );
}

function TabBar({
  value,
  onChange,
}: {
  value: Tab;
  onChange: (t: Tab) => void;
}) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "search", label: "Search" },
    { id: "recent", label: "Recent" },
    { id: "meals", label: "Meals" },
  ];
  return (
    <div className="flex border-b border-app">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className="flex-1 py-2.5 text-sm font-medium relative"
          style={{
            color:
              value === t.id
                ? "var(--color-app-fg)"
                : "var(--color-muted)",
          }}
        >
          {t.label}
          {value === t.id && (
            <span
              className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
              style={{ background: "var(--color-accent-strong)" }}
            />
          )}
        </button>
      ))}
    </div>
  );
}

function SearchTab({
  query,
  setQuery,
  searching,
  searchError,
  results,
  onPick,
  onManual,
  scanHref,
}: {
  query: string;
  setQuery: (s: string) => void;
  searching: boolean;
  searchError: string | null;
  results: OffProduct[];
  onPick: (p: OffProduct) => void;
  onManual: () => void;
  scanHref: string;
}) {
  return (
    <div className="flex-1 min-h-0 flex flex-col px-4 pt-3">
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search food (e.g. skyr, banán)"
          className="flex-1 h-11 px-3 rounded-xl bg-card border border-app focus:outline-none focus:border-[var(--color-accent)]"
        />
        <Link
          href={scanHref}
          aria-label="Scan barcode"
          className="w-11 h-11 rounded-xl border border-app bg-card flex items-center justify-center"
          style={{ color: "var(--color-accent-strong)" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 6v12M7 6v12M10 6v12M13 6v12M17 6v12M20 6v12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto mt-3 -mx-1 px-1">
        {searching && (
          <div className="text-sm text-muted py-4 text-center">Searching…</div>
        )}
        {searchError && (
          <div
            className="text-sm py-4 text-center"
            style={{ color: "var(--color-over)" }}
          >
            {searchError}
          </div>
        )}
        {!searching &&
          !searchError &&
          results.length === 0 &&
          query.trim().length >= 2 && (
            <div className="text-sm text-muted py-4 text-center">
              No products found.
            </div>
          )}
        <ul className="divide-y divide-[var(--color-border)]">
          {results.map((p) => {
            const isOwn = p.code.startsWith("own:");
            return (
              <li key={p.code || p.name}>
                <button
                  onClick={() => onPick(p)}
                  className="w-full text-left py-2.5 px-2 flex items-center gap-3 rounded-lg active:bg-[var(--color-track)]"
                  style={
                    isOwn
                      ? {
                          background:
                            "color-mix(in oklab, var(--color-accent) 8%, transparent)",
                        }
                      : undefined
                  }
                >
                  <FoodAvatar
                    name={p.name}
                    imageUrl={p.imageUrl}
                    isSeed={p.code.startsWith("seed:") || isOwn}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {p.name}
                    </div>
                    <div className="text-xs text-muted truncate">
                      {p.brand ? `${p.brand} · ` : ""}
                      {p.caloriesPer100g} kcal / 100 g
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <button
        onClick={onManual}
        className="text-sm text-[var(--color-accent-strong)] font-medium py-3 shrink-0"
        type="button"
      >
        Add manually instead
      </button>
    </div>
  );
}

function RecentTab({
  recent,
  onPick,
}: {
  recent: RecentFood[] | null;
  onPick: (r: RecentFood) => void;
}) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-safe">
      {recent === null && (
        <ul className="space-y-2 pt-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="flex items-center gap-3 py-1">
              <Skeleton className="w-9 h-9" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </li>
          ))}
        </ul>
      )}
      {recent && recent.length === 0 && (
        <div className="text-sm text-muted py-6 text-center">
          Nothing yet. Foods you log will show up here.
        </div>
      )}
      {recent && recent.length > 0 && (
        <ul className="divide-y divide-[var(--color-border)]">
          {recent.map((r) => (
            <li key={r.foodId}>
              <button
                onClick={() => onPick(r)}
                className="w-full text-left py-2.5 px-1 flex items-center gap-3 active:bg-[var(--color-track)] rounded-lg"
              >
                <FoodAvatar
                  name={r.name}
                  imageUrl={r.imageUrl}
                  isSeed={false}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{r.name}</div>
                  <div className="text-xs text-muted truncate">
                    {r.brand ? `${r.brand} · ` : ""}
                    {r.caloriesPer100g} kcal / 100 g
                    {r.useCount > 1 && ` · used ${r.useCount}×`}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MealsTab({
  meals,
  onPick,
}: {
  meals: MealSummary[] | null;
  onPick: (m: MealSummary) => void;
}) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-safe">
      <Link
        href="/meals/new"
        className="flex items-center gap-2 py-3 text-sm font-medium text-[var(--color-accent-strong)]"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path
            d="M10 4v12M4 10h12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        Create a meal
      </Link>

      {meals === null && (
        <ul className="space-y-2 pt-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="py-1 space-y-1.5">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </li>
          ))}
        </ul>
      )}
      {meals && meals.length === 0 && (
        <div className="text-sm text-muted py-6 text-center">
          No meals yet. Create combos of foods you often eat together.
        </div>
      )}
      {meals && meals.length > 0 && (
        <ul className="divide-y divide-[var(--color-border)]">
          {meals.map((m) => (
            <li key={m.id} className="flex items-center gap-2">
              <button
                onClick={() => onPick(m)}
                className="flex-1 text-left py-3 px-1 active:bg-[var(--color-track)] rounded-lg"
              >
                <div className="text-sm font-medium truncate">{m.name}</div>
                <div className="text-xs text-muted">
                  {m.componentCount} item{m.componentCount === 1 ? "" : "s"} ·{" "}
                  {m.totalCalories} kcal
                </div>
              </button>
              <Link
                href={`/meals/${m.id}`}
                aria-label="Details"
                className="w-9 h-9 flex items-center justify-center text-muted rounded-full active:bg-[var(--color-track)]"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M8 4l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---- Amount view (after picking a food from Search / Recent) ---------

function AmountView({
  picked,
  date,
  mealType,
  onBack,
  onDone,
}: {
  picked: PickedFood;
  date: Date;
  mealType: MealType;
  onBack: () => void;
  onDone: () => void;
}) {
  const [grams, setGrams] = useState(
    picked.suggestedGrams ? String(picked.suggestedGrams) : ""
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gramsNum = Number(grams.replace(",", "."));
  const preview =
    gramsNum > 0
      ? Math.round((picked.details.caloriesPer100g * gramsNum) / 100)
      : 0;
  const canSave = gramsNum > 0 && !isNaN(gramsNum);

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    setError(null);
    const res = picked.existingFoodId
      ? await createEntryFromExistingFood({
          foodId: picked.existingFoodId,
          date,
          mealType,
          grams: gramsNum,
        })
      : await createEntry({
          date,
          mealType,
          grams: gramsNum,
          food: picked.details,
        });
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "Failed to save");
      return;
    }
    onDone();
  };

  const isSeed = picked.source === "seed";

  return (
    <div className="mx-auto w-full max-w-md min-h-screen flex flex-col">
      <div className="flex items-center px-2 py-2 gap-1 pt-safe">
        <button
          onClick={onBack}
          aria-label="Back"
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-[var(--color-track)]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="flex-1 text-center text-base font-semibold pr-10">
          Amount
        </div>
      </div>

      <div className="px-5 pt-2 pb-5 space-y-5">
        <div className="bg-card border border-app rounded-xl p-3 flex items-center gap-3">
          <FoodAvatar
            name={picked.details.name}
            imageUrl={picked.details.imageUrl ?? null}
            isSeed={isSeed}
            size={44}
          />
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{picked.details.name}</div>
            <div className="text-xs text-muted truncate">
              {picked.details.brand ? `${picked.details.brand} · ` : ""}
              {picked.details.caloriesPer100g} kcal / 100 g
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted font-medium block mb-1.5">
            Grams
          </label>
          <input
            type="text"
            inputMode="decimal"
            pattern="[0-9.,]*"
            autoFocus
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            placeholder="200"
            className="w-full h-11 px-3 rounded-xl bg-card border border-app focus:outline-none focus:border-[var(--color-accent)] tabular-nums"
          />
        </div>

        <div className="text-center text-sm text-muted">
          ≈{" "}
          <span
            className="text-2xl font-semibold tabular-nums"
            style={{
              color:
                preview > 0 ? "var(--color-app-fg)" : "var(--color-muted)",
            }}
          >
            {preview}
          </span>{" "}
          kcal
        </div>

        {error && (
          <div
            className="text-sm text-center"
            style={{ color: "var(--color-over)" }}
          >
            {error}
          </div>
        )}

        <button
          onClick={save}
          disabled={!canSave || busy}
          className="w-full h-12 rounded-xl font-medium text-white disabled:opacity-50"
          style={{ background: "var(--color-accent-strong)" }}
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

// ---- Manual entry view ------------------------------------------------

function ManualView({
  seedName,
  barcode,
  date,
  mealType,
  onBack,
  onDone,
}: {
  seedName?: string;
  barcode?: string;
  date: Date;
  mealType: MealType;
  onBack: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(seedName || "");
  const [englishName, setEnglishName] = useState("");
  const [brand, setBrand] = useState("");
  const [kcalPer100g, setKcalPer100g] = useState("");
  const [proteinPer100g, setProteinPer100g] = useState("");
  const [carbsPer100g, setCarbsPer100g] = useState("");
  const [fatPer100g, setFatPer100g] = useState("");
  const [grams, setGrams] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accept both dot and comma as decimal separators (Slovak keyboards).
  const parseNum = (s: string) => Number(s.replace(",", "."));
  const gramsNum = parseNum(grams);
  const kcalPer100gNum = parseNum(kcalPer100g);
  const proteinNum = parseNum(proteinPer100g);
  const carbsNum = parseNum(carbsPer100g);
  const fatNum = parseNum(fatPer100g);

  const macrosValid =
    !isNaN(proteinNum) &&
    !isNaN(carbsNum) &&
    !isNaN(fatNum) &&
    proteinNum >= 0 &&
    carbsNum >= 0 &&
    fatNum >= 0 &&
    proteinPer100g !== "" &&
    carbsPer100g !== "" &&
    fatPer100g !== "";

  const canSave =
    name.trim().length > 0 &&
    gramsNum > 0 &&
    kcalPer100gNum >= 0 &&
    !isNaN(gramsNum) &&
    !isNaN(kcalPer100gNum) &&
    macrosValid;

  const previewCalories =
    kcalPer100gNum > 0 && gramsNum > 0
      ? Math.round((kcalPer100gNum * gramsNum) / 100)
      : 0;

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    setError(null);
    const res = await createEntry({
      date,
      mealType,
      grams: gramsNum,
      food: {
        name: name.trim(),
        englishName: englishName.trim() || undefined,
        brand: brand.trim() || undefined,
        barcode: barcode || undefined,
        caloriesPer100g: kcalPer100gNum,
        proteinPer100g: proteinNum,
        carbsPer100g: carbsNum,
        fatPer100g: fatNum,
        source: "custom",
      },
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "Failed to save");
      return;
    }
    onDone();
  };

  return (
    <div className="mx-auto w-full max-w-md min-h-screen flex flex-col">
      <div className="flex items-center px-2 py-2 gap-1 pt-safe">
        <button
          onClick={onBack}
          aria-label="Back"
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-[var(--color-track)]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="flex-1 text-center text-base font-semibold pr-10">
          Add manually
        </div>
      </div>

      <div className="px-5 pt-2 pb-5 space-y-3">
        {barcode && (
          <div
            className="rounded-xl p-3 text-sm space-y-1"
            style={{
              background: "color-mix(in oklab, var(--color-warn) 15%, transparent)",
              border: "1px solid color-mix(in oklab, var(--color-warn) 40%, transparent)",
            }}
          >
            <div className="font-semibold">Not in the database</div>
            <div className="text-muted">
              Barcode{" "}
              <span className="tabular-nums text-app font-medium">
                {barcode}
              </span>
              . Fill in name and calories — we&apos;ll remember it next time
              you scan it.
            </div>
          </div>
        )}
        <div>
          <label className="text-xs text-muted font-medium block mb-1.5">
            Food name (Slovak)
          </label>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Kuracie prsia"
            className="w-full h-11 px-3 rounded-xl bg-card border border-app focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>
        <div>
          <label className="text-xs text-muted font-medium block mb-1.5">
            English name <span className="opacity-60">(optional)</span>
          </label>
          <input
            type="text"
            value={englishName}
            onChange={(e) => setEnglishName(e.target.value)}
            placeholder="e.g. Chicken breast"
            className="w-full h-11 px-3 rounded-xl bg-card border border-app focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>
        <div>
          <label className="text-xs text-muted font-medium block mb-1.5">
            Brand <span className="opacity-60">(optional)</span>
          </label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. Rajo"
            className="w-full h-11 px-3 rounded-xl bg-card border border-app focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>
        <div>
          <label className="text-xs text-muted font-medium block mb-1.5">
            Calories per 100 g
          </label>
          <input
            type="text"
            inputMode="decimal"
            pattern="[0-9.,]*"
            value={kcalPer100g}
            onChange={(e) => setKcalPer100g(e.target.value)}
            placeholder="165"
            className="w-full h-11 px-3 rounded-xl bg-card border border-app focus:outline-none focus:border-[var(--color-accent)] tabular-nums"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted font-medium block mb-1.5">
              Protein / 100 g
            </label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9.,]*"
              value={proteinPer100g}
              onChange={(e) => setProteinPer100g(e.target.value)}
              placeholder="22"
              className="w-full h-11 px-3 rounded-xl bg-card border border-app focus:outline-none focus:border-[var(--color-accent)] tabular-nums"
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium block mb-1.5">
              Carbs / 100 g
            </label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9.,]*"
              value={carbsPer100g}
              onChange={(e) => setCarbsPer100g(e.target.value)}
              placeholder="0"
              className="w-full h-11 px-3 rounded-xl bg-card border border-app focus:outline-none focus:border-[var(--color-accent)] tabular-nums"
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium block mb-1.5">
              Fat / 100 g
            </label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9.,]*"
              value={fatPer100g}
              onChange={(e) => setFatPer100g(e.target.value)}
              placeholder="3"
              className="w-full h-11 px-3 rounded-xl bg-card border border-app focus:outline-none focus:border-[var(--color-accent)] tabular-nums"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted font-medium block mb-1.5">
            How many grams did you eat?
          </label>
          <input
            type="text"
            inputMode="decimal"
            pattern="[0-9.,]*"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            placeholder="200"
            className="w-full h-11 px-3 rounded-xl bg-card border border-app focus:outline-none focus:border-[var(--color-accent)] tabular-nums"
          />
        </div>

        <div className="text-center text-sm text-muted">
          ≈{" "}
          <span
            className="text-2xl font-semibold tabular-nums"
            style={{
              color:
                previewCalories > 0
                  ? "var(--color-app-fg)"
                  : "var(--color-muted)",
            }}
          >
            {previewCalories}
          </span>{" "}
          kcal
        </div>

        {error && (
          <div className="text-sm" style={{ color: "var(--color-over)" }}>
            {error}
          </div>
        )}

        <button
          onClick={save}
          disabled={!canSave || busy}
          className="w-full h-12 rounded-xl font-medium text-white disabled:opacity-50"
          style={{ background: "var(--color-accent-strong)" }}
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

// ---- Meal confirm view -------------------------------------------------

function MealConfirmView({
  meal,
  date,
  mealType,
  onBack,
  onDone,
}: {
  meal: MealSummary;
  date: Date;
  mealType: MealType;
  onBack: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    const res = await logMeal(meal.id, date, mealType);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "Failed to log meal");
      return;
    }
    onDone();
  };

  return (
    <div className="mx-auto w-full max-w-md min-h-screen flex flex-col">
      <div className="flex items-center px-2 py-2 gap-1 pt-safe">
        <button
          onClick={onBack}
          aria-label="Back"
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-[var(--color-track)]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="flex-1 text-center text-base font-semibold pr-10">
          Log meal
        </div>
      </div>

      <div className="px-5 pt-2 pb-5 space-y-5">
        <div className="bg-card border border-app rounded-xl p-4">
          <div className="font-semibold text-lg">{meal.name}</div>
          <div className="text-xs text-muted mt-1">
            {meal.componentCount} item{meal.componentCount === 1 ? "" : "s"} ·{" "}
            <span className="font-medium text-app">{meal.totalCalories}</span>{" "}
            kcal · P {meal.totalProtein}g · F {meal.totalFat}g
          </div>
        </div>

        <div className="text-sm text-center text-muted">
          Will be added to{" "}
          <span className="font-medium text-app">
            {MEAL_LABEL[mealType]}
          </span>
        </div>

        {error && (
          <div
            className="text-sm text-center"
            style={{ color: "var(--color-over)" }}
          >
            {error}
          </div>
        )}

        <button
          onClick={save}
          disabled={busy}
          className="w-full h-12 rounded-xl font-medium text-white disabled:opacity-50"
          style={{ background: "var(--color-accent-strong)" }}
        >
          {busy ? "Logging…" : `Log to ${MEAL_LABEL[mealType]}`}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function AddPage() {
  return (
    <Suspense fallback={<Shell />}>
      <AddScreen />
    </Suspense>
  );
}
