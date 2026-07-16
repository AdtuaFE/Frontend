import { FormEvent, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

export type SpaceInfo = {
  id: number;
  name: string;
  cpm: number;
  est_daily_impressions: number | null;
};

type Campaign = { id: number; name: string; status: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  space: SpaceInfo | null;
};

const inputCn = "h-10 rounded-lg border-[#d7dce3] bg-white text-sm shadow-none focus-visible:ring-[#ff8a00]";
const inputErrCn = "h-10 rounded-lg border-red-400 bg-white text-sm shadow-none focus-visible:ring-red-400";
const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="mt-1 text-xs text-red-500">{msg}</p> : null;

const fmtTime = (t: string) => t.slice(0, 5);

export function CreateBookingModal({ open, onOpenChange, space }: Props) {
  const queryClient = useQueryClient();
  const [campaignId, setCampaignId] = useState("");
  const [selectedSlots, setSelectedSlots] = useState<Record<number, string>>({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: () => api.get<Campaign[]>("/api/campaigns"),
    enabled: open,
  });

  const { data: slots = [], isLoading: slotsLoading } = useQuery<Slot[]>({
    queryKey: ["space-slots", space?.id],
    queryFn: () => api.get<Slot[]>(`/api/spaces/${space!.id}/slots`),
    enabled: open && !!space?.id,
  });

  const bookableCampaigns = campaigns.filter(c => c.status !== "archived");

  useEffect(() => {
    if (!open) {
      setCampaignId(""); setSelectedSlots({});
      setStartDate(""); setEndDate(""); setErrors({});
    }
  }, [open]);

  // Auto-check when there's only one slot
  useEffect(() => {
    if (slots.length === 1) {
      setSelectedSlots(prev => Object.keys(prev).length === 0 ? { [slots[0].id]: "" } : prev);
    }
  }, [slots]);

  const clearError = (key: string) => setErrors(prev => ({ ...prev, [key]: "" }));

  const toggleSlot = (slotId: number) => {
    setSelectedSlots(prev => {
      if (slotId in prev) {
        const { [slotId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [slotId]: "" };
    });
    clearError("slots");
  };

  const updateSlotPlaybacks = (slotId: number, value: string) => {
    setSelectedSlots(prev => ({ ...prev, [slotId]: value }));
    clearError("slots");
  };

  const durationDays = startDate && endDate
    ? Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)
    : 0;

  const selectedSlotEntries = Object.entries(selectedSlots);
  const rawEstimate = durationDays > 0 && selectedSlotEntries.length > 0 && space
    ? selectedSlotEntries.reduce((total, [id, pb]) => {
        const slot = slots.find(s => s.id === Number(id));
        const plays = Number(pb);
        if (!slot || plays <= 0) return total;
        return total + plays * durationDays * (space.cpm / 1000) * slot.est_impressions_per_playback * slot.price_multiplier;
      }, 0)
    : 0;
  const estimatedPrice = rawEstimate > 0 ? rawEstimate : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!campaignId) errs.campaignId = "Select a campaign";
    if (selectedSlotEntries.length === 0) {
      errs.slots = "Select at least one time slot";
    } else {
      for (const [id, pb] of selectedSlotEntries) {
        const slot = slots.find(s => s.id === Number(id));
        if (!pb || Number(pb) < 1) { errs.slots = "Enter daily playbacks for each selected slot (min 1)"; break; }
        if (slot && Number(pb) > slot.daily_capacity_playbacks) {
          errs.slots = `"${slot.label}" allows max ${slot.daily_capacity_playbacks} plays/day`; break;
        }
      }
    }
    if (!startDate) errs.startDate = "Start date is required";
    if (!endDate) errs.endDate = "End date is required";
    if (startDate && endDate && endDate <= startDate) errs.endDate = "End date must be after start date";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setIsSubmitting(true);
    try {
      await api.post("/api/bookings", {
        campaign_id: Number(campaignId),
        space_id: space!.id,
        start_date: startDate,
        end_date: endDate,
        slots: selectedSlotEntries.map(([id, pb]) => ({
          slot_id: Number(id),
          daily_playbacks_allocated: Number(pb),
        })),
      });
      await queryClient.invalidateQueries({ queryKey: ["bookings"] });
      onOpenChange(false);
      toast.success("Booking request sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book a space</DialogTitle>
        </DialogHeader>

        {space && (
          <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
            <p className="font-medium">{space.name}</p>
            <p className="text-muted-foreground mt-0.5">
              ${space.cpm} CPM
              {space.est_daily_impressions != null &&
                ` · ~${space.est_daily_impressions.toLocaleString()} daily impressions`}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 pt-1" noValidate>
          {/* Campaign */}
          <div className="space-y-1.5">
            <Label>Campaign <span className="text-red-500">*</span></Label>
            <Select value={campaignId} onValueChange={v => { setCampaignId(v); clearError("campaignId"); }}>
              <SelectTrigger className={`h-10 rounded-lg text-sm ${errors.campaignId ? "border-red-400" : "border-[#d7dce3]"}`}>
                <SelectValue placeholder="Select a campaign" />
              </SelectTrigger>
              <SelectContent>
                {bookableCampaigns.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    No active campaigns — create one first.
                  </div>
                ) : bookableCampaigns.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError msg={errors.campaignId} />
          </div>

          {/* Time slots */}
          <div className="space-y-1.5">
            <Label>Time slots <span className="text-red-500">*</span></Label>
            {slotsLoading ? (
              <p className="text-sm text-muted-foreground py-2">Loading slots…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No slots available for this space.</p>
            ) : (
              <div className="space-y-2">
                {slots.map(slot => {
                  const isChecked = slot.id in selectedSlots;
                  const pb = selectedSlots[slot.id] ?? "";
                  return (
                    <div key={slot.id}
                      className={`rounded-xl border p-3 transition-colors ${isChecked ? "border-[#ff8a00] bg-[#fff8f0]" : "border-border"}`}>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`slot-${slot.id}`}
                          checked={isChecked}
                          onCheckedChange={() => toggleSlot(slot.id)}
                          className="mt-0.5 shrink-0 data-[state=checked]:bg-[#ff8a00] data-[state=checked]:border-[#ff8a00]"
                        />
                        <div className="flex-1 min-w-0">
                          <label htmlFor={`slot-${slot.id}`} className="text-sm font-medium cursor-pointer">
                            {slot.label}
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              {fmtTime(slot.start_time)}–{fmtTime(slot.end_time)} UTC
                            </span>
                          </label>
                          <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                            <span>{slot.est_impressions_per_playback} imp/play</span>
                            <span>{slot.daily_capacity_playbacks.toLocaleString()} plays/day cap</span>
                            <span>{slot.price_multiplier}× rate</span>
                          </div>
                          {isChecked && (
                            <div className="mt-2 flex items-center gap-2">
                              <label htmlFor={`pb-${slot.id}`} className="text-xs text-muted-foreground shrink-0">
                                Daily playbacks
                              </label>
                              <Input
                                id={`pb-${slot.id}`}
                                type="number" min="1"
                                max={slot.daily_capacity_playbacks}
                                value={pb}
                                onChange={e => updateSlotPlaybacks(slot.id, e.target.value)}
                                placeholder="e.g. 48"
                                className="h-8 w-28 text-sm rounded-md border-[#d7dce3] shadow-none focus-visible:ring-[#ff8a00]"
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
            <FieldError msg={errors.slots} />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bk-start">Start date <span className="text-red-500">*</span></Label>
              <Input id="bk-start" type="date" value={startDate}
                onChange={e => { setStartDate(e.target.value); clearError("startDate"); }}
                className={errors.startDate ? inputErrCn : inputCn} />
              <FieldError msg={errors.startDate} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bk-end">End date <span className="text-red-500">*</span></Label>
              <Input id="bk-end" type="date" value={endDate}
                onChange={e => { setEndDate(e.target.value); clearError("endDate"); }}
                className={errors.endDate ? inputErrCn : inputCn} />
              <FieldError msg={errors.endDate} />
            </div>
          </div>

          {/* Price estimate */}
          {estimatedPrice != null && (
            <div className="rounded-lg bg-[#fff3e0] px-4 py-3 text-sm text-[#9a4f00]">
              Estimated total:{" "}
              <strong>${estimatedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              <span className="ml-2 text-xs opacity-75">
                {durationDays} day{durationDays !== 1 ? "s" : ""} across {selectedSlotEntries.length} slot{selectedSlotEntries.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !space}
              className="bg-[#ff8a00] text-white hover:bg-[#e77700]">
              {isSubmitting ? "Sending…" : "Send booking request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
