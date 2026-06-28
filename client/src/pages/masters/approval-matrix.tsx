import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const DOC_TYPES = ["Invoice","PO","Expense","Credit Note","Debit Note","Payment","Write-off"];
const EMPTY = { document_type: "", threshold_amount: "", approver_role: "", sequence_order: "1" };

export default function MastersApprovalMatrixPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: matrix = [] } = useQuery({ queryKey: ["/api/masters/approval-matrix"], queryFn: () => api("GET", "/api/masters/approval-matrix") });

  const addMutation = useMutation({
    mutationFn: (b: any) => api("POST", "/api/masters/approval-matrix", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/masters/approval-matrix"] }); toast({ title: "Approval rule added" }); setShowForm(false); setForm(EMPTY); },
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Approval Matrix</h1>
        <Button onClick={() => setShowForm(s => !s)}>Add Rule</Button>
      </div>
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Approval Rule</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Select value={form.document_type} onValueChange={v => set("document_type", v)}>
              <SelectTrigger><SelectValue placeholder="Document Type" /></SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Threshold Amount" type="number" value={form.threshold_amount} onChange={e => set("threshold_amount", e.target.value)} />
            <Input placeholder="Approver Role (e.g. Manager)" value={form.approver_role} onChange={e => set("approver_role", e.target.value)} />
            <Input placeholder="Sequence Order" type="number" value={form.sequence_order} onChange={e => set("sequence_order", e.target.value)} />
            <div className="col-span-2 flex gap-2">
              <Button onClick={() => addMutation.mutate(form)}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Document Type</TableHead><TableHead>Condition</TableHead><TableHead>Approver Role</TableHead>
              <TableHead>Approver Name</TableHead><TableHead>Sequence</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {Array.isArray(matrix) && matrix.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell>{m.document_type}</TableCell>
                  <TableCell>Amount &gt; &#8377;{fmt(m.threshold_amount)}</TableCell>
                  <TableCell>{m.approver_role}</TableCell><TableCell>{m.approver_name || "-"}</TableCell>
                  <TableCell>{m.sequence || m.sequence_order}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
