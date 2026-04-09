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
import { Plus, Pencil, Trash2, Building2, Briefcase, Clock, Calendar, CalendarDays, DollarSign, Layers } from "lucide-react";

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
            <div className="grid grid-cols-2 gap-3">
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
function LeaveTypesTab() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", code: "", annualDays: "0", isCarryForward: false, maxCarryForward: "0", isEncashable: false, isPaidLeave: true });

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

  const openAdd = () => { setEditing(null); setForm({ name: "", code: "", annualDays: "0", isCarryForward: false, maxCarryForward: "0", isEncashable: false, isPaidLeave: true }); setOpen(true); };
  const openEdit = (r: any) => { setEditing(r); setForm({ name: r.name, code: r.code, annualDays: String(r.annual_days), isCarryForward: r.is_carry_forward, maxCarryForward: String(r.max_carry_forward), isEncashable: r.is_encashable, isPaidLeave: r.is_paid_leave }); setOpen(true); };

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Add Leave Type</Button></div>
      <MasterTable columns={[
        { key: "name", label: "Leave Type" }, { key: "code", label: "Code" }, { key: "annual_days", label: "Days/Year" },
        { key: "is_paid_leave", label: "Paid", render: (v: boolean) => <Badge variant={v ? "default" : "secondary"}>{v ? "Paid" : "Unpaid"}</Badge> },
        { key: "is_encashable", label: "Encashable", render: (v: boolean) => v ? "Yes" : "No" },
      ]} rows={data as any[]} onEdit={openEdit} onDelete={(id: number) => del.mutate(id)} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Leave Type</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Casual Leave" /></div>
              <div><Label>Code *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="CL, SL, EL" maxLength={10} /></div>
            </div>
            <div><Label>Annual Days</Label><Input type="number" value={form.annualDays} onChange={e => setForm(f => ({ ...f, annualDays: e.target.value }))} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.isPaidLeave} onCheckedChange={v => setForm(f => ({ ...f, isPaidLeave: v }))} /><Label>Paid Leave</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.isCarryForward} onCheckedChange={v => setForm(f => ({ ...f, isCarryForward: v }))} /><Label>Allow Carry Forward</Label></div>
            {form.isCarryForward && <div><Label>Max Carry Forward Days</Label><Input type="number" value={form.maxCarryForward} onChange={e => setForm(f => ({ ...f, maxCarryForward: e.target.value }))} /></div>}
            <div className="flex items-center gap-2"><Switch checked={form.isEncashable} onCheckedChange={v => setForm(f => ({ ...f, isEncashable: v }))} /><Label>Encashable on Exit</Label></div>
            <Button className="w-full" disabled={!form.name || !form.code || save.isPending} onClick={() => save.mutate({ ...form, annualDays: Number(form.annualDays), maxCarryForward: Number(form.maxCarryForward) })}>Save</Button>
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

  const { data = [] } = useQuery({ queryKey: ["/api/hr/holidays", year], queryFn: () => fetch(`/api/hr/holidays?year=${year}`, { credentials: "include" }).then(r => r.json()) });
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
              { key: "formula_type", label: "Formula", render: (v: string, r: any) => v === "percent_of_basic" ? `${r.formula_value}% of Basic` : `Fixed ₹${r.formula_value}` },
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
            <div className="grid grid-cols-2 gap-3">
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
            <div><Label>{form.formulaType === "percent_of_basic" ? "Percentage (%)" : "Amount (₹)"}</Label>
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HRMastersPage() {
  const tabs = [
    { value: "departments", label: "Departments", icon: Building2, component: DepartmentsTab },
    { value: "designations", label: "Designations", icon: Briefcase, component: DesignationsTab },
    { value: "shifts", label: "Shifts", icon: Clock, component: ShiftsTab },
    { value: "leave-types", label: "Leave Types", icon: Calendar, component: LeaveTypesTab },
    { value: "holidays", label: "Holidays", icon: CalendarDays, component: HolidaysTab },
    { value: "salary-components", label: "Salary Components", icon: DollarSign, component: SalaryComponentsTab },
  ];

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">HR Masters</h1>
        <p className="text-sm text-muted-foreground">Configure departments, designations, shifts, leave types, holidays and salary components</p>
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
