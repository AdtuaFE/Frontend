import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Slot = {
  id: number;
  label: string;
  start_time: string;
  end_time: string;
  est_impressions_per_playback: number;
  daily_capacity_playbacks: number;
  price_multiplier: number;
};

type MySpace = {
  id: number;
  name: string;
  space_type: string;
  city: string | null;
  cpm: number | null;
  is_active: boolean;
};

type SpaceSelection = {
  slotId: string;
  playbacks: string;
  price: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: number;
  campaignBudget?: number | null;
  onSuccess?: () => void;
};

const fmtTime = (t: string) => t.slice(0, 5);

export function SubmitOfferModal({ open, onOpenChange, campaignId, campaignBudget, onSuccess }: Props) {
  const [selected, setSelected] = useState<Record<number, SpaceSelection>>({});
  const [slotsMap, setSlotsMap] = useState<Record<number, Slot[]>>({});
  const [loadingSlots, setLoadingSlots] = useState<Record<number, boolean>>({});
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: spaces = [] } = useQuery<MySpace[]>({
    queryKey: ["spaces-mine"],
    queryFn: () => api.get<MySpace[]>("/api/spaces/mine"),
    enabled: open,
  });

  const activeSpaces = spaces.filter(s => s.is_active);

  const totalProposed = Object.values(selected).reduce((sum, v) => sum + (Number(v.price) || 0), 0);
  const selectedCount = Object.keys(selected).length;
  const overBudget = campaignBudget != null && totalProposed > campaignBudget;

  const fetchSlots = async (spaceId: number) => {
    if (slotsMap[spaceId] !== undefined || loadingSlots[spaceId]) return;
    setLoadingSlots(prev => ({ ...prev, [spaceId]: true }));
    try {
      const slots = await api.get<Slot[]>(`/api/spaces/${spaceId}/slots`);
      setSlotsMap(prev => ({ ...prev, [spaceId]: slots }));
      // Auto-select if single slot
      if (slots.length === 1) {
        setSelected(prev => prev[spaceId] !== undefined
          ? { ...prev, [spaceId]: { ...prev[spaceId], slotId: String(slots[0].id) } }
          : prev
        );
      }
    } catch {
      setSlotsMap(prev => ({ ...prev, [spaceId]: [] }));
    } finally {
      setLoadingSlots(prev => ({ ...prev, [spaceId]: false }));
    }
  };

  const handleToggle = (spaceId: number, cpm: number | null) => {
    setSelected(prev => {
      if (prev[spaceId] !== undefined) {
        const { [spaceId]: _, ...rest } = prev;
        return rest;
      }
      fetchSlots(spaceId);
      return { ...prev, [spaceId]: { slotId: "", playbacks: "", price: cpm != null ? String(cpm) : "" } };
    });
  };

  const updateField = (spaceId: number, field: keyof SpaceSelection, value: string) => {
    setSelected(prev => ({ ...prev, [spaceId]: { ...prev[spaceId], [field]: value } }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const entries = Object.entries(selected);
    if (entries.length === 0) { toast.error("Select at least one space"); return; }

    const invalid = entries.some(([, s]) =>
      !s.slotId || !s.playbacks || Number(s.playbacks) < 1 ||
      !s.price || isNaN(Number(s.price)) || Number(s.price) <= 0
    );
    if (invalid) {
      toast.error("Fill in slot, daily playbacks, and price for each selected space");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/api/campaigns/${campaignId}/offers`, {
        spaces: entries.map(([id, s]) => ({
          space_id: Number(id),
          slot_id: Number(s.slotId),
          daily_playbacks_allocated: Number(s.playbacks),
          proposed_price: Number(s.price),
        })),
        message: message.trim() || undefined,
      });
      toast.success("Offer submitted");
      handleClose();
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelected({});
    setMessage("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={open => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit an offer</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          {campaignBudget != null && (
            <div className="rounded-lg bg-[#fff3e0] px-4 py-3 text-sm text-[#9a4f00]">
              Campaign budget: <strong>${campaignBudget.toLocaleString()}</strong>
            </div>
          )}

          <div className="space-y-2">
            <Label>Select your spaces</Label>
            {activeSpaces.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                You have no active spaces. Add and activate a space first.
              </p>
            ) : (
              <div className="space-y-2">
                {activeSpaces.map(s => {
                  const isSelected = selected[s.id] !== undefined;
                  const sel = selected[s.id];
                  const spaceSlots = slotsMap[s.id] ?? [];
                  const isLoadingSpaceSlots = loadingSlots[s.id] ?? false;

                  return (
                    <div key={s.id}
                      className={`rounded-lg border p-3 transition-colors ${
                        isSelected ? "border-[#ff8a00] bg-[#fff8f0]" : "border-border"
                      }`}>
                      {/* Space header row */}
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`os-${s.id}`}
                          checked={isSelected}
                          onCheckedChange={() => handleToggle(s.id, s.cpm)}
                          className="data-[state=checked]:bg-[#ff8a00] data-[state=checked]:border-[#ff8a00] shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <label htmlFor={`os-${s.id}`}
                            className="text-sm font-medium cursor-pointer block truncate">
                            {s.name}
                          </label>
                          <p className="text-xs text-muted-foreground capitalize">
                            {s.space_type.replace(/_/g, " ")}
                            {s.city ? ` · ${s.city}` : ""}
                            {s.cpm != null ? ` · $${s.cpm} CPM` : ""}
                          </p>
                        </div>
                      </div>

                      {/* Expanded form when selected */}
                      {isSelected && sel && (
                        <div className="mt-3 pt-3 border-t border-[#ffe5cc] space-y-3">
                          {/* Slot + playbacks */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Time slot</Label>
                              {isLoadingSpaceSlots ? (
                                <p className="text-xs text-muted-foreground py-1">Loading…</p>
                              ) : (
                                <Select value={sel.slotId} onValueChange={v => updateField(s.id, "slotId", v)}>
                                  <SelectTrigger className="h-9 text-xs rounded-lg border-[#d7dce3] focus:ring-[#ff8a00]">
                                    <SelectValue placeholder="Pick a slot" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {spaceSlots.length === 0 ? (
                                      <div className="px-2 py-3 text-xs text-muted-foreground">No slots found</div>
                                    ) : spaceSlots.map(slot => (
                                      <SelectItem key={slot.id} value={String(slot.id)} className="text-xs">
                                        {slot.label} · {fmtTime(slot.start_time)}–{fmtTime(slot.end_time)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">
                                Daily playbacks
                                {sel.slotId && spaceSlots.find(sl => String(sl.id) === sel.slotId) && (
                                  <span className="ml-1 font-normal text-muted-foreground">
                                    (max {spaceSlots.find(sl => String(sl.id) === sel.slotId)!.daily_capacity_playbacks})
                                  </span>
                                )}
                              </Label>
                              <Input
                                type="number" min="1"
                                value={sel.playbacks}
                                onChange={e => updateField(s.id, "playbacks", e.target.value)}
                                placeholder="e.g. 48"
                                className="h-9 text-sm rounded-lg border-[#d7dce3] shadow-none focus-visible:ring-[#ff8a00]"
                              />
                            </div>
                          </div>

                          {/* Proposed price */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground shrink-0">Proposed price ($)</span>
                            <Input
                              type="number" min="0" step="0.01"
                              value={sel.price}
                              onChange={e => updateField(s.id, "price", e.target.value)}
                              placeholder="Price"
                              className="h-8 w-32 text-sm rounded-md border-[#d7dce3] shadow-none focus-visible:ring-[#ff8a00]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedCount > 0 && (
            <div className="flex items-center justify-between text-sm border-t pt-3">
              <span className="text-muted-foreground">
                {selectedCount} space{selectedCount > 1 ? "s" : ""} · Total proposed
              </span>
              <span className={overBudget ? "text-red-600 font-medium" : "font-medium"}>
                ${totalProposed.toLocaleString()}
                {overBudget && <span className="ml-1.5 text-xs">exceeds budget</span>}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="offer-msg">Message (optional)</Label>
            <Textarea
              id="offer-msg"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Tell the advertiser why your space is a great fit…"
              className="min-h-[80px] rounded-lg border-[#d7dce3] px-3 py-2 text-sm focus-visible:ring-[#ff8a00]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={isSubmitting || selectedCount === 0}
              className="bg-[#ff8a00] text-white hover:bg-[#e77700]">
              {isSubmitting ? "Submitting…" : "Submit offer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
