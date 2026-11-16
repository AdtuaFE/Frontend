import { useQuery, type QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { SCREEN_ALLOWANCE_KEY } from "@/lib/screenAllowance";

// Broadcaster Premium billing (backend ticket 52). Payments are simulated server-side until real
// Stripe is wired in: only Stripe test card numbers work, and nothing is ever charged unless the
// broadcaster presses pay.

export type BillingPlan = {
  code: "freemium" | "premium";
  name: string;
  base_price_cents: number;
  included_screens: number;
  block_price_cents: number;
  block_size: number;
};

export type Billing = {
  plan: "freemium" | "premium";
  allowance: number;
  screens: number;
  payment_method: { brand: string; last4: string; created_at: string } | null;
  subscription: {
    current_period_start: string;
    current_period_end: string;
    paid_blocks: number;
    blocks_unpaid: boolean;
    cancel_at_period_end: boolean;
    next_period_paid: boolean;
    next_blocks_unpaid: boolean;
  } | null;
  renewal: {
    due_by: string;
    next_period_start: string;
    next_period_end: string;
    base_cents: number;
    blocks: number;
    blocks_cents: number;
    total_cents: number;
    base_paid: boolean;
    blocks_paid: boolean;
    allowance_next_period: number;
  } | null;
  block_purchase: {
    block_size: number;
    amount_now_cents: number;
    prorated_this_period_cents: number;
    next_period_cents: number;
    monthly_price_cents: number;
    period_end: string;
    allowance_after: number;
    can_purchase: boolean;
  } | null;
};

export type Invoice = {
  id: number;
  kind: string;
  amount_cents: number;
  status: "paid" | "failed";
  failure_code: string | null;
  charged_at: string;
  lines: { description: string; quantity: number; unit_amount_cents: number; amount_cents: number }[];
};

export const BILLING_KEY = ["billing"] as const;
export const BILLING_PLANS_KEY = ["billing-plans"] as const;
export const BILLING_INVOICES_KEY = ["billing-invoices"] as const;

export function useBilling(enabled = true) {
  return useQuery<Billing>({ queryKey: BILLING_KEY, queryFn: () => api.get<Billing>("/api/billing"), enabled });
}

export function useBillingPlans() {
  return useQuery<{ freemium: BillingPlan; premium: BillingPlan }>({
    queryKey: BILLING_PLANS_KEY,
    queryFn: () => api.get("/api/billing/plans"),
    staleTime: 5 * 60_000,
  });
}

export function useInvoices(enabled = true) {
  return useQuery<Invoice[]>({
    queryKey: BILLING_INVOICES_KEY,
    queryFn: () => api.get<Invoice[]>("/api/billing/invoices"),
    enabled,
  });
}

/** After any payment: billing, invoices and the screens it turned on or off all change. */
export function refreshAfterPayment(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: BILLING_KEY }),
    queryClient.invalidateQueries({ queryKey: BILLING_INVOICES_KEY }),
    queryClient.invalidateQueries({ queryKey: SCREEN_ALLOWANCE_KEY }),
    queryClient.invalidateQueries({ queryKey: ["space-screens"] }),
  ]);
}

export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** Extra blocks a screen count needs on Premium; same rule as the backend. */
export function blocksFor(plan: BillingPlan, screens: number): number {
  const extra = screens - plan.included_screens;
  return plan.block_price_cents > 0 && extra > 0 ? Math.ceil(extra / plan.block_size) : 0;
}

/** What subscribing costs today for a broadcaster who already has `screens` screens. */
export function subscribeTotal(plan: BillingPlan, screens: number) {
  const blocks = blocksFor(plan, screens);
  return { blocks, blocksCents: blocks * plan.block_price_cents, totalCents: plan.base_price_cents + blocks * plan.block_price_cents };
}

/** Stripe's published test card numbers, the only ones the simulation accepts. */
export const TEST_CARD_HINT = "Billing is simulated for now. Use a Stripe test card: 4242 4242 4242 4242 succeeds, 4000 0000 0000 0002 is declined.";

export const KIND_LABEL: Record<string, string> = {
  subscription_create: "Premium, first month",
  subscription_create_blocks: "Extra screens, first month",
  renewal_base: "Premium, next month",
  renewal_blocks: "Extra screens, next month",
  block_proration: "10 more screens",
  blocks_retry: "Extra screens, this month",
};
