import { describe, expect, it } from "vitest";
import { isVisibleScreen, limitMessage, screenStatus, screensLeft, type BroadcasterScreen } from "./screenAllowance";

const screen = (over: Partial<BroadcasterScreen> = {}): BroadcasterScreen => ({
  id: 1,
  space_id: 1,
  label: "Lobby",
  is_active: true,
  deactivated_reason: null,
  created_at: "2026-11-16T00:00:00Z",
  is_default: false,
  space: { id: 1, name: "Space", is_active: true },
  ...over,
});

describe("screensLeft", () => {
  it("is the allowance minus running screens", () => {
    expect(screensLeft({ allowance: 10, active_count: 3 })).toBe(7);
  });

  it("is never negative", () => {
    expect(screensLeft({ allowance: 1, active_count: 4 })).toBe(0);
  });
});

describe("isVisibleScreen", () => {
  it("shows all screens", () => {
    expect(isVisibleScreen(screen({ is_active: false, deactivated_reason: "broadcaster" }))).toBe(true);
    expect(isVisibleScreen(screen({ is_active: false, deactivated_reason: "allowance" }))).toBe(true);
    expect(isVisibleScreen(screen({ is_active: false, deactivated_reason: "space" }))).toBe(true);
  });
});

describe("screenStatus", () => {
  it("marks the default", () => {
    expect(screenStatus(screen({ is_default: true }))).toMatchObject({ label: "Default", tone: "default" });
  });

  it("marks other running screens", () => {
    expect(screenStatus(screen())).toMatchObject({ label: "Running", tone: "running" });
  });

  it("explains why a screen is off or inactive", () => {
    expect(screenStatus(screen({ is_active: false, deactivated_reason: "allowance" })).hint).toMatch(/limit/);
    expect(screenStatus(screen({ is_active: false, deactivated_reason: "space" })).hint).toMatch(/space/);
    expect(screenStatus(screen({ is_active: false, deactivated_reason: "broadcaster" })).hint).toMatch(/Inactive/);
  });
});

describe("limitMessage", () => {
  it("pluralises", () => {
    expect(limitMessage(1)).toContain("1 running screen ");
    expect(limitMessage(10)).toContain("10 running screens ");
  });
});
