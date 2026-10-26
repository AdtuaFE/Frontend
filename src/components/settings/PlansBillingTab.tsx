import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { CampaignButton } from "@/components/campaigns/CampaignBits";
import { CancelPremiumModal } from "@/components/CancelPremiumModal";
import { useAuth } from "@/context/AuthContext";
import {
  ADVERTISER_FREE_IMPRESSIONS, ADVERTISER_PREMIUM_IMPRESSIONS, BROADCASTER_FREE_SHARE, BROADCASTER_PAID_SHARE, PAID_PLANS,
  cancelSubscription, formatDate, getInvoices, getPlanState, isPaid, nextRenewal, type PlanState, type Role,
} from "@/lib/plans";
import { ChoosePlanDialog } from "./ChoosePlanDialog";
import { Pill, Section, SoonTag } from "./SettingsBits";

// Analytics isn't exposed by the API yet, so impressions used are a placeholder (as before).
const IMPRESSIONS_USED = 38;

const pct = (n: number) => `${Math.round(n * 100)}%`;
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const firstOfNextMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString(); };

/** Impressions are per month, so a yearly plan still resets on each monthly anniversary. */
function usageResets(p: PlanState): string {
  if (p.billing !== "annual" || !p.startedAt) return p.renewsAt!;
  const now = new Date();
  let d = new Date(p.startedAt);
  while (d <= now) d = nextRenewal(d, "monthly");
  return d.toISOString();
}

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

function Usage({ used, limit, right }: { used: number; limit: number; right: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p><span className="text-xl font-semibold leading-7 text-[#1a1d25]">{used}</span> <span className="text-sm leading-5 text-[#656972]">of {limit} impressions</span></p>
        <p className="text-sm leading-5 text-[#656972]">{right}</p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-[#e3eafe]" role="progressbar" aria-valuenow={used} aria-valuemax={limit} aria-label="Impressions used">
        <div className="h-full rounded bg-[#3a47c2]" style={{ width: `${Math.min(100, (used / limit) * 100)}%` }} />
      </div>
    </div>
  );
}

function Upsell({ children, onUpgrade }: { children: string; onUpgrade: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-14 gap-y-3 rounded-xl bg-[#f8faff] px-4 py-3.5">
      <p className="min-w-0 flex-1 text-sm leading-5 text-[#4a4d56]">{children}</p>
      <CampaignButton onClick={onUpgrade}>Upgrade plan</CampaignButton>
    </div>
  );
}

const priceLabel = (p: PlanState) => (p.billing === "annual" ? `$${p.amountPaid} / year` : `$${p.amountPaid} / month`);

export function PlansBillingTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdvertiser = user?.roles.includes("advertiser") ?? false;
  const isBroadcaster = user?.roles.includes("broadcaster") ?? false;
  const isDual = isAdvertiser && isBroadcaster;
  const [plans, setPlans] = useState(() => ({
    advertiser: getPlanState(user!.id, "advertiser"),
    broadcaster: getPlanState(user!.id, "broadcaster"),
  }));
  const [dialogRole, setDialogRole] = useState<Role | null>(null);
  const [cancelRole, setCancelRole] = useState<Role | null>(null);
  const [cancelling, setCancelling] = useState(false);

  if (!user) return null;
  const roles = ([isAdvertiser && "advertiser", isBroadcaster && "broadcaster"].filter(Boolean)) as Role[];
  const paidRoles = roles.filter(r => isPaid(plans[r].tier));
  const roleTitle = (r: Role) => (isDual ? (r === "advertiser" ? "Advertiser plan" : "Broadcaster plan") : "Current plan");

  const confirmCancel = async () => {
    if (!cancelRole) return;
    setCancelling(true);
    try {
      const next = await cancelSubscription(user.id, cancelRole);
      setPlans(p => ({ ...p, [cancelRole]: next }));
      toast.success(`Premium stays active until ${formatDate(next.cancelsAt!)}`);
      setCancelRole(null);
    } catch {
      toast.error("Couldn't cancel. Try again.");
    } finally {
      setCancelling(false);
    }
  };

  const advertiserSection = (p: PlanState) => (
    <Section key="advertiser" title={roleTitle("advertiser")}
      description={isDual ? "For booking screens. Each role has its own plan, so upgrading one leaves the other as it is."
        : isPaid(p.tier) ? "Your plan renews automatically. You can switch or cancel any time." : "You're on Free. Usage resets at the start of each month."}>
      {isPaid(p.tier) ? (
        <>
          <Stats items={[
            { term: "Plan", value: "Premium" },
            { term: "Price", value: priceLabel(p) },
            { term: p.cancelsAt ? "Ends" : "Next charge", value: formatDate((p.cancelsAt ?? p.renewsAt)!) },
          ]} />
          <Usage used={IMPRESSIONS_USED} limit={ADVERTISER_PREMIUM_IMPRESSIONS} right={`Resets ${shortDate(usageResets(p))}`} />
          <div className="flex flex-wrap items-center gap-5">
            {p.billing === "monthly" && !p.cancelsAt && (
              <CampaignButton onClick={() => navigate("/settings/upgrade/advertiser?billing=annual")}>Switch to yearly and save 10%</CampaignButton>
            )}
            <button type="button" onClick={() => setDialogRole("advertiser")} className="text-[13px] font-medium leading-5 text-[#3a47c2] hover:underline">Compare plans</button>
          </div>
        </>
      ) : (
        <>
          <Usage used={IMPRESSIONS_USED} limit={ADVERTISER_FREE_IMPRESSIONS} right={`Free · Resets ${shortDate(firstOfNextMonth())}`} />
          <Upsell onUpgrade={() => setDialogRole("advertiser")}>
            {`Premium gives you ${ADVERTISER_PREMIUM_IMPRESSIONS} impressions a month, your own time slots and requests to any broadcaster for $${PAID_PLANS.premium.priceMonthly} a month.`}
          </Upsell>
        </>
      )}
    </Section>
  );

  const broadcasterSection = (p: PlanState) => (
    <Section key="broadcaster" title={roleTitle("broadcaster")}
      description={isDual ? "For listing your screens. Billed separately from your advertiser plan."
        : isPaid(p.tier) ? "Your plan renews automatically. You can switch or cancel any time." : "You're on Free. Upgrade any time to keep more of each booking."}>
      {isPaid(p.tier) ? (
        <>
          <Stats items={[
            { term: "Plan", value: `Premium · ${p.tier === "bundle" ? "10 displays" : "1 display"}` },
            { term: "Price", value: priceLabel(p) },
            { term: p.cancelsAt ? "Ends" : "Next charge", value: formatDate((p.cancelsAt ?? p.renewsAt)!) },
          ]} />
          <div className="flex flex-wrap items-center gap-5">
            {!p.cancelsAt && (
              <CampaignButton onClick={() => navigate(`/settings/upgrade/broadcaster?tier=${p.tier === "bundle" ? "solo" : "bundle"}`)}>
                {p.tier === "bundle" ? "Change to 1 display" : "Change to 10 displays"}
              </CampaignButton>
            )}
            <button type="button" onClick={() => setDialogRole("broadcaster")} className="text-[13px] font-medium leading-5 text-[#3a47c2] hover:underline">Compare plans</button>
          </div>
        </>
      ) : (
        <>
          <Stats items={[
            { term: "Plan", value: "Free" },
            { term: "Your share", value: `${pct(BROADCASTER_FREE_SHARE)} of each booking` },
            { term: "Adtua's share", value: pct(1 - BROADCASTER_FREE_SHARE) },
          ]} />
          <Upsell onUpgrade={() => setDialogRole("broadcaster")}>
            {`Premium lets you keep ${pct(BROADCASTER_PAID_SHARE)} of each booking, for $${PAID_PLANS.solo.priceMonthly} a month on 1 display or $${PAID_PLANS.bundle.priceMonthly} on up to 10.`}
          </Upsell>
        </>
      )}
    </Section>
  );

  const card = paidRoles.map(r => plans[r].card).find(Boolean);
  const invoices = paidRoles
    .flatMap(r => getInvoices(plans[r]).map(inv => ({
      ...inv,
      label: `${isDual ? (r === "advertiser" ? "Advertiser " : "Broadcaster ") : ""}Premium${r === "broadcaster" ? (plans[r].tier === "bundle" ? " · 10 displays" : " · 1 display") : ""}, ${plans[r].billing === "annual" ? "yearly" : "monthly"}`,
    })))
    .sort((a, b) => b.date.localeCompare(a.date));
  const cancelPlan = cancelRole ? plans[cancelRole] : null;

  return (
    <div className="flex flex-col">
      {isAdvertiser && advertiserSection(plans.advertiser)}
      {isBroadcaster && broadcasterSection(plans.broadcaster)}

      {paidRoles.length > 0 && (
        <>
          <Section title="Payment method" soon description="Charged for every plan on your account. Bookings use the card you pick at checkout.">
            <div className="flex flex-wrap items-center gap-4 rounded-xl border-[0.8px] border-[#e3e5ea] bg-white p-4">
              {card ? (
                <>
                  <span className="grid h-6 w-9 place-items-center rounded bg-[#1a1f71] text-[10px] font-bold italic text-white">{card.brand === "Visa" ? "VISA" : card.brand.slice(0, 4).toUpperCase()}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium leading-5 text-[#1a1d25]">{card.brand} ending in {card.last4}</span>
                    {card.exp && <span className="text-[13px] leading-[18px] text-[#656972]">Expires {card.exp}</span>}
                  </span>
                </>
              ) : (
                <span className="min-w-0 flex-1 text-sm text-[#656972]">No card saved yet</span>
              )}
              <CampaignButton disabled title="Coming soon">Replace card</CampaignButton>
            </div>
          </Section>

          <Section title="Billing email" soon description="Receipts and failed payment alerts for both plans go here.">
            <div className="flex items-center justify-between gap-4 rounded-xl border-[0.8px] border-[#e3e5ea] bg-white px-3 py-3.5">
              <span className="text-sm text-[#1a1d25]">{user.email}</span>
              <button type="button" disabled title="Coming soon" className="text-sm font-medium text-[#3a47c2] disabled:cursor-not-allowed disabled:opacity-50">Edit</button>
            </div>
          </Section>

          <Section title="Invoices" description={isDual ? "Every plan charge on your account, labeled by role." : "Every plan charge on your account."}>
            <div className="overflow-x-auto rounded-xl border-[0.8px] border-[#e3e5ea]">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-[#f8faff] text-[13px] font-medium text-[#656972]">
                  <tr><th className="px-4 py-2.5 font-medium">Date</th><th className="px-4 py-2.5 font-medium">Description</th><th className="px-4 py-2.5 text-right font-medium">Amount</th><th className="px-4 py-2.5 font-medium">Status</th><th className="px-4 py-2.5"><span className="sr-only">Download</span></th></tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={`${inv.date}-${inv.label}`} className="border-t-[0.8px] border-[#e3e5ea] text-[#1a1d25]">
                      <td className="px-4 py-3.5">{formatDate(inv.date)}</td>
                      <td className="px-4 py-3.5">{inv.label}</td>
                      <td className="px-4 py-3.5 text-right">${inv.amount.toFixed(2)}</td>
                      <td className="px-4 py-3.5"><Pill tone="green">Paid</Pill></td>
                      <td className="px-4 py-3.5">
                        <button type="button" disabled title="Coming soon" className="flex items-center gap-1.5 text-[#3a47c2] disabled:cursor-not-allowed disabled:opacity-50">
                          <Download className="size-4" aria-hidden="true" />PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="flex items-center gap-2 text-xs text-[#656972]">PDF downloads <SoonTag /></p>
          </Section>

          {paidRoles.map(r => {
            const p = plans[r];
            const end = formatDate((p.cancelsAt ?? p.renewsAt)!);
            const other = r === "advertiser" ? "broadcaster" : "advertiser";
            return (
              <Section key={`cancel-${r}`} title={isDual ? `Cancel ${r} Premium` : "Cancel Premium"}
                description={p.cancelsAt
                  ? `Cancelled. You keep Premium until ${end}, then ${isDual ? `your ${r} plan` : "your plan"} moves to Free.`
                  : `You keep it until ${end}, then ${isDual ? `your ${r} plan moves to Free. Your ${other} plan doesn't change.` : "your plan moves to Free."}`}>
                <div>
                  <CampaignButton size="md" disabled={!!p.cancelsAt} onClick={() => setCancelRole(r)}
                    className="border-[#d2d4d9] text-[#c92324] hover:text-[#c92324]">
                    {p.cancelsAt ? "Cancellation scheduled" : isDual ? `Cancel ${r} Premium` : "Cancel premium"}
                  </CampaignButton>
                </div>
              </Section>
            );
          })}
        </>
      )}

      {isAdvertiser && (
        <Section title="How booking costs work" description="Every time slot on a screen has a price set by its broadcaster.">
          <p className="rounded-md bg-[#f8faff] px-3 py-2.5 text-[13px] leading-5 text-[#1a1d25]">
            Your booking total is the price of each slot you pick, added up across your dates. The amount is held in your wallet when you send a request and is only paid out once the broadcaster approves your ad.
          </p>
          <p className="text-[13px] leading-[18px] text-[#656972]">Anything that doesn't play comes back to your wallet.</p>
        </Section>
      )}

      {dialogRole && (
        <ChoosePlanDialog role={dialogRole} plan={plans[dialogRole]} open onOpenChange={o => !o && setDialogRole(null)}
          onSwitchToFree={() => setCancelRole(dialogRole)} />
      )}
      {cancelRole && cancelPlan && isPaid(cancelPlan.tier) && (
        <CancelPremiumModal open onOpenChange={o => !o && setCancelRole(null)} role={cancelRole} tier={cancelPlan.tier}
          amount={cancelPlan.amountPaid ?? 0} period={cancelPlan.billing === "annual" ? "year" : "month"} renewsAt={cancelPlan.renewsAt}
          onConfirm={confirmCancel} confirming={cancelling} />
      )}
    </div>
  );
}
