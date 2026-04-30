import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Redirect, useLocation } from "wouter";
import { Loader2, Lock, Mail, Building2, ArrowLeft, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { KintoLogo } from "@/components/branding/KintoLogo";

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();

  const params = new URLSearchParams(location.split("?")[1] || "");
  const prefilledSlug = params.get("tenant") || "";

  const [companySlug, setCompanySlug] = useState(prefilledSlug);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [tenantLogoUrl, setTenantLogoUrl] = useState<string | null>(null);
  const [tenantDisplayName, setTenantDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem("session_expired") === "1") {
      sessionStorage.removeItem("session_expired");
      setSessionExpired(true);
    }
    // Show tenant branding only when accessed via their whitelisted custom domain
    const currentOrigin = window.location.origin;
    fetch(`/api/public/tenant-branding?origin=${encodeURIComponent(currentOrigin)}&_=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.logoUrl) setTenantLogoUrl(data.logoUrl);
        if (data?.name) setTenantDisplayName(data.name);
      })
      .catch(() => {});
  }, []);

  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  if (user) return <Redirect to="/" />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companySlug.trim() || !username.trim() || !password) return;
    loginMutation.mutate({
      username: username.trim(),
      password,
      tenantSlug: companySlug.trim().toLowerCase(),
    });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", {
        email: resetEmail,
        tenantSlug: companySlug.trim().toLowerCase() || undefined,
      });
      toast({ title: "Reset link sent", description: "Check your email for the password reset link." });
      setForgotPasswordOpen(false);
      setResetEmail("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send reset link.", variant: "destructive" });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 space-y-3">
            <a href="/" aria-label="Back to home">
              <KintoLogo className="justify-center" variant="full" />
            </a>
            {tenantLogoUrl && (
              <div className="flex flex-col items-center gap-2">
                <div className="h-px w-16 bg-border" />
                <img
                  src={tenantLogoUrl}
                  alt={tenantDisplayName ?? "Company Logo"}
                  className="h-10 w-auto object-contain max-w-[160px]"
                  data-testid="img-tenant-logo-auth"
                />
                {tenantDisplayName && (
                  <p className="text-sm font-medium text-foreground">{tenantDisplayName}</p>
                )}
              </div>
            )}
          </div>

          <a
            href="/"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            data-testid="link-back-home"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </a>

          {sessionExpired && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4" data-testid="banner-session-expired">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>Your session has expired. Please log in again to continue.</span>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Welcome Back</CardTitle>
              <CardDescription>Sign in to your company account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-login">
                <div className="space-y-2">
                  <Label htmlFor="company-slug">Company ID</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company-slug"
                      data-testid="input-company-slug"
                      type="text"
                      placeholder="e.g. acme-manufacturing"
                      className="pl-10"
                      value={companySlug}
                      onChange={(e) => setCompanySlug(e.target.value)}
                      autoComplete="organization"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username-input">Username or Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username-input"
                      data-testid="input-email"
                      type="text"
                      placeholder="your username or email"
                      className="pl-10"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password-input">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password-input"
                      data-testid="input-password"
                      type="password"
                      placeholder="Enter your password"
                      className="pl-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </div>

                {loginMutation.isError && (
                  <p className="text-sm text-destructive">Invalid company ID, username, or password. Please try again.</p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending || !companySlug.trim() || !username.trim() || !password}
                  data-testid="button-sign-in"
                >
                  {loginMutation.isPending
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>
                    : "Sign In"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground" data-testid="button-forgot-password">
                    Forgot your password?
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reset Password</DialogTitle>
                    <DialogDescription>
                      Enter your email address and we'll send you a reset link.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        data-testid="input-reset-email"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isResetting} data-testid="button-send-reset">
                      {isResetting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : "Send Reset Link"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              <p className="text-xs text-muted-foreground text-center">
                Don't have an account?{" "}
                <a href="/register-company" className="underline hover:text-foreground transition-colors">
                  Start free trial
                </a>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Right side — Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-blue-700 items-center justify-center p-12 text-white">
        <div className="max-w-lg">
          <h2 className="text-4xl font-bold mb-6">Complete Manufacturing Operations</h2>
          <p className="text-lg mb-8 text-blue-100">
            Manage your entire manufacturing operations from inventory to quality assurance. Handle
            production, materials, invoicing, gatepasses, and ensure product excellence — all in one system.
          </p>
          <div className="space-y-4">
            {[
              { title: "Operations Management", desc: "Handle production, inventory, purchase orders, invoicing, and gatepasses seamlessly" },
              { title: "Quality Assurance", desc: "Create checklists, track inspections, and manage preventive maintenance tasks" },
              { title: "Comprehensive Reporting", desc: "Generate printable reports for invoices, gatepasses, materials, and quality data" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="bg-white/20 p-2 rounded-md shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-blue-100">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
