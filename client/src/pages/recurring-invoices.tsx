import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, RefreshCw, PlayCircle, Pencil } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

function RecurringForm({ schedule, onSave, onCancel }: any) {
  const { currency_symbol: sym } = useTenantConfig();
  const { toast } = useToast();
  const [form, setForm] = useState({
    customerName: schedule?.customer_name || "", customerGstin: schedule?.customer_gstin || "",
    billingAddress: schedule?.billing_address || "", frequency: schedule?.frequency || "monthly",
    nextDue: schedule?.next_due?.split("T")[0] || new Date().toISOString().split("T")[0],
    endDate: schedule?.end_date?.split("T")[0] || "", amount: schedule?.amount || "",
    description: schedule?.description || "", hsnSac: schedule?.hsn_sac || "",
    isService: schedule?.is_service !== false, tdsRate: schedule?.tds_rate || "0",
    isActive: schedule?.is_active !== false,
  });

  const mutation = useMutation({
    mutationFn: (d: any) => schedule
      ? apiRequest("PUT", `/api/assets/recurring-invoices/${schedule.id}`, d)
      : apiRequest("POST", "/api/assets/recurring-invoices", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets/recurring-invoices"] });
      toast({ title: schedule ? "Schedule updated" : "Recurring invoice schedule created" });
      onSave();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><Label>Customer Name <span className="text-destructive">*</span></Label><Input value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} data-testid="input-customer-name" /></div>
        <div><Label>Customer GSTIN</Label><Input value={form.customerGstin} onChange={e => setForm(p => ({ ...p, customerGstin: e.target.value }))} /></div>
        <div className="sm:col-span-2"><Label>Billing Address</Label><Input value={form.billingAddress} onChange={e => setForm(p => ({ ...p, billingAddress: e.target.value }))} /></div>
        <div>
          <Label>Frequency</Label>
          <Select value={form.frequency} onValueChange={v => setForm(p => ({ ...p, frequency: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Amount (${sym} excl. GST) <span className="text-destructive">*</span></Label><Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></div>
        <div><Label>Next Due Date <span className="text-destructive">*</span></Label><Input type="date" value={form.nextDue} onChange={e => setForm(p => ({ ...p, nextDue: e.target.value }))} /></div>
        <div><Label>End Date (optional)</Label><Input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} /></div>
        <div><Label>Description / Service</Label><Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Annual Maintenance Contract" /></div>
        <div><Label>HSN / SAC Code</Label><Input value={form.hsnSac} onChange={e => setForm(p => ({ ...p, hsnSac: e.target.value }))} placeholder="e.g. 998313" /></div>
        <div><Label>TDS Rate (%)</Label><Input type="number" step="0.01" value={form.tdsRate} onChange={e => setForm(p => ({ ...p, tdsRate: e.target.value }))} /></div>
      </div>
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <input type="checkbox" id="isService" checked={form.isService} onChange={e => setForm(p => ({ ...p, isService: e.target.checked }))} />
          <label htmlFor="isService" className="text-sm">Service Invoice</label>
        </div>
        {schedule && (
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} />
            <label htmlFor="isActive" className="text-sm">Active</label>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => mutation.mutate({ ...form, amount: Number(form.amount), tdsRate: Number(form.tdsRate) })}
          disabled={mutation.isPending || !form.customerName || !form.amount || !form.nextDue} data-testid="button-save-recurring">
          {mutation.isPending ? "Saving..." : "Save Schedule"}
        </Button>
      </div>
    </div>
  );
}

export default function RecurringInvoicesPage() {
  const { currency_symbol: sym } = useTenantConfig();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSchedule, setEditSchedule] = useState<any>(null);

  const { data: schedules = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/assets/recurring-invoices"] });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/assets/recurring-invoices/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/assets/recurring-invoices"] }); toast({ title: "Schedule removed" }); },
  });

  const generateMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/assets/recurring-invoices/${id}/generate`, {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets/recurring-invoices"] });
      toast({ title: `Invoice ${data.invoice?.invoice_number} generated`, description: "Check Invoices module" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const today = new Date().toISOString().split("T")[0];
  const dueTodayOrOverdue = schedules.filter((s: any) => s.is_active && s.next_due <= today);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Recurring Invoices</h1>
          <p className="text-sm text-muted-foreground">AMC, subscriptions, rent & other periodic billing</p>
        </div>
        <Button onClick={() => { setEditSchedule(null); setDialogOpen(true); }} data-testid="button-new-recurring">
          <Plus className="w-4 h-4 mr-1" />New Schedule
        </Button>
      </div>

      {dueTodayOrOverdue.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-50/30 dark:bg-yellow-950/20">
          <CardContent className="p-3">
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
              {dueTodayOrOverdue.length} invoice{dueTodayOrOverdue.length > 1 ? "s" : ""} due — click Generate to create them
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Schedules", value: schedules.filter((s: any) => s.is_active).length },
          { label: "Due / Overdue", value: dueTodayOrOverdue.length },
          { label: "Monthly Value", value: `${sym}${schedules.filter((s: any) => s.is_active && s.frequency === "monthly").reduce((s2: number, s: any) => s2 + Number(s.amount), 0).toLocaleString("en-IN")}` },
          { label: "Total Schedules", value: schedules.length },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3"><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></CardContent></Card>
        ))}
      </div>

      {isLoading ? <p className="text-center py-12 text-muted-foreground">Loading...</p> : schedules.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><RefreshCw className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No recurring invoice schedules</p></div>
      ) : (
        <div className="space-y-3">
          {(schedules as any[]).map((s: any) => {
            const isOverdue = s.next_due <= today;
            return (
              <Card key={s.id} data-testid={`card-recurring-${s.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{s.customer_name}</p>
                        <Badge variant={s.is_active ? "default" : "secondary"} className="text-xs">{s.is_active ? "Active" : "Paused"}</Badge>
                        {s.is_active && isOverdue && <Badge variant="destructive" className="text-xs">Due</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{s.description || "Invoice"} · {FREQUENCIES.find(f => f.value === s.frequency)?.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Next due: <strong>{new Date(s.next_due).toLocaleDateString("en-IN")}</strong>
                        {s.end_date ? ` · Ends: ${new Date(s.end_date).toLocaleDateString("en-IN")}` : ""}
                        {s.last_generated ? ` · Last: ${new Date(s.last_generated).toLocaleDateString("en-IN")}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{sym}{Number(s.amount).toLocaleString("en-IN")}</span>
                      {s.is_active && (
                        <Button size="sm" variant="outline" onClick={() => generateMutation.mutate(s.id)} disabled={generateMutation.isPending} data-testid={`button-generate-${s.id}`}>
                          <PlayCircle className="w-4 h-4 mr-1" />Generate
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => { setEditSchedule(s); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(s.id)} data-testid={`button-delete-recurring-${s.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                  {s.tds_rate > 0 && <p className="text-xs text-muted-foreground mt-1">TDS: {s.tds_rate}%</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editSchedule ? "Edit Schedule" : "New Recurring Invoice Schedule"}</DialogTitle></DialogHeader>
          <RecurringForm schedule={editSchedule} onSave={() => setDialogOpen(false)} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
