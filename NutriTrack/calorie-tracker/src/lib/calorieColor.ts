// Single source of truth for the calorie-progress colour ladder, so
// the main ring, the week strip pills, and the calendar cells all
// agree on what "on target" vs "warn" vs "over" looks like.
//
// Thresholds are absolute kcal on the low side (a diet is a diet — 300 kcal
// is severely under regardless of anyone's goal) and goal-relative on the
// high side (over-eating scales with the target).

export const RED_LOW = 700;
export const YELLOW_LOW = 1400;
export const YELLOW_HIGH_OFFSET = 100;
export const RED_HIGH_OFFSET = 300;

export function caloriesBandColor(
  total: number,
  goal: number
): string {
  if (total <= 0)
    return "color-mix(in oklab, var(--color-muted) 55%, transparent)";
  if (total < RED_LOW) return "var(--color-over)";
  if (total < YELLOW_LOW) return "var(--color-warn)";
  if (total <= goal + YELLOW_HIGH_OFFSET) return "var(--color-accent)";
  if (total <= goal + RED_HIGH_OFFSET) return "var(--color-warn)";
  return "var(--color-over)";
}
