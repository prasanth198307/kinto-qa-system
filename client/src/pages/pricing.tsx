import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2, Loader2, ArrowRight, Star, Puzzle, Package2,
  Factory, FileText, Receipt, IndianRupee, UserCheck, Target, MessageCircle,
  HeartPulse, GraduationCap, Truck, Home, ShoppingBag, Leaf, Key, GitBranch,
  ClipboardCheck, Wrench, FolderKanban, BarChart3, PiggyBank, ShoppingCart,
  ClipboardList, MonitorSmartphone, ChevronLeft,
  Hotel, Pill, TreePine, Landmark, Coins, Sparkles, Video, Headphones,
} from "lucide-react";
import { useState } from "react";

// ─── Module catalogue ─────────────────────────────────────────────────────────
const MODULE_GROUPS = [
  {
    category: "Finance",
    color: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800",
    modules: [
      { icon: FileText,       name: "GST Invoicing",          desc: "Tax invoices, credit/debit notes, proforma",          price: 699, popular: true },
      { icon: Receipt,        name: "Accounting & Ledger",    desc: "Double-entry, COA, journals, P&L, balance sheet",     price: 899 },
      { icon: IndianRupee,    name: "Expense Claims",         desc: "Employee expense submission & approvals",             price: 299 },
      { icon: BarChart3,      name: "TDS Management",         desc: "TDS calculation, challans, Form 26Q",                 price: 399 },
      { icon: PiggyBank,      name: "Fixed Assets",           desc: "Asset register, depreciation schedules",              price: 499 },
    ],
  },
  {
    category: "Inventory & Supply Chain",
    color: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
    modules: [
      { icon: Package2,       name: "Inventory",              desc: "Stock, batches, FIFO, reorder alerts",                price: 599, popular: true },
      { icon: ShoppingCart,   name: "Purchase & PO",          desc: "RFQ, PO, GRN, vendor invoices, three-way match",      price: 499 },
      { icon: Home,           name: "Multi-Warehouse",        desc: "Multiple locations, stock transfers, UOM conversions", price: 399 },
      { icon: Truck,          name: "Gatepasses",             desc: "Outward gatepasses, dispatch, serial/lot tracking",   price: 299 },
    ],
  },
  {
    category: "Production & Operations",
    color: "bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800",
    modules: [
      { icon: Factory,        name: "Production / BOM",       desc: "Work orders, BOM, FG tracking, routing",             price: 699 },
      { icon: ClipboardList,  name: "Quality Assurance",      desc: "QA checklists, inspection, rejection logs",           price: 399 },
      { icon: Wrench,         name: "Preventive Maintenance", desc: "PM schedules, machine downtime tracking",             price: 349 },
      { icon: FolderKanban,   name: "Project Management",     desc: "BOQ, milestones, timesheets, project P&L",           price: 599 },
    ],
  },
  {
    category: "HR & People",
    color: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800",
    modules: [
      { icon: UserCheck,      name: "HR & Payroll",           desc: "Employee master, payroll, payslips, CTC",            price: 799, popular: true },
      { icon: ClipboardCheck, name: "Attendance & Leave",     desc: "Daily attendance, leave requests, holiday calendar",  price: 349 },
      { icon: MonitorSmartphone, name: "ESS Portal",          desc: "Employee self-service — claims, leaves, payslips",   price: 249 },
      { icon: Target,         name: "Performance Appraisals", desc: "Appraisal cycles, ratings, goals",                   price: 299 },
    ],
  },
  {
    category: "Sales & CRM",
    color: "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800",
    modules: [
      { icon: Target,         name: "CRM & Leads",            desc: "Lead pipeline, follow-ups, conversion tracking",     price: 499 },
      { icon: FileText,       name: "Sales Orders",           desc: "Quotations, sales orders, delivery challans",        price: 399 },
      { icon: MessageCircle,  name: "WhatsApp Integration",   desc: "Automated alerts, approvals, notifications",         price: 499 },
    ],
  },
  {
    category: "Industry Verticals",
    color: "bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800",
    modules: [
      { icon: HeartPulse,     name: "Healthcare",             desc: "Patients, OPD/IPD, wards, appointments",            price: 999 },
      { icon: Hotel,          name: "Hotel ERP",              desc: "Rooms, folios, F&B POS, channel manager",           price: 1499, popular: true },
      { icon: GraduationCap,  name: "Education ERP",          desc: "Students, fees, timetable, assessments",            price: 999 },
      { icon: Truck,          name: "Logistics & Fleet",      desc: "Vehicles, trips, LR / consignment notes",           price: 799 },
      { icon: Home,           name: "Real Estate",            desc: "Projects, units, bookings, payment schedules",      price: 799 },
      { icon: ShoppingBag,    name: "Retail / POS",           desc: "POS terminal, sessions, sales history",             price: 699 },
      { icon: Leaf,           name: "Agriculture",            desc: "Farms, crop cycles, procurement, prices",           price: 699 },
      { icon: Pill,           name: "Pharmacy ERP",           desc: "FEFO billing, narcotics register, prescriptions",   price: 899 },
      { icon: TreePine,       name: "NGO / Trust ERP",        desc: "80G certificates, FCRA fund accounting, donors",    price: 799 },
      { icon: Landmark,       name: "Nidhi Company ERP",      desc: "FD/RD, loans, EMI collection, NDH returns",        price: 999 },
      { icon: Coins,          name: "Gold & Jewellery ERP",   desc: "Making charges, karat tracking, BIS hallmarking",   price: 899 },
    ],
  },
  {
    category: "AI Products",
    color: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800",
    modules: [
      { icon: Sparkles,       name: "SwachForms",             desc: "AI form builder — describe it, AI builds it instantly", price: 399, popular: true },
      { icon: Video,          name: "SwachMeet",              desc: "Built-in video conferencing — no Zoom needed",       price: 299 },
      { icon: Headphones,     name: "SwachDesk",              desc: "Helpdesk with SLA timers, escalation & CSAT",        price: 499 },
    ],
  },
];

const PLAN_COLORS: Record<string, string> = {
  trial:         "border-amber-300",
  basic:         "border-blue-300",
  professional:  "border-violet-400",
  enterprise:    "border-emerald-400",
  gold_erp_plan: "border-yellow-500",
};

const PLAN_BADGE: Record<string, { label: string; className: string }> = {
  enterprise:    { label: "Most Popular",       className: "bg-violet-600 text-white hover:bg-violet-600" },
  gold_erp_plan: { label: "Jewellery Vertical", className: "bg-yellow-500 text-black hover:bg-yellow-500" },
};

interface Plan {
  id: number;
  name: string;
  slug: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  baseUsers: number;
  perUserPrice: number;
  features: string[];
  isFeatured: boolean;
  trialDays: number;
}

function yearlyDiscount(monthly: number, yearly: number): number {
  if (!monthly || !yearly) return 0;
  const annualMonthly = monthly * 12;
  return Math.round(((annualMonthly - yearly) / annualMonthly) * 100);
}

function formatPrice(paise: number, cycle: "monthly" | "yearly"): string {
  if (paise === 0) return "Free";
  const rupees = paise / 100;
  if (cycle === "yearly") return `₹${(rupees / 12).toLocaleString("en-IN", { maximumFractionDigits: 0 })}/mo`;
  return `₹${rupees.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/mo`;
}

function formatPriceTotal(paise: number, cycle: "monthly" | "yearly"): string {
  if (paise === 0) return "";
  const rupees = paise / 100;
  if (cycle === "yearly") return `₹${rupees.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/year`;
  return `₹${rupees.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/month`;
}

const FEATURES_PREVIEW = 5;

export default function PricingPage() {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());

  function toggleExpand(slug: string) {
    setExpandedPlans((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  }

  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ["/api/subscription-plans"],
  });

  const discount = plans[1] ? yearlyDiscount(plans[1].priceMonthly, plans[1].priceYearly) : 17;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      {/* ── Sticky top nav ─────────────────────────────────────────────────── */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <a
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="link-pricing-home"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to home
          </a>
          <a href="/" className="font-bold text-lg tracking-tight">SwachERP</a>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild data-testid="nav-pricing-signin">
              <a href="/auth">Sign In</a>
            </Button>
            <Button size="sm" asChild data-testid="nav-pricing-trial">
              <a href="/register-company">Start Free Trial</a>
            </Button>
          </div>
        </div>
      </header>

      <div className="py-10 px-4 space-y-10 max-w-5xl mx-auto">

        {/* ── Hero header ──────────────────────────────────────────────────── */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold">Simple, transparent pricing</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Start free for 14 days. Upgrade when your business grows.
            All plans include GST invoicing and 24×7 data access.
          </p>

          {/* Monthly / Yearly toggle */}
          <div className="inline-flex items-center gap-1 bg-muted rounded-lg p-1 mt-2">
            <button
              onClick={() => setCycle("monthly")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${cycle === "monthly" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              data-testid="button-cycle-monthly"
            >
              Monthly
            </button>
            <button
              onClick={() => setCycle("yearly")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${cycle === "yearly" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              data-testid="button-cycle-yearly"
            >
              Yearly
              <span className="ml-1.5 text-xs text-emerald-600 font-semibold">Save {discount}%</span>
            </button>
          </div>
        </div>

        {/* ── Plan cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-stretch">
          {plans.map((plan) => {
            const accentBorder = PLAN_COLORS[plan.slug] ?? "";
            const badge = PLAN_BADGE[plan.slug];
            const price = cycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
            const features = plan.features as string[];
            const isExpanded = expandedPlans.has(plan.slug);
            const visibleFeatures = isExpanded ? features : features.slice(0, FEATURES_PREVIEW);
            const hiddenCount = features.length - FEATURES_PREVIEW;
            const isGoldErp = plan.slug === "gold_erp_plan";

            return (
              <Card
                key={plan.id}
                id={`plan-${plan.slug}`}
                className={`relative flex flex-col ${plan.isFeatured ? `border-2 ${accentBorder}` : ""} ${isGoldErp ? "bg-gradient-to-b from-yellow-50/60 to-background dark:from-yellow-950/20" : ""}`}
                data-testid={`card-plan-${plan.slug}`}
              >
                {plan.isFeatured && badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className={`flex items-center gap-1 ${badge.className}`}>
                      <Star className="h-3 w-3" /> {badge.label}
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <CardDescription className="text-xs">{plan.tagline}</CardDescription>

                  <div className="mt-2">
                    {plan.priceMonthly === 0 ? (
                      <div>
                        <span className="text-2xl font-bold">Free</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{plan.trialDays}-day trial</p>
                      </div>
                    ) : (
                      <div>
                        <span className="text-2xl font-bold">{formatPrice(price, cycle)}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatPriceTotal(price, cycle)} · billed {cycle}
                        </p>
                      </div>
                    )}
                    {plan.baseUsers > 0 ? (
                      <div className="mt-1 space-y-0.5">
                        <p className="text-xs text-muted-foreground">{plan.baseUsers} users included</p>
                        <p className="text-xs text-muted-foreground">+₹{(plan.perUserPrice / 100).toLocaleString("en-IN")}/extra user/month</p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">Up to {plan.maxUsers} users</p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col flex-1 gap-3">
                  <Separator />

                  {/* Feature list — clamped to FEATURES_PREVIEW rows */}
                  <ul className="space-y-2">
                    {visibleFeatures.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Show more / Show less toggle */}
                  {hiddenCount > 0 && (
                    <button
                      onClick={() => toggleExpand(plan.slug)}
                      className="text-xs text-primary hover:underline text-left"
                      data-testid={`button-expand-${plan.slug}`}
                    >
                      {isExpanded ? "Show less" : `+ ${hiddenCount} more included`}
                    </button>
                  )}

                  {/* CTA always pinned to the bottom */}
                  <div className="mt-auto pt-2">
                    {plan.slug === "trial" ? (
                      <Button className="w-full text-sm" asChild data-testid={`button-start-trial-${plan.slug}`}>
                        <a href="/register-company">
                          Start Free Trial <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </a>
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full text-sm" asChild data-testid={`button-get-started-${plan.slug}`}>
                        <a href="/register-company">
                          Get Started <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── Build Your Own ───────────────────────────────────────────────── */}
        <div className="space-y-6" data-testid="section-build-your-own">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Puzzle className="h-4 w-4" />
              Or build your own plan
            </div>
            <h2 className="text-2xl font-bold">Pay only for what you need</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
              Start with any base plan, then add only the modules your business uses.
              No long-term commitments — add or remove modules any time from your account.
            </p>
          </div>

          {/* Free modules callout */}
          <div className="rounded-md border bg-muted/40 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-md bg-background p-2 border">
                <Key className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">4 modules always free — on every plan</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  User Management · Roles &amp; Permissions · Company Settings · Dashboard &amp; Reports
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0">Included at no cost</Badge>
          </div>

          {/* Module grid by category */}
          <div className="space-y-4">
            {MODULE_GROUPS.map((group) => (
              <div key={group.category}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {group.category}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  {group.modules.map((mod) => {
                    const Icon = mod.icon;
                    return (
                      <div
                        key={mod.name}
                        className={`relative rounded-md border p-3 flex items-start gap-3 ${group.color}`}
                        data-testid={`module-card-${mod.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                      >
                        {mod.popular && (
                          <span className="absolute top-2 right-2 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            Popular
                          </span>
                        )}
                        <div className="mt-0.5 shrink-0 rounded-md bg-background/70 p-1.5 border border-white/50 dark:border-white/10">
                          <Icon className="h-3.5 w-3.5 text-foreground/70" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">{mod.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{mod.desc}</p>
                          <p className="text-sm font-bold mt-1.5">
                            ₹{mod.price.toLocaleString("en-IN")}
                            <span className="text-xs font-normal text-muted-foreground">/mo</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* How module pricing works */}
          <div className="rounded-md border bg-muted/30 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">How per-module pricing works</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-muted-foreground">
              <div className="space-y-1">
                <p className="font-medium text-foreground text-sm">1. Start with a base plan</p>
                <p>Pick Trial, Basic, Professional, or Enterprise — your platform foundation with user limits and core support.</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground text-sm">2. Add only the modules you use</p>
                <p>From the Module Marketplace inside your account, toggle on exactly the features your business needs today.</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground text-sm">3. Your bill = base plan + modules</p>
                <p>Monthly charges are calculated automatically. Add or remove modules anytime — billing adjusts at the next cycle.</p>
              </div>
            </div>
            <div className="pt-2 flex flex-wrap gap-3 items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Example: Basic (₹999) + GST Invoicing (₹699) + HR &amp; Payroll (₹799) = <strong className="text-foreground">₹2,497/mo</strong>
              </p>
              <Button asChild size="sm" data-testid="button-start-trial-modules">
                <a href="/register-company">
                  Start Free Trial — choose modules later
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* ── Bottom note ──────────────────────────────────────────────────── */}
        <div className="text-center text-sm text-muted-foreground space-y-1 pb-6">
          <p>All prices are exclusive of GST (18%). No credit card required to start your free trial.</p>
          <p>
            Need a custom plan or volume pricing?{" "}
            <a href="mailto:sales@swacherp.com" className="text-primary underline">Contact our sales team</a>.
          </p>
          <p>
            When you cancel, your plan stays active until the end of your current billing period.
            You can re-subscribe at any time.
          </p>
        </div>

      </div>
    </div>
  );
}
