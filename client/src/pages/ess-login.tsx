import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, Building2, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { KintoLogo } from "@/components/branding/KintoLogo";

export default function EssLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState({ tenantSlug: "", empCode: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const [autoTenant, setAutoTenant]     = useState<string | null>(null);
  const [brandName, setBrandName]       = useState<string | null>(null);
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  const [brandDetected, setBrandDetected] = useState(false);

  const empCodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const currentOrigin = window.location.origin;
    fetch(
      `/api/public/tenant-branding?origin=${encodeURIComponent(currentOrigin)}&_=${Date.now()}`,
      { cache: "no-store" }
    )
      .then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); })
      .then(data => {
        if (!data) return;
        if (data.logoUrl) setBrandLogoUrl(data.logoUrl);
        if (data.name)    setBrandName(data.name);
        if (data.slug) {
          setAutoTenant(data.slug);
          setForm(p => ({ ...p, tenantSlug: data.slug }));
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-muted/30">
      {/* Top-left logo strip — only shown when no tenant branding */}
      {!brandDetected && (
        <div className="px-6 pt-5 pb-2">
          <KintoLogo variant="full" className="justify-start" />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">

          {/* Header */}
          <div className="text-center space-y-2">
            {brandLogoUrl ? (
              <img
                src={brandLogoUrl}
                alt={brandName || "Company logo"}
                className="h-14 mx-auto object-contain"
                data-testid="img-ess-tenant-logo"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <User className="h-7 w-7 text-primary" />
              </div>
            )}

            <h1 className="text-2xl font-bold">
              Employee Self-Service
            </h1>
            {brandName && (
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                {brandName}
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
                        className="pl-9"
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
                      className="pl-9"
                      placeholder="e.g. EMP001"
                      value={form.empCode}
                      onChange={f("empCode")}
                      autoComplete="username"
                      data-testid="input-ess-empcode"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="essPassword">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="essPassword"
                      type={showPw ? "text" : "password"}
                      className="pl-9 pr-10"
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

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                  data-testid="btn-ess-login"
                >
                  {loading ? "Signing in..." : (
                    <span className="flex items-center gap-2">
                      Sign In <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter>
              <p className="text-xs text-muted-foreground text-center w-full">
                Having trouble? Contact your HR administrator to set up or reset your ESS access.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Footer — copyright + powered by (matches main auth page) */}
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
  );
}
