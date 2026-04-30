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
  // true when slug was auto-detected from the custom domain — hide Company ID field
  const [slugAutoDetected, setSlugAutoDetected] = useState(false);

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
        </div>{/* end flex-1 center wrapper */}

        {/* Footer — copyright + powered by */}
        <div className="px-4 py-4 text-center border-t border-border">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Inmoisture Pvt Ltd. All rights reserved.
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
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-blue-700 flex-col p-12 text-white">

        {/* SwachERP logo */}
        <div className="flex items-center gap-3 mb-8">
          <img
            src="/swacherp-logo.png"
            alt="SwachERP"
            className="h-12 w-auto object-contain brightness-0 invert"
          />
          <span className="text-white/80 text-sm font-medium tracking-wide">Cleaner Business. Better Future.</span>
        </div>

        {/* Heading */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Everything your factory needs</h2>
          <p className="text-sm text-blue-100">
            One platform for the entire manufacturing operation — from raw material to dispatch.
          </p>
        </div>

        {/* Module grid */}
        <div className="grid grid-cols-2 gap-2 flex-1">
          {[
            { icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", label: "Production" },
            { icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4", label: "Inventory" },
            { icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", label: "Purchase Orders" },
            { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", label: "GST Invoicing" },
            { icon: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1", label: "Gatepasses" },
            { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0", label: "Quality Assurance" },
            { icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z", label: "Preventive Maintenance" },
            { icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M12 7h.01M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-4M9 3a2 2 0 002 2h2a2 2 0 002-2M9 3a2 2 0 012-2h2a2 2 0 012 2", label: "Accounting" },
            { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", label: "HR & Payroll" },
            { icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", label: "Employee Self-Service" },
            { icon: "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z", label: "WhatsApp Integration" },
            { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", label: "MIS & Analytics" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 bg-white/10 rounded-md px-3 py-2">
              <svg className="w-4 h-4 shrink-0 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={item.icon} />
              </svg>
              <span className="text-xs font-medium text-white">{item.label}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
