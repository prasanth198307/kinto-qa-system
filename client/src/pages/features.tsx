import { useEffect } from "react";
import { useLocation } from "wouter";
import {
  Factory, Package, ShoppingCart, FileText, BarChart3, Wrench,
  MessageCircle, Shield, Users, ClipboardList, Truck, Receipt,
  IndianRupee, ArrowRight, CheckCircle2, Warehouse, FolderKanban,
  PiggyBank, GitBranch, ClipboardCheck, BookOpen, HeartPulse,
  GraduationCap, MapPin, Home, ShoppingBag, Leaf, Star, Zap,
  UserCheck, Building2, Settings, Bell, CreditCard, FileBarChart,
  Layers, Lock, TrendingUp, Calendar, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Module definitions ───────────────────────────────────────────────────────

const MODULES = [
  {
    id: "production",
    icon: Factory,
    name: "Production & BOM",
    category: "Operations",
    tagline: "Run your shop floor end-to-end.",
    description:
      "Plan and track manufacturing orders from raw material to finished goods. Define multi-level Bills of Materials, record actual vs standard consumption, and analyse production variance — all in one screen.",
    features: [
      "Multi-level Bills of Material (BOM) with sub-assemblies",
      "Work-order scheduling and shop-floor tracking",
      "Actual vs standard material consumption with variance reports",
      "Yield, scrap, and rework capture",
      "Real-time WIP inventory visibility",
    ],
    how: "Create a BOM → raise a Work Order → issue raw materials → record production output → auto-update inventory.",
  },
  {
    id: "inventory",
    icon: Package,
    name: "Inventory Control",
    category: "Operations",
    tagline: "Know exactly what you have, where, and when to reorder.",
    description:
      "Multi-warehouse inventory with FIFO batch costing, serial & lot tracking, reorder alerts, and full audit trail. Integrates natively with production, purchase, and dispatch.",
    features: [
      "Multi-warehouse & multi-location stock management",
      "FIFO batch costing and serial / lot tracking",
      "Automatic reorder alerts based on configurable thresholds",
      "Stock ageing and slow-moving item reports",
      "Physical stock verification with variance capture",
    ],
    how: "Receive goods via GRN → batches assigned → consumed in production or dispatched via gatepass → stock ledger always up to date.",
  },
  {
    id: "purchase",
    icon: ShoppingCart,
    name: "Purchase Orders",
    category: "Operations",
    tagline: "From requisition to payment — fully traceable.",
    description:
      "Raise purchase requisitions, get approvals, convert to POs, receive goods via GRN, and perform three-way matching before releasing vendor payments. Track retention and advance amounts.",
    features: [
      "Purchase requisitions with configurable approval workflow",
      "Automated PO generation from approved requisitions",
      "Goods Receipt Notes (GRN) linked to POs",
      "Three-way matching: PO ↔ GRN ↔ Vendor Invoice",
      "Retention, advance, and credit-limit management",
    ],
    how: "Raise PR → approve → generate PO → receive GRN → match vendor bill → release payment.",
  },
  {
    id: "invoicing",
    icon: FileText,
    name: "GST Invoicing",
    category: "Finance",
    tagline: "100 % GST-compliant invoices in seconds.",
    description:
      "Generate tax invoices, proforma invoices, credit notes, and debit notes. Auto-calculate CGST, SGST, IGST, and TDS. Export GSTR-1 and GSTR-3B data directly to the GST portal JSON format.",
    features: [
      "Tax invoice, proforma, credit note, and debit note support",
      "Automatic CGST / SGST / IGST / TDS computation",
      "E-invoice QR code generation",
      "GSTR-1 and GSTR-3B summary & JSON export",
      "Recurring invoice scheduler for subscription billing",
    ],
    how: "Add line items → taxes auto-applied → PDF generated → WhatsApp or email to customer → payment recorded.",
  },
  {
    id: "accounting",
    icon: IndianRupee,
    name: "Accounting & Ledger",
    category: "Finance",
    tagline: "Double-entry books that keep themselves.",
    description:
      "Every transaction — sale, purchase, payment, journal — posts to the correct ledger automatically. Get instant P&L, Balance Sheet, and Trial Balance without manual entries.",
    features: [
      "Double-entry bookkeeping with auto-posting",
      "Full Chart of Accounts (CoA) management",
      "Profit & Loss, Balance Sheet, Trial Balance",
      "Bank reconciliation and cash-flow reports",
      "TDS management and advance tax tracking",
    ],
    how: "Transact → journals auto-post → run P&L or Balance Sheet any time, no manual consolidation needed.",
  },
  {
    id: "dispatch",
    icon: Truck,
    name: "Dispatch & Gatepasses",
    category: "Operations",
    tagline: "Controlled outward movement, every shipment tracked.",
    description:
      "Issue returnable and non-returnable gatepasses against invoices or delivery orders. Capture vehicle details, driver info, and e-way bill number. Automatically deduct stock on dispatch.",
    features: [
      "Returnable & non-returnable gatepass types",
      "Invoice-first dispatch workflow",
      "E-way bill number and vehicle details capture",
      "Automatic stock deduction on gatepass issue",
      "Pending return tracking and follow-up alerts",
    ],
    how: "Create invoice → issue gatepass linked to invoice → stock deducted → pending returns tracked automatically.",
  },
  {
    id: "crm",
    icon: Users,
    name: "CRM & Sales",
    category: "Sales",
    tagline: "Track every lead from enquiry to closed deal.",
    description:
      "Manage leads, enquiries, quotations, and sales orders in a single pipeline. Set follow-up reminders, track conversion rates, and send quotes directly via WhatsApp.",
    features: [
      "Lead capture and pipeline management",
      "Quotation builder linked to product catalogue",
      "Follow-up reminders and activity log",
      "Convert quotation to sales order in one click",
      "Customer credit-limit warnings at order stage",
    ],
    how: "Log lead → create quotation → follow up → convert to sales order → invoice → payment.",
  },
  {
    id: "hr",
    icon: UserCheck,
    name: "HR & Payroll",
    category: "HR",
    tagline: "From offer letter to full-and-final — fully automated.",
    description:
      "Manage employee master records, attendance (biometric / manual), leave applications, and monthly payroll with all statutory deductions — PF, ESI, PT — computed automatically.",
    features: [
      "Employee master with documents and org-chart",
      "Attendance capture (manual, bulk import, biometric integration)",
      "Leave management with approval workflow",
      "Payroll with PF, ESI, PT, TDS auto-computation",
      "Payslip generation and bank transfer export",
    ],
    how: "Onboard employee → mark attendance → approve leaves → run payroll at month-end → generate payslips.",
  },
  {
    id: "expenses",
    icon: Receipt,
    name: "Expense Claims",
    category: "HR",
    tagline: "Employee expense reimbursements without the paper trail.",
    description:
      "Employees submit expense claims via the ESS portal with receipt uploads. Managers approve; finance reimburses. All mapped to cost centres and auto-posted to accounts.",
    features: [
      "Self-service expense claim submission with attachments",
      "Configurable approval workflow (manager → finance)",
      "Cost-centre mapping for department-wise reporting",
      "Auto-journal posting on reimbursement",
      "Expense analytics by category and employee",
    ],
    how: "Employee submits claim → manager approves → finance releases payment → journal auto-posts.",
  },
  {
    id: "quality",
    icon: ClipboardCheck,
    name: "Quality Control",
    category: "Operations",
    tagline: "Catch defects before they reach your customer.",
    description:
      "Three-stage quality inspection (incoming, in-process, outgoing) with accept / reject / rework decisions. Track non-conformances and link corrective actions.",
    features: [
      "Incoming, in-process, and outgoing inspection stages",
      "Accept, reject, or rework decisions per lot",
      "Non-conformance reports (NCR) with root-cause capture",
      "Corrective & Preventive Action (CAPA) tracking",
      "Quality analytics and rejection trend reports",
    ],
    how: "Material received → QC inspection triggered → pass/fail recorded → rejected material quarantined → NCR raised.",
  },
  {
    id: "maintenance",
    icon: Wrench,
    name: "Preventive Maintenance",
    category: "Operations",
    tagline: "Keep machines running; eliminate surprise breakdowns.",
    description:
      "Schedule preventive maintenance for every machine, track daily checklists, and record breakdown history. Spare-part consumption auto-deducted from inventory.",
    features: [
      "Machine master with maintenance schedule templates",
      "Daily operator checklist and shift-end log",
      "Breakdown report with downtime capture",
      "Spare-part consumption linked to inventory",
      "Maintenance cost tracking per machine",
    ],
    how: "Define schedule → checklist auto-generated daily → operator fills in → manager reviews → spare parts consumed from stock.",
  },
  {
    id: "projects",
    icon: FolderKanban,
    name: "Project Management",
    category: "Operations",
    tagline: "Deliver projects on time and within budget.",
    description:
      "Manage projects with BOQ, milestones, timesheets, and real-time P&L. Ideal for construction, engineering, and service firms that bill by project deliverable.",
    features: [
      "Bill of Quantities (BOQ) and milestone definition",
      "Timesheet capture linked to employees",
      "Revenue recognition by milestone completion",
      "Project P&L with planned vs actual cost",
      "Multi-project dashboard with status overview",
    ],
    how: "Define project → set BOQ and milestones → team logs timesheets → milestone billed → P&L computed automatically.",
  },
  {
    id: "warehouses",
    icon: Warehouse,
    name: "Multi-warehouse",
    category: "Inventory",
    tagline: "Manage stock across all your locations from one system.",
    description:
      "Create unlimited warehouse locations, transfer stock between them with approval workflows, and get location-wise stock reports at any time.",
    features: [
      "Unlimited warehouse and sub-location setup",
      "Inter-warehouse stock transfer with approval",
      "Location-wise stock valuation reports",
      "UOM conversions (e.g. kg ↔ grams, box ↔ pieces)",
      "Serial and lot traceability across locations",
    ],
    how: "Set up locations → create transfer order → approve → stock moves → reports reflect new position immediately.",
  },
  {
    id: "assets",
    icon: Building2,
    name: "Fixed Assets",
    category: "Finance",
    tagline: "Track every asset from purchase to disposal.",
    description:
      "Maintain a fixed asset register with depreciation schedules (SLM / WDV), asset revaluation, and disposal entries — all auto-posted to the general ledger.",
    features: [
      "Fixed asset register with category-wise grouping",
      "SLM and WDV depreciation computation",
      "Asset addition, revaluation, and disposal entries",
      "Depreciation schedule reports",
      "Auto-journal posting to general ledger",
    ],
    how: "Add asset → assign depreciation method → run monthly depreciation → journals auto-post → asset net-book value updated.",
  },
  {
    id: "approvals",
    icon: GitBranch,
    name: "Approval Workflows",
    category: "Finance",
    tagline: "Nothing moves without the right sign-off.",
    description:
      "Configure multi-level approval rules for purchase orders, expense claims, leave requests, sales discounts, and more. Approvers notified via WhatsApp and email instantly.",
    features: [
      "Configurable approval rules per document type",
      "Multi-level (sequential or parallel) approver chains",
      "Instant WhatsApp + email notifications",
      "Unified approvals inbox for each approver",
      "Audit trail of every approve / reject action",
    ],
    how: "Document submitted → first approver notified → approved → next level notified → final approval → document released.",
  },
  {
    id: "whatsapp",
    icon: MessageCircle,
    name: "WhatsApp Integration",
    category: "Sales",
    tagline: "Your ERP in every employee's pocket.",
    description:
      "Send invoices, POs, payslips, and reminders directly via WhatsApp. Receive machine breakdown alerts, payment confirmations, and approval notifications — all without leaving WhatsApp.",
    features: [
      "Send invoices, quotations, and POs via WhatsApp",
      "Payment reminder automation with configurable schedule",
      "Machine breakdown and maintenance alerts",
      "Approval notification and one-tap approve / reject",
      "Inbound WhatsApp commands (e.g. stock query)",
    ],
    how: "Configure WhatsApp number → link to Meta Cloud API → all document actions trigger automatic messages.",
  },
];

const CATEGORY_ORDER = ["Operations", "Finance", "Inventory", "HR", "Sales"];

// ─── Component ────────────────────────────────────────────────────────────────

export default function FeaturesPage() {
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

  const grouped = CATEGORY_ORDER.reduce<Record<string, typeof MODULES>>((acc, cat) => {
    acc[cat] = MODULES.filter(m => m.category === cat);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <button onClick={() => setLocation("/")} className="flex items-center gap-2">
            <img src="/swacherp-logo.png" alt="SwachERP" className="h-8 w-auto" />
          </button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/solutions")}>Solutions</Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/pricing")}>Pricing</Button>
            <Button size="sm" onClick={() => setLocation("/register-company")}>Start Free Trial</Button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="py-16 text-center bg-muted/30 border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <Zap className="w-3.5 h-3.5" /> 30+ integrated modules
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Everything your business needs.<br />
            <span className="text-primary">One unified platform.</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            SwachERP brings production, inventory, finance, HR, CRM, and industry-specific workflows into a single GST-compliant cloud ERP — no integrations, no sync issues, no data silos.
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

      {/* ── Quick-jump nav ── */}
      <div className="border-b bg-background sticky top-14 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto">
          <div className="flex gap-1 py-2 whitespace-nowrap">
            {CATEGORY_ORDER.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  const el = document.getElementById(`cat-${cat.toLowerCase()}`);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted transition-colors"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Modules by category ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
        {CATEGORY_ORDER.map(cat => {
          const mods = grouped[cat] ?? [];
          if (!mods.length) return null;
          return (
            <section key={cat} id={`cat-${cat.toLowerCase()}`}>
              <div className="mb-8">
                <span className="text-xs font-bold uppercase tracking-widest text-primary">{cat}</span>
                <h2 className="text-2xl sm:text-3xl font-bold mt-1">
                  {cat === "Operations" && "Run your operations end-to-end"}
                  {cat === "Finance" && "Keep your books audit-ready"}
                  {cat === "Inventory" && "Know your stock — always"}
                  {cat === "HR" && "Manage your people lifecycle"}
                  {cat === "Sales" && "Grow revenue, delight customers"}
                </h2>
              </div>
              <div className="space-y-10">
                {mods.map((mod, i) => {
                  const Icon = mod.icon;
                  const isEven = i % 2 === 0;
                  return (
                    <div
                      key={mod.id}
                      id={mod.id}
                      className={`flex flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} gap-8 lg:gap-12 items-start`}
                    >
                      {/* Text */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">{mod.name}</h3>
                            <p className="text-sm text-primary font-medium">{mod.tagline}</p>
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-5 leading-relaxed">{mod.description}</p>
                        <ul className="space-y-2 mb-5">
                          {mod.features.map(f => (
                            <li key={f} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="bg-muted/40 border rounded-lg px-4 py-3">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">How it works</p>
                          <p className="text-sm text-foreground leading-relaxed">{mod.how}</p>
                        </div>
                      </div>
                      {/* Illustration placeholder */}
                      <div className="flex-shrink-0 w-full lg:w-80 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 p-8 flex flex-col items-center justify-center text-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                          <Icon className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">{mod.name}</p>
                        <p className="text-xs text-muted-foreground">{mod.features.length} built-in capabilities</p>
                        <Button size="sm" variant="outline" onClick={() => setLocation("/register-company")} className="mt-2 gap-1">
                          Try it free <ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* ── CTA ── */}
      <section className="border-t bg-primary py-16 text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-primary-foreground mb-3">Ready to get started?</h2>
          <p className="text-primary-foreground/80 mb-8">14-day free trial. No credit card required. Full access to all modules from day one.</p>
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
