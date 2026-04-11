import { useState } from "react";
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
  HeadphonesIcon, LayoutDashboard, Briefcase, Settings,
} from "lucide-react";

// ── Data ─────────────────────────────────────────────────────────────────────

const MODULES = [
  { icon: Factory,         label: "Production & BOM",      desc: "Manufacturing orders, BOM, variance tracking" },
  { icon: Package,         label: "Inventory Control",     desc: "Raw material & FG with FIFO batch allocation" },
  { icon: ShoppingCart,    label: "Purchase Orders",       desc: "Vendor management, GRN and debit notes" },
  { icon: FileText,        label: "GST Invoicing",         desc: "Tax invoices, credit notes & e-receipts" },
  { icon: Truck,           label: "Dispatch & Gatepasses", desc: "Invoice-first dispatch, digital signatures" },
  { icon: ClipboardList,   label: "Quality Control",       desc: "Three-stage return workflow, traceability" },
  { icon: Receipt,         label: "Accounting",            desc: "Double-entry COA, P&L, Balance Sheet" },
  { icon: BarChart3,       label: "MIS Analytics",         desc: "Executive KPIs, sales & production dashboards" },
  { icon: Wrench,          label: "Maintenance",           desc: "Machine schedules, checklists, spare parts" },
  { icon: MessageCircle,   label: "WhatsApp Integration",  desc: "Machine startup & checklists on WhatsApp" },
  { icon: IndianRupee,     label: "Expenses & Cash",       desc: "Daily cash register with voucher printing" },
  { icon: Layers,          label: "Document Management",   desc: "Versioned documents with expiry alerts" },
  { icon: Target,          label: "CRM",                   desc: "Lead pipeline, follow-ups, conversions" },
  { icon: UserCheck,       label: "HR & Payroll",          desc: "Attendance, leaves, payroll, TDS, Form 16" },
  { icon: MonitorSmartphone, label: "Employee Self-Service", desc: "Payslips, leaves & tax declarations" },
];

const BY_TEAM = [
  { icon: Briefcase,    label: "Owner / MD",         desc: "Full business overview, P&L, MIS dashboards and key decisions" },
  { icon: Receipt,      label: "Finance & Accounts", desc: "GST invoicing, accounting, TDS, cash register and reports" },
  { icon: UserCheck,    label: "HR Manager",         desc: "Attendance, leaves, payroll, compliance and ESS portal" },
  { icon: Factory,      label: "Operations Head",    desc: "Production, inventory, dispatch, quality and maintenance" },
  { icon: Target,       label: "Sales Team",         desc: "CRM lead pipeline, follow-ups, invoices and customer receipts" },
  { icon: Settings,     label: "IT / Admin",         desc: "User management, role permissions, company settings" },
];

const BY_INDUSTRY = [
  { label: "Auto Components",       desc: "BOM traceability, quality control, vendor GRN" },
  { label: "Engineering Goods",     desc: "Job cards, job work, subcontracting, dispatch" },
  { label: "Food & Beverages",      desc: "Batch tracking, FSSAI documents, expiry alerts" },
  { label: "Fabrication Shops",     desc: "Job cards, material planning, dispatch gatepasses" },
  { label: "Plastic & Packaging",   desc: "Formula BOMs, raw material costing, wastage tracking" },
  { label: "HR & Services",         desc: "Payroll, attendance, ESS portal, TDS compliance" },
];

const BY_SIZE = [
  { label: "Growing SMEs",          desc: "5–20 users, easy onboarding, all essential modules" },
  { label: "Mid-size Manufacturers", desc: "15–50 users, production + HR + accounting" },
  { label: "Enterprise & Groups",   desc: "Custom plans, dedicated support, multi-plant ready" },
];

const PLANS = [
  {
    name: "Basic", price: "₹999", period: "/month", highlight: false, tag: "",
    features: ["5 users included", "GST invoicing & receipts", "Inventory management", "Purchase & sales orders", "Gatepasses & dispatch", "Expenses & documents", "Email support"],
  },
  {
    name: "Professional", price: "₹1,499", period: "/month", highlight: true, tag: "Most Popular",
    features: ["15 users included", "All Basic features", "Production & BOM tracking", "Double-entry accounting", "MIS analytics dashboards", "CRM lead management", "WhatsApp checklists", "Preventive maintenance", "Priority support"],
  },
  {
    name: "Enterprise", price: "₹2,599", period: "/month", highlight: false, tag: "",
    features: ["20 users included", "All Professional features", "HR & Payroll module", "Employee Self-Service portal", "TDS & compliance (Form 16)", "Recruitment management", "Custom branding", "Dedicated support"],
  },
];

const TESTIMONIALS = [
  { name: "Rajesh Sharma", company: "Precision Parts Mfg.", role: "Director", text: "Real-time inventory and GST invoicing in one place. We cut reporting time by 70% within the first month." },
  { name: "Meera Patel",   company: "Alpha Industries",     role: "CFO",      text: "Automated TDS calculations and payslip delivery saved us days every month. Exceptional product." },
  { name: "Suresh Kumar",  company: "Bharat Engineering",   role: "Ops Head", text: "From purchase orders to dispatch gatepasses, everything flows seamlessly. Team adopted it in a week." },
];

// ── Dashboard preview ─────────────────────────────────────────────────────────
function DashboardPreview() {
  return (
    <div className="relative w-full max-w-2xl mx-auto select-none pointer-events-none" aria-hidden>
      <div className="rounded-2xl border bg-white shadow-2xl overflow-hidden text-xs dark:bg-zinc-900">
        {/* Window chrome */}
        <div className="bg-gray-100 dark:bg-zinc-800 px-4 py-2.5 flex items-center gap-2 border-b">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-white dark:bg-zinc-700 rounded px-3 py-0.5 text-[10px] text-muted-foreground w-48 mx-auto text-center">
              ops.kintowater.com
            </div>
          </div>
        </div>
        <div className="flex h-52">
          {/* Sidebar */}
          <div className="w-32 bg-gray-50 dark:bg-zinc-800 border-r px-2 py-3 space-y-0.5 shrink-0">
            {["Dashboard", "Invoicing", "Inventory", "Production", "Purchase", "HR & Payroll", "Accounting", "CRM", "Reports"].map((item, i) => (
              <div key={item} className={`px-2 py-1 rounded text-[9px] font-medium truncate flex items-center gap-1 ${i === 0 ? "bg-primary text-white" : "text-muted-foreground"}`}>
                {item}
              </div>
            ))}
          </div>
          {/* Main */}
          <div className="flex-1 p-3 bg-gray-50/50 dark:bg-zinc-900 space-y-2 overflow-hidden">
            <div className="text-[10px] font-semibold text-foreground mb-1">Good morning, Rajesh</div>
            {/* KPI cards */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: "Revenue", value: "₹8.4L", up: true },
                { label: "Orders", value: "142", up: true },
                { label: "Stock Value", value: "₹3.2L", up: false },
                { label: "Pending", value: "18", up: false },
              ].map(k => (
                <div key={k.label} className="bg-white dark:bg-zinc-800 rounded border p-1.5 shadow-sm">
                  <div className="text-[9px] text-muted-foreground">{k.label}</div>
                  <div className="text-xs font-bold text-foreground mt-0.5">{k.value}</div>
                </div>
              ))}
            </div>
            {/* Chart */}
            <div className="bg-white dark:bg-zinc-800 rounded border p-2 shadow-sm">
              <div className="text-[9px] font-medium text-muted-foreground mb-1.5">Monthly Revenue</div>
              <div className="flex items-end gap-0.5 h-10">
                {[35, 55, 40, 70, 48, 85, 60, 90, 52, 78, 68, 95].map((h, i) => (
                  <div key={i} className="flex-1 bg-primary/70 rounded-sm" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            {/* Table */}
            <div className="bg-white dark:bg-zinc-800 rounded border p-2 shadow-sm">
              <div className="text-[9px] font-medium text-muted-foreground mb-1">Recent Invoices</div>
              <div className="space-y-1">
                {[
                  { inv: "INV-091", party: "Acme Pvt Ltd", amt: "₹42,000", paid: true },
                  { inv: "INV-092", party: "SpecTech Co",  amt: "₹18,500", paid: false },
                ].map(r => (
                  <div key={r.inv} className="flex items-center gap-1 text-[8px]">
                    <span className="text-primary font-semibold w-12">{r.inv}</span>
                    <span className="text-muted-foreground flex-1 truncate">{r.party}</span>
                    <span className="font-medium">{r.amt}</span>
                    <span className={`ml-1 px-1 py-0.5 rounded text-[7px] font-medium ${r.paid ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" : "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400"}`}>{r.paid ? "Paid" : "Due"}</span>
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

// ── Main ─────────────────────────────────────────────────────────────────────
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-8">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Factory className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm">Kinto Smart Ops</span>
          </a>
          {/* Desktop links */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#modules"      className="hover:text-foreground transition-colors">Features</a>
            <a href="#solutions"    className="hover:text-foreground transition-colors">Solutions</a>
            <a href="#pricing"      className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">Customers</a>
          </nav>
          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-2 ml-auto">
            <Button variant="ghost" size="sm" onClick={handleDemoLogin} disabled={demoLoading} data-testid="nav-demo-btn">
              {demoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Live Demo"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/auth")} data-testid="nav-login-btn">Sign In</Button>
            <Button size="sm" onClick={() => setLocation("/register-company")} data-testid="nav-register-btn">
              Start Free Trial
            </Button>
          </div>
          {/* Mobile toggle */}
          <button className="md:hidden ml-auto" onClick={() => setMobileOpen(o => !o)} data-testid="nav-mobile-toggle">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t px-4 py-4 space-y-3 bg-background">
            <div className="flex flex-col gap-1 text-sm">
              {[["#modules","Features"],["#solutions","Solutions"],["#pricing","Pricing"],["#testimonials","Customers"]].map(([href,label]) => (
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
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full mb-6">
                <Zap className="w-3.5 h-3.5" />
                Built for Indian Manufacturing
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight mb-5">
                One platform.<br />
                <span className="text-primary">Every department.</span>
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                Production, GST invoicing, accounting, HR & payroll, CRM, and WhatsApp checklists — all connected. No more switching between spreadsheets and software.
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                <Button size="lg" onClick={() => setLocation("/register-company")} data-testid="hero-start-trial-btn" className="gap-2">
                  Start Free Trial <ArrowRight className="w-4 h-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={handleDemoLogin} disabled={demoLoading} data-testid="hero-live-demo-btn" className="gap-2">
                  {demoLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Loading...</> : <><Play className="w-4 h-4" />Try Live Demo</>}
                </Button>
              </div>
              <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
                {["No credit card required", "14-day free trial", "Cancel anytime"].map(t => (
                  <div key={t} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    {t}
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

      {/* ── STATS BAR ───────────────────────────────────────────────────── */}
      <section className="border-b py-7 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-x divide-border">
            {[
              { value: "15+", label: "Integrated modules" },
              { value: "GST", label: "Compliant invoicing" },
              { value: "100%", label: "Cloud & mobile-ready" },
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

      {/* ── FEATURE DEEP-DIVES ──────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">

          {/* 1 — Operations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Operations</span>
              <h2 className="text-2xl md:text-3xl font-bold mt-2 mb-4 leading-snug">From raw material to finished goods dispatch</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">Create BOMs, raise production orders, and track material consumption in real time. FIFO batch allocation ensures accurate costing, and every run creates a traceable journal entry automatically.</p>
              <ul className="space-y-3">
                {["BOM-driven production orders","FIFO batch & lot tracking","Variance reporting vs. standard cost","Invoice-first dispatch with digital gatepass"].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" />{f}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border bg-muted/30 p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <Factory className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Production Order #PO-0042</p>
                  <p className="text-xs text-muted-foreground">Precision Shaft — 50mm</p>
                </div>
                <span className="ml-auto text-xs bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">In Progress</span>
              </div>
              {[
                { label: "Qty Planned",    value: "500 pcs" },
                { label: "Qty Completed",  value: "312 pcs" },
                { label: "Raw Material",   value: "MS Rod 50mm — 48 kg" },
                { label: "Variance",       value: "−1.2% vs standard" },
                { label: "Journal Entry",  value: "Auto-posted ✓" },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm py-2 border-b last:border-0">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-medium">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 2 — WhatsApp */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div className="order-2 lg:order-1 rounded-xl border bg-muted/30 p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-md bg-green-100 dark:bg-green-950 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">CNC Machine #3 — Startup Checklist</p>
                  <p className="text-xs text-muted-foreground">Ravi Kumar · Today 7:12 AM</p>
                </div>
                <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">AI Verified</span>
              </div>
              <div className="space-y-3">
                {[
                  { q: "Is the coolant level adequate?",  a: "Yes, filled to max line" },
                  { q: "Any unusual vibrations?",         a: "No vibrations observed" },
                  { q: "Safety guard in place?",          a: "Guard installed and locked" },
                  { q: "Oil pressure reading?",           a: "42 psi — within normal range" },
                ].map(item => (
                  <div key={item.q} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-muted-foreground text-xs">{item.q}</p>
                      <p className="font-medium text-xs mt-0.5">{item.a}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">WhatsApp Integration</span>
              <h2 className="text-2xl md:text-3xl font-bold mt-2 mb-4 leading-snug">Machine checklists on WhatsApp — no app needed</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">Operators receive startup checklists directly on WhatsApp. Answers are AI-interpreted and logged automatically. Supervisors get instant alerts for any failed check.</p>
              <ul className="space-y-3">
                {["Daily machine startup checklists","AI-powered answer interpretation","Supervisor alerts for failed checks","Full audit trail for compliance"].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" />{f}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* 3 — HR */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">HR & Compliance</span>
              <h2 className="text-2xl md:text-3xl font-bold mt-2 mb-4 leading-snug">Full HR & payroll — from hire to full & final</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">Manage the complete employee lifecycle. Attendance, leave approvals, salary structures, PF/ESI computation, TDS projection, payslips, and F&F settlements — zero manual Excel.</p>
              <ul className="space-y-3">
                {["Attendance with biometric or manual entry","Configurable salary structures & components","Auto PF, ESI & TDS deduction","Form 16 generation & employee ESS portal"].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" />{f}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border bg-muted/30 p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
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
                { label: "PF Deduction",       value: "−₹3,000", type: "ded" },
                { label: "TDS",                value: "−₹1,200", type: "ded" },
                { label: "Net Pay",            value: "₹35,800", type: "net" },
              ].map(r => (
                <div key={r.label} className={`flex justify-between text-sm py-2 border-b last:border-0 ${r.type === "net" ? "font-semibold" : ""}`}>
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
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Everything your factory needs — in one platform</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">15 integrated modules. One login. One database. No integrations to maintain.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {MODULES.map((m) => (
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

      {/* ── SOLUTIONS ───────────────────────────────────────────────────── */}
      <section id="solutions" className="py-16 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Built for your team, your industry, your size</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">Kinto adapts to how your business works — whether you are a 10-person shop or a 200-person manufacturer.</p>
          </div>

          {/* By Team */}
          <div className="mb-12">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-5">By Role</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BY_TEAM.map(s => (
                <div key={s.label} className="flex items-start gap-3 p-4 rounded-xl border bg-muted/30">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <s.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{s.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By Industry */}
          <div className="mb-12">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-5">By Industry</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {BY_INDUSTRY.map(s => (
                <div key={s.label} className="rounded-xl border bg-background p-4 text-center hover-elevate">
                  <p className="font-semibold text-sm">{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* By Size */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-5">By Company Size</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {BY_SIZE.map(s => (
                <div key={s.label} className="rounded-xl border bg-muted/30 p-5">
                  <p className="font-semibold text-sm">{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY KINTO ───────────────────────────────────────────────────── */}
      <section className="py-16 border-t bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Why Indian manufacturers choose Kinto</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">Not a global ERP retrofitted for India — designed from scratch for the way Indian factories actually work.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Globe,           title: "GST-ready from day one",       desc: "GSTIN-compliant invoices, e-way bills, credit notes, and debit notes. Export GST reports instantly." },
              { icon: Smartphone,      title: "WhatsApp-first workflows",      desc: "Operators get checklists on WhatsApp. Answers are AI-interpreted and logged — no app download." },
              { icon: TrendingUp,      title: "Real-time MIS dashboards",      desc: "Executive KPIs, production efficiency, inventory turnover, and cash flow — without Excel." },
              { icon: Shield,          title: "Role-based access control",     desc: "Screen-level permissions ensure sensitive financial data is visible only to the right people." },
              { icon: Building2,       title: "Multi-company ready",           desc: "Each company gets a fully isolated data space — ideal for group companies and holding structures." },
              { icon: Award,           title: "Compliant HR & payroll",        desc: "PF, ESI, TDS, Form 16, and labour law compliance built-in. No third-party payroll software needed." },
              { icon: HeadphonesIcon,  title: "Guided onboarding",             desc: "We help you migrate masters, configure salary structures, and train your team — not just hand you a login." },
              { icon: LayoutDashboard, title: "One login for everything",      desc: "No integrations to maintain. Production, accounts, HR, CRM — one database, one source of truth." },
              { icon: BookOpen,        title: "Employee Self-Service portal",  desc: "Staff view payslips, apply for leave, check attendance, and submit tax declarations independently." },
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
      <section id="pricing" className="py-16 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Simple, transparent pricing</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">All plans include a 14-day free trial. No credit card needed. Scale your user count as your team grows.</p>
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
      <section id="testimonials" className="py-16 border-t bg-muted/20">
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
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {t.name[0]}
                  </div>
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
          <p className="text-muted-foreground text-sm mb-8 max-w-lg mx-auto">Start your 14-day free trial — no credit card, no commitment. We will help you get set up.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" onClick={() => setLocation("/register-company")} data-testid="footer-cta-btn" className="gap-2">
              Create Your Free Account <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={handleDemoLogin} disabled={demoLoading} data-testid="footer-demo-btn" className="gap-2">
              {demoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Try Live Demo
            </Button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t bg-muted/30 pt-12 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                  <Factory className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-sm">Kinto Smart Ops</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">Cloud ERP for Indian manufacturing — GST-compliant, WhatsApp-connected, and HR-ready.</p>
            </div>
            <div>
              <p className="font-semibold text-xs uppercase tracking-wide mb-4">Products</p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {["Production & BOM","Inventory Control","GST Invoicing","Accounting","HR & Payroll","CRM","MIS Analytics"].map(l => (
                  <li key={l}><a href="#modules" className="hover:text-foreground transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-xs uppercase tracking-wide mb-4">Solutions</p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {BY_INDUSTRY.map(s => (
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
            <p>© {new Date().getFullYear()} Kinto Smart Ops. Made in India.</p>
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
