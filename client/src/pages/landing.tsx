import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Factory, Package, ShoppingCart, FileText, BarChart3, Wrench,
  MessageCircle, Shield, Globe, Layers, ArrowRight, CheckCircle2,
  Smartphone, TrendingUp, Users, ClipboardList, Truck, Receipt,
  IndianRupee, Star, ChevronRight, Play, Loader2, Target, UserCheck,
  BookOpen, MonitorSmartphone, Menu, X, Zap, Building2, Award,
  HeadphonesIcon, LayoutDashboard, Briefcase, Settings, ChevronDown,
  Database, Link2, Cpu, Lock, Key, Code2, Webhook,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

const NAV_PRODUCTS = [
  {
    group: "Operations",
    items: [
      { icon: Factory,       label: "Production & BOM",      desc: "Orders, BOM, variance tracking" },
      { icon: Package,       label: "Inventory Control",     desc: "Raw material, FG, FIFO batching" },
      { icon: ShoppingCart,  label: "Purchase Orders",       desc: "Vendors, GRN, debit notes" },
      { icon: Truck,         label: "Dispatch & Gatepasses", desc: "Invoice-first dispatch, e-signatures" },
      { icon: ClipboardList, label: "Quality Control",       desc: "Returns workflow, traceability" },
      { icon: Wrench,        label: "Preventive Maintenance",desc: "Machine schedules, spare parts" },
    ],
  },
  {
    group: "Finance",
    items: [
      { icon: FileText,      label: "GST Invoicing",         desc: "Tax invoices, credit notes, e-way bills" },
      { icon: Receipt,       label: "Double-Entry Accounting",desc: "COA, P&L, Balance Sheet, journals" },
      { icon: IndianRupee,   label: "Expenses & Cash",       desc: "Cash register, petty cash, vouchers" },
      { icon: BarChart3,     label: "MIS Analytics",         desc: "Executive KPIs, dashboards, reports" },
    ],
  },
  {
    group: "People & CRM",
    items: [
      { icon: UserCheck,        label: "HR & Payroll",         desc: "Attendance, leaves, payroll, TDS, Form 16" },
      { icon: MonitorSmartphone,label: "Employee Self-Service", desc: "Payslips, leaves, tax declarations" },
      { icon: Target,           label: "CRM",                  desc: "Lead pipeline, follow-ups, conversions" },
      { icon: MessageCircle,    label: "WhatsApp Integration",  desc: "Checklists & machine startup on WhatsApp" },
    ],
  },
  {
    group: "Platform",
    items: [
      { icon: Key,     label: "API Hub",           desc: "Scoped keys, live tester, call logs & analytics" },
      { icon: Webhook, label: "Custom Integrations", desc: "Register your own endpoints alongside built-ins" },
    ],
  },
];

const NAV_SOLUTIONS_BY_ROLE = [
  { icon: Briefcase,    label: "Owner / MD",          desc: "P&L, MIS dashboards, full visibility" },
  { icon: Receipt,      label: "Finance & Accounts",  desc: "GST, accounting, TDS, reports" },
  { icon: UserCheck,    label: "HR Manager",          desc: "Payroll, leaves, compliance, ESS" },
  { icon: Factory,      label: "Operations Head",     desc: "Production, inventory, dispatch, quality" },
  { icon: Target,       label: "Sales Team",          desc: "CRM, invoicing, customer receipts" },
  { icon: Settings,     label: "IT / Admin",          desc: "Users, roles, permissions" },
];

const NAV_SOLUTIONS_BY_INDUSTRY = [
  { label: "Auto Components" },
  { label: "Engineering Goods" },
  { label: "Food & Beverages" },
  { label: "Fabrication Shops" },
  { label: "Plastic & Packaging" },
  { label: "Pharmaceuticals" },
  { label: "Chemical Mfg." },
  { label: "HR & Services" },
];

const MODULES = [
  { icon: Factory,          label: "Production & BOM",      desc: "Manufacturing orders, BOM, variance tracking" },
  { icon: Package,          label: "Inventory Control",     desc: "Raw material & FG with FIFO batch allocation" },
  { icon: ShoppingCart,     label: "Purchase Orders",       desc: "Vendor management, GRN and debit notes" },
  { icon: FileText,         label: "GST Invoicing",         desc: "Tax invoices, credit notes & e-receipts" },
  { icon: Truck,            label: "Dispatch & Gatepasses", desc: "Invoice-first dispatch, digital signatures" },
  { icon: ClipboardList,    label: "Quality Control",       desc: "Three-stage return workflow, traceability" },
  { icon: Receipt,          label: "Accounting",            desc: "Double-entry COA, P&L and Balance Sheet" },
  { icon: BarChart3,        label: "MIS Analytics",         desc: "Executive KPIs, sales & production dashboards" },
  { icon: Wrench,           label: "Maintenance",           desc: "Machine schedules, checklists, spare parts" },
  { icon: MessageCircle,    label: "WhatsApp",              desc: "Machine startup & checklists on WhatsApp" },
  { icon: IndianRupee,      label: "Expenses & Cash",       desc: "Daily cash register with voucher printing" },
  { icon: Layers,           label: "Documents",             desc: "Versioned documents with expiry alerts" },
  { icon: Target,           label: "CRM",                   desc: "Lead pipeline, follow-ups & conversions" },
  { icon: UserCheck,        label: "HR & Payroll",          desc: "Attendance, leaves, payroll, TDS, Form 16" },
  { icon: MonitorSmartphone,label: "ESS Portal",            desc: "Payslips, leaves & tax declarations for staff" },
  { icon: Key,              label: "API Hub",               desc: "Scoped keys, live tester, call logs & analytics" },
];

const STRENGTHS = [
  {
    icon: MessageCircle,
    color: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
    iconColor: "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400",
    tag: "India's first",
    title: "WhatsApp-powered machine operations",
    desc: "Operators receive machine startup checklists directly on WhatsApp — no new app, no training. Responses are AI-interpreted and logged in real time. Supervisors get instant alerts for any failed check. Nothing like this exists in any other Indian ERP.",
    points: ["Daily machine startup & shutdown checklists", "AI interprets free-text responses from operators", "Real-time supervisor alerts for failed or missed checks", "Full audit trail — who responded, what time, what machine"],
  },
  {
    icon: FileText,
    color: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
    iconColor: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",
    tag: "Built for India",
    title: "GST compliance built in from day one",
    desc: "Not retrofitted — GST was designed into every transaction. Invoices, credit notes, debit notes, and advance receipts all carry GSTIN, HSN codes, and tax breakdowns. Export GST reports and reconcile GSTR-1 without any extra tool.",
    points: ["GSTIN-compliant tax invoices & e-receipts", "Credit notes, debit notes, advance receipts", "HSN / SAC code support with auto-populated rates", "GSTR-1 & GSTR-3B export-ready reports"],
  },
  {
    icon: Database,
    color: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800",
    iconColor: "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400",
    tag: "No silos",
    title: "One database — every department connected",
    desc: "Production, inventory, accounts, HR, and CRM all share the same database. When a production order is completed, inventory and accounts are updated automatically. When a payslip is processed, a journal entry is posted. No sync. No exports. No manual double-entry.",
    points: ["Production order → inventory deduction → journal entry, automatically", "Purchase GRN → stock update → vendor ledger, instantly", "Payroll → salary journal → ledger, in one click", "Dispatch → invoice → accounts receivable, with zero re-entry"],
  },
  {
    icon: UserCheck,
    color: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
    iconColor: "bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400",
    tag: "Not a bolt-on",
    title: "Full HR & payroll — not a separate product",
    desc: "Most ERPs make you buy a separate HR software. In SwachERP, HR is native. Employee masters, attendance, leave management, salary structures, PF/ESI, TDS projection, payslips, Form 16, recruitment, and the Employee Self-Service portal are all included — at every plan level.",
    points: ["Configurable salary structures with arrears handling", "Automated PF, ESI, and TDS deduction", "Form 16 generation and e-distribution via ESS", "Recruitment pipeline integrated with employee onboarding"],
  },
];

const PLANS = [
  {
    name: "Basic", price: "₹999", period: "/month", highlight: false, tag: "",
    features: ["5 users included", "GST invoicing & receipts", "Inventory management", "Purchase & sales orders", "Gatepasses & dispatch", "Expenses & documents", "Email support"],
  },
  {
    name: "Professional", price: "₹1,499", period: "/month", highlight: true, tag: "Most Popular",
    features: ["15 users included", "All Basic features", "Production & BOM tracking", "Double-entry accounting", "MIS analytics dashboards", "CRM lead management", "WhatsApp checklists", "Preventive maintenance", "API Hub — developer access", "Priority support"],
  },
  {
    name: "Enterprise", price: "₹2,599", period: "/month", highlight: false, tag: "",
    features: ["20 users included", "All Professional features", "HR & Payroll module", "Employee Self-Service portal", "TDS & compliance (Form 16)", "Recruitment management", "Custom branding", "Dedicated support"],
  },
];

const TESTIMONIALS = [
  { name: "Rajesh Sharma", company: "Precision Parts Mfg.", role: "Director", text: "Real-time inventory and GST invoicing in one place. We cut our month-end reporting time by 70% within the first month of going live." },
  { name: "Meera Patel",   company: "Alpha Industries",     role: "CFO",      text: "Automated TDS calculations and payslip delivery saved us days every month. The HR module alone is worth the subscription." },
  { name: "Suresh Kumar",  company: "Bharat Engineering",   role: "Ops Head", text: "From purchase orders to dispatch gatepasses, everything flows seamlessly. Our team adopted it in a week without any formal training." },
];

// ─────────────────────────────────────────────────────────────────────────────
// NAV DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return { open, setOpen, ref };
}

function ProductsDropdown() {
  const { open, setOpen, ref } = useDropdown();
  return (
    <div ref={ref} className="relative">
      <button
        className={`flex items-center gap-1 text-sm transition-colors py-1 px-1 ${open ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
        onClick={() => setOpen(o => !o)}
      >
        Products <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? "rotate-180 text-primary" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2.5 z-50 w-[720px] bg-background border rounded-xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-3 divide-x">
            {NAV_PRODUCTS.map(group => (
              <div key={group.group} className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">{group.group}</p>
                <div className="space-y-0.5">
                  {group.items.map(item => (
                    <div key={item.label} className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover-elevate cursor-pointer group">
                      <div className="mt-0.5 w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <item.icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold leading-tight">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t bg-muted/30 px-5 py-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">15 integrated modules — one database, zero sync issues</p>
            <a href="#modules" onClick={() => setOpen(false)} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              View all modules <ChevronRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function SolutionsDropdown() {
  const { open, setOpen, ref } = useDropdown();
  return (
    <div ref={ref} className="relative">
      <button
        className={`flex items-center gap-1 text-sm transition-colors py-1 px-1 ${open ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
        onClick={() => setOpen(o => !o)}
      >
        Solutions <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? "rotate-180 text-primary" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2.5 z-50 w-[560px] bg-background border rounded-xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-2 divide-x">
            {/* By Role */}
            <div className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">By Role</p>
              <div className="space-y-0.5">
                {NAV_SOLUTIONS_BY_ROLE.map(item => (
                  <div key={item.label} className="flex items-start gap-2.5 px-2 py-1.5 rounded-lg hover-elevate cursor-pointer">
                    <div className="mt-0.5 w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-3 h-3 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold leading-tight">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* By Industry */}
            <div className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">By Industry</p>
              <div className="grid grid-cols-2 gap-1">
                {NAV_SOLUTIONS_BY_INDUSTRY.map(item => (
                  <div key={item.label} className="px-2 py-1.5 rounded-lg hover-elevate cursor-pointer">
                    <p className="text-xs font-medium leading-tight">{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">By Scale</p>
                {[["Growing SMEs","5–20 users, quick onboarding"], ["Mid-size Mfg.", "15–50 users, full modules"], ["Enterprise & Groups","Custom plans, dedicated support"]].map(([label, desc]) => (
                  <div key={label} className="px-2 py-1.5 rounded-lg hover-elevate cursor-pointer">
                    <p className="text-xs font-semibold">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD PREVIEW MOCK
// ─────────────────────────────────────────────────────────────────────────────

function DashboardPreview() {
  return (
    <div className="relative w-full max-w-2xl mx-auto select-none pointer-events-none" aria-hidden>
      <div className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden text-xs">
        <div className="bg-gray-100 dark:bg-zinc-800 px-4 py-2.5 flex items-center gap-2 border-b">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="mx-4 flex-1">
            <div className="bg-white dark:bg-zinc-700 rounded px-3 py-0.5 text-[10px] text-muted-foreground w-52 mx-auto text-center border">
              ops.swacherp.com/dashboard
            </div>
          </div>
        </div>
        <div className="flex h-56">
          <div className="w-32 bg-gray-50 dark:bg-zinc-800 border-r px-2 py-3 space-y-0.5 shrink-0">
            {["Dashboard","Invoicing","Inventory","Production","Purchase","HR & Payroll","Accounting","CRM","Reports"].map((item, i) => (
              <div key={item} className={`px-2 py-1 rounded text-[9px] font-medium truncate ${i === 0 ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>{item}</div>
            ))}
          </div>
          <div className="flex-1 p-3 bg-gray-50/40 dark:bg-zinc-900 space-y-2 overflow-hidden">
            <p className="text-[10px] font-semibold text-foreground">Good morning, Rajesh 👋</p>
            <div className="grid grid-cols-4 gap-1.5">
              {[{l:"Revenue",v:"₹8.4L",c:"text-green-600"},{l:"Orders",v:"142",c:"text-blue-600"},{l:"Stock",v:"₹3.2L",c:"text-purple-600"},{l:"Pending",v:"18",c:"text-orange-600"}].map(k => (
                <div key={k.l} className="bg-white dark:bg-zinc-800 rounded-lg border p-1.5 shadow-sm">
                  <div className="text-[9px] text-muted-foreground">{k.l}</div>
                  <div className={`text-xs font-bold mt-0.5 ${k.c}`}>{k.v}</div>
                </div>
              ))}
            </div>
            <div className="bg-white dark:bg-zinc-800 rounded-lg border p-2 shadow-sm">
              <div className="text-[9px] font-medium text-muted-foreground mb-1.5">Monthly Revenue (₹ Lakhs)</div>
              <div className="flex items-end gap-0.5 h-10">
                {[35,52,40,70,48,82,60,90,55,78,68,95].map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i === 11 ? "hsl(var(--primary))" : "hsl(var(--primary)/.45)" }} />
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-800 rounded-lg border p-2 shadow-sm">
              <div className="text-[9px] font-medium text-muted-foreground mb-1">Recent Invoices</div>
              <div className="space-y-1">
                {[{i:"INV-091",p:"Acme Pvt Ltd",a:"₹42,000",paid:true},{i:"INV-092",p:"SpecTech Co",a:"₹18,500",paid:false}].map(r => (
                  <div key={r.i} className="flex items-center gap-1 text-[8px]">
                    <span className="text-primary font-semibold w-12">{r.i}</span>
                    <span className="text-muted-foreground flex-1 truncate">{r.p}</span>
                    <span className="font-medium">{r.a}</span>
                    <span className={`ml-1 px-1 py-0.5 rounded text-[7px] font-semibold ${r.paid ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"}`}>{r.paid ? "Paid" : "Due"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -inset-6 -z-10 bg-primary/8 blur-3xl rounded-full" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [demoLoading, setDemoLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleDemoLogin() {
    setDemoLoading(true);
    try {
      await apiRequest("POST", "/api/demo-login", {});
      setLocation("/");
      window.location.reload();
    } catch (err: any) {
      toast({ title: "Demo unavailable", description: err.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-6">
          <a href="/" className="flex items-center shrink-0">
            <img src="/swacherp-logo.png" alt="SwachERP" className="h-8 w-auto" />
          </a>

          <nav className="hidden lg:flex items-center gap-1">
            <ProductsDropdown />
            <SolutionsDropdown />
            <a href="#pricing"      className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1">Pricing</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1">Customers</a>
          </nav>

          <div className="hidden lg:flex items-center gap-2 ml-auto">
            <Button variant="ghost" size="sm" onClick={handleDemoLogin} disabled={demoLoading} data-testid="nav-demo-btn">
              {demoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Live Demo"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/auth")} data-testid="nav-login-btn">Sign In</Button>
            <Button size="sm" onClick={() => setLocation("/register-company")} data-testid="nav-register-btn">
              Start Free Trial
            </Button>
          </div>

          <button className="lg:hidden ml-auto" onClick={() => setMobileOpen(o => !o)} data-testid="nav-mobile-toggle">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t px-4 py-4 space-y-3 bg-background">
            <div className="flex flex-col gap-1 text-sm">
              {[["#modules","Features"],["#solutions","Solutions"],["#pricing","Pricing"],["#testimonials","Customers"]].map(([href, label]) => (
                <a key={label} href={href} className="py-1.5 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>{label}</a>
              ))}
            </div>
            <div className="border-t pt-3 flex flex-col gap-2">
              <Button variant="outline" onClick={() => { handleDemoLogin(); setMobileOpen(false); }}>Live Demo</Button>
              <Button variant="outline" onClick={() => { setLocation("/auth"); setMobileOpen(false); }}>Sign In</Button>
              <Button onClick={() => { setLocation("/register-company"); setMobileOpen(false); }}>Start Free Trial</Button>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b py-16 md:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                <Zap className="w-3.5 h-3.5" />
                Built for Indian Manufacturing
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.15] mb-5">
                One platform.<br />
                <span className="text-primary">Every department.</span>
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-lg">
                Production, GST invoicing, accounting, HR & payroll, CRM, and WhatsApp checklists — all connected in one cloud platform. No spreadsheets. No switching between software.
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                <Button size="lg" onClick={() => setLocation("/register-company")} data-testid="hero-start-trial-btn" className="gap-2 text-base">
                  Start Free Trial <ArrowRight className="w-4 h-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={handleDemoLogin} disabled={demoLoading} data-testid="hero-live-demo-btn" className="gap-2 text-base">
                  {demoLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Loading...</> : <><Play className="w-4 h-4" />Try Live Demo</>}
                </Button>
              </div>
              <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
                {["No credit card required", "14-day free trial", "Cancel anytime"].map(t => (
                  <div key={t} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />{t}
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden lg:block">
              <DashboardPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────────────────────── */}
      <section className="border-b bg-muted/30 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-x divide-border">
            {[
              { value: "15+", label: "Integrated modules" },
              { value: "GST", label: "Compliant invoicing" },
              { value: "100%", label: "Cloud & mobile ready" },
              { value: "WhatsApp", label: "Native integration" },
            ].map((s, i) => (
              <div key={s.label} className={i > 0 ? "pl-6" : ""}>
                <div className="text-2xl font-bold text-primary">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STRENGTHS ───────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">What makes SwachERP genuinely different</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">
              Not just a feature list — these are real capabilities that no other Indian manufacturing ERP offers in a single product.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {STRENGTHS.map(s => (
              <div key={s.title} className={`rounded-2xl border p-6 ${s.color}`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.iconColor}`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.tag}</span>
                    <h3 className="font-bold text-base leading-snug mt-0.5">{s.title}</h3>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{s.desc}</p>
                <ul className="space-y-2">
                  {s.points.map(p => (
                    <li key={p} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />{p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE DEEP-DIVES ──────────────────────────────────────────── */}
      <section className="py-16 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">

          {/* 1 — Operations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Operations</span>
              <h2 className="text-2xl md:text-3xl font-bold mt-2 mb-4 leading-snug">From raw material to finished goods dispatch</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">Create BOMs, raise production orders, and track consumption in real time. FIFO batch allocation ensures accurate costing. Every production run creates a journal entry automatically.</p>
              <ul className="space-y-3">
                {["BOM-driven production orders with multi-level support","FIFO batch & lot tracking for raw materials","Variance reporting vs. standard cost per production run","Invoice-first dispatch with tamper-proof digital gatepass"].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />{f}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border bg-muted/30 p-6">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Factory className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Production Order #PO-0042</p>
                  <p className="text-xs text-muted-foreground">Precision Shaft — 50mm</p>
                </div>
                <span className="ml-auto text-xs bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 px-2.5 py-1 rounded-full font-semibold">In Progress</span>
              </div>
              {[
                { label: "Qty Planned",    value: "500 pcs" },
                { label: "Qty Completed",  value: "312 pcs (62%)" },
                { label: "Raw Material",   value: "MS Rod 50mm — 48 kg used" },
                { label: "Variance",       value: "−1.2% vs standard" },
                { label: "Journal Entry",  value: "Auto-posted ✓" },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm py-2.5 border-b last:border-0">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-medium">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 2 — WhatsApp */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div className="order-2 lg:order-1 rounded-2xl border bg-muted/30 p-6">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b">
                <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-950 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">CNC Machine #3 — Startup Checklist</p>
                  <p className="text-xs text-muted-foreground">Ravi Kumar · Today 7:12 AM</p>
                </div>
                <span className="ml-auto text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-semibold">AI Verified</span>
              </div>
              <div className="space-y-3.5">
                {[
                  { q: "Is the coolant level adequate?",  a: "Yes, filled to max line" },
                  { q: "Any unusual vibrations?",         a: "No vibrations observed" },
                  { q: "Safety guard in place?",          a: "Guard installed and locked" },
                  { q: "Oil pressure reading?",           a: "42 psi — within normal range" },
                ].map(item => (
                  <div key={item.q} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">{item.q}</p>
                      <p className="text-sm font-medium mt-0.5">{item.a}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">WhatsApp Integration</span>
              <h2 className="text-2xl md:text-3xl font-bold mt-2 mb-4 leading-snug">Machine checklists on WhatsApp — no app needed</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">Operators receive startup checklists on WhatsApp. Answers are AI-interpreted and logged in real time. Supervisors get instant alerts for failed or missed checks.</p>
              <ul className="space-y-3">
                {["Daily machine startup & shutdown checklists","AI interprets free-text operator responses","Instant supervisor alert for failed checks","Full audit trail — who, when, which machine"].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />{f}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* 3 — HR */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">HR & Compliance</span>
              <h2 className="text-2xl md:text-3xl font-bold mt-2 mb-4 leading-snug">Full HR & payroll — not a bolt-on</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">Complete employee lifecycle built into the platform — not a separate product. Attendance, leaves, salary structures, PF/ESI, TDS, payslips, Form 16, and the Employee Self-Service portal are all included.</p>
              <ul className="space-y-3">
                {["Configurable salary structures with arrears handling","Automated PF, ESI, and TDS deduction every month","Form 16 generation and e-distribution to employees","Employee Self-Service portal for leaves, payslips & tax"].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />{f}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border bg-muted/30 p-6">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <IndianRupee className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Payslip — April 2025</p>
                  <p className="text-xs text-muted-foreground">Ravi Kumar · EMP-042</p>
                </div>
              </div>
              {[
                { label: "Basic Salary",       value: "₹25,000", type: "earn" },
                { label: "HRA",                value: "₹10,000", type: "earn" },
                { label: "Special Allowance",  value: "₹5,000",  type: "earn" },
                { label: "PF Deduction",       value: "−₹3,000", type: "ded"  },
                { label: "TDS",                value: "−₹1,200", type: "ded"  },
                { label: "Net Pay",            value: "₹35,800", type: "net"  },
              ].map(r => (
                <div key={r.label} className={`flex justify-between text-sm py-2.5 border-b last:border-0 ${r.type === "net" ? "font-semibold" : ""}`}>
                  <span className={r.type === "ded" ? "text-red-500" : "text-muted-foreground"}>{r.label}</span>
                  <span className={r.type === "net" ? "text-primary font-bold" : r.type === "ded" ? "text-red-500" : "font-medium"}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── ALL MODULES ─────────────────────────────────────────────────── */}
      <section id="modules" className="py-16 border-t bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Every module your factory needs</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">16 integrated modules. One login. One database. No integrations to maintain.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {MODULES.map(m => (
              <div key={m.label} className="flex items-start gap-3 p-4 rounded-xl border bg-background hover-elevate">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <m.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm leading-snug">{m.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── API HUB SHOWCASE ────────────────────────────────────────────── */}
      <section className="py-20 border-t overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                <Key className="w-3.5 h-3.5" />
                Professional & Enterprise
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4 leading-snug">
                Build on SwachERP with a<br className="hidden md:block" /> full REST API platform
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Every module in SwachERP — invoicing, inventory, production, HR — exposes clean REST APIs. Create scoped keys per integration, test endpoints live without leaving the browser, and track every call with full request logs and usage analytics.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  { icon: Key,      text: "Scoped API keys — limit each key to exactly the modules it needs" },
                  { icon: Code2,    text: "Live \"Try It\" tester — fill params and fire real requests in-browser" },
                  { icon: BarChart3,text: "Usage analytics — calls per day, top endpoints, error rates" },
                  { icon: Webhook,  text: "Register custom endpoints — tag your own APIs alongside built-ins" },
                ].map(pt => (
                  <li key={pt.text} className="flex items-start gap-3 text-sm">
                    <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <pt.icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-muted-foreground leading-snug">{pt.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: code mockup */}
            <div className="rounded-2xl border bg-zinc-950 overflow-hidden shadow-xl">
              {/* window chrome */}
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-zinc-800">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="ml-3 text-xs text-zinc-500 font-mono">SwachERP API Hub — Try It</span>
              </div>
              <div className="p-5 font-mono text-xs space-y-4">
                {/* Auth header */}
                <div>
                  <p className="text-zinc-500 mb-1">// Authentication</p>
                  <p className="text-zinc-300">
                    <span className="text-purple-400">Authorization</span>
                    <span className="text-zinc-400">: Bearer </span>
                    <span className="text-green-400">swacherp_sk_••••••••6f3a</span>
                  </p>
                </div>
                {/* Request 1 */}
                <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-1.5 py-0.5 rounded">GET</span>
                    <span className="text-zinc-300">/api/invoices</span>
                    <span className="text-zinc-600 ml-auto">Invoicing</span>
                  </div>
                  <p className="text-zinc-500">?status=<span className="text-amber-400">paid</span>&amp;from=<span className="text-amber-400">2025-01-01</span></p>
                  <div className="flex items-center gap-2 pt-1 border-t border-zinc-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <span className="text-green-400">200 OK</span>
                    <span className="text-zinc-600 ml-auto">124ms · 48 records</span>
                  </div>
                </div>
                {/* Request 2 */}
                <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="bg-green-500/20 text-green-400 text-xs font-bold px-1.5 py-0.5 rounded">POST</span>
                    <span className="text-zinc-300">/api/invoices</span>
                    <span className="text-zinc-600 ml-auto">Invoicing</span>
                  </div>
                  <p className="text-zinc-500">body: <span className="text-amber-400">&#123; "party": "Acme Ltd", … &#125;</span></p>
                  <div className="flex items-center gap-2 pt-1 border-t border-zinc-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <span className="text-green-400">201 Created</span>
                    <span className="text-zinc-600 ml-auto">89ms · INV-0412</span>
                  </div>
                </div>
                {/* Request 3 */}
                <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-1.5 py-0.5 rounded">GET</span>
                    <span className="text-zinc-300">/api/inventory/items</span>
                    <span className="text-zinc-600 ml-auto">Inventory</span>
                  </div>
                  <p className="text-zinc-500">?sku=<span className="text-amber-400">RM-001</span>&amp;warehouse=<span className="text-amber-400">Main</span></p>
                  <div className="flex items-center gap-2 pt-1 border-t border-zinc-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <span className="text-green-400">200 OK</span>
                    <span className="text-zinc-600 ml-auto">67ms · qty: 1,240</span>
                  </div>
                </div>
              </div>
              {/* footer stats */}
              <div className="flex items-center gap-6 px-5 py-3 border-t border-zinc-800 bg-zinc-900/50">
                <div className="text-center">
                  <p className="text-xs font-bold text-zinc-200">2,847</p>
                  <p className="text-zinc-600" style={{ fontSize: '10px' }}>calls today</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-green-400">99.8%</p>
                  <p className="text-zinc-600" style={{ fontSize: '10px' }}>success rate</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-zinc-200">94ms</p>
                  <p className="text-zinc-600" style={{ fontSize: '10px' }}>avg latency</p>
                </div>
                <div className="ml-auto">
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full font-medium">Live</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY KINTO ───────────────────────────────────────────────────── */}
      <section id="solutions" className="py-16 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Why Indian manufacturers choose SwachERP</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">Designed from scratch for how Indian factories actually work — not a global ERP adapted for India.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Globe,          title: "GST-ready from day one",       desc: "GSTIN-compliant invoices, e-way bills, credit notes and debit notes. GSTR export-ready reports instantly." },
              { icon: Smartphone,     title: "WhatsApp-first operations",    desc: "Operators receive machine checklists on WhatsApp. AI interprets responses. No new app download needed." },
              { icon: TrendingUp,     title: "Real-time MIS dashboards",     desc: "Executive KPIs, production efficiency, inventory turnover, and cash flow — all visible without Excel." },
              { icon: Shield,         title: "Granular role-based access",   desc: "Screen-level permissions for every user. Sensitive financial data visible only to the right people." },
              { icon: Building2,      title: "Multi-company ready",          desc: "Fully isolated data per company — ideal for group companies, holding structures, and sister units." },
              { icon: Award,          title: "Full statutory compliance",    desc: "PF, ESI, TDS, Form 16, and labour law compliance built-in. No third-party payroll tool needed." },
              { icon: HeadphonesIcon, title: "Guided onboarding",           desc: "We help you migrate masters, configure salary structures, and train your team. Not just a login link." },
              { icon: Link2,          title: "No integration overhead",      desc: "Production, accounts, HR, and CRM share one database. No Zapier. No CSV exports. No double-entry." },
              { icon: BookOpen,       title: "Employee Self-Service portal", desc: "Staff view payslips, apply for leave, check attendance, and submit tax declarations on their own." },
              { icon: Key,            title: "Open API platform",            desc: "Every module exposes secure REST APIs. Create scoped keys, test endpoints live, and track every call — built right into the platform." },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-16 border-t bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Simple, transparent pricing</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">All plans include a 14-day free trial. No credit card needed. Scale users as your team grows.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLANS.map(plan => (
              <div key={plan.name} className={`relative rounded-2xl border p-6 flex flex-col bg-background ${plan.highlight ? "border-primary ring-1 ring-primary/20 shadow-lg" : ""}`}>
                {plan.tag && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">{plan.tag}</span>
                  </div>
                )}
                <div className="mb-6">
                  <p className="font-bold text-base">{plan.name}</p>
                  <div className="flex items-end gap-1 mt-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm mb-1">{plan.period}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">+ ₹100–₹150 per additional user/month</p>
                </div>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />{f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant={plan.highlight ? "default" : "outline"} onClick={() => setLocation("/register-company")} data-testid={`pricing-cta-${plan.name.toLowerCase()}`}>
                  Start Free Trial <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-8">
            Need a custom plan?{" "}
            <a href="mailto:hello@kintoops.in" className="text-primary underline underline-offset-2">Contact us</a>
          </p>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────── */}
      <section id="testimonials" className="py-16 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Trusted by Indian manufacturers</h2>
            <p className="text-muted-foreground text-sm">Real feedback from production floors, finance teams, and HR departments</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="rounded-2xl border bg-background p-6 flex flex-col gap-4">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-primary text-primary" />)}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground flex-1">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-3 border-t">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">{t.name[0]}</div>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}, {t.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
      <section className="py-20 border-t bg-primary/5">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to modernise your factory?</h2>
          <p className="text-muted-foreground text-sm mb-8 max-w-lg mx-auto">14-day free trial. No credit card. No commitment. We will help you get set up.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" onClick={() => setLocation("/register-company")} data-testid="footer-cta-btn" className="gap-2">
              Create Your Free Account <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={handleDemoLogin} disabled={demoLoading} data-testid="footer-demo-btn" className="gap-2">
              {demoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Try Live Demo
            </Button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t bg-muted/30 pt-12 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-3">
                <img src="/swacherp-logo.png" alt="SwachERP" className="h-8 w-auto" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">Cloud ERP for Indian manufacturing — GST-compliant, WhatsApp-connected, and HR-ready.</p>
            </div>
            <div>
              <p className="font-semibold text-xs uppercase tracking-wide mb-4">Products</p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {["Production & BOM","Inventory Control","GST Invoicing","Accounting","HR & Payroll","CRM","MIS Analytics","WhatsApp Integration"].map(l => (
                  <li key={l}><a href="#modules" className="hover:text-foreground transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-xs uppercase tracking-wide mb-4">Solutions</p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {NAV_SOLUTIONS_BY_INDUSTRY.map(s => (
                  <li key={s.label}><span className="hover:text-foreground transition-colors cursor-pointer">{s.label}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-xs uppercase tracking-wide mb-4">Company</p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {[["#pricing","Pricing"],["#testimonials","Customers"],["/demo","Book a Demo"],["mailto:hello@kintoops.in","Contact Us"]].map(([href, label]) => (
                  <li key={label}><a href={href} className="hover:text-foreground transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-xs uppercase tracking-wide mb-4">Account</p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {[["/auth","Sign In"],["/register-company","Start Free Trial"],["/ess","ESS Portal"]].map(([href, label]) => (
                  <li key={label}><a href={href} className="hover:text-foreground transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t pt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} SwachERP. Cleaner Business. Better Future.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="mailto:hello@kintoops.in" className="hover:text-foreground transition-colors">hello@kintoops.in</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
