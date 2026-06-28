import { ChangeEvent, FormEvent, useState } from "react";
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type CampaignFormData = {
  campaignName: string;
  objective: string;
  totalBudget: string;
  budgetPeriod: string;
  campaignLocation: string;
  adType: string;
  startDate: string;
  endDate: string;
  visibility: string;
};

const empty: CampaignFormData = {
  campaignName: "", objective: "", totalBudget: "", budgetPeriod: "",
  campaignLocation: "", adType: "", startDate: "", endDate: "", visibility: "private",
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

export function CreateCampaignModal({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [formData, setCampaignFormData] = useState<CampaignFormData>(empty);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCampaignFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSelect = (name: keyof CampaignFormData, value: string) => {
    setCampaignFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errors: FieldErrors = {};
    if (!formData.campaignName.trim()) errors.campaignName = "Campaign name is required";
    Object.assign(errors, validateAdvertiserSection({
      campaignName: formData.campaignName,
      totalBudget: formData.totalBudget,
      startDate: formData.startDate,
      endDate: formData.endDate,
    }));
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

    setIsSubmitting(true);
    try {
      await api.post("/api/campaigns", {
        name: formData.campaignName,
        objective: formData.objective || undefined,
        total_budget: formData.totalBudget ? Number(formData.totalBudget) : undefined,
        budget_period: formData.budgetPeriod || undefined,
        location: formData.campaignLocation || undefined,
        ad_type: formData.adType || undefined,
        start_date: formData.startDate || undefined,
        end_date: formData.endDate || undefined,
        visibility: formData.visibility,
        status: "draft",
      });
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setCampaignFormData(empty);
      setFieldErrors({});
      onOpenChange(false);
      toast.success("Campaign created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) { setCampaignFormData(empty); setFieldErrors({}); }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create a campaign</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="c-campaignName">Campaign name <span className="text-red-500">*</span></Label>
            <Input id="c-campaignName" name="campaignName" value={formData.campaignName} onChange={handleChange}
              placeholder="Spring launch" className={fieldErrors.campaignName ? inputErrCn : inputCn} />
            <FieldError msg={fieldErrors.campaignName} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-objective">Objective</Label>
            <Textarea id="c-objective" name="objective" value={formData.objective} onChange={handleChange}
              placeholder="What are you trying to achieve?"
              className="min-h-[80px] rounded-lg border-[#d7dce3] px-3 py-2 text-sm focus-visible:ring-[#ff8a00]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-totalBudget">Total budget</Label>
              <Input id="c-totalBudget" name="totalBudget" type="number" min="0" value={formData.totalBudget}
                onChange={handleChange} placeholder="2500"
                className={fieldErrors.totalBudget ? inputErrCn : inputCn} />
              <FieldError msg={fieldErrors.totalBudget} />
            </div>

            <div className="space-y-1.5">
              <Label>Budget period</Label>
              <Select value={formData.budgetPeriod} onValueChange={v => handleSelect("budgetPeriod", v)}>
                <SelectTrigger className="h-10 rounded-lg border-[#d7dce3] text-sm focus:ring-[#ff8a00]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_PERIODS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-startDate">Start date</Label>
              <Input id="c-startDate" name="startDate" type="date" value={formData.startDate}
                onChange={handleChange} className={fieldErrors.startDate ? inputErrCn : inputCn} />
              <FieldError msg={fieldErrors.startDate} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-endDate">End date</Label>
              <Input id="c-endDate" name="endDate" type="date" value={formData.endDate}
                onChange={handleChange} className={fieldErrors.endDate ? inputErrCn : inputCn} />
              <FieldError msg={fieldErrors.endDate} />
            </div>

            <div className="space-y-1.5">
              <Label>Target location</Label>
              <LocationAutocomplete
                value={formData.campaignLocation}
                onChange={v => setCampaignFormData(prev => ({ ...prev, campaignLocation: v }))}
                onSelect={r => setCampaignFormData(prev => ({ ...prev, campaignLocation: r.place_name }))}
                placeholder="London"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Ad type</Label>
              <Select value={formData.adType} onValueChange={v => handleSelect("adType", v)}>
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
            <Select value={formData.visibility} onValueChange={v => handleSelect("visibility", v)}>
              <SelectTrigger className="h-10 rounded-lg border-[#d7dce3] text-sm focus:ring-[#ff8a00]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Set to Public once the campaign is active to attract broadcaster offers.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#ff8a00] text-white hover:bg-[#e77700]">
              {isSubmitting ? "Creating…" : "Create campaign"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
