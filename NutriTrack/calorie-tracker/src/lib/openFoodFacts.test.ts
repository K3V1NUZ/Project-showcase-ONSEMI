import { describe, it, expect } from "vitest";
import { normalize, scoreRelevance } from "./openFoodFacts";
import type { RawProduct, OffProduct } from "./openFoodFacts";

// A minimal valid product; individual tests override the fields they care about.
function makeRaw(overrides: Partial<RawProduct> = {}): RawProduct {
  return {
    code: "1234567890123",
    product_name: "Test Yogurt",
    brands: "Test Brand",
    countries_tags: ["en:slovakia"],
    nutriments: {
      "energy-kcal_100g": 100,
      proteins_100g: 5,
      fat_100g: 3,
      carbohydrates_100g: 12,
    },
    ...overrides,
  };
}

describe("normalize", () => {
  it("returns a fully-populated product for a valid input", () => {
    const result = normalize(makeRaw());
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      code: "1234567890123",
      name: "Test Yogurt",
      brand: "Test Brand",
      caloriesPer100g: 100,
      proteinPer100g: 5,
      fatPer100g: 3,
      carbsPer100g: 12,
    });
  });

  it("returns null when product_name is missing", () => {
    const result = normalize(
      makeRaw({ product_name: undefined, product_name_sk: undefined, product_name_en: undefined })
    );
    expect(result).toBeNull();
  });

  it("returns null when nutriments are missing", () => {
    const result = normalize(makeRaw({ nutriments: undefined }));
    expect(result).toBeNull();
  });

  it("returns null when kcal is zero", () => {
    const result = normalize(
      makeRaw({ nutriments: { "energy-kcal_100g": 0 } })
    );
    expect(result).toBeNull();
  });

  it("returns null when kcal is negative", () => {
    const result = normalize(
      makeRaw({ nutriments: { "energy-kcal_100g": -50 } })
    );
    expect(result).toBeNull();
  });

  it("converts kJ to kcal when kcal is missing", () => {
    const result = normalize(
      makeRaw({ nutriments: { "energy-kj_100g": 418.4 } })
    );
    // 418.4 kJ / 4.184 = 100 kcal
    expect(result?.caloriesPer100g).toBe(100);
  });

  it("prefers the Slovak name when present", () => {
    const result = normalize(
      makeRaw({
        product_name: "English default",
        product_name_sk: "Slovenský názov",
        product_name_en: "English explicit",
      })
    );
    expect(result?.name).toBe("Slovenský názov");
  });

  it("falls back to English when default and Slovak are missing", () => {
    const result = normalize(
      makeRaw({
        product_name: undefined,
        product_name_sk: undefined,
        product_name_en: "English only",
      })
    );
    expect(result?.name).toBe("English only");
  });

  it("takes the first brand from a comma-separated string", () => {
    const result = normalize(makeRaw({ brands: "Brand A, Brand B, Brand C" }));
    expect(result?.brand).toBe("Brand A");
  });

  it("takes the first brand from an array", () => {
    const result = normalize(makeRaw({ brands: ["Brand A", "Brand B"] }));
    expect(result?.brand).toBe("Brand A");
  });

  it("returns null brand when brands is missing", () => {
    const result = normalize(makeRaw({ brands: undefined }));
    expect(result?.brand).toBeNull();
  });

  it("defaults missing macros to zero", () => {
    const result = normalize(
      makeRaw({
        nutriments: { "energy-kcal_100g": 100 },
      })
    );
    expect(result?.proteinPer100g).toBe(0);
    expect(result?.fatPer100g).toBe(0);
    expect(result?.carbsPer100g).toBe(0);
  });

  it("prefers the thumbnail image when multiple sizes are available", () => {
    const result = normalize(
      makeRaw({
        image_thumb_url: "thumb.jpg",
        image_small_url: "small.jpg",
        image_url: "full.jpg",
      })
    );
    expect(result?.imageUrl).toBe("thumb.jpg");
  });

  it("falls back to the full image url when smaller sizes are absent", () => {
    const result = normalize(makeRaw({ image_url: "full.jpg" }));
    expect(result?.imageUrl).toBe("full.jpg");
  });

  it("rounds the calorie value to a whole number", () => {
    const result = normalize(
      makeRaw({ nutriments: { "energy-kcal_100g": 87.6 } })
    );
    expect(result?.caloriesPer100g).toBe(88);
  });
});

// A helper to build a normalized product for scoreRelevance tests.
function makeOff(overrides: Partial<OffProduct> = {}): OffProduct {
  return {
    code: "1",
    name: "Milk",
    englishName: null,
    brand: null,
    imageUrl: null,
    countries: [],
    caloriesPer100g: 50,
    proteinPer100g: 3,
    fatPer100g: 2,
    carbsPer100g: 5,
    ...overrides,
  };
}

describe("scoreRelevance", () => {
  it("returns 0 for an empty query", () => {
    expect(scoreRelevance(makeOff({ name: "Milk" }), "")).toBe(0);
  });

  it("returns 0 when the query does not appear in name or brand", () => {
    expect(scoreRelevance(makeOff({ name: "Milk" }), "banana")).toBe(0);
  });

  it("scores higher when the name starts with the query", () => {
    const startsWith = scoreRelevance(makeOff({ name: "Milk chocolate" }), "milk");
    const contains = scoreRelevance(makeOff({ name: "Dark milk chocolate" }), "milk");
    expect(startsWith).toBeGreaterThan(contains);
  });

  it("adds the Slovakia country boost", () => {
    const withBoost = scoreRelevance(
      makeOff({ name: "Milk", countries: ["en:slovakia"] }),
      "milk"
    );
    const noBoost = scoreRelevance(
      makeOff({ name: "Milk", countries: [] }),
      "milk"
    );
    expect(withBoost).toBe(noBoost + 10);
  });

  it("takes the highest single country boost, not the sum", () => {
    const result = scoreRelevance(
      makeOff({
        name: "Milk",
        countries: ["en:slovakia", "en:germany", "en:austria"],
      }),
      "milk"
    );
    const withoutCountries = scoreRelevance(
      makeOff({ name: "Milk", countries: [] }),
      "milk"
    );
    expect(result).toBe(withoutCountries + 10);
  });
});
