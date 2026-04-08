import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Redirect } from "wouter";
import { Loader2, Lock, Mail, Building2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { KintoLogo } from "@/components/branding/KintoLogo";

type Step = "email" | "company" | "password";

interface Company {
  tenantId: number;
  tenantName: string;
  tenantSlug: string;
  tenantPlan: string;
  tenantStatus: string;
}

const PLAN_LABEL: Record<string, string> = {
  trial: "Trial",
  basic: "Basic",
  professional: "Professional",
  enterprise: "Enterprise",
};

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("email");
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [password, setPassword] = useState("");
  const [isLooking, setIsLooking] = useState(false);

  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  if (user) return <Redirect to="/" />;

  // Step 1: Look up which companies this email/username belongs to
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername.trim()) return;
    setIsLooking(true);
    try {
      const res = await apiRequest("POST", "/api/auth/lookup-email", { emailOrUsername: emailOrUsername.trim() });
      const data = await res.json();
      const found: Company[] = data.companies ?? [];

      if (found.length === 0) {
        // No account found — go to password step anyway so we don't leak info
        setSelectedCompany(null);
        setStep("password");
      } else if (found.length === 1) {
        // Exactly one company — skip picker, go straight to password
        setSelectedCompany(found[0]);
        setStep("password");
      } else {
        // Multiple companies — show picker
        setCompanies(found);
        setStep("company");
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsLooking(false);
    }
  };

  // Step 2: User picked a company
  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company);
    setStep("password");
  };

  // Step 3: Submit password
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({
      username: emailOrUsername.trim(),
      password,
      tenantSlug: selectedCompany?.tenantSlug,
    });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", {
        email: resetEmail,
        tenantSlug: selectedCompany?.tenantSlug,
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

  const goBack = () => {
    if (step === "password") {
      if (companies.length > 1) {
        setStep("company");
      } else {
        setStep("email");
        setSelectedCompany(null);
      }
      setPassword("");
    } else if (step === "company") {
      setStep("email");
      setCompanies([]);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <KintoLogo className="justify-center" variant="full" />
          </div>

          <Card>
            {/* ── Step 1: Email ── */}
            {step === "email" && (
              <>
                <CardHeader>
                  <CardTitle>Welcome Back</CardTitle>
                  <CardDescription>Enter your email or username to continue</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleEmailSubmit} className="space-y-4" data-testid="form-email-step">
                    <div className="space-y-2">
                      <Label htmlFor="email-input">Email or Username</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email-input"
                          data-testid="input-email"
                          type="text"
                          placeholder="you@example.com"
                          className="pl-10"
                          value={emailOrUsername}
                          onChange={(e) => setEmailOrUsername(e.target.value)}
                          autoFocus
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLooking || !emailOrUsername.trim()} data-testid="button-continue">
                      {isLooking ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Looking up...</> : "Continue"}
                    </Button>
                  </form>
                </CardContent>
              </>
            )}

            {/* ── Step 2: Company Picker ── */}
            {step === "company" && (
              <>
                <CardHeader>
                  <button type="button" onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1 transition-colors" data-testid="button-back-to-email">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                  <CardTitle>Select Company</CardTitle>
                  <CardDescription>Your account is linked to multiple companies</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {companies.map((company) => (
                    <button
                      key={company.tenantSlug}
                      type="button"
                      data-testid={`button-company-${company.tenantSlug}`}
                      onClick={() => handleCompanySelect(company)}
                      className="w-full flex items-center justify-between rounded-md border px-4 py-3 text-left hover-elevate transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{company.tenantName}</p>
                          <p className="text-xs text-muted-foreground capitalize">{company.tenantStatus}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {PLAN_LABEL[company.tenantPlan] ?? company.tenantPlan}
                      </Badge>
                    </button>
                  ))}
                </CardContent>
              </>
            )}

            {/* ── Step 3: Password ── */}
            {step === "password" && (
              <>
                <CardHeader>
                  <button type="button" onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1 transition-colors" data-testid="button-back">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                  {selectedCompany ? (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{selectedCompany.tenantName}</span>
                        <Badge variant="secondary" className="text-xs">{PLAN_LABEL[selectedCompany.tenantPlan] ?? selectedCompany.tenantPlan}</Badge>
                      </div>
                      <CardTitle>Enter your password</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        Signing in as <span className="font-medium ml-1">{emailOrUsername}</span>
                      </CardDescription>
                    </>
                  ) : (
                    <>
                      <CardTitle>Enter your password</CardTitle>
                      <CardDescription>Signing in as <span className="font-medium">{emailOrUsername}</span></CardDescription>
                    </>
                  )}
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordSubmit} className="space-y-4" data-testid="form-password-step">
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
                          autoFocus
                          required
                        />
                      </div>
                    </div>
                    {loginMutation.isError && (
                      <p className="text-sm text-destructive">Invalid credentials. Please try again.</p>
                    )}
                    <Button type="submit" className="w-full" disabled={loginMutation.isPending || !password} data-testid="button-sign-in">
                      {loginMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : "Sign In"}
                    </Button>
                  </form>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" className="text-sm" data-testid="button-forgot-password">
                        Forgot your password?
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                          {selectedCompany
                            ? `We'll send a reset link to your email for ${selectedCompany.tenantName}.`
                            : "Enter your email and we'll send a reset link."}
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
                </CardFooter>
              </>
            )}
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
