import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Award } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (m: string, p: string, b?: any) =>
  fetch(p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());
const fmt = (n: any) => `${sym}${Number(n || 0).toLocaleString("en-IN")}`;
const BLANK = { grantor_name: "", grant_type: "government", project_id: "", applied_amount: "", approved_amount: "", application_date: "", approval_date: "", status: "applied", notes: "" };
const STATUS_BADGE: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  applied: "secondary", approved: "default", disbursed: "outline", rejected: "destructive", closed: "outline",
};

export default function NGOGrantsPage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(BLANK);

  const { data: grants = [] } = useQuery<any[]>({ queryKey: ["ngo-grants"], queryFn: () => api("GET", "/api/ngo/grants") });
  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["ngo-projects"], queryFn: () => api("GET", "/api/ngo/projects") });

  const saveMut = useMutation({
    mutationFn: (p: any) => editing ? api("PUT", `/api/ngo/grants/${editing.id}`, p) : api("POST", "/api/ngo/grants", p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ngo-grants"] }); setOpen(false); setEditing(null); setForm(BLANK); toast({ title: editing ? "Grant updated" : "Grant application added" }); },
  });

  const f = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));
  const projectName = (id: any) => projects.find((p: any) => p.id === id)?.name || "—";

  const totalApproved = grants.filter((g: any) => ["approved","disbursed"].includes(g.status)).reduce((s: number, g: any) => s + Number(g.approved_amount || 0), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Award className="w-6 h-6 text-amber-600" /><h1 className="text-2xl font-bold">Grants</h1></div>
        <Button size="sm" onClick={() => { setEditing(null); setForm(BLANK); setOpen(true); }}><Plus className="w-4 h-4 mr-1" />New Grant Application</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Applications</div><div className="text-xl font-bold">{grants.length}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Approved / Disbursed</div><div className="text-xl font-bold">{grants.filter((g: any) => ["approved","disbursed"].includes(g.status)).length}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Approved Amount</div><div className="text-xl font-bold text-green-600">{fmt(totalApproved)}</div></CardContent></Card>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Code</TableHead><TableHead>Grantor</TableHead><TableHead>Type</TableHead><TableHead>Project</TableHead>
            <TableHead>Applied</TableHead><TableHead>Approved</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {grants.map((g: any) => (
              <TableRow key={g.id}>
                <TableCell className="font-mono text-sm">{g.grant_code}</TableCell>
                <TableCell className="font-medium">{g.grantor_name}</TableCell>
                <TableCell className="text-sm uppercase">{g.grant_type}</TableCell>
                <TableCell className="text-sm">{projectName(g.project_id)}</TableCell>
                <TableCell>{fmt(g.applied_amount)}</TableCell>
                <TableCell className="font-semibold">{fmt(g.approved_amount)}</TableCell>
                <TableCell><Badge variant={STATUS_BADGE[g.status] || "secondary"}>{g.status}</Badge></TableCell>
                <TableCell><Button size="sm" variant="ghost" onClick={() => { setEditing(g); setForm({ ...BLANK, ...g }); setOpen(true); }}>Edit</Button></TableCell>
              </TableRow>
            ))}
            {!grants.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No grant applications</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Grant" : "New Grant Application"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label className="text-xs">Grantor Name</Label><Input value={form.grantor_name} onChange={e => f("grantor_name", e.target.value)} className="h-8" /></div>
            <div><Label className="text-xs">Grant Type</Label>
              <Select value={form.grant_type} onValueChange={v => f("grant_type", v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{["government","csr","foundation","international","individual"].map(t => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label className="text-xs">Project</Label>
              <Select value={String(form.project_id || "")} onValueChange={v => f("project_id", v)}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label className="text-xs">Applied Amount (₹)</Label><Input type="number" value={form.applied_amount} onChange={e => f("applied_amount", e.target.value)} className="h-8" /></div>
            <div><Label className="text-xs">Approved Amount (₹)</Label><Input type="number" value={form.approved_amount || ""} onChange={e => f("approved_amount", e.target.value)} className="h-8" /></div>
            <div><Label className="text-xs">Application Date</Label><Input type="date" value={form.application_date ? String(form.application_date).slice(0,10) : ""} onChange={e => f("application_date", e.target.value)} className="h-8" /></div>
            <div><Label className="text-xs">Approval Date</Label><Input type="date" value={form.approval_date ? String(form.approval_date).slice(0,10) : ""} onChange={e => f("approval_date", e.target.value)} className="h-8" /></div>
            <div><Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => f("status", v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{["applied","approved","disbursed","rejected","closed"].map(s => <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="col-span-2"><Label className="text-xs">Notes</Label><Input value={form.notes || ""} onChange={e => f("notes", e.target.value)} className="h-8" /></div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending || !form.grantor_name}>{editing ? "Update" : "Add"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
