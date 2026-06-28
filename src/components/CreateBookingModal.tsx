import { FormEvent, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  const [slotId, setSlotId] = useState("");
  const [playbacks, setPlaybacks] = useState("");
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
      setCampaignId(""); setSlotId(""); setPlaybacks("");
      setStartDate(""); setEndDate(""); setErrors({});
    }
  }, [open]);

  // Auto-select single slot
  useEffect(() => {
    if (slots.length === 1 && !slotId) setSlotId(String(slots[0].id));
  }, [slots, slotId]);

  const clearError = (key: string) => setErrors(prev => ({ ...prev, [key]: "" }));

  const selectedSlot = slots.find(s => String(s.id) === slotId);
  const durationDays = startDate && endDate
    ? Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)
    : 0;
  const estimatedPrice = selectedSlot && space && Number(playbacks) > 0 && durationDays > 0
    ? Number(playbacks) * durationDays *
      (space.cpm / 1000) * selectedSlot.est_impressions_per_playback * selectedSlot.price_multiplier
    : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!campaignId) errs.campaignId = "Select a campaign";
    if (!slotId) errs.slotId = "Select a time slot";
    if (!playbacks || Number(playbacks) < 1) errs.playbacks = "Enter daily playbacks (min 1)";
    if (selectedSlot && Number(playbacks) > selectedSlot.daily_capacity_playbacks)
      errs.playbacks = `Max ${selectedSlot.daily_capacity_playbacks} playbacks for this slot`;
    if (!startDate) errs.startDate = "Start date is required";
    if (!endDate) errs.endDate = "End date is required";
    if (startDate && endDate && endDate <= startDate) errs.endDate = "End date must be after start date";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setIsSubmitting(true);
    try {
      await api.post("/api/bookings", {
        campaign_id: Number(campaignId),
        space_id: space!.id,
        slot_id: Number(slotId),
        daily_playbacks_allocated: Number(playbacks),
        start_date: startDate,
        end_date: endDate,
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

          {/* Time slot */}
          <div className="space-y-1.5">
            <Label>Time slot <span className="text-red-500">*</span></Label>
            {slotsLoading ? (
              <p className="text-sm text-muted-foreground py-2">Loading slots…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No slots available for this space.</p>
            ) : (
              <RadioGroup value={slotId} onValueChange={v => { setSlotId(v); clearError("slotId"); }} className="space-y-2">
                {slots.map(slot => (
                  <Label
                    key={slot.id}
                    htmlFor={`slot-${slot.id}`}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition hover:border-[#ff8a00] ${
                      slotId === String(slot.id) ? "border-[#ff8a00] bg-[#fff8f0]" : "border-border"
                    }`}>
                    <RadioGroupItem value={String(slot.id)} id={`slot-${slot.id}`} className="mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{slot.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {fmtTime(slot.start_time)}–{fmtTime(slot.end_time)} UTC
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        <span>{slot.est_impressions_per_playback} imp/play</span>
                        <span>{slot.daily_capacity_playbacks.toLocaleString()} plays/day cap</span>
                        <span>{slot.price_multiplier}× rate</span>
                      </div>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            )}
            <FieldError msg={errors.slotId} />
          </div>

          {/* Daily playbacks */}
          <div className="space-y-1.5">
            <Label htmlFor="bk-playbacks">
              Daily playbacks <span className="text-red-500">*</span>
              {selectedSlot && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  max {selectedSlot.daily_capacity_playbacks.toLocaleString()}/day
                </span>
              )}
            </Label>
            <Input
              id="bk-playbacks"
              type="number" min="1"
              max={selectedSlot?.daily_capacity_playbacks}
              value={playbacks}
              onChange={e => { setPlaybacks(e.target.value); clearError("playbacks"); }}
              placeholder="e.g. 48"
              className={errors.playbacks ? inputErrCn : inputCn}
            />
            <FieldError msg={errors.playbacks} />
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
                {durationDays} day{durationDays !== 1 ? "s" : ""} × {playbacks} plays/day
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
