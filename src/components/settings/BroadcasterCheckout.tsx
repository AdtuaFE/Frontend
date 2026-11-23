import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { TEST_CARD_HINT, money, refreshAfterPayment, subscribeTotal, useBilling, useBillingPlans } from "@/lib/billing";
import { formatDate } from "@/lib/dates";

const inputCn = "h-10 rounded-lg border-[#d7dce3] bg-white text-sm shadow-none focus-visible:ring-[#3a47c2]";

/** Monthly date one month from now, as the backend's period starts now and keeps the day. */
function oneMonthFrom(d: Date) {
  const next = new Date(d);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  next.setDate(Math.min(day, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
  return next;
}

/** Premium checkout for a broadcaster: pays the first month now. Later months are renewed by hand. */
export function BroadcasterCheckout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: billing } = useBilling();
  const { data: plans } = useBillingPlans();
  const [useSaved, setUseSaved] = useState(true);
  const [cardNumber, setCardNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (billing?.plan === "premium") return <Navigate to="/settings?tab=plans" replace />;
  const ready = billing && plans;
  const premium = plans?.premium;
  const total = ready ? subscribeTotal(premium!, billing.screens) : null;
  const savedCard = billing?.payment_method;
  const payWithSaved = !!savedCard && useSaved;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!payWithSaved) await api.post("/api/billing/payment-methods", { card_number: cardNumber });
      await api.post("/api/billing/subscription");
      await refreshAfterPayment(queryClient);
      navigate("/settings/upgrade/broadcaster/confirmation");
    } catch (err) {
      toast.error("Upgrade didn't go through", { description: err instanceof Error ? err.message : undefined });
      await queryClient.invalidateQueries({ queryKey: ["billing"] });
      setSubmitting(false);
    }
  };

  return (
    <AppLayout activeNav="settings">
      <div className="max-w-4xl mx-auto py-4 space-y-8">
        <button onClick={() => navigate("/settings?tab=plans")}
          className="flex items-center gap-2 bg-[#f9f9f9] rounded-xl pl-3 pr-4 py-2 text-sm font-medium text-[#4a5565] hover:bg-[#f1f1f1] transition-colors">
          <ArrowLeft className="h-5 w-5" /> Back
        </button>

        {!ready || !premium || !total ? (
          <p className="text-sm text-[#656972]">Loading…</p>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-14 items-start md:grid-cols-2">
            <div className="border border-[#e8e8e8] rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <p className="text-base font-semibold text-[#4a5565]">Order summary</p>
                <p className="text-xs text-[#767676]">Premium · monthly</p>
              </div>
              <div className="text-xs">
                <div className="flex justify-between py-4 border-b border-[#e8e8e8]">
                  <span className="text-[#767676]">Premium, up to {premium.included_screens} screens</span>
                  <span className="font-semibold text-[#4a5565]">{money(premium.base_price_cents)}</span>
                </div>
                {total.blocks > 0 && (
                  <div className="flex justify-between py-4 border-b border-[#e8e8e8]">
                    <span className="text-[#767676]">
                      {total.blocks * premium.block_size} extra screens (you have {billing.screens})
                    </span>
                    <span className="font-semibold text-[#4a5565]">{money(total.blocksCents)}</span>
                  </div>
                )}
                <div className="flex justify-between py-4 border-b border-[#e8e8e8]">
                  <span className="text-[#767676]">This month</span>
                  <span className="font-semibold text-[#4a5565]">{formatDate(new Date())} – {formatDate(oneMonthFrom(new Date()))}</span>
                </div>
                <div className="flex justify-between py-4 font-semibold text-[#4a5565]">
                  <span className="text-sm">Due today</span>
                  <span className="text-base">{money(total.totalCents)}</span>
                </div>
              </div>
              <div className="space-y-1">
                {[
                  `Run up to ${premium.included_screens} screens across all your spaces`,
                  `${money(premium.block_price_cents)}/month for each ${premium.block_size} more, only when you add them`,
                  "Screens your plan turned off come back on right away",
                ].map(f => (
                  <div key={f} className="flex items-center gap-[9px] py-2">
                    <div className="size-5 rounded-[10px] bg-[#3a47c2] flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <p className="text-xs text-[#4a5565]">{f}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-[#e8e8e8] rounded-2xl p-6 shadow-sm space-y-4">
              <p className="text-base font-semibold text-[#4a5565]">Pay with</p>
              {savedCard && useSaved ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-[#e8e8e8] p-3 text-sm">
                  <span><span className="capitalize">{savedCard.brand}</span> ending in {savedCard.last4}</span>
                  <button type="button" onClick={() => setUseSaved(false)} className="text-[13px] font-medium text-[#3a47c2]">Use another card</button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="pay-card">Card number</Label>
                  <Input id="pay-card" value={cardNumber} onChange={e => setCardNumber(e.target.value)}
                    placeholder="4242 4242 4242 4242" autoComplete="off" inputMode="numeric" className={inputCn} />
                  <p className="text-xs leading-5 text-[#656972]">{TEST_CARD_HINT}</p>
                  {savedCard && (
                    <button type="button" onClick={() => setUseSaved(true)} className="text-[13px] font-medium text-[#3a47c2]">
                      Use {savedCard.brand} ending in {savedCard.last4}
                    </button>
                  )}
                </div>
              )}

              <Button type="submit" disabled={submitting || (!payWithSaved && cardNumber.replace(/\D/g, "").length < 12)}
                className="w-full bg-[#3a47c2] hover:bg-[#2f3a9e] text-white py-5">
                {submitting ? "Processing…" : `Pay ${money(total.totalCents)} and upgrade`}
              </Button>
              <p className="text-[11px] text-[#8a93a1] leading-[17px]">
                You'll be charged {money(total.totalCents)} today for this month. Nothing renews automatically: before
                each month ends you'll be asked to renew, with reminders 7 days and 48 hours ahead. If a month isn't
                renewed, only your default screen keeps running until you pay again.
              </p>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
