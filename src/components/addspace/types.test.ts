import { describe, it, expect } from "vitest";
import { emptyDraft, emptyScreen, slotErrors, toScreenRequests, type SpaceDraft, type TimeSlot } from "./types";

function draftWith(screens: SpaceDraft["screens"]): SpaceDraft {
  return { ...emptyDraft(), screens };
}

function slot(id: string, p: Partial<TimeSlot> = {}): TimeSlot {
  return { id, name: "", days: ["mon"], startTime: "11:00", endTime: "14:00", pricePerDay: "100", ...p };
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

  it("sends an end of 00:00 as the API's end of day, names blank slots by position, and skips slots with no days", () => {
    const screen = {
      ...emptyScreen(),
      slots: [
        slot("a", { name: "Unused", days: [], pricePerDay: "" }),
        slot("b", { startTime: "18:00", endTime: "00:00" }),
      ],
    };
    const slots = toScreenRequests(draftWith([screen]))[0].slots;
    expect(slots).toHaveLength(1);
    expect(slots[0]).toMatchObject({
      label: "Time Slot 2",
      start_time: "18:00:00",
      end_time: "24:00:00",
      daily_capacity_playbacks: 1440, // 6 hours / 15 seconds
    });
  });
});

describe("slotErrors", () => {
  it("doesn't ask a slot with no days for a price", () => {
    expect(slotErrors([slot("a"), slot("b", { days: [], pricePerDay: "" })])).toEqual({});
  });

  it("requires a price above $0", () => {
    expect(slotErrors([slot("a", { pricePerDay: "0" })])).toEqual({ "slot.a": "Set a price above $0" });
    expect(slotErrors([slot("a", { pricePerDay: "" })])).toEqual({ "slot.a": "Set a price above $0" });
  });

  it("matches the API's time rules", () => {
    const timeError = (p: Partial<TimeSlot>) => slotErrors([slot("a", p)])["slot.a.time"];
    expect(timeError({ startTime: "11:15" })).toBe("Times must be on the hour or half hour");
    expect(timeError({ startTime: "14:00", endTime: "11:00" })).toBe("End time must be after the start time");
    expect(timeError({ startTime: "11:00", endTime: "11:00" })).toBe("End time must be after the start time");
    expect(timeError({ endTime: "" })).toBe("Set a start and end time");
    expect(timeError({ startTime: "18:00", endTime: "00:00" })).toBeUndefined();
    expect(timeError({ startTime: "00:00", endTime: "00:00" })).toBeUndefined();
  });

  it("flags slots that overlap an earlier one on a shared day", () => {
    const errors = slotErrors([
      slot("a", { name: "Lunch", days: ["tue", "wed"] }),
      slot("b", { days: ["mon", "wed"], startTime: "13:00", endTime: "15:00" }),
    ]);
    expect(errors).toEqual({ "slot.b.time": "Overlaps Lunch on Wed" });
  });

  it("allows back-to-back slots and the same hours on different days", () => {
    expect(slotErrors([
      slot("a"),
      slot("b", { startTime: "14:00", endTime: "16:00" }),
      slot("c", { days: ["tue"] }),
    ])).toEqual({});
  });

  it("allows at most 3 slots on a day", () => {
    const errors = slotErrors([
      slot("a", { startTime: "08:00", endTime: "09:00" }),
      slot("b", { startTime: "09:00", endTime: "10:00" }),
      slot("c", { startTime: "10:00", endTime: "11:00" }),
      slot("d", { startTime: "11:00", endTime: "12:00" }),
    ]);
    expect(errors).toEqual({ "slot.d.time": "Mon already has 3 time slots" });
  });
});
