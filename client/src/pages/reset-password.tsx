import { useState, useEffect } from "react";
import { useLocation, useRoute, Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, CheckCircle, XCircle, KeyRound } from "lucide-react";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/reset-password");
  const { toast } = useToast();
  
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get token from URL query params
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("token");
    if (urlToken) {
      setToken(urlToken);
    } else {
      setError("No reset token provided. Please use the link from your email.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/auth/reset-password", { 
        token, 
        password 
      });
      
      setIsSuccess(true);
      toast({
        title: "Password Reset Successful",
        description: "You can now log in with your new password.",
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        setLocation("/auth");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. The link may have expired.");
      toast({
        title: "Error",
        description: err.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Password Reset Complete</CardTitle>
            <CardDescription>
              Your password has been successfully reset. Redirecting to login...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setLocation("/auth")} data-testid="button-go-to-login">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state (no token)
  if (!token && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle>Invalid Reset Link</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setLocation("/auth")} data-testid="button-back-to-login">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                data-testid="input-new-password"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                data-testid="input-confirm-password"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" data-testid="text-error">
                {error}
              </p>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
              data-testid="button-reset-password"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>

            <div className="text-center">
              <Button 
                variant="ghost" 
                onClick={() => setLocation("/auth")}
                type="button"
                data-testid="link-back-to-login"
              >
                Back to Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
