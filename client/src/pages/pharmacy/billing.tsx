import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

interface BillItem { id: number; drug_name: string; mrp: number; gst_rate: number; qty: number; discount: number; }

export default function PharmacyBillingPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [patient, setPatient] = useState({ name: "", doctor: "", prescription_no: "" });
  const [payment, setPayment] = useState("Cash");

  const { data: medicines = [] } = useQuery({
    queryKey: ["/api/pharmacy/medicines", search],
    queryFn: () => api("GET", "/api/pharmacy/medicines?search=" + encodeURIComponent(search)),
    enabled: search.length > 1
  });

  const settle = useMutation({
    mutationFn: (d: any) => api("POST", "/api/pharmacy/sales", d),
    onSuccess: () => { setBillItems([]); setSearch(""); toast({ title: "Bill settled" }); }
  });

  const addItem = (med: any) => {
    setBillItems(prev => {
      const ex = prev.find(i => i.id === med.id);
      if (ex) return prev.map(i => i.id === med.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...med, qty: 1, discount: 0 }];
    });
    setSearch("");
  };

  const updateItem = (id: number, field: string, val: any) =>
    setBillItems(prev => prev.map(i => i.id === id ? { ...i, [field]: Number(val) } : i));

  const removeItem = (id: number) => setBillItems(prev => prev.filter(i => i.id !== id));

  const subtotal = billItems.reduce((s, i) => s + i.mrp * i.qty * (1 - i.discount / 100), 0);
  const gst = billItems.reduce((s, i) => {
    const taxable = i.mrp * i.qty * (1 - i.discount / 100);
    return s + taxable * (i.gst_rate / 100);
  }, 0);
  const total = subtotal + gst;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Drug Billing POS</h1>

      <div className="grid grid-cols-3 gap-4">
        {[["name","Patient Name"],["doctor","Doctor"],["prescription_no","Prescription No"]].map(([k,l]) => (
          <div key={k}><label className="text-sm font-medium">{l}</label>
            <Input value={(patient as any)[k]} onChange={e => setPatient(p => ({ ...p, [k]: e.target.value }))} /></div>
        ))}
      </div>

      <div className="relative">
        <Input placeholder="Search medicine..." value={search} onChange={e => setSearch(e.target.value)} />
        {medicines.length > 0 && search.length > 1 && (
          <div className="absolute z-10 bg-white border rounded-lg shadow-lg w-full mt-1 max-h-48 overflow-y-auto">
            {medicines.map((m: any) => (
              <div key={m.id} className="p-2 hover:bg-muted cursor-pointer flex justify-between" onClick={() => addItem(m)}>
                <span className="font-medium">{m.drug_name}</span>
                <span className="text-muted-foreground text-sm">MRP: {fmt(m.mrp)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>MRP</TableHead>
            <TableHead>Disc%</TableHead><TableHead>Amount</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {billItems.map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.drug_name}</TableCell>
                <TableCell><Input type="number" value={i.qty} onChange={e => updateItem(i.id, "qty", e.target.value)} className="w-16" /></TableCell>
                <TableCell>{fmt(i.mrp)}</TableCell>
                <TableCell><Input type="number" value={i.discount} onChange={e => updateItem(i.id, "discount", e.target.value)} className="w-16" /></TableCell>
                <TableCell className="font-medium">{fmt(i.mrp * i.qty * (1 - i.discount / 100))}</TableCell>
                <TableCell><Button size="sm" variant="ghost" onClick={() => removeItem(i.id)}>X</Button></TableCell>
              </TableRow>
            ))}
            {billItems.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Add medicines to bill</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      {billItems.length > 0 && (
        <Card><CardContent className="pt-6">
          <div className="flex justify-between max-w-sm ml-auto space-y-1 flex-col">
            <div className="flex justify-between"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            <div className="flex justify-between"><span>GST</span><span>{fmt(gst)}</span></div>
            <div className="flex justify-between font-bold text-lg border-t pt-1"><span>Total</span><span>{fmt(total)}</span></div>
          </div>
          <div className="flex gap-2 mt-4">
            {["Cash","Card","UPI"].map(m => (
              <Button key={m} variant={payment===m?"default":"outline"} onClick={() => setPayment(m)}>{m}</Button>
            ))}
            <Button className="ml-auto" onClick={() => settle.mutate({ ...patient, items: billItems, payment_mode: payment, total })}>Settle Bill</Button>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}
