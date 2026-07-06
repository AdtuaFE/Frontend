import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useNavigate } from "react-router-dom";
import { Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth, type User } from "@/context/AuthContext";
import { toast } from "sonner";

type Role = "advertiser" | "broadcaster" | "both";

const EyeIcon = ({ visible }: { visible: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {visible ? (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="2" y1="2" x2="22" y2="22" />
      </>
    ) : (
      <>
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);

const SignUp = () => {
  const [step, setStep] = useState<"email" | "otp" | "password" | "profile">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<Role>("advertiser");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post("/api/otp/send", { email });
      setStep("otp");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.post<{ otp_token: string }>("/api/otp/verify", { email, otp });
      setOtpToken(res.otp_token);
      setStep("password");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid or expired code");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("profile");
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const roles = role === "both" ? ["advertiser", "broadcaster"] : [role];
      const res = await api.post<{ user: User; token: string }>("/api/signup", {
        email,
        password,
        first_name: firstName,
        last_name: lastName || undefined,
        roles,
        otp_token: otpToken,
      });
      login(res.token, res.user);
      navigate("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    try {
      await api.post("/api/otp/send", { email });
      toast.success("Code resent");
    } catch {
      toast.error("Failed to resend code");
    }
  };

  const passwordValidation = useMemo(() => ({
    minLength: password.length >= 8,
    hasUpperAndLower: /[a-z]/.test(password) && /[A-Z]/.test(password),
    hasNumberOrSymbol: /[0-9!@#$%^&*(),.?":{}|<>]/.test(password),
    notContainsEmail: !password.toLowerCase().includes(email.toLowerCase().split("@")[0]),
    passwordsMatch: confirmPassword === "" || password === confirmPassword,
  }), [password, confirmPassword, email]);

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  const ValidationRule = ({ met, label }: { met: boolean; label: string }) => (
    <li className="flex items-start gap-2 text-sm">
      {met
        ? <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
        : <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />}
      <span className={met ? "text-green-600" : "text-muted-foreground"}>{label}</span>
    </li>
  );

  return (
    <div className="min-h-screen flex">
      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-background p-12 flex-col justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-12">adtua</h1>
          <div className="max-w-lg">
            <h2 className="text-5xl font-bold mb-8 leading-tight">
              The only tool you need to create winning ad campaigns
            </h2>
            <ul className="space-y-4 text-lg">
              <li className="flex items-start"><span className="mr-3">•</span><span>Free campaign creation with targeting options</span></li>
              <li className="flex items-start"><span className="mr-3">•</span><span>Connect with perfect broadcasting spaces</span></li>
              <li className="flex items-start"><span className="mr-3">•</span><span>Track performance with real-time analytics</span></li>
              <li className="flex items-start"><span className="mr-3">•</span><span>Control your budget with flexible options</span></li>
            </ul>
          </div>
        </div>
        <a href="#" className="text-sm text-muted-foreground hover:text-foreground underline">
          Terms of Service and Privacy Policy.
        </a>
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <h1 className="text-3xl font-bold">adtua</h1>
          </div>

          {step === "profile"
            ? <h2 className="text-3xl font-bold mb-8">Let's get to know you</h2>
            : <h2 className="text-3xl font-bold mb-8">Sign up to Adtua</h2>}

          {step === "email" && (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base text-muted-foreground">Email</Label>
                <Input id="email" type="email" placeholder="Enter your email ID"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-lg" required />
              </div>
              <Button type="submit" className="w-full h-12 text-base font-medium rounded-lg" disabled={isLoading}>
                {isLoading ? "Sending code…" : "Continue"}
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block w-full">
                    <Button type="button" variant="outline"
                      className="w-full h-12 text-base font-medium rounded-lg opacity-50 cursor-not-allowed pointer-events-none"
                      disabled tabIndex={-1}>
                      <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Sign up with Google
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Coming soon</TooltipContent>
              </Tooltip>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <p className="text-base text-muted-foreground mb-6">
                Enter the code sent to <strong>{email}</strong>
              </p>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={(v) => setOtp(v)}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} className="h-14 w-14 text-xl" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="text-center">
                <button type="button" onClick={handleResendEmail}
                  className="text-sm text-muted-foreground hover:text-foreground">
                  Resend email
                </button>
              </div>
              <Button type="submit" className="w-full h-12 text-base font-medium rounded-lg"
                disabled={isLoading || otp.length < 6}>
                {isLoading ? "Verifying…" : "Continue"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">Step 1 of 3</p>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base">New Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-lg pr-10" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <EyeIcon visible={showPassword} />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-base">Reenter Password</Label>
                <div className="relative">
                  <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 rounded-lg pr-10" required />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <EyeIcon visible={showConfirmPassword} />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-3">Create a password that:</p>
                <ul className="space-y-2">
                  <ValidationRule met={passwordValidation.minLength} label="contains at least 8 characters" />
                  <ValidationRule met={passwordValidation.hasUpperAndLower} label="contains both lower (a-z) and upper case letters (A-Z)" />
                  <ValidationRule met={passwordValidation.hasNumberOrSymbol} label="contains at least one number (0-9) or a symbol" />
                  <ValidationRule met={passwordValidation.notContainsEmail} label="does not contain your email address" />
                  <ValidationRule met={passwordValidation.passwordsMatch} label="passwords match" />
                </ul>
              </div>
              <Button type="submit" className="w-full h-12 text-base font-medium rounded-lg"
                disabled={!isPasswordValid || password !== confirmPassword}>
                Continue
              </Button>
              <p className="text-center text-sm text-muted-foreground">Step 2 of 3</p>
            </form>
          )}

          {step === "profile" && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-base">First Name</Label>
                <Input id="firstName" type="text" value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-12 rounded-lg" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-base">Last Name</Label>
                <Input id="lastName" type="text" value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-12 rounded-lg" />
              </div>
              <div className="space-y-3">
                <Label className="text-base">How will you use Adtua?</Label>
                <RadioGroup value={role} onValueChange={(v) => setRole(v as Role)} className="grid gap-3">
                  {[
                    { value: "advertiser", title: "Advertiser", desc: "I want to create campaigns and book ad space." },
                    { value: "broadcaster", title: "Broadcaster", desc: "I want to list spaces and manage incoming bookings." },
                    { value: "both", title: "Both", desc: "I need advertiser and broadcaster access." },
                  ].map((opt) => (
                    <Label key={opt.value} htmlFor={`role-${opt.value}`}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-input p-4 transition hover:border-[#ffb25c] hover:bg-[#fffaf3]">
                      <RadioGroupItem value={opt.value} id={`role-${opt.value}`} className="mt-1" />
                      <div>
                        <p className="font-medium">{opt.title}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{opt.desc}</p>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
              <Button type="submit" className="w-full h-12 text-base font-medium rounded-lg"
                disabled={isLoading || !firstName}>
                {isLoading ? "Creating account…" : "Create account"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">Step 3 of 3</p>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button onClick={() => navigate("/signin")}
              className="text-primary hover:underline font-medium">
              Sign in
            </button>
          </p>

          <div className="lg:hidden mt-8">
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground underline">
              Terms of Service and Privacy Policy.
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
