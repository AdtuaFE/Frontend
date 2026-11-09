import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { fmtMoney } from "@/components/campaigns/campaignData";

/**
 * Shown when a booking costs more than the wallet holds. Top-ups are simulated for now (no card
 * is charged), but the backend asks for them to be treated as real money in the UI.
 */
export function WalletShortfall({ needed, available }: { needed: number | null; available: number | null }) {
  const queryClient = useQueryClient();
  const short = needed != null && available != null ? Math.max(0, needed - available) : null;
  const [amount, setAmount] = useState(short ? String(Math.ceil(short)) : "");
  const [adding, setAdding] = useState(false);

  const add = async () => {
    const value = Number(amount);
    if (!(value > 0)) { toast.error("Enter how much to add"); return; }
    setAdding(true);
    try {
      await api.post("/api/wallet/topup", { amount: value });
      await queryClient.invalidateQueries({ queryKey: ["wallet"] });
      toast.success(`Added ${fmtMoney(value)} to your wallet`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add money to your wallet");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div role="alert" className="space-y-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm">
      <div className="flex gap-2">
        <Wallet className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden="true" />
        <div>
          <p className="font-medium text-red-700">Not enough money in your wallet</p>
          <p className="text-red-700/80">
            {needed != null && available != null
              ? `This booking costs ${fmtMoney(needed)} and your wallet has ${fmtMoney(available)}. The money is held when you send the request and only paid once the broadcaster approves.`
              : "Add money to your wallet, then send the request again."}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 pl-6">
        <span className="text-muted-foreground">$</span>
        <Input aria-label="Amount to add" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)}
          className="h-8 w-28 rounded-md border-[#d7dce3] bg-white text-sm shadow-none focus-visible:ring-[#3a47c2]" />
        <Button type="button" size="sm" disabled={adding} onClick={add} className="bg-[#3a47c2] text-white hover:bg-[#2f3a9e]">
          {adding ? "Adding…" : "Add to wallet"}
        </Button>
      </div>
    </div>
  );
}
