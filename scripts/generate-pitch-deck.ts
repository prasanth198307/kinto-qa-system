import { createRequire } from "module";
const require = createRequire(import.meta.url);
const PptxGenJS = require("pptxgenjs");

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE"; // 13.33" x 7.5"

// ── Colour palette ────────────────────────────────────────────
const C = {
  navy:      "1E3A5F",
  blue:      "2563EB",
  lightBlue: "EFF6FF",
  accent:    "F59E0B",
  white:     "FFFFFF",
  dark:      "1E293B",
  muted:     "64748B",
  cardBg:    "F8FAFC",
  border:    "E2E8F0",
  green:     "16A34A",
};

// ── Reusable helpers ──────────────────────────────────────────
function addNavyHeader(slide: any, title: string, subtitle?: string) {
  // Header bar
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 1.2, fill: { color: C.navy } });
  slide.addText(title, {
    x: 0.4, y: 0.15, w: 11, h: 0.7,
    fontSize: 26, bold: true, color: C.white, fontFace: "Calibri",
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.4, y: 0.78, w: 10, h: 0.3,
      fontSize: 12, color: "93C5FD", fontFace: "Calibri",
    });
  }
  // Bottom accent bar
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 7.3, w: "100%", h: 0.2, fill: { color: C.blue } });
  slide.addText("© 2026 Kinto Smart Ops  |  Built for Indian Manufacturers", {
    x: 0.3, y: 7.25, w: 12, h: 0.22,
    fontSize: 8, color: C.muted, fontFace: "Calibri", align: "center",
  });
}

function card(slide: any, x: number, y: number, w: number, h: number, title: string, body: string, titleColor = C.navy) {
  slide.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: C.cardBg }, line: { color: C.border, width: 1 }, rectRadius: 0.08 });
  slide.addText(title, { x: x + 0.12, y: y + 0.1, w: w - 0.24, h: 0.3, fontSize: 11, bold: true, color: titleColor, fontFace: "Calibri" });
  slide.addText(body,  { x: x + 0.12, y: y + 0.38, w: w - 0.24, h: h - 0.5, fontSize: 9.5, color: C.muted, fontFace: "Calibri", valign: "top" });
}

function bullet(slide: any, x: number, y: number, w: number, items: string[], size = 11) {
  slide.addText(
    items.map(t => ({ text: t, options: { bullet: { type: "bullet", characterCode: "25A0", color: C.blue }, paraSpaceBefore: 4 } })),
    { x, y, w, h: 4, fontSize: size, color: C.dark, fontFace: "Calibri", valign: "top" }
  );
}

// ══════════════════════════════════════════════════════════════
// SLIDE 1 — TITLE
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  // Full-bleed navy background
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: C.navy } });
  // Decorative accent blocks
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 5.8, w: "100%", h: 0.08, fill: { color: C.blue } });
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 5.88, w: "100%", h: 1.62, fill: { color: "162D4B" } });
  s.addShape(pptx.ShapeType.rect, { x: 8.5, y: 0, w: 4.83, h: 5.8, fill: { color: "162D4B" } });
  s.addShape(pptx.ShapeType.rect, { x: 8.5, y: 0, w: 0.06, h: 5.8, fill: { color: C.blue } });

  // Tag line badge
  s.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.1, w: 2.8, h: 0.34, fill: { color: C.blue }, rectRadius: 0.05 });
  s.addText("Built for Indian Manufacturing", { x: 0.5, y: 1.1, w: 2.8, h: 0.34, fontSize: 9.5, color: C.white, fontFace: "Calibri", align: "center", bold: true });

  s.addText("Kinto Smart Ops", { x: 0.5, y: 1.6, w: 7.7, h: 1.1, fontSize: 44, bold: true, color: C.white, fontFace: "Calibri" });
  s.addText("The Complete ERP Platform\nfor Indian Manufacturers", {
    x: 0.5, y: 2.65, w: 7.7, h: 1.0, fontSize: 22, color: "93C5FD", fontFace: "Calibri"
  });
  s.addText("Production · HR & Payroll · GST Invoicing · CRM · Accounting · WhatsApp · MIS", {
    x: 0.5, y: 3.7, w: 7.7, h: 0.4, fontSize: 12, color: "7DD3FC", fontFace: "Calibri"
  });

  // Right panel stats
  const stats = [["15+","ERP Modules"],["100%","Cloud-Based"],["GST","Compliant"],["WhatsApp","Native"]];
  stats.forEach(([val, lbl], i) => {
    const sy = 0.9 + i * 1.18;
    s.addText(val, { x: 8.8, y: sy, w: 4.2, h: 0.55, fontSize: 30, bold: true, color: C.accent, fontFace: "Calibri", align: "center" });
    s.addText(lbl, { x: 8.8, y: sy + 0.52, w: 4.2, h: 0.3,  fontSize: 12, color: "93C5FD",  fontFace: "Calibri", align: "center" });
  });

  // Bottom bar
  s.addText("Confidential  |  Sales Presentation  |  2026", {
    x: 0.5, y: 6.0, w: 12.3, h: 0.3, fontSize: 9, color: "93C5FD", fontFace: "Calibri"
  });
  s.addText("www.kintoops.in  |  hello@kintoops.in", {
    x: 0.5, y: 6.35, w: 12.3, h: 0.3, fontSize: 9, color: "7DD3FC", fontFace: "Calibri"
  });
}

// ══════════════════════════════════════════════════════════════
// SLIDE 2 — THE PROBLEM
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addNavyHeader(s, "The Challenge Indian Manufacturers Face", "Sound familiar?");
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 1.2, w: "100%", h: 6.1, fill: { color: C.lightBlue } });

  const problems = [
    ["Scattered Data", "Production tracked on Excel, inventory on paper, accounts in Tally — no single source of truth."],
    ["No Real-time Visibility", "Owners get weekly/monthly reports. By the time they act, the problem has grown."],
    ["GST Compliance Burden", "Manual invoice creation, error-prone GST calculations, last-minute filing stress every month."],
    ["HR Done Manually", "Attendance in registers, payroll on Excel, payslips printed by hand — error-prone and time-consuming."],
    ["Zero CRM", "Sales leads tracked on WhatsApp or notebooks. Follow-ups missed. Deals lost without knowing why."],
    ["No ESS for Employees", "Staff call HR for payslips, leave balances, tax info. HR spends hours on routine queries."],
  ];

  problems.forEach(([title, body], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    card(s, 0.3 + col * 4.3, 1.4 + row * 2.1, 4.1, 1.9, title, body, "B91C1C");
  });
}

// ══════════════════════════════════════════════════════════════
// SLIDE 3 — OUR SOLUTION
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addNavyHeader(s, "One Platform. Everything Connected.", "Kinto Smart Ops replaces every tool your factory uses");

  s.addShape(pptx.ShapeType.rect, { x: 0, y: 1.2, w: "100%", h: 6.1, fill: { color: C.white } });

  // Centre circle concept
  s.addShape(pptx.ShapeType.ellipse, { x: 5.2, y: 2.6, w: 2.9, h: 2.9, fill: { color: C.navy } });
  s.addText("Kinto\nSmart Ops", { x: 5.2, y: 3.1, w: 2.9, h: 1.4, fontSize: 16, bold: true, color: C.white, fontFace: "Calibri", align: "center" });

  // Surrounding modules
  const spokes = [
    [0.2, 1.5, "Production &\nInventory"],
    [0.2, 3.0, "GST Invoicing\n& Accounting"],
    [0.2, 4.5, "Purchase &\nDispatch"],
    [8.5, 1.5, "HR & Payroll\n& ESS Portal"],
    [8.5, 3.0, "CRM &\nLead Pipeline"],
    [8.5, 4.5, "WhatsApp &\nMIS Analytics"],
  ];

  spokes.forEach(([x, y, label]) => {
    s.addShape(pptx.ShapeType.rect, { x: x as number, y: y as number, w: 2.5, h: 0.9, fill: { color: C.blue }, rectRadius: 0.08 });
    s.addText(label as string, { x: x as number, y: y as number, w: 2.5, h: 0.9, fontSize: 11, bold: true, color: C.white, fontFace: "Calibri", align: "center" });
  });

  s.addText("Replace 6 different tools with one integrated cloud ERP — no more data silos.", {
    x: 0.5, y: 6.6, w: 12.3, h: 0.4, fontSize: 12, color: C.blue, fontFace: "Calibri", align: "center", bold: true,
  });
}

// ══════════════════════════════════════════════════════════════
// SLIDE 4 — 15 MODULES OVERVIEW
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addNavyHeader(s, "15+ Integrated Modules", "Full platform unlocked at Enterprise — ₹2,599/month");
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 1.2, w: "100%", h: 6.1, fill: { color: C.lightBlue } });

  // Plan legend
  const legend = [["BASIC", C.muted, "F1F5F9"], ["PRO", "0369A1", "DBEAFE"], ["ENTERPRISE", C.navy, C.navy]];
  legend.forEach(([lbl, txtColor, bg], i) => {
    s.addShape(pptx.ShapeType.rect, { x: 7.5 + i * 1.85, y: 1.28, w: 1.7, h: 0.26, fill: { color: bg as string }, rectRadius: 0.04 });
    s.addText(lbl as string, { x: 7.5 + i * 1.85, y: 1.28, w: 1.7, h: 0.26, fontSize: 7.5, bold: true,
      color: i === 2 ? C.white : txtColor as string, fontFace: "Calibri", align: "center", valign: "middle" });
  });
  s.addText("Plan:", { x: 6.9, y: 1.28, w: 0.6, h: 0.26, fontSize: 7.5, color: C.muted, fontFace: "Calibri", valign: "middle" });

  const modules: { name: string; plan: "BASIC" | "PRO" | "ENTERPRISE" }[] = [
    { name: "GST Invoicing",           plan: "BASIC"      },
    { name: "Inventory Control",       plan: "BASIC"      },
    { name: "Purchase Orders",         plan: "BASIC"      },
    { name: "Dispatch & Gatepasses",   plan: "BASIC"      },
    { name: "Expenses & Cash Register",plan: "BASIC"      },
    { name: "Production Management",   plan: "PRO"        },
    { name: "Quality & Returns",       plan: "PRO"        },
    { name: "Double-Entry Accounting", plan: "PRO"        },
    { name: "MIS Analytics",           plan: "PRO"        },
    { name: "WhatsApp Integration",    plan: "PRO"        },
    { name: "Preventive Maintenance",  plan: "PRO"        },
    { name: "CRM Lead Management",     plan: "PRO"        },
    { name: "HR & Payroll",            plan: "ENTERPRISE" },
    { name: "Employee Self-Service",   plan: "ENTERPRISE" },
    { name: "Document Management",     plan: "ENTERPRISE" },
  ];

  const planStyle: Record<string, { bg: string; text: string; badge: string; badgeTxt: string }> = {
    BASIC:      { bg: C.white,     text: C.navy,  badge: "F1F5F9", badgeTxt: C.muted  },
    PRO:        { bg: "EFF6FF",    text: "0369A1", badge: "DBEAFE", badgeTxt: "0369A1" },
    ENTERPRISE: { bg: C.navy,     text: C.white, badge: C.accent, badgeTxt: C.dark   },
  };

  modules.forEach((mod, i) => {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const st = planStyle[mod.plan];
    const cx = 0.25 + col * 2.57;
    const cy = 1.62 + row * 1.88;

    s.addShape(pptx.ShapeType.rect, { x: cx, y: cy, w: 2.4, h: 1.68,
      fill: { color: st.bg }, line: { color: mod.plan === "ENTERPRISE" ? C.blue : C.border, width: mod.plan === "ENTERPRISE" ? 2 : 1 }, rectRadius: 0.08 });
    s.addText(mod.name, { x: cx + 0.08, y: cy + 0.12, w: 2.24, h: 1.1,
      fontSize: 10.5, bold: true, color: st.text, fontFace: "Calibri", align: "center", valign: "middle" });
    // Plan badge
    s.addShape(pptx.ShapeType.rect, { x: cx + 0.08, y: cy + 1.22, w: 2.24, h: 0.28,
      fill: { color: st.badge }, rectRadius: 0.04 });
    s.addText(mod.plan, { x: cx + 0.08, y: cy + 1.22, w: 2.24, h: 0.28,
      fontSize: 7.5, bold: true, color: st.badgeTxt, fontFace: "Calibri", align: "center", valign: "middle" });
  });
}

// ══════════════════════════════════════════════════════════════
// SLIDE 5 — PRODUCTION & OPERATIONS
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addNavyHeader(s, "Production & Operations", "From raw material to finished goods — fully tracked");
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 1.2, w: "100%", h: 6.1, fill: { color: C.white } });

  const items = [
    ["BOM-Driven Production", "Define Bills of Materials for each product. Production entries auto-calculate material consumption."],
    ["FIFO Batch Tracking", "Inventory deducted using First-In-First-Out batches. Full traceability from GRN to dispatch."],
    ["Quality Control", "Three-stage return workflow — inspection, rejection, and restocking with audit trail."],
    ["Gatepass & Dispatch", "Invoice-first dispatch with digital signatures. State machine prevents tampering after issue."],
    ["Purchase Orders", "Vendor management, GRN against PO, debit notes, and raw material traceability."],
    ["Preventive Maintenance", "Machine-wise schedules, checklist tracking, spare part inventory, and overdue alerts."],
  ];

  items.forEach(([title, body], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    card(s, 0.3 + col * 6.5, 1.4 + row * 1.85, 6.2, 1.72, title, body);
  });
}

// ══════════════════════════════════════════════════════════════
// SLIDE 6 — ACCOUNTING & FINANCE
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addNavyHeader(s, "Accounting & Finance", "GST-compliant, audit-ready, real-time");
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 1.2, w: "100%", h: 6.1, fill: { color: C.lightBlue } });

  const left = [
    "GST-compliant tax invoices with GSTIN validation",
    "Credit notes, debit notes, and receipt vouchers",
    "Double-entry Chart of Accounts (COA)",
    "Profit & Loss statement — real-time",
    "Balance Sheet — live, no month-end closing needed",
    "Customer advances with auto-adjustment on invoices",
    "Vendor debit note adjustments",
    "Cash register with daily voucher printing",
    "Expense tracking with category-wise reports",
  ];

  const right = [
    ["MIS Analytics", "Executive KPIs, production efficiency, cash flow, inventory turnover — no Excel needed."],
    ["Sales Dashboard", "Revenue by customer, product, and period. Overdue receivables at a glance."],
    ["GST Reports", "GSTR-ready summaries exportable for direct filing."],
  ];

  s.addText("What's Included", { x: 0.4, y: 1.3, w: 6.2, h: 0.3, fontSize: 12, bold: true, color: C.navy, fontFace: "Calibri" });
  bullet(s, 0.4, 1.65, 6.0, left, 11);

  right.forEach(([title, body], i) => card(s, 6.9, 1.35 + i * 1.95, 6.0, 1.8, title, body));
}

// ══════════════════════════════════════════════════════════════
// SLIDE 7 — HR & PAYROLL
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  // NEW badge in header
  addNavyHeader(s, "HR & Payroll Module", "Complete employee lifecycle management — NEW in Enterprise plan");
  s.addShape(pptx.ShapeType.rect, { x: 11.8, y: 0.08, w: 0.9, h: 0.32, fill: { color: C.accent }, rectRadius: 0.05 });
  s.addText("NEW", { x: 11.8, y: 0.08, w: 0.9, h: 0.32, fontSize: 10, bold: true, color: C.dark, fontFace: "Calibri", align: "center" });
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 1.2, w: "100%", h: 6.1, fill: { color: C.white } });

  const features = [
    ["Employee Master", "5-tab form: personal, employment, statutory, bank, and family details. Department, designation & shift masters."],
    ["Attendance Management", "Daily attendance tracking, monthly calendar view, late/absent reports."],
    ["Leave Management", "Leave types, approval workflows, WhatsApp notifications, EL year-end carry-forward."],
    ["Payroll Processing", "Salary structures with Basic/HRA/DA components, PF/ESI auto-calc, PT from state slabs."],
    ["TDS & Compliance", "Monthly TDS projection (Old & New regime), investment declaration (80C/80D/HRA), Form 16 Part A+B."],
    ["Recruitment", "Job openings with Kanban pipeline, candidate applications, and stage tracking."],
    ["Full & Final Settlement", "Auto-calculate pending salary, EL encashment, gratuity, and notice recovery."],
    ["Payslip Delivery", "Bulk or individual payslip delivery via WhatsApp and Email — one click."],
  ];

  features.forEach(([title, body], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    card(s, 0.3 + col * 6.5, 1.35 + row * 1.42, 6.2, 1.3, title, body);
  });
}

// ══════════════════════════════════════════════════════════════
// SLIDE 8 — CRM LEAD MANAGEMENT
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addNavyHeader(s, "CRM Lead Management", "Never miss a sales opportunity — NEW in Professional plan");
  s.addShape(pptx.ShapeType.rect, { x: 11.8, y: 0.08, w: 0.9, h: 0.32, fill: { color: C.accent }, rectRadius: 0.05 });
  s.addText("NEW", { x: 11.8, y: 0.08, w: 0.9, h: 0.32, fontSize: 10, bold: true, color: C.dark, fontFace: "Calibri", align: "center" });
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 1.2, w: "100%", h: 6.1, fill: { color: C.lightBlue } });

  // Pipeline stages
  const stages = ["New", "Contacted", "Interested", "Qualified", "Lost", "Converted"];
  stages.forEach((stage, i) => {
    const color = stage === "Converted" ? C.green : stage === "Lost" ? "DC2626" : C.blue;
    s.addShape(pptx.ShapeType.rect, { x: 0.25 + i * 2.15, y: 1.4, w: 2.0, h: 0.55, fill: { color }, rectRadius: 0.06 });
    s.addText(stage, { x: 0.25 + i * 2.15, y: 1.4, w: 2.0, h: 0.55, fontSize: 11, bold: true, color: C.white, fontFace: "Calibri", align: "center" });
    if (i < 5) s.addText("→", { x: 0.25 + i * 2.15 + 1.95, y: 1.52, w: 0.25, h: 0.3, fontSize: 12, color: C.navy, fontFace: "Calibri" });
  });

  s.addText("6-Stage Lead Pipeline", { x: 0.25, y: 1.28, w: 12.8, h: 0.2, fontSize: 9, bold: true, color: C.muted, fontFace: "Calibri" });

  const features = [
    ["Kanban Board View", "Drag leads across pipeline stages visually. Instantly see where every deal stands."],
    ["Table View", "Filter, sort, and export your entire lead list for reporting and analysis."],
    ["Lead Capture Form", "Name, company, phone, email, source, product interest, follow-up date, notes."],
    ["Assignment-Based Access", "Assign leads to sales reps. Reps only see and edit their own leads. Managers see all."],
    ["Follow-up Tracking", "Set next follow-up dates. Never let a lead go cold."],
    ["Pipeline Stats", "Live count by stage — instant visibility into your sales funnel health."],
  ];

  features.forEach(([title, body], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    card(s, 0.25 + col * 4.3, 2.2 + row * 2.2, 4.1, 2.05, title, body);
  });
}

// ══════════════════════════════════════════════════════════════
// SLIDE 9 — EMPLOYEE SELF-SERVICE
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addNavyHeader(s, "Employee Self-Service (ESS) Portal", "Empower your employees — reduce HR workload — NEW");
  s.addShape(pptx.ShapeType.rect, { x: 11.8, y: 0.08, w: 0.9, h: 0.32, fill: { color: C.accent }, rectRadius: 0.05 });
  s.addText("NEW", { x: 11.8, y: 0.08, w: 0.9, h: 0.32, fontSize: 10, bold: true, color: C.dark, fontFace: "Calibri", align: "center" });
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 1.2, w: "100%", h: 6.1, fill: { color: C.white } });

  // Left — what employees can do
  s.addText("What Employees Can Do", { x: 0.4, y: 1.35, w: 6.0, h: 0.35, fontSize: 13, bold: true, color: C.navy, fontFace: "Calibri" });

  const empActions = [
    "View and print payslips for any month",
    "Check monthly attendance records",
    "View leave balances and apply for leave",
    "Submit tax investment declarations (80C / 80D / HRA)",
    "View their own profile and employment details",
    "Track leave approval status in real-time",
  ];
  bullet(s, 0.4, 1.75, 6.0, empActions);

  // Right — what HR gains
  s.addShape(pptx.ShapeType.rect, { x: 6.8, y: 1.3, w: 6.0, h: 5.9, fill: { color: C.lightBlue }, rectRadius: 0.1 });
  s.addText("What HR Gains", { x: 7.0, y: 1.45, w: 5.6, h: 0.35, fontSize: 13, bold: true, color: C.navy, fontFace: "Calibri" });

  const hrGains = [
    ["Zero payslip queries", "Employees download their own payslips anytime."],
    ["Fewer leave calls", "Leave balances visible to employees 24x7."],
    ["Faster tax declarations", "Employees submit 80C/80D data online — no forms."],
    ["Admin ESS control", "HR enables ESS per employee and sets their login password."],
  ];

  hrGains.forEach(([title, body], i) => {
    s.addShape(pptx.ShapeType.rect, { x: 7.0, y: 1.95 + i * 1.2, w: 5.5, h: 1.08, fill: { color: C.white }, line: { color: C.border, width: 1 }, rectRadius: 0.06 });
    s.addText(title, { x: 7.12, y: 2.02 + i * 1.2, w: 5.3, h: 0.28, fontSize: 10.5, bold: true, color: C.navy, fontFace: "Calibri" });
    s.addText(body,  { x: 7.12, y: 2.28 + i * 1.2, w: 5.3, h: 0.6,  fontSize: 9.5, color: C.muted, fontFace: "Calibri" });
  });

  s.addText("Separate login portal — employees never access your main ERP.", {
    x: 0.4, y: 6.8, w: 12.3, h: 0.3, fontSize: 10, color: C.blue, fontFace: "Calibri", bold: true,
  });
}

// ══════════════════════════════════════════════════════════════
// SLIDE 10 — WHATSAPP INTEGRATION
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addNavyHeader(s, "WhatsApp-First Workflows", "Your factory floor runs on WhatsApp — so does Kinto");
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 1.2, w: "100%", h: 6.1, fill: { color: C.lightBlue } });

  const features = [
    ["Machine Startup Checklists", "Operators receive daily checklists on WhatsApp. Answers captured, AI-interpreted, and logged automatically — no app required."],
    ["Leave Approval Notifications", "When an employee applies for leave, the approver gets a WhatsApp message instantly. No email delays."],
    ["Payslip Delivery", "Send payslips to all employees via WhatsApp in one click. Individually or in bulk — every month."],
    ["Missed Checklist Alerts", "Auto-reminders if an operator hasn't completed their startup checklist by the scheduled time."],
    ["Document Expiry Alerts", "Automated WhatsApp alerts before quality certificates, vendor contracts, or compliance documents expire."],
    ["AI-Assisted Responses", "Colloki Flow AI interprets operator WhatsApp replies and flags anomalies for supervisors."],
  ];

  features.forEach(([title, body], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    card(s, 0.3 + col * 6.5, 1.35 + row * 1.85, 6.2, 1.72, title, body, "15803D");
  });
}

// ══════════════════════════════════════════════════════════════
// SLIDE 11 — WHY KINTO
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addNavyHeader(s, "Why Kinto Smart Ops?", "Purpose-built for Indian manufacturing — not a global ERP adapted for India");
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 1.2, w: "100%", h: 6.1, fill: { color: C.white } });

  const points = [
    ["Indian GST Built-In", "GSTIN validation, tax invoices, e-way bills, GSTR-ready reports. Designed for Indian compliance from day one — not an afterthought."],
    ["WhatsApp Native", "Your operators already use WhatsApp. Kinto meets them there — checklists, alerts, payslips all via WhatsApp."],
    ["Role-Based Access", "73+ screens with granular permissions per role. Admin, Manager, Accountant, Operator — each sees only what they need."],
    ["Multi-Tenant SaaS", "Your data is completely isolated. Every tenant gets their own secure workspace on our cloud platform."],
    ["Plan-Gated Modules", "Start with what you need, scale as you grow. Upgrade plans to unlock HR & Payroll, CRM, and more."],
    ["Rapid Onboarding", "14-day free trial. No credit card. Most teams are live within a week with guided setup."],
  ];

  points.forEach(([title, body], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    card(s, 0.3 + col * 6.5, 1.35 + row * 1.85, 6.2, 1.72, title, body);
  });
}

// ══════════════════════════════════════════════════════════════
// SLIDE 12 — PRICING
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addNavyHeader(s, "Simple, Transparent Pricing", "All plans include a 14-day free trial · No credit card required");
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 1.2, w: "100%", h: 6.1, fill: { color: C.lightBlue } });

  const plans = [
    {
      name: "Basic", price: "₹999", period: "/month", users: "5 base users",
      color: C.white, textColor: C.navy, highlight: false,
      features: ["GST invoicing & receipts","Inventory management","Purchase & sales orders","Gatepasses & dispatch","Expenses & documents","Email support"],
    },
    {
      name: "Professional", price: "₹1,499", period: "/month", users: "15 base users",
      color: C.navy, textColor: C.white, highlight: true,
      features: ["All Basic features","Production & BOM tracking","Double-entry accounting","MIS analytics dashboards","CRM lead management","WhatsApp checklists","Preventive maintenance","Priority support"],
    },
    {
      name: "Enterprise", price: "₹2,599", period: "/month", users: "20 base users",
      color: C.white, textColor: C.navy, highlight: false,
      features: ["All Professional features","HR & Payroll module","Employee Self-Service portal","TDS & compliance (Form 16)","Recruitment management","Custom branding","Dedicated support"],
    },
  ];

  plans.forEach((plan, i) => {
    const x = 0.4 + i * 4.2;
    s.addShape(pptx.ShapeType.rect, { x, y: 1.35, w: 4.0, h: 5.7, fill: { color: plan.color }, line: { color: plan.highlight ? C.blue : C.border, width: plan.highlight ? 3 : 1 }, rectRadius: 0.1 });
    if (plan.highlight) {
      s.addShape(pptx.ShapeType.rect, { x: x + 1.0, y: 1.15, w: 2.0, h: 0.35, fill: { color: C.accent }, rectRadius: 0.06 });
      s.addText("Most Popular", { x: x + 1.0, y: 1.15, w: 2.0, h: 0.35, fontSize: 9, bold: true, color: C.dark, fontFace: "Calibri", align: "center" });
    }
    s.addText(plan.name, { x: x + 0.15, y: 1.45, w: 3.7, h: 0.38, fontSize: 15, bold: true, color: plan.highlight ? C.accent : C.navy, fontFace: "Calibri" });
    s.addText(plan.price, { x: x + 0.15, y: 1.82, w: 2.4, h: 0.6, fontSize: 28, bold: true, color: plan.textColor, fontFace: "Calibri" });
    s.addText(plan.period, { x: x + 1.85, y: 2.08, w: 1.5, h: 0.3, fontSize: 10, color: plan.highlight ? "93C5FD" : C.muted, fontFace: "Calibri" });
    s.addText(plan.users, { x: x + 0.15, y: 2.42, w: 3.7, h: 0.25, fontSize: 9.5, color: plan.highlight ? "7DD3FC" : C.muted, fontFace: "Calibri" });
    s.addText("+ ₹100–150 per additional user/month", { x: x + 0.15, y: 2.65, w: 3.7, h: 0.22, fontSize: 8, color: plan.highlight ? "7DD3FC" : C.muted, fontFace: "Calibri" });

    plan.features.forEach((f, fi) => {
      s.addShape(pptx.ShapeType.ellipse, { x: x + 0.18, y: 2.98 + fi * 0.42, w: 0.14, h: 0.14, fill: { color: C.green } });
      s.addText(f, { x: x + 0.38, y: 2.93 + fi * 0.42, w: 3.4, h: 0.35, fontSize: 9.5, color: plan.textColor, fontFace: "Calibri" });
    });
  });

  s.addText("Need a custom plan for large enterprises? Contact us: hello@kintoops.in", {
    x: 0.4, y: 7.1, w: 12.3, h: 0.22, fontSize: 9, color: C.muted, fontFace: "Calibri", align: "center",
  });
}

// ══════════════════════════════════════════════════════════════
// SLIDE 13 — TESTIMONIALS
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addNavyHeader(s, "Trusted by Indian Manufacturers", "Real feedback from real customers");
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 1.2, w: "100%", h: 6.1, fill: { color: C.lightBlue } });

  const testimonials = [
    { quote: "Kinto Smart Ops transformed how we track production. Real-time inventory and GST invoicing in one place — we cut our month-end closing time from 3 days to 4 hours.", name: "Rajesh Sharma", role: "Director, Precision Parts Mfg." },
    { quote: "The HR & Payroll module with automated TDS calculations and payslip delivery via WhatsApp saved us days every month. Employees no longer call us for payslip queries.", name: "Meera Patel", role: "CFO, Alpha Industries" },
    { quote: "From purchase orders to dispatch gatepasses, everything flows seamlessly. The CRM pipeline helped us recover 3 deals we had forgotten about. Our team adopted it within a week.", name: "Suresh Kumar", role: "Operations Head, Bharat Engineering" },
  ];

  testimonials.forEach((t, i) => {
    const x = 0.25 + i * 4.3;
    s.addShape(pptx.ShapeType.rect, { x, y: 1.4, w: 4.1, h: 5.5, fill: { color: C.white }, line: { color: C.border, width: 1 }, rectRadius: 0.1 });
    // Stars
    s.addText("★ ★ ★ ★ ★", { x: x + 0.15, y: 1.55, w: 3.8, h: 0.35, fontSize: 14, color: C.accent, fontFace: "Calibri" });
    // Quote
    s.addText(`"${t.quote}"`, { x: x + 0.15, y: 1.95, w: 3.8, h: 3.5, fontSize: 10.5, color: C.dark, fontFace: "Calibri", italic: true, valign: "top" });
    // Divider
    s.addShape(pptx.ShapeType.rect, { x: x + 0.15, y: 5.6, w: 3.8, h: 0.03, fill: { color: C.border } });
    s.addText(t.name, { x: x + 0.15, y: 5.68, w: 3.8, h: 0.3, fontSize: 10.5, bold: true, color: C.navy, fontFace: "Calibri" });
    s.addText(t.role, { x: x + 0.15, y: 5.96, w: 3.8, h: 0.25, fontSize: 9, color: C.muted, fontFace: "Calibri" });
  });
}

// ══════════════════════════════════════════════════════════════
// SLIDE 14 — CALL TO ACTION
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: C.navy } });
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 5.5, w: "100%", h: 0.08, fill: { color: C.blue } });
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 5.58, w: "100%", h: 1.92, fill: { color: "162D4B" } });

  s.addText("Ready to Modernise Your Factory?", {
    x: 0.5, y: 0.9, w: 12.3, h: 0.8, fontSize: 34, bold: true, color: C.white, fontFace: "Calibri", align: "center",
  });
  s.addText("Join hundreds of Indian manufacturers already using Kinto Smart Ops\nto manage their operations end-to-end.", {
    x: 1.0, y: 1.75, w: 11.3, h: 0.8, fontSize: 14, color: "93C5FD", fontFace: "Calibri", align: "center",
  });

  // CTA boxes
  const ctas = [
    ["14-Day Free Trial", "No credit card required.\nStart today at kintoops.in"],
    ["Book a Demo", "See a live walkthrough\ntailored to your factory"],
    ["Talk to Sales", "hello@kintoops.in\n+91 XXXXX XXXXX"],
  ];

  ctas.forEach(([title, body], i) => {
    s.addShape(pptx.ShapeType.rect, { x: 0.8 + i * 4.15, y: 2.8, w: 3.8, h: 2.4, fill: { color: i === 0 ? C.blue : "162D4B" }, line: { color: C.blue, width: 2 }, rectRadius: 0.1 });
    s.addText(title, { x: 0.8 + i * 4.15, y: 3.0, w: 3.8, h: 0.5, fontSize: 14, bold: true, color: C.white, fontFace: "Calibri", align: "center" });
    s.addText(body,  { x: 0.8 + i * 4.15, y: 3.55, w: 3.8, h: 1.3, fontSize: 11, color: "93C5FD", fontFace: "Calibri", align: "center" });
  });

  s.addText("www.kintoops.in", {
    x: 0.5, y: 5.65, w: 12.3, h: 0.35, fontSize: 13, bold: true, color: C.accent, fontFace: "Calibri", align: "center",
  });
  s.addText("© 2026 Kinto Smart Ops · Made in India · hello@kintoops.in", {
    x: 0.5, y: 6.1, w: 12.3, h: 0.25, fontSize: 9, color: "93C5FD", fontFace: "Calibri", align: "center",
  });
}

// ══════════════════════════════════════════════════════════════
// SLIDE 14 — COMPETITIVE COMPARISON
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addNavyHeader(s, "How We Compare to the Competition", "Purpose-built for Indian manufacturing — not adapted from a global product");
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 1.2, w: "100%", h: 6.1, fill: { color: C.white } });

  // Table header
  const cols = ["Feature", "Kinto Smart Ops", "Tally / Busy", "Zoho Books", "Odoo", "Vyapar / Marg"];
  const colW = [2.8, 2.0, 1.8, 1.8, 2.2, 1.8];
  const colX = [0.15, 2.95, 4.95, 6.75, 8.55, 10.75];

  // Header row
  colX.forEach((x, i) => {
    const isKinto = i === 1;
    s.addShape(pptx.ShapeType.rect, { x, y: 1.3, w: colW[i], h: 0.4,
      fill: { color: isKinto ? C.blue : C.navy }, rectRadius: 0 });
    s.addText(cols[i], { x: x + 0.05, y: 1.3, w: colW[i] - 0.1, h: 0.4,
      fontSize: 9, bold: true, color: C.white, fontFace: "Calibri", align: "center", valign: "middle" });
  });

  const Y = (row: string) => "22A310"; // green
  const N = (row: string) => "DC2626"; // red
  const P = (row: string) => "D97706"; // amber/partial

  const rows: [string, string, string, string, string, string][] = [
    ["Indian GST Built-In",          "✔ Full",    "✔ Full",    "✔ Full",    "⚠ Add-on",      "✔ Basic"  ],
    ["Manufacturing / BOM",          "✔ Full",    "✘ None",    "✘ None",    "✔ Full",        "✘ None"   ],
    ["WhatsApp Integration",         "✔ Native",  "✘ None",    "✘ None",    "✘ None",        "✘ None"   ],
    ["Indian HR & Payroll",          "✔ Full",    "✘ None",    "✘ None",    "⚠ Needs custom","✘ None"   ],
    ["CRM Lead Management",          "✔ Full",    "✘ None",    "⚠ Separate","✔ Full",        "✘ None"   ],
    ["Employee Self-Service",        "✔ Full",    "✘ None",    "✘ None",    "⚠ Basic",       "✘ None"   ],
    ["Preventive Maintenance",       "✔ Full",    "✘ None",    "✘ None",    "⚠ Enterprise+", "✘ None"   ],
    ["Cloud-Based (SaaS)",           "✔ Yes",     "⚠ Hybrid",  "✔ Yes",     "✔ Yes",         "⚠ Mobile" ],
    ["Setup Time",                   "< 1 week",  "1–2 weeks", "2–3 days",  "2–4 months",    "1–2 days" ],
    ["Starting Price",               "₹999/mo",   "₹18k/yr",   "₹999/mo",   "₹2,500+/user", "₹1,099/yr"],
    ["Support",                      "Priority",  "Basic",     "Standard",  "Paid (costly)", "Basic"    ],
  ];

  const rowColors: Record<string, string> = { "✔": Y(""), "✘": N(""), "⚠": P("") };

  rows.forEach((row, ri) => {
    const bgColor = ri % 2 === 0 ? "F8FAFC" : C.white;
    colX.forEach((x, ci) => {
      s.addShape(pptx.ShapeType.rect, { x, y: 1.7 + ri * 0.48, w: colW[ci], h: 0.46,
        fill: { color: ci === 1 ? "EFF6FF" : bgColor }, line: { color: C.border, width: 0.5 } });
      const cell = row[ci];
      const firstChar = cell.trim()[0];
      const textColor = ci === 0 ? C.dark : ci === 1
        ? (firstChar === "✔" ? "15803D" : firstChar === "✘" ? "DC2626" : "D97706")
        : (firstChar === "✔" ? "15803D" : firstChar === "✘" ? "9CA3AF" : "D97706");
      s.addText(cell, { x: x + 0.05, y: 1.7 + ri * 0.48, w: colW[ci] - 0.1, h: 0.46,
        fontSize: ci === 0 ? 9 : 8.5, bold: ci === 1, color: textColor, fontFace: "Calibri",
        align: ci === 0 ? "left" : "center", valign: "middle" });
    });
  });

  // Kinto column top + bottom accent lines
  s.addShape(pptx.ShapeType.rect, { x: 2.95, y: 1.3, w: 2.0, h: 0.06, fill: { color: C.accent } });
  s.addShape(pptx.ShapeType.rect, { x: 2.95, y: 1.7 + rows.length * 0.48 - 0.06, w: 2.0, h: 0.06, fill: { color: C.accent } });

  s.addText("Kinto Smart Ops is the only solution that covers Manufacturing + HR & Payroll + CRM + WhatsApp natively in a single platform.", {
    x: 0.15, y: 7.08, w: 12.5, h: 0.2, fontSize: 8, color: C.blue, fontFace: "Calibri", bold: true,
  });
}

// ══════════════════════════════════════════════════════════════
// SLIDE 15 — WHY KINTO WINS / OUR UNFAIR ADVANTAGES
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addNavyHeader(s, "Why Customers Choose Kinto Smart Ops", "Our unfair advantages — things no competitor does as well");
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 1.2, w: "100%", h: 6.1, fill: { color: C.lightBlue } });

  const advantages = [
    {
      no: "01",
      title: "Only ERP with Native WhatsApp",
      body: "No other Indian ERP has WhatsApp baked in. Operators submit checklists, receive payslips, and get alerts — all on WhatsApp. Zero app downloads required.",
    },
    {
      no: "02",
      title: "Manufacturing + HR + CRM in One Price",
      body: "Competitors charge separately for manufacturing, HR, and CRM modules — or require different products. Kinto gives all three in one subscription.",
    },
    {
      no: "03",
      title: "Built for Indian Manufacturing from Day One",
      body: "GST, PT state slabs, TDS old/new regime, PF/ESI — all built-in. Not an afterthought or a plugin. Designed specifically for how Indian factories operate.",
    },
    {
      no: "04",
      title: "Employee Self-Service No One Else Offers at This Price",
      body: "ESS portals cost lakhs with SAP or Oracle. Kinto includes a full ESS portal — payslips, leave, tax declarations — in the Enterprise plan at ₹2,599/month.",
    },
    {
      no: "05",
      title: "Fastest Time-to-Value",
      body: "Most teams are live within a week. No 6-month implementation projects, no consultants, no server setup. Start free trial today — go live next Monday.",
    },
    {
      no: "06",
      title: "Transparent Pricing, No Hidden Costs",
      body: "One flat monthly price + ₹100–150 per extra user. No modules sold separately. No yearly lock-in forced on you. Cancel anytime.",
    },
  ];

  advantages.forEach((adv, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.25 + col * 6.55;
    const y = 1.35 + row * 1.95;

    s.addShape(pptx.ShapeType.rect, { x, y, w: 6.3, h: 1.82, fill: { color: C.white }, line: { color: C.border, width: 1 }, rectRadius: 0.08 });
    // Number badge
    s.addShape(pptx.ShapeType.rect, { x: x + 0.12, y: y + 0.12, w: 0.44, h: 0.44, fill: { color: C.blue }, rectRadius: 0.06 });
    s.addText(adv.no, { x: x + 0.12, y: y + 0.12, w: 0.44, h: 0.44, fontSize: 11, bold: true, color: C.white, fontFace: "Calibri", align: "center", valign: "middle" });
    s.addText(adv.title, { x: x + 0.65, y: y + 0.12, w: 5.5, h: 0.44, fontSize: 11.5, bold: true, color: C.navy, fontFace: "Calibri", valign: "middle" });
    s.addText(adv.body,  { x: x + 0.12, y: y + 0.6, w: 6.0, h: 1.1, fontSize: 9.5, color: C.muted, fontFace: "Calibri", valign: "top" });
  });
}

// ══════════════════════════════════════════════════════════════
// SLIDE 16 — ROI & TIME SAVINGS
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addNavyHeader(s, "The ROI Is Clear", "Time saved. Errors eliminated. Revenue protected.");
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 1.2, w: "100%", h: 6.1, fill: { color: C.white } });

  // Top stats row
  const stats = [
    { val: "40+", unit: "hrs/month", label: "saved on payroll &\nHR admin work" },
    { val: "90%", unit: "reduction", label: "in GST invoice\nerrors & rework" },
    { val: "3×", unit: "faster", label: "month-end closing\nvs manual Excel" },
    { val: "₹0", unit: "extra cost", label: "for WhatsApp, HR,\nCRM vs competitors" },
  ];

  stats.forEach((st, i) => {
    const x = 0.3 + i * 3.18;
    s.addShape(pptx.ShapeType.rect, { x, y: 1.35, w: 3.0, h: 2.1, fill: { color: C.navy }, rectRadius: 0.1 });
    s.addText(st.val, { x, y: 1.5, w: 3.0, h: 0.75, fontSize: 36, bold: true, color: C.accent, fontFace: "Calibri", align: "center" });
    s.addText(st.unit, { x, y: 2.22, w: 3.0, h: 0.28, fontSize: 11, color: "93C5FD", fontFace: "Calibri", align: "center" });
    s.addText(st.label, { x, y: 2.52, w: 3.0, h: 0.5, fontSize: 9.5, color: "7DD3FC", fontFace: "Calibri", align: "center" });
  });

  // Before / After comparison
  s.addText("Before Kinto  vs  After Kinto", {
    x: 0.3, y: 3.65, w: 12.5, h: 0.35, fontSize: 13, bold: true, color: C.navy, fontFace: "Calibri", align: "center",
  });

  const comparisons = [
    ["Payroll calculated on Excel — errors, corrections, delays", "Auto-calculated payroll with PF/ESI/TDS — one-click payslips"],
    ["GST invoices made manually — wrong tax codes, filing stress", "GST-validated invoices auto-generated from sales orders"],
    ["Sales leads tracked on WhatsApp chats — deals forgotten", "CRM pipeline with follow-up dates — zero leads slip through"],
    ["Employees call HR for payslips, leave balance, Form 16", "Employees access everything self-serve — HR freed up"],
    ["Machine checklists on paper — no digital record", "WhatsApp checklists — auto-logged, AI-interpreted, auditable"],
  ];

  comparisons.forEach(([before, after], i) => {
    const y = 4.1 + i * 0.58;
    // Before
    s.addShape(pptx.ShapeType.rect, { x: 0.3, y, w: 5.8, h: 0.5, fill: { color: "FEF2F2" }, line: { color: "FECACA", width: 1 }, rectRadius: 0.05 });
    s.addText(`✘  ${before}`, { x: 0.42, y, w: 5.58, h: 0.5, fontSize: 9, color: "991B1B", fontFace: "Calibri", valign: "middle" });
    // Arrow
    s.addText("→", { x: 6.15, y, w: 0.3, h: 0.5, fontSize: 14, color: C.blue, fontFace: "Calibri", align: "center", valign: "middle" });
    // After
    s.addShape(pptx.ShapeType.rect, { x: 6.5, y, w: 6.1, h: 0.5, fill: { color: "F0FDF4" }, line: { color: "BBF7D0", width: 1 }, rectRadius: 0.05 });
    s.addText(`✔  ${after}`, { x: 6.62, y, w: 5.88, h: 0.5, fontSize: 9, color: "15803D", fontFace: "Calibri", valign: "middle" });
  });
}

// ══════════════════════════════════════════════════════════════
// SLIDE 17 — SECURITY & TRUST
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addNavyHeader(s, "Your Data Is Safe With Us", "Enterprise-grade security — at an SME price");
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 1.2, w: "100%", h: 6.1, fill: { color: C.lightBlue } });

  const trust = [
    {
      title: "Complete Data Isolation",
      body: "Every company gets its own isolated database space. Your data is never mixed with any other tenant. Even our engineers cannot accidentally access your records.",
    },
    {
      title: "Daily Automated Backups",
      body: "Automatic backups run every night. Last 30 backups retained. Pre-deletion backups triggered before any major change. Restore any data from any point in time.",
    },
    {
      title: "Role-Based Access Control",
      body: "73+ screens with granular permissions. Each user sees only what their role allows. Full audit log of every action taken — who changed what and when.",
    },
    {
      title: "Secure Authentication",
      body: "Passwords hashed with industry-standard scrypt. Session management with 7-day expiry. Secure cookies with SameSite and Secure flags enforced.",
    },
    {
      title: "Cloud Infrastructure",
      body: "Hosted on enterprise-grade cloud infrastructure with 99.9% uptime SLA. No server to manage, no IT team needed, always on the latest version.",
    },
    {
      title: "Audit Trail",
      body: "Every login, data change, and permission update is logged with user identity, timestamp, and IP. Full compliance trail for internal and external audits.",
    },
  ];

  trust.forEach((item, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    card(s, 0.25 + col * 4.3, 1.35 + row * 2.55, 4.1, 2.38, item.title, item.body, C.navy);
  });
}

// ══════════════════════════════════════════════════════════════
// SLIDE 18 — HOW TO GET STARTED
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addNavyHeader(s, "Getting Started Is Simple", "Most teams are fully live within one week");
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 1.2, w: "100%", h: 6.1, fill: { color: C.white } });

  const steps = [
    {
      day: "Day 1",
      title: "Sign Up & Company Setup",
      items: ["Register your company (2 minutes)", "Add your GSTIN, address, logo", "Invite your team members", "Set roles and permissions"],
      color: C.blue,
    },
    {
      day: "Day 2–3",
      title: "Master Data & Configuration",
      items: ["Add products, raw materials, vendors", "Configure salary structures for payroll", "Set up Chart of Accounts", "Import existing data if needed"],
      color: C.navy,
    },
    {
      day: "Day 4–5",
      title: "Go Live on Core Operations",
      items: ["Start raising GST invoices", "Record purchase orders & GRNs", "Begin production entries", "Enable WhatsApp checklists"],
      color: "0369A1",
    },
    {
      day: "Week 2",
      title: "HR, CRM & Advanced Modules",
      items: ["Add employees & run first payroll", "Add sales leads to CRM pipeline", "Enable ESS for employees", "Review first MIS dashboard"],
      color: C.green,
    },
  ];

  // Connector line
  s.addShape(pptx.ShapeType.rect, { x: 1.6, y: 2.44, w: 10.2, h: 0.06, fill: { color: C.border } });

  steps.forEach((step, i) => {
    const x = 0.25 + i * 3.25;

    // Circle step number
    s.addShape(pptx.ShapeType.ellipse, { x: x + 0.85, y: 2.1, w: 0.7, h: 0.7, fill: { color: step.color } });
    s.addText(String(i + 1), { x: x + 0.85, y: 2.1, w: 0.7, h: 0.7, fontSize: 16, bold: true, color: C.white, fontFace: "Calibri", align: "center", valign: "middle" });

    // Day badge
    s.addShape(pptx.ShapeType.rect, { x: x + 0.5, y: 1.38, w: 1.4, h: 0.3, fill: { color: step.color }, rectRadius: 0.06 });
    s.addText(step.day, { x: x + 0.5, y: 1.38, w: 1.4, h: 0.3, fontSize: 9, bold: true, color: C.white, fontFace: "Calibri", align: "center" });

    // Card
    s.addShape(pptx.ShapeType.rect, { x, y: 2.95, w: 3.1, h: 4.1, fill: { color: C.cardBg }, line: { color: step.color, width: 2 }, rectRadius: 0.08 });
    s.addText(step.title, { x: x + 0.12, y: 3.05, w: 2.86, h: 0.45, fontSize: 11, bold: true, color: step.color, fontFace: "Calibri", valign: "middle" });

    step.items.forEach((item, ii) => {
      s.addShape(pptx.ShapeType.ellipse, { x: x + 0.15, y: 3.62 + ii * 0.72, w: 0.14, h: 0.14, fill: { color: step.color } });
      s.addText(item, { x: x + 0.34, y: 3.55 + ii * 0.72, w: 2.62, h: 0.58, fontSize: 9.5, color: C.dark, fontFace: "Calibri", valign: "middle" });
    });
  });

  s.addText("Need help? Our onboarding team is available via chat and email throughout your setup.", {
    x: 0.3, y: 7.1, w: 12.5, h: 0.22, fontSize: 9.5, color: C.muted, fontFace: "Calibri", align: "center", italic: true,
  });
}

// ── Write file ────────────────────────────────────────────────
await pptx.writeFile({ fileName: "Kinto_Smart_Ops_Pitch_Deck_V5.pptx" });
console.log("Done: Kinto_Smart_Ops_Pitch_Deck_V5.pptx");
