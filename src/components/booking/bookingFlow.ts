// Shared rules for the screen detail → review request → request sent flow.
//
// The API stores one slot per weekday, so "Lunch, Mon to Fri, 11 AM to 2 PM" is five slot rows.
// The flow groups them back into one time slot the person picks once, with one plays-a-day
// number, and sends every day's slot id with that number.
//
// Pricing follows the backend: each slot charges total_price ÷ daily_capacity_playbacks per
// 15-second spot, times spots a day, times the dates in range that fall on its weekday. The
// server's dry run (/api/bookings/simulate) is the number that counts; the per-slot amounts here
// use the same formula so the panel can show a breakdown.

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { spotsFor } from "@/lib/creative";
import { useDebounced } from "@/hooks/use-debounced";

export type Screen = { id: number; space_id: number; label: string; is_active: boolean };

export type Slot = {
  id: number;
  screen_id: number;
  day_of_week: number;
  label: string;
  start_time: string;
  end_time: string;
  est_impressions_per_playback: number;
  daily_capacity_playbacks: number;
  total_price: number | string;
};

/* ---------- dates (plain "yyyy-mm-dd" strings, read as UTC days like the backend) ---------- */

export const NOTICE_DAYS = 3;

const utcDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
export const isoOf = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(iso: string, n: number): string {
  const d = utcDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return isoOf(d);
}

/** Today's UTC date plus the notice period, the earliest start the backend accepts. */
export const minStart = () => addDays(isoOf(new Date()), NOTICE_DAYS);

/** 1 = Monday … 7 = Sunday. */
export const weekday = (iso: string) => ((utcDate(iso).getUTCDay() + 6) % 7) + 1;

export function datesBetween(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end && out.length < 400; d = addDays(d, 1)) out.push(d);
  return out;
}

export const daysIn = (start: string, end: string, days: Set<number> | number[]) => {
  const set = days instanceof Set ? days : new Set(days);
  return datesBetween(start, end).filter(d => set.has(weekday(d))).length;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WD = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const fmtDay = (iso: string) => `${MONTHS[utcDate(iso).getUTCMonth()]} ${utcDate(iso).getUTCDate()}`;
export const fmtDayLong = (iso: string) => `${WD[weekday(iso)]}, ${fmtDay(iso)}`;
export const fmtSpan = (start: string, end: string) => (start === end ? fmtDay(start) : `${fmtDay(start)} to ${fmtDay(end)}`);

/* ---------- time slots ---------- */

export type SlotGroup = {
  key: string;
  label: string;
  start: string;
  end: string;
  slots: Slot[];
  days: number[];
};

export function groupSlots(slots: Slot[]): SlotGroup[] {
  const map = new Map<string, SlotGroup>();
  for (const s of slots) {
    const key = `${s.label}|${s.start_time.slice(0, 5)}|${s.end_time.slice(0, 5)}`;
    const g = map.get(key) ?? { key, label: s.label, start: s.start_time, end: s.end_time, slots: [], days: [] };
    g.slots.push(s);
    if (!g.days.includes(s.day_of_week)) g.days.push(s.day_of_week);
    map.set(key, g);
  }
  return [...map.values()]
    .map(g => ({ ...g, days: g.days.sort((a, b) => a - b) }))
    .sort((a, b) => a.start.localeCompare(b.start) || a.label.localeCompare(b.label));
}

/** "Every day", "Mon to Fri", "Sat and Sun", "Mon, Wed, Fri". */
export function daysLabel(days: number[]): string {
  if (days.length === 7) return "Every day";
  if (days.length === 1) return WD[days[0]];
  const consecutive = days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  if (consecutive && days.length > 2) return `${WD[days[0]]} to ${WD[days[days.length - 1]]}`;
  if (days.length === 2) return `${WD[days[0]]} and ${WD[days[1]]}`;
  return days.map(d => WD[d]).join(", ");
}

function fmtClock(t: string): { h: number; m: number; ap: "AM" | "PM" } {
  const [hh, mm] = t.split(":").map(Number);
  const h24 = hh % 24;
  return { h: h24 % 12 === 0 ? 12 : h24 % 12, m: mm, ap: h24 < 12 ? "AM" : "PM" };
}

/** "11 AM to 2 PM", "6:30 to 9 AM". Times are stored in UTC, so the label says so. */
export function timeLabel(start: string, end: string): string {
  const a = fmtClock(start);
  const b = fmtClock(end === "24:00:00" || end.startsWith("24") ? "00:00" : end);
  const part = (c: typeof a) => (c.m ? `${c.h}:${String(c.m).padStart(2, "0")}` : `${c.h}`);
  return a.ap === b.ap ? `${part(a)} to ${part(b)} ${b.ap} UTC` : `${part(a)} ${a.ap} to ${part(b)} ${b.ap} UTC`;
}

export const groupSchedule = (g: SlotGroup) => `${daysLabel(g.days)}, ${timeLabel(g.start, g.end)}`;

/** Most plays a day of this ad that fit every day of the group. */
export const maxPlays = (g: SlotGroup, adSeconds: number) =>
  Math.max(0, Math.floor(Math.min(...g.slots.map(s => s.daily_capacity_playbacks)) / spotsFor(adSeconds)));

const perSpot = (s: Slot) => Number(s.total_price) / s.daily_capacity_playbacks;

/** What a group costs on one day at this many plays (the average when weekdays differ). */
export function groupDayPrice(g: SlotGroup, plays: number, adSeconds: number): number {
  const spots = plays * spotsFor(adSeconds);
  const each = g.slots.map(s => spots * perSpot(s));
  return each.reduce((a, b) => a + b, 0) / each.length;
}

/** Dates in range this group plays on, and what it costs across them. */
export function groupAmount(g: SlotGroup, plays: number, adSeconds: number, start: string, end: string) {
  const spots = plays * spotsFor(adSeconds);
  let amount = 0;
  let days = 0;
  for (const s of g.slots) {
    const n = daysIn(start, end, [s.day_of_week]);
    days += n;
    amount += n * spots * perSpot(s);
  }
  return { amount: Math.round(amount * 100) / 100, days };
}

/** Price of one 15-second play in the group's cheapest slot (used for "From $X a play"). */
export const cheapestPlay = (slots: Slot[]) =>
  slots.length ? Math.min(...slots.map(perSpot)) : null;

/* ---------- the request draft (kept for the review page and a reload) ---------- */

export type DraftPick = { key: string; plays: number };
export type BookingDraft = {
  spaceId: number;
  screenId: number;
  campaignId: number;
  start: string;
  end: string;
  picks: DraftPick[];
};

const draftKey = (spaceId: number) => `adtua.bookingDraft.${spaceId}`;

export function saveDraft(d: BookingDraft) {
  try { sessionStorage.setItem(draftKey(d.spaceId), JSON.stringify(d)); } catch { /* storage off: the page still works */ }
}

export function readDraft(spaceId: number): BookingDraft | null {
  try {
    const raw = sessionStorage.getItem(draftKey(spaceId));
    return raw ? (JSON.parse(raw) as BookingDraft) : null;
  } catch {
    return null;
  }
}

export function clearDraft(spaceId: number) {
  try { sessionStorage.removeItem(draftKey(spaceId)); } catch { /* nothing to clear */ }
}

/** The slots body both /simulate and POST /api/bookings take. Only days inside the dates are sent. */
export function slotsBody(groups: SlotGroup[], picks: DraftPick[], start: string, end: string) {
  const inRange = new Set(datesBetween(start, end).map(weekday));
  return picks.flatMap(p => {
    const g = groups.find(x => x.key === p.key);
    return (g?.slots ?? []).filter(s => inRange.has(s.day_of_week)).map(s => ({ slot_id: s.id, play_count: p.plays }));
  });
}

/* ---------- the server's price check ---------- */

/** A slot that's full on some day, read from the server's message. */
export type CapacityIssue = { label: string; date: string; playsLeft: number };

/**
 * Every "Slot "Lunch" capacity exceeded on 2026-11-16: only 4 spot-units remaining" line in the
 * server's error, soonest day first. Remaining room is counted in 15-second spots.
 */
export function readCapacityIssues(message: string | null | undefined, adSeconds: number): CapacityIssue[] {
  if (!message) return [];
  const re = /Slot "(.+?)" capacity exceeded on (\d{4}-\d{2}-\d{2}): only (\d+) (?:playbacks?|spot-units?) remaining/gi;
  const out: CapacityIssue[] = [];
  for (const m of message.matchAll(re)) out.push({ label: m[1], date: m[2], playsLeft: Math.floor(Number(m[3]) / spotsFor(adSeconds)) });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function useBookingQuote(body: Record<string, unknown> | null) {
  const json = body ? JSON.stringify(body) : null;
  const debounced = useDebounced(json, 350);
  const q = useQuery<{ total_price: number | string }>({
    queryKey: ["booking-simulate", debounced],
    queryFn: () => api.post("/api/bookings/simulate", JSON.parse(debounced!)),
    enabled: !!debounced && debounced === json,
    retry: false,
    placeholderData: prev => prev,
  });
  const settled = !!json && debounced === json && !q.isFetching;
  return {
    total: json && q.data && !q.isError ? Number(q.data.total_price) : null,
    error: settled && q.isError ? (q.error as Error).message : null,
    pending: !!json && !settled,
  };
}
