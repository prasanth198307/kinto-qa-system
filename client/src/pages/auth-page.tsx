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
  // true when slug was auto-detected from the custom domain OR passed via ?tenant= — hide Company ID field
  const [slugAutoDetected, setSlugAutoDetected] = useState(!!prefilledSlug);

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
        if (!data) return;
        if (data.logoUrl) setTenantLogoUrl(data.logoUrl);
        if (data.name) setTenantDisplayName(data.name);
        // Auto-fill slug from the detected tenant — user doesn't need to type it
        if (data.slug) {
          setCompanySlug(data.slug);
          setSlugAutoDetected(true);
        }
      })
      .catch(() => {});
  }, []);

  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  if (user) return <Redirect to="/" />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    loginMutation.mutate({
      username: username.trim(),
      password,
      // If company slug is empty (e.g. super-admin portal), omit it — backend does global lookup
      ...(companySlug.trim() ? { tenantSlug: companySlug.trim().toLowerCase() } : {}),
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
      <div className="w-full lg:w-1/2 flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 space-y-3">
            {tenantLogoUrl ? (
              <div className="flex flex-col items-center gap-1">
                <img
                  src={tenantLogoUrl}
                  alt={tenantDisplayName ?? "Company Logo"}
                  className="h-14 w-auto object-contain max-w-[200px]"
                  data-testid="img-tenant-logo-auth"
                />
                {tenantDisplayName && (
                  <p className="text-sm font-medium text-foreground">{tenantDisplayName}</p>
                )}
              </div>
            ) : (
              <a href="/" aria-label="Back to home">
                <KintoLogo className="justify-center" variant="full" />
              </a>
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
                {/* Company ID — hidden when slug is auto-detected from the custom domain */}
                {!slugAutoDetected && (
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
                )}

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
                      autoFocus={slugAutoDetected}
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
                  <p className="text-sm text-destructive">
                    {companySlug.trim()
                      ? "Invalid company ID, username, or password. Please try again."
                      : "Invalid username or password. Please try again."}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending || !username.trim() || !password}
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
        </div>{/* end flex-1 center wrapper */}

        {/* Footer — copyright + powered by */}
        <div className="px-4 py-4 text-center border-t border-border">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} MicroGrid. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Powered by{" "}
            <a
              href="https://swacherp.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              SwachERP
            </a>
          </p>
        </div>
      </div>

      {/* Right side — Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-blue-700 flex-col items-center justify-center p-12 text-white">
        <div className="w-full max-w-lg">

          {/* Logo — original brand colours on the blue panel */}
          <div className="flex flex-col items-start mb-10">
            <img src="/swacherp-logo.png" alt="SwachERP" className="h-14 w-auto object-contain mb-1" />
            <span className="text-xs text-blue-200 font-medium">Cleaner Business. Better Future.</span>
          </div>

          {/* Headline */}
          <h2 className="text-4xl font-extrabold leading-tight mb-3">
            One platform.<br />Every operation.
          </h2>
          <p className="text-blue-100 text-sm mb-8 leading-relaxed">
            Built for Indian businesses — GST-ready, WhatsApp-connected,<br />30+ modules from operations to industry verticals.
          </p>

          {/* Module chips */}
          <div className="flex flex-wrap gap-2 mb-10">
            {[
              "Production Planning",
              "Inventory & Stock",
              "Purchase Orders",
              "GST Invoicing",
              "Dispatch & Gatepasses",
              "Quality Assurance",
              "Approval Workflows",
              "Double-Entry Accounting",
              "HR & Payroll",
              "Employee Self-Service",
              "Project Management",
              "Fixed Assets",
              "CRM",
              "WhatsApp Integration",
              "Healthcare",
              "Education",
              "Logistics",
              "Real Estate",
              "Retail / POS",
              "Agriculture",
            ].map((mod) => (
              <span
                key={mod}
                className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 rounded-full px-3 py-1 text-xs font-medium text-white"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
                {mod}
              </span>
            ))}
          </div>

          {/* Stat strip */}
          <div className="flex items-center gap-8 pt-6 border-t border-white/20">
            {[
              { value: "30+", label: "Modules" },
              { value: "GST", label: "Compliant" },
              { value: "100%", label: "Web-based" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-blue-200 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
