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
import { Plus, Users, Search } from "lucide-react";

const api = (m: string, p: string, b?: any) =>
  fetch(p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());
const BLANK = { name: "", project_id: "", age: "", gender: "", phone: "", address: "", category: "", notes: "" };

export default function NGOBeneficiariesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(BLANK);
  const [search, setSearch] = useState("");

  const { data: beneficiaries = [] } = useQuery<any[]>({ queryKey: ["ngo-beneficiaries"], queryFn: () => api("GET", "/api/ngo/beneficiaries") });
  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["ngo-projects"], queryFn: () => api("GET", "/api/ngo/projects") });

  const saveMut = useMutation({
    mutationFn: (p: any) => editing ? api("PUT", `/api/ngo/beneficiaries/${editing.id}`, p) : api("POST", "/api/ngo/beneficiaries", p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ngo-beneficiaries"] }); setOpen(false); setEditing(null); setForm(BLANK); toast({ title: editing ? "Updated" : "Beneficiary added" }); },
  });

  const f = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));
  const projectName = (id: any) => projects.find((p: any) => p.id === id)?.name || "—";
  const filtered = beneficiaries.filter((b: any) => !search || [b.name, b.phone, b.category].join(" ").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Users className="w-6 h-6 text-blue-600" /><h1 className="text-2xl font-bold">Beneficiaries</h1></div>
        <Button size="sm" onClick={() => { setEditing(null); setForm(BLANK); setOpen(true); }}><Plus className="w-4 h-4 mr-1" />Add Beneficiary</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, category..." className="pl-8" />
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Age / Gender</TableHead><TableHead>Phone</TableHead>
            <TableHead>Category</TableHead><TableHead>Project</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((b: any) => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-sm">{b.beneficiary_code}</TableCell>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell className="text-sm">{b.age || "—"} / {b.gender || "—"}</TableCell>
                <TableCell className="text-sm">{b.phone || "—"}</TableCell>
                <TableCell>{b.category ? <Badge variant="outline" className="text-xs">{b.category}</Badge> : "—"}</TableCell>
                <TableCell className="text-sm">{projectName(b.project_id)}</TableCell>
                <TableCell><Button size="sm" variant="ghost" onClick={() => { setEditing(b); setForm({ ...BLANK, ...b }); setOpen(true); }}>Edit</Button></TableCell>
              </TableRow>
            ))}
            {!filtered.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No beneficiaries</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Beneficiary" : "Add Beneficiary"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label className="text-xs">Name</Label><Input value={form.name} onChange={e => f("name", e.target.value)} className="h-8" /></div>
            <div><Label className="text-xs">Age</Label><Input type="number" value={form.age || ""} onChange={e => f("age", e.target.value)} className="h-8" /></div>
            <div><Label className="text-xs">Gender</Label>
              <Select value={form.gender || ""} onValueChange={v => f("gender", v)}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{["male","female","other"].map(g => <SelectItem key={g} value={g}>{g.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label className="text-xs">Phone</Label><Input value={form.phone || ""} onChange={e => f("phone", e.target.value)} className="h-8" /></div>
            <div><Label className="text-xs">Category</Label><Input value={form.category || ""} onChange={e => f("category", e.target.value)} className="h-8" placeholder="e.g. student, patient, widow" /></div>
            <div className="col-span-2"><Label className="text-xs">Project</Label>
              <Select value={String(form.project_id || "")} onValueChange={v => f("project_id", v)}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Link to project" /></SelectTrigger>
                <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="col-span-2"><Label className="text-xs">Address</Label><Input value={form.address || ""} onChange={e => f("address", e.target.value)} className="h-8" /></div>
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
