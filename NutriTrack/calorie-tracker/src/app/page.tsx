"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalorieRing } from "@/components/CalorieRing";
import { DayHeader } from "@/components/DayHeader";
import { WeekStrip } from "@/components/WeekStrip";
import { MealSection } from "@/components/MealSection";
import { TopBar } from "@/components/TopBar";
import { EditEntrySheet } from "@/components/EditEntrySheet";
import { Skeleton } from "@/components/Skeleton";
import {
  MEAL_ORDER,
  type DailyGoal,
  type MealEntry,
  type MealType,
} from "@/lib/types";
import { addDays, fromISODate, isSameDay, toISODate } from "@/lib/dateHelpers";
import {
  deleteEntry,
  fetchEntriesForDate,
  fetchUserSettings,
} from "@/lib/queries";
import { useSwipe } from "@/lib/useSwipe";

function Shell() {
  return (
    <div className="mx-auto w-full max-w-md min-h-screen flex flex-col">
      <TopBar view="day" />
      <div className="flex items-center justify-between px-4 py-3">
        <Skeleton className="w-10 h-10" circle />
        <div className="flex flex-col items-center gap-1.5">
          <Skeleton className="w-16 h-4" />
          <Skeleton className="w-20 h-3" />
        </div>
        <Skeleton className="w-10 h-10" circle />
      </div>
      <main className="flex-1 px-4 pb-24 space-y-6">
        <div className="flex flex-col items-center pt-2 pb-2">
          <Skeleton className="w-72 h-72" circle />
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </main>
    </div>
  );
}

function DayView() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const [date, setDate] = useState<Date | null>(null);
  const [goal, setGoal] = useState<DailyGoal | null>(null);
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MealEntry | null>(null);
  // For the WeekStrip: 'now' compared against each pill's day (midnight).
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  useEffect(() => {
    setDate((dateParam && fromISODate(dateParam)) || new Date());
  }, [dateParam]);

  useEffect(() => {
    fetchUserSettings().then(setGoal);
  }, []);

  const reload = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    const rows = await fetchEntriesForDate(date);
    setEntries(rows);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addHref = useMemo(() => {
    if (!date) return "/add";
    return `/add?date=${toISODate(date)}`;
  }, [date]);
  const scanHref = useMemo(() => {
    if (!date) return "/scan";
    return `/scan?date=${toISODate(date)}`;
  }, [date]);

  // Hook must be called before any early return so the hook order stays
  // consistent between renders. `date` is null until initial mount, so
  // guard inside the callbacks.
  const swipe = useSwipe({
    onSwipeLeft: () => date && setDate(addDays(date, 1)),
    onSwipeRight: () => date && setDate(addDays(date, -1)),
  });

  if (!date || !goal) return <Shell />;

  const totals = entries.reduce(
    (acc, e) => {
      acc.calories += e.calories;
      acc.protein += e.protein;
      acc.fat += e.fat;
      acc.carbs += e.carbs;
      return acc;
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const hrefForMeal = (meal: MealType) =>
    `/add?date=${toISODate(date)}&meal=${meal}`;

  const handleDelete = async (entryId: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
    const res = await deleteEntry(entryId);
    if (!res.ok) reload();
  };

  return (
    <div className="mx-auto w-full max-w-md min-h-screen flex flex-col">
      <TopBar view="day" />
      <div className="mt-1">
        <WeekStrip
          selectedDate={date}
          today={today}
          calorieGoal={goal.calories}
          onSelectDay={setDate}
          refreshKey={entries.length}
        />
      </div>
      <DayHeader
        date={date}
        onPrev={() => setDate(addDays(date, -1))}
        onNext={() => setDate(addDays(date, 1))}
        onToday={() => setDate(new Date())}
      />

      <main className="flex-1 px-4 pb-24 space-y-6" {...swipe}>
        {!isSameDay(date, today) && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setDate(new Date())}
              className="text-xs font-semibold tracking-wide px-4 py-2 rounded-2xl bg-card text-app"
            >
              Go to today
            </button>
          </div>
        )}

        <div className="flex flex-col items-center pt-2 pb-2">
          <CalorieRing
            calories={{ consumed: totals.calories, goal: goal.calories }}
            protein={{ consumed: totals.protein, goal: goal.protein }}
            fat={{ consumed: totals.fat, goal: goal.fat }}
            carbs={{ consumed: totals.carbs, goal: goal.carbs }}
          />
        </div>

        <div className="space-y-3" aria-busy={loading}>
          {MEAL_ORDER.map((meal) => (
            <MealSection
              key={meal}
              mealType={meal}
              entries={entries.filter((e) => e.mealType === meal)}
              onAddHref={hrefForMeal(meal)}
              onEdit={(e) => setEditing(e)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </main>

      <EditEntrySheet
        entry={editing}
        onClose={() => setEditing(null)}
        onSaved={reload}
      />

      <div className="fixed bottom-0 right-0 mb-[max(env(safe-area-inset-bottom),1rem)] mr-4 flex items-center gap-3">
        <Link
          href={scanHref}
          className="w-12 h-12 rounded-full shadow-md flex items-center justify-center bg-card border border-app"
          style={{ color: "var(--color-accent-strong)" }}
          aria-label="Scan barcode"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 6v12M7 6v12M10 6v12M13 6v12M17 6v12M20 6v12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </Link>
        <Link
          href={addHref}
          className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white"
          style={{ background: "var(--color-accent-strong)" }}
          aria-label="Add food"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5V19M5 12H19"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<Shell />}>
      <DayView />
    </Suspense>
  );
}
