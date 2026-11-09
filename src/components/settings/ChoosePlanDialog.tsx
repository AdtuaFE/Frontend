import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CampaignButton } from "@/components/campaigns/CampaignBits";
import { PAID_PLANS, type PlanState, type Role } from "@/lib/plans";
import { cn } from "@/lib/utils";

type Option = { key: string; label: string; badge?: string };

function Toggle({ options, value, onChange, label }: { options: Option[]; value: string; onChange: (key: string) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg bg-[#f1f2f7] p-[3px]">
      {options.map(o => {
        const on = o.key === value;
        return (
          <button key={o.key} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.key)}
            className={cn("flex h-[30px] items-center gap-1.5 rounded-md px-3 text-[13px] font-medium leading-[18px]",
              on ? "bg-white text-[#1a1d25] drop-shadow-[0_1px_1px_rgba(26,29,37,0.08)]" : "text-[#4a4d56]")}>
            {o.label}
            {o.badge && <span className="text-xs leading-4 text-[#016d36]">{o.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

function PlanCard({ name, blurb, price, note, cta, listTitle, features, highlighted }: {
  name: string; blurb: string; price: string; note?: string; cta: React.ReactNode; listTitle: string; features: string[]; highlighted?: boolean;
}) {
  return (
    <div className={cn("flex flex-col rounded-xl border-[0.8px] p-6", highlighted ? "border-[#cad6fe] bg-[#f2f5ff]" : "border-[#e3e5ea] bg-white")}>
      <h3 className="text-base font-semibold leading-6 text-[#1a1d25]">{name}</h3>
      <p className="pb-4 pt-1 text-[13px] leading-[18px] text-[#656972]">{blurb}</p>
      <p className="flex items-baseline gap-1">
        <span className="text-[32px] font-semibold leading-10 tracking-[-0.64px] text-[#1a1d25]">{price}</span>
        <span className="text-sm leading-5 text-[#656972]">/ month</span>
      </p>
      <p className="min-h-[22px] pt-1 text-[13px] leading-[18px] text-[#656972]">{note}</p>
      <div className="pt-5">{cta}</div>
      <p className="pb-3 pt-6 text-[13px] font-medium leading-[18px] text-[#4a4d56]">{listTitle}</p>
      <ul className="flex flex-col gap-2.5">
        {features.map(f => (
          <li key={f} className="flex items-start gap-2.5 text-sm leading-5 text-[#1a1d25]">
            <Check className={cn("mt-0.5 size-4 shrink-0", highlighted ? "text-[#3a47c2]" : "text-[#656972]")} aria-hidden="true" />{f}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Free next to Premium for one role. Choosing Premium continues to checkout. */
export function ChoosePlanDialog({ role, plan, open, onOpenChange, onSwitchToFree }: {
  role: Role;
  plan: PlanState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToFree: () => void;
}) {
  const navigate = useNavigate();
  const [billing, setBilling] = useState<"monthly" | "annual">(plan.billing ?? "monthly");
  const [displays, setDisplays] = useState<"solo" | "bundle">(plan.tier === "bundle" ? "bundle" : "solo");
  const onFree = plan.tier === "free";

  const current = <CampaignButton size="md" disabled className="w-full border-transparent bg-[#f1f2f7] text-[#8f929d] disabled:opacity-100">Your current plan</CampaignButton>;
  const freeCta = onFree ? current : (
    <CampaignButton size="md" className="w-full" onClick={() => { onOpenChange(false); onSwitchToFree(); }}>
      {plan.cancelsAt ? "Moving to Free" : "Switch to Free"}
    </CampaignButton>
  );

  let premium: { blurb: string; price: string; note: string; features: string[]; href: string; isCurrent: boolean };
  if (role === "advertiser") {
    const p = PAID_PLANS.premium;
    premium = {
      blurb: "Run campaigns on your own schedule.",
      price: `$${billing === "annual" ? p.priceAnnual : p.priceMonthly}`,
      note: billing === "annual" ? `Billed yearly, $${(p.priceAnnual ?? 0) * 12} a year` : "Billed monthly",
      features: ["100 impressions a month", "Choose your own time slots", "Send requests to any broadcaster"],
      href: `/settings/upgrade/advertiser?billing=${billing}`,
      isCurrent: plan.tier === "premium" && plan.billing === billing,
    };
  } else {
    const p = PAID_PLANS[displays];
    premium = {
      blurb: "Earn more from every screen you list.",
      price: `$${p.priceMonthly}`,
      note: displays === "solo" ? "For 1 display" : "For up to 10 displays",
      features: displays === "solo" ? ["Keep 55% of each booking"] : ["Keep 55% of each booking", "List up to 10 displays"],
      href: `/settings/upgrade/broadcaster?tier=${displays}`,
      isCurrent: plan.tier === displays,
    };
  }

  const premiumCta = premium.isCurrent ? current : (
    <CampaignButton size="md" variant="primary" className="w-full" onClick={() => navigate(premium.href)}>
      {onFree ? "Upgrade to Premium" : role === "broadcaster" ? `Change to ${displays === "solo" ? "1 display" : "10 displays"}` : billing === "annual" ? "Switch to yearly" : "Switch to monthly"}
    </CampaignButton>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] gap-0 rounded-2xl p-8 shadow-[0_16px_48px_rgba(26,29,37,0.2)]">
        <div className="mx-auto flex max-w-[520px] flex-col items-center text-center">
          <DialogTitle className="text-2xl font-semibold leading-8 tracking-[-0.24px] text-[#1a1d25]">Choose your plan</DialogTitle>
          <DialogDescription className="pt-1.5 text-sm leading-5 text-[#656972]">
            {role === "advertiser" ? "Premium gives you more impressions and control over when your ad plays." : "Premium lets you keep more of every booking."}
          </DialogDescription>
        </div>
        <div className="flex justify-center pt-6">
          {role === "advertiser"
            ? <Toggle label="Billing period" value={billing} onChange={k => setBilling(k as "monthly" | "annual")}
                options={[{ key: "monthly", label: "Monthly" }, { key: "annual", label: "Yearly", badge: "Save 10%" }]} />
            : <Toggle label="Number of displays" value={displays} onChange={k => setDisplays(k as "solo" | "bundle")}
                options={[{ key: "solo", label: "1 display" }, { key: "bundle", label: "Up to 10 displays" }]} />}
        </div>
        <div className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
          <PlanCard name="Free"
            blurb={role === "advertiser" ? "Try Adtua with a small monthly allowance." : "List your screens and start earning."}
            price="$0" cta={freeCta} listTitle="What you get"
            features={role === "advertiser"
              ? ["50 impressions a month", "Your ad plays in whichever slot is open", "Book one assigned space"]
              : ["List your spaces and screens", "Accept booking requests", "Keep 40% of each booking"]} />
          <PlanCard name="Premium" highlighted blurb={premium.blurb} price={premium.price} note={premium.note}
            cta={premiumCta} listTitle="Everything in Free, plus" features={premium.features} />
        </div>
        {role === "advertiser" && (
          <p className="pt-5 text-center text-[13px] leading-[18px] text-[#656972]">
            Plans are separate from what you pay to book a screen. Extra impressions cost $0.006 each once you use your allowance.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
