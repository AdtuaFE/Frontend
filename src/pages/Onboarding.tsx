import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Megaphone, Building, X } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Onboarding = () => {
  const [showBanner, setShowBanner] = useState(true);
  const [step, setStep] = useState<"role" | "type" | "business" | "budget">("role");
  const [selectedRole, setSelectedRole] = useState<"broadcaster" | "advertiser" | "both" | null>(null);
  const [accountType, setAccountType] = useState<"business" | "individual" | null>(null);
  const [businessTypes, setBusinessTypes] = useState<string[]>([]);
  const [customBusiness, setCustomBusiness] = useState("");
  const [adBudget, setAdBudget] = useState("");
  const [adCreativesReady, setAdCreativesReady] = useState<"yes" | "no" | null>(null);
  const navigate = useNavigate();

  const businessOptions = [
    "Restaurant",
    "Real estate",
    "Retail",
    "Healthcare",
    "Technology",
    "Education",
    "Entertainment",
    "Automotive",
    "Finance",
  ];

  const handleRoleSelection = (role: "broadcaster" | "advertiser" | "both") => {
    setSelectedRole(role);
    setStep("type");
  };

  const handleNext = () => {
    if (step === "type" && accountType === "business") {
      setStep("business");
    } else if (step === "business") {
      setStep("budget");
    } else {
      console.log("Onboarding complete:", {
        selectedRole,
        accountType,
        businessTypes,
        customBusiness,
        adBudget,
        adCreativesReady,
      });
      navigate("/dashboard");
    }
  };

  const handleBusinessTypeToggle = (type: string) => {
    setBusinessTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type],
    );
  };

  const handleDoItLater = () => {
    console.log("Skipping step:", step);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">adtua</h1>

          {showBanner && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>You can change your selections anytime from Account Settings.</span>
              <button
                onClick={() => setShowBanner(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="mb-12">
          <div className="h-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width:
                  step === "role"
                    ? "25%"
                    : step === "type"
                      ? "50%"
                      : step === "business"
                        ? "75%"
                        : "100%",
              }}
            />
          </div>
        </div>

        <div className="mx-auto max-w-4xl">
          {step === "role" ? (
            <>
              <h2 className="mb-12 text-center text-3xl font-bold">
                Welcome! How do you want to primarily use Adtua?
              </h2>

              <div className="mb-8 grid gap-6 md:grid-cols-2">
                <button
                  onClick={() => handleRoleSelection("broadcaster")}
                  className={`rounded-2xl border-2 p-8 text-center transition-all hover:border-primary ${
                    selectedRole === "broadcaster"
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-border">
                      <Megaphone className="h-10 w-10" />
                    </div>
                    <h3 className="text-xl font-semibold">Broadcaster</h3>
                    <p className="text-sm text-muted-foreground">
                      You have a space that can show advertisements.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => handleRoleSelection("advertiser")}
                  className={`rounded-2xl border-2 p-8 text-center transition-all hover:border-primary ${
                    selectedRole === "advertiser"
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-border">
                      <Building className="h-10 w-10" />
                    </div>
                    <h3 className="text-xl font-semibold">Advertiser</h3>
                    <p className="text-sm text-muted-foreground">
                      You are an individual or a company seeking to display advertisements.
                    </p>
                  </div>
                </button>
              </div>

              <div className="text-center">
                <button
                  onClick={() => handleRoleSelection("both")}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  I want to try both
                </button>
              </div>
            </>
          ) : step === "type" ? (
            <>
              <h2 className="mb-12 text-center text-3xl font-bold">
                Let&apos;s setup your dashboard
              </h2>

              <div className="mx-auto max-w-xl space-y-8">
                <div className="space-y-4">
                  <Label className="text-base">
                    Are you a business or individual?<span className="text-destructive">*</span>
                  </Label>

                  <RadioGroup
                    value={accountType || ""}
                    onValueChange={(value) => setAccountType(value as "business" | "individual")}
                    className="flex justify-center gap-8"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="business" id="business" />
                      <Label htmlFor="business" className="cursor-pointer font-normal">
                        Business
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="individual" id="individual" />
                      <Label htmlFor="individual" className="cursor-pointer font-normal">
                        Individual
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={handleNext}
                    disabled={!accountType}
                    className="h-12 rounded-lg px-12 text-base font-medium"
                    style={{ backgroundColor: "#FF8A00" }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : step === "business" ? (
            <>
              <h2 className="mb-12 text-center text-3xl font-bold">
                Let&apos;s setup your dashboard
              </h2>

              <div className="mx-auto max-w-3xl space-y-8">
                <div className="space-y-4">
                  <h3 className="text-center text-xl font-medium">
                    What kind of business do you have?
                  </h3>
                  <p className="text-center text-sm text-muted-foreground">
                    Select all that apply
                  </p>

                  <div className="flex flex-wrap justify-center gap-3 pt-4">
                    {businessOptions.map((type) => (
                      <button
                        key={type}
                        onClick={() => handleBusinessTypeToggle(type)}
                        className={`rounded-full border px-6 py-2.5 text-sm font-medium transition-all ${
                          businessTypes.includes(type)
                            ? "border-[#FFE5CC] bg-[#FFE5CC] text-foreground"
                            : "border-border bg-background text-foreground hover:border-primary"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2 pt-4">
                    <Label className="block text-center text-sm">Enter your own</Label>
                    <div className="flex justify-center">
                      <Input
                        value={customBusiness}
                        onChange={(e) => setCustomBusiness(e.target.value)}
                        className="h-12 max-w-md rounded-lg text-center"
                        placeholder=""
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6 pt-4">
                  <button
                    onClick={handleDoItLater}
                    className="text-base text-foreground hover:text-primary"
                  >
                    Do it later
                  </button>
                  <Button
                    onClick={handleNext}
                    className="h-12 rounded-lg px-12 text-base font-medium"
                    style={{ backgroundColor: "#FF8A00" }}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="mb-12 text-center text-3xl font-bold">
                Let&apos;s setup your dashboard
              </h2>

              <div className="mx-auto max-w-xl space-y-8">
                <div className="space-y-4">
                  <Label className="block text-center text-base">
                    What is your ad budget?
                  </Label>
                  <div className="relative mx-auto max-w-sm">
                    <Input
                      type="number"
                      value={adBudget}
                      onChange={(e) => setAdBudget(e.target.value)}
                      className="h-12 rounded-lg pr-8 text-right"
                      placeholder=""
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground">
                      $
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="block text-center text-base">
                    Do you have your ad creatives ready?
                  </Label>
                  <RadioGroup
                    value={adCreativesReady || ""}
                    onValueChange={(value) => setAdCreativesReady(value as "yes" | "no")}
                    className="flex justify-center gap-8"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="creatives-yes" />
                      <Label htmlFor="creatives-yes" className="cursor-pointer font-normal">
                        Yes
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="creatives-no" />
                      <Label htmlFor="creatives-no" className="cursor-pointer font-normal">
                        No
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex items-center justify-center gap-6 pt-4">
                  <button
                    onClick={handleDoItLater}
                    className="text-base text-foreground hover:text-primary"
                  >
                    Do it later
                  </button>
                  <Button
                    onClick={handleNext}
                    disabled={!adBudget || !adCreativesReady}
                    className="h-12 rounded-lg px-12 text-base font-medium"
                    style={{ backgroundColor: "#FF8A00" }}
                  >
                    Submit
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
