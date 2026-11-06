"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  backfillOffFoodNutrition,
  fetchFullUserSettings,
  recommendGoals,
  saveUserSettings,
} from "@/lib/queries";
import {
  ACTIVITY_LABEL,
  ACTIVITY_OPTIONS,
  SEX_OPTIONS,
  WEIGHT_GOAL_LABEL,
  WEIGHT_GOAL_OPTIONS,
  type ActivityLevel,
  type Sex,
  type UserSettings,
  type WeightGoal,
} from "@/lib/types";

function num(v: number | null): string {
  return v == null ? "" : String(v);
}

export default function SettingsPage() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    calories: 2200,
    protein: 120,
    fat: 70,
    carbs: 250,
    weightKg: null,
    heightCm: null,
    age: null,
    sex: null,
    activityLevel: null,
    weightGoal: null,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [backfillState, setBackfillState] = useState<
    { kind: "idle" } | { kind: "running" } | { kind: "done"; msg: string }
  >({ kind: "idle" });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null));
    fetchFullUserSettings().then((s) => {
      setSettings(s);
      setLoaded(true);
    });
  }, []);

  const rec = recommendGoals(settings);
  const recApplied =
    rec !== null &&
    settings.calories === rec.calories &&
    settings.protein === rec.protein &&
    settings.fat === rec.fat &&
    settings.carbs === rec.carbs;

  const patch = (p: Partial<UserSettings>) => {
    setSettings((s) => ({ ...s, ...p }));
    setSaved(false);
  };

  const applyRecommendation = () => {
    if (!rec) return;
    patch({
      calories: rec.calories,
      protein: rec.protein,
      fat: rec.fat,
      carbs: rec.carbs,
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const res = await saveUserSettings(settings);
    setSaving(false);
    if (!res.ok) {
      setError(res.error || "Failed to save");
      return;
    }
    setSaved(true);
  };

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/signin");
    router.refresh();
  };

  const runBackfill = async () => {
    setBackfillState({ kind: "running" });
    const res = await backfillOffFoodNutrition();
    if (!res.ok) {
      setBackfillState({
        kind: "done",
        msg: `Error: ${res.error || "failed"}`,
      });
      return;
    }
    setBackfillState({
      kind: "done",
      msg:
        res.updated === 0
          ? `Scanned ${res.scanned}. Everything already had data.`
          : `Updated ${res.updated} of ${res.scanned} scanned items.`,
    });
  };

  return (
    <div className="mx-auto w-full max-w-md min-h-screen flex flex-col">
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
          Settings
        </div>
      </div>

      {!loaded ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted">
          Loading…
        </div>
      ) : (
        <div className="px-5 pb-8 space-y-6 flex-1">
          <Section title="Daily goals">
            <NumberRow
              label="Calories"
              unit="kcal"
              value={settings.calories}
              onChange={(v) => patch({ calories: v ?? 0 })}
              min={800}
            />
            <NumberRow
              label="Protein"
              unit="g"
              value={settings.protein}
              onChange={(v) => patch({ protein: v ?? 0 })}
              min={0}
            />
            <NumberRow
              label="Fat"
              unit="g"
              value={settings.fat}
              onChange={(v) => patch({ fat: v ?? 0 })}
              min={0}
            />
            <NumberRow
              label="Carbs"
              unit="g"
              value={settings.carbs}
              onChange={(v) => patch({ carbs: v ?? 0 })}
              min={0}
            />
          </Section>

          <div>
            <button
              type="button"
              onClick={() => setProfileOpen((o) => !o)}
              className="w-full flex items-center justify-between px-1 mb-2"
            >
              <span className="text-xs text-muted uppercase tracking-wide">
                Profile
              </span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                style={{
                  transform: profileOpen ? "rotate(180deg)" : "none",
                  transition: "transform 150ms",
                }}
                className="text-muted"
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

            {profileOpen && (
              <div className="bg-card border border-app rounded-2xl divide-y divide-[var(--color-border)] overflow-hidden">
                <NumberRow
                  label="Weight"
                  unit="kg"
                  value={settings.weightKg}
                  onChange={(v) => patch({ weightKg: v })}
                  min={20}
                  step="0.1"
                  placeholder="75"
                />
                <NumberRow
                  label="Height"
                  unit="cm"
                  value={settings.heightCm}
                  onChange={(v) => patch({ heightCm: v })}
                  min={100}
                  placeholder="180"
                />
                <NumberRow
                  label="Age"
                  unit="yr"
                  value={settings.age}
                  onChange={(v) => patch({ age: v })}
                  min={10}
                  placeholder="30"
                />

                <FieldRow label="Sex">
                  <SegmentedControl<Sex>
                    options={SEX_OPTIONS}
                    labels={{ male: "Male", female: "Female" }}
                    value={settings.sex}
                    onChange={(v) => patch({ sex: v })}
                  />
                </FieldRow>

                <FieldRow label="Activity">
                  <SegmentedControl<ActivityLevel>
                    options={ACTIVITY_OPTIONS}
                    labels={ACTIVITY_LABEL}
                    value={settings.activityLevel}
                    onChange={(v) => patch({ activityLevel: v })}
                  />
                </FieldRow>

                <FieldRow label="Goal">
                  <SegmentedControl<WeightGoal>
                    options={WEIGHT_GOAL_OPTIONS}
                    labels={WEIGHT_GOAL_LABEL}
                    value={settings.weightGoal}
                    onChange={(v) => patch({ weightGoal: v })}
                  />
                </FieldRow>
              </div>
            )}
          </div>

          {rec !== null && (
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{
                background:
                  "color-mix(in oklab, var(--color-accent) 10%, transparent)",
                border:
                  "1px solid color-mix(in oklab, var(--color-accent) 30%, transparent)",
              }}
            >
              <div className="text-xs text-muted uppercase tracking-wide">
                Recommended daily targets
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <MacroStat label="kcal" value={rec.calories} />
                <MacroStat label="P" value={rec.protein} unit="g" />
                <MacroStat label="F" value={rec.fat} unit="g" />
                <MacroStat label="C" value={rec.carbs} unit="g" />
              </div>
              <div className="text-xs text-muted">
                Mifflin-St Jeor BMR × activity, tuned for your goal.
              </div>
              <button
                onClick={applyRecommendation}
                disabled={recApplied}
                className="w-full h-10 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "var(--color-accent-strong)" }}
                type="button"
              >
                {recApplied ? "Applied to your goals" : "Use as my goals"}
              </button>
            </div>
          )}

          <div>
            <div className="text-xs text-muted uppercase tracking-wide mb-2 px-1">
              Account
            </div>
            <div className="bg-card border border-app rounded-2xl overflow-hidden">
              <div className="px-3 py-3 flex items-center gap-3">
                <span
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full font-semibold"
                  style={{
                    background: "var(--color-accent)",
                    color: "white",
                  }}
                >
                  {(email?.[0] || "?").toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    {email || "—"}
                  </div>
                  <div className="text-xs text-muted">Signed in</div>
                </div>
              </div>
              <button
                onClick={signOut}
                className="w-full px-3 py-3 text-sm font-medium text-left border-t border-app active:bg-[var(--color-track)]"
                style={{ color: "var(--color-over)" }}
                type="button"
              >
                Sign out
              </button>
            </div>
          </div>

          <div>
            <div className="text-xs text-muted uppercase tracking-wide mb-2 px-1">
              Maintenance
            </div>
            <div className="bg-card border border-app rounded-2xl p-3 space-y-2">
              <div className="text-sm">Refresh nutrition for scanned items</div>
              <div className="text-xs text-muted">
                Refetches missing protein / fat / carbs from Open Food Facts
                for items you added by scanning.
              </div>
              <button
                onClick={runBackfill}
                disabled={backfillState.kind === "running"}
                className="mt-1 h-10 px-3 rounded-lg text-sm font-medium border border-app disabled:opacity-50"
                type="button"
              >
                {backfillState.kind === "running"
                  ? "Refreshing…"
                  : "Refresh now"}
              </button>
              {backfillState.kind === "done" && (
                <div className="text-xs text-muted">{backfillState.msg}</div>
              )}
            </div>
          </div>

          {error && (
            <div className="text-sm" style={{ color: "var(--color-over)" }}>
              {error}
            </div>
          )}

          <div className="sticky bottom-0 -mx-5 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] bg-app border-t border-app">
            <button
              onClick={save}
              disabled={saving}
              className="w-full h-12 rounded-xl font-medium text-white disabled:opacity-50"
              style={{ background: "var(--color-accent-strong)" }}
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- small building blocks ------------------------------------------

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs text-muted uppercase tracking-wide mb-2 px-1">
        {title}
      </div>
      <div className="bg-card border border-app rounded-2xl divide-y divide-[var(--color-border)] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-3 py-3 space-y-1.5">
      <div className="text-xs text-muted font-medium">{label}</div>
      {children}
    </div>
  );
}

function NumberRow({
  label,
  unit,
  value,
  onChange,
  min,
  step,
  placeholder,
}: {
  label: string;
  unit: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  step?: string;
  placeholder?: string;
}) {
  return (
    <div className="px-3 py-2.5 flex items-center gap-3">
      <div className="text-sm font-medium flex-1">{label}</div>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        step={step}
        value={num(value)}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "") onChange(null);
          else {
            const n = Number(v);
            onChange(isNaN(n) ? null : n);
          }
        }}
        placeholder={placeholder}
        className="w-24 h-9 px-2 rounded-lg bg-app border border-app focus:outline-none focus:border-[var(--color-accent)] tabular-nums text-right"
      />
      <div className="text-xs text-muted w-8 text-left">{unit}</div>
    </div>
  );
}

function SegmentedControl<T extends string>({
  options,
  labels,
  value,
  onChange,
}: {
  options: T[];
  labels: Record<T, string>;
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="grid gap-1 p-1 rounded-lg bg-[var(--color-track)]"
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`h-8 rounded-md text-xs font-medium transition ${
            value === o ? "bg-card shadow-sm" : "text-muted"
          }`}
        >
          {labels[o]}
        </button>
      ))}
    </div>
  );
}

function MacroStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit?: string;
}) {
  return (
    <div>
      <div className="text-xl font-semibold tabular-nums leading-tight">
        {value}
        {unit && <span className="text-xs text-muted ml-0.5">{unit}</span>}
      </div>
      <div className="text-[10px] text-muted uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}
