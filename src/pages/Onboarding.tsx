import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Megaphone, Building, X } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const Onboarding = () => {
  const [showBanner, setShowBanner] = useState(true);
  const [step, setStep] = useState<"role" | "type">("role");
  const [selectedRole, setSelectedRole] = useState<"broadcaster" | "advertiser" | "both" | null>(null);
  const [accountType, setAccountType] = useState<"business" | "individual" | null>(null);
  const navigate = useNavigate();

  const handleRoleSelection = (role: "broadcaster" | "advertiser" | "both") => {
    setSelectedRole(role);
    setStep("type");
  };

  const handleNext = () => {
    console.log("Selected role:", selectedRole, "Account type:", accountType);
    // Navigate to dashboard or next step
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
              style={{ width: step === "role" ? "33.33%" : "66.66%" }}
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
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
