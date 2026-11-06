"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FoodAvatar } from "@/components/FoodAvatar";
import { deleteMeal, fetchMealDetail } from "@/lib/queries";
import type { MealDetail } from "@/lib/types";

type PageProps = { params: Promise<{ id: string }> };

export default function MealDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [meal, setMeal] = useState<MealDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMealDetail(id).then((m) => {
      setMeal(m);
      setLoading(false);
    });
  }, [id]);

  const onDelete = async () => {
    setDeleting(true);
    setError(null);
    const res = await deleteMeal(id);
    setDeleting(false);
    if (!res.ok) {
      setError("Failed to delete");
      return;
    }
    router.push("/add");
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
          Meal
        </div>
      </div>

      <div className="px-5 pt-2 pb-5 space-y-5 flex-1">
        {loading && (
          <div className="text-sm text-muted text-center py-8">Loading…</div>
        )}
        {!loading && !meal && (
          <div className="text-sm text-muted text-center py-8">
            Meal not found.
          </div>
        )}
        {meal && (
          <>
            <div>
              <h1 className="text-2xl font-semibold">{meal.name}</h1>
              <div className="text-sm text-muted mt-1">
                {meal.componentCount} item
                {meal.componentCount === 1 ? "" : "s"} ·{" "}
                <span className="font-medium text-app">
                  {meal.totalCalories}
                </span>{" "}
                kcal · P {meal.totalProtein}g · F {meal.totalFat}g
              </div>
            </div>

            <div>
              <div className="text-xs text-muted font-medium uppercase tracking-wide mb-2">
                Ingredients
              </div>
              <ul className="divide-y divide-[var(--color-border)] bg-card border border-app rounded-xl overflow-hidden">
                {meal.components.map((c) => (
                  <li
                    key={c.id}
                    className="py-3 px-3 flex items-center gap-3"
                  >
                    <FoodAvatar
                      name={c.foodName}
                      imageUrl={c.imageUrl}
                      isSeed={false}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {c.foodName}
                      </div>
                      <div className="text-xs text-muted truncate">
                        {c.brand ? `${c.brand} · ` : ""}
                        {c.grams} g
                      </div>
                    </div>
                    <div className="text-sm tabular-nums font-medium">
                      {c.calories} kcal
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {error && (
              <div className="text-sm" style={{ color: "var(--color-over)" }}>
                {error}
              </div>
            )}

            {!confirmingDelete ? (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="w-full h-11 rounded-xl border border-app text-sm font-medium"
                style={{ color: "var(--color-over)" }}
              >
                Delete meal
              </button>
            ) : (
              <div className="space-y-2">
                <div className="text-sm text-center text-muted">
                  Are you sure? This can&apos;t be undone.
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    className="h-11 rounded-xl border border-app text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onDelete}
                    disabled={deleting}
                    className="h-11 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                    style={{ background: "var(--color-over)" }}
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
