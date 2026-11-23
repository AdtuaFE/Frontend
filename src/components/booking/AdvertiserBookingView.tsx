import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Clock, ImageIcon, Info, MapPin, Monitor, RectangleHorizontal, RectangleVertical, TriangleAlert, Upload } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { spotsFor } from "@/lib/creative";
import { fmtPrice, orientation, sizeInches } from "@/components/browse/browseData";
import { Btn } from "@/components/browse/primitives";
import { addDays, daysIn, daysLabel, fmtDay, fmtSpan, timeLabel } from "./bookingFlow";
import { advertiserStatus, answerDeadline, isReturned } from "./bookingStatus";
import { Banner, Crumbs, KeyValues, StatusPill, Timeline, TonePill, cardCn } from "./bookingUi";
import { screenTitle } from "./ScreenDetail";

export type ViewBookingSlot = {
  slot_id: number;
  daily_playbacks_allocated: number;
  play_count?: number | null;
  reserved_price: number | string;
  status: string;
};

export type ViewBooking = {
  id: number;
  campaign_id: number;
  status: string;
  start_date: string;
  end_date: string;
  total_price: number | string | null;
  created_at: string;
  needs_resolution?: boolean;
  booking_slots?: ViewBookingSlot[];
};

export type ViewSlot = { id: number; screen_id?: number; label: string; day_of_week: number; start_time: string; end_time: string };

type ViewSpace = {
  id: number;
  name: string;
  address_line1?: string | null;
  city?: string | null;
  width_px?: number | null;
  height_px?: number | null;
  size_label?: string | null;
};

const SLOT_LOOK: Record<string, { label: string; tone: "warning" | "success" | "neutral" | "danger" }> = {
  pending: { label: "Waiting", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Not approved", tone: "warning" },
  dropped: { label: "Dropped", tone: "neutral" },
  rescheduled: { label: "Moved", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * The advertiser's booking detail from the booking flow boards (Waiting, Not approved, Dropped
 * and the rest): banner, booking card with the time slots, the screen, money and activity.
 */
export function AdvertiserBookingView({
  booking, campaign, space, image, slots, screens, ad, onWithdraw, withdrawing, onDrop, onMove, slotBusy,
  onUpload, uploading, uploadBlocked, adsSection, reviewsSection,
}: {
  booking: ViewBooking;
  campaign: { id: number; name: string } | undefined;
  space: ViewSpace | undefined;
  image: string | null;
  slots: ViewSlot[];
  screens: { id: number; label: string }[];
  ad: { url: string; mime: string; seconds: number | null } | null;
  onWithdraw: () => void;
  withdrawing: boolean;
  onDrop: (slotIds: number[]) => void;
  onMove: (slotId: number) => void;
  slotBusy: boolean;
  onUpload: () => void;
  uploading: boolean;
  uploadBlocked?: string;
  adsSection: ReactNode;
  reviewsSection: ReactNode;
}) {
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const status = advertiserStatus(booking);
  const total = Number(booking.total_price) || 0;
  const bss = booking.booking_slots ?? [];
  const slotOf = (id: number) => slots.find(s => s.id === id);
  const screenId = bss.map(b => slotOf(b.slot_id)?.screen_id).find(Boolean);
  const screen = screens.find(s => s.id === screenId) ?? null;
  const title = space ? screenTitle(space, screen) : `Booking ${booking.id}`;
  const spots = spotsFor(ad?.seconds ?? 15);
  const deadline = answerDeadline(booking.created_at);
  const rejected = bss.filter(b => b.status === "rejected");
  const name = space?.name ?? "The broadcaster";

  // One row per time slot, the weekday rows folded together like the request was made.
  const groups = new Map<string, { label: string; days: number[]; start: string; end: string; rows: ViewBookingSlot[] }>();
  for (const b of bss) {
    const s = slotOf(b.slot_id);
    const key = s ? `${s.label}|${s.start_time}|${s.end_time}` : `#${b.slot_id}`;
    const g = groups.get(key) ?? { label: s?.label ?? `Slot ${b.slot_id}`, days: [], start: s?.start_time ?? "", end: s?.end_time ?? "", rows: [] };
    g.rows.push(b);
    if (s && !g.days.includes(s.day_of_week)) g.days.push(s.day_of_week);
    groups.set(key, g);
  }
  const rows = [...groups.values()].map(g => {
    const days = g.days.length ? daysIn(booking.start_date.slice(0, 10), booking.end_date.slice(0, 10), g.days) : 0;
    const amount = g.rows.reduce((n, r) => n + Number(r.reserved_price || 0), 0);
    const first = g.rows[0];
    const plays = first.play_count ?? Math.round(first.daily_playbacks_allocated / spots);
    const statuses = [...new Set(g.rows.map(r => r.status))];
    return { ...g, days: g.days.sort((a, b) => a - b), dayCount: days, amount, plays, statuses };
  });
  const mixed = new Set(bss.map(b => b.status)).size > 1 || status === "not_approved";
  const allDays = daysIn(booking.start_date.slice(0, 10), booking.end_date.slice(0, 10), [1, 2, 3, 4, 5, 6, 7]);

  const inch = space ? sizeInches(space as never) : null;
  const orient = space ? orientation(space as never) : null;
  const address = [space?.address_line1, space?.city].filter(Boolean).join(", ");

  /* ---------- banner, money and activity by status ---------- */

  let banner: ReactNode = null;
  const similar = (
    <Link to={`/browse?campaign=${booking.campaign_id}`} className="inline-flex h-8 items-center rounded-lg border border-[#d2d4d9] bg-white px-3 text-xs font-medium hover:bg-[#f8faff]">
      Find similar screens
    </Link>
  );
  if (status === "waiting") {
    banner = (
      <Banner tone="warning" icon={Clock} title={`${name} has until the end of ${fmtDay(deadline)} to answer`}
        actions={<Btn size="sm" disabled={withdrawing} onClick={() => setConfirmWithdraw(true)}>Withdraw request</Btn>}>
        {fmtPrice(total)} is on hold. It comes back to your balance if you withdraw the request or they don't answer in time.
      </Banner>
    );
  } else if (status === "not_approved") {
    const held = rejected.reduce((n, r) => n + Number(r.reserved_price || 0), 0);
    banner = (
      <Banner tone="warning" icon={TriangleAlert}
        title={rejected.length === bss.length ? `${name} didn't approve this request` : `${name} didn't approve ${rejected.length === 1 ? "a time slot" : `${rejected.length} time slots`}`}
        actions={<>
          {rejected.length === 1 && <Btn size="sm" variant="primary" disabled={slotBusy} onClick={() => onMove(rejected[0].slot_id)}>Move to another time slot</Btn>}
          <Btn size="sm" disabled={slotBusy} onClick={() => onDrop(rejected.map(r => r.slot_id))}>
            {rejected.length === bss.length ? "Drop booking" : rejected.length === 1 ? "Drop time slot" : "Drop these time slots"}
          </Btn>
        </>}>
        {fmtPrice(held)} stays on hold. Move {rejected.length === 1 ? "it" : "them"} to another time slot or drop {rejected.length === 1 ? "it" : "them"} to get the money back. Anything left is dropped automatically 48 hours after it was turned down.
      </Banner>
    );
  } else if (status === "withdrawn") {
    banner = <Banner tone="info" icon={Info} title="You withdrew this request" actions={similar}>{fmtPrice(total)} went back to your balance.</Banner>;
  } else if (status === "declined") {
    banner = <Banner tone="info" icon={Info} title={`${name} said no to this request`} actions={similar}>{fmtPrice(total)} went back to your balance.</Banner>;
  } else if (status === "expired") {
    banner = <Banner tone="info" icon={Info} title={`${name} didn't answer in time`} actions={similar}>{fmtPrice(total)} went back to your balance.</Banner>;
  }

  const moneyRows: [string, string][] = [["Booking total", fmtPrice(total)]];
  if (status === "waiting" || status === "not_approved") moneyRows.push(["On hold", fmtPrice(total)]);
  else if (status === "scheduled") moneyRows.push(["Paid when it plays", fmtPrice(total)]);
  else if (status === "playing") {
    const ran = Math.min(1, Math.max(0, daysIn(booking.start_date.slice(0, 10), new Date().toISOString().slice(0, 10), [1, 2, 3, 4, 5, 6, 7]) / Math.max(1, allDays)));
    moneyRows.push(["Spent so far", fmtPrice(total * ran)], ["Still to play", fmtPrice(total * (1 - ran))]);
  } else if (status === "completed") moneyRows.push(["Spent", fmtPrice(total)]);
  else if (isReturned(status)) moneyRows.push(["Returned", fmtPrice(total)]);

  const activity: { title: string; time?: string; now?: boolean }[] = [];
  if (status === "waiting") activity.push({ title: `Waiting for ${name}`, time: `Answer due by the end of ${fmtDay(deadline)}`, now: true });
  if (status === "not_approved") activity.push({ title: `${rejected.length === 1 ? "A time slot" : `${rejected.length} time slots`} not approved`, now: true });
  if (status === "scheduled") activity.push({ title: "Approved, starts playing soon", time: `Starts ${fmtDay(booking.start_date.slice(0, 10))}`, now: true });
  if (status === "playing") activity.push({ title: "Playing", time: `Since ${fmtDay(booking.start_date.slice(0, 10))}`, now: true });
  if (status === "completed") activity.push({ title: "Completed", time: fmtDay(booking.end_date.slice(0, 10)), now: true });
  if (status === "withdrawn") activity.push({ title: `Withdrawn, ${fmtPrice(total)} returned`, now: true });
  if (status === "declined") activity.push({ title: `Declined, ${fmtPrice(total)} returned`, now: true });
  if (status === "expired") activity.push({ title: `Expired, ${fmtPrice(total)} returned`, time: fmtDay(addDays(deadline, 1)), now: true });
  activity.push({ title: `Request sent, ${fmtPrice(total)} on hold`, time: fmtWhen(booking.created_at) });

  return (
    <div className="flex min-w-0 flex-col gap-6 pb-14 pt-2 text-[#1a1d25]">
      <Crumbs items={[
        { label: "Campaigns", to: "/campaigns" },
        ...(campaign ? [{ label: campaign.name, to: `/campaigns/${campaign.id}` }] : []),
        { label: title },
      ]} />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="m-0 text-2xl font-semibold leading-8 tracking-[-0.01em]">{title}</h1>
        <StatusPill status={status} />
      </div>
      {banner}

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className={cn(cardCn, "flex flex-col gap-6 p-6")}>
            <h2 className="m-0 text-base font-semibold leading-6">Booking</h2>
            <div className="flex flex-wrap items-start gap-6">
              <div className="flex flex-col gap-2">
                <span className="text-xs leading-4 text-[#656972]">Dates</span>
                <span className="text-sm font-medium leading-5">{fmtSpan(booking.start_date.slice(0, 10), booking.end_date.slice(0, 10))}</span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs leading-4 text-[#656972]">Ad</span>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative grid aspect-video w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#1a1d25] text-[#8f929d]">
                    {ad ? (ad.mime.startsWith("video/")
                      ? <video src={ad.url} muted playsInline className="h-full w-full object-cover" />
                      : <img src={ad.url} alt="" className="h-full w-full object-cover" />)
                      : <ImageIcon aria-hidden className="h-5 w-5" />}
                    {ad?.seconds != null && (
                      <span className="absolute bottom-1 right-1 grid h-5 place-items-center rounded bg-[rgba(26,29,37,0.72)] px-1.5 text-xs font-medium text-white">
                        0:{String(Math.round(ad.seconds)).padStart(2, "0")}
                      </span>
                    )}
                  </div>
                  {!isReturned(status) && status !== "completed" && (
                    <Btn size="sm" className="pl-2" disabled={uploading || !!uploadBlocked} title={uploadBlocked} onClick={onUpload}>
                      <Upload aria-hidden />{uploading ? "Uploading…" : ad ? "Change ad" : "Add ad"}
                    </Btn>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#e3e5ea]">
              <table className="w-full border-collapse text-sm leading-5 text-[#4a4d56]">
                <thead>
                  <tr className="bg-[#f8faff] text-xs font-medium leading-4 text-[#656972]">
                    <th className="whitespace-nowrap border-b border-[#e3e5ea] px-4 py-3 text-left font-medium">Time slot</th>
                    <th className="whitespace-nowrap border-b border-[#e3e5ea] px-4 py-3 text-right font-medium">Plays a day</th>
                    <th className="whitespace-nowrap border-b border-[#e3e5ea] px-4 py-3 text-right font-medium">Price a day</th>
                    <th className="whitespace-nowrap border-b border-[#e3e5ea] px-4 py-3 text-right font-medium">Days</th>
                    <th className="whitespace-nowrap border-b border-[#e3e5ea] px-4 py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.label + r.start} className="border-b border-[#f1f2f7]">
                      <td className="p-4">
                        <b className="block font-medium text-[#1a1d25]">{r.label}</b>
                        {r.days.length > 0 && <span className="mt-1 block text-xs leading-4 text-[#656972]">{daysLabel(r.days)}, {timeLabel(r.start, r.end)}</span>}
                        {mixed && (
                          <span className="mt-2 flex flex-wrap items-center gap-2">
                            {r.statuses.map(s => <TonePill key={s} tone={SLOT_LOOK[s]?.tone ?? "neutral"}>{SLOT_LOOK[s]?.label ?? s}</TonePill>)}
                            {status === "not_approved" && r.statuses.includes("rejected") && rejected.length > 1 && (
                              <>
                                <Btn size="sm" variant="link" disabled={slotBusy} onClick={() => onMove(r.rows.find(x => x.status === "rejected")!.slot_id)}>Move</Btn>
                                <Btn size="sm" variant="link" disabled={slotBusy} onClick={() => onDrop(r.rows.filter(x => x.status === "rejected").map(x => x.slot_id))}>Drop</Btn>
                              </>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right tabular-nums">{r.plays}</td>
                      <td className="p-4 text-right tabular-nums">{r.dayCount ? fmtPrice(r.amount / r.dayCount) : "—"}</td>
                      <td className="p-4 text-right tabular-nums">{r.dayCount || "—"}</td>
                      <td className={cn("p-4 text-right font-medium tabular-nums text-[#1a1d25]", r.statuses.every(s => s === "dropped" || s === "cancelled" || s === "rescheduled") && "font-normal text-[#656972] line-through")}>
                        {fmtPrice(r.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#f8faff] text-sm font-medium text-[#1a1d25]">
                    <td className="border-t border-[#e3e5ea] p-4">Total for {allDays} day{allDays === 1 ? "" : "s"}</td>
                    <td className="border-t border-[#e3e5ea]" /><td className="border-t border-[#e3e5ea]" /><td className="border-t border-[#e3e5ea]" />
                    <td className="border-t border-[#e3e5ea] p-4 text-right tabular-nums">{fmtPrice(total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className={cn(cardCn, "flex flex-col gap-4 p-6")}>
            <h2 className="m-0 text-base font-semibold leading-6">Screen</h2>
            <div className="flex flex-wrap items-start gap-6">
              <div className="relative grid h-[120px] w-40 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#f1f2f7] text-[#8f929d]">
                {image ? <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <ImageIcon aria-hidden className="h-6 w-6" />}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm leading-5 sm:grid-cols-2 [&_svg]:h-5 [&_svg]:w-5 [&_svg]:shrink-0 [&_svg]:text-[#656972]">
                  {inch != null && <span className="flex items-center gap-3"><Monitor aria-hidden />{inch} in</span>}
                  {orient && (
                    <span className="flex items-center gap-3">
                      {orient === "landscape" ? <RectangleHorizontal aria-hidden /> : <RectangleVertical aria-hidden />}
                      {orient === "landscape" ? "Landscape" : "Portrait"}
                    </span>
                  )}
                  {address && <span className="flex items-center gap-3"><MapPin aria-hidden />{address}</span>}
                </div>
                {space && (
                  <Link to={`/spaces/${space.id}${screen ? `?screen=${screen.id}` : ""}`} className="self-start text-sm font-medium text-[#3a47c2] hover:text-[#2e399f] hover:underline hover:underline-offset-[3px]">
                    View space
                  </Link>
                )}
              </div>
            </div>
          </section>

          {adsSection}
          {reviewsSection}
        </div>

        <div className="flex flex-col gap-6">
          <section className={cn(cardCn, "flex flex-col gap-4 p-6")}>
            <h2 className="m-0 text-base font-semibold leading-6">Money</h2>
            <KeyValues total rows={moneyRows} />
          </section>
          <section className={cn(cardCn, "flex flex-col gap-4 p-6")}>
            <h2 className="m-0 text-base font-semibold leading-6">Activity</h2>
            <Timeline items={activity} />
          </section>
        </div>
      </div>

      <AlertDialog open={confirmWithdraw} onOpenChange={setConfirmWithdraw}>
        <AlertDialogContent className="max-w-[440px] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw this request?</AlertDialogTitle>
            <AlertDialogDescription>{name} won't be able to answer it, and {fmtPrice(total)} goes back to your balance.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep request</AlertDialogCancel>
            <AlertDialogAction onClick={onWithdraw} className="bg-[#3a47c2] text-white hover:bg-[#2e399f]">Withdraw request</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
