import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Search } from "lucide-react";

const api = (m: string, p: string, b?: any) =>
  fetch(p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());
const BLANK = { name: "", phone: "", email: "", skills: "", availability: "", joined_date: "", notes: "" };

export default function NGOVolunteersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(BLANK);
  const [search, setSearch] = useState("");

  const { data: volunteers = [] } = useQuery<any[]>({ queryKey: ["ngo-volunteers"], queryFn: () => api("GET", "/api/ngo/volunteers") });

  const saveMut = useMutation({
    mutationFn: (p: any) => editing ? api("PUT", `/api/ngo/volunteers/${editing.id}`, p) : api("POST", "/api/ngo/volunteers", p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ngo-volunteers"] }); setOpen(false); setEditing(null); setForm(BLANK); toast({ title: editing ? "Updated" : "Volunteer added" }); },
  });

  const f = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));
  const filtered = volunteers.filter((v: any) => !search || [v.name, v.phone, v.skills].join(" ").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Users className="w-6 h-6 text-green-600" /><h1 className="text-2xl font-bold">Volunteers</h1></div>
        <Button size="sm" onClick={() => { setEditing(null); setForm(BLANK); setOpen(true); }}><Plus className="w-4 h-4 mr-1" />Add Volunteer</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, skills..." className="pl-8" />
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead>
            <TableHead>Skills</TableHead><TableHead>Availability</TableHead><TableHead>Joined</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((v: any) => (
              <TableRow key={v.id}>
                <TableCell className="font-mono text-sm">{v.volunteer_code}</TableCell>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell className="text-sm">{v.phone || "—"}</TableCell>
                <TableCell className="text-sm">{v.email || "—"}</TableCell>
                <TableCell className="text-sm truncate max-w-40">{v.skills || "—"}</TableCell>
                <TableCell className="text-sm">{v.availability || "—"}</TableCell>
                <TableCell className="text-sm">{v.joined_date ? String(v.joined_date).slice(0, 10) : "—"}</TableCell>
                <TableCell><Button size="sm" variant="ghost" onClick={() => { setEditing(v); setForm({ ...BLANK, ...v }); setOpen(true); }}>Edit</Button></TableCell>
              </TableRow>
            ))}
            {!filtered.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No volunteers</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Volunteer" : "Add Volunteer"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label className="text-xs">Name</Label><Input value={form.name} onChange={e => f("name", e.target.value)} className="h-8" /></div>
            <div><Label className="text-xs">Phone</Label><Input value={form.phone || ""} onChange={e => f("phone", e.target.value)} className="h-8" /></div>
            <div><Label className="text-xs">Email</Label><Input value={form.email || ""} onChange={e => f("email", e.target.value)} className="h-8" /></div>
            <div><Label className="text-xs">Skills</Label><Input value={form.skills || ""} onChange={e => f("skills", e.target.value)} className="h-8" placeholder="teaching, medical, IT..." /></div>
            <div><Label className="text-xs">Availability</Label><Input value={form.availability || ""} onChange={e => f("availability", e.target.value)} className="h-8" placeholder="weekends, evenings..." /></div>
            <div><Label className="text-xs">Joined Date</Label><Input type="date" value={form.joined_date ? String(form.joined_date).slice(0,10) : ""} onChange={e => f("joined_date", e.target.value)} className="h-8" /></div>
            <div className="col-span-2"><Label className="text-xs">Notes</Label><Input value={form.notes || ""} onChange={e => f("notes", e.target.value)} className="h-8" /></div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending || !form.name}>{editing ? "Update" : "Add"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
