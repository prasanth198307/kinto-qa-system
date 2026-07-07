import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Wallet } from "lucide-react";

const api = (m: string, p: string, b?: any) =>
  fetch(p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());

const fmt = (n: any) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const today = new Date().toISOString().slice(0, 10);
const BLANK = { collection_date: today, agent_name: "", member_id: "", deposit_id: "", loan_id: "", collection_type: "emi", amount: "", payment_mode: "cash", receipt_number: "", notes: "" };

export default function NidhiDailyCollectionPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(BLANK);
  const [filterDate, setFilterDate] = useState(today);
  const [filterAgent, setFilterAgent] = useState("");

  const { data: collections = [] } = useQuery<any[]>({
    queryKey: ["nidhi-daily-collection", filterDate, filterAgent],
    queryFn: () => api("GET", `/api/nidhi/daily-collection?date=${filterDate}${filterAgent ? `&agent_name=${encodeURIComponent(filterAgent)}` : ""}`),
  });

  const createMut = useMutation({
    mutationFn: (p: any) => api("POST", "/api/nidhi/daily-collection", p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nidhi-daily-collection"] }); setOpen(false); setForm(BLANK); toast({ title: "Collection recorded" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const f = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  const totalCollected = collections.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
  const byType: Record<string, number> = {};
  collections.forEach((c: any) => { byType[c.collection_type] = (byType[c.collection_type] || 0) + Number(c.amount || 0); });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Daily Collection</h1>
        <Button size="sm" onClick={() => { setForm(BLANK); setOpen(true); }}><Plus className="w-4 h-4 mr-1" />Record Collection</Button>
      </div>

      <div className="flex gap-3 items-end">
        <div><Label className="text-xs">Date</Label><Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="h-8 text-sm w-40" /></div>
        <div><Label className="text-xs">Agent</Label><Input value={filterAgent} onChange={e => setFilterAgent(e.target.value)} placeholder="Filter by agent..." className="h-8 text-sm w-40" /></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3">
          <div className="flex items-center gap-2"><Wallet className="w-4 h-4 text-green-600" /><span className="text-xs text-muted-foreground">Total Collected</span></div>
          <div className="text-xl font-bold">{fmt(totalCollected)}</div>
          <div className="text-xs text-muted-foreground">{collections.length} transactions</div>
        </CardContent></Card>
        {Object.entries(byType).map(([type, amt]) => (
          <Card key={type}><CardContent className="p-3">
            <div className="text-xs text-muted-foreground uppercase">{type}</div>
            <div className="text-lg font-bold">{fmt(amt)}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Agent</TableHead><TableHead>Member</TableHead>
            <TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Mode</TableHead><TableHead>Receipt</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {collections.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell>{c.collection_date}</TableCell>
                <TableCell>{c.agent_name || "—"}</TableCell>
                <TableCell>{c.member_name || `#${c.member_id}`}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs uppercase">{c.collection_type}</Badge></TableCell>
                <TableCell className="font-semibold">{fmt(c.amount)}</TableCell>
                <TableCell className="text-sm uppercase">{c.payment_mode}</TableCell>
                <TableCell className="text-sm">{c.receipt_number || "—"}</TableCell>
              </TableRow>
            ))}
            {!collections.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No collections for this date</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Collection</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Date</Label><Input type="date" value={form.collection_date} onChange={e => f("collection_date", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Agent Name</Label><Input value={form.agent_name} onChange={e => f("agent_name", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Member ID</Label><Input value={form.member_id} onChange={e => f("member_id", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Collection Type</Label>
              <Select value={form.collection_type} onValueChange={v => f("collection_type", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{["emi","rd_installment","savings_deposit","misc"].map(t => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label className="text-xs">Loan ID (if EMI)</Label><Input value={form.loan_id} onChange={e => f("loan_id", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Deposit ID (if RD)</Label><Input value={form.deposit_id} onChange={e => f("deposit_id", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Amount (₹)</Label><Input type="number" value={form.amount} onChange={e => f("amount", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Payment Mode</Label>
              <Select value={form.payment_mode} onValueChange={v => f("payment_mode", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{["cash","cheque","neft","upi"].map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label className="text-xs">Receipt No.</Label><Input value={form.receipt_number} onChange={e => f("receipt_number", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Notes</Label><Input value={form.notes} onChange={e => f("notes", e.target.value)} className="h-8 text-sm" /></div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={createMut.isPending}>Record</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
