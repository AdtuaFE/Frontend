import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, Lock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { CancelPremiumModal } from "@/components/CancelPremiumModal";
import { useAuth } from "@/context/AuthContext";
import {
  ADVERTISER_FREE_IMPRESSIONS, ADVERTISER_PREMIUM_IMPRESSIONS, PAID_PLANS,
  cancelSubscription, formatDate, getInvoices, getPlanState, isPaid,
  type PaidTier, type PlanState, type Role,
} from "@/lib/plans";
import { toast } from "sonner";

// Usage numbers are placeholders — the backend has no usage-tracking endpoints yet.
const PLACEHOLDER_USAGE = {
  impressionsUsed: 38,
  displaysUsed: 1,
  activeBookings: 3,
  requestsSent: 5,
  requestsReceived: 5,
  earnings: 198,
};

const BRAND_GRADIENT = "linear-gradient(158deg, #ff7f11 8.5%, #f0740a 45.8%, #ff7f11 91.5%)";

function FeatureRow({ text, onDark }: { text: string; onDark?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <div className={`size-5 rounded-[10px] flex items-center justify-center shrink-0 ${onDark ? "bg-white" : "bg-[#f1f1f1]"}`}>
        <Check className={`h-3 w-3 ${onDark ? "text-[#ff7f11]" : "text-[#9c9c9c]"}`} />
      </div>
      <p className={`text-xs ${onDark ? "font-bold text-white" : "text-[#4a5565]"}`}>{text}</p>
    </div>
  );
}

function PlanCard({ label, price, unit, features, cta, onCta, highlighted, disabled }: {
  label: string; price: number; unit: string; features: string[];
  cta: string; onCta?: () => void; highlighted?: boolean; disabled?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-6 flex flex-col gap-12 ${highlighted ? "text-white" : "border border-[#e8e8e8]"}`}
      style={highlighted ? { backgroundImage: BRAND_GRADIENT } : undefined}>
      <div>
        <p className={`text-xs font-semibold ${highlighted ? "" : "text-[#767676]"}`}>{label}</p>
        <p className={`text-2xl font-bold ${highlighted ? "" : "text-[#4a5565]"}`}>
          ${price}<span className={`text-xs font-medium ${highlighted ? "" : "text-[#9c9c9c]"}`}> / {unit}</span>
        </p>
      </div>
      <div className="space-y-4 flex-1">
        {features.map(f => <FeatureRow key={f} text={f} onDark={highlighted} />)}
      </div>
      <Button
        onClick={onCta}
        disabled={disabled}
        variant={highlighted ? "default" : "outline"}
        className={`w-full ${highlighted ? "bg-white text-[#ff7f11] hover:bg-[#fff4ea]" : ""}`}>
        {cta}
      </Button>
    </div>
  );
}

function PricingNote({ role }: { role: Role }) {
  return (
    <Collapsible className="w-full group">
      <CollapsibleTrigger className="w-full flex items-center gap-2 text-left">
        <p className="flex-1 text-base font-semibold text-[#4a5565]">How pricing is calculated</p>
        <ChevronDown className="h-6 w-6 text-[#4a5565] transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-5">
        <div className="border border-[#e8e8e8] rounded-2xl p-6 space-y-4">
          {role === "advertiser" && (
            <>
              <p className="text-sm text-[#767676]">Space cost is calculated as</p>
              <code className="inline-block bg-[rgba(255,127,17,0.1)] text-[#4a5565] text-[12.5px] px-2 py-1 rounded">
                (CPM ÷ 1000) × estimated daily impressions × campaign days
              </code>
              <p className="text-sm text-[#767676] leading-relaxed">
                This is paid on top of your subscription. Premium unlocks more impressions and control over timing and
                placement, but you still pay the space's own rate when you book it.
              </p>
            </>
          )}
          <p className="text-sm text-[#767676] leading-relaxed">
            Impressions aren't a hard cap. Once you use your monthly allotment (50 free / 100 premium), extra
            impressions are billed at <span className="font-semibold text-[#4a5565]">$0.006</span> each until the
            month resets.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#767676]">{label}</p>
        <p className="text-[13.5px] text-[#9c9c9c]">{used} / {limit}</p>
      </div>
      <Progress value={Math.min(100, (used / limit) * 100)} className="h-2 bg-[rgba(255,127,17,0.1)] [&>div]:bg-[#ff7f11]" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 space-y-2">
      <p className="text-sm font-medium text-[#767676]">{label}</p>
      <p className="text-2xl font-bold text-[#4a5565]">{value}</p>
    </div>
  );
}

function Tag({ children, solid }: { children: ReactNode; solid?: boolean }) {
  return (
    <span className={`text-xs px-3 py-1 rounded ${solid ? "bg-[#ff7f11] text-white font-semibold" : "bg-[rgba(255,127,17,0.1)] text-[#767676] font-medium"}`}>
      {children}
    </span>
  );
}

function FreeView({ role }: { role: Role }) {
  const navigate = useNavigate();
  const upgrade = (tier: PaidTier) =>
    navigate(`/settings/upgrade/${role}${role === "broadcaster" ? `?tier=${tier}` : ""}`);

  return (
    <div className="space-y-16">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold text-[#4a5565]">Your current plan</p>
          <span className="bg-[#f1f1f1] text-[#767676] text-xs font-semibold px-3 py-1 rounded">Free</span>
        </div>
        <div className="space-y-4">
          {role === "advertiser"
            ? <UsageBar label="Impressions this month" used={PLACEHOLDER_USAGE.impressionsUsed} limit={ADVERTISER_FREE_IMPRESSIONS} />
            : <UsageBar label="Displays" used={PLACEHOLDER_USAGE.displaysUsed} limit={1} />}
          {role === "advertiser" && (
            <div className="flex items-center justify-between bg-[#f9f9f9] rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-[#4a5565]" />
                <p className="text-xs font-medium text-[#4a5565]">Broadcaster offer requests</p>
              </div>
              <span className="bg-[rgba(255,127,17,0.1)] text-[#ff7f11] text-xs font-semibold px-2 py-1.5 rounded">Premium only</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-base font-semibold text-[#4a5565]">What Premium changes</p>
          <p className="text-[13px] text-[#9c9c9c]">
            {role === "advertiser"
              ? "More reach, more control, for less than one billboard day."
              : "List more, earn more, keep more of every booking."}
          </p>
        </div>
        {role === "advertiser" ? (
          <div className="grid grid-cols-2 gap-8">
            <PlanCard
              label="Free" price={0} unit="month" cta="Current Plan" disabled
              features={["50 impressions / month", "Ads play in whatever slot is open", "One assigned space only"]}
            />
            <PlanCard
              label={PAID_PLANS.premium.label} price={PAID_PLANS.premium.priceMonthly} unit="month"
              features={PAID_PLANS.premium.features} cta="Upgrade Now" onCta={() => upgrade("premium")} highlighted
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            <PlanCard
              label={PAID_PLANS.solo.label} price={PAID_PLANS.solo.priceMonthly} unit="display"
              features={PAID_PLANS.solo.features} cta="Upgrade Now" onCta={() => upgrade("solo")}
            />
            <PlanCard
              label={PAID_PLANS.bundle.label} price={PAID_PLANS.bundle.priceMonthly} unit="month"
              features={PAID_PLANS.bundle.features} cta="Upgrade Now" onCta={() => upgrade("bundle")} highlighted
            />
          </div>
        )}
      </div>

      <PricingNote role={role} />
    </div>
  );
}

function PaidView({ role, plan, onCancelled }: { role: Role; plan: PlanState & { tier: PaidTier }; onCancelled: (s: PlanState) => void }) {
  const { user } = useAuth();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const details = PAID_PLANS[plan.tier];
  const endDate = plan.cancelsAt ?? plan.renewsAt;

  const handleCancel = async () => {
    setCancelling(true);
    try {
      onCancelled(await cancelSubscription(user!.id, role));
      setCancelOpen(false);
      toast.success(`Premium stays active until ${formatDate(plan.renewsAt!)}`);
    } catch {
      toast.error("Couldn't cancel — try again");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-16">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-base font-semibold text-[#4a5565]">Your current plan</p>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Tag solid>{role === "advertiser" ? "Premium" : details.label}</Tag>
            <Tag>${plan.amountPaid}/{plan.billing === "annual" ? "year" : "month"}</Tag>
            {role === "broadcaster" && <Tag>55% revenue split</Tag>}
            {endDate && <Tag>{plan.cancelsAt ? "Ends" : "Renews"}: {formatDate(endDate)}</Tag>}
          </div>
        </div>
        <div className="border border-[#e8e8e8] rounded-2xl p-6 space-y-10">
          {role === "advertiser"
            ? <UsageBar label="Impressions this month" used={PLACEHOLDER_USAGE.impressionsUsed} limit={ADVERTISER_PREMIUM_IMPRESSIONS} />
            : <UsageBar label="Displays" used={PLACEHOLDER_USAGE.displaysUsed} limit={details.displays ?? 1} />}
          <div className="flex gap-10">
            {role === "advertiser" && plan.renewsAt && <Stat label="Impressions reset date" value={formatDate(plan.renewsAt)} />}
            <Stat label="Active bookings" value={String(PLACEHOLDER_USAGE.activeBookings)} />
            {role === "advertiser"
              ? <Stat label="Broadcaster requests sent" value={String(PLACEHOLDER_USAGE.requestsSent)} />
              : <Stat label="Offer requests received" value={String(PLACEHOLDER_USAGE.requestsReceived)} />}
            {role === "broadcaster" && <Stat label="Earnings this month" value={`$${PLACEHOLDER_USAGE.earnings}`} />}
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-base font-semibold text-[#4a5565]">Payment method</p>
          <p className="text-[13px] text-[#9c9c9c]">Used for your Premium subscription</p>
        </div>
        {/* Placeholder — no card is actually stored until Stripe is wired up. */}
        <div className="border-[0.8px] border-[#e8e8e8] rounded-2xl p-4 flex items-center gap-4">
          <CreditCard className="h-5 w-5 text-[#4a5565] shrink-0" />
          <p className="flex-1 text-sm font-semibold text-[#4a5565]">
            Visa ending in 4242 <span className="font-normal text-xs text-[#9c9c9c]">Exp 08/29</span>
          </p>
          <span className="bg-[#e4f5ec] text-[#1d9a5d] text-[10px] font-semibold uppercase px-2 py-1 rounded">Primary</span>
          <Button variant="outline" size="sm" disabled>Update</Button>
        </div>
      </div>

      <div className="space-y-5">
        <p className="text-base font-semibold text-[#4a5565]">Invoice history</p>
        <div className="border border-[#e8e8e8] rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#e8e8e8]">
                <th className="text-[11px] font-semibold text-[#767676] uppercase px-6 py-3">Date</th>
                <th className="text-[11px] font-semibold text-[#767676] uppercase px-6 py-3">Amount</th>
                <th className="text-[11px] font-semibold text-[#767676] uppercase px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {getInvoices(plan).map(inv => (
                <tr key={inv.date} className="border-b border-[#e8e8e8] last:border-0">
                  <td className="text-[13.5px] text-[#4a5565] px-6 py-3">{formatDate(inv.date)}</td>
                  <td className="text-[13.5px] text-[#4a5565] px-6 py-3">${inv.amount.toFixed(2)}</td>
                  <td className="px-6 py-3">
                    <span className="bg-[#e4f5ec] text-[#1d9a5d] text-[10px] font-semibold uppercase px-2 py-1 rounded">Paid</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-base font-semibold text-[#4a5565]">Billing email</p>
          <p className="text-[13px] text-[#9c9c9c]">Receipts and payment failure alerts go here</p>
        </div>
        <div className="border-[0.8px] border-[#e8e8e8] rounded-2xl p-4 flex items-center gap-4">
          <p className="flex-1 text-[13.5px] text-[#5b6472]">{user!.email}</p>
          <Button variant="outline" size="sm" disabled>Update</Button>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex-1">
          <p className="text-base font-semibold text-[#4a5565]">Cancel your Premium plan</p>
          {endDate && (
            <p className="text-[13px] text-[#9c9c9c]">
              {plan.cancelsAt
                ? `Cancelled. You'll keep Premium access through ${formatDate(endDate)}, then drop to Free.`
                : `You'll keep Premium access through ${formatDate(endDate)}, then drop to Free.`}
            </p>
          )}
        </div>
        <Button
          onClick={() => setCancelOpen(true)}
          disabled={!!plan.cancelsAt}
          className="bg-[#d03b3b] text-white hover:bg-[#b73333]">
          {plan.cancelsAt ? "Cancellation scheduled" : "Cancel Premium"}
        </Button>
      </div>

      <CancelPremiumModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        role={role}
        tier={plan.tier}
        amount={plan.amountPaid ?? details.priceMonthly}
        period={plan.billing === "annual" ? "year" : "month"}
        renewsAt={plan.renewsAt}
        onConfirm={handleCancel}
        confirming={cancelling}
      />
    </div>
  );
}

export function PlansBilling({ role }: { role: Role }) {
  const { user } = useAuth();
  const [plan, setPlan] = useState(() => getPlanState(user!.id, role));

  return isPaid(plan.tier)
    ? <PaidView role={role} plan={plan as PlanState & { tier: PaidTier }} onCancelled={setPlan} />
    : <FreeView role={role} />;
}
