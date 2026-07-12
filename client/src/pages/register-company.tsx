import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Building2, User, Mail, Phone, Lock, Globe, ArrowLeft,
  CheckCircle2, XCircle, AlertCircle, Package, Palette, Upload, ImageIcon, ChevronRight,
} from "lucide-react";
import { KintoLogo } from "@/components/branding/KintoLogo";
import { COUNTRY_TAX_PROFILES, getCountryProfile } from "@shared/country-tax-config";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type Step = "company" | "admin" | "modules" | "branding" | "success";
type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid";

// ─── Module picker data ───────────────────────────────────────────────────────
const FREE_SLUGS = new Set(["user_management", "roles", "company_settings", "dashboard"]);

const CATEGORY_ORDER = ["Finance", "Inventory", "Production", "HR", "Sales", "Industry"];

const CATEGORY_COLORS: Record<string, string> = {
  Finance:    "bg-blue-50 text-blue-700 border-blue-200",
  Inventory:  "bg-orange-50 text-orange-700 border-orange-200",
  Production: "bg-purple-50 text-purple-700 border-purple-200",
  HR:         "bg-rose-50 text-rose-700 border-rose-200",
  Sales:      "bg-teal-50 text-teal-700 border-teal-200",
  Industry:   "bg-indigo-50 text-indigo-700 border-indigo-200",
};

const INDUSTRIES = [
  { value: "restaurant",    label: "🍽️  Restaurant / F&B" },
  { value: "hotel",         label: "🏨  Hotel / Hospitality" },
  { value: "healthcare",    label: "🏥  Healthcare / Clinic" },
  { value: "pharmacy",      label: "💊  Pharmacy / Medical Store" },
  { value: "manufacturing", label: "🏭  Manufacturing / Production" },
  { value: "retail",        label: "🛒  Retail / POS" },
  { value: "logistics",     label: "🚚  Logistics & Transport" },
  { value: "real_estate",   label: "🏗️  Real Estate / Construction" },
  { value: "education",     label: "🎓  Education / School / College" },
  { value: "agriculture",   label: "🌾  Agriculture / Agri-business" },
  { value: "ngo",           label: "🤝  NGO / Non-Profit" },
  { value: "nidhi",         label: "🏦  Nidhi Company / Microfinance" },
  { value: "trading",       label: "📦  Trading / Distribution" },
  { value: "technology",    label: "💻  Technology / IT Services" },
  { value: "finance",       label: "💰  Finance / NBFC" },
  { value: "ecommerce",     label: "🛍️  E-Commerce" },
  { value: "general",       label: "🏢  General / Other" },
];

const PRESET_COLORS = [
  "#1a56db", "#0e9f6e", "#e3a008", "#e02424", "#7e3af2", "#0694a2", "#1c64f2", "#9061f9",
];

// ─── Right-panel content per step ────────────────────────────────────────────
type PanelConfig = { icon: React.FC<any>; heading: string; sub: string; bullets: string[] };
const RIGHT_PANEL: Record<Step, PanelConfig> = {
  company:  { icon: Building2,    heading: "14-Day Free Trial",   sub: "Full access to everything. No credit card required.", bullets: ["Set up in minutes", "Multi-tax ready from day one", "Invite your team instantly", "Cancel anytime — no lock-in"] },
  admin:    { icon: User,         heading: "You're almost there", sub: "Create your admin account to complete setup.",         bullets: ["You'll be the account owner", "Add more users after sign-in", "Role-based access control built in"] },
  modules:  { icon: Package,      heading: "Build your ERP",      sub: "Pick only what your business needs.",                  bullets: ["Core modules always free", "Each paid module billed monthly", "Add or remove any time", "14-day trial — nothing charged yet"] },
  branding: { icon: Palette,      heading: "Make it yours",       sub: "Add your logo and brand colours (optional).",          bullets: ["Logo appears on invoices & ESS portal", "Brand colour applied across the app", "Industry helps tailor your dashboard", "Custom domain CORS set automatically"] },
  success:  { icon: CheckCircle2, heading: "You're all set!",     sub: "Your company is ready. Sign in to get started.",       bullets: [] },
};

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: "company",  label: "Company"  },
  { key: "admin",    label: "Account"  },
  { key: "modules",  label: "Modules"  },
  { key: "branding", label: "Branding" },
];

export default function RegisterCompanyPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("company");
  const [isLoading, setIsLoading] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [country, setCountry] = useState("India");
  const taxProfile = getCountryProfile(country);

  const [form, setForm] = useState({
    companyName: "", slug: "", gstNumber: "", address: "", industry: "",
    adminName: "", email: "", password: "", confirmPassword: "", phone: "",
  });

  const [registeredData, setRegisteredData] = useState<{
    name: string; slug: string; username: string;
  } | null>(null);

  // Module selection
  const [selected, setSelected] = useState<Set<string>>(new Set(Array.from(FREE_SLUGS)));
  const [savingModules, setSavingModules] = useState(false);
  const [moduleTab, setModuleTab] = useState<"plan" | "custom">("plan");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Load plans from DB
  const { data: plansRaw = [] } = useQuery<any[]>({
    queryKey: ["/api/subscription-plans"],
  });
  const REGISTER_PLANS = plansRaw
    .filter((p: any) => !["trial", "gold_erp_plan", "humane", "expense"].includes(p.slug))
    .map((p: any) => ({
      slug: p.slug,
      name: p.name,
      priceMonthly: Math.round((p.priceMonthly ?? p.price_monthly ?? 0) / 100),
      modules: Array.isArray(p.modules) ? p.modules : [],
      features: Array.isArray(p.features) ? p.features : [],
      isFeatured: p.isFeatured ?? p.is_featured ?? false,
    }));

  // Load module catalog from DB — always fresh prices
  const { data: catalogRaw = [] } = useQuery<any[]>({
    queryKey: ["/api/public/module-catalog"],
  });
  const PICKER_MODULES = catalogRaw
    .filter((m: any) => !m.free)
    .map((m: any) => ({
      category: m.category ?? 'Other',
      slug: m.slug,
      name: m.name,
      price: Math.round((m.priceMonthly ?? 0) / 100),
      popular: m.popular ?? false,
    }));

  // Branding
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#1a56db");
  const [customDomain, setCustomDomain] = useState("");
  const [savingBranding, setSavingBranding] = useState(false);

  // ── Slug check ──────────────────────────────────────────────────────────────
  const checkSlug = (slug: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const slugRegex = /^[a-z0-9-]{3,50}$/;
    if (!slug || slug.length < 3) { setSlugStatus("idle"); return; }
    if (!slugRegex.test(slug)) { setSlugStatus("invalid"); return; }
    setSlugStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tenants/check-slug/${encodeURIComponent(slug)}`);
        const data = await res.json();
        setSlugStatus(data.available ? "available" : "taken");
      } catch { setSlugStatus("idle"); }
    }, 500);
  };

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === "companyName") {
        next.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
        checkSlug(next.slug);
      }
      if (field === "slug") checkSlug(value);
      return next;
    });
  };

  const suggestAlternative = () => {
    const base = form.slug.replace(/-\d+$/, "");
    const suggestion = `${base}-${Math.floor(100 + Math.random() * 900)}`.slice(0, 50);
    setForm(prev => ({ ...prev, slug: suggestion }));
    checkSlug(suggestion);
  };

  // ── Step handlers ───────────────────────────────────────────────────────────
  const handleCompanyStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim() || !form.slug.trim()) return;
    if (!form.industry) {
      toast({ title: "Please select your industry", description: "This helps us tailor your ERP dashboard.", variant: "destructive" });
      return;
    }
    if (!/^[a-z0-9-]{3,50}$/.test(form.slug)) {
      toast({ title: "Invalid company ID", description: "Use 3–50 chars: lowercase letters, numbers, hyphens only.", variant: "destructive" });
      return;
    }
    if (slugStatus === "taken") {
      toast({ title: "Company ID already taken", description: "Please choose a different Company ID.", variant: "destructive" });
      return;
    }
    setStep("admin");
  };

  const handleAdminStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (form.password.length < 8) {
      toast({ title: "Password too short", description: "At least 8 characters required.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const result = await apiRequest("POST", "/api/tenants/register", {
        companyName: form.companyName, slug: form.slug,
        adminName: form.adminName, email: form.email, password: form.password,
        phone: form.phone || undefined, gstNumber: form.gstNumber || undefined,
        address: form.address || undefined, country,
        industry: form.industry || undefined,
      });
      const data = await result.json();
      setRegisteredData({ name: data.tenant.name, slug: data.tenant.slug, username: data.username });
      setStep("modules");
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleModule = (slug: string) => {
    if (FREE_SLUGS.has(slug)) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  };

  const handleSaveModules = async (skip = false) => {
    setSavingModules(true);
    try {
      // Log in with the newly created credentials to get a session
      await apiRequest("POST", "/api/login", {
        tenantSlug: form.slug,
        username: registeredData?.username ?? form.email,
        password: form.password,
      });
      let slugs: string[];
      if (skip) {
        slugs = Array.from(FREE_SLUGS);
      } else if (moduleTab === "plan" && selectedPlan) {
        // Use plan modules + free modules
        const plan = REGISTER_PLANS.find(p => p.slug === selectedPlan);
        slugs = Array.from(new Set([...Array.from(FREE_SLUGS), ...(plan?.modules ?? [])]));
        // Also save the plan slug to subscription
        try {
          await apiRequest("POST", "/api/billing/select-plan", { planSlug: selectedPlan });
        } catch { /* non-fatal */ }
      } else {
        slugs = Array.from(selected);
      }
      await apiRequest("POST", "/api/billing/selected-modules", { selectedModules: slugs });
    } catch {
      // Non-fatal — modules can be configured later
    } finally {
      setSavingModules(false);
      setStep("branding");
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 5 MB.", variant: "destructive" });
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = async (skip = false) => {
    setSavingBranding(true);
    try {
      if (!skip) {
        // Upload logo if provided
        if (logoFile) {
          const fd = new FormData();
          fd.append("logo", logoFile);
          await fetch("/api/tenant/upload-logo", { method: "POST", body: fd });
        }
        // Save brand color (industry already saved at registration)
        if (primaryColor !== "#1a56db") {
          await apiRequest("PATCH", "/api/tenant/settings", { primaryColor });
        }
        // Save custom domain as additional CORS origin
        if (customDomain.trim()) {
          let origin = customDomain.trim();
          if (!origin.startsWith("http")) origin = `https://${origin}`;
          // Strip path, keep only origin
          try {
            origin = new URL(origin).origin;
          } catch { /* leave as-is */ }
          const defaultOrigin = `https://${form.slug}.swacherp.com`;
          await apiRequest("PUT", "/api/tenant/cors-origins", {
            corsOrigins: [defaultOrigin, origin],
          });
        }
      }
    } catch {
      // Non-fatal — branding can be updated later from Company Settings
    } finally {
      setSavingBranding(false);
      setStep("success");
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const paidSelected = PICKER_MODULES.filter(m => selected.has(m.slug));
  const monthlyTotal = paidSelected.reduce((s, m) => s + m.price, 0);
  const stepIdx = STEP_LABELS.findIndex(s => s.key === step);
  const panel = RIGHT_PANEL[step];
  const PanelIcon = panel.icon;

  // ── Success screen ───────────────────────────────────────────────────────────
  if (step === "success" && registeredData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-background">
        <div className="w-full max-w-md text-center space-y-6">
          <KintoLogo className="justify-center" variant="full" />
          <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/20 p-4 w-20 h-20 mx-auto flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">You're all set!</h2>
            <p className="text-muted-foreground text-sm">Your company account is ready. Sign in to start your 14-day free trial.</p>
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
                <span className="text-muted-foreground">Username</span>
                <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{registeredData.username}</code>
              </div>
              {paidSelected.length > 0 && (
                <>
                  <Separator />
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{paidSelected.length} module{paidSelected.length !== 1 ? "s" : ""} selected</span>
                    {" — "}trial free for 14 days, then ₹{monthlyTotal.toLocaleString("en-IN")}/mo
                  </div>
                </>
              )}
              <Separator />
              <p className="text-xs text-muted-foreground">14-day free trial has started. No credit card needed.</p>
            </CardContent>
          </Card>
          <Button className="w-full" onClick={() => {
            sessionStorage.setItem("selectedTenant", JSON.stringify({ name: registeredData.name, slug: registeredData.slug }));
            setLocation("/auth");
          }} data-testid="button-goto-login">
            Go to Sign In <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Main layout ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex">
      {/* Left — form panel */}
      <div className="w-full lg:w-3/5 flex items-start justify-center p-4 sm:p-8 bg-background overflow-y-auto">
        <div className="w-full max-w-lg py-6">
          <div className="text-center mb-6 relative">
            <a
              href="/"
              className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-register-back-home"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </a>
            <KintoLogo className="justify-center" variant="full" />
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-1 mb-6">
            {STEP_LABELS.map((s, i) => {
              const done   = i < stepIdx;
              const active = i === stepIdx;
              return (
                <div key={s.key} className="flex items-center gap-1 flex-1 min-w-0">
                  <div className={`flex items-center gap-1.5 text-xs whitespace-nowrap ${active ? "text-primary font-semibold" : done ? "text-emerald-600" : "text-muted-foreground"}`}>
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${active ? "bg-primary text-primary-foreground" : done ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    {s.label}
                  </div>
                  {i < STEP_LABELS.length - 1 && <div className="flex-1 h-px bg-border mx-1" />}
                </div>
              );
            })}
          </div>

          {/* ── Step 1: Company ─────────────────────────────────────────────── */}
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
                      <Input id="company-name" data-testid="input-company-name"
                        placeholder="e.g. Acme Manufacturing Pvt Ltd" className="pl-10"
                        value={form.companyName} onChange={update("companyName")} required autoFocus />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-slug">
                      Company ID <span className="ml-1 text-xs text-muted-foreground">(used to sign in)</span>
                    </Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="company-slug" data-testid="input-company-id"
                        placeholder="e.g. acme-manufacturing"
                        className={`pl-10 pr-10 font-mono text-sm ${
                          slugStatus === "available" ? "border-emerald-500 focus-visible:ring-emerald-500" :
                          slugStatus === "taken" || slugStatus === "invalid" ? "border-destructive focus-visible:ring-destructive" : ""
                        }`}
                        value={form.slug} onChange={update("slug")} pattern="[a-z0-9-]{3,50}" required />
                      <div className="absolute right-3 top-3">
                        {slugStatus === "checking"  && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        {slugStatus === "available" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        {slugStatus === "taken"     && <XCircle className="h-4 w-4 text-destructive" />}
                        {slugStatus === "invalid"   && <AlertCircle className="h-4 w-4 text-amber-500" />}
                      </div>
                    </div>
                    {slugStatus === "available" && <p className="text-xs text-emerald-600 font-medium">Company ID is available</p>}
                    {slugStatus === "taken" && (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-destructive">This Company ID is already taken.</p>
                        <button type="button" onClick={suggestAlternative} className="text-xs text-primary underline underline-offset-2 shrink-0" data-testid="button-suggest-slug">Suggest another</button>
                      </div>
                    )}
                    {slugStatus === "invalid" && <p className="text-xs text-amber-600">Lowercase letters, numbers, hyphens only (3–50 chars).</p>}
                    {(slugStatus === "idle" || slugStatus === "checking") && <p className="text-xs text-muted-foreground">Lowercase letters, numbers, hyphens only. 3–50 characters.</p>}
                  </div>

                  {/* Country selector */}
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger id="country" data-testid="select-country">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_TAX_PROFILES.map(p => (
                          <SelectItem key={p.country} value={p.country}>
                            {p.flag} {p.country} — {p.taxName} ({p.currency})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Industry / ERP vertical */}
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry / ERP Type</Label>
                    <Select value={form.industry} onValueChange={v => setForm(prev => ({ ...prev, industry: v }))}>
                      <SelectTrigger id="industry" data-testid="select-industry">
                        <SelectValue placeholder="Select your industry…" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map(ind => (
                          <SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Tailors your dashboard, modules, and tax settings.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="gst-number">
                        {taxProfile.taxNumberLabel}{" "}
                        <span className="text-muted-foreground text-xs">(optional)</span>
                      </Label>
                      <Input id="gst-number" data-testid="input-gst-number"
                        placeholder={taxProfile.taxNumberPlaceholder}
                        value={form.gstNumber} onChange={update("gstNumber")} />
                      {taxProfile.taxName && (
                        <p className="text-xs text-muted-foreground">
                          {taxProfile.taxName} @ {taxProfile.taxRate}% · {taxProfile.currency} ({taxProfile.currencySymbol})
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-address">Address <span className="text-muted-foreground text-xs">(optional)</span></Label>
                      <Input id="company-address" data-testid="input-company-address" placeholder="City, State"
                        value={form.address} onChange={update("address")} />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" data-testid="button-next-step">
                    Continue <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ── Step 2: Admin account ──────────────────────────────────────── */}
          {step === "admin" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setStep("company")} className="text-muted-foreground hover:text-foreground" data-testid="button-back-step">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <CardTitle>Admin Account</CardTitle>
                    <CardDescription>Create your administrator account for {form.companyName}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAdminStep} className="space-y-4" data-testid="form-admin-details">
                  <div className="space-y-2">
                    <Label htmlFor="admin-name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="admin-name" data-testid="input-admin-name" placeholder="Your full name"
                        className="pl-10" value={form.adminName} onChange={update("adminName")} required autoFocus />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="admin-email" data-testid="input-admin-email" type="email" placeholder="admin@company.com"
                        className="pl-10" value={form.email} onChange={update("email")} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-phone">Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="admin-phone" data-testid="input-admin-phone" type="tel" placeholder={`${taxProfile.phoneCode} ...`}
                        className="pl-10" value={form.phone} onChange={update("phone")} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="admin-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input id="admin-password" data-testid="input-admin-password" type="password"
                          placeholder="Min. 8 chars" className="pl-10" value={form.password}
                          onChange={update("password")} required minLength={8} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input id="confirm-password" data-testid="input-confirm-password" type="password"
                          placeholder="Repeat password" className="pl-10" value={form.confirmPassword}
                          onChange={update("confirmPassword")} required />
                      </div>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-register">
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account…</> : <>Continue <ChevronRight className="h-4 w-4 ml-1" /></>}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ── Step 3: Module picker ──────────────────────────────────────── */}
          {step === "modules" && (
            <div className="space-y-4">
              {/* Always free banner */}
              <div className="flex items-start gap-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Always free — no selection needed</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">Dashboard, User Management, Roles & Permissions, Company Settings</p>
                </div>
              </div>

              <Tabs value={moduleTab} onValueChange={v => setModuleTab(v as "plan" | "custom")}>
                <TabsList className="w-full">
                  <TabsTrigger value="plan" className="flex-1" data-testid="tab-choose-plan">Choose a Plan</TabsTrigger>
                  <TabsTrigger value="custom" className="flex-1" data-testid="tab-build-own">Build Your Own</TabsTrigger>
                </TabsList>

                {/* ── Tab 1: Plan picker ── */}
                <TabsContent value="plan" className="mt-3">
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Pick a bundle — get a set of modules at a fixed monthly price.</p>
                    {REGISTER_PLANS.map(plan => {
                      const isSelected = selectedPlan === plan.slug;
                      return (
                        <button key={plan.slug} type="button" onClick={() => setSelectedPlan(plan.slug)}
                          data-testid={`plan-pick-${plan.slug}`}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/10" : "border-border bg-card hover:border-muted-foreground/30"}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{plan.name}</span>
                                {plan.isFeatured && <span className="text-[9px] font-bold bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full">Popular</span>}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {plan.modules.slice(0, 6).map((m: string) => (
                                  <span key={m} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{m.replace(/_/g, ' ')}</span>
                                ))}
                                {plan.modules.length > 6 && <span className="text-[10px] text-muted-foreground">+{plan.modules.length - 6} more</span>}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="flex items-center gap-1">
                                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                                  {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                                </div>
                              </div>
                              <p className="text-sm font-bold mt-1">{plan.priceMonthly > 0 ? `₹${plan.priceMonthly.toLocaleString("en-IN")}` : "Free"}</p>
                              {plan.priceMonthly > 0 && <p className="text-[10px] text-muted-foreground">/mo after trial</p>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* ── Tab 2: Module picker ── */}
                <TabsContent value="custom" className="mt-3">
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Pick only what you need. Pay per module, cancel anytime.</p>
                    {CATEGORY_ORDER.map(cat => {
                      const mods = PICKER_MODULES.filter(m => m.category === cat);
                      if (!mods.length) return null;
                      const colors = CATEGORY_COLORS[cat] ?? "bg-muted text-muted-foreground border-border";
                      return (
                        <div key={cat}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colors}`}>{cat}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {mods.map(mod => {
                              const isOn = selected.has(mod.slug);
                              return (
                                <button key={mod.slug} type="button" onClick={() => toggleModule(mod.slug)}
                                  data-testid={`module-pick-${mod.slug}`}
                                  className={`relative text-left p-3 rounded-xl border-2 transition-all ${isOn ? "border-primary bg-primary/5 ring-1 ring-primary/10" : "border-border bg-card hover:border-muted-foreground/30"}`}>
                                  {mod.popular && <span className="absolute -top-2 right-2 text-[9px] font-bold bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full">Popular</span>}
                                  <div className="flex items-start justify-between gap-1">
                                    <span className="text-xs font-semibold text-foreground leading-tight pr-1">{mod.name}</span>
                                    <div className={`h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center mt-0.5 ${isOn ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                                      {isOn && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                                    </div>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">₹{mod.price}<span className="text-[10px]">/mo</span></p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>

              <Card>
                <CardContent className="pt-4 space-y-3">
                  {moduleTab === "plan" ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {selectedPlan ? `${REGISTER_PLANS.find(p => p.slug === selectedPlan)?.name ?? selectedPlan} plan selected` : "No plan selected yet"}
                      </span>
                      <div className="text-right">
                        <span className="font-bold text-lg">
                          {selectedPlan ? (REGISTER_PLANS.find(p => p.slug === selectedPlan)?.priceMonthly ?? 0) > 0
                            ? `₹${(REGISTER_PLANS.find(p => p.slug === selectedPlan)?.priceMonthly ?? 0).toLocaleString("en-IN")}`
                            : "Free"
                          : "₹0"}
                        </span>
                        <span className="text-xs text-muted-foreground">/mo after trial</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{paidSelected.length} paid module{paidSelected.length !== 1 ? "s" : ""} selected</span>
                      <div className="text-right">
                        <span className="font-bold text-lg">{monthlyTotal > 0 ? `₹${monthlyTotal.toLocaleString("en-IN")}` : "₹0"}</span>
                        <span className="text-xs text-muted-foreground">/mo after trial</span>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">14-day trial is completely free. You won't be charged until your trial ends.</p>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => handleSaveModules(true)} disabled={savingModules} data-testid="button-skip-modules">Skip for now</Button>
                    <Button className="flex-1" onClick={() => handleSaveModules(false)}
                      disabled={savingModules || (moduleTab === "plan" && !selectedPlan)}
                      data-testid="button-confirm-modules">
                      {savingModules ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : <>Continue <ChevronRight className="h-4 w-4 ml-1" /></>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Step 4: Branding ───────────────────────────────────────────── */}
          {step === "branding" && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Brand your workspace</CardTitle>
                  <CardDescription>All fields are optional — you can always update these later in Company Settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">

                  {/* Logo upload */}
                  <div className="space-y-2">
                    <Label>Company Logo <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <div
                      className="border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => logoInputRef.current?.click()}
                      data-testid="logo-upload-zone"
                    >
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo preview" className="max-h-20 max-w-full object-contain rounded" />
                      ) : (
                        <>
                          <div className="rounded-full bg-muted p-3">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium">Click to upload logo</p>
                            <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, SVG · Max 5 MB</p>
                          </div>
                        </>
                      )}
                      <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                        onChange={handleLogoChange} data-testid="input-logo-file" />
                    </div>
                    {logoPreview && (
                      <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                        className="text-xs text-destructive underline underline-offset-2">
                        Remove logo
                      </button>
                    )}
                  </div>

                  {/* Primary colour */}
                  <div className="space-y-2">
                    <Label>Brand Colour <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <div className="flex items-center gap-3 flex-wrap">
                      {PRESET_COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setPrimaryColor(c)}
                          data-testid={`color-preset-${c.replace("#", "")}`}
                          className={`w-7 h-7 rounded-full border-2 transition-all ${primaryColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                          style={{ backgroundColor: c }} />
                      ))}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-xs text-muted-foreground">Custom:</span>
                        <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border border-border" data-testid="input-brand-color" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: primaryColor }} />
                      <span className="text-xs font-mono text-muted-foreground">{primaryColor}</span>
                    </div>
                  </div>

                  {/* Industry — read-only, set in Step 1 */}
                  {form.industry && (
                    <div className="space-y-1.5">
                      <Label>Industry</Label>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/40 text-sm">
                        {INDUSTRIES.find(i => i.value === form.industry)?.label ?? form.industry}
                        <span className="ml-auto text-xs text-muted-foreground">Set in step 1</span>
                      </div>
                    </div>
                  )}

                  {/* Custom domain */}
                  <div className="space-y-2">
                    <Label htmlFor="custom-domain">
                      Custom Domain <span className="text-muted-foreground text-xs">(optional)</span>
                    </Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="custom-domain" data-testid="input-custom-domain"
                        placeholder="e.g. erp.yourcompany.com"
                        className="pl-10"
                        value={customDomain}
                        onChange={e => setCustomDomain(e.target.value)} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      If you'll access SwachERP from a custom domain, add it here — it will be whitelisted automatically. Your default URL <code className="font-mono bg-muted px-1 rounded text-[10px]">https://{form.slug}.swacherp.com</code> is already saved.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => handleSaveBranding(true)} disabled={savingBranding} data-testid="button-skip-branding">
                  Skip for now
                </Button>
                <Button className="flex-1" onClick={() => handleSaveBranding(false)} disabled={savingBranding} data-testid="button-save-branding">
                  {savingBranding
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</>
                    : <><Upload className="h-4 w-4 mr-1.5" />Save &amp; Finish</>
                  }
                </Button>
              </div>
            </div>
          )}

          <div className="mt-5 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <button type="button" className="text-primary underline underline-offset-4 hover:no-underline"
                onClick={() => setLocation("/company")} data-testid="link-goto-login">
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right — info panel */}
      <div className="hidden lg:flex lg:w-2/5 bg-primary flex-col items-center justify-center p-12 text-primary-foreground sticky top-0 h-screen">
        <div className="max-w-xs text-center space-y-6">
          <div className="rounded-full bg-white/10 p-5 w-20 h-20 mx-auto flex items-center justify-center">
            <PanelIcon className="h-10 w-10 opacity-90" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">{panel.heading}</h2>
            <p className="text-sm opacity-75 leading-relaxed">{panel.sub}</p>
          </div>
          {panel.bullets.length > 0 && (
            <div className="space-y-2.5 text-left">
              {panel.bullets.map(b => (
                <div key={b} className="flex items-center gap-2 text-sm opacity-80">
                  <CheckCircle2 className="h-4 w-4 shrink-0 opacity-70" />{b}
                </div>
              ))}
            </div>
          )}
          {step === "modules" && monthlyTotal > 0 && (
            <div className="bg-white/10 rounded-2xl p-4 text-left space-y-1.5 mt-4">
              <p className="text-xs font-semibold opacity-60 uppercase tracking-wider mb-2">Your selection</p>
              {paidSelected.map(m => (
                <div key={m.slug} className="flex justify-between text-xs opacity-80">
                  <span>{m.name}</span><span>₹{m.price}/mo</span>
                </div>
              ))}
              <Separator className="bg-white/20 my-2" />
              <div className="flex justify-between text-sm font-bold">
                <span>Total after trial</span><span>₹{monthlyTotal.toLocaleString("en-IN")}/mo</span>
              </div>
            </div>
          )}
          {step === "branding" && (
            <div className="bg-white/10 rounded-2xl p-4 text-left mt-4 space-y-3">
              <p className="text-xs font-semibold opacity-60 uppercase tracking-wider">Preview</p>
              <div className="flex items-center gap-3">
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" className="w-10 h-10 rounded-lg object-contain bg-white/20 p-1" />
                  : <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-sm font-bold">{form.companyName[0] ?? "?"}</div>
                }
                <div>
                  <p className="text-sm font-semibold">{form.companyName || "Your Company"}</p>
                  <p className="text-xs opacity-60">{INDUSTRIES.find(i => i.value === form.industry)?.label ?? "Industry not set"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs opacity-70">
                <div className="w-4 h-4 rounded-full border-2 border-white/50" style={{ backgroundColor: primaryColor }} />
                Brand colour: <span className="font-mono">{primaryColor}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
