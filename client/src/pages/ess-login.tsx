import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, Building2, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function EssLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState({ tenantSlug: "", empCode: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const [autoTenant, setAutoTenant]   = useState<string | null>(null);
  const [brandName, setBrandName]     = useState<string | null>(null);
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  const [brandDetected, setBrandDetected] = useState(false);

  const empCodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/public/tenant-branding", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.tenantSlug) {
          setAutoTenant(data.tenantSlug);
          setBrandName(data.companyName || null);
          setBrandLogoUrl(data.logoUrl || null);
          setForm(p => ({ ...p, tenantSlug: data.tenantSlug }));
          setBrandDetected(true);
          setTimeout(() => empCodeRef.current?.focus(), 100);
        }
      })
      .catch(() => {});
  }, []);

  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleLogin = async (e: any) => {
    e.preventDefault();
    const slug = autoTenant || form.tenantSlug;
    if (!slug || !form.empCode || !form.password) {
      toast({ title: "All fields required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ess/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tenantSlug: slug, empCode: form.empCode, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Login failed", description: data.message, variant: "destructive" });
      } else {
        setLocation("/ess/portal");
      }
    } catch {
      toast({ title: "Network error", description: "Please try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          {brandLogoUrl ? (
            <img
              src={brandLogoUrl}
              alt={brandName || "Company logo"}
              className="h-14 mx-auto object-contain"
            />
          ) : (
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <User className="h-7 w-7 text-primary" />
            </div>
          )}
          <h1 className="text-2xl font-bold">
            {brandName ? `${brandName}` : "Employee Self-Service"}
          </h1>
          {brandName && (
            <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
              Employee Self-Service Portal
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            View payslips, apply for leave, and manage your tax declarations
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Sign In</CardTitle>
            <CardDescription>
              {brandDetected
                ? "Enter your employee credentials to continue"
                : "Enter your company ID and employee credentials"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Company ID — hidden when auto-detected from tenant URL */}
              {!brandDetected && (
                <div className="space-y-1.5">
                  <Label htmlFor="tenantSlug">Company ID</Label>
                  <div className="relative">
                    <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="tenantSlug"
                      className="pl-9 h-10"
                      placeholder="e.g. acme-manufacturing"
                      value={form.tenantSlug}
                      onChange={f("tenantSlug")}
                      autoComplete="organization"
                      autoFocus
                      data-testid="input-ess-tenant"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your company's unique identifier — ask your HR team if unsure
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="empCode">Employee Code</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="empCode"
                    ref={empCodeRef}
                    className="pl-9 h-10"
                    placeholder="e.g. EMP001"
                    value={form.empCode}
                    onChange={f("empCode")}
                    autoComplete="username"
                    autoFocus={!brandDetected ? undefined : false}
                    data-testid="input-ess-empcode"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    className="pl-9 pr-10 h-10"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={f("password")}
                    autoComplete="current-password"
                    data-testid="input-ess-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-10" disabled={loading} data-testid="btn-ess-login">
                {loading ? "Signing in..." : (
                  <span className="flex items-center gap-2">Sign In <ArrowRight className="h-4 w-4" /></span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Having trouble? Contact your HR administrator to set up or reset your ESS access.
        </p>
      </div>
    </div>
  );
}
