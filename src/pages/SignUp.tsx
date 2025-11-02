import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useNavigate } from "react-router-dom";
import { Check, X } from "lucide-react";

const SignUp = () => {
  const [step, setStep] = useState<"email" | "otp" | "password">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === "email") {
      // Move to OTP step
      setStep("otp");
      console.log("Email signup:", email);
    } else if (step === "otp") {
      // Handle OTP verification and move to password step
      console.log("OTP verification:", otp);
      setStep("password");
    } else {
      // Handle password setup
      console.log("Password setup:", password);
      // Navigate to next step or dashboard
    }
  };

  const handleResendEmail = () => {
    console.log("Resending email to:", email);
    // Handle resend logic
  };

  // Common passwords list (simplified)
  const commonPasswords = [
    "password", "123456", "12345678", "qwerty", "abc123", "monkey", 
    "1234567", "letmein", "trustno1", "dragon", "baseball", "iloveyou"
  ];

  // Password validation rules
  const passwordValidation = useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasUpperAndLower: /[a-z]/.test(password) && /[A-Z]/.test(password),
      hasNumberOrSymbol: /[0-9!@#$%^&*(),.?":{}|<>]/.test(password),
      notContainsEmail: !password.toLowerCase().includes(email.toLowerCase().split('@')[0]),
      notCommon: !commonPasswords.some(common => password.toLowerCase().includes(common))
    };
  }, [password, email]);

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  const handleGoogleSignUp = () => {
    // Handle Google signup
    console.log("Google signup");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-background p-12 flex-col justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-12">adtua</h1>
          
          <div className="max-w-lg">
            <h2 className="text-5xl font-bold mb-8 leading-tight">
              The only tool you need to create winning ad campaigns
            </h2>
            
            <ul className="space-y-4 text-lg">
              <li className="flex items-start">
                <span className="mr-3">•</span>
                <span>Free campaign creation with targeting options</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3">•</span>
                <span>Connect with perfect broadcasting spaces</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3">•</span>
                <span>Track performance with real-time analytics</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3">•</span>
                <span>Control your budget with flexible options</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground underline">
            Terms of Service and Privacy Policy.
          </a>
        </div>
      </div>

      {/* Right Side - Sign Up Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <h1 className="text-3xl font-bold">adtua</h1>
          </div>

          <h2 className="text-3xl font-bold mb-8">Sign up to Adtua</h2>
          
          {step === "email" ? (
            <form onSubmit={handleContinue} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email ID"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-lg"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-medium rounded-lg"
              >
                Continue
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignUp}
                className="w-full h-12 text-base font-medium rounded-lg"
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign up with Google
              </Button>
            </form>
          ) : step === "otp" ? (
            <form onSubmit={handleContinue} className="space-y-6">
              <div className="space-y-2">
                <p className="text-base text-muted-foreground mb-6">
                  Enter the code sent to
                </p>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(value) => setOtp(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="h-14 w-14 text-xl" />
                      <InputOTPSlot index={1} className="h-14 w-14 text-xl" />
                      <InputOTPSlot index={2} className="h-14 w-14 text-xl" />
                      <InputOTPSlot index={3} className="h-14 w-14 text-xl" />
                      <InputOTPSlot index={4} className="h-14 w-14 text-xl" />
                      <InputOTPSlot index={5} className="h-14 w-14 text-xl" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendEmail}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Resend email
                </button>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-medium rounded-lg"
              >
                Continue
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Step 1 of 3
              </p>
            </form>
          ) : (
            <form onSubmit={handleContinue} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-lg pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {showPassword ? (
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
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-base">
                  Reenter Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 rounded-lg pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {showConfirmPassword ? (
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
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-3">Create a password that:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm">
                    {passwordValidation.minLength ? (
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    )}
                    <span className={passwordValidation.minLength ? "text-green-600" : "text-muted-foreground"}>
                      contains at least 8 characters
                    </span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    {passwordValidation.hasUpperAndLower ? (
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    )}
                    <span className={passwordValidation.hasUpperAndLower ? "text-green-600" : "text-muted-foreground"}>
                      contains both lower (a-z) and upper case letters (A-Z)
                    </span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    {passwordValidation.hasNumberOrSymbol ? (
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    )}
                    <span className={passwordValidation.hasNumberOrSymbol ? "text-green-600" : "text-muted-foreground"}>
                      contains at least one number (0-9) or a symbol
                    </span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    {passwordValidation.notContainsEmail ? (
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    )}
                    <span className={passwordValidation.notContainsEmail ? "text-green-600" : "text-muted-foreground"}>
                      does not contain your email address
                    </span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    {passwordValidation.notCommon ? (
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    )}
                    <span className={passwordValidation.notCommon ? "text-green-600" : "text-muted-foreground"}>
                      is not commonly used
                    </span>
                  </li>
                </ul>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-medium rounded-lg"
                disabled={!isPasswordValid || password !== confirmPassword}
              >
                Continue
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Step 2 of 3
              </p>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/signin")}
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </button>
          </p>

          {/* Mobile Terms */}
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
