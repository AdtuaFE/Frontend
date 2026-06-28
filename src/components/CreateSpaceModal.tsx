import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { validateBroadcasterSection, type FieldErrors } from "@/utils/validators";
import { loadWizardData } from "@/pages/Onboarding";
import { LocationAutocomplete, type LocationResult } from "@/components/LocationAutocomplete";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FormData = {
  spaceName: string;
  spaceDescription: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  country: string;
  postalCode: string;
  interests: string;
  spaceType: string;
  displayType: string;
  widthPx: string;
  heightPx: string;
  sizeLabel: string;
  cpm: string;
  estDailyImpressions: string;
};

const empty: FormData = {
  spaceName: "", spaceDescription: "", addressLine1: "", addressLine2: "",
  city: "", region: "", country: "", postalCode: "", interests: "",
  spaceType: "", displayType: "", widthPx: "", heightPx: "",
  sizeLabel: "", cpm: "", estDailyImpressions: "",
};

const SPACE_TYPES = [
  { value: "billboard",       label: "Billboard" },
  { value: "digital_screen",  label: "Digital screen" },
  { value: "window_display",  label: "Window display" },
  { value: "poster",          label: "Poster" },
  { value: "transit_shelter", label: "Transit shelter" },
  { value: "vehicle_wrap",    label: "Vehicle wrap" },
  { value: "projection",      label: "Projection" },
  { value: "other",           label: "Other" },
];

const DISPLAY_TYPES = [
  { value: "static",      label: "Static" },
  { value: "digital_led", label: "Digital LED" },
  { value: "backlit",     label: "Backlit" },
  { value: "neon",        label: "Neon" },
  { value: "projection",  label: "Projection" },
  { value: "other",       label: "Other" },
];

const inputCn = "h-10 rounded-lg border-[#d7dce3] bg-white text-sm shadow-none focus-visible:ring-[#ff8a00]";
const inputErrCn = "h-10 rounded-lg border-red-400 bg-white text-sm shadow-none focus-visible:ring-red-400";

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="mt-1 text-xs text-red-500">{msg}</p> : null;

export function CreateSpaceModal({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FormData>(empty);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");

  const interestsPreview = useMemo(
    () => formData.interests.split(",").map(i => i.trim()).filter(Boolean),
    [formData.interests],
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSelect = (name: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleLocationSelect = (result: LocationResult) => {
    const parts = result.place_name.split(", ");
    // If the first part starts with a digit it's a street address e.g. "42 Maple Avenue"
    const firstIsStreet = /^\d/.test(parts[0]);
    const addressLine1 = firstIsStreet ? parts[0] : "";
    const city = firstIsStreet ? (parts[1] ?? "") : (parts[0] ?? "");
    const country = parts[parts.length - 1] ?? "";
    // Second-to-last part may be "Indiana 47401" — split into region + postal code
    const regionRaw = parts.length >= 3 ? parts[parts.length - 2] : "";
    const postalMatch = regionRaw.match(/^(.+?)\s+(\d[\w-]+)$/);
    const region = postalMatch ? postalMatch[1].trim() : regionRaw;
    const postalCode = postalMatch ? postalMatch[2].trim() : "";

    setFormData(prev => ({
      ...prev,
      ...(addressLine1 ? { addressLine1 } : {}),
      city: city || prev.city,
      region: region || prev.region,
      country: country || prev.country,
      ...(postalCode ? { postalCode } : {}),
    }));
    setFieldErrors(prev => ({ ...prev, city: undefined, country: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errors = validateBroadcasterSection({
      spaceName: formData.spaceName,
      spaceType: formData.spaceType,
      displayType: formData.displayType,
      city: formData.city,
      country: formData.country,
      cpm: formData.cpm,
    });
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

    setIsSubmitting(true);
    try {
      const wizard = loadWizardData();
      const interestsList = formData.interests.split(",").map(i => i.trim()).filter(Boolean);
      await api.post("/api/spaces", {
        name: formData.spaceName,
        description: formData.spaceDescription || undefined,
        space_type: formData.spaceType,
        display_type: formData.displayType,
        city: formData.city,
        country: formData.country,
        cpm: Number(formData.cpm),
        width_px: formData.widthPx ? Number(formData.widthPx) : undefined,
        height_px: formData.heightPx ? Number(formData.heightPx) : undefined,
        size_label: formData.sizeLabel || undefined,
        est_daily_impressions: formData.estDailyImpressions ? Number(formData.estDailyImpressions) : undefined,
        interests: interestsList.length > 0 ? interestsList : undefined,
        venue_type: wizard.venueType || undefined,
        address_line1: formData.addressLine1 || undefined,
        address_line2: formData.addressLine2 || undefined,
        region: formData.region || undefined,
        postal_code: formData.postalCode || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["spaces-mine"] });
      setFormData(empty);
      setFieldErrors({});
      setLocationSearch("");
      onOpenChange(false);
      toast.success("Space created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) { setFormData(empty); setFieldErrors({}); setLocationSearch(""); }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a space</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="s-spaceName">Space name <span className="text-red-500">*</span></Label>
              <Input id="s-spaceName" name="spaceName" value={formData.spaceName} onChange={handleChange}
                placeholder="Downtown kiosk screen"
                className={fieldErrors.spaceName ? inputErrCn : inputCn} />
              <FieldError msg={fieldErrors.spaceName} />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="s-spaceDescription">Description</Label>
              <Textarea id="s-spaceDescription" name="spaceDescription" value={formData.spaceDescription}
                onChange={handleChange}
                placeholder="Describe where the ad space lives, who sees it, and why it performs well."
                className="min-h-[80px] rounded-lg border-[#d7dce3] px-3 py-2 text-sm focus-visible:ring-[#ff8a00]" />
            </div>

            <div className="space-y-1.5">
              <Label>Space type <span className="text-red-500">*</span></Label>
              <Select value={formData.spaceType} onValueChange={v => handleSelect("spaceType", v)}>
                <SelectTrigger className={`h-10 rounded-lg text-sm ${fieldErrors.spaceType ? "border-red-400 focus:ring-red-400" : "border-[#d7dce3] focus:ring-[#ff8a00]"}`}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {SPACE_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <FieldError msg={fieldErrors.spaceType} />
            </div>

            <div className="space-y-1.5">
              <Label>Display type <span className="text-red-500">*</span></Label>
              <Select value={formData.displayType} onValueChange={v => handleSelect("displayType", v)}>
                <SelectTrigger className={`h-10 rounded-lg text-sm ${fieldErrors.displayType ? "border-red-400 focus:ring-red-400" : "border-[#d7dce3] focus:ring-[#ff8a00]"}`}>
                  <SelectValue placeholder="Select display type" />
                </SelectTrigger>
                <SelectContent>
                  {DISPLAY_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <FieldError msg={fieldErrors.displayType} />
            </div>

            {/* Address — search autocomplete pre-fills city + country */}
            <div className="col-span-2 space-y-1.5">
              <Label>Search address</Label>
              <LocationAutocomplete
                value={locationSearch}
                onChange={setLocationSearch}
                onSelect={handleLocationSelect}
                placeholder="Start typing an address or city…"
              />
              <p className="text-xs text-muted-foreground">
                Selecting a result pre-fills City and Country below. You can still edit them manually.
              </p>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="s-addressLine1">Address line 1</Label>
              <Input id="s-addressLine1" name="addressLine1" value={formData.addressLine1} onChange={handleChange}
                placeholder="123 Main Street" className={inputCn} />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="s-addressLine2">Address line 2</Label>
              <Input id="s-addressLine2" name="addressLine2" value={formData.addressLine2} onChange={handleChange}
                placeholder="Suite, floor, or landmark" className={inputCn} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-city">City <span className="text-red-500">*</span></Label>
              <Input id="s-city" name="city" value={formData.city} onChange={handleChange}
                placeholder="London" className={fieldErrors.city ? inputErrCn : inputCn} />
              <FieldError msg={fieldErrors.city} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-region">State / region</Label>
              <Input id="s-region" name="region" value={formData.region} onChange={handleChange}
                placeholder="Indiana" className={inputCn} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-country">Country <span className="text-red-500">*</span></Label>
              <Input id="s-country" name="country" value={formData.country} onChange={handleChange}
                placeholder="US" className={fieldErrors.country ? inputErrCn : inputCn} />
              <FieldError msg={fieldErrors.country} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-postalCode">ZIP / Postal code</Label>
              <Input id="s-postalCode" name="postalCode" value={formData.postalCode} onChange={handleChange}
                placeholder="46204" className={inputCn} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-cpm">CPM <span className="text-red-500">*</span></Label>
              <Input id="s-cpm" name="cpm" type="number" min="0" value={formData.cpm} onChange={handleChange}
                placeholder="18" className={fieldErrors.cpm ? inputErrCn : inputCn} />
              <FieldError msg={fieldErrors.cpm} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-estDailyImpressions">Est. daily impressions</Label>
              <Input id="s-estDailyImpressions" name="estDailyImpressions" type="number" min="0"
                value={formData.estDailyImpressions} onChange={handleChange}
                placeholder="2400" className={inputCn} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-widthPx">Width (px)</Label>
              <Input id="s-widthPx" name="widthPx" type="number" min="0" value={formData.widthPx}
                onChange={handleChange} placeholder="1920" className={inputCn} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-heightPx">Height (px)</Label>
              <Input id="s-heightPx" name="heightPx" type="number" min="0" value={formData.heightPx}
                onChange={handleChange} placeholder="1080" className={inputCn} />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="s-sizeLabel">Size label</Label>
              <Input id="s-sizeLabel" name="sizeLabel" value={formData.sizeLabel} onChange={handleChange}
                placeholder="16:9 landscape" className={inputCn} />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="s-interests">Audience interests</Label>
              <Input id="s-interests" name="interests" value={formData.interests} onChange={handleChange}
                placeholder="coffee, students, commuters, fitness" className={inputCn} />
              {interestsPreview.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {interestsPreview.map(interest => (
                    <span key={interest}
                      className="rounded-full bg-[#fff3e0] px-3 py-1 text-xs font-medium text-[#9a4f00]">
                      {interest}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#ff8a00] text-white hover:bg-[#e77700]">
              {isSubmitting ? "Creating…" : "Add space"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
