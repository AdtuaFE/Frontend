import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { CampaignButton } from "@/components/campaigns/CampaignBits";
import { BuyScreensButton } from "@/components/BuyScreensButton";
import { api } from "@/lib/api";
import {
  KIND_LABEL, TEST_CARD_HINT, money, refreshAfterPayment, useBilling, useBillingPlans, useInvoices, type Billing,
} from "@/lib/billing";
import { formatDate } from "@/lib/dates";
import { Pill, Section } from "./SettingsBits";

// The broadcaster's Premium plan (backend ticket 52). Nothing here charges without a click:
// each month is renewed by the broadcaster, and extra screens are bought explicitly.

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

function Stats({ items }: { items: { term: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map(i => (
        <div key={i.term} className="flex flex-col">
          <dt className="text-[13px] leading-[18px] text-[#656972]">{i.term}</dt>
          <dd className="pt-0.5 text-base font-semibold leading-6 text-[#4a4d56]">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Notice({ tone, children }: { tone: "warn" | "ok" | "info"; children: React.ReactNode }) {
  const cls = tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-900"
    : tone === "ok" ? "border-[#c6ecd2] bg-[#edfaf0] text-[#014d27]"
    : "border-[#cad6fe] bg-[#f8faff] text-[#1a1d25]";
  const Icon = tone === "ok" ? CheckCircle2 : AlertTriangle;
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm leading-5 ${cls}`}>
      {tone !== "info" && <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
      <div className="flex min-w-0 flex-1 flex-col gap-3">{children}</div>
    </div>
  );
}

/** A pay button that always shows the amount and asks once more before charging. */
function ConfirmPay({ label, title, body, confirmLabel, onPay, variant = "primary" }: {
  label: string; title: string; body: React.ReactNode; confirmLabel: string;
  onPay: () => Promise<void>; variant?: "primary" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <div><CampaignButton size="md" variant={variant} onClick={() => setOpen(true)}>{label}</CampaignButton></div>
      <AlertDialog open={open} onOpenChange={o => !busy && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription asChild><div className="space-y-2">{body}</div></AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Not now</AlertDialogCancel>
            <AlertDialogAction disabled={busy}
              onClick={async e => { e.preventDefault(); setBusy(true); try { await onPay(); setOpen(false); } finally { setBusy(false); } }}>
              {busy ? "Working…" : confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function RenewalBlock({ billing }: { billing: Billing }) {
  const queryClient = useQueryClient();
  const sub = billing.subscription!;
  const renewal = billing.renewal!;

  const approve = async () => {
    try {
      const result = await api.post<{ blocks_paid: boolean; failure_code: string | null }>("/api/billing/renewal/approve");
      await refreshAfterPayment(queryClient);
      if (result.blocks_paid) toast.success("Next month is paid");
      else toast.warning("Premium is renewed, but the extra screens payment didn't go through", {
        description: "Next month will run 10 screens until you pay for the extra ones.",
      });
    } catch (err) {
      toast.error("Payment didn't go through", { description: err instanceof Error ? err.message : undefined });
    }
  };

  const setCancel = async (cancel: boolean) => {
    try {
      await api.post("/api/billing/subscription/cancel", { cancel });
      await refreshAfterPayment(queryClient);
      toast.success(cancel ? "You won't be asked to renew" : "Renewal is back on");
    } catch (err) {
      toast.error("Couldn't update your plan", { description: err instanceof Error ? err.message : undefined });
    }
  };

  const breakdown = renewal.blocks_cents > 0
    ? `${money(renewal.base_cents)} for Premium + ${money(renewal.blocks_cents)} for ${renewal.blocks * 10} extra screens`
    : null;

  if (sub.cancel_at_period_end) {
    return (
      <Notice tone="warn">
        <p>You chose not to renew. Premium ends on <strong>{dateTime(renewal.due_by)}</strong>. After that only your default screen keeps running.</p>
        <div><CampaignButton size="md" onClick={() => setCancel(false)}>Renew after all</CampaignButton></div>
      </Notice>
    );
  }

  if (sub.next_period_paid && !sub.next_blocks_unpaid) {
    return (
      <Notice tone="ok">
        <p>Next month is paid. It starts {dateTime(renewal.next_period_start)} with up to {renewal.allowance_next_period} screens.</p>
      </Notice>
    );
  }

  if (sub.next_period_paid && sub.next_blocks_unpaid) {
    return (
      <Notice tone="warn">
        <p>Premium is renewed, but the payment for your extra screens next month didn't go through. Without it, next month runs 10 screens and the rest turn off.</p>
        <ConfirmPay label={`Pay ${money(renewal.total_cents)} for extra screens`} title="Pay for next month's extra screens?"
          confirmLabel={`Pay ${money(renewal.total_cents)}`} onPay={approve}
          body={<p>You'll be charged <strong>{money(renewal.total_cents)}</strong> now for {renewal.blocks * 10} extra screens next month.</p>} />
      </Notice>
    );
  }

  return (
    <Notice tone="info">
      <p>
        <strong>Renew for next month: {money(renewal.total_cents)}</strong>, due by {dateTime(renewal.due_by)}.
        {breakdown && <span className="block text-[13px] text-[#656972]">{breakdown}</span>}
      </p>
      <p className="text-[13px] text-[#656972]">
        Nothing is charged until you pay. If it isn't paid by then, only your default screen keeps running; the rest
        come back on as soon as you renew. We'll remind you 7 days and 48 hours before.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <ConfirmPay label={`Pay ${money(renewal.total_cents)} now`} title="Renew Premium for next month?"
          confirmLabel={`Pay ${money(renewal.total_cents)}`} onPay={approve}
          body={<>
            <p>You'll be charged <strong>{money(renewal.total_cents)}</strong> now{breakdown ? ` (${breakdown})` : ""}.</p>
            <p>Next month runs from {dateTime(renewal.next_period_start)} to {dateTime(renewal.next_period_end)}, with up to {renewal.allowance_next_period} screens.</p>
          </>} />
        <button type="button" onClick={() => setCancel(true)} className="text-[13px] font-medium text-[#656972] hover:underline">
          Don't renew
        </button>
      </div>
    </Notice>
  );
}

function CardForm({ onSaved, submitLabel = "Save card" }: { onSaved: () => void; submitLabel?: string }) {
  const queryClient = useQueryClient();
  const [number, setNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/billing/payment-methods", { card_number: number });
      await queryClient.invalidateQueries({ queryKey: ["billing"] });
      toast.success("Card saved");
      onSaved();
    } catch (err) {
      toast.error("Couldn't save the card", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Input value={number} onChange={e => setNumber(e.target.value)} placeholder="4242 4242 4242 4242"
          autoComplete="off" inputMode="numeric" className="h-10 max-w-[280px] rounded-lg" aria-label="Card number" />
        <CampaignButton size="md" type="submit" disabled={saving || number.replace(/\D/g, "").length < 12}>
          {saving ? "Saving…" : submitLabel}
        </CampaignButton>
      </div>
      <p className="text-xs leading-5 text-[#656972]">{TEST_CARD_HINT}</p>
    </form>
  );
}

export function BroadcasterBilling({ title }: { title: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: billing, isLoading } = useBilling();
  const { data: plans } = useBillingPlans();
  const { data: invoices = [] } = useInvoices(billing?.plan === "premium" || !!billing?.payment_method);
  const [replacingCard, setReplacingCard] = useState(false);

  if (isLoading || !billing || !plans) {
    return <Section title={title}><p className="text-sm text-[#656972]">Loading…</p></Section>;
  }

  const premium = plans.premium;
  const sub = billing.subscription;

  const retryBlocks = async () => {
    try {
      await api.post("/api/billing/blocks/retry");
      await refreshAfterPayment(queryClient);
      toast.success("Extra screens are paid and back on");
    } catch (err) {
      toast.error("Payment didn't go through", { description: err instanceof Error ? err.message : undefined });
    }
  };

  return (
    <>
      <Section title={title}
        description={sub ? "You renew each month yourself. Nothing is charged automatically." : "You're on Free, with 1 running screen."}>
        {!sub ? (
          <>
            <Stats items={[
              { term: "Plan", value: "Free" },
              { term: "Running screens", value: `Up to ${billing.allowance}` },
              { term: "Your screens", value: String(billing.screens) },
            ]} />
            <div className="flex flex-wrap items-center gap-x-14 gap-y-3 rounded-xl bg-[#f8faff] px-4 py-3.5">
              <p className="min-w-0 flex-1 text-sm leading-5 text-[#4a4d56]">
                Premium runs up to {premium.included_screens} screens for {money(premium.base_price_cents)} a month, plus{" "}
                {money(premium.block_price_cents)} a month for each {premium.block_size} more.
              </p>
              <CampaignButton onClick={() => navigate("/settings/upgrade/broadcaster")}>Upgrade to Premium</CampaignButton>
            </div>
          </>
        ) : (
          <>
            <Stats items={[
              { term: "Plan", value: "Premium" },
              { term: "Screens", value: `${billing.screens} of ${billing.allowance}` },
              { term: "This month ends", value: formatDate(sub.current_period_end) },
            ]} />
            {sub.blocks_unpaid && (
              <Notice tone="warn">
                <p>This month's extra screens aren't paid, so only {premium.included_screens} screens can run.</p>
                <ConfirmPay label="Pay for extra screens" title="Pay for this month's extra screens?" confirmLabel="Pay now"
                  onPay={retryBlocks}
                  body={<p>You'll be charged for the extra screens you have, for the rest of this month. Screens your plan turned off come back on.</p>} />
              </Notice>
            )}
            <RenewalBlock billing={billing} />
            {billing.block_purchase?.can_purchase && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-[#4a4d56]">Need more than {billing.allowance} screens?</p>
                <div><BuyScreensButton purchase={billing.block_purchase} /></div>
              </div>
            )}
          </>
        )}
      </Section>

      {(sub || billing.payment_method) && (
        <Section title="Payment method" description="Used when you renew or add screens. Only charged when you press pay.">
          {billing.payment_method && !replacingCard ? (
            <div className="flex flex-wrap items-center gap-4 rounded-xl border-[0.8px] border-[#e3e5ea] bg-white p-4">
              <span className="grid h-6 w-9 place-items-center rounded bg-[#1a1f71] text-[10px] font-bold italic text-white">
                {billing.payment_method.brand.slice(0, 4).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium leading-5 text-[#1a1d25]">
                <span className="capitalize">{billing.payment_method.brand}</span> ending in {billing.payment_method.last4}
              </span>
              <CampaignButton onClick={() => setReplacingCard(true)}>Replace card</CampaignButton>
            </div>
          ) : (
            <CardForm onSaved={() => setReplacingCard(false)} />
          )}
        </Section>
      )}

      {invoices.length > 0 && (
        <Section title="Invoices" description="Every Premium charge attempt, including declined ones.">
          <div className="overflow-x-auto rounded-xl border-[0.8px] border-[#e3e5ea]">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-[#f8faff] text-[13px] font-medium text-[#656972]">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Description</th>
                  <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-t-[0.8px] border-[#e3e5ea] text-[#1a1d25]">
                    <td className="px-4 py-3.5">{formatDate(inv.charged_at)}</td>
                    <td className="px-4 py-3.5">{KIND_LABEL[inv.kind] ?? inv.kind}</td>
                    <td className="px-4 py-3.5 text-right">{money(inv.amount_cents)}</td>
                    <td className="px-4 py-3.5">
                      {inv.status === "paid" ? <Pill tone="green">Paid</Pill> : <Pill tone="red">Declined</Pill>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </>
  );
}

export { CardForm };
