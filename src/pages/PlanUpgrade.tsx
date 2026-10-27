import { useState, type FormEvent } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/dates";
import { PAID_PLANS, chargeFor, nextRenewal, subscribe, type Billing, type PaidTier, type Role } from "@/lib/plans";
import { toast } from "sonner";

const inputCn = "h-10 rounded-lg border-[#d7dce3] bg-white text-sm shadow-none focus-visible:ring-[#3a47c2]";

export default function PlanUpgrade() {
  const { role: roleParam } = useParams<{ role: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [billing, setBilling] = useState<Billing>(searchParams.get("billing") === "annual" ? "annual" : "monthly");
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;
  if (roleParam !== "advertiser" && roleParam !== "broadcaster") return <Navigate to="/settings?tab=plans" replace />;
  const role: Role = roleParam;
  if (!user.roles.includes(role)) return <Navigate to="/settings?tab=plans" replace />;

  const tier: PaidTier = role === "advertiser" ? "premium" : searchParams.get("tier") === "bundle" ? "bundle" : "solo";
  const plan = PAID_PLANS[tier];
  const hasAnnual = plan.priceAnnual != null;
  const effectiveBilling: Billing = hasAnnual ? billing : "monthly";
  const dueToday = chargeFor(tier, effectiveBilling);
  const period = effectiveBilling === "annual" ? "year" : "month";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await subscribe(user.id, role, tier, effectiveBilling);
      navigate(`/settings/upgrade/${role}/confirmation`);
    } catch {
      toast.error("Couldn't complete the upgrade — try again");
      setSubmitting(false);
    }
  };

  return (
    <AppLayout activeNav="settings">
      <div className="max-w-4xl mx-auto py-4 space-y-8">
        <button
          onClick={() => navigate("/settings?tab=plans")}
          className="flex items-center gap-2 bg-[#f9f9f9] rounded-xl pl-3 pr-4 py-2 text-sm font-medium text-[#4a5565] hover:bg-[#f1f1f1] transition-colors">
          <ArrowLeft className="h-5 w-5" /> Back
        </button>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-14 items-start">
          <div className="space-y-8">
            <div className="space-y-3">
              <p className="text-base font-semibold text-[#4a5565]">Choose your plan</p>
              <RadioGroup value={effectiveBilling} onValueChange={v => setBilling(v as Billing)} className="gap-2">
                <label className={`flex items-start gap-2 p-4 rounded-lg border cursor-pointer ${effectiveBilling === "monthly" ? "bg-[rgba(58,71,194,0.05)] border-[#3a47c2]" : "border-[#e8e8e8]"}`}>
                  <RadioGroupItem value="monthly" className="mt-0.5" />
                  <span>
                    <span className={`block text-sm font-semibold ${effectiveBilling === "monthly" ? "text-[#3a47c2]" : "text-[#4a5565]"}`}>Pay monthly</span>
                    <span className="block text-sm text-[#4a5565]">${plan.priceMonthly}/month</span>
                  </span>
                </label>
                {hasAnnual && (
                  <label className={`flex items-start gap-2 p-4 rounded-lg border cursor-pointer ${effectiveBilling === "annual" ? "bg-[rgba(58,71,194,0.05)] border-[#3a47c2]" : "border-[#e8e8e8]"}`}>
                    <RadioGroupItem value="annual" className="mt-0.5" />
                    <span className="flex-1 flex items-center justify-between gap-2">
                      <span>
                        <span className={`block text-sm font-semibold ${effectiveBilling === "annual" ? "text-[#3a47c2]" : "text-[#4a5565]"}`}>Pay annually</span>
                        <span className="block text-sm text-[#4a5565]">${plan.priceAnnual! * 12}/year at ${plan.priceAnnual}/month</span>
                      </span>
                      <span className="bg-[rgba(58,71,194,0.1)] text-[#3a47c2] text-xs font-semibold px-2 py-1.5 rounded shrink-0">Save 10%</span>
                    </span>
                  </label>
                )}
              </RadioGroup>
            </div>

            <div className="border border-[#e8e8e8] rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <p className="text-base font-semibold text-[#4a5565]">Order summary</p>
                <p className="text-xs text-[#767676]">{plan.label} plan · billed {effectiveBilling === "annual" ? "annually" : "monthly"}</p>
              </div>
              <div className="text-xs">
                <div className="flex justify-between py-4 border-b border-[#e8e8e8]">
                  <span className="text-[#767676]">{effectiveBilling === "annual" ? "Annual" : "Monthly"} {plan.label.toLowerCase()} subscription</span>
                  <span className="font-semibold text-[#4a5565]">${dueToday.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-4 border-b border-[#e8e8e8]">
                  <span className="text-[#767676]">Renews</span>
                  <span className="font-semibold text-[#4a5565]">{formatDate(nextRenewal(new Date(), effectiveBilling))}</span>
                </div>
                <div className="flex justify-between py-4 font-semibold text-[#4a5565]">
                  <span className="text-sm">Due today</span>
                  <span className="text-base">${dueToday.toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-1">
                {plan.features.map(f => (
                  <div key={f} className="flex items-center gap-[9px] py-2">
                    <div className="size-5 rounded-[10px] bg-[#3a47c2] flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <p className="text-xs text-[#4a5565]">{f}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Visual only — these fields get replaced by Stripe Elements once billing is wired up. Nothing entered here is sent anywhere. */}
          <div className="border border-[#e8e8e8] rounded-2xl p-6 shadow-sm space-y-4">
            <p className="text-base font-semibold text-[#4a5565]">Pay with</p>
            <div className="flex gap-4">
              <div className="flex-1 px-4 py-2 rounded-md border border-[#3a47c2] bg-[rgba(58,71,194,0.05)] text-[#3a47c2] text-xs font-medium">Card</div>
              <div className="flex-1 px-4 py-2 rounded-md border-[1.5px] border-[#e8e8e8] text-[#767676] text-xs font-medium opacity-60">Bank</div>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1.5">
                <Label htmlFor="pay-name">Name</Label>
                <Input id="pay-name" defaultValue={`${user.first_name} ${user.last_name}`.trim()} className={inputCn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-business">Business name (optional)</Label>
                <Input id="pay-business" placeholder="Acme Inc" className={inputCn} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-card">Card number</Label>
              <Input id="pay-card" placeholder="4242 4242 4242 4242" autoComplete="off" className={inputCn} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pay-exp">Expiry</Label>
                <Input id="pay-exp" placeholder="08 / 29" autoComplete="off" className={inputCn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-cvc">CVC</Label>
                <Input id="pay-cvc" placeholder="•••" autoComplete="off" className={inputCn} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-country">Country</Label>
              {/* US-only platform per the API contract, so there's one option. */}
              <Select defaultValue="US">
                <SelectTrigger id="pay-country" className={inputCn}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-zip">ZIP</Label>
              <Input id="pay-zip" placeholder="47401" className={inputCn} />
            </div>
            <div className="flex items-start gap-2 py-2">
              <Checkbox id="pay-save-card" className="mt-0.5 data-[state=checked]:bg-[#3a47c2] data-[state=checked]:border-[#3a47c2]" />
              <Label htmlFor="pay-save-card" className="text-sm font-normal text-[#767676] leading-5 cursor-pointer">
                Also save this card for campaign bookings
              </Label>
            </div>

            <Button type="submit" disabled={submitting} className="w-full bg-[#3a47c2] hover:bg-[#2f3a9e] text-white py-5">
              {submitting ? "Processing…" : `Upgrade to ${plan.label}`}
            </Button>
            <p className="text-[10px] text-[#8a93a1] leading-[17px]">
              By upgrading, you authorize Adtua to charge this card ${dueToday.toFixed(2)} every {period} until you cancel. Cancel anytime from Billing.
            </p>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
