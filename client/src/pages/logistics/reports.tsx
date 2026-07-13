import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart2, Truck, Fuel, Users, Activity } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (path: string) => fetch(path).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const TABS = ["trip_summary", "fuel_efficiency", "driver_performance", "fleet_utilization", "fastag_spend"] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  trip_summary: "Trip Summary",
  fuel_efficiency: "Fuel Efficiency",
  driver_performance: "Driver Performance",
  fleet_utilization: "Fleet Utilization",
  fastag_spend: "FASTag Spend",
};

const TAB_ICONS: Record<Tab, any> = {
  trip_summary: BarChart2,
  fuel_efficiency: Fuel,
  driver_performance: Users,
  fleet_utilization: Truck,
  fastag_spend: Activity,
};

export default function LogisticsReportsPage() {
  const [tab, setTab] = useState<Tab>("trip_summary");
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [fromDate, setFromDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: report = {} } = useQuery({
    queryKey: ["/api/logistics/reports", tab, fromDate, toDate],
    queryFn: () => api(`/api/logistics/reports/${tab}?from=${fromDate}&to=${toDate}`),
  });

  const r = report as any;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Logistics Reports</h1>

      <div className="flex gap-3 items-end">
        <div><Label className="text-xs">From</Label><Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-36" /></div>
        <div><Label className="text-xs">To</Label><Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-36" /></div>
      </div>

      <div className="flex gap-2 flex-wrap border-b pb-1">
        {TABS.map(t => {
          const Icon = TAB_ICONS[t];
          return (
            <button key={t} onClick={() => setTab(t)} className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-t ${tab === t ? "bg-white border border-b-white -mb-px text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>
              <Icon className="w-3.5 h-3.5" />{TAB_LABELS[t]}
            </button>
          );
        })}
      </div>

      {tab === "trip_summary" && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[["Total Trips", r.total_trips ?? 0, ""], ["Total Distance", `${r.total_distance_km ?? 0} km`, ""], ["On-time %", `${r.ontime_pct ?? 0}%`, "text-green-600"], ["Avg Load", `${r.avg_load_pct ?? 0}%`, ""]].map(([label, val, cls]) => (
              <Card key={label as string}><CardContent className="pt-4"><p className="text-sm text-gray-500">{label}</p><p className={`text-2xl font-bold ${cls}`}>{val}</p></CardContent></Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Trips by Route</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50">{["Route", "Trips", "Avg Distance", "Avg Revenue"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
                <tbody>
                  {Array.isArray(r.by_route) && r.by_route.map((row: any, i: number) => (
                    <tr key={i} className="border-b"><td className="p-2">{row.route}</td><td className="p-2">{row.trip_count}</td><td className="p-2">{row.avg_distance_km} km</td><td className="p-2">{sym}{row.avg_revenue?.toLocaleString()}</td></tr>
                  ))}
                  {(!r.by_route || r.by_route?.length === 0) && <tr><td colSpan={4} className="text-center p-4 text-gray-400">No data for selected period.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "fuel_efficiency" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[["Total Fuel (L)", r.total_liters ?? 0, ""], ["Total Spend", `${sym}${(r.total_spend ?? 0).toLocaleString()}`, ""], ["Fleet Avg km/L", r.fleet_avg_kmpl ?? 0, "text-blue-600"]].map(([label, val, cls]) => (
              <Card key={label as string}><CardContent className="pt-4"><p className="text-sm text-gray-500">{label}</p><p className={`text-2xl font-bold ${cls}`}>{val}</p></CardContent></Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Per-Vehicle Efficiency</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50">{["Vehicle", "Litres", "Distance km", "km/L", "Spend ${sym}"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
                <tbody>
                  {Array.isArray(r.by_vehicle) && r.by_vehicle.map((row: any, i: number) => (
                    <tr key={i} className="border-b"><td className="p-2">{row.registration_no}</td><td className="p-2">{row.total_liters}</td><td className="p-2">{row.distance_km}</td><td className="p-2 font-semibold">{row.kmpl}</td><td className="p-2">{sym}{row.spend?.toLocaleString()}</td></tr>
                  ))}
                  {(!r.by_vehicle || r.by_vehicle?.length === 0) && <tr><td colSpan={5} className="text-center p-4 text-gray-400">No data for selected period.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "driver_performance" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Driver Performance</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50">{["Driver", "Trips", "Distance km", "On-time %", "Avg Speed", "Violations"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
              <tbody>
                {Array.isArray(r.drivers) && r.drivers.map((d: any, i: number) => (
                  <tr key={i} className="border-b"><td className="p-2">{d.driver_name}</td><td className="p-2">{d.trip_count}</td><td className="p-2">{d.distance_km}</td><td className="p-2">{d.ontime_pct}%</td><td className="p-2">{d.avg_speed_kmh} km/h</td><td className="p-2 text-red-600">{d.violations ?? 0}</td></tr>
                ))}
                {(!r.drivers || r.drivers?.length === 0) && <tr><td colSpan={6} className="text-center p-4 text-gray-400">No data for selected period.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === "fleet_utilization" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[["Active Vehicles", r.active_vehicles ?? 0, "text-green-600"], ["Idle Vehicles", r.idle_vehicles ?? 0, "text-yellow-600"], ["Under Maintenance", r.maintenance_vehicles ?? 0, "text-red-600"]].map(([l, v, c]) => (
              <Card key={l as string}><CardContent className="pt-4"><p className="text-sm text-gray-500">{l}</p><p className={`text-2xl font-bold ${c}`}>{v}</p></CardContent></Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Vehicle Utilization</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50">{["Vehicle", "Trips", "Days Used", "Utilization %", "Revenue ${sym}"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
                <tbody>
                  {Array.isArray(r.vehicles) && r.vehicles.map((v: any, i: number) => (
                    <tr key={i} className="border-b"><td className="p-2">{v.registration_no}</td><td className="p-2">{v.trip_count}</td><td className="p-2">{v.days_used}</td><td className="p-2"><div className="flex items-center gap-2"><div className="w-16 bg-gray-200 rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${v.utilization_pct}%` }} /></div>{v.utilization_pct}%</div></td><td className="p-2">{sym}{v.revenue?.toLocaleString()}</td></tr>
                  ))}
                  {(!r.vehicles || r.vehicles?.length === 0) && <tr><td colSpan={5} className="text-center p-4 text-gray-400">No data for selected period.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "fastag_spend" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[["Total Toll Spend", `${sym}${(r.total_spend ?? 0).toLocaleString()}`, ""], ["Total Transactions", r.transaction_count ?? 0, ""]].map(([l, v, c]) => (
              <Card key={l as string}><CardContent className="pt-4"><p className="text-sm text-gray-500">{l}</p><p className={`text-2xl font-bold ${c}`}>{v}</p></CardContent></Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">FASTag Spend by Vehicle</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50">{["Vehicle", "Transactions", "Total Toll ₹", "Avg per Trip ₹"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
                <tbody>
                  {Array.isArray(r.by_vehicle) && r.by_vehicle.map((v: any, i: number) => (
                    <tr key={i} className="border-b"><td className="p-2">{v.registration_no}</td><td className="p-2">{v.txn_count}</td><td className="p-2">{sym}{v.total_spend?.toLocaleString()}</td><td className="p-2">{sym}{v.avg_per_trip?.toLocaleString()}</td></tr>
                  ))}
                  {(!r.by_vehicle || r.by_vehicle?.length === 0) && <tr><td colSpan={4} className="text-center p-4 text-gray-400">No FASTag data for selected period.</td></tr>}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-3">FASTag spend tracked via manual entry and bank statement sync (NETC FASTag API is not publicly available).</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
