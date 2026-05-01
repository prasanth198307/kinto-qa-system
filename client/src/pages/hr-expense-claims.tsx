import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, CheckCircle, XCircle, Wallet, Receipt, ChevronDown, ChevronUp } from "lucide-react";

const EXPENSE_CATEGORIES = ["Travel", "Accommodation", "Meals", "Fuel", "Communication", "Office Supplies", "Medical", "Training", "Client Entertainment", "Other"];

const STATUS_COLORS: Record<string, string> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  paid: "default",
};
const STATUS_LABELS: Record<string, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected", paid: "Paid" };

interface ClaimItem { category: string; description: string; amount: string; expenseDate: string; }

function ClaimForm({ employees, onSave, onCancel }: any) {
  const { toast } = useToast();
  const [form, setForm] = useState({ employeeId: "", title: "", claimDate: new Date().toISOString().split("T")[0], notes: "" });
  const [items, setItems] = useState<ClaimItem[]>([{ category: "Travel", description: "", amount: "", expenseDate: "" }]);

  const addItem = () => setItems(p => [...p, { category: "Travel", description: "", amount: "", expenseDate: "" }]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof ClaimItem, val: string) => setItems(p => p.map((it, idx) => idx === i ? { ...it, [field]: val } : it));

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/hr/expense-claims", {
      employeeId: Number(form.employeeId), title: form.title, claimDate: form.claimDate,
      notes: form.notes, items: items.map(it => ({ ...it, amount: parseFloat(it.amount) })),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/expense-claims"] }); toast({ title: "Expense claim submitted" }); onSave(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const total = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Employee <span className="text-destructive">*</span></Label>
          <Select value={form.employeeId} onValueChange={v => setForm(p => ({ ...p, employeeId: v }))}>
            <SelectTrigger data-testid="select-employee"><SelectValue placeholder="Select employee" /></SelectTrigger>
            <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Claim Date <span className="text-destructive">*</span></Label>
          <Input type="date" value={form.claimDate} onChange={e => setForm(p => ({ ...p, claimDate: e.target.value }))} data-testid="input-claim-date" />
        </div>
      </div>
      <div>
        <Label>Title / Purpose <span className="text-destructive">*</span></Label>
        <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Client visit to Mumbai" data-testid="input-claim-title" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Expense Items</Label>
          <Button size="sm" variant="outline" onClick={addItem} data-testid="button-add-item"><Plus className="w-3 h-3 mr-1" />Add Item</Button>
        </div>
        {items.map((item, idx) => (
          <Card key={idx} className="p-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <Select value={item.category} onValueChange={v => updateItem(idx, "category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Description" value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} />
              <Input type="date" value={item.expenseDate} onChange={e => updateItem(idx, "expenseDate", e.target.value)} />
              <div className="flex gap-1">
                <Input type="number" placeholder="Amount" value={item.amount} onChange={e => updateItem(idx, "amount", e.target.value)} className="flex-1" />
                {items.length > 1 && <Button size="icon" variant="ghost" onClick={() => removeItem(idx)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
              </div>
            </div>
          </Card>
        ))}
        <div className="text-right font-semibold text-sm">Total: ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Additional notes..." rows={2} />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel">Cancel</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.employeeId || !form.title} data-testid="button-submit-claim">
          {mutation.isPending ? "Submitting..." : "Submit Claim"}
        </Button>
      </div>
    </div>
  );
}

function ClaimCard({ claim, items, onAction }: any) {
  const [expanded, setExpanded] = useState(false);
  const claimItems = items.filter((i: any) => i.claim_id === claim.id);
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium">{claim.title}</p>
            <p className="text-sm text-muted-foreground">{claim.employee_name} · {new Date(claim.claim_date).toLocaleDateString("en-IN")}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={STATUS_COLORS[claim.status] as any}>{STATUS_LABELS[claim.status]}</Badge>
            <span className="font-semibold">₹{Number(claim.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            <Button size="icon" variant="ghost" onClick={() => setExpanded(e => !e)} data-testid={`button-expand-claim-${claim.id}`}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 space-y-2 border-t pt-3">
            <table className="w-full text-sm">
              <thead><tr className="text-muted-foreground"><th className="text-left">Category</th><th className="text-left">Description</th><th className="text-left">Date</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {claimItems.map((it: any) => (
                  <tr key={it.id} className="border-t">
                    <td className="py-1">{it.category}</td>
                    <td className="py-1 text-muted-foreground">{it.description || "—"}</td>
                    <td className="py-1 text-muted-foreground">{it.expense_date ? new Date(it.expense_date).toLocaleDateString("en-IN") : "—"}</td>
                    <td className="py-1 text-right">₹{Number(it.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {claim.notes && <p className="text-xs text-muted-foreground">Note: {claim.notes}</p>}
            {claim.rejection_reason && <p className="text-xs text-destructive">Rejection reason: {claim.rejection_reason}</p>}
            {claim.status === "pending" && (
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={() => onAction(claim.id, "approved")} data-testid={`button-approve-${claim.id}`}>
                  <CheckCircle className="w-4 h-4 mr-1" />Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onAction(claim.id, "rejected")} data-testid={`button-reject-${claim.id}`}>
                  <XCircle className="w-4 h-4 mr-1" />Reject
                </Button>
              </div>
            )}
            {claim.status === "approved" && (
              <Button size="sm" onClick={() => onAction(claim.id, "paid")} data-testid={`button-mark-paid-${claim.id}`}>
                <Wallet className="w-4 h-4 mr-1" />Mark Paid
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function HRExpenseClaimsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/hr/expense-claims"] });
  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["/api/hr/employees"] });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: any) => apiRequest("PUT", `/api/hr/expense-claims/${id}/action`, { action }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/expense-claims"] }); toast({ title: "Claim updated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const claims: any[] = data?.claims || [];
  const items: any[] = data?.items || [];

  const filteredClaims = activeTab === "all" ? claims : claims.filter(c => c.status === activeTab);

  const stats = {
    pending: claims.filter(c => c.status === "pending").length,
    approved: claims.filter(c => c.status === "approved").length,
    totalPending: claims.filter(c => c.status === "pending").reduce((s: number, c: any) => s + Number(c.total_amount), 0),
    totalApproved: claims.filter(c => c.status === "approved").reduce((s: number, c: any) => s + Number(c.total_amount), 0),
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Expense Claims</h1>
          <p className="text-sm text-muted-foreground">Manage employee expense reimbursements</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-new-claim">
          <Plus className="w-4 h-4 mr-1" />New Claim
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending", value: stats.pending, sub: `₹${stats.totalPending.toLocaleString("en-IN")}`, color: "text-yellow-600" },
          { label: "Approved", value: stats.approved, sub: `₹${stats.totalApproved.toLocaleString("en-IN")}`, color: "text-green-600" },
          { label: "Total Claims", value: claims.length, sub: "all time" },
          { label: "Paid", value: claims.filter(c => c.status === "paid").length, sub: "reimbursed" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color || ""}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending">Pending</TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">Approved</TabsTrigger>
          <TabsTrigger value="paid" data-testid="tab-paid">Paid</TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">Rejected</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="space-y-3 mt-3">
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Loading...</div>
          ) : filteredClaims.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No expense claims</p>
            </div>
          ) : (
            filteredClaims.map(claim => (
              <ClaimCard key={claim.id} claim={claim} items={items}
                onAction={(id: number, action: string) => actionMutation.mutate({ id, action })} />
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Expense Claim</DialogTitle></DialogHeader>
          <ClaimForm employees={employees} onSave={() => setDialogOpen(false)} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
