import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, FileText,
  ArrowRight, AlertTriangle, CheckCircle, Clock, BarChart3,
} from "lucide-react";

interface FinanceSummary {
  ar_total: number;
  ar_overdue: number;
  ap_total: number;
  cash_balance: number;
  revenue_mtd: number;
  expense_mtd: number;
  outstanding_invoices: number;
  pending_payments: number;
}

const api = (path: string) =>
  fetch(path).then((r) => r.json()).catch(() => null);

function fmt(n: number | undefined) {
  if (!n) return "₹0";
  return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function FinanceERPPage() {
  const { data: summary } = useQuery<FinanceSummary>({
    queryKey: ["/api/finance-erp/summary"],
    queryFn: () => api("/api/finance-erp/summary"),
    retry: false,
  });

  const kpis = [
    {
      label: "Accounts Receivable",
      value: fmt(summary?.ar_total),
      sub: `${fmt(summary?.ar_overdue)} overdue`,
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50",
      link: "/accounting",
    },
    {
      label: "Accounts Payable",
      value: fmt(summary?.ap_total),
      sub: `${summary?.pending_payments ?? 0} bills pending`,
      icon: TrendingDown,
      color: "text-orange-600",
      bg: "bg-orange-50",
      link: "/accounting",
    },
    {
      label: "Cash & Bank Balance",
      value: fmt(summary?.cash_balance),
      sub: "All accounts combined",
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-50",
      link: "/bank-transactions",
    },
    {
      label: "Revenue (This Month)",
      value: fmt(summary?.revenue_mtd),
      sub: `Expenses: ${fmt(summary?.expense_mtd)}`,
      icon: BarChart3,
      color: "text-purple-600",
      bg: "bg-purple-50",
      link: "/mis-financial",
    },
  ];

  const modules = [
    {
      title: "Accounts Receivable",
      desc: "Customer invoices, AR aging, outstanding follow-ups, credit limits",
      href: "/invoices",
      icon: "📋",
      status: "Live",
    },
    {
      title: "Accounts Payable",
      desc: "Vendor bills, AP aging, payment runs, expense tracking",
      href: "/expense-vouchers",
      icon: "📤",
      status: "Live",
    },
    {
      title: "General Ledger",
      desc: "Chart of accounts, journal entries, trial balance, P&L, Balance Sheet",
      href: "/chart-of-accounts",
      icon: "📚",
      status: "Live",
    },
    {
      title: "Bank & Cash",
      desc: "Bank transactions, reconciliation, multi-bank dashboard, cash register",
      href: "/bank-transactions",
      icon: "🏦",
      status: "Live",
    },
    {
      title: "GST & Compliance",
      desc: "GSTR-1, GSTR-3B, e-Invoice, e-Way bill, TDS returns",
      href: "/gstr-reports",
      icon: "🇮🇳",
      status: "Live",
    },
    {
      title: "MIS & Reports",
      desc: "P&L, Balance Sheet, Cash Flow, Budget vs Actual, department MIS",
      href: "/mis-financial",
      icon: "📊",
      status: "Live",
    },
    {
      title: "Budgets",
      desc: "Annual budgeting, monthly allocations, variance analysis",
      href: "/budgets",
      icon: "🎯",
      status: "Live",
    },
    {
      title: "Fixed Assets",
      desc: "Asset register, depreciation schedule (SLM/WDV), disposal",
      href: "/fixed-assets-list",
      icon: "🏭",
      status: "Live",
    },
    {
      title: "Cost Centres",
      desc: "Department-wise P&L tracking, project accounting, cost allocation",
      href: "/cost-centres",
      icon: "🏢",
      status: "Live",
    },
    {
      title: "Multi-Currency",
      desc: "Foreign currency invoicing, forex gain/loss, exchange rates",
      href: "/currencies",
      icon: "💱",
      status: "Live",
    },
    {
      title: "Recurring Journals",
      desc: "Auto-posting for rent, depreciation, prepaid amortization",
      href: "/chart-of-accounts",
      icon: "🔄",
      status: "Coming Soon",
    },
    {
      title: "Period Close",
      desc: "Month-end close, year-end lock, retained earnings rollover",
      href: "/chart-of-accounts",
      icon: "🔒",
      status: "Coming Soon",
    },
  ];

  const quickActions = [
    { label: "New Journal Entry", href: "/journal-entries", icon: "✏️" },
    { label: "View Trial Balance", href: "/trial-balance", icon: "⚖️" },
    { label: "GSTR Reports", href: "/gstr-reports", icon: "📄" },
    { label: "Bank Statement", href: "/bank-statement", icon: "🏦" },
    { label: "Outstanding Report", href: "/customer-outstanding-report", icon: "⚠️" },
    { label: "MIS Dashboard", href: "/mis-financial", icon: "📊" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance & Accounts ERP</h1>
          <p className="text-gray-500 mt-1">
            Complete financial management — AR · AP · GL · GST · MIS · Compliance
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/mis-financial">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" /> MIS Reports
            </Button>
          </Link>
          <Link href="/journal-entries">
            <Button size="sm">
              <FileText className="h-4 w-4 mr-2" /> Journal Entry
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.link}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className={`inline-flex p-2 rounded-lg ${k.bg} mb-3`}>
                  <k.icon className={`h-5 w-5 ${k.color}`} />
                </div>
                <p className="text-xs text-gray-500 font-medium">{k.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{k.value}</p>
                <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm font-semibold text-gray-700">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((a) => (
              <Link key={a.label} href={a.href}>
                <Button variant="outline" size="sm" className="text-xs">
                  <span className="mr-1">{a.icon}</span> {a.label}
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Finance Modules Grid */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Finance Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => (
            <Link key={m.title} href={m.href}>
              <Card className="cursor-pointer hover:shadow-md hover:border-blue-200 transition-all h-full">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{m.icon}</span>
                      <span className="font-semibold text-gray-900 text-sm">{m.title}</span>
                    </div>
                    <Badge
                      variant={m.status === "Live" ? "default" : "secondary"}
                      className="text-xs shrink-0"
                    >
                      {m.status === "Live" ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <Clock className="h-3 w-3 mr-1" />
                      )}
                      {m.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{m.desc}</p>
                  <div className="flex items-center text-blue-600 text-xs mt-3 font-medium">
                    Open <ArrowRight className="h-3 w-3 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Finance ERP scope note */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800">
                Finance & Accounts ERP — Unified Platform
              </p>
              <p className="text-xs text-blue-700 mt-1">
                This module covers the complete Accounts & Finance function. The Finance ERP and
                Accounting module are unified — all journal entries, GST filings, and financial
                reports are available here. Use the sidebar or quick actions above to navigate
                directly to any sub-module.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
