import { describe, it, expect } from "vitest";
import {
  addDays,
  addMonths,
  isSameDay,
  startOfMonth,
  startOfWeekMonday,
  toISODate,
  fromISODate,
} from "./dateHelpers";

describe("addDays", () => {
  it("adds positive days within a month", () => {
    const result = addDays(new Date(2026, 0, 10), 5);
    expect(result).toEqual(new Date(2026, 0, 15));
  });

  it("rolls into the next month", () => {
    const result = addDays(new Date(2026, 0, 30), 5);
    expect(result).toEqual(new Date(2026, 1, 4));
  });

  it("handles negative days", () => {
    const result = addDays(new Date(2026, 0, 5), -10);
    expect(result).toEqual(new Date(2025, 11, 26));
  });

  it("does not mutate the input", () => {
    const input = new Date(2026, 0, 10);
    addDays(input, 5);
    expect(input).toEqual(new Date(2026, 0, 10));
  });
});

describe("addMonths", () => {
  it("adds within the same year", () => {
    const result = addMonths(new Date(2026, 2, 15), 3);
    expect(result).toEqual(new Date(2026, 5, 15));
  });

  it("rolls into the next year", () => {
    const result = addMonths(new Date(2026, 10, 15), 3);
    expect(result).toEqual(new Date(2027, 1, 15));
  });

  it("handles negative months", () => {
    const result = addMonths(new Date(2026, 1, 15), -3);
    expect(result).toEqual(new Date(2025, 10, 15));
  });
});

describe("isSameDay", () => {
  it("returns true for the same date at different times", () => {
    const morning = new Date(2026, 5, 10, 8, 0);
    const evening = new Date(2026, 5, 10, 22, 30);
    expect(isSameDay(morning, evening)).toBe(true);
  });

  it("returns false for consecutive days", () => {
    const a = new Date(2026, 5, 10, 23, 59);
    const b = new Date(2026, 5, 11, 0, 1);
    expect(isSameDay(a, b)).toBe(false);
  });
});

describe("startOfMonth", () => {
  it("returns the first day of the month at midnight", () => {
    const result = startOfMonth(new Date(2026, 5, 17, 14, 30));
    expect(result).toEqual(new Date(2026, 5, 1));
  });
});

describe("startOfWeekMonday", () => {
  it("returns the same day when given a Monday", () => {
    // 2026-06-15 is a Monday
    const monday = new Date(2026, 5, 15, 14, 0);
    expect(startOfWeekMonday(monday)).toEqual(new Date(2026, 5, 15));
  });

  it("returns the Monday earlier in the week when given a Wednesday", () => {
    // 2026-06-17 is a Wednesday
    const wednesday = new Date(2026, 5, 17);
    expect(startOfWeekMonday(wednesday)).toEqual(new Date(2026, 5, 15));
  });

  it("returns the previous Monday when given a Sunday", () => {
    // 2026-06-21 is a Sunday
    const sunday = new Date(2026, 5, 21);
    expect(startOfWeekMonday(sunday)).toEqual(new Date(2026, 5, 15));
  });

  it("resets the time to midnight", () => {
    const monday = new Date(2026, 5, 15, 23, 45);
    expect(startOfWeekMonday(monday).getHours()).toBe(0);
    expect(startOfWeekMonday(monday).getMinutes()).toBe(0);
  });
});

describe("toISODate", () => {
  it("pads single-digit months and days with a leading zero", () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("formats a mid-year date correctly", () => {
    expect(toISODate(new Date(2026, 10, 25))).toBe("2026-11-25");
  });
});

describe("fromISODate", () => {
  it("parses a valid ISO date", () => {
    expect(fromISODate("2026-03-15")).toEqual(new Date(2026, 2, 15));
  });

  it("returns null for a bogus string", () => {
    expect(fromISODate("not a date")).toBeNull();
  });

  it("returns null for a wrong-shape string", () => {
    expect(fromISODate("2026-3-15")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(fromISODate("")).toBeNull();
  });

  it("round-trips with toISODate", () => {
    const original = new Date(2026, 6, 4);
    const parsed = fromISODate(toISODate(original));
    expect(parsed).toEqual(original);
  });
});
