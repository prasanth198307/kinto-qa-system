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
import { Plus, Trash2, Clock, CheckCircle, Pencil } from "lucide-react";

function TimesheetForm({ entry, employees, projects, onSave, onCancel }: any) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    employeeId: entry?.employee_id ? String(entry.employee_id) : "",
    projectId: entry?.project_id ? String(entry.project_id) : "",
    clientName: entry?.client_name || "",
    workDate: entry?.work_date?.split("T")[0] || new Date().toISOString().split("T")[0],
    hours: entry?.hours || "",
    description: entry?.description || "",
    isBillable: entry?.is_billable !== false,
  });

  const mutation = useMutation({
    mutationFn: (d: any) => entry
      ? apiRequest("PUT", `/api/hr/timesheets/${entry.id}`, d)
      : apiRequest("POST", "/api/hr/timesheets", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/timesheets"] });
      toast({ title: entry ? "Entry updated" : "Hours logged" });
      onSave();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Employee <span className="text-destructive">*</span></Label>
          <Select value={form.employeeId} onValueChange={v => setForm(p => ({ ...p, employeeId: v }))}>
            <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
            <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Project (optional)</Label>
          <Select value={form.projectId||"__none__"} onValueChange={v => setForm(p => ({ ...p, projectId: v === "__none__" ? "" : v }))}>
            <SelectTrigger><SelectValue placeholder="No project" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No project</SelectItem>
              {projects.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Work Date <span className="text-destructive">*</span></Label>
          <Input type="date" value={form.workDate} onChange={e => setForm(p => ({ ...p, workDate: e.target.value }))} data-testid="input-work-date" />
        </div>
        <div>
          <Label>Hours <span className="text-destructive">*</span></Label>
          <Input type="number" step="0.5" min="0.5" max="24" value={form.hours} onChange={e => setForm(p => ({ ...p, hours: e.target.value }))} placeholder="e.g. 8" data-testid="input-hours" />
        </div>
        <div>
          <Label>Client Name</Label>
          <Input value={form.clientName} onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))} />
        </div>
        <div>
          <Label>Description</Label>
          <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Work done..." />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="billable" checked={form.isBillable} onChange={e => setForm(p => ({ ...p, isBillable: e.target.checked }))} />
        <label htmlFor="billable" className="text-sm">Billable hours</label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => mutation.mutate({ ...form, employeeId: Number(form.employeeId), projectId: form.projectId ? Number(form.projectId) : null, hours: Number(form.hours) })}
          disabled={mutation.isPending || !form.employeeId || !form.hours} data-testid="button-save-timesheet">
          {mutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

export default function TimesheetsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<any>(null);
  const [filters, setFilters] = useState({ employeeId: "", projectId: "", fromDate: "", toDate: "" });

  const params = new URLSearchParams();
  if (filters.employeeId) params.set("employeeId", filters.employeeId);
  if (filters.projectId)  params.set("projectId", filters.projectId);
  if (filters.fromDate)   params.set("fromDate", filters.fromDate);
  if (filters.toDate)     params.set("toDate", filters.toDate);

  const { data: entries = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/hr/timesheets", filters] });
  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["/api/hr/employees"] });
  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["/api/projects/projects"] });

  const approveMutation = useMutation({
    mutationFn: (id: number) => {
      const entry = (entries as any[]).find((e: any) => e.id === id);
      return apiRequest("PUT", `/api/hr/timesheets/${id}`, { ...entry, approved: true });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/timesheets"] }); toast({ title: "Timesheet approved" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/hr/timesheets/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/timesheets"] }); toast({ title: "Entry deleted" }); },
  });

  const totalHours = (entries as any[]).reduce((s: number, e: any) => s + Number(e.hours || 0), 0);
  const billableHours = (entries as any[]).filter((e: any) => e.is_billable).reduce((s: number, e: any) => s + Number(e.hours || 0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Timesheets</h1>
          <p className="text-sm text-muted-foreground">Track employee billable and non-billable hours</p>
        </div>
        <Button onClick={() => { setEditEntry(null); setDialogOpen(true); }} data-testid="button-log-hours">
          <Plus className="w-4 h-4 mr-1" />Log Hours
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Hours (shown)", value: totalHours.toFixed(1) },
          { label: "Billable Hours", value: billableHours.toFixed(1) },
          { label: "Non-Billable", value: (totalHours - billableHours).toFixed(1) },
          { label: "Entries", value: entries.length },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3"><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></CardContent></Card>
        ))}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Select value={filters.employeeId||"__none__"} onValueChange={v => setFilters(p => ({ ...p, employeeId: v === "__none__" ? "" : v }))}>
          <SelectTrigger><SelectValue placeholder="All employees" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">All Employees</SelectItem>
            {(employees as any[]).map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.first_name} {e.last_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.projectId||"__none__"} onValueChange={v => setFilters(p => ({ ...p, projectId: v === "__none__" ? "" : v }))}>
          <SelectTrigger><SelectValue placeholder="All projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">All Projects</SelectItem>
            {(projects as any[]).map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" placeholder="From" value={filters.fromDate} onChange={e => setFilters(p => ({ ...p, fromDate: e.target.value }))} />
        <Input type="date" placeholder="To" value={filters.toDate} onChange={e => setFilters(p => ({ ...p, toDate: e.target.value }))} />
      </div>

      {isLoading ? <p className="text-center py-12 text-muted-foreground">Loading...</p> : entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><Clock className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No timesheet entries</p></div>
      ) : (
        <Card><CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Employee</th><th className="text-left p-3">Date</th>
                <th className="text-left p-3">Project / Client</th><th className="text-right p-3">Hours</th>
                <th className="text-left p-3">Description</th><th className="text-left p-3">Billable</th>
                <th className="text-left p-3">Approved</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {(entries as any[]).map((e: any) => (
                <tr key={e.id} className="border-t" data-testid={`row-timesheet-${e.id}`}>
                  <td className="p-3 font-medium">{e.employee_name}</td>
                  <td className="p-3 text-muted-foreground">{new Date(e.work_date).toLocaleDateString("en-IN")}</td>
                  <td className="p-3 text-muted-foreground">{e.project_name || e.client_name || "—"}</td>
                  <td className="p-3 text-right font-semibold">{e.hours}</td>
                  <td className="p-3 text-muted-foreground">{e.description || "—"}</td>
                  <td className="p-3">{e.is_billable ? <Badge variant="default" className="text-xs">Yes</Badge> : <Badge variant="secondary" className="text-xs">No</Badge>}</td>
                  <td className="p-3">
                    {e.approved
                      ? <Badge variant="secondary" className="text-xs"><CheckCircle className="w-3 h-3 mr-1 inline" />Yes</Badge>
                      : <Button size="sm" className="text-xs h-7" variant="outline" onClick={() => approveMutation.mutate(e.id)}>Approve</Button>}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditEntry(e); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(e.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editEntry ? "Edit Timesheet Entry" : "Log Hours"}</DialogTitle></DialogHeader>
          <TimesheetForm entry={editEntry} employees={employees} projects={projects} onSave={() => setDialogOpen(false)} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
