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

export function nextRenewal(from: Date, billing: Billing): Date {
  const d = new Date(from);
  if (billing === "annual") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
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

  // Simulate auto-renewal so a mock subscription doesn't show a renewal date in the past.
  let renews = new Date(state.renewsAt);
  while (renews <= now) renews = nextRenewal(renews, state.billing);
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
