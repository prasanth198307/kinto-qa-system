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

interface LineItem { medicine: string; batch: string; qty: string; rate: string; mrp: string; expiry: string; }

export default function PharmacyPurchasesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ supplier_name: "", invoice_no: "", invoice_date: "" });
  const [items, setItems] = useState<LineItem[]>([{ medicine: "", batch: "", qty: "", rate: "", mrp: "", expiry: "" }]);

  const { data: purchases = [] } = useQuery({ queryKey: ["/api/pharmacy/purchases"], queryFn: () => api("GET", "/api/pharmacy/purchases") });

  const add = useMutation({
    mutationFn: (d: any) => api("POST", "/api/pharmacy/purchases", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/pharmacy/purchases"] }); setShowForm(false); setItems([{ medicine: "", batch: "", qty: "", rate: "", mrp: "", expiry: "" }]); toast({ title: "Purchase recorded" }); }
  });

  const updateItem = (i: number, k: keyof LineItem, v: string) => setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [k]: v } : item));
  const addRow = () => setItems(prev => [...prev, { medicine: "", batch: "", qty: "", rate: "", mrp: "", expiry: "" }]);
  const removeRow = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Purchase Management</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ New Purchase</Button>
      </div>

      {showForm && (
        <Card><CardHeader><CardTitle>New Purchase Order</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[["supplier_name","Supplier"],["invoice_no","Invoice No"],["invoice_date","Invoice Date","date"]].map(([k,l,t]) => (
                <div key={k as string}><label className="text-sm font-medium">{l as string}</label>
                  <Input value={(form as any)[k as string]} onChange={e => setForm(p => ({ ...p, [k as string]: e.target.value }))} type={(t as string)||"text"} /></div>
              ))}
            </div>
            <div>
              <div className="flex justify-between items-center mb-2"><h3 className="font-medium">Line Items</h3><Button size="sm" variant="outline" onClick={addRow}>+ Row</Button></div>
              <Table>
                <TableHeader><TableRow><TableHead>Medicine</TableHead><TableHead>Batch</TableHead><TableHead>Qty</TableHead><TableHead>Rate</TableHead><TableHead>MRP</TableHead><TableHead>Expiry</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {items.map((item, i) => (
                    <TableRow key={i}>
                      {(["medicine","batch","qty","rate","mrp"] as (keyof LineItem)[]).map(k => (
                        <TableCell key={k}><Input value={item[k]} onChange={e => updateItem(i, k, e.target.value)} className="w-24" /></TableCell>
                      ))}
                      <TableCell><Input type="date" value={item.expiry} onChange={e => updateItem(i, "expiry", e.target.value)} className="w-32" /></TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => removeRow(i)}>X</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => add.mutate({ ...form, items })}>Save Purchase</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent></Card>
      )}

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>PO No</TableHead><TableHead>Supplier</TableHead><TableHead>Date</TableHead>
            <TableHead>Items</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {purchases.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono">{p.po_no}</TableCell>
                <TableCell className="font-medium">{p.supplier_name}</TableCell>
                <TableCell>{p.invoice_date ? new Date(p.invoice_date).toLocaleDateString() : "—"}</TableCell>
                <TableCell>{p.items_count}</TableCell>
                <TableCell className="text-right">{fmt(p.total)}</TableCell>
                <TableCell><Badge variant="secondary">{p.status||"received"}</Badge></TableCell>
              </TableRow>
            ))}
            {purchases.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No purchases</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
