import { useEffect, useMemo, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Info, Play, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { fmtPrice } from "@/components/browse/browseData";
import { Btn, CheckMark } from "@/components/browse/primitives";
import { daysIn, daysLabel, fmtDay, timeLabel } from "./bookingFlow";
import { answerDeadline, hoursLeftLabel } from "./bookingStatus";
import { Callout, KeyValues } from "./bookingUi";
import type { ViewBooking, ViewBookingSlot, ViewSlot } from "./AdvertiserBookingView";

type Asset = { id: number; signed_url: string; mime_type: string; duration_seconds?: number | null; status: string };

export type OfferBooking = ViewBooking & { booking_slots?: ViewBookingSlot[] };

type Group = { key: string; label: string; days: number[]; start: string; end: string; rows: ViewBookingSlot[] };

/**
 * The broadcaster's request side sheet: the ad, each time slot with a tick to approve it, and what
 * the booking is worth. Unticked slots are turned down; the advertiser then moves or drops them.
 * Declining it all is a second step.
 */
export function OfferSheet({ booking, advertiser, place, slot, onClose }: {
  booking: OfferBooking | null;
  advertiser: string;
  place: { name: string; screen: string };
  slot: (id: number) => ViewSlot | undefined;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<"review" | "decline">("review");
  const [busy, setBusy] = useState(false);

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["booking-assets", booking?.id],
    queryFn: () => api.get<Asset[]>(`/api/bookings/${booking!.id}/assets`),
    enabled: !!booking,
  });
  const ad = assets.find(a => a.status === "active" || a.status === "pending_review") ?? assets[0] ?? null;

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    for (const r of booking?.booking_slots ?? []) {
      const s = slot(r.slot_id);
      const key = s ? `${s.label}|${s.start_time}|${s.end_time}` : `#${r.slot_id}`;
      const g = map.get(key) ?? { key, label: s?.label ?? `Slot ${r.slot_id}`, days: [], start: s?.start_time ?? "", end: s?.end_time ?? "", rows: [] };
      g.rows.push(r);
      if (s && !g.days.includes(s.day_of_week)) g.days.push(s.day_of_week);
      map.set(key, g);
    }
    return [...map.values()].map(g => ({ ...g, days: g.days.sort((a, b) => a - b) }));
  }, [booking, slot]);

  useEffect(() => {
    setTicked(new Set(groups.map(g => g.key)));
    setStep("review");
  }, [booking?.id, groups.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!booking) return null;
  const start = booking.start_date.slice(0, 10);
  const end = booking.end_date.slice(0, 10);
  const amount = (g: Group) => g.rows.reduce((n, r) => n + Number(r.reserved_price || 0), 0);
  const approved = groups.filter(g => ticked.has(g.key));
  const declined = groups.filter(g => !ticked.has(g.key));
  const approvedTotal = approved.reduce((n, g) => n + amount(g), 0);
  const left = hoursLeftLabel(booking.created_at);
  const deadline = answerDeadline(booking.created_at);
  const toggle = (k: string) => setTicked(t => { const n = new Set(t); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["bookings"] }),
    queryClient.invalidateQueries({ queryKey: ["booking", booking.id] }),
    queryClient.invalidateQueries({ queryKey: ["broadcaster-bookings"] }),
  ]);

  const submit = async () => {
    setBusy(true);
    try {
      if (approved.length === 0) {
        await api.patch(`/api/bookings/${booking.id}/status`, { status: "rejected" });
        toast.success("Request declined", { description: `${advertiser} gets ${fmtPrice(Number(booking.total_price) || 0)} back.` });
      } else {
        for (const g of groups) {
          const decision = ticked.has(g.key) ? "approved" : "rejected";
          for (const r of g.rows) {
            if (r.status !== "pending") continue;
            await api.patch(`/api/bookings/${booking.id}/slots/${r.slot_id}/review`, { decision });
          }
        }
        toast.success(declined.length ? "Approved the ticked time slots" : "Request approved",
          declined.length ? { description: `${advertiser} can move or drop the rest.` } : undefined);
      }
      await refresh();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That didn't go through");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogPrimitive.Root open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(26,29,37,0.4)]" />
        <DialogPrimitive.Content aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[400px] flex-col bg-white text-[#1a1d25] shadow-[0_8px_24px_rgba(26,29,37,0.16)]">
          <div className="flex items-center justify-between gap-2 border-b border-[#e3e5ea] py-5 pl-6 pr-4">
            <div className="flex min-w-0 items-center gap-2">
              {step === "decline" && (
                <button type="button" aria-label="Back" onClick={() => setStep("review")} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#4a4d56] hover:bg-[#f8faff]">
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <DialogPrimitive.Title className="m-0 truncate text-xl font-semibold leading-7 tracking-[-0.01em]">
                {step === "decline" ? "Decline request" : `Request from ${advertiser}`}
              </DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[#4a4d56] hover:bg-[#f8faff]">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          {step === "review" ? (
            <div className="flex flex-1 flex-col overflow-y-auto">
              <section className="flex flex-col gap-3 p-6">
                <div className="relative grid aspect-video place-items-center overflow-hidden rounded-lg bg-[#1a1d25] text-white">
                  {ad ? (ad.mime_type.startsWith("video/")
                    ? <video src={ad.signed_url} controls playsInline className="h-full w-full object-contain" />
                    : <img src={ad.signed_url} alt="" className="h-full w-full object-cover" />)
                    : <Play aria-hidden className="h-6 w-6 text-[#8f929d]" />}
                </div>
                {ad && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{ad.mime_type.startsWith("video/") ? "Video" : "Image"}{ad.duration_seconds ? `, 0:${String(Math.round(ad.duration_seconds)).padStart(2, "0")}` : ""}</span>
                  </div>
                )}
                <Callout tone="warn" title={`Answer by the end of ${fmtDay(deadline)}`}>
                  <p>{left.text}.</p>
                </Callout>
              </section>

              <section className="flex flex-col gap-3 border-t border-[#f1f2f7] p-6">
                <h3 className="m-0 text-base font-semibold leading-6">{place.screen ? `${place.screen}, ` : ""}{fmtDay(start)} to {fmtDay(end)}</h3>
                {groups.length > 1 && <span className="text-sm leading-5 text-[#656972]">Untick a time slot to approve the rest</span>}
                {groups.map(g => {
                  const on = ticked.has(g.key);
                  const id = `offer-${g.key}`;
                  const days = g.days.length ? daysIn(start, end, g.days) : 0;
                  const plays = g.rows[0]?.play_count ?? g.rows[0]?.daily_playbacks_allocated;
                  return (
                    <label key={g.key} htmlFor={id} className={cn("grid grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-lg border p-4",
                      groups.length > 1 ? "cursor-pointer" : "", on ? "border-[#3a47c2]" : "border-[#e3e5ea]")}>
                      <input id={id} type="checkbox" className="peer sr-only" checked={on} disabled={groups.length === 1} onChange={() => toggle(g.key)} />
                      <span className="rounded peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#3a47c2]"><CheckMark on={on} /></span>
                      <span className="text-sm font-medium leading-5">{g.label}</span>
                      <span className="text-sm font-medium tabular-nums">{fmtPrice(amount(g))}</span>
                      <span className="col-start-2 col-end-4 text-xs leading-4 text-[#656972]">
                        {g.days.length ? `${daysLabel(g.days)}, ${timeLabel(g.start, g.end)}. ` : ""}{plays} plays a day{days ? `, ${days} days` : ""}
                      </span>
                    </label>
                  );
                })}
                {declined.length > 0 && approved.length > 0 && (
                  <div role="status" className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-2 rounded-lg bg-[#f1f2f7] p-3">
                    <Info aria-hidden className="h-4 w-4 text-[#4a4d56]" />
                    <p className="m-0 text-xs leading-4">{declined.map(g => g.label).join(" and ")} will be turned down. {advertiser} can move {declined.length === 1 ? "it" : "them"} to another time slot or drop {declined.length === 1 ? "it" : "them"} for {fmtPrice(declined.reduce((n, g) => n + amount(g), 0))} back.</p>
                  </div>
                )}
              </section>

              <section className="flex flex-col gap-3 border-t border-[#f1f2f7] p-6">
                <h3 className="m-0 text-base font-semibold leading-6">Earnings</h3>
                <KeyValues total rows={[[approved.length ? "Booking total" : "Nothing approved", fmtPrice(approvedTotal)]]} />
                <span className="text-xs leading-4 text-[#656972]">Paid out as the ad plays.</span>
              </section>

              <section className="flex items-center gap-3 border-t border-[#f1f2f7] p-6">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f2f5ff] text-base font-medium text-[#3a47c2]">{advertiser.slice(0, 2).toUpperCase()}</span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium leading-5">{advertiser}</span>
                  <span className="text-xs leading-4 text-[#656972]">Sent {new Date(booking.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                </div>
              </section>
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
              <p className="m-0 text-sm leading-5">
                Decline the whole request? {advertiser} gets {fmtPrice(Number(booking.total_price) || 0)} back and nothing plays on your screen.
              </p>
              <KeyValues rows={[["Screen", place.screen || place.name], ["Dates", `${fmtDay(start)} to ${fmtDay(end)}`], ["Booking total", fmtPrice(Number(booking.total_price) || 0)]]} />
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-[#e3e5ea] px-6 py-4">
            {step === "review" ? (
              <>
                <Btn onClick={() => { setTicked(new Set()); setStep("decline"); }} disabled={busy}>{groups.length > 1 && approved.length > 0 ? "Decline all" : "Decline"}</Btn>
                <Btn variant="primary" className="pl-3" disabled={busy || approved.length === 0} onClick={submit}>
                  <Check aria-hidden />{busy ? "Saving…" : declined.length ? `Approve ${approved.map(g => g.label).join(" and ")} only` : "Approve request"}
                </Btn>
              </>
            ) : (
              <>
                <Btn onClick={() => { setTicked(new Set(groups.map(g => g.key))); setStep("review"); }} disabled={busy}>Back</Btn>
                <Btn className="border-[#c92324] bg-[#c92324] text-white hover:bg-[#aa0f16] active:bg-[#aa0f16]" disabled={busy} onClick={submit}>
                  {busy ? "Declining…" : "Decline request"}
                </Btn>
              </>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
