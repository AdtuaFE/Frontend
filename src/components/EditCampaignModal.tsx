import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { validateAdvertiserSection, type FieldErrors } from "@/utils/validators";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";

export type CampaignFields = {
  id: number;
  name: string;
  objective: string | null;
  total_budget: number | null;
  budget_period: string | null;
  location: string | null;
  ad_type: string | null;
  start_date: string | null;
  end_date: string | null;
  visibility: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: CampaignFields;
};

type FormState = {
  name: string;
  objective: string;
  totalBudget: string;
  budgetPeriod: string;
  location: string;
  adType: string;
  startDate: string;
  endDate: string;
  visibility: string;
};

const VISIBILITY_OPTIONS = [
  { value: "public",  label: "Public — visible to broadcasters" },
  { value: "private", label: "Private — only you can see it" },
];

const AD_TYPES = [
  { value: "image",     label: "Image" },
  { value: "video",     label: "Video" },
  { value: "animation", label: "Animation" },
  { value: "audio",     label: "Audio" },
];

const BUDGET_PERIODS = [
  { value: "daily",   label: "Daily" },
  { value: "weekly",  label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "total",   label: "One-time total" },
];

const inputCn = "h-10 rounded-lg border-[#d7dce3] bg-white text-sm shadow-none focus-visible:ring-[#ff8a00]";
const inputErrCn = "h-10 rounded-lg border-red-400 bg-white text-sm shadow-none focus-visible:ring-red-400";

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="mt-1 text-xs text-red-500">{msg}</p> : null;

function toFormState(c: CampaignFields): FormState {
  return {
    name: c.name,
    objective: c.objective ?? "",
    totalBudget: c.total_budget != null ? String(c.total_budget) : "",
    budgetPeriod: c.budget_period ?? "",
    location: c.location ?? "",
    adType: c.ad_type ?? "",
    startDate: c.start_date ?? "",
    endDate: c.end_date ?? "",
    visibility: c.visibility ?? "private",
  };
}

export function EditCampaignModal({ open, onOpenChange, campaign }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => toFormState(campaign));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Re-sync form when campaign prop changes (e.g. navigating between campaigns)
  useEffect(() => { setForm(toFormState(campaign)); }, [campaign.id]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSelect = (name: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errors: FieldErrors = {};
    if (!form.name.trim()) errors.name = "Campaign name is required";
    Object.assign(errors, validateAdvertiserSection({
      campaignName: form.name,
      totalBudget: form.totalBudget,
      startDate: form.startDate,
      endDate: form.endDate,
    }));
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

    setIsSubmitting(true);
    try {
      await api.put(`/api/campaigns/${campaign.id}`, {
        name: form.name,
        objective: form.objective || undefined,
        total_budget: form.totalBudget ? Number(form.totalBudget) : undefined,
        budget_period: form.budgetPeriod || undefined,
        location: form.location || undefined,
        ad_type: form.adType || undefined,
        start_date: form.startDate || undefined,
        end_date: form.endDate || undefined,
        visibility: form.visibility,
      });
      await queryClient.invalidateQueries({ queryKey: ["campaign", campaign.id] });
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      onOpenChange(false);
      toast.success("Campaign updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit campaign</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="e-name">Campaign name <span className="text-red-500">*</span></Label>
            <Input id="e-name" name="name" value={form.name} onChange={handleChange}
              className={fieldErrors.name ? inputErrCn : inputCn} />
            <FieldError msg={fieldErrors.name} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="e-objective">Objective</Label>
            <Textarea id="e-objective" name="objective" value={form.objective} onChange={handleChange}
              className="min-h-[80px] rounded-lg border-[#d7dce3] px-3 py-2 text-sm focus-visible:ring-[#ff8a00]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="e-totalBudget">Total budget</Label>
              <Input id="e-totalBudget" name="totalBudget" type="number" min="0" value={form.totalBudget}
                onChange={handleChange} className={fieldErrors.totalBudget ? inputErrCn : inputCn} />
              <FieldError msg={fieldErrors.totalBudget} />
            </div>

            <div className="space-y-1.5">
              <Label>Budget period</Label>
              <Select value={form.budgetPeriod} onValueChange={v => handleSelect("budgetPeriod", v)}>
                <SelectTrigger className="h-10 rounded-lg border-[#d7dce3] text-sm focus:ring-[#ff8a00]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_PERIODS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="e-startDate">Start date</Label>
              <Input id="e-startDate" name="startDate" type="date" value={form.startDate}
                onChange={handleChange} className={fieldErrors.startDate ? inputErrCn : inputCn} />
              <FieldError msg={fieldErrors.startDate} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="e-endDate">End date</Label>
              <Input id="e-endDate" name="endDate" type="date" value={form.endDate}
                onChange={handleChange} className={fieldErrors.endDate ? inputErrCn : inputCn} />
              <FieldError msg={fieldErrors.endDate} />
            </div>

            <div className="space-y-1.5">
              <Label>Target location</Label>
              <LocationAutocomplete
                value={form.location}
                onChange={v => { setForm(prev => ({ ...prev, location: v })); }}
                onSelect={r => { setForm(prev => ({ ...prev, location: r.place_name })); }}
                placeholder="London"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Ad type</Label>
              <Select value={form.adType} onValueChange={v => handleSelect("adType", v)}>
                <SelectTrigger className="h-10 rounded-lg border-[#d7dce3] text-sm focus:ring-[#ff8a00]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {AD_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Visibility</Label>
            <Select value={form.visibility} onValueChange={v => handleSelect("visibility", v)}>
              <SelectTrigger className="h-10 rounded-lg border-[#d7dce3] text-sm focus:ring-[#ff8a00]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#ff8a00] text-white hover:bg-[#e77700]">
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
