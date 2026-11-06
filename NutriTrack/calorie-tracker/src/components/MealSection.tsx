"use client";

import Link from "next/link";
import type { MealEntry, MealType } from "@/lib/types";
import { MEAL_LABEL } from "@/lib/types";
import { MealIcon } from "./MealIcon";

type Props = {
  mealType: MealType;
  entries: MealEntry[];
  onAddHref: string;
  onEdit: (entry: MealEntry) => void;
  onDelete: (entryId: string) => void;
};

export function MealSection({
  mealType,
  entries,
  onAddHref,
  onEdit,
  onDelete,
}: Props) {
  const total = entries.reduce((sum, e) => sum + e.calories, 0);
  const label = MEAL_LABEL[mealType];

  return (
    <section className="bg-card rounded-2xl overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <MealIcon type={mealType} size={20} className="shrink-0 text-app" />
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            {label}
          </h2>
          <span className="text-xs text-muted tabular-nums">
            {total} kcal
          </span>
        </div>
        <Link
          href={onAddHref}
          className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--color-accent)] active:bg-[var(--color-track)]"
          aria-label={`Add to ${label}`}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 4V16M4 10H16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </Link>
      </header>
      {entries.length > 0 && (
        <ul className="divide-y divide-[var(--color-border)]">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center">
              <button
                onClick={() => onEdit(e)}
                className="flex-1 min-w-0 flex items-center justify-between gap-3 pl-4 pr-2 py-3 text-left active:bg-[var(--color-track)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    {e.foodName}
                    {e.brand && (
                      <span className="text-muted font-normal">
                        {" · "}
                        {e.brand}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted tabular-nums">
                    {e.grams} g
                  </div>
                </div>
                <div className="text-sm tabular-nums font-medium shrink-0">
                  {e.calories} kcal
                </div>
              </button>
              <button
                onClick={() => onDelete(e.id)}
                className="w-10 h-10 flex items-center justify-center rounded-full text-muted active:bg-[var(--color-track)] shrink-0 mr-2"
                aria-label="Delete entry"
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
      )}
    </section>
  );
}

