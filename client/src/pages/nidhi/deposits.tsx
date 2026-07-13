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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (m: string, p: string, b?: any) =>
  fetch(p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());

const fmt = (n: any) => `${sym}${Number(n || 0).toLocaleString("en-IN")}`;
const TYPES = ["savings", "fd", "rd", "mis", "pigmy"];
const STATUS_BADGE: Record<string, any> = { active: "default", closed: "secondary", premature_closed: "destructive" };
const BLANK = { member_id: "", deposit_type: "savings", principal_amount: "", interest_rate: "", tenure_months: "", opening_date: new Date().toISOString().slice(0, 10), interest_payout: "on_maturity", monthly_installment: "", payment_mode: "cash", nominee_name: "" };

export default function NidhiDepositsPage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(BLANK);
  const [tab, setTab] = useState("all");
  const [detail, setDetail] = useState<any>(null);

  const { data: deposits = [] } = useQuery<any[]>({
    queryKey: ["nidhi-deposits", tab],
    queryFn: () => api("GET", `/api/nidhi/deposits${tab !== "all" ? `?deposit_type=${tab}` : ""}`),
  });
  const { data: maturing = [] } = useQuery<any[]>({
    queryKey: ["nidhi-deposits-maturing"],
    queryFn: () => api("GET", "/api/nidhi/deposits/maturing?days=30"),
  });
  const { data: accrual = [] } = useQuery<any[]>({
    queryKey: ["nidhi-interest-accrual"],
    queryFn: () => api("GET", "/api/nidhi/deposits/interest-accrual"),
  });

  const createMut = useMutation({
    mutationFn: (p: any) => api("POST", "/api/nidhi/deposits", p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nidhi-deposits"] }); setOpen(false); setForm(BLANK); toast({ title: "Deposit account opened" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const creditMut = useMutation({
    mutationFn: ({ id, amount, payment_mode }: any) => api("POST", `/api/nidhi/deposits/${id}/credit`, { amount, payment_mode }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nidhi-deposits"] }); toast({ title: "Credited" }); },
  });

  const f = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Deposits</h1>
        <Button size="sm" onClick={() => { setForm(BLANK); setOpen(true); }}><Plus className="w-4 h-4 mr-1" />Open Account</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {accrual.map((a: any) => (
          <Card key={a.deposit_type}><CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase">{a.deposit_type}</div>
            <div className="text-lg font-bold">{fmt(a.total_principal)}</div>
            <div className="text-xs text-muted-foreground">{a.count} accounts · {fmt(a.total_accrued)} accrued</div>
          </CardContent></Card>
        ))}
      </div>

      {maturing.length > 0 && (
        <Card className="border-amber-300 bg-amber-50"><CardHeader className="pb-2"><CardTitle className="text-sm text-amber-700">⚠ {maturing.length} deposits maturing in 30 days</CardTitle></CardHeader></Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>{["all", ...TYPES].map(t => <TabsTrigger key={t} value={t}>{t === "all" ? "All" : t.toUpperCase()}</TabsTrigger>)}</TabsList>
        <TabsContent value={tab}>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Account No.</TableHead><TableHead>Member</TableHead><TableHead>Type</TableHead>
                <TableHead>Principal</TableHead><TableHead>Balance</TableHead><TableHead>Rate %</TableHead>
                <TableHead>Maturity</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {deposits.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-sm">{d.account_number}</TableCell>
                    <TableCell>{d.member_name}</TableCell>
                    <TableCell className="uppercase text-xs">{d.deposit_type}</TableCell>
                    <TableCell>{fmt(d.principal_amount)}</TableCell>
                    <TableCell className="font-semibold">{fmt(d.current_balance)}</TableCell>
                    <TableCell>{d.interest_rate}%</TableCell>
                    <TableCell className="text-sm">{d.maturity_date || "—"}</TableCell>
                    <TableCell><Badge variant={STATUS_BADGE[d.status] ?? "secondary"}>{d.status}</Badge></TableCell>
                    <TableCell>
                      {d.status === "active" && d.deposit_type === "savings" && (
                        <Button size="sm" variant="outline" onClick={() => { const amt = prompt("Credit amount?"); if (amt) creditMut.mutate({ id: d.id, amount: Number(amt), payment_mode: "cash" }); }}>Credit</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!deposits.length && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No deposits</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Open Deposit Account</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label className="text-xs">Member ID</Label><Input value={form.member_id} onChange={e => f("member_id", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Type</Label>
              <Select value={form.deposit_type} onValueChange={v => f("deposit_type", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label className="text-xs">Principal (₹)</Label><Input type="number" value={form.principal_amount} onChange={e => f("principal_amount", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Interest Rate %</Label><Input type="number" step="0.1" value={form.interest_rate} onChange={e => f("interest_rate", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Tenure (months)</Label><Input type="number" value={form.tenure_months} onChange={e => f("tenure_months", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Opening Date</Label><Input type="date" value={form.opening_date} onChange={e => f("opening_date", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Payment Mode</Label>
              <Select value={form.payment_mode} onValueChange={v => f("payment_mode", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{["cash","cheque","neft","upi"].map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label className="text-xs">Nominee</Label><Input value={form.nominee_name} onChange={e => f("nominee_name", e.target.value)} className="h-8 text-sm" /></div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={createMut.isPending}>Open Account</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
