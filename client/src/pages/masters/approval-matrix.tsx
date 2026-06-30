// Defines who approves what amount for purchase orders, expense vouchers, credit notes across all ERPs.
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());

type ApprovalRule = { id: number; doc_type: string; level: number; approver_role: string; min_amount?: number; max_amount?: number; is_active?: boolean };
const empty: Omit<ApprovalRule, "id"> = { doc_type: "", level: 1, approver_role: "", min_amount: 0, max_amount: 0, is_active: true };

export default function ApprovalMatrixPage() {
  const [editing, setEditing] = useState<ApprovalRule | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Omit<ApprovalRule, "id">>(empty);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ["/api/masters/approval-matrix"], queryFn: () => api("GET", "/api/masters/approval-matrix") });
  const rows: ApprovalRule[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

  const save = useMutation({
    mutationFn: (v: any) => editing ? api("PUT", `/api/masters/approval-matrix/${editing.id}`, v) : api("POST", "/api/masters/approval-matrix", v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/masters/approval-matrix"] }); setEditing(null); setAdding(false); setForm(empty); toast({ title: "Saved" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/masters/approval-matrix/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/masters/approval-matrix"] }); toast({ title: "Deleted" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const startEdit = (r: ApprovalRule) => { setEditing(r); setForm({ doc_type: r.doc_type, level: r.level, approver_role: r.approver_role, min_amount: r.min_amount ?? 0, max_amount: r.max_amount ?? 0, is_active: r.is_active ?? true }); setAdding(false); };
  const cancel = () => { setEditing(null); setAdding(false); setForm(empty); };

  // Group by doc_type
  const grouped = rows.reduce((acc, r) => { (acc[r.doc_type] = acc[r.doc_type] || []).push(r); return acc; }, {} as Record<string, ApprovalRule[]>);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Approval Matrix</h1>
          <p className="text-sm text-muted-foreground mt-1">Defines who approves what amount for purchase orders, expense vouchers, credit notes across all ERPs.</p>
        </div>
        <Button onClick={() => { setAdding(true); setEditing(null); setForm(empty); }}><Plus className="w-4 h-4 mr-2" />Add Rule</Button>
      </div>

      {(adding || editing) && (
        <Card>
          <CardHeader><CardTitle>{editing ? "Edit Approval Rule" : "Add Approval Rule"}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><label className="text-sm font-medium">Doc Type *</label><Input value={form.doc_type} onChange={e => setForm(p => ({ ...p, doc_type: e.target.value }))} placeholder="e.g. PURCHASE_ORDER" /></div>
              <div><label className="text-sm font-medium">Approver Role *</label><Input value={form.approver_role} onChange={e => setForm(p => ({ ...p, approver_role: e.target.value }))} placeholder="e.g. manager" /></div>
              <div><label className="text-sm font-medium">Level</label><Input type="number" value={form.level} onChange={e => setForm(p => ({ ...p, level: parseInt(e.target.value) || 1 }))} /></div>
              <div><label className="text-sm font-medium">Min Amount</label><Input type="number" value={form.min_amount} onChange={e => setForm(p => ({ ...p, min_amount: parseFloat(e.target.value) || 0 }))} /></div>
              <div><label className="text-sm font-medium">Max Amount</label><Input type="number" value={form.max_amount} onChange={e => setForm(p => ({ ...p, max_amount: parseFloat(e.target.value) || 0 }))} /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => save.mutate(form)} disabled={save.isPending}><Check className="w-4 h-4 mr-1" />Save</Button>
              <Button variant="outline" onClick={cancel}><X className="w-4 h-4 mr-1" />Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {Object.entries(grouped).map(([docType, rules]) => (
        <Card key={docType}>
          <CardHeader className="pb-2"><CardTitle className="text-base">{docType}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Level</th>
                  <th className="text-left p-3 font-medium">Approver Role</th>
                  <th className="text-left p-3 font-medium">Min Amount</th>
                  <th className="text-left p-3 font-medium">Max Amount</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {rules.sort((a, b) => a.level - b.level).map(r => (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="p-3">L{r.level}</td>
                    <td className="p-3">{r.approver_role}</td>
                    <td className="p-3">{r.min_amount != null ? `₹${r.min_amount}` : "-"}</td>
                    <td className="p-3">{r.max_amount ? `₹${r.max_amount}` : "No limit"}</td>
                    <td className="p-3"><Badge variant={r.is_active !== false ? "default" : "secondary"}>{r.is_active !== false ? "Active" : "Inactive"}</Badge></td>
                    <td className="p-3 flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(r)}><Pencil className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
      {rows.length === 0 && !adding && <p className="text-center text-muted-foreground py-8">No approval rules configured</p>}
    </div>
  );
}
