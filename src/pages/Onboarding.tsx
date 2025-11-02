import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Megaphone, Building, X } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Onboarding = () => {
  const [showBanner, setShowBanner] = useState(true);
  const [step, setStep] = useState<"role" | "type" | "business">("role");
  const [selectedRole, setSelectedRole] = useState<"broadcaster" | "advertiser" | "both" | null>(null);
  const [accountType, setAccountType] = useState<"business" | "individual" | null>(null);
  const [businessTypes, setBusinessTypes] = useState<string[]>([]);
  const [customBusiness, setCustomBusiness] = useState("");
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
    } else {
      console.log("Onboarding complete:", { 
        selectedRole, 
        accountType, 
        businessTypes, 
        customBusiness 
      });
      // Navigate to dashboard or next step
      // navigate("/dashboard");
    }
  };

  const handleBusinessTypeToggle = (type: string) => {
    setBusinessTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleDoItLater = () => {
    console.log("Skipping business type selection");
    // Navigate to dashboard
    // navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
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

        {/* Progress Bar */}
        <div className="mb-12">
          <div className="h-1 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all" 
              style={{ 
                width: step === "role" ? "33.33%" : step === "type" ? "66.66%" : "100%" 
              }}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {step === "role" ? (
            <>
              <h2 className="text-3xl font-bold text-center mb-12">
                Welcome name, How do you want to primarily use Adtua?
              </h2>

              {/* Role Selection Cards */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Broadcaster Card */}
                <button
                  onClick={() => handleRoleSelection("broadcaster")}
                  className={`p-8 rounded-2xl border-2 transition-all text-center hover:border-primary ${
                    selectedRole === "broadcaster" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-full border-2 border-border flex items-center justify-center">
                      <Megaphone className="h-10 w-10" />
                    </div>
                    <h3 className="text-xl font-semibold">Broadcaster</h3>
                    <p className="text-sm text-muted-foreground">
                      You have a space that can show advertisements.
                    </p>
                  </div>
                </button>

                {/* Advertiser Card */}
                <button
                  onClick={() => handleRoleSelection("advertiser")}
                  className={`p-8 rounded-2xl border-2 transition-all text-center hover:border-primary ${
                    selectedRole === "advertiser" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-full border-2 border-border flex items-center justify-center">
                      <Building className="h-10 w-10" />
                    </div>
                    <h3 className="text-xl font-semibold">Advertiser</h3>
                    <p className="text-sm text-muted-foreground">
                      You are an individual or a company seeking to display advertisements.
                    </p>
                  </div>
                </button>
              </div>

              {/* Try Both Link */}
              <div className="text-center">
                <button
                  onClick={() => handleRoleSelection("both")}
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  I want to try both
                </button>
              </div>
            </>
          ) : step === "type" ? (
            <>
              <h2 className="text-3xl font-bold text-center mb-12">
                Let's setup your dashboard
              </h2>

              <div className="max-w-xl mx-auto space-y-8">
                <div className="space-y-4">
                  <Label className="text-base">
                    Are you a business or individual?<span className="text-destructive">*</span>
                  </Label>
                  
                  <RadioGroup 
                    value={accountType || ""} 
                    onValueChange={(value) => setAccountType(value as "business" | "individual")}
                    className="flex gap-8 justify-center"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="business" id="business" />
                      <Label htmlFor="business" className="font-normal cursor-pointer">
                        Business
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="individual" id="individual" />
                      <Label htmlFor="individual" className="font-normal cursor-pointer">
                        Individual
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={handleNext}
                    disabled={!accountType}
                    className="px-12 h-12 text-base font-medium rounded-lg"
                    style={{ backgroundColor: "#FF8A00" }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-center mb-12">
                Let's setup your dashboard
              </h2>

              <div className="max-w-3xl mx-auto space-y-8">
                <div className="space-y-4">
                  <h3 className="text-xl font-medium text-center">
                    What kind of business do you have?
                  </h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Select all that apply
                  </p>
                  
                  <div className="flex flex-wrap gap-3 justify-center pt-4">
                    {businessOptions.map((type) => (
                      <button
                        key={type}
                        onClick={() => handleBusinessTypeToggle(type)}
                        className={`px-6 py-2.5 rounded-full border text-sm font-medium transition-all ${
                          businessTypes.includes(type)
                            ? "bg-[#FFE5CC] border-[#FFE5CC] text-foreground"
                            : "bg-background border-border text-foreground hover:border-primary"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <div className="pt-4 space-y-2">
                    <Label className="text-sm text-center block">
                      Enter your own
                    </Label>
                    <div className="flex justify-center">
                      <Input
                        value={customBusiness}
                        onChange={(e) => setCustomBusiness(e.target.value)}
                        className="max-w-md h-12 rounded-lg text-center"
                        placeholder=""
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6 pt-4">
                  <button
                    onClick={handleDoItLater}
                    className="text-foreground hover:text-primary text-base"
                  >
                    Do it later
                  </button>
                  <Button
                    onClick={handleNext}
                    className="px-12 h-12 text-base font-medium rounded-lg"
                    style={{ backgroundColor: "#FF8A00" }}
                  >
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
