import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CampaignButton } from "@/components/campaigns/CampaignBits";
import { api } from "@/lib/api";
import { money, refreshAfterPayment, type Billing } from "@/lib/billing";
import { formatDate } from "@/lib/dates";

/**
 * Buys 10 more screens on Premium, only after the broadcaster confirms the price. Adding a
 * screen never charges by itself; this is the one way to raise the limit mid-month.
 */
export function BuyScreensButton({ purchase, onBought, size = "md" }: {
  purchase: NonNullable<Billing["block_purchase"]>;
  onBought?: () => void;
  size?: "sm" | "md";
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [paying, setPaying] = useState(false);

  const pay = async () => {
    setPaying(true);
    try {
      await api.post("/api/billing/blocks");
      await refreshAfterPayment(queryClient);
      toast.success(`You can now run up to ${purchase.allowance_after} screens`);
      setOpen(false);
      onBought?.();
    } catch (err) {
      toast.error("Payment didn't go through", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setPaying(false);
    }
  };

  return (
    <>
      <CampaignButton size={size} variant="primary" disabled={!purchase.can_purchase} onClick={() => setOpen(true)}>
        Add {purchase.block_size} more screens · {money(purchase.amount_now_cents)}
      </CampaignButton>
      <AlertDialog open={open} onOpenChange={o => !paying && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add {purchase.block_size} more screens?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  You'll be charged <strong>{money(purchase.amount_now_cents)}</strong> now
                  {purchase.next_period_cents > 0
                    ? ` (${money(purchase.prorated_this_period_cents)} for the rest of this month, ending ${formatDate(purchase.period_end)}, plus ${money(purchase.next_period_cents)} for next month, which you've already renewed).`
                    : ` for the rest of this month, ending ${formatDate(purchase.period_end)}.`}
                </p>
                <p>
                  Your limit goes up to {purchase.allowance_after} screens right away. From next month they cost{" "}
                  {money(purchase.monthly_price_cents)}/month, included in your renewal.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={paying}>Not now</AlertDialogCancel>
            <AlertDialogAction disabled={paying} onClick={e => { e.preventDefault(); void pay(); }}>
              {paying ? "Paying…" : `Pay ${money(purchase.amount_now_cents)}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
