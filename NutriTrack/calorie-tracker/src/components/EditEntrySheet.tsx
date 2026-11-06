"use client";

import { useEffect, useState } from "react";
import { updateEntry } from "@/lib/queries";
import {
  MEAL_LABEL,
  MEAL_ORDER,
  type MealEntry,
  type MealType,
} from "@/lib/types";

type Props = {
  entry: MealEntry | null;
  onClose: () => void;
  onSaved: () => void;
};

export function EditEntrySheet({ entry, onClose, onSaved }: Props) {
  const [meal, setMeal] = useState<MealType>("snack");
  const [grams, setGrams] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (entry) {
      setMeal(entry.mealType);
      setGrams(String(entry.grams));
      setError(null);
    }
  }, [entry]);

  if (!entry) return null;

  // kcal per 100 g back-derived from the entry we're editing.
  const per100 = entry.grams > 0 ? entry.calories / (entry.grams / 100) : 0;
  const gramsNum = Number(grams);
  const preview =
    gramsNum > 0 && !isNaN(gramsNum) ? Math.round((per100 * gramsNum) / 100) : 0;
  const canSave =
    gramsNum > 0 &&
    !isNaN(gramsNum) &&
    (gramsNum !== entry.grams || meal !== entry.mealType);

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    setError(null);
    const res = await updateEntry(entry.id, {
      grams: gramsNum,
      mealType: meal,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "Failed to save");
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute inset-0 bg-black/50"
      />
      <div
        className="relative w-full max-w-md bg-app rounded-t-3xl shadow-2xl border-t border-app pb-safe"
        style={{ animation: "slideup 200ms ease-out" }}
      >
        <style>{`
          @keyframes slideup {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>

        <div className="flex items-center justify-center pt-2 pb-1 shrink-0">
          <span className="w-10 h-1 rounded-full bg-[var(--color-border)]" />
        </div>

        <div className="px-5 pb-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Edit entry</h2>
            <button
              onClick={onClose}
              className="text-sm text-muted"
              type="button"
            >
              Cancel
            </button>
          </div>

          <div className="bg-card border border-app rounded-xl p-3">
            <div className="font-medium truncate">{entry.foodName}</div>
            <div className="text-xs text-muted truncate">
              {entry.brand ? `${entry.brand} · ` : ""}
              {Math.round(per100)} kcal / 100 g
            </div>
          </div>

          <div>
            <label className="text-xs text-muted font-medium block mb-1.5">
              Meal
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[var(--color-track)]">
              {MEAL_ORDER.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMeal(m)}
                  className={`h-9 rounded-lg text-xs font-medium transition ${
                    meal === m ? "bg-card shadow-sm" : "text-muted"
                  }`}
                >
                  {MEAL_LABEL[m]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted font-medium block mb-1.5">
              Grams
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="1"
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
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
