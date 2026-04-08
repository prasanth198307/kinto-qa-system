import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Building2, User, Mail, Phone, Lock, Globe, ArrowLeft, CheckCircle2 } from "lucide-react";
import { KintoLogo } from "@/components/branding/KintoLogo";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Step = "company" | "admin" | "success";

export default function RegisterCompanyPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("company");
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    companyName: "",
    slug: "",
    gstNumber: "",
    address: "",
    adminName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });

  const [registeredData, setRegisteredData] = useState<{ name: string; slug: string; username: string } | null>(null);

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-generate slug from company name
      if (field === "companyName") {
        next.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
      }
      return next;
    });
  };

  const handleCompanyStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim() || !form.slug.trim()) return;
    const slugRegex = /^[a-z0-9-]{3,50}$/;
    if (!slugRegex.test(form.slug)) {
      toast({ title: "Invalid company ID", description: "Use 3-50 characters: lowercase letters, numbers, hyphens only.", variant: "destructive" });
      return;
    }
    setStep("admin");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please check your password entries.", variant: "destructive" });
      return;
    }
    if (form.password.length < 8) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiRequest("POST", "/api/tenants/register", {
        companyName: form.companyName,
        slug: form.slug,
        adminName: form.adminName,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        gstNumber: form.gstNumber || undefined,
        address: form.address || undefined,
      });
      const data = await result.json();
      setRegisteredData({ name: data.tenant.name, slug: data.tenant.slug, username: data.username });
      setStep("success");
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "success" && registeredData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md text-center space-y-6">
          <KintoLogo className="justify-center" variant="full" />
          <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-4 w-20 h-20 mx-auto flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Registration Successful!</h2>
            <p className="text-muted-foreground">
              Welcome to Kinto Smart Ops. Your company account has been created.
            </p>
          </div>
          <Card>
            <CardContent className="pt-6 space-y-3 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Company</span>
                <span className="font-medium">{registeredData.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Company ID</span>
                <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{registeredData.slug}</code>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your username</span>
                <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{registeredData.username}</code>
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">
                Your 14-day free trial has started. You can sign in using your Company ID and the credentials above.
              </p>
            </CardContent>
          </Card>
          <Button
            className="w-full"
            onClick={() => {
              sessionStorage.setItem("selectedTenant", JSON.stringify({ name: registeredData.name, slug: registeredData.slug }));
              setLocation("/auth");
            }}
            data-testid="button-goto-login"
          >
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <KintoLogo className="justify-center" variant="full" />
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex items-center gap-2 text-sm ${step === "company" ? "text-primary font-medium" : "text-muted-foreground"}`}>
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step === "company" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                1
              </div>
              Company Details
            </div>
            <div className="flex-1 h-px bg-border" />
            <div className={`flex items-center gap-2 text-sm ${step === "admin" ? "text-primary font-medium" : "text-muted-foreground"}`}>
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step === "admin" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                2
              </div>
              Admin Account
            </div>
          </div>

          {step === "company" && (
            <Card>
              <CardHeader>
                <CardTitle>Register Your Company</CardTitle>
                <CardDescription>Start your 14-day free trial. No credit card required.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCompanyStep} className="space-y-4" data-testid="form-company-details">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="company-name"
                        data-testid="input-company-name"
                        placeholder="e.g. Acme Manufacturing Pvt Ltd"
                        className="pl-10"
                        value={form.companyName}
                        onChange={update("companyName")}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-slug">
                      Company ID
                      <span className="ml-1 text-xs text-muted-foreground">(used in your login URL)</span>
                    </Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="company-slug"
                        data-testid="input-company-id"
                        placeholder="e.g. acme-manufacturing"
                        className="pl-10 font-mono text-sm"
                        value={form.slug}
                        onChange={update("slug")}
                        pattern="[a-z0-9-]{3,50}"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Lowercase letters, numbers, and hyphens only. 3-50 characters.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gst-number">GST Number <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input
                      id="gst-number"
                      data-testid="input-gst-number"
                      placeholder="22AAAAA0000A1Z5"
                      value={form.gstNumber}
                      onChange={update("gstNumber")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-address">Address <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input
                      id="company-address"
                      data-testid="input-company-address"
                      placeholder="Company address"
                      value={form.address}
                      onChange={update("address")}
                    />
                  </div>

                  <Button type="submit" className="w-full" data-testid="button-next-step">
                    Continue to Admin Setup
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {step === "admin" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep("company")}
                    className="text-muted-foreground hover:text-foreground"
                    data-testid="button-back-step"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <CardTitle>Admin Account</CardTitle>
                    <CardDescription>Create your administrator account for {form.companyName}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-admin-details">
                  <div className="space-y-2">
                    <Label htmlFor="admin-name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="admin-name"
                        data-testid="input-admin-name"
                        placeholder="Your full name"
                        className="pl-10"
                        value={form.adminName}
                        onChange={update("adminName")}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="admin-email"
                        data-testid="input-admin-email"
                        type="email"
                        placeholder="admin@company.com"
                        className="pl-10"
                        value={form.email}
                        onChange={update("email")}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-phone">Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="admin-phone"
                        data-testid="input-admin-phone"
                        type="tel"
                        placeholder="+91 98765 43210"
                        className="pl-10"
                        value={form.phone}
                        onChange={update("phone")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="admin-password"
                        data-testid="input-admin-password"
                        type="password"
                        placeholder="Min. 8 characters"
                        className="pl-10"
                        value={form.password}
                        onChange={update("password")}
                        required
                        minLength={8}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        data-testid="input-confirm-password"
                        type="password"
                        placeholder="Repeat your password"
                        className="pl-10"
                        value={form.confirmPassword}
                        onChange={update("confirmPassword")}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-register">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      "Create Account & Start Trial"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                className="text-primary underline underline-offset-4 hover:no-underline"
                onClick={() => setLocation("/company")}
                data-testid="link-goto-login"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center p-12 text-primary-foreground">
        <div className="max-w-md text-center space-y-6">
          <Building2 className="mx-auto h-16 w-16 opacity-80" />
          <h2 className="text-3xl font-bold">14-Day Free Trial</h2>
          <p className="text-lg opacity-80 leading-relaxed">
            Get full access to all features. No credit card required. Set up your company in minutes and start managing operations right away.
          </p>
          <div className="space-y-3 text-left">
            {[
              "Up to 5 users during trial",
              "Full GST-compliant invoicing",
              "BOM-driven production tracking",
              "Double-entry accounting",
              "WhatsApp checklist integration",
              "MIS analytics dashboards",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm opacity-80">
                <CheckCircle2 className="h-4 w-4 shrink-0 opacity-70" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
