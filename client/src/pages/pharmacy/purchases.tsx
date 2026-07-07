import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Plus, X, Trash2 } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

type Line = { drug_id: string; batch_number: string; expiry_date: string; quantity: string; purchase_rate: string; mrp: string };

export default function PurchasesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [header, setHeader] = useState({ supplier_name: "", invoice_number: "", purchase_date: new Date().toISOString().slice(0, 10), gst_amount: "0" });
  const [lines, setLines] = useState<Line[]>([{ drug_id: "", batch_number: "", expiry_date: "", quantity: "", purchase_rate: "", mrp: "" }]);

  const { data: purchases = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/purchases"], queryFn: () => api("GET", "/api/pharmacy/purchases") });
  const { data: drugs = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/drugs"], queryFn: () => api("GET", "/api/pharmacy/drugs") });

  const create = useMutation({
    mutationFn: (b: any) => api("POST", "/api/pharmacy/purchases", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/pharmacy/purchases"] }); qc.invalidateQueries({ queryKey: ["/api/pharmacy/stock"] }); setShowForm(false); setLines([{ drug_id: "", batch_number: "", expiry_date: "", quantity: "", purchase_rate: "", mrp: "" }]); },
  });

  const arr = Array.isArray(purchases) ? purchases : [];
  const drugArr = Array.isArray(drugs) ? drugs : [];

  const setLine = (i: number, k: keyof Line, v: string) => setLines(p => p.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  const subtotal = lines.reduce((s, l) => s + parseFloat(l.purchase_rate || "0") * parseFloat(l.quantity || "0"), 0);
  const total = subtotal + parseFloat(header.gst_amount || "0");

  const save = () => create.mutate({
    ...header,
    purchase_amount: parseFloat(subtotal.toFixed(2)),
    gst_amount: parseFloat(header.gst_amount || "0"),
    total_amount: parseFloat(total.toFixed(2)),
    items: lines.filter(l => l.drug_id).map(l => ({ drug_id: parseInt(l.drug_id), batch_number: l.batch_number, expiry_date: l.expiry_date, quantity: parseInt(l.quantity), purchase_rate: parseFloat(l.purchase_rate), mrp: parseFloat(l.mrp) })),
  });

  const monthTotal = arr.filter((p: any) => p.purchase_date?.slice(0, 7) === new Date().toISOString().slice(0, 7)).reduce((s: number, r: any) => s + (parseFloat(r.total_amount) || 0), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Purchases</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />New Purchase</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><ShoppingCart className="w-8 h-8 text-blue-500" /><div><p className="text-sm text-gray-500">Total Purchases</p><p className="text-2xl font-bold">{arr.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">This Month</p><p className="text-2xl font-bold">₹{monthTotal.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Suppliers</p><p className="text-2xl font-bold">{new Set(arr.map((p: any) => p.supplier_name)).size}</p></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">New Purchase (GRN)</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <div><Label>Supplier / Distributor</Label><Input value={header.supplier_name} onChange={e => setHeader(p => ({ ...p, supplier_name: e.target.value }))} /></div>
              <div><Label>Invoice No</Label><Input value={header.invoice_number} onChange={e => setHeader(p => ({ ...p, invoice_number: e.target.value }))} /></div>
              <div><Label>Date</Label><Input type="date" value={header.purchase_date} onChange={e => setHeader(p => ({ ...p, purchase_date: e.target.value }))} /></div>
              <div><Label>GST Amount (₹)</Label><Input type="number" value={header.gst_amount} onChange={e => setHeader(p => ({ ...p, gst_amount: e.target.value }))} /></div>
            </div>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-7 gap-2 items-end">
                <div><Label className="text-xs">Drug</Label>
                  <Select value={l.drug_id} onValueChange={v => setLine(i, "drug_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{drugArr.map((d: any) => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Batch</Label><Input value={l.batch_number} onChange={e => setLine(i, "batch_number", e.target.value)} /></div>
                <div><Label className="text-xs">Expiry</Label><Input type="date" value={l.expiry_date} onChange={e => setLine(i, "expiry_date", e.target.value)} /></div>
                <div><Label className="text-xs">Qty</Label><Input type="number" value={l.quantity} onChange={e => setLine(i, "quantity", e.target.value)} /></div>
                <div><Label className="text-xs">Rate (₹)</Label><Input type="number" value={l.purchase_rate} onChange={e => setLine(i, "purchase_rate", e.target.value)} /></div>
                <div><Label className="text-xs">MRP (₹)</Label><Input type="number" value={l.mrp} onChange={e => setLine(i, "mrp", e.target.value)} /></div>
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setLines(p => p.filter((_, idx) => idx !== i))}><Trash2 className="w-3 h-3" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setLines(p => [...p, { drug_id: "", batch_number: "", expiry_date: "", quantity: "", purchase_rate: "", mrp: "" }])}><Plus className="w-3 h-3 mr-1" />Add Line</Button>
            <div className="flex justify-between items-end border-t pt-3">
              <p className="text-xs text-gray-500">GL: DR Pharmacy COGS · CR Accounts Payable (auto)</p>
              <div className="text-right">
                <p className="text-xl font-bold">Total: ₹{total.toFixed(2)}</p>
                <Button className="mt-1" onClick={save}>Save Purchase</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {arr.map((p: any) => (
          <Card key={p.id}>
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">{p.invoice_number} — {p.supplier_name}</p>
                <p className="text-sm text-gray-500">{p.purchase_date?.slice(0, 10)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">₹{parseFloat(p.total_amount || 0).toLocaleString()}</p>
                <Badge className="bg-blue-100 text-blue-800">GST ₹{parseFloat(p.gst_amount || 0).toLocaleString()}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {arr.length === 0 && <p className="text-center text-gray-400 py-8">No purchases yet.</p>}
      </div>
    </div>
  );
}
