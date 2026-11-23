// Types, lookups and the filter/sort rules for the Browse spaces page.
//
// GET /api/spaces/search returns bare space rows, so the card details the design shows (photos,
// the "From $X a play" price, which weekdays a screen plays) come from each space's images,
// screens and slots. The queries use the same keys as the space and campaign pages, so they share
// one cache.

import { useQueries } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type Space = {
  id: number;
  broadcaster_id: number;
  name: string;
  description: string | null;
  space_type: string;
  display_type: string;
  venue_type?: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  cpm: number;
  est_daily_impressions: number | null;
  is_active: boolean;
  geo_lat: number | null;
  geo_lng: number | null;
  width_px?: number | null;
  height_px?: number | null;
  size_label?: string | null;
  file_formats_accepted?: string[] | null;
  created_at?: string;
  distance_km?: number;
};

type SpaceImage = { id: number; url: string; is_primary: boolean };
type Screen = { id: number; label: string; is_active: boolean };
type Slot = { id: number; screen_id: number; day_of_week: number; total_price: number | string; daily_capacity_playbacks: number };

/** What a listing card needs beyond the space row. `undefined` while it is still loading. */
export type SpaceExtras = {
  images: string[];
  /**
   * Cheapest price of one 15-second play (slot total_price / daily capacity, as the backend
   * charges), or null when the space has no slots.
   */
  fromPrice: number | null;
  /** ISO weekdays (1 = Monday) with at least one slot on an active screen. */
  days: Set<number>;
  screens: number;
};

export function useSpaceExtras(spaces: Space[]): Map<number, SpaceExtras | undefined> {
  const ids = spaces.map(s => s.id);
  const images = useQueries({
    queries: ids.map(id => ({
      queryKey: ["space-images", id],
      queryFn: () => api.get<SpaceImage[]>(`/api/spaces/${id}/images`),
      staleTime: 60_000,
    })),
  });
  const screens = useQueries({
    queries: ids.map(id => ({
      queryKey: ["space-screens", id],
      queryFn: () => api.get<Screen[]>(`/api/spaces/${id}/screens`),
      staleTime: 60_000,
    })),
  });
  const screenList = ids.flatMap((spaceId, i) =>
    (screens[i]?.data ?? []).filter(s => s.is_active !== false).map(screen => ({ spaceId, screen })),
  );
  const slots = useQueries({
    queries: screenList.map(({ spaceId, screen }) => ({
      queryKey: ["screen-slots", spaceId, screen.id],
      queryFn: () => api.get<Slot[]>(`/api/spaces/${spaceId}/screens/${screen.id}/slots`),
      staleTime: 60_000,
    })),
  });

  const out = new Map<number, SpaceExtras | undefined>();
  ids.forEach((id, i) => {
    const img = images[i];
    const scr = screens[i];
    if (scr?.isLoading) { out.set(id, undefined); return; }
    let fromPrice: number | null = null;
    const days = new Set<number>();
    let pending = false;
    let count = 0;
    screenList.forEach(({ spaceId }, j) => {
      if (spaceId !== id) return;
      count++;
      const q = slots[j];
      if (q?.isLoading) pending = true;
      for (const sl of q?.data ?? []) {
        days.add(sl.day_of_week);
        const p = Number(sl.total_price) / (sl.daily_capacity_playbacks || 1);
        if (Number.isFinite(p) && (fromPrice == null || p < fromPrice)) fromPrice = p;
      }
    });
    if (pending) { out.set(id, undefined); return; }
    const sorted = [...(img?.data ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
    out.set(id, { images: sorted.map(x => x.url), fromPrice, days, screens: count });
  });
  return out;
}

/* ---------- display helpers ---------- */

const KM_PER_MI = 1.609344;
export const miToKm = (mi: number) => mi * KM_PER_MI;
export const kmToMi = (km: number) => km / KM_PER_MI;

export function fmtDistance(km: number): string {
  const mi = kmToMi(km);
  return mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
}

export function fmtPrice(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** A per-play price: cents when it's a cent or more, otherwise two significant digits ($0.0075). */
export function fmtPlay(n: number): string {
  if (n >= 0.01 || n === 0) return fmtPrice(n);
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumSignificantDigits: 2 });
}

/** Inches read from a free-text size label like `55"`, `55 in` or `55-inch`. */
export function sizeInches(s: Space): number | null {
  const m = s.size_label?.match(/(\d+(?:\.\d+)?)\s*(?:"|”|in\b|inch)/i);
  return m ? Number(m[1]) : null;
}

export type Orientation = "landscape" | "portrait";
export function orientation(s: Space): Orientation | null {
  if (!s.width_px || !s.height_px) return null;
  return s.width_px >= s.height_px ? "landscape" : "portrait";
}

export const VENUE_TYPES = [
  "shopping_mall", "gym", "transit_station", "restaurant", "bar", "office_building", "street_facing",
  "airport", "hotel", "cinema", "stadium", "university", "healthcare", "other",
] as const;

const VENUE_LABEL: Record<string, string> = {
  shopping_mall: "Shopping mall", gym: "Gym", transit_station: "Transit station", restaurant: "Restaurant",
  bar: "Bar", office_building: "Office building", street_facing: "Street facing", airport: "Airport",
  hotel: "Hotel", cinema: "Cinema", stadium: "Stadium", university: "University", healthcare: "Healthcare",
  other: "Other",
};
export const venueLabel = (v: string) => VENUE_LABEL[v] ?? v.replace(/_/g, " ").replace(/^./, c => c.toUpperCase());

/** "Screen in a shopping mall", or the city when the venue isn't set. */
export function spaceSubtitle(s: Space): string {
  if (s.venue_type && s.venue_type !== "other") {
    const v = venueLabel(s.venue_type).toLowerCase();
    return `Screen in ${/^[aeiou]/.test(v) ? "an" : "a"} ${v}`;
  }
  return [s.city, s.region].filter(Boolean).join(", ") || "Screen";
}

/** Each date from start to end, inclusive. */
export function eachDay(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (d <= last && out.length < 400) { out.push(new Date(d)); d.setDate(d.getDate() + 1); }
  return out;
}

const isoDay = (d: Date) => ((d.getDay() + 6) % 7) + 1;

/** "Available all 14 days" / "Available 12 of 14 days" / null when nothing plays on those dates. */
export function availabilityLabel(days: Set<number>, range: { from: Date; to: Date } | null) {
  if (!range) return null;
  const all = eachDay(range.from, range.to);
  const open = all.filter(d => days.has(isoDay(d))).length;
  if (open === 0) return { text: "Not open on these dates", full: false };
  if (open === all.length) return { text: `Available all ${all.length} day${all.length === 1 ? "" : "s"}`, full: true };
  return { text: `Available ${open} of ${all.length} days`, full: false };
}

/* ---------- filters and sort ---------- */

export type SizeBucket = "any" | "lt40" | "40to60" | "gt60";
export type SortKey = "recommended" | "price_asc" | "price_desc" | "distance" | "newest";

export const SORT_LABEL: Record<SortKey, string> = {
  recommended: "Recommended",
  price_asc: "Price, low to high",
  price_desc: "Price, high to low",
  distance: "Distance, nearest",
  newest: "Newest",
};

export const DISTANCES_MI = [1, 2, 5, 10] as const;

export type Filters = {
  venueTypes: string[];
  price: [number, number] | null;
  size: SizeBucket;
  orientations: Orientation[];
  formats: ("video" | "image")[];
  /** ISO weekdays the screen must be open on. All seven means no filter. */
  days: number[];
};

export const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
export const DAY_LABEL = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const EMPTY_FILTERS: Filters = {
  venueTypes: [],
  price: null,
  size: "any",
  orientations: ["landscape", "portrait"],
  formats: ["video", "image"],
  days: ALL_DAYS,
};

const acceptsFormat = (s: Space, f: "video" | "image") => {
  const list = s.file_formats_accepted ?? [];
  if (list.length === 0) return true;
  return list.some(x => x.toLowerCase().includes(f) || (f === "video" ? /mp4|mov|webm/i : /jpe?g|png|gif|webp/i).test(x));
};

/** Whether a space passes every filter. A detail that is still loading never hides a space. */
export function matches(s: Space, x: SpaceExtras | undefined, f: Filters, skip?: keyof Filters): boolean {
  if (skip !== "venueTypes" && f.venueTypes.length && !f.venueTypes.includes(s.venue_type ?? "")) return false;
  if (skip !== "price" && f.price && x) {
    if (x.fromPrice == null || x.fromPrice < f.price[0] || x.fromPrice > f.price[1]) return false;
  }
  if (skip !== "size" && f.size !== "any") {
    const inch = sizeInches(s);
    if (inch == null) return false;
    if (f.size === "lt40" && !(inch < 40)) return false;
    if (f.size === "40to60" && !(inch >= 40 && inch <= 60)) return false;
    if (f.size === "gt60" && !(inch > 60)) return false;
  }
  if (skip !== "orientations" && f.orientations.length < 2) {
    const o = orientation(s);
    if (o && !f.orientations.includes(o)) return false;
  }
  if (skip !== "formats" && f.formats.length < 2) {
    if (!f.formats.some(fm => acceptsFormat(s, fm))) return false;
  }
  if (skip !== "days" && f.days.length < 7 && x) {
    if (!f.days.every(d => x.days.has(d))) return false;
  }
  return true;
}

export function sortSpaces(list: Space[], extras: Map<number, SpaceExtras | undefined>, sort: SortKey): Space[] {
  const price = (s: Space) => extras.get(s.id)?.fromPrice ?? null;
  const byPrice = (dir: 1 | -1) => (a: Space, b: Space) => {
    const pa = price(a), pb = price(b);
    if (pa == null && pb == null) return 0;
    if (pa == null) return 1;
    if (pb == null) return -1;
    return (pa - pb) * dir;
  };
  const copy = [...list];
  switch (sort) {
    case "price_asc": return copy.sort(byPrice(1));
    case "price_desc": return copy.sort(byPrice(-1));
    case "distance": return copy.sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity));
    case "newest": return copy.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    default: return copy;
  }
}

export function activeFilterCount(f: Filters): number {
  return (
    (f.venueTypes.length ? 1 : 0) + (f.price ? 1 : 0) + (f.size !== "any" ? 1 : 0) +
    (f.orientations.length < 2 ? 1 : 0) + (f.formats.length < 2 ? 1 : 0) + (f.days.length < 7 ? 1 : 0)
  );
}
