import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const api = (u: string) => fetch(u, { credentials: "include" }).then(r => r.json());
const fmt = (n: any) => n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—";

type ReportKey = "sales_velocity" | "inventory_aging" | "collection_efficiency" | "broker_performance" | "project_profitability" | "demand_vs_collection" | "unit_status_inventory";

const REPORTS: { key: ReportKey; label: string; desc: string }[] = [
  { key: "sales_velocity", label: "Sales Velocity", desc: "Units sold per month, avg days to close" },
  { key: "inventory_aging", label: "Inventory Aging", desc: "Unsold units by age bracket and price band" },
  { key: "collection_efficiency", label: "Collection Efficiency", desc: "Demand raised vs collected vs overdue by project" },
  { key: "broker_performance", label: "Broker Performance", desc: "Sales, commissions and conversion rate by broker" },
  { key: "project_profitability", label: "Project Profitability", desc: "Revenue, construction cost, GM% per project" },
  { key: "demand_vs_collection", label: "Demand vs Collection", desc: "Month-wise demand letters issued vs collections received" },
  { key: "unit_status_inventory", label: "Unit Status Inventory", desc: "Available, booked, blocked, sold units by project" },
];

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportKey>("project_profitability");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/real-estate/reports", activeReport],
    queryFn: () => api(`/api/real-estate/reports/${activeReport.replace(/_/g, "-")}`),
  });

  function renderTable(rows: any[], columns: { key: string; label: string; fmt?: (v: any) => string }[]) {
    if (!rows?.length) return <p style={{ padding: 24, textAlign: "center", color: "#888", fontSize: 13 }}>No data available</p>;
    return (
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead><tr style={{ background: "#eef2ff" }}>{columns.map(c => <th key={c.key} style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #d0daf5", fontWeight: 600 }}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 ? "#f8faff" : "#fff" }}>
              {columns.map(c => <td key={c.key} style={{ padding: "8px 10px" }}>{c.fmt ? c.fmt(row[c.key]) : (row[c.key] ?? "—")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function renderReport() {
    if (isLoading) return <div style={{ padding: 32, textAlign: "center", color: "#888" }}>Loading…</div>;
    if (!data) return <div style={{ padding: 32, textAlign: "center", color: "#888" }}>No data</div>;

    const rows = Array.isArray(data) ? data : (data.rows || data.data || []);

    switch (activeReport) {
      case "project_profitability":
        return renderTable(rows, [{ key: "project_name", label: "Project" }, { key: "total_units", label: "Units" }, { key: "units_sold", label: "Sold" }, { key: "total_revenue", label: "Revenue", fmt }, { key: "total_cost", label: "Cost", fmt }, { key: "gross_profit", label: "Gross Profit", fmt }, { key: "gm_pct", label: "GM%", fmt: v => v != null ? `${Number(v).toFixed(1)}%` : "—" }]);
      case "collection_efficiency":
        return renderTable(rows, [{ key: "project_name", label: "Project" }, { key: "demand_raised", label: "Demand Raised", fmt }, { key: "collected", label: "Collected", fmt }, { key: "overdue", label: "Overdue", fmt }, { key: "efficiency_pct", label: "Efficiency%", fmt: v => v != null ? `${Number(v).toFixed(1)}%` : "—" }]);
      case "broker_performance":
        return renderTable(rows, [{ key: "broker_name", label: "Broker" }, { key: "rera_no", label: "RERA No" }, { key: "deals_closed", label: "Deals" }, { key: "total_sales_value", label: "Sales Value", fmt }, { key: "commission_earned", label: "Commission", fmt }, { key: "commission_paid", label: "Paid", fmt }, { key: "conversion_rate", label: "Conv%", fmt: v => v != null ? `${Number(v).toFixed(1)}%` : "—" }]);
      case "inventory_aging":
        return renderTable(rows, [{ key: "project_name", label: "Project" }, { key: "unit_no", label: "Unit" }, { key: "unit_type", label: "Type" }, { key: "current_price", label: "Price", fmt }, { key: "days_available", label: "Days Available" }, { key: "age_band", label: "Age Band" }]);
      case "unit_status_inventory":
        return renderTable(rows, [{ key: "project_name", label: "Project" }, { key: "available", label: "Available" }, { key: "blocked", label: "Blocked" }, { key: "booked", label: "Booked" }, { key: "sold", label: "Sold" }, { key: "total", label: "Total" }]);
      case "demand_vs_collection":
        return renderTable(rows, [{ key: "month", label: "Month" }, { key: "project_name", label: "Project" }, { key: "demand_count", label: "Demands" }, { key: "demand_amount", label: "Demand Amount", fmt }, { key: "collected_amount", label: "Collected", fmt }, { key: "gap", label: "Gap", fmt }]);
      case "sales_velocity":
        return renderTable(rows, [{ key: "month", label: "Month" }, { key: "project_name", label: "Project" }, { key: "units_sold", label: "Units Sold" }, { key: "total_value", label: "Value", fmt }, { key: "avg_days_to_close", label: "Avg Days to Close" }]);
      default:
        return <pre style={{ fontSize: 11, padding: 12, background: "#f8faff", borderRadius: 6, overflow: "auto", maxHeight: 400 }}>{JSON.stringify(data, null, 2)}</pre>;
    }
  }

  const active = REPORTS.find(r => r.key === activeReport);

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1100 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Real Estate Analytics & Reports</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>Project profitability, broker performance, collection efficiency, inventory aging</p>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {REPORTS.map(r => (
          <Button key={r.key} size="sm" variant={activeReport === r.key ? "default" : "outline"} onClick={() => setActiveReport(r.key)} style={{ fontSize: 12 }}>
            {r.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader style={{ paddingBottom: 8 }}>
          <CardTitle style={{ fontSize: 14 }}>{active?.label}</CardTitle>
          <p style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{active?.desc}</p>
        </CardHeader>
        <CardContent style={{ padding: 0 }}>
          {renderReport()}
        </CardContent>
      </Card>
    </div>
  );
}
