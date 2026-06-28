import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth, type User } from "@/context/AuthContext";
import { toast } from "sonner";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.post<{ user: User; token: string }>("/api/signin", { email, password });
      login(res.token, res.user);
      navigate("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
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

      {/* Right Side - Sign In Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <h1 className="text-3xl font-bold">adtua</h1>
          </div>

          <h2 className="text-3xl font-bold mb-8">Sign in to Adtua</h2>

          <form onSubmit={handleSignIn} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base text-muted-foreground">Email</Label>
              <Input id="email" type="email" placeholder="Enter your email ID"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-lg" required />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-base text-muted-foreground">Password</Label>
                <button type="button" onClick={() => navigate("/forgot-password")}
                  className="text-sm text-muted-foreground hover:text-foreground underline">
                  Forgot password?
                </button>
              </div>
              <Input id="password" type="password" placeholder="Enter your password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-lg" required />
            </div>

            <Button type="submit" className="w-full h-12 text-base font-medium rounded-lg" disabled={isLoading}>
              {isLoading ? "Signing in…" : "Sign in"}
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
                    Sign in with Google
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Coming soon</TooltipContent>
            </Tooltip>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <button onClick={() => navigate("/signup")}
              className="text-primary hover:underline font-medium">
              Sign up
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

export default SignIn;
