import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, Download } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" } }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const TABS = [
  { key: "occupancy", label: "Occupancy" },
  { key: "revenue", label: "Revenue" },
  { key: "room_type", label: "By Room Type" },
  { key: "source", label: "By Source" },
  { key: "housekeeping", label: "Housekeeping" },
];

const COL_MAP: Record<string, string[]> = {
  occupancy: ["date", "total_rooms", "occupied_rooms", "occupancy_pct", "arrivals", "departures"],
  revenue: ["date", "room_revenue", "fnb_revenue", "other_revenue", "total_revenue"],
  room_type: ["room_type", "total_rooms", "occupied", "occupancy_pct", "avg_rate"],
  source: ["source", "reservations", "revenue", "avg_stay"],
  housekeeping: ["date", "tasks_assigned", "tasks_completed", "completion_pct"],
};

export default function HotelReportsPage() {
  const [tab, setTab] = useState("occupancy");
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ["/api/hotel/reports", tab, from, to],
    queryFn: () => api("GET", `/api/hotel/reports/${tab}?from=${from}&to=${to}`),
  });

  const summary = data?.summary ?? {};
  const rows: any[] = Array.isArray(data?.rows) ? data.rows : [];
  const cols = COL_MAP[tab] ?? [];

  const statCards: Record<string, Record<string, string>> = {
    occupancy: { "Avg Occupancy": `${summary.avg_occupancy_pct ?? 0}%`, "Total Arrivals": summary.total_arrivals ?? "—", "Total Departures": summary.total_departures ?? "—" },
    revenue: { "Total Revenue": `${sym}${Number(summary.total_revenue ?? 0).toLocaleString("en-IN")}`, "Room Revenue": `${sym}${Number(summary.room_revenue ?? 0).toLocaleString("en-IN")}`, "F&B Revenue": `${sym}${Number(summary.fnb_revenue ?? 0).toLocaleString("en-IN")}` },
    room_type: { "Best Occupied": summary.best_room_type ?? "—", "Lowest Occupied": summary.lowest_room_type ?? "—" },
    source: { "Top Source": summary.top_source ?? "—", "Total Bookings": summary.total_bookings ?? "—" },
    housekeeping: { "Tasks Assigned": summary.total_tasks ?? "—", "Completion Rate": `${summary.completion_pct ?? 0}%` },
  };

  const cards = statCards[tab] ?? {};

  const exportReport = () => {
    window.open(`/api/hotel/reports/${tab}/export?from=${from}&to=${to}`, "_blank");
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6 text-blue-600" />Hotel Reports</h1>
        <Button variant="outline" onClick={exportReport}><Download className="w-4 h-4 mr-1" />Export CSV</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => <Button key={t.key} variant={tab === t.key ? "default" : "outline"} size="sm" onClick={() => setTab(t.key)}>{t.label}</Button>)}
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
        <CardHeader><CardTitle className="text-base capitalize">{TABS.find(t => t.key === tab)?.label} Report</CardTitle></CardHeader>
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
                        {typeof row[c] === "number" && (c.includes("revenue") || c.includes("rate"))
                          ? `${sym}${Number(row[c]).toLocaleString("en-IN")}`
                          : c.includes("pct") ? `${row[c] ?? 0}%`
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
