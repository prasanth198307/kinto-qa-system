import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SuperAdminLayout from "./super-admin-layout";
import {
  CheckCircle2, ChevronRight, Store, Building2, Users, Package,
  ArrowLeft, Loader2, Eye, EyeOff, AlertCircle, Sparkles, ShieldCheck,
} from "lucide-react";

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

// ── Grocery module presets ─────────────────────────────────────────────────────
const ALL_MODULES: { key: string; label: string; desc: string; preset: boolean }[] = [
  { key: "invoicing",       label: "Invoicing & GST",          desc: "GST bills, payments, credit notes",                           preset: true  },
  { key: "pos",             label: "POS / Retail Terminal",     desc: "Touchscreen POS, split payments, parked bills, Z-report",     preset: true  },
  { key: "purchase_orders", label: "Purchase Orders",           desc: "POs, vendor management, GRN approval workflow",               preset: true  },
  { key: "basic_inventory", label: "Inventory Management",      desc: "Products, stock, UOM, serial/lot, expiry, bulk import",       preset: true  },
  { key: "sales_orders",    label: "Sales Orders",              desc: "Pre-invoice sales order management",                          preset: true  },
  { key: "gatepasses",      label: "Gatepasses & Dispatch",     desc: "Delivery challans, dispatch tracking",                        preset: true  },
  { key: "accounting",      label: "Accounting & Ledger",       desc: "Double-entry, COA, P&L, balance sheet",                      preset: true  },
  { key: "expenses",        label: "Expenses & Cash Register",  desc: "Expense vouchers, daily cash register",                      preset: true  },
  { key: "mis",             label: "MIS Analytics",             desc: "Executive dashboards and KPI analytics",                     preset: true  },
  { key: "crm",             label: "CRM",                       desc: "Customer management, loyalty cards, pipeline",               preset: true  },
  { key: "hr_payroll",      label: "HR & Payroll",              desc: "Employees, attendance, salary, ESS portal",                  preset: true  },
  { key: "quality_returns", label: "Quality & Returns",         desc: "Sales returns, quality inspection",                          preset: true  },
  { key: "documents",       label: "Document Management",       desc: "Contracts, certificates, expiry alerts",                     preset: false },
  { key: "whatsapp",        label: "WhatsApp Integration",      desc: "Digital receipts & billing notifications via WhatsApp",      preset: false },
  { key: "maintenance",     label: "Preventive Maintenance",    desc: "Cold storage / refrigerator PM schedules",                   preset: false },
  { key: "production",      label: "Production & BOM",          desc: "BOM-driven production (not relevant for grocery retail)",    preset: false },
];

// ── Predefined grocery roles (shown in Step 2) ────────────────────────────────
const GROCERY_ROLES = [
  {
    name: "Admin / Owner",
    who: "Store owner",
    perms: "Full access — all modules, settings, reports",
    badge: "full",
    screens: ["POS", "Inventory", "Accounts", "HR", "Reports", "Settings"],
  },
  {
    name: "Store Manager",
    who: "Manager",
    perms: "POS view, sales, invoicing, stock write-offs — no payroll or accounts",
    badge: "high",
    screens: ["POS (view) ✅", "Invoicing ✅", "Stock Adjustments ✅", "Purchase (view)", "Reports ✅"],
  },
  {
    name: "Cashier",
    who: "Billing counter staff",
    perms: "POS Terminal — create bills, park bills, process split payments, view sales history",
    badge: "limited",
    screens: ["POS Terminal ✅", "Invoicing ✅"],
  },
  {
    name: "Godown Incharge",
    who: "Warehouse person",
    perms: "GRN + barcode scan, stock adjustments (damage/expiry), bulk import, stock transfers",
    badge: "medium",
    screens: ["Inventory ✅", "GRN ✅", "Barcode Scan ✅", "Stock Adjustments ✅", "Bulk Import ✅"],
  },
  {
    name: "Purchase Manager",
    who: "Buying person",
    perms: "Create purchase orders, approve GRNs, barcode scan (view), bulk import, manage vendors",
    badge: "medium",
    screens: ["Purchase Orders ✅", "GRN ✅", "Vendors ✅", "Bulk Import ✅"],
  },
  {
    name: "Accountant",
    who: "Accounts person",
    perms: "Invoices, payments, GST reports, journal entries — no HR/payroll",
    badge: "medium",
    screens: ["Invoicing ✅", "GST Reports ✅", "Accounting ✅"],
  },
  {
    name: "HR Manager",
    who: "If you have staff",
    perms: "HR & Payroll only — employee records, salary, leave",
    badge: "limited",
    screens: ["HR & Payroll ✅"],
  },
];

const BADGE_STYLE: Record<string, string> = {
  full:    "bg-primary/10 text-primary border-primary/20",
  high:    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300",
  medium:  "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300",
  limited: "bg-muted text-muted-foreground border-border",
};

const BADGE_LABEL: Record<string, string> = {
  full: "Full Access", high: "High Access", medium: "Partial", limited: "Limited",
};

// ── Permission matrix preview ─────────────────────────────────────────────────
const PERM_MATRIX = [
  { module: "POS Terminal",       admin: "✅", mgr: "View", cashier: "✅", godown: "—",    purchase: "—",    acct: "—"   },
  { module: "Invoicing / Billing",admin: "✅", mgr: "✅",   cashier: "✅", godown: "—",    purchase: "—",    acct: "✅"  },
  { module: "Inventory",          admin: "✅", mgr: "View", cashier: "—",  godown: "✅",   purchase: "View", acct: "—"   },
  { module: "GRN + Barcode Scan", admin: "✅", mgr: "View", cashier: "—",  godown: "✅",   purchase: "✅",   acct: "—"   },
  { module: "Stock Adjustments",  admin: "✅", mgr: "✅",   cashier: "—",  godown: "✅",   purchase: "—",    acct: "—"   },
  { module: "Bulk Import",        admin: "✅", mgr: "—",   cashier: "—",  godown: "✅",   purchase: "✅",   acct: "—"   },
  { module: "Purchase Orders",    admin: "✅", mgr: "View", cashier: "—",  godown: "View", purchase: "✅",   acct: "View"},
  { module: "GST / Accounts",     admin: "✅", mgr: "—",   cashier: "—",  godown: "—",    purchase: "—",    acct: "✅"  },
  { module: "HR & Payroll",       admin: "✅", mgr: "—",   cashier: "—",  godown: "—",    purchase: "—",    acct: "—"   },
  { module: "Reports",            admin: "✅", mgr: "✅",   cashier: "View",godown: "—",   purchase: "View", acct: "✅"  },
];

type Step = 1 | 2 | 3 | 4;

interface PlanForm {
  name: string; slug: string; tagline: string;
  priceMonthly: string; maxUsers: string; modules: string[];
}
interface TenantForm {
  companyName: string; slug: string; industry: string;
  maxUsers: string; trialDays: string;
}
interface UserForm {
  adminUsername: string; adminEmail: string; adminPassword: string;
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { n: 1 as Step, label: "Plan",     icon: Package },
    { n: 2 as Step, label: "Business", icon: Building2 },
    { n: 3 as Step, label: "Users",    icon: Users },
    { n: 4 as Step, label: "Done",     icon: CheckCircle2 },
  ];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map(({ n, label, icon: Icon }, i) => {
        const done = current > n;
        const active = current === n;
        return (
          <div key={n} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`flex items-center justify-center w-9 h-9 rounded-full border-2 transition-colors ${
                done  ? "bg-primary border-primary text-primary-foreground" :
                active ? "border-primary text-primary bg-primary/10" :
                         "border-muted text-muted-foreground bg-muted/30"
              }`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`text-xs font-medium ${active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 ${done ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function SuperAdminSetupWizard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>(1);
  const [showPass, setShowPass] = useState(false);
  const [seedResult, setSeedResult] = useState<any>(null);
  const [createdTenantId, setCreatedTenantId] = useState<number | null>(null);

  const [planForm, setPlanForm] = useState<PlanForm>({
    name: "Grocery Professional",
    slug: "grocery-professional",
    tagline: "Complete ERP for Grocery Stores & Godowns",
    priceMonthly: "2999",
    maxUsers: "20",
    modules: ALL_MODULES.filter(m => m.preset).map(m => m.key),
  });

  const [tenantForm, setTenantForm] = useState<TenantForm>({
    companyName: "", slug: "", industry: "retail", maxUsers: "10", trialDays: "30",
  });

  const [userForm, setUserForm] = useState<UserForm>({
    adminUsername: "", adminEmail: "", adminPassword: "",
  });

  const { data: existingPlans = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/subscription-plans"],
    queryFn: async () => {
      const r = await fetch("/api/admin/subscription-plans", { credentials: "include" });
      const d = await r.json();
      return d.plans ?? d ?? [];
    },
  });

  const planExists = existingPlans.some((p: any) => p.slug === planForm.slug);

  const createPlanMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/subscription-plans", {
      name: planForm.name, slug: planForm.slug, tagline: planForm.tagline,
      description: "Pre-configured plan for grocery stores with godown management.",
      priceMonthly: Number(planForm.priceMonthly) * 100,
      priceYearly: Math.round(Number(planForm.priceMonthly) * 100 * 10),
      maxUsers: Number(planForm.maxUsers), modules: planForm.modules,
      features: [
        "GST-compliant billing & invoicing", "Multi-location inventory (store + godown)",
        "Batch/lot & expiry date tracking", "Purchase orders & GRN",
        "GSTR-1 / GSTR-3B reports", "HR & payroll for store staff",
        "Double-entry accounting",
      ],
      isActive: true, isFeatured: false, displayOrder: 10, trialDays: 30,
    }),
  });

  const createTenantMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/tenants", {
      name: tenantForm.companyName, slug: tenantForm.slug, plan: planForm.slug,
      adminUsername: userForm.adminUsername, adminPassword: userForm.adminPassword,
      adminEmail: userForm.adminEmail || undefined,
      maxUsers: Number(tenantForm.maxUsers),
      trialDays: tenantForm.trialDays ? Number(tenantForm.trialDays) : undefined,
      industry: tenantForm.industry,
    }),
  });

  const seedGroceryMutation = useMutation({
    mutationFn: (tenantId: number) =>
      apiRequest("POST", `/api/admin/tenants/${tenantId}/seed-grocery`, {}),
  });

  async function handleFinish() {
    try {
      if (!planExists) {
        await createPlanMutation.mutateAsync();
      }
      const tenantResult: any = await createTenantMutation.mutateAsync();
      const newTenantId = tenantResult?.tenant?.id;
      if (newTenantId) {
        setCreatedTenantId(newTenantId);
        const seedData = await seedGroceryMutation.mutateAsync(newTenantId);
        setSeedResult(seedData);
      }
      setStep(4);
      toast({ title: "Grocery store set up successfully!" });
    } catch (e: any) {
      toast({
        title: "Setup failed",
        description: e?.message ?? "Please check the details and try again.",
        variant: "destructive",
      });
    }
  }

  const isLoading = createPlanMutation.isPending || createTenantMutation.isPending || seedGroceryMutation.isPending;

  const loadingLabel = createPlanMutation.isPending ? "Creating plan…"
    : createTenantMutation.isPending ? "Creating tenant…"
    : seedGroceryMutation.isPending ? "Seeding roles & warehouses…"
    : "Setting up…";

  return (
    <SuperAdminLayout
      title="Grocery Store Starter Pack"
      subtitle="Set up a complete grocery store & godown in 3 steps"
      actions={
        step < 4 && (
          <Button variant="outline" size="sm" onClick={() => setLocation("/super-admin/tenants")}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Tenants
          </Button>
        )
      }
    >
      <div className="max-w-3xl mx-auto">
        <StepIndicator current={step} />

        {/* ── Step 1: Plan ──────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4 text-primary" />
                  Plan Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {planExists && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 text-sm text-amber-800 dark:text-amber-200">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Plan slug <strong className="font-mono mx-1">{planForm.slug}</strong> already exists — it will be reused as-is.
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Plan Name</Label>
                    <Input value={planForm.name} onChange={e => setPlanForm(p => ({ ...p, name: e.target.value, slug: slugify(e.target.value) }))} data-testid="input-plan-name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Plan Slug</Label>
                    <Input className="font-mono text-sm" value={planForm.slug} onChange={e => setPlanForm(p => ({ ...p, slug: e.target.value }))} data-testid="input-plan-slug" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Monthly Price (₹)</Label>
                    <Input type="number" value={planForm.priceMonthly} onChange={e => setPlanForm(p => ({ ...p, priceMonthly: e.target.value }))} data-testid="input-plan-price" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Max Users</Label>
                    <Input type="number" value={planForm.maxUsers} onChange={e => setPlanForm(p => ({ ...p, maxUsers: e.target.value }))} data-testid="input-plan-max-users" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Modules Included
                  </span>
                  <Badge variant="secondary">{planForm.modules.length} of {ALL_MODULES.length} selected</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ALL_MODULES.map(mod => {
                    const checked = planForm.modules.includes(mod.key);
                    return (
                      <div
                        key={mod.key}
                        className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${checked ? "border-primary/40 bg-primary/5" : "border-muted"}`}
                        onClick={() => setPlanForm(p => ({
                          ...p,
                          modules: checked ? p.modules.filter(m => m !== mod.key) : [...p.modules, mod.key],
                        }))}
                        data-testid={`checkbox-module-${mod.key}`}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => {}} className="mt-0.5 pointer-events-none" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight">{mod.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{mod.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} data-testid="button-next-step-1">
                Next: Business Details <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Tenant / Business ─────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-primary" />
                  Business Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Company / Store Name <span className="text-destructive">*</span></Label>
                    <Input
                      value={tenantForm.companyName}
                      onChange={e => setTenantForm(p => ({ ...p, companyName: e.target.value, slug: slugify(e.target.value) }))}
                      placeholder="e.g. Fresh Mart Grocery"
                      data-testid="input-company-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Company ID (slug) <span className="text-destructive">*</span></Label>
                    <Input
                      className="font-mono text-sm"
                      value={tenantForm.slug}
                      onChange={e => setTenantForm(p => ({ ...p, slug: e.target.value }))}
                      placeholder="e.g. fresh-mart"
                      data-testid="input-tenant-slug"
                    />
                    <p className="text-xs text-muted-foreground">Used for login URL. Lowercase, hyphens only.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Industry</Label>
                    <Select value={tenantForm.industry} onValueChange={v => setTenantForm(p => ({ ...p, industry: v }))}>
                      <SelectTrigger data-testid="select-setup-industry">
                        <SelectValue placeholder="Select industry…" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map(ind => (
                          <SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Max Users</Label>
                    <Input type="number" value={tenantForm.maxUsers} onChange={e => setTenantForm(p => ({ ...p, maxUsers: e.target.value }))} data-testid="input-tenant-max-users" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Trial Days</Label>
                    <Input type="number" value={tenantForm.trialDays} onChange={e => setTenantForm(p => ({ ...p, trialDays: e.target.value }))} placeholder="30" />
                    <p className="text-xs text-muted-foreground">0 = no trial, activate immediately</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Roles preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  7 Predefined Roles — Created Automatically
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  These roles are pre-configured with exact screen permissions for a grocery store. You can fine-tune them from Role Management after login.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {GROCERY_ROLES.map(role => (
                    <div key={role.name} className="flex items-start gap-3 p-3 rounded-md border">
                      <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{role.name}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${BADGE_STYLE[role.badge]}`}>
                            {BADGE_LABEL[role.badge]}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{role.who} — {role.perms}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Permission matrix */}
                <Separator />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Permission Matrix</p>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-xs min-w-[540px]">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Module</th>
                        {["Admin", "Store Mgr", "Cashier", "Godown", "Purchase", "Accountant"].map(h => (
                          <th key={h} className="text-center py-1.5 px-1 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PERM_MATRIX.map((row, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-1.5 px-2 font-medium">{row.module}</td>
                          {[row.admin, row.mgr, row.cashier, row.godown, row.purchase, row.acct].map((v, j) => (
                            <td key={j} className={`py-1.5 px-1 text-center ${v === "✅" ? "text-emerald-600 dark:text-emerald-400" : v === "—" ? "text-muted-foreground/40" : "text-blue-600 dark:text-blue-400 text-xs"}`}>
                              {v}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Warehouses */}
                <Separator />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Warehouses Created</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: "Main Store — Shelf Stock", code: "MAIN-STORE", primary: true },
                    { name: "Godown — Bulk Storage",    code: "GODOWN",     primary: false },
                  ].map(wh => (
                    <div key={wh.code} className="flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium">{wh.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{wh.code}</span>
                      {wh.primary && <Badge variant="secondary" className="text-xs">Default</Badge>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} data-testid="button-back-step-2">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!tenantForm.companyName || !tenantForm.slug}
                data-testid="button-next-step-2"
              >
                Next: Admin User <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Admin User ────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-primary" />
                  Admin User Credentials
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Admin Username <span className="text-destructive">*</span></Label>
                    <Input
                      value={userForm.adminUsername}
                      onChange={e => setUserForm(p => ({ ...p, adminUsername: e.target.value }))}
                      placeholder="e.g. admin"
                      data-testid="input-admin-username"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Admin Email</Label>
                    <Input
                      type="email"
                      value={userForm.adminEmail}
                      onChange={e => setUserForm(p => ({ ...p, adminEmail: e.target.value }))}
                      placeholder="owner@freshmart.com"
                      data-testid="input-admin-email"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Admin Password <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Input
                        type={showPass ? "text" : "password"}
                        value={userForm.adminPassword}
                        onChange={e => setUserForm(p => ({ ...p, adminPassword: e.target.value }))}
                        placeholder="Strong password"
                        className="pr-10"
                        data-testid="input-admin-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowPass(v => !v)}
                      >
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Review summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Review — Everything That Will Be Created</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{planForm.name} {planExists && <Badge variant="secondary" className="ml-1 text-xs">reusing existing</Badge>}</span>
                  <span className="text-muted-foreground">Modules</span>
                  <span className="font-medium">{planForm.modules.length} modules enabled</span>
                  <span className="text-muted-foreground">Company</span>
                  <span className="font-medium">{tenantForm.companyName || "—"}</span>
                  <span className="text-muted-foreground">Company ID</span>
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{tenantForm.slug || "—"}</span>
                  <span className="text-muted-foreground">Max Users</span>
                  <span className="font-medium">{tenantForm.maxUsers}</span>
                  <span className="text-muted-foreground">Trial</span>
                  <span className="font-medium">{tenantForm.trialDays ? `${tenantForm.trialDays} days` : "No trial"}</span>
                  <span className="text-muted-foreground">Admin Login</span>
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{userForm.adminUsername || "—"}</span>
                  <span className="text-muted-foreground">Roles Seeded</span>
                  <span className="font-medium">7 grocery roles with permissions</span>
                  <span className="text-muted-foreground">Warehouses</span>
                  <span className="font-medium">Main Store + Godown</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} disabled={isLoading} data-testid="button-back-step-3">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={handleFinish}
                disabled={isLoading || !userForm.adminUsername || !userForm.adminPassword || !tenantForm.companyName || !tenantForm.slug}
                data-testid="button-create-all"
              >
                {isLoading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{loadingLabel}</>
                  : <><Sparkles className="h-4 w-4 mr-2" />Create Everything</>
                }
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Done ─────────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6 pb-6 text-center space-y-3">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Grocery Store Ready!</h2>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                  <strong>{tenantForm.companyName}</strong> has been set up with the <strong>{planForm.name}</strong> plan, all roles, and warehouses.
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">What was created</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {[
                    planExists ? `Plan reused: ${planForm.name}` : `Plan created: ${planForm.name}`,
                    `Tenant: ${tenantForm.companyName}`,
                    `Admin user: ${userForm.adminUsername}`,
                    `7 grocery roles seeded${seedResult?.rolesCreated?.length ? ` (${seedResult.rolesCreated.length} new)` : ""}`,
                    `${planForm.modules.length} modules enabled`,
                    ...(seedResult?.warehousesCreated?.length
                      ? seedResult.warehousesCreated.map((w: string) => `Warehouse: ${w}`)
                      : ["Main Store — Shelf Stock", "Godown — Bulk Storage"].map(w => `Warehouse: ${w}`)
                    ),
                  ].map(item => (
                    <div key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">Next steps for the store owner</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {[
                    "Log in with admin credentials",
                    "Add staff users & assign roles (Cashier, Godown, etc.)",
                    "Set up products with HSN codes & GST rates",
                    "Add opening stock in both warehouses",
                    "Configure GSTIN in Company Settings",
                    "Add suppliers / vendors",
                    "Run first POS billing transaction",
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="flex items-center justify-center w-4 h-4 rounded-full bg-muted text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-3 justify-center">
              <Button onClick={() => setLocation("/super-admin/tenants")} data-testid="button-go-tenants">
                <Building2 className="h-4 w-4 mr-2" /> View All Tenants
              </Button>
              <Button variant="outline" onClick={() => {
                setStep(1);
                setTenantForm({ companyName: "", slug: "", industry: "retail", maxUsers: "10", trialDays: "30" });
                setUserForm({ adminUsername: "", adminEmail: "", adminPassword: "" });
                setSeedResult(null);
                setCreatedTenantId(null);
              }} data-testid="button-setup-another">
                <Store className="h-4 w-4 mr-2" /> Set Up Another Store
              </Button>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
