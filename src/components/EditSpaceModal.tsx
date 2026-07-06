import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { LocationAutocomplete, type LocationResult } from "@/components/LocationAutocomplete";

export type SpaceFields = {
  id: number;
  name: string;
  description: string | null;
  space_type: string;
  display_type: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  postal_code: string | null;
  address_line1: string | null;
  address_line2: string | null;
  width_px: number | null;
  height_px: number | null;
  size_label: string | null;
  cpm: number;
  est_daily_impressions: number | null;
  interests: string[] | null;
  is_active: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  space: SpaceFields;
};

type FormState = {
  name: string;
  description: string;
  spaceType: string;
  displayType: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  country: string;
  postalCode: string;
  widthPx: string;
  heightPx: string;
  sizeLabel: string;
  cpm: string;
  estDailyImpressions: string;
  interests: string;
  isActive: boolean;
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

function toFormState(s: SpaceFields): FormState {
  return {
    name: s.name,
    description: s.description ?? "",
    spaceType: s.space_type,
    displayType: s.display_type ?? "",
    addressLine1: s.address_line1 ?? "",
    addressLine2: s.address_line2 ?? "",
    city: s.city ?? "",
    region: s.region ?? "",
    country: s.country ?? "",
    postalCode: s.postal_code ?? "",
    widthPx: s.width_px != null ? String(s.width_px) : "",
    heightPx: s.height_px != null ? String(s.height_px) : "",
    sizeLabel: s.size_label ?? "",
    cpm: String(s.cpm),
    estDailyImpressions: s.est_daily_impressions != null ? String(s.est_daily_impressions) : "",
    interests: (s.interests ?? []).join(", "),
    isActive: s.is_active,
  };
}

export function EditSpaceModal({ open, onOpenChange, space }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => toFormState(space));
  const [nameError, setNameError] = useState("");
  const [cpmError, setCpmError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");

  useEffect(() => { setForm(toFormState(space)); }, [space.id]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSelect = (name: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationSelect = (result: LocationResult) => {
    const parts = result.place_name.split(", ");
    const firstIsStreet = /^\d/.test(parts[0]);
    const addressLine1 = firstIsStreet ? parts[0] : "";
    const city = firstIsStreet ? (parts[1] ?? "") : (parts[0] ?? "");
    const country = parts[parts.length - 1] ?? "";
    const regionRaw = parts.length >= 3 ? parts[parts.length - 2] : "";
    const postalMatch = regionRaw.match(/^(.+?)\s+(\d[\w-]+)$/);
    const region = postalMatch ? postalMatch[1].trim() : regionRaw;
    const postalCode = postalMatch ? postalMatch[2].trim() : "";
    setForm(prev => ({
      ...prev,
      ...(addressLine1 ? { addressLine1 } : {}),
      city: city || prev.city,
      region: region || prev.region,
      country: country || prev.country,
      ...(postalCode ? { postalCode } : {}),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    let valid = true;
    if (!form.name.trim()) { setNameError("Space name is required"); valid = false; }
    else setNameError("");
    if (!form.cpm || isNaN(Number(form.cpm))) { setCpmError("CPM is required"); valid = false; }
    else setCpmError("");
    if (!valid) return;

    setIsSubmitting(true);
    try {
      const interests = form.interests.split(",").map(i => i.trim()).filter(Boolean);
      await api.put(`/api/spaces/${space.id}`, {
        name: form.name,
        description: form.description || undefined,
        space_type: form.spaceType,
        display_type: form.displayType || undefined,
        address_line1: form.addressLine1 || undefined,
        address_line2: form.addressLine2 || undefined,
        city: form.city || undefined,
        region: form.region || undefined,
        country: form.country || undefined,
        postal_code: form.postalCode || undefined,
        width_px: form.widthPx ? Number(form.widthPx) : undefined,
        height_px: form.heightPx ? Number(form.heightPx) : undefined,
        size_label: form.sizeLabel || undefined,
        cpm: Number(form.cpm),
        est_daily_impressions: form.estDailyImpressions ? Number(form.estDailyImpressions) : undefined,
        interests: interests.length > 0 ? interests : undefined,
        is_active: form.isActive,
      });
      await queryClient.invalidateQueries({ queryKey: ["space", space.id] });
      await queryClient.invalidateQueries({ queryKey: ["spaces-mine"] });
      setLocationSearch("");
      onOpenChange(false);
      toast.success("Space updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) { setForm(toFormState(space)); setLocationSearch(""); }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit space</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2" noValidate>
          <div className="grid grid-cols-2 gap-4">

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="es-name">Space name <span className="text-red-500">*</span></Label>
              <Input id="es-name" name="name" value={form.name} onChange={handleChange}
                className={nameError ? inputErrCn : inputCn} />
              {nameError && <p className="mt-1 text-xs text-red-500">{nameError}</p>}
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="es-description">Description</Label>
              <Textarea id="es-description" name="description" value={form.description}
                onChange={handleChange}
                className="min-h-[80px] rounded-lg border-[#d7dce3] px-3 py-2 text-sm focus-visible:ring-[#ff8a00]" />
            </div>

            <div className="space-y-1.5">
              <Label>Space type</Label>
              <Select value={form.spaceType} onValueChange={v => handleSelect("spaceType", v)}>
                <SelectTrigger className="h-10 rounded-lg border-[#d7dce3] text-sm focus:ring-[#ff8a00]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPACE_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Display type</Label>
              <Select value={form.displayType} onValueChange={v => handleSelect("displayType", v)}>
                <SelectTrigger className="h-10 rounded-lg border-[#d7dce3] text-sm focus:ring-[#ff8a00]">
                  <SelectValue placeholder="Select display type" />
                </SelectTrigger>
                <SelectContent>
                  {DISPLAY_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Search address</Label>
              <LocationAutocomplete
                value={locationSearch}
                onChange={setLocationSearch}
                onSelect={handleLocationSelect}
                placeholder="Start typing an address or city…"
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="es-addressLine1">Address line 1</Label>
              <Input id="es-addressLine1" name="addressLine1" value={form.addressLine1}
                onChange={handleChange} placeholder="123 Main Street" className={inputCn} />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="es-addressLine2">Address line 2</Label>
              <Input id="es-addressLine2" name="addressLine2" value={form.addressLine2}
                onChange={handleChange} placeholder="Suite, floor, or landmark" className={inputCn} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="es-city">City</Label>
              <Input id="es-city" name="city" value={form.city} onChange={handleChange}
                placeholder="London" className={inputCn} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="es-region">State / region</Label>
              <Input id="es-region" name="region" value={form.region} onChange={handleChange}
                placeholder="Indiana" className={inputCn} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="es-country">Country</Label>
              <Input id="es-country" name="country" value={form.country} onChange={handleChange}
                placeholder="US" className={inputCn} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="es-postalCode">ZIP / Postal code</Label>
              <Input id="es-postalCode" name="postalCode" value={form.postalCode}
                onChange={handleChange} placeholder="46204" className={inputCn} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="es-cpm">CPM <span className="text-red-500">*</span></Label>
              <Input id="es-cpm" name="cpm" type="number" min="0" value={form.cpm}
                onChange={handleChange} className={cpmError ? inputErrCn : inputCn} />
              {cpmError && <p className="mt-1 text-xs text-red-500">{cpmError}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="es-estDailyImpressions">Est. daily impressions</Label>
              <Input id="es-estDailyImpressions" name="estDailyImpressions" type="number" min="0"
                value={form.estDailyImpressions} onChange={handleChange}
                placeholder="2400" className={inputCn} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="es-widthPx">Width (px)</Label>
              <Input id="es-widthPx" name="widthPx" type="number" min="0" value={form.widthPx}
                onChange={handleChange} placeholder="1920" className={inputCn} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="es-heightPx">Height (px)</Label>
              <Input id="es-heightPx" name="heightPx" type="number" min="0" value={form.heightPx}
                onChange={handleChange} placeholder="1080" className={inputCn} />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="es-sizeLabel">Size label</Label>
              <Input id="es-sizeLabel" name="sizeLabel" value={form.sizeLabel}
                onChange={handleChange} placeholder="16:9 landscape" className={inputCn} />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="es-interests">Audience interests</Label>
              <Input id="es-interests" name="interests" value={form.interests}
                onChange={handleChange} placeholder="coffee, students, commuters, fitness"
                className={inputCn} />
            </div>

            <div className="col-span-2 flex items-center gap-3">
              <Switch
                id="es-isActive"
                checked={form.isActive}
                onCheckedChange={v => setForm(prev => ({ ...prev, isActive: v }))}
              />
              <Label htmlFor="es-isActive">Active (visible in listings)</Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}
              className="bg-[#ff8a00] text-white hover:bg-[#e77700]">
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
