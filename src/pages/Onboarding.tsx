import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";

// Maps the wizard's business type labels to the BE space venue_type enum
export const BUSINESS_TO_VENUE: Record<string, string> = {
  Restaurant: "restaurant",
  "Real estate": "other",
  Retail: "shopping_mall",
  Healthcare: "healthcare",
  Technology: "office_building",
  Education: "university",
  Entertainment: "cinema",
  Automotive: "other",
  Finance: "office_building",
};

export type WizardData = {
  accountType: "business" | "individual" | null;
  businessTypes: string[];
  customBusiness: string;
  adBudget: string;
  adCreativesReady: "yes" | "no" | null;
  venueType: string | null;
};

const WIZARD_KEY = "adtua_wizard";

export function saveWizardData(data: WizardData) {
  localStorage.setItem(WIZARD_KEY, JSON.stringify(data));
}

export function loadWizardData(): WizardData {
  try {
    const raw = localStorage.getItem(WIZARD_KEY);
    if (raw) return JSON.parse(raw) as WizardData;
  } catch { /* ignore */ }
  return { accountType: null, businessTypes: [], customBusiness: "", adBudget: "", adCreativesReady: null, venueType: null };
}

export const businessOptions = [
  "Restaurant", "Real estate", "Retail", "Healthcare",
  "Technology", "Education", "Entertainment", "Automotive", "Finance",
];

const Onboarding = () => {
  const { user } = useAuth();
  const isBroadcaster = user?.roles.includes("broadcaster") ?? false;

  const [showBanner, setShowBanner] = useState(true);
  // Role step is skipped — role was captured at signup. Start at "type".
  const [step, setStep] = useState<"type" | "business" | "budget">("type");
  const [accountType, setAccountType] = useState<"business" | "individual" | null>(null);
  const [businessTypes, setBusinessTypes] = useState<string[]>([]);
  const [customBusiness, setCustomBusiness] = useState("");
  const [adBudget, setAdBudget] = useState("");
  const [adCreativesReady, setAdCreativesReady] = useState<"yes" | "no" | null>(null);
  const navigate = useNavigate();

  const progressWidth = step === "type" ? "33%" : step === "business" ? "66%" : "100%";

  const handleNext = () => {
    if (step === "type" && accountType === "business") {
      setStep("business");
    } else if (step === "business") {
      setStep("budget");
    } else {
      persistAndContinue();
    }
  };

  const persistAndContinue = () => {
    // Derive venue_type from selected business types (broadcaster only) — first match wins
    let venueType: string | null = null;
    if (isBroadcaster) {
      const allTypes = customBusiness ? [...businessTypes, customBusiness] : businessTypes;
      for (const t of allTypes) {
        const mapped = BUSINESS_TO_VENUE[t];
        if (mapped) { venueType = mapped; break; }
      }
      if (!venueType && allTypes.length > 0) venueType = "other";
    }
    saveWizardData({ accountType, businessTypes, customBusiness, adBudget, adCreativesReady, venueType });
    navigate("/onboarding-form");
  };

  const handleDoItLater = () => {
    saveWizardData({ accountType, businessTypes, customBusiness, adBudget, adCreativesReady, venueType: null });
    navigate("/onboarding-form");
  };

  const handleBusinessTypeToggle = (type: string) => {
    setBusinessTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">adtua</h1>
          {showBanner && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>You can change your selections anytime from Account Settings.</span>
              <button onClick={() => setShowBanner(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="mb-12">
          <div className="h-1 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: progressWidth }} />
          </div>
        </div>

        <div className="mx-auto max-w-4xl">
          {step === "type" && (
            <>
              <h2 className="mb-12 text-center text-3xl font-bold">Let&apos;s setup your dashboard</h2>
              <div className="mx-auto max-w-xl space-y-8">
                <div className="space-y-4">
                  <Label className="text-base">
                    Are you a business or individual?<span className="text-destructive">*</span>
                  </Label>
                  <RadioGroup value={accountType || ""}
                    onValueChange={(v) => setAccountType(v as "business" | "individual")}
                    className="flex justify-center gap-8">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="business" id="business" />
                      <Label htmlFor="business" className="cursor-pointer font-normal">Business</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="individual" id="individual" />
                      <Label htmlFor="individual" className="cursor-pointer font-normal">Individual</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="flex justify-center">
                  <Button onClick={handleNext} disabled={!accountType}
                    className="h-12 rounded-lg px-12 text-base font-medium"
                    style={{ backgroundColor: "#FF8A00" }}>
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}

          {step === "business" && (
            <>
              <h2 className="mb-12 text-center text-3xl font-bold">Let&apos;s setup your dashboard</h2>
              <div className="mx-auto max-w-3xl space-y-8">
                <div className="space-y-4">
                  <h3 className="text-center text-xl font-medium">What kind of business do you have?</h3>
                  <p className="text-center text-sm text-muted-foreground">Select all that apply</p>
                  <div className="flex flex-wrap justify-center gap-3 pt-4">
                    {businessOptions.map((type) => (
                      <button key={type} onClick={() => handleBusinessTypeToggle(type)}
                        className={`rounded-full border px-6 py-2.5 text-sm font-medium transition-all ${
                          businessTypes.includes(type)
                            ? "border-[#FFE5CC] bg-[#FFE5CC] text-foreground"
                            : "border-border bg-background text-foreground hover:border-primary"
                        }`}>
                        {type}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2 pt-4">
                    <Label className="block text-center text-sm">Enter your own</Label>
                    <div className="flex justify-center">
                      <Input value={customBusiness} onChange={(e) => setCustomBusiness(e.target.value)}
                        className="h-12 max-w-md rounded-lg text-center" placeholder="" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-6 pt-4">
                  <button onClick={handleDoItLater} className="text-base text-foreground hover:text-primary">
                    Do it later
                  </button>
                  <Button onClick={handleNext} className="h-12 rounded-lg px-12 text-base font-medium"
                    style={{ backgroundColor: "#FF8A00" }}>
                    Continue
                  </Button>
                </div>
              </div>
            </>
          )}

          {step === "budget" && (
            <>
              <h2 className="mb-12 text-center text-3xl font-bold">Let&apos;s setup your dashboard</h2>
              <div className="mx-auto max-w-xl space-y-8">
                <div className="space-y-4">
                  <Label className="block text-center text-base">What is your ad budget?</Label>
                  <div className="relative mx-auto max-w-sm">
                    <Input type="number" value={adBudget} onChange={(e) => setAdBudget(e.target.value)}
                      className="h-12 rounded-lg pr-8 text-right" placeholder="" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground">$</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <Label className="block text-center text-base">Do you have your ad creatives ready?</Label>
                  <RadioGroup value={adCreativesReady || ""}
                    onValueChange={(v) => setAdCreativesReady(v as "yes" | "no")}
                    className="flex justify-center gap-8">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="creatives-yes" />
                      <Label htmlFor="creatives-yes" className="cursor-pointer font-normal">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="creatives-no" />
                      <Label htmlFor="creatives-no" className="cursor-pointer font-normal">No</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="flex items-center justify-center gap-6 pt-4">
                  <button onClick={handleDoItLater} className="text-base text-foreground hover:text-primary">
                    Do it later
                  </button>
                  <Button onClick={handleNext} disabled={!adBudget || !adCreativesReady}
                    className="h-12 rounded-lg px-12 text-base font-medium"
                    style={{ backgroundColor: "#FF8A00" }}>
                    Continue
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
