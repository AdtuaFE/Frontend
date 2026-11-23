import { describe, expect, it } from "vitest";
import { advertiserStatus, answerDeadline, hoursLeft, hoursLeftLabel, isReturned } from "./bookingStatus";

const b = (status: string, over = {}) => ({ status, start_date: "2026-11-10", end_date: "2026-11-20", ...over });

describe("advertiserStatus", () => {
  it("reads an approved booking from the dates, not the backend", () => {
    expect(advertiserStatus(b("accepted"), "2026-11-05")).toBe("scheduled");
    expect(advertiserStatus(b("accepted"), "2026-11-10")).toBe("playing");
    expect(advertiserStatus(b("active"), "2026-11-20")).toBe("playing");
    expect(advertiserStatus(b("accepted"), "2026-11-21")).toBe("completed");
  });

  it("maps the other backend statuses", () => {
    expect(advertiserStatus(b("pending"))).toBe("waiting");
    expect(advertiserStatus(b("completed"))).toBe("completed");
    expect(advertiserStatus(b("rejected"))).toBe("declined");
    expect(advertiserStatus(b("cancelled"))).toBe("withdrawn");
    expect(advertiserStatus(b("expired"))).toBe("expired");
  });

  it("calls a booking with turned-down slots Not approved", () => {
    expect(advertiserStatus(b("pending", { needs_resolution: true }))).toBe("not_approved");
  });

  it("knows which endings return the money", () => {
    expect(["declined", "withdrawn", "expired"].every(s => isReturned(s as never))).toBe(true);
    expect(isReturned("completed")).toBe(false);
  });
});

describe("answer deadline", () => {
  it("runs to the end of the second day after the request was sent", () => {
    expect(answerDeadline("2026-11-22T14:10:00Z")).toBe("2026-11-24");
    // 36 hours after sending, on the last evening of day 2, ten hours remain.
    expect(hoursLeft("2026-11-22T14:10:00Z", Date.parse("2026-11-24T14:00:00Z"))).toBe(10);
  });

  it("never goes below zero", () => {
    expect(hoursLeft("2026-11-01T00:00:00Z", Date.parse("2026-12-01T00:00:00Z"))).toBe(0);
  });

  it("tones the label at 24 and 12 hours", () => {
    const sent = "2026-11-22T00:00:00Z"; // deadline ends 2026-11-25T00:00Z
    expect(hoursLeftLabel(sent, Date.parse("2026-11-23T20:00:00Z"))).toEqual({ text: "28 hours left", tone: "neutral" });
    expect(hoursLeftLabel(sent, Date.parse("2026-11-24T06:00:00Z"))).toEqual({ text: "18 hours left", tone: "warning" });
    expect(hoursLeftLabel(sent, Date.parse("2026-11-24T14:00:00Z"))).toEqual({ text: "10 hours left", tone: "danger" });
    expect(hoursLeftLabel(sent, Date.parse("2026-11-24T23:30:00Z")).text).toBe("Under 1 hour left");
  });
});
