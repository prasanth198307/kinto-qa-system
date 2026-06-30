import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, CreditCard, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

export default function FolioPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [charge, setCharge] = useState({ item_type: "room_charge", description: "", quantity: 1, unit_price: 0 });
  const [payment, setPayment] = useState({ amount: 0, payment_mode: "cash" });

  const { data: folios = [] } = useQuery({ queryKey: ["hotel-folios"], queryFn: () => api("GET", "/api/hotel/folios") });
  const { data: folio } = useQuery({ queryKey: ["hotel-folio", selectedId], queryFn: () => api("GET", `/api/hotel/folios/${selectedId}`), enabled: !!selectedId });

  const addCharge = useMutation({
    mutationFn: (d: typeof charge) => api("POST", `/api/hotel/folios/${selectedId}/charges`, { ...d, amount: d.quantity * d.unit_price }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hotel-folio", selectedId] }); setChargeOpen(false); setCharge({ item_type: "room_charge", description: "", quantity: 1, unit_price: 0 }); }
  });

  const addPayment = useMutation({
    mutationFn: (d: typeof payment) => api("POST", `/api/hotel/folios/${selectedId}/payments`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hotel-folio", selectedId] }); setPayOpen(false); setPayment({ amount: 0, payment_mode: "cash" }); }
  });

  const closeFolio = useMutation({
    mutationFn: () => api("PUT", `/api/hotel/folios/${selectedId}/close`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hotel-folios"] }); qc.invalidateQueries({ queryKey: ["hotel-folio", selectedId] }); }
  });

  const filtered = folios.filter((f: any) =>
    !search || f.folio_number?.toLowerCase().includes(search.toLowerCase()) || f.guest_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handlePrint = () => { const w = window.open("", "_blank"); w?.document.write(`<html><body>${document.getElementById("folio-print")?.innerHTML}</body></html>`); w?.print(); };

  const statusColor: Record<string, string> = { open: "bg-green-100 text-green-800", closed: "bg-gray-100 text-gray-800", disputed: "bg-red-100 text-red-800" };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Guest Folios</h1>
        <div className="flex gap-2 items-center">
          <Search className="text-gray-400" size={18} />
          <Input placeholder="Search by guest or folio #..." value={search} onChange={e => setSearch(e.target.value)} className="w-72" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2 col-span-1">
          {filtered.map((f: any) => (
            <Card key={f.id} className={`cursor-pointer border-2 ${selectedId === f.id ? "border-blue-500" : "border-transparent"}`} onClick={() => setSelectedId(f.id)}>
              <CardContent className="p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{f.folio_number}</p>
                    <p className="text-xs text-gray-500">{f.guest_name}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[f.status]}`}>{f.status}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Balance: ₹{Number(f.balance || 0).toFixed(2)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {folio && (
          <div className="col-span-2 space-y-4" id="folio-print">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{folio.folio_number}</CardTitle>
                    <p className="text-sm text-gray-500">{folio.guest_name} | Room {folio.room_number}</p>
                    <p className="text-xs text-gray-400">{folio.check_in_date} → {folio.check_out_date}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handlePrint}><Printer size={14} className="mr-1" />Print</Button>
                    <Button size="sm" onClick={() => setChargeOpen(true)} disabled={folio.status !== "open"}><Plus size={14} className="mr-1" />Add Charge</Button>
                    <Button size="sm" variant="secondary" onClick={() => setPayOpen(true)} disabled={folio.status !== "open"}><CreditCard size={14} className="mr-1" />Settle</Button>
                    <Button size="sm" variant="destructive" onClick={() => closeFolio.mutate()} disabled={folio.status !== "open"}><X size={14} className="mr-1" />Close</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Tax</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(folio.items || []).map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs">{item.charge_date}</TableCell>
                        <TableCell className="text-sm">{item.description}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{item.item_type}</Badge></TableCell>
                        <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                        <TableCell className="text-right text-sm">₹{Number(item.amount || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-sm">₹{Number(item.tax_amount || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 border-t pt-3 space-y-1 text-sm text-right">
                  <div className="flex justify-between"><span className="text-gray-500">Total Charges</span><span>₹{Number(folio.total_charges || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Payments Received</span><span className="text-green-600">-₹{Number(folio.total_payments || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-base border-t pt-2"><span>Balance Due</span><span className={Number(folio.balance) > 0 ? "text-red-600" : "text-green-600"}>₹{Number(folio.balance || 0).toFixed(2)}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Charge</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Item Type</Label>
              <Select value={charge.item_type} onValueChange={v => setCharge(p => ({ ...p, item_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["room_charge","restaurant","laundry","minibar","service","tax","discount"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Input value={charge.description} onChange={e => setCharge(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Quantity</Label><Input type="number" value={charge.quantity} onChange={e => setCharge(p => ({ ...p, quantity: Number(e.target.value) }))} /></div>
              <div><Label>Unit Price</Label><Input type="number" value={charge.unit_price} onChange={e => setCharge(p => ({ ...p, unit_price: Number(e.target.value) }))} /></div>
            </div>
            <p className="text-sm text-gray-500">Amount: ₹{(charge.quantity * charge.unit_price).toFixed(2)}</p>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setChargeOpen(false)}>Cancel</Button><Button onClick={() => addCharge.mutate(charge)} disabled={addCharge.isPending}>Add Charge</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Settle Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Amount (₹)</Label><Input type="number" value={payment.amount} onChange={e => setPayment(p => ({ ...p, amount: Number(e.target.value) }))} /></div>
            <div><Label>Payment Mode</Label>
              <Select value={payment.payment_mode} onValueChange={v => setPayment(p => ({ ...p, payment_mode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["cash","card","upi","transfer"].map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button><Button onClick={() => addPayment.mutate(payment)} disabled={addPayment.isPending}>Record Payment</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
