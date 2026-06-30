import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, IndianRupee, CheckCircle, Clock } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const empty = { bill_number: "", trip_number: "", lr_number: "", party_name: "", freight_amount: "", advance_paid: "", bill_date: "" };

export default function FreightPage() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [paidOpen, setPaidOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [paidAmount, setPaidAmount] = useState("");

  const { data, isLoading, isError } = useQuery({ queryKey: ["logistics-freight"], queryFn: () => api("GET", "/api/logistics/freight") });
  const bills: any[] = Array.isArray(data) ? data : [];

  const addBill = useMutation({
    mutationFn: (body: any) => api("POST", "/api/logistics/freight", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["logistics-freight"] }); setAddOpen(false); setForm(empty); },
  });

  const markPaid = useMutation({
    mutationFn: ({ id, amount }: any) => api("PUT", `/api/logistics/freight/${id}/pay`, { amount }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["logistics-freight"] }); setPaidOpen(false); setPaidAmount(""); },
  });

  const totalBilled = bills.reduce((s, b) => s + (parseFloat(b.freight_amount) || 0), 0);
  const totalCollected = bills.reduce((s, b) => s + (parseFloat(b.advance_paid) || 0), 0);
  const totalPending = totalBilled - totalCollected;

  const statusColor: Record<string, string> = { paid: "outline", partial: "default", pending: "secondary", cancelled: "destructive" };

  function set(k: string, v: string) { setForm((f: any) => ({ ...f, [k]: v })); }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Freight Billing</h1>
        <Button onClick={() => { setForm(empty); setAddOpen(true); }}><Plus className="w-4 h-4 mr-2" />Create Bill</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Billed</CardTitle><IndianRupee className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">₹{totalBilled.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Collected</CardTitle><CheckCircle className="w-4 h-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">₹{totalCollected.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Pending</CardTitle><Clock className="w-4 h-4 text-orange-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-orange-600">₹{totalPending.toLocaleString()}</div></CardContent></Card>
      </div>

      {isLoading && <p className="text-center text-muted-foreground py-8">Loading...</p>}
      {isError && <p className="text-center text-destructive py-8">Failed to load freight bills.</p>}

      {!isLoading && !isError && (
        <Card>
          <Table>
            <TableHeader><TableRow><TableHead>Bill No.</TableHead><TableHead>Trip / LR</TableHead><TableHead>Party</TableHead><TableHead>Freight (₹)</TableHead><TableHead>Advance (₹)</TableHead><TableHead>Balance (₹)</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {bills.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No freight bills found.</TableCell></TableRow>}
              {bills.map((b) => {
                const balance = (parseFloat(b.freight_amount) || 0) - (parseFloat(b.advance_paid) || 0);
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.bill_number}</TableCell>
                    <TableCell>{b.trip_number || b.lr_number}</TableCell>
                    <TableCell>{b.party_name}</TableCell>
                    <TableCell>{b.freight_amount}</TableCell>
                    <TableCell>{b.advance_paid}</TableCell>
                    <TableCell>{balance.toFixed(2)}</TableCell>
                    <TableCell><Badge variant={statusColor[b.status] as any || "secondary"}>{b.status}</Badge></TableCell>
                    <TableCell>{b.bill_date}</TableCell>
                    <TableCell>
                      {b.status !== "paid" && (
                        <Button size="sm" variant="outline" onClick={() => { setSelected(b); setPaidAmount(""); setPaidOpen(true); }}>Mark Paid</Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Freight Bill</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium">Bill Number</label><Input value={form.bill_number} onChange={(e) => set("bill_number", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Bill Date</label><Input type="date" value={form.bill_date} onChange={(e) => set("bill_date", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Trip Number</label><Input value={form.trip_number} onChange={(e) => set("trip_number", e.target.value)} /></div>
            <div><label className="text-sm font-medium">LR Number</label><Input value={form.lr_number} onChange={(e) => set("lr_number", e.target.value)} /></div>
            <div className="col-span-2"><label className="text-sm font-medium">Party Name</label><Input value={form.party_name} onChange={(e) => set("party_name", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Freight Amount (₹)</label><Input type="number" value={form.freight_amount} onChange={(e) => set("freight_amount", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Advance Paid (₹)</label><Input type="number" value={form.advance_paid} onChange={(e) => set("advance_paid", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addBill.mutate(form)} disabled={addBill.isPending}>{addBill.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paidOpen} onOpenChange={setPaidOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Mark Paid — {selected?.bill_number}</DialogTitle></DialogHeader>
          <div><label className="text-sm font-medium">Amount Received (₹)</label><Input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaidOpen(false)}>Cancel</Button>
            <Button onClick={() => markPaid.mutate({ id: selected?.id, amount: paidAmount })} disabled={markPaid.isPending || !paidAmount}>{markPaid.isPending ? "Saving..." : "Confirm"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
