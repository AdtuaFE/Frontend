import { describe, expect, it } from "vitest";
import {
  addDays, cheapestPlay, daysIn, daysLabel, datesBetween, groupAmount, groupDayPrice, groupSlots, maxPlays, readCapacityIssues,
  slotsBody, timeLabel, weekday, type Slot,
} from "./bookingFlow";

// 2026-11-16 is a Monday.
const slot = (id: number, day: number, over: Partial<Slot> = {}): Slot => ({
  id, screen_id: 1, day_of_week: day, label: "Lunch", start_time: "11:00:00", end_time: "14:00:00",
  est_impressions_per_playback: 100, daily_capacity_playbacks: 960, total_price: 960, ...over,
});
const monToFri = [1, 2, 3, 4, 5].map(d => slot(d, d));

describe("dates", () => {
  it("adds days across a month end and reads the weekday", () => {
    expect(addDays("2026-11-29", 3)).toBe("2026-12-02");
    expect(weekday("2026-11-16")).toBe(1);
    expect(weekday("2026-11-22")).toBe(7);
  });

  it("lists every date inclusive and counts the ones on given weekdays", () => {
    expect(datesBetween("2026-11-16", "2026-11-22")).toHaveLength(7);
    expect(daysIn("2026-11-16", "2026-11-29", [1, 2, 3, 4, 5])).toBe(10);
    expect(daysIn("2026-11-16", "2026-11-29", new Set([6, 7]))).toBe(4);
  });
});

describe("time slots", () => {
  it("folds the weekday rows of one time slot into a group", () => {
    const groups = groupSlots([...monToFri, slot(20, 6, { label: "Evenings", start_time: "17:00:00", end_time: "20:00:00" })]);
    expect(groups.map(g => g.label)).toEqual(["Lunch", "Evenings"]);
    expect(groups[0].days).toEqual([1, 2, 3, 4, 5]);
    expect(groups[0].slots).toHaveLength(5);
  });

  it("words the days and times the way the design does", () => {
    expect(daysLabel([1, 2, 3, 4, 5, 6, 7])).toBe("Every day");
    expect(daysLabel([1, 2, 3, 4, 5])).toBe("Mon to Fri");
    expect(daysLabel([6, 7])).toBe("Sat and Sun");
    expect(daysLabel([1, 3, 5])).toBe("Mon, Wed, Fri");
    expect(timeLabel("11:00:00", "14:00:00")).toBe("11 AM to 2 PM UTC");
    expect(timeLabel("06:30:00", "09:00:00")).toBe("6:30 to 9 AM UTC");
    expect(timeLabel("16:00:00", "24:00:00")).toBe("4 PM to 12 AM UTC");
  });
});

describe("pricing follows the backend: total_price / capacity x spots x matching dates", () => {
  const [lunch] = groupSlots(monToFri);

  it("charges per play", () => {
    // 960 for 960 spots is $1 a spot; 12 plays of a 15s ad is 12 spots.
    expect(groupDayPrice(lunch, 12, 15)).toBeCloseTo(12);
    // A 30s ad takes two spots a play.
    expect(groupDayPrice(lunch, 12, 30)).toBeCloseTo(24);
  });

  it("multiplies by the days the slot actually plays inside the dates", () => {
    // Nov 16 to Nov 29: ten weekdays.
    expect(groupAmount(lunch, 12, 15, "2026-11-16", "2026-11-29")).toEqual({ amount: 120, days: 10 });
    // A window with no weekday costs nothing.
    expect(groupAmount(lunch, 12, 15, "2026-11-21", "2026-11-22")).toEqual({ amount: 0, days: 0 });
  });

  it("caps plays by the smallest capacity and the ad's length", () => {
    expect(maxPlays(lunch, 15)).toBe(960);
    expect(maxPlays(lunch, 30)).toBe(480);
    const tight = groupSlots([slot(1, 1), slot(2, 2, { daily_capacity_playbacks: 100 })])[0];
    expect(maxPlays(tight, 15)).toBe(100);
  });

  it("finds the cheapest play", () => {
    expect(cheapestPlay([slot(1, 1), slot(2, 2, { total_price: 480 })])).toBeCloseTo(0.5);
    expect(cheapestPlay([])).toBeNull();
  });
});

describe("slotsBody", () => {
  it("sends only the weekday rows that fall inside the dates", () => {
    const groups = groupSlots(monToFri);
    // Mon Nov 16 to Wed Nov 18 only reaches Monday to Wednesday.
    const body = slotsBody(groups, [{ key: groups[0].key, plays: 10 }], "2026-11-16", "2026-11-18");
    expect(body).toEqual([{ slot_id: 1, play_count: 10 }, { slot_id: 2, play_count: 10 }, { slot_id: 3, play_count: 10 }]);
  });
});

describe("readCapacityIssues", () => {
  it("reads every full day, in plays (a 15s ad is one spot a play), soonest first", () => {
    const msg = [
      'Slot "Lunch" capacity exceeded on 2026-11-17: only 96 spot-units remaining that day',
      'Slot "Lunch" capacity exceeded on 2026-11-16: only 40 spot-units remaining that day',
    ].join("\n");
    expect(readCapacityIssues(msg, 15)).toEqual([
      { label: "Lunch", date: "2026-11-16", playsLeft: 40 },
      { label: "Lunch", date: "2026-11-17", playsLeft: 96 },
    ]);
  });

  it("divides by the ad's spots and ignores other errors", () => {
    expect(readCapacityIssues('Slot "Lunch" capacity exceeded on 2026-11-16: only 40 spot-units remaining', 30)[0].playsLeft).toBe(20);
    expect(readCapacityIssues('Slot "Mornings" capacity exceeded on 2026-11-16: only 1 playback remaining', 30)[0].playsLeft).toBe(0);
    expect(readCapacityIssues("Campaign not found", 15)).toEqual([]);
    expect(readCapacityIssues(null, 15)).toEqual([]);
  });
});
