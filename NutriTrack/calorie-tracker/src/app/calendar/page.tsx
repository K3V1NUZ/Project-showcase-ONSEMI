"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import {
  addMonths,
  isSameDay,
  startOfMonth,
  toISODate,
} from "@/lib/dateHelpers";
import {
  fetchMonthlyCalorieTotals,
  fetchUserSettings,
} from "@/lib/queries";
import type { DailyGoal } from "@/lib/types";
import { useSwipe } from "@/lib/useSwipe";
import { Skeleton } from "@/components/Skeleton";
import { caloriesBandColor } from "@/lib/calorieColor";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function buildMonthGrid(monthAnchor: Date): Date[] {
  const first = startOfMonth(monthAnchor);
  const offset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(1 - offset);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

function Shell() {
  return (
    <div className="mx-auto w-full max-w-md min-h-screen flex flex-col">
      <TopBar view="calendar" />
      <div className="flex items-center justify-between px-4 py-3">
        <Skeleton className="w-10 h-10" circle />
        <Skeleton className="w-32 h-5" />
        <Skeleton className="w-10 h-10" circle />
      </div>
      <main className="flex-1 px-3 pb-8">
        <div className="grid grid-cols-7 gap-1 mb-1 px-1">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-3 mx-2" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 42 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      </main>
    </div>
  );
}

function MonthGrid() {
  const [today, setToday] = useState<Date | null>(null);
  const [monthAnchor, setMonthAnchor] = useState<Date | null>(null);
  const [goal, setGoal] = useState<DailyGoal | null>(null);
  const [totals, setTotals] = useState<Record<string, number>>({});

  useEffect(() => {
    const now = new Date();
    setToday(now);
    setMonthAnchor(now);
    fetchUserSettings().then(setGoal);
  }, []);

  useEffect(() => {
    if (!monthAnchor) return;
    fetchMonthlyCalorieTotals(monthAnchor).then(setTotals);
  }, [monthAnchor]);

  const days = useMemo(
    () => (monthAnchor ? buildMonthGrid(monthAnchor) : []),
    [monthAnchor]
  );

  const swipe = useSwipe({
    onSwipeLeft: () =>
      setMonthAnchor((d) => (d ? addMonths(d, 1) : d)),
    onSwipeRight: () =>
      setMonthAnchor((d) => (d ? addMonths(d, -1) : d)),
  });

  if (!monthAnchor || !today || !goal) return <Shell />;

  const monthLabel = monthAnchor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const activeMonth = monthAnchor.getMonth();

  return (
    <div className="mx-auto w-full max-w-md min-h-screen flex flex-col">
      <TopBar view="calendar" />

      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setMonthAnchor((d) => (d ? addMonths(d, -1) : d))}
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-[var(--color-track)]"
          aria-label="Previous month"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M12 4L6 10L12 16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          onClick={() => setMonthAnchor(new Date())}
          className="text-lg font-semibold"
        >
          {monthLabel}
        </button>
        <button
          onClick={() => setMonthAnchor((d) => (d ? addMonths(d, 1) : d))}
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-[var(--color-track)]"
          aria-label="Next month"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M8 4L14 10L8 16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <main className="flex-1 px-3 pb-8" {...swipe}>
        <div className="grid grid-cols-7 gap-1 mb-1 px-1">
          {WEEKDAY_LABELS.map((w) => (
            <div
              key={w}
              className="text-[10px] font-medium text-muted text-center uppercase tracking-wider py-1"
            >
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const inMonth = d.getMonth() === activeMonth;
            const isToday = isSameDay(d, today);
            const iso = toISODate(d);
            const total = totals[iso];
            const hasData = inMonth && total !== undefined;
            const rawRatio = hasData ? total / goal.calories : 0;
            const clamped = Math.min(rawRatio, 1);
            const R = 14;
            const CIRC = 2 * Math.PI * R;
            const dash = CIRC * clamped;
            const arcColor: string | null = hasData
              ? caloriesBandColor(total, goal.calories)
              : null;
            return (
              <Link
                key={d.toISOString()}
                href={`/?date=${iso}`}
                className={`aspect-square flex items-center justify-center active:scale-95 transition-transform ${
                  inMonth ? "" : "opacity-40"
                }`}
              >
                <div className="relative w-11 h-11">
                  {isToday && (
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background:
                          "color-mix(in oklab, var(--color-app-fg) 10%, var(--color-card))",
                      }}
                    />
                  )}
                  {inMonth && (
                    <svg
                      viewBox="0 0 32 32"
                      className="absolute inset-0 -rotate-90 w-full h-full"
                      aria-hidden
                    >
                      <circle
                        cx="16"
                        cy="16"
                        r={R}
                        fill="none"
                        stroke="color-mix(in oklab, var(--color-muted) 15%, transparent)"
                        strokeWidth="3"
                      />
                      {arcColor && dash > 0 && (
                        <circle
                          cx="16"
                          cy="16"
                          r={R}
                          fill="none"
                          stroke={arcColor}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={`${dash} ${CIRC - dash}`}
                        />
                      )}
                    </svg>
                  )}
                  <span
                    className={`absolute inset-0 flex items-center justify-center text-xs tabular-nums ${
                      isToday ? "font-bold" : "font-medium"
                    }`}
                  >
                    {d.getDate()}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default function CalendarPage() {
  return <MonthGrid />;
}
