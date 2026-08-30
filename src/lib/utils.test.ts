import { describe, it, expect } from "vitest";
import { fmt } from "./utils";

// ─── fmt() ───────────────────────────────────────────────────────────────────

describe("fmt", () => {
  it("returns empty string for null, undefined, and empty string", () => {
    expect(fmt(null)).toBe("");
    expect(fmt(undefined)).toBe("");
    expect(fmt("")).toBe("");
  });

  it("title-cases single words", () => {
    expect(fmt("public")).toBe("Public");
    expect(fmt("private")).toBe("Private");
    expect(fmt("image")).toBe("Image");
    expect(fmt("video")).toBe("Video");
    expect(fmt("daily")).toBe("Daily");
    expect(fmt("monthly")).toBe("Monthly");
    expect(fmt("total")).toBe("Total");
  });

  it("title-cases snake_case enum values", () => {
    expect(fmt("space_type")).toBe("Space Type");
    expect(fmt("budget_period")).toBe("Budget Period");
    expect(fmt("ad_type")).toBe("Ad Type");
    expect(fmt("display_type")).toBe("Display Type");
  });

  it("uppercases known acronyms", () => {
    expect(fmt("digital_led")).toBe("Digital LED");
    expect(fmt("led_board")).toBe("LED Board");
    expect(fmt("outdoor_tv")).toBe("Outdoor TV");
    expect(fmt("tv_outdoor")).toBe("TV Outdoor");
    expect(fmt("us_billboard")).toBe("US Billboard");
    expect(fmt("cpm_rate")).toBe("CPM Rate");
  });

  it("handles mixed acronym + normal words", () => {
    expect(fmt("led")).toBe("LED");
    expect(fmt("tv")).toBe("TV");
    expect(fmt("cpm")).toBe("CPM");
    expect(fmt("us")).toBe("US");
  });

  it("words not in the acronym list are title-cased normally", () => {
    expect(fmt("abc")).toBe("Abc");
    expect(fmt("foo_bar")).toBe("Foo Bar");
  });
});

// ─── Booking split logic ──────────────────────────────────────────────────────
// Mirrors the client-side filter in Bookings.tsx (PR #11).
// The logic must correctly separate advertiser vs broadcaster bookings from
// a single /api/bookings response by comparing broadcaster_id to the current user.

type Booking = { id: number; broadcaster_id: number };

function splitBookings(bookings: Booking[], userId: number | undefined, isAdvertiser: boolean, isBroadcaster: boolean) {
  const advertiserBookings = isAdvertiser
    ? bookings.filter(b => b.broadcaster_id !== userId)
    : [];
  const broadcasterBookings = isBroadcaster
    ? bookings.filter(b => b.broadcaster_id === userId)
    : [];
  return { advertiserBookings, broadcasterBookings };
}

describe("booking split (Bookings.tsx PR #11 logic)", () => {
  const userId = 42;

  const bookings: Booking[] = [
    { id: 1, broadcaster_id: 99 },  // user placed as advertiser on broadcaster 99's space
    { id: 2, broadcaster_id: 42 },  // user's own space — user is the broadcaster
    { id: 3, broadcaster_id: 7 },   // another advertiser booking on another broadcaster's space
  ];

  it("pure advertiser sees only bookings where they are not the broadcaster", () => {
    const { advertiserBookings, broadcasterBookings } = splitBookings(bookings, userId, true, false);
    expect(advertiserBookings.map(b => b.id)).toEqual([1, 3]);
    expect(broadcasterBookings).toHaveLength(0);
  });

  it("pure broadcaster sees only bookings on their own spaces", () => {
    const { advertiserBookings, broadcasterBookings } = splitBookings(bookings, userId, false, true);
    expect(advertiserBookings).toHaveLength(0);
    expect(broadcasterBookings.map(b => b.id)).toEqual([2]);
  });

  it("dual-role user: booking on own space goes to broadcaster list only (no duplication)", () => {
    const { advertiserBookings, broadcasterBookings } = splitBookings(bookings, userId, true, true);
    // booking #2 (own space) should appear in broadcaster list only
    expect(broadcasterBookings.map(b => b.id)).toContain(2);
    expect(advertiserBookings.map(b => b.id)).not.toContain(2);
    // bookings on others' spaces go to advertiser list only
    expect(advertiserBookings.map(b => b.id)).toContain(1);
    expect(advertiserBookings.map(b => b.id)).toContain(3);
    expect(broadcasterBookings.map(b => b.id)).not.toContain(1);
    expect(broadcasterBookings.map(b => b.id)).not.toContain(3);
  });

  it("empty bookings list produces empty arrays", () => {
    const { advertiserBookings, broadcasterBookings } = splitBookings([], userId, true, true);
    expect(advertiserBookings).toHaveLength(0);
    expect(broadcasterBookings).toHaveLength(0);
  });

  it("non-role user gets empty arrays regardless of data", () => {
    const { advertiserBookings, broadcasterBookings } = splitBookings(bookings, userId, false, false);
    expect(advertiserBookings).toHaveLength(0);
    expect(broadcasterBookings).toHaveLength(0);
  });
});

// ─── Location string (region fix, PR #11) ─────────────────────────────────────
// All location renders switched from [city, country] to [city, region, country].

function buildLocation(city: string | null, region: string | null, country: string | null) {
  return [city, region, country].filter(Boolean).join(", ");
}

describe("location string with region", () => {
  it("includes region between city and country when all three present", () => {
    expect(buildLocation("Bloomington", "Indiana", "US")).toBe("Bloomington, Indiana, US");
  });

  it("falls back gracefully when region is null", () => {
    expect(buildLocation("London", null, "UK")).toBe("London, UK");
  });

  it("handles only country", () => {
    expect(buildLocation(null, null, "US")).toBe("US");
  });

  it("handles city + region, no country", () => {
    expect(buildLocation("Austin", "Texas", null)).toBe("Austin, Texas");
  });

  it("all null produces empty string", () => {
    expect(buildLocation(null, null, null)).toBe("");
  });
});

// ─── fmtTime helper ──────────────────────────────────────────────────────────
// Used in BookingDetail and SubmitOfferModal: "HH:MM:SS" → "HH:MM"

const fmtTime = (t: string) => t.slice(0, 5);

describe("fmtTime", () => {
  it("trims seconds from time string", () => {
    expect(fmtTime("08:00:00")).toBe("08:00");
    expect(fmtTime("16:30:00")).toBe("16:30");
    expect(fmtTime("23:59:59")).toBe("23:59");
  });
});

// ─── Slot label resolution (BookingDetail PR #11) ─────────────────────────────

type Slot = { id: number; label: string; start_time: string; end_time: string };

function resolveSlotLabel(slotId: number, slotById: Map<number, Slot>): string {
  const slot = slotById.get(slotId);
  return slot
    ? `${slot.label} ${fmtTime(slot.start_time)}–${fmtTime(slot.end_time)} UTC`
    : `Slot #${slotId}`;
}

describe("slot label resolution", () => {
  const slots: Slot[] = [
    { id: 56, label: "Daytime", start_time: "08:00:00", end_time: "16:00:00" },
    { id: 57, label: "Prime",   start_time: "18:00:00", end_time: "22:00:00" },
  ];
  const slotById = new Map(slots.map(s => [s.id, s]));

  it("returns label and time range when slot is found", () => {
    expect(resolveSlotLabel(56, slotById)).toBe("Daytime 08:00–16:00 UTC");
    expect(resolveSlotLabel(57, slotById)).toBe("Prime 18:00–22:00 UTC");
  });

  it("falls back to Slot #id when slot is not in the map", () => {
    expect(resolveSlotLabel(999, slotById)).toBe("Slot #999");
  });

  it("falls back gracefully with an empty slot map (slots not yet loaded)", () => {
    expect(resolveSlotLabel(56, new Map())).toBe("Slot #56");
  });
});
