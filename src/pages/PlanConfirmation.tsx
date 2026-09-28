import { Navigate, useNavigate, useParams } from "react-router-dom";
import { PartyPopper } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { PAID_PLANS, formatDate, getPlanState, isPaid, type Role } from "@/lib/plans";

export default function PlanConfirmation() {
  const { role: roleParam } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) return null;
  if (roleParam !== "advertiser" && roleParam !== "broadcaster") return <Navigate to="/settings?tab=plans" replace />;
  const role: Role = roleParam;
  const state = getPlanState(user.id, role);
  if (!isPaid(state.tier) || state.amountPaid == null || !state.renewsAt) return <Navigate to="/settings?tab=plans" replace />;

  const plan = PAID_PLANS[state.tier];
  const displays = plan.displays;
  const charged = `Your card was charged $${state.amountPaid.toFixed(2)} today${
    role === "broadcaster" && displays ? ` for ${displays} display${displays > 1 ? "s" : ""}` : ""
  }.`;

  // Pills mirror the Figma confirmation frames for each role.
  const pills = role === "advertiser"
    ? ["100 impressions / month", "Time slot control", "Broadcaster requests unlocked"]
    : ["55% revenue split", "Direct offer requests", "Time slot control"];

  return (
    <AppLayout activeNav="settings">
      <div className="max-w-lg mx-auto py-16 flex flex-col items-center gap-4 text-center">
        <div className="size-14 rounded-xl bg-[rgba(255,127,17,0.1)] flex items-center justify-center">
          <PartyPopper className="h-6 w-6 text-[#ff7f11]" />
        </div>
        <p className="text-xl font-semibold text-[#4a5565]">You're on Premium!</p>
        <p className="text-sm text-[#767676] leading-relaxed">
          {charged} A receipt is on its way to your email, and your plan renews {state.billing === "annual" ? "yearly" : "monthly"} — next
          on {formatDate(state.renewsAt)} — until you cancel.
        </p>
        <div className="flex gap-3 flex-wrap justify-center pt-2">
          {pills.map(p => (
            <span key={p} className="bg-[rgba(255,127,17,0.1)] text-[#ff7f11] text-xs font-semibold px-3 py-1.5 rounded-full">{p}</span>
          ))}
        </div>
        <Button onClick={() => navigate("/settings?tab=plans")} className="w-full max-w-sm mt-6 bg-[#ff7f11] hover:bg-[#e77700] text-white py-3">
          Go to Plans and Billing
        </Button>
      </div>
    </AppLayout>
  );
}
