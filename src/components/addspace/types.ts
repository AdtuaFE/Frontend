/**
 * Draft model for the Add Space flow.
 *
 * The design (Figma "Add Space Flow") describes a richer space than POST /api/spaces
 * currently accepts: many screens per space, per-screen time slots priced per day, and
 * blocked dates. Until the API catches up, the whole draft lives client-side and is
 * mapped down to the supported payload on publish — see `toCreateSpacePayload`.
 */

export const SPACE_TYPES = [
  { value: "billboard", label: "Billboard" },
  { value: "digital_screen", label: "Digital screen" },
  { value: "window_display", label: "Window display" },
  { value: "poster", label: "Poster" },
  { value: "transit_shelter", label: "Transit shelter" },
  { value: "vehicle_wrap", label: "Vehicle wrap" },
  { value: "projection", label: "Projection" },
  { value: "other", label: "Other" },
] as const;

export const DISPLAY_TYPES = [
  { value: "static", label: "Static" },
  { value: "digital_led", label: "Digital LED" },
  { value: "backlit", label: "Backlit" },
  { value: "neon", label: "Neon" },
  { value: "projection", label: "Projection" },
  { value: "other", label: "Other" },
] as const;

export const AD_FORMATS = ["JPEG", "PNG", "WebP", "MP4"] as const;

export const DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
] as const;

export type DayKey = (typeof DAYS)[number]["key"];

/** Every advertiser play is a fixed 15-second unit — see FEATURES.md "The Playback Unit". */
export const PLAY_SECONDS = 15;

export type TimeSlot = {
  id: string;
  name: string;
  days: DayKey[];
  /** "HH:MM" in 24h local time. */
  startTime: string;
  endTime: string;
  /** What the broadcaster charges for the whole window, per day. */
  pricePerDay: string;
};

export type ScreenDraft = {
  id: string;
  name: string;
  displayType: string;
  widthPx: string;
  heightPx: string;
  sizeLabel: string;
  formats: string[];
  orientation: string;
  /** When set, this screen mirrors the referenced screen's slots instead of its own. */
  sameScheduleAs: string | null;
  slots: TimeSlot[];
  /** ISO yyyy-mm-dd dates the screen is unavailable. */
  blockedDates: string[];
};

export type PhotoDraft = {
  id: string;
  /** Object URL for preview. Files are uploaded after the space is created. */
  previewUrl: string;
  name: string;
  isPrimary: boolean;
};

export type SpaceDraft = {
  name: string;
  description: string;
  spaceType: string;
  audience: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  country: string;
  postalCode: string;
  geoLat: number | null;
  geoLng: number | null;
  screens: ScreenDraft[];
};

export const STEPS = [
  { key: "basics", label: "Basics" },
  { key: "location", label: "Location" },
  { key: "screens", label: "Screens" },
  { key: "schedule", label: "Pricing & Schedule" },
  { key: "review", label: "Review & Submit" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function emptySlot(index: number): TimeSlot {
  return {
    id: newId(),
    name: `Time Slot ${index + 1}`,
    days: ["mon", "tue", "wed", "thu"],
    startTime: "11:00",
    endTime: "14:00",
    pricePerDay: "",
  };
}

export function emptyScreen(): ScreenDraft {
  return {
    id: newId(),
    name: "",
    displayType: "",
    widthPx: "",
    heightPx: "",
    sizeLabel: "",
    formats: [],
    orientation: "",
    sameScheduleAs: null,
    slots: [emptySlot(0)],
    blockedDates: [],
  };
}

export function emptyDraft(): SpaceDraft {
  return {
    name: "",
    description: "",
    spaceType: "",
    audience: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    region: "",
    country: "",
    postalCode: "",
    geoLat: null,
    geoLng: null,
    screens: [emptyScreen()],
  };
}

/* ---------- derived values ---------- */

/** "Mon–Thu" when the days run consecutively, otherwise "Sat, Sun". */
export function formatDays(days: DayKey[]): string {
  const order = DAYS.map(d => d.key);
  const sorted = [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  if (!sorted.length) return "No days";
  const labelOf = (k: DayKey) => DAYS.find(d => d.key === k)!.label;
  const indices = sorted.map(k => order.indexOf(k));
  const consecutive = indices.every((v, i) => i === 0 || v === indices[i - 1] + 1);
  if (consecutive && sorted.length > 2) return `${labelOf(sorted[0])}–${labelOf(sorted[sorted.length - 1])}`;
  return sorted.map(labelOf).join(", ");
}

/** Minutes covered by a slot, handling windows that wrap past midnight. */
export function slotMinutes(slot: TimeSlot): number {
  const [sh, sm] = slot.startTime.split(":").map(Number);
  const [eh, em] = slot.endTime.split(":").map(Number);
  if ([sh, sm, eh, em].some(Number.isNaN)) return 0;
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  return end > start ? end - start : 24 * 60 - start + end;
}

export function slotPlays(slot: TimeSlot): number {
  return Math.floor((slotMinutes(slot) * 60) / PLAY_SECONDS);
}

export function slotPricePerPlay(slot: TimeSlot): number {
  const plays = slotPlays(slot);
  const price = Number(slot.pricePerDay);
  if (!plays || !Number.isFinite(price) || price <= 0) return 0;
  return price / plays;
}

/** The slots a screen actually runs — its own, or those of the screen it mirrors. */
export function effectiveSlots(screen: ScreenDraft, all: ScreenDraft[]): TimeSlot[] {
  if (!screen.sameScheduleAs) return screen.slots;
  const source = all.find(s => s.id === screen.sameScheduleAs);
  return source ? source.slots : screen.slots;
}

/** Monthly ceiling if every listed slot sells out, across all screens. */
export function monthlyEarningsCeiling(screens: ScreenDraft[]): number {
  const weeksPerMonth = 52 / 12;
  return screens.reduce((total, screen) => {
    const slots = effectiveSlots(screen, screens);
    const perWeek = slots.reduce((sum, slot) => {
      const price = Number(slot.pricePerDay);
      if (!Number.isFinite(price) || price <= 0) return sum;
      return sum + price * slot.days.length;
    }, 0);
    return total + perWeek * weeksPerMonth;
  }, 0);
}

/**
 * CPM the API needs, derived from the draft's per-day pricing.
 *
 * The backend prices playbacks as `(cpm / 1000) × est_impressions_per_playback`
 * (FEATURES.md "Slot-Based Bookings"). The flow collects a price per 15-second play
 * instead, so this inverts that formula against the default impression estimate to land
 * on an equivalent CPM. Replace this once the API accepts per-day slot prices directly.
 */
export const DEFAULT_IMPRESSIONS_PER_PLAY = 10;

export function derivedCpm(screens: ScreenDraft[]): number {
  const perPlay: number[] = [];
  for (const screen of screens) {
    for (const slot of effectiveSlots(screen, screens)) {
      const p = slotPricePerPlay(slot);
      if (p > 0) perPlay.push(p);
    }
  }
  if (!perPlay.length) return 0;
  const avg = perPlay.reduce((a, b) => a + b, 0) / perPlay.length;
  return Number(((avg / DEFAULT_IMPRESSIONS_PER_PLAY) * 1000).toFixed(2));
}

export function estDailyImpressions(screens: ScreenDraft[]): number {
  let weekly = 0;
  for (const screen of screens) {
    for (const slot of effectiveSlots(screen, screens)) {
      weekly += slotPlays(slot) * slot.days.length * DEFAULT_IMPRESSIONS_PER_PLAY;
    }
  }
  return Math.round(weekly / 7);
}

/** Narrows the draft to the fields POST /api/spaces accepts today. */
export function toCreateSpacePayload(draft: SpaceDraft, venueType?: string) {
  const primary = draft.screens[0];
  const interests = draft.audience.split(",").map(s => s.trim()).filter(Boolean);
  return {
    name: draft.name,
    description: draft.description || undefined,
    space_type: draft.spaceType,
    display_type: primary?.displayType || "other",
    city: draft.city,
    country: draft.country,
    cpm: derivedCpm(draft.screens),
    width_px: primary?.widthPx ? Number(primary.widthPx) : undefined,
    height_px: primary?.heightPx ? Number(primary.heightPx) : undefined,
    size_label: primary?.sizeLabel || undefined,
    est_daily_impressions: estDailyImpressions(draft.screens) || undefined,
    interests: interests.length ? interests : undefined,
    venue_type: venueType || undefined,
    address_line1: draft.addressLine1 || undefined,
    address_line2: draft.addressLine2 || undefined,
    region: draft.region || undefined,
    postal_code: draft.postalCode || undefined,
  };
}

/* ---------- draft persistence ---------- */

const DRAFT_KEY = "adtua_space_draft";

export function saveDraft(draft: SpaceDraft, step: StepKey): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, step }));
  } catch {
    /* storage unavailable — the draft just won't survive a reload */
  }
}

export function loadDraft(): { draft: SpaceDraft; step: StepKey } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { draft: SpaceDraft; step: StepKey };
    if (!parsed?.draft) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* no-op */
  }
}
