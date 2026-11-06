"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FoodAvatar } from "@/components/FoodAvatar";
import { createMeal, type FoodDetails, type NewMealInput } from "@/lib/queries";
import { searchFoods, type OffProduct } from "@/lib/openFoodFacts";

type DraftComponent = {
  key: string; // client-only local id
  existingFoodId?: string;
  newFood?: FoodDetails;
  displayName: string;
  displayBrand?: string;
  imageUrl?: string;
  isSeed?: boolean;
  caloriesPer100g: number;
  grams: number;
};

function offToDraft(p: OffProduct, grams: number): DraftComponent {
  const isSeed = p.code.startsWith("seed:");
  return {
    key: `${p.code || p.name}-${Date.now()}`,
    displayName: p.name,
    displayBrand: p.brand ?? undefined,
    imageUrl: p.imageUrl ?? undefined,
    isSeed,
    caloriesPer100g: p.caloriesPer100g,
    grams,
    newFood: {
      name: p.name,
      brand: p.brand ?? undefined,
      barcode: isSeed ? undefined : p.code || undefined,
      imageUrl: p.imageUrl ?? undefined,
      caloriesPer100g: p.caloriesPer100g,
      proteinPer100g: p.proteinPer100g,
      fatPer100g: p.fatPer100g,
      carbsPer100g: p.carbsPer100g,
      source: isSeed ? "custom" : "off",
    },
  };
}

export default function NewMealPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [components, setComponents] = useState<DraftComponent[]>([]);
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCalories = components.reduce(
    (sum, c) => sum + (c.caloriesPer100g * c.grams) / 100,
    0
  );

  const canSave =
    name.trim().length > 0 && components.length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    const input: NewMealInput = {
      name: name.trim(),
      components: components.map((c) => ({
        existingFoodId: c.existingFoodId,
        newFood: c.newFood,
        grams: c.grams,
      })),
    };
    const res = await createMeal(input);
    setSaving(false);
    if (!res.ok) {
      setError(res.error || "Failed to create meal");
      return;
    }
    router.push("/add?meal=breakfast");
  };

  return (
    <div className="mx-auto w-full max-w-md min-h-screen flex flex-col">
      <div className="flex items-center px-2 py-2 gap-1 pt-safe">
        <Link
          href="/add"
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
          New meal
        </div>
      </div>

      <div className="px-5 pt-2 pb-5 space-y-4 flex-1">
        <div>
          <label className="text-xs text-muted font-medium block mb-1.5">
            Meal name
          </label>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Morning smoothie"
            className="w-full h-11 px-3 rounded-xl bg-card border border-app focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-muted font-medium">
              Ingredients
            </label>
            <span className="text-xs text-muted tabular-nums">
              Total: {Math.round(totalCalories)} kcal
            </span>
          </div>

          {components.length === 0 && (
            <div className="text-sm text-muted text-center py-6">
              Add ingredients that make up this meal.
            </div>
          )}

          <ul className="divide-y divide-[var(--color-border)]">
            {components.map((c) => (
              <li key={c.key} className="py-2.5 flex items-center gap-3">
                <FoodAvatar
                  name={c.displayName}
                  imageUrl={c.imageUrl ?? null}
                  isSeed={!!c.isSeed}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    {c.displayName}
                  </div>
                  <div className="text-xs text-muted truncate">
                    {c.displayBrand ? `${c.displayBrand} · ` : ""}
                    {c.grams} g · {Math.round((c.caloriesPer100g * c.grams) / 100)} kcal
                  </div>
                </div>
                <button
                  onClick={() =>
                    setComponents((prev) =>
                      prev.filter((x) => x.key !== c.key)
                    )
                  }
                  className="w-8 h-8 flex items-center justify-center rounded-full text-muted active:bg-[var(--color-track)]"
                  aria-label="Remove"
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M5 6h10M8 6V4h4v2M6 6l1 10h6l1-10"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setPicker(true)}
            className="mt-3 w-full h-11 rounded-xl border border-app text-sm font-medium text-[var(--color-accent-strong)] active:bg-[var(--color-track)]"
          >
            + Add ingredient
          </button>
        </div>

        {error && (
          <div className="text-sm" style={{ color: "var(--color-over)" }}>
            {error}
          </div>
        )}

        <button
          onClick={save}
          disabled={!canSave}
          className="w-full h-12 rounded-xl font-medium text-white disabled:opacity-50"
          style={{ background: "var(--color-accent-strong)" }}
        >
          {saving ? "Saving…" : "Save meal"}
        </button>
      </div>

      {picker && (
        <IngredientPicker
          onClose={() => setPicker(false)}
          onPick={(product, grams) => {
            setComponents((prev) => [...prev, offToDraft(product, grams)]);
            setPicker(false);
          }}
        />
      )}
    </div>
  );
}

// ---- Ingredient picker (search → grams) ------------------------------

function IngredientPicker({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (product: OffProduct, grams: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OffProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<OffProduct | null>(null);
  const [grams, setGrams] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    setError(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(async () => {
      try {
        const products = await searchFoods(q, controller.signal);
        if (!controller.signal.aborted) {
          setResults(products);
          setSearching(false);
        }
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Search failed");
        setSearching(false);
      }
    }, 550);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const gramsNum = Number(grams.replace(",", "."));
  const canPick = selected && gramsNum > 0 && !isNaN(gramsNum);

  return (
    <div className="fixed inset-0 z-50 bg-app flex flex-col mx-auto max-w-md">
      <div className="flex items-center px-2 py-2 gap-1 pt-safe">
        <button
          onClick={selected ? () => setSelected(null) : onClose}
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
          {selected ? "Amount" : "Add ingredient"}
        </div>
      </div>

      {!selected && (
        <>
          <div className="px-4 pt-2 pb-2">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search food"
              className="w-full h-11 px-3 rounded-xl bg-card border border-app focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <div className="flex-1 overflow-y-auto px-4">
            {searching && (
              <div className="text-sm text-muted py-4 text-center">
                Searching…
              </div>
            )}
            {error && (
              <div
                className="text-sm py-4 text-center"
                style={{ color: "var(--color-over)" }}
              >
                {error}
              </div>
            )}
            <ul className="divide-y divide-[var(--color-border)]">
              {results.map((p) => (
                <li key={p.code || p.name}>
                  <button
                    onClick={() => setSelected(p)}
                    className="w-full text-left py-2.5 px-1 flex items-center gap-3 active:bg-[var(--color-track)] rounded-lg"
                  >
                    <FoodAvatar
                      name={p.name}
                      imageUrl={p.imageUrl}
                      isSeed={p.code.startsWith("seed:")}
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
              ))}
            </ul>
          </div>
        </>
      )}

      {selected && (
        <div className="px-5 pt-2 pb-5 space-y-5">
          <div className="bg-card border border-app rounded-xl p-3 flex items-center gap-3">
            <FoodAvatar
              name={selected.name}
              imageUrl={selected.imageUrl}
              isSeed={selected.code.startsWith("seed:")}
              size={44}
            />
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{selected.name}</div>
              <div className="text-xs text-muted">
                {selected.brand ? `${selected.brand} · ` : ""}
                {selected.caloriesPer100g} kcal / 100 g
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

          <button
            onClick={() => canPick && onPick(selected, gramsNum)}
            disabled={!canPick}
            className="w-full h-12 rounded-xl font-medium text-white disabled:opacity-50"
            style={{ background: "var(--color-accent-strong)" }}
          >
            Add to meal
          </button>
        </div>
      )}
    </div>
  );
}
