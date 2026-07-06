import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveWizardData, loadWizardData, businessOptions, BUSINESS_TO_VENUE } from "@/pages/Onboarding";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
};

export function BusinessProfileModal({ open, onOpenChange, onComplete }: Props) {
  const { user } = useAuth();
  const isBroadcaster = user?.roles.includes("broadcaster") ?? false;

  const [accountType, setAccountType] = useState<"business" | "individual" | null>(null);
  const [businessTypes, setBusinessTypes] = useState<string[]>([]);
  const [customBusiness, setCustomBusiness] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showBusinessStep = accountType === "business";
  const canSave = accountType !== null && (accountType === "individual" || businessTypes.length > 0 || customBusiness.trim() !== "");

  const toggleType = (type: string) =>
    setBusinessTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);

  const handleSave = async () => {
    if (!accountType) return;
    setIsSubmitting(true);
    try {
      // Derive venue_type from selected business types for broadcaster
      let venueType: string | null = null;
      if (isBroadcaster) {
        const allTypes = customBusiness.trim() ? [...businessTypes, customBusiness.trim()] : businessTypes;
        for (const t of allTypes) {
          const mapped = BUSINESS_TO_VENUE[t];
          if (mapped) { venueType = mapped; break; }
        }
        if (!venueType && allTypes.length > 0) venueType = "other";
      }

      const existing = loadWizardData();
      saveWizardData({ ...existing, accountType, businessTypes, customBusiness, venueType });

      // Persist company/org name to profile if provided
      if (companyName.trim()) {
        const patch = isBroadcaster
          ? { company_name: companyName.trim() }
          : { org_name: companyName.trim() };
        await api.patch("/api/user/profile", patch);
      }

      onComplete();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tell us about your business</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-2">
          {/* Step 1 — individual or business */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Are you a business or individual?</Label>
            <RadioGroup value={accountType ?? ""} onValueChange={v => setAccountType(v as "business" | "individual")}
              className="flex gap-6">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="business" id="bp-business" />
                <Label htmlFor="bp-business" className="cursor-pointer font-normal">Business</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="individual" id="bp-individual" />
                <Label htmlFor="bp-individual" className="cursor-pointer font-normal">Individual</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Step 2 — business type and name (only when business) */}
          {showBusinessStep && (
            <>
              <div className="space-y-3">
                <Label className="text-sm font-medium">What kind of business? <span className="text-muted-foreground font-normal">(select all that apply)</span></Label>
                <div className="flex flex-wrap gap-2">
                  {businessOptions.map(type => (
                    <button key={type} type="button" onClick={() => toggleType(type)}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                        businessTypes.includes(type)
                          ? "border-[#FFE5CC] bg-[#FFE5CC] text-foreground"
                          : "border-border bg-background text-foreground hover:border-[#ff8a00]"
                      }`}>
                      {type}
                    </button>
                  ))}
                </div>
                <Input value={customBusiness} onChange={e => setCustomBusiness(e.target.value)}
                  placeholder="Or enter your own…"
                  className="h-10 rounded-lg border-[#d7dce3] text-sm focus-visible:ring-[#ff8a00]" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bp-companyName" className="text-sm font-medium">
                  {isBroadcaster ? "Company name" : "Organization name"}{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input id="bp-companyName" value={companyName} onChange={e => setCompanyName(e.target.value)}
                  placeholder={isBroadcaster ? "Adtua Media Group" : "Adtua Coffee Co."}
                  className="h-10 rounded-lg border-[#d7dce3] text-sm focus-visible:ring-[#ff8a00]" />
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!canSave || isSubmitting}
              className="bg-[#ff8a00] text-white hover:bg-[#e77700]">
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
