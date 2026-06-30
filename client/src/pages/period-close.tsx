import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Lock, Unlock, RotateCcw, AlertTriangle } from "lucide-react";

interface Period {
  id: number;
  period_name: string;
  period_type: string;
  start_date: string;
  end_date: string;
  status: string;
  closed_at: string | null;
  closed_by: string | null;
  locked_at: string | null;
  locked_by: string | null;
}

const STATUS_CONFIG: Record<string, { cls: string; label: string }> = {
  open: { cls: "bg-green-100 text-green-700", label: "Open" },
  closed: { cls: "bg-orange-100 text-orange-700", label: "Closed" },
  locked: { cls: "bg-red-100 text-red-700", label: "Locked" },
};

export default function PeriodClose() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);
  const [unlockId, setUnlockId] = useState<number | null>(null);
  const [form, setForm] = useState({ period_type: "monthly", start_date: "", end_date: "", notes: "" });

  const { data: periods = [] } = useQuery<Period[]>({
    queryKey: ["/api/finance-erp/periods"],
  });

  // Check if current month has a locked period
  const today = new Date();
  const lockedThisMonth = (periods as Period[]).find(p => {
    if (p.status !== "locked") return false;
    const s = new Date(p.start_date);
    const e = new Date(p.end_date);
    return s.getMonth() === today.getMonth() && s.getFullYear() === today.getFullYear() ||
      e.getMonth() === today.getMonth() && e.getFullYear() === today.getFullYear();
  });

  const createPeriod = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/finance-erp/periods", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/finance-erp/periods"] }); setNewOpen(false); toast({ title: "Period created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const closePeriod = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/finance-erp/periods/${id}/close`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/finance-erp/periods"] }); toast({ title: "Period closed" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const lockPeriod = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/finance-erp/periods/${id}/lock`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/finance-erp/periods"] }); toast({ title: "Period locked — no further journal entries allowed" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const reopenPeriod = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/finance-erp/periods/${id}/reopen`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/finance-erp/periods"] }); setUnlockId(null); toast({ title: "Period reopened" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Period-End Close & Year-End Lock</h1>
          <p className="text-sm text-gray-500 mt-1">Manage accounting periods and prevent entries in closed periods</p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-2" />New Period</Button>
      </div>

      {/* Locked period warning */}
      {lockedThisMonth && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>Warning:</strong> Current month has a locked period: <strong>{lockedThisMonth.period_name}</strong>.
            Journal entries in this period will be rejected.
          </span>
        </div>
      )}

      {/* Period cards */}
      <div className="space-y-3">
        {(periods as Period[]).length === 0 && (
          <Card><CardContent className="py-12 text-center text-gray-400">No accounting periods created yet</CardContent></Card>
        )}
        {(periods as Period[]).map(p => {
          const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.open;
          return (
            <Card key={p.id} className={p.status === "locked" ? "border-red-200" : p.status === "closed" ? "border-orange-200" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">{p.period_name}</CardTitle>
                    <Badge className={cfg.cls}>{cfg.label}</Badge>
                    <span className="text-xs text-gray-400 capitalize">{p.period_type}</span>
                  </div>
                  <div className="flex gap-2">
                    {p.status === "open" && (
                      <Button size="sm" variant="outline" onClick={() => closePeriod.mutate(p.id)} disabled={closePeriod.isPending}>
                        Close Period
                      </Button>
                    )}
                    {p.status === "closed" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => reopenPeriod.mutate(p.id)} disabled={reopenPeriod.isPending}>
                          <RotateCcw className="h-3 w-3 mr-1" />Reopen
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => lockPeriod.mutate(p.id)} disabled={lockPeriod.isPending}>
                          <Lock className="h-3 w-3 mr-1" />Lock Period
                        </Button>
                      </>
                    )}
                    {p.status === "locked" && (
                      <Button size="sm" variant="outline" className="text-red-600 border-red-300" onClick={() => setUnlockId(p.id)}>
                        <Unlock className="h-3 w-3 mr-1" />Unlock (Admin)
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-6 text-sm text-gray-500">
                  <span>From: <strong className="text-gray-800">{p.start_date}</strong></span>
                  <span>To: <strong className="text-gray-800">{p.end_date}</strong></span>
                  {p.closed_by && <span>Closed by: <strong className="text-gray-800">{p.closed_by}</strong></span>}
                  {p.locked_by && <span>Locked by: <strong className="text-red-600">{p.locked_by}</strong></span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* New Period Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Accounting Period</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Period Type</Label>
              <Select value={form.period_type} onValueChange={v => setForm(f => ({ ...f, period_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date *</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><Label>End Date *</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={() => createPeriod.mutate(form)} disabled={createPeriod.isPending || !form.start_date || !form.end_date}>
              Create Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlock Confirmation Dialog */}
      <Dialog open={unlockId !== null} onOpenChange={() => setUnlockId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Unlock Period (Admin Only)</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">
            This will reopen a locked period. Journal entries will once again be permitted in this period.
            This action is restricted to administrators. Proceed?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => unlockId && reopenPeriod.mutate(unlockId)} disabled={reopenPeriod.isPending}>
              Yes, Unlock Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
