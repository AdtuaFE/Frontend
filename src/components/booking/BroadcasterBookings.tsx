import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { CalendarCheck, ChevronRight, CircleCheck, CirclePlay, CircleX, Clock, Search } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { fmtRange, type Booking as CampaignBooking } from "@/components/campaigns/campaignData";
import { useBookingPlaces } from "@/components/campaigns/useBookingPlaces";
import { fmtPrice } from "@/components/browse/browseData";
import { Btn } from "@/components/browse/primitives";
import { advertiserStatus, hoursLeft, hoursLeftLabel, STATUS_LOOK, type AdvertiserStatus } from "./bookingStatus";
import { TonePill, cardCn } from "./bookingUi";
import { OfferSheet, type OfferBooking } from "./OfferSheet";

export type BroadcasterBooking = CampaignBooking & { created_at: string; needs_resolution?: boolean };

type Tab = "all" | "waiting" | "approved" | "past";
type Sort = "due" | "earn" | "start";

const thCn = "whitespace-nowrap border-b border-[#e3e5ea] bg-[#f8faff] px-4 py-3 text-left text-xs font-medium leading-4 text-[#656972]";
const tdCn = "border-b border-[#f1f2f7] px-4 py-4 align-top text-sm leading-5 text-[#4a4d56]";
const initials = (s: string) => s.replace(/[^A-Za-z0-9 ]/g, "").split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "AD";

const STATUS_ICON: Partial<Record<AdvertiserStatus, typeof Clock>> = {
  scheduled: CalendarCheck, playing: CirclePlay, completed: CircleCheck, declined: CircleX, withdrawn: CircleX, expired: CircleX,
};
const STATUS_COLOR: Record<string, string> = {
  success: "text-[#016d36]", brand: "text-[#3a47c2]", neutral: "text-[#4a4d56]", warning: "text-[#7c5003]", danger: "text-[#aa0f16]",
};

function StatusText({ status }: { status: AdvertiserStatus }) {
  const look = STATUS_LOOK[status];
  const Icon = STATUS_ICON[status] ?? Clock;
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium leading-4", STATUS_COLOR[look.tone])}><Icon aria-hidden className="h-4 w-4" />{look.label}</span>;
}

/** What the broadcaster sees on Bookings: requests waiting on them first, then approved and past ones. */
export function BroadcasterBookings({ bookings }: { bookings: BroadcasterBooking[] }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [screenFilter, setScreenFilter] = useState("all");
  const [sort, setSort] = useState<Sort>("due");
  const [open, setOpen] = useState<BroadcasterBooking | null>(null);
  const { place, slot } = useBookingPlaces(bookings);

  // The advertiser's name isn't on a booking, so it comes from the campaign when that's readable.
  const campaignIds = [...new Set(bookings.map(b => b.campaign_id))];
  const campaignQs = useQueries({
    queries: campaignIds.map(id => ({
      queryKey: ["campaign-name", id],
      queryFn: () => api.get<{ name: string }>(`/api/campaigns/${id}`),
      retry: false,
      staleTime: 5 * 60_000,
    })),
  });
  const names = new Map(campaignIds.map((id, i) => [id, campaignQs[i]?.data?.name]));
  const who = (b: BroadcasterBooking) => names.get(b.campaign_id) ?? `Request #${b.id}`;

  const slotNames = (b: BroadcasterBooking) =>
    [...new Set((b.booking_slots ?? []).map(s => slot(s.slot_id)?.label).filter(Boolean))].join(", ") || "—";

  const rows = useMemo(() => bookings.map(b => ({
    b, status: advertiserStatus(b),
  })), [bookings]);
  const waiting = rows.filter(r => r.status === "waiting");
  const approved = rows.filter(r => r.status === "scheduled" || r.status === "playing");
  const past = rows.filter(r => !["waiting", "scheduled", "playing", "not_approved"].includes(r.status));
  const byDue = (a: typeof rows[number], z: typeof rows[number]) => hoursLeft(a.b.created_at) - hoursLeft(z.b.created_at);

  const pool = tab === "waiting" ? waiting : tab === "approved" ? approved : tab === "past" ? past : rows;
  const screens = [...new Set(bookings.map(b => place(b).screen).filter(Boolean))];
  const q = query.trim().toLowerCase();
  const shown = pool
    .filter(r => (!q || who(r.b).toLowerCase().includes(q) || place(r.b).screen.toLowerCase().includes(q) || place(r.b).name.toLowerCase().includes(q))
      && (screenFilter === "all" || place(r.b).screen === screenFilter))
    .sort((a, z) => sort === "earn" ? Number(z.b.total_price) - Number(a.b.total_price)
      : sort === "start" ? a.b.start_date.localeCompare(z.b.start_date) : byDue(a, z));

  const openBooking = (b: BroadcasterBooking, status: AdvertiserStatus) => {
    if (status === "waiting") setOpen(b); else navigate(`/bookings/${b.id}`);
  };

  const Card = ({ b }: { b: BroadcasterBooking }) => {
    const left = hoursLeftLabel(b.created_at);
    const p = place(b);
    return (
      <button type="button" onClick={() => setOpen(b)} className={cn(cardCn, "flex min-w-0 flex-col gap-4 p-4 text-left transition-colors hover:border-[#3a47c2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3a47c2]")}>
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-sm font-medium leading-5 text-[#1a1d25]">{who(b)}</span>
          <TonePill tone={left.tone}><Clock aria-hidden className="mr-1 h-3 w-3" />{left.text}</TonePill>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm leading-5 text-[#4a4d56]">{[p.screen || p.name, slotNames(b)].join(", ")}</span>
          <span className="text-xs leading-4 text-[#656972]">{fmtRange(b.start_date, b.end_date)}</span>
        </div>
        <hr className="m-0 border-0 border-t border-[#e3e5ea]" />
        <div className="flex items-center justify-between">
          <span className="text-sm leading-5 text-[#656972]">Booking total</span>
          <span className="text-base font-semibold leading-6 tabular-nums text-[#1a1d25]">{fmtPrice(Number(b.total_price))}</span>
        </div>
      </button>
    );
  };

  const table = (list: typeof rows, withDue: boolean) => (
    <div className="w-full overflow-x-auto rounded-xl border border-[#e3e5ea] bg-white">
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr>
            <th className={thCn}>Advertiser</th><th className={thCn}>Time slots</th>
            {!withDue && <th className={thCn}>Status</th>}
            <th className={thCn}>Dates</th>
            {withDue && <th className={thCn}>Answer due</th>}
            <th className={`${thCn} text-right`}>Booking total</th><th className={thCn}><span className="sr-only">Open</span></th>
          </tr>
        </thead>
        <tbody>
          {list.map(({ b, status }) => {
            const p = place(b);
            const left = status === "waiting" ? hoursLeftLabel(b.created_at) : null;
            return (
              <tr key={b.id} onClick={() => openBooking(b, status)} className="cursor-pointer hover:bg-[#f8faff]">
                <td className={tdCn}>
                  <span className="flex items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f2f5ff] text-xs font-medium text-[#3a47c2]">{initials(who(b))}</span>
                    <span className="min-w-0"><b className="block truncate font-medium text-[#1a1d25]">{who(b)}</b><span className="block truncate text-xs leading-4 text-[#656972]">{p.screen || p.name}</span></span>
                  </span>
                </td>
                <td className={tdCn}>{slotNames(b)}</td>
                {!withDue && <td className={tdCn}><StatusText status={status} /></td>}
                <td className={`${tdCn} whitespace-nowrap`}>{fmtRange(b.start_date, b.end_date)}</td>
                {withDue && <td className={tdCn}>{left && <TonePill tone={left.tone}>{left.text}</TonePill>}</td>}
                <td className={`${tdCn} text-right font-medium tabular-nums text-[#1a1d25]`}>{fmtPrice(Number(b.total_price))}</td>
                <td className={`${tdCn} w-6 pl-0`}>
                  <button type="button" aria-label={`Open ${who(b)}`} onClick={e => { e.stopPropagation(); openBooking(b, status); }}
                    className="grid h-6 w-6 place-items-center rounded text-[#656972] hover:text-[#1a1d25] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3a47c2]">
                    <ChevronRight aria-hidden className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "all", label: "All" }, { key: "waiting", label: "Waiting on you", count: waiting.length },
    { key: "approved", label: "Approved", count: approved.length }, { key: "past", label: "Past" },
  ];
  const many = tab !== "all" || waiting.length > 6;
  const sheetBooking = open as unknown as OfferBooking | null;

  return (
    <div className="flex min-w-0 flex-col gap-6 pb-14 pt-2 text-[#1a1d25]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="m-0 text-2xl font-semibold leading-8 tracking-[-0.01em]">Bookings</h1>
        <div role="group" aria-label="Show" className="inline-flex overflow-hidden rounded-lg border border-[#f1f2f7]">
          {tabs.map((t, i) => (
            <button key={t.key} type="button" aria-pressed={tab === t.key} onClick={() => setTab(t.key)}
              className={cn("flex h-8 items-center gap-2 px-3 text-sm leading-5 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#3a47c2]",
                i > 0 && "border-l border-[#f1f2f7]", tab === t.key ? "bg-[#f8faff] font-medium text-[#4a4d56]" : "bg-white text-[#656972]")}>
              {t.label}
              {t.count != null && t.count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#f1f2f7] px-1 text-xs font-medium tabular-nums text-[#4a4d56]">{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {bookings.length === 0 && <p className="m-0 py-16 text-center text-sm text-[#656972]">No bookings yet. Requests for your screens show up here.</p>}

      {bookings.length > 0 && tab !== "all" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex h-10 min-w-[260px] items-center gap-2 rounded-lg border border-[#8f929d] bg-white px-3 text-sm focus-within:border-[#3a47c2]">
            <Search aria-hidden className="h-4 w-4 text-[#656972]" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search advertisers or screens" aria-label="Search advertisers or screens"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#656972]" />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Screen" value={screenFilter} onChange={e => setScreenFilter(e.target.value)}
              className="h-8 rounded-lg border border-[#d2d4d9] bg-white px-2 text-xs font-medium">
              <option value="all">Screen: All</option>
              {screens.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select aria-label="Sort" value={sort} onChange={e => setSort(e.target.value as Sort)}
              className="h-8 rounded-lg border border-[#d2d4d9] bg-white px-2 text-xs font-medium">
              <option value="due">Sort: Answer due, soonest</option>
              <option value="earn">Sort: Booking total, highest</option>
              <option value="start">Sort: Start date</option>
            </select>
          </div>
        </div>
      )}

      {tab === "all" ? (
        <>
          {waiting.length > 0 && (
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <h2 className="m-0 text-base font-semibold leading-6">Waiting on you</h2>
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#f1f2f7] px-1 text-xs font-medium tabular-nums text-[#4a4d56]">{waiting.length}</span>
                  <span className="text-sm leading-5 text-[#656972]">Soonest answer first</span>
                </div>
                {waiting.length > 3 && <Btn variant="link" className="text-sm" onClick={() => setTab("waiting")}>View all</Btn>}
              </div>
              {many ? table([...waiting].sort(byDue).slice(0, 8), true) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {[...waiting].sort(byDue).slice(0, 3).map(r => <Card key={r.b.id} b={r.b} />)}
                </div>
              )}
            </section>
          )}
          {approved.length > 0 && (
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2"><h2 className="m-0 text-base font-semibold leading-6">Approved</h2>
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#f1f2f7] px-1 text-xs font-medium tabular-nums text-[#4a4d56]">{approved.length}</span></div>
              {table(approved, false)}
            </section>
          )}
          {past.length > 0 && (
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2"><h2 className="m-0 text-base font-semibold leading-6">Past</h2>
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#f1f2f7] px-1 text-xs font-medium tabular-nums text-[#4a4d56]">{past.length}</span></div>
              {table(past, false)}
            </section>
          )}
          {rows.some(r => r.status === "not_approved") && (
            <p className="m-0 text-sm text-[#4a4d56]">Some requests are with the advertiser to move or drop. <Link to="/bookings" className="text-[#3a47c2] hover:underline">They'll show here once settled.</Link></p>
          )}
        </>
      ) : shown.length === 0 ? (
        <p className="m-0 py-16 text-center text-sm text-[#656972]">{q || screenFilter !== "all" ? "Nothing matches that search." : tab === "waiting" ? "Nothing is waiting on you." : "Nothing here yet."}</p>
      ) : table(shown, tab === "waiting")}

      <OfferSheet booking={sheetBooking} advertiser={open ? who(open) : ""} place={open ? place(open) : { name: "", screen: "" }} slot={slot} onClose={() => setOpen(null)} />
    </div>
  );
}
