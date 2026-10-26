import { describe, expect, it } from "vitest";
import {
  campaignFormErrors, campaignMoney, campaignRows, daysInclusive, fmtMoney, fmtRange, playsPerDay, scheduleNote,
  type Booking, type Offer,
} from "./campaignData";

const booking = (id: number, p: Partial<Booking>): Booking => ({
  id, campaign_id: 1, space_id: 1, status: "pending", start_date: "2026-10-06", end_date: "2026-10-15", total_price: 100, ...p,
});
const offer = (id: number, status: Offer["status"]): Offer => ({
  id, campaign_id: 1, broadcaster_id: 2, status, message: null, created_at: "2026-10-01T00:00:00Z",
});
const day = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d, 12); };

describe("dates", () => {
  it("counts both ends", () => {
    expect(daysInclusive("2026-10-06", "2026-11-02")).toBe(28);
    expect(daysInclusive("2026-10-06", "2026-10-06")).toBe(1);
  });

  it("formats ranges with and without the year", () => {
    expect(fmtRange("2026-10-06", "2026-11-02")).toBe("Oct 6 to Nov 2");
    expect(fmtRange("2026-11-20", "2026-12-24", true)).toBe("Nov 20 to Dec 24, 2026");
    expect(fmtRange("2026-12-20", "2027-01-05", true)).toBe("Dec 20, 2026 to Jan 5, 2027");
  });

  it("describes where today sits in the schedule", () => {
    expect(scheduleNote("2026-11-20", "2026-12-24", day("2026-10-25"))).toBe("35 days");
    expect(scheduleNote("2026-10-06", "2026-11-02", day("2026-10-17"))).toBe("Day 12 of 28");
    expect(scheduleNote("2026-10-06", "2026-11-02", day("2026-11-03"))).toBe("Ended");
  });
});

describe("campaignMoney", () => {
  it("splits the budget into spent, booked, waiting and left", () => {
    const m = campaignMoney(1500, [
      booking(1, { status: "active", start_date: "2026-10-06", end_date: "2026-10-15", total_price: 100 }), // 4 of 10 days ran
      booking(2, { status: "accepted", start_date: "2026-10-20", end_date: "2026-10-29", total_price: 200 }), // not started
      booking(3, { status: "completed", total_price: 50 }),
      booking(4, { status: "pending", total_price: 274 }),
      booking(5, { status: "rejected", total_price: 90 }),
      booking(6, { status: "cancelled", total_price: 60 }),
    ], day("2026-10-10"));
    expect(m).toEqual({ spent: 90, booked: 260, waiting: 274, left: 876 });
  });

  it("never shows a negative amount left", () => {
    expect(campaignMoney(100, [booking(1, { status: "pending", total_price: 150 })]).left).toBe(0);
  });
});

describe("campaignRows", () => {
  it("groups offers and bookings into needs you, waiting and booked", () => {
    const rows = campaignRows(
      [
        booking(1, { status: "rejected" }),
        booking(2, { status: "pending" }),
        booking(3, { status: "active", start_date: "2026-10-01" }),
        booking(4, { status: "accepted", start_date: "2026-11-01" }),
        booking(5, { status: "completed" }),
        booking(6, { status: "cancelled" }),
      ],
      [offer(10, "pending"), offer(11, "accepted"), offer(12, "rejected")],
      day("2026-10-10"),
    );
    expect(rows.needs.map(r => r.status)).toEqual(["new_offer", "not_approved"]);
    expect(rows.waiting.map(r => r.status)).toEqual(["pending"]);
    expect(rows.booked.map(r => r.status)).toEqual(["playing", "scheduled", "done"]);
  });
});

describe("helpers", () => {
  it("formats whole dollars without cents", () => {
    expect(fmtMoney(1500)).toBe("$1,500");
    expect(fmtMoney(1248.5)).toBe("$1,248.50");
  });

  it("adds up plays a day across a booking's slots", () => {
    expect(playsPerDay(booking(1, { booking_slots: [{ slot_id: 1, daily_playbacks_allocated: 30 }, { slot_id: 2, daily_playbacks_allocated: 10 }] }))).toBe(40);
  });
});

describe("campaignFormErrors", () => {
  const valid = { name: "Fall menu", objective: "", total_budget: "1500", start_date: "2026-11-01", end_date: "2026-11-30", location: "", visibility: "public" as const, ad_type: "image" as const };

  it("passes a complete form", () => {
    expect(campaignFormErrors(valid)).toEqual({});
  });

  it("matches the API's rules", () => {
    expect(campaignFormErrors({ ...valid, name: "  " }).name).toBe("Give your campaign a name");
    expect(campaignFormErrors({ ...valid, total_budget: "0" }).total_budget).toBe("Set a budget above $0");
    expect(campaignFormErrors({ ...valid, start_date: "" }).start_date).toBe("Pick a start date");
    expect(campaignFormErrors({ ...valid, end_date: "2026-11-01" }).end_date).toBe("End date must be after the start date");
  });
});
