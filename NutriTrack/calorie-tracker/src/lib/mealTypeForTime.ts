import type { MealType } from "./types";

// Pick a sensible meal type based on wall-clock time. Ranges are calibrated
// for typical Central-European eating patterns — breakfast / lunch / dinner
// only, no snack fallback (scanner UX target).
export function mealTypeForNow(now: Date = new Date()): MealType {
  const h = now.getHours();
  if (h >= 5 && h < 11) return "breakfast";
  if (h >= 11 && h < 16) return "lunch";
  return "dinner";
}
