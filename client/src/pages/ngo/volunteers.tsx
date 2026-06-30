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
import { Users, Plus, Pencil } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" }).then(r => r.json());

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-IN") : "-";
const AVAIL = ["weekday", "weekend", "both"];

const blank = () => ({ name: "", email: "", phone: "", skills: "", availability: "both", enrolled_date: new Date().toISOString().slice(0, 10) });

export default function VolunteersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(blank());
  const [search, setSearch] = useState("");

  const { data: volunteers = [], isError } = useQuery({
    queryKey: ["ngo-volunteers"],
    queryFn: () => api("GET", "/api/ngo/volunteers"),
    retry: false,
  });

  const save = useMutation({
    mutationFn: (d: any) => editing ? api("PUT", `/api/ngo/volunteers/${editing.id}`, d) : api("POST", "/api/ngo/volunteers", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ngo-volunteers"] }); setOpen(false); setEditing(null); setForm(blank()); },
  });

  const list = Array.isArray(volunteers) ? volunteers : [];
  const filtered = list.filter((v: any) => !search || v.name?.toLowerCase().includes(search.toLowerCase()) || v.volunteer_number?.toLowerCase().includes(search.toLowerCase()));
  const active = filtered.filter((v: any) => v.status === "active").length;

  function openAdd() { setForm(blank()); setEditing(null); setOpen(true); }
  function openEdit(v: any) { setForm({ ...v }); setEditing(v); setOpen(true); }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Volunteers</h1>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-1" />Add Volunteer</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Users className="w-4 h-4" />Total Volunteers</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{filtered.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Active</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{active}</p></CardContent></Card>
      </div>

      {isError && <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-3">Volunteers module not available yet.</p>}

      <Input placeholder="Search volunteers…" value={search} onChange={e => setSearch(e.target.value)} className="w-64" />

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Number</TableHead><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Skills</TableHead><TableHead>Availability</TableHead><TableHead>Enrolled</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map((v: any) => (
              <TableRow key={v.id}>
                <TableCell className="font-mono text-xs">{v.volunteer_number}</TableCell>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell>{v.phone}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {String(v.skills || "").split(",").filter(Boolean).map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-xs">{s.trim()}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{v.availability}</Badge></TableCell>
                <TableCell>{fmtDate(v.enrolled_date)}</TableCell>
                <TableCell><Badge variant={v.status === "active" ? "default" : "secondary"} className="capitalize">{v.status}</Badge></TableCell>
                <TableCell><Button size="sm" variant="ghost" onClick={() => openEdit(v)}><Pencil className="w-3 h-3" /></Button></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No volunteers found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Volunteer" : "Add Volunteer"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><Label>Skills (comma-separated)</Label><Input placeholder="Teaching, Cooking, Driving…" value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Availability</Label>
                <Select value={form.availability} onValueChange={v => setForm({ ...form, availability: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AVAIL.map(a => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Enrolled Date</Label><Input type="date" value={form.enrolled_date} onChange={e => setForm({ ...form, enrolled_date: e.target.value })} /></div>
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
