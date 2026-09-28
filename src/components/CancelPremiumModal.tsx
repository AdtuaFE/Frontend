import { Send, Clock, CirclePercent, MonitorPlay } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDate, type Role, type Tier } from "@/lib/plans";

type LossItem = { icon: typeof Send; title: string; description: string };

function lossItems(role: Role, tier: Tier): LossItem[] {
  if (role === "advertiser") {
    return [
      {
        icon: Send,
        title: "Broadcaster requests",
        description: "Send a request to any broadcaster you want. On Free, you can only take the open slots a broadcaster happens to offer.",
      },
      {
        icon: Clock,
        title: "Impressions and timing",
        description: "100 impressions a month and your pick of time slot. Free drops you to 50 impressions.",
      },
    ];
  }
  return [
    {
      icon: CirclePercent,
      title: "Revenue split",
      description: "Keep 55% of what advertisers pay for your displays. Free drops you to 40%.",
    },
    {
      icon: MonitorPlay,
      title: "Additional displays",
      description: tier === "bundle"
        ? "List more than your 10 displays. Free caps you at a single display."
        : "List more than your one free display. Free caps you at a single display.",
    },
  ];
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role;
  tier: Tier;
  amount: number;
  period: "month" | "year";
  renewsAt: string | null;
  onConfirm: () => void;
  confirming?: boolean;
};

export function CancelPremiumModal({ open, onOpenChange, role, tier, amount, period, renewsAt, onConfirm, confirming }: Props) {
  const renewsLabel = renewsAt ? formatDate(renewsAt) : "the end of your billing period";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Premium?</DialogTitle>
          <DialogDescription>
            Cancel to stop your ${amount}/{period} billing. You'll keep Premium until {renewsLabel}, then move to Free.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs font-medium text-[#4a5565]">You'll lose access to</p>
          <div className="space-y-6">
            {lossItems(role, tier).map(item => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-4">
                  <div className="shrink-0 size-10 rounded-[10px] bg-[rgba(255,127,17,0.1)] flex items-center justify-center">
                    <Icon className="h-5 w-5 text-[#ff7f11]" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[#4a5565]">{item.title}</p>
                    <p className="text-xs text-[#767676]">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={confirming}
            className="bg-[#d03b3b] text-white hover:bg-[#b73333]">
            {confirming ? "Cancelling…" : "Cancel Premium"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
