import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPlanState, nextRenewal, subscribe } from "./plans";

const ymd = (d: Date | string) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

describe("nextRenewal", () => {
  it("clamps month-end dates instead of rolling into the next month", () => {
    expect(ymd(nextRenewal(new Date(2026, 0, 31), "monthly"))).toBe("2026-02-28");
    expect(ymd(nextRenewal(new Date(2028, 0, 31), "monthly"))).toBe("2028-02-29");
    expect(ymd(nextRenewal(new Date(2026, 7, 31), "monthly"))).toBe("2026-09-30");
    expect(ymd(nextRenewal(new Date(2026, 4, 15), "monthly"))).toBe("2026-06-15");
  });

  it("clamps Feb 29 for annual plans", () => {
    expect(ymd(nextRenewal(new Date(2028, 1, 29), "annual"))).toBe("2029-02-28");
  });
});

describe("getPlanState auto-renewal", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps the original day of month across catch-up renewals", async () => {
    vi.setSystemTime(new Date(2026, 0, 31, 12));
    await subscribe(1, "advertiser", "premium", "monthly");
    expect(ymd(getPlanState(1, "advertiser").renewsAt!)).toBe("2026-02-28");

    // Months later, the catch-up loop must land on the 31st again, not drift to the 28th.
    vi.setSystemTime(new Date(2026, 4, 1, 12));
    expect(ymd(getPlanState(1, "advertiser").renewsAt!)).toBe("2026-05-31");
  });
});
