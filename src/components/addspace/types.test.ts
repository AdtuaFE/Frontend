import { describe, it, expect } from "vitest";
import { emptyDraft, emptyScreen, toScreenRequests, type SpaceDraft } from "./types";

function draftWith(screens: SpaceDraft["screens"]): SpaceDraft {
  return { ...emptyDraft(), screens };
}

describe("toScreenRequests", () => {
  it("creates one slot per selected day, Monday = 1 and Sunday = 7", () => {
    const screen = {
      ...emptyScreen(),
      name: "Lobby TV",
      slots: [{ id: "a", name: "Lunch", days: ["mon" as const, "sun" as const], startTime: "11:00", endTime: "14:00", pricePerDay: "120" }],
    };
    const [req] = toScreenRequests(draftWith([screen]));
    expect(req.label).toBe("Lobby TV");
    expect(req.slots.map(s => s.day_of_week)).toEqual([1, 7]);
  });

  it("sends times as HH:MM:SS, the price as a number, and 15-second plays as capacity", () => {
    const screen = {
      ...emptyScreen(),
      name: "Window",
      slots: [{ id: "a", name: "Morning", days: ["wed" as const], startTime: "08:00", endTime: "10:00", pricePerDay: "99.50" }],
    };
    const [slot] = toScreenRequests(draftWith([screen]))[0].slots;
    expect(slot).toEqual({
      day_of_week: 3,
      label: "Morning",
      start_time: "08:00:00",
      end_time: "10:00:00",
      est_impressions_per_playback: 10,
      daily_capacity_playbacks: 480, // 2 hours / 15 seconds
      total_price: 99.5,
    });
  });

  it("gives a screen that mirrors another screen that screen's slots", () => {
    const source = {
      ...emptyScreen(),
      id: "src",
      name: "Screen A",
      slots: [{ id: "a", name: "Evening", days: ["fri" as const], startTime: "18:00", endTime: "20:00", pricePerDay: "80" }],
    };
    const mirror = { ...emptyScreen(), id: "mir", name: "Screen B", sameScheduleAs: "src", slots: [] };
    const [, b] = toScreenRequests(draftWith([source, mirror]));
    expect(b.label).toBe("Screen B");
    expect(b.slots).toHaveLength(1);
    expect(b.slots[0]).toMatchObject({ day_of_week: 5, label: "Evening", total_price: 80 });
  });

  it("falls back to a numbered label when a screen has no name", () => {
    const [req] = toScreenRequests(draftWith([{ ...emptyScreen(), name: "  " }]));
    expect(req.label).toBe("Screen 1");
  });
});
