import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { exportToExcel, formatDateForExcel } from "@/lib/excel-export";
import { format } from "date-fns";

/* ─── Color palette from mockup ─────────────────────────────────────── */
const C = {
  bg: "#F4F2EE", surface: "#F9F8F6", white: "#FFFFFF",
  dark: "#1A1A18", muted: "#6B6B66", hint: "#888780", border: "#E8E6E0",
  green: "#3B6D11", greenBg: "#EAF3DE", greenMid: "#97C459",
  red: "#A32D2D", redBg: "#FCEBEB", redMid: "#E24B4A",
  amber: "#633806", amberBg: "#FAEEDA", amberMid: "#EF9F27", amberBd: "#FAC775",
  blue: "#185FA5", blueBg: "#E6F1FB", blueMid: "#378ADD",
  teal: "#0F6E56", tealBg: "#E1F5EE", tealMid: "#1D9E75",
  purple: "#534AB7", purpleBg: "#EEEDFE", purpleMid: "#7F77DD",
  coral: "#993C1D", coralBg: "#FAECE7", coralMid: "#D85A30",
};

/* ─── Formatters ─────────────────────────────────────────────────────── */
const INR = (p: number) =>
  `₹${Math.abs(p / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const INR_K = (p: number) => {
  const a = Math.abs(p / 100);
  if (a >= 10000000) return `₹${(a / 10000000).toFixed(2)}Cr`;
  if (a >= 100000) return `₹${(a / 100000).toFixed(2)}L`;
  if (a >= 1000) return `₹${(a / 1000).toFixed(1)}K`;
  return `₹${a.toLocaleString("en-IN")}`;
};
const PCT = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
const MONTH_LABEL = (m: string) => {
  const [y, mo] = m.split("-");
  return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleDateString("en-IN", { month: "short" });
};

/* ─── API shape ──────────────────────────────────────────────────────── */
interface FinancialData {
  fy: string; fyStart: string; fyEnd: string;
  kpis: {
    plRevenue: number; plExpenses: number; netProfit: number; netMargin: number;
    totalBilled: number; totalOutstanding: number; overdueCount: number;
    cashBalance: number; bankBalance: number;
    unreconciledCount: number; unreconciledAmount: number;
  };
  monthlyTrend: Array<{ month: string; revenue: number; expenses: number }>;
  receivablesAging: Array<{ bucket: string; count: number; outstanding: number }>;
  topDebtors: Array<{ customer: string; invoiceCount: number; totalBilled: number; totalCollected: number; outstanding: number; latestInvoice: string }>;
  trialGroups: Array<{ groupName: string; accountType: string; totalDebit: number; totalCredit: number; netBalance: number; accountCount: number }>;
  balanceSheet: { assets: number; liabilities: number; equity: number };
  bankReconciliation: { unreconciledCount: number; unreconciledAmount: number };
  recentJournals: Array<{ id: string; date: string; reference: string; narration: string; sourceType: string; amount: number; lineCount: number; flags: string[] }>;
  insights: Array<{ priority: string; label: string; title: string; body: string }>;
}

/* ─── Tiny primitives ────────────────────────────────────────────────── */
type ChipColor = "green" | "red" | "amber" | "blue" | "purple" | "teal" | "gray" | "coral";
function Chip({ children, color }: { children: React.ReactNode; color: ChipColor }) {
  const s: Record<ChipColor, React.CSSProperties> = {
    green:  { background: C.greenBg,  color: "#27500A" },
    red:    { background: C.redBg,    color: "#791F1F" },
    amber:  { background: C.amberBg,  color: C.amber },
    blue:   { background: C.blueBg,   color: C.blue },
    purple: { background: C.purpleBg, color: C.purple },
    teal:   { background: C.tealBg,   color: C.teal },
    gray:   { background: C.surface,  color: C.muted, border: `1px solid ${C.border}` },
    coral:  { background: C.coralBg,  color: C.coral },
  };
  return (
    <span style={{
      display: "inline-block", fontSize: 9, fontWeight: 700,
      padding: "2px 8px", borderRadius: 4, letterSpacing: "0.03em", whiteSpace: "nowrap",
      ...s[color],
    }}>{children}</span>
  );
}

function SrcChip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 3,
      background: C.purpleBg, color: C.purple, display: "inline-block", marginBottom: 6,
    }}>{children}</span>
  );
}

function KpiCard({
  src, label, value, valueColor, sub, chip, chipColor, bg, borderColor,
}: {
  src: string; label: string; value: string; valueColor: string;
  sub: string; chip: string; chipColor: ChipColor;
  bg?: string; borderColor?: string;
}) {
  return (
    <div style={{
      background: bg ?? C.surface, borderRadius: 12, padding: "12px 14px",
      border: borderColor ? `1.5px solid ${borderColor}` : "none",
      position: "relative",
    }}>
      <SrcChip>{src}</SrcChip>
      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: C.hint, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4, color: valueColor }}>{value}</div>
      <div style={{ fontSize: 9, color: C.muted, marginBottom: 6 }}>{sub}</div>
      <Chip color={chipColor}>{chip}</Chip>
    </div>
  );
}

function SectionHd({ title, sub, chip, chipColor }: { title: string; sub: string; chip: string; chipColor: ChipColor }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, marginTop: 20 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{title}</div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>
      </div>
      <Chip color={chipColor}>{chip}</Chip>
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.white, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: "16px 20px", ...style,
    }}>{children}</div>
  );
}
function CardTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{children}</div>;
}
function CardSub({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, color: C.muted, marginBottom: 12 }}>{children}</div>;
}

function PlRow({
  left, right, indent, head, total, leftColor, rightColor, rightMono,
}: {
  left: React.ReactNode; right?: React.ReactNode;
  indent?: boolean; head?: boolean; total?: boolean;
  leftColor?: string; rightColor?: string; rightMono?: boolean;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: head ? "6px 8px" : total ? "8px 8px 6px" : "6px 8px",
      fontSize: indent ? 10 : 11,
      paddingLeft: indent ? 24 : 8,
      borderBottom: total ? "none" : `1px solid ${C.surface}`,
      borderTop: total ? `1px solid ${C.border}` : "none",
      marginTop: total ? 4 : 0,
      fontWeight: (head || total) ? 600 : 400,
      background: head ? "rgba(0,0,0,0.02)" : "transparent",
      borderRadius: head ? 4 : 0,
    }}>
      <span style={{ color: leftColor ?? (indent ? C.muted : C.dark) }}>{left}</span>
      {right !== undefined && (
        <span style={{ fontFamily: rightMono !== false ? "DM Mono, monospace" : undefined, color: rightColor ?? C.dark }}>
          {right}
        </span>
      )}
    </div>
  );
}

function PBar({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 90, fontSize: 10, color: C.muted, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 7, background: C.surface, borderRadius: 4, overflow: "hidden", minWidth: 60 }}>
        <div style={{ width: `${pct}%`, height: 7, background: color, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 600, flexShrink: 0 }}>{value}</span>
    </div>
  );
}

function MiniPBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 7, background: C.surface, borderRadius: 4, overflow: "hidden", minWidth: 60 }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: 7, background: color, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 10, color, fontWeight: 700, minWidth: 28 }}>{Math.round(pct)}%</span>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{
      textAlign: "left", padding: "6px 8px", fontSize: 9, fontWeight: 600,
      textTransform: "uppercase", letterSpacing: "0.05em", color: C.hint,
      borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap",
    }}>{children}</th>
  );
}
function Td({ children, mono, color, bold }: { children: React.ReactNode; mono?: boolean; color?: string; bold?: boolean }) {
  return (
    <td style={{
      padding: "8px 8px", borderBottom: `1px solid ${C.surface}`, verticalAlign: "middle",
      fontFamily: mono ? "DM Mono, monospace" : undefined, fontSize: 11,
      color: color ?? C.dark, fontWeight: bold ? 600 : 400,
    }}>{children}</td>
  );
}

type RowVariant = "danger" | "warn" | "good" | "purple" | undefined;
function TrVariant({ children, variant }: { children: React.ReactNode; variant?: RowVariant }) {
  const bg = variant === "danger" ? C.redBg : variant === "warn" ? C.amberBg : variant === "good" ? C.greenBg : variant === "purple" ? C.purpleBg : "transparent";
  return <tr style={{ background: bg }}>{children}</tr>;
}

function AgingBucket({
  label, count, amount, total, pct, barColor, bg, borderStyle, sub, chip, chipColor,
}: {
  label: string; count: number; amount: number; total: number; pct: number;
  barColor: string; bg: string; borderStyle?: string; sub: string; chip: string; chipColor: ChipColor;
}) {
  return (
    <div style={{ borderRadius: 10, padding: "12px 14px", marginBottom: 8, background: bg, border: borderStyle }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600 }}>
          {label} <span style={{ fontWeight: 400, color: C.muted }}>· {count} invoices</span>
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: barColor }}>{INR(amount)}</span>
      </div>
      <div style={{ height: 7, background: C.surface, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: 7, background: barColor, borderRadius: 4 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, fontSize: 9 }}>
        <span style={{ color: C.muted }}>{Math.round(pct)}% of total AR · {sub}</span>
        <Chip color={chipColor}>{chip}</Chip>
      </div>
    </div>
  );
}

function BsCol({
  bg, titleColor, title, rows, totalLabel, totalVal, totalColor, note, noteColor,
}: {
  bg: string; titleColor: string; title: string;
  rows: Array<{ label: string; val: string; color?: string }>;
  totalLabel: string; totalVal: string; totalColor: string; note: string; noteColor: string;
}) {
  return (
    <div style={{ borderRadius: 10, padding: 14, background: bg }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 10, color: titleColor }}>{title}</div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 11, borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
          <span>{r.label}</span>
          <span style={{ fontFamily: "DM Mono, monospace", color: r.color ?? C.muted }}>{r.val}</span>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", fontSize: 12, fontWeight: 600, borderTop: "1px solid rgba(0,0,0,0.1)", marginTop: 4 }}>
        <span style={{ color: titleColor }}>{totalLabel}</span>
        <span style={{ fontFamily: "DM Mono, monospace", color: totalColor }}>{totalVal}</span>
      </div>
      <div style={{ fontSize: 9, marginTop: 6, color: noteColor }}>{note}</div>
    </div>
  );
}

function CoaItem({ badge, label, desc, badgeColor }: { badge: string; label: string; desc: string; badgeColor: ChipColor }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: 8, borderRadius: 6, marginBottom: 6, background: "rgba(255,255,255,0.6)", fontSize: 11 }}>
      <Chip color={badgeColor}>{badge}</Chip>
      <div>
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 9, color: C.muted, marginTop: 1 }}>{desc}</div>
      </div>
    </div>
  );
}

function DssCard({ priority, chip, chipColor, title, body, bg }: {
  priority: string; chip: string; chipColor: ChipColor; title: string; body: string; bg: string;
}) {
  return (
    <div style={{ borderRadius: 10, padding: 14, border: "1px solid rgba(0,0,0,0.06)", background: bg }}>
      <Chip color={chipColor}>{chip}</Chip>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.dark, margin: "8px 0 4px" }}>{title}</div>
      <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.6 }}>{body}</div>
    </div>
  );
}

function Flag({ variant, children }: { variant: "crit" | "warn" | "purple"; children: React.ReactNode }) {
  const s = {
    crit:   { background: C.redBg,    border: `1.5px solid #F7C1C1`, color: C.red },
    warn:   { background: C.amberBg,  border: `1.5px solid ${C.amberBd}`, color: C.amber },
    purple: { background: C.purpleBg, border: `1px solid #AFA9EC`, color: C.purple },
  }[variant];
  return (
    <div style={{ borderRadius: 12, padding: "10px 16px", display: "flex", gap: 10, alignItems: "flex-start", fontSize: 11, lineHeight: 1.6, ...s }}>
      {children}
    </div>
  );
}

/* ─── Custom Tooltip for chart ──────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 11 }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: C.dark }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color, display: "flex", gap: 6 }}>
          <span style={{ color: C.muted }}>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>{INR_K(p.value * 100)}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Period helpers ─────────────────────────────────────────────────── */
const PERIODS = [
  { value: "full_year", label: "Full Year" },
  { value: "h1",        label: "H1 (Apr–Sep)" },
  { value: "h2",        label: "H2 (Oct–Mar)" },
  { value: "q1",        label: "Q1 (Apr–Jun)" },
  { value: "q2",        label: "Q2 (Jul–Sep)" },
  { value: "q3",        label: "Q3 (Oct–Dec)" },
  { value: "q4",        label: "Q4 (Jan–Mar)" },
  { value: "custom",    label: "Custom Range" },
];

function buildFyOptions() {
  const cur = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  return [cur, cur - 1, cur - 2].map((y) => ({
    value: String(y),
    label: `FY ${y}–${String(y + 1).slice(2)}`,
  }));
}

const FY_OPTIONS = buildFyOptions();

/* ═══════════════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════════════ */
export default function MISFinancial() {
  const curFyYear = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const [period, setPeriod] = useState("full_year");
  const [fy, setFy] = useState(String(curFyYear));
  const [customFrom, setCustomFrom] = useState(format(new Date(curFyYear, 3, 1), "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isExporting, setIsExporting] = useState(false);

  const qParams: Record<string, string> = { period, fy };
  if (period === "custom") { qParams.from = customFrom; qParams.to = customTo; }

  const { data, isLoading } = useQuery<FinancialData>({
    queryKey: ["/api/mis/financial-analytics", qParams],
    queryFn: async () => {
      const qs = new URLSearchParams(qParams).toString();
      const res = await fetch(`/api/mis/financial-analytics?${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const kpis = data?.kpis;
  const netProfit = kpis?.netProfit ?? 0;
  const netMargin = kpis?.netMargin ?? 0;
  const totalAging = (data?.receivablesAging ?? []).reduce((s, r) => s + r.outstanding, 0);

  const chartData = (data?.monthlyTrend ?? []).map((m) => ({
    name: MONTH_LABEL(m.month),
    Revenue: Math.round(m.revenue / 100),
    Expenses: Math.round(m.expenses / 100),
    Net: Math.round((m.revenue - m.expenses) / 100),
  }));

  const marginLabel =
    netMargin >= 15 ? "HEALTHY" : netMargin >= 5 ? "THIN" : netProfit >= 0 ? "LOW" : "LOSS";
  const marginChip: ChipColor =
    netMargin >= 15 ? "green" : netMargin >= 5 ? "amber" : "red";

  const expRatio = kpis?.plRevenue ? PCT(kpis.plExpenses, kpis.plRevenue) : 0;
  const expChipColor: ChipColor = expRatio > 90 ? "red" : expRatio > 70 ? "amber" : "green";

  const fyLabel = data?.fy ?? FY_OPTIONS.find(o => o.value === fy)?.label ?? "FY 2025–26";
  const periodLabel = PERIODS.find(p => p.value === period)?.label ?? period;

  const handleExportExcel = async () => {
    if (!data) return;
    setIsExporting(true);
    try {
      await exportToExcel({
        filename: `financial-ledger-mis-${fy}-${period}-${format(new Date(), "yyyy-MM-dd")}.xlsx`,
        sheets: [
          {
            name: "KPI Summary",
            data: [
              ["Metric", "Value"],
              ["Period", `${fyLabel} — ${periodLabel}`],
              ["Total Revenue (₹)", Math.round((kpis?.plRevenue ?? 0) / 100)],
              ["Total Expenses (₹)", Math.round((kpis?.plExpenses ?? 0) / 100)],
              ["Net Profit/Loss (₹)", Math.round(netProfit / 100)],
              ["Net Margin (%)", kpis?.netMargin ?? 0],
              ["Total Outstanding AR (₹)", Math.round((kpis?.totalOutstanding ?? 0) / 100)],
              ["Overdue Invoices", kpis?.overdueCount ?? 0],
              ["Cash/Bank Balance (₹)", Math.round((kpis?.cashBalance ?? 0) / 100)],
              ["Unreconciled Entries", kpis?.unreconciledCount ?? 0],
            ],
          },
          {
            name: "Monthly Trend",
            data: [
              ["Month", "Revenue (₹)", "Expenses (₹)", "Net (₹)"],
              ...(data.monthlyTrend ?? []).map(m => [
                m.month,
                Math.round(m.revenue / 100),
                Math.round(m.expenses / 100),
                Math.round((m.revenue - m.expenses) / 100),
              ]),
            ],
          },
          {
            name: "Trial Balance Groups",
            data: [
              ["Account Group", "Type", "Debit (₹)", "Credit (₹)", "Net (₹)"],
              ...(data.trialGroups ?? []).map(g => [
                g.groupName, g.accountType,
                Math.round(g.totalDebit), Math.round(g.totalCredit),
                Math.round(g.netBalance ?? (g.totalDebit - g.totalCredit)),
              ]),
            ],
          },
          {
            name: "Receivables Aging",
            data: [
              ["Bucket", "Invoice Count", "Outstanding (₹)"],
              ...(data.receivablesAging ?? []).map(r => [r.bucket, r.count, Math.round(r.outstanding / 100)]),
            ],
          },
          {
            name: "Top Debtors",
            data: [
              ["Customer", "Invoices", "Total Billed (₹)", "Collected (₹)", "Outstanding (₹)"],
              ...(data.topDebtors ?? []).map(d => [
                d.customer, d.invoiceCount,
                Math.round(d.totalBilled / 100),
                Math.round(d.totalCollected / 100),
                Math.round(d.outstanding / 100),
              ]),
            ],
          },
          {
            name: "Journal Entries",
            data: [
              ["Date", "Reference", "Type", "Amount (₹)", "Narration", "Flags"],
              ...(data.recentJournals ?? []).map(j => [
                formatDateForExcel(j.date), j.reference || j.id, j.sourceType,
                Math.round(j.amount / 100), j.narration ?? "", (j.flags ?? []).join(", "),
              ]),
            ],
          },
        ],
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "DM Sans, sans-serif" }}>
        <div style={{ padding: "20px 24px", maxWidth: 1400, margin: "0 auto" }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full mb-4" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", color: C.dark }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
        .fin-tbl td { border-bottom: 1px solid ${C.surface} !important; }
        .fin-tbl tr:last-child td { border-bottom: none !important; }
      `}</style>

      {/* ── PAGE HEADER ── */}
      <div style={{
        background: C.dark, padding: "14px 28px",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10,
      }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600, color: "#fff" }}>Financial Accounting — Formal Ledger MIS</div>
          <div style={{ fontSize: 11, color: C.hint, marginTop: 3 }}>
            Decision Support System · {fyLabel} · {periodLabel} · KINTO · Accountant / CA view
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* FY Selector */}
          <select
            value={fy}
            onChange={(e) => setFy(e.target.value)}
            style={{ fontSize: 11, padding: "7px 10px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, background: "rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer" }}
          >
            {FY_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: C.dark }}>{o.label}</option>)}
          </select>

          {/* Period Selector */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ fontSize: 11, padding: "7px 10px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, background: "rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer" }}
          >
            {PERIODS.map(p => <option key={p.value} value={p.value} style={{ background: C.dark }}>{p.label}</option>)}
          </select>

          {/* Custom date pickers — only shown when Custom Range selected */}
          {period === "custom" && (
            <>
              <input
                type="date" value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{ fontSize: 11, padding: "6px 10px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, background: "rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer" }}
              />
              <span style={{ color: C.hint, fontSize: 11 }}>to</span>
              <input
                type="date" value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{ fontSize: 11, padding: "6px 10px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, background: "rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer" }}
              />
            </>
          )}

          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            disabled={isExporting || !data}
            style={{ fontSize: 11, fontWeight: 500, padding: "7px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.surface, color: C.dark, cursor: "pointer", opacity: isExporting ? 0.6 : 1 }}
          >
            {isExporting ? "Exporting…" : "↓ Export Excel"}
          </button>

          {/* Export PDF placeholder */}
          <button
            onClick={() => window.print()}
            style={{ fontSize: 11, fontWeight: 500, padding: "7px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.surface, color: C.dark, cursor: "pointer" }}
          >
            ↓ Export PDF
          </button>

          <span style={{ background: C.purpleMid, color: "#fff", fontSize: 10, fontWeight: 700, padding: "7px 14px", borderRadius: 8 }}>
            ACCOUNTANT VIEW
          </span>
        </div>
      </div>

      {/* ── SOURCE STRIP ── */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, display: "flex", overflowX: "auto", gap: 0 }}>
        {[
          ["Chart of Accounts", "Account structure"],
          ["Journal Entries", "Vouchers & postings"],
          ["Bank Statements", "Bank reconciliation"],
          ["Trial Balance", "Dr/Cr balances"],
          ["Profit & Loss", "Revenue & expense"],
          ["Balance Sheet", "Assets & liabilities"],
          ["Ledger View", "Per-account detail"],
          ["Day Book", "Daily transactions"],
          ["Outstanding/Aging", "AR aging buckets"],
          ["Cash Flow", "Liquidity position"],
          ["Group Summary", "Rollup view"],
        ].map(([name, desc], i, arr) => (
          <div key={name} style={{
            padding: "8px 16px", borderRight: i < arr.length - 1 ? `1px solid ${C.border}` : "none",
            whiteSpace: "nowrap", flexShrink: 0,
          }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: C.purple, textTransform: "uppercase", letterSpacing: "0.04em" }}>{name}</div>
            <div style={{ fontSize: 9, color: C.hint, marginTop: 1 }}>{desc}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 1400, margin: "0 auto" }}>

        {/* ══ A: KPI CARDS ════════════════════════════════════════════════ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, marginTop: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>Financial Health — Key Indicators</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>All sourced from formal accounting modules · {fyLabel}</div>
          </div>
          <Chip color="purple">6 KPIs</Chip>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, marginBottom: 16 }}>
          <KpiCard
            src="P&L" label="Total Revenue"
            value={INR_K(kpis?.plRevenue ?? 0)} valueColor={C.green}
            sub={`${(data?.trialGroups ?? []).filter(g => g.accountType?.toLowerCase() === 'income').length || "—"} income accounts · FY total`}
            chip="INCOME" chipColor="green"
            bg={C.greenBg}
          />
          <KpiCard
            src="P&L / TB" label="Total Expenses"
            value={INR_K(kpis?.plExpenses ?? 0)} valueColor={C.red}
            sub={`${expRatio}% of revenue`}
            chip={expRatio > 90 ? "HIGH" : "NORMAL"} chipColor={expChipColor}
            bg={C.redBg} borderColor={C.redMid}
          />
          <KpiCard
            src="P&L" label="Net Profit / Loss"
            value={`${netProfit < 0 ? "−" : ""}${INR_K(Math.abs(netProfit))}`}
            valueColor={netProfit >= 0 ? C.green : C.red}
            sub={`${Math.abs(netMargin).toFixed(1)}% net margin`}
            chip={marginLabel} chipColor={marginChip}
            bg={netProfit < 0 ? C.redBg : C.amberBg}
            borderColor={netProfit < 0 ? C.redMid : C.amberBd}
          />
          <KpiCard
            src="Outstanding" label="Sundry Debtors (AR)"
            value={INR_K(kpis?.totalOutstanding ?? 0)} valueColor={C.red}
            sub={`${kpis?.overdueCount ?? 0} invoices o/s`}
            chip="CRITICAL" chipColor="red"
            bg={C.redBg} borderColor={C.redMid}
          />
          <KpiCard
            src="Ledger" label="Cash / Bank Balance"
            value={INR_K(kpis?.cashBalance ?? 0)}
            valueColor={(kpis?.cashBalance ?? 0) < 10000000 ? C.amber : C.green}
            sub="Per ledger balance"
            chip={(kpis?.cashBalance ?? 0) < 10000000 ? "LOW" : "OK"}
            chipColor={(kpis?.cashBalance ?? 0) < 10000000 ? "amber" : "green"}
            bg={C.amberBg} borderColor={C.amberBd}
          />
          <KpiCard
            src="Bank Stmt" label="Bank Recon Gap"
            value={INR_K(kpis?.unreconciledAmount ?? 0)}
            valueColor={(kpis?.unreconciledCount ?? 0) > 0 ? C.red : C.green}
            sub={`${kpis?.unreconciledCount ?? 0} unreconciled entries`}
            chip={(kpis?.unreconciledCount ?? 0) > 0 ? "UNRESOLVED" : "CLEAR"}
            chipColor={(kpis?.unreconciledCount ?? 0) > 0 ? "red" : "green"}
            bg={(kpis?.unreconciledCount ?? 0) > 0 ? C.redBg : C.greenBg}
            borderColor={(kpis?.unreconciledCount ?? 0) > 0 ? C.redMid : undefined}
          />
        </div>

        {/* ══ B: P&L + CASH FLOW ═══════════════════════════════════════ */}
        <SectionHd
          title="Profit & Loss Statement"
          sub="Monthly revenue vs expenses · Net margin trend · Source: P&L module"
          chip="P&L MODULE" chipColor="green"
        />

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 12, marginBottom: 12 }}>
          {/* P&L Chart */}
          <Card>
            <CardTitle>Monthly P&L — {fyLabel}</CardTitle>
            <CardSub>Revenue (green) vs Expenses (red) · Net line (blue) · Source: P&L module</CardSub>
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer>
                <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.04)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: C.hint }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: C.hint }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `₹${Math.abs(v) >= 100000 ? (v / 100000).toFixed(0) + "L" : (v / 1000).toFixed(0) + "K"}`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="Revenue" fill={C.greenMid} radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="Expenses" fill="#F09595" radius={[4, 4, 0, 0]} barSize={12} />
                  <Line dataKey="Net" type="monotone" stroke={C.blueMid} strokeWidth={2}
                    dot={{ r: 4, fill: C.blueMid, stroke: "#fff", strokeWidth: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {[
                { dot: true, color: C.greenMid, label: "Revenue" },
                { dot: true, color: "#F09595", label: "Expenses" },
                { dot: false, color: C.blueMid, label: "Net Flow" },
              ].map(({ dot, color, label }) => (
                <div key={label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: "4px 12px", fontSize: 10, color: C.muted, display: "flex", alignItems: "center", gap: 5 }}>
                  {dot
                    ? <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
                    : <span style={{ width: 14, height: 2, background: color, display: "inline-block", borderRadius: 1 }} />
                  }
                  {label}
                </div>
              ))}
            </div>
          </Card>

          {/* FY Summary + Cash Flow */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card style={{ flex: 1 }}>
              <CardTitle>FY Summary</CardTitle>
              <CardSub>Income statement condensed · Source: P&L</CardSub>
              <PlRow left="Gross Revenue" right={INR(kpis?.plRevenue ?? 0)} head rightColor={C.green} />
              <PlRow left="Less: Total Expenses" right={INR(kpis?.plExpenses ?? 0)} leftColor={C.muted} rightColor={C.red} indent />
              {(data?.trialGroups ?? [])
                .filter(g => g.accountType?.toLowerCase() === "expenses" || g.accountType?.toLowerCase() === "expense")
                .slice(0, 5)
                .map((g) => (
                  <PlRow key={g.groupName}
                    left={g.groupName} indent
                    right={INR(Math.abs(g.totalDebit - g.totalCredit) * 100)}
                    leftColor={C.muted} rightColor={C.muted}
                  />
                ))
              }
              <PlRow
                left="Net Profit / Loss" total
                right={`${netProfit < 0 ? "−" : ""}${INR(Math.abs(netProfit))} (${Math.abs(netMargin).toFixed(1)}%)`}
                rightColor={netProfit >= 0 ? C.green : C.red}
              />
            </Card>

            <Card style={{ flex: 1 }}>
              <CardTitle>Outstanding Summary</CardTitle>
              <CardSub>Receivables position · Source: Invoice ledger</CardSub>
              <PlRow left="Total Billed (FY)" right={INR(kpis?.totalBilled ?? 0)} head rightColor={C.blue} />
              <PlRow left="Total Outstanding" right={INR(kpis?.totalOutstanding ?? 0)} leftColor={C.muted} rightColor={C.red} indent />
              <PlRow left="Collection Rate"
                right={`${kpis?.totalBilled ? PCT((kpis.totalBilled - kpis.totalOutstanding), kpis.totalBilled) : 0}%`}
                leftColor={C.muted} rightColor={C.green} indent />
              <PlRow
                left="Billed not collected" total
                right={INR(kpis?.totalOutstanding ?? 0)}
                rightColor={C.red}
              />
              <div style={{ marginTop: 10, background: C.redBg, borderRadius: 8, padding: "8px 12px", fontSize: 10, color: C.red }}>
                <strong>Billed not collected:</strong> {INR_K(kpis?.totalOutstanding ?? 0)} — critical business risk
              </div>
            </Card>
          </div>
        </div>

        {/* ══ C: TRIAL BALANCE ══════════════════════════════════════════ */}
        <SectionHd
          title="Trial Balance & Group Summary"
          sub="All account groups with debit/credit balances · DSS signal per group · Source: Trial Balance + Group Summary"
          chip="TRIAL BALANCE" chipColor="purple"
        />

        <Card>
          <CardTitle>Account Group Summary — Dr / Cr / Net / Signal</CardTitle>
          <CardSub>Every account group from your Chart of Accounts · Sorted by risk</CardSub>
          <div style={{ overflowX: "auto" }}>
            <table className="fin-tbl" style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  <Th>Account Group</Th><Th>Category</Th><Th>Debit (Dr)</Th><Th>Credit (Cr)</Th>
                  <Th>Net Balance</Th><Th>% of Revenue</Th><Th>Trend</Th><Th>DSS Signal</Th>
                </tr>
              </thead>
              <tbody>
                {(data?.trialGroups ?? []).map((g) => {
                  const t = (g.accountType ?? "").toLowerCase();
                  const isIncome = t === "income" || t === "revenue";
                  const isExpense = t === "expenses" || t === "expense";
                  const isAsset = t === "assets" || t === "asset";
                  const isLiab = t === "liabilities" || t === "liability";
                  const net = Math.abs(g.netBalance ?? (g.totalDebit - g.totalCredit));
                  const netRupees = net * 100;
                  const revRupees = kpis?.plRevenue ?? 1;
                  const pctRev = PCT(netRupees, revRupees);
                  const catChip: ChipColor = isIncome ? "green" : isExpense ? "red" : isAsset ? "blue" : isLiab ? "amber" : "gray";
                  const catLabel = isIncome ? "Income" : isExpense ? "Expense" : isAsset ? "Asset" : isLiab ? "Liability" : "Equity";
                  const signalChip: ChipColor = isIncome ? "green" : (isExpense && pctRev > 50) ? "red" : (isExpense && pctRev > 25) ? "amber" : isAsset ? "blue" : "gray";
                  const signalLabel = isIncome ? "INCOME" : (isExpense && pctRev > 50) ? "HIGH RISK" : (isExpense && pctRev > 25) ? "REVIEW" : isAsset ? "ASSET" : "NORMAL";
                  const rowVar: RowVariant = isIncome ? "good" : (isExpense && pctRev > 50) ? "danger" : (isExpense && pctRev > 25) ? "warn" : undefined;
                  return (
                    <TrVariant key={g.groupName} variant={rowVar}>
                      <Td bold={isIncome || (isExpense && pctRev > 50)}>{g.groupName}</Td>
                      <Td><Chip color={catChip}>{catLabel}</Chip></Td>
                      <Td mono color={g.totalDebit > 0 ? (isExpense ? C.red : C.muted) : C.hint}>
                        {g.totalDebit > 0 ? INR(g.totalDebit * 100) : "—"}
                      </Td>
                      <Td mono color={g.totalCredit > 0 ? (isIncome ? C.green : C.muted) : C.hint}>
                        {g.totalCredit > 0 ? INR(g.totalCredit * 100) : "—"}
                      </Td>
                      <Td mono bold color={isIncome ? C.green : (isExpense && pctRev > 50) ? C.red : (isExpense && pctRev > 25) ? C.amber : C.muted}>
                        {INR(netRupees)}
                      </Td>
                      <Td color={pctRev > 50 ? C.red : pctRev > 25 ? C.amber : C.muted}>{pctRev}%</Td>
                      <Td color={isIncome ? C.green : (isExpense && pctRev > 50) ? C.red : C.muted}>
                        {isIncome ? "↑" : (isExpense && pctRev > 50) ? "↑↑" : "↔"}
                      </Td>
                      <Td><Chip color={signalChip}>{signalLabel}</Chip></Td>
                    </TrVariant>
                  );
                })}
                {(data?.trialGroups ?? []).length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 20, textAlign: "center", color: C.hint, fontSize: 11 }}>No data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ══ D: AGING ANALYSIS ════════════════════════════════════════ */}
        <SectionHd
          title="Receivables Aging Analysis"
          sub="Outstanding payments by age bucket · Recovery probability · Source: Outstanding/Aging module"
          chip="OUTSTANDING/AGING" chipColor="red"
        />

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 12, marginBottom: 12 }}>
          {/* Aging buckets */}
          <Card style={{ border: `2px solid ${C.redMid}` }}>
            <CardTitle style={{ color: C.red } as any}>Aging Buckets — {INR_K(totalAging)} Total AR</CardTitle>
            <CardSub>All outstanding receivables grouped by overdue days</CardSub>
            {(() => {
              const buckets = [
                { key: "0-30",  bg: C.greenBg, color: C.green,  barColor: C.greenMid, sub: "High recovery probability", chip: "COLLECT NORMALLY", chipColor: "green" as ChipColor },
                { key: "31-60", bg: C.amberBg, color: C.amber,  barColor: C.amberMid, sub: "Medium risk", chip: "FOLLOW UP NOW", chipColor: "amber" as ChipColor },
                { key: "61-90", bg: C.coralBg, color: C.coral,  barColor: C.coralMid, sub: "Escalating risk", chip: "ESCALATE", chipColor: "coral" as ChipColor },
                { key: "90+",   bg: C.redBg,   color: C.red,    barColor: C.redMid, sub: "LARGEST BUCKET", chip: "LEGAL ACTION", chipColor: "red" as ChipColor },
              ];
              return buckets.map(({ key, bg, color: _color, barColor, sub, chip, chipColor }) => {
                const row = (data?.receivablesAging ?? []).find(r => r.bucket === key);
                const amt = row?.outstanding ?? 0;
                const cnt = row?.count ?? 0;
                const pct = totalAging > 0 ? PCT(amt, totalAging) : 0;
                const is90 = key === "90+";
                return (
                  <AgingBucket key={key}
                    label={key + " days"} count={cnt} amount={amt} total={totalAging}
                    pct={pct} barColor={barColor} bg={bg}
                    borderStyle={is90 ? `1.5px solid #F7C1C1` : undefined}
                    sub={sub} chip={chip} chipColor={chipColor}
                  />
                );
              });
            })()}
            {(data?.insights ?? []).filter(i => i.priority === "P1").map((ins) => (
              <div key={ins.title} style={{ marginTop: 10 }}>
                <Flag variant="crit">
                  <span>⚠</span>
                  <span><strong>DSS:</strong> {ins.body}</span>
                </Flag>
              </div>
            ))}
          </Card>

          {/* Top debtors */}
          <Card>
            <CardTitle>Top Debtors — Collection Health</CardTitle>
            <CardSub>Sorted by pending amount · Source: Outstanding/Aging</CardSub>
            <table className="fin-tbl" style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  <Th>Customer</Th><Th>Inv.</Th><Th>Revenue</Th><Th>Pending</Th>
                  <Th>Collection %</Th><Th>Risk</Th>
                </tr>
              </thead>
              <tbody>
                {(data?.topDebtors ?? []).slice(0, 8).map((d) => {
                  const collPct = d.totalBilled > 0 ? PCT(d.totalCollected, d.totalBilled) : 0;
                  const risk: ChipColor = collPct === 0 ? "red" : collPct < 25 ? "amber" : "green";
                  const rowVar: RowVariant = collPct === 0 ? "danger" : collPct < 25 ? "warn" : undefined;
                  return (
                    <TrVariant key={d.customer} variant={rowVar}>
                      <Td bold={d.outstanding > 200000 * 100}>{d.customer}</Td>
                      <Td>{d.invoiceCount}</Td>
                      <Td mono>{INR(d.totalBilled)}</Td>
                      <Td mono bold color={collPct < 25 ? C.red : C.amber}>{INR(d.outstanding)}</Td>
                      <td style={{ padding: "8px 8px", verticalAlign: "middle", fontSize: 11 }}>
                        <MiniPBar pct={collPct} color={collPct < 25 ? C.redMid : C.greenMid} />
                      </td>
                      <Td><Chip color={risk}>{collPct === 0 ? "CRITICAL" : collPct < 25 ? "HIGH RISK" : "OK"}</Chip></Td>
                    </TrVariant>
                  );
                })}
                {(data?.topDebtors ?? []).length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: C.hint, fontSize: 11 }}>No debtor data</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>

        {/* ══ E: BALANCE SHEET ══════════════════════════════════════════ */}
        <SectionHd
          title="Balance Sheet — Financial Position"
          sub={`Assets, liabilities, equity · Source: Balance Sheet module`}
          chip="BALANCE SHEET" chipColor="blue"
        />

        <Card style={{ border: `1.5px solid #B5D4F4` }}>
          <CardTitle>Balance Sheet — As at end of {fyLabel}</CardTitle>
          <CardSub>Three-column view: Assets · Liabilities · Equity</CardSub>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <BsCol
              bg={C.blueBg} titleColor={C.blue} title="ASSETS"
              rows={[
                { label: "Sundry Debtors (AR)", val: INR(kpis?.totalOutstanding ?? 0), color: C.red },
                { label: "Cash / Bank", val: INR(kpis?.cashBalance ?? 0), color: C.amber },
                { label: "Other Assets", val: "—" },
              ]}
              totalLabel="Total Assets" totalVal={INR(data?.balanceSheet?.assets ?? 0)} totalColor={C.blue}
              note="⚠ Most assets = uncollected AR. Accelerate collections urgently."
              noteColor={C.red}
            />
            <BsCol
              bg={C.redBg} titleColor={C.red} title="LIABILITIES"
              rows={[
                { label: "Accounts Payable", val: "—" },
                { label: "GST Payable", val: "—" },
                { label: "Other Liabilities", val: "₹0" },
              ]}
              totalLabel="Total Liabilities" totalVal={INR(data?.balanceSheet?.liabilities ?? 0)} totalColor={C.red}
              note="Manage payables — settle expenses on time to avoid penalties."
              noteColor={C.amber}
            />
            <BsCol
              bg={C.greenBg} titleColor={C.green} title="EQUITY"
              rows={[
                { label: "Net Profit FY", val: INR(Math.abs(netProfit)), color: netProfit >= 0 ? C.green : C.red },
                { label: "Retained Earnings", val: INR(data?.balanceSheet?.equity ?? 0), color: C.amber },
                { label: "Equity Base", val: INR(data?.balanceSheet?.equity ?? 0) },
              ]}
              totalLabel="Total Equity" totalVal={INR(data?.balanceSheet?.equity ?? 0)} totalColor={C.amber}
              note="Collect AR urgently to strengthen the equity base."
              noteColor={C.amber}
            />
          </div>
        </Card>

        {/* ══ F: BANK RECONCILIATION ════════════════════════════════════ */}
        <SectionHd
          title="Bank Reconciliation Statement"
          sub="Book balance vs bank balance · Identify uncleared items · Source: Bank Statements + Ledger View"
          chip="BANK STATEMENTS" chipColor="blue"
        />

        <Card style={{ border: `1.5px solid #B5D4F4` }}>
          <CardTitle>Bank Reconciliation</CardTitle>
          <CardSub>
            {(kpis?.unreconciledCount ?? 0) > 0
              ? `${kpis?.unreconciledCount} unreconciled entries · ${INR_K(kpis?.unreconciledAmount ?? 0)} gap must be resolved`
              : "All entries reconciled — no gaps found"
            }
          </CardSub>
          <div style={{ overflowX: "auto" }}>
            <table className="fin-tbl" style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  <Th>Item</Th><Th>Status</Th><Th>Count</Th><Th>Amount</Th><Th>Type</Th><Th>Action Required</Th>
                </tr>
              </thead>
              <tbody>
                {(kpis?.unreconciledCount ?? 0) > 0 ? (
                  <>
                    <TrVariant variant="danger">
                      <Td bold>Unreconciled journal entries</Td>
                      <Td><Chip color="red">GAP</Chip></Td>
                      <Td>{kpis?.unreconciledCount}</Td>
                      <Td mono bold color={C.red}>{INR_K(kpis?.unreconciledAmount ?? 0)}</Td>
                      <Td><Chip color="red">URGENT</Chip></Td>
                      <Td color={C.red}>Post missing entries; match bank statement lines</Td>
                    </TrVariant>
                    <TrVariant variant="warn">
                      <Td bold>Total Reconciliation Gap</Td>
                      <Td><Chip color="amber">TIMING</Chip></Td>
                      <Td>—</Td>
                      <Td mono bold color={C.red}>{INR_K(kpis?.unreconciledAmount ?? 0)}</Td>
                      <Td><Chip color="amber">REVIEW</Chip></Td>
                      <Td color={C.amber}>Investigate & resolve this week</Td>
                    </TrVariant>
                  </>
                ) : (
                  <TrVariant variant="good">
                    <Td bold>All entries matched</Td>
                    <Td><Chip color="green">MATCH</Chip></Td>
                    <Td>0</Td>
                    <Td mono color={C.green}>₹0</Td>
                    <Td><Chip color="green">CLEAR</Chip></Td>
                    <Td color={C.muted}>No action needed</Td>
                  </TrVariant>
                )}
              </tbody>
            </table>
          </div>
          {(kpis?.unreconciledCount ?? 0) > 0 && (
            <div style={{ marginTop: 12 }}>
              <Flag variant="warn">
                <span>⚠</span>
                <span><strong>Action required:</strong> Run full bank reconciliation. Match every journal entry to bank statement line. Post all unposted entries before month-end close.</span>
              </Flag>
            </div>
          )}
        </Card>

        {/* ══ G: JOURNAL ANOMALIES ══════════════════════════════════════ */}
        <SectionHd
          title="Journal Entries & Day Book — Anomaly Detection"
          sub="All postings reviewed for narration gaps, duplicates, round figures · Source: Journal Entries + Day Book"
          chip="JOURNAL / DAY BOOK" chipColor="amber"
        />

        <Card style={{ border: `1.5px solid ${C.amberBd}` }}>
          <CardTitle>Recent Entries — Flagged for Review</CardTitle>
          <CardSub>
            {(data?.recentJournals ?? []).filter(j => j.flags?.length > 0).length} anomalies found · Fix before month-end close
          </CardSub>
          <div style={{ overflowX: "auto" }}>
            <table className="fin-tbl" style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  <Th>Date</Th><Th>Reference</Th><Th>Type</Th><Th>Amount</Th>
                  <Th>Narration</Th><Th>Lines</Th><Th>Flag</Th>
                </tr>
              </thead>
              <tbody>
                {(data?.recentJournals ?? []).map((j) => {
                  const hasFlag = j.flags?.length > 0;
                  const isRound = j.flags?.includes("ROUND");
                  const isDup = j.flags?.includes("DUPLICATE");
                  const noNarr = j.flags?.includes("NO_NARR");
                  const rowVar: RowVariant = (isRound || noNarr) ? "danger" : hasFlag ? "warn" : "good";
                  const flagChip: ChipColor = (isRound && noNarr) ? "red" : isDup ? "amber" : hasFlag ? "amber" : "green";
                  const flagLabel = noNarr && isRound ? "ROUND / NO NARR" : isDup ? "DUPLICATE?" : noNarr ? "NO NARRATION" : isRound ? "ROUND FIGURE" : hasFlag ? j.flags.join(", ") : "VERIFIED";
                  return (
                    <TrVariant key={j.id} variant={rowVar}>
                      <Td>{new Date(j.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</Td>
                      <Td mono color={C.blueMid} bold={hasFlag}>{j.reference || `JV-${j.id}`}</Td>
                      <Td>{j.sourceType}</Td>
                      <Td mono color={j.amount < 0 ? C.red : C.green} bold={isRound}>
                        {j.amount < 0 ? "−" : "+"}{INR(Math.abs(j.amount))}
                      </Td>
                      <Td color={noNarr ? C.red : C.muted}>
                        {noNarr ? <span style={{ color: C.red }}>⚠ MISSING narration</span> : (j.narration || "—")}
                      </Td>
                      <Td>{j.lineCount}</Td>
                      <Td><Chip color={flagChip}>{flagLabel}</Chip></Td>
                    </TrVariant>
                  );
                })}
                {(data?.recentJournals ?? []).length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", color: C.hint, fontSize: 11 }}>No recent journal entries</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12 }}>
            <Flag variant="purple">
              <span>ℹ</span>
              <span>
                <strong>Fix rules to implement:</strong> (1) Narration mandatory on all journal entries &nbsp;·&nbsp;
                (2) Bill/invoice attachment required for every cash expense &nbsp;·&nbsp;
                (3) Flag all ₹1L+ round-figure postings for monthly review &nbsp;·&nbsp;
                (4) Resolve any duplicate entries — verify both are valid
              </span>
            </Flag>
          </div>
        </Card>

        {/* ══ H: CHART OF ACCOUNTS ═════════════════════════════════════ */}
        <SectionHd
          title="Chart of Accounts — Structure Review"
          sub="Current account structure vs what needs to be added · Source: Chart of Accounts module"
          chip="CHART OF ACCOUNTS" chipColor="purple"
        />

        <Card style={{ border: `1.5px solid #AFA9EC` }}>
          <CardTitle>Account Structure — Problems &amp; Recommended Additions</CardTitle>
          <CardSub>Fix Chart of Accounts first — it drives all reports downstream</CardSub>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ borderRadius: 10, padding: 14, background: C.redBg }}>
              <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 10, color: C.red }}>Current — Problems</div>
              <CoaItem badge="27%" badgeColor="red" label="Miscellaneous Expenses" desc="₹7.73L with zero sub-classification — no visibility into actual spend" />
              <CoaItem badge="GAP" badgeColor="red" label="No Diesel sub-account" desc="Diesel costs mixed with general transport — can't track alone" />
              <CoaItem badge="GAP" badgeColor="red" label="No Packaging account" desc="Labels, caps, shrink film, boxes buried in COGS — cost per SKU unknown" />
              <CoaItem badge="GAP" badgeColor="red" label="No Chemical account" desc="Water treatment chemicals not separately tracked — FSSAI compliance risk" />
            </div>
            <div style={{ borderRadius: 10, padding: 14, background: C.greenBg }}>
              <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 10, color: C.green }}>Add to Chart of Accounts</div>
              <CoaItem badge="ADD" badgeColor="green" label="5100 — Diesel / Fuel" desc="Separate diesel from other transport. Track monthly diesel cost clearly." />
              <CoaItem badge="ADD" badgeColor="green" label="5110 — Vehicle Maintenance" desc="Service, tyres, repairs — separate from operations expenses" />
              <CoaItem badge="ADD" badgeColor="green" label="5200 — Packaging Materials" desc="Labels, shrink film, caps, corrugated boxes — enables SKU cost tracking" />
              <CoaItem badge="ADD" badgeColor="green" label="5300 — Water Treatment" desc="RO chemicals, testing kits, disinfectants — required for FSSAI records" />
            </div>
            <div style={{ borderRadius: 10, padding: 14, background: C.blueBg }}>
              <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 10, color: C.blue }}>Result After Fix</div>
              <CoaItem badge="WIN" badgeColor="blue" label="Full fuel cost visibility" desc="See diesel ₹ per month, per vehicle, per route — negotiate from data" />
              <CoaItem badge="WIN" badgeColor="blue" label="SKU profitability" desc="Know true cost per 20L jar vs 1L bottle vs 500ml — price correctly" />
              <CoaItem badge="WIN" badgeColor="blue" label="Misc drops to ≤5%" desc="Currently high. After reclassification, target below 5% of expenses" />
              <CoaItem badge="WIN" badgeColor="blue" label="Audit & compliance ready" desc="FSSAI, GST, Income Tax audits all simpler with proper account heads" />
            </div>
          </div>
        </Card>

        {/* ══ I: DSS DECISION PANEL ════════════════════════════════════ */}
        <SectionHd
          title="DSS Master Decision Panel"
          sub="Priority decisions derived from all accounting modules · Act on these in order"
          chip="ALL MODULES" chipColor="red"
        />

        <Card style={{ border: `2px solid ${C.redMid}` }}>
          <CardTitle style={{ color: C.red } as any}>Financial Accounting — Priority Decisions for Management</CardTitle>
          <CardSub>All accounting modules → actionable decisions. Do in this order.</CardSub>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
            {(data?.insights ?? []).map((ins, i) => {
              const bg = ins.priority === "P1" ? C.redBg : ins.priority === "P2" ? C.redBg : ins.priority === "P3" ? C.amberBg : ins.priority === "P4" ? C.amberBg : ins.priority === "P5" ? C.purpleBg : C.blueBg;
              const chipColor: ChipColor = ins.priority === "P1" || ins.priority === "P2" ? "red" : ins.priority === "P3" || ins.priority === "P4" ? "amber" : ins.priority === "P5" ? "purple" : "blue";
              return (
                <DssCard key={i}
                  priority={ins.priority} chip={`${ins.priority} — ${ins.label}`} chipColor={chipColor}
                  title={ins.title} body={ins.body} bg={bg}
                />
              );
            })}
            {(data?.insights ?? []).length === 0 && (
              <div style={{ gridColumn: "1/-1", padding: 20, textAlign: "center", color: C.hint, fontSize: 11 }}>
                No priority decisions generated — data may be insufficient
              </div>
            )}
          </div>
        </Card>

        {/* ── Footer ── */}
        <div style={{ textAlign: "center", fontSize: 9, color: C.hint, padding: "20px 0 8px", borderTop: `1px solid ${C.border}`, marginTop: 24 }}>
          KINTO Operations · Financial Accounting — Formal Ledger MIS · {fyLabel} · All Accounting Modules Covered
        </div>

      </div>
    </div>
  );
}
