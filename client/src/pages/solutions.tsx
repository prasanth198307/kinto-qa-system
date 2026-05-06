import { useEffect } from "react";
import { useLocation } from "wouter";
import {
  Factory, HeartPulse, GraduationCap, Truck, Home, ShoppingBag,
  Leaf, Briefcase, ArrowRight, CheckCircle2, Zap, Users, FileText,
  Package, IndianRupee, MessageCircle, ClipboardCheck, Wrench,
  FolderKanban, UserCheck, Settings, BarChart3, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Industry definitions ─────────────────────────────────────────────────────

const INDUSTRIES = [
  {
    id: "manufacturing",
    icon: Factory,
    name: "Manufacturing & Engineering",
    subtitle: "Auto components, engineering goods, fabrication, pharmaceuticals",
    color: "from-blue-50 to-blue-100 border-blue-200",
    iconColor: "text-blue-600 bg-blue-100",
    challenges: [
      "Managing complex multi-level Bills of Material",
      "Real-time shop floor visibility and variance tracking",
      "GST compliance across multiple product categories",
      "Quality control and rejection management",
    ],
    how: "SwachERP gives manufacturers a connected shop-floor-to-accounts workflow. Define BOMs, raise work orders, track material consumption, capture production output, and auto-update inventory — all without spreadsheets.",
    modules: ["Production & BOM", "Inventory Control", "Quality Control", "Preventive Maintenance", "GST Invoicing", "Purchase Orders"],
    stat: { value: "40%", label: "reduction in material wastage reported by manufacturers" },
  },
  {
    id: "healthcare",
    icon: HeartPulse,
    name: "Healthcare & Clinics",
    subtitle: "Hospitals, diagnostic centres, clinics, pharmacies",
    color: "from-rose-50 to-rose-100 border-rose-200",
    iconColor: "text-rose-600 bg-rose-100",
    challenges: [
      "Managing OPD, IPD, and ward assignments across shifts",
      "Appointment scheduling and patient record management",
      "Drug inventory and expiry-date tracking",
      "Billing for consultations, procedures, and medications",
    ],
    how: "The Healthcare module in SwachERP covers the full patient journey — from appointment booking to discharge. OPD consultations, IPD admissions, ward management, and patient billing all in one system.",
    modules: ["Patient Management", "OPD / IPD", "Ward Management", "Pharmacy Inventory", "GST Invoicing", "HR & Payroll"],
    stat: { value: "60%", label: "faster patient billing with integrated invoicing" },
  },
  {
    id: "education",
    icon: GraduationCap,
    name: "Schools & Colleges",
    subtitle: "K-12 schools, colleges, coaching centres, training institutes",
    color: "from-violet-50 to-violet-100 border-violet-200",
    iconColor: "text-violet-600 bg-violet-100",
    challenges: [
      "Fee collection, scholarships, and fee ledger management",
      "Student attendance and academic performance tracking",
      "Timetable scheduling and subject-wise assessments",
      "Library, transport, and hostel administration",
    ],
    how: "SwachERP's Education module is built for the complete institution lifecycle — from student admission to result publication. Manage fees, attendance, timetables, assessments, library, transport, and announcements from one dashboard.",
    modules: ["Student Management", "Fee Management", "Attendance", "Timetable", "Assessments", "Library & Transport"],
    stat: { value: "90%", label: "of fee collections tracked automatically with zero follow-up" },
  },
  {
    id: "logistics",
    icon: Truck,
    name: "Logistics & Transport",
    subtitle: "Fleet operators, freight forwarders, courier companies",
    color: "from-amber-50 to-amber-100 border-amber-200",
    iconColor: "text-amber-600 bg-amber-100",
    challenges: [
      "Trip planning and vehicle utilisation tracking",
      "Lorry receipt (LR) generation and tracking",
      "Fuel and maintenance cost monitoring per vehicle",
      "Driver attendance and payment management",
    ],
    how: "The Logistics module tracks trips from loading to delivery. Generate consignment notes (LR), assign vehicles, track trip costs, and calculate profitability per trip — all linked to your accounting.",
    modules: ["Vehicle Master", "Trip Management", "Consignment Notes (LR)", "Driver Management", "Fuel Tracking", "GST Invoicing"],
    stat: { value: "25%", label: "improvement in vehicle utilisation reported by fleet operators" },
  },
  {
    id: "real-estate",
    icon: Home,
    name: "Real Estate & Builders",
    subtitle: "Residential developers, commercial builders, plotters",
    color: "from-teal-50 to-teal-100 border-teal-200",
    iconColor: "text-teal-600 bg-teal-100",
    challenges: [
      "Unit inventory management across multiple projects",
      "Booking, registration, and payment schedule tracking",
      "Construction cost and material procurement tracking",
      "GST compliance for under-construction properties",
    ],
    how: "SwachERP's Real Estate module lets builders manage projects, units, bookings, and payment schedules in one place. Track construction costs via purchase orders and get project-level P&L.",
    modules: ["Project & Unit Management", "Booking Management", "Payment Schedules", "Construction Procurement", "GST Invoicing", "Project P&L"],
    stat: { value: "100%", label: "payment collection visibility across all booked units" },
  },
  {
    id: "retail",
    icon: ShoppingBag,
    name: "Retail & Distribution",
    subtitle: "Retail chains, wholesalers, distributors, FMCG",
    color: "from-pink-50 to-pink-100 border-pink-200",
    iconColor: "text-pink-600 bg-pink-100",
    challenges: [
      "Point-of-sale transactions with real-time stock update",
      "Multi-outlet inventory and transfer management",
      "Customer loyalty, discounts, and return handling",
      "Daily sales reconciliation and cash management",
    ],
    how: "The POS module handles walk-in sales with barcode scanning, cash/card/UPI payment capture, and instant stock deduction. Managers get real-time outlet-wise sales reports.",
    modules: ["POS Terminal", "Multi-outlet Inventory", "Sales History", "Customer Loyalty", "GST Invoicing", "Accounting"],
    stat: { value: "3× faster", label: "checkout speed vs manual billing" },
  },
  {
    id: "agriculture",
    icon: Leaf,
    name: "Agriculture & Agri-processing",
    subtitle: "Farms, agri-businesses, commodity traders, food processors",
    color: "from-green-50 to-green-100 border-green-200",
    iconColor: "text-green-600 bg-green-100",
    challenges: [
      "Crop cycle and harvest tracking across multiple farms",
      "Commodity price monitoring and procurement",
      "Seasonal labour and payroll management",
      "APMC / mandi compliance and weighment records",
    ],
    how: "SwachERP's Agriculture module tracks the full crop lifecycle — from planting to harvest to sale. Record procurement from farmers, monitor commodity prices, manage seasonal labour, and generate GST invoices for agri-produce.",
    modules: ["Crop Cycle Management", "Farm Master", "Commodity Prices", "Agri Procurement", "Seasonal Payroll", "GST Invoicing"],
    stat: { value: "50%", label: "less time on procurement paperwork for agri-processors" },
  },
  {
    id: "services",
    icon: Briefcase,
    name: "Service Businesses",
    subtitle: "IT firms, consultancies, agencies, maintenance providers",
    color: "from-indigo-50 to-indigo-100 border-indigo-200",
    iconColor: "text-indigo-600 bg-indigo-100",
    challenges: [
      "Project-based billing and milestone invoicing",
      "Timesheet and resource utilisation tracking",
      "Expense claim and reimbursement management",
      "Retainer invoicing and recurring billing",
    ],
    how: "Service firms use SwachERP to track project budgets vs actuals, log timesheets, bill by milestone, and automate recurring invoices. All time and cost data flows into P&L automatically.",
    modules: ["Project Management", "Timesheet", "Milestone Billing", "Recurring Invoices", "Expense Claims", "Accounting"],
    stat: { value: "35%", label: "of billable hours previously lost — now captured via timesheets" },
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SolutionsPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <button onClick={() => setLocation("/")} className="flex items-center gap-2">
            <img src="/swacherp-logo.png" alt="SwachERP" className="h-8 w-auto" />
          </button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/features")}>Products</Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/pricing")}>Pricing</Button>
            <Button size="sm" onClick={() => setLocation("/register-company")}>Start Free Trial</Button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="py-16 text-center bg-muted/30 border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <Zap className="w-3.5 h-3.5" /> Built for your industry
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Every industry has unique needs.<br />
            <span className="text-primary">SwachERP speaks your language.</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Whether you manufacture auto parts, run a hospital, manage a school, or operate a logistics fleet — SwachERP has purpose-built modules for your workflows, with GST compliance built in.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => setLocation("/register-company")} className="gap-2">
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => setLocation("/demo")}>
              Book a Demo
            </Button>
          </div>
        </div>
      </section>

      {/* ── Industry quick-jump ── */}
      <div className="border-b bg-background sticky top-14 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto">
          <div className="flex gap-1 py-2 whitespace-nowrap">
            {INDUSTRIES.map(ind => (
              <button
                key={ind.id}
                onClick={() => {
                  const el = document.getElementById(ind.id);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted transition-colors"
              >
                {ind.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Industry sections ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
        {INDUSTRIES.map((ind, i) => {
          const Icon = ind.icon;
          const isEven = i % 2 === 0;
          return (
            <section key={ind.id} id={ind.id} className="scroll-mt-28">
              <div className={`flex flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} gap-10 items-start`}>
                {/* Text */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${ind.iconColor}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{ind.name}</h2>
                      <p className="text-sm text-muted-foreground">{ind.subtitle}</p>
                    </div>
                  </div>

                  <div className="mt-5 mb-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Common challenges</p>
                    <ul className="space-y-1.5">
                      {ind.challenges.map(c => (
                        <li key={c} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">How SwachERP helps</p>
                    <p className="text-sm leading-relaxed text-foreground">{ind.how}</p>
                  </div>

                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Key modules used</p>
                    <div className="flex flex-wrap gap-2">
                      {ind.modules.map(m => (
                        <span key={m} className="text-xs font-medium bg-muted px-2.5 py-1 rounded-full border">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button size="sm" onClick={() => setLocation("/register-company")} className="gap-1.5">
                      Try free for 14 days <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setLocation("/demo")}>Book a demo</Button>
                  </div>
                </div>

                {/* Stat card + module list */}
                <div className="flex-shrink-0 w-full lg:w-72 space-y-4">
                  <div className={`rounded-xl border bg-gradient-to-br ${ind.color} p-6 text-center`}>
                    <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3 ${ind.iconColor}`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <p className="text-3xl font-bold text-foreground">{ind.stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ind.stat.label}</p>
                  </div>

                  <div className="rounded-xl border bg-card p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Modules included</p>
                    <ul className="space-y-2">
                      {ind.modules.map(m => (
                        <li key={m} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {i < INDUSTRIES.length - 1 && (
                <div className="mt-16 border-b" />
              )}
            </section>
          );
        })}
      </div>

      {/* ── CTA ── */}
      <section className="border-t bg-primary py-16 text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-primary-foreground mb-3">Your industry. Your workflow. Your ERP.</h2>
          <p className="text-primary-foreground/80 mb-8">Start with a 14-day free trial and see exactly how SwachERP fits your business — no credit card needed.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" variant="secondary" onClick={() => setLocation("/register-company")} className="gap-2">
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => setLocation("/demo")} className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">
              Book a Demo
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Inmousture Private Limited. All rights reserved.</p>
      </footer>
    </div>
  );
}
