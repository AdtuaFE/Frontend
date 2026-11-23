import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  FileVideo, HardDrive, ImageIcon, Images, MapPin, Minus, Monitor, Pencil, Plus, RectangleHorizontal,
  RectangleVertical, Timer, X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CREATIVE_MAX_BYTES } from "@/lib/creative";
import { AppLayout } from "@/components/AppLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { campaignMoney, type Booking, type Campaign } from "@/components/campaigns/campaignData";
import { fmtPlay, fmtPrice, orientation, sizeInches, venueLabel } from "@/components/browse/browseData";
import { Btn, CheckMark } from "@/components/browse/primitives";
import {
  cheapestPlay, daysIn, fmtDay, fmtSpan, groupAmount, groupDayPrice, groupSchedule, groupSlots, maxPlays, minStart,
  readCapacityIssues, readDraft, saveDraft, slotsBody, useBookingQuote,
  type DraftPick, type Screen, type Slot, type SlotGroup,
} from "./bookingFlow";
import { DatesDialog } from "./DatesDialog";
import { AvailabilityBadge, Badge, Callout, Crumbs, KeyValues, Stepper, cardCn, hrCn } from "./bookingUi";

export type DetailSpace = {
  id: number;
  name: string;
  description: string | null;
  venue_type?: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  postal_code: string | null;
  address_line1: string | null;
  address_line2: string | null;
  geo_lat: number | null;
  geo_lng: number | null;
  width_px: number | null;
  height_px: number | null;
  size_label: string | null;
  file_formats_accepted?: string[] | null;
  spot_duration_seconds?: number | null;
};

const DEFAULT_PLAYS = 10;
const isGenericLabel = (l: string) => /^(screen\s*\d*|main|default)$/i.test(l.trim());

/** "Cedar Gym, lobby screen", or just the space name when the screen has a generic label. */
export const screenTitle = (space: { name: string }, screen?: { label: string } | null) =>
  screen && !isGenericLabel(screen.label) ? `${space.name}, ${screen.label.charAt(0).toLowerCase()}${screen.label.slice(1)}` : space.name;

export const spaceLede = (s: DetailSpace) => {
  const venue = s.venue_type && s.venue_type !== "other" ? venueLabel(s.venue_type) : null;
  const place = s.city ?? s.region;
  return venue && place ? `${venue} in ${place}` : venue ?? place ?? "";
};

function ratio(w: number, h: number) {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const g = gcd(w, h);
  const r = `${w / g}:${h / g}`;
  return ["16:9", "9:16", "4:3", "3:4", "21:9", "1:1"].includes(r) ? r : null;
}

function formatsLabel(list: string[] | null | undefined) {
  if (!list?.length) return "MP4, MOV, JPG, PNG";
  return [...new Set(list.map(f => f.split("/").pop()!.replace("quicktime", "mov").replace("jpeg", "jpg").toUpperCase()))].join(", ");
}

/* ---------- gallery ---------- */

function Gallery({ images }: { images: string[] }) {
  const [all, setAll] = useState(false);
  if (images.length === 0) {
    return (
      <div className="grid h-[240px] place-items-center rounded-xl bg-[#f1f2f7] text-[#8f929d] md:h-[360px]">
        <ImageIcon aria-hidden className="h-6 w-6" />
      </div>
    );
  }
  const shown = images.slice(0, 5);
  return (
    <>
      <div className={cn(
        "relative grid h-[240px] gap-2 overflow-hidden rounded-xl md:h-[360px]",
        shown.length === 1 ? "grid-cols-1" : shown.length <= 3 ? "grid-cols-[2fr_1fr] grid-rows-2" : "grid-cols-[2fr_1fr_1fr] grid-rows-2",
      )}>
        {shown.map((src, i) => (
          <div key={src} className={cn("relative overflow-hidden bg-[#f1f2f7]", i === 0 && "row-span-2", i > 0 && "hidden md:block",
            shown.length === 2 && i === 1 && "row-span-2")}>
            <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
          </div>
        ))}
        {images.length > 1 && (
          <Btn size="sm" className="absolute bottom-4 right-4 pl-2 shadow-[0_1px_3px_rgba(26,29,37,0.16)]" onClick={() => setAll(true)}>
            <Images aria-hidden />Show all {images.length} photos
          </Btn>
        )}
      </div>
      <DialogPrimitive.Root open={all} onOpenChange={setAll}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(26,29,37,0.4)]" />
          <DialogPrimitive.Content className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-xl bg-white md:inset-10">
            <div className="flex items-center justify-between border-b border-[#e3e5ea] py-4 pl-6 pr-4">
              <DialogPrimitive.Title className="m-0 text-xl font-semibold leading-7">Photos</DialogPrimitive.Title>
              <DialogPrimitive.Close aria-label="Close" className="grid h-10 w-10 place-items-center rounded-lg text-[#4a4d56] hover:bg-[#f8faff]">
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
            </div>
            <DialogPrimitive.Description className="sr-only">Every photo of this space.</DialogPrimitive.Description>
            <div className="grid flex-1 grid-cols-1 gap-2 overflow-y-auto p-6 sm:grid-cols-2">
              {images.map(src => <img key={src} src={src} alt="" className="w-full rounded-lg object-cover" />)}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}

/* ---------- location map ---------- */

function MiniMapZoom() {
  const map = useMap();
  return (
    <div className="absolute right-4 top-4 z-[1000] flex flex-col overflow-hidden rounded-lg bg-white shadow-[0_1px_3px_rgba(26,29,37,0.16)]">
      <button type="button" aria-label="Zoom in" onClick={() => map.zoomIn()} className="grid h-8 w-8 place-items-center hover:bg-[#f8faff]"><Plus className="h-4 w-4" /></button>
      <button type="button" aria-label="Zoom out" onClick={() => map.zoomOut()} className="grid h-8 w-8 place-items-center border-t border-[#e3e5ea] hover:bg-[#f8faff]"><Minus className="h-4 w-4" /></button>
    </div>
  );
}

function LocationMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  // The name is escaped: divIcon takes HTML.
  const icon = useMemo(() => L.divIcon({
    className: "",
    html: `<span class="adtua-pin adtua-pin--on">${name.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)}</span>`,
    iconSize: null as unknown as L.PointExpression,
    iconAnchor: [0, 14],
  }), [name]);
  return (
    <div className="adtua-map relative isolate h-[240px] overflow-hidden rounded-xl bg-[#f1f2f7]">
      <MapContainer center={[lat, lng]} zoom={15} zoomControl={false} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
        <Marker position={[lat, lng]} icon={icon} keyboard={false} />
        <MiniMapZoom />
      </MapContainer>
    </div>
  );
}

/* ---------- booking panel ---------- */

function SlotRow({ group, picked, plays, onToggle, onPlays, adSeconds, start, end, full }: {
  group: SlotGroup;
  picked: boolean;
  plays: number;
  onToggle: () => void;
  onPlays: (n: number) => void;
  adSeconds: number;
  start: string | null;
  end: string | null;
  full?: string | null;
}) {
  const cap = maxPlays(group, adSeconds);
  const dayPrice = groupDayPrice(group, plays, adSeconds);
  const amt = start && end ? groupAmount(group, plays, adSeconds, start, end) : null;
  const id = `slot-${group.key}`;
  return (
    <div className={cn("flex flex-col gap-3 rounded-lg border p-4", picked ? "border-[#3a47c2]" : "border-[#e3e5ea]")}>
      <label htmlFor={id} className="grid cursor-pointer grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
        <input id={id} type="checkbox" className="peer sr-only" checked={picked} onChange={onToggle} disabled={cap === 0} />
        <span className="rounded peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#3a47c2]">
          <CheckMark on={picked} />
        </span>
        <span className="text-sm font-medium leading-5">{group.label}</span>
        <span className="whitespace-nowrap text-sm leading-5 text-[#656972]">
          <b className="font-medium tabular-nums text-[#1a1d25]">{fmtPrice(dayPrice)}</b> a day
        </span>
        <span className="col-start-2 col-end-4 text-xs leading-4 text-[#656972]">
          {groupSchedule(group)}
          {full && <span className="ml-2 inline-flex align-middle"><Badge tone="warning">{full}</Badge></span>}
        </span>
      </label>
      {picked && (
        <div className="flex items-center justify-between gap-3 pl-7">
          <div className="flex items-center gap-3">
            <Stepper value={plays} max={Math.max(1, cap)} onChange={onPlays} label={`Plays a day for ${group.label}`} />
            <span className="text-sm leading-5 text-[#656972]">plays a day</span>
          </div>
          {amt && (
            <div className="text-right">
              <b className="block text-sm font-medium leading-5 tabular-nums">{fmtPrice(amt.amount)}</b>
              <span className="text-xs leading-4 text-[#656972]">for {amt.days} day{amt.days === 1 ? "" : "s"}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BookingPanel({ space, screen, slots, title }: {
  space: DetailSpace;
  screen: Screen;
  slots: Slot[];
  title: string;
}) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data: campaigns = [] } = useQuery<Campaign[]>({ queryKey: ["campaigns"], queryFn: () => api.get<Campaign[]>("/api/campaigns") });
  const open = campaigns.filter(c => c.status !== "completed" && c.status !== "archived");
  const draft = readDraft(space.id);
  const sameDraft = draft && draft.screenId === screen.id ? draft : null;

  const campaignId = Number(params.get("campaign")) || sameDraft?.campaignId || null;
  const campaign = campaigns.find(c => c.id === campaignId) ?? null;
  const setCampaign = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("campaign", id);
    setParams(next, { replace: true });
  };

  const earliest = minStart();
  const clamp = (s: string | null, e: string | null) => {
    if (!s || !e) return [null, null] as const;
    const st = s < earliest ? earliest : s;
    return e >= st ? ([st, e] as const) : ([null, null] as const);
  };
  const [[start, end], setDates] = useState<readonly [string | null, string | null]>(() =>
    clamp(params.get("start") ?? sameDraft?.start ?? null, params.get("end") ?? sameDraft?.end ?? null));
  // A campaign brings its dates when none are set yet.
  useEffect(() => {
    if (!start && campaign) setDates(clamp(campaign.start_date.slice(0, 10), campaign.end_date.slice(0, 10)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign?.id]);

  const groups = useMemo(() => groupSlots(slots), [slots]);
  const openDays = useMemo(() => new Set(slots.map(s => s.day_of_week)), [slots]);
  const [picks, setPicks] = useState<DraftPick[]>(() => sameDraft?.picks ?? []);
  const [datesOpen, setDatesOpen] = useState(false);
  useEffect(() => { if (groups.length === 1 && picks.length === 0) setPicks([{ key: groups[0].key, plays: DEFAULT_PLAYS }]); }, [groups, picks.length]);

  const adSeconds = 15;
  const playsFor = (k: string) => picks.find(p => p.key === k)?.plays ?? DEFAULT_PLAYS;
  const toggle = (g: SlotGroup) => setPicks(p => p.some(x => x.key === g.key)
    ? p.filter(x => x.key !== g.key)
    : [...p, { key: g.key, plays: Math.min(DEFAULT_PLAYS, Math.max(1, maxPlays(g, adSeconds))) }]);
  const setPlays = (k: string, n: number) => setPicks(p => p.map(x => (x.key === k ? { ...x, plays: n } : x)));

  const { data: bookings = [] } = useQuery<Booking[]>({ queryKey: ["bookings"], queryFn: () => api.get<Booking[]>("/api/bookings"), enabled: !!campaign });
  const left = campaign ? campaignMoney(Number(campaign.total_budget) || 0, bookings.filter(b => b.campaign_id === campaign.id)).left : null;

  const body = campaign && start && end && picks.length
    ? { campaign_id: campaign.id, space_id: space.id, start_date: start, end_date: end, asset_duration_seconds: adSeconds, slots: slotsBody(groups, picks, start, end) }
    : null;
  const quote = useBookingQuote(body && (body.slots as unknown[]).length ? body : null);
  const localTotal = start && end ? picks.reduce((sum, p) => {
    const g = groups.find(x => x.key === p.key);
    return g ? sum + groupAmount(g, p.plays, adSeconds, start, end).amount : sum;
  }, 0) : 0;
  const total = quote.total ?? localTotal;
  const issues = readCapacityIssues(quote.error, adSeconds);
  const capacity = issues[0] ?? null;
  const otherError = quote.error && !issues.length ? quote.error : null;
  const over = left != null && total > left ? total - left : null;
  const totalDays = start && end ? daysIn(start, end, openDays) : 0;
  const allDays = start && end ? daysIn(start, end, [1, 2, 3, 4, 5, 6, 7]) : 0;
  const capGroup = capacity ? groups.find(g => g.label === capacity.label && picks.some(p => p.key === g.key)) : null;
  const lowest = Math.min(...issues.filter(i => i.label === capacity?.label).map(i => i.playsLeft));

  const canReview = !!campaign && !!start && !!end && picks.length > 0 && !quote.pending && !quote.error && over == null && quote.total != null;

  const review = () => {
    saveDraft({ spaceId: space.id, screenId: screen.id, campaignId: campaign!.id, start: start!, end: end!, picks });
    navigate(`/spaces/${space.id}/request`);
  };

  return (
    <aside aria-label="Book this screen" className={cn(cardCn, "flex w-full flex-col gap-6 p-6 lg:sticky lg:top-0")}>
      {open.length === 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="m-0 text-base font-semibold leading-6">Book this screen</h2>
          <p className="m-0 text-sm leading-5 text-[#4a4d56]">Requests come from a campaign. Create one to pick dates and time slots here.</p>
          <Link to="/campaigns/new" className="inline-flex h-10 items-center justify-center rounded-lg bg-[#3a47c2] px-4 text-sm font-medium text-white hover:bg-[#2e399f]">
            New campaign
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <label htmlFor="bk-campaign" className="text-base font-semibold leading-6">Campaign</label>
            <Select value={campaign ? String(campaign.id) : ""} onValueChange={setCampaign}>
              <SelectTrigger id="bk-campaign" className="h-10 rounded-lg border-[#8f929d] text-sm focus:ring-[#3a47c2]">
                <SelectValue placeholder="Pick a campaign" />
              </SelectTrigger>
              <SelectContent>
                {open.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <hr className={hrCn} />
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="m-0 text-base font-semibold leading-6">Dates</h2>
              <button type="button" aria-label="Change dates" onClick={() => setDatesOpen(true)}
                className="grid h-8 w-8 place-items-center rounded-lg text-[#4a4d56] hover:bg-[#f8faff] hover:text-[#1a1d25]">
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            {start && end ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium leading-5">{fmtSpan(start, end)}</span>
                {capacity ? <Badge tone="warning">{issues.length === 1 ? `${capacity.label} is full on ${fmtDay(capacity.date)}` : `Full on ${issues.length} days`}</Badge>
                  : <AvailabilityBadge open={totalDays} total={allDays} />}
              </div>
            ) : (
              <Btn className="self-start" onClick={() => setDatesOpen(true)}>Pick dates</Btn>
            )}
          </div>
          <hr className={hrCn} />
          <div className="flex flex-col gap-3">
            <h2 className="m-0 text-base font-semibold leading-6">Time slots</h2>
            <p className="m-0 text-xs leading-4 text-[#656972]">The price a day follows the plays you pick. Prices are for a 15-second ad.</p>
            {groups.length === 0 && <p className="m-0 text-sm text-[#4a4d56]">This screen has no time slots yet.</p>}
            {groups.map(g => (
              <SlotRow key={g.key} group={g} picked={picks.some(p => p.key === g.key)} plays={playsFor(g.key)}
                onToggle={() => toggle(g)} onPlays={n => setPlays(g.key, n)} adSeconds={adSeconds} start={start} end={end}
                full={issues.some(i => i.label === g.label) && picks.some(p => p.key === g.key)
                  ? `Full on ${issues.filter(i => i.label === g.label).length === 1 ? fmtDay(issues.find(i => i.label === g.label)!.date) : `${issues.filter(i => i.label === g.label).length} days`}`
                  : null} />
            ))}
          </div>
          <hr className={hrCn} />
          <KeyValues total rows={[
            [`Total for ${allDays || 0} day${allDays === 1 ? "" : "s"}`, quote.pending && quote.total == null ? "…" : fmtPrice(total)],
            ...(left != null ? [[over != null ? "Left to spend" : "Left to spend after this request", fmtPrice(over != null ? left : left - total)] as [string, string]] : []),
          ]} />
          {over != null && (
            <Callout tone="crit" title={`${fmtPrice(over)} over Left to spend`}
              actions={<Link to={`/campaigns/${campaign!.id}/edit`} className="inline-flex h-8 items-center rounded-lg border border-[#d2d4d9] bg-white px-3 text-xs font-medium hover:bg-[#f8faff]">Edit budget</Link>}>
              <p>Remove a time slot or edit the budget to fit. Your picks stay saved if you edit the budget.</p>
            </Callout>
          )}
          {capacity && (
            <Callout tone="warn"
              title={issues.length === 1 ? `${fmtDayLong(capacity.date)} doesn't have room` : `${issues.length} days don't have room`}
              actions={<>
                {capGroup && lowest > 0 && lowest < playsFor(capGroup.key) && (
                  <Btn size="sm" onClick={() => setPlays(capGroup.key, lowest)}>Lower to {lowest} plays a day</Btn>
                )}
                <Btn size="sm" onClick={() => setDatesOpen(true)}>Change dates</Btn>
              </>}>
              <p>These time slots are booked up on these days:</p>
              <div className="mt-2"><KeyValues rows={issues.map(i => [`${i.label}, ${fmtDayLong(i.date)}`, `${i.playsLeft} play${i.playsLeft === 1 ? "" : "s"} left`])} /></div>
            </Callout>
          )}
          {otherError && <Callout tone="crit" title="We couldn't price this request"><p className="whitespace-pre-line">{otherError}</p></Callout>}
          <Btn variant="primary" className="w-full" disabled={!canReview} onClick={review}>Review request</Btn>
          {!campaign && <p className="-mt-3 m-0 text-xs leading-4 text-[#656972]">Pick a campaign to send a request.</p>}
        </>
      )}
      <DatesDialog open={datesOpen} onOpenChange={setDatesOpen} title={title} start={start} end={end} openDays={openDays}
        campaignDates={campaign ? { start: campaign.start_date.slice(0, 10), end: campaign.end_date.slice(0, 10) } : null}
        onApply={(s, e) => setDates([s, e])} />
    </aside>
  );
}

function fmtDayLong(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

/* ---------- the page ---------- */

/** "Screen detail" from the booking flow: what an advertiser sees for someone else's space. */
export function ScreenDetail({ space, images }: { space: DetailSpace; images: string[] }) {
  const { user } = useAuth();
  const isAdvertiser = user?.roles.includes("advertiser") ?? false;
  const [params, setParams] = useSearchParams();

  const { data: screens = [] } = useQuery<Screen[]>({
    queryKey: ["space-screens", space.id],
    queryFn: () => api.get<Screen[]>(`/api/spaces/${space.id}/screens`),
  });
  const active = screens.filter(s => s.is_active !== false);
  const slotQs = useQueries({
    queries: active.map(s => ({
      queryKey: ["screen-slots", space.id, s.id],
      queryFn: () => api.get<Slot[]>(`/api/spaces/${space.id}/screens/${s.id}/slots`),
    })),
  });
  const slotsOf = (id: number) => slotQs[active.findIndex(s => s.id === id)]?.data ?? [];
  const screenId = Number(params.get("screen")) || active[0]?.id;
  const screen = active.find(s => s.id === screenId) ?? active[0] ?? null;
  const others = active.filter(s => s.id !== screen?.id);
  const title = screenTitle(space, screen);

  const inch = sizeInches(space as never);
  const orient = orientation(space as never);
  const r = space.width_px && space.height_px ? ratio(space.width_px, space.height_px) : null;
  const address = [space.address_line1, space.city].filter(Boolean).join(", ");
  const backTo = (() => {
    const qs = new URLSearchParams();
    const c = params.get("campaign");
    if (c) qs.set("campaign", c);
    return `/browse${qs.toString() ? `?${qs}` : ""}`;
  })();

  const pickScreen = (id: number) => {
    const next = new URLSearchParams(params);
    next.set("screen", String(id));
    setParams(next);
    window.scrollTo({ top: 0 });
  };

  return (
    <AppLayout activeNav="browse">
      <div className="flex min-w-0 flex-col gap-6 pb-14 pt-2 text-[#1a1d25]">
        <Crumbs items={[{ label: "Browse spaces", to: backTo }, { label: title }]} />
        <div>
          <h1 className="m-0 text-2xl font-semibold leading-8 tracking-[-0.01em]">{title}</h1>
          {spaceLede(space) && <p className="m-0 mt-1 text-sm leading-5 text-[#656972]">{spaceLede(space)}</p>}
        </div>
        <Gallery images={images} />

        <div className="mt-2 grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="flex min-w-0 flex-col gap-8">
            <section className="flex flex-col gap-4">
              <h2 className="m-0 text-base font-semibold leading-6">Screen details</h2>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm leading-5 sm:grid-cols-2 [&_svg]:h-5 [&_svg]:w-5 [&_svg]:shrink-0 [&_svg]:text-[#656972]">
                {inch != null && <span className="flex items-center gap-3"><Monitor aria-hidden />{inch} in</span>}
                {orient && (
                  <span className="flex items-center gap-3">
                    {orient === "landscape" ? <RectangleHorizontal aria-hidden /> : <RectangleVertical aria-hidden />}
                    {orient === "landscape" ? "Landscape" : "Portrait"}{r ? `, ${r}` : ""}
                  </span>
                )}
                <span className="flex items-center gap-3"><FileVideo aria-hidden />{formatsLabel(space.file_formats_accepted)}</span>
                <span className="flex items-center gap-3"><HardDrive aria-hidden />Up to {Math.round(CREATIVE_MAX_BYTES / (1024 * 1024))} MB</span>
                <span className="flex items-center gap-3"><Timer aria-hidden />{space.spot_duration_seconds ?? 15} second plays</span>
              </div>
            </section>
            {space.description && (
              <>
                <hr className={hrCn} />
                <section className="flex flex-col gap-4">
                  <h2 className="m-0 text-base font-semibold leading-6">Placement</h2>
                  <p className="m-0 whitespace-pre-line text-sm leading-5 text-[#4a4d56]">{space.description}</p>
                </section>
              </>
            )}
            {(space.geo_lat != null && space.geo_lng != null) || address ? (
              <>
                <hr className={hrCn} />
                <section className="flex flex-col gap-4">
                  <h2 className="m-0 text-base font-semibold leading-6">Location</h2>
                  {space.geo_lat != null && space.geo_lng != null && <LocationMap lat={space.geo_lat} lng={space.geo_lng} name={space.name} />}
                  {address && <span className="flex items-center gap-3 text-sm leading-5"><MapPin aria-hidden className="h-5 w-5 text-[#656972]" />{address}</span>}
                </section>
              </>
            ) : null}
            {others.length > 0 && (
              <>
                <hr className={hrCn} />
                <section className="flex flex-col gap-4">
                  <h2 className="m-0 text-base font-semibold leading-6">More screens at this space</h2>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {others.map((s, i) => {
                      const play = cheapestPlay(slotsOf(s.id));
                      return (
                        <button key={s.id} type="button" onClick={() => pickScreen(s.id)}
                          className="flex flex-col gap-2 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3a47c2]">
                          <div className="relative grid h-28 place-items-center overflow-hidden rounded-lg bg-[#f1f2f7] text-[#8f929d]">
                            {images[(i + 1) % Math.max(1, images.length)] ? (
                              <img src={images[(i + 1) % images.length]} alt="" className="absolute inset-0 h-full w-full object-cover" />
                            ) : <ImageIcon aria-hidden className="h-6 w-6" />}
                          </div>
                          <span className="text-sm font-medium leading-5">{s.label}</span>
                          {play != null && (
                            <span className="-mt-1 text-xs leading-4 text-[#656972]">From<b className="mx-1 text-base font-semibold tabular-nums text-[#1a1d25]">{fmtPlay(play)}</b>a play</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              </>
            )}
          </div>

          {isAdvertiser && screen ? (
            <BookingPanel key={screen.id} space={space} screen={screen} slots={slotsOf(screen.id)} title={title} />
          ) : !isAdvertiser ? (
            <aside className={cn(cardCn, "p-6 text-sm leading-5 text-[#4a4d56]")}>Only advertiser accounts can book screens.</aside>
          ) : null}
        </div>
      </div>
    </AppLayout>
  );
}
