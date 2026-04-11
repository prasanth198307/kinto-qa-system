import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Factory, Package, ShoppingCart, FileText, BarChart3, Wrench,
  MessageCircle, Shield, Globe, Layers, ArrowRight, CheckCircle2,
  Smartphone, TrendingUp, Users, ClipboardList, Truck, Receipt,
  IndianRupee, Star, ChevronRight, Play, Loader2, Target, UserCheck,
  BookOpen, MonitorSmartphone, ChevronDown, Menu, X, Zap,
  Building2, Award, HeadphonesIcon, LayoutDashboard,
} from "lucide-react";

const NAV_PRODUCTS = [
  { icon: Factory, label: "Production & BOM", desc: "Manufacturing orders, BOMs, variance tracking" },
  { icon: Package, label: "Inventory Control", desc: "Raw materials, FG, FIFO batch allocation" },
  { icon: FileText, label: "GST Invoicing", desc: "Tax invoices, credit notes, receipts" },
  { icon: Receipt, label: "Double-Entry Accounting", desc: "COA, P&L, Balance Sheet, journals" },
  { icon: UserCheck, label: "HR & Payroll", desc: "Attendance, leaves, payroll, TDS, Form 16" },
  { icon: Target, label: "CRM", desc: "Lead pipeline, follow-ups, conversions" },
  { icon: Wrench, label: "Preventive Maintenance", desc: "Machine schedules, checklists, spare parts" },
  { icon: BarChart3, label: "MIS Analytics", desc: "Executive KPIs, dashboards, reports" },
];

const NAV_SOLUTIONS = [
  { label: "Auto Components", desc: "BOM + quality traceability" },
  { label: "Food & Beverages", desc: "Batch tracking + FSSAI compliance" },
  { label: "Engineering Goods", desc: "Job work, subcontracting" },
  { label: "Fabrication Shops", desc: "Job cards, material planning" },
  { label: "Chemical Manufacturing", desc: "Formula BOMs, hazard docs" },
  { label: "HR-Only Companies", desc: "Payroll, attendance, ESS portal" },
];

const modules = [
  { icon: Factory, label: "Production", desc: "BOM-driven manufacturing orders with variance tracking" },
  { icon: Package, label: "Inventory", desc: "Raw material & finished goods with FIFO batching" },
  { icon: ShoppingCart, label: "Purchase Orders", desc: "Vendor management, GRN and debit notes" },
  { icon: FileText, label: "GST Invoicing", desc: "GST-compliant invoices, credit notes & receipts" },
  { icon: Truck, label: "Dispatch", desc: "Invoice-first dispatch with digital gatepasses" },
  { icon: ClipboardList, label: "Quality Control", desc: "Three-stage return workflow with traceability" },
  { icon: Receipt, label: "Accounting", desc: "Double-entry COA, P&L and Balance Sheet" },
  { icon: BarChart3, label: "MIS Analytics", desc: "Executive KPIs, sales & production dashboards" },
  { icon: Wrench, label: "Maintenance", desc: "Machine schedules, checklists & spare parts" },
  { icon: MessageCircle, label: "WhatsApp", desc: "Machine startup & checklists via WhatsApp" },
  { icon: IndianRupee, label: "Expenses", desc: "Daily cash register with voucher printing" },
  { icon: Layers, label: "Documents", desc: "Versioned documents with expiry alerts" },
  { icon: Target, label: "CRM", desc: "Kanban pipeline, lead tracking & follow-ups" },
  { icon: UserCheck, label: "HR & Payroll", desc: "Employees, attendance, payroll, TDS & recruitment" },
  { icon: MonitorSmartphone, label: "ESS Portal", desc: "Payslips, leaves & tax declarations for staff" },
];

const plans = [
  {
    name: "Basic",
    price: "₹999",
    period: "/month",
    highlight: false,
    tag: "",
    features: ["5 users included", "GST invoicing & receipts", "Inventory management", "Purchase & sales orders", "Gatepasses & dispatch", "Expenses & documents", "Email support"],
  },
  {
    name: "Professional",
    price: "₹1,499",
    period: "/month",
    highlight: true,
    tag: "Most Popular",
    features: ["15 users included", "All Basic features", "Production & BOM tracking", "Double-entry accounting", "MIS analytics dashboards", "CRM lead management", "WhatsApp checklists", "Preventive maintenance", "Priority support"],
  },
  {
    name: "Enterprise",
    price: "₹2,599",
    period: "/month",
    highlight: false,
    tag: "",
    features: ["20 users included", "All Professional features", "HR & Payroll module", "Employee Self-Service portal", "TDS & compliance (Form 16)", "Recruitment management", "Custom branding", "Dedicated support"],
  },
];

const testimonials = [
  { name: "Rajesh Sharma", company: "Precision Parts Mfg.", role: "Director", text: "Kinto Smart Ops transformed how we track production. Real-time inventory and GST invoicing in one place — we cut reporting time by 70%." },
  { name: "Meera Patel", company: "Alpha Industries", role: "CFO", text: "The HR & Payroll module with automated TDS calculations and payslip delivery saved us days every month. Excellent product." },
  { name: "Suresh Kumar", company: "Bharat Engineering", role: "Operations Head", text: "From purchase orders to dispatch gatepasses, everything flows seamlessly. Our team adopted it within a week without any training." },
];

const stats = [
  { value: "15+", label: "Integrated modules" },
  { value: "100%", label: "Cloud-based" },
  { value: "GST", label: "Compliant invoicing" },
  { value: "WhatsApp", label: "Native integration" },
];

// ── Dropdown menu component ───────────────────────────────────────────────────
function NavDropdown({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
        onClick={() => setOpen(o => !o)}
      >
        {label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-background border rounded-lg shadow-lg p-2 min-w-[260px]">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Dashboard preview mock ────────────────────────────────────────────────────
function DashboardMock() {
  return (
    <div className="relative w-full max-w-xl mx-auto select-none pointer-events-none" aria-hidden>
      <div className="rounded-xl border bg-background shadow-2xl overflow-hidden text-xs">
        {/* Mock topbar */}
        <div className="bg-primary/90 px-3 py-2 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-white/30" />
          <div className="w-3 h-3 rounded-full bg-white/30" />
          <div className="w-3 h-3 rounded-full bg-white/30" />
          <span className="ml-2 text-white/80 text-[10px] font-medium">Kinto Smart Ops — Dashboard</span>
        </div>
        <div className="flex">
          {/* Mock sidebar */}
          <div className="w-28 bg-muted/60 border-r px-2 py-3 space-y-1 shrink-0">
            {["Dashboard", "Invoicing", "Inventory", "Production", "Purchase", "Accounting", "HR & Payroll", "CRM", "Reports"].map((item, i) => (
              <div key={item} className={`px-2 py-1 rounded text-[9px] font-medium truncate ${i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {item}
              </div>
            ))}
          </div>
          {/* Mock content */}
          <div className="flex-1 p-3 space-y-3">
            {/* KPI row */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: "Revenue", value: "₹8.4L", color: "text-green-600" },
                { label: "Orders", value: "142", color: "text-blue-600" },
                { label: "Inventory", value: "₹3.2L", color: "text-orange-600" },
                { label: "Pending", value: "18", color: "text-red-600" },
              ].map(kpi => (
                <div key={kpi.label} className="bg-muted/50 rounded p-1.5">
                  <div className={`text-sm font-bold ${kpi.color}`}>{kpi.value}</div>
                  <div className="text-[8px] text-muted-foreground">{kpi.label}</div>
                </div>
              ))}
            </div>
            {/* Chart mock */}
            <div className="bg-muted/40 rounded p-2">
              <div className="text-[9px] font-medium mb-1.5 text-muted-foreground">Monthly Sales</div>
              <div className="flex items-end gap-1 h-12">
                {[30, 55, 40, 70, 45, 85, 60, 90, 50, 75, 65, 95].map((h, i) => (
                  <div key={i} className="flex-1 bg-primary/60 rounded-sm" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            {/* Table mock */}
            <div className="bg-muted/40 rounded p-2">
              <div className="text-[9px] font-medium mb-1.5 text-muted-foreground">Recent Invoices</div>
              <div className="space-y-1">
                {[
                  { inv: "INV-0091", party: "Acme Pvt Ltd", amt: "₹42,000", status: "Paid" },
                  { inv: "INV-0092", party: "SpecTech Co", amt: "₹18,500", status: "Due" },
                  { inv: "INV-0093", party: "Global Parts", amt: "₹67,200", status: "Paid" },
                ].map(row => (
                  <div key={row.inv} className="flex items-center justify-between text-[8px]">
                    <span className="text-primary font-medium">{row.inv}</span>
                    <span className="text-muted-foreground truncate mx-1 max-w-[60px]">{row.party}</span>
                    <span className="font-medium">{row.amt}</span>
                    <span className={`px-1 py-0.5 rounded text-[7px] font-medium ${row.status === "Paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>{row.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Glow behind mock */}
      <div className="absolute -inset-4 -z-10 bg-primary/10 blur-3xl rounded-full" />
    </div>
  );
}

// ── Main Landing Page ─────────────────────────────────────────────────────────
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
    <div className="min-h-screen bg-background text-foreground antialiased">

      {/* ── NAVBAR ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 gap-6">

            {/* Logo */}
            <a href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Factory className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-sm tracking-tight">Kinto Smart Ops</span>
            </a>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1 flex-1">
              <NavDropdown label="Products">
                <div className="grid grid-cols-2 gap-1 p-1">
                  {NAV_PRODUCTS.map(p => (
                    <div key={p.label} className="flex items-start gap-2 px-2 py-2 rounded-md hover-elevate cursor-pointer">
                      <div className="mt-0.5 w-7 h-7 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        <p.icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs font-medium leading-tight">{p.label}</div>
                        <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{p.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </NavDropdown>

              <NavDropdown label="Solutions">
                <div className="space-y-0.5 p-1">
                  {NAV_SOLUTIONS.map(s => (
                    <div key={s.label} className="px-3 py-2 rounded-md hover-elevate cursor-pointer">
                      <div className="text-xs font-medium">{s.label}</div>
                      <div className="text-[10px] text-muted-foreground">{s.desc}</div>
                    </div>
                  ))}
                </div>
              </NavDropdown>

              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1">Pricing</a>
              <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1">Customers</a>
            </nav>

            {/* Desktop CTAs */}
            <div className="hidden lg:flex items-center gap-2 ml-auto">
              <Button variant="ghost" size="sm" onClick={handleDemoLogin} disabled={demoLoading} data-testid="nav-demo-btn">
                {demoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Live Demo"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/auth")} data-testid="nav-login-btn">
                Sign In
              </Button>
              <Button size="sm" onClick={() => setLocation("/register-company")} data-testid="nav-register-btn">
                Start Free Trial
              </Button>
            </div>

            {/* Mobile hamburger */}
            <button className="lg:hidden ml-auto p-1" onClick={() => setMobileOpen(o => !o)} data-testid="nav-mobile-toggle">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t bg-background px-4 py-4 space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Products</p>
              {NAV_PRODUCTS.map(p => (
                <div key={p.label} className="flex items-center gap-2 py-1.5">
                  <p.icon className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm">{p.label}</span>
                </div>
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

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b py-14 md:py-20 lg:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-muted/20 -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left: Text */}
            <div>
              <Badge variant="outline" className="mb-5 gap-1.5 px-3 py-1 text-xs">
                <Zap className="w-3 h-3 text-primary" />
                Built for Indian Manufacturing
              </Badge>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-5">
                Run your entire factory<br />
                <span className="text-primary">from one platform</span>
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-8 max-w-lg">
                Production, GST invoicing, accounting, HR & payroll, CRM, WhatsApp checklists — all connected, all in the cloud. No more switching between spreadsheets and software.
              </p>

              <div className="flex flex-wrap gap-3 mb-8">
                <Button size="lg" onClick={() => setLocation("/register-company")} data-testid="hero-start-trial-btn" className="gap-2">
                  Start 14-Day Free Trial
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={handleDemoLogin} disabled={demoLoading} data-testid="hero-live-demo-btn" className="gap-2">
                  {demoLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Loading...</>
                    : <><Play className="w-4 h-4" />Try Live Demo</>
                  }
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {["No credit card required", "14-day free trial", "Cancel anytime"].map(t => (
                  <div key={t} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Dashboard mock */}
            <div className="hidden lg:block">
              <DashboardMock />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ───────────────────────────────────────────────────────── */}
      <section className="border-b bg-muted/30 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map(s => (
              <div key={s.label}>
                <div className="text-2xl font-bold text-primary">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE HIGHLIGHTS (alternating) ────────────────────────────────── */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">

          {/* Feature 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <Badge variant="outline" className="text-xs">Operations</Badge>
              <h2 className="text-2xl md:text-3xl font-bold leading-tight">Manufacturing, from raw material to dispatch</h2>
              <p className="text-muted-foreground leading-relaxed">
                Create BOMs, raise production orders, and track material consumption in real time. FIFO batch allocation ensures accurate costing, and every production run generates a traceable journal entry automatically.
              </p>
              <ul className="space-y-2">
                {["BOM-driven production orders", "FIFO batch & lot tracking", "Variance reporting vs. standard cost", "Dispatch with invoice-first gatepass"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-muted/40 border rounded-xl p-6 space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <Factory className="w-4 h-4 text-primary" />
                </div>
                <span className="font-semibold text-sm">Production Order #PO-0042</span>
                <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">In Progress</span>
              </div>
              {[
                { label: "Product", value: "Precision Shaft — 50mm" },
                { label: "Qty Planned", value: "500 pcs" },
                { label: "Qty Completed", value: "312 pcs" },
                { label: "Raw Material", value: "MS Rod 50mm — 48 kg used" },
                { label: "Variance", value: "−1.2% vs standard" },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-medium">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 bg-muted/40 border rounded-xl p-6 space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-primary" />
                </div>
                <span className="font-semibold text-sm">WhatsApp Checklist</span>
                <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">AI Verified</span>
              </div>
              <div className="space-y-2">
                {[
                  { q: "Is the coolant level adequate?", a: "Yes, filled to max line", ok: true },
                  { q: "Any unusual vibrations noticed?", a: "No vibrations", ok: true },
                  { q: "Safety guard in place?", a: "Guard installed and locked", ok: true },
                  { q: "Oil pressure reading?", a: "42 psi — within range", ok: true },
                ].map(item => (
                  <div key={item.q} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${item.ok ? "text-green-600" : "text-destructive"}`} />
                    <div>
                      <div className="text-muted-foreground">{item.q}</div>
                      <div className="font-medium">{item.a}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-4">
              <Badge variant="outline" className="text-xs">WhatsApp Integration</Badge>
              <h2 className="text-2xl md:text-3xl font-bold leading-tight">Machine checklists delivered on WhatsApp</h2>
              <p className="text-muted-foreground leading-relaxed">
                Operators receive startup checklists directly on WhatsApp — no app download needed. Answers are captured, AI-interpreted, and logged automatically. Supervisors get real-time alerts for failed checks.
              </p>
              <ul className="space-y-2">
                {["Daily machine startup checklists", "AI-powered answer interpretation", "Supervisor alerts for failed checks", "Full audit trail for compliance"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <Badge variant="outline" className="text-xs">HR & Compliance</Badge>
              <h2 className="text-2xl md:text-3xl font-bold leading-tight">Full HR & payroll — from hire to F&F</h2>
              <p className="text-muted-foreground leading-relaxed">
                Manage the complete employee lifecycle. Attendance, leave approvals, salary structures, PF/ESI computation, TDS projection, payslips, and full & final settlements — all in one place with zero manual Excel.
              </p>
              <ul className="space-y-2">
                {["Biometric or manual attendance", "Configurable salary structures", "Automated PF, ESI & TDS", "Form 16 generation", "Employee Self-Service portal"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-muted/40 border rounded-xl p-6 space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <IndianRupee className="w-4 h-4 text-primary" />
                </div>
                <span className="font-semibold text-sm">Payslip — April 2025</span>
              </div>
              {[
                { label: "Basic Salary", value: "₹25,000", type: "earning" },
                { label: "HRA", value: "₹10,000", type: "earning" },
                { label: "Special Allowance", value: "₹5,000", type: "earning" },
                { label: "PF Deduction", value: "−₹3,000", type: "deduction" },
                { label: "TDS", value: "−₹1,200", type: "deduction" },
                { label: "Net Pay", value: "₹35,800", type: "total" },
              ].map(r => (
                <div key={r.label} className={`flex justify-between text-sm border-b pb-2 last:border-0 last:pb-0 ${r.type === "total" ? "font-bold" : ""}`}>
                  <span className={r.type === "deduction" ? "text-destructive/70" : r.type === "total" ? "" : "text-muted-foreground"}>{r.label}</span>
                  <span className={r.type === "deduction" ? "text-destructive" : r.type === "total" ? "text-primary" : "font-medium"}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── ALL MODULES GRID ────────────────────────────────────────────────── */}
      <section id="features" className="py-14 border-t bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3 text-xs">All-in-one platform</Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Every module your factory needs</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">
              From raw material procurement to finished goods dispatch — manage your entire operation without switching tools.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {modules.map((mod) => (
              <div key={mod.label} className="flex items-start gap-3 p-3 rounded-lg hover-elevate cursor-default border bg-background">
                <div className="mt-0.5 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <mod.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm leading-snug">{mod.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{mod.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY KINTO — differentiators ─────────────────────────────────────── */}
      <section className="py-16 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Why Indian manufacturers choose Kinto</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">Designed from the ground up for the way Indian factories actually work — not a global ERP retrofitted for India.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Globe, title: "GST-ready from day one", desc: "Generate GSTIN-compliant tax invoices, e-way bills, credit notes, and debit notes. Export GST reports instantly." },
              { icon: Smartphone, title: "WhatsApp-first workflows", desc: "Operators receive checklists on WhatsApp. Answers are AI-interpreted and logged — no app download needed." },
              { icon: TrendingUp, title: "Real-time MIS dashboards", desc: "Executive KPIs, production efficiency, inventory turnover, and cash flow — without Excel." },
              { icon: Shield, title: "Role-based access control", desc: "Screen-level permissions ensure sensitive financial data is visible only to the right people." },
              { icon: Building2, title: "Multi-tenant architecture", desc: "Each company gets a fully isolated data space. Perfect for group companies and holding structures." },
              { icon: Award, title: "Compliant HR & payroll", desc: "PF, ESI, TDS, Form 16, and labour law compliance built-in. No third-party payroll software needed." },
              { icon: HeadphonesIcon, title: "Dedicated onboarding", desc: "We help you migrate your masters, configure salary structures, and train your team — not just hand you a login." },
              { icon: LayoutDashboard, title: "One login for everything", desc: "No integrations to maintain. Production, accounts, HR, CRM — one database, one source of truth." },
              { icon: BookOpen, title: "Employee Self-Service", desc: "Staff view payslips, apply for leave, check attendance, and submit tax declarations independently." },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-4">
                <div className="mt-0.5 w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
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

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-16 border-t bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3 text-xs">Simple pricing</Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Plans for every factory size</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">
              All plans include a 14-day free trial. No credit card needed. Scale your user count as your team grows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-xl border bg-background p-6 flex flex-col ${plan.highlight ? "border-primary shadow-lg ring-1 ring-primary/20" : ""}`}
              >
                {plan.tag && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">{plan.tag}</span>
                  </div>
                )}
                <div className="mb-5">
                  <p className="font-bold text-base">{plan.name}</p>
                  <div className="flex items-end gap-1 mt-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm mb-1">{plan.period}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">+ ₹100–₹150 per additional user/month</p>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={plan.highlight ? "default" : "outline"}
                  onClick={() => setLocation("/register-company")}
                  data-testid={`pricing-cta-${plan.name.toLowerCase()}`}
                >
                  Start Free Trial
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Need a custom plan for a large enterprise or holding group?{" "}
            <a href="mailto:hello@kintoops.in" className="text-primary underline underline-offset-2 hover:no-underline">Contact us</a>
          </p>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────────── */}
      <section id="testimonials" className="py-16 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Trusted by Indian manufacturers</h2>
            <p className="text-muted-foreground text-sm">Real feedback from production floors, finance teams, and HR departments</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-xl border bg-background p-5 flex flex-col gap-4">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground flex-1">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-2 border-t">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
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

      {/* ── FINAL CTA BANNER ────────────────────────────────────────────────── */}
      <section className="py-16 border-t bg-primary/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to modernise your factory?</h2>
          <p className="text-muted-foreground text-sm mb-8 max-w-lg mx-auto">
            Join Indian manufacturers already using Kinto Smart Ops. Start your 14-day free trial — no credit card, no commitment.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" onClick={() => setLocation("/register-company")} data-testid="footer-cta-btn" className="gap-2">
              Create Your Free Account
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={handleDemoLogin} disabled={demoLoading} data-testid="footer-demo-btn" className="gap-2">
              {demoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Try Live Demo
            </Button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t bg-muted/30 pt-12 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">

            {/* Brand column */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                  <Factory className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-sm">Kinto Smart Ops</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cloud ERP built for Indian manufacturing companies. GST-compliant, WhatsApp-connected, and HR-ready.
              </p>
            </div>

            {/* Products */}
            <div>
              <p className="font-semibold text-xs uppercase tracking-wide mb-3">Products</p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {["Production & BOM", "Inventory Control", "GST Invoicing", "Accounting", "HR & Payroll", "CRM", "MIS Analytics"].map(l => (
                  <li key={l}><a href="#features" className="hover:text-foreground transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            {/* Solutions */}
            <div>
              <p className="font-semibold text-xs uppercase tracking-wide mb-3">Solutions</p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {NAV_SOLUTIONS.map(s => (
                  <li key={s.label}><span className="hover:text-foreground transition-colors cursor-pointer">{s.label}</span></li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="font-semibold text-xs uppercase tracking-wide mb-3">Company</p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {[
                  { label: "Pricing", href: "#pricing" },
                  { label: "Customers", href: "#testimonials" },
                  { label: "Book a Demo", href: "/demo" },
                  { label: "Contact Us", href: "mailto:hello@kintoops.in" },
                ].map(l => (
                  <li key={l.label}><a href={l.href} className="hover:text-foreground transition-colors">{l.label}</a></li>
                ))}
              </ul>
            </div>

            {/* Account */}
            <div>
              <p className="font-semibold text-xs uppercase tracking-wide mb-3">Account</p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {[
                  { label: "Sign In", href: "/auth" },
                  { label: "Start Free Trial", href: "/register-company" },
                  { label: "ESS Portal", href: "/ess" },
                ].map(l => (
                  <li key={l.label}><a href={l.href} className="hover:text-foreground transition-colors">{l.label}</a></li>
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
