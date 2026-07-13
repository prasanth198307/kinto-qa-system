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
import { Plus, FolderOpen, FileText } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (m: string, p: string, b?: any) =>
  fetch(p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());
const BLANK = { name: "", description: "", start_date: "", end_date: "", target_amount: "", location: "", status: "active" };

export default function NGOProjectsPage() {
  const fmt = (n: any) => `${sym}${Number(n || 0).toLocaleString("en-IN")}`;
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(BLANK);
  const [ucOpen, setUcOpen] = useState(false);
  const [uc, setUc] = useState<any>(null);

  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["ngo-projects"], queryFn: () => api("GET", "/api/ngo/projects") });
  const { data: budgetActual = [] } = useQuery<any[]>({ queryKey: ["ngo-project-budget"], queryFn: () => api("GET", "/api/ngo/reports/project-budget-actual") });

  const saveMut = useMutation({
    mutationFn: (p: any) => editing ? api("PUT", `/api/ngo/projects/${editing.id}`, p) : api("POST", "/api/ngo/projects", p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ngo-projects"] }); setOpen(false); setEditing(null); setForm(BLANK); toast({ title: editing ? "Project updated" : "Project created" }); },
  });

  const showUC = async (projectId: number) => {
    const d = await api("GET", `/api/ngo/fund-utilization-certificate/${projectId}`);
    setUc(d); setUcOpen(true);
  };

  const f = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));
  const budgetFor = (id: number) => budgetActual.find((b: any) => b.id === id || b.project_id === id);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><FolderOpen className="w-6 h-6 text-blue-600" /><h1 className="text-2xl font-bold">Projects</h1></div>
        <Button size="sm" onClick={() => { setEditing(null); setForm(BLANK); setOpen(true); }}><Plus className="w-4 h-4 mr-1" />New Project</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Location</TableHead><TableHead>Target</TableHead>
            <TableHead>Raised</TableHead><TableHead>Progress</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {projects.map((p: any) => {
              const ba = budgetFor(p.id);
              const raised = Number(ba?.raised ?? ba?.total_donations ?? 0);
              const pct = Number(p.target_amount) > 0 ? Math.min(100, Math.round(raised / Number(p.target_amount) * 100)) : 0;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{p.project_code}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-sm">{p.location || "—"}</TableCell>
                  <TableCell>{fmt(p.target_amount)}</TableCell>
                  <TableCell className="font-semibold">{fmt(raised)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${pct}%` }} /></div>
                      <span className="text-xs">{pct}%</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setForm({ ...BLANK, ...p }); setOpen(true); }}>Edit</Button>
                      <Button size="sm" variant="ghost" title="Utilization certificate" onClick={() => showUC(p.id)}><FileText className="w-3 h-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {!projects.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No projects yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Project" : "New Project"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label className="text-xs">Name</Label><Input value={form.name} onChange={e => f("name", e.target.value)} className="h-8" /></div>
            <div className="col-span-2"><Label className="text-xs">Description</Label><Input value={form.description || ""} onChange={e => f("description", e.target.value)} className="h-8" /></div>
            <div><Label className="text-xs">Start Date</Label><Input type="date" value={form.start_date ? String(form.start_date).slice(0,10) : ""} onChange={e => f("start_date", e.target.value)} className="h-8" /></div>
            <div><Label className="text-xs">End Date</Label><Input type="date" value={form.end_date ? String(form.end_date).slice(0,10) : ""} onChange={e => f("end_date", e.target.value)} className="h-8" /></div>
            <div><Label className="text-xs">Target Amount (${sym})</Label><Input type="number" value={form.target_amount} onChange={e => f("target_amount", e.target.value)} className="h-8" /></div>
            <div><Label className="text-xs">Location</Label><Input value={form.location || ""} onChange={e => f("location", e.target.value)} className="h-8" /></div>
            <div><Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => f("status", v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{["active","completed","on_hold","cancelled"].map(s => <SelectItem key={s} value={s}>{s.replace("_"," ").toUpperCase()}</SelectItem>)}</SelectContent>
              </Select></div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending || !form.name}>{editing ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={ucOpen} onOpenChange={setUcOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Fund Utilization Certificate — {uc?.project?.name}</DialogTitle></DialogHeader>
          {uc && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Total Received</div><div className="text-lg font-bold text-green-600">{fmt(uc.total_received)}</div></div>
                <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Total Utilized</div><div className="text-lg font-bold">{fmt(uc.total_utilized)}</div></div>
              </div>
              <div className="max-h-64 overflow-auto border rounded">
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Fund</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(uc.transactions || []).map((t: any) => (
                      <TableRow key={t.id}><TableCell className="text-sm">{String(t.transaction_date).slice(0,10)}</TableCell><TableCell className="text-sm">{t.fund_name}</TableCell><TableCell className="text-sm uppercase">{t.type}</TableCell><TableCell className="font-semibold">{fmt(t.amount)}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.print()}>Print Certificate</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
