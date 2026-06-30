import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HeartHandshake, Plus, Pencil } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" }).then(r => r.json());

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-IN") : "-";
const STATUSES = ["active", "inactive", "graduated"];
const STATUS_COLORS: Record<string, string> = { active: "default", inactive: "secondary", graduated: "outline" };

const blank = () => ({ name: "", phone: "", program: "", enrollment_date: new Date().toISOString().slice(0, 10), status: "active" });

export default function BeneficiariesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(blank());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: beneficiaries = [], isError } = useQuery({
    queryKey: ["ngo-beneficiaries"],
    queryFn: () => api("GET", "/api/ngo/beneficiaries"),
    retry: false,
  });

  const save = useMutation({
    mutationFn: (d: any) => editing ? api("PUT", `/api/ngo/beneficiaries/${editing.id}`, d) : api("POST", "/api/ngo/beneficiaries", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ngo-beneficiaries"] }); setOpen(false); setEditing(null); setForm(blank()); },
  });

  const list = Array.isArray(beneficiaries) ? beneficiaries : [];
  const filtered = list.filter((b: any) => {
    const matchSearch = !search || b.name?.toLowerCase().includes(search.toLowerCase()) || b.beneficiary_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const active = list.filter((b: any) => b.status === "active").length;
  const graduated = list.filter((b: any) => b.status === "graduated").length;

  function openAdd() { setForm(blank()); setEditing(null); setOpen(true); }
  function openEdit(b: any) { setForm({ ...b }); setEditing(b); setOpen(true); }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Beneficiaries</h1>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-1" />Add Beneficiary</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><HeartHandshake className="w-4 h-4" />Total</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{list.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Active</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{active}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Graduated</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{graduated}</p></CardContent></Card>
      </div>

      {isError && <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-3">Beneficiaries module not available yet.</p>}

      <div className="flex gap-2">
        <Input placeholder="Search beneficiaries…" value={search} onChange={e => setSearch(e.target.value)} className="w-64" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Status</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Number</TableHead><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Program</TableHead><TableHead>Enrolled</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map((b: any) => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-xs">{b.beneficiary_number}</TableCell>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell>{b.phone}</TableCell>
                <TableCell>{b.program}</TableCell>
                <TableCell>{fmtDate(b.enrollment_date)}</TableCell>
                <TableCell><Badge variant={(STATUS_COLORS[b.status] || "secondary") as any} className="capitalize">{b.status}</Badge></TableCell>
                <TableCell><Button size="sm" variant="ghost" onClick={() => openEdit(b)}><Pencil className="w-3 h-3" /></Button></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No beneficiaries found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Beneficiary" : "Add Beneficiary"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Enrollment Date</Label><Input type="date" value={form.enrollment_date} onChange={e => setForm({ ...form, enrollment_date: e.target.value })} /></div>
            </div>
            <div><Label>Program</Label><Input placeholder="e.g. Education Support, Healthcare…" value={form.program} onChange={e => setForm({ ...form, program: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
