// What /api/campaigns, /api/bookings and /api/campaigns/:id/offers return, plus the date and
// money math the campaign pages share.

export type CampaignStatus = "draft" | "active" | "paused" | "completed" | "archived";

export type Campaign = {
  id: number;
  advertiser_id: number;
  name: string;
  objective: string | null;
  start_date: string;
  end_date: string;
  total_budget: number | string;
  location: string | null;
  visibility: "public" | "private" | null;
  ad_type: "image" | "video" | null;
  status: CampaignStatus;
  created_at: string;
};

export type BookingStatus =
  | "pending" | "accepted" | "rejected" | "cancelled" | "active" | "completed" | "expired"
  /** Held by a broadcaster's offer until the advertiser answers it. Only listed when asked for. */
  | "offer_pending";

/**
 * A booking as GET /api/bookings lists it. `daily_playbacks_allocated` counts 15-second spots,
 * so a 30-second ad playing 10 times a day holds 20.
 */
export type Booking = {
  id: number;
  campaign_id: number;
  space_id: number;
  broadcaster_id?: number;
  status: BookingStatus;
  start_date: string;
  end_date: string;
  total_price: number | string;
  created_at?: string;
  booking_slots?: { id?: number; slot_id: number; daily_playbacks_allocated: number; status?: string }[];
};

/** The list endpoint returns the offer row only; which spaces and slots it covers isn't included. */
export type Offer = {
  id: number;
  campaign_id: number;
  broadcaster_id: number;
  status: "pending" | "accepted" | "rejected" | "cancelled" | "expired";
  proposed_price?: number | string | null;
  message: string | null;
  created_at: string;
};

/* ---------- dates ---------- */

const MS_DAY = 86_400_000;

/** A bare "yyyy-mm-dd" as that local day. */
export function parseDay(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysFrom = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / MS_DAY);

/** "Nov 20, 2026" */
export function fmtDate(iso: string): string {
  return parseDay(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Both ends count: Oct 6 to Oct 6 is 1 day. */
export function daysInclusive(start: string, end: string): number {
  return daysFrom(parseDay(start), parseDay(end)) + 1;
}

/** "Oct 6 to Nov 2", or with the year: "Oct 6 to Nov 2, 2026" (both years when they differ). */
export function fmtRange(start: string, end: string, withYear = false): string {
  const a = parseDay(start), b = parseDay(end);
  const day = (d: Date, year: boolean) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(year ? { year: "numeric" } : {}) });
  if (!withYear) return `${day(a, false)} to ${day(b, false)}`;
  if (a.getFullYear() !== b.getFullYear()) return `${day(a, true)} to ${day(b, true)}`;
  return `${day(a, false)} to ${day(b, true)}`;
}

/** Shown next to the dates: "35 days" before it starts, "Day 12 of 28" while it runs, "Ended" after. */
export function scheduleNote(start: string, end: string, today = new Date()): string {
  const total = daysInclusive(start, end);
  const day = daysFrom(parseDay(start), today) + 1;
  if (day < 1) return `${total} days`;
  if (day > total) return "Ended";
  return `Day ${day} of ${total}`;
}

/* ---------- money ---------- */

export function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Share of a booking's days already behind us. The API doesn't report plays, so spend is
 * estimated from the schedule: a booking halfway through its dates has spent half its price.
 */
function shareRun(b: Booking, today: Date): number {
  const ran = daysFrom(parseDay(b.start_date), today) / daysInclusive(b.start_date, b.end_date);
  return Math.min(1, Math.max(0, ran));
}

export type Money = { spent: number; booked: number; waiting: number; left: number };

/**
 * Splits a campaign's budget the way the campaign page shows it: spent (plays that already ran),
 * booked (accepted, still to play), waiting (requests held until the broadcaster answers) and left.
 */
export function campaignMoney(budget: number, bookings: Booking[], today = new Date()): Money {
  let spent = 0, booked = 0, waiting = 0;
  for (const b of bookings) {
    const price = Number(b.total_price) || 0;
    if (b.status === "pending") waiting += price;
    else if (b.status === "completed") spent += price;
    else if (b.status === "accepted" || b.status === "active") {
      const ran = shareRun(b, today);
      spent += price * ran;
      booked += price * (1 - ran);
    }
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    spent: round(spent),
    booked: round(booked),
    waiting: round(waiting),
    left: round(Math.max(0, budget - spent - booked - waiting)),
  };
}

/* ---------- table rows ---------- */

export type RowStatus = "not_approved" | "new_offer" | "pending" | "playing" | "scheduled" | "done";

export type CampaignRow =
  | { kind: "booking"; status: RowStatus; booking: Booking }
  | { kind: "offer"; status: "new_offer"; offer: Offer };

export type CampaignRows = { needs: CampaignRow[]; waiting: CampaignRow[]; booked: CampaignRow[] };

/**
 * Groups a campaign's bookings and offers the way its table does. "Needs you" holds offers to
 * answer and requests a broadcaster turned down; cancelled bookings and answered offers drop out
 * (an accepted offer shows up as its booking).
 */
export function campaignRows(bookings: Booking[], offers: Offer[], today = new Date()): CampaignRows {
  const rows: CampaignRows = { needs: [], waiting: [], booked: [] };
  for (const offer of offers) {
    if (offer.status === "pending") rows.needs.push({ kind: "offer", status: "new_offer", offer });
  }
  for (const b of bookings) {
    if (b.status === "rejected") rows.needs.push({ kind: "booking", status: "not_approved", booking: b });
    else if (b.status === "pending") rows.waiting.push({ kind: "booking", status: "pending", booking: b });
    else if (b.status === "completed") rows.booked.push({ kind: "booking", status: "done", booking: b });
    else if (b.status === "accepted" || b.status === "active") {
      const started = daysFrom(parseDay(b.start_date), today) >= 0;
      rows.booked.push({ kind: "booking", status: started ? "playing" : "scheduled", booking: b });
    }
  }
  return rows;
}

/** 15-second spots a day across the booking's slots (a longer ad uses more than one per play). */
export function spotsPerDay(b: Booking): number {
  return (b.booking_slots ?? []).reduce((n, s) => n + (s.daily_playbacks_allocated ?? 0), 0);
}

/**
 * The space holds behind an offer. The offers list doesn't say which spaces or slots an offer
 * covers, but submitting one creates an `offer_pending` booking per space in the same request
 * (GET /api/bookings?status=offer_pending lists them). So a held booking belongs to the pending
 * offer from the same broadcaster on the same campaign that was created closest to it.
 */
export function offerHolds(offer: Offer, offers: Offer[], held: Booking[]): Booking[] {
  const siblings = offers.filter(o =>
    o.status === "pending" && o.campaign_id === offer.campaign_id && o.broadcaster_id === offer.broadcaster_id);
  const gap = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return held.filter(b => {
    if (b.status !== "offer_pending" || b.campaign_id !== offer.campaign_id || b.broadcaster_id !== offer.broadcaster_id || !b.created_at) return false;
    const closest = siblings.reduce((best, o) => (gap(o.created_at, b.created_at!) < gap(best.created_at, b.created_at!) ? o : best), offer);
    return closest.id === offer.id;
  });
}

/** Bookings that hold a screen: everything but turned-down and cancelled requests. */
export function liveBookings(bookings: Booking[]): Booking[] {
  return bookings.filter(b => b.status !== "rejected" && b.status !== "cancelled");
}

/* ---------- form ---------- */

export type CampaignFormValues = {
  name: string;
  objective: string;
  total_budget: string;
  start_date: string;
  end_date: string;
  location: string;
  visibility: "public" | "private";
  ad_type: "image" | "video";
};

/** The same rules POST /api/campaigns enforces, checked before sending. */
export function campaignFormErrors(f: CampaignFormValues): Partial<Record<keyof CampaignFormValues, string>> {
  const e: Partial<Record<keyof CampaignFormValues, string>> = {};
  if (!f.name.trim()) e.name = "Give your campaign a name";
  const budget = Number(f.total_budget);
  if (!f.total_budget.trim() || !Number.isFinite(budget) || budget <= 0) e.total_budget = "Set a budget above $0";
  if (!f.start_date) e.start_date = "Pick a start date";
  if (!f.end_date) e.end_date = "Pick an end date";
  else if (f.start_date && f.end_date <= f.start_date) e.end_date = "End date must be after the start date";
  return e;
}
