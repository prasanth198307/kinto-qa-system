import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, Plus, X, Trash2 } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

type Item = { drug_id: string; quantity: string; rate: string; gst_rate: string };

export default function BillingPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [header, setHeader] = useState({ patient_name: "", patient_phone: "", doctor_name: "", prescription_no: "", payment_mode: "cash", discount: "0" });
  const [items, setItems] = useState<Item[]>([{ drug_id: "", quantity: "1", rate: "", gst_rate: "12" }]);

  const { data: sales = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/sales"], queryFn: () => api("GET", "/api/pharmacy/sales") });
  const { data: drugs = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/drugs"], queryFn: () => api("GET", "/api/pharmacy/drugs") });

  const create = useMutation({
    mutationFn: (b: any) => api("POST", "/api/pharmacy/sales", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/pharmacy/sales"] }); setShowForm(false); setItems([{ drug_id: "", quantity: "1", rate: "", gst_rate: "12" }]); setHeader({ patient_name: "", patient_phone: "", doctor_name: "", prescription_no: "", payment_mode: "cash", discount: "0" }); },
  });

  const arr = Array.isArray(sales) ? sales : [];
  const drugArr = Array.isArray(drugs) ? drugs : [];

  const setItem = (i: number, k: keyof Item, v: string) => setItems(p => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const lineAmount = (it: Item) => { const base = parseFloat(it.rate || "0") * parseFloat(it.quantity || "0"); return base + (base * parseFloat(it.gst_rate || "0")) / 100; };
  const total = items.reduce((s, it) => s + lineAmount(it), 0);
  const net = total - parseFloat(header.discount || "0");

  const save = () => create.mutate({
    ...header,
    discount: parseFloat(header.discount || "0"),
    total_amount: parseFloat(total.toFixed(2)),
    paid_amount: parseFloat(net.toFixed(2)),
    sale_date: new Date().toISOString().slice(0, 10),
    items: items.filter(it => it.drug_id).map(it => ({ drug_id: parseInt(it.drug_id), quantity: parseInt(it.quantity), rate: parseFloat(it.rate), gst_rate: parseFloat(it.gst_rate), amount: parseFloat(lineAmount(it).toFixed(2)) })),
  });

  const todayTotal = arr.filter((s: any) => s.sale_date?.slice(0, 10) === new Date().toISOString().slice(0, 10)).reduce((s: number, r: any) => s + (parseFloat(r.total_amount) || 0), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pharmacy Billing</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />New Bill</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Total Bills</p><p className="text-2xl font-bold">{arr.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Today's Sales</p><p className="text-2xl font-bold text-green-600">₹{todayTotal.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Credit Balances</p><p className="text-2xl font-bold text-orange-600">₹{arr.reduce((s: number, r: any) => s + (parseFloat(r.balance_amount) || 0), 0).toLocaleString()}</p></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">New Sale</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <div><Label>Patient Name</Label><Input value={header.patient_name} onChange={e => setHeader(p => ({ ...p, patient_name: e.target.value }))} /></div>
              <div><Label>Phone</Label><Input value={header.patient_phone} onChange={e => setHeader(p => ({ ...p, patient_phone: e.target.value }))} /></div>
              <div><Label>Doctor</Label><Input value={header.doctor_name} onChange={e => setHeader(p => ({ ...p, doctor_name: e.target.value }))} /></div>
              <div><Label>Rx No</Label><Input value={header.prescription_no} onChange={e => setHeader(p => ({ ...p, prescription_no: e.target.value }))} placeholder="Required for Schedule H/X" /></div>
            </div>
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 items-end">
                <div><Label className="text-xs">Drug</Label>
                  <Select value={it.drug_id} onValueChange={v => { setItem(i, "drug_id", v); const d = drugArr.find((x: any) => x.id.toString() === v); if (d) { setItem(i, "rate", (d.mrp ?? "").toString()); setItem(i, "gst_rate", (d.gst_rate ?? 12).toString()); } }}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{drugArr.map((d: any) => <SelectItem key={d.id} value={d.id.toString()}>{d.name} {d.schedule && d.schedule !== "OTC" ? `(Sch ${d.schedule})` : ""}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Qty</Label><Input type="number" value={it.quantity} onChange={e => setItem(i, "quantity", e.target.value)} /></div>
                <div><Label className="text-xs">Rate (₹)</Label><Input type="number" value={it.rate} onChange={e => setItem(i, "rate", e.target.value)} /></div>
                <div><Label className="text-xs">GST %</Label><Input type="number" value={it.gst_rate} onChange={e => setItem(i, "gst_rate", e.target.value)} /></div>
                <div className="flex gap-1 items-center">
                  <span className="text-sm font-medium w-20">₹{lineAmount(it).toFixed(2)}</span>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setItems(p => p.filter((_, idx) => idx !== i))}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setItems(p => [...p, { drug_id: "", quantity: "1", rate: "", gst_rate: "12" }])}><Plus className="w-3 h-3 mr-1" />Add Item</Button>
            <div className="flex items-end justify-between border-t pt-3">
              <div className="flex gap-3 items-end">
                <div><Label className="text-xs">Discount (₹)</Label><Input type="number" className="w-24" value={header.discount} onChange={e => setHeader(p => ({ ...p, discount: e.target.value }))} /></div>
                <div><Label className="text-xs">Payment Mode</Label>
                  <Select value={header.payment_mode} onValueChange={v => setHeader(p => ({ ...p, payment_mode: v }))}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>{["cash", "upi", "card", "credit"].map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">Net: ₹{net.toFixed(2)}</p>
                <p className="text-xs text-gray-500">GL: DR Cash/AR · CR Drug Sales + GST (auto)</p>
                <Button className="mt-1" onClick={save}>Save & Post GL</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {arr.map((s: any) => (
          <Card key={s.id}>
            <CardContent className="pt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-semibold">{s.bill_number}</p>
                  <p className="text-sm text-gray-600">{s.patient_name} · Dr. {s.doctor_name ?? "—"} · {s.sale_date?.slice(0, 10)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">₹{parseFloat(s.total_amount || 0).toLocaleString()}</p>
                <Badge className={parseFloat(s.balance_amount || 0) > 0 ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"}>{parseFloat(s.balance_amount || 0) > 0 ? `Balance ₹${s.balance_amount}` : "Paid"}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {arr.length === 0 && <p className="text-center text-gray-400 py-8">No bills yet.</p>}
      </div>
    </div>
  );
}
