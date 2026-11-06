export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

export type MealEntry = {
  id: string;
  mealType: MealType;
  foodName: string;
  brand?: string;
  grams: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

export type DailyGoal = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

export type Sex = "male" | "female";
export const SEX_OPTIONS: Sex[] = ["male", "female"];

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active";
export const ACTIVITY_OPTIONS: ActivityLevel[] = [
  "sedentary",
  "light",
  "moderate",
  "active",
];
export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: "Sedentary",
  light: "Light",
  moderate: "Moderate",
  active: "Active",
};

export type WeightGoal = "lose" | "maintain" | "gain";
export const WEIGHT_GOAL_OPTIONS: WeightGoal[] = ["lose", "maintain", "gain"];
export const WEIGHT_GOAL_LABEL: Record<WeightGoal, string> = {
  lose: "Lose",
  maintain: "Maintain",
  gain: "Gain",
};

// Profile fields used for BMR / TDEE / calorie recommendation. All optional
// so a user can save partial info without breaking anything.
export type UserProfile = {
  weightKg: number | null;
  heightCm: number | null;
  age: number | null;
  sex: Sex | null;
  activityLevel: ActivityLevel | null;
  weightGoal: WeightGoal | null;
};

export type UserSettings = DailyGoal & UserProfile;

// A user-defined meal (recipe) summary for list views.
export type MealSummary = {
  id: string;
  name: string;
  componentCount: number;
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
};

// Full meal detail with each component food.
export type MealComponentDetail = {
  id: string;
  foodId: string;
  foodName: string;
  brand: string | null;
  imageUrl: string | null;
  grams: number;
  calories: number;
  caloriesPer100g: number;
};

export type MealDetail = MealSummary & {
  components: MealComponentDetail[];
};

// Deduplicated past-used food entry for /add > Recent list.
export type RecentFood = {
  foodId: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
  lastUsedAt: string;
  lastGrams: number;
  useCount: number;
};
