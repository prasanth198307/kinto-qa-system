import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Factory,
  Package,
  ShoppingCart,
  FileText,
  BarChart3,
  Wrench,
  MessageCircle,
  Shield,
  Globe,
  Layers,
  ArrowRight,
  CheckCircle2,
  Smartphone,
  TrendingUp,
  Users,
  ClipboardList,
  Truck,
  Receipt,
  IndianRupee,
  Star,
  ChevronRight,
  Play,
  Loader2,
  Target,
  UserCheck,
  BookOpen,
  MonitorSmartphone,
} from "lucide-react";

const modules = [
  { icon: Factory, label: "Production Management", desc: "BOM-driven production with variance tracking" },
  { icon: Package, label: "Inventory Control", desc: "Raw material & finished goods with FIFO batching" },
  { icon: ShoppingCart, label: "Purchase Orders", desc: "Vendor management with debit notes" },
  { icon: FileText, label: "GST Invoicing", desc: "GST-compliant invoices, credit notes & receipts" },
  { icon: Truck, label: "Dispatch & Gatepasses", desc: "Invoice-first dispatch with digital signatures" },
  { icon: ClipboardList, label: "Quality & Returns", desc: "Three-stage return workflow with traceability" },
  { icon: Receipt, label: "Accounting", desc: "Double-entry COA, P&L and Balance Sheet" },
  { icon: BarChart3, label: "MIS Analytics", desc: "Executive KPIs, sales & production dashboards" },
  { icon: Wrench, label: "Preventive Maintenance", desc: "Machine schedules, checklists & spare parts" },
  { icon: MessageCircle, label: "WhatsApp Integration", desc: "Machine startup & checklist via WhatsApp" },
  { icon: IndianRupee, label: "Expenses & Cash Register", desc: "Daily cash register with voucher printing" },
  { icon: Layers, label: "Document Management", desc: "Versioned documents with expiry alerts" },
  { icon: Target, label: "CRM Lead Management", desc: "Kanban pipeline, lead tracking & follow-ups" },
  { icon: UserCheck, label: "HR & Payroll", desc: "Employees, attendance, payroll, TDS & recruitment" },
  { icon: MonitorSmartphone, label: "Employee Self-Service", desc: "Payslips, leaves & tax declarations for staff" },
];

const plans = [
  {
    name: "Basic",
    price: "₹999",
    period: "/month",
    baseUsers: 5,
    highlight: false,
    features: [
      "5 base users",
      "GST invoicing & receipts",
      "Inventory management",
      "Purchase & sales orders",
      "Gatepasses & dispatch",
      "Expenses & documents",
      "Email support",
    ],
  },
  {
    name: "Professional",
    price: "₹1,499",
    period: "/month",
    baseUsers: 15,
    highlight: true,
    features: [
      "15 base users",
      "All Basic features",
      "Production & BOM tracking",
      "Double-entry accounting",
      "MIS analytics dashboards",
      "CRM lead management",
      "WhatsApp checklists",
      "Preventive maintenance",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    price: "₹2,599",
    period: "/month",
    baseUsers: 20,
    highlight: false,
    features: [
      "20 base users",
      "All Professional features",
      "HR & Payroll module",
      "Employee Self-Service portal",
      "TDS & compliance (Form 16)",
      "Recruitment management",
      "Custom branding",
      "Dedicated support",
    ],
  },
];

const testimonials = [
  { name: "Rajesh Sharma", company: "Precision Parts Mfg.", role: "Director", text: "Kinto Smart Ops transformed how we track production. Real-time inventory and GST invoicing in one place." },
  { name: "Meera Patel", company: "Alpha Industries", role: "CFO", text: "The HR & Payroll module with automated TDS calculations and payslip delivery saved us days every month. Excellent." },
  { name: "Suresh Kumar", company: "Bharat Engineering", role: "Operations Head", text: "From purchase orders to dispatch gatepasses, everything flows seamlessly. Our team adopted it within a week." },
];

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [demoLoading, setDemoLoading] = useState(false);

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
      {/* ── Navbar ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Factory className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-base tracking-tight">Kinto Smart Ops</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">Customers</a>
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/demo")} data-testid="nav-demo-btn">
              Book a Demo
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/auth")} data-testid="nav-login-btn">
              Log in
            </Button>
            <Button size="sm" onClick={() => setLocation("/register-company")} data-testid="nav-register-btn">
              Start Free Trial
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
          <Badge variant="outline" className="mb-5 gap-1.5 px-3 py-1 text-xs font-medium">
            <Star className="w-3 h-3 text-primary" />
            Built for Indian Manufacturing
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-5 max-w-4xl mx-auto leading-tight">
            The complete ERP for{" "}
            <span className="text-primary">Indian manufacturers</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            Production, GST invoicing, accounting, HR & payroll, CRM, WhatsApp checklists, and MIS analytics —
            all in one cloud platform. Start your 14-day free trial today.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" onClick={() => setLocation("/register-company")} data-testid="hero-start-trial-btn" className="gap-2">
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleDemoLogin}
              disabled={demoLoading}
              data-testid="hero-live-demo-btn"
              className="gap-2"
            >
              {demoLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading demo...</>
                : <><Play className="w-4 h-4" /> Try Live Demo</>
              }
            </Button>
            <Button size="lg" variant="ghost" onClick={() => setLocation("/auth")} data-testid="hero-login-btn">
              Log in
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            No credit card required &nbsp;·&nbsp; 14-day free trial &nbsp;·&nbsp; Cancel anytime
          </p>

          {/* Stats bar */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[
              { value: "15+", label: "ERP Modules" },
              { value: "GST", label: "Compliant Invoicing" },
              { value: "100%", label: "Cloud-Based" },
              { value: "WhatsApp", label: "Native Integration" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-primary">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modules / Features ──────────────────────────────── */}
      <section id="features" className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3 text-xs">All-in-one platform</Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Everything your factory needs</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">
              From raw material procurement to finished goods dispatch — manage your entire manufacturing operation in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {modules.map((mod) => (
              <Card key={mod.label} className="hover-elevate">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <mod.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm leading-snug">{mod.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{mod.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Kinto ───────────────────────────────────────── */}
      <section className="py-14 border-y bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Smartphone,
                title: "WhatsApp-first workflows",
                desc: "Operators receive machine startup checklists directly on WhatsApp. Answers are captured, AI-interpreted, and logged automatically.",
              },
              {
                icon: Globe,
                title: "GST-ready from day one",
                desc: "Generate GSTIN-compliant tax invoices, e-way bills, credit notes, and debit notes. Export GST reports for filing instantly.",
              },
              {
                icon: TrendingUp,
                title: "Real-time MIS dashboards",
                desc: "Executive KPIs, production efficiency, inventory turnover, and cash flow — all visible in one dashboard without Excel.",
              },
              {
                icon: UserCheck,
                title: "HR & Payroll built-in",
                desc: "Full employee lifecycle — attendance, leaves, salary structures, PF/ESI, TDS projection, payslips, and F&F settlements.",
              },
              {
                icon: Target,
                title: "CRM for sales teams",
                desc: "Track leads from first contact to conversion with a Kanban pipeline, follow-up dates, and assignment management.",
              },
              {
                icon: Shield,
                title: "Role-based access control",
                desc: "Define roles, assign screen-level permissions, and keep sensitive financial data visible only to the right people.",
              },
              {
                icon: BookOpen,
                title: "Employee Self-Service",
                desc: "Employees view payslips, apply for leave, check attendance, and submit tax declarations — no admin intervention needed.",
              },
              {
                icon: Users,
                title: "Multi-user collaboration",
                desc: "Invite your entire team — accountants, storekeepers, supervisors — each with their own login and permissions.",
              },
              {
                icon: Layers,
                title: "Document management",
                desc: "Store quality certificates, compliance documents, and vendor contracts with version history and expiry reminders.",
              },
            ].map((item) => (
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

      {/* ── Pricing ─────────────────────────────────────────── */}
      <section id="pricing" className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3 text-xs">Simple, transparent pricing</Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Plans for every factory size</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">
              All plans include a 14-day free trial. No credit card needed. Scale your user count as your team grows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={plan.highlight ? "border-primary shadow-md relative" : "relative"}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="px-3 text-xs">Most Popular</Badge>
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="mb-5">
                    <p className="font-bold text-base">{plan.name}</p>
                    <div className="flex items-end gap-1 mt-1">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground text-sm mb-1">{plan.period}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">+ ₹100–₹150 per additional user/month</p>
                  </div>

                  <ul className="space-y-2 mb-6">
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
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Need a custom plan for large enterprises?{" "}
            <a href="mailto:hello@kintoops.in" className="text-primary underline underline-offset-2">Contact us</a>
          </p>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────── */}
      <section id="testimonials" className="py-14 border-t bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Trusted by Indian manufacturers</h2>
            <p className="text-muted-foreground text-sm">What our customers say</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <Card key={t.name}>
                <CardContent className="p-5">
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground mb-4">"{t.text}"</p>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}, {t.company}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────── */}
      <section className="py-16 border-t">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to modernise your factory?</h2>
          <p className="text-muted-foreground text-sm mb-7 max-w-lg mx-auto">
            Join hundreds of Indian manufacturers already using Kinto Smart Ops to manage their operations.
            Start your 14-day free trial — no credit card required.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" onClick={() => setLocation("/register-company")} data-testid="footer-cta-btn" className="gap-2">
              Create Your Free Account
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => setLocation("/auth")} data-testid="footer-login-btn">
              Log in
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t py-8 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Factory className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">Kinto Smart Ops</span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="/register-company" className="hover:text-foreground transition-colors">Register</a>
            <a href="/auth" className="hover:text-foreground transition-colors">Login</a>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Kinto Smart Ops. Made in India.
          </p>
        </div>
      </footer>
    </div>
  );
}
