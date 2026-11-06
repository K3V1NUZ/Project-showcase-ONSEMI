"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, isSameDay, startOfWeekMonday, toISODate } from "@/lib/dateHelpers";
import { fetchCalorieTotalsForRange } from "@/lib/queries";
import { caloriesBandColor } from "@/lib/calorieColor";

type Props = {
  selectedDate: Date;
  today: Date;
  calorieGoal: number;
  onSelectDay: (date: Date) => void;
  refreshKey?: number;
};

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

const R = 14;
const CIRC = 2 * Math.PI * R;

// Ring colour uses the shared calorie-band ladder from lib/calorieColor
// so the main ring, week strip, and calendar all agree.

export function WeekStrip({
  selectedDate,
  today,
  calorieGoal,
  onSelectDay,
  refreshKey = 0,
}: Props) {
  const weekStart = useMemo(
    () => startOfWeekMonday(selectedDate),
    [selectedDate]
  );
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const [totals, setTotals] = useState<Record<string, number>>({});

  useEffect(() => {
    const end = addDays(weekStart, 7);
    fetchCalorieTotalsForRange(weekStart, end).then(setTotals);
  }, [weekStart, refreshKey]);

  return (
    <div className="grid grid-cols-7 gap-1.5 px-3">
      {days.map((d, i) => {
        const iso = toISODate(d);
        const selected = isSameDay(d, selectedDate);
        const isToday = isSameDay(d, today);
        const isFuture = d.getTime() > today.getTime();
        const total = totals[iso];
        // No arc for future days (nothing to score yet); grey for today
        // with 0 logged; otherwise band-based colour.
        let arcColor: string | null = null;
        let ratio = 0;
        if (!isFuture) {
          if (total === undefined) {
            arcColor = null; // untouched past day → no ring drawn
          } else {
            arcColor = caloriesBandColor(total, calorieGoal);
            ratio = calorieGoal > 0 ? Math.min(total / calorieGoal, 1) : 0;
          }
        }
        const dash = CIRC * ratio;

        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelectDay(d)}
            className="flex flex-col items-center py-1.5 px-1 rounded-2xl transition"
            style={{
              // Today gets a slightly nudged card colour — a hair darker in
              // light mode, a hair lighter in dark mode — via mixing the
              // foreground colour into the card colour.
              background: isToday
                ? "color-mix(in oklab, var(--color-app-fg) 10%, var(--color-card))"
                : "var(--color-card)",
              border: selected
                ? "1.5px solid var(--color-app-fg)"
                : "1.5px solid transparent",
            }}
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-wide mb-0.5 text-muted"
            >
              {WEEKDAY_LETTERS[i]}
            </span>
            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg
                viewBox="0 0 32 32"
                className="absolute inset-0 w-full h-full -rotate-90"
                aria-hidden
              >
                <circle
                  cx="16"
                  cy="16"
                  r={R}
                  fill="none"
                  stroke="color-mix(in oklab, var(--color-muted) 15%, transparent)"
                  strokeWidth="2.5"
                />
                {arcColor && dash > 0 && (
                  <circle
                    cx="16"
                    cy="16"
                    r={R}
                    fill="none"
                    stroke={arcColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${CIRC - dash}`}
                  />
                )}
                {arcColor && dash === 0 && (
                  // 0-kcal day still gets a visible grey full ring so
                  // it doesn't look 'missing'.
                  <circle
                    cx="16"
                    cy="16"
                    r={R}
                    fill="none"
                    stroke={arcColor}
                    strokeWidth="2.5"
                  />
                )}
              </svg>
              <span className="relative text-xs font-semibold tabular-nums">
                {d.getDate()}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
