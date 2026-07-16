import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

type SlotEntry = { slotId: string; playbacks: string };

type SpaceSelection = {
  slots: SlotEntry[];
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
      // Auto-check single slot
      if (slots.length === 1) {
        setSelected(prev => {
          if (prev[spaceId] === undefined) return prev;
          const existing = prev[spaceId];
          if (existing.slots.length === 0) {
            return { ...prev, [spaceId]: { ...existing, slots: [{ slotId: String(slots[0].id), playbacks: "" }] } };
          }
          return prev;
        });
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
      return { ...prev, [spaceId]: { slots: [], price: cpm != null ? String(cpm) : "" } };
    });
  };

  const toggleSlot = (spaceId: number, slotId: string) => {
    setSelected(prev => {
      if (!prev[spaceId]) return prev;
      const existing = prev[spaceId];
      const isChecked = existing.slots.some(sl => sl.slotId === slotId);
      const newSlots = isChecked
        ? existing.slots.filter(sl => sl.slotId !== slotId)
        : [...existing.slots, { slotId, playbacks: "" }];
      return { ...prev, [spaceId]: { ...existing, slots: newSlots } };
    });
  };

  const updateSlotPlaybacks = (spaceId: number, slotId: string, value: string) => {
    setSelected(prev => {
      if (!prev[spaceId]) return prev;
      const existing = prev[spaceId];
      const newSlots = existing.slots.map(sl => sl.slotId === slotId ? { ...sl, playbacks: value } : sl);
      return { ...prev, [spaceId]: { ...existing, slots: newSlots } };
    });
  };

  const updatePrice = (spaceId: number, value: string) => {
    setSelected(prev => ({ ...prev, [spaceId]: { ...prev[spaceId], price: value } }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const entries = Object.entries(selected);
    if (entries.length === 0) { toast.error("Select at least one space"); return; }

    const invalid = entries.some(([, s]) =>
      s.slots.length === 0 ||
      s.slots.some(sl => !sl.slotId || !sl.playbacks || Number(sl.playbacks) < 1) ||
      !s.price || isNaN(Number(s.price)) || Number(s.price) <= 0
    );
    if (invalid) {
      toast.error("Select slots, fill daily playbacks, and set a price for each space");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/api/campaigns/${campaignId}/offers`, {
        spaces: entries.map(([id, s]) => ({
          space_id: Number(id),
          proposed_price: Number(s.price),
          slots: s.slots.map(sl => ({
            slot_id: Number(sl.slotId),
            daily_playbacks_allocated: Number(sl.playbacks),
          })),
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
                      {/* Space header */}
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

                      {/* Expanded when selected */}
                      {isSelected && sel && (
                        <div className="mt-3 pt-3 border-t border-[#ffe5cc] space-y-3">
                          {/* Slot checkboxes */}
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground">Time slots</p>
                            {isLoadingSpaceSlots ? (
                              <p className="text-xs text-muted-foreground py-1">Loading…</p>
                            ) : spaceSlots.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-1">No slots found</p>
                            ) : (
                              <div className="space-y-1.5">
                                {spaceSlots.map(slot => {
                                  const slotChecked = sel.slots.some(sl => sl.slotId === String(slot.id));
                                  const slotPb = sel.slots.find(sl => sl.slotId === String(slot.id))?.playbacks ?? "";
                                  return (
                                    <div key={slot.id}
                                      className={`rounded-lg border px-2.5 py-2 transition-colors ${slotChecked ? "border-[#ff8a00] bg-white" : "border-border"}`}>
                                      <div className="flex items-start gap-2">
                                        <Checkbox
                                          id={`slot-${s.id}-${slot.id}`}
                                          checked={slotChecked}
                                          onCheckedChange={() => toggleSlot(s.id, String(slot.id))}
                                          className="mt-0.5 shrink-0 data-[state=checked]:bg-[#ff8a00] data-[state=checked]:border-[#ff8a00]"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <label htmlFor={`slot-${s.id}-${slot.id}`} className="text-xs font-medium cursor-pointer">
                                            {slot.label}
                                            <span className="ml-1.5 font-normal text-muted-foreground">
                                              {fmtTime(slot.start_time)}–{fmtTime(slot.end_time)}
                                            </span>
                                          </label>
                                          {slotChecked && (
                                            <div className="mt-1.5 flex items-center gap-2">
                                              <span className="text-xs text-muted-foreground shrink-0">Daily plays</span>
                                              <Input
                                                type="number" min="1"
                                                max={slot.daily_capacity_playbacks}
                                                value={slotPb}
                                                onChange={e => updateSlotPlaybacks(s.id, String(slot.id), e.target.value)}
                                                placeholder="e.g. 48"
                                                className="h-7 w-24 text-xs rounded-md border-[#d7dce3] shadow-none focus-visible:ring-[#ff8a00]"
                                              />
                                              <span className="text-xs text-muted-foreground">max {slot.daily_capacity_playbacks}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Proposed price */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground shrink-0">Proposed price ($)</span>
                            <Input
                              type="number" min="0" step="0.01"
                              value={sel.price}
                              onChange={e => updatePrice(s.id, e.target.value)}
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
