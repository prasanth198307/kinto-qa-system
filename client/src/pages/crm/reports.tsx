import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, Download, TrendingUp, Users, DollarSign, Activity } from "lucide-react";

const api = (method: string, path: string) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" } }).then(r => r.json());

const TABS = [
  { key: "rep-performance", label: "Rep Performance", icon: Users },
  { key: "pipeline", label: "Pipeline", icon: TrendingUp },
  { key: "revenue", label: "Revenue", icon: DollarSign },
  { key: "lead-source-roi", label: "Lead Source ROI", icon: BarChart3 },
  { key: "activity-summary", label: "Activity Summary", icon: Activity },
];

const COL_MAP: Record<string, string[]> = {
  "rep-performance": ["rep_name", "leads_assigned", "deals_won", "deals_lost", "revenue", "win_rate"],
  "pipeline": ["stage", "deals", "value", "avg_probability", "weighted_value"],
  "revenue": ["month", "deals_won", "revenue", "avg_deal_size"],
  "lead-source-roi": ["source", "leads", "conversions", "conversion_rate", "revenue", "roi"],
  "activity-summary": ["activity_type", "count", "contacts_reached", "deals_influenced"],
};

export default function CRMReportsPage() {
  const [tab, setTab] = useState("pipeline");
  const [from, setFrom] = useState(() => { const d = new Date(); d.setMonth(0); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ["/api/crm/reports", tab, from, to],
    queryFn: () => api("GET", `/api/crm/reports/${tab}?from=${from}&to=${to}`),
  });

  const rawData = data as any;
  const summary = rawData?.summary ?? {};
  const rows: any[] = Array.isArray(rawData?.rows) ? rawData.rows : Array.isArray(rawData) ? rawData : [];
  const cols = COL_MAP[tab] ?? [];

  const statCards: Record<string, Record<string, any>> = {
    "rep-performance": { "Total Reps": summary.total_reps ?? rows.length, "Total Won": summary.total_won ?? "—", "Total Revenue": summary.total_revenue ? `₹${Number(summary.total_revenue).toLocaleString("en-IN")}` : "—" },
    "pipeline": { "Total Deals": summary.total_deals ?? rows.reduce((s: number, r: any) => s + Number(r.deals || 0), 0), "Pipeline Value": `₹${Number(summary.total_value ?? rows.reduce((s: number, r: any) => s + Number(r.value || 0), 0)).toLocaleString("en-IN")}`, "Weighted": `₹${Number(summary.weighted_value ?? rows.reduce((s: number, r: any) => s + Number(r.weighted_value || 0), 0)).toLocaleString("en-IN")}` },
    "revenue": { "Total Revenue": `₹${Number(summary.total_revenue ?? 0).toLocaleString("en-IN")}`, "Deals Won": summary.total_won ?? "—", "Avg Deal Size": summary.avg_deal_size ? `₹${Number(summary.avg_deal_size).toLocaleString("en-IN")}` : "—" },
    "lead-source-roi": { "Top Source": summary.top_source ?? "—", "Overall Conversion": summary.overall_conversion ? `${summary.overall_conversion}%` : "—", "Total Revenue": summary.total_revenue ? `₹${Number(summary.total_revenue).toLocaleString("en-IN")}` : "—" },
    "activity-summary": { "Total Activities": summary.total_activities ?? rows.reduce((s: number, r: any) => s + Number(r.count || 0), 0), "Contacts Reached": summary.contacts_reached ?? "—" },
  };

  const cards = statCards[tab] ?? {};

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6 text-blue-600" />CRM Reports</h1>
        <Button variant="outline" onClick={() => window.open(`/api/crm/reports/${tab}/export?from=${from}&to=${to}`, "_blank")}><Download className="w-4 h-4 mr-1" />Export CSV</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <Button key={t.key} variant={tab === t.key ? "default" : "outline"} size="sm" onClick={() => setTab(t.key)}>
            <t.icon className="w-3 h-3 mr-1" />{t.label}
          </Button>
        ))}
      </div>

      <div className="flex items-end gap-3">
        <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" /></div>
        <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" /></div>
      </div>

      {Object.keys(cards).length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(cards).map(([k, v]) => (
            <Card key={k}><CardContent className="pt-4"><p className="text-xs text-gray-500">{k}</p><p className="text-2xl font-bold mt-1">{v}</p></CardContent></Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">{TABS.find(t => t.key === tab)?.label}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-gray-400 py-8">Loading...</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {cols.map(c => <th key={c} className="text-left p-2 border capitalize">{c.replace(/_/g, " ")}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, i: number) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    {cols.map(c => (
                      <td key={c} className="p-2">
                        {typeof row[c] === "number" && (c.includes("revenue") || c.includes("value") || c.includes("size"))
                          ? `₹${Number(row[c]).toLocaleString("en-IN")}`
                          : c.includes("rate") || c.includes("roi") ? `${row[c] ?? 0}%`
                          : row[c] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!isLoading && rows.length === 0 && <p className="text-center text-gray-400 py-6">No data for selected period.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
