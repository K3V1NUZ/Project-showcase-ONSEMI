import { createClient } from "@/lib/supabase/client";
import type {
  ActivityLevel,
  DailyGoal,
  MealDetail,
  MealEntry,
  MealSummary,
  MealType,
  RecentFood,
  Sex,
  UserProfile,
  UserSettings,
  WeightGoal,
} from "./types";
import { toISODate } from "./dateHelpers";

// ---------- Meal entries (the daily log) --------------------------------

type EntryRow = {
  id: string;
  entry_date: string;
  meal_type: MealType;
  grams: number;
  foods: {
    id: string;
    slovak_name: string;
    english_name: string | null;
    brand: string | null;
    image_url: string | null;
    calories_per_100g: number;
    protein_per_100g: number;
    fat_per_100g: number;
    carbs_per_100g: number;
  } | null;
};

function toMealEntry(row: EntryRow): MealEntry | null {
  if (!row.foods) return null;
  const factor = row.grams / 100;
  return {
    id: row.id,
    mealType: row.meal_type,
    // Always display the Slovak name (falls back to English if a row
    // somehow ended up with only english_name populated).
    foodName: row.foods.slovak_name || row.foods.english_name || "",
    brand: row.foods.brand ?? undefined,
    grams: row.grams,
    calories: Math.round(row.foods.calories_per_100g * factor),
    protein: Math.round(row.foods.protein_per_100g * factor),
    fat: Math.round(row.foods.fat_per_100g * factor),
    carbs: Math.round(row.foods.carbs_per_100g * factor),
  };
}

const ENTRY_SELECT = `
  id,
  entry_date,
  meal_type,
  grams,
  created_at,
  foods (
    id,
    slovak_name,
    english_name,
    brand,
    image_url,
    calories_per_100g,
    protein_per_100g,
    fat_per_100g,
    carbs_per_100g
  )
`;

export async function fetchEntriesForDate(date: Date): Promise<MealEntry[]> {
  const supabase = createClient();
  const iso = toISODate(date);
  const { data, error } = await supabase
    .from("meal_entries")
    .select(ENTRY_SELECT)
    .eq("entry_date", iso)
    .order("created_at", { ascending: true });

  if (error) {
    // Supabase errors don't stringify well by default — expand fields so
    // the console actually shows the message/code/details.
    console.error("fetchEntriesForDate failed:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }
  return ((data as unknown as EntryRow[]) || [])
    .map(toMealEntry)
    .filter((e): e is MealEntry => e !== null);
}

// Aggregate calorie totals per day for an arbitrary [start, end) range.
// Returned map key is the ISO date string (YYYY-MM-DD).
export async function fetchCalorieTotalsForRange(
  start: Date,
  end: Date
): Promise<Record<string, number>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meal_entries")
    .select(ENTRY_SELECT)
    .gte("entry_date", toISODate(start))
    .lt("entry_date", toISODate(end));

  if (error) {
    console.error("fetchCalorieTotalsForRange failed:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return {};
  }
  if (!data) return {};
  const totals: Record<string, number> = {};
  for (const row of data as unknown as EntryRow[]) {
    if (!row.foods) continue;
    const cals = (row.foods.calories_per_100g * row.grams) / 100;
    totals[row.entry_date] = (totals[row.entry_date] || 0) + cals;
  }
  return totals;
}

export async function fetchMonthlyCalorieTotals(
  monthAnchor: Date
): Promise<Record<string, number>> {
  const supabase = createClient();
  const start = new Date(
    monthAnchor.getFullYear(),
    monthAnchor.getMonth(),
    1
  );
  const end = new Date(
    monthAnchor.getFullYear(),
    monthAnchor.getMonth() + 1,
    1
  );

  const { data, error } = await supabase
    .from("meal_entries")
    .select(ENTRY_SELECT)
    .gte("entry_date", toISODate(start))
    .lt("entry_date", toISODate(end));

  if (error) {
    console.error("fetchMonthlyCalorieTotals", error);
    return {};
  }

  const totals: Record<string, number> = {};
  for (const row of (data as unknown as EntryRow[]) || []) {
    if (!row.foods) continue;
    const cals = (row.foods.calories_per_100g * row.grams) / 100;
    totals[row.entry_date] = (totals[row.entry_date] || 0) + cals;
  }
  return totals;
}

// ---------- Settings ----------------------------------------------------

const DEFAULT_SETTINGS: UserSettings = {
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
};

export async function fetchUserSettings(): Promise<DailyGoal> {
  const supabase = createClient();
  let res = await supabase
    .from("user_settings")
    .select("calorie_goal, protein_goal, fat_goal, carbs_goal")
    .maybeSingle();

  // Pre-migration-005 schema — retry without carbs_goal.
  if (res.error && /carbs_goal/i.test(res.error.message || "")) {
    res = (await supabase
      .from("user_settings")
      .select("calorie_goal, protein_goal, fat_goal")
      .maybeSingle()) as typeof res;
  }

  if (res.error || !res.data) {
    return { calories: 2200, protein: 120, fat: 70, carbs: 250 };
  }
  const d = res.data as unknown as Record<string, number | null>;
  return {
    calories: d.calorie_goal ?? 2200,
    protein: d.protein_goal ?? 120,
    fat: d.fat_goal ?? 70,
    carbs: d.carbs_goal ?? 250,
  };
}

// Full settings (goals + profile). Falls back gracefully if optional columns
// aren't there yet (migrations 004 or 005 not run).
export async function fetchFullUserSettings(): Promise<UserSettings> {
  const supabase = createClient();
  const cols =
    "calorie_goal, protein_goal, fat_goal, carbs_goal, weight_kg, height_cm, age, sex, activity_level, weight_goal";
  let res = await supabase.from("user_settings").select(cols).maybeSingle();

  if (res.error && /carbs_goal/i.test(res.error.message || "")) {
    res = (await supabase
      .from("user_settings")
      .select(
        "calorie_goal, protein_goal, fat_goal, weight_kg, height_cm, age, sex, activity_level, weight_goal"
      )
      .maybeSingle()) as typeof res;
  }
  if (
    res.error &&
    /(weight_kg|height_cm|weight_goal|activity_level)/.test(res.error.message || "")
  ) {
    res = (await supabase
      .from("user_settings")
      .select("calorie_goal, protein_goal, fat_goal")
      .maybeSingle()) as typeof res;
  }

  if (res.error || !res.data) return DEFAULT_SETTINGS;
  const d = res.data as unknown as Record<string, unknown>;
  return {
    calories: (d.calorie_goal as number) ?? DEFAULT_SETTINGS.calories,
    protein: (d.protein_goal as number) ?? DEFAULT_SETTINGS.protein,
    fat: (d.fat_goal as number) ?? DEFAULT_SETTINGS.fat,
    carbs: (d.carbs_goal as number) ?? DEFAULT_SETTINGS.carbs,
    weightKg: (d.weight_kg as number) ?? null,
    heightCm: (d.height_cm as number) ?? null,
    age: (d.age as number) ?? null,
    sex: (d.sex as Sex) ?? null,
    activityLevel: (d.activity_level as ActivityLevel) ?? null,
    weightGoal: (d.weight_goal as WeightGoal) ?? null,
  };
}

// Save full settings. Progressively drops columns not yet in the schema
// so the save succeeds even if migrations 004/005 haven't been applied.
export async function saveUserSettings(
  settings: UserSettings
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Not signed in" };

  const base = {
    user_id: userData.user.id,
    calorie_goal: settings.calories,
    protein_goal: settings.protein,
    fat_goal: settings.fat,
  };
  const withCarbs = {
    ...base,
    carbs_goal: settings.carbs,
  };
  const full = {
    ...withCarbs,
    weight_kg: settings.weightKg,
    height_cm: settings.heightCm,
    age: settings.age,
    sex: settings.sex,
    activity_level: settings.activityLevel,
    weight_goal: settings.weightGoal,
  };

  let result = await supabase
    .from("user_settings")
    .upsert(full, { onConflict: "user_id" });

  if (
    result.error &&
    /(weight_kg|height_cm|weight_goal|activity_level)/.test(
      result.error.message || ""
    )
  ) {
    result = await supabase
      .from("user_settings")
      .upsert(withCarbs, { onConflict: "user_id" });
  }
  if (result.error && /carbs_goal/i.test(result.error.message || "")) {
    result = await supabase
      .from("user_settings")
      .upsert(base, { onConflict: "user_id" });
  }

  if (result.error) return { ok: false, error: result.error.message };
  return { ok: true };
}

// Mifflin-St Jeor BMR × activity × goal → recommended calories + macros.
// Protein scales with body weight and goal; fat is a fixed % of calories;
// carbs are whatever calories are left over; fiber follows the 14g/1000kcal
// USDA guideline. Returns null when any input is missing.
export function recommendGoals(p: UserProfile): DailyGoal | null {
  if (
    p.weightKg == null ||
    p.heightCm == null ||
    p.age == null ||
    p.sex == null ||
    p.activityLevel == null ||
    p.weightGoal == null
  )
    return null;
  const bmr =
    p.sex === "male"
      ? 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + 5
      : 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age - 161;
  const activity: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
  };
  const goalAdj: Record<WeightGoal, number> = {
    lose: -500,
    maintain: 0,
    gain: 300,
  };
  const proteinPerKg: Record<WeightGoal, number> = {
    lose: 2.0, // higher protein preserves muscle during a cut
    maintain: 1.6,
    gain: 1.8,
  };

  const calories = Math.max(
    800,
    Math.round(bmr * activity[p.activityLevel] + goalAdj[p.weightGoal])
  );
  const protein = Math.round(p.weightKg * proteinPerKg[p.weightGoal]);
  const fat = Math.round((calories * 0.3) / 9);
  const carbs = Math.max(
    0,
    Math.round((calories - protein * 4 - fat * 9) / 4)
  );
  return { calories, protein, fat, carbs };
}

// Legacy alias — settings page still imports the old name for backward
// compat during this transition. Remove when nothing else references it.
export function recommendCalories(p: UserProfile): number | null {
  const g = recommendGoals(p);
  return g?.calories ?? null;
}

// ---------- Food (foods table isn't exposed schema-wide) ---------------

export type FoodDetails = {
  name: string; // Slovak display name (goes to foods.slovak_name)
  englishName?: string; // optional English alias (goes to foods.english_name)
  brand?: string;
  barcode?: string;
  imageUrl?: string;
  caloriesPer100g: number;
  proteinPer100g?: number;
  fatPer100g?: number;
  carbsPer100g?: number;
  source: "custom" | "off";
};

type AuthedUser = { id: string; email: string | null };

// Insert a food, return its new id. Tries to stamp created_by_email
// (populated from the signed-in user's email); if that column isn't there
// yet (migration 003 not run, or Supabase schema cache still stale), the
// row still saves without it.
async function insertFood(
  user: AuthedUser,
  food: FoodDetails
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();

  const base = {
    created_by: user.id,
    slovak_name: food.name,
    english_name: food.englishName || null,
    brand: food.brand || null,
    barcode: food.barcode || null,
    image_url: food.imageUrl || null,
    calories_per_100g: food.caloriesPer100g,
    protein_per_100g: food.proteinPer100g ?? 0,
    fat_per_100g: food.fatPer100g ?? 0,
    carbs_per_100g: food.carbsPer100g ?? 0,
    source: food.source,
  };

  let result = await supabase
    .from("foods")
    .insert({ ...base, created_by_email: user.email })
    .select("id")
    .single();

  if (
    result.error &&
    /created_by_email/i.test(result.error.message || "")
  ) {
    result = await supabase.from("foods").insert(base).select("id").single();
  }

  if (result.error || !result.data) {
    return {
      ok: false,
      error: result.error?.message || "Failed to save food",
    };
  }
  return { ok: true, id: result.data.id };
}

export type NewEntryInput = {
  date: Date;
  mealType: MealType;
  grams: number;
  food: FoodDetails;
};

export async function createEntry(input: NewEntryInput): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Not signed in" };
  const user: AuthedUser = {
    id: userData.user.id,
    email: userData.user.email ?? null,
  };

  const foodRes = await insertFood(user, input.food);
  if (!foodRes.ok || !foodRes.id) {
    return { ok: false, error: foodRes.error };
  }

  const { error: entryErr } = await supabase.from("meal_entries").insert({
    user_id: user.id,
    entry_date: toISODate(input.date),
    meal_type: input.mealType,
    food_id: foodRes.id,
    grams: input.grams,
  });
  if (entryErr) return { ok: false, error: entryErr.message };
  return { ok: true };
}

// Re-log an existing food (from Recent) — reuses the food row, no duplicate.
export async function createEntryFromExistingFood(input: {
  foodId: string;
  date: Date;
  mealType: MealType;
  grams: number;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("meal_entries").insert({
    user_id: user.user.id,
    entry_date: toISODate(input.date),
    meal_type: input.mealType,
    food_id: input.foodId,
    grams: input.grams,
  });
  return { ok: !error, error: error?.message };
}

export async function deleteEntry(entryId: string): Promise<{ ok: boolean }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("meal_entries")
    .delete()
    .eq("id", entryId);
  return { ok: !error };
}

// Update an already-logged entry's grams and/or meal type. Doesn't touch
// the underlying food row (name / brand / macros stay the same).
export async function updateEntry(
  entryId: string,
  updates: { grams?: number; mealType?: MealType }
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (updates.grams !== undefined) patch.grams = updates.grams;
  if (updates.mealType !== undefined) patch.meal_type = updates.mealType;
  if (Object.keys(patch).length === 0) return { ok: true };
  const { error } = await supabase
    .from("meal_entries")
    .update(patch)
    .eq("id", entryId);
  return { ok: !error, error: error?.message };
}

// ---------- Own-foods search by name/brand -----------------------------

export type OwnFoodMatch = {
  foodId: string;
  name: string; // Slovak-first display name
  englishName: string | null;
  brand: string | null;
  imageUrl: string | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
};

// Returns this user's foods where the query matches slovak_name OR
// english_name OR brand. Only the Slovak name is surfaced to the UI.
export async function fetchOwnFoodsMatching(
  query: string,
  limit = 8
): Promise<OwnFoodMatch[]> {
  const supabase = createClient();
  const q = query.trim();
  if (q.length < 2) return [];

  const like = `%${q.replace(/[%_]/g, "\\$&")}%`;
  const res = await supabase
    .from("foods")
    .select(
      "id, slovak_name, english_name, brand, image_url, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g"
    )
    .or(
      `slovak_name.ilike.${like},english_name.ilike.${like},brand.ilike.${like}`
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (res.error || !res.data) return [];
  return (res.data as unknown as Record<string, unknown>[]).map((d) => ({
    foodId: d.id as string,
    name:
      ((d.slovak_name as string) ||
        (d.english_name as string) ||
        "") ?? "",
    englishName: (d.english_name as string) ?? null,
    brand: (d.brand as string) ?? null,
    imageUrl: (d.image_url as string) ?? null,
    caloriesPer100g: d.calories_per_100g as number,
    proteinPer100g: d.protein_per_100g as number,
    fatPer100g: d.fat_per_100g as number,
    carbsPer100g: d.carbs_per_100g as number,
  }));
}

// ---------- Own-foods lookup by barcode --------------------------------

// Returns the most recently added food row this user has with the given
// barcode. Preferred over OFF lookup so previously-corrected products
// (better name, right macros, etc.) come back verbatim next time.
export async function fetchOwnFoodByBarcode(barcode: string): Promise<{
  foodId: string;
  name: string;
  englishName: string | null;
  brand: string | null;
  imageUrl: string | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
} | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("foods")
    .select(
      "id, slovak_name, english_name, brand, image_url, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g"
    )
    .eq("barcode", barcode)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    foodId: data.id,
    name: data.slovak_name || data.english_name || "",
    englishName: data.english_name,
    brand: data.brand,
    imageUrl: data.image_url,
    caloriesPer100g: data.calories_per_100g,
    proteinPer100g: data.protein_per_100g,
    fatPer100g: data.fat_per_100g,
    carbsPer100g: data.carbs_per_100g,
  };
}

// ---------- Recent foods (past-used, deduped) --------------------------

export async function fetchRecentFoods(limit = 40): Promise<RecentFood[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meal_entries")
    .select(ENTRY_SELECT)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) return [];

  const byFood = new Map<string, RecentFood>();
  for (const row of data as unknown as EntryRow[]) {
    if (!row.foods) continue;
    const existing = byFood.get(row.foods.id);
    if (existing) {
      existing.useCount += 1;
      continue;
    }
    byFood.set(row.foods.id, {
      foodId: row.foods.id,
      name: row.foods.slovak_name || row.foods.english_name || "",
      brand: row.foods.brand,
      imageUrl: row.foods.image_url,
      caloriesPer100g: row.foods.calories_per_100g,
      proteinPer100g: row.foods.protein_per_100g,
      fatPer100g: row.foods.fat_per_100g,
      carbsPer100g: row.foods.carbs_per_100g,
      lastUsedAt: row.entry_date,
      lastGrams: row.grams,
      useCount: 1,
    });
  }
  return Array.from(byFood.values()).slice(0, limit);
}

// ---------- Meals -------------------------------------------------------

type MealRow = {
  id: string;
  name: string;
  meal_components:
    | {
        id: string;
        grams: number;
        sort_order: number;
        foods: {
          id: string;
          slovak_name: string;
          english_name: string | null;
          brand: string | null;
          image_url: string | null;
          calories_per_100g: number;
          protein_per_100g: number;
          fat_per_100g: number;
        } | null;
      }[]
    | null;
};

const MEAL_SELECT = `
  id,
  name,
  created_at,
  meal_components (
    id,
    grams,
    sort_order,
    foods (
      id,
      slovak_name,
      english_name,
      brand,
      image_url,
      calories_per_100g,
      protein_per_100g,
      fat_per_100g
    )
  )
`;

function summarize(row: MealRow): MealSummary {
  let cal = 0,
    pro = 0,
    fat = 0,
    n = 0;
  for (const c of row.meal_components || []) {
    if (!c.foods) continue;
    const f = c.grams / 100;
    cal += c.foods.calories_per_100g * f;
    pro += c.foods.protein_per_100g * f;
    fat += c.foods.fat_per_100g * f;
    n += 1;
  }
  return {
    id: row.id,
    name: row.name,
    componentCount: n,
    totalCalories: Math.round(cal),
    totalProtein: Math.round(pro),
    totalFat: Math.round(fat),
  };
}

export async function fetchMeals(): Promise<MealSummary[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meals")
    .select(MEAL_SELECT)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as unknown as MealRow[]).map(summarize);
}

export async function fetchMealDetail(id: string): Promise<MealDetail | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meals")
    .select(MEAL_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as MealRow;
  const summary = summarize(row);
  const components = (row.meal_components || [])
    .filter((c) => c.foods !== null)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => {
      const f = c.foods!;
      return {
        id: c.id,
        foodId: f.id,
        foodName: f.slovak_name || f.english_name || "",
        brand: f.brand,
        imageUrl: f.image_url,
        grams: c.grams,
        calories: Math.round((f.calories_per_100g * c.grams) / 100),
        caloriesPer100g: f.calories_per_100g,
      };
    });
  return { ...summary, components };
}

export type NewMealInput = {
  name: string;
  components: {
    // Either an existing food id (from Recent) OR a food to create.
    existingFoodId?: string;
    newFood?: FoodDetails;
    grams: number;
  }[];
};

export async function createMeal(
  input: NewMealInput
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Not signed in" };
  const user: AuthedUser = {
    id: userData.user.id,
    email: userData.user.email ?? null,
  };
  if (!input.name.trim()) return { ok: false, error: "Meal name required" };
  if (input.components.length === 0)
    return { ok: false, error: "Add at least one ingredient" };

  const { data: meal, error: mealErr } = await supabase
    .from("meals")
    .insert({ created_by: user.id, name: input.name.trim() })
    .select("id")
    .single();
  if (mealErr || !meal) {
    return { ok: false, error: mealErr?.message || "Failed to create meal" };
  }

  // Resolve each component's food_id, creating a food row if needed.
  const componentInserts: {
    meal_id: string;
    food_id: string;
    grams: number;
    sort_order: number;
  }[] = [];

  for (let i = 0; i < input.components.length; i++) {
    const c = input.components[i];
    let foodId = c.existingFoodId;
    if (!foodId && c.newFood) {
      const res = await insertFood(user, c.newFood);
      if (!res.ok || !res.id) {
        // Best-effort rollback: delete the empty meal
        await supabase.from("meals").delete().eq("id", meal.id);
        return { ok: false, error: res.error };
      }
      foodId = res.id;
    }
    if (!foodId) continue;
    componentInserts.push({
      meal_id: meal.id,
      food_id: foodId,
      grams: c.grams,
      sort_order: i,
    });
  }

  if (componentInserts.length === 0) {
    await supabase.from("meals").delete().eq("id", meal.id);
    return { ok: false, error: "No valid components" };
  }

  const { error: compErr } = await supabase
    .from("meal_components")
    .insert(componentInserts);
  if (compErr) {
    await supabase.from("meals").delete().eq("id", meal.id);
    return { ok: false, error: compErr.message };
  }

  return { ok: true, id: meal.id };
}

export async function deleteMeal(id: string): Promise<{ ok: boolean }> {
  const supabase = createClient();
  const { error } = await supabase.from("meals").delete().eq("id", id);
  return { ok: !error };
}

// ---------- Backfill: pull fresh nutrition for barcoded foods --------

// Finds this user's foods where source='off' has a barcode, and refetches
// from OFF to fill in any missing macros/fiber. Returns count updated so
// the settings page can show progress.
export async function backfillOffFoodNutrition(): Promise<{
  ok: boolean;
  scanned: number;
  updated: number;
  error?: string;
}> {
  const { fetchOffByBarcode } = await import("./openFoodFacts");
  const supabase = createClient();

  const res = await supabase
    .from("foods")
    .select("id, barcode, protein_per_100g, fat_per_100g, carbs_per_100g")
    .eq("source", "off")
    .not("barcode", "is", null);

  if (res.error)
    return { ok: false, scanned: 0, updated: 0, error: res.error.message };

  const foods = (res.data || []) as unknown as Record<string, unknown>[];
  let updated = 0;

  for (const f of foods) {
    const barcode = f.barcode as string | null;
    if (!barcode) continue;
    const off = await fetchOffByBarcode(barcode).catch(() => null);
    if (!off) continue;

    const patch: Record<string, number> = {};
    if ((f.protein_per_100g as number) === 0 && off.proteinPer100g > 0)
      patch.protein_per_100g = off.proteinPer100g;
    if ((f.fat_per_100g as number) === 0 && off.fatPer100g > 0)
      patch.fat_per_100g = off.fatPer100g;
    if ((f.carbs_per_100g as number) === 0 && off.carbsPer100g > 0)
      patch.carbs_per_100g = off.carbsPer100g;

    if (Object.keys(patch).length === 0) continue;

    const upd = await supabase.from("foods").update(patch).eq("id", f.id);
    if (!upd.error) updated++;
  }

  return { ok: true, scanned: foods.length, updated };
}

// Log a meal into a specific date + meal_type: expands into N meal_entries.
export async function logMeal(
  mealId: string,
  date: Date,
  mealType: MealType
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false, error: "Not signed in" };

  const detail = await fetchMealDetail(mealId);
  if (!detail || detail.components.length === 0) {
    return { ok: false, error: "Meal has no ingredients" };
  }

  const rows = detail.components.map((c) => ({
    user_id: user.user!.id,
    entry_date: toISODate(date),
    meal_type: mealType,
    food_id: c.foodId,
    grams: c.grams,
  }));
  const { error } = await supabase.from("meal_entries").insert(rows);
  return { ok: !error, error: error?.message };
}
