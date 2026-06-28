import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

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

const ResetPassword = () => {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const validation = useMemo(() => ({
    minLength: password.length >= 8,
    hasUpperAndLower: /[a-z]/.test(password) && /[A-Z]/.test(password),
    hasNumberOrSymbol: /[0-9!@#$%^&*(),.?":{}|<>]/.test(password),
    passwordsMatch: confirmPassword === "" || password === confirmPassword,
  }), [password, confirmPassword]);

  const isValid = Object.values(validation).every(Boolean) && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsLoading(true);
    try {
      await api.post('/api/password-reset/reset', { token, new_password: password });
      setDone(true);
      setTimeout(() => navigate('/signin'), 2500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reset link is invalid or expired');
    } finally {
      setIsLoading(false);
    }
  };

  const Rule = ({ met, label }: { met: boolean; label: string }) => (
    <li className="flex items-start gap-2 text-sm">
      {met
        ? <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
        : <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />}
      <span className={met ? "text-green-600" : "text-muted-foreground"}>{label}</span>
    </li>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold mb-8">adtua</h1>
        <h2 className="text-3xl font-bold mb-8">Set a new password</h2>

        {done ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-green-800">
            <p className="font-semibold">Password updated</p>
            <p className="mt-1 text-sm">Redirecting you to sign in…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-lg pr-10"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-base">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 rounded-lg pr-10"
                  required
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <EyeIcon visible={showConfirm} />
                </button>
              </div>
            </div>

            <ul className="space-y-2">
              <Rule met={validation.minLength} label="At least 8 characters" />
              <Rule met={validation.hasUpperAndLower} label="Upper and lower case letters" />
              <Rule met={validation.hasNumberOrSymbol} label="At least one number or symbol" />
              <Rule met={validation.passwordsMatch} label="Passwords match" />
            </ul>

            <Button type="submit" className="w-full h-12 text-base font-medium rounded-lg"
              disabled={!isValid || isLoading}>
              {isLoading ? "Saving…" : "Set new password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
