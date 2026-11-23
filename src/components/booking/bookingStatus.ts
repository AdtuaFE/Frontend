// What a booking's status reads as for the advertiser, from the "Badges and statuses" board.
// Playing and Completed aren't backend statuses: an accepted booking reads Scheduled before its
// start date, Playing during its dates and Completed after them.

import { addDays, isoOf } from "./bookingFlow";

export type AdvertiserStatus =
  | "waiting" | "not_approved" | "scheduled" | "playing" | "completed" | "declined" | "withdrawn" | "expired";

export type StatusTone = "warning" | "brand" | "success" | "neutral" | "danger";

export const STATUS_LOOK: Record<AdvertiserStatus, { label: string; tone: StatusTone }> = {
  waiting: { label: "Waiting", tone: "warning" },
  not_approved: { label: "Not approved", tone: "warning" },
  scheduled: { label: "Scheduled", tone: "brand" },
  playing: { label: "Playing", tone: "success" },
  completed: { label: "Completed", tone: "neutral" },
  declined: { label: "Declined", tone: "neutral" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
  expired: { label: "Expired", tone: "neutral" },
};

export function advertiserStatus(
  b: { status: string; start_date: string; end_date: string; needs_resolution?: boolean },
  today = isoOf(new Date()),
): AdvertiserStatus {
  if (b.needs_resolution) return "not_approved";
  switch (b.status) {
    case "pending": return "waiting";
    case "accepted":
    case "active":
      if (today < b.start_date.slice(0, 10)) return "scheduled";
      return today > b.end_date.slice(0, 10) ? "completed" : "playing";
    case "completed": return "completed";
    case "rejected": return "declined";
    case "cancelled": return "withdrawn";
    case "expired": return "expired";
    default: return "waiting";
  }
}

/** Money came back to the wallet. */
export const isReturned = (s: AdvertiserStatus) => s === "declined" || s === "withdrawn" || s === "expired";

/**
 * The last day a broadcaster can answer: the backend keeps a request pending through the end of
 * the second day after it was sent (UTC), then the nightly job expires it.
 */
export const answerDeadline = (createdAt: string) => addDays(createdAt.slice(0, 10), 2);

/** Hours from now to the end of the deadline day, never below zero. */
export function hoursLeft(createdAt: string, now = Date.now()): number {
  const end = new Date(`${addDays(answerDeadline(createdAt), 1)}T00:00:00Z`).getTime();
  return Math.max(0, Math.floor((end - now) / 3_600_000));
}

/** "47 hours left" / "Under 1 hour left", toned the way the board says. */
export function hoursLeftLabel(createdAt: string, now = Date.now()): { text: string; tone: StatusTone } {
  const h = hoursLeft(createdAt, now);
  return {
    text: h < 1 ? "Under 1 hour left" : `${h} hour${h === 1 ? "" : "s"} left`,
    tone: h > 24 ? "neutral" : h > 12 ? "warning" : "danger",
  };
}
