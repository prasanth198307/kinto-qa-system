import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, RefreshCw } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const STATUSES = ["applied", "approved", "rejected", "received"];
const BENEFIT_TYPES = ["subsidy", "loan", "insurance", "equipment", "training", "other"];
const EMPTY = { scheme_name: "", department: "", benefit_type: "subsidy", eligibility: "", applied_date: "", status: "applied", amount_received: "" };

const statusColor: Record<string, any> = { applied: "secondary", approved: "default", rejected: "destructive", received: "outline" };

export default function SchemesPage() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [newStatus, setNewStatus] = useState("applied");
  const [amountReceived, setAmountReceived] = useState("");

  const { data: schemes = [] } = useQuery({ queryKey: ["ag-schemes"], queryFn: () => api("GET", "/api/agriculture/schemes") });

  const save = useMutation({
    mutationFn: (f: any) => api("POST", "/api/agriculture/schemes", f),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ag-schemes"] }); setAddOpen(false); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status, amount_received }: any) => api("PUT", `/api/agriculture/schemes/${id}/status`, { status, amount_received }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ag-schemes"] }); setStatusOpen(false); },
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const openStatus = (s: any) => { setSelected(s); setNewStatus(s.status); setAmountReceived(s.amount_received || ""); setStatusOpen(true); };

  const totalReceived = schemes.filter((s: any) => s.status === "received").reduce((acc: number, s: any) => acc + Number(s.amount_received || 0), 0);
  const approved = schemes.filter((s: any) => s.status === "approved").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Government Schemes</h1>
        <Button onClick={() => { setForm({ ...EMPTY }); setAddOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Application</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Applications</p><p className="text-3xl font-bold mt-1">{schemes.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Approved</p><p className="text-3xl font-bold mt-1 text-green-600">{approved}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Amount Received</p><p className="text-3xl font-bold mt-1">₹{totalReceived.toLocaleString("en-IN")}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scheme Name</TableHead><TableHead>Department</TableHead><TableHead>Benefit Type</TableHead>
                <TableHead>Eligibility</TableHead><TableHead>Applied Date</TableHead>
                <TableHead>Status</TableHead><TableHead>Amount Received</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schemes.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.scheme_name}</TableCell>
                  <TableCell>{s.department}</TableCell>
                  <TableCell><Badge variant="outline">{s.benefit_type}</Badge></TableCell>
                  <TableCell className="max-w-xs truncate">{s.eligibility}</TableCell>
                  <TableCell>{s.applied_date}</TableCell>
                  <TableCell><Badge variant={statusColor[s.status] || "secondary"}>{s.status}</Badge></TableCell>
                  <TableCell>{s.amount_received ? `₹${Number(s.amount_received).toLocaleString("en-IN")}` : "—"}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => openStatus(s)}><RefreshCw className="w-3 h-3 mr-1" />Status</Button></TableCell>
                </TableRow>
              ))}
              {schemes.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No scheme applications found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Scheme Application</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2"><label className="text-sm font-medium mb-1 block">Scheme Name</label><Input value={form.scheme_name} onChange={e => set("scheme_name", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Department</label><Input value={form.department} onChange={e => set("department", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Benefit Type</label>
              <Select value={form.benefit_type} onValueChange={v => set("benefit_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BENEFIT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><label className="text-sm font-medium mb-1 block">Eligibility Criteria</label><Input value={form.eligibility} onChange={e => set("eligibility", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Applied Date</label><Input type="date" value={form.applied_date} onChange={e => set("applied_date", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Initial Status</label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Status — {selected?.scheme_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {newStatus === "received" && <div><label className="text-sm font-medium mb-1 block">Amount Received (₹)</label><Input type="number" value={amountReceived} onChange={e => setAmountReceived(e.target.value)} /></div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusOpen(false)}>Cancel</Button>
            <Button onClick={() => updateStatus.mutate({ id: selected?.id, status: newStatus, amount_received: amountReceived })} disabled={updateStatus.isPending}>{updateStatus.isPending ? "Updating..." : "Update"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
