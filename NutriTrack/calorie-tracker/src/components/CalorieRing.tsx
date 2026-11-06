"use client";

import { useState } from "react";
import { caloriesBandColor } from "@/lib/calorieColor";

type Bucket = { consumed: number; goal: number };

type Props = {
  calories: Bucket;
  protein: Bucket;
  fat: Bucket;
  carbs: Bucket;
};

type MacroKey = "calories" | "protein" | "fat" | "carbs";

// Radius and stroke tuned so the four rings nest with visible gaps and
// still leave enough space in the center for two lines of text.
const CONFIG: Record<
  MacroKey,
  { r: number; sw: number; color: string; label: string }
> = {
  calories: { r: 45, sw: 10, color: "var(--color-accent)", label: "Calories" },
  protein: { r: 37, sw: 5, color: "var(--color-macro-protein)", label: "Protein" },
  fat: { r: 31.5, sw: 5, color: "var(--color-macro-fat)", label: "Fat" },
  carbs: { r: 26, sw: 5, color: "var(--color-macro-carbs)", label: "Carbs" },
};

// Only the calorie ring shifts colour with progress — inner macro rings
// stay their solid colour so they read as "which macro is this?".
// The calorie ring uses the shared band ladder so the main ring, the
// week strip, and the calendar mini-rings all agree.
function ringColor(
  macro: MacroKey,
  consumed: number,
  goal: number
): string {
  if (macro !== "calories") return CONFIG[macro].color;
  return caloriesBandColor(consumed, goal);
}

const ORDER: MacroKey[] = ["calories", "protein", "fat", "carbs"];

export function CalorieRing({ calories, protein, fat, carbs }: Props) {
  const buckets: Record<MacroKey, Bucket> = { calories, protein, fat, carbs };
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative flex items-center justify-center w-72 h-72">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full -rotate-90"
          aria-hidden
        >
          {ORDER.map((macro) => {
            const cfg = CONFIG[macro];
            const b = buckets[macro];
            const ratio = b.goal > 0 ? b.consumed / b.goal : 0;
            const visibleRatio = Math.min(ratio, 1);
            const circ = 2 * Math.PI * cfg.r;
            const dash = circ * visibleRatio;
            const color = ringColor(macro, b.consumed, b.goal);

            // Track picks up the CURRENT ring colour (band-based for the
            // calorie ring, static for the macros) so the faded background
            // matches whatever state the ring is in.
            const trackStroke = `color-mix(in oklab, ${color} 15%, transparent)`;
            return (
              <g key={macro}>
                <circle
                  cx="50"
                  cy="50"
                  r={cfg.r}
                  fill="none"
                  stroke={trackStroke}
                  strokeWidth={cfg.sw}
                />
                <circle
                  cx="50"
                  cy="50"
                  r={cfg.r}
                  fill="none"
                  stroke={color}
                  strokeWidth={cfg.sw}
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circ - dash}`}
                  style={{ transition: "stroke-dasharray 400ms ease" }}
                />
              </g>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pointer-events-none">
          <div className="text-4xl font-semibold tabular-nums tracking-tight">
            {Math.round(calories.consumed).toLocaleString()}
          </div>
          <div className="text-xs text-muted mt-1">
            of {calories.goal.toLocaleString()} kcal
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Hide macros" : "Show macros"}
        aria-expanded={open}
        className="mt-1 w-8 h-8 flex items-center justify-center rounded-full text-muted active:bg-[var(--color-track)]"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 180ms",
          }}
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          className="mt-1 w-full max-w-sm p-3"
          style={{ animation: "kcal-macro-in 160ms ease-out" }}
        >
          <style>{`
            @keyframes kcal-macro-in {
              from { opacity: 0; transform: translateY(-4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          {ORDER.map((macro) => {
            const cfg = CONFIG[macro];
            const b = buckets[macro];
            const rem = b.goal - b.consumed;
            const isCalorie = macro === "calories";
            return (
              <div
                key={macro}
                className="flex items-baseline gap-2 py-1.5 text-sm"
              >
                <span
                  className="font-semibold shrink-0"
                  style={{ color: cfg.color, minWidth: "60px" }}
                >
                  {cfg.label}
                </span>
                <span className="flex-1 text-right tabular-nums">
                  {Math.round(b.consumed).toLocaleString()}
                  <span className="text-muted">
                    {" / "}
                    {Math.round(b.goal).toLocaleString()}
                    {isCalorie ? "" : "g"}
                  </span>
                </span>
                <span
                  className="text-xs tabular-nums shrink-0 text-right"
                  style={{
                    color:
                      rem < 0 ? "var(--color-over)" : "var(--color-muted)",
                    minWidth: "60px",
                  }}
                >
                  {rem >= 0
                    ? `${Math.round(rem)} left`
                    : `${Math.round(Math.abs(rem))} over`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
