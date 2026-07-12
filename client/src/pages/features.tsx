import { useEffect } from "react";
import { useLocation } from "wouter";
import {
  Factory, Package, ShoppingCart, FileText, BarChart3, Wrench,
  MessageCircle, Users, ClipboardList, Truck, Receipt,
  IndianRupee, ArrowRight, CheckCircle2, Warehouse, FolderKanban,
  PiggyBank, GitBranch, ClipboardCheck, HeartPulse,
  GraduationCap, ShoppingBag, Leaf, Zap,
  UserCheck, Building2, Settings, Key, Webhook, MonitorSmartphone,
  Target, Home, Globe, Layers, LayoutDashboard,
  Hotel, Pill, TreePine, Landmark, Coins, Sparkles, Video, Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── All module groups matching the nav ───────────────────────────────────────

const GROUPS = [
  {
    id: "operations",
    label: "Operations",
    headline: "Run your entire shop floor — end to end",
    sub: "From raw material receipt to finished goods dispatch, every workflow is connected.",
    modules: [
      {
        id: "production",
        icon: Factory,
        name: "Production & BOM",
        tagline: "Orders, BOM, variance tracking",
        description:
          "Plan and execute manufacturing orders against multi-level Bills of Material. Record actual vs standard material consumption, capture yield and scrap, and analyse production variance — all without spreadsheets.",
        features: [
          "Multi-level Bills of Material (BOM) with sub-assemblies",
          "Work-order scheduling with shift-wise tracking",
          "Actual vs standard material consumption reporting",
          "Scrap, rework, and yield capture per batch",
          "Real-time WIP inventory visibility",
        ],
        how: "Define BOM → raise Work Order → issue raw materials → record output → inventory auto-updated.",
      },
      {
        id: "inventory",
        icon: Package,
        name: "Inventory Control",
        tagline: "Multi-warehouse, FIFO, serial/lot tracking",
        description:
          "Maintain accurate stock across all locations with FIFO batch costing, serial & lot tracking, reorder alerts, and a full audit trail. Every transaction — production, purchase, dispatch — updates inventory instantly.",
        features: [
          "Multi-warehouse & multi-location stock management",
          "FIFO batch costing for accurate valuation",
          "Serial number and lot/batch tracking",
          "Configurable reorder points and alerts",
          "Physical stock verification with variance reports",
        ],
        how: "Receive via GRN → batches assigned → consumed in production or dispatched via gatepass → ledger always current.",
      },
      {
        id: "purchase",
        icon: ShoppingCart,
        name: "Purchase Orders",
        tagline: "Requisitions, GRN, three-way matching",
        description:
          "Manage the full purchase cycle: raise requisitions, get approvals, convert to POs, receive goods via GRN, and do three-way matching before releasing vendor payments. Retention and advance amounts tracked automatically.",
        features: [
          "Purchase Requisitions with approval workflow",
          "Automated PO generation from approved requisitions",
          "Goods Receipt Notes (GRN) linked to POs",
          "Three-way matching: PO ↔ GRN ↔ Vendor Invoice",
          "Vendor credit limits, retention & advance tracking",
        ],
        how: "Raise PR → approve → generate PO → receive GRN → match vendor bill → release payment.",
      },
      {
        id: "dispatch",
        icon: Truck,
        name: "Dispatch & Gatepasses",
        tagline: "Invoice-first dispatch, e-signatures",
        description:
          "Issue returnable and non-returnable gatepasses tied to invoices. Capture vehicle, driver, and e-way bill details. Stock is automatically deducted on dispatch; pending returns tracked and followed up automatically.",
        features: [
          "Returnable & non-returnable gatepass types",
          "Invoice-linked dispatch — no orphan shipments",
          "E-way bill number and vehicle details capture",
          "Automatic stock deduction on gatepass issue",
          "Pending return alerts and follow-up tracking",
        ],
        how: "Create invoice → issue gatepass → stock deducted → open returns tracked → alerts sent.",
      },
      {
        id: "quality",
        icon: ClipboardList,
        name: "Quality Control",
        tagline: "Three-stage inspection, traceability",
        description:
          "Inspect at three stages — incoming, in-process, and outgoing. Record accept, reject, or rework decisions per batch. Raise Non-Conformance Reports and link Corrective Actions to close the loop.",
        features: [
          "Incoming, in-process, and outgoing inspection",
          "Accept / Reject / Rework decisions per lot",
          "Non-Conformance Reports (NCR) with root-cause capture",
          "Corrective & Preventive Action (CAPA) tracking",
          "Rejection trend analysis and quality dashboards",
        ],
        how: "Material received → QC inspection triggered → decision recorded → rejection quarantined → NCR raised if needed.",
      },
      {
        id: "maintenance",
        icon: Wrench,
        name: "Preventive Maintenance",
        tagline: "Machine schedules, spare parts",
        description:
          "Set up maintenance schedules for every machine. Auto-generate daily checklists for operators. Record breakdown history, downtime, and spare-part consumption — all linked to your inventory.",
        features: [
          "Machine master with PM schedule templates",
          "Daily operator checklist auto-generation",
          "Breakdown log with downtime capture",
          "Spare-part consumption linked to inventory stock",
          "Maintenance cost tracking per machine",
        ],
        how: "Define schedule → daily checklist created → operator fills in → manager reviews → spares consumed from stock.",
      },
      {
        id: "projects",
        icon: FolderKanban,
        name: "Project Management",
        tagline: "BOQ, milestones, timesheets, P&L",
        description:
          "Track projects from planning to delivery. Define Bill of Quantities, set milestones, capture daily timesheets, and get real-time project P&L. Ideal for contractors, engineers, and service companies.",
        features: [
          "Bill of Quantities (BOQ) with line-item budgets",
          "Milestone definition and completion tracking",
          "Timesheet capture linked to employees and tasks",
          "Revenue recognition on milestone billing",
          "Planned vs actual cost — live project P&L",
        ],
        how: "Define BOQ & milestones → team logs timesheets → milestone completed → invoice raised → P&L computed.",
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    headline: "Keep your books accurate and audit-ready",
    sub: "Every transaction auto-posts to the right ledger. GST compliance is built in — not bolted on.",
    modules: [
      {
        id: "invoicing",
        icon: FileText,
        name: "GST Invoicing",
        tagline: "Tax, proforma, credit notes, GSTR reports",
        description:
          "Generate GST-compliant tax invoices, proforma invoices, credit notes, and debit notes in seconds. CGST, SGST, IGST, and TDS computed automatically. Export GSTR-1 and GSTR-3B directly in the government's JSON format.",
        features: [
          "Tax invoice, proforma, credit note & debit note",
          "Auto CGST / SGST / IGST / TDS computation",
          "E-invoice QR code generation",
          "GSTR-1 and GSTR-3B summary & JSON export",
          "Recurring invoice scheduler for subscriptions",
        ],
        how: "Add line items → taxes auto-applied → PDF generated → share via WhatsApp or email → payment recorded.",
      },
      {
        id: "accounting",
        icon: Receipt,
        name: "Double-Entry Accounting",
        tagline: "COA, P&L, Balance Sheet, journals",
        description:
          "Every sale, purchase, payment, and journal entry posts to the correct ledger automatically using double-entry bookkeeping. Get instant Profit & Loss, Balance Sheet, and Trial Balance — no manual consolidation needed.",
        features: [
          "Double-entry bookkeeping with auto-posting",
          "Full Chart of Accounts (COA) management",
          "Profit & Loss, Balance Sheet, Trial Balance",
          "Bank reconciliation and cash-flow statements",
          "TDS management and advance tax tracking",
        ],
        how: "Transact → journals auto-post → run P&L or Balance Sheet any time — no month-end scramble.",
      },
      {
        id: "expenses",
        icon: IndianRupee,
        name: "Expenses & Cash",
        tagline: "Cost centres, claims, cash register",
        description:
          "Manage petty cash, employee expense claims, and departmental cost centres from one screen. All payments are posted to accounts automatically and mapped to the correct cost centre for management reporting.",
        features: [
          "Petty cash register with voucher management",
          "Employee expense claim submission & approval",
          "Cost centre mapping for department-wise P&L",
          "Auto-journal posting on reimbursement or payment",
          "Expense analytics by category, department & employee",
        ],
        how: "Employee submits claim → manager approves → finance pays → journal auto-posts to cost centre.",
      },
      {
        id: "mis",
        icon: BarChart3,
        name: "MIS Analytics",
        tagline: "Executive KPIs, dashboards, reports",
        description:
          "Get a real-time view of the business with role-based dashboards. Sales trends, production targets, inventory ageing, collection efficiency — all in one screen. Export any report to Excel in one click.",
        features: [
          "Executive dashboard with 20+ KPI cards",
          "Sales, production, and dispatch trend charts",
          "Inventory ageing and slow-mover reports",
          "Collection efficiency and debtor analysis",
          "One-click Excel export for all reports",
        ],
        how: "Login → select role-based dashboard → drill down from KPI to transaction level → export or share.",
      },
      {
        id: "assets",
        icon: PiggyBank,
        name: "Fixed Assets",
        tagline: "Asset register, depreciation schedules",
        description:
          "Maintain a complete fixed asset register with SLM and WDV depreciation schedules. Record additions, revaluations, and disposals — every entry auto-posts to the general ledger.",
        features: [
          "Fixed asset register with category grouping",
          "SLM and WDV depreciation computation",
          "Asset addition, revaluation & disposal entries",
          "Depreciation schedule reports",
          "Auto-posting to general ledger",
        ],
        how: "Add asset → assign method → run monthly depreciation → journals auto-post → net book value updated.",
      },
    ],
  },
  {
    id: "people",
    label: "People & CRM",
    headline: "Manage your team and grow your customer base",
    sub: "HR, payroll, CRM, and WhatsApp — all connected to the same data.",
    modules: [
      {
        id: "hr",
        icon: UserCheck,
        name: "HR & Payroll",
        tagline: "Attendance, leaves, payroll, TDS, Form 16",
        description:
          "Handle the full employee lifecycle — from onboarding to full-and-final settlement. Attendance (manual or biometric), leave management, and monthly payroll with PF, ESI, PT, and TDS computed automatically.",
        features: [
          "Employee master with documents and org-chart",
          "Attendance: manual, bulk import, or biometric",
          "Leave management with configurable leave types",
          "Payroll with PF, ESI, PT, TDS auto-computation",
          "Payslip generation and bank transfer export",
        ],
        how: "Onboard employee → mark attendance → approve leaves → run payroll → generate payslips in one click.",
      },
      {
        id: "ess",
        icon: MonitorSmartphone,
        name: "Employee Self-Service",
        tagline: "Payslips, leaves, expense claims, appraisals",
        description:
          "Give every employee their own portal to view payslips, apply for leave, submit expense claims, and track appraisal status — without HR involvement for routine requests.",
        features: [
          "Payslip download (PDF) with salary breakdown",
          "Leave application and balance view",
          "Expense claim submission with receipt upload",
          "Appraisal self-assessment form",
          "Holiday calendar and company announcements",
        ],
        how: "Employee logs in → views payslip / applies leave / submits claim → manager gets notified → approved instantly.",
      },
      {
        id: "crm",
        icon: Target,
        name: "CRM",
        tagline: "Lead pipeline, follow-ups, conversions",
        description:
          "Capture leads from any source, track them through the pipeline, send quotations, and convert to sales orders in one click. Set follow-up reminders so no opportunity is missed.",
        features: [
          "Lead capture and visual pipeline board",
          "Quotation builder linked to product catalogue",
          "Follow-up reminders and activity log",
          "One-click conversion: quotation → sales order",
          "Customer credit-limit check at order stage",
        ],
        how: "Log lead → create quotation → follow up → convert to order → invoice → payment collected.",
      },
      {
        id: "whatsapp",
        icon: MessageCircle,
        name: "WhatsApp Integration",
        tagline: "Checklists, startup alerts & notifications",
        description:
          "Send invoices, payslips, POs, and reminders directly via WhatsApp. Machine startup checklists and breakdown alerts reach operators on their phones. Approval notifications let managers approve without logging in.",
        features: [
          "Send invoices, POs & quotes via WhatsApp",
          "Payment reminder automation with schedule",
          "Machine startup and breakdown alerts",
          "Approval notification with one-tap response",
          "Inbound WhatsApp queries (e.g. stock balance)",
        ],
        how: "Configure WhatsApp number → link Meta Cloud API → all document actions trigger automatic messages.",
      },
    ],
  },
  {
    id: "verticals",
    label: "Industry Verticals",
    headline: "Purpose-built for your industry",
    sub: "Activate the vertical module that matches your business — healthcare, education, logistics, and more.",
    modules: [
      {
        id: "healthcare",
        icon: HeartPulse,
        name: "Healthcare",
        tagline: "Patients, OPD/IPD, wards, billing",
        description:
          "Manage the full patient journey — from appointment booking to discharge. OPD consultations, IPD admissions, ward assignments, pharmacy inventory, and patient billing all in one system.",
        features: [
          "Patient registration with medical history",
          "OPD appointment scheduling and consultation notes",
          "IPD admission, ward assignment & discharge",
          "Pharmacy inventory with expiry-date tracking",
          "Patient billing with insurance support",
        ],
        how: "Register patient → book appointment → consult → admit to ward if needed → discharge → bill raised.",
      },
      {
        id: "education",
        icon: GraduationCap,
        name: "Education",
        tagline: "Students, classes, fee collection",
        description:
          "A 12-tab ERP for schools and colleges covering admissions, attendance, timetables, assessments, library, transport, hostel, and fee collection — including scholarships and fee ledger.",
        features: [
          "Student admission, profile & academic record",
          "Fee collection with scholarships and discounts",
          "Class attendance and staff check-in/out",
          "Timetable, subjects & assessment management",
          "Library, transport & hostel modules",
        ],
        how: "Admit student → assign class → collect fees → track attendance → run exams → generate report cards.",
      },
      {
        id: "logistics",
        icon: Truck,
        name: "Logistics & Transport",
        tagline: "Fleet, trips, consignment notes (LR)",
        description:
          "Track trips from loading to delivery. Generate Lorry Receipts (LR / consignment notes), assign vehicles, monitor fuel and maintenance costs, and calculate profitability per trip.",
        features: [
          "Vehicle master with document expiry tracking",
          "Trip creation and route assignment",
          "Lorry Receipt (LR) generation and tracking",
          "Driver attendance and payment management",
          "Trip-wise cost and profitability reports",
        ],
        how: "Create trip → assign vehicle & driver → generate LR → track delivery → compute trip profit.",
      },
      {
        id: "real-estate",
        icon: Home,
        name: "Real Estate",
        tagline: "Projects, units, bookings, payment schedule",
        description:
          "Manage residential and commercial projects end-to-end — unit inventory, bookings, payment schedules, construction procurement, and GST-compliant billing for under-construction properties.",
        features: [
          "Project and unit master with floor plans",
          "Booking management and agreement tracking",
          "Payment schedule with automated reminders",
          "Construction procurement via purchase orders",
          "GST-compliant invoice for under-construction units",
        ],
        how: "Create project → add units → book unit → set payment schedule → collect instalments → hand over.",
      },
      {
        id: "retail",
        icon: ShoppingBag,
        name: "Retail / POS",
        tagline: "Live billing terminal, sessions, sales history",
        description:
          "A point-of-sale terminal for walk-in retail. Scan barcodes, accept cash, card, or UPI, and close the day with a session reconciliation. Stock is deducted in real time; managers see outlet-wise sales instantly.",
        features: [
          "POS terminal with barcode/QR scanning",
          "Cash, card, and UPI payment capture",
          "Real-time stock deduction on each sale",
          "Session open/close with cash reconciliation",
          "Outlet-wise sales and returns dashboard",
        ],
        how: "Open session → scan items → collect payment → print receipt → close session → accounts auto-updated.",
      },
      {
        id: "agriculture",
        icon: Leaf,
        name: "Agriculture",
        tagline: "Farms, crop cycles, procurement, commodity prices",
        description:
          "Track the full crop lifecycle — from planting to harvest to sale. Manage procurement from farmers, monitor commodity prices, handle seasonal labour, and generate GST invoices for agri-produce.",
        features: [
          "Farm master and crop cycle tracking",
          "Harvest recording and yield analysis",
          "Farmer procurement with weighment records",
          "Live commodity price monitoring",
          "Seasonal labour payroll management",
        ],
        how: "Register farm → start crop cycle → record harvest → procure from farmers → sell → invoice raised.",
      },
      {
        id: "hotel",
        icon: Hotel,
        name: "Hotel ERP",
        tagline: "Rooms, bookings, F&B, folios, channel manager",
        description:
          "A full-stack hotel management system covering front office, housekeeping, F&B, banquets, and finance — all in one platform. Integrates with OTA channels and generates GST-compliant folios.",
        features: [
          "Room inventory with real-time availability calendar",
          "Check-in / check-out with folio management",
          "F&B POS with KOT and room charge posting",
          "Banquet & conference room bookings",
          "OTA channel sync and direct booking engine",
        ],
        how: "Guest books → check-in → charges posted to folio → check-out → GST invoice → payment settled.",
      },
      {
        id: "pharmacy",
        icon: Pill,
        name: "Pharmacy ERP",
        tagline: "FEFO billing, narcotics register, prescriptions",
        description:
          "Pharmacy-specific billing engine with FEFO (First Expiry First Out) stock depletion, narcotics register maintenance, prescription tracking, and GST-compliant invoicing with drug schedules.",
        features: [
          "FEFO-based stock depletion to minimise expiry losses",
          "Narcotics and Schedule H / H1 drug register",
          "Prescription linkage on every sales bill",
          "Supplier return and expiry claim management",
          "GST-compliant pharmacy billing with HSN codes",
        ],
        how: "Receive drug stock → FEFO assigned → pharmacist bills prescription → narcotics logged → invoice raised.",
      },
      {
        id: "ngo",
        icon: TreePine,
        name: "NGO / Trust ERP",
        tagline: "80G certificates, FCRA filing, donor portal",
        description:
          "Purpose-built for non-profits. Manage donor registrations, issue 80G certificates in bulk, track FCRA-regulated foreign contributions, and maintain fund-wise accounting for CSR and grants.",
        features: [
          "Donor registration and contribution tracking",
          "80G certificate bulk PDF generation & e-mail dispatch",
          "FCRA fund accounting and online filing support",
          "Project-wise fund utilisation reports",
          "CSR compliance module for corporate donors",
        ],
        how: "Register donor → record donation → generate 80G PDF → mail to donor → fund utilisation report for board.",
      },
      {
        id: "nidhi",
        icon: Landmark,
        name: "Nidhi Company ERP",
        tagline: "RBI NDH returns, loans, FD/RD, PDC tracking",
        description:
          "Regulatory-compliant ERP for Nidhi companies. Manage member savings, fixed deposits, recurring deposits, loan disbursements, EMI collections, PDC tracking, and RBI NDH return filing.",
        features: [
          "Member master with KYC and shareholding",
          "FD / RD management with auto-maturity alerts",
          "Loan sanction workflow with repayment schedule",
          "PDC (post-dated cheque) tracking and bounce alerts",
          "RBI NDH quarterly return generation",
        ],
        how: "Member joins → opens FD/RD → applies for loan → EMI collected → PDC tracked → RBI return filed.",
      },
    ],
  },
  {
    id: "ai-products",
    label: "AI Products",
    headline: "AI-powered platform tools — beyond ERP",
    sub: "SwachForms, SwachMeet, and SwachDesk are included with every subscription — no separate licence.",
    modules: [
      {
        id: "swachforms",
        icon: Sparkles,
        name: "SwachForms",
        tagline: "AI form builder — describe it, AI builds it instantly",
        description:
          "Describe any form in plain English and SwachForms generates all fields, validations, and layout in seconds. Build patient intake, feedback, inspection, admission, or compliance forms — no coding needed. Share via public link or QR code.",
        features: [
          "AI-powered field generation from plain English description",
          "8 industry-specific templates out of the box",
          "Conditional logic and multi-step form flows",
          "Public link + QR code sharing for instant distribution",
          "Submission dashboard with analytics and CSV export",
        ],
        how: "Describe form → AI generates → customise if needed → share link/QR → responses arrive in dashboard.",
      },
      {
        id: "swachmeet",
        icon: Video,
        name: "SwachMeet",
        tagline: "Built-in video conferencing — no Zoom needed",
        description:
          "Host client meetings, staff reviews, vendor negotiations, and remote training sessions directly inside SwachERP. No separate Zoom or Teams subscription — works in the browser, no app download required.",
        features: [
          "HD video and audio conferencing in-browser",
          "Screen sharing for demos and presentations",
          "Session recording and playback",
          "Works from any device — laptop, tablet, or phone",
          "Integrated with SwachERP contacts and calendar",
        ],
        how: "Create meeting → share invite link → participant joins browser → screen-share and record → meeting ends.",
      },
      {
        id: "swachdesk",
        icon: Headphones,
        name: "SwachDesk",
        tagline: "Helpdesk ticketing with SLA tracking & escalations",
        description:
          "Built-in helpdesk for managing customer complaints, internal IT tickets, and vendor issues. Set SLA timers, assign agents, define escalation paths, and maintain a full ticket history with audit trail.",
        features: [
          "SLA timers with breach alerts and escalation rules",
          "Multi-priority ticket queues (Critical, High, Medium, Low)",
          "Agent assignment and workload balancing",
          "Full ticket history with every comment and attachment",
          "Customer satisfaction (CSAT) rating on ticket close",
        ],
        how: "Ticket raised → SLA timer starts → agent assigned → resolved → CSAT sent → audit trail logged.",
      },
    ],
  },
  {
    id: "platform",
    label: "Platform",
    headline: "Enterprise-grade infrastructure under the hood",
    sub: "Role-based access, full audit trails, open APIs, and configurable integrations — ready out of the box.",
    modules: [
      {
        id: "api-hub",
        icon: Key,
        name: "API Hub",
        tagline: "Scoped keys, live tester, call logs & analytics",
        description:
          "Issue scoped API keys with read/write permissions per module. Test your integration live in the API tester. Monitor every API call with a detailed log and analytics dashboard.",
        features: [
          "Scoped API key generation per module",
          "Live API tester with request/response preview",
          "Full API call logs with timestamp and payload",
          "Rate limiting and key expiry management",
          "Webhook support for event-driven integrations",
        ],
        how: "Generate key → integrate your app → test in live tester → monitor call logs → set rate limits.",
      },
      {
        id: "approvals",
        icon: GitBranch,
        name: "Approval Workflows",
        tagline: "Amount-based rules, multi-level approvals",
        description:
          "Configure multi-level approval rules for POs, expense claims, sales discounts, leave requests, and more. Set amount thresholds, assign approvers, and notify instantly via WhatsApp and email.",
        features: [
          "Rules configurable per document type and amount",
          "Sequential or parallel multi-level approvers",
          "Instant WhatsApp + email notifications",
          "Unified approval inbox per approver",
          "Full audit trail of every approve / reject",
        ],
        how: "Configure rule → document submitted → approver notified → approved → next level triggered → released.",
      },
      {
        id: "audit-trail",
        icon: ClipboardCheck,
        name: "Audit Trail",
        tagline: "Full change log across all entities",
        description:
          "Every create, edit, and delete across the entire system is logged with user, timestamp, and before/after values. Filter by entity type, date range, or user — essential for audits and compliance.",
        features: [
          "Change log for every entity in the system",
          "Before and after values for every field change",
          "Filter by entity type, date range, and user",
          "Tamper-proof log — entries cannot be deleted",
          "Export audit log to Excel or CSV",
        ],
        how: "Any change made → automatically logged → auditor searches by date/entity → exports for audit report.",
      },
      {
        id: "integrations",
        icon: Webhook,
        name: "Custom Integrations",
        tagline: "Register your own endpoints alongside built-ins",
        description:
          "Register external webhook endpoints to receive real-time events from SwachERP. Connect your e-commerce store, payment gateway, logistics partner, or any other system without writing custom connectors.",
        features: [
          "Register custom webhook endpoints per event",
          "Choose from 30+ event types (invoice created, GRN received, etc.)",
          "Secure HMAC signature verification",
          "Delivery log with retry on failure",
          "Test endpoint with sample payloads",
        ],
        how: "Register endpoint → choose events → SwachERP fires webhook on event → your system processes it.",
      },
    ],
  },
];

// ─── Category colour map ──────────────────────────────────────────────────────
const CAT_COLOR: Record<string, { pill: string; icon: string }> = {
  operations:   { pill: "bg-blue-100 text-blue-700",    icon: "text-blue-600 bg-blue-50"    },
  finance:      { pill: "bg-emerald-100 text-emerald-700", icon: "text-emerald-600 bg-emerald-50" },
  people:       { pill: "bg-violet-100 text-violet-700", icon: "text-violet-600 bg-violet-50" },
  verticals:    { pill: "bg-orange-100 text-orange-700", icon: "text-orange-600 bg-orange-50" },
  "ai-products":{ pill: "bg-purple-100 text-purple-700", icon: "text-purple-600 bg-purple-50" },
  platform:     { pill: "bg-rose-100 text-rose-700",    icon: "text-rose-600 bg-rose-50"    },
};

// ─── Module card ──────────────────────────────────────────────────────────────
function ModuleCard({ mod, catId }: { mod: (typeof GROUPS)[0]["modules"][0]; catId: string }) {
  const Icon = mod.icon;
  const c = CAT_COLOR[catId];
  return (
    <div id={mod.id} className="scroll-mt-28 rounded-xl border bg-card p-6 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${c.icon}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold leading-tight">{mod.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{mod.tagline}</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{mod.description}</p>

      <ul className="space-y-1.5">
        {mod.features.map(f => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto rounded-lg bg-muted/50 px-4 py-3 border">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">How it works</p>
        <p className="text-xs text-foreground leading-relaxed">{mod.how}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FeaturesPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4 flex-wrap">
          {/* Left: home icon + logo */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              title="Back to Home"
            >
              <Home className="w-4 h-4" />
            </Button>
            <div className="h-5 w-px bg-border" />
            <button onClick={() => setLocation("/")} className="flex items-center">
              <img src="/swacherp-logo.png" alt="SwachERP" className="h-8 w-auto" />
            </button>
          </div>
          {/* Right: nav + CTA */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/solutions")}>Solutions</Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/pricing")}>Pricing</Button>
            <Button size="sm" onClick={() => setLocation("/register-company")} className="gap-1.5">
              Start Free Trial <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero — full width strip ── */}
      <section className="border-b bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                <Zap className="w-3.5 h-3.5" /> 30+ integrated modules
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
                Everything your business needs —<br />
                <span className="text-primary">one unified platform.</span>
              </h1>
              <p className="text-muted-foreground text-base leading-relaxed">
                SwachERP covers production, finance, HR, CRM, and industry-specific workflows in a single GST-compliant cloud ERP. No integrations, no sync issues, no data silos.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:flex-col lg:items-end">
              <Button size="lg" onClick={() => setLocation("/register-company")} className="gap-2">
                Start Free Trial <ArrowRight className="w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => setLocation("/demo")}>
                Book a Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Category quick-jump ── */}
      <div className="sticky top-14 z-40 border-b bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
          <div className="flex gap-1 py-2 whitespace-nowrap">
            {GROUPS.map(g => {
              const c = CAT_COLOR[g.id];
              return (
                <button
                  key={g.id}
                  onClick={() => {
                    const el = document.getElementById(`group-${g.id}`);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${c.pill}`}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Module groups ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {GROUPS.map(group => (
          <section key={group.id} id={`group-${group.id}`} className="scroll-mt-28">
            {/* Group header */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <span className={`inline-block text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-2 ${CAT_COLOR[group.id].pill}`}>
                  {group.label}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold">{group.headline}</h2>
                <p className="text-muted-foreground mt-1 text-sm">{group.sub}</p>
              </div>
              <p className="text-xs text-muted-foreground flex-shrink-0">
                {group.modules.length} module{group.modules.length > 1 ? "s" : ""}
              </p>
            </div>

            {/* Module card grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {group.modules.map(mod => (
                <ModuleCard key={mod.id} mod={mod} catId={group.id} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* ── Bottom CTA ── */}
      <section className="border-t bg-primary py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-primary-foreground">Ready to try SwachERP?</h2>
            <p className="text-primary-foreground/80 mt-2 text-sm">14-day free trial. No credit card. Full access from day one.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" variant="secondary" onClick={() => setLocation("/register-company")} className="gap-2">
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLocation("/demo")}
              className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10"
            >
              Book a Demo
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} MicroGrid. All rights reserved.</p>
      </footer>
    </div>
  );
}
