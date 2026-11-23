import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import type { DateRange } from "react-day-picker";
import { List, Map as MapIcon, TriangleAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/AppLayout";
import { campaignMoney, parseDay, type Booking, type Campaign } from "@/components/campaigns/campaignData";
import {
  DISTANCES_MI, EMPTY_FILTERS, activeFilterCount, fmtPrice, matches, miToKm, sortSpaces, useSpaceExtras,
  type Filters, type Space, type SortKey,
} from "@/components/browse/browseData";
import { ListingCard, ListingCardSkeleton } from "@/components/browse/ListingCard";
import { SearchBar, type Place } from "@/components/browse/SearchBar";
import {
  AppliedFilters, CampaignChip, DistanceChip, MoreFiltersChip, PriceChip, SortMenu, VenueTypeChip,
} from "@/components/browse/FilterControls";
import { BrowseMap, type MapPin } from "@/components/browse/BrowseMap";
import { Btn, Skeleton, countLabel } from "@/components/browse/primitives";

const DEFAULT_DISTANCE_MI = 5;

/** "Bloomington" from "Bloomington, Indiana, United States". */
const shortPlace = (p: Place) => (p.label === "Current location" ? "near you" : `in ${p.label.split(",")[0]}`);

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const Browse = () => {
  const { user } = useAuth();
  const isBroadcaster = user?.roles.includes("broadcaster") ?? false;
  const isAdvertiser = user?.roles.includes("advertiser") ?? false;

  // "Find screens" on a campaign lands here with ?campaign=<id>.
  const [params, setParams] = useSearchParams();
  const campaignId = Number(params.get("campaign")) || null;
  const setCampaignId = (id: number | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("campaign", String(id)); else next.delete("campaign");
    setParams(next, { replace: true });
  };

  const [place, setPlace] = useState<Place | null>(null);
  const [distanceMi, setDistanceMi] = useState(DEFAULT_DISTANCE_MI);
  const [dates, setDates] = useState<DateRange | undefined>();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("recommended");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [mapOnly, setMapOnly] = useState(false);
  const [phoneView, setPhoneView] = useState<"list" | "map">("list");
  const [searchQuery, setSearchQuery] = useState("");

  /* ---------- data ---------- */

  const radiusKm = place ? miToKm(distanceMi) : null;
  const searchKey = place ? `${place.lat},${place.lng},${distanceMi}` : "all";

  const { data: found = [], isLoading } = useQuery<Space[]>({
    queryKey: ["spaces-search", place?.lat, place?.lng, radiusKm],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (place && radiusKm) {
        qs.set("lat", String(place.lat));
        qs.set("lng", String(place.lng));
        qs.set("radius", String(radiusKm));
      }
      return api.get<Space[]>(`/api/spaces/search${qs.toString() ? `?${qs}` : ""}`);
    },
    placeholderData: prev => prev,
  });

  const { data: mySpaces = [] } = useQuery<Space[]>({
    queryKey: ["spaces-mine"],
    queryFn: () => api.get<Space[]>("/api/spaces/mine"),
    enabled: isBroadcaster,
  });

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: () => api.get<Campaign[]>("/api/campaigns"),
    enabled: isAdvertiser,
  });
  const openCampaigns = campaigns.filter(c => c.status !== "completed" && c.status !== "archived");
  const campaign = campaigns.find(c => c.id === campaignId) ?? null;

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ["bookings"],
    queryFn: () => api.get<Booking[]>("/api/bookings"),
    enabled: !!campaign,
  });
  const leftToSpend = campaign
    ? campaignMoney(Number(campaign.total_budget) || 0, bookings.filter(b => b.campaign_id === campaign.id)).left
    : null;

  // Picking a campaign brings its dates, unless dates are already chosen.
  useEffect(() => {
    if (campaign && !dates?.from) setDates({ from: parseDay(campaign.start_date), to: parseDay(campaign.end_date) });
    // Only when the campaign changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign?.id]);

  /* ---------- filter and sort ---------- */

  const q = searchQuery.trim().toLowerCase();
  const mine = useMemo(() => new Set(mySpaces.map(s => s.id)), [mySpaces]);
  const base = useMemo(
    () => found.filter(s => !mine.has(s.id) && (!q || s.name.toLowerCase().includes(q) || (s.city ?? "").toLowerCase().includes(q))),
    [found, mine, q],
  );
  const extras = useSpaceExtras(base);
  const results = sortSpaces(base.filter(s => matches(s, extras.get(s.id), filters)), extras, sort);
  const countWith = (f: Filters) => base.filter(s => matches(s, extras.get(s.id), f)).length;

  const venueCounts = new Map<string, number>();
  for (const s of base) {
    if (!s.venue_type || !matches(s, extras.get(s.id), filters, "venueTypes")) continue;
    venueCounts.set(s.venue_type, (venueCounts.get(s.venue_type) ?? 0) + 1);
  }
  const prices = base.map(s => extras.get(s.id)?.fromPrice).filter((p): p is number => p != null);
  const priceBounds: [number, number] = prices.length ? [Math.min(...prices), Math.max(...prices)] : [0, 100];
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;

  // Distance sort needs a location; fall back when it's cleared.
  useEffect(() => { if (!place && sort === "distance") setSort("recommended"); }, [place, sort]);
  // A pin whose space was filtered out shows no card.
  const selected = selectedId != null && results.some(s => s.id === selectedId) ? selectedId : null;

  const range = dates?.from ? { from: dates.from, to: dates.to ?? dates.from } : null;
  const hrefFor = (s: Space) => {
    const qs = new URLSearchParams();
    if (campaign) qs.set("campaign", String(campaign.id));
    if (range) { qs.set("start", toIso(range.from)); qs.set("end", toIso(range.to)); }
    return `/spaces/${s.id}${qs.toString() ? `?${qs}` : ""}`;
  };

  const pins: MapPin[] = results
    .filter(s => s.geo_lat != null && s.geo_lng != null)
    .map(s => ({ id: s.id, lat: s.geo_lat!, lng: s.geo_lng!, price: extras.get(s.id)?.fromPrice ?? null }));

  const nextDistance = DISTANCES_MI.find(d => d > distanceMi);
  const filtersSet = activeFilterCount(filters);
  const loading = isLoading;

  /* ---------- pieces ---------- */

  const card = (s: Space, compact = false) => (
    <ListingCard key={s.id} space={s} extras={extras.get(s.id)} href={hrefFor(s)} range={range}
      highlighted={s.id === selected} compactMedia={compact}
      onHover={h => setHoveredId(h ? s.id : cur => (cur === s.id ? null : cur))} />
  );

  const countRow = (
    <div className="flex items-baseline justify-between gap-4">
      {loading ? (
        <>
          <Skeleton className="h-6 w-24" />
          {campaign && <Skeleton className="h-5 w-40" />}
        </>
      ) : (
        <>
          <h2 className="m-0 text-base font-semibold leading-6">
            {countLabel(results.length)}{place ? ` ${shortPlace(place)}` : ""}
          </h2>
          {leftToSpend != null && (
            <span className="whitespace-nowrap text-sm leading-5 text-[#656972]">
              Left to spend <b className="ml-1 font-medium tabular-nums text-[#1a1d25]">{fmtPrice(leftToSpend)}</b>
            </span>
          )}
        </>
      )}
    </div>
  );

  const empty = (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <h3 className="m-0 text-base font-semibold leading-6">No spaces match</h3>
      <p className="m-0 max-w-[40ch] text-sm leading-5 text-[#4a4d56]">
        {place
          ? `Nothing is listed within ${distanceMi} mi${filtersSet ? " with these filters" : ""}. Try a wider distance${filtersSet ? " or fewer filters" : ""}.`
          : q ? `No spaces match “${searchQuery.trim()}”.`
          : filtersSet ? "Try fewer filters." : "No spaces are listed yet."}
      </p>
      {(filtersSet > 0 || (place && nextDistance)) && (
        <div className="mt-2 flex gap-2">
          {filtersSet > 0 && <Btn onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</Btn>}
          {place && nextDistance && <Btn onClick={() => setDistanceMi(nextDistance)}>Search within {nextDistance} mi</Btn>}
        </div>
      )}
    </div>
  );

  const list = loading ? (
    <div aria-busy="true" className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
      {Array.from({ length: 4 }, (_, i) => <ListingCardSkeleton key={i} />)}
    </div>
  ) : results.length === 0 ? empty : (
    <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
      {results.map(s => card(s))}
    </div>
  );

  const map = (className: string, expandable: boolean) => (
    <BrowseMap
      className={className}
      pins={pins}
      loading={loading}
      selectedId={selected}
      hoveredId={hoveredId}
      onSelect={setSelectedId}
      center={place}
      radiusMi={place ? distanceMi : null}
      searchKey={searchKey}
      expanded={mapOnly}
      onToggleExpand={expandable ? () => setMapOnly(m => !m) : undefined}
      onSearchArea={a => { setPlace({ label: "Map area", lat: a.lat, lng: a.lng }); setDistanceMi(a.radiusMi); }}
      renderCard={id => {
        const s = results.find(x => x.id === id);
        return s ? card(s) : null;
      }}
    />
  );

  return (
    <AppLayout activeNav="browse" searchValue={searchQuery} onSearchChange={setSearchQuery}
      searchPlaceholder="Search campaigns, spaces, analytics">
      <div className="flex min-w-0 flex-col gap-6 pb-8 pt-2 text-[#1a1d25]">
        <h1 className="m-0 hidden text-2xl font-semibold leading-8 tracking-[-0.01em] md:block">Browse spaces</h1>

        <div className="hidden md:block">
          <SearchBar place={place} onPlace={p => { setPlace(p); setSelectedId(null); }} dates={dates} onDates={setDates} />
        </div>
        <div className="md:hidden">
          <SearchBar compact place={place} onPlace={p => { setPlace(p); setSelectedId(null); }} dates={dates} onDates={setDates} />
        </div>

        {campaign && leftToSpend === 0 && (
          <div role="status" className="grid grid-cols-[24px_minmax(0,1fr)] items-start gap-3 rounded-xl bg-[#fef4e8] p-4">
            <TriangleAlert aria-hidden className="h-6 w-6 p-0.5 text-[#7c5003]" />
            <div className="flex flex-col">
              <h4 className="m-0 text-base font-semibold leading-6">{campaign.name} has no budget left</h4>
              <p className="m-0 mt-1 text-sm leading-5">Prices still show. Edit the budget to send requests from this campaign.</p>
              <div className="mt-3">
                <Link to={`/campaigns/${campaign.id}/edit`}
                  className="inline-flex h-8 items-center rounded-lg border border-[#d2d4d9] bg-white px-3 text-xs font-medium leading-4 hover:bg-[#f8faff]">
                  Edit budget
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="-mx-6 flex gap-2 overflow-x-auto px-6 py-0.5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
              {isAdvertiser && (
                <CampaignChip campaigns={openCampaigns} value={campaign} onChange={setCampaignId} />
              )}
              <DistanceChip value={distanceMi} onChange={setDistanceMi} hasLocation={!!place} />
              <VenueTypeChip filters={filters} onApply={setFilters} countWith={countWith} venueCounts={venueCounts} />
              <PriceChip filters={filters} onApply={setFilters} countWith={countWith} bounds={priceBounds} average={avgPrice} />
              <MoreFiltersChip filters={filters} onApply={setFilters} countWith={countWith} distance={distanceMi}
                onDistance={setDistanceMi} hasLocation={!!place}
                activeCount={activeFilterCount({ ...filters, venueTypes: [], price: null })} />
            </div>
            <div className="hidden shrink-0 md:block">
              <SortMenu value={sort} onChange={setSort} hasLocation={!!place} />
            </div>
          </div>
          <AppliedFilters filters={filters} onChange={setFilters} />
        </div>

        {/* Desktop: list and map side by side, or the map alone when expanded. */}
        <div className="hidden lg:block">
          {mapOnly ? (
            <div className="flex flex-col gap-4">
              {countRow}
              {map("h-[640px]", true)}
            </div>
          ) : (
            <div className="grid grid-cols-2 items-start gap-6">
              <div className="flex min-w-0 flex-col gap-4">
                {countRow}
                {list}
              </div>
              <div className="sticky top-0">
                {map("h-[min(720px,calc(100vh-120px))] min-h-[480px]", true)}
              </div>
            </div>
          )}
        </div>

        {/* Phone and tablet: list or map, switched by the floating button. */}
        <div className="flex flex-col gap-4 lg:hidden">
          {countRow}
          {phoneView === "list" ? list : map("h-[calc(100vh-260px)] min-h-[420px]", false)}
          <div className="sticky bottom-6 z-[1001] flex justify-center">
            <Btn variant="primary" className="pl-3 shadow-[0_8px_24px_rgba(26,29,37,0.16)]"
              onClick={() => setPhoneView(v => (v === "list" ? "map" : "list"))}>
              {phoneView === "list" ? <><MapIcon aria-hidden />Map</> : <><List aria-hidden />List</>}
            </Btn>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Browse;
