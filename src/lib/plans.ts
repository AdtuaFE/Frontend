// Plan/billing state — the backend has no subscription or billing endpoints yet, so this is a
// client-side placeholder persisted to localStorage per user+role. Nothing here is visible to
// other users or devices. Functions already return Promises so callers won't change when this
// is swapped for real `api.*` calls (Stripe-backed) once the backend ships billing endpoints.

export type Role = "advertiser" | "broadcaster";
export type AdvertiserTier = "free" | "premium";
export type BroadcasterTier = "free" | "solo" | "bundle";
export type Tier = AdvertiserTier | BroadcasterTier;
export type PaidTier = Exclude<Tier, "free">;
export type Billing = "monthly" | "annual";

export type PlanState = {
  tier: Tier;
  billing: Billing | null;
  startedAt: string | null;
  amountPaid: number | null;
  renewsAt: string | null;
  cancelsAt: string | null; // set once cancelled; plan stays active until this date
};

export type Invoice = { date: string; amount: number; status: "paid" };

type PaidPlan = {
  label: string;
  priceMonthly: number;
  priceAnnual?: number; // per-month price when billed annually; absent = no annual option
  features: string[];
};

const FREE_STATE: PlanState = {
  tier: "free", billing: null, startedAt: null, amountPaid: null, renewsAt: null, cancelsAt: null,
};

export const ADVERTISER_FREE_IMPRESSIONS = 50;
export const ADVERTISER_PREMIUM_IMPRESSIONS = 100;

/** Share of booking revenue a broadcaster keeps, by plan. Paid tiers advertise a 55% split. */
export const BROADCASTER_FREE_SHARE = 0.4;
export const BROADCASTER_PAID_SHARE = 0.55;

export const PAID_PLANS: Record<PaidTier, PaidPlan & { displays?: number }> = {
  premium: {
    label: "Premium",
    priceMonthly: 50,
    priceAnnual: 45,
    features: ["100 impressions / month", "Choose your own time slot", "Send requests to any broadcaster"],
  },
  solo: {
    label: "Solo",
    priceMonthly: 50,
    priceAnnual: 45,
    displays: 1,
    features: ["1 display total", "55% revenue split", "Receive direct offer requests"],
  },
  bundle: {
    label: "Bundle",
    priceMonthly: 450,
    displays: 10,
    features: ["10 displays total", "$45/display", "55% revenue split", "Receive direct offer requests"],
  },
};

export function chargeFor(tier: PaidTier, billing: Billing): number {
  const plan = PAID_PLANS[tier];
  return billing === "annual" && plan.priceAnnual ? plan.priceAnnual * 12 : plan.priceMonthly;
}

// setMonth on the 29th–31st overflows into the following month (Jan 31 + 1 → Mar 3), so clamp
// to the last day of the target month instead.
function addMonthsClamped(from: Date, months: number): Date {
  const d = new Date(from);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

const monthsPerPeriod = (billing: Billing) => (billing === "annual" ? 12 : 1);

export function nextRenewal(from: Date, billing: Billing): Date {
  return addMonthsClamped(from, monthsPerPeriod(billing));
}

export function formatDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function storageKey(userId: number, role: Role): string {
  return `adtua_plan_${role}_${userId}`;
}

export function getPlanState(userId: number, role: Role): PlanState {
  let state: PlanState;
  try {
    const raw = localStorage.getItem(storageKey(userId, role));
    state = raw ? { ...FREE_STATE, ...(JSON.parse(raw) as Partial<PlanState>) } : FREE_STATE;
  } catch {
    return FREE_STATE;
  }
  if (state.tier === "free" || !state.renewsAt || !state.billing) return state;
  if (state.amountPaid == null) state = { ...state, amountPaid: chargeFor(state.tier, state.billing) };

  const now = new Date();
  if (state.cancelsAt && new Date(state.cancelsAt) <= now) return FREE_STATE;

  // Simulate auto-renewal so a mock subscription doesn't show a renewal date in the past. Each
  // period is counted from the start date, not the previous renewal, so a clamp (Jan 31 → Feb 28)
  // doesn't carry into later months.
  const anchor = new Date(state.startedAt ?? state.renewsAt);
  const step = monthsPerPeriod(state.billing);
  let periods = state.startedAt ? 1 : 0;
  let renews = addMonthsClamped(anchor, periods * step);
  while (renews <= now) renews = addMonthsClamped(anchor, ++periods * step);
  return { ...state, renewsAt: renews.toISOString() };
}

function persist(userId: number, role: Role, state: PlanState) {
  try {
    localStorage.setItem(storageKey(userId, role), JSON.stringify(state));
  } catch {
    // storage unavailable (private mode etc.) — the placeholder just won't persist
  }
}

export async function subscribe(userId: number, role: Role, tier: PaidTier, billing: Billing): Promise<PlanState> {
  const now = new Date();
  const state: PlanState = {
    tier,
    billing,
    startedAt: now.toISOString(),
    amountPaid: chargeFor(tier, billing),
    renewsAt: nextRenewal(now, billing).toISOString(),
    cancelsAt: null,
  };
  persist(userId, role, state);
  return state;
}

export async function cancelSubscription(userId: number, role: Role): Promise<PlanState> {
  const current = getPlanState(userId, role);
  const state: PlanState = { ...current, cancelsAt: current.renewsAt };
  persist(userId, role, state);
  return state;
}

export function isPaid(tier: Tier): tier is PaidTier {
  return tier !== "free";
}

// Only the charge actually made through this placeholder — no invented history.
export function getInvoices(state: PlanState): Invoice[] {
  if (!state.startedAt || state.amountPaid == null) return [];
  return [{ date: state.startedAt, amount: state.amountPaid, status: "paid" }];
}
