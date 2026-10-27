import { describe, expect, it } from "vitest";
import { formatDate } from "./dates";

describe("formatDate", () => {
  it("reads a bare yyyy-mm-dd as that local day", () => {
    expect(formatDate("2026-03-01")).toBe("Mar 1, 2026");
  });

  it("formats timestamps and Date objects in local time", () => {
    expect(formatDate(new Date(2026, 1, 28, 23, 30))).toBe("Feb 28, 2026");
    expect(formatDate(new Date(2026, 1, 28, 12).toISOString())).toBe("Feb 28, 2026");
  });
});
