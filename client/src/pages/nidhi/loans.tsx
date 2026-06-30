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
import { PlusCircle, RefreshCw, AlertTriangle } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const loanTypeColor: Record<string, string> = { gold_loan: "default", property_loan: "secondary", fd_loan: "outline", personal_loan: "destructive" };
const statusColor: Record<string, string> = { active: "default", closed: "secondary", npa: "destructive" };

function fmt(n: number) { return "₹" + (n || 0).toLocaleString("en-IN"); }

function calcPMT(rate: number, nper: number, pv: number) {
  if (!rate) return pv / nper;
  const r = rate / 100 / 12;
  return (pv * r * Math.pow(1 + r, nper)) / (Math.pow(1 + r, nper) - 1);
}

export default function LoansPage() {
  const qc = useQueryClient();
  const [loanTypeFilter, setLoanTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [emiId, setEmiId] = useState<number | null>(null);
  const [npaId, setNpaId] = useState<number | null>(null);
  const [npaReason, setNpaReason] = useState("");

  const initLoan = { member_id: "", loan_number: "", loan_type: "gold_loan", principal_amount: "", interest_rate: "", tenure_months: "", disbursement_date: "", first_emi_date: "", security_type: "gold", security_description: "", security_value: "", gold_weight_grams: "", gold_purity: "", gold_rate_per_gram: "" };
  const [loanForm, setLoanForm] = useState<any>(initLoan);
  const initEmi = { emi_number: "", principal_component: "", interest_component: "", penalty_amount: "", payment_mode: "cash", reference_number: "", payment_date: "" };
  const [emiForm, setEmiForm] = useState<any>(initEmi);

  const { data: stats } = useQuery({ queryKey: ["loan-stats"], queryFn: () => api("GET", "/api/nidhi-company/loans/stats") });
  const { data: loans = [] } = useQuery({ queryKey: ["loans"], queryFn: () => api("GET", "/api/nidhi-company/loans") });
  const { data: overdues = [] } = useQuery({ queryKey: ["loans-overdues"], queryFn: () => api("GET", "/api/nidhi-company/loans/overdues") });

  const createLoan = useMutation({ mutationFn: (d: any) => api("POST", "/api/nidhi-company/loans", d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["loans"] }); qc.invalidateQueries({ queryKey: ["loan-stats"] }); setNewOpen(false); setLoanForm(initLoan); } });
  const collectEmi = useMutation({ mutationFn: (d: any) => api("POST", `/api/nidhi-company/loans/${emiId}/collect-emi`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["loans"] }); qc.invalidateQueries({ queryKey: ["loans-overdues"] }); setEmiId(null); setEmiForm(initEmi); } });
  const markNpa = useMutation({ mutationFn: () => api("PUT", `/api/nidhi-company/loans/${npaId}/mark-npa`, { npa_reason: npaReason }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["loans"] }); qc.invalidateQueries({ queryKey: ["loan-stats"] }); qc.invalidateQueries({ queryKey: ["loans-overdues"] }); setNpaId(null); setNpaReason(""); } });

  const emiAmount = calcPMT(parseFloat(loanForm.interest_rate), parseFloat(loanForm.tenure_months), parseFloat(loanForm.principal_amount));

  const filtered = (loans as any[]).filter((l: any) => {
    if (loanTypeFilter !== "all" && l.loan_type !== loanTypeFilter) return false;
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (search && !l.member_name?.toLowerCase().includes(search.toLowerCase()) && !l.loan_number?.includes(search)) return false;
    return true;
  });

  const openNew = () => { setLoanForm({ ...initLoan, loan_number: "LN-" + Date.now() }); setNewOpen(true); };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Loan Management</h1>
        <Button onClick={openNew}><PlusCircle className="mr-2 h-4 w-4" />New Loan</Button>
      </div>

      {stats && (
        <div className="grid grid-cols-5 gap-4">
          {[["Active Loans", stats.active_count], ["NPA Loans", stats.npa_count], ["Loan Book", fmt(stats.total_loan_book)], ["NPA Book", fmt(stats.npa_book)], ["Total Penalty", fmt(stats.total_penalty)]].map(([label, val]) => (
            <Card key={label as string}><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{val}</p></CardContent></Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="active">
        <TabsList><TabsTrigger value="active">Active Loans</TabsTrigger><TabsTrigger value="overdue">Overdue / NPA</TabsTrigger></TabsList>

        <TabsContent value="active">
          <div className="flex gap-2 mb-3">
            <Input placeholder="Search member / loan#..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
            <Select value={loanTypeFilter} onValueChange={setLoanTypeFilter}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="gold_loan">Gold Loan</SelectItem><SelectItem value="property_loan">Property Loan</SelectItem><SelectItem value="fd_loan">FD Loan</SelectItem><SelectItem value="personal_loan">Personal Loan</SelectItem></SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="closed">Closed</SelectItem><SelectItem value="npa">NPA</SelectItem></SelectContent></Select>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Loan#</TableHead><TableHead>Member</TableHead><TableHead>Phone</TableHead><TableHead>Type</TableHead><TableHead>Principal</TableHead><TableHead>Rate%</TableHead><TableHead>Outstanding</TableHead><TableHead>EMIs Paid</TableHead><TableHead>Next EMI</TableHead><TableHead>Overdue</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs">{l.loan_number}</TableCell>
                  <TableCell>{l.member_name}</TableCell>
                  <TableCell>{l.phone}</TableCell>
                  <TableCell><Badge variant={(loanTypeColor[l.loan_type] || "default") as any}>{l.loan_type?.replace("_", " ")}</Badge></TableCell>
                  <TableCell>{fmt(l.principal_amount)}</TableCell>
                  <TableCell>{l.interest_rate}%</TableCell>
                  <TableCell>{fmt(l.outstanding_principal)}</TableCell>
                  <TableCell>{l.emis_paid}/{l.total_emis}</TableCell>
                  <TableCell>{l.next_emi_date?.slice(0, 10)}</TableCell>
                  <TableCell className={l.overdue_days > 0 ? "text-red-600 font-bold" : ""}>{l.overdue_days > 0 ? `${l.overdue_days}d` : "-"}</TableCell>
                  <TableCell><Badge variant={(statusColor[l.status] || "default") as any}>{l.status}</Badge></TableCell>
                  <TableCell>{l.status === "active" && <Button size="sm" variant="outline" onClick={() => { setEmiId(l.id); setEmiForm(initEmi); }}>Collect EMI</Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="overdue">
          <Table>
            <TableHeader><TableRow><TableHead>Loan#</TableHead><TableHead>Member</TableHead><TableHead>Type</TableHead><TableHead>Outstanding</TableHead><TableHead>Days Overdue</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {(overdues as any[]).map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs">{l.loan_number}</TableCell>
                  <TableCell>{l.member_name}</TableCell>
                  <TableCell><Badge variant={(loanTypeColor[l.loan_type] || "default") as any}>{l.loan_type?.replace("_", " ")}</Badge></TableCell>
                  <TableCell>{fmt(l.outstanding_principal)}</TableCell>
                  <TableCell className="text-red-600 font-bold">{l.days_overdue}d</TableCell>
                  <TableCell><Badge variant={(statusColor[l.status] || "default") as any}>{l.status}</Badge></TableCell>
                  <TableCell className="space-x-1">
                    <Button size="sm" variant="outline" onClick={() => { setEmiId(l.id); setEmiForm(initEmi); }}>Collect EMI</Button>
                    {l.status !== "npa" && <Button size="sm" variant="destructive" onClick={() => setNpaId(l.id)}><AlertTriangle className="h-3 w-3 mr-1" />Mark NPA</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Loan</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {[["member_id","Member ID"],["loan_number","Loan Number"],["principal_amount","Principal Amount"],["interest_rate","Interest Rate %"],["tenure_months","Tenure (months)"],["disbursement_date","Disbursement Date"],["first_emi_date","First EMI Date"],["security_value","Security Value"],["security_description","Security Description"]].map(([k, l]) => (
              <div key={k}><Label>{l}</Label><Input type={k.includes("date") ? "date" : ["principal_amount","interest_rate","tenure_months","security_value"].includes(k) ? "number" : "text"} value={loanForm[k]} onChange={(e) => setLoanForm({ ...loanForm, [k]: e.target.value })} /></div>
            ))}
            <div><Label>Loan Type</Label><Select value={loanForm.loan_type} onValueChange={(v) => setLoanForm({ ...loanForm, loan_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="gold_loan">Gold Loan</SelectItem><SelectItem value="property_loan">Property Loan</SelectItem><SelectItem value="fd_loan">FD Loan</SelectItem><SelectItem value="personal_loan">Personal Loan</SelectItem></SelectContent></Select></div>
            <div><Label>Security Type</Label><Select value={loanForm.security_type} onValueChange={(v) => setLoanForm({ ...loanForm, security_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="gold">Gold</SelectItem><SelectItem value="property">Property</SelectItem><SelectItem value="fd">FD</SelectItem><SelectItem value="surety">Surety</SelectItem></SelectContent></Select></div>
            {loanForm.loan_type === "gold_loan" && <>
              <div><Label>Gold Weight (g)</Label><Input type="number" value={loanForm.gold_weight_grams} onChange={(e) => setLoanForm({ ...loanForm, gold_weight_grams: e.target.value })} /></div>
              <div><Label>Gold Purity</Label><Input type="number" value={loanForm.gold_purity} onChange={(e) => setLoanForm({ ...loanForm, gold_purity: e.target.value })} /></div>
              <div><Label>Gold Rate/gram</Label><Input type="number" value={loanForm.gold_rate_per_gram} onChange={(e) => setLoanForm({ ...loanForm, gold_rate_per_gram: e.target.value })} /></div>
            </>}
            {loanForm.principal_amount && loanForm.interest_rate && loanForm.tenure_months && (
              <div className="col-span-2 p-2 bg-muted rounded text-sm">EMI (PMT): <strong>{fmt(emiAmount)}</strong>/month</div>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button><Button onClick={() => createLoan.mutate({ ...loanForm, emi_amount: emiAmount })} disabled={createLoan.isPending}>{createLoan.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Create Loan"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={emiId !== null} onOpenChange={() => setEmiId(null)}>
        <DialogContent><DialogHeader><DialogTitle>Collect EMI</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {[["emi_number","EMI Number"],["principal_component","Principal Component"],["interest_component","Interest Component"],["penalty_amount","Penalty Amount"],["reference_number","Reference Number"]].map(([k, l]) => (
              <div key={k}><Label>{l}</Label><Input type={k === "reference_number" ? "text" : "number"} value={emiForm[k]} onChange={(e) => setEmiForm({ ...emiForm, [k]: e.target.value })} /></div>
            ))}
            <div><Label>Payment Mode</Label><Select value={emiForm.payment_mode} onValueChange={(v) => setEmiForm({ ...emiForm, payment_mode: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="cheque">Cheque</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="neft">NEFT</SelectItem></SelectContent></Select></div>
            <div><Label>Payment Date</Label><Input type="date" value={emiForm.payment_date} onChange={(e) => setEmiForm({ ...emiForm, payment_date: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEmiId(null)}>Cancel</Button><Button onClick={() => collectEmi.mutate(emiForm)} disabled={collectEmi.isPending}>{collectEmi.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Collect"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={npaId !== null} onOpenChange={() => setNpaId(null)}>
        <DialogContent><DialogHeader><DialogTitle>Mark as NPA</DialogTitle></DialogHeader>
          <div><Label>NPA Reason</Label><Input value={npaReason} onChange={(e) => setNpaReason(e.target.value)} placeholder="Reason for NPA classification..." /></div>
          <DialogFooter><Button variant="outline" onClick={() => setNpaId(null)}>Cancel</Button><Button variant="destructive" onClick={() => markNpa.mutate()} disabled={markNpa.isPending || !npaReason}>Mark NPA</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
