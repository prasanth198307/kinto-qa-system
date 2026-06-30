import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const STATUSES = ["applied", "shortlisted", "admitted", "rejected"];
const EMPTY = { applicant_name: "", class_applied: "", dob: "", guardian: "", contact: "", status: "applied" };
const statusColor: Record<string, any> = { applied: "secondary", shortlisted: "default", admitted: "default", rejected: "destructive" };

export default function AdmissionsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterClass, setFilterClass] = useState("");

  const { data: admissions = [] } = useQuery({ queryKey: ["edu-admissions"], queryFn: () => api("GET", "/api/education/admissions") });

  const addApp = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/admissions", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["edu-admissions"] }); setOpen(false); setForm(EMPTY); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: any) => api("PUT", `/api/education/admissions/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["edu-admissions"] }),
  });

  const list = Array.isArray(admissions) ? admissions : [];
  const filtered = list.filter((a: any) => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (filterClass && !String(a.class_applied).toLowerCase().includes(filterClass.toLowerCase())) return false;
    return true;
  });

  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admissions</h1>
        <Button onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Application</Button>
      </div>

      <div className="flex gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filter Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Statuses</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="Filter by class..." value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="w-40" />
      </div>

      <div className="grid grid-cols-4 gap-4">
        {STATUSES.map((s) => (
          <Card key={s}><CardContent className="pt-4"><p className="text-sm text-muted-foreground capitalize">{s}</p><p className="text-2xl font-bold">{list.filter((a: any) => a.status === s).length}</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>App No.</TableHead><TableHead>Name</TableHead><TableHead>Class</TableHead>
              <TableHead>DOB</TableHead><TableHead>Guardian</TableHead><TableHead>Contact</TableHead>
              <TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.application_number || `APP-${a.id}`}</TableCell>
                  <TableCell className="font-medium">{a.applicant_name}</TableCell>
                  <TableCell>{a.class_applied}</TableCell>
                  <TableCell>{a.dob}</TableCell>
                  <TableCell>{a.guardian}</TableCell>
                  <TableCell>{a.contact}</TableCell>
                  <TableCell><Badge variant={statusColor[a.status] || "secondary"}>{a.status}</Badge></TableCell>
                  <TableCell className="space-x-1">
                    {a.status === "applied" && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: a.id, status: "shortlisted" })}>Shortlist</Button>}
                    {(a.status === "applied" || a.status === "shortlisted") && (
                      <>
                        <Button size="sm" variant="default" onClick={() => updateStatus.mutate({ id: a.id, status: "admitted" })}>Admit</Button>
                        <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ id: a.id, status: "rejected" })}>Reject</Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Application</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Applicant Name" value={form.applicant_name} onChange={(e) => set("applicant_name", e.target.value)} />
            <Input placeholder="Class Applied (e.g. 6)" value={form.class_applied} onChange={(e) => set("class_applied", e.target.value)} />
            <Input placeholder="Date of Birth" type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} />
            <Input placeholder="Guardian Name" value={form.guardian} onChange={(e) => set("guardian", e.target.value)} />
            <Input placeholder="Contact Number" value={form.contact} onChange={(e) => set("contact", e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => addApp.mutate(form)} disabled={addApp.isPending}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
