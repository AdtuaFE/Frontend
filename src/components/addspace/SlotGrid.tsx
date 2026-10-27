import { DAYS, formatDays, slotMinutes, type DayKey, type TimeSlot } from "./types";

/** "12 AM", "4 PM", "11:30 AM" — minutes dropped when they're zero, as in the design. */
function formatTime(minutes: number): { hour: string; meridiem: "AM" | "PM" } {
  const total = ((minutes % 1440) + 1440) % 1440;
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const meridiem = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour: m ? `${h12}:${String(m).padStart(2, "0")}` : `${h12}`, meridiem };
}

/** A range reads "12 AM–4 PM", collapsing to "4–10 PM" when both ends share a meridiem. */
function formatRange(startMin: number, endMin: number): string {
  const s = formatTime(startMin);
  const e = formatTime(endMin === 1440 ? 0 : endMin);
  const endLabel = endMin === 1440 || endMin % 1440 === 0 ? "12 AM" : `${e.hour} ${e.meridiem}`;
  const endMeridiem = endMin === 1440 || endMin % 1440 === 0 ? "AM" : e.meridiem;
  if (s.meridiem === endMeridiem && startMin !== 0) return `${s.hour}–${endLabel}`;
  return `${s.hour} ${s.meridiem}–${endLabel}`;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return Number.isNaN(h) || Number.isNaN(m) ? 0 : h * 60 + m;
}

type Segment = { startMin: number; endMin: number; slot: TimeSlot | null };

/**
 * Lays a day's slots onto a 24-hour strip, filling anything uncovered with a "No ads" gap.
 * A slot that wraps past midnight is clipped at the end of the day for display.
 */
function buildSegments(slots: TimeSlot[]): Segment[] {
  const ranges = slots
    .map(slot => {
      const start = toMinutes(slot.startTime);
      const end = Math.min(start + slotMinutes(slot), 1440);
      return { startMin: start, endMin: end, slot };
    })
    .filter(r => r.endMin > r.startMin)
    .sort((a, b) => a.startMin - b.startMin);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.startMin > cursor) {
      segments.push({ startMin: cursor, endMin: range.startMin, slot: null });
    }
    segments.push(range);
    cursor = Math.max(cursor, range.endMin);
  }
  if (cursor < 1440) segments.push({ startMin: cursor, endMin: 1440, slot: null });
  return segments;
}

/**
 * Read-only preview of a screen's week: one row per distinct set of days, each row a
 * proportional strip of priced windows and unsold gaps.
 */
export function SlotGrid({ slots }: { slots: TimeSlot[] }) {
  const priced = slots.filter(s => s.days.length > 0);
  if (!priced.length) {
    return <p className="text-sm text-[#767676]">No time slots yet.</p>;
  }

  const order = DAYS.map(d => d.key);
  const groups = new Map<string, { days: DayKey[]; slots: TimeSlot[] }>();
  for (const slot of priced) {
    const key = [...slot.days].sort((a, b) => order.indexOf(a) - order.indexOf(b)).join(",");
    const existing = groups.get(key);
    if (existing) existing.slots.push(slot);
    else groups.set(key, { days: slot.days, slots: [slot] });
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {[...groups.values()].map(group => {
        const segments = buildSegments(group.slots);
        return (
          <div key={group.days.join(",")} className="flex w-full items-center gap-4">
            <span className="w-[88px] shrink-0 text-sm font-medium text-[#4a5565]">
              {formatDays(group.days)}
            </span>
            <div className="flex min-w-0 flex-1 gap-1 rounded-lg border border-[#e8e8e8] p-1">
              {segments.map(seg => {
                const width = ((seg.endMin - seg.startMin) / 1440) * 100;
                const sold = seg.slot !== null;
                const price = Number(seg.slot?.pricePerDay);
                return (
                  <div
                    key={`${seg.startMin}-${seg.endMin}`}
                    style={{ width: `${width}%` }}
                    title={seg.slot?.name}
                    className={`min-w-0 overflow-hidden rounded-md px-2 py-1.5 ${
                      sold ? "bg-[#3a47c2] text-white" : "bg-white text-[#767676]"
                    }`}>
                    <p className="truncate text-[11px] leading-[18px]">
                      {formatRange(seg.startMin, seg.endMin)}
                    </p>
                    <p className={`truncate text-sm leading-5 ${sold ? "font-semibold" : ""}`}>
                      {sold ? (price > 0 ? `$${price}` : "Not priced") : "No ads"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <p className="text-xs text-[#767676]">Prices are per day.</p>
    </div>
  );
}
