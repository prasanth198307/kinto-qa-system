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
import { Plus, Landmark, Lock, Unlock, PiggyBank } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (m: string, p: string, b?: any) =>
  fetch(p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());
const fmt = (n: any) => `${sym}${Number(n || 0).toLocaleString("en-IN")}`;
const today = new Date().toISOString().slice(0, 10);

const TYPE_META: Record<string, { icon: any; label: string; cls: string }> = {
  restricted: { icon: Lock, label: "Restricted", cls: "text-amber-600" },
  unrestricted: { icon: Unlock, label: "Unrestricted", cls: "text-green-600" },
  endowment: { icon: PiggyBank, label: "Endowment", cls: "text-blue-600" },
};

export default function NGOFundsPage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [txnOpen, setTxnOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ name: "", type: "restricted", purpose: "" });
  const [txn, setTxn] = useState({ type: "income", amount: "", description: "", date: today, reference: "" });

  const { data: funds = [] } = useQuery<any[]>({ queryKey: ["ngo-funds"], queryFn: () => api("GET", "/api/ngo/funds") });
  const { data: balance } = useQuery<any>({
    queryKey: ["ngo-fund-balance", selected?.id],
    queryFn: () => api("GET", `/api/ngo/funds/${selected.id}/balance`),
    enabled: !!selected,
  });

  const createMut = useMutation({
    mutationFn: (p: any) => api("POST", "/api/ngo/funds", p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ngo-funds"] }); setOpen(false); setForm({ name: "", type: "restricted", purpose: "" }); toast({ title: "Fund created" }); },
  });
  const txnMut = useMutation({
    mutationFn: (p: any) => api("POST", `/api/ngo/funds/${selected.id}/transaction`, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ngo-fund-balance", selected?.id] });
      setTxnOpen(false); setTxn({ type: "income", amount: "", description: "", date: today, reference: "" });
      toast({ title: "Transaction recorded" });
    },
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Landmark className="w-6 h-6 text-blue-600" /><h1 className="text-2xl font-bold">Fund Accounting</h1></div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />New Fund</Button>
      </div>
      <p className="text-sm text-muted-foreground">Track restricted vs unrestricted funds separately — required for FCRA and grant compliance.</p>

      <div className="grid md:grid-cols-3 gap-4">
        {funds.map((f: any) => {
          const meta = TYPE_META[f.type] || TYPE_META.unrestricted;
          const Icon = meta.icon;
          return (
            <Card key={f.id} className={selected?.id === f.id ? "border-primary" : "cursor-pointer"} onClick={() => setSelected(f)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2"><Icon className={`w-4 h-4 ${meta.cls}`} /><span className="font-semibold">{f.name}</span></div>
                  <Badge variant="outline" className="text-xs">{meta.label}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{f.purpose || "—"}</div>
              </CardContent>
            </Card>
          );
        })}
        {!funds.length && <div className="col-span-3 text-center py-10 text-muted-foreground">No funds yet. Create a Restricted fund for each grant/FCRA purpose and one Unrestricted general fund.</div>}
      </div>

      {selected && balance && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{selected.name} — Balance</CardTitle>
            <Button size="sm" onClick={() => setTxnOpen(true)}><Plus className="w-4 h-4 mr-1" />Record Transaction</Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Income</div><div className="text-xl font-bold text-green-600">{fmt(balance.income)}</div></div>
              <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Expenditure</div><div className="text-xl font-bold text-red-600">{fmt(balance.expenditure)}</div></div>
              <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Balance</div><div className={`text-xl font-bold ${balance.balance < 0 ? "text-red-600" : ""}`}>{fmt(balance.balance)}</div></div>
            </div>
            {selected.type === "restricted" && balance.balance < 0 && (
              <div className="mt-3 text-sm text-red-600 font-medium">⚠ Restricted fund overspent — utilization exceeds receipts. Review before audit.</div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Fund</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Fund Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. FCRA Education Fund" /></div>
            <div><Label className="text-xs">Type</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="restricted">Restricted (donor/grant specified purpose)</SelectItem>
                  <SelectItem value="unrestricted">Unrestricted (general use)</SelectItem>
                  <SelectItem value="endowment">Endowment (corpus)</SelectItem>
                </SelectContent>
              </Select></div>
            <div><Label className="text-xs">Purpose</Label><Input value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.name}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={txnOpen} onOpenChange={setTxnOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Transaction — {selected?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Type</Label>
                <Select value={txn.type} onValueChange={v => setTxn(p => ({ ...p, type: v }))}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expense</SelectItem></SelectContent>
                </Select></div>
              <div><Label className="text-xs">Amount (₹)</Label><Input type="number" value={txn.amount} onChange={e => setTxn(p => ({ ...p, amount: e.target.value }))} className="h-8" /></div>
            </div>
            <div><Label className="text-xs">Description</Label><Input value={txn.description} onChange={e => setTxn(p => ({ ...p, description: e.target.value }))} className="h-8" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Date</Label><Input type="date" value={txn.date} onChange={e => setTxn(p => ({ ...p, date: e.target.value }))} className="h-8" /></div>
              <div><Label className="text-xs">Reference</Label><Input value={txn.reference} onChange={e => setTxn(p => ({ ...p, reference: e.target.value }))} className="h-8" /></div>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setTxnOpen(false)}>Cancel</Button>
            <Button onClick={() => txnMut.mutate(txn)} disabled={txnMut.isPending || !txn.amount}>Record</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
