import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/api/password-reset/request', { email });
    } catch {
      // BE always returns 200 regardless of whether email exists — show success either way
    } finally {
      setSent(true);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold mb-2">adtua</h1>
        <h2 className="text-3xl font-bold mb-2 mt-8">Reset your password</h2>
        <p className="text-muted-foreground mb-8">
          Enter your email and we'll send you a link to reset your password.
        </p>

        {sent ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-green-800">
            <p className="font-semibold">Check your inbox</p>
            <p className="mt-1 text-sm">
              If an account exists for <strong>{email}</strong>, a reset link has been sent.
            </p>
            <button
              onClick={() => navigate('/signin')}
              className="mt-4 text-sm font-medium text-green-700 underline"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-lg"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium rounded-lg"
              disabled={isLoading}
            >
              {isLoading ? "Sending…" : "Send reset link"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => navigate('/signin')}
                className="text-primary hover:underline font-medium"
              >
                Back to sign in
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
