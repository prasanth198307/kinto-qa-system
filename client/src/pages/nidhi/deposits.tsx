import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PlusCircle, RefreshCw, X } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const statusColor: Record<string, string> = { active: "default", closed: "secondary", matured: "outline", premature_closed: "destructive" };
const typeColor: Record<string, string> = { FD: "default", RD: "secondary", Savings: "outline", Recurring: "secondary" };

function fmt(n: number) { return "₹" + n?.toLocaleString("en-IN"); }

export default function DepositsPage() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [collectId, setCollectId] = useState<number | null>(null);
  const [closeId, setCloseId] = useState<number | null>(null);

  const [form, setForm] = useState<any>({ account_number: "", deposit_type: "FD", principal_amount: "", interest_rate: "", tenure_months: "", opening_date: "", interest_payout: "on_maturity", nominee_name: "", auto_renew: false, member_id: "" });
  const [collectForm, setCollectForm] = useState<any>({ amount: "", payment_mode: "cash", reference_number: "", collection_date: "" });
  const [closeForm, setCloseForm] = useState<any>({ closure_type: "maturity", payment_mode: "cash" });

  const { data: stats } = useQuery({ queryKey: ["deposit-stats"], queryFn: () => api("GET", "/api/nidhi-company/deposits/stats") });
  const { data: deposits = [] } = useQuery({ queryKey: ["deposits"], queryFn: () => api("GET", "/api/nidhi-company/deposits") });
  const { data: maturing = [] } = useQuery({ queryKey: ["deposits-maturing"], queryFn: () => api("GET", "/api/nidhi-company/deposits/maturing-soon?days=30") });

  const createDeposit = useMutation({ mutationFn: (d: any) => api("POST", "/api/nidhi-company/deposits", d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["deposits"] }); qc.invalidateQueries({ queryKey: ["deposit-stats"] }); setNewOpen(false); } });
  const collectInstallment = useMutation({ mutationFn: (d: any) => api("POST", `/api/nidhi-company/deposits/${collectId}/collect-installment`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["deposits"] }); setCollectId(null); } });
  const closeDeposit = useMutation({ mutationFn: (d: any) => api("POST", `/api/nidhi-company/deposits/${closeId}/close`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["deposits"] }); setCloseId(null); } });

  const maturityAmount = () => {
    const p = parseFloat(form.principal_amount) || 0;
    const r = parseFloat(form.interest_rate) || 0;
    const m = parseFloat(form.tenure_months) || 0;
    return p + p * (r / 100) * (m / 12);
  };

  const filtered = (deposits as any[]).filter((d: any) => {
    if (typeFilter !== "all" && d.deposit_type !== typeFilter) return false;
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (search && !d.member_name?.toLowerCase().includes(search.toLowerCase()) && !d.account_number?.includes(search)) return false;
    return true;
  });

  const openNew = () => { setForm({ ...form, account_number: "ND-" + Date.now() }); setNewOpen(true); };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Deposit Management</h1>
        <Button onClick={openNew}><PlusCircle className="mr-2 h-4 w-4" />New Deposit</Button>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {(stats as any[]).map((s: any) => (
            <Card key={s.deposit_type}><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">{s.deposit_type}</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{s.count} accounts</p><p className="text-sm text-muted-foreground">{fmt(s.aum)}</p></CardContent></Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="all">
        <TabsList><TabsTrigger value="all">All Deposits</TabsTrigger><TabsTrigger value="maturing">Maturing Soon</TabsTrigger></TabsList>

        <TabsContent value="all">
          <div className="flex gap-2 mb-3">
            <Input placeholder="Search member / account..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
            <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="FD">FD</SelectItem><SelectItem value="RD">RD</SelectItem><SelectItem value="Savings">Savings</SelectItem><SelectItem value="Recurring">Recurring</SelectItem></SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="closed">Closed</SelectItem><SelectItem value="matured">Matured</SelectItem><SelectItem value="premature_closed">Premature</SelectItem></SelectContent></Select>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Account#</TableHead><TableHead>Member</TableHead><TableHead>Phone</TableHead><TableHead>Type</TableHead><TableHead>Principal</TableHead><TableHead>Rate%</TableHead><TableHead>Tenure</TableHead><TableHead>Opening</TableHead><TableHead>Maturity</TableHead><TableHead>Balance</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs">{d.account_number}</TableCell>
                  <TableCell>{d.member_name}</TableCell>
                  <TableCell>{d.phone}</TableCell>
                  <TableCell><Badge variant={(typeColor[d.deposit_type] || "default") as any}>{d.deposit_type}</Badge></TableCell>
                  <TableCell>{fmt(d.principal_amount)}</TableCell>
                  <TableCell>{d.interest_rate}%</TableCell>
                  <TableCell>{d.tenure_months}m</TableCell>
                  <TableCell>{d.opening_date?.slice(0, 10)}</TableCell>
                  <TableCell>{d.maturity_date?.slice(0, 10)}</TableCell>
                  <TableCell>{fmt(d.current_balance)}</TableCell>
                  <TableCell><Badge variant={(statusColor[d.status] || "default") as any}>{d.status}</Badge></TableCell>
                  <TableCell className="space-x-1">
                    {(d.deposit_type === "RD" || d.deposit_type === "Recurring") && <Button size="sm" variant="outline" onClick={() => setCollectId(d.id)}>Collect</Button>}
                    {d.status === "active" && <Button size="sm" variant="destructive" onClick={() => setCloseId(d.id)}>Close</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="maturing">
          <Table>
            <TableHeader><TableRow><TableHead>Account#</TableHead><TableHead>Member</TableHead><TableHead>Type</TableHead><TableHead>Principal</TableHead><TableHead>Maturity Date</TableHead><TableHead>Auto Renew</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {(maturing as any[]).map((d: any) => {
                const daysLeft = Math.ceil((new Date(d.maturity_date).getTime() - Date.now()) / 86400000);
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">{d.account_number}</TableCell>
                    <TableCell>{d.member_name}</TableCell>
                    <TableCell><Badge variant={(typeColor[d.deposit_type] || "default") as any}>{d.deposit_type}</Badge></TableCell>
                    <TableCell>{fmt(d.principal_amount)}</TableCell>
                    <TableCell className={daysLeft <= 7 ? "text-red-600 font-bold" : ""}>{d.maturity_date?.slice(0, 10)}</TableCell>
                    <TableCell>{d.auto_renew ? <Badge>Auto Renew</Badge> : <Badge variant="outline">Manual</Badge>}</TableCell>
                    <TableCell><Badge variant={(statusColor[d.status] || "default") as any}>{d.status}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Deposit</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {[["member_id","Member ID"],["account_number","Account#"],["principal_amount","Principal Amount"],["interest_rate","Interest Rate %"],["tenure_months","Tenure (months)"],["opening_date","Opening Date"],["nominee_name","Nominee Name"]].map(([k, l]) => (
              <div key={k}><Label>{l}</Label><Input type={k.includes("date") ? "date" : k.includes("amount") || k.includes("rate") || k.includes("months") ? "number" : "text"} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
            ))}
            <div><Label>Deposit Type</Label><Select value={form.deposit_type} onValueChange={(v) => setForm({ ...form, deposit_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="FD">FD</SelectItem><SelectItem value="RD">RD</SelectItem><SelectItem value="Savings">Savings</SelectItem><SelectItem value="Recurring">Recurring</SelectItem></SelectContent></Select></div>
            <div><Label>Interest Payout</Label><Select value={form.interest_payout} onValueChange={(v) => setForm({ ...form, interest_payout: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="on_maturity">On Maturity</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem></SelectContent></Select></div>
            <div className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={form.auto_renew} onChange={(e) => setForm({ ...form, auto_renew: e.target.checked })} /><Label>Auto Renew</Label></div>
            {form.principal_amount && form.interest_rate && form.tenure_months && <div className="col-span-2 p-2 bg-muted rounded text-sm">Maturity Amount (Simple Interest): <strong>{fmt(maturityAmount())}</strong></div>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button><Button onClick={() => createDeposit.mutate(form)} disabled={createDeposit.isPending}>{createDeposit.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={collectId !== null} onOpenChange={() => setCollectId(null)}>
        <DialogContent><DialogHeader><DialogTitle>Collect Installment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Amount</Label><Input type="number" value={collectForm.amount} onChange={(e) => setCollectForm({ ...collectForm, amount: e.target.value })} /></div>
            <div><Label>Payment Mode</Label><Select value={collectForm.payment_mode} onValueChange={(v) => setCollectForm({ ...collectForm, payment_mode: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="cheque">Cheque</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="neft">NEFT</SelectItem></SelectContent></Select></div>
            <div><Label>Reference Number</Label><Input value={collectForm.reference_number} onChange={(e) => setCollectForm({ ...collectForm, reference_number: e.target.value })} /></div>
            <div><Label>Collection Date</Label><Input type="date" value={collectForm.collection_date} onChange={(e) => setCollectForm({ ...collectForm, collection_date: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCollectId(null)}>Cancel</Button><Button onClick={() => collectInstallment.mutate(collectForm)} disabled={collectInstallment.isPending}>Collect</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeId !== null} onOpenChange={() => setCloseId(null)}>
        <DialogContent><DialogHeader><DialogTitle>Close Deposit</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Closure Type</Label><Select value={closeForm.closure_type} onValueChange={(v) => setCloseForm({ ...closeForm, closure_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="maturity">Maturity</SelectItem><SelectItem value="premature">Premature</SelectItem></SelectContent></Select></div>
            <div><Label>Payment Mode</Label><Select value={closeForm.payment_mode} onValueChange={(v) => setCloseForm({ ...closeForm, payment_mode: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="cheque">Cheque</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="neft">NEFT</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCloseId(null)}>Cancel</Button><Button variant="destructive" onClick={() => closeDeposit.mutate(closeForm)} disabled={closeDeposit.isPending}>Close Deposit</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
