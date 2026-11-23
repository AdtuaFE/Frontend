import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Info, OctagonAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Btn } from "@/components/browse/primitives";
import { datesBetween, fmtDay, fmtSpan, isoOf, minStart, weekday } from "./bookingFlow";
import { AvailabilityBadge } from "./bookingUi";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Month grid cells, Monday first: null for the blanks before the 1st. */
function monthCells(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => isoOf(new Date(Date.UTC(year, month, i + 1)))),
  ];
}

/**
 * The "Booking dates" picker. Days before the notice cutoff and weekdays the screen doesn't play
 * are struck through. Tapping a day that's too soon says why, and Apply stays off until the start
 * moves to the earliest allowed day.
 */
export function DatesDialog({ open, onOpenChange, title, start, end, openDays, campaignDates, onApply }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  start: string | null;
  end: string | null;
  /** Weekdays (1 = Monday) the screen has time slots on. */
  openDays: Set<number>;
  campaignDates: { start: string; end: string } | null;
  onApply: (start: string, end: string) => void;
}) {
  const earliest = minStart();
  const [from, setFrom] = useState<string | null>(start);
  const [to, setTo] = useState<string | null>(end);
  const [tooSoon, setTooSoon] = useState<string | null>(null);
  const initial = start ?? earliest;
  const [view, setView] = useState(() => ({ y: Number(initial.slice(0, 4)), m: Number(initial.slice(5, 7)) - 1 }));

  useEffect(() => {
    if (!open) return;
    setFrom(start);
    setTo(end);
    setTooSoon(start && start < earliest ? start : null);
    const s = start ?? earliest;
    setView({ y: Number(s.slice(0, 4)), m: Number(s.slice(5, 7)) - 1 });
  }, [open, start, end, earliest]);

  const pick = (d: string) => {
    if (d < earliest) { setTooSoon(d); setFrom(d); setTo(null); return; }
    setTooSoon(null);
    if (!from || (from && to) || d < from || (from < earliest)) { setFrom(d); setTo(null); return; }
    setTo(d);
  };

  const rangeEnd = to ?? from;
  const shift = (by: number) => setView(v => {
    const m = v.m + by;
    return { y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
  });
  const canPrev = `${view.y}-${String(view.m + 1).padStart(2, "0")}` > earliest.slice(0, 7);

  const cells = monthCells(view.y, view.m);
  const valid = !!from && !!rangeEnd && from >= earliest;
  const allDates = from && rangeEnd ? datesBetween(from, rangeEnd) : [];
  const open_ = allDates.filter(d => openDays.has(weekday(d))).length;

  const resetToCampaign = () => {
    if (!campaignDates) return;
    const s = campaignDates.start < earliest ? earliest : campaignDates.start;
    if (campaignDates.end < s) return;
    setFrom(s); setTo(campaignDates.end); setTooSoon(null);
    setView({ y: Number(s.slice(0, 4)), m: Number(s.slice(5, 7)) - 1 });
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(26,29,37,0.4)]" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-32px)] w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col gap-6 overflow-y-auto rounded-xl border border-[#e3e5ea] bg-white p-6 text-[#1a1d25] shadow-[0_8px_24px_rgba(26,29,37,0.16)]">
          <div className="flex items-center justify-between gap-4">
            <DialogPrimitive.Title className="m-0 text-base font-semibold leading-6">Dates for {title}</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-[#4a4d56] hover:bg-[#f8faff] hover:text-[#1a1d25]">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="sr-only">Pick the first and last day of the request.</DialogPrimitive.Description>

          {tooSoon ? (
            <div role="alert" className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-2 rounded-lg bg-[#fef3f1] p-3">
              <OctagonAlert aria-hidden className="h-4 w-4 text-[#aa0f16]" />
              <p className="m-0 text-xs leading-4">{fmtDay(tooSoon)} is too soon. Pick {fmtDay(earliest)} or later.</p>
            </div>
          ) : (
            <div role="status" className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-2 rounded-lg bg-[#f1f2f7] p-3">
              <Info aria-hidden className="h-4 w-4 text-[#4a4d56]" />
              <p className="m-0 text-xs leading-4">Requests need at least 3 days of notice. Your earliest start is {fmtDay(earliest)}.</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <button type="button" aria-label="Previous month" disabled={!canPrev} onClick={() => shift(-1)}
                className="grid h-8 w-8 place-items-center rounded-lg text-[#4a4d56] hover:bg-[#f8faff] disabled:text-[#8f929d] disabled:hover:bg-transparent">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium leading-5">{MONTHS[view.m]} {view.y}</span>
              <button type="button" aria-label="Next month" onClick={() => shift(1)}
                className="grid h-8 w-8 place-items-center rounded-lg text-[#4a4d56] hover:bg-[#f8faff]">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7" aria-hidden>
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i} className="grid h-8 place-items-center text-xs font-medium leading-4 text-[#656972]">{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1" role="grid" aria-label={`${MONTHS[view.m]} ${view.y}`}>
              {cells.map((d, i) => {
                if (!d) return <span key={i} />;
                const soon = d < earliest;
                const closed = !openDays.has(weekday(d));
                const isStart = d === from;
                const isEnd = !!to && d === to;
                const inside = !!from && !!rangeEnd && d > from && d < rangeEnd;
                const col = i % 7;
                const bad = soon && d === tooSoon;
                return (
                  // The cell draws the range band; the button inside draws the start/end circle.
                  <div key={d} className={cn(
                    "relative h-11",
                    inside && "bg-[#f2f5ff]",
                    inside && col === 0 && "rounded-l-full",
                    inside && col === 6 && "rounded-r-full",
                  )}>
                    {isStart && !bad && rangeEnd && rangeEnd !== from && col !== 6 && <span aria-hidden className="absolute inset-y-0 left-1/2 right-0 bg-[#f2f5ff]" />}
                    {isEnd && from !== to && col !== 0 && <span aria-hidden className="absolute inset-y-0 left-0 right-1/2 bg-[#f2f5ff]" />}
                    <button type="button" onClick={() => pick(d)}
                      aria-label={`${fmtDay(d)}${soon ? ", too soon" : closed ? ", the screen doesn't play this day" : ""}`}
                      aria-pressed={isStart || isEnd || inside}
                      className={cn(
                        "relative mx-auto grid h-11 w-11 max-w-full place-items-center rounded-full text-sm leading-5 tabular-nums",
                        "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#3a47c2]",
                        (soon || closed) && !isStart && !isEnd && "text-[#8f929d] line-through",
                        (isStart || isEnd) && !bad && "bg-[#3a47c2] font-medium text-white no-underline",
                        bad && "text-[#aa0f16] no-underline outline outline-2 -outline-offset-2 outline-[#c92324]",
                      )}>
                      {Number(d.slice(8))}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs leading-4 text-[#4a4d56]">
            <span className="inline-flex items-center gap-2"><i className="h-4 w-4 rounded-full bg-[#3a47c2]" />Start and end</span>
            <span className="inline-flex items-center gap-2"><i className="h-4 w-4 rounded-full bg-[#f2f5ff]" />Your dates</span>
            <span className="inline-flex items-center gap-2"><i className="h-4 w-4 rounded-full shadow-[inset_0_0_0_1px_#d2d4d9]" />Closed or too soon</span>
          </div>

          <hr className="m-0 border-0 border-t border-[#e3e5ea]" />

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-base font-semibold leading-6">
                {from ? fmtSpan(from, rangeEnd ?? from) : "Pick a start day"}
              </span>
              {valid && <AvailabilityBadge open={open_} total={allDates.length} />}
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              {campaignDates && <Btn onClick={resetToCampaign}>Reset to campaign dates</Btn>}
              <Btn variant="primary" disabled={!valid || open_ === 0}
                onClick={() => { onApply(from!, rangeEnd!); onOpenChange(false); }}>
                Apply
              </Btn>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

