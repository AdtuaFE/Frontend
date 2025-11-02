import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Megaphone, Building, X } from "lucide-react";

const Onboarding = () => {
  const [showBanner, setShowBanner] = useState(true);
  const [selectedRole, setSelectedRole] = useState<"broadcaster" | "advertiser" | "both" | null>(null);
  const navigate = useNavigate();

  const handleRoleSelection = (role: "broadcaster" | "advertiser" | "both") => {
    setSelectedRole(role);
    console.log("Selected role:", role);
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
            <div className="h-full bg-primary w-1/3 transition-all" />
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
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
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
