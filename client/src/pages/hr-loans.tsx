import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, CreditCard, ChevronDown, ChevronRight, Wallet } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const MONTHS = ["", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function fmt(n: any) { return Number(n || 0).toLocaleString("en-IN"); }

const STATUS_COLORS: Record<string, any> = {
  active: "default",
  closed: "secondary",
  paused: "outline",
};

export default function HRLoansPage() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterEmp, setFilterEmp] = useState("");

  const now = new Date();
  const [form, setForm] = useState({
    employeeId: "",
    loanType: "loan",
    purpose: "",
    sanctionedAmount: "",
    emi: "",
    disbursedDate: "",
    startMonth: String(now.getMonth() + 1),
    startYear: String(now.getFullYear()),
    notes: "",
  });

  const { data: loans = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/hr/loans"],
    queryFn: () => fetch("/api/hr/loans", { credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["/api/hr/employees"],
    queryFn: () => fetch("/api/hr/employees?status=active", { credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });

  const { data: ledger = [] } = useQuery<any[]>({
    queryKey: ["/api/hr/loans", expandedId, "ledger"],
    queryFn: () => expandedId
      ? fetch(`/api/hr/loans/${expandedId}/ledger`, { credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); })
      : Promise.resolve([]),
    enabled: !!expandedId,
  });

  const createLoan = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/hr/loans", d).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/loans"] });
      setCreateOpen(false);
      setForm({ employeeId: "", loanType: "loan", purpose: "", sanctionedAmount: "", emi: "", disbursedDate: "", startMonth: String(now.getMonth() + 1), startYear: String(now.getFullYear()), notes: "" });
      toast({ title: "Loan/advance recorded successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const closeLoan = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/hr/loans/${id}`, { status: "closed" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/loans"] }); toast({ title: "Loan closed" }); },
  });

  const filtered = (loans as any[]).filter(l =>
    !filterEmp || `${l.first_name} ${l.last_name} ${l.emp_code}`.toLowerCase().includes(filterEmp.toLowerCase())
  );

  const activeCount = (loans as any[]).filter(l => l.status === 'active').length;
  const totalOutstanding = (loans as any[]).filter(l => l.status === 'active').reduce((s, l) => s + Number(l.outstanding), 0);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Loans & Advances</h1>
          <p className="text-sm text-muted-foreground">Track employee loans and salary advance EMI recoveries</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} data-testid="btn-new-loan">
          <Plus className="h-4 w-4 mr-1" />New Loan / Advance
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active Loans</p>
            <p className="text-2xl font-bold">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Outstanding</p>
            <p className="text-2xl font-bold">{sym}{fmt(totalOutstanding)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Loans</p>
            <p className="text-2xl font-bold">{(loans as any[]).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Closed / Settled</p>
            <p className="text-2xl font-bold">{(loans as any[]).filter(l => l.status === 'closed').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Input
          placeholder="Filter by employee name or code..."
          value={filterEmp}
          onChange={e => setFilterEmp(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Loan list */}
      {isLoading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-3">No loans or advances found.</p>
            <Button onClick={() => setCreateOpen(true)}>Record a Loan</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((loan: any) => (
            <Card key={loan.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <CreditCard className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{loan.first_name} {loan.last_name}</span>
                        <span className="text-xs text-muted-foreground">{loan.emp_code}</span>
                        <Badge variant={STATUS_COLORS[loan.status] || "secondary"}>
                          {loan.loan_type === 'advance' ? 'Advance' : 'Loan'} · {loan.status}
                        </Badge>
                      </div>
                      {loan.purpose && <p className="text-sm text-muted-foreground mt-0.5">{loan.purpose}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        From: {MONTHS[loan.start_month]} {loan.start_year}
                        {loan.department_name ? ` · ${loan.department_name}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Sanctioned</p>
                      <p className="font-semibold">{sym}{fmt(loan.sanctioned_amount)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Outstanding</p>
                      <p className={`font-semibold ${Number(loan.outstanding) > 0 ? "text-red-600" : "text-green-600"}`}>
                        {sym}{fmt(loan.outstanding)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Monthly EMI</p>
                      <p className="font-semibold">{sym}{fmt(loan.emi)}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => setExpandedId(expandedId === loan.id ? null : loan.id)}>
                        {expandedId === loan.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        History
                      </Button>
                      {loan.status === 'active' && (
                        <Button size="sm" variant="outline" onClick={() => closeLoan.mutate(loan.id)}>
                          Close
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Repayment progress */}
                {loan.sanctioned_amount > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Repayment progress</span>
                      <span>{Math.round(((Number(loan.sanctioned_amount) - Number(loan.outstanding)) / Number(loan.sanctioned_amount)) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.round(((Number(loan.sanctioned_amount) - Number(loan.outstanding)) / Number(loan.sanctioned_amount)) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Ledger */}
                {expandedId === loan.id && (
                  <div className="mt-4 border-t pt-3">
                    <p className="text-sm font-medium mb-2">Repayment History</p>
                    {(ledger as any[]).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No deductions yet. EMI will be auto-deducted during payroll processing.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-muted-foreground text-xs">
                            <th className="text-left pb-1">Month</th>
                            <th className="text-right pb-1">Deducted</th>
                            <th className="text-right pb-1">Balance After</th>
                            <th className="text-left pb-1 pl-4">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(ledger as any[]).map((row: any) => (
                            <tr key={row.id} className="border-t">
                              <td className="py-1">{MONTHS[row.month]} {row.year}</td>
                              <td className="py-1 text-right">{sym}{fmt(row.deducted_amount)}</td>
                              <td className="py-1 text-right">{sym}{fmt(row.balance_after)}</td>
                              <td className="py-1 pl-4 text-muted-foreground">{row.notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Loan / Advance</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Employee *</Label>
              <Select value={form.employeeId} onValueChange={v => setForm(f => ({ ...f, employeeId: v }))}>
                <SelectTrigger data-testid="select-loan-employee"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {(employees as any[]).map((e: any) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.first_name} {e.last_name} ({e.emp_code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Type *</Label>
                <Select value={form.loanType} onValueChange={v => setForm(f => ({ ...f, loanType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loan">Loan</SelectItem>
                    <SelectItem value="advance">Salary Advance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Disbursed Date</Label>
                <Input type="date" value={form.disbursedDate} onChange={e => setForm(f => ({ ...f, disbursedDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Purpose</Label>
              <Input placeholder="e.g. Medical emergency, House purchase" value={form.purpose}
                onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Sanctioned Amount (₹) *</Label>
                <Input type="number" placeholder="50000" value={form.sanctionedAmount}
                  onChange={e => setForm(f => ({ ...f, sanctionedAmount: e.target.value }))} />
              </div>
              <div>
                <Label>Monthly EMI (₹) *</Label>
                <Input type="number" placeholder="5000" value={form.emi}
                  onChange={e => setForm(f => ({ ...f, emi: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Recovery Start Month *</Label>
                <Select value={form.startMonth} onValueChange={v => setForm(f => ({ ...f, startMonth: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.slice(1).map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Recovery Start Year *</Label>
                <Select value={form.startYear} onValueChange={v => setForm(f => ({ ...f, startYear: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea placeholder="Additional notes..." value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <Button className="w-full" disabled={!form.employeeId || !form.sanctionedAmount || !form.emi || createLoan.isPending}
              onClick={() => createLoan.mutate({
                employeeId: form.employeeId, loanType: form.loanType, purpose: form.purpose,
                sanctionedAmount: Number(form.sanctionedAmount), emi: Number(form.emi),
                disbursedDate: form.disbursedDate || null, startMonth: Number(form.startMonth),
                startYear: Number(form.startYear), notes: form.notes,
              })} data-testid="btn-confirm-loan">
              {createLoan.isPending ? "Saving..." : "Create Loan Record"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
