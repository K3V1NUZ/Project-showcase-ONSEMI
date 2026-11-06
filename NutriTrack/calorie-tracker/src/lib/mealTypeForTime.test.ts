import { describe, it, expect } from "vitest";
import { mealTypeForNow } from "./mealTypeForTime";

describe("mealTypeForNow", () => {
  it("returns breakfast at 07:00", () => {
    const morning = new Date(2026, 0, 15, 7, 0);
    expect(mealTypeForNow(morning)).toBe("breakfast");
  });

  it("returns lunch at 13:00", () => {
    const noon = new Date(2026, 0, 15, 13, 0);
    expect(mealTypeForNow(noon)).toBe("lunch");
  });

  it("returns dinner at 20:00", () => {
    const evening = new Date(2026, 0, 15, 20, 0);
    expect(mealTypeForNow(evening)).toBe("dinner");
  });

  it("returns dinner in the small hours (03:00)", () => {
    const lateNight = new Date(2026, 0, 15, 3, 0);
    expect(mealTypeForNow(lateNight)).toBe("dinner");
  });

  it("flips to breakfast exactly at 05:00", () => {
    const dawn = new Date(2026, 0, 15, 5, 0); 
    expect(mealTypeForNow(dawn)).toBe("breakfast");
  });

  it("flips to lunch exactly at 11:00", () => {
    const late = new Date(2026, 0, 15, 11, 0);
    expect(mealTypeForNow(late)).toBe("lunch");
  });

  it("flips to dinner exactly at 16:00", () => {
    const teatime = new Date(2026, 0, 15, 16, 0);
    expect(mealTypeForNow(teatime)).toBe("dinner");
  });
});
