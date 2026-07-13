import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";
import { Plus, Pencil, Trash2, Building2, Briefcase, Clock, Calendar, CalendarDays, DollarSign, Layers, FileText, MapPin, Shield } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

function MasterTable({ columns, rows, onEdit, onDelete }: any) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>{columns.map((c: any) => <th key={c.key} className="px-3 py-2 text-left font-medium text-muted-foreground">{c.label}</th>)}
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={columns.length + 1} className="px-3 py-8 text-center text-muted-foreground">No records found</td></tr>}
          {rows.map((row: any) => (
            <tr key={row.id} className="border-t hover-elevate">
              {columns.map((c: any) => <td key={c.key} className="px-3 py-2">{c.render ? c.render(row[c.key], row) : row[c.key] ?? "—"}</td>)}
              <td className="px-3 py-2 text-right">
                <div className="flex gap-1 justify-end">
                  <Button size="icon" variant="ghost" onClick={() => onEdit(row)} data-testid={`btn-edit-${row.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => onDelete(row.id)} data-testid={`btn-delete-${row.id}`}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Departments ──────────────────────────────────────────────────────────────
function DepartmentsTab() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const { data = [] } = useQuery({ queryKey: ["/api/hr/departments"] });
  const save = useMutation({
    mutationFn: (d: any) => apiRequest(editing ? "PUT" : "POST", editing ? `/api/hr/departments/${editing.id}` : "/api/hr/departments", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/departments"] }); setOpen(false); toast({ title: editing ? "Department updated" : "Department added" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/hr/departments/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/departments"] }); toast({ title: "Department deleted" }); },
  });

  const openAdd = () => { setEditing(null); setForm({ name: "", description: "" }); setOpen(true); };
  const openEdit = (r: any) => { setEditing(r); setForm({ name: r.name, description: r.description || "" }); setOpen(true); };

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button size="sm" onClick={openAdd} data-testid="btn-add-department"><Plus className="h-4 w-4 mr-1" />Add Department</Button></div>
      <MasterTable columns={[{ key: "name", label: "Name" }, { key: "description", label: "Description" }]} rows={data as any[]} onEdit={openEdit} onDelete={(id: number) => del.mutate(id)} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Department" : "Add Department"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-department-name" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <Button className="w-full" disabled={!form.name || save.isPending} onClick={() => save.mutate(form)} data-testid="btn-save-department">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Designations ─────────────────────────────────────────────────────────────
function DesignationsTab() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", departmentId: "", grade: "" });

  const { data: depts = [] } = useQuery<any[]>({ queryKey: ["/api/hr/departments"] });
  const { data = [] } = useQuery({ queryKey: ["/api/hr/designations"] });
  const save = useMutation({
    mutationFn: (d: any) => apiRequest(editing ? "PUT" : "POST", editing ? `/api/hr/designations/${editing.id}` : "/api/hr/designations", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/designations"] }); setOpen(false); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/hr/designations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/hr/designations"] }),
  });

  const openAdd = () => { setEditing(null); setForm({ name: "", departmentId: "", grade: "" }); setOpen(true); };
  const openEdit = (r: any) => { setEditing(r); setForm({ name: r.name, departmentId: String(r.department_id || ""), grade: r.grade || "" }); setOpen(true); };

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Add Designation</Button></div>
      <MasterTable columns={[{ key: "name", label: "Designation" }, { key: "department_name", label: "Department" }, { key: "grade", label: "Grade" }]} rows={data as any[]} onEdit={openEdit} onDelete={(id: number) => del.mutate(id)} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Designation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Department</Label>
              <Select value={form.departmentId} onValueChange={v => setForm(f => ({ ...f, departmentId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{(depts as any[]).map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Grade</Label><Input value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} placeholder="e.g. L1, L2, Manager" /></div>
            <Button className="w-full" disabled={!form.name || save.isPending} onClick={() => save.mutate({ ...form, departmentId: form.departmentId ? Number(form.departmentId) : null })}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Shifts ───────────────────────────────────────────────────────────────────
function ShiftsTab() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", startTime: "", endTime: "", breakMinutes: "30", weeklyOff: "sunday" });

  const { data = [] } = useQuery({ queryKey: ["/api/hr/shifts"] });
  const save = useMutation({
    mutationFn: (d: any) => apiRequest(editing ? "PUT" : "POST", editing ? `/api/hr/shifts/${editing.id}` : "/api/hr/shifts", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/shifts"] }); setOpen(false); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/hr/shifts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/hr/shifts"] }),
  });

  const openAdd = () => { setEditing(null); setForm({ name: "", startTime: "", endTime: "", breakMinutes: "30", weeklyOff: "sunday" }); setOpen(true); };
  const openEdit = (r: any) => { setEditing(r); setForm({ name: r.name, startTime: r.start_time || "", endTime: r.end_time || "", breakMinutes: String(r.break_minutes || 30), weeklyOff: r.weekly_off || "sunday" }); setOpen(true); };

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Add Shift</Button></div>
      <MasterTable columns={[{ key: "name", label: "Shift" }, { key: "start_time", label: "Start" }, { key: "end_time", label: "End" }, { key: "weekly_off", label: "Weekly Off" }]} rows={data as any[]} onEdit={openEdit} onDelete={(id: number) => del.mutate(id)} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Shift</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Shift Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Day Shift, Night Shift" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Start Time</Label><Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} /></div>
              <div><Label>End Time</Label><Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} /></div>
            </div>
            <div><Label>Break (minutes)</Label><Input type="number" value={form.breakMinutes} onChange={e => setForm(f => ({ ...f, breakMinutes: e.target.value }))} /></div>
            <div><Label>Weekly Off</Label>
              <Select value={form.weeklyOff} onValueChange={v => setForm(f => ({ ...f, weeklyOff: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sunday">Sunday</SelectItem>
                  <SelectItem value="saturday_sunday">Saturday & Sunday</SelectItem>
                  <SelectItem value="alternate_saturday">Alternate Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={!form.name || save.isPending} onClick={() => save.mutate({ ...form, breakMinutes: Number(form.breakMinutes) })}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Leave Types ──────────────────────────────────────────────────────────────
const EMP_TYPES = [
  { value: "permanent", label: "Permanent" },
  { value: "consultant", label: "Consultant" },
  { value: "contract", label: "Contract" },
  { value: "intern", label: "Intern" },
];

function LeaveTypesTab() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const defaultForm = { name: "", code: "", annualDays: "0", isCarryForward: false, maxCarryForward: "0", isEncashable: false, isPaidLeave: true, applicableEmpTypes: ["permanent", "consultant", "contract", "intern"] as string[], maxPerMonth: "0" };
  const [form, setForm] = useState(defaultForm);

  const { data = [] } = useQuery({ queryKey: ["/api/hr/leave-types"] });
  const save = useMutation({
    mutationFn: (d: any) => apiRequest(editing ? "PUT" : "POST", editing ? `/api/hr/leave-types/${editing.id}` : "/api/hr/leave-types", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/leave-types"] }); setOpen(false); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/hr/leave-types/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/hr/leave-types"] }),
  });

  const parseTypes = (raw: string | null | undefined) =>
    raw ? raw.split(",").map(t => t.trim()).filter(Boolean) : ["permanent", "consultant", "contract", "intern"];

  const openAdd = () => { setEditing(null); setForm(defaultForm); setOpen(true); };
  const openEdit = (r: any) => {
    setEditing(r);
    setForm({ name: r.name, code: r.code, annualDays: String(r.annual_days), isCarryForward: r.is_carry_forward, maxCarryForward: String(r.max_carry_forward), isEncashable: r.is_encashable, isPaidLeave: r.is_paid_leave, applicableEmpTypes: parseTypes(r.applicable_emp_types), maxPerMonth: String(r.max_per_month ?? 0) });
    setOpen(true);
  };

  const toggleType = (val: string) => setForm(f => ({
    ...f,
    applicableEmpTypes: f.applicableEmpTypes.includes(val)
      ? f.applicableEmpTypes.filter(t => t !== val)
      : [...f.applicableEmpTypes, val],
  }));

  const handleSave = () => {
    if (!form.applicableEmpTypes.length) return toast({ title: "Select at least one employee type", variant: "destructive" });
    save.mutate({ ...form, annualDays: Number(form.annualDays), maxCarryForward: Number(form.maxCarryForward), maxPerMonth: Number(form.maxPerMonth), applicableEmpTypes: form.applicableEmpTypes.join(",") });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Add Leave Type</Button></div>
      <MasterTable columns={[
        { key: "name", label: "Leave Type" }, { key: "code", label: "Code" }, { key: "annual_days", label: "Days/Year" },
        { key: "is_paid_leave", label: "Paid", render: (v: boolean) => <Badge variant={v ? "default" : "secondary"}>{v ? "Paid" : "Unpaid"}</Badge> },
        { key: "applicable_emp_types", label: "Applies To", render: (v: string) => (
          <div className="flex flex-wrap gap-1">
            {parseTypes(v).map(t => <Badge key={t} variant="outline" className="capitalize text-xs">{t}</Badge>)}
          </div>
        )},
      ]} rows={data as any[]} onEdit={openEdit} onDelete={(id: number) => del.mutate(id)} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Leave Type</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Casual Leave" /></div>
              <div><Label>Code *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="CL, SL, EL" maxLength={10} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Annual Days</Label><Input type="number" value={form.annualDays} onChange={e => setForm(f => ({ ...f, annualDays: e.target.value }))} /></div>
              <div>
                <Label>Max Per Month <span className="text-xs text-muted-foreground">(0 = no limit)</span></Label>
                <Input type="number" min="0" value={form.maxPerMonth} onChange={e => setForm(f => ({ ...f, maxPerMonth: e.target.value }))} placeholder="e.g. 1 for SL/CL" />
              </div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.isPaidLeave} onCheckedChange={v => setForm(f => ({ ...f, isPaidLeave: v }))} /><Label>Paid Leave</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.isCarryForward} onCheckedChange={v => setForm(f => ({ ...f, isCarryForward: v }))} /><Label>Allow Carry Forward</Label></div>
            {form.isCarryForward && <div><Label>Max Carry Forward Days</Label><Input type="number" value={form.maxCarryForward} onChange={e => setForm(f => ({ ...f, maxCarryForward: e.target.value }))} /></div>}
            <div className="flex items-center gap-2"><Switch checked={form.isEncashable} onCheckedChange={v => setForm(f => ({ ...f, isEncashable: v }))} /><Label>Encashable on Exit</Label></div>
            <div>
              <Label className="mb-2 block">Applicable To <span className="text-xs text-muted-foreground">(which employee types can apply this leave)</span></Label>
              <div className="flex flex-wrap gap-3">
                {EMP_TYPES.map(et => (
                  <div key={et.value} className="flex items-center gap-1.5">
                    <Checkbox
                      id={`emptype-${et.value}`}
                      checked={form.applicableEmpTypes.includes(et.value)}
                      onCheckedChange={() => toggleType(et.value)}
                    />
                    <Label htmlFor={`emptype-${et.value}`} className="font-normal cursor-pointer">{et.label}</Label>
                  </div>
                ))}
              </div>
            </div>
            <Button className="w-full" disabled={!form.name || !form.code || save.isPending} onClick={handleSave}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Holidays ─────────────────────────────────────────────────────────────────
function HolidaysTab() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState({ year: new Date().getFullYear(), date: "", name: "", type: "festival", isPaid: true });

  const { data = [] } = useQuery({ queryKey: ["/api/hr/holidays", year], queryFn: () => fetch(`/api/hr/holidays?year=${year}`, { credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const save = useMutation({
    mutationFn: (d: any) => apiRequest(editing ? "PUT" : "POST", editing ? `/api/hr/holidays/${editing.id}` : "/api/hr/holidays", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/holidays", year] }); setOpen(false); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/hr/holidays/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/hr/holidays", year] }),
  });

  const typeLabel: Record<string, string> = { national: "National", festival: "Festival", optional: "Optional" };

  const openAdd = () => { setEditing(null); setForm({ year, date: "", name: "", type: "festival", isPaid: true }); setOpen(true); };
  const openEdit = (r: any) => { setEditing(r); setForm({ year: r.year, date: r.date, name: r.name, type: r.type, isPaid: r.is_paid }); setOpen(true); };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Label>Year</Label>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Add Holiday</Button>
      </div>
      <MasterTable columns={[
        { key: "date", label: "Date" }, { key: "name", label: "Holiday" },
        { key: "type", label: "Type", render: (v: string) => <Badge variant="secondary">{typeLabel[v] || v}</Badge> },
        { key: "is_paid", label: "Paid", render: (v: boolean) => v ? "Yes" : "No" },
      ]} rows={data as any[]} onEdit={openEdit} onDelete={(id: number) => del.mutate(id)} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Holiday</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><Label>Holiday Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Diwali, Independence Day" /></div>
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="national">National Holiday</SelectItem>
                  <SelectItem value="festival">Festival Holiday</SelectItem>
                  <SelectItem value="optional">Optional Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.isPaid} onCheckedChange={v => setForm(f => ({ ...f, isPaid: v }))} /><Label>Paid Holiday</Label></div>
            <Button className="w-full" disabled={!form.date || !form.name || save.isPending} onClick={() => save.mutate({ ...form, year })}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Salary Components ────────────────────────────────────────────────────────
function SalaryComponentsTab() {
  const { toast } = useToast();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", code: "", type: "earning", formulaType: "fixed", formulaValue: "0", isStatutory: false, showOnPayslip: true });

  const { data = [] } = useQuery({ queryKey: ["/api/hr/salary-components"] });
  const save = useMutation({
    mutationFn: (d: any) => apiRequest(editing ? "PUT" : "POST", editing ? `/api/hr/salary-components/${editing.id}` : "/api/hr/salary-components", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/salary-components"] }); setOpen(false); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/hr/salary-components/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/hr/salary-components"] }),
  });

  const openAdd = () => { setEditing(null); setForm({ name: "", code: "", type: "earning", formulaType: "fixed", formulaValue: "0", isStatutory: false, showOnPayslip: true }); setOpen(true); };
  const openEdit = (r: any) => { setEditing(r); setForm({ name: r.name, code: r.code, type: r.type, formulaType: r.formula_type, formulaValue: String(r.formula_value), isStatutory: r.is_statutory, showOnPayslip: r.show_on_payslip }); setOpen(true); };

  const rows = data as any[];

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Add Component</Button></div>
      <div className="space-y-3">
        {["earning", "deduction"].map(type => (
          <div key={type}>
            <h4 className="text-sm font-medium text-muted-foreground mb-2 capitalize">{type}s</h4>
            <MasterTable columns={[
              { key: "name", label: "Component" }, { key: "code", label: "Code" },
              { key: "formula_type", label: "Formula", render: (v: string, r: any) => v === "percent_of_basic" ? `${r.formula_value}% of Basic` : `Fixed ${sym}${r.formula_value}` },
              { key: "is_statutory", label: "Statutory", render: (v: boolean) => v ? <Badge variant="secondary">Yes</Badge> : "No" },
              { key: "show_on_payslip", label: "On Payslip", render: (v: boolean) => v ? "Yes" : "No" },
            ]} rows={rows.filter((r: any) => r.type === type)} onEdit={openEdit} onDelete={(id: number) => del.mutate(id)} />
          </div>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Salary Component</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. HRA, Basic" /></div>
              <div><Label>Code *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="HRA, BASIC" /></div>
            </div>
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="earning">Earning</SelectItem><SelectItem value="deduction">Deduction</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Formula</Label>
              <Select value={form.formulaType} onValueChange={v => setForm(f => ({ ...f, formulaType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="fixed">Fixed Amount</SelectItem><SelectItem value="percent_of_basic">% of Basic</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>{form.formulaType === "percent_of_basic" ? "Percentage (%)" : `Amount (${sym})`}</Label>
              <Input type="number" value={form.formulaValue} onChange={e => setForm(f => ({ ...f, formulaValue: e.target.value }))} />
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><Switch checked={form.isStatutory} onCheckedChange={v => setForm(f => ({ ...f, isStatutory: v }))} /><Label>Statutory</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.showOnPayslip} onCheckedChange={v => setForm(f => ({ ...f, showOnPayslip: v }))} /><Label>Show on Payslip</Label></div>
            </div>
            <Button className="w-full" disabled={!form.name || !form.code || save.isPending} onClick={() => save.mutate({ ...form, formulaValue: Number(form.formulaValue) })}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Salary Structures Tab ─────────────────────────────────────────────────────
function SalaryStructuresTab() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [structName, setStructName] = useState("");
  const [selectedComps, setSelectedComps] = useState<Record<number, boolean>>({});
  const [overrides, setOverrides] = useState<Record<number, { formula_type: string; formula_value: string }>>({});

  const { data: structures = [] } = useQuery<any[]>({ queryKey: ["/api/hr/salary-structures"] });
  const { data: components = [] } = useQuery<any[]>({ queryKey: ["/api/hr/salary-components"] });
  const earningComponents = (components as any[]).filter((c: any) => c.type === "earning");

  const save = useMutation({
    mutationFn: (d: any) => apiRequest(editing ? "PUT" : "POST", editing ? `/api/hr/salary-structures/${editing.id}` : "/api/hr/salary-structures", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/salary-structures"] }); setOpen(false); toast({ title: "Salary structure saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/hr/salary-structures/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/hr/salary-structures"] }),
  });

  function openAdd() {
    setEditing(null); setStructName(""); setSelectedComps({}); setOverrides({}); setOpen(true);
  }
  function openEdit(r: any) {
    setEditing(r); setStructName(r.name);
    const comps: any[] = typeof r.components === "string" ? JSON.parse(r.components) : (r.components || []);
    const sel: Record<number, boolean> = {};
    const ov: Record<number, { formula_type: string; formula_value: string }> = {};
    comps.forEach((c: any) => {
      if (c.component_id) { sel[c.component_id] = true; ov[c.component_id] = { formula_type: c.formula_type, formula_value: String(c.formula_value) }; }
    });
    setSelectedComps(sel); setOverrides(ov); setOpen(true);
  }
  function toggleComp(comp: any) {
    setSelectedComps(s => {
      const next = { ...s, [comp.id]: !s[comp.id] };
      if (!next[comp.id]) { const o = { ...overrides }; delete o[comp.id]; setOverrides(o); }
      else { setOverrides(o => ({ ...o, [comp.id]: { formula_type: comp.formula_type, formula_value: String(comp.formula_value) } })); }
      return next;
    });
  }
  function handleSave() {
  const { currency_symbol: sym } = useTenantConfig();
    const compsPayload = earningComponents
      .filter((c: any) => selectedComps[c.id])
      .map((c: any) => ({
        component_id: c.id, name: c.name, code: c.code, type: "earning",
        formula_type: overrides[c.id]?.formula_type ?? c.formula_type,
        formula_value: Number(overrides[c.id]?.formula_value ?? c.formula_value),
      }));
    save.mutate({ name: structName, components: compsPayload });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Define salary structures by selecting which earning components apply and their formulas.</p>
        <Button size="sm" onClick={openAdd} data-testid="btn-add-structure"><Plus className="h-4 w-4 mr-1" />Add Structure</Button>
      </div>
      {(structures as any[]).length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No salary structures yet. Create one to assign to employees.</p>}
      <div className="space-y-2">
        {(structures as any[]).map((s: any) => {
          const comps: any[] = typeof s.components === "string" ? JSON.parse(s.components || "[]") : (s.components || []);
          return (
            <div key={s.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
              <div>
                <p className="font-medium text-sm">{s.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {comps.length === 0 ? "No components" : comps.map((c: any) =>
                    `${c.name} (${c.formula_type === "percent_of_basic" ? `${c.formula_value}%` : `${sym}${c.formula_value}`})`
                  ).join(", ")}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => openEdit(s)} data-testid={`btn-edit-struct-${s.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" onClick={() => del.mutate(s.id)} data-testid={`btn-delete-struct-${s.id}`}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} Salary Structure</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Structure Name *</Label>
              <Input value={structName} onChange={e => setStructName(e.target.value)} placeholder="e.g. Staff Grade A, Management" data-testid="input-structure-name" />
            </div>
            <div>
              <Label className="mb-2 block">Earning Components</Label>
              {earningComponents.length === 0 && <p className="text-xs text-muted-foreground">No earning components found. Add them in the Salary Components tab first.</p>}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {earningComponents.map((c: any) => (
                  <div key={c.id} className="rounded border p-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox id={`comp-${c.id}`} checked={!!selectedComps[c.id]} onCheckedChange={() => toggleComp(c)} data-testid={`check-comp-${c.id}`} />
                      <label htmlFor={`comp-${c.id}`} className="text-sm font-medium cursor-pointer">{c.name} <span className="text-muted-foreground font-normal">({c.code})</span></label>
                    </div>
                    {selectedComps[c.id] && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                        <div>
                          <Label className="text-xs">Formula</Label>
                          <Select value={overrides[c.id]?.formula_type ?? c.formula_type} onValueChange={v => setOverrides(o => ({ ...o, [c.id]: { ...o[c.id], formula_type: v } }))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percent_of_basic">% of Basic</SelectItem>
                              <SelectItem value="fixed">Fixed Amount</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">{(overrides[c.id]?.formula_type ?? c.formula_type) === "percent_of_basic" ? "Percent (%)" : `Amount (${sym})`}</Label>
                          <Input className="h-8 text-xs" type="number" value={overrides[c.id]?.formula_value ?? String(c.formula_value)} onChange={e => setOverrides(o => ({ ...o, [c.id]: { ...o[c.id], formula_value: e.target.value } }))} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <Button className="w-full" disabled={!structName || save.isPending} onClick={handleSave} data-testid="btn-save-structure">
              {save.isPending ? "Saving..." : "Save Structure"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── PT Slabs Tab ──────────────────────────────────────────────────────────────
function PTSlabsTab() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ state: "", income_from: "0", income_to: "", pt_amount: "0" });

  const { data: slabs = [] } = useQuery<any[]>({ queryKey: ["/api/hr/pt-slabs"] });
  const save = useMutation({
    mutationFn: (d: any) => apiRequest(editing ? "PUT" : "POST", editing ? `/api/hr/pt-slabs/${editing.id}` : "/api/hr/pt-slabs", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/pt-slabs"] }); setOpen(false); toast({ title: "PT slab saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/hr/pt-slabs/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/hr/pt-slabs"] }),
  });
  function openAdd() { setEditing(null); setForm({ state: "", income_from: "0", income_to: "", pt_amount: "0" }); setOpen(true); }
  function openEdit(r: any) { setEditing(r); setForm({ state: r.state, income_from: String(r.income_from), income_to: r.income_to != null ? String(r.income_to) : "", pt_amount: String(r.pt_amount) }); setOpen(true); }
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;

  const byState: Record<string, any[]> = {};
  (slabs as any[]).forEach((s: any) => { if (!byState[s.state]) byState[s.state] = []; byState[s.state].push(s); });

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Configure Professional Tax slabs by state. Employee's state (from profile) is matched during payroll processing.</p>
        <Button size="sm" onClick={openAdd} data-testid="btn-add-pt-slab"><Plus className="h-4 w-4 mr-1" />Add Slab</Button>
      </div>
      {(slabs as any[]).length === 0 && (
        <p className="text-center py-8 text-muted-foreground text-sm">No PT slabs configured. Hardcoded defaults will be used. Add slabs to override for specific states.</p>
      )}
      {Object.entries(byState).map(([state, rows]) => (
        <div key={state}>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{state}</p>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Income From ({sym}/month)</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Income To ({sym}/month)</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">PT Amount ({sym}/month)</th>
                  <th className="px-3 py-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{fmtCur(Number(r.income_from), tenantConfig)}</td>
                    <td className="px-3 py-2">{r.income_to != null ? fmtCur(Number(r.income_to), tenantConfig) : "& above"}</td>
                    <td className="px-3 py-2 font-medium">{fmtCur(Number(r.pt_amount), tenantConfig)}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} PT Slab</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>State *</Label>
              <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="e.g. Maharashtra, Karnataka" data-testid="input-pt-state" />
              <p className="text-xs text-muted-foreground mt-1">Must match the state field on the employee's profile (case-insensitive).</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Monthly Income From ({sym})</Label>
                <Input type="number" value={form.income_from} onChange={e => setForm(f => ({ ...f, income_from: e.target.value }))} data-testid="input-pt-from" />
              </div>
              <div>
                <Label>Monthly Income To ({sym})</Label>
                <Input type="number" value={form.income_to} onChange={e => setForm(f => ({ ...f, income_to: e.target.value }))} placeholder="Leave blank for 'and above'" data-testid="input-pt-to" />
              </div>
            </div>
            <div>
              <Label>PT Amount per Month ({sym})</Label>
              <Input type="number" value={form.pt_amount} onChange={e => setForm(f => ({ ...f, pt_amount: e.target.value }))} data-testid="input-pt-amount" />
            </div>
            <Button className="w-full" disabled={!form.state || save.isPending}
              onClick={() => save.mutate({ state: form.state, income_from: Number(form.income_from), income_to: form.income_to ? Number(form.income_to) : null, pt_amount: Number(form.pt_amount) })}
              data-testid="btn-save-pt-slab">
              {save.isPending ? "Saving..." : "Save Slab"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Statutory Rates Tab (PF / ESI / PT) ───────────────────────────────────────
function StatutoryRatesTab() {
  const { toast } = useToast();
  const { data: s, isLoading } = useQuery<any>({ queryKey: ["/api/hr/statutory-settings"] });
  const [form, setForm] = useState<any>(null);

  if (!isLoading && s && !form) {
    setForm({
      pfEnabled: s.pf_enabled !== false,
      pfEmployeeRate: (Number(s.pf_employee_rate) * 100).toFixed(2),
      pfEmployerRate: (Number(s.pf_employer_rate) * 100).toFixed(2),
      pfCeilingBasic: String(s.pf_ceiling_basic),
      esiEnabled: s.esi_enabled !== false,
      esiEmployeeRate: (Number(s.esi_employee_rate) * 100).toFixed(2),
      esiEmployerRate: (Number(s.esi_employer_rate) * 100).toFixed(2),
      esiGrossCeiling: String(s.esi_gross_ceiling),
      ptEnabled: s.pt_enabled !== false,
    });
  }

  const save = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/hr/statutory-settings", {
      pfEnabled: form.pfEnabled,
      pfEmployeeRate: Number(form.pfEmployeeRate) / 100,
      pfEmployerRate: Number(form.pfEmployerRate) / 100,
      pfCeilingBasic: Number(form.pfCeilingBasic),
      esiEnabled: form.esiEnabled,
      esiEmployeeRate: Number(form.esiEmployeeRate) / 100,
      esiEmployerRate: Number(form.esiEmployerRate) / 100,
      esiGrossCeiling: Number(form.esiGrossCeiling),
      ptEnabled: form.ptEnabled,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/statutory-settings"] });
      toast({ title: "Statutory settings saved" });
    },
  });

  const f = form || {
    pfEnabled: true, pfEmployeeRate: "12.00", pfEmployerRate: "12.00", pfCeilingBasic: "15000",
    esiEnabled: true, esiEmployeeRate: "0.75", esiEmployerRate: "3.25", esiGrossCeiling: "21000",
    ptEnabled: true,
  };

  const set = (key: string, val: any) => setForm((p: any) => ({ ...p, [key]: val }));
  const { currency_symbol: sym } = useTenantConfig();

  const rateRow = (label: string, key: string, suffix: string, hint: string, disabled: boolean) => (
    <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
      <Label className="text-right text-sm text-muted-foreground">{label}</Label>
      <div className="col-span-2 flex items-center gap-2">
        <Input
          type="number"
          step="0.01"
          className="w-32"
          value={f[key]}
          disabled={disabled}
          onChange={e => set(key, e.target.value)}
          data-testid={`input-${key}`}
        />
        <span className="text-sm text-muted-foreground">{suffix}</span>
        <span className="text-xs text-muted-foreground ml-2">{hint}</span>
      </div>
    </div>
  );

  const sectionHeader = (title: string, subtitle: string, enabledKey: string, badge: string) => (
    <div className="flex items-start justify-between gap-4 mb-3">
      <div>
        <h3 className="font-medium text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Label className="text-xs text-muted-foreground">{f[enabledKey] ? "Enabled" : "Disabled"}</Label>
        <Switch
          checked={f[enabledKey]}
          onCheckedChange={v => set(enabledKey, v)}
          data-testid={`toggle-${enabledKey}`}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-xl">
      {/* PF */}
      <div>
        {sectionHeader("Provident Fund (PF)", "12% of basic salary (employee + employer) on basic ≤ ceiling", "pfEnabled", "PF")}
        {f.pfEnabled && (
          <div className="space-y-3 pl-2">
            {rateRow("Employee Contribution", "pfEmployeeRate", "%", "Standard: 12%", false)}
            {rateRow("Employer Contribution", "pfEmployerRate", "%", "Standard: 12%", false)}
            {rateRow("Basic Salary Ceiling", "pfCeilingBasic", sym, `Standard: ${sym}15,000`, false)}
          </div>
        )}
        {!f.pfEnabled && (
          <p className="text-xs text-muted-foreground pl-2">PF will not be calculated or deducted in payroll runs.</p>
        )}
      </div>

      {/* ESI */}
      <div className="border-t pt-5">
        {sectionHeader("Employee State Insurance (ESI)", `Applied only if gross salary ≤ ceiling; otherwise ${sym}0`, "esiEnabled", "ESI")}
        {f.esiEnabled && (
          <div className="space-y-3 pl-2">
            {rateRow("Employee Contribution", "esiEmployeeRate", "%", "Standard: 0.75%", false)}
            {rateRow("Employer Contribution", "esiEmployerRate", "%", "Standard: 3.25%", false)}
            {rateRow("Gross Salary Ceiling", "esiGrossCeiling", sym, `Standard: ${sym}21,000`, false)}
          </div>
        )}
        {!f.esiEnabled && (
          <p className="text-xs text-muted-foreground pl-2">ESI will not be calculated or deducted in payroll runs.</p>
        )}
      </div>

      {/* PT */}
      <div className="border-t pt-5">
        {sectionHeader("Professional Tax (PT)", "Calculated from PT Slabs configured per state", "ptEnabled", "PT")}
        {!f.ptEnabled && (
          <p className="text-xs text-muted-foreground pl-2">PT will not be calculated or deducted in payroll runs.</p>
        )}
        {f.ptEnabled && (
          <p className="text-xs text-muted-foreground pl-2">PT rates are managed under the PT Slabs tab.</p>
        )}
      </div>

      <Button onClick={() => save.mutate()} disabled={save.isPending} data-testid="btn-save-statutory">
        {save.isPending ? "Saving…" : "Save Settings"}
      </Button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HRMastersPage() {
  const tabs = [
    { value: "departments", label: "Departments", icon: Building2, component: DepartmentsTab },
    { value: "designations", label: "Designations", icon: Briefcase, component: DesignationsTab },
    { value: "shifts", label: "Shifts", icon: Clock, component: ShiftsTab },
    { value: "leave-types", label: "Leave Types", icon: Calendar, component: LeaveTypesTab },
    { value: "holidays", label: "Holidays", icon: CalendarDays, component: HolidaysTab },
    { value: "salary-components", label: "Salary Components", icon: DollarSign, component: SalaryComponentsTab },
    { value: "salary-structures", label: "Salary Structures", icon: Layers, component: SalaryStructuresTab },
    { value: "pt-slabs", label: "PT Slabs", icon: MapPin, component: PTSlabsTab },
    { value: "statutory-rates", label: "Statutory Rates", icon: Shield, component: StatutoryRatesTab },
  ];

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">HR Masters</h1>
        <p className="text-sm text-muted-foreground">Configure departments, designations, shifts, leave types, holidays, salary components, salary structures, and Professional Tax slabs</p>
      </div>
      <Tabs defaultValue="departments">
        <TabsList className="flex-wrap h-auto gap-1">
          {tabs.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5" data-testid={`tab-${t.value}`}>
              <t.icon className="h-3.5 w-3.5" />{t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map(t => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            <Card><CardContent className="pt-4"><t.component /></CardContent></Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
