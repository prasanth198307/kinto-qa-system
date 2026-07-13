import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, X, AlertTriangle } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

function expiryBadge(expiry: string) {
  if (!expiry) return null;
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (days < 0) return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
  if (days <= 90) return <Badge className="bg-orange-100 text-orange-800">{days}d left</Badge>;
  return <Badge className="bg-green-100 text-green-800">OK</Badge>;
}

const EMPTY = { drug_id: "", batch_number: "", expiry_date: "", quantity: "", mrp: "", purchase_rate: "", rack_location: "" };

export default function StockPage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  const { data: stock = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/stock"], queryFn: () => api("GET", "/api/pharmacy/stock") });
  const { data: drugs = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/drugs"], queryFn: () => api("GET", "/api/pharmacy/drugs") });
  const { data: alerts = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/stock/expiry-alerts"], queryFn: () => api("GET", "/api/pharmacy/stock/expiry-alerts") });

  const create = useMutation({ mutationFn: (b: any) => api("POST", "/api/pharmacy/stock", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/pharmacy/stock"] }); setShowForm(false); setForm({ ...EMPTY }); } });

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const arr = Array.isArray(stock) ? stock : [];
  const drugArr = Array.isArray(drugs) ? drugs : [];
  const alertArr = Array.isArray(alerts) ? alerts : [];
  const filtered = arr.filter((s: any) => (s.drug_name ?? s.name ?? "").toLowerCase().includes(search.toLowerCase()) || s.batch_number?.toLowerCase().includes(search.toLowerCase()));
  const totalUnits = arr.reduce((s: number, r: any) => s + (r.quantity || 0), 0);
  const lowStock = arr.filter((s: any) => (s.quantity || 0) > 0 && (s.quantity || 0) <= 10).length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stock (Batch-wise)</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />Add Batch</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><Package className="w-8 h-8 text-blue-500" /><div><p className="text-sm text-gray-500">Batches</p><p className="text-2xl font-bold">{arr.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Total Units</p><p className="text-2xl font-bold">{totalUnits}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Expiry Alerts</p><p className="text-2xl font-bold text-red-600">{alertArr.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Low Stock (≤10)</p><p className="text-2xl font-bold text-orange-600">{lowStock}</p></CardContent></Card>
      </div>

      {alertArr.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
          <p className="text-sm text-orange-800">{alertArr.length} batch(es) expiring within 90 days — consider supplier return from the Expiry page.</p>
        </div>
      )}

      <Input placeholder="Search by drug or batch…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Add Stock Batch</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Drug</Label>
              <Select value={form.drug_id} onValueChange={v => f("drug_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select drug" /></SelectTrigger>
                <SelectContent>{drugArr.map((d: any) => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Batch Number</Label><Input value={form.batch_number} onChange={e => f("batch_number", e.target.value)} /></div>
            <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => f("expiry_date", e.target.value)} /></div>
            <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => f("quantity", e.target.value)} /></div>
            <div><Label>MRP (₹)</Label><Input type="number" value={form.mrp} onChange={e => f("mrp", e.target.value)} /></div>
            <div><Label>Purchase Rate (₹)</Label><Input type="number" value={form.purchase_rate} onChange={e => f("purchase_rate", e.target.value)} /></div>
            <div><Label>Rack Location</Label><Input value={form.rack_location} onChange={e => f("rack_location", e.target.value)} placeholder="A-12" /></div>
            <div className="col-span-3 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => create.mutate({ ...form, drug_id: parseInt(form.drug_id), quantity: parseInt(form.quantity), mrp: parseFloat(form.mrp), purchase_rate: parseFloat(form.purchase_rate) })}>Add Batch</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead><tr className="bg-gray-50">{["Drug", "Batch", "Expiry", "Status", "Qty", "MRP", "Rack"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((s: any) => (
              <tr key={s.id} className="border-b hover:bg-gray-50">
                <td className="p-2 font-medium">{s.drug_name ?? s.name}</td>
                <td className="p-2 font-mono text-xs">{s.batch_number}</td>
                <td className="p-2">{s.expiry_date?.slice(0, 10)}</td>
                <td className="p-2">{expiryBadge(s.expiry_date)}</td>
                <td className="p-2">{s.quantity}</td>
                <td className="p-2">{sym}{s.mrp}</td>
                <td className="p-2">{s.rack_location}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8">No stock batches found.</p>}
      </div>
    </div>
  );
}
