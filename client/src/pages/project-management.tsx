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
import { Plus, Trash2, Briefcase, Clock, Target, FileText, TrendingUp, ChevronRight, Pencil } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const STATUS_COLORS: Record<string, string> = { active: "default", completed: "secondary", on_hold: "secondary", cancelled: "destructive" };

// ─── Project Form ──────────────────────────────────────────────────────────────
function ProjectForm({ project, employees, onSave, onCancel }: any) {
  const { currency_symbol: sym } = useTenantConfig();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: project?.name || "", code: project?.code || "", clientName: project?.client_name || "",
    clientGstin: project?.client_gstin || "", startDate: project?.start_date?.split("T")[0] || "",
    endDate: project?.end_date?.split("T")[0] || "", contractValue: project?.contract_value || "",
    projectManagerId: project?.project_manager_id ? String(project.project_manager_id) : "",
    description: project?.description || "", status: project?.status || "active",
  });

  const mutation = useMutation({
    mutationFn: (d: any) => project
      ? apiRequest("PUT", `/api/projects/projects/${project.id}`, d)
      : apiRequest("POST", "/api/projects/projects", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/projects/projects"] }); toast({ title: project ? "Project updated" : "Project created" }); onSave(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Project Name <span className="text-destructive">*</span></Label>
          <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} data-testid="input-project-name" />
        </div>
        <div>
          <Label>Project Code</Label>
          <Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="e.g. PROJ-001" />
        </div>
        <div>
          <Label>Client Name</Label>
          <Input value={form.clientName} onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))} />
        </div>
        <div>
          <Label>Client GSTIN</Label>
          <Input value={form.clientGstin} onChange={e => setForm(p => ({ ...p, clientGstin: e.target.value }))} />
        </div>
        <div>
          <Label>Start Date</Label>
          <Input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
        </div>
        <div>
          <Label>End Date</Label>
          <Input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
        </div>
        <div>
          <Label>Contract Value (${sym})</Label>
          <Input type="number" value={form.contractValue} onChange={e => setForm(p => ({ ...p, contractValue: e.target.value }))} />
        </div>
        <div>
          <Label>Project Manager</Label>
          <Select value={form.projectManagerId} onValueChange={v => setForm(p => ({ ...p, projectManagerId: v }))}>
            <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
            <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {project && (
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["active", "completed", "on_hold", "cancelled"].map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => mutation.mutate({ ...form, contractValue: Number(form.contractValue) || 0, projectManagerId: form.projectManagerId ? Number(form.projectManagerId) : null })}
          disabled={mutation.isPending || !form.name} data-testid="button-save-project">
          {mutation.isPending ? "Saving..." : "Save Project"}
        </Button>
      </div>
    </div>
  );
}

// ─── Project Detail View ───────────────────────────────────────────────────────
function ProjectDetail({ projectId, onBack }: { projectId: number; onBack: () => void }) {
  const { currency_symbol: sym } = useTenantConfig();
  const { toast } = useToast();
  const [boqDialogOpen, setBoqDialogOpen] = useState(false);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [tsDialogOpen, setTsDialogOpen] = useState(false);
  const [boqForm, setBoqForm] = useState({ description: "", uom: "", quantity: "", rate: "" });
  const [msForm, setMsForm] = useState({ title: "", dueDate: "", amount: "", percentage: "" });
  const [tsForm, setTsForm] = useState({ workDate: new Date().toISOString().split("T")[0], hours: "", description: "", isBillable: true });
  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["/api/hr/employees"] });

  const { data, isLoading, refetch } = useQuery<any>({ queryKey: ["/api/projects/projects", projectId] });

  const boqMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/projects/projects/${projectId}/boq`, { ...boqForm, quantity: Number(boqForm.quantity), rate: Number(boqForm.rate) }),
    onSuccess: () => { refetch(); toast({ title: "BOQ item added" }); setBoqDialogOpen(false); setBoqForm({ description: "", uom: "", quantity: "", rate: "" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const msMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/projects/projects/${projectId}/milestones`, { ...msForm, amount: Number(msForm.amount), percentage: Number(msForm.percentage) || null }),
    onSuccess: () => { refetch(); toast({ title: "Milestone added" }); setMilestoneDialogOpen(false); setMsForm({ title: "", dueDate: "", amount: "", percentage: "" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const tsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/hr/timesheets", { ...tsForm, projectId, hours: Number(tsForm.hours) }),
    onSuccess: () => { refetch(); toast({ title: "Timesheet entry added" }); setTsDialogOpen(false); setTsForm({ workDate: new Date().toISOString().split("T")[0], hours: "", description: "", isBillable: true }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const msActionMutation = useMutation({
    mutationFn: ({ id, status }: any) => apiRequest("PUT", `/api/projects/milestones/${id}`, { status, title: data?.milestones.find((m: any) => m.id === id)?.title, amount: data?.milestones.find((m: any) => m.id === id)?.amount }),
    onSuccess: () => { refetch(); toast({ title: "Milestone updated" }); },
  });

  const deleteBOQ = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/projects/boq-items/${id}`),
    onSuccess: () => refetch(),
  });

  const deleteMS = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/projects/milestones/${id}`),
    onSuccess: () => refetch(),
  });

  const { data: pnl } = useQuery<any>({ queryKey: ["/api/projects/projects", projectId, "pnl"] });

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading project...</div>;
  const { project, boq, milestones, timesheets, invoices, purchaseOrders } = data || {};

  const boqTotal = (boq || []).reduce((s: number, b: any) => s + Number(b.amount || 0), 0);
  const msTotal = (milestones || []).reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
  const msInvoiced = (milestones || []).filter((m: any) => m.status === "invoiced").reduce((s: number, m: any) => s + Number(m.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}><ChevronRight className="w-4 h-4 rotate-180" /></Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold">{project?.name}</h2>
          <p className="text-sm text-muted-foreground">{project?.client_name} {project?.code ? `· ${project.code}` : ""}</p>
        </div>
        <Badge variant={STATUS_COLORS[project?.status] as any}>{project?.status?.replace("_", " ")}</Badge>
      </div>

      {/* P&L Summary */}
      {pnl && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Revenue", value: `${sym}${Number(pnl.revenue).toLocaleString("en-IN")}` },
            { label: "Cost (POs)", value: `${sym}${Number(pnl.cost).toLocaleString("en-IN")}` },
            { label: "Gross Profit", value: `${sym}${Number(pnl.gross_profit).toLocaleString("en-IN")}`, color: pnl.gross_profit >= 0 ? "text-green-600" : "text-destructive" },
            { label: "Billable Hours", value: `${Number(pnl.total_hours).toFixed(1)} hrs` },
          ].map(s => (
            <Card key={s.label}><CardContent className="p-3"><p className="text-xs text-muted-foreground">{s.label}</p><p className={`text-lg font-bold ${s.color || ""}`}>{s.value}</p></CardContent></Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="boq">
        <TabsList className="flex-wrap">
          <TabsTrigger value="boq">BOQ ({boq?.length || 0})</TabsTrigger>
          <TabsTrigger value="milestones">Milestones ({milestones?.length || 0})</TabsTrigger>
          <TabsTrigger value="timesheets">Timesheets ({timesheets?.length || 0})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({invoices?.length || 0})</TabsTrigger>
        </TabsList>

        {/* BOQ */}
        <TabsContent value="boq" className="space-y-3 mt-3">
          <div className="flex justify-between items-center gap-2">
            <p className="text-sm text-muted-foreground">BOQ Total: <strong>{sym}{boqTotal.toLocaleString("en-IN")}</strong></p>
            <Button size="sm" onClick={() => setBoqDialogOpen(true)} data-testid="button-add-boq"><Plus className="w-3 h-3 mr-1" />Add Item</Button>
          </div>
          {boq?.length === 0 ? <p className="text-center py-6 text-muted-foreground text-sm">No BOQ items</p> : (
            <Card><CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="bg-muted/50"><tr><th className="text-left p-3">Description</th><th className="p-3">UOM</th><th className="text-right p-3">Qty</th><th className="text-right p-3">Rate</th><th className="text-right p-3">Amount</th><th className="p-3"></th></tr></thead>
                <tbody>
                  {boq?.map((b: any) => (
                    <tr key={b.id} className="border-t">
                      <td className="p-3">{b.description}</td><td className="p-3 text-center">{b.uom || "—"}</td>
                      <td className="p-3 text-right">{b.quantity || "—"}</td><td className="p-3 text-right">{b.rate ? `${sym}${Number(b.rate).toLocaleString("en-IN")}` : "—"}</td>
                      <td className="p-3 text-right font-medium">{sym}{Number(b.amount || 0).toLocaleString("en-IN")}</td>
                      <td className="p-3 text-right"><Button size="icon" variant="ghost" onClick={() => deleteBOQ.mutate(b.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* Milestones */}
        <TabsContent value="milestones" className="space-y-3 mt-3">
          <div className="flex justify-between items-center gap-2">
            <p className="text-sm text-muted-foreground">Total: {sym}{msTotal.toLocaleString("en-IN")} · Invoiced: {sym}{msInvoiced.toLocaleString("en-IN")}</p>
            <Button size="sm" onClick={() => setMilestoneDialogOpen(true)} data-testid="button-add-milestone"><Plus className="w-3 h-3 mr-1" />Add Milestone</Button>
          </div>
          {milestones?.length === 0 ? <p className="text-center py-6 text-muted-foreground text-sm">No milestones</p> : (
            <div className="space-y-2">
              {milestones?.map((m: any) => (
                <Card key={m.id}>
                  <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{m.title}</p>
                      <p className="text-xs text-muted-foreground">{m.due_date ? new Date(m.due_date).toLocaleDateString("en-IN") : "No due date"} {m.percentage ? `· ${m.percentage}%` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{sym}{Number(m.amount).toLocaleString("en-IN")}</span>
                      <Select value={m.status} onValueChange={v => msActionMutation.mutate({ id: m.id, status: v })}>
                        <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>{["pending", "in_progress", "completed", "invoiced"].map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" onClick={() => deleteMS.mutate(m.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Timesheets */}
        <TabsContent value="timesheets" className="space-y-3 mt-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setTsDialogOpen(true)} data-testid="button-add-timesheet"><Plus className="w-3 h-3 mr-1" />Log Hours</Button>
          </div>
          {timesheets?.length === 0 ? <p className="text-center py-6 text-muted-foreground text-sm">No timesheet entries</p> : (
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr><th className="text-left p-3">Employee</th><th className="text-left p-3">Date</th><th className="text-right p-3">Hours</th><th className="text-left p-3">Description</th><th className="text-left p-3">Billable</th></tr></thead>
                <tbody>
                  {timesheets?.map((t: any) => (
                    <tr key={t.id} className="border-t">
                      <td className="p-3 font-medium">{t.employee_name}</td>
                      <td className="p-3 text-muted-foreground">{new Date(t.work_date).toLocaleDateString("en-IN")}</td>
                      <td className="p-3 text-right font-semibold">{t.hours}</td>
                      <td className="p-3 text-muted-foreground">{t.description || "—"}</td>
                      <td className="p-3">{t.is_billable ? <Badge variant="default" className="text-xs">Yes</Badge> : <Badge variant="secondary" className="text-xs">No</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* Invoices */}
        <TabsContent value="invoices" className="space-y-3 mt-3">
          {invoices?.length === 0 && purchaseOrders?.length === 0 ? <p className="text-center py-6 text-muted-foreground text-sm">No invoices or POs linked to this project</p> : (
            <div className="space-y-3">
              {invoices?.length > 0 && (<>
                <p className="text-sm font-medium">Invoices</p>
                {invoices.map((inv: any) => (
                  <Card key={inv.id}><CardContent className="p-3 flex justify-between gap-2">
                    <div><p className="font-medium">{inv.invoice_number}</p><p className="text-xs text-muted-foreground">{new Date(inv.invoice_date).toLocaleDateString("en-IN")}</p></div>
                    <div className="text-right"><p className="font-semibold">{sym}{Number(inv.total_amount).toLocaleString("en-IN")}</p><Badge variant="secondary" className="text-xs">{inv.status}</Badge></div>
                  </CardContent></Card>
                ))}
              </>)}
              {purchaseOrders?.length > 0 && (<>
                <p className="text-sm font-medium">Purchase Orders</p>
                {purchaseOrders.map((po: any) => (
                  <Card key={po.id}><CardContent className="p-3 flex justify-between gap-2">
                    <div><p className="font-medium">{po.po_number}</p><p className="text-xs text-muted-foreground">{new Date(po.po_date).toLocaleDateString("en-IN")}</p></div>
                    <div className="text-right"><p className="font-semibold">{sym}{Number(po.total_amount).toLocaleString("en-IN")}</p><Badge variant="secondary" className="text-xs">{po.status}</Badge></div>
                  </CardContent></Card>
                ))}
              </>)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* BOQ Dialog */}
      <Dialog open={boqDialogOpen} onOpenChange={setBoqDialogOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Add BOQ Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Description <span className="text-destructive">*</span></Label><Input value={boqForm.description} onChange={e => setBoqForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>UOM</Label><Input value={boqForm.uom} onChange={e => setBoqForm(p => ({ ...p, uom: e.target.value }))} placeholder="m²" /></div>
              <div><Label>Quantity</Label><Input type="number" value={boqForm.quantity} onChange={e => setBoqForm(p => ({ ...p, quantity: e.target.value }))} /></div>
              <div><Label>Rate (${sym})</Label><Input type="number" value={boqForm.rate} onChange={e => setBoqForm(p => ({ ...p, rate: e.target.value }))} /></div>
            </div>
            {boqForm.quantity && boqForm.rate && <p className="text-sm font-medium">Amount: {sym}{(Number(boqForm.quantity) * Number(boqForm.rate)).toLocaleString("en-IN")}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBoqDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => boqMutation.mutate()} disabled={boqMutation.isPending || !boqForm.description} data-testid="button-save-boq">{boqMutation.isPending ? "Saving..." : "Add"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Milestone Dialog */}
      <Dialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Add Milestone</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title <span className="text-destructive">*</span></Label><Input value={msForm.title} onChange={e => setMsForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Due Date</Label><Input type="date" value={msForm.dueDate} onChange={e => setMsForm(p => ({ ...p, dueDate: e.target.value }))} /></div>
              <div><Label>% of Contract</Label><Input type="number" value={msForm.percentage} onChange={e => setMsForm(p => ({ ...p, percentage: e.target.value }))} /></div>
            </div>
            <div><Label>Amount (${sym}) <span className="text-destructive">*</span></Label><Input type="number" value={msForm.amount} onChange={e => setMsForm(p => ({ ...p, amount: e.target.value }))} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMilestoneDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => msMutation.mutate()} disabled={msMutation.isPending || !msForm.title || !msForm.amount} data-testid="button-save-milestone">{msMutation.isPending ? "Saving..." : "Add"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Timesheet Dialog */}
      <Dialog open={tsDialogOpen} onOpenChange={setTsDialogOpen}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Log Hours</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={tsForm.workDate} onChange={e => setTsForm(p => ({ ...p, workDate: e.target.value }))} /></div>
              <div><Label>Hours <span className="text-destructive">*</span></Label><Input type="number" step="0.5" value={tsForm.hours} onChange={e => setTsForm(p => ({ ...p, hours: e.target.value }))} /></div>
            </div>
            <div><Label>Description</Label><Input value={tsForm.description} onChange={e => setTsForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="billable" checked={tsForm.isBillable} onChange={e => setTsForm(p => ({ ...p, isBillable: e.target.checked }))} />
              <label htmlFor="billable" className="text-sm">Billable hours</label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTsDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => tsMutation.mutate()} disabled={tsMutation.isPending || !tsForm.hours} data-testid="button-save-timesheet">{tsMutation.isPending ? "Saving..." : "Log"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ProjectManagementPage() {
  const { currency_symbol: sym } = useTenantConfig();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: projects = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/projects/projects"] });
  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["/api/hr/employees"] });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/projects/projects/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/projects/projects"] }); toast({ title: "Project deleted" }); },
  });

  if (selectedProjectId) {
    return (
      <div className="p-4 sm:p-6">
        <ProjectDetail projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />
      </div>
    );
  }

  const filtered = statusFilter === "all" ? projects : projects.filter((p: any) => p.status === statusFilter);

  const stats = {
    active: projects.filter((p: any) => p.status === "active").length,
    totalValue: projects.filter((p: any) => p.status === "active").reduce((s: number, p: any) => s + Number(p.contract_value || 0), 0),
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Project Management</h1>
          <p className="text-sm text-muted-foreground">Track projects, BOQ, milestones, timesheets & billing</p>
        </div>
        <Button onClick={() => { setEditingProject(null); setDialogOpen(true); }} data-testid="button-new-project">
          <Plus className="w-4 h-4 mr-1" />New Project
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Projects", value: stats.active, icon: Briefcase },
          { label: "Active Contract Value", value: `${sym}${(stats.totalValue / 1e5).toFixed(1)}L`, icon: TrendingUp },
          { label: "Total Projects", value: projects.length, icon: FileText },
          { label: "Completed", value: projects.filter((p: any) => p.status === "completed").length, icon: Target },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3 flex items-center gap-3">
            <s.icon className="w-6 h-6 text-muted-foreground shrink-0" />
            <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "active", "completed", "on_hold", "cancelled"].map(s => (
          <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)} data-testid={`filter-${s}`}>
            {s === "all" ? "All" : s.replace("_", " ").replace(/^\w/, c => c.toUpperCase())}
          </Button>
        ))}
      </div>

      {isLoading ? <p className="text-center py-12 text-muted-foreground">Loading...</p> : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><Briefcase className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No projects found</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p: any) => (
            <Card key={p.id} className="cursor-pointer hover-elevate" onClick={() => setSelectedProjectId(p.id)} data-testid={`card-project-${p.id}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    {p.client_name && <p className="text-xs text-muted-foreground">{p.client_name}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={STATUS_COLORS[p.status] as any} className="text-xs shrink-0">{p.status.replace("_", " ")}</Badge>
                    <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); setEditingProject(p); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); deleteMutation.mutate(p.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
                {p.contract_value > 0 && <p className="text-sm font-semibold">{sym}{Number(p.contract_value).toLocaleString("en-IN")}</p>}
                <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
                  {p.start_date && <span>{new Date(p.start_date).toLocaleDateString("en-IN")}</span>}
                  {p.end_date && <span>→ {new Date(p.end_date).toLocaleDateString("en-IN")}</span>}
                  {p.manager_name && <span>· {p.manager_name}</span>}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ChevronRight className="w-3 h-3" />Click to view details
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingProject ? "Edit Project" : "New Project"}</DialogTitle></DialogHeader>
          <ProjectForm project={editingProject} employees={employees} onSave={() => setDialogOpen(false)} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
