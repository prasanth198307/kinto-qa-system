import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart2, DollarSign, AlertTriangle, Stethoscope, TrendingUp, Archive } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (path: string) => fetch(path).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const TABS = ["gst", "expiry", "margin", "doctor-wise", "purchase-vs-sales", "dead-stock"] as const;
type Tab = typeof TABS[number];
const LABELS: Record<Tab, string> = { gst: "GST Report", expiry: "Expiry Report", margin: "Margin Analysis", "doctor-wise": "Doctor-wise Sales", "purchase-vs-sales": "Purchase vs Sales", "dead-stock": "Dead Stock" };
const ICONS: Record<Tab, any> = { gst: DollarSign, expiry: AlertTriangle, margin: TrendingUp, "doctor-wise": Stethoscope, "purchase-vs-sales": BarChart2, "dead-stock": Archive };

export default function PharmacyReportsPage() {
  const [tab, setTab] = useState<Tab>("gst");
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [fromDate, setFromDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: report = {} } = useQuery<any>({
    queryKey: ["/api/pharmacy/reports", tab, fromDate, toDate],
    queryFn: () => api(`/api/pharmacy/reports/${tab}?from=${fromDate}&to=${toDate}`),
  });
  const r = report as any;
  const rows = (key: string) => (Array.isArray(r[key]) ? r[key] : Array.isArray(r) ? r : []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Pharmacy Reports</h1>

      <div className="flex gap-3 items-end">
        <div><Label className="text-xs">From</Label><Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-36" /></div>
        <div><Label className="text-xs">To</Label><Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-36" /></div>
      </div>

      <div className="flex gap-2 flex-wrap border-b pb-1">
        {TABS.map(t => { const Icon = ICONS[t]; return <button key={t} onClick={() => setTab(t)} className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-t ${tab === t ? "bg-white border border-b-white -mb-px text-blue-600" : "text-gray-500"}`}><Icon className="w-3.5 h-3.5" />{LABELS[t]}</button>; })}
      </div>

      {tab === "gst" && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[["Taxable Sales", `${sym}${(r.taxable_sales ?? 0).toLocaleString()}`], ["Output GST", `${sym}${(r.output_gst ?? 0).toLocaleString()}`], ["Input GST", `${sym}${(r.input_gst ?? 0).toLocaleString()}`], ["Net GST Payable", `${sym}${(r.net_gst ?? 0).toLocaleString()}`]].map(([l, v]) => (
              <Card key={l as string}><CardContent className="pt-4"><p className="text-sm text-gray-500">{l}</p><p className="text-xl font-bold">{v}</p></CardContent></Card>
            ))}
          </div>
          <Card><CardHeader><CardTitle className="text-base">GST Rate-wise Breakup</CardTitle></CardHeader><CardContent>
            <table className="w-full text-sm"><thead><tr className="bg-gray-50">{["GST Rate", "Taxable Value", "CGST", "SGST", "Total Tax"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
              <tbody>{rows("by_rate").map((x: any, i: number) => <tr key={i} className="border-b"><td className="p-2">{x.gst_rate}%</td><td className="p-2">{sym}{x.taxable?.toLocaleString()}</td><td className="p-2">{sym}{x.cgst?.toLocaleString()}</td><td className="p-2">{sym}{x.sgst?.toLocaleString()}</td><td className="p-2">{sym}{x.total_tax?.toLocaleString()}</td></tr>)}
              {rows("by_rate").length === 0 && <tr><td colSpan={5} className="text-center p-4 text-gray-400">No data for selected period.</td></tr>}</tbody>
            </table>
          </CardContent></Card>
        </div>
      )}

      {tab === "expiry" && (
        <Card><CardHeader><CardTitle className="text-base">Expiry Value at Risk</CardTitle></CardHeader><CardContent>
          <table className="w-full text-sm"><thead><tr className="bg-gray-50">{["Drug", "Batch", "Expiry", "Qty", "Value ${sym}"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
            <tbody>{rows("batches").map((x: any, i: number) => <tr key={i} className="border-b"><td className="p-2">{x.drug_name}</td><td className="p-2 font-mono text-xs">{x.batch_number}</td><td className="p-2">{x.expiry_date?.slice(0, 10)}</td><td className="p-2">{x.quantity}</td><td className="p-2">{sym}{x.value?.toLocaleString()}</td></tr>)}
            {rows("batches").length === 0 && <tr><td colSpan={5} className="text-center p-4 text-gray-400">No near-expiry stock.</td></tr>}</tbody>
          </table>
        </CardContent></Card>
      )}

      {tab === "margin" && (
        <Card><CardHeader><CardTitle className="text-base">Margin Analysis</CardTitle></CardHeader><CardContent>
          <table className="w-full text-sm"><thead><tr className="bg-gray-50">{["Drug", "Purchase Rate", "Selling Rate", "Margin ${sym}", "Margin %"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
            <tbody>{rows("drugs").map((x: any, i: number) => <tr key={i} className="border-b"><td className="p-2">{x.drug_name}</td><td className="p-2">{sym}{x.purchase_rate}</td><td className="p-2">{sym}{x.selling_rate}</td><td className="p-2">{sym}{x.margin}</td><td className="p-2 font-semibold">{x.margin_pct}%</td></tr>)}
            {rows("drugs").length === 0 && <tr><td colSpan={5} className="text-center p-4 text-gray-400">No data.</td></tr>}</tbody>
          </table>
        </CardContent></Card>
      )}

      {tab === "doctor-wise" && (
        <Card><CardHeader><CardTitle className="text-base">Doctor-wise Sales</CardTitle></CardHeader><CardContent>
          <table className="w-full text-sm"><thead><tr className="bg-gray-50">{["Doctor", "Prescriptions", "Total Sales ${sym}"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
            <tbody>{rows("doctors").map((x: any, i: number) => <tr key={i} className="border-b"><td className="p-2">{x.doctor_name}</td><td className="p-2">{x.rx_count}</td><td className="p-2">{sym}{x.total_sales?.toLocaleString()}</td></tr>)}
            {rows("doctors").length === 0 && <tr><td colSpan={3} className="text-center p-4 text-gray-400">No data for selected period.</td></tr>}</tbody>
          </table>
        </CardContent></Card>
      )}

      {tab === "purchase-vs-sales" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[["Total Purchases", `${sym}${(r.total_purchases ?? 0).toLocaleString()}`], ["Total Sales", `${sym}${(r.total_sales ?? 0).toLocaleString()}`], ["Gross Profit", `${sym}${(r.gross_profit ?? 0).toLocaleString()}`]].map(([l, v]) => (
              <Card key={l as string}><CardContent className="pt-4"><p className="text-sm text-gray-500">{l}</p><p className="text-xl font-bold">{v}</p></CardContent></Card>
            ))}
          </div>
          <Card><CardHeader><CardTitle className="text-base">Monthly Trend</CardTitle></CardHeader><CardContent>
            <table className="w-full text-sm"><thead><tr className="bg-gray-50">{["Month", "Purchases ₹", "Sales ₹", "Profit ₹"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
              <tbody>{rows("monthly").map((x: any, i: number) => <tr key={i} className="border-b"><td className="p-2">{x.month}</td><td className="p-2">{sym}{x.purchases?.toLocaleString()}</td><td className="p-2">{sym}{x.sales?.toLocaleString()}</td><td className="p-2">{sym}{x.profit?.toLocaleString()}</td></tr>)}
              {rows("monthly").length === 0 && <tr><td colSpan={4} className="text-center p-4 text-gray-400">No data.</td></tr>}</tbody>
            </table>
          </CardContent></Card>
        </div>
      )}

      {tab === "dead-stock" && (
        <Card><CardHeader><CardTitle className="text-base">Dead Stock (no sales in 90 days)</CardTitle></CardHeader><CardContent>
          <table className="w-full text-sm"><thead><tr className="bg-gray-50">{["Drug", "Batch", "Qty", "Value ₹", "Last Sold"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
            <tbody>{rows("items").map((x: any, i: number) => <tr key={i} className="border-b"><td className="p-2">{x.drug_name}</td><td className="p-2 font-mono text-xs">{x.batch_number}</td><td className="p-2">{x.quantity}</td><td className="p-2">{sym}{x.value?.toLocaleString()}</td><td className="p-2">{x.last_sold?.slice(0, 10) ?? "Never"}</td></tr>)}
            {rows("items").length === 0 && <tr><td colSpan={5} className="text-center p-4 text-gray-400">No dead stock. Inventory moving well.</td></tr>}</tbody>
          </table>
        </CardContent></Card>
      )}
    </div>
  );
}
